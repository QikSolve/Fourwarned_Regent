'use client';

interface MetricBarProps {
  label: string;
  value: number;
  icon: string;
  showValue?: boolean;
}

export function MetricBar({ label, value, icon, showValue = true }: MetricBarProps) {
  const bgColor = value > 60 ? 'bg-green-500' : value > 30 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium" style={{ color: '#2c1810' }}>
          {icon} {label}
        </span>
        {showValue && (
          <span className="text-xs font-bold" style={{ color: '#2c1810' }}>
            {Math.round(value)}
          </span>
        )}
      </div>
      <div className="h-2 rounded-full" style={{ backgroundColor: '#c4a882' }}>
        <div
          className={`h-2 rounded-full transition-all duration-500 ${bgColor}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
