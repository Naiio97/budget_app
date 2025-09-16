import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 200);

    const tx = await prisma.transaction.findMany({
      where: { accountId: id },
      orderBy: { ts: "desc" },
      skip: isNaN(offset) ? 0 : offset,
      take: isNaN(limit) ? 10 : limit,
      select: {
        id: true,
        ts: true,
        rawDescription: true,
        amountCZK: true,
        categoryId: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    const rows = tx.map(t => ({
      id: t.id,
      ts: t.ts.toISOString(),
      rawDescription: t.rawDescription,
      category: t.category?.name || "Nezařazeno",
      categoryId: t.categoryId,
      amountCZK: t.amountCZK,
    }));

    return NextResponse.json({ rows }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (e) {
    console.error("API /accounts/[id]/transactions error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 

// Přidat manuální transakci k účtu
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { ts, amountCZK, rawDescription, categoryId } = body as {
      ts?: string;
      amountCZK: number;
      rawDescription?: string;
      categoryId?: string | null;
    };

    if (!Number.isFinite(amountCZK)) {
      return NextResponse.json({ error: 'amountCZK musí být číslo' }, { status: 400 });
    }
    const when = ts ? new Date(ts) : new Date();
    const idTx = crypto.randomUUID();

    const created = await prisma.transaction.create({
      data: {
        id: idTx,
        ts: when,
        amountCZK: Math.round(amountCZK),
        rawDescription: rawDescription || '',
        merchantNorm: '',
        accountId: id,
        categoryId: categoryId ?? null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("API POST /accounts/[id]/transactions error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}