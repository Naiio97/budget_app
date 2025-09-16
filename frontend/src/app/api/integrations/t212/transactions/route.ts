import { NextRequest, NextResponse } from "next/server";

const BASE = "https://live.trading212.com";

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.T212_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing T212_API_KEY" }, { status: 500 });
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ?? '50';
    const time = searchParams.get('time') ?? '';
    const cursor = searchParams.get('cursor') ?? '';
    const qs = new URLSearchParams({ limit });
    if (time) qs.set('time', time);
    if (cursor) qs.set('cursor', cursor);
    const res = await fetch(`${BASE}/api/v0/history/transactions?${qs.toString()}`, {
      headers: { "Authorization": apiKey, "Accept": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `T212 error ${res.status}`, details: text.slice(0, 400) }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}


