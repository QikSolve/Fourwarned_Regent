import type { JobEventRow, JobRow } from '@/lib/db/client';
import type { JobStatusResponse } from '@/lib/contracts/jobs';

export function toJobStatusResponse(job: JobRow, events: JobEventRow[]): JobStatusResponse {
  return {
    id: job.id,
    status: job.status,
    jobType: job.job_type,
    attempt: job.attempt,
    maxAttempts: job.max_attempts,
    idempotencyKey: job.idempotency_key,
    payload: job.payload,
    metadata: job.metadata,
    result: job.result,
    errorMessage: job.error_message,
    timestamps: {
      queuedAt: job.queued_at,
      claimedAt: job.claimed_at,
      startedAt: job.started_at,
      heartbeatAt: job.heartbeat_at,
      completedAt: job.completed_at,
      failedAt: job.failed_at,
      cancelledAt: job.cancelled_at,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    },
    events: events.map((event) => ({
      id: event.id,
      jobId: event.job_id,
      eventType: event.event_type,
      payload: event.payload,
      createdAt: event.created_at,
    })),
  };
}
