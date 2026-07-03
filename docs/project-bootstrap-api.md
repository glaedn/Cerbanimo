# Project Bootstrap API

`/api/v1` is the canonical external API for Kamiya and future third-party clients. `/platform` remains compatibility-only and returns deprecation headers.

## Function

Use `projects.bootstrap` through the persisted action queue:

1. `POST /api/v1/actions/preview`
2. `POST /api/v1/actions/{id}/confirm`
3. `GET /api/v1/actions/{id}` until the workflow reaches a terminal state
4. Optional operator/user retry: `POST /api/v1/actions/{id}/retry`

Required scopes:

- `actions:write` to preview and confirm
- `actions:read` to poll action detail
- `projects:write` to preview `projects.bootstrap`
- `actions:service` for explicit service-owned cross-actor access. Normal Auth0 users do not receive this scope.

Required input:

```json
{
  "functionName": "projects.bootstrap",
  "arguments": {
    "name": "Watertown Weekly MtG Meetup",
    "description": "Create a weekly local Magic: The Gathering meetup in Watertown.",
    "outcomeStatement": "Build a local community around weekly MtG meetups.",
    "dueDate": "2026-07-30T00:00:00.000Z",
    "tags": ["community", "games"],
    "generationMode": "plan_then_tasks"
  }
}
```

## Action Detail

`GET /api/v1/actions/{id}` returns the action, workflow run, workflow steps, created project, all project tasks, active tasks, terminal state, result, and safe error details. It never returns provider prompts, raw tokens, or secrets.

Kamiya should poll this endpoint after confirmation. If no project/tasks appear within 30 seconds, Kamiya can show a retry affordance that confirms a new preview with the same project input.

`GET /api/v1/actions` is always actor-bounded. Normal users only list rows where `actor_user_id` equals the authenticated user. Service actors require an API token with `actions:service`; they still default to their own actor's actions and may target another actor only by passing an explicit `actorUserId` filter. Missing actor context returns an empty list, never all actions.

## State Machine

Workflow states:

- `queued`: confirmed action has a durable workflow and is waiting for pg-boss.
- `running`: one worker owns a valid lease.
- `retry_wait`: the last failure was retryable and pg-boss backoff may deliver the job again.
- `blocked`: non-retryable input, permission, or graph validation failure.
- `failed`: retry limit exhausted or non-retryable runtime failure.
- `completed`: project, task graph, activation, and action finalization succeeded.
- `cancelled`: action/workflow was cancelled before project persistence.

## Invariants

- Action invariant: a project bootstrap starts from one persisted action owned by one actor.
- Authorization invariant: possession of an action ID or UUID is never sufficient authority.
- Workflow invariant: a bootstrap action has at most one `projects.bootstrap` workflow.
- Project invariant: a bootstrap workflow has at most one related project.
- Step invariant: a workflow has at most one row for each named bootstrap step.
- Task-graph invariant: generated tasks and dependency mappings commit atomically.
- Cancellation invariant: a cancelled, uncommitted workflow cannot create durable project state.
- Retry invariant: retries reuse durable completed-step results and already-persisted entities.

## Retry

`POST /api/v1/actions/{id}/retry` requires `actions:write`, enforces the same ownership/service policy as confirm and cancel, avoids creating a second workflow, records `workflow.requeued`, and returns `202`.

Manual retry is eligible only from workflow states:

- `retry_wait`
- `blocked`
- `failed`

Manual retry rejects `queued`, `running`, `completed`, and `cancelled` with `409`. It never clears a live worker lease. When retrying a failed action, Cerbanimo resets the action to `confirmed` and replaces the current execution result with a small queued retry status so hydration is nonterminal while the retry runs. The prior failure remains in immutable action events and workflow error history.

Automatic retries are bounded to 3 worker attempts with pg-boss exponential backoff. Retryable provider, queue, and transient persistence failures move the workflow to `retry_wait`. Non-retryable input, permission, and graph failures move to `blocked` or `failed` and are not retried automatically.

If queue send fails after a manual retry transaction, the workflow is marked `blocked`, the action is marked `failed` with `BOOTSTRAP_QUEUE_FAILED`, `workflow.queue_failed` is recorded, and a later retry can safely requeue the same workflow.

## Cancellation

Cancelling a previewed action remains immediate. Cancelling a confirmed bootstrap before project persistence marks the action and workflow `cancelled`, cancels pending/running steps, records `workflow.cancelled`, and prevents worker side effects. After `related_project_id` exists or completion has occurred, cancellation is rejected with `409` instead of pretending durable project state was not created.

Cancellation and persistence use a deterministic lock order: action row first, workflow row second. The persistence transaction locks both rows, verifies the action is not cancelled, verifies the workflow is `running`, verifies the current worker still owns the claim token, and writes the project plus both `related_project_id` links before commit. If cancellation obtains the locks first, persistence aborts with `BOOTSTRAP_CANCELLED`; if persistence obtains them first, cancellation waits and then returns `409`.

## Worker Behavior

The confirmed action creates a `workflow_runs` row and enqueues pg-boss queue `project-bootstrap` with only:

```json
{ "workflowRunId": "..." }
```

The worker executes these steps:

- `validateInput`
- `generateProjectPlan`
- `generateTaskGraph`
- `validateTaskGraph`
- `persistProjectGraph`
- `activateRootTasks`
- `finalizeAction`

Project and task graph persistence is atomic. If graph validation or persistence fails, no partial task graph is saved.

Each worker attempt must atomically claim the workflow. Duplicate pg-boss delivery while a lease is valid records `workflow.claim_rejected` and performs no side effects. Expired leases can be reclaimed.

The active `claim_token` is an execution fence. The worker renews the lease before each side-effecting stage, verifies claim ownership after model calls, requires the claim token during persistence, and guards step completion, workflow updates, and finalization with the same token. A stale worker that loses its claim records `workflow.claim_lost` and stops without persisting or overwriting newer results.

## Legacy Compatibility

`POST /projects/auto-generate` now delegates to the same bootstrap service for existing projects. It returns stable error codes, `X-Request-Id`, all tasks, and active tasks.

## Environment

- `GEMINI_API_KEY`: Gemini API key.
- `GEMINI_PROJECT_PLAN_MODEL`: model used for project plan text generation.
- `GEMINI_TASK_GRAPH_MODEL`: model used for task graph JSON generation.
- `GEMINI_REQUEST_TIMEOUT_MS`: per-request timeout for Gemini calls.
- `KAMIYA_ALLOWED_ORIGINS`: comma-separated allowed Kamiya origins for auth bridge/API CORS policy.
