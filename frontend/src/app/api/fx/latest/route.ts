import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const latest = await prisma.fxRate.findFirst({ orderBy: { date: 'desc' } });
  if (!latest) return NextResponse.json({ rates: [], date: null });
  const list = await prisma.fxRate.findMany({ where: { date: latest.date } });
  return NextResponse.json({ date: latest.date, rates: list });
}


