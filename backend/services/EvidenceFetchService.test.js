import { describe, expect, it } from 'vitest';
import EvidenceFetchService from './EvidenceFetchService.js';

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
});
