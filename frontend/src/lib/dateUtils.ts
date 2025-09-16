/**
 * Utility funkce pro správné formátování času a data
 */

/**
 * Formátuje datum pro zobrazení v českém formátu
 * @param dateString - ISO string nebo Date objekt
 * @param includeTime - zda zahrnout čas
 * @returns formátované datum/čas
 */
export function formatDate(dateString: string | Date, includeTime: boolean = false): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (includeTime) {
    return date.toLocaleString("cs-CZ", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Prague" // Explicitně nastavit české časové pásmo
    });
  } else {
    return date.toLocaleDateString("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Europe/Prague"
    });
  }
}

/**
 * Formátuje pouze datum (bez času)
 * @param dateString - ISO string nebo Date objekt
 * @returns formátované datum
 */
export function formatDateOnly(dateString: string | Date): string {
  return formatDate(dateString, false);
}

/**
 * Formátuje datum s časem
 * @param dateString - ISO string nebo Date objekt  
 * @returns formátované datum s časem
 */
export function formatDateTime(dateString: string | Date): string {
  return formatDate(dateString, true);
}

/**
 * Vytvoří nový Date objekt s aktuálním časem v českém časovém pásmu
 * @returns Date objekt s aktuálním časem
 */
export function nowInCzechTimeZone(): Date {
  const now = new Date();
  // Převést na české časové pásmo
  return new Date(now.toLocaleString("en-US", { timeZone: "Europe/Prague" }));
}

/**
 * Detekuje, jestli je transakce interní převod mezi účty podle popisu
 * @param description - popis transakce
 * @returns true pokud jde o interní převod
 */
export function isInternalTransferByDescription(description: string): boolean {
  if (!description) return false;
  
  const lowerDesc = description.toLowerCase();
  
  // Typické popisy interních převodů
  const internalKeywords = [
    'převod mezi účty',
    'interní převod',
    'transfer',
    'převod z účtu',
    'převod na účet',
    'internal transfer',
    'mezi účty',
    'převod vlastních prostředků',
    'vlastní převod'
  ];
  
  return internalKeywords.some(keyword => lowerDesc.includes(keyword));
}

/**
 * Detekuje, jestli je transakce interní převod mezi vlastními účty podle názvu účtu
 * @param description - popis transakce
 * @param ownAccountNames - seznam vlastních názvů účtů
 * @returns true pokud jde o interní převod
 */
export function isInternalTransferByAccountName(
  description: string,
  ownAccountNames: string[]
): boolean {
  if (!description || ownAccountNames.length === 0) return false;
  
  const lowerDesc = description.toLowerCase();
  
  // Hledej názvy vlastních účtů v popisu transakce
  return ownAccountNames.some(accountName => {
    const lowerAccountName = accountName.toLowerCase();
    return lowerDesc.includes(lowerAccountName);
  });
}

/**
 * Detekuje, jestli je transakce interní převod (kombinuje oba způsoby detekce)
 * @param description - popis transakce
 * @param ownAccountNames - seznam vlastních názvů účtů
 * @returns true pokud jde o interní převod
 */
export function isInternalTransfer(
  description: string,
  ownAccountNames?: string[]
): boolean {
  // Pokud máme názvy vlastních účtů, použij detekci podle názvu
  if (ownAccountNames && ownAccountNames.length > 0) {
    return isInternalTransferByAccountName(description, ownAccountNames);
  }
  
  // Jinak použij detekci podle klíčových slov
  return isInternalTransferByDescription(description);
}
