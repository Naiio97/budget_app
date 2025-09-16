"use client";

import { useEffect, useMemo, useState } from "react";
import PortfolioGrowthChart from "@/components/PortfolioGrowthChart";

type Position = {
  ticker: string;
  quantity: number;
  avgPrice?: number; // DB
  curPrice?: number; // DB
  averagePrice?: number; // API fallback
  currentPrice?: number; // API fallback
  ppl: number;
  fxPpl?: number;
};

export default function Trading212Portfolio() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [cash, setCash] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("EUR");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [resPos, resCash] = await Promise.all([
          fetch('/api/integrations/t212/db/portfolio', { cache: 'no-store' }),
          fetch('/api/integrations/t212/db/cash', { cache: 'no-store' })
        ]);
        if (!resPos.ok) throw new Error(`HTTP ${resPos.status}`);
        const dataPos = await resPos.json();
        if (!cancelled) setPositions(Array.isArray(dataPos) ? dataPos : (dataPos?.positions || []));

        if (resCash.ok) {
          const dataCash = await resCash.json();
          // Heuristika: pokus se najít částku a měnu
          let foundCash: number | null = null;
          let foundCurrency: string | null = null;
          if (typeof dataCash === 'number') {
            foundCash = dataCash;
          } else if (dataCash && typeof dataCash === 'object') {
            if (typeof dataCash.cash === 'number') {
              foundCash = dataCash.cash;
            } else if (dataCash.cash && typeof dataCash.cash === 'object') {
              const entries = Object.entries(dataCash.cash as Record<string, number>);
              if (entries.length) {
                const [cur, val] = entries[0];
                foundCurrency = cur;
                foundCash = Number(val) || 0;
              }
            } else {
              // vezmi první numerickou hodnotu
              for (const [k, v] of Object.entries(dataCash)) {
                if (typeof v === 'number') { foundCash = v; break; }
                if (v && typeof v === 'object') {
                  const innerNum = Object.values(v as any).find((x:any)=> typeof x === 'number');
                  if (typeof innerNum === 'number') { foundCash = innerNum; break; }
                }
              }
            }
            if (typeof (dataCash.currencyCode) === 'string') foundCurrency = dataCash.currencyCode;
          }
          if (!cancelled) {
            if (foundCash != null) setCash(foundCash);
            if (foundCurrency) setCurrency(foundCurrency);
          }
        }
      } catch (e:any) {
        if (!cancelled) setError(e?.message || 'Chyba načítání');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalInvested = useMemo(() => positions.reduce((s,p)=> s + ((p.avgPrice ?? p.averagePrice ?? 0) * p.quantity), 0), [positions]);
  const totalValue = useMemo(() => positions.reduce((s,p)=> s + ((p.curPrice ?? p.currentPrice ?? 0) * p.quantity), 0), [positions]);
  const totalPpl = useMemo(() => positions.reduce((s,p)=> s + (p.ppl || 0), 0), [positions]);
  const totalWithCash = useMemo(() => (totalValue + (cash ?? 0)), [totalValue, cash]);

  // Persist snapshot once per day
  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0,10);
      // uložíme snapshot do DB přes sync endpoint spíš při explicitní sync akci
      // pro zobrazení grafu načítáme ze serveru (viz PortfolioGrowthChart via prop?)
    } catch {}
  }, [totalWithCash, currency]);

  if (loading) return <div className="glass p-3">Načítám portfolio…</div>;
  if (error) return <div className="glass p-3 text-red-600">Chyba: {error}</div>;

  return (
    <div className="glass p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--muted)]">Trading 212 – Portfolio</div>
        <div className="text-sm">
          Pozice: <span className="font-medium">{fmt(totalValue, currency)}</span>
          {cash!=null && <> · Hotovost: <span className="font-medium">{fmt(cash, currency)}</span></>}
          <> · Celkem: <span className="font-semibold">{fmt(totalWithCash, currency)}</span></>
          <> · P/L: <span className={`font-medium ${totalPpl>=0?'text-green-600':'text-red-600'}`}>{fmt(totalPpl, currency)}</span></>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--muted)]">
              <th className="text-left px-2 py-1">Ticker</th>
              <th className="text-right px-2 py-1">Množství</th>
              <th className="text-right px-2 py-1">Průměr</th>
              <th className="text-right px-2 py-1">Cena</th>
              <th className="text-right px-2 py-1">Hodnota</th>
              <th className="text-right px-2 py-1">P/L</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => {
              const avg = p.avgPrice ?? p.averagePrice ?? 0;
              const price = p.curPrice ?? p.currentPrice ?? 0;
              const value = price * p.quantity;
              return (
                <tr key={p.ticker} className="border-t hairline">
                  <td className="px-2 py-1">{p.ticker}</td>
                  <td className="px-2 py-1 text-right">{formatNum(p.quantity)}</td>
                  <td className="px-2 py-1 text-right">{fmt(avg, currency)}</td>
                  <td className="px-2 py-1 text-right">{fmt(price, currency)}</td>
                  <td className="px-2 py-1 text-right">{fmt(value, currency)}</td>
                  <td className={`px-2 py-1 text-right ${p.ppl>=0?'text-green-600':'text-red-600'}`}>{fmt(p.ppl, currency)}</td>
                </tr>
              );
            })}
            {positions.length===0 && (<tr><td colSpan={6} className="px-2 py-6 text-center text-[var(--muted)]">Žádné pozice</td></tr>)}
          </tbody>
        </table>
      </div>
      <PortfolioGrowthChart currency={currency} />
    </div>
  );
}

function fmt(n: number, cur: string) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: cur || 'EUR' }).format(n);
}

function formatNum(n: number) {
  return new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 4 }).format(n);
}


