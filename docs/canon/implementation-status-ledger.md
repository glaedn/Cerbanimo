# Implementation Status Ledger

## Implemented in Packet 007B/008 Branch

- Canonical evidence digest service.
- Manifest v2 freezing and verification.
- Image sanitizer integration.
- Inert HTML snapshot extraction.
- Content/provenance separation for blobs.
- Pinned evidence network resolver/transport.
- Evidence evaluation command with zero false passes.
- Review schema, authorization, policy, assignment, decision, event, and acceptance services.
- Review API routes for queue, assignment, validation, peer, PM, and contributor status.

## Partially Implemented or Environment-Dependent

- Real PostgreSQL interleaving command exists but skipped locally without `DATABASE_URL`.
- Durable deadline handlers are implemented in service methods; production queue worker registration should be verified in deployment wiring.
- Full browser review journeys are represented by existing real-stack golden flows plus client review command tests, not a full manual reviewer UI journey suite yet.
