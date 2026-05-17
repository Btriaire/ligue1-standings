import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebase-admin";

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

// Strip meta keys (those starting with "_") so they don't leak into UI as handles
function stripMeta(data: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!k.startsWith("_") && typeof v === "string") out[k] = v;
  }
  return out;
}

// ── GET — read current handles config ────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getAdminFirestore();
    const doc = await db.collection("twitterConfig").doc("handles").get();
    const raw = doc.exists ? (doc.data() ?? {}) : {};
    const handles = stripMeta(raw as Record<string, unknown>);
    return NextResponse.json({ handles });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── POST — save handles config ────────────────────────────────────────────────
// Empty strings are kept as explicit "disable this club" markers so cleared
// values persist on reload (otherwise DEFAULT_HANDLES would repopulate them).
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json() as { handles: Record<string, string> };
    if (!body.handles || typeof body.handles !== "object") {
      return NextResponse.json({ error: "Missing handles object" }, { status: 400 });
    }
    const cleaned: Record<string, string> = {};
    for (const [clubId, handle] of Object.entries(body.handles)) {
      if (typeof handle !== "string") continue;
      cleaned[clubId] = handle.replace(/^@/, "").trim();
    }
    const db = getAdminFirestore();
    // Full overwrite (no merge) so removed keys are actually dropped.
    await db.collection("twitterConfig").doc("handles").set({
      ...cleaned,
      _updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, saved: Object.keys(cleaned).length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
