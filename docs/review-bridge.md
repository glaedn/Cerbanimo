# Review Bridge

Validation creates or activates one review round for the frozen evidence bundle and validation result.

## Boundaries

The review bridge may create:

- one review round;
- assignments;
- immutable decisions;
- review events;
- one acceptance record after both gates pass.

It must not:

- complete the task;
- award XP;
- mint or release tokens;
- activate dependencies;
- publish stories.

Accepted review rounds remain `accepted_pending_settlement` until Packet 009 consumes the acceptance record.
