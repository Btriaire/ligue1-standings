import { NextResponse } from "next/server";
import { CLUB_SUBREDDITS, CLUB_SEARCH_TERMS } from "@/app/lib/teamMapping";

export const dynamic = "force-dynamic";

const POSITIVE_FR = ["victoire","gagne","champion","titre","qualification","transfert","recrutement","prolonge","record","brillant","excellent","remporte","buteur","héros","espoir","confiant","dynamique","solide","impressionnant","historique","succès","joie","invaincu","leader","domination","exploit"];
const NEGATIVE_FR = ["défaite","blessure","blessé","absent","crise","scandale","licencié","viré","démission","litige","amende","suspension","difficile","inquiétant","chute","relégation","problème","humiliation","doute","tension","conflit","erreur","déroute","naufrage","honte"];
const POSITIVE_EN = ["win","won","victory","champion","brilliant","great","amazing","love","proud","incredible","goat","legend","hope","confident","quality","perfect","class"];
const NEGATIVE_EN = ["loss","lose","lost","terrible","awful","crisis","sack","injury","injured","poor","worst","pathetic","shame","disaster","panic","worried","concern","relegation"];

function sentimentScore(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  const pos = [...POSITIVE_FR, ...POSITIVE_EN].filter((w) => lower.includes(w)).length;
  const neg = [...NEGATIVE_FR, ...NEGATIVE_EN].filter((w) => lower.includes(w)).length;
  return pos > neg ? "positive" : neg > pos ? "negative" : "neutral";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamId = parseInt(searchParams.get("teamId") ?? "0");
  if (!teamId) return NextResponse.json({ posts: [], error: "Missing teamId" });

  const subreddit = CLUB_SUBREDDITS[teamId];
  const searchQuery = CLUB_SEARCH_TERMS[teamId] ?? "";
  const clubWord = searchQuery.split("+")[0] ?? "";

  const url = subreddit
    ? `https://www.reddit.com/r/${subreddit}/new.json?limit=20`
    : `https://www.reddit.com/r/ligue1/search.json?q=${encodeURIComponent(clubWord)}&sort=new&limit=15&restrict_sr=1`;

  const subLabel = subreddit ? `r/${subreddit}` : "r/ligue1";

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FootPredictom/1.0; +https://footpredictom.vercel.app)",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ posts: [], subreddit: subLabel, error: `Reddit ${res.status}` });
    }

    const json = await res.json();
    const children = json?.data?.children ?? [];

    const posts = children.slice(0, 10).map((c: Record<string, Record<string, unknown>>) => {
      const p = c.data;
      return {
        title: String(p.title ?? "").slice(0, 120),
        score: Number(p.score ?? 0),
        upvoteRatio: Number(p.upvote_ratio ?? 0.5),
        url: p.permalink ? `https://reddit.com${p.permalink}` : "",
        subreddit: String(p.subreddit_name_prefixed ?? subLabel),
        created: Number(p.created_utc ?? 0),
        sentiment: sentimentScore(String(p.title ?? "") + " " + String(p.selftext ?? "")),
      };
    });

    return NextResponse.json({ posts, subreddit: subLabel });
  } catch (err) {
    return NextResponse.json({ posts: [], subreddit: subLabel, error: String(err) });
  }
}
