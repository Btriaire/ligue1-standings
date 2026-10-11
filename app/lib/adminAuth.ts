// Signed cookies for admin + owner sessions. Format: base64url("<payload>.<hmac>"),
// HMAC-SHA256 keyed with ADMIN_SECRET. Without ADMIN_SECRET nothing is signed or
// accepted (fail closed).
import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "fp_admin";
export const ADMIN_TTL_MS = 8 * 3600 * 1000;

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("hex");
}

export function signPayload(payload: string): string | null {
  const key = process.env.ADMIN_SECRET;
  if (!key) return null;
  return Buffer.from(`${payload}.${sign(payload, key)}`).toString("base64url");
}

// Returns the payload when the signature is valid, otherwise null.
export function openPayload(token: string | undefined | null): string | null {
  const key = process.env.ADMIN_SECRET;
  if (!key || !token) return null;
  const decoded = Buffer.from(token, "base64url").toString("utf-8");
  const dot = decoded.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = decoded.slice(0, dot);
  const sig = Buffer.from(decoded.slice(dot + 1));
  const expected = Buffer.from(sign(payload, key));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  return payload;
}

export function createAdminToken(user: string): string | null {
  return signPayload(`${user}:${Date.now()}`);
}

export function isAdminToken(token: string | undefined | null): boolean {
  const payload = openPayload(token);
  if (!payload) return false;
  const [user, ts] = payload.split(":");
  const adminUser = process.env.ADMIN_USER ?? "Admin";
  return user.toLowerCase() === adminUser.toLowerCase() && Date.now() - Number(ts) < ADMIN_TTL_MS;
}

// Cron: Bearer CRON_SECRET (only when it is set) or a valid admin cookie.
export function isCronRequest(req: Request): boolean {
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  const cookie = (req.headers.get("cookie") ?? "").match(/(?:^|;\s*)fp_admin=([^;]+)/)?.[1];
  return isAdminToken(cookie);
}
