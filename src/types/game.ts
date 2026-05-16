import type { Advisor, AdvisorId } from './advisor';
import type { Region } from './region';

export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

export type Urgency = 'low' | 'medium' | 'high' | 'critical';

export type KingdomMetrics = {
  food: number;
  morale: number;
  gold: number;
  threat: number;
  adminStrain: number;
};

export type DoctrineOption = {
  id: string;
  label: string;
  description: string;
  effects: Partial<KingdomMetrics>;
};

export type DoctrineCategory = {
  id: string;
  name: string;
  options: DoctrineOption[];
  selected: string;
};

export type ReportChoice = {
  id: string;
  label: string;
  description: string;
  consequences: Partial<KingdomMetrics>;
};

export type Report = {
  id: string;
  advisorId: AdvisorId;
  season: Season;
  year: number;
  title: string;
  body: string;
  urgency: Urgency;
  choices: ReportChoice[];
  selectedChoiceId: string | null;
  freeTextInstruction: string;
  status: 'pending' | 'responded';
  scribesNote: string;
};

export type Procedure = {
  id: string;
  name: string;
  description: string;
  assignedTo: AdvisorId | null;
  effects: Partial<KingdomMetrics>;
};

export type ScribeMessage = {
  id: string;
  text: string;
  type: 'guidance' | 'conflict' | 'consequence' | 'welcome';
  season: Season;
  year: number;
};

export type GamePhase = 'welcome' | 'reports' | 'resolution' | 'consequences';

export type TurnRecord = {
  season: Season;
  year: number;
  metricsSnapshot: KingdomMetrics;
  reportsSummary: string[];
};

export type CampaignState = {
  id: string;
  phase: GamePhase;
  season: Season;
  year: number;
  metrics: KingdomMetrics;
  advisors: Advisor[];
  regions: Region[];
  procedures: Procedure[];
  doctrines: DoctrineCategory[];
  turnHistory: TurnRecord[];
};

// Re-export advisor and region types for convenience
export type { Advisor, AdvisorId } from './advisor';
export type { Region, RegionId } from './region';
