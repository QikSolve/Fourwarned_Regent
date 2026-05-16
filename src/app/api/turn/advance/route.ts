import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveTurn } from '@/lib/simulation/resolveTurn';
import type { KingdomMetrics, Advisor, Report, Procedure, DoctrineCategory, Season } from '@/types/game';
import {
  AdvisorSchema,
  DoctrineCategorySchema,
  KingdomMetricsSchema,
  ProcedureSchema,
  ReportSchema,
  SeasonSchema,
} from '@/lib/contracts/gameplay';
import { incrementCounter } from '@/lib/observability/metrics';
import { logApiError } from '@/lib/observability/logger';

const RequestSchema = z.object({
  campaignId: z.string().uuid(),
  metrics: KingdomMetricsSchema,
  advisors: z.array(AdvisorSchema),
  reports: z.array(ReportSchema),
  procedures: z.array(ProcedureSchema),
  doctrines: z.array(DoctrineCategorySchema),
  season: SeasonSchema,
  year: z.number().min(1),
}).strict();

const ResponseSchema = z.object({
  newMetrics: KingdomMetricsSchema,
  newAdvisors: z.array(AdvisorSchema),
  events: z.array(z.object({
    id: z.string(),
    season: SeasonSchema,
    year: z.number().int().min(1),
    description: z.string(),
    delta: z.object({
      food: z.number().optional(),
      morale: z.number().optional(),
      gold: z.number().optional(),
      threat: z.number().optional(),
      adminStrain: z.number().optional(),
    }).strict(),
  }).strict()),
}).strict();

/**
 * POST /api/turn/advance
 * Runs the deterministic simulation for one turn and returns updated state.
 * In production this also persists the new state to Postgres.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { metrics, advisors, reports, procedures, doctrines, season, year } = parsed.data;

    const result = resolveTurn(
      metrics as KingdomMetrics,
      advisors as Advisor[],
      reports as Report[],
      procedures as Procedure[],
      doctrines as DoctrineCategory[],
      season as Season,
      year
    );

    const response = ResponseSchema.parse({
      newMetrics: result.newMetrics,
      newAdvisors: result.newAdvisors,
      events: result.events,
    });
    incrementCounter('turnAdvanceSuccess');
    return NextResponse.json(response);
  } catch (error) {
    incrementCounter('turnAdvanceFailure');
    incrementCounter('apiFailure');
    logApiError('turn.advance.failed', error, {});
    return NextResponse.json({ error: 'Failed to advance turn' }, { status: 500 });
  }
}
