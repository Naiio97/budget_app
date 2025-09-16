import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const institutions = await prisma.institution.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log(`Načteno ${institutions.length} institucí z databáze`);
    return NextResponse.json(institutions);
  } catch (e) {
    console.error("/api/institutions/db error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
