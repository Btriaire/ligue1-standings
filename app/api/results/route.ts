import { NextResponse } from "next/server";
import { fetchEspnResults, type ResultMatch, type EspnLeague } from "@/app/lib/espn-results";
import { getAdminFirestore } from "@/app/lib/firebase-admin";

export const revalidate = 300;

// Try ESPN first (fresh live data); if it fails, fall back to the
// Firestore archive populated by /api/cron/ingest-results.
async function readArchive(limit: number): Promise<ResultMatch[]> {
  try {
    const db = getAdminFirestore();
    const snap = await db.collection("matchResults")
      .orderBy("date", "desc")
      .limit(limit)
      .get();
    return snap.docs.map(d => d.data() as ResultMatch);
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
  const competition = url.searchParams.get("competition") ?? "FL1";
  const league: EspnLeague = competition === "FL2" ? "fra.2" : "fra.1";

  try {
    const all = await fetchEspnResults(28, league);
    const matches = all.slice(0, limit);
    return NextResponse.json({ matches, count: matches.length, source: "espn", competition });
  } catch (err) {
    console.error(`[/api/results] ESPN ${league} failed, falling back to archive:`, err);
    // Archive only stores L1 today; L2 returns empty until the ingest cron is widened.
    if (competition !== "FL1") {
      return NextResponse.json({ error: "Failed to fetch results", matches: [], count: 0, competition }, { status: 500 });
    }
    const matches = await readArchive(limit);
    if (matches.length > 0) {
      return NextResponse.json({ matches, count: matches.length, source: "archive" });
    }
    return NextResponse.json({ error: "Failed to fetch results", matches: [], count: 0 }, { status: 500 });
  }
}
