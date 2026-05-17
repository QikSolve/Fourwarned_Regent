# Story 121 — Worker Claim and Execute

## Summary
Implement worker logic to claim queued jobs, execute agent conversation work, and persist progress/results.

## Acceptance Criteria
- [ ] Worker claims only eligible jobs using safe lease semantics.
- [ ] Execution persists running state and final result status.
- [ ] Partial outputs are emitted/persisted during execution.

## Dependencies
- [111-story-job-schema-and-migration.md](111-story-job-schema-and-migration.md)
- [120-feature-worker-execution.md](120-feature-worker-execution.md)

## Definition of Done
- [ ] Worker claim/execute path implemented.
- [ ] Duplicate claim protections verified.
- [ ] Local run demonstrates successful end-to-end execution.
