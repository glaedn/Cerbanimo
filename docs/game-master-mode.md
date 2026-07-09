# Game Master Mode API

Game Master Mode is a presentation and orchestration domain for clients such as Kamiya. Cerbanimo remains the source of truth for project state, task status, evidence, review, settlement, rewards, and notifications.

## Durable Tables

- `user_narrative_preferences`
- `project_quest_profiles`
- `project_narrative_settings`
- `project_party_settings`
- `project_invites`
- `project_character_callings`
- `project_narrative_events`

Invite rows store `token_hash` and a short hint only. Raw invite tokens are returned once by the create route.

## API Surface

```text
GET   /api/v1/me/narrative-preferences
PATCH /api/v1/me/narrative-preferences
GET   /api/v1/projects/:projectId/quest-profile
GET   /api/v1/projects/:projectId/quest-context
PATCH /api/v1/projects/:projectId/narrative-settings
POST  /api/v1/projects/:projectId/quest-profile/preview-update
GET   /api/v1/projects/:projectId/party
POST  /api/v1/projects/:projectId/invites
POST  /api/v1/projects/:projectId/invites/:inviteId/revoke
GET   /api/v1/project-invites/:token/preview
POST  /api/v1/project-invites/:token/redeem
POST  /api/v1/projects/:projectId/launch/preview
GET   /api/v1/projects/:projectId/calling
PATCH /api/v1/projects/:projectId/calling
GET   /api/v1/projects/:projectId/chronicle
```

## Capability Names

- `projects.create_invite`
- `projects.revoke_invite`
- `projects.join_from_invite`
- `projects.launch_quest`
- `projects.update_quest_profile`
- `projects.update_narrative_settings`
- `projects.update_calling`

## Boundaries

Game Master launch creates a narrative event only after action confirmation. It does not complete tasks, award XP or tokens, activate dependent tasks, publish stories, or alter evidence/review state.

Quest context responses include safe project, party, task, review, and chronicle summaries. They do not include raw evidence content or private evidence metadata.
