import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveTurn } from '@/lib/simulation/resolveTurn';
import type { KingdomMetrics, Advisor, Report, Procedure, DoctrineCategory, Season } from '@/types/game';

const MetricsSchema = z.object({
  food: z.number().min(0).max(100),
  morale: z.number().min(0).max(100),
  gold: z.number().min(0).max(100),
  threat: z.number().min(0).max(100),
  adminStrain: z.number().min(0).max(100),
});

const RequestSchema = z.object({
  campaignId: z.string(),
  metrics: MetricsSchema,
  advisors: z.array(z.unknown()),
  reports: z.array(z.unknown()),
  procedures: z.array(z.unknown()),
  doctrines: z.array(z.unknown()),
  season: z.enum(['Spring', 'Summer', 'Autumn', 'Winter']),
  year: z.number().min(1),
});

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

    return NextResponse.json({
      newMetrics: result.newMetrics,
      newAdvisors: result.newAdvisors,
      events: result.events,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to advance turn' }, { status: 500 });
  }
}
