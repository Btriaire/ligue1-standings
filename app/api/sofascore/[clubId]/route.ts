import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebase-admin";

export const dynamic = "force-dynamic";

// Serves the cached SofaScore data for a club (stored weekly by the cron)
// GET /api/sofascore/[clubId]   — clubId is the football-data.org team id

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const db = getAdminFirestore();
    const doc = await db.collection("sofascore").doc(clubId).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "No SofaScore data yet — cron hasn't run", players: [], lastMatches: [], nextMatches: [] },
        { status: 404 }
      );
    }

    return NextResponse.json(doc.data());
  } catch (e) {
    console.error("sofascore GET error", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
