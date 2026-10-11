import { Resolver } from 'node:dns/promises'

const RESOLVER_ADDRESSES = ['1.1.1.1', '8.8.8.8']
const QUERY_TIMEOUT_MS = 4000
const QUERY_TRIES = 2
const SCAN_CONCURRENCY = 100
const MAX_INACTIVE_RATIO = 0.5
const MAX_UNKNOWN_RATIO = 0.2
const ACTIVE_CANARY = 'gmail.com'
const NONEXISTENT_CANARY = 'nonexistent.invalid'
const NONEXISTENT_DOMAIN = 'ENOTFOUND'
const NO_RECORDS = 'ENODATA'

export const STATUS = { ACTIVE: 'active', INACTIVE: 'inactive', UNKNOWN: 'unknown' }

function createResolver (address) {
  const resolver = new Resolver({ timeout: QUERY_TIMEOUT_MS, tries: QUERY_TRIES })
  resolver.setServers([address])
  return resolver
}

export const createResolvers = () => RESOLVER_ADDRESSES.map(createResolver)

const isNullMx = records => records.length === 1 && records[0].exchange === ''

const isDefinitiveMiss = error => error.code === NONEXISTENT_DOMAIN || error.code === NO_RECORDS

async function addressStatus (lookup) {
  try {
    const addresses = await lookup()
    return addresses.length > 0 ? STATUS.ACTIVE : STATUS.INACTIVE
  } catch (error) {
    return isDefinitiveMiss(error) ? STATUS.INACTIVE : STATUS.UNKNOWN
  }
}

async function implicitMxStatus (resolver, domain) {
  const statuses = await Promise.all([
    addressStatus(() => resolver.resolve4(domain)),
    addressStatus(() => resolver.resolve6(domain))
  ])
  if (statuses.includes(STATUS.ACTIVE)) return STATUS.ACTIVE
  return statuses.includes(STATUS.UNKNOWN) ? STATUS.UNKNOWN : STATUS.INACTIVE
}

async function resolverStatus (resolver, domain) {
  let records

  try {
    records = await resolver.resolveMx(domain)
  } catch (error) {
    if (error.code === NONEXISTENT_DOMAIN) return STATUS.INACTIVE
    if (error.code === NO_RECORDS) return implicitMxStatus(resolver, domain)
    return STATUS.UNKNOWN
  }

  if (records.length === 0) return implicitMxStatus(resolver, domain)
  return isNullMx(records) ? STATUS.INACTIVE : STATUS.ACTIVE
}

export async function classifyDomain (domain, resolvers) {
  let everyResolverSaysInactive = resolvers.length > 0

  for (const resolver of resolvers) {
    const status = await resolverStatus(resolver, domain)
    if (status === STATUS.ACTIVE) return STATUS.ACTIVE
    if (status === STATUS.UNKNOWN) everyResolverSaysInactive = false
  }

  return everyResolverSaysInactive ? STATUS.INACTIVE : STATUS.UNKNOWN
}

export async function assertTrustworthyResolvers (resolvers) {
  if (resolvers.length === 0) throw new Error('MX scan needs at least one DNS resolver')

  await Promise.all(
    resolvers.map(async (resolver, index) => {
      const [activeCanary, nonexistentCanary] = await Promise.all([
        resolverStatus(resolver, ACTIVE_CANARY),
        resolverStatus(resolver, NONEXISTENT_CANARY)
      ])
      if (activeCanary !== STATUS.ACTIVE || nonexistentCanary !== STATUS.INACTIVE) {
        throw new Error(
          `DNS resolver #${
            index + 1
          } is not trustworthy: ${ACTIVE_CANARY} is ${activeCanary}, ${NONEXISTENT_CANARY} is ${nonexistentCanary}`
        )
      }
    })
  )
}

export async function scanDomains (
  domains,
  { resolvers, concurrency = SCAN_CONCURRENCY, onProgress = () => {} }
) {
  const pending = Array.from(domains)
  const total = pending.length
  const scan = { [STATUS.ACTIVE]: [], [STATUS.INACTIVE]: [], [STATUS.UNKNOWN]: [] }
  let scanned = 0

  const worker = async () => {
    while (pending.length > 0) {
      const domain = pending.pop()
      scan[await classifyDomain(domain, resolvers)].push(domain)
      onProgress(++scanned, total)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
  return scan
}

export function inactiveAfterScan (scan, previouslyInactive) {
  const wasInactive = new Set(previouslyInactive)
  const stillUnconfirmed = scan.unknown.filter(domain => wasInactive.has(domain))
  return scan.inactive.concat(stillUnconfirmed).sort()
}

const assertRatioWithin = (label, count, total, maxRatio) => {
  if (total > 0 && count / total > maxRatio) {
    throw new Error(
      `MX scan left ${count} of ${total} domains ${label}, above the ${maxRatio * 100}% limit`
    )
  }
}

export function assertPlausibleScan ({ inactive, unknown, total }) {
  assertRatioWithin(STATUS.INACTIVE, inactive, total, MAX_INACTIVE_RATIO)
  assertRatioWithin(STATUS.UNKNOWN, unknown, total, MAX_UNKNOWN_RATIO)
}
