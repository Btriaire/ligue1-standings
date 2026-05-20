// Image of the Day — picks the most recent media-bearing tweet from a
// rotating pool of high-signal football accounts (general French foot,
// mercato, big-club hubs). Caches the pick edge-side for 30 min so the
// homepage doesn't re-walk syndication on every visit.
//
// Returns:
//   { ok: true, image: { url, poster, type, title, author, tweetUrl, pubDate } }
//   { ok: false } if nothing media-bearing was found in the last 24h

import { NextResponse } from "next/server";
import { fetchSyndicationTimeline, type Tweet } from "@/app/lib/twitter-syndication";

export const dynamic = "force-dynamic";

// Hand-picked, broadly-covering accounts. Order matters only as a
// tie-breaker (newer wins regardless of source).
const SEED_ACCOUNTS = [
  "actufoot_",
  "footmercato",
  "OptaJean",
  "RMCsport",
  "lequipe",
  "TeamPSG",
  "OM_Officiel",
  "OL",
  "loscofficiel",
  "FRStaff",
];

const MAX_AGE_MS = 24 * 3600 * 1000;

export async function GET() {
  const now = Date.now();
  const lists = await Promise.all(
    SEED_ACCOUNTS.map(h => fetchSyndicationTimeline(h, 15).catch(() => [] as Tweet[]))
  );

  let best: { tweet: Tweet; mediaIdx: number } | null = null;
  for (const list of lists) {
    for (const t of list) {
      if (!t.media || t.media.length === 0) continue;
      const ts = new Date(t.pubDate).getTime();
      if (Number.isNaN(ts)) continue;
      if (now - ts > MAX_AGE_MS) continue;
      // Prefer photos over video posters for the "snapshot of the day"
      // feel — but accept video if no photo is around.
      const photoIdx = t.media.findIndex(m => m.type === "photo");
      const idx = photoIdx >= 0 ? photoIdx : 0;
      if (!best || ts > new Date(best.tweet.pubDate).getTime()) {
        best = { tweet: t, mediaIdx: idx };
      }
    }
  }

  if (!best) {
    return NextResponse.json({ ok: false }, {
      headers: { "Cache-Control": "public, s-maxage=300" },
    });
  }

  const m = best.tweet.media![best.mediaIdx];
  return NextResponse.json({
    ok: true,
    image: {
      url:      m.url,
      poster:   m.poster ?? null,
      type:     m.type,
      title:    best.tweet.title,
      author:   best.tweet.author,
      tweetUrl: best.tweet.url,
      pubDate:  best.tweet.pubDate,
    },
  }, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=600" },
  });
}
