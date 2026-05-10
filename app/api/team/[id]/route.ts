import { NextResponse } from "next/server";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!API_KEY) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  const { id } = await params;

  try {
    const [finishedRes, scheduledRes] = await Promise.all([
      fetch(`https://api.football-data.org/v4/teams/${id}/matches?status=FINISHED&limit=5&competitions=FL1`, {
        headers: { "X-Auth-Token": API_KEY },
        next: { revalidate: 120 },
      }),
      fetch(`https://api.football-data.org/v4/teams/${id}/matches?status=SCHEDULED&limit=3&competitions=FL1`, {
        headers: { "X-Auth-Token": API_KEY },
        next: { revalidate: 120 },
      }),
    ]);

    if (!finishedRes.ok || !scheduledRes.ok) throw new Error("API error");

    const [finishedData, scheduledData] = await Promise.all([
      finishedRes.json(),
      scheduledRes.json(),
    ]);

    const mapMatch = (m: MatchRaw) => ({
      id: m.id,
      date: m.utcDate,
      matchday: m.matchday,
      status: m.status,
      homeTeam: { id: m.homeTeam.id, name: m.homeTeam.shortName || m.homeTeam.name, crest: m.homeTeam.crest },
      awayTeam: { id: m.awayTeam.id, name: m.awayTeam.shortName || m.awayTeam.name, crest: m.awayTeam.crest },
      score: m.score?.fullTime ?? { home: null, away: null },
    });

    return NextResponse.json({
      recent: (finishedData.matches ?? []).reverse().map(mapMatch),
      upcoming: (scheduledData.matches ?? []).map(mapMatch),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch team data" }, { status: 500 });
  }
}

interface MatchRaw {
  id: number;
  utcDate: string;
  matchday: number;
  status: string;
  homeTeam: { id: number; name: string; shortName: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; crest: string };
  score: { fullTime: { home: number | null; away: number | null } };
}
