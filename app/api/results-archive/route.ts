import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebase-admin";
import type { ResultMatch } from "@/app/lib/espn-results";

export const dynamic = "force-dynamic";

// Public query endpoint for the persisted match-results archive.
//
// Query params (all optional):
//   season=2024-2025      — filter by season string (Aug→May convention)
//   teamId=524            — match either home OR away (post-filter, Firestore can't OR)
//   from=2025-01-01       — ISO date, inclusive lower bound
//   to=2025-05-31         — ISO date, inclusive upper bound
//   limit=100             — max docs returned (clamped 1–500, default 100)
//   stats=1               — also return aggregate stats (W/D/L, goals, cards)
//
// Returns: { matches: ResultMatch[], count, stats?: {...}, meta?: {...} }

interface ArchiveStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  yellowCards: number;
  redCards: number;
  homeWins: number;
  awayWins: number;
}

function computeStats(matches: ResultMatch[], teamId: number | null): ArchiveStats {
  const s: ArchiveStats = {
    played: 0, wins: 0, draws: 0, losses: 0,
    goalsFor: 0, goalsAgainst: 0,
    yellowCards: 0, redCards: 0,
    homeWins: 0, awayWins: 0,
  };
  for (const m of matches) {
    s.played++;
    if (m.result === "home") s.homeWins++;
    if (m.result === "away") s.awayWins++;
    const yellows = [...m.homeCards, ...m.awayCards].filter(c => c.card === "YELLOW_CARD").length;
    const reds    = [...m.homeCards, ...m.awayCards].filter(c => c.card === "RED_CARD").length;
    s.yellowCards += yellows;
    s.redCards    += reds;

    if (teamId == null) continue;
    const isHome = m.homeTeam.id === teamId;
    const isAway = m.awayTeam.id === teamId;
    if (!isHome && !isAway) continue;
    const own  = isHome ? m.score.home : m.score.away;
    const opp  = isHome ? m.score.away : m.score.home;
    s.goalsFor      += own;
    s.goalsAgainst  += opp;
    if (own > opp) s.wins++;
    else if (own < opp) s.losses++;
    else s.draws++;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season");
  const teamIdRaw = searchParams.get("teamId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "100"), 1), 500);
  const includeStats = searchParams.get("stats") === "1";

  const teamId = teamIdRaw ? parseInt(teamIdRaw) : null;

  try {
    const db = getAdminFirestore();
    let q = db.collection("matchResults").orderBy("date", "desc") as FirebaseFirestore.Query;

    if (season) q = q.where("season", "==", season);
    if (from)   q = q.where("date", ">=", new Date(from).toISOString());
    if (to)     q = q.where("date", "<=", new Date(to).toISOString());

    // Pull a larger window if we need to post-filter by teamId (Firestore
    // can't OR home/away in one query); 500 is the hard cap.
    const fetchLimit = teamId ? 500 : limit;
    const snap = await q.limit(fetchLimit).get();

    let matches = snap.docs
      .filter(d => d.id !== "_meta")
      .map(d => d.data() as ResultMatch);

    if (teamId) {
      matches = matches.filter(m => m.homeTeam.id === teamId || m.awayTeam.id === teamId);
      matches = matches.slice(0, limit);
    }

    const meta = await db.collection("matchResults").doc("_meta").get()
      .then(d => d.exists ? d.data() : null)
      .catch(() => null);

    const body: Record<string, unknown> = {
      matches,
      count: matches.length,
      meta,
    };
    if (includeStats) body.stats = computeStats(matches, teamId);

    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e), matches: [], count: 0 }, { status: 500 });
  }
}
