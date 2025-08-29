"use client";
import { useMemo } from "react";
import { accounts } from "@/lib/accounts";
const fmt = (n:number)=>new Intl.NumberFormat("cs-CZ",{style:"currency",currency:"CZK"}).format(n);

export default function RightRail() {
  const total = useMemo(()=>accounts.reduce((a,b)=>a+b.balanceCZK,0),[]);
  return (
    <aside className="sticky top-0 h-dvh space-y-3">
      {/* Souhrn všeho */}
      <div className="glass p-5">
        <div className="text-[13px] mb-1 text-[var(--muted)]">Celkem na účtech</div>
        <div className="text-3xl font-semibold tracking-tight">{fmt(total)}</div>
      </div>

      {/* Jednotlivé “okna” pro napojená API */}
      {accounts.map(acc=>(
        <div key={acc.id} className="glass p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{acc.provider}</div>
              <div className="text-[13px] text-[var(--muted)]">{acc.accountName}</div>
            </div>
            <div className="text-right text-base font-semibold">
              {fmt(acc.balanceCZK)}
            </div>
          </div>
          <div className="mt-2 text-[12px] text-[var(--muted)]">
            Stav k: {new Date(acc.asOf).toLocaleString("cs-CZ")}
          </div>
        </div>
      ))}
    </aside>
  );
}
