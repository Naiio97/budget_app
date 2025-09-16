"use client";

import { useEffect, useState } from "react";

type Dividend = {
  amount: number;
  paidOn: string;
  ticker: string;
  reference?: string;
};

export default function Trading212Dividends() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Dividend[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/integrations/t212/dividends?limit=50', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data?.items) ? data.items : [];
        if (!cancelled) setItems(list);
      } catch (e:any) {
        if (!cancelled) setError(e?.message || 'Chyba načítání');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="glass p-3">Načítám dividendy…</div>;
  if (error) return <div className="glass p-3 text-red-600">Chyba: {error}</div>;

  return (
    <div className="glass p-3">
      <div className="text-sm text-[var(--muted)] mb-2">Dividendy (posledních 50)</div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--muted)]">
              <th className="text-left px-2 py-1">Datum</th>
              <th className="text-left px-2 py-1">Ticker</th>
              <th className="text-right px-2 py-1">Částka</th>
              <th className="text-left px-2 py-1">Pozn.</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d, idx) => (
              <tr key={idx} className="border-t hairline">
                <td className="px-2 py-1">{new Date(d.paidOn).toLocaleDateString('cs-CZ')}</td>
                <td className="px-2 py-1">{d.ticker}</td>
                <td className="px-2 py-1 text-right">{fmt(d.amount)}</td>
                <td className="px-2 py-1">{d.reference || ''}</td>
              </tr>
            ))}
            {items.length===0 && (<tr><td colSpan={4} className="px-2 py-6 text-center text-[var(--muted)]">Žádné dividendy</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(n);
}


