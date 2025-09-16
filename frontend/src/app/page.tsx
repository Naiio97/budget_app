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
    />
  );
}
