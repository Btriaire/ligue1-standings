// Admin + cron auth. The admin cookie is `base64url("<user>:<timestamp>.<hmac>")`,
// signed with ADMIN_SECRET. Without ADMIN_SECRET nobody is admin (fail closed).
import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "fp_admin";
export const ADMIN_TTL_MS = 8 * 3600 * 1000;

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("hex");
}

export function createAdminToken(user: string): string | null {
  const key = process.env.ADMIN_SECRET;
  if (!key) return null;
  const payload = `${user}:${Date.now()}`;
  return Buffer.from(`${payload}.${sign(payload, key)}`).toString("base64url");
}

export function isAdminToken(token: string | undefined | null): boolean {
  const key = process.env.ADMIN_SECRET;
  if (!key || !token) return false;
  const decoded = Buffer.from(token, "base64url").toString("utf-8");
  const dot = decoded.lastIndexOf(".");
  if (dot < 0) return false;
  const payload = decoded.slice(0, dot);
  const sig = Buffer.from(decoded.slice(dot + 1));
  const expected = Buffer.from(sign(payload, key));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return false;
  const [user, ts] = payload.split(":");
  const adminUser = process.env.ADMIN_USER ?? "Admin";
  return user.toLowerCase() === adminUser.toLowerCase() && Date.now() - Number(ts) < ADMIN_TTL_MS;
}

// Plain Request (cron routes): reads the admin cookie from the raw header.
function adminCookieFrom(req: Request): string | undefined {
  return (req.headers.get("cookie") ?? "").match(/(?:^|;\s*)fp_admin=([^;]+)/)?.[1];
}

// Cron: Bearer CRON_SECRET (only when it is set) or a valid admin cookie.
export function isCronRequest(req: Request): boolean {
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  return isAdminToken(adminCookieFrom(req));
}
