'use strict'

const should = require('should')
const domains = require('..')

describe('free email domains', () => {
  it('has content', () => {
    should(domains.includes('gmail.com')).be.true()
  })
})
