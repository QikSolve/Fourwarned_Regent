'use client';

import { Advisor } from '@/lib/gameTypes';
import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { getAdvisorCounsel, type NormalizedAdvisorCounsel } from '@/lib/ai/runtime';

interface AdvisorCardProps {
  advisor: Advisor;
}

const statusColors = {
  Active: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  Concerned: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  Critical: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
};

function SmallBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full flex-1" style={{ backgroundColor: '#c4a882' }}>
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
      className="rounded border-2 p-3 mb-2 cursor-pointer transition-all duration-200"
      style={{ backgroundColor: '#f4e4c1', borderColor: '#8b6914' }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="font-bold text-sm" style={{ color: '#2c1810' }}>{advisor.name}</div>
          <div className="text-xs" style={{ color: '#6b5744' }}>{advisor.title} · {advisor.region}</div>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full border font-medium"
          style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, borderColor: statusStyle.border }}
        >
          {advisor.status}
        </span>
      </div>

      <div className="text-xs mb-2" style={{ color: '#8b6914' }}>&ldquo;{advisor.bias}&rdquo;</div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs w-20" style={{ color: '#6b5744' }}>Competence</span>
          <SmallBar value={advisor.competence} color="#c9a227" />
          <span className="text-xs w-8 text-right" style={{ color: '#2c1810' }}>{advisor.competence}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-20" style={{ color: '#6b5744' }}>Loyalty</span>
          <SmallBar value={advisor.loyalty} color="#4ade80" />
          <span className="text-xs w-8 text-right" style={{ color: '#2c1810' }}>{advisor.loyalty}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-20" style={{ color: '#6b5744' }}>Stress</span>
          <SmallBar value={advisor.stress} color="#f87171" />
          <span className="text-xs w-8 text-right" style={{ color: '#2c1810' }}>{advisor.stress}</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: '#8b6914' }}>
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs w-20" style={{ color: '#6b5744' }}>Ambition</span>
              <SmallBar value={advisor.ambition} color="#a78bfa" />
              <span className="text-xs w-8 text-right" style={{ color: '#2c1810' }}>{advisor.ambition}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs w-20" style={{ color: '#6b5744' }}>Authority</span>
              <SmallBar value={advisor.authority} color="#60a5fa" />
              <span className="text-xs w-8 text-right" style={{ color: '#2c1810' }}>{advisor.authority}</span>
            </div>
          </div>
          
          <div className="mb-2">
            <div className="text-xs font-medium mb-1" style={{ color: '#6b5744' }}>
              Procedures ({assignedProcs.length}/{advisor.maxProcedures}):
            </div>
            <div className="flex gap-1 mb-1">
              {Array.from({ length: advisor.maxProcedures }).map((_, i) => (
                <div
                  key={i}
                  className="h-2 flex-1 rounded"
                  style={{ backgroundColor: i < assignedProcs.length ? '#c9a227' : '#c4a882' }}
                />
              ))}
            </div>
            {assignedProcs.length > 0 && (
              <div className="text-xs" style={{ color: '#6b5744' }}>
                {assignedProcs.map(p => p.name).join(', ')}
              </div>
            )}
          </div>

          <div className="mb-3 rounded border p-2" style={{ borderColor: '#c4a882', backgroundColor: '#ede0c4' }}>
            <div className="text-xs font-medium mb-1" style={{ color: '#6b5744' }}>
              Current Counsel
              {counsel && (
                <span className="ml-1" style={{ color: counsel.source === 'ai' ? '#065f46' : '#92400e' }}>
                  ({counsel.source === 'ai' ? 'AI' : 'Fallback'})
                </span>
              )}
            </div>
            {isLoadingCounsel ? (
              <div className="text-xs" style={{ color: '#6b5744' }}>Preparing counsel...</div>
            ) : counsel ? (
              <div className="space-y-1">
                <p className="text-xs" style={{ color: '#2c1810' }}><strong>Concern:</strong> {counsel.concern}</p>
                <p className="text-xs" style={{ color: '#2c1810' }}><strong>Recommendation:</strong> {counsel.recommendation}</p>
                <p className="text-xs" style={{ color: '#2c1810' }}><strong>Risk:</strong> {counsel.risk}</p>
              </div>
            ) : (
              <div className="text-xs" style={{ color: '#6b5744' }}>No counsel available.</div>
            )}
          </div>

          <button
            className="w-full text-xs py-1 px-2 rounded border font-medium transition-colors mb-1"
            style={{ backgroundColor: '#1a4a6e', color: '#f4e4c1', borderColor: '#153a56' }}
            onClick={(e) => {
              e.stopPropagation();
              openChatModal(advisor.id);
            }}
          >
            Open Conversation
          </button>
          <button
            className="w-full text-xs py-1 px-2 rounded border font-medium transition-colors"
            style={{ backgroundColor: '#8b2635', color: '#f4e4c1', borderColor: '#6b1d28' }}
            onClick={(e) => {
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
