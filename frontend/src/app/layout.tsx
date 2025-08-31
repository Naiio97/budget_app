// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import SideNavBar from "@/components/sideNavBar";
import RightRail from "@/components/rightRail";

export const metadata: Metadata = {
  title: "Budget App",
  description: "Osobní rozpočet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" suppressHydrationWarning>
      {/* stránka se scrolluje CELÁ jako jeden proud */}
      <body className="bg-liquid overflow-y-auto">
        {/* žádný sticky ani fixní výšky na sloupcích */}
        <div className="grid grid-cols-[220px_1fr_300px] gap-4 px-4 py-6 items-start">
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
              <RightRail />
            </div>
          </aside>
        </div>
      </body>
    </html>
  );
}
