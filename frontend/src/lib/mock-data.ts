export type Transaction = {
  id: string;
  ts: string;
  amountCZK: number;
  rawDescription: string;
  merchantNorm: string;
  category: string;
  accountId: string;
};

export const transactions: Transaction[] = [
  // Air Bank (air-1)
  { id: "1", ts: "2025-08-01T08:45:00Z", amountCZK: -189, rawDescription: "McDonald’s #1234 Praha 1", merchantNorm: "mcdonalds", category: "Jídlo venku", accountId: "air-1" },
  { id: "2", ts: "2025-08-01T17:12:00Z", amountCZK: -259, rawDescription: "BILLA Praha 6", merchantNorm: "billa", category: "Potraviny", accountId: "air-1" },
  { id: "6", ts: "2025-08-05T15:30:00Z", amountCZK: -850, rawDescription: "Mall.cz – sluchátka", merchantNorm: "mall", category: "Elektronika", accountId: "air-1" },
  { id: "7", ts: "2025-08-07T09:10:00Z", amountCZK: 1500, rawDescription: "Prodej věcí na Vinted", merchantNorm: "vinted", category: "Příjem", accountId: "air-1" },
  { id: "8", ts: "2025-08-09T11:40:00Z", amountCZK: -75, rawDescription: "Starbucks Dejvická", merchantNorm: "starbucks", category: "Káva", accountId: "air-1" },
  { id: "9", ts: "2025-08-10T16:20:00Z", amountCZK: -1200, rawDescription: "České dráhy – jízdenky", merchantNorm: "cd", category: "Doprava", accountId: "air-1" },
  { id: "10", ts: "2025-08-12T18:00:00Z", amountCZK: -350, rawDescription: "Albert – nákup", merchantNorm: "albert", category: "Potraviny", accountId: "air-1" },

  // Revolut (rev-1)
  { id: "3", ts: "2025-08-02T09:00:00Z", amountCZK: -399, rawDescription: "Spotify", merchantNorm: "spotify", category: "Předplatné", accountId: "rev-1" },
  { id: "11", ts: "2025-08-04T07:50:00Z", amountCZK: -250, rawDescription: "Uber Praha", merchantNorm: "uber", category: "Doprava", accountId: "rev-1" },
  { id: "12", ts: "2025-08-06T20:30:00Z", amountCZK: -1450, rawDescription: "Booking.com – hotel Brno", merchantNorm: "booking", category: "Cestování", accountId: "rev-1" },
  { id: "13", ts: "2025-08-08T13:25:00Z", amountCZK: 5000, rawDescription: "Převod od kamaráda", merchantNorm: "transfer", category: "Příjem", accountId: "rev-1" },
  { id: "14", ts: "2025-08-11T08:00:00Z", amountCZK: -199, rawDescription: "Netflix", merchantNorm: "netflix", category: "Předplatné", accountId: "rev-1" },
  { id: "15", ts: "2025-08-14T19:10:00Z", amountCZK: -620, rawDescription: "KFC Anděl", merchantNorm: "kfc", category: "Jídlo venku", accountId: "rev-1" },
  { id: "16", ts: "2025-08-15T10:05:00Z", amountCZK: -2100, rawDescription: "IKEA – nábytek", merchantNorm: "ikea", category: "Domácnost", accountId: "rev-1" },

  // PPF Banka (ppf-1)
  { id: "4", ts: "2025-08-03T11:20:00Z", amountCZK: -1299, rawDescription: "Shell Praha 6", merchantNorm: "shell", category: "Doprava/Palivo", accountId: "ppf-1" },
  { id: "17", ts: "2025-08-05T14:00:00Z", amountCZK: -3000, rawDescription: "Datart – televize", merchantNorm: "datart", category: "Elektronika", accountId: "ppf-1" },
  { id: "18", ts: "2025-08-07T09:45:00Z", amountCZK: 20000, rawDescription: "Prodej akcií", merchantNorm: "broker", category: "Investice", accountId: "ppf-1" },
  { id: "19", ts: "2025-08-09T12:30:00Z", amountCZK: -870, rawDescription: "Hospoda U Fleků", merchantNorm: "hospoda", category: "Jídlo venku", accountId: "ppf-1" },
  { id: "20", ts: "2025-08-11T15:20:00Z", amountCZK: -560, rawDescription: "ČEZ – elektřina", merchantNorm: "cez", category: "Služby", accountId: "ppf-1" },
  { id: "21", ts: "2025-08-13T18:40:00Z", amountCZK: -1250, rawDescription: "T-Mobile", merchantNorm: "tmo", category: "Služby", accountId: "ppf-1" },
  { id: "22", ts: "2025-08-16T09:15:00Z", amountCZK: -450, rawDescription: "Kino Světozor", merchantNorm: "kino", category: "Zábava", accountId: "ppf-1" },

  // Česká spořitelna (cs-1)
  { id: "5", ts: "2025-08-08T07:30:00Z", amountCZK: 45000, rawDescription: "Výplata", merchantNorm: "vyplata", category: "Příjem", accountId: "cs-1" },
  { id: "23", ts: "2025-08-09T14:00:00Z", amountCZK: -4200, rawDescription: "Nájem", merchantNorm: "najmy", category: "Bydlení", accountId: "cs-1" },
  { id: "24", ts: "2025-08-10T08:20:00Z", amountCZK: -890, rawDescription: "DM drogerie", merchantNorm: "dm", category: "Drogerie", accountId: "cs-1" },
  { id: "25", ts: "2025-08-12T13:10:00Z", amountCZK: -270, rawDescription: "Bageterie Boulevard", merchantNorm: "bageterie", category: "Jídlo venku", accountId: "cs-1" },
  { id: "26", ts: "2025-08-14T17:50:00Z", amountCZK: -3500, rawDescription: "Zubař", merchantNorm: "zubar", category: "Zdraví", accountId: "cs-1" },
  { id: "27", ts: "2025-08-15T20:40:00Z", amountCZK: -149, rawDescription: "Apple App Store", merchantNorm: "apple", category: "Předplatné", accountId: "cs-1" },
  { id: "28", ts: "2025-08-16T07:55:00Z", amountCZK: 1200, rawDescription: "Vrácení přeplatku energií", merchantNorm: "cez", category: "Příjem", accountId: "cs-1" },
  { id: "29", ts: "2025-08-18T09:35:00Z", amountCZK: -650, rawDescription: "Tesco Express", merchantNorm: "tesco", category: "Potraviny", accountId: "cs-1" },
  { id: "30", ts: "2025-08-19T19:05:00Z", amountCZK: -2100, rawDescription: "Lekarna.cz", merchantNorm: "lekarna", category: "Zdraví", accountId: "cs-1" },
];
