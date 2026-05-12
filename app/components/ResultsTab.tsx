"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Minus, Clock, Target, ChevronDown, Download, Trophy } from "lucide-react";
import { loadPredictions, downloadCSV, SavedPrediction } from "@/app/lib/predictions-store";

interface GoalEntry {
  minute: number | null;
  scorer: string | null;
  assist: string | null;
  type: string;
}

interface ResultMatch {
  id: number;
  date: string;
  matchday: number;
  homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  score: { home: number; away: number };
  result: "home" | "away" | "draw";
  homeGoals: GoalEntry[];
  awayGoals: GoalEntry[];
}

interface ResultsData { matches: ResultMatch[]; count: number }

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function GoalList({ goals, teamName }: { goals: GoalEntry[]; teamName: string }) {
  if (goals.length === 0) return null;
  return (
    <div className="space-y-0.5">
      {goals.map((g, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: "#94a3b8" }}>
          <span className="w-6 text-right flex-shrink-0 font-mono"
            style={{ color: "#6b7c96" }}>{g.minute ? `${g.minute}'` : "—"}</span>
          <span className="w-3.5 h-3.5 flex-shrink-0">
            {g.type === "OWN_GOAL" ? "🥅" : g.type === "PENALTY" ? "⚠" : "⚽"}
          </span>
          <span className="truncate" style={{ color: "#e8edf5" }}>{g.scorer ?? "?"}</span>
          {g.assist && (
            <span className="text-xs flex-shrink-0" style={{ color: "#6b7c96" }}>({g.assist})</span>
          )}
          {g.type === "OWN_GOAL" && (
            <span className="text-xs flex-shrink-0" style={{ color: "#f97316" }}>c.s.c.</span>
          )}
        </div>
      ))}
    </div>
  );
}

function PredictionBadge({ saved, actualResult }: { saved: SavedPrediction | null; actualResult: "home" | "away" | "draw" }) {
  if (!saved) {
    return (
      <div className="px-2 py-1 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.04)", color: "#6b7c96" }}>
        Pas de prédiction
      </div>
    );
  }

  const predicted = saved.prediction.winner;
  const correct = predicted === actualResult;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
      style={{ background: correct ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${correct ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
      {correct
        ? <CheckCircle size={13} style={{ color: "#22c55e", flexShrink: 0 }} />
        : <XCircle size={13} style={{ color: "#ef4444", flexShrink: 0 }} />}
      <div>
        <p className="font-bold" style={{ color: correct ? "#22c55e" : "#ef4444" }}>
          {correct ? "✓ Prédiction correcte" : "✗ Prédiction incorrecte"}
        </p>
        <p style={{ color: "#6b7c96" }}>
          Prédit : {predicted === "home" ? `Vic. ${saved.homeTeam.shortName || saved.homeTeam.tla}` : predicted === "away" ? `Vic. ${saved.awayTeam.shortName || saved.awayTeam.tla}` : "Match nul"}
          {" · "}{saved.prediction.homeProb}%–{saved.prediction.drawProb}%–{saved.prediction.awayProb}%
        </p>
        {saved.emotional?.applied && (
          <p style={{ color: "#f472b6" }}>
            ❤ Score émot. dom. {saved.emotional.homeScore} · ext. {saved.emotional.awayScore}
          </p>
        )}
      </div>
    </div>
  );
}

function MatchResultCard({ match, savedPrediction }: { match: ResultMatch; savedPrediction: SavedPrediction | null }) {
  const [expanded, setExpanded] = useState(false);
  const { day, time } = formatDate(match.date);

  const homeWon = match.result === "home";
  const awayWon = match.result === "away";
  const isDraw = match.result === "draw";

  const hasGoalDetails = match.homeGoals.length > 0 || match.awayGoals.length > 0;
  const hasPrediction = savedPrediction !== null;
  const predCorrect = hasPrediction && savedPrediction!.prediction.winner === match.result;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
      {/* Match header */}
      <div className="flex items-center justify-between px-4 py-2"
        style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: "#6b7c96" }}>
          <Clock size={11} /><span>{day} · {time}</span>
          <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)" }}>
            J{match.matchday}
          </span>
        </div>
        {hasPrediction && (
          <div className="flex items-center gap-1">
            {predCorrect
              ? <CheckCircle size={13} style={{ color: "#22c55e" }} />
              : <XCircle size={13} style={{ color: "#ef4444" }} />}
            <span className="text-xs font-semibold" style={{ color: predCorrect ? "#22c55e" : "#ef4444" }}>
              {predCorrect ? "Correct" : "Manqué"}
            </span>
          </div>
        )}
      </div>

      {/* Score display */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-3 items-center gap-3">
          {/* Home team */}
          <div className={`flex flex-col items-center gap-2 ${!homeWon && !isDraw ? "opacity-50" : ""}`}>
            {match.homeTeam.crest
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={match.homeTeam.crest} alt={match.homeTeam.shortName} className="w-10 h-10 object-contain" />
              : <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xs font-black" style={{ color: "#6b7c96" }}>{match.homeTeam.tla?.slice(0, 2)}</div>
            }
            <p className="text-xs font-semibold text-center" style={{ color: "#e8edf5" }}>
              {match.homeTeam.shortName || match.homeTeam.tla}
            </p>
            {homeWon && <Trophy size={12} style={{ color: "#f59e0b" }} />}
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black"
                style={{ color: homeWon ? "#22c55e" : isDraw ? "#f59e0b" : "#ef4444" }}>
                {match.score.home}
              </span>
              <span className="text-xl font-bold" style={{ color: "#1e2d42" }}>:</span>
              <span className="text-3xl font-black"
                style={{ color: awayWon ? "#22c55e" : isDraw ? "#f59e0b" : "#ef4444" }}>
                {match.score.away}
              </span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: isDraw ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)",
                color: isDraw ? "#f59e0b" : "#22c55e",
              }}>
              {isDraw ? "Nul" : `Vic. ${homeWon ? (match.homeTeam.shortName || match.homeTeam.tla) : (match.awayTeam.shortName || match.awayTeam.tla)}`}
            </span>
          </div>

          {/* Away team */}
          <div className={`flex flex-col items-center gap-2 ${!awayWon && !isDraw ? "opacity-50" : ""}`}>
            {match.awayTeam.crest
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={match.awayTeam.crest} alt={match.awayTeam.shortName} className="w-10 h-10 object-contain" />
              : <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xs font-black" style={{ color: "#6b7c96" }}>{match.awayTeam.tla?.slice(0, 2)}</div>
            }
            <p className="text-xs font-semibold text-center" style={{ color: "#e8edf5" }}>
              {match.awayTeam.shortName || match.awayTeam.tla}
            </p>
            {awayWon && <Trophy size={12} style={{ color: "#f59e0b" }} />}
          </div>
        </div>

        {/* Toggle details */}
        {(hasGoalDetails || hasPrediction) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-3 flex items-center justify-center gap-1.5 py-1.5 text-xs transition-colors hover:opacity-70"
            style={{ color: "#6b7c96" }}>
            <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
            {expanded ? "Moins" : "Buteurs & prédiction"}
          </button>
        )}

        {expanded && (
          <div className="mt-3 space-y-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            {/* Goal details */}
            {hasGoalDetails && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: "#6b7c96" }}>
                    {match.homeTeam.shortName || match.homeTeam.tla}
                  </p>
                  <GoalList goals={match.homeGoals} teamName={match.homeTeam.name} />
                  {match.homeGoals.length === 0 && (
                    <p className="text-xs" style={{ color: "#6b7c96" }}>–</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: "#6b7c96" }}>
                    {match.awayTeam.shortName || match.awayTeam.tla}
                  </p>
                  <GoalList goals={match.awayGoals} teamName={match.awayTeam.name} />
                  {match.awayGoals.length === 0 && (
                    <p className="text-xs" style={{ color: "#6b7c96" }}>–</p>
                  )}
                </div>
              </div>
            )}

            {/* Saved prediction */}
            <PredictionBadge saved={savedPrediction} actualResult={match.result} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResultsTab() {
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedPreds, setSavedPreds] = useState<SavedPrediction[]>([]);
  const [filterMatchday, setFilterMatchday] = useState<number | null>(null);

  useEffect(() => {
    setSavedPreds(loadPredictions());
    fetch("/api/results?limit=50")
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const matchdays = data ? [...new Set(data.matches.map((m) => m.matchday))].sort((a, b) => b - a) : [];

  const filteredMatches = data?.matches.filter(
    (m) => filterMatchday === null || m.matchday === filterMatchday
  ) ?? [];

  // Prediction accuracy stats
  const matchesWithPredictions = filteredMatches.filter((m) =>
    savedPreds.some((p) => p.matchId === m.id)
  );
  const correctPredictions = matchesWithPredictions.filter((m) => {
    const saved = savedPreds.find((p) => p.matchId === m.id);
    return saved?.prediction.winner === m.result;
  });
  const accuracy = matchesWithPredictions.length > 0
    ? Math.round((correctPredictions.length / matchesWithPredictions.length) * 100)
    : null;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "#0d1421", border: "1px solid #1e2d42" }} />
        ))}
      </div>
    );
  }

  if (error) return <div className="text-center py-16 text-red-400 text-sm">{error}</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "#e8edf5" }}>
            <Target size={17} style={{ color: "#00d4ff" }} /> Résultats Ligue 1
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
            Scores · Buteurs · Vos prédictions
          </p>
        </div>
        {savedPreds.length > 0 && (
          <button
            onClick={downloadCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}>
            <Download size={12} /> Exporter CSV
          </button>
        )}
      </div>

      {/* Accuracy stats */}
      {accuracy !== null && (
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl flex-1 min-w-48"
            style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
            <div className="text-center">
              <p className="text-2xl font-black" style={{ color: accuracy >= 60 ? "#22c55e" : accuracy >= 40 ? "#f59e0b" : "#ef4444" }}>
                {accuracy}%
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>Précision</p>
            </div>
            <div style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: 16 }}>
              <p className="text-sm font-bold" style={{ color: "#e8edf5" }}>
                {correctPredictions.length}/{matchesWithPredictions.length}
              </p>
              <p className="text-xs" style={{ color: "#6b7c96" }}>prédictions correctes</p>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle size={10} style={{ color: "#22c55e" }} />
                <span className="text-xs" style={{ color: "#22c55e" }}>{correctPredictions.length} correct</span>
                <XCircle size={10} style={{ color: "#ef4444" }} />
                <span className="text-xs" style={{ color: "#ef4444" }}>{matchesWithPredictions.length - correctPredictions.length} manqué</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Matchday filter */}
      {matchdays.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilterMatchday(null)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: filterMatchday === null ? "rgba(0,212,255,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${filterMatchday === null ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.08)"}`,
              color: filterMatchday === null ? "#00d4ff" : "#6b7c96",
            }}>
            Tous
          </button>
          {matchdays.slice(0, 10).map((md) => (
            <button
              key={md}
              onClick={() => setFilterMatchday(md)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: filterMatchday === md ? "rgba(0,212,255,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${filterMatchday === md ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                color: filterMatchday === md ? "#00d4ff" : "#6b7c96",
              }}>
              J{md}
            </button>
          ))}
        </div>
      )}

      {filteredMatches.length === 0 && (
        <div className="text-center py-16" style={{ color: "#6b7c96" }}>
          <Minus size={24} className="mx-auto mb-2 opacity-40" />
          <p>Aucun résultat disponible.</p>
          <p className="text-xs mt-1">Les matchs terminés apparaîtront ici.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {filteredMatches.map((match, i) => {
          const saved = savedPreds.find((p) => p.matchId === match.id) ?? null;
          return (
            <div key={match.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
              <MatchResultCard match={match} savedPrediction={saved} />
            </div>
          );
        })}
      </div>

      {savedPreds.length === 0 && (
        <div className="mt-6 px-4 py-3 rounded-xl text-xs text-center"
          style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)", color: "#6b7c96" }}>
          Vos prédictions seront automatiquement sauvegardées lorsque vous visitez l'onglet <strong style={{ color: "#00d4ff" }}>Prédictions IA</strong>.
        </div>
      )}
    </div>
  );
}
