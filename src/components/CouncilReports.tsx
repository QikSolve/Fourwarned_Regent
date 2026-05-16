'use client';

import { useGameStore } from '@/lib/gameStore';
import { Report } from '@/lib/gameTypes';

const urgencyStyles = {
  low: { bg: 'rgba(177, 218, 154, 0.12)', text: 'var(--tertiary)', border: 'rgba(177, 218, 154, 0.35)', label: 'Low' },
  medium: { bg: 'rgba(242, 202, 80, 0.12)', text: 'var(--primary)', border: 'rgba(242, 202, 80, 0.35)', label: 'Medium' },
  high: { bg: 'rgba(255, 180, 171, 0.12)', text: 'var(--secondary)', border: 'rgba(255, 180, 171, 0.35)', label: 'High' },
  critical: { bg: 'rgba(255, 180, 171, 0.16)', text: 'var(--error)', border: 'rgba(255, 180, 171, 0.45)', label: 'CRITICAL' },
};

const advisorIcons: Record<string, string> = {
  steward: '⚖️',
  marshal: '⚔️',
  merchant: '💼',
  governor: '📜',
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
      className="report-card ledger-panel ledger-panel--light rounded p-3 mb-2 cursor-pointer"
      style={{
        backgroundColor: isActive ? 'var(--surface-container-highest)' : 'var(--surface-container-low)',
        borderColor: isActive ? 'var(--primary)' : 'var(--outline-variant)',
        outline: isActive ? '1px solid rgba(242, 202, 80, 0.35)' : 'none',
      }}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <span className="text-base">{advisorIcons[report.advisorId]}</span>
          <div>
            <div className="text-xs font-bold capitalize text-[var(--primary)]">
              {report.advisorId === 'steward' ? 'Steward Aldric'
                : report.advisorId === 'marshal' ? 'Marshal Garrett'
                : report.advisorId === 'merchant' ? 'Merchant Lyra'
                : 'Governor Elric'}
            </div>
            <div className="text-xs ledger-subtitle">{report.season}, Year {report.year}</div>
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
            <span className="sigil-chip sigil-chip--positive">
              ✓ Responded
            </span>
          )}
        </div>
      </div>
      <div className="text-xs font-medium text-[var(--on-surface)]">{report.title}</div>
    </div>
  );
}

export function CouncilReports() {
  const reports = useGameStore(s => s.reports);
  const activeReportId = useGameStore(s => s.activeReportId);
  const selectReport = useGameStore(s => s.selectReport);
  const advanceTurn = useGameStore(s => s.advanceTurn);
  const isAdvancingTurn = useGameStore(s => s.isAdvancingTurn);

  const respondedCount = reports.filter(r => r.status === 'responded').length;
  const totalCount = reports.length;
  const canAdvance = respondedCount > 0 && !isAdvancingTurn;

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-bold ledger-title">
          📋 Seasonal Reports
        </h2>
        <span className="text-xs ledger-subtitle">
          {respondedCount}/{totalCount} addressed
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-parchment">
        {reports.length === 0 ? (
          <div className="text-center py-8 ledger-subtitle">
            <div className="text-2xl mb-2">📜</div>
            <div className="text-sm">No reports this season.</div>
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

      <div className="mt-3 pt-3 border-t ledger-divider">
        <button
          disabled={!canAdvance}
          onClick={advanceTurn}
          className={`wax-button w-full py-2 px-4 text-sm font-bold ${canAdvance ? '' : 'wax-button--muted'}`}
        >
          {isAdvancingTurn ? '⏳ Advancing...' : canAdvance ? '⏭ Advance Season' : '⚠ Respond to Reports First'}
        </button>
        {!canAdvance && !isAdvancingTurn && (
          <p className="text-xs text-center mt-1 ledger-subtitle">
            Address at least one report before advancing
          </p>
        )}
      </div>
    </div>
  );
}
