/**
 * Database client stub.
 *
 * Architecture specifies Postgres via Neon / Supabase / Vercel Marketplace.
 * For the prototype, campaign state is held in-memory (Zustand) on the client.
 *
 * To wire up a real database:
 *   1. Install `@neondatabase/serverless` or `@supabase/supabase-js`
 *   2. Set DATABASE_URL in your environment
 *   3. Replace the stub functions below with real query logic
 *
 * Minimum schema (per ARCHITECTURE.md):
 *   campaigns, regions, advisors, doctrines, procedures, reports,
 *   turn_logs, player_decisions
 */

export type CampaignRow = {
  id: string;
  state: unknown; // JSONB — full CampaignState
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Stub implementations — replace with real DB queries when ready
// ---------------------------------------------------------------------------

export async function getCampaign(id: string): Promise<CampaignRow | null> {
  // TODO: SELECT * FROM campaigns WHERE id = $1
  void id;
  return null;
}

export async function saveCampaign(id: string, state: unknown): Promise<void> {
  // TODO: INSERT INTO campaigns ... ON CONFLICT DO UPDATE SET state = $2
  void id;
  void state;
}

export async function createCampaign(state: unknown): Promise<string> {
  // TODO: INSERT INTO campaigns (state) VALUES ($1) RETURNING id
  void state;
  return `campaign-${Date.now()}`;
}
