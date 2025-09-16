"use client";

import { useMemo, useState, memo } from "react";
import PortalDropdown from "@/components/PortalDropdown";
import TransactionsFeed from "@/components/TransactionsFeed";
import { isInternalTransfer } from "@/lib/dateUtils";
import { getAccountDisplayName } from "@/lib/accountUtils";
import { TxRow } from "@/types/transactions";

const fmt = (n: number) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(n);

export default function DashboardClient({
  accounts,
  transactions,
  categories,
}: {
  accounts: Array<{ id: string; accountName: string; provider: string; balanceCZK: number; customName?: string | null; isVisible: boolean; institutionLogo?: string | null }>;
  transactions: TxRow[];
  categories: Array<{ id: string; name: string }>;
}) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  // Odebráno: tvorba rozpočtové oblasti z dashboardu

  const currentYear = selectedYear;
  const currentMonthNum = selectedMonth;

  const ownAccountNames = useMemo(() => accounts.map(getAccountDisplayName), [accounts]);

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const txDate = new Date(t.ts);
      return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonthNum;
    });
  }, [transactions, currentYear, currentMonthNum]);

  const externalTransactions = useMemo(() => {
    return currentMonthTransactions.filter((t) => {
      // Ignoruj transakce označené jako kategorie "Převod"
      if (t.category === 'Převod') return false;
      // Záložní heuristika podle popisu/názvů účtů
      return !isInternalTransfer(t.rawDescription, ownAccountNames);
    });
  }, [currentMonthTransactions, ownAccountNames]);

  const filteredTransactions = useMemo(() => externalTransactions, [externalTransactions]);

  const incomes = filteredTransactions.filter((t) => t.amountCZK > 0);
  const expenses = filteredTransactions.filter((t) => t.amountCZK < 0);
  const sumIncome = incomes.reduce((a, b) => a + b.amountCZK, 0);
  const sumExpense = expenses.reduce((a, b) => a + Math.abs(b.amountCZK), 0);
  const net = sumIncome - sumExpense;

  const totalBalance = accounts.reduce((sum, account) => sum + (account.balanceCZK || 0), 0);

  const currentYearForOptions = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYearForOptions - i);
  const monthNames = [
    "Leden",
    "Únor",
    "Březen",
    "Duben",
    "Květen",
    "Červen",
    "Červenec",
    "Srpen",
    "Září",
    "Říjen",
    "Listopad",
    "Prosinec",
  ];

  return (
    <>
    <div className="space-y-4">
      <div className="glass p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2 relative">
          <PortalDropdown
            value={selectedYear}
            onChange={setSelectedYear}
            options={yearOptions}
            displayValue={(year) => year.toString()}
            className="w-24"
          >
            {(year) => (
              <>
                {year}
                {selectedYear === year && <span className="text-[var(--accent)] text-xs">●</span>}
              </>
            )}
          </PortalDropdown>

          <PortalDropdown
            value={selectedMonth}
            onChange={setSelectedMonth}
            options={monthNames.map((_, index) => index)}
            displayValue={(monthIndex) => monthNames[monthIndex]}
            className="w-32"
          >
            {(monthIndex) => (
              <>
                {monthNames[monthIndex]}
                {selectedMonth === monthIndex && <span className="text-[var(--accent)] text-xs">●</span>}
              </>
            )}
          </PortalDropdown>
        </div>
        {/* Tlačítko pro vytvoření oblasti bylo přesunuto na stránku Rozpočet */}
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
        <Card title="Celkový zůstatek" value={fmt(totalBalance)} color="var(--accent)" />
        <Card title="Prijmy" value={fmt(sumIncome)} color="var(--success)" />
        <Card title="Vydaje" value={fmt(sumExpense)} color="var(--danger)" />
        <Card title="Bilance" value={fmt(net)} />
      </div>

      <div className="inline-flex items-center gap-2 glass px-3 py-2 text-[13px] in-pop">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "linear-gradient(135deg,#007aff,#5ac8fa)" }} />
        <span className="text-[var(--muted)]">Tento mesic +12 % za Jidlo venku oproti prumeru 3 mesicu.</span>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Transakce - {monthNames[selectedMonth]} {selectedYear}</h3>
        <TransactionsFeed rows={filteredTransactions} mode="compact" maxRows={5} categories={categories} />
      </div>
    </div>
    {/* Modál pro vytvoření oblasti byl přesunut na stránku Rozpočet */}
    </>
  );
}

const Card = memo(function Card({ title, value, color }: { title: string; value: string; color?: string }) {
  return (
    <div className="glass p-5 transition-transform duration-200 hover:scale-[1.01] in-pop">
      <div className="text-[13px] text-[var(--muted)] mb-1">{title}</div>
      <div className="text-3xl font-semibold tracking-tight" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
});


