import { NextResponse } from "next/server";
import { buildL2SquadResponse } from "@/app/lib/squad-l2";

export const revalidate = 3600;

// Thin wrapper around buildL2SquadResponse(). The real work — and the response
// shape — lives in app/lib/squad-l2.ts so /api/squad/[id] can reuse it
// directly for L2 teams without a same-origin HTTP hop.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (!teamId) return NextResponse.json({ error: "Invalid team id" }, { status: 400 });
  return NextResponse.json(await buildL2SquadResponse(teamId));
}
