import { writeFile } from 'node:fs/promises'

/* List of free email domains by HubSpot
   https://knowledge.hubspot.com/forms/what-domains-are-blocked-when-using-the-forms-email-domains-to-block-feature */
const URL =
  'https://f.hubspotusercontent40.net/hubfs/2832391/Marketing/Lead-Capture/free-domains-2.csv'

/** Additional domains not present in the URL */
const DOMAINS = [
  '10minutemail.com',
  'chol.com',
  'chollian.net',
  'daum.net',
  'dreamwiz.com',
  'emailondeck.com',
  'empal.com',
  'empas.com',
  'freechal.com',
  'guerrillamail.com',
  'hanafos.com',
  'hananet.net',
  'hanmail2.net',
  'hanmir.com',
  'hitel.net',
  'kakao.com',
  'kornet.net',
  'lycos.co.kr',
  'mail.tm',
  'nate.com',
  'netsgo.com',
  'nownuri.net',
  'paran.com',
  'pm.me',
  'proton.me',
  'protonmail.ch',
  'sharklasers.com',
  'spambox.xyz',
  'temp-mail.org',
  'tempmail.net',
  'thrunet.com',
  'tistory.com',
  'unitel.co.kr'
]

const trim = text => text.replace(/^\s+|\s+$/g, '')

const sanetize = text => text.split(/[,\n]/g).map(trim).filter(Boolean)

async function main () {
  const res = await fetch(URL)

  if (!res.ok) throw new Error(`HTTP Error ${res.status}`)

  const csvData = await res.text()

  if (csvData.startsWith('<!DOCTYPE html') || csvData.includes('<html')) {
    throw new Error('Received HTML instead of CSV')
  }

  const domains = new Set(sanetize(csvData))
  for (const domain of DOMAINS) domains.add(domain)
  const sorted = Array.from(domains).sort()
  await writeFile('domains.json', JSON.stringify(sorted, null, 2))
}

main().catch(error => console.error(error) || process.exit(1))
