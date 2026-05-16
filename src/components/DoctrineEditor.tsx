'use client';

import { useGameStore } from '@/lib/gameStore';

export function DoctrineEditor() {
  const doctrines = useGameStore(s => s.doctrines);
  const updateDoctrine = useGameStore(s => s.updateDoctrine);

  return (
    <section className="ledger-panel p-4">
      <h2 className="text-sm font-bold mb-3 text-center ledger-title">
        ⚜ Kingdom Doctrine
      </h2>

      <div className="space-y-4">
        {doctrines.map(doctrine => (
          <div key={doctrine.id}>
            <div className="text-xs font-bold mb-2 ledger-subtitle">
              {doctrine.name}
            </div>
            <div className="space-y-1">
              {doctrine.options.map(option => {
                const isSelected = doctrine.selected === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => updateDoctrine(doctrine.id, option.id)}
                    className="w-full text-left rounded border p-2 transition-all duration-200"
                    style={{
                      backgroundColor: isSelected ? 'var(--surface-container-highest)' : 'var(--surface-container-lowest)',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--outline-variant)',
                      boxShadow: isSelected ? 'inset 0 0 0 1px rgba(242, 202, 80, 0.12)' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: isSelected ? 'var(--primary)' : 'var(--outline)' }}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-[var(--on-surface)]">{option.label}</div>
                        <div className="text-xs ledger-subtitle">{option.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
