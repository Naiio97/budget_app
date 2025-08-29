import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SideNavBar from "@/components/sideNavBar";
import RightRail from "@/components/rightRail";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className="min-h-screen bg-liquid">
        {/* 200px sidebar | obsah | pravý sloupec */}
        <div className="grid grid-cols-[200px_1fr_340px] gap-4 px-4 py-6">
          <SideNavBar />
          <main className="pr-2 space-y-6">{children}</main>
          <RightRail />
        </div>
      </body>
    </html>
  );
}