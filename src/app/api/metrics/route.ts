import { NextResponse } from 'next/server';
import { getRuntimeMetrics } from '@/lib/observability/metrics';

/**
 * GET /api/metrics
 * Returns runtime counters useful for monitoring and alerting.
 */
export async function GET() {
  try {
    const metrics = await getRuntimeMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get metrics' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { getAlertThresholds, getRuntimeMetrics } from '@/lib/observability/metrics';
import { logApiError } from '@/lib/observability/logger';

export async function GET() {
  try {
    const metrics = await getRuntimeMetrics();
    const thresholds = getAlertThresholds();
    return NextResponse.json({
      metrics,
      thresholds,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logApiError('metrics.get.failed', error, {});
    return NextResponse.json({ error: 'Failed to read runtime metrics' }, { status: 500 });
  }
}
