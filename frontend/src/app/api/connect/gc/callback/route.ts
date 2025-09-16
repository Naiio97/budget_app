import { NextResponse } from "next/server";
import { GoCardlessAdapter } from "@/lib/gocardless";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requisitionId = searchParams.get("requisition_id") || searchParams.get("requisitionId") || searchParams.get("ref");

    if (!requisitionId) {
      return NextResponse.json({ error: "Missing requisitionId" }, { status: 400 });
    }

    const adapter = new GoCardlessAdapter();
    await adapter.finalizeConnection(requisitionId);

    // Redirect back to settings page with requisition_id so client can auto-sync
    const redirectUrl = new URL("/settings", req.url);
    redirectUrl.searchParams.set("requisition_id", requisitionId);
    redirectUrl.searchParams.set("tab", "bank");
    return NextResponse.redirect(redirectUrl);
  } catch (e) {
    console.error("/api/connect/gc/callback error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 