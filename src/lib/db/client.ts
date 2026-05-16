import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

export type CampaignRow = {
  id: string;
  state: unknown;
  version: number;
  created_at: string;
  updated_at: string;
};

let pool: Pool | null = null;
let tableInitialized = false;
const inMemoryCampaigns = new Map<string, CampaignRow>();

function hasDatabaseUrl(): boolean {
  return typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim().length > 0;
}

function getPool(): Pool | null {
  if (!hasDatabaseUrl()) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL_MODE === 'disable'
        ? false
        : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' },
    });
  }
  return pool;
}

async function ensureCampaignTable(): Promise<void> {
  const db = getPool();
  if (!db || tableInitialized) {
    return;
  }
  await db.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      state JSONB NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS campaigns_updated_at_idx
    ON campaigns (updated_at DESC);
  `);
  tableInitialized = true;
}

function toInMemoryRow(id: string, state: unknown, version: number, createdAt?: string): CampaignRow {
  const now = new Date().toISOString();
  return {
    id,
    state,
    version,
    created_at: createdAt ?? now,
    updated_at: now,
  };
}

export async function getCampaign(id: string): Promise<CampaignRow | null> {
  const db = getPool();
  if (!db) {
    return inMemoryCampaigns.get(id) ?? null;
  }
  await ensureCampaignTable();
  const result = await db.query<CampaignRow>(
    'SELECT id, state, version, created_at::text, updated_at::text FROM campaigns WHERE id = $1 LIMIT 1',
    [id]
  );
  return result.rows[0] ?? null;
}

export async function saveCampaign(id: string, state: unknown, version: number): Promise<void> {
  const db = getPool();
  if (!db) {
    const existing = inMemoryCampaigns.get(id);
    inMemoryCampaigns.set(id, toInMemoryRow(id, state, version, existing?.created_at));
    return;
  }
  await ensureCampaignTable();
  await db.query(
    `
      INSERT INTO campaigns (id, state, version)
      VALUES ($1, $2::jsonb, $3)
      ON CONFLICT (id)
      DO UPDATE SET
        state = EXCLUDED.state,
        version = EXCLUDED.version,
        updated_at = NOW()
    `,
    [id, JSON.stringify(state), version]
  );
}

export async function createCampaign(state: unknown, version: number): Promise<string> {
  const id = randomUUID();
  const db = getPool();
  if (!db) {
    inMemoryCampaigns.set(id, toInMemoryRow(id, state, version));
    return id;
  }
  await ensureCampaignTable();
  await db.query(
    'INSERT INTO campaigns (id, state, version) VALUES ($1, $2::jsonb, $3)',
    [id, JSON.stringify(state), version]
  );
  return id;
}

export async function getCampaignCount(): Promise<number> {
  const db = getPool();
  if (!db) {
    return inMemoryCampaigns.size;
  }
  await ensureCampaignTable();
  const result = await db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM campaigns');
  return Number.parseInt(result.rows[0]?.count ?? '0', 10);
}
