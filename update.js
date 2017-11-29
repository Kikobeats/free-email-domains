'use strict'

const got = require('got')
const cheerio = require('cheerio')
const {concat} = require('lodash')
const jsonFuture = require('json-future')

const URL = 'https://knowledge.hubspot.com/articles/kcs_article/forms/what-domains-are-blocked-when-using-the-forms-email-domains-to-block-feature'

const REGEX_SEPARATOR = new RegExp('<br>', 'g')

;(async () => {
  const {body} = await got(URL)

  const $ = cheerio.load(body)
  let result = []

  $('span > p').each(function (i, el) {
    if (i !== 0) {
      const domains = $(this)
        .html()
        .replace(REGEX_SEPARATOR, ' ')
        .split(' ')

      result = concat(result, domains)
    }
  })

  jsonFuture.save('domains.json', result)
  console.log(`done! ${result.length} added`)
})()
