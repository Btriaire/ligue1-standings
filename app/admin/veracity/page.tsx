"use client";

// Admin: club data veracity dashboard.
// Fetches /api/club-veracity and surfaces every leadership field that drifted
// from the current FR Wikipedia infobox. Read-only — fixes still need a code
// edit in CLUB_PROFILES_L1/L2, but this tells you exactly what to change.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowsClockwise, CheckCircle, XCircle, Warning } from "@phosphor-icons/react";

interface FieldCheck {
  field: string;
  expected: string | null;
  actual: string | null;
  match: boolean;
}
interface Report {
  id: number;
  name: string;
  league: "L1" | "L2";
  wikiTitle: string;
  ok: boolean;
  checks: FieldCheck[];
  error?: string;
}
interface Payload {
  total: number;
  mismatched: number;
  reports: Report[];
  checkedAt: string;
}

export default function VeracityPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (force = false) => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/club-veracity" + (force ? `?_=${Date.now()}` : ""), {
        cache: force ? "no-store" : "default",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { run(false); }, []);

  const mismatched = data?.reports.filter(r => !r.ok) ?? [];
  const ok = data?.reports.filter(r => r.ok) ?? [];

  return (
    <main className="min-h-screen pb-16" style={{ background: "#0b0f12", color: "#e8edf5" }}>
      <header className="sticky top-0 z-20 backdrop-blur"
        style={{ background: "rgba(11,15,18,0.85)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/admin" className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <ArrowLeft size={14} />
          </Link>
          <h1 className="font-black text-sm">Véracité des profils clubs</h1>
          <button onClick={() => run(true)} disabled={loading}
            className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
            style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.22)", color: "#00d4ff" }}>
            <ArrowsClockwise size={12} className={loading ? "animate-spin" : ""} />
            {loading ? "Vérification…" : "Re-vérifier"}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-4">
        <p className="text-xs mb-3" style={{ color: "#6b7c96" }}>
          Compare l&apos;infobox FR Wikipedia (section 0) aux champs <code>entraineur</code>,
          <code> president</code>, <code>stade</code>, <code>capitaine</code> de chaque profil.
          Cron hebdo : lundi 07h UTC (<code>/api/cron/check-veracity</code>).
        </p>

        {error && (
          <div className="text-xs px-3 py-2 rounded mb-3"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
            Erreur : {error}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Stat label="Vérifiés"   value={data.total}      color="#9aa7ba" />
              <Stat label="OK"         value={ok.length}       color="#22c55e" />
              <Stat label="À corriger" value={mismatched.length} color="#ef4444" />
            </div>

            <Section title={`À corriger (${mismatched.length})`} accent="#ef4444">
              {mismatched.length === 0
                ? <p className="text-xs" style={{ color: "#6b7c96" }}>Aucun écart détecté. ✨</p>
                : mismatched.map(r => <ReportCard key={r.id} report={r} />)}
            </Section>

            <Section title={`Conformes (${ok.length})`} accent="#22c55e" collapsible>
              {ok.map(r => (
                <div key={r.id} className="flex items-center gap-2 text-xs py-1"
                  style={{ color: "#9aa7ba" }}>
                  <CheckCircle size={11} style={{ color: "#22c55e" }} />
                  <span>{r.name}</span>
                  <span className="text-[10px]" style={{ color: "#6b7c96" }}>· {r.league}</span>
                </div>
              ))}
            </Section>

            <p className="text-[10px] mt-4" style={{ color: "#6b7c96" }}>
              Dernière vérification : {new Date(data.checkedAt).toLocaleString("fr-FR")}
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg px-3 py-2"
      style={{ background: "rgba(13,20,33,0.55)", border: `1px solid ${color}22` }}>
      <p className="text-[10px] uppercase tracking-widest" style={{ color: "#6b7c96" }}>{label}</p>
      <p className="text-xl font-black mt-0.5" style={{ color }}>{value}</p>
    </div>
  );
}

function Section({ title, accent, children, collapsible }: {
  title: string; accent: string; children: React.ReactNode; collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <section className="mb-4">
      <button onClick={() => collapsible && setOpen(o => !o)}
        className="flex items-center gap-2 mb-2 w-full text-left"
        style={{ cursor: collapsible ? "pointer" : "default" }}>
        <span className="w-1.5 h-3 rounded" style={{ background: accent }} />
        <h2 className="text-[11px] uppercase tracking-widest font-bold" style={{ color: accent }}>{title}</h2>
        {collapsible && <span className="text-[10px]" style={{ color: "#6b7c96" }}>{open ? "▾" : "▸"}</span>}
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </section>
  );
}

function ReportCard({ report }: { report: Report }) {
  return (
    <div className="rounded-xl px-3 py-2"
      style={{ background: "rgba(13,20,33,0.55)", border: "1px solid rgba(239,68,68,0.18)" }}>
      <div className="flex items-center gap-2 mb-1.5">
        <XCircle size={12} style={{ color: "#ef4444" }} />
        <span className="font-bold text-sm">{report.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: report.league === "L1" ? "rgba(0,212,255,0.12)" : "rgba(251,191,36,0.12)",
                   color: report.league === "L1" ? "#00d4ff" : "#fbbf24" }}>
          {report.league}
        </span>
        <Link href={`https://fr.wikipedia.org/wiki/${encodeURIComponent(report.wikiTitle)}`}
          target="_blank" className="ml-auto text-[10px] underline"
          style={{ color: "#6b7c96" }}>Wiki ↗</Link>
      </div>
      {report.error && (
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#f59e0b" }}>
          <Warning size={11} /> {report.error}
        </div>
      )}
      <ul className="space-y-1">
        {report.checks.filter(c => !c.match && c.expected).map((c, i) => (
          <li key={i} className="text-[11px] grid grid-cols-[80px,1fr] gap-2 items-baseline">
            <span className="font-bold uppercase tracking-wide text-[9px]" style={{ color: "#a78bfa" }}>
              {c.field}
            </span>
            <span>
              <span className="line-through" style={{ color: "#ef4444" }}>{c.expected}</span>
              <span style={{ color: "#6b7c96" }}> → </span>
              <span style={{ color: "#22c55e" }}>{c.actual ?? "(introuvable)"}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
