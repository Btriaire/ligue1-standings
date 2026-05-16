"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";

const NewsModal = dynamic(() => import("./NewsModal"), { ssr: false });

interface Standing {
  position: number;
  team: { id: number; name: string; shortName: string; crest: string };
  playedGames: number;
  won: number; draw: number; lost: number;
  points: number; goalsFor: number; goalsAgainst: number;
  goalDifference: number; form: string;
}
interface NewsItem { title: string; pubDate: string; url: string; source?: string }
interface SelectedNews { title: string; url: string; pubDate: string }
type Col = { label: string; color: string; items: NewsItem[]; loaded: boolean };

/* ─── Club meta ─────────────────────────────────────────────── */
const CLUB_META: Record<number, { shortName: string; color: string; searchName: string }> = {
  524:  { shortName: "PSG",        color: "#0050a0", searchName: "Paris Saint-Germain" },
  548:  { shortName: "Monaco",     color: "#e10600", searchName: "AS Monaco"           },
  516:  { shortName: "OM",         color: "#00a0e4", searchName: "Olympique Marseille" },
  521:  { shortName: "Lille",      color: "#d00b12", searchName: "LOSC Lille"          },
  529:  { shortName: "Rennes",     color: "#000000", searchName: "Stade Rennais"       },
  522:  { shortName: "Nice",       color: "#d00b12", searchName: "OGC Nice"            },
  546:  { shortName: "Lens",       color: "#e8a000", searchName: "RC Lens"             },
  523:  { shortName: "Lyon",       color: "#0050a0", searchName: "Olympique Lyonnais"  },
  576:  { shortName: "Strasbourg", color: "#0050a0", searchName: "RC Strasbourg"       },
  511:  { shortName: "Toulouse",   color: "#6a0dad", searchName: "Toulouse FC"         },
  512:  { shortName: "Brest",      color: "#e63329", searchName: "Stade Brestois"      },
  532:  { shortName: "Angers",     color: "#000000", searchName: "SCO Angers"          },
  533:  { shortName: "Le Havre",   color: "#0050a0", searchName: "Le Havre AC"         },
  519:  { shortName: "Auxerre",    color: "#e80c1b", searchName: "AJ Auxerre"          },
  543:  { shortName: "Nantes",     color: "#f5c400", searchName: "FC Nantes"           },
  545:  { shortName: "Metz",       color: "#8a0638", searchName: "FC Metz"             },
  525:  { shortName: "Lorient",    color: "#f47d00", searchName: "FC Lorient"          },
  1045: { shortName: "Paris FC",   color: "#003090", searchName: "Paris FC"            },
};

/* ─── Fetch from our API route (server proxies So Foot RSS) ──── */
async function fetchNews(topic: string, club?: string): Promise<NewsItem[]> {
  try {
    const url = club
      ? `/api/news?topic=club&club=${encodeURIComponent(club)}`
      : `/api/news?topic=${topic}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const { items } = await res.json() as { items: NewsItem[] };
    return items ?? [];
  } catch {
    return [];
  }
}

/* ─── Rotating column ────────────────────────────────────────── */
function NewsColumn({ title, color, items, loaded, onSelect }: {
  title: string; color: string; items: NewsItem[]; loaded: boolean;
  onSelect: (item: NewsItem) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setIdx(0); setVisible(true); }, [items]);

  useEffect(() => {
    if (items.length <= 1) return;
    timer.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx(i => (i + 1) % items.length); setVisible(true); }, 350);
    }, 6000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [items.length]);

  const item = items[idx];
  const dots = Math.min(items.length, 6);

  return (
    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>{title}</span>
        {loaded && items.length > 1 && (
          <div className="flex gap-0.5 ml-auto">
            {Array.from({ length: dots }).map((_, i) => (
              <span key={i} className="rounded-full transition-all duration-300"
                style={{ width: i === idx % dots ? 10 : 4, height: 4,
                  background: i === idx % dots ? color : "rgba(255,255,255,0.15)" }} />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => item?.url && onSelect(item)}
        className="text-left group"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.35s ease", minHeight: 32,
          cursor: item?.url ? "pointer" : "default" }}
        disabled={!loaded || !item?.url}
      >
        <p className="text-[11px] font-medium leading-snug line-clamp-2 group-hover:underline decoration-dotted underline-offset-2"
          style={{ color: loaded ? "#c8d4e0" : "#6b7c96", textDecorationColor: color }}>
          {!loaded ? "Chargement…" : (item?.title ?? "")}
        </p>
        {loaded && item?.source && (
          <p className="text-[9px] mt-0.5 truncate" style={{ color: "#475569" }}>
            {item.source}
          </p>
        )}
      </button>
    </div>
  );
}

/* ─── Banner ─────────────────────────────────────────────────── */
export default function NewsBanner({ standings }: { standings: Standing[] }) {
  const [monClubId, setMonClubId] = useState<number | null>(null);
  const [cols, setCols] = useState<Col[]>([
    { label: "Ligue 1",      color: "#3b82f6", items: [], loaded: false },
    { label: "Mondial 2026", color: "#f59e0b", items: [], loaded: false },
    { label: "Mon Club",     color: "#a78bfa", items: [], loaded: false },
  ]);
  const [selected, setSelected] = useState<SelectedNews | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("monClub_id");
    if (raw) setMonClubId(Number(raw));
    const onStorage = (e: StorageEvent) => {
      if (e.key === "monClub_id") setMonClubId(e.newValue ? Number(e.newValue) : null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    fetchNews("l1").then(items => {
      const valid = items.length ? items : [{ title: "Actualités football indisponibles", pubDate: new Date().toISOString(), url: "" }];
      setCols(prev => prev.map((c, i) => i === 0 ? { ...c, items: valid, loaded: true } : c));
    });
  }, []);

  useEffect(() => {
    fetchNews("mondial").then(items => {
      const valid = items.length ? items : [{ title: "Actualités Mondial 2026 indisponibles", pubDate: new Date().toISOString(), url: "" }];
      setCols(prev => prev.map((c, i) => i === 1 ? { ...c, items: valid, loaded: true } : c));
    });
  }, []);

  useEffect(() => {
    const meta = monClubId ? CLUB_META[monClubId] : null;
    setCols(prev => prev.map((c, i) => i === 2
      ? { ...c, label: meta ? `❤️ ${meta.shortName}` : "Mon Club",
          color: meta?.color ?? "#a78bfa", items: [], loaded: false }
      : c));

    if (!meta) {
      const fallbackItems: NewsItem[] = [
        { title: "Sélectionne ton club dans l'onglet Mon Club pour ses actus", pubDate: new Date().toISOString(), url: "" },
        ...(standings[0] ? [{ title: `Leader : ${standings[0].team.shortName} · ${standings[0].points} pts`, pubDate: new Date().toISOString(), url: "" }] : []),
      ];
      setCols(prev => prev.map((c, i) => i === 2 ? { ...c, items: fallbackItems, loaded: true } : c));
      return;
    }

    fetchNews("club", meta.searchName).then(items => {
      const valid = items.length ? items : [{ title: `Pas d'actus récentes pour ${meta.shortName}`, pubDate: new Date().toISOString(), url: "" }];
      setCols(prev => prev.map((c, i) => i === 2 ? { ...c, items: valid, loaded: true } : c));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monClubId, standings.length]);

  const handleSelect = (item: NewsItem) => {
    setSelected({ title: item.title, url: item.url, pubDate: item.pubDate });
  };

  const div = <div className="hidden sm:block flex-shrink-0" style={{ width: 1, background: "#1e2d42" }} />;

  return (
    <>
      <div style={{ borderBottom: "1px solid #1e2d42", background: "#090e1a" }}>
        <div className="max-w-[1300px] mx-auto">
          <div className="flex" style={{ minHeight: 64 }}>
            <NewsColumn {...cols[0]} title={cols[0].label} onSelect={handleSelect} />
            {div}
            <NewsColumn {...cols[1]} title={cols[1].label} onSelect={handleSelect} />
            <div className="hidden md:flex flex-1 min-w-0" style={{ borderLeft: "1px solid #1e2d42" }}>
              <NewsColumn {...cols[2]} title={cols[2].label} onSelect={handleSelect} />
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <NewsModal
          title={selected.title}
          url={selected.url}
          pubDate={selected.pubDate}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
