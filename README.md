# Four Warned: Regent

## Governance Documentation Gap Assessment (2026-05-16)

This repository contains both implementation and governance design docs:

- `PRD.md`
- `GDD.md`
- `ARCHITECTURE.md`

The assessment below compares current implementation (`src/**`) against those governance docs and identifies gaps/required changes.

### Assessment Summary

| Area | Governance Docs Expectation | Current Implementation | Status | Changes Required |
| --- | --- | --- | --- | --- |
| Core loop (reports → scribe → player choice → simulation) | Defined in PRD/GDD and architecture turn flow | Implemented in store, reports, simulation, and UI panels | ✅ Implemented | None for MVP scope |
| Advisor model | Four core advisors with traits and stress/loyalty dynamics | Implemented with Steward, Marshal, Merchant, Governor and full trait set | ✅ Implemented | None for MVP scope |
| Operational procedures | Assignable governance procedures with advisor capacity limits | Implemented with assign/unassign flow and per-advisor max procedure capacity | ✅ Implemented | None for MVP scope |
| Doctrine system | Kingdom-wide doctrine influencing outcomes | Implemented with doctrine categories and deterministic effects | ✅ Implemented | None for MVP scope |
| Scribe responsibilities | Clarification + conflict/consequence framing | Implemented with welcome/conflict/consequence messaging and report framing | ✅ Implemented | None for MVP scope |
| Deterministic simulation ownership | Simulation, not AI, owns game-state changes | Implemented deterministic `resolveTurn`/simulation path | ✅ Implemented | None for MVP scope |
| Persistence layer | Architecture doc expects campaign persistence (Postgres) | In-memory Zustand state only (prototype session state) | ⚠️ Partial | Add campaign persistence + hydration path |
| AI orchestration layer | Architecture expects structured AI endpoints and schema validation | Stub endpoints exist, but gameplay currently runs with deterministic local generation | ⚠️ Partial | Wire endpoints into runtime orchestration and validated payload flow |
| Folder alignment | Architecture sample still references top-level `/app`, `/lib`, `/types` | Project is under `src/` (`src/app`, `src/lib`, `src/types`) | ⚠️ Drift | Update architecture doc folder examples to match `src/` layout |

### Recommended Next Changes (Prioritized)

1. **Doc sync update**: revise `ARCHITECTURE.md` prototype folder paths to `src/` to match deployed codebase structure.
2. **Persistence implementation**: introduce campaign save/load for turn state.
3. **AI integration hardening**: connect route handlers to active gameplay flow with schema-validated request/response contracts.

## Local Development

```bash
npm ci
npm run lint
npm run build
npm run dev
```
