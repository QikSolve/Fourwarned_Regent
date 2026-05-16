export type RegionId = 'riverhold' | 'stonewatch' | 'blackwater';

export type Region = {
  id: RegionId;
  name: string;
  description: string;
  focus: 'agricultural' | 'military' | 'trade';
  stability: number; // 0-100
};
