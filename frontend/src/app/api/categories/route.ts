import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { categoryId } from "@/lib/categories";

// GET /api/categories - získat všechny kategorie
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ name: 'asc' }],
      include: { group: true },
    });
    
    const out = categories.map(c=> ({ id: c.id, name: c.name, groupId: (c as any).groupId ?? c.group?.id ?? null, groupName: c.group?.name ?? null }));
    return NextResponse.json(out, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Chyba při načítání kategorií:', error);
    return NextResponse.json(
      { error: 'Nepodařilo se načíst kategorie' },
      { status: 500 }
    );
  }
}

// POST /api/categories - přidat novou kategorii
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Název kategorie je povinný' },
        { status: 400 }
      );
    }
    
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return NextResponse.json(
        { error: 'Název kategorie nemůže být prázdný' },
        { status: 400 }
      );
    }
    
    // Zkontroluj, jestli kategorie už neexistuje
    const existingCategory = await prisma.category.findUnique({
      where: { name: trimmedName }
    });
    
    if (existingCategory) {
      return NextResponse.json(
        { error: 'Kategorie s tímto názvem už existuje' },
        { status: 409 }
      );
    }
    
    // Vytvoř novou kategorii
    const newCategory = await prisma.category.create({
      data: {
        id: categoryId(trimmedName),
        name: trimmedName
      }
    });
    
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Chyba při vytváření kategorie:', error);
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit kategorii' },
      { status: 500 }
    );
  }
}
