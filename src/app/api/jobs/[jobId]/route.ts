import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getJob, getJobEvents } from '@/lib/db/client';
import { JobStatusResponseSchema } from '@/lib/contracts/jobs';
import { toJobStatusResponse } from '@/lib/jobs/serialize';
import { incrementCounter } from '@/lib/observability/metrics';
import { logApiError } from '@/lib/observability/logger';

const ParamsSchema = z.object({
  jobId: z.string().uuid(),
});

/**
 * GET /api/jobs/:jobId
 * Returns normalized lifecycle status and metadata for a job.
 */
export async function GET(
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

    const job = await getJob(parsedParams.data.jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const events = await getJobEvents(job.id);
    const response = JobStatusResponseSchema.parse(toJobStatusResponse(job, events));
    return NextResponse.json(response);
  } catch (error) {
    incrementCounter('apiFailure');
    logApiError('jobs.status.failed', error, {});
    return NextResponse.json({ error: 'Failed to load job status' }, { status: 500 });
  }
}
