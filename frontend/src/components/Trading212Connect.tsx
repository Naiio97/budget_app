"use client";

import { useRef, useState } from "react";

export default function Trading212Connect() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [rowsCount, setRowsCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = () => fileRef.current?.click();

  const handleFile = async (file: File) => {
    setError(null);
    setRowsCount(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      // Jednoduchá validace Trading212 CSV (obsahuje hlavičky jako "Action", "Ticker", "Quantity")
      const firstLine = text.split(/\r?\n/)[0] || "";
      if (!/Action/i.test(firstLine) || !/Ticker/i.test(firstLine)) {
        throw new Error("Soubor nevypadá jako export z Trading 212");
      }
      const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
      setRowsCount(Math.max(0, lines.length - 1));
      // TODO: Naparsovat a nabídnout import do interního formátu (mimo scope první verze)
    } catch (e:any) {
      setError(e?.message || "Chyba při čtení souboru");
    }
  };

  return (
    <div className="glass p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-base font-semibold">Trading 212</div>
          <div className="text-[13px] text-[var(--muted)]">Import CSV výpisu obchodů</div>
        </div>
        <button className="px-3 py-1.5 rounded text-sm bg-[var(--accent)] text-white" onClick={handlePick}>Nahrát CSV</button>
      </div>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) handleFile(f); }} />
      {fileName && (
        <div className="text-[13px]">Soubor: <span className="font-medium">{fileName}</span>{rowsCount!=null && <> · řádků: {rowsCount}</>}</div>
      )}
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      <div className="mt-3 text-[13px] text-[var(--muted)]">
        Jak získat CSV: v Trading 212 otevřete History → Export → Transactions (CSV). Podporu plného importu doplníme v další verzi.
      </div>
    </div>
  );
}


