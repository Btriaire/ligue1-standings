"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ExternalLink, TrendingUp, TrendingDown, Newspaper } from "lucide-react";
import type { ClubTransfers, TransferItem } from "@/app/api/transfers/route";
import { useConfig } from "@/app/lib/config";

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

// ── Single news item ───────────────────────────────────────────────────────────

function NewsItem({ item }: { item: TransferItem }) {
  return (
    <a href={item.url || "#"} target="_blank" rel="noopener noreferrer"
      className="group flex items-start gap-2.5 py-2.5 px-3 rounded-xl transition-all hover:brightness-125"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <TypeBadge type={item.type} />
      <p className="flex-1 text-xs leading-relaxed line-clamp-2" style={{ color: "#cbd5e1" }}>
        {item.title}
      </p>
      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-1">
        <SourceBadge source={item.source} />
        {item.pubDate && (
          <span className="text-[9px]" style={{ color: "#6b7c96" }}>{formatDate(item.pubDate)}</span>
        )}
        <ExternalLink size={10} className="text-white/20 group-hover:text-white/50 transition-colors" />
      </div>
    </a>
  );
}

// ── Club row ───────────────────────────────────────────────────────────────────

function ClubRow({ club }: { club: ClubTransfers }) {
  const [expanded, setExpanded] = useState(false);
  const hasNews = club.items.length > 0;
  const preview = club.items.slice(0, 2);
  const rest = club.items.slice(2);

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ border: "1px solid #1e2d42", background: "rgba(13,20,33,0.7)" }}>
      {/* Club header */}
      <button
        onClick={() => hasNews && setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/[0.02]"
        style={{ cursor: hasNews ? "pointer" : "default" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={club.crest} alt={club.shortName} className="w-9 h-9 object-contain flex-shrink-0" loading="lazy" />

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: "#e8edf5" }}>{club.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {club.arrivals > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "#22c55e" }}>
                <TrendingUp size={10} />{club.arrivals} arrivée{club.arrivals > 1 ? "s" : ""}
              </span>
            )}
            {club.departures > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "#ef4444" }}>
                <TrendingDown size={10} />{club.departures} départ{club.departures > 1 ? "s" : ""}
              </span>
            )}
            {club.rumors > 0 && (
              <span className="text-[10px] font-semibold" style={{ color: "#f59e0b" }}>
                🟡 {club.rumors} rumeur{club.rumors > 1 ? "s" : ""}
              </span>
            )}
            {!hasNews && (
              <span className="text-[10px]" style={{ color: "#6b7c96" }}>Aucune info disponible</span>
            )}
          </div>
        </div>

        {/* Total badge */}
        {hasNews && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
              style={{ background: "rgba(0,212,255,0.1)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.2)" }}>
              {club.items.length} news
            </span>
            <span className="text-white/30 text-xs">{expanded ? "▲" : "▼"}</span>
          </div>
        )}
      </button>

      {/* Preview items (always shown if has news) */}
      {hasNews && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          {preview.map((item, i) => <NewsItem key={i} item={item} />)}

          {/* Expandable rest */}
          {rest.length > 0 && (
            <>
              {expanded && rest.map((item, i) => <NewsItem key={`rest-${i}`} item={item} />)}
              <button
                onClick={() => setExpanded((e) => !e)}
                className="text-xs font-semibold py-1.5 px-3 rounded-lg transition-all hover:opacity-80 w-full text-center mt-1"
                style={{ color: "#6b7c96", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {expanded ? "▲ Réduire" : `▼ +${rest.length} articles supplémentaires`}
              </button>
            </>
          )}
        </div>
      )}
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
    <div className="grid grid-cols-4 gap-3 mb-6">
      {[
        { label: "Articles", value: totalNews,       color: "#00d4ff", icon: <Newspaper size={14} /> },
        { label: "Arrivées", value: totalArrivals,   color: "#22c55e", icon: <TrendingUp size={14} /> },
        { label: "Départs",  value: totalDepartures, color: "#ef4444", icon: <TrendingDown size={14} /> },
        { label: "Rumeurs",  value: totalRumors,     color: "#f59e0b", icon: <span className="text-sm">🟡</span> },
      ].map((s) => (
        <div key={s.label} className="rounded-xl p-3 text-center"
          style={{ background: "rgba(13,20,33,0.7)", border: "1px solid #1e2d42" }}>
          <div className="flex items-center justify-center gap-1 mb-1" style={{ color: s.color }}>{s.icon}</div>
          <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
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

export default function TransfersTab() {
  const [data, setData] = useState<{ clubs: ClubTransfers[]; updatedAt: string; sources: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [config] = useConfig();

  const load = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/transfers" + (manual ? "?t=" + Date.now() : ""));
      if (!res.ok) throw new Error("Erreur de chargement");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

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

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl px-4 py-4 animate-pulse"
            style={{ background: "rgba(13,20,33,0.7)", border: "1px solid #1e2d42", height: 72 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ border: "1px solid #ef444430", background: "rgba(239,68,68,0.05)" }}>
        <p className="text-red-400 font-semibold mb-3">Impossible de charger les transferts</p>
        <p className="text-sm mb-4" style={{ color: "#6b7c96" }}>{error}</p>
        <button onClick={() => load(true)} className="px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-80 transition-all"
          style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff" }}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-black" style={{ color: "#e8edf5" }}>Mercato Ligue 1</h2>
          <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
            Sources : {data?.sources.join(", ")}
            {data?.updatedAt && <> · Mis à jour à {formatUpdated(data.updatedAt)}</>}
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
          style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff" }}>
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      {data && <StatsBar clubs={data.clubs} />}

      <FilterBar active={filter} onChange={setFilter} />

      <div className="space-y-3">
        {filteredClubs.map((club) => (
          <ClubRow key={club.teamId} club={club} />
        ))}
        {filteredClubs.length === 0 && (
          <div className="rounded-2xl py-10 text-center" style={{ border: "1px solid #1e2d42" }}>
            <p className="text-sm" style={{ color: "#6b7c96" }}>Aucun article trouvé pour ce filtre.</p>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-[10px]" style={{ color: "#6b7c96" }}>
        Données agrégées depuis Google News, RMC Sport et Footmercato. Rafraîchissement toutes les 30 min.
        {config.transfersMaxAgeDays > 0 && <> · Articles des {config.transfersMaxAgeDays} derniers jours</>}
      </p>
    </div>
  );
}
