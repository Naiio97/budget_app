import { prisma } from "@/lib/prisma";
import TransactionsClient from "../../components/TransactionsClient";

export default async function TransactionsPage() {
  const accounts = await (prisma as any).account.findMany({
    where: { isVisible: { not: false } },
    orderBy: [{ provider: "asc" }, { accountName: "asc" }],
  });
  const categories = await (prisma as any).category.findMany({ orderBy: { name: "asc" } });
  const txs = await (prisma as any).transaction.findMany({
    where: { account: { isVisible: { not: false } } },
    include: { account: true, category: true },
    orderBy: { ts: "desc" },
  });

  const rows = (txs as Array<any>).map((t: any) => ({
    id: t.id,
    ts: t.ts.toISOString(),
    rawDescription: t.rawDescription,
    category: t.category?.name ?? "",
    categoryId: t.categoryId ?? null,
    amountCZK: t.amountCZK,
    accountName: t.account.id,
    accountProvider: t.account.provider,
    accountDisplayName: t.account.customName || t.account.accountName,
  }));

  const accountsForClient = (accounts as Array<any>).map((a: any) => ({
    id: a.id,
    accountName: a.accountName,
    provider: a.provider,
    customName: a.customName,
  }));

  const categoriesForClient = (categories as Array<any>).map((c: any) => ({ id: c.id, name: c.name }));

  return <TransactionsClient initialTransactions={rows} initialAccounts={accountsForClient} initialCategories={categoriesForClient} />;
}