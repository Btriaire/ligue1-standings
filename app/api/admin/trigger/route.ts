import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";


function checkAdmin(req: NextRequest): boolean {
  return isAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
}

// Manually trigger any cron endpoint
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { path } = await req.json().catch(() => ({})) as { path?: string };
  if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const secret = process.env.CRON_SECRET ?? "";
  const t0 = Date.now();
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(60000),
    } as RequestInit);
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok, status: res.status, ms: Date.now() - t0, body });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e), ms: Date.now() - t0 }, { status: 500 });
  }
}
