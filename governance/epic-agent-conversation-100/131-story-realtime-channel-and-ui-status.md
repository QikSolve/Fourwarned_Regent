# Story 131 — Realtime Channel and UI Status

## Summary
Create realtime event delivery and UI components that show job statuses, partial outputs, and season-level progress.

## Acceptance Criteria
- [ ] Realtime events propagate lifecycle and partial-output updates.
- [ ] UI displays live status indicators and partial/log feed per job.
- [ ] Season-level view aggregates advisor/job progress clearly.

## Dependencies
- [112-story-enqueue-and-status-api.md](112-story-enqueue-and-status-api.md)
- [121-story-worker-claim-execute.md](121-story-worker-claim-execute.md)
- [122-story-cancel-retry-heartbeat.md](122-story-cancel-retry-heartbeat.md)
- [130-feature-realtime-ux-and-streaming.md](130-feature-realtime-ux-and-streaming.md)

## Definition of Done
- [ ] Realtime transport integrated with backend event source.
- [ ] UI components wired to realtime + fallback polling behavior.
- [ ] Manual UX check confirms statuses/logs/progress update live.
