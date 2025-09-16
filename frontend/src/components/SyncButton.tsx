"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton({ requisitionId }: { requisitionId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    if (!requisitionId) {
      console.error("Sync failed: No requisitionId provided");
      window.dispatchEvent(
        new CustomEvent('app-toast', { detail: { message: 'Chybí ID připojení k bance', type: 'error' } })
      );
      return;
    }
    
    setLoading(true);
    try {
      console.log("Starting sync with requisitionId:", requisitionId);
      const response = await fetch("/api/sync/gc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requisitionId }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("Sync successful:", result);
        
        // Obnovit server-side komponenty
        router.refresh();
        
        // Vyvolat custom event pro obnovení client-side komponent
        window.dispatchEvent(new CustomEvent('sync-complete'));
        
        // Hezká toast notifikace
        window.dispatchEvent(
          new CustomEvent('app-toast', { detail: { message: 'Synchronizace dokončena', type: 'success' } })
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Sync failed:", response.status, response.statusText, errorData);
        window.dispatchEvent(
          new CustomEvent('app-toast', { detail: { message: `Synchronizace selhala: ${errorData.error || response.statusText}`, type: 'error' } })
        );
      }
    } catch (e) {
      console.error("Manual sync failed", e);
      window.dispatchEvent(
        new CustomEvent('app-toast', { detail: { message: `Chyba při synchronizaci: ${e instanceof Error ? e.message : 'Neznámá chyba'}`, type: 'error' } })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      className="glass px-3 py-2 rounded-lg text-sm hover:bg-black/5 disabled:opacity-50"
      title="Synchronizovat účty"
    >
      {loading ? "Synchronizuji…" : "Sync"}
    </button>
  );
} 