// Veracity API — returns a JSON report comparing CLUB_PROFILES leadership
// data against the current FR Wikipedia infobox for every club.
//
// Used by /admin/veracity (read on demand) and by the weekly cron at
// /api/cron/check-veracity (writes a notification log).

import { NextResponse } from "next/server";
import { checkAllClubs, checkClub } from "@/app/lib/clubVeracity";
import { CLUB_PROFILES } from "@/app/lib/clubProfile";

export const revalidate = 3600; // 1h
export const maxDuration = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get("id");

  if (idParam) {
    const id = Number(idParam);
    const profile = CLUB_PROFILES[id];
    if (!profile) return NextResponse.json({ error: "Unknown club id" }, { status: 404 });
    const report = await checkClub(profile);
    return NextResponse.json({ report, checkedAt: new Date().toISOString() });
  }

  const reports = await checkAllClubs();
  const mismatched = reports.filter(r => !r.ok);
  return NextResponse.json({
    total: reports.length,
    mismatched: mismatched.length,
    reports,
    checkedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" } });
}
