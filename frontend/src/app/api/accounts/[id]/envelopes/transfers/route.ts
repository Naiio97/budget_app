import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Seznam posledních přesunů obálek pro účet
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await prisma.envelopeTransfer.findMany({
      where: { accountId: id },
      orderBy: { ts: "desc" },
      take: 30,
      include: { fromEnvelope: true, toEnvelope: true },
    });
    const out = rows.map((r) => ({
      id: r.id,
      ts: r.ts.toISOString(),
      amountCZK: r.amountCZK,
      note: r.note || "",
      fromName: r.fromEnvelope?.name || "",
      toName: r.toEnvelope?.name || "",
    }));
    return NextResponse.json(out);
  } catch (e) {
    console.error("API GET /accounts/[id]/envelopes/transfers error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Vytvořit přesun mezi obálkami (atomicky)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params;
    const body = await req.json();
    const { fromEnvelopeId, toEnvelopeId, amountCZK, note } = body as {
      fromEnvelopeId?: string;
      toEnvelopeId?: string;
      amountCZK?: number;
      note?: string;
    };

    if (!fromEnvelopeId || !toEnvelopeId || fromEnvelopeId === toEnvelopeId) {
      return NextResponse.json({ error: 'Neplatné obálky pro přesun' }, { status: 400 });
    }
    if (!Number.isFinite(amountCZK) || (amountCZK as number) <= 0) {
      return NextResponse.json({ error: 'Částka musí být kladné číslo' }, { status: 400 });
    }
    const amt = Math.round(amountCZK as number);

    const [src, dst] = await Promise.all([
      prisma.envelope.findUnique({ where: { id: fromEnvelopeId } }),
      prisma.envelope.findUnique({ where: { id: toEnvelopeId } }),
    ]);
    if (!src || !dst || src.accountId !== accountId || dst.accountId !== accountId) {
      return NextResponse.json({ error: 'Obálky nenalezeny' }, { status: 404 });
    }
    if (src.amountCZK < amt) {
      return NextResponse.json({ error: 'Nedostatek prostředků v zdrojové obálce' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedSrc = await tx.envelope.update({ where: { id: src.id }, data: { amountCZK: src.amountCZK - amt } });
      const updatedDst = await tx.envelope.update({ where: { id: dst.id }, data: { amountCZK: dst.amountCZK + amt } });
      const transfer = await tx.envelopeTransfer.create({
        data: {
          id: crypto.randomUUID(),
          accountId,
          fromEnvelopeId: src.id,
          toEnvelopeId: dst.id,
          amountCZK: amt,
          note: note || null,
        },
      });
      return { updatedSrc, updatedDst, transfer };
    });

    return NextResponse.json({
      transfer: {
        id: result.transfer.id,
        ts: result.transfer.ts.toISOString(),
        amountCZK: result.transfer.amountCZK,
        note: result.transfer.note || "",
        fromEnvelopeId: result.transfer.fromEnvelopeId,
        toEnvelopeId: result.transfer.toEnvelopeId,
      },
      envelopes: [
        { id: result.updatedSrc.id, amountCZK: result.updatedSrc.amountCZK },
        { id: result.updatedDst.id, amountCZK: result.updatedDst.amountCZK },
      ],
    });
  } catch (e) {
    console.error("API POST /accounts/[id]/envelopes/transfers error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


