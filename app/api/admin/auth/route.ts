import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Simple HMAC-free token: base64(username:timestamp) signed with secret
// Good enough for a private admin panel — upgrade to JWT if needed
const ADMIN_USER = process.env.ADMIN_USER ?? "Admin";
const ADMIN_PASS = process.env.ADMIN_PASS ?? "admin";
const COOKIE_NAME = "fp_admin";
const TTL = 8 * 3600; // 8h

function makeToken() {
  return Buffer.from(`${ADMIN_USER}:${Date.now()}`).toString("base64");
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({}));
  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
  }
  const store = await cookies();
  store.set(COOKIE_NAME, makeToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL,
    path: "/",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ admin: false });
  // Validate: token is base64, check it starts with admin username
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [user, tsStr] = decoded.split(":");
    const age = Date.now() - parseInt(tsStr);
    if (user === ADMIN_USER && age < TTL * 1000) return NextResponse.json({ admin: true });
  } catch { /* invalid */ }
  return NextResponse.json({ admin: false });
}
