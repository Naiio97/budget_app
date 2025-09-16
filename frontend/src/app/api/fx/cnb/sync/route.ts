import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CNB open data: daily exchange rates – use latest endpoint
const CNB_BASE = 'https://api.cnb.cz';

async function fetchLatest() {
  // CNB: daily rates; lang EN for stable keys; some mirrors use different keys
  const url = `${CNB_BASE}/cnbapi/exrates/daily?lang=EN`;
  const res = await fetch(url, { cache: 'no-store', headers: { 'accept': 'application/json' } });
  if (!res.ok) throw new Error(`CNB ${res.status}`);
  return res.json();
}

export async function POST(_req: NextRequest) {
  try {
    const data = await fetchLatest();
    // Normalize response
    const rawRates: any[] = Array.isArray(data?.rates) ? data.rates : (Array.isArray(data) ? data : []);
    let dateIso: string | null = (data?.date || data?.validFor || data?.enforcedDate || null);
    if (!dateIso) dateIso = new Date().toISOString().slice(0,10);
    const dateStr: string = dateIso.replace(/-/g,'');

    for (const r of rawRates) {
      const code: string | undefined = r?.code || r?.currencyCode || r?.isoCode || r?.Code;
      if (!code) continue;
      const amountRaw = r?.amount ?? r?.unit ?? 1;
      const rateRaw = r?.rate ?? r?.mid ?? r?.fx ?? r?.Rate;
      const amount = Number(String(amountRaw).replace(',', '.')) || 1;
      const rate = Number(String(rateRaw).replace(',', '.'));
      if (!Number.isFinite(rate)) continue;
      const id = `${dateStr}-${code}`;
      await prisma.fxRate.upsert({
        where: { id },
        create: { id, date: dateStr, currency: String(code), amount, rate },
        update: { amount, rate },
      });
    }
    return NextResponse.json({ ok: true, date: dateStr, count: list.length });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'CNB sync error' }, { status: 500 });
  }
}


