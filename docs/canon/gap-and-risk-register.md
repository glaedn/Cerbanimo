# Gap and Risk Register

## Open Gaps

- Real PostgreSQL race coverage requires an available isolated database in the test environment.
- Production deadline worker registration should be audited with live pg-boss.
- Full review browser journeys should be expanded beyond current golden conversation and command-level tests.
- Root frontend lint has extensive pre-existing violations and is not currently a useful gate.

## Risk Controls Already Added

- False-pass evaluation reports `falsePassCount = 0`.
- Integrity mismatches produce validation failures before semantic review.
- Semantic review `never` does not invoke providers.
- Quality-check automation must use the canonical validator.
- Review acceptance creates settlement-pending records only.
