"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowsClockwise, TrendUp, TrendDown, Minus, Trophy, WifiHigh, WifiSlash, Clock, Lightning, ChartBar, Shield, Pulse, Globe, GearSix, Target, ArrowsLeftRight, CaretRight, Users, Lock, SignIn, SignOut, Fire, Sun, MoonStars, Television, Newspaper } from "@phosphor-icons/react";
import { isWorldCupHot, worldCupPhase, daysUntilWorldCup } from "./lib/worldCup";
import dynamic from "next/dynamic";
const TeamPanel = dynamic(() => import("./components/TeamPanel"), { ssr: false });
import { TipText } from "./components/Tooltip";
import PredictionsTab from "./components/PredictionsTab";
import EmotionalScoreTab from "./components/EmotionalScoreTab";
import ResultsTab from "./components/ResultsTab";
import ConfigTab from "./components/ConfigTab";
import TransfersTab from "./components/TransfersTab";
import WorldCupTab from "./components/WorldCupTab";
import TVTab from "./components/TVTab";
import MonClubTab from "./components/MonClubTab";
import RefereesL1Tab from "./components/RefereesL1Tab";
import NewsBanner from "./components/NewsBanner";
import ActuFootBanner from "./components/ActuFootBanner";
import ImageOfTheDay from "./components/ImageOfTheDay";
import LiveDirectButton from "./components/LiveDirectButton";
import FunFact from "./components/FunFact";

interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

interface Standing {
  position: number;
  team: Team;
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

interface StandingsData {
  standings: Standing[];
  season: number | null;
  updatedAt: string;
}

type TabId = "ligue1" | "ligue2" | "worldcup" | "tv" | "monclub" | "predictions" | "results" | "emotional" | "config";
type L1SubTab = "classement" | "mercato" | "joueurs" | "transfert" | "arbitres";

const ZONE_CONFIG = [
  { label: "Champion",            positions: [1],          color: "#60a5fa", bg: "rgba(96,165,250,0.05)"  },
  { label: "Ligue des Champions", positions: [2, 3],       color: "#34d399", bg: "rgba(52,211,153,0.05)"  },
  { label: "Ligue Europa",        positions: [4],           color: "#fbbf24", bg: "rgba(251,191,36,0.05)"  },
  { label: "Conf. League",        positions: [5],           color: "#a78bfa", bg: "rgba(167,139,250,0.05)" },
  { label: "Relégation",          positions: [16, 17, 18], color: "#f87171", bg: "rgba(248,113,113,0.05)" },
];

function getZone(position: number) {
  return ZONE_CONFIG.find((z) => z.positions.includes(position)) ?? null;
}

function FormBadge({ result }: { result: string }) {
  const colors: Record<string, string> = {
    W: "bg-green-500/20 text-green-400 border border-green-500/30",
    D: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    L: "bg-red-500/20 text-red-400 border border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${colors[result] ?? "bg-white/5 text-white/40"}`}>
      {result === "W" ? "V" : result === "L" ? "D" : "N"}
    </span>
  );
}

function FormStreak({ form }: { form: string }) {
  if (!form) return <span className="text-white/20 text-xs">—</span>;
  const results = form.split(",").filter(Boolean).slice(-5);
  return (
    <div className="flex gap-1 justify-center">
      {results.map((r, i) => <FormBadge key={i} result={r} />)}
    </div>
  );
}

function PositionBadge({ position }: { position: number }) {
  if (position === 1) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/30">
        <Trophy size={14} className="text-[#3b82f6]" />
      </div>
    );
  }
  const zone = getZone(position);
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold"
      style={{
        background: zone ? zone.bg : "rgba(255,255,255,0.03)",
        color: zone ? zone.color : "rgba(255,255,255,0.5)",
        border: zone ? `1px solid ${zone.color}30` : "1px solid rgba(255,255,255,0.08)",
      }}>
      {position}
    </div>
  );
}

function GDIndicator({ gd }: { gd: number }) {
  if (gd > 0) return <span className="text-green-400 font-mono font-semibold">+{gd}</span>;
  if (gd < 0) return <span className="text-red-400 font-mono font-semibold">{gd}</span>;
  return <span className="text-white/40 font-mono">0</span>;
}

function Trend({ form }: { form: string }) {
  if (!form) return <Minus size={14} className="text-white/20" />;
  const results = form.split(",").filter(Boolean).slice(-3);
  const score = results.reduce((acc, r) => acc + (r === "W" ? 1 : r === "L" ? -1 : 0), 0);
  if (score > 0) return <TrendUp size={14} className="text-green-400" />;
  if (score < 0) return <TrendDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-yellow-400" />;
}

function StandingsTable({ standings }: { standings: Standing[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42" }}>
      {/* Header */}
      <div className="grid items-center px-4 py-3 text-xs font-semibold uppercase tracking-widest"
        style={{
          background: "#0d1421",
          color: "#6b7c96",
          gridTemplateColumns: "44px 1fr 40px 90px 40px 40px 48px 56px 100px 40px",
          borderBottom: "1px solid #1e2d42",
        }}>
        <span className="text-center">#</span>
        <span>Équipe</span>
        <span className="text-center"><TipText>J</TipText></span>
        <span className="text-center hidden sm:block"><TipText>V</TipText> · <TipText>N</TipText> · <TipText>D</TipText></span>
        <span className="text-center hidden md:block"><TipText>BP</TipText></span>
        <span className="text-center hidden md:block"><TipText>BC</TipText></span>
        <span className="text-center"><TipText>DB</TipText></span>
        <span className="text-center font-bold" style={{ color: "#e8edf5" }}><TipText>Pts</TipText></span>
        <span className="text-center hidden sm:block"><TipText>Forme</TipText></span>
        <span className="hidden lg:block" />
      </div>

      {standings.map((s, idx) => {
        const zone = getZone(s.position);
        const isExpanded = expandedId === s.team.id;
        return (
          <React.Fragment key={s.team.id}>
            {/* Row */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : s.team.id)}
              className="group grid items-center px-4 py-3 transition-all duration-200 hover:brightness-125 animate-fade-in-up cursor-pointer select-none"
              style={{
                gridTemplateColumns: "44px 1fr 40px 90px 40px 40px 48px 56px 100px 40px",
                background: isExpanded
                  ? "rgba(59,130,246,0.07)"
                  : zone ? zone.bg : idx % 2 === 0 ? "rgba(13,20,33,0.6)" : "transparent",
                borderBottom: isExpanded ? "none" : "1px solid rgba(30,45,66,0.4)",
                borderLeft: zone ? `3px solid ${zone.color}` : "3px solid transparent",
                animationDelay: `${idx * 30}ms`,
              }}
            >
              {/* Position column — number badge on desktop, team crest on mobile.
                  Keeps the column compact on small screens (logos are more
                  scannable than abbreviations) without losing positional info,
                  which still shows up via the zone-coloured row border. */}
              <div className="flex justify-center">
                <div className="hidden sm:block"><PositionBadge position={s.position} /></div>
                <div className="sm:hidden relative w-8 h-8 flex items-center justify-center">
                  {s.team.crest
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={s.team.crest} alt={s.team.shortName} className="w-7 h-7 object-contain" loading="lazy" />
                    : <span className="text-xs font-bold text-white/60">{s.team.tla?.slice(0, 2)}</span>
                  }
                  {/* tiny position chip in the corner so rank stays legible */}
                  <span className="absolute -bottom-1 -right-1 text-[8px] font-black leading-none px-1 py-0.5 rounded"
                    style={{ background: zone?.color ?? "#1e2d42", color: "#0b0f12" }}>
                    {s.position}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 min-w-0">
                {/* Crest duplicated only on sm+ — on mobile it now lives in the # column. */}
                {s.team.crest
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={s.team.crest} alt={s.team.shortName} className="hidden sm:block w-8 h-8 object-contain flex-shrink-0" loading="lazy" />
                  : <div className="hidden sm:flex w-8 h-8 rounded bg-white/5 items-center justify-center text-xs font-bold text-white/40 flex-shrink-0">{s.team.tla?.slice(0, 2)}</div>
                }
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "#e8edf5" }}>
                    <span className="hidden md:inline">{s.team.name}</span>
                    <span className="md:hidden">{s.team.shortName || s.team.tla}</span>
                  </p>
                </div>
              </div>

              <span className="text-center text-sm font-mono" style={{ color: "#94a3b8" }}>{s.playedGames}</span>

              <div className="hidden sm:flex justify-center gap-1.5 text-xs font-mono">
                <span style={{ color: "#22c55e" }}>{s.won}</span>
                <span style={{ color: "#6b7c96" }}>·</span>
                <span style={{ color: "#f59e0b" }}>{s.draw}</span>
                <span style={{ color: "#6b7c96" }}>·</span>
                <span style={{ color: "#ef4444" }}>{s.lost}</span>
              </div>

              <span className="hidden md:block text-center text-sm font-mono" style={{ color: "#94a3b8" }}>{s.goalsFor}</span>
              <span className="hidden md:block text-center text-sm font-mono" style={{ color: "#94a3b8" }}>{s.goalsAgainst}</span>

              <div className="flex justify-center text-sm"><GDIndicator gd={s.goalDifference} /></div>

              <div className="flex justify-center">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-base font-black"
                  style={{
                    background: zone ? `${zone.color}15` : "rgba(255,255,255,0.04)",
                    color: zone ? zone.color : "#e8edf5",
                    border: zone ? `1px solid ${zone.color}25` : "1px solid rgba(255,255,255,0.06)",
                  }}>
                  {s.points}
                </span>
              </div>

              <div className="hidden sm:flex justify-center"><FormStreak form={s.form} /></div>
              <div className="hidden lg:flex justify-center"><Trend form={s.form} /></div>
            </div>

            {/* Inline compact panel */}
            {isExpanded && (
              <div style={{ borderBottom: "1px solid rgba(30,45,66,0.6)", borderLeft: zone ? `3px solid ${zone.color}` : "3px solid rgba(59,130,246,0.4)" }}>
                <TeamPanel standing={s} zoneColor={zone?.color ?? "#3b82f6"} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42" }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3"
          style={{ borderBottom: "1px solid rgba(30,45,66,0.4)", background: i % 2 === 0 ? "rgba(13,20,33,0.6)" : "transparent" }}>
          <div className="w-8 h-8 rounded-lg animate-pulse" style={{ background: "#1e2d42" }} />
          <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: "#1e2d42" }} />
          <div className="flex-1 h-4 rounded animate-pulse" style={{ background: "#1e2d42", maxWidth: "180px" }} />
          <div className="ml-auto flex gap-6">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="w-8 h-4 rounded animate-pulse" style={{ background: "#1e2d42" }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl p-12 text-center" style={{ border: "1px solid #ef444430", background: "rgba(239,68,68,0.05)" }}>
      <WifiSlash size={40} className="text-red-400 mx-auto mb-4 opacity-60" />
      <h2 className="text-lg font-bold mb-2" style={{ color: "#e8edf5" }}>Impossible de charger les données</h2>
      <p className="text-sm mb-6" style={{ color: "#6b7c96" }}>{error}</p>
      <button onClick={onRetry} className="px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
        style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6" }}>
        Réessayer
      </button>
      <p className="mt-4 text-xs" style={{ color: "#6b7c96" }}>
        Configurez <code className="text-yellow-400 bg-yellow-400/10 px-1 rounded">FOOTBALL_DATA_API_KEY</code> dans vos variables Vercel.
      </p>
    </div>
  );
}

// ── Logo SVG ───────────────────────────────────────────────────────────────────
function FootPredictomLogo() {
  return (
    <div className="flex items-center gap-3">
      {/* Ball icon */}
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="ball-grad" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.8" />
            </radialGradient>
            <radialGradient id="glow-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Glow */}
          <circle cx="20" cy="20" r="19" fill="url(#glow-grad)" />
          {/* Ball body */}
          <circle cx="20" cy="20" r="16" fill="url(#ball-grad)" opacity="0.15" />
          <circle cx="20" cy="20" r="16" stroke="url(#ball-grad)" strokeWidth="1.5" fill="none" />
          {/* Pentagon pattern */}
          <path d="M20 6 L25 14 L20 18 L15 14 Z" fill="#3b82f6" opacity="0.7" />
          <path d="M28 13 L34 16 L32 22 L26 20 L25 14 Z" fill="#6366f1" opacity="0.5" />
          <path d="M12 13 L15 14 L14 20 L8 22 L6 16 Z" fill="#6366f1" opacity="0.5" />
          <path d="M26 20 L32 22 L30 28 L24 27 L20 22 Z" fill="#3b82f6" opacity="0.4" />
          <path d="M14 20 L20 22 L16 27 L10 28 L8 22 Z" fill="#3b82f6" opacity="0.4" />
          <path d="M20 22 L24 27 L20 32 L16 27 Z" fill="#6366f1" opacity="0.6" />
          {/* Shine */}
          <ellipse cx="15" cy="13" rx="4" ry="2.5" fill="white" opacity="0.15" transform="rotate(-20 15 13)" />
          {/* AI badge */}
          <circle cx="30" cy="10" r="7" fill="#080c14" />
          <circle cx="30" cy="10" r="6.5" stroke="#3b82f6" strokeWidth="1" fill="rgba(59,130,246,0.1)" />
          <text x="30" y="13.5" textAnchor="middle" fontSize="7" fontWeight="900" fill="#3b82f6">AI</text>
        </svg>
      </div>
      {/* Text */}
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-black tracking-tight leading-none"
            style={{ color: "#e8edf5", letterSpacing: "-0.02em" }}>
            Foot
          </span>
          <span className="text-lg font-black tracking-tight leading-none"
            style={{ color: "#60a5fa" }}>
            Predictom
          </span>
        </div>
        <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#6b7c96", marginTop: 1 }}>
          Ligue 1 · IA Prédictive
        </p>
      </div>
    </div>
  );
}

// ── Club sidebar ───────────────────────────────────────────────────────────────

const L1_SIDEBAR_CLUBS = [
  { id: 524,  shortName: "PSG",        crest: "https://crests.football-data.org/524.png" },
  { id: 548,  shortName: "Monaco",     crest: "https://crests.football-data.org/548.png" },
  { id: 516,  shortName: "Marseille",  crest: "https://crests.football-data.org/516.png" },
  { id: 521,  shortName: "Lille",      crest: "https://crests.football-data.org/521.png" },
  { id: 529,  shortName: "Rennes",     crest: "https://crests.football-data.org/529.png" },
  { id: 522,  shortName: "Nice",       crest: "https://crests.football-data.org/522.png" },
  { id: 546,  shortName: "Lens",       crest: "https://crests.football-data.org/546.png" },
  { id: 523,  shortName: "Lyon",       crest: "https://crests.football-data.org/523.png" },
  { id: 576,  shortName: "Strasbourg", crest: "https://crests.football-data.org/576.png" },
  { id: 511,  shortName: "Toulouse",   crest: "https://crests.football-data.org/511.png" },
  { id: 512,  shortName: "Brest",      crest: "https://crests.football-data.org/512.png" },
  { id: 532,  shortName: "Angers",     crest: "https://crests.football-data.org/532.png" },
  { id: 533,  shortName: "Le Havre",   crest: "https://crests.football-data.org/533.png" },
  { id: 519,  shortName: "Auxerre",    crest: "https://crests.football-data.org/519.png" },
  { id: 543,  shortName: "Nantes",     crest: "https://crests.football-data.org/543.png" },
  { id: 545,  shortName: "Metz",       crest: "https://crests.football-data.org/545.png" },
  { id: 525,  shortName: "Lorient",    crest: "https://crests.football-data.org/525.png" },
  { id: 1045, shortName: "Paris FC",   crest: "https://crests.football-data.org/1045.png" },
];

// Ligue 2 clubs — crests served by FotMob (football-data has no FL2 free tier).
const L2_SIDEBAR_CLUBS = [
  { id:10242,  shortName: "Troyes",       crest: "https://images.fotmob.com/image_resources/logo/teamlogo/10242.png" },
  { id:9853,   shortName: "Saint-Étienne",crest: "https://images.fotmob.com/image_resources/logo/teamlogo/9853.png" },
  { id:9837,   shortName: "Reims",        crest: "https://images.fotmob.com/image_resources/logo/teamlogo/9837.png" },
  { id:10249,  shortName: "Montpellier",  crest: "https://images.fotmob.com/image_resources/logo/teamlogo/10249.png" },
  { id:8311,   shortName: "Clermont",     crest: "https://images.fotmob.com/image_resources/logo/teamlogo/8311.png" },
  { id:9747,   shortName: "Guingamp",     crest: "https://images.fotmob.com/image_resources/logo/teamlogo/9747.png" },
  { id:8682,   shortName: "Le Mans",      crest: "https://images.fotmob.com/image_resources/logo/teamlogo/8682.png" },
  { id:6390,   shortName: "Red Star",     crest: "https://images.fotmob.com/image_resources/logo/teamlogo/6390.png" },
  { id:4120,   shortName: "Rodez",        crest: "https://images.fotmob.com/image_resources/logo/teamlogo/4120.png" },
  { id:293352, shortName: "Annecy",       crest: "https://images.fotmob.com/image_resources/logo/teamlogo/293352.png" },
  { id:6355,   shortName: "Pau",          crest: "https://images.fotmob.com/image_resources/logo/teamlogo/6355.png" },
  { id:47214,  shortName: "Dunkerque",    crest: "https://images.fotmob.com/image_resources/logo/teamlogo/47214.png" },
  { id:9855,   shortName: "Grenoble",     crest: "https://images.fotmob.com/image_resources/logo/teamlogo/9855.png" },
  { id:8481,   shortName: "Nancy",        crest: "https://images.fotmob.com/image_resources/logo/teamlogo/8481.png" },
  { id:4170,   shortName: "Boulogne",     crest: "https://images.fotmob.com/image_resources/logo/teamlogo/4170.png" },
  { id:7853,   shortName: "Laval",        crest: "https://images.fotmob.com/image_resources/logo/teamlogo/7853.png" },
  { id:7794,   shortName: "Bastia",       crest: "https://images.fotmob.com/image_resources/logo/teamlogo/7794.png" },
  { id:8587,   shortName: "Amiens",       crest: "https://images.fotmob.com/image_resources/logo/teamlogo/8587.png" },
];

function SidebarLeagueSection({
  title, clubs, standings, defaultOpen = true,
}: {
  title: string;
  clubs: { id: number; shortName: string; crest: string }[];
  standings?: Standing[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const posMap = new Map(standings?.map((s) => [s.team.id, s.position]) ?? []);
  const formMap = new Map(standings?.map((s) => [s.team.id, s.form]) ?? []);
  const sorted = standings
    ? [...clubs].sort((a, b) => (posMap.get(a.id) ?? 99) - (posMap.get(b.id) ?? 99))
    : clubs;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2d42", background: "#0d1421" }}>
      <button onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
        style={{ borderBottom: open ? "1px solid #1e2d42" : "none" }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#6b7c96" }}>{title}</p>
        <CaretRight size={12} style={{ color: "#6b7c96", transform: open ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div className="overflow-y-auto" style={{ maxHeight: "calc(50vh - 80px)" }}>
          {sorted.map((club) => {
            const pos = posMap.get(club.id);
            const form = formMap.get(club.id);
            const lastResult = form ? form.split(",").filter(Boolean).slice(-1)[0] : null;
            const resultColor = lastResult === "W" ? "#22c55e" : lastResult === "L" ? "#ef4444" : lastResult === "D" ? "#f59e0b" : null;
            return (
              <a key={club.id} href={`/club/${club.id}`}
                className="flex items-center gap-2 px-3 py-2 transition-all hover:bg-white/[0.04] group"
                style={{ borderBottom: "1px solid rgba(30,45,66,0.3)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={club.crest} alt={club.shortName} className="w-6 h-6 object-contain flex-shrink-0" loading="lazy" />
                <span className="flex-1 text-xs font-medium truncate transition-colors" style={{ color: "#94a3b8" }}>
                  {club.shortName}
                </span>
                {pos && (
                  <span className="text-xs font-mono flex-shrink-0 w-4 text-right"
                    style={{ color: pos <= 3 ? "#22c55e" : pos >= 16 ? "#ef4444" : "#6b7c96" }}>
                    {pos}
                  </span>
                )}
                {lastResult && resultColor && (
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: resultColor }} />
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClubSidebar({ standings, standingsL2 }: { standings?: Standing[]; standingsL2?: Standing[] }) {
  return (
    <div className="space-y-3">
      <SidebarLeagueSection title="Clubs L1" clubs={L1_SIDEBAR_CLUBS} standings={standings} defaultOpen={true} />
      <SidebarLeagueSection title="Clubs L2" clubs={L2_SIDEBAR_CLUBS} standings={standingsL2} defaultOpen={false} />
    </div>
  );
}

const L1_SUBTABS: { id: L1SubTab; label: string; icon: React.ReactNode }[] = [
  { id: "classement", label: "Classement",   icon: <ChartBar size={13} /> },
  { id: "mercato",    label: "Mercato",      icon: <ArrowsLeftRight size={13} /> },
  { id: "joueurs",    label: "Stats Joueurs",icon: <Users size={13} /> },
  { id: "transfert",  label: "Transferts",   icon: <ArrowsLeftRight size={13} /> },
  { id: "arbitres",   label: "🟨 Arbitres",  icon: <Target size={13} /> },
];

const TABS: { id: TabId; label: string; icon: React.ReactNode; shortLabel?: string }[] = [
  { id: "ligue1",      label: "Ligue 1",            icon: <Trophy size={14} />,          shortLabel: "L1" },
  { id: "ligue2",      label: "Ligue 2",            icon: <Trophy size={14} />,          shortLabel: "L2" },
  { id: "worldcup",    label: "Coupe du Monde",      icon: <Globe size={14} />,           shortLabel: "CdM" },
  { id: "tv",          label: "TV",                   icon: <Television size={14} />,      shortLabel: "TV" },
  { id: "monclub",     label: "Mon Club",            icon: <Shield size={14} />,          shortLabel: "Mon Club" },
  { id: "predictions", label: "AI FootPredictom",   icon: <Lightning size={14} />,             shortLabel: "AI Foot" },
  { id: "results",     label: "Résultats",           icon: <Target size={14} /> },
  { id: "emotional",   label: "Facteur additionnel", icon: <Pulse size={14} />,        shortLabel: "Fact. add." },
  { id: "config",      label: "Configuration",       icon: <GearSix size={14} />,        shortLabel: "Config" },
];

interface AuthUser { id: string; email: string; name: string }

function AuthGate({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl flex flex-col items-center justify-center py-20 gap-5"
      style={{ border: "1px solid #1e2d42", background: "rgba(13,20,33,0.6)" }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1e2d42" }}>
        <Lock size={22} style={{ color: "#64748b" }} />
      </div>
      <div className="text-center">
        <p className="font-black text-base mb-1" style={{ color: "#e8edf5" }}>
          {icon} <span className="ml-1">{label}</span> réservé aux membres
        </p>
        <p className="text-sm" style={{ color: "#6b7c96" }}>
          Créez un compte gratuit pour accéder à cette section.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/login"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black hover:opacity-90 transition-all"
          style={{ background: "#3b82f6", color: "#fff" }}>
          <SignIn size={14} /> Se connecter
        </Link>
        <Link href="/login?tab=register"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-80 transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#94a3b8" }}>
          S&apos;inscrire
        </Link>
      </div>
    </div>
  );
}

// Day/Night-style toggle that flips the whole site between colour and
// monochrome via a class on <html>. Persisted in localStorage.
function MonochromeToggle() {
  const [mono, setMono] = useState(false);
  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("ui:monochrome") === "1";
    if (saved) {
      document.documentElement.classList.add("monochrome");
      setMono(true);
    }
  }, []);
  const toggle = () => {
    const next = !mono;
    setMono(next);
    document.documentElement.classList.toggle("monochrome", next);
    if (next) {
      // Mutually exclusive with the other CSS-filter themes — don't stack.
      document.documentElement.classList.remove("light-mode", "edito");
      try { localStorage.setItem("ui:light", "0"); } catch {}
      try { localStorage.setItem("ui:edito", "0"); } catch {}
    }
    try { localStorage.setItem("ui:monochrome", next ? "1" : "0"); } catch {}
  };
  return (
    <button
      onClick={toggle}
      data-mono-keep
      title={mono ? "Mode couleur" : "Mode monochrome"}
      aria-label={mono ? "Activer le mode couleur" : "Activer le mode monochrome"}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 active:scale-95"
      style={{
        background: mono ? "rgba(148,163,184,0.10)" : "rgba(234,179,8,0.10)",
        border: `1px solid ${mono ? "rgba(148,163,184,0.30)" : "rgba(234,179,8,0.30)"}`,
        color: mono ? "#cbd5e1" : "#eab308",
      }}>
      {mono ? <MoonStars size={12} weight="fill" /> : <Sun size={12} weight="fill" />}
      <span className="hidden sm:inline">{mono ? "Mono" : "Couleur"}</span>
    </button>
  );
}

// Light-mode toggle. Flips the whole document from dark to light via a CSS
// filter on <html>.light-mode (defined in globals.css). The filter approach
// avoids touching the hundreds of inline-style colours scattered across the
// codebase. Images/photos/crests carry `data-keep-color` (or are <img>/<video>)
// and stay un-inverted. Mutually exclusive with monochrome mode — turning one
// on turns the other off so the filters don't stack into something illegible.
function LightModeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("ui:light") === "1";
    if (saved) {
      document.documentElement.classList.add("light-mode");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLight(true);
    }
  }, []);
  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light-mode", next);
    if (next) {
      // Turning on light: drop monochrome + edito so filters don't stack.
      document.documentElement.classList.remove("monochrome", "edito");
      try { localStorage.setItem("ui:monochrome", "0"); } catch {}
      try { localStorage.setItem("ui:edito", "0"); } catch {}
    }
    try { localStorage.setItem("ui:light", next ? "1" : "0"); } catch {}
  };
  return (
    <button
      onClick={toggle}
      data-mono-keep
      data-keep-color
      title={light ? "Mode sombre" : "Mode clair"}
      aria-label={light ? "Activer le mode sombre" : "Activer le mode clair"}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 active:scale-95"
      style={{
        background: light ? "rgba(251,191,36,0.12)" : "rgba(148,163,184,0.10)",
        border: `1px solid ${light ? "rgba(251,191,36,0.32)" : "rgba(148,163,184,0.30)"}`,
        color: light ? "#eab308" : "#cbd5e1",
      }}>
      {light ? <Sun size={12} weight="fill" /> : <MoonStars size={12} weight="fill" />}
      <span className="hidden sm:inline">{light ? "Clair" : "Sombre"}</span>
    </button>
  );
}

// Édito mode — optional papier-journal theme inspired by Blast (blast-info.fr).
// Same CSS-filter trick as light-mode but without the hue-rotate compensation,
// so the cyan accent flips to red-orange and reads as "presse écrite". Mutually
// exclusive with light-mode and monochrome so the filters never stack.
function EditoModeToggle() {
  const [edito, setEdito] = useState(false);
  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("ui:edito") === "1";
    if (saved) {
      document.documentElement.classList.add("edito");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEdito(true);
    }
  }, []);
  const toggle = () => {
    const next = !edito;
    setEdito(next);
    document.documentElement.classList.toggle("edito", next);
    if (next) {
      document.documentElement.classList.remove("light-mode", "monochrome");
      try { localStorage.setItem("ui:light", "0"); } catch {}
      try { localStorage.setItem("ui:monochrome", "0"); } catch {}
    }
    try { localStorage.setItem("ui:edito", next ? "1" : "0"); } catch {}
  };
  return (
    <button
      onClick={toggle}
      data-mono-keep
      data-keep-color
      title={edito ? "Mode standard" : "Mode édito (papier journal)"}
      aria-label={edito ? "Désactiver le mode édito" : "Activer le mode édito"}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 active:scale-95"
      style={{
        background: edito ? "rgba(215,38,56,0.12)" : "rgba(148,163,184,0.10)",
        border: `1px solid ${edito ? "rgba(215,38,56,0.35)" : "rgba(148,163,184,0.30)"}`,
        color: edito ? "#d72638" : "#cbd5e1",
      }}>
      <Newspaper size={12} weight={edito ? "fill" : "regular"} />
      <span className="hidden sm:inline">Édito</span>
    </button>
  );
}

export default function Home() {
  const [tab, setTab] = useState<TabId>("ligue1");
  const [l1SubTab, setL1SubTab] = useState<L1SubTab>("classement");
  const [l2SubTab, setL2SubTab] = useState<L1SubTab>("classement");
  const [data, setData] = useState<StandingsData | null>(null);
  const [dataL2, setDataL2] = useState<StandingsData | null>(null);
  const [errorL2, setErrorL2] = useState<string | null>(null);
  const [loadingL2, setLoadingL2] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined); // undefined = loading

  const fetchStandings = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/standings?t=" + Date.now());
      if (!res.ok) throw new Error("Erreur de chargement");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setLastUpdated(new Date());
      setError(null);
      setCountdown(60);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStandings();
    const interval = setInterval(() => fetchStandings(), 60_000);
    return () => clearInterval(interval);
  }, [fetchStandings]);

  // Fetch Ligue 2 standings lazily when the tab is opened.
  const fetchL2 = useCallback(async () => {
    setLoadingL2(true);
    try {
      const res = await fetch("/api/standings?competition=FL2&t=" + Date.now());
      const json = await res.json();
      if (json.error && (!json.standings || json.standings.length === 0)) {
        setErrorL2(json.error);
        setDataL2(null);
      } else {
        setDataL2(json);
        setErrorL2(null);
      }
    } catch (e: unknown) {
      setErrorL2(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoadingL2(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "ligue2" && !dataL2 && !errorL2) fetchL2();
  }, [tab, dataL2, errorL2, fetchL2]);

  // Prefetch L2 standings once so the sidebar shows positions immediately.
  useEffect(() => {
    if (!dataL2 && !errorL2 && !loadingL2) fetchL2();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user ?? null)).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setCountdown((c) => (c <= 1 ? 60 : c - 1)), 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <main className="min-h-screen" style={{ background: "#080c14" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b"
        style={{ borderColor: "#1e2d42", background: "rgba(8,12,20,0.92)" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <FootPredictomLogo />

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              {error
                ? <WifiSlash size={14} className="text-red-400" />
                : <>
                    <span className="w-1.5 h-1.5 rounded-full live-pulse" style={{ background: "#34d399", boxShadow: "0 0 4px #34d399" }} />
                    <span className="text-xs font-medium tracking-widest" style={{ color: "#64748b" }}>EN DIRECT</span>
                  </>
              }
            </div>

            {lastUpdated && (
              <div className="hidden md:flex items-center gap-1.5 text-xs" style={{ color: "#6b7c96" }}>
                <Clock size={11} />
                <span>{formatTime(lastUpdated)}</span>
                <span className="opacity-40">· {countdown}s</span>
              </div>
            )}

            <LiveDirectButton />

            <LightModeToggle />
            <EditoModeToggle />
            <MonochromeToggle />

            <button onClick={() => fetchStandings(true)} disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 active:scale-95"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1e2d42", color: "#94a3b8" }}>
              <ArrowsClockwise size={12} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>

            {user === undefined ? null : user ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#e2e8f0" }}>
                  {user.name}
                </span>
                {user.id === "owner" && (
                  <Link href="/admin" title="Panel Admin"
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs hover:opacity-80 transition-all"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
                    <Shield size={12} />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}
                <form action="/api/auth/logout" method="POST">
                  <button type="submit" title="Déconnexion"
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs hover:opacity-80 transition-all"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
                    <SignOut size={12} />
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#94a3b8" }}>
                <SignIn size={12} /> <span className="hidden sm:inline">Connexion</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── NEWS BANNER ── */}
      <NewsBanner standings={data?.standings ?? []} />

      {/* ── @ActuFoot_ live ticker ── */}
      <ActuFootBanner />

      {/* ── Image of the Day — freshest media-bearing tweet (last 24h) ── */}
      <ImageOfTheDay />

      <div className="max-w-[1300px] mx-auto px-4 py-6">
        <div className="lg:grid lg:gap-5 lg:items-start" style={{ gridTemplateColumns: "1fr 196px" }}>
        <div className="min-w-0">
        {/* Tab switcher */}
        <div className="flex gap-0.5 mb-6 p-1 rounded-xl overflow-x-auto" style={{ background: "#0d1421", border: "1px solid #1a2235" }}>
          {TABS.map((t) => {
            const isProtected = (t.id === "predictions" || t.id === "emotional") && !user;
            const active = tab === t.id;
            const isHotWC = t.id === "worldcup" && isWorldCupHot();
            const wcPhase = isHotWC ? worldCupPhase() : "off";
            const wcBadge = isHotWC && wcPhase === "before"
              ? `J-${Math.max(0, daysUntilWorldCup())}`
              : isHotWC && wcPhase === "live" ? "LIVE" : null;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${isHotWC ? "wc-hot-tab" : ""}`}
                style={{
                  background: isHotWC
                    ? (active
                        ? "linear-gradient(135deg, rgba(251,191,36,0.18), rgba(239,68,68,0.18))"
                        : "linear-gradient(135deg, rgba(251,191,36,0.08), rgba(239,68,68,0.08))")
                    : active ? "rgba(255,255,255,0.07)" : "transparent",
                  color: isHotWC ? "#fbbf24" : active ? "#e2e8f0" : "#64748b",
                  border: isHotWC
                    ? `1px solid ${active ? "rgba(251,191,36,0.5)" : "rgba(251,191,36,0.3)"}`
                    : active ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                  boxShadow: isHotWC ? "0 0 12px rgba(251,191,36,0.18)" : undefined,
                }}>
                {isHotWC ? <Fire size={14} weight="fill" style={{ color: "#fbbf24" }} /> : t.icon}
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.shortLabel ?? t.label}</span>
                {wcBadge && (
                  <span className="ml-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                    style={{
                      background: wcPhase === "live" ? "#ef4444" : "rgba(251,191,36,0.2)",
                      color: wcPhase === "live" ? "#fff" : "#fbbf24",
                      border: wcPhase === "live" ? "none" : "1px solid rgba(251,191,36,0.4)",
                    }}>
                    {wcPhase === "live" && (
                      <span className="inline-block w-1 h-1 rounded-full mr-1 align-middle"
                        style={{ background: "#fff", animation: "wc-pulse 1.2s ease-in-out infinite" }} />
                    )}
                    {wcBadge}
                  </span>
                )}
                {isProtected && <Lock size={9} style={{ color: "#475569", marginLeft: 1 }} />}
              </button>
            );
          })}
        </div>

        {/* Ligue 1 tab */}
        {tab === "ligue1" && (
          <div>
            {/* L1 Sub-tabs */}
            <div className="flex gap-1 mb-5 p-1 rounded-xl overflow-x-auto" style={{ background: "#0a0f1c", border: "1px solid #1a2235" }}>
              {L1_SUBTABS.map((st) => {
                const active = l1SubTab === st.id;
                return (
                  <button key={st.id} onClick={() => setL1SubTab(st.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0"
                    style={{
                      background: active ? "rgba(255,255,255,0.08)" : "transparent",
                      color: active ? "#e2e8f0" : "#64748b",
                      border: active ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
                    }}>
                    {st.icon}
                    {st.label}
                  </button>
                );
              })}
            </div>

            {/* Classement */}
            {l1SubTab === "classement" && (
              <div>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-3 px-1">
                  {ZONE_CONFIG.map((z) => (
                    <div key={z.label} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: z.color, opacity: 0.8 }} />
                      <span style={{ color: z.color }}>{z.label}</span>
                    </div>
                  ))}
                </div>
                {loading && !data ? (
                  <LoadingSkeleton />
                ) : error && !data ? (
                  <ErrorState error={error} onRetry={() => fetchStandings(true)} />
                ) : data ? (
                  <StandingsTable standings={data.standings} />
                ) : null}
                <div className="mt-3">
                  <FunFact section="ligue1" />
                </div>
              </div>
            )}

            {/* Mercato — single unified dashboard with L1/L2 internal tabs + Boursier board */}
            {l1SubTab === "mercato" && <TransfersTab defaultLeague="FL1" />}

            {/* Stats Joueurs */}
            {l1SubTab === "joueurs" && (
              <div>
                <Link href="/players"
                  className="flex items-center justify-between px-5 py-4 rounded-2xl hover:opacity-80 transition-opacity"
                  style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)" }}>
                  <div className="flex items-center gap-3">
                    <Users size={18} style={{ color: "#00d4ff" }} />
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#e8edf5" }}>Statistiques joueurs</p>
                      <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>xG, xA, buts, passes déc. — tous les clubs</p>
                    </div>
                  </div>
                  <CaretRight size={16} style={{ color: "#00d4ff" }} />
                </Link>
              </div>
            )}

            {/* Transferts (alias) */}
            {l1SubTab === "transfert" && <TransfersTab defaultLeague="FL1" />}

            {/* Arbitres */}
            {l1SubTab === "arbitres" && <RefereesL1Tab />}
          </div>
        )}

        {/* Ligue 2 tab — same layout, only Classement is wired today.
            Mercato / Stats Joueurs / Transferts / Arbitres are hard-coded
            on L1 clubs and show a "bientôt" placeholder for L2. */}
        {tab === "ligue2" && (
          <div>
            <div className="flex gap-1 mb-5 p-1 rounded-xl overflow-x-auto" style={{ background: "#0a0f1c", border: "1px solid #1a2235" }}>
              {L1_SUBTABS.map((st) => {
                const active = l2SubTab === st.id;
                return (
                  <button key={st.id} onClick={() => setL2SubTab(st.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0"
                    style={{
                      background: active ? "rgba(255,255,255,0.07)" : "transparent",
                      color: active ? "#e2e8f0" : "#64748b",
                      border: active ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                    }}>
                    {st.icon}
                    <span>{st.label}</span>
                  </button>
                );
              })}
            </div>

            {l2SubTab === "classement" && (
              <div>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-3 px-1">
                  {ZONE_CONFIG.map((z) => (
                    <div key={z.label} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: z.color, opacity: 0.8 }} />
                      <span style={{ color: z.color }}>{z.label}</span>
                    </div>
                  ))}
                </div>
                {loadingL2 && !dataL2 ? (
                  <LoadingSkeleton />
                ) : errorL2 && !dataL2 ? (
                  <ErrorState error={errorL2} onRetry={fetchL2} />
                ) : dataL2 ? (
                  <StandingsTable standings={dataL2.standings} />
                ) : null}
              </div>
            )}

            {l2SubTab === "mercato" && <TransfersTab defaultLeague="FL2" />}

            {l2SubTab === "joueurs" && (
              <div>
                <Link href="/players?league=FL2"
                  className="flex items-center justify-between px-5 py-4 rounded-2xl hover:opacity-80 transition-opacity"
                  style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)" }}>
                  <div className="flex items-center gap-3">
                    <Users size={18} style={{ color: "#00d4ff" }} />
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#e8edf5" }}>Statistiques joueurs Ligue 2</p>
                      <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>Top buteurs, passeurs, notation — source FotMob</p>
                    </div>
                  </div>
                  <CaretRight size={16} style={{ color: "#00d4ff" }} />
                </Link>
              </div>
            )}

            {l2SubTab === "transfert" && <TransfersTab defaultLeague="FL2" />}

            {l2SubTab === "arbitres" && (
              <div className="rounded-2xl p-10 text-center" style={{ border: "1px solid #1e2d42", background: "rgba(13,20,33,0.6)" }}>
                <p className="text-sm font-bold mb-1" style={{ color: "#e8edf5" }}>Bientôt disponible</p>
                <p className="text-xs" style={{ color: "#6b7c96" }}>
                  Les statistiques arbitrales Ligue 2 seront ajoutées prochainement.
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "worldcup" && <WorldCupTab />}
        {tab === "tv" && <TVTab />}
        {tab === "monclub" && <MonClubTab />}
        {tab === "predictions" && (user ? <PredictionsTab /> : <AuthGate label="AI FootPredictom" icon={<Lightning size={16} className="inline" style={{ color: "#3b82f6" }} />} />)}
        {tab === "results" && <ResultsTab />}
        {tab === "emotional" && (user ? <EmotionalScoreTab /> : <AuthGate label="Facteur additionnel" icon={<Pulse size={16} className="inline" style={{ color: "#a78bfa" }} />} />)}
        {tab === "config" && <ConfigTab />}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs" style={{ color: "#6b7c96" }}>
          <div className="flex items-center gap-1.5">
            {error
              ? <><WifiSlash size={11} className="text-red-400" /><span className="text-red-400 ml-1">Hors ligne</span></>
              : <><WifiHigh size={11} /><span className="ml-1">Données en direct · Ligue 1</span></>
            }
          </div>
          {data?.season && <span>Saison {data.season}</span>}
        </div>
        </div>{/* end main-content col */}

        {/* Club sidebar — always visible on lg+ */}
        <div className="hidden lg:block space-y-3" style={{ position: "sticky", top: "73px" }}>
          <ClubSidebar standings={data?.standings} standingsL2={dataL2?.standings} />
        </div>
        </div>{/* end grid */}
      </div>{/* end max-w */}
    </main>
  );
}
