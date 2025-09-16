// app/accounts/[id]/page.tsx
import { notFound } from "next/navigation";
import AccountDetailClient from "../../../components/AccountDetailClient";
import { prisma } from "@/lib/prisma";
import { TxRow } from "@/types/transactions";

type Account = {
  id: string;
  provider: string;
  accountName: string;
  customName?: string | null;
  asOf: string; // ISO
  connectionId?: string | null;
  balanceCZK: number;
  // ... případně další pole (currency apod.)
};

export default async function AccountDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const account = await (prisma as any).account.findUnique({
    where: { id },
    select: {
      id: true,
      provider: true,
      accountName: true,
      customName: true,
      asOf: true,
      connectionId: true,
      isVisible: true,
      balanceCZK: true,
    },
  });

  if (!account || account.isVisible === false) {
    notFound();
  }

  const categories = await (prisma as any).category.findMany({ orderBy: { name: "asc" } });

  const accounts = await (prisma as any).account.findMany({
    where: { isVisible: { not: false } },
    select: { id: true, accountName: true, provider: true, customName: true },
    orderBy: [{ provider: "asc" }, { accountName: "asc" }],
  });

  const txs = await (prisma as any).transaction.findMany({
    where: { accountId: id },
    include: { category: true },
    orderBy: { ts: "desc" },
  });

  const rows: TxRow[] = (txs as Array<any>).map((t: any) => ({
    id: t.id,
    ts: t.ts.toISOString(),
    rawDescription: t.rawDescription,
    category: t.category?.name ?? "",
    categoryId: t.categoryId ?? null,
    amountCZK: t.amountCZK,
  }));

  const accForClient: Account = {
    id: account.id,
    provider: account.provider,
    accountName: account.accountName,
    customName: account.customName,
    asOf: (account.asOf as Date).toISOString(),
    connectionId: account.connectionId,
    balanceCZK: account.balanceCZK,
  };

  const categoriesForClient = (categories as Array<any>).map((c: any) => ({ id: c.id, name: c.name }));

  const accountsForClient = (accounts as Array<any>).map((a: any) => ({
    id: a.id,
    accountName: a.accountName,
    provider: a.provider,
    customName: a.customName,
  }));

  return (
    <AccountDetailClient
      account={accForClient}
      transactions={rows}
      categories={categoriesForClient}
      accounts={accountsForClient}
    />
  );
}
