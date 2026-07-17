# Cerbanimo core integration test plan

Packets 0–5 ship as one integrated slice. Unit and contract checks are written during implementation, but the stack is exercised only after Cerbanimo, Kamiya, and Resonera are assembled.

## Authoritative golden path

1. Seed one project, accepted task policy, dependencies, contributor party, three peer reviewers, one PM, reward policy, and skill XP policy.
2. Load the same world state in Resonera and Kamiya.
3. Create an evidence bundle with shared-party encounter context, text evidence, and a fetched URL artifact.
4. Freeze the manifest through the action preview and confirm it once.
5. Pass deterministic validation, peer quorum, and PM review.
6. Race three settlement worker claims and repeat the client request.
7. Assert one task settlement, completion record, reward per eligible participant, skill XP event, dependency transition, story event, and each domain-event idempotency key.
8. Assert the acceptance record is settled only after the transaction commits and all four outbox records dispatch without duplicating effects.
9. Restart clients/workers; read the same result in Cerbanimo, Kamiya, and Resonera.

## Failure matrix

- Missing reward policy produces `SETTLEMENT_REWARD_POLICY_MISSING` with no partial ledger effects.
- Invalid acceptance/review status cannot settle.
- A dead worker lease is discovered by the sweep and safely reclaimed.
- An outbox delivery retry appends no duplicate domain event.
- Offline Resonera may edit drafts/cache only; evidence submission, currency, XP, and settlement fail closed.
- A second confirm, worker claim, or settlement preview returns the durable result.

## Commands used by the combined run

- Root quality gates: `npm test`
- Contract snapshot: `npm run test:contract`
- PostgreSQL races: `npm run test:db-races`
- Kamiya real stack: `npm run test:e2e:settlement:real`
- Resonera Expo smoke: `pnpm verify`
