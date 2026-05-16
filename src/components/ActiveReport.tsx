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
  low: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  medium: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  high: { bg: '#fed7aa', text: '#9a3412', border: '#fb923c' },
  critical: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
};

export function ActiveReport() {
  const reports = useGameStore(s => s.reports);
  const activeReportId = useGameStore(s => s.activeReportId);
  const chooseReportOption = useGameStore(s => s.chooseReportOption);
  const setFreeTextInstruction = useGameStore(s => s.setFreeTextInstruction);

  const report = reports.find(r => r.id === activeReportId);

  if (!report) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: '#6b5744' }}>
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
    <div className="flex flex-col h-full overflow-y-auto scrollbar-parchment" style={{ color: '#2c1810' }}>
      {/* Header */}
      <div className="rounded-t border-2 border-b-0 p-4" style={{ backgroundColor: '#e8d4a0', borderColor: '#8b6914' }}>
        <div className="flex justify-between items-start">
          <div>
            <div className="font-bold text-base" style={{ color: '#8b2635' }}>
              {advisorNames[report.advisorId]}
            </div>
            <div className="text-xs" style={{ color: '#6b5744' }}>
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
        <h3 className="text-sm font-bold mt-2" style={{ color: '#2c1810' }}>{report.title}</h3>
      </div>

      {/* Body */}
      <div className="border-2 border-t-0 p-4" style={{ backgroundColor: '#f4e4c1', borderColor: '#8b6914' }}>
        <p className="text-sm leading-relaxed italic" style={{ color: '#2c1810' }}>
          &ldquo;{report.body}&rdquo;
        </p>
      </div>

      {/* Scribe's Note */}
      <div className="border-2 border-t-0 p-3" style={{ backgroundColor: '#ede0c4', borderColor: '#8b6914' }}>
        <div className="text-xs font-bold mb-1" style={{ color: '#8b2635' }}>📝 The Scribe&apos;s Note:</div>
        <p className="text-xs italic" style={{ color: '#4a3028' }}>{report.scribesNote}</p>
      </div>

      {/* Choices */}
      <div className="border-2 border-t-0 p-4" style={{ backgroundColor: '#f4e4c1', borderColor: '#8b6914' }}>
        <div className="text-xs font-bold mb-3" style={{ color: '#8b2635' }}>
          🔎 The Scribe Presents Your Options:
        </div>
        <div className="space-y-2">
          {report.choices.map(choice => {
            const isSelected = report.selectedChoiceId === choice.id;
            return (
              <button
                key={choice.id}
                onClick={() => chooseReportOption(report.id, choice.id)}
                className="w-full text-left rounded border-2 p-3 transition-all duration-200"
                style={{
                  backgroundColor: isSelected ? '#c9a227' : '#ede0c4',
                  borderColor: isSelected ? '#8b6914' : '#c4a882',
                  color: '#2c1810',
                }}
              >
                <div className="text-xs font-bold mb-1" style={{ color: isSelected ? '#2c1810' : '#8b2635' }}>
                  {isSelected ? '✓ ' : ''}{choice.label}
                </div>
                <div className="text-xs" style={{ color: '#4a3028' }}>{choice.description}</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(choice.consequences).map(([key, val]) => {
                    if (val === 0) return null;
                    const isPos = (val as number) > 0;
                    const label = key === 'food' ? '🌾' : key === 'morale' ? '❤️' : key === 'gold' ? '💰' : key === 'threat' ? '⚔️' : '📜';
                    return (
                      <span
                        key={key}
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: isPos ? '#d1fae5' : '#fee2e2',
                          color: isPos ? '#065f46' : '#991b1b',
                        }}
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

      {/* Free Text */}
      <div className="border-2 border-t-0 p-4" style={{ backgroundColor: '#f4e4c1', borderColor: '#8b6914' }}>
        <div className="text-xs font-bold mb-2" style={{ color: '#8b2635' }}>
          ✍ Additional Royal Instruction (optional):
        </div>
        <textarea
          className="w-full text-xs p-2 rounded border resize-none"
          rows={3}
          style={{ backgroundColor: '#ede0c4', borderColor: '#8b6914', color: '#2c1810' }}
          placeholder="Write any additional instructions to your advisor..."
          value={report.freeTextInstruction}
          onChange={(e) => setFreeTextInstruction(report.id, e.target.value)}
        />
      </div>

      {report.status === 'responded' && (
        <div className="border-2 border-t-0 p-3 rounded-b" style={{ backgroundColor: '#d1fae5', borderColor: '#6ee7b7' }}>
          <div className="text-xs font-bold text-center" style={{ color: '#065f46' }}>
            ✓ Response recorded. Advance the season when ready.
          </div>
        </div>
      )}
    </div>
  );
}
