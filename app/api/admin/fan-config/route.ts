// Persists the fan-ecosystem overrides edited from the admin page.
// Storage: `fanConfig/entries` document in Firestore, one map keyed by
// stable entity id (e.g. "club:524", "nation:FRA"). The defaults still
// live in `app/lib/fanConfig.ts` — this collection only stores overrides
// so removing a row falls back to the bundled defaults.

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebase-admin";
import type { FanEntry } from "@/app/lib/fanConfig";

export const dynamic = "force-dynamic";

const ADMIN_USER = process.env.ADMIN_USER ?? "Admin";
const COOKIE_NAME = "fp_admin";
const TTL = 8 * 3600 * 1000;

function checkAdmin(req: NextRequest): boolean {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [user, tsStr] = decoded.split(":");
    return user === ADMIN_USER && Date.now() - parseInt(tsStr) < TTL;
  } catch { return false; }
}

function isFanEntry(x: unknown): x is FanEntry {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  return Array.isArray(e.twitter) && Array.isArray(e.sites) && Array.isArray(e.hashtags);
}

function stripMeta(data: Record<string, unknown>): Record<string, FanEntry> {
  const out: Record<string, FanEntry> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith("_")) continue;
    if (isFanEntry(v)) out[k] = v;
  }
  return out;
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getAdminFirestore();
    const doc = await db.collection("fanConfig").doc("entries").get();
    const raw = doc.exists ? (doc.data() ?? {}) : {};
    const overrides = stripMeta(raw as Record<string, unknown>);
    return NextResponse.json({ overrides });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json() as { overrides: Record<string, FanEntry> };
    if (!body.overrides || typeof body.overrides !== "object") {
      return NextResponse.json({ error: "Missing overrides object" }, { status: 400 });
    }
    const cleaned: Record<string, FanEntry> = {};
    for (const [id, entry] of Object.entries(body.overrides)) {
      if (!isFanEntry(entry)) continue;
      cleaned[id] = {
        twitter: entry.twitter
          .filter((t) => t && typeof t.handle === "string" && t.handle.trim())
          .map((t) => ({
            handle: t.handle.replace(/^@/, "").trim(),
            name: (t.name || "").trim(),
            kind: t.kind ?? "fan",
            ...(t.followers ? { followers: t.followers.trim() } : {}),
          })),
        sites: entry.sites
          .filter((s) => s && typeof s.url === "string" && s.url.trim())
          .map((s) => ({ name: (s.name || "").trim(), url: s.url.trim() })),
        hashtags: entry.hashtags
          .map((h) => (typeof h === "string" ? h.trim() : ""))
          .filter(Boolean),
      };
    }
    const db = getAdminFirestore();
    await db.collection("fanConfig").doc("entries").set({
      ...cleaned,
      _updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, saved: Object.keys(cleaned).length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
