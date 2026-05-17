import type { KingdomMetrics, Report } from '@/lib/gameTypes';

type MetricKey = keyof KingdomMetrics;

export const METRIC_KEYS: MetricKey[] = ['food', 'morale', 'gold', 'threat', 'adminStrain'];

export function createZeroMetricDelta(): KingdomMetrics {
  return { food: 0, morale: 0, gold: 0, threat: 0, adminStrain: 0 };
}

export function getProjectedDeltaForReport(report: Report): KingdomMetrics {
  const selectedChoice = report.choices.find(choice => choice.id === report.selectedChoiceId);
  const delta = createZeroMetricDelta();

  if (!selectedChoice) return delta;

  for (const key of METRIC_KEYS) {
    delta[key] = selectedChoice.consequences[key] ?? 0;
  }

  return delta;
}

export function getProjectedDeltaForRespondedReports(reports: Report[]): KingdomMetrics {
  return reports.reduce((total, report) => {
    if (report.status !== 'responded') return total;

    const reportDelta = getProjectedDeltaForReport(report);
    for (const key of METRIC_KEYS) {
      total[key] += reportDelta[key];
    }
    return total;
  }, createZeroMetricDelta());
}

export function findNextPendingReportId(reports: Report[], reportId: string): string | null {
  const pendingReports = reports.filter(report => report.status === 'pending');
  if (pendingReports.length === 0) return null;

  const currentIndex = reports.findIndex(report => report.id === reportId);
  if (currentIndex < 0) return pendingReports[0].id;

  const afterCurrent = reports.slice(currentIndex + 1).find(report => report.status === 'pending');
  if (afterCurrent) return afterCurrent.id;

  const beforeCurrent = reports.slice(0, currentIndex).find(report => report.status === 'pending');
  return beforeCurrent?.id ?? null;
}
