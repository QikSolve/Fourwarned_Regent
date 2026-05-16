'use client';

import { useGameStore } from '@/lib/gameStore';

const advisorNames: Record<string, string> = {
  steward: 'Steward Aldric',
  marshal: 'Marshal Garrett',
  merchant: 'Merchant Lyra',
  governor: 'Governor Elric',
};

const urgencyLabel: Record<string, string> = {
  low: 'Low Priority',
  medium: 'Moderate Urgency',
  high: 'High Urgency',
  critical: '⚠ CRITICAL',
};

const urgencyStyles: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: 'rgba(177, 218, 154, 0.12)', text: 'var(--tertiary)', border: 'rgba(177, 218, 154, 0.35)' },
  medium: { bg: 'rgba(242, 202, 80, 0.12)', text: 'var(--primary)', border: 'rgba(242, 202, 80, 0.35)' },
  high: { bg: 'rgba(255, 180, 171, 0.12)', text: 'var(--secondary)', border: 'rgba(255, 180, 171, 0.35)' },
  critical: { bg: 'rgba(255, 180, 171, 0.16)', text: 'var(--error)', border: 'rgba(255, 180, 171, 0.45)' },
};

export function ActiveReport() {
  const reports = useGameStore(s => s.reports);
  const activeReportId = useGameStore(s => s.activeReportId);
  const chooseReportOption = useGameStore(s => s.chooseReportOption);
  const setFreeTextInstruction = useGameStore(s => s.setFreeTextInstruction);

  const report = reports.find(r => r.id === activeReportId);

  if (!report) {
    return (
      <div className="flex items-center justify-center h-full ledger-subtitle">
        <div className="text-center">
          <div className="text-4xl mb-3">📜</div>
          <div className="text-sm font-medium">Select a report from the list</div>
          <div className="text-xs mt-1">to review and respond</div>
        </div>
      </div>
    );
  }

  const urgStyle = urgencyStyles[report.urgency];

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-parchment text-[var(--on-surface)]">
      <div className="rounded-t border border-b-0 p-4" style={{ backgroundColor: 'var(--surface-container-highest)', borderColor: 'var(--outline-variant)' }}>
        <div className="flex justify-between items-start">
          <div>
            <div className="font-bold text-base ledger-title">
              {advisorNames[report.advisorId]}
            </div>
            <div className="text-xs ledger-subtitle">
              {report.season}, Year {report.year}
            </div>
          </div>
          <span
            className="text-xs px-3 py-1 rounded-full border font-bold"
            style={{ backgroundColor: urgStyle.bg, color: urgStyle.text, borderColor: urgStyle.border }}
          >
            {urgencyLabel[report.urgency]}
          </span>
        </div>
        <h3 className="text-sm font-bold mt-2 text-[var(--on-surface)]">{report.title}</h3>
      </div>

      <div className="border border-t-0 p-4" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
        <p className="text-sm leading-relaxed italic text-[var(--on-surface)]">
          &ldquo;{report.body}&rdquo;
        </p>
      </div>

      <div className="border border-t-0 p-3" style={{ backgroundColor: 'var(--surface-container)', borderColor: 'var(--outline-variant)' }}>
        <div className="text-xs font-bold mb-1 ledger-title">📝 The Scribe&apos;s Note:</div>
        <p className="text-xs italic ledger-subtitle">{report.scribesNote}</p>
      </div>

      <div className="border border-t-0 p-4" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
        <div className="text-xs font-bold mb-3 ledger-title">
          🔎 The Scribe Presents Your Options:
        </div>
        <div className="space-y-2">
          {report.choices.map(choice => {
            const isSelected = report.selectedChoiceId === choice.id;
            return (
              <button
                key={choice.id}
                onClick={() => chooseReportOption(report.id, choice.id)}
                className="w-full text-left rounded border p-3 transition-all duration-200"
                style={{
                  backgroundColor: isSelected ? 'var(--surface-container-highest)' : 'var(--surface-container-lowest)',
                  borderColor: isSelected ? 'var(--primary)' : 'var(--outline-variant)',
                  color: 'var(--on-surface)',
                  boxShadow: isSelected ? 'inset 0 0 0 1px rgba(242, 202, 80, 0.15)' : 'none',
                }}
              >
                <div className="text-xs font-bold mb-1" style={{ color: isSelected ? 'var(--primary)' : 'var(--secondary)' }}>
                  {isSelected ? '✓ ' : ''}{choice.label}
                </div>
                <div className="text-xs ledger-subtitle">{choice.description}</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(choice.consequences).map(([key, val]) => {
                    if (val === 0) return null;
                    const isPos = (val as number) > 0;
                    const label = key === 'food' ? '🌾' : key === 'morale' ? '❤️' : key === 'gold' ? '💰' : key === 'threat' ? '⚔️' : '📜';
                    return (
                      <span
                        key={key}
                        className={`sigil-chip ${isPos ? 'sigil-chip--positive' : 'sigil-chip--negative'}`}
                      >
                        {label} {isPos ? '+' : ''}{val}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border border-t-0 p-4" style={{ backgroundColor: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
        <div className="text-xs font-bold mb-2 ledger-title">
          ✍ Additional Royal Instruction (optional):
        </div>
        <textarea
          className="quill-input w-full text-xs rounded border resize-none"
          rows={3}
          placeholder="Write any additional instructions to your advisor..."
          value={report.freeTextInstruction}
          onChange={e => setFreeTextInstruction(report.id, e.target.value)}
        />
      </div>

      {report.status === 'responded' && (
        <div className="border border-t-0 p-3 rounded-b" style={{ backgroundColor: 'rgba(177, 218, 154, 0.12)', borderColor: 'rgba(177, 218, 154, 0.35)' }}>
          <div className="text-xs font-bold text-center text-[var(--tertiary)]">
            ✓ Response recorded. Advance the season when ready.
          </div>
        </div>
      )}
    </div>
  );
}
