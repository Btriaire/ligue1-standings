// Daily cron — posts one CdM 2026 prediction to @FootPredictOM.
//
// Schedule (vercel.json): "0 9 * * *" → 09:00 UTC every day.
// Auth: Bearer CRON_SECRET (same pattern as all other cron routes).
//
// Match selection: cycles through WC_MATCHES_DATA using days elapsed
// since TWEET_START_DATE. The cycle wraps so tweets restart after all
// 18 matches have been covered.

import { NextResponse } from "next/server";
import { WC_MATCHES_DATA, WC_FACTOR_META } from "@/app/lib/wc-data";
import { postTweet } from "@/app/lib/twitter-client";

export const maxDuration = 60;

// First tweet goes out on this date (day-index = 0 → first match).
const TWEET_START_DATE = "2026-05-24";

function dayIndex(now: Date): number {
  const start = new Date(TWEET_START_DATE + "T00:00:00Z");
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  // Cycle through all 18 matches, then restart
  return ((diffDays % WC_MATCHES_DATA.length) + WC_MATCHES_DATA.length) % WC_MATCHES_DATA.length;
}

/** Strip flag emojis from team name for cleaner @mention-safe text */
function teamName(raw: string): string {
  // "🇫🇷 France" → "France"
  return raw.replace(/[\u{1F1E0}-\u{1F1FF}]{2}/gu, "").replace(/🏴󠁧󠁢󠁥󠁮󠁧󠁿/gu, "").trim();
}

/** Extract city from "City – Stadium" venue string */
function city(venue: string): string {
  return venue.split("–")[0].trim();
}

function buildTweet(index: number): string {
  const m = WC_MATCHES_DATA[index];
  const factor = WC_FACTOR_META[m.wcFactor];

  // Winner label
  const winnerLabel =
    m.winner === "home" ? `${teamName(m.home)} gagne`
    : m.winner === "away" ? `${teamName(m.away)} gagne`
    : "Match nul";

  const topProb = Math.max(m.hP, m.dP, m.aP);
  const bttsStr = m.btts ? "BTTS ✓" : "BTTS ✗";
  const xgLine = `xG ${m.xgHome.toFixed(1)}–${m.xgAway.toFixed(1)}`;

  // WC factor — show which team benefits (keep short)
  const factorTeamName = m.wcFactorTeam === "home" ? teamName(m.home) : teamName(m.away);
  const factorLine = m.wcFactorTeam === "both"
    ? `${factor.icon} ${factor.label}`
    : `${factor.icon} ${factor.label} · ${factorTeamName}`;

  // First bullet of tactical note (before first ·), capped at 48 chars
  const insightRaw = m.tacticalNote.split("·")[0].trim();
  const insight = insightRaw.length > 48 ? insightRaw.slice(0, 47) + "…" : insightRaw;

  const lines = [
    `🌍 CdM 2026 · Gr.${m.group}`,
    "",
    `${m.home} vs ${m.away}`,
    `📅 ${m.date} · ${city(m.venue)}`,
    "",
    `🎯 ${winnerLabel} · ${topProb}%`,
    `⚽ Prédit : ${m.scorePredict}`,
    `📊 ${xgLine} · ${m.overUnder} · ${bttsStr}`,
    factorLine,
    "",
    `💡 ${insight}`,
    "",
    `⭐ ${m.keyHome} vs ${m.keyAway}`,
    "",
    "#CdM2026 #FootPredictOM",
  ];

  return lines.join("\n");
}

export async function GET(req: Request) {
  // Auth check
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const idx = dayIndex(now);
  const tweet = buildTweet(idx);

  // Guard against overly long tweets (shouldn't happen, but safety net)
  if (tweet.length > 280) {
    console.error(`[post-wc-prediction] Tweet too long (${tweet.length} chars):\n${tweet}`);
    return NextResponse.json({ error: "Tweet too long", length: tweet.length, tweet }, { status: 422 });
  }

  try {
    const tweetId = await postTweet(tweet);
    console.log(`[post-wc-prediction] Posted match #${idx} (${WC_MATCHES_DATA[idx].home} vs ${WC_MATCHES_DATA[idx].away}), tweet id=${tweetId}`);
    return NextResponse.json({
      ok: true,
      matchIndex: idx,
      match: `${WC_MATCHES_DATA[idx].home} vs ${WC_MATCHES_DATA[idx].away}`,
      tweetId,
      chars: tweet.length,
      preview: tweet,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Include Twitter API error detail if available (ApiResponseError has .data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detail = (err as any)?.data ?? (err as any)?.errors ?? null;
    console.error("[post-wc-prediction] Twitter error:", msg, JSON.stringify(detail));
    return NextResponse.json({ error: msg, detail, tweet }, { status: 500 });
  }
}
