import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebase-admin";

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

// ── Seasons (10 dernières années) ─────────────────────────────────────────────
const SEASONS = [
  "2015-16","2016-17","2017-18","2018-19","2019-20",
  "2020-21","2021-22","2022-23","2023-24","2024-25",
];

function seasonToCode(s: string): string {
  const [y1, y2] = s.split("-");
  return y1.slice(2) + y2; // "2023-24" → "2324"
}

const CSV_URL = (season: string) =>
  `https://datahub.io/football/french-ligue-1/_r/-/season-${seasonToCode(season)}.csv`;

// ── CSV Parser ────────────────────────────────────────────────────────────────
interface Match { date: string; home: string; away: string; hg: number; ag: number; result: string }

function parseCSV(raw: string): Match[] {
  const lines = raw.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  const idx = (n: string) => header.indexOf(n);
  const di = idx("Date"), hi = idx("HomeTeam"), ai = idx("AwayTeam");
  const hgi = idx("FTHG"), agi = idx("FTAG"), fri = idx("FTR");
  const cols = (line: string) => line.split(",").map(c => c.replace(/"/g, "").trim());
  return lines.slice(1).flatMap(line => {
    const c = cols(line);
    const hg = parseInt(c[hgi]), ag = parseInt(c[agi]);
    if (isNaN(hg) || isNaN(ag) || !c[hi]) return [];
    return [{ date: c[di], home: c[hi], away: c[ai], hg, ag, result: c[fri] }];
  });
}

// ── Stats computation ─────────────────────────────────────────────────────────
interface TeamStats { pts: number; gf: number; ga: number; w: number; d: number; l: number }

function computeSeason(season: string, matches: Match[]) {
  const teams: Record<string, TeamStats> = {};
  const ensure = (t: string) => { if (!teams[t]) teams[t] = { pts:0, gf:0, ga:0, w:0, d:0, l:0 }; };

  for (const m of matches) {
    ensure(m.home); ensure(m.away);
    teams[m.home].gf += m.hg; teams[m.home].ga += m.ag;
    teams[m.away].gf += m.ag; teams[m.away].ga += m.hg;
    if (m.result === "H") {
      teams[m.home].pts += 3; teams[m.home].w++; teams[m.away].l++;
    } else if (m.result === "D") {
      teams[m.home].pts++; teams[m.away].pts++; teams[m.home].d++; teams[m.away].d++;
    } else if (m.result === "A") {
      teams[m.away].pts += 3; teams[m.away].w++; teams[m.home].l++;
    }
  }

  const sorted = Object.entries(teams)
    .sort((a,b) => b[1].pts - a[1].pts || (b[1].gf-b[1].ga)-(a[1].gf-a[1].ga));

  const champion    = sorted[0]?.[0] ?? "?";
  const champPts    = sorted[0]?.[1].pts ?? 0;
  const relegated   = sorted.slice(-3).map(([t]) => t);
  const bestAtk     = Object.entries(teams).sort((a,b) => b[1].gf - a[1].gf)[0];
  const bestDef     = Object.entries(teams).sort((a,b) => a[1].ga - b[1].ga)[0];
  const mostWins    = Object.entries(teams).sort((a,b) => b[1].w - a[1].w)[0];

  let biggestWin = matches[0]; let biggestDiff = 0;
  for (const m of matches) {
    const d = Math.abs(m.hg - m.ag);
    if (d > biggestDiff) { biggestDiff = d; biggestWin = m; }
  }

  const totalGoals = matches.reduce((s,m) => s + m.hg + m.ag, 0);
  const avg = (totalGoals / matches.length).toFixed(2);
  const bw = biggestWin;
  const bwScore = bw ? `${bw.hg}-${bw.ag}` : "?";

  const facts = [
    `Saison ${season} : 🏆 ${champion} champion de Ligue 1 avec ${champPts} pts`,
    `Saison ${season} : ⚽ ${totalGoals} buts inscrits en L1 — ${avg} buts/match en moyenne`,
    `Saison ${season} : 🔥 Meilleure attaque — ${bestAtk?.[0]} avec ${bestAtk?.[1].gf} buts marqués`,
    `Saison ${season} : 🧱 Meilleure défense — ${bestDef?.[0]}, seulement ${bestDef?.[1].ga} buts encaissés`,
    bw ? `Saison ${season} : 💥 Plus grand écart — ${bw.home} ${bwScore} ${bw.away} (${bw.date})` : null,
    `Saison ${season} : 🥇 ${mostWins?.[0]} — plus grand nombre de victoires (${mostWins?.[1].w} en championnat)`,
    `Saison ${season} : 📉 Relégués — ${relegated.join(", ")}`,
  ].filter(Boolean) as string[];

  return {
    season, importedAt: new Date().toISOString(),
    totalMatches: matches.length, totalGoals,
    avgGoals: parseFloat(avg), champion, champPoints: champPts,
    relegated, bestAttack: bestAtk?.[0] ?? "", bestAttackGoals: bestAtk?.[1].gf ?? 0,
    bestDefense: bestDef?.[0] ?? "", bestDefenseGoals: bestDef?.[1].ga ?? 0,
    biggestWin: bw ? { home: bw.home, away: bw.away, score: bwScore, date: bw.date } : null,
    facts,
  };
}

// ── GET — status of imported seasons ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = getAdminFirestore();
    const snap = await db.collection("historicalL1").get();
    const imported: Record<string, { totalMatches: number; champion: string; importedAt: string }> = {};
    snap.forEach(doc => {
      const d = doc.data();
      imported[doc.id] = { totalMatches: d.totalMatches, champion: d.champion, importedAt: d.importedAt };
    });
    return NextResponse.json({ seasons: SEASONS, imported });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ── POST — import one or all seasons ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { season?: string; all?: boolean };
  const targets = body.all ? SEASONS : body.season ? [body.season] : [];
  if (!targets.length) return NextResponse.json({ error: "Missing season or all:true" }, { status: 400 });

  const db = getAdminFirestore();
  const results: Record<string, string> = {};
  const allFacts: string[] = [];

  for (const season of targets) {
    try {
      const url = CSV_URL(season);
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) } as RequestInit);
      if (!res.ok) { results[season] = `HTTP ${res.status}`; continue; }
      const csv = await res.text();
      const matches = parseCSV(csv);
      if (matches.length < 10) { results[season] = `Trop peu de matchs (${matches.length})`; continue; }

      const data = computeSeason(season, matches);
      await db.collection("historicalL1").doc(season).set(data);
      allFacts.push(...data.facts);
      results[season] = `OK — ${matches.length} matchs, champion: ${data.champion}`;
    } catch (e) {
      results[season] = `Erreur: ${String(e).slice(0, 80)}`;
    }
  }

  // Merge new facts into funFacts/all
  if (allFacts.length > 0) {
    const factsDoc = db.collection("funFacts").doc("all");
    const existing = await factsDoc.get();
    const prev: string[] = existing.exists ? (existing.data()?.facts ?? []) : [];
    const merged = [...new Set([...prev, ...allFacts])];
    await factsDoc.set({ facts: merged, updatedAt: new Date().toISOString() });
  }

  return NextResponse.json({ results, totalFacts: allFacts.length });
}
