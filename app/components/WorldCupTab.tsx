"use client";

import { useState } from "react";
import { Calendar, Trophy, Users, MapPin, Globe } from "lucide-react";

// ─── Data ──────────────────────────────────────────────────────────────────

const GROUPS = [
  { letter: "A", teams: ["🇦🇷 Argentine", "🇨🇱 Chili", "🇵🇪 Pérou", "🇦🇺 Australie"] },
  { letter: "B", teams: ["🇲🇽 Mexique ★", "🇯🇲 Jamaïque", "🇻🇪 Venezuela", "🇪🇨 Équateur"] },
  { letter: "C", teams: ["🇺🇸 USA ★", "🇵🇦 Panama", "🇨🇺 Cuba", "🇳🇿 Nouvelle-Zélande"] },
  { letter: "D", teams: ["🇨🇦 Canada ★", "🇭🇳 Honduras", "🇺🇾 Uruguay", "🇵🇹 Portugal"] },
  { letter: "E", teams: ["🇪🇸 Espagne", "🇲🇦 Maroc", "🇧🇪 Belgique", "🇯🇵 Japon"] },
  { letter: "F", teams: ["🇫🇷 France", "🇸🇦 Arabie Saoudite", "🇨🇭 Suisse", "🇩🇿 Algérie"] },
  { letter: "G", teams: ["🇧🇷 Brésil", "🇨🇴 Colombie", "🇵🇾 Paraguay", "🇨🇲 Cameroun"] },
  { letter: "H", teams: ["🇩🇪 Allemagne", "🇳🇱 Pays-Bas", "🇵🇱 Pologne", "🇷🇸 Serbie"] },
  { letter: "I", teams: ["🏴󠁧󠁢󠁥󠁮󠁧󠁿 Angleterre", "🇸🇳 Sénégal", "🇹🇳 Tunisie", "🇨🇷 Costa Rica"] },
  { letter: "J", teams: ["🇮🇹 Italie", "🇭🇷 Croatie", "🇷🇴 Roumanie", "🇦🇴 Angola"] },
  { letter: "K", teams: ["🇺🇦 Ukraine", "🇬🇭 Ghana", "🇿🇦 Afrique du Sud", "🇨🇩 RD Congo"] },
  { letter: "L", teams: ["🇰🇷 Corée du Sud", "🇨🇮 Côte d'Ivoire", "🇿🇼 Zimbabwe", "🇰🇪 Kenya"] },
];

const SCHEDULE = [
  { phase: "Match d'ouverture", dates: "11 juin 2026", icon: "🚀", color: "#00d4ff" },
  { phase: "Phase de groupes", dates: "12 juin – 2 juillet 2026", icon: "⚽", color: "#22c55e" },
  { phase: "Huitièmes de finale", dates: "4 – 7 juillet 2026", icon: "🏆", color: "#f59e0b" },
  { phase: "Quarts de finale", dates: "9 – 12 juillet 2026", icon: "⭐", color: "#f97316" },
  { phase: "Demi-finales", dates: "14 – 15 juillet 2026", icon: "🔥", color: "#ef4444" },
  { phase: "Match pour la 3e place", dates: "18 juillet 2026", icon: "🥉", color: "#a78bfa" },
  { phase: "FINALE", dates: "19 juillet 2026", icon: "🏆", color: "#fbbf24" },
];

const NOTABLE_MATCHES = [
  { date: "11 juin", teams: "🇲🇽 Mexique vs 🇪🇨 Équateur", group: "Groupe B", venue: "Azteca, Mexico City", note: "MATCH D'OUVERTURE", highlight: "#fbbf24" },
  { date: "12 juin", teams: "🇺🇸 USA vs 🇵🇦 Panama", group: "Groupe C", venue: "USA", note: null, highlight: null },
  { date: "13 juin", teams: "🇦🇷 Argentine vs 🇨🇱 Chili", group: "Groupe A", venue: "USA", note: null, highlight: null },
  { date: "14 juin", teams: "🇫🇷 France vs 🇸🇦 Arabie Saoudite", group: "Groupe F", venue: "USA", note: "J1 France", highlight: "#22c55e" },
  { date: "15 juin", teams: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Angleterre vs 🇸🇳 Sénégal", group: "Groupe I", venue: "USA", note: null, highlight: null },
  { date: "15 juin", teams: "🇪🇸 Espagne vs 🇲🇦 Maroc", group: "Groupe E", venue: "USA", note: null, highlight: null },
  { date: "16 juin", teams: "🇧🇷 Brésil vs 🇨🇴 Colombie", group: "Groupe G", venue: "USA", note: null, highlight: null },
  { date: "16 juin", teams: "🇩🇪 Allemagne vs 🇳🇱 Pays-Bas", group: "Groupe H", venue: "USA", note: null, highlight: null },
  { date: "17 juin", teams: "🇨🇦 Canada vs 🇭🇳 Honduras", group: "Groupe D", venue: "Canada", note: null, highlight: null },
  { date: "20 juin", teams: "🇫🇷 France vs 🇨🇭 Suisse", group: "Groupe F", venue: "USA", note: "J2 France", highlight: "#22c55e" },
  { date: "25 juin", teams: "🇫🇷 France vs 🇩🇿 Algérie", group: "Groupe F", venue: "USA", note: "J3 France 🔥", highlight: "#ef4444" },
];

// ─── Sub-tabs ───────────────────────────────────────────────────────────────

type SubTab = "groupes" | "calendrier" | "france" | "favoris";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "groupes", label: "Groupes" },
  { id: "calendrier", label: "Calendrier" },
  { id: "france", label: "🇫🇷 France" },
  { id: "favoris", label: "Favoris" },
];

// ─── Groupes tab ────────────────────────────────────────────────────────────

function GroupesTab() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {GROUPS.map((g) => (
        <div
          key={g.letter}
          className="rounded-xl px-3 py-2.5"
          style={{ background: "#0d1421", border: "1px solid #1e2d42" }}
        >
          <p
            className="text-xs font-black tracking-widest mb-1.5"
            style={{ color: "#00d4ff" }}
          >
            GROUPE {g.letter}
          </p>
          <div className="space-y-1">
            {g.teams.map((team) => (
              <div
                key={team}
                className="text-xs py-0.5"
                style={{ color: "#c8d4e3" }}
              >
                {team}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Calendrier tab ─────────────────────────────────────────────────────────

function CalendrierTab() {
  return (
    <div className="space-y-4">
      {/* Phases */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7c96" }}>
          Phases du tournoi
        </p>
        <div className="space-y-1.5">
          {SCHEDULE.map((s) => (
            <div
              key={s.phase}
              className="flex items-center gap-3 px-3 py-2 rounded-xl"
              style={{ background: "#0d1421", border: `1px solid ${s.color}20` }}
            >
              <span className="text-base flex-shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold mr-2" style={{ color: s.color }}>
                  {s.phase}
                </span>
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: "#6b7c96" }}>
                {s.dates}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Notable matches */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#6b7c96" }}>
          Matchs à suivre
        </p>
        <div className="space-y-1.5">
          {NOTABLE_MATCHES.map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 rounded-xl"
              style={{
                background: "#0d1421",
                border: `1px solid ${m.highlight ? m.highlight + "30" : "#1e2d42"}`,
              }}
            >
              <span
                className="text-xs font-mono flex-shrink-0 w-12"
                style={{ color: "#6b7c96" }}
              >
                {m.date}
              </span>
              <span className="text-xs font-semibold flex-1 min-w-0 truncate" style={{ color: "#e8edf5" }}>
                {m.teams}
              </span>
              <span className="text-xs flex-shrink-0" style={{ color: "#4b5d73" }}>
                {m.group}
              </span>
              {m.note && (
                <span
                  className="text-xs font-bold flex-shrink-0 px-1.5 py-0.5 rounded"
                  style={{
                    background: (m.highlight ?? "#6b7c96") + "18",
                    color: m.highlight ?? "#6b7c96",
                  }}
                >
                  {m.note}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── France tab ─────────────────────────────────────────────────────────────

function FranceTab() {
  return (
    <div className="space-y-3">
      {/* Group F */}
      <div className="px-3 py-2.5 rounded-xl" style={{ background: "#0d1421", border: "1px solid rgba(34,197,94,0.2)" }}>
        <p className="text-xs font-bold mb-1.5" style={{ color: "#22c55e" }}>Groupe F</p>
        <div className="space-y-1">
          {GROUPS.find((g) => g.letter === "F")!.teams.map((t) => (
            <div
              key={t}
              className="text-xs py-0.5"
              style={{ color: t.startsWith("🇫🇷") ? "#e8edf5" : "#94a3b8", fontWeight: t.startsWith("🇫🇷") ? 700 : 400 }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Palmarès */}
      <div className="px-3 py-2.5 rounded-xl" style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
        <p className="text-xs font-bold mb-1.5" style={{ color: "#eab308" }}>Palmarès</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "Titres", value: "2 (1998, 2018)" },
            { label: "Finales", value: "3 (+ 2006, 2022)" },
            { label: "Participations", value: "16" },
            { label: "Meilleur buteur", value: "T. Henry (6)" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg px-2 py-1.5" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-xs" style={{ color: "#6b7c96" }}>{s.label}</p>
              <p className="text-xs font-bold mt-0.5" style={{ color: "#e8edf5" }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Joueurs clés */}
      <div className="px-3 py-2.5 rounded-xl" style={{ background: "#0d1421", border: "1px solid rgba(234,179,8,0.15)" }}>
        <p className="text-xs font-bold mb-1.5" style={{ color: "#eab308" }}>Joueurs clés</p>
        <div className="space-y-1.5">
          {[
            { name: "Kylian Mbappé", role: "Attaquant – Capitaine, Real Madrid" },
            { name: "Antoine Griezmann", role: "Milieu offensif – Record sélections" },
            { name: "Aurélien Tchouaméni", role: "Milieu défensif – Real Madrid" },
            { name: "William Saliba", role: "Défenseur central – Arsenal" },
          ].map((p) => (
            <div key={p.name} className="flex items-baseline gap-2">
              <div className="w-1 h-1 rounded-full flex-shrink-0 mt-1.5" style={{ background: "#eab308" }} />
              <span className="text-xs font-bold" style={{ color: "#e8edf5" }}>{p.name}</span>
              <span className="text-xs" style={{ color: "#6b7c96" }}>{p.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Matchs France */}
      <div className="px-3 py-2.5 rounded-xl" style={{ background: "#0d1421", border: "1px solid rgba(0,212,255,0.15)" }}>
        <p className="text-xs font-bold mb-1.5" style={{ color: "#00d4ff" }}>Calendrier France</p>
        <div className="space-y-1.5">
          {NOTABLE_MATCHES.filter((m) => m.teams.includes("🇫🇷")).map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-mono w-12 flex-shrink-0" style={{ color: "#6b7c96" }}>{m.date}</span>
              <span className="text-xs font-semibold flex-1" style={{ color: "#e8edf5" }}>{m.teams}</span>
              {m.note && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ background: (m.highlight ?? "#6b7c96") + "18", color: m.highlight ?? "#6b7c96" }}
                >
                  {m.note}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Favoris tab ────────────────────────────────────────────────────────────

function FavorisTab() {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {[
        { flag: "🇦🇷", name: "Argentine", desc: "Tenant du titre. Lautaro, Di María.", color: "#00d4ff" },
        { flag: "🇫🇷", name: "France", desc: "Finaliste 2022. Mbappé, Griezmann.", color: "#22c55e" },
        { flag: "🇧🇷", name: "Brésil", desc: "5× champion. Vinicius Jr, Endrick.", color: "#f59e0b" },
        { flag: "🇪🇸", name: "Espagne", desc: "Champion d'Europe 2024. Yamal, Pedri.", color: "#f97316" },
        { flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", name: "Angleterre", desc: "Bellingham, Saka, Kane.", color: "#a78bfa" },
        { flag: "🇩🇪", name: "Allemagne", desc: "4× champion. Florian Wirtz, Müller.", color: "#ef4444" },
        { flag: "🇵🇹", name: "Portugal", desc: "Ronaldo, Félix, Leão. Groupe D.", color: "#fbbf24" },
        { flag: "🇲🇦", name: "Maroc", desc: "Demi-finaliste 2022. En Nesyri.", color: "#f472b6" },
      ].map((t) => (
        <div
          key={t.name}
          className="flex items-center gap-3 px-3 py-2 rounded-xl"
          style={{ background: "#0d1421", border: `1px solid ${t.color}20` }}
        >
          <span className="text-xl flex-shrink-0">{t.flag}</span>
          <div className="min-w-0">
            <p className="text-xs font-bold" style={{ color: t.color }}>{t.name}</p>
            <p className="text-xs mt-0.5 leading-snug" style={{ color: "#6b7c96" }}>{t.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function WorldCupTab() {
  const [activeTab, setActiveTab] = useState<SubTab>("groupes");

  return (
    <div>
      {/* Slim header */}
      <div
        className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl mb-3"
        style={{ background: "#0d1421", border: "1px solid #1e2d42" }}
      >
        <span className="text-base">🌍</span>
        <span className="text-sm font-black tracking-tight" style={{ color: "#e8edf5" }}>
          Coupe du Monde 2026
        </span>
        <div className="flex flex-wrap gap-1.5 ml-auto">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <Calendar size={10} className="inline mr-1" />11 juin – 19 juil 2026
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "rgba(0,212,255,0.1)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.2)" }}
          >
            <Users size={10} className="inline mr-1" />48 équipes
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "rgba(234,179,8,0.1)", color: "#eab308", border: "1px solid rgba(234,179,8,0.2)" }}
          >
            <Trophy size={10} className="inline mr-1" />104 matchs
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}
          >
            <MapPin size={10} className="inline mr-1" />16 stades
          </span>
        </div>
      </div>

      {/* Sub-tab bar */}
      <div className="flex gap-1.5 mb-3">
        {SUB_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: active ? "#00d4ff" : "#0d1421",
                color: active ? "#080c14" : "#6b7c96",
                border: `1px solid ${active ? "#00d4ff" : "#1e2d42"}`,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "groupes" && <GroupesTab />}
      {activeTab === "calendrier" && <CalendrierTab />}
      {activeTab === "france" && <FranceTab />}
      {activeTab === "favoris" && <FavorisTab />}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        <Globe size={11} style={{ color: "#6b7c96" }} />
        <a
          href="https://www.fifa.com/fifaplus/fr/tournaments/mens/worldcup/canadamexicousa2026"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs hover:opacity-80 transition-opacity"
          style={{ color: "#00d4ff" }}
        >
          fifa.com/worldcup2026
        </a>
        <span className="text-xs" style={{ color: "#4b5d73" }}>· Source FIFA</span>
      </div>
    </div>
  );
}
