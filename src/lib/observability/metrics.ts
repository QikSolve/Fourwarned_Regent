import { getCampaignCount } from '@/lib/db/client';

type CounterName = 'turnAdvanceSuccess' | 'turnAdvanceFailure' | 'apiFailure';

const counters: Record<CounterName, number> = {
  turnAdvanceSuccess: 0,
  turnAdvanceFailure: 0,
  apiFailure: 0,
};

// AI telemetry
let aiRequestCount = 0;
let aiFallbackCount = 0;
let aiTotalLatencyMs = 0;

export function incrementCounter(counter: CounterName): void {
  counters[counter] += 1;
}

export function recordAiRequest(latencyMs: number, usedFallback = false): void {
  aiRequestCount += 1;
  aiTotalLatencyMs += latencyMs;
  if (usedFallback) aiFallbackCount += 1;
}

export async function getRuntimeMetrics(): Promise<{
  activeCampaigns: number;
  turnAdvanceSuccess: number;
  turnAdvanceFailure: number;
  apiFailure: number;
  aiRequestCount: number;
  aiFallbackCount: number;
  aiAverageLatencyMs: number | null;
}> {
  return {
    activeCampaigns: await getCampaignCount(),
    turnAdvanceSuccess: counters.turnAdvanceSuccess,
    turnAdvanceFailure: counters.turnAdvanceFailure,
    apiFailure: counters.apiFailure,
    aiRequestCount,
    aiFallbackCount,
    aiAverageLatencyMs: aiRequestCount > 0 ? Math.round(aiTotalLatencyMs / aiRequestCount) : null,
  };
}

export function getAlertThresholds() {
  return {
    turnAdvanceFailureRateWarning: 0.05,
    turnAdvanceFailureRateCritical: 0.15,
    apiFailureBurstCritical: 10,
  };
}
