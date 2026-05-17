'use client';

import { useMemo } from 'react';
import type { JobStatus, JobStatusResponse } from '@/lib/contracts/jobs';
import { JobStatusBadge } from '@/components/JobStatusBadge';

type Props = {
  /** Jobs belonging to the current season/turn. */
  jobs: JobStatusResponse[];
  /** Human-readable label for the season/turn (e.g. "Season 3 — Autumn"). */
  seasonLabel?: string;
  className?: string;
};

const TERMINAL_STATUSES: JobStatus[] = ['completed', 'failed', 'cancelled'];

/**
 * Season-level progress view that aggregates job statuses across all advisor
 * work items for the current turn.
 *
 * Shows an overall progress bar (completed jobs / total), per-job rows with
 * live status badges, and summary counts.
 */
export function SeasonProgressView({ jobs, seasonLabel = 'Season Progress', className = '' }: Props) {
  const stats = useMemo(() => {
    const counts: Record<JobStatus, number> = {
      queued: 0,
      claimed: 0,
      running: 0,
      retrying: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };
    for (const j of jobs) counts[j.status]++;
    const done = TERMINAL_STATUSES.reduce((sum, s) => sum + counts[s], 0);
    const pct = jobs.length > 0 ? Math.round((done / jobs.length) * 100) : 0;
    return { counts, done, pct };
  }, [jobs]);

  return (
    <section
      className={`ledger-panel p-4 space-y-3 ${className}`}
      aria-label={seasonLabel}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold ledger-title">{seasonLabel}</h3>
        <span className="text-xs ledger-subtitle" aria-live="polite">
          {stats.done}/{jobs.length} done
        </span>
      </div>

      {/* Overall progress bar */}
      <div
        role="progressbar"
        aria-valuenow={stats.pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${stats.pct}% of advisor work complete`}
        className="h-2 rounded-full bg-[var(--surface-container-high)] overflow-hidden"
      >
        <div
          className="h-full rounded-full bg-[var(--tertiary)] transition-all duration-300"
          style={{ width: `${stats.pct}%` }}
        />
      </div>

      {/* Summary counts */}
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Status summary">
        {(['running', 'claimed', 'queued', 'retrying', 'completed', 'failed', 'cancelled'] as JobStatus[])
          .filter(s => stats.counts[s] > 0)
          .map(s => (
            <div key={s} className="flex items-center gap-1">
              <JobStatusBadge status={s} />
              <dd className="text-[var(--on-surface-variant)]">×{stats.counts[s]}</dd>
            </div>
          ))}
      </dl>

      {/* Per-job rows */}
      {jobs.length > 0 && (
        <ul
          className="space-y-1"
          aria-label="Individual advisor job statuses"
          aria-live="polite"
          aria-relevant="additions text"
        >
          {jobs.map((job) => {
            const advisorId =
              typeof job.metadata.advisorId === 'string' ? job.metadata.advisorId
              : typeof job.payload.advisorId === 'string' ? job.payload.advisorId
              : null;

            const label = advisorId ?? job.jobType;
            const partialCount = job.events.filter(e => e.eventType === 'partial_output').length;

            return (
              <li
                key={job.id}
                className="flex items-center justify-between gap-2 text-xs py-0.5"
              >
                <span className="truncate text-[var(--on-surface)] capitalize">
                  {label}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {partialCount > 0 && job.status === 'running' && (
                    <span
                      className="text-[var(--on-surface-variant)] opacity-60"
                      aria-label={`${partialCount} partial outputs received`}
                    >
                      {partialCount} chunk{partialCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  <JobStatusBadge status={job.status} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {jobs.length === 0 && (
        <p className="text-xs ledger-subtitle italic">No advisor jobs for this season.</p>
      )}
    </section>
  );
}
