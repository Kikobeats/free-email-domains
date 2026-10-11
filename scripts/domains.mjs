import { readFile, rename, writeFile } from 'node:fs/promises'

const DOMAINS_URL = new URL('../domains.json', import.meta.url)
const INACTIVE_DOMAINS_URL = new URL('../inactive-domains.json', import.meta.url)
const FETCH_TIMEOUT_MS = 20000
const HOSTNAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

export const isHostname = text => HOSTNAME_PATTERN.test(text)

export const sanitize = text =>
  text
    .split(/[,\n]/g)
    .map(entry => entry.trim().toLowerCase())
    .filter(isHostname)

export async function fetchSource (source, fetch = globalThis.fetch) {
  const res = await fetch(source.url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })

  if (!res.ok) {
    throw new Error(`Unable to fetch ${source.name} (${res.status})`)
  }

  const text = await res.text()

  if (text.startsWith('<!DOCTYPE html') || text.includes('<html')) {
    throw new Error(`Received HTML instead of domain list for ${source.name}`)
  }

  const domains = sanitize(text)

  if (domains.length < source.minDomains) {
    throw new Error(
      `Expected at least ${source.minDomains} domains from ${source.name}, received ${domains.length}`
    )
  }

  return domains
}

export async function fetchSourceDomains (sources, fetch = globalThis.fetch) {
  const sourceDomains = await Promise.all(sources.map(source => fetchSource(source, fetch)))
  return new Set(sourceDomains.flat())
}

export function buildDomains ({ sourceDomains, curatedDomains, allowlist, inactiveDomains }) {
  const excluded = new Set(inactiveDomains)
  const allowed = new Set(allowlist)
  const domains = new Set(curatedDomains)
  for (const domain of sourceDomains) if (!excluded.has(domain)) domains.add(domain)
  return Array.from(domains)
    .filter(domain => !allowed.has(domain))
    .sort()
}

const readJson = async url => JSON.parse(await readFile(url, 'utf8'))

async function writeJson (url, domains) {
  const temporaryUrl = new URL(`${url.href}.tmp`)
  await writeFile(temporaryUrl, JSON.stringify(domains, null, 2))
  await rename(temporaryUrl, url)
}

export const readInactiveDomains = () => readJson(INACTIVE_DOMAINS_URL)

export const writeInactiveDomains = domains => writeJson(INACTIVE_DOMAINS_URL, domains)

export const writeDomains = domains => writeJson(DOMAINS_URL, domains)
