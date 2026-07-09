import { describe, expect, it } from 'vitest';
import EvidenceFetchService, { EvidenceFetchService as EvidenceFetchServiceClass, isPrivateIpv4, isPrivateIpv6 } from './EvidenceFetchService.js';

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

  it('uses the validated pinned address instead of a second ordinary lookup', async () => {
    const resolver = {
      calls: 0,
      async resolvePublicAddresses() {
        this.calls += 1;
        return [{ address: '93.184.216.34', family: 4 }];
      }
    };
    const transport = {
      async get(parsed, { pinnedAddress }) {
        expect(parsed.hostname).toBe('example.com');
        expect(pinnedAddress.address).toBe('93.184.216.34');
        return {
          ok: true,
          status: 200,
          headers: new Map([
            ['content-type', 'text/plain'],
            ['content-length', '5']
          ]),
          body: [Buffer.from('hello')]
        };
      }
    };
    const client = {
      async query(sql, params) {
        if (String(sql).includes('INSERT INTO task_evidence_blobs')) {
          return { rows: [{ storage_key: 'cerbanimo://evidence-blobs/sha256/mock', content_sha256: 'mock', media_type: 'text/plain', byte_size: 5 }] };
        }
        return { rows: [] };
      }
    };
    const service = new EvidenceFetchServiceClass({ resolver, transport });

    const snapshot = await service.fetchSnapshot('https://example.com/proof.txt', { client });

    expect(snapshot.pinnedAddress).toBe('93.184.216.34');
    expect(resolver.calls).toBe(1);
  });
});
