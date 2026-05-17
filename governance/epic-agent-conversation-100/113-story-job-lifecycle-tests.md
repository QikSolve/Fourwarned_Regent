# Story 113 — Job Lifecycle Tests

## Summary
Add lifecycle-focused tests to validate allowed state transitions and API-visible status behavior.

## Acceptance Criteria
- [ ] Tests cover queue → claim → running → completed.
- [ ] Tests cover failure and retry transitions.
- [ ] Tests assert invalid transitions are rejected.

## Dependencies
- [111-story-job-schema-and-migration.md](111-story-job-schema-and-migration.md)
- [112-story-enqueue-and-status-api.md](112-story-enqueue-and-status-api.md)
- [110-feature-job-queue-and-state.md](110-feature-job-queue-and-state.md)

## Definition of Done
- [ ] Test files added using existing project test patterns.
- [ ] Tests pass in CI/local test command.
- [ ] Transition rules are encoded and reviewed.
