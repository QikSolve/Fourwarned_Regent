'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { getAdvisorCounsel, type NormalizedAdvisorCounsel } from '@/lib/ai/runtime';
import { Advisor } from '@/lib/gameTypes';

interface AdvisorCardProps {
  advisor: Advisor;
}

const statusColors = {
  Active: { bg: 'rgba(177, 218, 154, 0.12)', text: 'var(--tertiary)', border: 'rgba(177, 218, 154, 0.35)' },
  Concerned: { bg: 'rgba(242, 202, 80, 0.12)', text: 'var(--primary)', border: 'rgba(242, 202, 80, 0.35)' },
  Critical: { bg: 'rgba(255, 180, 171, 0.12)', text: 'var(--error)', border: 'rgba(255, 180, 171, 0.35)' },
};

function SmallBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full flex-1 bg-[var(--surface-container-high)]">
      <div className="h-1.5 rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

export function AdvisorCard({ advisor }: AdvisorCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [counsel, setCounsel] = useState<NormalizedAdvisorCounsel | null>(null);
  const [isLoadingCounsel, setIsLoadingCounsel] = useState(false);
  const openProceduresModal = useGameStore(s => s.openProceduresModal);
  const openChatModal = useGameStore(s => s.openChatModal);
  const procedures = useGameStore(s => s.procedures);
  const metrics = useGameStore(s => s.metrics);

  const statusStyle = statusColors[advisor.status];
  const assignedProcs = procedures.filter(p => p.assignedTo === advisor.id);

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;

    setIsLoadingCounsel(true);
    getAdvisorCounsel(advisor, metrics)
      .then(result => {
        if (!cancelled) {
          setCounsel(result);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingCounsel(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [expanded, advisor, metrics]);

  return (
    <div
      className="ledger-panel ledger-panel--light p-3 mb-2 cursor-pointer transition-all duration-200"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="font-bold text-sm text-[var(--on-surface)]">{advisor.name}</div>
          <div className="text-xs ledger-subtitle">{advisor.title} · {advisor.region}</div>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full border font-medium"
          style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, borderColor: statusStyle.border }}
        >
          {advisor.status}
        </span>
      </div>

      <div className="text-xs mb-2 text-[var(--primary)]">&ldquo;{advisor.bias}&rdquo;</div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs w-20 ledger-subtitle">Competence</span>
          <SmallBar value={advisor.competence} color="var(--primary)" />
          <span className="text-xs w-8 text-right text-[var(--on-surface)]">{advisor.competence}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-20 ledger-subtitle">Loyalty</span>
          <SmallBar value={advisor.loyalty} color="var(--tertiary)" />
          <span className="text-xs w-8 text-right text-[var(--on-surface)]">{advisor.loyalty}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-20 ledger-subtitle">Stress</span>
          <SmallBar value={advisor.stress} color="var(--error)" />
          <span className="text-xs w-8 text-right text-[var(--on-surface)]">{advisor.stress}</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t ledger-divider">
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs w-20 ledger-subtitle">Ambition</span>
              <SmallBar value={advisor.ambition} color="var(--secondary)" />
              <span className="text-xs w-8 text-right text-[var(--on-surface)]">{advisor.ambition}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs w-20 ledger-subtitle">Authority</span>
              <SmallBar value={advisor.authority} color="var(--primary-fixed)" />
              <span className="text-xs w-8 text-right text-[var(--on-surface)]">{advisor.authority}</span>
            </div>
          </div>

          <div className="mb-2">
            <div className="text-xs font-medium mb-1 ledger-subtitle">
              Procedures ({assignedProcs.length}/{advisor.maxProcedures}):
            </div>
            <div className="flex gap-1 mb-1">
              {Array.from({ length: advisor.maxProcedures }).map((_, i) => (
                <div
                  key={i}
                  className="h-2 flex-1 rounded"
                  style={{ backgroundColor: i < assignedProcs.length ? 'var(--primary)' : 'var(--surface-container-high)' }}
                />
              ))}
            </div>
            {assignedProcs.length > 0 && (
              <div className="text-xs ledger-subtitle">
                {assignedProcs.map(p => p.name).join(', ')}
              </div>
            )}
          </div>

          <div
            className="mb-3 rounded border p-2"
            style={{ borderColor: 'var(--outline-variant)', backgroundColor: 'var(--surface-container-lowest)' }}
          >
            <div className="text-xs font-medium mb-1 ledger-subtitle">
              Current Counsel
              {counsel && (
                <span className="ml-1" style={{ color: counsel.source === 'ai' ? 'var(--tertiary)' : 'var(--primary)' }}>
                  ({counsel.source === 'ai' ? 'AI' : 'Fallback'})
                </span>
              )}
            </div>
            {isLoadingCounsel ? (
              <div className="text-xs ledger-subtitle">Preparing counsel...</div>
            ) : counsel ? (
              <div className="space-y-1">
                <p className="text-xs text-[var(--on-surface)]"><strong>Concern:</strong> {counsel.concern}</p>
                <p className="text-xs text-[var(--on-surface)]"><strong>Recommendation:</strong> {counsel.recommendation}</p>
                <p className="text-xs text-[var(--on-surface)]"><strong>Risk:</strong> {counsel.risk}</p>
              </div>
            ) : (
              <div className="text-xs ledger-subtitle">No counsel available.</div>
            )}
          </div>

          <button
            className="wax-button wax-button--muted w-full text-xs py-2 px-2 mb-1"
            onClick={e => {
              e.stopPropagation();
              openChatModal(advisor.id);
            }}
          >
            Open Conversation
          </button>
          <button
            className="wax-button w-full text-xs py-2 px-2"
            onClick={e => {
              e.stopPropagation();
              openProceduresModal(advisor.id);
            }}
          >
            Manage Procedures
          </button>
        </div>
      )}
    </div>
  );
}
