import { NextResponse } from "next/server";
import { TEAM_TM_MAP, ECONOMIC_SCORES, CLUB_SEARCH_TERMS } from "@/app/lib/teamMapping";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

export const revalidate = 1800; // 30 min

const POSITIVE_FR = [
  "victoire","gagne","champion","titre","qualification","transfert","recrutement",
  "prolonge","record","brillant","excellent","remporte","buteur","héros","espoir",
  "confiant","dynamique","solide","impressionnant","historique","succès","joie",
  "performant","inarrêtable","dominé","serein","leader","invaincu",
];

const NEGATIVE_FR = [
  "défaite","blessure","blessé","absent","crise","scandale","licencié","viré",
  "démission","litige","amende","suspension","carton","difficile","inquiétant",
  "chute","relégation","problème","défaillance","contesté","humiliation",
  "crainte","peur","doute","tension","conflit","erreur","déroute",
];

async function fetchMediaScore(teamId: number): Promise<{ score: number; articles: ArticleItem[]; positive: number; negative: number; total: number }> {
  const query = CLUB_SEARCH_TERMS[teamId];
  if (!query) return { score: 50, articles: [], positive: 0, negative: 0, total: 0 };

  try {
    const url = `https://news.google.com/rss/search?q=${query}+football&hl=fr&gl=FR&ceid=FR:fr`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    const xml = await res.text();

    // Parse titles and descriptions from RSS
    const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    const articles: ArticleItem[] = [];
    let positive = 0, negative = 0;

    for (const match of itemMatches.slice(0, 15)) {
      const item = match[1];
      const title = (item.match(/<title>(.*?)<\/title>/)?.[1] ?? "")
        .replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").trim();
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
      const source = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] ?? "";

      if (!title) continue;

      const lower = title.toLowerCase();
      const pos = POSITIVE_FR.filter((w) => lower.includes(w)).length;
      const neg = NEGATIVE_FR.filter((w) => lower.includes(w)).length;
      positive += pos;
      negative += neg;

      const sentiment: "positive" | "negative" | "neutral" =
        pos > neg ? "positive" : neg > pos ? "negative" : "neutral";

      articles.push({ title, pubDate, source, sentiment });
    }

    const total = positive + negative;
    const score = total === 0 ? 50 : Math.round(50 + ((positive - negative) / (total + 2)) * 50);
    return { score: Math.max(0, Math.min(100, score)), articles: articles.slice(0, 8), positive, negative, total };
  } catch {
    return { score: 50, articles: [], positive: 0, negative: 0, total: 0 };
  }
}

async function fetchHumanScore(teamId: number): Promise<{ score: number; totalValue: number; avgValue: number; injuryRate: number; topPlayer: string | null; playerCount: number }> {
  const tmId = TEAM_TM_MAP[teamId];
  if (!tmId) return { score: 30, totalValue: 0, avgValue: 0, injuryRate: 0, topPlayer: null, playerCount: 0 };

  try {
    const res = await fetch(`https://transfermarkt-api.fly.dev/clubs/${tmId}/players`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const players = data.players ?? [];

    const total = players.reduce((s: number, p: TmPlayerMin) => s + (p.marketValue ?? 0), 0);
    const avg = players.length > 0 ? total / players.length : 0;
    const injured = players.filter((p: TmPlayerMin) => p.status?.toLowerCase().includes("injury")).length;
    const injuryRate = players.length > 0 ? injured / players.length : 0;
    const topPlayer = players.sort((a: TmPlayerMin, b: TmPlayerMin) => (b.marketValue ?? 0) - (a.marketValue ?? 0))[0]?.name ?? null;

    return { score: 0, totalValue: total, avgValue: avg, injuryRate, topPlayer, playerCount: players.length };
  } catch {
    return { score: 0, totalValue: 0, avgValue: 0, injuryRate: 0, topPlayer: null, playerCount: 0 };
  }
}

// Normalize to 0-100 given array of values
function normalize(value: number, values: number[]): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 50;
  return Math.round(((value - min) / (max - min)) * 100);
}

export async function GET() {
  if (!API_KEY) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  try {
    // 1. Get all standings to know which teams are in L1
    const standingsRes = await fetch(
      `https://api.football-data.org/v4/competitions/FL1/standings`,
      { headers: { "X-Auth-Token": API_KEY }, next: { revalidate: 600 } }
    );
    const standingsData = await standingsRes.json();
    const table = standingsData.standings?.[0]?.table ?? [];

    const teamIds: number[] = table.map((e: StandingEntry) => e.team.id);
    const teamInfo: Record<number, StandingEntry["team"] & { position: number }> = {};
    for (const e of table) {
      teamInfo[e.team.id] = { ...e.team, position: e.position };
    }

    // 2. Fetch human + media scores in parallel (batch to avoid rate limits)
    const humanResults = await Promise.all(teamIds.map(fetchHumanScore));
    const mediaResults = await Promise.all(teamIds.map(fetchMediaScore));

    // 3. Normalize human scores across all L1 clubs
    const totalValues = humanResults.map((h) => h.totalValue);
    const avgValues = humanResults.map((h) => h.avgValue);

    const scores = teamIds.map((id, i) => {
      const human = humanResults[i];
      const media = mediaResults[i];
      const economic = ECONOMIC_SCORES[id] ?? { score: 50, label: "Inconnu", revenue: "?", owner: "?" };

      const totalNorm = normalize(totalValues[i], totalValues);
      const avgNorm = normalize(avgValues[i], avgValues);
      const injuryPenalty = Math.round(human.injuryRate * 30); // up to -30 pts

      const humanScore = Math.max(0, Math.round((totalNorm * 0.6 + avgNorm * 0.4) - injuryPenalty));

      // Final weighted emotional score
      const emotionalScore = Math.round(
        economic.score * 0.30 +
        media.score * 0.35 +
        humanScore * 0.35
      );

      // Prediction adjustment: +/-8% max
      const predictionDelta =
        emotionalScore >= 70 ? 6 :
        emotionalScore >= 60 ? 3 :
        emotionalScore <= 25 ? -8 :
        emotionalScore <= 35 ? -4 : 0;

      return {
        teamId: id,
        team: teamInfo[id],
        emotionalScore,
        predictionDelta,
        components: {
          economic: { score: economic.score, label: economic.label, revenue: economic.revenue, owner: economic.owner },
          media: { score: media.score, positive: media.positive, negative: media.negative, total: media.total, articles: media.articles },
          human: {
            score: humanScore,
            totalValue: human.totalValue,
            avgValue: Math.round(human.avgValue),
            injuryRate: Math.round(human.injuryRate * 100),
            topPlayer: human.topPlayer,
            playerCount: human.playerCount,
          },
        },
      };
    });

    return NextResponse.json({ scores, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

interface TmPlayerMin {
  marketValue?: number;
  status?: string;
  name: string;
}

interface StandingEntry {
  position: number;
  team: { id: number; name: string; shortName: string; tla: string; crest: string };
}

interface ArticleItem {
  title: string;
  pubDate: string;
  source: string;
  sentiment: "positive" | "negative" | "neutral";
}
