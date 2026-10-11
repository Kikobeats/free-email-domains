import {
  fetchSourceDomains,
  readInactiveDomains,
  writeDomains,
  writeInactiveDomains
} from './domains.mjs'
import { createResolvers } from './mx.mjs'
import { refreshDomains } from './refresh.mjs'
import { ALLOWLIST, DOMAINS, SOURCES } from './sources.mjs'

const PROGRESS_INTERVAL = 5000

const logProgress = (scanned, total) => {
  if (scanned % PROGRESS_INTERVAL === 0 || scanned === total) { console.log(`mx scan: ${scanned}/${total}`) }
}

const [sourceDomains, previouslyInactive] = await Promise.all([
  fetchSourceDomains(SOURCES),
  readInactiveDomains()
])

const { domains, inactiveDomains, summary } = await refreshDomains({
  sourceDomains,
  previouslyInactive,
  curatedDomains: DOMAINS,
  allowlist: ALLOWLIST,
  resolvers: createResolvers(),
  onProgress: logProgress
})

await writeInactiveDomains(inactiveDomains)
await writeDomains(domains)

console.log(JSON.stringify({ fetched: sourceDomains.size, ...summary }))
