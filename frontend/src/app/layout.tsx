// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import SideNavBar from "@/components/sideNavBar";
import RightRail from "@/components/rightRail";
import { prisma } from "@/lib/prisma";
import Toaster from "@/components/Toaster";

export const metadata: Metadata = {
  title: "Budget App",
  description: "Osobní rozpočet",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const accounts = await (prisma as any).account.findMany({
    where: { isVisible: { not: false } },
    include: { institution: { select: { logo: true } } },
    orderBy: [{ provider: "asc" }, { accountName: "asc" }],
  });

  const accountsForClient = (accounts as Array<any>).map((a: any) => ({
    id: a.id,
    provider: a.provider,
    accountName: a.accountName,
    customName: a.customName,
    currency: a.currency,
    iban: a.iban,
    balanceCZK: a.balanceCZK,
    asOf: (a.asOf as Date).toISOString(),
    connectionId: a.connectionId,
    institutionLogo: a.institution?.logo || null,
  }));
  return (
    <html lang="cs" suppressHydrationWarning>
      {/* stránka se scrolluje CELÁ jako jeden proud */}
      <body className="bg-liquid overflow-y-hidden">
        {/* žádný sticky ani fixní výšky na sloupcích */}
        <div className="grid grid-cols-[220px_1fr_300px] gap-4 px-4 py-6 items-start min-h-screen">
          <aside>
            {/* jen vizuální „sloupec“, bez scrollu a bez sticky */}
            <div className="p-2 rounded-2xl min-h-[calc(100dvh-48px)]">
              <SideNavBar />
            </div>
          </aside>

          <main className="space-y-6">
            {children}
          </main>

          <aside>
            <div className="space-y-4">
              <RightRail accounts={accountsForClient} />
            </div>
          </aside>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
