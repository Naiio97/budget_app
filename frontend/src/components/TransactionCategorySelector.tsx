"use client";

import { useState, useMemo, useEffect } from "react";
import PortalDropdown from "@/components/PortalDropdown";
import { TxRow } from "@/types/transactions";

interface TransactionCategorySelectorProps {
  transaction: TxRow;
  onCategoryChange?: (transactionId: string, categoryId: string | null, categoryName: string) => void;
  categories: Array<{ id: string; name: string }>;
  disabled?: boolean;
}

export default function TransactionCategorySelector({
  transaction,
  onCategoryChange,
  categories,
  disabled = false
}: TransactionCategorySelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(transaction.categoryId ?? null);

  // Udržuj lokální stav v synchronizaci s prop hodnotou
  useEffect(() => {
    setSelectedCategoryId(transaction.categoryId ?? null);
  }, [transaction.categoryId]);

  const categoryOptions = useMemo(() => {
    return [
      { id: null, name: "Nezařazeno" },
      ...categories.map(cat => ({ id: cat.id, name: cat.name }))
    ];
  }, [categories]);

  const currentCategory = useMemo(() => {
    if (!selectedCategoryId) {
      return { id: null, name: "Nezařazeno" };
    }
    const found = categoryOptions.find(opt => opt.id === selectedCategoryId);
    return found || { id: null, name: "Nezařazeno" };
  }, [selectedCategoryId, categoryOptions]);

  const handleCategoryChange = async (newCategory: { id: string | null; name: string }) => {
    if (newCategory.id === selectedCategoryId) {
      return; // Žádná změna
    }

    setIsUpdating(true);

    try {
      const prevId = selectedCategoryId;
      // Optimistická aktualizace UI
      setSelectedCategoryId(newCategory.id);

      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categoryId: newCategory.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Nepodařilo se aktualizovat kategorii');
      }

      // Informuj rodičovskou komponentu o změně (pokud callback existuje)
      onCategoryChange?.(transaction.id, newCategory.id, newCategory.name);
    } catch (error) {
      console.error('Chyba při aktualizaci kategorie:', error);
      // revertuj optimistickou změnu
      setSelectedCategoryId(currentCategory.id);
      alert(`Chyba při aktualizaci kategorie: ${error instanceof Error ? error.message : 'Neznámá chyba'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (categories.length === 0) {
    return (
      <span className="text-sm text-[var(--muted)]">Žádné kategorie</span>
    );
  }

  return (
    <PortalDropdown
      value={currentCategory}
      onChange={handleCategoryChange}
      options={categoryOptions}
      displayValue={(option) => option.name}
      className="min-w-[60px]"
      variant="subtle"
    >
      {(option, index) => (
        <div className="flex items-center justify-between">
          <span className={option.id === null ? "text-[var(--muted)] italic" : ""}>
            {option.name}
          </span>
          {currentCategory.id === option.id && (
            <span className="text-[var(--accent)] text-xs">●</span>
          )}
        </div>
      )}
    </PortalDropdown>
  );
}
