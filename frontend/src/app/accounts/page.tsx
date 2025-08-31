"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPrimaryId, getFallbackAccountId } from "@/lib/accounts";

export default function AccountsRedirectPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const primary = getPrimaryId();
    const targetId = primary || getFallbackAccountId();
    if (targetId) router.replace(`/accounts/${targetId}`);
    setReady(true);
  }, [router]);

  // drobný loader, ať to necuká
  return (
    <div className="glass p-4">
      {ready ? "Načítám účet…" : null}
    </div>
  );
}