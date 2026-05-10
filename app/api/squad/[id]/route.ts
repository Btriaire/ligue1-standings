import { NextResponse } from "next/server";
import { TEAM_TM_MAP } from "@/app/lib/teamMapping";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

export const revalidate = 3600; // 1h

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
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamId = parseInt(id);
  const tmId = TEAM_TM_MAP[teamId];

  // Get team info from football-data.org
  const fdRes = await fetch(`https://api.football-data.org/v4/teams/${teamId}`, {
    headers: { "X-Auth-Token": API_KEY! },
    next: { revalidate: 3600 },
  });

  const fdData = fdRes.ok ? await fdRes.json() : {};

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

  const totalValue = players.reduce((sum, p) => sum + (p.marketValue ?? 0), 0);
  const avgValue = players.length > 0 ? totalValue / players.length : 0;
  const injured = players.filter((p) => p.status && p.status.toLowerCase().includes("injury"));
  const injuryRate = players.length > 0 ? injured.length / players.length : 0;

  const positionOrder: Record<string, number> = {
    Goalkeeper: 1, Defender: 2, Midfielder: 3, Winger: 4, "Centre-Forward": 5,
  };

  const sortedPlayers = [...players].sort(
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
    },
  });
}
