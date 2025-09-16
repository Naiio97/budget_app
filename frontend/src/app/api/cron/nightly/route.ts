import { NextRequest, NextResponse } from "next/server";
import { runT212Sync } from "@/lib/t212Sync";

export async function GET(req: NextRequest) {
  const apiKey = process.env.T212_API_KEY;
  const token = process.env.CRON_SECRET;
  if (!apiKey || !token) return NextResponse.json({ error: 'Missing env' }, { status: 500 });
  const header = req.headers.get('x-cron-secret');
  const qsToken = new URL(req.url).searchParams.get('token');
  if (header !== token && qsToken !== token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const base = new URL(req.url).origin;
    // 1) Kurzy ČNB
    const fxRes = await fetch(`${base}/api/fx/cnb/sync`, { method: 'POST' });
    // 2) Trading 212
    const { total } = await runT212Sync(apiKey);
    // 3) GoCardless (všechny requisitions)
    const gcRes = await fetch(`${base}/api/sync/gc?cron=true`, { method: 'GET', headers: { 'x-cron-secret': token } }).catch(()=>null);
    return NextResponse.json({ ok: true, t212Total: total, fxOk: fxRes.ok, gcOk: gcRes?.ok ?? false });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Cron error' }, { status: 500 });
  }
}


