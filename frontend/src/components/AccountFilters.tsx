"use client";

import { useEffect, useMemo, useState } from "react";
import { TxRow } from "@/types/transactions";
import { useCategories } from "@/lib/hooks";
import PortalDropdown from "@/components/PortalDropdown";

type TypeValue = "all" | "inc" | "exp";
const typeOptions: { value: TypeValue; label: string }[] = [
  { value: "all", label: "Vše" },
  { value: "inc", label: "Příjmy" },
  { value: "exp", label: "Výdaje" },
];

interface AccountFiltersProps {
  transactions: TxRow[];
  onFilteredChange: (filtered: TxRow[]) => void;
}

export default function AccountFilters({ transactions, onFilteredChange }: AccountFiltersProps) {
  const [type, setType] = useState<TypeValue>("all");
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [selectedType, setSelectedType] = useState(typeOptions[0]);

  // Načítání kategorií z databáze
  const { categories: dbCategories } = useCategories();

  const categoryOptions = useMemo(() => {
    // Použij kategorie z databáze, ale také přidej ty co se objevují v transakcích (pro zpětnou kompatibilitu)
    const transactionCategories = Array.from(new Set(transactions.map(t => t.category))).sort((a, b) => a.localeCompare(b, "cs"));
    const dbCategoryNames = dbCategories.map(cat => cat.name).sort((a, b) => a.localeCompare(b, "cs"));
    const allCategories = Array.from(new Set([...dbCategoryNames, ...transactionCategories])).sort((a, b) => a.localeCompare(b, "cs"));
    
    return [
      { value: "all", label: "Všechny kategorie" }, 
      ...allCategories.map((c) => ({ value: c, label: c }))
    ];
  }, [transactions, dbCategories]);
  
  const [selectedCat, setSelectedCat] = useState(categoryOptions[0]);

  useEffect(() => setType(selectedType.value), [selectedType]);
  useEffect(() => setCat(selectedCat.value), [selectedCat]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (type === "inc" && t.amountCZK <= 0) return false;
      if (type === "exp" && t.amountCZK >= 0) return false;
      if (cat !== "all" && t.category !== cat) return false;
      if (q && !(`${t.rawDescription}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [transactions, type, cat, q]);

  useEffect(() => {
    onFilteredChange(filtered);
  }, [filtered, onFilteredChange]);

  return (
    <div className="glass p-3 flex flex-wrap items-center gap-2 relative z-50">
      {/* Textové vyhledávání */}
      <input
        placeholder="Hledat…"
        className="glass px-3 py-2 rounded-xl text-sm placeholder-[var(--muted)] flex-1 min-w-[220px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] border border-white/20"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {/* Typ transakce */}
      <PortalDropdown
        value={selectedType}
        onChange={setSelectedType}
        options={typeOptions}
        displayValue={(option) => option.label}
        className="w-40"
      >
        {(option, index) => (
          <>
            {option.label}
            {selectedType.value === option.value && <span className="text-[var(--accent)] text-xs">●</span>}
          </>
        )}
      </PortalDropdown>

      {/* Kategorie */}
      <PortalDropdown
        value={selectedCat}
        onChange={setSelectedCat}
        options={categoryOptions}
        displayValue={(option) => option.label}
        className="w-56"
      >
        {(option, index) => (
          <>
            {option.label}
            {selectedCat.value === option.value && <span className="text-[var(--accent)] text-xs">●</span>}
          </>
        )}
      </PortalDropdown>
    </div>
  );
}
