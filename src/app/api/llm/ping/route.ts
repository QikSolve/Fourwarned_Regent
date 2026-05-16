import { NextResponse } from 'next/server';
import { recordAiRequest } from '@/lib/observability/metrics';
import { logApiError } from '@/lib/observability/logger';

/**
 * POST /api/llm/ping
 * Attempts a lightweight OpenAI API call (models list) to verify connectivity.
 * Returns { ok: boolean, provider: 'openai' | null, details?: any }
 * WARNING: this will use your OpenAI key and appear in the OpenAI dashboard.
 */
export async function POST(request: Request) {
  const start = Date.now();
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: false, provider: null, error: 'OPENAI_API_KEY not configured' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    const latency = Date.now() - start;
    if (!res.ok) {
      const text = await res.text();
      recordAiRequest(latency, true);
      logApiError('llm.ping.failed', new Error(`OpenAI responded ${res.status}: ${text}`), {});
      return NextResponse.json({ ok: false, provider: 'openai', status: res.status, details: text }, { status: 502 });
    }

    const payload = await res.json();
    recordAiRequest(latency, false);
    // Return a small fingerprint rather than full payload
    const modelNames = Array.isArray(payload?.data) ? payload.data.slice(0,5).map((m:any) => m.id) : undefined;
    return NextResponse.json({ ok: true, provider: 'openai', latencyMs: latency, models: modelNames });
  } catch (err) {
    const latency = Date.now() - start;
    recordAiRequest(latency, true);
    logApiError('llm.ping.exception', err, {});
    return NextResponse.json({ ok: false, provider: 'openai', error: 'exception', details: String(err) }, { status: 500 });
  }
}
