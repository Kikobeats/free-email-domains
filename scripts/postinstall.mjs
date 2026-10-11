import { buildDomains, fetchSourceDomains, readInactiveDomains, writeDomains } from './domains.mjs'
import { ALLOWLIST, DOMAINS, SOURCES } from './sources.mjs'

async function main () {
  const [sourceDomains, inactiveDomains] = await Promise.all([
    fetchSourceDomains(SOURCES),
    readInactiveDomains()
  ])
  await writeDomains(
    buildDomains({ sourceDomains, curatedDomains: DOMAINS, allowlist: ALLOWLIST, inactiveDomains })
  )
}

main().catch(error =>
  console.warn('free-email-domains: unable to refresh domains, using the bundled list', error)
)
