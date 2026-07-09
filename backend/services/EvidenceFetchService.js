import EvidenceArtifactStore, { MAX_ITEM_BYTES } from './EvidenceArtifactStore.js';
import { inspectBinary, normalizeMediaType, urlSnapshotAllowedMediaTypes } from './EvidenceBinaryInspectionService.js';
import EvidenceNetworkResolver, { blockedHostname, isPrivateIpv4, isPrivateIpv6 } from './EvidenceNetworkResolver.js';
import EvidenceHttpTransport from './EvidenceHttpTransport.js';

const totalTimeoutMs = Number(process.env.CERBANIMO_EVIDENCE_FETCH_TOTAL_TIMEOUT_MS || 15000);

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
  constructor({ resolver = EvidenceNetworkResolver, transport = EvidenceHttpTransport, fetchImpl = undefined } = {}) {
    this.resolver = resolver;
    this.transport = transport;
    this.fetchImpl = fetchImpl;
  }

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

    const addresses = await this.resolver.resolvePublicAddresses(parsed.hostname);
    return { parsed, addresses };
  }

  async fetchSnapshot(rawUrl, { client, timeoutMs = totalTimeoutMs, maxRedirects = 3 } = {}) {
    let safety = await this.assertSafeUrl(rawUrl);
    let current = safety.parsed;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      const addresses = redirectCount === 0 ? safety.addresses : await this.resolver.resolvePublicAddresses(current.hostname);
      const pinnedAddress = addresses[0];
      let response;
      try {
        response = await this.transport.get(current, {
          pinnedAddress,
          signal: controller.signal,
          fetchImpl: this.fetchImpl
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
      const inspected = await inspectBinary({
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
          metadataPolicy: inspected.metadataPolicy
        },
        sanitizerVersion: inspected.sanitizerVersion
      });

      return {
        sourceUrl: rawUrl,
        canonicalUrl: current.toString(),
        originalMediaType: headerMediaType || inspected.metadataPolicy?.originalMediaType || null,
        mediaType: inspected.mediaType,
        byteSize: inspected.byteSize,
        contentSha256: blob.content_sha256,
        blobStorageKey: blob.storage_key,
        statusCode: response.status,
        ok: response.ok,
        pinnedAddress: pinnedAddress.address,
        metadataPolicy: inspected.metadataPolicy
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
export { EvidenceFetchService, blockedHostname, isPrivateIpv4, isPrivateIpv6 };
