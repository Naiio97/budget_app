"use client";

import { useMemo, useState, useEffect } from "react";
import { TxRow } from "@/types/transactions";
import { getAccountDisplayName } from "@/lib/accountUtils";
import PortalDropdown from "@/components/PortalDropdown";
import { formatDateOnly } from "@/lib/dateUtils";

type TypeValue = "all" | "inc" | "exp";

interface TransactionFiltersProps {
  transactions: TxRow[];
  accounts: any[];
  onFilteredChange: (filtered: TxRow[]) => void;
  showYearMonth?: boolean;
  selectedYear?: number;
  selectedMonth?: number;
  onYearChange?: (year: number) => void;
  onMonthChange?: (month: number) => void;
  categories?: Array<{ id: string; name: string }>;
}

export default function TransactionFilters({
  transactions,
  accounts,
  onFilteredChange,
  showYearMonth = false,
  selectedYear = new Date().getFullYear(),
  selectedMonth = new Date().getMonth(),
  onYearChange,
  onMonthChange,
  categories = []
}: TransactionFiltersProps) {
  const [q, setQ] = useState("");
  const [selectedType, setSelectedType] = useState({ value: "all" as TypeValue, label: "Všechny" });
  const [selectedCat, setSelectedCat] = useState({ value: "all", label: "Všechny kategorie" });
  const [selectedAccount, setSelectedAccount] = useState({ value: "all", label: "Všechny účty" });

  // Možnosti pro filtry
  const typeOptions = [
    { value: "all" as const, label: "Všechny" },
    { value: "inc" as const, label: "Příjmy" },
    { value: "exp" as const, label: "Výdaje" }
  ];

  const categoryOptions = useMemo(() => {
    const transactionCategories = Array.from(new Set(transactions.map(t => t.category))).sort();
    const dbCategoryNames = categories.map(cat => cat.name).sort();
    const allCategories = Array.from(new Set([...dbCategoryNames, ...transactionCategories])).sort();
    return [{ value: "all", label: "Všechny kategorie" }, ...allCategories.map(cat => ({ value: cat, label: cat }))];
  }, [transactions, categories]);

  const accountOptions = useMemo(() => {
    return [
      { value: "all", label: "Všechny účty" },
      ...accounts.map(acc => ({ 
        value: acc.id, 
        label: getAccountDisplayName(acc)
      }))
    ];
  }, [accounts]);

  // Generování možností pro roky (posledních 5 let + aktuální)
  const currentYearForOptions = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYearForOptions - i);
  
  // Názvy měsíců
  const monthNames = [
    "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
    "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
  ];

  // Filtrování transakcí
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedType.value === "inc" && t.amountCZK <= 0) return false;
      if (selectedType.value === "exp" && t.amountCZK >= 0) return false;
      if (selectedCat.value !== "all" && t.category !== selectedCat.value) return false;
      if (selectedAccount.value !== "all" && t.accountName !== selectedAccount.value) return false;
      if (q && !(`${t.rawDescription}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [transactions, selectedType, selectedCat, selectedAccount, q]);

  // Notifikuj rodičovskou komponentu o změně filtrovaných transakcí
  useEffect(() => {
    onFilteredChange(filteredTransactions);
  }, [filteredTransactions]);

  // Export CSV aktuálně filtrovaných transakcí
  const csvEscape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    const needsQuotes = /[";\n\r,]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const handleExportCsv = () => {
    if (!filteredTransactions.length) return;
    const headers = [
      "Datum",
      "Popis",
      "Účet",
      "Kategorie",
      "Částka (CZK)",
    ];
    const lines = filteredTransactions.map((t) => [
      csvEscape(formatDateOnly(t.ts)),
      csvEscape(t.rawDescription ?? ""),
      csvEscape(t.accountDisplayName || t.accountName || ""),
      csvEscape(t.category || "Nezařazeno"),
      String(t.amountCZK)
    ].join(";"));
    const csv = [headers.join(";"), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transakce_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass p-2.5 space-y-2.5">
      {/* Hledání */}
      <div className="flex items-center gap-2">
        <input
          placeholder="Hledat v transakcích…"
          className="glass px-2.5 py-1.5 rounded-xl text-sm placeholder-[var(--muted)] w-full focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border border-white/20"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          onClick={handleExportCsv}
          disabled={!filteredTransactions.length}
          className="px-2 py-1 rounded text-[13px] text-[var(--muted)] bg-transparent hover:bg-black/5 transition disabled:opacity-50"
          title="Exportovat filtrované transakce do CSV"
        >
          Export CSV
        </button>
      </div>

      {/* Filtry */}
      <div className="flex flex-wrap items-center gap-1.5 relative">
        {/* Rok - pouze pokud je povoleno */}
        {showYearMonth && (
          <PortalDropdown
            value={selectedYear}
            onChange={onYearChange || (() => {})}
            options={yearOptions}
            displayValue={(year) => year.toString()}
            className="w-20"
          >
            {(year, index) => (
              <>
                {year}
                {selectedYear === year && <span className="text-[var(--accent)] text-xs">●</span>}
              </>
            )}
          </PortalDropdown>
        )}

        {/* Měsíc - pouze pokud je povoleno */}
        {showYearMonth && (
          <PortalDropdown
            value={selectedMonth}
            onChange={onMonthChange || (() => {})}
            options={monthNames.map((name, index) => index)}
            displayValue={(monthIndex) => monthNames[monthIndex]}
            className="w-28"
          >
            {(monthIndex, _) => (
              <>
                {monthNames[monthIndex]}
                {selectedMonth === monthIndex && <span className="text-[var(--accent)] text-xs">●</span>}
              </>
            )}
          </PortalDropdown>
        )}

        {/* Typ transakce */}
        <PortalDropdown
          value={selectedType}
          onChange={setSelectedType}
          options={typeOptions}
          displayValue={(option) => option.label}
          className="w-34"
        >
          {(option, index) => (
            <>
              {option.label}
              {selectedType.value === option.value && <span className="text-[var(--accent)] text-xs">●</span>}
            </>
          )}
        </PortalDropdown>

        {/* Kategorie */}
        <div className="flex gap-1 items-center">
          <PortalDropdown
            value={selectedCat}
            onChange={setSelectedCat}
            options={categoryOptions}
            displayValue={(option) => option.label}
            className="w-50"
          >
            {(option, index) => (
              <>
                {option.label}
                {selectedCat.value === option.value && <span className="text-[var(--accent)] text-xs">●</span>}
              </>
            )}
          </PortalDropdown>
        </div>

        {/* Účet */}
        <PortalDropdown
          value={selectedAccount}
          onChange={setSelectedAccount}
          options={accountOptions}
          displayValue={(option) => option.label}
          className="w-52"
        >
          {(option, index) => (
            <>
              {option.label}
              {selectedAccount.value === option.value && <span className="text-[var(--accent)] text-xs">●</span>}
            </>
          )}
        </PortalDropdown>
      </div>
    </div>
  );
}
