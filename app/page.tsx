"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Trophy, Wifi, WifiOff, Clock } from "lucide-react";
import TeamModal from "./components/TeamModal";

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

const ZONE_CONFIG = [
  { label: "Champion", positions: [1], color: "#00d4ff", bg: "rgba(0,212,255,0.06)" },
  { label: "Ligue des Champions", positions: [2, 3], color: "#22c55e", bg: "rgba(34,197,94,0.06)" },
  { label: "Ligue Europa", positions: [4], color: "#f59e0b", bg: "rgba(245,158,11,0.06)" },
  { label: "Conf. League", positions: [5], color: "#f97316", bg: "rgba(249,115,22,0.06)" },
  { label: "Relégation", positions: [16, 17, 18], color: "#ef4444", bg: "rgba(239,68,68,0.06)" },
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
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/30">
        <Trophy size={14} className="text-[#00d4ff]" />
      </div>
    );
  }
  const zone = getZone(position);
  return (
    <div
      className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold"
      style={{
        background: zone ? zone.bg : "rgba(255,255,255,0.03)",
        color: zone ? zone.color : "rgba(255,255,255,0.5)",
        border: zone ? `1px solid ${zone.color}30` : "1px solid rgba(255,255,255,0.08)",
      }}
    >
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
      <div
        className="grid items-center px-4 py-3 text-xs font-semibold uppercase tracking-widest"
        style={{
          background: "#0d1421",
          color: "#6b7c96",
          gridTemplateColumns: "44px 1fr 40px 90px 40px 40px 48px 56px 100px 40px",
          borderBottom: "1px solid #1e2d42",
        }}
      >
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
          <div
            key={s.team.id}
            onClick={() => setSelected(s)}
            className="group grid items-center px-4 py-3 transition-all duration-200 hover:brightness-125 animate-fade-in-up cursor-pointer"
            style={{
              gridTemplateColumns: "44px 1fr 40px 90px 40px 40px 48px 56px 100px 40px",
              background: zone ? zone.bg : idx % 2 === 0 ? "rgba(13,20,33,0.6)" : "transparent",
              borderBottom: "1px solid rgba(30,45,66,0.4)",
              borderLeft: zone ? `3px solid ${zone.color}` : "3px solid transparent",
              animationDelay: `${idx * 30}ms`,
            }}
          >
            <div className="flex justify-center">
              <PositionBadge position={s.position} />
            </div>

            <div className="flex items-center gap-3 min-w-0">
              {s.team.crest ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.team.crest} alt={s.team.shortName} className="w-8 h-8 object-contain flex-shrink-0" loading="lazy" />
              ) : (
                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-xs font-bold text-white/40 flex-shrink-0">
                  {s.team.tla?.slice(0, 2)}
                </div>
              )}
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

            <div className="flex justify-center text-sm">
              <GDIndicator gd={s.goalDifference} />
            </div>

            <div className="flex justify-center">
              <span
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-base font-black"
                style={{
                  background: zone ? `${zone.color}15` : "rgba(255,255,255,0.04)",
                  color: zone ? zone.color : "#e8edf5",
                  border: zone ? `1px solid ${zone.color}25` : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {s.points}
              </span>
            </div>

            <div className="hidden sm:flex justify-center">
              <FormStreak form={s.form} />
            </div>

            <div className="hidden lg:flex justify-center">
              <Trend form={s.form} />
            </div>
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
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3"
          style={{ borderBottom: "1px solid rgba(30,45,66,0.4)", background: i % 2 === 0 ? "rgba(13,20,33,0.6)" : "transparent" }}
        >
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
      <button
        onClick={onRetry}
        className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
        style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff" }}
      >
        Réessayer
      </button>
      <p className="mt-4 text-xs" style={{ color: "#6b7c96" }}>
        Configurez <code className="text-yellow-400 bg-yellow-400/10 px-1 rounded">FOOTBALL_DATA_API_KEY</code> dans vos variables Vercel.
      </p>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<StandingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(60);

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
    const tick = setInterval(() => setCountdown((c) => (c <= 1 ? 60 : c - 1)), 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <main className="min-h-screen" style={{ background: "#080c14" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl border-b"
        style={{ borderColor: "#1e2d42", background: "rgba(8,12,20,0.92)" }}
      >
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(124,58,237,0.15))",
                border: "1px solid rgba(0,212,255,0.25)",
              }}
            >
              <span className="text-base font-black" style={{ color: "#00d4ff" }}>L1</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight" style={{ color: "#e8edf5" }}>Ligue 1</h1>
              <p className="text-xs" style={{ color: "#6b7c96" }}>Classement 2024–25</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              {error ? (
                <WifiOff size={14} className="text-red-400" />
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full live-pulse" style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
                  <span className="text-xs font-medium tracking-widest" style={{ color: "#22c55e" }}>EN DIRECT</span>
                </>
              )}
            </div>

            {lastUpdated && (
              <div className="hidden md:flex items-center gap-1.5 text-xs" style={{ color: "#6b7c96" }}>
                <Clock size={11} />
                <span>{formatTime(lastUpdated)}</span>
                <span className="opacity-40">· {countdown}s</span>
              </div>
            )}

            <button
              onClick={() => fetchStandings(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 active:scale-95"
              style={{
                background: "rgba(0,212,255,0.08)",
                border: "1px solid rgba(0,212,255,0.2)",
                color: "#00d4ff",
              }}
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Legend */}
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

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between text-xs" style={{ color: "#6b7c96" }}>
          <div className="flex items-center gap-1.5">
            {error ? (
              <><WifiOff size={11} className="text-red-400" /><span className="text-red-400 ml-1">Hors ligne</span></>
            ) : (
              <><Wifi size={11} /><span className="ml-1">Source: football-data.org</span></>
            )}
          </div>
          {data?.season && <span>Journée {data.season}</span>}
        </div>
      </div>
    </main>
  );
}
