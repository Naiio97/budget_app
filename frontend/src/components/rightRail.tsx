"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getPrimaryId, onPrimaryIdChange } from "@/lib/primary-account";
import { formatDateOnly } from "@/lib/dateUtils";
import { getAccountDisplayName, type Account } from "@/lib/accountUtils";
import SyncAllButton from "@/components/SyncAllButton";
import { useRouter as useNav } from "next/navigation";
import { buildFxMap, toCZK } from "@/lib/fx";


export default function RightRail({ accounts }: { accounts: Account[] }) {
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [hasRealAccounts, setHasRealAccounts] = useState(false);
  const router = useRouter();
  const nav = useNav();

  // Zkontroluj, jestli jsou tam skutečné napojené účty
  useEffect(() => {
    if (accounts.length > 0) {
      const realAccounts = accounts.filter((acc: Account) => acc.connectionId);
      setHasRealAccounts(realAccounts.length > 0);
    }
  }, [accounts]);

  // Sledování změn účtů z AccountManagement
  useEffect(() => {
    const handleAccountUpdate = (event: CustomEvent) => {
      const { accountId, isVisible, customName } = event.detail;
      
      // Viditelnost se řeší přes cache refresh v useAccounts hooku
      if (isVisible !== undefined) {
        console.log("Změna viditelnosti účtu:", accountId, isVisible);
        return;
      }
      
      // Pro změny názvu se cache obnoví automaticky
      if (customName !== undefined) {
        console.log("Změna názvu účtu:", accountId, customName);
      }
    };

    const handleSyncComplete = () => {
      console.log("Sync dokončen, cache se obnoví automaticky");
    };

    window.addEventListener('account-updated', handleAccountUpdate as EventListener);
    window.addEventListener('sync-complete', handleSyncComplete);
    
    return () => {
      window.removeEventListener('account-updated', handleAccountUpdate as EventListener);
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  }, []);

  // Sledování změn hlavního účtu
  useEffect(() => {
    setPrimaryId(getPrimaryId());
    
    const unsubscribe = onPrimaryIdChange((id) => {
      setPrimaryId(id);
    });

    return unsubscribe;
  }, []);

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
    }).format(balance); // balance je už v korunách
  };

  // formatDate funkce je nyní nahrazena importovanou formatDateOnly

  const handleAccountClick = (accountId: string) => {
    router.push(`/accounts/${accountId}`);
  };

  const handleConnectBank = () => {
    router.push("/connect");
  };

  if (accounts.length === 0) {
    return (
      <div className="glass p-4">
        <h2 className="text-lg font-semibold tracking-tight mb-4">Napojené účty</h2>
        <div className="text-sm text-[var(--muted)]">Žádné účty nenalezeny</div>
        <button 
          onClick={handleConnectBank}
          className="mt-3 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:bg-[var(--accent)]/90 transition-colors"
        >
          Napojit banku
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Napojené účty</h2>
          <div className="flex items-center gap-2">
            {!hasRealAccounts && (
              <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full font-medium">
                Manuál
              </span>
            )}
            <SyncAllButton />
          </div>
        </div>
        
        <div className="space-y-3">
          {accounts.map((account: Account) => (
            <div
              key={account.id}
              onClick={() => handleAccountClick(account.id)}
              className={`p-3 rounded-xl transition-colors cursor-pointer ${
                account.id === primaryId
                  ? "bg-[var(--accent)]/10 border border-[var(--accent)]/20"
                  : "hover:bg-black/5"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {account.institutionLogo && (
                        <div className="flex-shrink-0">
                          <img 
                            src={account.institutionLogo} 
                            alt={`${account.provider} logo`}
                            className="w-8 h-8 rounded-lg object-cover bg-white/20 border-2 border-white/30 shadow-sm"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <h3 className="font-medium text-sm">
                        {getAccountDisplayName(account)}
                      </h3>
                      <span className="text-xs text-[var(--muted)]">
                        {account.currency}
                      </span>
                      {account.id === primaryId && (
                        <span className="text-xs bg-[var(--accent)] text-white px-2 py-1 rounded-full font-medium">
                          Hlavní
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {account.connectionId && (
                        <span className="text-xs bg-[var(--success)] text-white px-2 py-1 rounded-full font-medium">
                          Napojeno
                        </span>
                      )}
                      {!account.connectionId && (
                        <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full font-medium">
                          Manuál
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-1">
                    <div className="text-lg font-semibold">
                      {formatBalance(account.balanceCZK)}
                    </div>
                    
                    {account.iban && (
                      <div className="text-xs text-[var(--muted)] mt-1">
                        IBAN: {account.iban}
                      </div>
                    )}
                    
                    <div className="text-xs text-[var(--muted)] mt-1">
                      Aktualizováno: {formatDateOnly(account.asOf)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!hasRealAccounts && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800 mb-2">
              <strong>Obnovit napojení:</strong> Vaše napojení pravděpodobně expirovalo.
            </div>
            <button 
              onClick={handleConnectBank}
              className="px-3 py-1 bg-[var(--accent)] text-white rounded text-xs hover:bg-[var(--accent)]/90 transition-colors"
            >
              Napojit banku znovu
            </button>
          </div>
        )}
      </div>

      {/* Trading 212 widget */}
      <div className="glass p-4 cursor-pointer hover:bg-black/5" onClick={()=> nav.push('/investments')}>
        <div className="mb-2">
          <h2 className="text-lg font-semibold tracking-tight">Trading 212</h2>
        </div>
        <T212Mini />
      </div>
      
      {primaryId && (
        <div className="glass p-4">
          <div className="text-sm">
            <div className="text-[var(--muted)] text-xs mb-1">Hlavní účet</div>
            <div className="font-medium">
              {accounts.find((a: Account) => a.id === primaryId)?.provider} – {accounts.find((a: Account) => a.id === primaryId)?.accountName}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function T212Mini() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Array<{ ticker: string; quantity: number; curPrice?: number; currentPrice?: number; currency?: string }>>([]);
  const [cash, setCash] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>('EUR');
  const [fx, setFx] = useState<Record<string, { amount: number; rate: number }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async ()=>{
      try {
        setLoading(true); setError(null);
        const [pRes, cRes] = await Promise.all([
          fetch('/api/integrations/t212/db/portfolio', { cache: 'no-store' }),
          fetch('/api/integrations/t212/db/cash', { cache: 'no-store' })
        ]);
        const p = pRes.ok ? await pRes.json() : [];
        const c = cRes.ok ? await cRes.json() : null;
        if (cancelled) return;
        const arr = Array.isArray(p)? p as any[] : [];
        setPositions(arr.slice(0,3));
        // nastav měnu z cash, případně z první pozice
        if (c && typeof c === 'object') { setCash(Number(c.amount||0)); if (c.currency) setCurrency(String(c.currency)); }
        else if (arr.length && arr[0]?.currency) { setCurrency(String(arr[0].currency)); }
      } catch (e:any) {
        if (!cancelled) setError(e?.message||'Chyba načítání');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return ()=>{ cancelled = true; };
  }, []);

  // Load latest FX for CZK conversion
  useEffect(() => {
    let cancelled = false;
    (async ()=>{
      try {
        const res = await fetch('/api/fx/latest', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        const map = buildFxMap(Array.isArray(data?.rates)? data.rates: []);
        setFx(map);
      } catch {
        setFx(null);
      }
    })();
    return ()=>{ cancelled = true; };
  }, []);

  if (loading) return <div className="text-[13px] text-[var(--muted)]">Načítám…</div>;
  if (error) return <div className="text-[13px] text-red-600">{error}</div>;

  const fmt = (n:number)=> new Intl.NumberFormat('cs-CZ',{ style:'currency', currency}).format(n);
  const priceOf = (p:any)=> (p.curPrice ?? p.currentPrice ?? 0);

  return (
    <div className="space-y-2">
      {(() => {
        const total = positions.reduce((s,p)=> s + priceOf(p)*p.quantity, 0) + (cash||0);
        const czk = fx ? toCZK(total, currency, fx) : null;
        return (
          <div>
            <div className="text-lg font-semibold">{new Intl.NumberFormat('cs-CZ',{ style:'currency', currency:'CZK'}).format(czk ?? 0)}</div>
            <div className="text-[12px] text-[var(--muted)]">≈ {fmt(total)} ({currency})</div>
          </div>
        );
      })()}
      <div className="space-y-1">
        {positions.map(p=> (
          <div key={p.ticker} className="flex items-center justify-between text-sm">
            <div className="truncate mr-2">{p.ticker}</div>
            <div className="text-[var(--muted)]">{fmt(priceOf(p)*p.quantity)}</div>
          </div>
        ))}
        {positions.length===0 && <div className="text-[13px] text-[var(--muted)]">Žádné pozice</div>}
      </div>
    </div>
  );
}
