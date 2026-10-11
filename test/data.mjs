import { readFile } from 'node:fs/promises'
import should from 'should'

import { isHostname } from '../scripts/domains.mjs'
import { DOMAINS } from '../scripts/sources.mjs'

const readList = async name =>
  JSON.parse(await readFile(new URL(`../${name}`, import.meta.url), 'utf8'))

const domains = await readList('domains.json')
const inactiveDomains = await readList('inactive-domains.json')

for (const [name, list] of [
  ['domains.json', domains],
  ['inactive-domains.json', inactiveDomains]
]) {
  describe(name, () => {
    it('is sorted and has no duplicates', () => {
      should(list).eql(Array.from(new Set(list)).sort())
    })

    it('only has lowercase hostnames', () => {
      should(list.filter(domain => !isHostname(domain))).eql([])
    })
  })
}

describe('domains.json', () => {
  it('has free and disposable providers', () => {
    should(domains).containEql('gmail.com')
    should(domains).containEql('mailinator.com')
  })

  it('has no inactive domain, unless it is curated', () => {
    const inactive = new Set(inactiveDomains)
    const curated = new Set(DOMAINS)
    should(domains.filter(domain => inactive.has(domain) && !curated.has(domain))).eql([])
  })
})
