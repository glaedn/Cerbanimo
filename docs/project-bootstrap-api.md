# Project Bootstrap API

`/api/v1` is the canonical external API for Kamiya and future third-party clients. `/platform` remains compatibility-only and returns deprecation headers.

## Function

Use `projects.bootstrap` through the persisted action queue:

1. `POST /api/v1/actions/preview`
2. `POST /api/v1/actions/{id}/confirm`
3. `GET /api/v1/actions/{id}` until the workflow reaches a terminal state

Required scopes:

- `actions:write` to preview and confirm
- `actions:read` to poll action detail
- `projects:write` to preview `projects.bootstrap`

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

## Legacy Compatibility

`POST /projects/auto-generate` now delegates to the same bootstrap service for existing projects. It returns stable error codes, `X-Request-Id`, all tasks, and active tasks.

## Environment

- `GEMINI_API_KEY`: Gemini API key.
- `GEMINI_PROJECT_PLAN_MODEL`: model used for project plan text generation.
- `GEMINI_TASK_GRAPH_MODEL`: model used for task graph JSON generation.
- `GEMINI_REQUEST_TIMEOUT_MS`: per-request timeout for Gemini calls.
- `KAMIYA_ALLOWED_ORIGINS`: comma-separated allowed Kamiya origins for auth bridge/API CORS policy.
