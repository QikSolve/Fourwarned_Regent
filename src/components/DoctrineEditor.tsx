'use client';

import { useGameStore } from '@/lib/gameStore';

export function DoctrineEditor() {
  const doctrines = useGameStore(s => s.doctrines);
  const updateDoctrine = useGameStore(s => s.updateDoctrine);

  return (
    <div className="rounded-lg border-2 p-4" style={{ backgroundColor: '#f4e4c1', borderColor: '#8b6914' }}>
      <h2 className="text-sm font-bold mb-3 text-center" style={{ color: '#8b2635' }}>
        ⚜ Kingdom Doctrine
      </h2>

      <div className="space-y-4">
        {doctrines.map(doctrine => (
          <div key={doctrine.id}>
            <div className="text-xs font-bold mb-2" style={{ color: '#2c1810' }}>
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
                      backgroundColor: isSelected ? '#c9a227' : '#ede0c4',
                      borderColor: isSelected ? '#8b6914' : '#c4a882',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: isSelected ? '#2c1810' : '#8b6914' }}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2c1810' }} />}
                      </div>
                      <div>
                        <div className="text-xs font-medium" style={{ color: '#2c1810' }}>{option.label}</div>
                        <div className="text-xs" style={{ color: '#4a3028' }}>{option.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
