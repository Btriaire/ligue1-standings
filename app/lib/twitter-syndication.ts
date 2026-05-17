// Twitter syndication CDN — used by embed widgets, public, no auth.
// Returns the same data as twitter.com profile pages in JSON form, so we
// can sidestep Nitter rate-limits.
//
// Endpoint: https://syndication.twitter.com/srv/timeline-profile/screen-name/{handle}
// Response: HTML containing <script id="__NEXT_DATA__">{...}</script>
// We grab the JSON, pull `props.pageProps.timeline.entries[]`, and map each
// `entry.content.tweet` into our common Tweet shape.

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

export async function fetchSyndicationTimeline(handle: string, max = 10): Promise<Tweet[]> {
  const clean = handle.replace(/^@/, "").trim();
  if (!clean || !/^[A-Za-z0-9_]{1,15}$/.test(clean)) return [];

  const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(clean)}?showReplies=false`;
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
  } catch {
    return [];
  }

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
    const author = t.user?.screen_name ?? clean;
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
