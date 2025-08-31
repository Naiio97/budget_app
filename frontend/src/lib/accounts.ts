export type LinkedAccount = {
  id: string;
  provider: string;     // "Revolut", "Air Bank", "Fio"…
  accountName: string;  // "Běžný účet"
  currency: "CZK" | "EUR" | "USD";
  balance: number;      // v měně účtu
  balanceCZK: number;   // přepočet do CZK (zatím mock)
  iban?: string;
  last4?: string;       // poslední 4 čísla
  asOf: string;         // ISO timestamp poslední synchronizace
};

export const accounts: LinkedAccount[] = [
  {
    id: "rev-1", provider: "Revolut", accountName: "Personal", balanceCZK: 18250.45, asOf: "2025-08-10T09:15:00Z",
    currency: "CZK",
    balance: 0
  },
  {
    id: "air-1", provider: "Air Bank", accountName: "Běžný účet", balanceCZK: 32500.00, asOf: "2025-08-10T08:50:00Z",
    currency: "CZK",
    balance: 0
  },
  {
    id: "ppf-1", provider: "PPF Banka", accountName: "Osobní účet", balanceCZK: 12990.30, asOf: "2025-08-09T18:30:00Z",
    currency: "CZK",
    balance: 0
  },
  {
    id: "cs-1", provider: "Česká Spořitelna", accountName: "Osobní účet", balanceCZK: 38990.30, asOf: "2025-08-09T18:30:00Z",
    currency: "CZK",
    balance: 0
  },
];

export const PRIMARY_KEY = "primaryAccountId";
export const getPrimaryId = () =>
  typeof window === "undefined" ? null : localStorage.getItem(PRIMARY_KEY);
export const setPrimaryId = (id: string) =>
  localStorage.setItem(PRIMARY_KEY, id);

// alfabetický fallback (provider + accountName)
export function getFallbackAccountId(): string {
  const sorted = [...accounts].sort((a, b) =>
    `${a.provider} ${a.accountName}`.localeCompare(`${b.provider} ${b.accountName}`, "cs")
  );
  return sorted[0]?.id ?? accounts[0]?.id ?? "";
}