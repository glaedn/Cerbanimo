import { describe, expect, it } from 'vitest';
import { decodeStrictBase64, inspectBinary } from './EvidenceBinaryInspectionService.js';

describe('EvidenceBinaryInspectionService', () => {
  it('rejects executable bytes labelled as a PNG', async () => {
    const buffer = Buffer.from('MZ fake executable');

    await expect(inspectBinary({
      buffer,
      claimedMediaType: 'image/png',
      sourceKind: 'upload'
    })).rejects.toThrow(/not allowed/);
  });

  it('rejects SVG uploads even when they are text', async () => {
    const buffer = Buffer.from('<svg><script>alert(1)</script></svg>', 'utf8');

    await expect(inspectBinary({ buffer, claimedMediaType: 'image/svg+xml', sourceKind: 'upload' })).rejects.toThrow(/not allowed/);
  });

  it('rejects malformed base64 padding', () => {
    expect(() => decodeStrictBase64('abc')).toThrow(/strict base64/);
  });

  it('rejects MIME mismatches', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

    await expect(inspectBinary({
      buffer: png,
      claimedMediaType: 'application/pdf',
      sourceKind: 'upload'
    })).rejects.toThrow(/mismatch/);
  });

  it('stores HTML snapshots as inert plain text', async () => {
    const inspected = await inspectBinary({
      buffer: Buffer.from('<html><head><title>Hello</title><script>evil()</script></head><body><h1>Safe</h1><iframe src="/x"></iframe></body></html>'),
      claimedMediaType: 'text/html',
      sourceKind: 'url_snapshot'
    });

    expect(inspected.mediaType).toBe('text/plain');
    expect(inspected.buffer.toString('utf8')).toContain('Title: Hello');
    expect(inspected.buffer.toString('utf8')).toContain('Safe');
    expect(inspected.buffer.toString('utf8')).not.toContain('evil');
    expect(inspected.metadataPolicy.htmlSanitized).toBe(true);
  });

  it('normalizes image evidence to metadata-stripped PNG bytes', async () => {
    const { default: sharp } = await import('sharp');
    const jpeg = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: { r: 10, g: 40, b: 90 }
      }
    }).jpeg().withMetadata().toBuffer();

    const inspected = await inspectBinary({
      buffer: jpeg,
      claimedMediaType: 'image/jpeg',
      sourceKind: 'upload'
    });

    expect(inspected.mediaType).toBe('image/png');
    expect(inspected.metadataPolicy.metadataStripped).toBe(true);
    expect(inspected.metadataPolicy.gpsRemoved).toBe(true);
    expect(inspected.metadataPolicy.originalRetained).toBe(false);
  });
});
