import type { JobRow } from '@/lib/db/client';
import {
  claimNextJob,
  updateHeartbeat,
  addPartialOutput,
  addJobEvent,
  transitionJobState,
  getJob,
  getStaleJobs,
} from '@/lib/db/client';

/**
 * Function that performs the actual work for a job.
 * @param job - The job row (in 'running' state) being executed.
 * @param emitPartial - Callback to emit a partial output chunk.
 * @param signal - AbortSignal that fires if the job is cancelled externally.
 * @returns The job result (stored in job.result on completion).
 */
export type JobExecutor = (
  job: JobRow,
  emitPartial: (chunk: string, meta?: Record<string, unknown>) => Promise<void>,
  signal: AbortSignal
) => Promise<unknown>;

type AdvisorTranscriptMessage = { role: 'user' | 'advisor'; text: string };

function toAdvisorTranscript(result: unknown): { advisorId: string; transcript: AdvisorTranscriptMessage[] } | null {
  if (typeof result !== 'object' || result === null) {
    return null;
  }

  const maybeAdvisorId = (result as { advisorId?: unknown }).advisorId;
  const maybeTranscript = (result as { transcriptSnapshot?: unknown }).transcriptSnapshot;

  if (typeof maybeAdvisorId !== 'string' || !Array.isArray(maybeTranscript)) {
    return null;
  }

  const transcript = maybeTranscript.filter((item): item is AdvisorTranscriptMessage => {
    if (typeof item !== 'object' || item === null) return false;
    const role = (item as { role?: unknown }).role;
    const text = (item as { text?: unknown }).text;
    return (role === 'user' || role === 'advisor') && typeof text === 'string';
  });

  return transcript.length > 0 ? { advisorId: maybeAdvisorId, transcript } : null;
}

async function persistAdvisorConversationArtifacts(job: JobRow, result: unknown): Promise<void> {
  if (job.job_type !== 'advisor-conversation') {
    return;
  }

  const parsed = toAdvisorTranscript(result);
  if (!parsed) {
    return;
  }

  const { advisorId, transcript } = parsed;
  const lastMessage = transcript[transcript.length - 1];

  await addJobEvent(job.id, 'advisor_thread_state', {
    advisorId,
    messageCount: transcript.length,
    lastRole: lastMessage.role,
    lastText: lastMessage.text,
  });

  await Promise.all(transcript.map((message, index) => addJobEvent(job.id, 'advisor_transcript', {
    advisorId,
    index,
    role: message.role,
    text: message.text,
  })));
}

/**
 * Executes a claimed job: transitions it through running → completed/failed/retrying,
 * manages heartbeats, emits partial output, and handles retry/cancel logic.
 */
export async function executeJob(
  job: JobRow,
  executor: JobExecutor,
  options?: { heartbeatIntervalMs?: number }
): Promise<void> {
  const heartbeatIntervalMs = options?.heartbeatIntervalMs ?? 10_000;
  const abortController = new AbortController();
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let runningJob: JobRow | null = null;

  try {
    runningJob = await transitionJobState(job.id, 'running');
    if (!runningJob) {
      throw new Error(`Job ${job.id} not found when transitioning to running`);
    }

    // Heartbeat: updates timestamp and detects external cancellation.
    heartbeatTimer = setInterval(() => {
      void (async () => {
        try {
          const current = await getJob(job.id);
          if (!current || current.status === 'cancelled') {
            abortController.abort('cancelled');
            return;
          }
          await updateHeartbeat(job.id).catch(() => undefined);
        } catch {
          // Ignore transient errors; next heartbeat interval will retry.
        }
      })();
    }, heartbeatIntervalMs);

    const result = await executor(
      runningJob,
      async (chunk, meta) => {
        if (!abortController.signal.aborted) {
          await addPartialOutput(job.id, chunk, meta);
        }
      },
      abortController.signal
    );

    if (abortController.signal.aborted) return;

    await persistAdvisorConversationArtifacts(job, result);

    await transitionJobState(job.id, 'completed', { result });
  } catch (error) {
    if (abortController.signal.aborted) return;

    const errorMessage = error instanceof Error ? error.message : String(error);

    const current = await getJob(job.id);
    if (!current || current.status === 'cancelled') return;

    const attempt = runningJob?.attempt ?? job.attempt;
    const maxAttempts = runningJob?.max_attempts ?? job.max_attempts;
    const shouldRetry = attempt + 1 < maxAttempts;

    if (shouldRetry) {
      await transitionJobState(job.id, 'retrying', { incrementAttempt: true, errorMessage });
      await transitionJobState(job.id, 'queued');
    } else {
      await transitionJobState(job.id, 'failed', { errorMessage });
    }
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    abortController.abort();
  }
}

/**
 * Claims the next available queued job and executes it.
 * Returns true if a job was found and processed, false if no jobs were available.
 */
export async function claimAndExecute(
  executor: JobExecutor,
  options?: { jobType?: string; heartbeatIntervalMs?: number }
): Promise<boolean> {
  const job = await claimNextJob({ jobType: options?.jobType });
  if (!job) return false;
  await executeJob(job, executor, { heartbeatIntervalMs: options?.heartbeatIntervalMs });
  return true;
}

/**
 * Finds jobs whose heartbeat has expired and requeues or fails them.
 * Returns the number of stale jobs recovered.
 */
export async function recoverStaleJobs(staleAfterSeconds = 60): Promise<number> {
  const stale = await getStaleJobs(staleAfterSeconds);
  let count = 0;

  for (const job of stale) {
    const shouldRetry = job.attempt + 1 < job.max_attempts;
    try {
      if (shouldRetry) {
        await transitionJobState(job.id, 'retrying', {
          incrementAttempt: true,
          errorMessage: 'Worker heartbeat timed out',
        });
        await transitionJobState(job.id, 'queued');
      } else {
        await transitionJobState(job.id, 'failed', {
          errorMessage: 'Worker heartbeat timed out — max attempts exhausted',
        });
      }
      count++;
    } catch {
      // Already transitioned by another worker; skip.
    }
  }

  return count;
}

/**
 * Runs a continuous worker loop: recovers stale jobs, then claims and executes
 * queued jobs one at a time until the optional AbortSignal fires.
 */
export async function runWorkerLoop(
  executor: JobExecutor,
  options?: {
    pollIntervalMs?: number;
    heartbeatIntervalMs?: number;
    staleJobTimeoutSeconds?: number;
    jobType?: string;
    signal?: AbortSignal;
  }
): Promise<void> {
  const pollIntervalMs = options?.pollIntervalMs ?? 1_000;
  const staleJobTimeoutSeconds = options?.staleJobTimeoutSeconds ?? 60;
  const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

  while (!options?.signal?.aborted) {
    await recoverStaleJobs(staleJobTimeoutSeconds).catch(() => undefined);

    const processed = await claimAndExecute(executor, {
      jobType: options?.jobType,
      heartbeatIntervalMs: options?.heartbeatIntervalMs,
    }).catch(() => false);

    if (!processed && !options?.signal?.aborted) {
      await sleep(pollIntervalMs);
    }
  }
}
