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

export async function GET() {
  try {
    const res = await fetch("https://the-predictors.p.rapidapi.com/predictor/safe", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": "the-predictors.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ available: false, matches: [], error: `HTTP ${res.status}` });
    }

    const raw = await res.json();
    const matches = parseRawData(raw);

    return NextResponse.json({
      available: matches.length > 0,
      matches,
      teamMatchFn: null,
    });
  } catch (err) {
    console.error("Expert predictions error:", err);
    return NextResponse.json({ available: false, matches: [], error: String(err) });
  }
}

// Export for use in predictions tab to match expert data to our team names
export { teamMatches };
