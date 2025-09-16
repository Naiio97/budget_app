import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.t212Position.findMany();
  return NextResponse.json(items);
}


