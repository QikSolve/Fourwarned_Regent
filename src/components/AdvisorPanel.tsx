'use client';

import { useGameStore } from '@/lib/gameStore';
import { AdvisorCard } from './AdvisorCard';
import { AdvisorInlineThreads } from './AdvisorInlineThreads';
import { MultiAdvisorWorkspace } from './MultiAdvisorWorkspace';

export function AdvisorPanel() {
  const advisors = useGameStore(s => s.advisors);

  return (
    <div className="rounded-lg border-2 p-4" style={{ backgroundColor: 'rgba(44,24,16,0.5)', borderColor: '#8b6914' }}>
      <h2 className="text-sm font-bold mb-3 text-center" style={{ color: '#c9a227' }}>
        ⚜ Royal Advisors
      </h2>
      {advisors.map(advisor => (
        <AdvisorCard key={advisor.id} advisor={advisor} />
      ))}
      <MultiAdvisorWorkspace />
      <AdvisorInlineThreads />
    </div>
  );
}
