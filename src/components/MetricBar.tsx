'use client';

interface MetricBarProps {
  label: string;
  value: number;
  icon: string;
  showValue?: boolean;
}

export function MetricBar({ label, value, icon, showValue = true }: MetricBarProps) {
  const fillColor = value > 60 ? 'var(--tertiary)' : value > 30 ? 'var(--primary)' : 'var(--error)';

  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-[var(--on-surface)]">
          {icon} {label}
        </span>
        {showValue && (
          <span className="text-xs font-bold text-[var(--on-surface)]">
            {Math.round(value)}
          </span>
        )}
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-container-high)]">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: fillColor }}
        />
      </div>
    </div>
  );
}
