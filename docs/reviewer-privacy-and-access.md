# Reviewer Privacy and Access

Raw evidence access is scoped by assignment and stage.

## Summary Access

Public viewers, ordinary project members, and unrelated authenticated users may see safe summaries only:

- bundle status;
- item count;
- validation status;
- requirement coverage summary;
- review status.

## Content Access

Raw frozen evidence may be viewed by:

- the bundle owner;
- project owner or scoped project manager;
- accepted validation reviewer;
- accepted peer reviewer;
- accepted PM reviewer;
- admin;
- narrow service actor.

Access starts after assignment acceptance and ends on decline, recusal, cancellation, or round closure. All raw reads emit audit events containing actor, task, bundle, reason, policy basis, and timestamp.
