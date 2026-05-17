import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cancelJob, getJobEvents, InvalidJobTransitionError, JobTransitionConflictError } from '@/lib/db/client';
import { JobStatusResponseSchema } from '@/lib/contracts/jobs';
import { toJobStatusResponse } from '@/lib/jobs/serialize';
import { incrementCounter } from '@/lib/observability/metrics';
import { logApiError } from '@/lib/observability/logger';

const ParamsSchema = z.object({
  jobId: z.string().uuid(),
});

/**
 * POST /api/jobs/:jobId/cancel
 * Cancels a queued/active job and returns the updated status payload.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const parsedParams = ParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json(
        { error: 'Invalid job ID', details: parsedParams.error.flatten() },
        { status: 400 }
      );
    }

    const { job, cancelled } = await cancelJob(parsedParams.data.jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const events = await getJobEvents(job.id);
    const response = JobStatusResponseSchema.parse(toJobStatusResponse(job, events));
    if (!cancelled) {
      return NextResponse.json(
        { error: `Job in status '${job.status}' cannot be cancelled`, job: response },
        { status: 409 }
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof InvalidJobTransitionError || error instanceof JobTransitionConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    incrementCounter('apiFailure');
    logApiError('jobs.cancel.failed', error, {});
    return NextResponse.json({ error: 'Failed to cancel job' }, { status: 500 });
  }
}
