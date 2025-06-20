import { writeFile } from 'node:fs/promises'
import simpleGet from 'simple-get'

const get = (url, opts) =>
  new Promise((resolve, reject) =>
    simpleGet.concat({ url: url.toString(), ...opts }, (err, res, data) =>
      err ? reject(err) : resolve({ res, data })
    )
  )

/* List of free email domains by HubSpot
   https://knowledge.hubspot.com/forms/what-domains-are-blocked-when-using-the-forms-email-domains-to-block-feature */
const URL =
  'https://f.hubspotusercontent40.net/hubfs/2832391/Marketing/Lead-Capture/free-domains-2.csv'

/** Additional domains not present in the URL */
const DOMAINS = [
  'pm.me',
  'proton.me',
  'protonmail.ch',
  'sharklasers.com',
  'guerrillamail.com',
  '10minutemail.com',
  'spambox.xyz',
  'emailondeck.com',
  'temp-mail.org',
  'tempmail.net',
  'mail.tm'
]

const trim = text => text.replace(/^\s+|\s+$/g, '')

const sanetize = text => text.split(/[,\n]/g).map(trim).filter(Boolean)

try {
  const data = await get(URL).then(res => res.data.toString())
  const domains = new Set(sanetize(data))
  for (const domain of DOMAINS) domains.add(domain)
  const sorted = Array.from(domains).sort()
  await writeFile('domains.json', JSON.stringify(sorted, null, 2))
} catch (error) {
  console.error(error)
  process.exit(1)
}
