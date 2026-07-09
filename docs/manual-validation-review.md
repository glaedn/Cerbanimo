# Manual Validation Review

Manual validation is used when deterministic and semantic validation cannot safely pass or fail.

Eligible reviewers include explicit project validation reviewers, scoped project owners/managers who are not the contributor, admins, and queue service actors for administration only. The contributor, evidence author, and automation actor cannot judge their own uncertain submission.

Actions:

- `accept_validation`: accepts the validation result by human review and starts peer review.
- `request_more_evidence`: returns the bundle without starting peer deadlines.
- `reject_invalid_evidence`: rejects structurally invalid, unauthorized, fraudulent, tampered, or mismatched evidence.
- `recuse`: closes the assignment and attempts recovery.

Decisions are immutable. Corrections create superseding decision events.
