import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 200);

    const txs = await (prisma as any).transaction.findMany({
      where: { account: { isVisible: { not: false } } },
      include: { account: true, category: true },
      orderBy: { ts: "desc" },
      skip: isNaN(offset) ? 0 : offset,
      take: isNaN(limit) ? 10 : limit,
    });

    const rows = (txs as Array<any>).map((t: any) => ({
      id: t.id,
      ts: t.ts.toISOString(),
      rawDescription: t.rawDescription,
      category: t.category?.name ?? "",
      categoryId: t.categoryId ?? null,
      amountCZK: t.amountCZK,
      accountName: t.account.id,
      accountProvider: t.account.provider,
      accountDisplayName: t.account.customName || t.account.accountName,
    }));

    return NextResponse.json({ rows });
  } catch (e) {
    console.error("GET /api/transactions error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


