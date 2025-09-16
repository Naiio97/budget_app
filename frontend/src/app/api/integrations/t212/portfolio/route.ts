import { NextRequest, NextResponse } from "next/server";

const BASE = "https://live.trading212.com";

let lastPortfolioJson: any | null = null;
let lastPortfolioAt = 0;

async function t212Fetch(path: string, apiKey: string) {
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Authorization": apiKey,
    "api-key": apiKey,
    "X-API-Key": apiKey,
  };
  let res: Response | null = null;
  for (let i = 0; i < 3; i++) {
    res = await fetch(`${BASE}${path}`, { headers, cache: "no-store" });
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      await new Promise(r => setTimeout(r, 400 * (i + 1)));
      continue;
    }
    break;
  }
  return res!;
}

export async function GET(_req: NextRequest) {
  try {
    const apiKey = process.env.T212_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing T212_API_KEY" }, { status: 500 });

    // krátká cache, aby se vyhnulo dvojímu volání v dev režimu
    if (Date.now() - lastPortfolioAt < 5000 && lastPortfolioJson) {
      return NextResponse.json(lastPortfolioJson, { status: 200 });
    }

    const res = await t212Fetch(`/api/v0/equity/portfolio`, apiKey);
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `T212 error ${res.status}`, details: text.slice(0, 400) }, { status: 502 });
    }
    const data = await res.json();
    lastPortfolioJson = data; lastPortfolioAt = Date.now();
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}


