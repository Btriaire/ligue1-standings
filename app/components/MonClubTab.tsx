"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Trophy, CaretDown, CaretUp, X, TrendUp, TrendDown,
  Users, Calendar, Lightning, ArrowsClockwise, Shield, MapPin, Target,
  Star, Pulse, ChartBar, FloppyDisk, CheckCircle, ShareNetwork, Globe, Sword,
} from "@phosphor-icons/react";
import { PlayerRow, PlayerEntry, POS_ORDER, POS_FR as POS_FR_PLURAL, POS_COL } from "./PlayerCard";
import { PlayerPhoto } from "./PlayerCard";

/* ══════════════════════════════════════════ CLUBS ══ */

interface Club {
  id: number;
  name: string;
  shortName: string;
  crest: string;
  color: string;
  color2?: string;
  stadium: string;
  city: string;
  capacity: string;
  stadiumImg?: string;
}

const L1_CLUBS: Club[] = [
  { id:524,  name:"Paris Saint-Germain", shortName:"PSG",        color:"#004494", color2:"#DA0000", stadium:"Parc des Princes",       city:"Paris",              capacity:"48 583",
    stadiumImg:"https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Parc_des_Princes_-_12_Aug_2012.jpg/800px-Parc_des_Princes_-_12_Aug_2012.jpg",
    crest:"https://crests.football-data.org/524.png" },
  { id:548,  name:"AS Monaco",           shortName:"Monaco",     color:"#E03A24", color2:"#FFFFFF", stadium:"Stade Louis II",          city:"Monaco",             capacity:"18 523",
    stadiumImg:"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Stade_Louis_II_2.jpg/800px-Stade_Louis_II_2.jpg",
    crest:"https://crests.football-data.org/548.png" },
  { id:516,  name:"Olympique Marseille", shortName:"Marseille",  color:"#2FAEE0", color2:"#FFFFFF", stadium:"Orange Vélodrome",        city:"Marseille",          capacity:"67 394",
    stadiumImg:"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Stade_Velodrome%2C_Marseille%2C_outside.jpg/800px-Stade_Velodrome%2C_Marseille%2C_outside.jpg",
    crest:"https://crests.football-data.org/516.png" },
  { id:521,  name:"Lille OSC",           shortName:"Lille",      color:"#C8003B", color2:"#FFFFFF", stadium:"Stade Pierre-Mauroy",     city:"Villeneuve d'Ascq",  capacity:"50 186",
    stadiumImg:"https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Pierre_Mauroy_stadium_in_2012.jpg/800px-Pierre_Mauroy_stadium_in_2012.jpg",
    crest:"https://crests.football-data.org/521.png" },
  { id:529,  name:"Stade Rennais",       shortName:"Rennes",     color:"#E10600", color2:"#1E2D42", stadium:"Roazhon Park",            city:"Rennes",             capacity:"29 778",
    crest:"https://crests.football-data.org/529.png" },
  { id:522,  name:"OGC Nice",            shortName:"Nice",       color:"#C40026", color2:"#1A1A1A", stadium:"Allianz Riviera",         city:"Nice",               capacity:"35 624",
    stadiumImg:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Allianz_Riviera_stadium.jpg/800px-Allianz_Riviera_stadium.jpg",
    crest:"https://crests.football-data.org/522.png" },
  { id:546,  name:"RC Lens",             shortName:"Lens",       color:"#E8B400", color2:"#DA0000", stadium:"Stade Bollaert-Delelis",  city:"Lens",               capacity:"38 223",
    crest:"https://crests.football-data.org/546.png" },
  { id:523,  name:"Olympique Lyonnais",  shortName:"Lyon",       color:"#1032BC", color2:"#E40613", stadium:"Groupama Stadium",        city:"Décines-Charpieu",   capacity:"59 186",
    stadiumImg:"https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Groupama_Stadium_-_Lyon_Aout_2016.jpg/800px-Groupama_Stadium_-_Lyon_Aout_2016.jpg",
    crest:"https://crests.football-data.org/523.png" },
  { id:576,  name:"RC Strasbourg",       shortName:"Strasbourg", color:"#2965A4", color2:"#EDBA3B", stadium:"Stade de la Meinau",      city:"Strasbourg",         capacity:"26 165",
    crest:"https://crests.football-data.org/576.png" },
  { id:511,  name:"Toulouse FC",         shortName:"Toulouse",   color:"#7E1F86", color2:"#FFFFFF", stadium:"Stadium de Toulouse",     city:"Toulouse",           capacity:"33 150",
    crest:"https://crests.football-data.org/511.png" },
  { id:512,  name:"Stade Brestois",      shortName:"Brest",      color:"#DC001A", color2:"#2F4E8B", stadium:"Stade Francis-Le Blé",   city:"Brest",              capacity:"15 097",
    crest:"https://crests.football-data.org/512.png" },
  { id:532,  name:"Angers SCO",          shortName:"Angers",     color:"#2A2A2A", color2:"#FFFFFF", stadium:"Stade Raymond-Kopa",      city:"Angers",             capacity:"18 032",
    crest:"https://crests.football-data.org/532.png" },
  { id:533,  name:"Le Havre AC",         shortName:"Le Havre",   color:"#003380", color2:"#FFFFFF", stadium:"Stade Océane",            city:"Le Havre",           capacity:"25 178",
    stadiumImg:"https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Stade_oceane_le_havre.jpg/800px-Stade_oceane_le_havre.jpg",
    crest:"https://crests.football-data.org/533.png" },
  { id:519,  name:"AJ Auxerre",          shortName:"Auxerre",    color:"#001F5B", color2:"#FFFFFF", stadium:"Stade Abbé-Deschamps",    city:"Auxerre",            capacity:"19 649",
    crest:"https://crests.football-data.org/519.png" },
  { id:543,  name:"FC Nantes",           shortName:"Nantes",     color:"#E8AF00", color2:"#1B4494", stadium:"Stade de la Beaujoire",   city:"Nantes",             capacity:"38 285",
    crest:"https://crests.football-data.org/543.png" },
  { id:545,  name:"FC Metz",             shortName:"Metz",       color:"#9E1931", color2:"#F0A500", stadium:"Stade Saint-Symphorien",  city:"Longeville-lès-Metz",capacity:"26 636",
    crest:"https://crests.football-data.org/545.png" },
  { id:525,  name:"FC Lorient",          shortName:"Lorient",    color:"#E06300", color2:"#1F2E6E", stadium:"Stade du Moustoir",       city:"Lorient",            capacity:"18 586",
    crest:"https://crests.football-data.org/525.png" },
  { id:1045, name:"Paris FC",            shortName:"Paris FC",   color:"#003087", color2:"#D72020", stadium:"Stade Charléty",          city:"Paris",              capacity:"20 000",
    crest:"https://crests.football-data.org/1045.png" },
];

/* ══════════════════════════════════════════ ZONES ══ */

const ZONES = [
  { label:"Champion",            positions:[1],          color:"#60a5fa", bg:"rgba(96,165,250,0.1)"  },
  { label:"Ligue des Champions", positions:[2,3],        color:"#34d399", bg:"rgba(52,211,153,0.1)"  },
  { label:"Ligue Europa",        positions:[4],          color:"#fbbf24", bg:"rgba(251,191,36,0.1)"  },
  { label:"Conférence League",   positions:[5],          color:"#a78bfa", bg:"rgba(167,139,250,0.1)" },
  { label:"Zone de relégation",  positions:[16,17,18],   color:"#f87171", bg:"rgba(248,113,113,0.1)" },
];
const getZone = (p: number) => ZONES.find(z=>z.positions.includes(p)) ?? null;

/* ══════════════════════════════════════════ FORMATIONS ══ */

type FKey = "4-3-3"|"4-2-3-1"|"4-4-2"|"3-5-2"|"5-3-2"|"4-1-4-1";
interface Slot { role:string; type:"GK"|"DF"|"MF"|"FW"; x:number; y:number }
const FORMATIONS: Record<FKey,Slot[]> = {
  "4-3-3": [
    {role:"GB",  type:"GK",x:50,y:88},{role:"DD",type:"DF",x:82,y:70},{role:"DC",type:"DF",x:60,y:72},
    {role:"DC",  type:"DF",x:40,y:72},{role:"DG",type:"DF",x:18,y:70},{role:"MD",type:"MF",x:72,y:49},
    {role:"MC",  type:"MF",x:50,y:45},{role:"MG",type:"MF",x:28,y:49},{role:"AD",type:"FW",x:80,y:20},
    {role:"AT",  type:"FW",x:50,y:12},{role:"AG",type:"FW",x:20,y:20},
  ],
  "4-2-3-1": [
    {role:"GB",  type:"GK",x:50,y:88},{role:"DD",type:"DF",x:82,y:73},{role:"DC",type:"DF",x:60,y:75},
    {role:"DC",  type:"DF",x:40,y:75},{role:"DG",type:"DF",x:18,y:73},{role:"MDC",type:"MF",x:63,y:58},
    {role:"MDC", type:"MF",x:37,y:58},{role:"MD",type:"MF",x:78,y:37},{role:"MAC",type:"MF",x:50,y:35},
    {role:"MG",  type:"MF",x:22,y:37},{role:"AT", type:"FW",x:50,y:13},
  ],
  "4-4-2": [
    {role:"GB",  type:"GK",x:50,y:88},{role:"DD",type:"DF",x:82,y:71},{role:"DC",type:"DF",x:60,y:73},
    {role:"DC",  type:"DF",x:40,y:73},{role:"DG",type:"DF",x:18,y:71},{role:"MD",type:"MF",x:78,y:48},
    {role:"MC",  type:"MF",x:57,y:50},{role:"MC",type:"MF",x:43,y:50},{role:"MG",type:"MF",x:22,y:48},
    {role:"ATD", type:"FW",x:65,y:18},{role:"ATG",type:"FW",x:35,y:18},
  ],
  "3-5-2": [
    {role:"GB",  type:"GK",x:50,y:88},{role:"DC",type:"DF",x:72,y:73},{role:"DC",type:"DF",x:50,y:75},
    {role:"DC",  type:"DF",x:28,y:73},{role:"PD",type:"MF",x:87,y:52},{role:"MD",type:"MF",x:68,y:49},
    {role:"MC",  type:"MF",x:50,y:47},{role:"MG",type:"MF",x:32,y:49},{role:"PG",type:"MF",x:13,y:52},
    {role:"ATD", type:"FW",x:65,y:16},{role:"ATG",type:"FW",x:35,y:16},
  ],
  "5-3-2": [
    {role:"GB",  type:"GK",x:50,y:88},{role:"LD",type:"DF",x:87,y:71},{role:"DC",type:"DF",x:69,y:74},
    {role:"DC",  type:"DF",x:50,y:75},{role:"DC",type:"DF",x:31,y:74},{role:"LG",type:"DF",x:13,y:71},
    {role:"MD",  type:"MF",x:72,y:49},{role:"MC",type:"MF",x:50,y:46},{role:"MG",type:"MF",x:28,y:49},
    {role:"ATD", type:"FW",x:66,y:17},{role:"ATG",type:"FW",x:34,y:17},
  ],
  "4-1-4-1": [
    {role:"GB",  type:"GK",x:50,y:88},{role:"DD",type:"DF",x:82,y:74},{role:"DC",type:"DF",x:60,y:75},
    {role:"DC",  type:"DF",x:40,y:75},{role:"DG",type:"DF",x:18,y:74},{role:"MDC",type:"MF",x:50,y:61},
    {role:"MD",  type:"MF",x:80,y:44},{role:"MC",type:"MF",x:60,y:42},{role:"MC",type:"MF",x:40,y:42},
    {role:"MG",  type:"MF",x:20,y:44},{role:"AT", type:"FW",x:50,y:13},
  ],
};
const F_KEYS = Object.keys(FORMATIONS) as FKey[];

/* ══════════════════════════════════════════ TYPES ══ */

interface Standing {
  position:number;
  team:{ id:number; name:string; shortName:string; tla:string; crest:string };
  playedGames:number; won:number; draw:number; lost:number;
  points:number; goalsFor:number; goalsAgainst:number; goalDifference:number; form:string;
}
interface SquadPlayer {
  id:string; name:string; position:string; age:number; nationality:string[];
  marketValue:number; usGoals?:number; usAssists?:number;
  xG?:number; xA?:number; games?:number;
  dm_xg90?:number; dm_xa90?:number; dm_xgxa90?:number;
  dm_passPct?:number; dm_defDuels90?:number; dm_defDuelPct?:number;
  dm_dribblePct?:number; dm_dribbles90?:number;
  dm_interceptions90?:number; dm_aerialPct?:number;
  dm_savePct?:number; dm_gcPer90?:number; dm_cleanSheets?:number;
  dm_shots90?:number; dm_keyPasses90?:number; dm_minutes?:number;
  formBadge?:"hot"|"good"|"neutral"|"cold"; foot?:string; contract?:string;
  status?:string;
}
const isUnavailable = (p:SquadPlayer) =>
  !!p.status && /injur|suspen|bless/i.test(p.status);
interface RecentResult {
  id:number; date:string;
  homeTeam:{ name:string; shortName:string; tla:string; crest:string };
  awayTeam:{ name:string; shortName:string; tla:string; crest:string };
  score:{ home:number; away:number }; result:"home"|"away"|"draw";
}

/* ══════════════════════════════════════════ HELPERS ══ */

const normName = (s:string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
function teamMatchesClub(t:string, c:Club) {
  const n=normName(t),s=normName(c.shortName),f=normName(c.name);
  return n.includes(s)||s.includes(n)||n.includes(f.slice(0,8))||f.includes(n.slice(0,6));
}
function resultForClub(m:RecentResult, c:Club):"V"|"N"|"D"|null {
  const h=teamMatchesClub(m.homeTeam.name,c)||teamMatchesClub(m.homeTeam.shortName,c);
  const a=teamMatchesClub(m.awayTeam.name,c)||teamMatchesClub(m.awayTeam.shortName,c);
  if(!h&&!a) return null;
  if(m.result==="draw") return "N";
  return (h&&m.result==="home")||(a&&m.result==="away") ? "V":"D";
}
const fmtDate = (d:string) => new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"});
const fmtVal  = (v:number) => v>=1_000_000 ? `${(v/1_000_000).toFixed(1)}M€` : v>=1_000 ? `${(v/1_000).toFixed(0)}k€` : `${v}€`;
function formScore(f:string) {
  const a=f.split(",").filter(Boolean).slice(-5);
  return a.length ? Math.round(a.reduce((s,r)=>s+(r==="W"?3:r==="D"?1:0),0)/(a.length*3)*100) : 50;
}
function calcProba(t:Standing,o:Standing):{w:number;d:number;l:number} {
  const ts=formScore(t.form)/100,os=formScore(o.form)/100;
  const pf=(o.position-t.position)*0.012,gf=(t.goalDifference-o.goalDifference)/80;
  let w=0.36+(ts-os)*0.22+pf+gf,l=0.34-(ts-os)*0.18-pf-gf;
  w=Math.max(0.08,Math.min(0.78,w));l=Math.max(0.08,Math.min(0.78,l));
  const d=Math.max(0.12,1-w-l),tot=w+d+l;
  return {w:Math.round(w/tot*100),d:Math.round(d/tot*100),l:Math.round(l/tot*100)};
}
function getSessionId():string {
  let id=localStorage.getItem("fp_session_id");
  if(!id){id=Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem("fp_session_id",id);}
  return id;
}

const POS_FR:Record<string,string>    = {Goalkeeper:"Gardien",Defender:"Défenseur",Midfielder:"Milieu",Winger:"Ailier","Centre-Forward":"Attaquant"};
const POS_COLOR:Record<string,string> = {Goalkeeper:"#f59e0b",Defender:"#3b82f6",Midfielder:"#a78bfa",Winger:"#34d399","Centre-Forward":"#ef4444"};
const POS_CODE:Record<string,string>  = {Goalkeeper:"GB",Defender:"DEF",Midfielder:"MIL",Winger:"AIL","Centre-Forward":"ATT"};
const POS_ORD:Record<string,number>   = {Goalkeeper:1,Defender:2,Midfielder:3,Winger:4,"Centre-Forward":5};
function slotPosMatch(type:"GK"|"DF"|"MF"|"FW", pos:string):boolean {
  if(type==="GK") return pos==="Goalkeeper";
  if(type==="DF") return pos==="Defender";
  if(type==="MF") return pos==="Midfielder"||pos==="Winger";
  return pos==="Centre-Forward"||pos==="Winger";
}

/* ══════════════════════════════════════════ ATOMS ══ */

function FormDot({r}:{r:"V"|"N"|"D"}) {
  const c={V:"#22c55e",N:"#f59e0b",D:"#ef4444"}[r];
  return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-black flex-shrink-0"
    style={{background:`${c}1a`,border:`1.5px solid ${c}`,color:c}}>{r}</span>;
}
function MiniBar({val,max,color}:{val:number;max:number;color:string}) {
  const p=max>0?Math.min(100,Math.round((val/max)*100)):0;
  return <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.06)"}}>
    <div className="h-full rounded-full" style={{width:`${p}%`,background:color}}/>
  </div>;
}
function ProbBar({label,pct,color}:{label:string;pct:number;color:string}) {
  return <div className="flex items-center gap-2">
    <span className="text-[10px] font-bold w-8 flex-shrink-0" style={{color}}>{label}</span>
    <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.05)"}}>
      <div className="h-full rounded-full transition-all duration-700" style={{width:`${pct}%`,background:color}}/>
    </div>
    <span className="text-xs font-black w-8 text-right flex-shrink-0" style={{color}}>{pct}%</span>
  </div>;
}

/* ══════════════════════════════════════════ STADIUM CARD ══ */

function StadiumCard({club}:{club:Club}) {
  const [imgOk, setImgOk] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  // SVG pitch (top-down, landscape) always shown as base
  const pitchSVG = (
    <svg viewBox="0 0 800 280" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"
      style={{position:"absolute",inset:0}}>
      <rect width="800" height="280" fill="#1e4d1e"/>
      {/* Stripes */}
      {[0,1,2,3,4,5,6,7].map(i=>(
        <rect key={i} x={i*100} y="0" width="100" height="280" fill={i%2===0?"#1e4d1e":"#1a461a"}/>
      ))}
      {/* Pitch outline */}
      <rect x="24" y="18" width="752" height="244" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2"/>
      {/* Halfway line */}
      <line x1="400" y1="18" x2="400" y2="262" stroke="rgba(255,255,255,0.55)" strokeWidth="2"/>
      {/* Center circle */}
      <circle cx="400" cy="140" r="46" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2"/>
      <circle cx="400" cy="140" r="3" fill="rgba(255,255,255,0.7)"/>
      {/* Left penalty area */}
      <rect x="24" y="74" width="110" height="132" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2"/>
      <rect x="24" y="104" width="50" height="72" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
      <line x1="24" y1="140" x2="14" y2="140" stroke="rgba(255,255,255,0.55)" strokeWidth="3"/>
      {/* Right penalty area */}
      <rect x="666" y="74" width="110" height="132" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2"/>
      <rect x="726" y="104" width="50" height="72" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"/>
      <line x1="776" y1="140" x2="786" y2="140" stroke="rgba(255,255,255,0.55)" strokeWidth="3"/>
      {/* Overlay gradient */}
      <defs>
        <linearGradient id={`sg${club.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={club.color} stopOpacity="0.05"/>
          <stop offset="100%" stopColor={club.color} stopOpacity="0.45"/>
        </linearGradient>
      </defs>
      <rect width="800" height="280" fill={`url(#sg${club.id})`}/>
    </svg>
  );

  return (
    <div className="rounded-2xl overflow-hidden relative" style={{height:150, border:`1px solid ${club.color}35`}}>
      {pitchSVG}
      {/* Real stadium photo overlay if available */}
      {club.stadiumImg && !imgFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={club.stadiumImg} alt={club.stadium}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{opacity:imgOk?0.55:0, filter:"brightness(0.8) saturate(1.1)"}}
          loading="lazy"
          onLoad={()=>setImgOk(true)}
          onError={()=>setImgFailed(true)}/>
      )}
      {/* Gradient bottom overlay */}
      <div className="absolute inset-0" style={{background:`linear-gradient(to top,rgba(8,12,20,0.92) 0%,rgba(8,12,20,0.3) 50%,transparent 100%)`}}/>
      {/* Info */}
      <div className="absolute bottom-0 left-0 px-4 py-3 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={club.crest} alt="" className="w-8 h-8 object-contain flex-shrink-0 drop-shadow-lg" loading="lazy"/>
        <div>
          <p className="text-sm font-black leading-tight" style={{color:"#e8edf5"}}>{club.stadium}</p>
          <div className="flex items-center gap-2.5 mt-0.5">
            <span className="flex items-center gap-1 text-[10px]" style={{color:"rgba(232,237,245,0.6)"}}>
              <MapPin size={8}/>{club.city}
            </span>
            <span className="flex items-center gap-1 text-[10px]" style={{color:"rgba(232,237,245,0.6)"}}>
              <Users size={8}/>{club.capacity} places
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════ MA COMPO — PITCH ══ */

function FootPitch({color}:{color:string}) {
  return (
    <svg viewBox="0 0 200 290" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"
      style={{position:"absolute",inset:0}}>
      <rect width="200" height="290" fill="#1e4d1e"/>
      {/* Vertical stripes */}
      {[0,1,2,3,4].map(i=><rect key={i} x={i*40} width="40" height="290" fill={i%2===0?"#1e4d1e":"#1a461a"}/>)}
      {/* Pitch outline */}
      <rect x="8" y="10" width="184" height="270" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
      {/* Halfway line */}
      <line x1="8" y1="145" x2="192" y2="145" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
      {/* Center circle */}
      <circle cx="100" cy="145" r="28" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
      <circle cx="100" cy="145" r="2" fill="rgba(255,255,255,0.6)"/>
      {/* Top penalty area */}
      <rect x="44" y="10" width="112" height="46" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
      <rect x="64" y="10" width="72" height="22" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
      <line x1="80" y1="10" x2="120" y2="10" stroke="rgba(255,255,255,0.7)" strokeWidth="3"/>
      {/* Bottom penalty area */}
      <rect x="44" y="234" width="112" height="46" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
      <rect x="64" y="258" width="72" height="22" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
      <line x1="80" y1="280" x2="120" y2="280" stroke="rgba(255,255,255,0.7)" strokeWidth="3"/>
      {/* Color overlay */}
      <defs>
        <linearGradient id="po" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.12"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.06"/>
        </linearGradient>
      </defs>
      <rect width="200" height="290" fill="url(#po)"/>
    </svg>
  );
}

/* ══════════════════════════════════════════ SELECTOR ══ */

function ClubSelector({onSelect}:{onSelect:(c:Club)=>void}) {
  return (
    <div>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
          style={{background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.2)"}}>
          <Shield size={26} style={{color:"#60a5fa"}}/>
        </div>
        <h2 className="text-xl font-black mb-1" style={{color:"#e8edf5"}}>Choisissez votre club de cœur</h2>
        <p className="text-xs" style={{color:"#6b7c96"}}>Aperçu · Effectif · Résultats · Prédictions AI · Ma Compo</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
        {L1_CLUBS.map(club=>(
          <button key={club.id} onClick={()=>onSelect(club)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            style={{background:"#0d1421",border:"1px solid #1e2d42"}}
            onMouseEnter={e=>{const b=e.currentTarget as HTMLElement;b.style.borderColor=club.color;b.style.background=`${club.color}18`;}}
            onMouseLeave={e=>{const b=e.currentTarget as HTMLElement;b.style.borderColor="#1e2d42";b.style.background="#0d1421";}}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={club.crest} alt={club.shortName} className="w-11 h-11 object-contain" loading="lazy"/>
            <span className="text-[10px] font-semibold text-center leading-tight" style={{color:"#94a3b8"}}>{club.shortName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════ DASHBOARD ══ */

function ClubDashboard({club,onChangeClub}:{club:Club;onChangeClub:()=>void}) {
  const [standing,     setStanding]     = useState<Standing|null>(null);
  const [allStandings, setAllStandings] = useState<Standing[]>([]);
  const [squad,        setSquad]        = useState<SquadPlayer[]>([]);
  const [results,      setResults]      = useState<RecentResult[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [sqLoading,    setSqLoading]    = useState(true);
  const [section, setSection] = useState<"apercu"|"effectif"|"resultats"|"compo"|"fiche">("apercu");
  const [resTab,  setResTab]  = useState<"resultats"|"predictions">("resultats");
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const [exPred,   setExPred]   = useState<number|null>(null);

  // Ma Compo state
  const COMPO_KEY = `monClub_compo_${club.id}`;
  const [formation,  setFormation]  = useState<FKey>("4-3-3");
  const [players11,  setPlayers11]  = useState<(string|null)[]>(Array(11).fill(null));
  const [selSlot,    setSelSlot]    = useState<number|null>(null);
  const [compoSaved, setCompoSaved] = useState(false);
  const [compoSaving,setCompoSaving]= useState(false);
  const [compoView,  setCompoView]  = useState<"personal"|"community">("personal");
  const [communityTeam, setCommunityTeam] = useState<{votes:number;formation:FKey;players:(string|null)[];slotDetails:{name:string;count:number}[][];}|null>(null);
  const [communityLoading, setCommunityLoading] = useState(false);

  // La Fiche state
  const [ficheOpponentId, setFicheOpponentId] = useState<number|null>(null);
  const [ficheNextMatch, setFicheNextMatch] = useState<{id:number;date:string;matchday:number;homeTeam:{id:number;name:string;crest:string};awayTeam:{id:number;name:string;crest:string}}|null>(null);
  const [ficheTeamData, setFicheTeamData] = useState<{recent:{date:string;homeTeam:{id:number;name:string;crest:string};awayTeam:{id:number;name:string;crest:string};score:{home:number|null;away:number|null}}[];upcoming:{date:string;homeTeam:{id:number;name:string;crest:string};awayTeam:{id:number;name:string;crest:string};score:{home:number|null;away:number|null}}[]}|null>(null);
  const [ficheSquad, setFicheSquad] = useState<SquadPlayer[]>([]);
  const [ficheLoading, setFicheLoading] = useState(false);
  const [ficheMatchLoaded, setFicheMatchLoaded] = useState(false);

  // Load compo from LS
  useEffect(()=>{
    try {
      const s=localStorage.getItem(COMPO_KEY);
      if(s){ const d=JSON.parse(s); setFormation(d.formation??"4-3-3"); setPlayers11(d.players??Array(11).fill(null)); }
    } catch { /**/ }
  }, [COMPO_KEY]);

  const saveCompo = async () => {
    setCompoSaving(true);
    // Save locally
    localStorage.setItem(COMPO_KEY, JSON.stringify({formation,players:players11}));
    // Save to Firestore via API
    try {
      await fetch("/api/compo", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({clubId:club.id,clubName:club.name,formation,players:players11,sessionId:getSessionId()}),
      });
    } catch { /**/ }
    setCompoSaving(false);
    setCompoSaved(true);
    setTimeout(()=>setCompoSaved(false),3000);
  };

  const loadCommunityTeam = async () => {
    setCommunityLoading(true);
    try {
      const r=await fetch(`/api/compo?clubId=${club.id}`);
      if(r.ok){
        const d=await r.json();
        if(d.votes>0) setCommunityTeam({votes:d.votes,formation:d.formation as FKey,players:d.players,slotDetails:d.slotDetails});
      }
    } catch { /**/ }
    setCommunityLoading(false);
  };

  const buildTweet = (team:{formation:FKey;players:(string|null)[];votes:number}) => {
    const slots=FORMATIONS[team.formation];
    const byType:{GK:string[];DF:string[];MF:string[];FW:string[]}={GK:[],DF:[],MF:[],FW:[]};
    slots.forEach((s,i)=>{ const n=team.players[i]; if(n) byType[s.type].push(n.split(" ").pop()!); });
    const lines=[
      `⚽ L'équipe type des supporters du ${club.shortName} selon FootPredictom ! (${team.votes} votes)`,
      ``,
      `Formation: ${team.formation}`,
      byType.GK.length?`🧤 ${byType.GK.join(" · ")}`:"",
      byType.DF.length?`🔵 ${byType.DF.join(" · ")}`:"",
      byType.MF.length?`🟢 ${byType.MF.join(" · ")}`:"",
      byType.FW.length?`🔴 ${byType.FW.join(" · ")}`:"",
      ``,
      `Votre compo sur FootPredictom 🚀`,
      `#${club.shortName.replace(/\s/g,"")} #Ligue1 #FootPredictom`,
    ].filter(l=>l!==undefined);
    return encodeURIComponent(lines.join("\n"));
  };

  const clearCompo = () => { setPlayers11(Array(11).fill(null)); setSelSlot(null); };

  const randomCompo = () => {
    // Keep already-placed players, only fill empty slots
    const arr = [...players11];
    const alreadyUsed = new Set(arr.filter(Boolean) as string[]);
    const emptySlots = arr.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
    if (emptySlots.length === 0) return;

    const slots = FORMATIONS[formation];

    // Pool: available players not already on the pitch — shuffled randomly
    const pool = squad.filter(p => !isUnavailable(p) && !alreadyUsed.has(p.name));
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Fill each empty slot with a player matching the slot's required position
    const remaining = new Set(shuffled.map(p => p.name));
    emptySlots.forEach((slotIdx) => {
      const slotType = slots[slotIdx]?.type;
      // First pass: strict position match
      const match = slotType
        ? shuffled.find(p => remaining.has(p.name) && slotPosMatch(slotType, p.position))
        : null;
      // Fallback: any remaining player (keeps compo complete even if squad lacks depth)
      const pick = match ?? shuffled.find(p => remaining.has(p.name));
      if (pick) { arr[slotIdx] = pick.name; remaining.delete(pick.name); }
    });
    setPlayers11(arr);
    setSelSlot(null);
    setCompoSaved(false);
  };
  const changeFormation = (f:FKey) => { setFormation(f); setPlayers11(Array(11).fill(null)); setSelSlot(null); };
  const assignPlayer = (idx:number, name:string) => {
    const arr=[...players11].map(p=>p===name?null:p);
    arr[idx]=name;
    setPlayers11(arr);
    setSelSlot(null);
  };

  const loadData = useCallback(async()=>{
    setLoading(true);
    const [sR,rR]=await Promise.allSettled([
      fetch("/api/standings?t="+Date.now()).then(r=>r.json()),
      fetch("/api/results?limit=40").then(r=>r.json()),
    ]);
    if(sR.status==="fulfilled"&&!sR.value.error){
      const all:Standing[]=sR.value.standings??[];
      setAllStandings(all);
      setStanding(all.find(s=>s.team.id===club.id)??null);
    }
    if(rR.status==="fulfilled"&&!rR.value.error){
      setResults((rR.value.matches as RecentResult[]).filter(m=>resultForClub(m,club)!==null).slice(0,10));
    }
    setLoading(false);
  },[club]);

  const loadSquad = useCallback(async()=>{
    setSqLoading(true);
    try{
      const r=await fetch(`/api/squad/${club.id}`);
      if(r.ok){const d=await r.json();setSquad(d.squad??[]);}
    }catch{/**/ }
    setSqLoading(false);
  },[club.id]);

  useEffect(()=>{loadData();loadSquad();},[loadData,loadSquad]);

  // Load next match info for "La Fiche" tab (fall back to last match when season is over)
  useEffect(()=>{
    if(ficheMatchLoaded) return;
    let cancelled=false;
    (async()=>{
      try{
        const r=await fetch(`/api/team/${club.id}`);
        if(!r.ok||cancelled) return;
        const d=await r.json();
        // Prefer next scheduled match; fall back to most-recent finished match
        const next=d.upcoming?.[0]??null;
        const last=d.recent?.[0]??null;
        const ref=next??last;
        if(ref&&!cancelled){
          // Always store the reference match so FicheSection can display opponent info
          setFicheNextMatch(ref);
          const oppId=ref.homeTeam.id===club.id?ref.awayTeam.id:ref.homeTeam.id;
          setFicheOpponentId(oppId);
        }
      }catch{/**/ }
      if(!cancelled) setFicheMatchLoaded(true);
    })();
    return ()=>{cancelled=true;};
  },[club.id,ficheMatchLoaded]);

  // Pre-fetch opponent data as soon as opponentId is known
  // NOTE: ficheLoading intentionally excluded from deps — including it causes self-cancellation
  // (cleanup sets cancelled=true when loading→true, preventing setFicheLoading(false) from ever running)
  useEffect(()=>{
    if(ficheOpponentId===null||ficheTeamData!==null) return;
    let cancelled=false;
    setFicheLoading(true);
    (async()=>{
      try{
        const [tR,sR]=await Promise.allSettled([
          fetch(`/api/team/${ficheOpponentId}`).then(r=>r.json()),
          fetch(`/api/squad/${ficheOpponentId}`).then(r=>r.json()),
        ]);
        if(cancelled) return;
        if(tR.status==="fulfilled"&&!tR.value.error) setFicheTeamData(tR.value);
        if(sR.status==="fulfilled"&&!sR.value.error) setFicheSquad(sR.value.squad??[]);
      }catch{/**/ }
      if(!cancelled) setFicheLoading(false);
    })();
    return ()=>{cancelled=true;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ficheOpponentId,ficheTeamData]);

  const zone    = standing?getZone(standing.position):null;
  const formFR  = (standing?.form.split(",").filter(Boolean).slice(-5)??[]).map(r=>r==="W"?"V":r==="L"?"D":"N") as ("V"|"N"|"D")[];
  const winRate = standing&&standing.playedGames>0?Math.round(standing.won/standing.playedGames*100):0;
  const progress= Math.round(((standing?.playedGames??0)/34)*100);

  // Squad grouped by position
  const byPos:Record<string,SquadPlayer[]>={};
  squad.forEach(p=>{const g=POS_FR[p.position]??p.position;(byPos[g]=byPos[g]??[]).push(p);});
  const hasStats = squad.some(p=>(p.xG??0)+(p.xA??0)+(p.usGoals??0)>0);

  // Prediction opponents
  const predOpps:Standing[] = [];
  if(standing&&allStandings.length>0){
    const others=allStandings.filter(s=>s.team.id!==club.id);
    predOpps.push(...others.filter(s=>s.position<standing.position).slice(-2));
    predOpps.push(...others.filter(s=>s.position>standing.position).slice(0,2));
  }

  // Current formation slots
  const slots = FORMATIONS[formation];
  const filledCount = players11.filter(Boolean).length;

  const SECTIONS=[
    {id:"apercu"    as const, label:"Aperçu",        icon:<ChartBar size={11}/>},
    {id:"effectif"  as const, label:"Effectif",      icon:<Users size={11}/>},
    {id:"resultats" as const, label:"Résultats",     icon:<Target size={11}/>},
    {id:"compo"     as const, label:"Ma Compo !",    icon:<Star size={11}/>},
    {id:"fiche"     as const, label:"La Fiche",      icon:<Sword size={11}/>},
  ];

  return (
    <div className="space-y-4">

      {/* ══ HERO ══ */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{background:`linear-gradient(135deg,${club.color}20 0%,#0d1421 50%,${club.color2?club.color2+"0e":"#080c14"} 100%)`,border:`1px solid ${club.color}40`}}>
        <div className="absolute inset-x-0 top-0 h-0.5" style={{background:`linear-gradient(90deg,${club.color},${club.color2??club.color}60,transparent)`}}/>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{background:`${club.color}18`,border:`1.5px solid ${club.color}40`}}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={club.crest} alt="" className="w-11 h-11 object-contain" loading="lazy"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{color:club.color}}>Mon Club · Ligue 1</p>
            <h1 className="text-base font-black leading-tight truncate" style={{color:"#e8edf5"}}>{club.name}</h1>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {standing&&<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black"
                style={{background:zone?zone.bg:"rgba(255,255,255,0.05)",color:zone?zone.color:"#94a3b8",border:`1px solid ${zone?zone.color+"40":"#1e2d42"}`}}>
                {standing.position===1?<><Star size={9}/> Champion</>:<><Shield size={9}/>{standing.position}e</>}
              </span>}
              {zone&&standing&&standing.position!==1&&<span className="text-[9px] font-semibold" style={{color:zone.color}}>{zone.label}</span>}
              {standing&&<span className="text-sm font-black ml-1" style={{color:"#e8edf5"}}>{standing.points} pts</span>}
              {loading&&!standing&&<div className="h-5 w-20 rounded animate-pulse" style={{background:"#1e2d42"}}/>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button onClick={onChangeClub} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] hover:opacity-80" style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1e2d42",color:"#64748b"}}>
              <X size={8}/> Changer
            </button>
            {formFR.length>0&&<div className="flex gap-0.5">{formFR.map((r,i)=><FormDot key={i} r={r}/>)}</div>}
          </div>
        </div>

        {/* Stats strip */}
        {standing&&(
          <div className="grid grid-cols-5 border-t" style={{borderColor:`${club.color}22`}}>
            {[{l:"Pts",v:standing.points,c:club.color},{l:"V",v:standing.won,c:"#22c55e"},{l:"N",v:standing.draw,c:"#f59e0b"},
              {l:"D",v:standing.lost,c:"#ef4444"},{l:"DB",v:(standing.goalDifference>0?"+":"")+standing.goalDifference,c:standing.goalDifference>=0?"#34d399":"#f87171"}
            ].map((s,i)=>(
              <div key={i} className="flex flex-col items-center py-2" style={{borderRight:i<4?`1px solid ${club.color}18`:undefined}}>
                <span className="text-base font-black" style={{color:s.c}}>{s.v}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{color:"#6b7c96"}}>{s.l}</span>
              </div>
            ))}
          </div>
        )}
        {/* Progress */}
        {standing&&(
          <div className="px-4 py-2 border-t flex items-center gap-3" style={{borderColor:`${club.color}18`}}>
            <span className="text-[9px]" style={{color:"#6b7c96"}}>Saison {standing.playedGames}/34</span>
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.06)"}}>
              <div className="h-full rounded-full" style={{width:`${progress}%`,background:`linear-gradient(90deg,${club.color},${club.color2??club.color})`}}/>
            </div>
            <span className="text-[9px] font-semibold" style={{color:club.color}}>{progress}%</span>
          </div>
        )}
      </div>

      {/* ══ STADIUM ══ */}
      <StadiumCard club={club}/>

      {/* ══ SECTION TABS ══ */}
      <div className="flex gap-0.5 p-1 rounded-xl overflow-x-auto" style={{background:"#0a0f1c",border:"1px solid #1a2235"}}>
        {SECTIONS.map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0"
            style={{background:section===s.id?"rgba(255,255,255,0.08)":"transparent",color:section===s.id?"#e2e8f0":"#64748b",border:section===s.id?"1px solid rgba(255,255,255,0.1)":"1px solid transparent"}}>
            {s.icon}{s.label}
            {s.id==="compo"&&filledCount>0&&<span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-black" style={{background:`${club.color}30`,color:club.color}}>{filledCount}/11</span>}
          </button>
        ))}
        <div className="flex-1"/>
        <button onClick={()=>{loadData();loadSquad();}} className="px-2 py-1 rounded-lg hover:opacity-80" style={{color:"#6b7c96"}}>
          <ArrowsClockwise size={11} className={loading?"animate-spin":""}/>
        </button>
      </div>

      {/* ══════════ APERÇU ══════════ */}
      {section==="apercu"&&(
        <div className="space-y-3">
          {standing&&(
            <div className="rounded-xl p-4 grid grid-cols-2 gap-4" style={{background:"#0d1421",border:"1px solid #1e2d42"}}>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{color:"#6b7c96"}}>Attaque</p>
                <div className="space-y-1.5">
                  {[{l:"Buts",v:standing.goalsFor,max:65,c:"#22c55e"},{l:"Pts/m",v:standing.playedGames>0?+(standing.points/standing.playedGames).toFixed(2):0,max:3,c:club.color}].map(r=>(
                    <div key={r.l} className="flex items-center gap-2 text-xs">
                      <span className="w-10 flex-shrink-0" style={{color:"#94a3b8"}}>{r.l}</span>
                      <MiniBar val={r.v} max={r.max} color={r.c}/>
                      <span className="w-8 text-right font-black" style={{color:r.c}}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{color:"#6b7c96"}}>Défense</p>
                <div className="space-y-1.5">
                  {[{l:"Enc.",v:Math.max(0,60-standing.goalsAgainst),max:60,c:"#3b82f6",raw:standing.goalsAgainst},
                    {l:"DB",  v:Math.max(0,standing.goalDifference+35),max:70,c:standing.goalDifference>=0?"#34d399":"#f87171",raw:(standing.goalDifference>0?"+":"")+standing.goalDifference}
                  ].map(r=>(
                    <div key={r.l} className="flex items-center gap-2 text-xs">
                      <span className="w-10 flex-shrink-0" style={{color:"#94a3b8"}}>{r.l}</span>
                      <MiniBar val={r.v} max={r.max} color={r.c}/>
                      <span className="w-8 text-right font-black" style={{color:r.c}}>{r.raw}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {zone&&standing&&standing.position!==1&&(
            <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{background:zone.bg,border:`1px solid ${zone.color}30`}}>
              <Trophy size={14} style={{color:zone.color}}/><span className="text-sm font-black" style={{color:zone.color}}>{zone.label}</span>
              <span className="text-xs ml-1" style={{color:"#6b7c96"}}>· {standing.position}e · {winRate}% victoires</span>
            </div>
          )}
          {!sqLoading&&squad.length>0&&(
            <div className="rounded-xl overflow-hidden" style={{border:"1px solid #1e2d42"}}>
              <div className="px-3 py-2 flex items-center gap-2" style={{background:"#0d1421",borderBottom:"1px solid #1e2d42"}}>
                <Star size={10} style={{color:club.color}}/><span className="text-[9px] font-black uppercase tracking-widest" style={{color:"#6b7c96"}}>Stars</span>
              </div>
              {squad.filter(p=>p.position!=="Goalkeeper")
                .sort((a,b)=>((b.xG??0)+(b.xA??0))-((a.xG??0)+(a.xA??0))).slice(0,3).map(p=>(
                <div key={p.id} className="flex items-center gap-2.5 px-3 py-2.5" style={{borderTop:"1px solid rgba(30,45,66,0.4)"}}>
                  <span className="text-[9px] font-black px-1 py-0.5 rounded" style={{background:`${POS_COLOR[p.position]??club.color}22`,color:POS_COLOR[p.position]??club.color}}>{POS_CODE[p.position]??"MIL"}</span>
                  {p.formBadge==="hot"&&<span className="text-xs">🔥</span>}
                  <span className="flex-1 text-sm font-semibold truncate" style={{color:"#e8edf5"}}>{p.name}</span>
                  <span className="font-black text-sm" style={{color:"#22c55e"}}>{(p.usGoals ?? Math.round(p.xG ?? 0)) || "—"}<span className="text-[9px] font-normal ml-0.5" style={{color:"#6b7c96"}}>B</span></span>
                  <span className="font-black text-sm" style={{color:"#60a5fa"}}>{(p.usAssists ?? Math.round(p.xA ?? 0)) || "—"}<span className="text-[9px] font-normal ml-0.5" style={{color:"#6b7c96"}}>PD</span></span>
                </div>
              ))}
            </div>
          )}
          {results.length>0&&(
            <div className="rounded-xl overflow-hidden" style={{border:"1px solid #1e2d42"}}>
              <div className="px-3 py-2 flex items-center justify-between" style={{background:"#0d1421",borderBottom:"1px solid #1e2d42"}}>
                <span className="text-[9px] font-black uppercase tracking-widest" style={{color:"#6b7c96"}}>Derniers matchs</span>
                <button onClick={()=>setSection("resultats")} className="text-[9px] hover:opacity-80" style={{color:club.color}}>Tout voir →</button>
              </div>
              {results.slice(0,3).map((m,idx)=>{
                const r=resultForClub(m,club)!;
                const isH=teamMatchesClub(m.homeTeam.name,club)||teamMatchesClub(m.homeTeam.shortName,club);
                const opp=isH?m.awayTeam:m.homeTeam;
                const ms=isH?m.score.home:m.score.away,os=isH?m.score.away:m.score.home;
                const rc=r==="V"?"#22c55e":r==="D"?"#ef4444":"#f59e0b";
                return (
                  <div key={m.id} className="flex items-center gap-2 px-3 py-2" style={{borderTop:idx>0?"1px solid rgba(30,45,66,0.4)":undefined}}>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[9px] font-black flex-shrink-0" style={{background:`${rc}18`,color:rc}}>{r}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={opp.crest} alt="" className="w-4 h-4 object-contain flex-shrink-0" loading="lazy"/>
                    <span className="flex-1 text-xs truncate" style={{color:"#94a3b8"}}>{isH?"vs":"@"} {opp.shortName}</span>
                    <span className="font-black text-sm" style={{color:rc}}>{ms}–{os}</span>
                    <span className="text-[9px] w-9 text-right" style={{color:"#475569"}}>{fmtDate(m.date)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════ EFFECTIF ══════════ */}
      {section==="effectif"&&(
        <div className="space-y-3">
          {sqLoading?(
            <div className="space-y-2">{Array.from({length:5}).map((_,i)=>(
              <div key={i} className="h-12 rounded-xl animate-pulse" style={{background:"#0d1421",border:"1px solid #1e2d42"}}/>
            ))}</div>
          ):squad.length===0?(
            <p className="text-center py-10 text-sm" style={{color:"#6b7c96"}}>Effectif indisponible</p>
          ):(
            <>
              <div className="rounded-xl px-4 py-2.5 flex items-center justify-between"
                style={{background:`${club.color}0e`,border:`1px solid ${club.color}25`}}>
                <span className="text-xs" style={{color:"#94a3b8"}}>{squad.length} joueurs</span>
                <span className="text-sm font-black" style={{color:club.color}}>
                  {fmtVal(squad.reduce((s,p)=>s+(p.marketValue??0),0))} valeur totale
                </span>
              </div>
              {POS_ORDER.map(pos => {
                const playersInPos = squad.filter(p => p.position === pos);
                if (playersInPos.length === 0) return null;
                const pc = POS_COL[pos] ?? club.color;
                // Map SquadPlayer → PlayerEntry for shared component
                const entries: PlayerEntry[] = playersInPos.map(p => ({
                  ...p,
                  nationality: p.nationality ?? [],
                  clubId: club.id,
                  club: { id: club.id, name: club.name, shortName: club.shortName, crest: club.crest },
                }));
                return (
                  <div key={pos}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"
                      style={{color: pc}}>
                      <span className="w-1 h-3 rounded-full inline-block" style={{background: pc}}/>
                      {POS_FR_PLURAL[pos]} · {playersInPos.length}
                    </p>
                    {entries
                      .sort((a, b) => ((b.dm_xgxa90 ?? 0) + (b.xG ?? 0)) - ((a.dm_xgxa90 ?? 0) + (a.xG ?? 0)))
                      .map(p => {
                        const uid = `effectif-${p.id}`;
                        return (
                          <PlayerRow
                            key={uid}
                            p={p}
                            expanded={expandedId === uid}
                            onToggle={() => setExpandedId(expandedId === uid ? null : uid)}
                          />
                        );
                      })
                    }
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ══════════ RÉSULTATS ══════════ */}
      {section==="resultats"&&(
        <div className="space-y-3">
          <div className="flex gap-1 p-1 rounded-xl" style={{background:"#0a0f1c",border:"1px solid #1a2235"}}>
            {(["resultats","predictions"] as const).map(t=>(
              <button key={t} onClick={()=>setResTab(t)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
                style={{background:resTab===t?"rgba(255,255,255,0.08)":"transparent",color:resTab===t?"#e2e8f0":"#64748b",border:resTab===t?"1px solid rgba(255,255,255,0.1)":"1px solid transparent"}}>
                {t==="resultats"?<><Calendar size={11}/> Résultats</>:<><Lightning size={11}/> Prédictions AI</>}
              </button>
            ))}
          </div>

          {resTab==="resultats"&&(
            loading?(
              <div className="space-y-2">{Array.from({length:4}).map((_,i)=><div key={i} className="h-12 rounded-xl animate-pulse" style={{background:"#0d1421",border:"1px solid #1e2d42"}}/>)}</div>
            ):results.length===0?(<p className="text-center py-10 text-sm" style={{color:"#6b7c96"}}>Aucun résultat récent</p>):(
              <div className="rounded-2xl overflow-hidden" style={{border:"1px solid #1e2d42"}}>
                {results.map((m,idx)=>{
                  const r=resultForClub(m,club)!;
                  const isH=teamMatchesClub(m.homeTeam.name,club)||teamMatchesClub(m.homeTeam.shortName,club);
                  const myT=isH?m.homeTeam:m.awayTeam,opp=isH?m.awayTeam:m.homeTeam;
                  const ms=isH?m.score.home:m.score.away,os=isH?m.score.away:m.score.home;
                  const rc=r==="V"?"#22c55e":r==="D"?"#ef4444":"#f59e0b";
                  return (
                    <div key={m.id} className="flex items-center gap-2.5 px-4 py-3 hover:bg-white/[0.015] transition-colors"
                      style={{borderTop:idx>0?"1px solid rgba(30,45,66,0.4)":undefined}}>
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-black flex-shrink-0"
                        style={{background:`${rc}18`,color:rc,border:`1px solid ${rc}30`}}>{r}</span>
                      <div className="flex-1 min-w-0 flex items-center gap-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={myT.crest} alt="" className="w-4 h-4 object-contain flex-shrink-0" loading="lazy"/>
                        <span className="font-black text-sm" style={{color:rc}}>{ms}</span>
                        <span className="text-xs" style={{color:"#6b7c96"}}>–</span>
                        <span className="font-black text-sm" style={{color:"#94a3b8"}}>{os}</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={opp.crest} alt="" className="w-4 h-4 object-contain flex-shrink-0 ml-1" loading="lazy"/>
                        <span className="text-xs truncate" style={{color:"#94a3b8"}}>{opp.shortName}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{background:"rgba(255,255,255,0.04)",color:"#6b7c96"}}>{isH?"DOM":"EXT"}</div>
                        <div className="text-[9px] mt-0.5" style={{color:"#475569"}}>{fmtDate(m.date)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {resTab==="predictions"&&(
            <div className="space-y-3">
              <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{background:"rgba(59,130,246,0.06)",border:"1px solid rgba(59,130,246,0.2)"}}>
                <Pulse size={10} style={{color:"#60a5fa"}}/>
                <p className="text-[10px]" style={{color:"#6b7c96"}}>Probabilités calculées sur la forme, la position et les stats de la saison en cours.</p>
              </div>
              {loading||!standing?(
                <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="h-24 rounded-xl animate-pulse" style={{background:"#0d1421",border:"1px solid #1e2d42"}}/>)}</div>
              ):predOpps.length===0?(<p className="text-center py-10 text-sm" style={{color:"#6b7c96"}}>Classement non disponible</p>):(
                predOpps.map((opp,idx)=>{
                  const proba=calcProba(standing!,opp);
                  const exp=exPred===idx;
                  const oppZone=getZone(opp.position);
                  const oppFR=(opp.form.split(",").filter(Boolean).slice(-5)).map(r=>r==="W"?"V":r==="L"?"D":"N") as ("V"|"N"|"D")[];
                  const verdict=proba.w>=40?"Favori":proba.w>=33?"Incertain":"Difficile";
                  const vc=proba.w>=40?"#22c55e":proba.w>=33?"#f59e0b":"#f87171";
                  const factors=[
                    {l:"Forme",    val:`${formScore(standing!.form)}% vs ${formScore(opp.form)}%`, good:formScore(standing!.form)>=formScore(opp.form)},
                    {l:"Pts/m",    val:`${(standing!.points/Math.max(1,standing!.playedGames)).toFixed(2)} vs ${(opp.points/Math.max(1,opp.playedGames)).toFixed(2)}`, good:standing!.points/Math.max(1,standing!.playedGames)>=opp.points/Math.max(1,opp.playedGames)},
                    {l:"Position", val:`${standing!.position}e vs ${opp.position}e`, good:standing!.position<=opp.position},
                    {l:"Diff. buts",val:`${standing!.goalDifference>0?"+":""}${standing!.goalDifference} vs ${opp.goalDifference>0?"+":""}${opp.goalDifference}`, good:standing!.goalDifference>=opp.goalDifference},
                  ];
                  return (
                    <div key={opp.team.id} className="rounded-2xl overflow-hidden" style={{border:`1px solid ${club.color}30`}}>
                      <div className="px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors" style={{background:`${club.color}08`}}
                        onClick={()=>setExPred(exp?null:idx)}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={club.crest} alt="" className="w-7 h-7 object-contain" loading="lazy"/>
                            <span className="text-sm font-black" style={{color:"#e8edf5"}}>{club.shortName}</span>
                            <span className="text-xs px-2" style={{color:"#6b7c96"}}>vs</span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={opp.team.crest} alt="" className="w-7 h-7 object-contain" loading="lazy"/>
                            <span className="text-sm font-black truncate" style={{color:"#e8edf5"}}>{opp.team.shortName}</span>
                            {oppZone&&<span className="text-[9px] font-semibold ml-1" style={{color:oppZone.color}}>{opp.position}e</span>}
                          </div>
                          <span className="text-xs font-black px-2 py-0.5 rounded-lg flex-shrink-0"
                            style={{background:`${vc}18`,color:vc,border:`1px solid ${vc}30`}}>{verdict}</span>
                          {exp?<CaretUp size={12} style={{color:"#6b7c96"}}/>:<CaretDown size={12} style={{color:"#6b7c96"}}/>}
                        </div>
                        <div className="space-y-1">
                          <ProbBar label="Vic."  pct={proba.w} color="#22c55e"/>
                          <ProbBar label="Nul"   pct={proba.d} color="#f59e0b"/>
                          <ProbBar label="Déf."  pct={proba.l} color="#f87171"/>
                        </div>
                      </div>
                      {exp&&(
                        <div className="px-4 py-4 border-t space-y-4" style={{borderColor:"rgba(30,45,66,0.4)",background:"rgba(0,0,0,0.15)"}}>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{color:"#6b7c96"}}>Forme récente</p>
                            <div className="flex items-center gap-3">
                              <div className="flex gap-0.5">{formFR.map((r,i)=><FormDot key={i} r={r}/>)}</div>
                              <span className="text-[9px] font-bold" style={{color:"#6b7c96"}}>vs</span>
                              <div className="flex gap-0.5">{oppFR.map((r,i)=><FormDot key={i} r={r}/>)}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {factors.map((f,i)=>(
                              <div key={i} className="rounded-lg px-3 py-2" style={{background:f.good?"rgba(34,197,94,0.07)":"rgba(239,68,68,0.07)",border:`1px solid ${f.good?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}`}}>
                                <div className="flex items-center gap-1 mb-0.5">
                                  {f.good?<TrendUp size={9} style={{color:"#22c55e"}}/>:<TrendDown size={9} style={{color:"#f87171"}}/>}
                                  <span className="text-[9px] font-bold" style={{color:f.good?"#22c55e":"#f87171"}}>{f.l}</span>
                                </div>
                                <p className="text-[9px]" style={{color:"#6b7c96"}}>{f.val}</p>
                              </div>
                            ))}
                          </div>
                          <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{background:`${vc}0d`,border:`1px solid ${vc}25`}}>
                            <div>
                              <p className="text-xs font-black" style={{color:vc}}>Verdict : {verdict}</p>
                              <p className="text-[9px] mt-0.5" style={{color:"#6b7c96"}}>
                                Victoire: <b style={{color:"#22c55e"}}>{proba.w}%</b> · Confiance: <b style={{color:"#f59e0b"}}>{proba.w>=45||proba.w<=28?"Élevée":"Modérée"}</b>
                              </p>
                            </div>
                            <Lightning size={18} style={{color:vc}}/>
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

      {/* ══════════ MA COMPO ! ══════════ */}
      {section==="compo"&&(
        <div className="space-y-4">

          {/* Personal / Community toggle */}
          <div className="flex gap-1 p-1 rounded-xl" style={{background:"#0a0f1c",border:"1px solid #1a2235"}}>
            <button onClick={()=>setCompoView("personal")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{background:compoView==="personal"?"rgba(255,255,255,0.08)":"transparent",color:compoView==="personal"?"#e2e8f0":"#64748b",border:compoView==="personal"?"1px solid rgba(255,255,255,0.1)":"1px solid transparent"}}>
              <Star size={11}/> Ma Compo
            </button>
            <button onClick={()=>{ setCompoView("community"); if(!communityTeam) loadCommunityTeam(); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{background:compoView==="community"?"rgba(255,255,255,0.08)":"transparent",color:compoView==="community"?"#e2e8f0":"#64748b",border:compoView==="community"?"1px solid rgba(255,255,255,0.1)":"1px solid transparent"}}>
              <Globe size={11}/> Équipe Type 🗳️
            </button>
          </div>

          {/* ── PERSONAL COMPO ── */}
          {compoView==="personal"&&<>
            {/* Formation picker */}
            <div className="rounded-xl p-3" style={{background:"#0d1421",border:"1px solid #1e2d42"}}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{color:"#6b7c96"}}>Formation</p>
              <div className="flex gap-1.5 flex-wrap">
                {F_KEYS.map(f=>(
                  <button key={f} onClick={()=>changeFormation(f)}
                    className="px-3 py-1.5 rounded-lg text-xs font-black transition-all hover:opacity-90"
                    style={{background:formation===f?club.color:"rgba(255,255,255,0.05)",color:formation===f?"#fff":"#64748b",border:`1px solid ${formation===f?club.color:"rgba(255,255,255,0.08)"}`}}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* PITCH — smaller via maxWidth */}
            <div style={{maxWidth:340,margin:"0 auto",width:"100%"}}>
              <div className="rounded-2xl overflow-hidden" style={{border:`1px solid ${club.color}35`,position:"relative",paddingBottom:"128%"}}>
                <div style={{position:"absolute",inset:0}}>
                  <FootPitch color={club.color}/>
                  {slots.map((slot,idx)=>{
                    const name=players11[idx];
                    const isSel=selSlot===idx;
                    const used=new Set(players11.filter((p,i)=>p!==null&&i!==idx));
                    // ANY player — no position filter
                    const available=squad.filter(p=>!used.has(p.name));
                    return (
                      <div key={idx} style={{position:"absolute",left:`${slot.x}%`,top:`${slot.y}%`,transform:"translate(-50%,-50%)",zIndex:10}}>
                        <button onClick={()=>setSelSlot(isSel?null:idx)}
                          className="flex flex-col items-center" style={{outline:"none",background:"none",border:"none",padding:0,cursor:"pointer"}}>
                          <div className="flex items-center justify-center rounded-full transition-all duration-150"
                            style={{width:38,height:38,background:name?club.color:"rgba(10,15,28,0.8)",
                              border:`2px solid ${name?club.color:isSel?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.2)"}`,
                              boxShadow:name?`0 0 10px ${club.color}66`:isSel?"0 0 8px rgba(255,255,255,0.25)":"none"}}>
                            {name
                              ?<span className="text-white font-black text-center px-0.5" style={{fontSize:7,lineHeight:1.1,maxWidth:34,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{name.split(" ").pop()}</span>
                              :<span style={{fontSize:15,color:"rgba(255,255,255,0.3)"}}>+</span>}
                          </div>
                          <div className="text-center rounded" style={{marginTop:1,fontSize:7,fontWeight:900,color:"rgba(255,255,255,0.7)",background:"rgba(0,0,0,0.6)",padding:"1px 3px"}}>{slot.role}</div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Player picker — outside overflow-hidden so it never gets clipped */}
            {selSlot!==null&&(()=>{
              const slot=slots[selSlot];
              const name=players11[selSlot];
              const used=new Set(players11.filter((p,i)=>p!==null&&i!==selSlot));
              const available=squad.filter(p=>!used.has(p.name));
              // Fit players first, then unavailable (greyed)
              const sorted=[
                ...available.filter(p=>!isUnavailable(p)).sort((a,b)=>((b.xG??0)+(b.xA??0))-((a.xG??0)+(a.xA??0))),
                ...available.filter(p=>isUnavailable(p)),
              ];
              return (
                <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${club.color}55`,background:"#0d1421"}}>
                  <div className="flex items-center justify-between px-3 py-2" style={{background:"#0a0f1c",borderBottom:"1px solid #1e2d42"}}>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{color:club.color}}>
                      Choisir — {slot.role}
                    </span>
                    <button onClick={()=>setSelSlot(null)} className="hover:opacity-70" style={{color:"#6b7c96"}}><X size={12}/></button>
                  </div>
                  <div style={{maxHeight:220,overflowY:"auto"}}>
                    {sorted.length===0
                      ?<p className="px-3 py-3 text-[11px]" style={{color:"#6b7c96"}}>Tous les joueurs sont placés</p>
                      :sorted.map(p=>{
                        const unavail=isUnavailable(p);
                        return (
                          <button key={p.id} onClick={()=>assignPlayer(selSlot,p.name)}
                            className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-white/[0.06] transition-colors"
                            style={{borderTop:"1px solid rgba(30,45,66,0.35)",opacity:unavail?0.45:1}}>
                            <span className="text-[8px] font-black px-1 py-0.5 rounded flex-shrink-0"
                              style={{background:`${POS_COLOR[p.position]??club.color}22`,color:POS_COLOR[p.position]??club.color}}>{POS_CODE[p.position]??"?"}</span>
                            {unavail
                              ?<span className="text-[10px]" title={p.status}>🚫</span>
                              :p.formBadge==="hot"?<span className="text-[10px]">🔥</span>:null}
                            <span className="flex-1 text-sm font-semibold truncate" style={{color:unavail?"#6b7c96":"#e8edf5"}}>{p.name}</span>
                            {unavail
                              ?<span className="text-[8px] flex-shrink-0" style={{color:"#f87171"}}>Indispo</span>
                              :(p.usGoals??0)>0?<span className="text-[9px] font-black flex-shrink-0" style={{color:"#22c55e"}}>{p.usGoals}B</span>:null}
                          </button>
                        );
                      })}
                    {name&&(
                      <button onClick={()=>{const a=[...players11];a[selSlot]=null;setPlayers11(a);setSelSlot(null);}}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04]"
                        style={{borderTop:"1px solid rgba(239,68,68,0.2)"}}>
                        <X size={10} style={{color:"#f87171"}}/><span className="text-[11px] font-semibold" style={{color:"#f87171"}}>Retirer {name.split(" ").pop()}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Actions bar */}
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-xs font-semibold" style={{color:"#6b7c96"}}>{filledCount}/11</span>
              {/* RANDOM button */}
              <button onClick={randomCompo} disabled={squad.filter(p=>!isUnavailable(p)).length<11}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black hover:opacity-80 disabled:opacity-40"
                style={{background:"rgba(168,85,247,0.12)",border:"1px solid rgba(168,85,247,0.35)",color:"#a855f7"}}>
                🎲 Random
              </button>
              <div className="flex-1"/>
              <button onClick={clearCompo} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80"
                style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171"}}>
                <X size={10}/> Effacer
              </button>
              {/* BIG SAVE BUTTON */}
              <button onClick={saveCompo} disabled={compoSaving||filledCount===0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black hover:opacity-90 transition-all disabled:opacity-50"
                style={{background:compoSaved?"#22c55e":club.color,color:"#fff",boxShadow:`0 0 20px ${compoSaved?"#22c55e":club.color}55`}}>
                {compoSaved?<><CheckCircle size={14}/> Sauvegardé !</>:compoSaving?<><ArrowsClockwise size={13} className="animate-spin"/> Envoi...</>:<><FloppyDisk size={14}/> Sauvegarder ma compo</>}
              </button>
            </div>
            {compoSaved&&<p className="text-[10px] text-center" style={{color:"#22c55e"}}>✓ Ta compo a été enregistrée et contribue à l&apos;équipe type communauté !</p>}

            {/* XI list */}
            {filledCount>0&&(
              <div className="rounded-xl overflow-hidden" style={{border:"1px solid #1e2d42"}}>
                <div className="px-4 py-2" style={{background:"#0d1421",borderBottom:"1px solid #1e2d42"}}>
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{color:"#6b7c96"}}>XI — {formation}</span>
                </div>
                <div className="divide-y" style={{borderColor:"rgba(30,45,66,0.4)"}}>
                  {slots.map((slot,idx)=>{
                    const name=players11[idx];
                    const player=squad.find(p=>p.name===name);
                    const pc=POS_COLOR[{GK:"Goalkeeper",DF:"Defender",MF:"Midfielder",FW:"Centre-Forward"}[slot.type]]??club.color;
                    return (
                      <div key={idx} className="flex items-center gap-2 px-4 py-2">
                        <span className="text-[9px] font-black w-8 flex-shrink-0" style={{color:pc}}>{slot.role}</span>
                        {name?<>
                          <span className="flex-1 text-xs font-semibold truncate" style={{color:"#e8edf5"}}>{name}</span>
                          {player?.formBadge==="hot"&&<span>🔥</span>}
                          {(player?.usGoals??0)>0&&<span className="text-[9px] font-black" style={{color:"#22c55e"}}>{player!.usGoals}B</span>}
                          <button onClick={()=>{const a=[...players11];a[idx]=null;setPlayers11(a);}} className="hover:opacity-80" style={{color:"#475569"}}><X size={9}/></button>
                        </>:<span className="flex-1 text-xs" style={{color:"#475569"}}>Poste vide</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>}

          {/* ── COMMUNITY TEAM ── */}
          {compoView==="community"&&(
            <div className="space-y-4">
              {communityLoading?(
                <div className="flex flex-col items-center py-12 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{borderColor:club.color,borderTopColor:"transparent"}}/>
                  <span className="text-xs" style={{color:"#6b7c96"}}>Calcul de l&apos;équipe type en cours…</span>
                </div>
              ):!communityTeam||communityTeam.votes===0?(
                <div className="rounded-2xl p-8 text-center" style={{background:"#0d1421",border:"1px solid #1e2d42"}}>
                  <Globe size={32} className="mx-auto mb-3" style={{color:"#6b7c96"}}/>
                  <p className="text-sm font-bold mb-1" style={{color:"#e8edf5"}}>Pas encore de votes</p>
                  <p className="text-xs" style={{color:"#6b7c96"}}>Sois le premier à sauvegarder ta compo pour lancer l&apos;équipe type !</p>
                  <button onClick={()=>setCompoView("personal")} className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-sm font-black hover:opacity-90"
                    style={{background:club.color,color:"#fff"}}>
                    <Star size={13}/> Créer ma compo
                  </button>
                </div>
              ):(()=>{
                const ct=communityTeam;
                const ctSlots=FORMATIONS[ct.formation]??FORMATIONS["4-3-3"];
                const tweetUrl=`https://twitter.com/intent/tweet?text=${buildTweet(ct)}`;
                return (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                      style={{background:`${club.color}10`,border:`1px solid ${club.color}30`}}>
                      <div>
                        <p className="text-sm font-black" style={{color:"#e8edf5"}}>Équipe Type des Supporters</p>
                        <p className="text-xs mt-0.5" style={{color:"#6b7c96"}}>
                          <span className="font-bold" style={{color:club.color}}>{ct.votes}</span> compo{ct.votes>1?"s":""} soumise{ct.votes>1?"s":""} · Formation dominante : <b style={{color:"#e8edf5"}}>{ct.formation}</b>
                        </p>
                      </div>
                      <button onClick={loadCommunityTeam} className="p-1.5 rounded-lg hover:opacity-80" style={{color:"#6b7c96",background:"rgba(255,255,255,0.04)",border:"1px solid #1e2d42"}}>
                        <ArrowsClockwise size={12} className={communityLoading?"animate-spin":""}/>
                      </button>
                    </div>

                    {/* Community pitch */}
                    <div style={{maxWidth:340,margin:"0 auto",width:"100%"}}>
                      <div className="rounded-2xl overflow-hidden" style={{border:`2px solid ${club.color}55`,position:"relative",paddingBottom:"128%"}}>
                        <div style={{position:"absolute",inset:0}}>
                          <FootPitch color={club.color}/>
                          {ctSlots.map((slot,idx)=>{
                            const name=ct.players[idx];
                            const details=ct.slotDetails?.[idx]??[];
                            const topVotes=details[0]?.count??0;
                            const pct=ct.votes>0?Math.round((topVotes/ct.votes)*100):0;
                            return (
                              <div key={idx} style={{position:"absolute",left:`${slot.x}%`,top:`${slot.y}%`,transform:"translate(-50%,-50%)",zIndex:10}}>
                                <div className="flex flex-col items-center">
                                  <div className="flex items-center justify-center rounded-full"
                                    style={{width:38,height:38,background:name?club.color:"rgba(10,15,28,0.7)",
                                      border:`2px solid ${name?club.color:"rgba(255,255,255,0.15)"}`,
                                      boxShadow:name?`0 0 12px ${club.color}88`:"none"}}>
                                    {name
                                      ?<span className="text-white font-black text-center px-0.5" style={{fontSize:7,lineHeight:1.1,maxWidth:34,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{name.split(" ").pop()}</span>
                                      :<span style={{fontSize:12,color:"rgba(255,255,255,0.2)"}}>?</span>}
                                  </div>
                                  {name&&pct>0&&<div className="text-center rounded" style={{marginTop:1,fontSize:6,fontWeight:900,color:`${club.color}`,background:"rgba(0,0,0,0.75)",padding:"1px 3px"}}>{pct}%</div>}
                                  <div className="text-center rounded" style={{marginTop:name&&pct>0?0:1,fontSize:7,fontWeight:900,color:"rgba(255,255,255,0.65)",background:"rgba(0,0,0,0.55)",padding:"1px 3px"}}>{slot.role}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Twitter share */}
                    <a href={tweetUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-3 w-full py-3.5 rounded-2xl text-sm font-black hover:opacity-90 transition-all"
                      style={{background:"#1DA1F2",color:"#fff",boxShadow:"0 0 24px rgba(29,161,242,0.35)"}}>
                      <ShareNetwork size={16}/>
                      Publier l&apos;équipe type sur Twitter / X
                    </a>

                    {/* Per-slot details */}
                    <div className="rounded-2xl overflow-hidden" style={{border:"1px solid #1e2d42"}}>
                      <div className="px-4 py-2.5" style={{background:"#0d1421",borderBottom:"1px solid #1e2d42"}}>
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{color:"#6b7c96"}}>Détail des votes par poste</span>
                      </div>
                      {ctSlots.map((slot,idx)=>{
                        const details=(ct.slotDetails?.[idx]??[]).slice(0,3);
                        const top=details[0];
                        const pc=POS_COLOR[{GK:"Goalkeeper",DF:"Defender",MF:"Midfielder",FW:"Centre-Forward"}[slot.type]]??club.color;
                        return (
                          <div key={idx} className="px-4 py-2.5" style={{borderTop:"1px solid rgba(30,45,66,0.4)"}}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[9px] font-black w-8" style={{color:pc}}>{slot.role}</span>
                              {top
                                ?<span className="text-xs font-black" style={{color:"#e8edf5"}}>{top.name}</span>
                                :<span className="text-xs" style={{color:"#475569"}}>—</span>}
                              {top&&<span className="ml-auto text-[9px] font-bold" style={{color:club.color}}>{top.count} vote{top.count>1?"s":""}</span>}
                            </div>
                            {details.length>1&&(
                              <div className="flex gap-1 flex-wrap">
                                {details.slice(1).map((d,i)=>(
                                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{background:"rgba(255,255,255,0.04)",color:"#6b7c96"}}>
                                    {d.name.split(" ").pop()} ({d.count})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      )}

      {/* ══════════ LA FICHE ══════════ */}
      {section==="fiche"&&(
        <FicheSection
          club={club}
          nextMatch={ficheNextMatch}
          opponentId={ficheOpponentId}
          ficheTeamData={ficheTeamData}
          ficheSquad={ficheSquad}
          ficheLoading={ficheLoading}
          ficheMatchLoaded={ficheMatchLoaded}
          allStandings={allStandings}
        />
      )}

    </div>
  );
}

/* ══════════════════════════════════════════ LA FICHE COMPONENT ══ */

interface FicheMatch {
  id: number;
  date: string;
  matchday: number;
  homeTeam: { id: number; name: string; crest: string };
  awayTeam: { id: number; name: string; crest: string };
}

interface FicheTeamMatch {
  date: string;
  homeTeam: { id: number; name: string; crest: string };
  awayTeam: { id: number; name: string; crest: string };
  score: { home: number | null; away: number | null };
}

interface FicheTeamData {
  recent: FicheTeamMatch[];
  upcoming: FicheTeamMatch[];
}

function avg(arr: number[]): number {
  if(arr.length===0) return 0;
  return arr.reduce((s,v)=>s+v,0)/arr.length;
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function sectorScore(players: SquadPlayer[], pos: string[], statFn: (p: SquadPlayer)=>number): number {
  const pool = players.filter(p=>pos.includes(p.position));
  if(pool.length===0) return 50;
  const vals = pool.map(statFn).filter(v=>v>0);
  if(vals.length===0) return 50;
  return clamp(Math.round(avg(vals)), 0, 100);
}

type ZoneLevel = "red"|"orange"|"blue";

function zoneColor(score: number): { fill: string; stroke: string; label: ZoneLevel } {
  if(score>=70) return { fill:"rgba(239,68,68,0.55)", stroke:"#ef4444", label:"red" };
  if(score>=50) return { fill:"rgba(251,146,60,0.50)", stroke:"#f97316", label:"orange" };
  return { fill:"rgba(96,165,250,0.45)", stroke:"#60a5fa", label:"blue" };
}

function SectorBar({label,myVal,oppVal,myColor,oppColor}:{label:string;myVal:number;oppVal:number;myColor:string;oppColor:string}) {
  const myPct = clamp(myVal,0,100);
  const oppPct = clamp(oppVal,0,100);
  return (
    <div className="rounded-xl px-3 py-2.5" style={{background:"#0d1421",border:"1px solid #1e2d42"}}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-black uppercase tracking-widest" style={{color:"#6b7c96"}}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {/* My club bar — grows left */}
        <div className="flex items-center gap-1 flex-1 justify-end">
          <span className="text-xs font-black w-7 text-right" style={{color:myColor}}>{myPct}</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden flex justify-end" style={{background:"rgba(255,255,255,0.05)"}}>
            <div className="h-full rounded-full" style={{width:`${myPct}%`,background:myColor}}/>
          </div>
        </div>
        {/* Mid label */}
        <span className="text-[8px] font-black uppercase tracking-widest flex-shrink-0 w-16 text-center" style={{color:"#475569"}}>{label.slice(0,7)}</span>
        {/* Opponent bar — grows right */}
        <div className="flex items-center gap-1 flex-1 justify-start">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.05)"}}>
            <div className="h-full rounded-full" style={{width:`${oppPct}%`,background:oppColor}}/>
          </div>
          <span className="text-xs font-black w-7" style={{color:oppColor}}>{oppPct}</span>
        </div>
      </div>
    </div>
  );
}

const POS_COLORS: Record<string,string> = {
  "Goalkeeper":     "#f59e0b",
  "Defender":       "#3b82f6",
  "Midfielder":     "#a78bfa",
  "Winger":         "#34d399",
  "Centre-Forward": "#ef4444",
};

/** Organic diffuse heatmap — blob zones + risk players on the pitch */
function HeatmapPitch({oppSquad, oppColor, riskPlayers}:{
  oppSquad: SquadPlayer[];
  oppColor: string;
  riskPlayers: SquadPlayer[];
}) {
  // ── Sector scoring functions ──────────────────────────────────
  const cfFn   = (p: SquadPlayer) => clamp((p.dm_xg90??0)*55 + (p.dm_shots90??0)*12 + (p.dm_xgxa90??0)*25, 0, 100);
  const wingFn = (p: SquadPlayer) => clamp((p.dm_xgxa90??0)*35 + (p.dm_dribbles90??0)*12 + (p.dm_keyPasses90??0)*18 + (p.dm_xg90??0)*20, 0, 100);
  const midFn  = (p: SquadPlayer) => clamp((p.dm_keyPasses90??0)*22 + (p.dm_dribbles90??0)*8 + (p.dm_passPct??0)*0.45 + (p.dm_xgxa90??0)*20, 0, 100);
  const defFn  = (p: SquadPlayer) => clamp((p.dm_defDuelPct??0)*0.6 + (p.dm_interceptions90??0)*20, 0, 100);

  // ── Per-position zone scores (left/right split for wingers) ──
  const cfScore  = sectorScore(oppSquad, ["Centre-Forward"], cfFn);
  const wings    = oppSquad.filter(p => p.position === "Winger");
  const lwScore  = wings.length >= 2
    ? clamp(Math.round(avg(wings.filter((_,i)=>i%2===0).map(wingFn).filter(v=>v>0))||50), 0, 100)
    : sectorScore(oppSquad, ["Winger"], wingFn);
  const rwScore  = wings.length >= 2
    ? clamp(Math.round(avg(wings.filter((_,i)=>i%2===1).map(wingFn).filter(v=>v>0))||50), 0, 100)
    : sectorScore(oppSquad, ["Winger"], wingFn);
  const midScore = sectorScore(oppSquad, ["Midfielder"], midFn);
  const defScore = sectorScore(oppSquad, ["Defender"],   defFn);

  // ── Heat color by score ───────────────────────────────────────
  const heatColor = (s: number) =>
    s>=70 ? { fill:"rgba(239,68,68,0.82)",  label:"#ef4444" } :
    s>=45 ? { fill:"rgba(249,115,22,0.75)", label:"#f97316" } :
            { fill:"rgba(96,165,250,0.70)", label:"#60a5fa" };

  // ── Zone ellipses (cx,cy,rx,ry) — opponent attacks from top ──
  // labelX/labelY: score placed at EDGE of zone, away from player dot positions
  const heatZones = [
    { id:"lw", cx:18,  cy:42, rx:24, ry:28, score:lwScore,  tag:"AIL G", labelX:5,   labelY:20  },
    { id:"cf", cx:60,  cy:28, rx:20, ry:18, score:cfScore,  tag:"ATT",   labelX:92,  labelY:24  },
    { id:"rw", cx:102, cy:42, rx:24, ry:28, score:rwScore,  tag:"AIL D", labelX:115, labelY:20  },
    { id:"mi", cx:60,  cy:90, rx:36, ry:22, score:midScore, tag:"MIL",   labelX:7,   labelY:78  },
    { id:"de", cx:60,  cy:144,rx:38, ry:26, score:defScore, tag:"DEF",   labelX:7,   labelY:132 },
  ];

  // ── Place risk players at their pitch position ─────────────
  const posSlots: Record<string,{cx:number; cy:number}[]> = {
    "Centre-Forward": [{cx:60, cy:28}],
    "Winger":         [{cx:18, cy:45},{cx:102,cy:45}],
    "Midfielder":     [{cx:38, cy:88},{cx:60, cy:82},{cx:82,cy:88}],
    "Defender":       [{cx:28,cy:142},{cx:60,cy:148},{cx:92,cy:142}],
    "Goalkeeper":     [{cx:60, cy:163}],
  };
  const slotIdx: Record<string,number> = {};
  const placedPlayers = riskPlayers.slice(0,5).map(p => {
    const slots = posSlots[p.position] ?? [{cx:60,cy:90}];
    const i = slotIdx[p.position] ?? 0;
    slotIdx[p.position] = i+1;
    return {...p, ...(slots[Math.min(i,slots.length-1)])};
  });

  return (
    <div>
      {/* Pitch: 50% wide so it stays compact */}
      <div className="rounded-xl overflow-hidden mx-auto" style={{width:"50%", border:"2px solid #1e2d42"}}>
        <svg viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg"
          style={{display:"block",width:"100%",height:"auto"}}>
          <defs>
            {/* Gaussian blur for organic blob effect */}
            <filter id="fp-blob" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="9"/>
            </filter>
          </defs>

          {/* ── Pitch background stripes ── */}
          <rect width="120" height="180" fill="#2d6a2d"/>
          {[0,1,2,3,4].map(i=><rect key={i} y={i*36} width="120" height="36"
            fill={i%2===0?"#2d6a2d":"#265a26"}/>)}

          {/* ── Heat blobs (UNDER pitch lines) ── */}
          {heatZones.map(z => {
            const {fill} = heatColor(z.score);
            return <ellipse key={z.id} cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
              fill={fill} filter="url(#fp-blob)"/>;
          })}

          {/* ── Pitch markings ── */}
          <rect x="4" y="4" width="112" height="172" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2"/>
          <line x1="4" y1="90" x2="116" y2="90" stroke="rgba(255,255,255,0.45)" strokeWidth="1"/>
          <circle cx="60" cy="90" r="16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.9"/>
          <circle cx="60" cy="90" r="1.5" fill="rgba(255,255,255,0.5)"/>
          {/* Top goal area */}
          <rect x="30" y="4" width="60" height="26" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8"/>
          <rect x="42" y="4" width="36" height="11" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6"/>
          <rect x="46" y="1" width="28" height="4"  fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.8"/>
          {/* Bottom goal area */}
          <rect x="30" y="150" width="60" height="26" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8"/>
          <rect x="42" y="165" width="36" height="11" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6"/>
          <rect x="46" y="175" width="28" height="4"  fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.8"/>

          {/* ── Zone score labels — positioned at zone edges, away from player dots ── */}
          {heatZones.map(z => {
            const {label} = heatColor(z.score);
            const anchor = z.labelX <= 10 ? "start" : z.labelX >= 110 ? "end" : "middle";
            return (
              <g key={z.id+"l"}>
                {/* small bg pill for readability */}
                <rect x={z.labelX - (anchor==="start"?0:anchor==="end"?20:10)} y={z.labelY-5.5}
                  width="20" height="10" rx="3" fill="rgba(0,0,0,0.45)"/>
                <text x={z.labelX + (anchor==="start"?10:anchor==="end"?-10:0)} y={z.labelY-0.5}
                  textAnchor="middle" dominantBaseline="central"
                  fill="white" fontSize="5.5" fontWeight="900">{z.score}</text>
                <text x={z.labelX + (anchor==="start"?10:anchor==="end"?-10:0)} y={z.labelY+5}
                  textAnchor="middle"
                  fill={label} fontSize="3.5" fontWeight="700">{z.tag}</text>
              </g>
            );
          })}

          {/* ── Direction indicator ── */}
          <text x="60" y="13" textAnchor="middle"
            stroke="rgba(0,0,0,0.8)" strokeWidth="2.5" paintOrder="stroke"
            fill={oppColor} fontSize="5" fontWeight="900" letterSpacing="0.5">▼ ATTAQUE</text>

          {/* ── Risk players on pitch ── */}
          {placedPlayers.map((p, i) => {
            const col = POS_COLORS[p.position] ?? oppColor;
            const shortName = p.name.split(" ").pop()?.slice(0,7) ?? p.name.slice(0,7);
            return (
              <g key={p.id??i}>
                {/* Glow halo */}
                <circle cx={p.cx} cy={p.cy} r="6.5" fill={col} opacity="0.22"/>
                {/* Dot */}
                <circle cx={p.cx} cy={p.cy} r="4.5"
                  fill={col} stroke="white" strokeWidth="0.8" opacity="0.95"/>
                {/* Risk indicator (⚠ small) */}
                <text x={p.cx} y={p.cy+0.5} textAnchor="middle" dominantBaseline="central"
                  fill="white" fontSize="4.5" fontWeight="900">!</text>
                {/* Name above dot */}
                <text x={p.cx} y={p.cy-8} textAnchor="middle"
                  stroke="rgba(0,0,0,0.9)" strokeWidth="2.5" paintOrder="stroke"
                  fill="white" fontSize="4" fontWeight="700">{shortName}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Legend ── */}
      <div className="flex justify-center gap-4 mt-2">
        {([["#ef4444","Danger élevé"],["#f97316","Modéré"],["#60a5fa","Faible"]] as [string,string][]).map(([c,l])=>(
          <div key={l} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:c,boxShadow:`0 0 4px ${c}60`}}/>
            <span className="text-[9px]" style={{color:"#6b7c96"}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FicheSection({club,nextMatch,opponentId,ficheTeamData,ficheSquad,ficheLoading,ficheMatchLoaded,allStandings}:{
  club:Club;
  nextMatch:FicheMatch|null;
  opponentId:number|null;
  ficheTeamData:FicheTeamData|null;
  ficheSquad:SquadPlayer[];
  ficheLoading:boolean;
  ficheMatchLoaded:boolean;
  allStandings:Standing[];
}) {
  const OPP_COLOR = "#94a3b8";

  if(!ficheMatchLoaded) {
    return (
      <div className="space-y-3">
        {Array.from({length:4}).map((_,i)=>(
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{background:"#0d1421",border:"1px solid #1e2d42"}}/>
        ))}
      </div>
    );
  }

  // If no match data at all, show minimal placeholder but still render heatmap below
  const isHome    = nextMatch ? nextMatch.homeTeam.id === club.id : true;
  const myTeam    = nextMatch ? (isHome ? nextMatch.homeTeam : nextMatch.awayTeam) : { id: club.id, name: club.shortName, crest: club.crest };
  const oppTeamRaw= nextMatch ? (isHome ? nextMatch.awayTeam : nextMatch.homeTeam) : null;
  const oppStandingTeam = allStandings.find(s=>s.team.id===opponentId)?.team??null;
  const oppTeam   = oppTeamRaw ?? (oppStandingTeam ? { id: oppStandingTeam.id, name: oppStandingTeam.name, crest: oppStandingTeam.crest } : { id: opponentId??0, name:"Adversaire", crest:"" });
  // Is this match in the future?
  const isUpcoming = nextMatch ? new Date(nextMatch.date) > new Date() : false;

  // Standings
  const myStanding  = allStandings.find(s=>s.team.id===club.id)??null;
  const oppStanding = allStandings.find(s=>s.team.id===opponentId)??null;

  const oppFormFR = (oppStanding?.form.split(",").filter(Boolean).slice(-5)??[])
    .map(r=>r==="W"?"V":r==="L"?"D":"N") as ("V"|"N"|"D")[];
  const myFormFR  = (myStanding?.form.split(",").filter(Boolean).slice(-5)??[])
    .map(r=>r==="W"?"V":r==="L"?"D":"N") as ("V"|"N"|"D")[];

  const myWinPct  = myStanding&&myStanding.playedGames>0?Math.round(myStanding.won/myStanding.playedGames*100):0;
  const oppWinPct = oppStanding&&oppStanding.playedGames>0?Math.round(oppStanding.won/oppStanding.playedGames*100):0;

  // Sector scores — my club
  const myAttack  = myStanding ? clamp(Math.round(((myStanding.goalsFor/Math.max(1,myStanding.playedGames))/2.5)*100), 10, 90) : 50;
  const myDefense = myStanding ? clamp(Math.round((1-(myStanding.goalsAgainst/Math.max(1,myStanding.playedGames))/2.5)*100), 10, 90) : 50;
  const myMidfield= myStanding ? clamp(Math.round(((myStanding.points/Math.max(1,myStanding.playedGames))/3)*100), 10, 90) : 50;

  // Sector scores — opponent from squad stats
  const oppAttack   = ficheLoading ? 50 : sectorScore(ficheSquad, ["Centre-Forward","Winger"], p=>((p.dm_xg90??0)*40+(p.dm_shots90??0)*10));
  const oppDefense  = ficheLoading ? 50 : sectorScore(ficheSquad, ["Defender"],                p=>((p.dm_defDuelPct??0)*0.7+(p.dm_interceptions90??0)*15));
  const oppMidfield = ficheLoading ? 50 : sectorScore(ficheSquad, ["Midfielder"],               p=>((p.dm_keyPasses90??0)*20+(p.dm_passPct??0)*0.4));
  const oppGK       = ficheLoading ? 50 : sectorScore(ficheSquad, ["Goalkeeper"],               p=>clamp((p.dm_savePct??0),0,100));
  const myGK        = 50; // no GK data for my club here

  // Top 3 opponent threats
  const threats = [...ficheSquad]
    .filter(p=>p.position!=="Goalkeeper")
    .sort((a,b)=>((b.dm_xgxa90??0)+(b.xG??0)+(b.xA??0))-((a.dm_xgxa90??0)+(a.xG??0)+(a.xA??0)))
    .slice(0,3);
  const oppGKs = ficheSquad.filter(p=>p.position==="Goalkeeper")
    .sort((a,b)=>(b.dm_savePct??0)-(a.dm_savePct??0)).slice(0,1);
  const keyPlayers = [...threats, ...oppGKs].slice(0,3);

  return (
    <div className="space-y-3">

      {/* A. Match header */}
      <div className="rounded-2xl overflow-hidden" style={{background:`linear-gradient(135deg,${club.color}18 0%,#0d1421 50%,#1e2d4218 100%)`,border:`1px solid ${club.color}40`}}>
        <div className="relative px-4 pt-4 pb-3">
          {nextMatch ? (
            <>
              <div className="flex items-center justify-center gap-4 mb-3">
                <div className="flex flex-col items-center gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={myTeam.crest} alt="" className="w-14 h-14 object-contain drop-shadow-lg" loading="lazy"/>
                  <span className="text-xs font-black text-center" style={{color:"#e8edf5",maxWidth:80}}>{club.shortName}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-black" style={{color:"#475569"}}>vs</span>
                  {isUpcoming ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg" style={{background:isHome?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",color:isHome?"#22c55e":"#f87171",border:`1px solid ${isHome?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}`}}>
                      {isHome?"Domicile":"Extérieur"}
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg" style={{background:"rgba(100,116,139,0.1)",color:"#94a3b8",border:"1px solid rgba(100,116,139,0.2)"}}>
                      Dernier match
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {oppTeam.crest ? <img src={oppTeam.crest} alt="" className="w-14 h-14 object-contain drop-shadow-lg" loading="lazy"/> : <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{background:"#1e2d42"}}><Sword size={20} style={{color:"#475569"}}/></div>}
                  <span className="text-xs font-black text-center" style={{color:"#e8edf5",maxWidth:80}}>{oppTeam.name}</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 text-[10px]" style={{color:"#6b7c96"}}>
                <span className="flex items-center gap-1"><Calendar size={9}/>{new Date(nextMatch.date).toLocaleDateString("fr-FR",{weekday:"short",day:"2-digit",month:"short"})}</span>
                <span style={{color:"#1e2d42"}}>·</span>
                <span>{new Date(nextMatch.date).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>
                {nextMatch.matchday && <><span style={{color:"#1e2d42"}}>·</span><span className="font-bold" style={{color:"#94a3b8"}}>J{nextMatch.matchday}</span></>}
              </div>
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs font-bold" style={{color:"#6b7c96"}}>Analyse de saison</p>
            </div>
          )}
        </div>
      </div>

      {/* B. Standings comparison */}
      {(myStanding||oppStanding)&&(
        <div className="rounded-xl overflow-hidden" style={{background:"#0d1421",border:"1px solid #1e2d42"}}>
          <div className="px-3 py-2 flex items-center gap-2" style={{background:"#0a0f1c",borderBottom:"1px solid #1e2d42"}}>
            <Shield size={10} style={{color:"#6b7c96"}}/>
            <span className="text-[9px] font-black uppercase tracking-widest" style={{color:"#6b7c96"}}>Classement comparé</span>
          </div>
          <div className="grid grid-cols-3 text-center">
            {/* Header */}
            <div className="px-2 py-1.5 text-[9px] font-black truncate" style={{color:club.color}}>{club.shortName}</div>
            <div className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest" style={{color:"#475569"}}/>
            <div className="px-2 py-1.5 text-[9px] font-black truncate" style={{color:OPP_COLOR}}>{oppTeam.name.split(" ").slice(-1)[0]}</div>
            {/* Rows */}
            {[
              {l:"Position",    myV: myStanding?`${myStanding.position}e`:"—",  oppV: oppStanding?`${oppStanding.position}e`:"—",  better: myStanding&&oppStanding?myStanding.position<oppStanding.position:null },
              {l:"Points",      myV: myStanding?.points??"—",                    oppV: oppStanding?.points??"—",                    better: myStanding&&oppStanding?myStanding.points>oppStanding.points:null },
              {l:"V/N/D",       myV: myStanding?`${myStanding.won}/${myStanding.draw}/${myStanding.lost}`:"—",
                                oppV: oppStanding?`${oppStanding.won}/${oppStanding.draw}/${oppStanding.lost}`:"—",                better: null },
              {l:"BP/BC",       myV: myStanding?`${myStanding.goalsFor}/${myStanding.goalsAgainst}`:"—",
                                oppV: oppStanding?`${oppStanding.goalsFor}/${oppStanding.goalsAgainst}`:"—",                      better: null },
              {l:"Diff. buts",  myV: myStanding?(myStanding.goalDifference>0?"+":"")+myStanding.goalDifference:"—",
                                oppV: oppStanding?(oppStanding.goalDifference>0?"+":"")+oppStanding.goalDifference:"—",           better: myStanding&&oppStanding?myStanding.goalDifference>oppStanding.goalDifference:null },
              {l:"Victoires %", myV: `${myWinPct}%`,                             oppV: `${oppWinPct}%`,                             better: myWinPct>oppWinPct },
            ].map((row,i)=>(
              <React.Fragment key={i}>
                <div className="px-2 py-1.5 text-xs font-black" style={{
                  color: row.better===true?club.color:row.better===false?"#ef4444":"#e8edf5",
                  borderTop:"1px solid rgba(30,45,66,0.5)"}}>
                  {row.myV}
                </div>
                <div className="px-2 py-1.5 text-[8px] font-bold uppercase tracking-wider" style={{color:"#475569",borderTop:"1px solid rgba(30,45,66,0.5)"}}>{row.l}</div>
                <div className="px-2 py-1.5 text-xs font-black" style={{
                  color: row.better===false?OPP_COLOR:row.better===true?"#475569":"#94a3b8",
                  borderTop:"1px solid rgba(30,45,66,0.5)"}}>
                  {row.oppV}
                </div>
              </React.Fragment>
            ))}
            {/* Form */}
            <div className="px-2 py-2 flex items-center justify-center gap-0.5" style={{borderTop:"1px solid rgba(30,45,66,0.5)"}}>
              {myFormFR.map((r,i)=><FormDot key={i} r={r}/>)}
            </div>
            <div className="px-2 py-2 text-[8px] font-bold uppercase tracking-wider text-center" style={{color:"#475569",borderTop:"1px solid rgba(30,45,66,0.5)"}}>Forme</div>
            <div className="px-2 py-2 flex items-center justify-center gap-0.5" style={{borderTop:"1px solid rgba(30,45,66,0.5)"}}>
              {oppFormFR.map((r,i)=><FormDot key={i} r={r}/>)}
            </div>
          </div>
        </div>
      )}

      {/* C. Secteur par secteur */}
      <div className="rounded-xl overflow-hidden" style={{border:"1px solid #1e2d42"}}>
        <div className="px-3 py-2 flex items-center gap-2" style={{background:"#0a0f1c",borderBottom:"1px solid #1e2d42"}}>
          <ChartBar size={10} style={{color:"#6b7c96"}}/>
          <span className="text-[9px] font-black uppercase tracking-widest" style={{color:"#6b7c96"}}>Secteur par secteur</span>
          {ficheLoading&&<div className="ml-auto w-3 h-3 rounded-full border animate-spin" style={{borderColor:"#6b7c96",borderTopColor:"transparent"}}/>}
        </div>
        <div className="p-3 space-y-2">
          {/* Header labels */}
          <div className="flex items-center gap-2">
            <div className="flex-1 text-right text-[9px] font-black" style={{color:club.color}}>{club.shortName}</div>
            <div className="w-16 text-center"/>
            <div className="flex-1 text-[9px] font-black" style={{color:OPP_COLOR}}>{oppTeam.name.split(" ").slice(-1)[0]}</div>
          </div>
          <SectorBar label="Attaque"  myVal={myAttack}   oppVal={oppAttack}   myColor={club.color} oppColor={OPP_COLOR}/>
          <SectorBar label="Défense"  myVal={myDefense}  oppVal={oppDefense}  myColor={club.color} oppColor={OPP_COLOR}/>
          <SectorBar label="Milieu"   myVal={myMidfield} oppVal={oppMidfield} myColor={club.color} oppColor={OPP_COLOR}/>
          <SectorBar label="Gardien"  myVal={myGK}       oppVal={oppGK}       myColor={club.color} oppColor={OPP_COLOR}/>
        </div>
      </div>

      {/* D. Mini pitch heatmap */}
      <div className="rounded-xl overflow-hidden" style={{border:"1px solid #1e2d42"}}>
        <div className="px-3 py-2 flex items-center gap-2" style={{background:"#0a0f1c",borderBottom:"1px solid #1e2d42"}}>
          <Target size={10} style={{color:"#6b7c96"}}/>
          <span className="text-[9px] font-black uppercase tracking-widest" style={{color:"#6b7c96"}}>Zones de menace adverse</span>
        </div>
        <div className="p-3 relative">
          <HeatmapPitch oppSquad={ficheSquad} oppColor={OPP_COLOR} riskPlayers={keyPlayers}/>
          {ficheLoading && ficheSquad.length === 0 && (
            <div className="absolute inset-3 rounded-xl animate-pulse" style={{background:"#0d1421"}}/>
          )}
        </div>
      </div>

      {/* E. Key players to watch */}
      <div className="rounded-xl overflow-hidden" style={{border:"1px solid #1e2d42"}}>
        <div className="px-3 py-2 flex items-center gap-2" style={{background:"#0a0f1c",borderBottom:"1px solid #1e2d42"}}>
          <Star size={10} style={{color:"#6b7c96"}}/>
          <span className="text-[9px] font-black uppercase tracking-widest" style={{color:"#6b7c96"}}>Joueurs à surveiller</span>
        </div>
        {ficheLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({length:3}).map((_,i)=>(
              <div key={i} className="h-14 rounded-xl animate-pulse" style={{background:"#0d1421"}}/>
            ))}
          </div>
        ) : keyPlayers.length===0 ? (
          <p className="px-3 py-4 text-sm text-center" style={{color:"#6b7c96"}}>Données joueurs indisponibles</p>
        ) : (
          <div className="divide-y" style={{borderColor:"rgba(30,45,66,0.4)"}}>
            {keyPlayers.map((p,i)=>{
              const isGK = p.position==="Goalkeeper";
              const mainStat = isGK
                ? { label:"Arrêts%", val: p.dm_savePct?`${p.dm_savePct.toFixed(0)}%`:"—" }
                : { label:"xG+xA/90", val: p.dm_xgxa90?p.dm_xgxa90.toFixed(2):(p.xG!=null&&p.xA!=null)?(p.xG+p.xA).toFixed(1):"—" };
              const sec1 = isGK
                ? { label:"GC/90", val: p.dm_gcPer90?p.dm_gcPer90.toFixed(2):"—" }
                : { label:"xG/90", val: p.dm_xg90?p.dm_xg90.toFixed(2):"—" };
              const sec2 = isGK
                ? { label:"CS", val: p.dm_cleanSheets!=null?String(p.dm_cleanSheets):"—" }
                : { label:"xA/90", val: p.dm_xa90?p.dm_xa90.toFixed(2):"—" };
              const posColor = {"Goalkeeper":"#f59e0b","Defender":"#3b82f6","Midfielder":"#a78bfa","Winger":"#34d399","Centre-Forward":"#ef4444"}[p.position]??OPP_COLOR;
              const entry: PlayerEntry = {
                ...p,
                nationality: p.nationality??[],
                clubId: opponentId!,
                club: {id:opponentId!,name:oppTeam.name,shortName:oppTeam.name,crest:oppTeam.crest},
              };
              return (
                <div key={p.id??i} className="flex items-center gap-3 px-3 py-2.5">
                  <PlayerPhoto p={entry} size="sm"/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[8px] font-black px-1 py-0.5 rounded flex-shrink-0"
                        style={{background:`${posColor}22`,color:posColor}}>
                        {p.position==="Centre-Forward"?"ATT":p.position==="Goalkeeper"?"GB":p.position==="Defender"?"DEF":p.position==="Midfielder"?"MIL":"AIL"}
                      </span>
                      <span className="text-sm font-semibold truncate" style={{color:"#e8edf5"}}>{p.name}</span>
                    </div>
                    <div className="flex gap-2 text-[9px]">
                      <span style={{color:"#6b7c96"}}>{sec1.label} <b style={{color:"#94a3b8"}}>{sec1.val}</b></span>
                      <span style={{color:"#6b7c96"}}>{sec2.label} <b style={{color:"#94a3b8"}}>{sec2.val}</b></span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-black" style={{color:OPP_COLOR}}>{mainStat.val}</div>
                    <div className="text-[9px]" style={{color:"#475569"}}>{mainStat.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

/* ══════════════════════════════════════════ MAIN ══ */

const STORAGE_KEY="monClub_id";
export default function MonClubTab() {
  const [clubId,setClubId]=useState<number|null>(null);
  const [ready,setReady]=useState(false);
  useEffect(()=>{ const s=localStorage.getItem(STORAGE_KEY); if(s) setClubId(parseInt(s)); setReady(true); },[]);
  const pick = (c:Club) => { localStorage.setItem(STORAGE_KEY,String(c.id)); setClubId(c.id); };
  const drop = ()       => { localStorage.removeItem(STORAGE_KEY); setClubId(null); };
  if(!ready) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 rounded-full border-2 animate-spin" style={{borderColor:"#3b82f6",borderTopColor:"transparent"}}/></div>;
  const club=L1_CLUBS.find(c=>c.id===clubId)??null;
  return club ? <ClubDashboard club={club} onChangeClub={drop}/> : <ClubSelector onSelect={pick}/>;
}
