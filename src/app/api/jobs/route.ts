import { NextResponse } from 'next/server';
import { enqueueJob, getJobEvents, IdempotencyConflictError } from '@/lib/db/client';
import { EnqueueJobRequestSchema, JobStatusResponseSchema } from '@/lib/contracts/jobs';
import { toJobStatusResponse } from '@/lib/jobs/serialize';
import { incrementCounter } from '@/lib/observability/metrics';
import { logApiError } from '@/lib/observability/logger';

/**
 * POST /api/jobs
 * Enqueues a new background job in `queued` state.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = EnqueueJobRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { job, created } = await enqueueJob({
      jobType: parsed.data.jobType,
      payload: parsed.data.payload,
      metadata: parsed.data.metadata,
      maxAttempts: parsed.data.maxAttempts,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    const events = await getJobEvents(job.id);

    const response = JobStatusResponseSchema.parse(toJobStatusResponse(job, events));
    return NextResponse.json(response, { status: created ? 201 : 200 });
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    incrementCounter('apiFailure');
    logApiError('jobs.enqueue.failed', error, {});
    return NextResponse.json({ error: 'Failed to enqueue job' }, { status: 500 });
  }
}
