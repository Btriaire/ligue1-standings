import { NextResponse } from "next/server";
import { TEAM_TM_MAP, ECONOMIC_SCORES, CLUB_SEARCH_TERMS, CLUB_SUBREDDITS } from "@/app/lib/teamMapping";

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
const POSITIVE_EN = [
  "win","won","victory","champion","brilliant","great","amazing","love","proud",
  "incredible","goat","legend","hope","confident","quality","perfect","class","sign",
];
const NEGATIVE_EN = [
  "loss","lose","lost","terrible","awful","crisis","sack","injury","injured",
  "poor","worst","pathetic","shame","disaster","panic","worried","concern","relegation",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreText(text: string, lang: "fr" | "en" | "both" = "both"): { pos: number; neg: number } {
  const lower = text.toLowerCase();
  const pos_words = lang === "fr" ? POSITIVE_FR : lang === "en" ? POSITIVE_EN : [...POSITIVE_FR, ...POSITIVE_EN];
  const neg_words = lang === "fr" ? NEGATIVE_FR : lang === "en" ? NEGATIVE_EN : [...NEGATIVE_FR, ...NEGATIVE_EN];
  return {
    pos: pos_words.filter((w) => lower.includes(w)).length,
    neg: neg_words.filter((w) => lower.includes(w)).length,
  };
}

function toSentiment(pos: number, neg: number): "positive" | "negative" | "neutral" {
  return pos > neg ? "positive" : neg > pos ? "negative" : "neutral";
}

function parseRSS(xml: string, defaultSource: string): RSSItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const item = m[1];
    const title = (item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] ?? "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
    const source = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] ?? defaultSource;
    return { title, pubDate, source };
  }).filter((i) => i.title.length > 5);
}

async function safeFetch(url: string, opts?: RequestInit): Promise<string> {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(7000) });
    return res.ok ? await res.text() : "";
  } catch { return ""; }
}

// ─── Reddit Fan Feed ──────────────────────────────────────────────────────────

export interface RedditPost {
  title: string;
  score: number;
  upvoteRatio: number;
  url: string;
  subreddit: string;
  created: number;
  sentiment: "positive" | "negative" | "neutral";
}

async function fetchRedditFanSentiment(teamId: number, clubName: string): Promise<{
  score: number;
  posts: RedditPost[];
  positive: number;
  negative: number;
  total: number;
  subreddit: string;
}> {
  const subreddit = CLUB_SUBREDDITS[teamId];
  let url: string;
  let subLabel: string;

  if (subreddit) {
    url = `https://www.reddit.com/r/${subreddit}/new.json?limit=20`;
    subLabel = `r/${subreddit}`;
  } else {
    const query = encodeURIComponent(clubName.split(" ")[0]);
    url = `https://www.reddit.com/r/ligue1/search.json?q=${query}&sort=new&limit=15&restrict_sr=1`;
    subLabel = "r/ligue1";
  }

  try {
    const json = await safeFetch(url, { headers: { "User-Agent": "FootPredictom/1.0" } });
    if (!json) return { score: 50, posts: [], positive: 0, negative: 0, total: 0, subreddit: subLabel };

    const data = JSON.parse(json);
    const children = data?.data?.children ?? [];
    let positive = 0, negative = 0;
    const posts: RedditPost[] = [];

    for (const child of children.slice(0, 15)) {
      const p = child.data;
      const text = `${p.title ?? ""} ${p.selftext ?? ""}`;
      const { pos, neg } = scoreText(text, "both");
      // Weight by upvote score (more upvotes = more community agreement)
      const weight = Math.log2(Math.max(p.score ?? 1, 1));
      positive += pos * weight;
      negative += neg * weight;

      posts.push({
        title: (p.title ?? "").slice(0, 120),
        score: p.score ?? 0,
        upvoteRatio: p.upvote_ratio ?? 0.5,
        url: p.permalink ? `https://reddit.com${p.permalink}` : "",
        subreddit: p.subreddit_name_prefixed ?? subLabel,
        created: p.created_utc ?? 0,
        sentiment: toSentiment(pos, neg),
      });
    }

    const total = positive + negative;
    const score = total < 1 ? 50 : Math.max(0, Math.min(100,
      Math.round(50 + ((positive - negative) / (total + 2)) * 50)
    ));

    return { score, posts: posts.slice(0, 8), positive: Math.round(positive), negative: Math.round(negative), total: Math.round(total), subreddit: subLabel };
  } catch {
    return { score: 50, posts: [], positive: 0, negative: 0, total: 0, subreddit: subLabel };
  }
}

// ─── Media RSS ───────────────────────────────────────────────────────────────

function filterAndScore(items: RSSItem[], query: string): { pos: number; neg: number; articles: ArticleItem[] } {
  const terms = query.toLowerCase().split("+").filter((t) => t.length > 2);
  const relevant = items.filter((i) => {
    const lower = i.title.toLowerCase();
    return terms.some((t) => lower.includes(t));
  });
  let pos = 0, neg = 0;
  const articles: ArticleItem[] = [];
  for (const item of relevant.slice(0, 10)) {
    const s = scoreText(item.title, "fr");
    pos += s.pos; neg += s.neg;
    articles.push({ ...item, sentiment: toSentiment(s.pos, s.neg) });
  }
  return { pos, neg, articles };
}

async function fetchMediaScore(teamId: number): Promise<{
  score: number; articles: ArticleItem[]; positive: number; negative: number;
  total: number; sourceBreakdown: SourceBreakdown[];
}> {
  const query = CLUB_SEARCH_TERMS[teamId];
  if (!query) return { score: 50, articles: [], positive: 0, negative: 0, total: 0, sourceBreakdown: [] };

  const [googleXml, rmcXml, figaroXml] = await Promise.all([
    safeFetch(`https://news.google.com/rss/search?q=${query}+football&hl=fr&gl=FR&ceid=FR:fr`, { next: { revalidate: 1800 } } as RequestInit),
    safeFetch("https://rmcsport.bfmtv.com/rss/football/", { next: { revalidate: 1800 } } as RequestInit),
    safeFetch("https://www.lefigaro.fr/rss/figaro_sport.xml", { next: { revalidate: 1800 } } as RequestInit),
  ]);

  const sourceBreakdown: SourceBreakdown[] = [];
  let totalPos = 0, totalNeg = 0;
  const allArticles: ArticleItem[] = [];

  for (const [xml, label] of [
    [googleXml, "Google News"],
    [rmcXml, "RMC Sport"],
    [figaroXml, "Le Figaro Sport"],
  ] as [string, string][]) {
    const items = parseRSS(xml, label);
    const { pos, neg, articles } = filterAndScore(items, query);
    totalPos += pos; totalNeg += neg;
    const srcScore = (pos + neg) === 0 ? 50 : Math.max(0, Math.min(100, Math.round(50 + ((pos - neg) / (pos + neg + 2)) * 50)));
    sourceBreakdown.push({ source: label, articleCount: articles.length, positive: pos, negative: neg, score: srcScore });
    allArticles.push(...articles.slice(0, 3).map((a) => ({ ...a, source: label })));
  }

  const total = totalPos + totalNeg;
  const score = total === 0 ? 50 : Math.max(0, Math.min(100, Math.round(50 + ((totalPos - totalNeg) / (total + 3)) * 50)));
  return { score, articles: allArticles.slice(0, 9), positive: totalPos, negative: totalNeg, total, sourceBreakdown };
}

// ─── Odds API ────────────────────────────────────────────────────────────────

async function fetchOddsMarketScore(): Promise<Map<string, number>> {
  if (!ODDS_API_KEY) return new Map();
  try {
    const json = await safeFetch(
      `https://api.the-odds-api.com/v4/sports/soccer_france_ligue_one/odds/?regions=eu&markets=h2h&apiKey=${ODDS_API_KEY}`,
      { next: { revalidate: 3600 } } as RequestInit
    );
    if (!json) return new Map();
    const matches = JSON.parse(json);
    const teamOdds = new Map<string, number[]>();
    for (const match of matches) {
      for (const bk of match.bookmakers ?? []) {
        const market = bk.markets?.find((m: { key: string }) => m.key === "h2h");
        if (!market) continue;
        for (const outcome of market.outcomes ?? []) {
          if (!teamOdds.has(outcome.name)) teamOdds.set(outcome.name, []);
          teamOdds.get(outcome.name)!.push(outcome.price);
        }
      }
    }
    const result = new Map<string, number>();
    for (const [team, odds] of teamOdds) {
      const avg = odds.reduce((a: number, b: number) => a + b, 0) / odds.length;
      const impliedProb = (1 / avg) * 100;
      result.set(team.toLowerCase(), Math.min(95, Math.max(5, Math.round(impliedProb * 1.5 + 25))));
    }
    return result;
  } catch { return new Map(); }
}

// ─── Human / Mercato ─────────────────────────────────────────────────────────

async function fetchHumanScore(teamId: number): Promise<{
  totalValue: number; avgValue: number; injuryRate: number;
  topPlayer: string | null; playerCount: number; injuredPlayers: string[];
}> {
  const tmId = TEAM_TM_MAP[teamId];
  if (!tmId) return { totalValue: 0, avgValue: 0, injuryRate: 0, topPlayer: null, playerCount: 0, injuredPlayers: [] };
  try {
    const json = await safeFetch(`https://transfermarkt-api.fly.dev/clubs/${tmId}/players`, { next: { revalidate: 3600 } } as RequestInit);
    if (!json) throw new Error();
    const data = JSON.parse(json);
    const players: TmPlayer[] = data.players ?? [];
    const total = players.reduce((s, p) => s + (p.marketValue ?? 0), 0);
    const avg = players.length > 0 ? total / players.length : 0;
    const injured = players.filter((p) => p.status?.toLowerCase().includes("injury"));
    const topPlayer = [...players].sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0))[0]?.name ?? null;
    return {
      totalValue: total, avgValue: avg,
      injuryRate: players.length > 0 ? injured.length / players.length : 0,
      topPlayer, playerCount: players.length,
      injuredPlayers: injured.slice(0, 5).map((p) => `${p.name}${p.status ? ` (${p.status.split(" - ")[0]})` : ""}`),
    };
  } catch { return { totalValue: 0, avgValue: 0, injuryRate: 0, topPlayer: null, playerCount: 0, injuredPlayers: [] }; }
}

function normalize(value: number, values: number[]): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 50;
  return Math.round(((value - min) / (max - min)) * 100);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

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

    const [humanResults, mediaResults, redditResults, oddsMap] = await Promise.all([
      Promise.all(teamIds.map(fetchHumanScore)),
      Promise.all(teamIds.map(fetchMediaScore)),
      Promise.all(teamIds.map((id) => fetchRedditFanSentiment(id, teamInfo[id]?.name ?? ""))),
      fetchOddsMarketScore(),
    ]);

    const totalValues = humanResults.map((h) => h.totalValue);
    const avgValues = humanResults.map((h) => h.avgValue);
    const hasOdds = oddsMap.size > 0;

    const scores = teamIds.map((id, i) => {
      const human = humanResults[i];
      const media = mediaResults[i];
      const reddit = redditResults[i];
      const eco = ECONOMIC_SCORES[id] ?? { score: 50, label: "Inconnu", revenue: "?", owner: "?" };

      const totalNorm = normalize(totalValues[i], totalValues);
      const avgNorm = normalize(avgValues[i], avgValues);
      const injuryPenalty = Math.round(human.injuryRate * 30);
      const humanScore = Math.max(0, Math.round(totalNorm * 0.6 + avgNorm * 0.4 - injuryPenalty));

      const teamName = teamInfo[id]?.name?.toLowerCase() ?? "";
      const oddsScore = oddsMap.get(teamName) ?? (hasOdds ? 50 : null);

      // Weights: eco 28%, media 28%, human 30%, fan 14% (+ market 10% if available, reducing others)
      let weights = { eco: 0.28, media: 0.28, human: 0.30, fan: 0.14, market: 0 };
      if (oddsScore !== null) {
        weights = { eco: 0.24, media: 0.24, human: 0.27, fan: 0.15, market: 0.10 };
      }

      const emotionalScore = Math.round(
        eco.score * weights.eco +
        media.score * weights.media +
        humanScore * weights.human +
        reddit.score * weights.fan +
        (oddsScore !== null ? oddsScore * weights.market : 0)
      );

      // Graduated prediction delta (stored as raw values for frontend use)
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
          economic: { score: eco.score, label: eco.label, revenue: eco.revenue, owner: eco.owner, weight: Math.round(weights.eco * 100) },
          media: { score: media.score, positive: media.positive, negative: media.negative, total: media.total, articles: media.articles, sourceBreakdown: media.sourceBreakdown, weight: Math.round(weights.media * 100) },
          human: { score: humanScore, totalValue: human.totalValue, avgValue: Math.round(human.avgValue), injuryRate: Math.round(human.injuryRate * 100), topPlayer: human.topPlayer, playerCount: human.playerCount, injuredPlayers: human.injuredPlayers, weight: Math.round(weights.human * 100) },
          fan: { score: reddit.score, posts: reddit.posts, positive: reddit.positive, negative: reddit.negative, total: reddit.total, subreddit: reddit.subreddit, weight: Math.round(weights.fan * 100) },
          market: oddsScore !== null ? { score: oddsScore, weight: Math.round(weights.market * 100), source: "The Odds API" } : null,
        },
      };
    });

    return NextResponse.json({
      scores,
      sources: {
        media: ["Google News", "RMC Sport", "Le Figaro Sport"],
        fan: "Reddit (r/[club] + r/ligue1)",
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

interface TmPlayer { marketValue?: number; status?: string; name: string }
interface StandingEntry { position: number; team: { id: number; name: string; shortName: string; tla: string; crest: string } }
interface ArticleItem { title: string; pubDate: string; source: string; sentiment: "positive" | "negative" | "neutral" }
interface SourceBreakdown { source: string; articleCount: number; positive: number; negative: number; score: number }
interface RSSItem { title: string; pubDate: string; source: string }
