import type { Advisor, AdvisorId, DoctrineCategory, GameState, KingdomMetrics, Procedure, ScribeMessage, Season } from '@/lib/gameTypes';
import { generateReports } from '@/lib/reportGenerator';
import { detectConflicts, generateWelcomeMessage } from '@/lib/scribeLogic';

const INITIAL_METRICS: KingdomMetrics = {
  food: 45,
  morale: 55,
  gold: 60,
  threat: 35,
  adminStrain: 40,
};

const INITIAL_ADVISORS: Advisor[] = [
  {
    id: 'steward',
    name: 'Aldric',
    title: 'Steward',
    region: 'Riverhold',
    competence: 72,
    loyalty: 85,
    stress: 30,
    bias: 'Fiscal Conservatism',
    ambition: 20,
    authority: 60,
    status: 'Active',
    assignedProcedures: [],
    maxProcedures: 3,
  },
  {
    id: 'marshal',
    name: 'Garrett',
    title: 'Marshal',
    region: 'Stonewatch',
    competence: 78,
    loyalty: 70,
    stress: 45,
    bias: 'Military Expansion',
    ambition: 55,
    authority: 65,
    status: 'Active',
    assignedProcedures: [],
    maxProcedures: 3,
  },
  {
    id: 'merchant',
    name: 'Lyra',
    title: 'Merchant Envoy',
    region: 'Blackwater',
    competence: 65,
    loyalty: 60,
    stress: 20,
    bias: 'Free Trade',
    ambition: 40,
    authority: 50,
    status: 'Active',
    assignedProcedures: [],
    maxProcedures: 3,
  },
  {
    id: 'governor',
    name: 'Elric',
    title: 'Governor',
    region: 'All Regions',
    competence: 60,
    loyalty: 75,
    stress: 55,
    bias: 'Regional Autonomy',
    ambition: 45,
    authority: 55,
    status: 'Active',
    assignedProcedures: [],
    maxProcedures: 3,
  },
];

const INITIAL_PROCEDURES: Procedure[] = [
  {
    id: 'winter-reserve',
    name: 'Winter Reserve Accounting',
    description: 'Systematic tracking and protection of grain reserves for winter months.',
    assignedTo: null as AdvisorId | null,
    effects: { food: 5, adminStrain: 3 },
  },
  {
    id: 'frontier-patrol',
    name: 'Frontier Patrol Doctrine',
    description: 'Regular military patrols along frontier borders to deter raiders.',
    assignedTo: null as AdvisorId | null,
    effects: { threat: -8, gold: -5 },
  },
  {
    id: 'emergency-grain',
    name: 'Emergency Grain Logistics',
    description: 'Rapid redistribution of grain stores across regions during shortage.',
    assignedTo: null as AdvisorId | null,
    effects: { food: 10, adminStrain: 8 },
  },
  {
    id: 'merchant-tax',
    name: 'Merchant Tax Balancing',
    description: 'Calibrated approach to merchant taxation preserving trade flows.',
    assignedTo: null as AdvisorId | null,
    effects: { gold: 8, morale: 3 },
  },
  {
    id: 'regional-census',
    name: 'Regional Census Protocol',
    description: 'Systematic census of all regions to improve administrative efficiency.',
    assignedTo: null as AdvisorId | null,
    effects: { adminStrain: -10, morale: 2 },
  },
  {
    id: 'border-toll',
    name: 'Border Toll Management',
    description: 'Organised toll collection at border crossings to generate revenue.',
    assignedTo: null as AdvisorId | null,
    effects: { gold: 12, morale: -3 },
  },
];

const INITIAL_DOCTRINES: DoctrineCategory[] = [
  {
    id: 'food-security',
    name: 'Food Security Policy',
    selected: 'balance-reserves',
    options: [
      {
        id: 'prevent-famine',
        label: 'Prevent Famine',
        description: 'Prioritise grain stockpiles above all else. Restrict exports.',
        effects: { food: 8, gold: -5, morale: 2 },
      },
      {
        id: 'balance-reserves',
        label: 'Balance Reserves',
        description: 'Maintain adequate reserves while allowing measured trade.',
        effects: { food: 3, gold: 2 },
      },
      {
        id: 'maximize-exports',
        label: 'Maximise Exports',
        description: 'Prioritise grain exports for maximum revenue.',
        effects: { food: -5, gold: 10, morale: -3 },
      },
    ],
  },
  {
    id: 'military-doctrine',
    name: 'Military Doctrine',
    selected: 'defensive-posture',
    options: [
      {
        id: 'defensive-posture',
        label: 'Defensive Posture',
        description: 'Hold fortified positions. Minimal offensive operations.',
        effects: { threat: 3, gold: -3 },
      },
      {
        id: 'active-patrols',
        label: 'Active Patrols',
        description: 'Aggressive patrol presence to deter and respond to threats.',
        effects: { threat: -8, gold: -8, morale: 3 },
      },
      {
        id: 'minimal-presence',
        label: 'Minimal Presence',
        description: 'Reduce military expenditure. Focus resources on other needs.',
        effects: { threat: 10, gold: 8, morale: -5 },
      },
    ],
  },
  {
    id: 'tax-policy',
    name: 'Tax Policy',
    selected: 'balanced-approach',
    options: [
      {
        id: 'heavy-taxation',
        label: 'Heavy Taxation',
        description: 'Extract maximum revenue from all subjects and merchants.',
        effects: { gold: 15, morale: -10, threat: 2 },
      },
      {
        id: 'balanced-approach',
        label: 'Balanced Approach',
        description: 'Fair taxation that maintains loyalty while funding operations.',
        effects: { gold: 5, morale: 2 },
      },
      {
        id: 'light-taxes',
        label: 'Light Taxes',
        description: 'Minimal taxation to boost merchant activity and popular support.',
        effects: { gold: -5, morale: 8, threat: -2 },
      },
    ],
  },
];

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function cloneMetrics(metrics: KingdomMetrics): KingdomMetrics {
  return { ...metrics };
}

function cloneAdvisors(advisors: Advisor[]): Advisor[] {
  return advisors.map(advisor => ({ ...advisor, assignedProcedures: [...advisor.assignedProcedures] }));
}

function cloneProcedures(procedures: Procedure[]): Procedure[] {
  return procedures.map(procedure => ({ ...procedure, effects: { ...procedure.effects } }));
}

function cloneDoctrines(doctrines: DoctrineCategory[]): DoctrineCategory[] {
  return doctrines.map(doctrine => ({
    ...doctrine,
    options: doctrine.options.map(option => ({ ...option, effects: { ...option.effects } })),
  }));
}

export function createNewCampaignState(): GameState {
  const season: Season = 'Spring';
  const year = 1;
  const metrics = cloneMetrics(INITIAL_METRICS);
  const advisors = cloneAdvisors(INITIAL_ADVISORS);
  const reports = generateReports(metrics, advisors, season, year);
  const welcomeMsg = generateWelcomeMessage(season, year);
  const conflicts = detectConflicts(metrics, reports, advisors);
  const messages: ScribeMessage[] = [
    { id: generateId(), text: welcomeMsg, type: 'welcome', season, year },
    ...conflicts.map(conflict => ({ id: generateId(), text: conflict, type: 'conflict' as const, season, year })),
  ];

  return {
    phase: 'welcome',
    season,
    year,
    metrics,
    advisors,
    reports,
    procedures: cloneProcedures(INITIAL_PROCEDURES),
    doctrines: cloneDoctrines(INITIAL_DOCTRINES),
    scribeMessages: messages,
    activeReportId: null,
    showProceduresModal: false,
    selectedAdvisorId: null,
    turnHistory: [],
  };
}
