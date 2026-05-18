import type { KingdomMetrics } from '@/lib/gameTypes';
import { METRIC_ICONS } from '@/lib/reports/display';
import { METRIC_KEYS } from '@/lib/reports/projections';

type MetricDelta = Partial<KingdomMetrics>;

interface MetricDeltaChipsProps {
  delta: MetricDelta;
  containerClassName?: string;
  useLegacyStyles?: boolean;
}

export function MetricDeltaChips({ delta, containerClassName = 'flex flex-wrap gap-2', useLegacyStyles = false }: MetricDeltaChipsProps) {
  return (
    <div className={containerClassName}>
      {METRIC_KEYS.map((key) => {
        const value = delta[key] ?? 0;
        if (value === 0) return null;

        const isPositive = value > 0;
        if (useLegacyStyles) {
          return (
            <span
              key={key}
              className="text-xs px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: isPositive ? '#d1fae5' : '#fee2e2',
                color: isPositive ? '#065f46' : '#991b1b',
                borderColor: isPositive ? '#6ee7b7' : '#fca5a5',
              }}
            >
              {METRIC_ICONS[key]} {isPositive ? '+' : ''}{value}
            </span>
          );
        }

        return (
          <span key={key} className={`sigil-chip ${isPositive ? 'sigil-chip--positive' : 'sigil-chip--negative'}`}>
            {METRIC_ICONS[key]} {isPositive ? '+' : ''}{value}
          </span>
        );
      })}
    </div>
  );
}
