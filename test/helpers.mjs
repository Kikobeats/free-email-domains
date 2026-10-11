export const MAIL_SERVER = [{ exchange: 'mx.example.net', priority: 10 }]
export const NULL_MX = [{ exchange: '', priority: 0 }]
export const ADDRESS = ['192.0.2.1']

const CANARY_ANSWERS = {
  'gmail.com': { mx: MAIL_SERVER },
  'nonexistent.invalid': { mx: 'ENOTFOUND' }
}

export const answer = async value => {
  if (typeof value === 'string') throw Object.assign(new Error(value), { code: value })
  return value
}

export const fakeResolver = ({ mx, ipv4 = 'ENODATA', ipv6 = 'ENODATA' }) => ({
  resolveMx: () => answer(mx),
  resolve4: () => answer(ipv4),
  resolve6: () => answer(ipv6)
})

export function fakeZoneResolver (answersByDomain) {
  const zone = { ...CANARY_ANSWERS, ...answersByDomain }
  const queried = new Set()
  const record = (domain, type, fallback) => {
    queried.add(domain)
    return answer(zone[domain]?.[type] ?? fallback)
  }
  return {
    queried,
    resolveMx: domain => record(domain, 'mx', 'ETIMEOUT'),
    resolve4: domain => record(domain, 'ipv4', 'ENODATA'),
    resolve6: domain => record(domain, 'ipv6', 'ENODATA')
  }
}
