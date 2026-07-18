# Core World v1 settlement audit

Cerbanimo is the sole authority for the Core World v1 task lifecycle. The cross-repository scope matrix and end-to-end assertions are maintained in Kamiya's `docs/core-world-v1-audit.md`.

## Settlement invariants

- One acceptance record maps to at most one settlement and one completion record.
- A settlement proceeds only while acceptance is `pending`, review is `accepted_pending_settlement`, and the task is not terminal.
- Preview, retry, cancel, task lookup, review lookup, and hydration enforce task access inside the service layer.
- Contributor allocation is deterministic, ordered, integer-only, and sum-conserving for equal and leader-weighted modes.
- Reward/XP amounts are safe integers in `[0, 1_000_000]`; invalid policy blocks before effects.
- Completion, reward, XP, dependency, project, chronicle, event, and outbox mutations share one transaction.
- An injected failure at every material stage rolls everything back. A simulated crash after commit leaves one durable result; replay adds no effects or attempts.
- Outbox delivery is idempotent by event key and independent of ledger commitment.

Application validation is backed by constraints on nonnegative attempts, integer bounded rewards/XP, XP arithmetic, and valid level ranges.

## Maintained default inventory

`npm test` runs:

1. generated-file guard;
2. frontend Vitest inventory (`src/**/*.{test,spec}.{js,jsx,ts,tsx}`);
3. backend Vitest inventory;
4. deterministic evidence evaluation;
5. isolated fresh/upgrade schema smoke;
6. canonical contract smoke;
7. live PostgreSQL review and settlement races.

The previous 43 frontend failures were obsolete expectations in six maintained UI suites, now migrated. Backend schema tests remain in the backend runner. The retired `tests/verify_marketplace.spec.js` was a screenshot-only, platform-specific script with no assertions and was not a maintained product test.

## Security boundary

API scopes are necessary but not sufficient: task/project relationship checks guard private task, evidence, settlement, and event data. URL evidence blocks loopback, private, reserved, documentation, and redirect-to-private targets before sanitization and storage. Every v1 response carries the exact contract version and digest so consumers fail closed on drift.

Known production work outside this audit: user-facing OAuth/session provisioning for Resonera, policy administration UI, retention/governance controls, production observability, and multiplayer/channel authorization.
