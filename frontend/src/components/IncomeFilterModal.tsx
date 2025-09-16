"use client";

import { useMemo, useState, useEffect } from "react";

type Category = { id: string; name: string };

export default function IncomeFilterModal({
  open,
  onClose,
  categories,
  selectedIds,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
}) {
  const [local, setLocal] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (open) setLocal(selectedIds);
  }, [open, selectedIds]);

  const sorted = useMemo(() => [...categories].sort((a,b)=> a.name.localeCompare(b.name,'cs')), [categories]);

  const toggle = (id: string) => {
    setLocal(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[560px]">
        <div className="bg-white p-5 rounded-2xl shadow-2xl border border-black/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Filtrovat příjmy – vyloučit kategorie</div>
            <button className="text-[13px] text-[var(--muted)] hover:text-black" onClick={onClose}>Zavřít</button>
          </div>
          <div className="max-h-72 overflow-y-auto hide-scrollbar border border-black/10 rounded-lg p-2">
            {sorted.map(cat => (
              <label key={cat.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-black/5 cursor-pointer">
                <input type="checkbox" checked={local.includes(cat.id)} onChange={()=> toggle(cat.id)} />
                <span className="text-sm">{cat.name}</span>
              </label>
            ))}
            {sorted.length===0 && <div className="text-[13px] text-[var(--muted)]">Žádné kategorie.</div>}
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button className="px-3 py-1.5 rounded text-sm bg-black/5 hover:bg-black/10" onClick={onClose}>Zrušit</button>
            <button className="px-3 py-1.5 rounded text-sm bg-[var(--accent)] text-white" onClick={()=>{ onChange(local); onClose(); }}>Uložit</button>
          </div>
        </div>
      </div>
    </div>
  );
}


