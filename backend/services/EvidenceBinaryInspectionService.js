import crypto from 'node:crypto';

const uploadAllowedMediaTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain'
]);

const urlSnapshotAllowedMediaTypes = new Set([
  ...uploadAllowedMediaTypes,
  'text/html'
]);

const activeOrExecutableMediaTypes = new Set([
  'image/svg+xml',
  'application/javascript',
  'text/javascript',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/zip',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/gzip',
  'application/vnd.ms-office',
  'application/vnd.ms-word.document.macroEnabled.12',
  'application/vnd.ms-excel.sheet.macroEnabled.12'
]);

function fail(message, code, status = 415, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.details = details;
  throw error;
}

function normalizeMediaType(value = '') {
  return String(value || '').split(';')[0].trim().toLowerCase();
}

function hasMagic(buffer, bytes) {
  if (!Buffer.isBuffer(buffer) || buffer.length < bytes.length) return false;
  return bytes.every((byte, index) => buffer[index] === byte);
}

function looksLikeText(buffer) {
  if (!buffer.length) return false;
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  let suspiciousControls = 0;
  for (const byte of sample) {
    if (byte === 0) return false;
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) suspiciousControls += 1;
  }
  return suspiciousControls <= 2;
}

function sniffMediaType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    fail('Evidence content is empty.', 'EVIDENCE_EMPTY_FILE', 400);
  }
  if (hasMagic(buffer, [0x4d, 0x5a])) return 'application/x-msdownload';
  if (hasMagic(buffer, [0x50, 0x4b, 0x03, 0x04]) || hasMagic(buffer, [0x50, 0x4b, 0x05, 0x06])) return 'application/zip';
  if (hasMagic(buffer, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return 'application/x-7z-compressed';
  if (hasMagic(buffer, [0x1f, 0x8b])) return 'application/gzip';
  if (hasMagic(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'application/vnd.ms-office';
  if (hasMagic(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (hasMagic(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF') return 'application/pdf';

  const sample = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('utf8').trimStart().toLowerCase();
  if (sample.startsWith('<svg') || sample.includes('<svg')) return 'image/svg+xml';
  if (sample.startsWith('<!doctype html') || sample.startsWith('<html') || /<script[\s>]/i.test(sample)) return 'text/html';
  if (/^(import\s|export\s|function\s|\(\)\s*=>|const\s|let\s|var\s)/.test(sample)) return 'application/javascript';
  if (looksLikeText(buffer)) return 'text/plain';
  return 'application/octet-stream';
}

function detectPolyglot(buffer, sniffedType) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 16384)).toString('utf8').toLowerCase();
  if (['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(sniffedType)) {
    if (sample.includes('<svg') || sample.includes('<script') || sample.includes('javascript:')) {
      return 'active content marker inside binary evidence';
    }
  }
  if (sniffedType === 'application/pdf' && !buffer.subarray(0, 8).toString('ascii').startsWith('%PDF-')) {
    return 'malformed pdf header';
  }
  return null;
}

function decodeStrictBase64(value, { maxBytes, allowDataUri = false } = {}) {
  let raw = String(value || '').trim();
  if (!raw) fail('Evidence upload is empty.', 'EVIDENCE_EMPTY_FILE', 400);
  if (/^data:/i.test(raw)) {
    if (!allowDataUri) {
      fail('Data URI wrappers are not accepted for evidence uploads.', 'EVIDENCE_DATA_URI_NOT_ALLOWED', 400);
    }
    const match = raw.match(/^data:([^;,]+)?;base64,(.*)$/is);
    if (!match) fail('Data URI evidence upload is malformed.', 'EVIDENCE_BASE64_INVALID', 400);
    raw = match[2].trim();
  }
  if (raw.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(raw) || /=[^=]/.test(raw)) {
    fail('Evidence upload must be strict base64 with valid padding.', 'EVIDENCE_BASE64_INVALID', 400);
  }
  const buffer = Buffer.from(raw, 'base64');
  if (!buffer.length) fail('Evidence upload decoded to an empty file.', 'EVIDENCE_EMPTY_FILE', 400);
  if (Buffer.from(buffer).toString('base64') !== raw) {
    fail('Evidence upload base64 payload is not canonical.', 'EVIDENCE_BASE64_INVALID', 400);
  }
  if (maxBytes && buffer.length > maxBytes) {
    fail(`Evidence upload exceeds ${maxBytes} bytes.`, 'EVIDENCE_ITEM_TOO_LARGE', 413);
  }
  return buffer;
}

function sanitizeHtml(buffer) {
  const html = buffer.toString('utf8');
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

function inspectBinary({
  buffer,
  claimedMediaType,
  sourceKind = 'upload',
  maxBytes
} = {}) {
  const content = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || '');
  if (!content.length) fail('Evidence content is empty.', 'EVIDENCE_EMPTY_FILE', 400);
  if (maxBytes && content.length > maxBytes) fail(`Evidence item exceeds ${maxBytes} bytes.`, 'EVIDENCE_ITEM_TOO_LARGE', 413);

  const sniffedType = sniffMediaType(content);
  const allowed = sourceKind === 'url_snapshot' ? urlSnapshotAllowedMediaTypes : uploadAllowedMediaTypes;
  if (activeOrExecutableMediaTypes.has(sniffedType) || !allowed.has(sniffedType)) {
    fail(`Evidence content type ${sniffedType} is not allowed.`, 'EVIDENCE_MEDIA_TYPE_NOT_ALLOWED', 415, { sniffedType });
  }

  const claimed = normalizeMediaType(claimedMediaType);
  if (claimed && claimed !== sniffedType) {
    fail(`Evidence content type mismatch: claimed ${claimed}, detected ${sniffedType}.`, 'EVIDENCE_MEDIA_TYPE_MISMATCH', 415, { claimedType: claimed, sniffedType });
  }

  const polyglot = detectPolyglot(content, sniffedType);
  if (polyglot) fail(`Evidence content was rejected as polyglot or active content: ${polyglot}.`, 'EVIDENCE_POLYGLOT_REJECTED', 415);

  const storedBuffer = sniffedType === 'text/html'
    ? Buffer.from(sanitizeHtml(content), 'utf8')
    : content;

  return {
    buffer: storedBuffer,
    mediaType: sniffedType,
    byteSize: storedBuffer.length,
    contentSha256: crypto.createHash('sha256').update(storedBuffer).digest('hex'),
    metadataPolicy: {
      exifGpsExposed: false,
      activeContent: 'rejected',
      htmlSanitized: sniffedType === 'text/html'
    }
  };
}

export {
  activeOrExecutableMediaTypes,
  decodeStrictBase64,
  inspectBinary,
  normalizeMediaType,
  sanitizeHtml,
  sniffMediaType,
  uploadAllowedMediaTypes,
  urlSnapshotAllowedMediaTypes
};

export default {
  decodeStrictBase64,
  inspectBinary,
  normalizeMediaType,
  sanitizeHtml,
  sniffMediaType
};
