'use client';

import { useGameStore } from '@/lib/gameStore';

export function ScribePanel() {
  const messages = useGameStore(s => s.scribeMessages);
  const phase = useGameStore(s => s.phase);
  const dismissWelcome = useGameStore(s => s.dismissWelcome);

  const latest = messages[messages.length - 1];

  if (!latest) return null;

  const isWelcome = phase === 'welcome';

  return (
    <section className="ledger-panel p-4 mb-4">
      <div className="text-center mb-3 pb-2 border-b ledger-divider">
        <div className="text-sm font-bold ledger-title">📜 The Royal Scribe</div>
      </div>

      <div
        className="overflow-y-auto scrollbar-parchment"
        style={{ maxHeight: isWelcome ? '400px' : '250px' }}
      >
        {messages.slice().reverse().map((msg, idx) => (
          <div
            key={msg.id}
            className={`mb-3 pb-3 ${idx < messages.length - 1 ? 'border-b' : ''}`}
            style={{ borderColor: 'var(--outline-variant)', opacity: idx === 0 ? 1 : 0.72 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold ledger-title">
                {msg.type === 'welcome' ? '👑 Welcome' :
                  msg.type === 'conflict' ? '⚡ Conflict' :
                  msg.type === 'consequence' ? '📊 Consequences' :
                  '📝 Guidance'}
              </span>
              <span className="text-xs ledger-subtitle">
                {msg.season}, Year {msg.year}
              </span>
            </div>
            <p className="text-xs leading-relaxed whitespace-pre-line text-[var(--on-surface)]">
              {msg.text}
            </p>
          </div>
        ))}
      </div>

      {isWelcome && (
        <button
          onClick={dismissWelcome}
          className="wax-button wax-button--primary w-full mt-3 py-2 px-4 text-sm font-bold"
        >
          Begin Governance →
        </button>
      )}
    </section>
  );
}
