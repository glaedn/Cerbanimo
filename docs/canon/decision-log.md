# Decision Log

## Evidence

- Use manifest v2 and canonical digests instead of trusting stored hash strings.
- Reject or manual-review unsupported structured evidence rather than auto-pass.
- Keep shared blob rows content-only; store per-submission provenance on evidence items/fetch records.
- Treat HTML snapshots as inert extracted text by default.

## Review

- Keep validation, peer review, PM review, acceptance, and settlement separate.
- Use deterministic peer selection and conflict checks; do not use an LLM to choose reviewers.
- Use policy timeout events instead of synthetic human decisions.
- Deny contributor self-seal by default.

## Client

- Kamiya renders server-owned `allowedActions`.
- Kamiya does not expose raw blob keys, EXIF/GPS, provider internals, or private evidence metadata.
