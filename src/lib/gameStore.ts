import { create } from 'zustand';
import { GameState, Report, Procedure, DoctrineCategory, AdvisorId, Season, KingdomMetrics, Advisor, ScribeMessage, AdvisorConversation, ConversationMessage } from './gameTypes';
import { generateReports } from './reportGenerator';
import { resolveTurn } from './simulation/resolveTurn';
import { generateConsequenceMessages, detectConflicts } from './scribeLogic';
import { getScribeClarificationText, getScribeConsequenceText, getAdvisorChatReply } from './ai/runtime';
import { CAMPAIGN_STATE_VERSION, createSnapshot, migrateSnapshot } from './campaign/persistence';
import { createNewCampaignState } from './campaign/createNewCampaignState';

// suppress unused type imports - they're used via GameState
void ({} as Report);
void ({} as Procedure);
void ({} as DoctrineCategory);
void ({} as ScribeMessage);
void ({} as AdvisorConversation);
void ({} as ConversationMessage);

const CAMPAIGN_STORAGE_KEY = 'fourwarned:campaign';
const CAMPAIGN_ID_STORAGE_KEY = 'fourwarned:campaign-id';
const CONVERSATIONS_STORAGE_KEY = 'fourwarned:conversations';

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function canUseBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function clampMetric(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function cloneMetrics(metrics: KingdomMetrics): KingdomMetrics {
  return { ...metrics };
}

function cloneAdvisors(advisors: Advisor[]): Advisor[] {
  return advisors.map(advisor => ({ ...advisor, assignedProcedures: [...advisor.assignedProcedures] }));
}

function cloneReports(reports: Report[]): Report[] {
  return reports.map(report => ({
    ...report,
    choices: report.choices.map(choice => ({ ...choice, consequences: { ...choice.consequences } })),
  }));
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

function cloneMessages(messages: ScribeMessage[]): ScribeMessage[] {
  return messages.map(message => ({ ...message }));
}

function sanitizeState(candidate: unknown, fallback: GameState): GameState {
  if (!isRecord(candidate)) {
    return fallback;
  }

  const phase = candidate.phase === 'welcome' || candidate.phase === 'reports' || candidate.phase === 'resolution' || candidate.phase === 'consequences'
    ? candidate.phase
    : fallback.phase;
  const season = candidate.season === 'Spring' || candidate.season === 'Summer' || candidate.season === 'Autumn' || candidate.season === 'Winter'
    ? candidate.season
    : fallback.season;
  const year = typeof candidate.year === 'number' && Number.isFinite(candidate.year) && candidate.year >= 1
    ? Math.floor(candidate.year)
    : fallback.year;

  const rawMetrics = isRecord(candidate.metrics) ? candidate.metrics : fallback.metrics;
  const metrics: KingdomMetrics = {
    food: clampMetric(typeof rawMetrics.food === 'number' ? rawMetrics.food : fallback.metrics.food),
    morale: clampMetric(typeof rawMetrics.morale === 'number' ? rawMetrics.morale : fallback.metrics.morale),
    gold: clampMetric(typeof rawMetrics.gold === 'number' ? rawMetrics.gold : fallback.metrics.gold),
    threat: clampMetric(typeof rawMetrics.threat === 'number' ? rawMetrics.threat : fallback.metrics.threat),
    adminStrain: clampMetric(typeof rawMetrics.adminStrain === 'number' ? rawMetrics.adminStrain : fallback.metrics.adminStrain),
  };

  const advisors = Array.isArray(candidate.advisors)
    ? candidate.advisors
        .filter(isRecord)
        .map((advisor, index) => {
          const base = fallback.advisors[index] ?? fallback.advisors[0];
          const id = advisor.id === 'steward' || advisor.id === 'marshal' || advisor.id === 'merchant' || advisor.id === 'governor' ? advisor.id : base.id;
          return {
            id,
            name: typeof advisor.name === 'string' ? advisor.name : base.name,
            title: typeof advisor.title === 'string' ? advisor.title : base.title,
            region: typeof advisor.region === 'string' ? advisor.region : base.region,
            competence: clampMetric(typeof advisor.competence === 'number' ? advisor.competence : base.competence),
            loyalty: clampMetric(typeof advisor.loyalty === 'number' ? advisor.loyalty : base.loyalty),
            stress: clampMetric(typeof advisor.stress === 'number' ? advisor.stress : base.stress),
            bias: typeof advisor.bias === 'string' ? advisor.bias : base.bias,
            ambition: clampMetric(typeof advisor.ambition === 'number' ? advisor.ambition : base.ambition),
            authority: clampMetric(typeof advisor.authority === 'number' ? advisor.authority : base.authority),
            status: advisor.status === 'Active' || advisor.status === 'Concerned' || advisor.status === 'Critical' ? advisor.status : base.status,
            assignedProcedures: Array.isArray(advisor.assignedProcedures) ? advisor.assignedProcedures.filter((value): value is string => typeof value === 'string') : [...base.assignedProcedures],
            maxProcedures: typeof advisor.maxProcedures === 'number' && Number.isFinite(advisor.maxProcedures) ? Math.max(1, Math.floor(advisor.maxProcedures)) : base.maxProcedures,
          } as Advisor;
        })
    : cloneAdvisors(fallback.advisors);

  const reports = Array.isArray(candidate.reports)
    ? candidate.reports
        .filter(isRecord)
        .map((report, index) => {
          const base = fallback.reports[index];
          const advisorId = report.advisorId === 'steward' || report.advisorId === 'marshal' || report.advisorId === 'merchant' || report.advisorId === 'governor'
            ? report.advisorId
            : base?.advisorId ?? 'steward';
          const urgency = report.urgency === 'low' || report.urgency === 'medium' || report.urgency === 'high' || report.urgency === 'critical'
            ? report.urgency
            : base?.urgency ?? 'medium';

          const choices = Array.isArray(report.choices)
            ? report.choices.filter(isRecord).map((choice, choiceIndex) => {
                const baseChoice = base?.choices[choiceIndex];
                const rawConsequences = isRecord(choice.consequences) ? choice.consequences : baseChoice?.consequences ?? {};
                const consequences: Partial<KingdomMetrics> = {
                  food: typeof rawConsequences.food === 'number' ? rawConsequences.food : undefined,
                  morale: typeof rawConsequences.morale === 'number' ? rawConsequences.morale : undefined,
                  gold: typeof rawConsequences.gold === 'number' ? rawConsequences.gold : undefined,
                  threat: typeof rawConsequences.threat === 'number' ? rawConsequences.threat : undefined,
                  adminStrain: typeof rawConsequences.adminStrain === 'number' ? rawConsequences.adminStrain : undefined,
                };

                return {
                  id: typeof choice.id === 'string' ? choice.id : baseChoice?.id ?? `choice-${choiceIndex}`,
                  label: typeof choice.label === 'string' ? choice.label : baseChoice?.label ?? 'Option',
                  description: typeof choice.description === 'string' ? choice.description : baseChoice?.description ?? '',
                  consequences,
                };
              })
            : cloneReports(base ? [base] : []).at(0)?.choices ?? [];

          return {
            id: typeof report.id === 'string' ? report.id : base?.id ?? `report-${index}`,
            advisorId,
            season: report.season === 'Spring' || report.season === 'Summer' || report.season === 'Autumn' || report.season === 'Winter'
              ? report.season
              : season,
            year: typeof report.year === 'number' && Number.isFinite(report.year) && report.year >= 1 ? Math.floor(report.year) : year,
            title: typeof report.title === 'string' ? report.title : base?.title ?? 'Council Report',
            body: typeof report.body === 'string' ? report.body : base?.body ?? '',
            urgency,
            choices,
            selectedChoiceId: typeof report.selectedChoiceId === 'string' || report.selectedChoiceId === null ? report.selectedChoiceId : null,
            freeTextInstruction: typeof report.freeTextInstruction === 'string' ? report.freeTextInstruction : '',
            status: report.status === 'pending' || report.status === 'responded' ? report.status : 'pending',
            scribesNote: typeof report.scribesNote === 'string' ? report.scribesNote : base?.scribesNote ?? '',
          } as Report;
        })
    : cloneReports(fallback.reports);

  const procedures = Array.isArray(candidate.procedures)
    ? candidate.procedures.filter(isRecord).map((procedure, index) => {
        const base = fallback.procedures[index] ?? fallback.procedures[0];
        const rawEffects = isRecord(procedure.effects) ? procedure.effects : base.effects;
        const effects: Partial<KingdomMetrics> = {
          food: typeof rawEffects.food === 'number' ? rawEffects.food : undefined,
          morale: typeof rawEffects.morale === 'number' ? rawEffects.morale : undefined,
          gold: typeof rawEffects.gold === 'number' ? rawEffects.gold : undefined,
          threat: typeof rawEffects.threat === 'number' ? rawEffects.threat : undefined,
          adminStrain: typeof rawEffects.adminStrain === 'number' ? rawEffects.adminStrain : undefined,
        };
        return {
          id: typeof procedure.id === 'string' ? procedure.id : base.id,
          name: typeof procedure.name === 'string' ? procedure.name : base.name,
          description: typeof procedure.description === 'string' ? procedure.description : base.description,
          assignedTo: procedure.assignedTo === 'steward' || procedure.assignedTo === 'marshal' || procedure.assignedTo === 'merchant' || procedure.assignedTo === 'governor' || procedure.assignedTo === null
            ? procedure.assignedTo
            : null,
          effects,
        } as Procedure;
      })
    : cloneProcedures(fallback.procedures);

  const doctrines = Array.isArray(candidate.doctrines)
    ? candidate.doctrines.filter(isRecord).map((doctrine, index) => {
        const base = fallback.doctrines[index] ?? fallback.doctrines[0];
        const options = Array.isArray(doctrine.options)
          ? doctrine.options.filter(isRecord).map((option, optionIndex) => {
              const baseOption = base.options[optionIndex] ?? base.options[0];
              const rawEffects = isRecord(option.effects) ? option.effects : baseOption.effects;
              const effects: Partial<KingdomMetrics> = {
                food: typeof rawEffects.food === 'number' ? rawEffects.food : undefined,
                morale: typeof rawEffects.morale === 'number' ? rawEffects.morale : undefined,
                gold: typeof rawEffects.gold === 'number' ? rawEffects.gold : undefined,
                threat: typeof rawEffects.threat === 'number' ? rawEffects.threat : undefined,
                adminStrain: typeof rawEffects.adminStrain === 'number' ? rawEffects.adminStrain : undefined,
              };

              return {
                id: typeof option.id === 'string' ? option.id : baseOption.id,
                label: typeof option.label === 'string' ? option.label : baseOption.label,
                description: typeof option.description === 'string' ? option.description : baseOption.description,
                effects,
              };
            })
          : base.options.map(option => ({ ...option, effects: { ...option.effects } }));

        return {
          id: typeof doctrine.id === 'string' ? doctrine.id : base.id,
          name: typeof doctrine.name === 'string' ? doctrine.name : base.name,
          selected: typeof doctrine.selected === 'string' ? doctrine.selected : base.selected,
          options,
        } as DoctrineCategory;
      })
    : cloneDoctrines(fallback.doctrines);

  const scribeMessages = Array.isArray(candidate.scribeMessages)
    ? candidate.scribeMessages.filter(isRecord).map((message, index) => {
        const fallbackMessage = fallback.scribeMessages[index];
        return {
          id: typeof message.id === 'string' ? message.id : fallbackMessage?.id ?? `msg-${index}`,
          text: typeof message.text === 'string' ? message.text : fallbackMessage?.text ?? '',
          type: message.type === 'guidance' || message.type === 'conflict' || message.type === 'consequence' || message.type === 'welcome'
            ? message.type
            : fallbackMessage?.type ?? 'guidance',
          season: message.season === 'Spring' || message.season === 'Summer' || message.season === 'Autumn' || message.season === 'Winter'
            ? message.season
            : season,
          year: typeof message.year === 'number' && Number.isFinite(message.year) && message.year >= 1 ? Math.floor(message.year) : year,
        } as ScribeMessage;
      })
    : cloneMessages(fallback.scribeMessages);

  const turnHistory = Array.isArray(candidate.turnHistory)
    ? candidate.turnHistory.filter(isRecord).map((record) => {
        const metricsSnapshot = isRecord(record.metricsSnapshot) ? record.metricsSnapshot : fallback.metrics;
        return {
          season: record.season === 'Spring' || record.season === 'Summer' || record.season === 'Autumn' || record.season === 'Winter'
            ? record.season
            : season,
          year: typeof record.year === 'number' && Number.isFinite(record.year) && record.year >= 1 ? Math.floor(record.year) : year,
          metricsSnapshot: {
            food: clampMetric(typeof metricsSnapshot.food === 'number' ? metricsSnapshot.food : fallback.metrics.food),
            morale: clampMetric(typeof metricsSnapshot.morale === 'number' ? metricsSnapshot.morale : fallback.metrics.morale),
            gold: clampMetric(typeof metricsSnapshot.gold === 'number' ? metricsSnapshot.gold : fallback.metrics.gold),
            threat: clampMetric(typeof metricsSnapshot.threat === 'number' ? metricsSnapshot.threat : fallback.metrics.threat),
            adminStrain: clampMetric(typeof metricsSnapshot.adminStrain === 'number' ? metricsSnapshot.adminStrain : fallback.metrics.adminStrain),
          },
          reportsSummary: Array.isArray(record.reportsSummary) ? record.reportsSummary.filter((value): value is string => typeof value === 'string') : [],
        };
      })
    : fallback.turnHistory.map(record => ({
        ...record,
        metricsSnapshot: { ...record.metricsSnapshot },
        reportsSummary: [...record.reportsSummary],
      }));

  return {
    phase,
    season,
    year,
    metrics,
    advisors: advisors.length > 0 ? advisors : cloneAdvisors(fallback.advisors),
    reports,
    procedures,
    doctrines,
    scribeMessages: scribeMessages.length > 0 ? scribeMessages : cloneMessages(fallback.scribeMessages),
    activeReportId: typeof candidate.activeReportId === 'string' || candidate.activeReportId === null ? candidate.activeReportId : null,
    showProceduresModal: typeof candidate.showProceduresModal === 'boolean' ? candidate.showProceduresModal : false,
    selectedAdvisorId: candidate.selectedAdvisorId === 'steward' || candidate.selectedAdvisorId === 'marshal' || candidate.selectedAdvisorId === 'merchant' || candidate.selectedAdvisorId === 'governor' || candidate.selectedAdvisorId === null
      ? candidate.selectedAdvisorId
      : null,
    turnHistory,
  };
}

function readPersistedConversations(): Partial<Record<AdvisorId, AdvisorConversation>> {
  if (!canUseBrowserStorage()) return {};
  try {
    const raw = window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Partial<Record<AdvisorId, AdvisorConversation>>;
  } catch {
    return {};
  }
}

function writePersistedConversations(conversations: Record<AdvisorId, AdvisorConversation>): void {
  if (!canUseBrowserStorage()) return;
  try {
    const persistent = Object.fromEntries(
      Object.entries(conversations).filter(([, conv]) => conv.isPersistent)
    );
    window.localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(persistent));
  } catch {
    // no-op
  }
}

function readPersistedCampaignState(fallback: GameState): GameState | null {
  if (!canUseBrowserStorage()) return null;

  try {
    const raw = window.localStorage.getItem(CAMPAIGN_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;

    const isVersionedSnapshot = 'version' in parsed || 'state' in parsed || 'savedAt' in parsed;
    if (isVersionedSnapshot) {
      if (typeof parsed.version !== 'number' || !Number.isInteger(parsed.version)) {
        return null;
      }

      if (parsed.version > CAMPAIGN_STATE_VERSION) {
        return null;
      }
    }
    const migrated = migrateSnapshot(parsed);
    if (!migrated) {
      return null;
    }
    return sanitizeState(migrated.state, fallback);
  } catch {
    return null;
  }
}

function writePersistedCampaignState(state: GameState): boolean {
  if (!canUseBrowserStorage()) return false;
  try {
    window.localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(createSnapshot(state)));
    return true;
  } catch {
    return false;
  }
}

function readPersistedCampaignId(): string | null {
  if (!canUseBrowserStorage()) return null;
  try {
    const id = window.localStorage.getItem(CAMPAIGN_ID_STORAGE_KEY);
    return id && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

function writePersistedCampaignId(campaignId: string): boolean {
  if (!canUseBrowserStorage()) return false;
  try {
    window.localStorage.setItem(CAMPAIGN_ID_STORAGE_KEY, campaignId);
    return true;
  } catch {
    return false;
  }
}

function clearPersistedCampaignState() {
  if (!canUseBrowserStorage()) return;
  try {
    window.localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
    window.localStorage.removeItem(CAMPAIGN_ID_STORAGE_KEY);
  } catch {
    // no-op
  }
}

async function startServerCampaign(initialState: GameState): Promise<string | null> {
  try {
    const response = await fetch('/api/campaign/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialState }),
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!isRecord(data) || typeof data.campaignId !== 'string') return null;
    return data.campaignId;
  } catch {
    return null;
  }
}

async function loadServerCampaign(campaignId: string): Promise<GameState | null> {
  try {
    const response = await fetch(`/api/campaign/${campaignId}`, { method: 'GET' });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    const migrated = migrateSnapshot(data);
    if (!migrated) return null;
    return migrated.state;
  } catch {
    return null;
  }
}

async function saveServerCampaign(campaignId: string, state: GameState): Promise<boolean> {
  try {
    const response = await fetch(`/api/campaign/${campaignId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

interface GameStore extends GameState {
  isAdvancingTurn: boolean;
  campaignId: string | null;
  conversations: Record<AdvisorId, AdvisorConversation>;
  isChatLoading: boolean;
  showChatModal: boolean;
  chatAdvisorId: AdvisorId | null;
  initGame: () => Promise<void>;
  saveCampaignState: () => Promise<boolean>;
  loadCampaignState: () => Promise<boolean>;
  resetCampaignState: () => void;
  selectReport: (id: string | null) => void;
  chooseReportOption: (reportId: string, choiceId: string) => void;
  setFreeTextInstruction: (reportId: string, text: string) => void;
  advanceTurn: () => void;
  updateDoctrine: (categoryId: string, optionId: string) => void;
  assignProcedure: (procedureId: string, advisorId: AdvisorId | null) => void;
  openProceduresModal: (advisorId: AdvisorId) => void;
  closeProceduresModal: () => void;
  dismissWelcome: () => void;
  openChatModal: (advisorId: AdvisorId) => void;
  closeChatModal: () => void;
  sendChatMessage: (advisorId: AdvisorId, text: string) => Promise<void>;
  clearConversation: (advisorId: AdvisorId) => void;
  toggleConversationPersistence: (advisorId: AdvisorId) => void;
}

function pickGameState(store: GameStore): GameState {
  return {
    phase: store.phase,
    season: store.season,
    year: store.year,
    metrics: cloneMetrics(store.metrics),
    advisors: cloneAdvisors(store.advisors),
    reports: cloneReports(store.reports),
    procedures: cloneProcedures(store.procedures),
    doctrines: cloneDoctrines(store.doctrines),
    scribeMessages: cloneMessages(store.scribeMessages),
    activeReportId: store.activeReportId,
    showProceduresModal: store.showProceduresModal,
    selectedAdvisorId: store.selectedAdvisorId,
    turnHistory: store.turnHistory.map(record => ({
      ...record,
      metricsSnapshot: cloneMetrics(record.metricsSnapshot),
      reportsSummary: [...record.reportsSummary],
    })),
  };
}

export const useGameStore = create<GameStore>((set, get) => {
  const initial = createNewCampaignState();

  return {
    ...initial,
    isAdvancingTurn: false,
    campaignId: null,
    conversations: {} as Record<AdvisorId, AdvisorConversation>,
    isChatLoading: false,
    showChatModal: false,
    chatAdvisorId: null,

    initGame: async () => {
      const loaded = await get().loadCampaignState();
      if (loaded) return;

      const fresh = createNewCampaignState();
      const campaignId = await startServerCampaign(fresh);
      if (campaignId) {
        writePersistedCampaignId(campaignId);
      }
      set({ ...fresh, isAdvancingTurn: false, campaignId });
      void get().saveCampaignState();
    },

    saveCampaignState: async () => {
      const snapshot = pickGameState(get());
      const localSaved = writePersistedCampaignState(snapshot);
      const campaignId = get().campaignId ?? readPersistedCampaignId();
      if (!campaignId) {
        return localSaved;
      }
      const serverSaved = await saveServerCampaign(campaignId, snapshot);
      return serverSaved || localSaved;
    },

    loadCampaignState: async () => {
      const fallback = createNewCampaignState();
      const persistedCampaignId = readPersistedCampaignId();
      if (persistedCampaignId) {
        const serverState = await loadServerCampaign(persistedCampaignId);
        if (serverState) {
          const normalized = sanitizeState(serverState, fallback);
          writePersistedCampaignId(persistedCampaignId);
          set({
            ...normalized,
            campaignId: persistedCampaignId,
            showProceduresModal: false,
            selectedAdvisorId: null,
          });
          writePersistedCampaignState(normalized);
          return true;
        }
      }

      const loaded = readPersistedCampaignState(fallback);
      if (!loaded) return false;

      const campaignId = persistedCampaignId ?? await startServerCampaign(loaded);
      if (campaignId) {
        writePersistedCampaignId(campaignId);
      }

      set({
        ...loaded,
        isAdvancingTurn: false,
        campaignId,
        showProceduresModal: false,
        selectedAdvisorId: null,
      });

      if (campaignId) {
        void saveServerCampaign(campaignId, loaded);
      }
      return true;
    },

    resetCampaignState: () => {
      clearPersistedCampaignState();
      const fresh = createNewCampaignState();
      set({ ...fresh, isAdvancingTurn: false, campaignId: null });
      void get().initGame();
    },

    dismissWelcome: () => {
      set({ phase: 'reports' });
      void get().saveCampaignState();
    },

    selectReport: (id) => {
      set({ activeReportId: id });
      void get().saveCampaignState();

      if (!id) return;

      const state = get();
      const report = state.reports.find(r => r.id === id);
      if (!report) return;

      void getScribeClarificationText(report, state.metrics).then(result => {
        set(current => {
          const alreadyPresent = current.scribeMessages.some(
            msg => msg.type === 'guidance' && msg.season === current.season && msg.year === current.year && msg.text.includes(`Regarding "${report.title}"`)
          );
          if (alreadyPresent) {
            return current;
          }

          return {
            scribeMessages: [
              ...current.scribeMessages,
              {
                id: generateId(),
                text: result.text,
                type: 'guidance',
                season: current.season,
                year: current.year,
              },
            ],
          };
        });
        void get().saveCampaignState();
      });
    },

    chooseReportOption: (reportId, choiceId) => {
      set(state => ({
        reports: state.reports.map(report =>
          report.id === reportId
            ? { ...report, selectedChoiceId: choiceId, status: 'responded' }
            : report
        ),
      }));
      void get().saveCampaignState();
    },

    setFreeTextInstruction: (reportId, text) => {
      set(state => ({
        reports: state.reports.map(report =>
          report.id === reportId ? { ...report, freeTextInstruction: text } : report
        ),
      }));
      void get().saveCampaignState();
    },

    updateDoctrine: (categoryId, optionId) => {
      set(state => ({
        doctrines: state.doctrines.map(doctrine =>
          doctrine.id === categoryId ? { ...doctrine, selected: optionId } : doctrine
        ),
      }));
      void get().saveCampaignState();
    },

    assignProcedure: (procedureId, advisorId) => {
      set(state => {
        const procedure = state.procedures.find(item => item.id === procedureId);
        if (!procedure) return state;

        const targetAdvisor = advisorId ? state.advisors.find(advisor => advisor.id === advisorId) : null;
        if (targetAdvisor && targetAdvisor.assignedProcedures.length >= targetAdvisor.maxProcedures) {
          return state;
        }

        return {
          procedures: state.procedures.map(item =>
            item.id === procedureId ? { ...item, assignedTo: advisorId } : item
          ),
          advisors: state.advisors.map(advisor => {
            if (procedure.assignedTo && advisor.id === procedure.assignedTo) {
              return { ...advisor, assignedProcedures: advisor.assignedProcedures.filter(id => id !== procedureId) };
            }
            if (advisorId && advisor.id === advisorId) {
              return { ...advisor, assignedProcedures: [...advisor.assignedProcedures, procedureId] };
            }
            return advisor;
          }),
        };
      });
      void get().saveCampaignState();
    },

    openProceduresModal: (advisorId) => {
      set({ showProceduresModal: true, selectedAdvisorId: advisorId });
      void get().saveCampaignState();
    },

    closeProceduresModal: () => {
      set({ showProceduresModal: false, selectedAdvisorId: null });
      void get().saveCampaignState();
    },

    openChatModal: (advisorId) => {
      const persisted = readPersistedConversations();
      set(state => {
        const existing = state.conversations[advisorId];
        const persistedConv = persisted[advisorId];
        const conversation: AdvisorConversation = existing ?? persistedConv ?? { messages: [], isPersistent: false };
        return {
          showChatModal: true,
          chatAdvisorId: advisorId,
          conversations: { ...state.conversations, [advisorId]: conversation },
        };
      });
    },

    closeChatModal: () => {
      set({ showChatModal: false, chatAdvisorId: null });
    },

    sendChatMessage: async (advisorId, text) => {
      const state = get();
      const advisor = state.advisors.find(a => a.id === advisorId);
      if (!advisor) return;

      const userMsg: ConversationMessage = {
        id: generateId(),
        role: 'user',
        text,
        timestamp: Date.now(),
      };

      set(s => ({
        isChatLoading: true,
        conversations: {
          ...s.conversations,
          [advisorId]: {
            ...s.conversations[advisorId] ?? { messages: [], isPersistent: false },
            messages: [...(s.conversations[advisorId]?.messages ?? []), userMsg],
          },
        },
      }));

      const currentConv = get().conversations[advisorId] ?? { messages: [], isPersistent: false };
      const history = currentConv.messages
        .filter(m => m.id !== userMsg.id)
        .map(m => ({ role: m.role, text: m.text }));

      const reply = await getAdvisorChatReply(advisor, state.metrics, history, text);

      const advisorMsg: ConversationMessage = {
        id: generateId(),
        role: 'advisor',
        text: reply.text,
        timestamp: Date.now(),
        source: reply.source,
      };

      set(s => {
        const updated: AdvisorConversation = {
          ...s.conversations[advisorId] ?? { messages: [], isPersistent: false },
          messages: [...(s.conversations[advisorId]?.messages ?? []), advisorMsg],
        };
        const updatedConvs = { ...s.conversations, [advisorId]: updated };
        if (updated.isPersistent) {
          writePersistedConversations(updatedConvs);
        }
        return { isChatLoading: false, conversations: updatedConvs };
      });
    },

    clearConversation: (advisorId) => {
      set(s => {
        const existing = s.conversations[advisorId] ?? { messages: [], isPersistent: false };
        const updated = { ...existing, messages: [] };
        const updatedConvs = { ...s.conversations, [advisorId]: updated };
        writePersistedConversations(updatedConvs);
        return { conversations: updatedConvs };
      });
    },

    toggleConversationPersistence: (advisorId) => {
      set(s => {
        const existing = s.conversations[advisorId] ?? { messages: [], isPersistent: false };
        const updated = { ...existing, isPersistent: !existing.isPersistent };
        const updatedConvs = { ...s.conversations, [advisorId]: updated };
        writePersistedConversations(updatedConvs);
        return { conversations: updatedConvs };
      });
    },

    advanceTurn: () => {
      if (get().isAdvancingTurn) return;

      const state = get();
      const { metrics, advisors, reports, procedures, doctrines, season, year } = state;
      const respondedReports = reports.filter(report => report.status === 'responded');
      if (respondedReports.length === 0) return;

      set({ isAdvancingTurn: true, phase: 'resolution' });

      const applyTurnResult = (newMetrics: KingdomMetrics, newAdvisors: Advisor[]) => {
        const nextSeason: Season = season === 'Spring' ? 'Summer'
          : season === 'Summer' ? 'Autumn'
          : season === 'Autumn' ? 'Winter'
          : 'Spring';
        const nextYear = season === 'Winter' ? year + 1 : year;

        const newReports = generateReports(newMetrics, newAdvisors, nextSeason, nextYear);
        const fallbackConsequenceMessages = generateConsequenceMessages(metrics, newMetrics, reports, nextSeason, nextYear);
        const fallbackConsequenceId = fallbackConsequenceMessages[0]?.id ?? null;
        const conflicts = detectConflicts(newMetrics, newReports, newAdvisors);

        const newMessages: ScribeMessage[] = [
          ...fallbackConsequenceMessages,
          ...conflicts.map(conflict => ({ id: generateId(), text: conflict, type: 'conflict' as const, season: nextSeason, year: nextYear })),
        ];

        const turnRecord = {
          season,
          year,
          metricsSnapshot: { ...metrics },
          reportsSummary: reports.filter(report => report.status === 'responded').map(report => {
            const choice = report.choices.find(item => item.id === report.selectedChoiceId);
            return `${report.advisorId}: ${choice?.label ?? 'No response'}`;
          }),
        };

        set({
          isAdvancingTurn: false,
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
        void get().saveCampaignState();

        if (!fallbackConsequenceId) return;
        void getScribeConsequenceText(metrics, newMetrics, nextSeason, nextYear).then(result => {
          if (!result) return;

          set(current => ({
            scribeMessages: current.scribeMessages.map(message =>
              message.id === fallbackConsequenceId
                ? { ...message, text: result.text }
                : message
            ),
          }));
          void get().saveCampaignState();
        });
      };

      void (async () => {
        try {
          const campaignId = get().campaignId ?? readPersistedCampaignId();
          if (campaignId) {
            try {
              const response = await fetch('/api/turn/advance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  campaignId,
                  metrics,
                  advisors,
                  reports,
                  procedures,
                  doctrines,
                  season,
                  year,
                }),
              });
              if (response.ok) {
                const data: unknown = await response.json();
                if (isRecord(data) && isRecord(data.newMetrics) && Array.isArray(data.newAdvisors)) {
                  applyTurnResult(data.newMetrics as KingdomMetrics, data.newAdvisors as Advisor[]);
                  return;
                }
              }
            } catch {
              // fall back to local deterministic simulation
            }
          }

          const localResult = resolveTurn(metrics, advisors, reports, procedures, doctrines, season, year);
          applyTurnResult(localResult.newMetrics, localResult.newAdvisors);
        } catch (error) {
          console.error('Failed to advance turn.', error);
          set({ isAdvancingTurn: false, phase: 'reports' });
        }
      })();
    },
  };
});
