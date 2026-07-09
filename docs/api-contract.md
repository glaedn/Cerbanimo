# Cerbanimo API Contract

Kamiya and future clients must use `/api/v1` for project bootstrap, evidence intake, automation runs, and human review. Business logic remains server-side.

## Project Bootstrap

- Preview: `POST /api/v1/actions/preview`
- Confirm: `POST /api/v1/actions/:id/confirm`
- Hydrate: `GET /api/v1/actions/:id`
- Retry: `POST /api/v1/actions/:id/retry`

The `projects.bootstrap` action owns project plan generation, task graph persistence, and root task activation.

## Evidence

- Read context: `GET /api/v1/tasks/:taskId/evidence`
- Create draft: `POST /api/v1/tasks/:taskId/evidence/bundles`
- Add item: `POST /api/v1/tasks/:taskId/evidence/bundles/:bundleId/items`
- Fetch URL: `POST /api/v1/tasks/:taskId/evidence/bundles/:bundleId/fetch-url`
- Preview/freeze: `POST /api/v1/tasks/:taskId/evidence/bundles/:bundleId/preview`
- Confirm action: `POST /api/v1/actions/:id/confirm`
- Supersede: `POST /api/v1/tasks/:taskId/evidence/bundles/:bundleId/supersede`

Every modifying route rechecks actor ownership and returns server-owned `allowedActions`.

## Review

- Review context: `GET /api/v1/tasks/:taskId/review`
- Contributor status: `GET /api/v1/tasks/:taskId/review-status`
- Queue: `GET /api/v1/reviews/assignments`
- Assignment: `GET /api/v1/reviews/assignments/:assignmentId`
- Assignment actions: `POST /api/v1/reviews/assignments/:assignmentId/{accept,decline,recuse}`
- Manual validation decision: `POST /api/v1/validation-reviews/:reviewId/decision`
- Peer decision: `POST /api/v1/review-rounds/:roundId/peer-decisions`
- PM decision: `POST /api/v1/review-rounds/:roundId/pm-decisions`

Clients must not infer permissions from role names or statuses.
