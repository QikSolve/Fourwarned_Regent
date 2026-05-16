import { create } from 'zustand';
import { GameState, Report, Procedure, DoctrineCategory, AdvisorId, Season, KingdomMetrics, Advisor, ScribeMessage } from './gameTypes';
import { generateReports } from './reportGenerator';
import { resolveTurn } from './simulation/resolveTurn';
import { generateWelcomeMessage, generateConsequenceMessages, detectConflicts } from './scribeLogic';

// suppress unused type imports - they're used via GameState
void ({} as Report);
void ({} as Procedure);
void ({} as DoctrineCategory);
void ({} as ScribeMessage);

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

const INITIAL_PROCEDURES = [
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

const INITIAL_DOCTRINES = [
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

interface GameStore extends GameState {
  initGame: () => void;
  selectReport: (id: string | null) => void;
  chooseReportOption: (reportId: string, choiceId: string) => void;
  setFreeTextInstruction: (reportId: string, text: string) => void;
  advanceTurn: () => void;
  updateDoctrine: (categoryId: string, optionId: string) => void;
  assignProcedure: (procedureId: string, advisorId: AdvisorId | null) => void;
  openProceduresModal: (advisorId: AdvisorId) => void;
  closeProceduresModal: () => void;
  dismissWelcome: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'welcome',
  season: 'Spring',
  year: 1,
  metrics: INITIAL_METRICS,
  advisors: INITIAL_ADVISORS,
  reports: [],
  procedures: INITIAL_PROCEDURES,
  doctrines: INITIAL_DOCTRINES,
  scribeMessages: [],
  activeReportId: null,
  showProceduresModal: false,
  selectedAdvisorId: null,
  turnHistory: [],

  initGame: () => {
    const metrics = INITIAL_METRICS;
    const advisors = INITIAL_ADVISORS;
    const season: Season = 'Spring';
    const year = 1;
    const reports = generateReports(metrics, advisors, season, year);
    const welcomeMsg = generateWelcomeMessage(season, year);
    const conflicts = detectConflicts(metrics, reports, advisors);
    
    const messages: ScribeMessage[] = [
      { id: generateId(), text: welcomeMsg, type: 'welcome', season, year },
      ...conflicts.map(c => ({ id: generateId(), text: c, type: 'conflict' as const, season, year })),
    ];

    set({
      phase: 'welcome',
      season,
      year,
      metrics,
      advisors: advisors.map(a => ({ ...a })),
      reports,
      procedures: INITIAL_PROCEDURES.map(p => ({ ...p })),
      doctrines: INITIAL_DOCTRINES.map(d => ({ ...d, options: d.options.map(o => ({ ...o })) })),
      scribeMessages: messages,
      activeReportId: null,
      turnHistory: [],
    });
  },

  dismissWelcome: () => {
    set({ phase: 'reports' });
  },

  selectReport: (id) => {
    set({ activeReportId: id });
  },

  chooseReportOption: (reportId, choiceId) => {
    set(state => ({
      reports: state.reports.map(r =>
        r.id === reportId
          ? { ...r, selectedChoiceId: choiceId, status: 'responded' }
          : r
      ),
    }));
  },

  setFreeTextInstruction: (reportId, text) => {
    set(state => ({
      reports: state.reports.map(r =>
        r.id === reportId ? { ...r, freeTextInstruction: text } : r
      ),
    }));
  },

  updateDoctrine: (categoryId, optionId) => {
    set(state => ({
      doctrines: state.doctrines.map(d =>
        d.id === categoryId ? { ...d, selected: optionId } : d
      ),
    }));
  },

  assignProcedure: (procedureId, advisorId) => {
    set(state => {
      const procedure = state.procedures.find(p => p.id === procedureId);
      if (!procedure) return state;

      const targetAdvisor = advisorId ? state.advisors.find(a => a.id === advisorId) : null;
      if (targetAdvisor && targetAdvisor.assignedProcedures.length >= targetAdvisor.maxProcedures) {
        return state;
      }

      return {
        procedures: state.procedures.map(p =>
          p.id === procedureId ? { ...p, assignedTo: advisorId } : p
        ),
        advisors: state.advisors.map(a => {
          if (procedure.assignedTo && a.id === procedure.assignedTo) {
            return { ...a, assignedProcedures: a.assignedProcedures.filter(id => id !== procedureId) };
          }
          if (advisorId && a.id === advisorId) {
            return { ...a, assignedProcedures: [...a.assignedProcedures, procedureId] };
          }
          return a;
        }),
      };
    });
  },

  openProceduresModal: (advisorId) => {
    set({ showProceduresModal: true, selectedAdvisorId: advisorId });
  },

  closeProceduresModal: () => {
    set({ showProceduresModal: false, selectedAdvisorId: null });
  },

  advanceTurn: () => {
    const state = get();
    const { metrics, advisors, reports, procedures, doctrines, season, year } = state;

    const respondedReports = reports.filter(r => r.status === 'responded');
    if (respondedReports.length === 0) return;

    const { newMetrics, newAdvisors } = resolveTurn(
      metrics,
      advisors,
      reports,
      procedures,
      doctrines,
      season,
      year
    );

    const nextSeason: Season = season === 'Spring' ? 'Summer'
      : season === 'Summer' ? 'Autumn'
      : season === 'Autumn' ? 'Winter'
      : 'Spring';
    const nextYear = season === 'Winter' ? year + 1 : year;

    const newReports = generateReports(newMetrics, newAdvisors, nextSeason, nextYear);
    const consequenceMessages = generateConsequenceMessages(metrics, newMetrics, reports, nextSeason, nextYear);
    const conflicts = detectConflicts(newMetrics, newReports, newAdvisors);

    const newMessages: ScribeMessage[] = [
      ...consequenceMessages,
      ...conflicts.map(c => ({ id: generateId(), text: c, type: 'conflict' as const, season: nextSeason, year: nextYear })),
    ];

    const turnRecord = {
      season,
      year,
      metricsSnapshot: { ...metrics },
      reportsSummary: reports.filter(r => r.status === 'responded').map(r => {
        const choice = r.choices.find(c => c.id === r.selectedChoiceId);
        return `${r.advisorId}: ${choice?.label ?? 'No response'}`;
      }),
    };

    set({
      phase: 'reports',
      season: nextSeason,
      year: nextYear,
      metrics: newMetrics,
      advisors: newAdvisors,
      reports: newReports,
      scribeMessages: newMessages,
      activeReportId: null,
      turnHistory: [...state.turnHistory, turnRecord],
    });
  },
}));
