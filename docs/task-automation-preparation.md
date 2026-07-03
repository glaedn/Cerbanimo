# Task Automation Preparation

Cerbanimo owns task automation preparation records for Kamiya and future clients.
Preparation is durable platform state; client state is only a convenience cache.

## Tables

`task_automation_preparations` stores one active actor-owned preparation per task and capability.

Canonical statuses:

- `draft`
- `invalid`
- `ready`
- `previewed`
- `consumed`
- `cancelled`

`automation_runs` now links to preparations through `preparation_id` and includes attempt/claim/lease fields for worker fencing.

## APIs

Canonical `/api/v1` routes:

- `GET /api/v1/tasks/:taskId/automation`
- `POST /api/v1/tasks/:taskId/automation/preparations`
- `GET /api/v1/tasks/:taskId/automation/preparations/:preparationId`
- `PATCH /api/v1/tasks/:taskId/automation/preparations/:preparationId`
- `POST /api/v1/tasks/:taskId/automation/preparations/:preparationId/validate`
- `POST /api/v1/tasks/:taskId/automation/preparations/:preparationId/preview`
- `POST /api/v1/tasks/:taskId/automation/preparations/:preparationId/cancel`

Preview uses the existing action queue with function name `tasks.run_automation`.

## Invariants

- preparations are actor-owned;
- task access is checked before hydration or mutation;
- schema snapshots are stored with the preparation;
- values are server-validated and sanitized;
- raw sensitive values are rejected unless a future secure storage facility exists;
- one preparation creates at most one active preview action;
- consumed preparations cannot execute twice;
- cancellation is idempotent.

## Capability Resolution

`TaskAutomationCapabilityResolver` separates classification from execution availability. It returns required, available, and missing capabilities plus actor authorization and blocker reasons.

Supported reasons include `CAPABILITY_NOT_REGISTERED`, `EXECUTOR_NOT_CONFIGURED`, `ACTOR_SCOPE_MISSING`, `INPUTS_INCOMPLETE`, `TASK_POLICY_BLOCKED`, and `PRODUCTION_SANDBOX_REQUIRED`.

