import { NextResponse } from "next/server";
import { GoCardlessAdapter } from "@/lib/gocardless";
import { PrismaClient } from "@prisma/client";
import { nowInCzechTimeZone } from "@/lib/dateUtils";

const prisma = new PrismaClient();

export async function syncRequisition(requisitionId: string) {
  const adapter = new GoCardlessAdapter();

  // Get requisition details to know institution and status
  const requisition = await (async () => {
    const token = await (adapter as any).getAccessToken?.();
    const baseUrl = (adapter as any).baseUrl as string;
    const res = await fetch(baseUrl + "/requisitions/" + requisitionId + "/", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error("Failed to read requisition: " + res.status + " - " + text);
    }
    return res.json();
  })();

  const institutionId: string = requisition.institution_id;
  const status: string = requisition.status;

  // Try to enrich institution details (name/country/logo)
  const instData = await (async () => {
    try {
      const token = await (adapter as any).getAccessToken?.();
      const baseUrl = (adapter as any).baseUrl as string;
      const r = await fetch(baseUrl + "/institutions/" + institutionId + "/", {
        headers: { Authorization: "Bearer " + token },
      });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  })();

  // Upsert institution (using enriched data if available)
  await prisma.institution.upsert({
    where: { id: institutionId },
    update: {
      name: instData?.name ?? undefined,
      country: instData?.country ?? undefined,
      logo: instData?.logo ?? undefined,
      website: instData?.website ?? undefined,
    },
    create: {
      id: institutionId,
      name: instData?.name || institutionId,
      country: instData?.country || "CZ",
      logo: instData?.logo || null,
      website: instData?.website || null,
    },
  });

  // Upsert connection
  await prisma.connection.upsert({
    where: { id: requisitionId },
    update: { status },
    create: {
      id: requisitionId,
      institutionId,
      status,
    },
  });

  // Fetch accounts from provider
  let accounts: any[] = [];
  let rateLimitWarning = false;

  try {
    accounts = await adapter.listAccounts(requisitionId);
    console.log(`Načteno ${accounts.length} účtů z GoCardless pro requisition ${requisitionId}:`, accounts.map(acc => ({ id: acc.id, name: acc.name })));

    // Check if we got fallback accounts (indicating rate limit)
    if (accounts.length > 0 && accounts.every(acc => acc.name?.startsWith('Account '))) {
      rateLimitWarning = true;
      console.warn('Rate limit detected - using fallback account names');
    }
  } catch (error) {
    console.error('Failed to fetch accounts:', error);
    accounts = [];
  }

  // Persist accounts + balances + recent transactions in parallel
  const token = await (adapter as any).getAccessToken?.();
  const baseUrl = (adapter as any).baseUrl as string;

  const pickBestBalance = (balances: any[]): any | null => {
    if (!Array.isArray(balances) || balances.length === 0) return null;
    const order = ["closingBooked", "closingAvailable", "interimAvailable", "interimBooked", "expected", "current"];
    const byType = new Map<string, any>();
    for (const b of balances) {
      if (b.balanceType && !byType.has(b.balanceType)) byType.set(b.balanceType, b);
    }
    for (const t of order) {
      if (byType.has(t)) return byType.get(t);
    }
    return balances[0];
  };

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const since = ninetyDaysAgo.toISOString();

  await Promise.allSettled(
    accounts.map(async (a) => {
      // Read balance
      let balanceCZK: number | null = null;
      let asOf = nowInCzechTimeZone();
      try {
        const balRes = await fetch(baseUrl + "/accounts/" + a.id + "/balances/", {
          headers: { Authorization: "Bearer " + token },
        });
        if (balRes.ok) {
          const bal = await balRes.json();
          const best = pickBestBalance(bal.balances || []);
          const amountStr: string | undefined = best?.balanceAmount?.amount;
          const currency: string | undefined = best?.balanceAmount?.currency || a.currency;
          const refTs: string | undefined = best?.referenceDateTime || best?.referenceDate;
          if (refTs) asOf = new Date(refTs);
          if (currency === "CZK" && typeof amountStr === "string") {
            const val = parseFloat(amountStr);
            if (!Number.isNaN(val)) balanceCZK = Math.round(val); // Ukládáme jako celá čísla (koruny)
          }
        }
      } catch {}

      const accountData = {
        id: a.id,
        provider: "GoCardless",
        accountName: a.name,
        currency: a.currency || "CZK",
        balanceCZK: balanceCZK ?? 0,
        asOf,
        externalId: a.id,
        iban: a.iban,
        institutionId,
        connectionId: requisitionId,
      };

      console.log(`Ukládám účet:`, accountData);

      await prisma.account.upsert({
        where: { id: a.id },
        update: {
          provider: "GoCardless",
          accountName: a.name,
          currency: a.currency || "CZK",
          externalId: a.id,
          iban: a.iban,
          institutionId,
          connectionId: requisitionId,
          balanceCZK: balanceCZK ?? undefined,
          asOf,
        },
        create: accountData,
      });

      console.log(`Účet ${a.id} úspěšně uložen`);

      // Fetch and upsert recent transactions
      try {
        const tx = await adapter.fetchTransactions(a.id, since);
        const rows = tx.map((t) => ({
          id: t.id,
          ts: new Date(t.ts),
          amountCZK: Math.round(Number(t.amount) || 0), // TODO: FX conversion if not CZK
          rawDescription: t.description || "",
          merchantNorm: "",
          accountId: a.id,
          currency: t.currency || a.currency,
          amountOriginal: typeof t.amount === "number" ? Math.round(t.amount) : Math.round(Number(t.amount) || 0),
          balanceAfter: typeof t.balanceAfter === "number" ? Math.round(t.balanceAfter) : undefined,
          externalId: t.id,
        }));

        // Upsert one-by-one (ensure id uniqueness)
        for (const r of rows) {
          await prisma.transaction.upsert({
            where: { id: r.id },
            update: {
              ts: r.ts,
              amountCZK: r.amountCZK,
              rawDescription: r.rawDescription,
              merchantNorm: r.merchantNorm,
              accountId: r.accountId,
              currency: r.currency,
              amountOriginal: r.amountOriginal ?? undefined,
              balanceAfter: r.balanceAfter ?? undefined,
              externalId: r.externalId ?? undefined,
            },
            create: r as any,
          });
        }
      } catch (e) {
        // Swallow per-account tx errors to avoid failing the whole sync
        console.warn("Tx fetch/upsert failed for account", a.id, e);
      }
    })
  );

  // Return persisted accounts for this connection
  const persisted = await prisma.account.findMany({
    where: { connectionId: requisitionId },
    orderBy: [{ provider: "asc" }, { accountName: "asc" }],
  });

  console.log(`Sync dokončen pro requisition ${requisitionId}. Uloženo ${persisted.length} účtů:`, persisted.map(acc => ({ id: acc.id, name: acc.accountName })));

  const response = {
    requisitionId,
    status,
    accounts: persisted,
    ...(rateLimitWarning && {
      warning: "API rate limit reached. Account names are temporary - full details will be available after rate limit resets."
    })
  };

  return response;
}

export async function detectAndMarkInternalTransfers() {
  // Ujisti se, že existuje kategorie "Převod"
  const transferCategory = await prisma.category.upsert({
    where: { name: "Převod" },
    update: {},
    create: { id: "transfer", name: "Převod" },
  });

  // Kontroluj posledních 30 dní
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const txs = await prisma.transaction.findMany({
    where: { ts: { gte: since } },
    select: { id: true, ts: true, amountCZK: true, accountId: true, categoryId: true },
    orderBy: { ts: "desc" },
  });

  // Seskup podle (den, absolutní částka)
  const byKey = new Map<string, Array<typeof txs[number]>>();
  for (const t of txs) {
    const d = t.ts;
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const key = `${dayKey}|${Math.abs(t.amountCZK)}`;
    const arr = byKey.get(key) || [];
    arr.push(t);
    byKey.set(key, arr);
  }

  const toMark = new Set<string>();
  for (const [, list] of byKey) {
    const positives = list.filter((t) => t.amountCZK > 0);
    const negatives = list.filter((t) => t.amountCZK < 0);
    if (positives.length === 0 || negatives.length === 0) continue;

    const usedPos = new Set<number>();
    const usedNeg = new Set<number>();
    for (let i = 0; i < negatives.length; i++) {
      for (let j = 0; j < positives.length; j++) {
        if (usedNeg.has(i) || usedPos.has(j)) continue;
        const n = negatives[i];
        const p = positives[j];
        // Nespáruj tu samou transakci a požaduj jiný účet
        if (n.accountId !== p.accountId) {
          // Nepřepisuj už uživatelem přiřazené kategorie
          if (!n.categoryId) toMark.add(n.id);
          if (!p.categoryId) toMark.add(p.id);
          usedNeg.add(i);
          usedPos.add(j);
        }
      }
    }
  }

  if (toMark.size > 0) {
    const ids = Array.from(toMark);
    // Aktualizuj po částech, aby se nevyčerpaly parametry
    const chunkSize = 100;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const slice = ids.slice(i, i + chunkSize);
      await prisma.transaction.updateMany({
        where: { id: { in: slice } },
        data: { categoryId: transferCategory.id },
      });
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const { requisitionId, syncAll } = body as { requisitionId?: string; syncAll?: boolean };
    console.log("Sync endpoint - vstup:", { requisitionId, syncAll });

    if (syncAll) {
      // Najdi všechny existující connection IDs a spusť sync
      const connections = await prisma.connection.findMany({ select: { id: true } });
      const ids = connections.map((c) => c.id);
      if (ids.length === 0) {
        return NextResponse.json({ results: [] });
      }

      const results = [] as Array<{ id: string; ok: boolean; data?: any; error?: string }>;
      for (const id of ids) {
        try {
          const data = await syncRequisition(id);
          results.push({ id, ok: true, data });
        } catch (err: any) {
          console.error("Sync all - selhalo pro", id, err);
          results.push({ id, ok: false, error: err?.message || "Unknown error" });
        }
      }
      try {
        await detectAndMarkInternalTransfers();
      } catch (e) {
        console.warn("Detect transfers failed (syncAll)", e);
      }
      return NextResponse.json({ results });
    }

    if (!requisitionId) {
      console.log("Sync endpoint - chybí requisitionId");
      return NextResponse.json({ error: "Missing requisitionId" }, { status: 400 });
    }

    const response = await syncRequisition(requisitionId);
    // Po každém syncu zkus detekovat a označit převody
    try {
      await detectAndMarkInternalTransfers();
    } catch (e) {
      console.warn("Detect transfers failed", e);
    }
    return NextResponse.json(response);
  } catch (e) {
    console.error("/api/sync/gc error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Cron vstup: GET /api/sync/gc?cron=true – spustí syncAll bez potřeby body
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    if (url.searchParams.get('cron') !== 'true') {
      return NextResponse.json({ ok: true });
    }
    const connections = await prisma.connection.findMany({ select: { id: true } });
    const ids = connections.map((c) => c.id);
    for (const id of ids) {
      try { await syncRequisition(id); } catch {}
    }
    try { await detectAndMarkInternalTransfers(); } catch {}
    return NextResponse.json({ ok: true, synced: ids.length });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}