import { writeFile } from 'node:fs/promises'

/* List of free email domains by HubSpot
   https://knowledge.hubspot.com/forms/what-domains-are-blocked-when-using-the-forms-email-domains-to-block-feature */
const URL =
  'https://f.hubspotusercontent40.net/hubfs/2832391/Marketing/Lead-Capture/free-domains-2.csv'

/** Additional domains not present in the URL */
const DOMAINS = ['pm.me', 'proton.me', 'protonmail.ch']

const trim = text => text.replace(/^\s+|\s+$/g, '')

const sanetize = text => text.split(/[,\n]/g).map(trim).filter(Boolean)

try {
  const raw = await fetch(URL).then(res => res.text())
  const domains = new Set(sanetize(raw))
  for (const domain of DOMAINS) domains.add(domain)
  const sorted = Array.from(domains).sort()
  await writeFile('domains.json', JSON.stringify(sorted, null, 2))
} catch (error) {
  console.error(error)
  process.exit(1)
}
