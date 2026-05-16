import { NextRequest, NextResponse } from "next/server";

// No ISR cache — let the HTTP Cache-Control header handle caching
export const dynamic = "force-dynamic";

export interface NewsItem {
  title: string;
  pubDate: string; // ISO
  url: string;     // article URL (Google redirect or direct)
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

/* ─── Extract text content of a tag (CDATA or plain) ─────────── */
function extractText(tag: string, xml: string): string {
  // CDATA variant: <tag><![CDATA[...]]></tag>
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
  const cdata = xml.match(cdataRe);
  if (cdata?.[1]) return decodeEntities(cdata[1].trim());
  // Plain text variant: <tag>text here</tag>  (content may include &amp; entities)
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const plain = xml.match(plainRe);
  if (plain?.[1]) return decodeEntities(plain[1].trim());
  return "";
}

/* ─── RSS fetcher + parser ───────────────────────────────────── */
async function fetchRSS(url: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FootInsider/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) return [];
    const xml = await res.text();

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

      // Strip " - Source Name" suffix Google News appends to titles
      const title = rawTitle.replace(/\s[-–]\s[^-–]{3,50}$/, "").trim();

      // Skip boilerplate
      if (/comprehensive.*news|aggregated from sources|google news/i.test(title)) continue;
      if (title.length < 8) continue;

      // ── Publication date ──────────────────────────────────────
      const dateRaw = extractText("pubDate", block);
      const pubDate = dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString();

      // ── URL ───────────────────────────────────────────────────
      // Google News RSS: <link> contains a news.google.com redirect URL — usable as-is
      let articleUrl = "";
      const linkMatch = block.match(/<link>\s*([^\s<]+)\s*<\/link>/);
      if (linkMatch?.[1]) articleUrl = linkMatch[1].trim();

      // Fallback: extract from <description> <a href="...">
      if (!articleUrl) {
        const descContent = extractText("description", block);
        if (descContent) {
          const hrefMatch = descContent.match(/<a\s[^>]*href=["']([^"']+)["']/i);
          if (hrefMatch?.[1]) articleUrl = hrefMatch[1].trim();
        }
      }

      // ── Source outlet ─────────────────────────────────────────
      // <source url="https://...">Outlet Name</source>
      const sourceMatch = block.match(/<source[^>]*>([^<]+)<\/source>/);
      const source = sourceMatch?.[1]?.trim() || undefined;

      // ── Description: extract second article title as context ──
      let description: string | undefined;
      const descRaw = extractText("description", block);
      if (descRaw) {
        const liItems = [...descRaw.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
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
        // Cache 10 min at CDN, but serve stale while revalidating
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=120",
      },
    }
  );
}
