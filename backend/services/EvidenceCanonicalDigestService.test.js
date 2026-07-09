import { describe, expect, it } from 'vitest';
import EvidenceCanonicalDigestService, { MANIFEST_VERSION } from './EvidenceCanonicalDigestService.js';

describe('EvidenceCanonicalDigestService', () => {
  const mockClient = {
    async query() {
      return { rows: [] };
    }
  };

  it('builds manifest v2 with content and provenance digests', async () => {
    const bundle = { id: 10, task_id: 20, version: 2, reflection: 'Finished.' };
    const items = [{
      id: 1,
      task_id: 20,
      evidence_type: 'text',
      requirement_ids: ['handoff'],
      title: 'Handoff note',
      text_content: 'The work is done.',
      metadata: {}
    }];

    const { manifest, itemDigests } = await EvidenceCanonicalDigestService.buildManifest({
      client: mockClient,
      bundle,
      items,
      task: { id: 20 },
      requirements: [{ requirementId: 'handoff', description: 'Handoff', acceptedEvidenceTypes: ['text'], checks: ['reflection_present'] }],
      validationPolicySnapshot: { policyVersion: 'submission-validation-v2' }
    });

    expect(manifest.manifestVersion).toBe(MANIFEST_VERSION);
    expect(manifest.items[0].contentSha256).toBe(itemDigests[0].digest.contentSha256);
    expect(manifest.items[0].provenanceSha256).toBe(itemDigests[0].digest.provenanceSha256);
    expect(manifest.items[0].combinedSha256).toBe(itemDigests[0].digest.combinedSha256);
  });

  it('changes the content digest when text content is tampered with', async () => {
    const bundle = { id: 10, task_id: 20, version: 2, reflection: 'Finished.' };
    const base = {
      id: 1,
      task_id: 20,
      evidence_type: 'text',
      requirement_ids: ['handoff'],
      title: 'Handoff note',
      metadata: {}
    };

    const first = await EvidenceCanonicalDigestService.digestItem({
      client: mockClient,
      bundle,
      task: { id: 20 },
      item: { ...base, text_content: 'The work is done.' }
    });
    const second = await EvidenceCanonicalDigestService.digestItem({
      client: mockClient,
      bundle,
      task: { id: 20 },
      item: { ...base, text_content: 'The work is not done.' }
    });

    expect(second.contentSha256).not.toBe(first.contentSha256);
    expect(second.combinedSha256).not.toBe(first.combinedSha256);
  });
});
