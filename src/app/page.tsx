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
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
        <div className="ledger-shell flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-xl text-[var(--primary)]">♔</span>
            <div>
              <h1 className="text-lg font-bold ledger-title">Four Warned: Regent</h1>
              <p className="text-xs ledger-subtitle">Medieval Governance Simulation · MVP v0.2</p>
            </div>
          </div>
          <div className="text-xs italic ledger-subtitle text-right">
          &ldquo;Govern wisely, lest the kingdom suffer for your choices.&rdquo;
          </div>
        </div>
      </header>

      <div className="ledger-shell flex flex-1 flex-col gap-4 xl:flex-row xl:overflow-hidden">
        <aside className="w-full xl:w-72 xl:flex-shrink-0 overflow-y-auto p-4 ledger-panel">
          <KingdomOverview />
          <AdvisorPanel />
        </aside>

        <main className="flex-1 flex flex-col xl:flex-row overflow-visible xl:overflow-hidden">
          <div className="order-1 xl:order-1 w-full xl:w-72 xl:flex-shrink-0 p-4 ledger-panel">
            <CouncilReports />
          </div>

          <div className="order-2 xl:order-2 flex-1 p-4 ledger-panel ledger-panel--raised">
            <ActiveReport />
          </div>
        </main>

        <aside className="w-full xl:w-80 xl:flex-shrink-0 overflow-y-auto p-4 ledger-panel">
          <ScribePanel />
          <DoctrineEditor />
        </aside>
      </div>

      {showProceduresModal && <ProceduresModal />}
      <AdvisorChatModal />
    </div>
  );
}
