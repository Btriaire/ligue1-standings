import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CLUB_SEARCH_TERMS } from "@/app/lib/teamMapping";

export const revalidate = 3600; // 1h cache

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// French sports RSS feeds — fetched in parallel, no API key needed
const RSS_FEEDS: { url: string; label: string }[] = [
  { url: "https://www.lequipe.fr/rss/actu_rss_Football.xml",   label: "L'Équipe" },
  { url: "https://rmcsport.bfmtv.com/rss/football.xml",        label: "RMC Sport" },
  { url: "https://www.eurosport.fr/football/rss.xml",          label: "Eurosport" },
  { url: "https://www.footmercato.net/rss.xml",                label: "Foot Mercato" },
  { url: "https://www.maxifoot.fr/rss.xml",                    label: "Maxifoot" },
];

function parseTitlesFromXml(xml: string): string[] {
  const titles: string[] = [];
  for (const m of xml.matchAll(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g)) {
    const t = m[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
    if (t.length > 10) titles.push(t);
  }
  return titles;
}

async function fetchFeed(
  url: string,
  label: string,
  keywords: string[]
): Promise<{ title: string; source: string }[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FootPredictom/1.0" },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseTitlesFromXml(xml)
      .filter(t => keywords.some(kw => t.toLowerCase().includes(kw)))
      .slice(0, 6)
      .map(title => ({ title, source: label }));
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const teamId = parseInt(url.searchParams.get("teamId") ?? "0");
  const terms = CLUB_SEARCH_TERMS[teamId];

  if (!terms) {
    return NextResponse.json({
      items: [], score: 50, positive: 0, negative: 0, total: 0,
      synthesis: "Données indisponibles.", updatedAt: new Date().toISOString(),
    });
  }

  const keywords = terms.split("+").filter(t => t.length > 2).map(t => t.toLowerCase());

  // Fetch all 5 feeds in parallel
  const results = await Promise.allSettled(
    RSS_FEEDS.map(f => fetchFeed(f.url, f.label, keywords))
  );

  // Flatten, deduplicate by title
  const seen = new Set<string>();
  const items: { title: string; source: string }[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const item of r.value) {
        if (!seen.has(item.title)) {
          seen.add(item.title);
          items.push(item);
        }
      }
    }
  }

  const allTitles = items.map(i => i.title).slice(0, 18);
  const allItems  = items.slice(0, 18);

  if (allTitles.length === 0) {
    return NextResponse.json({
      items: [], score: 50, positive: 0, negative: 0, total: 0,
      synthesis: "Aucun article récent trouvé.", updatedAt: new Date().toISOString(),
    });
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
        content: `Club:${terms.split("+")[0]}\n${allTitles.map((t, i) => `${i + 1}.${t}`).join("\n")}`,
      }],
    });
    const text = (msg.content[0] as { text: string }).text;
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    score     = Math.max(10, Math.min(90, Number(json.score) || 50));
    synthesis = json.summary ?? "";
    sentiment = json.sentiment ?? "neutral";
  } catch {
    const pos = allTitles.filter(t => /victoire|champion|titre|brillant|excellent/i.test(t)).length;
    const neg = allTitles.filter(t => /défaite|blessure|crise|humiliation|relégation/i.test(t)).length;
    score     = Math.max(10, Math.min(90, 50 + (pos - neg) * 5));
    sentiment = pos > neg ? "positive" : neg > pos ? "negative" : "neutral";
    synthesis = "Analyse basée sur mots-clés (IA indisponible).";
  }

  const positive = Math.round(allTitles.length * (score / 100));
  const negative = allTitles.length - positive;

  return NextResponse.json({
    items: allItems.map(({ title, source }) => ({
      title,
      source,
      sentiment,
      pubDate: new Date().toISOString(),
    })),
    score,
    positive,
    negative,
    total: allTitles.length,
    synthesis,
    updatedAt: new Date().toISOString(),
  });
}
