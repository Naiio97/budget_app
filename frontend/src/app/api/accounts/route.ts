import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: [{ provider: "asc" }, { accountName: "asc" }],
    });
    return NextResponse.json(accounts);
  } catch (e) {
    console.error("API /accounts error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
