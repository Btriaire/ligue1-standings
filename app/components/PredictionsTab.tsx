"use client";

import { useEffect, useState, useMemo } from "react";
import { Lightning, TrendUp, Shield, Target, Clock, Heart, Star, CaretDown, CaretUp, DownloadSimple, Fire } from "@phosphor-icons/react";
import { useConfig } from "@/app/lib/config";
import { upsertPrediction, downloadCSV, loadPredictions } from "@/app/lib/predictions-store";
import FunFact from "./FunFact";
import LoadingBar from "./LoadingBar";
import { isWorldCupHot } from "@/app/lib/worldCup";

interface TeamPred {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  position: number;
  points: number;
  playedGames: number;
  form: string | null;
  ppg: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
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
  /** Vig-removed implied probabilities from Betclic (0-100) */
  impliedProbs?: { home: number; draw: number; away: number };
  source?: string;
}

// ── Algorithm helpers ─────────────────────────────────────────────────────────

function formScore(form: string | null | undefined): number {
  if (!form) return 0.4;
  const results = form.split(",").filter(Boolean).slice(-5);
  if (results.length === 0) return 0.4;
  const pts = results.reduce((a, r) => a + (r === "W" ? 3 : r === "D" ? 1 : 0), 0);
  return pts / (results.length * 3);
}

function calcFormMomentum(form: string | null | undefined): number {
  if (!form) return 0;
  const results = form.split(",").filter(Boolean);
  if (results.length < 3) return 0;
  const calc = (rs: string[]) => {
    if (rs.length === 0) return 0;
    return rs.reduce((a, r) => a + (r === "W" ? 3 : r === "D" ? 1 : 0), 0) / (rs.length * 3);
  };
  const recent3 = calc(results.slice(-3));
  const all5 = calc(results.slice(-5));
  return (recent3 - all5) * 0.12; // ±0.12 max
}

function teamStrengthClient(
  team: TeamPred,
  isHome: boolean,
  homeAdv: number,
  momentumEnabled: boolean
): number {
  const ppg = team.playedGames > 0 ? team.points / team.playedGames : 0;
  const gdpg = team.playedGames > 0 ? (team.goalDifference ?? 0) / team.playedGames : 0;
  const form = formScore(team.form);
  const posScore = (19 - team.position) / 17;
  const base = 0.35 * (ppg / 3) + 0.25 * ((gdpg + 3) / 6) + 0.25 * form + 0.15 * posScore;
  const momentum = momentumEnabled ? calcFormMomentum(team.form) : 0;
  const homeBonus = isHome ? homeAdv / 100 : 0;
  return Math.min(1, Math.max(0, base + momentum + homeBonus));
}

function recomputePrediction(
  match: MatchPrediction,
  homeAdv: number,
  momentumEnabled: boolean
): Prediction {
  const homeStr = teamStrengthClient(match.homeTeam, true, homeAdv, momentumEnabled);
  const awayStr = teamStrengthClient(match.awayTeam, false, homeAdv, momentumEnabled);
  const total = homeStr + awayStr + 0.001;
  const rawHome = homeStr / total;
  const rawAway = awayStr / total;
  const diff = Math.abs(rawHome - rawAway);
  const drawFactor = Math.max(0.12, 0.32 - diff * 0.6);
  let homeProb = rawHome * (1 - drawFactor);
  let awayProb = rawAway * (1 - drawFactor);
  let drawProb = drawFactor;
  const sum = homeProb + awayProb + drawProb;
  homeProb = Math.round((homeProb / sum) * 100);
  awayProb = Math.round((awayProb / sum) * 100);
  drawProb = 100 - homeProb - awayProb;
  const winner: "home" | "away" | "draw" =
    homeProb > awayProb && homeProb > drawProb ? "home" :
    awayProb > homeProb && awayProb > drawProb ? "away" : "draw";
  const confidence: "high" | "medium" | "low" =
    Math.max(homeProb, awayProb, drawProb) >= 55 ? "high" :
    Math.max(homeProb, awayProb, drawProb) >= 42 ? "medium" : "low";
  const homeAdvFrac = homeAdv / 100;
  const homeXG = +(((match.homeTeam.goalsFor / Math.max(match.homeTeam.playedGames, 1)) * 0.6 +
    (match.awayTeam.goalsAgainst / Math.max(match.awayTeam.playedGames, 1)) * 0.4) * (1 + homeAdvFrac / 2)).toFixed(1);
  const awayXG = +(((match.awayTeam.goalsFor / Math.max(match.awayTeam.playedGames, 1)) * 0.6 +
    (match.homeTeam.goalsAgainst / Math.max(match.homeTeam.playedGames, 1)) * 0.4) * 0.95).toFixed(1);
  return { homeProb, drawProb, awayProb, winner, confidence, homeXG, awayXG };
}

// ── UI helpers ────────────────────────────────────────────────────────────────

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

/**
 * Build a prediction from Betclic implied probabilities, then apply facteur additionnel weighting.
 * The emotional score shifts the home/away probabilities up to ±8pp based on the delta
 * between the two teams' emotional scores.
 */
function betclicWithEmo(
  impliedProbs: { home: number; draw: number; away: number },
  baseXG: { homeXG: number; awayXG: number },
  homeEmo?: EmoEntry,
  awayEmo?: EmoEntry,
): { pred: Prediction; emoShift: number; homeScore: number | null; awayScore: number | null } {
  const homeScore = homeEmo?.emotionalScore ?? null;
  const awayScore = awayEmo?.emotionalScore ?? null;

  // Emotional shift: difference between normalized emo scores, max ±8pp
  let emoShift = 0;
  if (homeScore !== null && awayScore !== null) {
    const normalizedDelta = ((homeScore - awayScore) / 100); // -1 to +1
    emoShift = Math.round(normalizedDelta * 8); // max ±8pp
  }

  let hp = Math.max(5, Math.min(88, impliedProbs.home + emoShift));
  let ap = Math.max(5, Math.min(88, impliedProbs.away - emoShift));
  let dp = impliedProbs.draw;
  const sum = hp + ap + dp;
  hp = Math.round((hp / sum) * 100);
  ap = Math.round((ap / sum) * 100);
  dp = 100 - hp - ap;

  return {
    pred: {
      homeProb: hp, drawProb: dp, awayProb: ap,
      winner: calcWinner(hp, dp, ap),
      confidence: calcConfidence(hp, dp, ap),
      homeXG: baseXG.homeXG,
      awayXG: baseXG.awayXG,
    },
    emoShift,
    homeScore,
    awayScore,
  };
}

function applyEmoCorrection(
  pred: Prediction,
  homeEmo?: EmoEntry,
  awayEmo?: EmoEntry
): { corrected: Prediction; homeDelta: number; awayDelta: number; homeScore: number | null; awayScore: number | null } {
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

function FormMini({ form }: { form: string | null | undefined }) {
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

function MomentumBadge({ form }: { form: string | null | undefined }) {
  const momentum = calcFormMomentum(form);
  if (Math.abs(momentum) < 0.01) return null;
  const isPos = momentum > 0;
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ background: isPos ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: isPos ? "#22c55e" : "#ef4444" }}>
      <Fire size={8} />
      {isPos ? "+" : ""}{Math.round(momentum * 100)}%
    </span>
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

// ── Spider chart ──────────────────────────────────────────────────────────────
// Pure-SVG hexagonal radar comparing the home and away teams across 6 axes:
// attaque, défense, forme, régularité, xG, classement. Each axis is normalized
// to 0..1 so the two polygons are directly comparable regardless of league.
function TeamSpiderChart({ match, pred }: { match: MatchPrediction; pred: Prediction }) {
  const home = match.homeTeam;
  const away = match.awayTeam;

  // Normalize a value to 0..1 with a sensible upper bound for L1/L2 ranges.
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const perGame = (n: number, gp: number) => (gp > 0 ? n / gp : 0);

  // Position rank → 0..1 (1st = 1.0, 20th = 0.05). Total teams unknown, use 20.
  const rank = (pos: number) => clamp01(1 - (pos - 1) / 19);

  const axes: Array<{ label: string; h: number; a: number }> = [
    { label: "Attaque",
      h: clamp01(perGame(home.goalsFor, home.playedGames) / 3),
      a: clamp01(perGame(away.goalsFor, away.playedGames) / 3) },
    { label: "Défense",
      h: clamp01(1 - perGame(home.goalsAgainst, home.playedGames) / 3),
      a: clamp01(1 - perGame(away.goalsAgainst, away.playedGames) / 3) },
    { label: "Forme",
      h: clamp01(formScore(home.form)),
      a: clamp01(formScore(away.form)) },
    { label: "Régularité",
      h: clamp01(home.ppg / 3),
      a: clamp01(away.ppg / 3) },
    { label: "xG",
      h: clamp01(pred.homeXG / 3),
      a: clamp01(pred.awayXG / 3) },
    { label: "Rang",
      h: rank(home.position),
      a: rank(away.position) },
  ];

  // Geometry — 220×200 viewBox, hexagon centred at (110, 100), max radius 70.
  const cx = 110, cy = 100, R = 70;
  const N = axes.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
  const point = (i: number, r: number) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))];

  // Concentric rings for the grid (4 levels).
  const rings = [0.25, 0.5, 0.75, 1].map(t =>
    Array.from({ length: N }, (_, i) => point(i, R * t).join(",")).join(" ")
  );
  // Spokes from centre.
  const spokes = Array.from({ length: N }, (_, i) => point(i, R));

  // Polygon for each team.
  const polyPoints = (vals: number[]) =>
    vals.map((v, i) => point(i, R * v).join(",")).join(" ");

  return (
    <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6b7c96" }}>
          Profil tactique comparé
        </span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1" style={{ color: "#00d4ff" }}>
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#00d4ff" }} />
            {home.shortName || home.tla}
          </span>
          <span className="flex items-center gap-1" style={{ color: "#a78bfa" }}>
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#a78bfa" }} />
            {away.shortName || away.tla}
          </span>
        </div>
      </div>
      <svg viewBox="0 0 220 200" className="w-full h-44">
        {/* Grid rings */}
        {rings.map((pts, i) => (
          <polygon key={i} points={pts} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
        ))}
        {/* Spokes */}
        {spokes.map((p, i) => (
          <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
        ))}
        {/* Away polygon (back) */}
        <polygon points={polyPoints(axes.map(a => a.a))}
          fill="rgba(167,139,250,0.22)" stroke="#a78bfa" strokeWidth={1.5} strokeLinejoin="round" />
        {/* Home polygon (front) */}
        <polygon points={polyPoints(axes.map(a => a.h))}
          fill="rgba(0,212,255,0.22)" stroke="#00d4ff" strokeWidth={1.5} strokeLinejoin="round" />
        {/* Axis dots */}
        {axes.map((a, i) => {
          const ph = point(i, R * a.h);
          const pa = point(i, R * a.a);
          return (
            <g key={i}>
              <circle cx={pa[0]} cy={pa[1]} r={2} fill="#a78bfa" />
              <circle cx={ph[0]} cy={ph[1]} r={2} fill="#00d4ff" />
            </g>
          );
        })}
        {/* Axis labels */}
        {axes.map((a, i) => {
          const labelR = R + 14;
          const [lx, ly] = point(i, labelR);
          // Anchor text by angle so labels don't overlap the polygon.
          const ang = angle(i);
          const anchor = Math.cos(ang) > 0.3 ? "start" : Math.cos(ang) < -0.3 ? "end" : "middle";
          return (
            <text key={i} x={lx} y={ly + 3} textAnchor={anchor}
              fontSize="9" fill="#9aa7ba" fontWeight="600">{a.label}</text>
          );
        })}
      </svg>
    </div>
  );
}

function Toggle({ enabled, onToggle, label, color = "#06b6d4" }: { enabled: boolean; onToggle: () => void; label: string; color?: string }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all"
      style={{
        background: enabled ? `${color}1a` : "rgba(255,255,255,0.04)",
        border: `1px solid ${enabled ? `${color}4d` : "rgba(255,255,255,0.08)"}`,
      }}>
      <div className="w-9 h-5 rounded-full relative transition-colors flex-shrink-0"
        style={{ background: enabled ? `${color}99` : "rgba(255,255,255,0.15)" }}>
        <div className="w-4 h-4 rounded-full absolute top-0.5 transition-all"
          style={{ left: enabled ? "18px" : "2px", background: enabled ? color : "#6b7c96" }} />
      </div>
      <span className="text-xs font-semibold" style={{ color: enabled ? color : "#6b7c96" }}>{label}</span>
    </button>
  );
}

// ── Buteurs potentiels ────────────────────────────────────────────────────────

interface Player1v1 { name: string; rating: number; goals: number; assists: number; imageUrl: string }
interface PlayersResponse { players: Player1v1[] }

function scorerLikelihood(p: Player1v1, emoScore: number | null): number {
  const base = p.goals * 3 + p.assists;
  if (base === 0 && p.rating === 0) return 0;
  const formBonus = emoScore !== null
    ? (emoScore >= 70 ? 1.3 : emoScore >= 55 ? 1.1 : emoScore <= 30 ? 0.7 : 1.0)
    : 1.0;
  return (base * 2 + p.rating * 0.1) * formBonus;
}

function ButeursPotentiels({
  homeTeamId, awayTeamId, homeTeamName, awayTeamName, homeEmoScore, awayEmoScore
}: {
  homeTeamId: number; awayTeamId: number;
  homeTeamName: string; awayTeamName: string;
  homeEmoScore: number | null; awayEmoScore: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [homePlayers, setHomePlayers] = useState<Player1v1[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player1v1[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (loaded) { setOpen(!open); return; }
    setOpen(true);
    setLoading(true);
    try {
      const [homeRes, awayRes] = await Promise.all([
        fetch(`/api/players?teamId=${homeTeamId}`),
        fetch(`/api/players?teamId=${awayTeamId}`),
      ]);
      const homeData: PlayersResponse = await homeRes.json();
      const awayData: PlayersResponse = await awayRes.json();
      setHomePlayers(homeData.players ?? []);
      setAwayPlayers(awayData.players ?? []);
      setLoaded(true);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const topHome = homePlayers
    .filter(p => p.goals > 0 || p.rating > 0)
    .sort((a, b) => scorerLikelihood(b, homeEmoScore) - scorerLikelihood(a, homeEmoScore))
    .slice(0, 3);

  const topAway = awayPlayers
    .filter(p => p.goals > 0 || p.rating > 0)
    .sort((a, b) => scorerLikelihood(b, awayEmoScore) - scorerLikelihood(a, awayEmoScore))
    .slice(0, 3);

  const allLikelihoods = [...topHome.map(p => scorerLikelihood(p, homeEmoScore)), ...topAway.map(p => scorerLikelihood(p, awayEmoScore))];
  const maxL = Math.max(...allLikelihoods, 1);

  return (
    <div className="mt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <button onClick={load}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all mt-3 hover:opacity-80"
        style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}>
        <Star size={11} />
        {loading ? "Chargement…" : open ? "Masquer buteurs potentiels" : "Buteurs potentiels"}
        {!loading && <CaretDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>

      {open && !loading && loaded && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {[
            { name: homeTeamName, players: topHome, emoScore: homeEmoScore, color: "#00d4ff" },
            { name: awayTeamName, players: topAway, emoScore: awayEmoScore, color: "#a78bfa" },
          ].map(({ name, players, emoScore, color }) => (
            <div key={name}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2 truncate" style={{ color }}>{name}</p>
              {players.length === 0 ? (
                <p className="text-[10px]" style={{ color: "#4b5563" }}>Données indisponibles</p>
              ) : players.map((p, i) => {
                const score = scorerLikelihood(p, emoScore);
                const pct = Math.round((score / maxL) * 100);
                return (
                  <div key={p.name} className="mb-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : null}
                      <span className="text-[10px] font-semibold truncate flex-1" style={{ color: i === 0 ? "#e8edf5" : "#94a3b8" }}>
                        {p.name.split(" ").slice(-1)[0]}
                      </span>
                      <span className="text-[9px] font-black" style={{ color }}>
                        {p.goals > 0 ? `⚽${p.goals}` : ""}{p.assists > 0 ? ` 🅰${p.assists}` : ""}
                      </span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: i === 0 ? color : `${color}70` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Match card ────────────────────────────────────────────────────────────────

function MatchCard({
  match,
  computedPrediction,
  useEmotional,
  useExpert,
  emoMap,
  expertMatches,
  showXG,
  showTechnicalDetails,
  formMomentumEnabled,
  homeAdv,
}: {
  match: MatchPrediction;
  computedPrediction: Prediction;
  useEmotional: boolean;
  useExpert: boolean;
  emoMap: Map<number, EmoEntry>;
  expertMatches: ExpertMatch[];
  showXG: boolean;
  showTechnicalDetails: boolean;
  formMomentumEnabled: boolean;
  homeAdv: number;
}) {
  const { day, time } = formatDate(match.date);
  const [showDetail, setShowDetail] = useState(false);

  const homeEmo = emoMap.get(match.homeTeam.id);
  const awayEmo = emoMap.get(match.awayTeam.id);

  const expertMatch = expertMatches.find(
    (e) => teamMatches(e.homeTeam, match.homeTeam.name) && teamMatches(e.awayTeam, match.awayTeam.name)
  );

  // Determine base probabilities source
  const hasBetclic = useExpert && !!(expertMatch?.impliedProbs);
  let pred: Prediction;
  let betclicEmoShift = 0;
  let homeScore: number | null = null;
  let awayScore: number | null = null;
  let homeDelta = 0;
  let awayDelta = 0;

  if (hasBetclic) {
    // PRIMARY PATH: Betclic implied probs → weighted by facteur additionnel
    const { pred: bp, emoShift, homeScore: hs, awayScore: as_ } = betclicWithEmo(
      expertMatch!.impliedProbs!,
      { homeXG: computedPrediction.homeXG, awayXG: computedPrediction.awayXG },
      useEmotional ? homeEmo : undefined,
      useEmotional ? awayEmo : undefined,
    );
    pred = bp;
    betclicEmoShift = emoShift;
    homeScore = hs;
    awayScore = as_;
  } else {
    // FALLBACK PATH: our algorithm + optional facteur additionnel correction
    const emoResult = applyEmoCorrection(computedPrediction, homeEmo, awayEmo);
    pred = useEmotional ? emoResult.corrected : computedPrediction;
    homeDelta = emoResult.homeDelta;
    awayDelta = emoResult.awayDelta;
    homeScore = emoResult.homeScore;
    awayScore = emoResult.awayScore;
  }

  const hasCorrectionApplied = useEmotional && (hasBetclic ? betclicEmoShift !== 0 : (homeDelta !== 0 || awayDelta !== 0));
  const conf = CONF[pred.confidence];
  const winnerTeam = pred.winner === "home" ? match.homeTeam : pred.winner === "away" ? match.awayTeam : null;
  const expertAgrees = expertMatch && expertMatch.prediction === pred.winner;

  const homeMomentum = calcFormMomentum(match.homeTeam.form);
  const awayMomentum = calcFormMomentum(match.awayTeam.form);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid #1e2d42", background: "rgba(0,0,0,0.2)" }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: "#6b7c96" }}>
          <Clock size={11} /><span>{day} · {time}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: conf.bg, color: conf.color }}>
          <Lightning size={10} />{conf.label}
        </div>
      </div>

      <div className="px-5 py-5">
        {/* Teams */}
        <div className="grid grid-cols-3 items-center gap-4 mb-5">
          {/* Home */}
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
            {formMomentumEnabled && Math.abs(homeMomentum) >= 0.01 && <MomentumBadge form={match.homeTeam.form} />}
            {useEmotional && homeEmo && (
              <span className="text-xs" style={{ color: homeDelta > 0 ? "#22c55e" : homeDelta < 0 ? "#ef4444" : "#6b7c96" }}>
                ❤ {homeEmo.emotionalScore}
                {homeDelta !== 0 && <span className="font-bold"> ({homeDelta > 0 ? "+" : ""}{homeDelta}%)</span>}
              </span>
            )}
          </div>

          {/* Center */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-center">
              <p className="text-2xl font-black" style={{ color: "#e8edf5" }}>VS</p>
              {pred.winner === "draw" && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(148,163,184,0.15)", color: "#94a3b8" }}>Nul probable</span>}
            </div>
            {showXG && (
              <div className="flex items-center gap-3 text-xs" style={{ color: "#6b7c96" }}>
                <div className="text-center"><p className="font-mono font-bold" style={{ color: "#e8edf5" }}>{pred.homeXG}</p><p>xG</p></div>
                <Target size={12} />
                <div className="text-center"><p className="font-mono font-bold" style={{ color: "#e8edf5" }}>{pred.awayXG}</p><p>xG</p></div>
              </div>
            )}
          </div>

          {/* Away */}
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
            {formMomentumEnabled && Math.abs(awayMomentum) >= 0.01 && <MomentumBadge form={match.awayTeam.form} />}
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {[
            { icon: <TrendUp size={12} />, label: "Pts/match", home: match.homeTeam.ppg.toFixed(1), away: match.awayTeam.ppg.toFixed(1), homeWins: match.homeTeam.ppg >= match.awayTeam.ppg },
            { icon: <Target size={12} />, label: "Buts/match", home: (match.homeTeam.goalsFor / Math.max(match.homeTeam.playedGames, 1)).toFixed(1), away: (match.awayTeam.goalsFor / Math.max(match.awayTeam.playedGames, 1)).toFixed(1), homeWins: match.homeTeam.goalsFor >= match.awayTeam.goalsFor },
            { icon: <Shield size={12} />, label: "BC/match", home: (match.homeTeam.goalsAgainst / Math.max(match.homeTeam.playedGames, 1)).toFixed(1), away: (match.awayTeam.goalsAgainst / Math.max(match.awayTeam.playedGames, 1)).toFixed(1), homeWins: match.homeTeam.goalsAgainst <= match.awayTeam.goalsAgainst },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1" style={{ color: "#6b7c96" }}>{stat.icon}<span className="text-xs">{stat.label}</span></div>
              <div className="flex items-center justify-center gap-2 text-sm font-mono font-bold">
                <span style={{ color: stat.homeWins ? "#22c55e" : "#ef4444" }}>{stat.home}</span>
                <span style={{ color: "#1e2d42" }}>|</span>
                <span style={{ color: !stat.homeWins ? "#22c55e" : "#ef4444" }}>{stat.away}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Spider chart — head-to-head profile across 6 normalized axes */}
        <TeamSpiderChart match={match} pred={pred} />

        {/* Form */}
        <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <FormMini form={match.homeTeam.form} />
          <span className="text-xs" style={{ color: "#6b7c96" }}>Forme récente</span>
          <FormMini form={match.awayTeam.form} />
        </div>

        {/* ── Betclic odds row ── */}
        {expertMatch?.odds && (
          <div className="mt-4 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(234,179,8,0.25)", background: "rgba(234,179,8,0.04)" }}>
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ borderBottom: "1px solid rgba(234,179,8,0.12)" }}>
              <Star size={10} style={{ color: "#eab308" }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#eab308" }}>
                {expertMatch?.source === "ExpertWEB" ? "Cotes ExpertWEB" : "Analyse experte"}
              </span>
              {hasBetclic && (
                <span className="text-[9px] ml-auto" style={{ color: "#6b7c96" }}>
                  {useEmotional && betclicEmoShift !== 0
                    ? `${expertMatch?.source ?? "Expert"} · ajusté facteur additionnel ${betclicEmoShift > 0 ? "+" : ""}${betclicEmoShift}pp`
                    : expertMatch?.source ?? "Expert"}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 divide-x" style={{ borderColor: "rgba(234,179,8,0.12)" }}>
              {[
                { label: "1 · Dom.", odds: expertMatch.odds.home, prob: expertMatch.impliedProbs?.home, color: "#00d4ff", win: pred.winner === "home" },
                { label: "X · Nul", odds: expertMatch.odds.draw, prob: expertMatch.impliedProbs?.draw, color: "#94a3b8", win: pred.winner === "draw" },
                { label: "2 · Ext.", odds: expertMatch.odds.away, prob: expertMatch.impliedProbs?.away, color: "#a78bfa", win: pred.winner === "away" },
              ].map(cell => (
                <div key={cell.label} className="flex flex-col items-center py-2 px-1" style={{ opacity: cell.win ? 1 : 0.55 }}>
                  <span className="text-base font-black" style={{ color: cell.win ? cell.color : "#e8edf5" }}>
                    {cell.odds > 0 ? cell.odds.toFixed(2) : "—"}
                  </span>
                  {cell.prob != null && (
                    <span className="text-[9px] font-semibold" style={{ color: cell.color }}>{cell.prob}%</span>
                  )}
                  <span className="text-[9px] mt-0.5" style={{ color: "#6b7c96" }}>{cell.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prediction summary */}
        {winnerTeam && (
          <div className="mt-2 px-4 py-3 rounded-xl text-center"
            style={{
              background: hasBetclic ? "rgba(234,179,8,0.07)" : "rgba(0,212,255,0.05)",
              border: hasBetclic ? "1px solid rgba(234,179,8,0.2)" : "1px solid rgba(0,212,255,0.15)",
            }}>
            <p className="text-xs" style={{ color: "#6b7c96" }}>
              {hasBetclic ? (expertMatch?.source ?? "Expert") : "AI FootPredictom"}
              {useEmotional && hasBetclic ? " + Facteur additionnel" : ""}
            </p>
            <p className="text-sm font-bold mt-0.5" style={{ color: hasBetclic ? "#eab308" : "#00d4ff" }}>
              Victoire {winnerTeam.shortName || winnerTeam.tla} — {Math.max(pred.homeProb, pred.awayProb)}%
            </p>
          </div>
        )}
        {pred.winner === "draw" && (
          <div className="mt-2 px-4 py-3 rounded-xl text-center"
            style={{
              background: hasBetclic ? "rgba(234,179,8,0.07)" : "rgba(148,163,184,0.05)",
              border: hasBetclic ? "1px solid rgba(234,179,8,0.2)" : "1px solid rgba(148,163,184,0.15)",
            }}>
            <p className="text-xs" style={{ color: "#6b7c96" }}>
              {hasBetclic ? (expertMatch?.source ?? "Expert") : "AI FootPredictom"}
              {useEmotional && hasBetclic ? " + Facteur additionnel" : ""}
            </p>
            <p className="text-sm font-bold mt-0.5" style={{ color: hasBetclic ? "#eab308" : "#94a3b8" }}>
              Match nul probable — {pred.drawProb}%
            </p>
          </div>
        )}

        {/* Facteur additionnel correction badge */}
        {hasCorrectionApplied && (
          <div className="mt-2 px-3 py-2 rounded-xl flex flex-wrap items-center gap-2 text-xs"
            style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.2)" }}>
            <Heart size={12} className="text-cyan-400 flex-shrink-0" />
            <span style={{ color: "#06b6d4" }}>Facteur additionnel :</span>
            {hasBetclic ? (
              <span style={{ color: "#94a3b8" }}>
                cotes brutes → pondérées <strong style={{ color: "#06b6d4" }}>{betclicEmoShift > 0 ? "+" : ""}{betclicEmoShift}pp</strong>
                {homeScore !== null && awayScore !== null && (
                  <span> ({match.homeTeam.shortName} ❤{homeScore} / {match.awayTeam.shortName} ❤{awayScore})</span>
                )}
              </span>
            ) : (
              <span style={{ color: "#94a3b8" }}>
                algo {computedPrediction.homeProb}%–{computedPrediction.awayProb}%
                → <strong style={{ color: "#06b6d4" }}>{pred.homeProb}%–{pred.awayProb}%</strong>
              </span>
            )}
          </div>
        )}

        {/* Expert algo agreement badge (when Betclic not available) */}
        {!hasBetclic && expertMatch && (
          <div className="mt-2 px-3 py-2 rounded-xl flex items-center gap-2 text-xs"
            style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)" }}>
            <Star size={12} style={{ color: "#eab308", flexShrink: 0 }} />
            <span style={{ color: "#eab308" }}>Expert :</span>
            <span style={{ color: "#e8edf5" }}>
              {expertMatch.prediction === "home" ? `Victoire ${match.homeTeam.shortName}` : expertMatch.prediction === "away" ? `Victoire ${match.awayTeam.shortName}` : "Match nul"}
            </span>
            {expertAgrees
              ? <span className="text-xs font-bold ml-auto" style={{ color: "#22c55e" }}>✓ Accord</span>
              : <span className="text-xs font-bold ml-auto" style={{ color: "#f97316" }}>⚠ Diverge</span>}
          </div>
        )}

        {/* Buteurs potentiels */}
        <ButeursPotentiels
          homeTeamId={match.homeTeam.id}
          awayTeamId={match.awayTeam.id}
          homeTeamName={match.homeTeam.shortName || match.homeTeam.tla}
          awayTeamName={match.awayTeam.shortName || match.awayTeam.tla}
          homeEmoScore={homeScore}
          awayEmoScore={awayScore}
        />

        {/* Detail toggle */}
        {showTechnicalDetails && (
          <button onClick={() => setShowDetail(!showDetail)}
            className="w-full mt-3 flex items-center justify-center gap-1 py-1 text-xs transition-colors hover:opacity-70"
            style={{ color: "#6b7c96" }}>
            {showDetail ? <><CaretUp size={12} /> Moins de détails</> : <><CaretDown size={12} /> Détails techniques</>}
          </button>
        )}

        {showTechnicalDetails && showDetail && (
          <div className="mt-2 px-3 py-3 rounded-xl text-xs space-y-1"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {hasBetclic ? (
              <p style={{ color: "#eab308" }}>
                Source principale : ExpertWEB (cotes {expertMatch?.odds?.home?.toFixed(2)} / {expertMatch?.odds?.draw?.toFixed(2)} / {expertMatch?.odds?.away?.toFixed(2)})
              </p>
            ) : (
              <p style={{ color: "#6b7c96" }}>
                Algorithme : Forme · PPG · Diff. buts · Position · Avantage dom. ({homeAdv}%)
                {formMomentumEnabled ? " · Élan de forme" : ""}
              </p>
            )}
            {!hasBetclic && (
              <p style={{ color: "#6b7c96" }}>
                Probabilités brutes : Dom {computedPrediction.homeProb}% · Nul {computedPrediction.drawProb}% · Ext {computedPrediction.awayProb}%
              </p>
            )}
            {formMomentumEnabled && !hasBetclic && (
              <p style={{ color: "#22c55e" }}>
                Élan : {match.homeTeam.shortName} {calcFormMomentum(match.homeTeam.form) > 0 ? "+" : ""}{Math.round(calcFormMomentum(match.homeTeam.form) * 100)}%
                · {match.awayTeam.shortName} {calcFormMomentum(match.awayTeam.form) > 0 ? "+" : ""}{Math.round(calcFormMomentum(match.awayTeam.form) * 100)}%
              </p>
            )}
            {useEmotional && homeScore !== null && awayScore !== null && (
              <p style={{ color: "#06b6d4" }}>
                Facteur additionnel : {match.homeTeam.shortName} ❤{homeScore}
                · {match.awayTeam.shortName} ❤{awayScore}
                {hasBetclic
                  ? ` → pondération cotes ${betclicEmoShift > 0 ? "+" : ""}${betclicEmoShift}pp`
                  : ` (Δ${homeDelta > 0 ? "+" : ""}${homeDelta}% / ${awayDelta > 0 ? "+" : ""}${awayDelta}%)`
                }
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── World Cup AI Predictions (static, AI-generated) ──────────────────────────

// WC-specific factor types
type WCFactorType =
  | "host"          // Home-country advantage
  | "champion"      // Defending champion pressure/boost
  | "revenge"       // Historical/political rivalry
  | "derby"         // Continental derby
  | "cohesion"      // High squad club cohesion
  | "momentum"      // Outstanding qualifier form
  | "underdog"      // Surprise factor / underdog energy
  | "veterans"      // Experienced squad in final tournament
  | "pressure"      // Must-win psychological pressure

const WC_FACTOR_META: Record<WCFactorType, { label: string; color: string; icon: string; desc: string }> = {
  host:      { label: "Avantage hôte",        color: "#00d4ff", icon: "🏟️", desc: "Soutien du public local · Acclimatation · Pression absente" },
  champion:  { label: "Tenant du titre",      color: "#fbbf24", icon: "🏆", desc: "Expérience de champions · Mais pression de confirmer" },
  revenge:   { label: "Revanche historique",  color: "#f97316", icon: "🔥", desc: "Contexte émotionnel fort · Motivation décuplée des deux côtés" },
  derby:     { label: "Derby continental",    color: "#a78bfa", icon: "⚡", desc: "Rivalité de voisinage · Matchs toujours serrés" },
  cohesion:  { label: "Cohésion de club",     color: "#22c55e", icon: "🤝", desc: "Joueurs évoluant ensemble en club · Automatismes rôdés" },
  momentum:  { label: "Élan qualificatif",    color: "#34d399", icon: "📈", desc: "Série impressionnante en éliminatoires · Confiance maximale" },
  underdog:  { label: "Effet surprise",       color: "#06b6d4", icon: "💥", desc: "L'équipe n'a rien à perdre · Jeu libéré et dangereux" },
  veterans:  { label: "Leadership vétérans",  color: "#94a3b8", icon: "🧠", desc: "Expérience décisive des matchs couperets · Gestion du stress" },
  pressure:  { label: "Pression enjeu",       color: "#ef4444", icon: "😤", desc: "Match décisif pour la qualification · Nerfs à vif" },
};

interface WCMatch {
  group: string; date: string; venue: string;
  home: string; away: string;
  hP: number; dP: number; aP: number;
  winner: "home" | "away" | "draw";
  conf: "high" | "medium" | "low";
  note: string;
  // Rich details
  scorePredict: string;         // e.g. "2-1"
  xgHome: number; xgAway: number;
  overUnder: "O2.5" | "U2.5" | "O1.5";
  btts: boolean;                // both teams to score
  keyHome: string;              // star player home
  keyAway: string;              // star player away
  h2h: string;                  // historical H2H summary
  h2hDetail: string;            // e.g. "8V 4N 5D (depuis 1966)"
  wcFactor: WCFactorType;       // main WC-specific factor
  wcFactorTeam: "home" | "away" | "both"; // which team it benefits
  momentumHome: string;         // qualifier form e.g. "8V 2N 0D"
  momentumAway: string;
  tacticalNote: string;         // AI tactical insight
}

const WC_MATCHES_DATA: WCMatch[] = [
  {
    group:"B", date:"11 juin", venue:"Mexico City – Azteca",
    home:"🇲🇽 Mexique", away:"🇪🇨 Équateur",
    hP:54, dP:24, aP:22, winner:"home", conf:"medium", note:"Match d'ouverture 🚀",
    scorePredict:"2-1", xgHome:1.9, xgAway:1.3,
    overUnder:"O2.5", btts:true,
    keyHome:"Hirving Lozano", keyAway:"Moisés Caicedo",
    h2h:"Mexique mène 6-3-4", h2hDetail:"13 confrontations · Mexique avantagé",
    wcFactor:"host", wcFactorTeam:"home",
    momentumHome:"7V 3N 0D", momentumAway:"6V 2N 2D",
    tacticalNote:"Ambiance Azteca unique au monde · Mexique très difficile à battre chez lui en match d'ouverture",
  },
  {
    group:"C", date:"12 juin", venue:"Los Angeles – SoFi Stadium",
    home:"🇺🇸 USA", away:"🇵🇦 Panama",
    hP:64, dP:22, aP:14, winner:"home", conf:"high", note:"",
    scorePredict:"2-0", xgHome:2.1, xgAway:0.8,
    overUnder:"U2.5", btts:false,
    keyHome:"Christian Pulisic", keyAway:"Rolando Blackburn",
    h2h:"USA mène 11-4-3", h2hDetail:"18 confrontations · Domination US",
    wcFactor:"host", wcFactorTeam:"home",
    momentumHome:"8V 1N 1D", momentumAway:"5V 3N 2D",
    tacticalNote:"Pulisic en forme record avec l'AC Milan · Panama qualifié de justesse",
  },
  {
    group:"A", date:"13 juin", venue:"Dallas – AT&T Stadium",
    home:"🇦🇷 Argentine", away:"🇨🇱 Chili",
    hP:65, dP:21, aP:14, winner:"home", conf:"high", note:"🏆 Tenant du titre",
    scorePredict:"2-0", xgHome:2.3, xgAway:0.9,
    overUnder:"O2.5", btts:false,
    keyHome:"Julián Álvarez", keyAway:"Alexis Sánchez",
    h2h:"Argentine mène 46-19-15", h2hDetail:"80 confrontations · Classique CONMEBOL",
    wcFactor:"champion", wcFactorTeam:"home",
    momentumHome:"7V 3N 0D", momentumAway:"4V 3N 3D",
    tacticalNote:"Messi incertain mais Álvarez et Lautaro suffisent · Chili en reconstruction post-génération dorée",
  },
  {
    group:"E", date:"14 juin", venue:"Miami – Hard Rock Stadium",
    home:"🇪🇸 Espagne", away:"🇲🇦 Maroc",
    hP:54, dP:27, aP:19, winner:"home", conf:"medium", note:"⚠️ Piège potentiel",
    scorePredict:"1-1", xgHome:1.6, xgAway:1.2,
    overUnder:"U2.5", btts:true,
    keyHome:"Lamine Yamal", keyAway:"Achraf Hakimi",
    h2h:"Espagne mène 5-2-1", h2hDetail:"8 confrontations · Maroc surprenant en 2022",
    wcFactor:"underdog", wcFactorTeam:"away",
    momentumHome:"9V 1N 0D", momentumAway:"7V 2N 1D",
    tacticalNote:"Maroc demi-finaliste 2022 · Hakimi très motivé face à l'Espagne · Match de référence du groupe",
  },
  {
    group:"F", date:"14 juin", venue:"New York – MetLife Stadium",
    home:"🇫🇷 France", away:"🇸🇦 Arabie Saoudite",
    hP:74, dP:15, aP:11, winner:"home", conf:"high", note:"🇫🇷 Les Bleus",
    scorePredict:"3-0", xgHome:2.8, xgAway:0.6,
    overUnder:"O2.5", btts:false,
    keyHome:"Kylian Mbappé", keyAway:"Salem Al-Dawsari",
    h2h:"France mène 3-1-0", h2hDetail:"Peu de confrontations · France nettement supérieure",
    wcFactor:"momentum", wcFactorTeam:"home",
    momentumHome:"8V 2N 0D", momentumAway:"4V 2N 4D",
    tacticalNote:"Mbappé veut effacer la défaite 2022 · Arabie Saoudite avait battu l'Argentine en 2022 mais niveau moindre ici",
  },
  {
    group:"D", date:"15 juin", venue:"Vancouver – BC Place",
    home:"🇨🇦 Canada", away:"🇭🇳 Honduras",
    hP:60, dP:24, aP:16, winner:"home", conf:"medium", note:"🏟️ Pays hôte",
    scorePredict:"2-0", xgHome:1.8, xgAway:0.7,
    overUnder:"U2.5", btts:false,
    keyHome:"Alphonso Davies", keyAway:"Alberth Elis",
    h2h:"Canada mène 6-4-5", h2hDetail:"15 confrontations · Légère avance Canada",
    wcFactor:"host", wcFactorTeam:"home",
    momentumHome:"6V 3N 1D", momentumAway:"4V 3N 3D",
    tacticalNote:"2e participation seulement au Canada · Davies en feu · Honduras solide en CONCACAF mais dépassé à ce niveau",
  },
  {
    group:"I", date:"15 juin", venue:"Boston – Gillette Stadium",
    home:"🏴󠁧󠁢󠁥󠁮󠁧󠁿 Angleterre", away:"🇸🇳 Sénégal",
    hP:57, dP:25, aP:18, winner:"home", conf:"medium", note:"",
    scorePredict:"2-1", xgHome:1.8, xgAway:1.1,
    overUnder:"O2.5", btts:true,
    keyHome:"Jude Bellingham", keyAway:"Sadio Mané",
    h2h:"Angleterre mène 5-2-2", h2hDetail:"9 confrontations · Sénégal montant",
    wcFactor:"veterans", wcFactorTeam:"home",
    momentumHome:"7V 2N 1D", momentumAway:"8V 1N 1D",
    tacticalNote:"Sénégal champion d'Afrique 2022 · Mané vétéran · Angleterre doit éviter le piège contre-attaquant",
  },
  {
    group:"G", date:"16 juin", venue:"San Francisco – Levi's Stadium",
    home:"🇧🇷 Brésil", away:"🇨🇴 Colombie",
    hP:56, dP:24, aP:20, winner:"home", conf:"medium", note:"Derby CONMEBOL",
    scorePredict:"2-1", xgHome:1.9, xgAway:1.3,
    overUnder:"O2.5", btts:true,
    keyHome:"Vinicius Jr", keyAway:"James Rodríguez",
    h2h:"Brésil mène 31-10-11", h2hDetail:"52 confrontations · Classique Amérique du Sud",
    wcFactor:"derby", wcFactorTeam:"both",
    momentumHome:"6V 3N 1D", momentumAway:"8V 1N 1D",
    tacticalNote:"Colombie invaincue en 2024 CONMEBOL qualifying (record) · Brésil en reconstruction mais talent intact",
  },
  {
    group:"H", date:"16 juin", venue:"Philadelphia – Lincoln Financial",
    home:"🇩🇪 Allemagne", away:"🇳🇱 Pays-Bas",
    hP:40, dP:30, aP:30, winner:"draw", conf:"low", note:"⚡ Choc européen",
    scorePredict:"1-1", xgHome:1.4, xgAway:1.4,
    overUnder:"O2.5", btts:true,
    keyHome:"Florian Wirtz", keyAway:"Virgil van Dijk",
    h2h:"Allemagne mène 24-13-12", h2hDetail:"49 confrontations · Rivalité historique intense",
    wcFactor:"derby", wcFactorTeam:"both",
    momentumHome:"7V 2N 1D", momentumAway:"8V 1N 1D",
    tacticalNote:"Wirtz meilleur joueur Bundesliga · Pays-Bas portés par une génération talentueuse · Aucun favori clair",
  },
  {
    group:"J", date:"17 juin", venue:"Houston – NRG Stadium",
    home:"🇮🇹 Italie", away:"🇭🇷 Croatie",
    hP:46, dP:32, aP:22, winner:"home", conf:"low", note:"Revanche Euro 2021",
    scorePredict:"1-0", xgHome:1.3, xgAway:0.9,
    overUnder:"U2.5", btts:false,
    keyHome:"Federico Chiesa", keyAway:"Luka Modrić",
    h2h:"Italie mène 9-4-5", h2hDetail:"18 confrontations · Modrić grand facteur",
    wcFactor:"veterans", wcFactorTeam:"away",
    momentumHome:"5V 4N 1D", momentumAway:"5V 3N 2D",
    tacticalNote:"Modrić possiblement son dernier grand tournoi · Italie solide défensivement mais créativité limitée",
  },
  {
    group:"F", date:"20 juin", venue:"New York – MetLife Stadium",
    home:"🇫🇷 France", away:"🇨🇭 Suisse",
    hP:67, dP:20, aP:13, winner:"home", conf:"high", note:"🇫🇷 Les Bleus MD2",
    scorePredict:"2-0", xgHome:2.2, xgAway:0.8,
    overUnder:"O2.5", btts:false,
    keyHome:"Antoine Griezmann", keyAway:"Granit Xhaka",
    h2h:"France mène 17-11-9", h2hDetail:"37 confrontations · Suisse avait éliminé la France en 2021",
    wcFactor:"revenge", wcFactorTeam:"home",
    momentumHome:"8V 2N 0D", momentumAway:"6V 2N 2D",
    tacticalNote:"La Suisse a éliminé la France à l'Euro 2020 (tirs au but) · Revanche en jeu · Xhaka leader mental clé",
  },
  {
    group:"D", date:"20 juin", venue:"Kansas City – Arrowhead Stadium",
    home:"🇺🇾 Uruguay", away:"🇵🇹 Portugal",
    hP:28, dP:26, aP:46, winner:"away", conf:"medium", note:"",
    scorePredict:"1-2", xgHome:1.0, xgAway:1.8,
    overUnder:"O2.5", btts:true,
    keyHome:"Darwin Núñez", keyAway:"Cristiano Ronaldo",
    h2h:"Uruguay mène 4-2-5", h2hDetail:"11 confrontations · Portugal léger avantage récent",
    wcFactor:"veterans", wcFactorTeam:"away",
    momentumHome:"6V 2N 2D", momentumAway:"7V 2N 1D",
    tacticalNote:"Ronaldo possiblement 5e et dernière CdM · Motivation extrême · Darwin Núñez seul atout offensif uruguayen",
  },
  {
    group:"E", date:"21 juin", venue:"Los Angeles – SoFi Stadium",
    home:"🇧🇪 Belgique", away:"🇯🇵 Japon",
    hP:53, dP:25, aP:22, winner:"home", conf:"medium", note:"⚠️ Ne pas sous-estimer",
    scorePredict:"2-1", xgHome:1.7, xgAway:1.2,
    overUnder:"O2.5", btts:true,
    keyHome:"Kevin De Bruyne", keyAway:"Takefusa Kubo",
    h2h:"Belgique mène 3-1-1", h2hDetail:"5 confrontations · Japon montant",
    wcFactor:"underdog", wcFactorTeam:"away",
    momentumHome:"5V 3N 2D", momentumAway:"8V 1N 1D",
    tacticalNote:"Japon invaincue sur 10 matchs qualifs · Kubo explosif · De Bruyne décisif mais Belgique en fin de cycle",
  },
  {
    group:"A", date:"22 juin", venue:"Seattle – Lumen Field",
    home:"🇦🇷 Argentine", away:"🇦🇺 Australie",
    hP:76, dP:14, aP:10, winner:"home", conf:"high", note:"",
    scorePredict:"3-0", xgHome:2.9, xgAway:0.6,
    overUnder:"O2.5", btts:false,
    keyHome:"Lionel Messi", keyAway:"Mat Ryan",
    h2h:"Argentine mène 4-1-0", h2hDetail:"5 confrontations · Argentine très largement",
    wcFactor:"champion", wcFactorTeam:"home",
    momentumHome:"7V 3N 0D", momentumAway:"5V 2N 3D",
    tacticalNote:"L'Australie avait éliminé la France en 2022… non, Danemark. Match de référence pour la qualification",
  },
  {
    group:"F", date:"25 juin", venue:"New York – MetLife Stadium",
    home:"🇫🇷 France", away:"🇩🇿 Algérie",
    hP:56, dP:24, aP:20, winner:"home", conf:"medium", note:"🔥 Choc Historique",
    scorePredict:"2-1", xgHome:2.0, xgAway:1.4,
    overUnder:"O2.5", btts:true,
    keyHome:"Kylian Mbappé", keyAway:"Riyad Mahrez",
    h2h:"Jamais rencontré en CdM", h2hDetail:"1ère confrontation officielle en CdM · Amicaux: France 2-0",
    wcFactor:"revenge", wcFactorTeam:"away",
    momentumHome:"8V 2N 0D", momentumAway:"7V 2N 1D",
    tacticalNote:"Match politique et émotionnel hors du commun · Nombreux joueurs franco-algériens · Mahrez et Benrahma sous pression identitaire",
  },
  {
    group:"G", date:"26 juin", venue:"San Francisco – Levi's Stadium",
    home:"🇧🇷 Brésil", away:"🇵🇾 Paraguay",
    hP:69, dP:20, aP:11, winner:"home", conf:"high", note:"",
    scorePredict:"2-0", xgHome:2.4, xgAway:0.7,
    overUnder:"O2.5", btts:false,
    keyHome:"Rodrygo", keyAway:"Miguel Almirón",
    h2h:"Brésil mène 38-14-15", h2hDetail:"67 confrontations · Domination brésilienne",
    wcFactor:"cohesion", wcFactorTeam:"home",
    momentumHome:"6V 3N 1D", momentumAway:"5V 3N 2D",
    tacticalNote:"Brésil avec 6 joueurs de Real Madrid et Barcelona · Paraguay résistant mais techniquement limité",
  },
  {
    group:"H", date:"26 juin", venue:"Seattle – Lumen Field",
    home:"🇩🇪 Allemagne", away:"🇵🇱 Pologne",
    hP:62, dP:22, aP:16, winner:"home", conf:"high", note:"",
    scorePredict:"2-0", xgHome:2.1, xgAway:0.9,
    overUnder:"O2.5", btts:false,
    keyHome:"Florian Wirtz", keyAway:"Robert Lewandowski",
    h2h:"Allemagne mène 34-9-4", h2hDetail:"47 confrontations · Domination historique allemande",
    wcFactor:"derby", wcFactorTeam:"home",
    momentumHome:"7V 2N 1D", momentumAway:"5V 3N 2D",
    tacticalNote:"Lewandowski à 38 ans mais toujours redoutable sur coup de pied arrêté · Allemagne doit sécuriser la 1re place",
  },
  {
    group:"I", date:"27 juin", venue:"Boston – Gillette Stadium",
    home:"🏴󠁧󠁢󠁥󠁮󠁧󠁿 Angleterre", away:"🇹🇳 Tunisie",
    hP:70, dP:19, aP:11, winner:"home", conf:"high", note:"",
    scorePredict:"2-0", xgHome:2.3, xgAway:0.7,
    overUnder:"O2.5", btts:false,
    keyHome:"Bukayo Saka", keyAway:"Wahbi Khazri",
    h2h:"Angleterre mène 3-1-0", h2hDetail:"4 confrontations · Angleterre favorable",
    wcFactor:"pressure", wcFactorTeam:"both",
    momentumHome:"7V 2N 1D", momentumAway:"5V 2N 3D",
    tacticalNote:"Angleterre a besoin d'une victoire convaincante · Tunisie en CdM pour la 6e fois · match sans surprise attendue",
  },
];

// ── Facteur Additionnel CdM (Médias · Humain · Supporters) ───────────────────
// Mirrored from EmotionalScoreTab WC_TEAMS — 3 dimensions, no economic

interface WCEmoEntry { score: number; media: number; human: number; fan: number; delta: number }
function wcDelta(score: number): number {
  if (score >= 72) return 7;
  if (score >= 62) return 4;
  if (score >= 52) return 1;
  if (score <= 22) return -8;
  if (score <= 32) return -5;
  if (score <= 42) return -2;
  return 0;
}

const WC_EMO: Record<string, WCEmoEntry> = {
  "France":           { score:80, media:78, human:85, fan:76, delta: wcDelta(80) },
  "Espagne":          { score:85, media:82, human:88, fan:85, delta: wcDelta(85) },
  "Argentine":        { score:81, media:80, human:75, fan:88, delta: wcDelta(81) },
  "Brésil":           { score:76, media:75, human:82, fan:70, delta: wcDelta(76) },
  "Angleterre":       { score:72, media:70, human:82, fan:64, delta: wcDelta(72) },
  "Allemagne":        { score:72, media:68, human:78, fan:70, delta: wcDelta(72) },
  "Portugal":         { score:76, media:74, human:76, fan:78, delta: wcDelta(76) },
  "Pays-Bas":         { score:68, media:65, human:74, fan:66, delta: wcDelta(68) },
  "USA":              { score:78, media:80, human:72, fan:82, delta: wcDelta(78) },
  "Mexique":          { score:80, media:82, human:68, fan:90, delta: wcDelta(80) },
  "Canada":           { score:70, media:68, human:65, fan:78, delta: wcDelta(70) },
  "Maroc":            { score:75, media:72, human:68, fan:85, delta: wcDelta(75) },
  "Uruguay":          { score:67, media:62, human:66, fan:72, delta: wcDelta(67) },
  "Colombie":         { score:69, media:64, human:68, fan:74, delta: wcDelta(69) },
  "Japon":            { score:65, media:60, human:64, fan:72, delta: wcDelta(65) },
  "Croatie":          { score:63, media:60, human:62, fan:68, delta: wcDelta(63) },
  "Belgique":         { score:64, media:60, human:70, fan:62, delta: wcDelta(64) },
  "Italie":           { score:66, media:64, human:68, fan:65, delta: wcDelta(66) },
  "Algérie":          { score:71, media:70, human:60, fan:82, delta: wcDelta(71) },
  "Suisse":           { score:59, media:55, human:62, fan:60, delta: wcDelta(59) },
  "Arabie Saoudite":  { score:48, media:45, human:52, fan:55, delta: wcDelta(48) },
  "Panama":           { score:58, media:52, human:58, fan:64, delta: wcDelta(58) },
  "Chili":            { score:62, media:60, human:64, fan:68, delta: wcDelta(62) },
  "Australie":        { score:60, media:58, human:60, fan:62, delta: wcDelta(60) },
  "Honduras":         { score:55, media:50, human:55, fan:62, delta: wcDelta(55) },
  "Sénégal":          { score:68, media:64, human:68, fan:72, delta: wcDelta(68) },
  "Paraguay":         { score:60, media:56, human:60, fan:65, delta: wcDelta(60) },
  "Pologne":          { score:62, media:60, human:66, fan:62, delta: wcDelta(62) },
  "Serbie":           { score:60, media:58, human:62, fan:62, delta: wcDelta(60) },
  "Tunisie":          { score:57, media:54, human:58, fan:62, delta: wcDelta(57) },
  "Roumanie":         { score:56, media:54, human:56, fan:58, delta: wcDelta(56) },
  "Angola":           { score:52, media:48, human:52, fan:58, delta: wcDelta(52) },
};

/** Extract team name without leading flag emoji */
function teamKey(flagName: string): string {
  return flagName.replace(/^[\p{Emoji}\s]+/u, "").trim();
}

function emoColor(score: number) {
  if (score >= 70) return "#22c55e";
  if (score >= 55) return "#00d4ff";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

// Parse "8V 2N 1D" → { v, n, d, played, pts, score 0-100, label, color }
function parseQualif(str: string) {
  const m = str.match(/(\d+)V\s*(\d+)N\s*(\d+)D/);
  if (!m) return { v: 0, n: 0, d: 0, played: 0, pts: 0, score: 50, label: "—", color: "#6b7c96" };
  const v = parseInt(m[1]), n = parseInt(m[2]), d = parseInt(m[3]);
  const played = v + n + d;
  const pts = v * 3 + n;
  const score = played > 0 ? Math.round((pts / (played * 3)) * 100) : 50;
  const label = `${v}V ${n}N ${d}D`;
  const color = score >= 78 ? "#22c55e" : score >= 60 ? "#00d4ff" : score >= 44 ? "#f59e0b" : "#ef4444";
  return { v, n, d, played, pts, score, label, color };
}

function QualifBar({ raw, teamName, side }: { raw: string; teamName: string; side: "home" | "away" }) {
  const q = parseQualif(raw);
  const pct = q.played > 0 ? {
    w: Math.round(q.v / q.played * 100),
    d: Math.round(q.n / q.played * 100),
    l: Math.round(q.d / q.played * 100),
  } : { w: 0, d: 0, l: 0 };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold truncate" style={{ color: "#94a3b8" }}>{teamName.split(" ").slice(1).join(" ")}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono" style={{ color: "#22c55e" }}>{q.v}V</span>
          <span className="text-[10px] font-mono" style={{ color: "#f59e0b" }}>{q.n}N</span>
          <span className="text-[10px] font-mono" style={{ color: "#ef4444" }}>{q.d}D</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${q.color}15`, color: q.color }}>{q.score}</span>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div style={{ width: `${pct.w}%`, background: "#22c55e", transition: "width 0.6s ease" }} />
        <div style={{ width: `${pct.d}%`, background: "#f59e0b", transition: "width 0.6s ease" }} />
        <div style={{ width: `${pct.l}%`, background: "#ef4444", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function WCPredictionsView() {
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const groups = ["A","B","C","D","E","F","G","H","I","J"];
  const filtered = WC_MATCHES_DATA.filter(m => !groupFilter || m.group === groupFilter);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "#e8edf5" }}>
            <Lightning size={16} style={{ color: "#eab308" }} /> Prédictions AI — Coupe du Monde 2026
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
            Modèle FootPredictom · xG · Score · Facteur CdM · H2H · Joueurs clés
          </p>
        </div>
      </div>

      {/* Group filter */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => setGroupFilter(null)}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
          style={{ background: !groupFilter ? "rgba(234,179,8,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${!groupFilter ? "rgba(234,179,8,0.3)" : "rgba(255,255,255,0.08)"}`, color: !groupFilter ? "#eab308" : "#6b7c96" }}>
          Tous
        </button>
        {groups.map(g => (
          <button key={g} onClick={() => setGroupFilter(g === groupFilter ? null : g)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
            style={{ background: groupFilter === g ? "rgba(234,179,8,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${groupFilter === g ? "rgba(234,179,8,0.3)" : "rgba(255,255,255,0.08)"}`, color: groupFilter === g ? "#eab308" : "#6b7c96" }}>
            Gr.{g}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((m, i) => {
          const winColor = m.winner === "home" ? "#22c55e" : m.winner === "away" ? "#ef4444" : "#f59e0b";
          const confColor = m.conf === "high" ? "#22c55e" : m.conf === "medium" ? "#f59e0b" : "#94a3b8";
          const confLabel = m.conf === "high" ? "Haute" : m.conf === "medium" ? "Moyenne" : "Faible";
          const factor = WC_FACTOR_META[m.wcFactor];
          const isOpen = expanded === i;
          const highlight = !!m.note;

          return (
            <div key={i} className="rounded-2xl overflow-hidden"
              style={{ background: highlight ? "rgba(234,179,8,0.03)" : "#0d1421", border: `1px solid ${highlight ? "rgba(234,179,8,0.25)" : "#1e2d42"}` }}>

              {/* Clickable header */}
              <button className="w-full text-left px-3 pt-3 pb-2 hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpanded(isOpen ? null : i)}>

                {/* Top meta row */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(234,179,8,0.12)", color: "#eab308" }}>Gr.{m.group}</span>
                  <span className="text-[10px]" style={{ color: "#6b7c96" }}>{m.date}</span>
                  <span className="text-[10px]" style={{ color: "#475569" }}>📍 {m.venue}</span>
                  {m.note && <span className="text-[10px] font-bold ml-auto" style={{ color: "#eab308" }}>{m.note}</span>}
                </div>

                {/* Teams + verdict */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold flex-1 truncate" style={{ color: m.winner === "home" ? "#e8edf5" : "#6b7c96" }}>{m.home}</span>
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg" style={{ background: `${winColor}15`, border: `1px solid ${winColor}30`, color: winColor }}>
                      {m.winner === "home" ? "DOM" : m.winner === "away" ? "EXT" : "NUL"}
                    </span>
                    <span className="text-[10px] font-mono font-bold" style={{ color: winColor }}>{m.scorePredict}</span>
                  </div>
                  <span className="text-sm font-bold flex-1 text-right truncate" style={{ color: m.winner === "away" ? "#e8edf5" : "#6b7c96" }}>{m.away}</span>
                </div>

                {/* Probability bar */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-mono w-7 text-right" style={{ color: "#22c55e" }}>{m.hP}%</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div style={{ width: `${m.hP}%`, background: "#22c55e" }} />
                    <div style={{ width: `${m.dP}%`, background: "#f59e0b" }} />
                    <div style={{ width: `${m.aP}%`, background: "#ef4444" }} />
                  </div>
                  <span className="text-[10px] font-mono w-7" style={{ color: "#ef4444" }}>{m.aP}%</span>
                </div>

                {/* Qualif comparison bar (always visible) */}
                {(() => {
                  const qh = parseQualif(m.momentumHome);
                  const qa = parseQualif(m.momentumAway);
                  const diff = qh.score - qa.score;
                  const diffColor = diff > 5 ? "#22c55e" : diff < -5 ? "#ef4444" : "#f59e0b";
                  return (
                    <div className="mb-2 px-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Qualifs</span>
                        <div className="flex items-center gap-1 ml-auto">
                          <span className="text-[10px] font-mono" style={{ color: qh.color }}>{qh.label}</span>
                          <span className="text-[10px]" style={{ color: "#475569" }}>vs</span>
                          <span className="text-[10px] font-mono" style={{ color: qa.color }}>{qa.label}</span>
                          {Math.abs(diff) > 3 && (
                            <span className="text-[10px] font-bold px-1 rounded" style={{ background: `${diffColor}12`, color: diffColor }}>
                              {diff > 0 ? "+" : ""}{diff}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 items-center">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.04)" }}>
                          {qh.played > 0 && <>
                            <div style={{ width: `${qh.v/qh.played*100}%`, background: "#22c55e" }} />
                            <div style={{ width: `${qh.n/qh.played*100}%`, background: "#f59e0b" }} />
                            <div style={{ width: `${qh.d/qh.played*100}%`, background: "#ef4444" }} />
                          </>}
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: diffColor }}>
                          {diff > 0 ? "↑" : diff < 0 ? "↓" : "="} {Math.abs(diff)}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.04)" }}>
                          {qa.played > 0 && <>
                            <div style={{ width: `${qa.v/qa.played*100}%`, background: "#22c55e" }} />
                            <div style={{ width: `${qa.n/qa.played*100}%`, background: "#f59e0b" }} />
                            <div style={{ width: `${qa.d/qa.played*100}%`, background: "#ef4444" }} />
                          </>}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Facteur Additionnel — compact row */}
                {(() => {
                  const eh = WC_EMO[teamKey(m.home)];
                  const ea = WC_EMO[teamKey(m.away)];
                  if (!eh && !ea) return null;
                  const hScore = eh?.score ?? 50;
                  const aScore = ea?.score ?? 50;
                  const hDelta = eh?.delta ?? 0;
                  const aDelta = ea?.delta ?? 0;
                  const hC = emoColor(hScore);
                  const aC = emoColor(aScore);
                  return (
                    <div className="mb-2 px-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Facteur Add.</span>
                        <span className="text-[10px] font-bold ml-auto" style={{ color: hC }}>
                          {hScore} {hDelta !== 0 && <span style={{ color: hDelta > 0 ? "#22c55e" : "#ef4444" }}>({hDelta > 0 ? "+" : ""}{hDelta}%)</span>}
                        </span>
                        <div className="w-20 h-1.5 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <div style={{ width: `${hScore}%`, background: hC }} />
                        </div>
                        <span className="text-[10px]" style={{ color: "#475569" }}>vs</span>
                        <div className="w-20 h-1.5 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <div style={{ width: `${aScore}%`, background: aC, marginLeft: "auto" }} />
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: aC }}>
                          {aScore} {aDelta !== 0 && <span style={{ color: aDelta > 0 ? "#22c55e" : "#ef4444" }}>({aDelta > 0 ? "+" : ""}{aDelta}%)</span>}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Quick stats row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                    style={{ background: "rgba(0,212,255,0.08)", color: "#00d4ff" }}>
                    xG {m.xgHome}–{m.xgAway}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                    style={{ background: m.overUnder === "O2.5" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", color: m.overUnder === "O2.5" ? "#22c55e" : "#ef4444" }}>
                    {m.overUnder}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: m.btts ? "rgba(34,197,94,0.08)" : "rgba(100,116,139,0.08)", color: m.btts ? "#22c55e" : "#64748b" }}>
                    {m.btts ? "BTTS ✓" : "BTTS ✗"}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold ml-auto"
                    style={{ background: `${factor.color}10`, color: factor.color }}>
                    {factor.icon} {factor.label}
                  </span>
                  <CaretDown size={12} style={{ color: "#6b7c96", flexShrink: 0 }}
                    className={`transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                </div>
              </button>

              {/* Expanded details */}
              {isOpen && (
                <div className="px-3 pb-3 space-y-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>

                  {/* WC Factor */}
                  <div className="rounded-xl px-3 py-2.5 mt-2" style={{ background: `${factor.color}08`, border: `1px solid ${factor.color}20` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{factor.icon}</span>
                      <span className="text-xs font-bold" style={{ color: factor.color }}>{factor.label}</span>
                      <span className="text-[10px] ml-auto px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>
                        Impact : {m.wcFactorTeam === "home" ? m.home.split(" ").slice(1).join(" ") : m.wcFactorTeam === "away" ? m.away.split(" ").slice(1).join(" ") : "les deux"}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{factor.desc}</p>
                  </div>

                  {/* Key players */}
                  <div className="grid grid-cols-2 gap-2">
                    {[{ label: m.home, player: m.keyHome, side: "DOM" }, { label: m.away, player: m.keyAway, side: "EXT" }].map(p => (
                      <div key={p.side} className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-[10px] uppercase font-bold mb-0.5" style={{ color: "#6b7c96" }}>Joueur clé {p.side}</p>
                        <p className="text-xs font-bold" style={{ color: "#e8edf5" }}>⭐ {p.player}</p>
                      </div>
                    ))}
                  </div>

                  {/* H2H */}
                  <div className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[10px] uppercase font-bold mb-1" style={{ color: "#6b7c96" }}>Historique H2H</p>
                    <p className="text-xs font-bold" style={{ color: "#a78bfa" }}>{m.h2h}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#475569" }}>{m.h2hDetail}</p>
                  </div>

                  {/* Qualifying results — full detail */}
                  <div className="rounded-xl px-3 py-3" style={{ background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.15)" }}>
                    <p className="text-[10px] uppercase font-bold mb-2.5" style={{ color: "#34d399" }}>📈 Résultats qualificatifs</p>
                    <div className="space-y-2.5">
                      <QualifBar raw={m.momentumHome} teamName={m.home} side="home" />
                      <QualifBar raw={m.momentumAway} teamName={m.away} side="away" />
                    </div>
                    {(() => {
                      const qh = parseQualif(m.momentumHome);
                      const qa = parseQualif(m.momentumAway);
                      const diff = qh.score - qa.score;
                      const impact = Math.abs(diff) >= 15 ? "Fort" : Math.abs(diff) >= 8 ? "Modéré" : "Faible";
                      const favored = diff > 3 ? m.home.split(" ").slice(1).join(" ") : diff < -3 ? m.away.split(" ").slice(1).join(" ") : null;
                      return (
                        <div className="mt-2 pt-2 flex items-center gap-2 flex-wrap" style={{ borderTop: "1px solid rgba(52,211,153,0.1)" }}>
                          <span className="text-[10px]" style={{ color: "#6b7c96" }}>
                            Impact sur la prédiction :
                          </span>
                          <span className="text-[10px] font-bold" style={{ color: Math.abs(diff) >= 8 ? "#34d399" : "#6b7c96" }}>{impact}</span>
                          {favored && (
                            <span className="text-[10px] font-semibold ml-auto" style={{ color: "#34d399" }}>
                              Avantage qualifs → {favored}
                            </span>
                          )}
                          {!favored && <span className="text-[10px] ml-auto" style={{ color: "#6b7c96" }}>Équilibre qualificatif</span>}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Facteur Additionnel — full breakdown */}
                  {(() => {
                    const eh = WC_EMO[teamKey(m.home)];
                    const ea = WC_EMO[teamKey(m.away)];
                    if (!eh && !ea) return null;
                    const hScore = eh?.score ?? 50;
                    const aScore = ea?.score ?? 50;
                    const hDelta = eh?.delta ?? 0;
                    const aDelta = ea?.delta ?? 0;
                    const dims: { key: keyof WCEmoEntry; label: string; icon: string; color: string }[] = [
                      { key: "media",  label: "Médias",     icon: "📰", color: "#00d4ff" },
                      { key: "human",  label: "Humain",     icon: "👥", color: "#22c55e" },
                      { key: "fan",    label: "Supporters", icon: "❤️", color: "#06b6d4" },
                    ];
                    return (
                      <div className="rounded-xl px-3 py-3" style={{ background: "rgba(244,114,182,0.04)", border: "1px solid rgba(244,114,182,0.15)" }}>
                        <p className="text-[10px] uppercase font-bold mb-2.5" style={{ color: "#06b6d4" }}>❤️ Facteur Additionnel</p>
                        {/* Overall score comparison */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-base font-black" style={{ color: emoColor(hScore) }}>{hScore}</span>
                            {hDelta !== 0 && <span className="text-[10px] font-bold" style={{ color: hDelta > 0 ? "#22c55e" : "#ef4444" }}>{hDelta > 0 ? "+" : ""}{hDelta}% pred</span>}
                          </div>
                          <div className="flex-1 h-2 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div style={{ width: `${hScore}%`, background: emoColor(hScore), transition: "width 0.6s" }} />
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: "#6b7c96" }}>vs</span>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div style={{ width: `${aScore}%`, background: emoColor(aScore), marginLeft: "auto", transition: "width 0.6s" }} />
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-base font-black" style={{ color: emoColor(aScore) }}>{aScore}</span>
                            {aDelta !== 0 && <span className="text-[10px] font-bold" style={{ color: aDelta > 0 ? "#22c55e" : "#ef4444" }}>{aDelta > 0 ? "+" : ""}{aDelta}% pred</span>}
                          </div>
                        </div>
                        {/* Dimension breakdown */}
                        <div className="space-y-1.5">
                          {dims.map(d => {
                            const hv = (eh?.[d.key] as number) ?? 50;
                            const av = (ea?.[d.key] as number) ?? 50;
                            const best = hv > av ? "home" : hv < av ? "away" : "tie";
                            return (
                              <div key={d.key} className="flex items-center gap-2">
                                <span className="text-[10px] w-4">{d.icon}</span>
                                <span className="text-[10px] w-16" style={{ color: d.color }}>{d.label}</span>
                                <span className="text-[10px] font-mono w-6 text-right" style={{ color: best === "home" ? "#e8edf5" : "#6b7c96" }}>{hv}</span>
                                <div className="flex-1 h-1.5 rounded-full overflow-hidden flex gap-px" style={{ background: "rgba(255,255,255,0.04)" }}>
                                  <div style={{ width: `${hv/(hv+av)*100}%`, background: d.color, opacity: best === "home" ? 1 : 0.4 }} />
                                  <div style={{ flex: 1, background: d.color, opacity: best === "away" ? 1 : 0.4 }} />
                                </div>
                                <span className="text-[10px] font-mono w-6" style={{ color: best === "away" ? "#e8edf5" : "#6b7c96" }}>{av}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Tactical note */}
                  <div className="rounded-xl px-3 py-2" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <p className="text-[10px] uppercase font-bold mb-1" style={{ color: "#6b7c96" }}>🧠 Analyse tactique</p>
                    <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{m.tacticalNote}</p>
                  </div>

                  {/* Confidence */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: "#6b7c96" }}>Confiance du modèle :</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${confColor}12`, color: confColor }}>{confLabel}</span>
                    <span className="text-[10px] ml-auto" style={{ color: "#475569" }}>
                      Nul : {m.dP}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs" style={{ color: "#475569" }}>
        FootPredictom AI · xG · H2H · Facteurs CdM · Données non contractuelles
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PredictionsTab() {
  // When the World Cup is hot, default to the CdM predictions surface.
  const [subTab, setSubTab] = useState<"l1" | "cdm">(isWorldCupHot() ? "cdm" : "l1");
  const [config] = useConfig();
  const [data, setData] = useState<PredData | null>(null);
  const [emoMap, setEmoMap] = useState<Map<number, EmoEntry>>(new Map());
  const [expertMatches, setExpertMatches] = useState<ExpertMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [emoLoading, setEmoLoading] = useState(true);
  const [expertLoading, setExpertLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useEmotional, setUseEmotional] = useState(true);
  const [useExpert, setUseExpert] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [monClubId, setMonClubId] = useState<number | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("monClub_id");
    if (raw) setMonClubId(Number(raw));
    const onStorage = (e: StorageEvent) => {
      if (e.key === "monClub_id") setMonClubId(e.newValue ? Number(e.newValue) : null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    fetch("/api/predictions")
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    fetch("/api/emotional-score")
      .then((r) => r.json())
      .then((d) => {
        const map = new Map<number, EmoEntry>();
        for (const s of d.scores ?? []) map.set(s.teamId, { predictionDelta: s.predictionDelta, emotionalScore: s.emotionalScore });
        setEmoMap(map);
      })
      .catch(() => {})
      .finally(() => setEmoLoading(false));

    fetch("/api/expert-predictions")
      .then((r) => r.json())
      .then((d) => { if (d.available) setExpertMatches(d.matches ?? []); })
      .catch(() => {})
      .finally(() => setExpertLoading(false));
  }, []);

  // Compute predictions with config settings
  const computedPredictions = useMemo(() => {
    if (!data) return new Map<number, Prediction>();
    const map = new Map<number, Prediction>();
    for (const match of data.predictions) {
      // Only recompute if config differs from defaults OR momentum is enabled
      const pred = recomputePrediction(match, config.homeAdvantage, config.formMomentumEnabled);
      map.set(match.id, pred);
    }
    return map;
  }, [data, config.homeAdvantage, config.formMomentumEnabled]);

  // Auto-save predictions to localStorage
  useEffect(() => {
    if (!data || data.predictions.length === 0) return;

    const now = new Date().toISOString();
    let count = 0;

    for (const match of data.predictions) {
      const matchDate = new Date(match.date);
      // Only save for upcoming matches (not past ones)
      if (matchDate < new Date()) continue;

      const computed = computedPredictions.get(match.id) ?? match.prediction;
      const homeEmo = emoMap.get(match.homeTeam.id);
      const awayEmo = emoMap.get(match.awayTeam.id);

      const { corrected, homeDelta, awayDelta } = applyEmoCorrection(computed, homeEmo, awayEmo);
      const finalPred = useEmotional && (homeDelta !== 0 || awayDelta !== 0) ? corrected : computed;

      upsertPrediction({
        matchId: match.id,
        savedAt: now,
        matchDate: match.date,
        matchday: match.matchday,
        homeTeam: {
          id: match.homeTeam.id,
          name: match.homeTeam.name,
          shortName: match.homeTeam.shortName,
          tla: match.homeTeam.tla,
          crest: match.homeTeam.crest,
        },
        awayTeam: {
          id: match.awayTeam.id,
          name: match.awayTeam.name,
          shortName: match.awayTeam.shortName,
          tla: match.awayTeam.tla,
          crest: match.awayTeam.crest,
        },
        prediction: finalPred,
        emotional: homeEmo && awayEmo ? {
          homeScore: homeEmo.emotionalScore,
          awayScore: awayEmo.emotionalScore,
          applied: useEmotional && (homeDelta !== 0 || awayDelta !== 0),
        } : undefined,
      });
      count++;
    }

    setSavedCount(loadPredictions().length);
  }, [data, computedPredictions, emoMap, useEmotional]);

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

  const wcHot = isWorldCupHot();
  const SubTabs = () => (
    <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: "#0a0f1c", border: "1px solid #1a2235", display: "inline-flex" }}>
      {([["l1", "🏆 Ligue 1"], ["cdm", "🌍 Coupe du Monde"]] as const).map(([id, label]) => {
        const highlight = id === "cdm" && wcHot;
        const active = subTab === id;
        return (
          <button key={id} onClick={() => setSubTab(id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap inline-flex items-center gap-1"
            style={{
              background: active ? (highlight ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.08)") : "transparent",
              color: active ? (highlight ? "#fbbf24" : "#e2e8f0") : (highlight ? "#fbbf24" : "#64748b"),
              border: active ? `1px solid ${highlight ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.1)"}` : "1px solid transparent",
            }}>
            {label}
            {highlight && (
              <span className="text-[8px] font-black px-1 py-0.5 rounded-full ml-0.5"
                style={{ background: "#ef4444", color: "#fff" }}>HOT</span>
            )}
          </button>
        );
      })}
    </div>
  );

  if (subTab === "cdm") return <div><SubTabs /><WCPredictionsView /></div>;

  if (loading) {
    return (
      <div>
        <SubTabs />
        <div className="py-3">
          <LoadingBar color="#a855f7" caption="Chargement des prédictions" />
        </div>
      </div>
    );
  }

  if (error) return <div><SubTabs /><div className="text-center py-16 text-red-400 text-sm">{error}</div></div>;
  if (!data?.predictions.length) return <div><SubTabs /><div className="text-center py-16" style={{ color: "#6b7c96" }}>Aucun match à venir disponible.</div></div>;

  return (
    <div>
      <SubTabs />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold" style={{ color: "#e8edf5" }}>
            Journée {data.matchday} — Analyse prédictive
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
            Avantage dom. {config.homeAdvantage}%
            {config.formMomentumEnabled ? " · Élan de forme" : ""}
            {useEmotional ? " · Facteur additionnel" : ""}
            {useExpert && expertCount > 0 ? " · Experts" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Toggle enabled={useEmotional} onToggle={() => setUseEmotional(!useEmotional)}
            label={emoLoading ? "Facteur…" : "Facteur additionnel"} color="#06b6d4" />
          <Toggle enabled={useExpert} onToggle={() => setUseExpert(!useExpert)}
            label={expertLoading ? "Experts…" : "Prédictions expertes"} color="#eab308" />
          {savedCount > 0 && (
            <button onClick={downloadCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>
              <DownloadSimple size={12} /> CSV ({savedCount})
            </button>
          )}
        </div>
      </div>

      {/* Info banners */}
      {useEmotional && correctedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 text-xs"
          style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.2)" }}>
          <Heart size={13} className="text-cyan-400 flex-shrink-0" />
          <span style={{ color: "#06b6d4" }}>
            <strong>{correctedCount} match{correctedCount > 1 ? "s" : ""}</strong> ajusté{correctedCount > 1 ? "s" : ""} par le score émotionnel
          </span>
        </div>
      )}
      {config.formMomentumEnabled && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 text-xs"
          style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.15)" }}>
          <Fire size={13} style={{ color: "#22c55e", flexShrink: 0 }} />
          <span style={{ color: "#22c55e" }}>
            <strong>Élan de forme activé</strong> — les équipes en tendance haussière récente sont favorisées
          </span>
        </div>
      )}
      {useExpert && expertCount > 0 && (() => {
        const betclicCount = data?.predictions.filter(m =>
          expertMatches.some(e => teamMatches(e.homeTeam, m.homeTeam.name) && teamMatches(e.awayTeam, m.awayTeam.name) && !!e.impliedProbs)
        ).length ?? 0;
        return (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 text-xs"
            style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)" }}>
            <Star size={13} style={{ color: "#eab308", flexShrink: 0 }} />
            <span style={{ color: "#eab308" }}>
              {betclicCount > 0
                ? <><strong>{betclicCount} match{betclicCount > 1 ? "s" : ""}</strong> — probabilités basées sur cotes ExpertWEB{useEmotional ? " + facteur additionnel" : ""}</>
                : <><strong>{expertCount} match{expertCount > 1 ? "s" : ""}</strong> couverts par les experts</>
              }
            </span>
          </div>
        );
      })()}

      {/* Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[...data.predictions].sort((a, b) => {
          const aIsClub = monClubId !== null && (a.homeTeam.id === monClubId || a.awayTeam.id === monClubId);
          const bIsClub = monClubId !== null && (b.homeTeam.id === monClubId || b.awayTeam.id === monClubId);
          return aIsClub === bIsClub ? 0 : aIsClub ? -1 : 1;
        }).map((match, i) => (
          <div key={match.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
            <MatchCard
              match={match}
              computedPrediction={computedPredictions.get(match.id) ?? match.prediction}
              useEmotional={useEmotional}
              useExpert={useExpert}
              emoMap={emoMap}
              expertMatches={expertMatches}
              showXG={config.showXG}
              showTechnicalDetails={config.showTechnicalDetails}
              formMomentumEnabled={config.formMomentumEnabled}
              homeAdv={config.homeAdvantage}
            />
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-center" style={{ color: "#6b7c96" }}>
        * Prédictions algorithmiques à titre indicatif — pas de conseil de paris
      </p>

      <div className="mt-4">
        <FunFact section="predictions" />
      </div>
    </div>
  );
}
