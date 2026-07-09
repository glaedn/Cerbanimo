import { describe, expect, it } from 'vitest';
import { decodeStrictBase64, inspectBinary } from './EvidenceBinaryInspectionService.js';

describe('EvidenceBinaryInspectionService', () => {
  it('rejects executable bytes labelled as a PNG', () => {
    const buffer = Buffer.from('MZ fake executable');

    expect(() => inspectBinary({
      buffer,
      claimedMediaType: 'image/png',
      sourceKind: 'upload'
    })).toThrow(/not allowed/);
  });

  it('rejects SVG uploads even when they are text', () => {
    const buffer = Buffer.from('<svg><script>alert(1)</script></svg>', 'utf8');

    expect(() => inspectBinary({ buffer, claimedMediaType: 'image/svg+xml', sourceKind: 'upload' })).toThrow(/not allowed/);
  });

  it('rejects malformed base64 padding', () => {
    expect(() => decodeStrictBase64('abc')).toThrow(/strict base64/);
  });

  it('rejects MIME mismatches', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

    expect(() => inspectBinary({
      buffer: png,
      claimedMediaType: 'application/pdf',
      sourceKind: 'upload'
    })).toThrow(/mismatch/);
  });
});
