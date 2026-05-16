import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdvisorRecommendation } from '@/lib/ai/advisors';
import type { Advisor, KingdomMetrics } from '@/types/game';
import { AdvisorSchema, KingdomMetricsSchema } from '@/lib/contracts/gameplay';
import { AdvisorRecommendationSchema } from '@/lib/ai/schemas';
import { incrementCounter } from '@/lib/observability/metrics';
import { logApiError } from '@/lib/observability/logger';

const RequestSchema = z.object({
  advisor: AdvisorSchema,
  metrics: KingdomMetricsSchema,
}).strict();

/**
 * POST /api/advisor/recommend
 * Returns a structured advisor recommendation for the given kingdom state.
 * Uses the AI layer (deterministic prototype / LLM in production).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const result = await getAdvisorRecommendation(
      parsed.data.advisor as Advisor,
      parsed.data.metrics as KingdomMetrics
    );

    const validated = AdvisorRecommendationSchema.safeParse(result);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.flatten() }, { status: 500 });
    }

    return NextResponse.json(validated.data);
  } catch (error) {
    incrementCounter('apiFailure');
    logApiError('advisor.recommend.failed', error, {});
    return NextResponse.json({ error: 'Failed to get advisor recommendation' }, { status: 500 });
  }
}
