'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { ADVISOR_META } from '@/lib/ai/advisorMeta';
import type { AdvisorId, AdvisorTone } from '@/lib/gameTypes';

const QUICK_CHIPS = ['Why?', 'Alternative', 'Pros/Cons', 'Explain more'] as const;

const TONE_OPTIONS = ['Concise', 'Analytical', 'Collaborative'] as const;

function TypingIndicator() {
  return (
    <div className="flex items-end gap-1 px-3 py-2 rounded-lg max-w-xs" style={{ backgroundColor: '#ede0c4' }}>
      <span className="text-xs" style={{ color: '#6b5744' }}>Composing reply</span>
      <span className="flex gap-0.5 mb-0.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="inline-block w-1 h-1 rounded-full animate-bounce"
            style={{ backgroundColor: '#8b6914', animationDelay: `${i * 0.15}s` }}
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
        className="rounded-lg border-2 flex flex-col mx-4"
        style={{
          backgroundColor: '#f4e4c1',
          borderColor: '#8b6914',
          color: '#2c1810',
          width: '560px',
          maxWidth: '100%',
          height: '80vh',
          maxHeight: '680px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-4 py-3 border-b-2 flex-shrink-0"
          style={{ borderColor: '#8b6914', backgroundColor: '#ede0c4', borderRadius: '8px 8px 0 0' }}
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="text-2xl w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0"
              style={{ backgroundColor: '#c4a882', border: '2px solid #8b6914' }}
              aria-hidden="true"
            >
              {meta.avatar}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm" style={{ color: '#2c1810' }}>
                  {advisor.title} {advisor.name}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#d4c080', color: '#4a3028', border: '1px solid #8b6914' }}
                >
                  {advisor.region}
                </span>
              </div>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#6b5744' }}>{meta.bio}</p>
            </div>
          </div>
          <button
            onClick={closeChatModal}
            className="text-sm px-2 py-1 rounded ml-2 flex-shrink-0"
            style={{ backgroundColor: '#8b2635', color: '#f4e4c1' }}
            aria-label="Close conversation"
          >
            ✕
          </button>
        </div>

        {/* Thread controls */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
          style={{ borderColor: '#c4a882', backgroundColor: '#f4e4c1' }}
        >
          {/* Tone selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: '#6b5744' }}>Tone:</span>
            {TONE_OPTIONS.map(t => (
              <button
                key={t}
                onClick={() => setConversationTone(chatAdvisorId as AdvisorId, t)}
                className="text-xs px-2 py-0.5 rounded transition-colors"
                style={{
                  backgroundColor: tone === t ? '#c9a227' : '#ede0c4',
                  color: tone === t ? '#1a0e08' : '#6b5744',
                  border: '1px solid #c4a882',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Memory toggle + clear */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => clearConversation(chatAdvisorId as AdvisorId)}
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: '#ede0c4', color: '#6b5744', border: '1px solid #c4a882' }}
              title="Clear conversation"
              aria-label="Clear conversation history"
            >
              Clear
            </button>
            <label className="flex items-center gap-1 cursor-pointer" title="Save conversation across sessions">
              <span className="text-xs" style={{ color: '#6b5744' }}>Remember</span>
              <span
                className="relative inline-block w-8 h-4 rounded-full transition-colors"
                style={{ backgroundColor: isPersistent ? '#065f46' : '#c4a882' }}
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
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: '#ede0c4', color: '#6b5744', border: '1px solid #c4a882' }}
              title="Export transcript as JSON"
              aria-label="Export conversation transcript"
            >
              Export
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          role="log"
          aria-live="polite"
          aria-label="Conversation messages"
        >
          {messages.length === 0 && (
            <div className="text-center py-8" style={{ color: '#8b6914' }}>
              <div className="text-2xl mb-2">{meta.avatar}</div>
              <p className="text-xs italic">
                &ldquo;Open a conversation to seek counsel, Your Majesty.&rdquo;
              </p>
            </div>
          )}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-sm">
                <div
                  className="px-3 py-2 rounded-lg text-xs leading-relaxed"
                  style={
                    msg.role === 'user'
                      ? { backgroundColor: '#8b2635', color: '#f4e4c1' }
                      : { backgroundColor: '#ede0c4', color: '#2c1810', border: '1px solid #c4a882' }
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
                        color: msg.source === 'ai' ? '#065f46' : msg.source === 'moderated' ? '#7c2d12' : '#92400e',
                        backgroundColor: msg.source === 'ai' ? '#d1fae5' : msg.source === 'moderated' ? '#ffedd5' : '#fef3c7',
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

        {/* Quick chips */}
        <div
          className="flex flex-wrap gap-1.5 px-4 py-2 border-t flex-shrink-0"
          style={{ borderColor: '#c4a882' }}
        >
          {QUICK_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => handleSend(chip, { isQuickFollowUp: true })}
              disabled={isChatLoading}
              className="text-xs px-2.5 py-1 rounded-full transition-colors"
              style={{
                backgroundColor: isChatLoading ? '#e8d5b0' : '#ede0c4',
                color: isChatLoading ? '#a89070' : '#4a3028',
                border: '1px solid #c4a882',
                cursor: isChatLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input */}
        <div
          className="flex gap-2 px-4 pb-4 pt-2 flex-shrink-0"
        >
          <textarea
            className="flex-1 text-xs rounded border px-2 py-1.5 resize-none focus:outline-none"
            style={{
              backgroundColor: '#fff9f0',
              borderColor: '#c4a882',
              color: '#2c1810',
              minHeight: '40px',
              maxHeight: '80px',
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
            className="text-xs px-3 py-1.5 rounded font-medium flex-shrink-0 self-end"
            style={{
              backgroundColor: isChatLoading || !inputText.trim() ? '#c4a882' : '#8b2635',
              color: isChatLoading || !inputText.trim() ? '#6b5744' : '#f4e4c1',
              cursor: isChatLoading || !inputText.trim() ? 'not-allowed' : 'pointer',
            }}
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
