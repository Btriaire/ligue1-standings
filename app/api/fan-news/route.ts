import { NextRequest, NextResponse } from "next/server";
import { FAN_CLUBS_L1, FAN_CLUBS_L2, FAN_NATIONS, type FanEntry } from "@/app/lib/fanConfig";

export const dynamic = "force-dynamic";

// ── Verified RSS feeds (direct URLs, used when a curated site URL alone
//    isn't enough to derive the feed). Keyed by hostname for easy override.
const FEED_OVERRIDES: Record<string, string> = {
  "lesviolets.com":            "https://www.lesviolets.com/actu/rss",
  "www.lesviolets.com":        "https://www.lesviolets.com/actu/rss",
  "allezparis.fr":             "https://www.allezparis.fr/feed/",
  "www.allezparis.fr":         "https://www.allezparis.fr/feed/",
  "footmarseille.com":         "https://www.footmarseille.com/feed/",
  "www.footmarseille.com":     "https://www.footmarseille.com/feed/",
  "olympique-et-lyonnais.com": "https://www.olympique-et-lyonnais.com/feed/",
  "www.olympique-et-lyonnais.com": "https://www.olympique-et-lyonnais.com/feed/",
  "tribunenantaise.fr":        "https://www.tribunenantaise.fr/feed/",
  "www.tribunenantaise.fr":    "https://www.tribunenantaise.fr/feed/",
  "teamaja.fr":                "https://www.teamaja.fr/feed/",
  "www.teamaja.fr":            "https://www.teamaja.fr/feed/",
  "lorient-infos.fr":          "https://lorient-infos.fr/feed/",
};

// Generate likely RSS URLs from a curated site URL.
function candidateFeedsFor(rawUrl: string): string[] {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname;
    if (FEED_OVERRIDES[host]) return [FEED_OVERRIDES[host]];
    const base = `${u.protocol}//${u.host}${u.pathname.replace(/\/$/, "")}`;
    return [
      `${base}/feed/`,
      `${base}/rss/`,
      `${base}/feed`,
      `${base}/rss`,
      `${u.protocol}//${u.host}/feed/`,
      `${u.protocol}//${u.host}/rss/`,
      `${u.protocol}//${u.host}/?feed=rss2`,
    ];
  } catch {
    return [];
  }
}

function siteLabelFor(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch { return rawUrl; }
}

function entryFor(clubId: string | null, nationCode: string | null): FanEntry | null {
  if (clubId) {
    const id = parseInt(clubId, 10);
    return FAN_CLUBS_L1[id] ?? FAN_CLUBS_L2[id] ?? null;
  }
  if (nationCode) return FAN_NATIONS[nationCode] ?? null;
  return null;
}

export interface FanArticle {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  description: string;
  site: string;
  image: string | null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8230;/g, "…")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&nbsp;/g, " ");
}

// Try several common RSS image patterns: media:content, enclosure, <img> in description, content:encoded
function extractImage(block: string): string | null {
  // 1) <media:content url="...">
  const media = block.match(/<media:(?:content|thumbnail)[^>]*url=["']([^"']+)["']/i);
  if (media?.[1]) return media[1];

  // 2) <enclosure url="..." type="image/...">
  const enc = block.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image\//i);
  if (enc?.[1]) return enc[1];

  // 3) <content:encoded>...<img src="...">
  const contentEnc = block.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/);
  if (contentEnc?.[1]) {
    const img = contentEnc[1].match(/<img[^>]+src=["']([^"']+)["']/i);
    if (img?.[1]) return img[1];
  }

  // 4) <img src="..."> inside description
  const desc = block.match(/<description>([\s\S]*?)<\/description>/);
  if (desc?.[1]) {
    const img = desc[1].match(/<img[^>]+src=["']([^"']+)["']/i);
    if (img?.[1]) return img[1];
  }

  return null;
}

function parseFanRSS(xml: string, site: string): FanArticle[] {
  const articles: FanArticle[] = [];
  let pos = 0;
  while (articles.length < 12) {
    const s = xml.indexOf("<item>", pos);
    if (s === -1) break;
    const e = xml.indexOf("</item>", s);
    if (e === -1) break;
    const b = xml.slice(s, e + 7);
    pos = e + 7;

    const title = b.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1]?.trim()
      ?? b.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "";
    const link = b.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim()
      ?? b.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1]?.trim() ?? "";
    const date = b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
    const guid = b.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] ?? link;
    const rawDesc = b.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1]
      ?? b.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "";

    if (!title || title.length < 3 || !link) continue;

    const cleanTitle = decodeEntities(stripHtml(title));
    const cleanDesc  = decodeEntities(stripHtml(rawDesc)).slice(0, 220);
    const image      = extractImage(b);

    articles.push({
      id: guid.split("/").pop() ?? String(Date.now() + articles.length),
      title: cleanTitle,
      link,
      pubDate: date ? new Date(date).toISOString() : new Date().toISOString(),
      description: cleanDesc,
      site,
      image,
    });
  }
  return articles;
}

// Try a single feed URL; return [] on any failure.
async function fetchFeed(feedUrl: string, site: string): Promise<FanArticle[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FootPredictom/1.0; +https://footpredictom.vercel.app)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(5000),
    } as RequestInit);
    if (!res.ok) return [];
    const xml = await res.text();
    if (!xml.includes("<item>")) return [];
    return parseFanRSS(xml, site);
  } catch { return []; }
}

// Resolve a curated site URL to its first working feed (tries candidates
// in order). Returns at most `limit` articles.
async function fetchSite(rawUrl: string, limit = 8): Promise<FanArticle[]> {
  const site = siteLabelFor(rawUrl);
  for (const candidate of candidateFeedsFor(rawUrl)) {
    const items = await fetchFeed(candidate, site);
    if (items.length > 0) return items.slice(0, limit);
  }
  return [];
}

// ── GET — fetch fan articles for a club or nation ─────────────────────────────
// Accepts ?clubId=…  or  ?nationCode=…  or  ?sites=<comma-separated URLs>.
// When clubId/nationCode is provided, the curated `sites` list from
// fanConfig is used; this means every club with at least one site URL
// (i.e. all of them) will surface articles when those sites expose an
// RSS feed at a common path.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clubId     = searchParams.get("clubId");
  const nationCode = searchParams.get("nationCode");
  const rawSites   = searchParams.get("sites");

  // Build the list of site URLs to query.
  let urls: string[] = [];
  if (rawSites) {
    urls = rawSites.split(",").map(s => s.trim()).filter(Boolean);
  } else {
    const entry = entryFor(clubId, nationCode);
    if (!entry) return NextResponse.json({ articles: [] }, {
      headers: { "Cache-Control": "public, s-maxage=300" },
    });
    urls = entry.sites.map(s => s.url);
  }

  if (urls.length === 0) {
    return NextResponse.json({ articles: [] }, {
      headers: { "Cache-Control": "public, s-maxage=300" },
    });
  }

  // Fetch in parallel — bounded by 8 sites max.
  const lists = await Promise.all(urls.slice(0, 8).map(u => fetchSite(u, 6)));
  const merged = lists.flat()
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 24);

  // Back-compat: `site` was historically the single source label; now we
  // aggregate from many curated sites, so summarise as "N sources" when
  // more than one — callers that just render the label still get
  // something meaningful.
  const uniqueSites = Array.from(new Set(merged.map(a => a.site)));
  const site = uniqueSites.length === 0 ? null
             : uniqueSites.length === 1 ? uniqueSites[0]
             : `${uniqueSites.length} sources`;

  return NextResponse.json({ articles: merged, site }, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300" },
  });
}
