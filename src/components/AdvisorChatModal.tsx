'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { ADVISOR_META } from '@/lib/ai/advisorMeta';
import type { AdvisorId, AdvisorTone } from '@/lib/gameTypes';

const QUICK_CHIPS = ['Why?', 'Alternative', 'Pros/Cons', 'Explain more'] as const;
const TONE_OPTIONS = ['Concise', 'Analytical', 'Collaborative'] as const;

function TypingIndicator() {
  return (
    <div className="flex items-end gap-1 px-3 py-2 rounded-lg max-w-xs ledger-panel" style={{ backgroundColor: 'var(--surface-container)' }}>
      <span className="text-xs ledger-subtitle">Composing reply</span>
      <span className="flex gap-0.5 mb-0.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="inline-block w-1 h-1 rounded-full animate-bounce"
            style={{ backgroundColor: 'var(--primary)', animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </div>
  );
}

export function AdvisorChatModal() {
  const showChatModal = useGameStore(s => s.showChatModal);
  const chatAdvisorId = useGameStore(s => s.chatAdvisorId);
  const advisors = useGameStore(s => s.advisors);
  const conversations = useGameStore(s => s.conversations);
  const isChatLoading = useGameStore(s => s.isChatLoading);
  const closeChatModal = useGameStore(s => s.closeChatModal);
  const sendChatMessage = useGameStore(s => s.sendChatMessage);
  const clearConversation = useGameStore(s => s.clearConversation);
  const toggleConversationPersistence = useGameStore(s => s.toggleConversationPersistence);
  const setConversationTone = useGameStore(s => s.setConversationTone);

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const advisor = advisors.find(a => a.id === chatAdvisorId);
  const conversation = chatAdvisorId ? conversations[chatAdvisorId as AdvisorId] : null;
  const messages = useMemo(() => conversation?.messages ?? [], [conversation]);
  const isPersistent = conversation?.isPersistent ?? false;
  const tone = (conversation?.tone ?? 'Concise') as AdvisorTone;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatLoading]);

  if (!showChatModal || !advisor || !chatAdvisorId) return null;

  const meta = ADVISOR_META[advisor.id] ?? { avatar: '👤', bio: '' };

  function handleSend(text: string, options?: { isQuickFollowUp?: boolean }) {
    const trimmed = text.trim();
    if (!trimmed || isChatLoading) return;
    setInputText('');
    void sendChatMessage(chatAdvisorId as AdvisorId, trimmed, options);
  }

  function handleExport() {
    if (!chatAdvisorId || !advisor) return;
    const payload = {
      advisorId: chatAdvisorId,
      advisor: `${advisor.title} ${advisor.name}`,
      tone,
      isPersistent,
      exportedAt: new Date().toISOString(),
      messages,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `advisor-${chatAdvisorId}-conversation.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputText);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={closeChatModal}
      role="dialog"
      aria-modal="true"
      aria-label={`Conversation with ${advisor.title} ${advisor.name}`}
    >
      <div
        className="ledger-panel ledger-panel--light flex flex-col mx-4"
        style={{
          width: '560px',
          maxWidth: '100%',
          height: '80vh',
          maxHeight: '680px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container)' }}
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="text-2xl w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0"
              style={{ backgroundColor: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)' }}
              aria-hidden="true"
            >
              {meta.avatar}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-[var(--on-surface)]">
                  {advisor.title} {advisor.name}
                </span>
                <span className="sigil-chip">{advisor.region}</span>
              </div>
              <p className="text-xs mt-0.5 leading-relaxed ledger-subtitle">{meta.bio}</p>
            </div>
          </div>
          <button
            onClick={closeChatModal}
            className="wax-button wax-button--muted px-3 py-1 text-sm ml-2 flex-shrink-0"
            aria-label="Close conversation"
          >
            ✕
          </button>
        </div>

        <div
          className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
          style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-low)' }}
        >
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs ledger-subtitle">Tone:</span>
            {TONE_OPTIONS.map(t => (
              <button
                key={t}
                onClick={() => setConversationTone(chatAdvisorId as AdvisorId, t)}
                className="text-xs px-2 py-0.5 rounded transition-colors border"
                style={{
                  backgroundColor: tone === t ? 'var(--primary-container)' : 'var(--surface-container-lowest)',
                  color: tone === t ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
                  borderColor: 'var(--outline-variant)',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => clearConversation(chatAdvisorId as AdvisorId)}
              className="wax-button wax-button--muted text-xs px-2 py-1"
              title="Clear conversation"
              aria-label="Clear conversation history"
            >
              Clear
            </button>
            <label className="flex items-center gap-1 cursor-pointer" title="Save conversation across sessions">
              <span className="text-xs ledger-subtitle">Remember</span>
              <span
                className="relative inline-block w-8 h-4 rounded-full transition-colors"
                style={{ backgroundColor: isPersistent ? 'var(--tertiary)' : 'var(--surface-container-high)' }}
                onClick={() => toggleConversationPersistence(chatAdvisorId as AdvisorId)}
                role="switch"
                aria-checked={isPersistent}
                aria-label="Persist conversation memory"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' || e.key === ' ' ? toggleConversationPersistence(chatAdvisorId as AdvisorId) : undefined}
              >
                <span
                  className="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all"
                  style={{ left: isPersistent ? '18px' : '2px' }}
                />
              </span>
            </label>
            <button
              onClick={handleExport}
              className="wax-button wax-button--muted text-xs px-2 py-1"
              title="Export transcript as JSON"
              aria-label="Export conversation transcript"
            >
              Export
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          role="log"
          aria-live="polite"
          aria-label="Conversation messages"
        >
          {messages.length === 0 && (
            <div className="text-center py-8 ledger-subtitle">
              <div className="text-2xl mb-2">{meta.avatar}</div>
              <p className="text-xs italic">&ldquo;Open a conversation to seek counsel, Your Majesty.&rdquo;</p>
            </div>
          )}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-sm">
                <div
                  className="px-3 py-2 rounded-lg text-xs leading-relaxed border"
                  style={
                    msg.role === 'user'
                      ? { backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)', borderColor: 'var(--outline-variant)' }
                      : { backgroundColor: 'var(--surface-container-lowest)', color: 'var(--on-surface)', borderColor: 'var(--outline-variant)' }
                  }
                >
                  {msg.text}
                </div>
                {msg.role === 'advisor' && msg.source && (
                  <div className="mt-0.5 flex items-center gap-1">
                    <span
                      className="text-xs px-1 rounded"
                      style={{
                        fontSize: '10px',
                        color: msg.source === 'ai' ? 'var(--tertiary)' : msg.source === 'moderated' ? 'var(--secondary)' : 'var(--primary)',
                        backgroundColor: msg.source === 'ai'
                          ? 'rgba(177, 218, 154, 0.12)'
                          : msg.source === 'moderated'
                            ? 'rgba(255, 180, 171, 0.12)'
                            : 'rgba(242, 202, 80, 0.12)',
                      }}
                    >
                      {msg.source === 'ai' ? '✦ AI' : msg.source === 'moderated' ? '⚑ Moderated' : '◈ Fallback'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <TypingIndicator />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div
          className="flex flex-wrap gap-1.5 px-4 py-2 border-t flex-shrink-0"
          style={{ borderColor: 'var(--outline-variant)' }}
        >
          {QUICK_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => handleSend(chip, { isQuickFollowUp: true })}
              disabled={isChatLoading}
              className="sigil-chip"
              style={{
                backgroundColor: isChatLoading ? 'var(--surface-container-high)' : 'var(--surface-container-lowest)',
                cursor: isChatLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="flex gap-2 px-4 pb-4 pt-2 flex-shrink-0">
          <textarea
            className="quill-input flex-1 text-xs rounded border px-2 py-1.5 resize-none"
            style={{
              minHeight: '44px',
              maxHeight: '88px',
            }}
            placeholder={`Address ${advisor.name}…`}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isChatLoading}
            rows={1}
            aria-label="Message input"
          />
          <button
            onClick={() => handleSend(inputText)}
            disabled={isChatLoading || !inputText.trim()}
            className="wax-button wax-button--primary text-xs px-4 py-2 font-medium flex-shrink-0 self-end"
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
