import should from 'should'

import { buildDomains, fetchSource, fetchSourceDomains, sanitize } from '../scripts/domains.mjs'
import { ALLOWLIST, DOMAINS, SOURCES } from '../scripts/sources.mjs'

const SOURCE = { name: 'Example feed', url: 'https://example.test/domains.txt', minDomains: 2 }

const respondWith =
  (body, { ok = true, status = 200 } = {}) =>
    async () => ({ ok, status, text: async () => body })

describe('sanitize', () => {
  it('drops entries that are not hostnames', () => {
    should(
      sanitize('a.test # note\nlocalhost\nunder_score.test\n-dash.test\nhttps://b.test\nok.test')
    ).eql(['ok.test'])
  })

  it('splits by line and comma, trims, lowercases and drops comments', () => {
    should(sanitize('# header\nGmail.com , yahoo.com\n\n  mailinator.com\r\n')).eql([
      'gmail.com',
      'yahoo.com',
      'mailinator.com'
    ])
  })
})

describe('fetchSource', () => {
  it('returns the domains of a source', async () => {
    should(await fetchSource(SOURCE, respondWith('a.test\nb.test'))).eql(['a.test', 'b.test'])
  })

  it('fails when the source responds with an error status', async () => {
    await should(fetchSource(SOURCE, respondWith('', { ok: false, status: 503 }))).be.rejectedWith(
      'Unable to fetch Example feed (503)'
    )
  })

  it('fails when the source has fewer domains than expected', async () => {
    await should(fetchSource(SOURCE, respondWith('a.test'))).be.rejectedWith(
      'Expected at least 2 domains from Example feed, received 1'
    )
    await should(fetchSource(SOURCE, respondWith(''))).be.rejectedWith(/received 0/)
  })

  it('gives up on a source that does not answer in time', async () => {
    let signal
    await fetchSource(SOURCE, (url, options) => {
      signal = options.signal
      return respondWith('a.test\nb.test')()
    })
    should(signal).be.instanceof(AbortSignal)
  })

  it('fails when the source responds with an HTML page', async () => {
    await should(fetchSource(SOURCE, respondWith('<!DOCTYPE html><html></html>'))).be.rejectedWith(
      'Received HTML instead of domain list for Example feed'
    )
  })
})

describe('fetchSourceDomains', () => {
  it('merges every source without duplicates', async () => {
    const bodies = { 'https://one.test': 'a.test\nb.test', 'https://two.test': 'b.test\nc.test' }
    const fetch = url => respondWith(bodies[url])()
    const sources = Object.keys(bodies).map(url => ({ name: url, url, minDomains: 1 }))
    const domains = await fetchSourceDomains(sources, fetch)
    should(Array.from(domains)).eql(['a.test', 'b.test', 'c.test'])
  })
})

describe('buildDomains', () => {
  const build = overrides =>
    buildDomains({
      sourceDomains: [],
      curatedDomains: [],
      allowlist: [],
      inactiveDomains: [],
      ...overrides
    })

  it('merges source and curated domains, sorted and without duplicates', () => {
    should(
      build({ sourceDomains: ['b.test', 'a.test'], curatedDomains: ['c.test', 'a.test'] })
    ).eql(['a.test', 'b.test', 'c.test'])
  })

  it('drops inactive source domains', () => {
    should(build({ sourceDomains: ['a.test', 'dead.test'], inactiveDomains: ['dead.test'] })).eql([
      'a.test'
    ])
  })

  it('keeps curated domains even when they are inactive', () => {
    should(build({ curatedDomains: ['curated.test'], inactiveDomains: ['curated.test'] })).eql([
      'curated.test'
    ])
  })

  it('drops allowlisted domains from every origin', () => {
    should(
      build({
        sourceDomains: ['a.test', 'company.test'],
        curatedDomains: ['business.test'],
        allowlist: ['company.test', 'business.test']
      })
    ).eql(['a.test'])
  })
})

describe('sources', () => {
  it('has a unique https url per source', () => {
    const urls = SOURCES.map(source => source.url)
    should(new Set(urls).size).equal(urls.length)
    for (const url of urls) should(url).startWith('https://')
  })

  it('expects a minimum number of domains from every source', () => {
    for (const source of SOURCES) should(source.minDomains).be.above(0)
  })

  it('never curates a domain that is also allowlisted', () => {
    should(DOMAINS.filter(domain => ALLOWLIST.includes(domain))).eql([])
  })
})
