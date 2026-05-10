"use client";

import { useEffect, useState } from "react";
import {
  Heart, TrendingUp, TrendingDown, Minus, Users, Newspaper,
  Building2, ChevronDown, AlertTriangle, Star, Zap,
  Info, BarChart2, Radio, Globe,
} from "lucide-react";

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
    market: { score: number; weight: number; source: string } | null;
  };
}

interface EmotionalData {
  scores: ClubScore[];
  sources: { media: string[]; mercato: string; economic: string; market: string | null };
  updatedAt: string;
}

interface PlayerSquad {
  id: string; name: string; position: string; age: number;
  nationality: string[]; marketValue: number; status?: string; foot?: string; contract?: string;
}
interface SquadData {
  team: { name: string; crest: string; venue: string; coach: string };
  squad: PlayerSquad[];
  stats: { totalValue: number; avgValue: number; playerCount: number; injuredCount: number; injuryRate: number };
}

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

function Methodology({ sources }: { sources: EmotionalData["sources"] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl mb-6 overflow-hidden" style={{ border: "1px solid #1e2d42" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02]"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.25)" }}>
          <Info size={15} className="text-pink-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold" style={{ color: "#e8edf5" }}>Comment est calculé le Score Émotionnel ?</p>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
            {sources.media.join(" · ")} · Transfermarkt · Données économiques publiques
            {sources.market ? ` · ${sources.market}` : ""}
          </p>
        </div>
        <ChevronDown size={15} style={{ color: "#6b7c96" }} className={`transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-sm mt-4" style={{ color: "#94a3b8" }}>
            Le Score Émotionnel (0–100) mesure la <strong style={{ color: "#e8edf5" }}>santé globale d'un club</strong> au-delà des stats sportives.
            Il est calculé à partir de <strong style={{ color: "#e8edf5" }}>3 dimensions</strong> pondérées,
            puis utilisé pour <strong style={{ color: "#e8edf5" }}>corriger automatiquement les prédictions IA</strong> (±2 à ±7%).
          </p>

          <div className="grid sm:grid-cols-3 gap-3">
            {[
              {
                icon: <Building2 size={18} />, color: "#f59e0b", weight: "30%",
                title: "Économique",
                desc: "Solidité financière du club : propriétaire, budget estimé, revenus annuels, niveau d'investissement récent.",
                source: sources.economic,
              },
              {
                icon: <Newspaper size={18} />, color: "#00d4ff", weight: "35%",
                title: "Médias & Sentiment",
                desc: "Analyse de sentiment sur les 15 derniers articles par club. Mots positifs (victoire, record…) vs négatifs (crise, blessure…).",
                source: sources.media.join(", "),
              },
              {
                icon: <Users size={18} />, color: "#22c55e", weight: "35%",
                title: "Humain & Mercato",
                desc: "Valeur totale + moyenne de l'effectif, taux de blessures. Un effectif coûteux et disponible = score élevé.",
                source: sources.mercato,
              },
            ].map((c) => (
              <div key={c.title} className="rounded-xl p-4" style={{ background: `${c.color}08`, border: `1px solid ${c.color}20` }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ color: c.color }}>{c.icon}</span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full"
                    style={{ background: `${c.color}20`, color: c.color }}>{c.weight}</span>
                </div>
                <p className="font-bold text-sm mb-1" style={{ color: "#e8edf5" }}>{c.title}</p>
                <p className="text-xs mb-2 leading-relaxed" style={{ color: "#6b7c96" }}>{c.desc}</p>
                <p className="text-xs italic" style={{ color: "#6b7c96" }}>Source : {c.source}</p>
              </div>
            ))}
          </div>

          {sources.market && (
            <div className="rounded-xl p-4" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
              <div className="flex items-center gap-2 mb-2">
                <BarChart2 size={15} style={{ color: "#a78bfa" }} />
                <p className="font-bold text-sm" style={{ color: "#a78bfa" }}>Cotes Paris Sportifs (+10%)</p>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#6b7c96" }}>
                Les cotes bookmakers (Betclic, Unibet, Winamax…) reflètent la confiance collective du marché.
                Un club favori (cotes basses = probabilité implicite haute) reçoit un bonus, un outsider reçoit une pénalité.
                <br /><span style={{ color: "#a78bfa" }}>Source : {sources.market}</span>
              </p>
            </div>
          )}

          <div className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "#6b7c96" }}>IMPACT SUR LES PRÉDICTIONS</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs text-center">
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
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color, boxShadow: `0 0 6px ${color}50` }} />
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
  const cfg: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    positive: { color: "#22c55e", icon: <TrendingUp size={9} />, label: "+" },
    negative: { color: "#ef4444", icon: <TrendingDown size={9} />, label: "−" },
    neutral:  { color: "#94a3b8", icon: <Minus size={9} />, label: "·" },
  };
  const { color, icon, label } = cfg[article.sentiment];
  return (
    <div className="flex items-start gap-2 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-black flex-shrink-0 mt-0.5"
        style={{ background: `${color}15`, color }}>{icon}{label}</span>
      <div className="min-w-0">
        <p className="text-xs leading-snug truncate" style={{ color: "#94a3b8" }}>{article.title}</p>
        <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>{article.source}</p>
      </div>
    </div>
  );
}

function PlayerRow({ player }: { player: PlayerSquad }) {
  const isInjured = player.status?.toLowerCase().includes("injury");
  const posColors: Record<string, string> = {
    Goalkeeper: "#f59e0b", Defender: "#3b82f6", Midfielder: "#22c55e",
    Winger: "#a78bfa", "Centre-Forward": "#ef4444",
  };
  const posLabels: Record<string, string> = {
    Goalkeeper: "Gardien", Defender: "Défenseur", Midfielder: "Milieu",
    Winger: "Ailier", "Centre-Forward": "Attaquant",
  };
  return (
    <div className="grid items-center px-3 py-2 hover:bg-white/[0.02] rounded-lg transition-colors"
      style={{ gridTemplateColumns: "1fr 90px 55px 90px" }}>
      <div className="flex items-center gap-2 min-w-0">
        {isInjured && <AlertTriangle size={11} className="text-orange-400 flex-shrink-0" />}
        <span className="text-sm truncate" style={{ color: isInjured ? "#f97316" : "#e8edf5" }}>{player.name}</span>
        {player.nationality?.[0] && (
          <span className="text-xs px-1 rounded flex-shrink-0 hidden sm:block"
            style={{ background: "rgba(255,255,255,0.06)", color: "#6b7c96" }}>
            {player.nationality[0].slice(0, 3).toUpperCase()}
          </span>
        )}
      </div>
      <span className="text-xs text-center px-1.5 py-0.5 rounded-full w-fit mx-auto"
        style={{ background: `${posColors[player.position] ?? "#6b7c96"}15`, color: posColors[player.position] ?? "#6b7c96", fontSize: "10px" }}>
        {posLabels[player.position] ?? player.position}
      </span>
      <span className="text-xs text-center" style={{ color: "#6b7c96" }}>{player.age} ans</span>
      <span className="text-sm text-right font-mono font-bold"
        style={{ color: player.marketValue > 20_000_000 ? "#00d4ff" : player.marketValue > 5_000_000 ? "#e8edf5" : "#6b7c96" }}>
        {player.marketValue > 0 ? formatValue(player.marketValue) : "—"}
      </span>
    </div>
  );
}

function ClubDetail({ club }: { club: ClubScore }) {
  const [squad, setSquad] = useState<SquadData | null>(null);
  const [loadingSquad, setLoadingSquad] = useState(false);
  const [showSquad, setShowSquad] = useState(false);
  const c = club.components;

  const loadSquad = () => {
    if (squad) { setShowSquad(!showSquad); return; }
    setLoadingSquad(true);
    fetch(`/api/squad/${club.teamId}`)
      .then((r) => r.json()).then(setSquad)
      .finally(() => { setLoadingSquad(false); setShowSquad(true); });
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Score breakdown */}
      <div className="space-y-3 px-1">
        <ComponentBar label="Économique" score={c.economic.score} icon={<Building2 size={12} />}
          detail={c.economic.owner} weight={c.economic.weight} />
        <ComponentBar label="Médias & Sentiment" score={c.media.score} icon={<Newspaper size={12} />}
          detail={c.media.total > 0 ? `${c.media.positive} positifs · ${c.media.negative} négatifs` : "en attente"}
          weight={c.media.weight} />
        <ComponentBar label="Humain & Mercato" score={c.human.score} icon={<Users size={12} />}
          detail={c.human.totalValue > 0 ? formatValue(c.human.totalValue) : "—"}
          weight={c.human.weight} />
        {c.market && (
          <ComponentBar label="Marché Paris Sportifs" score={c.market.score} icon={<BarChart2 size={12} />}
            detail={c.market.source} weight={c.market.weight} />
        )}
      </div>

      {/* Economic */}
      <div className="rounded-xl p-3 grid grid-cols-2 gap-3 text-xs"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <p style={{ color: "#6b7c96" }}>Propriétaire</p>
          <p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>{c.economic.owner}</p>
        </div>
        <div>
          <p style={{ color: "#6b7c96" }}>Revenus estimés</p>
          <p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>{c.economic.revenue}</p>
        </div>
        <div>
          <p style={{ color: "#6b7c96" }}>Stabilité financière</p>
          <p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>{c.economic.label}</p>
        </div>
        <div>
          <p style={{ color: "#6b7c96" }}>Score économique</p>
          <p className="font-semibold mt-0.5" style={{ color: emotionColor(c.economic.score).color }}>{c.economic.score}/100</p>
        </div>
      </div>

      {/* Mercato */}
      {c.human.totalValue > 0 && (
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs font-semibold mb-3" style={{ color: "#6b7c96" }}>EFFECTIF & MERCATO</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Valeur totale", value: formatValue(c.human.totalValue), color: "#00d4ff" },
              { label: "Valeur moyenne", value: formatValue(c.human.avgValue), color: "#e8edf5" },
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
              <span className="text-xs flex items-center gap-1" style={{ color: "#f97316" }}>
                <AlertTriangle size={10} /> Blessés :
              </span>
              {c.human.injuredPlayers.map((p) => (
                <span key={p} className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(249,115,22,0.1)", color: "#f97316" }}>{p}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Media sources breakdown */}
      {c.media.sourceBreakdown.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "#6b7c96" }}>SOURCES MÉDIAS</p>
          <div className="flex justify-between text-xs mb-1 px-1" style={{ color: "#6b7c96" }}>
            <span>Source</span><span>Articles</span><span>Positifs</span><span>Négatifs</span><span>Score</span>
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

      {/* Squad */}
      <button onClick={loadSquad}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
        style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)", color: "#00d4ff" }}>
        <Users size={14} />
        {loadingSquad ? "Chargement…" : showSquad ? "Masquer l'effectif" : "Effectif complet & cotes Transfermarkt"}
        {!loadingSquad && <ChevronDown size={14} className={`transition-transform ${showSquad ? "rotate-180" : ""}`} />}
      </button>

      {showSquad && squad && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1e2d42" }}>
          <div className="grid px-3 py-2 text-xs font-semibold uppercase tracking-widest"
            style={{ gridTemplateColumns: "1fr 90px 55px 90px", background: "#0d1421", color: "#6b7c96", borderBottom: "1px solid #1e2d42" }}>
            <span>Joueur</span><span className="text-center">Poste</span>
            <span className="text-center">Âge</span><span className="text-right">Valeur mercato</span>
          </div>
          <div className="px-1 py-1">
            {squad.squad.map((p) => <PlayerRow key={p.id} player={p} />)}
          </div>
          <div className="flex justify-between px-3 py-2 text-xs font-bold"
            style={{ borderTop: "1px solid #1e2d42", background: "#0d1421", color: "#6b7c96" }}>
            <span>{squad.stats.playerCount} joueurs</span>
            {squad.stats.injuredCount > 0 && (
              <span className="text-orange-400">{squad.stats.injuredCount} blessé{squad.stats.injuredCount > 1 ? "s" : ""}</span>
            )}
            <span style={{ color: "#00d4ff" }}>Total : {formatValue(squad.stats.totalValue)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ClubCard({ club }: { club: ClubScore }) {
  const [expanded, setExpanded] = useState(false);
  const { color, bg, border } = emotionColor(club.emotionalScore);

  return (
    <div className="rounded-2xl overflow-hidden animate-fade-in-up" style={{ background: "#0d1421", border: `1px solid ${border}` }}>
      <button className="w-full flex items-center gap-4 px-5 py-4 transition-all hover:bg-white/[0.02]"
        onClick={() => setExpanded(!expanded)}>
        <ScoreGauge score={club.emotionalScore} size={64} />

        {club.team.crest ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={club.team.crest} alt={club.team.shortName} className="w-9 h-9 object-contain flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded bg-white/5 flex-shrink-0 flex items-center justify-center text-xs font-black" style={{ color: "#6b7c96" }}>
            {club.team.tla?.slice(0, 2)}
          </div>
        )}

        <div className="flex-1 min-w-0 text-left">
          <p className="font-bold text-sm truncate" style={{ color: "#e8edf5" }}>{club.team.name}</p>
          <p className="text-xs mt-0.5 font-medium" style={{ color }}>{emotionLabel(club.emotionalScore)}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs" style={{ color: "#6b7c96" }}>{club.team.position}e au classement</span>
            {club.predictionDelta !== 0 && (
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: club.predictionDelta > 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                  color: club.predictionDelta > 0 ? "#22c55e" : "#ef4444",
                }}>
                <Zap size={9} />
                {club.predictionDelta > 0 ? "+" : ""}{club.predictionDelta}% prédiction
              </span>
            )}
          </div>
        </div>

        <div className="hidden sm:flex flex-col gap-2 items-end flex-shrink-0 mr-2">
          {[
            { label: "Éco", score: club.components.economic.score },
            { label: "Média", score: club.components.media.score },
            { label: "Humain", score: club.components.human.score },
          ].map((comp) => {
            const cc = emotionColor(comp.score);
            return (
              <div key={comp.label} className="flex items-center gap-2">
                <span className="text-xs w-10 text-right" style={{ color: "#6b7c96" }}>{comp.label}</span>
                <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${comp.score}%`, background: cc.color }} />
                </div>
                <span className="text-xs w-5" style={{ color: cc.color }}>{comp.score}</span>
              </div>
            );
          })}
        </div>

        <ChevronDown size={16} style={{ color: "#6b7c96", flexShrink: 0 }}
          className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <ClubDetail club={club} />
        </div>
      )}
    </div>
  );
}

export default function EmotionalScoreTab() {
  const [data, setData] = useState<EmotionalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "rank">("score");

  useEffect(() => {
    fetch("/api/emotional-score")
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const sorted = data?.scores.slice().sort((a, b) =>
    sortBy === "score" ? b.emotionalScore - a.emotionalScore : a.team.position - b.team.position
  ) ?? [];

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-center py-6">
          <Heart size={24} className="text-pink-400 mx-auto mb-3 animate-pulse" />
          <p className="text-sm font-medium" style={{ color: "#e8edf5" }}>Analyse en cours…</p>
          <p className="text-xs mt-1" style={{ color: "#6b7c96" }}>
            Collecte des données : RMC, Figaro, Google News, Transfermarkt
          </p>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "#0d1421", border: "1px solid #1e2d42" }} />
        ))}
      </div>
    );
  }

  if (error) return <div className="text-center py-16 text-red-400 text-sm">{error}</div>;

  return (
    <div>
      {/* Methodology */}
      {data && <Methodology sources={data.sources} />}

      {/* Header + sort */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "#e8edf5" }}>
            <Heart size={17} className="text-pink-400" /> Score Émotionnel — {sorted.length} clubs
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
            Cliquez un club pour voir le détail complet
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
          {[
            { id: "score", label: "Par score" },
            { id: "rank", label: "Par classement" },
          ].map((opt) => (
            <button key={opt.id} onClick={() => setSortBy(opt.id as "score" | "rank")}
              className="px-3 py-1 rounded text-xs font-medium transition-all"
              style={{
                background: sortBy === opt.id ? "rgba(255,255,255,0.06)" : "transparent",
                color: sortBy === opt.id ? "#e8edf5" : "#6b7c96",
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
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
        {sorted.map((club, i) => (
          <div key={club.teamId} style={{ animationDelay: `${i * 35}ms` }}>
            <ClubCard club={club} />
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
