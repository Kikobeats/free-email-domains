import { readFile } from 'node:fs/promises'
import should from 'should'

import { refreshDomains } from '../scripts/refresh.mjs'
import { MAIL_SERVER, fakeZoneResolver } from './helpers.mjs'

const ACTIVE_DOMAINS = Array.from({ length: 8 }, (_, index) => `active-${index}.test`)

const ZONE = {
  ...Object.fromEntries(ACTIVE_DOMAINS.map(domain => [domain, { mx: MAIL_SERVER }])),
  'dead.test': { mx: 'ENOTFOUND' },
  'flaky.test': { mx: 'ETIMEOUT' },
  'curated-dead.test': { mx: 'ENOTFOUND' },
  'company.test': { mx: MAIL_SERVER }
}

const refresh = (overrides = {}) => {
  const resolver = fakeZoneResolver(overrides.zone ?? ZONE)
  return refreshDomains({
    sourceDomains: new Set([
      ...ACTIVE_DOMAINS,
      'dead.test',
      'flaky.test',
      'curated-dead.test',
      'company.test'
    ]),
    previouslyInactive: [],
    curatedDomains: ['curated-dead.test', 'curated-only.test'],
    allowlist: ['company.test'],
    resolvers: [resolver],
    ...overrides
  }).then(result => ({ ...result, queried: resolver.queried }))
}

describe('refreshDomains', () => {
  it('removes inactive source domains and keeps curated and unanswered ones', async () => {
    const { domains, inactiveDomains, summary } = await refresh()
    should(domains).eql([...ACTIVE_DOMAINS, 'curated-dead.test', 'curated-only.test', 'flaky.test'])
    should(inactiveDomains).eql(['dead.test'])
    should(summary).eql({ scanned: 10, active: 8, inactive: 1, unknown: 1, domains: 11 })
  })

  it('never scans curated or allowlisted domains', async () => {
    const { queried } = await refresh()
    should(queried.has('curated-dead.test')).be.false()
    should(queried.has('curated-only.test')).be.false()
    should(queried.has('company.test')).be.false()
    should(queried.has('dead.test')).be.true()
  })

  it('keeps a previously inactive domain out while the scan is inconclusive', async () => {
    const { domains, inactiveDomains } = await refresh({ previouslyInactive: ['flaky.test'] })
    should(domains).not.containEql('flaky.test')
    should(inactiveDomains).eql(['dead.test', 'flaky.test'])
  })

  it('refuses an implausible scan', async () => {
    const mostlyDead = Object.fromEntries(
      Object.keys(ZONE).map(domain => [domain, { mx: 'ENOTFOUND' }])
    )
    await should(refresh({ zone: mostlyDead })).be.rejectedWith(
      /domains inactive, above the 50% limit/
    )
  })

  it('refuses to scan with an untrustworthy resolver', async () => {
    const hijacked = fakeZoneResolver({ ...ZONE, 'nonexistent.invalid': { mx: MAIL_SERVER } })
    await should(refresh({ resolvers: [hijacked] })).be.rejectedWith(/is not trustworthy/)
    should(hijacked.queried.has('dead.test')).be.false()
  })
})

describe('postinstall', () => {
  const INSTALL_TIME_MODULES = ['postinstall.mjs', 'domains.mjs', 'sources.mjs']
  const readScript = name => readFile(new URL(`../scripts/${name}`, import.meta.url), 'utf8')

  it('never loads the DNS scanner', async () => {
    const scripts = await Promise.all(INSTALL_TIME_MODULES.map(readScript))
    const imports = scripts.flatMap(script =>
      Array.from(script.matchAll(/from '([^']+)'/g), match => match[1])
    )
    should(imports.sort()).eql(['./domains.mjs', './sources.mjs', 'node:fs/promises'])
  })

  it('never fails the install', async () => {
    should(await readScript('postinstall.mjs')).match(/\nmain\(\)\.catch\(/)
  })
})
