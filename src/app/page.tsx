'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { KingdomStatus } from '@/components/KingdomStatus';
import { AdvisorPanel } from '@/components/AdvisorPanel';
import { ReportsFeed } from '@/components/ReportsFeed';
import { ActiveReport } from '@/components/ActiveReport';
import { ScribePanel } from '@/components/ScribePanel';
import { DoctrineEditor } from '@/components/DoctrineEditor';
import { ProceduresModal } from '@/components/ProceduresModal';

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
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 60px)' }}>
        {/* Left Sidebar */}
        <aside className="w-72 flex-shrink-0 overflow-y-auto p-4 border-r-2" style={{ borderColor: '#8b6914' }}>
          <KingdomStatus />
          <AdvisorPanel />
        </aside>

        {/* Center: Reports Feed + Active Report */}
        <main className="flex-1 flex overflow-hidden">
          {/* Reports List */}
          <div className="w-72 flex-shrink-0 border-r-2 p-4 overflow-hidden flex flex-col" style={{ borderColor: '#8b6914' }}>
            <ReportsFeed />
          </div>

          {/* Active Report */}
          <div className="flex-1 p-4 overflow-hidden">
            <ActiveReport />
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="w-80 flex-shrink-0 overflow-y-auto p-4 border-l-2" style={{ borderColor: '#8b6914' }}>
          <ScribePanel />
          <DoctrineEditor />
        </aside>
      </div>

      {/* Procedures Modal */}
      {showProceduresModal && <ProceduresModal />}
    </div>
  );
}
