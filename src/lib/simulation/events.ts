import type { KingdomMetrics, Season } from '@/types/game';

export type GameEvent = {
  id: string;
  season: Season;
  year: number;
  description: string;
  delta: Partial<KingdomMetrics>;
};

/**
 * Determine any special events triggered by the current kingdom state.
 * Returns an array of events whose effects should be applied this turn.
 */
export function evaluateEvents(
  metrics: KingdomMetrics,
  season: Season,
  year: number
): GameEvent[] {
  const events: GameEvent[] = [];

  if (metrics.food < 20) {
    events.push({
      id: `famine-${season}-${year}`,
      season,
      year,
      description: 'Famine spreads through the kingdom — morale collapses.',
      delta: { morale: -10, adminStrain: 5 },
    });
  }

  if (metrics.threat > 80) {
    events.push({
      id: `raid-${season}-${year}`,
      season,
      year,
      description: 'Raiders breach the frontier — food and morale suffer.',
      delta: { food: -5, morale: -8, threat: 5 },
    });
  }

  if (metrics.morale < 15) {
    events.push({
      id: `unrest-${season}-${year}`,
      season,
      year,
      description: 'Public unrest erupts — administrative strain spikes.',
      delta: { adminStrain: 10, gold: -5 },
    });
  }

  return events;
}
