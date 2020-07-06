#!/usr/bin/env node

'use strict'

const jsonFuture = require('json-future')
const cheerio = require('cheerio')
const got = require('got')

const fetchList = () =>
  got(
    'https://knowledge.hubspot.com/articles/kcs_article/forms/what-domains-are-blocked-when-using-the-forms-email-domains-to-block-feature'
  ).text()

const REGEX_SEPARATOR = new RegExp('<br>', 'g')

const save = async body => {
  const $ = cheerio.load(body)
  let result = []

  $('span > p').each(function (i, el) {
    if (i !== 0) {
      const domains = $(this)
        .html()
        .replace(REGEX_SEPARATOR, ' ')
        .split(' ')
      result = result.concat(domains)
    }
  })
  await jsonFuture.saveAsync('domains.json', result)
}

fetchList()
  .then(save)
  .then(() => process.exit())
  .catch(err => console.error(err) && process.exit(1))
