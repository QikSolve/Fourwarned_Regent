import { NextResponse } from 'next/server';
import { claimAndExecute } from '@/lib/jobs/worker';
import { advisorJobExecutor } from '@/lib/jobs/advisorExecutor';
import { incrementCounter } from '@/lib/observability/metrics';
import { logApiError } from '@/lib/observability/logger';

// Vercel Cron invocations require the Node.js runtime.
export const runtime = 'nodejs';

const MAX_JOBS_PER_INVOCATION = 10;

/**
 * POST /api/worker
 *
 * Cron-triggered worker endpoint. Drains up to MAX_JOBS_PER_INVOCATION
 * advisor-conversation jobs per invocation.
 *
 * Authentication: Vercel automatically sets the CRON_SECRET environment variable
 * and passes it as `Authorization: Bearer <secret>` on cron triggers. The
 * WORKER_CRON_SECRET variable can be used as a local-dev override with the same
 * header scheme.
 *
 * Configure in vercel.json:
 *   { "crons": [{ "path": "/api/worker", "schedule": "* * * * *" }] }
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET ?? process.env.WORKER_CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    let processed = 0;
    let more = true;

    while (more && processed < MAX_JOBS_PER_INVOCATION) {
      more = await claimAndExecute(advisorJobExecutor, {
        jobType: 'advisor-conversation',
      });
      if (more) {
        processed++;
        incrementCounter('workerJobProcessed');
      }
    }

    return NextResponse.json({ processed });
  } catch (error) {
    incrementCounter('apiFailure');
    logApiError('worker.cron.failed', error, {});
    return NextResponse.json({ error: 'Worker invocation failed' }, { status: 500 });
  }
}
