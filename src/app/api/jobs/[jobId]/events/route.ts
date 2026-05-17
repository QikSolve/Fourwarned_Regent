import { z } from 'zod';
import { getJob, getJobEvents } from '@/lib/db/client';
import { toJobStatusResponse } from '@/lib/jobs/serialize';
import { isTerminalJobState } from '@/lib/jobs/lifecycle';

const ParamsSchema = z.object({
  jobId: z.string().uuid(),
});

const POLL_INTERVAL_MS = 500;
const MAX_EVENTS = 1_000;

function sseMessage(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * GET /api/jobs/:jobId/events
 *
 * Server-Sent Events stream that delivers real-time job lifecycle updates and
 * partial output chunks.  Emits an initial `snapshot` containing the full job
 * status, then emits incremental `event` and `status` messages every
 * POLL_INTERVAL_MS until the job reaches a terminal state or the client
 * disconnects.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const parsedParams = ParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return new Response(
      JSON.stringify({ error: parsedParams.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { jobId } = parsedParams.data;

  const initJob = await getJob(jobId);
  if (!initJob) {
    return new Response(
      JSON.stringify({ error: 'Job not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sseMessage(data)));
        } catch {
          closed = true;
        }
      };

      // Initial snapshot with full job state.
      const initEvents = await getJobEvents(jobId, MAX_EVENTS);
      enqueue({ type: 'snapshot', job: toJobStatusResponse(initJob, initEvents) });
      let lastEventId: string | null = initEvents.length > 0 ? initEvents[initEvents.length - 1].id : null;

      if (isTerminalJobState(initJob.status)) {
        controller.close();
        return;
      }

      // Poll for incremental updates.
      while (!closed) {
        await new Promise<void>(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        if (closed) break;

        const job = await getJob(jobId).catch(() => null);
        if (!job) break;

        // Fetch only events newer than the last delivered one (cursor-based).
        const newEvents = await getJobEvents(jobId, 0, lastEventId ?? undefined);
        if (newEvents.length > 0) {
          lastEventId = newEvents[newEvents.length - 1].id;
        }

        for (const event of newEvents) {
          enqueue({
            type: 'event',
            event: {
              id: event.id,
              jobId: event.job_id,
              eventType: event.event_type,
              payload: event.payload,
              createdAt: event.created_at,
            },
          });
        }

        enqueue({
          type: 'status',
          status: job.status,
          job: toJobStatusResponse(job, []),
        });

        if (isTerminalJobState(job.status)) break;
      }

      try {
        controller.close();
      } catch {
        // Stream may already be closed.
      }
    },
    cancel() {
      closed = true;
    },
  });

  // Also mark closed when the client disconnects via the request signal.
  request.signal.addEventListener('abort', () => { closed = true; });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
