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

// Realistic browser UA — some sites 403 the default Node UA.
const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// Try a single feed URL; return [] on any failure.
async function fetchFeed(feedUrl: string, site: string): Promise<FanArticle[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(7000),
    } as RequestInit);
    if (!res.ok) return [];
    const xml = await res.text();
    if (!xml.includes("<item>") && !xml.includes("<entry")) return [];
    return parseFanRSS(xml, site);
  } catch { return []; }
}

// Last-resort: pull the HTML root and look for an autodiscovery
// <link rel="alternate" type="application/rss+xml" href="..."> tag.
async function discoverFeed(rawUrl: string): Promise<string | null> {
  try {
    const u = new URL(rawUrl);
    const res = await fetch(u.toString(), {
      headers: { "User-Agent": BROWSER_UA, "Accept": "text/html,*/*" },
      signal: AbortSignal.timeout(5000),
    } as RequestInit);
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 80_000); // cap
    const re = /<link[^>]+rel=["']alternate["'][^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/gi;
    const m = html.match(re);
    if (!m) return null;
    for (const tag of m) {
      const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
      if (href) return new URL(href, u).toString();
    }
    return null;
  } catch { return null; }
}

// Resolve a curated site URL to its first working feed: tries common
// candidates, falls back to HTML autodiscovery. Returns at most `limit`
// articles.
async function fetchSite(rawUrl: string, limit = 8): Promise<FanArticle[]> {
  const site = siteLabelFor(rawUrl);
  for (const candidate of candidateFeedsFor(rawUrl)) {
    const items = await fetchFeed(candidate, site);
    if (items.length > 0) return items.slice(0, limit);
  }
  // Autodiscovery fallback
  const discovered = await discoverFeed(rawUrl);
  if (discovered) {
    const items = await fetchFeed(discovered, site);
    if (items.length > 0) return items.slice(0, limit);
  }
  return [];
}

// Baseline French football RSS pool — used to backfill articles when the
// entity's curated sites don't expose feeds (most L2 clubs). We then
// filter by the entity's search terms so only relevant articles surface.
const BASELINE_FEEDS: { url: string; site: string }[] = [
  { url: "https://www.sofoot.com/rss/",     site: "sofoot.com"     },
  { url: "https://www.actufoot.com/feed/",  site: "actufoot.com"   },
];

// Derive search terms for an entity: the hashtags (without '#'), plus
// any obvious shortName-like tokens extracted from the curated account
// names. These are matched against article title+description to filter
// the baseline feeds down to club-relevant items.
function searchTermsFor(entry: FanEntry): string[] {
  const set = new Set<string>();
  for (const h of entry.hashtags) {
    const clean = h.replace(/^#/, "").trim();
    if (clean.length >= 2) set.add(clean.toLowerCase());
  }
  // Pull short tokens from account names ("MHSC (officiel)" → "mhsc").
  for (const t of entry.twitter.slice(0, 3)) {
    const tokens = (t.name ?? "").split(/[\s()]+/).filter(w => /^[A-Za-z]{2,}$/.test(w));
    for (const tok of tokens) set.add(tok.toLowerCase());
  }
  return Array.from(set);
}

function articleMatchesTerms(a: FanArticle, terms: string[]): boolean {
  if (terms.length === 0) return false;
  const hay = `${a.title} ${a.description ?? ""}`.toLowerCase();
  return terms.some(t => {
    // Whole-word match for short tokens to avoid "OL" hitting "police".
    if (t.length <= 3) {
      const re = new RegExp(`(?:^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z0-9]|$)`, "i");
      return re.test(hay);
    }
    return hay.includes(t);
  });
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

  // Build the list of curated site URLs to query, plus the entity (used
  // for the baseline-feed filter).
  let urls: string[] = [];
  let entry: FanEntry | null = null;
  if (rawSites) {
    urls = rawSites.split(",").map(s => s.trim()).filter(Boolean);
  } else {
    entry = entryFor(clubId, nationCode);
    if (entry) urls = entry.sites.map(s => s.url);
  }

  // Fetch curated sites (bounded) + baseline feeds in parallel.
  const curatedPromise = Promise.all(urls.slice(0, 8).map(u => fetchSite(u, 6)));
  const baselinePromise = Promise.all(BASELINE_FEEDS.map(f => fetchFeed(f.url, f.site)));
  const [curatedLists, baselineLists] = await Promise.all([curatedPromise, baselinePromise]);

  const curatedArticles = curatedLists.flat();

  // Filter baseline articles to entity-relevant ones (skip when no entry
  // or no terms — the curated lists carry the load in that case).
  const terms = entry ? searchTermsFor(entry) : [];
  const baselineMatched = entry && terms.length > 0
    ? baselineLists.flat().filter(a => articleMatchesTerms(a, terms))
    : [];

  // Merge, de-duplicate by link, sort newest-first.
  const seen = new Set<string>();
  const merged: FanArticle[] = [];
  for (const a of [...curatedArticles, ...baselineMatched]) {
    if (seen.has(a.link)) continue;
    seen.add(a.link);
    merged.push(a);
  }
  merged.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  merged.splice(24);

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
