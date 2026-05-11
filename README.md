# free-email-domains

![Last version](https://img.shields.io/github/tag/Kikobeats/free-email-domains.svg?style=flat-square)
[![NPM Status](https://img.shields.io/npm/dm/free-email-domains.svg?style=flat-square)](https://www.npmjs.org/package/free-email-domains)

> Curated list of free and disposable email domains for signup filtering, lead quality, and abuse prevention.

## Why use it

- Block temporary or throwaway inboxes during signup.
- Reduce fake form submissions.
- Keep CRM and email workflows cleaner.

## Install

```bash
$ npm install free-email-domains --save
```

## Usage

```js
const freeEmailDomains = require('free-email-domains')

freeEmailDomains.includes('gmail.com') // => true
freeEmailDomains.includes('your-company.com') // => false
```

## Update data

```bash
$ node scripts/postinstall.mjs
```

## Related

- [email-providers](https://github.com/derhuerst/email-providers) – Top 3k common emails by Alexa rank.

## License

**free-email-domains** © [Kiko Beats](https://kikobeats.com), released under the [MIT](https://github.com/Kikobeats/free-email-domains/blob/master/LICENSE.md) License.<br>
Authored and maintained by Kiko Beats with help from [contributors](https://github.com/Kikobeats/free-email-domains/contributors).

> [kikobeats.com](https://kikobeats.com) · GitHub [@Kiko Beats](https://github.com/Kikobeats) · X [@Kikobeats](https://x.com/Kikobeats)
