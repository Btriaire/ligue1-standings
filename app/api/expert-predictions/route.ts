import { NextResponse } from "next/server";

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY ?? "";

export const revalidate = 3600;

// ── Name helpers ───────────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(fc|sc|ac|og|rc|as|oc|stade|olympique|sporting|club|football|union|association)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function teamMatches(expertName: string, ourName: string): boolean {
  const e = normalizeName(expertName);
  const o = normalizeName(ourName);
  if (e === o) return true;
  const eWords = e.split(" ").filter((w) => w.length > 3);
  const oWords = o.split(" ").filter((w) => w.length > 3);
  return eWords.some((w) => o.includes(w)) || oWords.some((w) => e.includes(w));
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ExpertMatch {
  homeTeam: string;
  awayTeam: string;
  league: string;
  prediction: "home" | "draw" | "away";
  confidence: "high" | "medium" | "low";
  confidenceScore?: number;
  odds?: { home: number; draw: number; away: number };
  /** Vig-removed implied probabilities (0–100) derived from Betclic odds */
  impliedProbs?: { home: number; draw: number; away: number };
  date?: string;
  source?: string;
}

// ── The Odds API (Betclic) ─────────────────────────────────────────────────────

interface OddsApiOutcome { name: string; price: number }
interface OddsApiBookmaker {
  key: string;
  markets: Array<{ key: string; outcomes: OddsApiOutcome[] }>;
}
interface OddsApiMatch {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: OddsApiBookmaker[];
}

function parseBetclicOddsApi(raw: unknown): ExpertMatch[] {
  if (!Array.isArray(raw)) return [];
  const matches: ExpertMatch[] = [];

  for (const item of raw as OddsApiMatch[]) {
    if (!item?.home_team || !item?.away_team) continue;
    const bookmaker = item.bookmakers?.find((b) => b.key === "betclic");
    if (!bookmaker) continue;
    const h2h = bookmaker.markets?.find((m) => m.key === "h2h");
    if (!h2h?.outcomes?.length) continue;

    const homeO = h2h.outcomes.find((o) => o.name === item.home_team);
    const awayO = h2h.outcomes.find((o) => o.name === item.away_team);
    const drawO = h2h.outcomes.find((o) => o.name === "Draw");
    if (!homeO || !awayO) continue;

    const ho = homeO.price, ao = awayO.price, dro = drawO?.price ?? 0;
    const hp = ho > 0 ? 1 / ho : 0;
    const ap = ao > 0 ? 1 / ao : 0;
    const dp = dro > 0 ? 1 / dro : 0;
    const total = hp + ap + dp || 1;

    const impliedHome = Math.round((hp / total) * 100);
    const impliedAway = Math.round((ap / total) * 100);
    const impliedDraw = 100 - impliedHome - impliedAway;

    const favProb = Math.max(impliedHome, impliedDraw, impliedAway);
    const sorted = [impliedHome, impliedDraw, impliedAway].sort((a, b) => b - a);
    const gap = sorted[0] - sorted[1];

    const prediction: "home" | "draw" | "away" =
      impliedHome >= impliedAway && impliedHome >= impliedDraw ? "home" :
      impliedAway > impliedHome && impliedAway > impliedDraw ? "away" : "draw";

    matches.push({
      homeTeam: item.home_team,
      awayTeam: item.away_team,
      league: "Ligue 1",
      prediction,
      confidence: gap >= 20 ? "high" : gap >= 8 ? "medium" : "low",
      confidenceScore: favProb,
      odds: { home: ho, draw: dro, away: ao },
      impliedProbs: { home: impliedHome, draw: impliedDraw, away: impliedAway },
      date: item.commence_time,
      source: "Betclic",
    });
  }
  return matches;
}

// ── Internal expert model (always available) ───────────────────────────────────
// Uses football-data.org standings + fixtures → different weights from the
// main algorithm → can genuinely diverge, giving a real second opinion.

interface FdTeam { id: number; name: string; shortName: string; tla: string }
interface FdScore { winner: string | null; fullTime: { home: number | null; away: number | null } }
interface FdMatch {
  id: number;
  utcDate: string;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: FdScore;
  matchday: number;
}
interface FdTable {
  position: number;
  team: FdTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string | null;
}

function formPts(form: string | null | undefined): number {
  if (!form) return 0.4;
  const rs = form.split(",").filter(Boolean).slice(-5);
  if (!rs.length) return 0.4;
  return rs.reduce((s, r) => s + (r === "W" ? 3 : r === "D" ? 1 : 0), 0) / (rs.length * 3);
}

// Weighted Elo-inspired strength — weights intentionally differ from main algo
// to produce an independent second opinion
function expertStrength(t: FdTable, isHome: boolean): number {
  const ppg = t.playedGames > 0 ? t.points / t.playedGames : 0;
  const gd = t.playedGames > 0 ? (t.goalsFor - t.goalsAgainst) / t.playedGames : 0;
  const form = formPts(t.form);
  const posScore = Math.max(0, (20 - t.position) / 19);
  // Different weights: more form-heavy, less position
  const base = 0.30 * (ppg / 3) + 0.35 * ((gd + 3) / 6) + 0.30 * form + 0.05 * posScore;
  const homeBonus = isHome ? 0.07 : 0; // flat 7% home advantage
  return Math.min(1, Math.max(0.05, base + homeBonus));
}

function expertProbs(homeStr: number, awayStr: number): { home: number; draw: number; away: number } {
  const total = homeStr + awayStr + 0.001;
  const rawH = homeStr / total;
  const rawA = awayStr / total;
  const diff = Math.abs(rawH - rawA);
  // More draw-generous than the main algo
  const drawF = Math.max(0.15, 0.35 - diff * 0.55);
  let h = rawH * (1 - drawF);
  let a = rawA * (1 - drawF);
  let d = drawF;
  const sum = h + a + d;
  h = Math.round((h / sum) * 100);
  a = Math.round((a / sum) * 100);
  d = 100 - h - a;
  return { home: h, draw: d, away: a };
}

// Convert probabilities back to implied decimal odds
function probsToOdds(p: { home: number; draw: number; away: number }): { home: number; draw: number; away: number } {
  const vig = 1.06; // typical bookmaker margin
  return {
    home: p.home > 0 ? Math.round(((100 / p.home) * vig) * 100) / 100 : 0,
    draw: p.draw > 0 ? Math.round(((100 / p.draw) * vig) * 100) / 100 : 0,
    away: p.away > 0 ? Math.round(((100 / p.away) * vig) * 100) / 100 : 0,
  };
}

async function fetchInternalExpert(): Promise<ExpertMatch[]> {
  if (!FOOTBALL_DATA_API_KEY) return [];

  const headers = { "X-Auth-Token": FOOTBALL_DATA_API_KEY };

  try {
    const [fixturesRes, standingsRes] = await Promise.all([
      fetch("https://api.football-data.org/v4/competitions/FL1/matches?status=SCHEDULED", {
        headers,
        next: { revalidate: 3600 },
      }),
      fetch("https://api.football-data.org/v4/competitions/FL1/standings", {
        headers,
        next: { revalidate: 3600 },
      }),
    ]);

    if (!fixturesRes.ok || !standingsRes.ok) return [];

    const [fixturesData, standingsData] = await Promise.all([
      fixturesRes.json() as Promise<{ matches: FdMatch[]; filters?: { season?: string } }>,
      standingsRes.json() as Promise<{ standings: Array<{ table: FdTable[] }> }>,
    ]);

    const table: FdTable[] = standingsData.standings?.[0]?.table ?? [];
    if (!table.length) return [];

    const tableMap = new Map<number, FdTable>(table.map((t) => [t.team.id, t]));

    // Get current matchday only (next upcoming fixtures)
    const upcoming = (fixturesData.matches ?? []).filter(
      (m) => new Date(m.utcDate) > new Date()
    );
    if (!upcoming.length) return [];

    // Group by matchday, pick smallest (next round)
    const nextMatchday = Math.min(...upcoming.map((m) => m.matchday));
    const nextRound = upcoming.filter((m) => m.matchday === nextMatchday);

    const results: ExpertMatch[] = [];

    for (const match of nextRound) {
      const homeTable = tableMap.get(match.homeTeam.id);
      const awayTable = tableMap.get(match.awayTeam.id);
      if (!homeTable || !awayTable) continue;

      const hStr = expertStrength(homeTable, true);
      const aStr = expertStrength(awayTable, false);
      const probs = expertProbs(hStr, aStr);
      const syntheticOdds = probsToOdds(probs);

      const maxP = Math.max(probs.home, probs.draw, probs.away);
      const sorted = [probs.home, probs.draw, probs.away].sort((a, b) => b - a);
      const gap = sorted[0] - sorted[1];

      const prediction: "home" | "draw" | "away" =
        probs.home >= probs.away && probs.home >= probs.draw ? "home" :
        probs.away > probs.home && probs.away > probs.draw ? "away" : "draw";

      results.push({
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        league: "Ligue 1",
        prediction,
        confidence: gap >= 20 ? "high" : gap >= 8 ? "medium" : "low",
        confidenceScore: maxP,
        odds: syntheticOdds,
        impliedProbs: { home: probs.home, draw: probs.draw, away: probs.away },
        date: match.utcDate,
        source: "FootPredictom Analytics",
      });
    }

    return results;
  } catch {
    return [];
  }
}

// ── Merge ──────────────────────────────────────────────────────────────────────

function mergeMatches(internal: ExpertMatch[], betclic: ExpertMatch[]): ExpertMatch[] {
  // Betclic odds take priority for any match they cover
  const merged: ExpertMatch[] = [...internal];

  for (const bc of betclic) {
    const idx = merged.findIndex(
      (m) => teamMatches(m.homeTeam, bc.homeTeam) && teamMatches(m.awayTeam, bc.awayTeam)
    );
    if (idx >= 0) {
      // Replace internal estimate with real Betclic odds
      merged[idx] = { ...merged[idx], ...bc };
    } else {
      merged.push(bc);
    }
  }

  return merged;
}

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const THE_ODDS_API_KEY = process.env.THE_ODDS_API_KEY;

    // Run both in parallel: internal expert model (always works) + Betclic via Odds API (if key)
    const [internalMatches, oddsApiRes] = await Promise.all([
      fetchInternalExpert(),
      THE_ODDS_API_KEY
        ? fetch(
            `https://api.the-odds-api.com/v4/sports/soccer_france_ligue_one/odds/?regions=eu&markets=h2h&bookmakers=betclic&apiKey=${THE_ODDS_API_KEY}`,
            { next: { revalidate: 3600 } }
          ).catch(() => null)
        : Promise.resolve(null),
    ]);

    let betclicMatches: ExpertMatch[] = [];
    if (oddsApiRes?.ok) {
      betclicMatches = parseBetclicOddsApi(await oddsApiRes.json());
    }

    // Betclic odds override internal model where available
    const matches = mergeMatches(internalMatches, betclicMatches);
    const betclicAvailable = betclicMatches.length > 0;

    return NextResponse.json({
      available: matches.length > 0,
      betclicAvailable,
      matches,
    });
  } catch (err) {
    console.error("Expert predictions error:", err);
    return NextResponse.json({ available: false, betclicAvailable: false, matches: [], error: String(err) });
  }
}

export { teamMatches };
