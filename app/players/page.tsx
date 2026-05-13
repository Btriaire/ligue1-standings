"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search, X, ChevronDown, ChevronUp, ArrowLeft, Users,
  AlertTriangle, ExternalLink, Filter, TrendingUp,
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
  // Understat
  xG?: number; xA?: number; usGoals?: number; usAssists?: number;
  shots?: number; minutes?: number; games?: number;
  // Datamb core
  dm_goals90?: number; dm_assists90?: number; dm_xg90?: number; dm_xa90?: number;
  dm_shots90?: number; dm_keyPasses90?: number; dm_dribbles90?: number;
  dm_dribblePct?: number; dm_defDuels90?: number; dm_defDuelPct?: number;
  dm_interceptions90?: number; dm_aerialPct?: number; dm_passPct?: number;
  dm_progressive90?: number; dm_savePct?: number; dm_gcPer90?: number;
  dm_cleanSheets?: number; dm_xgxa90?: number; dm_minPerMatch?: number; dm_team?: string;
  // Datamb extra
  dm_shotsOnTarget?: number; dm_goalConversion?: number; dm_touchesBox90?: number;
  dm_possWon90?: number; dm_npxg90?: number; dm_duelsWonPct?: number;
  dm_crosses90?: number; dm_crossAcc?: number; dm_fouls90?: number;
  dm_tackles90?: number; dm_yellowCards90?: number; dm_saves90?: number; dm_exits90?: number;
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
const POS_COL: Record<string, string> = {
  Goalkeeper: "#00d4ff", Defender: "#22c55e", Midfielder: "#a78bfa",
  Winger: "#f59e0b", "Centre-Forward": "#ef4444",
};
const POS_SHORT: Record<string, string> = {
  Goalkeeper: "GK", Defender: "DEF", Midfielder: "MIL", Winger: "AIL", "Centre-Forward": "ATT",
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
  { key: "minutes",        label: "Minutes" },
  { key: "marketValue",    label: "Valeur" },
  { key: "age",            label: "Âge" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fv(val: number): string {
  if (!val) return "—";
  if (val >= 1e8) return `${(val / 1e8).toFixed(0)}00M€`;
  if (val >= 1e7) return `${(val / 1e7).toFixed(0)}0M€`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M€`;
  if (val >= 1e5) return `${(val / 1e5).toFixed(0)}0K€`;
  return `${Math.round(val / 1000)}K€`;
}

function fmt1(v?: number) { return v != null && v > 0 ? v.toFixed(1) : "—"; }
function fmt2(v?: number) { return v != null && v > 0 ? v.toFixed(2) : "—"; }
function pct(v?: number)  { return v != null && v > 0 ? `${v.toFixed(0)}%` : "—"; }

const FORM_CFG: Record<string, { emoji: string; color: string }> = {
  hot:     { emoji: "🔥", color: "#ef4444" },
  good:    { emoji: "⚡", color: "#22c55e" },
  neutral: { emoji: "●",  color: "#6b7c96" },
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

// ── StatBox ───────────────────────────────────────────────────────────────────

function StatBox({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg py-2 px-2"
      style={{ background: "rgba(255,255,255,0.04)", minWidth: 56 }}>
      <span className="text-sm font-black leading-none" style={{ color: color ?? "#e8edf5" }}>{value}</span>
      {sub && <span className="text-[8px] mt-0.5 font-semibold" style={{ color: color ?? "#6b7c96", opacity: 0.7 }}>{sub}</span>}
      <span className="text-[9px] mt-1 text-center leading-tight" style={{ color: "#6b7c96" }}>{label}</span>
    </div>
  );
}

function StatSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#6b7c96" }}>{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

// ── PlayerDetail ──────────────────────────────────────────────────────────────

function PlayerDetail({ p }: { p: PlayerEntry }) {
  const isGk = p.position === "Goalkeeper";
  const isDef = p.position === "Defender";
  const isMid = p.position === "Midfielder";
  const isWing = p.position === "Winger";
  const isFwd = p.position === "Centre-Forward";
  const isInj = p.status?.toLowerCase().includes("injury");
  const posColor = POS_COL[p.position] ?? "#6b7c96";
  const hasUnderstat = (p.games ?? 0) > 0;
  const hasDatamb = (p.dm_xg90 ?? 0) > 0 || (p.dm_savePct ?? 0) > 0 || (p.dm_defDuels90 ?? 0) > 0;

  return (
    <div className="border-t" style={{ borderColor: "#1e2d42", background: "#060a12" }}>
      <div className="px-4 py-3 space-y-3">

        {/* Bio */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {p.dateOfBirth && (
            <span style={{ color: "#94a3b8" }}>
              <span style={{ color: "#6b7c96" }}>Né le </span>
              {new Date(p.dateOfBirth).toLocaleDateString("fr-FR")}
              {p.age > 0 && <span style={{ color: "#6b7c96" }}> ({p.age} ans)</span>}
            </span>
          )}
          {(p.height ?? 0) > 0 && <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>Taille </span>{p.height} cm</span>}
          {p.foot && p.foot !== "" && <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>Pied </span>{p.foot}</span>}
          {p.nationality?.[0] && <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>Nat. </span>{p.nationality[0]}</span>}
          {p.signedFrom && <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>De </span>{p.signedFrom}</span>}
          {p.joinedOn && (
            <span style={{ color: "#94a3b8" }}>
              <span style={{ color: "#6b7c96" }}>Arrivé </span>
              {new Date(p.joinedOn).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
            </span>
          )}
          {p.contract && <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>Contrat → </span>{p.contract}</span>}
          {(p.marketValue ?? 0) > 0 && <span style={{ color: "#00d4ff" }}><span style={{ color: "#6b7c96" }}>Valeur </span><strong>{fv(p.marketValue)}</strong></span>}
          {isInj && <span className="flex items-center gap-1" style={{ color: "#f97316" }}><AlertTriangle size={10} /> Blessé</span>}
        </div>

        {/* Understat season */}
        {hasUnderstat && (
          <StatSection title={`Understat — Saison ${p.games} matchs · ${p.minutes} min`}>
            <StatBox label="Buts"     value={p.usGoals ?? 0}           color="#f59e0b" />
            <StatBox label="Passes D." value={p.usAssists ?? 0}        color="#00d4ff" />
            <StatBox label="xG"       value={(p.xG ?? 0).toFixed(1)}   color="#22c55e" />
            <StatBox label="xA"       value={(p.xA ?? 0).toFixed(1)}   color="#a78bfa" />
            <StatBox label="Tirs"     value={p.shots ?? 0}             color="#94a3b8" />
            {(p.shots ?? 0) > 0 && <StatBox label="xG/tir" value={((p.xG ?? 0) / p.shots!).toFixed(2)} color="#6b7c96" />}
          </StatSection>
        )}

        {/* Datamb — GK */}
        {hasDatamb && isGk && (
          <StatSection title={`Datamb per 90${p.dm_minPerMatch ? ` · ${Math.round(p.dm_minPerMatch)} min/match` : ""}`}>
            <StatBox label="Arrêts %"     value={pct(p.dm_savePct)}     color="#00d4ff" />
            <StatBox label="Buts enc./90" value={fmt2(p.dm_gcPer90)}    color="#ef4444" />
            <StatBox label="Clean sheets" value={p.dm_cleanSheets ?? 0} color="#22c55e" />
            <StatBox label="Sorties/90"   value={fmt1(p.dm_exits90)}    color="#a78bfa" />
            <StatBox label="Arrêts/90"    value={fmt1(p.dm_saves90)}    color="#00d4ff" />
            <StatBox label="Aérien %"     value={pct(p.dm_aerialPct)}   color="#f59e0b" />
          </StatSection>
        )}

        {/* Datamb — Outfield: offensive */}
        {hasDatamb && !isGk && (
          <StatSection title={`Datamb per 90${p.dm_minPerMatch ? ` · ${Math.round(p.dm_minPerMatch)} min/match` : ""}`}>
            <StatBox label="xG/90"      value={fmt2(p.dm_xg90)}          color="#22c55e" />
            <StatBox label="npxG/90"    value={fmt2(p.dm_npxg90)}        color="#22c55e" />
            <StatBox label="xA/90"      value={fmt2(p.dm_xa90)}          color="#a78bfa" />
            <StatBox label="Buts/90"    value={fmt2(p.dm_goals90)}       color="#f59e0b" />
            <StatBox label="Passes D./90" value={fmt2(p.dm_assists90)}   color="#00d4ff" />
            <StatBox label="Tirs/90"    value={fmt1(p.dm_shots90)}       color="#94a3b8" />
            {(isFwd || isWing) && <StatBox label="Tirs c./90" value={pct(p.dm_shotsOnTarget)} color="#f59e0b" />}
            {(isFwd || isWing) && <StatBox label="Conv. %"    value={pct(p.dm_goalConversion)} color="#ef4444" />}
            {(isFwd || isWing || isMid) && <StatBox label="Touches zone" value={fmt1(p.dm_touchesBox90)} color="#f97316" />}
          </StatSection>
        )}

        {/* Datamb — passes & création */}
        {hasDatamb && !isGk && (
          <StatSection title="Passes &amp; Création">
            <StatBox label="Pass %"      value={pct(p.dm_passPct)}       color="#00d4ff" />
            <StatBox label="Kp/90"       value={fmt1(p.dm_keyPasses90)}  color="#a78bfa" />
            <StatBox label="Prog./90"    value={fmt1(p.dm_progressive90)} color="#22c55e" />
            {(isMid || isDef) && <StatBox label="Croisements/90" value={fmt1(p.dm_crosses90)} color="#f59e0b" />}
            {(isMid || isDef) && <StatBox label="Précis. croix" value={pct(p.dm_crossAcc)} color="#f59e0b" />}
            {(isWing || isFwd) && <StatBox label="Drib./90"   value={fmt1(p.dm_dribbles90)} color="#f59e0b" />}
            {(isWing || isFwd) && <StatBox label="Drib. %"    value={pct(p.dm_dribblePct)}  color="#f59e0b" />}
          </StatSection>
        )}

        {/* Datamb — défense & physique */}
        {hasDatamb && !isGk && (
          <StatSection title="Défense &amp; Physique">
            <StatBox label="Duel déf./90" value={fmt1(p.dm_defDuels90)}  color="#a78bfa" />
            <StatBox label="Duel déf. %"  value={pct(p.dm_defDuelPct)}   color="#a78bfa" />
            <StatBox label="Int./90"       value={fmt2(p.dm_interceptions90)} color="#ef4444" />
            <StatBox label="Tacles/90"     value={fmt1(p.dm_tackles90)}   color="#ef4444" />
            <StatBox label="Poss. gagnées" value={fmt1(p.dm_possWon90)}   color="#22c55e" />
            <StatBox label="Duels gagnés %" value={pct(p.dm_duelsWonPct)} color="#94a3b8" />
            <StatBox label="Aérien %"      value={pct(p.dm_aerialPct)}    color="#94a3b8" />
            <StatBox label="Fautes/90"     value={fmt1(p.dm_fouls90)}     color="#f97316" />
            {(p.dm_yellowCards90 ?? 0) > 0 && <StatBox label="🟨/90" value={fmt2(p.dm_yellowCards90)} color="#f59e0b" />}
          </StatSection>
        )}

        {!hasUnderstat && !hasDatamb && (
          <p className="text-xs" style={{ color: "#6b7c96" }}>Données statistiques non disponibles cette saison.</p>
        )}

        {/* Links */}
        <div className="flex gap-2 pt-1">
          <Link href={`/club/${p.clubId}`}
            className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg font-semibold hover:opacity-80 transition-all"
            style={{ background: `${posColor}10`, border: `1px solid ${posColor}25`, color: posColor }}>
            {p.club.crest && <img src={p.club.crest} alt="" className="w-3.5 h-3.5 object-contain" />} {/* eslint-disable-line @next/next/no-img-element */}
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

// ── PlayerRow ─────────────────────────────────────────────────────────────────

function PlayerRow({ p, expanded, onToggle, rank }: {
  p: PlayerEntry; expanded: boolean; onToggle: () => void; rank?: number;
}) {
  const posColor = POS_COL[p.position] ?? "#6b7c96";
  const isInj = p.status?.toLowerCase().includes("injury");
  const fb = p.formBadge ?? "neutral";
  const fsCfg = FORM_CFG[fb] ?? FORM_CFG.neutral;
  const fs = formScore(p);

  return (
    <div className="rounded-xl overflow-hidden mb-1" style={{ border: `1px solid ${expanded ? posColor + "40" : "#1e2d42"}`, background: expanded ? "#0a0f1a" : "#0d1421" }}>
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors text-left">
        {rank != null && (
          <span className="text-[10px] font-mono w-5 flex-shrink-0 text-right" style={{ color: "#6b7c96" }}>{rank}</span>
        )}
        <span className="text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0"
          style={{ background: `${posColor}15`, color: posColor, border: `1px solid ${posColor}25` }}>
          {POS_SHORT[p.position] ?? "?"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: isInj ? "#f97316" : "#e8edf5" }}>
            {isInj && <AlertTriangle size={9} className="inline mr-1 text-orange-400" />}{p.name}
          </p>
          <p className="text-[10px] truncate" style={{ color: "#6b7c96" }}>
            {p.nationality?.[0] && <span className="mr-1.5">{p.nationality[0]}</span>}
            {p.age > 0 && <span>{p.age} ans</span>}
          </p>
        </div>
        {/* Form bar */}
        <div className="hidden sm:flex items-center gap-1 flex-shrink-0 w-12">
          <span style={{ fontSize: 9, color: fsCfg.color }}>{fsCfg.emoji}</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full" style={{ width: `${fs}%`, background: ec(fs) }} />
          </div>
        </div>
        {/* Stats inline */}
        <div className="flex items-center gap-2 flex-shrink-0 text-[10px] font-mono">
          <span style={{ color: (p.usGoals ?? 0) > 0 ? "#f59e0b" : "#4b5a72", minWidth: 22, textAlign: "right" }}>
            {(p.usGoals ?? 0) > 0 ? `⚽${p.usGoals}` : ""}
          </span>
          <span className="hidden sm:inline" style={{ color: (p.dm_xg90 ?? 0) > 0 ? "#22c55e" : "#4b5a72", minWidth: 36, textAlign: "right" }}>
            {(p.dm_xg90 ?? 0) > 0 ? `xG${p.dm_xg90!.toFixed(2)}` : ""}
          </span>
          <span className="hidden md:inline" style={{ color: (p.dm_xa90 ?? 0) > 0 ? "#a78bfa" : "#4b5a72", minWidth: 36, textAlign: "right" }}>
            {(p.dm_xa90 ?? 0) > 0 ? `xA${p.dm_xa90!.toFixed(2)}` : ""}
          </span>
          <span className="hidden lg:inline" style={{ color: (p.marketValue ?? 0) > 20e6 ? "#00d4ff" : (p.marketValue ?? 0) > 5e6 ? "#e8edf5" : "#4b5a72", minWidth: 52, textAlign: "right" }}>
            {(p.marketValue ?? 0) > 0 ? fv(p.marketValue) : ""}
          </span>
        </div>
        <span className="flex-shrink-0" style={{ color: "#6b7c96" }}>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>
      {expanded && <PlayerDetail p={p} />}
    </div>
  );
}

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
          <TrendingUp size={11} style={{ color: "#4b5a72" }} />
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
  const [allPlayers, setAllPlayers] = useState<PlayerEntry[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterClub, setFilterClub] = useState<number | "">("");
  const [filterPos, setFilterPos] = useState("");
  const [filterMinMin, setFilterMinMin] = useState(0);
  const [sortKey, setSortKey] = useState("dm_xgxa90");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let done = 0;
    const total = TEAM_IDS.length;

    TEAM_IDS.forEach(id => {
      fetch(`/api/squad/${id}`)
        .then(r => r.json())
        .then(data => {
          const players: PlayerEntry[] = (data?.squad ?? []).map(
            (p: Omit<PlayerEntry, "clubId" | "club">) => ({ ...p, clubId: id, club: data.team })
          );
          if (players.length > 0) {
            setAllPlayers(prev => [...prev, ...players]);
          }
        })
        .catch(() => {})
        .finally(() => {
          done++;
          setLoadedCount(done);
          if (done === total) setLoading(false);
        });
    });
  }, []);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    let list = allPlayers.filter(p => {
      if (q && !normalize(p.name).includes(q) &&
          !normalize(p.club.name ?? "").includes(q) &&
          !normalize(p.club.shortName ?? "").includes(q) &&
          !normalize(CLUB_SHORT[p.clubId] ?? "").includes(q) &&
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
  }, [allPlayers, search, filterClub, filterPos, filterMinMin, sortKey]);

  const isFiltered = !!(search.trim() || filterClub !== "" || filterPos || filterMinMin > 0);

  const byClub = useMemo(() =>
    TEAM_IDS
      .map(id => ({ id, players: filtered.filter(p => p.clubId === id) }))
      .filter(g => g.players.length > 0),
    [filtered]
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
            <span className="font-black text-sm" style={{ color: "#e8edf5" }}>Joueurs Ligue 1</span>
            <span className="text-xs" style={{ color: "#6b7c96" }}>
              {loading ? `Chargement… (${loadedCount}/${TEAM_IDS.length})` : `${filtered.length} / ${allPlayers.length} joueurs`}
            </span>
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg flex-shrink-0"
            style={{ background: showFilters ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: showFilters ? "#00d4ff" : "#6b7c96" }}>
            <Filter size={11} /> Filtres
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-4 pb-2.5">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7c96" }} />
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
              {TEAM_IDS.map(id => <option key={id} value={id}>{CLUB_SHORT[id]}</option>)}
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
        {loading && allPlayers.length === 0 && (
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#0d1421", border: "1px solid #1e2d42" }} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
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

        {/* Club sections (default) */}
        {!isFiltered && byClub.length > 0 && (
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
            <span>· <span style={{ color: "#6b7c96" }}>Understat</span> (totaux saison)</span>
            <span>· <span style={{ color: "#6b7c96" }}>Football-Data.org</span> (effectif)</span>
            <span className="ml-auto">{loadedCount}/{TEAM_IDS.length} clubs</span>
          </div>
        )}
      </div>
    </main>
  );
}
