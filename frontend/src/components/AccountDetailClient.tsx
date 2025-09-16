"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import StarPrimaryToggle from "@/app/accounts/[id]/StarPrimaryToggle";
import AccountPageClient from "@/components/AccountPageClient";
import SyncButton from "@/components/SyncButton";
import { formatDateTime } from "@/lib/dateUtils";

type Account = {
  id: string;
  provider: string;
  accountName: string;
  customName?: string | null;
  asOf: string; // ISO
  connectionId?: string | null;
};

interface AccountDetailClientProps {
  account: Account;
  transactions?: any[];
  categories?: Array<{ id: string; name: string }>;
  accounts?: Array<{ id: string; accountName: string; provider: string; customName?: string | null }>;
}

export default function AccountDetailClient({ account: initialAccount, transactions, categories, accounts }: AccountDetailClientProps) {
  const [account, setAccount] = useState<Account>(initialAccount);
  const router = useRouter();
  const [newTxOpen, setNewTxOpen] = useState(false);
  const [newEnvOpen, setNewEnvOpen] = useState(false);
  const [balOpen, setBalOpen] = useState(false);
  const [newTxDateOnly, setNewTxDateOnly] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  });
  const [newTxTime, setNewTxTime] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [newTxAmount, setNewTxAmount] = useState<string>("");
  const [newTxDesc, setNewTxDesc] = useState<string>("");
  const [newTxCategoryId, setNewTxCategoryId] = useState<string | "" | null>("");
  const [creating, setCreating] = useState(false);

  // Envelopes (obálky) z API
  type Envelope = { id: string; name: string; amountCZK: number };
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [envName, setEnvName] = useState("");
  const [envAmount, setEnvAmount] = useState("");
  const [activeEnvelope, setActiveEnvelope] = useState<Envelope | null>(null);
  const [activeEnvelopeName, setActiveEnvelopeName] = useState<string>("");
  const [transferFrom, setTransferFrom] = useState<string>("");
  const [transferTo, setTransferTo] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [transferNote, setTransferNote] = useState<string>("");
  const [transferring, setTransferring] = useState(false);
  const [transferLog, setTransferLog] = useState<Array<{ id: string; ts: string; amountCZK: number; note: string; fromName: string; toName: string }>>([]);
  const [transferOpen, setTransferOpen] = useState(false);
  // state pro modal zůstatku
  const [balDate, setBalDate] = useState<string>("");
  const [balAmount, setBalAmount] = useState<string>("");

  // Submit helpers pro Enter
  const submitNewTransaction = async () => {
    if (!newTxOpen || creating || !newTxAmount.trim()) return;
    try {
      setCreating(true);
      const iso = new Date(`${newTxDateOnly}T${newTxTime}`).toISOString();
      const amt = Math.round(Number(newTxAmount) || 0);
      const res = await fetch(`/api/accounts/${account.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ts: iso, amountCZK: amt, rawDescription: newTxDesc, categoryId: newTxCategoryId || null })
      });
      if (!res.ok) throw new Error('Nepodařilo se přidat transakci');
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Transakce přidána', type: 'success' } }));
      setNewTxAmount("");
      setNewTxDesc("");
      setNewTxOpen(false);
      router.refresh();
    } catch (e:any) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message || 'Chyba při přidání transakce', type: 'error' } }));
    } finally {
      setCreating(false);
    }
  };

  const submitNewEnvelope = async () => {
    if (!newEnvOpen || !envName.trim() || !envAmount.trim()) return;
    try {
      const amount = Math.round(Number(envAmount)||0);
      const sum = envelopes.reduce((s, e)=> s + (e.amountCZK||0), 0);
      const balance = (account as any).balanceCZK || 0;
      if (sum + amount > balance) {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Součet obálek by přesáhl zůstatek účtu', type: 'error' } }));
        return;
      }
      const res = await fetch(`/api/accounts/${account.id}/envelopes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: envName.trim(), amountCZK: amount })
      });
      if (!res.ok) throw new Error('Nepodařilo se přidat obálku');
      const created: Envelope = await res.json();
      setEnvelopes(prev=>[created, ...prev]);
      setEnvName(""); setEnvAmount("");
      setNewEnvOpen(false);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Obálka přidána', type: 'success' } }));
    } catch(e:any) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message||'Chyba při přidání obálky', type: 'error' } }));
    }
  };

  const submitBalance = async () => {
    if (!balOpen || !balDate || !balAmount.trim()) return;
    try {
      const payload: any = {};
      if (balDate) payload.asOf = new Date(balDate).toISOString();
      payload.balanceCZK = Math.round(Number(balAmount)||0);
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Uložení selhalo');
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Zůstatek uložen', type: 'success' } }));
      setBalOpen(false);
      router.refresh();
    } catch(e:any) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message||'Chyba při uložení zůstatku', type: 'error' } }));
    }
  };

function TimePicker24({ value, onChange }: { value: string; onChange: (v: string)=>void }){
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2,'0'));
  const mins = Array.from({ length: 12 }, (_, i) => String(i*5).padStart(2,'0'));
  const [h, m] = (value || '08:00').split(':');
  return (
    <div className="flex items-center gap-1">
      <select className="glass px-2 py-1 rounded text-sm border border-white/20" value={h} onChange={(e)=> onChange(`${e.target.value}:${m||'00'}`)}>
        {hours.map(v=> <option key={v} value={v}>{v}</option>)}
      </select>
      <span>:</span>
      <select className="glass px-2 py-1 rounded text-sm border border-white/20" value={m} onChange={(e)=> onChange(`${h||'08'}:${e.target.value}`)}>
        {mins.map(v=> <option key={v} value={v}>{v}</option>)}
      </select>
    </div>
  );
}

  // Klávesové zkratky ESC/Enter pro otevřené modaly
  useEffect(() => {
    if (!newTxOpen && !newEnvOpen && !balOpen && !transferOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (newTxOpen) setNewTxOpen(false);
        if (newEnvOpen) setNewEnvOpen(false);
        if (balOpen) setBalOpen(false);
        if (transferOpen) setTransferOpen(false);
      } else if (e.key === 'Enter') {
        if (newTxOpen) submitNewTransaction();
        else if (newEnvOpen) submitNewEnvelope();
        else if (balOpen) submitBalance();
        else if (transferOpen) void submitTransfer();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [newTxOpen, newEnvOpen, balOpen, transferOpen, newTxDateOnly, newTxTime, newTxAmount, newTxDesc, newTxCategoryId, envName, envAmount, balDate, balAmount, transferFrom, transferTo, transferAmount, transferNote]);

  const submitTransfer = async () => {
    if (!transferOpen || transferring || !transferFrom || !transferTo || transferFrom===transferTo || !transferAmount.trim()) return;
    try {
      const amt = Math.round(Number(transferAmount)||0);
      if (amt <= 0) { window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Částka musí být kladná', type: 'error' } })); return; }
      const src = envelopes.find(e=>e.id===transferFrom);
      const dst = envelopes.find(e=>e.id===transferTo);
      if (!src || !dst) return;
      if (src.amountCZK < amt) { window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Nedostatek prostředků v zdrojové obálce', type: 'error' } })); return; }
      setTransferring(true);
      const resp = await fetch(`/api/accounts/${account.id}/envelopes/transfers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromEnvelopeId: src.id, toEnvelopeId: dst.id, amountCZK: amt, note: transferNote || undefined }) });
      if (!resp.ok) throw new Error('Přesun selhal');
      const payload = await resp.json();
      setEnvelopes(prev => prev.map(e=> { const found = payload.envelopes.find((x: any)=> x.id === e.id); return found ? { ...e, amountCZK: found.amountCZK } : e; }));
      setTransferLog(prev => [{ id: payload.transfer.id, ts: payload.transfer.ts, amountCZK: payload.transfer.amountCZK, note: payload.transfer.note || '', fromName: src.name, toName: dst.name }, ...prev].slice(0,30));
      setTransferAmount(""); setTransferFrom(""); setTransferTo(""); setTransferNote("");
      setTransferOpen(false);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Přesun dokončen', type: 'success' } }));
    } catch (e:any) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message||'Chyba při přesunu', type: 'error' } }));
    } finally {
      setTransferring(false);
    }
  };

  // Převzít nové props po router.refresh (aktualizace času a dalších hodnot)
  useEffect(() => {
    setAccount(initialAccount);
  }, [initialAccount]);

  // Sledování změn účtu z AccountManagement
  useEffect(() => {
    const handleAccountUpdate = (event: CustomEvent) => {
      const { accountId, customName } = event.detail;

      // Aktualizuj lokálně pouze pokud se jedná o tento účet
      if (accountId === account.id && customName !== undefined) {
        setAccount(prevAccount => ({
          ...prevAccount,
          customName: customName
        }));
      }
    };

    window.addEventListener('account-updated', handleAccountUpdate as EventListener);
    return () => {
      window.removeEventListener('account-updated', handleAccountUpdate as EventListener);
    };
  }, [account.id]);

  // Načíst obálky ze serveru
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!account?.id) return;
      try {
        const res = await fetch(`/api/accounts/${account.id}/envelopes`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Nepodařilo se načíst obálky');
        const data = await res.json();
        if (!cancelled) setEnvelopes(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setEnvelopes([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [account?.id]);

  // Načíst log přesunů
  useEffect(() => {
    let cancelled = false;
    async function loadLog() {
      if (!account?.id) return;
      try {
        const res = await fetch(`/api/accounts/${account.id}/envelopes/transfers`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Nepodařilo se načíst log');
        const data = await res.json();
        if (!cancelled) setTransferLog(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setTransferLog([]);
      }
    }
    loadLog();
    return () => { cancelled = true; };
  }, [account?.id]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1">
          <h1 className="text-lg font-semibold tracking-tight">
            {account.customName || account.accountName}
          </h1>
          <StarPrimaryToggle id={account.id} />
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[13px] text-[var(--muted)]">
            Stav k {formatDateTime(account.asOf)}
          </div>
          {account.connectionId ? <SyncButton requisitionId={account.connectionId} /> : null}
          {!account.connectionId && (
            <span className="text-[11px] text-[var(--muted)]">(manuální účet)</span>
          )}
          {!account.connectionId && (
            <button
              className="px-2 py-1 text-xs glass rounded hover:bg-black/5"
              onClick={() => setNewTxOpen(true)}
              title="Přidat transakci"
            >
              + transakce
            </button>
          )}
          <button
            className="px-2 py-1 text-xs glass rounded hover:bg-black/5"
            onClick={() => setNewEnvOpen(true)}
            title="Přidat obálku"
          >
            + obálka
          </button>
          {!account.connectionId && (
            <button
              className="px-2 py-1 text-xs glass rounded hover:bg-black/5"
              onClick={() => {
                // init modal values z aktuálního účtu
                const d = new Date(account.asOf);
                const pad = (n: number) => String(n).padStart(2, '0');
                const local = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                setBalDate(local);
                setBalAmount(String((account as any).balanceCZK ?? 0));
                setBalOpen(true);
              }}
              title="Upravit zůstatek"
            >
              zůstatek
            </button>
          )}
        </div>
      </div>

      {/* Modal pro přidání transakce */}
      {newTxOpen && !account.connectionId && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNewTxOpen(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[560px]">
            <div className="bg-white p-5 rounded-2xl shadow-2xl border border-black/10">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">Přidat transakci</div>
                <button className="text-[13px] text-[var(--muted)] hover:text-black" onClick={() => setNewTxOpen(false)}>Zavřít</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div className="md:col-span-2 grid grid-cols-2 gap-2 items-end">
                  <div>
                    <label className="block text-[11px] text-[var(--muted)] mb-1">Datum</label>
                    <input type="date" className="glass px-2 py-1 rounded w-full text-sm border border-white/20" value={newTxDateOnly} onChange={(e)=>setNewTxDateOnly(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--muted)] mb-1">Čas (24h)</label>
                    <TimePicker24 value={newTxTime} onChange={setNewTxTime} />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--muted)] mb-1">Částka (CZK)</label>
                  <input
                    type="number"
                    className="glass px-2 py-1 rounded w-full text-sm text-right border border-white/20"
                    placeholder="0"
                    value={newTxAmount}
                    onChange={(e)=>setNewTxAmount(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] text-[var(--muted)] mb-1">Popis</label>
                  <input
                    type="text"
                    className="glass px-2 py-1 rounded w-full text-sm border border-white/20"
                    placeholder="Popis transakce"
                    value={newTxDesc}
                    onChange={(e)=>setNewTxDesc(e.target.value)}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[11px] text-[var(--muted)] mb-1">Kategorie</label>
                  <select
                    className="glass px-2 py-1 rounded w-full text-sm border border-white/20"
                    value={newTxCategoryId ?? ""}
                    onChange={(e)=>setNewTxCategoryId(e.target.value || null)}
                  >
                    <option value="">Nezařazeno</option>
                    {categories?.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end justify-end md:col-span-2">
                  <button
                    className="px-3 py-1.5 rounded text-sm bg-[var(--accent)] text-white disabled:opacity-60"
                    disabled={creating || !newTxAmount.trim()}
                    onClick={async()=>{
                      try {
                        setCreating(true);
                        const iso = new Date(`${newTxDateOnly}T${newTxTime}`).toISOString();
                        const amt = Math.round(Number(newTxAmount) || 0);
                        const res = await fetch(`/api/accounts/${account.id}/transactions`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ts: iso, amountCZK: amt, rawDescription: newTxDesc, categoryId: newTxCategoryId || null })
                        });
                        if (!res.ok) throw new Error('Nepodařilo se přidat transakci');
                        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Transakce přidána', type: 'success' } }));
                        setNewTxAmount("");
                        setNewTxDesc("");
                        setNewTxOpen(false);
                        router.refresh();
                      } catch (e:any) {
                        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message || 'Chyba při přidání transakce', type: 'error' } }));
                      } finally {
                        setCreating(false);
                      }
                    }}
                  >
                    Přidat transakci
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal detailu obálky */}
      {activeEnvelope && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setActiveEnvelope(null)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[520px]">
            <div className="bg-white p-5 rounded-2xl shadow-2xl border border-black/10">
              <div className="flex items-center justify-between mb-3">
                <input
                  className="glass px-2 py-1 rounded text-sm border border-white/20 w-2/3"
                  value={activeEnvelopeName}
                  onChange={(e)=> setActiveEnvelopeName(e.target.value)}
                  onKeyDown={async(e)=>{
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      try {
                        const res = await fetch(`/api/envelopes/${activeEnvelope.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: activeEnvelopeName }) });
                        if (!res.ok) throw new Error('Uložení názvu selhalo');
                        setActiveEnvelope(v => v ? ({ ...v, name: activeEnvelopeName }) : v);
                        setEnvelopes(prev => prev.map(x => x.id === activeEnvelope.id ? { ...x, name: activeEnvelopeName } : x));
                        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Název uložen', type: 'success' } }));
                      } catch(err:any) {
                        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: err?.message||'Chyba při uložení názvu', type: 'error' } }));
                      }
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setActiveEnvelopeName(activeEnvelope.name);
                    }
                  }}
                  onBlur={async(e)=>{
                    try {
                      const res = await fetch(`/api/envelopes/${activeEnvelope.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: activeEnvelopeName }) });
                      if (!res.ok) throw new Error('Uložení názvu selhalo');
                      setEnvelopes(prev => prev.map(x => x.id === activeEnvelope.id ? { ...x, name: activeEnvelopeName } : x));
                    } catch(err:any) {
                      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: err?.message||'Chyba při uložení názvu', type: 'error' } }));
                    }
                  }}
                />
                <button className="text-[13px] text-[var(--muted)] hover:text-black" onClick={() => setActiveEnvelope(null)}>Zavřít</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-[var(--muted)] mb-1">Částka (CZK)</label>
                  <input
                    type="number"
                    className="glass px-2 py-1 rounded w-full text-sm text-right border border-white/20"
                    defaultValue={activeEnvelope.amountCZK}
                    onBlur={async(e)=>{
                      const val = Math.round(Number(e.target.value)||0);
                      const sumOther = envelopes.reduce((s, x)=> s + (x.id===activeEnvelope.id ? 0 : (x.amountCZK||0)), 0);
                      const balance = (account as any).balanceCZK || 0;
                      if (sumOther + val > balance) {
                        e.currentTarget.value = String(activeEnvelope.amountCZK);
                        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Součet obálek nesmí přesáhnout zůstatek účtu', type: 'error' } }));
                        return;
                      }
                      try {
                        const res = await fetch(`/api/envelopes/${activeEnvelope.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountCZK: val }) });
                        if (!res.ok) throw new Error('Uložení selhalo');
                        setEnvelopes(prev => prev.map(x => x.id === activeEnvelope.id ? { ...x, amountCZK: val } : x));
                        setActiveEnvelope(v => v ? ({ ...v, amountCZK: val }) : v);
                      } catch(e:any) {
                        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message||'Chyba při uložení obálky', type: 'error' } }));
                      }
                    }}
                  />
                </div>
                <div className="flex justify-between">
                  <button
                    className="px-3 py-1.5 rounded text-sm bg-black/5 hover:bg-black/10"
                    onClick={async()=>{
                      try {
                        const res = await fetch(`/api/envelopes/${activeEnvelope.id}`, { method: 'DELETE' });
                        if (!res.ok) throw new Error('Mazání selhalo');
                        setEnvelopes(prev => prev.filter(x => x.id !== activeEnvelope.id));
                        setActiveEnvelope(null);
                      } catch(e:any) {
                        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message||'Chyba při mazání obálky', type: 'error' } }));
                      }
                    }}
                  >Smazat obálku</button>
                  <button className="px-3 py-1.5 rounded text-sm bg-[var(--accent)] text-white" onClick={()=>{ setTransferFrom(activeEnvelope.id); setTransferOpen(true); }}>Přesunout z této</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal pro přidání obálky */}
      {newEnvOpen && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNewEnvOpen(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[520px]">
            <div className="bg-white p-5 rounded-2xl shadow-2xl border border-black/10">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">Přidat obálku</div>
                <button className="text-[13px] text-[var(--muted)] hover:text-black" onClick={() => setNewEnvOpen(false)}>Zavřít</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-2">
                  <label className="block text-[11px] text-[var(--muted)] mb-1">Název</label>
                  <input
                    type="text"
                    className="glass px-2 py-1 rounded w-full text-sm border border-white/20"
                    placeholder="Např. Auto"
                    value={envName}
                    onChange={(e)=>setEnvName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--muted)] mb-1">Částka (CZK)</label>
                  <input
                    type="number"
                    className="glass px-2 py-1 rounded w-full text-sm text-right border border-white/20"
                    placeholder="0"
                    value={envAmount}
                    onChange={(e)=>setEnvAmount(e.target.value)}
                  />
                </div>
                <div className="md:col-span-3 flex justify-end pt-1">
                  <button
                    className="px-3 py-1.5 rounded text-sm bg-[var(--accent)] text-white disabled:opacity-60"
                    disabled={!envName.trim() || !envAmount.trim()}
                    onClick={async()=>{
                      try {
                        const amount = Math.round(Number(envAmount)||0);
                        const sum = envelopes.reduce((s, e)=> s + (e.amountCZK||0), 0);
                        const balance = (account as any).balanceCZK || 0;
                        if (sum + amount > balance) {
                          window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Součet obálek by přesáhl zůstatek účtu', type: 'error' } }));
                          return;
                        }
                        const res = await fetch(`/api/accounts/${account.id}/envelopes`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: envName.trim(), amountCZK: amount })
                        });
                        if (!res.ok) throw new Error('Nepodařilo se přidat obálku');
                        const created: Envelope = await res.json();
                        setEnvelopes(prev=>[created, ...prev]);
                        setEnvName(""); setEnvAmount("");
                        setNewEnvOpen(false);
                        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Obálka přidána', type: 'success' } }));
                      } catch(e:any) {
                        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message||'Chyba při přidání obálky', type: 'error' } }));
                      }
                    }}
                  >Vytvořit obálku</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pro úpravu zůstatku */}
      {balOpen && !account.connectionId && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setBalOpen(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[520px]">
            <div className="bg-white p-5 rounded-2xl shadow-2xl border border-black/10">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium">Upravit zůstatek</div>
                <button className="text-[13px] text-[var(--muted)] hover:text-black" onClick={() => setBalOpen(false)}>Zavřít</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                <div className="md:col-span-2 grid grid-cols-2 gap-2 items-end">
                  <div>
                    <label className="block text-[11px] text-[var(--muted)] mb-1">Datum</label>
                    <input type="date" className="glass px-2 py-1 rounded w-full text-sm border border-white/20" value={(balDate||'').split('T')[0] || ''} onChange={(e)=> setBalDate(`${e.target.value}T${(balDate||'').split('T')[1] || '08:00'}`)} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--muted)] mb-1">Čas (24h)</label>
                    <TimePicker24 value={(balDate||'').split('T')[1] || '08:00'} onChange={(v)=> setBalDate(`${(balDate||'').split('T')[0] || new Date().toISOString().slice(0,10)}T${v}`)} />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--muted)] mb-1">Zůstatek (CZK)</label>
                  <input
                    type="number"
                    className="glass px-2 py-1 rounded w-full text-sm text-right border border-white/20"
                    value={balAmount}
                    onChange={(e)=>setBalAmount(e.target.value)}
                  />
                </div>
                <div className="md:col-span-3 flex justify-end pt-1 gap-2">
                  <button className="px-3 py-1.5 rounded text-sm bg-black/5 hover:bg-black/10" onClick={()=>setBalOpen(false)}>Zrušit</button>
                  <button
                    className="px-3 py-1.5 rounded text-sm bg-[var(--accent)] text-white disabled:opacity-60"
                    disabled={!balDate || !balAmount.trim()}
                    onClick={async()=>{
                      try {
                        const payload: any = {};
                        if (balDate) payload.asOf = new Date(balDate).toISOString();
                        payload.balanceCZK = Math.round(Number(balAmount)||0);
                        const res = await fetch(`/api/accounts/${account.id}`, {
                          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                        });
                        if (!res.ok) throw new Error('Uložení selhalo');
                        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Zůstatek uložen', type: 'success' } }));
                        setBalOpen(false);
                        router.refresh();
                      } catch(e:any) {
                        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message||'Chyba při uložení zůstatku', type: 'error' } }));
                      }
                    }}
                  >Uložit</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Obálky pro manuální účet (DB) */}
      {
        (
        <div className="glass p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Obálky (spořicí cíle)</div>
            <div className="flex items-center gap-2">
              <div className="text-[12px] text-[var(--muted)]">Zůstatek účtu: {new Intl.NumberFormat('cs-CZ',{style:'currency',currency:'CZK'}).format((account as any).balanceCZK || 0)}</div>
              <button className="px-2 py-1 text-xs glass rounded hover:bg-black/5" onClick={()=>setTransferOpen(true)} title="Přesun mezi obálkami">Přesun</button>
            </div>
          </div>
          {/* Malé dlaždice obálek; detail přes modal po kliknutí */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {envelopes.map(env => (
              <button key={env.id} className="glass px-2 py-2 rounded-lg text-left hover:bg-black/5" onClick={()=>{ setActiveEnvelope(env); setActiveEnvelopeName(env.name); }} title={env.name}>
                <div className="text-[13px] font-medium truncate">{env.name}</div>
                <div className="text-[12px] text-[var(--muted)]">{new Intl.NumberFormat('cs-CZ',{style:'currency',currency:'CZK'}).format(env.amountCZK)}</div>
              </button>
            ))}
            {envelopes.length === 0 && (<div className="text-[13px] text-[var(--muted)]">Zatím žádné obálky.</div>)}
          </div>

          {/* Log posledních přesunů */}
          {transferLog.length > 0 && (
            <div className="mt-3">
              <div className="text-[12px] text-[var(--muted)] mb-1">Poslední přesuny</div>
              <div className="space-y-1">
                {transferLog.map(item => (
                  <div key={item.id} className="text-[13px] flex justify-between">
                    <div className="truncate mr-2">{new Date(item.ts).toLocaleString('cs-CZ')} – {item.fromName} → {item.toName}</div>
                    <div className="font-medium">{new Intl.NumberFormat('cs-CZ',{style:'currency',currency:'CZK'}).format(item.amountCZK)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-2 text-sm">
            {(() => {
              const sum = envelopes.reduce((s, e)=> s + (e.amountCZK||0), 0);
              const balance = (account as any).balanceCZK || 0;
              const rest = balance - sum;
              return (
                <div className="flex items-center justify-between">
                  <div className="text-[var(--muted)]">Alokováno v obálkách: {new Intl.NumberFormat('cs-CZ',{style:'currency',currency:'CZK'}).format(sum)}</div>
                  <div className={rest<0?"text-[color:var(--danger)]":"text-[var(--muted)]"}>Zbývá: {new Intl.NumberFormat('cs-CZ',{style:'currency',currency:'CZK'}).format(rest)}</div>
                </div>
              );
            })()}
          </div>
        </div>
        )
      }

      <AccountPageClient accountId={account.id} initialTransactions={transactions} initialCategories={categories} initialAccounts={accounts} />
    </div>
  );
}
