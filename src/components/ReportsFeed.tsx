'use client';

import { useGameStore } from '@/lib/gameStore';
import { Report } from '@/lib/gameTypes';
import { MetricDeltaChips } from '@/components/MetricDeltaChips';
import { ADVISOR_ICONS, ADVISOR_NAMES } from '@/lib/reports/display';
import { getProjectedDeltaForReport, getProjectedDeltaForRespondedReports } from '@/lib/reports/projections';

const urgencyStyles = {
  low: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7', label: 'Low' },
  medium: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', label: 'Medium' },
  high: { bg: '#fed7aa', text: '#9a3412', border: '#fb923c', label: 'High' },
  critical: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', label: 'CRITICAL' },
};

interface ReportItemProps {
  report: Report;
  isActive: boolean;
  onClick: () => void;
}

function ReportItem({ report, isActive, onClick }: ReportItemProps) {
  const urgStyle = urgencyStyles[report.urgency];

  return (
    <div
      className={`report-card rounded border-2 p-3 mb-2 cursor-pointer ${isActive ? 'ring-2' : ''}`}
      style={{
        backgroundColor: isActive ? '#e8d4a0' : '#f4e4c1',
        borderColor: isActive ? '#8b2635' : '#8b6914',
        outline: isActive ? '2px solid #8b2635' : 'none',
      }}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <span className="text-base">{ADVISOR_ICONS[report.advisorId]}</span>
          <div>
            <div className="text-xs font-bold capitalize" style={{ color: '#8b2635' }}>
              {ADVISOR_NAMES[report.advisorId]}
            </div>
            <div className="text-xs" style={{ color: '#6b5744' }}>{report.season}, Year {report.year}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className="text-xs px-2 py-0.5 rounded-full border font-medium"
            style={{ backgroundColor: urgStyle.bg, color: urgStyle.text, borderColor: urgStyle.border }}
          >
            {urgStyle.label}
          </span>
          {report.status === 'responded' && (
            <span className="text-xs px-2 py-0.5 rounded-full border" style={{ backgroundColor: '#d1fae5', color: '#065f46', borderColor: '#6ee7b7' }}>
              ✓ Responded
            </span>
          )}
        </div>
      </div>
      <div className="text-xs font-medium" style={{ color: '#2c1810' }}>{report.title}</div>
    </div>
  );
}

export function ReportsFeed() {
  const reports = useGameStore(s => s.reports);
  const activeReportId = useGameStore(s => s.activeReportId);
  const selectReport = useGameStore(s => s.selectReport);
  const advanceTurn = useGameStore(s => s.advanceTurn);
  const isAdvancingTurn = useGameStore(s => s.isAdvancingTurn);

  const respondedCount = reports.filter(r => r.status === 'responded').length;
  const totalCount = reports.length;
  const canAdvance = respondedCount > 0 && !isAdvancingTurn;
  const allAddressed = totalCount > 0 && respondedCount === totalCount;
  const projectedTotalDelta = getProjectedDeltaForRespondedReports(reports);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-bold" style={{ color: '#c9a227' }}>
          📋 Seasonal Reports
        </h2>
        <span className="text-xs" style={{ color: '#f4e4c1' }}>
          {respondedCount}/{totalCount} addressed
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-parchment">
        {reports.length === 0 ? (
          <div className="text-center py-8" style={{ color: '#6b5744' }}>
            <div className="text-2xl mb-2">📜</div>
            <div className="text-sm">No reports this season.</div>
          </div>
        ) : allAddressed ? (
          <div className="space-y-2">
            <div className="rounded border p-3" style={{ backgroundColor: '#f4e4c1', borderColor: '#8b6914' }}>
              <div className="text-xs font-bold text-center" style={{ color: '#8b2635' }}>✅ All advisors heard</div>
            </div>
            {reports.map(report => {
              const selectedChoice = report.choices.find(choice => choice.id === report.selectedChoiceId);
              const projectedDelta = getProjectedDeltaForReport(report);
              return (
                <div
                  key={report.id}
                  className="rounded border p-3 cursor-pointer"
                  style={{ backgroundColor: '#f4e4c1', borderColor: '#8b6914' }}
                  onClick={() => selectReport(report.id)}
                >
                  <div className="text-xs font-bold capitalize" style={{ color: '#8b2635' }}>{ADVISOR_NAMES[report.advisorId]}</div>
                  <div className="text-xs mt-1" style={{ color: '#2c1810' }}>{selectedChoice?.label ?? 'No response selected'}</div>
                  <MetricDeltaChips delta={projectedDelta} containerClassName="flex flex-wrap gap-1 mt-2" useLegacyStyles />
                </div>
              );
            })}
          </div>
        ) : (
          reports.map(report => (
            <ReportItem
              key={report.id}
              report={report}
              isActive={activeReportId === report.id}
              onClick={() => selectReport(report.id === activeReportId ? null : report.id)}
            />
          ))
        )}
      </div>

      <div className="mt-3 pt-3 border-t" style={{ borderColor: '#8b6914' }}>
        {canAdvance && (
          <div className="mb-2 rounded border p-2" style={{ backgroundColor: '#f4e4c1', borderColor: '#8b6914' }}>
            <p className="text-[11px] mb-1 text-center" style={{ color: '#6b5744' }}>Pending season net</p>
            <MetricDeltaChips delta={projectedTotalDelta} containerClassName="flex flex-wrap justify-center gap-1" useLegacyStyles />
          </div>
        )}
        <button
          disabled={!canAdvance}
          onClick={advanceTurn}
          className="w-full py-2 px-4 rounded border-2 font-bold text-sm transition-all duration-200"
          style={{
            backgroundColor: canAdvance ? '#8b2635' : '#4a3028',
            color: canAdvance ? '#f4e4c1' : '#6b5744',
            borderColor: canAdvance ? '#6b1d28' : '#3a2018',
            cursor: canAdvance ? 'pointer' : 'not-allowed',
          }}
        >
          {isAdvancingTurn ? '⏳ Advancing...' : canAdvance ? '⏭ Advance Season' : '⚠ Respond to Reports First'}
        </button>
        {!canAdvance && !isAdvancingTurn && (
          <p className="text-xs text-center mt-1" style={{ color: '#6b5744' }}>
            Address at least one report before advancing
          </p>
        )}
      </div>
    </div>
  );
}
