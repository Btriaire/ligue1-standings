"use client";

import { useState, useRef, useEffect } from "react";

// ── Glossaire complet ──────────────────────────────────────────────────────────
export const GLOSSARY: Record<string, string> = {
  // Classement / général
  "DB":   "Différence de buts (buts marqués − buts encaissés)",
  "BP":   "Buts pour (buts marqués)",
  "BC":   "Buts contre (buts encaissés)",
  "J":    "Journées jouées",
  "Pts":  "Points au classement",
  "V":    "Victoires",
  "N":    "Matchs nuls",
  "D":    "Défaites",
  "DOM":  "Match à domicile",
  "EXT":  "Match à l'extérieur",
  "PD":   "Passes décisives",

  // Postes
  "GK":   "Gardien de but",
  "DEF":  "Défenseur",
  "MIL":  "Milieu de terrain",
  "AIL":  "Ailier",
  "ATT":  "Attaquant",
  "GB":   "Gardien de but",
  "DC":   "Défenseur central",
  "DD":   "Défenseur droit",
  "DG":   "Défenseur gauche",
  "MC":   "Milieu central",
  "MD":   "Milieu droit",
  "MG":   "Milieu gauche",
  "MDC":  "Milieu défensif central",
  "MAC":  "Milieu offensif central",
  "AT":   "Attaquant de pointe",
  "ATD":  "Attaquant droit",
  "ATG":  "Attaquant gauche",

  // Stats offensives
  "xG":        "Expected Goals — buts attendus d'après la qualité des tirs",
  "xG/90":     "Expected Goals par 90 minutes jouées",
  "npxG":      "Expected Goals hors penaltys",
  "npxG/90":   "npxG par 90 minutes",
  "npxG+xA/90":"Contribution offensive (npxG + xA) par 90 min",
  "xG+xA/90":  "Contribution totale (xG + xA) par 90 min",
  "G+A/90":    "Buts + Passes décisives par 90 min",
  "npG+A/90":  "Buts (hors pen.) + Passes D. par 90 min",
  "xG-Buts/90":"Différence entre buts attendus et buts réels — mesure la sur/sous-performance",
  "Buts/xG":   "Ratio buts inscrits / xG — finisseur au-dessus de 1 = surperforme ses xG",
  "npxG/tir":  "Qualité moyenne d'un tir (hors penalty)",
  "xG/tir":    "Qualité moyenne d'un tir",
  "Conv. %":   "Pourcentage de conversion des tirs en buts",
  "Cadrés %":  "Pourcentage de tirs cadrés",

  // Stats de création
  "xA":           "Expected Assists — passes décisives attendues",
  "xA/90":        "xA par 90 minutes",
  "xA/100 passes":"xA produit pour 100 passes tentées",
  "Shot assists":  "Passes menant directement à un tir",
  "Pré-passes D.": "Avant-dernière passe avant un but",
  "Passes clés":   "Passes menant directement à une occasion de but",
  "Ratio création":"Rapport entre occasions créées et actions offensives",
  "Passes prof.":  "Passes dans les 20 derniers mètres vers un joueur en bonne position",
  "Smart":         "Passes de rupture entre les lignes adverses",
  "Smart %":       "Précision des passes intelligentes",
  "3e PD":         "Troisième passeur avant un but",
  "Crosses/90":    "Centres par 90 min",
  "Cross. prec. %":"Précision des centres",
  "Crosses box":   "Centres arrivant dans la surface adverse",

  // Passes
  "Pass %":       "Précision des passes (%)",
  "Avant %":      "Pourcentage de passes en direction du but adverse",
  "Imprécis %":   "Pourcentage de passes manquées",
  "Longues %":    "Précision des passes longues",
  "Long. moy.":   "Longueur moyenne d'une passe (en mètres)",
  "Prog. %":      "Précision des passes progressives",
  "Tiers final":  "Passes atteignant le dernier tiers du terrain",
  "T. final %":   "Précision des passes vers le dernier tiers",
  "Vers box":     "Passes rentrant dans la surface adverse",
  "Déchirantes":  "Passes entre la ligne défensive (en profondeur)",
  "Déch. %":      "Précision des passes en profondeur",
  "Reçues":       "Passes reçues par le joueur",

  // Dribbles & duels
  "Drib. %":      "Pourcentage de dribbles réussis",
  "Drib. tentés": "Dribbles tentés par 90 min",
  "Drib. réussis":"Dribbles réussis par 90 min",
  "Duels déf. %": "Pourcentage de duels défensifs gagnés",
  "Duels off. %": "Pourcentage de duels offensifs gagnés",
  "Duels gagnés %":"Pourcentage total de duels gagnés",
  "Accélérations":"Courses avec la balle en accélérant fortement",
  "Portés prog.": "Conduites de balle progressant vers le but adverse",
  "Act. prog.":   "Actions progressives (passes + conduites vers l'avant)",

  // Défense
  "Int.":         "Interceptions par 90 min",
  "Poss. gagnées":"Ballons récupérés par 90 min",
  "Poss. perdues":"Ballons perdus par 90 min",
  "Poss. +/-":    "Solde possession (gagnées − perdues)",
  "Aérien %":     "Pourcentage de duels aériens gagnés",
  "Aérien gagné": "Duels aériens gagnés par 90 min",
  "Tirs bloqués": "Tirs adverses bloqués par 90 min",

  // Gardien
  "Arrêts %":     "Save % — pourcentage de tirs arrêtés",
  "Buts enc./90": "Buts encaissés par 90 min",
  "xG enc./90":   "Expected Goals concédés par 90 min",
  "Buts prévenus":"Différence entre xG concédés et buts encaissés (+ = bon gardien)",
  "Clean sheets": "Matchs sans encaisser de but",
  "Sorties/90":   "Sorties aériennes ou sur tirs par 90 min",
  "Passes dos":   "Passes en retrait reçues par le gardien",
  "Tirs conc.":   "Tirs concédés par 90 min",

  // Physique / contexte
  "Touches zone": "Touches de balle dans la surface adverse par 90 min",
  "Touches/90":   "Touches de balle totales par 90 min",
  "Fautes/90":    "Fautes commises par 90 min",
  "Fautes subies":"Fautes subies par 90 min",
  "Jaunes/90":    "Cartons jaunes par 90 min",
  "Rouges/90":    "Cartons rouges par 90 min",

  // Méta
  "Forme":        "Score de forme sur 100 — calculé d'après xG, xA et résultats récents",
  "Valeur":       "Valeur marchande estimée (Transfermarkt)",
  "min/match":    "Minutes jouées en moyenne par match",
};

// ── Composant Tooltip ─────────────────────────────────────────────────────────

interface TooltipProps {
  term: string;          // texte affiché (ex: "DB")
  children?: React.ReactNode;
  /** override the lookup key if it differs from term */
  glossKey?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function Tooltip({ term, children, glossKey, className = "", style }: TooltipProps) {
  const key = glossKey ?? term;
  const def = GLOSSARY[key];
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<"top" | "bottom">("top");
  const ref = useRef<HTMLSpanElement>(null);

  // Choose flip direction based on available space
  useEffect(() => {
    if (!show || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos(rect.top > 80 ? "top" : "bottom");
  }, [show]);

  if (!def) return <>{children ?? term}</>;

  return (
    <span
      ref={ref}
      className={`relative inline-flex items-center gap-0.5 cursor-help group ${className}`}
      style={style}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
    >
      {children ?? term}
      {/* subtle dotted underline hint */}
      <span className="absolute bottom-0 left-0 right-0 border-b border-dashed border-current opacity-30 pointer-events-none" />

      {show && (
        <span
          className="absolute z-[300] pointer-events-none"
          style={{
            ...(pos === "top"
              ? { bottom: "calc(100% + 8px)" }
              : { top: "calc(100% + 8px)" }),
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
          }}
        >
          {/* Arrow */}
          <span
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              ...(pos === "top"
                ? { bottom: -5, borderTop: "5px solid #1e2d42", borderLeft: "5px solid transparent", borderRight: "5px solid transparent" }
                : { top: -5, borderBottom: "5px solid #1e2d42", borderLeft: "5px solid transparent", borderRight: "5px solid transparent" }),
              width: 0, height: 0,
            }}
          />
          <span
            className="flex flex-col gap-0.5 px-2.5 py-1.5 rounded-lg text-xs leading-snug"
            style={{
              background: "#0d1421",
              border: "1px solid #1e2d42",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              color: "#94a3b8",
              maxWidth: 240,
              whiteSpace: "normal",
            }}
          >
            <span className="font-black text-[11px]" style={{ color: "#e8edf5" }}>{key}</span>
            <span>{def}</span>
          </span>
        </span>
      )}
    </span>
  );
}

// ── TipText: wraps a plain string and auto-detects known acronyms ─────────────
// Useful for column headers like "DB", "BP", "BC", "V", "N", "Pts"...

export function TipText({ children, className, style }: {
  children: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const key = children.trim();
  if (GLOSSARY[key]) {
    return <Tooltip term={key} className={className} style={style} />;
  }
  return <span className={className} style={style}>{children}</span>;
}
