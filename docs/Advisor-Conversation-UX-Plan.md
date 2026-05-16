# Advisor Conversation UX Plan

Summary
- Goal: Move from deterministic choice cards to multi-turn, persona-driven conversations with advisors so users can have real back-and-forth interactions, preserve context, and make more informed decisions.
- Scope: UX patterns, trade-offs, MVP implementation, data and privacy considerations, metrics, and a recommended rollout.

1. Recommended MVP (fastest ROI)
- “Open chat” modal per advisor with preserved session thread.
- One-click follow-ups (chips): “Why?”, “Alternative”, “Pros/Cons”, “Explain more”.
- Basic advisor metadata: avatar, short bio, confidence/provenance tag.
- Opt-in session memory (ephemeral by default) with clear toggle.

2. UX Patterns (details)
- Chat modal per advisor
  - Entry points: “Open conversation” button on each advisor card.
  - Features: message bubbles, typing indicator, suggested follow-ups, tone selector (concise/analytical/collaborative).
- Inline threaded view (future)
  - Expand card to reveal full thread; keep timestamps and suggested actions.
- Hybrid flow
  - Keep choice cards and add “Discuss” CTA to open 1:1 thread.
- Multi-advisor workspace (advanced)
  - Start a debate: bring multiple advisors into a single thread to compare recommendations.

3. Persona &amp; Tone Controls
- Tone presets and a slider for depth/formality.
- Persist user preference per-advisor (opt-in).

4. Follow-up affordances
- Suggested quick-chips for common clarifications generate structured prompts.
- Allow custom free-text follow-ups.
- Provide ability to “ask advisor B to respond to advisor A”.

5. State &amp; Memory
- Modes:
  - Ephemeral session: cleared on session end (default).
  - Persistent per-advisor: stored with user opt-in.
- UI: memory toggle in thread header with short explainer modal.
- Data handling: store only transcripts and persona preferences required for continuity; include deletion/export controls.

6. Provenance &amp; Safety
- Display source citations/confidence for factual claims.
- Hallucination guardrails: automated checks, “verify source” button, and provenance links where available.
- Rate limits and moderation for voice or live interactions.

7. Accessibility &amp; Interaction Details
- Keyboard-first navigation and ARIA-friendly transcripts.
- Clear focus management when opening modals or inline threads.
- Avoid non-essential animations; keep roles and message structure screen-reader friendly.

8. Metrics &amp; Success Criteria
- Engagement: follow-up rate per advisor, messages per thread.
- Decision quality: time-to-selection, change-in-preference after conversation.
- Satisfaction: NPS and qualitative feedback.
- Safety: frequency of provenance requests and hallucination reports.

9. Implementation Notes (backend)
- Per-advisor conversation state store (short TTL for ephemeral; durable store for opted-in persistent).
- Persona parameterization in prompt templates and a tone-to-prompt mapping layer.
- Caching of recent replies and follow-up intents for low-latency UX.
- Logging and telemetry for metrics above, with user-consent flags for persistence.

10. Rollout Plan
- Phase 0: Ship “Open chat” modal + ephemeral session threads + one-click follow-ups. Track metrics.
- Phase 1: Add persona/tone controls, avatars, bios, and persistent memory opt-in.
- Phase 2: Inline threaded view and message-level provenance UI across advisors.
- Phase 3: Multi-advisor discussion workspace, export, and advanced moderation.

11. Risks &amp; Mitigations
- Complexity: start with modal + chips to reduce surface area.
- Privacy: default to ephemeral, explicit opt-in for persistence, clear deletion UI.
- Performance: pre-warm caches, limit long-running threads, provide loading states.

12. Next Steps / Deliverables
- Design: 3–4 wireframes (modal, card with chips, thread header with memory toggle).
- Engineering: API contract for conversation state and memory toggle; telemetry schema.
- Legal/Privacy: vet persistence model and retention period.
- Research: small usability test comparing choice-cards vs chat modal.

---
