# Settlement and world-state contract

`TaskSettlementService` is the only completion authority for the integrated game overlay.

An accepted review queues a replay-safe settlement. One PostgreSQL transaction locks the acceptance, review round, settlement, and task; records contributor/reviewer rewards and skill XP; creates the completion record; marks the task complete; activates dependencies; evaluates project completion; writes the narrative beat; and stages domain events in an outbox. Retries read the durable result instead of repeating effects.

The public API exposes:

- `GET /api/v1/projects/:projectId/world-state`
- `GET /api/v1/events?projectId=:projectId&after=:cursor`
- `GET /api/v1/tasks/:taskId/settlement`
- `POST /api/v1/tasks/:taskId/settlement/preview`
- `GET /api/v1/settlements/:settlementId`
- `POST /api/v1/settlements/:settlementId/retry`
- `POST /api/v1/settlements/:settlementId/cancel`

The world response contains canonical tasks, actual IDs, allowed actions, reward previews, settlement state, party/chronicle data, resources, a domain-event cursor, and server feature flags. Clients may cache it for offline reading but may not derive rewards or unlocks from it locally.

The evidence bundle also carries `encounter_context`: NPC interaction may be off, private, split-party, or shared-party, and the reward policy may be equal or leader-weighted. The server normalizes this metadata and the settlement remains responsible for the final allocation.
