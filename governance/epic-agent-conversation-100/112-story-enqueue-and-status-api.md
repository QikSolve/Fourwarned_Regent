# Story 112 — Enqueue and Status API

## Summary
Implement API endpoints to enqueue new agent-conversation jobs and retrieve job status/details by ID.

## Acceptance Criteria
- [ ] Enqueue endpoint validates inputs and creates a `queued` job.
- [ ] Status endpoint returns normalized lifecycle status and key metadata.
- [ ] API handles missing/invalid IDs with clear error responses.

## Dependencies
- [111-story-job-schema-and-migration.md](111-story-job-schema-and-migration.md)
- [110-feature-job-queue-and-state.md](110-feature-job-queue-and-state.md)

## Definition of Done
- [ ] Endpoint handlers implemented and wired.
- [ ] API contracts documented in-code or route-level docs.
- [ ] Happy path and basic error paths manually validated.
