import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const list = await prisma.t212Snapshot.findMany({ orderBy: { id: 'asc' } });
  return NextResponse.json(list);
}


