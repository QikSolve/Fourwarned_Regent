import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
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
  result: unknown | null;
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
export class JobTransitionConflictError extends Error {}
export class IdempotencyConflictError extends Error {}

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

  // Only create tables automatically outside production; in production the
  // migration runner (20260517_job_queue_and_events.sql) is the source of truth.
  if (process.env.NODE_ENV === 'production') {
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
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query('CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs (status)');
  await db.query('CREATE INDEX IF NOT EXISTS jobs_updated_at_idx ON jobs (updated_at DESC)');
  await db.query('CREATE INDEX IF NOT EXISTS jobs_queued_at_idx ON jobs (queued_at)');
  await db.query('CREATE UNIQUE INDEX IF NOT EXISTS job_events_uuid_idx ON job_events (uuid)');
  await db.query('CREATE INDEX IF NOT EXISTS job_events_job_created_idx ON job_events (job_id, created_at ASC, id ASC)');

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
    console.warn('[db/client] sanitizeRecord: expected plain object, got %s — coercing to {}', Array.isArray(value) ? 'array' : typeof value);
    return {};
  }
  return value as Record<string, unknown>;
}

function buildNextJobRow(
  current: JobRow,
  nextStatus: JobStatus,
  options: {
    result?: unknown | null;
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
  if (nextStatus === 'queued') {
    // Clear heartbeat so COALESCE(heartbeat_at, claimed_at) uses the fresh
    // claimed_at after the next claim, not a stale timestamp from a prior run.
    next.heartbeat_at = null;
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
  client: Pool | PoolClient,
  jobId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<JobEventRow> {
  const inserted = await client.query<{ id: string; job_id: string; event_type: string; payload: unknown; created_at: string }>(
    `
      INSERT INTO job_events (job_id, event_type, payload)
      VALUES ($1::uuid, $2, $3::jsonb)
      RETURNING uuid::text AS id, job_id::text, event_type, payload, created_at::text
    `,
    [jobId, eventType, JSON.stringify(payload)]
  );

  return {
    ...inserted.rows[0],
    payload: sanitizeRecord(inserted.rows[0]?.payload),
  };
}

async function fetchJobFromDb(client: Pool | PoolClient, jobId: string): Promise<JobRow | null> {
  const result = await client.query<Omit<JobRow, 'result'> & { result: unknown }>(
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
    result: row.result ?? null,
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

function jobFieldsMatch(stored: JobRow, input: CreateJobInput): boolean {
  const inputMaxAttempts = input.maxAttempts ?? 3;
  const inputMetadata = input.metadata ?? {};
  return (
    stored.job_type === input.jobType &&
    stored.max_attempts === inputMaxAttempts &&
    JSON.stringify(stored.payload) === JSON.stringify(input.payload) &&
    JSON.stringify(stored.metadata) === JSON.stringify(inputMetadata)
  );
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
          if (!jobFieldsMatch(existing, input)) {
            throw new IdempotencyConflictError(
              `Idempotency key '${input.idempotencyKey}' already exists with different job parameters`
            );
          }
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
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const inserted = await client.query<Omit<JobRow, 'result'> & { result: unknown }>(
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
          result: inserted.rows[0].result ?? null,
        };
        await insertJobEvent(client, created.id, 'status_changed', { to: 'queued', reason: 'enqueued' });
        await client.query('COMMIT');
        return { job: created, created: true };
      }

      const existing = await client.query<Omit<JobRow, 'result'> & { result: unknown }>(
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

      await client.query('COMMIT');

      const row = existing.rows[0];
      if (!row) {
        throw new Error('Failed to load idempotent job');
      }

      const storedJob: JobRow = {
        ...row,
        payload: sanitizeRecord(row.payload),
        metadata: sanitizeRecord(row.metadata),
        result: row.result ?? null,
      };

      if (!jobFieldsMatch(storedJob, input)) {
        throw new IdempotencyConflictError(
          `Idempotency key '${input.idempotencyKey}' already exists with different job parameters`
        );
      }

      return { job: storedJob, created: false };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  const jobId = randomUUID();
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const created = await client.query<Omit<JobRow, 'result'> & { result: unknown }>(
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
      result: created.rows[0]?.result ?? null,
    };
    await insertJobEvent(client, row.id, 'status_changed', { to: 'queued', reason: 'enqueued' });
    await client.query('COMMIT');
    return { job: row, created: true };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function getJob(id: string): Promise<JobRow | null> {
  const db = getPool();
  if (!db) {
    return inMemoryJobs.get(id) ?? null;
  }
  await ensureJobTables();
  return fetchJobFromDb(db, id);
}

export async function getJobEvents(jobId: string, limit = 50, afterId?: string): Promise<JobEventRow[]> {
  const db = getPool();
  if (!db) {
    const events = inMemoryJobEvents.get(jobId) ?? [];
    if (afterId) {
      const idx = events.findIndex(e => e.id === afterId);
      const slice = idx >= 0 ? events.slice(idx + 1) : events;
      return limit > 0 ? slice.slice(0, limit) : slice;
    }
    return events.slice(-Math.max(1, limit));
  }
  await ensureJobTables();
  const result = await db.query<{ id: string; job_id: string; event_type: string; payload: unknown; created_at: string }>(
    `
      SELECT uuid::text AS id, job_id::text, event_type, payload, created_at::text
      FROM job_events
      WHERE job_id = $1::uuid
        AND ($3::uuid IS NULL OR (created_at, uuid) > (
          SELECT created_at, uuid FROM job_events WHERE uuid = $3::uuid
        ))
      ORDER BY created_at ASC, id ASC
      LIMIT NULLIF($2, 0)
    `,
    [jobId, limit, afterId ?? null]
  );
  return result.rows.map((row) => ({ ...row, payload: sanitizeRecord(row.payload) }));
}

export async function transitionJobState(
  jobId: string,
  nextStatus: JobStatus,
  options: {
    result?: unknown | null;
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
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const current = await fetchJobFromDb(client, jobId);
    if (!current) {
      await client.query('ROLLBACK');
      return null;
    }

    let next: JobRow;
    try {
      next = buildNextJobRow(current, nextStatus, options);
    } catch (error) {
      throw new InvalidJobTransitionError(error instanceof Error ? error.message : 'Invalid transition');
    }

    const updated = await client.query<Omit<JobRow, 'result'> & { result: unknown }>(
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
        next.result !== null ? JSON.stringify(next.result) : null,
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
      throw new JobTransitionConflictError('Concurrent job transition conflict');
    }

    await insertJobEvent(client, jobId, 'status_changed', {
      from: current.status,
      to: nextStatus,
    });

    await client.query('COMMIT');

    return {
      ...updated.rows[0],
      payload: sanitizeRecord(updated.rows[0].payload),
      metadata: sanitizeRecord(updated.rows[0].metadata),
      result: updated.rows[0].result ?? null,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function claimNextJob(options: { jobType?: string } = {}): Promise<JobRow | null> {
  const db = getPool();

  if (!db) {
    const queued = [...inMemoryJobs.values()].find(
      j => j.status === 'queued' && (!options.jobType || j.job_type === options.jobType)
    );
    if (!queued) return null;
    return transitionJobState(queued.id, 'claimed');
  }

  await ensureJobTables();
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const claimSql = options.jobType
      ? `
          UPDATE jobs
          SET status = 'claimed', claimed_at = NOW(), heartbeat_at = NULL, updated_at = NOW()
          WHERE id = (
            SELECT id FROM jobs
            WHERE status = 'queued' AND job_type = $1
            ORDER BY queued_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          ) AND status = 'queued'
          RETURNING
            id::text, job_type, status, payload, metadata, result, error_message,
            attempt, max_attempts, idempotency_key, queued_at::text, claimed_at::text,
            started_at::text, heartbeat_at::text, completed_at::text, failed_at::text,
            cancelled_at::text, created_at::text, updated_at::text
        `
      : `
          UPDATE jobs
          SET status = 'claimed', claimed_at = NOW(), heartbeat_at = NULL, updated_at = NOW()
          WHERE id = (
            SELECT id FROM jobs
            WHERE status = 'queued'
            ORDER BY queued_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          ) AND status = 'queued'
          RETURNING
            id::text, job_type, status, payload, metadata, result, error_message,
            attempt, max_attempts, idempotency_key, queued_at::text, claimed_at::text,
            started_at::text, heartbeat_at::text, completed_at::text, failed_at::text,
            cancelled_at::text, created_at::text, updated_at::text
        `;

    const claimed = await client.query<Omit<JobRow, 'result'> & { result: unknown }>(
      claimSql,
      options.jobType ? [options.jobType] : []
    );

    if (!claimed.rows[0]) {
      await client.query('COMMIT');
      return null;
    }

    const row: JobRow = {
      ...claimed.rows[0],
      payload: sanitizeRecord(claimed.rows[0].payload),
      metadata: sanitizeRecord(claimed.rows[0].metadata),
      result: claimed.rows[0].result ?? null,
    };

    await insertJobEvent(client, row.id, 'status_changed', { from: 'queued', to: 'claimed' });
    await client.query('COMMIT');
    return row;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function updateHeartbeat(jobId: string): Promise<boolean> {
  const db = getPool();

  if (!db) {
    const job = inMemoryJobs.get(jobId);
    if (!job || !['running', 'claimed'].includes(job.status)) return false;
    inMemoryJobs.set(jobId, { ...job, heartbeat_at: nowIso(), updated_at: nowIso() });
    return true;
  }

  await ensureJobTables();
  const result = await db.query<{ id: string }>(
    `UPDATE jobs
     SET heartbeat_at = NOW(), updated_at = NOW()
     WHERE id = $1::uuid AND status IN ('running', 'claimed')
     RETURNING id::text`,
    [jobId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function addPartialOutput(
  jobId: string,
  chunk: string,
  metadata: Record<string, unknown> = {}
): Promise<JobEventRow> {
  return addJobEvent(jobId, 'partial_output', { chunk, ...metadata });
}

export async function addJobEvent(
  jobId: string,
  eventType: string,
  payload: Record<string, unknown> = {}
): Promise<JobEventRow> {
  const db = getPool();

  if (!db) {
    return addInMemoryJobEvent(jobId, eventType, payload);
  }

  await ensureJobTables();
  return insertJobEvent(db, jobId, eventType, payload);
}

export async function getStaleJobs(staleAfterSeconds: number): Promise<JobRow[]> {
  const db = getPool();

  if (!db) {
    const threshold = new Date(Date.now() - staleAfterSeconds * 1000).toISOString();
    return [...inMemoryJobs.values()].filter(j => {
      if (!['running', 'claimed'].includes(j.status)) return false;
      const lastAlive = j.heartbeat_at ?? j.claimed_at ?? '';
      return lastAlive < threshold;
    });
  }

  await ensureJobTables();
  const result = await db.query<Omit<JobRow, 'result'> & { result: unknown }>(
    `SELECT
       id::text, job_type, status, payload, metadata, result, error_message,
       attempt, max_attempts, idempotency_key, queued_at::text, claimed_at::text,
       started_at::text, heartbeat_at::text, completed_at::text, failed_at::text,
       cancelled_at::text, created_at::text, updated_at::text
     FROM jobs
     WHERE status IN ('running', 'claimed')
       AND COALESCE(heartbeat_at, claimed_at) < NOW() - ($1 || ' seconds')::interval`,
    [String(staleAfterSeconds)]
  );
  return result.rows.map(row => ({
    ...row,
    payload: sanitizeRecord(row.payload),
    metadata: sanitizeRecord(row.metadata),
    result: row.result ?? null,
  }));
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

export function __resetInMemoryStoresForTests(): void {
  inMemoryJobs.clear();
  inMemoryJobEvents.clear();
  inMemoryIdempotencyKeys.clear();
  inMemoryCampaigns.clear();
  campaignTableInitialized = false;
  jobTablesInitialized = false;
}

/** @deprecated Use __resetInMemoryStoresForTests instead */
export function __resetInMemoryJobStoreForTests(): void {
  __resetInMemoryStoresForTests();
}
