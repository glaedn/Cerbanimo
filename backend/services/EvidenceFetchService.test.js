import { describe, expect, it } from 'vitest';
import EvidenceFetchService, { isPrivateIpv4, isPrivateIpv6 } from './EvidenceFetchService.js';

describe('EvidenceFetchService URL safety', () => {
  it('blocks loopback URLs before fetch', async () => {
    await expect(EvidenceFetchService.assertSafeUrl('http://127.0.0.1:3000/secret')).rejects.toMatchObject({
      code: 'EVIDENCE_URL_PRIVATE_NETWORK'
    });
  });

  it('blocks localhost hostnames before fetch', async () => {
    await expect(EvidenceFetchService.assertSafeUrl('http://localhost:3000/secret')).rejects.toMatchObject({
      code: 'EVIDENCE_URL_NOT_ALLOWED'
    });
  });

  it('classifies documentation, benchmark, and mapped private addresses as reserved', () => {
    expect(isPrivateIpv4('192.0.2.10')).toBe(true);
    expect(isPrivateIpv4('198.18.0.1')).toBe(true);
    expect(isPrivateIpv6('::ffff:172.16.0.1')).toBe(true);
    expect(isPrivateIpv6('2001:db8::1')).toBe(true);
  });
});
