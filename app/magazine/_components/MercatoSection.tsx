// MercatoSection — "Le Carnet des transferts". Reads recent transfers from
// /api/mercato-board (FotMob-backed, refreshed every 30 min) and renders
// them as editorial cards. Categorises each row into a French "rubrique"
// (TRANSACTION / PRÊT / PROLONGATION / TRANSFERT LIBRE) so the block reads
// like a press carnet rather than a stat table.

"use client";

import { useEffect, useState } from "react";

interface BoardTransfer {
  playerId: number;
  name: string;
  playerImage: string;
  position?: string;
  fromClub: string;
  fromClubCrest: string;
  toClub: string;
  toClubCrest: string;
  fee: string | null;
  marketValue: number | null;
  transferDate: string;
  onLoan: boolean;
  contractExtension: boolean;
  transferType: string;
}

interface MercatoResponse {
  league: string;
  transfers: BoardTransfer[];
  updatedAt: string;
}

function rubriqueFor(t: BoardTransfer): { label: string; accent: boolean } {
  if (t.contractExtension) return { label: "PROLONGATION", accent: false };
  if (t.onLoan) return { label: "PRÊT", accent: false };
  const type = t.transferType.toLowerCase();
  if (type.includes("free")) return { label: "TRANSFERT LIBRE", accent: false };
  if (type.includes("loan")) return { label: "PRÊT", accent: false };
  if ((t.marketValue ?? 0) >= 30_000_000) return { label: "TRANSACTION MAJEURE", accent: true };
  return { label: "TRANSACTION", accent: false };
}

function formatFee(t: BoardTransfer): string {
  if (t.fee && /\d/.test(t.fee)) return t.fee;
  if (t.contractExtension) return "Contrat prolongé";
  if (t.onLoan) return "Prêt";
  if (t.transferType.toLowerCase().includes("free")) return "Libre";
  if (t.marketValue) {
    const m = t.marketValue;
    if (m >= 1_000_000) return `~${(m / 1_000_000).toFixed(1).replace(".0", "")} M€ (val. marchande)`;
    return `~${Math.round(m / 1000)} k€ (val. marchande)`;
  }
  return "Montant non communiqué";
}

const MONTHS_FR_SHORT = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS_FR_SHORT[d.getMonth()]}`;
}

function TransferCard({ t, lead }: { t: BoardTransfer; lead?: boolean }) {
  const rub = rubriqueFor(t);
  return (
    <article
      style={{
        background: "var(--paper)",
        border: "1px solid var(--hairline)",
        padding: lead ? 18 : 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        height: "100%",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`chip-categorie ${rub.accent ? "accent" : ""}`}>{rub.label}</span>
        <span className="meta" style={{ fontSize: 10 }}>{shortDate(t.transferDate)}</span>
      </div>

      <div className="flex items-start gap-3">
        {t.playerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.playerImage}
            alt={t.name}
            width={lead ? 64 : 48}
            height={lead ? 64 : 48}
            style={{
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid var(--hairline-strong)",
              background: "#efeae0",
              flexShrink: 0,
            }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
          />
        ) : (
          <div
            style={{
              width: lead ? 64 : 48, height: lead ? 64 : 48, borderRadius: "50%",
              background: "#efeae0", border: "1px solid var(--hairline-strong)", flexShrink: 0,
            }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h4
            className="display-medium"
            style={{ fontSize: lead ? 22 : 17, margin: 0, lineHeight: 1.2 }}
          >
            {t.name}
          </h4>
          {t.position && (
            <p className="meta" style={{ fontSize: 11, marginTop: 2 }}>{t.position}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
        <span className="meta" style={{ fontSize: 12 }}>
          {t.fromClub || "Libre"}
        </span>
        <span className="meta" style={{ color: "var(--accent)", fontWeight: 700 }}>→</span>
        <span className="display-medium" style={{ fontSize: 14 }}>
          {t.toClub || "Libre"}
        </span>
      </div>

      <div className="flex items-center justify-between" style={{ borderTop: "1px solid var(--hairline)", paddingTop: 8, marginTop: "auto" }}>
        <span className="meta" style={{ fontSize: 11 }}>Montant</span>
        <span className="display-medium" style={{ fontSize: 13, color: rub.accent ? "var(--accent)" : "var(--ink)" }}>
          {formatFee(t)}
        </span>
      </div>
    </article>
  );
}

async function fetchMercato(league: string): Promise<BoardTransfer[]> {
  try {
    const res = await fetch(`/api/mercato-board?league=${league}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data: MercatoResponse = await res.json();
    return data.transfers ?? [];
  } catch {
    return [];
  }
}

interface LoadedState {
  league: "FL1" | "FL2";
  transfers: BoardTransfer[];
}

export default function MercatoSection() {
  const [league, setLeague] = useState<"FL1" | "FL2">("FL1");
  // Pair the fetched data with the league it was fetched for, so changing
  // the league makes the "loading" state derive naturally from
  // loaded?.league !== league without needing a synchronous setState in
  // the effect (which the React 19 lint rule rightly flags).
  const [loaded, setLoaded] = useState<LoadedState | null>(null);

  useEffect(() => {
    let alive = true;
    fetchMercato(league).then(arr => {
      if (alive) setLoaded({ league, transfers: arr });
    });
    return () => { alive = false; };
  }, [league]);

  const transfers = loaded && loaded.league === league ? loaded.transfers : null;

  // Sort by date desc, then by market value desc as tiebreaker. We want the
  // most recent activity at the top with the biggest deal as the lead card.
  const sorted = (transfers ?? []).slice().sort((a, b) => {
    const da = new Date(a.transferDate).getTime();
    const db = new Date(b.transferDate).getTime();
    if (db !== da) return db - da;
    return (b.marketValue ?? 0) - (a.marketValue ?? 0);
  });

  const lead = sorted[0];
  const grid = sorted.slice(1, 7);

  return (
    <section style={{ background: "var(--paper)", borderTop: "3px double var(--ink)" }}>
      <div className="mag-gutter" style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 0" }}>
        <div className="flex items-baseline justify-between" style={{ marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
          <div>
            <p className="label label-accent">Mercato</p>
            <h2 className="display" style={{ fontSize: "clamp(32px, 4.4vw, 48px)", margin: 0, marginTop: 4 }}>
              Le carnet des transferts
            </h2>
            <p className="meta" style={{ marginTop: 6, fontSize: 12, fontStyle: "italic" }}>
              Mouvements consignés cette semaine — source FotMob, recoupements rédaction.
            </p>
          </div>

          <div className="flex items-center gap-1" role="tablist" aria-label="Choisir le championnat">
            {(["FL1", "FL2"] as const).map(l => {
              const active = league === l;
              return (
                <button
                  key={l}
                  onClick={() => setLeague(l)}
                  role="tab"
                  aria-selected={active}
                  className="label"
                  style={{
                    padding: "6px 12px",
                    border: `1px solid ${active ? "var(--ink)" : "var(--hairline-strong)"}`,
                    background: active ? "var(--ink)" : "var(--paper)",
                    color: active ? "var(--paper)" : "var(--ink)",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {l === "FL1" ? "Ligue 1" : "Ligue 2"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rule-accent" style={{ marginBottom: 24 }} />

        {transfers === null ? (
          <p className="meta">Chargement du carnet…</p>
        ) : sorted.length === 0 ? (
          <div style={{ padding: "24px 0" }}>
            <p className="meta">
              Pas de mouvement enregistré pour le moment. La rubrique mercato reprendra dès la
              prochaine fenêtre de transferts.
            </p>
          </div>
        ) : (
          <div className="mag-grid-mercato">
            {/* Lead card */}
            <div>
              {lead && <TransferCard t={lead} lead />}
            </div>

            {/* Grid of 6 secondary cards */}
            <div className="mag-grid-mercato-sec">
              {grid.map(t => (
                <TransferCard key={`${t.playerId}-${t.transferDate}`} t={t} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
