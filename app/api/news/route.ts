import { NextRequest, NextResponse } from "next/server";

// Cache: 10 minutes
export const revalidate = 600;

export interface NewsItem {
  title: string;
  pubDate: string; // ISO
  url: string;     // article URL
  source?: string; // news outlet name
  description?: string; // related context if available
}

/* ─── Decode HTML entities ───────────────────────────────────── */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/* ─── Extract CDATA or plain text ────────────────────────────── */
function extractText(tag: string, xml: string): string {
  const cdata = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
  if (cdata?.[1]) return decodeEntities(cdata[1].trim());
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`));
  if (plain?.[1]) return decodeEntities(plain[1].trim());
  return "";
}

/* ─── RSS fetcher + parser ───────────────────────────────────── */
async function fetchRSS(url: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FootInsider/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const xml = await res.text();

    // Extract only the <channel> content (skip root-level stuff)
    // Find all <item> blocks — use a greedy-safe approach
    const items: NewsItem[] = [];
    let pos = 0;

    while (pos < xml.length) {
      const start = xml.indexOf("<item>", pos);
      if (start === -1) break;
      const end = xml.indexOf("</item>", start);
      if (end === -1) break;
      const block = xml.slice(start, end + 7);
      pos = end + 7;

      // ── Title ─────────────────────────────────────────────────
      const rawTitle = extractText("title", block);
      if (!rawTitle || rawTitle.length < 8) continue;

      // Strip " - Source Name" suffix Google News appends
      const title = rawTitle.replace(/\s[-–]\s[^-–]{3,50}$/, "").trim();

      // Skip channel-level boilerplate that leaks into items
      if (/comprehensive.*news|aggregated from sources|google news/i.test(title)) continue;
      if (title.length < 8) continue;

      // ── Publication date ──────────────────────────────────────
      const dateRaw = extractText("pubDate", block);
      const pubDate = dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString();

      // ── URL — Google RSS is tricky: <link> is often empty ─────
      // Priority: <link> content → <guid> (which IS the article URL)
      let articleUrl = "";
      const linkMatch = block.match(/<link>([^<\s]+)<\/link>/);
      if (linkMatch?.[1]) {
        articleUrl = linkMatch[1].trim();
      }
      if (!articleUrl) {
        const guidMatch = block.match(/<guid[^>]*>([^<]+)<\/guid>/);
        if (guidMatch?.[1]) articleUrl = guidMatch[1].trim();
      }

      // ── Source outlet ─────────────────────────────────────────
      const sourceMatch = block.match(/<source[^>]*>([^<]+)<\/source>/);
      const source = sourceMatch?.[1]?.trim() || undefined;

      // ── Description: extract from <source url="..."> attribute ─
      // OR from second <li> in the HTML description block
      let description: string | undefined;
      const descRaw = extractText("description", block);
      if (descRaw) {
        // Try to extract source from description's first <li> if source tag missing
        const liItems = [...descRaw.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)];
        if (liItems.length >= 2) {
          const secondLi = liItems[1][1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (
            secondLi.length > 20 &&
            !/comprehensive|aggregated|google news/i.test(secondLi) &&
            secondLi.toLowerCase() !== title.toLowerCase()
          ) {
            description = decodeEntities(secondLi).slice(0, 120);
          }
        }
      }

      items.push({ title, pubDate, url: articleUrl, source, description });
      if (items.length >= 10) break;
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
  return encodeURIComponent(clubName + " football ligue 1");
}

/* ─── Handler ────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic") ?? "l1";
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
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=120",
      },
    }
  );
}
