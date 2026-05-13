"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search, X, ChevronDown, ChevronUp, ArrowLeft, Users,
  AlertTriangle, ExternalLink, TrendingUp, TrendingDown,
  Info, Filter,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface TeamInfo {
  id: number;
  name: string | null;
  shortName: string | null;
  crest: string | null;
}

interface PlayerEntry {
  id: string;
  name: string;
  position: string;
  age: number;
  dateOfBirth?: string;
  nationality: string[];
  height?: number;
  foot?: string;
  joinedOn?: string;
  signedFrom?: string;
  contract?: string;
  marketValue: number;
  status?: string;
  formBadge?: "hot" | "good" | "neutral" | "cold";
  recentGoals?: number;
  recentAssists?: number;
  imageUrl?: string;
  // Understat season totals
  xG?: number; xA?: number; usGoals?: number; usAssists?: number;
  shots?: number; minutes?: number; games?: number;
  // Datamb per-90
  dm_goals90?: number; dm_assists90?: number; dm_xg90?: number; dm_xa90?: number;
  dm_shots90?: number; dm_keyPasses90?: number; dm_dribbles90?: number;
  dm_dribblePct?: number; dm_defDuels90?: number; dm_defDuelPct?: number;
  dm_interceptions90?: number; dm_aerialPct?: number; dm_passPct?: number;
  dm_progressive90?: number; dm_savePct?: number; dm_gcPer90?: number;
  dm_cleanSheets?: number; dm_xgxa90?: number; dm_minPerMatch?: number;
  dm_team?: string;
  // Club
  clubId: number;
  club: TeamInfo;
}

// ── Static maps ───────────────────────────────────────────────────────────────

const TEAM_IDS = [524, 548, 523, 521, 529, 516, 576, 525, 511, 1045, 512, 532, 533, 522, 519, 543, 545, 546];
const CLUB_SHORT: Record<number, string> = {
  524: "PSG", 548: "Monaco", 523: "Lyon", 521: "Lille", 529: "Rennes",
  516: "Marseille", 576: "Strasbourg", 525: "Lorient", 511: "Toulouse",
  1045: "Paris FC", 512: "Brest", 532: "Angers", 533: "Le Havre",
  522: "Nice", 519: "Auxerre", 543: "Nantes", 545: "Metz", 546: "Lens",
};
const POS_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Winger", "Centre-Forward"];
const POS_FR: Record<string, string> = {
  Goalkeeper: "Gardiens", Defender: "Défenseurs", Midfielder: "Milieux",
  Winger: "Ailiers", "Centre-Forward": "Attaquants",
};
const POS_FR1: Record<string, string> = {
  Goalkeeper: "Gardien", Defender: "Défenseur", Midfielder: "Milieu",
  Winger: "Ailier", "Centre-Forward": "Attaquant",
};
const POS_COL: Record<string, string> = {
  Goalkeeper: "#00d4ff", Defender: "#22c55e", Midfielder: "#a78bfa",
  Winger: "#f59e0b", "Centre-Forward": "#ef4444",
};
const POS_SHORT: Record<string, string> = {
  Goalkeeper: "GK", Defender: "DEF", Midfielder: "MIL", Winger: "AIL", "Centre-Forward": "ATT",
};

const SORT_OPTIONS: { key: keyof PlayerEntry | string; label: string }[] = [
  { key: "dm_xg90",        label: "xG/90" },
  { key: "dm_xa90",        label: "xA/90" },
  { key: "dm_xgxa90",      label: "xG+xA/90" },
  { key: "usGoals",        label: "Buts saison" },
  { key: "usAssists",      label: "Passes D." },
  { key: "xG",             label: "xG saison" },
  { key: "dm_passPct",     label: "Pass %" },
  { key: "dm_dribblePct",  label: "Dribbles %" },
  { key: "dm_defDuelPct",  label: "Duel déf. %" },
  { key: "dm_interceptions90", label: "Interceptions/90" },
  { key: "dm_savePct",     label: "Arrêts % (GK)" },
  { key: "minutes",        label: "Minutes" },
  { key: "marketValue",    label: "Valeur marchande" },
  { key: "age",            label: "Âge ↑" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fv(val: number): string {
  if (!val) return "—";
  if (val >= 1e8)  return `${(val / 1e8).toFixed(0)}00M€`;
  if (val >= 1e7)  return `${(val / 1e7).toFixed(0)}0M€`;
  if (val >= 1e6)  return `${(val / 1e6).toFixed(1)}M€`;
  if (val >= 1e5)  return `${(val / 1e5).toFixed(0)}0K€`;
  return `${Math.round(val / 1000)}K€`;
}

function fmt1(v?: number): string { return v != null && v > 0 ? v.toFixed(1) : "—"; }
function fmt2(v?: number): string { return v != null && v > 0 ? v.toFixed(2) : "—"; }
function pct(v?: number): string  { return v != null && v > 0 ? `${v.toFixed(0)}%` : "—"; }

const FORM_CFG: Record<string, { emoji: string; color: string }> = {
  hot:     { emoji: "🔥", color: "#ef4444" },
  good:    { emoji: "⚡", color: "#22c55e" },
  neutral: { emoji: "●", color: "#6b7c96" },
  cold:    { emoji: "❄️", color: "#94a3b8" },
};

function ec(score: number): string {
  if (score >= 75) return "#22c55e";
  if (score >= 55) return "#86efac";
  if (score >= 40) return "#f59e0b";
  if (score >= 25) return "#f97316";
  return "#ef4444";
}

function formScore(p: PlayerEntry): number {
  if (p.status?.toLowerCase().includes("injury")) return 20;
  const combined = (p.dm_xg90 ?? 0) + (p.dm_xa90 ?? 0);
  if (combined >= 0.6) return 90;
  if (combined >= 0.35) return 75;
  if (combined >= 0.2) return 60;
  if (combined >= 0.05) return 45;
  return p.formBadge === "hot" ? 85 : p.formBadge === "good" ? 65 : p.formBadge === "cold" ? 25 : 45;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ── PlayerRow ─────────────────────────────────────────────────────────────────

function StatBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg py-2 px-1"
      style={{ background: "rgba(255,255,255,0.04)", minWidth: 52 }}>
      <span className="text-sm font-black leading-none" style={{ color: color ?? "#e8edf5" }}>{value}</span>
      <span className="text-[9px] mt-1 text-center leading-tight" style={{ color: "#6b7c96" }}>{label}</span>
    </div>
  );
}

function PlayerDetail({ p }: { p: PlayerEntry }) {
  const isGk = p.position === "Goalkeeper";
  const isInj = p.status?.toLowerCase().includes("injury");
  const posColor = POS_COL[p.position] ?? "#6b7c96";

  const hasUnderstat = (p.games ?? 0) > 0;
  const hasDatamb = (p.dm_xg90 ?? 0) > 0 || (p.dm_savePct ?? 0) > 0;

  return (
    <div className="border-t" style={{ borderColor: "#1e2d42", background: "#060a12" }}>
      <div className="px-4 py-3 space-y-3">

        {/* Bio row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {p.dateOfBirth && (
            <span style={{ color: "#94a3b8" }}>
              <span style={{ color: "#6b7c96" }}>Né le </span>
              {new Date(p.dateOfBirth).toLocaleDateString("fr-FR")}
              {p.age > 0 && <span style={{ color: "#6b7c96" }}> ({p.age} ans)</span>}
            </span>
          )}
          {(p.height ?? 0) > 0 && (
            <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>Taille </span>{p.height} cm</span>
          )}
          {p.foot && p.foot !== "" && (
            <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>Pied </span>{p.foot}</span>
          )}
          {p.nationality?.[0] && (
            <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>Nat. </span>{p.nationality[0]}</span>
          )}
          {p.signedFrom && (
            <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>De </span>{p.signedFrom}</span>
          )}
          {p.joinedOn && (
            <span style={{ color: "#94a3b8" }}>
              <span style={{ color: "#6b7c96" }}>Arrivé </span>
              {new Date(p.joinedOn).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
            </span>
          )}
          {p.contract && (
            <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>Contrat → </span>{p.contract}</span>
          )}
          {(p.marketValue ?? 0) > 0 && (
            <span style={{ color: "#00d4ff" }}><span style={{ color: "#6b7c96" }}>Valeur </span><strong>{fv(p.marketValue)}</strong></span>
          )}
          {isInj && (
            <span className="flex items-center gap-1" style={{ color: "#f97316" }}>
              <AlertTriangle size={10} /> Blessé
            </span>
          )}
        </div>

        {/* Understat season totals */}
        {hasUnderstat && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#6b7c96" }}>
              Understat — Saison {p.games} matchs · {p.minutes} min
            </p>
            <div className="flex flex-wrap gap-1.5">
              <StatBox label="Buts"    value={p.usGoals ?? 0}              color="#f59e0b" />
              <StatBox label="Passes D." value={p.usAssists ?? 0}          color="#00d4ff" />
              <StatBox label="xG"      value={(p.xG ?? 0).toFixed(1)}      color="#22c55e" />
              <StatBox label="xA"      value={(p.xA ?? 0).toFixed(1)}      color="#a78bfa" />
              <StatBox label="Tirs"    value={p.shots ?? 0}                color="#94a3b8" />
              {p.shots && p.shots > 0 && (
                <StatBox label="xG/tir" value={((p.xG ?? 0) / p.shots).toFixed(2)} color="#6b7c96" />
              )}
            </div>
          </div>
        )}

        {/* Datamb per-90 */}
        {hasDatamb && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#6b7c96" }}>
              Datamb — Per 90{p.dm_minPerMatch ? ` · ${Math.round(p.dm_minPerMatch)} min/match` : ""}
            </p>
            {isGk ? (
              <div className="flex flex-wrap gap-1.5">
                <StatBox label="Arrêts %"    value={pct(p.dm_savePct)}   color="#00d4ff" />
                <StatBox label="Buts enc./90" value={fmt2(p.dm_gcPer90)} color="#ef4444" />
                <StatBox label="Clean sheets" value={p.dm_cleanSheets ?? 0} color="#22c55e" />
                <StatBox label="Aérien %"    value={pct(p.dm_aerialPct)} color="#a78bfa" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1.5">
                  <StatBox label="xG/90"      value={fmt2(p.dm_xg90)}     color="#22c55e" />
                  <StatBox label="xA/90"      value={fmt2(p.dm_xa90)}     color="#a78bfa" />
                  <StatBox label="Buts/90"    value={fmt2(p.dm_goals90)}  color="#f59e0b" />
                  <StatBox label="Passes D./90" value={fmt2(p.dm_assists90)} color="#00d4ff" />
                  <StatBox label="Tirs/90"    value={fmt1(p.dm_shots90)}  color="#94a3b8" />
                  <StatBox label="Kp/90"      value={fmt1(p.dm_keyPasses90)} color="#6b7c96" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <StatBox label="Pass %"     value={pct(p.dm_passPct)}   color="#00d4ff" />
                  <StatBox label="Prog./90"   value={fmt1(p.dm_progressive90)} color="#22c55e" />
                  <StatBox label="Drib./90"   value={fmt1(p.dm_dribbles90)} color="#f59e0b" />
                  <StatBox label="Drib. %"    value={pct(p.dm_dribblePct)} color="#f59e0b" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <StatBox label="Duel déf./90" value={fmt1(p.dm_defDuels90)} color="#a78bfa" />
                  <StatBox label="Duel déf. %" value={pct(p.dm_defDuelPct)}  color="#a78bfa" />
                  <StatBox label="Int./90"    value={fmt2(p.dm_interceptions90)} color="#ef4444" />
                  <StatBox label="Aérien %"   value={pct(p.dm_aerialPct)}  color="#94a3b8" />
                </div>
              </div>
            )}
          </div>
        )}

        {!hasUnderstat && !hasDatamb && (
          <p className="text-xs" style={{ color: "#6b7c96" }}>
            Données statistiques non disponibles pour ce joueur cette saison.
          </p>
        )}

        {/* Links */}
        <div className="flex gap-2 pt-1">
          <Link href={`/club/${p.clubId}`}
            className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg font-semibold hover:opacity-80 transition-all"
            style={{ background: `${posColor}10`, border: `1px solid ${posColor}25`, color: posColor }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.club.crest && <img src={p.club.crest} alt="" className="w-3.5 h-3.5 object-contain" />}
            Voir {p.club.shortName ?? p.club.name ?? "Club"}
          </Link>
          <a href={`https://understat.com/player/${p.id}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg hover:opacity-80 transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7c96" }}>
            Understat <ExternalLink size={8} />
          </a>
        </div>
      </div>
    </div>
  );
}

function PlayerRow({ p, expanded, onToggle, rank }: {
  p: PlayerEntry; expanded: boolean; onToggle: () => void; rank?: number;
}) {
  const posColor = POS_COL[p.position] ?? "#6b7c96";
  const isInj = p.status?.toLowerCase().includes("injury");
  const fb = p.formBadge ?? "neutral";
  const fsCfg = FORM_CFG[fb] ?? FORM_CFG.neutral;
  const fs = formScore(p);

  return (
    <div className="rounded-xl overflow-hidden mb-1.5" style={{ border: `1px solid ${expanded ? posColor + "40" : "#1e2d42"}`, background: expanded ? "#0a0f1a" : "#0d1421" }}>
      {/* Compact row */}
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors text-left">
        {/* Rank */}
        {rank != null && (
          <span className="text-[10px] font-mono w-5 flex-shrink-0 text-right" style={{ color: "#6b7c96" }}>{rank}</span>
        )}

        {/* Position badge */}
        <span className="text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0"
          style={{ background: `${posColor}15`, color: posColor, border: `1px solid ${posColor}25` }}>
          {POS_SHORT[p.position] ?? "?"}
        </span>

        {/* Club logo */}
        {p.club.crest
          ? <img src={p.club.crest} alt="" className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" /> // eslint-disable-line @next/next/no-img-element
          : <span className="w-5 h-5 flex-shrink-0" />
        }

        {/* Photo / avatar */}
        {p.imageUrl
          ? <img src={p.imageUrl} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0 hidden sm:block" loading="lazy" // eslint-disable-line @next/next/no-img-element
              style={{ border: `1px solid ${posColor}30` }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          : null
        }

        {/* Name + club */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: isInj ? "#f97316" : "#e8edf5" }}>
            {isInj && <AlertTriangle size={9} className="inline mr-1 text-orange-400" />}
            {p.name}
          </p>
          <p className="text-[10px] truncate" style={{ color: "#6b7c96" }}>
            {p.club.shortName ?? p.club.name ?? CLUB_SHORT[p.clubId] ?? "—"}
            {p.nationality?.[0] && <span className="ml-1.5" style={{ color: "#4b5a72" }}>{p.nationality[0]}</span>}
          </p>
        </div>

        {/* Age */}
        <span className="text-[10px] w-6 text-right flex-shrink-0 hidden sm:block" style={{ color: "#6b7c96" }}>{p.age || "—"}</span>

        {/* Form bar */}
        <div className="hidden sm:flex items-center gap-1 flex-shrink-0 w-14">
          <span style={{ fontSize: 10, color: fsCfg.color }}>{fsCfg.emoji}</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${fs}%`, background: ec(fs) }} />
          </div>
        </div>

        {/* Understat stats */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] w-6 text-right" style={{ color: (p.usGoals ?? 0) > 0 ? "#f59e0b" : "#4b5a72" }}>
            {(p.usGoals ?? 0) > 0 ? `⚽${p.usGoals}` : ""}
          </span>
          <span className="text-[10px] w-10 text-right" style={{ color: (p.xG ?? 0) > 0 ? "#22c55e" : "#4b5a72" }}>
            {(p.xG ?? 0) > 0 ? `xG${(p.xG!).toFixed(1)}` : ""}
          </span>
        </div>

        {/* Datamb per-90 */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-mono w-9 text-right" style={{ color: (p.dm_xg90 ?? 0) > 0 ? "#22c55e" : "#4b5a72" }}>
            {(p.dm_xg90 ?? 0) > 0 ? (p.dm_xg90!).toFixed(2) : ""}
          </span>
          <span className="text-[10px] font-mono w-9 text-right" style={{ color: (p.dm_xa90 ?? 0) > 0 ? "#a78bfa" : "#4b5a72" }}>
            {(p.dm_xa90 ?? 0) > 0 ? (p.dm_xa90!).toFixed(2) : ""}
          </span>
        </div>

        {/* Value */}
        <span className="text-[10px] font-mono font-bold w-14 text-right flex-shrink-0 hidden sm:block"
          style={{ color: (p.marketValue ?? 0) > 20e6 ? "#00d4ff" : (p.marketValue ?? 0) > 5e6 ? "#e8edf5" : "#4b5a72" }}>
          {(p.marketValue ?? 0) > 0 ? fv(p.marketValue) : "—"}
        </span>

        {/* Expand icon */}
        <span className="flex-shrink-0" style={{ color: "#6b7c96" }}>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>

      {expanded && <PlayerDetail p={p} />}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlayersPage() {
  const [allPlayers, setAllPlayers] = useState<PlayerEntry[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterClub, setFilterClub] = useState<number | "">("");
  const [filterPos, setFilterPos] = useState("");
  const [filterMinMin, setFilterMinMin] = useState(0);
  const [sortKey, setSortKey] = useState("dm_xg90");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch all squads in parallel, update state as each resolves
  useEffect(() => {
    setLoading(true);
    let resolved = 0;

    Promise.allSettled(
      TEAM_IDS.map(id =>
        fetch(`/api/squad/${id}`)
          .then(r => r.json())
          .then(data => {
            if (!data?.team) return [];
            return (data.squad ?? []).map((p: Omit<PlayerEntry, "clubId" | "club">) => ({
              ...p,
              clubId: id,
              club: data.team,
            }));
          })
          .catch(() => [])
      )
    ).then(results => {
      const merged: PlayerEntry[] = [];
      for (const r of results) {
        if (r.status === "fulfilled") {
          merged.push(...r.value);
          resolved++;
        }
      }
      setAllPlayers(merged);
      setLoadedCount(resolved);
      setLoading(false);
    });
  }, []);

  // Sort + filter
  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    let list = allPlayers.filter(p => {
      if (q && !normalize(p.name).includes(q) &&
          !normalize(p.club.name ?? "").includes(q) &&
          !normalize(p.club.shortName ?? "").includes(q) &&
          !normalize(CLUB_SHORT[p.clubId] ?? "").includes(q) &&
          !normalize(p.nationality?.[0] ?? "").includes(q))
        return false;
      if (filterClub !== "" && p.clubId !== filterClub) return false;
      if (filterPos && p.position !== filterPos) return false;
      if (filterMinMin > 0 && (p.minutes ?? 0) < filterMinMin) return false;
      return true;
    });

    // Sort
    list = [...list].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "age")  return (a.age || 99) - (b.age || 99);
      const av = ((a as unknown as Record<string, unknown>)[sortKey] as number) ?? 0;
      const bv = ((b as unknown as Record<string, unknown>)[sortKey] as number) ?? 0;
      return bv - av;
    });
    return list;
  }, [allPlayers, search, filterClub, filterPos, filterMinMin, sortKey]);

  // Group by position when no search/filter active
  const isFiltered = search.trim() || filterClub !== "" || filterPos || filterMinMin > 0;

  const byPosition = useMemo(() => {
    const map: Record<string, PlayerEntry[]> = {};
    for (const pos of POS_ORDER) {
      const players = filtered
        .filter(p => p.position === pos)
        .sort((a, b) => (((b as unknown as Record<string, unknown>)[sortKey] as number) ?? 0) - (((a as unknown as Record<string, unknown>)[sortKey] as number) ?? 0));
      if (players.length > 0) map[pos] = players;
    }
    return map;
  }, [filtered, sortKey]);

  const toggle = useCallback((uid: string) => {
    setExpandedId(prev => prev === uid ? null : uid);
  }, []);

  const hasAnyFilters = isFiltered;
  const activeSortLabel = SORT_OPTIONS.find(o => o.key === sortKey)?.label ?? sortKey;

  return (
    <main className="min-h-screen" style={{ background: "#080c14" }}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b"
        style={{ borderColor: "#1e2d42", background: "rgba(8,12,20,0.95)" }}>
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-xs hover:opacity-70 flex-shrink-0 transition-all"
            style={{ color: "#6b7c96" }}>
            <ArrowLeft size={14} /> Accueil
          </Link>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Users size={14} style={{ color: "#00d4ff", flexShrink: 0 }} />
            <span className="font-black text-sm" style={{ color: "#e8edf5" }}>Joueurs Ligue 1</span>
            {loading
              ? <span className="text-xs" style={{ color: "#6b7c96" }}>Chargement… ({loadedCount}/{TEAM_IDS.length})</span>
              : <span className="text-xs" style={{ color: "#6b7c96" }}>{filtered.length} / {allPlayers.length} joueurs</span>
            }
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg flex-shrink-0 transition-all hover:opacity-80"
            style={{ background: showFilters ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: showFilters ? "#00d4ff" : "#6b7c96" }}>
            <Filter size={11} /> Filtres
          </button>
        </div>

        {/* Search bar */}
        <div className="max-w-5xl mx-auto px-4 pb-2.5">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7c96" }} />
            <input
              type="text"
              placeholder="Rechercher un joueur, un club, une nationalité…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#e8edf5" }}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70">
                <X size={13} style={{ color: "#6b7c96" }} />
              </button>
            )}
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="max-w-5xl mx-auto px-4 pb-3 flex flex-wrap gap-2">
            {/* Club */}
            <select value={filterClub}
              onChange={e => setFilterClub(e.target.value === "" ? "" : parseInt(e.target.value))}
              className="text-xs px-2.5 py-1.5 rounded-lg outline-none"
              style={{ background: "#0d1421", border: "1px solid #1e2d42", color: "#e8edf5" }}>
              <option value="">Tous les clubs</option>
              {TEAM_IDS.map(id => <option key={id} value={id}>{CLUB_SHORT[id]}</option>)}
            </select>

            {/* Position */}
            <select value={filterPos} onChange={e => setFilterPos(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg outline-none"
              style={{ background: "#0d1421", border: "1px solid #1e2d42", color: "#e8edf5" }}>
              <option value="">Toutes positions</option>
              {POS_ORDER.map(p => <option key={p} value={p}>{POS_FR[p]}</option>)}
            </select>

            {/* Min minutes */}
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

            {/* Sort */}
            <select value={sortKey} onChange={e => setSortKey(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg outline-none"
              style={{ background: "#0d1421", border: "1px solid #1e2d42", color: "#00d4ff" }}>
              {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>

            {/* Reset */}
            {hasAnyFilters && (
              <button onClick={() => { setSearch(""); setFilterClub(""); setFilterPos(""); setFilterMinMin(0); }}
                className="text-xs px-2.5 py-1.5 rounded-lg hover:opacity-70 transition-all"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
                ✕ Effacer
              </button>
            )}
          </div>
        )}
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Column headers (desktop) */}
        <div className="hidden md:flex items-center gap-2 px-3 pb-1 mb-1 text-[9px] font-bold uppercase tracking-widest"
          style={{ color: "#4b5a72" }}>
          <span className="w-5 flex-shrink-0" />
          <span className="w-8 flex-shrink-0">Pos</span>
          <span className="w-5 flex-shrink-0" />
          <span className="flex-1 min-w-0">Joueur · Club</span>
          <span className="w-6 text-right flex-shrink-0">Âge</span>
          <span className="w-14 text-right flex-shrink-0">Forme</span>
          <span className="w-6 text-right flex-shrink-0">Buts</span>
          <span className="w-10 text-right flex-shrink-0">xG</span>
          <span className="w-9 text-right flex-shrink-0">xG/90</span>
          <span className="w-9 text-right flex-shrink-0">xA/90</span>
          <span className="w-14 text-right flex-shrink-0">Valeur</span>
          <span className="w-3 flex-shrink-0" />
        </div>

        {/* Sort label (mobile) */}
        <div className="md:hidden flex items-center justify-between mb-2">
          <span className="text-[10px]" style={{ color: "#6b7c96" }}>
            {filtered.length} joueur{filtered.length > 1 ? "s" : ""} · Tri: {activeSortLabel}
          </span>
          {!showFilters && (
            <div className="flex gap-1.5">
              {SORT_OPTIONS.slice(0, 4).map(o => (
                <button key={o.key} onClick={() => setSortKey(o.key)}
                  className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: sortKey === o.key ? "rgba(0,212,255,0.12)" : "rgba(255,255,255,0.05)", color: sortKey === o.key ? "#00d4ff" : "#6b7c96", border: `1px solid ${sortKey === o.key ? "rgba(0,212,255,0.25)" : "transparent"}` }}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && allPlayers.length === 0 && (
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: "#0d1421", border: "1px solid #1e2d42" }} />
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: "#6b7c96" }}>Aucun joueur trouvé pour cette recherche.</p>
          </div>
        )}

        {/* Flat list when searching */}
        {isFiltered && filtered.length > 0 && (
          <div>
            {filtered.map((p, i) => {
              const uid = `${p.clubId}-${p.id}`;
              return (
                <PlayerRow key={uid} p={p} rank={i + 1}
                  expanded={expandedId === uid}
                  onToggle={() => toggle(uid)} />
              );
            })}
          </div>
        )}

        {/* Position sections (default) */}
        {!isFiltered && (
          <div className="space-y-6">
            {POS_ORDER.filter(pos => byPosition[pos]).map(pos => {
              const players = byPosition[pos];
              const posColor = POS_COL[pos];
              return (
                <section key={pos}>
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: posColor }} />
                    <h2 className="text-sm font-black" style={{ color: posColor }}>{POS_FR[pos]}</h2>
                    <span className="text-xs" style={{ color: "#4b5a72" }}>{players.length}</span>
                    <div className="flex-1 h-px" style={{ background: `${posColor}20` }} />
                    <span className="text-[10px]" style={{ color: "#4b5a72" }}>Trié par {activeSortLabel}</span>
                  </div>

                  {/* Club sub-groups */}
                  {(() => {
                    const byClub = TEAM_IDS
                      .map(id => ({ id, players: players.filter(p => p.clubId === id) }))
                      .filter(g => g.players.length > 0);
                    return byClub.map(({ id, players: clubPlayers }) => (
                      <div key={id} className="mb-3">
                        {/* Club row */}
                        <div className="flex items-center gap-2 px-1 mb-1.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {clubPlayers[0].club.crest && (
                            <img src={clubPlayers[0].club.crest} alt="" className="w-4 h-4 object-contain" />
                          )}
                          <Link href={`/club/${id}`}
                            className="text-[10px] font-semibold hover:opacity-70 transition-all"
                            style={{ color: "#94a3b8" }}>
                            {clubPlayers[0].club.name ?? CLUB_SHORT[id]}
                          </Link>
                          <span className="text-[9px]" style={{ color: "#4b5a72" }}>
                            {clubPlayers.length} {POS_FR1[pos]}{clubPlayers.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        {clubPlayers.map((p, i) => {
                          const uid = `${p.clubId}-${p.id}`;
                          return (
                            <PlayerRow key={uid} p={p} rank={i + 1}
                              expanded={expandedId === uid}
                              onToggle={() => toggle(uid)} />
                          );
                        })}
                      </div>
                    ));
                  })()}
                </section>
              );
            })}
          </div>
        )}

        {/* Stats legend footer */}
        {!loading && allPlayers.length > 0 && (
          <div className="mt-8 pt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px]"
            style={{ borderTop: "1px solid #1e2d42", color: "#4b5a72" }}>
            <span>Sources : <span style={{ color: "#6b7c96" }}>Understat</span> (totaux saison)</span>
            <span>· <span style={{ color: "#6b7c96" }}>Datamb</span> (per 90)</span>
            <span>· <span style={{ color: "#6b7c96" }}>Football-Data.org</span> (effectif)</span>
            <span className="ml-auto">
              {loadedCount}/{TEAM_IDS.length} clubs chargés
            </span>
          </div>
        )}
      </div>
    </main>
  );
}
