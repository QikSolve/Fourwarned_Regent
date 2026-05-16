'use client';

import { useGameStore } from '@/lib/gameStore';
import { MetricBar } from './MetricBar';

export function KingdomStatus() {
  const { metrics, season, year } = useGameStore();

  return (
    <div className="rounded-lg border-2 p-4 mb-4" style={{ backgroundColor: '#f4e4c1', borderColor: '#8b6914' }}>
      <div className="text-center mb-3">
        <div className="text-lg font-bold" style={{ color: '#8b2635' }}>♔ Kingdom of Valdris</div>
        <div className="text-sm font-medium" style={{ color: '#6b5744' }}>
          {season}, Year {year}
        </div>
      </div>
      
      <div className="border-t pt-3" style={{ borderColor: '#8b6914' }}>
        <MetricBar label="Food Reserves" value={metrics.food} icon="🌾" />
        <MetricBar label="Morale" value={metrics.morale} icon="❤️" />
        <MetricBar label="Gold" value={metrics.gold} icon="💰" />
        <MetricBar label="Frontier Threat" value={metrics.threat} icon="⚔️" />
        <MetricBar label="Admin Strain" value={metrics.adminStrain} icon="📜" />
      </div>
    </div>
  );
}
