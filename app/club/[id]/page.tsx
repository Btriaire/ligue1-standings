"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Users, AlertTriangle, Trophy, TrendingUp,
  ArrowLeftRight, Star, Calendar, Heart,
  Info, ChevronDown, ExternalLink, Briefcase, DollarSign,
  TrendingDown, X,
} from "lucide-react";

// ── Static data ────────────────────────────────────────────────────────────────

const STADIUM_IMAGES: Record<number, { name: string; file: string }> = {
  524:  { name: "Parc des Princes",           file: "Parc_des_Princes_-_20130116_2.jpg" },
  548:  { name: "Stade Louis-II",             file: "Stade_Louis_II.jpg" },
  516:  { name: "Orange Vélodrome",           file: "Stade_Velodrome_Marseille.jpg" },
  521:  { name: "Stade Pierre-Mauroy",        file: "Stade_Pierre-Mauroy.jpg" },
  529:  { name: "Roazhon Park",               file: "Stade_de_la_Route_de_Lorient_Rennes.JPG" },
  522:  { name: "Allianz Riviera",            file: "Allianz_Riviera_panorama.jpg" },
  546:  { name: "Stade Bollaert-Delelis",     file: "Stade_Bollaert-Delelis.jpg" },
  523:  { name: "Groupama Stadium",           file: "Groupama_Stadium_-_Lyon_%28Décines%29.jpg" },
  576:  { name: "Stade de la Meinau",         file: "Stade_Meinau_2012.JPG" },
  511:  { name: "Stadium de Toulouse",        file: "Stadium_de_Toulouse.jpg" },
  512:  { name: "Stade Francis-Le Blé",       file: "Stade_Francis_Le_Ble_Brest.jpg" },
  532:  { name: "Stade Raymond-Kopa",         file: "Stade_Jean-Bouin_Angers.JPG" },
  533:  { name: "Stade Océane",               file: "Stade_Oceane_Le_Havre.jpg" },
  519:  { name: "Stade de l'Abbé-Deschamps",  file: "Stade_de_l'Abb%C3%A9-Deschamps.jpg" },
  543:  { name: "Stade de la Beaujoire",      file: "Stade_de_la_Beaujoire.JPG" },
  545:  { name: "Stade Saint-Symphorien",     file: "Stade_Saint_Symphorien_Metz.jpg" },
  525:  { name: "Stade du Moustoir",          file: "Stade_du_Moustoir_Lorient.jpg" },
  1045: { name: "Stade Charléty",             file: "Stade_Charléty.jpg" },
};

function stadiumUrl(id: number): string {
  const f = STADIUM_IMAGES[id]?.file;
  if (!f) return "";
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${f}?width=800`;
}

interface AdminEntry {
  siren?: string;
  forme: string;
  siege: string;
  president: string;
  ca: string;
  employes: string;
  legalNote?: string;
  dette?: string;
  billetterie?: string;
  droitsTv?: string;
  sources?: { label: string; url: string }[];
}

const CLUB_ADMIN: Record<number, AdminEntry> = {
  524:  { siren: "317 506 329", forme: "SAS",  siege: "24 r. du Commandant-Guilbaud, 75016 Paris",  president: "Nasser Al-Khelaïfi",  ca: "~800 M€",  employes: "~400",
          dette: "~200 M€", billetterie: "~70 M€", droitsTv: "~80 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }, { label: "Deloitte Football Money League", url: "https://www2.deloitte.com/uk/en/pages/sports-business-group/articles/football-money-league.html" }] },
  548:  { forme: "SAM", siege: "7 av. des Castelans, Monaco", president: "Dmitry Rybolovlev", ca: "~200 M€", employes: "~150",
          legalNote: "Entité de droit monégasque", dette: "~30 M€", billetterie: "~20 M€", droitsTv: "~55 M€",
          sources: [{ label: "UEFA Club Licensing", url: "https://www.uefa.com/insideuefa/football-development/club-licensing/" }] },
  516:  { siren: "786 164 659", forme: "SA",   siege: "145 traverse Charles Susini, 13008 Marseille", president: "Pablo Longoria",    ca: "~170 M€",  employes: "~200",
          dette: "~80 M€", billetterie: "~25 M€", droitsTv: "~55 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }, { label: "KPMG Football Benchmark", url: "https://footballbenchmark.com" }] },
  521:  { siren: "783 897 830", forme: "SA",   siege: "261 bd de Tournai, 59650 Villeneuve-d'Ascq",  president: "Olivier Létang",    ca: "~110 M€",  employes: "~180",
          dette: "~20 M€", billetterie: "~15 M€", droitsTv: "~45 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }] },
  529:  { siren: "303 623 965", forme: "SAS",  siege: "111 route de Lorient, 35000 Rennes",          president: "Baptiste Cueff",    ca: "~130 M€",  employes: "~160",
          dette: "~15 M€", billetterie: "~18 M€", droitsTv: "~40 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }] },
  522:  { siren: "776 416 358", forme: "SA",   siege: "Av. Simone Veil, 06200 Nice",                  president: "Jean-Pierre Rivère", ca: "~150 M€",  employes: "~180",
          dette: "~25 M€", billetterie: "~20 M€", droitsTv: "~45 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }] },
  546:  { siren: "497 854 280", forme: "SA",   siege: "Rue de Lens, 62300 Lens",                      president: "Joseph Oughourlian", ca: "~90 M€",   employes: "~120",
          dette: "~10 M€", billetterie: "~12 M€", droitsTv: "~38 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }] },
  523:  { siren: "320 835 374", forme: "SA",   siege: "350 av. Jean Jaurès, 69007 Lyon",              president: "John Textor",       ca: "~180 M€",  employes: "~250",
          dette: "~120 M€", billetterie: "~22 M€", droitsTv: "~50 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }, { label: "KPMG Football Benchmark", url: "https://footballbenchmark.com" }] },
  576:  { siren: "422 952 942", forme: "SA",   siege: "11 rue du Stade, 67100 Strasbourg",            president: "Marc Keller",       ca: "~120 M€",  employes: "~150",
          dette: "~40 M€", billetterie: "~14 M€", droitsTv: "~38 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }] },
  511:  { siren: "408 476 801", forme: "SA",   siege: "Stadium Municipal, 31400 Toulouse",            president: "Damien Comolli",    ca: "~75 M€",   employes: "~100",
          dette: "~8 M€", billetterie: "~10 M€", droitsTv: "~32 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }] },
  512:  { siren: "390 260 337", forme: "SASP", siege: "Rue de Pontaniou, 29200 Brest",                president: "Denis Le Saint",    ca: "~55 M€",   employes: "~90",
          dette: "~5 M€", billetterie: "~8 M€", droitsTv: "~28 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }] },
  532:  { siren: "775 577 063", forme: "SA",   siege: "Stade Raymond-Kopa, 49000 Angers",             president: "Saïd Chabane",      ca: "~45 M€",   employes: "~80",
          dette: "~12 M€", billetterie: "~7 M€", droitsTv: "~26 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }] },
  533:  { siren: "431 026 609", forme: "SA",   siege: "Stade Océane, 76600 Le Havre",                 president: "Vincent Volpe",     ca: "~40 M€",   employes: "~75",
          dette: "~6 M€", billetterie: "~6 M€", droitsTv: "~25 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }] },
  519:  { siren: "302 697 937", forme: "SA",   siege: "Stade de l'Abbé-Deschamps, 89000 Auxerre",    president: "Yan Gaborit",       ca: "~40 M€",   employes: "~70",
          dette: "~8 M€", billetterie: "~5 M€", droitsTv: "~24 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }] },
  543:  { siren: "302 505 072", forme: "SA",   siege: "Stade de la Beaujoire, 44300 Nantes",          president: "Waldemar Kita",     ca: "~70 M€",   employes: "~110",
          dette: "~15 M€", billetterie: "~9 M€", droitsTv: "~30 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }] },
  545:  { siren: "384 233 417", forme: "SASP", siege: "Stade Saint-Symphorien, 57050 Metz",           president: "Bernard Serin",     ca: "~35 M€",   employes: "~65",
          dette: "~5 M€", billetterie: "~4 M€", droitsTv: "~22 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }] },
  525:  { siren: "304 890 016", forme: "SA",   siege: "Stade du Moustoir, 56100 Lorient",             president: "Loïc Féry",         ca: "~50 M€",   employes: "~85",
          dette: "~7 M€", billetterie: "~7 M€", droitsTv: "~26 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }] },
  1045: { siren: "814 988 091", forme: "SA",   siege: "Stade Charléty, 75013 Paris",                  president: "Pierre-Dreyfus",    ca: "~60 M€",   employes: "~90",
          dette: "~10 M€", billetterie: "~8 M€", droitsTv: "~25 M€",
          sources: [{ label: "DNCG 2023", url: "https://www.lnfp.fr/dncg" }] },
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface SquadPlayer {
  id: string;
  name: string;
  position: string;
  age: number;
  dateOfBirth?: string;
  nationality: string[];
  height?: number;
  foot?: string;
  joinedOn?: string;
  signedFrom?: string;
  contract?: string;
  marketValue: number;
  status?: string;
  formBadge?: "hot" | "good" | "neutral" | "cold";
  recentGoals?: number;
  recentAssists?: number;
  imageUrl?: string;
  // Understat season totals
  xG?: number;
  xA?: number;
  usGoals?: number;
  usAssists?: number;
  shots?: number;
  minutes?: number;
  games?: number;
  // Datamb per-90 rates
  dm_goals90?: number;
  dm_assists90?: number;
  dm_xg90?: number;
  dm_xa90?: number;
  dm_shots90?: number;
  dm_keyPasses90?: number;
  dm_dribbles90?: number;
  dm_dribblePct?: number;
  dm_defDuels90?: number;
  dm_defDuelPct?: number;
  dm_interceptions90?: number;
  dm_aerialPct?: number;
  dm_passPct?: number;
  dm_progressive90?: number;
  dm_savePct?: number;
  dm_gcPer90?: number;
  dm_cleanSheets?: number;
  dm_xgxa90?: number;
  dm_minPerMatch?: number;
  dm_team?: string;
}

interface SquadData {
  team: { id: number; name: string; shortName: string; crest: string; venue: string; founded: number; coach: string | null };
  squad: SquadPlayer[];
  stats: { totalValue: number; avgValue: number; playerCount: number; injuredCount: number; injuryRate: number; injured: { name: string; status?: string }[] };
}

interface GoalEvent {
  minute: number;
  scorer: string | null;
  type: string;
  teamId: number | null;
}

interface BookingEvent {
  minute: number;
  player: string;
  card: string;
  teamId: number;
}

interface MatchInfo {
  id: number; date: string; matchday: number; status: string;
  homeTeam: { id: number; name: string; crest: string };
  awayTeam: { id: number; name: string; crest: string };
  score: { home: number | null; away: number | null };
  goals?: GoalEvent[];
  bookings?: BookingEvent[];
}

interface TeamMatches { recent: MatchInfo[]; upcoming: MatchInfo[] }

interface TransferItem {
  title: string; pubDate: string; source: string; url: string;
  type: "arrival" | "departure" | "rumor" | "news";
}

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
  synthesis?: string;
  topPositiveKeywords: string[];
  topNegativeKeywords: string[];
  maxAgeDays: number;
}

interface StandingEntry {
  position: number;
  team: { id: number; name: string; shortName: string; crest: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string;
}

interface EmotionalEntry {
  teamId: number; emotionalScore: number;
  components: {
    economic: { score: number; label: string; revenue: string; owner: string };
    media: { score: number; positive: number; negative: number; total: number };
    human: { score: number; totalValue: number; injuryRate: number };
    fan?: { score: number };
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fv(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}Md€`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(0)}M€`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}K€`;
  return `${v}€`;
}
function fd(iso: string) {
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }); }
  catch { return ""; }
}
function ec(score: number) {
  if (score >= 70) return "#22c55e";
  if (score >= 55) return "#00d4ff";
  if (score >= 40) return "#f59e0b";
  if (score >= 28) return "#f97316";
  return "#ef4444";
}
function buzzLabel(score: number) {
  if (score >= 70) return "Très positif";
  if (score >= 58) return "Positif";
  if (score >= 44) return "Neutre";
  if (score >= 32) return "Négatif";
  return "Très négatif";
}

// Simplified prediction logic (mirrors /api/predictions)
function formScore(form: string): number {
  if (!form) return 0.4;
  const r = form.split(",").filter(Boolean).slice(-5);
  const pts = r.reduce((a, x) => a + (x === "W" ? 3 : x === "D" ? 1 : 0), 0);
  return pts / (r.length * 3);
}
function teamStrength(s: StandingEntry): number {
  const ppg = s.playedGames > 0 ? s.points / s.playedGames : 0;
  const gdpg = s.playedGames > 0 ? s.goalDifference / s.playedGames : 0;
  return 0.35 * (ppg / 3) + 0.25 * ((gdpg + 3) / 6) + 0.25 * formScore(s.form) + 0.15 * ((19 - s.position) / 17);
}
function computeMatchPrediction(homeS: StandingEntry, awayS: StandingEntry) {
  const hs = Math.min(1, Math.max(0, teamStrength(homeS) + 0.08));
  const as_ = Math.min(1, Math.max(0, teamStrength(awayS)));
  const total = hs + as_ + 0.001;
  const rh = hs / total, ra = as_ / total;
  const df = Math.max(0.12, 0.32 - Math.abs(rh - ra) * 0.6);
  let hP = rh * (1 - df), aP = ra * (1 - df), dP = df;
  const sum = hP + aP + dP;
  hP = Math.round(hP / sum * 100); aP = Math.round(aP / sum * 100); dP = 100 - hP - aP;
  const winner = hP > aP && hP > dP ? "home" : aP > hP && aP > dP ? "away" : "draw";
  return { homeProb: hP, drawProb: dP, awayProb: aP, winner };
}

const POS_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Winger", "Centre-Forward"];
const POS_FR: Record<string, string> = { Goalkeeper: "Gardiens", Defender: "Défenseurs", Midfielder: "Milieux", Winger: "Ailiers", "Centre-Forward": "Attaquants" };
const POS_SHORT: Record<string, string> = { Goalkeeper: "G", Defender: "D", Midfielder: "M", Winger: "A", "Centre-Forward": "BU" };
const POS_COL: Record<string, string> = { Goalkeeper: "#f59e0b", Defender: "#3b82f6", Midfielder: "#22c55e", Winger: "#a78bfa", "Centre-Forward": "#ef4444" };

const TR_CFG = {
  arrival:   { color: "#22c55e", label: "Arrivée",  emoji: "🟢" },
  departure: { color: "#ef4444", label: "Départ",   emoji: "🔴" },
  rumor:     { color: "#f59e0b", label: "Rumeur",   emoji: "🟡" },
  news:      { color: "#94a3b8", label: "Actu",     emoji: "⚪" },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function Chip({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {children}
    </span>
  );
}

function FormDot({ result }: { result: "W" | "D" | "L" }) {
  const c = result === "W" ? "#22c55e" : result === "L" ? "#ef4444" : "#f59e0b";
  const l = result === "W" ? "V" : result === "L" ? "D" : "N";
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-black"
      style={{ background: `${c}15`, color: c, border: `1px solid ${c}30` }}>{l}</span>
  );
}

function ScoreBar({ label, score, color, weight }: { label: string; score: number; color: string; weight?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-20 flex-shrink-0" style={{ color: "#6b7c96" }}>{label}</span>
      {weight && <span className="text-[10px] flex-shrink-0" style={{ color: "#6b7c96" }}>{weight}</span>}
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-7 text-right flex-shrink-0" style={{ color }}>{score}</span>
    </div>
  );
}

function MatchRow({ match, teamId, standings }: { match: MatchInfo; teamId: number; standings: StandingEntry[] }) {
  const isHome = match.homeTeam.id === teamId;
  const ts = isHome ? match.score.home : match.score.away;
  const os = isHome ? match.score.away : match.score.home;
  const opp = isHome ? match.awayTeam : match.homeTeam;
  const done = ts !== null && os !== null;
  const rc = done ? (ts! > os! ? "#22c55e" : ts! < os! ? "#ef4444" : "#f59e0b") : "#6b7c96";

  // Goals and cards for our team
  const teamGoals = (match.goals ?? []).filter(g => g.teamId === teamId && g.scorer);
  const teamReds = (match.bookings ?? []).filter(b => b.teamId === teamId && (b.card === "RED" || b.card === "YELLOW_RED"));
  const teamYellows = (match.bookings ?? []).filter(b => b.teamId === teamId && b.card === "YELLOW");

  // Compute prediction
  const homeS = standings.find(s => s.team.id === match.homeTeam.id);
  const awayS = standings.find(s => s.team.id === match.awayTeam.id);
  const pred = homeS && awayS ? computeMatchPrediction(homeS, awayS) : null;
  const predWinner = pred?.winner;
  const actualResult = done ? (ts! > os! ? "win" : ts! < os! ? "loss" : "draw") : null;
  const predForTeam = predWinner === "draw" ? "draw" : (isHome ? (predWinner === "home" ? "win" : "loss") : (predWinner === "away" ? "win" : "loss"));
  const predCorrect = actualResult && (predForTeam === actualResult);

  return (
    <div className="py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono w-6 flex-shrink-0" style={{ color: "#6b7c96" }}>J{match.matchday}</span>
        <span className="text-[10px] px-1 rounded flex-shrink-0"
          style={{ background: isHome ? "rgba(0,212,255,0.08)" : "rgba(255,255,255,0.04)", color: isHome ? "#00d4ff" : "#6b7c96" }}>
          {isHome ? "⌂" : "✈"}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={opp.crest} alt="" className="w-4 h-4 object-contain flex-shrink-0" loading="lazy" />
        <span className="flex-1 text-xs truncate" style={{ color: "#e8edf5" }}>{opp.name}</span>
        {done && pred && (
          <span className="text-[9px] px-1 rounded flex-shrink-0"
            style={{ background: predCorrect ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: predCorrect ? "#22c55e" : "#ef4444" }}>
            Préd.{predForTeam === "win" ? "V" : predForTeam === "draw" ? "N" : "D"}
          </span>
        )}
        {teamYellows.length > 0 && <span className="text-[10px] flex-shrink-0">🟨×{teamYellows.length}</span>}
        {teamReds.map((b, i) => (
          <span key={i} className="text-[10px] flex-shrink-0">🟥</span>
        ))}
        {done
          ? <span className="text-xs font-black flex-shrink-0" style={{ color: rc }}>{ts}–{os}</span>
          : <span className="text-xs flex-shrink-0" style={{ color: "#6b7c96" }}>{fd(match.date)}</span>
        }
      </div>
      {/* Scorers row */}
      {teamGoals.length > 0 && (
        <div className="flex flex-wrap gap-x-2 mt-0.5 ml-14">
          {teamGoals.map((g, i) => (
            <span key={i} className="text-[9px]" style={{ color: "#f59e0b" }}>
              ⚽{g.scorer}{g.type === "OWN_GOAL" ? " (csc)" : g.type === "PENALTY" ? " (pen)" : ""} {g.minute}&apos;
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerModal({ player, onClose }: { player: SquadPlayer; onClose: () => void }) {
  const isInj = player.status?.toLowerCase().includes("injury");
  const posColor = POS_COL[player.position] ?? "#6b7c96";
  const tmId = player.id;
  const tmUrl = `https://www.transfermarkt.fr/profil/spieler/${tmId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}
      onClick={onClose}>
      <div className="rounded-2xl max-w-sm w-full overflow-hidden"
        style={{ background: "#0d1421", border: "1px solid #1e2d42" }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid #1e2d42", background: "rgba(255,255,255,0.02)" }}>
          {/* Photo */}
          {player.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.imageUrl} alt={player.name}
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
              style={{ border: `2px solid ${posColor}40` }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${posColor}15`, border: `2px solid ${posColor}30` }}>
              <Users size={22} style={{ color: posColor }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm truncate" style={{ color: isInj ? "#f97316" : "#e8edf5" }}>
              {isInj && <AlertTriangle size={11} className="inline mr-1 text-orange-400" />}
              {player.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Chip color={posColor}>{POS_FR[player.position] ?? player.position}</Chip>
              {player.nationality?.[0] && <span className="text-xs" style={{ color: "#6b7c96" }}>{player.nationality[0]}</span>}
            </div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1 rounded-lg hover:bg-white/[0.06]">
            <X size={14} style={{ color: "#6b7c96" }} />
          </button>
        </div>

        {/* Understat season stats */}
        {(player.games ?? 0) > 0 && (
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #1e2d42" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7c96" }}>
              Saison — {player.games} matchs · {player.minutes} min
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "Buts", value: player.usGoals ?? 0, color: "#f59e0b" },
                { label: "Passes D.", value: player.usAssists ?? 0, color: "#00d4ff" },
                { label: "xG", value: (player.xG ?? 0).toFixed(1), color: "#22c55e" },
                { label: "xA", value: (player.xA ?? 0).toFixed(1), color: "#a78bfa" },
              ].map(s => (
                <div key={s.label} className="rounded-lg py-1.5" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <p className="text-sm font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] mt-0.5" style={{ color: "#6b7c96" }}>{s.label}</p>
                </div>
              ))}
            </div>
            {(player.shots ?? 0) > 0 && (
              <p className="text-[10px] mt-2 text-center" style={{ color: "#6b7c96" }}>
                {player.shots} tirs · xG/tir {player.shots! > 0 ? ((player.xG ?? 0) / player.shots!).toFixed(2) : "—"}
              </p>
            )}
          </div>
        )}

        {/* Datamb per-90 stats */}
        {(player.dm_xg90 ?? 0) > 0 || (player.dm_savePct ?? 0) > 0 ? (() => {
          const isGk = player.position === "Goalkeeper";
          const stats = isGk
            ? [
                { label: "Arrêts %", value: `${(player.dm_savePct ?? 0).toFixed(1)}%`, color: "#00d4ff" },
                { label: "Buts enc./90", value: (player.dm_gcPer90 ?? 0).toFixed(2), color: "#ef4444" },
                { label: "Clean sheets", value: player.dm_cleanSheets ?? 0, color: "#22c55e" },
                { label: "Duels aér. %", value: `${(player.dm_aerialPct ?? 0).toFixed(0)}%`, color: "#a78bfa" },
              ]
            : [
                { label: "xG/90", value: (player.dm_xg90 ?? 0).toFixed(2), color: "#22c55e" },
                { label: "xA/90", value: (player.dm_xa90 ?? 0).toFixed(2), color: "#a78bfa" },
                { label: "Passes %", value: `${(player.dm_passPct ?? 0).toFixed(0)}%`, color: "#00d4ff" },
                { label: "Dribbles/90", value: (player.dm_dribbles90 ?? 0).toFixed(1), color: "#f59e0b" },
              ];
          const extra = isGk ? [] : [
            { label: "Def. duels/90", value: (player.dm_defDuels90 ?? 0).toFixed(1) },
            { label: "Def. won %", value: `${(player.dm_defDuelPct ?? 0).toFixed(0)}%` },
            { label: "Int./90", value: (player.dm_interceptions90 ?? 0).toFixed(2) },
            { label: "Prog./90", value: (player.dm_progressive90 ?? 0).toFixed(1) },
          ].filter(e => parseFloat(e.value) > 0);
          return (
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #1e2d42" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7c96" }}>
                Per 90 · Datamb{player.dm_minPerMatch ? ` · ${Math.round(player.dm_minPerMatch)} min/match` : ""}
              </p>
              <div className="grid grid-cols-4 gap-2 text-center mb-2">
                {stats.map(s => (
                  <div key={s.label} className="rounded-lg py-1.5" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <p className="text-sm font-black" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: "#6b7c96" }}>{s.label}</p>
                  </div>
                ))}
              </div>
              {extra.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {extra.map(e => (
                    <span key={e.label} className="text-[10px]" style={{ color: "#94a3b8" }}>
                      <span style={{ color: "#6b7c96" }}>{e.label} </span>{e.value}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })() : null}

        {/* Bio grid */}
        <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
          {player.dateOfBirth && (
            <div><p style={{ color: "#6b7c96" }}>Date de naissance</p>
              <p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>
                {new Date(player.dateOfBirth).toLocaleDateString("fr-FR")} ({player.age} ans)
              </p></div>
          )}
          {(player.height ?? 0) > 0 && (
            <div><p style={{ color: "#6b7c96" }}>Taille / Pied</p>
              <p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>{player.height} cm · {player.foot || "—"}</p></div>
          )}
          {player.joinedOn && (
            <div><p style={{ color: "#6b7c96" }}>Arrivé le</p>
              <p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>
                {new Date(player.joinedOn).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
              </p></div>
          )}
          {player.signedFrom && (
            <div><p style={{ color: "#6b7c96" }}>Provenance</p>
              <p className="font-semibold mt-0.5 truncate" style={{ color: "#e8edf5" }}>{player.signedFrom}</p></div>
          )}
          {player.contract && (
            <div><p style={{ color: "#6b7c96" }}>Fin de contrat</p>
              <p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>{player.contract}</p></div>
          )}
          {(player.marketValue ?? 0) > 0 && (
            <div><p style={{ color: "#6b7c96" }}>Valeur marchande</p>
              <p className="font-black mt-0.5" style={{ color: "#00d4ff" }}>{fv(player.marketValue)}</p></div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-3">
          <a href={tmUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold hover:opacity-80 transition-all"
            style={{ background: "rgba(0,212,255,0.07)", border: "1px solid rgba(0,212,255,0.18)", color: "#00d4ff" }}>
            <ExternalLink size={12} /> Voir sur Transfermarkt
          </a>
        </div>
      </div>
    </div>
  );
}

function BuzzMethodology({ buzz }: { buzz: BuzzData }) {
  const [open, setOpen] = useState(false);
  const color = ec(buzz.score);
  return (
    <div className="mt-2 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.02] transition-colors">
        <Info size={11} style={{ color: "#6b7c96", flexShrink: 0 }} />
        <span className="text-xs flex-1" style={{ color: "#6b7c96" }}>Comment ce score est-il calculé ?</span>
        <ChevronDown size={11} style={{ color: "#6b7c96" }} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: "#94a3b8" }}>
            Analyse NLP sur <strong style={{ color: "#e8edf5" }}>{buzz.total} articles</strong> de
            Google News / L&apos;Équipe des <strong style={{ color: "#e8edf5" }}>{buzz.maxAgeDays ?? 30} derniers jours</strong>.
            Les négations (&ldquo;pas de victoire&rdquo;, &ldquo;sans titre&rdquo;…) sont détectées et inversent le sentiment.
          </p>
          <div className="rounded-lg p-2.5 text-xs space-y-1.5" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="font-mono">
              <span style={{ color: "#6b7c96" }}>1 mot-clé = </span><span style={{ color: "#94a3b8" }}>faible (±1)</span>
              <span style={{ color: "#6b7c96" }}>  2 = </span><span style={{ color: "#e8edf5" }}>moyen (±2)</span>
              <span style={{ color: "#6b7c96" }}>  3+ = </span><span style={{ color }}>fort (±3)</span>
            </p>
            <p className="font-mono" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "6px" }}>
              <span style={{ color: "#6b7c96" }}>Score = 50 + Σ(impacts) × 2 = </span>
              <span style={{ color }}>{buzz.score}</span>
              <span style={{ color: "#6b7c96" }}> / 100</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {buzz.topPositiveKeywords.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold mb-1.5" style={{ color: "#22c55e" }}>MOTS POSITIFS</p>
                <div className="flex flex-wrap gap-1">
                  {buzz.topPositiveKeywords.map(k => (
                    <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>{k}</span>
                  ))}
                </div>
              </div>
            )}
            {buzz.topNegativeKeywords.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold mb-1.5" style={{ color: "#ef4444" }}>MOTS NÉGATIFS</p>
                <div className="flex flex-wrap gap-1">
                  {buzz.topNegativeKeywords.map(k => (
                    <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ClubPage() {
  const params = useParams();
  const teamId = parseInt((params?.id as string) ?? "0");

  const [squad, setSquad] = useState<SquadData | null>(null);
  const [matches, setMatches] = useState<TeamMatches | null>(null);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [buzz, setBuzz] = useState<BuzzData | null>(null);
  const [emotional, setEmotional] = useState<EmotionalEntry | null>(null);
  const [clubAnalysis, setClubAnalysis] = useState<{ analysis: string; tag: string } | null>(null);
  const [topPlayers, setTopPlayers] = useState<{ name: string; url: string; imageUrl: string; goals: number; assists: number }[]>([]);
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBuzz, setLoadingBuzz] = useState(false);
  const [stadiumErr, setStadiumErr] = useState(false);
  const [squadOpen, setSquadOpen] = useState(false);
  const [expandedPlayer, setExpandedPlayer] = useState<SquadPlayer | null>(null);
  const [econOpen, setEconOpen] = useState(true);

  useEffect(() => {
    if (!teamId) return;

    // Auto-load buzz + players in parallel with other data
    setLoadingBuzz(true);
    fetch(`/api/fan-buzz?teamId=${teamId}`)
      .then(r => r.json())
      .then(setBuzz)
      .catch(() => null)
      .finally(() => setLoadingBuzz(false));

    fetch(`/api/players?teamId=${teamId}`)
      .then(r => r.json())
      .then(d => setTopPlayers(d.players ?? []))
      .catch(() => null);

    Promise.all([
      fetch(`/api/squad/${teamId}`).then(r => r.json()).catch(() => null),
      fetch(`/api/team/${teamId}`).then(r => r.json()).catch(() => null),
      fetch("/api/transfers").then(r => r.json()).catch(() => null),
      fetch("/api/standings").then(r => r.json()).catch(() => null),
    ]).then(([sq, mt, tr, st]) => {
      setSquad(sq?.team ? sq : null);
      setMatches(mt?.recent ? mt : null);
      if (tr?.clubs) {
        const c = tr.clubs.find((x: { teamId: number; items: TransferItem[] }) => x.teamId === teamId);
        setTransfers(c?.items ?? []);
      }
      if (st?.standings) {
        setStandings(st.standings);
        // Fetch Claude analysis once we have standings + squad context
        const standing = st.standings.find((s: { team: { id: number } }) => s.team.id === teamId);
        const recentResults = mt?.recent?.slice(0, 5).map((m: { homeTeam: { id: number; name: string }; awayTeam: { id: number; name: string }; score: { home: number | null; away: number | null } }) => {
          const ih = m.homeTeam.id === teamId;
          const ts = ih ? m.score.home : m.score.away;
          const os = ih ? m.score.away : m.score.home;
          const opp = ih ? m.awayTeam.name : m.homeTeam.name;
          return ts !== null && os !== null ? `${opp.split(" ")[0]}${ts}-${os}` : null;
        }).filter(Boolean).join(",") ?? "";

        const params = new URLSearchParams({
          club: sq?.team?.name ?? String(teamId),
          pos: String(standing?.position ?? ""),
          pts: String(standing?.points ?? ""),
          form: (sq?.stats?.recentMatchCount ? `${sq.stats.teamWins}V${sq.stats.teamDraws}N${sq.stats.teamLosses}D` : ""),
          gf: String(standing?.goalsFor ?? ""),
          ga: String(standing?.goalsAgainst ?? ""),
          coach: sq?.team?.coach ?? "",
          injured: String(sq?.stats?.injuredCount ?? 0),
          value: sq?.stats?.totalValue ? String(Math.round(sq.stats.totalValue)) : "",
          recent: recentResults,
        });
        fetch(`/api/club-analysis?${params}`)
          .then(r => r.json())
          .then(setClubAnalysis)
          .catch(() => null);
      }
    }).finally(() => setLoading(false));

    // Load emotional score separately — it calls all 18 teams and can be slow
    fetch("/api/emotional-score").then(r => r.json())
      .then(em => { if (em?.scores) setEmotional(em.scores.find((s: EmotionalEntry) => s.teamId === teamId) ?? null); })
      .catch(() => null);
  }, [teamId]);

  if (loading) {
    return (
      <main className="min-h-screen" style={{ background: "#080c14" }}>
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-3">
          {[80, 200, 120, 120].map((h, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height: h, background: "#0d1421", border: "1px solid #1e2d42" }} />
          ))}
        </div>
      </main>
    );
  }
  const team = squad?.team ?? { id: teamId, name: null as string | null, shortName: null, crest: null as string | null, venue: null as string | null, founded: null as number | null, coach: null as string | null };
  const squadStats = squad?.stats ?? { totalValue: 0, avgValue: 0, playerCount: 0, injuredCount: 0, injuryRate: 0, injured: [] as { name: string; status?: string }[], recentMatchCount: 0, teamWins: 0, teamDraws: 0, teamLosses: 0 };

  const admin = CLUB_ADMIN[teamId];
  const stadImg = stadiumErr ? "" : stadiumUrl(teamId);

  const recentForm = matches?.recent
    ?.map(m => {
      const ih = m.homeTeam.id === teamId;
      const ts = ih ? m.score.home : m.score.away;
      const os = ih ? m.score.away : m.score.home;
      if (ts === null || os === null) return null;
      return (ts > os ? "W" : ts < os ? "L" : "D") as "W" | "D" | "L";
    })
    .filter((r): r is "W" | "D" | "L" => r !== null) ?? [];

  const byPos = POS_ORDER.reduce<Record<string, SquadPlayer[]>>((acc, p) => {
    const pl = (squad?.squad ?? []).filter(x => x.position === p);
    if (pl.length) acc[p] = pl;
    return acc;
  }, {});

  const buzzColor = buzz ? ec(buzz.score) : "#6b7c96";
  const buzzText = buzz ? buzzLabel(buzz.score) : loadingBuzz ? "Chargement…" : "Non chargé";

  const thisTeamStanding = standings.find(s => s.team.id === teamId);

  return (
    <main className="min-h-screen" style={{ background: "#080c14" }}>
      {expandedPlayer && <PlayerModal player={expandedPlayer} onClose={() => setExpandedPlayer(null)} />}

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b"
        style={{ borderColor: "#1e2d42", background: "rgba(8,12,20,0.93)" }}>
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-xs transition-all hover:opacity-70 flex-shrink-0"
            style={{ color: "#6b7c96" }}>
            <ArrowLeft size={14} /> Retour
          </Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {team.crest && <img src={team.crest} alt="" className="w-7 h-7 object-contain flex-shrink-0" />}
          <span className="font-black text-sm truncate" style={{ color: "#e8edf5" }}>{team.name}</span>
          {thisTeamStanding && (
            <span className="text-xs ml-auto flex-shrink-0" style={{ color: "#6b7c96" }}>
              #{thisTeamStanding.position} · {thisTeamStanding.points} pts
            </span>
          )}
          {recentForm.length > 0 && (
            <div className="hidden sm:flex gap-1">
              {recentForm.map((r, i) => <FormDot key={i} result={r} />)}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">

        {/* ── AI Analysis banner ── */}
        {clubAnalysis && (
          <div className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{ background: "#0d1421", border: "1px solid #1a2235" }}>
            <div className="flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md"
                style={{
                  background: clubAnalysis.tag === "excellent" ? "rgba(52,211,153,0.12)" :
                    clubAnalysis.tag === "good" ? "rgba(96,165,250,0.12)" :
                    clubAnalysis.tag === "difficult" ? "rgba(251,191,36,0.12)" :
                    clubAnalysis.tag === "crisis" ? "rgba(248,113,113,0.12)" :
                    "rgba(255,255,255,0.06)",
                  color: clubAnalysis.tag === "excellent" ? "#34d399" :
                    clubAnalysis.tag === "good" ? "#60a5fa" :
                    clubAnalysis.tag === "difficult" ? "#fbbf24" :
                    clubAnalysis.tag === "crisis" ? "#f87171" :
                    "#94a3b8",
                  border: "1px solid currentColor",
                }}>
                IA
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1" }}>
              {clubAnalysis.analysis}
            </p>
          </div>
        )}

        {/* ── HERO: stadium photo + club identity ── */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42" }}>
          {stadImg ? (
            <div className="relative h-44 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stadImg} alt={STADIUM_IMAGES[teamId]?.name ?? "Stade"}
                className="w-full h-full object-cover"
                onError={() => setStadiumErr(true)}
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(8,12,20,0.95))" }} />
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {STADIUM_IMAGES[teamId]?.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {team.crest && <img src={team.crest} alt="" className="w-8 h-8 object-contain flex-shrink-0" />}
                    <h1 className="text-xl font-black" style={{ color: "#e8edf5" }}>{team.name}</h1>
                  </div>
                </div>
                <div className="flex gap-1">
                  {recentForm.map((r, i) => <FormDot key={i} result={r} />)}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 pt-4 pb-3 flex items-center gap-3"
              style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.04), rgba(124,58,237,0.04))" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {team.crest && <img src={team.crest} alt="" className="w-14 h-14 object-contain flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-black truncate" style={{ color: "#e8edf5" }}>{team.name}</h1>
                <div className="flex gap-1 mt-1">{recentForm.map((r, i) => <FormDot key={i} result={r} />)}</div>
              </div>
            </div>
          )}

          {/* Info row */}
          <div className="px-4 py-3" style={{ background: "#0d1421", borderTop: "1px solid #1e2d42" }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs mb-3">
              {team.venue    && <div><p style={{ color: "#6b7c96" }}>Stade</p><p className="font-semibold mt-0.5 truncate" style={{ color: "#e8edf5" }}>{team.venue}</p></div>}
              {team.founded  && <div><p style={{ color: "#6b7c96" }}>Fondation</p><p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>{team.founded}</p></div>}
              {team.coach    && <div><p style={{ color: "#6b7c96" }}>Entraîneur</p><p className="font-semibold mt-0.5 truncate" style={{ color: "#e8edf5" }}>{team.coach}</p></div>}
              {squadStats.totalValue > 0 && (
                <div><p style={{ color: "#6b7c96" }}>Valeur effectif</p>
                  <p className="font-black mt-0.5" style={{ color: "#00d4ff" }}>{fv(squadStats.totalValue)}</p></div>
              )}
            </div>

            {/* Admin data (collapsible économique) */}
            {admin && (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                <button onClick={() => setEconOpen(o => !o)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.02] transition-colors">
                  <DollarSign size={11} style={{ color: "#f59e0b", flexShrink: 0 }} />
                  <p className="text-[10px] font-bold uppercase tracking-widest flex-1" style={{ color: "#6b7c96" }}>Économie du club</p>
                  {admin.legalNote && <Chip color="#f59e0b">{admin.legalNote}</Chip>}
                  <ChevronDown size={11} style={{ color: "#6b7c96" }} className={`flex-shrink-0 transition-transform ${econOpen ? "rotate-180" : ""}`} />
                </button>
                {econOpen && (
                  <div className="px-3 pb-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs mt-2">
                      {admin.siren && (
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: "#6b7c96" }}>SIREN</span>
                          <span className="font-mono font-bold" style={{ color: "#e8edf5" }}>{admin.siren}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: "#6b7c96" }}>Forme</span>
                        <Chip color="#a78bfa">{admin.forme}</Chip>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: "#6b7c96" }}>Président</span>
                        <span className="font-semibold truncate" style={{ color: "#e8edf5" }}>{admin.president}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: "#6b7c96" }}>CA estimé</span>
                        <span className="font-bold" style={{ color: "#22c55e" }}>{admin.ca}</span>
                      </div>
                      {admin.billetterie && (
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: "#6b7c96" }}>Billetterie</span>
                          <span className="font-bold" style={{ color: "#00d4ff" }}>{admin.billetterie}</span>
                        </div>
                      )}
                      {admin.droitsTv && (
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: "#6b7c96" }}>Droits TV</span>
                          <span className="font-bold" style={{ color: "#a78bfa" }}>{admin.droitsTv}</span>
                        </div>
                      )}
                      {admin.dette && (
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: "#6b7c96" }}>Dette nette</span>
                          <span className="font-bold" style={{ color: "#f97316" }}>{admin.dette}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: "#6b7c96" }}>Salariés</span>
                        <span className="font-semibold" style={{ color: "#e8edf5" }}>~{admin.employes}</span>
                      </div>
                      <div className="flex items-start gap-1.5 col-span-2 sm:col-span-3">
                        <span className="flex-shrink-0" style={{ color: "#6b7c96" }}>Siège</span>
                        <span className="text-[11px] leading-tight" style={{ color: "#94a3b8" }}>{admin.siege}</span>
                      </div>
                    </div>
                    {admin.sources && admin.sources.length > 0 && (
                      <div className="mt-2 pt-2 flex flex-wrap gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <span className="text-[10px]" style={{ color: "#6b7c96" }}>Sources :</span>
                        {admin.sources.map(s => (
                          <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] flex items-center gap-0.5 hover:opacity-70 transition-opacity"
                            style={{ color: "#00d4ff" }}>
                            {s.label} <ExternalLink size={9} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── MERCATO ── */}
        {transfers.length > 0 && (() => {
          const arrivals = transfers.filter(t => t.type === "arrival");
          const departures = transfers.filter(t => t.type === "departure");
          const rumors = transfers.filter(t => t.type === "rumor");
          return (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42", background: "#0d1421" }}>
              <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid #1e2d42" }}>
                <ArrowLeftRight size={13} style={{ color: "#f59e0b" }} />
                <span className="font-bold text-sm" style={{ color: "#e8edf5" }}>Mercato</span>
                <div className="ml-auto flex items-center gap-2 text-xs">
                  {arrivals.length > 0 && <span style={{ color: "#22c55e" }}>🟢 {arrivals.length} arrivée{arrivals.length > 1 ? "s" : ""}</span>}
                  {departures.length > 0 && <span style={{ color: "#ef4444" }}>🔴 {departures.length} départ{departures.length > 1 ? "s" : ""}</span>}
                  {rumors.length > 0 && <span style={{ color: "#f59e0b" }}>🟡 {rumors.length} rumeur{rumors.length > 1 ? "s" : ""}</span>}
                </div>
              </div>
              {/* Summary grid */}
              {(arrivals.length > 0 || departures.length > 0) && (
                <div className="grid grid-cols-2 gap-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="px-3 py-2" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#22c55e" }}>Arrivées</p>
                    {arrivals.length === 0
                      ? <p className="text-[10px]" style={{ color: "#6b7c96" }}>Aucune</p>
                      : arrivals.slice(0, 4).map((t, i) => (
                          <a key={i} href={t.url || "#"} target="_blank" rel="noopener noreferrer"
                            className="block text-[10px] leading-snug mb-1 hover:opacity-70 truncate" style={{ color: "#cbd5e1" }}>
                            ↗ {t.title.slice(0, 45)}{t.title.length > 45 ? "…" : ""}
                          </a>
                        ))
                    }
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#ef4444" }}>Départs</p>
                    {departures.length === 0
                      ? <p className="text-[10px]" style={{ color: "#6b7c96" }}>Aucun</p>
                      : departures.slice(0, 4).map((t, i) => (
                          <a key={i} href={t.url || "#"} target="_blank" rel="noopener noreferrer"
                            className="block text-[10px] leading-snug mb-1 hover:opacity-70 truncate" style={{ color: "#cbd5e1" }}>
                            ↙ {t.title.slice(0, 45)}{t.title.length > 45 ? "…" : ""}
                          </a>
                        ))
                    }
                  </div>
                </div>
              )}
              {/* Full news list */}
              <div className="px-3 py-2 space-y-1.5">
                {transfers.map((item, i) => {
                  const cfg = TR_CFG[item.type];
                  return (
                    <a key={i} href={item.url || "#"} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors group">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                        style={{ color: cfg.color, background: `${cfg.color}15`, border: `1px solid ${cfg.color}25` }}>
                        {cfg.emoji} {cfg.label}
                      </span>
                      <p className="flex-1 text-xs leading-snug" style={{ color: "#cbd5e1" }}>{item.title}</p>
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-50 group-hover:opacity-100">
                        <span className="text-[9px]" style={{ color: "#6b7c96" }}>{item.source}</span>
                        <ExternalLink size={9} style={{ color: "#6b7c96" }} />
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── TOP JOUEURS (one-versus-one.com) ── */}
        {topPlayers.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42", background: "#0d1421" }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid #1e2d42" }}>
              <Star size={13} style={{ color: "#fbbf24" }} />
              <span className="font-bold text-sm" style={{ color: "#e8edf5" }}>Top Joueurs</span>
              <a href="https://one-versus-one.com/fr/joueurs" target="_blank" rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-[10px] hover:opacity-70 transition-opacity"
                style={{ color: "#6b7c96" }}>
                one-versus-one.com <ExternalLink size={9} />
              </a>
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {topPlayers.map(p => (
                <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  {/* Avatar */}
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      style={{ background: "#1e2d42" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ background: "#1e2d42" }}>
                      <Users size={14} style={{ color: "#6b7c96" }} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate leading-tight" style={{ color: "#e8edf5" }}>{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.goals > 0 && (
                        <span className="text-[10px] font-bold" style={{ color: "#34d399" }}>
                          ⚽ {p.goals}
                        </span>
                      )}
                      {p.assists > 0 && (
                        <span className="text-[10px] font-bold" style={{ color: "#60a5fa" }}>
                          🅰 {p.assists}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── BUZZ SUPPORTERS ── */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42", background: "#0d1421" }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid #1e2d42" }}>
            <Heart size={13} style={{ color: "#f472b6" }} />
            <span className="font-bold text-sm" style={{ color: "#e8edf5" }}>Buzz Supporters</span>
            {buzz && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs font-black px-2 py-0.5 rounded-lg"
                  style={{ color: buzzColor, background: `${buzzColor}15`, border: `1px solid ${buzzColor}25` }}>
                  {buzz.score} — {buzzText}
                </span>
                <span className="text-xs" style={{ color: "#22c55e" }}>+{buzz.positive}</span>
                <span className="text-xs" style={{ color: "#ef4444" }}>-{buzz.negative}</span>
              </div>
            )}
            {loadingBuzz && !buzz && (
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full border border-pink-400 border-t-transparent animate-spin" />
                <span className="text-xs" style={{ color: "#6b7c96" }}>Analyse…</span>
              </div>
            )}
          </div>
          <div className="px-3 py-2.5">
            {/* Loading skeleton */}
            {loadingBuzz && !buzz && (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
                ))}
              </div>
            )}
            {/* Synthesis */}
            {buzz && (
              <div className="flex items-start gap-2 mb-2.5 px-3 py-2.5 rounded-xl"
                style={{ background: `${buzzColor}10`, border: `1px solid ${buzzColor}25` }}>
                {buzz.score >= 55
                  ? <TrendingUp size={14} style={{ color: buzzColor, flexShrink: 0, marginTop: 1 }} />
                  : buzz.score <= 44
                  ? <TrendingDown size={14} style={{ color: buzzColor, flexShrink: 0, marginTop: 1 }} />
                  : <Info size={14} style={{ color: buzzColor, flexShrink: 0, marginTop: 1 }} />
                }
                <div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: buzzColor }}>Synthèse</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#cbd5e1" }}>
                    {buzz.synthesis || (buzz.total === 0 ? "Aucun article récent trouvé pour ce club." : `${buzz.positive} articles positifs, ${buzz.negative} négatifs sur ${buzz.total} analysés.`)}
                  </p>
                </div>
              </div>
            )}

            {buzz && buzz.items.length > 0 && (
              <div className="space-y-1.5">
                {buzz.items.slice(0, 8).map((item, i) => {
                  const sc = item.sentiment === "positive" ? "#34d399" : item.sentiment === "negative" ? "#f87171" : "#64748b";
                  return (
                    <div key={i} className="rounded-lg px-3 py-2 flex items-start gap-2.5"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1a2235" }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: sc }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-snug" style={{ color: "#cbd5e1" }}>{item.title}</p>
                      </div>
                      <span className="text-[9px] flex-shrink-0 mt-0.5" style={{ color: "#475569" }}>{item.source}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RÉSULTATS + PROCHAINS ── */}
        {(matches?.recent?.length || matches?.upcoming?.length) ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {matches?.recent && matches.recent.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42", background: "#0d1421" }}>
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid #1e2d42" }}>
                  <Trophy size={13} style={{ color: "#f59e0b" }} />
                  <span className="font-bold text-sm" style={{ color: "#e8edf5" }}>Derniers résultats</span>
                  {standings.length > 0 && (
                    <span className="text-[9px] ml-auto px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#6b7c96" }}>
                      Préd. = prédiction
                    </span>
                  )}
                </div>
                <div className="px-2 py-1">
                  {matches.recent.map(m => <MatchRow key={m.id} match={m} teamId={teamId} standings={standings} />)}
                </div>
              </div>
            )}
            {matches?.upcoming && matches.upcoming.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42", background: "#0d1421" }}>
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid #1e2d42" }}>
                  <Calendar size={13} style={{ color: "#a78bfa" }} />
                  <span className="font-bold text-sm" style={{ color: "#e8edf5" }}>Prochains matchs</span>
                </div>
                <div className="px-2 py-1">
                  {matches.upcoming.map(m => <MatchRow key={m.id} match={m} teamId={teamId} standings={standings} />)}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* ── SCORE ÉMOTIONNEL ── */}
        {emotional && (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42", background: "#0d1421" }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid #1e2d42" }}>
              <Heart size={13} style={{ color: "#f472b6" }} />
              <span className="font-bold text-sm" style={{ color: "#e8edf5" }}>Score Émotionnel</span>
              <span className="ml-auto text-xl font-black" style={{ color: ec(emotional.emotionalScore) }}>
                {emotional.emotionalScore}
              </span>
            </div>
            <div className="px-4 py-3 space-y-2">
              <ScoreBar label="Économique" score={emotional.components.economic.score} color="#f59e0b" weight="28%" />
              <ScoreBar label="Médias" score={emotional.components.media.score} color="#00d4ff" weight="28%" />
              <ScoreBar label="Humain" score={emotional.components.human.score} color="#22c55e" weight="30%" />
              {emotional.components.fan && (
                <ScoreBar label="Supporters" score={emotional.components.fan.score} color="#f472b6" weight="14%" />
              )}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 text-xs" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <p style={{ color: "#6b7c96" }}>Propriétaire</p>
                  <p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>{emotional.components.economic.owner}</p>
                </div>
                <div>
                  <p style={{ color: "#6b7c96" }}>Revenus estimés</p>
                  <p className="font-semibold mt-0.5" style={{ color: "#e8edf5" }}>{emotional.components.economic.revenue}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── EFFECTIF (collapsible) ── */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42", background: "#0d1421" }}>
          <button onClick={() => setSquadOpen(o => !o)}
            className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
            style={{ borderBottom: squadOpen ? "1px solid #1e2d42" : "none" }}>
            <Users size={13} style={{ color: "#00d4ff" }} />
            <span className="font-bold text-sm flex-1 text-left" style={{ color: "#e8edf5" }}>
              Effectif — {squadStats.playerCount} joueurs
            </span>
            {squadStats.injuredCount > 0 && (
              <span className="flex items-center gap-1 text-xs mr-2" style={{ color: "#f97316" }}>
                <AlertTriangle size={11} />{squadStats.injuredCount} blessé{squadStats.injuredCount > 1 ? "s" : ""}
              </span>
            )}
            {squadStats.totalValue > 0 && (
              <span className="text-xs mr-2 font-bold" style={{ color: "#00d4ff" }}>{fv(squadStats.totalValue)}</span>
            )}
            <ChevronDown size={14} style={{ color: "#6b7c96" }} className={`flex-shrink-0 transition-transform ${squadOpen ? "rotate-180" : ""}`} />
          </button>

          {squadOpen && (
            <div className="px-3 py-2 space-y-3">
              {squadStats.playerCount === 0 && (
                <div className="py-4 text-center">
                  <p className="text-xs" style={{ color: "#6b7c96" }}>Données Transfermarkt indisponibles (API temporairement limitée).</p>
                  <a href={`https://www.transfermarkt.fr/`} target="_blank" rel="noopener noreferrer"
                    className="text-xs mt-1 inline-flex items-center gap-1 hover:opacity-70" style={{ color: "#00d4ff" }}>
                    Voir sur Transfermarkt <ExternalLink size={10} />
                  </a>
                </div>
              )}
              {squadStats.injuredCount > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {squadStats.injured.map(p => (
                    <span key={p.name} className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{ background: "rgba(249,115,22,0.1)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)" }}>
                      <AlertTriangle size={9} />{p.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5 px-1 pb-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="flex-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6b7c96" }}>Joueur</span>
                <span className="text-[10px] font-bold uppercase tracking-widest w-14 text-right" style={{ color: "#6b7c96" }}>Forme</span>
                <span className="text-[10px] font-bold uppercase tracking-widest w-6 text-right hidden sm:block" style={{ color: "#6b7c96" }}>Âge</span>
                <span className="text-[10px] font-bold uppercase tracking-widest w-12 text-right" style={{ color: "#6b7c96" }}>Cote</span>
              </div>
              {Object.entries(byPos).map(([pos, players]) => (
                <div key={pos}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
                    style={{ color: POS_COL[pos] ?? "#6b7c96" }}>{POS_FR[pos] ?? pos}</p>
                  {players.map(p => {
                    const inj = p.status?.toLowerCase().includes("injury");
                    const fb = p.formBadge;
                    const fbc: Record<string, string> = { hot: "#ef4444", good: "#22c55e", neutral: "", cold: "#94a3b8" };
                    const fbe: Record<string, string> = { hot: "🔥", good: "⚡", neutral: "", cold: "❄️" };
                    // Form score (0–100) based on formBadge + goals/assists
                    const formScore = inj ? 20 : fb === "hot" ? 90 : fb === "good" ? 70 : fb === "cold" ? 30 : 50;
                    const formColor = ec(formScore);
                    return (
                      <button key={p.id}
                        onClick={() => setExpandedPlayer(p)}
                        className="w-full flex items-center gap-1.5 py-1 px-1 rounded hover:bg-white/[0.04] text-left transition-colors"
                        style={{ background: inj ? "rgba(249,115,22,0.03)" : "transparent" }}>
                        {/* Photo thumbnail */}
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0"
                            style={{ border: `1px solid ${POS_COL[pos] ?? "#6b7c96"}30` }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <span className="text-[9px] font-bold w-5 h-5 text-center rounded flex-shrink-0 flex items-center justify-center"
                            style={{ background: `${POS_COL[pos] ?? "#6b7c96"}15`, color: POS_COL[pos] ?? "#6b7c96", padding: "1px 0" }}>
                            {POS_SHORT[pos] ?? "?"}
                          </span>
                        )}
                        {inj && <AlertTriangle size={9} className="text-orange-400 flex-shrink-0" />}
                        <span className="flex-1 text-xs truncate" style={{ color: inj ? "#f97316" : "#e8edf5" }}>{p.name}</span>
                        {/* Form column: emoji + score bar */}
                        <div className="flex items-center gap-1 flex-shrink-0 w-14 justify-end">
                          {fb && fb !== "neutral" && fbe[fb] && <span style={{ fontSize: 10 }}>{fbe[fb]}</span>}
                          <span className="text-xs font-black" style={{ color: formColor }}>{formScore}</span>
                          <div className="w-8 h-1 rounded-full overflow-hidden flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
                            <div className="h-full rounded-full" style={{ width: `${formScore}%`, background: formColor }} />
                          </div>
                        </div>
                        <span className="text-[10px] hidden sm:block w-6 text-right flex-shrink-0" style={{ color: "#6b7c96" }}>{p.age}</span>
                        {(p.usGoals ?? p.recentGoals ?? 0) > 0 && (
                          <span className="text-[10px]" style={{ color: "#f59e0b" }}>⚽{p.usGoals ?? p.recentGoals}</span>
                        )}
                        {(p.xG ?? 0) > 0 && (
                          <span className="text-[10px]" style={{ color: "#22c55e" }}>xG{(p.xG!).toFixed(1)}</span>
                        )}
                        <span className="text-xs font-mono font-bold w-12 text-right flex-shrink-0"
                          style={{ color: p.marketValue > 20_000_000 ? "#00d4ff" : p.marketValue > 5_000_000 ? "#e8edf5" : "#6b7c96" }}>
                          {p.marketValue > 0 ? fv(p.marketValue) : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pb-6 pt-1">
          <Link href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-80 transition-all"
            style={{ background: "rgba(0,212,255,0.07)", border: "1px solid rgba(0,212,255,0.18)", color: "#00d4ff" }}>
            <ArrowLeft size={12} />Foot Predictom
          </Link>
          <p className="text-[10px]" style={{ color: "#6b7c96" }}>
            Sources : football-data.org · Transfermarkt · L&apos;Équipe
          </p>
        </div>
      </div>
    </main>
  );
}
