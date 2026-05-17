import { NextRequest, NextResponse } from "next/server";
import { fetchSyndicationTimeline } from "@/app/lib/twitter-syndication";

export const dynamic = "force-dynamic";

// Same Nitter pool as /api/twitter. Kept independent so user-added handles
// don't go through the Firestore lookup or the official-fallback logic.
// nitter.net is the most reliable today — keep it first so we don't burn
// the 10s Vercel function budget on dead instances.
const NITTER_INSTANCES = [
  "nitter.net",
  "nitter.privacydev.net",
  "nitter.poast.org",
  "nitter.cz",
  "nitter.kavin.rocks",
];

interface Tweet { id: string; title: string; pubDate: string; url: string; author: string }

function parseNitterRSS(xml: string, handle: string): Tweet[] {
  const items: Tweet[] = [];
  let pos = 0;
  while (items.length < 10) {
    const s = xml.indexOf("<item>", pos);
    if (s === -1) break;
    const e = xml.indexOf("</item>", s);
    if (e === -1) break;
    const b = xml.slice(s, e + 7);
    pos = e + 7;

    const title = b.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1]?.trim()
      ?? b.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "";
    const link  = b.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "";
    const date  = b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
    const guid  = b.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] ?? link;

    if (!title || title.length < 3) continue;
    const clean = title.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    items.push({
      id: guid.split("/").pop() ?? String(Date.now()),
      title: clean,
      pubDate: date ? new Date(date).toISOString() : new Date().toISOString(),
      url: link.replace(/nitter\.[^/]+/, "x.com"),
      author: handle,
    });
  }
  return items;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("handle") ?? "";
  const handle = raw.replace(/^@/, "").trim();
  // Twitter usernames: 1–15 chars, alphanumeric or underscore
  if (!handle || !/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
    return NextResponse.json({ error: "Invalid handle", tweets: [] }, { status: 400 });
  }

  // Primary: Twitter's syndication CDN (no auth, very reliable).
  const synTweets = await fetchSyndicationTimeline(handle, 10);
  if (synTweets.length > 0) {
    return NextResponse.json({ tweets: synTweets, handle, source: "syndication" }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  }

  for (const instance of NITTER_INSTANCES) {
    try {
      const res = await fetch(`https://${instance}/${handle}/rss`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FootPredictom/1.0)" },
        signal: AbortSignal.timeout(2500),
      } as RequestInit);
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml.includes("<item>")) continue;
      return NextResponse.json({ tweets: parseNitterRSS(xml, handle), handle }, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
      });
    } catch { /* try next */ }
  }

  return NextResponse.json({ tweets: [], handle, error: "All Nitter instances failed" });
}
