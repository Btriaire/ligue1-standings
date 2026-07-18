// /api/tv — upcoming matches + broadcast channels for the TV tab.
//
// One endpoint returns the next batch of fixtures across L1 and L2 plus
// the matching broadcaster list. We deliberately keep the broadcaster data
// in `app/lib/broadcasts.ts` rather than calling out to a third-party
// rights API: no free public source returns French + international TV
// rights per match reliably, and the rights map is small and slow-moving
// enough to curate by hand.
//
// Sources per competition:
//   • FL1: football-data.org /competitions/FL1/matches?status=SCHEDULED
//   • FL2: FotMob /leagues/110/matches/ligue-2  (football-data.org's free
//     tier doesn't cover Ligue 2 — same fallback as everywhere else)

import { NextResponse } from "next/server";
import { fetchFotMobLigue2Matches, type FmLeagueMatch } from "@/app/lib/fotmob";

export const revalidate = 1800; // 30 min

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";

// ── Shared shape returned to the client ──────────────────────────────────────

export interface TvMatch {
  /** Stable id within the source (football-data id or FotMob id or string for hardcoded WC). */
  id: string;
  utcDate: string;          // ISO 8601
  matchday?: number;        // L1/L2 only — undefined for WC
  group?: string;           // WC only — e.g. "F", "I"
  stage?: string;           // WC only — e.g. "Phase de groupes", "Quart de finale"
  homeTeam: { name: string; shortName?: string; tla?: string; crest?: string };
  awayTeam: { name: string; shortName?: string; tla?: string; crest?: string };
  /** Optional notes ("J3 France", "Ouverture", "Clasico"…) */
  note?: string;
  /** Per-match broadcaster override names. The client joins with the default
   *  channel list from broadcasts.ts to render. Empty means "use defaults". */
  broadcastOverride?: string[];
}

interface TvResponse {
  l1:     { matches: TvMatch[]; source: "football-data" | "stub"; error?: string };
  l2:     { matches: TvMatch[]; source: "fotmob"        | "stub"; error?: string };
  updatedAt: string;
}

// ── Football-data.org → L1 ───────────────────────────────────────────────────

interface FdTeam { id: number; name: string; shortName?: string; tla?: string; crest?: string }
interface FdMatch {
  id: number;
  utcDate: string;
  matchday: number;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  status: string;
}

async function fetchL1(): Promise<{ matches: TvMatch[]; source: "football-data" | "stub"; error?: string }> {
  if (!FOOTBALL_DATA_API_KEY) {
    return { matches: [], source: "stub", error: "FOOTBALL_DATA_API_KEY manquante" };
  }
  try {
    const res = await fetch(
      "https://api.football-data.org/v4/competitions/FL1/matches?status=SCHEDULED,TIMED",
      { headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY }, next: { revalidate: 1800 } },
    );
    if (!res.ok) {
      return { matches: [], source: "stub", error: `football-data → ${res.status}` };
    }
    const json = await res.json() as { matches?: FdMatch[] };
    const all = json.matches ?? [];
    // Cap at 30 upcoming so the response stays small. Front-end filters further.
    const matches: TvMatch[] = all
      .slice(0, 30)
      .map(m => ({
        id: `fd-${m.id}`,
        utcDate: m.utcDate,
        matchday: m.matchday,
        homeTeam: { name: m.homeTeam.name, shortName: m.homeTeam.shortName, tla: m.homeTeam.tla, crest: m.homeTeam.crest },
        awayTeam: { name: m.awayTeam.name, shortName: m.awayTeam.shortName, tla: m.awayTeam.tla, crest: m.awayTeam.crest },
      }));
    return { matches, source: "football-data" };
  } catch (e) {
    return { matches: [], source: "stub", error: e instanceof Error ? e.message : "fetch error" };
  }
}

// ── FotMob → L2 ──────────────────────────────────────────────────────────────

function fmCrest(id?: number): string | undefined {
  return id ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png` : undefined;
}

async function fetchL2(): Promise<{ matches: TvMatch[]; source: "fotmob" | "stub"; error?: string }> {
  try {
    const raw = await fetchFotMobLigue2Matches();
    const now = Date.now();
    // Keep only future + currently-live matches; cap at 30 upcoming.
    const upcoming = raw
      .filter((m: FmLeagueMatch) => !m.status?.finished && new Date(m.status?.utcTime ?? 0).getTime() > now - 4 * 3600_000)
      .sort((a: FmLeagueMatch, b: FmLeagueMatch) => new Date(a.status.utcTime).getTime() - new Date(b.status.utcTime).getTime())
      .slice(0, 30);
    const matches: TvMatch[] = upcoming.map((m: FmLeagueMatch) => ({
      id: `fm-${m.id}`,
      utcDate: m.status.utcTime,
      matchday: typeof m.round === "number" ? m.round : Number.parseInt(String(m.round ?? ""), 10) || undefined,
      homeTeam: { name: m.home.name, shortName: m.home.shortName, crest: fmCrest(m.home.id) },
      awayTeam: { name: m.away.name, shortName: m.away.shortName, crest: fmCrest(m.away.id) },
    }));
    return { matches, source: "fotmob" };
  } catch (e) {
    return { matches: [], source: "stub", error: e instanceof Error ? e.message : "fetch error" };
  }
}


// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse<TvResponse>> {
  const [l1, l2] = await Promise.all([fetchL1(), fetchL2()]);
  return NextResponse.json({
    l1,
    l2,
    updatedAt: new Date().toISOString(),
  });
}
