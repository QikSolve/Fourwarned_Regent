'use client';

import { useGameStore } from '@/lib/gameStore';
import { useJobStatus } from '@/lib/jobs/useJobStatus';
import { SeasonProgressView } from '@/components/SeasonProgressView';
import type { AdvisorId } from '@/lib/gameTypes';
import type { JobStatusResponse } from '@/lib/contracts/jobs';

const ADVISOR_IDS: AdvisorId[] = ['steward', 'marshal', 'merchant', 'governor'];

/**
 * Subscribes to up to four concurrent advisor job statuses and renders a
 * SeasonProgressView aggregating their live states.
 *
 * Each advisor can have at most one active job at a time (tracked via
 * advisorJobIds in the game store). The panel is hidden when no jobs are active.
 *
 * Uses four unconditional useJobStatus calls (one per fixed advisor slot) to
 * satisfy the Rules of Hooks — hooks cannot be called in a loop.
 */
export function AdvisorJobProgress() {
  const advisorJobIds = useGameStore(s => s.advisorJobIds);

  const { job: stewardJob } = useJobStatus(advisorJobIds.steward ?? null);
  const { job: marshalJob } = useJobStatus(advisorJobIds.marshal ?? null);
  const { job: merchantJob } = useJobStatus(advisorJobIds.merchant ?? null);
  const { job: governorJob } = useJobStatus(advisorJobIds.governor ?? null);

  const jobMap: Record<AdvisorId, JobStatusResponse | null> = {
    steward: stewardJob,
    marshal: marshalJob,
    merchant: merchantJob,
    governor: governorJob,
  };

  const activeJobs = ADVISOR_IDS
    .map(id => jobMap[id])
    .filter((j): j is JobStatusResponse => j !== null);

  if (activeJobs.length === 0) return null;

  return (
    <div className="mb-4">
      <SeasonProgressView
        jobs={activeJobs}
        seasonLabel="Active Advisor Work"
      />
    </div>
  );
}
