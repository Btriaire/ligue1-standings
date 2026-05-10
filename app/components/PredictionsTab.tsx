"use client";

import { useEffect, useState } from "react";
import { Zap, TrendingUp, Shield, Target, Clock, Heart } from "lucide-react";

interface TeamPred {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  position: number;
  points: number;
  form: string;
  ppg: number;
  goalsFor: number;
  goalsAgainst: number;
}

interface EmotionalCorrection {
  originalHomeProb: number;
  originalAwayProb: number;
  homeDelta: number;
  awayDelta: number;
  homeEmotionalScore: number | null;
  awayEmotionalScore: number | null;
}

interface Prediction {
  homeProb: number;
  drawProb: number;
  awayProb: number;
  winner: "home" | "away" | "draw";
  confidence: "high" | "medium" | "low";
  homeXG: number;
  awayXG: number;
  emotionalCorrection: EmotionalCorrection | null;
}

interface MatchPrediction {
  id: number;
  date: string;
  matchday: number;
  homeTeam: TeamPred;
  awayTeam: TeamPred;
  prediction: Prediction;
}

interface PredData {
  predictions: MatchPrediction[];
  matchday: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" }),
    time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function FormMini({ form }: { form: string }) {
  if (!form) return null;
  const results = form.split(",").filter(Boolean).slice(-5);
  const colors: Record<string, string> = { W: "#22c55e", D: "#f59e0b", L: "#ef4444" };
  return (
    <div className="flex gap-0.5">
      {results.map((r, i) => (
        <span key={i} className="w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-black"
          style={{ background: `${colors[r]}20`, color: colors[r] }}>
          {r === "W" ? "V" : r === "L" ? "D" : "N"}
        </span>
      ))}
    </div>
  );
}

const CONFIDENCE_CONFIG = {
  high: { label: "Confiance élevée", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  medium: { label: "Confiance moyenne", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  low: { label: "Match serré", color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

function ProbBar({ homeProb, drawProb, awayProb, winner }: {
  homeProb: number; drawProb: number; awayProb: number; winner: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex rounded-lg overflow-hidden h-3">
        <div
          className="transition-all duration-700 flex items-center justify-center"
          style={{ width: `${homeProb}%`, background: winner === "home" ? "#00d4ff" : "rgba(0,212,255,0.3)" }}
        />
        <div
          className="transition-all duration-700"
          style={{ width: `${drawProb}%`, background: "rgba(148,163,184,0.3)" }}
        />
        <div
          className="transition-all duration-700"
          style={{ width: `${awayProb}%`, background: winner === "away" ? "#7c3aed" : "rgba(124,58,237,0.3)" }}
        />
      </div>
      <div className="flex justify-between text-xs font-mono">
        <span style={{ color: winner === "home" ? "#00d4ff" : "#6b7c96" }}>{homeProb}%</span>
        <span style={{ color: "#6b7c96" }}>{drawProb}%</span>
        <span style={{ color: winner === "away" ? "#7c3aed" : "#6b7c96" }}>{awayProb}%</span>
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: MatchPrediction }) {
  const { day, time } = formatDate(match.date);
  const { prediction: pred } = match;
  const conf = CONFIDENCE_CONFIG[pred.confidence];
  const winnerTeam = pred.winner === "home" ? match.homeTeam : pred.winner === "away" ? match.awayTeam : null;

  return (
    <div
      className="rounded-2xl overflow-hidden animate-fade-in-up"
      style={{ background: "#0d1421", border: "1px solid #1e2d42" }}
    >
      {/* Match header */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid #1e2d42", background: "rgba(0,0,0,0.2)" }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: "#6b7c96" }}>
          <Clock size={11} />
          <span>{day} · {time}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: conf.bg, color: conf.color }}>
          <Zap size={10} />
          {conf.label}
        </div>
      </div>

      <div className="px-5 py-5">
        {/* Teams row */}
        <div className="grid grid-cols-3 items-center gap-4 mb-5">
          {/* Home team */}
          <div className={`flex flex-col items-center gap-2 ${pred.winner === "home" ? "opacity-100" : "opacity-60"}`}>
            {match.homeTeam.crest ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.homeTeam.crest} alt={match.homeTeam.shortName} className="w-12 h-12 object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center font-black" style={{ color: "#6b7c96" }}>
                {match.homeTeam.tla?.slice(0, 2)}
              </div>
            )}
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: "#e8edf5" }}>{match.homeTeam.shortName || match.homeTeam.tla}</p>
              <p className="text-xs" style={{ color: "#6b7c96" }}>{match.homeTeam.position}e · {match.homeTeam.points}pts</p>
            </div>
            {pred.winner === "home" && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(0,212,255,0.15)", color: "#00d4ff" }}>
                Favori
              </span>
            )}
          </div>

          {/* VS + XG */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-center">
              <p className="text-2xl font-black" style={{ color: "#e8edf5" }}>VS</p>
              {pred.winner === "draw" && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(148,163,184,0.15)", color: "#94a3b8" }}>
                  Nul probable
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: "#6b7c96" }}>
              <div className="text-center">
                <p className="font-mono font-bold" style={{ color: "#e8edf5" }}>{pred.homeXG}</p>
                <p>xG</p>
              </div>
              <Target size={12} />
              <div className="text-center">
                <p className="font-mono font-bold" style={{ color: "#e8edf5" }}>{pred.awayXG}</p>
                <p>xG</p>
              </div>
            </div>
          </div>

          {/* Away team */}
          <div className={`flex flex-col items-center gap-2 ${pred.winner === "away" ? "opacity-100" : "opacity-60"}`}>
            {match.awayTeam.crest ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.awayTeam.crest} alt={match.awayTeam.shortName} className="w-12 h-12 object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center font-black" style={{ color: "#6b7c96" }}>
                {match.awayTeam.tla?.slice(0, 2)}
              </div>
            )}
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: "#e8edf5" }}>{match.awayTeam.shortName || match.awayTeam.tla}</p>
              <p className="text-xs" style={{ color: "#6b7c96" }}>{match.awayTeam.position}e · {match.awayTeam.points}pts</p>
            </div>
            {pred.winner === "away" && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>
                Favori
              </span>
            )}
          </div>
        </div>

        {/* Probability bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "#6b7c96" }}>
            <span>Victoire dom.</span>
            <span>Nul</span>
            <span>Victoire ext.</span>
          </div>
          <ProbBar
            homeProb={pred.homeProb}
            drawProb={pred.drawProb}
            awayProb={pred.awayProb}
            winner={pred.winner}
          />
        </div>

        {/* Stats comparison */}
        <div className="grid grid-cols-3 gap-2 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {[
            {
              icon: <TrendingUp size={12} />,
              label: "Pts/match",
              home: match.homeTeam.ppg.toFixed(1),
              away: match.awayTeam.ppg.toFixed(1),
              homeWins: match.homeTeam.ppg >= match.awayTeam.ppg,
            },
            {
              icon: <Target size={12} />,
              label: "Buts/match",
              home: (match.homeTeam.goalsFor / Math.max(match.homeTeam.goalsFor + match.homeTeam.goalsAgainst, 1) * 2).toFixed(1),
              away: (match.awayTeam.goalsFor / Math.max(match.awayTeam.goalsFor + match.awayTeam.goalsAgainst, 1) * 2).toFixed(1),
              homeWins: match.homeTeam.goalsFor >= match.awayTeam.goalsFor,
            },
            {
              icon: <Shield size={12} />,
              label: "Défense",
              home: match.homeTeam.goalsAgainst,
              away: match.awayTeam.goalsAgainst,
              homeWins: match.homeTeam.goalsAgainst <= match.awayTeam.goalsAgainst,
              lowerIsBetter: true,
            },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1" style={{ color: "#6b7c96" }}>
                {stat.icon}
                <span className="text-xs">{stat.label}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm font-mono font-bold">
                <span style={{ color: stat.lowerIsBetter ? (stat.homeWins ? "#22c55e" : "#ef4444") : (stat.homeWins ? "#22c55e" : "#ef4444") }}>
                  {stat.home}
                </span>
                <span style={{ color: "#1e2d42" }}>|</span>
                <span style={{ color: stat.lowerIsBetter ? (!stat.homeWins ? "#22c55e" : "#ef4444") : (!stat.homeWins ? "#22c55e" : "#ef4444") }}>
                  {stat.away}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <FormMini form={match.homeTeam.form} />
          <span className="text-xs" style={{ color: "#6b7c96" }}>Forme récente</span>
          <FormMini form={match.awayTeam.form} />
        </div>

        {/* Prediction summary */}
        {winnerTeam && (
          <div className="mt-4 px-4 py-3 rounded-xl text-center" style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)" }}>
            <p className="text-xs" style={{ color: "#6b7c96" }}>Prédiction IA</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: "#00d4ff" }}>
              Victoire {winnerTeam.shortName || winnerTeam.tla} — {Math.max(pred.homeProb, pred.awayProb)}% de probabilité
            </p>
          </div>
        )}
        {pred.winner === "draw" && (
          <div className="mt-4 px-4 py-3 rounded-xl text-center" style={{ background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.15)" }}>
            <p className="text-xs" style={{ color: "#6b7c96" }}>Prédiction IA</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: "#94a3b8" }}>
              Match nul probable — {pred.drawProb}% de probabilité
            </p>
          </div>
        )}

        {/* Emotional correction badge */}
        {pred.emotionalCorrection && (pred.emotionalCorrection.homeDelta !== 0 || pred.emotionalCorrection.awayDelta !== 0) && (
          <div className="mt-2 px-3 py-2 rounded-xl flex items-center gap-2 text-xs"
            style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.2)" }}>
            <Heart size={12} className="text-pink-400 flex-shrink-0" />
            <span style={{ color: "#f472b6" }}>Correction émotionnelle appliquée :</span>
            <span style={{ color: "#94a3b8" }}>
              base {pred.emotionalCorrection.originalHomeProb}%–{pred.emotionalCorrection.originalAwayProb}%
              → {pred.homeProb}%–{pred.awayProb}%
              {pred.emotionalCorrection.homeEmotionalScore !== null && (
                <> (score: {pred.emotionalCorrection.homeEmotionalScore} | {pred.emotionalCorrection.awayEmotionalScore})</>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PredictionsTab() {
  const [data, setData] = useState<PredData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/predictions")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 rounded-2xl animate-pulse" style={{ background: "#0d1421", border: "1px solid #1e2d42" }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16" style={{ color: "#6b7c96" }}>
        <p className="text-red-400 mb-2">Erreur : {error}</p>
      </div>
    );
  }

  if (!data?.predictions.length) {
    return (
      <div className="text-center py-16" style={{ color: "#6b7c96" }}>
        <p>Aucun match à venir disponible.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold" style={{ color: "#e8edf5" }}>
            Journée {data.matchday} — Analyse prédictive
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
            Basée sur la forme, le classement, les buts et l&apos;avantage domicile
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff" }}>
          <Zap size={12} />
          IA Prédictive
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {data.predictions.map((match, i) => (
          <div key={match.id} style={{ animationDelay: `${i * 60}ms` }}>
            <MatchCard match={match} />
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-center" style={{ color: "#6b7c96" }}>
        * Prédictions algorithmiques à titre indicatif — pas de conseil de paris
      </p>
    </div>
  );
}
