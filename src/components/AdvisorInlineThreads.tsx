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
    <div className="rounded-lg border-2 p-3 mt-3" style={{ backgroundColor: 'rgba(44,24,16,0.5)', borderColor: '#8b6914' }}>
      <h3 className="text-xs font-bold mb-2" style={{ color: '#c9a227' }}>🧵 Advisor Threads</h3>
      {activeThreads.length === 0 ? (
        <p className="text-xs" style={{ color: '#8b6914' }}>No active threads yet.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {activeThreads.map(({ advisor, conversation }) => (
            <div key={advisor.id} className="rounded border p-2" style={{ borderColor: '#8b6914', backgroundColor: '#f4e4c1' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: '#2c1810' }}>{advisor.title} {advisor.name}</span>
                <button
                  onClick={() => openChatModal(advisor.id)}
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: '#ede0c4', color: '#6b5744', border: '1px solid #c4a882' }}
                >
                  Open
                </button>
              </div>
              {conversation?.messages.slice(-2).map(msg => (
                <div key={msg.id} className="text-xs mb-1 last:mb-0" style={{ color: '#2c1810' }}>
                  <span className="font-semibold">{msg.role === 'user' ? 'You' : advisor.name}:</span> {msg.text}
                  {msg.role === 'advisor' && msg.source && (
                    <span
                      className="ml-1 px-1 rounded"
                      style={{
                        color: msg.source === 'ai' ? '#065f46' : msg.source === 'moderated' ? '#7c2d12' : '#92400e',
                        backgroundColor: msg.source === 'ai' ? '#d1fae5' : msg.source === 'moderated' ? '#ffedd5' : '#fef3c7',
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
