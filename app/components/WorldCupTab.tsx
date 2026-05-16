"use client";

import { useState } from "react";
import { Calendar, Trophy, Users, MapPin, Globe, Star, Lightning, TrendUp, Target, Shield } from "@phosphor-icons/react";

// ─── Data ──────────────────────────────────────────────────────────────────

const GROUPS = [
  { letter: "A", teams: ["🇦🇷 Argentine", "🇨🇱 Chili", "🇵🇪 Pérou", "🇦🇺 Australie"] },
  { letter: "B", teams: ["🇲🇽 Mexique ★", "🇯🇲 Jamaïque", "🇻🇪 Venezuela", "🇪🇨 Équateur"] },
  { letter: "C", teams: ["🇺🇸 USA ★", "🇵🇦 Panama", "🇨🇺 Cuba", "🇳🇿 Nouvelle-Zélande"] },
  { letter: "D", teams: ["🇨🇦 Canada ★", "🇭🇳 Honduras", "🇺🇾 Uruguay", "🇵🇹 Portugal"] },
  { letter: "E", teams: ["🇪🇸 Espagne", "🇲🇦 Maroc", "🇧🇪 Belgique", "🇯🇵 Japon"] },
  { letter: "F", teams: ["🇫🇷 France", "🇸🇦 Arabie Saoudite", "🇨🇭 Suisse", "🇩🇿 Algérie"] },
  { letter: "G", teams: ["🇧🇷 Brésil", "🇨🇴 Colombie", "🇵🇾 Paraguay", "🇨🇲 Cameroun"] },
  { letter: "H", teams: ["🇩🇪 Allemagne", "🇳🇱 Pays-Bas", "🇵🇱 Pologne", "🇷🇸 Serbie"] },
  { letter: "I", teams: ["🏴󠁧󠁢󠁥󠁮󠁧󠁿 Angleterre", "🇸🇳 Sénégal", "🇹🇳 Tunisie", "🇨🇷 Costa Rica"] },
  { letter: "J", teams: ["🇮🇹 Italie", "🇭🇷 Croatie", "🇷🇴 Roumanie", "🇦🇴 Angola"] },
  { letter: "K", teams: ["🇺🇦 Ukraine", "🇬🇭 Ghana", "🇿🇦 Afrique du Sud", "🇨🇩 RD Congo"] },
  { letter: "L", teams: ["🇰🇷 Corée du Sud", "🇨🇮 Côte d'Ivoire", "🇿🇼 Zimbabwe", "🇰🇪 Kenya"] },
];

const SCHEDULE = [
  { phase: "Match d'ouverture", dates: "11 juin 2026",         icon: "🚀", color: "#00d4ff" },
  { phase: "Phase de groupes", dates: "12 juin – 2 juil 2026", icon: "⚽", color: "#22c55e" },
  { phase: "Huitièmes de finale", dates: "4 – 7 juil 2026",   icon: "🏆", color: "#f59e0b" },
  { phase: "Quarts de finale", dates: "9 – 12 juil 2026",      icon: "⭐", color: "#f97316" },
  { phase: "Demi-finales", dates: "14 – 15 juil 2026",         icon: "🔥", color: "#ef4444" },
  { phase: "Match 3e place", dates: "18 juil 2026",            icon: "🥉", color: "#a78bfa" },
  { phase: "FINALE", dates: "19 juil 2026",                    icon: "🏆", color: "#fbbf24" },
];

const NOTABLE_MATCHES = [
  { date: "11 juin", teams: "🇲🇽 Mexique vs 🇪🇨 Équateur",       group: "Gr.B", note: "OUVERTURE",    highlight: "#fbbf24" },
  { date: "12 juin", teams: "🇺🇸 USA vs 🇵🇦 Panama",              group: "Gr.C", note: null,           highlight: null },
  { date: "13 juin", teams: "🇦🇷 Argentine vs 🇨🇱 Chili",          group: "Gr.A", note: null,           highlight: null },
  { date: "14 juin", teams: "🇫🇷 France vs 🇸🇦 Arabie Saoudite",  group: "Gr.F", note: "J1 France",    highlight: "#22c55e" },
  { date: "15 juin", teams: "🇪🇸 Espagne vs 🇲🇦 Maroc",            group: "Gr.E", note: null,           highlight: null },
  { date: "16 juin", teams: "🇩🇪 Allemagne vs 🇳🇱 Pays-Bas",       group: "Gr.H", note: "Derby",        highlight: "#a78bfa" },
  { date: "20 juin", teams: "🇫🇷 France vs 🇨🇭 Suisse",            group: "Gr.F", note: "J2 France",    highlight: "#22c55e" },
  { date: "25 juin", teams: "🇫🇷 France vs 🇩🇿 Algérie",           group: "Gr.F", note: "J3 🔥",        highlight: "#ef4444" },
];

// ─── Players data ───────────────────────────────────────────────────────────

type PosType = "ATT" | "MIL" | "DEF" | "GB";
type CatType = "star" | "revelation" | "veteran" | "danger";

interface WCPlayer {
  flag: string;
  name: string;
  club: string;
  nat: string;   // for group lookup
  group: string;
  pos: PosType;
  age: number;
  cat: CatType;
  // Stats 0-100
  vitesse: number;
  technique: number;
  impact: number;     // overall tournament impact potential
  buts: number;       // goal threat
  // Narrative
  role: string;         // 1-line role description
  pronostic: string;    // tournament prediction
  statLabel: string;    // key stat label
  statValue: string;    // key stat value
  // Tournament tracker (updated live, pre-filled with 0)
  butsM: number;
  passesM: number;
  matchsM: number;
}

const PLAYERS: WCPlayer[] = [
  // ── SUPERSTARS ──────────────────────────────────────────────────────────────
  {
    flag:"🇫🇷", name:"Kylian Mbappé",     club:"Real Madrid",     nat:"France",    group:"F",
    pos:"ATT", age:27, cat:"star",
    vitesse:98, technique:92, impact:96, buts:94,
    role:"Capitaine des Bleus · Attaquant de pointe",
    pronostic:"Top 3 buteurs · Finaliste probable",
    statLabel:"Buts en qualifs", statValue:"8",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🇧🇷", name:"Vinicius Jr",        club:"Real Madrid",     nat:"Brésil",    group:"G",
    pos:"ATT", age:25, cat:"star",
    vitesse:97, technique:91, impact:92, buts:85,
    role:"Ailier gauche explosif · Dribbleur imprévisible",
    pronostic:"Ballon d'Or potentiel · MVP si Brésil gagne",
    statLabel:"Dribbles/match", statValue:"7.2",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🇦🇷", name:"Julián Álvarez",     club:"Atlético Madrid", nat:"Argentine",  group:"A",
    pos:"ATT", age:25, cat:"star",
    vitesse:85, technique:88, impact:90, buts:88,
    role:"Numéro 9 mobile · Héros de la CdM 2022",
    pronostic:"Meilleur buteur potentiel sans Messi",
    statLabel:"Buts CdM 2022",  statValue:"4",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", name:"Jude Bellingham",  club:"Real Madrid",     nat:"Angleterre", group:"I",
    pos:"MIL", age:22, cat:"star",
    vitesse:84, technique:93, impact:94, buts:82,
    role:"Milieu box-to-box · Meneur décisif",
    pronostic:"Meilleur joueur du tournoi potentiel",
    statLabel:"Buts en Liga 2025", statValue:"22",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🇪🇸", name:"Lamine Yamal",       club:"FC Barcelone",    nat:"Espagne",   group:"E",
    pos:"ATT", age:18, cat:"star",
    vitesse:93, technique:95, impact:91, buts:82,
    role:"Ailier droit prodige · Champion d'Europe à 17 ans",
    pronostic:"Révélation absolue · Premier grand tournoi adulte",
    statLabel:"Âge actuel",     statValue:"18 ans",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🇵🇹", name:"Cristiano Ronaldo",  club:"Al-Nassr",        nat:"Portugal",  group:"D",
    pos:"ATT", age:41, cat:"veteran",
    vitesse:68, technique:88, impact:85, buts:84,
    role:"Capitaine légendaire · Possiblement 5e CdM",
    pronostic:"Emotion garantie · Record de sélections",
    statLabel:"Sélections",     statValue:"220+",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🇩🇪", name:"Florian Wirtz",      club:"Bayer Leverkusen", nat:"Allemagne", group:"H",
    pos:"MIL", age:22, cat:"star",
    vitesse:86, technique:94, impact:90, buts:78,
    role:"Milieu créatif · Meilleur joueur de Bundesliga",
    pronostic:"Leader de l'Allemagne · Candidat au titre",
    statLabel:"Buts+passes 2025", statValue:"31",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🇧🇷", name:"Endrick",            club:"Real Madrid",     nat:"Brésil",    group:"G",
    pos:"ATT", age:19, cat:"revelation",
    vitesse:90, technique:86, impact:84, buts:86,
    role:"Avant-centre explosif · Prodige brésilien",
    pronostic:"Révélation du tournoi possible",
    statLabel:"Âge actuel",     statValue:"19 ans",
    butsM:0, passesM:0, matchsM:0,
  },
  // ── MILIEUX ──────────────────────────────────────────────────────────────────
  {
    flag:"🇫🇷", name:"Antoine Griezmann",  club:"Atlético Madrid", nat:"France",    group:"F",
    pos:"MIL", age:35, cat:"veteran",
    vitesse:74, technique:89, impact:87, buts:78,
    role:"Meneur de jeu · Record de sélections équipes de France",
    pronostic:"Dernier grand tournoi · Leadership décisif",
    statLabel:"Buts en sélection", statValue:"44",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🇧🇪", name:"Kevin De Bruyne",    club:"Manchester City",  nat:"Belgique",  group:"E",
    pos:"MIL", age:34, cat:"veteran",
    vitesse:76, technique:95, impact:88, buts:72,
    role:"Créateur de jeu · Passeur hors norme",
    pronostic:"Dernière chance de briller avec la Belgique",
    statLabel:"Passes décisives 2025", statValue:"18",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🇭🇷", name:"Luka Modrić",        club:"Al-Qadsiah",      nat:"Croatie",   group:"J",
    pos:"MIL", age:41, cat:"veteran",
    vitesse:70, technique:93, impact:84, buts:62,
    role:"Milieu de terrain légendaire · 3e de la CdM 2022",
    pronostic:"Dernier tournoi · Moteur de la Croatie",
    statLabel:"CdM jouées",     statValue:"5",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🇫🇷", name:"Aurélien Tchouaméni", club:"Real Madrid",    nat:"France",    group:"F",
    pos:"MIL", age:25, cat:"star",
    vitesse:82, technique:85, impact:86, buts:64,
    role:"Sentinelle récupératrice · Bouclier des Bleus",
    pronostic:"Titulaire indiscutable · Pilier défensif",
    statLabel:"Duels gagnés/match", statValue:"6.8",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🇯🇵", name:"Takefusa Kubo",      club:"Real Sociedad",   nat:"Japon",     group:"E",
    pos:"ATT", age:24, cat:"danger",
    vitesse:88, technique:91, impact:82, buts:75,
    role:"Ailier technique · Formé au Barça",
    pronostic:"Facteur X du Japon · Capables de surprendre",
    statLabel:"Dribbles/match", statValue:"5.1",
    butsM:0, passesM:0, matchsM:0,
  },
  // ── DÉFENSEURS ───────────────────────────────────────────────────────────────
  {
    flag:"🇫🇷", name:"William Saliba",     club:"Arsenal",         nat:"France",    group:"F",
    pos:"DEF", age:25, cat:"star",
    vitesse:84, technique:85, impact:88, buts:40,
    role:"Défenseur central · Meilleur défenseur de Premier League",
    pronostic:"Mur défensif des Bleus · Indispensable",
    statLabel:"Duels aériens gagnés", statValue:"78%",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🇳🇱", name:"Virgil van Dijk",    club:"Liverpool",       nat:"Pays-Bas",  group:"H",
    pos:"DEF", age:34, cat:"veteran",
    vitesse:80, technique:82, impact:87, buts:58,
    role:"Défenseur central · Capitaine des Pays-Bas",
    pronostic:"Expérience cruciale contre les attaques de haut niveau",
    statLabel:"Duels gagnés/match", statValue:"4.9",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🇲🇦", name:"Achraf Hakimi",      club:"Paris SG",        nat:"Maroc",     group:"E",
    pos:"DEF", age:27, cat:"star",
    vitesse:94, technique:88, impact:90, buts:72,
    role:"Latéral droit offensif · Leader du Maroc",
    pronostic:"Meilleur défenseur du tournoi potentiel",
    statLabel:"Centres/match",  statValue:"3.4",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🇪🇸", name:"Alejandro Balde",    club:"FC Barcelone",    nat:"Espagne",   group:"E",
    pos:"DEF", age:21, cat:"revelation",
    vitesse:92, technique:84, impact:82, buts:58,
    role:"Latéral gauche explosif · Futur grand",
    pronostic:"Révélation défensive du tournoi",
    statLabel:"Âge actuel",     statValue:"21 ans",
    butsM:0, passesM:0, matchsM:0,
  },
  // ── RÉVÉLATIONS ──────────────────────────────────────────────────────────────
  {
    flag:"🇨🇴", name:"James Rodríguez",    club:"Rayo Vallecano",  nat:"Colombie",  group:"G",
    pos:"MIL", age:34, cat:"danger",
    vitesse:70, technique:93, impact:84, buts:74,
    role:"Meneur de jeu · Soulier d'or CdM 2014",
    pronostic:"Renaissance possible · Dernière grande scène",
    statLabel:"Buts CdM 2014",  statValue:"6 (Soulier d'or)",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🇺🇸", name:"Christian Pulisic",  club:"AC Milan",        nat:"USA",        group:"C",
    pos:"ATT", age:27, cat:"star",
    vitesse:88, technique:86, impact:85, buts:80,
    role:"Attaquant polyvalent · Leader symbolique des USA",
    pronostic:"Meilleur joueur de CONCACAF · USA en 8es min.",
    statLabel:"Buts en Serie A 2025", statValue:"16",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🇨🇦", name:"Alphonso Davies",    club:"Bayern Munich",  nat:"Canada",    group:"D",
    pos:"DEF", age:25, cat:"star",
    vitesse:99, technique:87, impact:88, buts:62,
    role:"Latéral gauche · Joueur le plus rapide du tournoi",
    pronostic:"Vitesse dévastatrice · Canada en 8es espoir",
    statLabel:"Vitesse max enregistrée", statValue:"36.5 km/h",
    butsM:0, passesM:0, matchsM:0,
  },
  {
    flag:"🇩🇿", name:"Riyad Mahrez",       club:"Al-Ahli",         nat:"Algérie",   group:"F",
    pos:"ATT", age:35, cat:"danger",
    vitesse:78, technique:92, impact:82, buts:76,
    role:"Ailier droit technique · Capitaine algérien",
    pronostic:"Motivation maximale vs France · Facteur X",
    statLabel:"Sélections Algérie", statValue:"82",
    butsM:0, passesM:0, matchsM:0,
  },
];

const POS_CFG: Record<PosType, { label: string; color: string; bg: string }> = {
  ATT: { label: "ATT", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  MIL: { label: "MIL", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  DEF: { label: "DEF", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  GB:  { label: "GB",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
};

const CAT_CFG: Record<CatType, { label: string; color: string; icon: string }> = {
  star:       { label: "Superstar",   color: "#fbbf24", icon: "⭐" },
  revelation: { label: "Révélation",  color: "#06b6d4", icon: "💥" },
  veteran:    { label: "Vétéran",     color: "#94a3b8", icon: "🧠" },
  danger:     { label: "Danger",      color: "#f97316", icon: "⚡" },
};

// ─── Bracket tab ─────────────────────────────────────────────────────────────

// Layout constants (px)
const MH = 46;   // match card height
const GAP = 8;   // vertical gap between cards in same round
const SLOT = MH + GAP; // 54

// For 8 R16 matches per side:
// R16 tops:  i * SLOT
// QF tops:   i * (2*SLOT) + SLOT/2 - MH/2  = i*108 + 27 - 23 = i*108 + 4
// SF tops:   i * (4*SLOT) + 1.5*SLOT - MH/2 = i*216 + 81 - 23 = i*216 + 58
// Final top: 3.5*SLOT - MH/2 = 189 - 23 = 166
const R16_TOP = (i: number) => i * SLOT;
const QF_TOP  = (i: number) => i * 2 * SLOT + SLOT / 2 - MH / 2;
const SF_TOP  = (i: number) => i * 4 * SLOT + 1.5 * SLOT - MH / 2;
const FIN_TOP = 3.5 * SLOT - MH / 2;
const TOTAL_H = 8 * SLOT; // 432

interface BMatch { id: string; t1: string; t2: string }

function BMatchCard({ m, picks, onPick }: {
  m: BMatch; picks: Record<string, 0|1>; onPick: (id: string, s: 0|1) => void;
}) {
  const p = picks[m.id];
  const isEmpty = (t: string) => t === "?" || t === "";
  return (
    <div className="flex flex-col overflow-hidden"
      style={{ height: MH, border: "1px solid #1e3050", borderRadius: 6, background: "#0a1220", width: "100%" }}>
      {([0, 1] as const).map(side => {
        const t = side === 0 ? m.t1 : m.t2;
        const won = p === side;
        const lost = p !== undefined && !won;
        return (
          <button key={side} onClick={() => !isEmpty(t) && onPick(m.id, side)}
            style={{
              flex: 1, textAlign: "left", padding: "2px 6px", fontSize: 9, fontWeight: won ? 700 : 400,
              background: won ? "rgba(34,197,94,0.15)" : "transparent",
              color: isEmpty(t) ? "#2a3a50" : won ? "#22c55e" : lost ? "#334155" : "#94a3b8",
              borderBottom: side === 0 ? "1px solid #1a2840" : "none",
              cursor: isEmpty(t) ? "default" : "pointer",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              lineHeight: 1.2,
            }}>
            {won && <span style={{ marginRight: 2, fontSize: 7 }}>✓</span>}
            {isEmpty(t) ? "—" : t}
          </button>
        );
      })}
    </div>
  );
}

function BracketColumn({ matches, tops, picks, onPick, style }: {
  matches: BMatch[]; tops: number[]; picks: Record<string, 0|1>;
  onPick: (id: string, s: 0|1) => void; style?: React.CSSProperties;
}) {
  return (
    <div style={{ position: "relative", width: 90, flexShrink: 0, height: TOTAL_H, ...style }}>
      {matches.map((m, i) => (
        <div key={m.id} style={{ position: "absolute", top: tops[i], left: 0, right: 0 }}>
          <BMatchCard m={m} picks={picks} onPick={onPick} />
        </div>
      ))}
    </div>
  );
}

// Vertical connector: a small SVG that draws the "⊏" shape between 2 R16 → 1 QF
function Connector({ top1, top2, color = "#1e3050" }: { top1: number; top2: number; color?: string }) {
  const c1 = top1 + MH / 2;
  const c2 = top2 + MH / 2;
  const mid = (c1 + c2) / 2;
  return (
    <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <path d={`M 0 ${c1} H 50% V ${mid}`} fill="none" stroke={color} strokeWidth={1} />
      <path d={`M 0 ${c2} H 50% V ${mid}`} fill="none" stroke={color} strokeWidth={1} />
      <path d={`M 50% ${mid} H 100%`} fill="none" stroke={color} strokeWidth={1} />
    </svg>
  );
}

function BracketTab() {
  const [picks, setPicks] = useState<Record<string, 0|1>>({});

  const setPick = (id: string, side: 0|1) =>
    setPicks(p => { const n = { ...p }; if (n[id] === side) delete n[id]; else n[id] = side; return n; });

  const w = (id: string, t1: string, t2: string) =>
    picks[id] === 0 ? t1 : picks[id] === 1 ? t2 : "?";

  // ── Seeds: 8 left-side 1/8 matches (Groups A-F + best 3e) ──────────────────
  const L16: BMatch[] = [
    { id:"L1", t1:"🇦🇷 Argentine",  t2:"🇪🇨 Équateur"  }, // 1A vs 2B
    { id:"L2", t1:"🇺🇸 USA",         t2:"🇺🇾 Uruguay"   }, // 1C vs 2D
    { id:"L3", t1:"🇪🇸 Espagne",     t2:"🇩🇿 Algérie"   }, // 1E vs Mel.3
    { id:"L4", t1:"🇫🇷 France",      t2:"🇧🇪 Belgique"  }, // 1F vs 2E
    { id:"L5", t1:"🇲🇽 Mexique",     t2:"🇨🇱 Chili"     }, // 1B vs 2A
    { id:"L6", t1:"🇨🇦 Canada",      t2:"🇵🇹 Portugal"  }, // 1D vs 2D'
    { id:"L7", t1:"🇲🇦 Maroc",       t2:"🇯🇵 Japon"     }, // Mel.3 E vs Mel.3 F
    { id:"L8", t1:"🇨🇭 Suisse",      t2:"🇵🇪 Pérou"     }, // 2F vs Mel.3
  ];

  // ── Seeds: 8 right-side 1/8 matches (Groups G-L + best 3e) ────────────────
  const R16: BMatch[] = [
    { id:"R1", t1:"🇧🇷 Brésil",      t2:"🇨🇲 Cameroun"  }, // 1G vs Mel.3
    { id:"R2", t1:"🇩🇪 Allemagne",   t2:"🇷🇸 Serbie"    }, // 1H vs 2H
    { id:"R3", t1:"🏴󠁧󠁢󠁥󠁮󠁧󠁿 Angleterre", t2:"🇬🇭 Ghana"     }, // 1I vs Mel.3
    { id:"R4", t1:"🇮🇹 Italie",       t2:"🇷🇴 Roumanie"  }, // 1J vs Mel.3
    { id:"R5", t1:"🇨🇴 Colombie",    t2:"🇵🇾 Paraguay"  }, // 2G vs Mel.3
    { id:"R6", t1:"🇳🇱 Pays-Bas",    t2:"🇵🇱 Pologne"   }, // 2H vs Mel.3
    { id:"R7", t1:"🇸🇳 Sénégal",     t2:"🇹🇳 Tunisie"   }, // 2I vs Mel.3
    { id:"R8", t1:"🇭🇷 Croatie",     t2:"🇰🇷 Corée du S"}, // 2J vs 1L
  ];

  // ── Left QF ────────────────────────────────────────────────────────────────
  const LQF: BMatch[] = Array.from({ length: 4 }, (_, i) => ({
    id: `LQ${i}`,
    t1: w(L16[i*2].id,   L16[i*2].t1,   L16[i*2].t2),
    t2: w(L16[i*2+1].id, L16[i*2+1].t1, L16[i*2+1].t2),
  }));

  // ── Left SF ────────────────────────────────────────────────────────────────
  const LSF: BMatch[] = Array.from({ length: 2 }, (_, i) => ({
    id: `LS${i}`,
    t1: w(LQF[i*2].id,   LQF[i*2].t1,   LQF[i*2].t2),
    t2: w(LQF[i*2+1].id, LQF[i*2+1].t1, LQF[i*2+1].t2),
  }));

  // ── Right QF ───────────────────────────────────────────────────────────────
  const RQF: BMatch[] = Array.from({ length: 4 }, (_, i) => ({
    id: `RQ${i}`,
    t1: w(R16[i*2].id,   R16[i*2].t1,   R16[i*2].t2),
    t2: w(R16[i*2+1].id, R16[i*2+1].t1, R16[i*2+1].t2),
  }));

  // ── Right SF ───────────────────────────────────────────────────────────────
  const RSF: BMatch[] = Array.from({ length: 2 }, (_, i) => ({
    id: `RS${i}`,
    t1: w(RQF[i*2].id,   RQF[i*2].t1,   RQF[i*2].t2),
    t2: w(RQF[i*2+1].id, RQF[i*2+1].t1, RQF[i*2+1].t2),
  }));

  // ── Final ──────────────────────────────────────────────────────────────────
  const finalT1 = w(LSF[0].id, LSF[0].t1, LSF[0].t2);
  const finalT2 = w(RSF[0].id, RSF[0].t1, RSF[0].t2);
  const finalMatch: BMatch = { id: "FIN", t1: finalT1, t2: finalT2 };
  const champion = picks["FIN"] === 0 ? finalT1 : picks["FIN"] === 1 ? finalT2 : null;

  const CONN_W = 14; // connector column width

  return (
    <div>
      {/* Legend + reset */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px]" style={{ color: "#475569" }}>
          🖱 Clique sur une équipe pour la faire avancer au tour suivant
        </p>
        <button onClick={() => setPicks({})}
          className="text-[9px] px-2 py-1 rounded hover:opacity-80"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
          Reset
        </button>
      </div>

      {/* Bracket — horizontal scroll */}
      <div className="overflow-x-auto pb-3">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0, minWidth: 700, position: "relative" }}>

          {/* ── LEFT: 1/8 ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, alignItems: "center" }}>
            <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: "#1e3a5f" }}>1/8 Finale</p>
            <BracketColumn matches={L16} tops={L16.map((_, i) => R16_TOP(i))} picks={picks} onPick={setPick} />
          </div>

          {/* connector L16→LQF */}
          <div style={{ width: CONN_W, flexShrink: 0, position: "relative", height: TOTAL_H, marginTop: 18 }}>
            {[0,1,2,3].map(i => (
              <Connector key={i} top1={R16_TOP(i*2)} top2={R16_TOP(i*2+1)} />
            ))}
          </div>

          {/* ── LEFT: QF ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, alignItems: "center" }}>
            <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: "#1e3a5f" }}>Quarts</p>
            <BracketColumn matches={LQF} tops={LQF.map((_, i) => QF_TOP(i))} picks={picks} onPick={setPick} />
          </div>

          {/* connector LQF→LSF */}
          <div style={{ width: CONN_W, flexShrink: 0, position: "relative", height: TOTAL_H, marginTop: 18 }}>
            {[0,1].map(i => (
              <Connector key={i} top1={QF_TOP(i*2)} top2={QF_TOP(i*2+1)} />
            ))}
          </div>

          {/* ── LEFT: SF ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, alignItems: "center" }}>
            <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: "#1e3a5f" }}>Demis</p>
            <BracketColumn matches={LSF} tops={LSF.map((_, i) => SF_TOP(i))} picks={picks} onPick={setPick} />
          </div>

          {/* connector LSF→Final */}
          <div style={{ width: CONN_W, flexShrink: 0, position: "relative", height: TOTAL_H, marginTop: 18 }}>
            <Connector top1={SF_TOP(0)} top2={SF_TOP(1)} color="#f59e0b" />
          </div>

          {/* ── FINALE ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, alignItems: "center" }}>
            <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: "#f59e0b" }}>🏆 Finale</p>
            <div style={{ position: "relative", height: TOTAL_H }}>
              <div style={{ position: "absolute", top: FIN_TOP, width: 100 }}>
                <BMatchCard m={finalMatch} picks={picks} onPick={setPick} />
                {champion && champion !== "?" && (
                  <div className="text-center mt-1 px-1 py-0.5 rounded"
                    style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}>
                    <span style={{ fontSize: 8, color: "#f59e0b", fontWeight: 700 }}>🥇 {champion}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* connector Final←RSF */}
          <div style={{ width: CONN_W, flexShrink: 0, position: "relative", height: TOTAL_H, marginTop: 18 }}>
            <Connector top1={SF_TOP(0)} top2={SF_TOP(1)} color="#f59e0b" />
          </div>

          {/* ── RIGHT: SF ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, alignItems: "center" }}>
            <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: "#1e3a5f" }}>Demis</p>
            <BracketColumn matches={RSF} tops={RSF.map((_, i) => SF_TOP(i))} picks={picks} onPick={setPick} />
          </div>

          {/* connector RSF←RQF */}
          <div style={{ width: CONN_W, flexShrink: 0, position: "relative", height: TOTAL_H, marginTop: 18 }}>
            {[0,1].map(i => (
              <Connector key={i} top1={QF_TOP(i*2)} top2={QF_TOP(i*2+1)} />
            ))}
          </div>

          {/* ── RIGHT: QF ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, alignItems: "center" }}>
            <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: "#1e3a5f" }}>Quarts</p>
            <BracketColumn matches={RQF} tops={RQF.map((_, i) => QF_TOP(i))} picks={picks} onPick={setPick} />
          </div>

          {/* connector RQF←R16 */}
          <div style={{ width: CONN_W, flexShrink: 0, position: "relative", height: TOTAL_H, marginTop: 18 }}>
            {[0,1,2,3].map(i => (
              <Connector key={i} top1={R16_TOP(i*2)} top2={R16_TOP(i*2+1)} />
            ))}
          </div>

          {/* ── RIGHT: 1/8 ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, alignItems: "center" }}>
            <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: "#1e3a5f" }}>1/8 Finale</p>
            <BracketColumn matches={R16} tops={R16.map((_, i) => R16_TOP(i))} picks={picks} onPick={setPick} />
          </div>
        </div>
      </div>

      {/* 3rd place note */}
      <div className="mt-2 px-3 py-1.5 rounded-xl text-[9px]"
        style={{ background: "#0d1421", border: "1px solid #1e2d42", color: "#475569" }}>
        🥉 Match pour la 3e place · 18 juillet 2026 · entre les 2 perdants des demi-finales
      </div>
    </div>
  );
}

// ─── Sub-tabs ────────────────────────────────────────────────────────────────

type SubTab = "groupes" | "calendrier" | "joueurs" | "france" | "favoris" | "tableau";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "groupes",    label: "Groupes" },
  { id: "tableau",    label: "🏆 Tableau" },
  { id: "calendrier", label: "Calendrier" },
  { id: "joueurs",    label: "⭐ Joueurs" },
  { id: "france",     label: "🇫🇷 France" },
  { id: "favoris",    label: "Favoris" },
];

// ─── Stat bar ────────────────────────────────────────────────────────────────

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: "#6b7c96" }}>{label}</span>
        <span className="text-[9px] font-black" style={{ color }}>{value}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }} />
      </div>
    </div>
  );
}

// ─── Tournament stat pill ────────────────────────────────────────────────────

function StatPill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center px-2 py-1 rounded-lg" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
      <span className="text-sm font-black leading-none" style={{ color }}>{value}</span>
      <span className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: "#6b7c96" }}>{label}</span>
    </div>
  );
}

// ─── Player card ─────────────────────────────────────────────────────────────

function PlayerCard({ p }: { p: WCPlayer }) {
  const [open, setOpen] = useState(false);
  const pos = POS_CFG[p.pos];
  const cat = CAT_CFG[p.cat];
  const hasActivity = p.butsM > 0 || p.passesM > 0 || p.matchsM > 0;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{ background: "#0a1120", border: `1px solid ${open ? cat.color + "40" : "#1e2d42"}` }}
    >
      {/* Card header */}
      <button
        className="w-full text-left p-3 hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {/* Top row: pos + cat badges + name + flag */}
        <div className="flex items-start gap-2.5">
          {/* Left: position badge */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black"
              style={{ background: pos.bg, color: pos.color, border: `1px solid ${pos.color}30` }}>
              {pos.label}
            </div>
            <span className="text-xs">{p.flag}</span>
          </div>

          {/* Center: name + club + role */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-black leading-tight" style={{ color: "#e8edf5" }}>{p.name}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: cat.color + "15", color: cat.color, border: `1px solid ${cat.color}25` }}>
                {cat.icon} {cat.label}
              </span>
            </div>
            <p className="text-[10px] mt-0.5 truncate" style={{ color: "#64748b" }}>{p.club} · {p.age} ans · Gr.{p.group}</p>
            <p className="text-[10px] mt-0.5 truncate" style={{ color: "#94a3b8" }}>{p.role}</p>
          </div>

          {/* Right: impact gauge */}
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <div className="relative w-10 h-10">
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5"
                  strokeDasharray={`${2 * Math.PI * 15 * 0.75} ${2 * Math.PI * 15}`}
                  strokeDashoffset={-2 * Math.PI * 15 * 0.125} strokeLinecap="round" />
                <circle cx="20" cy="20" r="15" fill="none" stroke={cat.color} strokeWidth="3.5"
                  strokeDasharray={`${2 * Math.PI * 15 * 0.75 * p.impact / 100} ${2 * Math.PI * 15}`}
                  strokeDashoffset={-2 * Math.PI * 15 * 0.125} strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 4px ${cat.color}80)` }} />
                <text x="20" y="23.5" textAnchor="middle" fontSize="9" fontWeight="900" fill={cat.color}>{p.impact}</text>
              </svg>
            </div>
            <span className="text-[8px] uppercase tracking-wider" style={{ color: "#475569" }}>Impact</span>
          </div>
        </div>

        {/* Stat bars row (always visible) */}
        <div className="grid grid-cols-4 gap-1.5 mt-2.5">
          <StatBar label="Vitesse"   value={p.vitesse}   color="#00d4ff" />
          <StatBar label="Tech."     value={p.technique} color="#a78bfa" />
          <StatBar label="Buts"      value={p.buts}      color="#ef4444" />
          <StatBar label="Impact"    value={p.impact}    color={cat.color} />
        </div>

        {/* Key stat highlight */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid rgba(255,255,255,0.06)" }}>
              {p.statLabel}
            </span>
            <span className="text-[10px] font-black" style={{ color: "#e8edf5" }}>{p.statValue}</span>
          </div>
          {/* Tournament stats if available */}
          {hasActivity && (
            <div className="flex items-center gap-1">
              <StatPill value={p.matchsM} label="J" color="#6b7c96" />
              <StatPill value={p.butsM}   label="B" color="#ef4444" />
              <StatPill value={p.passesM} label="PD" color="#3b82f6" />
            </div>
          )}
          {!hasActivity && (
            <span className="text-[9px] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(234,179,8,0.08)", color: "#6b7c96", border: "1px solid rgba(234,179,8,0.12)" }}>
              ⏳ Avant tournoi
            </span>
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-3 pb-3 space-y-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          {/* Pronostic */}
          <div className="rounded-xl px-3 py-2 mt-2" style={{ background: `${cat.color}08`, border: `1px solid ${cat.color}20` }}>
            <p className="text-[9px] uppercase font-bold mb-0.5" style={{ color: cat.color }}>
              {cat.icon} Pronostic tournoi
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{p.pronostic}</p>
          </div>

          {/* Full stat grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "Vitesse",    value: p.vitesse,   color: "#00d4ff",  icon: <Lightning size={10} /> },
              { label: "Technique",  value: p.technique, color: "#a78bfa",  icon: <Star size={10} /> },
              { label: "Menace buts",value: p.buts,      color: "#ef4444",  icon: <Target size={10} /> },
              { label: "Impact CdM", value: p.impact,    color: cat.color,  icon: <TrendUp size={10} /> },
            ].map(s => {
              const filled = Math.round(s.value / 20);  // 0-5 segments
              return (
                <div key={s.label} className="rounded-xl p-2.5"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-1 mb-1.5" style={{ color: s.color }}>
                    {s.icon}
                    <span className="text-[9px] font-bold uppercase tracking-wide">{s.label}</span>
                    <span className="text-xs font-black ml-auto">{s.value}</span>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex-1 h-2 rounded-sm"
                        style={{ background: i < filled ? s.color : "rgba(255,255,255,0.06)", opacity: i < filled ? 1 : 0.4 }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tournament tracker */}
          <div className="rounded-xl px-3 py-2.5"
            style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)" }}>
            <p className="text-[9px] uppercase font-bold mb-2" style={{ color: "#00d4ff" }}>
              📊 Stats au tournoi — {hasActivity ? `${p.matchsM} matchs joués` : "Tournoi pas encore commencé"}
            </p>
            <div className="flex gap-2">
              <StatPill value={p.matchsM} label="Matchs" color="#6b7c96" />
              <StatPill value={p.butsM}   label="Buts"   color="#ef4444" />
              <StatPill value={p.passesM} label="PD"     color="#3b82f6" />
              <div className="flex flex-col items-center px-2 py-1 rounded-lg flex-1"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "#6b7c96" }}>Note moy.</span>
                <span className="text-sm font-black leading-none mt-0.5" style={{ color: "#6b7c96" }}>—</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Joueurs tab ─────────────────────────────────────────────────────────────

type FilterPos = "ALL" | PosType;
type FilterCat = "ALL" | CatType;

function JoueursTab() {
  const [filterPos, setFilterPos] = useState<FilterPos>("ALL");
  const [filterCat, setFilterCat] = useState<FilterCat>("ALL");
  const [filterGroup, setFilterGroup] = useState<string>("ALL");

  const filtered = PLAYERS.filter(p =>
    (filterPos === "ALL" || p.pos === filterPos) &&
    (filterCat === "ALL" || p.cat === filterCat) &&
    (filterGroup === "ALL" || p.group === filterGroup)
  );

  // Spotlight: highest impact players
  const spotlight = [...PLAYERS].sort((a, b) => b.impact - a.impact).slice(0, 3);

  return (
    <div>
      {/* Spotlight banner */}
      <div className="rounded-2xl p-3 mb-4"
        style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.06), rgba(239,68,68,0.06), rgba(0,212,255,0.06))", border: "1px solid rgba(251,191,36,0.2)" }}>
        <p className="text-[10px] uppercase font-bold tracking-widest mb-2" style={{ color: "#fbbf24" }}>
          ⭐ Top 3 Impact Potentiel
        </p>
        <div className="grid grid-cols-3 gap-2">
          {spotlight.map((p, i) => {
            const cat = CAT_CFG[p.cat];
            return (
              <div key={p.name} className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <span className="text-base">{p.flag}</span>
                  {i === 0 && <span className="text-xs">🥇</span>}
                  {i === 1 && <span className="text-xs">🥈</span>}
                  {i === 2 && <span className="text-xs">🥉</span>}
                </div>
                <p className="text-[10px] font-black truncate" style={{ color: "#e8edf5" }}>{p.name}</p>
                <p className="text-[9px]" style={{ color: "#64748b" }}>{p.club}</p>
                <span className="text-[10px] font-black" style={{ color: cat.color }}>{p.impact}/100</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2 mb-3">
        {/* Position */}
        <div className="flex flex-wrap gap-1">
          {(["ALL", "ATT", "MIL", "DEF"] as const).map(f => {
            const active = filterPos === f;
            const cfg = f !== "ALL" ? POS_CFG[f] : null;
            return (
              <button key={f} onClick={() => setFilterPos(f)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                style={{
                  background: active ? (cfg ? cfg.bg : "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.03)",
                  color: active ? (cfg?.color ?? "#e8edf5") : "#6b7c96",
                  border: `1px solid ${active ? (cfg?.color ?? "#e8edf5") + "40" : "rgba(255,255,255,0.06)"}`,
                }}>
                {f === "ALL" ? "Tous postes" : f}
              </button>
            );
          })}
        </div>
        {/* Category */}
        <div className="flex flex-wrap gap-1">
          {(["ALL", "star", "revelation", "veteran", "danger"] as const).map(f => {
            const active = filterCat === f;
            const cfg = f !== "ALL" ? CAT_CFG[f] : null;
            return (
              <button key={f} onClick={() => setFilterCat(f)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                style={{
                  background: active ? (cfg ? cfg.color + "15" : "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.03)",
                  color: active ? (cfg?.color ?? "#e8edf5") : "#6b7c96",
                  border: `1px solid ${active ? (cfg?.color ?? "#ffffff") + "30" : "rgba(255,255,255,0.06)"}`,
                }}>
                {f === "ALL" ? "Tous profils" : `${cfg!.icon} ${cfg!.label}`}
              </button>
            );
          })}
        </div>
        {/* Group filter for French group */}
        <div className="flex flex-wrap gap-1">
          {(["ALL", "F", "E", "G", "H", "A", "I", "D"]).map(g => (
            <button key={g} onClick={() => setFilterGroup(g)}
              className="px-2 py-0.5 rounded text-[9px] font-bold transition-all"
              style={{
                background: filterGroup === g ? "rgba(234,179,8,0.12)" : "rgba(255,255,255,0.03)",
                color: filterGroup === g ? "#eab308" : "#475569",
                border: `1px solid ${filterGroup === g ? "rgba(234,179,8,0.3)" : "rgba(255,255,255,0.05)"}`,
              }}>
              {g === "ALL" ? "Tous groupes" : `Gr.${g}`}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-[10px] mb-3" style={{ color: "#475569" }}>
        {filtered.length} joueur{filtered.length > 1 ? "s" : ""} · Cliquer pour le détail + stats tournoi
      </p>

      {/* Cards */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-8" style={{ color: "#6b7c96" }}>
            Aucun joueur pour ces filtres
          </div>
        )}
        {filtered.map(p => <PlayerCard key={p.name} p={p} />)}
      </div>

      <p className="mt-4 text-center text-[10px]" style={{ color: "#475569" }}>
        Stats tournoi mises à jour au fur et à mesure · FootPredictom AI
      </p>
    </div>
  );
}

// ─── Groupes tab ─────────────────────────────────────────────────────────────

function GroupesTab() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {GROUPS.map((g) => (
        <div key={g.letter} className="rounded-xl px-3 py-2.5" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
          <p className="text-xs font-black tracking-widest mb-1.5" style={{ color: "#00d4ff" }}>GROUPE {g.letter}</p>
          <div className="space-y-1">
            {g.teams.map((team) => (
              <div key={team} className="text-xs py-0.5" style={{ color: "#c8d4e3" }}>{team}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Calendrier tab ──────────────────────────────────────────────────────────

function CalendrierTab() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7c96" }}>Phases du tournoi</p>
        <div className="space-y-1.5">
          {SCHEDULE.map((s) => (
            <div key={s.phase} className="flex items-center gap-3 px-3 py-2 rounded-xl"
              style={{ background: "#0d1421", border: `1px solid ${s.color}20` }}>
              <span className="text-base flex-shrink-0">{s.icon}</span>
              <span className="text-xs font-bold flex-1" style={{ color: s.color }}>{s.phase}</span>
              <span className="text-xs flex-shrink-0" style={{ color: "#6b7c96" }}>{s.dates}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7c96" }}>Matchs à suivre</p>
        <div className="space-y-1.5">
          {NOTABLE_MATCHES.map((m, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "#0d1421", border: `1px solid ${m.highlight ? m.highlight + "30" : "#1e2d42"}` }}>
              <span className="text-xs font-mono w-12 flex-shrink-0" style={{ color: "#6b7c96" }}>{m.date}</span>
              <span className="text-xs font-semibold flex-1 min-w-0 truncate" style={{ color: "#e8edf5" }}>{m.teams}</span>
              <span className="text-xs flex-shrink-0" style={{ color: "#4b5d73" }}>{m.group}</span>
              {m.note && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ background: (m.highlight ?? "#6b7c96") + "18", color: m.highlight ?? "#6b7c96" }}>
                  {m.note}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── France tab ──────────────────────────────────────────────────────────────

function FranceTab() {
  const francePlayers = PLAYERS.filter(p => p.nat === "France");
  return (
    <div className="space-y-3">
      <div className="px-3 py-2.5 rounded-xl" style={{ background: "#0d1421", border: "1px solid rgba(34,197,94,0.2)" }}>
        <p className="text-xs font-bold mb-1.5" style={{ color: "#22c55e" }}>Groupe F</p>
        <div className="space-y-1">
          {GROUPS.find(g => g.letter === "F")!.teams.map(t => (
            <div key={t} className="text-xs py-0.5"
              style={{ color: t.startsWith("🇫🇷") ? "#e8edf5" : "#94a3b8", fontWeight: t.startsWith("🇫🇷") ? 700 : 400 }}>
              {t}
            </div>
          ))}
        </div>
      </div>
      <div className="px-3 py-2.5 rounded-xl" style={{ background: "#0d1421", border: "1px solid rgba(234,179,8,0.15)" }}>
        <p className="text-xs font-bold mb-2" style={{ color: "#eab308" }}>Joueurs clés à suivre</p>
        <div className="space-y-1.5">
          {francePlayers.map(p => {
            const cat = CAT_CFG[p.cat];
            return (
              <div key={p.name} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                <span className="text-xs font-bold" style={{ color: "#e8edf5" }}>{p.name}</span>
                <span className="text-[10px]" style={{ color: "#6b7c96" }}>{p.role}</span>
                <span className="text-[9px] font-bold ml-auto" style={{ color: cat.color }}>{p.impact}/100</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { label: "Titres", value: "2 (1998, 2018)" },
          { label: "Finales", value: "3 (+ 2006, 2022)" },
          { label: "Participations", value: "16" },
          { label: "Meilleur buteur", value: "T. Henry (6)" },
        ].map(s => (
          <div key={s.label} className="rounded-xl px-3 py-2" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
            <p className="text-[10px]" style={{ color: "#6b7c96" }}>{s.label}</p>
            <p className="text-xs font-bold mt-0.5" style={{ color: "#e8edf5" }}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="px-3 py-2.5 rounded-xl" style={{ background: "#0d1421", border: "1px solid rgba(0,212,255,0.15)" }}>
        <p className="text-xs font-bold mb-1.5" style={{ color: "#00d4ff" }}>Calendrier France</p>
        {NOTABLE_MATCHES.filter(m => m.teams.includes("🇫🇷")).map((m, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <span className="text-xs font-mono w-12 flex-shrink-0" style={{ color: "#6b7c96" }}>{m.date}</span>
            <span className="text-xs font-semibold flex-1" style={{ color: "#e8edf5" }}>{m.teams}</span>
            {m.note && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: (m.highlight ?? "#6b7c96") + "18", color: m.highlight ?? "#6b7c96" }}>{m.note}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Favoris tab ─────────────────────────────────────────────────────────────

function FavorisTab() {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {[
        { flag:"🇦🇷", name:"Argentine",  desc:"Tenant du titre. Lautaro, Álvarez.",  color:"#00d4ff" },
        { flag:"🇫🇷", name:"France",     desc:"Finaliste 2022. Mbappé, Griezmann.", color:"#22c55e" },
        { flag:"🇧🇷", name:"Brésil",     desc:"5× champion. Vinicius Jr, Endrick.", color:"#f59e0b" },
        { flag:"🇪🇸", name:"Espagne",    desc:"Champion d'Europe 2024. Yamal, Pedri.", color:"#f97316" },
        { flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", name:"Angleterre", desc:"Bellingham, Saka, Kane.", color:"#a78bfa" },
        { flag:"🇩🇪", name:"Allemagne",  desc:"4× champion. Florian Wirtz.", color:"#ef4444" },
        { flag:"🇵🇹", name:"Portugal",   desc:"Ronaldo dernière CdM ? Félix, Leão.", color:"#fbbf24" },
        { flag:"🇲🇦", name:"Maroc",      desc:"Demi-finaliste 2022. Hakimi.", color:"#06b6d4" },
      ].map(t => (
        <div key={t.name} className="flex items-center gap-3 px-3 py-2 rounded-xl"
          style={{ background: "#0d1421", border: `1px solid ${t.color}20` }}>
          <span className="text-xl flex-shrink-0">{t.flag}</span>
          <div className="min-w-0">
            <p className="text-xs font-bold" style={{ color: t.color }}>{t.name}</p>
            <p className="text-xs mt-0.5 leading-snug" style={{ color: "#6b7c96" }}>{t.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WorldCupTab() {
  const [activeTab, setActiveTab] = useState<SubTab>("groupes");

  return (
    <div>
      {/* Slim header */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl mb-3"
        style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
        <span className="text-base">🌍</span>
        <span className="text-sm font-black tracking-tight" style={{ color: "#e8edf5" }}>Coupe du Monde 2026</span>
        <div className="flex flex-wrap gap-1.5 ml-auto">
          {[
            { icon: <Calendar size={9} />, label: "11 juin – 19 juil", color: "#22c55e" },
            { icon: <Users size={9} />,    label: "48 équipes",          color: "#00d4ff" },
            { icon: <Trophy size={9} />,   label: "104 matchs",          color: "#eab308" },
            { icon: <MapPin size={9} />,   label: "16 stades",           color: "#a78bfa" },
          ].map(b => (
            <span key={b.label} className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
              style={{ background: b.color + "10", color: b.color, border: `1px solid ${b.color}20` }}>
              {b.icon}{b.label}
            </span>
          ))}
        </div>
      </div>

      {/* Sub-tab bar */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-0.5">
        {SUB_TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0"
              style={{
                background: active ? "#00d4ff" : "#0d1421",
                color: active ? "#080c14" : "#6b7c96",
                border: `1px solid ${active ? "#00d4ff" : "#1e2d42"}`,
              }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === "groupes"    && <GroupesTab />}
      {activeTab === "tableau"    && <BracketTab />}
      {activeTab === "calendrier" && <CalendrierTab />}
      {activeTab === "joueurs"    && <JoueursTab />}
      {activeTab === "france"     && <FranceTab />}
      {activeTab === "favoris"    && <FavorisTab />}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        <Globe size={11} style={{ color: "#6b7c96" }} />
        <a href="https://www.fifa.com/fifaplus/fr/tournaments/mens/worldcup/canadamexicousa2026"
          target="_blank" rel="noopener noreferrer"
          className="text-xs hover:opacity-80 transition-opacity" style={{ color: "#00d4ff" }}>
          fifa.com/worldcup2026
        </a>
        <span className="text-xs" style={{ color: "#4b5d73" }}>· Source FIFA</span>
      </div>
    </div>
  );
}
