import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cash = await prisma.t212Cash.findUnique({ where: { id: 't212-cash' } });
  return NextResponse.json(cash || {});
}


