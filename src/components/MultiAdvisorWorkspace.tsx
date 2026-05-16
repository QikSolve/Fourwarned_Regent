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
        className="w-full text-xs py-1 px-2 rounded border font-medium mt-2"
        style={{ backgroundColor: '#1a4a6e', color: '#f4e4c1', borderColor: '#153a56' }}
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
            className="rounded-lg border-2 flex flex-col mx-4"
            style={{ backgroundColor: '#f4e4c1', borderColor: '#8b6914', color: '#2c1810', width: '720px', maxWidth: '100%', height: '82vh' }}
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b-2" style={{ borderColor: '#8b6914', backgroundColor: '#ede0c4' }}>
              <h2 className="text-sm font-bold">Council Debate Workspace</h2>
              <button onClick={() => setOpen(false)} className="text-sm px-2 py-1 rounded" style={{ backgroundColor: '#8b2635', color: '#f4e4c1' }}>✕</button>
            </div>

            <div className="px-4 py-2 border-b" style={{ borderColor: '#c4a882' }}>
              <p className="text-xs mb-1" style={{ color: '#6b5744' }}>Participants:</p>
              <div className="flex flex-wrap gap-2">
                {advisors.map(advisor => (
                  <label key={advisor.id} className="text-xs flex items-center gap-1">
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
                    className="inline-block px-2 py-1 rounded"
                    style={{ backgroundColor: msg.role === 'user' ? '#8b2635' : '#ede0c4', color: msg.role === 'user' ? '#f4e4c1' : '#2c1810', border: msg.role === 'advisor' ? '1px solid #c4a882' : 'none' }}
                  >
                    {msg.role === 'advisor' && msg.advisorId ? `${advisors.find(a => a.id === msg.advisorId)?.name ?? 'Advisor'}: ` : ''}
                    {msg.text}
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
                </div>
              ))}
              {loading && <p className="text-xs" style={{ color: '#6b5744' }}>Advisors are composing replies…</p>}
            </div>

            <div className="px-4 py-2 border-t flex items-center gap-2" style={{ borderColor: '#c4a882' }}>
              <input
                value={input}
                onChange={event => setInput(event.target.value)}
                placeholder="Ask the council a strategic question…"
                className="flex-1 text-xs rounded border px-2 py-1.5"
                style={{ backgroundColor: '#fff9f0', borderColor: '#c4a882', color: '#2c1810' }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim() || selected.length === 0}
                className="text-xs px-3 py-1.5 rounded"
                style={{ backgroundColor: '#8b2635', color: '#f4e4c1' }}
              >
                Send
              </button>
              <button
                onClick={exportTranscript}
                className="text-xs px-3 py-1.5 rounded"
                style={{ backgroundColor: '#ede0c4', color: '#6b5744', border: '1px solid #c4a882' }}
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
