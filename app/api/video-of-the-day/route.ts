// Vidéo du Jour — picks the most recent video-bearing tweet from a pool of
// football accounts. Only "video" and "gif" media types are considered.
// Returns { ok: true, video: VideoDay } or { ok: false } when nothing is found.

import { NextResponse } from "next/server";
import { fetchSyndicationTimeline, type Tweet } from "@/app/lib/twitter-syndication";

export const dynamic = "force-dynamic";

// Accounts most likely to post football video clips
const VIDEO_ACCOUNTS = [
  "actufoot_",
  "GoalFR",
  "lequipe",
  "EquipedeFrance",
  "OptaJean",
  "BBCSport",
  "footmercato",
  "Ligue1UberEats",
];

const MAX_AGE_MS = 48 * 3600 * 1000; // 48 h — wide window to always find something

interface VideoCandidate {
  url: string;
  poster: string;
  type: "video" | "gif";
  title: string;
  author: string;
  tweetUrl: string;
  pubDate: string;
  pubTs: number;
}

export async function GET() {
  const now = Date.now();
  const candidates: VideoCandidate[] = [];

  const tweetLists = await Promise.all(
    VIDEO_ACCOUNTS.map(h =>
      fetchSyndicationTimeline(h, 15).catch(() => [] as Tweet[])
    )
  );

  for (const list of tweetLists) {
    for (const t of list) {
      if (!t.media || t.media.length === 0) continue;
      const ts = new Date(t.pubDate).getTime();
      if (Number.isNaN(ts) || now - ts > MAX_AGE_MS) continue;
      // Only video / gif — skip pure photo tweets
      const vid = t.media.find(m => m.type === "video" || m.type === "gif");
      if (!vid || !vid.poster) continue;
      candidates.push({
        url: vid.url,
        poster: vid.poster,
        type: vid.type as "video" | "gif",
        title: t.title,
        author: t.author,
        tweetUrl: t.url,
        pubDate: t.pubDate,
        pubTs: ts,
      });
    }
  }

  if (candidates.length === 0) {
    return NextResponse.json({ ok: false }, {
      headers: { "Cache-Control": "public, s-maxage=300" },
    });
  }

  // Most recent first
  candidates.sort((a, b) => b.pubTs - a.pubTs);
  const { pubTs: _strip, ...video } = candidates[0];
  void _strip;

  return NextResponse.json({ ok: true, video }, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=600" },
  });
}
