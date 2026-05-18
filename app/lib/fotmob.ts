// FotMob scraper for Ligue 2 (league id 110)
// Source: https://www.fotmob.com/leagues/110/table/ligue-2
// Strategy: fetch the SSR'd page and parse the embedded __NEXT_DATA__ blob.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const HEADERS: Record<string, string> = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
};

// ── Types (subset of what we use) ────────────────────────────────────────────

export interface FmTableEntry {
  id: number;            // FotMob team id
  name: string;
  shortName: string;
  pageUrl: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scoresStr: string;     // "60-33"
  goalConDiff: number;   // GD
  pts: number;
  idx: number;           // 1-based rank
  qualColor: string | null;
}

export interface FmFormResult {
  result: number;
  resultString: "W" | "D" | "L" | string;
}

export interface FmTransfer {
  name: string;
  playerId: number;
  position: { label: string; key: string };
  transferDate: string;
  fromClub: string;
  fromClubFullName?: string;
  fromClubId: number;
  toClub: string;
  toClubFullName?: string;
  toClubId: number;
  fee: string | null;
  transferType: { text: string };
  contractExtension: boolean;
  onLoan: boolean;
  marketValue: number | null;
}

export interface FmTopPlayer {
  id: number;
  name: string;
  teamId: number;
  teamName: string;
  value: number | string;
  rank?: number;
}

export interface FotMobLeagueData {
  table: FmTableEntry[];
  teamForm: Record<string, FmFormResult[]>;
  transfers: FmTransfer[];
  topByRating: FmTopPlayer[];
  topByGoals: FmTopPlayer[];
  topByAssists: FmTopPlayer[];
  updatedAt: string;
}

// ── Fetch + parse ────────────────────────────────────────────────────────────

interface NextDataShape {
  props: {
    pageProps: {
      table?: Array<{
        data?: { table?: { all?: FmTableEntry[] } };
        teamForm?: Record<string, FmFormResult[]>;
      }>;
      transfers?: { data?: FmTransfer[] };
      overview?: {
        topPlayers?: {
          byRating?: { players?: RawTopPlayer[] };
          byGoals?: { players?: RawTopPlayer[] };
          byAssists?: { players?: RawTopPlayer[] };
        };
      };
    };
  };
}

interface RawTopPlayer {
  id: number;
  name: string;
  teamId: number;
  teamName: string;
  value: number | string;
}

function parseNextData(html: string): NextDataShape | null {
  const m = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/
  );
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as NextDataShape;
  } catch {
    return null;
  }
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 1800 },
  } as RequestInit);
  if (!res.ok) throw new Error(`FotMob ${url} → ${res.status}`);
  return res.text();
}

function normalizeTopPlayers(raw: RawTopPlayer[] | undefined): FmTopPlayer[] {
  if (!raw) return [];
  return raw.map((p, i) => ({
    id: p.id,
    name: p.name,
    teamId: p.teamId,
    teamName: p.teamName,
    value: p.value,
    rank: i + 1,
  }));
}

/** Fetch Ligue 2 data from FotMob. Throws on failure. */
export async function fetchFotMobLigue2(): Promise<FotMobLeagueData> {
  const html = await fetchPage("https://www.fotmob.com/leagues/110/table/ligue-2");
  const data = parseNextData(html);
  if (!data) throw new Error("FotMob: __NEXT_DATA__ not found");

  const pp = data.props.pageProps;
  const tableBlock = pp.table?.[0];
  const all = tableBlock?.data?.table?.all ?? [];
  const teamForm = tableBlock?.teamForm ?? {};
  const transfers = pp.transfers?.data ?? [];
  const top = pp.overview?.topPlayers ?? {};

  return {
    table: all,
    teamForm,
    transfers,
    topByRating: normalizeTopPlayers(top.byRating?.players),
    topByGoals: normalizeTopPlayers(top.byGoals?.players),
    topByAssists: normalizeTopPlayers(top.byAssists?.players),
    updatedAt: new Date().toISOString(),
  };
}

/** FotMob team logo URL by team id.
 * Note: the "_medium" variant returns 403 on the public CDN. Only the
 * size-less `{id}.png` (full size) and `_xsmall` variants are reliably public. */
export function fotmobCrest(teamId: number, size: "xsmall" | "full" = "full"): string {
  const suffix = size === "xsmall" ? "_xsmall" : "";
  return `https://images.fotmob.com/image_resources/logo/teamlogo/${teamId}${suffix}.png`;
}

// ── Team page (squad + fixtures) ─────────────────────────────────────────────

export interface FmSquadMember {
  id: number;
  name: string;
  shirtNumber?: number;
  ccode?: string;
  cname?: string;
  role?: { key: string; fallback: string };
  positionId?: number;
  positionIdsDesc?: string; // "GK", "CB", "AM" …
  injury?: { type?: string } | null;
  rating?: number;
  goals?: number;
  assists?: number;
  penalties?: number;
  rcards?: number;
  ycards?: number;
  height?: number | null;
  age?: number | null;
  dateOfBirth?: string;
  transferValue?: number;
}

export interface FmSquadSection {
  title: string; // "coach" | "keepers" | "defenders" | "midfielders" | "attackers"
  members: FmSquadMember[];
}

export interface FmFixture {
  id: number;
  pageUrl: string;
  opponent: { id: number; name: string; score: number };
  home: { id: number; name: string; score: number };
  away: { id: number; name: string; score: number };
  result: -1 | 0 | 1 | number; // -1 loss, 0 draw, 1 win
  notStarted: boolean;
  tournament: { name: string; stage: string; leagueId: number };
  status: {
    utcTime: string;
    finished: boolean;
    started: boolean;
    cancelled: boolean;
    scoreStr: string;
    reason?: { short: string; long: string };
  };
}

export interface FmTeamData {
  id: number;
  name: string;
  shortName: string;
  squad: FmSquadSection[];
  fixtures: FmFixture[];
  lastMatch?: FmFixture;
  nextMatch?: FmFixture;
}

/** Fetch a team's full page (squad + fixtures) from FotMob.
 *  Slug doesn't matter — FotMob redirects by id. */
export async function fetchFotMobTeam(teamId: number): Promise<FmTeamData> {
  const html = await fetchPage(`https://www.fotmob.com/teams/${teamId}/squad/team`);
  const data = parseNextData(html);
  if (!data) throw new Error("FotMob: __NEXT_DATA__ not found");

  // The team page wraps everything under fallback["team-<id>"].
  const fb = (data as unknown as {
    props: { pageProps: { fallback?: Record<string, unknown> } };
  }).props.pageProps.fallback;
  if (!fb) throw new Error(`FotMob: no fallback in team-${teamId}`);

  const teamBlob = fb[`team-${teamId}`] as
    | {
        details?: { id: number; name: string; shortName: string };
        squad?: { squad?: FmSquadSection[] };
        fixtures?: {
          allFixtures?: {
            fixtures?: FmFixture[];
            lastMatch?: FmFixture;
            nextMatch?: FmFixture;
          };
        };
      }
    | undefined;
  if (!teamBlob) throw new Error(`FotMob: team-${teamId} missing from fallback`);

  const details = teamBlob.details ?? { id: teamId, name: "", shortName: "" };
  const squad = teamBlob.squad?.squad ?? [];
  const all = teamBlob.fixtures?.allFixtures;
  return {
    id: details.id,
    name: details.name,
    shortName: details.shortName,
    squad,
    fixtures: all?.fixtures ?? [],
    lastMatch: all?.lastMatch,
    nextMatch: all?.nextMatch,
  };
}

/** Convert FotMob form list (newest-first) into the "W,D,L,..." comma string the UI expects (oldest-first). */
export function fotmobFormString(form: FmFormResult[] | undefined): string {
  if (!form || !form.length) return "";
  const letters = form.slice(0, 5).map((f) => (f.resultString || "").charAt(0).toUpperCase()).filter(Boolean);
  return letters.reverse().join(",");
}
