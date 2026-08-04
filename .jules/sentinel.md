## 2025-05-18 - Prevent Exposure of Sensitive User Resumes on Unauthenticated Public Profiles
**Vulnerability:** Unauthenticated clients could query `GET /profile/public/:userId` and fetch user sensitive resume data (`resume_text`) which can contain sensitive Personally Identifiable Information (PII) like phone numbers, addresses, and full career histories.
**Learning:** Selecting all fields or forgetting to explicitly filter out administrative / private user fields on unauthenticated routes leads directly to data exposure (PII leakage).
**Prevention:** Always design DB schemas or API projections with separate data structures or explicitly list only safe, public-facing database columns inside SQL/query expressions for unauthenticated public routes.
