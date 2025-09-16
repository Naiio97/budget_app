import { prisma } from "@/lib/prisma";
import SettingsClient from "../../components/SettingsClient";

export default async function SettingsPage() {
  const accounts = await (prisma as any).account.findMany({
    include: { institution: { select: { logo: true } } },
    orderBy: [{ provider: "asc" }, { accountName: "asc" }],
  });
  const categories = await (prisma as any).category.findMany({ orderBy: { name: "asc" }, include: { group: true } });

  const accountsForClient = (accounts as Array<any>).map((a: any) => ({
    id: a.id,
    provider: a.provider,
    accountName: a.accountName,
    balanceCZK: a.balanceCZK,
    asOf: (a.asOf as Date).toISOString(),
    connectionId: a.connectionId,
    isVisible: a.isVisible,
    customName: a.customName,
    institutionLogo: a.institution?.logo || null,
  }));

  const categoriesForClient = (categories as Array<any>).map((c: any) => ({ id: c.id, name: c.name, groupId: c.groupId ?? null, groupName: c.group?.name ?? null }));

  return <SettingsClient initialAccounts={accountsForClient} initialCategories={categoriesForClient} />;
}
