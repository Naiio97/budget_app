import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/categories/[id] - smazat kategorii
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);
    
    // Zkontroluj, jestli kategorie existuje
    const category = await prisma.category.findUnique({
      where: { id }
    });
    
    if (!category) {
      return NextResponse.json(
        { error: 'Kategorie nenalezena' },
        { status: 404 }
      );
    }
    
    // Zkontroluj, jestli kategorie není používána v transakcích
    const transactionCount = await prisma.transaction.count({
      where: { categoryId: id }
    });
    
    if (transactionCount > 0) {
      return NextResponse.json(
        { error: `Kategorie nelze smazat, protože je používána v ${transactionCount} transakcích` },
        { status: 409 }
      );
    }
    
    // Zkontroluj, jestli kategorie není používána v pravidlech
    const ruleCount = await prisma.rule.count({
      where: { categoryId: id }
    });
    
    if (ruleCount > 0) {
      return NextResponse.json(
        { error: `Kategorie nelze smazat, protože je používána v ${ruleCount} pravidlech` },
        { status: 409 }
      );
    }
    
    // Smaž kategorii
    await prisma.category.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Kategorie byla úspěšně smazána' });
  } catch (error) {
    console.error('Chyba při mazání kategorie:', error);
    return NextResponse.json(
      { error: 'Nepodařilo se smazat kategorii' },
      { status: 500 }
    );
  }
}

// PUT /api/categories/[id] - upravit kategorii
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);
    const body = await request.json();
    const { name, groupId } = body;
    
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
    
    // Zkontroluj, jestli kategorie existuje
    const category = await prisma.category.findUnique({
      where: { id }
    });
    
    if (!category) {
      return NextResponse.json(
        { error: 'Kategorie nenalezena' },
        { status: 404 }
      );
    }
    
    // Zkontroluj, jestli jiná kategorie už nemá tento název
    const existingCategory = await prisma.category.findFirst({
      where: { 
        name: trimmedName,
        id: { not: id }
      }
    });
    
    if (existingCategory) {
      return NextResponse.json(
        { error: 'Kategorie s tímto názvem už existuje' },
        { status: 409 }
      );
    }
    
    // Aktualizuj kategorii (název + přiřazení skupiny)
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { name: trimmedName, groupId: typeof groupId === 'string' && groupId.trim() ? groupId.trim() : null }
    });
    
    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Chyba při úpravě kategorie:', error);
    return NextResponse.json(
      { error: 'Nepodařilo se upravit kategorii' },
      { status: 500 }
    );
  }
}
