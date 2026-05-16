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
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={closeProceduresModal}
    >
      <div
        className="rounded-lg border-2 p-6 max-w-lg w-full mx-4 max-h-screen overflow-y-auto"
        style={{ backgroundColor: '#f4e4c1', borderColor: '#8b6914', color: '#2c1810' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold" style={{ color: '#8b2635' }}>
            Procedures — {advisor.name}
          </h2>
          <button
            onClick={closeProceduresModal}
            className="text-sm px-2 py-1 rounded"
            style={{ backgroundColor: '#8b2635', color: '#f4e4c1' }}
          >
            ✕
          </button>
        </div>

        {/* Capacity */}
        <div className="mb-4 p-3 rounded border" style={{ backgroundColor: '#ede0c4', borderColor: '#c4a882' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold">Operational Capacity</span>
            <span className="text-xs font-bold" style={{ color: atCapacity ? '#991b1b' : '#065f46' }}>
              {assignedToAdvisor.length}/{advisor.maxProcedures}
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: advisor.maxProcedures }).map((_, i) => (
              <div
                key={i}
                className="h-3 flex-1 rounded"
                style={{ backgroundColor: i < assignedToAdvisor.length ? '#c9a227' : '#c4a882' }}
              />
            ))}
          </div>
        </div>

        {/* Assigned Procedures */}
        {assignedToAdvisor.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold mb-2" style={{ color: '#8b2635' }}>
              Currently Assigned:
            </div>
            {assignedToAdvisor.map(proc => (
              <div
                key={proc.id}
                className="rounded border p-3 mb-2"
                style={{ backgroundColor: '#d4c080', borderColor: '#8b6914' }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold">{proc.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#4a3028' }}>{proc.description}</div>
                    <div className="flex gap-2 mt-1">
                      {Object.entries(proc.effects).map(([key, val]) => {
                        if (!val) return null;
                        const isPos = (val as number) > 0;
                        const icon = key === 'food' ? '🌾' : key === 'morale' ? '❤️' : key === 'gold' ? '💰' : key === 'threat' ? '⚔️' : '📜';
                        return (
                          <span key={key} className="text-xs" style={{ color: isPos ? '#065f46' : '#991b1b' }}>
                            {icon} {isPos ? '+' : ''}{val}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    className="text-xs px-2 py-1 rounded ml-2 flex-shrink-0"
                    style={{ backgroundColor: '#8b2635', color: '#f4e4c1' }}
                    onClick={() => assignProcedure(proc.id, null)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Available Procedures */}
        <div>
          <div className="text-xs font-bold mb-2" style={{ color: '#8b2635' }}>
            Available to Assign:
          </div>
          {unassigned.length === 0 ? (
            <div className="text-xs text-center py-3" style={{ color: '#6b5744' }}>
              All procedures are currently assigned.
            </div>
          ) : (
            unassigned.map(proc => (
              <div
                key={proc.id}
                className="rounded border p-3 mb-2"
                style={{ backgroundColor: '#ede0c4', borderColor: '#c4a882' }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-bold">{proc.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#4a3028' }}>{proc.description}</div>
                    <div className="flex gap-2 mt-1">
                      {Object.entries(proc.effects).map(([key, val]) => {
                        if (!val) return null;
                        const isPos = (val as number) > 0;
                        const icon = key === 'food' ? '🌾' : key === 'morale' ? '❤️' : key === 'gold' ? '💰' : key === 'threat' ? '⚔️' : '📜';
                        return (
                          <span key={key} className="text-xs" style={{ color: isPos ? '#065f46' : '#991b1b' }}>
                            {icon} {isPos ? '+' : ''}{val}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    disabled={atCapacity}
                    className="text-xs px-2 py-1 rounded ml-2 flex-shrink-0"
                    style={{
                      backgroundColor: atCapacity ? '#c4a882' : '#065f46',
                      color: atCapacity ? '#6b5744' : '#f4e4c1',
                      cursor: atCapacity ? 'not-allowed' : 'pointer',
                    }}
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
          className="w-full mt-4 py-2 rounded border-2 font-bold text-sm"
          style={{ backgroundColor: '#8b2635', color: '#f4e4c1', borderColor: '#6b1d28' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
