import { NextResponse } from "next/server";
import { formScore01 } from "@/app/lib/scoring";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const COMPETITION = "FL1";

export const revalidate = 300;

interface TeamRaw {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

interface StandingEntry {
  position: number;
  team: TeamRaw;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string;
}

interface MatchRaw {
  id: number;
  utcDate: string;
  matchday: number;
  homeTeam: TeamRaw;
  awayTeam: TeamRaw;
  score: { fullTime: { home: number | null; away: number | null } };
}

function teamStrength(s: StandingEntry): number {
  const ppg = s.playedGames > 0 ? s.points / s.playedGames : 0;
  const gdpg = s.playedGames > 0 ? s.goalDifference / s.playedGames : 0;
  const form = formScore01(s.form);
  const posScore = (19 - s.position) / 17;
  return 0.35 * (ppg / 3) + 0.25 * ((gdpg + 3) / 6) + 0.25 * form + 0.15 * posScore;
}

function predict(home: StandingEntry, away: StandingEntry) {
  const HOME_ADVANTAGE = 0.08;
  const homeStr = Math.min(1, Math.max(0, teamStrength(home) + HOME_ADVANTAGE));
  const awayStr = Math.min(1, Math.max(0, teamStrength(away)));

  const total = homeStr + awayStr + 0.001;
  const rawHome = homeStr / total;
  const rawAway = awayStr / total;

  const diff = Math.abs(rawHome - rawAway);
  const drawFactor = Math.max(0.12, 0.32 - diff * 0.6);

  let homeProb = rawHome * (1 - drawFactor);
  let awayProb = rawAway * (1 - drawFactor);
  let drawProb = drawFactor;

  const sum = homeProb + awayProb + drawProb;
  homeProb = Math.round((homeProb / sum) * 100);
  awayProb = Math.round((awayProb / sum) * 100);
  drawProb = 100 - homeProb - awayProb;

  const winner =
    homeProb > awayProb && homeProb > drawProb ? "home" :
    awayProb > homeProb && awayProb > drawProb ? "away" : "draw";

  const confidence =
    Math.max(homeProb, awayProb, drawProb) >= 55 ? "high" :
    Math.max(homeProb, awayProb, drawProb) >= 42 ? "medium" : "low";

  const homeXG = +(((home.goalsFor / Math.max(home.playedGames, 1)) * 0.6 +
    (away.goalsAgainst / Math.max(away.playedGames, 1)) * 0.4) * (1 + HOME_ADVANTAGE / 2)).toFixed(1);
  const awayXG = +(((away.goalsFor / Math.max(away.playedGames, 1)) * 0.6 +
    (home.goalsAgainst / Math.max(home.playedGames, 1)) * 0.4) * 0.95).toFixed(1);

  return { homeProb, drawProb, awayProb, winner, confidence, homeXG, awayXG };
}

export async function GET() {
  if (!API_KEY) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  try {
    const [standingsRes, matchesRes] = await Promise.all([
      fetch(`https://api.football-data.org/v4/competitions/${COMPETITION}/standings`, {
        headers: { "X-Auth-Token": API_KEY },
        next: { revalidate: 300 },
      }),
      fetch(`https://api.football-data.org/v4/competitions/${COMPETITION}/matches?status=SCHEDULED`, {
        headers: { "X-Auth-Token": API_KEY },
        next: { revalidate: 300 },
      }),
    ]);

    if (!standingsRes.ok || !matchesRes.ok) throw new Error("API error");

    const [standingsData, matchesData] = await Promise.all([
      standingsRes.json(),
      matchesRes.json(),
    ]);

    const table: StandingEntry[] = standingsData.standings?.[0]?.table ?? [];
    const standingMap = new Map(table.map((s: StandingEntry) => [s.team.id, s]));

    const upcomingMatches: MatchRaw[] = matchesData.matches ?? [];
    const nextMatchday = upcomingMatches[0]?.matchday ?? null;
    const nextMatches = upcomingMatches.filter((m: MatchRaw) => m.matchday === nextMatchday);

    const predictions = nextMatches
      .map((m: MatchRaw) => {
        const homeStanding = standingMap.get(m.homeTeam.id);
        const awayStanding = standingMap.get(m.awayTeam.id);
        if (!homeStanding || !awayStanding) return null;

        const pred = predict(homeStanding, awayStanding);

        return {
          id: m.id,
          date: m.utcDate,
          matchday: m.matchday,
          homeTeam: {
            id: m.homeTeam.id,
            name: m.homeTeam.name,
            shortName: m.homeTeam.shortName,
            tla: m.homeTeam.tla,
            crest: m.homeTeam.crest,
            position: homeStanding.position,
            points: homeStanding.points,
            playedGames: homeStanding.playedGames,
            form: homeStanding.form,
            ppg: +(homeStanding.points / Math.max(homeStanding.playedGames, 1)).toFixed(2),
            goalsFor: homeStanding.goalsFor,
            goalsAgainst: homeStanding.goalsAgainst,
            goalDifference: homeStanding.goalDifference,
          },
          awayTeam: {
            id: m.awayTeam.id,
            name: m.awayTeam.name,
            shortName: m.awayTeam.shortName,
            tla: m.awayTeam.tla,
            crest: m.awayTeam.crest,
            position: awayStanding.position,
            points: awayStanding.points,
            playedGames: awayStanding.playedGames,
            form: awayStanding.form,
            ppg: +(awayStanding.points / Math.max(awayStanding.playedGames, 1)).toFixed(2),
            goalsFor: awayStanding.goalsFor,
            goalsAgainst: awayStanding.goalsAgainst,
            goalDifference: awayStanding.goalDifference,
          },
          prediction: pred,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ predictions, matchday: nextMatchday });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
