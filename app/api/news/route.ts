import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface NewsItem {
  title: string;
  pubDate: string;
  url: string;
  source?: string;
}

/* ─── HTML / entity helpers ──────────────────────────────────── */
function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function de(s: string) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/* ─── Parse RSS XML → items ──────────────────────────────────── */
function parseRSS(xml: string, filter?: (title: string) => boolean): NewsItem[] {
  const items: NewsItem[] = [];
  let pos = 0;
  while (items.length < 15) {
    const s = xml.indexOf("<item>", pos);
    if (s === -1) break;
    const e = xml.indexOf("</item>", s);
    if (e === -1) break;
    const b = xml.slice(s, e + 7);
    pos = e + 7;

    // Title: CDATA or plain
    const tc = b.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/);
    const tp = b.match(/<title>([\s\S]*?)<\/title>/);
    const title = de(stripHtml((tc?.[1] ?? tp?.[1] ?? "").trim()));
    if (!title || title.length < 8) continue;
    if (filter && !filter(title)) continue;

    // URL
    const lc = b.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/);
    const lp = b.match(/<link>([^<]+)<\/link>/);
    const url = de((lc?.[1] ?? lp?.[1] ?? "").trim());

    // Date
    const dm = b.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const pubDate = dm ? new Date(de(dm[1])).toISOString() : new Date().toISOString();

    // Source / creator
    const sc = b.match(/<dc:creator><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/);
    const sp = b.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/);
    const source = sc?.[1]?.trim() ?? sp?.[1]?.trim() ?? "So Foot";

    items.push({ title, pubDate, url, source });
  }
  return items;
}

/* ─── Fetch helpers ──────────────────────────────────────────── */
async function fetchXML(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FootInsider/1.0; +https://footinsider.fr)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return "";
    return await res.text();
  } catch {
    clearTimeout(timer);
    return "";
  }
}

/* ─── RSS sources ────────────────────────────────────────────── */
// So Foot: best French football RSS, no blocking, proper UTF-8
const SOFOOT_RSS = "https://www.sofoot.com/rss/";

// Keywords to route articles to Mondial column
const MONDIAL_KW = /mondial|coupe du monde|world cup|équipe de france|les bleus|fifa 2026|2026/i;

// Keywords to route articles to L1 column
const L1_KW = /ligue 1|ligue1|mercato|transfert|OM|PSG|Monaco|Lyon|Marseille|Lille|Rennes|Nice|Lens|Strasbourg|Brest|Nantes|Angers/i;

/* ─── Handler ────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic    = searchParams.get("topic") ?? "l1";
  const clubName = searchParams.get("club") ?? "";

  const xml = await fetchXML(SOFOOT_RSS);

  if (!xml) {
    return NextResponse.json({ items: [] }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  let items: NewsItem[];

  if (topic === "club" && clubName) {
    // Filter articles mentioning the club name
    const kw = new RegExp(clubName.split(" ")[0], "i"); // e.g. "Paris" for PSG
    items = parseRSS(xml, t => kw.test(t));
    // Fallback: if too few results, take top general news
    if (items.length < 3) {
      items = parseRSS(xml).slice(0, 8);
    }
  } else if (topic === "mondial") {
    items = parseRSS(xml, t => MONDIAL_KW.test(t));
    if (items.length < 3) {
      // Fallback: any international news
      items = parseRSS(xml).filter((_, i) => i >= 5).slice(0, 8);
    }
  } else {
    // L1: prefer L1-tagged articles, fallback to top news
    const l1 = parseRSS(xml, t => L1_KW.test(t));
    items = l1.length >= 3 ? l1 : parseRSS(xml).slice(0, 10);
  }

  return NextResponse.json({ items }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
