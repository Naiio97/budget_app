"use client";

import { useMemo } from "react";

type DonutItem = { name: string; value: number; pct: number };

export default function BudgetChartsModal({
  open,
  onClose,
  title,
  donutData,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  donutData: DonutItem[];
}) {
  const total = useMemo(() => donutData.reduce((s,i)=>s+i.value,0), [donutData]) || 1;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[920px]">
        <div className="bg-white p-5 rounded-2xl shadow-2xl border border-black/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">{title}</div>
            <button className="text-[13px] text-[var(--muted)] hover:text-black" onClick={onClose}>Zavřít</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <svg viewBox="0 0 42 42" className="w-60 h-60 mx-auto">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#eee" strokeWidth="6" />
              {(() => {
                const colors = ["#ff6b6b","#4dabf7","#51cf66","#fcc419","#845ef7","#20c997","#495057","#ffa94d","#ff922b","#228be6"]; 
                let acc = 0;
                return donutData.map((s, idx) => {
                  const frac = s.value / (total || 1);
                  const dash = Math.max(0.5, frac * 100);
                  const strokeDasharray = `${dash} ${100-dash}`;
                  const strokeDashoffset = 25 - acc; acc += dash;
                  return <circle key={idx} cx="21" cy="21" r="15.915" fill="transparent" stroke={colors[idx % colors.length]} strokeWidth="6" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />;
                });
              })()}
            </svg>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              {donutData.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded" style={{ background: ["#ff6b6b","#4dabf7","#51cf66","#fcc419","#845ef7","#20c997","#495057","#ffa94d","#ff922b","#228be6"][i % 10] }} />
                    <span className="truncate">{s.name}</span>
                  </div>
                  <div className="text-[var(--muted)]">{fmt(s.value)} ({s.pct}%)</div>
                </div>
              ))}
              {donutData.length === 0 && <div className="text-[13px] text-[var(--muted)]">Žádná data pro graf.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(n);
}


