import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/category-groups/[id] - přejmenovat nebo změnit pořadí
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: any = {};
    if (typeof body?.name === 'string') data.name = body.name.trim();
    if (Number.isFinite(body?.order)) data.order = Number(body.order);
    const updated = await prisma.categoryGroup.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('PATCH /api/category-groups/[id] error', e);
    return NextResponse.json({ error: 'Chyba při úpravě skupiny' }, { status: 500 });
  }
}

// DELETE /api/category-groups/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Odeber groupId z kategorií, které ji používají
    await prisma.category.updateMany({ where: { groupId: id }, data: { groupId: null } });
    await prisma.categoryGroup.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/category-groups/[id] error', e);
    return NextResponse.json({ error: 'Chyba při mazání skupiny' }, { status: 500 });
  }
}


