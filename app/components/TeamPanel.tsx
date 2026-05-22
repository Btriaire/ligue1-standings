"use client";

import { useEffect, useState } from "react";
import { CaretRight, Clock } from "@phosphor-icons/react";
import Link from "next/link";
import Tooltip from "./Tooltip";
import type { Standing, Match } from "@/app/lib/types";
import { fmtWeekdayDayMonth as fmtShortDate, fmtTime } from "@/app/lib/format";

interface TeamData {
  recent: Match[];
  upcoming: Match[];
}

interface Props {
  standing: Standing;
  zoneColor: string;
}

const RESULT_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  W: { label: "V", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  D: { label: "N", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  L: { label: "D", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

export default function TeamPanel({ standing, zoneColor }: Props) {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/team/${standing.team.id}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [standing.team.id]);

  const ptsPerGame = standing.playedGames > 0
    ? (standing.points / standing.playedGames).toFixed(2)
    : "—";
  const winPct = standing.playedGames > 0
    ? Math.round((standing.won / standing.playedGames) * 100)
    : 0;

  const formResults = standing.form?.split(",").filter(Boolean).slice(-5) ?? [];

  const nextMatch = data?.upcoming?.[0] ?? null;
  const lastMatch = data?.recent?.[0] ?? null;

  return (
    <div
      className="px-4 py-3 space-y-3"
      style={{ background: "rgba(59,130,246,0.04)" }}
    >
      {/* ── Stat pills ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {/* W/D/L */}
        <div className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-mono"
          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <Tooltip term="V" style={{ color: "#22c55e" }} className="font-black">{standing.won}V</Tooltip>
          <span style={{ color: "#6b7c96" }}>·</span>
          <Tooltip term="N" style={{ color: "#f59e0b" }} className="font-black">{standing.draw}N</Tooltip>
          <span style={{ color: "#6b7c96" }}>·</span>
          <Tooltip term="D" style={{ color: "#ef4444" }} className="font-black">{standing.lost}D</Tooltip>
        </div>

        {/* Goals */}
        <div className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-mono"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Tooltip term="BP" style={{ color: "#22c55e" }}>{standing.goalsFor} BP</Tooltip>
          <span style={{ color: "#6b7c96" }}>·</span>
          <Tooltip term="BC" style={{ color: "#ef4444" }}>{standing.goalsAgainst} BC</Tooltip>
        </div>

        {/* GD */}
        <Tooltip term="DB"
          className="flex items-center rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
          style={{
            background: standing.goalDifference >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${standing.goalDifference >= 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
            color: standing.goalDifference > 0 ? "#22c55e" : standing.goalDifference < 0 ? "#ef4444" : "#6b7c96",
          }}>
          DB {standing.goalDifference > 0 ? "+" : ""}{standing.goalDifference}
        </Tooltip>

        {/* Pts/match */}
        <div className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-mono"
          style={{ background: `${zoneColor}10`, border: `1px solid ${zoneColor}25` }}>
          <span style={{ color: zoneColor }} className="font-bold">{ptsPerGame}</span>
          <Tooltip term="Pts" style={{ color: "#6b7c96" }}>pts/match</Tooltip>
        </div>

        {/* Win % */}
        <div className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-mono"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Tooltip term="V" style={{ color: "#94a3b8" }}>{winPct}% V</Tooltip>
        </div>
      </div>

      {/* ── Form + matches ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Form badges */}
        {formResults.length > 0 && (
          <div className="flex items-center gap-1">
            <Tooltip term="Forme" className="text-[9px] uppercase tracking-widest mr-1" style={{ color: "#475569" }} />
            {formResults.map((r, i) => {
              const s = RESULT_STYLE[r];
              return s ? (
                <span key={i}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black"
                  style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}>
                  {s.label}
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* Last match score */}
        {lastMatch && (() => {
          const isHome = lastMatch.homeTeam.id === standing.team.id;
          const myScore = isHome ? lastMatch.score.home : lastMatch.score.away;
          const oppScore = isHome ? lastMatch.score.away : lastMatch.score.home;
          const opp = isHome ? lastMatch.awayTeam : lastMatch.homeTeam;
          const won = myScore !== null && oppScore !== null && myScore > oppScore;
          const lost = myScore !== null && oppScore !== null && myScore < oppScore;
          const color = won ? "#22c55e" : lost ? "#ef4444" : "#f59e0b";
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <span style={{ color: "#475569" }} className="text-[9px] uppercase tracking-widest">Dernier</span>
              {opp.crest && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={opp.crest} alt="" className="w-4 h-4 object-contain" />
              )}
              <span style={{ color: "#94a3b8" }} className="font-medium truncate max-w-[80px]">
                {opp.shortName ?? opp.name.split(" ").slice(-1)[0]}
              </span>
              <span className="font-black font-mono text-xs" style={{ color }}>
                {myScore ?? "–"}–{oppScore ?? "–"}
              </span>
            </div>
          );
        })()}

        {/* Next match */}
        {loading ? (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#475569" }}>
            <Clock size={10} className="animate-pulse" /> Chargement…
          </div>
        ) : nextMatch ? (() => {
          const isHome = nextMatch.homeTeam.id === standing.team.id;
          const opp = isHome ? nextMatch.awayTeam : nextMatch.homeTeam;
          return (
            <div className="flex items-center gap-1.5 text-xs">
              <span style={{ color: "#475569" }} className="text-[9px] uppercase tracking-widest">Prochain</span>
              {opp.crest && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={opp.crest} alt="" className="w-4 h-4 object-contain" />
              )}
              <span style={{ color: "#94a3b8" }} className="font-medium truncate max-w-[80px]">
                {opp.shortName ?? opp.name.split(" ").slice(-1)[0]}
              </span>
              <span style={{ color: "#00d4ff" }} className="font-semibold">
                {fmtShortDate(nextMatch.date)} {fmtTime(nextMatch.date)}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded"
                style={{ background: isHome ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.05)", color: isHome ? "#00d4ff" : "#6b7c96" }}>
                {isHome ? "Dom." : "Ext."}
              </span>
            </div>
          );
        })() : null}

        {/* Club page link */}
        <Link
          href={`/club/${standing.team.id}`}
          className="ml-auto flex items-center gap-1 text-xs font-semibold hover:opacity-80 transition-opacity"
          style={{ color: zoneColor }}
          onClick={e => e.stopPropagation()}
        >
          Fiche complète <CaretRight size={11} />
        </Link>
      </div>
    </div>
  );
}
