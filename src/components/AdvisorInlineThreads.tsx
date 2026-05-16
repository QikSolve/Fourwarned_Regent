'use client';

import { useMemo } from 'react';
import { useGameStore } from '@/lib/gameStore';
import type { AdvisorId } from '@/lib/gameTypes';

export function AdvisorInlineThreads() {
  const advisors = useGameStore(s => s.advisors);
  const conversations = useGameStore(s => s.conversations);
  const openChatModal = useGameStore(s => s.openChatModal);

  const activeThreads = useMemo(() => {
    return advisors
      .map(advisor => ({
        advisor,
        conversation: conversations[advisor.id as AdvisorId],
      }))
      .filter(item => (item.conversation?.messages.length ?? 0) > 0);
  }, [advisors, conversations]);

  return (
    <div className="ledger-panel ledger-panel--light p-3 mt-3">
      <h3 className="text-xs font-bold mb-2 ledger-title">🧵 Advisor Threads</h3>
      {activeThreads.length === 0 ? (
        <p className="text-xs ledger-subtitle">No active threads yet.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {activeThreads.map(({ advisor, conversation }) => (
            <div key={advisor.id} className="rounded border p-2" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}>
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-xs font-semibold text-[var(--on-surface)]">{advisor.title} {advisor.name}</span>
                <button
                  onClick={() => openChatModal(advisor.id)}
                  className="wax-button wax-button--muted text-xs px-2 py-0.5"
                >
                  Open
                </button>
              </div>
              {conversation?.messages.slice(-2).map(msg => (
                <div key={msg.id} className="text-xs mb-1 last:mb-0 text-[var(--on-surface)]">
                  <span className="font-semibold">{msg.role === 'user' ? 'You' : advisor.name}:</span> {msg.text}
                  {msg.role === 'advisor' && msg.source && (
                    <span
                      className="ml-1 px-1 rounded"
                      style={{
                        color: msg.source === 'ai' ? 'var(--tertiary)' : msg.source === 'moderated' ? 'var(--secondary)' : 'var(--primary)',
                        backgroundColor: msg.source === 'ai'
                          ? 'rgba(177, 218, 154, 0.12)'
                          : msg.source === 'moderated'
                            ? 'rgba(255, 180, 171, 0.12)'
                            : 'rgba(242, 202, 80, 0.12)',
                        fontSize: '10px',
                      }}
                    >
                      {msg.source === 'ai' ? 'AI' : msg.source === 'moderated' ? 'Moderated' : 'Fallback'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
