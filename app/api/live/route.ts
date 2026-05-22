import { NextResponse } from "next/server";
import type { Team, FinalScore } from "@/app/lib/types";

export const dynamic = "force-dynamic";

// Live Ligue 1 matches from ESPN scoreboard. Polled every 10s by the
// "Le Direct" button, so we keep the route cheap and no-cache.

interface EspnCompetitor {
  homeAway: "home" | "away";
  score: string;
  team: { id: string; displayName: string; shortDisplayName: string; abbreviation: string; logo: string };
}
interface EspnEvent {
  id: string;
  date: string;
  status: {
    type: { name: string; state: string; completed: boolean; detail: string; shortDetail: string };
    displayClock?: string;
    period?: number;
  };
  competitions: Array<{ competitors: EspnCompetitor[] }>;
}

export interface LiveMatch {
  id: number;
  date: string;
  status: string;       // ESPN status name (e.g. STATUS_IN_PROGRESS)
  statusLabel: string;  // Short human label ("45'", "MT", "FT", "20:00")
  isLive: boolean;
  homeTeam: Team;
  awayTeam: Team;
  score: FinalScore;
}

const LIVE_STATES = new Set(["STATUS_IN_PROGRESS", "STATUS_HALFTIME", "STATUS_FIRST_HALF", "STATUS_SECOND_HALF", "STATUS_END_PERIOD"]);

function todayRange(): string {
  // ESPN uses YYYYMMDD-YYYYMMDD; use ±1 day window to cover TZ edges.
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 3600 * 1000);
  const end   = new Date(now.getTime() + 24 * 3600 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  return `${fmt(start)}-${fmt(end)}`;
}

export async function GET() {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard?dates=${todayRange()}&limit=50`,
      { cache: "no-store" } as RequestInit,
    );
    if (!res.ok) throw new Error(`ESPN error ${res.status}`);
    const data = await res.json() as { events?: EspnEvent[] };

    const matches: LiveMatch[] = (data.events ?? []).map(e => {
      const comp = e.competitions[0];
      const home = comp.competitors.find(c => c.homeAway === "home")!;
      const away = comp.competitors.find(c => c.homeAway === "away")!;
      const st = e.status;
      const isLive = LIVE_STATES.has(st.type.name) || (st.type.state === "in" && !st.type.completed);

      // Build a compact label
      let statusLabel = st.type.shortDetail || st.type.detail || "";
      if (st.type.name === "STATUS_HALFTIME") statusLabel = "MT";
      else if (st.type.name === "STATUS_FULL_TIME" || st.type.name === "STATUS_FINAL") statusLabel = "FT";
      else if (isLive && st.displayClock) statusLabel = `${st.displayClock}'`;

      return {
        id: parseInt(e.id),
        date: e.date,
        status: st.type.name,
        statusLabel,
        isLive,
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
        score: { home: parseInt(home.score ?? "0") || 0, away: parseInt(away.score ?? "0") || 0 },
      };
    });

    // Sort: live first, then by date
    matches.sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    const live = matches.filter(m => m.isLive);
    return NextResponse.json({
      matches,
      live,
      liveCount: live.length,
      fetchedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ matches: [], live: [], liveCount: 0, error: String(err) }, { status: 500 });
  }
}
