import { NextResponse } from "next/server";
import { fetchEspnResults } from "@/app/lib/espn-results";
import { getAdminFirestore } from "@/app/lib/firebase-admin";

export const dynamic = "force-dynamic";

// Vercel Cron entry point. Pulls finished L1 matches from ESPN over a
// 90-day rolling window and upserts each into Firestore under
// `matchResults/{id}`. Idempotent — re-running just refreshes the same docs.
//
// Doc shape: full ResultMatch + ingestedAt timestamp.
//
// Auth: same Bearer CRON_SECRET pattern as other crons. Admin trigger
// uses /api/admin/trigger which adds the header automatically.

async function ingest(daysBack: number) {
  const matches = await fetchEspnResults(daysBack);
  const db = getAdminFirestore();
  const col = db.collection("matchResults");

  // Firestore batch limit is 500 ops — well above any realistic L1 window.
  const batch = db.batch();
  const now = new Date().toISOString();
  for (const m of matches) {
    const doc = col.doc(String(m.id));
    batch.set(doc, { ...m, ingestedAt: now }, { merge: true });
  }
  if (matches.length > 0) await batch.commit();

  // Also write a meta doc so the admin UI can show last-run info.
  await db.collection("matchResults").doc("_meta").set({
    lastRun: now,
    windowDays: daysBack,
    count: matches.length,
    seasons: Array.from(new Set(matches.map(m => m.season))).sort(),
  });

  return { ingested: matches.length, seasons: Array.from(new Set(matches.map(m => m.season))) };
}

function isAuthorized(req: Request): boolean {
  // Allow Vercel cron header
  if (req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`) return true;
  // Allow admin session cookie (so admin "Run now" button works without CRON_SECRET exposure)
  const cookie = req.headers.get("cookie") ?? "";
  if (/(?:^|;\s*)fp_admin=([^;]+)/.test(cookie)) {
    const m = cookie.match(/fp_admin=([^;]+)/);
    if (m) {
      try {
        const [user, ts] = Buffer.from(m[1], "base64").toString("utf-8").split(":");
        if (user === (process.env.ADMIN_USER ?? "Admin") && Date.now() - parseInt(ts) < 8 * 3600 * 1000) {
          return true;
        }
      } catch { /* ignore */ }
    }
  }
  return false;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return new NextResponse("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get("days") ?? "90"), 365);
  try {
    const out = await ingest(days);
    return NextResponse.json({ ok: true, ...out });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// POST behaves the same as GET, for symmetry with /api/admin/trigger.
export async function POST(req: Request) { return GET(req); }
