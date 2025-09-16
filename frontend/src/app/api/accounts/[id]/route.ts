import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { GoCardlessAdapter } from "@/lib/gocardless";

const prisma = new PrismaClient();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await prisma.account.findUnique({ where: { id } });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // If linked, try to refresh live balance
    if (account.connectionId) {
      try {
        const adapter = new GoCardlessAdapter();
        // Access internals to call balances endpoint directly
        const token = await (adapter as any).getAccessToken?.();
        const baseUrl = (adapter as any).baseUrl as string;
        const res = await fetch(baseUrl + "/accounts/" + id + "/balances/", {
          headers: { Authorization: "Bearer " + token },
        });
        if (res.ok) {
          const data = await res.json();
          const balances: any[] = data.balances || [];
          const pickBestBalance = (list: any[]): any | null => {
            if (!Array.isArray(list) || list.length === 0) return null;
            const order = ["closingBooked", "closingAvailable", "interimAvailable", "interimBooked", "expected", "current"];
            const byType = new Map<string, any>();
            for (const b of list) {
              if (b.balanceType && !byType.has(b.balanceType)) byType.set(b.balanceType, b);
            }
            for (const t of order) if (byType.has(t)) return byType.get(t);
            return list[0];
          };
          const best = pickBestBalance(balances);
          const amountStr: string | undefined = best?.balanceAmount?.amount;
          const currency: string | undefined = best?.balanceAmount?.currency || account.currency;
          const refTs: string | undefined = best?.referenceDateTime || best?.referenceDate;
          const asOf = refTs ? new Date(refTs) : new Date();

          let balanceCZK: number | undefined = undefined;
          if (currency === "CZK" && typeof amountStr === "string") {
            const val = parseFloat(amountStr);
            if (!Number.isNaN(val)) balanceCZK = Math.round(val); // Ukládáme jako celá čísla (koruny)
          }

          const updated = await prisma.account.update({
            where: { id },
            data: { balanceCZK: balanceCZK ?? undefined, asOf },
          });
          return NextResponse.json(updated);
        }
      } catch (e) {
        // Ignore live refresh errors, fall back to stored account
      }
    }

    return NextResponse.json(account);
  } catch (e) {
    console.error("API /accounts/[id] error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { isVisible, customName, balanceCZK, asOf } = body as {
      isVisible?: boolean;
      customName?: string | null;
      balanceCZK?: number;
      asOf?: string;
    };

    // Validate input
    if (isVisible !== undefined && typeof isVisible !== "boolean") {
      return NextResponse.json({ error: "isVisible must be a boolean" }, { status: 400 });
    }

    if (customName !== undefined && customName !== null && typeof customName !== "string") {
      return NextResponse.json({ error: "customName must be a string or null" }, { status: 400 });
    }
    if (balanceCZK !== undefined && !Number.isFinite(balanceCZK)) {
      return NextResponse.json({ error: "balanceCZK must be a number" }, { status: 400 });
    }
    if (asOf !== undefined && Number.isNaN(Date.parse(asOf))) {
      return NextResponse.json({ error: "asOf must be a valid ISO date string" }, { status: 400 });
    }

    // Check if account exists
    const existingAccount = await prisma.account.findUnique({ where: { id } });
    if (!existingAccount) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Update account
    const updateData: any = {};
    if (isVisible !== undefined) updateData.isVisible = isVisible;
    if (customName !== undefined) updateData.customName = customName;
    // Umožni ruční úpravu zůstatku pouze pro manuální účty (bez connectionId)
    if (existingAccount.connectionId == null) {
      if (balanceCZK !== undefined) updateData.balanceCZK = Math.round(balanceCZK);
      if (asOf !== undefined) updateData.asOf = new Date(asOf);
    }

    const updatedAccount = await prisma.account.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedAccount);
  } catch (e) {
    console.error("API PATCH /accounts/[id] error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Smaž transakce účtu
    await prisma.transaction.deleteMany({ where: { accountId: id } });
    // Smaž účet
    await prisma.account.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("API DELETE /accounts/[id] error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}