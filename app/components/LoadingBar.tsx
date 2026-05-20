"use client";

// Unified loading indicator used across the site (FanX, Fiche complète,
// Clubs, Mercato, etc.). Renders a slim glowing progress bar:
//
//   • indeterminate mode (default) — a 40%-wide gradient slides
//     left→right continuously. Use when there's no progress signal.
//   • determinate mode — when `value` and `total` are passed, the bar
//     fills proportionally and a tabular X/Y counter is shown.
//
// Props
//   color    — accent color (defaults to FanX cyan)
//   caption  — short uppercase label rendered to the left of the bar
//   value    — current progress count (enables determinate mode)
//   total    — target progress count
//   compact  — drop the caption + outer padding for an inline variant

import { useId } from "react";

interface LoadingBarProps {
  color?: string;
  caption?: string;
  value?: number;
  total?: number;
  compact?: boolean;
}

export default function LoadingBar({
  color = "#1da1f2",
  caption = "Chargement",
  value,
  total,
  compact = false,
}: LoadingBarProps) {
  const animId = useId().replace(/:/g, "");
  const determinate = typeof value === "number" && typeof total === "number" && total > 0;
  const pct = determinate ? Math.min(100, Math.max(0, ((value as number) / (total as number)) * 100)) : 0;

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "px-1 py-1"}`}>
      {!compact && caption && (
        <span className="text-[9px] font-bold uppercase tracking-wider flex-shrink-0" style={{ color: "#94a3b8" }}>
          {caption}
        </span>
      )}
      <div className="flex-1 h-[3px] rounded-full overflow-hidden relative"
        style={{ background: `${color}18` }}>
        {determinate ? (
          <div className="h-full transition-all duration-300 ease-out rounded-full"
            style={{
              width: `${pct}%`,
              background: color,
              boxShadow: `0 0 6px ${color}aa`,
            }}/>
        ) : (
          <div className="absolute inset-y-0 rounded-full"
            style={{
              width: "40%",
              background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
              boxShadow: `0 0 6px ${color}aa`,
              animation: `lb_slide_${animId} 1.3s ease-in-out infinite`,
            }}/>
        )}
      </div>
      {determinate && (
        <span className="text-[9px] font-mono tabular-nums flex-shrink-0" style={{ color }}>
          {value}/{total}
        </span>
      )}
      {!determinate && !compact && (
        <span className="text-[9px] font-mono flex-shrink-0" style={{ color }}>…</span>
      )}
      <style jsx>{`
        @keyframes lb_slide_${animId} {
          0%   { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
