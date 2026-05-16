"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown, ChevronUp, AlertTriangle, ExternalLink, Camera,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TeamInfo {
  id: number;
  name: string | null;
  shortName: string | null;
  crest: string | null;
}

export interface PlayerEntry {
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
  photoSource?: "transfermarkt" | "wikidata" | "fallback";
  photoConfidence?: "high" | "medium" | "low";
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
  // Datamb full
  dm_minutes?: number; dm_matches?: number; dm_touches90?: number;
  dm_ga90?: number; dm_npga90?: number; dm_npGoals90?: number; dm_headedGoals90?: number;
  dm_xgShot?: number; dm_npxgShot?: number; dm_npxgXa90?: number; dm_goalsMinusXg90?: number;
  dm_possLost90?: number; dm_possBalance?: number; dm_progressiveActions90?: number;
  dm_successfulDribbles90?: number; dm_offDuels90?: number; dm_offDuelPct?: number;
  dm_offDuelWon90?: number; dm_accelerations90?: number; dm_duels90?: number;
  dm_passes90?: number; dm_fwdPasses90?: number; dm_fwdPassPct?: number;
  dm_longPasses90?: number; dm_longPassAcc?: number; dm_avgPassLength?: number;
  dm_passesRec90?: number; dm_foulsSuffered90?: number;
  dm_shotAssists90?: number; dm_preAssists90?: number;
  dm_passesToFinal90?: number; dm_passFinalPct?: number;
  dm_passesToBox90?: number; dm_throughPasses90?: number; dm_throughPassPct?: number;
  dm_progressivePasses90?: number; dm_progressivePassAcc?: number;
  dm_deepCompletions90?: number; dm_xaPer100?: number;
  dm_chanceCreation?: number; dm_inaccuratePct?: number;
  dm_aerialDuels90?: number; dm_aerialWon90?: number;
  dm_shotsBlocked90?: number; dm_redCards90?: number;
  dm_gcTotal?: number; dm_xgConceded90?: number; dm_preventedGoals90?: number;
  dm_backPassesGK90?: number; dm_shotsConceded90?: number;
  // Datamb — finishing & penalties
  dm_goalsPerXg?: number; dm_shotsOnTarget90?: number;
  dm_penaltiesScored?: number; dm_penaltiesAttempted?: number;
  // Datamb — creation advanced
  dm_crossesToBox90?: number; dm_thirdAssists90?: number;
  dm_smartPasses90?: number; dm_smartPassAcc?: number;
  // Datamb — extra volume
  dm_duelsWon90?: number; dm_misplacedPasses90?: number;
  // Club
  clubId: number;
  club: TeamInfo;
}

// ── Static maps ───────────────────────────────────────────────────────────────

export const POS_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Winger", "Centre-Forward"];

export const POS_FR: Record<string, string> = {
  Goalkeeper: "Gardiens", Defender: "Défenseurs", Midfielder: "Milieux",
  Winger: "Ailiers", "Centre-Forward": "Attaquants",
};

export const POS_COL: Record<string, string> = {
  Goalkeeper: "#00d4ff", Defender: "#22c55e", Midfielder: "#a78bfa",
  Winger: "#f59e0b", "Centre-Forward": "#ef4444",
};

export const POS_SHORT: Record<string, string> = {
  Goalkeeper: "GK", Defender: "DEF", Midfielder: "MIL", Winger: "AIL", "Centre-Forward": "ATT",
};

export const CLUB_SHORT: Record<number, string> = {
  524: "PSG", 548: "Monaco", 523: "Lyon", 521: "Lille", 529: "Rennes",
  516: "Marseille", 576: "Strasbourg", 525: "Lorient", 511: "Toulouse",
  1045: "Paris FC", 512: "Brest", 532: "Angers", 533: "Le Havre",
  522: "Nice", 519: "Auxerre", 543: "Nantes", 545: "Metz", 546: "Lens",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function fv(val: number): string {
  if (!val) return "—";
  if (val >= 1e8) return `${(val / 1e8).toFixed(0)}00M€`;
  if (val >= 1e7) return `${(val / 1e7).toFixed(0)}0M€`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M€`;
  if (val >= 1e5) return `${(val / 1e5).toFixed(0)}0K€`;
  return `${Math.round(val / 1000)}K€`;
}

export function fmt1(v?: number) { return v != null && v > 0 ? v.toFixed(1) : "—"; }
export function fmt2(v?: number) { return v != null && v > 0 ? v.toFixed(2) : "—"; }
export function pct(v?: number)  { return v != null && v > 0 ? `${v.toFixed(0)}%` : "—"; }

export const FORM_CFG: Record<string, { emoji: string; color: string }> = {
  hot:     { emoji: "🔥", color: "#ef4444" },
  good:    { emoji: "⚡", color: "#22c55e" },
  neutral: { emoji: "●",  color: "#6b7c96" },
  cold:    { emoji: "❄️", color: "#94a3b8" },
};

export function ec(score: number): string {
  if (score >= 75) return "#22c55e";
  if (score >= 55) return "#86efac";
  if (score >= 40) return "#f59e0b";
  if (score >= 25) return "#f97316";
  return "#ef4444";
}

export function formScore(p: PlayerEntry): number {
  if (p.status?.toLowerCase().includes("injury")) return 20;
  const combined = (p.dm_xg90 ?? 0) + (p.dm_xa90 ?? 0);
  if (combined >= 0.6) return 90;
  if (combined >= 0.35) return 75;
  if (combined >= 0.2) return 60;
  if (combined >= 0.05) return 45;
  return p.formBadge === "hot" ? 85 : p.formBadge === "good" ? 65 : p.formBadge === "cold" ? 25 : 45;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ── PlayerPhoto ───────────────────────────────────────────────────────────────

export function PlayerPhoto({ p, size = "sm", eager = false }: { p: PlayerEntry; size?: "sm" | "lg"; eager?: boolean }) {
  const [src, setSrc] = useState(p.imageUrl ?? "");
  const [source, setSource] = useState<PlayerEntry["photoSource"]>(p.imageUrl ? "transfermarkt" : undefined);
  const [failed, setFailed] = useState(false);
  const posColor = POS_COL[p.position] ?? "#6b7c96";
  const dim = size === "lg" ? "w-24 h-24" : "w-9 h-9";
  const text = size === "lg" ? "text-xl" : "text-[11px]";

  useEffect(() => {
    if (!eager || p.imageUrl || src) return;
    const ctrl = new AbortController();
    const qs = new URLSearchParams({
      name: p.name,
      club: p.club?.name ?? p.club?.shortName ?? CLUB_SHORT[p.clubId] ?? "",
    });
    fetch(`/api/player-photo?${qs.toString()}`, { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.imageUrl) {
          setSrc(data.imageUrl);
          setSource(data.source ?? "wikidata");
        }
      })
      .catch(() => null);
    return () => ctrl.abort();
  }, [eager, p.club?.name, p.club?.shortName, p.clubId, p.imageUrl, p.name, src]);

  if (src && !failed) {
    return (
      <div className={`${dim} rounded-xl overflow-hidden flex-shrink-0 relative`}
        title={source === "wikidata" ? "Photo Wikimedia/Wikidata" : "Photo joueur"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={p.name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
        {size === "lg" && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase"
            style={{ background: "rgba(0,0,0,0.65)", color: "#e8edf5" }}>
            {source === "wikidata" ? "Commons" : "Photo"}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`${dim} rounded-xl flex items-center justify-center flex-shrink-0 font-black ${text}`}
      title="Photo non disponible"
      style={{ background: `${posColor}16`, color: posColor, border: `1px solid ${posColor}30` }}>
      {size === "lg" ? <Camera size={22} /> : initials(p.name)}
    </div>
  );
}

// ── StatBox ───────────────────────────────────────────────────────────────────

export function StatBox({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg py-2 px-2"
      style={{ background: "rgba(255,255,255,0.04)", minWidth: 56 }}>
      <span className="text-sm font-black leading-none" style={{ color: color ?? "#e8edf5" }}>{value}</span>
      {sub && <span className="text-[8px] mt-0.5 font-semibold" style={{ color: color ?? "#6b7c96", opacity: 0.7 }}>{sub}</span>}
      <span className="text-[9px] mt-1 text-center leading-tight" style={{ color: "#6b7c96" }}>{label}</span>
    </div>
  );
}

export function StatSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#6b7c96" }}>{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

// ── PlayerDetail ──────────────────────────────────────────────────────────────

export function PlayerDetail({ p }: { p: PlayerEntry }) {
  const isGk  = p.position === "Goalkeeper";
  const isDef = p.position === "Defender";
  const isMid = p.position === "Midfielder";
  const isWing = p.position === "Winger";
  const isFwd = p.position === "Centre-Forward";
  const isInj = p.status?.toLowerCase().includes("injury");
  const posColor = POS_COL[p.position] ?? "#6b7c96";
  const hasUnderstat = (p.games ?? 0) > 0;
  const hasDatamb = (p.dm_minutes ?? 0) > 0 || (p.dm_xg90 ?? 0) > 0 || (p.dm_savePct ?? 0) > 0 || (p.dm_defDuels90 ?? 0) > 0;
  const dmCtx = hasDatamb
    ? `${p.dm_matches ?? "?"} matchs · ${p.dm_minutes ?? p.minutes ?? "?"} min · ${Math.round(p.dm_minPerMatch ?? 0)} min/match`
    : "";

  // Suppress unused variable warnings for position booleans that are used conditionally
  void isMid;

  return (
    <div className="border-t" style={{ borderColor: "#1e2d42", background: "#060a12" }}>
      <div className="px-4 py-3 space-y-3">

        {/* Bio */}
        <div className="flex gap-3">
          <PlayerPhoto p={p} size="lg" eager />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg uppercase"
                style={{ background: `${posColor}15`, color: posColor, border: `1px solid ${posColor}25` }}>
                {POS_FR[p.position] ?? p.position}
              </span>
              {p.club.crest && <img src={p.club.crest} alt="" className="w-4 h-4 object-contain" />} {/* eslint-disable-line @next/next/no-img-element */}
              <span className="text-xs font-semibold" style={{ color: "#e8edf5" }}>{p.club.shortName ?? p.club.name ?? CLUB_SHORT[p.clubId]}</span>
              {isInj && <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "#f97316" }}><AlertTriangle size={10} /> Blessé</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
              <StatBox label="Forme" value={formScore(p)} color={ec(formScore(p))} sub="/100" />
              <StatBox label="Valeur" value={(p.marketValue ?? 0) > 0 ? fv(p.marketValue) : "—"} color="#00d4ff" />
              <StatBox label="Minutes" value={p.dm_minutes ?? p.minutes ?? "—"} color="#94a3b8" />
              <StatBox label="Poste" value={POS_SHORT[p.position] ?? "?"} color={posColor} />
            </div>
          </div>
        </div>

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
          {p.signedFrom && <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>Provenance </span>{p.signedFrom}</span>}
          {p.joinedOn && (
            <span style={{ color: "#94a3b8" }}>
              <span style={{ color: "#6b7c96" }}>Arrivé </span>
              {new Date(p.joinedOn).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
            </span>
          )}
          {p.contract && <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>Contrat → </span>{p.contract}</span>}
        </div>

        {/* Understat saison */}
        {hasUnderstat && (
          <StatSection title={`Understat — Saison · ${p.games} matchs · ${p.minutes} min`}>
            <StatBox label="Buts"      value={p.usGoals ?? 0}                           color="#f59e0b" />
            <StatBox label="Passes D." value={p.usAssists ?? 0}                         color="#00d4ff" />
            <StatBox label="xG"        value={(p.xG ?? 0).toFixed(1)}                   color="#22c55e" />
            <StatBox label="xA"        value={(p.xA ?? 0).toFixed(1)}                   color="#a78bfa" />
            <StatBox label="Tirs"      value={p.shots ?? 0}                             color="#94a3b8" />
            {(p.shots ?? 0) > 0 && <StatBox label="xG/tir" value={((p.xG ?? 0) / p.shots!).toFixed(3)} color="#6b7c96" />}
          </StatSection>
        )}

        {/* ── GK ── */}
        {hasDatamb && isGk && (<>
          <StatSection title={`Gardien — ${dmCtx}`}>
            <StatBox label="Arrêts %"       value={pct(p.dm_savePct)}          color="#00d4ff" />
            <StatBox label="Arrêts/90"      value={fmt1(p.dm_saves90)}         color="#00d4ff" />
            <StatBox label="Buts enc./90"   value={fmt2(p.dm_gcPer90)}         color="#ef4444" />
            <StatBox label="Buts enc. tot." value={p.dm_gcTotal ?? 0}          color="#ef4444" />
            <StatBox label="xG enc./90"     value={fmt2(p.dm_xgConceded90)}    color="#f97316" />
            <StatBox label="Buts prévenus"  value={fmt2(p.dm_preventedGoals90)} color="#22c55e" />
            <StatBox label="Clean sheets"   value={p.dm_cleanSheets ?? 0}      color="#22c55e" />
            <StatBox label="Sorties/90"     value={fmt1(p.dm_exits90)}         color="#a78bfa" />
            <StatBox label="Passes dos/90"  value={fmt1(p.dm_backPassesGK90)}  color="#94a3b8" />
            <StatBox label="Tirs conc./90"  value={fmt1(p.dm_shotsConceded90)} color="#6b7c96" />
          </StatSection>
          <StatSection title="GK — Jeu au pied">
            <StatBox label="Pass %"         value={pct(p.dm_passPct)}          color="#00d4ff" />
            <StatBox label="Passes/90"      value={fmt1(p.dm_passes90)}        color="#94a3b8" />
            <StatBox label="Longues/90"     value={fmt1(p.dm_longPasses90)}    color="#94a3b8" />
            <StatBox label="Long. %"        value={pct(p.dm_longPassAcc)}      color="#94a3b8" />
            <StatBox label="Long. moy. (m)" value={fmt1(p.dm_avgPassLength)}   color="#6b7c96" />
          </StatSection>
          <StatSection title="GK — Physique">
            <StatBox label="Aérien/90"      value={fmt1(p.dm_aerialDuels90)}   color="#f59e0b" />
            <StatBox label="Aérien %"       value={pct(p.dm_aerialPct)}        color="#f59e0b" />
            <StatBox label="Poss. gagnées"  value={fmt1(p.dm_possWon90)}       color="#22c55e" />
            <StatBox label="Touches/90"     value={fmt1(p.dm_touches90)}       color="#6b7c96" />
          </StatSection>
        </>)}

        {/* ── Outfield ── */}
        {hasDatamb && !isGk && (<>

          {/* 1. Vue d'ensemble */}
          <StatSection title={`Vue d'ensemble — ${dmCtx}`}>
            <StatBox label="G+A/90"         value={fmt2(p.dm_ga90)}            color="#f59e0b" />
            <StatBox label="npG+A/90"       value={fmt2(p.dm_npga90)}          color="#f59e0b" />
            <StatBox label="xG+xA/90"       value={fmt2(p.dm_xgxa90)}          color="#22c55e" />
            <StatBox label="npxG+xA/90"     value={fmt2(p.dm_npxgXa90)}        color="#22c55e" />
            <StatBox label="Touches/90"     value={fmt1(p.dm_touches90)}       color="#6b7c96" />
            <StatBox label="Act. prog./90"  value={fmt1(p.dm_progressiveActions90)} color="#a78bfa" />
            <StatBox label="Poss. +/-"      value={fmt1(p.dm_possBalance)}     color={(p.dm_possBalance ?? 0) >= 0 ? "#22c55e" : "#ef4444"} />
          </StatSection>

          {/* 2. Attaque */}
          <StatSection title="Attaque">
            <StatBox label="Buts/90"        value={fmt2(p.dm_goals90)}         color="#f59e0b" />
            <StatBox label="np Buts/90"     value={fmt2(p.dm_npGoals90)}       color="#f59e0b" />
            <StatBox label="xG/90"          value={fmt2(p.dm_xg90)}            color="#22c55e" />
            <StatBox label="npxG/90"        value={fmt2(p.dm_npxg90)}          color="#22c55e" />
            <StatBox label="xG - Buts/90"   value={fmt2(p.dm_goalsMinusXg90)}  color={(p.dm_goalsMinusXg90 ?? 0) >= 0 ? "#22c55e" : "#ef4444"} />
            <StatBox label="Tirs/90"        value={fmt1(p.dm_shots90)}         color="#94a3b8" />
            <StatBox label="Cadrés %"       value={pct(p.dm_shotsOnTarget)}    color="#f59e0b" />
            <StatBox label="Conv. %"        value={pct(p.dm_goalConversion)}   color="#ef4444" />
            <StatBox label="Buts/xG" value={fmt2(p.dm_goalsPerXg)} color={(p.dm_goalsPerXg ?? 0) >= 1 ? "#22c55e" : "#f59e0b"} />
            <StatBox label="Cadrés/90" value={fmt1(p.dm_shotsOnTarget90)} color="#f59e0b" />
            {(p.dm_penaltiesAttempted ?? 0) > 0 && <StatBox label="Pen. tentés" value={p.dm_penaltiesAttempted ?? 0} color="#f97316" />}
            {(p.dm_penaltiesScored ?? 0) > 0 && <StatBox label="Pen. inscrits" value={p.dm_penaltiesScored ?? 0} color="#22c55e" />}
            <StatBox label="xG/tir"         value={fmt2(p.dm_xgShot)}          color="#6b7c96" />
            <StatBox label="npxG/tir"       value={fmt2(p.dm_npxgShot)}        color="#6b7c96" />
            {!isDef && <StatBox label="Touches zone" value={fmt1(p.dm_touchesBox90)} color="#f97316" />}
            {(isFwd || isWing) && <StatBox label="Buts tête/90" value={fmt2(p.dm_headedGoals90)} color="#94a3b8" />}
          </StatSection>

          {/* 3. Création */}
          <StatSection title="Création">
            <StatBox label="xA/90"          value={fmt2(p.dm_xa90)}            color="#a78bfa" />
            <StatBox label="Passes D./90"   value={fmt2(p.dm_assists90)}       color="#00d4ff" />
            <StatBox label="Shot assists/90" value={fmt1(p.dm_shotAssists90)}  color="#a78bfa" />
            <StatBox label="Pré-passes D./90" value={fmt1(p.dm_preAssists90)}  color="#a78bfa" />
            <StatBox label="Passes clés/90" value={fmt1(p.dm_keyPasses90)}     color="#a78bfa" />
            <StatBox label="xA/100 passes"  value={fmt2(p.dm_xaPer100)}        color="#a78bfa" />
            <StatBox label="Ratio création" value={fmt2(p.dm_chanceCreation)}  color="#a78bfa" />
            <StatBox label="Passes prof./90" value={fmt1(p.dm_deepCompletions90)} color="#22c55e" />
            <StatBox label="Crosses/90"     value={fmt1(p.dm_crosses90)}       color="#f59e0b" />
            <StatBox label="Cross. prec. %" value={pct(p.dm_crossAcc)}         color="#f59e0b" />
            <StatBox label="Crosses box/90" value={fmt1(p.dm_crossesToBox90)} color="#f59e0b" />
            <StatBox label="3e PD/90" value={fmt1(p.dm_thirdAssists90)} color="#a78bfa" />
            <StatBox label="Smart/90" value={fmt1(p.dm_smartPasses90)} color="#22c55e" />
            <StatBox label="Smart %" value={pct(p.dm_smartPassAcc)} color="#22c55e" />
          </StatSection>

          {/* 4. Dribbles & duels offensifs */}
          <StatSection title="Dribbles &amp; Duels offensifs">
            <StatBox label="Drib. tentés/90"  value={fmt1(p.dm_dribbles90)}       color="#f59e0b" />
            <StatBox label="Drib. réussis/90" value={fmt1(p.dm_successfulDribbles90)} color="#f59e0b" />
            <StatBox label="Drib. %"          value={pct(p.dm_dribblePct)}        color="#f59e0b" />
            <StatBox label="Duels off./90"    value={fmt1(p.dm_offDuels90)}       color="#f97316" />
            <StatBox label="Duels off. %"     value={pct(p.dm_offDuelPct)}        color="#f97316" />
            <StatBox label="Duels off. gagnés" value={fmt1(p.dm_offDuelWon90)}    color="#f97316" />
            <StatBox label="Accélérations/90" value={fmt1(p.dm_accelerations90)}  color="#94a3b8" />
            <StatBox label="Portés prog./90"  value={fmt1(p.dm_progressive90)}    color="#22c55e" />
          </StatSection>

          {/* 5. Passes */}
          <StatSection title="Passes">
            <StatBox label="Passes/90"      value={fmt1(p.dm_passes90)}        color="#00d4ff" />
            <StatBox label="Pass %"         value={pct(p.dm_passPct)}          color="#00d4ff" />
            <StatBox label="Imprécis %"     value={pct(p.dm_inaccuratePct)}    color="#ef4444" />
            <StatBox label="Avant/90"       value={fmt1(p.dm_fwdPasses90)}     color="#22c55e" />
            <StatBox label="Avant %"        value={pct(p.dm_fwdPassPct)}       color="#22c55e" />
            <StatBox label="Longues/90"     value={fmt1(p.dm_longPasses90)}    color="#94a3b8" />
            <StatBox label="Longues %"      value={pct(p.dm_longPassAcc)}      color="#94a3b8" />
            <StatBox label="Long. moy. (m)" value={fmt1(p.dm_avgPassLength)}   color="#6b7c96" />
            <StatBox label="Prog./90"       value={fmt1(p.dm_progressivePasses90)} color="#a78bfa" />
            <StatBox label="Prog. %"        value={pct(p.dm_progressivePassAcc)} color="#a78bfa" />
            <StatBox label="Tiers final/90" value={fmt1(p.dm_passesToFinal90)} color="#22c55e" />
            <StatBox label="T. final %"     value={pct(p.dm_passFinalPct)}     color="#22c55e" />
            <StatBox label="Vers box/90"    value={fmt1(p.dm_passesToBox90)}   color="#f59e0b" />
            <StatBox label="Déchirantes/90" value={fmt1(p.dm_throughPasses90)} color="#f59e0b" />
            <StatBox label="Déch. %"        value={pct(p.dm_throughPassPct)}   color="#f59e0b" />
            <StatBox label="Reçues/90"      value={fmt1(p.dm_passesRec90)}     color="#6b7c96" />
          </StatSection>

          {/* 6. Défense */}
          <StatSection title="Défense">
            <StatBox label="Duels déf./90"  value={fmt1(p.dm_defDuels90)}      color="#a78bfa" />
            <StatBox label="Duels déf. %"   value={pct(p.dm_defDuelPct)}       color="#a78bfa" />
            <StatBox label="Duels tot./90"  value={fmt1(p.dm_duels90)}         color="#94a3b8" />
            <StatBox label="Duels gagnés %" value={pct(p.dm_duelsWonPct)}      color="#94a3b8" />
            <StatBox label="Int./90"        value={fmt2(p.dm_interceptions90)} color="#ef4444" />
            <StatBox label="Tacles/90"      value={fmt1(p.dm_tackles90)}       color="#ef4444" />
            {isDef && <StatBox label="Tirs bloqués/90" value={fmt1(p.dm_shotsBlocked90)} color="#ef4444" />}
            <StatBox label="Aérien/90"      value={fmt1(p.dm_aerialDuels90)}   color="#f59e0b" />
            <StatBox label="Aérien gagné/90" value={fmt1(p.dm_aerialWon90)}    color="#f59e0b" />
            <StatBox label="Aérien %"       value={pct(p.dm_aerialPct)}        color="#f59e0b" />
            <StatBox label="Poss. gagnées"  value={fmt1(p.dm_possWon90)}       color="#22c55e" />
            <StatBox label="Poss. perdues"  value={fmt1(p.dm_possLost90)}      color="#ef4444" />
            <StatBox label="Duels gagnés/90" value={fmt1(p.dm_duelsWon90)} color="#94a3b8" />
          </StatSection>

          {/* 7. Discipline */}
          <StatSection title="Discipline">
            <StatBox label="Fautes/90"      value={fmt1(p.dm_fouls90)}         color="#f97316" />
            <StatBox label="Fautes subies"  value={fmt1(p.dm_foulsSuffered90)} color="#94a3b8" />
            <StatBox label="Jaunes/90"      value={fmt2(p.dm_yellowCards90)}   color="#f59e0b" />
            {(p.dm_redCards90 ?? 0) > 0 && <StatBox label="Rouges/90" value={fmt2(p.dm_redCards90)} color="#ef4444" />}
          </StatSection>

        </>)}

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
          <a href={`https://www.wikidata.org/w/index.php?search=${encodeURIComponent(`${p.name} ${p.club.shortName ?? p.club.name ?? ""} footballer`)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg hover:opacity-80 transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7c96" }}>
            Photo/Wikidata <ExternalLink size={8} />
          </a>
        </div>
      </div>
    </div>
  );
}

// ── PlayerRow ─────────────────────────────────────────────────────────────────

export function PlayerRow({ p, expanded, onToggle, rank }: {
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
        <PlayerPhoto p={p} eager={expanded} />
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
