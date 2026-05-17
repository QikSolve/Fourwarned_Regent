import type { JobStatus } from '@/lib/contracts/jobs';

const transitionMap: Record<JobStatus, ReadonlySet<JobStatus>> = {
  queued: new Set(['claimed', 'cancelled', 'failed']),
  claimed: new Set(['running', 'cancelled', 'retrying', 'failed']),
  running: new Set(['completed', 'failed', 'cancelled', 'retrying']),
  retrying: new Set(['queued', 'cancelled', 'failed']),
  failed: new Set(['retrying', 'cancelled']),
  completed: new Set(),
  cancelled: new Set(),
};

export function isTerminalJobState(status: JobStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

export function canTransitionJobState(from: JobStatus, to: JobStatus): boolean {
  return transitionMap[from].has(to);
}

export function assertValidJobTransition(from: JobStatus, to: JobStatus): void {
  if (!canTransitionJobState(from, to)) {
    throw new Error(`Invalid job transition from "${from}" to "${to}"`);
  }
}
