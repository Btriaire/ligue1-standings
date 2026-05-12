import { NextResponse } from "next/server";
import { CLUB_SEARCH_TERMS } from "@/app/lib/teamMapping";

export const revalidate = 1800; // 30 min

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TransferItem {
  title: string;
  pubDate: string;
  source: string;
  url: string;
  type: "arrival" | "departure" | "rumor" | "news";
  player?: string;
}

export interface ClubTransfers {
  teamId: number;
  name: string;
  shortName: string;
  crest: string;
  items: TransferItem[];
  arrivals: number;
  departures: number;
  rumors: number;
}

// ── Keywords ──────────────────────────────────────────────────────────────────

const ARRIVAL_KW = [
  "recrute", "recrutement", "signe", "signing", "signé", "arrive", "arrivée", "transfert entrant",
  "prêt entrant", "sous contrat", "rejoint", "nouvelle recrue", "officiel", "accord signé",
  "bouclé", "annoncé", "welcome",
];
const DEPARTURE_KW = [
  "quitte", "part ", "vend ", "cède", "prêté à", "prêt sortant", "départ", "vendu", "transféré",
  "résiliation", "fin de contrat", "libéré", "à vendre", "sur le départ", "bye",
];
const RUMOR_KW = [
  "piste", "suivi", "intéressé", "offre", "négocie", "proche d'un accord", "rumeur", "cible",
  "dans le viseur", "en discussions", "approches", "sondé", "mercato", "accord possible",
  "pourrait signer", "devrait", "serait intéressé", "aurait proposé", "selon", "d'après",
];

function classifyTitle(title: string): "arrival" | "departure" | "rumor" | "news" {
  const lower = title.toLowerCase();
  if (DEPARTURE_KW.some((k) => lower.includes(k))) return "departure";
  if (ARRIVAL_KW.some((k) => lower.includes(k))) return "arrival";
  if (RUMOR_KW.some((k) => lower.includes(k))) return "rumor";
  return "news";
}

// ── RSS helpers ───────────────────────────────────────────────────────────────

interface RSSItem { title: string; pubDate: string; link: string; source: string }

function parseRSS(xml: string, defaultSource: string): RSSItem[] {
  const items: RSSItem[] = [];
  const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const m of matches) {
    const block = m[1];
    const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] ?? "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] ??
      block.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] ?? "";
    if (title.length > 10) items.push({ title, pubDate, link, source: defaultSource });
  }
  return items;
}

async function safeFetch(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate: 1800 } } as RequestInit);
    return res.ok ? await res.text() : "";
  } catch { return ""; }
}

function filterByClub(items: RSSItem[], searchTerms: string): RSSItem[] {
  const terms = searchTerms.toLowerCase().split("+").filter((t) => t.length > 2);
  return items.filter((item) => {
    const lower = item.title.toLowerCase();
    return terms.some((t) => lower.includes(t));
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

const CLUBS = [
  { id: 524,  name: "Paris Saint-Germain", shortName: "PSG",        crest: "https://crests.football-data.org/524.png" },
  { id: 546,  name: "RC Lens",             shortName: "RC Lens",    crest: "https://crests.football-data.org/546.png" },
  { id: 523,  name: "Olympique Lyonnais",  shortName: "Lyon",       crest: "https://crests.football-data.org/523.png" },
  { id: 521,  name: "LOSC Lille",          shortName: "Lille",      crest: "https://crests.football-data.org/521.png" },
  { id: 529,  name: "Stade Rennais",       shortName: "Rennes",     crest: "https://crests.football-data.org/529.png" },
  { id: 548,  name: "AS Monaco",           shortName: "Monaco",     crest: "https://crests.football-data.org/548.png" },
  { id: 516,  name: "Olympique Marseille", shortName: "Marseille",  crest: "https://crests.football-data.org/516.png" },
  { id: 576,  name: "RC Strasbourg",       shortName: "Strasbourg", crest: "https://crests.football-data.org/576.png" },
  { id: 525,  name: "FC Lorient",          shortName: "Lorient",    crest: "https://crests.football-data.org/525.png" },
  { id: 511,  name: "Toulouse FC",         shortName: "Toulouse",   crest: "https://crests.football-data.org/511.png" },
  { id: 1045, name: "Paris FC",            shortName: "Paris FC",   crest: "https://crests.football-data.org/1045.png" },
  { id: 512,  name: "Stade Brestois",      shortName: "Brest",      crest: "https://crests.football-data.org/512.png" },
  { id: 532,  name: "Angers SCO",          shortName: "Angers",     crest: "https://crests.football-data.org/532.png" },
  { id: 533,  name: "Le Havre AC",         shortName: "Le Havre",   crest: "https://crests.football-data.org/533.png" },
  { id: 522,  name: "OGC Nice",            shortName: "Nice",       crest: "https://crests.football-data.org/522.png" },
  { id: 519,  name: "AJ Auxerre",          shortName: "Auxerre",    crest: "https://crests.football-data.org/519.png" },
  { id: 543,  name: "FC Nantes",           shortName: "Nantes",     crest: "https://crests.football-data.org/543.png" },
  { id: 545,  name: "FC Metz",             shortName: "Metz",       crest: "https://crests.football-data.org/545.png" },
];

export async function GET() {
  // Fetch shared sources once
  const [rmcXml, footmercatoXml] = await Promise.all([
    safeFetch("https://rmcsport.bfmtv.com/rss/football/"),
    safeFetch("https://www.footmercato.net/rss"),
  ]);

  const rmcItems = parseRSS(rmcXml, "RMC Sport");
  const footmercatoItems = parseRSS(footmercatoXml, "Footmercato");

  // Fetch Google News per club in parallel (cached 30min each)
  const googleResults = await Promise.all(
    CLUBS.map(async (club) => {
      const terms = CLUB_SEARCH_TERMS[club.id];
      if (!terms) return [];
      const xml = await safeFetch(
        `https://news.google.com/rss/search?q=${terms}+transfert+mercato&hl=fr&gl=FR&ceid=FR:fr`
      );
      return parseRSS(xml, "Google News").map((i) => ({ ...i, source: "Google News" }));
    })
  );

  // Build per-club transfer data
  const clubs: ClubTransfers[] = CLUBS.map((club, idx) => {
    const terms = CLUB_SEARCH_TERMS[club.id] ?? club.shortName;
    const clubRMC = filterByClub(rmcItems, terms);
    const clubFoot = filterByClub(footmercatoItems, terms);
    const clubGoogle = googleResults[idx] ?? [];

    // Merge all, deduplicate by title
    const seen = new Set<string>();
    const allItems: TransferItem[] = [];

    for (const item of [...clubGoogle, ...clubRMC, ...clubFoot]) {
      const key = item.title.toLowerCase().slice(0, 50);
      if (seen.has(key)) continue;
      seen.add(key);
      allItems.push({
        title: item.title.slice(0, 140),
        pubDate: item.pubDate,
        source: item.source,
        url: item.link,
        type: classifyTitle(item.title),
      });
    }

    // Sort by date desc, take top 8
    const sorted = allItems
      .filter((i) => i.title.length > 0)
      .sort((a, b) => {
        const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return db - da;
      })
      .slice(0, 8);

    return {
      teamId: club.id,
      name: club.name,
      shortName: club.shortName,
      crest: club.crest,
      items: sorted,
      arrivals: sorted.filter((i) => i.type === "arrival").length,
      departures: sorted.filter((i) => i.type === "departure").length,
      rumors: sorted.filter((i) => i.type === "rumor").length,
    };
  });

  return NextResponse.json({
    clubs,
    updatedAt: new Date().toISOString(),
    sources: ["Google News", "RMC Sport", "Footmercato"],
  });
}
