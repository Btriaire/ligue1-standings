"use client";

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MagnifyingGlass, X, ArrowLeft, Users,
  FunnelSimple, TrendUp, Trophy, CaretDown, CaretUp,
} from "@phosphor-icons/react";
import {
  PlayerEntry, PlayerRow, PlayerPhoto, PlayerDetail,
  POS_ORDER, POS_FR, POS_COL, CLUB_SHORT,
  fv, normalize,
} from "../components/PlayerCard";

// ── Static maps ───────────────────────────────────────────────────────────────

const TEAM_IDS_L1 = [524, 548, 523, 521, 529, 516, 576, 525, 511, 1045, 512, 532, 533, 522, 519, 543, 545, 546];

type LeagueKey = "FL1" | "FL2";
type LeagueFilter = "ALL" | LeagueKey;

const LEAGUE_BADGE: Record<LeagueKey, { label: string; color: string; bg: string }> = {
  FL1: { label: "L1", color: "#00d4ff", bg: "rgba(0,212,255,0.10)" },
  FL2: { label: "L2", color: "#a78bfa", bg: "rgba(167,139,250,0.10)" },
};

const SORT_OPTIONS: { key: string; label: string }[] = [
  { key: "dm_xgxa90",      label: "xG+xA/90" },
  { key: "dm_xg90",        label: "xG/90" },
  { key: "dm_xa90",        label: "xA/90" },
  { key: "dm_npxg90",      label: "npxG/90" },
  { key: "usGoals",        label: "Buts saison" },
  { key: "usAssists",      label: "Passes D." },
  { key: "xG",             label: "xG saison" },
  { key: "dm_passPct",     label: "Pass %" },
  { key: "dm_dribblePct",  label: "Dribbles %" },
  { key: "dm_defDuelPct",  label: "Duel déf. %" },
  { key: "dm_interceptions90", label: "Int./90" },
  { key: "dm_possWon90",   label: "Poss. gagnées/90" },
  { key: "dm_touchesBox90",label: "Touches zone/90" },
  { key: "dm_savePct",     label: "Arrêts % (GK)" },
  { key: "dm_goalsPerXg",    label: "Buts/xG (finition)" },
  { key: "dm_shotsOnTarget90", label: "Tirs cadrés/90" },
  { key: "dm_crossesToBox90",  label: "Crosses box/90" },
  { key: "dm_smartPasses90",   label: "Passes smart/90" },
  { key: "dm_thirdAssists90",  label: "3e PD/90" },
  { key: "minutes",        label: "Minutes" },
  { key: "marketValue",    label: "Valeur" },
  { key: "age",            label: "Âge" },
];

// Curated leaderboard metrics — picked to be meaningful across both leagues
// (or clearly tagged as a single-league signal). The `available` field drives
// the league chips inside the leaderboard panel: when the user picks a
// metric only one league exposes (e.g. xG+xA/90 is Datamb/L1-only), the
// other chip is disabled with a "(n/a)" hint.
interface LeaderboardMetric {
  key: keyof PlayerEntry | "rating";
  label: string;
  short: string;
  color: string;
  format: (v: number) => string;
  available: LeagueKey[];
  hint?: string;
}

const LEADERBOARD_METRICS: LeaderboardMetric[] = [
  { key: "usGoals",     label: "Top buteurs",   short: "buts",  color: "#f59e0b", format: v => `${Math.round(v)}`,    available: ["FL1", "FL2"] },
  { key: "usAssists",   label: "Top passeurs",  short: "PD",    color: "#a78bfa", format: v => `${Math.round(v)}`,    available: ["FL1", "FL2"] },
  { key: "dm_xgxa90",   label: "xG+xA / 90",    short: "/90",   color: "#22c55e", format: v => v.toFixed(2),          available: ["FL1"], hint: "Datamb — Ligue 1" },
  { key: "rating",      label: "Notation",      short: "note",  color: "#00d4ff", format: v => v.toFixed(2),          available: ["FL2"], hint: "FotMob — Ligue 2" },
  { key: "marketValue", label: "Valeur marché", short: "€",     color: "#ec4899", format: v => fv(v),                 available: ["FL1", "FL2"] },
];

const RANK_STYLE: Record<number, { color: string; bg: string }> = {
  1: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  2: { color: "#cbd5e1", bg: "rgba(203,213,225,0.10)" },
  3: { color: "#fb923c", bg: "rgba(251,146,60,0.10)" },
};

// ── ClubSection ───────────────────────────────────────────────────────────────

function ClubSection({ clubId, players, sortKey, expandedId, onToggle, leagueBadge }: {
  clubId: number;
  players: PlayerEntry[];
  sortKey: string;
  expandedId: string | null;
  onToggle: (uid: string) => void;
  leagueBadge?: LeagueKey;
}) {
  const [open, setOpen] = useState(false);
  const club = players[0]?.club;

  const topScorer = players.reduce<PlayerEntry | null>((best, p) =>
    (p.usGoals ?? 0) > (best?.usGoals ?? 0) ? p : best, null);
  const totalValue = players.reduce((s, p) => s + (p.marketValue ?? 0), 0);
  const injured = players.filter(p => p.status?.toLowerCase().includes("injury")).length;
  const avgXg = players.filter(p => (p.dm_xg90 ?? 0) > 0).reduce((s, p, _, a) => s + (p.dm_xg90 ?? 0) / a.length, 0);

  const byPos = POS_ORDER.reduce<Record<string, PlayerEntry[]>>((acc, pos) => {
    const sorted = players
      .filter(p => p.position === pos)
      .sort((a, b) => {
        const av = ((a as unknown as Record<string, unknown>)[sortKey] as number) ?? 0;
        const bv = ((b as unknown as Record<string, unknown>)[sortKey] as number) ?? 0;
        return bv - av;
      });
    if (sorted.length) acc[pos] = sorted;
    return acc;
  }, {});

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42", background: "#0d1421" }}>
      {/* Club header — always visible */}
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left">
        {club?.crest
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={club.crest} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
          : <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: "#1e2d42" }} />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-black truncate" style={{ color: "#e8edf5" }}>
              {club?.name ?? CLUB_SHORT[clubId]}
            </p>
            {leagueBadge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ color: LEAGUE_BADGE[leagueBadge].color, background: LEAGUE_BADGE[leagueBadge].bg }}>
                {LEAGUE_BADGE[leagueBadge].label}
              </span>
            )}
          </div>
          <p className="text-[10px]" style={{ color: "#6b7c96" }}>
            {players.length} joueurs
            {injured > 0 && <span className="ml-2 text-orange-400">⚠ {injured} blessé{injured > 1 ? "s" : ""}</span>}
          </p>
        </div>
        {/* Summary stats */}
        <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono flex-shrink-0">
          {totalValue > 0 && (
            <span style={{ color: "#00d4ff" }}>{fv(totalValue)}</span>
          )}
          {avgXg > 0 && (
            <span style={{ color: "#22c55e" }}>xG/90 {avgXg.toFixed(2)}</span>
          )}
          {topScorer && (topScorer.usGoals ?? 0) > 0 && (
            <span style={{ color: "#f59e0b" }}>⚽ {topScorer.usGoals} {topScorer.name.split(" ").pop()}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <TrendUp size={11} style={{ color: "#4b5a72" }} />
          <span className="text-[10px]" style={{ color: "#4b5a72" }}>{open ? "−" : "+"}</span>
        </div>
      </button>

      {/* Expanded player list */}
      {open && (
        <div className="border-t px-3 pb-3" style={{ borderColor: "#1e2d42" }}>
          {POS_ORDER.filter(pos => byPos[pos]).map(pos => (
            <div key={pos} className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"
                style={{ color: POS_COL[pos] ?? "#6b7c96" }}>
                <span className="w-1 h-3 rounded-full inline-block" style={{ background: POS_COL[pos] }} />
                {POS_FR[pos]} · {byPos[pos].length}
              </p>
              {byPos[pos].map((p) => {
                const uid = `${p.clubId}-${p.id}`;
                return (
                  <PlayerRow key={uid} p={p}
                    expanded={expandedId === uid}
                    onToggle={() => onToggle(uid)} />
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Squad aggregator (shared by L1 and L2) ────────────────────────────────────
//
// Fans out to `${endpoint}/${id}` for each team ID with bounded concurrency
// and retry-on-empty/429/5xx. Calls `onPlayers` whenever a club resolves with
// at least one player, and `onProgress` after every terminal outcome (ok or
// failed-after-retries). Returns a cancel handle so the page can abort if
// the user navigates away mid-flight.
function runSquadAggregator({
  ids, endpoint, concurrency,
  onPlayers, onProgress,
}: {
  ids: number[];
  endpoint: string;
  concurrency: number;
  onPlayers: (clubId: number, players: PlayerEntry[]) => void;
  onProgress: (done: number, total: number) => void;
}): () => void {
  let cancelled = false;
  const MAX_ATTEMPTS = 3;
  const wait = (ms: number) => new Promise(res => setTimeout(res, ms));
  type QItem = { id: number; attempt: number };
  const queue: QItem[] = ids.map(id => ({ id, attempt: 0 }));
  const ok = new Set<number>();
  const failed = new Set<number>();

  const updateProgress = () => {
    if (cancelled) return;
    onProgress(ok.size + failed.size, ids.length);
  };

  const fetchOne = async ({ id, attempt }: QItem) => {
    try {
      const r = await fetch(`${endpoint}/${id}`);
      if (!r.ok) {
        if ((r.status === 429 || r.status >= 500) && attempt + 1 < MAX_ATTEMPTS) {
          await wait(1500 * (attempt + 1) + Math.random() * 800);
          if (!cancelled) queue.push({ id, attempt: attempt + 1 });
          return;
        }
        console.warn(`[players] squad ${id} HTTP ${r.status} (attempt ${attempt + 1})`);
        failed.add(id); updateProgress(); return;
      }
      const data = await r.json();
      if (cancelled) return;
      const players: PlayerEntry[] = (data?.squad ?? []).map(
        (p: Omit<PlayerEntry, "clubId" | "club">) => ({ ...p, clubId: id, club: data.team })
      );
      if (players.length > 0) {
        onPlayers(id, players);
        ok.add(id); updateProgress();
      } else if (attempt + 1 < MAX_ATTEMPTS) {
        await wait(1200 * (attempt + 1) + Math.random() * 500);
        if (!cancelled) queue.push({ id, attempt: attempt + 1 });
      } else {
        console.warn(`[players] squad ${id} empty after ${MAX_ATTEMPTS} attempts`);
        failed.add(id); updateProgress();
      }
    } catch (err) {
      if (attempt + 1 < MAX_ATTEMPTS) {
        await wait(1500 * (attempt + 1));
        if (!cancelled) queue.push({ id, attempt: attempt + 1 });
        return;
      }
      console.warn(`[players] squad ${id} fetch failed:`, err);
      failed.add(id); updateProgress();
    }
  };

  const worker = async () => {
    while (!cancelled) {
      const item = queue.shift();
      if (!item) {
        await wait(300);
        if (queue.length === 0) return;
      } else {
        await fetchOne(item);
      }
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());
  Promise.all(workers);

  return () => { cancelled = true; };
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlayersPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0f1c" }} />}>
      <PlayersPageInner />
    </Suspense>
  );
}

function PlayersPageInner() {
  const searchParams = useSearchParams();

  // Initial filter from URL: `?league=FL1`/`FL2` pre-selects that pill (old
  // deep links still work); anything else (or absent) defaults to "Toutes".
  const [leagueFilter, setLeagueFilter] = useState<LeagueFilter>(() => {
    const p = searchParams.get("league")?.toUpperCase();
    return p === "FL1" ? "FL1" : p === "FL2" ? "FL2" : "ALL";
  });
  const showL1 = leagueFilter !== "FL2";
  const showL2 = leagueFilter !== "FL1";

  // Per-league player pools — each loads lazily on first activation and is
  // cached for the lifetime of the page.
  const [l1Players, setL1Players] = useState<PlayerEntry[]>([]);
  const [l1Loading, setL1Loading] = useState(false);
  const l1Started = useRef(false);
  const [l1Done, setL1Done] = useState(0);

  const [l2TeamIds, setL2TeamIds] = useState<number[]>([]);
  const [l2Labels, setL2Labels] = useState<Record<number, string>>({});
  const [l2Players, setL2Players] = useState<PlayerEntry[]>([]);
  const [l2Loading, setL2Loading] = useState(false);
  const l2Started = useRef(false);
  const [l2Done, setL2Done] = useState(0);

  const [search, setSearch] = useState("");
  const [filterClub, setFilterClub] = useState<number | "">("");
  const [filterPos, setFilterPos] = useState("");
  const [filterMinMin, setFilterMinMin] = useState(0);
  const [sortKey, setSortKey] = useState("dm_xgxa90");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // League filter switch — also reflects to the URL so deep links survive
  // a reload. Uses replaceState to avoid pushing a history entry on every
  // pill click.
  const onLeagueFilterChange = useCallback((v: LeagueFilter) => {
    setLeagueFilter(v);
    setFilterClub("");
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (v === "ALL") url.searchParams.delete("league");
    else url.searchParams.set("league", v);
    window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
  }, []);

  // ── L1 loader ──
  useEffect(() => {
    if (!showL1 || l1Started.current) return;
    l1Started.current = true;
    setL1Loading(true);
    const cancel = runSquadAggregator({
      ids: TEAM_IDS_L1,
      endpoint: "/api/squad",
      concurrency: 2,
      onPlayers: (_id, players) => setL1Players(prev => [...prev, ...players]),
      onProgress: (done, total) => {
        setL1Done(done);
        if (done === total) setL1Loading(false);
      },
    });
    return cancel;
  }, [showL1]);

  // ── L2 loader ──
  useEffect(() => {
    if (!showL2 || l2Started.current) return;
    l2Started.current = true;
    setL2Loading(true);
    let cancelled = false;
    let cancelAggregator: (() => void) | null = null;

    // 1) Fetch L2 standings → ids + labels
    fetch("/api/standings?competition=FL2")
      .then(r => r.json())
      .then((d: { standings?: Array<{ team: { id: number; shortName: string; name: string } }> }) => {
        if (cancelled) return;
        const rows = d.standings ?? [];
        const ids = rows.map(s => s.team.id);
        const labels: Record<number, string> = {};
        rows.forEach(s => { labels[s.team.id] = s.team.shortName || s.team.name; });
        setL2TeamIds(ids);
        setL2Labels(labels);
        if (ids.length === 0) { setL2Loading(false); return; }

        // 2) Aggregate per-club rosters via /api/squad-l2/{id}
        cancelAggregator = runSquadAggregator({
          ids, endpoint: "/api/squad-l2", concurrency: 4,
          onPlayers: (_id, players) => setL2Players(prev => [...prev, ...players]),
          onProgress: (done, total) => {
            setL2Done(done);
            if (done === total) setL2Loading(false);
          },
        });
      })
      .catch(() => { if (!cancelled) setL2Loading(false); });

    return () => { cancelled = true; cancelAggregator?.(); };
  }, [showL2]);

  // ── Derived ──
  const clubShort: Record<number, string> = useMemo(
    () => ({ ...CLUB_SHORT, ...l2Labels }),
    [l2Labels]
  );

  const clubLeague: Map<number, LeagueKey> = useMemo(() => {
    const m = new Map<number, LeagueKey>();
    TEAM_IDS_L1.forEach(id => m.set(id, "FL1"));
    l2TeamIds.forEach(id => m.set(id, "FL2"));
    return m;
  }, [l2TeamIds]);

  const allPlayers = useMemo(() => {
    const out: PlayerEntry[] = [];
    if (showL1) out.push(...l1Players);
    if (showL2) out.push(...l2Players);
    return out;
  }, [showL1, showL2, l1Players, l2Players]);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    let list = allPlayers.filter(p => {
      if (q && !normalize(p.name).includes(q) &&
          !normalize(p.club.name ?? "").includes(q) &&
          !normalize(p.club.shortName ?? "").includes(q) &&
          !normalize(clubShort[p.clubId] ?? "").includes(q) &&
          !normalize(p.nationality?.[0] ?? "").includes(q)) return false;
      if (filterClub !== "" && p.clubId !== filterClub) return false;
      if (filterPos && p.position !== filterPos) return false;
      if (filterMinMin > 0 && (p.minutes ?? 0) < filterMinMin) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "age")  return (a.age || 99) - (b.age || 99);
      const av = ((a as unknown as Record<string, unknown>)[sortKey] as number) ?? 0;
      const bv = ((b as unknown as Record<string, unknown>)[sortKey] as number) ?? 0;
      return bv - av;
    });
    return list;
  }, [allPlayers, search, filterClub, filterPos, filterMinMin, sortKey, clubShort]);

  const isFiltered = !!(search.trim() || filterClub !== "" || filterPos || filterMinMin > 0);

  // Two ordered club groups — one per visible league — so we can render them
  // under their own headers without re-sorting client IDs at render time.
  const l1ByClub = useMemo(() =>
    showL1
      ? TEAM_IDS_L1
          .map(id => ({ id, players: filtered.filter(p => p.clubId === id) }))
          .filter(g => g.players.length > 0)
      : [],
    [filtered, showL1]
  );
  const l2ByClub = useMemo(() =>
    showL2
      ? l2TeamIds
          .map(id => ({ id, players: filtered.filter(p => p.clubId === id) }))
          .filter(g => g.players.length > 0)
      : [],
    [filtered, showL2, l2TeamIds]
  );

  const toggle = useCallback((uid: string) => {
    setExpandedId(prev => prev === uid ? null : uid);
  }, []);

  // Header counters
  const loading = (showL1 && l1Loading) || (showL2 && l2Loading);
  const clubsTotal = (showL1 ? TEAM_IDS_L1.length : 0) + (showL2 ? l2TeamIds.length : 0);
  const clubsDone = (showL1 ? l1Done : 0) + (showL2 ? l2Done : 0);

  // Club filter dropdown — list of currently visible clubs only.
  const filterClubOptions = useMemo(() => {
    const opts: { id: number; label: string; league: LeagueKey }[] = [];
    if (showL1) TEAM_IDS_L1.forEach(id => opts.push({ id, label: clubShort[id] ?? `#${id}`, league: "FL1" }));
    if (showL2) l2TeamIds.forEach(id => opts.push({ id, label: clubShort[id] ?? `#${id}`, league: "FL2" }));
    return opts;
  }, [showL1, showL2, l2TeamIds, clubShort]);

  return (
    <main className="min-h-screen" style={{ background: "#080c14" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b"
        style={{ borderColor: "#1e2d42", background: "rgba(8,12,20,0.95)" }}>
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-xs hover:opacity-70 flex-shrink-0"
            style={{ color: "#6b7c96" }}>
            <ArrowLeft size={14} /> Accueil
          </Link>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Users size={14} style={{ color: "#00d4ff", flexShrink: 0 }} />
            <span className="font-black text-sm" style={{ color: "#e8edf5" }}>Joueurs</span>
            <span className="text-xs truncate" style={{ color: "#6b7c96" }}>
              {loading ? `Chargement… (${clubsDone}/${clubsTotal})` : `${filtered.length} / ${allPlayers.length} joueurs`}
            </span>
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg flex-shrink-0"
            style={{ background: showFilters ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: showFilters ? "#00d4ff" : "#6b7c96" }}>
            <FunnelSimple size={11} /> Filtres
          </button>
        </div>

        {/* League pill switcher */}
        <div className="max-w-5xl mx-auto px-4 pb-2">
          <div className="inline-flex rounded-xl p-0.5 gap-0.5"
            style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
            {([
              { key: "ALL", label: "Toutes" },
              { key: "FL1", label: "Ligue 1" },
              { key: "FL2", label: "Ligue 2" },
            ] as const).map(opt => {
              const active = leagueFilter === opt.key;
              return (
                <button key={opt.key}
                  onClick={() => onLeagueFilterChange(opt.key)}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold transition-colors"
                  style={{
                    background: active ? "rgba(0,212,255,0.12)" : "transparent",
                    color: active ? "#00d4ff" : "#6b7c96",
                  }}>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 pb-2.5">
          <div className="relative">
            <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7c96" }} />
            <input type="text" placeholder="Rechercher joueur, club, nationalité…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#e8edf5" }} />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={13} style={{ color: "#6b7c96" }} />
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="max-w-5xl mx-auto px-4 pb-3 flex flex-wrap gap-2">
            <select value={filterClub} onChange={e => setFilterClub(e.target.value === "" ? "" : parseInt(e.target.value))}
              className="text-xs px-2.5 py-1.5 rounded-lg outline-none"
              style={{ background: "#0d1421", border: "1px solid #1e2d42", color: "#e8edf5" }}>
              <option value="">Tous les clubs</option>
              {leagueFilter === "ALL" ? (
                <>
                  <optgroup label="Ligue 1">
                    {filterClubOptions.filter(o => o.league === "FL1").map(o =>
                      <option key={o.id} value={o.id}>{o.label}</option>)}
                  </optgroup>
                  <optgroup label="Ligue 2">
                    {filterClubOptions.filter(o => o.league === "FL2").map(o =>
                      <option key={o.id} value={o.id}>{o.label}</option>)}
                  </optgroup>
                </>
              ) : (
                filterClubOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)
              )}
            </select>
            <select value={filterPos} onChange={e => setFilterPos(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg outline-none"
              style={{ background: "#0d1421", border: "1px solid #1e2d42", color: "#e8edf5" }}>
              <option value="">Toutes positions</option>
              {POS_ORDER.map(p => <option key={p} value={p}>{POS_FR[p]}</option>)}
            </select>
            <select value={filterMinMin} onChange={e => setFilterMinMin(parseInt(e.target.value))}
              className="text-xs px-2.5 py-1.5 rounded-lg outline-none"
              style={{ background: "#0d1421", border: "1px solid #1e2d42", color: "#e8edf5" }}>
              <option value={0}>Toutes minutes</option>
              <option value={450}>Min. 450 min</option>
              <option value={900}>Min. 900 min</option>
              <option value={1350}>Min. 1350 min</option>
              <option value={1800}>Min. 1800 min</option>
              <option value={2250}>Min. 2250 min</option>
            </select>
            <select value={sortKey} onChange={e => setSortKey(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg outline-none"
              style={{ background: "#0d1421", border: "1px solid #1e2d42", color: "#00d4ff" }}>
              {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            {isFiltered && (
              <button onClick={() => { setSearch(""); setFilterClub(""); setFilterPos(""); setFilterMinMin(0); }}
                className="text-xs px-2.5 py-1.5 rounded-lg"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
                ✕ Effacer
              </button>
            )}
          </div>
        )}
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {/* Unified leaderboard — one panel, switchable metric tabs, league
            chips inside. Replaces the old side-by-side L1+L2 Vedettes. */}
        {!isFiltered && (
          <Leaderboard
            key={leagueFilter}
            players={allPlayers}
            clubLeague={clubLeague}
            expandedId={expandedId}
            onToggle={toggle}
            loading={loading}
            leagueFilter={leagueFilter}
          />
        )}

        {/* Skeleton — only when nothing is loaded yet for the visible leagues */}
        {loading && allPlayers.length === 0 && (
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#0d1421", border: "1px solid #1e2d42" }} />
            ))}
          </div>
        )}

        {!loading && isFiltered && filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: "#6b7c96" }}>Aucun joueur trouvé.</p>
          </div>
        )}

        {/* Flat list when filtering */}
        {isFiltered && filtered.length > 0 && (
          <div>
            <p className="text-[10px] mb-2" style={{ color: "#4b5a72" }}>
              {filtered.length} joueur{filtered.length > 1 ? "s" : ""} · Tri : {SORT_OPTIONS.find(o => o.key === sortKey)?.label}
            </p>
            {filtered.map((p, i) => {
              const uid = `${p.clubId}-${p.id}`;
              return <PlayerRow key={uid} p={p} rank={i + 1} expanded={expandedId === uid} onToggle={() => toggle(uid)} />;
            })}
          </div>
        )}

        {/* Club sections — grouped by league when "Toutes" is selected. */}
        {!isFiltered && l1ByClub.length > 0 && (
          <section className="space-y-2">
            {leagueFilter === "ALL" && (
              <LeagueGroupHeader league="FL1" clubsCount={l1ByClub.length} playersCount={l1ByClub.reduce((s, g) => s + g.players.length, 0)} sortLabel={SORT_OPTIONS.find(o => o.key === sortKey)?.label ?? ""} />
            )}
            {l1ByClub.map(({ id, players }) => (
              <ClubSection key={id} clubId={id} players={players}
                sortKey={sortKey} expandedId={expandedId} onToggle={toggle}
                leagueBadge={leagueFilter === "ALL" ? clubLeague.get(id) : undefined} />
            ))}
          </section>
        )}

        {!isFiltered && l2ByClub.length > 0 && (
          <section className="space-y-2">
            {leagueFilter === "ALL" && (
              <LeagueGroupHeader league="FL2" clubsCount={l2ByClub.length} playersCount={l2ByClub.reduce((s, g) => s + g.players.length, 0)} sortLabel={SORT_OPTIONS.find(o => o.key === sortKey)?.label ?? ""} />
            )}
            {l2ByClub.map(({ id, players }) => (
              <ClubSection key={id} clubId={id} players={players}
                sortKey={sortKey} expandedId={expandedId} onToggle={toggle}
                leagueBadge={leagueFilter === "ALL" ? clubLeague.get(id) : undefined} />
            ))}
          </section>
        )}

        {!loading && allPlayers.length > 0 && (
          <div className="mt-8 pt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px]"
            style={{ borderTop: "1px solid #1e2d42", color: "#4b5a72" }}>
            <span>Sources : <span style={{ color: "#6b7c96" }}>Datamb.football</span> (L1, per 90 · +140 stats)</span>
            <span>· <span style={{ color: "#6b7c96" }}>FotMob</span> (L2)</span>
            <span>· <span style={{ color: "#6b7c96" }}>Football-Data.org</span> (effectifs)</span>
            <span className="ml-auto">{clubsDone}/{clubsTotal} clubs</span>
          </div>
        )}
      </div>
    </main>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
//
// Single, interactive ranking panel that subsumes the previous side-by-side
// L1 + L2 "Vedettes" boxes. The user picks a metric tab (Buteurs / Passeurs /
// xG+xA / Notation / Valeur) and a league chip (Toutes / L1 / L2) inside the
// panel, and the top 10 is computed live from the merged player pool. When
// a metric only one league exposes is picked, the other chip is greyed out
// with a "(n/a)" hint — so users see at a glance why their L2 selection is
// empty when they're looking at Datamb's xG+xA/90.

function Leaderboard({
  players, clubLeague, expandedId, onToggle, loading, leagueFilter,
}: {
  players: PlayerEntry[];
  clubLeague: Map<number, LeagueKey>;
  expandedId: string | null;
  onToggle: (uid: string) => void;
  loading: boolean;
  leagueFilter: LeagueFilter;
}) {
  const [metricKey, setMetricKey] = useState<string>("usGoals");
  // Chip defaults to the page-level filter; user overrides reset whenever
  // the page-level pill flips because we pass `key={leagueFilter}` from the
  // parent, forcing this component to remount.
  const [leagueChip, setLeagueChip] = useState<LeagueFilter>(leagueFilter);
  const [showMore, setShowMore] = useState(false);

  const metric = LEADERBOARD_METRICS.find(m => m.key === metricKey) ?? LEADERBOARD_METRICS[0];
  const l1Available = metric.available.includes("FL1");
  const l2Available = metric.available.includes("FL2");

  // If the user picks a chip that's not available for this metric, fall back
  // to whichever league IS available. Avoids the empty-list trap.
  const effectiveChip: LeagueFilter =
    leagueChip === "FL1" && !l1Available ? (l2Available ? "FL2" : "ALL")
    : leagueChip === "FL2" && !l2Available ? (l1Available ? "FL1" : "ALL")
    : leagueChip;

  const ranked = useMemo(() => {
    const pool = players.filter(p => {
      const league = clubLeague.get(p.clubId);
      if (!league) return false;
      if (effectiveChip !== "ALL" && league !== effectiveChip) return false;
      if (!metric.available.includes(league)) return false;
      return true;
    });
    return [...pool]
      .filter(p => ((p as unknown as Record<string, number | undefined>)[metric.key as string] ?? 0) > 0)
      .sort((a, b) => {
        const av = (a as unknown as Record<string, number>)[metric.key as string] ?? 0;
        const bv = (b as unknown as Record<string, number>)[metric.key as string] ?? 0;
        return bv - av;
      });
  }, [players, clubLeague, metric, effectiveChip]);

  const shown = showMore ? ranked.slice(0, 25) : ranked.slice(0, 10);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42", background: "#0d1421" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: "#1e2d42" }}>
        <Trophy size={14} weight="fill" style={{ color: metric.color }} />
        <span className="text-sm font-black" style={{ color: "#e8edf5" }}>Leaderboard</span>
        {metric.hint && (
          <span className="text-[10px] hidden sm:inline" style={{ color: "#6b7c96" }}>· {metric.hint}</span>
        )}
        <span className="text-[10px] ml-auto" style={{ color: "#6b7c96" }}>
          {loading && ranked.length === 0 ? "Chargement…" : `${ranked.length} joueur${ranked.length > 1 ? "s" : ""} classé${ranked.length > 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Metric tabs */}
      <div className="flex border-b overflow-x-auto" style={{ borderColor: "#1e2d42" }}>
        {LEADERBOARD_METRICS.map(m => {
          const active = m.key === metricKey;
          return (
            <button key={m.key as string}
              onClick={() => setMetricKey(m.key as string)}
              className="px-3 sm:px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors relative flex items-center gap-1.5"
              style={{
                color: active ? m.color : "#6b7c96",
                background: active ? `${m.color}10` : "transparent",
              }}>
              {m.label}
              {active && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: m.color }} />
              )}
            </button>
          );
        })}
      </div>

      {/* League chips */}
      <div className="px-3 py-2 flex items-center gap-1.5 border-b flex-wrap" style={{ borderColor: "#1e2d42" }}>
        <span className="text-[10px] mr-1" style={{ color: "#4b5a72" }}>Ligue :</span>
        {([
          { key: "ALL", label: "Toutes", disabled: false },
          { key: "FL1", label: "Ligue 1", disabled: !l1Available },
          { key: "FL2", label: "Ligue 2", disabled: !l2Available },
        ] as const).map(opt => {
          const active = effectiveChip === opt.key;
          return (
            <button key={opt.key}
              onClick={() => !opt.disabled && setLeagueChip(opt.key)}
              disabled={opt.disabled}
              className="text-[10px] font-bold px-2 py-1 rounded-md transition-colors"
              style={{
                color: opt.disabled ? "#4b5a72" : active ? metric.color : "#6b7c96",
                background: active ? `${metric.color}15` : "transparent",
                border: `1px solid ${active ? metric.color + "40" : "#1e2d42"}`,
                cursor: opt.disabled ? "not-allowed" : "pointer",
                opacity: opt.disabled ? 0.4 : 1,
              }}>
              {opt.label}{opt.disabled && " · n/a"}
            </button>
          );
        })}
      </div>

      {/* Rows */}
      <div className="p-2">
        {shown.length === 0 ? (
          <div className="py-8 text-center text-xs" style={{ color: "#6b7c96" }}>
            {loading ? "Chargement…" : "Aucun joueur pour cette combinaison."}
          </div>
        ) : (
          shown.map((p, i) => {
            const uid = `lb-${p.clubId}-${p.id}`;
            const league = clubLeague.get(p.clubId);
            const v = (p as unknown as Record<string, number>)[metric.key as string] ?? 0;
            return (
              <LeaderboardRow key={uid} p={p} rank={i + 1} metric={metric} value={v}
                league={league} expanded={expandedId === uid}
                onToggle={() => onToggle(uid)} />
            );
          })
        )}
        {ranked.length > 10 && (
          <button onClick={() => setShowMore(v => !v)}
            className="w-full mt-1 py-2 text-[11px] rounded-lg transition-colors hover:bg-white/[0.04]"
            style={{ color: "#6b7c96", background: "rgba(255,255,255,0.02)", border: "1px solid #1e2d42" }}>
            {showMore ? "Voir top 10" : `Voir top ${Math.min(25, ranked.length)}`}
          </button>
        )}
      </div>
    </div>
  );
}

function LeaderboardRow({ p, rank, metric, value, league, expanded, onToggle }: {
  p: PlayerEntry;
  rank: number;
  metric: LeaderboardMetric;
  value: number;
  league: LeagueKey | undefined;
  expanded: boolean;
  onToggle: () => void;
}) {
  const rankStyle = RANK_STYLE[rank] ?? { color: "#6b7c96", bg: "rgba(107,124,150,0.06)" };
  const badge = league ? LEAGUE_BADGE[league] : null;
  const teamName = p.club?.shortName ?? p.club?.name ?? "";

  return (
    <div className="rounded-xl overflow-hidden mb-1"
      style={{
        border: `1px solid ${expanded ? metric.color + "50" : "#1e2d42"}`,
        background: expanded ? "#0a0f1a" : "#0d1421",
      }}>
      <button onClick={onToggle}
        className="w-full flex items-center gap-2 sm:gap-2.5 px-2 py-2 hover:bg-white/[0.03] transition-colors text-left">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
          style={{
            color: rankStyle.color,
            background: rankStyle.bg,
            border: `1px solid ${rankStyle.color}30`,
          }}>
          {rank}
        </span>
        <PlayerPhoto p={p} eager={expanded} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold truncate" style={{ color: "#e8edf5" }}>{p.name}</p>
            {badge && (
              <span className="text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0"
                style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>
            )}
          </div>
          <p className="text-[10px] truncate" style={{ color: "#6b7c96" }}>
            {teamName}{p.position && <span className="ml-1.5">· {POS_FR[p.position] ?? p.position}</span>}
          </p>
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          <span className="text-base font-black leading-none" style={{ color: metric.color }}>
            {metric.format(value)}
          </span>
          <span className="text-[9px] mt-0.5" style={{ color: "#6b7c96" }}>{metric.short}</span>
        </div>
        <span className="flex-shrink-0 ml-1" style={{ color: "#6b7c96" }}>
          {expanded ? <CaretUp size={12} /> : <CaretDown size={12} />}
        </span>
      </button>
      {expanded && <PlayerDetail p={p} />}
    </div>
  );
}

function LeagueGroupHeader({ league, clubsCount, playersCount, sortLabel }: {
  league: LeagueKey;
  clubsCount: number;
  playersCount: number;
  sortLabel: string;
}) {
  const badge = LEAGUE_BADGE[league];
  return (
    <div className="flex items-center gap-2 pt-2 pb-1">
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
        style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>
      <span className="text-xs font-black" style={{ color: "#e8edf5" }}>
        {league === "FL1" ? "Ligue 1" : "Ligue 2"}
      </span>
      <span className="text-[10px]" style={{ color: "#4b5a72" }}>
        · {clubsCount} clubs · {playersCount} joueurs · tri : {sortLabel}
      </span>
    </div>
  );
}
