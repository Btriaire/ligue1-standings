import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, ADMIN_TTL_MS, createAdminToken, isAdminToken } from "@/app/lib/adminAuth";

export const dynamic = "force-dynamic";

// Login needs ADMIN_SECRET (token signing) and ADMIN_PASS (no built-in default).
const TTL_S = ADMIN_TTL_MS / 1000;

export async function POST(req: NextRequest) {
  const adminUser = process.env.ADMIN_USER ?? "Admin";
  const adminPass = process.env.ADMIN_PASS;
  if (!adminPass) return NextResponse.json({ error: "ADMIN_PASS non configuré" }, { status: 503 });
  const { username, password } = await req.json().catch(() => ({}));
  if (username?.toLowerCase() !== adminUser.toLowerCase() || password !== adminPass) {
    return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
  }
  const token = createAdminToken(adminUser);
  if (!token) return NextResponse.json({ error: "ADMIN_SECRET non configuré" }, { status: 503 });
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL_S,
    path: "/",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const store = await cookies();
  return NextResponse.json({ admin: isAdminToken(store.get(ADMIN_COOKIE)?.value) });
}
