import { NextResponse } from "next/server";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const COMPETITION = "FL1";

export const revalidate = 300;

interface GoalEntry {
  minute: number | null;
  type: string;
  scorer: { id: number; name: string } | null;
  assist: { id: number; name: string } | null;
  team: { id: number } | null;
}

interface MatchRaw {
  id: number;
  utcDate: string;
  matchday: number;
  status: string;
  homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  goals: GoalEntry[];
}

export async function GET(req: Request) {
  if (!API_KEY) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "30"), 100);

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/${COMPETITION}/matches?status=FINISHED`,
      { headers: { "X-Auth-Token": API_KEY }, next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    const allMatches: MatchRaw[] = data.matches ?? [];

    // Sort by date descending, take limit
    const matches = [...allMatches]
      .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
      .slice(0, limit)
      .map((m) => {
        const homeScore = m.score.fullTime.home ?? 0;
        const awayScore = m.score.fullTime.away ?? 0;
        const result: "home" | "away" | "draw" =
          homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw";

        const homeGoals = (m.goals ?? [])
          .filter((g) => g.team?.id === m.homeTeam.id)
          .map((g) => ({
            minute: g.minute,
            scorer: g.scorer?.name ?? null,
            assist: g.assist?.name ?? null,
            type: g.type ?? "REGULAR",
          }));

        const awayGoals = (m.goals ?? [])
          .filter((g) => g.team?.id === m.awayTeam.id)
          .map((g) => ({
            minute: g.minute,
            scorer: g.scorer?.name ?? null,
            assist: g.assist?.name ?? null,
            type: g.type ?? "REGULAR",
          }));

        return {
          id: m.id,
          date: m.utcDate,
          matchday: m.matchday,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          score: { home: homeScore, away: awayScore },
          result,
          homeGoals,
          awayGoals,
        };
      });

    return NextResponse.json({ matches, count: matches.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
