import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import fetch from 'node-fetch';
import EvidenceArtifactStore, { MAX_ITEM_BYTES } from './EvidenceArtifactStore.js';
import { inspectBinary, normalizeMediaType, urlSnapshotAllowedMediaTypes } from './EvidenceBinaryInspectionService.js';

const connectTimeoutMs = Number(process.env.CERBANIMO_EVIDENCE_FETCH_CONNECT_TIMEOUT_MS || 5000);
const totalTimeoutMs = Number(process.env.CERBANIMO_EVIDENCE_FETCH_TOTAL_TIMEOUT_MS || 15000);

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
  const normalized = address.toLowerCase();
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

function mediaTypeFromHeader(header = '') {
  return normalizeMediaType(header);
}

async function readBounded(response, maxBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    const buffer = Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) {
      const error = new Error(`Fetched evidence exceeds ${maxBytes} bytes.`);
      error.status = 413;
      error.code = 'FETCHED_EVIDENCE_TOO_LARGE';
      throw error;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

class EvidenceFetchService {
  async assertSafeUrl(rawUrl) {
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      const error = new Error('Evidence URL is not valid.');
      error.status = 400;
      error.code = 'INVALID_EVIDENCE_URL';
      throw error;
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || blockedHostname(parsed.hostname)) {
      const error = new Error('Evidence URL is not allowed.');
      error.status = 400;
      error.code = 'EVIDENCE_URL_NOT_ALLOWED';
      throw error;
    }

    const addresses = await this.resolvePublicAddresses(parsed.hostname);
    return { parsed, addresses };
  }

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

  pinnedAgent(parsed, pinnedAddress) {
    const lookup = (_hostname, _options, callback) => {
      callback(null, pinnedAddress.address, pinnedAddress.family);
    };
    const Agent = parsed.protocol === 'https:' ? https.Agent : http.Agent;
    return new Agent({
      lookup,
      timeout: connectTimeoutMs,
      servername: parsed.hostname
    });
  }

  async fetchSnapshot(rawUrl, { client, timeoutMs = totalTimeoutMs, maxRedirects = 3 } = {}) {
    let safety = await this.assertSafeUrl(rawUrl);
    let current = safety.parsed;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      const addresses = redirectCount === 0 ? safety.addresses : await this.resolvePublicAddresses(current.hostname);
      const pinnedAddress = addresses[0];
      let response;
      try {
        response = await fetch(current.toString(), {
          method: 'GET',
          redirect: 'manual',
          headers: {
            'user-agent': 'CerbanimoEvidenceFetcher/1.0',
            host: current.host
          },
          agent: this.pinnedAgent(current, pinnedAddress),
          signal: controller.signal
        });
      } catch (error) {
        if (error.name === 'AbortError') {
          error.status = 408;
          error.code = 'EVIDENCE_URL_FETCH_TIMEOUT';
        }
        throw error;
      }

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          const error = new Error('Evidence URL redirected without a location header.');
          error.status = 400;
          error.code = 'EVIDENCE_URL_BAD_REDIRECT';
          throw error;
        }
        safety = await this.assertSafeUrl(new URL(location, current).toString());
        current = safety.parsed;
        continue;
      }

      if (!response.ok) {
        const error = new Error(`Evidence URL returned unsupported status ${response.status}.`);
        error.status = 422;
        error.code = 'EVIDENCE_URL_NON_2XX';
        error.details = { statusCode: response.status };
        throw error;
      }

      const headerMediaType = mediaTypeFromHeader(response.headers.get('content-type'));
      if (headerMediaType && !urlSnapshotAllowedMediaTypes.has(headerMediaType)) {
        const error = new Error(`Evidence URL content type ${headerMediaType} is not allowed.`);
        error.status = 415;
        error.code = 'EVIDENCE_MEDIA_TYPE_NOT_ALLOWED';
        throw error;
      }
      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > MAX_ITEM_BYTES) {
        const error = new Error(`Fetched evidence exceeds ${MAX_ITEM_BYTES} bytes.`);
        error.status = 413;
        error.code = 'FETCHED_EVIDENCE_TOO_LARGE';
        throw error;
      }

      const buffer = await readBounded(response, MAX_ITEM_BYTES);
      const inspected = inspectBinary({
        buffer,
        claimedMediaType: headerMediaType || undefined,
        sourceKind: 'url_snapshot',
        maxBytes: MAX_ITEM_BYTES
      });

      const blob = await EvidenceArtifactStore.putBuffer({
        buffer: inspected.buffer,
        mediaType: inspected.mediaType,
        client,
        metadata: {
          sourceUrl: rawUrl,
          canonicalUrl: current.toString(),
          statusCode: response.status,
          capturedAt: new Date().toISOString(),
          pinnedAddress: pinnedAddress.address,
          metadataPolicy: inspected.metadataPolicy
        }
      });

      return {
        sourceUrl: rawUrl,
        canonicalUrl: current.toString(),
        mediaType: inspected.mediaType,
        byteSize: inspected.byteSize,
        contentSha256: blob.content_sha256,
        blobStorageKey: blob.storage_key,
        statusCode: response.status,
        ok: response.ok
      };
      }
    } finally {
      clearTimeout(timer);
    }

    const error = new Error('Evidence URL redirected too many times.');
    error.status = 400;
    error.code = 'EVIDENCE_URL_TOO_MANY_REDIRECTS';
    throw error;
  }
}

export default new EvidenceFetchService();
export { blockedHostname, isPrivateIpv4, isPrivateIpv6 };
