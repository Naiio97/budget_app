"use client";

import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { usePathname, useParams } from "next/navigation";
//import { accounts, getPrimaryId } from "@/lib/accounts";

const fmt = (n: number) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(n);

const res = await fetch("http://localhost:3000/api/accounts", {
  cache: "no-store",
});
const accounts = await res.json();
console.log(accounts);

export default function RightRail() {
  const pathname = usePathname();
  const params = useParams() as { id?: string };
  const currentId = params?.id;
  const [primaryId, setPrimaryId] = useState<string | null>(null);

  useEffect(() => setPrimaryId(getPrimaryId()), []);
  const total = useMemo(() => accounts.reduce((a, b) => a + b.balanceCZK, 0), []);

  return (
    <aside className="sticky top-0 flex flex-col gap-4">
      {/* Celkový součet */}
      <div className="glass p-5">
        <div className="text-[13px] mb-1 text-[var(--muted)]">Celkem na účtech</div>
        <div className="text-3xl font-semibold tracking-tight">{fmt(total)}</div>
      </div>

      {/* Jednotlivé účty */}
      {accounts.map((acc) => {
        const href = `/accounts/${acc.id}`;
        const isActive = currentId ? acc.id === currentId : pathname?.startsWith(href);
        const isPrimary = primaryId === acc.id;

        return (
          <Link
            key={acc.id}
            href={href}
            className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
          >
            <div
              className={[
                "relative glass p-6 rounded-2xl transition-[transform,box-shadow,ring] overflow-hidden",
                "hover:scale-[1.01]",
                isActive
                  ? "ring-1 ring-[var(--accent)]/35 shadow-[0_8px_28px_rgba(0,122,255,0.16)]"
                  : "",
              ].join(" ")}
            >
              {/* Akcentní lišta vlevo */}
              {isActive && (
                <span
                  className="pointer-events-none absolute top-0 left-[-1px] h-full w-[9px]
                             bg-[linear-gradient(180deg,#007aff,#5ac8fa)]"
                />
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">{acc.provider}</div>
                  {isPrimary && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      aria-label="Hlavní účet"
                    >
                      <path
                        d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21 12 17.27Z"
                        fill="var(--accent)"
                        stroke="var(--accent)"
                        strokeWidth="1.2"
                      />
                    </svg>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-base font-semibold">{fmt(acc.balanceCZK)}</div>
                  <div className="text-[13px] text-[var(--muted)]">
                    {new Date(acc.asOf).toLocaleString("cs-CZ")}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </aside>
  );
}