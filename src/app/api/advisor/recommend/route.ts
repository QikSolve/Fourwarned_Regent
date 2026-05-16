import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdvisorRecommendation } from '@/lib/ai/advisors';
import type { Advisor, KingdomMetrics } from '@/types/game';

const MetricsSchema = z.object({
  food: z.number().min(0).max(100),
  morale: z.number().min(0).max(100),
  gold: z.number().min(0).max(100),
  threat: z.number().min(0).max(100),
  adminStrain: z.number().min(0).max(100),
});

const RequestSchema = z.object({
  advisor: z.unknown(),
  metrics: MetricsSchema,
});

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

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to get advisor recommendation' }, { status: 500 });
  }
}
