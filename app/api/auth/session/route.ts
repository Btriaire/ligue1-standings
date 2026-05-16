import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession } from "@/app/lib/session";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "session";
const TTL_S = 7 * 24 * 3600; // 7 days

// ── Direct owner bypass — no Firebase required ────────────────
// Set ADMIN_EMAIL + ADMIN_PASS in Vercel env vars.
// The login page tries Firebase first; if that fails for any reason
// (wrong env vars, email verification, project misconfigured), it
// falls back to this endpoint automatically.
async function tryOwnerBypass(email: string, password: string): Promise<boolean> {
  const ownerEmail = process.env.ADMIN_EMAIL ?? "";
  const ownerPass  = process.env.ADMIN_PASS  ?? "";
  if (!ownerEmail || email !== ownerEmail || password !== ownerPass) return false;

  const payload = JSON.stringify({ type: "bypass", email, ts: Date.now() });
  const token = Buffer.from(payload).toString("base64");

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL_S,
    path: "/",
  });
  return true;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    idToken?: string;
    email?: string;
    password?: string;
  };

  // 1. Direct bypass (called when Firebase fails, or email+password submitted directly)
  if (body.email && body.password && !body.idToken) {
    const ok = await tryOwnerBypass(body.email, body.password);
    if (ok) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // 2. Normal Firebase session cookie flow
  if (!body.idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }
  try {
    await createSession(body.idToken);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Firebase session creation failed:", e);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
