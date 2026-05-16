'use client';

import { useGameStore } from '@/lib/gameStore';
import { MetricBar } from './MetricBar';

export function KingdomOverview() {
  const { metrics, season, year } = useGameStore();

  return (
    <section className="ledger-panel ledger-panel--light p-4 mb-4">
      <div className="text-center mb-3">
        <div className="text-lg font-bold ledger-title">♔ Kingdom of Valdris</div>
        <div className="text-sm font-medium ledger-subtitle">
          {season}, Year {year}
        </div>
      </div>

      <div className="ruled-list pt-3">
        <MetricBar label="Food Reserves" value={metrics.food} icon="🌾" />
        <MetricBar label="Morale" value={metrics.morale} icon="❤️" />
        <MetricBar label="Gold" value={metrics.gold} icon="💰" />
        <MetricBar label="Frontier Threat" value={metrics.threat} icon="⚔️" />
        <MetricBar label="Admin Strain" value={metrics.adminStrain} icon="📜" />
      </div>
    </section>
  );
}
