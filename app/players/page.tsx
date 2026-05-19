"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MagnifyingGlass, X, ArrowLeft, Users,
  FunnelSimple, TrendUp,
} from "@phosphor-icons/react";
import {
  PlayerEntry, PlayerRow,
  POS_ORDER, POS_FR, POS_COL, CLUB_SHORT,
  fv, normalize,
} from "../components/PlayerCard";

// ── Static maps ───────────────────────────────────────────────────────────────

const TEAM_IDS_L1 = [524, 548, 523, 521, 529, 516, 576, 525, 511, 1045, 512, 532, 533, 522, 519, 543, 545, 546];

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

// ── ClubSection ───────────────────────────────────────────────────────────────

function ClubSection({ clubId, players, sortKey, expandedId, onToggle }: {
  clubId: number;
  players: PlayerEntry[];
  sortKey: string;
  expandedId: string | null;
  onToggle: (uid: string) => void;
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
          <p className="text-sm font-black truncate" style={{ color: "#e8edf5" }}>
            {club?.name ?? CLUB_SHORT[clubId]}
          </p>
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
  const league = (searchParams.get("league") ?? "FL1").toUpperCase() === "FL2" ? "FL2" : "FL1";

  const [allPlayers, setAllPlayers] = useState<PlayerEntry[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [teamIds, setTeamIds] = useState<number[]>(league === "FL1" ? TEAM_IDS_L1 : []);
  const [clubLabels, setClubLabels] = useState<Record<number, string>>({});

  // L2-only: FotMob top players (no per-club squad data available)
  interface L2TopPlayer { id: number; name: string; teamId: number; teamName: string; value: number | string }
  const [l2Top, setL2Top] = useState<{ byRating: L2TopPlayer[]; byGoals: L2TopPlayer[]; byAssists: L2TopPlayer[] }>({
    byRating: [], byGoals: [], byAssists: [],
  });

  const [search, setSearch] = useState("");
  const [filterClub, setFilterClub] = useState<number | "">("");
  const [filterPos, setFilterPos] = useState("");
  const [filterMinMin, setFilterMinMin] = useState(0);
  const [sortKey, setSortKey] = useState("dm_xgxa90");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // League switch: reset state, then either install hardcoded L1 IDs or
  // fetch the L2 team IDs from standings. teamIds is the trigger for the
  // aggregator effect below — we set it AFTER clearing so the aggregator
  // only ever runs with IDs matching the current league.
  useEffect(() => {
    setAllPlayers([]); setLoadedCount(0); setLoading(true);
    setTeamIds([]);
    setClubLabels({});
    if (league === "FL1") {
      setTeamIds(TEAM_IDS_L1);
      return;
    }
    let cancelled = false;
    fetch("/api/standings?competition=FL2")
      .then(r => r.json())
      .then((d: { standings?: Array<{ team: { id: number; shortName: string; name: string } }> }) => {
        if (cancelled) return;
        const ids = (d.standings ?? []).map(s => s.team.id);
        const labels: Record<number, string> = {};
        (d.standings ?? []).forEach(s => { labels[s.team.id] = s.team.shortName || s.team.name; });
        setClubLabels(labels);
        setTeamIds(ids);
        if (ids.length === 0) setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [league]);

  // L2: fetch FotMob top players (squad endpoint doesn't support FotMob IDs)
  useEffect(() => {
    if (league !== "FL2") return;
    fetch("/api/players-l2")
      .then(r => r.json())
      .then((d: { topByRating?: L2TopPlayer[]; topByGoals?: L2TopPlayer[]; topByAssists?: L2TopPlayer[] }) => {
        setL2Top({
          byRating: d.topByRating ?? [],
          byGoals: d.topByGoals ?? [],
          byAssists: d.topByAssists ?? [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [league]);

  useEffect(() => {
    if (teamIds.length === 0) return;
    let cancelled = false;
    let done = 0;
    const total = teamIds.length;
    const squadEndpoint = league === "FL2" ? "/api/squad-l2" : "/api/squad";

    // Throttle: football-data.org free tier is 10 req/min. Run in small
    // concurrent batches so we don't burn through the quota and get most
    // squads back as 429s (which previously surfaced as "5 clubs · 155 joueurs").
    const CONCURRENCY = 3;
    const queue = [...teamIds];

    const fetchOne = async (id: number) => {
      try {
        const r = await fetch(`${squadEndpoint}/${id}`);
        if (!r.ok) {
          console.warn(`[players] squad ${id} HTTP ${r.status}`);
        } else {
          const data = await r.json();
          if (cancelled) return;
          const players: PlayerEntry[] = (data?.squad ?? []).map(
            (p: Omit<PlayerEntry, "clubId" | "club">) => ({ ...p, clubId: id, club: data.team })
          );
          if (players.length > 0) {
            setAllPlayers(prev => [...prev, ...players]);
          } else {
            console.warn(`[players] squad ${id} empty`);
          }
        }
      } catch (err) {
        console.warn(`[players] squad ${id} fetch failed:`, err);
      } finally {
        if (cancelled) return;
        done++;
        setLoadedCount(done);
        if (done === total) setLoading(false);
      }
    };

    const worker = async () => {
      while (!cancelled) {
        const id = queue.shift();
        if (id === undefined) return;
        await fetchOne(id);
      }
    };

    for (let i = 0; i < CONCURRENCY; i++) worker();

    return () => { cancelled = true; };
  }, [teamIds, league]);

  // Merge static L1 names with any dynamically-fetched (L2) labels so search
  // and filter dropdowns work regardless of competition.
  const clubShort: Record<number, string> = useMemo(
    () => ({ ...CLUB_SHORT, ...clubLabels }),
    [clubLabels]
  );

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

  const byClub = useMemo(() =>
    teamIds
      .map(id => ({ id, players: filtered.filter(p => p.clubId === id) }))
      .filter(g => g.players.length > 0),
    [filtered, teamIds]
  );

  const toggle = useCallback((uid: string) => {
    setExpandedId(prev => prev === uid ? null : uid);
  }, []);

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
            <span className="font-black text-sm" style={{ color: "#e8edf5" }}>Joueurs {league === "FL2" ? "Ligue 2" : "Ligue 1"}</span>
            <span className="text-xs" style={{ color: "#6b7c96" }}>
              {loading ? `Chargement… (${loadedCount}/${teamIds.length})` : `${filtered.length} / ${allPlayers.length} joueurs`}
            </span>
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg flex-shrink-0"
            style={{ background: showFilters ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: showFilters ? "#00d4ff" : "#6b7c96" }}>
            <FunnelSimple size={11} /> Filtres
          </button>
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
              {teamIds.map(id => <option key={id} value={id}>{clubShort[id] ?? `#${id}`}</option>)}
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

      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Ligue 2 simplified stats view (FotMob top players) */}
        {league === "FL2" && (
          <div className="space-y-4">
            <p className="text-xs" style={{ color: "#6b7c96" }}>
              Source : <span style={{ color: "#00d4ff" }}>FotMob</span> · Top joueurs de la saison Ligue 2.
              Les fiches détaillées par club (Datamb / Transfermarkt) ne sont pas disponibles pour la Ligue 2 sur les plans gratuits.
            </p>
            {([
              { title: "Top notation", list: l2Top.byRating, unit: "" },
              { title: "Top buteurs", list: l2Top.byGoals, unit: " buts" },
              { title: "Top passeurs", list: l2Top.byAssists, unit: " PD" },
            ] as const).map(panel => (
              <div key={panel.title} className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid #1e2d42", background: "#0d1421" }}>
                <div className="px-4 py-2.5 text-xs font-black"
                  style={{ color: "#e8edf5", borderBottom: "1px solid #1e2d42" }}>
                  {panel.title}
                </div>
                <div>
                  {panel.list.length === 0 && (
                    <div className="px-4 py-4 text-xs" style={{ color: "#6b7c96" }}>
                      {loading ? "Chargement…" : "Aucune donnée disponible."}
                    </div>
                  )}
                  {panel.list.map((p, i) => (
                    <a key={p.id} href={`https://www.fotmob.com/players/${p.id}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-white/[0.03]"
                      style={{ borderTop: i === 0 ? "none" : "1px solid #131c2c" }}>
                      <span className="w-5 text-xs font-mono" style={{ color: "#6b7c96" }}>{i + 1}</span>
                      <span className="flex-1 text-sm" style={{ color: "#e8edf5" }}>{p.name}</span>
                      <span className="text-xs" style={{ color: "#6b7c96" }}>{p.teamName}</span>
                      <span className="text-sm font-bold" style={{ color: "#00d4ff" }}>{p.value}{panel.unit}</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {league === "FL1" && loading && allPlayers.length === 0 && (
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#0d1421", border: "1px solid #1e2d42" }} />
            ))}
          </div>
        )}

        {league === "FL1" && !loading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: "#6b7c96" }}>Aucun joueur trouvé.</p>
          </div>
        )}

        {/* Flat list when filtering */}
        {league === "FL1" && isFiltered && filtered.length > 0 && (
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

        {/* Club sections (default) */}
        {league === "FL1" && !isFiltered && byClub.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] mb-3" style={{ color: "#4b5a72" }}>
              {byClub.length} clubs · {allPlayers.length} joueurs · Tri interne : {SORT_OPTIONS.find(o => o.key === sortKey)?.label}
            </p>
            {byClub.map(({ id, players }) => (
              <ClubSection key={id} clubId={id} players={players}
                sortKey={sortKey} expandedId={expandedId} onToggle={toggle} />
            ))}
          </div>
        )}

        {!loading && allPlayers.length > 0 && (
          <div className="mt-8 pt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px]"
            style={{ borderTop: "1px solid #1e2d42", color: "#4b5a72" }}>
            <span>Sources : <span style={{ color: "#6b7c96" }}>Datamb.football</span> (per 90 · +140 stats)</span>
            <span>· <span style={{ color: "#6b7c96" }}>Football-Data.org</span> (effectif)</span>
            <span>· <span style={{ color: "#6b7c96" }}>Wikidata/Commons</span> (photos publiques)</span>
            <span className="ml-auto">{loadedCount}/{teamIds.length} clubs</span>
          </div>
        )}
      </div>
    </main>
  );
}
