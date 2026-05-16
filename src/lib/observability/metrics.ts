import { getCampaignCount } from '@/lib/db/client';

type CounterName = 'turnAdvanceSuccess' | 'turnAdvanceFailure' | 'apiFailure';

const counters: Record<CounterName, number> = {
  turnAdvanceSuccess: 0,
  turnAdvanceFailure: 0,
  apiFailure: 0,
};

export function incrementCounter(counter: CounterName): void {
  counters[counter] += 1;
}

export async function getRuntimeMetrics(): Promise<{
  activeCampaigns: number;
  turnAdvanceSuccess: number;
  turnAdvanceFailure: number;
  apiFailure: number;
}> {
  return {
    activeCampaigns: await getCampaignCount(),
    turnAdvanceSuccess: counters.turnAdvanceSuccess,
    turnAdvanceFailure: counters.turnAdvanceFailure,
    apiFailure: counters.apiFailure,
  };
}

export function getAlertThresholds() {
  return {
    turnAdvanceFailureRateWarning: 0.05,
    turnAdvanceFailureRateCritical: 0.15,
    apiFailureBurstCritical: 10,
  };
}
