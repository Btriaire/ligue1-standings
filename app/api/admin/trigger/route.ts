import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const ADMIN_USER = process.env.ADMIN_USER ?? "Admin";
const COOKIE_NAME = "fp_admin";
const TTL = 8 * 3600 * 1000;

async function checkAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [user, tsStr] = decoded.split(":");
    return user === ADMIN_USER && Date.now() - parseInt(tsStr) < TTL;
  } catch { return false; }
}

// Manually trigger any cron endpoint
export async function POST(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
