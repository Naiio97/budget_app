import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AccountsRedirectPage() {
  const accounts = await (prisma as any).account.findMany({
    where: { isVisible: { not: false } },
    select: { id: true, connectionId: true },
    orderBy: [{ provider: "asc" }, { accountName: "asc" }],
  });

  if (!accounts || accounts.length === 0) {
    // žádný účet → přesměrujeme na /settings (nebo home)
    redirect("/");
  }

  const synced = accounts.find((a: any) => !!a.connectionId);
  const target = synced?.id || accounts[0].id;
  redirect(`/accounts/${target}`);
}