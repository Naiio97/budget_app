"use client";

import TransactionsFeed from "@/components/TransactionsFeed";

type TxRow = {
  id: string;
  ts: string;
  rawDescription: string;
  category?: string;
  categoryId: string | null;
  amountCZK: number;
  accountName?: string;
  accountDisplayName?: string;
};

type Category = { id: string; name: string };

export default function BudgetCategoryTxModal({
  open,
  onClose,
  title,
  rows,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  rows: TxRow[];
  categories: Category[];
}) {
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
          <div className="max-h-[70vh] overflow-y-auto hide-scrollbar">
            <TransactionsFeed rows={rows} categories={categories} mode="compact" />
            {rows.length === 0 && (
              <div className="text-[13px] text-[var(--muted)]">Žádné transakce pro tuto kategorii v daném období.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


