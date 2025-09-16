"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

type Category = { id: string; name: string; groupId?: string | null; groupName?: string | null };
type CategoryGroup = { id: string; name: string; order: number };
type TxRow = { id: string; ts: string; rawDescription: string; category?: string; categoryId: string | null; amountCZK: number; accountName?: string };

const fmtCZK = (n:number)=> new Intl.NumberFormat("cs-CZ",{ style:"currency", currency:"CZK" }).format(n);
const yyyymm = (year:number, month:number)=> `${year}-${String(month+1).padStart(2,'0')}`;

export default function BudgetDetailsPage() {
  const now = new Date();
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [rolloverEnabled, setRolloverEnabled] = useState<boolean>(false);
  const [excludeInternalTransfers, setExcludeInternalTransfers] = useState<boolean>(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(()=> new Set());

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [catsRes, groupsRes, txRes] = await Promise.all([
          fetch('/api/categories', { cache: 'no-store' }),
          fetch('/api/category-groups', { cache: 'no-store' }),
          fetch('/api/transactions?offset=0&limit=5000', { cache: 'no-store' })
        ]);
        if (!catsRes.ok || !groupsRes.ok || !txRes.ok) throw new Error('Chyba při načítání dat');
        const cats: Category[] = await catsRes.json();
        const gs: CategoryGroup[] = await groupsRes.json();
        const txData = await txRes.json();
        const txRows: TxRow[] = txData.rows || [];
        setCategories(Array.isArray(cats) ? cats : []);
        setGroups(Array.isArray(gs) ? gs : []);
        setRows(Array.isArray(txRows) ? txRows : []);
      } catch (e:any) {
        setError(e?.message || 'Chyba načítání');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      const key = `budget:${yyyymm(selectedYear, selectedMonth)}`;
      const raw = localStorage.getItem(key);
      setBudgets(raw ? JSON.parse(raw) : {});
    } catch { setBudgets({}); }
  }, [selectedYear, selectedMonth]);
  useEffect(() => {
    const raw = localStorage.getItem('budget:rolloverEnabled');
    setRolloverEnabled(raw === '1');
  }, []);
  useEffect(() => { localStorage.setItem('budget:rolloverEnabled', rolloverEnabled ? '1' : '0'); }, [rolloverEnabled]);

  const monthNames = ["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];
  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  const internalTransferIds = useMemo(() => {
    const byDayAmount = new Map<string, TxRow[]>();
    for (const r of rows) {
      const d = new Date(r.ts);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const amountAbs = Math.abs(Math.round(r.amountCZK));
      if (amountAbs === 0) continue;
      const key = `${dayKey}|${amountAbs}`;
      const list = byDayAmount.get(key) || [];
      list.push(r);
      byDayAmount.set(key, list);
    }
    const ids = new Set<string>();
    for (const [, list] of byDayAmount) {
      const positives = list.filter(t => t.amountCZK > 0);
      const negatives = list.filter(t => t.amountCZK < 0);
      if (!positives.length || !negatives.length) continue;
      const usedP = new Set<number>();
      const usedN = new Set<number>();
      for (let i = 0; i < negatives.length; i++) {
        for (let j = 0; j < positives.length; j++) {
          if (usedN.has(i) || usedP.has(j)) continue;
          const n = negatives[i], p = positives[j];
          if (n.accountName && p.accountName && n.accountName !== p.accountName) {
            usedN.add(i); usedP.add(j);
            ids.add(n.id); ids.add(p.id);
            break;
          }
        }
      }
    }
    return ids;
  }, [rows]);

  const monthRows = useMemo(() => {
    const list = rows.filter(r => {
      const d = new Date(r.ts);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
    let filtered = list.filter(r => r.category !== 'Převod');
    if (excludeInternalTransfers) filtered = filtered.filter(r => !internalTransferIds.has(r.id));
    return filtered;
  }, [rows, selectedYear, selectedMonth, excludeInternalTransfers, internalTransferIds]);

  const perCategory = useMemo(() => {
    const map = new Map<string, { categoryId: string | null; name: string; spent: number }>();
    for (const r of monthRows) {
      if (r.amountCZK >= 0) continue;
      const id = r.categoryId || '__uncat__';
      const name = r.category || 'Nezařazeno';
      const rec = map.get(id) || { categoryId: r.categoryId, name, spent: 0 };
      rec.spent += Math.abs(r.amountCZK);
      map.set(id, rec);
    }
    for (const cat of categories) {
      const id = cat.id;
      if (!map.has(id) && budgets[id] != null) map.set(id, { categoryId: id, name: cat.name, spent: 0 });
    }
    return Array.from(map.values()).sort((a,b)=> b.spent - a.spent);
  }, [monthRows, categories, budgets]);

  const groupsById = useMemo(() => new Map(groups.map(g=>[g.id,g.name])), [groups]);
  const perGroup = useMemo(() => {
    const byCatId = new Map(perCategory.map(c => [c.categoryId ?? '', c] as const));
    const groupsMap = new Map<string, { groupId: string; name: string; spent: number; categoryIds: string[] }>();
    for (const cat of categories) {
      const gId = cat.groupId || '__nogroup__';
      const gName = cat.groupName || groupsById.get(gId) || 'Ostatní';
      const catEntry = byCatId.get(cat.id) || { categoryId: cat.id, name: cat.name, spent: 0 };
      const g = groupsMap.get(gId) || { groupId: gId, name: gName, spent: 0, categoryIds: [] };
      g.spent += catEntry.spent || 0;
      g.categoryIds.push(cat.id);
      groupsMap.set(gId, g);
    }
    return Array.from(groupsMap.values()).sort((a,b)=> b.spent - a.spent);
  }, [perCategory, categories, groupsById]);

  const prevKey = useMemo(() => {
    const d = new Date(selectedYear, selectedMonth - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [selectedYear, selectedMonth]);
  const prevBudgets: Record<string, number> = useMemo(() => {
    try {
      const raw = localStorage.getItem(`budget:${yyyymm(prevKey.year, prevKey.month)}`);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }, [prevKey.year, prevKey.month]);
  const prevMonthRows = useMemo(() => rows.filter(r=>{ const d=new Date(r.ts); return d.getFullYear()===prevKey.year && d.getMonth()===prevKey.month; }), [rows, prevKey.year, prevKey.month]);
  const prevMonthRowsFiltered = useMemo(() => prevMonthRows.filter(r => r.category !== 'Převod' && !internalTransferIds.has(r.id)), [prevMonthRows, internalTransferIds]);
  const prevSpentByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of prevMonthRowsFiltered) if (r.amountCZK < 0) m.set(r.categoryId || '', (m.get(r.categoryId || '') || 0) + Math.abs(r.amountCZK));
    return m;
  }, [prevMonthRowsFiltered]);
  const rolloverByCat = useMemo(() => {
    const out = new Map<string, number>();
    for (const [id, budget] of Object.entries(prevBudgets)) {
      const spent = prevSpentByCat.get(id) || 0;
      const carry = Math.max(0, budget - spent);
      if (carry > 0) out.set(id, carry);
    }
    return out;
  }, [prevBudgets, prevSpentByCat]);

  const totals = useMemo(() => {
    const spent = perCategory.reduce((s, c) => s + c.spent, 0);
    const budgetSum = perCategory.reduce((s, c) => s + (budgets[c.categoryId ?? ''] || 0), 0);
    const carrySum = perCategory.reduce((s, c) => s + (rolloverEnabled ? (rolloverByCat.get(c.categoryId ?? '') || 0) : 0), 0);
    const available = budgetSum + carrySum;
    const remaining = Math.max(0, available - spent);
    return { spent, budgetSum, carrySum, available, remaining };
  }, [perCategory, budgets, rolloverEnabled, rolloverByCat]);

  if (loading) return <div className="glass p-4">Načítání…</div>;
  if (error) return <div className="glass p-4 text-red-600">Chyba: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="glass p-4 flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Rozpočet – detail</div>
          <div className="text-[13px] text-[var(--muted)]">Podrobný měsíční přehled</div>
        </div>
        <Link href="/budget" className="px-3 py-1.5 rounded text-sm glass hover:bg-black/5">Zpět</Link>
      </div>

      {/* Ovládání období a preferencí */}
      <div className="glass p-3 flex flex-wrap items-center gap-2">
        <div className="text-sm text-[var(--muted)]">Měsíční rozpočet</div>
        <select className="glass px-2 py-1 rounded text-sm border border-white/20" value={selectedMonth} onChange={e=>setSelectedMonth(parseInt(e.target.value,10))}>
          {monthNames.map((m, i)=>(<option key={i} value={i}>{m}</option>))}
        </select>
        <select className="glass px-2 py-1 rounded text-sm border border-white/20" value={selectedYear} onChange={e=>setSelectedYear(parseInt(e.target.value,10))}>
          {yearOptions.map(y=>(<option key={y} value={y}>{y}</option>))}
        </select>
        <label className="flex items-center gap-1 ml-2 text-[13px]"><input type="checkbox" checked={rolloverEnabled} onChange={e=>setRolloverEnabled(e.target.checked)} />Přenášet zůstatky</label>
        <label className="flex items-center gap-1 ml-2 text-[13px]"><input type="checkbox" checked={excludeInternalTransfers} onChange={e=>setExcludeInternalTransfers(e.target.checked)} />Ignorovat převody</label>
      </div>

      {/* Souhrn */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="glass p-2"><div className="text-[12px] text-[var(--muted)]">Rozpočet</div><div className="text-lg font-semibold">{fmtCZK(totals.budgetSum)}</div></div>
        <div className="glass p-2"><div className="text-[12px] text-[var(--muted)]">Přenesené</div><div className="text-lg font-semibold">{fmtCZK(rolloverEnabled ? totals.carrySum : 0)}</div></div>
        <div className="glass p-2"><div className="text-[12px] text-[var(--muted)]">Utraceno</div><div className="text-lg font-semibold text-[color:var(--danger)]">{fmtCZK(perCategory.reduce((s,c)=>s+c.spent,0))}</div></div>
        <div className="glass p-2"><div className="text-[12px] text-[var(--muted)]">K dispozici</div><div className="text-lg font-semibold">{fmtCZK(totals.available)}</div></div>
      </div>

      {/* Tabulka dle oblastí a kategorií */}
      <div className="glass overflow-auto max-h-[70vh] hide-scrollbar">
        <table className="w-full text-sm">
          <thead className="bg-white text-[var(--muted)]">
            <tr>
              <th className="text-left px-3 py-2">Oblast / Kategorie</th>
              <th className="text-right px-3 py-2">Rozpočet</th>
              <th className="text-right px-3 py-2">K dispozici</th>
              <th className="text-right px-3 py-2">Utraceno</th>
              <th className="text-right px-3 py-2">Zbývá</th>
            </tr>
          </thead>
          <tbody>
            {perGroup.map(g => {
              const groupBudget = g.categoryIds.reduce((s, id) => s + (budgets[id]||0), 0);
              const groupCarry = g.categoryIds.reduce((s, id) => s + (rolloverEnabled ? (rolloverByCat.get(id)||0) : 0), 0);
              const groupAvailable = groupBudget + groupCarry;
              const groupRemaining = Math.max(0, groupAvailable - g.spent);
              const expanded = expandedGroups.has(g.groupId);
              return (
                <Fragment key={`grp-${g.groupId}`}>
                  <tr className={`border-t hairline bg-white/60 ${expanded? '':'hover:bg-black/5'}`}>
                    <td className="px-3 py-2 cursor-pointer" onClick={()=> setExpandedGroups(prev=>{ const next=new Set(prev); next.has(g.groupId)?next.delete(g.groupId):next.add(g.groupId); return next; })}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-3 h-3 transition-transform ${expanded? 'rotate-90' : ''}`}>▸</span>
                        <div className="font-medium">{g.name}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{fmtCZK(groupBudget)}</td>
                    <td className="px-3 py-2 text-right">{fmtCZK(groupAvailable)}</td>
                    <td className="px-3 py-2 text-right text-[color:var(--danger)]">{fmtCZK(g.spent)}</td>
                    <td className="px-3 py-2 text-right">{fmtCZK(groupRemaining)}</td>
                  </tr>
                  {expanded && g.categoryIds.map(id => {
                    const cat = categories.find(c=> c.id===id);
                    const catAgg = perCategory.find(c=> (c.categoryId ?? '') === id) || { categoryId: id, name: cat?.name || '', spent: 0 };
                    const budget = budgets[id] || 0;
                    const carry = rolloverEnabled ? (rolloverByCat.get(id) || 0) : 0;
                    const available = budget + carry;
                    const remaining = Math.max(0, available - catAgg.spent);
                    return (
                      <tr key={`cat-${id}`} className={`border-t hairline ${catAgg.spent>available? 'bg-red-50' : ''}`}>
                        <td className="px-3 py-2 pl-8">{catAgg.name}</td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" className="glass px-2 py-1 rounded w-28 text-right border border-white/20" value={budget} min={0} onChange={e=>{
                            const v = Math.max(0, Number(e.target.value));
                            const idSafe = id || '';
                            setBudgets(prev => ({ ...prev, [idSafe]: v }));
                            localStorage.setItem(`budget:${yyyymm(selectedYear, selectedMonth)}`, JSON.stringify({ ...budgets, [idSafe]: v }));
                          }} />
                        </td>
                        <td className="px-3 py-2 text-right">{fmtCZK(available)}</td>
                        <td className="px-3 py-2 text-right text-[color:var(--danger)]">{fmtCZK(catAgg.spent)}</td>
                        <td className="px-3 py-2 text-right">{fmtCZK(remaining)}</td>
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
            {perGroup.length===0 && (<tr><td colSpan={5} className="px-3 py-6 text-center text-[var(--muted)]">Žádné skupiny/kategorie</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}


