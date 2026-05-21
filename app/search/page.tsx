"use client";

// Global search page — searches across all 36 club profiles (L1 + L2).
// Matches against club name, surnom, city, region, stadium, president,
// coach, sporting director, captain, equipementier, sponsor, etc.
// Pure client-side index — fast and no API roundtrip.

import { useMemo, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { MagnifyingGlass, ArrowLeft, X, MapPin, Crown } from "@phosphor-icons/react";
import {
  CLUB_PROFILES, clubStadiumPhoto, type ClubProfile,
} from "@/app/lib/clubProfile";

// Accent-insensitive lowercase fold — same trick as PERSON_PHOTOS.
function fold(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Flatten every searchable field of a profile into a single haystack string.
// `hits` collects matched field labels so we can render them as chips.
function buildHaystack(p: ClubProfile): { hay: string; fields: Array<{ label: string; value: string }> } {
  const raw: Array<{ label: string; value: string | undefined }> = [
    { label: "Club",         value: p.name },
    { label: "Surnom",       value: p.surnom },
    { label: "Ville",        value: p.ville },
    { label: "Région",       value: p.region },
    { label: "Stade",        value: p.stade.nom },
    { label: "Président",    value: p.president },
    { label: "Entraîneur",   value: p.entraineur },
    { label: "Capitaine",    value: p.capitaine },
    { label: "Dir. sportif", value: p.directeurSportif },
    { label: "Actionnaire",  value: p.actionnaire },
    { label: "Équipementier",value: p.equipementier },
    { label: "Sponsor",      value: p.sponsorMaillot },
    { label: "Devise",       value: p.devise },
    { label: "Palmarès",     value: (p.palmares ?? []).join(" • ") },
  ];
  const fields: Array<{ label: string; value: string }> = raw.flatMap(f =>
    f.value ? [{ label: f.label, value: f.value }] : []
  );
  const hay = fold(fields.map(f => f.value).join(" ¦ ") + " " + p.shortName);
  return { hay, fields };
}

interface Hit {
  profile: ClubProfile;
  matches: Array<{ label: string; value: string }>;
}

function searchClubs(q: string): Hit[] {
  const needle = fold(q.trim());
  if (!needle) return [];
  const terms = needle.split(/\s+/).filter(Boolean);

  const results: Array<{ hit: Hit; score: number }> = [];
  for (const p of Object.values(CLUB_PROFILES)) {
    const { hay, fields } = buildHaystack(p);
    // Every term must appear somewhere in the haystack.
    if (!terms.every(t => hay.includes(t))) continue;
    // Per-field match list so we can show which fields hit.
    const matches = fields.filter(f => terms.some(t => fold(f.value).includes(t)));
    // Score: bonus for name match, then field count.
    const nameHit = terms.every(t => fold(p.name).includes(t)) ? 100 : 0;
    const shortHit = terms.every(t => fold(p.shortName).includes(t)) ? 50 : 0;
    const score = nameHit + shortHit + matches.length;
    results.push({ hit: { profile: p, matches }, score });
  }
  results.sort((a, b) => b.score - a.score);
  return results.map(r => r.hit);
}

function SearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);

  // Keep the URL in sync with the query (so it's shareable / bookmark-able).
  useEffect(() => {
    const handle = setTimeout(() => {
      const next = q.trim();
      const target = next ? `/search?q=${encodeURIComponent(next)}` : "/search";
      router.replace(target, { scroll: false });
    }, 200);
    return () => clearTimeout(handle);
  }, [q, router]);

  const hits = useMemo(() => searchClubs(q), [q]);

  return (
    <main className="min-h-screen pb-16" style={{ background: "#0b0f12", color: "#e8edf5" }}>
      <header className="sticky top-0 z-20 backdrop-blur"
        style={{ background: "rgba(11,15,18,0.85)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <ArrowLeft size={14} />
          </Link>
          <div className="relative flex-1">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7c96" }} />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Rechercher club, ville, entraîneur, stade, sponsor…"
              className="w-full pl-9 pr-9 py-2 rounded-lg text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e8edf5" }} />
            {q && (
              <button onClick={() => setQ("")} aria-label="Effacer"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-4">
        {!q.trim() ? (
          <EmptyState onPick={setQ} />
        ) : hits.length === 0 ? (
          <p className="text-sm py-12 text-center" style={{ color: "#6b7c96" }}>
            Aucun résultat pour « {q} »
          </p>
        ) : (
          <>
            <p className="text-[11px] uppercase tracking-widest mb-3" style={{ color: "#6b7c96" }}>
              {hits.length} résultat{hits.length > 1 ? "s" : ""}
            </p>
            <ul className="space-y-2">
              {hits.map(h => <HitRow key={h.profile.id} hit={h} query={q} />)}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}

function HitRow({ hit, query }: { hit: Hit; query: string }) {
  const { profile, matches } = hit;
  const photo = clubStadiumPhoto(profile.id);
  const accent = profile.couleurs.primary;
  return (
    <li>
      <Link href={`/club/${profile.id}`}
        className="block rounded-xl overflow-hidden hover:bg-white/[0.03] transition"
        style={{ background: "rgba(13,20,33,0.55)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex gap-3 p-3">
          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0"
            style={{ background: `${accent}22`, border: `1px solid ${accent}40` }}>
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" loading="lazy" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold truncate" style={{ color: "#e8edf5" }}>{profile.name}</h3>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: profile.league === "L1" ? "rgba(0,212,255,0.12)" : "rgba(251,191,36,0.12)",
                         color: profile.league === "L1" ? "#00d4ff" : "#fbbf24" }}>
                {profile.league === "L1" ? "Ligue 1" : "Ligue 2"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] mt-0.5" style={{ color: "#6b7c96" }}>
              <MapPin size={10} />
              <span>{profile.ville}</span>
              {profile.surnom && <span>·</span>}
              {profile.surnom && <span className="truncate">{profile.surnom}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {matches.slice(0, 4).map((m, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#9aa7ba" }}>
                  <span style={{ color: accent }}>{m.label}</span>
                  {" · "}
                  <Highlight text={m.value} query={query} />
                </span>
              ))}
              {matches.length > 4 && (
                <span className="text-[10px]" style={{ color: "#6b7c96" }}>+{matches.length - 4}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return <>{text}</>;
  const folded = fold(text);
  // Find first match span for simple bolding (preserves original casing).
  let firstStart = -1, firstEnd = -1;
  for (const t of terms) {
    const i = folded.indexOf(t);
    if (i >= 0 && (firstStart === -1 || i < firstStart)) {
      firstStart = i; firstEnd = i + t.length;
    }
  }
  if (firstStart < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, firstStart)}
      <mark style={{ background: "rgba(0,212,255,0.18)", color: "#e8edf5", borderRadius: 2 }}>
        {text.slice(firstStart, firstEnd)}
      </mark>
      {text.slice(firstEnd)}
    </>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  const suggestions = ["Paris", "Marseille", "Beye", "Bretagne", "Allianz", "Puma", "Vélodrome", "Pinault"];
  return (
    <div className="py-8">
      <div className="flex items-center gap-2 mb-3">
        <Crown size={12} weight="fill" style={{ color: "#fbbf24" }} />
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#fbbf24" }}>
          Suggestions
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map(s => (
          <button key={s} onClick={() => onPick(s)}
            className="text-xs px-3 py-1.5 rounded-full"
            style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff" }}>
            {s}
          </button>
        ))}
      </div>
      <p className="text-xs mt-6" style={{ color: "#6b7c96" }}>
        Recherche dans les profils des 36 clubs : nom, ville, stade, président, entraîneur, capitaine,
        directeur sportif, actionnaire, équipementier, sponsor, palmarès, devise…
      </p>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm" style={{ color: "#6b7c96" }}>Chargement…</div>}>
      <SearchInner />
    </Suspense>
  );
}
