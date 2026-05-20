"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Users, Warning, Trophy, TrendUp,
  ArrowsLeftRight, Star, Calendar, Heart,
  Info, CaretDown, ArrowSquareOut, Briefcase, CurrencyDollar,
  TrendDown, X,
} from "@phosphor-icons/react";

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

// Club banner photos (action / atmosphere shots from Wikimedia Commons)
const CLUB_BANNERS: Record<number, string> = {
  524:  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Parc_des_Princes_-_20130116_2.jpg/1200px-Parc_des_Princes_-_20130116_2.jpg",
  548:  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Stade_Louis_II.jpg/1200px-Stade_Louis_II.jpg",
  516:  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Stade_Velodrome_Marseille.jpg/1200px-Stade_Velodrome_Marseille.jpg",
  521:  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Stade_Pierre-Mauroy.jpg/1200px-Stade_Pierre-Mauroy.jpg",
  529:  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Stade_de_la_Route_de_Lorient_Rennes.JPG/1200px-Stade_de_la_Route_de_Lorient_Rennes.JPG",
  522:  "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Allianz_Riviera_panorama.jpg/1200px-Allianz_Riviera_panorama.jpg",
  546:  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Stade_Bollaert-Delelis.jpg/1200px-Stade_Bollaert-Delelis.jpg",
  523:  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Groupama_Stadium_-_Lyon_%28D%C3%A9cines%29.jpg/1200px-Groupama_Stadium_-_Lyon_%28D%C3%A9cines%29.jpg",
  576:  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Stade_Meinau_2012.JPG/1200px-Stade_Meinau_2012.JPG",
  511:  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Stadium_de_Toulouse.jpg/1200px-Stadium_de_Toulouse.jpg",
  512:  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Stade_Francis_Le_Ble_Brest.jpg/1200px-Stade_Francis_Le_Ble_Brest.jpg",
  532:  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Stade_Jean-Bouin_Angers.JPG/1200px-Stade_Jean-Bouin_Angers.JPG",
  533:  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Stade_Oceane_Le_Havre.jpg/1200px-Stade_Oceane_Le_Havre.jpg",
  519:  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Stade_de_l%27Abb%C3%A9-Deschamps.jpg/1200px-Stade_de_l%27Abb%C3%A9-Deschamps.jpg",
  543:  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Stade_de_la_Beaujoire.JPG/1200px-Stade_de_la_Beaujoire.JPG",
  545:  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Stade_Saint_Symphorien_Metz.jpg/1200px-Stade_Saint_Symphorien_Metz.jpg",
  525:  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Stade_du_Moustoir_Lorient.jpg/1200px-Stade_du_Moustoir_Lorient.jpg",
  1045: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Stade_Charl%C3%A9ty.jpg/1200px-Stade_Charl%C3%A9ty.jpg",
};

// Club primary colors for gradient fallback
const CLUB_COLORS: Record<number, { primary: string; secondary: string }> = {
  524:  { primary: "#0033a0", secondary: "#dc143c" },
  548:  { primary: "#d4af37", secondary: "#e41f20" },
  516:  { primary: "#00a0e4", secondary: "#ffffff" },
  521:  { primary: "#c8102e", secondary: "#ffd700" },
  529:  { primary: "#e41e20", secondary: "#000000" },
  522:  { primary: "#e30a17", secondary: "#000000" },
  546:  { primary: "#e31e24", secondary: "#ffd700" },
  523:  { primary: "#c8102e", secondary: "#0033a0" },
  576:  { primary: "#00529f", secondary: "#ffffff" },
  511:  { primary: "#6a1de0", secondary: "#ffffff" },
  512:  { primary: "#c8102e", secondary: "#003da5" },
  532:  { primary: "#1a1a1a", secondary: "#ffffff" },
  533:  { primary: "#0033a0", secondary: "#ffffff" },
  519:  { primary: "#003399", secondary: "#ffffff" },
  543:  { primary: "#ffd700", secondary: "#00671c" },
  545:  { primary: "#8b0000", secondary: "#000000" },
  525:  { primary: "#1a1a1a", secondary: "#ff6600" },
  1045: { primary: "#003da5", secondary: "#e4002b" },
};

function stadiumUrl(id: number): string {
  // Use the direct CDN URL first, fall back to Special:FilePath
  return CLUB_BANNERS[id] ?? (STADIUM_IMAGES[id]?.file
    ? `https://commons.wikimedia.org/wiki/Special:FilePath/${STADIUM_IMAGES[id].file}?width=1000`
    : "");
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
  xG?: number; xA?: number; usGoals?: number; usAssists?: number;
  shots?: number; minutes?: number; games?: number;
  // Datamb — core
  dm_goals90?: number; dm_assists90?: number; dm_xg90?: number; dm_xa90?: number;
  dm_shots90?: number; dm_keyPasses90?: number; dm_dribbles90?: number;
  dm_dribblePct?: number; dm_defDuels90?: number; dm_defDuelPct?: number;
  dm_interceptions90?: number; dm_aerialPct?: number; dm_passPct?: number;
  dm_progressive90?: number; dm_savePct?: number; dm_gcPer90?: number;
  dm_cleanSheets?: number; dm_xgxa90?: number; dm_minPerMatch?: number; dm_team?: string;
  // Datamb — extra
  dm_shotsOnTarget?: number; dm_goalConversion?: number; dm_touchesBox90?: number;
  dm_possWon90?: number; dm_npxg90?: number; dm_duelsWonPct?: number;
  dm_crosses90?: number; dm_crossAcc?: number; dm_fouls90?: number;
  dm_tackles90?: number; dm_yellowCards90?: number; dm_saves90?: number; dm_exits90?: number;
  // Datamb — full
  dm_minutes?: number; dm_matches?: number; dm_touches90?: number;
  dm_ga90?: number; dm_npga90?: number; dm_npGoals90?: number; dm_headedGoals90?: number;
  dm_xgShot?: number; dm_npxgShot?: number; dm_npxgXa90?: number; dm_goalsMinusXg90?: number;
  dm_possLost90?: number; dm_possBalance?: number; dm_progressiveActions90?: number;
  dm_successfulDribbles90?: number; dm_offDuels90?: number; dm_offDuelPct?: number;
  dm_offDuelWon90?: number; dm_accelerations90?: number; dm_duels90?: number;
  dm_passes90?: number; dm_fwdPasses90?: number; dm_fwdPassPct?: number;
  dm_longPasses90?: number; dm_longPassAcc?: number; dm_avgPassLength?: number;
  dm_passesRec90?: number; dm_foulsSuffered90?: number;
  dm_shotAssists90?: number; dm_preAssists90?: number;
  dm_passesToFinal90?: number; dm_passFinalPct?: number;
  dm_passesToBox90?: number; dm_throughPasses90?: number; dm_throughPassPct?: number;
  dm_progressivePasses90?: number; dm_progressivePassAcc?: number;
  dm_deepCompletions90?: number; dm_xaPer100?: number;
  dm_chanceCreation?: number; dm_inaccuratePct?: number;
  dm_aerialDuels90?: number; dm_aerialWon90?: number;
  dm_shotsBlocked90?: number; dm_redCards90?: number;
  dm_gcTotal?: number; dm_xgConceded90?: number; dm_preventedGoals90?: number;
  dm_backPassesGK90?: number; dm_shotsConceded90?: number;
  // Datamb — finishing & penalties
  dm_goalsPerXg?: number; dm_shotsOnTarget90?: number;
  dm_penaltiesScored?: number; dm_penaltiesAttempted?: number;
  // Datamb — creation advanced
  dm_crossesToBox90?: number; dm_thirdAssists90?: number;
  dm_smartPasses90?: number; dm_smartPassAcc?: number;
  // Datamb — extra volume
  dm_duelsWon90?: number; dm_misplacedPasses90?: number;
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
          <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 font-semibold"
            style={{ background: "rgba(249,115,22,0.12)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)" }}>
            {predCorrect ? "✓" : "✗"} Préd.{predForTeam === "win" ? "V" : predForTeam === "draw" ? "N" : "D"}
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

function DmStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg py-1.5 px-1.5" style={{ background: "rgba(255,255,255,0.04)", minWidth: 50 }}>
      <span className="text-xs font-black leading-none" style={{ color: color ?? "#e8edf5" }}>{value}</span>
      <span className="text-[8px] mt-1 text-center leading-tight" style={{ color: "#6b7c96" }}>{label}</span>
    </div>
  );
}

function DmSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2.5">
      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#6b7c96" }}>{title}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function fmt2m(v?: number) { return v != null && v > 0 ? v.toFixed(2) : "—"; }
function fmt1m(v?: number) { return v != null && v > 0 ? v.toFixed(1) : "—"; }
function pctm(v?: number)  { return v != null && v > 0 ? `${v.toFixed(0)}%` : "—"; }

function PlayerModal({ player, onClose }: { player: SquadPlayer; onClose: () => void }) {
  const isInj = player.status?.toLowerCase().includes("injury");
  const posColor = POS_COL[player.position] ?? "#6b7c96";
  const isGk  = player.position === "Goalkeeper";
  const isDef = player.position === "Defender";
  const isMid = player.position === "Midfielder";
  const isWing = player.position === "Winger";
  const isFwd = player.position === "Centre-Forward";
  const hasUnderstat = (player.games ?? 0) > 0;
  const hasDatamb = (player.dm_minutes ?? 0) > 0 || (player.dm_xg90 ?? 0) > 0 || (player.dm_savePct ?? 0) > 0;
  const dmCtx = hasDatamb ? `${player.dm_matches ?? "?"} matchs · ${player.dm_minutes ?? player.minutes ?? "?"} min` : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.85)" }} onClick={onClose}>
      <div className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden"
        style={{ background: "#0d1421", border: "1px solid #1e2d42", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #1e2d42", background: "rgba(255,255,255,0.02)" }}>
          {player.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.imageUrl} alt={player.name}
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
              style={{ border: `2px solid ${posColor}40` }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${posColor}15`, border: `2px solid ${posColor}30` }}>
              <Users size={18} style={{ color: posColor }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm truncate" style={{ color: isInj ? "#f97316" : "#e8edf5" }}>
              {isInj && <Warning size={11} className="inline mr-1 text-orange-400" />}
              {player.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Chip color={posColor}>{POS_FR[player.position] ?? player.position}</Chip>
              {player.nationality?.[0] && <span className="text-xs" style={{ color: "#6b7c96" }}>{player.nationality[0]}</span>}
              {(player.marketValue ?? 0) > 0 && <span className="text-xs font-bold ml-auto" style={{ color: "#00d4ff" }}>{fv(player.marketValue)}</span>}
            </div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1 rounded-lg hover:bg-white/[0.06]">
            <X size={14} style={{ color: "#6b7c96" }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-0">

          {/* Bio */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-3">
            {player.dateOfBirth && <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>Né </span>{new Date(player.dateOfBirth).toLocaleDateString("fr-FR")} ({player.age} ans)</span>}
            {(player.height ?? 0) > 0 && <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>Taille </span>{player.height} cm</span>}
            {player.foot && <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>Pied </span>{player.foot}</span>}
            {player.signedFrom && <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>De </span>{player.signedFrom}</span>}
            {player.contract && <span style={{ color: "#94a3b8" }}><span style={{ color: "#6b7c96" }}>Contrat → </span>{player.contract}</span>}
          </div>

          {/* Understat saison */}
          {hasUnderstat && (
            <DmSection title={`Saison · ${player.games} matchs · ${player.minutes} min`}>
              <DmStat label="Buts"     value={player.usGoals ?? 0}             color="#f59e0b" />
              <DmStat label="PD"       value={player.usAssists ?? 0}           color="#00d4ff" />
              <DmStat label="xG"       value={(player.xG ?? 0).toFixed(1)}     color="#22c55e" />
              <DmStat label="xA"       value={(player.xA ?? 0).toFixed(1)}     color="#a78bfa" />
              {(player.shots ?? 0) > 0 && <DmStat label="Tirs"  value={player.shots ?? 0}  color="#94a3b8" />}
              {(player.shots ?? 0) > 0 && <DmStat label="xG/tir" value={((player.xG ?? 0) / (player.shots ?? 1)).toFixed(3)} color="#6b7c96" />}
            </DmSection>
          )}

          {/* GK stats */}
          {hasDatamb && isGk && (<>
            <DmSection title={`Gardien — ${dmCtx}`}>
              <DmStat label="Arrêts %"    value={pctm(player.dm_savePct)}         color="#00d4ff" />
              <DmStat label="Arrêts/90"   value={fmt1m(player.dm_saves90)}        color="#00d4ff" />
              <DmStat label="BC/90"       value={fmt2m(player.dm_gcPer90)}        color="#ef4444" />
              <DmStat label="xG enc./90"  value={fmt2m(player.dm_xgConceded90)}   color="#f97316" />
              <DmStat label="Prév./90"    value={fmt2m(player.dm_preventedGoals90)} color="#22c55e" />
              <DmStat label="CS"          value={player.dm_cleanSheets ?? 0}      color="#22c55e" />
              <DmStat label="Sorties/90"  value={fmt1m(player.dm_exits90)}        color="#a78bfa" />
              <DmStat label="Tirs conc."  value={fmt1m(player.dm_shotsConceded90)} color="#6b7c96" />
            </DmSection>
            <DmSection title="Jeu au pied">
              <DmStat label="Pass %"      value={pctm(player.dm_passPct)}         color="#00d4ff" />
              <DmStat label="Longues/90"  value={fmt1m(player.dm_longPasses90)}   color="#94a3b8" />
              <DmStat label="Longues %"   value={pctm(player.dm_longPassAcc)}     color="#94a3b8" />
              <DmStat label="Passes/90"   value={fmt1m(player.dm_passes90)}       color="#6b7c96" />
            </DmSection>
          </>)}

          {/* Outfield stats */}
          {hasDatamb && !isGk && (<>

            <DmSection title={`Vue d'ensemble — ${dmCtx}`}>
              <DmStat label="G+A/90"       value={fmt2m(player.dm_ga90)}          color="#f59e0b" />
              <DmStat label="xG+xA/90"     value={fmt2m(player.dm_xgxa90)}        color="#22c55e" />
              <DmStat label="npxG+xA/90"   value={fmt2m(player.dm_npxgXa90)}      color="#22c55e" />
              <DmStat label="Touches/90"   value={fmt1m(player.dm_touches90)}     color="#6b7c96" />
              <DmStat label="Prog./90"     value={fmt1m(player.dm_progressiveActions90)} color="#a78bfa" />
              <DmStat label="Poss. +/-"    value={fmt1m(player.dm_possBalance)}   color={(player.dm_possBalance ?? 0) >= 0 ? "#22c55e" : "#ef4444"} />
            </DmSection>

            {(isFwd || isWing || isMid) && (
              <DmSection title="Attaque &amp; Finition">
                <DmStat label="Buts/90"     value={fmt2m(player.dm_goals90)}       color="#f59e0b" />
                <DmStat label="xG/90"       value={fmt2m(player.dm_xg90)}          color="#22c55e" />
                <DmStat label="npxG/90"     value={fmt2m(player.dm_npxg90)}        color="#22c55e" />
                <DmStat label="Buts/xG"     value={fmt2m(player.dm_goalsPerXg)}    color={(player.dm_goalsPerXg ?? 0) >= 1 ? "#22c55e" : "#f59e0b"} />
                <DmStat label="Tirs/90"     value={fmt1m(player.dm_shots90)}       color="#94a3b8" />
                <DmStat label="Cadrés/90"   value={fmt1m(player.dm_shotsOnTarget90)} color="#f59e0b" />
                <DmStat label="Cadrés %"    value={pctm(player.dm_shotsOnTarget)}  color="#f59e0b" />
                <DmStat label="Conv. %"     value={pctm(player.dm_goalConversion)} color="#ef4444" />
                {(player.dm_penaltiesAttempted ?? 0) > 0 && <DmStat label="Pen. tentés" value={player.dm_penaltiesAttempted ?? 0} color="#f97316" />}
                {(player.dm_penaltiesScored ?? 0) > 0 && <DmStat label="Pen. inscrits" value={player.dm_penaltiesScored ?? 0} color="#22c55e" />}
                {!isDef && <DmStat label="Zone/90" value={fmt1m(player.dm_touchesBox90)} color="#f97316" />}
              </DmSection>
            )}

            <DmSection title="Création">
              <DmStat label="xA/90"         value={fmt2m(player.dm_xa90)}          color="#a78bfa" />
              <DmStat label="PD/90"         value={fmt2m(player.dm_assists90)}     color="#00d4ff" />
              <DmStat label="Shot ast./90"  value={fmt1m(player.dm_shotAssists90)} color="#a78bfa" />
              <DmStat label="Pré-PD/90"     value={fmt1m(player.dm_preAssists90)}  color="#a78bfa" />
              <DmStat label="3e PD/90"      value={fmt1m(player.dm_thirdAssists90)} color="#a78bfa" />
              <DmStat label="Passes clés"   value={fmt1m(player.dm_keyPasses90)}   color="#a78bfa" />
              <DmStat label="Smart/90"      value={fmt1m(player.dm_smartPasses90)} color="#22c55e" />
              <DmStat label="Smart %"       value={pctm(player.dm_smartPassAcc)}   color="#22c55e" />
              {(isWing || isFwd) && <DmStat label="Cross. box/90" value={fmt1m(player.dm_crossesToBox90)} color="#f59e0b" />}
              {(isWing) && <DmStat label="Crosses/90" value={fmt1m(player.dm_crosses90)} color="#f59e0b" />}
              {(isWing) && <DmStat label="Cross. prec." value={pctm(player.dm_crossAcc)} color="#f59e0b" />}
              <DmStat label="Prof./90"      value={fmt1m(player.dm_deepCompletions90)} color="#22c55e" />
            </DmSection>

            {(isMid || isDef || isWing) && (
              <DmSection title="Passes">
                <DmStat label="Passes/90"   value={fmt1m(player.dm_passes90)}      color="#00d4ff" />
                <DmStat label="Pass %"      value={pctm(player.dm_passPct)}        color="#00d4ff" />
                <DmStat label="Imprécis %"  value={pctm(player.dm_inaccuratePct)}  color="#ef4444" />
                <DmStat label="Avant %"     value={pctm(player.dm_fwdPassPct)}     color="#22c55e" />
                <DmStat label="Longues %"   value={pctm(player.dm_longPassAcc)}    color="#94a3b8" />
                <DmStat label="Prog./90"    value={fmt1m(player.dm_progressivePasses90)} color="#a78bfa" />
                <DmStat label="Prog. %"     value={pctm(player.dm_progressivePassAcc)} color="#a78bfa" />
                <DmStat label="Vers box/90" value={fmt1m(player.dm_passesToBox90)} color="#f59e0b" />
              </DmSection>
            )}

            <DmSection title="Dribbles &amp; Duels">
              <DmStat label="Drib. %"       value={pctm(player.dm_dribblePct)}     color="#f59e0b" />
              <DmStat label="Drib./90"      value={fmt1m(player.dm_dribbles90)}    color="#f59e0b" />
              <DmStat label="Accél./90"     value={fmt1m(player.dm_accelerations90)} color="#94a3b8" />
              <DmStat label="Duels/90"      value={fmt1m(player.dm_duels90)}       color="#94a3b8" />
              <DmStat label="Duels gagnés"  value={fmt1m(player.dm_duelsWon90)}    color="#94a3b8" />
              <DmStat label="Duels %"       value={pctm(player.dm_duelsWonPct)}    color="#94a3b8" />
            </DmSection>

            <DmSection title="Défense">
              <DmStat label="Déf. duel/90"  value={fmt1m(player.dm_defDuels90)}    color="#a78bfa" />
              <DmStat label="Déf. duel %"   value={pctm(player.dm_defDuelPct)}     color="#a78bfa" />
              <DmStat label="Int./90"        value={fmt2m(player.dm_interceptions90)} color="#ef4444" />
              <DmStat label="Tacles/90"      value={fmt1m(player.dm_tackles90)}    color="#ef4444" />
              <DmStat label="Aérien %"       value={pctm(player.dm_aerialPct)}     color="#f59e0b" />
              <DmStat label="Poss. gagnées"  value={fmt1m(player.dm_possWon90)}    color="#22c55e" />
              <DmStat label="Poss. perdues"  value={fmt1m(player.dm_possLost90)}   color="#ef4444" />
            </DmSection>

            <DmSection title="Discipline">
              <DmStat label="Fautes/90"     value={fmt1m(player.dm_fouls90)}       color="#f97316" />
              <DmStat label="Jaunes/90"     value={fmt2m(player.dm_yellowCards90)} color="#f59e0b" />
            </DmSection>
          </>)}

          {!hasUnderstat && !hasDatamb && (
            <p className="text-xs py-2" style={{ color: "#6b7c96" }}>Statistiques non disponibles.</p>
          )}

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
        <CaretDown size={11} style={{ color: "#6b7c96" }} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
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

// ── Club loading screen ───────────────────────────────────────────────────────
// Minimal, pro indicator: a thin indeterminate progress bar at the very
// top of the viewport (tinted with the club color) + a single centred
// caption. No banner shimmer, no terminal, no skeleton cards.

function ClubLoadingScreen({ teamId }: { teamId: number }) {
  const colors = CLUB_COLORS[teamId];
  const primary = colors?.primary ?? "#0033a0";

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "#080c14" }}>
      {/* Indeterminate top progress bar — visible but not heavy */}
      <div className="fixed top-0 inset-x-0 h-[3px] overflow-hidden z-50"
        style={{ background: `${primary}15` }}>
        <div className="absolute inset-y-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${primary}, transparent)`,
            width: "40%",
            boxShadow: `0 0 8px ${primary}aa`,
            animation: "clubLoadSlide 1.3s ease-in-out infinite",
          }}/>
      </div>

      {/* Centred caption */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full animate-spin"
            style={{ border: `1.5px solid ${primary}30`, borderTopColor: primary }}/>
          <span className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "#6b7c96" }}>
            Chargement de la fiche
          </span>
        </div>
      </div>

      <style>{`
        @keyframes clubLoadSlide {
          0%   { left: -35%; }
          100% { left: 100%; }
        }
      `}</style>
    </main>
  );
}

// ── Name-matching helpers (cross-reference 1vs1 names ↔ squad names) ──────────

function normName(s: string) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z ]/g, "").trim();
}

function findSquadMatch(name: string, squad: SquadPlayer[]): SquadPlayer | undefined {
  const norm = normName(name);
  // 1. Exact normalised match
  let m = squad.find(p => normName(p.name) === norm);
  if (m) return m;
  // 2. Last-name match (longest word)
  const parts = norm.split(" ").filter(w => w.length >= 3);
  const lastName = parts[parts.length - 1];
  if (lastName) {
    m = squad.find(p => {
      const pn = normName(p.name);
      return pn.split(" ").includes(lastName) || pn.endsWith(lastName);
    });
  }
  return m;
}

function find1vs1Player(name: string, players: Array<{name: string; rating: number; goals: number; assists: number; url: string; imageUrl: string}>): {name: string; rating: number; goals: number; assists: number; url: string; imageUrl: string} | undefined {
  const norm = normName(name);
  let m = players.find(p => normName(p.name) === norm);
  if (m) return m;
  const parts = norm.split(" ").filter((w: string) => w.length >= 3);
  const lastName = parts[parts.length - 1];
  if (lastName) {
    m = players.find(p => {
      const pn = normName(p.name);
      return pn.split(" ").includes(lastName) || pn.endsWith(lastName) || norm.includes(pn) || pn.includes(norm);
    });
  }
  return m;
}

// ── Collapsible section wrapper ────────────────────────────────────────────────

function ClubSection({
  title, icon, iconColor, defaultOpen = true, badge, children
}: {
  title: string; icon: React.ReactNode; iconColor: string;
  defaultOpen?: boolean; badge?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42", background: "#0d1421" }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-white/[0.02] text-left"
        style={{ borderBottom: open ? "1px solid #1e2d42" : "none" }}>
        <span style={{ color: iconColor, flexShrink: 0 }}>{icon}</span>
        <span className="font-bold text-sm" style={{ color: "#e8edf5" }}>{title}</span>
        {badge && <span className="ml-1">{badge}</span>}
        <CaretDown size={12} style={{ color: "#6b7c96", marginLeft: "auto", flexShrink: 0 }}
          className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <>{children}</>}
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
  const [topPlayers, setTopPlayers] = useState<{ name: string; url: string; imageUrl: string; rating: number; goals: number; assists: number }[]>([]);
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBuzz, setLoadingBuzz] = useState(false);
  const [stadiumErr, setStadiumErr] = useState(false);
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

        // Use standing data (football-data.org) for accurate season stats
        const formStr = standing && standing.playedGames > 0
          ? `${standing.won}V${standing.draw}N${standing.lost}D`
          : "";
        const analysisParams = new URLSearchParams({
          club: sq?.team?.name ?? String(teamId),
          pos: String(standing?.position ?? ""),
          pts: String(standing?.points ?? ""),
          played: String(standing?.playedGames ?? ""),
          form: formStr,
          gf: String(standing?.goalsFor ?? ""),
          ga: String(standing?.goalsAgainst ?? ""),
          coach: sq?.team?.coach ?? "",
          injured: String(sq?.stats?.injuredCount ?? 0),
          value: sq?.stats?.totalValue ? String(Math.round(sq.stats.totalValue / 1_000_000)) : "",
          recent: recentResults,
        });
        fetch(`/api/club-analysis?${analysisParams}`)
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

  if (loading) return <ClubLoadingScreen teamId={teamId} />;
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

  // Normalize varied Transfermarkt position strings to our 5 canonical groups
  function normalizePos(pos: string): string {
    const p = pos.toLowerCase();
    if (p.includes("goalkeeper") || p === "goalie") return "Goalkeeper";
    if (p.includes("back") || p === "defence" || p === "defender" || p.startsWith("def")) return "Defender";
    if (p.includes("winger") || p.includes("wide") || p.includes("left mid") || p.includes("right mid")) return "Winger";
    if (p.includes("forward") || p === "offence" || p === "striker" || p.includes("attack")) return "Centre-Forward";
    if (p.includes("midfield") || p === "midfield" || p === "midfielder") return "Midfielder";
    return "Midfielder"; // fallback for unrecognised positions
  }

  const byPos = POS_ORDER.reduce<Record<string, SquadPlayer[]>>((acc, p) => {
    const pl = (squad?.squad ?? []).filter(x => normalizePos(x.position) === p);
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
          {(() => {
            const clubColor = CLUB_COLORS[teamId];
            const primary = clubColor?.primary ?? "#0033a0";
            const secondary = clubColor?.secondary ?? "#ffffff";
            return (
              <div className="relative h-52 overflow-hidden">
                {/* Photo du stade / club */}
                {stadImg && !stadiumErr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={stadImg} alt={STADIUM_IMAGES[teamId]?.name ?? team.name ?? ""}
                    className="w-full h-full object-cover"
                    onError={() => setStadiumErr(true)}
                  />
                ) : (
                  /* Fallback : dégradé aux couleurs du club + crest géant */
                  <div className="w-full h-full" style={{
                    background: `linear-gradient(135deg, ${primary}cc 0%, ${secondary}33 50%, ${primary}99 100%)`,
                  }}>
                    {team.crest && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={team.crest} alt=""
                        className="absolute inset-0 m-auto w-40 h-40 object-contain opacity-20"
                        style={{ filter: "blur(2px)" }} />
                    )}
                  </div>
                )}

                {/* Dégradé noir vers le bas */}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 20%, rgba(8,12,20,0.85) 70%, rgba(8,12,20,0.98))" }} />

                {/* Crest + nom + forme en bas */}
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
                  <div className="flex items-end justify-between">
                    <div className="flex items-center gap-3">
                      {team.crest && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.crest} alt="" className="w-14 h-14 object-contain flex-shrink-0 drop-shadow-lg" />
                      )}
                      <div>
                        {STADIUM_IMAGES[teamId] && (
                          <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                            {STADIUM_IMAGES[teamId].name}
                          </p>
                        )}
                        <h1 className="text-2xl font-black leading-tight" style={{ color: "#ffffff", textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
                          {team.name}
                        </h1>
                        {thisTeamStanding && (
                          <p className="text-xs mt-0.5 font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>
                            {thisTeamStanding.position}e · {thisTeamStanding.points} pts
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-1">{recentForm.map((r, i) => <FormDot key={i} result={r} />)}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: `${primary}99`, color: "#ffffff", border: `1px solid ${primary}` }}>
                        Ligue 1
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

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
                  <CurrencyDollar size={11} style={{ color: "#f59e0b", flexShrink: 0 }} />
                  <p className="text-[10px] font-bold uppercase tracking-widest flex-1" style={{ color: "#6b7c96" }}>Économie du club</p>
                  {admin.legalNote && <Chip color="#f59e0b">{admin.legalNote}</Chip>}
                  <CaretDown size={11} style={{ color: "#6b7c96" }} className={`flex-shrink-0 transition-transform ${econOpen ? "rotate-180" : ""}`} />
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
                            {s.label} <ArrowSquareOut size={9} />
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
            <ClubSection title="Mercato" icon={<ArrowsLeftRight size={13} />} iconColor="#f59e0b" defaultOpen={false}
              badge={
                <div className="flex items-center gap-2 text-xs">
                  {arrivals.length > 0 && <span style={{ color: "#22c55e" }}>🟢 {arrivals.length}</span>}
                  {departures.length > 0 && <span style={{ color: "#ef4444" }}>🔴 {departures.length}</span>}
                  {rumors.length > 0 && <span style={{ color: "#f59e0b" }}>🟡 {rumors.length}</span>}
                </div>
              }>
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
                        <ArrowSquareOut size={9} style={{ color: "#6b7c96" }} />
                      </div>
                    </a>
                  );
                })}
              </div>
            </ClubSection>
          );
        })()}

        {/* ── BUZZ SUPPORTERS ── */}
        <ClubSection title="Buzz Supporters" icon={<Heart size={13} />} iconColor="#06b6d4" defaultOpen={false}
          badge={buzz ? <span className="text-xs font-black px-1.5 py-0.5 rounded" style={{ color: buzzColor, background: buzzColor + "15" }}>{buzz.score}</span> : undefined}>
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
                  ? <TrendUp size={14} style={{ color: buzzColor, flexShrink: 0, marginTop: 1 }} />
                  : buzz.score <= 44
                  ? <TrendDown size={14} style={{ color: buzzColor, flexShrink: 0, marginTop: 1 }} />
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
        </ClubSection>

        {/* ── RÉSULTATS + PROCHAINS ── */}
        {(matches?.recent?.length || matches?.upcoming?.length) ? (
          <ClubSection title="Résultats & Matchs" icon={<Trophy size={13} />} iconColor="#f59e0b" defaultOpen={true}>
            <div className="grid sm:grid-cols-2 gap-3 p-3">
              {matches?.recent && matches.recent.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1e2d42", background: "rgba(13,20,33,0.6)" }}>
                  <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid #1e2d42" }}>
                    <Trophy size={11} style={{ color: "#f59e0b" }} />
                    <span className="font-bold text-xs" style={{ color: "#e8edf5" }}>Derniers résultats</span>
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
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1e2d42", background: "rgba(13,20,33,0.6)" }}>
                  <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid #1e2d42" }}>
                    <Calendar size={11} style={{ color: "#a78bfa" }} />
                    <span className="font-bold text-xs" style={{ color: "#e8edf5" }}>Prochains matchs</span>
                  </div>
                  <div className="px-2 py-1">
                    {matches.upcoming.map(m => <MatchRow key={m.id} match={m} teamId={teamId} standings={standings} />)}
                  </div>
                </div>
              )}
            </div>
          </ClubSection>
        ) : null}

        {/* ── SCORE ÉMOTIONNEL ── */}
        {emotional && (
          <ClubSection title="Facteur additionnel" icon={<Heart size={13} />} iconColor="#06b6d4" defaultOpen={false}
            badge={<span className="text-lg font-black" style={{ color: ec(emotional.emotionalScore) }}>{emotional.emotionalScore}</span>}>
            <div className="px-4 py-3 space-y-2">
              <ScoreBar label="Économique" score={emotional.components.economic.score} color="#f59e0b" weight="28%" />
              <ScoreBar label="Médias" score={emotional.components.media.score} color="#00d4ff" weight="28%" />
              <ScoreBar label="Humain" score={emotional.components.human.score} color="#22c55e" weight="30%" />
              {emotional.components.fan && (
                <ScoreBar label="Supporters" score={emotional.components.fan.score} color="#06b6d4" weight="14%" />
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
          </ClubSection>
        )}

        {/* ── JOUEURS ── */}
        <ClubSection title="Joueurs" icon={<Users size={13} />} iconColor="#00d4ff" defaultOpen={true}
          badge={squad ? <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: "rgba(0,212,255,0.12)", color: "#00d4ff" }}>{squad.squad.length}</span> : undefined}>

          {/* Column headers */}
          <div className="grid px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
            style={{ gridTemplateColumns: "1fr 56px 60px 40px 28px 28px 48px 48px 64px", borderBottom: "1px solid rgba(255,255,255,0.04)", color: "#6b7c96" }}>
            <span>Joueur</span>
            <span className="text-center">Poste</span>
            <span className="text-center" style={{ color: "#fbbf24" }}>Forme</span>
            <span className="text-center" style={{ color: "#fbbf24" }}>1vs1</span>
            <span className="text-center" style={{ color: "#34d399" }}>⚽</span>
            <span className="text-center" style={{ color: "#60a5fa" }}>🅰</span>
            <span className="text-center hidden sm:block" style={{ color: "#22c55e" }}>xG/90</span>
            <span className="text-center hidden sm:block" style={{ color: "#a78bfa" }}>xA/90</span>
            <span className="text-right" style={{ color: "#00d4ff" }}>Cote</span>
          </div>

          {squadStats.playerCount === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs" style={{ color: "#6b7c96" }}>Données joueurs indisponibles.</p>
            </div>
          ) : (
            <div>
              {Object.entries(byPos).map(([pos, players]) => (
                <div key={pos}>
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: POS_COL[pos] ?? "#6b7c96", background: "rgba(255,255,255,0.01)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    {POS_FR[pos] ?? pos} <span style={{ color: "#4b5563" }}>({players.length})</span>
                  </p>
                  {players.map(p => {
                    const inj = p.status?.toLowerCase().includes("injury");
                    const fb = p.formBadge;
                    // Use pFormScore/pFormColor to avoid shadowing module-level formScore function
                    // Position-aware form score using datamb metrics
                    const pFormScore = (() => {
                      if (inj) return 20;
                      // GK: use save %
                      if (pos === "Goalkeeper") {
                        const sp = p.dm_savePct ?? 0;
                        if (sp >= 78) return 88; if (sp >= 68) return 72; if (sp >= 55) return 55; if (sp > 0) return 40; return fb === "hot" ? 85 : fb === "good" ? 70 : fb === "cold" ? 30 : 50;
                      }
                      // DEF: defensive duel % + aerial % + interceptions
                      if (pos === "Defender") {
                        const defScore = (p.dm_defDuelPct ?? 0) * 0.45 + (p.dm_aerialPct ?? 0) * 0.3 + Math.min((p.dm_interceptions90 ?? 0) * 25, 25);
                        if (defScore >= 65) return 90; if (defScore >= 48) return 75; if (defScore >= 30) return 58; if (defScore > 0) return 42; return fb === "hot" ? 85 : fb === "good" ? 70 : fb === "cold" ? 30 : 50;
                      }
                      // MID: xG+xA + pass % weighted
                      if (pos === "Midfielder") {
                        const xCombo = (p.dm_xg90 ?? 0) + (p.dm_xa90 ?? 0);
                        const passBon = (p.dm_passPct ?? 0) >= 85 ? 8 : (p.dm_passPct ?? 0) >= 75 ? 4 : 0;
                        if (xCombo >= 0.55) return Math.min(92, 82 + passBon); if (xCombo >= 0.30) return 68 + passBon; if (xCombo >= 0.10) return 52 + passBon; if (xCombo > 0) return 40; return fb === "hot" ? 85 : fb === "good" ? 70 : fb === "cold" ? 30 : 50;
                      }
                      // ATK / Winger / other offensive: xG+xA per 90
                      const combined = (p.dm_xg90 ?? 0) + (p.dm_xa90 ?? 0);
                      if (combined >= 0.7) return 92; if (combined >= 0.45) return 78; if (combined >= 0.20) return 62; if (combined >= 0.05) return 46; return fb === "hot" ? 85 : fb === "good" ? 70 : fb === "cold" ? 30 : 50;
                    })();
                    const pFormColor = ec(pFormScore);
                    const pFormEmoji: Record<string, string> = { hot: "🔥", good: "⚡", cold: "❄️" };

                    // Cross-reference with 1vs1 data
                    const vs1 = find1vs1Player(p.name, topPlayers);
                    const rating = vs1?.rating ?? 0;
                    const goals = vs1?.goals ?? 0;
                    const assists = vs1?.assists ?? 0;
                    const ratingColor = rating >= 80 ? "#34d399" : rating >= 70 ? "#60a5fa" : rating >= 60 ? "#fbbf24" : "#94a3b8";

                    return (
                      <button key={p.id} onClick={() => setExpandedPlayer(p)}
                        className="w-full grid px-3 py-1.5 hover:bg-white/[0.03] transition-colors items-center text-left"
                        style={{ gridTemplateColumns: "1fr 56px 60px 40px 28px 28px 48px 48px 64px", background: inj ? "rgba(249,115,22,0.02)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>

                        {/* Joueur */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          {inj && <Warning size={9} style={{ color: "#f97316", flexShrink: 0 }} />}
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0"
                              style={{ border: `1px solid ${POS_COL[pos] ?? "#6b7c96"}30` }}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : null}
                          <span className="text-xs truncate font-medium" style={{ color: inj ? "#f97316" : "#e8edf5" }}>{p.name}</span>
                        </div>

                        {/* Poste */}
                        <div className="flex justify-center">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                            style={{ background: `${POS_COL[pos] ?? "#6b7c96"}15`, color: POS_COL[pos] ?? "#6b7c96" }}>
                            {POS_FR[pos]?.slice(0, 3) ?? pos.slice(0, 3)}
                          </span>
                        </div>

                        {/* Forme */}
                        <div className="flex items-center gap-1 justify-center">
                          {fb && fb !== "neutral" && pFormEmoji[fb] && (
                            <span style={{ fontSize: 9 }}>{pFormEmoji[fb]}</span>
                          )}
                          <span className="text-[10px] font-black" style={{ color: pFormColor }}>{pFormScore}</span>
                          <div className="w-8 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${pFormScore}%`, background: pFormColor }} />
                          </div>
                        </div>

                        {/* 1vs1 rating */}
                        <div className="flex justify-center">
                          {rating > 0 ? (
                            <span className="text-[10px] font-black px-1 py-0.5 rounded"
                              style={{ background: `${ratingColor}18`, color: ratingColor }}>
                              {rating}
                            </span>
                          ) : <span style={{ color: "#2d3748", fontSize: 10 }}>—</span>}
                        </div>

                        {/* Goals */}
                        <span className="text-[10px] text-center font-bold"
                          style={{ color: goals > 0 ? "#34d399" : "#2d3748" }}>
                          {goals > 0 ? goals : "—"}
                        </span>

                        {/* Assists */}
                        <span className="text-[10px] text-center font-bold"
                          style={{ color: assists > 0 ? "#60a5fa" : "#2d3748" }}>
                          {assists > 0 ? assists : "—"}
                        </span>

                        {/* xG/90 */}
                        <span className="text-[10px] text-center hidden sm:block font-mono"
                          style={{ color: (p.dm_xg90 ?? 0) > 0.3 ? "#22c55e" : (p.dm_xg90 ?? 0) > 0 ? "#86efac" : "#2d3748" }}>
                          {(p.dm_xg90 ?? 0) > 0 ? p.dm_xg90!.toFixed(2) : "—"}
                        </span>
                        {/* xA/90 */}
                        <span className="text-[10px] text-center hidden sm:block font-mono"
                          style={{ color: (p.dm_xa90 ?? 0) > 0.2 ? "#a78bfa" : (p.dm_xa90 ?? 0) > 0 ? "#c4b5fd" : "#2d3748" }}>
                          {(p.dm_xa90 ?? 0) > 0 ? p.dm_xa90!.toFixed(2) : "—"}
                        </span>

                        {/* Market value */}
                        <span className="text-[10px] text-right font-mono font-bold"
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

          {/* Footer */}
          {squadStats.totalValue > 0 && (
            <div className="flex justify-between px-3 py-2 text-xs font-bold" style={{ borderTop: "1px solid #1e2d42", color: "#6b7c96" }}>
              <span>{squadStats.playerCount} joueurs</span>
              {squadStats.injuredCount > 0 && <span style={{ color: "#f97316" }}>{squadStats.injuredCount} blessé{squadStats.injuredCount > 1 ? "s" : ""}</span>}
              <span style={{ color: "#00d4ff" }}>Total : {fv(squadStats.totalValue)}</span>
            </div>
          )}
        </ClubSection>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pb-6 pt-1">
          <Link href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold hover:opacity-80 transition-all"
            style={{ background: "rgba(0,212,255,0.07)", border: "1px solid rgba(0,212,255,0.18)", color: "#00d4ff" }}>
            <ArrowLeft size={12} />Foot Predictom
          </Link>
        </div>
      </div>
    </main>
  );
}
