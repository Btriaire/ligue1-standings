"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowsClockwise, ArrowSquareOut, TrendUp, TrendDown, Newspaper, CaretDown, ArrowRight, ChartLine, User, Calendar } from "@phosphor-icons/react";
import type { ClubTransfers, TransferItem } from "@/app/api/transfers/route";
import type { BoardTransfer } from "@/app/api/mercato-board/route";
import { useConfig } from "@/app/lib/config";
import LoadingBar from "./LoadingBar";

const NewsModal = dynamic(() => import("./NewsModal"), { ssr: false });

function isWithinDays(pubDate: string, maxDays: number): boolean {
  if (maxDays === 0 || !pubDate) return true;
  const cutoff = Date.now() - maxDays * 24 * 60 * 60 * 1000;
  return new Date(pubDate).getTime() >= cutoff;
}

// ── Type badges ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<TransferItem["type"], { label: string; color: string; bg: string; border: string; emoji: string }> = {
  arrival:   { label: "Arrivée",  color: "#22c55e", bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.3)",   emoji: "🟢" },
  departure: { label: "Départ",   color: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.3)",   emoji: "🔴" },
  rumor:     { label: "Rumeur",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)",  emoji: "🟡" },
  news:      { label: "Actu",     color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)", emoji: "⚪" },
};

const SOURCE_COLORS: Record<string, string> = {
  "Google News":  "#4285f4",
  "RMC Sport":    "#e11d48",
  "Footmercato":  "#f97316",
};

function TypeBadge({ type }: { type: TransferItem["type"] }) {
  const cfg = TYPE_CONFIG[type];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex-shrink-0"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const color = SOURCE_COLORS[source] ?? "#6b7c96";
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide flex-shrink-0"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {source}
    </span>
  );
}

function formatDate(raw: string): string {
  if (!raw) return "";
  try {
    const d = new Date(raw);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch { return ""; }
}

// Relative date helper for the Boursier rows ("il y a 3j", "il y a 2 sem").
// Falls back to absolute date when older than a year.
function formatRelativeDate(raw: string): string {
  if (!raw) return "";
  try {
    const d = new Date(raw);
    const ms = Date.now() - d.getTime();
    if (Number.isNaN(ms)) return "";
    const days = Math.floor(ms / (24 * 3600 * 1000));
    if (days < 0) {
      // Future-dated (rare but possible with cached data).
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    }
    if (days === 0)  return "aujourd'hui";
    if (days === 1)  return "hier";
    if (days < 7)    return `il y a ${days}j`;
    if (days < 31)   return `il y a ${Math.floor(days / 7)} sem`;
    if (days < 365)  return `il y a ${Math.floor(days / 30)} mois`;
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return ""; }
}

// Absolute "23 janv. 2026" — used as title attribute / fallback.
function formatAbsoluteDate(raw: string): string {
  if (!raw) return "";
  try {
    const d = new Date(raw);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return ""; }
}

// ── Single news item ───────────────────────────────────────────────────────────

function NewsItem({ item, onOpen }: { item: TransferItem; onOpen: (i: TransferItem) => void }) {
  return (
    <button type="button" onClick={() => onOpen(item)}
      className="group w-full text-left flex items-start gap-2.5 py-2.5 px-3 rounded-xl transition-all hover:brightness-125"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <TypeBadge type={item.type} />
      <p className="flex-1 text-xs leading-relaxed line-clamp-2" style={{ color: "#cbd5e1" }}>
        {item.title}
      </p>
      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-1">
        <SourceBadge source={item.source} />
        {item.pubDate && (
          <span className="text-[10px] font-semibold tabular-nums" style={{ color: "#94a3b8" }}
            title={formatAbsoluteDate(item.pubDate)}>
            {formatDate(item.pubDate)}
          </span>
        )}
        <ArrowSquareOut size={10} className="text-white/20 group-hover:text-white/50 transition-colors" />
      </div>
    </button>
  );
}

// ── Club row ───────────────────────────────────────────────────────────────────

function ClubRow({ club, onOpen }: { club: ClubTransfers; onOpen: (i: TransferItem) => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasNews = club.items.length > 0;

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{ border: "1px solid #1e2d42", background: "rgba(13,20,33,0.7)" }}>
      <button
        onClick={() => hasNews && setExpanded((e) => !e)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all hover:bg-white/[0.02]"
        style={{ cursor: hasNews ? "pointer" : "default" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={club.crest} alt={club.shortName} className="w-7 h-7 object-contain flex-shrink-0" loading="lazy" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-xs truncate" style={{ color: "#e8edf5" }}>{club.shortName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {club.arrivals > 0 && <span className="text-[9px] font-semibold" style={{ color: "#22c55e" }}>🟢{club.arrivals}</span>}
            {club.departures > 0 && <span className="text-[9px] font-semibold" style={{ color: "#ef4444" }}>🔴{club.departures}</span>}
            {club.rumors > 0 && <span className="text-[9px] font-semibold" style={{ color: "#f59e0b" }}>🟡{club.rumors}</span>}
            {!hasNews && <span className="text-[9px]" style={{ color: "#6b7c96" }}>—</span>}
          </div>
        </div>
        {hasNews && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: "rgba(0,212,255,0.1)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.2)" }}>
              {club.items.length}
            </span>
            <CaretDown size={11} style={{ color: "#6b7c96" }} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        )}
      </button>

      {expanded && hasNews && (
        <div className="px-3 pb-2.5 flex flex-col gap-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {club.items.map((item, i) => <NewsItem key={i} item={item} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  );
}

// ── Boursier (stock-market style top transfers) ──────────────────────────────

function formatEuro(v: number | null | undefined): string {
  if (!v || v <= 0) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)} M€`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)} k€`;
  return `${v} €`;
}

function PlayerAvatar({ id, name, color }: { id?: number; name?: string; color: string }) {
  const [err, setErr] = useState(false);
  const src = id ? `https://images.fotmob.com/image_resources/playerimages/${id}.png` : "";
  if (!src || err) {
    return (
      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}22`, border: `1px solid ${color}40` }}>
        <User size={20} style={{ color }} weight="duotone" />
      </div>
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={src} alt={name ?? ""}
      onError={() => setErr(true)}
      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
      style={{ background: "#0a0f1c", border: `1px solid ${color}40` }} />
  );
}

// Tiny club crest with name — reused on both sides of the arrow.
function ClubChip({ crest, name }: { crest?: string; name?: string }) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center gap-1 max-w-[120px]">
      {crest && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={crest} alt="" className="w-3.5 h-3.5 object-contain flex-shrink-0" loading="lazy" />
      )}
      <span className="text-[10px] font-semibold truncate" style={{ color: "#cbd5e1" }}>{name}</span>
    </span>
  );
}

function TopTransferRow({ item, onOpen }: { item: TransferItem; onOpen: (i: TransferItem) => void }) {
  const cfg = TYPE_CONFIG[item.type];
  const color = cfg.color;
  // "Trend" indicator — arrival = up (green), departure = down (red), rumor = sideways
  const Trend = item.type === "arrival" ? TrendUp
              : item.type === "departure" ? TrendDown
              : ChartLine;
  return (
    <button type="button" onClick={() => onOpen(item)}
      className="group w-full text-left rounded-xl p-3 transition-all hover:brightness-125"
      style={{
        background: `linear-gradient(90deg, ${color}10, rgba(13,20,33,0.7))`,
        border: `1px solid ${color}30`,
      }}>
      <div className="flex items-center gap-3">
        <PlayerAvatar id={item.playerId} name={item.player} color={color} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[13px] font-black truncate" style={{ color: "#e8edf5" }}>
              {item.player ?? item.title.split(" ").slice(0, 2).join(" ")}
            </p>
            {item.position && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>
                {item.position}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <ClubChip crest={item.fromClubCrest} name={item.fromClub} />
            <ArrowRight size={10} style={{ color: "#475569" }} />
            <ClubChip crest={item.toClubCrest} name={item.toClub} />
          </div>
          {item.pubDate && (
            <div className="flex items-center gap-1 mt-1"
              title={formatAbsoluteDate(item.pubDate)}>
              <Calendar size={10} weight="bold" style={{ color: "#00d4ff" }} />
              <span className="text-[10px] font-bold tabular-nums" style={{ color: "#00d4ff" }}>
                {formatAbsoluteDate(item.pubDate)}
              </span>
              <span className="text-[9px]" style={{ color: "#6b7c96" }}>
                · {formatRelativeDate(item.pubDate)}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <div className="flex items-center gap-1" style={{ color }}>
            <Trend size={13} weight="bold" />
            <span className="text-[13px] font-black tabular-nums">
              {formatEuro(item.marketValue)}
            </span>
          </div>
          <span className="text-[9px] font-semibold" style={{ color: "#6b7c96" }}>
            {item.fee && item.fee !== "—" ? item.fee : item.onLoan ? "Prêt" : item.contractExtension ? "Prolongation" : "Valeur"}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Market index chart (stock-ticker style) ──────────────────────────────────
// Plots daily aggregated transfer volume as an area chart, with the biggest
// individual transfers overlaid as dots (hover → player name + value).

function MarketChart({ transfers }: { transfers: BoardTransfer[] }) {
  const [hover, setHover] = useState<{ x: number; y: number; t: BoardTransfer } | null>(null);

  // Filter to valued transfers within the last 90 days.
  const now = Date.now();
  const WINDOW_DAYS = 90;
  const minTs = now - WINDOW_DAYS * 24 * 3600 * 1000;
  const valid = transfers
    .filter((t) => (t.marketValue ?? 0) > 0)
    .map((t) => ({ ...t, ts: new Date(t.transferDate).getTime() }))
    .filter((t) => !Number.isNaN(t.ts) && t.ts >= minTs && t.ts <= now)
    .sort((a, b) => a.ts - b.ts);

  if (valid.length < 2) return null;

  // Daily bins (ts → total value).
  const bins = new Map<number, number>();
  for (const t of valid) {
    const day = Math.floor(t.ts / (24 * 3600 * 1000)) * 24 * 3600 * 1000;
    bins.set(day, (bins.get(day) ?? 0) + (t.marketValue ?? 0));
  }
  const days = [...bins.keys()].sort((a, b) => a - b);
  if (days.length < 2) return null;

  const firstDay = days[0];
  const lastDay  = days[days.length - 1];
  const span     = Math.max(1, lastDay - firstDay);
  const maxV     = Math.max(...bins.values());

  // Chart geometry — relative coordinates, scaled by viewBox.
  const W = 600, H = 140, PAD_L = 8, PAD_R = 8, PAD_T = 8, PAD_B = 22;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const xOf = (ts: number) => PAD_L + ((ts - firstDay) / span) * innerW;
  const yOf = (v: number)  => PAD_T + innerH - (v / maxV) * innerH;

  // Path through daily bins (step-like — bourse vibe).
  const points = days.map((d) => ({ x: xOf(d), y: yOf(bins.get(d) ?? 0) }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1].x.toFixed(1)},${(PAD_T + innerH).toFixed(1)} L${points[0].x.toFixed(1)},${(PAD_T + innerH).toFixed(1)} Z`;

  // Big-dot overlays for the 8 largest individual transfers.
  const dots = [...valid]
    .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0))
    .slice(0, 8)
    .map((t) => ({ ...t, x: xOf(t.ts), y: yOf(Math.min(t.marketValue ?? 0, maxV)) }));

  // Headline metrics.
  const total      = valid.reduce((s, t) => s + (t.marketValue ?? 0), 0);
  const avg        = total / valid.length;
  const bigDay     = [...bins.entries()].sort((a, b) => b[1] - a[1])[0];
  const lastDate   = new Date(lastDay);
  const firstDate  = new Date(firstDay);

  // X-axis ticks: 4 evenly spaced.
  const ticks = Array.from({ length: 4 }, (_, i) => firstDay + (i * span) / 3);

  return (
    <div className="rounded-2xl p-3 mb-4 relative"
      style={{
        background: "linear-gradient(135deg, rgba(0,212,255,0.08), rgba(13,20,33,0.9))",
        border: "1px solid rgba(0,212,255,0.25)",
      }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <ChartLine size={14} weight="fill" style={{ color: "#00d4ff" }} />
            <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: "#00d4ff" }}>
              Indice mercato · 90 j
            </h3>
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: "#6b7c96" }}>
            {valid.length} mouvements · cours quotidien (Σ valeur marchande)
          </p>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-black leading-none tabular-nums" style={{ color: "#00d4ff" }}>
            {formatEuro(total)}
          </p>
          <p className="text-[9px] mt-1" style={{ color: "#6b7c96" }}>
            Moy. {formatEuro(avg)} · Pic {formatEuro(bigDay?.[1] ?? 0)}
          </p>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none"
          style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="mercatoArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#00d4ff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00d4ff" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Y grid */}
          {[0.25, 0.5, 0.75].map((r) => (
            <line key={r} x1={PAD_L} x2={W - PAD_R}
              y1={PAD_T + innerH * r} y2={PAD_T + innerH * r}
              stroke="rgba(255,255,255,0.04)" strokeDasharray="2 3" />
          ))}

          {/* Area + line */}
          <path d={area} fill="url(#mercatoArea)" />
          <path d={line} fill="none" stroke="#00d4ff" strokeWidth="1.5"
            strokeLinejoin="round" strokeLinecap="round" />

          {/* Big-transfer dots */}
          {dots.map((d) => (
            <g key={d.playerId}
              onMouseEnter={() => setHover({ x: d.x, y: d.y, t: d })}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}>
              <circle cx={d.x} cy={d.y} r="6" fill="#00d4ff" fillOpacity="0.15" />
              <circle cx={d.x} cy={d.y} r="3" fill="#fbbf24" stroke="#0a0f1c" strokeWidth="1.5" />
            </g>
          ))}

          {/* X ticks */}
          {ticks.map((ts, i) => {
            const d = new Date(ts);
            const lbl = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
            return (
              <text key={i} x={xOf(ts)} y={H - 6} textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}
                fill="#475569" fontSize="9" fontWeight="600">
                {lbl}
              </text>
            );
          })}
        </svg>

        {hover && (
          <div className="absolute pointer-events-none px-2 py-1.5 rounded-lg z-10"
            style={{
              left: `${(hover.x / W) * 100}%`,
              top: `${(hover.y / H) * 100}%`,
              transform: "translate(-50%, calc(-100% - 10px))",
              background: "rgba(13,20,33,0.95)",
              border: "1px solid rgba(0,212,255,0.4)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              minWidth: 130,
            }}>
            <p className="text-[10px] font-black" style={{ color: "#e8edf5" }}>{hover.t.name}</p>
            <p className="text-[9px]" style={{ color: "#94a3b8" }}>
              {hover.t.fromClub} → {hover.t.toClub}
            </p>
            <p className="text-[10px] font-black tabular-nums mt-0.5" style={{ color: "#00d4ff" }}>
              {formatEuro(hover.t.marketValue)} · {formatDate(hover.t.transferDate)}
            </p>
          </div>
        )}
      </div>

      <p className="text-[9px] mt-1 text-center" style={{ color: "#6b7c96" }}>
        Du {firstDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} au {lastDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} · Source FotMob
      </p>
    </div>
  );
}

// Convert a FotMob BoardTransfer into the shared TransferItem shape so the
// existing TopTransferRow / NewsModal pipeline can render it untouched.
function boardToItem(b: BoardTransfer): TransferItem {
  const verb = b.onLoan ? "en prêt à" : b.contractExtension ? "prolonge avec" : "rejoint";
  return {
    title: `${b.name} ${verb} ${b.toClub || b.fromClub}`,
    pubDate: b.transferDate,
    source: "FotMob",
    url: `https://www.fotmob.com/players/${b.playerId}`,
    type: b.contractExtension ? "news" : "arrival",
    player: b.name,
    playerId: b.playerId,
    playerImage: b.playerImage,
    position: b.position,
    fee: b.fee,
    marketValue: b.marketValue,
    fromClub: b.fromClub,
    fromClubId: b.fromClubId,
    fromClubCrest: b.fromClubCrest,
    toClub: b.toClub,
    toClubId: b.toClubId,
    toClubCrest: b.toClubCrest,
    onLoan: b.onLoan,
    contractExtension: b.contractExtension,
  };
}

function BoursierBoard({ transfers, onOpen, loading }: {
  transfers: BoardTransfer[];
  onOpen: (i: TransferItem) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl p-3 mb-4"
        style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.18)" }}>
        <div className="flex items-center gap-2 mb-2">
          <ChartLine size={14} weight="fill" style={{ color: "#00d4ff" }} />
          <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: "#00d4ff" }}>
            Bourse des transferts
          </h3>
        </div>
        <div className="space-y-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[70px] rounded-xl animate-pulse"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      </div>
    );
  }

  // Dedupe by playerId, sort by market value desc, take top 10.
  const seen = new Set<number>();
  const dedup = transfers.filter((t) => {
    if (seen.has(t.playerId)) return false;
    seen.add(t.playerId);
    return true;
  });
  const top = [...dedup]
    .filter((t) => (t.marketValue ?? 0) > 0)
    .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0))
    .slice(0, 10)
    .map(boardToItem);

  if (top.length === 0) {
    return (
      <div className="rounded-2xl p-4 mb-4 text-center"
        style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.18)" }}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <ChartLine size={14} weight="fill" style={{ color: "#00d4ff" }} />
          <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: "#00d4ff" }}>
            Bourse des transferts
          </h3>
        </div>
        <p className="text-[11px]" style={{ color: "#6b7c96" }}>
          Aucun transfert valorisé pour le moment (source FotMob).
        </p>
      </div>
    );
  }

  const totalValue = top.reduce((s, i) => s + (i.marketValue ?? 0), 0);
  const loans = top.filter((i) => i.onLoan).length;
  const extensions = top.filter((i) => i.contractExtension).length;

  return (
    <div className="rounded-2xl p-3 mb-4"
      style={{
        background: "linear-gradient(135deg, rgba(0,212,255,0.06), rgba(13,20,33,0.85))",
        border: "1px solid rgba(0,212,255,0.25)",
      }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ChartLine size={14} weight="fill" style={{ color: "#00d4ff" }} />
          <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: "#00d4ff" }}>
            Bourse des transferts · Top {top.length}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold tabular-nums">
          <span style={{ color: "#fbbf24" }}>Σ {formatEuro(totalValue)}</span>
          {loans > 0      && <span style={{ color: "#a78bfa" }}>↻ {loans} prêt{loans > 1 ? "s" : ""}</span>}
          {extensions > 0 && <span style={{ color: "#94a3b8" }}>★ {extensions} prol.</span>}
        </div>
      </div>
      <div className="space-y-1.5">
        {top.map((item, i) => (
          <TopTransferRow key={`${item.playerId ?? item.title}-${i}`} item={item} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

// ── Stats bar ──────────────────────────────────────────────────────────────────

function StatsBar({ clubs }: { clubs: ClubTransfers[] }) {
  const totalArrivals = clubs.reduce((s, c) => s + c.arrivals, 0);
  const totalDepartures = clubs.reduce((s, c) => s + c.departures, 0);
  const totalRumors = clubs.reduce((s, c) => s + c.rumors, 0);
  const totalNews = clubs.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {[
        { label: "Articles", value: totalNews,       color: "#00d4ff", icon: <Newspaper size={14} /> },
        { label: "Arrivées", value: totalArrivals,   color: "#22c55e", icon: <TrendUp size={14} /> },
        { label: "Départs",  value: totalDepartures, color: "#ef4444", icon: <TrendDown size={14} /> },
        { label: "Rumeurs",  value: totalRumors,     color: "#f59e0b", icon: <span className="text-sm">🟡</span> },
      ].map((s) => (
        <div key={s.label} className="rounded-lg p-2 text-center"
          style={{ background: "rgba(13,20,33,0.7)", border: "1px solid #1e2d42" }}>
          <div className="flex items-center justify-center gap-1 mb-1" style={{ color: s.color }}>{s.icon}</div>
          <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "#6b7c96" }}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Filter bar ─────────────────────────────────────────────────────────────────

type Filter = "all" | "arrival" | "departure" | "rumor";

function FilterBar({ active, onChange }: { active: Filter; onChange: (f: Filter) => void }) {
  const filters: { id: Filter; label: string; color: string }[] = [
    { id: "all",       label: "Tout",       color: "#e8edf5" },
    { id: "arrival",   label: "🟢 Arrivées",  color: "#22c55e" },
    { id: "departure", label: "🔴 Départs",   color: "#ef4444" },
    { id: "rumor",     label: "🟡 Rumeurs",   color: "#f59e0b" },
  ];
  return (
    <div className="flex gap-2 mb-5 flex-wrap">
      {filters.map((f) => (
        <button key={f.id} onClick={() => onChange(f.id)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            color: active === f.id ? f.color : "#6b7c96",
            background: active === f.id ? `${f.color}18` : "rgba(255,255,255,0.03)",
            border: active === f.id ? `1px solid ${f.color}40` : "1px solid rgba(255,255,255,0.06)",
          }}>
          {f.label}
        </button>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type League = "FL1" | "FL2";

export default function TransfersTab({
  league: leagueProp,
  defaultLeague = "FL1",
  showLeagueTabs = true,
}: {
  /** Legacy: lock the component to a single league (still used by /club/[id]). */
  league?: League;
  /** Default selected league when the user lands on the dashboard. */
  defaultLeague?: League;
  /** Hide the L1/L2 switcher when the component is embedded in a single-league view. */
  showLeagueTabs?: boolean;
} = {}) {
  const locked = leagueProp != null;
  const [league, setLeague] = useState<League>(leagueProp ?? defaultLeague);
  const [data, setData] = useState<{ clubs: ClubTransfers[]; updatedAt: string; sources: string[]; error?: string } | null>(null);
  const [board, setBoard] = useState<BoardTransfer[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [config] = useConfig();
  const [selected, setSelected] = useState<TransferItem | null>(null);

  // Keep state in sync if the parent forces a league (legacy prop).
  useEffect(() => {
    if (leagueProp != null) setLeague(leagueProp);
  }, [leagueProp]);

  const load = async (manual = false) => {
    if (manual) setRefreshing(true);
    setLoading(true);
    setBoardLoading(true);
    try {
      const qs = new URLSearchParams({ league });
      if (manual) qs.set("t", String(Date.now()));

      // News pipeline + Boursier board fetched independently so the board
      // shows up even if /api/transfers is slow (RSS fan-out can be heavy).
      const newsP = fetch("/api/transfers?" + qs.toString())
        .then(r => r.ok ? r.json() : Promise.reject(new Error("Erreur de chargement")))
        .then(json => { setData(json); setError(json.error ?? null); })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erreur inconnue"))
        .finally(() => setLoading(false));

      const boardP = fetch("/api/mercato-board?" + qs.toString())
        .then(r => r.ok ? r.json() : { transfers: [] })
        .then(json => setBoard(Array.isArray(json.transfers) ? json.transfers : []))
        .catch(() => setBoard([]))
        .finally(() => setBoardLoading(false));

      await Promise.all([newsP, boardP]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [league]);

  // Filter clubs: age filter first, then type filter
  const filteredClubs = data?.clubs.map((club) => {
    const ageFiltered = club.items.filter((i) => isWithinDays(i.pubDate, config.transfersMaxAgeDays));
    if (filter === "all") {
      return {
        ...club,
        items: ageFiltered,
        arrivals: ageFiltered.filter((i) => i.type === "arrival").length,
        departures: ageFiltered.filter((i) => i.type === "departure").length,
        rumors: ageFiltered.filter((i) => i.type === "rumor").length,
      };
    }
    const filtered = ageFiltered.filter((i) => i.type === filter);
    return {
      ...club,
      items: filtered,
      arrivals: filtered.filter((i) => i.type === "arrival").length,
      departures: filtered.filter((i) => i.type === "departure").length,
      rumors: filtered.filter((i) => i.type === "rumor").length,
    };
  }).filter((c) => c.items.length > 0 || filter === "all") ?? [];

  const formatUpdated = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  return (
    <div>
      {/* L1/L2 internal switcher */}
      {showLeagueTabs && !locked && (
        <div className="flex gap-1 mb-3 p-1 rounded-xl"
          style={{ background: "#0a0f1c", border: "1px solid #1a2235" }}>
          {([
            { id: "FL1" as League, label: "Ligue 1" },
            { id: "FL2" as League, label: "Ligue 2" },
          ]).map((opt) => {
            const active = league === opt.id;
            return (
              <button key={opt.id} onClick={() => setLeague(opt.id)}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: active ? "rgba(0,212,255,0.12)" : "transparent",
                  color: active ? "#00d4ff" : "#64748b",
                  border: active ? "1px solid rgba(0,212,255,0.3)" : "1px solid transparent",
                }}>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold" style={{ color: "#e8edf5" }}>Mercato {league === "FL2" ? "Ligue 2" : "Ligue 1"}</h2>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
            {data ? (
              <>Sources : {data.sources.join(", ")}{data.updatedAt && <> · Mis à jour à {formatUpdated(data.updatedAt)}</>}</>
            ) : (
              <>Chargement…</>
            )}
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
          style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff" }}>
          <ArrowsClockwise size={12} className={refreshing ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      {/* Market index — daily volume area chart with top-transfer dots */}
      {!boardLoading && board.length > 0 && <MarketChart transfers={board} />}

      {/* Bourse — top transfers by market value (FotMob) */}
      <BoursierBoard transfers={board} onOpen={setSelected} loading={boardLoading} />

      {data && <StatsBar clubs={data.clubs} />}

      <FilterBar active={filter} onChange={setFilter} />

      <div className="space-y-3">
        {loading && !data ? (
          <div className="py-3">
            <LoadingBar color="#00d4ff" caption="Chargement des actualités" />
          </div>
        ) : error && !data ? (
          <div className="rounded-2xl p-6 text-center"
            style={{ border: "1px solid #ef444430", background: "rgba(239,68,68,0.05)" }}>
            <p className="text-red-400 font-semibold mb-2 text-sm">Impossible de charger les transferts</p>
            <p className="text-xs mb-3" style={{ color: "#6b7c96" }}>{error}</p>
            <button onClick={() => load(true)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-all"
              style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff" }}>
              Réessayer
            </button>
          </div>
        ) : (
          <>
            {filteredClubs.map((club) => (
              <ClubRow key={club.teamId} club={club} onOpen={setSelected} />
            ))}
            {filteredClubs.length === 0 && (
              <div className="rounded-2xl py-10 text-center" style={{ border: "1px solid #1e2d42" }}>
                <p className="text-sm" style={{ color: "#6b7c96" }}>Aucun article trouvé pour ce filtre.</p>
              </div>
            )}
          </>
        )}
      </div>

      <p className="mt-6 text-center text-[10px]" style={{ color: "#6b7c96" }}>
        Données agrégées depuis Google News, RMC Sport et Footmercato. Rafraîchissement toutes les 30 min.
        {config.transfersMaxAgeDays > 0 && <> · Articles des {config.transfersMaxAgeDays} derniers jours</>}
      </p>

      {selected && (
        <NewsModal
          title={selected.title}
          url={selected.url}
          pubDate={selected.pubDate}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
