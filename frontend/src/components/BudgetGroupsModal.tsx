"use client";

type CategoryGroup = { id: string; name: string; order: number };

export default function BudgetGroupsModal({
  open,
  onClose,
  groups,
  counts,
  onOpenDetail,
}: {
  open: boolean;
  onClose: () => void;
  groups: CategoryGroup[];
  counts: Map<string, number>;
  onOpenDetail: (id: string, name: string) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[640px]">
        <div className="bg-white p-5 rounded-2xl shadow-2xl border border-black/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Všechny oblasti</div>
            <button className="text-[13px] text-[var(--muted)] hover:text-black" onClick={onClose}>Zavřít</button>
          </div>
          <div className="max-h-[65vh] overflow-y-auto space-y-2 hide-scrollbar">
            {groups.map(g => (
              <div key={g.id} className="flex items-center justify-between p-2 rounded-xl border border-black/10 bg-white">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{g.name}</div>
                  <div className="text-[12px] text-[var(--muted)]">{counts.get(g.id) || 0} kategorií</div>
                </div>
                <button className="px-2 py-1 text-xs glass rounded hover:bg-black/5" onClick={()=> onOpenDetail(g.id, g.name)}>Detail</button>
              </div>
            ))}
            {groups.length === 0 && (
              <div className="text-[13px] text-[var(--muted)]">Žádné oblasti.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


