"use client";

import { useState, useEffect, useCallback } from "react";

export default function FunFact({ section = "general" }: { section?: string }) {
  const [fact, setFact] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [flipping, setFlipping] = useState(false);

  const fetchFact = useCallback(async (animate = false) => {
    if (animate) { setFlipping(true); await new Promise(r => setTimeout(r, 200)); }
    setLoading(true);
    try {
      const res = await fetch(`/api/fun-fact?s=${section}&_=${Date.now()}`);
      const data = await res.json() as { fact: string };
      setFact(data.fact);
    } catch {
      setFact("L'OM est le seul club français à avoir remporté la Ligue des Champions (1993).");
    } finally {
      setLoading(false);
      setFlipping(false);
    }
  }, [section]);

  useEffect(() => { fetchFact(); }, [fetchFact]);

  return (
    <button
      onClick={() => fetchFact(true)}
      title="Cliquer pour une nouvelle anecdote"
      className="w-full text-left hover:opacity-80 transition-all duration-200 group"
      style={{ opacity: flipping ? 0 : 1, transition: "opacity 0.2s" }}
    >
      <div className="flex items-start gap-2 px-3 py-2 rounded-xl"
        style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)" }}>
        <span className="flex-shrink-0 mt-0.5 text-sm">💡</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: "#fbbf24" }}>
              Le saviez-vous ?
            </p>
            <span className="text-[8px] ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "#4b5d73" }}>
              ↻ nouvelle anecdote
            </span>
          </div>
          <p className="text-[10px] leading-relaxed"
            style={{ color: loading ? "#334155" : "#94a3b8" }}>
            {loading ? "Chargement…" : fact}
          </p>
        </div>
      </div>
    </button>
  );
}
