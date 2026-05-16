'use client';

import { useMemo, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { getAdvisorChatReply } from '@/lib/ai/runtime';
import type { AdvisorId, ConversationMessage } from '@/lib/gameTypes';

type CouncilMessage = ConversationMessage & { advisorId?: AdvisorId };

export function MultiAdvisorWorkspace() {
  const advisors = useGameStore(s => s.advisors);
  const metrics = useGameStore(s => s.metrics);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AdvisorId[]>(['steward', 'marshal']);
  const [messages, setMessages] = useState<CouncilMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggleAdvisor(advisorId: AdvisorId) {
    setSelected(current => current.includes(advisorId)
      ? current.filter(id => id !== advisorId)
      : [...current, advisorId]);
  }

  async function send() {
    const text = input.trim();
    if (!text || selected.length === 0 || loading) return;

    const userMessage: CouncilMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const advisorReplies = await Promise.all(selected.map(async advisorId => {
      const advisor = advisors.find(item => item.id === advisorId);
      if (!advisor) return null;
      const history = messages
        .filter(msg => msg.role === 'user' || msg.advisorId === advisorId)
        .map(msg => ({ role: msg.role, text: msg.text }));
      const reply = await getAdvisorChatReply(advisor, metrics, history, text, 'Analytical', false);
      return {
        id: `${advisorId}-${Date.now()}`,
        role: 'advisor' as const,
        advisorId,
        text: reply.text,
        timestamp: Date.now(),
        source: reply.source,
      };
    }));

    const resolvedReplies = advisorReplies.filter(Boolean) as CouncilMessage[];
    setMessages(prev => [...prev, ...resolvedReplies]);
    setLoading(false);
  }

  function exportTranscript() {
    const payload = {
      exportedAt: new Date().toISOString(),
      advisors: selected,
      messages,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'multi-advisor-workspace.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="wax-button wax-button--muted w-full text-xs py-2 px-2 mt-2"
      >
        Start Council Debate
      </button>

      {!open ? null : (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="ledger-panel ledger-panel--light flex flex-col mx-4"
            style={{ width: '720px', maxWidth: '100%', height: '82vh' }}
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container)' }}>
              <h2 className="text-sm font-bold ledger-title">Council Debate Workspace</h2>
              <button onClick={() => setOpen(false)} className="wax-button wax-button--muted text-sm px-3 py-1">✕</button>
            </div>

            <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--outline-variant)' }}>
              <p className="text-xs mb-1 ledger-subtitle">Participants:</p>
              <div className="flex flex-wrap gap-2">
                {advisors.map(advisor => (
                  <label key={advisor.id} className="text-xs flex items-center gap-1 text-[var(--on-surface)]">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(advisor.id)}
                      onChange={() => toggleAdvisor(advisor.id)}
                    />
                    {advisor.title} {advisor.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {messages.map(msg => (
                <div key={msg.id} className={`text-xs ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div
                    className="inline-block px-2 py-1 rounded border"
                    style={{
                      backgroundColor: msg.role === 'user' ? 'var(--secondary-container)' : 'var(--surface-container-lowest)',
                      color: msg.role === 'user' ? 'var(--on-secondary-container)' : 'var(--on-surface)',
                      borderColor: 'var(--outline-variant)',
                    }}
                  >
                    {msg.role === 'advisor' && msg.advisorId ? `${advisors.find(a => a.id === msg.advisorId)?.name ?? 'Advisor'}: ` : ''}
                    {msg.text}
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
                </div>
              ))}
              {loading && <p className="text-xs ledger-subtitle">Advisors are composing replies…</p>}
            </div>

            <div className="px-4 py-2 border-t flex items-center gap-2" style={{ borderColor: 'var(--outline-variant)' }}>
              <input
                value={input}
                onChange={event => setInput(event.target.value)}
                placeholder="Ask the council a strategic question…"
                className="quill-input flex-1 text-xs rounded border px-2 py-1.5"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim() || selected.length === 0}
                className="wax-button wax-button--primary text-xs px-3 py-1.5"
              >
                Send
              </button>
              <button
                onClick={exportTranscript}
                className="wax-button wax-button--muted text-xs px-3 py-1.5"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
