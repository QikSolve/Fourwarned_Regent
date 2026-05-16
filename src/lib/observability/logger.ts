export function logApiError(event: string, error: unknown, context: Record<string, unknown> = {}): void {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(JSON.stringify({
    level: 'error',
    event,
    message,
    stack,
    context,
    timestamp: new Date().toISOString(),
  }));
}
