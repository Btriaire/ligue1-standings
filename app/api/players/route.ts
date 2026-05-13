import { NextResponse } from "next/server";

export const revalidate = 86400; // 24h cache — data updates daily

// our teamId → one-versus-one abbreviation
const TEAM_ABBR: Record<number, string> = {
  524:  "PSG",
  548:  "MON",
  516:  "MAR",
  521:  "LIL",
  529:  "REN",
  522:  "NIC",
  546:  "LEN",
  523:  "LYO",
  576:  "STR",
  511:  "TOU",
  512:  "BRE",
  532:  "ANG",
  533:  "HAV",
  519:  "AUX",
  543:  "NAN",
  545:  "MET",
  525:  "LOR",
  1045: "PAR",
};

export interface PlayerStat {
  name:      string;
  url:       string;
  imageUrl:  string;
  goals:     number;
  assists:   number;
}

// Fetch one page of a ranking, return raw HTML
async function fetchRankingPage(stat: string, page: number): Promise<string> {
  const url = `https://one-versus-one.com/fr/classements/ligue-1/joueurs/${stat}?page=${page}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FootPredictom/1.0" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    } as RequestInit);
    return res.ok ? res.text() : Promise.resolve("");
  } catch { return ""; }
}

// Parse all player rows from a ranking page HTML
// Returns array of { url, name, id, clubAbbr, stat }
function parseRows(html: string): { url: string; name: string; id: string; clubAbbr: string; statValue: number }[] {
  const out: { url: string; name: string; id: string; clubAbbr: string; statValue: number }[] = [];

  // Each player row has class "bg-gray-max" on the <tr>
  const rowRe = /<tr\s+class="bg-gray-max[^"]*">([\s\S]*?)<\/tr>/g;
  let rowM: RegExpExecArray | null;

  while ((rowM = rowRe.exec(html)) !== null) {
    const row = rowM[1];

    // Player profile URL (td2 onclick)
    const urlM = row.match(/location\.href\s*=\s*'(https:\/\/one-versus-one\.com\/fr\/joueurs\/[^']+)'/);
    if (!urlM) continue;
    const url = urlM[1];

    // Player display name (unique long span classes)
    const nameM = row.match(/<span class="hidden md:block text-left font-normal text-14">([^<]+)<\/span>/);
    const name = nameM?.[1]?.trim() ?? decodeURIComponent(url.split("/").pop() ?? "").replace(/-/g, " ");

    // Player numeric ID for avatar
    const idM = row.match(/data-id="(\d+)"/);
    const id = idM?.[1] ?? "";

    // Club abbreviation — the club cell span has ONLY "hidden md:block" (no extra classes)
    // and contains 2-4 uppercase letters
    const abbrM = row.match(/<span class="hidden md:block">([A-Z]{2,4})<\/span>/);
    const clubAbbr = abbrM?.[1] ?? "";

    // Stat value — inside the justify-end flex div
    const statM = row.match(/<div class="flex items-center justify-end gap-2">\s*<span>\s*(\d+)\s*<\/span>/);
    const statValue = parseInt(statM?.[1] ?? "0");

    out.push({ url, name, id, clubAbbr, statValue });
  }
  return out;
}

export async function GET(req: Request) {
  const teamId = parseInt(new URL(req.url).searchParams.get("teamId") ?? "0");
  const abbr = TEAM_ABBR[teamId];

  if (!abbr) {
    return NextResponse.json({ players: [] });
  }

  // Fetch pages 1 + 2 for goals and assists in parallel (4 requests)
  const [goalsP1, goalsP2, assistsP1, assistsP2] = await Promise.all([
    fetchRankingPage("buts", 1),
    fetchRankingPage("buts", 2),
    fetchRankingPage("passes-decisives", 1),
    fetchRankingPage("passes-decisives", 2),
  ]);

  // Parse and index by URL
  const playerMap = new Map<string, PlayerStat>();

  for (const row of parseRows(goalsP1 + goalsP2)) {
    if (row.clubAbbr !== abbr) continue;
    const existing = playerMap.get(row.url);
    if (existing) {
      existing.goals = Math.max(existing.goals, row.statValue);
    } else {
      playerMap.set(row.url, {
        name:     row.name,
        url:      row.url,
        imageUrl: row.id ? `https://one-versus-one.com/storage/images/player/${row.id}.webp` : "",
        goals:    row.statValue,
        assists:  0,
      });
    }
  }

  for (const row of parseRows(assistsP1 + assistsP2)) {
    if (row.clubAbbr !== abbr) continue;
    const existing = playerMap.get(row.url);
    if (existing) {
      existing.assists = Math.max(existing.assists, row.statValue);
    } else {
      playerMap.set(row.url, {
        name:     row.name,
        url:      row.url,
        imageUrl: row.id ? `https://one-versus-one.com/storage/images/player/${row.id}.webp` : "",
        goals:    0,
        assists:  row.statValue,
      });
    }
  }

  // Sort by goals + assists desc, take top 8
  const players = Array.from(playerMap.values())
    .sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))
    .slice(0, 8);

  return NextResponse.json({ players });
}
