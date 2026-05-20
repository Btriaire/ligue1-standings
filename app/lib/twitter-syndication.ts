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

// A single media attachment surfaced from a tweet. `poster` is the
// still-image preview for videos / gifs; for photos `url` *is* the image.
export interface TweetMedia {
  type: "photo" | "video" | "gif";
  url: string;       // image URL for photo, mp4 URL for video/gif
  poster?: string;   // thumbnail for video/gif
  width?: number;
  height?: number;
}

export interface Tweet {
  id: string;
  title: string;     // tweet text, cleaned
  pubDate: string;   // ISO 8601
  url: string;       // canonical x.com URL
  author: string;    // screen_name without @
  media?: TweetMedia[];
}

interface SynMediaVariant { content_type?: string; url?: string; bitrate?: number }
interface SynMedia {
  type?: string;                            // "photo" | "video" | "animated_gif"
  media_url_https?: string;
  video_info?: { variants?: SynMediaVariant[] };
  original_info?: { width?: number; height?: number };
}

interface SynTweet {
  id_str?: string;
  conversation_id_str?: string;
  created_at?: string;       // "Sat May 16 22:08:57 +0000 2026"
  full_text?: string;
  text?: string;
  permalink?: string;
  user?: { screen_name?: string };
  retweeted_status?: SynTweet;
  quoted_tweet?: SynTweet;
  mediaDetails?: SynMedia[];
  extended_entities?: { media?: SynMedia[] };
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
  // BUT only when there's actual text before the URL, otherwise we'd
  // strip everything from media-only tweets.
  const stripped = t.replace(/\s+https?:\/\/t\.co\/\S+$/g, "").trim();
  return stripped.length > 0 ? stripped : t.trim();
}

// Pick the best mp4 variant for a video tweet (highest-bitrate mp4 keeps
// quality but avoids HLS streams which won't play in a plain <video>).
function pickMp4(variants: SynMediaVariant[] | undefined): string | null {
  if (!variants) return null;
  const mp4s = variants.filter(v => v.content_type === "video/mp4" && v.url);
  if (mp4s.length === 0) return null;
  mp4s.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  return mp4s[0].url ?? null;
}

// Map syndication media items into our normalized shape. We walk the
// retweet / quote chain so a media-bearing retweet still surfaces its
// attachments.
function extractMedia(t: SynTweet): TweetMedia[] {
  // `??` only falls through on null/undefined — Twitter often returns an empty
  // array on the outer tweet when the actual media lives on the retweeted /
  // quoted tweet, so we explicitly skip empty candidates.
  const first = <T>(...lists: (T[] | undefined)[]): T[] => {
    for (const l of lists) if (l && l.length > 0) return l;
    return [];
  };
  const raw = first(
    t.mediaDetails,
    t.extended_entities?.media,
    t.retweeted_status?.mediaDetails,
    t.retweeted_status?.extended_entities?.media,
    t.quoted_tweet?.mediaDetails,
    t.quoted_tweet?.extended_entities?.media,
  );
  const out: TweetMedia[] = [];
  for (const m of raw) {
    if (!m.media_url_https) continue;
    const w = m.original_info?.width;
    const h = m.original_info?.height;
    if (m.type === "video" || m.type === "animated_gif") {
      const mp4 = pickMp4(m.video_info?.variants);
      if (mp4) {
        out.push({
          type: m.type === "animated_gif" ? "gif" : "video",
          url: mp4, poster: m.media_url_https, width: w, height: h,
        });
      }
    } else {
      // Default to photo for anything else (incl. "photo").
      out.push({ type: "photo", url: m.media_url_https, width: w, height: h });
    }
  }
  return out;
}

// Pull text from a tweet, falling back through retweet/quote chain so
// that retweets and quote-tweets still surface real content. Some
// accounts (e.g. @ActuFoot_) RT constantly — without this fallback the
// preview would just be "RT @user:" with no body.
function tweetText(t: SynTweet): string {
  const direct = (t.full_text ?? t.text ?? "").trim();
  const isRtStub = /^RT @\w+:\s*$/.test(direct);
  if (direct && !isRtStub) return cleanText(direct);
  if (t.retweeted_status) return cleanText(t.retweeted_status.full_text ?? t.retweeted_status.text ?? direct);
  if (t.quoted_tweet)     return cleanText(t.quoted_tweet.full_text     ?? t.quoted_tweet.text     ?? direct);
  return direct;
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
    const raw = tweetText(t);
    if (!id || !raw) continue;
    const media = extractMedia(t);
    tweets.push({
      id,
      title: raw,
      pubDate: parseTwitterDate(t.created_at),
      url: t.permalink ? `https://x.com${t.permalink}` : `https://x.com/${author}/status/${id}`,
      author,
      ...(media.length > 0 ? { media } : {}),
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
