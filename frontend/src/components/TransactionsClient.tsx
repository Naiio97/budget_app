"use client";

import { useCallback, useEffect, useState } from "react";
import TransactionFilters from "@/components/TransactionFilters";
import TransactionsList from "@/components/TransactionsList";
import { TxRow } from "@/types/transactions";

export default function TransactionsClient({
  initialTransactions,
  initialAccounts,
  initialCategories,
}: {
  initialTransactions: TxRow[];
  initialAccounts: Array<{ id: string; accountName: string; provider: string; customName?: string | null }>;
  initialCategories: Array<{ id: string; name: string }>;
}) {
  // Všechny dosud načtené transakce (pro filtry)
  const [allRows, setAllRows] = useState<TxRow[]>(initialTransactions);
  // Aktuálně filtrované (co se zobrazuje)
  const [filtered, setFiltered] = useState<TxRow[]>(initialTransactions.slice(0, 10));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setAllRows(initialTransactions);
    setFiltered(initialTransactions.slice(0, 10));
  }, [initialTransactions]);

  const handleFilteredChange = useCallback((rows: TxRow[]) => setFiltered(rows), []);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/transactions?offset=${allRows.length}&limit=20`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const newRows: TxRow[] = data.rows || [];
        if (newRows.length === 0) {
          setHasMore(false);
        } else {
          // Rozšiř pouze zdrojová data; filtry se přepočítají v TransactionFilters díky prop změně
          setAllRows(prev => [...prev, ...newRows]);
        }
      }
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, allRows.length]);

  return (
    <div className="space-y-4">
      <TransactionFilters
        transactions={allRows}
        accounts={initialAccounts}
        onFilteredChange={handleFilteredChange}
        showYearMonth={true}
        categories={initialCategories}
      />
      <TransactionsList
        rows={filtered}
        categories={initialCategories}
        autoLoadEnabled={false}
        isLoadingMore={loadingMore}
        rowsPerPage={10}
        fitViewport={true}
        reserveBottom={80}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        showLoadMoreButton={true}
        loadMoreLabel="Načíst další"
        loadingLabel="Načítám…"
      />
    </div>
  );
}


