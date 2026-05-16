'use client';

import { useGameStore } from '@/lib/gameStore';

export function ProceduresModal() {
  const showProceduresModal = useGameStore(s => s.showProceduresModal);
  const selectedAdvisorId = useGameStore(s => s.selectedAdvisorId);
  const procedures = useGameStore(s => s.procedures);
  const advisors = useGameStore(s => s.advisors);
  const assignProcedure = useGameStore(s => s.assignProcedure);
  const closeProceduresModal = useGameStore(s => s.closeProceduresModal);

  if (!showProceduresModal || !selectedAdvisorId) return null;

  const advisor = advisors.find(a => a.id === selectedAdvisorId);
  if (!advisor) return null;

  const assignedToAdvisor = procedures.filter(p => p.assignedTo === selectedAdvisorId);
  const unassigned = procedures.filter(p => p.assignedTo === null);
  const atCapacity = assignedToAdvisor.length >= advisor.maxProcedures;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}
      onClick={closeProceduresModal}
    >
      <div
        className="ledger-panel ledger-panel--light p-6 max-w-lg w-full mx-4 max-h-screen overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold ledger-title">
            Procedures — {advisor.name}
          </h2>
          <button
            onClick={closeProceduresModal}
            className="wax-button wax-button--muted px-3 py-1 text-sm"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 rounded border" style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold ledger-subtitle">Operational Capacity</span>
            <span className="text-xs font-bold" style={{ color: atCapacity ? 'var(--error)' : 'var(--tertiary)' }}>
              {assignedToAdvisor.length}/{advisor.maxProcedures}
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: advisor.maxProcedures }).map((_, i) => (
              <div
                key={i}
                className="h-3 flex-1 rounded"
                style={{ backgroundColor: i < assignedToAdvisor.length ? 'var(--primary)' : 'var(--surface-container-high)' }}
              />
            ))}
          </div>
        </div>

        {assignedToAdvisor.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold mb-2 ledger-title">
              Currently Assigned:
            </div>
            {assignedToAdvisor.map(proc => (
              <div
                key={proc.id}
                className="rounded border p-3 mb-2"
                style={{ backgroundColor: 'var(--surface-container-highest)', borderColor: 'var(--outline-variant)' }}
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="text-xs font-bold text-[var(--on-surface)]">{proc.name}</div>
                    <div className="text-xs mt-0.5 ledger-subtitle">{proc.description}</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Object.entries(proc.effects).map(([key, val]) => {
                        if (!val) return null;
                        const isPos = (val as number) > 0;
                        const icon = key === 'food' ? '🌾' : key === 'morale' ? '❤️' : key === 'gold' ? '💰' : key === 'threat' ? '⚔️' : '📜';
                        return (
                          <span key={key} className={`sigil-chip ${isPos ? 'sigil-chip--positive' : 'sigil-chip--negative'}`}>
                            {icon} {isPos ? '+' : ''}{val}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    className="wax-button wax-button--muted text-xs px-2 py-1 flex-shrink-0"
                    onClick={() => assignProcedure(proc.id, null)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="text-xs font-bold mb-2 ledger-title">
            Available to Assign:
          </div>
          {unassigned.length === 0 ? (
            <div className="text-xs text-center py-3 ledger-subtitle">
              All procedures are currently assigned.
            </div>
          ) : (
            unassigned.map(proc => (
              <div
                key={proc.id}
                className="rounded border p-3 mb-2"
                style={{ backgroundColor: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="text-xs font-bold text-[var(--on-surface)]">{proc.name}</div>
                    <div className="text-xs mt-0.5 ledger-subtitle">{proc.description}</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Object.entries(proc.effects).map(([key, val]) => {
                        if (!val) return null;
                        const isPos = (val as number) > 0;
                        const icon = key === 'food' ? '🌾' : key === 'morale' ? '❤️' : key === 'gold' ? '💰' : key === 'threat' ? '⚔️' : '📜';
                        return (
                          <span key={key} className={`sigil-chip ${isPos ? 'sigil-chip--positive' : 'sigil-chip--negative'}`}>
                            {icon} {isPos ? '+' : ''}{val}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    disabled={atCapacity}
                    className="wax-button wax-button--primary text-xs px-2 py-1 flex-shrink-0"
                    onClick={() => !atCapacity && assignProcedure(proc.id, selectedAdvisorId)}
                  >
                    Assign
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={closeProceduresModal}
          className="wax-button wax-button--muted w-full mt-4 py-2 text-sm font-bold"
        >
          Close
        </button>
      </div>
    </div>
  );
}
