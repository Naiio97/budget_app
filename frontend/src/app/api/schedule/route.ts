import { NextRequest, NextResponse } from "next/server";

// Uložit plán synchronizace do localStorage-like per user není na serveru možné bez uživatele.
// Pro jednoduchost teď uložíme preferenci do cookie (client nastaví) a endpoint ji vrátí.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { times } = body as { times?: string[] };
    const list = Array.isArray(times) ? times.filter(t=>/^\d{2}:\d{2}$/.test(t)).slice(0,2) : [];
    if (list.length === 0) {
      return NextResponse.json({ error: 'Neplatný čas' }, { status: 400 });
    }
    const res = NextResponse.json({ ok: true, times: list });
    res.cookies.set('autoSyncTimes', JSON.stringify(list), { path: '/', maxAge: 60*60*24*365 });
    return res;
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const raw = req.cookies.get('autoSyncTimes')?.value || '[]';
  let times: string[] = [];
  try { times = JSON.parse(raw) } catch {}
  return NextResponse.json({ times });
}


