import { NextRequest, NextResponse } from "next/server";
import { runT212Sync } from "@/lib/t212Sync";

export async function POST(_req: NextRequest) {
  try {
    const apiKey = process.env.T212_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing T212_API_KEY" }, { status: 500 });

    const { total } = await runT212Sync(apiKey);
    return NextResponse.json({ ok: true, total }, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Sync error' }, { status: 500 });
  }
}


