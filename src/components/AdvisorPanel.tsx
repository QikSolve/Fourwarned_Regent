'use client';

import { useGameStore } from '@/lib/gameStore';
import { AdvisorCard } from './AdvisorCard';
import { AdvisorInlineThreads } from './AdvisorInlineThreads';
import { MultiAdvisorWorkspace } from './MultiAdvisorWorkspace';

export function AdvisorPanel() {
  const advisors = useGameStore(s => s.advisors);

  return (
    <section className="ledger-panel p-4">
      <h2 className="text-sm font-bold mb-3 text-center ledger-title">
        ⚜ Royal Advisors
      </h2>
      {advisors.map(advisor => (
        <AdvisorCard key={advisor.id} advisor={advisor} />
      ))}
      <MultiAdvisorWorkspace />
      <AdvisorInlineThreads />
    </section>
  );
}
