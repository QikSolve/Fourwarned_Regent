import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCampaign, saveCampaign } from '@/lib/db/client';
import { GameStateSchema, PersistedCampaignSnapshotSchema } from '@/lib/contracts/gameplay';
import { CAMPAIGN_STATE_VERSION } from '@/lib/campaign/persistence';
import { incrementCounter } from '@/lib/observability/metrics';
import { logApiError } from '@/lib/observability/logger';

const ParamsSchema = z.object({
  campaignId: z.string().uuid(),
});

const SaveRequestSchema = z.object({
  state: GameStateSchema,
}).strict();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const parsedParams = ParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json({ error: parsedParams.error.flatten() }, { status: 400 });
    }

    const campaign = await getCampaign(parsedParams.data.campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const snapshot = PersistedCampaignSnapshotSchema.safeParse({
      version: campaign.version,
      savedAt: campaign.updated_at,
      state: campaign.state,
    });
    if (!snapshot.success) {
      return NextResponse.json({ error: snapshot.error.flatten() }, { status: 500 });
    }

    return NextResponse.json(snapshot.data);
  } catch (error) {
    incrementCounter('apiFailure');
    logApiError('campaign.get.failed', error, {});
    return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const parsedParams = ParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json({ error: parsedParams.error.flatten() }, { status: 400 });
    }

    const body = await request.json();
    const parsed = SaveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const stateParsed = GameStateSchema.safeParse(parsed.data.state);
    if (!stateParsed.success) {
      return NextResponse.json({ error: stateParsed.error.flatten() }, { status: 400 });
    }

    await saveCampaign(parsedParams.data.campaignId, stateParsed.data, CAMPAIGN_STATE_VERSION);
    return NextResponse.json({
      campaignId: parsedParams.data.campaignId,
      version: CAMPAIGN_STATE_VERSION,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    incrementCounter('apiFailure');
    logApiError('campaign.save.failed', error, {});
    return NextResponse.json({ error: 'Failed to save campaign' }, { status: 500 });
  }
}
