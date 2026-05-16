import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getScribeClarification, getScribeConsequenceSummary } from '@/lib/ai/scribe';
import type { Report, KingdomMetrics, Season } from '@/types/game';
import { KingdomMetricsSchema, ReportSchema, SeasonSchema } from '@/lib/contracts/gameplay';
import { ScribeClarificationSchema, ScribeConsequenceSchema } from '@/lib/ai/schemas';
import { incrementCounter } from '@/lib/observability/metrics';
import { logApiError } from '@/lib/observability/logger';

const ClarificationRequestSchema = z.object({
  action: z.literal('clarify'),
  report: ReportSchema,
  metrics: KingdomMetricsSchema,
}).strict();

const ConsequenceRequestSchema = z.object({
  action: z.literal('consequence'),
  oldMetrics: KingdomMetricsSchema,
  newMetrics: KingdomMetricsSchema,
  season: SeasonSchema,
  year: z.number().min(1),
}).strict();

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
      const validated = ScribeClarificationSchema.safeParse(result);
      if (!validated.success) {
        return NextResponse.json({ error: validated.error.flatten() }, { status: 500 });
      }
      return NextResponse.json(validated.data);
    }

    // consequence
    const { oldMetrics, newMetrics, season, year } = parsed.data;
    const result = await getScribeConsequenceSummary(
      oldMetrics as KingdomMetrics,
      newMetrics as KingdomMetrics,
      season as Season,
      year
    );
    const validated = ScribeConsequenceSchema.safeParse(result);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.flatten() }, { status: 500 });
    }
    return NextResponse.json(validated.data);
  } catch (error) {
    incrementCounter('apiFailure');
    logApiError('scribe.draft.failed', error, {});
    return NextResponse.json({ error: 'Failed to draft Scribe response' }, { status: 500 });
  }
}
