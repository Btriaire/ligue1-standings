import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CLUB_SEARCH_TERMS } from "@/app/lib/teamMapping";

export const revalidate = 3600; // 1h cache

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Google News RSS (confirmed working) + RMC Sport (only live secondary feed)
const GOOGLE_QUERIES: Record<number, string> = {
  524:  "PSG Paris Saint-Germain Ligue 1",
  548:  "AS Monaco Ligue 1",
  516:  "Olympique de Marseille OM Ligue 1",
  521:  "Lille LOSC Ligue 1",
  529:  "Stade Rennais Ligue 1",
  522:  "OGC Nice Ligue 1",
  546:  "RC Lens Ligue 1",
  523:  "Olympique Lyonnais OL Ligue 1",
  576:  "RC Strasbourg Ligue 1",
  511:  "Toulouse FC Ligue 1",
  512:  "Stade Brestois Brest Ligue 1",
  532:  "Angers SCO Ligue 1",
  533:  "Le Havre HAC Ligue 1",
  519:  "AJ Auxerre Ligue 1",
  543:  "FC Nantes Ligue 1",
  545:  "FC Metz Ligue 1",
  525:  "FC Lorient Ligue 1",
  1045: "Paris FC Ligue 1",
};

function parseTitles(xml: string): string[] {
  const titles: string[] = [];
  for (const m of xml.matchAll(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g)) {
    const t = m[1]
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
      .trim();
    if (t.length > 10 && !t.toLowerCase().includes("google actualités")) titles.push(t);
  }
  return titles;
}

async function fetchGoogleNews(query: string): Promise<{ title: string; source: string }[]> {
  try {
    const q = encodeURIComponent(query);
    const res = await fetch(
      `https://news.google.com/rss/search?q=${q}&hl=fr&gl=FR&ceid=FR:fr`,
      { headers: { "User-Agent": "FootPredictom/1.0" }, signal: AbortSignal.timeout(7000) }
    );
    if (!res.ok) return [];
    const xml = await res.text();

    // Parse each <item> block independently to correctly pair title + source
    const items: { title: string; source: string }[] = [];
    for (const itemM of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const block = itemM[1];
      const titleM = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const sourceM = block.match(/<source[^>]*>([^<]+)<\/source>/);
      if (!titleM) continue;
      const title = titleM[1]
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
        .replace(/\s*-\s*Google Actualit[eé]s\s*$/i, "")
        .trim();
      if (title.length < 10) continue;
      items.push({ title, source: sourceM?.[1]?.trim() ?? "Google News" });
    }
    return items.slice(0, 12);
  } catch { return []; }
}

async function fetchRmcSport(keywords: string[]): Promise<{ title: string; source: string }[]> {
  try {
    const res = await fetch(
      "https://rmcsport.bfmtv.com/rss/football/",
      { headers: { "User-Agent": "FootPredictom/1.0" }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const xml = await res.text();
    return parseTitles(xml)
      .filter(t => keywords.some(kw => t.toLowerCase().includes(kw)))
      .slice(0, 5)
      .map(title => ({ title, source: "RMC Sport" }));
  } catch { return []; }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const teamId = parseInt(url.searchParams.get("teamId") ?? "0");
  const terms = CLUB_SEARCH_TERMS[teamId];

  if (!terms) {
    return NextResponse.json({ items: [], score: 50, positive: 0, negative: 0, total: 0,
      synthesis: "Données indisponibles.", updatedAt: new Date().toISOString() });
  }

  const keywords = terms.split("+").filter(t => t.length > 2).map(t => t.toLowerCase());
  const googleQuery = GOOGLE_QUERIES[teamId] ?? `${terms.split("+")[0]} Ligue 1`;

  const [googleItems, rmcItems] = await Promise.all([
    fetchGoogleNews(googleQuery),
    fetchRmcSport(keywords),
  ]);

  // Merge, deduplicate by title
  const seen = new Set<string>();
  const allItems: { title: string; source: string }[] = [];
  for (const item of [...googleItems, ...rmcItems]) {
    if (!seen.has(item.title)) { seen.add(item.title); allItems.push(item); }
  }
  const limited = allItems.slice(0, 18);
  const allTitles = limited.map(i => i.title);

  if (allTitles.length === 0) {
    return NextResponse.json({ items: [], score: 50, positive: 0, negative: 0, total: 0,
      synthesis: "Aucun article récent trouvé.", updatedAt: new Date().toISOString() });
  }

  // Claude Haiku sentiment analysis
  let score = 50;
  let synthesis = "";
  let sentiment: "positive" | "negative" | "neutral" = "neutral";

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 120,
      system: 'Analyse sentiment foot. JSON uniquement: {"score":0-100,"sentiment":"positive|negative|neutral","summary":"1 phrase"}',
      messages: [{
        role: "user",
        content: `Club:${googleQuery}\n${allTitles.map((t, i) => `${i + 1}.${t}`).join("\n")}`,
      }],
    });
    const text = (msg.content[0] as { text: string }).text;
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    score     = Math.max(10, Math.min(90, Number(json.score) || 50));
    synthesis = json.summary ?? "";
    sentiment = json.sentiment ?? "neutral";
  } catch {
    const pos = allTitles.filter(t => /victoire|champion|titre|brillant|excellent|sacre/i.test(t)).length;
    const neg = allTitles.filter(t => /défaite|blessure|crise|humiliation|relégation|suspend/i.test(t)).length;
    score     = Math.max(10, Math.min(90, 50 + (pos - neg) * 8));
    sentiment = pos > neg ? "positive" : neg > pos ? "negative" : "neutral";
    synthesis = "Analyse basée sur mots-clés (IA indisponible).";
  }

  const positive = Math.round(limited.length * (score / 100));
  const negative = limited.length - positive;

  return NextResponse.json({
    items: limited.map(({ title, source }) => ({ title, source, sentiment, pubDate: new Date().toISOString() })),
    score, positive, negative, total: limited.length, synthesis,
    updatedAt: new Date().toISOString(),
  });
}
