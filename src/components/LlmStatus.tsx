"use client";
import React, { useEffect, useState } from 'react';

export default function LlmStatus() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    fetch('/api/llm/status')
      .then(r => r.json())
      .then((j) => {
        if (!mounted) return;
        setEnabled(Boolean(j.enabled));
      })
      .catch(() => {
        if (!mounted) return;
        setEnabled(false);
      });
    return () => { mounted = false; };
  }, []);

  const badge = enabled === null ? (
    <span className="sigil-chip" style={{ backgroundColor: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}>LLM: checking</span>
  ) : enabled ? (
    <span className="sigil-chip sigil-chip--positive">LLM: connected</span>
  ) : (
    <span className="sigil-chip sigil-chip--negative">LLM: offline</span>
  );

  return (
    <div className="fixed right-4 top-4 z-[2000]">
      {badge}
    </div>
  );
}
