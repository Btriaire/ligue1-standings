import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ADMIN_USER = process.env.ADMIN_USER ?? "Admin";
const COOKIE_NAME = "fp_admin";
const TTL = 8 * 3600 * 1000;

function checkAdmin(req: NextRequest): boolean {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [user, tsStr] = decoded.split(":");
    return user === ADMIN_USER && Date.now() - parseInt(tsStr) < TTL;
  } catch { return false; }
}

const SOURCE_CONFIGS: Record<string, {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  fixPath?: string;   // API route to call to attempt a fix
  fixLabel?: string;
}> = {
  "football-data": {
    url: "https://api.football-data.org/v4/competitions/FL1",
    headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY ?? "" },
    fixPath: "/api/standings",
    fixLabel: "Refresh classement",
  },
  "understat": {
    url: "https://understat.com/league/Ligue_1/2025",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FootInsider/1.0)" },
    fixPath: "/api/cron/warm-players",
    fixLabel: "Warm cache joueurs",
  },
  "sofascore": {
    url: "https://api.sofascore.com/api/v1/team/1644/players",
    headers: { "Referer": "https://www.sofascore.com/", "User-Agent": "Mozilla/5.0" },
    fixPath: "/api/cron/sofascore",
    fixLabel: "Relancer scrape SofaScore",
  },
  "sofoot": {
    url: "https://www.sofoot.com/rss/",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FootInsider/1.0)" },
    fixPath: "/api/news?topic=l1",
    fixLabel: "Purge cache news",
  },
  "transfermarkt": {
    url: "https://transfermarkt-api.fly.dev/competitions/FR1/clubs?season_id=2024",
    fixPath: "/api/cron/warm-players",
    fixLabel: "Warm cache joueurs",
  },
  "fbref": {
    url: "https://fbref.com/en/comps/13/Ligue-1-Stats",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FootInsider/1.0)" },
    // no fix — permanently blocked
  },
};

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sourceId } = await req.json().catch(() => ({})) as { sourceId?: string };
  if (!sourceId) return NextResponse.json({ error: "Missing sourceId" }, { status: 400 });

  const cfg = SOURCE_CONFIGS[sourceId];
  if (!cfg) return NextResponse.json({ error: "Unknown source" }, { status: 400 });

  const t0 = Date.now();
  try {
    const res = await fetch(cfg.url, {
      method: cfg.method ?? "GET",
      headers: cfg.headers,
      signal: AbortSignal.timeout(8000),
    } as RequestInit);
    const ms = Date.now() - t0;
    const status = res.status;
    const ok = res.ok;

    // Try to read a bit of the body for diagnosis
    let hint = "";
    if (!ok) {
      try {
        const txt = await res.text();
        if (txt.length < 500) hint = txt.replace(/<[^>]+>/g, "").trim().slice(0, 120);
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      ok,
      status,
      ms,
      hint: hint || undefined,
      fixPath: cfg.fixPath,
      fixLabel: cfg.fixLabel,
    });
  } catch (err: unknown) {
    const ms = Date.now() - t0;
    const msg = err instanceof Error ? err.message : "timeout";
    return NextResponse.json({
      ok: false,
      status: 0,
      ms,
      hint: msg,
      fixPath: cfg.fixPath,
      fixLabel: cfg.fixLabel,
    });
  }
}
