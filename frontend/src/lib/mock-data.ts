export type Transaction = {
  id: string;
  ts: string;              // datum+čas
  amountCZK: number;       // částka (kladná = příjem, záporná = výdaj)
  rawDescription: string;  // původní text z banky
  merchantNorm: string;    // zjednodušený merchant
  category: string;        // naše kategorie
};

export const transactions: Transaction[] = [
  {
    id: "1",
    ts: "2025-08-01T08:45:00Z",
    amountCZK: -189,
    rawDescription: "McDonald’s #1234 Praha 1",
    merchantNorm: "mcdonalds",
    category: "Jídlo venku",
  },
  {
    id: "2",
    ts: "2025-08-01T17:12:00Z",
    amountCZK: -259,
    rawDescription: "BILLA Praha 6",
    merchantNorm: "billa",
    category: "Potraviny",
  },
  {
    id: "3",
    ts: "2025-08-02T09:00:00Z",
    amountCZK: -399,
    rawDescription: "Spotify",
    merchantNorm: "spotify",
    category: "Předplatné",
  },
  {
    id: "4",
    ts: "2025-08-03T11:20:00Z",
    amountCZK: -1299,
    rawDescription: "Shell Praha 6",
    merchantNorm: "shell",
    category: "Doprava/Palivo",
  },
  {
    id: "5",
    ts: "2025-08-08T07:30:00Z",
    amountCZK: 45000,
    rawDescription: "Výplata",
    merchantNorm: "vyplata",
    category: "Příjem",
  },
];
