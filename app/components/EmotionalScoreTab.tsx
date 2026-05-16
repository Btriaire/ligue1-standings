"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Heart, TrendUp, TrendDown, Minus, Users, Newspaper,
  Buildings, CaretDown, Warning, Star, Lightning,
  Info, ChartBar, Radio, Globe, ChatCircle, ArrowsClockwise,
  SlidersHorizontal,
} from "@phosphor-icons/react";

interface Article { title: string; pubDate: string; source: string; sentiment: "positive" | "negative" | "neutral" }
interface SourceBreakdown { source: string; articleCount: number; positive: number; negative: number; score: number }
interface ClubScore {
  teamId: number;
  team: { id: number; name: string; shortName: string; tla: string; crest: string; position: number };
  emotionalScore: number;
  predictionDelta: number;
  components: {
    economic: { score: number; label: string; revenue: string; owner: string; weight: number };
    media: { score: number; positive: number; negative: number; total: number; articles: Article[]; sourceBreakdown: SourceBreakdown[]; weight: number };
    human: { score: number; totalValue: number; avgValue: number; injuryRate: number; topPlayer: string | null; playerCount: number; injuredPlayers: string[]; weight: number };
    fan: { score: number; positive: number; negative: number; total: number; subreddit: string; weight: number } | undefined;
    market: { score: number; weight: number; source: string } | null;
  };
}

interface EmotionalData {
  scores: ClubScore[];
  sources: { media: string[]; fan?: string; mercato: string; economic: string; market: string | null };
  updatedAt: string;
}


interface Weights { eco: number; media: number; human: number; fan: number }
const DEFAULT_WEIGHTS: Weights = { eco: 28, media: 28, human: 30, fan: 14 };

// ── helpers ──────────────────────────────────────────────────────────────────

function emotionColor(score: number) {
  if (score >= 70) return { color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)" };
  if (score >= 55) return { color: "#00d4ff", bg: "rgba(0,212,255,0.1)", border: "rgba(0,212,255,0.25)" };
  if (score >= 40) return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" };
  if (score >= 28) return { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.25)" };
  return { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" };
}
function emotionLabel(score: number) {
  if (score >= 70) return "Excellent";
  if (score >= 55) return "Positif";
  if (score >= 40) return "Neutre";
  if (score >= 28) return "Tendu";
  return "Critique";
}
function formatValue(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}Md€`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M€`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K€`;
  return `${v}€`;
}

function computeScore(c: ClubScore["components"], weights: Weights): number {
  const w = weights;
  const total = w.eco + w.media + w.human + w.fan + (c.market ? 10 : 0);
  if (total === 0) return 50;
  const score =
    c.economic.score * w.eco +
    c.media.score * w.media +
    c.human.score * w.human +
    (c.fan?.score ?? 50) * w.fan +
    (c.market ? c.market.score * 10 : 0);
  return Math.max(0, Math.min(100, Math.round(score / total)));
}

function computeDelta(score: number): number {
  if (score >= 72) return 7;
  if (score >= 62) return 4;
  if (score >= 52) return 1;
  if (score <= 22) return -8;
  if (score <= 32) return -5;
  if (score <= 42) return -2;
  return 0;
}

// ── sub-components ────────────────────────────────────────────────────────────

function ScoreGauge({ score, size = 64 }: { score: number; size?: number }) {
  const { color } = emotionColor(score);
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const filled = (arc * score) / 100;
  const offset = circ * 0.125;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)"
        strokeWidth={size*0.1} strokeDasharray={`${arc} ${circ-arc}`} strokeDashoffset={-offset} strokeLinecap="round"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={size*0.1} strokeDasharray={`${filled} ${circ-filled}`} strokeDashoffset={-offset} strokeLinecap="round"
        style={{ filter:`drop-shadow(0 0 5px ${color}70)`, transition:"stroke-dasharray 0.8s ease" }}/>
      <text x={size/2} y={size/2+size*0.06} textAnchor="middle"
        fontSize={size*0.24} fontWeight="900" fill={color}>{score}</text>
    </svg>
  );
}

function WeightSliders({ weights, onChange }: { weights: Weights; onChange: (w: Weights) => void }) {
  const [open, setOpen] = useState(false);
  const total = weights.eco + weights.media + weights.human + weights.fan;

  const items = [
    { key: "eco",   label: "Économique",   color: "#f59e0b", icon: <Buildings size={12} /> },
    { key: "media", label: "Médias",       color: "#00d4ff", icon: <Newspaper size={12} /> },
    { key: "human", label: "Humain",       color: "#22c55e", icon: <Users size={12} /> },
    { key: "fan",   label: "Supporters",  color: "#06b6d4", icon: <ChatCircle size={12} /> },
  ] as const;

  const isDefault = weights.eco === DEFAULT_WEIGHTS.eco && weights.media === DEFAULT_WEIGHTS.media &&
    weights.human === DEFAULT_WEIGHTS.human && weights.fan === DEFAULT_WEIGHTS.fan;

  return (
    <div className="rounded-2xl mb-4 overflow-hidden" style={{ border: "1px solid #1e2d42" }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)" }}>
          <SlidersHorizontal size={15} style={{ color: "#a78bfa" }} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold" style={{ color: "#e8edf5" }}>Pondération des dimensions</p>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
            {items.map(i => `${i.label} ${total > 0 ? Math.round(weights[i.key] / total * 100) : 0}%`).join(" · ")}
          </p>
        </div>
        {!isDefault && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>Modifié</span>}
        <CaretDown size={15} style={{ color: "#6b7c96" }} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-xs mt-3" style={{ color: "#6b7c96" }}>
            Ajustez la pondération relative de chaque dimension. Les scores sont recalculés en temps réel.
          </p>
          <div className="space-y-4">
            {items.map((item) => {
              const val = weights[item.key];
              const eff = total > 0 ? Math.round(val / total * 100) : 0;
              return (
                <div key={item.key}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: item.color }}>
                      {item.icon} {item.label}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${eff}%`, background: item.color }} />
                      </div>
                      <span className="text-xs font-black w-8 text-right" style={{ color: item.color }}>{eff}%</span>
                    </div>
                  </div>
                  <input
                    type="range" min={0} max={50} value={val}
                    onChange={(e) => onChange({ ...weights, [item.key]: parseInt(e.target.value) })}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: item.color }}
                  />
                </div>
              );
            })}
          </div>
          <button
            onClick={() => onChange({ ...DEFAULT_WEIGHTS })}
            disabled={isDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.06)", color: "#6b7c96" }}>
            <ArrowsClockwise size={11} /> Réinitialiser les poids par défaut
          </button>
        </div>
      )}
    </div>
  );
}

function Methodology({ sources }: { sources: EmotionalData["sources"] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl mb-4 overflow-hidden" style={{ border: "1px solid #1e2d42" }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.25)" }}>
          <Info size={15} className="text-cyan-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold" style={{ color: "#e8edf5" }}>Comment est calculé le Facteur additionnel ?</p>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
            {sources.media.join(" · ")} · Buzz Supporters · Données économiques publiques
          </p>
        </div>
        <CaretDown size={15} style={{ color: "#6b7c96" }} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-sm mt-4" style={{ color: "#94a3b8" }}>
            Le Facteur additionnel (0–100) mesure la <strong style={{ color: "#e8edf5" }}>santé globale d'un club</strong> en 4 dimensions,
            puis corrige automatiquement les <strong style={{ color: "#e8edf5" }}>prédictions IA</strong> (±2 à ±7%).
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: <Buildings size={16} />, color: "#f59e0b", weight: "28%", title: "Économique", desc: "Propriétaire, revenus annuels, solidité financière.", source: sources.economic },
              { icon: <Newspaper size={16} />, color: "#00d4ff", weight: "28%", title: "Médias & Sentiment", desc: "Analyse des 15 derniers articles par club (positifs vs négatifs).", source: sources.media.join(", ") },
              { icon: <Users size={16} />, color: "#22c55e", weight: "30%", title: "Humain", desc: "Valeur totale de l'effectif et taux de blessures.", source: sources.mercato },
              { icon: <ChatCircle size={16} />, color: "#06b6d4", weight: "14%", title: "Buzz Supporters", desc: "Analyse des articles Google News et L'Équipe, mots-clés supporters.", source: "Google News · L'Équipe" },
            ].map((c) => (
              <div key={c.title} className="rounded-xl p-3" style={{ background: `${c.color}08`, border: `1px solid ${c.color}20` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ color: c.color }}>{c.icon}</span>
                  <span className="text-xs font-black px-1.5 py-0.5 rounded-full" style={{ background: `${c.color}20`, color: c.color }}>{c.weight}</span>
                </div>
                <p className="font-bold text-xs mb-1" style={{ color: "#e8edf5" }}>{c.title}</p>
                <p className="text-xs leading-relaxed mb-1" style={{ color: "#6b7c96" }}>{c.desc}</p>
                <p className="text-xs italic" style={{ color: "#6b7c96" }}>Source : {c.source}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "#6b7c96" }}>IMPACT SUR LES PRÉDICTIONS</p>
            <div className="grid grid-cols-5 gap-2 text-xs text-center">
              {[
                { range: "≥ 72", delta: "+7%", color: "#22c55e" },
                { range: "62–72", delta: "+4%", color: "#86efac" },
                { range: "52–62", delta: "+1%", color: "#00d4ff" },
                { range: "32–42", delta: "-2%", color: "#f97316" },
                { range: "< 32", delta: "-5 à -8%", color: "#ef4444" },
              ].map((r) => (
                <div key={r.range} className="rounded-lg p-2" style={{ background: `${r.color}10` }}>
                  <p className="font-bold" style={{ color: r.color }}>{r.delta}</p>
                  <p style={{ color: "#6b7c96" }}>Score {r.range}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ComponentBar({ label, score, icon, detail, weight }: { label: string; score: number; icon: React.ReactNode; detail?: string; weight: number }) {
  const { color } = emotionColor(score);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "#94a3b8" }}>
          <span style={{ color }}>{icon}</span>
          {label}
          <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "#6b7c96" }}>{weight}%</span>
          {detail && <span className="opacity-50 hidden sm:inline">· {detail}</span>}
        </div>
        <span className="text-xs font-bold" style={{ color }}>{score}/100</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color, boxShadow: `0 0 6px ${color}50` }} />
      </div>
    </div>
  );
}

function SourceRow({ src }: { src: SourceBreakdown }) {
  const sourceIcon: Record<string, React.ReactNode> = {
    "RMC Sport": <Radio size={12} />,
    "Le Figaro Sport": <Newspaper size={12} />,
    "Google News": <Globe size={12} />,
  };
  const { color } = emotionColor(src.score);
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span style={{ color: "#6b7c96" }}>{sourceIcon[src.source] ?? <Globe size={12} />}</span>
      <span className="text-xs flex-1" style={{ color: "#94a3b8" }}>{src.source}</span>
      <span className="text-xs" style={{ color: "#22c55e" }}>+{src.positive}</span>
      <span className="text-xs" style={{ color: "#ef4444" }}>-{src.negative}</span>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{src.score}</span>
    </div>
  );
}

function ArticleRow({ article }: { article: Article }) {
  const cfg: Record<string, { color: string; icon: React.ReactNode }> = {
    positive: { color: "#22c55e", icon: <TrendUp size={9} /> },
    negative: { color: "#ef4444", icon: <TrendDown size={9} /> },
    neutral:  { color: "#94a3b8", icon: <Minus size={9} /> },
  };
  const { color, icon } = cfg[article.sentiment];
  return (
    <div className="flex items-start gap-2 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
      <span className="px-1.5 py-0.5 rounded text-xs font-black flex-shrink-0 mt-0.5" style={{ background: `${color}15`, color }}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs leading-snug truncate" style={{ color: "#94a3b8" }}>{article.title}</p>
        <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>{article.source}</p>
      </div>
    </div>
  );
}


// ── Fan Buzz Section (replaces Reddit) ───────────────────────────────────────

interface BuzzItem {
  title: string; pubDate: string; source: string; url: string;
  sentiment: "positive" | "negative" | "neutral";
  matchedPos: string[]; matchedNeg: string[];
  impact: "high" | "medium" | "low" | "none";
  impactPoints: number;
  impactReason: string;
}

interface BuzzData {
  items: BuzzItem[];
  score: number;
  positive: number;
  negative: number;
  total: number;
  topPositiveKeywords: string[];
  topNegativeKeywords: string[];
  maxAgeDays: number;
}

function buzzScoreColor(score: number) {
  if (score >= 68) return "#22c55e";
  if (score >= 55) return "#00d4ff";
  if (score >= 44) return "#f59e0b";
  if (score >= 33) return "#f97316";
  return "#ef4444";
}

function FanBuzzSection({ teamId }: { teamId: number }) {
  const [data, setData] = useState<BuzzData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fan-buzz?teamId=${teamId}`);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setData(await res.json());
      setFetched(true);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = data ? buzzScoreColor(data.score) : "#6b7c96";

  return (
    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs font-semibold" style={{ color: "#6b7c96" }}>BUZZ SUPPORTERS — 30 derniers jours</p>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>Google News · L&apos;Équipe · impact pondéré par mots-clés</p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-sm font-black px-2 py-0.5 rounded-lg"
              style={{ color: scoreColor, background: `${scoreColor}15`, border: `1px solid ${scoreColor}25` }}>
              {data.score}
            </span>
          )}
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg transition-all hover:opacity-70 disabled:opacity-40"
            style={{ background: "rgba(244,114,182,0.1)", color: "#06b6d4", border: "1px solid rgba(244,114,182,0.2)" }}>
            <ArrowsClockwise size={10} className={loading ? "animate-spin" : ""} />
            {loading ? "Chargement…" : fetched ? "Actualiser" : "Charger"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs" style={{ color: "#ef4444" }}>Erreur : {error}</p>}
      {fetched && !data?.items.length && !error && (
        <p className="text-xs" style={{ color: "#6b7c96" }}>Aucun article récent trouvé.</p>
      )}

      {data?.items.slice(0, 6).map((item, i) => {
        const sc = item.sentiment === "positive" ? "#22c55e" : item.sentiment === "negative" ? "#ef4444" : "#6b7c96";
        const pts = item.impactPoints;
        return (
          <div key={i} className="flex items-start gap-2 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
            {/* Impact blocks */}
            <div className="flex gap-0.5 mt-1.5 flex-shrink-0">
              {[0, 1, 2].map(n => (
                <span key={n} className="w-1 h-3 rounded-sm"
                  style={{ background: n < Math.abs(pts) ? sc : "rgba(255,255,255,0.08)" }} />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-snug" style={{ color: "#94a3b8" }}>{item.title}</p>
              <p className="text-[10px] mt-0.5" style={{ color: item.impact !== "none" ? sc : "#6b7c96" }}>
                {pts > 0 ? `+${pts}` : pts < 0 ? `${pts}` : "±0"} · {item.impactReason}
              </p>
            </div>
          </div>
        );
      })}

      {!fetched && !loading && !error && (
        <p className="text-xs" style={{ color: "#6b7c96" }}>
          Cliquez &ldquo;Charger&rdquo; — articles des 30 derniers jours uniquement
        </p>
      )}
    </div>
  );
}

function ClubDetail({ club, weights }: { club: ClubScore; weights: Weights }) {
  const c = club.components;

  const total = weights.eco + weights.media + weights.human + weights.fan + (c.market ? 10 : 0);
  const effWeight = (w: number) => total > 0 ? Math.round(w / total * 100) : 0;

  return (
    <div className="mt-4 space-y-4">
      {/* Component bars */}
      <div className="space-y-3 px-1">
        <ComponentBar label="Économique" score={c.economic.score} icon={<Buildings size={12} />} detail={c.economic.owner} weight={effWeight(weights.eco)} />
        <ComponentBar label="Médias & Sentiment" score={c.media.score} icon={<Newspaper size={12} />} detail={c.media.total > 0 ? `${c.media.positive} pos · ${c.media.negative} nég` : "en attente"} weight={effWeight(weights.media)} />
        <ComponentBar label="Humain" score={c.human.score} icon={<Users size={12} />} detail={c.human.totalValue > 0 ? formatValue(c.human.totalValue) : "—"} weight={effWeight(weights.human)} />
        {c.fan && <ComponentBar label="Supporters" score={c.fan.score} icon={<ChatCircle size={12} />} detail={c.fan.total > 0 ? `${c.fan.positive} pos · ${c.fan.negative} nég` : "en attente"} weight={effWeight(weights.fan)} />}
        {c.market && <ComponentBar label="Paris Sportifs" score={c.market.score} icon={<ChartBar size={12} />} detail={c.market.source} weight={effWeight(10)} />}
      </div>

      {/* Economic info */}
      <div className="rounded-xl p-3 grid grid-cols-2 gap-3 text-xs" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div><p style={{ color: "#6b7c96" }}>Propriétaire</p><p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>{c.economic.owner}</p></div>
        <div><p style={{ color: "#6b7c96" }}>Revenus estimés</p><p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>{c.economic.revenue}</p></div>
        <div><p style={{ color: "#6b7c96" }}>Stabilité</p><p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>{c.economic.label}</p></div>
        <div><p style={{ color: "#6b7c96" }}>Score éco.</p><p className="font-semibold mt-0.5" style={{ color: emotionColor(c.economic.score).color }}>{c.economic.score}/100</p></div>
      </div>

      {/* Mercato */}
      {c.human.totalValue > 0 && (
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs font-semibold mb-3" style={{ color: "#6b7c96" }}>EFFECTIF & MERCATO</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Valeur totale", value: formatValue(c.human.totalValue), color: "#00d4ff" },
              { label: "Valeur moy.", value: formatValue(c.human.avgValue), color: "#e8edf5" },
              { label: "Blessés", value: `${c.human.injuryRate}%`, color: c.human.injuryRate > 20 ? "#ef4444" : c.human.injuryRate > 10 ? "#f59e0b" : "#22c55e" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-base font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>{s.label}</p>
              </div>
            ))}
          </div>
          {c.human.topPlayer && (
            <div className="flex items-center gap-2 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <Star size={12} style={{ color: "#f59e0b" }} />
              <span className="text-xs" style={{ color: "#6b7c96" }}>Joueur le plus coté :</span>
              <span className="text-xs font-bold" style={{ color: "#e8edf5" }}>{c.human.topPlayer}</span>
            </div>
          )}
          {c.human.injuredPlayers.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-xs flex items-center gap-1" style={{ color: "#f97316" }}><Warning size={10} /> Blessés :</span>
              {c.human.injuredPlayers.map((p) => (
                <span key={p} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(249,115,22,0.1)", color: "#f97316" }}>{p}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Media sources */}
      {c.media.sourceBreakdown.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "#6b7c96" }}>SOURCES MÉDIAS</p>
          <div className="flex justify-between text-xs mb-1 px-1" style={{ color: "#6b7c96" }}>
            <span>Source</span><span>Articles</span><span>Pos</span><span>Nég</span><span>Score</span>
          </div>
          {c.media.sourceBreakdown.map((s) => <SourceRow key={s.source} src={s} />)}
        </div>
      )}

      {/* News headlines */}
      {c.media.articles.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "#6b7c96" }}>DERNIÈRES ACTUALITÉS</p>
          {c.media.articles.slice(0, 6).map((a, i) => <ArticleRow key={i} article={a} />)}
        </div>
      )}

      {/* Fan Buzz */}
      <FanBuzzSection teamId={club.teamId} />
    </div>
  );
}

function ClubCard({ club, customScore, weights }: { club: ClubScore; customScore: number; weights: Weights }) {
  const [expanded, setExpanded] = useState(false);
  const { color, border } = emotionColor(customScore);
  const delta = computeDelta(customScore);
  const c = club.components;

  const total = weights.eco + weights.media + weights.human + weights.fan + (c.market ? 10 : 0);
  const effWeight = (w: number) => total > 0 ? Math.round(w / total * 100) : 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#0d1421", border: `1px solid ${border}` }}>
      <button className="w-full flex items-center gap-4 px-5 py-4 transition-all hover:bg-white/[0.02]"
        onClick={() => setExpanded(!expanded)}>
        <ScoreGauge score={customScore} size={64} />
        {club.team.crest
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={club.team.crest} alt={club.team.shortName} className="w-9 h-9 object-contain flex-shrink-0" />
          : <div className="w-9 h-9 rounded bg-white/5 flex-shrink-0 flex items-center justify-center text-xs font-black" style={{ color: "#6b7c96" }}>{club.team.tla?.slice(0, 2)}</div>
        }
        <div className="flex-1 min-w-0 text-left">
          <p className="font-bold text-sm truncate" style={{ color: "#e8edf5" }}>{club.team.name}</p>
          <p className="text-xs mt-0.5 font-medium" style={{ color }}>{emotionLabel(customScore)}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs" style={{ color: "#6b7c96" }}>{club.team.position}e au classement</span>
            {delta !== 0 && (
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: delta > 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: delta > 0 ? "#22c55e" : "#ef4444" }}>
                <Lightning size={9} />{delta > 0 ? "+" : ""}{delta}% prédiction
              </span>
            )}
          </div>
        </div>

        {/* Mini bars */}
        <div className="hidden sm:flex flex-col gap-1.5 items-end flex-shrink-0 mr-2">
          {[
            { label: "Éco",    score: c.economic.score, eff: effWeight(weights.eco) },
            { label: "Média",  score: c.media.score, eff: effWeight(weights.media) },
            { label: "Humain", score: c.human.score, eff: effWeight(weights.human) },
            { label: "Fans",   score: c.fan?.score ?? 50, eff: effWeight(weights.fan) },
          ].map((comp) => {
            const cc = emotionColor(comp.score);
            return (
              <div key={comp.label} className="flex items-center gap-2">
                <span className="text-xs w-10 text-right" style={{ color: "#6b7c96" }}>{comp.label}</span>
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${comp.score}%`, background: cc.color }} />
                </div>
                <span className="text-xs w-5" style={{ color: cc.color }}>{comp.score}</span>
              </div>
            );
          })}
        </div>

        <CaretDown size={16} style={{ color: "#6b7c96", flexShrink: 0 }} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <ClubDetail club={club} weights={weights} />
        </div>
      )}
    </div>
  );
}

// ── World Cup Emotional Scores (AI-generated, pre-computed) ──────────────────

interface WCTeam {
  flag: string; name: string; group: string;
  score: number;
  media: number; human: number; fan: number;
  note: string;
  squadValue: string; injury: string; topPlayer: string;
}

const WC_TEAMS: WCTeam[] = [
  { flag:"🇫🇷", name:"France",           group:"F", score:80, media:78, human:85, fan:76, note:"Finaliste 2022 · Mbappé capitaine", squadValue:"~1.3 Md€", injury:"Faible", topPlayer:"Kylian Mbappé" },
  { flag:"🇪🇸", name:"Espagne",           group:"E", score:85, media:82, human:88, fan:85, note:"Champion d'Europe 2024 · Yamal 18 ans", squadValue:"~1.1 Md€", injury:"Faible", topPlayer:"Lamine Yamal" },
  { flag:"🇦🇷", name:"Argentine",         group:"A", score:81, media:80, human:75, fan:88, note:"Tenant du titre · Messi en fin de carrière", squadValue:"~850 M€", injury:"Modéré", topPlayer:"Lionel Messi" },
  { flag:"🇧🇷", name:"Brésil",            group:"G", score:76, media:75, human:82, fan:70, note:"Quart-finaliste 2022 · Reconstruction", squadValue:"~1.0 Md€", injury:"Modéré", topPlayer:"Vinicius Jr" },
  { flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", name:"Angleterre",       group:"I", score:72, media:70, human:82, fan:64, note:"Semi-finalistes 2022 · Hésitations médias", squadValue:"~1.2 Md€", injury:"Faible", topPlayer:"Jude Bellingham" },
  { flag:"🇩🇪", name:"Allemagne",         group:"H", score:72, media:68, human:78, fan:70, note:"Remontée post-2022 · Wirtz en forme", squadValue:"~900 M€", injury:"Faible", topPlayer:"Florian Wirtz" },
  { flag:"🇵🇹", name:"Portugal",          group:"D", score:76, media:74, human:76, fan:78, note:"Ronaldo facteur galvanisant", squadValue:"~780 M€", injury:"Modéré", topPlayer:"Cristiano Ronaldo" },
  { flag:"🇳🇱", name:"Pays-Bas",          group:"H", score:68, media:65, human:74, fan:66, note:"Groupe de mort avec Allemagne", squadValue:"~720 M€", injury:"Modéré", topPlayer:"Virgil van Dijk" },
  { flag:"🇺🇸", name:"USA",              group:"C", score:78, media:80, human:72, fan:82, note:"Pays hôte · Ferveur record attendue", squadValue:"~550 M€", injury:"Faible", topPlayer:"Christian Pulisic" },
  { flag:"🇲🇽", name:"Mexique",           group:"B", score:80, media:82, human:68, fan:90, note:"Pays hôte · Match d'ouverture Azteca", squadValue:"~420 M€", injury:"Faible", topPlayer:"Hirving Lozano" },
  { flag:"🇨🇦", name:"Canada",            group:"D", score:70, media:68, human:65, fan:78, note:"Pays hôte · 2e CM qualifié seulement", squadValue:"~380 M€", injury:"Faible", topPlayer:"Alphonso Davies" },
  { flag:"🇲🇦", name:"Maroc",             group:"E", score:75, media:72, human:68, fan:85, note:"Demi-finaliste 2022 · Énorme soutien", squadValue:"~400 M€", injury:"Modéré", topPlayer:"Achraf Hakimi" },
  { flag:"🇺🇾", name:"Uruguay",           group:"D", score:67, media:62, human:66, fan:72, note:"2 fois champion · Noyau expérimenté", squadValue:"~380 M€", injury:"Modéré", topPlayer:"Darwin Núñez" },
  { flag:"🇨🇴", name:"Colombie",          group:"G", score:69, media:64, human:68, fan:74, note:"Qualifs impressionnantes · James Rodriguez", squadValue:"~420 M€", injury:"Faible", topPlayer:"James Rodríguez" },
  { flag:"🇯🇵", name:"Japon",             group:"E", score:65, media:60, human:64, fan:72, note:"Huitièmes 2022 · Surprise potentielle", squadValue:"~350 M€", injury:"Faible", topPlayer:"Takefusa Kubo" },
  { flag:"🇭🇷", name:"Croatie",           group:"J", score:63, media:60, human:62, fan:68, note:"Finaliste 2018 · 3e 2022 · Vétérans", squadValue:"~320 M€", injury:"Modéré", topPlayer:"Luka Modrić" },
  { flag:"🇧🇪", name:"Belgique",          group:"E", score:64, media:60, human:70, fan:62, note:"Génération en déclin · transition", squadValue:"~580 M€", injury:"Élevé", topPlayer:"Kevin De Bruyne" },
  { flag:"🇮🇹", name:"Italie",            group:"J", score:66, media:64, human:68, fan:65, note:"Champion 2006 · Manque WC 2022", squadValue:"~620 M€", injury:"Modéré", topPlayer:"Federico Chiesa" },
  { flag:"🇩🇿", name:"Algérie",           group:"F", score:71, media:70, human:60, fan:82, note:"Choc contre la France · Motivation max", squadValue:"~200 M€", injury:"Faible", topPlayer:"Riyad Mahrez" },
  { flag:"🇨🇭", name:"Suisse",            group:"F", score:59, media:55, human:62, fan:60, note:"Régulière en CdM · peu de pression", squadValue:"~280 M€", injury:"Faible", topPlayer:"Granit Xhaka" },
];

function WCEmotionalView() {
  const [sortBy, setSortBy] = useState<"score" | "group">("score");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);

  const groups = [...new Set(WC_TEAMS.map(t => t.group))].sort();

  const sorted = [...WC_TEAMS]
    .filter(t => !groupFilter || t.group === groupFilter)
    .sort((a, b) => sortBy === "score" ? b.score - a.score : a.group.localeCompare(b.group) || b.score - a.score);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "#e8edf5" }}>
            <Heart size={16} className="text-cyan-400" /> Facteur additionnel — Coupe du Monde 2026
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
            Analyse IA · Économique · Médias · Effectif · Supporters
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
          {([["score","Par score"],["group","Par groupe"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setSortBy(id)}
              className="px-3 py-1 rounded text-xs font-medium transition-all"
              style={{ background: sortBy === id ? "rgba(255,255,255,0.06)" : "transparent", color: sortBy === id ? "#e8edf5" : "#6b7c96" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Group filter */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => setGroupFilter(null)}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
          style={{ background: !groupFilter ? "rgba(244,114,182,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${!groupFilter ? "rgba(244,114,182,0.3)" : "rgba(255,255,255,0.08)"}`, color: !groupFilter ? "#06b6d4" : "#6b7c96" }}>
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

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {[
          { label: "Excellent (70+)", color: "#22c55e" },
          { label: "Positif (55–70)", color: "#00d4ff" },
          { label: "Neutre (40–55)", color: "#f59e0b" },
          { label: "Tendu (<40)",    color: "#ef4444" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: l.color }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Team cards */}
      <div className="space-y-2">
        {sorted.map((team) => {
          const { color, border } = emotionColor(team.score);
          const delta = computeDelta(team.score);
          const isOpen = expanded === team.name;
          return (
            <div key={team.name} className="rounded-2xl overflow-hidden" style={{ background: "#0d1421", border: `1px solid ${border}` }}>
              <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-all text-left"
                onClick={() => setExpanded(isOpen ? null : team.name)}>
                <ScoreGauge score={team.score} size={52} />
                <span className="text-2xl flex-shrink-0">{team.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm" style={{ color: "#e8edf5" }}>{team.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(234,179,8,0.12)", color: "#eab308" }}>
                      Gr.{team.group}
                    </span>
                    {delta !== 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ background: delta > 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: delta > 0 ? "#22c55e" : "#ef4444" }}>
                        <Lightning size={9} />{delta > 0 ? "+" : ""}{delta}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color }}>{emotionLabel(team.score)}</p>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: "#6b7c96" }}>{team.note}</p>
                </div>
                {/* Mini bars */}
                <div className="hidden sm:flex flex-col gap-1 items-end flex-shrink-0 mr-2">
                  {([["Média", team.media], ["Humain", team.human], ["Fans", team.fan]] as const).map(([label, val]) => {
                    const c = emotionColor(val);
                    return (
                      <div key={label} className="flex items-center gap-1.5">
                        <span className="text-xs w-10 text-right" style={{ color: "#6b7c96" }}>{label}</span>
                        <div className="w-14 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full" style={{ width: `${val}%`, background: c.color }} />
                        </div>
                        <span className="text-xs w-5" style={{ color: c.color }}>{val}</span>
                      </div>
                    );
                  })}
                </div>
                <CaretDown size={14} style={{ color: "#6b7c96", flexShrink: 0 }}
                  className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  {/* Bars */}
                  <div className="space-y-2 pt-3">
                    {([
                      ["Médias",     team.media, "#00d4ff", <Newspaper key="media" size={12} />],
                      ["Humain",     team.human, "#22c55e", <Users key="human" size={12} />],
                      ["Supporters", team.fan,   "#06b6d4", <ChatCircle key="fan" size={12} />],
                    ] as const).map(([label, val, clr, icon]) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: clr }}>{icon}{label}</div>
                          <span className="text-xs font-bold" style={{ color: clr }}>{val}/100</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, background: clr }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Details */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { label: "Valeur effectif", value: team.squadValue },
                      { label: "Blessures", value: team.injury },
                      { label: "Joueur clé", value: team.topPlayer },
                    ].map(d => (
                      <div key={d.label} className="rounded-xl p-2 text-center"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-[10px]" style={{ color: "#6b7c96" }}>{d.label}</p>
                        <p className="font-semibold mt-0.5 truncate" style={{ color: "#e8edf5" }}>{d.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] px-2 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", color: "#94a3b8" }}>
                    ⚡ {team.note}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs" style={{ color: "#475569" }}>
        Scores IA générés par FootPredictom · Données estimées avant tournoi · Mis à jour au fur et à mesure
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function EmotionalScoreTab() {
  const [subTab, setSubTab] = useState<"l1" | "cdm">("l1");
  const [data, setData] = useState<EmotionalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "rank">("score");
  const [weights, setWeights] = useState<Weights>({ ...DEFAULT_WEIGHTS });

  useEffect(() => {
    fetch("/api/emotional-score")
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const scored = useMemo(() => {
    if (!data) return [];
    return data.scores.map((club) => ({
      club,
      customScore: computeScore(club.components, weights),
    }));
  }, [data, weights]);

  const sorted = useMemo(() => {
    return scored.slice().sort((a, b) =>
      sortBy === "score" ? b.customScore - a.customScore : a.club.team.position - b.club.team.position
    );
  }, [scored, sortBy]);

  const SubTabs = () => (
    <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: "#0a0f1c", border: "1px solid #1a2235", display: "inline-flex" }}>
      {([["l1", "🏆 Ligue 1"], ["cdm", "🌍 Coupe du Monde"]] as const).map(([id, label]) => (
        <button key={id} onClick={() => setSubTab(id)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
          style={{ background: subTab === id ? "rgba(255,255,255,0.08)" : "transparent", color: subTab === id ? "#e2e8f0" : "#64748b", border: subTab === id ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent" }}>
          {label}
        </button>
      ))}
    </div>
  );

  if (subTab === "cdm") return <div><SubTabs /><WCEmotionalView /></div>;

  if (loading) {
    return (
      <div>
        <SubTabs />
        <div className="space-y-3">
          <div className="text-center py-6">
            <Heart size={24} className="text-cyan-400 mx-auto mb-3 animate-pulse" />
            <p className="text-sm font-medium" style={{ color: "#e8edf5" }}>Analyse en cours…</p>
            <p className="text-xs mt-1" style={{ color: "#6b7c96" }}>Collecte : RMC, Figaro, Google News</p>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "#0d1421", border: "1px solid #1e2d42" }} />
          ))}
        </div>
      </div>
    );
  }
  if (error) return <div><SubTabs /><div className="text-center py-16 text-red-400 text-sm">{error}</div></div>;

  return (
    <div>
      <SubTabs />
      {data && <Methodology sources={data.sources} />}
      <WeightSliders weights={weights} onChange={setWeights} />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "#e8edf5" }}>
            <Heart size={17} className="text-cyan-400" /> Facteur additionnel — {sorted.length} clubs
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>Cliquez un club pour le détail · Buzz supporters chargeable par club</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
          {[{ id: "score", label: "Par score" }, { id: "rank", label: "Par classement" }].map((opt) => (
            <button key={opt.id} onClick={() => setSortBy(opt.id as "score" | "rank")}
              className="px-3 py-1 rounded text-xs font-medium transition-all"
              style={{ background: sortBy === opt.id ? "rgba(255,255,255,0.06)" : "transparent", color: sortBy === opt.id ? "#e8edf5" : "#6b7c96" }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        {[
          { label: "Excellent (70+)", color: "#22c55e" },
          { label: "Positif (55-70)", color: "#00d4ff" },
          { label: "Neutre (40-55)", color: "#f59e0b" },
          { label: "Tendu (28-40)", color: "#f97316" },
          { label: "Critique (<28)", color: "#ef4444" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: l.color }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {sorted.map(({ club, customScore }, i) => (
          <div key={club.teamId} className="animate-fade-in-up" style={{ animationDelay: `${i * 35}ms` }}>
            <ClubCard club={club} customScore={customScore} weights={weights} />
          </div>
        ))}
      </div>

      {data?.updatedAt && (
        <p className="mt-6 text-xs text-center" style={{ color: "#6b7c96" }}>
          Mis à jour le {new Date(data.updatedAt).toLocaleString("fr-FR")} · Cache 30 min
        </p>
      )}
    </div>
  );
}
