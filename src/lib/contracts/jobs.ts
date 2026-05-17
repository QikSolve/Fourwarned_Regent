import { z } from 'zod';

export const JobStatusSchema = z.enum([
  'queued',
  'claimed',
  'running',
  'completed',
  'failed',
  'cancelled',
  'retrying',
]);

export const EnqueueJobRequestSchema = z.object({
  jobType: z.string().min(1).max(100),
  payload: z.record(z.unknown()),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  idempotencyKey: z.string().min(1).max(200).optional(),
  metadata: z.record(z.unknown()).optional(),
}).strict();

export const JobEventSchema = z.object({
  id: z.string().min(1),
  jobId: z.string().uuid(),
  eventType: z.string().min(1),
  payload: z.record(z.unknown()),
  createdAt: z.string().datetime(),
}).strict();

export const JobStatusResponseSchema = z.object({
  id: z.string().uuid(),
  status: JobStatusSchema,
  jobType: z.string().min(1),
  attempt: z.number().int().min(0),
  maxAttempts: z.number().int().min(1),
  idempotencyKey: z.string().nullable(),
  payload: z.record(z.unknown()),
  metadata: z.record(z.unknown()),
  result: z.unknown().nullable(),
  errorMessage: z.string().nullable(),
  timestamps: z.object({
    queuedAt: z.string().datetime(),
    claimedAt: z.string().datetime().nullable(),
    startedAt: z.string().datetime().nullable(),
    heartbeatAt: z.string().datetime().nullable(),
    completedAt: z.string().datetime().nullable(),
    failedAt: z.string().datetime().nullable(),
    cancelledAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }).strict(),
  events: z.array(JobEventSchema),
}).strict();

export type JobStatus = z.infer<typeof JobStatusSchema>;
export type EnqueueJobRequest = z.infer<typeof EnqueueJobRequestSchema>;
export type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>;
