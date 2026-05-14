"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Trophy, Wifi, WifiOff, Clock, Zap, BarChart2, Heart, Globe, Settings, Target, ArrowLeftRight, ChevronRight, Users, Lock, LogIn, LogOut } from "lucide-react";
import TeamModal from "./components/TeamModal";
import PredictionsTab from "./components/PredictionsTab";
import EmotionalScoreTab from "./components/EmotionalScoreTab";
import ResultsTab from "./components/ResultsTab";
import ConfigTab from "./components/ConfigTab";
import TransfersTab from "./components/TransfersTab";

interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

interface Standing {
  position: number;
  team: Team;
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

interface StandingsData {
  standings: Standing[];
  season: number | null;
  updatedAt: string;
}

type TabId = "standings" | "predictions" | "results" | "emotional" | "transfers" | "config";

const ZONE_CONFIG = [
  { label: "Champion",            positions: [1],          color: "#60a5fa", bg: "rgba(96,165,250,0.05)"  },
  { label: "Ligue des Champions", positions: [2, 3],       color: "#34d399", bg: "rgba(52,211,153,0.05)"  },
  { label: "Ligue Europa",        positions: [4],           color: "#fbbf24", bg: "rgba(251,191,36,0.05)"  },
  { label: "Conf. League",        positions: [5],           color: "#a78bfa", bg: "rgba(167,139,250,0.05)" },
  { label: "Relégation",          positions: [16, 17, 18], color: "#f87171", bg: "rgba(248,113,113,0.05)" },
];

function getZone(position: number) {
  return ZONE_CONFIG.find((z) => z.positions.includes(position)) ?? null;
}

function FormBadge({ result }: { result: string }) {
  const colors: Record<string, string> = {
    W: "bg-green-500/20 text-green-400 border border-green-500/30",
    D: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    L: "bg-red-500/20 text-red-400 border border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${colors[result] ?? "bg-white/5 text-white/40"}`}>
      {result === "W" ? "V" : result === "L" ? "D" : "N"}
    </span>
  );
}

function FormStreak({ form }: { form: string }) {
  if (!form) return <span className="text-white/20 text-xs">—</span>;
  const results = form.split(",").filter(Boolean).slice(-5);
  return (
    <div className="flex gap-1 justify-center">
      {results.map((r, i) => <FormBadge key={i} result={r} />)}
    </div>
  );
}

function PositionBadge({ position }: { position: number }) {
  if (position === 1) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/30">
        <Trophy size={14} className="text-[#3b82f6]" />
      </div>
    );
  }
  const zone = getZone(position);
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold"
      style={{
        background: zone ? zone.bg : "rgba(255,255,255,0.03)",
        color: zone ? zone.color : "rgba(255,255,255,0.5)",
        border: zone ? `1px solid ${zone.color}30` : "1px solid rgba(255,255,255,0.08)",
      }}>
      {position}
    </div>
  );
}

function GDIndicator({ gd }: { gd: number }) {
  if (gd > 0) return <span className="text-green-400 font-mono font-semibold">+{gd}</span>;
  if (gd < 0) return <span className="text-red-400 font-mono font-semibold">{gd}</span>;
  return <span className="text-white/40 font-mono">0</span>;
}

function Trend({ form }: { form: string }) {
  if (!form) return <Minus size={14} className="text-white/20" />;
  const results = form.split(",").filter(Boolean).slice(-3);
  const score = results.reduce((acc, r) => acc + (r === "W" ? 1 : r === "L" ? -1 : 0), 0);
  if (score > 0) return <TrendingUp size={14} className="text-green-400" />;
  if (score < 0) return <TrendingDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-yellow-400" />;
}

function StandingsTable({ standings }: { standings: Standing[] }) {
  const [selected, setSelected] = useState<Standing | null>(null);

  return (
    <>
      {selected && <TeamModal standing={selected} onClose={() => setSelected(null)} />}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42" }}>
        <div className="grid items-center px-4 py-3 text-xs font-semibold uppercase tracking-widest"
          style={{
            background: "#0d1421",
            color: "#6b7c96",
            gridTemplateColumns: "44px 1fr 40px 90px 40px 40px 48px 56px 100px 40px",
            borderBottom: "1px solid #1e2d42",
          }}>
          <span className="text-center">#</span>
          <span>Équipe</span>
          <span className="text-center">J</span>
          <span className="text-center hidden sm:block">V · N · D</span>
          <span className="text-center hidden md:block">BP</span>
          <span className="text-center hidden md:block">BC</span>
          <span className="text-center">DB</span>
          <span className="text-center font-bold" style={{ color: "#e8edf5" }}>Pts</span>
          <span className="text-center hidden sm:block">Forme</span>
          <span className="hidden lg:block" />
        </div>

        {standings.map((s, idx) => {
          const zone = getZone(s.position);
          return (
            <div key={s.team.id} onClick={() => setSelected(s)}
              className="group grid items-center px-4 py-3 transition-all duration-200 hover:brightness-125 animate-fade-in-up cursor-pointer"
              style={{
                gridTemplateColumns: "44px 1fr 40px 90px 40px 40px 48px 56px 100px 40px",
                background: zone ? zone.bg : idx % 2 === 0 ? "rgba(13,20,33,0.6)" : "transparent",
                borderBottom: "1px solid rgba(30,45,66,0.4)",
                borderLeft: zone ? `3px solid ${zone.color}` : "3px solid transparent",
                animationDelay: `${idx * 30}ms`,
              }}>
              <div className="flex justify-center"><PositionBadge position={s.position} /></div>

              <div className="flex items-center gap-3 min-w-0">
                {s.team.crest
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={s.team.crest} alt={s.team.shortName} className="w-8 h-8 object-contain flex-shrink-0" loading="lazy" />
                  : <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-xs font-bold text-white/40 flex-shrink-0">{s.team.tla?.slice(0, 2)}</div>
                }
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "#e8edf5" }}>
                    <span className="hidden md:inline">{s.team.name}</span>
                    <span className="md:hidden">{s.team.shortName || s.team.tla}</span>
                  </p>
                </div>
              </div>

              <span className="text-center text-sm font-mono" style={{ color: "#94a3b8" }}>{s.playedGames}</span>

              <div className="hidden sm:flex justify-center gap-1.5 text-xs font-mono">
                <span style={{ color: "#22c55e" }}>{s.won}</span>
                <span style={{ color: "#6b7c96" }}>·</span>
                <span style={{ color: "#f59e0b" }}>{s.draw}</span>
                <span style={{ color: "#6b7c96" }}>·</span>
                <span style={{ color: "#ef4444" }}>{s.lost}</span>
              </div>

              <span className="hidden md:block text-center text-sm font-mono" style={{ color: "#94a3b8" }}>{s.goalsFor}</span>
              <span className="hidden md:block text-center text-sm font-mono" style={{ color: "#94a3b8" }}>{s.goalsAgainst}</span>

              <div className="flex justify-center text-sm"><GDIndicator gd={s.goalDifference} /></div>

              <div className="flex justify-center">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-base font-black"
                  style={{
                    background: zone ? `${zone.color}15` : "rgba(255,255,255,0.04)",
                    color: zone ? zone.color : "#e8edf5",
                    border: zone ? `1px solid ${zone.color}25` : "1px solid rgba(255,255,255,0.06)",
                  }}>
                  {s.points}
                </span>
              </div>

              <div className="hidden sm:flex justify-center"><FormStreak form={s.form} /></div>
              <div className="hidden lg:flex justify-center"><Trend form={s.form} /></div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42" }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3"
          style={{ borderBottom: "1px solid rgba(30,45,66,0.4)", background: i % 2 === 0 ? "rgba(13,20,33,0.6)" : "transparent" }}>
          <div className="w-8 h-8 rounded-lg animate-pulse" style={{ background: "#1e2d42" }} />
          <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: "#1e2d42" }} />
          <div className="flex-1 h-4 rounded animate-pulse" style={{ background: "#1e2d42", maxWidth: "180px" }} />
          <div className="ml-auto flex gap-6">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="w-8 h-4 rounded animate-pulse" style={{ background: "#1e2d42" }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl p-12 text-center" style={{ border: "1px solid #ef444430", background: "rgba(239,68,68,0.05)" }}>
      <WifiOff size={40} className="text-red-400 mx-auto mb-4 opacity-60" />
      <h2 className="text-lg font-bold mb-2" style={{ color: "#e8edf5" }}>Impossible de charger les données</h2>
      <p className="text-sm mb-6" style={{ color: "#6b7c96" }}>{error}</p>
      <button onClick={onRetry} className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
        style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6" }}>
        Réessayer
      </button>
      <p className="mt-4 text-xs" style={{ color: "#6b7c96" }}>
        Configurez <code className="text-yellow-400 bg-yellow-400/10 px-1 rounded">FOOTBALL_DATA_API_KEY</code> dans vos variables Vercel.
      </p>
    </div>
  );
}

// ── Logo SVG ───────────────────────────────────────────────────────────────────
function FootPredictomLogo() {
  return (
    <div className="flex items-center gap-3">
      {/* Ball icon */}
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="ball-grad" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.8" />
            </radialGradient>
            <radialGradient id="glow-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Glow */}
          <circle cx="20" cy="20" r="19" fill="url(#glow-grad)" />
          {/* Ball body */}
          <circle cx="20" cy="20" r="16" fill="url(#ball-grad)" opacity="0.15" />
          <circle cx="20" cy="20" r="16" stroke="url(#ball-grad)" strokeWidth="1.5" fill="none" />
          {/* Pentagon pattern */}
          <path d="M20 6 L25 14 L20 18 L15 14 Z" fill="#3b82f6" opacity="0.7" />
          <path d="M28 13 L34 16 L32 22 L26 20 L25 14 Z" fill="#6366f1" opacity="0.5" />
          <path d="M12 13 L15 14 L14 20 L8 22 L6 16 Z" fill="#6366f1" opacity="0.5" />
          <path d="M26 20 L32 22 L30 28 L24 27 L20 22 Z" fill="#3b82f6" opacity="0.4" />
          <path d="M14 20 L20 22 L16 27 L10 28 L8 22 Z" fill="#3b82f6" opacity="0.4" />
          <path d="M20 22 L24 27 L20 32 L16 27 Z" fill="#6366f1" opacity="0.6" />
          {/* Shine */}
          <ellipse cx="15" cy="13" rx="4" ry="2.5" fill="white" opacity="0.15" transform="rotate(-20 15 13)" />
          {/* AI badge */}
          <circle cx="30" cy="10" r="7" fill="#080c14" />
          <circle cx="30" cy="10" r="6.5" stroke="#3b82f6" strokeWidth="1" fill="rgba(59,130,246,0.1)" />
          <text x="30" y="13.5" textAnchor="middle" fontSize="7" fontWeight="900" fill="#3b82f6">AI</text>
        </svg>
      </div>
      {/* Text */}
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-black tracking-tight leading-none"
            style={{ color: "#e8edf5", letterSpacing: "-0.02em" }}>
            Foot
          </span>
          <span className="text-lg font-black tracking-tight leading-none"
            style={{ color: "#60a5fa" }}>
            Predictom
          </span>
        </div>
        <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#6b7c96", marginTop: 1 }}>
          Ligue 1 · IA Prédictive
        </p>
      </div>
    </div>
  );
}

// ── Club sidebar ───────────────────────────────────────────────────────────────

const SIDEBAR_CLUBS = [
  { id: 524,  shortName: "PSG",        crest: "https://crests.football-data.org/524.png" },
  { id: 548,  shortName: "Monaco",     crest: "https://crests.football-data.org/548.png" },
  { id: 516,  shortName: "Marseille",  crest: "https://crests.football-data.org/516.png" },
  { id: 521,  shortName: "Lille",      crest: "https://crests.football-data.org/521.png" },
  { id: 529,  shortName: "Rennes",     crest: "https://crests.football-data.org/529.png" },
  { id: 522,  shortName: "Nice",       crest: "https://crests.football-data.org/522.png" },
  { id: 546,  shortName: "Lens",       crest: "https://crests.football-data.org/546.png" },
  { id: 523,  shortName: "Lyon",       crest: "https://crests.football-data.org/523.png" },
  { id: 576,  shortName: "Strasbourg", crest: "https://crests.football-data.org/576.png" },
  { id: 511,  shortName: "Toulouse",   crest: "https://crests.football-data.org/511.png" },
  { id: 512,  shortName: "Brest",      crest: "https://crests.football-data.org/512.png" },
  { id: 532,  shortName: "Angers",     crest: "https://crests.football-data.org/532.png" },
  { id: 533,  shortName: "Le Havre",   crest: "https://crests.football-data.org/533.png" },
  { id: 519,  shortName: "Auxerre",    crest: "https://crests.football-data.org/519.png" },
  { id: 543,  shortName: "Nantes",     crest: "https://crests.football-data.org/543.png" },
  { id: 545,  shortName: "Metz",       crest: "https://crests.football-data.org/545.png" },
  { id: 525,  shortName: "Lorient",    crest: "https://crests.football-data.org/525.png" },
  { id: 1045, shortName: "Paris FC",   crest: "https://crests.football-data.org/1045.png" },
];

function ClubSidebar({ standings }: { standings?: Standing[] }) {
  const posMap = new Map(standings?.map((s) => [s.team.id, s.position]) ?? []);
  const formMap = new Map(standings?.map((s) => [s.team.id, s.form]) ?? []);

  // Sort by standings position if available, otherwise use default order
  const sorted = standings
    ? [...SIDEBAR_CLUBS].sort((a, b) => (posMap.get(a.id) ?? 99) - (posMap.get(b.id) ?? 99))
    : SIDEBAR_CLUBS;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42", background: "#0d1421" }}>
      <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid #1e2d42" }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#6b7c96" }}>Clubs L1</p>
        <ChevronRight size={12} style={{ color: "#6b7c96" }} />
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 140px)" }}>
        {sorted.map((club) => {
          const pos = posMap.get(club.id);
          const form = formMap.get(club.id);
          const lastResult = form ? form.split(",").filter(Boolean).slice(-1)[0] : null;
          const resultColor = lastResult === "W" ? "#22c55e" : lastResult === "L" ? "#ef4444" : lastResult === "D" ? "#f59e0b" : null;
          return (
            <a key={club.id} href={`/club/${club.id}`}
              className="flex items-center gap-2 px-3 py-2 transition-all hover:bg-white/[0.04] group"
              style={{ borderBottom: "1px solid rgba(30,45,66,0.3)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={club.crest} alt={club.shortName} className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
              <span className="flex-1 text-xs font-medium truncate transition-colors" style={{ color: "#94a3b8" }}>
                {club.shortName}
              </span>
              {pos && (
                <span className="text-xs font-mono flex-shrink-0 w-4 text-right"
                  style={{ color: pos <= 3 ? "#22c55e" : pos >= 16 ? "#ef4444" : "#6b7c96" }}>
                  {pos}
                </span>
              )}
              {lastResult && resultColor && (
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: resultColor }} />
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

const TABS: { id: TabId; label: string; icon: React.ReactNode; shortLabel?: string }[] = [
  { id: "standings",   label: "Classement",       icon: <BarChart2 size={14} />,   shortLabel: "Classmt." },
  { id: "predictions", label: "AI FootPredictom",   icon: <Zap size={14} />,         shortLabel: "AI Foot" },
  { id: "results",     label: "Résultats",         icon: <Target size={14} /> },
  { id: "emotional",   label: "Facteur additionnel",  icon: <Heart size={14} />,       shortLabel: "Fact. add." },
  { id: "transfers",   label: "Transferts",         icon: <ArrowLeftRight size={14} />,  shortLabel: "Mercato" },
  { id: "config",      label: "Configuration",     icon: <Settings size={14} />,         shortLabel: "Config" },
];

interface AuthUser { id: string; email: string; name: string }

function AuthGate({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl flex flex-col items-center justify-center py-20 gap-5"
      style={{ border: "1px solid #1e2d42", background: "rgba(13,20,33,0.6)" }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1e2d42" }}>
        <Lock size={22} style={{ color: "#64748b" }} />
      </div>
      <div className="text-center">
        <p className="font-black text-base mb-1" style={{ color: "#e8edf5" }}>
          {icon} <span className="ml-1">{label}</span> réservé aux membres
        </p>
        <p className="text-sm" style={{ color: "#6b7c96" }}>
          Créez un compte gratuit pour accéder à cette section.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/login"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black hover:opacity-90 transition-all"
          style={{ background: "#3b82f6", color: "#fff" }}>
          <LogIn size={14} /> Se connecter
        </Link>
        <Link href="/login?tab=register"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-80 transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#94a3b8" }}>
          S&apos;inscrire
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<TabId>("standings");
  const [data, setData] = useState<StandingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined); // undefined = loading

  const fetchStandings = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/standings?t=" + Date.now());
      if (!res.ok) throw new Error("Erreur de chargement");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setLastUpdated(new Date());
      setError(null);
      setCountdown(60);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStandings();
    const interval = setInterval(() => fetchStandings(), 60_000);
    return () => clearInterval(interval);
  }, [fetchStandings]);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user ?? null)).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setCountdown((c) => (c <= 1 ? 60 : c - 1)), 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <main className="min-h-screen" style={{ background: "#080c14" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b"
        style={{ borderColor: "#1e2d42", background: "rgba(8,12,20,0.92)" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <FootPredictomLogo />

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              {error
                ? <WifiOff size={14} className="text-red-400" />
                : <>
                    <span className="w-1.5 h-1.5 rounded-full live-pulse" style={{ background: "#34d399", boxShadow: "0 0 4px #34d399" }} />
                    <span className="text-xs font-medium tracking-widest" style={{ color: "#64748b" }}>EN DIRECT</span>
                  </>
              }
            </div>

            {lastUpdated && (
              <div className="hidden md:flex items-center gap-1.5 text-xs" style={{ color: "#6b7c96" }}>
                <Clock size={11} />
                <span>{formatTime(lastUpdated)}</span>
                <span className="opacity-40">· {countdown}s</span>
              </div>
            )}

            <button onClick={() => fetchStandings(true)} disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 active:scale-95"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1e2d42", color: "#94a3b8" }}>
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>

            {user === undefined ? null : user ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#e2e8f0" }}>
                  {user.name}
                </span>
                <form action="/api/auth/logout" method="POST">
                  <button type="submit" title="Déconnexion"
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs hover:opacity-80 transition-all"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
                    <LogOut size={12} />
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#94a3b8" }}>
                <LogIn size={12} /> <span className="hidden sm:inline">Connexion</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO BANNER ── */}
      <div style={{ borderBottom: "1px solid #1e2d42", background: "#0a0f1c" }}>
        <div className="max-w-[1300px] mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: "#e8edf5" }}>
              Analyse prédictive Ligue 1 —{" "}
              <span style={{ color: "#64748b", fontWeight: 400 }}>
                classement, stats joueurs, facteur additionnel et buteurs potentiels par match.
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] font-medium" style={{ color: "#475569" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#34d399" }} />
            Saison 2025–26
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-4 py-6">
        <div className="lg:grid lg:gap-5 lg:items-start" style={{ gridTemplateColumns: "1fr 196px" }}>
        <div className="min-w-0">
        {/* Tab switcher */}
        <div className="flex gap-0.5 mb-6 p-1 rounded-xl overflow-x-auto" style={{ background: "#0d1421", border: "1px solid #1a2235" }}>
          {TABS.map((t) => {
            const isProtected = (t.id === "predictions" || t.id === "emotional") && !user;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  background: active ? "rgba(255,255,255,0.07)" : "transparent",
                  color: active ? "#e2e8f0" : "#64748b",
                  border: active ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                }}>
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.shortLabel ?? t.label}</span>
                {isProtected && <Lock size={9} style={{ color: "#475569", marginLeft: 1 }} />}
              </button>
            );
          })}
          <Link href="/players"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 hover:bg-white/[0.04]"
            style={{ color: "#64748b", border: "1px solid transparent" }}>
            <Users size={14} />
            <span className="hidden sm:inline">Joueurs</span>
            <span className="sm:hidden">Joueurs</span>
            {!user && <Lock size={9} style={{ color: "#475569" }} />}
          </Link>
        </div>

        {/* Standings tab */}
        {tab === "standings" && (
          <>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6">
              {ZONE_CONFIG.map((z) => (
                <div key={z.label} className="flex items-center gap-2 text-xs" style={{ color: "#6b7c96" }}>
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: z.color, opacity: 0.8 }} />
                  <span style={{ color: z.color }}>{z.label}</span>
                </div>
              ))}
            </div>
            {loading && !data ? (
              <LoadingSkeleton />
            ) : error && !data ? (
              <ErrorState error={error} onRetry={() => fetchStandings(true)} />
            ) : data ? (
              <StandingsTable standings={data.standings} />
            ) : null}
          </>
        )}

        {tab === "predictions" && (user ? <PredictionsTab /> : <AuthGate label="AI FootPredictom" icon={<Zap size={16} className="inline" style={{ color: "#3b82f6" }} />} />)}
        {tab === "results" && <ResultsTab />}
        {tab === "emotional" && (user ? <EmotionalScoreTab /> : <AuthGate label="Facteur additionnel" icon={<Heart size={16} className="inline" style={{ color: "#a78bfa" }} />} />)}
        {tab === "transfers" && <TransfersTab />}
        {tab === "config" && <ConfigTab />}

        {/* World Cup banner — standalone entry */}
        <Link href="/worldcup"
          className="mt-8 mb-2 flex items-center gap-4 px-5 py-4 rounded-2xl transition-all hover:opacity-90 group"
          style={{
            background: "linear-gradient(120deg, rgba(0,212,255,0.07), rgba(124,58,237,0.07), rgba(234,179,8,0.07))",
            border: "1px solid rgba(234,179,8,0.25)",
          }}>
          <span className="text-3xl flex-shrink-0">🌍</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black tracking-tight" style={{ color: "#e8edf5" }}>Coupe du Monde 2026</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                style={{ background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.25)" }}>
                FIFA
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
              USA · Canada · Mexique · 11 juin – 19 juillet 2026 · 48 équipes
            </p>
          </div>
          <ChevronRight size={16} style={{ color: "#eab308", flexShrink: 0 }} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs" style={{ color: "#6b7c96" }}>
          <div className="flex items-center gap-1.5">
            {error
              ? <><WifiOff size={11} className="text-red-400" /><span className="text-red-400 ml-1">Hors ligne</span></>
              : <><Wifi size={11} /><span className="ml-1">Source : football-data.org · Transfermarkt · The Odds API</span></>
            }
          </div>
          {data?.season && <span>Saison {data.season}</span>}
        </div>
        </div>{/* end main-content col */}

        {/* Club sidebar — always visible on lg+ */}
        <div className="hidden lg:block space-y-3" style={{ position: "sticky", top: "73px" }}>
          {/* World Cup sidebar card */}
          <Link href="/worldcup"
            className="flex items-center gap-3 px-3 py-3 rounded-2xl transition-all hover:opacity-85 group"
            style={{
              background: "linear-gradient(120deg, rgba(0,212,255,0.07), rgba(234,179,8,0.09))",
              border: "1px solid rgba(234,179,8,0.3)",
            }}>
            <span className="text-2xl flex-shrink-0">🌍</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black" style={{ color: "#e8edf5" }}>Coupe du Monde</p>
              <p className="text-[10px] mt-0.5" style={{ color: "#eab308" }}>2026 · FIFA</p>
            </div>
            <ChevronRight size={12} style={{ color: "#eab308" }} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <ClubSidebar standings={data?.standings} />
        </div>
        </div>{/* end grid */}
      </div>{/* end max-w */}
    </main>
  );
}
