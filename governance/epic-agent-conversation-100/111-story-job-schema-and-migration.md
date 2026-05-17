# Story 111 — Job Schema and Migration

## Summary
Create the core jobs schema and migration(s) to support queueing, state tracking, retries, timestamps, and payload metadata.

## Acceptance Criteria
- [ ] Migration creates required job tables/indexes.
- [ ] State-related columns support lifecycle transitions and retry counts.
- [ ] Schema supports timestamps for enqueue, claim, heartbeat, completion, and cancellation.

## Dependencies
- [100-epic-agent-conversation.md](100-epic-agent-conversation.md)
- [110-feature-job-queue-and-state.md](110-feature-job-queue-and-state.md)

## Definition of Done
- [ ] Migration file committed and reversible.
- [ ] Schema reviewed for query/index coverage.
- [ ] Basic migration verification completed in local dev DB.
