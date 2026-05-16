import { NextRequest, NextResponse } from "next/server";

// Cache: 20 minutes (news freshness vs. API quota balance)
export const revalidate = 1200;

export interface NewsItem {
  title: string;
  pubDate: string; // ISO
  url: string;     // Google News redirect URL → resolved at article-fetch time
  source?: string; // news outlet name extracted from RSS <source> tag
  description?: string; // cleaned snippet if available (not Google boilerplate)
}

/* ─── RSS fetcher + parser ───────────────────────────────────── */
async function fetchRSS(url: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FootPredictom/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml",
      },
      next: { revalidate: 1200 },
    });
    if (!res.ok) return [];
    const xml = await res.text();

    // Parse <item> blocks
    const items: NewsItem[] = [];
    const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];
    for (const block of itemBlocks.slice(0, 10)) {
      const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ??
                         block.match(/<title>([\s\S]*?)<\/title>/);
      const dateMatch  = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      // Google News RSS: <link> sits between </guid> and <pubDate>, may be empty tag variant
      const linkMatch  = block.match(/<link>([^<]+)<\/link>/) ??
                         block.match(/<link\s+href="([^"]+)"/) ??
                         block.match(/<guid[^>]*>([^<]+)<\/guid>/);  // fallback: guid IS the url
      const descMatch  = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ??
                         block.match(/<description>([\s\S]*?)<\/description>/);
      if (!titleMatch?.[1]) continue;

      // Strip source suffix " - Site Name" that Google News appends
      const rawTitle = titleMatch[1].trim();
      const title = rawTitle.replace(/\s[-–]\s[^-–]{3,40}$/, "").trim();

      // Skip Google News boilerplate channel descriptions
      if (/comprehensive.*news|aggregated from sources|google news/i.test(title)) continue;

      const pubDate = dateMatch?.[1]
        ? new Date(dateMatch[1]).toISOString()
        : new Date().toISOString();

      const url = linkMatch?.[1]?.trim() ?? "";

      // ── Extract source outlet from <source> tag ────────────────
      const sourceTagMatch = block.match(/<source[^>]*>([^<]+)<\/source>/);
      const source = sourceTagMatch?.[1]?.trim() || undefined;

      // ── Extract description ────────────────────────────────────
      // Google News RSS <description> is HTML with a list of related articles.
      // We extract the source from the first <font> (after vert bar) if <source> missing,
      // and any text after the first <li> that isn't just the main title.
      let description: string | undefined;
      if (descMatch?.[1]) {
        const raw = descMatch[1];
        // Try to get text from second+ <li> items (related context)
        const liItems = [...raw.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)];
        if (liItems.length >= 2) {
          // Second li often has a real related headline
          const secondLi = liItems[1][1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
          // Only use if it looks like real content (not boilerplate)
          if (secondLi.length > 15 && !/comprehensive|aggregated|google news/i.test(secondLi)) {
            description = secondLi.slice(0, 120);
          }
        }
        // Fallback: strip all HTML and check it's not boilerplate
        if (!description) {
          const stripped = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
          if (stripped.length > 20 && !/comprehensive.*news|aggregated from sources|google news/i.test(stripped)) {
            description = stripped.slice(0, 140);
          }
        }
      }

      if (title.length > 8) items.push({ title, pubDate, url, source, description });
    }
    return items;
  } catch {
    return [];
  }
}

/* ─── Google News RSS queries ────────────────────────────────── */
const GN_BASE = "https://news.google.com/rss/search?hl=fr&gl=FR&ceid=FR:fr&q=";

const QUERIES: Record<string, string> = {
  l1:      "ligue+1+football+OR+mercato+OR+transfert+OR+match",
  mondial: "coupe+du+monde+2026+FIFA+OR+france+mondial+football",
};

function clubQuery(clubName: string) {
  // Use encodeURIComponent for the full query to handle accents/special chars
  return encodeURIComponent(clubName + " football ligue 1");
}

/* ─── Handler ────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic") ?? "l1"; // l1 | mondial | club
  const clubName = searchParams.get("club") ?? "";

  let rssUrl: string;
  if (topic === "club" && clubName) {
    rssUrl = GN_BASE + clubQuery(clubName);
  } else {
    rssUrl = GN_BASE + (QUERIES[topic] ?? QUERIES.l1);
  }

  const items = await fetchRSS(rssUrl);

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "public, s-maxage=1200, stale-while-revalidate=300",
      },
    }
  );
}
