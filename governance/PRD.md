# FOUR WARNED: REGENT

## Product Requirements Document (PRD)

### MVP v0.2 — Guided Governance Prototype

---

## 1. Product Vision

### Vision Statement

Four Warned: Regent is a text-driven medieval governance simulation where players rule indirectly through autonomous advisors, governors, and institutions rather than direct control.

The game explores:

- delegation
- governance
- institutional design
- scaling complexity
- imperfect information
- autonomous systems under uncertainty

The player fantasy evolves from:

> “I manage a village”  
> to:  
> “I design institutions capable of governing without me.”

---

## 2. MVP Objective

### Primary Goal

Validate whether:

- governance through advisors
- guided prompting
- operational procedures
- doctrine systems
- delegated authority
- institutional interpretation

creates compelling gameplay.

### Secondary Goals

Validate whether players:

- understand advisor behaviour
- enjoy configuring governance systems
- experiment with governance philosophy
- understand systemic consequences
- enjoy indirect control
- feel attached to advisors

---

## 3. Core Gameplay Thesis

The player does not directly control:

- buildings
- workers
- military units

The player governs through:

- reports
- decrees
- operational procedures
- advisor priorities
- institutional doctrine

Advisors interpret player intent imperfectly based on:

- personality
- loyalty
- stress
- procedures
- local information
- institutional pressures

---

## 4. Core UX Innovation — The Scribe

### The Scribe

The player is assisted by a permanently loyal royal Scribe.

The Scribe functions as:

- governance assistant
- decree drafter
- institutional translator
- clarification layer
- conversational UI guide

The Scribe does **not**:

- govern regions
- make decisions independently
- optimise gameplay automatically

Instead, the Scribe:

- interprets player intent
- asks clarifying questions
- surfaces tradeoffs
- drafts formal procedures
- explains institutional consequences
- translates reports into actionable governance choices

---

## 5. Guided Governance Interaction Model

Instead of requiring constant freeform prompting, advisors and the Scribe guide the player through governance decisions.

### 5.1 Example Interaction

#### Advisor Report

**STEWARD ALDRIC**

“Grain stores are lower than expected.  
If winter worsens, shortages are possible.”

#### Scribe Clarification

**SCRIBE**

“How should the kingdom respond?”

- [ ] Reduce grain exports
- [ ] Purchase emergency reserves
- [ ] Begin rationing
- [ ] Maintain current trade levels

Optional:

**Additional Instruction:**  
_________________________

### 5.2 Design Goals

This interaction model should:

- reduce player overwhelm
- teach governance systems naturally
- preserve strategic depth
- avoid prompt engineering gameplay
- keep the player immersed in the role of ruler

---

## 6. Gameplay Loop

Each turn represents a governance cycle (season).

Reports Arrive  
→ Advisors Raise Concerns  
→ Scribe Clarifies Intent  
→ Player Defines Priorities  
→ Procedures / Decrees Drafted  
→ Advisors Interpret Orders  
→ Simulation Resolves  
→ Consequences Emerge

---

## 7. Operational Procedures

Traditional “skills” are reframed as governance procedures and institutional knowledge.

Examples:

| Procedure | Purpose |
| --- | --- |
| Winter Reserve Accounting | Food security |
| Frontier Patrol Doctrine | Raid prevention |
| Emergency Grain Logistics | Resource redistribution |
| Merchant Tax Balancing | Trade stability |

Procedures influence:

- advisor reasoning
- recommendations
- risk awareness
- autonomous behaviour

---

## 8. Advisor System

### Initial Advisors

| Role | Responsibility |
| --- | --- |
| Steward | Food and taxation |
| Marshal | Defence |
| Merchant | Trade |
| Frontier Governor | Regional administration |

### Advisor Attributes

| Attribute | Purpose |
| --- | --- |
| Competence | Decision quality |
| Loyalty | Alignment with crown |
| Stress | Reliability under pressure |
| Bias | Governance worldview |
| Ambition | Independence risk |
| Authority | Scope of autonomous action |

---

## 9. Context Capacity

Each advisor has limited operational capacity.

Example:

**Governor Elric**  
Operational Capacity: 3 Procedures

This creates:

- specialisation
- blind spots
- institutional dependency

Inspired by:

- AI context windows
- bounded cognition
- organisational scaling constraints

---

## 10. Doctrine System

Doctrine defines kingdom-wide governance philosophy.

Example:

**WINTER POLICY**

Priority:
1. Prevent famine
2. Preserve morale
3. Restrict exports during shortages

Advisors interpret doctrine independently.

The Scribe helps:

- draft doctrine
- clarify contradictions
- explain tradeoffs

---

## 11. Scribe Behaviour

The Scribe continuously:

- summarises conflicts
- explains advisor disagreements
- identifies policy contradictions
- translates outcomes into understandable language

### 11.1 Example

**SCRIBE**

“The Marshal’s request for expanded patrols  
conflicts with the Steward’s winter preservation strategy.”

### 11.2 Consequence Explanation

**SCRIBE**

“The Steward followed your food preservation decree,  
but merchant unrest increased after exports were restricted.”

The Scribe helps players understand:

- causality
- institutional drift
- policy tradeoffs
- unintended consequences

---

## 12. Initial World State

The MVP begins in mid-stage governance.

The player already controls:

- multiple settlements
- semi-autonomous governors
- strained institutions
- competing priorities

### Initial Regions

**Riverhold**  
Agricultural core settlement.

**Stonewatch**  
Militarised frontier region.

**Blackwater**  
Trade-focused river port.

### Starting Pressures

At game start:

- food reserves strained
- frontier instability rising
- merchants unhappy with taxes
- military requesting additional resources
- administrative capacity under pressure

---

## 13. Information System

The player never receives perfect information.

Reports may be:

- incomplete
- delayed
- biased
- politically motivated
- inaccurate

The player must infer:

- true conditions
- advisor reliability
- institutional stability

Information itself becomes gameplay.

---

## 14. UI / UX Direction

### Platform

Tablet-first web experience.

### Interface Philosophy

The interface should feel like:

> governing through correspondence and royal counsel.

Not:

- spreadsheets
- RTS interfaces
- terminal simulation

### Core UI Areas

**Kingdom Overview**

- food
- morale
- gold
- threat
- administrative strain

**Reports Feed**  
Primary gameplay surface.

**Advisor Panel**

- loyalty
- stress
- procedures
- authority
- stance

**Scribe Panel**

- clarification questions
- decree drafting
- consequence explanation
- governance summaries

**Doctrine Editor**  
Kingdom-wide policy management.

### Advisor Conversation UX Plan

**Summary**
- Goal: Move from deterministic choice cards to multi-turn, persona-driven conversations with advisors so users can have real back-and-forth interactions, preserve context, and make more informed decisions.
- Scope: UX patterns, trade-offs, MVP implementation, data and privacy considerations, metrics, and a recommended rollout.

**Recommended MVP (fastest ROI)**
- "Open chat" modal per advisor with preserved session thread.
- One-click follow-ups (chips): "Why?", "Alternative", "Pros/Cons", "Explain more".
- Basic advisor metadata: avatar, short bio, confidence/provenance tag.
- Opt-in session memory (ephemeral by default) with clear toggle.
- Testing: For the MVP, testing will be conducted with friends and family only, so privacy will be managed informally and no additional privacy controls are required for this phase.

**UX Patterns**
- Chat modal per advisor
  - Entry points: "Open conversation" button on each advisor card.
  - Features: message bubbles, typing indicator, suggested follow-ups, tone selector (concise/analytical/collaborative).
- Inline threaded view (future)
  - Expand card to reveal full thread; keep timestamps and suggested actions.
- Hybrid flow
  - Keep choice cards and add "Discuss" CTA to open 1:1 thread.
- Multi-advisor workspace (advanced)
  - Start a debate: bring multiple advisors into a single thread to compare recommendations.

**Persona & Tone Controls**
- Tone presets and a slider for depth/formality.
- Persist user preference per-advisor (opt-in).

**Follow-up affordances**
- Suggested quick-chips for common clarifications generate structured prompts.
- Allow custom free-text follow-ups.
- Provide ability to "ask advisor B to respond to advisor A".

**State & Memory**
- Modes:
  - Ephemeral session: cleared on session end (default).
  - Persistent per-advisor: stored with user opt-in.
- UI: memory toggle in thread header with short explainer modal.
- Data handling: store only transcripts and persona preferences required for continuity; include deletion/export controls.

**Provenance & Safety**
- Display source citations/confidence for factual claims.
- Hallucination guardrails: automated checks, "verify source" button, and provenance links where available.
- Rate limits and moderation for voice or live interactions.

**Accessibility & Interaction Details**
- Keyboard-first navigation and ARIA-friendly transcripts.
- Clear focus management when opening modals or inline threads.
- Avoid non-essential animations; keep roles and message structure screen-reader friendly.

**Metrics & Success Criteria**
- Engagement: follow-up rate per advisor, messages per thread.
- Decision quality: time-to-selection, change-in-preference after conversation.
- Satisfaction: NPS and qualitative feedback.
- Safety: frequency of provenance requests and hallucination reports.

**Implementation Notes (backend)**
- Per-advisor conversation state store (short TTL for ephemeral; durable store for opted-in persistent).
- Persona parameterization in prompt templates and a tone-to-prompt mapping layer.
- Caching of recent replies and follow-up intents for low-latency UX.
- Logging and telemetry for metrics above, with user-consent flags for persistence.

**Rollout Plan**
- Phase 0: Ship "Open chat" modal + ephemeral session threads + one-click follow-ups. Track metrics.
- Phase 1: Add persona/tone controls, avatars, bios, and persistent memory opt-in.
- Phase 2: Inline threaded view and message-level provenance UI across advisors.
- Phase 3: Multi-advisor discussion workspace, export, and advanced moderation.

**Risks & Mitigations**
- Complexity: start with modal + chips to reduce surface area.
- Privacy: default to ephemeral, explicit opt-in for persistence, clear deletion UI.
- Performance: pre-warm caches, limit long-running threads, provide loading states.

**Next Steps / Deliverables**
- Design: 3–4 wireframes (modal, card with chips, thread header with memory toggle).
- Engineering: API contract for conversation state and memory toggle; telemetry schema.
- Legal/Privacy: vet persistence model and retention period.
- Research: small usability test comparing choice-cards vs chat modal.

---

## 15. AI / Systems Inspiration

The game is inspired by real-world challenges in:

- AI orchestration
- autonomous systems
- governance under uncertainty
- institutional scaling
- delegation systems

Players gradually learn:

- direct prompting does not scale
- governance structures matter
- incentives shape behaviour
- institutions drift
- coordination is harder than intelligence

---

## 16. MVP Technical Direction

### Frontend

- React / Next.js
- responsive tablet UI

### Backend

- deterministic simulation engine
- lightweight API orchestration layer

### AI Usage

LLMs used for:

- advisor interpretation
- reports
- recommendations
- Scribe clarification
- decree drafting
- consequence explanation

Simulation remains deterministic.

---

## 17. MVP Non-Goals

The MVP does **not** include:

- combat gameplay
- city building placement
- dynasty systems
- real-time simulation
- large-scale procedural generation
- multiplayer
- advanced diplomacy
- deep economic simulation

---

## 18. MVP Success Criteria

The MVP succeeds if players:

- enjoy interacting with advisors
- understand governance tradeoffs
- experiment with doctrine/procedures
- feel governance complexity scaling
- understand why failures occur
- feel emotionally attached to advisors
- replay to test different governance structures

---

## 19. Long-Term Vision

Four Warned: Regent evolves into:

- a governance sandbox
- institutional simulation
- emergent storytelling engine
- autonomous systems strategy game

The ultimate challenge is not:

- conquering territory

but:

> building institutions capable of surviving autonomy, complexity, and uncertainty.
