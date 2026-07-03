# Run Quality Checks Automation

`github.run_quality_checks` is Cerbanimo's first task-owned executable automation capability for Kamiya.

## Inputs

The canonical preparation schema requires:

```json
{
  "repository": "owner/name",
  "ref": "main",
  "checkProfile": "node_standard",
  "approval": true
}
```

The worker never accepts arbitrary shell commands from the browser.

## Execution

Confirmed `tasks.run_automation` actions create an `automation_runs` row and enqueue `automation-execution` with durable identifiers only:

```json
{
  "automationRunId": 123
}
```

The worker claims runs with a token/lease, revalidates the preparation, resolves executor availability, writes bounded logs, produces a structured report, and finalizes the action.

## Executor Policy

The deterministic executor is E2E-only and allowed only when:

- `NODE_ENV=test`;
- `CERBANIMO_E2E_MODE=true`;
- the database name contains `e2e` or `test`;
- the database target is not production-like.

Production returns `PRODUCTION_SANDBOX_REQUIRED` until a real sandbox executor is configured.

## Task Mapping

`checks_passed` attaches the report URI to the task and moves it to `submitted` for normal review. It does not award rewards or complete the task.

`checks_failed` is a completed automation result, not a worker failure, and does not submit the task as successful completion.

`blocked`, `cancelled`, and `executor_failed` keep the task from being falsely submitted.

