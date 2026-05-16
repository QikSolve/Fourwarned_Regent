import type { KingdomMetrics } from '@/types/game';

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function applyDelta(
  metrics: KingdomMetrics,
  delta: Partial<KingdomMetrics>
): KingdomMetrics {
  return {
    food: clamp(metrics.food + (delta.food ?? 0)),
    morale: clamp(metrics.morale + (delta.morale ?? 0)),
    gold: clamp(metrics.gold + (delta.gold ?? 0)),
    threat: clamp(metrics.threat + (delta.threat ?? 0)),
    adminStrain: clamp(metrics.adminStrain + (delta.adminStrain ?? 0)),
  };
}

/** Natural per-season drift applied before player choices. */
export const SEASONAL_DRIFT: Partial<KingdomMetrics> = {
  food: -3,
  morale: -1,
  gold: -2,
  threat: 2,
  adminStrain: 1,
};
