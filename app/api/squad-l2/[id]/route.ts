import { NextResponse } from "next/server";
import { fetchFotMobTeam, fotmobCrest, type FmSquadMember } from "@/app/lib/fotmob";

export const revalidate = 3600;

// Map FotMob positionIdsDesc → 4-letter codes the UI expects.
function mapPosition(desc: string | undefined, role: string | undefined): string {
  if (!desc) {
    if (role === "keeper_long" || role === "keeper") return "GK";
    return "MF";
  }
  const d = desc.toUpperCase();
  if (d === "GK") return "GK";
  if (d.startsWith("CB") || d === "LB" || d === "RB" || d === "LWB" || d === "RWB") return "DF";
  if (d.startsWith("DM") || d.startsWith("CM") || d.startsWith("AM") || d === "LM" || d === "RM") return "MF";
  if (d.startsWith("ST") || d === "CF" || d === "LW" || d === "RW") return "FW";
  return "MF";
}

interface OutPlayer {
  id: string;
  name: string;
  position: string;
  age: number;
  nationality: string[];
  marketValue: number;
  usGoals?: number;
  usAssists?: number;
  status?: string;
  foot?: string;
  shirtNumber?: number;
  rating?: number;
  imageUrl?: string;
}

function memberToPlayer(m: FmSquadMember): OutPlayer | null {
  if (!m.id || !m.name) return null;
  // Exclude coach entries — they have role.key="coach" and lack stats fields
  if (m.role?.key === "coach") return null;
  return {
    id: String(m.id),
    name: m.name,
    position: mapPosition(m.positionIdsDesc, m.role?.key),
    age: m.age ?? 0,
    nationality: m.cname ? [m.cname] : [],
    marketValue: m.transferValue ?? 0,
    usGoals: m.goals,
    usAssists: m.assists,
    status: m.injury ? "injury" : undefined,
    shirtNumber: m.shirtNumber,
    rating: m.rating,
    imageUrl: `https://images.fotmob.com/image_resources/playerimages/${m.id}.png`,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamId = parseInt(id, 10);
  if (!teamId) return NextResponse.json({ error: "Invalid team id" }, { status: 400 });

  try {
    const team = await fetchFotMobTeam(teamId);
    // Find coach in the sections (role === "coach")
    let coach: string | null = null;
    const players: OutPlayer[] = [];
    for (const section of team.squad) {
      for (const m of section.members) {
        if (m.role?.key === "coach") {
          coach = m.name;
          continue;
        }
        const p = memberToPlayer(m);
        if (p) players.push(p);
      }
    }

    const totalValue = players.reduce((s, p) => s + (p.marketValue ?? 0), 0);

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        crest: fotmobCrest(team.id),
        venue: null,
        founded: null,
        coach,
      },
      squad: players,
      stats: {
        totalValue,
        avgValue: players.length ? Math.round(totalValue / players.length) : 0,
        playerCount: players.length,
      },
      source: "fotmob",
    });
  } catch (err) {
    console.error("FotMob squad fetch error:", err);
    return NextResponse.json({
      team: { id: teamId, name: null, shortName: null, crest: fotmobCrest(teamId), venue: null, founded: null, coach: null },
      squad: [],
      stats: { totalValue: 0, avgValue: 0, playerCount: 0 },
      error: "FotMob injoignable.",
    }, { status: 200 });
  }
}
