"use client";

import { useEffect, useState } from "react";
import ConnectBank from "@/components/ConnectBank";
import AccountManagement from "@/components/AccountManagement";
import { useRouter } from "next/navigation";
import CategoryManagement from "@/components/CategoryManagement";

export default function SettingsClient({
  initialAccounts,
  initialCategories,
}: {
  initialAccounts: Array<any>;
  initialCategories: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"accounts" | "bank" | "categories" | "automation">("accounts");
  const [times, setTimes] = useState<string[]>(["", ""]);
  const [error, setError] = useState<string>("");
  const [last, setLast] = useState<{ t212?: string; fx?: string; gc?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Respektuj tab parametr z URL
  useEffect(() => {
    const url = new URL(window.location.href);
    const tab = url.searchParams.get("tab");
    if (tab === "bank" || tab === "accounts" || tab === "categories" || tab === "automation") {
      setActiveTab(tab);
    }
    // načti preferovaný čas
    fetch('/api/schedule').then(r=>r.json()).then(d=> {
      if (Array.isArray(d.times) && d.times.length) {
        setTimes(d.times.concat(["",""].slice(d.times.length)).slice(0,2));
      } else {
        // výchozí evropský 24h čas (08:00) pro pohodlný start
        setTimes(["08:00", ""]);
      }
    });
  }, []);

  useEffect(() => {
    // načti poslední snapshoty
    (async ()=>{
      try {
        const [fxL, snap] = await Promise.all([
          fetch('/api/fx/latest').then(r=>r.ok?r.json():null).catch(()=>null),
          fetch('/api/integrations/t212/db/snapshots').then(r=>r.ok?r.json():null).catch(()=>null),
        ]);
        setLast({ fx: fxL?.date || null, t212: Array.isArray(snap)&&snap.length? (snap[snap.length-1].id): null });
      } catch {}
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Nastavení</h1>
        <p className="text-[var(--muted)]">Spravujte své účty a napojení banky</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "accounts"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Správa účtů
        </button>
        <button
          onClick={() => setActiveTab("bank")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "bank"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Napojení banky
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "categories"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Kategorie
        </button>
        <button
          onClick={() => setActiveTab("automation")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "automation"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Automatizace
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        <div className="glass p-4">
          <div className="text-lg font-semibold mb-2">Synchronizace</div>
          <div className="text-[13px] text-[var(--muted)] mb-3">Spustit manuálně synchronizaci všech napojení</div>
          {last && (
            <div className="text-[12px] text-[var(--muted)] mb-2">
              Poslední: T212 {last.t212 || '—'} · ČNB {last.fx || '—'}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              className="px-2 py-1 text-xs glass rounded hover:bg-black/5"
              onClick={async ()=>{ setLoading(true); await fetch('/api/fx/cnb/sync', { method: 'POST' }); setLoading(false); router.refresh(); }}
            >Sync ČNB kurzy</button>
            <button
              className="px-2 py-1 text-xs glass rounded hover:bg-black/5"
              onClick={async ()=>{ setLoading(true); await fetch('/api/integrations/t212/sync', { method: 'POST' }); setLoading(false); router.refresh(); }}
            >Sync Trading 212</button>
            <button
              className="px-2 py-1 text-xs glass rounded hover:bg-black/5"
              onClick={async ()=>{ setLoading(true); await fetch('/api/sync/gc', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ syncAll: true }) }); setLoading(false); router.refresh(); }}
            >Sync GoCardless</button>
            <button
              className="px-2 py-1 text-xs bg-[var(--accent)] text-white rounded hover:opacity-90"
              onClick={async ()=>{
                setLoading(true);
                await Promise.all([
                  fetch('/api/fx/cnb/sync', { method: 'POST' }),
                  fetch('/api/integrations/t212/sync', { method: 'POST' }),
                  fetch('/api/sync/gc', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ syncAll: true }) }),
                ]);
                setLoading(false); router.refresh();
              }}
            >Sync vše</button>
            {loading && <span className="text-[12px] text-[var(--muted)]">Probíhá synchronizace…</span>}
          </div>
        </div>
        {activeTab === "accounts" && <AccountManagement initialAccounts={initialAccounts} />}
        {activeTab === "bank" && <ConnectBank />}
        {activeTab === "categories" && <CategoryManagement initialCategories={initialCategories} />}
        {activeTab === "automation" && (
          <div className="glass p-4 space-y-3 max-w-xl">
            <div className="text-sm text-[var(--muted)]">Automatická synchronizace</div>
            <div className="flex flex-col gap-2">
              {[0,1].map(i=> {
                const local = times[i];
                const utcInfo = getUtcInfo(local);
                return (
                <div key={i} className="flex items-center gap-2">
                  <label className="text-sm w-28">Čas {i+1} (24h):</label>
                  <CustomTimePicker value={local} onChange={(v)=> { setTimes(prev => prev.map((t,idx)=> idx===i? v : t)); setError(""); }} />
                  <span className="text-[12px] text-[var(--muted)]">→ UTC {utcInfo.utc} ({utcInfo.tzLabel})</span>
                </div>
              )})}
              {error && <div className="text-[13px] text-red-600">{error}</div>}
              <button
                className="px-3 py-1.5 rounded text-sm bg-[var(--accent)] text-white"
                onClick={async()=>{
                  try {
                    const list = times
                      .map(t=>t.trim())
                      .filter(Boolean)
                      .filter(t=>/^\d{2}:\d{2}$/.test(t))
                      .slice(0,2);
                    if (list.length===0) throw new Error('Zadejte aspoň jeden čas ve formátu HH:MM');
                    // kontrola unikátnosti
                    if (new Set(list).size !== list.length) throw new Error('Časy se nesmí opakovat');
                    const res = await fetch('/api/schedule', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ times: list }) });
                    if (!res.ok) throw new Error('Uložení selhalo');
                    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Čas uložen', type: 'success' } }));
                  } catch(e:any) {
                    setError(e?.message||'Chyba při ukládání');
                    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: e?.message||'Chyba při ukládání', type: 'error' } }));
                  }
                }}
              >Uložit</button>
            </div>
            <div className="text-[13px] text-[var(--muted)]">
              Pozn.: Crony v cloudu běží v UTC. Výše vidíš převod tvého zadaného času na UTC pro tvou zónu.
              Pro automatické spouštění použij cron (GitHub Actions, Cloudflare Cron) volající
              <code className="mx-1">GET /api/sync/gc?cron=true</code> v uvedené časy.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function CustomTimePicker({ value, onChange }: { value: string; onChange: (v: string)=>void }){
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2,'0'));
  const mins = Array.from({ length: 12 }, (_, i) => String(i*5).padStart(2,'0')); // po 5 minutách
  const [h, m] = (value || '08:00').split(':');
  return (
    <div className="flex items-center gap-1">
      <select
        className="glass px-2 py-1 rounded text-sm border border-white/20"
        value={h}
        onChange={(e)=> onChange(`${e.target.value}:${m||'00'}`)}
      >
        {hours.map(v=> <option key={v} value={v}>{v}</option>)}
      </select>
      <span>:</span>
      <select
        className="glass px-2 py-1 rounded text-sm border border-white/20"
        value={m}
        onChange={(e)=> onChange(`${h||'08'}:${e.target.value}`)}
      >
        {mins.map(v=> <option key={v} value={v}>{v}</option>)}
      </select>
    </div>
  );
}

function getUtcInfo(localHHMM: string){
  const [hStr, mStr] = (localHHMM || '00:00').split(':');
  const h = parseInt(hStr || '0', 10), m = parseInt(mStr || '0', 10);
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), isNaN(h)?0:h, isNaN(m)?0:m, 0);
  const utcH = String(d.getUTCHours()).padStart(2,'0');
  const utcM = String(d.getUTCMinutes()).padStart(2,'0');
  const tzLabel = Intl.DateTimeFormat(undefined, { timeZoneName:'short' }).formatToParts(d).find(p=>p.type==='timeZoneName')?.value || 'UTC';
  return { utc: `${utcH}:${utcM}`, tzLabel };
}

