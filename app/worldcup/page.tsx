import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import WorldCupTab from "@/app/components/WorldCupTab";

export const metadata: Metadata = {
  title: "Coupe du Monde 2026 — FootPredictom",
  description: "Tout sur la FIFA World Cup 2026 : calendrier, stades, format, équipes favorites.",
};

export default function WorldCupPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#060c16" }}>
      {/* Top bar */}
      <div style={{ borderBottom: "1px solid #1e2d42", background: "#0a0f1c" }}>
        <div className="max-w-[860px] mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ color: "#64748b" }}>
            <ChevronLeft size={13} />
            Ligue 1
          </Link>
          <div className="h-4 w-px" style={{ background: "#1e2d42" }} />
          <div className="flex items-center gap-2">
            <span className="text-lg">🌍</span>
            <span className="text-sm font-black tracking-tight" style={{ color: "#e8edf5" }}>
              Coupe du Monde 2026
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.25)" }}>
              FIFA
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[860px] mx-auto px-4 py-6">
        <WorldCupTab />
      </div>
    </div>
  );
}
