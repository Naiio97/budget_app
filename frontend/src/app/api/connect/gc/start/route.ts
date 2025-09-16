import { NextResponse } from "next/server";
import { GoCardlessAdapter } from "@/lib/gocardless";

export async function POST(req: Request) {
  try {
    const { institutionId, redirectUrl } = await req.json();
    if (!institutionId || !redirectUrl) {
      return NextResponse.json({ error: "Missing institutionId or redirectUrl" }, { status: 400 });
    }

    const adapter = new GoCardlessAdapter();
    const { redirect, requisitionId } = await adapter.startConnection(institutionId, redirectUrl);

    return NextResponse.json({ redirect, requisitionId });
  } catch (e) {
    console.error("/api/connect/gc/start error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 