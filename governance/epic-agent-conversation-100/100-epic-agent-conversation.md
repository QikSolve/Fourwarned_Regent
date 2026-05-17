# Epic 100 — Agent Conversation + Realtime Work Visibility

## Objective
Move from deterministic advisor selection to real advisor conversations with visible agent work, backed by real background jobs and a realtime UI.

## Scope
- Introduce queued background jobs and explicit job state transitions.
- Execute advisor/scribe work in workers with progress updates and partial streaming.
- Surface realtime job status, logs, and partial outputs in the UI.

## Architecture Decisions
- **Database**: Keep Neon (Postgres) as the primary database.
- **Supabase**: Optional only if managed realtime/auth is specifically desired; **no mandatory migration**.
- Realtime can be delivered using Postgres-driven events plus a websocket/realtime delivery layer.

## Child Features
- [110-feature-job-queue-and-state.md](110-feature-job-queue-and-state.md)
- [120-feature-worker-execution.md](120-feature-worker-execution.md)
- [130-feature-realtime-ux-and-streaming.md](130-feature-realtime-ux-and-streaming.md)

## Child Stories
- [111-story-job-schema-and-migration.md](111-story-job-schema-and-migration.md)
- [112-story-enqueue-and-status-api.md](112-story-enqueue-and-status-api.md)
- [113-story-job-lifecycle-tests.md](113-story-job-lifecycle-tests.md)
- [121-story-worker-claim-execute.md](121-story-worker-claim-execute.md)
- [122-story-cancel-retry-heartbeat.md](122-story-cancel-retry-heartbeat.md)
- [131-story-realtime-channel-and-ui-status.md](131-story-realtime-channel-and-ui-status.md)

## MVP Testing Note
For MVP: validation is friends-and-family testing, and privacy handling is informal for this phase.
