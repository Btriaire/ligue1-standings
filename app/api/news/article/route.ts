import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Cache scraped articles for 30 min to avoid hammering sources
const cache = new Map<string, { data: ArticleData; at: number }>();
const CACHE_TTL = 30 * 60 * 1000;

export interface ArticleData {
  title: string;
  description: string;
  image: string | null;
  body: string;          // cleaned plain text paragraphs joined by \n\n
  sourceUrl: string;     // final resolved URL (after Google redirect)
  sourceDomain: string;
  publishedAt: string | null;
}

/* ── Helpers ──────────────────────────────────────────────────── */

function meta(html: string, prop: string): string {
  const m = html.match(new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i"
  )) ?? html.match(new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
    "i"
  ));
  return m?.[1]?.trim() ?? "";
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractBody(html: string): string {
  // Try common article containers in priority order
  const containers = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]+class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class="[^"]*story[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];

  let raw = "";
  for (const re of containers) {
    const m = html.match(re);
    if (m?.[1] && m[1].length > 200) { raw = m[1]; break; }
  }

  if (!raw) {
    // Fallback: extract all <p> tags from the page
    raw = (html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) ?? []).join(" ");
  }

  // Split into paragraphs, clean, keep meaningful ones
  const paras = (raw.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? [raw])
    .map(p => stripTags(p).trim())
    .filter(p => p.length > 40); // skip nav/ad snippets

  return paras.slice(0, 20).join("\n\n");
}

/* ── Resolve Google News redirect to actual URL ───────────────── */
async function resolveUrl(gnUrl: string): Promise<string> {
  try {
    const res = await fetch(gnUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    } as RequestInit);
    return res.url; // fetch follows redirects — this is the final URL
  } catch {
    return gnUrl;
  }
}

/* ── Main handler ─────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  // Check cache
  const cached = cache.get(raw);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // 1. Resolve Google redirect → actual article URL
    const sourceUrl = await resolveUrl(raw);
    const sourceDomain = new URL(sourceUrl).hostname.replace(/^www\./, "");

    // 2. Fetch the article HTML
    const html = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    } as RequestInit).then(r => r.ok ? r.text() : "").catch(() => "");

    if (!html) {
      return NextResponse.json({ error: "Article inaccessible" }, { status: 502 });
    }

    // 3. Extract metadata + body
    const title = meta(html, "og:title") ||
      (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "");
    const description = meta(html, "og:description") ||
      meta(html, "description") || "";
    const image = meta(html, "og:image") || null;
    const publishedAt = meta(html, "article:published_time") ||
      meta(html, "datePublished") || null;
    const body = extractBody(html);

    const data: ArticleData = {
      title: title.replace(/\s[-–|]\s[^-–|]{3,40}$/, "").trim(),
      description,
      image,
      body: body || description,
      sourceUrl,
      sourceDomain,
      publishedAt,
    };

    cache.set(raw, { data, at: Date.now() });
    return NextResponse.json(data);
  } catch (e) {
    console.error("article fetch error", e);
    return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 });
  }
}
