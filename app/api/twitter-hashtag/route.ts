// Hashtag aggregator. Twitter's public search endpoints (and Nitter
// search) are rate-limited to the point of being unusable, so we
// synthesize a hashtag feed by sweeping a list of curated handles via
// the syndication CDN (which is cached at the timeline level by
// `fetchSyndicationTimeline`) and filtering their recent tweets for
// the requested tag.
//
// Inputs:
//   ?tag=MHSC                       — hashtag (required, no '#')
//   ?handles=a,b,c                  — explicit handle list, OR
//   ?clubId=10249                   — derive from fanConfig L1+L2, OR
//   ?nationCode=FRA                 — derive from fanConfig nations
//
// Output: { tag, tweets: Tweet[], handles: string[] } where tweets are
// deduped by id, newest-first, capped at 30.

import { NextRequest, NextResponse } from "next/server";
import { fetchSyndicationTimeline, type Tweet } from "@/app/lib/twitter-syndication";
import { FAN_CLUBS_L1, FAN_CLUBS_L2, FAN_NATIONS, type FanEntry } from "@/app/lib/fanConfig";

export const dynamic = "force-dynamic";

function handlesFromEntry(entry: FanEntry | undefined): string[] {
  if (!entry) return [];
  // Prioritize fan + media + official accounts; skip players (mostly silent).
  return entry.twitter
    .filter(t => t.kind !== "player")
    .map(t => t.handle);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tag = (searchParams.get("tag") ?? "").replace(/^#/, "").trim();
  if (!tag || !/^[A-Za-z0-9_]{1,40}$/.test(tag)) {
    return NextResponse.json({ error: "Missing or invalid tag", tweets: [] }, { status: 400 });
  }

  // Resolve handle list
  let handles: string[] = [];
  const explicit = searchParams.get("handles");
  if (explicit) {
    handles = explicit
      .split(",")
      .map(h => h.replace(/^@/, "").trim())
      .filter(h => /^[A-Za-z0-9_]{1,15}$/.test(h));
  } else {
    const clubId = searchParams.get("clubId");
    const nationCode = searchParams.get("nationCode");
    if (clubId) {
      const idNum = parseInt(clubId, 10);
      handles = handlesFromEntry(FAN_CLUBS_L1[idNum] ?? FAN_CLUBS_L2[idNum]);
    } else if (nationCode) {
      handles = handlesFromEntry(FAN_NATIONS[nationCode.toUpperCase()]);
    }
  }

  // Cap to keep latency bounded (each handle is a cache lookup; budget ~12).
  handles = Array.from(new Set(handles)).slice(0, 12);

  if (handles.length === 0) {
    return NextResponse.json({ tag, tweets: [], handles: [] }, {
      headers: { "Cache-Control": "public, s-maxage=300" },
    });
  }

  // Pull each timeline in parallel. fetchSyndicationTimeline reads from
  // Firestore cache first, so this is mostly RAM-cheap.
  const lists = await Promise.all(
    handles.map(h => fetchSyndicationTimeline(h, 20).catch(() => [] as Tweet[]))
  );

  const needle = `#${tag}`.toLowerCase();
  const seen = new Set<string>();
  const matched: Tweet[] = [];
  for (const list of lists) {
    for (const t of list) {
      if (seen.has(t.id)) continue;
      if (!t.title.toLowerCase().includes(needle)) continue;
      seen.add(t.id);
      matched.push(t);
    }
  }
  matched.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  return NextResponse.json({
    tag,
    tweets: matched.slice(0, 30),
    handles,
  }, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" },
  });
}
