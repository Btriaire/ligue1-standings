"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Users, AlertTriangle, Trophy, TrendingUp,
  ArrowLeftRight, Star, Building2, Calendar, Heart,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SquadPlayer {
  id: string;
  name: string;
  position: string;
  age: number;
  nationality: string[];
  marketValue: number;
  status?: string;
  formBadge?: "hot" | "good" | "neutral" | "cold";
  recentGoals?: number;
  recentAssists?: number;
}

interface SquadData {
  team: {
    id: number;
    name: string;
    shortName: string;
    crest: string;
    venue: string;
    founded: number;
    coach: string | null;
  };
  squad: SquadPlayer[];
  stats: {
    totalValue: number;
    avgValue: number;
    playerCount: number;
    injuredCount: number;
    injuryRate: number;
    injured: { name: string; status?: string }[];
  };
}

interface MatchInfo {
  id: number;
  date: string;
  matchday: number;
  status: string;
  homeTeam: { id: number; name: string; crest: string };
  awayTeam: { id: number; name: string; crest: string };
  score: { home: number | null; away: number | null };
}

interface TeamMatches {
  recent: MatchInfo[];
  upcoming: MatchInfo[];
}

interface TransferItem {
  title: string;
  pubDate: string;
  source: string;
  url: string;
  type: "arrival" | "departure" | "rumor" | "news";
}

interface BuzzItem {
  title: string;
  pubDate: string;
  source: string;
  url: string;
  sentiment: "positive" | "negative" | "neutral";
}

interface EmotionalEntry {
  teamId: number;
  emotionalScore: number;
  components: {
    economic: { score: number; label: string; revenue: string; owner: string };
    media: { score: number; positive: number; negative: number; total: number };
    human: { score: number; totalValue: number; injuryRate: number };
    fan?: { score: number };
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatValue(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}Md€`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M€`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K€`;
  return `${v}€`;
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }); }
  catch { return ""; }
}

function emotionColor(score: number) {
  if (score >= 70) return "#22c55e";
  if (score >= 55) return "#00d4ff";
  if (score >= 40) return "#f59e0b";
  if (score >= 28) return "#f97316";
  return "#ef4444";
}

const POS_LABELS: Record<string, string> = {
  Goalkeeper: "G", Defender: "D", Midfielder: "M", Winger: "A", "Centre-Forward": "BU",
};
const POS_COLORS: Record<string, string> = {
  Goalkeeper: "#f59e0b", Defender: "#3b82f6", Midfielder: "#22c55e",
  Winger: "#a78bfa", "Centre-Forward": "#ef4444",
};
const POS_LABELS_FR: Record<string, string> = {
  Goalkeeper: "Gardiens", Defender: "Défenseurs", Midfielder: "Milieux",
  Winger: "Ailiers", "Centre-Forward": "Attaquants",
};
const POS_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Winger", "Centre-Forward"];

const TRANSFER_CFG = {
  arrival:   { color: "#22c55e", label: "Arrivée",  emoji: "🟢" },
  departure: { color: "#ef4444", label: "Départ",   emoji: "🔴" },
  rumor:     { color: "#f59e0b", label: "Rumeur",   emoji: "🟡" },
  news:      { color: "#94a3b8", label: "Actu",     emoji: "⚪" },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children, accent = "#00d4ff" }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string;
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42", background: "#0d1421" }}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid #1e2d42" }}>
        <span style={{ color: accent }}>{icon}</span>
        <h2 className="font-bold text-sm" style={{ color: "#e8edf5" }}>{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function FormBadge({ result }: { result: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    W: { bg: "rgba(34,197,94,0.15)",  color: "#22c55e", label: "V" },
    D: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", label: "N" },
    L: { bg: "rgba(239,68,68,0.15)",  color: "#ef4444", label: "D" },
  };
  const cfg = map[result] ?? { bg: "rgba(255,255,255,0.06)", color: "#6b7c96", label: result };
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
      {cfg.label}
    </span>
  );
}

function MatchCard({ match, teamId }: { match: MatchInfo; teamId: number }) {
  const isHome = match.homeTeam.id === teamId;
  const teamScore = isHome ? match.score.home : match.score.away;
  const oppScore = isHome ? match.score.away : match.score.home;
  const opponent = isHome ? match.awayTeam : match.homeTeam;
  let resultColor = "#6b7c96";
  let resultLabel = "";
  if (teamScore !== null && oppScore !== null) {
    if (teamScore > oppScore) { resultColor = "#22c55e"; resultLabel = "V"; }
    else if (teamScore < oppScore) { resultColor = "#ef4444"; resultLabel = "D"; }
    else { resultColor = "#f59e0b"; resultLabel = "N"; }
  }
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0 font-mono"
        style={{ background: "rgba(255,255,255,0.06)", color: "#6b7c96" }}>
        J{match.matchday}
      </span>
      <span className="text-xs flex-shrink-0 px-1.5 py-0.5 rounded"
        style={{ background: isHome ? "rgba(0,212,255,0.08)" : "rgba(255,255,255,0.04)", color: isHome ? "#00d4ff" : "#6b7c96" }}>
        {isHome ? "Dom" : "Ext"}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={opponent.crest} alt={opponent.name} className="w-5 h-5 object-contain flex-shrink-0" loading="lazy" />
      <span className="text-sm flex-1 truncate" style={{ color: "#e8edf5" }}>{opponent.name}</span>
      {teamScore !== null && oppScore !== null ? (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="font-black text-sm" style={{ color: resultColor }}>{teamScore}–{oppScore}</span>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${resultColor}15`, color: resultColor }}>{resultLabel}</span>
        </div>
      ) : (
        <span className="text-xs flex-shrink-0" style={{ color: "#6b7c96" }}>{formatDate(match.date)}</span>
      )}
    </div>
  );
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs" style={{ color: "#94a3b8" }}>{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{score}/100</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ClubPage() {
  const params = useParams();
  const id = params?.id as string;
  const teamId = parseInt(id ?? "0");

  const [squad, setSquad] = useState<SquadData | null>(null);
  const [matches, setMatches] = useState<TeamMatches | null>(null);
  const [transfers, setTransfers] = useState<TransferItem[] | null>(null);
  const [buzz, setBuzz] = useState<{ items: BuzzItem[]; score: number; positive: number; negative: number } | null>(null);
  const [emotional, setEmotional] = useState<EmotionalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBuzz, setLoadingBuzz] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/squad/${teamId}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/team/${teamId}`).then((r) => r.json()).catch(() => null),
      fetch("/api/transfers").then((r) => r.json()).catch(() => null),
      fetch("/api/emotional-score").then((r) => r.json()).catch(() => null),
    ]).then(([squadData, matchData, transferData, emotionalData]) => {
      setSquad(squadData?.team ? squadData : null);
      setMatches(matchData?.recent ? matchData : null);
      if (transferData?.clubs) {
        const club = transferData.clubs.find((c: { teamId: number; items: TransferItem[] }) => c.teamId === teamId);
        setTransfers(club?.items ?? []);
      }
      if (emotionalData?.scores) {
        const entry = emotionalData.scores.find((s: EmotionalEntry) => s.teamId === teamId);
        setEmotional(entry ?? null);
      }
    }).finally(() => setLoading(false));
  }, [teamId]);

  const loadBuzz = () => {
    setLoadingBuzz(true);
    fetch(`/api/fan-buzz?teamId=${teamId}`)
      .then((r) => r.json())
      .then((d) => setBuzz({ items: d.items ?? [], score: d.score, positive: d.positive, negative: d.negative }))
      .catch(() => null)
      .finally(() => setLoadingBuzz(false));
  };

  if (loading) {
    return (
      <main className="min-h-screen" style={{ background: "#080c14" }}>
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl animate-pulse"
              style={{ background: "#0d1421", border: "1px solid #1e2d42" }} />
          ))}
        </div>
      </main>
    );
  }

  if (!squad) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#080c14" }}>
        <div className="text-center px-4">
          <p className="text-red-400 mb-4 font-semibold">Données indisponibles pour ce club.</p>
          <Link href="/" className="text-sm hover:opacity-70 transition-opacity" style={{ color: "#00d4ff" }}>
            ← Retour à Foot Predictom
          </Link>
        </div>
      </main>
    );
  }

  const team = squad.team;

  // Derive form from recent matches
  const recentForm = matches?.recent
    ?.map((m) => {
      const isHome = m.homeTeam.id === teamId;
      const ts = isHome ? m.score.home : m.score.away;
      const os = isHome ? m.score.away : m.score.home;
      if (ts === null || os === null) return null;
      return ts > os ? "W" : ts < os ? "L" : "D";
    })
    .filter((r): r is "W" | "D" | "L" => r !== null) ?? [];

  // Points from last 5
  const pts5 = recentForm.reduce((s, r) => s + (r === "W" ? 3 : r === "D" ? 1 : 0), 0);
  const maxPts = recentForm.length * 3;
  const formPct = maxPts > 0 ? Math.round((pts5 / maxPts) * 100) : 50;

  // Group squad by position
  const byPosition = POS_ORDER.reduce<Record<string, SquadPlayer[]>>((acc, pos) => {
    const players = squad.squad.filter((p) => p.position === pos);
    if (players.length > 0) acc[pos] = players;
    return acc;
  }, {});

  return (
    <main className="min-h-screen" style={{ background: "#080c14" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b"
        style={{ borderColor: "#1e2d42", background: "rgba(8,12,20,0.92)" }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/"
            className="flex items-center gap-1.5 text-sm transition-all hover:opacity-70 flex-shrink-0"
            style={{ color: "#6b7c96" }}>
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Retour</span>
          </Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={team.crest} alt={team.shortName} className="w-8 h-8 object-contain flex-shrink-0" />
          <h1 className="font-black text-base truncate" style={{ color: "#e8edf5" }}>{team.name}</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* Hero card */}
        <div className="rounded-2xl p-5"
          style={{ border: "1px solid #1e2d42", background: "linear-gradient(135deg, rgba(0,212,255,0.04), rgba(124,58,237,0.04))" }}>
          <div className="flex items-start gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={team.crest} alt={team.name} className="w-20 h-20 object-contain flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black" style={{ color: "#e8edf5" }}>{team.name}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs" style={{ color: "#6b7c96" }}>
                {team.venue && <span className="flex items-center gap-1"><Building2 size={11} />{team.venue}</span>}
                {team.founded && <span className="flex items-center gap-1"><Calendar size={11} />Fondé en {team.founded}</span>}
                {team.coach && <span className="flex items-center gap-1"><Users size={11} />{team.coach}</span>}
              </div>
              {/* Form */}
              {recentForm.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3">
                  <span className="text-xs" style={{ color: "#6b7c96" }}>Dernière forme :</span>
                  {recentForm.map((r, i) => <FormBadge key={i} result={r} />)}
                  <span className="text-xs font-bold ml-1"
                    style={{ color: formPct >= 60 ? "#22c55e" : formPct >= 40 ? "#f59e0b" : "#ef4444" }}>
                    {pts5}/{maxPts} pts
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: "Valeur effectif", value: squad.stats.totalValue > 0 ? formatValue(squad.stats.totalValue) : "—", color: "#00d4ff", icon: <Star size={13} /> },
              { label: "Valeur moy.", value: squad.stats.avgValue > 0 ? formatValue(squad.stats.avgValue) : "—", color: "#e8edf5", icon: <TrendingUp size={13} /> },
              {
                label: "Blessés",
                value: `${squad.stats.injuredCount}`,
                color: squad.stats.injuredCount > 3 ? "#ef4444" : squad.stats.injuredCount > 0 ? "#f59e0b" : "#22c55e",
                icon: <AlertTriangle size={13} />,
              },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
                <p className="font-black text-lg" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Emotional Score */}
        {emotional && (
          <SectionCard title="Score Émotionnel" icon={<Heart size={15} />} accent="#f472b6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl flex-shrink-0"
                style={{ background: `${emotionColor(emotional.emotionalScore)}15`, color: emotionColor(emotional.emotionalScore), border: `2px solid ${emotionColor(emotional.emotionalScore)}30` }}>
                {emotional.emotionalScore}
              </div>
              <div className="flex-1 space-y-2">
                <ScoreBar label="Économique" score={emotional.components.economic.score} color="#f59e0b" />
                <ScoreBar label="Médias" score={emotional.components.media.score} color="#00d4ff" />
                <ScoreBar label="Humain" score={emotional.components.human.score} color="#22c55e" />
                {emotional.components.fan && (
                  <ScoreBar label="Supporters" score={emotional.components.fan.score} color="#f472b6" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ color: "#6b7c96" }}>Propriétaire</p>
                <p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>{emotional.components.economic.owner}</p>
              </div>
              <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ color: "#6b7c96" }}>Revenus estimés</p>
                <p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>{emotional.components.economic.revenue}</p>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Recent matches */}
        {matches?.recent && matches.recent.length > 0 && (
          <SectionCard title="Derniers résultats" icon={<Trophy size={15} />} accent="#f59e0b">
            <div className="space-y-2">
              {matches.recent.map((m) => <MatchCard key={m.id} match={m} teamId={teamId} />)}
            </div>
          </SectionCard>
        )}

        {/* Upcoming */}
        {matches?.upcoming && matches.upcoming.length > 0 && (
          <SectionCard title="Prochains matchs" icon={<Calendar size={15} />} accent="#a78bfa">
            <div className="space-y-2">
              {matches.upcoming.map((m) => <MatchCard key={m.id} match={m} teamId={teamId} />)}
            </div>
          </SectionCard>
        )}

        {/* Squad */}
        <SectionCard title={`Effectif — ${squad.stats.playerCount} joueurs`} icon={<Users size={15} />}>
          {squad.stats.injuredCount > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="flex items-center gap-1 text-xs" style={{ color: "#f97316" }}>
                <AlertTriangle size={11} />Blessés :
              </span>
              {squad.stats.injured.map((p) => (
                <span key={p.name} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(249,115,22,0.1)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)" }}>
                  {p.name}
                </span>
              ))}
            </div>
          )}
          <div className="space-y-5">
            {Object.entries(byPosition).map(([pos, players]) => (
              <div key={pos}>
                <p className="text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: POS_COLORS[pos] ?? "#6b7c96" }}>
                  {POS_LABELS_FR[pos] ?? pos}
                </p>
                <div className="space-y-0.5">
                  {players.map((p) => {
                    const isInjured = p.status?.toLowerCase().includes("injury");
                    const fb = p.formBadge;
                    const fbColor: Record<string, string> = { hot: "#ef4444", good: "#22c55e", neutral: "#6b7c96", cold: "#94a3b8" };
                    const fbEmoji: Record<string, string> = { hot: "🔥", good: "⚡", neutral: "", cold: "❄️" };
                    return (
                      <div key={p.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/[0.02] transition-colors"
                        style={{ background: isInjured ? "rgba(249,115,22,0.03)" : "transparent" }}>
                        <span className="text-xs font-bold w-5 text-center flex-shrink-0 rounded"
                          style={{ background: `${POS_COLORS[pos] ?? "#6b7c96"}15`, color: POS_COLORS[pos] ?? "#6b7c96", fontSize: "9px", padding: "1px 2px" }}>
                          {POS_LABELS[pos] ?? "?"}
                        </span>
                        {isInjured && <AlertTriangle size={10} className="text-orange-400 flex-shrink-0" />}
                        <span className="flex-1 text-sm truncate" style={{ color: isInjured ? "#f97316" : "#e8edf5" }}>
                          {p.name}
                        </span>
                        {p.nationality?.[0] && (
                          <span className="text-xs hidden sm:block flex-shrink-0" style={{ color: "#6b7c96" }}>
                            {p.nationality[0].slice(0, 3).toUpperCase()}
                          </span>
                        )}
                        <span className="text-xs flex-shrink-0" style={{ color: "#6b7c96" }}>{p.age}a</span>
                        {fb && fb !== "neutral" && (
                          <span className="text-xs flex-shrink-0" title={`Forme: ${fb}`}
                            style={{ color: fbColor[fb] }}>
                            {fbEmoji[fb]}
                          </span>
                        )}
                        {(p.recentGoals ?? 0) > 0 && (
                          <span className="text-xs flex-shrink-0" style={{ color: "#f59e0b" }}>⚽{p.recentGoals}</span>
                        )}
                        {(p.recentAssists ?? 0) > 0 && (
                          <span className="text-xs flex-shrink-0" style={{ color: "#00d4ff" }}>🅰{p.recentAssists}</span>
                        )}
                        <span className="text-xs text-right font-mono font-bold flex-shrink-0 w-14"
                          style={{ color: p.marketValue > 20_000_000 ? "#00d4ff" : p.marketValue > 5_000_000 ? "#e8edf5" : "#6b7c96" }}>
                          {p.marketValue > 0 ? formatValue(p.marketValue) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Transfers */}
        {transfers && transfers.length > 0 && (
          <SectionCard title="Mercato & Transferts" icon={<ArrowLeftRight size={15} />} accent="#f59e0b">
            <div className="space-y-2">
              {transfers.map((item, i) => {
                const cfg = TRANSFER_CFG[item.type];
                return (
                  <a key={i} href={item.url || "#"} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-2.5 py-2 px-3 rounded-xl hover:brightness-125 transition-all group"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
                      style={{ color: cfg.color, background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>
                      {cfg.emoji} {cfg.label}
                    </span>
                    <p className="flex-1 text-xs leading-relaxed" style={{ color: "#cbd5e1" }}>{item.title}</p>
                    <span className="text-[9px] flex-shrink-0 mt-0.5" style={{ color: "#6b7c96" }}>{item.source}</span>
                  </a>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* Fan Buzz */}
        <SectionCard title="Buzz Supporters" icon={<Heart size={15} />} accent="#f472b6">
          {!buzz && !loadingBuzz && (
            <div className="text-center py-4">
              <p className="text-xs mb-3" style={{ color: "#6b7c96" }}>
                Analyse des articles Google News et L&apos;Équipe relatifs aux supporters
              </p>
              <button onClick={loadBuzz}
                className="px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition-all"
                style={{ background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.25)", color: "#f472b6" }}>
                Charger le buzz supporters
              </button>
            </div>
          )}
          {loadingBuzz && (
            <div className="text-center py-4">
              <div className="w-6 h-6 rounded-full border-2 border-pink-400 border-t-transparent animate-spin mx-auto mb-2" />
              <p className="text-xs" style={{ color: "#6b7c96" }}>Analyse en cours…</p>
            </div>
          )}
          {buzz && (
            <div>
              <div className="flex items-center gap-3 mb-3 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-2xl font-black" style={{ color: emotionColor(buzz.score) }}>{buzz.score}</div>
                <div className="text-xs" style={{ color: "#6b7c96" }}>
                  <div><span style={{ color: "#22c55e" }}>↑ {buzz.positive}</span> positifs</div>
                  <div><span style={{ color: "#ef4444" }}>↓ {buzz.negative}</span> négatifs</div>
                </div>
              </div>
              <div className="space-y-1.5">
                {buzz.items.slice(0, 10).map((item, i) => {
                  const sentColor = item.sentiment === "positive" ? "#22c55e" : item.sentiment === "negative" ? "#ef4444" : "#94a3b8";
                  return (
                    <div key={i} className="flex items-start gap-2 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: sentColor }} />
                      <p className="text-xs leading-relaxed flex-1" style={{ color: "#94a3b8" }}>{item.title}</p>
                      <span className="text-[9px] flex-shrink-0" style={{ color: "#6b7c96" }}>{item.source}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Back */}
        <div className="text-center pt-2 pb-8">
          <Link href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff" }}>
            <ArrowLeft size={14} />
            Retour à Foot Predictom
          </Link>
        </div>
      </div>
    </main>
  );
}
