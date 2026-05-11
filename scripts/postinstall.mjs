import { writeFile } from 'node:fs/promises'

/* List of free email domains by HubSpot
   https://knowledge.hubspot.com/forms/what-domains-are-blocked-when-using-the-forms-email-domains-to-block-feature */
const URL =
  'https://f.hubspotusercontent40.net/hubfs/2832391/Marketing/Lead-Capture/free-domains-2.csv'

/** Additional domains not present in the URL */
const DOMAINS = [
  '10minutemail.com',
  '2iij.net',
  'asahi-net.or.jp',
  'au.com',
  'auone-net.jp',
  'bbiq.jp',
  'bbtec.net',
  'biglobe.ne.jp',
  'biz.ezweb.ne.jp',
  'chol.com',
  'chollian.net',
  'commufa.jp',
  'daum.net',
  'dion.ne.jp',
  'disney.ne.jp',
  'docomo.ne.jp',
  'dreamwiz.com',
  'dti.ne.jp',
  'emailondeck.com',
  'emnet.ne.jp',
  'emobile.ne.jp',
  'empal.com',
  'empas.com',
  'eonet.ne.jp',
  'ezweb.ne.jp',
  'freechal.com',
  'freemail.ne.jp',
  'guerrillamail.com',
  'hanafos.com',
  'hananet.net',
  'hanmail2.net',
  'hanmir.com',
  'hi-ho.ne.jp',
  'hitel.net',
  'i.softbank.jp',
  'iij4u.or.jp',
  'infoseek.co.jp',
  'infoseek.jp',
  'infoweb.ne.jp',
  'jcom.home.ne.jp',
  'jcom.zaq.ne.jp',
  'kakao.com',
  'kcn.ne.jp',
  'kornet.net',
  'livedoor.com',
  'lycos.co.kr',
  'mail.goo.ne.jp',
  'mail.sony.jp',
  'mail.tm',
  'megaegg.ne.jp',
  'mesh.ad.jp',
  'mineo.jp',
  'mopera.net',
  'nate.com',
  'netsgo.com',
  'nifty.com',
  'nifty.ne.jp',
  'nownuri.net',
  'ocn.ne.jp',
  'odn.ad.jp',
  'odn.ne.jp',
  'panda.tnc.ne.jp',
  'paran.com',
  'pdx.ne.jp',
  'pikara.ne.jp',
  'plala.or.jp',
  'pm.me',
  'proton.me',
  'protonmail.ch',
  'rakumail.jp',
  'rakuten.jp',
  'sharklasers.com',
  'sky.tkc.ne.jp',
  'sky.tkk.ne.jp',
  'sky.tu-ka.ne.jp',
  'so-net.ne.jp',
  'softbank.ne.jp',
  'spaaqs.ne.jp',
  'spambox.xyz',
  't-com.ne.jp',
  'temp-mail.org',
  'tempmail.net',
  'thrunet.com',
  'tiki.ne.jp',
  'tistory.com',
  'tokai.or.jp',
  'ucom.ne.jp',
  'unitel.co.kr',
  'uqmobile.jp',
  'vodafone.ne.jp',
  'wcm.ne.jp',
  'willcom.com',
  'ybb.ne.jp',
  'ymail.ne.jp',
  'ymobile.ne.jp',
  'ymobile1.ne.jp',
  'zaq.ne.jp'
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
