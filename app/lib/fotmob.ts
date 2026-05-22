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

async function fetchFotMobLeague(url: string): Promise<FotMobLeagueData> {
  const html = await fetchPage(url);
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

/** Fetch Ligue 2 data from FotMob. Throws on failure. */
export function fetchFotMobLigue2(): Promise<FotMobLeagueData> {
  return fetchFotMobLeague("https://www.fotmob.com/leagues/110/table/ligue-2");
}

/** Fetch Ligue 1 data from FotMob. Throws on failure. */
export function fetchFotMobLigue1(): Promise<FotMobLeagueData> {
  return fetchFotMobLeague("https://www.fotmob.com/leagues/53/table/ligue-1");
}

// ── League matches (scheduled fixtures) ───────────────────────────────────────

export interface FmLeagueMatch {
  id: number;
  pageUrl: string;
  home: { id: number; name: string; shortName?: string; score?: number };
  away: { id: number; name: string; shortName?: string; score?: number };
  status: {
    utcTime: string;
    finished?: boolean;
    started?: boolean;
    cancelled?: boolean;
    scoreStr?: string;
    reason?: { short?: string; long?: string };
  };
  round?: string | number;
  roundName?: string;
  tournamentId?: number;
}

interface FmMatchesShape {
  props: {
    pageProps: {
      matches?: {
        data?: {
          allMatches?: FmLeagueMatch[];
          fixtures?: FmLeagueMatch[];
        };
        fixtures?: FmLeagueMatch[];
        allMatches?: FmLeagueMatch[];
      };
      overview?: {
        leagueOverviewMatches?: FmLeagueMatch[];
      };
      // Newer FotMob shapes nest the schedule inside the table block under
      // `matches.data.allMatches`. We try several paths and return the first
      // non-empty array we find — keeps this resilient to FotMob shipping
      // tiny shape tweaks every few weeks.
      [k: string]: unknown;
    };
  };
}

/** Extract a list of league matches from FotMob's __NEXT_DATA__. Looks at
 *  several known shapes (the FotMob frontend has shipped at least 3 in the
 *  last 12 months) and returns the first non-empty result.
 *
 *  Returns SCHEDULED + LIVE + FINISHED matches; callers filter by
 *  status.utcTime / status.finished as needed. */
async function fetchFotMobLeagueMatches(leagueId: number, slug: string): Promise<FmLeagueMatch[]> {
  const html = await fetchPage(`https://www.fotmob.com/leagues/${leagueId}/matches/${slug}`);
  const data = parseNextData(html) as unknown as FmMatchesShape | null;
  if (!data) return [];
  const pp = data.props.pageProps;
  const candidates: FmLeagueMatch[][] = [
    pp.matches?.data?.allMatches ?? [],
    pp.matches?.data?.fixtures ?? [],
    pp.matches?.allMatches ?? [],
    pp.matches?.fixtures ?? [],
    pp.overview?.leagueOverviewMatches ?? [],
  ];
  for (const arr of candidates) if (arr.length) return arr;
  return [];
}

/** Ligue 2 fixtures (all statuses). Slug must match FotMob's URL routing. */
export function fetchFotMobLigue2Matches(): Promise<FmLeagueMatch[]> {
  return fetchFotMobLeagueMatches(110, "ligue-2");
}

/** Ligue 1 fixtures (all statuses). */
export function fetchFotMobLigue1Matches(): Promise<FmLeagueMatch[]> {
  return fetchFotMobLeagueMatches(53, "ligue-1");
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

/** Fetch a single team's transfers page (much richer than the league-level
 *  transfers endpoint, which is capped at 100). Returns up to ~25 most recent
 *  transfers for the team. Throws on failure — caller should catch. */
export async function fetchFotMobTeamTransfers(teamId: number): Promise<FmTransfer[]> {
  const html = await fetchPage(`https://www.fotmob.com/teams/${teamId}/transfers`);
  const data = parseNextData(html);
  if (!data) return [];
  const fb = (data as unknown as {
    props: { pageProps: { fallback?: Record<string, unknown> } };
  }).props.pageProps.fallback;
  const teamBlob = fb?.[`team-${teamId}`] as
    | { transfers?: { allTransfers?: FmTransfer[] } }
    | undefined;
  return teamBlob?.transfers?.allTransfers ?? [];
}

/** Convert FotMob form list (newest-first) into the "W,D,L,..." comma string the UI expects (oldest-first). */
export function fotmobFormString(form: FmFormResult[] | undefined): string {
  if (!form || !form.length) return "";
  const letters = form.slice(0, 5).map((f) => (f.resultString || "").charAt(0).toUpperCase()).filter(Boolean);
  return letters.reverse().join(",");
}
