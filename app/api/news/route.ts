import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface NewsItem {
  title: string;
  pubDate: string;
  url: string;
  source?: string;
  description?: string;
}

/* ─── HTML entity decoder ────────────────────────────────────── */
function de(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/* ─── Parse raw RSS XML string → NewsItem[] ─────────────────── */
function parseRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  let pos = 0;

  while (items.length < 10) {
    const s = xml.indexOf("<item>", pos);
    if (s === -1) break;
    const e = xml.indexOf("</item>", s);
    if (e === -1) break;
    const b = xml.slice(s, e + 7);
    pos = e + 7;

    // Title: try CDATA first, then plain text
    const titleCdata = b.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/);
    const titlePlain = b.match(/<title>([\s\S]*?)<\/title>/);
    const rawTitle = de((titleCdata?.[1] ?? titlePlain?.[1] ?? "").trim());
    if (!rawTitle || rawTitle.length < 8) continue;

    // Strip " - Source Name" suffix Google News appends
    const title = rawTitle.replace(/\s[-–]\s[^-–]{2,50}$/, "").trim();
    if (/comprehensive.*news|aggregated from sources|google news/i.test(title)) continue;

    // Date
    const dateM = b.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const pubDate = dateM ? new Date(de(dateM[1])).toISOString() : new Date().toISOString();

    // URL — <link> contains Google redirect URL (works fine for opening articles)
    const linkM = b.match(/<link>([^<]+)<\/link>/);
    const url = linkM ? de(linkM[1]).trim() : "";

    // Source — from <source> tag
    const srcM = b.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    const source = srcM ? de(srcM[1]).trim() : undefined;

    // Description — extract 2nd <li> from decoded HTML for related context
    let description: string | undefined;
    const descCdata = b.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/);
    const descPlain = b.match(/<description>([\s\S]*?)<\/description>/);
    const descHtml = de((descCdata?.[1] ?? descPlain?.[1] ?? "").trim());
    if (descHtml) {
      const lis = [...descHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
      if (lis.length >= 2) {
        const txt = lis[1][1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (txt.length > 20 && !/comprehensive|aggregated|google news/i.test(txt)) {
          description = txt.slice(0, 120);
        }
      }
    }

    items.push({ title, pubDate, url, source, description });
  }
  return items;
}

/* ─── Fetch RSS (primary) ────────────────────────────────────── */
async function fetchGoogleRSS(rssUrl: string): Promise<{ items: NewsItem[]; error?: string }> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(rssUrl, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { items: [], error: `HTTP ${res.status}` };
    const xml = await res.text();
    const items = parseRSS(xml);
    return { items };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { items: [], error: msg };
  }
}

/* ─── Fallback: rss2json.com proxy ──────────────────────────── */
async function fetchViaProxy(rssUrl: string): Promise<NewsItem[]> {
  try {
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=10`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(proxyUrl, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!res.ok) return [];
    const json = await res.json() as {
      status: string;
      items?: Array<{ title: string; pubDate: string; link: string; author?: string; description?: string }>;
    };
    if (json.status !== "ok" || !json.items?.length) return [];
    return json.items.map(it => ({
      title: it.title?.replace(/\s[-–]\s[^-–]{2,50}$/, "").trim() ?? "",
      pubDate: it.pubDate ? new Date(it.pubDate).toISOString() : new Date().toISOString(),
      url: it.link ?? "",
      source: it.author || undefined,
    })).filter(it => it.title.length > 8);
  } catch {
    return [];
  }
}

/* ─── Query config ───────────────────────────────────────────── */
const GN_BASE = "https://news.google.com/rss/search?hl=fr&gl=FR&ceid=FR:fr&q=";

const QUERIES: Record<string, string> = {
  l1:      "ligue+1+football+OR+mercato+OR+transfert+OR+match",
  mondial: "coupe+du+monde+2026+FIFA+OR+france+mondial+football",
};

function clubQuery(name: string) {
  return encodeURIComponent(`${name} football ligue 1`);
}

/* ─── Handler ────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic    = searchParams.get("topic") ?? "l1";
  const clubName = searchParams.get("club") ?? "";
  const debug    = searchParams.get("debug") === "1";

  const rssUrl = topic === "club" && clubName
    ? GN_BASE + clubQuery(clubName)
    : GN_BASE + (QUERIES[topic] ?? QUERIES.l1);

  // 1. Try direct Google News RSS
  const { items: directItems, error: directError } = await fetchGoogleRSS(rssUrl);

  let items = directItems;
  let source = "direct";

  // 2. If direct fails or returns 0 items, try rss2json proxy
  if (!items.length) {
    const proxyItems = await fetchViaProxy(rssUrl);
    if (proxyItems.length) {
      items = proxyItems;
      source = "proxy";
    }
  }

  const body: Record<string, unknown> = { items };
  if (debug) {
    body.debug = { rssUrl, directError, source, count: items.length };
  }

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
