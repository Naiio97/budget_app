export const categories = [
  "Jídlo",
  "Zábava",
  "Zdraví",
  "Nákupy",
  "Cestování",
  "Zábava",
  "Investice",
  "Příjmy",
  "Domácnost",
  "Káva",
  "Služby",
  "Drogerie",
  "Bydlení",
  "Jídlo venku",
  "Předplatné",
  "Doprava/Palivo",
  "Sport",
  "Other",
] as const;

export type CategoryName = typeof categories[number];

export const categoryId = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-");