# Cerbanimo Platform Requirements for Kamiya

Cerbanimo stores durable reality. Kamiya translates user intent into API-backed actions.

## Required Platform Guarantees

- All mutating actions are previewed, confirmed, executed, logged, and hydrated through Cerbanimo APIs.
- Evidence bundles are actor-owned drafts until preview freezes a manifest.
- Reviewers only receive scoped read access after accepting an assignment.
- Validation, review, acceptance, completion settlement, rewards, and dependency activation are separate stages.
- Accepted review rounds stop at `accepted_pending_settlement`; Packet 009 owns settlement.

## Environment Flags

- `CERBANIMO_HUMAN_REVIEW_ENABLED`: enables Packet 008 review routes and services.
- `CERBANIMO_E2E_MODE`: allows deterministic test-only automation executors.
- `DATABASE_URL`: enables real PostgreSQL migration, race, and worker checks.

## Client Rule

Kamiya must display server-owned `allowedActions` and must never show raw evidence metadata such as blob keys, EXIF/GPS fields, provider internals, or private hashes.
