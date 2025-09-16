"use client";

import { useEffect, useMemo, useState } from "react";

type Point = { date: string; value: number; currency: string };

export default function PortfolioGrowthChart({ currency }: { currency: string }) {
  const [points, setPoints] = useState<Point[]>([]);

  // Load snapshots from DB
  useEffect(() => {
    (async ()=>{
      try {
        const res = await fetch('/api/integrations/t212/db/snapshots', { cache: 'no-store' });
        const arr = await res.json();
        setPoints(Array.isArray(arr) ? arr.map((x:any)=>({ date: x.id, value: x.total, currency: x.currency })) : []);
      } catch {
        setPoints([]);
      }
    })();
  }, []);

  const data = useMemo(() => {
    const arr = [...points];
    return arr.slice(-90); // posledních ~90 dní
  }, [points, currency]);

  const min = Math.min(...data.map(d=>d.value));
  const max = Math.max(...data.map(d=>d.value));
  const range = Math.max(1, max - min);

  return (
    <div className="glass p-3">
      <div className="text-sm text-[var(--muted)] mb-2">Růst portfolia v čase</div>
      {data.length <= 1 ? (
        <div className="text-[13px] text-[var(--muted)]">Zatím málo dat. Otevři stránku pár dní po sobě – budeme průběžně ukládat snapshoty.</div>
      ) : (
        <svg viewBox="0 0 600 180" className="w-full h-40">
          <defs>
            <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4dabf7" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#4dabf7" stopOpacity="0" />
            </linearGradient>
          </defs>
          {(() => {
            const stepX = data.length > 1 ? 600 / (data.length - 1) : 600;
            const toY = (v:number) => 10 + (170 - ((v - min) / range) * 170);
            const pts = data.map((d, i) => `${Math.round(i*stepX)},${Math.round(toY(d.value))}`).join(' ');
            return (
              <>
                <polyline fill="none" stroke="#4dabf7" strokeWidth="2" points={pts} />
                <polygon fill="url(#g)" points={`0,180 ${pts} 600,180`} />
              </>
            );
          })()}
        </svg>
      )}
    </div>
  );
}


