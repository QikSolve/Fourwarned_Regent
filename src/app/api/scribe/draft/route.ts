import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getScribeClarification, getScribeConsequenceSummary } from '@/lib/ai/scribe';
import type { Report, KingdomMetrics, Season } from '@/types/game';

const MetricsSchema = z.object({
  food: z.number().min(0).max(100),
  morale: z.number().min(0).max(100),
  gold: z.number().min(0).max(100),
  threat: z.number().min(0).max(100),
  adminStrain: z.number().min(0).max(100),
});

const ClarificationRequestSchema = z.object({
  action: z.literal('clarify'),
  report: z.unknown(),
  metrics: MetricsSchema,
});

const ConsequenceRequestSchema = z.object({
  action: z.literal('consequence'),
  oldMetrics: MetricsSchema,
  newMetrics: MetricsSchema,
  season: z.enum(['Spring', 'Summer', 'Autumn', 'Winter']),
  year: z.number().min(1),
});

const RequestSchema = z.discriminatedUnion('action', [
  ClarificationRequestSchema,
  ConsequenceRequestSchema,
]);

/**
 * POST /api/scribe/draft
 * Returns Scribe clarification or consequence narration.
 * Uses the AI layer (deterministic prototype / LLM in production).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.action === 'clarify') {
      const result = await getScribeClarification(
        parsed.data.report as Report,
        parsed.data.metrics as KingdomMetrics
      );
      return NextResponse.json(result);
    }

    // consequence
    const { oldMetrics, newMetrics, season, year } = parsed.data;
    const result = await getScribeConsequenceSummary(
      oldMetrics as KingdomMetrics,
      newMetrics as KingdomMetrics,
      season as Season,
      year
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to draft Scribe response' }, { status: 500 });
  }
}
