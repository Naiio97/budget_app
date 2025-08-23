import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className="min-h-screen bg-liquid">
        <div className="safe py-6 md:py-8 space-y-6">
          {/* Toolbar */}
          <div className="glass px-4 py-3 md:px-5 md:py-4 flex items-center justify-between">
            <div className="text-lg font-semibold tracking-tight">💰 Budget</div>
            <div className="flex items-center gap-2">
              <input
                placeholder="Hledat…"
                className="bg-transparent outline-none text-sm placeholder-[var(--muted)]"
              />
              <button
                className="px-3 py-2 rounded-xl text-white font-medium transition hover:opacity-95 active:scale-[.99]"
                style={{ background: "linear-gradient(135deg,#007aff,#5ac8fa)" }}
              >
                Import CSV
              </button>
            </div>
          </div>

          {children}
        </div>
      </body>
    </html>
  );
}