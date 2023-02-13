import jsonFuture from 'json-future'
import got from 'got'

/* List of free email domains by HubSpot
   https://knowledge.hubspot.com/forms/what-domains-are-blocked-when-using-the-forms-email-domains-to-block-feature */
const URL =
  'https://f.hubspotusercontent40.net/hubfs/2832391/Marketing/Lead-Capture/free-domains-2.csv'

const trim = text => text.replace(/^\s+|\s+$/g, '')

const save = async body => {
  const result = body.split(/[,\n]/g).map(trim).filter(Boolean)
  await jsonFuture.saveAsync('domains.json', result)
}

try {
  await save(await got(URL).text())
} catch (error) {
  console.error(error)
  process.exit(1)
}
