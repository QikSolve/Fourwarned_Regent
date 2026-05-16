import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createCampaign } from '@/lib/db/client';

const RequestSchema = z.object({
  playerName: z.string().optional(),
});

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

    const initialState = {
      playerName: parsed.data.playerName ?? 'Your Majesty',
      season: 'Spring',
      year: 1,
      createdAt: new Date().toISOString(),
    };

    const campaignId = await createCampaign(initialState);

    return NextResponse.json({ campaignId, ...initialState }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to start campaign' }, { status: 500 });
  }
}
