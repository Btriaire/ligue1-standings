import { adminAuth } from "./firebase-admin";
import { cookies } from "next/headers";

const COOKIE = "session";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
}

export async function createSession(idToken: string) {
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
      const decoded = await adminAuth.verifySessionCookie(cookie);
      await adminAuth.revokeRefreshTokens(decoded.sub);
    }
  } catch { /* ignore */ }
  store.delete(COOKIE);
}
