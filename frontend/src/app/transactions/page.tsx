"use client";

import { Listbox, Transition } from "@headlessui/react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { transactions } from "@/lib/mock-data";

type TypeValue = "all" | "inc" | "exp";
const typeOptions: { value: TypeValue; label: string }[] = [
  { value: "all", label: "Vše" },
  { value: "inc", label: "Příjmy" },
  { value: "exp", label: "Výdaje" },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(n);

export default function TransactionsPage() {
  const [q, setQ] = useState("");

  // filtry používané logikou
  const [type, setType] = useState<TypeValue>("all");
  const [cat, setCat] = useState<string>("all");

  // HeadlessUI stavy (objekty kvůli labelům)
  const [selectedType, setSelectedType] = useState(typeOptions[0]);

  const categories = useMemo(() => {
    const set = new Set(transactions.map((t) => t.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "cs"));
  }, []);
  const categoryOptions = useMemo(
    () => [{ value: "all", label: "Všechny kategorie" }, ...categories.map((c) => ({ value: c, label: c }))],
    [categories]
  );
  const [selectedCat, setSelectedCat] = useState(categoryOptions[0]);

  useEffect(() => setType(selectedType.value), [selectedType]);
  useEffect(() => setCat(selectedCat.value), [selectedCat]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (type === "inc" && t.amountCZK <= 0) return false;
      if (type === "exp" && t.amountCZK >= 0) return false;
      if (cat !== "all" && t.category !== cat) return false;
      if (q && !(`${t.rawDescription} ${t.merchantNorm}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
  }, [q, type, cat]);

  return (
    <div className="space-y-4">
      {/* FILTRY – vždy nad tabulkou */}
      <div className="glass p-3 flex flex-wrap items-center gap-2 relative z-50">
        <input
          placeholder="Hledat…"
          className="bg-transparent outline-none text-sm placeholder-[var(--muted)] flex-1 min-w-[220px]"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {/* Typ transakce */}
        <div className="relative w-40 z-50">
          <Listbox value={selectedType} onChange={setSelectedType}>
            <Listbox.Button className="glass w-full px-3 py-2 rounded-xl text-sm text-left focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
              {selectedType.label}
            </Listbox.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-150"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Listbox.Options className="absolute mt-1 dropdown-panel w-full shadow-xl z-50 overflow-hidden">
                {typeOptions.map((o) => (
                  <Listbox.Option
                    key={o.value}
                    value={o}
                    className={({ active, selected }) =>
                      `px-3 py-2 cursor-pointer select-none flex items-center justify-between
                       ${active ? "bg-black/5" : ""} ${selected ? "font-semibold" : ""}`
                    }
                  >
                    {({ selected }) => (
                      <>
                        {o.label}
                        {selected && <span className="text-[var(--accent)] text-xs">●</span>}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </Listbox>
        </div>

        {/* Kategorie */}
        <div className="relative w-56 z-50">
          <Listbox value={selectedCat} onChange={setSelectedCat}>
            <Listbox.Button className="glass w-full px-3 py-2 rounded-xl text-sm text-left focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
              {selectedCat.label}
            </Listbox.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-150"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Listbox.Options className="absolute mt-1 dropdown-panel w-full max-h-64 overflow-auto shadow-xl z-50">
                <div className="px-3 py-2 text-[12px] text-[var(--muted)] bg-white/70 sticky top-0">
                  Kategorie
                </div>
                {categoryOptions.map((o) => (
                  <Listbox.Option
                    key={o.value}
                    value={o}
                    className={({ active, selected }) =>
                      `px-3 py-2 cursor-pointer select-none flex items-center justify-between
                       ${active ? "bg-black/5" : ""} ${selected ? "font-semibold" : ""}`
                    }
                  >
                    {({ selected }) => (
                      <>
                        {o.label}
                        {selected && <span className="text-[var(--accent)] text-xs">●</span>}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </Listbox>
        </div>
      </div>

      {/* TABULKA – schválně nižší z-index */}
      <div className="glass overflow-hidden relative z-10">
        <table className="w-full text-sm">
          <thead className="text-[var(--muted)] bg-white/40">
            <tr>
              <th className="text-left px-4 py-2">Datum</th>
              <th className="text-left px-4 py-2">Popis</th>
              <th className="text-left px-4 py-2">Kategorie</th>
              <th className="text-right px-4 py-2">Částka</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-t hairline hover:bg-white/50 transition">
                <td className="px-4 py-2">{new Date(t.ts).toLocaleString("cs-CZ")}</td>
                <td className="px-4 py-2">{t.rawDescription}</td>
                <td className="px-4 py-2">{t.category}</td>
                <td
                  className={
                    "px-4 py-2 text-right " +
                    (t.amountCZK < 0 ? "text-[color:var(--danger)]" : "text-[color:var(--success)]")
                  }
                >
                  {fmt(t.amountCZK)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted)]">
                  Nic nenalezeno…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
