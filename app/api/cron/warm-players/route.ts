import { NextResponse } from "next/server";

// Called by Vercel Cron every day at 06:00 UTC
// Warms the /api/players cache for all Ligue 1 clubs

const TEAM_IDS = [524, 548, 516, 521, 529, 522, 546, 523, 576, 511, 512, 532, 533, 519, 543, 545, 525, 1045];

export async function GET(req: Request) {
  // Protect against public access — Vercel sets this header on cron calls
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const results = await Promise.allSettled(
    TEAM_IDS.map(id =>
      fetch(`${base}/api/players?teamId=${id}`, {
        headers: { "Cache-Control": "no-cache" }, // force revalidation
      }).then(r => r.ok ? `${id}: ok` : `${id}: ${r.status}`)
    )
  );

  const summary = results.map(r => r.status === "fulfilled" ? r.value : `error: ${r.reason}`);
  return NextResponse.json({ warmed: TEAM_IDS.length, summary });
}
