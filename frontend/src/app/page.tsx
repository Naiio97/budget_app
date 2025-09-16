import { prisma } from "@/lib/prisma";
import DashboardClient from "../components/DashboardClient";

export default async function Page() {
  // Načti účty (jen viditelné)
  const accounts = await (prisma as any).account.findMany({
    where: { isVisible: { not: false } },
    include: {
      institution: { select: { logo: true } },
    },
    orderBy: [{ provider: "asc" }, { accountName: "asc" }],
  });

  // Načti kategorie
  const categories = await (prisma as any).category.findMany({
    orderBy: { name: "asc" },
  });

  // Načti transakce pro všechny viditelné účty
  const transactions = await (prisma as any).transaction.findMany({
    where: { account: { isVisible: { not: false } } },
    include: { account: true, category: true },
    orderBy: { ts: "desc" },
  });

  // Trading 212 total (positions + cash) converted do CZK podle posledních kurzů
  let tradingTotalCZK = 0;
  try {
    const [positions, cash, latestFx] = await Promise.all([
      (prisma as any).t212Position.findMany().catch(() => []),
      (prisma as any).t212Cash.findUnique({ where: { id: "t212-cash" } }).catch(() => null),
      (prisma as any).fxRate.findFirst({ orderBy: { date: "desc" } }).catch(() => null),
    ]);
    let fxMap: Record<string, { amount: number; rate: number }> = {};
    if (latestFx?.date) {
      const fxList = await (prisma as any).fxRate.findMany({ where: { date: latestFx.date } }).catch(() => []);
      fxMap = Object.fromEntries((fxList as Array<any>).map(r => [r.currency, { amount: r.amount, rate: r.rate }]));
      fxMap["CZK"] = { amount: 1, rate: 1 };
    }
    const convert = (value: number, currency: string) => {
      const r = fxMap[currency];
      if (!r) return 0;
      return (value / r.amount) * r.rate;
    };
    const posCZK = (positions as Array<any>).reduce((s, p) => s + convert((p.curPrice || 0) * (p.quantity || 0), String(p.currency || "EUR")), 0);
    const cashCZK = cash ? convert(Number(cash.amount || 0), String(cash.currency || "EUR")) : 0;
    tradingTotalCZK = Math.round(posCZK + cashCZK);
  } catch {
    tradingTotalCZK = 0;
  }

  // Namapuj na TxRow
  const rows = (transactions as Array<any>).map((t: any) => ({
    id: t.id,
    ts: t.ts.toISOString(),
    rawDescription: t.rawDescription,
    category: t.category?.name ?? "",
    categoryId: t.categoryId ?? null,
    amountCZK: t.amountCZK,
    accountName: t.account.accountName,
    accountProvider: t.account.provider,
    accountDisplayName: t.account.customName || t.account.accountName,
  }));

  const accountsForClient = (accounts as Array<any>).map((a: any) => ({
    id: a.id,
    accountName: a.accountName,
    provider: a.provider,
    balanceCZK: a.balanceCZK,
    customName: a.customName,
    isVisible: a.isVisible,
    institutionLogo: a.institution?.logo || null,
  }));

  const categoriesForClient = (categories as Array<any>).map((c: any) => ({ id: c.id, name: c.name }));

  return (
    <DashboardClient
      accounts={accountsForClient}
      transactions={rows}
      categories={categoriesForClient}
      tradingTotalCZK={tradingTotalCZK}
    />
  );
}
