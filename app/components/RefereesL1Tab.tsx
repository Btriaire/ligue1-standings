"use client";

import { useState } from "react";
import { CaretDown, CaretUp, Star, Warning, ArrowSquareOut } from "@phosphor-icons/react";

interface Referee {
  id: string;
  name: string;
  age: number;
  region: string;
  matchesSeason: number;
  yellowCards: number;
  redCards: number;
  penalties: number;
  avgYellows: number;
  yearsElite: number;
  reputation: string;
  notable: string;
  assistants: string[];
}

const REFEREES: Referee[] = [
  {
    id: "bastien",
    name: "Benoît Bastien",
    age: 42,
    region: "Grand Est (Vosges)",
    matchesSeason: 17,
    yellowCards: 68,
    redCards: 3,
    penalties: 10,
    avgYellows: 4.0,
    yearsElite: 14,
    reputation: "équilibré",
    notable: "Meilleur arbitre L1 2024-25 selon le classement fédéral. Finale de l'Euro 2024 (Espagne-Angleterre). +260 matchs L1 en carrière, 27 matchs Ligue des Champions. Professeur de sport.",
    assistants: [],
  },
  {
    id: "brisard",
    name: "Jérôme Brisard",
    age: 39,
    region: "Loire-Atlantique",
    matchesSeason: 18,
    yellowCards: 76,
    redCards: 5,
    penalties: 10,
    avgYellows: 4.2,
    yearsElite: 9,
    reputation: "strict",
    notable: "2e au classement fédéral 2024-25. Finale de la Coupe de la Ligue 2020 (PSG-OL). Arbitre FIFA depuis 2018. Taux de cartons parmi les plus élevés de L1.",
    assistants: [],
  },
  {
    id: "turpin",
    name: "Clément Turpin",
    age: 43,
    region: "Auvergne-Rhône-Alpes (Rhône)",
    matchesSeason: 18,
    yellowCards: 61,
    redCards: 3,
    penalties: 6,
    avgYellows: 3.4,
    yearsElite: 17,
    reputation: "expérimenté",
    notable: "Finale de la Ligue des Champions 2022 (Liverpool-Real Madrid). Finale Europa League 2021. Élu meilleur arbitre mondial IFFHS 2025. Sélectionné Coupe du Monde 2026.",
    assistants: [],
  },
  {
    id: "delajod",
    name: "Willy Delajod",
    age: 32,
    region: "Haute-Savoie",
    matchesSeason: 19,
    yellowCards: 58,
    redCards: 3,
    penalties: 6,
    avgYellows: 3.1,
    yearsElite: 7,
    reputation: "équilibré",
    notable: "Record : plus jeune arbitre L1 de l'histoire lors de ses débuts en 2018 (25 ans). Agent immobilier de profession. Arbitre FIFA.",
    assistants: [],
  },
  {
    id: "letexier",
    name: "François Letexier",
    age: 36,
    region: "Bretagne (Ille-et-Vilaine)",
    matchesSeason: 14,
    yellowCards: 55,
    redCards: 4,
    penalties: 3,
    avgYellows: 3.9,
    yearsElite: 9,
    reputation: "rigoureux",
    notable: "Plus jeune arbitre à officier une finale d'Euro (35 ans, Euro 2024). Huissier de justice. UEFA Super Cup 2023. Sélectionné Coupe du Monde 2026.",
    assistants: ["Cyril Mugnier", "Mehdi Rahmouni"],
  },
  {
    id: "pignard",
    name: "Jérémie Pignard",
    age: 37,
    region: "Villefranche-sur-Saône",
    matchesSeason: 18,
    yellowCards: 70,
    redCards: 4,
    penalties: 7,
    avgYellows: 3.9,
    yearsElite: 6,
    reputation: "strict",
    notable: "6e au classement fédéral 2024-25. Arbitre FIFA depuis janvier 2021. Progression rapide vers l'élite européenne.",
    assistants: [],
  },
  {
    id: "wattellier",
    name: "Éric Wattellier",
    age: 37,
    region: "Pyrénées-Orientales",
    matchesSeason: 18,
    yellowCards: 55,
    redCards: 3,
    penalties: 5,
    avgYellows: 3.1,
    yearsElite: 7,
    reputation: "clément",
    notable: "Dentiste de profession. Arbitre FIFA depuis janvier 2024. Taux de cartons parmi les plus bas de L1.",
    assistants: [],
  },
  {
    id: "leonard",
    name: "Thomas Léonard",
    age: 44,
    region: "Grand Est (Moselle)",
    matchesSeason: 20,
    yellowCards: 73,
    redCards: 4,
    penalties: 4,
    avgYellows: 3.7,
    yearsElite: 8,
    reputation: "régulier",
    notable: "Plus grand nombre de matchs L1 cette saison (20). 8e au classement fédéral 2024-25.",
    assistants: [],
  },
  {
    id: "stinat",
    name: "Jérémy Stinat",
    age: 46,
    region: "Centre-Val de Loire (Chartres)",
    matchesSeason: 18,
    yellowCards: 62,
    redCards: 6,
    penalties: 6,
    avgYellows: 3.4,
    yearsElite: 7,
    reputation: "sévère",
    notable: "Taux de cartons rouges parmi les plus élevés. Ancien joueur de Ligue 2 reconverti arbitre.",
    assistants: [],
  },
  {
    id: "frappart",
    name: "Stéphanie Frappart",
    age: 42,
    region: "Île-de-France (Val-d'Oise)",
    matchesSeason: 16,
    yellowCards: 52,
    redCards: 1,
    penalties: 4,
    avgYellows: 3.3,
    yearsElite: 6,
    reputation: "clémente",
    notable: "1re femme en L1 (2019), en LdC (2020), en CDM masculin (2022). Super Coupe UEFA 2019 (Liverpool-Chelsea). Taux de cartons parmi les plus faibles du championnat.",
    assistants: ["Hicham Zakrani", "Mehdi Rahmouni"],
  },
  {
    id: "bollengier",
    name: "Marc Bollengier",
    age: 33,
    region: "Hauts-de-France",
    matchesSeason: 18,
    yellowCards: 72,
    redCards: 3,
    penalties: 7,
    avgYellows: 4.0,
    yearsElite: 3,
    reputation: "strict",
    notable: "12e au classement fédéral 2024-25. Jeune arbitre en progression, taux de jaunes élevé.",
    assistants: [],
  },
  {
    id: "millot",
    name: "Benoît Millot",
    age: 42,
    region: "Bourgogne-Franche-Comté",
    matchesSeason: 16,
    yellowCards: 58,
    redCards: 2,
    penalties: 7,
    avgYellows: 3.6,
    yearsElite: 14,
    reputation: "expérimenté",
    notable: "14e saison en Ligue 1, +237 matchs en carrière. Régulièrement désigné en coupes européennes.",
    assistants: [],
  },
  {
    id: "dechepy",
    name: "Bastien Dechepy",
    age: 39,
    region: "Grand Est (Oise)",
    matchesSeason: 13,
    yellowCards: 56,
    redCards: 3,
    penalties: 8,
    avgYellows: 4.3,
    yearsElite: 5,
    reputation: "strict",
    notable: "Taux de cartons jaunes parmi les plus élevés de L1 (4.3/match). 5e saison au niveau élite.",
    assistants: [],
  },
  {
    id: "vernice",
    name: "Mathieu Vernice",
    age: 32,
    region: "Méditerranée",
    matchesSeason: 15,
    yellowCards: 65,
    redCards: 2,
    penalties: 3,
    avgYellows: 4.3,
    yearsElite: 3,
    reputation: "strict",
    notable: "11e au classement fédéral 2024-25. Arbitre FIFA depuis janvier 2025. Moyenne de cartons jaunes la plus haute de L1 (4.3/match).",
    assistants: [],
  },
  {
    id: "kherradji",
    name: "Abdelatif Kherradji",
    age: 38,
    region: "Auvergne-Rhône-Alpes (Isère)",
    matchesSeason: 17,
    yellowCards: 60,
    redCards: 4,
    penalties: 6,
    avgYellows: 3.5,
    yearsElite: 1,
    reputation: "en observation",
    notable: "1re saison en Ligue 1 (2024-25), promu depuis la Ligue 2. Conseiller technique de district en Isère.",
    assistants: [],
  },
];

const REPUTATION_CONFIG: Record<string, { color: string; emoji: string }> = {
  "strict":         { color: "#ef4444", emoji: "🟥" },
  "sévère":         { color: "#ef4444", emoji: "🟥" },
  "rigoureux":      { color: "#f97316", emoji: "🟧" },
  "équilibré":      { color: "#22c55e", emoji: "🟩" },
  "expérimenté":    { color: "#3b82f6", emoji: "🔵" },
  "régulier":       { color: "#3b82f6", emoji: "🔵" },
  "clément":        { color: "#a78bfa", emoji: "🟣" },
  "clémente":       { color: "#a78bfa", emoji: "🟣" },
  "en observation": { color: "#f59e0b", emoji: "🟡" },
  "moderne":        { color: "#22c55e", emoji: "🟩" },
};

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-xl"
      style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
      <span className="text-sm font-black" style={{ color }}>{value}</span>
      <span className="text-[9px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: "#6b7c96" }}>{label}</span>
    </div>
  );
}

function YellowBar({ avg }: { avg: number }) {
  // scale: 2.5 = very lenient, 4.5 = very strict
  const pct = Math.min(100, Math.round(((avg - 2.5) / 2.5) * 100));
  const color = avg >= 4.0 ? "#ef4444" : avg >= 3.5 ? "#f59e0b" : "#22c55e";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] w-4 text-right font-mono flex-shrink-0" style={{ color: "#6b7c96" }}>🟨</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-black w-8 text-right flex-shrink-0" style={{ color }}>{avg.toFixed(1)}/m</span>
    </div>
  );
}

// Generated avatar URL from ui-avatars.com (no API key, returns SVG/PNG by name).
// Colour comes from reputation palette — strips '#' for the API.
function avatarUrl(name: string, hex: string): string {
  const bg = hex.replace("#", "");
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=128&background=${bg}&color=fff&bold=true&format=svg`;
}

function RefereeCard({ ref: r }: { ref: Referee }) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const repCfg = REPUTATION_CONFIG[r.reputation] ?? { color: "#94a3b8", emoji: "⚪" };
  const wc2026 = r.id === "turpin" || r.id === "letexier";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${open ? "#1e3a5f" : "#1e2d42"}`, background: "#0d1421" }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:brightness-125 transition-all"
      >
        {/* Avatar — generated photo or fallback to initials */}
        {imgError ? (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
            style={{ background: `${repCfg.color}15`, border: `1.5px solid ${repCfg.color}30`, color: repCfg.color }}>
            {r.name.split(" ").map(p => p[0]).join("").slice(0, 2)}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl(r.name, repCfg.color)} alt={r.name}
            className="w-10 h-10 rounded-xl flex-shrink-0 object-cover"
            style={{ border: `1.5px solid ${repCfg.color}40` }}
            onError={() => setImgError(true)} loading="lazy" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-black" style={{ color: "#e8edf5" }}>{r.name}</span>
            {wc2026 && (
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" }}>
                🌍 CdM 2026
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[9px]" style={{ color: "#475569" }}>{r.region}</span>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: `${repCfg.color}12`, color: repCfg.color }}>
              {repCfg.emoji} {r.reputation}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
          <div className="text-center">
            <p className="text-sm font-black" style={{ color: "#fbbf24" }}>{r.yellowCards}</p>
            <p className="text-[8px]" style={{ color: "#475569" }}>🟨</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-black" style={{ color: "#ef4444" }}>{r.redCards}</p>
            <p className="text-[8px]" style={{ color: "#475569" }}>🟥</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-black" style={{ color: "#94a3b8" }}>{r.matchesSeason}</p>
            <p className="text-[8px]" style={{ color: "#475569" }}>matchs</p>
          </div>
        </div>

        {open ? <CaretUp size={13} style={{ color: "#475569", flexShrink: 0 }} /> : <CaretDown size={13} style={{ color: "#475569", flexShrink: 0 }} />}
      </button>

      {/* Detail panel */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "#1e2d42" }}>
          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-2 pt-3">
            <StatPill label="Matchs" value={r.matchesSeason} color="#94a3b8" />
            <StatPill label="Jaunes" value={r.yellowCards} color="#fbbf24" />
            <StatPill label="Rouges" value={r.redCards} color="#ef4444" />
            <StatPill label="Pénaltys" value={r.penalties} color="#a78bfa" />
          </div>

          {/* Yellow card rate bar */}
          <div className="px-1">
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#475569" }}>
              Sévérité cartons
            </p>
            <YellowBar avg={r.avgYellows} />
            <div className="flex justify-between mt-1">
              <span className="text-[8px]" style={{ color: "#334155" }}>🟣 clément</span>
              <span className="text-[8px]" style={{ color: "#334155" }}>🔴 strict</span>
            </div>
          </div>

          {/* Info rows */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span style={{ color: "#475569" }}>Âge :</span>
              <span style={{ color: "#94a3b8" }}>{r.age} ans · {r.yearsElite} ans au niveau élite</span>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: "#475569" }}>Région :</span>
              <span style={{ color: "#94a3b8" }}>{r.region}</span>
            </div>
            {r.assistants.length > 0 && (
              <div className="flex items-start gap-2">
                <span style={{ color: "#475569" }}>Assistants :</span>
                <span style={{ color: "#94a3b8" }}>{r.assistants.join(", ")}</span>
              </div>
            )}
          </div>

          {/* Notable fact */}
          {r.notable && (
            <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.12)" }}>
              <div className="flex items-start gap-2">
                <Star size={11} style={{ color: "#60a5fa", flexShrink: 0, marginTop: 1 }} />
                <p className="text-[10px] leading-relaxed" style={{ color: "#94a3b8" }}>{r.notable}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RefereesL1Tab() {
  const [sort, setSort] = useState<"matchs" | "jaunes" | "rouges" | "avg">("matchs");

  const sorted = [...REFEREES].sort((a, b) => {
    if (sort === "matchs") return b.matchesSeason - a.matchesSeason;
    if (sort === "jaunes") return b.yellowCards - a.yellowCards;
    if (sort === "rouges") return b.redCards - a.redCards;
    return b.avgYellows - a.avgYellows;
  });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-black" style={{ color: "#e8edf5" }}>Arbitres Ligue 1</h2>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>Saison 2024-25 · {REFEREES.length} arbitres principaux</p>
        </div>
        {/* Sort */}
        <div className="flex gap-1 p-0.5 rounded-xl" style={{ background: "#0a0f1c", border: "1px solid #1a2235" }}>
          {(["matchs", "avg", "jaunes", "rouges"] as const).map(s => (
            <button key={s} onClick={() => setSort(s)}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
              style={{ background: sort === s ? "rgba(255,255,255,0.08)" : "transparent", color: sort === s ? "#e2e8f0" : "#64748b", border: sort === s ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent" }}>
              {s === "matchs" ? "Matchs" : s === "avg" ? "🟨/match" : s === "jaunes" ? "🟨 total" : "🟥 total"}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
        {Object.entries(REPUTATION_CONFIG).filter(([k]) => ["strict","sévère","équilibré","expérimenté","clément","clémente"].includes(k)).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1 text-[9px]">
            <span>{v.emoji}</span>
            <span style={{ color: "#475569" }}>{k}</span>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {sorted.map(r => <RefereeCard key={r.id} ref={r} />)}
      </div>

      <p className="text-[9px] text-center pt-1" style={{ color: "#334155" }}>
        Stats saison 2024-25 · Source : classement fédéral FFF / deux-zero.com
      </p>
    </div>
  );
}
