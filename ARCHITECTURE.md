# Four Warned: Regent

## High-Level Architecture & Technology Stack

## Recommended Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js / React | Tablet-first web UI |
| Hosting | Vercel | Deploy frontend and backend functions |
| Backend | Next.js API Routes / Route Handlers | Game actions, turn resolution, AI calls |
| AI Layer | Vercel AI SDK | Scribe/advisor LLM interactions |
| Database | Postgres via Neon / Supabase / Vercel Marketplace | Campaign state, advisors, reports, logs |
| Validation | Zod | Validate AI outputs and game actions |
| Styling | Tailwind CSS | Fast UI iteration |
| State Management | Zustand or React state | Local UI state |
| Auth | None for prototype, Clerk/Auth.js later | Optional later |

---

# High-Level Architecture

```
Player Browser
   ↓
Next.js / React UI
   ↓
Vercel Server Functions
   ↓
Game Orchestration Layer
   ├── Deterministic Simulation Engine
   ├── Scribe AI Layer
   ├── Advisor AI Layer
   └── Validation Layer
   ↓
Postgres Database
```

---

# Core Components

## 1. Frontend UI

Main screens:

- Council Reports
- Scribe Panel
- Advisor Cards
- Doctrine Editor
- Procedure Editor
- Kingdom Overview
- End-of-Turn Summary

The UI should feel like a medieval council desk: reports, decrees, ledgers, advisor briefs.

---

## 2. Game Simulation Engine

A deterministic TypeScript module.

Responsible for:

- resource changes
- morale shifts
- threat changes
- region stability
- advisor stress
- administrative capacity
- turn resolution

Important rule:

> The simulation engine owns game state.
> The AI does not directly change the game.

---

## 3. AI Orchestration Layer

Uses LLM calls for:

- Scribe clarification questions
- advisor recommendations
- decree drafting
- procedure suggestions
- consequence explanations

The AI outputs structured JSON, not freeform game-state changes.

Example:

```json
{
  "advisor": "Steward Aldric",
  "concern": "Winter food shortage",
  "recommendation": "Reduce grain exports",
  "risk": "Merchant unrest may increase"
}
```

---

## 4. Scribe System

The Scribe is the player's loyal interface agent.

Responsibilities:

- translate player intent into decrees
- ask clarifying multiple-choice questions
- identify advisor conflicts
- explain consequences
- draft procedures

The Scribe should not make strategic decisions independently.

---

## 5. Database

Use Postgres with JSONB for flexibility.

Minimum tables:

```
campaigns
regions
advisors
doctrines
procedures
reports
turn_logs
player_decisions
```

Store evolving campaign state as JSONB early on to avoid over-engineering.

---

# MVP Turn Flow

```
1. Load campaign state
2. Generate advisor reports
3. Scribe asks clarification questions
4. Player chooses options or edits decree
5. Validate selected action
6. Run deterministic simulation
7. Generate consequence summary
8. Save updated campaign state
9. Render next turn
```

---

# Prototype Folder Structure

```
/app
  /api
    /campaign/start
    /turn/advance
    /scribe/draft
    /advisor/recommend
  /components
    CouncilReports.tsx
    ScribePanel.tsx
    AdvisorCard.tsx
    DoctrineEditor.tsx
    KingdomOverview.tsx
/lib
  /simulation
    resolveTurn.ts
    resources.ts
    events.ts
  /ai
    scribe.ts
    advisors.ts
    schemas.ts
  /db
    client.ts
/types
  game.ts
  advisor.ts
  region.ts
```

---

# MVP Recommendation

Build as a **single Next.js monolith on Vercel**:

```
Next.js + React + Vercel + Vercel AI SDK + Postgres + Zod + Tailwind
```

Avoid for now:

- microservices
- queues
- vector databases
- real-time systems
- complex auth
- background jobs

The first prototype should prove one thing:

> Is governing through the Scribe, advisors, procedures, and decrees fun?
