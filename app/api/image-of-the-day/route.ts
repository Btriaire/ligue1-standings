// Image of the Day — picks the most recent media-bearing item from a
// rotating pool of football sources (tweets first, then fan-site
// articles, then So Foot). Falls through layers so the homepage card
// always has something to show, even when Twitter syndication is rate-
// limited on Vercel.

import { NextResponse } from "next/server";
import { fetchSyndicationTimeline, type Tweet } from "@/app/lib/twitter-syndication";

export const dynamic = "force-dynamic";

// ── Pool of high-signal football-only Twitter accounts ──────────────────────
// (Generalist sports accounts like @lequipe / @RMCsport are excluded — they
// post about rugby, tennis, F1, etc. We want football media only.)
const SEED_ACCOUNTS = [
  "actufoot_",
  "footmercato",
  "OptaJean",
  "TeamPSG",
  "OM_Officiel",
  "OL",
  "loscofficiel",
  "FRStaff",
  "Ligue1UberEats",
  "Ligue2BKT",
  "FFF",
  "EquipedeFrance",
];

// ── Football vocabulary filter ───────────────────────────────────────────────
// A candidate must look footbally (positive keyword) AND not look like another
// sport (negative keyword). Applied to title + author string, case-insensitive.
const FOOTBALL_HINTS = [
  "foot", "football", "ligue 1", "ligue 2", "l1", "l2", "psg", "om ", "ol ",
  "losc", "asse", "stade ", "rc ", "fc ", "uefa", "fifa", "champions league",
  "ligue des champions", "europa", "coupe du monde", "world cup", "mercato",
  "transfer", "transfert", "but ", "buts ", "goal", "gardien", "milieu",
  "attaquant", "défenseur", "selectionneur", "sélectionneur", "kylian mbappé",
  "mbappé", "mbappe", "deschamps", "zidane", "neymar", "messi", "ronaldo",
  "haaland", "real madrid", "barça", "barca", "barcelone", "bayern",
  "manchester", "chelsea", "arsenal", "liverpool", "juventus", "milan",
  "premier league", "la liga", "serie a", "bundesliga",
];
const NON_FOOTBALL_HINTS = [
  " rugby", "top 14", "xv de france",
  " tennis", "roland garros", "wimbledon", "atp ", "wta ",
  " nba ", "basket", "basket-ball",
  "formule 1", "formula 1", " f1 ", "grand prix", "moto gp", "motogp",
  " ufc ", "boxe", "boxing",
  "cyclisme", "tour de france", "vuelta", "giro",
  "handball", "natation", "athlétisme", "athletisme",
  "volley", "ski ", "biathlon", "patinage",
  "baseball", "hockey", "cricket", "golf",
];

// Sources that are 100% football — we still reject non-football keywords
// (in case they cross-post), but we don't require a positive football hint.
const FOOTBALL_ONLY_SOURCES = new Set([
  "actufoot_", "footmercato", "optajean", "teampsg", "om_officiel", "ol",
  "loscofficiel", "frstaff", "ligue1ubereats", "ligue2bkt", "fff",
  "equipedefrance",
  "allezparis.fr", "footmarseille.com", "olympique-et-lyonnais.com",
  "tribunenantaise.fr", "teamaja.fr", "lorient-infos.fr", "sofoot.com",
]);

function isFootball(text: string, source?: string): boolean {
  const t = ` ${text.toLowerCase()} `;
  if (NON_FOOTBALL_HINTS.some(k => t.includes(k))) return false;
  if (source && FOOTBALL_ONLY_SOURCES.has(source.toLowerCase())) return true;
  return FOOTBALL_HINTS.some(k => t.includes(k));
}

// ── L1 fan-site RSS feeds (verified — same set as /api/fan-news) ─────────────
const FAN_RSS_FALLBACK: { url: string; site: string }[] = [
  { url: "https://www.allezparis.fr/feed/",              site: "allezparis.fr"             },
  { url: "https://www.footmarseille.com/feed/",          site: "footmarseille.com"         },
  { url: "https://www.olympique-et-lyonnais.com/feed/",  site: "olympique-et-lyonnais.com" },
  { url: "https://www.tribunenantaise.fr/feed/",         site: "tribunenantaise.fr"        },
  { url: "https://www.teamaja.fr/feed/",                 site: "teamaja.fr"                },
  { url: "https://lorient-infos.fr/feed/",               site: "lorient-infos.fr"          },
];

const SOFOOT_RSS = "https://www.sofoot.com/rss/";

const MAX_AGE_MS = 48 * 3600 * 1000; // 2 jours max — l'image du jour reste fraîche

// ── Output shape ─────────────────────────────────────────────────────────────
interface ImageCandidate {
  url: string;
  poster: string | null;
  type: "photo" | "video" | "gif";
  title: string;
  author: string;
  tweetUrl: string;
  pubDate: string;
  pubTs:   number;   // private — sort key, stripped from response
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function extractRssImage(block: string): string | null {
  // media:content / media:thumbnail
  const media = block.match(/<media:(?:content|thumbnail)[^>]*url=["']([^"']+)["']/i);
  if (media?.[1]) return media[1];
  // enclosure (only image/* types)
  const enc = block.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image\//i);
  if (enc?.[1]) return enc[1];
  // <content:encoded> with <img>
  const ce = block.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/);
  if (ce?.[1]) {
    const img = ce[1].match(/<img[^>]+src=["']([^"']+)["']/i);
    if (img?.[1]) return img[1];
  }
  // <description> with <img>
  const desc = block.match(/<description>([\s\S]*?)<\/description>/);
  if (desc?.[1]) {
    const img = desc[1].match(/<img[^>]+src=["']([^"']+)["']/i);
    if (img?.[1]) return img[1];
  }
  return null;
}

async function fetchRss(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FootInsider/1.0; +https://footinsider.fr)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(5000),
    } as RequestInit);
    if (!res.ok) return "";
    return await res.text();
  } catch { return ""; }
}

function harvestRss(xml: string, site: string, now: number): ImageCandidate[] {
  const out: ImageCandidate[] = [];
  let pos = 0;
  while (out.length < 5) {
    const s = xml.indexOf("<item>", pos);
    if (s === -1) break;
    const e = xml.indexOf("</item>", s);
    if (e === -1) break;
    const b = xml.slice(s, e + 7);
    pos = e + 7;

    const img = extractRssImage(b);
    if (!img) continue;

    const titleM = b.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)
                ?? b.match(/<title>([\s\S]*?)<\/title>/);
    const linkM = b.match(/<link>([\s\S]*?)<\/link>/);
    const dateM = b.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

    const title = (titleM?.[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const link  = (linkM?.[1]  ?? "").trim();
    const date  = dateM?.[1] ? new Date(dateM[1]) : null;
    const ts    = date && !Number.isNaN(date.getTime()) ? date.getTime() : now;

    if (now - ts > MAX_AGE_MS) continue;
    if (!title || !link) continue;
    // Football-only — drop anything that doesn't look footbally or that
    // looks like another sport. Club-specific fan sites pass via author.
    if (!isFootball(title, site)) continue;

    out.push({
      url: img, poster: null, type: "photo",
      title, author: site,
      tweetUrl: link,
      pubDate: new Date(ts).toISOString(),
      pubTs: ts,
    });
  }
  return out;
}

// ── Handler ──────────────────────────────────────────────────────────────────
export async function GET() {
  const now = Date.now();
  const candidates: ImageCandidate[] = [];

  // 1) Tweets with media (preferred — it's the "fresh signal of the day")
  const tweetLists = await Promise.all(
    SEED_ACCOUNTS.map(h => fetchSyndicationTimeline(h, 15).catch(() => [] as Tweet[]))
  );
  for (const list of tweetLists) {
    for (const t of list) {
      if (!t.media || t.media.length === 0) continue;
      const ts = new Date(t.pubDate).getTime();
      if (Number.isNaN(ts) || now - ts > MAX_AGE_MS) continue;
      // Football-only — even within football-leaning accounts we sometimes
      // catch off-topic posts. Drop them.
      if (!isFootball(t.title, t.author)) continue;
      const photoIdx = t.media.findIndex(m => m.type === "photo");
      const m = t.media[photoIdx >= 0 ? photoIdx : 0];
      candidates.push({
        url: m.url, poster: m.poster ?? null, type: m.type,
        title: t.title, author: t.author,
        tweetUrl: t.url, pubDate: t.pubDate, pubTs: ts,
      });
    }
  }

  // 2) Fan-site articles (always have images; reliable when Twitter is dry)
  const fanXmls = await Promise.all(FAN_RSS_FALLBACK.map(f => fetchRss(f.url)));
  fanXmls.forEach((xml, i) => {
    if (xml) candidates.push(...harvestRss(xml, FAN_RSS_FALLBACK[i].site, now));
  });

  // 3) So Foot — general fallback
  const sofoot = await fetchRss(SOFOOT_RSS);
  if (sofoot) candidates.push(...harvestRss(sofoot, "sofoot.com", now));

  if (candidates.length === 0) {
    return NextResponse.json({ ok: false }, {
      headers: { "Cache-Control": "public, s-maxage=300" },
    });
  }

  candidates.sort((a, b) => b.pubTs - a.pubTs);
  const pick = candidates[0];
  // Strip private sort key
  const { pubTs: _strip, ...image } = pick;
  void _strip;

  return NextResponse.json({ ok: true, image }, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=600" },
  });
}
