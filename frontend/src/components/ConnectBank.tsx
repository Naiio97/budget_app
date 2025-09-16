"use client";

import { useState, useEffect } from "react";
import { Institution } from "@/lib/gocardless";
import { useRouter } from "next/navigation";

export default function ConnectBank() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const response = await fetch("/api/institutions");
        const data = await response.json();
        setInstitutions(data);
      } catch (error) {
        console.error("Failed to fetch institutions:", error);
      }
    };

    fetchInstitutions();
  }, []);

  // Handle redirect callback: sync accounts automatically and redirect to accounts
  useEffect(() => {
    const url = new URL(window.location.href);
    const rq = url.searchParams.get("requisition_id") || url.searchParams.get("requisitionId") || url.searchParams.get("ref");
    
    console.log("ConnectBank useEffect - URL:", window.location.href);
    console.log("ConnectBank useEffect - requisition_id:", rq);
    
    if (!rq) {
      console.log("ConnectBank useEffect - žádný requisition_id, končím");
      return;
    }

    const doSync = async () => {
      try {
        console.log("ConnectBank - spouštím sync pro requisition:", rq);
        setSyncing(true);
        const res = await fetch("/api/sync/gc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requisitionId: rq }),
        });
        const data = await res.json();
        console.log("ConnectBank - sync response:", data);
        if (!res.ok) throw new Error(data?.error || "Sync failed");
        
        // Dispatch sync-complete event to refresh all components
        console.log("ConnectBank - dispatch sync-complete event");
        window.dispatchEvent(new CustomEvent('sync-complete'));
        
        // Remove query params from URL to keep UI clean
        window.history.replaceState({}, document.title, window.location.pathname);
        // Navigate to accounts page; it will redirect to the first account
        router.push("/accounts");
      } catch (e) {
        console.error("Auto sync after callback failed", e);
      } finally {
        setSyncing(false);
      }
    };

    doSync();
  }, [router]);

  const handleConnect = async () => {
    if (!selectedInstitution) return;

    setLoading(true);
    try {
      const response = await fetch("/api/connect/gc/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: selectedInstitution,
          redirectUrl: `${window.location.origin}/api/connect/gc/callback`,
        }),
      });

      const { redirect } = await response.json();
      window.location.href = redirect;
    } catch (error) {
      console.error("Failed to start connection:", error);
      setLoading(false);
    }
  };

  return (
    <div className="glass p-6">
      <h2 className="text-xl font-semibold mb-4">Pripjit banku</h2>
      {syncing ? (
        <div className="mb-4 text-sm text-[var(--muted)]">Synchronizuji účty…</div>
      ) : null}
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Vyberte banku:</label>
          <select
            value={selectedInstitution}
            onChange={(e) => setSelectedInstitution(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="">-- Vyberte banku --</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleConnect}
          disabled={!selectedInstitution || loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Pripjovani..." : "Pripjit banku"}
        </button>
      </div>
    </div>
  );
}
