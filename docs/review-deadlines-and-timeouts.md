# Review Deadlines and Timeouts

Deadline jobs are durable and idempotent. Payloads contain IDs only.

Queues:

- `task-review-peer-deadline`
- `task-review-pm-deadline`
- `task-review-finalize`
- `task-review-assignment-expiry`

Peer deadline default: 6 hours after peer review opens. PM deadline default: 18 hours after PM review opens.

Timeout advancement never creates fake human decisions. It writes a policy event and sets the gate method to `policy_timeout`.

Timeout is blocked by rejection, request changes, invalid evidence, changed task/project relationship, high-risk policy, or a stale job. Decisions, deadlines, and finalization use a shared lock order to avoid duplicate gate and acceptance events.
