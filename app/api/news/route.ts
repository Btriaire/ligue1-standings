import { NextRequest, NextResponse } from "next/server";

// Cache: 20 minutes (news freshness vs. API quota balance)
export const revalidate = 1200;

export interface NewsItem {
  title: string;
  pubDate: string; // ISO
  url: string;     // Google News redirect URL → resolved at article-fetch time
  description?: string;
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
      const linkMatch  = block.match(/<link>([\s\S]*?)<\/link>/) ??
                         block.match(/<link\s+href="([^"]+)"/);
      const descMatch  = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ??
                         block.match(/<description>([\s\S]*?)<\/description>/);
      if (!titleMatch?.[1]) continue;

      // Strip source suffix " - Site Name" that Google News appends
      const rawTitle = titleMatch[1].trim();
      const title = rawTitle.replace(/\s[-–]\s[^-–]{3,40}$/, "").trim();

      const pubDate = dateMatch?.[1]
        ? new Date(dateMatch[1]).toISOString()
        : new Date().toISOString();

      const url = linkMatch?.[1]?.trim() ?? "";
      // Strip HTML from description
      const description = descMatch?.[1]
        ? descMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 200)
        : undefined;

      if (title.length > 8) items.push({ title, pubDate, url, description });
    }
    return items;
  } catch {
    return [];
  }
}

/* ─── Google News RSS queries ────────────────────────────────── */
const GN_BASE = "https://news.google.com/rss/search?hl=fr&gl=FR&ceid=FR:fr&q=";

const QUERIES: Record<string, string> = {
  l1:      "ligue+1+football+mercato+OR+résultat+OR+transfert",
  mondial: "coupe+du+monde+2026+FIFA+OR+équipe+france+mondial",
};

function clubQuery(clubName: string) {
  // encode club name for URL
  return encodeURIComponent(clubName) + "+ligue+1";
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
