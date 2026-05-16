"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield, LogOut, RefreshCw, Play, CheckCircle2, XCircle,
  Clock, Database, Users, Zap, Globe2, Activity, AlertTriangle,
  ChevronRight, Eye, EyeOff, Server,
} from "lucide-react";

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

/* ─── Status badge ───────────────────────────────────────────── */
function StatusBadge({ status }: { status: DataSource["status"] }) {
  const cfg = {
    ok:      { icon: <CheckCircle2 size={13}/>, color: "#22c55e", label: "OK" },
    error:   { icon: <XCircle size={13}/>,      color: "#ef4444", label: "Erreur" },
    unknown: { icon: <Clock size={13}/>,         color: "#f59e0b", label: "Inconnu" },
    blocked: { icon: <AlertTriangle size={13}/>, color: "#f97316", label: "Bloqué" },
  }[status];
  return (
    <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
      style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

/* ─── Login screen ───────────────────────────────────────────── */
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [err, setErr] = useState(""); const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setLoading(true);
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p }),
    });
    setLoading(false);
    if (res.ok) { onLogin(); }
    else { setErr("Identifiants incorrects"); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080c14" }}>
      <div className="w-full max-w-sm mx-4">
        <div className="rounded-2xl p-8 space-y-6" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <Shield size={24} style={{ color: "#ef4444" }} />
            </div>
            <h1 className="text-xl font-black" style={{ color: "#e8edf5" }}>Administration</h1>
            <p className="text-xs mt-1" style={{ color: "#6b7c96" }}>FootPredictom · Accès restreint</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "#94a3b8" }}>Identifiant</label>
              <input value={u} onChange={e => setU(e.target.value)} required autoComplete="username"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#e8edf5" }} />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "#94a3b8" }}>Mot de passe</label>
              <div className="relative">
                <input value={p} onChange={e => setP(e.target.value)} required
                  type={show ? "text" : "password"} autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none pr-10"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#e8edf5" }} />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7c96" }}>
                  {show ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
            </div>
            {err && <p className="text-xs text-red-400">{err}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-black hover:opacity-90 transition-all disabled:opacity-50"
              style={{ background: "#ef4444", color: "#fff" }}>
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
          <div className="text-center">
            <Link href="/" className="text-xs hover:underline" style={{ color: "#6b7c96" }}>
              ← Retour à l&apos;application
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Admin dashboard ────────────────────────────────────────── */
export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggerLog, setTriggerLog] = useState<Record<string, string>>({});

  // Check admin session
  useEffect(() => {
    fetch("/api/admin/auth").then(r => r.json()).then(d => setAuthed(d.admin));
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

  async function trigger(path: string) {
    setTriggerLog(l => ({ ...l, [path]: "⏳ En cours…" }));
    const res = await fetch("/api/admin/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    const d = await res.json();
    setTriggerLog(l => ({
      ...l,
      [path]: d.ok ? `✅ OK · ${d.ms}ms` : `❌ Erreur ${d.status ?? ""} · ${d.ms}ms`,
    }));
  }

  if (authed === null) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080c14" }}>
      <RefreshCw size={20} className="animate-spin" style={{ color: "#6b7c96" }} />
    </div>
  );

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  /* ── Dashboard ── */
  return (
    <div className="min-h-screen" style={{ background: "#080c14" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{ background: "rgba(8,12,20,0.92)", borderColor: "#1e2d42" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Shield size={16} style={{ color: "#ef4444" }} />
          <span className="font-black text-sm" style={{ color: "#e8edf5" }}>Admin Panel</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-black"
            style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
            FootPredictom
          </span>
          <div className="flex-1"/>
          <button onClick={loadStatus} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#94a3b8" }}>
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Actualiser
          </button>
          <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1e2d42", color: "#94a3b8" }}>
            ← App
          </Link>
          <button onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
            <LogOut size={11}/> Déconnexion
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* ── Stats bar ── */}
        {status && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: <Users size={16}/>, label: "Utilisateurs Firebase", value: status.firebase.registeredUsers ?? "—", color: "#3b82f6" },
              { icon: <Database size={16}/>, label: "Votes Ma Compo", value: status.firestore.totalCompoVotes ?? "—", color: "#a78bfa" },
              { icon: <Activity size={16}/>, label: "Clubs SofaScore", value: status.firestore.sofascoreClubs ?? "—", color: "#f59e0b" },
              { icon: <Server size={16}/>, label: "Env", value: status.app.env, color: "#22c55e" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>{s.icon}</div>
                <p className="text-2xl font-black" style={{ color: "#e8edf5" }}>{s.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#6b7c96" }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Data sources ── */}
        <section>
          <h2 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2"
            style={{ color: "#6b7c96" }}>
            <Globe2 size={14}/> Sources de données
          </h2>
          <div className="space-y-2">
            {(status?.sources ?? []).map(src => (
              <div key={src.name} className="rounded-2xl p-4" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black text-sm" style={{ color: "#e8edf5" }}>{src.name}</span>
                      <StatusBadge status={src.status} />
                      {src.latencyMs != null && (
                        <span className="text-[10px] font-mono" style={{ color: "#475569" }}>{src.latencyMs}ms</span>
                      )}
                      {src.replaceable && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(168,85,247,0.12)", color: "#a78bfa" }}>
                          Remplaçable
                        </span>
                      )}
                    </div>
                    <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>{src.role}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px]" style={{ color: "#475569" }}>
                      <span>⟳ {src.updateFreq}</span>
                      <span>📊 {src.freeQuota}</span>
                      {src.sofaLastFetch && <span>🕒 Dernier fetch: {src.sofaLastFetch}</span>}
                    </div>
                    <p className="text-[10px] mt-1.5 italic" style={{ color: "#64748b" }}>→ {src.notes}</p>
                  </div>
                  <a href={src.url} target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 flex items-center gap-1 text-[10px] hover:opacity-70"
                    style={{ color: "#3b82f6" }}>
                    Ouvrir <ChevronRight size={10}/>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FBref analysis ── */}
        <section>
          <h2 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2"
            style={{ color: "#6b7c96" }}>
            <AlertTriangle size={14}/> Analyse FBref
          </h2>
          <div className="rounded-2xl p-5 space-y-3" style={{ background: "#0d1421", border: "1px solid rgba(249,115,22,0.3)" }}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} style={{ color: "#f97316", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-sm font-bold mb-2" style={{ color: "#e8edf5" }}>
                  FBref — Inaccessible côté serveur (403 anti-bot)
                </p>
                <p className="text-xs mb-3" style={{ color: "#94a3b8" }}>
                  FBref renvoie un 403 sur toutes les requêtes serveur. Leur anti-bot détecte les User-Agent automatisés.
                  Les données FBref qui nous intéresseraient mais ne sont disponibles nulle part ailleurs :
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    { stat: "Pressures / 90", detail: "Nombre de pressions exercées par joueur — mesure l'intensité défensive. Absent de Datamb, Understat, SofaScore.", interest: "élevé" },
                    { stat: "SCA / GCA", detail: "Shot-creating actions & Goal-creating actions — compte les actions qui mènent à un tir/but sur 2 passes. Unique à FBref.", interest: "élevé" },
                    { stat: "Progressive passes reçues", detail: "Passes progressives reçues par un joueur — complète nos carries. Absent partout ailleurs.", interest: "moyen" },
                    { stat: "Touches par zone", detail: "Touches en zone défensive / milieu / attaque — contexte positionnel. Absent de nos sources.", interest: "moyen" },
                    { stat: "Blocks shots/passes", detail: "Tirs et passes bloqués — plus granulaire que les interceptions. Absent.", interest: "faible" },
                  ].map(item => (
                    <div key={item.stat} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e2d42" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black" style={{ color: "#e8edf5" }}>{item.stat}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-black"
                          style={{
                            background: item.interest === "élevé" ? "rgba(239,68,68,0.12)" : item.interest === "moyen" ? "rgba(245,158,11,0.12)" : "rgba(100,116,139,0.12)",
                            color: item.interest === "élevé" ? "#ef4444" : item.interest === "moyen" ? "#f59e0b" : "#64748b",
                          }}>
                          Intérêt {item.interest}
                        </span>
                      </div>
                      <p className="text-[10px]" style={{ color: "#6b7c96" }}>{item.detail}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] mt-3 p-2 rounded-lg" style={{ background: "rgba(249,115,22,0.08)", color: "#f97316" }}>
                  💡 Alternative envisageable : FBref offre des exports CSV manuels (non-automatisables). Pour les pressures et SCA, Wyscout/StatsBomb sont les alternatives commerciales. En open-source, rien ne les égale.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Cron jobs ── */}
        <section>
          <h2 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2"
            style={{ color: "#6b7c96" }}>
            <Clock size={14}/> Crons Vercel
          </h2>
          <div className="space-y-2">
            {(status?.crons ?? []).map(cron => (
              <div key={cron.path} className="rounded-2xl p-4 flex flex-wrap items-start gap-4"
                style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black mb-0.5" style={{ color: "#e8edf5" }}>
                    <code className="text-xs font-mono px-1.5 py-0.5 rounded mr-2"
                      style={{ background: "#0a0f1c", color: "#60a5fa" }}>{cron.path}</code>
                  </p>
                  <p className="text-xs" style={{ color: "#94a3b8" }}>{cron.role}</p>
                  <p className="text-[10px] mt-1" style={{ color: "#475569" }}>
                    🕒 {cron.schedule} · Dernier run: {cron.lastRun}
                  </p>
                  {triggerLog[cron.path] && (
                    <p className="text-[11px] mt-1.5 font-mono" style={{ color: "#94a3b8" }}>{triggerLog[cron.path]}</p>
                  )}
                </div>
                <button onClick={() => trigger(cron.path)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 flex-shrink-0"
                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}>
                  <Play size={11}/> Déclencher
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Firestore ── */}
        {status && (
          <section>
            <h2 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2"
              style={{ color: "#6b7c96" }}>
              <Database size={14}/> Firestore
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: "sofascore/", value: status.firestore.sofascoreClubs, desc: "Clubs avec cache SofaScore" },
                { label: "compos/", value: status.firestore.composClubs, desc: "Clubs avec votes Ma Compo" },
                { label: "Total votes", value: status.firestore.totalCompoVotes, desc: "Votes Ma Compo toutes équipes" },
              ].map(item => (
                <div key={item.label} className="rounded-2xl p-4" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
                  <code className="text-xs font-mono" style={{ color: "#60a5fa" }}>{item.label}</code>
                  <p className="text-3xl font-black mt-2" style={{ color: "#e8edf5" }}>{item.value ?? "—"}</p>
                  <p className="text-[10px] mt-1" style={{ color: "#6b7c96" }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Useful actions ── */}
        <section>
          <h2 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2"
            style={{ color: "#6b7c96" }}>
            <Zap size={14}/> Actions rapides
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { label: "Forcer warm cache (tous les clubs)", path: "/api/cron/warm-players", color: "#3b82f6" },
              { label: "Rescraper SofaScore maintenant", path: "/api/cron/sofascore", color: "#f59e0b" },
            ].map(action => (
              <button key={action.path} onClick={() => trigger(action.path)}
                className="flex items-center gap-3 px-5 py-4 rounded-2xl text-left hover:opacity-80 transition-all"
                style={{ background: `${action.color}0d`, border: `1px solid ${action.color}30` }}>
                <Play size={14} style={{ color: action.color, flexShrink: 0 }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#e8edf5" }}>{action.label}</p>
                  {triggerLog[action.path] && (
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: "#6b7c96" }}>{triggerLog[action.path]}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <div className="text-center py-4 text-[10px]" style={{ color: "#2d3a4f" }}>
          FootPredictom Admin · Session valide 8h · {status?.app.base}
        </div>
      </div>
    </div>
  );
}
