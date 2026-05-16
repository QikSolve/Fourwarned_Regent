import { KingdomMetrics, Advisor, Report, Procedure, DoctrineCategory } from './gameTypes';

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function applyDelta(metrics: KingdomMetrics, delta: Partial<KingdomMetrics>): KingdomMetrics {
  return {
    food: clamp(metrics.food + (delta.food ?? 0)),
    morale: clamp(metrics.morale + (delta.morale ?? 0)),
    gold: clamp(metrics.gold + (delta.gold ?? 0)),
    threat: clamp(metrics.threat + (delta.threat ?? 0)),
    adminStrain: clamp(metrics.adminStrain + (delta.adminStrain ?? 0)),
  };
}

export function runSimulation(
  metrics: KingdomMetrics,
  advisors: Advisor[],
  reports: Report[],
  procedures: Procedure[],
  doctrines: DoctrineCategory[]
): { newMetrics: KingdomMetrics; newAdvisors: Advisor[] } {
  let current = { ...metrics };

  // Apply player choices from responded reports
  for (const report of reports) {
    if (report.status === 'responded' && report.selectedChoiceId) {
      const choice = report.choices.find(c => c.id === report.selectedChoiceId);
      if (choice) {
        const advisor = advisors.find(a => a.id === report.advisorId);
        const effectMultiplier = advisor ? (advisor.competence / 100) : 0.7;
        const scaledEffects: Partial<KingdomMetrics> = {};
        for (const [key, val] of Object.entries(choice.consequences)) {
          const k = key as keyof KingdomMetrics;
          scaledEffects[k] = Math.round((val as number) * effectMultiplier);
        }
        current = applyDelta(current, scaledEffects);
      }
    }
  }

  // Apply active procedure effects
  for (const procedure of procedures) {
    if (procedure.assignedTo !== null) {
      const advisor = advisors.find(a => a.id === procedure.assignedTo);
      if (advisor) {
        const multiplier = advisor.competence / 100;
        const scaledEffects: Partial<KingdomMetrics> = {};
        for (const [key, val] of Object.entries(procedure.effects)) {
          const k = key as keyof KingdomMetrics;
          scaledEffects[k] = Math.round((val as number) * multiplier);
        }
        current = applyDelta(current, scaledEffects);
      }
    }
  }

  // Apply doctrine effects
  for (const doctrine of doctrines) {
    const selected = doctrine.options.find(o => o.id === doctrine.selected);
    if (selected) {
      const scaledEffects: Partial<KingdomMetrics> = {};
      for (const [key, val] of Object.entries(selected.effects)) {
        const k = key as keyof KingdomMetrics;
        scaledEffects[k] = Math.round((val as number) * 0.5);
      }
      current = applyDelta(current, scaledEffects);
    }
  }

  // Natural drift each season
  current = applyDelta(current, {
    food: -3,
    morale: -1,
    gold: -2,
    threat: 2,
    adminStrain: 1,
  });

  // Update advisor stress and status
  const newAdvisors = advisors.map(advisor => {
    let currentAdvisor = { ...advisor };
    const theirReports = reports.filter(r => r.advisorId === advisor.id);
    let stressDelta = 0;
    for (const report of theirReports) {
      const urgencyMap: Record<string, number> = { low: 5, medium: 8, high: 12, critical: 18 };
      stressDelta += urgencyMap[report.urgency];
      if (report.status !== 'responded') {
        stressDelta += 5;
        const loyaltyHit = report.urgency === 'critical' ? 3 : 1;
        currentAdvisor = { ...currentAdvisor, loyalty: clamp(currentAdvisor.loyalty - loyaltyHit) };
      }
    }

    const newStress = clamp(currentAdvisor.stress + stressDelta - 10);
    let status: Advisor['status'] = 'Active';
    if (newStress > 90) status = 'Critical';
    else if (newStress > 70) status = 'Concerned';

    return { ...currentAdvisor, stress: newStress, status };
  });

  return { newMetrics: current, newAdvisors };
}
