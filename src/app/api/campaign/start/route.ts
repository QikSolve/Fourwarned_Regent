import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createCampaign } from '@/lib/db/client';
import { createNewCampaignState } from '@/lib/campaign/createNewCampaignState';
import { GameStateSchema } from '@/lib/contracts/gameplay';
import { CAMPAIGN_STATE_VERSION } from '@/lib/campaign/persistence';
import { incrementCounter } from '@/lib/observability/metrics';
import { logApiError } from '@/lib/observability/logger';

const RequestSchema = z.object({
  playerName: z.string().optional(),
  initialState: GameStateSchema.optional(),
}).strict();

const ResponseSchema = z.object({
  campaignId: z.string().uuid(),
  playerName: z.string(),
  season: z.literal('Spring'),
  year: z.literal(1),
  createdAt: z.string().datetime(),
  version: z.number().int().min(1),
}).strict();

/**
 * POST /api/campaign/start
 * Initialises a new campaign and returns its ID.
 * In production this persists to Postgres; for the prototype it returns a stub ID.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const createdAt = new Date().toISOString();
    const initialState = {
      playerName: parsed.data.playerName ?? 'Your Majesty',
      season: 'Spring',
      year: 1,
      createdAt,
    };

    const campaignId = await createCampaign(parsed.data.initialState ?? createNewCampaignState(), CAMPAIGN_STATE_VERSION);

    const response = ResponseSchema.parse({
      campaignId,
      ...initialState,
      version: CAMPAIGN_STATE_VERSION,
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    incrementCounter('apiFailure');
    logApiError('campaign.start.failed', error, {});
    return NextResponse.json({ error: 'Failed to start campaign' }, { status: 500 });
  }
}
