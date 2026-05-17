'use client';

import type { JobStatus } from '@/lib/contracts/jobs';

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; className: string }
> = {
  queued: {
    label: 'Queued',
    className: 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] border border-[var(--outline-variant)]',
  },
  claimed: {
    label: 'Claimed',
    className: 'bg-[rgba(100,140,255,0.15)] text-[var(--primary)] border border-[var(--primary)]',
  },
  running: {
    label: 'Running',
    className: 'bg-[rgba(100,140,255,0.12)] text-[var(--primary)] border border-[var(--primary)] animate-pulse',
  },
  retrying: {
    label: 'Retrying',
    className: 'bg-[rgba(255,190,40,0.15)] text-[var(--secondary)] border border-[var(--secondary)]',
  },
  completed: {
    label: 'Completed',
    className: 'bg-[rgba(80,200,120,0.15)] text-[var(--tertiary)] border border-[var(--tertiary)]',
  },
  failed: {
    label: 'Failed',
    className: 'bg-[rgba(255,80,80,0.15)] text-[var(--error)] border border-[var(--error)]',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-[var(--surface-container)] text-[var(--on-surface-variant)] border border-[var(--outline-variant)] line-through opacity-60',
  },
};

type Props = {
  status: JobStatus;
  /** Additional CSS classes. */
  className?: string;
};

/**
 * Pill badge that displays the current job lifecycle status.
 *
 * Accessible: uses `role="status"` and `aria-label` so screen readers
 * announce the status without relying solely on colour.
 */
export function JobStatusBadge({ status, className = '' }: Props) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      role="status"
      aria-label={`Job status: ${config.label}`}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      {status === 'running' && (
        <span className="mr-1 inline-block w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      )}
      {config.label}
    </span>
  );
}
