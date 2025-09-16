import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/category-groups - seznam skupin
export async function GET() {
  try {
    const groups = await prisma.categoryGroup.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(groups, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (e) {
    console.error('GET /api/category-groups error', e);
    return NextResponse.json({ error: 'Chyba při načítání skupin' }, { status: 500 });
  }
}

// POST /api/category-groups - vytvořit skupinu
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nameRaw = String(body?.name || '').trim();
    if (!nameRaw) return NextResponse.json({ error: 'Název je povinný' }, { status: 400 });
    const maxOrder = await prisma.categoryGroup.aggregate({ _max: { order: true } });
    const created = await prisma.categoryGroup.create({ data: { id: nameRaw.toLowerCase().replace(/\s+/g,'-'), name: nameRaw, order: (maxOrder._max.order ?? 0) + 1 } });
    return NextResponse.json(created, { status: 201 });
  } catch (e:any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Skupina s tímto názvem již existuje' }, { status: 409 });
    }
    console.error('POST /api/category-groups error', e);
    return NextResponse.json({ error: 'Chyba při vytváření skupiny' }, { status: 500 });
  }
}


