# Current Architecture

Kamiya consumes Cerbanimo through `/api/v1`. Cerbanimo owns projects, task graph generation, action queues, automation runs, evidence intake, validation, human review, notifications, and database state.

The Packet 007B/008 path is:

1. Evidence draft.
2. Preview and manifest v2 freeze.
3. Validation run.
4. Manual validation review when required.
5. Peer Blessings.
6. PM Ritual Seal.
7. Acceptance record with settlement pending.

Completion settlement, rewards, dependency activation, and story publication remain future work.
