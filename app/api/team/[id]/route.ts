import { NextResponse } from "next/server";
import { fetchFotMobTeam, fotmobCrest } from "@/app/lib/fotmob";
import { isL2 } from "@/app/lib/clubProfile";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

// L2 IDs come from the canonical registry. football-data.org's free tier
// doesn't expose Ligue 2, so for L2 we proxy via FotMob and reshape into
// the same response.

async function l2TeamResponse(teamId: number) {
  try {
    const team = await fetchFotMobTeam(teamId);
    const now = Date.now();
    const fixtures = team.fixtures
      .filter(f => !f.status.cancelled)
      .sort((a, b) => new Date(a.status.utcTime).getTime() - new Date(b.status.utcTime).getTime());

    const shape = (f: typeof fixtures[number]) => ({
      id: f.id,
      date: f.status.utcTime,
      matchday: 0,
      status: f.status.finished ? "FINISHED" : "SCHEDULED",
      homeTeam: { id: f.home.id, name: f.home.name, crest: fotmobCrest(f.home.id) },
      awayTeam: { id: f.away.id, name: f.away.name, crest: fotmobCrest(f.away.id) },
      score: { home: f.home.score ?? null, away: f.away.score ?? null },
      goals: [] as { minute: number; scorer: string | null; type: string; teamId: number | null }[],
      bookings: [] as { minute: number; player: string; card: string; teamId: number }[],
      referee: null as string | null,
      refereeNationality: null as string | null,
    });

    const recent = fixtures.filter(f => f.status.finished).slice(-5).reverse().map(shape);
    const upcoming = fixtures.filter(f => !f.status.finished && new Date(f.status.utcTime).getTime() >= now).slice(0, 3).map(shape);

    return NextResponse.json({ recent, upcoming, live: [] });
  } catch (err) {
    console.error("FotMob team fetch error:", err);
    return NextResponse.json({ recent: [], upcoming: [], live: [], error: "FotMob injoignable." });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamIdNum = parseInt(id, 10);

  if (isL2(teamIdNum)) {
    return l2TeamResponse(teamIdNum);
  }

  if (!API_KEY) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  try {
    // Three lists: FINISHED (recap), LIVE (currently in play / halftime),
    // SCHEDULED (upcoming). The live list is short-cached because the
    // score keeps moving — we don't want La Fiche to skip an ongoing match.
    const [finishedRes, liveRes, scheduledRes] = await Promise.all([
      fetch(`https://api.football-data.org/v4/teams/${id}/matches?status=FINISHED&limit=5&competitions=FL1`, {
        headers: { "X-Auth-Token": API_KEY },
        next: { revalidate: 120 },
      }),
      fetch(`https://api.football-data.org/v4/teams/${id}/matches?status=IN_PLAY,PAUSED&competitions=FL1`, {
        headers: { "X-Auth-Token": API_KEY },
        next: { revalidate: 20 },
      }),
      fetch(`https://api.football-data.org/v4/teams/${id}/matches?status=SCHEDULED,TIMED&limit=3&competitions=FL1`, {
        headers: { "X-Auth-Token": API_KEY },
        next: { revalidate: 120 },
      }),
    ]);

    if (!finishedRes.ok || !scheduledRes.ok) throw new Error("API error");

    const [finishedData, liveData, scheduledData] = await Promise.all([
      finishedRes.json(),
      liveRes.ok ? liveRes.json() : Promise.resolve({ matches: [] }),
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
      goals: (m.goals ?? []).map(g => ({
        minute: g.minute,
        scorer: g.scorer?.name ?? null,
        type: g.type ?? "REGULAR",
        teamId: g.team?.id ?? null,
      })),
      bookings: (m.bookings ?? []).map(b => ({
        minute: b.minute,
        player: b.playerName,
        card: b.card,
        teamId: b.teamId,
      })),
      // Main referee from football-data.org (REFEREE type). May be empty
      // for matches not yet assigned by the LFP.
      referee: (m.referees ?? []).find(r => r.type === "REFEREE")?.name
        ?? m.referees?.[0]?.name
        ?? null,
      refereeNationality: (m.referees ?? []).find(r => r.type === "REFEREE")?.nationality ?? null,
    });

    // Put any live match at the FRONT of `upcoming` so consumers that pick
    // `upcoming[0]` get the ongoing match instead of jumping to the next one.
    const liveMatches    = (liveData.matches ?? []).map(mapMatch);
    const scheduledList  = (scheduledData.matches ?? []).map(mapMatch);

    return NextResponse.json({
      recent: (finishedData.matches ?? []).reverse().map(mapMatch),
      upcoming: [...liveMatches, ...scheduledList],
      live: liveMatches,
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
  goals?: { minute: number; type: string; team: { id: number } | null; scorer: { id: number; name: string } | null }[];
  bookings?: { minute: number; card: string; teamId: number; playerName: string }[];
  referees?: { id: number; name: string; type: string; nationality: string | null }[];
}
