// Utility funkce pro práci s účty

export type Account = {
  id: string;
  provider: string;
  accountName: string;
  customName?: string | null;
  isVisible?: boolean;
  balanceCZK: number;
  asOf: string;
  connectionId?: string | null;
  institutionId?: string | null;
  currency?: string;
  iban?: string | null;
  institutionLogo?: string | null;
};

/**
 * Vrátí zobrazovaný název účtu - buď customName nebo accountName
 */
export function getAccountDisplayName(account: Account): string {
  return account.customName || account.accountName;
}

/**
 * Vrátí plný název účtu včetně providera
 */
export function getAccountFullName(account: Account): string {
  const displayName = getAccountDisplayName(account);
  return `${account.provider} – ${displayName}`;
}

/**
 * Filtruje účty podle viditelnosti
 */
export function filterVisibleAccounts(accounts: Account[]): Account[] {
  return accounts.filter(account => account.isVisible !== false);
}
