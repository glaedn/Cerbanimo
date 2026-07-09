import dns from 'node:dns/promises';
import net from 'node:net';

function isPrivateIpv4(address) {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some(part => Number.isNaN(part))) return true;
  const [a, b, c, d] = octets;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || (a === 255 && b === 255 && c === 255 && d === 255)
    || a >= 224;
}

function isPrivateIpv6(address) {
  const normalized = String(address || '').toLowerCase();
  if (normalized.startsWith('::ffff:')) {
    const embedded = normalized.replace(/^::ffff:/, '');
    return net.isIP(embedded) === 4 ? isPrivateIpv4(embedded) : true;
  }
  return normalized === '::1'
    || normalized === '::'
    || normalized.startsWith('64:ff9b:')
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe80:')
    || normalized.startsWith('ff')
    || normalized.startsWith('2001:db8:')
    || normalized.startsWith('::ffff:127.')
    || normalized.startsWith('::ffff:10.')
    || normalized.startsWith('::ffff:192.168.')
    || normalized.includes('169.254.');
}

function blockedHostname(hostname) {
  const normalized = String(hostname || '').toLowerCase();
  return normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized.endsWith('.local')
    || normalized === 'metadata.google.internal'
    || normalized === '169.254.169.254';
}

class EvidenceNetworkResolver {
  async resolvePublicAddresses(hostname) {
    const ipVersion = net.isIP(hostname);
    const addresses = ipVersion
      ? [{ address: hostname, family: ipVersion }]
      : await dns.lookup(hostname, { all: true, verbatim: true });
    for (const address of addresses) {
      const blocked = address.family === 4 ? isPrivateIpv4(address.address) : isPrivateIpv6(address.address);
      if (blocked) {
        const error = new Error('Evidence URL resolves to a private or reserved network address.');
        error.status = 400;
        error.code = 'EVIDENCE_URL_PRIVATE_NETWORK';
        throw error;
      }
    }
    return addresses;
  }
}

export { blockedHostname, isPrivateIpv4, isPrivateIpv6 };
export default new EvidenceNetworkResolver();
