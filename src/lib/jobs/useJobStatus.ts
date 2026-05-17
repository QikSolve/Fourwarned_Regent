'use client';

import { useState, useEffect } from 'react';
import type { JobStatus, JobStatusResponse } from '@/lib/contracts/jobs';

export type JobEvent = {
  id: string;
  jobId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type JobStatusState = {
  /** Full job status response from the last successful update. */
  job: JobStatusResponse | null;
  /** Whether the realtime channel (SSE or polling) is active. */
  isConnected: boolean;
  /** Last error message, if any. */
  error: string | null;
};

const POLL_INTERVAL_MS = 2_000;
const RECONNECT_DELAY_MS = 3_000;

/**
 * Subscribes to real-time job status updates for a given job ID.
 *
 * Uses Server-Sent Events (SSE) as the primary transport with automatic
 * reconnection. Falls back to REST polling when SSE is unavailable.
 *
 * @param jobId - UUID of the job to monitor, or null to unsubscribe.
 */
export function useJobStatus(jobId: string | null): JobStatusState {
  const [state, setState] = useState<JobStatusState>({
    job: null,
    isConnected: false,
    error: null,
  });

  useEffect(() => {
    if (!jobId) {
      setState({ job: null, isConnected: false, error: null });
      return;
    }

    let closed = false;

    // ── SSE path ─────────────────────────────────────────────────────────────
    if (typeof EventSource !== 'undefined') {
      let es: EventSource | null = null;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
      let lastStatus: string | null = null;

      const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

      function connect() {
        if (closed) return;

        es = new EventSource(`/api/jobs/${jobId}/events`);

        es.onopen = () => {
          if (!closed) setState(prev => ({ ...prev, isConnected: true, error: null }));
        };

        es.onmessage = (event) => {
          if (closed) return;
          try {
            const data = JSON.parse(event.data) as {
              type: string;
              job?: JobStatusResponse;
              event?: JobEvent;
              status?: JobStatus;
            };

            if (data.type === 'snapshot' && data.job) {
              lastStatus = data.job.status;
              setState({ job: data.job, isConnected: true, error: null });
            } else if (data.type === 'event' && data.event) {
              setState(prev => {
                if (!prev.job) return prev;
                return {
                  ...prev,
                  job: {
                    ...prev.job,
                    events: [...prev.job.events, data.event!],
                  },
                };
              });
            } else if (data.type === 'status' && data.status) {
              lastStatus = data.status;
              setState(prev => {
                if (!prev.job) return prev;
                return { ...prev, job: { ...prev.job, status: data.status! } };
              });
            }
          } catch {
            // Ignore malformed messages.
          }
        };

        es.onerror = () => {
          if (closed) return;
          es?.close();
          es = null;
          // If the server closed the stream after a terminal state, don't reconnect.
          if (lastStatus && TERMINAL_STATUSES.has(lastStatus)) {
            setState(prev => ({ ...prev, isConnected: false, error: null }));
            return;
          }
          setState(prev => ({ ...prev, isConnected: false, error: 'Connection lost — reconnecting…' }));
          // Reconnect after a short delay.
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        };
      }

      connect();

      return () => {
        closed = true;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        es?.close();
      };
    }

    // ── Polling fallback ─────────────────────────────────────────────────────
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (closed) return;
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const job = (await response.json()) as JobStatusResponse;
        if (!closed) setState({ job, isConnected: true, error: null });
      } catch (err) {
        if (!closed) {
          setState(prev => ({
            ...prev,
            isConnected: false,
            error: err instanceof Error ? err.message : 'Failed to fetch job status',
          }));
        }
      }

      if (!closed) {
        pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    void poll();

    return () => {
      closed = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [jobId]);

  return state;
}
