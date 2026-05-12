import { NextResponse } from "next/server";
import { CLUB_SEARCH_TERMS } from "@/app/lib/teamMapping";

export const revalidate = 900; // 15 min

const MAX_AGE_DAYS = 30;

export interface BuzzItem {
  title: string;
  pubDate: string;
  source: string;
  url: string;
  sentiment: "positive" | "negative" | "neutral";
  matchedPos: string[];
  matchedNeg: string[];
  impact: "high" | "medium" | "low" | "none";
  impactPoints: number;   // signed: +1..+3 or -1..-3
  impactReason: string;   // e.g. "3 mots positifs (victoire, champion, titre)"
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

// Detect negation before a keyword ("pas de victoire", "sans titre", etc.)
function hasNegation(lower: string, keyword: string): boolean {
  const idx = lower.indexOf(keyword);
  if (idx === -1) return false;
  const before = lower.slice(Math.max(0, idx - 28), idx);
  return /\b(pas|sans|ne|n'|aucun|aucune|jamais|ni|non|plus de|fini|échec)\b/.test(before);
}

function scoreSentiment(text: string): {
  sentiment: "positive" | "negative" | "neutral";
  matchedPos: string[];
  matchedNeg: string[];
  impact: "high" | "medium" | "low" | "none";
  impactPoints: number;
  impactReason: string;
} {
  const lower = text.toLowerCase();
  // Negated positive words are counted as negative signals
  const negatedPos = POS_FR.filter((w) => lower.includes(w) && hasNegation(lower, w));
  const matchedPos = POS_FR.filter((w) => lower.includes(w) && !hasNegation(lower, w));
  const matchedNeg = [...NEG_FR.filter((w) => lower.includes(w) && !hasNegation(lower, w)), ...negatedPos];

  const netPos = matchedPos.length;
  const netNeg = matchedNeg.length;
  const sentiment = netPos > netNeg ? "positive" : netNeg > netPos ? "negative" : "neutral";

  // Weighted impact: 1 kw = low (±1), 2 kw = medium (±2), 3+ kw = high (±3)
  const dominant = sentiment === "positive" ? matchedPos : sentiment === "negative" ? matchedNeg : [];
  const count = dominant.length;
  const direction = sentiment === "positive" ? 1 : sentiment === "negative" ? -1 : 0;
  const impactPoints = direction * Math.min(count, 3);

  const impact: "high" | "medium" | "low" | "none" =
    count >= 3 ? "high" : count === 2 ? "medium" : count === 1 ? "low" : "none";

  // Human-readable reason
  let impactReason = "";
  if (sentiment === "positive" && matchedPos.length > 0) {
    const kws = matchedPos.slice(0, 3).join(", ");
    impactReason = `${matchedPos.length} mot${matchedPos.length > 1 ? "s" : ""} positif${matchedPos.length > 1 ? "s" : ""} : ${kws}`;
  } else if (sentiment === "negative" && matchedNeg.length > 0) {
    const kws = matchedNeg.slice(0, 3).join(", ");
    impactReason = `${matchedNeg.length} mot${matchedNeg.length > 1 ? "s" : ""} négatif${matchedNeg.length > 1 ? "s" : ""} : ${kws}`;
  } else {
    impactReason = "Aucun mot-clé fort — article neutre";
  }

  return { sentiment, matchedPos, matchedNeg, impact, impactPoints, impactReason };
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

function isWithin30Days(pubDate: string): boolean {
  if (!pubDate) return true; // keep if no date (can't filter)
  try {
    const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    return new Date(pubDate).getTime() >= cutoff;
  } catch { return true; }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const teamId = parseInt(url.searchParams.get("teamId") ?? "0");
  const terms = CLUB_SEARCH_TERMS[teamId];

  if (!terms) {
    return NextResponse.json({
      items: [], score: 50, positive: 0, negative: 0, total: 0,
      topPositiveKeywords: [], topNegativeKeywords: [],
      updatedAt: new Date().toISOString(),
    });
  }

  const clubKeywords = terms.split("+").filter((t) => t.length > 2).map((t) => t.toLowerCase());

  const [googleXml, lequipeXml] = await Promise.all([
    safeFetch(`https://news.google.com/rss/search?q=${terms}+supporters+ultras+ambiance&hl=fr&gl=FR&ceid=FR:fr`),
    safeFetch("https://www.lequipe.fr/rss/actu_rss_Football.xml"),
  ]);

  const googleItems = parseRSS(googleXml, "Google News");
  const lequipeAll = parseRSS(lequipeXml, "L'Équipe");
  const lequipeFiltered = lequipeAll.filter((i) => {
    const lower = i.title.toLowerCase();
    return clubKeywords.some((kw) => lower.includes(kw));
  });

  // Merge + deduplicate + 30-day filter
  const seen = new Set<string>();
  const merged: BuzzItem[] = [];
  for (const item of [...googleItems, ...lequipeFiltered]) {
    if (!isWithin30Days(item.pubDate)) continue;  // ← filter here
    const key = item.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    const scored = scoreSentiment(item.title);
    merged.push({
      title: item.title.slice(0, 140),
      pubDate: item.pubDate,
      source: item.source,
      url: item.link,
      ...scored,
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

  // Weighted score: sum impactPoints instead of flat ±3
  const weightedSum = sorted.reduce((s, i) => s + i.impactPoints, 0);
  const score = total === 0
    ? 50
    : Math.max(10, Math.min(90, 50 + weightedSum * 2));  // ×2 amplifier for visibility

  const allMatchedPos = [...new Set(sorted.flatMap(i => i.matchedPos))].slice(0, 5);
  const allMatchedNeg = [...new Set(sorted.flatMap(i => i.matchedNeg))].slice(0, 5);

  // Generate synthesis sentence
  const topPosKws = allMatchedPos.slice(0, 2).join(", ");
  const topNegKws = allMatchedNeg.slice(0, 2).join(", ");
  let synthesis = "";
  if (total === 0) {
    synthesis = "Aucun article récent trouvé pour ce club.";
  } else if (score >= 70) {
    synthesis = `Ambiance excellente — ${positive} articles positifs${topPosKws ? ` (${topPosKws})` : ""}. Les supporters sont enthousiastes.`;
  } else if (score >= 58) {
    synthesis = `Humeur positive : ${positive} articles favorables${topPosKws ? ` (${topPosKws})` : ""} contre ${negative} négatifs.`;
  } else if (score >= 44) {
    synthesis = `Sentiment mitigé — ${positive} articles positifs, ${negative} négatifs${topNegKws ? ` (${topNegKws})` : ""}. Tendance neutre.`;
  } else if (score >= 32) {
    synthesis = `Tension perceptible — ${negative} articles négatifs${topNegKws ? ` (${topNegKws})` : ""} dominent sur ${positive} positifs.`;
  } else {
    synthesis = `Ambiance difficile — ${negative} articles très négatifs${topNegKws ? ` (${topNegKws})` : ""}. Crise de confiance.`;
  }

  return NextResponse.json({
    items: sorted,
    score,
    positive,
    negative,
    total,
    synthesis,
    topPositiveKeywords: allMatchedPos,
    topNegativeKeywords: allMatchedNeg,
    maxAgeDays: MAX_AGE_DAYS,
    updatedAt: new Date().toISOString(),
  });
}
