# Four Warned: Regent — Governance Gap Implementation Plan

This document expands the implementation plan from `README.md` and turns the identified gaps into concrete deliverables.

## Scope

The plan addresses the three prioritized gaps:

1. Architecture documentation path drift (`/app`, `/lib`, `/types` vs `src/` layout).
2. Missing campaign persistence/hydration.
3. AI orchestration integration into active gameplay flow with schema validation.

## Workstream 1 — Architecture Documentation Sync

### Goal

Align `ARCHITECTURE.md` with the real repository structure so contributors can navigate the project correctly.

### Tasks

- Update prototype folder examples to:
  - `src/app`
  - `src/components`
  - `src/lib`
  - `src/types`
- Keep architecture intent unchanged; only fix structural references that drifted.
- Cross-check references in `README.md` for consistency.

### Acceptance Criteria

- `ARCHITECTURE.md` folder structure matches current repository layout.
- No contradictory path references remain in project docs.

## Workstream 2 — Campaign Persistence & Hydration

### Goal

Persist campaign state across sessions while keeping simulation deterministic.

### Initial MVP Persistence Strategy

- Add a persistence boundary around current game state (`GameState` in `src/lib/gameTypes.ts`).
- Implement save/load lifecycle in state management (`src/lib/gameStore.ts`) using a repository-appropriate storage mechanism.
- Ensure `initGame` can bootstrap either:
  - a new campaign, or
  - a previously saved campaign snapshot.

### Tasks

- Define persisted payload shape (versioned to allow future migrations).
- Add serialization/deserialization safeguards for optional/unknown fields.
- Add migration/defaulting logic for older snapshots.
- Add explicit actions for:
  - save campaign state
  - load campaign state
  - reset campaign state

### Validation

- Manual:
  - Start campaign, make choices, save, reload, verify state continuity.
  - Verify turn/season/year/metrics/advisor assignments survive reload.
- Automated (if test infrastructure is expanded):
  - store hydration from valid snapshot
  - fallback behavior for invalid snapshot
  - migration behavior for older snapshot version

### Acceptance Criteria

- Campaign resumes from last saved state without data loss.
- Invalid or outdated snapshots fail safely to a known-good state.
- Deterministic turn resolution behavior remains unchanged.

## Workstream 3 — AI Orchestration Runtime Integration

### Goal

Integrate existing AI route handlers into gameplay flow while keeping simulation authority deterministic and schema-validated.

### Principles

- AI suggests/frames intent and recommendations.
- Deterministic simulation remains the sole writer of canonical game metrics.
- All AI input/output contracts are validated before use.

### Tasks

- Wire UI/store flows to call existing API endpoints where appropriate:
  - `/api/scribe/draft`
  - `/api/advisor/recommend`
- Validate API payloads through existing schema layer (`src/lib/ai/schemas.ts`).
- Add graceful fallback path to current deterministic/local generation when AI response fails validation or request fails.
- Normalize AI response shape for presentation in report/scribe UI components.

### Validation

- Manual:
  - Trigger advisor/scribe generation flows and verify responses render correctly.
  - Simulate endpoint failure and verify fallback behavior.
- Automated (if test coverage is added):
  - schema success and rejection cases
  - fallback activation on invalid payloads
  - no direct metric mutation by AI responses

### Acceptance Criteria

- Gameplay can consume AI-generated advisory content through validated contracts.
- Failure modes degrade gracefully without blocking turn progression.
- AI does not directly mutate deterministic simulation state.

## Suggested Delivery Order

1. Workstream 1 (doc sync; lowest risk and clears contributor confusion).
2. Workstream 2 (persistence baseline to stabilize campaign continuity).
3. Workstream 3 (runtime AI integration with safe fallback paths).

## Risks & Mitigations

- **State schema drift over time**
  - Mitigation: versioned persisted payload + migration defaults.
- **AI payload instability**
  - Mitigation: strict schema validation + deterministic fallback.
- **Unclear ownership between AI and simulation**
  - Mitigation: enforce simulation-only writes for canonical metrics.

## Definition of Done

- Documentation and implementation are aligned on structure and runtime responsibilities.
- Campaign progress survives reloads.
- AI endpoints are integrated with validation and safe fallback behavior.
