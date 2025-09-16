"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import TransactionsList from "@/components/TransactionsList";
import TransactionFilters from "@/components/TransactionFilters";
import { TxRow } from "@/types/transactions";

interface AccountPageClientProps {
  accountId: string;
  initialTransactions?: TxRow[];
  initialAccounts?: Array<{ id: string; accountName: string; provider: string; customName?: string | null }>;
  initialCategories?: Array<{ id: string; name: string }>;
}

const fmtCZK = (n: number) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(n); // n je už v korunách

export default function AccountPageClient({ accountId, initialTransactions, initialAccounts, initialCategories }: AccountPageClientProps) {
  const loading = false;
  const error: string | null = null;
  const transactions = initialTransactions ?? [];
  const accounts = initialAccounts ?? [];
  const categories = initialCategories ?? [];
  const [filteredTransactions, setFilteredTransactions] = useState<TxRow[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // State pro filtry roku a měsíce
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  const currentMonthTxs = useMemo(() => {
    return transactions.filter(t => {
      const txDate = new Date(t.ts);
      return txDate.getFullYear() === selectedYear && txDate.getMonth() === selectedMonth;
    });
  }, [transactions, selectedYear, selectedMonth]);

  // Ignoruj převody v souhrnných číslech
  const monthTxsNoTransfers = useMemo(() => {
    return currentMonthTxs.filter(t => t.category !== 'Převod');
  }, [currentMonthTxs]);

  const incomes = monthTxsNoTransfers.filter((t) => t.amountCZK > 0);
  const expenses = monthTxsNoTransfers.filter((t) => t.amountCZK < 0);
  const sumIncome = incomes.reduce((a, b) => a + b.amountCZK, 0);
  const sumExpense = expenses.reduce((a, b) => a + Math.abs(b.amountCZK), 0);
  const net = sumIncome - sumExpense;

  // Callback pro aktualizaci filtrovaných transakcí
  const handleFilteredChange = useCallback((filtered: TxRow[]) => {
    setFilteredTransactions(filtered);
  }, []);

  // Inicializuj filtry s transakcemi
  useEffect(() => {
    setFilteredTransactions(transactions.slice(0, 10));
  }, [transactions]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/transactions?offset=${filteredTransactions.length}&limit=50`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const newRows: TxRow[] = data.rows || [];
        if (newRows.length === 0) {
          setHasMore(false);
        } else {
          setFilteredTransactions(prev => [...prev, ...newRows]);
        }
      }
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, accountId, filteredTransactions.length]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="glass p-4">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
          <div className="glass p-4">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
          <div className="glass p-4">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="glass p-4 text-center text-[var(--muted)]">
          Načítání transakcí...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass p-4 text-center text-red-600">
        Chyba při načítání transakcí: {error}
      </div>
    );
  }

  // Názvy měsíců
  const monthNames = [
    "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
    "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
  ];

  return (
    <div className="space-y-4">
      {/* Souhrn pro tento účet */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="glass p-3">
          <div className="text-[13px] text-[var(--muted)]">
            Příjmy - {monthNames[selectedMonth]} {selectedYear}
          </div>
          <div className="text-xl font-semibold text-[color:var(--success)]">
            {fmtCZK(sumIncome)}
          </div>
        </div>
        <div className="glass p-3">
          <div className="text-[13px] text-[var(--muted)]">
            Výdaje - {monthNames[selectedMonth]} {selectedYear}
          </div>
          <div className="text-xl font-semibold text-[color:var(--danger)]">
            {fmtCZK(sumExpense)}
          </div>
        </div>
        <div className="glass p-3">
          <div className="text-[13px] text-[var(--muted)]">
            Bilance - {monthNames[selectedMonth]} {selectedYear}
          </div>
          <div className="text-xl font-semibold">{fmtCZK(net)}</div>
        </div>
      </div>

        <TransactionFilters
          transactions={transactions}
          accounts={accounts}
          onFilteredChange={handleFilteredChange}
          showYearMonth={true}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
          categories={categories}
        />
      <TransactionsList
        rows={filteredTransactions}
        categories={categories}
        autoLoadEnabled={false}
        isLoadingMore={loadingMore}
        rowsPerPage={10}
        fitViewport={true}
        reserveBottom={56}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        showLoadMoreButton={true}
        loadMoreLabel="Načíst další"
        loadingLabel="Načítám…"
      />
    </div>
  );
}
