import type { KingdomMetrics, Advisor, Report, Procedure, DoctrineCategory } from '@/types/game';
import { applyDelta, SEASONAL_DRIFT } from './resources';
import { evaluateEvents, type GameEvent } from './events';
import { clamp } from './resources';

export type TurnResolutionResult = {
  newMetrics: KingdomMetrics;
  newAdvisors: Advisor[];
  events: GameEvent[];
};

/**
 * Core deterministic turn resolver.
 *
 * Execution order:
 *   1. Apply player choices (scaled by advisor competence)
 *   2. Apply active procedure effects
 *   3. Apply doctrine effects (at 50% weight)
 *   4. Apply seasonal drift
 *   5. Evaluate & apply emergent events
 *   6. Update advisor stress / status / loyalty
 */
export function resolveTurn(
  metrics: KingdomMetrics,
  advisors: Advisor[],
  reports: Report[],
  procedures: Procedure[],
  doctrines: DoctrineCategory[],
  season: import('@/types/game').Season,
  year: number
): TurnResolutionResult {
  let current = { ...metrics };

  // 1. Player choice effects
  for (const report of reports) {
    if (report.status === 'responded' && report.selectedChoiceId) {
      const choice = report.choices.find(c => c.id === report.selectedChoiceId);
      if (choice) {
        const advisor = advisors.find(a => a.id === report.advisorId);
        const multiplier = advisor ? advisor.competence / 100 : 0.7;
        const scaled: Partial<KingdomMetrics> = {};
        for (const [key, val] of Object.entries(choice.consequences)) {
          scaled[key as keyof KingdomMetrics] = Math.round((val as number) * multiplier);
        }
        current = applyDelta(current, scaled);
      }
    }
  }

  // 2. Active procedure effects
  for (const procedure of procedures) {
    if (procedure.assignedTo !== null) {
      const advisor = advisors.find(a => a.id === procedure.assignedTo);
      const multiplier = advisor ? advisor.competence / 100 : 0.5;
      const scaled: Partial<KingdomMetrics> = {};
      for (const [key, val] of Object.entries(procedure.effects)) {
        scaled[key as keyof KingdomMetrics] = Math.round((val as number) * multiplier);
      }
      current = applyDelta(current, scaled);
    }
  }

  // 3. Doctrine effects (half weight — passive influence)
  for (const doctrine of doctrines) {
    const selected = doctrine.options.find(o => o.id === doctrine.selected);
    if (selected) {
      const scaled: Partial<KingdomMetrics> = {};
      for (const [key, val] of Object.entries(selected.effects)) {
        scaled[key as keyof KingdomMetrics] = Math.round((val as number) * 0.5);
      }
      current = applyDelta(current, scaled);
    }
  }

  // 4. Seasonal drift
  current = applyDelta(current, SEASONAL_DRIFT);

  // 5. Event evaluation
  const events = evaluateEvents(current, season, year);
  for (const event of events) {
    current = applyDelta(current, event.delta);
  }

  // 6. Advisor stress / loyalty / status
  const urgencyStress: Record<string, number> = {
    low: 5,
    medium: 8,
    high: 12,
    critical: 18,
  };

  const newAdvisors = advisors.map(advisor => {
    let a = { ...advisor };
    const theirReports = reports.filter(r => r.advisorId === advisor.id);

    let stressDelta = 0;
    for (const report of theirReports) {
      stressDelta += urgencyStress[report.urgency] ?? 5;
      if (report.status !== 'responded') {
        stressDelta += 5;
        const loyaltyHit = report.urgency === 'critical' ? 3 : 1;
        a = { ...a, loyalty: clamp(a.loyalty - loyaltyHit) };
      }
    }

    const newStress = clamp(a.stress + stressDelta - 10);
    let status: Advisor['status'] = 'Active';
    if (newStress > 90) status = 'Critical';
    else if (newStress > 70) status = 'Concerned';

    return { ...a, stress: newStress, status };
  });

  return { newMetrics: current, newAdvisors, events };
}
