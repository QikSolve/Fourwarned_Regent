# Feature 120 — Worker Execution Lifecycle

## Goal
Implement worker claim/execute flow with retries, cancellation, heartbeat, and partial output streaming.

## Includes
- Worker claim semantics and lock/lease behavior.
- Execution loop that emits partial output chunks.
- Worker persistence for per-advisor thread state and transcript continuity required by conversation UX.
- Retry policy and dead-letter/final-failure behavior.
- Cancel handling and heartbeat-based stale-job recovery.

## Linked Epic
- [100-epic-agent-conversation.md](100-epic-agent-conversation.md)

## Linked Stories
- [121-story-worker-claim-execute.md](121-story-worker-claim-execute.md)
- [122-story-cancel-retry-heartbeat.md](122-story-cancel-retry-heartbeat.md)

## Acceptance Criteria
- Workers process jobs safely without duplicate execution.
- Partial outputs are emitted during execution.
- Cancel/retry/heartbeat behaviors are deterministic and observable.
