import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      where: {
        isVisible: {
          not: false // Zobrazit pouze viditelné účty (isVisible není false)
        }
      },
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
    
    console.log("API /accounts vrací:", transformedAccounts.map(acc => ({
      id: acc.id,
      accountName: acc.accountName,
      isVisible: acc.isVisible,
      customName: acc.customName,
      institutionLogo: acc.institutionLogo
    })));
    
    return NextResponse.json(transformedAccounts, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (e) {
    console.error("API /accounts error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { accountName, customName, balanceCZK, asOf } = body as {
      accountName?: string;
      customName?: string | null;
      balanceCZK?: number;
      asOf?: string;
    };

    if (!accountName || typeof accountName !== 'string') {
      return NextResponse.json({ error: 'accountName je povinný' }, { status: 400 });
    }
    const balance = Number.isFinite(balanceCZK) ? Math.round(balanceCZK as number) : 0;
    const asOfDate = asOf ? new Date(asOf) : new Date();

    const id = crypto.randomUUID();

    const created = await prisma.account.create({
      data: {
        id,
        provider: 'Vlastní',
        accountName,
        customName: customName ?? null,
        currency: 'CZK',
        balanceCZK: balance,
        asOf: asOfDate,
        externalId: null,
        iban: null,
        institutionId: null,
        connectionId: null,
        isVisible: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error('API POST /accounts error', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}