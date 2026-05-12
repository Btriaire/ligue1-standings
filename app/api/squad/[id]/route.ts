import { NextResponse } from "next/server";
import { TEAM_TM_MAP } from "@/app/lib/teamMapping";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

export const revalidate = 3600;

interface TmPlayer {
  id: string;
  name: string;
  position: string;
  dateOfBirth: string;
  age: number;
  nationality: string[];
  height: number;
  foot: string;
  joinedOn: string;
  signedFrom: string;
  contract: string;
  marketValue: number;
  status?: string;
  imageUrl?: string;
}

interface FdGoal {
  scorer?: { id: number; name: string };
  assist?: { id: number; name: string };
  team?: { id: number };
}

interface FdMatch {
  goals?: FdGoal[];
  homeTeam?: { id: number };
  awayTeam?: { id: number };
}

function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s-]/g, "")
    .trim();
}

function playerNamesMatch(scorerName: string, playerName: string): boolean {
  const s = normalizeForMatch(scorerName);
  const p = normalizeForMatch(playerName);
  if (s === p) return true;
  const sWords = s.split(/\s+/);
  const pWords = p.split(/\s+/);
  const sLast = sWords[sWords.length - 1];
  const pLast = pWords[pWords.length - 1];
  if (sLast.length > 3 && sLast === pLast) return true;
  // First name initial + last name
  return sWords.some((sw) => sw.length > 3 && pWords.some((pw) => pw === sw));
}

const EMPTY_RESPONSE = (teamId: number) => NextResponse.json({
  team: { id: teamId, name: null, shortName: null, crest: null, venue: null, founded: null, coach: null },
  squad: [],
  stats: { totalValue: 0, avgValue: 0, playerCount: 0, injuredCount: 0, injuryRate: 0, injured: [], recentMatchCount: 0, teamWins: 0, teamDraws: 0, teamLosses: 0 },
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamId = parseInt(id);
  const tmId = TEAM_TM_MAP[teamId];

  const [fdRes, matchesRes] = await Promise.all([
    fetch(`https://api.football-data.org/v4/teams/${teamId}`, {
      headers: { "X-Auth-Token": API_KEY! },
      next: { revalidate: 3600 },
    }).catch(() => null),
    fetch(`https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=5`, {
      headers: { "X-Auth-Token": API_KEY! },
      next: { revalidate: 3600 },
    }).catch(() => null),
  ]);

  const fdData = fdRes?.ok ? await fdRes.json() : {};

  // Extract scorer/assist contributions from last 5 matches
  const goalsByPlayer = new Map<string, number>();
  const assistsByPlayer = new Map<string, number>();
  let recentMatchCount = 0;
  let teamWins = 0, teamDraws = 0, teamLosses = 0;

  if (matchesRes?.ok) {
    try {
      const matchesData = await matchesRes.json();
      const matches: FdMatch[] = matchesData.matches ?? [];
      recentMatchCount = matches.length;

      for (const match of matches) {
        // Determine team result
        const isHome = match.homeTeam?.id === teamId;
        const isAway = match.awayTeam?.id === teamId;
        if (isHome || isAway) {
          // goals field might not exist in free tier, safe to skip
        }
        for (const goal of match.goals ?? []) {
          if (goal.team?.id !== teamId) continue;
          if (goal.scorer?.name) {
            const n = goal.scorer.name;
            goalsByPlayer.set(n, (goalsByPlayer.get(n) ?? 0) + 1);
          }
          if (goal.assist?.name) {
            const n = goal.assist.name;
            assistsByPlayer.set(n, (assistsByPlayer.get(n) ?? 0) + 1);
          }
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  // Get market values from Transfermarkt
  let players: TmPlayer[] = [];
  if (tmId) {
    try {
      const tmRes = await fetch(`https://transfermarkt-api.fly.dev/clubs/${tmId}/players`, {
        next: { revalidate: 3600 },
      });
      if (tmRes.ok) {
        const tmData = await tmRes.json();
        players = tmData.players ?? [];
      }
    } catch {
      // fallback to empty
    }
  }

  // Build team form from recent matches (derive from win/draw/loss if available)
  const totalValue = players.reduce((sum, p) => sum + (p.marketValue ?? 0), 0);
  const avgValue = players.length > 0 ? totalValue / players.length : 0;
  const injured = players.filter((p) => p.status && p.status.toLowerCase().includes("injury"));
  const injuryRate = players.length > 0 ? injured.length / players.length : 0;

  // Enrich each player with form data
  const positionOrder: Record<string, number> = {
    Goalkeeper: 1, Defender: 2, Midfielder: 3, Winger: 4, "Centre-Forward": 5,
  };

  const enrichedPlayers = players.map((p) => {
    const isInjured = p.status?.toLowerCase().includes("injury") ?? false;

    // Find goals/assists by loose name matching
    let recentGoals = 0;
    let recentAssists = 0;

    for (const [scorerName, goals] of goalsByPlayer) {
      if (playerNamesMatch(scorerName, p.name)) {
        recentGoals += goals;
        break;
      }
    }
    for (const [assistName, assists] of assistsByPlayer) {
      if (playerNamesMatch(assistName, p.name)) {
        recentAssists += assists;
        break;
      }
    }

    // Form badge
    let formBadge: "hot" | "good" | "neutral" | "cold";
    if (isInjured) {
      formBadge = "cold";
    } else if (recentGoals >= 2 || recentAssists >= 2 || (recentGoals + recentAssists) >= 3) {
      formBadge = "hot";
    } else if (recentGoals >= 1 || recentAssists >= 1) {
      formBadge = "good";
    } else {
      formBadge = "neutral";
    }

    return {
      ...p,
      recentGoals,
      recentAssists,
      formBadge,
    };
  });

  const sortedPlayers = [...enrichedPlayers].sort(
    (a, b) => (positionOrder[a.position] ?? 6) - (positionOrder[b.position] ?? 6)
  );

  return NextResponse.json({
    team: {
      id: teamId,
      name: fdData.name,
      shortName: fdData.shortName,
      crest: fdData.crest,
      venue: fdData.venue,
      founded: fdData.founded,
      coach: fdData.coach?.name ?? null,
    },
    squad: sortedPlayers,
    stats: {
      totalValue,
      avgValue: Math.round(avgValue),
      playerCount: players.length,
      injuredCount: injured.length,
      injuryRate: Math.round(injuryRate * 100),
      injured: injured.map((p) => ({ name: p.name, status: p.status })),
      recentMatchCount,
      teamWins,
      teamDraws,
      teamLosses,
    },
  });
}
