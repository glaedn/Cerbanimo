# Sentinel's Security Journal 🛡️

## 2026-07-29 - Public Profile PII Leakage
**Vulnerability:** The public, unauthenticated profile endpoint `GET /profile/public/:userId` was fetching and returning the user's sensitive PII field `resume_text`. This allowed any unauthenticated client to extract confidential resume and career details of registered users.
**Learning:** The SQL query in the route's endpoint was overly permissive, specifying `resume_text` in the SELECT query without properly verifying if the requesting user was authenticated or if the target user had explicitly authorized sharing this information.
**Prevention:** Explicitly exclude high-sensitivity personal fields (like `resume_text`, `email`, full locations, etc.) from standard public-facing queries. Add robust, automated integration and route unit tests asserting that no endpoint outputs contain forbidden fields.
