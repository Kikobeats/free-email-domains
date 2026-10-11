# free-email-domains

[![Last version](https://img.shields.io/github/v/tag/Kikobeats/free-email-domains?style=flat-square)](https://github.com/Kikobeats/free-email-domains/releases)
[![NPM Status](https://img.shields.io/npm/dm/free-email-domains?style=flat-square)](https://www.npmjs.com/package/free-email-domains)

> Free and disposable email domains in a single list, validated against DNS every day.

## Highlights

- **30,000+ domains.** Free providers (Gmail, Yahoo, Outlook and thousands of regional ones) and disposable providers (Mailinator, Temp Mail and the like) together.
- **Six sources plus a curated list.** Merged, deduplicated and lowercased.
- **Validated against DNS.** A domain that cannot receive email is removed, so the list has no dead weight.
- **Updated every day.** A new version is published whenever the list changes.
- **Zero dependencies.** It is a JSON array of strings, with TypeScript types.

## Why use it

- Block temporary or throwaway inboxes during signup.
- Tell personal emails from work emails to qualify leads.
- Reduce fake form submissions.
- Keep CRM and email workflows cleaner.

## Install

```bash
$ npm install free-email-domains --save
```

## Usage

The module exports an array of lowercase domains:

```js
const freeEmailDomains = require('free-email-domains')

freeEmailDomains.includes('gmail.com') // => true
freeEmailDomains.includes('mailinator.com') // => true
freeEmailDomains.includes('your-company.com') // => false
```

It works the same with ES modules:

```js
import freeEmailDomains from 'free-email-domains'
```

### Checking an email address

Create a `Set` once to get constant time lookups, then compare the part after the last `@` in lowercase:

```js
const freeEmailDomains = new Set(require('free-email-domains'))

const isFreeEmail = email => {
  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase()
  return freeEmailDomains.has(domain)
}

isFreeEmail('hello@gmail.com') // => true
isFreeEmail('Hello@Mailinator.com') // => true
isFreeEmail('hello@your-company.com') // => false
```

Domains are matched exactly: `gmail.com` is listed, `mail.gmail.com` is not.

### Without Node.js

The list is a plain JSON file, so any language can use it:

```bash
$ curl -sL https://cdn.jsdelivr.net/npm/free-email-domains/domains.json
```

## How the list is built

The list is rebuilt every day from these sources:

- [HubSpot free domains](https://knowledge.hubspot.com/forms/what-domains-are-blocked-when-using-the-forms-email-domains-to-block-feature) – free email providers.
- [castle/disposable-email-domains](https://github.com/castle/disposable-email-domains) – disposable providers.
- [disposable-email-domains/disposable-email-domains](https://github.com/disposable-email-domains/disposable-email-domains) – disposable providers.
- [groundcat/disposable-email-domain-list](https://github.com/groundcat/disposable-email-domain-list) – disposable providers, MX validated.
- [7c/fakefilter](https://github.com/7c/fakefilter) – disposable providers observed in the wild.
- [unkn0w/disposable-email-domain-list](https://github.com/unkn0w/disposable-email-domain-list) – disposable providers.
- A curated list of providers missing from the sources above, at [scripts/sources.mjs](scripts/sources.mjs).

Then every domain coming from a source is checked against DNS, asking two public resolvers (Cloudflare and Google):

| DNS answer | Result |
| --- | --- |
| It has MX records | kept |
| It has no MX records but it has an A or AAAA record ([implicit MX](https://datatracker.ietf.org/doc/html/rfc5321#section-5.1)) | kept |
| It publishes a [null MX](https://datatracker.ietf.org/doc/html/rfc7505) | removed |
| It does not exist, or it has no MX, A or AAAA record | removed |
| Timeout or server failure | unchanged from the previous scan |

A domain is only removed when both resolvers agree it cannot receive email. Removed domains are stored at [inactive-domains.json](inactive-domains.json), and they come back on the first daily scan where a resolver finds them accepting email again.

The scan refuses to write anything when a resolver fails a sanity check (`gmail.com` must be active, a `.invalid` name must not exist), or when too many domains come back inactive or unanswered.

Curated domains are never removed by the scan. Domains listed by a source that are neither free nor disposable providers are excluded with the allowlist at [scripts/sources.mjs](scripts/sources.mjs).

## Update data

Fetch the sources, scan DNS and write `domains.json` and `inactive-domains.json`:

```bash
$ npm run update
```

The scan takes about a minute. The `postinstall` script does the same without the DNS scan, reusing `inactive-domains.json`:

```bash
$ node scripts/postinstall.mjs
```

## Contributing

- Missing a provider? Add it to `DOMAINS` at [scripts/sources.mjs](scripts/sources.mjs).
- Is a legit business domain listed? Add it to `ALLOWLIST` at [scripts/sources.mjs](scripts/sources.mjs).

## Related

- [email-providers](https://github.com/derhuerst/email-providers) – Top 3k common emails by Alexa rank.

## License

**free-email-domains** © [Kiko Beats](https://kikobeats.com), released under the [MIT](https://github.com/Kikobeats/free-email-domains/blob/master/LICENSE.md) License.<br>
Authored and maintained by Kiko Beats with help from [contributors](https://github.com/Kikobeats/free-email-domains/contributors).

> [kikobeats.com](https://kikobeats.com) · GitHub [@Kiko Beats](https://github.com/Kikobeats) · X [@Kikobeats](https://x.com/Kikobeats)
