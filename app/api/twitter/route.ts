import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebase-admin";

export const dynamic = "force-dynamic";

// ── Nitter instances — tried in order, 4 s timeout each ──────────────────────
// List kept long for resilience; instances rotate availability.
const NITTER_INSTANCES = [
  "nitter.privacydev.net",
  "nitter.poast.org",
  "nitter.cz",
  "nitter.nl",
  "nitter.1d4.us",
  "nitter.kavin.rocks",
  "nitter.net",
];

// ── Official club handles — absolute last resort if fan account fails ─────────
const OFFICIAL_HANDLES: Record<string, string> = {
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

// ── Default fan accounts ──────────────────────────────────────────────────────
const DEFAULT_HANDLES: Record<string, string> = {
  "524":  "LMDPSG",           // Le Meilleur du PSG — 161K
  "548":  "ASMSUPPORTERSFR",  // ASM Supporters FR — 7.5K
  "516":  "SupporterOfMars",  // Supporter Of Marseille
  "521":  "loscfansclub",     // Losc Fans Club
  "529":  "team_srfc",        // Team SRFC
  "522":  "ogcnsupporter",    // OGC Nice Supporter
  "546":  "LensoisComLive",   // Lensois.com — 24.7K
  "523":  "oetl",             // Olympique-et-Lyonnais.com — 66.9K
  "576":  "fsrcs",            // Fédération Supporters RCS
  "511":  "LesVioletsCom",    // LesViolets.com — 22K
  "512":  "SuppBrestois",     // Supporter Brestois
  "532":  "IncroyableSCO",    // Incroyable SCO — 7.9K
  "533":  "hacfans1872",      // HAC Fans 1872
  "519":  "TeamAJA89",        // TeamAJA
  "543":  "TribuneNantaise",  // Tribune Nantaise
  "545":  "FCMetzFans",       // FC Metz Fans
  "525":  "supp_Lorient",     // Supporters Lorient
  "1045": "PassionParisFC",   // Passion Paris FC
};

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

async function tryNitter(handle: string): Promise<Tweet[]> {
  const errors: string[] = [];
  for (const instance of NITTER_INSTANCES) {
    try {
      const url = `https://${instance}/${handle}/rss`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FootPredictom/1.0)" },
        signal: AbortSignal.timeout(4000),
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

    return NextResponse.json({ tweets, handle: usedHandle, fanHandle: handle, isFallback }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (e) {
    return NextResponse.json({ tweets: [], handle: null, error: String(e) });
  }
}
