"use client";

import { useState } from "react";
import { CaretDown, CaretUp, Star, MagnifyingGlass } from "@phosphor-icons/react";

interface WCReferee {
  id: string;
  name: string;
  nationality: string;
  flag: string;
  confederation: "UEFA" | "CONMEBOL" | "CONCACAF" | "AFC" | "CAF" | "OFC";
  notable: string;
  age: number;
}

const WC_REFEREES: WCReferee[] = [
  // UEFA (15)
  { id: "marciniak",   name: "Szymon Marciniak",            nationality: "Pologne",       flag: "🇵🇱", confederation: "UEFA",     age: 44, notable: "Finale CDM 2022 (Argentine-France). Finale LdC 2023. Seul arbitre à avoir officié les deux finales la même saison." },
  { id: "oliver",      name: "Michael Oliver",               nationality: "Angleterre",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", confederation: "UEFA",     age: 40, notable: "Finale LdC 2019. Premier Mondial pour Oliver. Référence de la Premier League." },
  { id: "taylor-a",    name: "Anthony Taylor",               nationality: "Angleterre",    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", confederation: "UEFA",     age: 45, notable: "Finale Europa League 2023 (Séville-AS Roma). Arbitre Premier League de référence." },
  { id: "turpin",      name: "Clément Turpin",               nationality: "France",        flag: "🇫🇷", confederation: "UEFA",     age: 43, notable: "Finale LdC 2022 (Liverpool-Real Madrid). Finale UEL 2021. Meilleur arbitre mondial IFFHS 2025. Arbitre de Ligue 1." },
  { id: "letexier",    name: "François Letexier",            nationality: "France",        flag: "🇫🇷", confederation: "UEFA",     age: 36, notable: "Finale Euro 2024 (Espagne-Angleterre). Plus jeune arbitre à officier une finale d'Euro (35 ans). Arbitre de Ligue 1." },
  { id: "makkelie",    name: "Danny Makkelie",               nationality: "Pays-Bas",      flag: "🇳🇱", confederation: "UEFA",     age: 42, notable: "Présent à l'Euro 2020 et 2024. Régulièrement désigné pour les affiches LdC." },
  { id: "zwayer",      name: "Felix Zwayer",                 nationality: "Allemagne",     flag: "🇩🇪", confederation: "UEFA",     age: 43, notable: "Référence de la Bundesliga. Régulier en LdC." },
  { id: "kovacs",      name: "István Kovács",                nationality: "Roumanie",      flag: "🇷🇴", confederation: "UEFA",     age: 40, notable: "Un des arbitres UEFA les plus actifs en Ligue des Champions." },
  { id: "mariani",     name: "Maurizio Mariani",             nationality: "Italie",        flag: "🇮🇹", confederation: "UEFA",     age: 44, notable: "Arbitre Serie A et UEFA. Plusieurs grandes affiches de Ligue des Champions." },
  { id: "nyberg",      name: "Glenn Nyberg",                 nationality: "Suède",         flag: "🇸🇪", confederation: "UEFA",     age: 39, notable: "Arbitre UEFA élite. Actif en LdC et compétitions internationales." },
  { id: "pinheiro",    name: "João Pinheiro",                nationality: "Portugal",      flag: "🇵🇹", confederation: "UEFA",     age: 38, notable: "Arbitre FIFA portugais. Régulier en UEFA." },
  { id: "hernandez",   name: "Alejandro Hernández",          nationality: "Espagne",       flag: "🇪🇸", confederation: "UEFA",     age: 43, notable: "Arbitre LaLiga. Désigné pour des matchs UCL et EURO." },
  { id: "vincic",      name: "Slavko Vinčič",                nationality: "Slovénie",      flag: "🇸🇮", confederation: "UEFA",     age: 42, notable: "Présent à l'Euro 2020. Arbitre européen de référence." },
  { id: "eskas",       name: "Espen Eskås",                  nationality: "Norvège",       flag: "🇳🇴", confederation: "UEFA",     age: 38, notable: "Arbitre international nordique. Actif en UEFA depuis plusieurs années." },
  { id: "schaerer",    name: "Sandro Schärer",               nationality: "Suisse",        flag: "🇨🇭", confederation: "UEFA",     age: 41, notable: "Arbitre UEFA élite. Désigné régulièrement en UEL et LdC." },
  // CONMEBOL (12)
  { id: "claus",       name: "Raphael Claus",                nationality: "Brésil",        flag: "🇧🇷", confederation: "CONMEBOL", age: 45, notable: "Finale Copa América 2024. Présent à la CDM 2022. Un des meilleurs arbitres sud-américains." },
  { id: "sampaio",     name: "Wilton Sampaio",               nationality: "Brésil",        flag: "🇧🇷", confederation: "CONMEBOL", age: 44, notable: "CDM 2022. Copa América. Arbitre FIFA expérimenté." },
  { id: "abatti",      name: "Ramon Abatti",                 nationality: "Brésil",        flag: "🇧🇷", confederation: "CONMEBOL", age: 39, notable: "Arbitre Série A brésilienne. Premier Mondial." },
  { id: "tello",       name: "Facundo Tello",                nationality: "Argentine",     flag: "🇦🇷", confederation: "CONMEBOL", age: 37, notable: "Un des arbitres argentins les plus actifs en CONMEBOL et FIFA. Copa América." },
  { id: "falcon",      name: "Yael Falcón Pérez",            nationality: "Argentine",     flag: "🇦🇷", confederation: "CONMEBOL", age: 42, notable: "Arbitre FIFA argentin. Actif en Copa Libertadores." },
  { id: "herrera",     name: "Darío Herrera",                nationality: "Argentine",     flag: "🇦🇷", confederation: "CONMEBOL", age: 38, notable: "Arbitre argentin international. Copa Libertadores et qualifications Mondial." },
  { id: "valenzuela",  name: "Jesús Valenzuela",             nationality: "Venezuela",     flag: "🇻🇪", confederation: "CONMEBOL", age: 42, notable: "CDM 2022. Un des arbitres CONMEBOL les plus expérimentés." },
  { id: "ortega",      name: "Kevin Ortega",                 nationality: "Pérou",         flag: "🇵🇪", confederation: "CONMEBOL", age: 40, notable: "Arbitre FIFA péruvien. Actif en Copa Libertadores." },
  { id: "tejera",      name: "Gustavo Tejera",               nationality: "Uruguay",       flag: "🇺🇾", confederation: "CONMEBOL", age: 41, notable: "Arbitre international uruguayen. Copa Libertadores." },
  { id: "rojas",       name: "Andrés Rojas",                 nationality: "Colombie",      flag: "🇨🇴", confederation: "CONMEBOL", age: 39, notable: "Arbitre FIFA colombien. Copa Libertadores." },
  { id: "benitez",     name: "Juan Gabriel Benítez",         nationality: "Paraguay",      flag: "🇵🇾", confederation: "CONMEBOL", age: 40, notable: "Arbitre FIFA paraguayen. Actif sur la scène continentale." },
  { id: "garay",       name: "Cristián Garay",               nationality: "Chili",         flag: "🇨🇱", confederation: "CONMEBOL", age: 38, notable: "Arbitre FIFA chilien. Copa Libertadores." },
  // CONCACAF (9)
  { id: "elfath",      name: "Ismail Elfath",                nationality: "États-Unis",    flag: "🇺🇸", confederation: "CONCACAF", age: 41, notable: "Arbitre MLS et FIFA. Représentant du pays hôte. CONCACAF Champions Cup." },
  { id: "penso",       name: "Tori Penso",                   nationality: "États-Unis",    flag: "🇺🇸", confederation: "CONCACAF", age: 40, notable: "Première Américaine à arbitrer en MLS masculine (2022). Arbitre FIFA internationale." },
  { id: "ramos",       name: "César Arturo Ramos",           nationality: "Mexique",       flag: "🇲🇽", confederation: "CONCACAF", age: 44, notable: "CDM 2022. Un des meilleurs arbitres mexicains. Pays hôte." },
  { id: "garcia-k",    name: "Katia Itzel García",           nationality: "Mexique",       flag: "🇲🇽", confederation: "CONCACAF", age: 37, notable: "Arbitre mexicaine internationale. Représentante féminine de CONCACAF. Pays hôte." },
  { id: "fischer",     name: "Drew Fischer",                 nationality: "Canada",        flag: "🇨🇦", confederation: "CONCACAF", age: 43, notable: "Arbitre canadien. Actif en MLS et CONCACAF. Pays hôte." },
  { id: "martinez",    name: "Saíd Martínez",               nationality: "Honduras",      flag: "🇭🇳", confederation: "CONCACAF", age: 41, notable: "Arbitre FIFA hondurien. Actif en CONCACAF." },
  { id: "calderon",    name: "Juan Gabriel Calderón",        nationality: "Costa Rica",    flag: "🇨🇷", confederation: "CONCACAF", age: 40, notable: "Arbitre FIFA costa-ricain. Copa Centroamericana et CONCACAF Gold Cup." },
  { id: "barton",      name: "Iván Barton",                  nationality: "El Salvador",   flag: "🇸🇻", confederation: "CONCACAF", age: 42, notable: "CDM 2022. Expérience internationale éprouvée." },
  { id: "nation",      name: "Oshane Nation",                nationality: "Jamaïque",      flag: "🇯🇲", confederation: "CONCACAF", age: 38, notable: "Arbitre FIFA jamaïcain. Actif en CONCACAF." },
  // AFC (8)
  { id: "al-jassim",   name: "Abdulrahman Al-Jassim",        nationality: "Qatar",         flag: "🇶🇦", confederation: "AFC",      age: 37, notable: "Premier arbitre qatari à officier un Mondial (2022). VAR CDM 2018. Finale Club World Cup 2019." },
  { id: "faghani",     name: "Alireza Faghani",              nationality: "Australie",     flag: "🇦🇺", confederation: "AFC",      age: 47, notable: "Né en Iran, naturalisé australien. CDM 2022. Finale Club World Cup 2025." },
  { id: "araki",       name: "Yusuke Araki",                 nationality: "Japon",         flag: "🇯🇵", confederation: "AFC",      age: 39, notable: "Arbitre FIFA japonais. Actif en AFC Champions League." },
  { id: "ma-ning",     name: "Ma Ning",                      nationality: "Chine",         flag: "🇨🇳", confederation: "AFC",      age: 40, notable: "Premier Mondial pour Ma Ning. L'un des meilleurs arbitres d'Asie." },
  { id: "makhadmeh",   name: "Adham Makhadmeh",              nationality: "Jordanie",      flag: "🇯🇴", confederation: "AFC",      age: 38, notable: "Arbitre FIFA jordanien. Actif en AFC." },
  { id: "al-turais",   name: "Khalid Al-Turais",             nationality: "Arabie Saoudite", flag: "🇸🇦", confederation: "AFC",   age: 40, notable: "Arbitre FIFA saoudien. AFC Champions League." },
  { id: "al-ali",      name: "Omar Al-Ali",                  nationality: "Émirats Arabes Unis", flag: "🇦🇪", confederation: "AFC", age: 41, notable: "Arbitre FIFA émirati. AFC Champions League." },
  { id: "tantashev",   name: "Ilgiz Tantashev",              nationality: "Ouzbékistan",   flag: "🇺🇿", confederation: "AFC",      age: 37, notable: "Premier arbitre ouzbek à la Coupe du Monde." },
  // CAF (7)
  { id: "ghorbal",     name: "Mustapha Ghorbal",             nationality: "Algérie",       flag: "🇩🇿", confederation: "CAF",      age: 44, notable: "Un des arbitres africains les plus expérimentés. Présent à la CAN. Premier Mondial pour Ghorbal." },
  { id: "jayed",       name: "Jalal Jayed",                  nationality: "Maroc",         flag: "🇲🇦", confederation: "CAF",      age: 40, notable: "Arbitre FIFA marocain. CAF Champions League." },
  { id: "tom",         name: "Abongile Tom",                 nationality: "Afrique du Sud", flag: "🇿🇦", confederation: "CAF",     age: 38, notable: "Arbitre FIFA sud-africain. Actif en CAF Champions League." },
  { id: "omar",        name: "Amin Mohamed Omar",            nationality: "Égypte",        flag: "🇪🇬", confederation: "CAF",      age: 41, notable: "Arbitre FIFA égyptien. CAF Champions League." },
  { id: "atcho",       name: "Pierre Atcho",                 nationality: "Gabon",         flag: "🇬🇦", confederation: "CAF",      age: 39, notable: "Arbitre FIFA gabonais. Représentant de l'Afrique centrale." },
  { id: "beida",       name: "Dahane Beida",                 nationality: "Mauritanie",    flag: "🇲🇷", confederation: "CAF",      age: 38, notable: "Arbitre FIFA mauritanien. Sélection notable pour un pays rarement représenté." },
  { id: "artan",       name: "Omar Abdulkadir Artan",        nationality: "Somalie",       flag: "🇸🇴", confederation: "CAF",      age: 37, notable: "Présence historique pour la Somalie à un Mondial." },
  // OFC (1)
  { id: "kawana",      name: "Campbell-Kirk Kawana-Waugh",   nationality: "Nouvelle-Zélande", flag: "🇳🇿", confederation: "OFC",  age: 38, notable: "Seul représentant de l'OFC (Océanie) au Mondial 2026." },
];

const CONF_CONFIG: Record<string, { color: string; label: string }> = {
  UEFA:     { color: "#3b82f6", label: "UEFA" },
  CONMEBOL: { color: "#22c55e", label: "CONMEBOL" },
  CONCACAF: { color: "#f59e0b", label: "CONCACAF" },
  AFC:      { color: "#a78bfa", label: "AFC" },
  CAF:      { color: "#ef4444", label: "CAF" },
  OFC:      { color: "#06b6d4", label: "OFC" },
};

function WCRefereeCard({ ref: r }: { ref: WCReferee }) {
  const [open, setOpen] = useState(false);
  const conf = CONF_CONFIG[r.confederation];
  const isFrench = r.nationality === "France";

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${open ? conf.color + "40" : "#1e2d42"}`, background: "#0d1421" }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:brightness-125 transition-all"
      >
        <span className="text-xl flex-shrink-0">{r.flag}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-black" style={{ color: isFrench ? "#60a5fa" : "#e8edf5" }}>{r.name}</span>
            {isFrench && (
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)" }}>
                🇫🇷 L1
              </span>
            )}
          </div>
          <p className="text-[9px] mt-0.5" style={{ color: "#475569" }}>{r.nationality} · {r.age} ans</p>
        </div>

        <span className="text-[9px] font-black px-2 py-1 rounded-lg flex-shrink-0"
          style={{ background: `${conf.color}15`, color: conf.color, border: `1px solid ${conf.color}25` }}>
          {conf.label}
        </span>

        {open ? <CaretUp size={11} style={{ color: "#475569", flexShrink: 0 }} /> : <CaretDown size={11} style={{ color: "#475569", flexShrink: 0 }} />}
      </button>

      {open && (
        <div className="px-3 pb-3 border-t space-y-2" style={{ borderColor: "#1e2d42" }}>
          <div className="rounded-xl px-3 py-2.5 mt-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e2d42" }}>
            <div className="flex items-start gap-2">
              <Star size={10} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 1 }} />
              <p className="text-[10px] leading-relaxed" style={{ color: "#94a3b8" }}>{r.notable}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CONF_ORDER: WCReferee["confederation"][] = ["UEFA", "CONMEBOL", "CONCACAF", "AFC", "CAF", "OFC"];

export default function RefereesWCTab() {
  const [filter, setFilter] = useState<WCReferee["confederation"] | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = WC_REFEREES.filter(r => {
    const matchConf = filter === "all" || r.confederation === filter;
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.nationality.toLowerCase().includes(search.toLowerCase());
    return matchConf && matchSearch;
  });

  const counts = CONF_ORDER.reduce<Record<string, number>>((acc, c) => {
    acc[c] = WC_REFEREES.filter(r => r.confederation === c).length;
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h2 className="text-base font-black" style={{ color: "#e8edf5" }}>Arbitres CDM 2026</h2>
        <p className="text-xs mt-0.5" style={{ color: "#6b7c96" }}>{WC_REFEREES.length} arbitres sélectionnés · USA / Canada / Mexique</p>
      </div>

      {/* Confederation filter tabs */}
      <div className="flex flex-wrap gap-1">
        <button onClick={() => setFilter("all")}
          className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
          style={{ background: filter === "all" ? "rgba(255,255,255,0.08)" : "transparent", color: filter === "all" ? "#e2e8f0" : "#64748b", border: filter === "all" ? "1px solid rgba(255,255,255,0.1)" : "1px solid #1e2d42" }}>
          Tous ({WC_REFEREES.length})
        </button>
        {CONF_ORDER.map(c => {
          const cfg = CONF_CONFIG[c];
          const active = filter === c;
          return (
            <button key={c} onClick={() => setFilter(c)}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
              style={{ background: active ? `${cfg.color}15` : "transparent", color: active ? cfg.color : "#64748b", border: active ? `1px solid ${cfg.color}30` : "1px solid #1e2d42" }}>
              {cfg.label} ({counts[c]})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass size={12} style={{ color: "#475569", position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
        <input
          type="text"
          placeholder="Rechercher un arbitre ou pays…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-7 pr-3 py-2 rounded-xl text-xs outline-none"
          style={{ background: "#0d1421", border: "1px solid #1e2d42", color: "#e8edf5" }}
        />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-6 gap-1">
        {CONF_ORDER.map(c => {
          const cfg = CONF_CONFIG[c];
          const n = counts[c];
          return (
            <div key={c} className="rounded-lg px-2 py-1.5 text-center" style={{ background: `${cfg.color}10`, border: `1px solid ${cfg.color}20` }}>
              <p className="text-sm font-black" style={{ color: cfg.color }}>{n}</p>
              <p className="text-[8px] font-semibold" style={{ color: "#475569" }}>{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* List — grouped by confederation if "all" */}
      {filter === "all" && !search ? (
        CONF_ORDER.map(c => {
          const refs = WC_REFEREES.filter(r => r.confederation === c);
          const cfg = CONF_CONFIG[c];
          return (
            <div key={c}>
              <h3 className="text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5"
                style={{ color: cfg.color }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                {cfg.label} · {refs.length} arbitres
              </h3>
              <div className="space-y-1.5 mb-3">
                {refs.map(r => <WCRefereeCard key={r.id} ref={r} />)}
              </div>
            </div>
          );
        })
      ) : (
        <div className="space-y-1.5">
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: "#475569" }}>Aucun résultat</p>
          ) : (
            filtered.map(r => <WCRefereeCard key={r.id} ref={r} />)
          )}
        </div>
      )}

      <p className="text-[9px] text-center pt-1" style={{ color: "#334155" }}>
        Source : annonce FIFA du 9 avril 2026 · 52 arbitres officiels
      </p>
    </div>
  );
}
