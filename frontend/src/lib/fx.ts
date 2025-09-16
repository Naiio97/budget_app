export type FxMap = Record<string, { amount: number; rate: number }>;

export function buildFxMap(rates: Array<{ currency: string; amount: number; rate: number }>): FxMap {
  const map: FxMap = {};
  for (const r of rates) map[r.currency] = { amount: r.amount, rate: r.rate };
  map['CZK'] = { amount: 1, rate: 1 };
  return map;
}

// convert from currency -> CZK
export function toCZK(value: number, currency: string, fx: FxMap): number {
  const r = fx[currency];
  if (!r) return NaN;
  return (value / r.amount) * r.rate;
}


