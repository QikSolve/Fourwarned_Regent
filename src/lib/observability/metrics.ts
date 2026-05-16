import { getCampaignCount } from '@/lib/db/client';

type CounterName =
  | 'turnAdvanceSuccess'
  | 'turnAdvanceFailure'
  | 'apiFailure'
  | 'chatThreadStarted'
  | 'chatMessageSent'
  | 'chatQuickChipSelected'
  | 'chatModerationBlocked';

const counters: Record<CounterName, number> = {
  turnAdvanceSuccess: 0,
  turnAdvanceFailure: 0,
  apiFailure: 0,
  chatThreadStarted: 0,
  chatMessageSent: 0,
  chatQuickChipSelected: 0,
  chatModerationBlocked: 0,
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
  chatThreadStarted: number;
  chatMessageSent: number;
  chatQuickChipSelected: number;
  chatModerationBlocked: number;
  chatMessagesPerThread: number | null;
  chatFollowUpRate: number | null;
  aiRequestCount: number;
  aiFallbackCount: number;
  aiAverageLatencyMs: number | null;
}> {
  const chatMessagesPerThread = counters.chatThreadStarted > 0
    ? Number((counters.chatMessageSent / counters.chatThreadStarted).toFixed(2))
    : null;
  const chatFollowUpRate = counters.chatMessageSent > 0
    ? Number((counters.chatQuickChipSelected / counters.chatMessageSent).toFixed(3))
    : null;
  return {
    activeCampaigns: await getCampaignCount(),
    turnAdvanceSuccess: counters.turnAdvanceSuccess,
    turnAdvanceFailure: counters.turnAdvanceFailure,
    apiFailure: counters.apiFailure,
    chatThreadStarted: counters.chatThreadStarted,
    chatMessageSent: counters.chatMessageSent,
    chatQuickChipSelected: counters.chatQuickChipSelected,
    chatModerationBlocked: counters.chatModerationBlocked,
    chatMessagesPerThread,
    chatFollowUpRate,
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
