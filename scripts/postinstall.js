#!/usr/bin/env node

'use strict'

const jsonFuture = require('json-future')
const got = require('got')

/* List of free email domains by HubSpot
   https://knowledge.hubspot.com/forms/what-domains-are-blocked-when-using-the-forms-email-domains-to-block-feature */
const fetchList = () =>
  got(
    'https://f.hubspotusercontent40.net/hubfs/2832391/Marketing/Lead-Capture/free-domains-1.csv'
  ).text()

const trim = (text) =>
  text.replace(/^\s+|\s+$/g, '')

const save = async body => {
const result = body.split(/[,\n]/g)
    .map(trim)
    .filter(Boolean)

  await jsonFuture.saveAsync('domains.json', result)
}

fetchList()
  .then(save)
  .then(() => process.exit())
  .catch(err => console.error(err) && process.exit(1))
