"use client";

import { useEffect, useState } from "react";
import { X, Calendar, Clock, CaretRight } from "@phosphor-icons/react";

interface TeamInfo {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

interface Standing {
  position: number;
  team: TeamInfo;
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

interface Match {
  id: number;
  date: string;
  matchday: number;
  status: string;
  homeTeam: { id: number; name: string; crest: string };
  awayTeam: { id: number; name: string; crest: string };
  score: { home: number | null; away: number | null };
}

interface TeamData {
  recent: Match[];
  upcoming: Match[];
}

interface Props {
  standing: Standing;
  onClose: () => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function MatchResult({ match, teamId }: { match: Match; teamId: number }) {
  const isHome = match.homeTeam.id === teamId;
  const myScore = isHome ? match.score.home : match.score.away;
  const oppScore = isHome ? match.score.away : match.score.home;
  const opponent = isHome ? match.awayTeam : match.homeTeam;

  let result = "N";
  let resultColor = "#f59e0b";
  let resultBg = "rgba(245,158,11,0.1)";

  if (myScore !== null && oppScore !== null) {
    if (myScore > oppScore) { result = "V"; resultColor = "#22c55e"; resultBg = "rgba(34,197,94,0.1)"; }
    else if (myScore < oppScore) { result = "D"; resultColor = "#ef4444"; resultBg = "rgba(239,68,68,0.1)"; }
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Result badge */}
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
        style={{ background: resultBg, color: resultColor, border: `1px solid ${resultColor}30` }}
      >
        {result}
      </span>

      {/* Opponent crest */}
      {opponent.crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={opponent.crest} alt={opponent.name} className="w-6 h-6 object-contain flex-shrink-0" />
      ) : (
        <div className="w-6 h-6 rounded bg-white/10 flex-shrink-0" />
      )}

      {/* Opponent name + location */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "#e8edf5" }}>{opponent.name}</p>
        <p className="text-xs" style={{ color: "#6b7c96" }}>
          {isHome ? "Domicile" : "Extérieur"} · J{match.matchday}
        </p>
      </div>

      {/* Score */}
      <div className="text-right flex-shrink-0">
        <span className="text-base font-black font-mono" style={{ color: resultColor }}>
          {myScore ?? "–"} – {oppScore ?? "–"}
        </span>
        <p className="text-xs" style={{ color: "#6b7c96" }}>{formatDate(match.date)}</p>
      </div>
    </div>
  );
}

function UpcomingMatch({ match, teamId }: { match: Match; teamId: number }) {
  const isHome = match.homeTeam.id === teamId;
  const opponent = isHome ? match.awayTeam : match.homeTeam;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)" }}
    >
      <CaretRight size={14} style={{ color: "#00d4ff", flexShrink: 0 }} />

      {opponent.crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={opponent.crest} alt={opponent.name} className="w-6 h-6 object-contain flex-shrink-0" />
      ) : (
        <div className="w-6 h-6 rounded bg-white/10 flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "#e8edf5" }}>{opponent.name}</p>
        <p className="text-xs" style={{ color: "#6b7c96" }}>
          {isHome ? "Domicile" : "Extérieur"} · J{match.matchday}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold" style={{ color: "#00d4ff" }}>{formatDate(match.date)}</p>
        <p className="text-xs" style={{ color: "#6b7c96" }}>{formatTime(match.date)}</p>
      </div>
    </div>
  );
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1" style={{ color: "#6b7c96" }}>
        <span>{label}</span>
        <span style={{ color: "#e8edf5" }} className="font-semibold">{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function TeamModal({ standing, onClose }: Props) {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    fetch(`/api/team/${standing.team.id}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [standing.team.id]);

  const winRate = standing.playedGames > 0
    ? Math.round((standing.won / standing.playedGames) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden"
        style={{
          background: "#0d1421",
          border: "1px solid #1e2d42",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center gap-4 px-6 py-5"
          style={{ background: "#0d1421", borderBottom: "1px solid #1e2d42" }}
        >
          {standing.team.crest ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={standing.team.crest} alt={standing.team.name} className="w-12 h-12 object-contain" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-lg font-black" style={{ color: "#6b7c96" }}>
              {standing.team.tla?.slice(0, 2)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black truncate" style={{ color: "#e8edf5" }}>{standing.team.name}</h2>
            <p className="text-sm" style={{ color: "#6b7c96" }}>
              {standing.position}e · {standing.points} pts · {standing.playedGames} matchs joués
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-70 flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.06)", color: "#6b7c96" }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Stats */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#6b7c96" }}>
              Statistiques saison
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Victoires", value: standing.won, color: "#22c55e" },
                { label: "Nuls", value: standing.draw, color: "#f59e0b" },
                { label: "Défaites", value: standing.lost, color: "#ef4444" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <StatBar label="Buts marqués" value={standing.goalsFor} max={90} color="#22c55e" />
              <StatBar label="Buts encaissés" value={standing.goalsAgainst} max={90} color="#ef4444" />
              <StatBar label="Taux de victoire" value={winRate} max={100} color="#00d4ff" />
            </div>
          </div>

          {/* Recent matches */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} style={{ color: "#6b7c96" }} />
              <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6b7c96" }}>
                Derniers matchs
              </h3>
            </div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#1e2d42" }} />
                ))}
              </div>
            ) : data?.recent.length ? (
              <div className="space-y-2">
                {data.recent.map((m) => (
                  <MatchResult key={m.id} match={m} teamId={standing.team.id} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: "#6b7c96" }}>Aucun match récent</p>
            )}
          </div>

          {/* Upcoming matches */}
          {(data?.upcoming?.length ?? 0) > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} style={{ color: "#00d4ff" }} />
                <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#00d4ff" }}>
                  Prochains matchs
                </h3>
              </div>
              <div className="space-y-2">
                {data!.upcoming.map((m) => (
                  <UpcomingMatch key={m.id} match={m} teamId={standing.team.id} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
