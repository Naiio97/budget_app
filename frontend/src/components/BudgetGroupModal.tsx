"use client";

import { useEffect, useMemo, useState } from "react";

type Category = { id: string; name: string; groupId?: string | null };
type CategoryGroup = { id: string; name: string; order: number };

export default function BudgetGroupModal({
  open,
  onClose,
  categories,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onSaved?: () => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setGroupName("");
      setSelectedIds([]);
    }
  }, [open]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  }, [categories]);

  const toggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  };

  const handleSave = async () => {
    const name = groupName.trim();
    if (!name) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/category-groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error('Vytvoření skupiny selhalo');
      const created: CategoryGroup = await res.json();
      // hromadně přiřadit vybrané kategorie
      await Promise.all(selectedIds.map(async (catId) => {
        await fetch(`/api/categories/${encodeURIComponent(catId)}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: categories.find(c=>c.id===catId)?.name || '', groupId: created.id })
        });
      }));
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Skupina vytvořena', type: 'success' } }));
      onClose();
      onSaved && onSaved();
    } catch(e:any) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message||'Chyba při ukládání', type: 'error' } }));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[560px]">
        <div className="bg-white p-5 rounded-2xl shadow-2xl border border-black/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Vytvořit rozpočtovou oblast</div>
            <button className="text-[13px] text-[var(--muted)] hover:text-black" onClick={onClose}>Zavřít</button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-[var(--muted)] mb-1">Název oblasti</label>
              <input value={groupName} onChange={(e)=> setGroupName(e.target.value)} className="glass px-3 py-2 rounded-xl w-full text-sm border border-black/10" placeholder="Např. Bydlení" />
            </div>
            <div>
              <div className="text-[11px] text-[var(--muted)] mb-1">Přiřadit existující kategorie</div>
              <div className="max-h-64 overflow-y-auto hide-scrollbar border border-black/10 rounded-lg p-2">
                {sortedCategories.map(cat => (
                  <label key={cat.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-black/5 cursor-pointer">
                    <input type="checkbox" checked={selectedIds.includes(cat.id)} onChange={()=> toggle(cat.id)} />
                    <span className="text-sm">{cat.name}</span>
                  </label>
                ))}
                {sortedCategories.length===0 && <div className="text-[13px] text-[var(--muted)]">Žádné kategorie.</div>}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button className="px-3 py-1.5 rounded text-sm bg-black/5 hover:bg-black/10" onClick={onClose}>Zrušit</button>
              <button className="px-3 py-1.5 rounded text-sm bg-[var(--accent)] text-white disabled:opacity-60" onClick={handleSave} disabled={!groupName.trim()||submitting}>Vytvořit</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


