import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CLUB_SEARCH_TERMS } from "@/app/lib/teamMapping";

export const revalidate = 3600; // 1h cache — limit API calls

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// French sports news domains for Tavily
const FR_SPORTS_DOMAINS = [
  "lequipe.fr",
  "rmcsport.bfmtv.com",
  "footmercato.net",
  "sofoot.com",
  "football365.fr",
  "maxifoot.fr",
  "butfootballclub.fr",
  "le10sport.com",
];

// Club name → Tavily search query (French)
const TAVILY_QUERIES: Record<number, string> = {
  524:  "PSG Paris Saint-Germain Ligue 1",
  548:  "AS Monaco Ligue 1",
  516:  "Olympique de Marseille OM Ligue 1",
  521:  "Lille LOSC Ligue 1",
  529:  "Stade Rennais Ligue 1",
  522:  "OGC Nice Ligue 1",
  546:  "RC Lens Ligue 1",
  523:  "Olympique Lyonnais OL Ligue 1",
  576:  "RC Strasbourg RCSA Ligue 1",
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

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

async function fetchTavilyNews(query: string): Promise<{ titles: string[]; sources: string[] }> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { titles: [], sources: [] };

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 10,
        search_depth: "basic",
        include_domains: FR_SPORTS_DOMAINS,
        days: 14,  // last 2 weeks
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return { titles: [], sources: [] };
    const data = await res.json();
    const results: TavilyResult[] = data.results ?? [];

    const titles = results.map(r => r.title).filter(t => t.length > 10);
    const sources = results.map(r => {
      try { return new URL(r.url).hostname.replace("www.", ""); }
      catch { return "Sport"; }
    });

    return { titles: titles.slice(0, 12), sources: sources.slice(0, 12) };
  } catch { return { titles: [], sources: [] }; }
}

// Fallback: L'Équipe RSS filtered by club keywords
async function fetchLequipeTitles(clubKeywords: string[]): Promise<string[]> {
  try {
    const res = await fetch("https://www.lequipe.fr/rss/actu_rss_Football.xml", {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res.ok) return [];
    const xml = await res.text();
    const titles: string[] = [];
    for (const m of xml.matchAll(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g)) {
      const t = m[1].replace(/&amp;/g, "&").trim();
      if (clubKeywords.some(kw => t.toLowerCase().includes(kw))) titles.push(t);
    }
    return titles.slice(0, 6);
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

  const clubKeywords = terms.split("+").filter(t => t.length > 2).map(t => t.toLowerCase());
  const tavilyQuery = TAVILY_QUERIES[teamId] ?? `${terms.split("+")[0]} Ligue 1`;

  const [{ titles: tavilyTitles, sources: tavilySources }, lequipeTitles] = await Promise.all([
    fetchTavilyNews(tavilyQuery),
    fetchLequipeTitles(clubKeywords),
  ]);

  // Deduplicate: Tavily first, then L'Équipe extras
  const seen = new Set(tavilyTitles);
  const extraLequipe = lequipeTitles.filter(t => !seen.has(t));
  const allTitles = [...tavilyTitles, ...extraLequipe].slice(0, 18);
  const allSources = [
    ...tavilySources,
    ...extraLequipe.map(() => "L'Équipe"),
  ].slice(0, 18);

  if (allTitles.length === 0) {
    return NextResponse.json({ items: [], score: 50, positive: 0, negative: 0, total: 0,
      synthesis: "Aucun article récent trouvé.", updatedAt: new Date().toISOString() });
  }

  // Claude Haiku — ultra compact prompt for max token economy
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
        content: `Club:${tavilyQuery}\n${allTitles.map((t, i) => `${i + 1}.${t}`).join("\n")}`,
      }],
    });

    const text = (msg.content[0] as { text: string }).text;
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    score = Math.max(10, Math.min(90, Number(json.score) || 50));
    synthesis = json.summary ?? "";
    sentiment = json.sentiment ?? "neutral";
  } catch {
    // Fallback: keyword count
    const pos = allTitles.filter(t => /victoire|champion|titre|brillant|excellent/i.test(t)).length;
    const neg = allTitles.filter(t => /défaite|blessure|crise|humiliation|relégation/i.test(t)).length;
    score = Math.max(10, Math.min(90, 50 + (pos - neg) * 5));
    sentiment = pos > neg ? "positive" : neg > pos ? "negative" : "neutral";
    synthesis = "Analyse basée sur mots-clés (IA indisponible).";
  }

  const positive = Math.round(allTitles.length * (score / 100));
  const negative = allTitles.length - positive;

  const items = allTitles.map((title, i) => ({
    title,
    source: allSources[i] ?? "Sport",
    sentiment,
    pubDate: new Date().toISOString(),
  }));

  return NextResponse.json({
    items,
    score,
    positive,
    negative,
    total: allTitles.length,
    synthesis,
    updatedAt: new Date().toISOString(),
  });
}
