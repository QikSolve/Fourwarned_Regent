import type { AdvisorId, KingdomMetrics } from '@/lib/gameTypes';

type MetricKey = keyof KingdomMetrics;

export const ADVISOR_NAMES: Record<AdvisorId, string> = {
  steward: 'Steward Aldric',
  marshal: 'Marshal Garrett',
  merchant: 'Merchant Lyra',
  governor: 'Governor Elric',
};

export const ADVISOR_ICONS: Record<AdvisorId, string> = {
  steward: '⚖️',
  marshal: '⚔️',
  merchant: '💼',
  governor: '📜',
};

export const METRIC_ICONS: Record<MetricKey, string> = {
  food: '🌾',
  morale: '❤️',
  gold: '💰',
  threat: '⚔️',
  adminStrain: '📜',
};
