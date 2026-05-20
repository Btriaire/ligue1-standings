"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Minus, Clock, Target, DownloadSimple, Trophy, Globe, Calendar } from "@phosphor-icons/react";
import { loadPredictions, downloadCSV, SavedPrediction } from "@/app/lib/predictions-store";
import LoadingBar from "./LoadingBar";

// ── Standings + prediction logic (mirrored from club page) ────────────────────
interface StandingEntry {
  position: number;
  team: { id: number; name: string; shortName: string; tla: string; crest: string };
  points: number; goalsFor: number; goalsAgainst: number;
  won: number; draw: number; lost: number; playedGames: number;
}

// Results come from ESPN, standings from football-data.org → different team IDs.
// Match by normalised name instead.
function normTeam(s: string) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fc|sc|rc|as|og?c|olympique|stade|sporting|athletic|club|de|le|la|les|du|st)\b/g, "")
    .replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
}

function findStanding(name: string, shortName: string, standings: StandingEntry[]): StandingEntry | undefined {
  const n  = normTeam(name);
  const sn = normTeam(shortName);
  return standings.find(s => {
    const tn  = normTeam(s.team.name);
    const tsn = normTeam(s.team.shortName);
    return tn === n || tn === sn || tsn === n || tsn === sn ||
           tn.includes(n) || n.includes(tn) ||
           tsn.includes(sn) || sn.includes(tsn);
  });
}

function teamStrength(s: StandingEntry): number {
  const gd  = (s.goalsFor - s.goalsAgainst) / Math.max(1, s.playedGames);
  const ppg  = s.points / Math.max(1, s.playedGames);
  const posF = (18 - s.position) / 17;
  return ppg * 0.5 + gd * 0.3 + posF * 0.2;
}

function computePrediction(homeS: StandingEntry, awayS: StandingEntry) {
  const hs = Math.min(1, Math.max(0, teamStrength(homeS) + 0.08));
  const as_ = Math.min(1, Math.max(0, teamStrength(awayS)));
  const total = hs + as_ + 0.001;
  const rh = hs / total, ra = as_ / total;
  const df = Math.max(0.12, 0.32 - Math.abs(rh - ra) * 0.6);
  let hP = rh * (1 - df), aP = ra * (1 - df), dP = df;
  const sum = hP + aP + dP;
  hP = Math.round(hP / sum * 100); aP = Math.round(aP / sum * 100); dP = 100 - hP - aP;
  const winner: "home" | "away" | "draw" = hP > aP && hP > dP ? "home" : aP > hP && aP > dP ? "away" : "draw";
  return { homeProb: hP, drawProb: dP, awayProb: aP, winner };
}

interface GoalEntry {
  minute: number | null;
  scorer: string | null;
  assist: string | null;
  type: string;
}

interface CardEntry {
  minute: number | null;
  player: string | null;
  card: "YELLOW_CARD" | "RED_CARD";
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
  homeCards?: CardEntry[];
  awayCards?: CardEntry[];
}

interface ResultsData { matches: ResultMatch[]; count: number }

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function GoalList({ goals }: { goals: GoalEntry[] }) {
  if (goals.length === 0) return null;
  return (
    <div className="space-y-0.5">
      {goals.map((g, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: "#94a3b8" }}>
          <span className="w-7 text-right flex-shrink-0 font-mono text-[10px]"
            style={{ color: "#6b7c96" }}>{g.minute != null ? `${g.minute}'` : "—"}</span>
          <span className="flex-shrink-0">
            {g.type === "OWN_GOAL" ? "🥅" : g.type === "PENALTY" ? "⚽ (P)" : "⚽"}
          </span>
          <span className="truncate" style={{ color: "#e8edf5" }}>{g.scorer ?? "?"}</span>
          {g.assist && (
            <span className="text-[10px] flex-shrink-0" style={{ color: "#6b7c96" }}>({g.assist})</span>
          )}
          {g.type === "OWN_GOAL" && (
            <span className="text-[10px] flex-shrink-0" style={{ color: "#f97316" }}>c.s.c.</span>
          )}
        </div>
      ))}
    </div>
  );
}

function CardList({ cards }: { cards: CardEntry[] }) {
  if (cards.length === 0) return null;
  return (
    <div className="space-y-0.5 mt-1.5">
      {cards.map((c, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: "#94a3b8" }}>
          <span className="w-7 text-right flex-shrink-0 font-mono text-[10px]"
            style={{ color: "#6b7c96" }}>{c.minute != null ? `${c.minute}'` : "—"}</span>
          <span className="w-3 h-4 rounded-sm flex-shrink-0 inline-block"
            style={{ background: c.card === "RED_CARD" ? "#ef4444" : "#f59e0b" }} />
          <span className="truncate" style={{ color: "#94a3b8" }}>{c.player ?? "?"}</span>
        </div>
      ))}
    </div>
  );
}

function PredictionBadge({ saved, actualResult }: { saved: SavedPrediction | null; actualResult: "home" | "away" | "draw" }) {
  if (!saved) {
    return (
      <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.04)", color: "#6b7c96" }}>
        Pas de prédiction
      </div>
    );
  }

  const predicted = saved.prediction.winner;
  const correct = predicted === actualResult;

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
      style={{
        background: correct ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
        border: `2px solid ${correct ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
      }}>
      {correct
        ? <CheckCircle size={22} style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }} />
        : <XCircle size={22} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />}
      <div className="space-y-1">
        <p className="font-black" style={{ fontSize: 14, color: correct ? "#22c55e" : "#ef4444" }}>
          {correct ? "✓ Prédiction correcte" : "✗ Prédiction incorrecte"}
        </p>
        <p className="text-xs" style={{ color: "#94a3b8" }}>
          Prédit : {predicted === "home" ? `Vic. ${saved.homeTeam.shortName || saved.homeTeam.tla}` : predicted === "away" ? `Vic. ${saved.awayTeam.shortName || saved.awayTeam.tla}` : "Match nul"}
          {" · "}{saved.prediction.homeProb}%–{saved.prediction.drawProb}%–{saved.prediction.awayProb}%
        </p>
        {saved.emotional?.applied && (
          <p className="text-xs" style={{ color: "#06b6d4" }}>
            ❤ Score émot. dom. {saved.emotional.homeScore} · ext. {saved.emotional.awayScore}
          </p>
        )}
      </div>
    </div>
  );
}

interface AlgoPred { winner: "home" | "away" | "draw"; homeProb: number; drawProb: number; awayProb: number }

function MatchResultCard({ match, savedPrediction, algoPred }: {
  match: ResultMatch;
  savedPrediction: SavedPrediction | null;
  algoPred: AlgoPred | null;
}) {
  const { day, time } = formatDate(match.date);

  const homeWon = match.result === "home";
  const awayWon = match.result === "away";
  const isDraw = match.result === "draw";

  const hasGoalDetails = match.homeGoals.length > 0 || match.awayGoals.length > 0 || (match.homeCards?.length ?? 0) > 0 || (match.awayCards?.length ?? 0) > 0;
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

        {/* Algorithmic prediction — full-width row */}
        {algoPred && (() => {
          const predLabel = algoPred.winner === "home"
            ? `${match.homeTeam.shortName || match.homeTeam.tla} (${algoPred.homeProb}%)`
            : algoPred.winner === "away"
            ? `${match.awayTeam.shortName || match.awayTeam.tla} (${algoPred.awayProb}%)`
            : `Match nul (${algoPred.drawProb}%)`;
          const predCorrect = algoPred.winner === match.result;
          return (
            <div className="flex items-center justify-center gap-2 mt-3 px-3 py-2 rounded-xl"
              style={{ background: "rgba(249,115,22,0.10)", border: "1px solid rgba(249,115,22,0.30)" }}>
              <span className="text-sm font-bold" style={{ color: "#f97316" }}>
                {predCorrect ? "✓" : "✗"}
              </span>
              <span className="text-xs" style={{ color: "#94a3b8" }}>Prédiction algo :</span>
              <span className="text-xs font-bold" style={{ color: "#f97316" }}>{predLabel}</span>
            </div>
          );
        })()}

        {/* Goal + card details */}
        {hasGoalDetails && (
          <div className="mt-4 pt-3 grid grid-cols-2 gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <p className="text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: "#6b7c96" }}>
                {match.homeTeam.shortName || match.homeTeam.tla}
              </p>
              <GoalList goals={match.homeGoals} />
              {match.homeGoals.length === 0 && <p className="text-xs" style={{ color: "#6b7c96" }}>–</p>}
              <CardList cards={match.homeCards ?? []} />
            </div>
            <div>
              <p className="text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: "#6b7c96" }}>
                {match.awayTeam.shortName || match.awayTeam.tla}
              </p>
              <GoalList goals={match.awayGoals} />
              {match.awayGoals.length === 0 && <p className="text-xs" style={{ color: "#6b7c96" }}>–</p>}
              <CardList cards={match.awayCards ?? []} />
            </div>
          </div>
        )}

        {/* Prediction badge — always visible */}
        {hasPrediction && (
          <div className={hasGoalDetails ? "mt-3" : "mt-4 pt-3"} style={!hasGoalDetails ? { borderTop: "1px solid rgba(255,255,255,0.05)" } : undefined}>
            <PredictionBadge saved={savedPrediction} actualResult={match.result} />
          </div>
        )}
      </div>
    </div>
  );
}

const WC_MATCHES = [
  { group: "B", date: "11 juin", home: "🇲🇽 Mexique", away: "🇪🇨 Équateur", venue: "Mexico City", note: "Match d'ouverture" },
  { group: "C", date: "12 juin", home: "🇺🇸 USA", away: "🇵🇦 Panama", venue: "Los Angeles" },
  { group: "A", date: "13 juin", home: "🇦🇷 Argentine", away: "🇨🇱 Chili", venue: "Dallas" },
  { group: "E", date: "14 juin", home: "🇪🇸 Espagne", away: "🇲🇦 Maroc", venue: "Miami" },
  { group: "F", date: "14 juin", home: "🇫🇷 France", away: "🇸🇦 Arabie Saoudite", venue: "New York", note: "🇫🇷 Les Bleus" },
  { group: "D", date: "15 juin", home: "🇨🇦 Canada", away: "🇭🇳 Honduras", venue: "Toronto" },
  { group: "I", date: "15 juin", home: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Angleterre", away: "🇸🇳 Sénégal", venue: "Boston" },
  { group: "G", date: "16 juin", home: "🇧🇷 Brésil", away: "🇨🇴 Colombie", venue: "San Francisco" },
  { group: "H", date: "16 juin", home: "🇩🇪 Allemagne", away: "🇳🇱 Pays-Bas", venue: "Philadelphia" },
  { group: "J", date: "17 juin", home: "🇮🇹 Italie", away: "🇭🇷 Croatie", venue: "Houston" },
  { group: "B", date: "17 juin", home: "🇲🇽 Mexique", away: "🇻🇪 Venezuela", venue: "Guadalajara" },
  { group: "C", date: "18 juin", home: "🇺🇸 USA", away: "🇨🇺 Cuba", venue: "Atlanta" },
  { group: "A", date: "18 juin", home: "🇦🇷 Argentine", away: "🇦🇺 Australie", venue: "Seattle" },
  { group: "D", date: "19 juin", home: "🇺🇾 Uruguay", away: "🇵🇹 Portugal", venue: "Kansas City" },
  { group: "E", date: "20 juin", home: "🇧🇪 Belgique", away: "🇯🇵 Japon", venue: "Los Angeles" },
  { group: "F", date: "20 juin", home: "🇫🇷 France", away: "🇨🇭 Suisse", venue: "New York", note: "🇫🇷 Les Bleus" },
  { group: "G", date: "21 juin", home: "🇵🇾 Paraguay", away: "🇨🇲 Cameroun", venue: "San Francisco" },
  { group: "H", date: "21 juin", home: "🇵🇱 Pologne", away: "🇷🇸 Serbie", venue: "Philadelphia" },
  { group: "I", date: "22 juin", home: "🇹🇳 Tunisie", away: "🇨🇷 Costa Rica", venue: "Boston" },
  { group: "J", date: "22 juin", home: "🇷🇴 Roumanie", away: "🇦🇴 Angola", venue: "Houston" },
  { group: "A", date: "24 juin", home: "🇨🇱 Chili", away: "🇦🇺 Australie", venue: "Dallas" },
  { group: "B", date: "24 juin", home: "🇯🇲 Jamaïque", away: "🇪🇨 Équateur", venue: "Monterrey" },
  { group: "C", date: "25 juin", home: "🇵🇦 Panama", away: "🇳🇿 Nouvelle-Zélande", venue: "Atlanta" },
  { group: "D", date: "25 juin", home: "🇨🇦 Canada", away: "🇺🇾 Uruguay", venue: "Vancouver" },
  { group: "E", date: "25 juin", home: "🇪🇸 Espagne", away: "🇧🇪 Belgique", venue: "Miami" },
  { group: "F", date: "25 juin", home: "🇫🇷 France", away: "🇩🇿 Algérie", venue: "New York", note: "🔥 Choc" },
  { group: "G", date: "26 juin", home: "🇧🇷 Brésil", away: "🇵🇾 Paraguay", venue: "San Francisco" },
  { group: "H", date: "26 juin", home: "🇩🇪 Allemagne", away: "🇵🇱 Pologne", venue: "Seattle" },
  { group: "I", date: "27 juin", home: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Angleterre", away: "🇹🇳 Tunisie", venue: "Boston" },
  { group: "J", date: "27 juin", home: "🇮🇹 Italie", away: "🇷🇴 Roumanie", venue: "Houston" },
];

const WC_PHASE_MATCHES = [
  { phase: "Huitièmes de finale", dates: "4–7 juillet 2026", color: "#f59e0b" },
  { phase: "Quarts de finale",    dates: "9–12 juillet 2026", color: "#f97316" },
  { phase: "Demi-finales",        dates: "14–15 juillet 2026", color: "#ef4444" },
  { phase: "3e place",            dates: "18 juillet 2026",    color: "#a78bfa" },
  { phase: "FINALE",              dates: "19 juillet 2026",    color: "#fbbf24" },
];

function WCResultsView() {
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const groups = ["A","B","C","D","E","F","G","H","I","J","K","L"];
  const filtered = groupFilter ? WC_MATCHES.filter(m => m.group === groupFilter) : WC_MATCHES;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "#e8edf5" }}>
            <Globe size={16} style={{ color: "#eab308" }} /> Coupe du Monde 2026
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>11 juin – 19 juillet · USA · Canada · Mexique</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-bold"
          style={{ background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.25)", color: "#eab308" }}>
          À venir
        </span>
      </div>

      {/* Group filter */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => setGroupFilter(null)}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
          style={{ background: groupFilter === null ? "rgba(0,212,255,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${groupFilter === null ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.08)"}`, color: groupFilter === null ? "#00d4ff" : "#6b7c96" }}>
          Tous
        </button>
        {groups.map(g => (
          <button key={g} onClick={() => setGroupFilter(g === groupFilter ? null : g)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
            style={{ background: groupFilter === g ? "rgba(234,179,8,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${groupFilter === g ? "rgba(234,179,8,0.3)" : "rgba(255,255,255,0.08)"}`, color: groupFilter === g ? "#eab308" : "#6b7c96" }}>
            {g}
          </button>
        ))}
      </div>

      {/* Matches */}
      <div className="space-y-1.5 mb-5">
        {filtered.map((m, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: m.note ? "rgba(234,179,8,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${m.note ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.05)"}` }}>
            <span className="text-xs font-bold w-5 flex-shrink-0" style={{ color: "#eab308" }}>{m.group}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold" style={{ color: "#e8edf5" }}>{m.home}</span>
                <span className="text-[10px]" style={{ color: "#6b7c96" }}>vs</span>
                <span className="text-xs font-semibold" style={{ color: "#e8edf5" }}>{m.away}</span>
                {m.note && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(234,179,8,0.15)", color: "#eab308" }}>{m.note}</span>}
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: "#6b7c96" }}><Calendar size={9} className="inline mr-1" />{m.date} · {m.venue}</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
              style={{ background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.2)", color: "#64748b" }}>
              À venir
            </span>
          </div>
        ))}
      </div>

      {/* Phase matches */}
      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7c96" }}>Phase finale</p>
      <div className="space-y-1.5">
        {WC_PHASE_MATCHES.map(p => (
          <div key={p.phase} className="flex items-center justify-between px-3 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${p.color}20` }}>
            <span className="text-xs font-bold" style={{ color: p.color }}>{p.phase}</span>
            <span className="text-xs" style={{ color: "#6b7c96" }}>{p.dates}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResultsTab() {
  const [subTab, setSubTab] = useState<"l1" | "cdm">("l1");
  const [data, setData] = useState<ResultsData | null>(null);
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedPreds, setSavedPreds] = useState<SavedPrediction[]>([]);
  const [filterMatchday, setFilterMatchday] = useState<number | null>(null);

  useEffect(() => {
    setSavedPreds(loadPredictions());
    Promise.all([
      fetch("/api/results?limit=50").then(r => r.json()),
      fetch("/api/standings").then(r => r.json()).catch(() => ({ standings: [] })),
    ]).then(([results, st]) => {
      if (results.error) throw new Error(results.error);
      setData(results);
      setStandings(st?.standings ?? []);
    }).catch(e => setError(e.message))
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

  if (subTab === "cdm") return <div><SubTabs /><WCResultsView /></div>;

  if (loading) {
    return (
      <div><SubTabs />
      <div className="py-3">
        <LoadingBar color="#22c55e" caption="Chargement des résultats" />
      </div>
      </div>
    );
  }

  if (error) return <div><SubTabs /><div className="text-center py-16 text-red-400 text-sm">{error}</div></div>;

  return (
    <div>
      <SubTabs />
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
            <DownloadSimple size={12} /> Exporter CSV
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
          const homeS = findStanding(match.homeTeam.name, match.homeTeam.shortName, standings);
          const awayS = findStanding(match.awayTeam.name, match.awayTeam.shortName, standings);
          const algoPred = homeS && awayS ? computePrediction(homeS, awayS) : null;
          return (
            <div key={match.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
              <MatchResultCard match={match} savedPrediction={saved} algoPred={algoPred} />
            </div>
          );
        })}
      </div>

      {savedPreds.length === 0 && (
        <div className="mt-6 px-4 py-3 rounded-xl text-xs text-center"
          style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)", color: "#6b7c96" }}>
          Vos prédictions seront automatiquement sauvegardées lorsque vous visitez l'onglet <strong style={{ color: "#00d4ff" }}>AI FootPredictom</strong>.
        </div>
      )}
    </div>
  );
}
