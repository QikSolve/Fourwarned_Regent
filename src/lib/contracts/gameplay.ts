import { z } from 'zod';

export const AdvisorIdSchema = z.enum(['steward', 'marshal', 'merchant', 'governor']);
export const SeasonSchema = z.enum(['Spring', 'Summer', 'Autumn', 'Winter']);
export const UrgencySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const AdvisorStatusSchema = z.enum(['Active', 'Concerned', 'Critical']);
export const GamePhaseSchema = z.enum(['welcome', 'reports', 'resolution', 'consequences']);

export const KingdomMetricsSchema = z.object({
  food: z.number().min(0).max(100),
  morale: z.number().min(0).max(100),
  gold: z.number().min(0).max(100),
  threat: z.number().min(0).max(100),
  adminStrain: z.number().min(0).max(100),
}).strict();

export const MetricsDeltaSchema = z.object({
  food: z.number().optional(),
  morale: z.number().optional(),
  gold: z.number().optional(),
  threat: z.number().optional(),
  adminStrain: z.number().optional(),
}).strict();

export const AdvisorSchema = z.object({
  id: AdvisorIdSchema,
  name: z.string().min(1),
  title: z.string().min(1),
  region: z.string().min(1),
  competence: z.number().min(0).max(100),
  loyalty: z.number().min(0).max(100),
  stress: z.number().min(0).max(100),
  bias: z.string().min(1),
  ambition: z.number().min(0).max(100),
  authority: z.number().min(0).max(100),
  status: AdvisorStatusSchema,
  assignedProcedures: z.array(z.string()),
  maxProcedures: z.number().int().min(1).max(10),
}).strict();

export const ReportChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string(),
  consequences: MetricsDeltaSchema,
}).strict();

export const ReportSchema = z.object({
  id: z.string().min(1),
  advisorId: AdvisorIdSchema,
  season: SeasonSchema,
  year: z.number().int().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  urgency: UrgencySchema,
  choices: z.array(ReportChoiceSchema).min(2).max(4),
  selectedChoiceId: z.string().nullable(),
  freeTextInstruction: z.string(),
  status: z.enum(['pending', 'responded']),
  scribesNote: z.string().min(1),
}).strict();

export const ProcedureSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  assignedTo: AdvisorIdSchema.nullable(),
  effects: MetricsDeltaSchema,
}).strict();

export const DoctrineOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  effects: MetricsDeltaSchema,
}).strict();

export const DoctrineCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  options: z.array(DoctrineOptionSchema).min(1),
  selected: z.string().min(1),
}).strict();

export const ScribeMessageSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  type: z.enum(['guidance', 'conflict', 'consequence', 'welcome']),
  season: SeasonSchema,
  year: z.number().int().min(1),
}).strict();

export const TurnRecordSchema = z.object({
  season: SeasonSchema,
  year: z.number().int().min(1),
  metricsSnapshot: KingdomMetricsSchema,
  reportsSummary: z.array(z.string()),
}).strict();

export const GameStateSchema = z.object({
  phase: GamePhaseSchema,
  season: SeasonSchema,
  year: z.number().int().min(1),
  metrics: KingdomMetricsSchema,
  advisors: z.array(AdvisorSchema).min(1),
  reports: z.array(ReportSchema),
  procedures: z.array(ProcedureSchema),
  doctrines: z.array(DoctrineCategorySchema),
  scribeMessages: z.array(ScribeMessageSchema),
  activeReportId: z.string().nullable(),
  showProceduresModal: z.boolean(),
  selectedAdvisorId: AdvisorIdSchema.nullable(),
  turnHistory: z.array(TurnRecordSchema),
}).strict();

export const PersistedCampaignSnapshotSchema = z.object({
  version: z.number().int().min(1),
  savedAt: z.string().datetime(),
  state: GameStateSchema,
}).strict();

export type PersistedCampaignSnapshot = z.infer<typeof PersistedCampaignSnapshotSchema>;
