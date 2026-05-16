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
