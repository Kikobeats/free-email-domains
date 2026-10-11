import should from 'should'

import {
  STATUS,
  assertPlausibleScan,
  assertTrustworthyResolvers,
  classifyDomain,
  inactiveAfterScan,
  scanDomains
} from '../scripts/mx.mjs'
import { ADDRESS, MAIL_SERVER, NULL_MX, fakeResolver, fakeZoneResolver } from './helpers.mjs'

const classify = (...resolvers) => classifyDomain('example.net', resolvers.map(fakeResolver))

describe('classifyDomain', () => {
  it('is active when the domain has MX records', async () => {
    should(await classify({ mx: MAIL_SERVER })).equal(STATUS.ACTIVE)
  })

  it('is inactive when the domain does not exist', async () => {
    should(await classify({ mx: 'ENOTFOUND' })).equal(STATUS.INACTIVE)
  })

  it('is inactive when the domain publishes a null MX, even with an address', async () => {
    should(await classify({ mx: NULL_MX, ipv4: ADDRESS })).equal(STATUS.INACTIVE)
  })

  it('is active when an empty exchange comes with a real mail server', async () => {
    should(await classify({ mx: [...NULL_MX, ...MAIL_SERVER] })).equal(STATUS.ACTIVE)
  })

  it('is inactive when the domain has no MX and no address', async () => {
    should(await classify({ mx: 'ENODATA' })).equal(STATUS.INACTIVE)
    should(await classify({ mx: [] })).equal(STATUS.INACTIVE)
    should(await classify({ mx: 'ENODATA', ipv4: [], ipv6: [] })).equal(STATUS.INACTIVE)
    should(await classify({ mx: 'ENODATA', ipv4: 'ENOTFOUND', ipv6: 'ENOTFOUND' })).equal(
      STATUS.INACTIVE
    )
  })

  it('is active when the domain has no MX but has an IPv4 address', async () => {
    should(await classify({ mx: 'ENODATA', ipv4: ADDRESS })).equal(STATUS.ACTIVE)
  })

  it('is active when the domain has no MX but has an IPv6 address', async () => {
    should(await classify({ mx: 'ENODATA', ipv6: ['2001:db8::1'] })).equal(STATUS.ACTIVE)
  })

  it('is active when the IPv6 address is found while the IPv4 lookup is inconclusive', async () => {
    should(await classify({ mx: 'ENODATA', ipv4: 'ETIMEOUT', ipv6: ['2001:db8::1'] })).equal(
      STATUS.ACTIVE
    )
  })

  for (const code of ['ETIMEOUT', 'ESERVFAIL', 'EREFUSED', 'ECONNREFUSED', 'EBADNAME']) {
    it(`is unknown when the MX lookup fails with ${code}`, async () => {
      should(await classify({ mx: code })).equal(STATUS.UNKNOWN)
    })
  }

  it('is unknown when an address lookup is inconclusive and no address is found', async () => {
    should(await classify({ mx: 'ENODATA', ipv4: 'ETIMEOUT' })).equal(STATUS.UNKNOWN)
    should(await classify({ mx: 'ENODATA', ipv6: 'ESERVFAIL' })).equal(STATUS.UNKNOWN)
  })

  it('is active when any resolver finds MX records', async () => {
    should(await classify({ mx: 'ENOTFOUND' }, { mx: MAIL_SERVER })).equal(STATUS.ACTIVE)
    should(await classify({ mx: 'ETIMEOUT' }, { mx: MAIL_SERVER })).equal(STATUS.ACTIVE)
  })

  it('is inactive only when every resolver agrees', async () => {
    should(await classify({ mx: 'ENOTFOUND' }, { mx: 'ENOTFOUND' })).equal(STATUS.INACTIVE)
    should(await classify({ mx: 'ENOTFOUND' }, { mx: 'ETIMEOUT' })).equal(STATUS.UNKNOWN)
    should(await classify({ mx: 'ETIMEOUT' }, { mx: 'ENOTFOUND' })).equal(STATUS.UNKNOWN)
  })

  it('is unknown when there is no resolver to ask', async () => {
    should(await classify()).equal(STATUS.UNKNOWN)
  })
})

describe('assertTrustworthyResolvers', () => {
  it('accepts resolvers that answer both canaries correctly', async () => {
    await should(
      assertTrustworthyResolvers([fakeZoneResolver({}), fakeZoneResolver({})])
    ).be.fulfilled()
  })

  it('rejects a resolver that cannot be reached', async () => {
    const unreachable = fakeZoneResolver({
      'gmail.com': { mx: 'ETIMEOUT' },
      'nonexistent.invalid': { mx: 'ETIMEOUT' }
    })
    await should(assertTrustworthyResolvers([fakeZoneResolver({}), unreachable])).be.rejectedWith(
      'DNS resolver #2 is not trustworthy: gmail.com is unknown, nonexistent.invalid is unknown'
    )
  })

  it('rejects a resolver that answers an address for a nonexistent domain', async () => {
    const hijacking = fakeZoneResolver({ 'nonexistent.invalid': { mx: 'ENODATA', ipv4: ADDRESS } })
    await should(assertTrustworthyResolvers([hijacking])).be.rejectedWith(
      /nonexistent.invalid is active/
    )
  })

  it('rejects a resolver that hides an active domain', async () => {
    const filtering = fakeZoneResolver({ 'gmail.com': { mx: 'ENOTFOUND' } })
    await should(assertTrustworthyResolvers([filtering])).be.rejectedWith(/gmail.com is inactive/)
  })

  it('rejects an empty resolver list', async () => {
    await should(assertTrustworthyResolvers([])).be.rejectedWith(
      'MX scan needs at least one DNS resolver'
    )
  })
})

describe('scanDomains', () => {
  const zone = {
    'active.test': { mx: MAIL_SERVER },
    'inactive.test': { mx: 'ENOTFOUND' },
    'unknown.test': { mx: 'ETIMEOUT' },
    'implicit.test': { mx: 'ENODATA', ipv4: ADDRESS }
  }

  it('groups every domain by status', async () => {
    const scan = await scanDomains(Object.keys(zone), {
      resolvers: [fakeZoneResolver(zone)],
      concurrency: 2
    })
    should(scan.active.sort()).eql(['active.test', 'implicit.test'])
    should(scan.inactive).eql(['inactive.test'])
    should(scan.unknown).eql(['unknown.test'])
  })

  it('never runs more lookups at once than the concurrency limit', async () => {
    let running = 0
    let peak = 0
    const slowResolver = {
      resolveMx: async () => {
        peak = Math.max(peak, ++running)
        await new Promise(resolve => setImmediate(resolve))
        running--
        return MAIL_SERVER
      }
    }
    const domains = Array.from({ length: 20 }, (_, index) => `domain-${index}.test`)
    const scan = await scanDomains(domains, { resolvers: [slowResolver], concurrency: 3 })
    should(peak).equal(3)
    should(scan.active).have.length(20)
  })

  it('reports progress for every domain', async () => {
    const progress = []
    await scanDomains(Object.keys(zone), {
      resolvers: [fakeZoneResolver(zone)],
      onProgress: (scanned, total) => progress.push([scanned, total])
    })
    should(progress).eql([
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4]
    ])
  })

  it('handles an empty list', async () => {
    should(await scanDomains([], { resolvers: [fakeZoneResolver(zone)] })).eql({
      active: [],
      inactive: [],
      unknown: []
    })
  })
})

describe('inactiveAfterScan', () => {
  const scan = {
    active: ['revived.test'],
    inactive: ['z-dead.test', 'dead.test'],
    unknown: ['flaky.test', 'new-flaky.test']
  }

  it('returns the inactive domains sorted', () => {
    should(inactiveAfterScan(scan, [])).eql(['dead.test', 'z-dead.test'])
  })

  it('keeps a previously inactive domain inactive while the scan is inconclusive', () => {
    should(inactiveAfterScan(scan, ['flaky.test'])).eql(['dead.test', 'flaky.test', 'z-dead.test'])
  })

  it('does not mark a domain inactive on an inconclusive scan alone', () => {
    should(inactiveAfterScan(scan, [])).not.containEql('new-flaky.test')
  })

  it('revives a previously inactive domain once it is confirmed active', () => {
    should(inactiveAfterScan(scan, ['revived.test'])).not.containEql('revived.test')
  })

  it('forgets a previously inactive domain that is no longer scanned', () => {
    should(inactiveAfterScan(scan, ['gone-upstream.test'])).not.containEql('gone-upstream.test')
  })
})

describe('assertPlausibleScan', () => {
  it('accepts a scan within both limits', () => {
    should(() => assertPlausibleScan({ inactive: 50, unknown: 20, total: 100 })).not.throw()
    should(() => assertPlausibleScan({ inactive: 0, unknown: 0, total: 0 })).not.throw()
  })

  it('rejects a scan where most of the domains are inactive', () => {
    should(() => assertPlausibleScan({ inactive: 51, unknown: 0, total: 100 })).throw(
      'MX scan left 51 of 100 domains inactive, above the 50% limit'
    )
  })

  it('rejects a scan where too many domains are unanswered', () => {
    should(() => assertPlausibleScan({ inactive: 0, unknown: 21, total: 100 })).throw(
      'MX scan left 21 of 100 domains unknown, above the 20% limit'
    )
  })
})
