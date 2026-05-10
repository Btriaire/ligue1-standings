import { NextResponse } from "next/server";
import { TEAM_TM_MAP, ECONOMIC_SCORES, CLUB_SEARCH_TERMS } from "@/app/lib/teamMapping";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const ODDS_API_KEY = process.env.THE_ODDS_API_KEY;

export const revalidate = 1800;

const POSITIVE_FR = [
  "victoire","gagne","champion","titre","qualification","transfert","recrutement",
  "prolonge","record","brillant","excellent","remporte","buteur","héros","espoir",
  "confiant","dynamique","solide","impressionnant","historique","succès","joie",
  "invaincu","leader","domination","épatant","incroyable","exploit","retour","remonté",
];
const NEGATIVE_FR = [
  "défaite","blessure","blessé","absent","crise","scandale","licencié","viré",
  "démission","litige","amende","suspension","carton","difficile","inquiétant",
  "chute","relégation","problème","humiliation","doute","tension","conflit",
  "erreur","déroute","naufrage","honte","catastrophe","sifflets","incompréhension","colère",
];

// ─── RSS Helpers ─────────────────────────────────────────────────────────────

function parseRSSItems(xml: string): { title: string; pubDate: string; source: string }[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  return items.map((m) => {
    const item = m[1];
    const title = (item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] ?? "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
    const source = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] ?? "";
    return { title, pubDate, source };
  }).filter((i) => i.title.length > 5);
}

function analyzeSentiment(items: { title: string; pubDate: string; source: string }[], clubTerms: string) {
  const terms = clubTerms.toLowerCase().split("+").filter((t) => t.length > 2);
  const relevant = items.filter((i) => {
    const lower = i.title.toLowerCase();
    return terms.some((t) => lower.includes(t));
  });

  let positive = 0, negative = 0;
  const articles: ArticleItem[] = [];

  for (const item of relevant.slice(0, 12)) {
    const lower = item.title.toLowerCase();
    const pos = POSITIVE_FR.filter((w) => lower.includes(w)).length;
    const neg = NEGATIVE_FR.filter((w) => lower.includes(w)).length;
    positive += pos;
    negative += neg;
    const sentiment: "positive" | "negative" | "neutral" =
      pos > neg ? "positive" : neg > pos ? "negative" : "neutral";
    articles.push({ ...item, sentiment });
  }

  return { positive, negative, total: positive + negative, articles };
}

// ─── Source Fetchers ──────────────────────────────────────────────────────────

async function fetchRSSSource(url: string, label: string): Promise<{ items: { title: string; pubDate: string; source: string }[]; label: string }> {
  try {
    const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(6000) });
    const xml = await res.text();
    const items = parseRSSItems(xml).map((i) => ({ ...i, source: i.source || label }));
    return { items, label };
  } catch {
    return { items: [], label };
  }
}

async function fetchMediaScore(teamId: number): Promise<{
  score: number;
  articles: ArticleItem[];
  positive: number;
  negative: number;
  total: number;
  sourceBreakdown: SourceBreakdown[];
}> {
  const query = CLUB_SEARCH_TERMS[teamId];
  if (!query) return { score: 50, articles: [], positive: 0, negative: 0, total: 0, sourceBreakdown: [] };

  // Fetch all sources in parallel
  const [googleNews, rmcData, figaroData] = await Promise.all([
    fetchRSSSource(`https://news.google.com/rss/search?q=${query}+football&hl=fr&gl=FR&ceid=FR:fr`, "Google News"),
    fetchRSSSource("https://rmcsport.bfmtv.com/rss/football/", "RMC Sport"),
    fetchRSSSource("https://www.lefigaro.fr/rss/figaro_sport.xml", "Le Figaro Sport"),
  ]);

  const sourceBreakdown: SourceBreakdown[] = [];
  let totalPositive = 0, totalNegative = 0;
  const allArticles: ArticleItem[] = [];

  for (const { items, label } of [googleNews, rmcData, figaroData]) {
    const analysis = analyzeSentiment(items, query);
    totalPositive += analysis.positive;
    totalNegative += analysis.negative;

    sourceBreakdown.push({
      source: label,
      articleCount: analysis.articles.length,
      positive: analysis.positive,
      negative: analysis.negative,
      score: analysis.total === 0
        ? 50
        : Math.max(0, Math.min(100, Math.round(50 + ((analysis.positive - analysis.negative) / (analysis.total + 2)) * 50))),
    });

    allArticles.push(...analysis.articles.slice(0, 4).map((a) => ({ ...a, source: label })));
  }

  const total = totalPositive + totalNegative;
  const score = total === 0 ? 50 : Math.max(0, Math.min(100, Math.round(50 + ((totalPositive - totalNegative) / (total + 3)) * 50)));

  return {
    score,
    articles: allArticles.slice(0, 10),
    positive: totalPositive,
    negative: totalNegative,
    total,
    sourceBreakdown,
  };
}

// ─── Odds API (market sentiment) ─────────────────────────────────────────────

interface OddsMatch {
  home_team: string;
  away_team: string;
  bookmakers: { markets: { key: string; outcomes: { name: string; price: number }[] }[] }[];
}

async function fetchOddsMarketScore(): Promise<Map<string, number>> {
  if (!ODDS_API_KEY) return new Map();
  try {
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/soccer_france_ligue_one/odds/?regions=eu&markets=h2h&apiKey=${ODDS_API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return new Map();
    const matches: OddsMatch[] = await res.json();
    const teamOdds = new Map<string, number[]>();

    for (const match of matches) {
      for (const bk of match.bookmakers) {
        const market = bk.markets.find((m) => m.key === "h2h");
        if (!market) continue;
        for (const outcome of market.outcomes) {
          if (!teamOdds.has(outcome.name)) teamOdds.set(outcome.name, []);
          teamOdds.get(outcome.name)!.push(outcome.price);
        }
      }
    }

    // Convert avg odds → implied probability → sentiment score (lower odds = favorite = positive)
    const result = new Map<string, number>();
    for (const [team, odds] of teamOdds) {
      const avg = odds.reduce((a, b) => a + b, 0) / odds.length;
      const impliedProb = (1 / avg) * 100;
      // 50% win prob = neutral (50), higher prob = more positive
      const score = Math.min(95, Math.max(5, Math.round(impliedProb * 1.5 + 25)));
      result.set(team.toLowerCase(), score);
    }
    return result;
  } catch {
    return new Map();
  }
}

// ─── Human / Mercato ─────────────────────────────────────────────────────────

async function fetchHumanScore(teamId: number): Promise<{
  totalValue: number;
  avgValue: number;
  injuryRate: number;
  topPlayer: string | null;
  playerCount: number;
  injuredPlayers: string[];
}> {
  const tmId = TEAM_TM_MAP[teamId];
  if (!tmId) return { totalValue: 0, avgValue: 0, injuryRate: 0, topPlayer: null, playerCount: 0, injuredPlayers: [] };

  try {
    const res = await fetch(`https://transfermarkt-api.fly.dev/clubs/${tmId}/players`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const players: TmPlayerMin[] = data.players ?? [];

    const total = players.reduce((s, p) => s + (p.marketValue ?? 0), 0);
    const avg = players.length > 0 ? total / players.length : 0;
    const injured = players.filter((p) => p.status?.toLowerCase().includes("injury"));
    const injuryRate = players.length > 0 ? injured.length / players.length : 0;
    const sorted = [...players].sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0));
    const topPlayer = sorted[0]?.name ?? null;

    return {
      totalValue: total,
      avgValue: avg,
      injuryRate,
      topPlayer,
      playerCount: players.length,
      injuredPlayers: injured.slice(0, 5).map((p) => `${p.name}${p.status ? ` (${p.status.split(" - ")[0]})` : ""}`),
    };
  } catch {
    return { totalValue: 0, avgValue: 0, injuryRate: 0, topPlayer: null, playerCount: 0, injuredPlayers: [] };
  }
}

function normalize(value: number, values: number[]): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 50;
  return Math.round(((value - min) / (max - min)) * 100);
}

// ─── Main Route ───────────────────────────────────────────────────────────────

export async function GET() {
  if (!API_KEY) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  try {
    const standingsRes = await fetch(
      `https://api.football-data.org/v4/competitions/FL1/standings`,
      { headers: { "X-Auth-Token": API_KEY }, next: { revalidate: 600 } }
    );
    const standingsData = await standingsRes.json();
    const table = standingsData.standings?.[0]?.table ?? [];
    const teamIds: number[] = table.map((e: StandingEntry) => e.team.id);
    const teamInfo: Record<number, StandingEntry["team"] & { position: number }> = {};
    for (const e of table) teamInfo[e.team.id] = { ...e.team, position: e.position };

    const [humanResults, mediaResults, oddsMap] = await Promise.all([
      Promise.all(teamIds.map(fetchHumanScore)),
      Promise.all(teamIds.map(fetchMediaScore)),
      fetchOddsMarketScore(),
    ]);

    const totalValues = humanResults.map((h) => h.totalValue);
    const avgValues = humanResults.map((h) => h.avgValue);
    const hasOdds = oddsMap.size > 0;

    const scores = teamIds.map((id, i) => {
      const human = humanResults[i];
      const media = mediaResults[i];
      const eco = ECONOMIC_SCORES[id] ?? { score: 50, label: "Inconnu", revenue: "?", owner: "?" };

      const totalNorm = normalize(totalValues[i], totalValues);
      const avgNorm = normalize(avgValues[i], avgValues);
      const injuryPenalty = Math.round(human.injuryRate * 30);
      const humanScore = Math.max(0, Math.round(totalNorm * 0.6 + avgNorm * 0.4 - injuryPenalty));

      // Betting market sentiment (if Odds API key provided)
      const teamName = teamInfo[id]?.name?.toLowerCase() ?? "";
      const oddsScore = oddsMap.get(teamName) ?? (hasOdds ? 50 : null);
      const oddsWeight = oddsScore !== null ? 0.10 : 0;
      const adjustedMediaWeight = 0.35 - oddsWeight / 2;
      const adjustedEcoWeight = 0.30 - oddsWeight / 2;

      const emotionalScore = Math.round(
        eco.score * (oddsScore !== null ? adjustedEcoWeight : 0.30) +
        media.score * (oddsScore !== null ? adjustedMediaWeight : 0.35) +
        humanScore * 0.35 +
        (oddsScore !== null ? oddsScore * oddsWeight : 0)
      );

      const predictionDelta =
        emotionalScore >= 72 ? 7 :
        emotionalScore >= 62 ? 4 :
        emotionalScore >= 52 ? 1 :
        emotionalScore <= 22 ? -8 :
        emotionalScore <= 32 ? -5 :
        emotionalScore <= 42 ? -2 : 0;

      return {
        teamId: id,
        team: teamInfo[id],
        emotionalScore,
        predictionDelta,
        components: {
          economic: {
            score: eco.score,
            label: eco.label,
            revenue: eco.revenue,
            owner: eco.owner,
            weight: 30,
          },
          media: {
            score: media.score,
            positive: media.positive,
            negative: media.negative,
            total: media.total,
            articles: media.articles,
            sourceBreakdown: media.sourceBreakdown,
            weight: 35,
          },
          human: {
            score: humanScore,
            totalValue: human.totalValue,
            avgValue: Math.round(human.avgValue),
            injuryRate: Math.round(human.injuryRate * 100),
            topPlayer: human.topPlayer,
            playerCount: human.playerCount,
            injuredPlayers: human.injuredPlayers,
            weight: 35,
          },
          market: oddsScore !== null ? {
            score: oddsScore,
            weight: 10,
            source: "The Odds API",
          } : null,
        },
      };
    });

    return NextResponse.json({
      scores,
      sources: {
        media: ["Google News", "RMC Sport", "Le Figaro Sport"],
        mercato: "Transfermarkt",
        economic: "Données publiques (UEFA, rapports annuels)",
        market: hasOdds ? "The Odds API (Betclic, Unibet, Winamax…)" : null,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

interface TmPlayerMin { marketValue?: number; status?: string; name: string }
interface StandingEntry {
  position: number;
  team: { id: number; name: string; shortName: string; tla: string; crest: string };
}
interface ArticleItem { title: string; pubDate: string; source: string; sentiment: "positive" | "negative" | "neutral" }
interface SourceBreakdown { source: string; articleCount: number; positive: number; negative: number; score: number }
