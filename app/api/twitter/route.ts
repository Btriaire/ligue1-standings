import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebase-admin";
import { fetchSyndicationTimeline } from "@/app/lib/twitter-syndication";
import { FAN_CLUBS_L1, FAN_CLUBS_L2 } from "@/app/lib/fanConfig";

export const dynamic = "force-dynamic";

// ── Nitter instances — tried in order, 4 s timeout each ──────────────────────
// List kept long for resilience; instances rotate availability.
// Order matters: keep the most reliable host first so we don't burn
// the 10s Vercel function budget on timeouts before reaching a live one.
const NITTER_INSTANCES = [
  "nitter.net",
  "nitter.privacydev.net",
  "nitter.poast.org",
  "nitter.cz",
  "nitter.kavin.rocks",
];

// Build OFFICIAL_HANDLES and CLUB_HASHTAGS from fanConfig so L2 clubs are
// covered too. The hand-picked L1 set below overrides anything derived.
function pickOfficialHandle(entry: { twitter: { handle: string; kind: string }[] } | undefined): string | null {
  if (!entry) return null;
  return entry.twitter.find(t => t.kind === "official")?.handle ?? null;
}
function pickHashtag(entry: { hashtags: string[] } | undefined): string | null {
  if (!entry || entry.hashtags.length === 0) return null;
  // Use the first hashtag (most common); strip leading '#' if present.
  return entry.hashtags[0].replace(/^#/, "");
}

// ── Official club handles — absolute last resort if fan account fails ─────────
const OFFICIAL_HANDLES_L1_OVERRIDES: Record<string, string> = {
  "524":  "PSG",
  "548":  "AS_Monaco",
  "516":  "OM_Officiel",
  "521":  "loscofficiel",
  "529":  "staderennais",
  "522":  "ogcnice",
  "546":  "RCLens",
  "523":  "OL",
  "576":  "RCSA",
  "511":  "ToulouseFC",
  "512":  "SB29",
  "532":  "AngersSCO",
  "533":  "HAC_Football",
  "519":  "AJA",
  "543":  "FCNantes",
  "545":  "FCMetz",
  "525":  "FCLorient",
  "1045": "ParisFC",
};

const OFFICIAL_HANDLES: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [id, entry] of Object.entries(FAN_CLUBS_L1)) {
    const h = pickOfficialHandle(entry);
    if (h) out[id] = h;
  }
  for (const [id, entry] of Object.entries(FAN_CLUBS_L2)) {
    const h = pickOfficialHandle(entry);
    if (h) out[id] = h;
  }
  Object.assign(out, OFFICIAL_HANDLES_L1_OVERRIDES);
  return out;
})();

// ── Club hashtags — fetched via Nitter search RSS ─────────────────────────────
const CLUB_HASHTAGS_L1_OVERRIDES: Record<string, string> = {
  "524":  "TeamPSG",
  "548":  "DaghePrincipe",
  "516":  "TeamOM",
  "521":  "TeamLOSC",
  "529":  "TeamSRFC",
  "522":  "TeamOGCN",
  "546":  "RCLens",
  "523":  "TeamOL",
  "576":  "RCSA",
  "511":  "TeamTFC",
  "512":  "TeamSB29",
  "532":  "TeamSCO",
  "533":  "TeamHAC",
  "519":  "TeamAJA",
  "543":  "FCNantes",
  "545":  "FCMetz",
  "525":  "FCLorient",
  "1045": "ParisFC",
};

const CLUB_HASHTAGS: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [id, entry] of Object.entries(FAN_CLUBS_L1)) {
    const h = pickHashtag(entry);
    if (h) out[id] = h;
  }
  for (const [id, entry] of Object.entries(FAN_CLUBS_L2)) {
    const h = pickHashtag(entry);
    if (h) out[id] = h;
  }
  Object.assign(out, CLUB_HASHTAGS_L1_OVERRIDES);
  return out;
})();

// ── Default fan accounts ──────────────────────────────────────────────────────
// Hand-curated L1 set kept for explicit memorable picks (LMDPSG…).
// Everything else (L2 clubs, plus any missing L1 club) falls back to the
// top fan / media account from app/lib/fanConfig.ts so L2 clubs are also
// pre-filled instead of showing "Aucun compte configuré".
const DEFAULT_HANDLES_L1_OVERRIDES: Record<string, string> = {
  "524":  "LMDPSG",
  "548":  "ASMSUPPORTERSFR",
  "516":  "SupporterOfMars",
  "521":  "loscfansclub",
  "529":  "team_srfc",
  "522":  "ogcnsupporter",
  "546":  "LensoisComLive",
  "523":  "oetl",
  "576":  "fsrcs",
  "511":  "LesVioletsCom",
  "512":  "SuppBrestois",
  "532":  "IncroyableSCO",
  "533":  "hacfans1872",
  "519":  "TeamAJA89",
  "543":  "TribuneNantaise",
  "545":  "FCMetzFans",
  "525":  "supp_Lorient",
  "1045": "PassionParisFC",
};

function pickFanHandle(entry: { twitter: { handle: string; kind: string }[] } | undefined): string | null {
  if (!entry) return null;
  const pick = entry.twitter.find(t => t.kind === "fan")
            ?? entry.twitter.find(t => t.kind === "media")
            ?? entry.twitter.find(t => t.kind === "official");
  return pick?.handle ?? null;
}

const DEFAULT_HANDLES: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [id, entry] of Object.entries(FAN_CLUBS_L1)) {
    const h = pickFanHandle(entry);
    if (h) out[id] = h;
  }
  for (const [id, entry] of Object.entries(FAN_CLUBS_L2)) {
    const h = pickFanHandle(entry);
    if (h) out[id] = h;
  }
  // Apply the explicit L1 overrides last so they win.
  Object.assign(out, DEFAULT_HANDLES_L1_OVERRIDES);
  return out;
})();

interface TweetMedia { type: "photo" | "video" | "gif"; url: string; poster?: string; width?: number; height?: number }
interface Tweet { id: string; title: string; pubDate: string; url: string; author: string; media?: TweetMedia[] }

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

async function tryNitter(handle: string): Promise<Tweet[]> {
  // Primary: Twitter syndication CDN (no auth, much more reliable than Nitter).
  const syn = await fetchSyndicationTimeline(handle, 10);
  if (syn.length > 0) return syn;

  const errors: string[] = [];
  for (const instance of NITTER_INSTANCES) {
    try {
      const url = `https://${instance}/${handle}/rss`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FootPredictom/1.0)" },
        signal: AbortSignal.timeout(2500),
      } as RequestInit);
      if (!res.ok) { errors.push(`${instance}: HTTP ${res.status}`); continue; }
      const xml = await res.text();
      if (!xml.includes("<item>")) { errors.push(`${instance}: no items`); continue; }
      return parseNitterRSS(xml, handle);
    } catch (e) {
      errors.push(`${instance}: ${String(e).slice(0, 40)}`);
    }
  }
  console.warn("[twitter] All Nitter instances failed for", handle, errors);
  return [];
}

async function tryNitterHashtag(hashtag: string): Promise<Tweet[]> {
  const q = encodeURIComponent(`#${hashtag}`);
  for (const instance of NITTER_INSTANCES) {
    try {
      const url = `https://${instance}/search/rss?f=tweets&q=${q}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FootPredictom/1.0)" },
        signal: AbortSignal.timeout(2500),
      } as RequestInit);
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml.includes("<item>")) continue;
      return parseNitterRSS(xml, `#${hashtag}`);
    } catch { /* try next */ }
  }
  return [];
}

// ── GET — fetch tweets for a club ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clubId = searchParams.get("clubId");
  if (!clubId) return NextResponse.json({ error: "Missing clubId" }, { status: 400 });

  try {
    const db = getAdminFirestore();
    const doc = await db.collection("twitterConfig").doc("handles").get();
    const saved: Record<string, string> = doc.exists ? (doc.data() ?? {}) : {};
    const handles = { ...DEFAULT_HANDLES, ...saved };
    const handle = handles[clubId];

    if (!handle) {
      return NextResponse.json({ tweets: [], handle: null }, {
        headers: { "Cache-Control": "public, s-maxage=60" },
      });
    }

    // Try fan account first
    let tweets = await tryNitter(handle);
    let usedHandle = handle;
    let isFallback = false;

    // If fan account returns nothing, fall back to official club account
    if (tweets.length === 0 && OFFICIAL_HANDLES[clubId]) {
      const official = OFFICIAL_HANDLES[clubId];
      tweets = await tryNitter(official);
      if (tweets.length > 0) { usedHandle = official; isFallback = true; }
    }

    // Also fetch hashtag tweets (e.g. #TeamOM) — Nitter search is heavily
    // rate-limited and almost always empty in practice. As a backup we scan
    // the fan + official account timelines for the hashtag, which works as
    // long as those accounts use it. Best-effort — silent on failure.
    const hashtag = CLUB_HASHTAGS[clubId] ?? null;
    let hashtagTweets: Tweet[] = [];
    if (hashtag) {
      hashtagTweets = await tryNitterHashtag(hashtag);
      if (hashtagTweets.length === 0) {
        const tag = `#${hashtag}`.toLowerCase();
        const pool: Tweet[] = [...tweets];
        if (OFFICIAL_HANDLES[clubId] && OFFICIAL_HANDLES[clubId] !== usedHandle) {
          const off = await tryNitter(OFFICIAL_HANDLES[clubId]);
          pool.push(...off);
        }
        hashtagTweets = pool.filter(t => t.title.toLowerCase().includes(tag));
      }
    }

    return NextResponse.json({
      tweets,
      handle: usedHandle,
      fanHandle: handle,
      isFallback,
      hashtag,
      hashtagTweets,
    }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (e) {
    return NextResponse.json({ tweets: [], handle: null, error: String(e) });
  }
}
