import { NextResponse } from "next/server";

export const maxDuration = 300;

// Called by Vercel Cron every day at 06:00 UTC.
// Pre-warms the squad caches the /players page consumes so the first visitor
// of the day doesn't hit a cold football-data / FotMob backend.

const L1_TEAM_IDS = [524, 548, 516, 521, 529, 522, 546, 523, 576, 511, 512, 532, 533, 519, 543, 545, 525, 1045];
const L2_TEAM_IDS = [10242, 9853, 9837, 10249, 8311, 9747, 8682, 6390, 4120, 293352, 6355, 47214, 9855, 8481, 4170, 7853, 7794, 8587];

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

async function warmSerial(base: string, ids: number[], path: string, gapMs: number) {
  const summary: string[] = [];
  for (const id of ids) {
    try {
      const r = await fetch(`${base}${path}/${id}`, {
        headers: { "Cache-Control": "no-cache" },
      });
      summary.push(`${id}: ${r.ok ? "ok" : r.status}`);
    } catch (err) {
      summary.push(`${id}: error ${err instanceof Error ? err.message : String(err)}`);
    }
    await wait(gapMs);
  }
  return summary;
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";

  // L1 squads go through football-data (10 req/min free tier) → space them out.
  const l1 = await warmSerial(base, L1_TEAM_IDS, "/api/squad", 7000);
  // L2 squads use FotMob, far less rate-limited.
  const l2 = await warmSerial(base, L2_TEAM_IDS, "/api/squad-l2", 1500);

  return NextResponse.json({
    warmedL1: L1_TEAM_IDS.length,
    warmedL2: L2_TEAM_IDS.length,
    l1, l2,
  });
}
