"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Trophy, Heart, ChevronRight, X, TrendingUp, TrendingDown, Minus, Users, Calendar, Zap, RefreshCw, Shield, BarChart2 } from "lucide-react";

/* ─────────────────────────────── Club definitions ──────────────────────────── */

interface Club {
  id: number;
  name: string;
  shortName: string;
  crest: string;
  color: string;
  color2?: string;
}

const L1_CLUBS: Club[] = [
  { id: 524,  name: "Paris Saint-Germain", shortName: "PSG",        crest: "https://crests.football-data.org/524.png",  color: "#004494", color2: "#DA0000" },
  { id: 548,  name: "AS Monaco",           shortName: "Monaco",     crest: "https://crests.football-data.org/548.png",  color: "#E03A24", color2: "#FFFFFF" },
  { id: 516,  name: "Olympique Marseille", shortName: "Marseille",  crest: "https://crests.football-data.org/516.png",  color: "#2FAEE0", color2: "#FFFFFF" },
  { id: 521,  name: "Lille OSC",           shortName: "Lille",      crest: "https://crests.football-data.org/521.png",  color: "#C8003B", color2: "#FFFFFF" },
  { id: 529,  name: "Stade Rennais",       shortName: "Rennes",     crest: "https://crests.football-data.org/529.png",  color: "#E10600", color2: "#1E2D42" },
  { id: 522,  name: "OGC Nice",            shortName: "Nice",       crest: "https://crests.football-data.org/522.png",  color: "#C40026", color2: "#000000" },
  { id: 546,  name: "RC Lens",             shortName: "Lens",       crest: "https://crests.football-data.org/546.png",  color: "#E8B400", color2: "#DA0000" },
  { id: 523,  name: "Olympique Lyonnais",  shortName: "Lyon",       crest: "https://crests.football-data.org/523.png",  color: "#1032BC", color2: "#E40613" },
  { id: 576,  name: "RC Strasbourg",       shortName: "Strasbourg", crest: "https://crests.football-data.org/576.png",  color: "#2965A4", color2: "#EDBA3B" },
  { id: 511,  name: "Toulouse FC",         shortName: "Toulouse",   crest: "https://crests.football-data.org/511.png",  color: "#7E1F86", color2: "#FFFFFF" },
  { id: 512,  name: "Stade Brestois",      shortName: "Brest",      crest: "https://crests.football-data.org/512.png",  color: "#DC001A", color2: "#2F4E8B" },
  { id: 532,  name: "Angers SCO",          shortName: "Angers",     crest: "https://crests.football-data.org/532.png",  color: "#2A2A2A", color2: "#FFFFFF" },
  { id: 533,  name: "Le Havre AC",         shortName: "Le Havre",   crest: "https://crests.football-data.org/533.png",  color: "#003380", color2: "#FFFFFF" },
  { id: 519,  name: "AJ Auxerre",          shortName: "Auxerre",    crest: "https://crests.football-data.org/519.png",  color: "#001F5B", color2: "#FFFFFF" },
  { id: 543,  name: "FC Nantes",           shortName: "Nantes",     crest: "https://crests.football-data.org/543.png",  color: "#E8AF00", color2: "#1B4494" },
  { id: 545,  name: "FC Metz",             shortName: "Metz",       crest: "https://crests.football-data.org/545.png",  color: "#9E1931", color2: "#F0A500" },
  { id: 525,  name: "FC Lorient",          shortName: "Lorient",    crest: "https://crests.football-data.org/525.png",  color: "#E06300", color2: "#1F2E6E" },
  { id: 1045, name: "Paris FC",            shortName: "Paris FC",   crest: "https://crests.football-data.org/1045.png", color: "#003087", color2: "#D72020" },
];

/* ─────────────────────────────── Zone config ───────────────────────────────── */

const ZONE_CONFIG = [
  { label: "Champion",            positions: [1],          color: "#60a5fa", bg: "rgba(96,165,250,0.1)"  },
  { label: "Ligue des Champions", positions: [2, 3],       color: "#34d399", bg: "rgba(52,211,153,0.1)"  },
  { label: "Ligue Europa",        positions: [4],          color: "#fbbf24", bg: "rgba(251,191,36,0.1)"  },
  { label: "Conférence League",   positions: [5],          color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  { label: "Zone de relégation",  positions: [16, 17, 18], color: "#f87171", bg: "rgba(248,113,113,0.1)" },
];

function getZone(pos: number) {
  return ZONE_CONFIG.find(z => z.positions.includes(pos)) ?? null;
}

/* ─────────────────────────────── Interfaces ────────────────────────────────── */

interface Standing {
  position: number;
  team: { id: number; name: string; shortName: string; tla: string; crest: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string;
}

interface SquadPlayer {
  id: string;
  name: string;
  position: string;
  age: number;
  nationality: string[];
  marketValue: number;
  usGoals?: number;
  usAssists?: number;
  xG?: number;
  xA?: number;
  games?: number;
  dm_xg90?: number;
  dm_xa90?: number;
  formBadge?: "hot" | "good" | "neutral" | "cold";
  imageUrl?: string;
}

interface RecentResult {
  id: number;
  date: string;
  homeTeam: { name: string; shortName: string; tla: string; crest: string };
  awayTeam: { name: string; shortName: string; tla: string; crest: string };
  score: { home: number; away: number };
  result: "home" | "away" | "draw";
}

/* ─────────────────────────────── Helpers ───────────────────────────────────── */

function normName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function teamMatchesClub(teamName: string, club: Club): boolean {
  const t = normName(teamName);
  const s = normName(club.shortName);
  const n = normName(club.name);
  return t.includes(s) || s.includes(t) || t.includes(n) || n.includes(t);
}

function resultForClub(match: RecentResult, club: Club): "V" | "N" | "D" | null {
  const isHome = teamMatchesClub(match.homeTeam.name, club) || teamMatchesClub(match.homeTeam.shortName, club);
  const isAway = teamMatchesClub(match.awayTeam.name, club) || teamMatchesClub(match.awayTeam.shortName, club);
  if (!isHome && !isAway) return null;
  if (match.result === "draw") return "N";
  if ((isHome && match.result === "home") || (isAway && match.result === "away")) return "V";
  return "D";
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function fmtValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M€`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k€`;
  return `${v}€`;
}

/* ─────────────────────────────── Sub-components ───────────────────────────── */

function FormDot({ r }: { r: "V" | "N" | "D" }) {
  const cfg = { V: { bg: "#22c55e", label: "V" }, N: { bg: "#f59e0b", label: "N" }, D: { bg: "#ef4444", label: "D" } }[r];
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-black"
      style={{ background: `${cfg.bg}22`, border: `1.5px solid ${cfg.bg}`, color: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl p-4 gap-1"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e2d42" }}>
      <span className="text-2xl font-black" style={{ color: color ?? "#e8edf5" }}>{value}</span>
      {sub && <span className="text-xs font-mono" style={{ color: color ? `${color}99` : "#94a3b8" }}>{sub}</span>}
      <span className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: "#6b7c96" }}>{label}</span>
    </div>
  );
}

function PosBadge({ pos }: { pos: string }) {
  const map: Record<string, { label: string; color: string }> = {
    Goalkeeper:       { label: "GB",  color: "#f59e0b" },
    Defender:         { label: "DEF", color: "#3b82f6" },
    Midfielder:       { label: "MIL", color: "#a78bfa" },
    Winger:           { label: "AIL", color: "#34d399" },
    "Centre-Forward": { label: "ATT", color: "#ef4444" },
  };
  const cfg = map[pos] ?? { label: pos?.slice(0, 3).toUpperCase() ?? "?", color: "#6b7c96" };
  return (
    <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
      style={{ background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}44` }}>
      {cfg.label}
    </span>
  );
}

function FormBadgeIcon({ fb }: { fb?: string }) {
  if (fb === "hot")     return <span className="text-xs">🔥</span>;
  if (fb === "good")    return <span className="text-xs">⚡</span>;
  if (fb === "cold")    return <span className="text-xs">🩹</span>;
  return <span className="text-xs opacity-40">—</span>;
}

/* ─────────────────────────────── Club Selector ─────────────────────────────── */

function ClubSelector({ onSelect }: { onSelect: (club: Club) => void }) {
  return (
    <div>
      {/* Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
          <Heart size={28} style={{ color: "#f87171" }} />
        </div>
        <h2 className="text-2xl font-black mb-2" style={{ color: "#e8edf5" }}>Choisissez votre club de cœur</h2>
        <p className="text-sm" style={{ color: "#6b7c96" }}>
          Votre tableau de bord personnalisé Ligue 1, en un seul endroit.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {L1_CLUBS.map(club => (
          <button key={club.id} onClick={() => onSelect(club)}
            className="group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: "#0d1421", border: "1px solid #1e2d42" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = club.color;
              (e.currentTarget as HTMLButtonElement).style.background = `${club.color}18`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#1e2d42";
              (e.currentTarget as HTMLButtonElement).style.background = "#0d1421";
            }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={club.crest} alt={club.shortName} className="w-12 h-12 object-contain" loading="lazy" />
            <span className="text-xs font-semibold text-center leading-tight" style={{ color: "#94a3b8" }}>
              {club.shortName}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────── Dashboard ─────────────────────────────────── */

function ClubDashboard({ club, onChangeClub }: { club: Club; onChangeClub: () => void }) {
  const [standing, setStanding] = useState<Standing | null>(null);
  const [squad, setSquad]       = useState<SquadPlayer[]>([]);
  const [results, setResults]   = useState<RecentResult[]>([]);
  const [loading, setLoading]   = useState(true);
  const [squadLoading, setSquadLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"apercu" | "effectif" | "resultats">("apercu");

  const loadData = useCallback(async () => {
    setLoading(true);
    // Standings + results in parallel
    const [standRes, resultRes] = await Promise.allSettled([
      fetch("/api/standings?t=" + Date.now()).then(r => r.json()),
      fetch("/api/results?limit=30").then(r => r.json()),
    ]);
    if (standRes.status === "fulfilled" && !standRes.value.error) {
      const found = (standRes.value.standings as Standing[]).find(s => s.team.id === club.id);
      setStanding(found ?? null);
    }
    if (resultRes.status === "fulfilled" && !resultRes.value.error) {
      const filtered = (resultRes.value.matches as RecentResult[])
        .filter(m => resultForClub(m, club) !== null)
        .slice(0, 8);
      setResults(filtered);
    }
    setLoading(false);
  }, [club]);

  const loadSquad = useCallback(async () => {
    setSquadLoading(true);
    try {
      const res = await fetch(`/api/squad/${club.id}`);
      if (res.ok) {
        const data = await res.json();
        setSquad(data.squad ?? []);
      }
    } catch { /* ignore */ }
    setSquadLoading(false);
  }, [club.id]);

  useEffect(() => {
    loadData();
    loadSquad();
  }, [loadData, loadSquad]);

  const zone = standing ? getZone(standing.position) : null;
  const formArr = standing?.form ? standing.form.split(",").filter(Boolean).slice(-5) : [];

  // Map form results to FR labels
  const formFR = formArr.map(r => r === "W" ? "V" : r === "L" ? "D" : "N") as ("V" | "N" | "D")[];

  // Top players sorted by xG+xA
  const topPlayers = [...squad]
    .filter(p => p.position !== "Goalkeeper")
    .sort((a, b) => ((b.xG ?? 0) + (b.xA ?? 0)) - ((a.xG ?? 0) + (a.xA ?? 0)))
    .slice(0, 8);

  const topGK = squad.filter(p => p.position === "Goalkeeper")[0];
  const displaySquad = topGK ? [topGK, ...topPlayers] : topPlayers;

  // Season progress
  const gamesPlayed = standing?.playedGames ?? 0;
  const totalGames = 34;
  const progressPct = Math.round((gamesPlayed / totalGames) * 100);

  // Win rate
  const winRate = gamesPlayed > 0 ? Math.round(((standing?.won ?? 0) / gamesPlayed) * 100) : 0;

  const SECTIONS = [
    { id: "apercu" as const,    label: "Aperçu",   icon: <BarChart2 size={13} /> },
    { id: "effectif" as const,  label: "Effectif", icon: <Users size={13} /> },
    { id: "resultats" as const, label: "Résultats récents", icon: <Calendar size={13} /> },
  ];

  return (
    <div>
      {/* ── Hero Banner ── */}
      <div className="rounded-2xl overflow-hidden mb-5 relative"
        style={{
          background: `linear-gradient(135deg, ${club.color}28 0%, #0d1421 55%, ${club.color2 ? club.color2 + "12" : "#080c14"} 100%)`,
          border: `1px solid ${club.color}44`,
        }}>
        {/* Top gradient accent */}
        <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, ${club.color}, ${club.color2 ?? club.color}88, transparent)` }} />

        <div className="px-5 py-5 flex items-center gap-4">
          {/* Crest */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: `${club.color}1a`, border: `1.5px solid ${club.color}44` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={club.crest} alt={club.shortName} className="w-16 h-16 object-contain" loading="lazy" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "#f87171", border: "2px solid #080c14" }}>
              <Heart size={9} fill="#fff" color="#fff" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: club.color }}>
              Mon Club • Ligue 1
            </p>
            <h1 className="text-xl font-black leading-tight mb-1" style={{ color: "#e8edf5" }}>
              {club.name}
            </h1>
            {/* Position */}
            {standing && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-black"
                  style={{ background: zone ? zone.bg : "rgba(255,255,255,0.05)", color: zone ? zone.color : "#94a3b8", border: `1px solid ${zone ? zone.color + "44" : "#1e2d42"}` }}>
                  {standing.position === 1 ? <Trophy size={12} /> : <Shield size={12} />}
                  {standing.position === 1 ? "Champion" : `${standing.position}e`}
                </span>
                {zone && standing.position !== 1 && (
                  <span className="text-xs font-medium" style={{ color: zone.color }}>{zone.label}</span>
                )}
                <span className="text-xs font-black ml-1" style={{ color: "#e8edf5" }}>
                  {standing.points} pts
                </span>
              </div>
            )}
            {loading && !standing && (
              <div className="h-6 w-32 rounded animate-pulse" style={{ background: "#1e2d42" }} />
            )}
          </div>

          {/* Change club btn */}
          <button onClick={onChangeClub}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold hover:opacity-80 transition-all flex-shrink-0 self-start"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#94a3b8" }}>
            <X size={11} /> Changer
          </button>
        </div>

        {/* Progress bar */}
        {standing && (
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "#6b7c96" }}>
              <span>Progression saison</span>
              <span className="font-semibold" style={{ color: "#94a3b8" }}>{gamesPlayed} / {totalGames} matchs</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${club.color}, ${club.color2 ?? club.color})` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Section tabs ── */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: "#0a0f1c", border: "1px solid #1a2235" }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0"
            style={{
              background: activeSection === s.id ? "rgba(255,255,255,0.08)" : "transparent",
              color: activeSection === s.id ? "#e2e8f0" : "#64748b",
              border: activeSection === s.id ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
            }}>
            {s.icon} {s.label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => { loadData(); loadSquad(); }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs hover:opacity-80 transition-all"
          style={{ color: "#6b7c96" }}>
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ─── APERÇU ─── */}
      {activeSection === "apercu" && (
        <div className="space-y-5">
          {/* Stats grid */}
          {loading ? (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl h-20 animate-pulse" style={{ background: "#0d1421", border: "1px solid #1e2d42" }} />
              ))}
            </div>
          ) : standing ? (
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Points" value={standing.points} color={club.color} />
              <StatCard label="Victoires" value={standing.won} sub={`${winRate}%`} color="#22c55e" />
              <StatCard label="Buts" value={standing.goalsFor} sub={`-${standing.goalsAgainst}`} color="#f59e0b" />
              <StatCard label="Diff. buts" value={standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference} color={standing.goalDifference >= 0 ? "#34d399" : "#f87171"} />
            </div>
          ) : null}

          {/* V/N/D row */}
          {standing && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <div className="text-3xl font-black" style={{ color: "#22c55e" }}>{standing.won}</div>
                <div className="text-xs font-bold mt-1" style={{ color: "#22c55e" }}>Victoires</div>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <div className="text-3xl font-black" style={{ color: "#f59e0b" }}>{standing.draw}</div>
                <div className="text-xs font-bold mt-1" style={{ color: "#f59e0b" }}>Nuls</div>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <div className="text-3xl font-black" style={{ color: "#ef4444" }}>{standing.lost}</div>
                <div className="text-xs font-bold mt-1" style={{ color: "#ef4444" }}>Défaites</div>
              </div>
            </div>
          )}

          {/* Form */}
          {formFR.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#6b7c96" }}>
                Derniers matchs
              </p>
              <div className="flex items-center gap-2">
                {formFR.map((r, i) => <FormDot key={i} r={r} />)}
                <div className="ml-3 flex items-center gap-1.5 text-sm">
                  {formFR[formFR.length - 1] === "V" ? (
                    <><TrendingUp size={14} className="text-green-400" /><span className="text-green-400 font-semibold">En forme</span></>
                  ) : formFR[formFR.length - 1] === "D" ? (
                    <><TrendingDown size={14} className="text-red-400" /><span className="text-red-400 font-semibold">Difficile</span></>
                  ) : (
                    <><Minus size={14} className="text-yellow-400" /><span className="text-yellow-400 font-semibold">Stable</span></>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Zone card */}
          {standing && zone && (
            <div className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: zone.bg, border: `1px solid ${zone.color}33` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${zone.color}22`, border: `1px solid ${zone.color}44` }}>
                <Trophy size={18} style={{ color: zone.color }} />
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: zone.color }}>{zone.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
                  Position actuelle : {standing.position}e en Ligue 1
                </p>
              </div>
            </div>
          )}

          {/* Quick results preview (3 last) */}
          {results.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42" }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#0d1421", borderBottom: "1px solid #1e2d42" }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#6b7c96" }}>Derniers résultats</p>
                <button onClick={() => setActiveSection("resultats")}
                  className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                  style={{ color: club.color }}>
                  Tout voir <ChevronRight size={11} />
                </button>
              </div>
              {results.slice(0, 3).map(m => {
                const r = resultForClub(m, club)!;
                const isHome = teamMatchesClub(m.homeTeam.name, club) || teamMatchesClub(m.homeTeam.shortName, club);
                const opponent = isHome ? m.awayTeam : m.homeTeam;
                const scoreDisplay = isHome
                  ? `${m.score.home} – ${m.score.away}`
                  : `${m.score.away} – ${m.score.home}`;
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: "1px solid rgba(30,45,66,0.4)" }}>
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black`}
                      style={{
                        background: r === "V" ? "rgba(34,197,94,0.15)" : r === "D" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                        color: r === "V" ? "#22c55e" : r === "D" ? "#ef4444" : "#f59e0b",
                      }}>
                      {r}
                    </span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={opponent.crest} alt={opponent.shortName} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
                      <span className="text-sm font-medium truncate" style={{ color: "#94a3b8" }}>
                        {isHome ? "vs" : "@"} {opponent.shortName}
                      </span>
                    </div>
                    <span className="font-black text-sm" style={{ color: "#e8edf5" }}>{scoreDisplay}</span>
                    <span className="text-xs hidden sm:block" style={{ color: "#6b7c96" }}>{fmtDate(m.date)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── EFFECTIF ─── */}
      {activeSection === "effectif" && (
        <div>
          {squadLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "#0d1421", border: "1px solid #1e2d42" }} />
              ))}
            </div>
          ) : displaySquad.length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: "#6b7c96" }}>
              Données d&apos;effectif indisponibles
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42" }}>
              {/* Header */}
              <div className="grid px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest"
                style={{
                  gridTemplateColumns: "1fr 60px 40px 50px 50px 60px",
                  background: "#0d1421",
                  borderBottom: "1px solid #1e2d42",
                  color: "#6b7c96",
                }}>
                <span>Joueur</span>
                <span className="text-center">Pos</span>
                <span className="text-center">Âge</span>
                <span className="text-center">Buts</span>
                <span className="text-center">PD</span>
                <span className="text-center hidden sm:block">Valeur</span>
              </div>
              {displaySquad.map((p, idx) => (
                <div key={p.id} className="grid items-center px-4 py-3 hover:bg-white/[0.02] transition-colors"
                  style={{
                    gridTemplateColumns: "1fr 60px 40px 50px 50px 60px",
                    borderBottom: idx < displaySquad.length - 1 ? "1px solid rgba(30,45,66,0.4)" : "none",
                  }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <FormBadgeIcon fb={p.formBadge} />
                    <span className="text-sm font-semibold truncate" style={{ color: "#e8edf5" }}>{p.name}</span>
                  </div>
                  <div className="flex justify-center"><PosBadge pos={p.position} /></div>
                  <span className="text-center text-xs font-mono" style={{ color: "#6b7c96" }}>{p.age || "—"}</span>
                  <span className="text-center text-sm font-black" style={{ color: "#22c55e" }}>
                    {p.usGoals ?? (p.xG ? Math.round(p.xG) : "—")}
                  </span>
                  <span className="text-center text-sm font-black" style={{ color: "#60a5fa" }}>
                    {p.usAssists ?? (p.xA ? Math.round(p.xA) : "—")}
                  </span>
                  <span className="hidden sm:block text-center text-xs font-mono" style={{ color: "#6b7c96" }}>
                    {p.marketValue ? fmtValue(p.marketValue) : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* xG leaders */}
          {!squadLoading && topPlayers.some(p => (p.xG ?? 0) > 0) && (
            <div className="mt-4 rounded-2xl p-4" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#6b7c96" }}>
                <Zap size={11} className="inline mr-1" style={{ color: club.color }} />
                Top xG + xA (saison)
              </p>
              <div className="space-y-2">
                {topPlayers.slice(0, 5).filter(p => (p.xG ?? 0) + (p.xA ?? 0) > 0).map((p) => {
                  const total = (p.xG ?? 0) + (p.xA ?? 0);
                  const maxTotal = Math.max(...topPlayers.map(x => (x.xG ?? 0) + (x.xA ?? 0)), 1);
                  const pct = Math.round((total / maxTotal) * 100);
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="text-xs font-medium w-28 truncate flex-shrink-0" style={{ color: "#94a3b8" }}>{p.name}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${club.color}, ${club.color2 ?? club.color}99)` }} />
                      </div>
                      <span className="text-xs font-black w-10 text-right flex-shrink-0" style={{ color: club.color }}>
                        {total.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── RÉSULTATS ─── */}
      {activeSection === "resultats" && (
        <div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#0d1421", border: "1px solid #1e2d42" }} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: "#6b7c96" }}>
              Aucun résultat récent trouvé
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42" }}>
              {results.map((m, idx) => {
                const r = resultForClub(m, club)!;
                const isHome = teamMatchesClub(m.homeTeam.name, club) || teamMatchesClub(m.homeTeam.shortName, club);
                const usTeam = isHome ? m.homeTeam : m.awayTeam;
                const opponent = isHome ? m.awayTeam : m.homeTeam;
                const myScore = isHome ? m.score.home : m.score.away;
                const theirScore = isHome ? m.score.away : m.score.home;

                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: idx < results.length - 1 ? "1px solid rgba(30,45,66,0.4)" : "none" }}>
                    {/* Result badge */}
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black flex-shrink-0"
                      style={{
                        background: r === "V" ? "rgba(34,197,94,0.15)" : r === "D" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                        color: r === "V" ? "#22c55e" : r === "D" ? "#ef4444" : "#f59e0b",
                        border: `1px solid ${r === "V" ? "rgba(34,197,94,0.3)" : r === "D" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
                      }}>
                      {r}
                    </span>

                    {/* Match info */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      {/* My team */}
                      <div className="flex items-center gap-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={usTeam.crest} alt="" className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
                        <span className="text-xs font-bold hidden sm:block" style={{ color: "#e8edf5" }}>{club.shortName}</span>
                      </div>
                      {/* Score */}
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.04)" }}>
                        <span className="font-black text-sm" style={{ color: r === "V" ? "#22c55e" : r === "D" ? "#ef4444" : "#f59e0b" }}>{myScore}</span>
                        <span className="text-xs" style={{ color: "#6b7c96" }}>–</span>
                        <span className="font-black text-sm" style={{ color: "#94a3b8" }}>{theirScore}</span>
                      </div>
                      {/* Opponent */}
                      <div className="flex items-center gap-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={opponent.crest} alt="" className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
                        <span className="text-xs font-medium truncate" style={{ color: "#94a3b8" }}>{opponent.shortName}</span>
                      </div>
                    </div>

                    {/* Home/Away + Date */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] font-semibold" style={{ color: "#6b7c96" }}>{isHome ? "DOM" : "EXT"}</div>
                      <div className="text-xs" style={{ color: "#475569" }}>{fmtDate(m.date)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────── Main export ───────────────────────────────── */

const STORAGE_KEY = "monClub_id";

export default function MonClubTab() {
  const [clubId, setClubId] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Read from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setClubId(parseInt(saved));
    setHydrated(true);
  }, []);

  const selectClub = (club: Club) => {
    localStorage.setItem(STORAGE_KEY, String(club.id));
    setClubId(club.id);
  };

  const clearClub = () => {
    localStorage.removeItem(STORAGE_KEY);
    setClubId(null);
  };

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#3b82f6", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const selectedClub = L1_CLUBS.find(c => c.id === clubId) ?? null;

  if (!selectedClub) {
    return <ClubSelector onSelect={selectClub} />;
  }

  return <ClubDashboard club={selectedClub} onChangeClub={clearClub} />;
}
