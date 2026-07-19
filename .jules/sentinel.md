# Sentinel's Security Journal 🛡️

This journal records critical security discoveries, patterns, and learnings specific to this codebase.

## 2025-03-04 - Unauthenticated Profile PII Leakage
**Vulnerability:** The unauthenticated route `GET /profile/public/:userId` was returning the `resume_text` field from the database query, exposing sensitive Personally Identifiable Information (PII) including full names, contact info, and work history to unauthenticated users.
**Learning:** This occurred because the database query was retrieving all fields including `resume_text` without filtering or selecting only the bare minimum fields required for public display. Public routes must always use strict allowlists for returned fields.
**Prevention:** Explicitly exclude sensitive fields like `resume_text` from public profile query selections and implement unit tests to assert that sensitive PII properties are never present in public-facing API responses.
