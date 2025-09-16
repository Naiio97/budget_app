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
    const { total } = await runT212Sync(apiKey);
    return NextResponse.json({ ok: true, total });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Cron error' }, { status: 500 });
  }
}


