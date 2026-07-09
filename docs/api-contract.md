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

## Game Master Mode

Game Master Mode exposes quest presentation state to Kamiya without moving project business logic into the client.

- Preferences: `GET/PATCH /api/v1/me/narrative-preferences`
- Quest profile: `GET /api/v1/projects/:projectId/quest-profile`
- Quest context: `GET /api/v1/projects/:projectId/quest-context`
- Narrative settings: `PATCH /api/v1/projects/:projectId/narrative-settings`
- Quest profile preview: `POST /api/v1/projects/:projectId/quest-profile/preview-update`
- Party: `GET /api/v1/projects/:projectId/party`
- Invites: `POST /api/v1/projects/:projectId/invites`
- Revoke invite: `POST /api/v1/projects/:projectId/invites/:inviteId/revoke`
- Invite preview/redeem: `GET/POST /api/v1/project-invites/:token/{preview,redeem}`
- Launch preview: `POST /api/v1/projects/:projectId/launch/preview`
- Calling: `GET/PATCH /api/v1/projects/:projectId/calling`
- Chronicle: `GET /api/v1/projects/:projectId/chronicle`

Canonical action names:

- `projects.create_invite`
- `projects.revoke_invite`
- `projects.join_from_invite`
- `projects.launch_quest`
- `projects.update_quest_profile`
- `projects.update_narrative_settings`
- `projects.update_calling`

Raw invite tokens are returned once and are stored only as hashes in Cerbanimo.
