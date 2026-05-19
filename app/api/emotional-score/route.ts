import { NextResponse } from "next/server";
import { TEAM_TM_MAP, ECONOMIC_SCORES, CLUB_SEARCH_TERMS, CLUB_SUBREDDITS } from "@/app/lib/teamMapping";

// LLM provider: Groq (OpenAI-compatible). Free tier ~14k requests/day,
// no card required. We send one batched chat completion for all clubs
// per /api/emotional-score call (1 request per 30-min revalidate window).
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.3-70b-versatile";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const ODDS_API_KEY = process.env.THE_ODDS_API_KEY;

export const revalidate = 1800;
export const dynamic = "force-dynamic";

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

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function parseRSS(xml: string, defaultSource: string): RSSItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const item = m[1];
    const title = (item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] ?? "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    const desc = (item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1] ?? "");
    const description = stripHtml(desc).slice(0, 500);
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
    const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? "";
    const source = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] ?? defaultSource;
    return { title, pubDate, source, description, link };
  }).filter((i) => i.title.length > 5);
}

// ─── Article excerpt scraper ─────────────────────────────────────────────────
// For top articles per club, grab og:description or first <p> for richer text.
async function fetchArticleExcerpt(url: string): Promise<string> {
  if (!url) return "";
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3500),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "text/html",
      },
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res.ok) return "";
    const html = await res.text();
    const og = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1];
    if (og) return stripHtml(og).slice(0, 400);
    // Fallback: first <p> with at least 80 chars
    const pMatches = [...html.matchAll(/<p[^>]*>([\s\S]{80,600}?)<\/p>/gi)];
    for (const m of pMatches) {
      const text = stripHtml(m[1]);
      if (text.length >= 80) return text.slice(0, 400);
    }
    return "";
  } catch { return ""; }
}

// ─── Freshness + source weighting ────────────────────────────────────────────
function freshnessWeight(pubDate: string): number {
  const t = pubDate ? new Date(pubDate).getTime() : 0;
  if (!t) return 0.5;
  const ageDays = (Date.now() - t) / 86400000;
  if (ageDays < 1) return 1.0;
  if (ageDays < 3) return 0.85;
  if (ageDays < 7) return 0.65;
  if (ageDays < 14) return 0.40;
  return 0.20;
}

const SOURCE_WEIGHTS: Record<string, number> = {
  "RMC Sport": 1.20,
  "Le Figaro Sport": 1.10,
  "Google News": 1.00,
  "ActuFoot_ (X)": 1.05,
  "FotMob": 1.15,
  "Ligue1.com": 1.20,
};
function sourceWeight(source: string): number {
  return SOURCE_WEIGHTS[source] ?? 1.0;
}

async function safeFetch(url: string, opts?: RequestInit): Promise<string> {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(7000) });
    return res.ok ? await res.text() : "";
  } catch { return ""; }
}

// ─── Fan Sentiment Proxy ──────────────────────────────────────────────────────
// Reddit blocks server-side fetches (403 from Vercel IPs).
// Use a proxy score derived from league position + recent form.
// The Reddit feed is loaded client-side via direct browser fetch in EmotionalScoreTab.

export interface RedditPost {
  title: string;
  score: number;
  upvoteRatio: number;
  url: string;
  subreddit: string;
  created: number;
  sentiment: "positive" | "negative" | "neutral";
}

function fanSentimentProxy(position: number, form: string): {
  score: number;
  posts: RedditPost[];
  positive: number;
  negative: number;
  total: number;
  subreddit: string;
} {
  const results = form.split(",").filter(Boolean).slice(-5);
  const pts = results.reduce((a, r) => a + (r === "W" ? 3 : r === "D" ? 1 : 0), 0);
  const maxPts = results.length * 3;

  // Position: top clubs → higher score (0–50)
  const posBase = ((18 - position) / 17) * 50;
  // Form: recent results (0–40)
  const formBase = maxPts > 0 ? (pts / maxPts) * 40 : 20;
  // Trend bonus: last 3 matches
  const recent3 = results.slice(-3);
  const recentPts = recent3.reduce((a, r) => a + (r === "W" ? 3 : r === "D" ? 1 : 0), 0);
  const trendBonus = recentPts >= 9 ? 5 : recentPts === 0 && recent3.length > 0 ? -5 : 0;

  const score = Math.max(5, Math.min(95, Math.round(10 + posBase + formBase + trendBonus)));

  return {
    score,
    posts: [], // client-side loads these via direct Reddit fetch
    positive: Math.round(posBase + formBase),
    negative: Math.round(100 - score),
    total: 0,
    subreddit: "proxy", // indicates proxy mode; client knows to show "Charger" button
  };
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

// ─── ActuFoot tweets (shared cache) ──────────────────────────────────────────
interface Tweet { id: string; title: string; pubDate: string }
let actuFootCache: { tweets: Tweet[]; at: number } | null = null;
async function fetchActuFootTweets(): Promise<RSSItem[]> {
  // Reuse our own /api/twitter-user; cache for 10 min in-process.
  if (actuFootCache && Date.now() - actuFootCache.at < 600_000) {
    return actuFootCache.tweets.map(t => ({ title: t.title, pubDate: t.pubDate, source: "ActuFoot_ (X)" }));
  }
  try {
    // Direct nitter call to avoid recursive internal URL resolution.
    const xml = await safeFetch("https://nitter.net/ActuFoot_/rss", {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/rss+xml" },
      next: { revalidate: 600 },
    } as RequestInit);
    if (!xml) { actuFootCache = { tweets: [], at: Date.now() }; return []; }
    const items = parseRSS(xml, "ActuFoot_ (X)");
    actuFootCache = { tweets: items.map(i => ({ id: i.link ?? i.title, title: i.title, pubDate: i.pubDate })), at: Date.now() };
    return items.map(i => ({ ...i, source: "ActuFoot_ (X)" }));
  } catch {
    return [];
  }
}

// ─── LLM (Groq) per-club scorer ──────────────────────────────────────────────
interface GeminiResult {
  score: number;
  positive: number;
  negative: number;
  summary: string;
  per_item: ("positive" | "negative" | "neutral")[];
}
interface GeminiClubInput {
  clubName: string;
  items: { title: string; description?: string; source: string; ageLabel: string }[];
}
// Single batched call: evaluate ALL clubs in one LLM request.
// Drastically cuts request count (1 vs 18) — keeps us well under free-tier limits.
async function scoreClubsBatch(clubs: GeminiClubInput[]): Promise<Map<string, GeminiResult>> {
  const out = new Map<string, GeminiResult>();
  if (!GROQ_API_KEY) { console.warn("[llm] GROQ_API_KEY missing"); return out; }
  const eligible = clubs.filter(c => c.items.length > 0);
  if (eligible.length === 0) return out;

  const blocks = eligible.map((c, ci) => {
    const numbered = c.items.map((it, i) =>
      `  ${i + 1}. [${it.source} · ${it.ageLabel}] ${it.title}${it.description ? ` — ${it.description.slice(0, 200)}` : ""}`
    ).join("\n");
    return `--- Club ${ci + 1}: ${c.clubName} (${c.items.length} items) ---\n${numbered}`;
  }).join("\n\n");

  console.log(`[llm] batch call clubs=${eligible.length} totalItems=${eligible.reduce((s,c)=>s+c.items.length,0)}`);

  const system =
    "Tu es un analyste sentiment foot français. Pour CHAQUE club fourni, évalue son climat médiatique global à partir de sa liste d'actualités. " +
    "Considère: résultats sportifs, blessures, transferts, climat interne, comportement des fans, polémiques. " +
    "Réponds en JSON STRICT: " +
    `{"results":[{"club":"nom exact","score":0-100,"positive":int,"negative":int,"summary":"1 phrase fr","per_item":["positive"|"negative"|"neutral",...]},...]}` +
    " où per_item a la même longueur que la liste d'items du club. 50 = neutre, 100 = très positif, 0 = très négatif.";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: blocks },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[llm] batch HTTP ${res.status}: ${errText.slice(0, 300)}`);
      return out;
    }
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    console.log(`[llm] batch raw len=${text.length}`);
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    const arr: { club?: string; score?: number; positive?: number; negative?: number; summary?: string; per_item?: string[] }[] =
      Array.isArray(json.results) ? json.results : [];
    for (const r of arr) {
      if (!r.club) continue;
      const club = eligible.find(c => c.clubName === r.club)
        ?? eligible.find(c => c.clubName.toLowerCase().includes(String(r.club).toLowerCase())
                          || String(r.club).toLowerCase().includes(c.clubName.toLowerCase()));
      if (!club) continue;
      const score = Math.max(0, Math.min(100, Number(r.score) || 50));
      const positive = Math.max(0, Number(r.positive) || 0);
      const negative = Math.max(0, Number(r.negative) || 0);
      const summary = String(r.summary ?? "").slice(0, 240);
      const per_item = (Array.isArray(r.per_item) ? r.per_item : [])
        .map(v => (v === "positive" || v === "negative") ? v : "neutral")
        .slice(0, club.items.length) as ("positive" | "negative" | "neutral")[];
      out.set(club.clubName, { score, positive, negative, summary, per_item });
    }
    console.log(`[llm] batch ok results=${out.size}/${eligible.length}`);
  } catch (err) {
    console.error("[llm] batch failed:", err instanceof Error ? err.message : err);
  }
  return out;
}

// ─── Article excerpts (top N per club, parallel) ─────────────────────────────
async function enrichWithExcerpts(items: RSSItem[], maxConcurrent = 3): Promise<RSSItem[]> {
  const top = items.slice(0, maxConcurrent);
  const enriched = await Promise.all(top.map(async (it) => {
    if (!it.link || (it.description && it.description.length > 120)) return it;
    const excerpt = await fetchArticleExcerpt(it.link);
    return excerpt ? { ...it, description: excerpt } : it;
  }));
  return [...enriched, ...items.slice(maxConcurrent)];
}

function ageLabel(pubDate: string): string {
  const t = pubDate ? new Date(pubDate).getTime() : 0;
  if (!t) return "récent";
  const h = (Date.now() - t) / 3_600_000;
  if (h < 1) return "il y a moins d'1h";
  if (h < 24) return `il y a ${Math.round(h)}h`;
  const d = Math.round(h / 24);
  return `il y a ${d}j`;
}

interface MediaBundle {
  clubName: string;
  finalItems: RSSItem[];
  sourceBreakdown: SourceBreakdown[];
  geminiInput: { title: string; description?: string; source: string; ageLabel: string }[];
}

async function collectMediaItems(teamId: number, clubName: string, actuFootItems: RSSItem[]): Promise<MediaBundle | null> {
  const query = CLUB_SEARCH_TERMS[teamId];
  if (!query) return null;

  const [googleXml, rmcXml, figaroXml] = await Promise.all([
    safeFetch(`https://news.google.com/rss/search?q=${query}+football&hl=fr&gl=FR&ceid=FR:fr`, { next: { revalidate: 1800 } } as RequestInit),
    safeFetch("https://rmcsport.bfmtv.com/rss/football/", { next: { revalidate: 1800 } } as RequestInit),
    safeFetch("https://www.lefigaro.fr/rss/figaro_sport.xml", { next: { revalidate: 1800 } } as RequestInit),
  ]);

  const terms = query.toLowerCase().split("+").filter(t => t.length > 2);
  const matchesClub = (s: string) => {
    const lower = s.toLowerCase();
    return terms.some(t => lower.includes(t));
  };

  // Collect all items from RSS + ActuFoot, filter by club
  const sourceBreakdown: SourceBreakdown[] = [];
  const allItems: RSSItem[] = [];
  for (const [xml, label] of [
    [googleXml, "Google News"],
    [rmcXml, "RMC Sport"],
    [figaroXml, "Le Figaro Sport"],
  ] as [string, string][]) {
    const items = parseRSS(xml, label).filter(i => matchesClub(i.title) || matchesClub(i.description ?? ""));
    allItems.push(...items);
    sourceBreakdown.push({ source: label, articleCount: items.length, positive: 0, negative: 0, score: 50 });
  }
  const tweets = actuFootItems.filter(i => matchesClub(i.title));
  allItems.push(...tweets);
  if (tweets.length > 0) sourceBreakdown.push({ source: "ActuFoot_ (X)", articleCount: tweets.length, positive: 0, negative: 0, score: 50 });

  if (allItems.length === 0) {
    return { clubName, finalItems: [], sourceBreakdown, geminiInput: [] };
  }

  // Sort by freshness × source weight, take top 12
  const ranked = [...allItems].sort((a, b) => {
    const wa = freshnessWeight(a.pubDate) * sourceWeight(a.source);
    const wb = freshnessWeight(b.pubDate) * sourceWeight(b.source);
    return wb - wa;
  }).slice(0, 12);

  // Scrape excerpts for top 3 RSS items (skip tweets which have no usable URL)
  const rssOnly = ranked.filter(i => i.source !== "ActuFoot_ (X)");
  const enrichedRss = await enrichWithExcerpts(rssOnly, 3);
  const enrichedMap = new Map(enrichedRss.map(i => [i.title, i]));
  const finalItems = ranked.map(i => enrichedMap.get(i.title) ?? i);

  const geminiInput = finalItems.map(i => ({
    title: i.title,
    description: i.description,
    source: i.source,
    ageLabel: ageLabel(i.pubDate),
  }));

  return { clubName, finalItems, sourceBreakdown, geminiInput };
}

function assembleMediaScore(bundle: MediaBundle, gem: GeminiResult | undefined): {
  score: number; articles: ArticleItem[]; positive: number; negative: number;
  total: number; sourceBreakdown: SourceBreakdown[]; summary?: string;
} {
  const { finalItems, sourceBreakdown } = bundle;
  if (finalItems.length === 0) {
    return { score: 50, articles: [], positive: 0, negative: 0, total: 0, sourceBreakdown };
  }

  let score = 50;
  let positive = 0, negative = 0;
  let summary = "";
  const perItem: ("positive" | "negative" | "neutral")[] = new Array(finalItems.length).fill("neutral");

  if (gem) {
    score = gem.score;
    positive = gem.positive;
    negative = gem.negative;
    summary = gem.summary;
    for (let i = 0; i < perItem.length && i < gem.per_item.length; i++) perItem[i] = gem.per_item[i];
  } else {
    // Lexicon fallback: weight by freshness × source
    let posW = 0, negW = 0;
    finalItems.forEach((item, idx) => {
      const text = `${item.title} ${item.description ?? ""}`;
      const s = scoreText(text, "fr");
      const w = freshnessWeight(item.pubDate) * sourceWeight(item.source);
      posW += s.pos * w;
      negW += s.neg * w;
      perItem[idx] = toSentiment(s.pos, s.neg);
    });
    positive = Math.round(posW);
    negative = Math.round(negW);
    const total = positive + negative;
    score = total === 0 ? 50 : Math.max(0, Math.min(100, Math.round(50 + ((positive - negative) / (total + 3)) * 50)));
  }

  const articles: ArticleItem[] = finalItems.slice(0, 9).map((i, idx) => ({
    title: i.title,
    pubDate: i.pubDate,
    source: i.source,
    sentiment: perItem[idx] ?? "neutral",
  }));

  for (const sb of sourceBreakdown) {
    const idxs = finalItems
      .map((it, i) => it.source === sb.source ? i : -1)
      .filter(i => i >= 0);
    sb.articleCount = idxs.length;
    sb.positive = idxs.filter(i => perItem[i] === "positive").length;
    sb.negative = idxs.filter(i => perItem[i] === "negative").length;
    const t = sb.positive + sb.negative;
    sb.score = t === 0 ? 50 : Math.round(50 + ((sb.positive - sb.negative) / (t + 1)) * 50);
  }

  return { score, articles, positive, negative, total: positive + negative, sourceBreakdown, summary };
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

    const actuFoot = await fetchActuFootTweets();

    const [humanResults, mediaBundles, oddsMap] = await Promise.all([
      Promise.all(teamIds.map(fetchHumanScore)),
      Promise.all(teamIds.map((id) => collectMediaItems(id, teamInfo[id]?.name ?? "", actuFoot))),
      fetchOddsMarketScore(),
    ]);

    // Single batched LLM call across all clubs (1 request, not 18)
    const geminiInputs: GeminiClubInput[] = mediaBundles
      .filter((b): b is MediaBundle => b !== null && b.geminiInput.length > 0)
      .map(b => ({ clubName: b.clubName, items: b.geminiInput }));
    const gemMap = await scoreClubsBatch(geminiInputs);

    const mediaResults = mediaBundles.map((b) => {
      if (!b) return { score: 50, articles: [], positive: 0, negative: 0, total: 0, sourceBreakdown: [] as SourceBreakdown[] };
      return assembleMediaScore(b, gemMap.get(b.clubName));
    });

    // Fan sentiment: use proxy (position + form) since Reddit blocks server IPs
    const redditResults = table.map((entry: StandingEntry) =>
      fanSentimentProxy(entry.position, entry.form ?? "")
    );

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
          media: { score: media.score, positive: media.positive, negative: media.negative, total: media.total, articles: media.articles, sourceBreakdown: media.sourceBreakdown, summary: media.summary, weight: Math.round(weights.media * 100) },
          human: { score: humanScore, totalValue: human.totalValue, avgValue: Math.round(human.avgValue), injuryRate: Math.round(human.injuryRate * 100), topPlayer: human.topPlayer, playerCount: human.playerCount, injuredPlayers: human.injuredPlayers, weight: Math.round(weights.human * 100) },
          fan: { score: reddit.score, posts: reddit.posts, positive: reddit.positive, negative: reddit.negative, total: reddit.total, subreddit: reddit.subreddit, weight: Math.round(weights.fan * 100) },
          market: oddsScore !== null ? { score: oddsScore, weight: Math.round(weights.market * 100), source: "The Odds API" } : null,
        },
      };
    });

    return NextResponse.json({
      scores,
      sources: {
        media: ["Google News", "RMC Sport", "Le Figaro Sport", "ActuFoot_ (X)"],
        fan: "Reddit (r/[club] + r/ligue1)",
        mercato: "Transfermarkt",
        economic: "Données publiques (UEFA, rapports annuels)",
        market: hasOdds ? "ExpertWEB" : null,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

interface TmPlayer { marketValue?: number; status?: string; name: string }
interface StandingEntry { position: number; form?: string; team: { id: number; name: string; shortName: string; tla: string; crest: string } }
interface ArticleItem { title: string; pubDate: string; source: string; sentiment: "positive" | "negative" | "neutral" }
interface SourceBreakdown { source: string; articleCount: number; positive: number; negative: number; score: number }
interface RSSItem { title: string; pubDate: string; source: string; description?: string; link?: string }
