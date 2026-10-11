import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession } from "@/app/lib/session";
import { ADMIN_COOKIE, createAdminToken, signPayload } from "@/app/lib/adminAuth";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "session";
const TTL_S  = 7 * 24 * 3600; // 7 days
const ADMIN_TTL_S = 7 * 24 * 3600; // 7 days

// ── Direct owner bypass — no Firebase required ────────────────
// Set ADMIN_EMAIL + ADMIN_PASS in Vercel env vars.
async function tryOwnerBypass(email: string, password: string): Promise<boolean> {
  const ownerEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_USER || "Admin";
  const ownerPass  = process.env.ADMIN_PASS;
  if (!ownerPass) return false; // no built-in default password
  if (email.toLowerCase() !== ownerEmail.toLowerCase() || password !== ownerPass) return false;
  const sessionToken = signPayload(`bypass:${email}:${Date.now()}`);
  const adminToken = createAdminToken(process.env.ADMIN_USER ?? "Admin");
  if (!sessionToken || !adminToken) return false; // ADMIN_SECRET missing

  const store = await cookies();

  // ── Set regular session cookie (unlocks predictions / emotional tabs) ──
  store.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL_S,
    path: "/",
  });

  // ── ALSO set admin cookie (unlocks /admin dashboard) ─────────
  store.set(ADMIN_COOKIE, adminToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_TTL_S,
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
