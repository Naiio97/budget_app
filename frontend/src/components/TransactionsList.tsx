"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatDateOnly } from "@/lib/dateUtils";
import { TxRow } from "@/types/transactions";
import TransactionCategorySelector from "@/components/TransactionCategorySelector";

const fmtCZK = (n:number)=>new Intl.NumberFormat("cs-CZ",{style:"currency",currency:"CZK"}).format(n);

export default function TransactionsList({
  rows,
  height = 520,
  categories = [],
  autoLoadEnabled = true,
  onLoadMore,
  isLoadingMore = false,
  skeletonCount = 3,
  rowsPerPage = 10,
  fitViewport = true,
  reserveBottom = 64,
  hasMore = true,
  showLoadMoreButton = false,
  loadMoreLabel = "Načíst další",
  loadingLabel = "Načítám…",
}: {
  rows: TxRow[];
  height?: number;
  categories?: Array<{ id: string; name: string }>;
  autoLoadEnabled?: boolean;
  onLoadMore?: () => void | Promise<void>;
  isLoadingMore?: boolean;
  skeletonCount?: number;
  rowsPerPage?: number;
  fitViewport?: boolean;
  reserveBottom?: number;
  hasMore?: boolean;
  showLoadMoreButton?: boolean;
  loadMoreLabel?: string;
  loadingLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [scrollbarPad, setScrollbarPad] = useState(0);
  const headerRef = useRef<HTMLTableSectionElement | null>(null);
  const firstRowRef = useRef<HTMLTableRowElement | null>(null);
  const [computedHeight, setComputedHeight] = useState<number | null>(null);

  // Seřazeno podle data (nové první)
  const sorted = useMemo(() => [...rows].sort((a,b)=> +new Date(b.ts) - +new Date(a.ts)), [rows]);

  // Autoload na konci seznamu (v rámci scrollovatelného okna)
  useEffect(() => {
    const root = containerRef.current, sentinel = sentinelRef.current;
    if (!root || !sentinel || !autoLoadEnabled || hasMore === false) return;
    const io = new IntersectionObserver((entries)=>{
      const e = entries[0];
      if (!e.isIntersecting) return;
      const r = onLoadMore?.();
      if (r && typeof (r as any).then === "function") {
        (r as Promise<void>).catch(()=>{});
      }
    }, { root, rootMargin: "160px 0px" });
    io.observe(sentinel);
    return ()=>io.disconnect();
  }, [autoLoadEnabled, onLoadMore, hasMore]);

  // Rezervace místa pro scrollbar (stabilní šířka, bez cuknutí)
  const recomputeScrollbar = () => {
    const el = containerRef.current;
    if (!el) return;
    const pad = el.offsetWidth - el.clientWidth;
    setScrollbarPad(pad > 0 ? pad : 0);
  };
  useLayoutEffect(() => {
    recomputeScrollbar();
  }, []);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => recomputeScrollbar());
    ro.observe(el);
    window.addEventListener('resize', recomputeScrollbar);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recomputeScrollbar);
    };
  }, []);

  // Dynamická výška: přesně N řádků + hlavička, případně omezit na viewport
  const recomputeHeight = () => {
    const headerEl = headerRef.current as HTMLElement | null;
    const rowEl = firstRowRef.current as HTMLElement | null;
    const containerEl = containerRef.current as HTMLElement | null;
    const headerH = headerEl?.getBoundingClientRect().height || 40;
    const rowH = rowEl?.getBoundingClientRect().height || 48;
    let desired = Math.ceil(headerH + rowsPerPage * rowH + 2);

    if (fitViewport && containerEl) {
      const top = containerEl.getBoundingClientRect().top;
      const available = Math.max(200, Math.floor(window.innerHeight - top - reserveBottom));
      desired = Math.min(desired, available);
    }
    setComputedHeight(desired);
  };

  useLayoutEffect(() => {
    recomputeHeight();
    // také po krátké prodlevě kvůli renderu fontů/layoutu
    const t = setTimeout(recomputeHeight, 50);
    return () => clearTimeout(t);
  }, [rows.length, rowsPerPage, fitViewport]);
  useEffect(() => {
    const onResize = () => recomputeHeight();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleLoadMoreClick = () => {
    if (isLoadingMore) return;
    onLoadMore?.();
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="glass overflow-y-scroll overflow-x-hidden hide-scrollbar"
        style={{ maxHeight: computedHeight ?? height, height: computedHeight ?? height, paddingRight: scrollbarPad, boxSizing: "content-box" as any }}
      >
        <table className="w-full text-sm table-fixed">
          <thead ref={headerRef} className="sticky top-0 z-10 bg-white border-b hairline shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[var(--muted)]">
            <tr>
              <th className="text-left px-4 py-2">Datum</th>
              <th className="text-left px-4 py-2">Popis</th>
              <th className="text-left px-4 py-2">Kategorie</th>
              <th className="text-right px-4 py-2">Částka</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, idx) => (
              <tr ref={idx === 0 ? firstRowRef : undefined} key={t.id} className="border-t hairline hover:bg-white/50 transition will-change-transform animate-[fadeIn_200ms_ease]">
                <td className="px-4 py-2 align-top whitespace-nowrap">{formatDateOnly(t.ts)}</td>
                <td className="px-4 py-2 align-top">
                  <div className="font-medium text-[13px] truncate">{t.rawDescription}</div>
                  {t.accountDisplayName && (
                    <div className="text-[11px] text-[var(--muted)] truncate">{t.accountDisplayName}</div>
                  )}
                </td>
                <td className="px-4 py-2 align-top">
                  <TransactionCategorySelector transaction={t} categories={categories} />
                </td>
                <td className={"px-4 py-2 align-top text-right " + (t.amountCZK<0?"text-[color:var(--danger)]":"text-[color:var(--success)]")}>
                  {fmtCZK(t.amountCZK)}
                </td>
              </tr>
            ))}

            {isLoadingMore && Array.from({ length: skeletonCount }).map((_, i) => (
              <tr key={`skel-${i}`} className="border-t hairline">
                <td className="px-4 py-3"><div className="h-4 rounded skel" /></td>
                <td className="px-4 py-3"><div className="h-4 rounded skel w-48" /><div className="h-3 rounded skel w-24 mt-1" /></td>
                <td className="px-4 py-3"><div className="h-4 rounded skel w-24" /></td>
                <td className="px-4 py-3"><div className="h-4 rounded skel w-20 ml-auto" /></td>
              </tr>
            ))}
            <tr>
              <td colSpan={4}>
                {autoLoadEnabled && (hasMore ?? true) && <div ref={sentinelRef} />}
              </td>
            </tr>
          </tbody>
          {/* Sticky footer odstraněn, tlačítko je mimo scroll box */}
        </table>
      </div>
      {showLoadMoreButton && (hasMore ?? true) && (
        <div className="pt-2">
          <button
            onClick={handleLoadMoreClick}
            disabled={isLoadingMore}
            className="mx-auto block px-2 py-1 rounded text-[13px] text-[var(--muted)] bg-transparent hover:bg-black/5 transition disabled:opacity-50"
          >
            {isLoadingMore ? loadingLabel : loadMoreLabel}
          </button>
        </div>
      )}
    </div>
  );
}


