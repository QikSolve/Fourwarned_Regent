'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { KingdomOverview } from '@/components/KingdomOverview';
import { AdvisorPanel } from '@/components/AdvisorPanel';
import { CouncilReports } from '@/components/CouncilReports';
import { ActiveReport } from '@/components/ActiveReport';
import { ScribePanel } from '@/components/ScribePanel';
import { DoctrineEditor } from '@/components/DoctrineEditor';
import { ProceduresModal } from '@/components/ProceduresModal';
import { AdvisorChatModal } from '@/components/AdvisorChatModal';

export default function Home() {
  const initGame = useGameStore(s => s.initGame);
  const showProceduresModal = useGameStore(s => s.showProceduresModal);

  useEffect(() => {
    initGame();
  }, [initGame]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#2c1810' }}>
      {/* Header */}
      <header className="border-b-2 py-3 px-6 flex items-center justify-between" style={{ backgroundColor: '#1a0e08', borderColor: '#8b6914' }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">♔</span>
          <div>
            <h1 className="text-base font-bold" style={{ color: '#c9a227' }}>Four Warned: Regent</h1>
            <p className="text-xs" style={{ color: '#8b6914' }}>Medieval Governance Simulation · MVP v0.2</p>
          </div>
        </div>
        <div className="text-xs italic" style={{ color: '#8b6914' }}>
          &ldquo;Govern wisely, lest the kingdom suffer for your choices.&rdquo;
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col xl:flex-row overflow-y-auto xl:overflow-hidden xl:h-[calc(100vh-60px)]">
        {/* Left Sidebar — KingdomOverview + AdvisorCard (per ARCHITECTURE.md) */}
        <aside className="w-full xl:w-72 xl:flex-shrink-0 overflow-y-auto p-4 border-b-2 xl:border-b-0 xl:border-r-2" style={{ borderColor: '#8b6914' }}>
          <KingdomOverview />
          <AdvisorPanel />
        </aside>

        {/* Center — CouncilReports + ActiveReport (per ARCHITECTURE.md) */}
        <main className="flex-1 flex flex-col xl:flex-row overflow-visible xl:overflow-hidden">
          {/* Council Reports list */}
          <div className="order-2 xl:order-1 w-full xl:w-72 xl:flex-shrink-0 border-t-2 xl:border-t-0 xl:border-r-2 p-4 overflow-visible xl:overflow-hidden flex flex-col" style={{ borderColor: '#8b6914' }}>
            <CouncilReports />
          </div>

          {/* Active Report interaction */}
          <div className="order-1 xl:order-2 flex-1 p-4 overflow-visible xl:overflow-hidden">
            <ActiveReport />
          </div>
        </main>

        {/* Right Sidebar — ScribePanel + DoctrineEditor (per ARCHITECTURE.md) */}
        <aside className="w-full xl:w-80 xl:flex-shrink-0 overflow-y-auto p-4 border-t-2 xl:border-t-0 xl:border-l-2" style={{ borderColor: '#8b6914' }}>
          <ScribePanel />
          <DoctrineEditor />
        </aside>
      </div>

      {/* Procedures Modal */}
      {showProceduresModal && <ProceduresModal />}
      {/* Advisor Chat Modal */}
      <AdvisorChatModal />
    </div>
  );
}
