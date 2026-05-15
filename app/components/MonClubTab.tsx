"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Trophy, Heart, ChevronDown, ChevronUp, X, TrendingUp, TrendingDown,
  Minus, Users, Calendar, Zap, RefreshCw, Shield, MapPin, Target,
  Star, Activity, BarChart2,
} from "lucide-react";

/* ─────────────────────────────────────────── Clubs ─── */

interface Club {
  id: number;
  name: string;
  shortName: string;
  crest: string;
  color: string;
  color2?: string;
  stadium: string;
  stadiumImg?: string;    // Wikimedia Commons or public URL
  city: string;
  capacity: string;
}

const L1_CLUBS: Club[] = [
  { id: 524,  name: "Paris Saint-Germain", shortName: "PSG",        color: "#004494", color2: "#DA0000",
    crest: "https://crests.football-data.org/524.png",
    stadium: "Parc des Princes", capacity: "48 583", city: "Paris",
    stadiumImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Parc_des_Princes_-_12_Aug_2012.jpg/800px-Parc_des_Princes_-_12_Aug_2012.jpg" },
  { id: 548,  name: "AS Monaco",           shortName: "Monaco",     color: "#E03A24", color2: "#FFFFFF",
    crest: "https://crests.football-data.org/548.png",
    stadium: "Stade Louis II", capacity: "18 523", city: "Monaco",
    stadiumImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Monaco_-_Stade_Louis_II_%281%29.jpg/800px-Monaco_-_Stade_Louis_II_%281%29.jpg" },
  { id: 516,  name: "Olympique Marseille", shortName: "Marseille",  color: "#2FAEE0", color2: "#FFFFFF",
    crest: "https://crests.football-data.org/516.png",
    stadium: "Orange Vélodrome", capacity: "67 394", city: "Marseille",
    stadiumImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Stade_Velodrome_2014.jpg/800px-Stade_Velodrome_2014.jpg" },
  { id: 521,  name: "Lille OSC",           shortName: "Lille",      color: "#C8003B", color2: "#FFFFFF",
    crest: "https://crests.football-data.org/521.png",
    stadium: "Stade Pierre-Mauroy", capacity: "50 186", city: "Villeneuve d'Ascq",
    stadiumImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Stade_Pierre_Mauroy_-_Villeneuve_d%27Ascq_-_Octobre_2012.jpg/800px-Stade_Pierre_Mauroy_-_Villeneuve_d%27Ascq_-_Octobre_2012.jpg" },
  { id: 529,  name: "Stade Rennais",       shortName: "Rennes",     color: "#E10600", color2: "#1E2D42",
    crest: "https://crests.football-data.org/529.png",
    stadium: "Roazhon Park", capacity: "29 778", city: "Rennes",
    stadiumImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Roazhon_Park_-_Stade_de_rennes_-_panoramio.jpg/800px-Roazhon_Park_-_Stade_de_rennes_-_panoramio.jpg" },
  { id: 522,  name: "OGC Nice",            shortName: "Nice",       color: "#C40026", color2: "#1A1A1A",
    crest: "https://crests.football-data.org/522.png",
    stadium: "Allianz Riviera", capacity: "35 624", city: "Nice",
    stadiumImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Allianz_Riviera_2013.jpg/800px-Allianz_Riviera_2013.jpg" },
  { id: 546,  name: "RC Lens",             shortName: "Lens",       color: "#E8B400", color2: "#DA0000",
    crest: "https://crests.football-data.org/546.png",
    stadium: "Stade Bollaert-Delelis", capacity: "38 223", city: "Lens",
    stadiumImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Stade_Felix_Bollaert_%C3%A0_lens.jpg/800px-Stade_Felix_Bollaert_%C3%A0_lens.jpg" },
  { id: 523,  name: "Olympique Lyonnais",  shortName: "Lyon",       color: "#1032BC", color2: "#E40613",
    crest: "https://crests.football-data.org/523.png",
    stadium: "Groupama Stadium", capacity: "59 186", city: "Décines-Charpieu",
    stadiumImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Groupama_Stadium_2016.jpg/800px-Groupama_Stadium_2016.jpg" },
  { id: 576,  name: "RC Strasbourg",       shortName: "Strasbourg", color: "#2965A4", color2: "#EDBA3B",
    crest: "https://crests.football-data.org/576.png",
    stadium: "Stade de la Meinau", capacity: "26 165", city: "Strasbourg",
    stadiumImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Stade_de_la_Meinau_2015.jpg/800px-Stade_de_la_Meinau_2015.jpg" },
  { id: 511,  name: "Toulouse FC",         shortName: "Toulouse",   color: "#7E1F86", color2: "#FFFFFF",
    crest: "https://crests.football-data.org/511.png",
    stadium: "Stadium de Toulouse", capacity: "33 150", city: "Toulouse",
    stadiumImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Stadium_municipal_de_Toulouse_2012.jpg/800px-Stadium_municipal_de_Toulouse_2012.jpg" },
  { id: 512,  name: "Stade Brestois",      shortName: "Brest",      color: "#DC001A", color2: "#2F4E8B",
    crest: "https://crests.football-data.org/512.png",
    stadium: "Stade Francis-Le Blé", capacity: "15 097", city: "Brest",
    stadiumImg: undefined },
  { id: 532,  name: "Angers SCO",          shortName: "Angers",     color: "#2A2A2A", color2: "#FFFFFF",
    crest: "https://crests.football-data.org/532.png",
    stadium: "Stade Raymond-Kopa", capacity: "18 032", city: "Angers",
    stadiumImg: undefined },
  { id: 533,  name: "Le Havre AC",         shortName: "Le Havre",   color: "#003380", color2: "#FFFFFF",
    crest: "https://crests.football-data.org/533.png",
    stadium: "Stade Océane", capacity: "25 178", city: "Le Havre",
    stadiumImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Stade_oc%C3%A9ane_du_havre.jpg/800px-Stade_oc%C3%A9ane_du_havre.jpg" },
  { id: 519,  name: "AJ Auxerre",          shortName: "Auxerre",    color: "#001F5B", color2: "#FFFFFF",
    crest: "https://crests.football-data.org/519.png",
    stadium: "Stade Abbé-Deschamps", capacity: "19 649", city: "Auxerre",
    stadiumImg: undefined },
  { id: 543,  name: "FC Nantes",           shortName: "Nantes",     color: "#E8AF00", color2: "#1B4494",
    crest: "https://crests.football-data.org/543.png",
    stadium: "Stade de la Beaujoire", capacity: "38 285", city: "Nantes",
    stadiumImg: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Stade_de_la_Beaujoire.jpg/800px-Stade_de_la_Beaujoire.jpg" },
  { id: 545,  name: "FC Metz",             shortName: "Metz",       color: "#9E1931", color2: "#F0A500",
    crest: "https://crests.football-data.org/545.png",
    stadium: "Stade Saint-Symphorien", capacity: "26 636", city: "Longeville-lès-Metz",
    stadiumImg: undefined },
  { id: 525,  name: "FC Lorient",          shortName: "Lorient",    color: "#E06300", color2: "#1F2E6E",
    crest: "https://crests.football-data.org/525.png",
    stadium: "Stade du Moustoir", capacity: "18 586", city: "Lorient",
    stadiumImg: undefined },
  { id: 1045, name: "Paris FC",            shortName: "Paris FC",   color: "#003087", color2: "#D72020",
    crest: "https://crests.football-data.org/1045.png",
    stadium: "Stade Charléty", capacity: "20 000", city: "Paris",
    stadiumImg: undefined },
];

/* ─────────────────────────────────────────── Zones ─── */

const ZONE_CONFIG = [
  { label: "Champion",             positions: [1],          color: "#60a5fa", bg: "rgba(96,165,250,0.1)"  },
  { label: "Ligue des Champions",  positions: [2, 3],       color: "#34d399", bg: "rgba(52,211,153,0.1)"  },
  { label: "Ligue Europa",         positions: [4],          color: "#fbbf24", bg: "rgba(251,191,36,0.1)"  },
  { label: "Conférence League",    positions: [5],          color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  { label: "Zone de relégation",   positions: [16, 17, 18], color: "#f87171", bg: "rgba(248,113,113,0.1)" },
];
function getZone(pos: number) { return ZONE_CONFIG.find(z => z.positions.includes(pos)) ?? null; }

/* ─────────────────────────────────────────── Types ─── */

interface Standing {
  position: number;
  team: { id: number; name: string; shortName: string; tla: string; crest: string };
  playedGames: number;
  won: number; draw: number; lost: number;
  points: number;
  goalsFor: number; goalsAgainst: number; goalDifference: number;
  form: string;
}

interface SquadPlayer {
  id: string; name: string; position: string; age: number;
  nationality: string[];
  marketValue: number;
  usGoals?: number; usAssists?: number;
  xG?: number; xA?: number; games?: number;
  dm_xg90?: number; dm_xa90?: number; dm_passPct?: number; dm_defDuels90?: number;
  dm_dribblePct?: number; dm_interceptions90?: number; dm_aerialPct?: number;
  dm_savePct?: number; dm_gcPer90?: number; dm_cleanSheets?: number;
  dm_shots90?: number; dm_keyPasses90?: number; dm_minutes?: number;
  formBadge?: "hot" | "good" | "neutral" | "cold";
  imageUrl?: string; foot?: string; contract?: string;
}

interface RecentResult {
  id: number; date: string;
  homeTeam: { name: string; shortName: string; tla: string; crest: string };
  awayTeam: { name: string; shortName: string; tla: string; crest: string };
  score: { home: number; away: number };
  result: "home" | "away" | "draw";
}

/* ─────────────────────────────────────────── Helpers ─── */

function normName(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
}
function teamMatchesClub(t: string, club: Club) {
  const n = normName(t), s = normName(club.shortName), f = normName(club.name);
  return n.includes(s) || s.includes(n) || n.includes(f.slice(0,8)) || f.includes(n.slice(0,6));
}
function resultForClub(m: RecentResult, club: Club): "V"|"N"|"D"|null {
  const isHome = teamMatchesClub(m.homeTeam.name,club)||teamMatchesClub(m.homeTeam.shortName,club);
  const isAway = teamMatchesClub(m.awayTeam.name,club)||teamMatchesClub(m.awayTeam.shortName,club);
  if (!isHome && !isAway) return null;
  if (m.result==="draw") return "N";
  return (isHome&&m.result==="home")||(isAway&&m.result==="away") ? "V" : "D";
}
function fmtDate(d: string) { return new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"}); }
function fmtValue(v: number) {
  if (v>=1_000_000) return `${(v/1_000_000).toFixed(1)}M€`;
  if (v>=1_000) return `${(v/1_000).toFixed(0)}k€`;
  return `${v}€`;
}
function formScore(form: string) {
  const f = form.split(",").filter(Boolean).slice(-5);
  if (!f.length) return 50;
  return Math.round(f.reduce((a,r)=>a+(r==="W"?3:r==="D"?1:0),0)/(f.length*3)*100);
}
function calcMatchProba(team: Standing, opp: Standing): { w:number; d:number; l:number } {
  const ts = formScore(team.form)/100, os = formScore(opp.form)/100;
  const posFactor = (opp.position - team.position) * 0.012;
  const gdFactor  = (team.goalDifference - opp.goalDifference) / 80;
  let w = 0.36 + (ts-os)*0.22 + posFactor + gdFactor;
  let l = 0.34 - (ts-os)*0.18 - posFactor - gdFactor;
  let d = 1 - w - l;
  w = Math.max(0.08, Math.min(0.78, w));
  l = Math.max(0.08, Math.min(0.78, l));
  d = Math.max(0.12, 1 - w - l);
  const tot = w+d+l;
  return { w: Math.round(w/tot*100), d: Math.round(d/tot*100), l: Math.round(l/tot*100) };
}

const POS_ORDER: Record<string,number> = { Goalkeeper:1, Defender:2, Midfielder:3, Winger:4, "Centre-Forward":5 };
const POS_FR:    Record<string,string>  = { Goalkeeper:"Gardien", Defender:"Défenseur", Midfielder:"Milieu", Winger:"Ailier", "Centre-Forward":"Attaquant" };
const POS_COLOR: Record<string,string>  = { Goalkeeper:"#f59e0b", Defender:"#3b82f6", Midfielder:"#a78bfa", Winger:"#34d399", "Centre-Forward":"#ef4444" };
const POS_CODE:  Record<string,string>  = { Goalkeeper:"GB", Defender:"DEF", Midfielder:"MIL", Winger:"AIL", "Centre-Forward":"ATT" };

/* ─────────────────────────────────────────── Atoms ─── */

function FormDot({ r }: { r:"V"|"N"|"D" }) {
  const c = { V:"#22c55e", N:"#f59e0b", D:"#ef4444" }[r];
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-black flex-shrink-0"
      style={{ background:`${c}1a`, border:`1.5px solid ${c}`, color:c }}>{r}</span>
  );
}

function MiniBar({ val, max, color }: { val:number; max:number; color:string }) {
  const pct = max>0 ? Math.round((val/max)*100) : 0;
  return (
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }}>
      <div className="h-full rounded-full" style={{ width:`${pct}%`, background:color }} />
    </div>
  );
}

function ProbBar({ label, pct, color }: { label:string; pct:number; color:string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold w-8 flex-shrink-0" style={{ color }}>{label}</span>
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, background:color }} />
      </div>
      <span className="text-xs font-black w-8 text-right flex-shrink-0" style={{ color }}>{pct}%</span>
    </div>
  );
}

/* ─────────────────────────────────────────── Selector ─── */

function ClubSelector({ onSelect }: { onSelect:(c:Club)=>void }) {
  return (
    <div>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
          style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.2)" }}>
          <Heart size={26} style={{ color:"#f87171" }} />
        </div>
        <h2 className="text-xl font-black mb-1" style={{ color:"#e8edf5" }}>Choisissez votre club de cœur</h2>
        <p className="text-xs" style={{ color:"#6b7c96" }}>Dashboard personnalisé · Effectif · Résultats · Prédictions AI</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
        {L1_CLUBS.map(club => (
          <button key={club.id} onClick={()=>onSelect(club)}
            className="group flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background:"#0d1421", border:"1px solid #1e2d42" }}
            onMouseEnter={e=>{ const b=e.currentTarget as HTMLElement; b.style.borderColor=club.color; b.style.background=`${club.color}18`; }}
            onMouseLeave={e=>{ const b=e.currentTarget as HTMLElement; b.style.borderColor="#1e2d42"; b.style.background="#0d1421"; }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={club.crest} alt={club.shortName} className="w-11 h-11 object-contain" loading="lazy" />
            <span className="text-[10px] font-semibold text-center leading-tight" style={{ color:"#94a3b8" }}>{club.shortName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── Dashboard ─── */

function ClubDashboard({ club, onChangeClub }: { club:Club; onChangeClub:()=>void }) {
  const [standing,    setStanding]    = useState<Standing|null>(null);
  const [allStandings,setAllStandings]= useState<Standing[]>([]);
  const [squad,       setSquad]       = useState<SquadPlayer[]>([]);
  const [results,     setResults]     = useState<RecentResult[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [squadLoading,setSquadLoading]= useState(true);
  const [section, setSection] = useState<"apercu"|"effectif"|"resultats">("apercu");
  const [resTab,  setResTab]  = useState<"resultats"|"predictions">("resultats");
  const [expandedPlayer, setExpandedPlayer] = useState<string|null>(null);
  const [expandedPred,   setExpandedPred]   = useState<number|null>(null);
  const [imgError, setImgError] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [sRes, rRes] = await Promise.allSettled([
      fetch("/api/standings?t="+Date.now()).then(r=>r.json()),
      fetch("/api/results?limit=40").then(r=>r.json()),
    ]);
    if (sRes.status==="fulfilled"&&!sRes.value.error) {
      const all: Standing[] = sRes.value.standings ?? [];
      setAllStandings(all);
      setStanding(all.find(s=>s.team.id===club.id) ?? null);
    }
    if (rRes.status==="fulfilled"&&!rRes.value.error) {
      const filtered = (rRes.value.matches as RecentResult[])
        .filter(m=>resultForClub(m,club)!==null).slice(0,10);
      setResults(filtered);
    }
    setLoading(false);
  }, [club]);

  const loadSquad = useCallback(async () => {
    setSquadLoading(true);
    try {
      const res = await fetch(`/api/squad/${club.id}`);
      if (res.ok) { const d=await res.json(); setSquad(d.squad??[]); }
    } catch { /**/ }
    setSquadLoading(false);
  }, [club.id]);

  useEffect(()=>{ loadData(); loadSquad(); }, [loadData, loadSquad]);

  const zone     = standing ? getZone(standing.position) : null;
  const formArr  = standing?.form.split(",").filter(Boolean).slice(-5) ?? [];
  const formFR   = formArr.map(r=>r==="W"?"V":r==="L"?"D":"N") as ("V"|"N"|"D")[];
  const winRate  = standing && standing.playedGames>0 ? Math.round(standing.won/standing.playedGames*100) : 0;
  const progress = Math.round(((standing?.playedGames??0)/34)*100);

  // Squad grouped by position
  const byPos: Record<string,SquadPlayer[]> = {};
  squad.forEach(p => {
    const g = POS_FR[p.position] ?? p.position;
    if (!byPos[g]) byPos[g] = [];
    byPos[g].push(p);
  });
  const posGroups = Object.entries(byPos).sort(([,a],[,b])=>(POS_ORDER[a[0]?.position]??9)-(POS_ORDER[b[0]?.position]??9));

  // Predictions: pick 4 opponents from nearby in table
  const predOpps: Standing[] = [];
  if (standing && allStandings.length>0) {
    const others = allStandings.filter(s=>s.team.id!==club.id);
    // above, same group, below
    const above  = others.filter(s=>s.position<standing.position).slice(-2);
    const below  = others.filter(s=>s.position>standing.position).slice(0,2);
    predOpps.push(...above,...below);
  }

  const SECTIONS = [
    { id:"apercu"    as const, label:"Aperçu",   icon:<BarChart2 size={12}/> },
    { id:"effectif"  as const, label:"Effectif", icon:<Users size={12}/> },
    { id:"resultats" as const, label:"Résultats & Prédictions", icon:<Target size={12}/> },
  ];

  return (
    <div className="space-y-4">

      {/* ══ HERO ══ */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{ background:`linear-gradient(135deg,${club.color}22 0%,#0d1421 50%,${club.color2?club.color2+"10":"#080c14"} 100%)`, border:`1px solid ${club.color}40` }}>
        <div className="absolute inset-x-0 top-0 h-0.5" style={{ background:`linear-gradient(90deg,${club.color},${club.color2??club.color}60,transparent)` }}/>

        <div className="flex items-center gap-3 px-4 py-4">
          {/* Crest */}
          <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background:`${club.color}18`, border:`1.5px solid ${club.color}40` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={club.crest} alt="" className="w-12 h-12 object-contain" loading="lazy"/>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color:club.color }}>Mon Club · Ligue 1</p>
            <h1 className="text-lg font-black leading-tight truncate" style={{ color:"#e8edf5" }}>{club.name}</h1>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {standing && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black"
                  style={{ background:zone?zone.bg:"rgba(255,255,255,0.05)", color:zone?zone.color:"#94a3b8", border:`1px solid ${zone?zone.color+"40":"#1e2d42"}` }}>
                  {standing.position===1?<Trophy size={10}/>:<Shield size={10}/>}
                  {standing.position===1?"Champion":`${standing.position}e`}
                </span>
              )}
              {zone && standing && standing.position!==1 &&
                <span className="text-[10px] font-semibold" style={{ color:zone.color }}>{zone.label}</span>}
              {standing && <span className="text-sm font-black" style={{ color:"#e8edf5" }}>{standing.points} pts</span>}
              {loading&&!standing && <div className="h-5 w-24 rounded animate-pulse" style={{ background:"#1e2d42" }}/>}
            </div>
          </div>

          {/* Right: form + change */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <button onClick={onChangeClub}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold hover:opacity-80 transition-all"
              style={{ background:"rgba(255,255,255,0.05)", border:"1px solid #1e2d42", color:"#64748b" }}>
              <X size={9}/> Changer
            </button>
            {formFR.length>0 && (
              <div className="flex gap-1">
                {formFR.map((r,i)=><FormDot key={i} r={r}/>)}
              </div>
            )}
          </div>
        </div>

        {/* Compact stats strip */}
        {standing && (
          <div className="grid grid-cols-5 border-t" style={{ borderColor:`${club.color}25` }}>
            {[
              { l:"Pts",   v:standing.points,                        c:club.color },
              { l:"V",     v:standing.won,                           c:"#22c55e" },
              { l:"N",     v:standing.draw,                          c:"#f59e0b" },
              { l:"D",     v:standing.lost,                          c:"#ef4444" },
              { l:"DB",    v:(standing.goalDifference>0?"+":"")+standing.goalDifference, c:standing.goalDifference>=0?"#34d399":"#f87171" },
            ].map((s,i)=>(
              <div key={i} className="flex flex-col items-center py-2.5"
                style={{ borderRight:i<4?`1px solid ${club.color}20`:undefined }}>
                <span className="text-base font-black" style={{ color:s.c }}>{s.v}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color:"#6b7c96" }}>{s.l}</span>
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        {standing && (
          <div className="px-4 py-2 border-t flex items-center gap-3" style={{ borderColor:`${club.color}20` }}>
            <span className="text-[10px]" style={{ color:"#6b7c96" }}>Saison {standing.playedGames}/34</span>
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width:`${progress}%`, background:`linear-gradient(90deg,${club.color},${club.color2??club.color})` }}/>
            </div>
            <span className="text-[10px] font-semibold" style={{ color:club.color }}>{progress}%</span>
          </div>
        )}
      </div>

      {/* ══ STADIUM PHOTO ══ */}
      {(club.stadiumImg && !imgError) ? (
        <div className="rounded-2xl overflow-hidden relative" style={{ height:160, border:`1px solid ${club.color}30` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={club.stadiumImg} alt={club.stadium} className="w-full h-full object-cover"
            loading="lazy" onError={()=>setImgError(true)}
            style={{ filter:"brightness(0.55) saturate(1.1)" }}/>
          <div className="absolute inset-0" style={{ background:`linear-gradient(to top,${club.color}60 0%,transparent 60%)` }}/>
          <div className="absolute bottom-0 left-0 px-4 py-3 flex items-end gap-3">
            <div className="flex flex-col">
              <span className="text-base font-black leading-tight" style={{ color:"#e8edf5" }}>{club.stadium}</span>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-[10px]" style={{ color:"rgba(232,237,245,0.7)" }}>
                  <MapPin size={9}/> {club.city}
                </span>
                <span className="flex items-center gap-1 text-[10px]" style={{ color:"rgba(232,237,245,0.7)" }}>
                  <Users size={9}/> {club.capacity} places
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background:`${club.color}10`, border:`1px solid ${club.color}25` }}>
          <MapPin size={16} style={{ color:club.color }}/>
          <div>
            <p className="text-sm font-black" style={{ color:"#e8edf5" }}>{club.stadium}</p>
            <p className="text-[10px] mt-0.5" style={{ color:"#6b7c96" }}>{club.city} · {club.capacity} places</p>
          </div>
        </div>
      )}

      {/* ══ SECTION TABS ══ */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background:"#0a0f1c", border:"1px solid #1a2235" }}>
        {SECTIONS.map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0"
            style={{
              background:section===s.id?"rgba(255,255,255,0.08)":"transparent",
              color:section===s.id?"#e2e8f0":"#64748b",
              border:section===s.id?"1px solid rgba(255,255,255,0.1)":"1px solid transparent",
            }}>
            {s.icon}{s.label}
          </button>
        ))}
        <div className="flex-1"/>
        <button onClick={()=>{loadData();loadSquad();}}
          className="px-2 py-1 rounded-lg text-xs hover:opacity-80 transition-all" style={{ color:"#6b7c96" }}>
          <RefreshCw size={11} className={loading?"animate-spin":""}/>
        </button>
      </div>

      {/* ══════════ APERÇU ══════════ */}
      {section==="apercu" && (
        <div className="space-y-3">
          {/* Zone card */}
          {standing && zone && (
            <div className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background:zone.bg, border:`1px solid ${zone.color}30` }}>
              <Trophy size={16} style={{ color:zone.color }}/>
              <div className="flex-1">
                <span className="text-sm font-black" style={{ color:zone.color }}>{zone.label}</span>
                <span className="text-xs ml-2" style={{ color:"#6b7c96" }}>— {standing.position}e · {winRate}% victoires</span>
              </div>
              <span className="text-xs" style={{ color:"#6b7c96" }}>BP: {standing.goalsFor} / BC: {standing.goalsAgainst}</span>
            </div>
          )}

          {/* Attack & Defence mini bars */}
          {standing && (
            <div className="rounded-xl p-4 grid grid-cols-2 gap-4" style={{ background:"#0d1421", border:"1px solid #1e2d42" }}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color:"#6b7c96" }}>Attaque</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-12 flex-shrink-0" style={{ color:"#94a3b8" }}>Buts</span>
                    <MiniBar val={standing.goalsFor} max={60} color="#22c55e"/>
                    <span className="w-6 text-right font-black" style={{ color:"#22c55e" }}>{standing.goalsFor}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-12 flex-shrink-0" style={{ color:"#94a3b8" }}>Pts/m</span>
                    <MiniBar val={standing.playedGames>0?standing.points/standing.playedGames:0} max={3} color={club.color}/>
                    <span className="w-6 text-right font-black" style={{ color:club.color }}>{standing.playedGames>0?(standing.points/standing.playedGames).toFixed(1):0}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color:"#6b7c96" }}>Défense</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-12 flex-shrink-0" style={{ color:"#94a3b8" }}>Encais.</span>
                    <MiniBar val={Math.max(0,60-standing.goalsAgainst)} max={60} color="#3b82f6"/>
                    <span className="w-6 text-right font-black" style={{ color:"#3b82f6" }}>{standing.goalsAgainst}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-12 flex-shrink-0" style={{ color:"#94a3b8" }}>DB</span>
                    <MiniBar val={Math.max(0,standing.goalDifference+30)} max={60} color={standing.goalDifference>=0?"#34d399":"#f87171"}/>
                    <span className="w-6 text-right font-black" style={{ color:standing.goalDifference>=0?"#34d399":"#f87171" }}>{standing.goalDifference>0?"+":""}{standing.goalDifference}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top 3 players quick view */}
          {!squadLoading && squad.length>0 && (
            <div className="rounded-xl overflow-hidden" style={{ border:"1px solid #1e2d42" }}>
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ background:"#0d1421", borderBottom:"1px solid #1e2d42" }}>
                <Star size={11} style={{ color:club.color }}/>
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color:"#6b7c96" }}>Stars du club</span>
              </div>
              <div className="divide-y" style={{ borderColor:"rgba(30,45,66,0.4)" }}>
                {squad.filter(p=>p.position!=="Goalkeeper")
                  .sort((a,b)=>((b.xG??0)+(b.xA??0))-((a.xG??0)+(a.xA??0)))
                  .slice(0,3).map(p=>(
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ background:`${POS_COLOR[p.position]??club.color}22`, color:POS_COLOR[p.position]??club.color }}>
                        {POS_CODE[p.position]??"MIL"}
                      </span>
                      <span className="flex-1 text-sm font-semibold truncate" style={{ color:"#e8edf5" }}>{p.name}</span>
                      {p.formBadge==="hot"&&<span className="text-xs">🔥</span>}
                      <div className="text-right">
                        <span className="text-sm font-black" style={{ color:"#22c55e" }}>{p.usGoals??Math.round(p.xG??0)}</span>
                        <span className="text-xs" style={{ color:"#6b7c96" }}> B</span>
                        <span className="text-sm font-black ml-2" style={{ color:"#60a5fa" }}>{p.usAssists??Math.round(p.xA??0)}</span>
                        <span className="text-xs" style={{ color:"#6b7c96" }}> PD</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Recent results (3) */}
          {results.length>0 && (
            <div className="rounded-xl overflow-hidden" style={{ border:"1px solid #1e2d42" }}>
              <div className="px-4 py-2.5 flex items-center justify-between" style={{ background:"#0d1421", borderBottom:"1px solid #1e2d42" }}>
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color:"#6b7c96" }}>Derniers matchs</span>
                <button onClick={()=>setSection("resultats")} className="text-[10px] hover:opacity-80" style={{ color:club.color }}>Tout voir →</button>
              </div>
              {results.slice(0,3).map((m,idx)=>{
                const r=resultForClub(m,club)!;
                const isHome=teamMatchesClub(m.homeTeam.name,club)||teamMatchesClub(m.homeTeam.shortName,club);
                const opp=isHome?m.awayTeam:m.homeTeam;
                const ms=isHome?m.score.home:m.score.away, os=isHome?m.score.away:m.score.home;
                return (
                  <div key={m.id} className="flex items-center gap-2.5 px-4 py-2.5"
                    style={{ borderTop:idx>0?"1px solid rgba(30,45,66,0.4)":undefined }}>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black flex-shrink-0"
                      style={{ background:r==="V"?"rgba(34,197,94,0.15)":r==="D"?"rgba(239,68,68,0.15)":"rgba(245,158,11,0.15)",
                               color:r==="V"?"#22c55e":r==="D"?"#ef4444":"#f59e0b" }}>{r}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={opp.crest} alt="" className="w-4 h-4 object-contain flex-shrink-0" loading="lazy"/>
                    <span className="flex-1 text-xs truncate" style={{ color:"#94a3b8" }}>{isHome?"vs":"@"} {opp.shortName}</span>
                    <span className="font-black text-sm" style={{ color:r==="V"?"#22c55e":r==="D"?"#ef4444":"#f59e0b" }}>{ms}–{os}</span>
                    <span className="text-[10px] w-10 text-right" style={{ color:"#475569" }}>{fmtDate(m.date)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════ EFFECTIF ══════════ */}
      {section==="effectif" && (
        <div className="space-y-3">
          {squadLoading ? (
            <div className="space-y-2">{Array.from({length:6}).map((_,i)=>(
              <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background:"#0d1421", border:"1px solid #1e2d42" }}/>
            ))}</div>
          ) : squad.length===0 ? (
            <p className="text-center py-12 text-sm" style={{ color:"#6b7c96" }}>Effectif indisponible</p>
          ) : (
            <>
              {/* Total value header */}
              <div className="rounded-xl px-4 py-2.5 flex items-center justify-between"
                style={{ background:`${club.color}10`, border:`1px solid ${club.color}25` }}>
                <span className="text-xs font-semibold" style={{ color:"#94a3b8" }}>
                  {squad.length} joueurs • {Object.keys(byPos).length} postes
                </span>
                <span className="text-sm font-black" style={{ color:club.color }}>
                  {fmtValue(squad.reduce((s,p)=>s+(p.marketValue??0),0))} valeur totale
                </span>
              </div>

              {/* Position groups */}
              {Object.entries(byPos)
                .sort(([ka],[kb])=>{
                  const pa = squad.find(p=>POS_FR[p.position]===ka)?.position ?? "";
                  const pb = squad.find(p=>POS_FR[p.position]===kb)?.position ?? "";
                  return (POS_ORDER[pa] ?? 9) - (POS_ORDER[pb] ?? 9);
                })
                .map(([posLabel,players])=>{
                  const posKey = players[0]?.position;
                  const posColor = POS_COLOR[posKey] ?? club.color;
                  return (
                    <div key={posLabel} className="rounded-2xl overflow-hidden" style={{ border:"1px solid #1e2d42" }}>
                      {/* Position header */}
                      <div className="px-4 py-2.5 flex items-center gap-2"
                        style={{ background:`${posColor}0d`, borderBottom:"1px solid #1e2d42" }}>
                        <div className="w-1.5 h-4 rounded-full flex-shrink-0" style={{ background:posColor }}/>
                        <span className="text-xs font-black uppercase tracking-widest" style={{ color:posColor }}>{posLabel}</span>
                        <span className="text-[10px] ml-1" style={{ color:"#6b7c96" }}>{players.length} joueurs</span>
                      </div>

                      {/* Column headers */}
                      <div className="grid px-4 py-2 text-[9px] font-bold uppercase tracking-widest"
                        style={{ gridTemplateColumns:"1fr 32px 28px 28px 28px 44px 52px", background:"#0a0f1c", borderBottom:"1px solid #1e2d42", color:"#475569" }}>
                        <span>Joueur</span>
                        <span className="text-center">Âge</span>
                        <span className="text-center" style={{ color:"#22c55e" }}>B</span>
                        <span className="text-center" style={{ color:"#60a5fa" }}>PD</span>
                        <span className="text-center" style={{ color:"#f59e0b" }}>xG</span>
                        <span className="text-center hidden sm:block">Valeur</span>
                        <span/>
                      </div>

                      {/* Players */}
                      {players.sort((a,b)=>((b.xG??0)+(b.xA??0))-((a.xG??0)+(a.xA??0))).map((p,idx)=>{
                        const expanded = expandedPlayer===p.id;
                        return (
                          <div key={p.id}>
                            <div className="grid items-center px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                              style={{ gridTemplateColumns:"1fr 32px 28px 28px 28px 44px 52px", borderTop:idx>0?"1px solid rgba(30,45,66,0.35)":undefined }}
                              onClick={()=>setExpandedPlayer(expanded?null:p.id)}>
                              <div className="flex items-center gap-2 min-w-0">
                                {p.formBadge==="hot"&&<span className="text-[11px]">🔥</span>}
                                {p.formBadge==="good"&&<span className="text-[11px]">⚡</span>}
                                {p.formBadge==="cold"&&<span className="text-[11px]">🩹</span>}
                                {(!p.formBadge||p.formBadge==="neutral")&&<span className="text-[11px] opacity-0">·</span>}
                                <span className="text-sm font-semibold truncate" style={{ color:"#e8edf5" }}>{p.name}</span>
                                {p.nationality?.[0] && <span className="text-[10px] hidden sm:block" style={{ color:"#475569" }}>{p.nationality[0]}</span>}
                              </div>
                              <span className="text-center text-xs font-mono" style={{ color:"#6b7c96" }}>{p.age||"—"}</span>
                              <span className="text-center text-sm font-black" style={{ color:"#22c55e" }}>{(p.usGoals ?? Math.round(p.xG ?? 0)) || "—"}</span>
                              <span className="text-center text-sm font-black" style={{ color:"#60a5fa" }}>{(p.usAssists ?? Math.round(p.xA ?? 0)) || "—"}</span>
                              <span className="text-center text-xs font-mono" style={{ color:"#f59e0b" }}>{(p.xG??0).toFixed(1)}</span>
                              <span className="hidden sm:block text-center text-[10px] font-mono" style={{ color:"#6b7c96" }}>{p.marketValue?fmtValue(p.marketValue):"—"}</span>
                              <div className="flex justify-end">{expanded?<ChevronUp size={12} style={{color:"#6b7c96"}}/>:<ChevronDown size={12} style={{color:"#6b7c96"}}/>}</div>
                            </div>

                            {/* Expanded player stats */}
                            {expanded && (
                              <div className="px-4 py-3 border-t" style={{ background:"rgba(0,0,0,0.2)", borderColor:"rgba(30,45,66,0.4)" }}>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                  {/* Left col */}
                                  <div className="space-y-2">
                                    {posKey!=="Goalkeeper" && <>
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="w-20 flex-shrink-0" style={{ color:"#6b7c96" }}>xG saison</span>
                                        <MiniBar val={p.xG??0} max={Math.max(...squad.map(s=>s.xG??0),1)} color="#22c55e"/>
                                        <span className="w-8 text-right font-black" style={{ color:"#22c55e" }}>{(p.xG??0).toFixed(2)}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="w-20 flex-shrink-0" style={{ color:"#6b7c96" }}>xA saison</span>
                                        <MiniBar val={p.xA??0} max={Math.max(...squad.map(s=>s.xA??0),1)} color="#60a5fa"/>
                                        <span className="w-8 text-right font-black" style={{ color:"#60a5fa" }}>{(p.xA??0).toFixed(2)}</span>
                                      </div>
                                      {(p.dm_xg90??0)>0 && <div className="flex items-center gap-2 text-xs">
                                        <span className="w-20 flex-shrink-0" style={{ color:"#6b7c96" }}>xG/90</span>
                                        <MiniBar val={p.dm_xg90??0} max={1} color="#f59e0b"/>
                                        <span className="w-8 text-right font-black" style={{ color:"#f59e0b" }}>{(p.dm_xg90??0).toFixed(2)}</span>
                                      </div>}
                                      {(p.dm_shots90??0)>0 && <div className="flex items-center gap-2 text-xs">
                                        <span className="w-20 flex-shrink-0" style={{ color:"#6b7c96" }}>Tirs/90</span>
                                        <MiniBar val={p.dm_shots90??0} max={5} color="#a78bfa"/>
                                        <span className="w-8 text-right font-black" style={{ color:"#a78bfa" }}>{(p.dm_shots90??0).toFixed(1)}</span>
                                      </div>}
                                    </>}
                                    {posKey==="Goalkeeper" && <>
                                      {(p.dm_savePct??0)>0 && <div className="flex items-center gap-2 text-xs">
                                        <span className="w-20 flex-shrink-0" style={{ color:"#6b7c96" }}>Arrêts %</span>
                                        <MiniBar val={p.dm_savePct??0} max={100} color="#22c55e"/>
                                        <span className="w-8 text-right font-black" style={{ color:"#22c55e" }}>{(p.dm_savePct??0).toFixed(0)}%</span>
                                      </div>}
                                      {(p.dm_cleanSheets??0)>0 && <div className="flex items-center gap-2 text-xs">
                                        <span className="w-20 flex-shrink-0" style={{ color:"#6b7c96" }}>CS</span>
                                        <MiniBar val={p.dm_cleanSheets??0} max={20} color="#3b82f6"/>
                                        <span className="w-8 text-right font-black" style={{ color:"#3b82f6" }}>{p.dm_cleanSheets??0}</span>
                                      </div>}
                                    </>}
                                  </div>
                                  {/* Right col */}
                                  <div className="space-y-2">
                                    {(p.dm_passPct??0)>0 && <div className="flex items-center gap-2 text-xs">
                                      <span className="w-20 flex-shrink-0" style={{ color:"#6b7c96" }}>Passes %</span>
                                      <MiniBar val={p.dm_passPct??0} max={100} color="#34d399"/>
                                      <span className="w-8 text-right font-black" style={{ color:"#34d399" }}>{(p.dm_passPct??0).toFixed(0)}%</span>
                                    </div>}
                                    {(p.dm_defDuels90??0)>0 && <div className="flex items-center gap-2 text-xs">
                                      <span className="w-20 flex-shrink-0" style={{ color:"#6b7c96" }}>Duels déf/90</span>
                                      <MiniBar val={p.dm_defDuels90??0} max={10} color="#fb923c"/>
                                      <span className="w-8 text-right font-black" style={{ color:"#fb923c" }}>{(p.dm_defDuels90??0).toFixed(1)}</span>
                                    </div>}
                                    {(p.dm_interceptions90??0)>0 && <div className="flex items-center gap-2 text-xs">
                                      <span className="w-20 flex-shrink-0" style={{ color:"#6b7c96" }}>Intercep/90</span>
                                      <MiniBar val={p.dm_interceptions90??0} max={5} color="#e879f9"/>
                                      <span className="w-8 text-right font-black" style={{ color:"#e879f9" }}>{(p.dm_interceptions90??0).toFixed(1)}</span>
                                    </div>}
                                    {p.games && p.games>0 && <div className="flex items-center gap-2 text-xs">
                                      <span className="w-20 flex-shrink-0" style={{ color:"#6b7c96" }}>Matchs</span>
                                      <MiniBar val={p.games??0} max={34} color="#94a3b8"/>
                                      <span className="w-8 text-right font-black" style={{ color:"#94a3b8" }}>{p.games}</span>
                                    </div>}
                                  </div>
                                </div>
                                {/* Footer info */}
                                <div className="flex gap-3 mt-2.5 pt-2.5 border-t" style={{ borderColor:"rgba(30,45,66,0.4)" }}>
                                  {p.foot && <span className="text-[10px]" style={{ color:"#6b7c96" }}>Pied: <span style={{ color:"#94a3b8" }}>{p.foot==="right"?"Droit":p.foot==="left"?"Gauche":"Ambidextre"}</span></span>}
                                  {p.contract && <span className="text-[10px]" style={{ color:"#6b7c96" }}>Contrat: <span style={{ color:"#94a3b8" }}>{p.contract.slice(0,7)}</span></span>}
                                  {p.marketValue>0 && <span className="text-[10px]" style={{ color:"#6b7c96" }}>Valeur: <span style={{ color:club.color }}>{fmtValue(p.marketValue)}</span></span>}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
            </>
          )}
        </div>
      )}

      {/* ══════════ RÉSULTATS & PRÉDICTIONS ══════════ */}
      {section==="resultats" && (
        <div className="space-y-3">
          {/* Sub-tab switcher */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background:"#0a0f1c", border:"1px solid #1a2235" }}>
            {(["resultats","predictions"] as const).map(t=>(
              <button key={t} onClick={()=>setResTab(t)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
                style={{
                  background:resTab===t?"rgba(255,255,255,0.08)":"transparent",
                  color:resTab===t?"#e2e8f0":"#64748b",
                  border:resTab===t?"1px solid rgba(255,255,255,0.1)":"1px solid transparent",
                }}>
                {t==="resultats"?<><Calendar size={12}/> Résultats</>:<><Zap size={12}/> Prédictions AI</>}
              </button>
            ))}
          </div>

          {/* RÉSULTATS */}
          {resTab==="resultats" && (
            loading ? (
              <div className="space-y-2">{Array.from({length:5}).map((_,i)=>(
                <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background:"#0d1421", border:"1px solid #1e2d42" }}/>
              ))}</div>
            ) : results.length===0 ? (
              <p className="text-center py-12 text-sm" style={{ color:"#6b7c96" }}>Aucun résultat récent</p>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid #1e2d42" }}>
                {results.map((m,idx)=>{
                  const r=resultForClub(m,club)!;
                  const isHome=teamMatchesClub(m.homeTeam.name,club)||teamMatchesClub(m.homeTeam.shortName,club);
                  const myTeam=isHome?m.homeTeam:m.awayTeam;
                  const opp=isHome?m.awayTeam:m.homeTeam;
                  const ms=isHome?m.score.home:m.score.away, os=isHome?m.score.away:m.score.home;
                  const rc = r==="V"?"#22c55e":r==="D"?"#ef4444":"#f59e0b";
                  return (
                    <div key={m.id} className="px-4 py-3.5 hover:bg-white/[0.015] transition-colors"
                      style={{ borderTop:idx>0?"1px solid rgba(30,45,66,0.4)":undefined }}>
                      <div className="flex items-center gap-2.5">
                        {/* Badge */}
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black flex-shrink-0"
                          style={{ background:`${rc}18`, color:rc, border:`1px solid ${rc}35` }}>{r}</span>
                        {/* Teams */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={myTeam.crest} alt="" className="w-4 h-4 object-contain flex-shrink-0" loading="lazy"/>
                            <span className="text-xs font-bold hidden sm:block" style={{ color:"#e8edf5" }}>{club.shortName}</span>
                            <span className="px-2 py-0.5 rounded font-black text-sm mx-1"
                              style={{ background:"rgba(255,255,255,0.04)", color:rc }}>{ms} – {os}</span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={opp.crest} alt="" className="w-4 h-4 object-contain flex-shrink-0" loading="lazy"/>
                            <span className="text-xs truncate" style={{ color:"#94a3b8" }}>{opp.shortName}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background:"rgba(255,255,255,0.04)", color:"#6b7c96" }}>{isHome?"DOM":"EXT"}</div>
                          <div className="text-[10px] mt-0.5" style={{ color:"#475569" }}>{fmtDate(m.date)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* PRÉDICTIONS AI */}
          {resTab==="predictions" && (
            <div className="space-y-3">
              {/* Disclaimer */}
              <div className="rounded-xl px-3 py-2 flex items-center gap-2"
                style={{ background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.2)" }}>
                <Activity size={11} style={{ color:"#60a5fa" }}/>
                <p className="text-[10px]" style={{ color:"#6b7c96" }}>
                  Prédictions AI générées sur la base de la forme, de la position et des stats offensives/défensives saison en cours.
                </p>
              </div>

              {loading||!standing ? (
                <div className="space-y-3">{Array.from({length:3}).map((_,i)=>(
                  <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background:"#0d1421", border:"1px solid #1e2d42" }}/>
                ))}</div>
              ) : predOpps.length===0 ? (
                <p className="text-center py-10 text-sm" style={{ color:"#6b7c96" }}>Classement non disponible</p>
              ) : (
                predOpps.map((opp,idx)=>{
                  const proba = calcMatchProba(standing!, opp);
                  const expanded = expandedPred===idx;
                  const oppZone = getZone(opp.position);
                  const myForm = formFR;
                  const oppFormArr = opp.form.split(",").filter(Boolean).slice(-5);
                  const oppFormFR = oppFormArr.map(r=>r==="W"?"V":r==="L"?"D":"N") as ("V"|"N"|"D")[];

                  // AI factors
                  const myFormScore = formScore(standing!.form);
                  const oppFormScore = formScore(opp.form);
                  const myPPG = standing!.playedGames>0 ? standing!.points/standing!.playedGames : 0;
                  const oppPPG = opp.playedGames>0 ? opp.points/opp.playedGames : 0;

                  const factors: { label:string; val:string; good:boolean }[] = [
                    { label:"Forme récente", val:`${myFormScore}% vs ${oppFormScore}%`, good:myFormScore>=oppFormScore },
                    { label:"Pts/match",     val:`${myPPG.toFixed(2)} vs ${oppPPG.toFixed(2)}`,  good:myPPG>=oppPPG },
                    { label:"Classement",    val:`${standing!.position}e vs ${opp.position}e`,    good:standing!.position<=opp.position },
                    { label:"Diff. buts",    val:`${standing!.goalDifference>0?"+":""}${standing!.goalDifference} vs ${opp.goalDifference>0?"+":""}${opp.goalDifference}`, good:standing!.goalDifference>=opp.goalDifference },
                  ];

                  const verdict = proba.w>=40 ? "Favori" : proba.w>=33 ? "Incertain" : "Difficile";
                  const verdictColor = proba.w>=40 ? "#22c55e" : proba.w>=33 ? "#f59e0b" : "#f87171";

                  return (
                    <div key={opp.team.id} className="rounded-2xl overflow-hidden" style={{ border:`1px solid ${club.color}30` }}>
                      {/* Match header */}
                      <div className="px-4 py-3.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                        style={{ background:`${club.color}0a` }}
                        onClick={()=>setExpandedPred(expanded?null:idx)}>
                        <div className="flex items-center gap-3">
                          {/* Club vs Opp */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={club.crest} alt="" className="w-7 h-7 object-contain flex-shrink-0" loading="lazy"/>
                            <span className="text-sm font-black" style={{ color:"#e8edf5" }}>{club.shortName}</span>
                            <span className="text-xs px-2" style={{ color:"#6b7c96" }}>vs</span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={opp.team.crest} alt="" className="w-7 h-7 object-contain flex-shrink-0" loading="lazy"/>
                            <div className="min-w-0">
                              <span className="text-sm font-black truncate" style={{ color:"#e8edf5" }}>{opp.team.shortName}</span>
                              {oppZone && <span className="text-[9px] ml-1.5 font-semibold" style={{ color:oppZone.color }}>{opp.position}e</span>}
                            </div>
                          </div>
                          {/* Verdict */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg"
                              style={{ background:`${verdictColor}18`, color:verdictColor, border:`1px solid ${verdictColor}30` }}>
                              {verdict}
                            </span>
                            {expanded?<ChevronUp size={14} style={{ color:"#6b7c96" }}/>:<ChevronDown size={14} style={{ color:"#6b7c96" }}/>}
                          </div>
                        </div>

                        {/* Proba bars compact */}
                        <div className="mt-3 space-y-1.5">
                          <ProbBar label="Vic." pct={proba.w} color="#22c55e"/>
                          <ProbBar label="Nul"  pct={proba.d} color="#f59e0b"/>
                          <ProbBar label="Déf." pct={proba.l} color="#f87171"/>
                        </div>
                      </div>

                      {/* Expanded detailed prediction */}
                      {expanded && (
                        <div className="px-4 py-4 border-t space-y-4" style={{ borderColor:"rgba(30,45,66,0.4)", background:"rgba(0,0,0,0.15)" }}>
                          {/* Forme comparison */}
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color:"#6b7c96" }}>Forme récente</p>
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1">
                                {myForm.map((r,i)=><FormDot key={i} r={r}/>)}
                                {myForm.length===0&&<span className="text-xs" style={{ color:"#6b7c96" }}>—</span>}
                              </div>
                              <span className="text-[10px] font-bold px-2" style={{ color:"#6b7c96" }}>vs</span>
                              <div className="flex gap-1">
                                {oppFormFR.map((r,i)=><FormDot key={i} r={r}/>)}
                                {oppFormFR.length===0&&<span className="text-xs" style={{ color:"#6b7c96" }}>—</span>}
                              </div>
                            </div>
                          </div>

                          {/* AI Factors */}
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color:"#6b7c96" }}>Facteurs clés</p>
                            <div className="grid grid-cols-2 gap-2">
                              {factors.map((f,i)=>(
                                <div key={i} className="rounded-lg px-3 py-2"
                                  style={{ background:f.good?"rgba(34,197,94,0.07)":"rgba(239,68,68,0.07)", border:`1px solid ${f.good?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}` }}>
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    {f.good
                                      ?<TrendingUp size={10} style={{ color:"#22c55e" }}/>
                                      :<TrendingDown size={10} style={{ color:"#f87171" }}/>}
                                    <span className="text-[10px] font-bold" style={{ color:f.good?"#22c55e":"#f87171" }}>{f.label}</span>
                                  </div>
                                  <p className="text-[10px]" style={{ color:"#6b7c96" }}>{f.val}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Stats comparison table */}
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color:"#6b7c96" }}>Comparaison stats</p>
                            <div className="space-y-2">
                              {[
                                { label:"Points",      my:standing!.points,          opp:opp.points,          color:"#60a5fa", max:90 },
                                { label:"Buts marqués",my:standing!.goalsFor,        opp:opp.goalsFor,        color:"#22c55e", max:70 },
                                { label:"Buts enc.",   my:standing!.goalsAgainst,    opp:opp.goalsAgainst,    color:"#f87171", max:70, invert:true },
                              ].map(s=>{
                                const myPct   = Math.round((s.my/(s.max))*100);
                                const oppPct  = Math.round((s.opp/(s.max))*100);
                                const myBetter= s.invert ? s.my<=s.opp : s.my>=s.opp;
                                return (
                                  <div key={s.label}>
                                    <div className="flex justify-between text-[10px] mb-1">
                                      <span style={{ color:myBetter?s.color:"#6b7c96" }}>{club.shortName}: <b>{s.my}</b></span>
                                      <span style={{ color:"#6b7c96" }}>{s.label}</span>
                                      <span style={{ color:!myBetter?s.color:"#6b7c96" }}>{opp.team.shortName}: <b>{s.opp}</b></span>
                                    </div>
                                    <div className="flex h-1.5 gap-0.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.04)" }}>
                                      <div className="h-full rounded-l-full" style={{ width:`${myPct}%`, background:myBetter?s.color:`${s.color}55` }}/>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Confidence */}
                          <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                            style={{ background:`${verdictColor}0d`, border:`1px solid ${verdictColor}25` }}>
                            <div>
                              <p className="text-xs font-black" style={{ color:verdictColor }}>Verdict IA : {verdict}</p>
                              <p className="text-[10px] mt-0.5" style={{ color:"#6b7c96" }}>
                                Prob. victoire: <b style={{ color:"#22c55e" }}>{proba.w}%</b> · Confiance: <b style={{ color:"#f59e0b" }}>{proba.w>=45||proba.w<=25?"Élevée":"Modérée"}</b>
                              </p>
                            </div>
                            <Zap size={20} style={{ color:verdictColor }}/>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

/* ─────────────────────────────────────────── Main ─── */

const STORAGE_KEY = "monClub_id";

export default function MonClubTab() {
  const [clubId,   setClubId]   = useState<number|null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) setClubId(parseInt(s));
    setHydrated(true);
  }, []);

  const selectClub = (c: Club) => { localStorage.setItem(STORAGE_KEY,String(c.id)); setClubId(c.id); };
  const clearClub  = ()        => { localStorage.removeItem(STORAGE_KEY);             setClubId(null); };

  if (!hydrated) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor:"#3b82f6", borderTopColor:"transparent" }}/>
    </div>
  );

  const club = L1_CLUBS.find(c=>c.id===clubId) ?? null;
  return club ? <ClubDashboard club={club} onChangeClub={clearClub}/> : <ClubSelector onSelect={selectClub}/>;
}
