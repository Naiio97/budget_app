"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transakce" },
  { href: "/rules", label: "Pravidla" },
  { href: "/categories", label: "Kategorie" },
  { href: "/settings", label: "Nastavení" },
];

export default function SideNavBar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block sticky top-0 h-dvh px-2">
      <div className="h-full p-2 w-[184px]">
        <div className="text-base font-semibold tracking-tight px-2 py-1 mb-2">💰 Budget</div>
        <nav className="space-y-1">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`block px-3 py-2 rounded-xl text-sm transition
                  ${active ? "glass" : "hover:bg-black/5"}`}
                aria-current={active ? "page" : undefined}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}