"use client";
import { useEffect, useMemo, useRef, useState, memo } from "react";
import { formatDateOnly } from "@/lib/dateUtils";
import { TxRow } from "@/types/transactions";
import TransactionCategorySelector from "@/components/TransactionCategorySelector";

const fmtCZK = (n:number)=>new Intl.NumberFormat("cs-CZ",{style:"currency",currency:"CZK"}).format(n); // n je už v korunách

type Mode = "feed" | "compact" | "account" | "account-feed";

const TransactionsFeed = memo(function TransactionsFeed({
  rows = [],
  // feed (scroll/auto-load)
  initialChunk = 100,
  chunk = 50,
  height = 440,
  // compact (dashboard)
  mode = "feed",
  maxRows = 5,
  onTransactionUpdate,
  categories = [],
  onEndReached,
  autoLoadEnabled = true,
}: {
  rows?: TxRow[];
  initialChunk?: number;
  chunk?: number;
  height?: number;
  mode?: Mode;
  maxRows?: number;
  onTransactionUpdate?: (updatedTransaction: TxRow) => void;
  categories?: Array<{ id: string; name: string }>;
  onEndReached?: () => void | Promise<void>;
  autoLoadEnabled?: boolean;
}) {
  const [localRows, setLocalRows] = useState<TxRow[]>(rows);
  
  // Aktualizuj lokální state když se rows změní
  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const sorted = useMemo(() => [...localRows].sort((a,b)=> +new Date(b.ts) - +new Date(a.ts)), [localRows]);
  
  const handleCategoryChange = (transactionId: string, categoryId: string | null, categoryName: string) => {
    // Aktualizuj lokální state
    setLocalRows(prevRows => 
      prevRows.map(tx => 
        tx.id === transactionId 
          ? { ...tx, category: categoryName, categoryId }
          : tx
      )
    );
    
    // Informuj rodičovskou komponentu pokud je callback poskytnut
    if (onTransactionUpdate) {
      const updatedTransaction = localRows.find(tx => tx.id === transactionId);
      if (updatedTransaction) {
        onTransactionUpdate({
          ...updatedTransaction,
          category: categoryName,
          categoryId
        });
      }
    }
  };

  if (mode === "compact") {
    const visible = sorted.slice(0, maxRows);
    return (
      <div className="glass overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white text-[var(--muted)]">
            <tr>
              <th className="text-left px-4 py-2">Datum</th>
              <th className="text-left px-4 py-2">Popis</th>
              <th className="text-left px-4 py-2">Účet</th>
              <th className="text-right px-4 py-2">Částka</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(t=>(
              <tr key={t.id} className="border-t hairline hover:bg-white/50 transition">
                <td className="px-4 py-2">{formatDateOnly(t.ts)}</td>
                <td className="px-4 py-2">{t.rawDescription}</td>
                <td className="px-4 py-2 text-[var(--muted)] text-sm">
                  {t.accountName ? (t.accountDisplayName || t.accountName) : '-'}
                </td>
                <td className={"px-4 py-2 text-right " + (t.amountCZK<0?"text-[color:var(--danger)]":"text-[color:var(--success)]")}>
                  {fmtCZK(t.amountCZK)}
                </td>
              </tr>
            ))}
            {visible.length===0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-[var(--muted)]">Žádné transakce</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (mode === "account") {
    return (
      <div className="glass overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white text-[var(--muted)]">
            <tr>
              <th className="text-left px-4 py-2">Datum</th>
              <th className="text-left px-4 py-2">Popis</th>
              <th className="text-left px-4 py-2">Kategorie</th>
              <th className="text-right px-4 py-2">Částka</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(t=>(
              <tr key={t.id} className="border-t hairline hover:bg-white/50 transition">
                <td className="px-4 py-2">{formatDateOnly(t.ts)}</td>
                <td className="px-4 py-2">{t.rawDescription}</td>
                <td className="px-4 py-2">
                  <TransactionCategorySelector
                    transaction={t}
                    onCategoryChange={handleCategoryChange}
                    categories={categories}
                  />
                </td>
                <td className={"px-4 py-2 text-right " + (t.amountCZK<0?"text-[color:var(--danger)]":"text-[color:var(--success)]")}>
                  {fmtCZK(t.amountCZK)}
                </td>
              </tr>
            ))}
            {sorted.length===0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-[var(--muted)]">Žádné transakce</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // --- ACCOUNT-FEED (stránka účtu s postupné načítáním, bez sloupce účtu) ---
  if (mode === "account-feed") {
    const [limit, setLimit] = useState(Math.min(initialChunk, rows?.length ?? 0));
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const visible = useMemo(()=>sorted.slice(0, limit), [sorted, limit]);
    const hasMore = limit < sorted.length;

    useEffect(()=>{ setLimit(Math.min(initialChunk, rows?.length ?? 0)); }, [rows, initialChunk]);

    useEffect(() => {
      const root = containerRef.current, sentinel = sentinelRef.current;
      if (!root || !sentinel) return;
      const io = new IntersectionObserver((entries)=>{
        const e = entries[0];
        if (!autoLoadEnabled) return;
        if (e.isIntersecting && hasMore && !loading) {
          setLoading(true);
          const maybePromise = onEndReached?.();
          const after = () => { setLimit(p=>Math.min(p+chunk, sorted.length)); setLoading(false); };
          if (maybePromise && typeof (maybePromise as any).then === 'function') {
            (maybePromise as Promise<void>).finally(after);
          } else {
            setTimeout(after, 200);
          }
        }
      }, { root, rootMargin: "120px 0px" });
      io.observe(sentinel);
      return ()=>io.disconnect();
    }, [hasMore, loading, chunk, sorted.length, autoLoadEnabled, onEndReached]);

    return (
      <div className="space-y-3">
        <div  ref={containerRef}
    className="glass overflow-auto hide-scrollbar"
    style={{
      maxHeight: height, // např. 440 px
      height: "auto",    // když méně řádků → menší okno
    }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white border-b hairline shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[var(--muted)]">
              <tr>
                <th className="text-left px-4 py-2">Datum</th>
                <th className="text-left px-4 py-2">Popis</th>
                <th className="text-left px-4 py-2">Kategorie</th>
                <th className="text-right px-4 py-2">Částka</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(t=>(
                <tr key={t.id} className="border-t hairline hover:bg-white/50 transition">
                  <td className="px-4 py-2">{formatDateOnly(t.ts)}</td>
                  <td className="px-4 py-2">{t.rawDescription}</td>
                  <td className="px-4 py-2">
                    <TransactionCategorySelector
                      transaction={t}
                      onCategoryChange={handleCategoryChange}
                      categories={categories}
                    />
                  </td>
                  <td className={"px-4 py-2 text-right " + (t.amountCZK<0?"text-[color:var(--danger)]":"text-[color:var(--success)]")}>
                    {fmtCZK(t.amountCZK)}
                  </td>
                </tr>
              ))}

              {loading && Array.from({length:3}).map((_,i)=>(
                <tr key={`skel-${i}`} className="border-t hairline">
                  <td className="px-4 py-3"><div className="h-4 rounded skel" /></td>
                  <td className="px-4 py-3"><div className="h-4 rounded skel" /></td>
                  <td className="px-4 py-3"><div className="h-4 rounded skel w-24" /></td>
                  <td className="px-4 py-3"><div className="h-4 rounded skel w-20 ml-auto" /></td>
                </tr>
              ))}

              {!hasMore && !loading && visible.length>0 && (
                <tr><td colSpan={4} className="px-4 py-2 text-center text-[13px] text-[var(--muted)]">Vše zobrazeno.</td></tr>
              )}
            </tbody>
          </table>
          
          {/* Sentinel element pro automatické načítání */}
          {hasMore && <div ref={sentinelRef} className="h-4" />}
        </div>
      </div>
    );
  }

  // --- původní FEED (pevné okno + autoload) ---
  const [limit, setLimit] = useState(Math.min(initialChunk, rows?.length ?? 0));
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const visible = useMemo(()=>sorted.slice(0, limit), [sorted, limit]);
  const hasMore = limit < sorted.length;

  useEffect(()=>{ setLimit(Math.min(initialChunk, rows?.length ?? 0)); }, [rows, initialChunk]);

  useEffect(() => {
    const root = containerRef.current, sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const io = new IntersectionObserver((entries)=>{
      const e = entries[0];
      if (!autoLoadEnabled) return;
      if (e.isIntersecting && hasMore && !loading) {
        setLoading(true);
        const maybePromise = onEndReached?.();
        const after = () => { setLimit(p=>Math.min(p+chunk, sorted.length)); setLoading(false); };
        if (maybePromise && typeof (maybePromise as any).then === 'function') {
          (maybePromise as Promise<void>).finally(after);
        } else {
          setTimeout(after, 200);
        }
      }
    }, { root, rootMargin: "120px 0px" });
    io.observe(sentinel);
    return ()=>io.disconnect();
  }, [hasMore, loading, chunk, sorted.length, autoLoadEnabled, onEndReached]);

  return (
    <div className="space-y-3">
      <div  ref={containerRef}
  className="glass overflow-auto hide-scrollbar"
  style={{
    maxHeight: height, // např. 440 px
    height: "auto",    // když méně řádků → menší okno
  }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white border-b hairline shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[var(--muted)]">
            <tr>
              <th className="text-left px-4 py-2">Datum</th>
              <th className="text-left px-4 py-2">Popis</th>
              <th className="text-left px-4 py-2">Účet</th>
              <th className="text-left px-4 py-2">Kategorie</th>
              <th className="text-right px-4 py-2">Částka</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(t=>(
              <tr key={t.id} className="border-t hairline hover:bg-white/50 transition">
                <td className="px-4 py-2">{formatDateOnly(t.ts)}</td>
                <td className="px-4 py-2">{t.rawDescription}</td>
                <td className="px-4 py-2 text-[var(--muted)] text-sm">
                  {t.accountName ? (t.accountDisplayName || t.accountName) : '-'}
                </td>
                <td className="px-4 py-2">
                  <TransactionCategorySelector
                    transaction={t}
                    onCategoryChange={handleCategoryChange}
                    categories={categories}
                  />
                </td>
                <td className={"px-4 py-2 text-right " + (t.amountCZK<0?"text-[color:var(--danger)]":"text-[color:var(--success)]")}>
                  {fmtCZK(t.amountCZK)}
                </td>
              </tr>
            ))}

            {loading && Array.from({length:3}).map((_,i)=>(
              <tr key={`skel-${i}`} className="border-t hairline">
                <td className="px-4 py-3"><div className="h-4 rounded skel" /></td>
                <td className="px-4 py-3"><div className="h-4 rounded skel" /></td>
                <td className="px-4 py-3"><div className="h-4 rounded skel w-20" /></td>
                <td className="px-4 py-3"><div className="h-4 rounded skel w-24" /></td>
                <td className="px-4 py-3"><div className="h-4 rounded skel w-20 ml-auto" /></td>
              </tr>
            ))}

            

            {!hasMore && !loading && visible.length>0 && (
              <tr><td colSpan={5} className="px-4 py-2 text-center text-[13px] text-[var(--muted)]">Vše zobrazeno.</td></tr>
            )}
          </tbody>
        </table>
        
        {/* Sentinel element pro automatické načítání */}
        {hasMore && <div ref={sentinelRef} className="h-4" />}
      </div>
    </div>
  );
});

export default TransactionsFeed;
