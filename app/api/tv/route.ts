// /api/tv — upcoming matches + broadcast channels for the TV tab.
//
// One endpoint returns the next batch of fixtures across L1, L2, and the
// World Cup 2026 plus the matching broadcaster list. We deliberately keep
// the broadcaster data in `app/lib/broadcasts.ts` rather than calling out
// to a third-party rights API: no free public source returns
// French + international TV rights per match reliably, and the rights map
// is small and slow-moving enough to curate by hand.
//
// Sources per competition:
//   • FL1: football-data.org /competitions/FL1/matches?status=SCHEDULED
//   • FL2: FotMob /leagues/110/matches/ligue-2  (football-data.org's free
//     tier doesn't cover Ligue 2 — same fallback as everywhere else)
//   • WC2026: hardcoded list of marquee matches in this file. The full
//     104-match schedule isn't worth shipping until close to the tournament;
//     this list focuses on group-stage France games + opener + knockouts.

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
  cdm:    { matches: TvMatch[]; source: "static" };
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

// ── Static → World Cup 2026 ──────────────────────────────────────────────────
// Marquee matches across the tournament window (11 juin – 19 juillet 2026).
// Times are placeholder kickoff slots in UTC; refine when FIFA publishes the
// final hour-by-hour schedule. Per-match broadcaster overrides only when a
// match is known to move to a specific channel (e.g. France 26 juin → TF1).

const CDM_MATCHES: TvMatch[] = [
  // Match d'ouverture
  { id: "wc-open", utcDate: "2026-06-11T20:00:00Z", group: "B", stage: "Match d'ouverture",
    homeTeam: { name: "Mexique" }, awayTeam: { name: "Équateur" },
    note: "Ouverture", broadcastOverride: ["TF1", "M6", "beIN Sports 1"] },

  // Journée 1
  { id: "wc-fra-1", utcDate: "2026-06-14T19:00:00Z", group: "F", stage: "Phase de groupes",
    homeTeam: { name: "France" }, awayTeam: { name: "Arabie Saoudite" },
    note: "J1 France", broadcastOverride: ["TF1", "beIN Sports 1"] },
  { id: "wc-usa-1", utcDate: "2026-06-12T22:00:00Z", group: "C", stage: "Phase de groupes",
    homeTeam: { name: "USA" }, awayTeam: { name: "Panama" },
    note: "J1 USA" },
  { id: "wc-arg-1", utcDate: "2026-06-13T19:00:00Z", group: "A", stage: "Phase de groupes",
    homeTeam: { name: "Argentine" }, awayTeam: { name: "Chili" } },
  { id: "wc-esp-1", utcDate: "2026-06-15T19:00:00Z", group: "E", stage: "Phase de groupes",
    homeTeam: { name: "Espagne" }, awayTeam: { name: "Maroc" } },
  { id: "wc-ger-1", utcDate: "2026-06-16T19:00:00Z", group: "H", stage: "Phase de groupes",
    homeTeam: { name: "Allemagne" }, awayTeam: { name: "Pays-Bas" },
    note: "Derby" },
  { id: "wc-bra-1", utcDate: "2026-06-17T19:00:00Z", group: "G", stage: "Phase de groupes",
    homeTeam: { name: "Brésil" }, awayTeam: { name: "Cameroun" } },
  { id: "wc-eng-1", utcDate: "2026-06-18T19:00:00Z", group: "I", stage: "Phase de groupes",
    homeTeam: { name: "Angleterre" }, awayTeam: { name: "Sénégal" } },

  // Journée 2
  { id: "wc-fra-2", utcDate: "2026-06-20T19:00:00Z", group: "F", stage: "Phase de groupes",
    homeTeam: { name: "France" }, awayTeam: { name: "Suisse" },
    note: "J2 France", broadcastOverride: ["TF1", "beIN Sports 1"] },
  { id: "wc-esp-2", utcDate: "2026-06-21T19:00:00Z", group: "E", stage: "Phase de groupes",
    homeTeam: { name: "Espagne" }, awayTeam: { name: "Belgique" } },
  { id: "wc-ita-2", utcDate: "2026-06-22T19:00:00Z", group: "J", stage: "Phase de groupes",
    homeTeam: { name: "Italie" }, awayTeam: { name: "Croatie" } },

  // Journée 3
  { id: "wc-fra-3", utcDate: "2026-06-25T19:00:00Z", group: "F", stage: "Phase de groupes",
    homeTeam: { name: "France" }, awayTeam: { name: "Algérie" },
    note: "J3 France 🔥", broadcastOverride: ["TF1", "M6", "beIN Sports 1"] },
  { id: "wc-arg-3", utcDate: "2026-06-26T19:00:00Z", group: "A", stage: "Phase de groupes",
    homeTeam: { name: "Argentine" }, awayTeam: { name: "Australie" } },
  { id: "wc-bra-3", utcDate: "2026-06-27T19:00:00Z", group: "G", stage: "Phase de groupes",
    homeTeam: { name: "Brésil" }, awayTeam: { name: "Colombie" } },

  // Huitièmes
  { id: "wc-r16-1", utcDate: "2026-07-04T19:00:00Z", stage: "Huitièmes de finale",
    homeTeam: { name: "1er Gr.F" }, awayTeam: { name: "2e Gr.E" },
    note: "8e finale" },
  { id: "wc-r16-2", utcDate: "2026-07-05T19:00:00Z", stage: "Huitièmes de finale",
    homeTeam: { name: "1er Gr.A" }, awayTeam: { name: "2e Gr.B" },
    note: "8e finale" },
  { id: "wc-r16-3", utcDate: "2026-07-06T19:00:00Z", stage: "Huitièmes de finale",
    homeTeam: { name: "1er Gr.G" }, awayTeam: { name: "2e Gr.H" },
    note: "8e finale" },
  { id: "wc-r16-4", utcDate: "2026-07-07T19:00:00Z", stage: "Huitièmes de finale",
    homeTeam: { name: "1er Gr.I" }, awayTeam: { name: "2e Gr.J" },
    note: "8e finale" },

  // Quarts
  { id: "wc-qf-1", utcDate: "2026-07-09T19:00:00Z", stage: "Quart de finale",
    homeTeam: { name: "QF1" }, awayTeam: { name: "QF2" },
    broadcastOverride: ["TF1", "beIN Sports 1"] },
  { id: "wc-qf-2", utcDate: "2026-07-10T19:00:00Z", stage: "Quart de finale",
    homeTeam: { name: "QF3" }, awayTeam: { name: "QF4" },
    broadcastOverride: ["TF1", "beIN Sports 1"] },
  { id: "wc-qf-3", utcDate: "2026-07-11T19:00:00Z", stage: "Quart de finale",
    homeTeam: { name: "QF5" }, awayTeam: { name: "QF6" },
    broadcastOverride: ["TF1", "beIN Sports 1"] },
  { id: "wc-qf-4", utcDate: "2026-07-12T19:00:00Z", stage: "Quart de finale",
    homeTeam: { name: "QF7" }, awayTeam: { name: "QF8" },
    broadcastOverride: ["TF1", "beIN Sports 1"] },

  // Demis
  { id: "wc-sf-1", utcDate: "2026-07-14T19:00:00Z", stage: "Demi-finale",
    homeTeam: { name: "SF1" }, awayTeam: { name: "SF2" },
    broadcastOverride: ["TF1", "M6", "beIN Sports 1"] },
  { id: "wc-sf-2", utcDate: "2026-07-15T19:00:00Z", stage: "Demi-finale",
    homeTeam: { name: "SF3" }, awayTeam: { name: "SF4" },
    broadcastOverride: ["TF1", "M6", "beIN Sports 1"] },

  // 3e place + FINALE
  { id: "wc-3rd", utcDate: "2026-07-18T19:00:00Z", stage: "Match pour la 3e place",
    homeTeam: { name: "Perdant SF1" }, awayTeam: { name: "Perdant SF2" },
    broadcastOverride: ["M6", "beIN Sports 1"] },
  { id: "wc-final", utcDate: "2026-07-19T19:00:00Z", stage: "FINALE",
    homeTeam: { name: "Vainqueur SF1" }, awayTeam: { name: "Vainqueur SF2" },
    note: "FINALE 🏆", broadcastOverride: ["TF1", "M6", "beIN Sports 1"] },
];

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse<TvResponse>> {
  const [l1, l2] = await Promise.all([fetchL1(), fetchL2()]);

  // Filter CdM to future + still-relevant matches (window: yesterday → end of
  // tournament) so the list shrinks naturally as the WC progresses.
  const now = Date.now();
  const cdmMatches = CDM_MATCHES
    .filter(m => new Date(m.utcDate).getTime() > now - 4 * 3600_000)
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

  return NextResponse.json({
    l1,
    l2,
    cdm: { matches: cdmMatches, source: "static" },
    updatedAt: new Date().toISOString(),
  });
}
