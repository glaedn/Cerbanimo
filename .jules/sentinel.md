# Sentinel Security Journal 🛡️

## 2025-03-09 - Public Profile PII Leak via resume_text
**Vulnerability:** The public profile route (`GET /profile/public/:userId`) selected and exposed the sensitive Personally Identifiable Information (PII) field `resume_text` from the database. This allowed unauthenticated users to access candidate/volunteer resume content, leaking personal data such as addresses, phone numbers, and detailed employment histories.
**Learning:** When adding or extending profile features (like AI resume analysis), sensitive fields are sometimes queried globally or added to public endpoints by default or accident without checking authentication and authorization constraints.
**Prevention:** Avoid wildcard or overly permissive `SELECT` statements on public-facing endpoints. Explicitly enumerate only safe, public-facing user attributes (e.g., `id`, `username`, `profile_picture`, `skills`, `interests`, `badges`) in public SQL queries. Add automated route tests to explicitly assert that sensitive fields (like `resume_text` or hashed passwords) are absent from the response.
