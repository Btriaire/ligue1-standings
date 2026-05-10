"use client";

import { useEffect, useState, useMemo } from "react";
import { Zap, TrendingUp, Shield, Target, Clock, Heart, Star, ChevronDown, ChevronUp } from "lucide-react";

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

interface Prediction {
  homeProb: number;
  drawProb: number;
  awayProb: number;
  winner: "home" | "away" | "draw";
  confidence: "high" | "medium" | "low";
  homeXG: number;
  awayXG: number;
}

interface MatchPrediction {
  id: number;
  date: string;
  matchday: number;
  homeTeam: TeamPred;
  awayTeam: TeamPred;
  prediction: Prediction;
}

interface PredData { predictions: MatchPrediction[]; matchday: number }

interface EmoEntry { predictionDelta: number; emotionalScore: number }

interface ExpertMatch {
  homeTeam: string;
  awayTeam: string;
  league: string;
  prediction: "home" | "draw" | "away";
  confidence: "high" | "medium" | "low";
  confidenceScore?: number;
  odds?: { home: number; draw: number; away: number };
  source?: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function calcWinner(h: number, d: number, a: number): "home" | "away" | "draw" {
  return h > a && h > d ? "home" : a > h && a > d ? "away" : "draw";
}
function calcConfidence(h: number, d: number, a: number): "high" | "medium" | "low" {
  const m = Math.max(h, d, a);
  return m >= 55 ? "high" : m >= 42 ? "medium" : "low";
}

function normalizeName(n: string): string {
  return n.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fc|sc|ac|og|rc|as|oc|stade|olympique|sporting|club|football|union)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}
function teamMatches(expertName: string, ourName: string): boolean {
  const e = normalizeName(expertName);
  const o = normalizeName(ourName);
  if (e === o) return true;
  const ew = e.split(" ").filter((w) => w.length > 3);
  const ow = o.split(" ").filter((w) => w.length > 3);
  return ew.some((w) => o.includes(w)) || ow.some((w) => e.includes(w));
}

function applyEmoCorrection(pred: Prediction, homeEmo?: EmoEntry, awayEmo?: EmoEntry): {
  corrected: Prediction;
  homeDelta: number;
  awayDelta: number;
  homeScore: number | null;
  awayScore: number | null;
} {
  const homeDelta = homeEmo?.predictionDelta ?? 0;
  const awayDelta = awayEmo?.predictionDelta ?? 0;

  if (homeDelta === 0 && awayDelta === 0) {
    return { corrected: pred, homeDelta: 0, awayDelta: 0, homeScore: homeEmo?.emotionalScore ?? null, awayScore: awayEmo?.emotionalScore ?? null };
  }

  let homeProb = Math.max(5, Math.min(90, pred.homeProb + homeDelta - awayDelta));
  let awayProb = Math.max(5, Math.min(90, pred.awayProb + awayDelta - homeDelta));
  let drawProb = pred.drawProb;
  const sum = homeProb + awayProb + drawProb;
  homeProb = Math.round((homeProb / sum) * 100);
  awayProb = Math.round((awayProb / sum) * 100);
  drawProb = 100 - homeProb - awayProb;

  return {
    corrected: { ...pred, homeProb, awayProb, drawProb, winner: calcWinner(homeProb, drawProb, awayProb), confidence: calcConfidence(homeProb, drawProb, awayProb) },
    homeDelta,
    awayDelta,
    homeScore: homeEmo?.emotionalScore ?? null,
    awayScore: awayEmo?.emotionalScore ?? null,
  };
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

const CONF = {
  high:   { label: "Confiance élevée",  color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  medium: { label: "Confiance moyenne", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  low:    { label: "Match serré",        color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

function ProbBar({ homeProb, drawProb, awayProb, winner }: { homeProb: number; drawProb: number; awayProb: number; winner: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex rounded-lg overflow-hidden h-3">
        <div className="transition-all duration-700" style={{ width: `${homeProb}%`, background: winner === "home" ? "#00d4ff" : "rgba(0,212,255,0.3)" }} />
        <div className="transition-all duration-700" style={{ width: `${drawProb}%`, background: "rgba(148,163,184,0.3)" }} />
        <div className="transition-all duration-700" style={{ width: `${awayProb}%`, background: winner === "away" ? "#7c3aed" : "rgba(124,58,237,0.3)" }} />
      </div>
      <div className="flex justify-between text-xs font-mono">
        <span style={{ color: winner === "home" ? "#00d4ff" : "#6b7c96" }}>{homeProb}%</span>
        <span style={{ color: "#6b7c96" }}>{drawProb}%</span>
        <span style={{ color: winner === "away" ? "#7c3aed" : "#6b7c96" }}>{awayProb}%</span>
      </div>
    </div>
  );
}

function Toggle({ enabled, onToggle, label, color = "#f472b6" }: { enabled: boolean; onToggle: () => void; label: string; color?: string }) {
  const activeColor = color;
  return (
    <button onClick={onToggle} className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all"
      style={{
        background: enabled ? `${activeColor}1a` : "rgba(255,255,255,0.04)",
        border: `1px solid ${enabled ? `${activeColor}4d` : "rgba(255,255,255,0.08)"}`,
      }}>
      <div className="w-9 h-5 rounded-full relative transition-colors flex-shrink-0"
        style={{ background: enabled ? `${activeColor}99` : "rgba(255,255,255,0.15)" }}>
        <div className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
          style={{ left: enabled ? "18px" : "2px", background: enabled ? activeColor : "#6b7c96" }} />
      </div>
      <span className="text-xs font-semibold" style={{ color: enabled ? activeColor : "#6b7c96" }}>{label}</span>
    </button>
  );
}

function MatchCard({
  match, useEmotional, emoMap, expertMatches,
}: {
  match: MatchPrediction;
  useEmotional: boolean;
  emoMap: Map<number, EmoEntry>;
  expertMatches: ExpertMatch[];
}) {
  const { day, time } = formatDate(match.date);
  const [showDetail, setShowDetail] = useState(false);

  const homeEmo = emoMap.get(match.homeTeam.id);
  const awayEmo = emoMap.get(match.awayTeam.id);
  const { corrected, homeDelta, awayDelta, homeScore, awayScore } = applyEmoCorrection(match.prediction, homeEmo, awayEmo);

  const pred = useEmotional ? corrected : match.prediction;
  const hasCorrectionApplied = useEmotional && (homeDelta !== 0 || awayDelta !== 0);
  const conf = CONF[pred.confidence];
  const winnerTeam = pred.winner === "home" ? match.homeTeam : pred.winner === "away" ? match.awayTeam : null;

  // Expert prediction matching
  const expertMatch = expertMatches.find(
    (e) => teamMatches(e.homeTeam, match.homeTeam.name) && teamMatches(e.awayTeam, match.awayTeam.name)
  );
  const expertAgrees = expertMatch && expertMatch.prediction === pred.winner;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid #1e2d42", background: "rgba(0,0,0,0.2)" }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: "#6b7c96" }}>
          <Clock size={11} /><span>{day} · {time}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: conf.bg, color: conf.color }}>
          <Zap size={10} />{conf.label}
        </div>
      </div>

      <div className="px-5 py-5">
        {/* Teams */}
        <div className="grid grid-cols-3 items-center gap-4 mb-5">
          <div className={`flex flex-col items-center gap-2 ${pred.winner === "home" ? "opacity-100" : "opacity-60"}`}>
            {match.homeTeam.crest
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={match.homeTeam.crest} alt={match.homeTeam.shortName} className="w-12 h-12 object-contain" />
              : <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center font-black text-sm" style={{ color: "#6b7c96" }}>{match.homeTeam.tla?.slice(0, 2)}</div>
            }
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: "#e8edf5" }}>{match.homeTeam.shortName || match.homeTeam.tla}</p>
              <p className="text-xs" style={{ color: "#6b7c96" }}>{match.homeTeam.position}e · {match.homeTeam.points}pts</p>
            </div>
            {pred.winner === "home" && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(0,212,255,0.15)", color: "#00d4ff" }}>Favori</span>}
            {useEmotional && homeEmo && (
              <span className="text-xs" style={{ color: homeDelta > 0 ? "#22c55e" : homeDelta < 0 ? "#ef4444" : "#6b7c96" }}>
                ❤ {homeEmo.emotionalScore}
                {homeDelta !== 0 && <span className="font-bold"> ({homeDelta > 0 ? "+" : ""}{homeDelta}%)</span>}
              </span>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="text-center">
              <p className="text-2xl font-black" style={{ color: "#e8edf5" }}>VS</p>
              {pred.winner === "draw" && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(148,163,184,0.15)", color: "#94a3b8" }}>Nul probable</span>}
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: "#6b7c96" }}>
              <div className="text-center"><p className="font-mono font-bold" style={{ color: "#e8edf5" }}>{pred.homeXG}</p><p>xG</p></div>
              <Target size={12} />
              <div className="text-center"><p className="font-mono font-bold" style={{ color: "#e8edf5" }}>{pred.awayXG}</p><p>xG</p></div>
            </div>
          </div>

          <div className={`flex flex-col items-center gap-2 ${pred.winner === "away" ? "opacity-100" : "opacity-60"}`}>
            {match.awayTeam.crest
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={match.awayTeam.crest} alt={match.awayTeam.shortName} className="w-12 h-12 object-contain" />
              : <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center font-black text-sm" style={{ color: "#6b7c96" }}>{match.awayTeam.tla?.slice(0, 2)}</div>
            }
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: "#e8edf5" }}>{match.awayTeam.shortName || match.awayTeam.tla}</p>
              <p className="text-xs" style={{ color: "#6b7c96" }}>{match.awayTeam.position}e · {match.awayTeam.points}pts</p>
            </div>
            {pred.winner === "away" && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>Favori</span>}
            {useEmotional && awayEmo && (
              <span className="text-xs" style={{ color: awayDelta > 0 ? "#22c55e" : awayDelta < 0 ? "#ef4444" : "#6b7c96" }}>
                ❤ {awayEmo.emotionalScore}
                {awayDelta !== 0 && <span className="font-bold"> ({awayDelta > 0 ? "+" : ""}{awayDelta}%)</span>}
              </span>
            )}
          </div>
        </div>

        {/* Prob bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "#6b7c96" }}>
            <span>Victoire dom.</span><span>Nul</span><span>Victoire ext.</span>
          </div>
          <ProbBar homeProb={pred.homeProb} drawProb={pred.drawProb} awayProb={pred.awayProb} winner={pred.winner} />
        </div>

        {/* Stats comparison */}
        <div className="grid grid-cols-3 gap-2 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {[
            { icon: <TrendingUp size={12} />, label: "Pts/match", home: match.homeTeam.ppg.toFixed(1), away: match.awayTeam.ppg.toFixed(1), homeWins: match.homeTeam.ppg >= match.awayTeam.ppg },
            { icon: <Target size={12} />, label: "Buts/match", home: (match.homeTeam.goalsFor / Math.max(match.homeTeam.goalsFor + match.homeTeam.goalsAgainst, 1) * 2).toFixed(1), away: (match.awayTeam.goalsFor / Math.max(match.awayTeam.goalsFor + match.awayTeam.goalsAgainst, 1) * 2).toFixed(1), homeWins: match.homeTeam.goalsFor >= match.awayTeam.goalsFor },
            { icon: <Shield size={12} />, label: "Défense", home: match.homeTeam.goalsAgainst, away: match.awayTeam.goalsAgainst, homeWins: match.homeTeam.goalsAgainst <= match.awayTeam.goalsAgainst, lowerIsBetter: true },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1" style={{ color: "#6b7c96" }}>{stat.icon}<span className="text-xs">{stat.label}</span></div>
              <div className="flex items-center justify-center gap-2 text-sm font-mono font-bold">
                <span style={{ color: stat.homeWins ? "#22c55e" : "#ef4444" }}>{stat.home}</span>
                <span style={{ color: "#1e2d42" }}>|</span>
                <span style={{ color: !stat.homeWins ? (stat.lowerIsBetter ? "#22c55e" : "#22c55e") : (stat.lowerIsBetter ? "#ef4444" : "#ef4444") }}>{stat.away}</span>
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
              Victoire {winnerTeam.shortName || winnerTeam.tla} — {Math.max(pred.homeProb, pred.awayProb)}%
            </p>
          </div>
        )}
        {pred.winner === "draw" && (
          <div className="mt-4 px-4 py-3 rounded-xl text-center" style={{ background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.15)" }}>
            <p className="text-xs" style={{ color: "#6b7c96" }}>Prédiction IA</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: "#94a3b8" }}>Match nul probable — {pred.drawProb}%</p>
          </div>
        )}

        {/* Emotional correction badge */}
        {hasCorrectionApplied && (
          <div className="mt-2 px-3 py-2 rounded-xl flex flex-wrap items-center gap-2 text-xs"
            style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.2)" }}>
            <Heart size={12} className="text-pink-400 flex-shrink-0" />
            <span style={{ color: "#f472b6" }}>Correction émotionnelle :</span>
            <span style={{ color: "#94a3b8" }}>
              brut {match.prediction.homeProb}%–{match.prediction.awayProb}%
              → <strong style={{ color: "#f472b6" }}>{pred.homeProb}%–{pred.awayProb}%</strong>
            </span>
            {homeScore !== null && (
              <span style={{ color: "#6b7c96" }}>
                (❤ {homeScore} {homeDelta !== 0 ? `→ ${homeDelta > 0 ? "+" : ""}${homeDelta}%` : ""} | ❤ {awayScore} {awayDelta !== 0 ? `→ ${awayDelta > 0 ? "+" : ""}${awayDelta}%` : ""})
              </span>
            )}
          </div>
        )}

        {/* Expert prediction badge */}
        {expertMatch && (
          <div className="mt-2 px-3 py-2 rounded-xl flex items-center gap-2 text-xs"
            style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)" }}>
            <Star size={12} style={{ color: "#eab308", flexShrink: 0 }} />
            <span style={{ color: "#eab308" }}>Expert :</span>
            <span style={{ color: "#e8edf5" }}>
              {expertMatch.prediction === "home" ? `Victoire ${match.homeTeam.shortName}` : expertMatch.prediction === "away" ? `Victoire ${match.awayTeam.shortName}` : "Match nul"}
            </span>
            <span className="px-1.5 py-0.5 rounded text-xs font-bold ml-auto"
              style={{
                background: expertMatch.confidence === "high" ? "rgba(34,197,94,0.15)" : expertMatch.confidence === "medium" ? "rgba(245,158,11,0.15)" : "rgba(148,163,184,0.1)",
                color: expertMatch.confidence === "high" ? "#22c55e" : expertMatch.confidence === "medium" ? "#f59e0b" : "#94a3b8",
              }}>
              {expertMatch.confidence === "high" ? "Haute conf." : expertMatch.confidence === "medium" ? "Conf. moy." : "Incertain"}
              {expertMatch.confidenceScore ? ` ${expertMatch.confidenceScore}%` : ""}
            </span>
            {expertAgrees && (
              <span className="text-xs font-bold" style={{ color: "#22c55e" }}>✓ Accord</span>
            )}
            {!expertAgrees && (
              <span className="text-xs font-bold" style={{ color: "#f97316" }}>⚠ Diverge</span>
            )}
          </div>
        )}

        {/* Detail toggle */}
        <button onClick={() => setShowDetail(!showDetail)}
          className="w-full mt-3 flex items-center justify-center gap-1 py-1 text-xs transition-colors hover:opacity-70"
          style={{ color: "#6b7c96" }}>
          {showDetail ? <><ChevronUp size={12} /> Moins de détails</> : <><ChevronDown size={12} /> Détails techniques</>}
        </button>

        {showDetail && (
          <div className="mt-2 px-3 py-3 rounded-xl text-xs space-y-1"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ color: "#6b7c96" }}>Algorithme : Forme récente · PPG · Diff. buts · Position · Avantage domicile (+8%)</p>
            <p style={{ color: "#6b7c96" }}>Prédiction brute : Dom {match.prediction.homeProb}% · Nul {match.prediction.drawProb}% · Ext {match.prediction.awayProb}%</p>
            {useEmotional && homeEmo && awayEmo && (
              <p style={{ color: "#f472b6" }}>Score émotionnel : {match.homeTeam.shortName} {homeEmo.emotionalScore}/100 (Δ{homeDelta > 0 ? "+" : ""}{homeDelta}%) · {match.awayTeam.shortName} {awayEmo.emotionalScore}/100 (Δ{awayDelta > 0 ? "+" : ""}{awayDelta}%)</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PredictionsTab() {
  const [data, setData] = useState<PredData | null>(null);
  const [emoMap, setEmoMap] = useState<Map<number, EmoEntry>>(new Map());
  const [expertMatches, setExpertMatches] = useState<ExpertMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [emoLoading, setEmoLoading] = useState(true);
  const [expertLoading, setExpertLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useEmotional, setUseEmotional] = useState(true);
  const [useExpert, setUseExpert] = useState(true);

  useEffect(() => {
    // Fetch predictions (fast, base stats only)
    fetch("/api/predictions")
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    // Fetch emotional scores (may be slower)
    fetch("/api/emotional-score")
      .then((r) => r.json())
      .then((d) => {
        const map = new Map<number, EmoEntry>();
        for (const s of d.scores ?? []) map.set(s.teamId, { predictionDelta: s.predictionDelta, emotionalScore: s.emotionalScore });
        setEmoMap(map);
      })
      .catch(() => {})
      .finally(() => setEmoLoading(false));

    // Fetch expert predictions (optional, cached 1h)
    fetch("/api/expert-predictions")
      .then((r) => r.json())
      .then((d) => { if (d.available) setExpertMatches(d.matches ?? []); })
      .catch(() => {})
      .finally(() => setExpertLoading(false));
  }, []);

  const correctedCount = useMemo(() => {
    if (!data || !useEmotional) return 0;
    return data.predictions.filter((m) => {
      const h = emoMap.get(m.homeTeam.id)?.predictionDelta ?? 0;
      const a = emoMap.get(m.awayTeam.id)?.predictionDelta ?? 0;
      return h !== 0 || a !== 0;
    }).length;
  }, [data, emoMap, useEmotional]);

  const expertCount = useMemo(() => {
    if (!data) return 0;
    return data.predictions.filter((m) =>
      expertMatches.some((e) => teamMatches(e.homeTeam, m.homeTeam.name) && teamMatches(e.awayTeam, m.awayTeam.name))
    ).length;
  }, [data, expertMatches]);

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-72 rounded-2xl animate-pulse" style={{ background: "#0d1421", border: "1px solid #1e2d42" }} />
        ))}
      </div>
    );
  }

  if (error) return <div className="text-center py-16 text-red-400 text-sm">{error}</div>;
  if (!data?.predictions.length) return <div className="text-center py-16" style={{ color: "#6b7c96" }}>Aucun match à venir disponible.</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold" style={{ color: "#e8edf5" }}>
            Journée {data.matchday} — Analyse prédictive
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
            Forme · classement · buts · avantage domicile
            {useEmotional ? " · score émotionnel" : ""}
            {useExpert && expertCount > 0 ? " · prédictions expertes" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Toggle
            enabled={useEmotional}
            onToggle={() => setUseEmotional(!useEmotional)}
            label={emoLoading ? "Émotionnel…" : "Score émotionnel"}
            color="#f472b6"
          />
          <Toggle
            enabled={useExpert}
            onToggle={() => setUseExpert(!useExpert)}
            label={expertLoading ? "Experts…" : "Prédictions expertes"}
            color="#eab308"
          />
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff" }}>
            <Zap size={12} /> IA Prédictive
          </div>
        </div>
      </div>

      {/* Info banners */}
      {useEmotional && correctedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 text-xs"
          style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.2)" }}>
          <Heart size={13} className="text-pink-400 flex-shrink-0" />
          <span style={{ color: "#f472b6" }}><strong>{correctedCount} match{correctedCount > 1 ? "s" : ""}</strong> ajusté{correctedCount > 1 ? "s" : ""} par le score émotionnel</span>
          <span style={{ color: "#6b7c96" }}>· Le score émotionnel de chaque équipe est affiché sous son logo</span>
        </div>
      )}
      {useEmotional && !emoLoading && emoMap.size === 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 text-xs"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <span style={{ color: "#f59e0b" }}>⚠ Données émotionnelles non disponibles — prédictions brutes affichées</span>
        </div>
      )}
      {useExpert && expertCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 text-xs"
          style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)" }}>
          <Star size={13} style={{ color: "#eab308", flexShrink: 0 }} />
          <span style={{ color: "#eab308" }}><strong>{expertCount} match{expertCount > 1 ? "s" : ""}</strong> couverts par les experts</span>
        </div>
      )}

      {/* Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {data.predictions.map((match, i) => (
          <div key={match.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
            <MatchCard
              match={match}
              useEmotional={useEmotional}
              emoMap={emoMap}
              expertMatches={useExpert ? expertMatches : []}
            />
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-center" style={{ color: "#6b7c96" }}>
        * Prédictions algorithmiques à titre indicatif — pas de conseil de paris
      </p>
    </div>
  );
}
