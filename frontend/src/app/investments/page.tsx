"use client";

import Trading212Portfolio from "@/components/Trading212Portfolio";
import Trading212Dividends from "@/components/Trading212Dividends";
import Trading212Transactions from "@/components/Trading212Transactions";

export default function InvestmentsPage() {
  return (
    <div className="space-y-4">
      <div className="glass p-4">
        <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Investice</div>
          <div className="text-[13px] text-[var(--muted)]">Napojení brokerů a import transakcí</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 text-xs glass rounded hover:bg-black/5"
            onClick={async ()=>{ await fetch('/api/fx/cnb/sync', { method: 'POST' }); }}
            title="Načíst aktuální kurzy ČNB do DB"
          >
            Sync ČNB kurzy
          </button>
          <button
            className="px-2 py-1 text-xs glass rounded hover:bg-black/5"
            onClick={async ()=>{ await fetch('/api/integrations/t212/sync', { method: 'POST' }); location.reload(); }}
            title="Synchronizovat Trading 212 do DB"
          >
            Sync Trading 212
          </button>
        </div>
        </div>
      </div>

      <Trading212Portfolio />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Trading212Dividends />
        <Trading212Transactions />
      </div>
    </div>
  );
}


