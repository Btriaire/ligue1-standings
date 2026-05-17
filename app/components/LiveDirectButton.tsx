"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

interface LiveMatch {
  id: number;
  date: string;
  status: string;
  statusLabel: string;
  isLive: boolean;
  homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  score: { home: number; away: number };
}

// "Le Direct" button + modal. Polls /api/live every 10s while open,
// every 30s while closed (just to keep the badge accurate without
// hammering ESPN). Badge clignote rouge dès qu'un match est live.

const POLL_OPEN_MS   = 10_000;
const POLL_CLOSED_MS = 30_000;

export default function LiveDirectButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/live", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json() as { matches: LiveMatch[]; liveCount: number; fetchedAt: string };
      setMatches(j.matches ?? []);
      setLiveCount(j.liveCount ?? 0);
      setFetchedAt(j.fetchedAt ?? null);
    } catch { /* swallow */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const ms = open ? POLL_OPEN_MS : POLL_CLOSED_MS;
    const t = setInterval(load, ms);
    return () => clearInterval(t);
  }, [open, load]);

  // ESC closes the modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const hasLive = liveCount > 0;
  const todaysMatches = matches.filter(m => {
    const d = new Date(m.date);
    const now = new Date();
    return d.toDateString() === now.toDateString() || m.isLive;
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90 active:scale-95"
        style={{
          background: hasLive ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${hasLive ? "rgba(239,68,68,0.35)" : "#1e2d42"}`,
          color: hasLive ? "#ef4444" : "#94a3b8",
        }}
        title={hasLive ? `${liveCount} match${liveCount > 1 ? "s" : ""} en direct` : "Pas de match en direct"}
      >
        <span className="relative inline-flex items-center justify-center" style={{ width: 8, height: 8 }}>
          <span className="absolute inset-0 rounded-full"
            style={{ background: hasLive ? "#ef4444" : "#475569" }}/>
          {hasLive && (
            <span className="absolute inset-0 rounded-full live-blink"
              style={{ background: "#ef4444", boxShadow: "0 0 8px #ef4444" }}/>
          )}
        </span>
        <span>Le Direct</span>
        {hasLive && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black"
            style={{ background: "#ef4444", color: "#fff" }}>
            {liveCount}
          </span>
        )}
      </button>

      <style jsx global>{`
        @keyframes live-blink-kf {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.3; transform: scale(1.7); }
        }
        .live-blink {
          animation: live-blink-kf 1s ease-in-out infinite;
        }
      `}</style>

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl overflow-hidden mt-8 sm:mt-16"
            style={{ background: "#0d1421", border: "1px solid #1e2d42", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1e2d42", background: "#0a0f1c" }}>
              <div className="flex items-center gap-2.5">
                <span className="relative inline-flex items-center justify-center" style={{ width: 10, height: 10 }}>
                  <span className="absolute inset-0 rounded-full"
                    style={{ background: hasLive ? "#ef4444" : "#475569" }}/>
                  {hasLive && (
                    <span className="absolute inset-0 rounded-full live-blink"
                      style={{ background: "#ef4444", boxShadow: "0 0 10px #ef4444" }}/>
                  )}
                </span>
                <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: "#e8edf5" }}>Le Direct · Ligue 1</h2>
                {hasLive && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                    style={{ background: "#ef4444", color: "#fff" }}>
                    {liveCount} en direct
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {fetchedAt && (
                  <span className="hidden sm:inline text-[10px]" style={{ color: "#64748b" }}>
                    MAJ {new Date(fetchedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                )}
                <button onClick={() => setOpen(false)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid #1e2d42", color: "#94a3b8" }}>
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-2.5 max-h-[70vh] overflow-y-auto">
              {loading && matches.length === 0 && (
                <>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#0a0f1c" }}/>
                  ))}
                </>
              )}

              {!loading && todaysMatches.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-sm" style={{ color: "#64748b" }}>Aucun match aujourd&apos;hui.</p>
                  <p className="text-xs mt-1" style={{ color: "#475569" }}>Le badge clignotera dès qu&apos;un match commence.</p>
                </div>
              )}

              {todaysMatches.map(m => {
                const isFt = m.status === "STATUS_FULL_TIME" || m.status === "STATUS_FINAL";
                const isUpcoming = !m.isLive && !isFt;
                const kickoff = new Date(m.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={m.id}
                    className="rounded-xl p-3 flex items-center gap-3"
                    style={{
                      background: m.isLive ? "rgba(239,68,68,0.05)" : "#0a0f1c",
                      border: `1px solid ${m.isLive ? "rgba(239,68,68,0.25)" : "#1e2d42"}`,
                    }}
                  >
                    {/* Status badge */}
                    <div className="flex-shrink-0 w-14 text-center">
                      {m.isLive ? (
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                            style={{ background: "#ef4444", color: "#fff" }}>LIVE</span>
                          <span className="text-[11px] font-bold" style={{ color: "#ef4444" }}>{m.statusLabel}</span>
                        </div>
                      ) : isFt ? (
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#64748b" }}>FT</span>
                      ) : (
                        <span className="text-[11px] font-bold" style={{ color: "#94a3b8" }}>{kickoff}</span>
                      )}
                    </div>

                    {/* Home */}
                    <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                      <span className="text-xs font-semibold truncate" style={{ color: "#e8edf5" }}>{m.homeTeam.shortName}</span>
                      {m.homeTeam.crest && (
                        <Image src={m.homeTeam.crest} alt={m.homeTeam.shortName} width={22} height={22} unoptimized
                          className="flex-shrink-0"/>
                      )}
                    </div>

                    {/* Score */}
                    <div className="flex-shrink-0 px-3 py-1 rounded-lg min-w-[64px] text-center"
                      style={{
                        background: m.isLive ? "rgba(239,68,68,0.12)" : "#0d1421",
                        border: `1px solid ${m.isLive ? "rgba(239,68,68,0.35)" : "#1e2d42"}`,
                      }}>
                      <span className="text-base font-black tabular-nums"
                        style={{ color: isUpcoming ? "#475569" : "#e8edf5" }}>
                        {isUpcoming ? "—" : `${m.score.home} - ${m.score.away}`}
                      </span>
                    </div>

                    {/* Away */}
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      {m.awayTeam.crest && (
                        <Image src={m.awayTeam.crest} alt={m.awayTeam.shortName} width={22} height={22} unoptimized
                          className="flex-shrink-0"/>
                      )}
                      <span className="text-xs font-semibold truncate" style={{ color: "#e8edf5" }}>{m.awayTeam.shortName}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t text-center" style={{ borderColor: "#1e2d42", background: "#0a0f1c" }}>
              <span className="text-[10px]" style={{ color: "#475569" }}>
                Actualisation auto toutes les 10s · ESC pour fermer
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
