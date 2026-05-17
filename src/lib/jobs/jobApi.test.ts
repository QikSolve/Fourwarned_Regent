import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { POST as enqueueJobRoute } from '@/app/api/jobs/route';
import { GET as getJobStatusRoute } from '@/app/api/jobs/[jobId]/route';
import { POST as cancelJobRoute } from '@/app/api/jobs/[jobId]/cancel/route';
import {
  __resetInMemoryStoresForTests,
  enqueueJob,
  getJobEvents,
  transitionJobState,
  InvalidJobTransitionError,
  IdempotencyConflictError,
} from '@/lib/db/client';

beforeEach(() => {
  __resetInMemoryStoresForTests();
});

async function getStatusFromApi(jobId: string): Promise<{ status: string; errorMessage: string | null }> {
  const statusResponse = await getJobStatusRoute(
    new Request(`http://localhost/api/jobs/${jobId}`),
    { params: Promise.resolve({ jobId }) }
  );
  assert.equal(statusResponse.status, 200);
  return statusResponse.json();
}

test('job lifecycle supports queue -> claim -> running -> completed with audit events', async () => {
  const { job } = await enqueueJob({
    jobType: 'advisor-conversation',
    payload: { advisorId: 'steward' },
  });

  assert.equal((await getStatusFromApi(job.id)).status, 'queued');
  const claimed = await transitionJobState(job.id, 'claimed');
  assert.equal((await getStatusFromApi(job.id)).status, 'claimed');
  const running = await transitionJobState(job.id, 'running');
  assert.equal((await getStatusFromApi(job.id)).status, 'running');
  const completed = await transitionJobState(job.id, 'completed', { result: { transcriptId: 't-1' } });
  const completedStatus = await getStatusFromApi(job.id);

  assert.equal(claimed?.status, 'claimed');
  assert.equal(running?.status, 'running');
  assert.equal(completed?.status, 'completed');
  assert.equal(completedStatus.status, 'completed');
  assert.equal(completedStatus.errorMessage, null);
  assert.deepEqual((completed?.result as Record<string, unknown>)?.transcriptId, 't-1');

  const events = await getJobEvents(job.id);
  assert.equal(events.length, 4);
});

test('job lifecycle supports failure and retry transitions', async () => {
  const { job } = await enqueueJob({
    jobType: 'advisor-conversation',
    payload: { advisorId: 'marshal' },
    maxAttempts: 2,
  });

  await transitionJobState(job.id, 'claimed');
  await transitionJobState(job.id, 'running');
  const failed = await transitionJobState(job.id, 'failed', { errorMessage: 'model timeout' });
  const failedStatus = await getStatusFromApi(job.id);
  const retrying = await transitionJobState(job.id, 'retrying', { incrementAttempt: true });
  assert.equal((await getStatusFromApi(job.id)).status, 'retrying');
  const queuedAgain = await transitionJobState(job.id, 'queued');
  const queuedStatus = await getStatusFromApi(job.id);

  assert.equal(failed?.status, 'failed');
  assert.equal(failed?.error_message, 'model timeout');
  assert.equal(failedStatus.status, 'failed');
  assert.equal(failedStatus.errorMessage, 'model timeout');
  assert.equal(retrying?.status, 'retrying');
  assert.equal(retrying?.attempt, 1);
  assert.equal(queuedAgain?.status, 'queued');
  assert.equal(queuedStatus.status, 'queued');
});

test('invalid transition is rejected', async () => {
  const { job } = await enqueueJob({
    jobType: 'advisor-conversation',
    payload: { advisorId: 'merchant' },
  });

  await assert.rejects(() => transitionJobState(job.id, 'completed'), InvalidJobTransitionError);
  assert.equal((await getStatusFromApi(job.id)).status, 'queued');
});

test('enqueue and status routes validate payload and return normalized response', async () => {
  const invalidResponse = await enqueueJobRoute(
    new Request('http://localhost/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobType: '', payload: {} }),
    })
  );
  assert.equal(invalidResponse.status, 400);

  const enqueueResponse = await enqueueJobRoute(
    new Request('http://localhost/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobType: 'advisor-conversation',
        payload: { advisorId: 'governor', prompt: 'Assess famine relief options' },
        idempotencyKey: 'job-1',
      }),
    })
  );

  assert.equal(enqueueResponse.status, 201);
  const created = await enqueueResponse.json();
  assert.equal(created.status, 'queued');
  assert.equal(created.jobType, 'advisor-conversation');

  const idempotentReplay = await enqueueJobRoute(
    new Request('http://localhost/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobType: 'advisor-conversation',
        payload: { advisorId: 'governor', prompt: 'Assess famine relief options' },
        idempotencyKey: 'job-1',
      }),
    })
  );
  assert.equal(idempotentReplay.status, 200);
  const replay = await idempotentReplay.json();
  assert.equal(replay.id, created.id);

  const statusResponse = await getJobStatusRoute(
    new Request(`http://localhost/api/jobs/${created.id}`),
    { params: Promise.resolve({ jobId: created.id }) }
  );

  assert.equal(statusResponse.status, 200);
  const statusPayload = await statusResponse.json();
  assert.equal(statusPayload.id, created.id);
  assert.equal(statusPayload.status, 'queued');

  const invalidIdResponse = await getJobStatusRoute(
    new Request('http://localhost/api/jobs/not-a-uuid'),
    { params: Promise.resolve({ jobId: 'not-a-uuid' }) }
  );
  assert.equal(invalidIdResponse.status, 400);
  const invalidIdPayload = await invalidIdResponse.json();
  assert.equal(invalidIdPayload.error, 'Invalid job ID');

  const missingJobId = randomUUID();
  const missingResponse = await getJobStatusRoute(
    new Request(`http://localhost/api/jobs/${missingJobId}`),
    { params: Promise.resolve({ jobId: missingJobId }) }
  );
  assert.equal(missingResponse.status, 404);
  const missingPayload = await missingResponse.json();
  assert.equal(missingPayload.error, 'Job not found');
});

test('enqueue returns 409 when idempotency key is reused with different parameters', async () => {
  await enqueueJob({
    jobType: 'advisor-conversation',
    payload: { advisorId: 'steward' },
    idempotencyKey: 'key-mismatch-test',
  });

  await assert.rejects(
    () => enqueueJob({
      jobType: 'advisor-conversation',
      payload: { advisorId: 'DIFFERENT_ADVISOR' },
      idempotencyKey: 'key-mismatch-test',
    }),
    IdempotencyConflictError
  );

  const mismatchResponse = await enqueueJobRoute(
    new Request('http://localhost/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobType: 'advisor-conversation',
        payload: { advisorId: 'DIFFERENT_ADVISOR' },
        idempotencyKey: 'key-mismatch-test',
      }),
    })
  );
  assert.equal(mismatchResponse.status, 409);
});

test('cancel route cancels active job and rejects invalid IDs/non-cancellable states', async () => {
  const { job } = await enqueueJob({
    jobType: 'advisor-conversation',
    payload: { advisorId: 'marshal' },
  });

  const invalidIdResponse = await cancelJobRoute(
    new Request('http://localhost/api/jobs/not-a-uuid/cancel', { method: 'POST' }),
    { params: Promise.resolve({ jobId: 'not-a-uuid' }) }
  );
  assert.equal(invalidIdResponse.status, 400);
  const invalidIdPayload = await invalidIdResponse.json();
  assert.equal(invalidIdPayload.error, 'Invalid job ID');

  const cancelledResponse = await cancelJobRoute(
    new Request(`http://localhost/api/jobs/${job.id}/cancel`, { method: 'POST' }),
    { params: Promise.resolve({ jobId: job.id }) }
  );
  assert.equal(cancelledResponse.status, 200);
  const cancelledPayload = await cancelledResponse.json();
  assert.equal(cancelledPayload.status, 'cancelled');

  const { job: completedJob } = await enqueueJob({
    jobType: 'advisor-conversation',
    payload: { advisorId: 'steward' },
  });
  await transitionJobState(completedJob.id, 'claimed');
  await transitionJobState(completedJob.id, 'running');
  await transitionJobState(completedJob.id, 'completed', { result: { done: true } });

  const nonCancellableResponse = await cancelJobRoute(
    new Request(`http://localhost/api/jobs/${completedJob.id}/cancel`, { method: 'POST' }),
    { params: Promise.resolve({ jobId: completedJob.id }) }
  );
  assert.equal(nonCancellableResponse.status, 409);

  const missingJobId = randomUUID();
  const missingResponse = await cancelJobRoute(
    new Request(`http://localhost/api/jobs/${missingJobId}/cancel`, { method: 'POST' }),
    { params: Promise.resolve({ jobId: missingJobId }) }
  );
  assert.equal(missingResponse.status, 404);
  const missingPayload = await missingResponse.json();
  assert.equal(missingPayload.error, 'Job not found');
});
