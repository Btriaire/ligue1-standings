import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { TEAM_TM_MAP, UNDERSTAT_TEAM_MAP } from "@/app/lib/teamMapping";
import { isL2 } from "@/app/lib/clubProfile";
import { getAdminFirestore } from "@/app/lib/firebase-admin";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

export const revalidate = 3600;

interface TmPlayer {
  id: string;
  name: string;
  position: string;
  dateOfBirth: string;
  age: number;
  nationality: string[];
  height: number;
  foot: string;
  joinedOn: string;
  signedFrom: string;
  contract: string;
  marketValue: number;
  status?: string;
  imageUrl?: string;
  // Understat season totals
  xG?: number;
  xA?: number;
  usGoals?: number;
  usAssists?: number;
  shots?: number;
  minutes?: number;
  games?: number;
  // Datamb per-90 stats
  dm_goals90?: number;
  dm_assists90?: number;
  dm_xg90?: number;
  dm_xa90?: number;
  dm_shots90?: number;
  dm_keyPasses90?: number;
  dm_dribbles90?: number;
  dm_dribblePct?: number;
  dm_defDuels90?: number;
  dm_defDuelPct?: number;
  dm_interceptions90?: number;
  dm_aerialPct?: number;
  dm_passPct?: number;
  dm_progressive90?: number;
  dm_savePct?: number;
  dm_gcPer90?: number;
  dm_cleanSheets?: number;
  dm_xgxa90?: number;
  dm_minPerMatch?: number;
  dm_team?: string;
  // Extra datamb stats
  dm_shotsOnTarget?: number;
  dm_goalConversion?: number;
  dm_touchesBox90?: number;
  dm_possWon90?: number;
  dm_npxg90?: number;
  dm_duelsWonPct?: number;
  dm_crosses90?: number;
  dm_crossAcc?: number;
  dm_fouls90?: number;
  dm_tackles90?: number;
  dm_yellowCards90?: number;
  dm_saves90?: number;
  dm_exits90?: number;
  // Full datamb — volume & context
  dm_minutes?: number;
  dm_matches?: number;
  dm_touches90?: number;
  dm_ga90?: number;
  dm_npga90?: number;
  dm_npGoals90?: number;
  dm_headedGoals90?: number;
  dm_xgShot?: number;
  dm_npxgShot?: number;
  dm_npxgXa90?: number;
  dm_goalsMinusXg90?: number;
  dm_possLost90?: number;
  dm_possBalance?: number;
  dm_progressiveActions90?: number;
  // Datamb — dribbles & duels offensifs
  dm_successfulDribbles90?: number;
  dm_offDuels90?: number;
  dm_offDuelPct?: number;
  dm_offDuelWon90?: number;
  dm_accelerations90?: number;
  dm_duels90?: number;
  // Datamb — passes détaillées
  dm_passes90?: number;
  dm_fwdPasses90?: number;
  dm_fwdPassPct?: number;
  dm_longPasses90?: number;
  dm_longPassAcc?: number;
  dm_avgPassLength?: number;
  dm_passesRec90?: number;
  dm_foulsSuffered90?: number;
  dm_shotAssists90?: number;
  dm_preAssists90?: number;
  dm_passesToFinal90?: number;
  dm_passFinalPct?: number;
  dm_passesToBox90?: number;
  dm_throughPasses90?: number;
  dm_throughPassPct?: number;
  dm_progressivePasses90?: number;
  dm_progressivePassAcc?: number;
  dm_deepCompletions90?: number;
  dm_xaPer100?: number;
  dm_chanceCreation?: number;
  dm_inaccuratePct?: number;
  // Datamb — défense
  dm_aerialDuels90?: number;
  dm_aerialWon90?: number;
  dm_shotsBlocked90?: number;
  dm_redCards90?: number;
  // Datamb — GK extra
  dm_gcTotal?: number;
  dm_xgConceded90?: number;
  dm_preventedGoals90?: number;
  dm_backPassesGK90?: number;
  dm_shotsConceded90?: number;
  // Datamb — finishing & penalties
  dm_goalsPerXg?: number;
  dm_shotsOnTarget90?: number;
  dm_penaltiesScored?: number;
  dm_penaltiesAttempted?: number;
  // Datamb — creation advanced
  dm_crossesToBox90?: number;
  dm_thirdAssists90?: number;
  dm_smartPasses90?: number;
  dm_smartPassAcc?: number;
  // Datamb — extra volume
  dm_duelsWon90?: number;
  dm_misplacedPasses90?: number;
}

interface UnderstatPlayer {
  id: string;
  player: string;
  games: string;
  time: string;
  goals: string;
  xG: string;
  assists: string;
  xA: string;
  shots: string;
  key_passes: string;
  yellow_cards: string;
  red_cards: string;
  position: string;
  npg: string;
  npxG: string;
}

async function fetchUnderstatPlayers(teamName: string): Promise<UnderstatPlayer[]> {
  const now = new Date();
  // Ligue 1 season starts in August; if we're before August use previous year
  const seasonYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  try {
    const html = await fetch(
      `https://understat.com/team/${teamName}/${seasonYear}`,
      {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FootPredictom/1.0)" },
      } as RequestInit
    ).then(r => r.ok ? r.text() : "");
    const m = html.match(/var playersData\s*=\s*JSON\.parse\('([^']+)'\)/);
    if (!m) return [];
    const decoded = m[1].replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    return JSON.parse(decoded) as UnderstatPlayer[];
  } catch {
    return [];
  }
}

// Datamb position file codes per our position names
// Available codes confirmed: GK, CB, FB, CM, FW, ST
const DATAMB_POS_FILES: Record<string, string[]> = {
  Goalkeeper:       ["GK"],
  Defender:         ["CB", "FB"],
  Midfielder:       ["CM"],
  Winger:           ["FW"],
  "Centre-Forward": ["ST"],
};

// Dynamically compute season string e.g. "TOP72526" for 2025/26
function datambVersionStr(): string {
  const now = new Date();
  const fullYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const start = String(fullYear % 100).padStart(2, "0"); // e.g. "25"
  const end   = String((fullYear + 1) % 100).padStart(2, "0"); // e.g. "26"
  return `TOP7${start}${end}`;
}

type DatambRow = Record<string, string | number | null>;

async function fetchDatambFile(posCode: string): Promise<DatambRow[]> {
  const ver = datambVersionStr();
  const url = `https://datamb.football/database/CURRENT/${ver}/${posCode}/${posCode}.xlsx`;
  try {
    const buf = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    } as RequestInit).then(r => r.ok ? r.arrayBuffer() : null);
    if (!buf) return [];
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<DatambRow>(ws, { defval: 0 });
  } catch {
    return [];
  }
}

function n(v: DatambRow[string]): number {
  return typeof v === "number" ? v : parseFloat(String(v ?? "0")) || 0;
}

function extractDatambStats(row: DatambRow): Partial<TmPlayer> {
  return {
    dm_goals90:        n(row["Goals per 90"]),
    dm_assists90:      n(row["Assists per 90"]),
    dm_xg90:           n(row["xG per 90"]),
    dm_xa90:           n(row["xA per 90"]),
    dm_shots90:        n(row["Shots per 90"]),
    dm_keyPasses90:    n(row["Key passes per 90"]),
    dm_dribbles90:     n(row["Dribbles attempted per 90"]),
    dm_dribblePct:     n(row["Dribble success rate %"]),
    dm_defDuels90:     n(row["Defensive duels per 90"]),
    dm_defDuelPct:     n(row["Defensive duels won %"]),
    dm_interceptions90:n(row["Interceptions per 90"]),
    dm_aerialPct:      n(row["Aerial duels won %"]),
    dm_passPct:        n(row["Pass completion %"]),
    dm_progressive90:  n(row["Progressive carries per 90"]),
    dm_savePct:        n(row["Save percentage %"]),
    dm_gcPer90:        n(row["Goals conceded per 90"]),
    dm_cleanSheets:    n(row["Clean sheets"]),
    dm_xgxa90:         n(row["xG+xA per 90"]),
    dm_minPerMatch:    n(row["Minutes per match"]),
    dm_team:           String(row["Team within selected timeframe"] ?? ""),
    dm_shotsOnTarget:  n(row["Shots on target %"]),
    dm_goalConversion: n(row["Goal conversion %"]),
    dm_touchesBox90:   n(row["Touches in box per 90"]),
    dm_possWon90:      n(row["Possessions won per 90"]),
    dm_npxg90:         n(row["npxG per 90"]),
    dm_duelsWonPct:    n(row["Duels won %"]),
    dm_crosses90:      n(row["Crosses per 90"]),
    dm_crossAcc:       n(row["Cross accuracy %"]),
    dm_fouls90:        n(row["Fouls per 90"]),
    dm_tackles90:      n(row["Sliding tackles per 90"]),
    dm_yellowCards90:  n(row["Yellow cards per 90"]),
    dm_saves90:        n(row["Saves per 90"]),
    dm_exits90:        n(row["Exits per 90"]),
    // Volume & context
    dm_minutes:              n(row["Minutes played"]),
    dm_matches:              n(row["Matches played"]),
    dm_touches90:            n(row["Touches per 90"]),
    dm_ga90:                 n(row["Goals + Assists per 90"]),
    dm_npga90:               n(row["NPG+A per 90"]),
    dm_npGoals90:            n(row["Non-penalty goals per 90"]),
    dm_headedGoals90:        n(row["Headed goals per 90"]),
    dm_xgShot:               n(row["xG/Shot"]),
    dm_npxgShot:             n(row["npxG/Shot"]),
    dm_npxgXa90:             n(row["npxG+xA per 90"]),
    dm_goalsMinusXg90:       n(row["Goals - xG per 90"]),
    dm_possLost90:           n(row["Possessions lost per 90"]),
    dm_possBalance:          n(row["Possession +/-"]),
    dm_progressiveActions90: n(row["Progressive actions per 90"]),
    // Dribbles & duels offensifs
    dm_successfulDribbles90: n(row["Successful dribbles per 90"]),
    dm_offDuels90:           n(row["Offensive duels per 90"]),
    dm_offDuelPct:           n(row["Offensive duels won %"]),
    dm_offDuelWon90:         n(row["Offensive duels won per 90"]),
    dm_accelerations90:      n(row["Accelerations per 90"]),
    dm_duels90:              n(row["Duels per 90"]),
    // Passes détaillées
    dm_passes90:             n(row["Passes per 90"]),
    dm_fwdPasses90:          n(row["Forward passes per 90"]),
    dm_fwdPassPct:           n(row["Forward pass completion %"]),
    dm_longPasses90:         n(row["Long passes per 90"]),
    dm_longPassAcc:          n(row["Long pass accuracy %"]),
    dm_avgPassLength:        n(row["Average pass length (m)"]),
    dm_passesRec90:          n(row["Passes received per 90"]),
    dm_foulsSuffered90:      n(row["Fouls suffered per 90"]),
    dm_shotAssists90:        n(row["Shot assists per 90"]),
    dm_preAssists90:         n(row["Pre-assists per 90"]),
    dm_passesToFinal90:      n(row["Passes to final third per 90"]),
    dm_passFinalPct:         n(row["Pass completion (to final third) %"]),
    dm_passesToBox90:        n(row["Passes to penalty box per 90"]),
    dm_throughPasses90:      n(row["Through passes per 90"]),
    dm_throughPassPct:       n(row["Through pass completion %"]),
    dm_progressivePasses90:  n(row["Progressive passes per 90"]),
    dm_progressivePassAcc:   n(row["Progressive pass accuracy %"]),
    dm_deepCompletions90:    n(row["Deep completions per 90"]),
    dm_xaPer100:             n(row["xA per 100 passes"]),
    dm_chanceCreation:       n(row["Chance creation ratio"]),
    dm_inaccuratePct:        n(row["Inaccurate passes, %"]),
    // Défense
    dm_aerialDuels90:        n(row["Aerial duels per 90"]),
    dm_aerialWon90:          n(row["Aerial duels won per 90"]),
    dm_shotsBlocked90:       n(row["Shots blocked per 90"]),
    dm_redCards90:           n(row["Red cards per 90"]),
    // GK extra
    dm_gcTotal:              n(row["Goals conceded"]),
    dm_xgConceded90:         n(row["xG conceded per 90"]),
    dm_preventedGoals90:     n(row["Prevented goals per 90"]),
    dm_backPassesGK90:       n(row["Back passes received as GK per 90"]),
    dm_shotsConceded90:      n(row["Shots conceded per 90"]),
    // Finishing & penalties
    dm_goalsPerXg:         n(row["Goals per xG"]),
    dm_shotsOnTarget90:    n(row["Shots on target per 90"]),
    dm_penaltiesScored:    n(row["Penalties scored"]),
    dm_penaltiesAttempted: n(row["Penalties taken"]),
    // Creation advanced
    dm_crossesToBox90:     n(row["Crosses to box per 90"]),
    dm_thirdAssists90:     n(row["Third assists per 90"]),
    dm_smartPasses90:      n(row["Smart passes per 90"]),
    dm_smartPassAcc:       n(row["Accurate smart passes, %"]),
    // Extra volume
    dm_duelsWon90:         n(row["Duels won per 90"]),
    dm_misplacedPasses90:  n(row["Misplaced passes per 90"]),
  };
}

interface FdGoal {
  scorer?: { id: number; name: string };
  assist?: { id: number; name: string };
  team?: { id: number };
}

interface FdMatch {
  goals?: FdGoal[];
  homeTeam?: { id: number };
  awayTeam?: { id: number };
}

function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s-]/g, "")
    .trim();
}

function playerNamesMatch(scorerName: string, playerName: string): boolean {
  const s = normalizeForMatch(scorerName);
  const p = normalizeForMatch(playerName);
  if (s === p) return true;
  const sWords = s.split(/\s+/);
  const pWords = p.split(/\s+/);
  const sLast = sWords[sWords.length - 1];
  const pLast = pWords[pWords.length - 1];
  if (sLast.length > 3 && sLast === pLast) return true;
  // First name initial + last name
  return sWords.some((sw) => sw.length > 3 && pWords.some((pw) => pw === sw));
}

/** Normalise any position string (TM, FD, Understat) to our 5 canonical values */
function normalisePosition(raw: string): string {
  const p = raw.toLowerCase().trim();
  if (/goalkeeper|portier|keeper/.test(p)) return "Goalkeeper";
  if (/centre.back|central.def|stopper|libero|sweeper|centreback|cb/.test(p)) return "Defender";
  if (/back|def|arriere|latéral|laterale/.test(p)) return "Defender";
  if (/winger|ailier|wing/.test(p)) return "Winger";
  if (/forward|attaquant|striker|centre.forward|second.striker|avant.centre|st\b/.test(p)) return "Centre-Forward";
  if (/midfield|milieu|playmaker|cm\b|dm\b|am\b/.test(p)) return "Midfielder";
  // Understat single-letter codes
  if (p === "f" || p === "fw" || p === "amf") return "Centre-Forward";
  if (p === "m") return "Midfielder";
  if (p === "d") return "Defender";
  if (p === "gk" || p === "g") return "Goalkeeper";
  return raw; // keep unknown as-is
}

const EMPTY_RESPONSE = (teamId: number) => NextResponse.json({
  team: { id: teamId, name: null, shortName: null, crest: null, venue: null, founded: null, coach: null },
  squad: [],
  stats: { totalValue: 0, avgValue: 0, playerCount: 0, injuredCount: 0, injuryRate: 0, injured: [], recentMatchCount: 0, teamWins: 0, teamDraws: 0, teamLosses: 0 },
});

// ─── SofaScore player shape (written by cron) ─────────────────────────────────
interface SofaPlayer {
  id: number; name: string; shortName: string; position: string;
  jerseyNumber: string; nationality: string; height: number | null;
  preferredFoot: string | null; dateOfBirth: number | null;
  marketValue: number | null; contractUntil: number | null;
  injured: boolean; injuryReason: string | null; injuryReturnTimestamp: number | null;
}
interface SofaMatch {
  id: number; tournament: string;
  homeTeam: string; homeTeamId: number;
  awayTeam: string; awayTeamId: number;
  homeScore: number | null; awayScore: number | null;
  startTimestamp: number; status: string;
}
interface SofaCache {
  players: SofaPlayer[]; lastMatches: SofaMatch[]; nextMatches: SofaMatch[];
  fetchedAt: number;
}

// L2 IDs live in `app/lib/clubProfile.ts` (single source of truth). We delegate
// L2 squads to the FotMob-backed route below because football-data and
// Transfermarkt don't cover Ligue 2 on our tier.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamId = parseInt(id);

  if (isL2(teamId)) {
    // Same-origin proxy — keeps callers using /api/squad/{id} uniformly.
    const origin = new URL(req.url).origin;
    const r = await fetch(`${origin}/api/squad-l2/${teamId}`, { next: { revalidate: 3600 } });
    return new NextResponse(await r.text(), {
      status: r.status,
      headers: { "content-type": r.headers.get("content-type") ?? "application/json" },
    });
  }

  const tmId = TEAM_TM_MAP[teamId];

  // Load SofaScore weekly cache from Firestore (non-blocking)
  let sofaCache: SofaCache | null = null;
  try {
    const db = getAdminFirestore();
    const doc = await db.collection("sofascore").doc(String(teamId)).get();
    if (doc.exists) sofaCache = doc.data() as SofaCache;
  } catch { /* Firestore unavailable — continue without */ }

  const [fdRes, matchesRes] = await Promise.all([
    fetch(`https://api.football-data.org/v4/teams/${teamId}`, {
      headers: { "X-Auth-Token": API_KEY! },
      next: { revalidate: 3600 },
    }).catch(() => null),
    fetch(`https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=5`, {
      headers: { "X-Auth-Token": API_KEY! },
      next: { revalidate: 3600 },
    }).catch(() => null),
  ]);

  const fdData = fdRes?.ok ? await fdRes.json() : {};

  // Extract scorer/assist contributions from last 5 matches
  const goalsByPlayer = new Map<string, number>();
  const assistsByPlayer = new Map<string, number>();
  let recentMatchCount = 0;
  let teamWins = 0, teamDraws = 0, teamLosses = 0;

  if (matchesRes?.ok) {
    try {
      const matchesData = await matchesRes.json();
      const matches: FdMatch[] = matchesData.matches ?? [];
      recentMatchCount = matches.length;

      for (const match of matches) {
        // Determine team result
        const isHome = match.homeTeam?.id === teamId;
        const isAway = match.awayTeam?.id === teamId;
        if (isHome || isAway) {
          // goals field might not exist in free tier, safe to skip
        }
        for (const goal of match.goals ?? []) {
          if (goal.team?.id !== teamId) continue;
          if (goal.scorer?.name) {
            const n = goal.scorer.name;
            goalsByPlayer.set(n, (goalsByPlayer.get(n) ?? 0) + 1);
          }
          if (goal.assist?.name) {
            const n = goal.assist.name;
            assistsByPlayer.set(n, (assistsByPlayer.get(n) ?? 0) + 1);
          }
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  // Get squad from Transfermarkt (with short timeout since API can be unreliable)
  let players: TmPlayer[] = [];
  if (tmId) {
    try {
      const tmRes = await fetch(`https://transfermarkt-api.fly.dev/clubs/${tmId}/players`, {
        signal: AbortSignal.timeout(5000),
      } as RequestInit);
      if (tmRes.ok) {
        const tmData = await tmRes.json();
        players = tmData.players ?? [];
      }
    } catch {
      // TM API unavailable — fall back to football-data.org squad below
    }
  }

  // Fallback: use football-data.org squad when TM is unavailable
  if (players.length === 0 && Array.isArray(fdData.squad) && fdData.squad.length > 0) {
    interface FdPlayer { id: number; name: string; position: string; dateOfBirth: string; nationality: string }
    const FD_POS: Record<string, string> = { Goalkeeper: "Goalkeeper", Defender: "Defender", Midfielder: "Midfielder", Attacker: "Centre-Forward", Winger: "Winger", "Centre-Forward": "Centre-Forward" };
    players = (fdData.squad as FdPlayer[]).map(p => ({
      id: String(p.id),
      name: p.name,
      position: FD_POS[p.position] ?? p.position,
      dateOfBirth: p.dateOfBirth?.slice(0, 10) ?? "",
      age: p.dateOfBirth ? Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000)) : 0,
      nationality: p.nationality ? [p.nationality] : [],
      height: 0, foot: "", joinedOn: "", signedFrom: "", contract: "", marketValue: 0,
    }));
  }

  // Normalise all positions to our 5 canonical values immediately after TM/FD load
  players = players.map(p => ({ ...p, position: normalisePosition(p.position) }));

  // Fetch Understat season stats for this team
  const understatName = UNDERSTAT_TEAM_MAP[teamId];
  const usPlayers = understatName ? await fetchUnderstatPlayers(understatName) : [];

  // Merge Understat stats into player list
  if (usPlayers.length > 0) {
    players = players.map(p => {
      const usp = usPlayers.find(u => playerNamesMatch(u.player, p.name));
      if (!usp) return p;
      return {
        ...p,
        xG: parseFloat(usp.xG) || 0,
        xA: parseFloat(usp.xA) || 0,
        usGoals: parseInt(usp.goals) || 0,
        usAssists: parseInt(usp.assists) || 0,
        shots: parseInt(usp.shots) || 0,
        minutes: parseInt(usp.time) || 0,
        games: parseInt(usp.games) || 0,
      };
    });
    // Also add players found on Understat but missing from our list (edge case)
    for (const usp of usPlayers) {
      if (!players.some(p => playerNamesMatch(usp.player, p.name))) {
        players.push({
          id: usp.id,
          name: usp.player,
          position: normalisePosition(usp.position?.split(", ")[0] ?? ""),
          dateOfBirth: "", age: 0, nationality: [],
          height: 0, foot: "", joinedOn: "", signedFrom: "", contract: "", marketValue: 0,
          xG: parseFloat(usp.xG) || 0,
          xA: parseFloat(usp.xA) || 0,
          usGoals: parseInt(usp.goals) || 0,
          usAssists: parseInt(usp.assists) || 0,
          shots: parseInt(usp.shots) || 0,
          minutes: parseInt(usp.time) || 0,
          games: parseInt(usp.games) || 0,
        });
      }
    }
  }

  // Fetch ALL Datamb position files (GK, CB, FB, CM, FW, ST) so every player gets
  // a chance to match regardless of position string normalisation differences.
  const ALL_DATAMB_FILES = ["GK", "CB", "FB", "CM", "FW", "ST"];
  const datambRows = (await Promise.all(ALL_DATAMB_FILES.map(fetchDatambFile))).flat();

  // Improved name matching: exact → last-name → any word overlap → partial substring
  function matchDatambRow(playerName: string): DatambRow | undefined {
    const norm = (s: string) => s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, " ").trim();

    const pn = norm(playerName);
    const pWords = pn.split(" ").filter(w => w.length > 2);
    const pLast = pWords[pWords.length - 1] ?? "";

    // 1. Exact
    let row = datambRows.find(r => norm(String(r["Player"] ?? "")) === pn);
    if (row) return row;
    // 2. Last-name exact
    if (pLast.length > 3) {
      row = datambRows.find(r => {
        const rn = norm(String(r["Player"] ?? ""));
        const rWords = rn.split(" ");
        return rWords[rWords.length - 1] === pLast;
      });
      if (row) return row;
    }
    // 3. Any significant word in common
    row = datambRows.find(r => {
      const rn = norm(String(r["Player"] ?? ""));
      const rWords = rn.split(" ").filter(w => w.length > 3);
      return pWords.some(pw => pw.length > 3 && rWords.some(rw => rw === pw));
    });
    if (row) return row;
    // 4. Substring of full name (handles "J. Doe" vs "John Doe")
    row = datambRows.find(r => {
      const rn = norm(String(r["Player"] ?? ""));
      return rn.includes(pLast) && pLast.length > 3;
    });
    return row;
  }

  if (datambRows.length > 0) {
    players = players.map(p => {
      const row = matchDatambRow(p.name);
      if (!row) return p;
      return { ...p, ...extractDatambStats(row) };
    });
  }

  const totalValue = players.reduce((sum, p) => sum + (p.marketValue ?? 0), 0);
  const avgValue = players.length > 0 ? totalValue / players.length : 0;
  const injured = players.filter((p) => p.status && p.status.toLowerCase().includes("injury"));
  const injuryRate = players.length > 0 ? injured.length / players.length : 0;

  const positionOrder: Record<string, number> = {
    Goalkeeper: 1, Defender: 2, Midfielder: 3, Winger: 4, "Centre-Forward": 5,
  };

  const enrichedPlayers = players.map((p) => {
    const isInjured = p.status?.toLowerCase().includes("injury") ?? false;

    let recentGoals = 0;
    let recentAssists = 0;
    for (const [scorerName, goals] of goalsByPlayer) {
      if (playerNamesMatch(scorerName, p.name)) { recentGoals += goals; break; }
    }
    for (const [assistName, assists] of assistsByPlayer) {
      if (playerNamesMatch(assistName, p.name)) { recentAssists += assists; break; }
    }

    // Form badge: prefer datamb xG/90 (per-90 rate) as primary signal
    const dmXg90 = p.dm_xg90 ?? 0;
    const dmXa90 = p.dm_xa90 ?? 0;
    const combined90 = dmXg90 + dmXa90;
    const usCombined = (p.usGoals ?? 0) + (p.usAssists ?? 0);

    let formBadge: "hot" | "good" | "neutral" | "cold";
    if (isInjured) {
      formBadge = "cold";
    } else if (combined90 >= 0.6 || usCombined >= 8 || recentGoals >= 2) {
      formBadge = "hot";
    } else if (combined90 >= 0.25 || usCombined >= 3 || recentGoals >= 1) {
      formBadge = "good";
    } else {
      formBadge = "neutral";
    }

    return { ...p, recentGoals, recentAssists, formBadge };
  });

  // ── Merge SofaScore data when available ──────────────────────────────────────
  const sofaByName = new Map<string, SofaPlayer>();
  if (sofaCache?.players) {
    for (const sp of sofaCache.players) {
      sofaByName.set(sp.name.toLowerCase(), sp);
      if (sp.shortName) sofaByName.set(sp.shortName.toLowerCase(), sp);
    }
  }

  const finalPlayers = enrichedPlayers.map(p => {
    const key = p.name.toLowerCase();
    const sofa = sofaByName.get(key)
      ?? sofaByName.get(p.name.split(" ").pop()!.toLowerCase())
      ?? null;
    if (!sofa) return p;

    // Prefer SofaScore market value (more up-to-date) if available
    const marketValue = sofa.marketValue ?? p.marketValue;
    // SofaScore injury is authoritative
    const sofaInjured = sofa.injured;
    const sofaInjuryReason = sofa.injuryReason ?? null;
    const sofaInjuryReturn = sofa.injuryReturnTimestamp
      ? new Date(sofa.injuryReturnTimestamp * 1000).toISOString().slice(0, 10)
      : null;
    // Update status string so isUnavailable() works app-wide
    const status = sofaInjured
      ? `injury${sofaInjuryReason ? ` — ${sofaInjuryReason}` : ""}`
      : (p.status ?? undefined);
    const formBadge = sofaInjured ? "cold" as const : p.formBadge;

    return {
      ...p,
      marketValue,
      status,
      formBadge,
      sofaId: sofa.id,
      sofaJerseyNumber: sofa.jerseyNumber,
      sofaInjured,
      sofaInjuryReason,
      sofaInjuryReturn,
      sofaPreferredFoot: sofa.preferredFoot,
      sofaHeight: sofa.height,
      sofaContractUntil: sofa.contractUntil
        ? new Date(sofa.contractUntil * 1000).toISOString().slice(0, 4)
        : null,
    };
  });

  const sortedPlayers = [...finalPlayers].sort(
    (a, b) => (positionOrder[a.position] ?? 6) - (positionOrder[b.position] ?? 6)
  );

  // Recalculate injured count using merged data
  const injuredFinal = sortedPlayers.filter(p =>
    p.status && /injur|suspen|bless/i.test(p.status)
  );

  return NextResponse.json({
    team: {
      id: teamId,
      name: fdData.name,
      shortName: fdData.shortName,
      crest: fdData.crest,
      venue: fdData.venue,
      founded: fdData.founded,
      coach: fdData.coach?.name ?? null,
    },
    squad: sortedPlayers,
    stats: {
      totalValue,
      avgValue: Math.round(avgValue),
      playerCount: players.length,
      injuredCount: injuredFinal.length,
      injuryRate: Math.round((injuredFinal.length / Math.max(players.length, 1)) * 100),
      injured: injuredFinal.map(p => ({ name: p.name, status: p.status })),
      recentMatchCount,
      teamWins,
      teamDraws,
      teamLosses,
    },
    // SofaScore extras — available to any page that uses this API
    sofaNextMatches: sofaCache?.nextMatches ?? [],
    sofaLastMatches: sofaCache?.lastMatches ?? [],
    sofaFetchedAt: sofaCache?.fetchedAt ?? null,
  });
}
