"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncAllButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSyncAll = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sync/gc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncAll: true }),
      });

      if (response.ok) {
        await response.json().catch(() => ({}));
        router.refresh();
        window.dispatchEvent(new CustomEvent("sync-complete"));
        window.dispatchEvent(
          new CustomEvent('app-toast', { detail: { message: 'Hromadná synchronizace dokončena', type: 'success' } })
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        window.dispatchEvent(
          new CustomEvent('app-toast', { detail: { message: `Hromadná synchronizace selhala: ${errorData.error || response.statusText}`, type: 'error' } })
        );
      }
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent('app-toast', { detail: { message: `Chyba při hromadné synchronizaci: ${e instanceof Error ? e.message : 'Neznámá chyba'}`, type: 'error' } })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSyncAll}
      disabled={loading}
      className="glass px-3 py-2 rounded-lg text-sm hover:bg-black/5 disabled:opacity-50"
      title="Synchronizovat všechny účty"
    >
      {loading ? "Synchronizuji vše…" : "Sync všechny"}
    </button>
  );
}


