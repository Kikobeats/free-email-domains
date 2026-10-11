import { buildDomains } from './domains.mjs'
import {
  assertPlausibleScan,
  assertTrustworthyResolvers,
  inactiveAfterScan,
  scanDomains
} from './mx.mjs'

export async function refreshDomains ({
  sourceDomains,
  previouslyInactive,
  curatedDomains,
  allowlist,
  resolvers,
  onProgress
}) {
  await assertTrustworthyResolvers(resolvers)

  const neverScanned = new Set([...curatedDomains, ...allowlist])
  const scannable = Array.from(sourceDomains).filter(domain => !neverScanned.has(domain))
  const scan = await scanDomains(scannable, { resolvers, onProgress })
  const inactiveDomains = inactiveAfterScan(scan, previouslyInactive)
  assertPlausibleScan({
    inactive: inactiveDomains.length,
    unknown: scan.unknown.length,
    total: scannable.length
  })

  const domains = buildDomains({ sourceDomains, curatedDomains, allowlist, inactiveDomains })

  return {
    domains,
    inactiveDomains,
    summary: {
      scanned: scannable.length,
      active: scan.active.length,
      inactive: inactiveDomains.length,
      unknown: scan.unknown.length,
      domains: domains.length
    }
  }
}
