export type LinkedAccount = {
  id: string;
  provider: string;      // např. "Revolut", "Air Bank", "Fio"
  accountName: string;   // např. "Běžný účet"
  balanceCZK: number;    // přepočteno do CZK (dočasně mock)
  asOf: string;          // ISO datum poslední synchronizace
};

export const accounts: LinkedAccount[] = [
  { id:"rev-1", provider:"Revolut", accountName:"Personal", balanceCZK: 18250.45, asOf:"2025-08-10T09:15:00Z" },
  { id:"air-1", provider:"Air Bank", accountName:"Běžný účet", balanceCZK: 32500.00, asOf:"2025-08-10T08:50:00Z" },
  { id:"fio-1", provider:"Fio", accountName:"Osobní účet", balanceCZK: 12990.30, asOf:"2025-08-09T18:30:00Z" },
];
