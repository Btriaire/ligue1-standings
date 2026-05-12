"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Users, AlertTriangle, Trophy, TrendingUp,
  ArrowLeftRight, Star, Building2, Calendar, Heart,
  Info, ChevronDown, ExternalLink, Briefcase,
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
}

const CLUB_ADMIN: Record<number, AdminEntry> = {
  524:  { siren: "317 506 329", forme: "SAS",        siege: "24 r. du Commandant-Guilbaud, 75016 Paris",  president: "Nasser Al-Khelaïfi",   ca: "~800 M€",  employes: "~400" },
  548:  { forme: "SAM",         siege: "7 av. des Castelans, Monaco",                                       president: "Dmitry Rybolovlev",    ca: "~200 M€",  employes: "~150", legalNote: "Entité de droit monégasque" },
  516:  { siren: "786 164 659", forme: "SA",          siege: "145 traverse Charles Susini, 13008 Marseille", president: "Pablo Longoria",       ca: "~170 M€",  employes: "~200" },
  521:  { siren: "783 897 830", forme: "SA",          siege: "261 bd de Tournai, 59650 Villeneuve-d'Ascq",  president: "Olivier Létang",       ca: "~110 M€",  employes: "~180" },
  529:  { siren: "303 623 965", forme: "SAS",         siege: "111 route de Lorient, 35000 Rennes",           president: "Baptiste Cueff",       ca: "~130 M€",  employes: "~160" },
  522:  { siren: "776 416 358", forme: "SA",          siege: "Av. Simone Veil, 06200 Nice",                  president: "Jean-Pierre Rivère",   ca: "~150 M€",  employes: "~180" },
  546:  { siren: "497 854 280", forme: "SA",          siege: "Rue de Lens, 62300 Lens",                      president: "Joseph Oughourlian",   ca: "~90 M€",   employes: "~120" },
  523:  { siren: "320 835 374", forme: "SA",          siege: "350 av. Jean Jaurès, 69007 Lyon",              president: "John Textor",          ca: "~180 M€",  employes: "~250" },
  576:  { siren: "422 952 942", forme: "SA",          siege: "11 rue du Stade, 67100 Strasbourg",            president: "Marc Keller",          ca: "~120 M€",  employes: "~150" },
  511:  { siren: "408 476 801", forme: "SA",          siege: "Stadium Municipal, 31400 Toulouse",            president: "Damien Comolli",       ca: "~75 M€",   employes: "~100" },
  512:  { siren: "390 260 337", forme: "SASP",        siege: "Rue de Pontaniou, 29200 Brest",                president: "Denis Le Saint",       ca: "~55 M€",   employes: "~90" },
  532:  { siren: "775 577 063", forme: "SA",          siege: "Stade Raymond-Kopa, 49000 Angers",             president: "Saïd Chabane",         ca: "~45 M€",   employes: "~80" },
  533:  { siren: "431 026 609", forme: "SA",          siege: "Stade Océane, 76600 Le Havre",                 president: "Vincent Volpe",        ca: "~40 M€",   employes: "~75" },
  519:  { siren: "302 697 937", forme: "SA",          siege: "Stade de l'Abbé-Deschamps, 89000 Auxerre",    president: "Yan Gaborit",          ca: "~40 M€",   employes: "~70" },
  543:  { siren: "302 505 072", forme: "SA",          siege: "Stade de la Beaujoire, 44300 Nantes",          president: "Waldemar Kita",        ca: "~70 M€",   employes: "~110" },
  545:  { siren: "384 233 417", forme: "SASP",        siege: "Stade Saint-Symphorien, 57050 Metz",           president: "Bernard Serin",        ca: "~35 M€",   employes: "~65" },
  525:  { siren: "304 890 016", forme: "SA",          siege: "Stade du Moustoir, 56100 Lorient",             president: "Loïc Féry",            ca: "~50 M€",   employes: "~85" },
  1045: { siren: "814 988 091", forme: "SA",          siege: "Stade Charléty, 75013 Paris",                  president: "Pierre-Dreyfus",       ca: "~60 M€",   employes: "~90" },
};

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
  team: { id: number; name: string; shortName: string; crest: string; venue: string; founded: number; coach: string | null };
  squad: SquadPlayer[];
  stats: { totalValue: number; avgValue: number; playerCount: number; injuredCount: number; injuryRate: number; injured: { name: string; status?: string }[] };
}

interface MatchInfo {
  id: number; date: string; matchday: number; status: string;
  homeTeam: { id: number; name: string; crest: string };
  awayTeam: { id: number; name: string; crest: string };
  score: { home: number | null; away: number | null };
}

interface TeamMatches { recent: MatchInfo[]; upcoming: MatchInfo[] }

interface TransferItem {
  title: string; pubDate: string; source: string; url: string;
  type: "arrival" | "departure" | "rumor" | "news";
}

interface BuzzItem {
  title: string; pubDate: string; source: string; url: string;
  sentiment: "positive" | "negative" | "neutral";
  matchedPos?: string[]; matchedNeg?: string[];
}

interface BuzzData {
  items: BuzzItem[];
  score: number;
  positive: number;
  negative: number;
  total: number;
  topPositiveKeywords: string[];
  topNegativeKeywords: string[];
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

function MatchRow({ match, teamId }: { match: MatchInfo; teamId: number }) {
  const isHome = match.homeTeam.id === teamId;
  const ts = isHome ? match.score.home : match.score.away;
  const os = isHome ? match.score.away : match.score.home;
  const opp = isHome ? match.awayTeam : match.homeTeam;
  const done = ts !== null && os !== null;
  const rc = done ? (ts! > os! ? "#22c55e" : ts! < os! ? "#ef4444" : "#f59e0b") : "#6b7c96";
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
      <span className="text-[10px] font-mono w-6 flex-shrink-0" style={{ color: "#6b7c96" }}>J{match.matchday}</span>
      <span className="text-[10px] px-1 rounded flex-shrink-0"
        style={{ background: isHome ? "rgba(0,212,255,0.08)" : "rgba(255,255,255,0.04)", color: isHome ? "#00d4ff" : "#6b7c96" }}>
        {isHome ? "⌂" : "✈"}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={opp.crest} alt="" className="w-4 h-4 object-contain flex-shrink-0" loading="lazy" />
      <span className="flex-1 text-xs truncate" style={{ color: "#e8edf5" }}>{opp.name}</span>
      {done
        ? <span className="text-xs font-black flex-shrink-0" style={{ color: rc }}>{ts}–{os}</span>
        : <span className="text-xs flex-shrink-0" style={{ color: "#6b7c96" }}>{fd(match.date)}</span>
      }
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
        <span className="text-xs flex-1" style={{ color: "#6b7c96" }}>
          Comment ce score est-il calculé ?
        </span>
        <ChevronDown size={11} style={{ color: "#6b7c96" }} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: "#94a3b8" }}>
            Analyse de sentiment NLP sur <strong style={{ color: "#e8edf5" }}>{buzz.total} articles</strong> issus de
            Google News et L&apos;Équipe, filtrés par mots-clés liés au club et à ses supporters.
          </p>
          <div className="rounded-lg p-2.5 text-xs font-mono" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ color: "#6b7c96" }}>Score = 50 </span>
            <span style={{ color: "#22c55e" }}>+ ({buzz.positive} × 3)</span>
            <span style={{ color: "#ef4444" }}> − ({buzz.negative} × 3)</span>
            <span style={{ color: "#6b7c96" }}> = </span>
            <span style={{ color }}>{buzz.score}</span>
            <span style={{ color: "#6b7c96" }}> / 100</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {buzz.topPositiveKeywords.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold mb-1.5" style={{ color: "#22c55e" }}>MOTS POSITIFS DÉTECTÉS</p>
                <div className="flex flex-wrap gap-1">
                  {buzz.topPositiveKeywords.map(k => (
                    <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {buzz.topNegativeKeywords.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold mb-1.5" style={{ color: "#ef4444" }}>MOTS NÉGATIFS DÉTECTÉS</p>
                <div className="flex flex-wrap gap-1">
                  {buzz.topNegativeKeywords.map(k => (
                    <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {buzz.total === 0 && (
            <p className="text-xs" style={{ color: "#6b7c96" }}>Aucun article trouvé — score neutre par défaut (50).</p>
          )}
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
  const [loading, setLoading] = useState(true);
  const [loadingBuzz, setLoadingBuzz] = useState(false);
  const [stadiumErr, setStadiumErr] = useState(false);
  const [squadOpen, setSquadOpen] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    Promise.all([
      fetch(`/api/squad/${teamId}`).then(r => r.json()).catch(() => null),
      fetch(`/api/team/${teamId}`).then(r => r.json()).catch(() => null),
      fetch("/api/transfers").then(r => r.json()).catch(() => null),
      fetch("/api/emotional-score").then(r => r.json()).catch(() => null),
    ]).then(([sq, mt, tr, em]) => {
      setSquad(sq?.team ? sq : null);
      setMatches(mt?.recent ? mt : null);
      if (tr?.clubs) {
        const c = tr.clubs.find((x: { teamId: number; items: TransferItem[] }) => x.teamId === teamId);
        setTransfers(c?.items ?? []);
      }
      if (em?.scores) {
        setEmotional(em.scores.find((s: EmotionalEntry) => s.teamId === teamId) ?? null);
      }
    }).finally(() => setLoading(false));
  }, [teamId]);

  const loadBuzz = () => {
    setLoadingBuzz(true);
    fetch(`/api/fan-buzz?teamId=${teamId}`)
      .then(r => r.json())
      .then(setBuzz)
      .catch(() => null)
      .finally(() => setLoadingBuzz(false));
  };

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
  if (!squad) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#080c14" }}>
        <div className="text-center">
          <p className="text-red-400 mb-3 font-semibold">Données indisponibles.</p>
          <Link href="/" style={{ color: "#00d4ff" }} className="text-sm hover:opacity-70">← Retour</Link>
        </div>
      </main>
    );
  }

  const team = squad.team;
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
    const pl = squad.squad.filter(x => x.position === p);
    if (pl.length) acc[p] = pl;
    return acc;
  }, {});

  const buzzColor = buzz ? ec(buzz.score) : "#6b7c96";
  const buzzText = buzz ? buzzLabel(buzz.score) : "Non chargé";

  return (
    <main className="min-h-screen" style={{ background: "#080c14" }}>
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b"
        style={{ borderColor: "#1e2d42", background: "rgba(8,12,20,0.93)" }}>
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-xs transition-all hover:opacity-70 flex-shrink-0"
            style={{ color: "#6b7c96" }}>
            <ArrowLeft size={14} /> Retour
          </Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={team.crest} alt="" className="w-7 h-7 object-contain flex-shrink-0" />
          <span className="font-black text-sm truncate" style={{ color: "#e8edf5" }}>{team.name}</span>
          {recentForm.length > 0 && (
            <div className="hidden sm:flex gap-1 ml-auto">
              {recentForm.map((r, i) => <FormDot key={i} result={r} />)}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">

        {/* ── HERO: stadium photo + club identity + admin ── */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42" }}>
          {/* Stadium photo */}
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
                    <img src={team.crest} alt="" className="w-8 h-8 object-contain flex-shrink-0" />
                    <h1 className="text-xl font-black" style={{ color: "#e8edf5" }}>{team.name}</h1>
                  </div>
                </div>
                {/* Mini form */}
                <div className="flex gap-1">
                  {recentForm.map((r, i) => <FormDot key={i} result={r} />)}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 pt-4 pb-3 flex items-center gap-3"
              style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.04), rgba(124,58,237,0.04))" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={team.crest} alt="" className="w-14 h-14 object-contain flex-shrink-0" />
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
              {squad.stats.totalValue > 0 && (
                <div><p style={{ color: "#6b7c96" }}>Valeur effectif</p>
                  <p className="font-black mt-0.5" style={{ color: "#00d4ff" }}>{fv(squad.stats.totalValue)}</p></div>
              )}
            </div>

            {/* Admin data */}
            {admin && (
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Briefcase size={11} style={{ color: "#f59e0b" }} />
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6b7c96" }}>Données administratives & commerciales</p>
                  {admin.legalNote && <Chip color="#f59e0b">{admin.legalNote}</Chip>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
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
                    <span style={{ color: "#6b7c96" }}>CA estimé</span>
                    <span className="font-bold" style={{ color: "#22c55e" }}>{admin.ca}</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                    <span style={{ color: "#6b7c96" }}>Président</span>
                    <span className="font-semibold truncate" style={{ color: "#e8edf5" }}>{admin.president}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: "#6b7c96" }}>Salariés</span>
                    <span className="font-semibold" style={{ color: "#e8edf5" }}>~{admin.employes}</span>
                  </div>
                  <div className="flex items-start gap-1.5 col-span-2 sm:col-span-3">
                    <span className="flex-shrink-0" style={{ color: "#6b7c96" }}>Siège</span>
                    <span className="text-[11px] leading-tight" style={{ color: "#94a3b8" }}>{admin.siege}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── MERCATO ── */}
        {transfers.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42", background: "#0d1421" }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid #1e2d42" }}>
              <ArrowLeftRight size={13} style={{ color: "#f59e0b" }} />
              <span className="font-bold text-sm" style={{ color: "#e8edf5" }}>Mercato</span>
              <span className="text-xs ml-auto" style={{ color: "#6b7c96" }}>{transfers.length} articles</span>
            </div>
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
          </div>
          <div className="px-3 py-2.5">
            {!buzz && !loadingBuzz && (
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: "#6b7c96" }}>
                  Analyse Google News · L&apos;Équipe — sentiment supporters
                </p>
                <button onClick={loadBuzz}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-all flex-shrink-0"
                  style={{ background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.2)", color: "#f472b6" }}>
                  Analyser
                </button>
              </div>
            )}
            {loadingBuzz && (
              <div className="flex items-center gap-2 py-1">
                <div className="w-4 h-4 rounded-full border-2 border-pink-400 border-t-transparent animate-spin flex-shrink-0" />
                <p className="text-xs" style={{ color: "#6b7c96" }}>Analyse en cours…</p>
              </div>
            )}
            {buzz && (
              <>
                <div className="space-y-1">
                  {buzz.items.slice(0, 8).map((item, i) => {
                    const sc = item.sentiment === "positive" ? "#22c55e" : item.sentiment === "negative" ? "#ef4444" : "#6b7c96";
                    const keywords = [...(item.matchedPos ?? []), ...(item.matchedNeg ?? [])];
                    return (
                      <div key={i} className="flex items-start gap-2 py-1 px-1">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: sc }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-snug" style={{ color: "#94a3b8" }}>{item.title}</p>
                          {keywords.length > 0 && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {(item.matchedPos ?? []).map(k => (
                                <span key={k} className="text-[9px] px-1 rounded" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>{k}</span>
                              ))}
                              {(item.matchedNeg ?? []).map(k => (
                                <span key={k} className="text-[9px] px-1 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{k}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] flex-shrink-0 mt-0.5" style={{ color: "#6b7c96" }}>{item.source}</span>
                      </div>
                    );
                  })}
                </div>
                <BuzzMethodology buzz={buzz} />
              </>
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
                </div>
                <div className="px-2 py-1">
                  {matches.recent.map(m => <MatchRow key={m.id} match={m} teamId={teamId} />)}
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
                  {matches.upcoming.map(m => <MatchRow key={m.id} match={m} teamId={teamId} />)}
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
              Effectif — {squad.stats.playerCount} joueurs
            </span>
            {squad.stats.injuredCount > 0 && (
              <span className="flex items-center gap-1 text-xs mr-2" style={{ color: "#f97316" }}>
                <AlertTriangle size={11} />{squad.stats.injuredCount} blessé{squad.stats.injuredCount > 1 ? "s" : ""}
              </span>
            )}
            {squad.stats.totalValue > 0 && (
              <span className="text-xs mr-2 font-bold" style={{ color: "#00d4ff" }}>{fv(squad.stats.totalValue)}</span>
            )}
            <ChevronDown size={14} style={{ color: "#6b7c96" }} className={`flex-shrink-0 transition-transform ${squadOpen ? "rotate-180" : ""}`} />
          </button>

          {squadOpen && (
            <div className="px-3 py-2 space-y-3">
              {squad.stats.injuredCount > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {squad.stats.injured.map(p => (
                    <span key={p.name} className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{ background: "rgba(249,115,22,0.1)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)" }}>
                      <AlertTriangle size={9} />{p.name}
                    </span>
                  ))}
                </div>
              )}
              {Object.entries(byPos).map(([pos, players]) => (
                <div key={pos}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
                    style={{ color: POS_COL[pos] ?? "#6b7c96" }}>{POS_FR[pos] ?? pos}</p>
                  {players.map(p => {
                    const inj = p.status?.toLowerCase().includes("injury");
                    const fb = p.formBadge;
                    const fbc: Record<string, string> = { hot: "#ef4444", good: "#22c55e", neutral: "", cold: "#94a3b8" };
                    const fbe: Record<string, string> = { hot: "🔥", good: "⚡", neutral: "", cold: "❄️" };
                    return (
                      <div key={p.id} className="flex items-center gap-1.5 py-1 px-1 rounded hover:bg-white/[0.02]"
                        style={{ background: inj ? "rgba(249,115,22,0.03)" : "transparent" }}>
                        <span className="text-[9px] font-bold w-5 text-center rounded"
                          style={{ background: `${POS_COL[pos] ?? "#6b7c96"}15`, color: POS_COL[pos] ?? "#6b7c96", padding: "1px 0" }}>
                          {POS_SHORT[pos] ?? "?"}
                        </span>
                        {inj && <AlertTriangle size={9} className="text-orange-400 flex-shrink-0" />}
                        <span className="flex-1 text-xs truncate" style={{ color: inj ? "#f97316" : "#e8edf5" }}>{p.name}</span>
                        <span className="text-[10px] hidden sm:block" style={{ color: "#6b7c96" }}>{p.age}a</span>
                        {fb && fb !== "neutral" && fbe[fb] && (
                          <span style={{ color: fbc[fb], fontSize: 11 }}>{fbe[fb]}</span>
                        )}
                        {(p.recentGoals ?? 0) > 0 && (
                          <span className="text-[10px]" style={{ color: "#f59e0b" }}>⚽{p.recentGoals}</span>
                        )}
                        {(p.recentAssists ?? 0) > 0 && (
                          <span className="text-[10px]" style={{ color: "#00d4ff" }}>🅰{p.recentAssists}</span>
                        )}
                        <span className="text-xs font-mono font-bold w-12 text-right flex-shrink-0"
                          style={{ color: p.marketValue > 20_000_000 ? "#00d4ff" : p.marketValue > 5_000_000 ? "#e8edf5" : "#6b7c96" }}>
                          {p.marketValue > 0 ? fv(p.marketValue) : "—"}
                        </span>
                      </div>
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
