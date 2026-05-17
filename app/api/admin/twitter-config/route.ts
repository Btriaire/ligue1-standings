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

// ── GET — read current handles config ────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getAdminFirestore();
    const doc = await db.collection("twitterConfig").doc("handles").get();
    const handles: Record<string, string> = doc.exists ? (doc.data() ?? {}) : {};
    return NextResponse.json({ handles });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── POST — save handles config ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json() as { handles: Record<string, string> };
    if (!body.handles || typeof body.handles !== "object") {
      return NextResponse.json({ error: "Missing handles object" }, { status: 400 });
    }
    // Sanitize: only keep non-empty string values, strip @ prefix
    const cleaned: Record<string, string> = {};
    for (const [clubId, handle] of Object.entries(body.handles)) {
      if (handle && typeof handle === "string") {
        cleaned[clubId] = handle.replace(/^@/, "").trim();
      }
    }
    const db = getAdminFirestore();
    await db.collection("twitterConfig").doc("handles").set({
      ...cleaned,
      _updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, saved: Object.keys(cleaned).length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
