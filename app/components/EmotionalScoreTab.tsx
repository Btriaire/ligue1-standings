"use client";

import { useEffect, useState } from "react";
import { Heart, TrendingUp, TrendingDown, Minus, Users, Newspaper, Building2, ChevronDown, AlertTriangle, Star, Zap } from "lucide-react";

interface Article { title: string; pubDate: string; source: string; sentiment: "positive" | "negative" | "neutral" }

interface ClubScore {
  teamId: number;
  team: { id: number; name: string; shortName: string; tla: string; crest: string; position: number };
  emotionalScore: number;
  predictionDelta: number;
  components: {
    economic: { score: number; label: string; revenue: string; owner: string };
    media: { score: number; positive: number; negative: number; total: number; articles: Article[] };
    human: { score: number; totalValue: number; avgValue: number; injuryRate: number; topPlayer: string | null; playerCount: number };
  };
}

interface PlayerSquad {
  id: string;
  name: string;
  position: string;
  age: number;
  nationality: string[];
  marketValue: number;
  status?: string;
  foot?: string;
  height?: number;
  contract?: string;
}

interface SquadData {
  team: { name: string; crest: string; venue: string; founded: number; coach: string };
  squad: PlayerSquad[];
  stats: { totalValue: number; avgValue: number; playerCount: number; injuredCount: number; injuryRate: number; injured: { name: string; status: string }[] };
}

function emotionColor(score: number) {
  if (score >= 70) return { color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)" };
  if (score >= 55) return { color: "#00d4ff", bg: "rgba(0,212,255,0.1)", border: "rgba(0,212,255,0.25)" };
  if (score >= 40) return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" };
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

function ScoreGauge({ score, size = 56 }: { score: number; size?: number }) {
  const { color } = emotionColor(score);
  const r = size * 0.4;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const filled = (arc * score) / 100;
  const offset = circ * 0.125;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)"
        strokeWidth={size * 0.09} strokeDasharray={`${arc} ${circ - arc}`}
        strokeDashoffset={-offset} strokeLinecap="round" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={size * 0.09} strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={-offset} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}60)`, transition: "stroke-dasharray 0.8s ease" }} />
      <text x={size / 2} y={size / 2 + size * 0.06} textAnchor="middle"
        fontSize={size * 0.22} fontWeight="900" fill={color}>{score}</text>
    </svg>
  );
}

function ComponentBar({ label, score, icon, detail }: { label: string; score: number; icon: React.ReactNode; detail?: string }) {
  const { color } = emotionColor(score);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "#94a3b8" }}>
          <span style={{ color }}>{icon}</span>
          {label}
          {detail && <span className="opacity-60 hidden sm:inline">· {detail}</span>}
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

function ArticleItem({ article }: { article: Article }) {
  const colors = { positive: "#22c55e", negative: "#ef4444", neutral: "#94a3b8" };
  const labels = { positive: "Positif", negative: "Négatif", neutral: "Neutre" };
  const icons = { positive: <TrendingUp size={10} />, negative: <TrendingDown size={10} />, neutral: <Minus size={10} /> };
  return (
    <div className="flex items-start gap-2 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 mt-0.5"
        style={{ background: `${colors[article.sentiment]}15`, color: colors[article.sentiment] }}>
        {icons[article.sentiment]}{labels[article.sentiment]}
      </span>
      <p className="text-xs leading-snug" style={{ color: "#94a3b8" }}>{article.title}</p>
    </div>
  );
}

function PlayerRow({ player }: { player: PlayerSquad }) {
  const isInjured = player.status?.toLowerCase().includes("injury");
  const posColors: Record<string, string> = {
    Goalkeeper: "#f59e0b", Defender: "#3b82f6", Midfielder: "#22c55e",
    Winger: "#a78bfa", "Centre-Forward": "#ef4444",
  };
  return (
    <div className="grid items-center px-3 py-2.5 transition-colors rounded-lg hover:bg-white/[0.02]"
      style={{ gridTemplateColumns: "1fr 90px 70px 60px 90px" }}>
      <div className="flex items-center gap-2 min-w-0">
        {isInjured && <AlertTriangle size={12} className="text-orange-400 flex-shrink-0" />}
        <span className="text-sm truncate" style={{ color: isInjured ? "#f97316" : "#e8edf5" }}>{player.name}</span>
        {player.nationality?.[0] && (
          <span className="text-xs px-1.5 rounded flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: "#6b7c96" }}>
            {player.nationality[0].slice(0, 3).toUpperCase()}
          </span>
        )}
      </div>
      <span className="text-xs text-center px-2 py-0.5 rounded-full w-fit mx-auto"
        style={{ background: `${posColors[player.position] ?? "#6b7c96"}15`, color: posColors[player.position] ?? "#6b7c96" }}>
        {player.position === "Centre-Forward" ? "Attaquant" :
          player.position === "Goalkeeper" ? "Gardien" :
          player.position === "Midfielder" ? "Milieu" :
          player.position === "Defender" ? "Défenseur" :
          player.position === "Winger" ? "Ailier" : player.position}
      </span>
      <span className="text-xs text-center" style={{ color: "#6b7c96" }}>{player.age} ans</span>
      <span className="text-xs text-center font-mono" style={{ color: "#6b7c96" }}>{player.foot ?? "—"}</span>
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

  const loadSquad = () => {
    if (squad) { setShowSquad(!showSquad); return; }
    setLoadingSquad(true);
    fetch(`/api/squad/${club.teamId}`)
      .then((r) => r.json())
      .then(setSquad)
      .finally(() => { setLoadingSquad(false); setShowSquad(true); });
  };

  const { components: c } = club;

  return (
    <div className="mt-4 space-y-4">
      {/* Score bars */}
      <div className="space-y-3 px-1">
        <ComponentBar label="Environnement Économique" score={c.economic.score} icon={<Building2 size={12} />} detail={c.economic.owner} />
        <ComponentBar label="Environnement Médias" score={c.media.score} icon={<Newspaper size={12} />}
          detail={c.media.total > 0 ? `${c.media.positive}✓ ${c.media.negative}✗ sur ${c.media.total + 2} articles` : "en attente"} />
        <ComponentBar label="Environnement Humain" score={c.human.score} icon={<Users size={12} />}
          detail={c.human.totalValue > 0 ? `${formatValue(c.human.totalValue)} effectif` : "—"} />
      </div>

      {/* Economic detail */}
      <div className="rounded-xl p-3 grid grid-cols-2 gap-2 text-xs" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div><span style={{ color: "#6b7c96" }}>Propriétaire</span><p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>{c.economic.owner}</p></div>
        <div><span style={{ color: "#6b7c96" }}>Revenus estimés</span><p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>{c.economic.revenue}</p></div>
      </div>

      {/* Mercato summary */}
      {c.human.totalValue > 0 && (
        <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="text-center">
              <p className="text-base font-black" style={{ color: "#00d4ff" }}>{formatValue(c.human.totalValue)}</p>
              <p style={{ color: "#6b7c96" }}>Valeur totale</p>
            </div>
            <div className="text-center">
              <p className="text-base font-black" style={{ color: "#e8edf5" }}>{formatValue(c.human.avgValue)}</p>
              <p style={{ color: "#6b7c96" }}>Valeur moy.</p>
            </div>
            <div className="text-center">
              <p className="text-base font-black" style={{ color: c.human.injuryRate > 15 ? "#ef4444" : "#e8edf5" }}>
                {c.human.injuryRate}%
              </p>
              <p style={{ color: "#6b7c96" }}>Blessés</p>
            </div>
          </div>
          {c.human.topPlayer && (
            <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <Star size={12} style={{ color: "#f59e0b" }} />
              <span style={{ color: "#6b7c96" }}>Star : </span>
              <span className="font-semibold" style={{ color: "#e8edf5" }}>{c.human.topPlayer}</span>
            </div>
          )}
        </div>
      )}

      {/* Media articles */}
      {c.media.articles.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "#6b7c96" }}>DERNIÈRES ACTUALITÉS</p>
          {c.media.articles.slice(0, 5).map((a, i) => <ArticleItem key={i} article={a} />)}
        </div>
      )}

      {/* Squad toggle */}
      <button
        onClick={loadSquad}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
        style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)", color: "#00d4ff" }}
      >
        <Users size={14} />
        {loadingSquad ? "Chargement effectif…" : showSquad ? "Masquer l'effectif" : "Voir effectif complet & cotes mercato"}
        {!loadingSquad && <ChevronDown size={14} className={`transition-transform ${showSquad ? "rotate-180" : ""}`} />}
      </button>

      {/* Squad table */}
      {showSquad && squad && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1e2d42" }}>
          <div className="grid px-3 py-2 text-xs font-semibold uppercase tracking-widest"
            style={{ gridTemplateColumns: "1fr 90px 70px 60px 90px", background: "#0d1421", color: "#6b7c96", borderBottom: "1px solid #1e2d42" }}>
            <span>Joueur</span>
            <span className="text-center">Poste</span>
            <span className="text-center">Âge</span>
            <span className="text-center">Pied</span>
            <span className="text-right">Valeur</span>
          </div>
          {squad.squad.map((p) => <PlayerRow key={p.id} player={p} />)}
          <div className="flex justify-between px-3 py-2 text-xs font-bold"
            style={{ borderTop: "1px solid #1e2d42", background: "#0d1421", color: "#6b7c96" }}>
            <span>{squad.stats.playerCount} joueurs</span>
            {squad.stats.injuredCount > 0 && (
              <span className="text-orange-400">{squad.stats.injuredCount} blessé{squad.stats.injuredCount > 1 ? "s" : ""}</span>
            )}
            <span style={{ color: "#00d4ff" }}>Total: {formatValue(squad.stats.totalValue)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ClubCard({ club }: { club: ClubScore }) {
  const [expanded, setExpanded] = useState(false);
  const { color, bg, border } = emotionColor(club.emotionalScore);
  const label = emotionLabel(club.emotionalScore);

  return (
    <div className="rounded-2xl overflow-hidden transition-all animate-fade-in-up"
      style={{ background: "#0d1421", border: `1px solid ${border}` }}>
      <button
        className="w-full flex items-center gap-4 px-5 py-4 transition-all hover:bg-white/[0.02]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-shrink-0 text-center" style={{ minWidth: "56px" }}>
          <ScoreGauge score={club.emotionalScore} size={56} />
          <p className="text-xs font-bold mt-0.5" style={{ color }}>{label}</p>
        </div>

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
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs" style={{ color: "#6b7c96" }}>{club.team.position}e</span>
            {club.predictionDelta !== 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: club.predictionDelta > 0 ? "#22c55e" : "#ef4444" }}>
                <Zap size={10} />
                {club.predictionDelta > 0 ? `+${club.predictionDelta}` : club.predictionDelta}% prédiction
              </span>
            )}
          </div>
        </div>

        {/* Mini component dots */}
        <div className="hidden sm:flex flex-col gap-1.5 items-end flex-shrink-0">
          {[
            { label: "Eco", score: club.components.economic.score },
            { label: "Media", score: club.components.media.score },
            { label: "Humain", score: club.components.human.score },
          ].map((c) => {
            const cc = emotionColor(c.score);
            return (
              <div key={c.label} className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: "#6b7c96" }}>{c.label}</span>
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: cc.color }} />
                </div>
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
  const [data, setData] = useState<{ scores: ClubScore[]; updatedAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/emotional-score")
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const sorted = data?.scores.slice().sort((a, b) => b.emotionalScore - a.emotionalScore) ?? [];

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-2 text-sm" style={{ color: "#6b7c96" }}>
            <Heart size={16} className="text-pink-400 animate-pulse" />
            Analyse des données en cours (médias, mercato, économique)…
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "#0d1421", border: "1px solid #1e2d42" }} />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-16 text-red-400 text-sm">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "#e8edf5" }}>
            <Heart size={18} className="text-pink-400" />
            Score Émotionnel des Clubs
          </h2>
          <p className="text-xs mt-1" style={{ color: "#6b7c96" }}>
            Économique (30%) · Médias Google News (35%) · Humain/Mercato Transfermarkt (35%)
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", color: "#f472b6" }}>
          <Heart size={11} />
          Correction prédictive active
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
            <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {sorted.map((club, i) => (
          <div key={club.teamId} style={{ animationDelay: `${i * 40}ms` }}>
            <ClubCard club={club} />
          </div>
        ))}
      </div>

      {data?.updatedAt && (
        <p className="mt-6 text-xs text-center" style={{ color: "#6b7c96" }}>
          Dernière mise à jour : {new Date(data.updatedAt).toLocaleTimeString("fr-FR")}
        </p>
      )}
    </div>
  );
}
