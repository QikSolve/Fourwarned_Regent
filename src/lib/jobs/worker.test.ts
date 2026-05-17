import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  __resetInMemoryStoresForTests,
  enqueueJob,
  getJob,
  getJobEvents,
  transitionJobState,
  cancelJob,
  updateHeartbeat,
  addPartialOutput,
  getStaleJobs,
  claimNextJob,
} from '@/lib/db/client';
import {
  executeJob,
  claimAndExecute,
  recoverStaleJobs,
  type JobExecutor,
} from '@/lib/jobs/worker';

beforeEach(() => {
  __resetInMemoryStoresForTests();
});

// ─── claimNextJob ────────────────────────────────────────────────────────────

test('claimNextJob returns null when no queued jobs exist', async () => {
  const result = await claimNextJob();
  assert.equal(result, null);
});

test('claimNextJob claims the oldest queued job', async () => {
  const { job: job1 } = await enqueueJob({ jobType: 'test', payload: {} });
  const { job: job2 } = await enqueueJob({ jobType: 'test', payload: {} });

  const claimed = await claimNextJob();
  assert.equal(claimed?.id, job1.id);
  assert.equal(claimed?.status, 'claimed');

  const still_queued = await getJob(job2.id);
  assert.equal(still_queued?.status, 'queued');
});

test('claimNextJob respects jobType filter', async () => {
  await enqueueJob({ jobType: 'type-a', payload: {} });
  const { job: jobB } = await enqueueJob({ jobType: 'type-b', payload: {} });

  const claimed = await claimNextJob({ jobType: 'type-b' });
  assert.equal(claimed?.id, jobB.id);
  assert.equal(claimed?.status, 'claimed');
});

test('claimNextJob returns null when no jobs match jobType filter', async () => {
  await enqueueJob({ jobType: 'type-a', payload: {} });
  const result = await claimNextJob({ jobType: 'type-b' });
  assert.equal(result, null);
});

// ─── updateHeartbeat ─────────────────────────────────────────────────────────

test('updateHeartbeat updates heartbeat_at for a running job', async () => {
  const { job } = await enqueueJob({ jobType: 'test', payload: {} });
  await transitionJobState(job.id, 'claimed');
  await transitionJobState(job.id, 'running');

  const before = await getJob(job.id);
  const t1 = before?.heartbeat_at ?? '';

  await new Promise(r => setTimeout(r, 2));
  const updated = await updateHeartbeat(job.id);
  assert.equal(updated, true);

  const after = await getJob(job.id);
  assert.ok(after?.heartbeat_at !== null);
  assert.ok((after?.heartbeat_at ?? '') >= t1);
});

test('updateHeartbeat returns false for a non-active job', async () => {
  const { job } = await enqueueJob({ jobType: 'test', payload: {} });
  const updated = await updateHeartbeat(job.id);
  assert.equal(updated, false);
});

// ─── addPartialOutput ────────────────────────────────────────────────────────

test('addPartialOutput emits a partial_output event', async () => {
  const { job } = await enqueueJob({ jobType: 'test', payload: {} });
  await transitionJobState(job.id, 'claimed');
  await transitionJobState(job.id, 'running');

  await addPartialOutput(job.id, 'Hello, ');
  await addPartialOutput(job.id, 'world!');

  const events = await getJobEvents(job.id);
  const partials = events.filter(e => e.event_type === 'partial_output');
  assert.equal(partials.length, 2);
  assert.equal(partials[0].payload.chunk, 'Hello, ');
  assert.equal(partials[1].payload.chunk, 'world!');
});

test('addPartialOutput includes optional metadata in the event payload', async () => {
  const { job } = await enqueueJob({ jobType: 'test', payload: {} });
  await transitionJobState(job.id, 'claimed');
  await transitionJobState(job.id, 'running');

  await addPartialOutput(job.id, 'token', { tokenIndex: 3 });

  const events = await getJobEvents(job.id);
  const partial = events.find(e => e.event_type === 'partial_output');
  assert.equal(partial?.payload.chunk, 'token');
  assert.equal(partial?.payload.tokenIndex, 3);
});

// ─── getStaleJobs ─────────────────────────────────────────────────────────────

test('getStaleJobs returns running jobs with expired heartbeats', async () => {
  const { job } = await enqueueJob({ jobType: 'test', payload: {} });
  await transitionJobState(job.id, 'claimed');
  await transitionJobState(job.id, 'running');

  // Wait briefly so heartbeat_at is strictly in the past relative to the threshold.
  await new Promise(r => setTimeout(r, 2));

  const stale = await getStaleJobs(0);
  assert.equal(stale.length, 1);
  assert.equal(stale[0].id, job.id);
});

test('getStaleJobs excludes jobs with fresh heartbeats', async () => {
  const { job } = await enqueueJob({ jobType: 'test', payload: {} });
  await transitionJobState(job.id, 'claimed');
  await transitionJobState(job.id, 'running');

  const stale = await getStaleJobs(3600);
  assert.equal(stale.length, 0, `expected 0 stale jobs, got ${stale.length}`);
});

test('getStaleJobs returns claimed jobs with no heartbeat set', async () => {
  const { job } = await enqueueJob({ jobType: 'test', payload: {} });
  await transitionJobState(job.id, 'claimed');
  // claimed_at is set; heartbeat_at is null → stale check falls back to claimed_at

  await new Promise(r => setTimeout(r, 2));

  const stale = await getStaleJobs(0);
  assert.equal(stale.length, 1);
});

// ─── executeJob ──────────────────────────────────────────────────────────────

test('executeJob completes the job with a result and emitted partials', async () => {
  const { job } = await enqueueJob({ jobType: 'test', payload: { q: 1 } });
  const claimed = await transitionJobState(job.id, 'claimed');

  const executor: JobExecutor = async (_job, emitPartial) => {
    await emitPartial('chunk-1');
    await emitPartial('chunk-2');
    return { answer: 42 };
  };

  await executeJob(claimed!, executor);

  const final = await getJob(job.id);
  assert.equal(final?.status, 'completed');
  assert.deepEqual(final?.result, { answer: 42 });

  const events = await getJobEvents(job.id);
  const partials = events.filter(e => e.event_type === 'partial_output');
  assert.equal(partials.length, 2);
});

test('executeJob retries on transient failure within max_attempts', async () => {
  const { job } = await enqueueJob({ jobType: 'test', payload: {}, maxAttempts: 3 });
  const claimed = await transitionJobState(job.id, 'claimed');

  const executor: JobExecutor = async () => {
    throw new Error('transient error');
  };

  await executeJob(claimed!, executor);

  const after = await getJob(job.id);
  assert.equal(after?.status, 'queued', 'should requeue for retry');
  assert.equal(after?.attempt, 1, 'attempt should be incremented');
  assert.equal(after?.error_message, 'transient error');
});

test('executeJob fails permanently when max_attempts is exhausted', async () => {
  const { job } = await enqueueJob({ jobType: 'test', payload: {}, maxAttempts: 1 });
  const claimed = await transitionJobState(job.id, 'claimed');

  const executor: JobExecutor = async () => {
    throw new Error('fatal error');
  };

  await executeJob(claimed!, executor);

  const after = await getJob(job.id);
  assert.equal(after?.status, 'failed');
  assert.equal(after?.error_message, 'fatal error');
});

test('executeJob handles external cancellation during execution', async () => {
  const { job } = await enqueueJob({ jobType: 'test', payload: {} });
  const claimed = await transitionJobState(job.id, 'claimed');

  let abortSignalReceived = false;

  const executor: JobExecutor = async (jobArg, _emitPartial, signal) => {
    // Simulate external cancel (e.g., API call)
    await cancelJob(jobArg.id);

    // Simulate ongoing work that polls the abort signal
    await new Promise<void>((resolve) => {
      const poll = setInterval(() => {
        if (signal.aborted) {
          abortSignalReceived = true;
          clearInterval(poll);
          resolve();
        }
      }, 5);
    });

    return 'should_be_ignored';
  };

  // heartbeatIntervalMs: 10 — heartbeat fires quickly to detect the cancellation
  await executeJob(claimed!, executor, { heartbeatIntervalMs: 10 });

  const final = await getJob(job.id);
  assert.equal(final?.status, 'cancelled', 'job should remain cancelled');
  assert.equal(abortSignalReceived, true, 'executor should receive abort signal');
});

test('executeJob does not transition completed job on cancellation race', async () => {
  // Cover the case where the job was already cancelled before running.
  const { job } = await enqueueJob({ jobType: 'test', payload: {} });
  await cancelJob(job.id);

  // Manually construct a stale claimed-state snapshot to feed to executeJob.
  // In practice this simulates a worker that claimed the job just before cancel.
  const fakeClaimedSnapshot = { ...job, status: 'claimed' as const };

  let executorCalled = false;
  // transitionJobState(job.id, 'running') will fail (cancelled → running is invalid).
  // executeJob detects the cancelled status in the catch block and returns gracefully.
  await executeJob(fakeClaimedSnapshot, async () => { executorCalled = true; return 'ok'; });

  // Executor must not have been called and job must remain cancelled.
  assert.equal(executorCalled, false);
  const final = await getJob(job.id);
  assert.equal(final?.status, 'cancelled');
});

// ─── recoverStaleJobs ────────────────────────────────────────────────────────

test('recoverStaleJobs requeues stale running jobs within max_attempts', async () => {
  const { job } = await enqueueJob({ jobType: 'test', payload: {}, maxAttempts: 3 });
  await transitionJobState(job.id, 'claimed');
  await transitionJobState(job.id, 'running');

  // Small delay ensures heartbeat_at is strictly before the threshold (staleAfterSeconds=0).
  await new Promise(r => setTimeout(r, 2));

  const recovered = await recoverStaleJobs(0);
  assert.equal(recovered, 1);

  const after = await getJob(job.id);
  assert.equal(after?.status, 'queued');
  assert.equal(after?.attempt, 1);
});

test('recoverStaleJobs fails stale jobs that have exhausted max_attempts', async () => {
  const { job } = await enqueueJob({ jobType: 'test', payload: {}, maxAttempts: 1 });
  await transitionJobState(job.id, 'claimed');
  await transitionJobState(job.id, 'running');

  await new Promise(r => setTimeout(r, 2));

  const recovered = await recoverStaleJobs(0);
  assert.equal(recovered, 1);

  const after = await getJob(job.id);
  assert.equal(after?.status, 'failed');
  assert.match(after?.error_message ?? '', /heartbeat timed out/i);
});

test('recoverStaleJobs returns 0 when no stale jobs exist', async () => {
  const { job } = await enqueueJob({ jobType: 'test', payload: {} });
  await transitionJobState(job.id, 'claimed');
  await transitionJobState(job.id, 'running');

  const recovered = await recoverStaleJobs(3600);
  assert.equal(recovered, 0);
});

// ─── claimAndExecute ─────────────────────────────────────────────────────────

test('claimAndExecute returns false when no queued jobs exist', async () => {
  const executor: JobExecutor = async () => 'ok';
  const processed = await claimAndExecute(executor);
  assert.equal(processed, false);
});

test('claimAndExecute claims, executes, and completes a job end-to-end', async () => {
  await enqueueJob({ jobType: 'advisor-conversation', payload: { advisorId: 'steward' } });

  const executor: JobExecutor = async (job, emitPartial) => {
    await emitPartial('thinking…');
    return { transcriptId: 't-1' };
  };

  const processed = await claimAndExecute(executor);
  assert.equal(processed, true);

  // The in-memory store now has no queued jobs
  const again = await claimAndExecute(executor);
  assert.equal(again, false);
});

test('claimAndExecute persists advisor transcript and thread state events', async () => {
  const { job } = await enqueueJob({
    jobType: 'advisor-conversation',
    payload: { advisorId: 'steward', prompt: 'What should I do?' },
  });

  const executor: JobExecutor = async () => ({
    advisorId: 'steward',
    reply: 'Increase granary reserves.',
    transcriptSnapshot: [
      { role: 'user', text: 'What should I do?' },
      { role: 'advisor', text: 'Increase granary reserves.' },
    ],
  });

  const processed = await claimAndExecute(executor);
  assert.equal(processed, true);

  const events = await getJobEvents(job.id);
  const threadState = events.find(e => e.event_type === 'advisor_thread_state');
  assert.equal(threadState?.payload.advisorId, 'steward');
  assert.equal(threadState?.payload.messageCount, 2);

  const transcriptRecords = events.filter(e => e.event_type === 'advisor_transcript');
  assert.equal(transcriptRecords.length, 2);
  assert.equal(transcriptRecords[0]?.payload.role, 'user');
  assert.equal(transcriptRecords[1]?.payload.role, 'advisor');
});

test('claimAndExecute does not duplicate claims under concurrent workers', async () => {
  await enqueueJob({ jobType: 'advisor-conversation', payload: { advisorId: 'steward' } });

  let executions = 0;
  const executor: JobExecutor = async () => {
    executions++;
    await new Promise(r => setTimeout(r, 5));
    return { ok: true };
  };

  const [a, b] = await Promise.all([
    claimAndExecute(executor),
    claimAndExecute(executor),
  ]);

  assert.equal(Number(a) + Number(b), 1, 'exactly one worker should process the single queued job');
  assert.equal(executions, 1, 'executor should run only once');
});
