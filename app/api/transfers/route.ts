import { NextRequest, NextResponse } from "next/server";
import { CLUB_SEARCH_TERMS } from "@/app/lib/teamMapping";
import { fetchFotMobLigue1, fetchFotMobLigue2, fotmobCrest, type FmTransfer } from "@/app/lib/fotmob";

export const revalidate = 1800; // 30 min

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TransferItem {
  title: string;
  pubDate: string;
  source: string;
  url: string;
  type: "arrival" | "departure" | "rumor" | "news";
  player?: string;
  // Structured fields — populated for FotMob-sourced items (Ligue 1 & 2).
  // The "Boursier" board in the Mercato UI uses these to render rich rows.
  playerId?: number;
  playerImage?: string;
  position?: string;
  fee?: string | null;
  marketValue?: number | null;
  fromClub?: string;
  fromClubId?: number;
  fromClubCrest?: string;
  toClub?: string;
  toClubId?: number;
  toClubCrest?: string;
  onLoan?: boolean;
  contractExtension?: boolean;
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

interface ClubRef { id: number; name: string; shortName: string; crest: string }

// Hardcoded Ligue 1 list — IDs, names and crests rarely change in-season
// and avoiding a standings round-trip keeps Mercato snappy.
const CLUBS_L1: ClubRef[] = [
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

// Build a name-based search term when CLUB_SEARCH_TERMS doesn't cover the
// club (e.g. for Ligue 2 teams fetched dynamically).
function fallbackSearchTerms(name: string, shortName: string): string {
  // Plus-join the most meaningful tokens.
  const tokens = `${name} ${shortName}`
    .split(/\s+/)
    .filter(t => t.length > 2)
    .filter((t, i, a) => a.indexOf(t) === i);
  return tokens.join("+");
}

// Fetch Ligue 2 clubs + transfer items from FotMob (public, free).
async function fetchL2FromFotMob(): Promise<{ clubs: ClubRef[]; transfersByClub: Map<number, FmTransfer[]> }> {
  try {
    const fm = await fetchFotMobLigue2();
    const clubs: ClubRef[] = fm.table.map(t => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      crest: fotmobCrest(t.id),
    }));
    const transfersByClub = new Map<number, FmTransfer[]>();
    for (const tr of fm.transfers) {
      const clubId = clubs.find(c => c.id === tr.toClubId)?.id
        ?? clubs.find(c => c.id === tr.fromClubId)?.id;
      if (!clubId) continue;
      const arr = transfersByClub.get(clubId) ?? [];
      arr.push(tr);
      transfersByClub.set(clubId, arr);
    }
    return { clubs, transfersByClub };
  } catch (err) {
    console.error("FotMob L2 transfers fetch error:", err);
    return { clubs: [], transfersByClub: new Map() };
  }
}

// Fetch official ligue1.com news for a championship (1 = L1, 4 = L2).
// Endpoint discovered from their client bundle (ma-api.ligue1.fr).
interface L1ComArticle {
  id: string;
  title: string;
  slug: string;
  publishedAt: number;
  leadParagraph?: string;
  newsPageChampionshipId?: number;
}
async function fetchLigue1ComNews(championshipId: number): Promise<RSSItem[]> {
  try {
    const res = await fetch(
      `https://ma-api.ligue1.fr/articles?newsPageChampionshipId=${championshipId}&size=30`,
      {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(7000),
        next: { revalidate: 1800 },
      } as RequestInit
    );
    if (!res.ok) return [];
    const data: { articles?: L1ComArticle[] } = await res.json();
    const slugRoot = championshipId === 4 ? "ligue2bkt" : "ligue1mcdonalds";
    return (data.articles ?? []).map((a) => ({
      title: a.title,
      pubDate: new Date(a.publishedAt).toUTCString(),
      link: `https://ligue1.com/fr/competitions/${slugRoot}/news/${a.slug}`,
      source: "Ligue1.com",
    }));
  } catch {
    return [];
  }
}

function fotmobTransferToItem(tr: FmTransfer, clubId: number, isArrivalOverride?: boolean): TransferItem {
  const isArrival = isArrivalOverride ?? (tr.toClubId === clubId);
  const counterpart = isArrival ? tr.fromClubFullName ?? tr.fromClub : tr.toClubFullName ?? tr.toClub;
  const verb = tr.onLoan ? (isArrival ? "arrive en prêt de" : "part en prêt à") :
               tr.contractExtension ? "prolonge avec" :
               isArrival ? "signe en provenance de" : "rejoint";
  const title = `${tr.name} ${verb} ${counterpart}`;
  return {
    title,
    pubDate: tr.transferDate,
    source: "FotMob",
    url: `https://www.fotmob.com/players/${tr.playerId}/${encodeURIComponent(tr.name.toLowerCase().replace(/\s+/g, "-"))}`,
    type: tr.contractExtension ? "news" : isArrival ? "arrival" : "departure",
    player: tr.name,
    playerId: tr.playerId,
    playerImage: `https://images.fotmob.com/image_resources/playerimages/${tr.playerId}.png`,
    position: tr.position?.label,
    fee: tr.fee,
    marketValue: tr.marketValue,
    fromClub: tr.fromClubFullName ?? tr.fromClub,
    fromClubId: tr.fromClubId,
    fromClubCrest: tr.fromClubId ? fotmobCrest(tr.fromClubId) : undefined,
    toClub: tr.toClubFullName ?? tr.toClub,
    toClubId: tr.toClubId,
    toClubCrest: tr.toClubId ? fotmobCrest(tr.toClubId) : undefined,
    onLoan: tr.onLoan,
    contractExtension: tr.contractExtension,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const league = (searchParams.get("league") ?? "FL1").toUpperCase();

  let CLUBS: ClubRef[];
  let fotmobByClub: Map<number, FmTransfer[]> = new Map();
  // For L1 (where FotMob IDs ≠ our IDs) we precompute per-club items with the
  // correct arrival/departure direction and merge them in below.
  const fotmobItemsL1: Map<number, TransferItem[]> = new Map();
  if (league === "FL2") {
    const r = await fetchL2FromFotMob();
    CLUBS = r.clubs;
    fotmobByClub = r.transfersByClub;
  } else {
    CLUBS = CLUBS_L1;
    // Also try to enrich Ligue 1 with FotMob's structured transfers (player
    // photo, fee, market value, contract type). FotMob IDs ≠ football-data IDs,
    // so we match by club name. Silently fall back if FotMob is unreachable.
    try {
      const fm = await fetchFotMobLigue1();
      const norm = (s: string) => s.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
      // Build a name index for our football-data L1 clubs
      const nameToId = new Map<string, number>();
      for (const c of CLUBS) {
        nameToId.set(norm(c.name), c.id);
        nameToId.set(norm(c.shortName), c.id);
      }
      // Also map FotMob's L1 table names → FotMob club IDs (for the side that
      // FotMob references in transfers).
      const fmIdToName = new Map<number, string>();
      for (const t of fm.table) fmIdToName.set(t.id, t.name);

      const matchClub = (id: number, name: string | undefined): number | null => {
        const fmName = fmIdToName.get(id) ?? name ?? "";
        if (!fmName) return null;
        const n = norm(fmName);
        if (nameToId.has(n)) return nameToId.get(n)!;
        // Partial match — first 4 chars (e.g. "marseille" ≈ "om")
        for (const [k, v] of nameToId) {
          if (k.length >= 4 && (n.includes(k) || k.includes(n))) return v;
        }
        return null;
      };

      for (const tr of fm.transfers) {
        const toId = matchClub(tr.toClubId, tr.toClubFullName ?? tr.toClub);
        const fromId = matchClub(tr.fromClubId, tr.fromClubFullName ?? tr.fromClub);
        const clubId = toId ?? fromId;
        if (!clubId) continue;
        const isArrival = toId === clubId;
        const item = fotmobTransferToItem(tr, clubId, isArrival);
        const arr = fotmobItemsL1.get(clubId) ?? [];
        arr.push(item);
        fotmobItemsL1.set(clubId, arr);
      }
    } catch (err) {
      console.error("FotMob L1 transfers fetch error:", err);
    }
  }

  if (CLUBS.length === 0) {
    return NextResponse.json({
      clubs: [], updatedAt: new Date().toISOString(),
      sources: ["Google News", "RMC Sport", "Footmercato", "FotMob"],
      league,
      error: league === "FL2"
        ? "Liste des clubs Ligue 2 indisponible (FotMob injoignable)."
        : "Aucun club configuré.",
    });
  }
  // Fetch shared sources once
  const [rmcXml, footmercatoXml, ligue1ComL2] = await Promise.all([
    safeFetch("https://rmcsport.bfmtv.com/rss/football/"),
    safeFetch("https://www.footmercato.net/rss"),
    league === "FL2" ? fetchLigue1ComNews(4) : Promise.resolve([] as RSSItem[]),
  ]);

  const rmcItems = parseRSS(rmcXml, "RMC Sport");
  const footmercatoItems = parseRSS(footmercatoXml, "Footmercato");

  // Fetch Google News per club in parallel (cached 30min each)
  const googleResults = await Promise.all(
    CLUBS.map(async (club) => {
      const terms = CLUB_SEARCH_TERMS[club.id] ?? fallbackSearchTerms(club.name, club.shortName);
      if (!terms) return [];
      const xml = await safeFetch(
        `https://news.google.com/rss/search?q=${terms}+transfert+mercato&hl=fr&gl=FR&ceid=FR:fr`
      );
      return parseRSS(xml, "Google News").map((i) => ({ ...i, source: "Google News" }));
    })
  );

  // Build per-club transfer data
  const clubs: ClubTransfers[] = CLUBS.map((club, idx) => {
    const terms = CLUB_SEARCH_TERMS[club.id] ?? fallbackSearchTerms(club.name, club.shortName);
    const clubRMC = filterByClub(rmcItems, terms);
    const clubFoot = filterByClub(footmercatoItems, terms);
    const clubL1Com = filterByClub(ligue1ComL2, terms);
    const clubGoogle = googleResults[idx] ?? [];

    // Merge all, deduplicate by title
    const seen = new Set<string>();
    const allItems: TransferItem[] = [];

    // FotMob official transfers come first (highest signal — has player photo,
    // fee, market value, direction). L2 stores raw FmTransfer (FotMob IDs match
    // CLUBS ids), L1 stores precomputed TransferItem (because FotMob IDs differ).
    const fmRaw = fotmobByClub.get(club.id) ?? [];
    const fmPrecomputed = fotmobItemsL1.get(club.id) ?? [];
    const fmItems: TransferItem[] = [
      ...fmRaw.map(tr => fotmobTransferToItem(tr, club.id)),
      ...fmPrecomputed,
    ];
    for (const item of fmItems) {
      const key = item.title.toLowerCase().slice(0, 50);
      if (seen.has(key)) continue;
      seen.add(key);
      allItems.push(item);
    }

    for (const item of [...clubL1Com, ...clubGoogle, ...clubRMC, ...clubFoot]) {
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

    // Sort by date desc. Keep more items so the Boursier board has enough
    // structured FotMob transfers to surface (was 8 → too few once per-club).
    const sorted = allItems
      .filter((i) => i.title.length > 0)
      .sort((a, b) => {
        const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return db - da;
      })
      .slice(0, 20);

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
    sources: league === "FL2"
      ? ["FotMob", "Ligue1.com", "Google News", "RMC Sport", "Footmercato"]
      : ["FotMob", "Google News", "RMC Sport", "Footmercato"],
    league,
  });
}
