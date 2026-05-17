'use client';

import { useEffect, useRef } from 'react';
import type { JobEvent } from '@/lib/jobs/useJobStatus';

type Props = {
  events: JobEvent[];
  /** When true the feed auto-scrolls to the bottom on new events. */
  autoScroll?: boolean;
  className?: string;
};

function formatEventTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}

/**
 * Scrollable feed that renders job events, highlighting `partial_output` chunks
 * as streaming text and `status_changed` events as lifecycle transitions.
 *
 * Accessibility: the list is an ARIA live region so screen readers announce
 * new events automatically.  Focus is not moved on updates to preserve keyboard
 * navigation.
 */
export function JobLogFeed({ events, autoScroll = true, className = '' }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [events.length, autoScroll]);

  if (events.length === 0) {
    return (
      <div
        role="log"
        aria-label="Job event log"
        aria-live="polite"
        className={`text-xs ledger-subtitle italic px-2 py-1 ${className}`}
      >
        No events yet.
      </div>
    );
  }

  return (
    <ol
      role="log"
      aria-label="Job event log"
      aria-live="polite"
      aria-relevant="additions"
      className={`text-xs space-y-0.5 overflow-y-auto ${className}`}
    >
      {events.map((event) => {
        const isPartial = event.eventType === 'partial_output';
        const isStatusChange = event.eventType === 'status_changed';
        const chunk = isPartial ? String(event.payload.chunk ?? '') : null;

        return (
          <li
            key={event.id}
            className={`flex gap-2 px-2 py-0.5 rounded ${
              isPartial
                ? 'font-mono text-[10px] bg-[var(--surface-container-lowest)] text-[var(--on-surface)]'
                : isStatusChange
                  ? 'text-[var(--on-surface-variant)] font-medium'
                  : 'text-[var(--on-surface-variant)]'
            }`}
          >
            <span className="shrink-0 opacity-50 tabular-nums" aria-hidden="true">
              {formatEventTime(event.createdAt)}
            </span>
            {isPartial ? (
              <span aria-label={`Partial output: ${chunk}`}>{chunk}</span>
            ) : isStatusChange ? (
              <span>
                {event.payload.from ? (
                  <>
                    <span className="opacity-70">{String(event.payload.from)}</span>
                    {' → '}
                  </>
                ) : null}
                <span>{String(event.payload.to ?? event.payload.reason ?? event.eventType)}</span>
              </span>
            ) : (
              <span>{event.eventType}</span>
            )}
          </li>
        );
      })}
      <div ref={bottomRef} aria-hidden="true" />
    </ol>
  );
}
