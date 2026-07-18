"use client";

import { useEffect, useState, useMemo } from "react";
import { Lightning, TrendUp, Shield, Target, Clock, Heart, Star, CaretDown, CaretUp, DownloadSimple, Fire } from "@phosphor-icons/react";
import { useConfig } from "@/app/lib/config";
import { upsertPrediction, downloadCSV, loadPredictions } from "@/app/lib/predictions-store";
import FunFact from "./FunFact";
import LoadingBar from "./LoadingBar";
import { formScore01, formMomentum } from "@/app/lib/scoring";
import { fmtWeekdayDayMonth, fmtTime } from "@/app/lib/format";
import HexRadar, { type HexRadarAxis } from "./HexRadar";

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

function teamStrengthClient(
  team: TeamPred,
  isHome: boolean,
  homeAdv: number,
  momentumEnabled: boolean
): number {
  const ppg = team.playedGames > 0 ? team.points / team.playedGames : 0;
  const gdpg = team.playedGames > 0 ? (team.goalDifference ?? 0) / team.playedGames : 0;
  const form = formScore01(team.form);
  const posScore = (19 - team.position) / 17;
  const base = 0.35 * (ppg / 3) + 0.25 * ((gdpg + 3) / 6) + 0.25 * form + 0.15 * posScore;
  const momentum = momentumEnabled ? formMomentum(team.form) : 0;
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
  return { day: fmtWeekdayDayMonth(dateStr), time: fmtTime(dateStr) };
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
  const momentum = formMomentum(form);
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

  const axes: HexRadarAxis[] = [
    { label: "Attaque",
      h: clamp01(perGame(home.goalsFor, home.playedGames) / 3),
      a: clamp01(perGame(away.goalsFor, away.playedGames) / 3) },
    { label: "Défense",
      h: clamp01(1 - perGame(home.goalsAgainst, home.playedGames) / 3),
      a: clamp01(1 - perGame(away.goalsAgainst, away.playedGames) / 3) },
    { label: "Forme",
      h: clamp01(formScore01(home.form)),
      a: clamp01(formScore01(away.form)) },
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
      <HexRadar axes={axes} homeColor="#00d4ff" awayColor="#a78bfa" />
    </div>
  );
}

// ── AI pre-match commentary ──────────────────────────────────────────────────
// Lightweight Gemini-powered preview card. Streams in below the spider chart
// and falls back to a deterministic template if the API key is missing.
interface MatchPreviewPayload {
  preview: string;
  pick: "home" | "draw" | "away";
  confidence: "low" | "medium" | "high";
}
function AIMatchPreview({ match }: { match: MatchPrediction }) {
  const [data, setData] = useState<MatchPreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sp = new URLSearchParams({
      home:     match.homeTeam.shortName || match.homeTeam.tla,
      away:     match.awayTeam.shortName || match.awayTeam.tla,
      homePos:  String(match.homeTeam.position),
      awayPos:  String(match.awayTeam.position),
      homePts:  String(match.homeTeam.points),
      awayPts:  String(match.awayTeam.points),
      homeGF:   String(match.homeTeam.goalsFor),
      homeGA:   String(match.homeTeam.goalsAgainst),
      awayGF:   String(match.awayTeam.goalsFor),
      awayGA:   String(match.awayTeam.goalsAgainst),
      homeForm: match.homeTeam.form ?? "",
      awayForm: match.awayTeam.form ?? "",
      context:  `Ligue 1${match.matchday ? ` · J${match.matchday}` : ""}`,
    });
    let cancelled = false;
    fetch(`/api/match-preview?${sp}`)
      .then(r => r.json())
      .then((d: MatchPreviewPayload) => { if (!cancelled) setData(d); })
      .catch(() => { /* silent — fallback already happens server-side */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [match]);

  const pickColor = data?.pick === "home" ? "#00d4ff" : data?.pick === "away" ? "#a78bfa" : "#fbbf24";
  const pickLabel = data?.pick === "home"
    ? `Vic. ${match.homeTeam.shortName || match.homeTeam.tla}`
    : data?.pick === "away"
    ? `Vic. ${match.awayTeam.shortName || match.awayTeam.tla}`
    : "Match nul";

  return (
    <div className="mt-4 rounded-xl px-3 py-2.5"
      style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.25)" }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{ background: "rgba(139,92,246,0.18)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.35)" }}>
          IA · Gemini
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6b7c96" }}>
          Commentaire pré-match
        </span>
        {data && (
          <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${pickColor}1a`, color: pickColor, border: `1px solid ${pickColor}55` }}>
            {pickLabel} · {data.confidence === "high" ? "★★★" : data.confidence === "medium" ? "★★" : "★"}
          </span>
        )}
      </div>
      {loading
        ? <div className="h-3 w-3/4 rounded animate-pulse" style={{ background: "rgba(139,92,246,0.18)" }} />
        : <p className="text-[12px] leading-relaxed" style={{ color: "#cbd5e1" }}>{data?.preview}</p>
      }
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

  const homeMomentum = formMomentum(match.homeTeam.form);
  const awayMomentum = formMomentum(match.awayTeam.form);

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

        {/* AI pre-match commentary — Gemini-powered, 2-3 sentences */}
        <AIMatchPreview match={match} />

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

        {/* ── Analyse Tactique — rich auto-generated panel ── */}
        {(() => {
          const home = match.homeTeam;
          const away = match.awayTeam;
          const homeXg = pred.homeXG;
          const awayXg = pred.awayXG;
          const totalXg = homeXg + awayXg;
          const homePct = totalXg > 0 ? Math.round((homeXg / totalXg) * 100) : 50;
          const awayPct = 100 - homePct;
          const impliedOver = totalXg > 2.5;
          const impliedBtts = homeXg >= 0.85 && awayXg >= 0.85;
          const scoreHome = Math.max(0, Math.round(homeXg - 0.2));
          const scoreAway = Math.max(0, Math.round(awayXg - 0.2));
          const impliedScore = `${scoreHome}-${scoreAway}`;
          const xgRatio = homeXg / (awayXg || 0.1);
          const dominanceLabel =
            xgRatio >= 2.5 ? "Domination totale" :
            xgRatio >= 1.7 ? "Avantage marqué" :
            xgRatio >= 1.2 ? "Légère supériorité" :
            xgRatio >= 0.85 ? "Équilibre" :
            xgRatio >= 0.6 ? "Légère sup. EXT" : "Avantage EXT marqué";
          const rhythmLabel =
            impliedOver && impliedBtts ? "⚡ Jeu ouvert — les deux marquent" :
            impliedOver && !impliedBtts ? "🎯 Offensif — un buteur dominant" :
            impliedBtts ? "🔒 Serré — 1-1 probable" : "🛡️ Défensif — but unique décisif";
          const homeGpg = home.goalsFor / (home.playedGames || 1);
          const awayGpg = away.goalsFor / (away.playedGames || 1);
          const homeCpg = home.goalsAgainst / (home.playedGames || 1);
          const awayCpg = away.goalsAgainst / (away.playedGames || 1);
          const inferTactic = (gpg: number, cpg: number): string => {
            if (gpg >= 2.2) return cpg >= 1.5 ? "4-3-3 Offensif (risqué)" : "4-3-3 Dominant";
            if (gpg >= 1.6) return cpg <= 1.0 ? "4-2-3-1 Équilibré" : "4-4-2 Standard";
            if (gpg <= 1.0) return cpg <= 0.8 ? "4-5-1 Défensif solide" : "5-3-2 Pragmatique";
            return cpg <= 1.1 ? "4-4-2 Organisé" : "4-4-2 Standard";
          };
          const posDiff = away.position - home.position;
          const confColor = conf.color;
          const confLabel = pred.confidence === "high" ? "Haute" : pred.confidence === "medium" ? "Moyenne" : "Faible";
          const mktColor = (c: boolean) => c ? "#22c55e" : "#64748b";
          const mktBg = (c: boolean) => c ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.07)";
          const mktBorder = (c: boolean) => c ? "rgba(34,197,94,0.3)" : "rgba(100,116,139,0.2)";
          const winnerProb = pred.winner === "home" ? pred.homeProb : pred.winner === "away" ? pred.awayProb : pred.drawProb;
          // Auto-generate tactical bullets from live stats
          const bullets: string[] = [];
          if (xgRatio >= 1.6) {
            bullets.push(`Supériorité offensive nette de ${home.shortName || home.tla} : ${homeXg} xG attendus vs ${awayXg} xG pour les visiteurs`);
          } else if (xgRatio <= 0.65) {
            bullets.push(`${away.shortName || away.tla} domine offensivement malgré le déplacement : ${awayXg} xG vs ${homeXg} xG DOM`);
          } else {
            bullets.push(`xG équilibré (${homeXg} vs ${awayXg}) — match ouvert, résultat difficile à anticiper`);
          }
          if (homeGpg > awayGpg + 0.5) {
            bullets.push(`${home.shortName || home.tla} plus prolifique (${homeGpg.toFixed(1)} buts/match) que ${away.shortName || away.tla} (${awayGpg.toFixed(1)})`);
          } else if (awayGpg > homeGpg + 0.5) {
            bullets.push(`${away.shortName || away.tla} plus efficace offensivement (${awayGpg.toFixed(1)} buts/match) malgré le déplacement`);
          }
          if (homeCpg < awayCpg - 0.4) {
            bullets.push(`Défense de ${home.shortName || home.tla} plus solide (${homeCpg.toFixed(1)} vs ${awayCpg.toFixed(1)} buts encaissés/match)`);
          } else if (awayCpg < homeCpg - 0.4) {
            bullets.push(`${away.shortName || away.tla} défensivement plus rigoureux sur déplacement (${awayCpg.toFixed(1)} buts encaissés/match)`);
          }
          if (homeMomentum > awayMomentum + 0.05) {
            bullets.push(`${home.shortName || home.tla} en meilleure forme récente — momentum favorable à domicile`);
          } else if (awayMomentum > homeMomentum + 0.05) {
            bullets.push(`${away.shortName || away.tla} en grande forme récente — attention à l'effet momentum visiteur`);
          }
          if (Math.abs(posDiff) >= 8) {
            const stronger = posDiff > 0 ? (home.shortName || home.tla) : (away.shortName || away.tla);
            bullets.push(`Écart de ${Math.abs(posDiff)} places au classement — ${stronger} nettement favorisé sur le papier`);
          }
          if (bullets.length < 2) {
            bullets.push(`Avantage domicile intégré au modèle — ${home.shortName || home.tla} bénéficie du soutien de son public`);
          }
          return (
            <div className="rounded-xl overflow-hidden mt-3" style={{ border: "1px solid rgba(129,140,248,0.25)" }}>
              {/* Header */}
              <div className="px-3 py-2 flex items-center gap-2" style={{ background: "rgba(129,140,248,0.1)", borderBottom: "1px solid rgba(129,140,248,0.15)" }}>
                <span>🧠</span>
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#818cf8" }}>Analyse Tactique</span>
                <span className="text-[9px] ml-auto" style={{ color: "#475569" }}>auto · données live</span>
              </div>
              <div className="px-3 py-3 space-y-3" style={{ background: "rgba(129,140,248,0.02)" }}>

                {/* 1. Profil de jeu (inferred from goals stats) */}
                <div>
                  <p className="text-[9px] uppercase font-bold mb-1.5" style={{ color: "#475569" }}>Profil de jeu</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg px-2.5 py-2" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(129,140,248,0.12)" }}>
                      <p className="text-[9px] uppercase font-bold mb-1" style={{ color: "#475569" }}>🏠 {home.shortName || home.tla}</p>
                      <p className="text-[11px] font-bold leading-tight" style={{ color: "#818cf8" }}>{inferTactic(homeGpg, homeCpg)}</p>
                      <p className="text-[9px] mt-1 tabular-nums" style={{ color: "#64748b" }}>{homeGpg.toFixed(1)} buts/m · {homeCpg.toFixed(1)} enc./m</p>
                    </div>
                    <div className="rounded-lg px-2.5 py-2" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(129,140,248,0.12)" }}>
                      <p className="text-[9px] uppercase font-bold mb-1" style={{ color: "#475569" }}>✈️ {away.shortName || away.tla}</p>
                      <p className="text-[11px] font-bold leading-tight" style={{ color: "#818cf8" }}>{inferTactic(awayGpg, awayCpg)}</p>
                      <p className="text-[9px] mt-1 tabular-nums" style={{ color: "#64748b" }}>{awayGpg.toFixed(1)} buts/m · {awayCpg.toFixed(1)} enc./m</p>
                    </div>
                  </div>
                </div>

                {/* 2. xG rapport de forces */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[9px] uppercase font-bold" style={{ color: "#475569" }}>Rapport de forces — xG</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(129,140,248,0.12)", color: "#818cf8" }}>{dominanceLabel}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold truncate" style={{ color: pred.winner === "home" ? "#e8edf5" : "#6b7c96", minWidth: 52, textAlign: "right" }}>
                      {home.shortName || home.tla}
                    </span>
                    <div className="flex-1 h-4 rounded-lg overflow-hidden flex" style={{ background: "rgba(0,0,0,0.35)" }}>
                      <div style={{ width: `${homePct}%`, background: "linear-gradient(90deg,#6366f1,#818cf8)", transition: "width 0.5s" }} className="flex items-center justify-end pr-1.5">
                        {homePct >= 28 && <span className="text-[9px] font-black" style={{ color: "rgba(255,255,255,0.85)" }}>{homeXg}</span>}
                      </div>
                      <div style={{ flex: 1, background: "rgba(239,68,68,0.4)" }} className="flex items-center pl-1.5">
                        {awayPct >= 22 && <span className="text-[9px] font-black" style={{ color: "rgba(255,255,255,0.75)" }}>{awayXg}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold truncate" style={{ color: pred.winner === "away" ? "#e8edf5" : "#6b7c96", minWidth: 52 }}>
                      {away.shortName || away.tla}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-3 mt-0.5">
                    <span className="text-xs font-black tabular-nums" style={{ color: "#818cf8" }}>xG {homeXg}</span>
                    <span className="text-[9px]" style={{ color: "#475569" }}>—</span>
                    <span className="text-xs font-black tabular-nums" style={{ color: "#ef4444" }}>xG {awayXg}</span>
                  </div>
                </div>

                {/* 3. Tempo + Score indicatif */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg px-2.5 py-2.5" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[9px] uppercase font-bold mb-1" style={{ color: "#475569" }}>Tempo de jeu</p>
                    <p className="text-[11px] font-semibold leading-snug" style={{ color: impliedOver ? "#22c55e" : "#94a3b8" }}>{rhythmLabel}</p>
                    <p className="text-[10px] mt-1 tabular-nums" style={{ color: "#64748b" }}>
                      {impliedOver ? "O2.5" : "U2.5"} · BTTS {impliedBtts ? "✓" : "✗"}
                    </p>
                  </div>
                  <div className="rounded-lg px-2.5 py-2.5" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[9px] uppercase font-bold mb-1" style={{ color: "#475569" }}>Score indicatif xG</p>
                    <p className="text-2xl font-black tabular-nums leading-none" style={{ color: "#e8edf5" }}>{impliedScore}</p>
                    <p className="text-[10px] mt-1" style={{ color: "#64748b" }}>Conf. {confLabel}</p>
                  </div>
                </div>

                {/* 4. Contexte classement */}
                <div className="rounded-lg px-3 py-2.5" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[9px] uppercase font-bold mb-2" style={{ color: "#475569" }}>Contexte classement</p>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-0.5 flex-1">
                      <span className="text-2xl font-black tabular-nums" style={{ color: home.position <= 5 ? "#22c55e" : home.position >= 16 ? "#ef4444" : "#e8edf5" }}>
                        {home.position}<span className="text-sm">e</span>
                      </span>
                      <span className="text-[9px] font-bold" style={{ color: "#6b7c96" }}>{home.shortName || home.tla}</span>
                      <span className="text-[10px] tabular-nums" style={{ color: "#475569" }}>{home.points} pts</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold" style={{ color: "#475569" }}>vs</span>
                      {posDiff !== 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: Math.abs(posDiff) >= 6 ? "#f59e0b" : "#64748b" }}>
                          Δ{Math.abs(posDiff)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-0.5 flex-1">
                      <span className="text-2xl font-black tabular-nums" style={{ color: away.position <= 5 ? "#22c55e" : away.position >= 16 ? "#ef4444" : "#e8edf5" }}>
                        {away.position}<span className="text-sm">e</span>
                      </span>
                      <span className="text-[9px] font-bold" style={{ color: "#6b7c96" }}>{away.shortName || away.tla}</span>
                      <span className="text-[10px] tabular-nums" style={{ color: "#475569" }}>{away.points} pts</span>
                    </div>
                  </div>
                </div>

                {/* 5. Analyse du jeu — auto bullets */}
                <div>
                  <p className="text-[9px] uppercase font-bold mb-2" style={{ color: "#475569" }}>Analyse du jeu</p>
                  <ul className="space-y-1.5">
                    {bullets.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="flex-shrink-0 mt-[3px] w-3 h-3 rounded-sm flex items-center justify-center text-[8px] font-black" style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8" }}>
                          {idx + 1}
                        </span>
                        <span className="text-[11px] leading-relaxed" style={{ color: "#94a3b8" }}>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 6. Marchés à surveiller */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
                  <p className="text-[9px] uppercase font-bold mb-2" style={{ color: "#475569" }}>Marchés à surveiller</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg tabular-nums"
                      style={{ background: impliedOver ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: impliedOver ? "#22c55e" : "#ef4444", border: `1px solid ${impliedOver ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                      {impliedOver ? "O2.5" : "U2.5"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg"
                      style={{ background: mktBg(impliedBtts), color: mktColor(impliedBtts), border: `1px solid ${mktBorder(impliedBtts)}` }}>
                      BTTS {impliedBtts ? "✓ Oui" : "✗ Non"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg tabular-nums"
                      style={{ background: "rgba(129,140,248,0.1)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.25)" }}>
                      Score {impliedScore}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg ml-auto"
                      style={{ background: `${confColor}18`, color: confColor, border: `1px solid ${confColor}35` }}>
                      {pred.winner === "home" ? "DOM" : pred.winner === "away" ? "EXT" : "NUL"} {winnerProb}%
                    </span>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

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
                Élan : {match.homeTeam.shortName} {formMomentum(match.homeTeam.form) > 0 ? "+" : ""}{Math.round(formMomentum(match.homeTeam.form) * 100)}%
                · {match.awayTeam.shortName} {formMomentum(match.awayTeam.form) > 0 ? "+" : ""}{Math.round(formMomentum(match.awayTeam.form) * 100)}%
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

// ── Main component ────────────────────────────────────────────────────────────

export default function PredictionsTab() {
  const [subTab, setSubTab] = useState<"l1" | "l2">("l1");
  const [config] = useConfig();
  const [data, setData] = useState<PredData | null>(null);
  const [dataL2, setDataL2] = useState<PredData | null>(null);
  const [l2Fetched, setL2Fetched] = useState(false);
  const [loadingL2, setLoadingL2] = useState(false);
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

  // Lazy-fetch L2 predictions the first time the user switches to the l2 tab
  useEffect(() => {
    if (subTab !== "l2" || l2Fetched) return;
    setL2Fetched(true);
    setLoadingL2(true);
    fetch("/api/predictions?competition=FL2")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setDataL2(d); })
      .catch(() => {})
      .finally(() => setLoadingL2(false));
  }, [subTab, l2Fetched]);

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

  // Computed predictions for L2 (no expert/emotional overlay — FL2 only)
  const computedPredictionsL2 = useMemo(() => {
    if (!dataL2) return new Map<number, Prediction>();
    const map = new Map<number, Prediction>();
    for (const match of dataL2.predictions) {
      const pred = recomputePrediction(match, config.homeAdvantage, config.formMomentumEnabled);
      map.set(match.id, pred);
    }
    return map;
  }, [dataL2, config.homeAdvantage, config.formMomentumEnabled]);

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

  const SubTabs = () => (
    <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: "#0a0f1c", border: "1px solid #1a2235", display: "inline-flex" }}>
      {([["l1", "🏆 Ligue 1"], ["l2", "🥈 Ligue 2"]] as const).map(([id, label]) => {
        const active = subTab === id;
        return (
          <button key={id} onClick={() => setSubTab(id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap inline-flex items-center gap-1"
            style={{
              background: active ? "rgba(255,255,255,0.08)" : "transparent",
              color: active ? "#e2e8f0" : "#64748b",
              border: active ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
            }}>
            {label}
          </button>
        );
      })}
    </div>
  );

  if (subTab === "l2") {
    if (loadingL2 || !l2Fetched) {
      return (
        <div>
          <SubTabs />
          <div className="py-3">
            <LoadingBar color="#a855f7" caption="Chargement des prédictions Ligue 2" />
          </div>
        </div>
      );
    }
    if (!dataL2?.predictions.length) {
      return (
        <div>
          <SubTabs />
          <div className="text-center py-16" style={{ color: "#6b7c96" }}>Aucun match Ligue 2 à venir.</div>
        </div>
      );
    }
    const emptyMap = new Map<number, EmoEntry>();
    return (
      <div>
        <SubTabs />
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold" style={{ color: "#e8edf5" }}>
              Journée {dataL2.matchday} — Analyse prédictive Ligue 2
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
              Avantage dom. {config.homeAdvantage}%
              {config.formMomentumEnabled ? " · Élan de forme" : ""}
              {" · Algorithme FootPredictom"}
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {dataL2.predictions.map((m) => (
            <div key={m.id}>
              <MatchCard
                match={m}
                computedPrediction={computedPredictionsL2.get(m.id) ?? m.prediction}
                useEmotional={false}
                useExpert={false}
                emoMap={emptyMap}
                expertMatches={[]}
                showXG={config.showXG}
                showTechnicalDetails={config.showTechnicalDetails}
                formMomentumEnabled={config.formMomentumEnabled}
                homeAdv={config.homeAdvantage}
              />
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs" style={{ color: "#475569" }}>
          FootPredictom AI · xG · Forme · Classement · Données Ligue 2
        </p>
      </div>
    );
  }

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
