import { NextResponse } from "next/server";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? "6f59340ad9msh12fc2907d47b36dp14654fjsn776af2347bb0";

export const revalidate = 3600;

// Normalize team name for fuzzy matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(fc|sc|ac|og|rc|as|oc|stade|olympique|sporting|club|football|union|association)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function teamMatches(expertName: string, ourName: string): boolean {
  const e = normalizeName(expertName);
  const o = normalizeName(ourName);
  if (e === o) return true;
  // Check if any significant word from one appears in the other
  const eWords = e.split(" ").filter((w) => w.length > 3);
  const oWords = o.split(" ").filter((w) => w.length > 3);
  return eWords.some((w) => o.includes(w)) || oWords.some((w) => e.includes(w));
}

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

function parseRawData(raw: unknown): ExpertMatch[] {
  if (!raw || typeof raw !== "object") return [];
  const matches: ExpertMatch[] = [];

  // Handle array at root or nested under data/predictions/results
  const arr: unknown[] = Array.isArray(raw)
    ? (raw as unknown[])
    : (raw as Record<string, unknown>).data
      ? [].concat((raw as Record<string, unknown[]>).data as [])
      : (raw as Record<string, unknown>).predictions
        ? [].concat((raw as Record<string, unknown[]>).predictions as [])
        : (raw as Record<string, unknown>).results
          ? [].concat((raw as Record<string, unknown[]>).results as [])
          : [];

  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;

    // Extract team names (various API field name conventions)
    const home = (m.home_team ?? m.homeTeam ?? m.home ?? m.team_home ?? "") as string;
    const away = (m.away_team ?? m.awayTeam ?? m.away ?? m.team_away ?? "") as string;
    if (!home || !away) continue;

    // Extract league
    const league = (m.league ?? m.competition ?? m.league_name ?? m.competition_name ?? "") as string;

    // Extract prediction
    const rawPred = (
      m.prediction ?? m.tip ?? m.result ?? m.outcome ??
      (m.tips as Record<string, unknown>[])?.[0]?.prediction ?? ""
    ) as string;

    let prediction: "home" | "draw" | "away" = "home";
    const p = String(rawPred).toLowerCase();
    if (p === "1" || p === "home" || p === "home_win" || p === "h" || p === "1x2_1") prediction = "home";
    else if (p === "x" || p === "draw" || p === "d" || p === "1x2_x") prediction = "draw";
    else if (p === "2" || p === "away" || p === "away_win" || p === "a" || p === "1x2_2") prediction = "away";
    else continue; // skip if we can't parse the prediction

    // Confidence
    const rawConf = (m.confidence ?? m.certainty ?? m.probability ?? 0) as number;
    const confNum = typeof rawConf === "number" ? rawConf : parseFloat(String(rawConf)) || 0;
    // Normalize: could be 0-100 or 0-1
    const confPct = confNum > 1 ? confNum : confNum * 100;
    const confidence: "high" | "medium" | "low" =
      confPct >= 70 ? "high" : confPct >= 50 ? "medium" : "low";

    // Odds
    const rawOdds = m.odds as Record<string, number> | undefined;
    const odds = rawOdds ? {
      home: parseFloat(String(rawOdds.home ?? rawOdds["1"] ?? 0)) || 0,
      draw: parseFloat(String(rawOdds.draw ?? rawOdds.x ?? rawOdds["X"] ?? 0)) || 0,
      away: parseFloat(String(rawOdds.away ?? rawOdds["2"] ?? 0)) || 0,
    } : undefined;

    matches.push({
      homeTeam: String(home),
      awayTeam: String(away),
      league: String(league),
      prediction,
      confidence,
      confidenceScore: confPct > 0 ? Math.round(confPct) : undefined,
      odds: odds?.home ? odds : undefined,
      date: (m.date ?? m.datetime ?? m.start_time ?? "") as string,
      source: "The Predictors (RapidAPI)",
    });
  }
  return matches;
}

interface OddsApiOutcome {
  name: string;
  price: number;
}

interface OddsApiBookmaker {
  key: string;
  markets: Array<{
    key: string;
    outcomes: OddsApiOutcome[];
  }>;
}

interface OddsApiMatch {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: OddsApiBookmaker[];
}

function parseBetclicData(raw: unknown): ExpertMatch[] {
  if (!Array.isArray(raw)) return [];
  const matches: ExpertMatch[] = [];

  for (const item of raw as OddsApiMatch[]) {
    if (!item || !item.home_team || !item.away_team) continue;

    const bookmaker = item.bookmakers?.find((b) => b.key === "betclic");
    if (!bookmaker) continue;

    const h2hMarket = bookmaker.markets?.find((m) => m.key === "h2h");
    if (!h2hMarket || !h2hMarket.outcomes?.length) continue;

    // Find home, draw, away outcomes
    const homeOutcome = h2hMarket.outcomes.find((o) => o.name === item.home_team);
    const awayOutcome = h2hMarket.outcomes.find((o) => o.name === item.away_team);
    const drawOutcome = h2hMarket.outcomes.find((o) => o.name === "Draw");

    if (!homeOutcome || !awayOutcome) continue;

    const homeOdds = homeOutcome.price;
    const awayOdds = awayOutcome.price;
    const drawOdds = drawOutcome?.price ?? 0;

    // Lowest odds = favorite
    const candidates: Array<{ outcome: "home" | "draw" | "away"; odds: number }> = [
      { outcome: "home", odds: homeOdds },
      { outcome: "away", odds: awayOdds },
    ];
    if (drawOdds > 0) candidates.push({ outcome: "draw", odds: drawOdds });

    candidates.sort((a, b) => a.odds - b.odds);
    const favorite = candidates[0];
    const prediction = favorite.outcome;

    // Implicit probability from odds
    const homeProb = homeOdds > 0 ? 1 / homeOdds : 0;
    const awayProb = awayOdds > 0 ? 1 / awayOdds : 0;
    const drawProb = drawOdds > 0 ? 1 / drawOdds : 0;
    const totalProb = homeProb + awayProb + drawProb;

    // Confidence based on gap between best and second-best odds probability
    const normalizedFavProb = totalProb > 0 ? (1 / favorite.odds) / totalProb * 100 : 0;
    const secondOdds = candidates[1]?.odds ?? 0;
    const secondProb = totalProb > 0 && secondOdds > 0 ? (1 / secondOdds) / totalProb * 100 : 0;
    const gap = normalizedFavProb - secondProb;
    const confidence: "high" | "medium" | "low" = gap >= 20 ? "high" : gap >= 8 ? "medium" : "low";

    // Vig-removed implied probabilities
    const impliedHome = totalProb > 0 ? Math.round((homeProb / totalProb) * 100) : 0;
    const impliedAway = totalProb > 0 ? Math.round((awayProb / totalProb) * 100) : 0;
    const impliedDraw = 100 - impliedHome - impliedAway;

    matches.push({
      homeTeam: item.home_team,
      awayTeam: item.away_team,
      league: "Ligue 1",
      prediction,
      confidence,
      confidenceScore: Math.round(normalizedFavProb),
      odds: {
        home: homeOdds,
        draw: drawOdds,
        away: awayOdds,
      },
      impliedProbs: { home: impliedHome, draw: impliedDraw, away: impliedAway },
      date: item.commence_time,
      source: "Betclic",
    });
  }

  return matches;
}

// ── Direct Betclic scraping (no API key needed) ────────────────────────────────

interface BetclicEvent {
  id?: string;
  name?: string;
  startDate?: string;
  start_date?: string;
  sportId?: string;
  competitionId?: string;
  markets?: Array<{
    type?: string;
    key?: string;
    selections?: Array<{ type?: string; name?: string; odds?: number; price?: number }>;
    outcomes?: Array<{ type?: string; name?: string; odds?: number; price?: number }>;
  }>;
}

function parseBetclicEventName(name: string): { home: string; away: string } | null {
  // Betclic events are typically "Home - Away" or "Home vs Away"
  const sep = name.includes(" - ") ? " - " : name.includes(" vs ") ? " vs " : null;
  if (!sep) return null;
  const [home, away] = name.split(sep);
  return { home: home.trim(), away: away.trim() };
}

async function fetchBetclicDirect(): Promise<ExpertMatch[]> {
  // Betclic internal sports gateway API for Ligue 1 (competition id = c4)
  const candidates = [
    "https://api.betclic.com/sports-gateway/sports/fr-FR/events?sportIds=FOOTBALL&competitionId=c4&count=20",
    "https://offer.cdn.betclic.com/api/v1/sports/fr-FR/competition/c4/events?count=20&lang=fr-FR",
    "https://www.betclic.fr/api/sports/v1/events?sportId=FOOTBALL&competitionId=c4&count=20",
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FootPredictom/1.0)",
          Accept: "application/json",
          "Accept-Language": "fr-FR,fr;q=0.9",
          "Cache-Control": "no-cache",
        },
        signal: AbortSignal.timeout(6000),
      } as RequestInit);
      if (!res.ok) continue;
      const raw = await res.json() as { events?: BetclicEvent[]; data?: BetclicEvent[] } | BetclicEvent[];
      const events: BetclicEvent[] = Array.isArray(raw)
        ? raw
        : (raw as { events?: BetclicEvent[]; data?: BetclicEvent[] }).events
          ?? (raw as { events?: BetclicEvent[]; data?: BetclicEvent[] }).data
          ?? [];
      if (!events.length) continue;

      const matches: ExpertMatch[] = [];
      for (const ev of events) {
        if (!ev.name) continue;
        const teams = parseBetclicEventName(ev.name);
        if (!teams) continue;

        // Find the 1X2 / RESULT market
        const market = ev.markets?.find(m =>
          m.type === "RESULT" || m.type === "1X2" || m.key === "h2h" || m.type === "MATCH_RESULT"
        );
        if (!market) continue;

        const sels = market.selections ?? market.outcomes ?? [];
        const getOdds = (types: string[]) => {
          const sel = sels.find(s => s.type && types.includes(s.type.toUpperCase()));
          return sel ? (sel.odds ?? sel.price ?? 0) : 0;
        };
        const homeOdds = getOdds(["HOME", "1", "TEAM1"]);
        const drawOdds = getOdds(["DRAW", "X", "DRAW_NO_BET"]);
        const awayOdds = getOdds(["AWAY", "2", "TEAM2"]);
        if (!homeOdds || !awayOdds) continue;

        const hp = homeOdds > 0 ? 1 / homeOdds : 0;
        const dp = drawOdds > 0 ? 1 / drawOdds : 0;
        const ap = awayOdds > 0 ? 1 / awayOdds : 0;
        const total = hp + dp + ap || 1;

        const impliedHome = Math.round((hp / total) * 100);
        const impliedAway = Math.round((ap / total) * 100);
        const impliedDraw = 100 - impliedHome - impliedAway;

        const candidates2 = ([
          { outcome: "home" as const, p: impliedHome },
          { outcome: "draw" as const, p: impliedDraw },
          { outcome: "away" as const, p: impliedAway },
        ] as Array<{ outcome: "home" | "draw" | "away"; p: number }>).sort((a, b) => b.p - a.p);
        const favP = candidates2[0].p;
        const gap = favP - candidates2[1].p;

        matches.push({
          homeTeam: teams.home,
          awayTeam: teams.away,
          league: "Ligue 1",
          prediction: candidates2[0].outcome,
          confidence: gap >= 20 ? "high" : gap >= 8 ? "medium" : "low",
          confidenceScore: favP,
          odds: { home: homeOdds, draw: drawOdds, away: awayOdds },
          impliedProbs: { home: impliedHome, draw: impliedDraw, away: impliedAway },
          date: ev.startDate ?? ev.start_date,
          source: "Betclic",
        });
      }
      if (matches.length > 0) return matches;
    } catch { continue; }
  }
  return [];
}

function mergeMatches(predictors: ExpertMatch[], betclic: ExpertMatch[]): ExpertMatch[] {
  const merged: ExpertMatch[] = [...predictors];

  for (const bc of betclic) {
    const existingIdx = merged.findIndex(
      (m) => teamMatches(m.homeTeam, bc.homeTeam) && teamMatches(m.awayTeam, bc.awayTeam)
    );

    if (existingIdx >= 0) {
      const existing = merged[existingIdx];
      // Merge: keep highest confidence score, combine source label
      const confScoreA = existing.confidenceScore ?? 0;
      const confScoreB = bc.confidenceScore ?? 0;
      merged[existingIdx] = {
        ...existing,
        confidenceScore: Math.max(confScoreA, confScoreB),
        confidence: confScoreA >= confScoreB ? existing.confidence : bc.confidence,
        odds: existing.odds ?? bc.odds,
        source: "The Predictors + Betclic",
      };
    } else {
      merged.push(bc);
    }
  }

  return merged;
}

export async function GET() {
  try {
    const THE_ODDS_API_KEY = process.env.THE_ODDS_API_KEY;

    // 1. Try direct Betclic scraping first (no key needed)
    // 2. Fallback: The Odds API (requires THE_ODDS_API_KEY)
    // 3. Background: The Predictors RapidAPI for broader coverage
    const [directBetclic, predictorsRes, oddsApiRes] = await Promise.all([
      fetchBetclicDirect(),
      fetch("https://the-predictors.p.rapidapi.com/predictor/safe", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "the-predictors.p.rapidapi.com",
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
        next: { revalidate: 3600 },
      }).catch(() => null),
      THE_ODDS_API_KEY
        ? fetch(
            `https://api.the-odds-api.com/v4/sports/soccer_france_ligue_one/odds/?regions=eu&markets=h2h&bookmakers=betclic&apiKey=${THE_ODDS_API_KEY}`,
            { next: { revalidate: 3600 } }
          ).catch(() => null)
        : Promise.resolve(null),
    ]);

    // Betclic odds: prefer direct scrape, fallback to The Odds API
    let betclicMatches = directBetclic;
    if (betclicMatches.length === 0 && oddsApiRes?.ok) {
      const raw = await oddsApiRes.json();
      betclicMatches = parseBetclicData(raw);
    }

    let predictorsMatches: ExpertMatch[] = [];
    if (predictorsRes?.ok) {
      const raw = await predictorsRes.json();
      predictorsMatches = parseRawData(raw);
    }

    const matches = mergeMatches(predictorsMatches, betclicMatches);

    return NextResponse.json({
      available: matches.length > 0,
      betclicAvailable: betclicMatches.length > 0,
      matches,
      teamMatchFn: null,
    });
  } catch (err) {
    console.error("Expert predictions error:", err);
    return NextResponse.json({ available: false, betclicAvailable: false, matches: [], error: String(err) });
  }
}

// Export for use in predictions tab to match expert data to our team names
export { teamMatches };
