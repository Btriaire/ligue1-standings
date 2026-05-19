"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield, SignOut, ArrowsClockwise, Play, CheckCircle, XCircle,
  Clock, Database, Users, Lightning, Globe, Warning,
  Eye, EyeSlash, HardDrives, Trash, WifiHigh, WifiSlash,
  ArrowSquareOut, Funnel, ToggleLeft, ToggleRight,
  ChartBar, TwitterLogo, FloppyDisk, CloudArrowDown,
  CaretDown, CaretRight, Hash, Globe as GlobeIcon,
} from "@phosphor-icons/react";
import {
  FAN_CLUBS_L1, FAN_CLUBS_L2, FAN_NATIONS,
  type FanEntry, type FanAccount,
} from "@/app/lib/fanConfig";

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

interface HistoricalSeason {
  totalMatches: number;
  champion: string;
  importedAt: string;
}
interface HistoricalStatus {
  seasons: string[];
  imported: Record<string, HistoricalSeason>;
}

const L1_CLUBS_ADMIN = [
  { id: 524,  name: "PSG" },
  { id: 548,  name: "Monaco" },
  { id: 516,  name: "Marseille" },
  { id: 521,  name: "Lille" },
  { id: 529,  name: "Rennes" },
  { id: 522,  name: "Nice" },
  { id: 546,  name: "Lens" },
  { id: 523,  name: "Lyon" },
  { id: 576,  name: "Strasbourg" },
  { id: 511,  name: "Toulouse" },
  { id: 512,  name: "Brest" },
  { id: 532,  name: "Angers" },
  { id: 533,  name: "Le Havre" },
  { id: 519,  name: "Auxerre" },
  { id: 543,  name: "Nantes" },
  { id: 545,  name: "Metz" },
  { id: 525,  name: "Lorient" },
  { id: 1045, name: "Paris FC" },
];

// Default fan/supporter handles — derived from the curated fan ecosystem
// in `app/lib/fanConfig.ts` so the recommendations stay in sync across
// the app. For each L1 club we pick the top-ranked *fan* account (or
// the top *media* account if no fan account is listed). Admin overrides
// from Firestore take priority over this base.
const DEFAULT_TWITTER_HANDLES: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const club of L1_CLUBS_ADMIN) {
    const entry = FAN_CLUBS_L1[club.id];
    if (!entry) continue;
    const fan = entry.twitter.find(a => a.kind === "fan")
            ?? entry.twitter.find(a => a.kind === "media");
    if (fan) out[String(club.id)] = fan.handle;
  }
  return out;
})();

// Labels for the fan-config admin editor. Keys must match the ids used
// in FAN_CLUBS_L2 / FAN_NATIONS in `app/lib/fanConfig.ts`.
const L2_CLUBS_ADMIN: { id: number; name: string }[] = [
  { id: 10242,  name: "Troyes" },        { id: 9853,   name: "Saint-Étienne" },
  { id: 9837,   name: "Reims" },         { id: 10249,  name: "Montpellier" },
  { id: 8311,   name: "Clermont" },      { id: 9747,   name: "Guingamp" },
  { id: 8682,   name: "Le Mans" },       { id: 6390,   name: "Red Star" },
  { id: 4120,   name: "Rodez" },         { id: 293352, name: "Annecy" },
  { id: 6355,   name: "Pau" },           { id: 47214,  name: "Dunkerque" },
  { id: 9855,   name: "Grenoble" },      { id: 8481,   name: "Nancy" },
  { id: 4170,   name: "Boulogne" },      { id: 7853,   name: "Laval" },
  { id: 7794,   name: "Bastia" },        { id: 8587,   name: "Amiens" },
];

const NATIONS_ADMIN: { code: string; name: string }[] = [
  { code:"ARG", name:"Argentine" },   { code:"CHI", name:"Chili" },
  { code:"PER", name:"Pérou" },       { code:"AUS", name:"Australie" },
  { code:"MEX", name:"Mexique" },     { code:"JAM", name:"Jamaïque" },
  { code:"VEN", name:"Venezuela" },   { code:"ECU", name:"Équateur" },
  { code:"USA", name:"USA" },         { code:"PAN", name:"Panama" },
  { code:"CUB", name:"Cuba" },        { code:"NZL", name:"Nouvelle-Zélande" },
  { code:"CAN", name:"Canada" },      { code:"HON", name:"Honduras" },
  { code:"URU", name:"Uruguay" },     { code:"POR", name:"Portugal" },
  { code:"ESP", name:"Espagne" },     { code:"MAR", name:"Maroc" },
  { code:"BEL", name:"Belgique" },    { code:"JPN", name:"Japon" },
  { code:"FRA", name:"France" },      { code:"KSA", name:"Arabie Saoudite" },
  { code:"SUI", name:"Suisse" },      { code:"ALG", name:"Algérie" },
  { code:"BRA", name:"Brésil" },      { code:"COL", name:"Colombie" },
  { code:"PAR", name:"Paraguay" },    { code:"CMR", name:"Cameroun" },
  { code:"GER", name:"Allemagne" },   { code:"NED", name:"Pays-Bas" },
  { code:"POL", name:"Pologne" },     { code:"SRB", name:"Serbie" },
  { code:"ENG", name:"Angleterre" },  { code:"SEN", name:"Sénégal" },
  { code:"TUN", name:"Tunisie" },     { code:"CRC", name:"Costa Rica" },
  { code:"ITA", name:"Italie" },      { code:"CRO", name:"Croatie" },
  { code:"ROU", name:"Roumanie" },    { code:"ANG", name:"Angola" },
  { code:"UKR", name:"Ukraine" },     { code:"GHA", name:"Ghana" },
  { code:"RSA", name:"Afrique du Sud" }, { code:"COD", name:"RD Congo" },
  { code:"KOR", name:"Corée du Sud" },{ code:"CIV", name:"Côte d'Ivoire" },
  { code:"ZIM", name:"Zimbabwe" },    { code:"KEN", name:"Kenya" },
];

interface FanCatalogRow {
  id: string;           // "club:524" / "nation:FRA"
  scope: "L1" | "L2" | "WC";
  label: string;
  defaults: FanEntry;
}

function buildFanCatalogRows(): FanCatalogRow[] {
  const rows: FanCatalogRow[] = [];
  for (const c of L1_CLUBS_ADMIN) {
    const d = FAN_CLUBS_L1[c.id];
    if (d) rows.push({ id:`club:${c.id}`, scope:"L1", label:c.name, defaults:d });
  }
  for (const c of L2_CLUBS_ADMIN) {
    const d = FAN_CLUBS_L2[c.id];
    if (d) rows.push({ id:`club:${c.id}`, scope:"L2", label:c.name, defaults:d });
  }
  for (const n of NATIONS_ADMIN) {
    const d = FAN_NATIONS[n.code];
    if (d) rows.push({ id:`nation:${n.code}`, scope:"WC", label:n.name, defaults:d });
  }
  return rows;
}

const FAN_CATALOG_ROWS: FanCatalogRow[] = buildFanCatalogRows();

// Labels for the fan-config admin editor. Keys must match the ids used
// in FAN_CLUBS_L2 / FAN_NATIONS in `app/lib/fanConfig.ts`.
const L2_CLUBS_ADMIN: { id: number; name: string }[] = [
  { id: 10242,  name: "Troyes" },        { id: 9853,   name: "Saint-Étienne" },
  { id: 9837,   name: "Reims" },         { id: 10249,  name: "Montpellier" },
  { id: 8311,   name: "Clermont" },      { id: 9747,   name: "Guingamp" },
  { id: 8682,   name: "Le Mans" },       { id: 6390,   name: "Red Star" },
  { id: 4120,   name: "Rodez" },         { id: 293352, name: "Annecy" },
  { id: 6355,   name: "Pau" },           { id: 47214,  name: "Dunkerque" },
  { id: 9855,   name: "Grenoble" },      { id: 8481,   name: "Nancy" },
  { id: 4170,   name: "Boulogne" },      { id: 7853,   name: "Laval" },
  { id: 7794,   name: "Bastia" },        { id: 8587,   name: "Amiens" },
];

const NATIONS_ADMIN: { code: string; name: string }[] = [
  { code:"ARG", name:"Argentine" },   { code:"CHI", name:"Chili" },
  { code:"PER", name:"Pérou" },       { code:"AUS", name:"Australie" },
  { code:"MEX", name:"Mexique" },     { code:"JAM", name:"Jamaïque" },
  { code:"VEN", name:"Venezuela" },   { code:"ECU", name:"Équateur" },
  { code:"USA", name:"USA" },         { code:"PAN", name:"Panama" },
  { code:"CUB", name:"Cuba" },        { code:"NZL", name:"Nouvelle-Zélande" },
  { code:"CAN", name:"Canada" },      { code:"HON", name:"Honduras" },
  { code:"URU", name:"Uruguay" },     { code:"POR", name:"Portugal" },
  { code:"ESP", name:"Espagne" },     { code:"MAR", name:"Maroc" },
  { code:"BEL", name:"Belgique" },    { code:"JPN", name:"Japon" },
  { code:"FRA", name:"France" },      { code:"KSA", name:"Arabie Saoudite" },
  { code:"SUI", name:"Suisse" },      { code:"ALG", name:"Algérie" },
  { code:"BRA", name:"Brésil" },      { code:"COL", name:"Colombie" },
  { code:"PAR", name:"Paraguay" },    { code:"CMR", name:"Cameroun" },
  { code:"GER", name:"Allemagne" },   { code:"NED", name:"Pays-Bas" },
  { code:"POL", name:"Pologne" },     { code:"SRB", name:"Serbie" },
  { code:"ENG", name:"Angleterre" },  { code:"SEN", name:"Sénégal" },
  { code:"TUN", name:"Tunisie" },     { code:"CRC", name:"Costa Rica" },
  { code:"ITA", name:"Italie" },      { code:"CRO", name:"Croatie" },
  { code:"ROU", name:"Roumanie" },    { code:"ANG", name:"Angola" },
  { code:"UKR", name:"Ukraine" },     { code:"GHA", name:"Ghana" },
  { code:"RSA", name:"Afrique du Sud" }, { code:"COD", name:"RD Congo" },
  { code:"KOR", name:"Corée du Sud" },{ code:"CIV", name:"Côte d'Ivoire" },
  { code:"ZIM", name:"Zimbabwe" },    { code:"KEN", name:"Kenya" },
];

interface FanCatalogRow {
  id: string;           // "club:524" / "nation:FRA"
  scope: "L1" | "L2" | "WC";
  label: string;
  defaults: FanEntry;
}

function buildFanCatalogRows(): FanCatalogRow[] {
  const rows: FanCatalogRow[] = [];
  for (const c of L1_CLUBS_ADMIN) {
    const d = FAN_CLUBS_L1[c.id];
    if (d) rows.push({ id:`club:${c.id}`, scope:"L1", label:c.name, defaults:d });
  }
  for (const c of L2_CLUBS_ADMIN) {
    const d = FAN_CLUBS_L2[c.id];
    if (d) rows.push({ id:`club:${c.id}`, scope:"L2", label:c.name, defaults:d });
  }
  for (const n of NATIONS_ADMIN) {
    const d = FAN_NATIONS[n.code];
    if (d) rows.push({ id:`nation:${n.code}`, scope:"WC", label:n.name, defaults:d });
  }
  return rows;
}

const FAN_CATALOG_ROWS: FanCatalogRow[] = buildFanCatalogRows();

interface PingResult {
  ok: boolean; status: number; ms: number;
  hint?: string; fixPath?: string; fixLabel?: string;
  knownBlocked?: boolean;
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
  // Historical
  const [historical, setHistorical] = useState<HistoricalStatus | null>(null);
  const [histLoading, setHistLoading] = useState(false);
  const [histImporting, setHistImporting] = useState<Record<string, boolean>>({});
  const [histLog, setHistLog] = useState<string>("");
  // Twitter config
  const [twitterHandles, setTwitterHandles] = useState<Record<string, string>>({});
  const [twitterSaving, setTwitterSaving] = useState(false);
  const [twitterLog, setTwitterLog] = useState<string>("");
  // Results archive
  const [archiveMeta, setArchiveMeta] = useState<{ lastRun?: string; count?: number; windowDays?: number; seasons?: string[] } | null>(null);
  const [archiveIngesting, setArchiveIngesting] = useState(false);
  const [archiveLog, setArchiveLog] = useState<string>("");

  // ── Fan ecosystem config (Twitter accounts ≥5 / sites / hashtags) ────────
  const [fanEntries, setFanEntries] = useState<Record<string, FanEntry>>(() => {
    const out: Record<string, FanEntry> = {};
    for (const r of FAN_CATALOG_ROWS) out[r.id] = r.defaults;
    return out;
  });
  const [fanScope, setFanScope]   = useState<"L1" | "L2" | "WC">("L1");
  const [fanOpen, setFanOpen]     = useState<string | null>(null);
  const [fanSaving, setFanSaving] = useState(false);
  const [fanLog, setFanLog]       = useState<string>("");

  const loadFanConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/fan-config");
      if (!res.ok) return;
      const d = await res.json() as { overrides: Record<string, FanEntry> };
      if (d.overrides && Object.keys(d.overrides).length) {
        setFanEntries(prev => ({ ...prev, ...d.overrides }));
      }
    } catch { /* ignore */ }
  }, []);

  async function saveFanConfig() {
    setFanSaving(true); setFanLog("⏳ Sauvegarde…");
    try {
      const res = await fetch("/api/admin/fan-config", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ overrides: fanEntries }),
      });
      const d = await res.json() as { ok: boolean; saved: number; error?: string };
      setFanLog(d.ok
        ? `✅ ${d.saved} entité(s) sauvegardée(s) à ${new Date().toLocaleTimeString("fr-FR")}`
        : `❌ ${d.error ?? "Erreur"}`);
    } catch (e) {
      setFanLog(`❌ ${String(e)}`);
    } finally { setFanSaving(false); }
  }

  function updateFanEntry(id: string, patch: Partial<FanEntry>) {
    setFanEntries(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }
  function resetFanEntry(id: string) {
    const row = FAN_CATALOG_ROWS.find(r => r.id === id);
    if (row) setFanEntries(prev => ({ ...prev, [id]: row.defaults }));
  }

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

  const loadHistorical = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await fetch("/api/admin/historical");
      if (res.ok) setHistorical(await res.json());
    } finally { setHistLoading(false); }
  }, []);

  const loadTwitterConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/twitter-config");
      if (res.ok) {
        const d = await res.json() as { handles: Record<string, string> };
        // Merge defaults with saved Firestore values (saved values take priority)
        setTwitterHandles({ ...DEFAULT_TWITTER_HANDLES, ...d.handles });
      } else {
        setTwitterHandles({ ...DEFAULT_TWITTER_HANDLES });
      }
    } catch {
      setTwitterHandles({ ...DEFAULT_TWITTER_HANDLES });
    }
  }, []);

  const loadArchiveMeta = useCallback(async () => {
    try {
      const res = await fetch("/api/results-archive?limit=1");
      if (res.ok) {
        const d = await res.json() as { meta?: typeof archiveMeta };
        setArchiveMeta(d.meta ?? null);
      }
    } catch { /* ignore */ }
  }, []);

  async function ingestResults(days = 90) {
    setArchiveIngesting(true);
    setArchiveLog(`⏳ Ingestion ${days} jours…`);
    try {
      const res = await fetch(`/api/cron/ingest-results?days=${days}`);
      const d = await res.json() as { ok: boolean; ingested?: number; seasons?: string[]; error?: string };
      if (d.ok) {
        setArchiveLog(`✅ ${d.ingested} match(s) ingéré(s) — saisons : ${d.seasons?.join(", ") ?? "—"}`);
        loadArchiveMeta();
      } else {
        setArchiveLog(`❌ ${d.error ?? "Erreur inconnue"}`);
      }
    } catch (e) {
      setArchiveLog(`❌ ${String(e)}`);
    } finally {
      setArchiveIngesting(false);
    }
  }

  useEffect(() => {
    if (authed) {
      loadStatus(); loadHistorical(); loadTwitterConfig(); loadArchiveMeta();
      loadFanConfig();
    }
  }, [authed, loadStatus, loadHistorical, loadTwitterConfig, loadArchiveMeta, loadFanConfig]);

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthed(false);
  }

  async function importSeason(season: string, all = false) {
    const key = all ? "__all" : season;
    setHistImporting(h => ({ ...h, [key]: true }));
    setHistLog(all ? "⏳ Import de toutes les saisons…" : `⏳ Import ${season}…`);
    try {
      const res = await fetch("/api/admin/historical", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(all ? { all: true } : { season }),
      });
      const d = await res.json() as { results: Record<string, string>; totalFacts: number };
      const ok = Object.values(d.results ?? {}).filter(v => v.startsWith("OK")).length;
      setHistLog(`✅ ${ok} saison(s) importée(s) · ${d.totalFacts} faits générés`);
      loadHistorical();
    } catch {
      setHistLog("❌ Erreur réseau");
    } finally {
      setHistImporting(h => ({ ...h, [key]: false }));
    }
  }

  async function saveTwitterHandles() {
    setTwitterSaving(true);
    setTwitterLog("⏳ Sauvegarde…");
    try {
      const res = await fetch("/api/admin/twitter-config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles: twitterHandles }),
      });
      const d = await res.json() as { ok: boolean; saved: number; error?: string };
      if (d.ok) {
        setTwitterLog(`✅ ${d.saved} handle(s) sauvegardé(s) à ${new Date().toLocaleTimeString("fr-FR")}`);
        // Re-read from Firestore so the UI reflects what's actually stored
        loadTwitterConfig();
      } else {
        setTwitterLog(`❌ ${d.error ?? "Erreur inconnue"}`);
      }
    } catch (e) {
      setTwitterLog(`❌ ${String(e)}`);
    } finally {
      setTwitterSaving(false);
    }
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

            {/* ── Historique L1 ── */}
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"
                style={{ color: "#475569" }}>
                <ChartBar size={11}/> Historique Ligue 1
                <button onClick={loadHistorical} disabled={histLoading}
                  className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold hover:opacity-80"
                  style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" }}>
                  <ArrowsClockwise size={9} className={histLoading ? "animate-spin" : ""}/> Refresh
                </button>
              </h2>
              {histLog && (
                <p className="text-[9px] font-mono mb-2 px-2 py-1 rounded"
                  style={{ background: "rgba(255,255,255,0.03)", color: histLog.startsWith("✅") ? "#22c55e" : histLog.startsWith("❌") ? "#ef4444" : "#fbbf24" }}>
                  {histLog}
                </p>
              )}
              <div className="rounded-xl overflow-hidden mb-2" style={{ border: "1px solid #1e2d42" }}>
                {histLoading && !historical ? (
                  <div className="px-3 py-6 flex items-center justify-center">
                    <ArrowsClockwise size={14} className="animate-spin" style={{ color: "#6b7c96" }}/>
                  </div>
                ) : (
                  (historical?.seasons ?? []).map((season, i, arr) => {
                    const imp = historical?.imported[season];
                    return (
                      <div key={season} className="flex items-center gap-3 px-3 py-2"
                        style={{ background: "#0d1421", borderBottom: i < arr.length - 1 ? "1px solid #1e2d42" : "none" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold" style={{ color: "#e8edf5" }}>{season}</p>
                          {imp ? (
                            <p className="text-[9px]" style={{ color: "#475569" }}>
                              🏆 {imp.champion} · {imp.totalMatches} matchs
                            </p>
                          ) : (
                            <p className="text-[9px]" style={{ color: "#334155" }}>Non importé</p>
                          )}
                        </div>
                        {imp && <CheckCircle size={11} style={{ color: "#22c55e", flexShrink: 0 }}/>}
                        <button
                          onClick={() => importSeason(season)}
                          disabled={!!histImporting[season]}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-semibold hover:opacity-80 disabled:opacity-40 flex-shrink-0"
                          style={{ background: imp ? "rgba(34,197,94,0.08)" : "rgba(59,130,246,0.08)", border: `1px solid ${imp ? "rgba(34,197,94,0.2)" : "rgba(59,130,246,0.25)"}`, color: imp ? "#22c55e" : "#60a5fa" }}>
                          {histImporting[season]
                            ? <ArrowsClockwise size={8} className="animate-spin"/>
                            : <CloudArrowDown size={8}/>}
                          {imp ? "Ré-importer" : "Importer"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              <button
                onClick={() => importSeason("", true)}
                disabled={!!histImporting["__all"]}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold hover:opacity-80 disabled:opacity-40"
                style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}>
                {histImporting["__all"]
                  ? <ArrowsClockwise size={11} className="animate-spin"/>
                  : <CloudArrowDown size={11}/>}
                {histImporting["__all"] ? "Import en cours…" : "Tout importer (10 saisons)"}
              </button>
            </section>

            {/* ── Résultats archive ── */}
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"
                style={{ color: "#475569" }}>
                <Database size={11}/> Archive résultats (Firestore)
              </h2>
              <p className="text-[9px] mb-2" style={{ color: "#475569" }}>
                Stocke les résultats finalisés de L1 (ESPN) dans Firestore pour les requêter plus tard (stats équipe, saison, etc.).
                Cron automatique : tous les jours à 04:00 UTC.
              </p>
              <div className="rounded-xl p-3 mb-2 space-y-1" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
                {archiveMeta ? (
                  <>
                    <div className="flex justify-between text-[10px]">
                      <span style={{ color: "#64748b" }}>Dernière ingestion</span>
                      <span className="font-mono" style={{ color: "#94a3b8" }}>
                        {archiveMeta.lastRun ? new Date(archiveMeta.lastRun).toLocaleString("fr-FR") : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span style={{ color: "#64748b" }}>Matchs stockés</span>
                      <span className="font-mono font-black" style={{ color: "#22c55e" }}>{archiveMeta.count ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span style={{ color: "#64748b" }}>Fenêtre</span>
                      <span className="font-mono" style={{ color: "#94a3b8" }}>{archiveMeta.windowDays ?? 0} jours</span>
                    </div>
                    {archiveMeta.seasons && archiveMeta.seasons.length > 0 && (
                      <div className="flex justify-between text-[10px]">
                        <span style={{ color: "#64748b" }}>Saisons</span>
                        <span className="font-mono" style={{ color: "#94a3b8" }}>{archiveMeta.seasons.join(", ")}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-[10px]" style={{ color: "#475569" }}>Aucune ingestion encore effectuée.</p>
                )}
              </div>
              {archiveLog && (
                <p className="text-[9px] font-mono mb-2 px-2 py-1.5 rounded"
                  style={{ background: "rgba(255,255,255,0.03)", color: archiveLog.startsWith("✅") ? "#22c55e" : archiveLog.startsWith("❌") ? "#ef4444" : "#fbbf24" }}>
                  {archiveLog}
                </p>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => ingestResults(28)}
                  disabled={archiveIngesting}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold hover:opacity-80 disabled:opacity-40"
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>
                  {archiveIngesting ? <ArrowsClockwise size={10} className="animate-spin"/> : <CloudArrowDown size={10}/>}
                  Ingest 28j
                </button>
                <button
                  onClick={() => ingestResults(90)}
                  disabled={archiveIngesting}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold hover:opacity-80 disabled:opacity-40"
                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}>
                  {archiveIngesting ? <ArrowsClockwise size={10} className="animate-spin"/> : <CloudArrowDown size={10}/>}
                  Ingest 90j
                </button>
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
                      style={{ background: "#0d1421", border: `1px solid ${result ? (result.ok ? "rgba(34,197,94,0.25)" : result.knownBlocked ? "rgba(251,146,60,0.25)" : "rgba(239,68,68,0.25)") : "#1e2d42"}` }}>
                      {/* Row 1: name + status + link */}
                      <div className="flex items-center gap-2">
                        <StatusDot status={result ? (result.ok ? "ok" : result.knownBlocked ? "blocked" : "error") : src.status} />
                        <span className="text-[10px] font-semibold flex-1 truncate" style={{ color: "#e2e8f0" }}>{src.name}</span>
                        {result && (
                          <span className="text-[9px] font-mono flex-shrink-0" style={{ color: result.ok ? "#22c55e" : result.knownBlocked ? "#fb923c" : "#ef4444" }}>
                            {result.ok ? `${result.ms}ms` : result.knownBlocked ? "BLOQUÉ" : `HTTP ${result.status || "ERR"}`}
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
                      {/* Row 3: hint if error or known block */}
                      {result && !result.ok && result.hint && (
                        <p className="text-[8px] mt-1 font-mono px-1.5 py-0.5 rounded"
                          style={{
                            background: result.knownBlocked ? "rgba(251,146,60,0.08)" : "rgba(239,68,68,0.08)",
                            color: result.knownBlocked ? "#fb923c" : "#f87171",
                          }}>
                          {result.knownBlocked ? "ⓘ " : ""}{result.hint}
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

            {/* ── Twitter / X fan feed ── */}
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"
                style={{ color: "#475569" }}>
                <TwitterLogo size={11}/> Comptes Twitter / X fans
              </h2>
              <p className="text-[9px] mb-2" style={{ color: "#475569" }}>
                Handle Twitter pour chaque club (sans @). Laissez vide pour désactiver.
              </p>
              <div className="rounded-xl overflow-hidden mb-2" style={{ border: "1px solid #1e2d42" }}>
                {L1_CLUBS_ADMIN.map((club, i) => (
                  <div key={club.id} className="flex items-center gap-2 px-2.5 py-1.5"
                    style={{ background: "#0d1421", borderBottom: i < L1_CLUBS_ADMIN.length - 1 ? "1px solid #1e2d42" : "none" }}>
                    <span className="text-[10px] w-20 flex-shrink-0 truncate" style={{ color: "#94a3b8" }}>{club.name}</span>
                    <input
                      type="text"
                      placeholder="handle"
                      value={twitterHandles[String(club.id)] ?? ""}
                      onChange={e => setTwitterHandles(h => ({ ...h, [String(club.id)]: e.target.value }))}
                      className="flex-1 text-[10px] px-2 py-1 rounded-lg outline-none min-w-0"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1e2d42", color: "#e8edf5" }}
                    />
                  </div>
                ))}
              </div>
              {twitterLog && (
                <p className="text-[9px] font-mono mb-2" style={{ color: twitterLog.startsWith("✅") ? "#22c55e" : twitterLog.startsWith("❌") ? "#ef4444" : "#fbbf24" }}>
                  {twitterLog}
                </p>
              )}
              <button
                onClick={saveTwitterHandles}
                disabled={twitterSaving}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold hover:opacity-80 disabled:opacity-40"
                style={{ background: "rgba(29,161,242,0.08)", border: "1px solid rgba(29,161,242,0.25)", color: "#1da1f2" }}>
                {twitterSaving ? <ArrowsClockwise size={11} className="animate-spin"/> : <FloppyDisk size={11}/>}
                {twitterSaving ? "Sauvegarde…" : "Sauvegarder les handles"}
              </button>
            </section>

            {/* ── Fan ecosystem (Twitter ≥5, fan sites, hashtags) ── */}
            <section>
              <h2 className="text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"
                style={{ color: "#475569" }}>
                <Hash size={11}/> Écosystème fans (Twitter / Sites / Hashtags)
              </h2>
              <p className="text-[9px] mb-2" style={{ color: "#475569" }}>
                Pour chaque club Ligue 1, Ligue 2 et équipe nationale CdM 2026 : comptes X (min. 5, classés par taille), sites de fans et hashtags. Modifiable, repris partout dans l&apos;app.
              </p>
              <div className="flex gap-1.5 mb-2">
                {(["L1","L2","WC"] as const).map(sc => (
                  <button key={sc} onClick={() => { setFanScope(sc); setFanOpen(null); }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    style={{
                      background: fanScope===sc ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${fanScope===sc ? "#3b82f6" : "#1e2d42"}`,
                      color: fanScope===sc ? "#3b82f6" : "#94a3b8",
                    }}>
                    {sc==="L1" ? "Ligue 1 (18)" : sc==="L2" ? "Ligue 2 (18)" : "CdM 2026 (48)"}
                  </button>
                ))}
              </div>
              <div className="rounded-xl overflow-hidden mb-2" style={{ border:"1px solid #1e2d42" }}>
                {FAN_CATALOG_ROWS.filter(r => r.scope === fanScope).map((row, i, arr) => {
                  const entry = fanEntries[row.id] ?? row.defaults;
                  const open = fanOpen === row.id;
                  return (
                    <div key={row.id} style={{ background:"#0d1421", borderBottom: i<arr.length-1 ? "1px solid #1e2d42" : "none" }}>
                      <button onClick={() => setFanOpen(open ? null : row.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left">
                        {open ? <CaretDown size={10} style={{ color:"#94a3b8" }}/> : <CaretRight size={10} style={{ color:"#94a3b8" }}/>}
                        <span className="text-[10px] font-bold flex-1 truncate" style={{ color:"#e8edf5" }}>{row.label}</span>
                        <span className="text-[9px]" style={{ color:"#475569" }}>
                          {entry.twitter.length} X · {entry.sites.length} sites · {entry.hashtags.length} #
                        </span>
                      </button>
                      {open && (
                        <div className="px-2.5 pb-2.5 pt-1 space-y-2" style={{ borderTop:"1px dashed #1e2d42" }}>
                          {/* Twitter accounts */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color:"#1da1f2" }}>
                                Comptes X
                              </span>
                              <button onClick={() => updateFanEntry(row.id, {
                                twitter: [...entry.twitter, { handle:"", name:"", kind:"fan" }],
                              })} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background:"rgba(29,161,242,0.1)", color:"#1da1f2" }}>+ ajouter</button>
                            </div>
                            {entry.twitter.map((acc, idx) => (
                              <div key={idx} className="flex items-center gap-1 mb-1">
                                <input value={acc.handle} placeholder="handle"
                                  onChange={e => {
                                    const next = [...entry.twitter];
                                    next[idx] = { ...acc, handle: e.target.value.replace(/^@/, "") };
                                    updateFanEntry(row.id, { twitter: next });
                                  }}
                                  className="flex-1 min-w-0 text-[10px] px-1.5 py-1 rounded outline-none"
                                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #1e2d42", color:"#e8edf5" }}/>
                                <input value={acc.name} placeholder="nom"
                                  onChange={e => {
                                    const next = [...entry.twitter];
                                    next[idx] = { ...acc, name: e.target.value };
                                    updateFanEntry(row.id, { twitter: next });
                                  }}
                                  className="flex-1 min-w-0 text-[10px] px-1.5 py-1 rounded outline-none"
                                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #1e2d42", color:"#e8edf5" }}/>
                                <select value={acc.kind} onChange={e => {
                                  const next = [...entry.twitter];
                                  next[idx] = { ...acc, kind: e.target.value as FanAccount["kind"] };
                                  updateFanEntry(row.id, { twitter: next });
                                }} className="text-[10px] px-1 py-1 rounded outline-none"
                                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #1e2d42", color:"#e8edf5" }}>
                                  <option value="official">officiel</option>
                                  <option value="fan">fan</option>
                                  <option value="media">media</option>
                                  <option value="player">joueur</option>
                                </select>
                                <input value={acc.followers ?? ""} placeholder="fans"
                                  onChange={e => {
                                    const next = [...entry.twitter];
                                    next[idx] = { ...acc, followers: e.target.value };
                                    updateFanEntry(row.id, { twitter: next });
                                  }}
                                  className="w-12 text-[10px] px-1.5 py-1 rounded outline-none"
                                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #1e2d42", color:"#e8edf5" }}/>
                                <button onClick={() => updateFanEntry(row.id, {
                                  twitter: entry.twitter.filter((_, j) => j !== idx),
                                })} className="text-[9px] px-1 py-1 rounded" style={{ color:"#ef4444" }}>
                                  <Trash size={10}/>
                                </button>
                              </div>
                            ))}
                          </div>
                          {/* Fan sites */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color:"#22c55e" }}>
                                <GlobeIcon size={9} className="inline -mt-0.5 mr-1"/>Sites de fans
                              </span>
                              <button onClick={() => updateFanEntry(row.id, {
                                sites: [...entry.sites, { name:"", url:"" }],
                              })} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background:"rgba(34,197,94,0.1)", color:"#22c55e" }}>+ ajouter</button>
                            </div>
                            {entry.sites.map((site, idx) => (
                              <div key={idx} className="flex items-center gap-1 mb-1">
                                <input value={site.name} placeholder="nom"
                                  onChange={e => {
                                    const next = [...entry.sites];
                                    next[idx] = { ...site, name: e.target.value };
                                    updateFanEntry(row.id, { sites: next });
                                  }}
                                  className="w-32 text-[10px] px-1.5 py-1 rounded outline-none"
                                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #1e2d42", color:"#e8edf5" }}/>
                                <input value={site.url} placeholder="https://…"
                                  onChange={e => {
                                    const next = [...entry.sites];
                                    next[idx] = { ...site, url: e.target.value };
                                    updateFanEntry(row.id, { sites: next });
                                  }}
                                  className="flex-1 min-w-0 text-[10px] px-1.5 py-1 rounded outline-none"
                                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #1e2d42", color:"#e8edf5" }}/>
                                <button onClick={() => updateFanEntry(row.id, {
                                  sites: entry.sites.filter((_, j) => j !== idx),
                                })} className="text-[9px] px-1 py-1 rounded" style={{ color:"#ef4444" }}>
                                  <Trash size={10}/>
                                </button>
                              </div>
                            ))}
                          </div>
                          {/* Hashtags */}
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest block mb-1" style={{ color:"#f59e0b" }}>
                              Hashtags X (séparés par virgule)
                            </span>
                            <input value={entry.hashtags.join(", ")}
                              onChange={e => updateFanEntry(row.id, {
                                hashtags: e.target.value.split(",").map(h => h.trim()).filter(Boolean),
                              })}
                              className="w-full text-[10px] px-1.5 py-1 rounded outline-none"
                              style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #1e2d42", color:"#e8edf5" }}/>
                          </div>
                          <button onClick={() => resetFanEntry(row.id)}
                            className="text-[9px] px-2 py-1 rounded" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #1e2d42", color:"#94a3b8" }}>
                            ↺ Réinitialiser par défaut
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {fanLog && (
                <p className="text-[9px] font-mono mb-2" style={{ color: fanLog.startsWith("✅") ? "#22c55e" : fanLog.startsWith("❌") ? "#ef4444" : "#fbbf24" }}>
                  {fanLog}
                </p>
              )}
              <button onClick={saveFanConfig} disabled={fanSaving}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold hover:opacity-80 disabled:opacity-40"
                style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.25)", color:"#22c55e" }}>
                {fanSaving ? <ArrowsClockwise size={11} className="animate-spin"/> : <FloppyDisk size={11}/>}
                {fanSaving ? "Sauvegarde…" : "Sauvegarder l'écosystème fans"}
              </button>
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
