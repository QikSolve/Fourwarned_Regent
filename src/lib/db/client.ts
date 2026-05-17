import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import type { JobStatus } from '@/lib/contracts/jobs';
import { assertValidJobTransition } from '@/lib/jobs/lifecycle';

export type CampaignRow = {
  id: string;
  state: unknown;
  version: number;
  created_at: string;
  updated_at: string;
};

export type JobRow = {
  id: string;
  job_type: string;
  status: JobStatus;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_message: string | null;
  attempt: number;
  max_attempts: number;
  idempotency_key: string | null;
  queued_at: string;
  claimed_at: string | null;
  started_at: string | null;
  heartbeat_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type JobEventRow = {
  id: string;
  job_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type CreateJobInput = {
  jobType: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  maxAttempts?: number;
  idempotencyKey?: string;
};

export class InvalidJobTransitionError extends Error {}

let pool: Pool | null = null;
let campaignTableInitialized = false;
let jobTablesInitialized = false;
const inMemoryCampaigns = new Map<string, CampaignRow>();
const inMemoryJobs = new Map<string, JobRow>();
const inMemoryJobEvents = new Map<string, JobEventRow[]>();
const inMemoryIdempotencyKeys = new Map<string, string>();

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
  if (!db || campaignTableInitialized) {
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
  campaignTableInitialized = true;
}

async function ensureJobTables(): Promise<void> {
  const db = getPool();
  if (!db || jobTablesInitialized) {
    return;
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id UUID PRIMARY KEY,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('queued', 'claimed', 'running', 'completed', 'failed', 'cancelled', 'retrying')),
      payload JSONB NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      result JSONB,
      error_message TEXT,
      attempt INTEGER NOT NULL DEFAULT 0 CHECK (attempt >= 0),
      max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
      idempotency_key TEXT UNIQUE,
      queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      claimed_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ,
      heartbeat_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      failed_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS job_events (
      id BIGSERIAL PRIMARY KEY,
      job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query('CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs (status)');
  await db.query('CREATE INDEX IF NOT EXISTS jobs_updated_at_idx ON jobs (updated_at DESC)');
  await db.query('CREATE INDEX IF NOT EXISTS jobs_queued_at_idx ON jobs (queued_at)');
  await db.query('CREATE INDEX IF NOT EXISTS job_events_job_created_idx ON job_events (job_id, created_at)');

  jobTablesInitialized = true;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toInMemoryRow(id: string, state: unknown, version: number, createdAt?: string): CampaignRow {
  const now = nowIso();
  return {
    id,
    state,
    version,
    created_at: createdAt ?? now,
    updated_at: now,
  };
}

function sanitizeRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function buildNextJobRow(
  current: JobRow,
  nextStatus: JobStatus,
  options: {
    result?: Record<string, unknown> | null;
    errorMessage?: string | null;
    incrementAttempt?: boolean;
  } = {}
): JobRow {
  assertValidJobTransition(current.status, nextStatus);

  const now = nowIso();
  const next: JobRow = {
    ...current,
    status: nextStatus,
    updated_at: now,
    attempt: options.incrementAttempt ? current.attempt + 1 : current.attempt,
    result: options.result === undefined ? current.result : options.result,
    error_message: options.errorMessage === undefined ? current.error_message : options.errorMessage,
  };

  if (nextStatus === 'claimed' && !next.claimed_at) {
    next.claimed_at = now;
  }
  if (nextStatus === 'running') {
    next.started_at = next.started_at ?? now;
    next.heartbeat_at = now;
  }
  if (nextStatus === 'completed') {
    next.completed_at = now;
    next.error_message = null;
  }
  if (nextStatus === 'failed') {
    next.failed_at = now;
  }
  if (nextStatus === 'cancelled') {
    next.cancelled_at = now;
  }
  if (nextStatus === 'retrying') {
    next.heartbeat_at = now;
  }

  return next;
}

async function addInMemoryJobEvent(
  jobId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<JobEventRow> {
  const event: JobEventRow = {
    id: randomUUID(),
    job_id: jobId,
    event_type: eventType,
    payload,
    created_at: nowIso(),
  };

  const existing = inMemoryJobEvents.get(jobId) ?? [];
  existing.push(event);
  inMemoryJobEvents.set(jobId, existing);
  return event;
}

async function insertJobEvent(
  db: Pool,
  jobId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<JobEventRow> {
  const inserted = await db.query<JobEventRow>(
    `
      INSERT INTO job_events (job_id, event_type, payload)
      VALUES ($1::uuid, $2, $3::jsonb)
      RETURNING id::text, job_id::text, event_type, payload, created_at::text
    `,
    [jobId, eventType, JSON.stringify(payload)]
  );

  return {
    ...inserted.rows[0],
    payload: sanitizeRecord(inserted.rows[0]?.payload),
  };
}

async function fetchJobFromDb(db: Pool, jobId: string): Promise<JobRow | null> {
  const result = await db.query<JobRow>(
    `
      SELECT
        id::text,
        job_type,
        status,
        payload,
        metadata,
        result,
        error_message,
        attempt,
        max_attempts,
        idempotency_key,
        queued_at::text,
        claimed_at::text,
        started_at::text,
        heartbeat_at::text,
        completed_at::text,
        failed_at::text,
        cancelled_at::text,
        created_at::text,
        updated_at::text
      FROM jobs
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [jobId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    ...row,
    status: row.status,
    payload: sanitizeRecord(row.payload),
    metadata: sanitizeRecord(row.metadata),
    result: row.result === null ? null : sanitizeRecord(row.result),
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

export async function enqueueJob(input: CreateJobInput): Promise<{ job: JobRow; created: boolean }> {
  const db = getPool();
  const maxAttempts = input.maxAttempts ?? 3;
  const metadata = input.metadata ?? {};

  if (!db) {
    if (input.idempotencyKey) {
      const existingId = inMemoryIdempotencyKeys.get(input.idempotencyKey);
      if (existingId) {
        const existing = inMemoryJobs.get(existingId);
        if (existing) {
          return { job: existing, created: false };
        }
      }
    }

    const now = nowIso();
    const row: JobRow = {
      id: randomUUID(),
      job_type: input.jobType,
      status: 'queued',
      payload: input.payload,
      metadata,
      result: null,
      error_message: null,
      attempt: 0,
      max_attempts: maxAttempts,
      idempotency_key: input.idempotencyKey ?? null,
      queued_at: now,
      claimed_at: null,
      started_at: null,
      heartbeat_at: null,
      completed_at: null,
      failed_at: null,
      cancelled_at: null,
      created_at: now,
      updated_at: now,
    };

    inMemoryJobs.set(row.id, row);
    if (input.idempotencyKey) {
      inMemoryIdempotencyKeys.set(input.idempotencyKey, row.id);
    }
    await addInMemoryJobEvent(row.id, 'status_changed', { to: 'queued', reason: 'enqueued' });
    return { job: row, created: true };
  }

  await ensureJobTables();

  if (input.idempotencyKey) {
    const jobId = randomUUID();
    const inserted = await db.query<JobRow>(
      `
        INSERT INTO jobs (id, job_type, status, payload, metadata, max_attempts, idempotency_key)
        VALUES ($1::uuid, $2, 'queued', $3::jsonb, $4::jsonb, $5, $6)
        ON CONFLICT (idempotency_key)
        DO NOTHING
        RETURNING
          id::text,
          job_type,
          status,
          payload,
          metadata,
          result,
          error_message,
          attempt,
          max_attempts,
          idempotency_key,
          queued_at::text,
          claimed_at::text,
          started_at::text,
          heartbeat_at::text,
          completed_at::text,
          failed_at::text,
          cancelled_at::text,
          created_at::text,
          updated_at::text
      `,
      [jobId, input.jobType, JSON.stringify(input.payload), JSON.stringify(metadata), maxAttempts, input.idempotencyKey]
    );

    if (inserted.rows[0]) {
      const created = {
        ...inserted.rows[0],
        payload: sanitizeRecord(inserted.rows[0].payload),
        metadata: sanitizeRecord(inserted.rows[0].metadata),
        result: inserted.rows[0].result === null ? null : sanitizeRecord(inserted.rows[0].result),
      };
      await insertJobEvent(db, created.id, 'status_changed', { to: 'queued', reason: 'enqueued' });
      return { job: created, created: true };
    }

    const existing = await db.query<JobRow>(
      `
        SELECT
          id::text,
          job_type,
          status,
          payload,
          metadata,
          result,
          error_message,
          attempt,
          max_attempts,
          idempotency_key,
          queued_at::text,
          claimed_at::text,
          started_at::text,
          heartbeat_at::text,
          completed_at::text,
          failed_at::text,
          cancelled_at::text,
          created_at::text,
          updated_at::text
        FROM jobs
        WHERE idempotency_key = $1
        LIMIT 1
      `,
      [input.idempotencyKey]
    );

    const row = existing.rows[0];
    if (!row) {
      throw new Error('Failed to load idempotent job');
    }

    return {
      job: {
        ...row,
        payload: sanitizeRecord(row.payload),
        metadata: sanitizeRecord(row.metadata),
        result: row.result === null ? null : sanitizeRecord(row.result),
      },
      created: false,
    };
  }

  const jobId = randomUUID();
  const created = await db.query<JobRow>(
    `
      INSERT INTO jobs (id, job_type, status, payload, metadata, max_attempts)
      VALUES ($1::uuid, $2, 'queued', $3::jsonb, $4::jsonb, $5)
      RETURNING
        id::text,
        job_type,
        status,
        payload,
        metadata,
        result,
        error_message,
        attempt,
        max_attempts,
        idempotency_key,
        queued_at::text,
        claimed_at::text,
        started_at::text,
        heartbeat_at::text,
        completed_at::text,
        failed_at::text,
        cancelled_at::text,
        created_at::text,
        updated_at::text
    `,
    [jobId, input.jobType, JSON.stringify(input.payload), JSON.stringify(metadata), maxAttempts]
  );

  const row = {
    ...created.rows[0],
    payload: sanitizeRecord(created.rows[0]?.payload),
    metadata: sanitizeRecord(created.rows[0]?.metadata),
    result: created.rows[0]?.result === null ? null : sanitizeRecord(created.rows[0]?.result),
  };
  await insertJobEvent(db, row.id, 'status_changed', { to: 'queued', reason: 'enqueued' });
  return { job: row, created: true };
}

export async function getJob(id: string): Promise<JobRow | null> {
  const db = getPool();
  if (!db) {
    return inMemoryJobs.get(id) ?? null;
  }
  await ensureJobTables();
  return fetchJobFromDb(db, id);
}

export async function getJobEvents(jobId: string, limit = 50): Promise<JobEventRow[]> {
  const db = getPool();
  if (!db) {
    const events = inMemoryJobEvents.get(jobId) ?? [];
    return events.slice(-Math.max(1, limit));
  }
  await ensureJobTables();
  const result = await db.query<JobEventRow>(
    `
      SELECT id::text, job_id::text, event_type, payload, created_at::text
      FROM job_events
      WHERE job_id = $1::uuid
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [jobId, limit]
  );
  return result.rows
    .map((row) => ({ ...row, payload: sanitizeRecord(row.payload) }))
    .reverse();
}

export async function transitionJobState(
  jobId: string,
  nextStatus: JobStatus,
  options: {
    result?: Record<string, unknown> | null;
    errorMessage?: string | null;
    incrementAttempt?: boolean;
  } = {}
): Promise<JobRow | null> {
  const db = getPool();

  if (!db) {
    const current = inMemoryJobs.get(jobId);
    if (!current) {
      return null;
    }

    let next: JobRow;
    try {
      next = buildNextJobRow(current, nextStatus, options);
    } catch (error) {
      throw new InvalidJobTransitionError(error instanceof Error ? error.message : 'Invalid transition');
    }

    inMemoryJobs.set(jobId, next);
    await addInMemoryJobEvent(jobId, 'status_changed', {
      from: current.status,
      to: nextStatus,
    });
    return next;
  }

  await ensureJobTables();
  await db.query('BEGIN');
  try {
    const current = await fetchJobFromDb(db, jobId);
    if (!current) {
      await db.query('ROLLBACK');
      return null;
    }

    let next: JobRow;
    try {
      next = buildNextJobRow(current, nextStatus, options);
    } catch (error) {
      throw new InvalidJobTransitionError(error instanceof Error ? error.message : 'Invalid transition');
    }

    const updated = await db.query<JobRow>(
      `
        UPDATE jobs
        SET
          status = $3,
          result = $4::jsonb,
          error_message = $5,
          attempt = $6,
          claimed_at = $7::timestamptz,
          started_at = $8::timestamptz,
          heartbeat_at = $9::timestamptz,
          completed_at = $10::timestamptz,
          failed_at = $11::timestamptz,
          cancelled_at = $12::timestamptz,
          updated_at = $13::timestamptz
        WHERE id = $1::uuid AND status = $2
        RETURNING
          id::text,
          job_type,
          status,
          payload,
          metadata,
          result,
          error_message,
          attempt,
          max_attempts,
          idempotency_key,
          queued_at::text,
          claimed_at::text,
          started_at::text,
          heartbeat_at::text,
          completed_at::text,
          failed_at::text,
          cancelled_at::text,
          created_at::text,
          updated_at::text
      `,
      [
        jobId,
        current.status,
        next.status,
        next.result ? JSON.stringify(next.result) : null,
        next.error_message,
        next.attempt,
        next.claimed_at,
        next.started_at,
        next.heartbeat_at,
        next.completed_at,
        next.failed_at,
        next.cancelled_at,
        next.updated_at,
      ]
    );

    if (!updated.rows[0]) {
      throw new Error('Concurrent job transition conflict');
    }

    await insertJobEvent(db, jobId, 'status_changed', {
      from: current.status,
      to: nextStatus,
    });

    await db.query('COMMIT');

    return {
      ...updated.rows[0],
      payload: sanitizeRecord(updated.rows[0].payload),
      metadata: sanitizeRecord(updated.rows[0].metadata),
      result: updated.rows[0].result === null ? null : sanitizeRecord(updated.rows[0].result),
    };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

export async function cancelJob(jobId: string): Promise<{ job: JobRow | null; cancelled: boolean }> {
  const current = await getJob(jobId);
  if (!current) {
    return { job: null, cancelled: false };
  }

  if (!['queued', 'claimed', 'running', 'retrying'].includes(current.status)) {
    return { job: current, cancelled: false };
  }

  const updated = await transitionJobState(jobId, 'cancelled');
  return { job: updated, cancelled: updated !== null };
}

export function __resetInMemoryJobStoreForTests(): void {
  inMemoryJobs.clear();
  inMemoryJobEvents.clear();
  inMemoryIdempotencyKeys.clear();
}
