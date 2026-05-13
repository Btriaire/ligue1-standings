import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CLUB_SEARCH_TERMS } from "@/app/lib/teamMapping";

export const revalidate = 3600; // 1h cache — limit Claude calls

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Club name → Google News search query (French)
const GOOGLE_TERMS: Record<number, string> = {
  524: "PSG Paris Saint-Germain Ligue 1",
  548: "AS Monaco Ligue 1",
  516: "Marseille OM Ligue 1",
  521: "Lille LOSC Ligue 1",
  529: "Stade Rennais Ligue 1",
  522: "OGC Nice Ligue 1",
  546: "RC Lens Ligue 1",
  523: "Lyon OL Ligue 1",
  576: "Strasbourg RCSA Ligue 1",
  511: "Toulouse FC Ligue 1",
  512: "Stade Brestois Ligue 1",
  532: "Angers SCO Ligue 1",
  533: "Le Havre HAC Ligue 1",
  519: "AJ Auxerre Ligue 1",
  543: "FC Nantes Ligue 1",
  545: "FC Metz Ligue 1",
  525: "FC Lorient Ligue 1",
  1045: "Paris FC Ligue 1",
};

async function fetchGoogleSportsNews(query: string): Promise<string[]> {
  try {
    const q = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${q}&hl=fr&gl=FR&ceid=FR:fr`;
    const res = await fetch(url, {
      headers: { "User-Agent": "FootPredictom/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const titles: string[] = [];
    for (const m of xml.matchAll(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/g)) {
      const t = m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
      // Skip the feed title itself and very short strings
      if (t.length > 10 && !t.toLowerCase().includes("google")) titles.push(t);
    }
    return titles.slice(0, 12);
  } catch { return []; }
}

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
      const lower = t.toLowerCase();
      if (clubKeywords.some(kw => lower.includes(kw))) titles.push(t);
    }
    return titles.slice(0, 8);
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
  const googleQuery = GOOGLE_TERMS[teamId] ?? `${terms.split("+")[0]} Ligue 1`;

  const [googleTitles, lequipeTitles] = await Promise.all([
    fetchGoogleSportsNews(googleQuery),
    fetchLequipeTitles(clubKeywords),
  ]);

  const allTitles = [...new Set([...googleTitles, ...lequipeTitles])].slice(0, 18);

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
        content: `Club:${googleQuery}\n${allTitles.map((t, i) => `${i + 1}.${t}`).join("\n")}`,
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

  const items = allTitles.map(title => ({
    title,
    source: googleTitles.includes(title) ? "Google Sports" : "L'Équipe",
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
