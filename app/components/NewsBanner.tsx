"use client";

import React, { useEffect, useState, useRef } from "react";

/* ─── Types ────────────────────────────────────────────────── */
interface Standing {
  position: number;
  team: { id: number; name: string; shortName: string; crest: string };
  playedGames: number;
  won: number; draw: number; lost: number;
  points: number; goalsFor: number; goalsAgainst: number;
  goalDifference: number; form: string;
}

interface NewsItem {
  tag: string;
  tagColor: string;
  text: string;
  icon: string;
}

/* ─── WC 2026 static news pool ─────────────────────────────── */
const WC_NEWS: NewsItem[] = [
  { tag: "Mondial 2026", tagColor: "#f59e0b", icon: "🌍", text: "48 équipes · USA, Canada & Mexique accueillent le tournoi" },
  { tag: "Calendrier",   tagColor: "#f59e0b", icon: "📅", text: "Coup d'envoi : 11 juin 2026 — Finale : 19 juillet 2026" },
  { tag: "Groupes",      tagColor: "#f59e0b", icon: "🗂️", text: "12 groupes de 4 — 3 meilleures équipes par groupe qualifiées" },
  { tag: "Favori",       tagColor: "#f59e0b", icon: "🎯", text: "France · Brésil · Angleterre dans le top 3 des cotes avant-tournoi" },
  { tag: "Record",       tagColor: "#f59e0b", icon: "⚽", text: "2 048 buts inscrits lors des qualifications — un record historique" },
  { tag: "Qualif.",      tagColor: "#f59e0b", icon: "✅", text: "Europe : 16 places · Amérique du Sud : 6 · Afrique : 9 · Asie : 8.5" },
  { tag: "Stades",       tagColor: "#f59e0b", icon: "🏟️", text: "16 stades répartis dans 3 pays · MetLife Stadium (NY) accueille la finale" },
  { tag: "Mbappé",       tagColor: "#f59e0b", icon: "🔵", text: "Kylian Mbappé — capitaine des Bleus, favori au Ballon d'Or 2026" },
  { tag: "Favori",       tagColor: "#f59e0b", icon: "🟡", text: "Brésil : 5 titres mondiaux, retour en forme sous Ancelotti" },
  { tag: "Surprise",     tagColor: "#f59e0b", icon: "🇲🇦", text: "Maroc — après le demi-finale 2022, ambitions affichées pour 2026" },
  { tag: "Qualif.",      tagColor: "#f59e0b", icon: "🇫🇷", text: "France qualifiée en tête de son groupe avec 8V 1N · 28 buts inscrits" },
  { tag: "Stats",        tagColor: "#f59e0b", icon: "📊", text: "Erling Haaland — 14 buts en qualif., meilleur buteur européen" },
];

/* ─── L1 news generator ────────────────────────────────────── */
function buildL1News(standings: Standing[]): NewsItem[] {
  if (!standings.length) return [
    { tag: "Ligue 1", tagColor: "#3b82f6", icon: "⚽", text: "Saison 2025-26 en cours — 38 journées au programme" },
    { tag: "Ligue 1", tagColor: "#3b82f6", icon: "🏆", text: "Chargement du classement en cours…" },
  ];

  const s = standings;
  const leader = s[0];
  const second = s[1];
  const rel = s.slice(-3);
  const hotTeam = s.find(t => {
    const res = t.form.split(",").filter(Boolean).slice(-3);
    return res.length === 3 && res.every(r => r === "W");
  });
  const coldTeam = s.find(t => {
    const res = t.form.split(",").filter(Boolean).slice(-3);
    return res.length === 3 && res.every(r => r === "L");
  });
  const topScorer = [...s].sort((a, b) => b.goalsFor - a.goalsFor)[0];

  const items: NewsItem[] = [
    { tag: "Classement", tagColor: "#3b82f6", icon: "🏆", text: `Leader : ${leader.team.shortName} · ${leader.points} pts · ${leader.won}V ${leader.draw}N ${leader.lost}D` },
    { tag: "Classement", tagColor: "#3b82f6", icon: "📍", text: `Top 2 : ${leader.team.shortName} ${leader.points} pts — ${second?.team.shortName ?? "?"} ${second?.points ?? "?"} pts` },
    { tag: "Attaque",    tagColor: "#3b82f6", icon: "⚽", text: `Meilleure attaque : ${topScorer.team.shortName} · ${topScorer.goalsFor} buts en ${topScorer.playedGames} matchs` },
    { tag: "Relégation", tagColor: "#ef4444", icon: "⚠️", text: `Zone rouge : ${rel.map(t => `${t.team.shortName} (${t.points} pts)`).join(" · ")}` },
    { tag: "Saison",     tagColor: "#3b82f6", icon: "📅", text: `${leader.playedGames}/38 journées jouées — ${38 - leader.playedGames} à venir` },
  ];
  if (hotTeam) items.push({ tag: "Forme 🔥",  tagColor: "#22c55e", icon: "🔥", text: `${hotTeam.team.shortName} en feu — 3 victoires consécutives !` });
  if (coldTeam) items.push({ tag: "Mauvaise passe", tagColor: "#ef4444", icon: "❄️", text: `${coldTeam.team.shortName} en difficulté — 3 défaites de suite` });

  // Top GD
  const topGD = [...s].sort((a, b) => b.goalDifference - a.goalDifference)[0];
  items.push({ tag: "DB", tagColor: "#a78bfa", icon: "📊", text: `Meilleure diff. de buts : ${topGD.team.shortName} · +${topGD.goalDifference}` });

  return items;
}

/* ─── Club news generator ───────────────────────────────────── */
const L1_CLUBS: Record<number, { name: string; shortName: string; color: string; stadium: string; city: string }> = {
  524:  { name: "Paris Saint-Germain", shortName: "PSG",        color: "#0050a0", stadium: "Parc des Princes",   city: "Paris"       },
  548:  { name: "AS Monaco",           shortName: "Monaco",     color: "#e10600", stadium: "Louis II",           city: "Monaco"      },
  516:  { name: "Olympique de Marseille", shortName: "OM",      color: "#00a0e4", stadium: "Vélodrome",          city: "Marseille"   },
  521:  { name: "LOSC Lille",          shortName: "Lille",      color: "#d00b12", stadium: "Stade Pierre-Mauroy",city: "Lille"       },
  529:  { name: "Stade Rennais",       shortName: "Rennes",     color: "#000000", stadium: "Roazhon Park",       city: "Rennes"      },
  522:  { name: "OGC Nice",            shortName: "Nice",       color: "#d00b12", stadium: "Allianz Riviera",    city: "Nice"        },
  546:  { name: "RC Lens",             shortName: "Lens",       color: "#e8a000", stadium: "Stade Bollaert",     city: "Lens"        },
  523:  { name: "Olympique Lyonnais",  shortName: "Lyon",       color: "#0050a0", stadium: "Groupama Stadium",   city: "Lyon"        },
  576:  { name: "RC Strasbourg",       shortName: "Strasbourg", color: "#0050a0", stadium: "Stade de la Meinau", city: "Strasbourg"  },
  511:  { name: "Toulouse FC",         shortName: "Toulouse",   color: "#6a0dad", stadium: "Stadium de Toulouse",city: "Toulouse"    },
  512:  { name: "Stade Brestois",      shortName: "Brest",      color: "#e63329", stadium: "Francis-Le Blé",     city: "Brest"       },
  532:  { name: "SCO Angers",          shortName: "Angers",     color: "#000000", stadium: "Raymond-Kopa",       city: "Angers"      },
  533:  { name: "Le Havre AC",         shortName: "Le Havre",   color: "#0050a0", stadium: "Stade Océane",       city: "Le Havre"    },
  519:  { name: "AJ Auxerre",          shortName: "Auxerre",    color: "#e80c1b", stadium: "Abbé-Deschamps",     city: "Auxerre"     },
  543:  { name: "FC Nantes",           shortName: "Nantes",     color: "#f5c400", stadium: "Stade de la Beaujoire", city: "Nantes"  },
  545:  { name: "FC Metz",             shortName: "Metz",       color: "#8a0638", stadium: "Stade Saint-Symphorien", city: "Metz"   },
  525:  { name: "FC Lorient",          shortName: "Lorient",    color: "#f47d00", stadium: "Stade du Moustoir",  city: "Lorient"     },
  1045: { name: "Paris FC",            shortName: "Paris FC",   color: "#003090", stadium: "Stade Charléty",     city: "Paris"       },
};

function buildClubNews(clubId: number, standings: Standing[]): NewsItem[] {
  const meta = L1_CLUBS[clubId];
  const s = standings.find(s => s.team.id === clubId);
  const color = meta?.color ?? "#3b82f6";
  const name = meta?.shortName ?? "Mon Club";

  if (!s) return [
    { tag: name, tagColor: color, icon: "❤️", text: `${name} — chargement des données en cours…` },
    { tag: name, tagColor: color, icon: "🏟️", text: meta ? `${meta.stadium} · ${meta.city}` : "Données club indisponibles" },
  ];

  const formList = s.form.split(",").filter(Boolean).slice(-5);
  const formStr = formList.map(r => r === "W" ? "✅" : r === "L" ? "❌" : "〰️").join(" ");
  const streak = formList.slice(-3);
  const strk = streak.every(r => r === "W") ? "3 victoires de suite 🔥" : streak.every(r => r === "L") ? "3 défaites de suite ❄️" : null;

  const items: NewsItem[] = [
    { tag: name, tagColor: color, icon: "📍", text: `${s.position}e en L1 · ${s.points} pts · ${s.won}V ${s.draw}N ${s.lost}D` },
    { tag: "Forme",    tagColor: color, icon: "📈", text: `Derniers matchs : ${formStr}` },
    { tag: "Attaque",  tagColor: color, icon: "⚽", text: `${s.goalsFor} buts marqués · ${s.goalsAgainst} concédés · DB ${s.goalDifference >= 0 ? "+" : ""}${s.goalDifference}` },
    { tag: "Saison",   tagColor: color, icon: "📅", text: `${s.playedGames} matchs joués · ${38 - s.playedGames} restants cette saison` },
  ];
  if (meta) items.push({ tag: "Stade", tagColor: color, icon: "🏟️", text: `${meta.stadium} · ${meta.city}` });
  if (strk)  items.push({ tag: "Forme", tagColor: color, icon: strk.includes("🔥") ? "🔥" : "❄️", text: `${name} : ${strk}` });

  // Gap to leader
  const leader = standings[0];
  if (leader && leader.team.id !== clubId) {
    const gap = leader.points - s.points;
    items.push({ tag: "Écart", tagColor: color, icon: "📊", text: `${gap} pts de retard sur ${leader.team.shortName} (leader)` });
  }

  return items;
}

/* ─── Single rotating column ────────────────────────────────── */
function NewsColumn({ title, color, items }: { title: string; color: string; items: NewsItem[] }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (items.length <= 1) return;
    timerRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % items.length);
        setVisible(true);
      }, 350);
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [items.length]);

  // Reset index when items change (e.g. club switched)
  useEffect(() => { setIdx(0); setVisible(true); }, [items]);

  const item = items[idx] ?? items[0];
  if (!item) return null;

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-1 px-3 py-2.5" style={{ minWidth: 0 }}>
      {/* Column header */}
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-[9px] font-black uppercase tracking-widest truncate" style={{ color }}>{title}</span>
        {/* Pagination dots */}
        {items.length > 1 && (
          <div className="flex gap-0.5 ml-auto flex-shrink-0">
            {items.slice(0, 6).map((_, i) => (
              <span key={i} className="rounded-full transition-all duration-300"
                style={{ width: i === idx % Math.min(items.length, 6) ? 10 : 4, height: 4,
                  background: i === idx % Math.min(items.length, 6) ? color : "rgba(255,255,255,0.15)" }} />
            ))}
          </div>
        )}
      </div>
      {/* News item */}
      <div className="flex items-center gap-1.5 min-w-0"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.35s ease", minHeight: 28 }}>
        <span className="text-sm flex-shrink-0">{item.icon}</span>
        <div className="min-w-0">
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded mr-1.5 flex-shrink-0 inline-block"
            style={{ background: `${item.tagColor}20`, color: item.tagColor }}>
            {item.tag}
          </span>
          <span className="text-[11px] font-medium" style={{ color: "#c8d4e0" }}>{item.text}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main banner ───────────────────────────────────────────── */
export default function NewsBanner({ standings }: { standings: Standing[] }) {
  const [monClubId, setMonClubId] = useState<number | null>(null);

  // Read club from localStorage (client only)
  useEffect(() => {
    const raw = localStorage.getItem("monClub_id");
    if (raw) setMonClubId(Number(raw));
    // Listen for storage changes (e.g. user switches club in another tab / MonClubTab)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "monClub_id") setMonClubId(e.newValue ? Number(e.newValue) : null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const l1News   = buildL1News(standings);
  const wcNews   = WC_NEWS;
  const clubNews = monClubId
    ? buildClubNews(monClubId, standings)
    : [{ tag: "Mon Club", tagColor: "#a78bfa", icon: "❤️", text: "Sélectionne ton club dans l'onglet Mon Club pour voir ses actualités ici" }];
  const clubMeta = monClubId ? L1_CLUBS[monClubId] : null;

  return (
    <div style={{ borderBottom: "1px solid #1e2d42", background: "#090e1a" }}>
      <div className="max-w-[1300px] mx-auto">
        <div className="flex divide-x" style={{ borderColor: "#1e2d42" }}>
          {/* Col 1 — Ligue 1 */}
          <NewsColumn title="Ligue 1" color="#3b82f6" items={l1News} />

          {/* Divider hidden on mobile */}
          <div className="hidden sm:block" style={{ width: 1, background: "#1e2d42", flexShrink: 0 }} />

          {/* Col 2 — Mondial */}
          <NewsColumn title="Mondial 2026" color="#f59e0b" items={wcNews} />

          {/* Divider hidden on mobile */}
          <div className="hidden md:block" style={{ width: 1, background: "#1e2d42", flexShrink: 0 }} />

          {/* Col 3 — Mon Club */}
          <div className="hidden md:flex flex-1 min-w-0">
            <NewsColumn
              title={clubMeta ? `❤️ ${clubMeta.shortName}` : "Mon Club"}
              color={clubMeta?.color ?? "#a78bfa"}
              items={clubNews}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
