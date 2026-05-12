import { NextResponse } from "next/server";
import { CLUB_SEARCH_TERMS } from "@/app/lib/teamMapping";

export const revalidate = 900; // 15 min

interface BuzzItem {
  title: string;
  pubDate: string;
  source: string;
  url: string;
  sentiment: "positive" | "negative" | "neutral";
}

const POS_FR = [
  "victoire","gagne","champion","titre","qualification","brillant","excellent","remporte",
  "espoir","confiant","solide","impressionnant","succès","invaincu","leader","exploit",
  "retour","magnifique","superbe","incroyable","fier","enthousiasme","soutien","communion",
  "ambiance","électrique","vibrante","chaudron","supporter","ultras","kop","hommage",
  "ovation","euphorie","passion","liesse","célèbre","fierté","solidaire","record",
];
const NEG_FR = [
  "défaite","blessure","blessé","absent","crise","scandale","licencié","viré","démission",
  "humiliation","doute","tension","erreur","déroute","catastrophe","colère","grogne",
  "contesté","sifflets","mécontentement","frustration","déception","inquiet","abandon",
  "relégation","déficit","litige","déprimé","panique","honte","naufrage","indignation",
];

function scoreSentiment(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  const pos = POS_FR.filter((w) => lower.includes(w)).length;
  const neg = NEG_FR.filter((w) => lower.includes(w)).length;
  return pos > neg ? "positive" : neg > pos ? "negative" : "neutral";
}

function parseRSS(xml: string, defaultSource: string): { title: string; pubDate: string; link: string; source: string }[] {
  const items: { title: string; pubDate: string; link: string; source: string }[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] ?? "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
    const link = block.match(/<link>(.*?)<\/link>/)?.[1] ?? block.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] ?? "";
    if (title.length > 8) items.push({ title, pubDate, link, source: defaultSource });
  }
  return items;
}

async function safeFetch(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 900 },
    } as RequestInit);
    return res.ok ? res.text() : Promise.resolve("");
  } catch { return ""; }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const teamId = parseInt(url.searchParams.get("teamId") ?? "0");
  const terms = CLUB_SEARCH_TERMS[teamId];

  if (!terms) {
    return NextResponse.json({
      items: [], score: 50, positive: 0, negative: 0, total: 0,
      updatedAt: new Date().toISOString(),
    });
  }

  // First keyword for L'Équipe filtering (e.g. "PSG" from "PSG+Paris+Saint-Germain")
  const clubKeywords = terms.split("+").filter((t) => t.length > 2).map((t) => t.toLowerCase());

  const [googleXml, lequipeXml] = await Promise.all([
    safeFetch(
      `https://news.google.com/rss/search?q=${terms}+supporters+ultras+ambiance&hl=fr&gl=FR&ceid=FR:fr`
    ),
    safeFetch("https://www.lequipe.fr/rss/actu_rss_Football.xml"),
  ]);

  const googleItems = parseRSS(googleXml, "Google News");
  const lequipeAll = parseRSS(lequipeXml, "L'Équipe");
  const lequipeFiltered = lequipeAll.filter((i) => {
    const lower = i.title.toLowerCase();
    return clubKeywords.some((kw) => lower.includes(kw));
  });

  // Merge + deduplicate
  const seen = new Set<string>();
  const merged: BuzzItem[] = [];
  for (const item of [...googleItems, ...lequipeFiltered]) {
    const key = item.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      title: item.title.slice(0, 140),
      pubDate: item.pubDate,
      source: item.source,
      url: item.link,
      sentiment: scoreSentiment(item.title),
    });
  }

  // Sort by date desc, take top 20
  const sorted = merged
    .sort((a, b) =>
      (b.pubDate ? new Date(b.pubDate).getTime() : 0) -
      (a.pubDate ? new Date(a.pubDate).getTime() : 0)
    )
    .slice(0, 20);

  const positive = sorted.filter((i) => i.sentiment === "positive").length;
  const negative = sorted.filter((i) => i.sentiment === "negative").length;
  const total = sorted.length;

  // Score: 50 baseline ±3 per article, clamped 10–90
  const score = total === 0
    ? 50
    : Math.max(10, Math.min(90, 50 + (positive - negative) * 3));

  return NextResponse.json({
    items: sorted,
    score,
    positive,
    negative,
    total,
    updatedAt: new Date().toISOString(),
  });
}
