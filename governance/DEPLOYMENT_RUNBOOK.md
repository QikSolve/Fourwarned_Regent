# Four Warned: Regent — Deployment & Go-Live Runbook

## Environment Variables

Required in production:

- `DATABASE_URL` — managed Postgres connection string.
- `DATABASE_SSL_MODE` — optional (`disable` to skip SSL, default SSL enabled).
- `DATABASE_SSL_REJECT_UNAUTHORIZED` — optional (`false` only when required by provider docs).
 - `OPENAI_API_KEY` — optional; if present the app will call the OpenAI API for Scribe/Advisor text generation. If not set, the prototype will use deterministic, local generators.

## Promote Procedure

1. Confirm CI is green (`lint`, `build`, `test`).
2. Confirm no critical open issues tagged `launch-blocker`.
3. Deploy to Vercel preview and run smoke checks:
   - Start a new campaign.
   - Reload existing campaign.
   - Advance turn at least once.
   - Verify `/api/metrics` responds.
4. Promote preview to production.

## Smoke Check (Production)

1. Start campaign from clean browser session.
2. Complete one report response and advance turn.
3. Hard-refresh and verify campaign resumes.
4. Verify no API 5xx bursts in Vercel logs.

## Rollback Procedure

1. Revert to previous healthy Vercel deployment.
2. Re-run smoke check on reverted deployment.
3. Record incident summary in issue tracker.

## Operational Alerts

Use `/api/metrics` and logs to monitor:

- `turnAdvanceFailure / (turnAdvanceSuccess + turnAdvanceFailure)`:
  - warning: `> 0.05`
  - critical: `> 0.15`
- `apiFailure` burst:
  - critical: `>= 10` in short interval

## Playtest Feedback Loop (MVP)

Before public launch:

1. Run focused playtests with scripted prompts.
2. Capture friction points:
   - where players hesitate in report selection
   - where Scribe clarification is unclear
   - where consequences feel disconnected
3. Apply one balancing/content polish pass.

## Staged Rollout

1. Soft launch to limited audience.
2. Observe 48–72 hours for:
   - save/load stability
   - turn completion rate
   - progression blockers
3. Public launch only if no critical blocker is detected.
