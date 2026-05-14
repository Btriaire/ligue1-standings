import { NextResponse } from "next/server";

export const revalidate = 60; // revalidate every 60s

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const COMPETITION = "FL1"; // Ligue 1

interface FootballEntry {
  position: number;
  team: { id: number; name: string; shortName: string; tla: string; crest: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string | null;
}

interface FdMatch {
  status: string;
  homeTeam: { id: number };
  awayTeam: { id: number };
  score: { winner: string | null; fullTime: { home: number | null; away: number | null } };
}

/** Compute last-5 form string for each team from finished matches */
function computeForm(matches: FdMatch[]): Map<number, string> {
  // Collect results per team, newest first
  const results = new Map<number, string[]>();

  // Matches arrive oldest-first from the API; iterate newest-first
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    if (m.status !== "FINISHED") continue;
    const { homeTeam, awayTeam, score } = m;
    const winner = score?.winner; // "HOME_TEAM" | "AWAY_TEAM" | "DRAW"

    const addResult = (teamId: number, result: string) => {
      const arr = results.get(teamId) ?? [];
      if (arr.length < 5) arr.push(result);
      results.set(teamId, arr);
    };

    if (winner === "HOME_TEAM") {
      addResult(homeTeam.id, "W");
      addResult(awayTeam.id, "L");
    } else if (winner === "AWAY_TEAM") {
      addResult(homeTeam.id, "L");
      addResult(awayTeam.id, "W");
    } else if (winner === "DRAW") {
      addResult(homeTeam.id, "D");
      addResult(awayTeam.id, "D");
    }
  }

  // Convert to comma-separated string, oldest-first for display
  const formMap = new Map<number, string>();
  for (const [id, arr] of results.entries()) {
    formMap.set(id, [...arr].reverse().join(","));
  }
  return formMap;
}

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const [standingsRes, matchesRes] = await Promise.all([
      fetch(
        `https://api.football-data.org/v4/competitions/${COMPETITION}/standings`,
        { headers: { "X-Auth-Token": API_KEY }, next: { revalidate: 60 } }
      ),
      fetch(
        `https://api.football-data.org/v4/competitions/${COMPETITION}/matches?status=FINISHED`,
        { headers: { "X-Auth-Token": API_KEY }, next: { revalidate: 60 } }
      ).catch(() => null),
    ]);

    if (!standingsRes.ok) {
      throw new Error(`Football API error: ${standingsRes.status}`);
    }

    const data = await standingsRes.json();
    const table: FootballEntry[] = data.standings?.[0]?.table ?? [];

    // Compute form from match results when the API doesn't provide it
    let formMap = new Map<number, string>();
    if (matchesRes?.ok) {
      const matchData = await matchesRes.json();
      formMap = computeForm(matchData.matches ?? []);
    }

    const standings = table.map((entry) => ({
      position: entry.position,
      team: {
        id: entry.team.id,
        name: entry.team.name,
        shortName: entry.team.shortName,
        tla: entry.team.tla,
        crest: entry.team.crest,
      },
      playedGames: entry.playedGames,
      won: entry.won,
      draw: entry.draw,
      lost: entry.lost,
      points: entry.points,
      goalsFor: entry.goalsFor,
      goalsAgainst: entry.goalsAgainst,
      goalDifference: entry.goalDifference,
      // Use API form if provided, otherwise compute from match results
      form: entry.form ?? formMap.get(entry.team.id) ?? "",
    }));

    return NextResponse.json({
      standings,
      season: data.season?.currentMatchday ?? null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Standings fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch standings" }, { status: 500 });
  }
}
