import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Seznam obálek pro účet
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const list = await prisma.envelope.findMany({
      where: { accountId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error("API GET /accounts/[id]/envelopes error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Vytvořit novou obálku pro účet
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, amountCZK } = body as { name?: string; amountCZK?: number };
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name je povinný' }, { status: 400 });
    }
    const amount = Number.isFinite(amountCZK) ? Math.round(amountCZK as number) : 0;
    const created = await prisma.envelope.create({
      data: {
        id: crypto.randomUUID(),
        accountId: id,
        name: name.trim(),
        amountCZK: amount,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("API POST /accounts/[id]/envelopes error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


