# Sentinel Security Journal

## 2025-03-09 - [Public Profile PII Exposure]
**Vulnerability:** The public profile route (`GET /public/:userId`) queried and returned the user's `resume_text` without explicit filter or consent, potentially exposing sensitive PII to unauthenticated clients.
**Learning:** Even though memory notes specified "the unauthenticated route GET /profile/public/:userId explicitly excludes resume_text", the query string still contained `resume_text`.
**Prevention:** Always verify field selection on unauthenticated/public endpoints to ensure strict compliance with PII privacy rules.
