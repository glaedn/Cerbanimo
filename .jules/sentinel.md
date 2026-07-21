# Sentinel's Security Journal 🛡️

This journal records critical security learnings, vulnerability patterns, and prevention strategies identified within this codebase.

## 2026-07-20 - Hardcoded Administrative Access Control (Bypassing RBAC)
**Vulnerability:** Hardcoded authorization checks in `backend/routes/admin.js` checked if a user had the ID `15` (`req.user.id === 15`) rather than verifying actual administrative roles or credentials. If a user with ID `15` existed or if a malicious user obtained ID `15`, they automatically obtained full access to critical administrative API endpoints. Conversely, other designated administrators (with the `'admin'` role) were completely blocked from using admin routes.
**Learning:** Checking hardcoded IDs for authorization creates fragile, easily bypassable access control logic. It also violates basic Role-Based Access Control (RBAC) standards. The `resolveUser` middleware only queried `id` and `username` from the `users` table, which also incentivized engineers to check for IDs rather than roles because the user roles were not readily attached to the session context (`req.user`).
**Prevention:**
1. Always populate user permissions and roles on the request user context (e.g., `req.user.roles`) during user session resolution.
2. Ensure that access control checks are based on roles (e.g., checking if the user has the `'admin'` role) rather than hardcoded DB identifiers.
3. Establish robust unit/integration tests that explicitly assert authorization behaviors for admin endpoints across diverse user roles.
