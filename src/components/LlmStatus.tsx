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
    <span style={{display:'inline-block', padding:'4px 8px', borderRadius:12, background:'#eee', color:'#333', fontSize:12}}>LLM: checking</span>
  ) : enabled ? (
    <span style={{display:'inline-block', padding:'4px 8px', borderRadius:12, background:'#22c55e', color:'white', fontSize:12}}>LLM: connected</span>
  ) : (
    <span style={{display:'inline-block', padding:'4px 8px', borderRadius:12, background:'#ef4444', color:'white', fontSize:12}}>LLM: offline</span>
  );

  return (
    <div style={{position:'fixed', right:16, top:16, zIndex:2000}}>
      {badge}
    </div>
  );
}
