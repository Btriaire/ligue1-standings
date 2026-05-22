import { NextRequest, NextResponse } from "next/server";
import { fetchFotMobLigue2, fotmobCrest, fotmobFormString } from "@/app/lib/fotmob";
import type { Standing } from "@/app/lib/types";

export const revalidate = 60; // revalidate every 60s

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
// Default is Ligue 1; callers can pass ?competition=FL2 (or any other
// football-data.org competition code).
const DEFAULT_COMPETITION = "FL1";
const ALLOWED_COMPETITIONS = new Set(["FL1", "FL2"]);

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requested = (searchParams.get("competition") ?? DEFAULT_COMPETITION).toUpperCase();
  const competition = ALLOWED_COMPETITIONS.has(requested) ? requested : DEFAULT_COMPETITION;

  // ── Ligue 2 → FotMob (free public source, football-data.org refuses on free plan)
  if (competition === "FL2") {
    try {
      const fm = await fetchFotMobLigue2();
      const standings = fm.table.map((entry) => {
        const [gf, ga] = entry.scoresStr.split("-").map((n) => parseInt(n, 10) || 0);
        return {
          position: entry.idx,
          team: {
            id: entry.id,
            name: entry.name,
            shortName: entry.shortName,
            tla: entry.shortName.slice(0, 3).toUpperCase(),
            crest: fotmobCrest(entry.id),
          },
          playedGames: entry.played,
          won: entry.wins,
          draw: entry.draws,
          lost: entry.losses,
          points: entry.pts,
          goalsFor: gf,
          goalsAgainst: ga,
          goalDifference: entry.goalConDiff,
          form: fotmobFormString(fm.teamForm[String(entry.id)]),
        };
      });
      return NextResponse.json({
        standings,
        season: null,
        competition,
        source: "fotmob",
        updatedAt: fm.updatedAt,
      });
    } catch (err) {
      console.error("FotMob L2 standings error:", err);
      return NextResponse.json({
        standings: [],
        season: null,
        competition,
        error: "Impossible de récupérer le classement Ligue 2 depuis FotMob.",
      }, { status: 200 });
    }
  }

  if (!API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const [standingsRes, matchesRes] = await Promise.all([
      fetch(
        `https://api.football-data.org/v4/competitions/${competition}/standings`,
        { headers: { "X-Auth-Token": API_KEY }, next: { revalidate: 60 } }
      ),
      fetch(
        `https://api.football-data.org/v4/competitions/${competition}/matches?status=FINISHED`,
        { headers: { "X-Auth-Token": API_KEY }, next: { revalidate: 60 } }
      ).catch(() => null),
    ]);

    if (!standingsRes.ok) {
      // Ligue 2 is a paid-tier competition on football-data.org. Surface a
      // user-readable message rather than the bare status code.
      if (standingsRes.status === 403 || standingsRes.status === 429) {
        return NextResponse.json({
          standings: [], season: null, competition,
          error: competition === "FL2"
            ? "Le classement Ligue 2 nécessite un plan football-data.org payant."
            : "Football-data.org refuse la requête (quota atteint ou plan insuffisant).",
        }, { status: 200 });
      }
      throw new Error(`Football API error: ${standingsRes.status}`);
    }

    const data = await standingsRes.json();
    const table: Standing[] = data.standings?.[0]?.table ?? [];

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
      competition,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Standings fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch standings" }, { status: 500 });
  }
}
