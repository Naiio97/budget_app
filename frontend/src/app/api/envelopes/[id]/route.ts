import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Update one envelope
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, amountCZK } = body as { name?: string; amountCZK?: number };
    const data: any = {};
    if (name !== undefined) data.name = String(name);
    if (amountCZK !== undefined) {
      if (!Number.isFinite(amountCZK)) {
        return NextResponse.json({ error: 'amountCZK musí být číslo' }, { status: 400 });
      }
      data.amountCZK = Math.round(amountCZK);
    }
    const updated = await prisma.envelope.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("API PATCH /envelopes/[id] error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Delete one envelope
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.envelope.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("API DELETE /envelopes/[id] error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


