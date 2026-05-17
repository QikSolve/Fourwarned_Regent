# Feature 110 — Job Queue + State Model + APIs

## Goal
Define durable job queue records, state transitions, and API endpoints for enqueueing and status lookup.

## Includes
- Job table/schema and migration strategy.
- State model (`queued`, `claimed`, `running`, `completed`, `failed`, `cancelled`, `retrying`).
- Enqueue/status/cancel API contracts.
- Idempotency and basic concurrency safeguards.

## Linked Epic
- [100-epic-agent-conversation.md](100-epic-agent-conversation.md)

## Linked Stories
- [111-story-job-schema-and-migration.md](111-story-job-schema-and-migration.md)
- [112-story-enqueue-and-status-api.md](112-story-enqueue-and-status-api.md)
- [113-story-job-lifecycle-tests.md](113-story-job-lifecycle-tests.md)

## Acceptance Criteria
- Job records are persisted and queryable by ID.
- API callers can enqueue, fetch status, and cancel jobs reliably.
- Lifecycle transitions are valid and auditable.
