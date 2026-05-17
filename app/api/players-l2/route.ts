import { NextResponse } from "next/server";
import { fetchFotMobLigue2 } from "@/app/lib/fotmob";

export const revalidate = 1800; // 30 min

export async function GET() {
  try {
    const fm = await fetchFotMobLigue2();
    return NextResponse.json({
      topByRating: fm.topByRating,
      topByGoals: fm.topByGoals,
      topByAssists: fm.topByAssists,
      updatedAt: fm.updatedAt,
      source: "fotmob",
    });
  } catch (err) {
    console.error("FotMob L2 players error:", err);
    return NextResponse.json({
      topByRating: [], topByGoals: [], topByAssists: [],
      error: "Impossible de récupérer les stats joueurs Ligue 2 depuis FotMob.",
    }, { status: 200 });
  }
}
