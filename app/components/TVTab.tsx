"use client";

// TV tab — upcoming matches across L1 / L2 / CdM with their broadcast
// channels. Three sub-tabs share the same row layout: date + teams + a
// "Diffusion" group that splits French and international channels so a
// French viewer immediately sees where to watch the match.
//
// Data flows from /api/tv. Broadcasters are joined from the static map in
// lib/broadcasts.ts: per-competition defaults + optional per-match overrides
// (only used for WC marquee fixtures that move to free-to-air TF1/M6).

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Television, Globe, Trophy, ArrowsClockwise, Sparkle, ArrowSquareOut } from "@phosphor-icons/react";
import {
  REGION_FLAGS,
  REGION_LABELS,
  defaultBroadcasters,
  groupByRegion,
  type Broadcaster,
  type Competition,
} from "@/app/lib/broadcasts";
import { fmtTime, fmtWeekdayDayMonth } from "@/app/lib/format";

interface TvMatch {
  id: string;
  utcDate: string;
  matchday?: number;
  group?: string;
  stage?: string;
  homeTeam: { name: string; shortName?: string; tla?: string; crest?: string };
  awayTeam: { name: string; shortName?: string; tla?: string; crest?: string };
  note?: string;
  broadcastOverride?: string[];
}

interface TvBlock { matches: TvMatch[]; source: string; error?: string }
interface TvResponse {
  l1: TvBlock;
  l2: TvBlock;
  cdm: TvBlock;
  updatedAt: string;
}

type SubTab = "FL1" | "FL2" | "WC2026";

const SUB_TABS: { id: SubTab; label: string; emoji: string; color: string }[] = [
  { id: "FL1",    label: "Ligue 1",     emoji: "🇫🇷", color: "#00d4ff" },
  { id: "FL2",    label: "Ligue 2",     emoji: "🇫🇷", color: "#a78bfa" },
  { id: "WC2026", label: "Coupe du Monde", emoji: "🌍", color: "#fbbf24" },
];

/** Join per-competition default channels with per-match overrides. Override
 *  channels (when set on a WC fixture) take precedence at the top of the list
 *  — they're the canonical broadcasters for that specific match. The default
 *  channels fill in below to provide an international view too. */
function resolveBroadcasters(competition: Competition, override: string[] | undefined): Broadcaster[] {
  const defaults = defaultBroadcasters(competition);
  if (!override || override.length === 0) return defaults;
  // Pull overrides to the front in the order they were declared.
  const byName = new Map(defaults.map(b => [b.name, b] as const));
  const head: Broadcaster[] = override
    .map(name => byName.get(name) ?? { name, region: "FR" as const })
    .filter(Boolean);
  const headNames = new Set(head.map(b => b.name));
  const tail = defaults.filter(b => !headNames.has(b.name));
  return [...head, ...tail];
}

function ChannelChip({ b }: { b: Broadcaster }) {
  const inner = (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap"
      style={{
        background: b.free
          ? "rgba(34,197,94,0.10)"
          : b.streaming
            ? "rgba(168,139,250,0.08)"
            : "rgba(255,255,255,0.04)",
        color: b.free ? "#22c55e" : b.streaming ? "#a78bfa" : "#cbd5e1",
        border: `1px solid ${b.free ? "rgba(34,197,94,0.25)" : b.streaming ? "rgba(168,139,250,0.2)" : "rgba(255,255,255,0.06)"}`,
      }}
      title={b.free ? "Chaîne gratuite" : b.streaming ? "Streaming" : undefined}
    >
      {b.free && <Sparkle size={8} weight="fill" />}
      {b.streaming && !b.free && <Television size={8} weight="fill" />}
      {b.name}
      {b.url && <ArrowSquareOut size={8} weight="bold" style={{ opacity: 0.55 }} />}
    </span>
  );
  return b.url
    ? <a href={b.url} target="_blank" rel="noopener noreferrer" data-keep-color className="hover:opacity-80 transition-opacity">{inner}</a>
    : inner;
}

function TeamLine({ team }: { team: TvMatch["homeTeam"] }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {team.crest ? (
        <Image src={team.crest} alt="" width={16} height={16} className="rounded-sm" data-keep-color unoptimized />
      ) : (
        <span className="w-4 h-4 rounded-sm bg-white/5 inline-block flex-shrink-0" />
      )}
      <span className="text-[11px] font-bold truncate" style={{ color: "#e8edf5" }}>
        {team.shortName || team.name}
      </span>
    </div>
  );
}

function MatchRow({ match, competition }: { match: TvMatch; competition: Competition }) {
  const broadcasters = useMemo(
    () => resolveBroadcasters(competition, match.broadcastOverride),
    [competition, match.broadcastOverride],
  );
  const grouped = useMemo(() => groupByRegion(broadcasters), [broadcasters]);
  const [open, setOpen] = useState(false);

  // Always show France + the override channels at the row level. The expand
  // toggle reveals the full international list — keeps initial scan dense.
  const franceChannels = grouped.find(g => g.region === "FR")?.items ?? [];
  const internationalGroups = grouped.filter(g => g.region !== "FR");
  const intlCount = internationalGroups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{ background: "#0a1120", border: `1px solid ${open ? "#2a3b54" : "#1e2d42"}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left p-2.5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          {/* Date + time */}
          <div className="flex flex-col items-center flex-shrink-0 w-12">
            <span className="text-[9px] uppercase font-bold tracking-wide" style={{ color: "#6b7c96" }}>
              {fmtWeekdayDayMonth(match.utcDate)}
            </span>
            <span className="text-xs font-black tabular-nums" style={{ color: "#e8edf5" }}>
              {fmtTime(match.utcDate)}
            </span>
          </div>

          {/* Teams */}
          <div className="flex-1 min-w-0">
            <TeamLine team={match.homeTeam} />
            <TeamLine team={match.awayTeam} />
          </div>

          {/* Note / stage / matchday */}
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            {match.note && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
                {match.note}
              </span>
            )}
            {match.matchday && (
              <span className="text-[9px] font-semibold" style={{ color: "#64748b" }}>
                J{match.matchday}
              </span>
            )}
            {match.group && !match.note && (
              <span className="text-[9px] font-semibold" style={{ color: "#64748b" }}>
                Gr.{match.group}
              </span>
            )}
            {match.stage && !match.matchday && !match.group && (
              <span className="text-[9px] font-semibold truncate max-w-[100px]" style={{ color: "#64748b" }}>
                {match.stage}
              </span>
            )}
          </div>
        </div>

        {/* France channels — always visible */}
        {franceChannels.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap pl-14">
            <span className="text-[9px] font-bold" style={{ color: "#6b7c96" }}>
              {REGION_FLAGS.FR} France
            </span>
            {franceChannels.map(b => <ChannelChip key={b.name} b={b} />)}
          </div>
        )}

        {!open && intlCount > 0 && (
          <p className="text-[9px] mt-1.5 pl-14" style={{ color: "#475569" }}>
            + {intlCount} chaîne{intlCount > 1 ? "s" : ""} à l&apos;international · toucher pour voir
          </p>
        )}
      </button>

      {open && intlCount > 0 && (
        <div className="px-3 pb-3 pt-1 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          {internationalGroups.map(g => (
            <div key={g.region} className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-bold whitespace-nowrap" style={{ color: "#6b7c96" }}>
                {REGION_FLAGS[g.region]} {REGION_LABELS[g.region]}
              </span>
              {g.items.map(b => <ChannelChip key={b.name} b={b} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubTabContent({ block, competition }: { block: TvBlock | undefined; competition: Competition }) {
  if (!block) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: "#0a1120", border: "1px solid #1e2d42" }}>
        <p className="text-xs" style={{ color: "#64748b" }}>Chargement…</p>
      </div>
    );
  }
  if (block.error && block.matches.length === 0) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.18)" }}>
        <p className="text-xs font-semibold" style={{ color: "#ef4444" }}>
          Impossible de charger les rencontres
        </p>
        <p className="text-[10px] mt-1" style={{ color: "#64748b" }}>{block.error}</p>
      </div>
    );
  }
  if (block.matches.length === 0) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: "#0a1120", border: "1px solid #1e2d42" }}>
        <p className="text-xs" style={{ color: "#64748b" }}>Aucune rencontre programmée pour le moment.</p>
      </div>
    );
  }

  // Group matches by day so the user can scan day-by-day.
  const byDay = new Map<string, TvMatch[]>();
  for (const m of block.matches) {
    const key = m.utcDate.slice(0, 10); // YYYY-MM-DD
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(m);
  }
  const days = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-3">
      {days.map(([day, matches]) => (
        <div key={day}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: "#6b7c96" }}>
              {fmtWeekdayDayMonth(day + "T12:00:00Z")}
            </span>
            <span className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
            <span className="text-[9px] font-semibold" style={{ color: "#475569" }}>
              {matches.length} match{matches.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-1.5">
            {matches.map(m => <MatchRow key={m.id} match={m} competition={competition} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TVTab() {
  const [data, setData] = useState<TvResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<SubTab>("FL1");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tv?t=" + Date.now());
      const json = await res.json() as TvResponse;
      setData(json);
    } catch {
      // Show empty state below.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch on mount. Same pattern as the other tabs (PredictionsTab,
    // ResultsTab) — the rule complains because load() calls setLoading inside.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const block = data ? (active === "FL1" ? data.l1 : active === "FL2" ? data.l2 : data.cdm) : undefined;
  const updated = data ? new Date(data.updatedAt) : null;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl mb-3"
        style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
        <Television size={16} weight="bold" style={{ color: "#00d4ff" }} />
        <span className="text-sm font-black tracking-tight" style={{ color: "#e8edf5" }}>
          Où regarder les prochains matchs
        </span>
        <div className="ml-auto flex items-center gap-2">
          {updated && (
            <span className="text-[10px]" style={{ color: "#64748b" }}>
              Maj {updated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            data-keep-color
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1e2d42", color: "#94a3b8" }}>
            <ArrowsClockwise size={10} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {/* Sub-tab bar */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-0.5">
        {SUB_TABS.map(tab => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1.5"
              style={{
                background: isActive ? tab.color : "#0d1421",
                color: isActive ? "#080c14" : "#6b7c96",
                border: `1px solid ${isActive ? tab.color : "#1e2d42"}`,
              }}
            >
              {tab.id === "WC2026" ? <Globe size={11} weight="bold" /> : <Trophy size={11} weight="bold" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 px-1 text-[9px]" style={{ color: "#64748b" }}>
        <span className="flex items-center gap-1">
          <Sparkle size={9} weight="fill" style={{ color: "#22c55e" }} />
          gratuit
        </span>
        <span className="flex items-center gap-1">
          <Television size={9} weight="fill" style={{ color: "#a78bfa" }} />
          streaming
        </span>
        <span style={{ color: "#475569" }}>· touche une ligne pour voir l&apos;international</span>
      </div>

      {/* Content */}
      <SubTabContent block={block} competition={active} />

      {/* Footnote */}
      <p className="text-[9px] text-center mt-4" style={{ color: "#475569" }}>
        Les droits de diffusion peuvent évoluer en cours de saison · sources : LFP, FotMob, FIFA
      </p>
    </div>
  );
}
