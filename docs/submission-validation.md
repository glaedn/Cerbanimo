# Submission Validation

Validation verifies integrity before requirement satisfaction.

## Order

1. Rebuild evidence manifest v2.
2. Recompute content, provenance, and combined hashes.
3. Read every validation blob and verify the stored content hash.
4. Re-resolve artifact references through the authoritative resolver.
5. Evaluate deterministic checks.
6. Invoke semantic review only when the canonical semantic-review enum allows it.

Integrity failures stop the pipeline before any model provider call.

## Outcomes

- `validation_passed`: proof may bridge to review.
- `needs_more_evidence`: contributor may create a superseding bundle.
- `manual_review_required`: an eligible validation reviewer must decide.
- `validation_failed`: structural, integrity, authorization, or tampering failure.

Passing validation submits the task for review but does not complete the task or award anything.
