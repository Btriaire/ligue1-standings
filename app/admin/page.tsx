"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield, SignOut, ArrowsClockwise, Play, CheckCircle, XCircle,
  Clock, Database, Users, Lightning, Globe, Warning,
  Eye, EyeSlash, HardDrives, Trash, WifiHigh, WifiSlash,
  ArrowSquareOut, Funnel, ToggleLeft, ToggleRight,
} from "@phosphor-icons/react";

/* ─── Types ──────────────────────────────────────────────────── */
interface DataSource {
  name: string; role: string; url: string;
  status: "ok" | "error" | "unknown" | "blocked";
  latencyMs: number | null;
  updateFreq: string; freeQuota: string;
  replaceable: boolean; notes: string;
  sofaLastFetch?: string;
}
interface CronJob { path: string; schedule: string; role: string; lastRun: string }
interface Status {
  sources: DataSource[];
  crons: CronJob[];
  firestore: { sofascoreClubs: number | null; composClubs: number | null; totalCompoVotes: number | null };
  firebase: { registeredUsers: number | null };
  app: { base: string; env: string };
}
type LogEntry = { msg: string; ok: boolean; ts: number };

interface PingResult {
  ok: boolean; status: number; ms: number;
  hint?: string; fixPath?: string; fixLabel?: string;
}

// Map source name → sourceId for ping route
const SOURCE_IDS: Record<string, string> = {
  "football-data.org": "football-data",
  "Understat": "understat",
  "SofaScore API": "sofascore",
  "So Foot (news)": "sofoot",
  "Transfermarkt API (fly.dev)": "transfermarkt",
  "FBref (Sports Reference)": "fbref",
};

/* ─── Helpers ────────────────────────────────────────────────── */
function StatusDot({ status }: { status: DataSource["status"] }) {
  const c = { ok: "#22c55e", error: "#ef4444", unknown: "#f59e0b", blocked: "#f97316" }[status];
  return <span className="w-2 h-2 rounded-full flex-shrink-0 inline-block" style={{ background: c }} />;
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {label}
    </span>
  );
}

/* ─── Login ──────────────────────────────────────────────────── */
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [err, setErr] = useState(""); const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setLoading(true);
    const res = await fetch("/api/admin/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p }),
    });
    setLoading(false);
    if (res.ok) onLogin(); else setErr("Identifiants incorrects");
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080c14" }}>
      <div className="w-full max-w-sm mx-4 rounded-2xl p-8 space-y-5"
        style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <Shield size={20} style={{ color: "#ef4444" }} />
          </div>
          <h1 className="text-lg font-black" style={{ color: "#e8edf5" }}>Administration</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input value={u} onChange={e => setU(e.target.value)} required
            type="text" placeholder="Identifiant" autoComplete="off"
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#e8edf5" }} />
          <div className="relative">
            <input value={p} onChange={e => setP(e.target.value)} required
              type={show ? "text" : "password"} placeholder="Mot de passe"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none pr-10"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#e8edf5" }} />
            <button type="button" onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7c96" }}>
              {show ? <EyeSlash size={14}/> : <Eye size={14}/>}
            </button>
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-black hover:opacity-90 disabled:opacity-50"
            style={{ background: "#ef4444", color: "#fff" }}>
            {loading ? "…" : "Connexion"}
          </button>
        </form>
        <Link href="/" className="block text-center text-xs hover:underline" style={{ color: "#475569" }}>
          ← Retour à l&apos;app
        </Link>
      </div>
    </div>
  );
}

/* ─── Action button ──────────────────────────────────────────── */
function ActionBtn({
  label, sub, icon, color, log, onClick,
}: {
  label: string; sub?: string; icon: React.ReactNode;
  color: string; log?: LogEntry | null; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="flex items-start gap-3 w-full px-3 py-2.5 rounded-xl text-left hover:brightness-125 transition-all"
      style={{ background: `${color}0d`, border: `1px solid ${color}25` }}>
      <span className="mt-0.5 flex-shrink-0" style={{ color }}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold leading-tight" style={{ color: "#e8edf5" }}>{label}</p>
        {sub && <p className="text-[9px] mt-0.5" style={{ color: "#475569" }}>{sub}</p>}
        {log && (
          <p className="text-[9px] font-mono mt-1"
            style={{ color: log.ok ? "#22c55e" : "#ef4444" }}>
            {log.msg}
          </p>
        )}
      </div>
    </button>
  );
}

/* ─── Feature toggle ─────────────────────────────────────────── */
function Toggle({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e2d42" }}>
      <span className="text-xs" style={{ color: "#94a3b8" }}>{label}</span>
      <button onClick={onToggle} style={{ color: enabled ? "#22c55e" : "#475569" }}>
        {enabled ? <ToggleRight size={20} weight="fill"/> : <ToggleLeft size={20}/>}
      </button>
    </div>
  );
}

/* ─── Dashboard ──────────────────────────────────────────────── */
export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<Record<string, LogEntry>>({});
  const [features, setFeatures] = useState({ news: true, predictions: true, emotional: true, transfers: true });
  const [pings, setPings] = useState<Record<string, PingResult | "loading">>({});

  useEffect(() => {
    fetch("/api/admin/auth")
      .then(r => r.ok ? r.json() : { admin: false })
      .then(d => setAuthed(d.admin === true))
      .catch(() => setAuthed(false));
  }, []);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/status");
    if (res.ok) setStatus(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) loadStatus(); }, [authed, loadStatus]);

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthed(false);
  }

  async function pingSource(sourceName: string) {
    const sourceId = SOURCE_IDS[sourceName];
    if (!sourceId) return;
    setPings(p => ({ ...p, [sourceName]: "loading" }));
    try {
      const res = await fetch("/api/admin/ping", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      const data = await res.json() as PingResult;
      setPings(p => ({ ...p, [sourceName]: data }));
    } catch {
      setPings(p => ({ ...p, [sourceName]: { ok: false, status: 0, ms: 0, hint: "Erreur réseau" } }));
    }
  }

  async function pingAll() {
    const names = status?.sources.map(src => src.name) ?? [];
    await Promise.all(names.map(n => pingSource(n)));
  }

  async function trigger(key: string, path: string) {
    setLogs(l => ({ ...l, [key]: { msg: "⏳ En cours…", ok: true, ts: Date.now() } }));
    try {
      const res = await fetch("/api/admin/trigger", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const d = await res.json();
      setLogs(l => ({
        ...l,
        [key]: { msg: d.ok ? `✅ OK · ${d.ms}ms` : `❌ Erreur ${d.status} · ${d.ms}ms`, ok: d.ok, ts: Date.now() },
      }));
    } catch {
      setLogs(l => ({ ...l, [key]: { msg: "❌ Échec réseau", ok: false, ts: Date.now() } }));
    }
  }

  if (authed === null) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080c14" }}>
      <ArrowsClockwise size={18} className="animate-spin" style={{ color: "#6b7c96" }} />
    </div>
  );
  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  const s = status;

  return (
    <div className="min-h-screen" style={{ background: "#080c14" }}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{ background: "rgba(8,12,20,0.95)", borderColor: "#1e2d42" }}>
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-2">
          <Shield size={14} style={{ color: "#ef4444" }} />
          <span className="font-black text-sm" style={{ color: "#e8edf5" }}>Admin</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-black"
            style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
            {s?.app.env ?? "…"}
          </span>
          <div className="flex-1" />
          {/* Stat pills */}
          {s && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[10px] flex items-center gap-1" style={{ color: "#6b7c96" }}>
                <Users size={11}/> {s.firebase.registeredUsers ?? "—"} users
              </span>
              <span className="text-[10px] flex items-center gap-1" style={{ color: "#6b7c96" }}>
                <Database size={11}/> {s.firestore.totalCompoVotes ?? "—"} votes
              </span>
            </div>
          )}
          <button onClick={loadStatus} disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#94a3b8" }}>
            <ArrowsClockwise size={10} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline ml-1">Refresh</span>
          </button>
          <Link href="/" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#94a3b8" }}>
            ← App
          </Link>
          <button onClick={logout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs hover:opacity-80"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
            <SignOut size={10}/> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ══ LEFT COL (2/3) ══ */}
          <div className="lg:col-span-2 space-y-4">

            {/* ── Actions rapides ── */}
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"
                style={{ color: "#475569" }}>
                <Lightning size={11}/> Actions base de données
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <ActionBtn label="Warm cache joueurs" sub="Tous les 18 clubs L1 → Firestore" icon={<HardDrives size={13}/>}
                  color="#3b82f6" log={logs["warm"]} onClick={() => trigger("warm", "/api/cron/warm-players")} />
                <ActionBtn label="Scraper SofaScore" sub="Blessures · valeurs · matchs" icon={<ArrowsClockwise size={13}/>}
                  color="#f59e0b" log={logs["sofa"]} onClick={() => trigger("sofa", "/api/cron/sofascore")} />
                <ActionBtn label="Refresh classement L1" sub="Cache football-data.org" icon={<Globe size={13}/>}
                  color="#22c55e" log={logs["standings"]} onClick={() => trigger("standings", "/api/standings?refresh=1")} />
                <ActionBtn label="Purge cache news" sub="Force re-fetch So Foot RSS" icon={<Trash size={13}/>}
                  color="#a78bfa" log={logs["news"]} onClick={() => trigger("news", "/api/news?topic=l1")} />
                <ActionBtn label="Ping toutes les sources" sub="Vérifie latences en direct" icon={<WifiHigh size={13}/>}
                  color="#06b6d4" log={logs["ping"]} onClick={() => { trigger("ping", "/api/admin/status"); loadStatus(); }} />
                <ActionBtn label="Warm SofaScore PSG" sub="Club 524 en priorité" icon={<Play size={13}/>}
                  color="#ef4444" log={logs["psgwarm"]} onClick={() => trigger("psgwarm", "/api/squad/524?force=1")} />
              </div>
            </section>

            {/* ── Feature flags ── */}
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"
                style={{ color: "#475569" }}>
                <Funnel size={11}/> Feature flags (session locale)
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <Toggle label="🗞️ Bandeau news" enabled={features.news}
                  onToggle={() => setFeatures(f => ({ ...f, news: !f.news }))} />
                <Toggle label="⚡ Prédictions IA" enabled={features.predictions}
                  onToggle={() => setFeatures(f => ({ ...f, predictions: !f.predictions }))} />
                <Toggle label="❤️ Score émotionnel" enabled={features.emotional}
                  onToggle={() => setFeatures(f => ({ ...f, emotional: !f.emotional }))} />
                <Toggle label="🔄 Onglet Transferts" enabled={features.transfers}
                  onToggle={() => setFeatures(f => ({ ...f, transfers: !f.transfers }))} />
              </div>
            </section>

            {/* ── Cron jobs ── */}
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"
                style={{ color: "#475569" }}>
                <Clock size={11}/> Crons Vercel
              </h2>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1e2d42" }}>
                {(s?.crons ?? []).map((cron, i) => (
                  <div key={cron.path}
                    className="flex items-center gap-3 px-3 py-2.5"
                    style={{
                      borderBottom: i < (s?.crons.length ?? 0) - 1 ? "1px solid #1e2d42" : "none",
                      background: "#0d1421",
                    }}>
                    <div className="flex-1 min-w-0">
                      <code className="text-[10px] font-mono" style={{ color: "#60a5fa" }}>{cron.path}</code>
                      <p className="text-[9px] mt-0.5" style={{ color: "#475569" }}>{cron.schedule}</p>
                      <p className="text-[9px]" style={{ color: "#334155" }}>{cron.lastRun}</p>
                      {logs[cron.path] && (
                        <p className="text-[9px] font-mono mt-0.5"
                          style={{ color: logs[cron.path].ok ? "#22c55e" : "#ef4444" }}>
                          {logs[cron.path].msg}
                        </p>
                      )}
                    </div>
                    <button onClick={() => trigger(cron.path, cron.path)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold flex-shrink-0 hover:opacity-80"
                      style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}>
                      <Play size={9}/> Run
                    </button>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* ══ RIGHT COL (1/3) ══ */}
          <div className="space-y-4">

            {/* ── Firestore stats ── */}
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"
                style={{ color: "#475569" }}>
                <Database size={11}/> Firestore
              </h2>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1e2d42" }}>
                {[
                  { label: "Users Firebase", value: s?.firebase.registeredUsers, icon: <Users size={11}/>, color: "#3b82f6" },
                  { label: "Clubs SofaScore", value: s?.firestore.sofascoreClubs, icon: <HardDrives size={11}/>, color: "#f59e0b" },
                  { label: "Clubs compos", value: s?.firestore.composClubs, icon: <Funnel size={11}/>, color: "#a78bfa" },
                  { label: "Total votes compo", value: s?.firestore.totalCompoVotes, icon: <Database size={11}/>, color: "#22c55e" },
                ].map((row, i, arr) => (
                  <div key={row.label} className="flex items-center justify-between px-3 py-2"
                    style={{ background: "#0d1421", borderBottom: i < arr.length - 1 ? "1px solid #1e2d42" : "none" }}>
                    <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "#6b7c96" }}>
                      <span style={{ color: row.color }}>{row.icon}</span>
                      {row.label}
                    </span>
                    <span className="text-sm font-black" style={{ color: "#e8edf5" }}>{row.value ?? "—"}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Sources de données ── */}
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"
                style={{ color: "#475569" }}>
                <Globe size={11}/> Sources
                <button onClick={pingAll}
                  className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold hover:opacity-80"
                  style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)", color: "#06b6d4" }}>
                  <WifiHigh size={9}/> Tout tester
                </button>
              </h2>
              <div className="space-y-1.5">
                {(s?.sources ?? []).map((src) => {
                  const ping = pings[src.name];
                  const isLoading = ping === "loading";
                  const result = typeof ping === "object" ? ping : null;
                  return (
                    <div key={src.name} className="rounded-xl p-2.5"
                      style={{ background: "#0d1421", border: `1px solid ${result ? (result.ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)") : "#1e2d42"}` }}>
                      {/* Row 1: name + status + link */}
                      <div className="flex items-center gap-2">
                        <StatusDot status={result ? (result.ok ? "ok" : "error") : src.status} />
                        <span className="text-[10px] font-semibold flex-1 truncate" style={{ color: "#e2e8f0" }}>{src.name}</span>
                        {result && (
                          <span className="text-[9px] font-mono flex-shrink-0" style={{ color: result.ok ? "#22c55e" : "#ef4444" }}>
                            {result.ok ? `${result.ms}ms` : `HTTP ${result.status || "ERR"}`}
                          </span>
                        )}
                        {!result && src.latencyMs != null && (
                          <span className="text-[9px] font-mono" style={{ color: "#334155" }}>{src.latencyMs}ms</span>
                        )}
                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                          <ArrowSquareOut size={9} style={{ color: "#334155" }}/>
                        </a>
                      </div>
                      {/* Row 2: role */}
                      <p className="text-[8.5px] mt-0.5 truncate" style={{ color: "#475569" }}>{src.role}</p>
                      {/* Row 3: hint if error */}
                      {result && !result.ok && result.hint && (
                        <p className="text-[8px] mt-1 font-mono truncate px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(239,68,68,0.08)", color: "#f87171" }}>
                          {result.hint}
                        </p>
                      )}
                      {/* Row 4: action buttons */}
                      <div className="flex gap-1.5 mt-1.5">
                        <button onClick={() => pingSource(src.name)} disabled={isLoading}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold hover:opacity-80 disabled:opacity-40"
                          style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "#06b6d4" }}>
                          {isLoading
                            ? <ArrowsClockwise size={8} className="animate-spin"/>
                            : <WifiHigh size={8}/>}
                          {isLoading ? "Test…" : "Tester"}
                        </button>
                        {/* Fix button — shown if error OR as proactive action */}
                        {result?.fixPath && (
                          <button onClick={() => trigger(`fix_${src.name}`, result.fixPath!)} disabled={isLoading}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold hover:opacity-80"
                            style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>
                            <Play size={8}/> {result.fixLabel ?? "Relancer"}
                          </button>
                        )}
                        {logs[`fix_${src.name}`] && (
                          <span className="text-[8px] font-mono self-center"
                            style={{ color: logs[`fix_${src.name}`].ok ? "#22c55e" : "#ef4444" }}>
                            {logs[`fix_${src.name}`].msg}
                          </span>
                        )}
                        {src.status === "blocked" && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded self-center"
                            style={{ background: "rgba(249,115,22,0.1)", color: "#f97316" }}>
                            Anti-bot — irrécupérable auto
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── FBref warning compact ── */}
            <section className="rounded-xl p-3 space-y-1.5"
              style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)" }}>
              <div className="flex items-center gap-1.5">
                <XCircle size={12} style={{ color: "#f97316" }}/>
                <span className="text-[10px] font-black" style={{ color: "#f97316" }}>FBref bloqué (403)</span>
              </div>
              <p className="text-[9px]" style={{ color: "#6b7c96" }}>
                Données manquantes : Pressures/90, SCA, GCA, Progressive passes reçues.
                Anti-bot côté serveur — inaccessible automatiquement.
              </p>
              <a href="https://fbref.com" target="_blank" rel="noopener noreferrer"
                className="text-[9px] flex items-center gap-1 hover:underline" style={{ color: "#f97316" }}>
                Export CSV manuel <ArrowSquareOut size={9}/>
              </a>
            </section>

            {/* ── Env info ── */}
            {s && (
              <div className="rounded-xl px-3 py-2" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
                <p className="text-[9px] font-mono break-all" style={{ color: "#334155" }}>{s.app.base}</p>
                <div className="flex gap-2 mt-1">
                  <Pill label={s.app.env} color="#22c55e"/>
                  <Pill label="Session 8h" color="#3b82f6"/>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
