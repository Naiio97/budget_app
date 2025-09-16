import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      include: {
        institution: {
          select: {
            logo: true
          }
        }
      },
      orderBy: [{ provider: "asc" }, { accountName: "asc" }],
    });
    
    // Transformovat data pro kompatibilitu s frontendem
    const transformedAccounts = accounts.map(acc => ({
      ...acc,
      institutionLogo: acc.institution?.logo || null
    }));
    
    return NextResponse.json(transformedAccounts, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (e) {
    console.error("API /accounts/all error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
