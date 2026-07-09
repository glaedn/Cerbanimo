import dns from 'node:dns/promises';
import net from 'node:net';
import fetch from 'node-fetch';
import EvidenceArtifactStore, { MAX_ITEM_BYTES } from './EvidenceArtifactStore.js';

const allowedMediaTypes = new Set([
  'text/plain',
  'text/html',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

function isPrivateIpv4(address) {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some(part => Number.isNaN(part))) return true;
  const [a, b] = octets;
  return a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || a >= 224;
}

function isPrivateIpv6(address) {
  const normalized = address.toLowerCase();
  return normalized === '::1'
    || normalized === '::'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe80:')
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
  return String(header || '').split(';')[0].trim().toLowerCase();
}

function sniffMediaType(buffer, fallback) {
  if (buffer.length >= 4 && buffer.slice(0, 4).toString('ascii') === '%PDF') return 'application/pdf';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  const prefix = buffer.slice(0, 200).toString('utf8').trim().toLowerCase();
  if (prefix.startsWith('<!doctype html') || prefix.startsWith('<html')) return 'text/html';
  if (prefix.includes('<svg')) return 'image/svg+xml';
  return fallback || 'application/octet-stream';
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

    const ipVersion = net.isIP(parsed.hostname);
    const addresses = ipVersion
      ? [{ address: parsed.hostname, family: ipVersion }]
      : await dns.lookup(parsed.hostname, { all: true, verbatim: true });
    for (const address of addresses) {
      const blocked = address.family === 4 ? isPrivateIpv4(address.address) : isPrivateIpv6(address.address);
      if (blocked) {
        const error = new Error('Evidence URL resolves to a private or reserved network address.');
        error.status = 400;
        error.code = 'EVIDENCE_URL_PRIVATE_NETWORK';
        throw error;
      }
    }

    return parsed;
  }

  async fetchSnapshot(rawUrl, { client, timeoutMs = 8000, maxRedirects = 3 } = {}) {
    let current = await this.assertSafeUrl(rawUrl);
    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetch(current.toString(), {
          method: 'GET',
          redirect: 'manual',
          headers: { 'user-agent': 'CerbanimoEvidenceFetcher/1.0' },
          signal: controller.signal
        });
      } finally {
        clearTimeout(timer);
      }

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          const error = new Error('Evidence URL redirected without a location header.');
          error.status = 400;
          error.code = 'EVIDENCE_URL_BAD_REDIRECT';
          throw error;
        }
        current = await this.assertSafeUrl(new URL(location, current).toString());
        continue;
      }

      const headerMediaType = mediaTypeFromHeader(response.headers.get('content-type'));
      if (headerMediaType && !allowedMediaTypes.has(headerMediaType)) {
        const error = new Error(`Evidence URL content type ${headerMediaType} is not allowed.`);
        error.status = 415;
        error.code = 'EVIDENCE_MEDIA_TYPE_NOT_ALLOWED';
        throw error;
      }

      const buffer = await readBounded(response, MAX_ITEM_BYTES);
      const sniffedMediaType = sniffMediaType(buffer, headerMediaType || undefined);
      if (!allowedMediaTypes.has(sniffedMediaType)) {
        const error = new Error(`Evidence content type ${sniffedMediaType} is not allowed.`);
        error.status = 415;
        error.code = 'EVIDENCE_MEDIA_TYPE_NOT_ALLOWED';
        throw error;
      }

      const blob = await EvidenceArtifactStore.putBuffer({
        buffer,
        mediaType: sniffedMediaType,
        client,
        metadata: {
          sourceUrl: rawUrl,
          canonicalUrl: current.toString(),
          statusCode: response.status,
          capturedAt: new Date().toISOString()
        }
      });

      return {
        sourceUrl: rawUrl,
        canonicalUrl: current.toString(),
        mediaType: sniffedMediaType,
        byteSize: buffer.length,
        contentSha256: blob.content_sha256,
        blobStorageKey: blob.storage_key,
        statusCode: response.status,
        ok: response.ok
      };
    }

    const error = new Error('Evidence URL redirected too many times.');
    error.status = 400;
    error.code = 'EVIDENCE_URL_TOO_MANY_REDIRECTS';
    throw error;
  }
}

export default new EvidenceFetchService();
