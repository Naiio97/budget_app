import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/transactions/[id] - aktualizovat kategorii transakce
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { categoryId } = body;
    
    // categoryId může být string (ID kategorie) nebo null (pro odstranění kategorie)
    if (categoryId !== null && categoryId !== undefined && typeof categoryId !== 'string') {
      return NextResponse.json(
        { error: 'categoryId musí být string nebo null' },
        { status: 400 }
      );
    }
    
    // Zkontroluj, jestli transakce existuje
    const transaction = await prisma.transaction.findUnique({
      where: { id }
    });
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transakce nenalezena' },
        { status: 404 }
      );
    }
    
    // Pokud je categoryId poskytnuto, zkontroluj jestli kategorie existuje
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      });
      
      if (!category) {
        return NextResponse.json(
          { error: 'Kategorie nenalezena' },
          { status: 404 }
        );
      }
    }
    
    // Aktualizuj transakci
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: { categoryId: categoryId || null },
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
    
    // Vrať aktualizovanou transakci ve stejném formátu jako ostatní API
    const result = {
      id: updatedTransaction.id,
      ts: updatedTransaction.ts.toISOString(),
      rawDescription: updatedTransaction.rawDescription,
      category: updatedTransaction.category?.name || "Nezařazeno",
      categoryId: updatedTransaction.categoryId,
      amountCZK: updatedTransaction.amountCZK,
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Chyba při aktualizaci transakce:', error);
    return NextResponse.json(
      { error: 'Nepodařilo se aktualizovat transakci' },
      { status: 500 }
    );
  }
}
