# Story 122 — Cancel, Retry, and Heartbeat

## Summary
Add worker/job controls for cancellation, retry scheduling, and heartbeat monitoring with stale-job recovery.

## Acceptance Criteria
- [ ] Jobs can be cancelled before/during execution with consistent terminal state.
- [ ] Retryable failures requeue up to configured limits.
- [ ] Heartbeat timeout marks stale jobs for retry or failure handling.

## Dependencies
- [121-story-worker-claim-execute.md](121-story-worker-claim-execute.md)
- [120-feature-worker-execution.md](120-feature-worker-execution.md)

## Definition of Done
- [ ] Cancel and retry paths implemented and documented.
- [ ] Heartbeat update and timeout handling implemented.
- [ ] Automated tests cover cancel + retry + stale-worker timeout scenarios using the existing project test command/patterns.
- [ ] Local/manual verification confirms expected behavior in an end-to-end run.
