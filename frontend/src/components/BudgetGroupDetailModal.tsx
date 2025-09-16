"use client";

import { useMemo } from "react";

type Category = { id: string; name: string; groupId?: string | null };
type PerCategory = { categoryId: string | null; name: string; spent: number };

export default function BudgetGroupDetailModal({
  open,
  onClose,
  groupId,
  groupName,
  categories,
  perCategory,
  budgets,
  onChangeBudget,
  onOpenCategoryTx,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string | null;
  groupName?: string | null;
  categories: Category[];
  perCategory: PerCategory[];
  budgets: Record<string, number>;
  onChangeBudget: (categoryId: string, value: number) => void;
  onOpenCategoryTx: (categoryId: string, categoryName: string) => void;
}) {
  const groupCategories = useMemo(() => categories.filter(c => (c.groupId || "__nogroup__") === (groupId || "__nogroup__")), [categories, groupId]);
  const perCatMap = useMemo(() => new Map(perCategory.map(c => [c.categoryId ?? "", c])), [perCategory]);

  const totals = useMemo(() => {
    const budgetSum = groupCategories.reduce((s, c) => s + (budgets[c.id] || 0), 0);
    const spentSum = groupCategories.reduce((s, c) => s + (perCatMap.get(c.id)?.spent || 0), 0);
    const remaining = Math.max(0, budgetSum - spentSum);
    return { budgetSum, spentSum, remaining };
  }, [groupCategories, budgets, perCatMap]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[680px]">
        <div className="bg-white p-5 rounded-2xl shadow-2xl border border-black/10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-medium">Oblast: {groupName || "Bez názvu"}</div>
              <div className="text-[12px] text-[var(--muted)]">{groupCategories.length} kategorií · Rozpočet {fmt(totals.budgetSum)} · Utraceno {fmt(totals.spentSum)}</div>
            </div>
            <button className="text-[13px] text-[var(--muted)] hover:text-black" onClick={onClose}>Zavřít</button>
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto hide-scrollbar">
            {groupCategories.map(cat => {
              const agg = perCatMap.get(cat.id) || { categoryId: cat.id, name: cat.name, spent: 0 };
              const budget = budgets[cat.id] || 0;
              const remaining = Math.max(0, budget - agg.spent);
              const ratio = budget > 0 ? Math.min(1, agg.spent / budget) : 0;
              const barColor = ratio < 0.7 ? 'bg-[color:var(--success)]' : (ratio <= 1 ? 'bg-amber-500' : 'bg-[color:var(--danger)]');
              return (
                <div key={cat.id} className="p-2 rounded-xl border border-black/10 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <button className="text-sm font-medium truncate hover:underline" onClick={()=> onOpenCategoryTx(cat.id, agg.name)} title="Zobrazit transakce kategorie za měsíc">{agg.name}</button>
                      <div className="text-[12px] text-[var(--muted)]">{fmt(agg.spent)} / {fmt(budget)} · zbývá {fmt(remaining)}</div>
                    </div>
                    <input
                      type="number"
                      className="glass px-2 py-1 rounded w-28 text-right border border-white/20 text-sm"
                      value={budget}
                      min={0}
                      onChange={e => onChangeBudget(cat.id, Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  <div className="mt-2 h-2 rounded bg-black/5 overflow-hidden">
                    <div className={`h-2 ${barColor}`} style={{ width: `${Math.round(ratio*100)}%` }} />
                  </div>
                </div>
              );
            })}
            {groupCategories.length === 0 && (
              <div className="text-[13px] text-[var(--muted)]">Tato oblast nemá žádné kategorie.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(n);
}


