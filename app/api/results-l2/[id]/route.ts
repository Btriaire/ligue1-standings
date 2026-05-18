import { NextResponse } from "next/server";
import { fetchFotMobTeam, fotmobCrest } from "@/app/lib/fotmob";

export const revalidate = 1800;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (!teamId) return NextResponse.json({ error: "Invalid team id", matches: [] }, { status: 400 });

  try {
    const team = await fetchFotMobTeam(teamId);
    // Only finished matches, sorted desc by date
    const finished = team.fixtures
      .filter(f => f.status.finished && !f.status.cancelled)
      .sort((a, b) => new Date(b.status.utcTime).getTime() - new Date(a.status.utcTime).getTime());

    const matches = finished.map(f => {
      const homeScore = f.home.score ?? 0;
      const awayScore = f.away.score ?? 0;
      const result: "home" | "away" | "draw" =
        homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw";
      return {
        id: f.id,
        date: f.status.utcTime,
        homeTeam: {
          name: f.home.name,
          shortName: f.home.name,
          tla: f.home.name.slice(0, 3).toUpperCase(),
          crest: fotmobCrest(f.home.id),
        },
        awayTeam: {
          name: f.away.name,
          shortName: f.away.name,
          tla: f.away.name.slice(0, 3).toUpperCase(),
          crest: fotmobCrest(f.away.id),
        },
        score: { home: homeScore, away: awayScore },
        result,
        competition: f.tournament?.name ?? "",
      };
    });

    return NextResponse.json({
      matches,
      count: matches.length,
      source: "fotmob",
    });
  } catch (err) {
    console.error("FotMob results fetch error:", err);
    return NextResponse.json({ matches: [], count: 0, error: "FotMob injoignable." }, { status: 200 });
  }
}
