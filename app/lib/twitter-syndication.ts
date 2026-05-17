// Twitter syndication CDN — used by embed widgets, public, no auth.
// Returns the same data as twitter.com profile pages in JSON form, so we
// can sidestep Nitter rate-limits.
//
// Endpoint: https://syndication.twitter.com/srv/timeline-profile/screen-name/{handle}
// Response: HTML containing <script id="__NEXT_DATA__">{...}</script>
// We grab the JSON, pull `props.pageProps.timeline.entries[]`, and map each
// `entry.content.tweet` into our common Tweet shape.
//
// Twitter rate-limits this endpoint per source IP — on Vercel that quickly
// turns into 429s when many clubs are queried. We back the call with a
// Firestore cache so most reads never hit Twitter, and 429s gracefully
// degrade to stale cache.

import { getAdminFirestore } from "@/app/lib/firebase-admin";

export interface Tweet {
  id: string;
  title: string;     // tweet text, cleaned
  pubDate: string;   // ISO 8601
  url: string;       // canonical x.com URL
  author: string;    // screen_name without @
}

interface SynTweet {
  id_str?: string;
  conversation_id_str?: string;
  created_at?: string;       // "Sat May 16 22:08:57 +0000 2026"
  full_text?: string;
  text?: string;
  permalink?: string;
  user?: { screen_name?: string };
}

interface SynEntry {
  type: string;
  content?: { tweet?: SynTweet };
}

// Parse Twitter's "EEE MMM dd HH:mm:ss Z yyyy" date format.
function parseTwitterDate(s: string | undefined): string {
  if (!s) return new Date().toISOString();
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function cleanText(t: string): string {
  // Drop trailing t.co media links — they're noise for a text preview.
  return t.replace(/\s+https?:\/\/t\.co\/\S+$/g, "").trim();
}

// Cache config: serve cache hits younger than FRESH; refetch beyond,
// but fall back to STALE cache if Twitter is unavailable.
const FRESH_MS = 15 * 60 * 1000;  // 15 min — typical refresh
const STALE_MS = 24 * 3600 * 1000; // 24 h — emergency floor

interface CacheDoc { tweets: Tweet[]; fetchedAt: number }

async function readCache(handle: string): Promise<CacheDoc | null> {
  try {
    const db = getAdminFirestore();
    const snap = await db.collection("twitterCache").doc(handle.toLowerCase()).get();
    if (!snap.exists) return null;
    return snap.data() as CacheDoc;
  } catch { return null; }
}

async function writeCache(handle: string, tweets: Tweet[]): Promise<void> {
  try {
    const db = getAdminFirestore();
    await db.collection("twitterCache").doc(handle.toLowerCase()).set({
      tweets, fetchedAt: Date.now(),
    });
  } catch { /* ignore — cache is best-effort */ }
}

async function fetchFromSyndication(handle: string, max: number): Promise<Tweet[]> {
  const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(handle)}?showReplies=false`;
  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,*/*",
      },
      signal: AbortSignal.timeout(6000),
    } as RequestInit);
    if (!res.ok) return [];
    html = await res.text();
  } catch { return []; }

  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/);
  if (!m) return [];
  let entries: SynEntry[] = [];
  try {
    const j = JSON.parse(m[1]);
    entries = j?.props?.pageProps?.timeline?.entries ?? [];
  } catch { return []; }

  const tweets: Tweet[] = [];
  for (const e of entries) {
    if (e.type !== "tweet" || !e.content?.tweet) continue;
    const t = e.content.tweet;
    const id = t.id_str ?? t.conversation_id_str;
    const author = t.user?.screen_name ?? handle;
    const raw = t.full_text ?? t.text ?? "";
    if (!id || !raw) continue;
    tweets.push({
      id,
      title: cleanText(raw),
      pubDate: parseTwitterDate(t.created_at),
      url: t.permalink ? `https://x.com${t.permalink}` : `https://x.com/${author}/status/${id}`,
      author,
    });
    if (tweets.length >= max) break;
  }
  return tweets;
}

export async function fetchSyndicationTimeline(handle: string, max = 10): Promise<Tweet[]> {
  const clean = handle.replace(/^@/, "").trim();
  if (!clean || !/^[A-Za-z0-9_]{1,15}$/.test(clean)) return [];

  // 1. Try fresh cache first — avoids the network call entirely.
  const cached = await readCache(clean);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < FRESH_MS && cached.tweets.length > 0) {
    return cached.tweets.slice(0, max);
  }

  // 2. Try Twitter syndication.
  const fresh = await fetchFromSyndication(clean, max);
  if (fresh.length > 0) {
    // fire-and-forget — don't block the response on cache write
    void writeCache(clean, fresh);
    return fresh;
  }

  // 3. Twitter failed (rate-limited / blocked / empty). Fall back to
  //    stale cache up to STALE_MS old so the UI still shows something.
  if (cached && cached.tweets.length > 0 && now - cached.fetchedAt < STALE_MS) {
    return cached.tweets.slice(0, max);
  }

  return [];
}
