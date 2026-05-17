import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── Fan site RSS feeds (verified reachable) ───────────────────────────────────
const FAN_RSS: Record<string, { url: string; site: string }> = {
  "524":  { url: "https://www.allezparis.fr/feed/",                site: "allezparis.fr"         },
  "516":  { url: "https://www.footmarseille.com/feed/",            site: "footmarseille.com"     },
  "523":  { url: "https://www.olympique-et-lyonnais.com/feed/",    site: "olympique-et-lyonnais.com" },
  "511":  { url: "https://www.lesviolets.com/actu/rss",            site: "lesviolets.com"        },
  "543":  { url: "https://www.tribunenantaise.fr/feed/",           site: "tribunenantaise.fr"    },
  "519":  { url: "https://www.teamaja.fr/feed/",                   site: "teamaja.fr"            },
  "525":  { url: "https://lorient-infos.fr/feed/",                 site: "lorient-infos.fr"      },
};

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

// ── GET — fetch fan articles for a club ───────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clubId = searchParams.get("clubId");
  if (!clubId) return NextResponse.json({ error: "Missing clubId" }, { status: 400 });

  const feed = FAN_RSS[clubId];
  if (!feed) {
    return NextResponse.json({ articles: [], site: null }, {
      headers: { "Cache-Control": "public, s-maxage=300" },
    });
  }

  try {
    const res = await fetch(feed.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FootPredictom/1.0; +https://footpredictom.vercel.app)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(8000),
    } as RequestInit);

    if (!res.ok) {
      return NextResponse.json({ articles: [], site: feed.site, error: `HTTP ${res.status}` }, {
        headers: { "Cache-Control": "public, s-maxage=60" },
      });
    }

    const xml = await res.text();
    if (!xml.includes("<item>")) {
      return NextResponse.json({ articles: [], site: feed.site }, {
        headers: { "Cache-Control": "public, s-maxage=60" },
      });
    }

    const articles = parseFanRSS(xml, feed.site);
    return NextResponse.json({ articles, site: feed.site }, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300" },
    });
  } catch (e) {
    return NextResponse.json({ articles: [], site: feed.site, error: String(e) }, {
      headers: { "Cache-Control": "public, s-maxage=60" },
    });
  }
}
