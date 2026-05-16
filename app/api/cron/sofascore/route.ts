import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebase-admin";

// Runs every Monday at 03:00 UTC via Vercel Cron (see vercel.json)
// Fetches players + last 5 matches + next 3 matches from SofaScore for all 18 L1 clubs
// Stores results in Firestore → sofascore/{fdoId}
// ─────────────────────────────────────────────────────────────────────────────

/** football-data.org id → SofaScore team id */
const CLUB_MAP: Record<number, number> = {
  524:  1644,  // PSG
  548:  1653,  // Monaco
  516:  1641,  // Marseille
  521:  1643,  // Lille
  529:  1658,  // Rennes
  522:  1661,  // Nice
  546:  1648,  // Lens
  523:  1649,  // Lyon
  576:  1659,  // Strasbourg
  511:  1681,  // Toulouse
  512:  1715,  // Brest
  532:  1684,  // Angers
  533:  1662,  // Le Havre
  519:  1646,  // Auxerre
  543:  1647,  // Nantes
  545:  1651,  // Metz
  525:  1656,  // Lorient
  1045: 6070,  // Paris FC
};

const SOFA_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Referer": "https://www.sofascore.com/",
  "Accept": "application/json",
  "Accept-Language": "fr-FR,fr;q=0.9",
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function sofaFetch(url: string) {
  const res = await fetch(url, { headers: SOFA_HEADERS, next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`SofaScore ${res.status} — ${url}`);
  return res.json();
}

// ─── Player shape we persist ──────────────────────────────────────────────────
interface SofaPlayer {
  id: number;
  name: string;
  shortName: string;
  position: string;
  jerseyNumber: string;
  nationality: string;
  height: number | null;
  preferredFoot: string | null;
  dateOfBirth: number | null;       // unix timestamp
  marketValue: number | null;       // euros
  contractUntil: number | null;     // unix timestamp
  injured: boolean;
  injuryReason: string | null;
  injuryReturnTimestamp: number | null;
  sofaRating?: number | null;
}

// ─── Match shape we persist ───────────────────────────────────────────────────
interface SofaMatch {
  id: number;
  tournament: string;
  homeTeam: string;
  homeTeamId: number;
  awayTeam: string;
  awayTeamId: number;
  homeScore: number | null;
  awayScore: number | null;
  startTimestamp: number;
  status: string;
}

function parsePlayers(raw: { players?: { player: Record<string, unknown> }[] }): SofaPlayer[] {
  if (!raw?.players) return [];
  return raw.players.map(({ player: p }: { player: Record<string, unknown> }) => {
    const inj = p.injury as Record<string, unknown> | undefined;
    return {
      id: p.id as number,
      name: p.name as string,
      shortName: p.shortName as string ?? (p.name as string),
      position: (p.position as string) ?? "Unknown",
      jerseyNumber: (p.shirtNumber ?? p.jerseyNumber ?? "?") as string,
      nationality: ((p.country as Record<string, string>)?.name) ?? "?",
      height: (p.height as number) ?? null,
      preferredFoot: (p.preferredFoot as string) ?? null,
      dateOfBirth: (p.dateOfBirthTimestamp as number) ?? null,
      marketValue: (p.proposedMarketValue as number) ?? null,
      contractUntil: (p.contractUntilTimestamp as number) ?? null,
      injured: !!inj,
      injuryReason: (inj?.reason as string) ?? null,
      injuryReturnTimestamp: (inj?.returnTimestamp as number) ?? null,
    };
  });
}

function parseEvents(raw: { events?: Record<string, unknown>[] }): SofaMatch[] {
  if (!raw?.events) return [];
  return raw.events.map((e: Record<string, unknown>) => {
    const ht = e.homeTeam as Record<string, unknown>;
    const at = e.awayTeam as Record<string, unknown>;
    const hs = e.homeScore as Record<string, number> | undefined;
    const as_ = e.awayScore as Record<string, number> | undefined;
    const tour = e.tournament as Record<string, unknown>;
    const status = e.status as Record<string, unknown>;
    return {
      id: e.id as number,
      tournament: (tour?.name as string) ?? "?",
      homeTeam: (ht?.name as string) ?? "?",
      homeTeamId: (ht?.id as number) ?? 0,
      awayTeam: (at?.name as string) ?? "?",
      awayTeamId: (at?.id as number) ?? 0,
      homeScore: hs?.current ?? null,
      awayScore: as_?.current ?? null,
      startTimestamp: (e.startTimestamp as number) ?? 0,
      status: (status?.description as string) ?? "?",
    };
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  // Protect: Vercel sends CRON_SECRET in Authorization header
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const db = getAdminFirestore();
  const fdoIds = Object.keys(CLUB_MAP).map(Number);
  const results: { fdoId: number; sofaId: number; status: string }[] = [];

  for (const fdoId of fdoIds) {
    const sofaId = CLUB_MAP[fdoId];
    try {
      // Fetch in parallel but keep a 600ms gap between clubs to be respectful
      const [playersRaw, lastRaw, nextRaw] = await Promise.all([
        sofaFetch(`https://api.sofascore.com/api/v1/team/${sofaId}/players`),
        sofaFetch(`https://api.sofascore.com/api/v1/team/${sofaId}/events/last/0`),
        sofaFetch(`https://api.sofascore.com/api/v1/team/${sofaId}/events/next/0`).catch(() => ({ events: [] })),
      ]);

      const players    = parsePlayers(playersRaw);
      const lastEvents = parseEvents(lastRaw).slice(-5);   // last 5
      const nextEvents = parseEvents(nextRaw).slice(0, 3);  // next 3

      await db.collection("sofascore").doc(String(fdoId)).set({
        fdoId,
        sofaId,
        players,
        lastMatches: lastEvents,
        nextMatches: nextEvents,
        fetchedAt: Date.now(),
      });

      results.push({ fdoId, sofaId, status: "ok" });
    } catch (err) {
      results.push({ fdoId, sofaId, status: `error: ${(err as Error).message}` });
    }

    // 700ms between clubs — polite scraping
    await sleep(700);
  }

  const ok  = results.filter(r => r.status === "ok").length;
  const err = results.filter(r => r.status !== "ok").length;
  return NextResponse.json({ ok, errors: err, results, runAt: new Date().toISOString() });
}
