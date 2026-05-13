import { NextResponse } from "next/server";

export const revalidate = 300;

interface EspnAthlete {
  displayName: string;
}

interface EspnDetail {
  type: { text: string };
  clock: { displayValue: string };
  team: { id: string };
  scoringPlay: boolean;
  yellowCard: boolean;
  redCard: boolean;
  penaltyKick: boolean;
  ownGoal: boolean;
  athletesInvolved: EspnAthlete[];
}

interface EspnCompetitor {
  homeAway: "home" | "away";
  score: string;
  team: {
    id: string;
    displayName: string;
    shortDisplayName: string;
    abbreviation: string;
    logo: string;
  };
}

interface EspnEvent {
  id: string;
  date: string;
  status: { type: { name: string } };
  competitions: Array<{
    competitors: EspnCompetitor[];
    details: EspnDetail[];
  }>;
}

function getDateRange(): string {
  const now = new Date();
  const start = new Date(now.getTime() - 28 * 24 * 3600 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  return `${fmt(start)}-${fmt(now)}`;
}

function parseMinute(displayValue: string): number | null {
  const n = parseInt(displayValue);
  return isNaN(n) ? null : n;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);

  try {
    const dateRange = getDateRange();
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard?dates=${dateRange}&limit=200`,
      { next: { revalidate: 300 } } as RequestInit
    );
    if (!res.ok) throw new Error(`ESPN error ${res.status}`);
    const data = await res.json();

    const allEvents: EspnEvent[] = (data.events ?? []).filter(
      (e: EspnEvent) => {
        const name = e.status?.type?.name ?? "";
        return name === "STATUS_FULL_TIME" || name === "STATUS_FINAL" || name === "STATUS_FINAL_PEN";
      }
    );

    const matches = [...allEvents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)
      .map((e) => {
        const comp = e.competitions[0];
        const home = comp.competitors.find((c) => c.homeAway === "home")!;
        const away = comp.competitors.find((c) => c.homeAway === "away")!;
        const details: EspnDetail[] = comp.details ?? [];

        const homeScore = parseInt(home.score ?? "0") || 0;
        const awayScore = parseInt(away.score ?? "0") || 0;
        const result: "home" | "away" | "draw" =
          homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw";

        const mapGoal = (d: EspnDetail) => ({
          minute: parseMinute(d.clock?.displayValue ?? ""),
          scorer: d.athletesInvolved?.[0]?.displayName ?? null,
          assist: d.athletesInvolved?.[1]?.displayName ?? null,
          type: d.ownGoal ? "OWN_GOAL" : d.penaltyKick ? "PENALTY" : "REGULAR",
        });

        const mapCard = (d: EspnDetail) => ({
          minute: parseMinute(d.clock?.displayValue ?? ""),
          player: d.athletesInvolved?.[0]?.displayName ?? null,
          card: d.redCard ? "RED_CARD" : "YELLOW_CARD",
        });

        const homeGoals = details.filter((d) => d.scoringPlay && d.team?.id === home.team.id).map(mapGoal);
        const awayGoals = details.filter((d) => d.scoringPlay && d.team?.id === away.team.id).map(mapGoal);
        const homeCards = details.filter((d) => !d.scoringPlay && (d.yellowCard || d.redCard) && d.team?.id === home.team.id).map(mapCard);
        const awayCards = details.filter((d) => !d.scoringPlay && (d.yellowCard || d.redCard) && d.team?.id === away.team.id).map(mapCard);

        return {
          id: parseInt(e.id),
          date: e.date,
          matchday: 0,
          homeTeam: {
            id: parseInt(home.team.id),
            name: home.team.displayName,
            shortName: home.team.shortDisplayName,
            tla: home.team.abbreviation,
            crest: home.team.logo,
          },
          awayTeam: {
            id: parseInt(away.team.id),
            name: away.team.displayName,
            shortName: away.team.shortDisplayName,
            tla: away.team.abbreviation,
            crest: away.team.logo,
          },
          score: { home: homeScore, away: awayScore },
          result,
          homeGoals,
          awayGoals,
          homeCards,
          awayCards,
        };
      });

    return NextResponse.json({ matches, count: matches.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}
