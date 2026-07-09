# Task Evidence Validation

Cerbanimo owns task proof intake, validation, and review handoff for Kamiya and future clients.

Kamiya must not submit tasks through legacy local proof mutation. Clients should draft evidence through `/api/v1/tasks/:taskId/evidence`, preview `tasks.submit_evidence`, confirm the returned action, and hydrate the resulting `submission_validation` automation run.

## Durable Records

- `task_evidence_bundles`: actor-owned draft/preview/submitted evidence bundle snapshots.
- `task_evidence_items`: text proof, URL snapshots, images, documents, artifact references, attestations, and automation reports.
- `task_evidence_blobs`: bounded database-backed blob store for fetched/uploaded evidence.
- `task_validation_results`: immutable validation outcome for a bundle and automation run.
- `task_validation_findings`: requirement-level findings.
- `task_validation_reviews`: manual validation queue when deterministic or semantic validation is uncertain.

## Bundle Statuses

`draft`, `previewed`, `submitted`, `validation_queued`, `validating`, `validation_passed`, `needs_more_evidence`, `manual_review_required`, `validation_failed`, `cancelled`, `superseded`.

## API Flow

1. `GET /api/v1/tasks/:taskId/evidence`
2. `POST /api/v1/tasks/:taskId/evidence/bundles`
3. `PATCH /api/v1/tasks/:taskId/evidence/bundles/:bundleId`
4. `POST /api/v1/tasks/:taskId/evidence/bundles/:bundleId/items`
5. Optional `POST /api/v1/tasks/:taskId/evidence/bundles/:bundleId/fetch-url`
6. `POST /api/v1/tasks/:taskId/evidence/bundles/:bundleId/preview`
7. `POST /api/v1/actions/:id/confirm`
8. `GET /api/v1/automation/runs/:id`

Passing validation moves the task to the existing submitted-for-review state with a canonical `cerbanimo://evidence-bundles/:uuid` proof URI.

It does not approve the task, mark completion, award rewards, release tokens, or activate dependencies.

## Safety

URL evidence is fetched server-side with SSRF protections: no localhost, private networks, metadata endpoints, credentialed URLs, unsafe redirects, SVG, or unexpected media types.

Task automation visibility, evidence visibility, and validation access share `TaskAccessService`. Private task evidence is visible only to assigned actors, task/project owners, admins, explicitly granted actors, or service actors.

Finalization re-checks task authority from durable task state. Client-provided service flags are not trusted.
