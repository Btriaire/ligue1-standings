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
  name:     string;
  url:      string;
  imageUrl: string;
  rating:   number;   // indice 1vs1 (0–99)
  goals:    number;
  assists:  number;
}

async function fetchPage(stat: string, page: number): Promise<string> {
  try {
    const res = await fetch(
      `https://one-versus-one.com/fr/classements/ligue-1/joueurs/${stat}?page=${page}`,
      {
        headers: { "User-Agent": "FootPredictom/1.0" },
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 86400 },
      } as RequestInit
    );
    return res.ok ? res.text() : Promise.resolve("");
  } catch { return ""; }
}

function parseRows(html: string): {
  url: string; name: string; id: string; clubAbbr: string; statValue: number;
}[] {
  const out: { url: string; name: string; id: string; clubAbbr: string; statValue: number }[] = [];
  const rowRe = /<tr\s+class="bg-gray-max[^"]*">([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const row = m[1];
    const urlM   = row.match(/location\.href\s*=\s*'(https:\/\/one-versus-one\.com\/fr\/joueurs\/[^']+)'/);
    if (!urlM) continue;
    const nameM  = row.match(/<span class="hidden md:block text-left font-normal text-14">([^<]+)<\/span>/);
    const idM    = row.match(/data-id="(\d+)"/);
    const abbrM  = row.match(/<span class="hidden md:block">([A-Z]{2,4})<\/span>/);
    const statM  = row.match(/<div class="flex items-center justify-end gap-2">\s*<span>\s*(\d+)\s*<\/span>/);
    out.push({
      url:       urlM[1],
      name:      nameM?.[1]?.trim() ?? decodeURIComponent(urlM[1].split("/").pop() ?? "").replace(/-/g, " "),
      id:        idM?.[1] ?? "",
      clubAbbr:  abbrM?.[1] ?? "",
      statValue: parseInt(statM?.[1] ?? "0"),
    });
  }
  return out;
}

function upsert(
  map: Map<string, PlayerStat>,
  rows: ReturnType<typeof parseRows>,
  abbr: string,
  field: "rating" | "goals" | "assists"
) {
  for (const r of rows) {
    if (r.clubAbbr !== abbr) continue;
    const existing = map.get(r.url);
    if (existing) {
      existing[field] = Math.max(existing[field], r.statValue);
    } else {
      map.set(r.url, {
        name:     r.name,
        url:      r.url,
        imageUrl: r.id ? `https://one-versus-one.com/storage/images/player/${r.id}.webp` : "",
        rating:   field === "rating"  ? r.statValue : 0,
        goals:    field === "goals"   ? r.statValue : 0,
        assists:  field === "assists" ? r.statValue : 0,
      });
    }
  }
}

export async function GET(req: Request) {
  const teamId = parseInt(new URL(req.url).searchParams.get("teamId") ?? "0");
  const abbr   = TEAM_ABBR[teamId];
  if (!abbr) return NextResponse.json({ players: [] });

  // Fetch in parallel:
  //  - indice-1vs1 pages 1-10  (top 200 rated players — covers all positions / all clubs)
  //  - buts pages 1-3          (top 60 scorers)
  //  - passes-décisives p1-3   (top 60 assisters)
  const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10,
         g1, g2, g3, a1, a2, a3] = await Promise.all([
    fetchPage("indice-1vs1", 1),
    fetchPage("indice-1vs1", 2),
    fetchPage("indice-1vs1", 3),
    fetchPage("indice-1vs1", 4),
    fetchPage("indice-1vs1", 5),
    fetchPage("indice-1vs1", 6),
    fetchPage("indice-1vs1", 7),
    fetchPage("indice-1vs1", 8),
    fetchPage("indice-1vs1", 9),
    fetchPage("indice-1vs1", 10),
    fetchPage("buts", 1),
    fetchPage("buts", 2),
    fetchPage("buts", 3),
    fetchPage("passes-d%C3%A9cisives", 1),
    fetchPage("passes-d%C3%A9cisives", 2),
    fetchPage("passes-d%C3%A9cisives", 3),
  ]);

  const map = new Map<string, PlayerStat>();

  upsert(map, parseRows(r1 + r2 + r3 + r4 + r5 + r6 + r7 + r8 + r9 + r10), abbr, "rating");
  upsert(map, parseRows(g1 + g2 + g3),   abbr, "goals");
  upsert(map, parseRows(a1 + a2 + a3),   abbr, "assists");

  // Sort: rating first (desc), then goals+assists as tiebreaker
  const players = Array.from(map.values())
    .sort((a, b) => {
      const rDiff = b.rating - a.rating;
      return rDiff !== 0 ? rDiff : (b.goals + b.assists) - (a.goals + a.assists);
    })
    .slice(0, 11);

  return NextResponse.json({ players });
}
