export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

export type Urgency = 'low' | 'medium' | 'high' | 'critical';

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

export type KingdomMetrics = {
  food: number;
  morale: number;
  gold: number;
  threat: number;
  adminStrain: number;
};

export type AdvisorId = 'steward' | 'marshal' | 'merchant' | 'governor';

export type AdvisorStatus = 'Active' | 'Concerned' | 'Critical';

export type Advisor = {
  id: AdvisorId;
  name: string;
  title: string;
  region: string;
  competence: number;
  loyalty: number;
  stress: number;
  bias: string;
  ambition: number;
  authority: number;
  status: AdvisorStatus;
  assignedProcedures: string[];
  maxProcedures: number;
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

export type GameState = {
  phase: GamePhase;
  season: Season;
  year: number;
  metrics: KingdomMetrics;
  advisors: Advisor[];
  reports: Report[];
  procedures: Procedure[];
  doctrines: DoctrineCategory[];
  scribeMessages: ScribeMessage[];
  activeReportId: string | null;
  showProceduresModal: boolean;
  selectedAdvisorId: AdvisorId | null;
  turnHistory: TurnRecord[];
};

export type TurnRecord = {
  season: Season;
  year: number;
  metricsSnapshot: KingdomMetrics;
  reportsSummary: string[];
};

export type ConversationMessage = {
  id: string;
  role: 'user' | 'advisor';
  text: string;
  timestamp: number;
  source?: 'ai' | 'fallback' | 'moderated';
};

export type AdvisorTone = 'Concise' | 'Analytical' | 'Collaborative';

export type AdvisorConversation = {
  messages: ConversationMessage[];
  isPersistent: boolean;
  tone: AdvisorTone;
};
