# Evidence Manifest v2

Manifest v2 is the canonical frozen evidence snapshot used by validation and review.

```json
{
  "manifestVersion": "evidence-manifest-v2",
  "bundleId": 123,
  "version": 2,
  "taskId": 456,
  "requirementSnapshotHash": "...",
  "validationPolicyHash": "...",
  "reflectionSha256": "...",
  "items": [
    {
      "itemId": 1,
      "evidenceType": "image",
      "contentSha256": "...",
      "provenanceSha256": "...",
      "combinedSha256": "...",
      "requirementIds": ["handoff"]
    }
  ],
  "manifestSha256": "..."
}
```

`EvidenceCanonicalDigestService` recomputes content and provenance from authoritative source rows, sanitized bytes, artifact resolvers, and structured automation reports. Stored hash strings are not trusted by themselves.

Legacy v1 manifests remain historical. Unconfirmed v1 evidence requires a new preview, and queued v1 validation routes to manual review rather than auto-pass.
