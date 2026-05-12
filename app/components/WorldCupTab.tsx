"use client";

import { useState } from "react";
import { Globe, MapPin, Calendar, Trophy, Users, Zap, ChevronDown, Flag } from "lucide-react";

const HOST_CITIES = [
  { city: "New York / New Jersey", country: "🇺🇸 USA", stadium: "MetLife Stadium", capacity: 82_500, note: "FINALE" },
  { city: "Los Angeles", country: "🇺🇸 USA", stadium: "SoFi Stadium", capacity: 70_240 },
  { city: "Dallas", country: "🇺🇸 USA", stadium: "AT&T Stadium", capacity: 80_000 },
  { city: "San Francisco Bay Area", country: "🇺🇸 USA", stadium: "Levi's Stadium", capacity: 68_500 },
  { city: "Miami", country: "🇺🇸 USA", stadium: "Hard Rock Stadium", capacity: 64_767 },
  { city: "Seattle", country: "🇺🇸 USA", stadium: "Lumen Field", capacity: 68_740 },
  { city: "Atlanta", country: "🇺🇸 USA", stadium: "Mercedes-Benz Stadium", capacity: 71_000 },
  { city: "Boston", country: "🇺🇸 USA", stadium: "Gillette Stadium", capacity: 65_878 },
  { city: "Houston", country: "🇺🇸 USA", stadium: "NRG Stadium", capacity: 72_220 },
  { city: "Kansas City", country: "🇺🇸 USA", stadium: "Arrowhead Stadium", capacity: 76_416 },
  { city: "Philadelphia", country: "🇺🇸 USA", stadium: "Lincoln Financial Field", capacity: 69_176 },
  { city: "Mexico City", country: "🇲🇽 Mexique", stadium: "Estadio Azteca", capacity: 87_523, note: "MATCH D'OUVERTURE" },
  { city: "Guadalajara", country: "🇲🇽 Mexique", stadium: "Estadio Akron", capacity: 49_850 },
  { city: "Monterrey", country: "🇲🇽 Mexique", stadium: "Estadio BBVA", capacity: 51_350 },
  { city: "Toronto", country: "🇨🇦 Canada", stadium: "BMO Field", capacity: 45_000 },
  { city: "Vancouver", country: "🇨🇦 Canada", stadium: "BC Place", capacity: 54_500 },
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

const FORMAT_STEPS = [
  { step: 1, label: "48 équipes qualifiées", desc: "Record historique (vs 32 en 2022)", icon: <Users size={16} />, color: "#00d4ff" },
  { step: 2, label: "12 groupes de 4", desc: "Top 2 de chaque groupe + 8 meilleurs 3es qualifiés = 32 équipes", icon: <Trophy size={16} />, color: "#22c55e" },
  { step: 3, label: "Huitièmes de finale", desc: "32 équipes → 16 équipes (matchs à élimination directe)", icon: <Zap size={16} />, color: "#f59e0b" },
  { step: 4, label: "Quarts, Demis, Finale", desc: "Format classique jusqu'à la grande finale à MetLife Stadium", icon: <Flag size={16} />, color: "#f97316" },
];

const KEY_FACTS = [
  { label: "Édition", value: "23e Coupe du Monde FIFA" },
  { label: "Équipes", value: "48" },
  { label: "Matchs", value: "104" },
  { label: "Pays organisateurs", value: "USA · Canada · Mexique" },
  { label: "Villes hôtes", value: "16" },
  { label: "Durée", value: "39 jours" },
  { label: "Finale", value: "MetLife Stadium, NJ" },
  { label: "Tenant du titre", value: "🇦🇷 Argentine" },
];

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ border: "1px solid #1e2d42" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]">
        <p className="font-bold text-sm" style={{ color: "#e8edf5" }}>{title}</p>
        <ChevronDown size={15} style={{ color: "#6b7c96" }} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function WorldCupTab() {
  return (
    <div>
      {/* Hero */}
      <div className="rounded-2xl p-6 mb-6 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.08), rgba(124,58,237,0.08), rgba(234,179,8,0.08))", border: "1px solid rgba(0,212,255,0.2)" }}>
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-5xl">🌍</span>
            <div>
              <h2 className="text-2xl font-black tracking-tight" style={{ color: "#e8edf5" }}>
                COUPE DU MONDE 2026
              </h2>
              <p className="text-sm font-semibold mt-0.5" style={{ color: "#00d4ff" }}>
                FIFA World Cup™ · USA · Canada · Mexique
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}>
              <Calendar size={11} /> 11 juin – 19 juillet 2026
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.25)", color: "#00d4ff" }}>
              <Users size={11} /> 48 équipes
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.25)", color: "#eab308" }}>
              <Trophy size={11} /> 104 matchs
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}>
              <MapPin size={11} /> 16 stades
            </div>
          </div>
        </div>
      </div>

      {/* Key facts grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {KEY_FACTS.map((f) => (
          <div key={f.label} className="rounded-2xl px-4 py-3 text-center"
            style={{ background: "#0d1421", border: "1px solid #1e2d42" }}>
            <p className="text-base font-black" style={{ color: "#e8edf5" }}>{f.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>{f.label}</p>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <Accordion title="📅 Calendrier officiel" defaultOpen={true}>
        <div className="mt-4 space-y-2">
          {SCHEDULE.map((s) => (
            <div key={s.phase} className="flex items-center gap-4 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${s.color}20` }}>
              <span className="text-xl flex-shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: s.color }}>{s.phase}</p>
                <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#6b7c96" }}>
                  <Calendar size={10} /> {s.dates}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Accordion>

      {/* Format */}
      <Accordion title="⚽ Format du tournoi" defaultOpen={true}>
        <div className="mt-4 space-y-3">
          {FORMAT_STEPS.map((s) => (
            <div key={s.step} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}12`, border: `1px solid ${s.color}25`, color: s.color }}>
                {s.icon}
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm font-bold" style={{ color: "#e8edf5" }}>{s.label}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#6b7c96" }}>{s.desc}</p>
              </div>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${s.color}15`, color: s.color, fontSize: 13, fontWeight: 900 }}>
                {s.step}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 px-4 py-3 rounded-xl text-xs leading-relaxed"
          style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)", color: "#94a3b8" }}>
          <p className="font-semibold mb-1" style={{ color: "#00d4ff" }}>Règle des 3es places</p>
          <p>Dans les 12 groupes, les 8 meilleurs équipes classées 3es (sur 12) se qualifient pour les huitièmes de finale. Le classement se fait par points, puis différence de buts, puis buts marqués.</p>
        </div>
      </Accordion>

      {/* Venues */}
      <Accordion title="🏟️ Stades et villes hôtes">
        <div className="mt-4 grid sm:grid-cols-2 gap-2">
          {HOST_CITIES.map((c) => (
            <div key={c.city} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${c.note ? "rgba(234,179,8,0.3)" : "rgba(255,255,255,0.06)"}` }}>
              <div className="flex-shrink-0">
                <MapPin size={14} style={{ color: c.note ? "#eab308" : "#6b7c96" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold truncate" style={{ color: "#e8edf5" }}>{c.city}</p>
                  {c.note && (
                    <span className="text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                      style={{ background: "rgba(234,179,8,0.15)", color: "#eab308" }}>
                      {c.note}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>
                  {c.country} · {c.stadium}
                </p>
                <p className="text-xs font-mono" style={{ color: "#00d4ff" }}>
                  {c.capacity.toLocaleString("fr-FR")} places
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {[
            { flag: "🇺🇸", country: "USA", count: 11 },
            { flag: "🇲🇽", country: "Mexique", count: 3 },
            { flag: "🇨🇦", country: "Canada", count: 2 },
          ].map((h) => (
            <div key={h.country} className="rounded-xl py-3"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-2xl">{h.flag}</p>
              <p className="text-sm font-bold mt-1" style={{ color: "#e8edf5" }}>{h.country}</p>
              <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>{h.count} stade{h.count > 1 ? "s" : ""}</p>
            </div>
          ))}
        </div>
      </Accordion>

      {/* France */}
      <Accordion title="🇫🇷 Les Bleus à la Coupe du Monde">
        <div className="mt-4 space-y-3">
          <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)" }}>
            <p className="text-sm font-bold mb-1" style={{ color: "#00d4ff" }}>Qualifications</p>
            <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>
              La France s'est qualifiée via les éliminatoires UEFA. Championne du monde en 1998 et 2018,
              finaliste en 2022 (défaite aux tirs au but contre l'Argentine), l'équipe de France fait partie
              des grands favoris.
            </p>
          </div>

          <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.12)" }}>
            <p className="text-sm font-bold mb-1" style={{ color: "#22c55e" }}>Palmarès</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: "Titres", value: "2 (1998, 2018)" },
                { label: "Finales", value: "3 (+ 2006, 2022)" },
                { label: "Participations", value: "16" },
                { label: "Meilleur buteur", value: "Thierry Henry (6 buts)" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <p style={{ color: "#6b7c96" }}>{s.label}</p>
                  <p className="font-bold mt-0.5" style={{ color: "#e8edf5" }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(234,179,8,0.04)", border: "1px solid rgba(234,179,8,0.12)" }}>
            <p className="text-sm font-bold mb-2" style={{ color: "#eab308" }}>Joueurs clés à surveiller</p>
            <div className="space-y-1.5">
              {[
                { name: "Kylian Mbappé", role: "Attaquant – Capitaine / Real Madrid" },
                { name: "Antoine Griezmann", role: "Milieu offensif – Record de sélections" },
                { name: "Aurélien Tchouaméni", role: "Milieu défensif – Real Madrid" },
                { name: "William Saliba", role: "Défenseur central – Arsenal" },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#eab308" }} />
                  <span className="text-xs font-bold" style={{ color: "#e8edf5" }}>{p.name}</span>
                  <span className="text-xs" style={{ color: "#6b7c96" }}>{p.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Accordion>

      {/* Big teams */}
      <Accordion title="🌟 Principaux favoris">
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {[
            { flag: "🇦🇷", name: "Argentine", desc: "Tenant du titre. Messi (incertain), Lautaro, Di María.", color: "#00d4ff" },
            { flag: "🇫🇷", name: "France", desc: "Finaliste 2022. Mbappé, Griezmann, Saliba.", color: "#22c55e" },
            { flag: "🇧🇷", name: "Brésil", desc: "5 fois champion du monde. Vinicius Jr, Rodrygo, Endrick.", color: "#f59e0b" },
            { flag: "🇪🇸", name: "Espagne", desc: "Champion d'Europe 2024. Yamal, Pedri, Morata.", color: "#f97316" },
            { flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", name: "Angleterre", desc: "Jude Bellingham, Saka, Kane.", color: "#a78bfa" },
            { flag: "🇩🇪", name: "Allemagne", desc: "4 fois champion. Florian Wirtz, Müller.", color: "#ef4444" },
          ].map((t) => (
            <div key={t.name} className="flex items-start gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${t.color}20` }}>
              <span className="text-2xl flex-shrink-0">{t.flag}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: t.color }}>{t.name}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#94a3b8" }}>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Accordion>

      {/* Footer */}
      <div className="mt-4 text-center">
        <p className="text-xs" style={{ color: "#6b7c96" }}>
          Source : FIFA · Informations susceptibles d'être mises à jour
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Globe size={11} style={{ color: "#6b7c96" }} />
          <a href="https://www.fifa.com/fifaplus/fr/tournaments/mens/worldcup/canadamexicousa2026"
            target="_blank" rel="noopener noreferrer"
            className="text-xs hover:opacity-80 transition-opacity"
            style={{ color: "#00d4ff" }}>
            fifa.com/worldcup2026
          </a>
        </div>
      </div>
    </div>
  );
}
