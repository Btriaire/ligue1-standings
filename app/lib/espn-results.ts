// Shared ESPN Ligue 1 scoreboard fetch + parse.
// Used by /api/results (live read) and /api/cron/ingest-results (persistence).

export interface ResultMatch {
  id: number;
  date: string;            // ISO 8601
  matchday: number;        // ESPN doesn't expose it → 0
  season: string;          // derived from date, e.g. "2024-2025"
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  score: { home: number; away: number };
  result: "home" | "away" | "draw";
  homeGoals: GoalEvent[];
  awayGoals: GoalEvent[];
  homeCards: CardEvent[];
  awayCards: CardEvent[];
}

export interface TeamRef {
  id: number; name: string; shortName: string; tla: string; crest: string;
}

export interface GoalEvent {
  minute: number | null;
  scorer: string | null;
  assist: string | null;
  type: "REGULAR" | "PENALTY" | "OWN_GOAL";
}

export interface CardEvent {
  minute: number | null;
  player: string | null;
  card: "YELLOW_CARD" | "RED_CARD";
}

interface EspnAthlete { displayName: string }
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
  team: { id: string; displayName: string; shortDisplayName: string; abbreviation: string; logo: string };
}
interface EspnEvent {
  id: string;
  date: string;
  status: { type: { name: string } };
  competitions: Array<{ competitors: EspnCompetitor[]; details: EspnDetail[] }>;
}

const FINISHED = new Set(["STATUS_FULL_TIME", "STATUS_FINAL", "STATUS_FINAL_PEN"]);

// Ligue 1 season: Aug–May. Aug+ → year/year+1, before → year-1/year.
export function seasonFromDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0-indexed
  return m >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function parseMinute(displayValue: string): number | null {
  const n = parseInt(displayValue);
  return isNaN(n) ? null : n;
}

function rangeYYYYMMDD(daysBack: number): string {
  const now = new Date();
  const start = new Date(now.getTime() - daysBack * 24 * 3600 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  return `${fmt(start)}-${fmt(now)}`;
}

// Fetch + parse finished L1 matches over the given trailing window.
// `daysBack` lets the cron pull a larger window (e.g. 90 days) than the live route (28 days).
export async function fetchEspnResults(daysBack = 28): Promise<ResultMatch[]> {
  const dateRange = rangeYYYYMMDD(daysBack);
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/scoreboard?dates=${dateRange}&limit=400`,
    { next: { revalidate: 300 } } as RequestInit,
  );
  if (!res.ok) throw new Error(`ESPN error ${res.status}`);
  const data = await res.json() as { events?: EspnEvent[] };

  const events = (data.events ?? []).filter(e => FINISHED.has(e.status?.type?.name ?? ""));

  return events
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((e): ResultMatch => {
      const comp = e.competitions[0];
      const home = comp.competitors.find(c => c.homeAway === "home")!;
      const away = comp.competitors.find(c => c.homeAway === "away")!;
      const details: EspnDetail[] = comp.details ?? [];

      const homeScore = parseInt(home.score ?? "0") || 0;
      const awayScore = parseInt(away.score ?? "0") || 0;
      const result: ResultMatch["result"] =
        homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw";

      const mapGoal = (d: EspnDetail): GoalEvent => ({
        minute: parseMinute(d.clock?.displayValue ?? ""),
        scorer: d.athletesInvolved?.[0]?.displayName ?? null,
        assist: d.athletesInvolved?.[1]?.displayName ?? null,
        type: d.ownGoal ? "OWN_GOAL" : d.penaltyKick ? "PENALTY" : "REGULAR",
      });
      const mapCard = (d: EspnDetail): CardEvent => ({
        minute: parseMinute(d.clock?.displayValue ?? ""),
        player: d.athletesInvolved?.[0]?.displayName ?? null,
        card: d.redCard ? "RED_CARD" : "YELLOW_CARD",
      });

      const homeGoals = details.filter(d => d.scoringPlay && d.team?.id === home.team.id).map(mapGoal);
      const awayGoals = details.filter(d => d.scoringPlay && d.team?.id === away.team.id).map(mapGoal);
      const homeCards = details.filter(d => !d.scoringPlay && (d.yellowCard || d.redCard) && d.team?.id === home.team.id).map(mapCard);
      const awayCards = details.filter(d => !d.scoringPlay && (d.yellowCard || d.redCard) && d.team?.id === away.team.id).map(mapCard);

      const teamRef = (c: EspnCompetitor): TeamRef => ({
        id: parseInt(c.team.id),
        name: c.team.displayName,
        shortName: c.team.shortDisplayName,
        tla: c.team.abbreviation,
        crest: c.team.logo,
      });

      return {
        id: parseInt(e.id),
        date: e.date,
        matchday: 0,
        season: seasonFromDate(e.date),
        homeTeam: teamRef(home),
        awayTeam: teamRef(away),
        score: { home: homeScore, away: awayScore },
        result,
        homeGoals, awayGoals, homeCards, awayCards,
      };
    });
}
