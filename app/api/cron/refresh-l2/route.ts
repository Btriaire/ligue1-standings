import { isCronRequest } from "@/app/lib/adminAuth";
// Daily cron — snapshots Ligue 2 standings + fixtures from FotMob into
// Firestore. Pure safety net: the live routes (/api/standings?competition=FL2,
// /api/tv) already scrape FotMob directly and refresh far more often (60s /
// 30min revalidate). This cron exists purely so that when the live scrape
// breaks — FotMob reshapes its page, rate-limits us, whatever — those routes
// have a real "last known good" snapshot to fall back to instead of an empty
// array. See app/lib/l2Snapshot.ts for the read/write helpers and
// app/lib/fotmob.ts for why L2 has no official API to lean on instead.
//
// Also posts a webhook alert (reusing VERACITY_WEBHOOK_URL) when the FotMob
// fetch itself fails, so a broken scrape gets noticed instead of silently
// degrading to stale data forever.

import { NextResponse } from "next/server";
import { fetchFotMobLigue2, fetchFotMobLigue2Matches, fotmobTableToStandings } from "@/app/lib/fotmob";
import { writeL2StandingsSnapshot, writeL2MatchesSnapshot } from "@/app/lib/l2Snapshot";

export const maxDuration = 60;

function isAuthorized(req: Request): boolean {
  return isCronRequest(req);
}

async function alertWebhook(text: string) {
  const hookUrl = process.env.VERACITY_WEBHOOK_URL;
  if (!hookUrl) return;
  try {
    await fetch(hookUrl, { signal: AbortSignal.timeout(8000), 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Non-fatal — an unreachable webhook shouldn't fail the cron.
  }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return new NextResponse("Unauthorized", { status: 401 });

  const results = { standings: false, matches: false };
  const errors: string[] = [];

  try {
    const fm = await fetchFotMobLigue2();
    await writeL2StandingsSnapshot(fotmobTableToStandings(fm));
    results.standings = true;
  } catch (e) {
    errors.push(`standings: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const matches = await fetchFotMobLigue2Matches();
    await writeL2MatchesSnapshot(matches);
    results.matches = true;
  } catch (e) {
    errors.push(`matches: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (errors.length > 0) {
    await alertWebhook(
      `⚠️ refresh-l2 : ${errors.length}/2 fetch(s) FotMob en échec\n\n${errors.join("\n")}`,
    );
  }

  return NextResponse.json({
    ok: errors.length === 0,
    refreshedAt: new Date().toISOString(),
    ...results,
    errors,
  });
}

// POST behaves the same as GET, for symmetry with /api/admin/trigger.
export async function POST(req: Request) { return GET(req); }
