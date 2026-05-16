import { getAdminAuth } from "./firebase-admin";
import { cookies } from "next/headers";

const COOKIE = "session";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
}

export async function createSession(idToken: string) {
  const adminAuth = getAdminAuth();
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: TTL_MS });
  const store = await cookies();
  store.set(COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL_MS / 1000,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const store = await cookies();
    const cookie = store.get(COOKIE)?.value;
    if (!cookie) return null;

    // ── Bypass token (owner login without Firebase) ────────────
    // Format: base64(JSON {type:"bypass", email, ts})
    try {
      const raw = Buffer.from(cookie, "base64").toString("utf-8");
      if (raw.startsWith("{")) {
        const p = JSON.parse(raw) as { type?: string; email?: string; ts?: number };
        if (p.type === "bypass" && p.email && p.ts) {
          const ownerEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_USER || "Admin";
          if (p.email.toLowerCase() === ownerEmail.toLowerCase() && Date.now() - p.ts < TTL_MS) {
            return { userId: "owner", email: p.email, name: "Admin" };
          }
          return null; // expired or email mismatch
        }
      }
    } catch { /* not a bypass token — fall through to Firebase */ }

    // ── Normal Firebase session cookie ─────────────────────────
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    return { userId: decoded.uid, email: decoded.email ?? "", name: (decoded.name as string) ?? "" };
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const store = await cookies();
  try {
    const cookie = store.get(COOKIE)?.value;
    if (cookie) {
      // Only try Firebase revoke for non-bypass tokens
      const raw = Buffer.from(cookie, "base64").toString("utf-8");
      if (!raw.startsWith("{")) {
        const adminAuth = getAdminAuth();
        const decoded = await adminAuth.verifySessionCookie(cookie);
        await adminAuth.revokeRefreshTokens(decoded.sub);
      }
    }
  } catch { /* ignore */ }
  store.delete(COOKIE);
}
