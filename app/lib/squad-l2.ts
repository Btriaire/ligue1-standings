// Shared L2 squad builder. Used by:
//   • /api/squad-l2/[id]  — direct caller for L2-aware pages.
//   • /api/squad/[id]     — delegates here when the team is L2, so the
//                           public /api/squad/{id} contract stays uniform
//                           across L1/L2 without a same-origin HTTP hop.
//
// Football-data.org's free tier doesn't cover Ligue 2, so L2 squads ride on
// FotMob. We reshape into the same `{ team, squad, stats }` envelope the L1
// route returns (minus the L1-only datamb/Understat/Sofa fields).

import { fetchFotMobTeam, fotmobCrest, type FmSquadMember } from "@/app/lib/fotmob";

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

export interface L2Player {
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

export interface L2SquadResponse {
  team: {
    id: number;
    name: string | null;
    shortName: string | null;
    crest: string | null;
    venue: null;
    founded: null;
    coach: string | null;
  };
  squad: L2Player[];
  stats: {
    totalValue: number;
    avgValue: number;
    playerCount: number;
  };
  source?: "fotmob";
  error?: string;
}

function memberToPlayer(m: FmSquadMember): L2Player | null {
  if (!m.id || !m.name) return null;
  // Exclude coach entries — they have role.key="coach" and lack stats fields.
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

/**
 * Build a squad response for a Ligue 2 team. Always resolves — on FotMob
 * failure it returns an empty-shape response with an `error` field so
 * callers don't need try/catch.
 */
export async function buildL2SquadResponse(teamId: number): Promise<L2SquadResponse> {
  try {
    const team = await fetchFotMobTeam(teamId);
    let coach: string | null = null;
    const players: L2Player[] = [];
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

    return {
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
    };
  } catch (err) {
    console.error("FotMob squad fetch error:", err);
    return {
      team: { id: teamId, name: null, shortName: null, crest: fotmobCrest(teamId), venue: null, founded: null, coach: null },
      squad: [],
      stats: { totalValue: 0, avgValue: 0, playerCount: 0 },
      error: "FotMob injoignable.",
    };
  }
}
