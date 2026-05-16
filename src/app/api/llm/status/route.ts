import { NextResponse } from 'next/server';

/**
 * GET /api/llm/status
 * Returns whether an LLM provider (OpenAI) is configured server-side.
 * This endpoint only reports presence of server config and does not expose secrets.
 */
export async function GET() {
  try {
    const enabled = typeof process.env.OPENAI_API_KEY === 'string' && process.env.OPENAI_API_KEY.trim().length > 0;
    return NextResponse.json({ enabled, provider: enabled ? 'openai' : null });
  } catch (err) {
    return NextResponse.json({ enabled: false, provider: null }, { status: 500 });
  }
}
