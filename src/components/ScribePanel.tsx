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
    <div className="rounded-lg border-2 p-4 mb-4" style={{ backgroundColor: '#f4e4c1', borderColor: '#8b6914' }}>
      <div className="text-center mb-3 pb-2 border-b" style={{ borderColor: '#8b6914' }}>
        <div className="text-sm font-bold" style={{ color: '#8b2635' }}>📜 The Royal Scribe</div>
      </div>

      <div
        className="overflow-y-auto scrollbar-parchment"
        style={{ maxHeight: isWelcome ? '400px' : '250px' }}
      >
        {messages.slice().reverse().map((msg, idx) => (
          <div
            key={msg.id}
            className={`mb-3 pb-3 ${idx < messages.length - 1 ? 'border-b' : ''}`}
            style={{ borderColor: '#c4a882', opacity: idx === 0 ? 1 : 0.7 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold" style={{ color: '#8b2635' }}>
                {msg.type === 'welcome' ? '👑 Welcome' :
                  msg.type === 'conflict' ? '⚡ Conflict' :
                  msg.type === 'consequence' ? '📊 Consequences' :
                  '📝 Guidance'}
              </span>
              <span className="text-xs" style={{ color: '#6b5744' }}>
                {msg.season}, Year {msg.year}
              </span>
            </div>
            <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: '#2c1810' }}>
              {msg.text}
            </p>
          </div>
        ))}
      </div>

      {isWelcome && (
        <button
          onClick={dismissWelcome}
          className="w-full mt-3 py-2 px-4 rounded border-2 font-bold text-sm"
          style={{ backgroundColor: '#8b2635', color: '#f4e4c1', borderColor: '#6b1d28' }}
        >
          Begin Governance →
        </button>
      )}
    </div>
  );
}
