"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BudgetGroupModal from "@/components/BudgetGroupModal";
import BudgetGroupDetailModal from "@/components/BudgetGroupDetailModal";
import BudgetChartsModal from "@/components/BudgetChartsModal";
import BudgetGroupsModal from "@/components/BudgetGroupsModal";
import BudgetCategoryTxModal from "@/components/BudgetCategoryTxModal";
import IncomeFilterModal from "@/components/IncomeFilterModal";

type Category = { id: string; name: string; groupId?: string | null; groupName?: string | null };
type CategoryGroup = { id: string; name: string; order: number };
type TxRow = { id: string; ts: string; rawDescription: string; category?: string; categoryId: string | null; amountCZK: number; accountName?: string };

const fmtCZK = (n:number)=> new Intl.NumberFormat("cs-CZ",{ style:"currency", currency:"CZK" }).format(n);
const yyyymm = (year:number, month:number)=> `${year}-${String(month+1).padStart(2,'0')}`;

export default function BudgetPage() {
  const now = new Date();
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [rolloverEnabled, setRolloverEnabled] = useState<boolean>(false);
  const [excludeInternalTransfers, setExcludeInternalTransfers] = useState<boolean>(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(()=> new Set());
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailGroupId, setDetailGroupId] = useState<string | null>(null);
  const [detailGroupName, setDetailGroupName] = useState<string | null>(null);
  const [chartsOpen, setChartsOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [catTxOpen, setCatTxOpen] = useState(false);
  const [catTxTitle, setCatTxTitle] = useState("");
  const [catTxRows, setCatTxRows] = useState<TxRow[]>([]);
  const [incomeFilterOpen, setIncomeFilterOpen] = useState(false);
  const [excludedIncomeCatIds, setExcludedIncomeCatIds] = useState<string[]>(()=>{
    try { return JSON.parse(localStorage.getItem('budget:excludedIncomeCats')||'[]') } catch { return [] }
  });

  const openCategoryTransactions = (categoryId: string, categoryName: string) => {
    const filtered = monthRows.filter(r => (r.categoryId || '') === categoryId);
    setCatTxRows(filtered);
    setCatTxTitle(`Transakce – ${categoryName}`);
    setCatTxOpen(true);
  };

  const loadData = async () => {
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
  };

  useEffect(() => {
    loadData();
  }, []);

  // Per-month budgets load/save + preferences
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

  // Internal transfer detection
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

  // Aggregations
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

  const donutData = useMemo(() => {
    const items = perCategory.filter(c => c.spent > 0);
    const sum = items.reduce((s,i)=>s+i.spent,0) || 1;
    return items.map(i => ({ name: i.name, value: i.spent, pct: Math.round((i.spent / sum) * 100) }));
  }, [perCategory]);

  // Příjmy za vybraný měsíc (kladné částky mimo převody a volitelně bez interních převodů)
  const monthIncome = useMemo(() => {
    return monthRows.reduce((s, r) => s + (r.amountCZK > 0 ? r.amountCZK : 0), 0);
  }, [monthRows]);

  // Příjmy pouze v kategorii "Příjem" (pokud existuje), jinak vezmi všechny příjmy
  const incomeCategoryId = useMemo(() => {
    const cat = categories.find(c => c.name.toLowerCase() === 'příjem');
    return cat?.id || null;
  }, [categories]);
  const monthIncomeForIncomeCategory = useMemo(() => {
    const positives = monthRows.filter(r => r.amountCZK > 0);
    if (!incomeCategoryId) return positives.reduce((s, r) => s + r.amountCZK, 0);
    return positives
      .filter(r => {
        const cid = r.categoryId || '';
        if (excludedIncomeCatIds.includes(cid)) return false;
        return cid === incomeCategoryId || (r.category || '').toLowerCase() === 'příjem';
      })
      .reduce((s, r) => s + r.amountCZK, 0);
  }, [monthRows, incomeCategoryId, excludedIncomeCatIds]);

  useEffect(() => {
    try { localStorage.setItem('budget:excludedIncomeCats', JSON.stringify(excludedIncomeCatIds)); } catch {}
  }, [excludedIncomeCatIds]);

  const projection = useMemo(() => {
    const d1 = new Date(selectedYear, selectedMonth + 1, 0);
    const daysInMonth = d1.getDate();
    const today = new Date();
    const daysPassed = (today.getFullYear()===selectedYear && today.getMonth()===selectedMonth) ? Math.max(1, today.getDate()) : daysInMonth;
    const spentSoFar = monthRows.reduce((s, r)=> s + (r.amountCZK<0 ? Math.abs(r.amountCZK) : 0), 0);
    const daily = spentSoFar / daysPassed;
    const projectedSpent = Math.round(daily * daysInMonth);
    return { daysInMonth, daysPassed, daily, projectedSpent };
  }, [monthRows, selectedYear, selectedMonth]);

  const setBudgetFor = (categoryId: string | null, value: number) => {
    const id = categoryId ?? '';
    setBudgets(prev => ({ ...prev, [id]: value }));
  };
  const handleSave = () => {
    try {
      setSaving(true);
      localStorage.setItem(`budget:${yyyymm(selectedYear, selectedMonth)}`, JSON.stringify(budgets));
    } finally { setTimeout(()=>setSaving(false), 400); }
  };
  const handleAutoFill = () => {
    const byMonth = (offset:number) => {
      const d = new Date(selectedYear, selectedMonth - offset, 1);
      const y = d.getFullYear(), m = d.getMonth();
      return rows.filter(r=>{ const dt = new Date(r.ts); return dt.getFullYear()===y && dt.getMonth()===m && r.amountCZK<0; });
    };
    const months = [byMonth(1), byMonth(2), byMonth(3)];
    const sums = new Map<string, number>();
    for (const list of months) for (const r of list) sums.set(r.categoryId || '', (sums.get(r.categoryId || '') || 0) + Math.abs(r.amountCZK));
    const next: Record<string, number> = {};
    for (const [id, sum] of sums) next[id] = Math.round(sum / 3);
    setBudgets(next);
  };
  const handleReset = () => setBudgets({});
  const handleIncrease10 = () => setBudgets(prev => Object.fromEntries(Object.entries(prev).map(([k,v])=>[k, Math.round((v||0)*1.1)])));
  const exportBudgetCsv = () => {
    const headers = ["Kategorie","Rozpočet","Přenesené","K dispozici","Utraceno","Zbývá"];
    const lines = perCategory.map(c=>{
      const id = c.categoryId ?? '';
      const budget = budgets[id] || 0;
      const carry = rolloverEnabled ? (rolloverByCat.get(id) || 0) : 0;
      const available = budget + carry;
      const remaining = Math.max(0, available - c.spent);
      return [c.name, budget, carry, available, c.spent, remaining].join(';');
    });
    const csv = [headers.join(';'), ...lines, '', ['Souhrn', totals.budgetSum, totals.carrySum, totals.available, totals.spent, totals.remaining].join(';')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `rozpocet_${yyyymm(selectedYear, selectedMonth)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const groupsWithCounts = useMemo(() => {
    const countByGroup = new Map<string, number>();
    for (const c of categories) {
      const g = c.groupId || '__nogroup__';
      countByGroup.set(g, (countByGroup.get(g) || 0) + 1);
    }
    return groups.map(g => ({ ...g, count: countByGroup.get(g.id) || 0 }));
  }, [groups, categories]);

  if (loading) return <div className="glass p-4">Načítání…</div>;
  if (error) return <div className="glass p-4 text-red-600">Chyba: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="glass p-4 flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Rozpočet</div>
          <div className="text-[13px] text-[var(--muted)]">Správa rozpočtových oblastí</div>
        </div>
        <div className="flex items-center gap-2">
        <button onClick={()=> setChartsOpen(true)} className="px-2 py-1 text-xs glass rounded hover:bg-black/5" title="Grafy">Grafy</button>
        <Link href="/budget/details" className="px-2 py-1 text-xs glass rounded hover:bg-black/5">Detail</Link>
        <button
          className="px-2 py-1 text-xs glass rounded hover:bg-black/5"
          onClick={()=> setModalOpen(true)}
          title="Vytvořit rozpočtovou oblast"
        >
          + oblast
        </button>
        </div>
      </div>

      {/* Kompaktní souhrn */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="glass p-2"><div className="text-[12px] text-[var(--muted)]">Rozpočet</div><div className="text-lg font-semibold">{fmtCZK(monthIncomeForIncomeCategory)}</div></div>
        <div className="glass p-2"><div className="text-[12px] text-[var(--muted)]">Přenesené</div><div className="text-lg font-semibold">{fmtCZK(rolloverEnabled ? totals.carrySum : 0)}</div></div>
        <div className="glass p-2"><div className="text-[12px] text-[var(--muted)]">Utraceno</div><div className="text-lg font-semibold text-[color:var(--danger)]">{fmtCZK(totals.spent)}</div></div>
        <div className="glass p-2"><div className="text-[12px] text-[var(--muted)]">Zbývá</div><div className="text-lg font-semibold">{fmtCZK(monthIncomeForIncomeCategory - totals.spent)}</div></div>
      </div>

      {/* Oblasti jako malé bubliny (zobrazeny jen první 6), ostatní v modálu */}
      <div className="glass p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-[var(--muted)]">Oblasti</div>
          <div className="flex items-center gap-2">
            <button onClick={()=> setGroupsOpen(true)} className="text-[11px] text-[var(--muted)] hover:text-black">Všechny oblasti</button>
            <button onClick={()=>{ setDetailGroupId(null); setDetailGroupName('Všechny'); setDetailOpen(true); }} className="text-[11px] text-[var(--muted)] hover:text-black">Detail (vše)</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Bublina s příjmy za měsíc */}
          <div
            className="text-xs px-2 py-1 rounded-full border border-black/10 bg-white text-[color:var(--success)]"
            title="Součet příjmů za zvolený měsíc"
          >
            Příjmy: {fmtCZK(monthIncome)}
          </div>
          {groups.slice(0, 6).map(g => (
            <button
              key={g.id}
              onClick={()=>{ setDetailGroupId(g.id); setDetailGroupName(g.name); setDetailOpen(true); }}
              className="text-xs px-2 py-1 rounded-full border border-black/10 bg-white hover:bg-black/5 transition"
              title={g.name}
            >
              {g.name}
            </button>
          ))}
          {groups.length === 0 && (
            <div className="text-[13px] text-[var(--muted)]">Žádné oblasti.</div>
          )}
          {groups.length > 6 && (
            <button onClick={()=> setGroupsOpen(true)} className="text-xs px-2 py-1 rounded-full border border-black/10 bg-white hover:bg-black/5 transition">+{groups.length - 6} více</button>
          )}
        </div>
      </div>

      {/* Měsíční přehled a nastavení */}
      <div className="glass p-3 flex flex-wrap items-center gap-2">
        <div className="text-sm text-[var(--muted)]">Měsíční rozpočet</div>
        <select
          className="glass px-2 py-1 rounded text-sm border border-white/20"
          value={selectedMonth}
          onChange={e=>setSelectedMonth(parseInt(e.target.value,10))}
        >
          {monthNames.map((m, i)=>(<option key={i} value={i}>{m}</option>))}
        </select>
        <select
          className="glass px-2 py-1 rounded text-sm border border-white/20"
          value={selectedYear}
          onChange={e=>setSelectedYear(parseInt(e.target.value,10))}
        >
          {yearOptions.map(y=>(<option key={y} value={y}>{y}</option>))}
        </select>
        <label className="flex items-center gap-1 ml-2 text-[13px]">
          <input type="checkbox" checked={rolloverEnabled} onChange={e=>setRolloverEnabled(e.target.checked)} />
          Přenášet zůstatky
        </label>
        <label className="flex items-center gap-1 ml-2 text-[13px]">
          <input type="checkbox" checked={excludeInternalTransfers} onChange={e=>setExcludeInternalTransfers(e.target.checked)} />
          Ignorovat převody mezi vlastními účty
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={()=> setIncomeFilterOpen(true)} className="px-2 py-1 rounded text-[13px] bg-black/5 hover:bg-black/10" title="Vyloučit kategorie z příjmů">Filtr příjmů</button>
          <button onClick={handleAutoFill} className="px-2 py-1 rounded text-[13px] bg-black/5 hover:bg-black/10">Navrhnout z minulosti</button>
          <button onClick={handleIncrease10} className="px-2 py-1 rounded text-[13px] bg-black/5 hover:bg-black/10">+10 %</button>
          <button onClick={handleReset} className="px-2 py-1 rounded text-[13px] bg-black/5 hover:bg-black/10">Reset</button>
          <button onClick={exportBudgetCsv} className="px-2 py-1 rounded text-[13px] bg-black/5 hover:bg-black/10">Export CSV</button>
          <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded text-sm bg-[var(--accent)] text-white disabled:opacity-60">{saving?"Ukládám…":"Uložit"}</button>
        </div>
      </div>

      {/* Souhrn byl odstraněn na přání – zůstává jen přehled oblastí a tabulka */}

      {/* Grafy jsou přesunuty do modálního okna */}

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
              const groupRatio = groupAvailable>0 ? Math.min(1.2, g.spent / groupAvailable) : 0;
              const groupColor = groupRatio < 0.7 ? 'bg-[color:var(--success)]' : (groupRatio <= 1 ? 'bg-amber-500' : 'bg-[color:var(--danger)]');
              const expanded = expandedGroups.has(g.groupId);
              return (
                <Fragment key={`grp-${g.groupId}`}>
                  <tr className={`border-t hairline bg-white/60 ${expanded? '':'hover:bg-black/5'}`}>
                    <td className="px-3 py-2 cursor-pointer" onClick={()=> setExpandedGroups(prev=>{ const next=new Set(prev); next.has(g.groupId)?next.delete(g.groupId):next.add(g.groupId); return next; })}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-3 h-3 transition-transform ${expanded? 'rotate-90' : ''}`}>▸</span>
                        <div className="font-medium">{g.name}</div>
                      </div>
                      <div className="mt-1 h-2 rounded bg-black/5 overflow-hidden">
                        <div className={`h-2 ${groupColor}`} style={{ width: `${Math.min(100, Math.round(groupRatio*100))}%` }} />
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
                    const ratio = available>0 ? Math.min(1.2, catAgg.spent / available) : 0;
                    const color = ratio < 0.7 ? 'bg-[color:var(--success)]' : (ratio <= 1 ? 'bg-amber-500' : 'bg-[color:var(--danger)]');
                    return (
                      <tr key={`cat-${id}`} className={`border-t hairline ${catAgg.spent>available? 'bg-red-50' : ''}`}>
                        <td className="px-3 py-2 pl-8">
                          <div className="flex items-center justify-between gap-2">
                            <button className="hover:underline" onClick={()=> openCategoryTransactions(id, catAgg.name)} title="Zobrazit transakce této kategorie za měsíc">{catAgg.name}</button>
                            {carry>0 && <div className="text-[11px] text-[var(--muted)]">+{fmtCZK(carry)} přenes.</div>}
                          </div>
                          <div className="mt-1 h-2 rounded bg-black/5 overflow-hidden">
                            <div className={`h-2 ${color}`} style={{ width: `${Math.min(100, Math.round(ratio*100))}%` }} />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            className="glass px-2 py-1 rounded w-28 text-right border border-white/20"
                            value={budget}
                            min={0}
                            onChange={e=>setBudgetFor(id, Math.max(0, Number(e.target.value)))}
                          />
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
            {perGroup.length===0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-[var(--muted)]">Žádné skupiny/kategorie</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-white/60">
              <td className="px-3 py-2 font-medium">Souhrn</td>
              <td className="px-3 py-2 text-right font-medium">{fmtCZK(totals.budgetSum)}</td>
              <td className="px-3 py-2 text-right font-medium">{fmtCZK(totals.available)}</td>
              <td className="px-3 py-2 text-right font-medium text-[color:var(--danger)]">{fmtCZK(totals.spent)}</td>
              <td className="px-3 py-2 text-right font-medium">{fmtCZK(totals.remaining)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <BudgetGroupModal
        open={modalOpen}
        onClose={()=> setModalOpen(false)}
        categories={categories}
        onSaved={()=> { setModalOpen(false); loadData(); }}
      />
      <BudgetGroupDetailModal
        open={detailOpen}
        onClose={()=> setDetailOpen(false)}
        groupId={detailGroupId}
        groupName={detailGroupName}
        categories={categories}
        perCategory={perCategory}
        budgets={budgets}
        onChangeBudget={(id, v)=> setBudgets(prev => ({ ...prev, [id]: v }))}
        onOpenCategoryTx={(cid, cname)=> openCategoryTransactions(cid, cname)}
      />
      <BudgetChartsModal
        open={chartsOpen}
        onClose={()=> setChartsOpen(false)}
        title={`Struktura výdajů – ${monthNames[selectedMonth]} ${selectedYear}`}
        donutData={donutData}
      />
      <BudgetGroupsModal
        open={groupsOpen}
        onClose={()=> setGroupsOpen(false)}
        groups={groups}
        counts={new Map(groupsWithCounts.map(g=>[g.id, g.count] as [string, number]))}
        onOpenDetail={(id, name)=>{ setGroupsOpen(false); setDetailGroupId(id); setDetailGroupName(name); setDetailOpen(true); }}
      />
      <BudgetCategoryTxModal
        open={catTxOpen}
        onClose={()=> setCatTxOpen(false)}
        title={catTxTitle}
        rows={catTxRows}
        categories={categories}
      />
      <IncomeFilterModal
        open={incomeFilterOpen}
        onClose={()=> setIncomeFilterOpen(false)}
        categories={categories}
        selectedIds={excludedIncomeCatIds}
        onChange={setExcludedIncomeCatIds}
      />
    </div>
  );
}

