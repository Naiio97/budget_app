import { NextResponse } from "next/server";
import { GoCardlessAdapter } from "@/lib/gocardless";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const adapter = new GoCardlessAdapter();
    const institutions = await adapter.getInstitutions();
    
    // Uložit instituce do databáze
    for (const institution of institutions) {
      await prisma.institution.upsert({
        where: { id: institution.id },
        update: {
          name: institution.name,
          country: institution.country || undefined,
          logo: institution.logo,
          website: institution.website || undefined,
        },
        create: {
          id: institution.id,
          name: institution.name,
          country: institution.country || "Unknown",
          logo: institution.logo,
          website: institution.website || undefined,
        },
      });
    }
    
    console.log(`Uloženo ${institutions.length} institucí do databáze`);
    return NextResponse.json(institutions);
  } catch (e) {
    console.error("/api/institutions error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
