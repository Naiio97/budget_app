import { prisma } from "@/lib/prisma";

const BASE = "https://live.trading212.com";

async function t212(path: string, apiKey: string) {
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Authorization": apiKey,
    "api-key": apiKey,
    "X-API-Key": apiKey,
  };
  const res = await fetch(`${BASE}${path}`, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`T212 ${res.status}`);
  return res.json();
}

export async function runT212Sync(apiKey: string) {
  const [portfolio, cashResp] = await Promise.all([
    t212('/api/v0/equity/portfolio', apiKey),
    t212('/api/v0/equity/account/cash', apiKey).catch(()=>null)
  ]);

  const positions = Array.isArray(portfolio) ? portfolio : (portfolio?.positions || []);
  for (const p of positions) {
    const id = String(p.ticker || p.symbol || p.id);
    if (!id) continue;
    await prisma.t212Position.upsert({
      where: { id },
      create: {
        id,
        ticker: id,
        quantity: Number(p.quantity || 0),
        avgPrice: Number(p.averagePrice || p.avgPrice || 0),
        curPrice: Number(p.currentPrice || p.price || 0),
        ppl: Number(p.ppl || p.unrealizedPnl || 0),
        currency: String(p.currency || 'EUR'),
      },
      update: {
        quantity: Number(p.quantity || 0),
        avgPrice: Number(p.averagePrice || p.avgPrice || 0),
        curPrice: Number(p.currentPrice || p.price || 0),
        ppl: Number(p.ppl || p.unrealizedPnl || 0),
        currency: String(p.currency || 'EUR'),
      },
    });
  }

  if (cashResp) {
    let amount = 0; let currency = 'EUR';
    if (typeof cashResp === 'number') amount = cashResp;
    if (cashResp && typeof cashResp === 'object') {
      if (typeof cashResp.cash === 'number') amount = cashResp.cash;
      else if (cashResp.cash && typeof cashResp.cash === 'object') {
        const entries = Object.entries(cashResp.cash as Record<string, number>);
        if (entries.length) { const [cur, val] = entries[0]; currency = cur; amount = Number(val)||0; }
      }
      if (typeof cashResp.currencyCode === 'string') currency = cashResp.currencyCode;
    }
    await prisma.t212Cash.upsert({ where: { id: 't212-cash' }, create: { id: 't212-cash', amount, currency }, update: { amount, currency } });
  }

  const dbPositions = await prisma.t212Position.findMany();
  const totalPositions = dbPositions.reduce((s,p)=> s + p.curPrice * p.quantity, 0);
  const cash = await prisma.t212Cash.findUnique({ where: { id: 't212-cash' } });
  const total = totalPositions + (cash?.amount || 0);
  const today = new Date(); const id = today.toISOString().slice(0,10).replace(/-/g,'');
  await prisma.t212Snapshot.upsert({ where: { id }, create: { id, total, currency: cash?.currency || 'EUR' }, update: { total, currency: cash?.currency || 'EUR' } });

  return { total };
}


