# Sentinel's Journal 🛡️

Only entries for critical security learnings specific to the project are documented here.

## 2025-03-04 - [Unauthenticated Resume Text Exposure via Public Profile Endpoint]
**Vulnerability:** The `/profile/public/:userId` route, which has intentionally omitted authentication/authorization checks to allow public profile views, retrieved and served the `resume_text` database column. This exposed sensitive volunteer PII (Personally Identifiable Information) directly in the raw API response to anyone without authentication.
**Learning:** This gap existed because the SQL query selected all fields including `resume_text` without separating purely private profile elements from shared public identification info.
**Prevention:** Always use strict whitelist queries for unauthenticated/public endpoints to ensure only intended public fields are retrieved, rather than selecting the entire user row or private fields like resume texts.
