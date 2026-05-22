// Shared hexagonal radar (spider chart) used by three callers that all paint
// the same 220×200 SVG with 6 axes, 4 concentric rings, spokes from centre,
// two filled polygons (home + away), dots at each axis endpoint, and rotated
// labels around the perimeter:
//
//   • PredictionsTab → TeamSpiderChart (L1/L2 match preview)
//   • PredictionsTab → WCSpiderChart   (World Cup match preview)
//   • MonClubTab     → ConfrontationSpiderChart (head-to-head card)
//
// Header chrome (titles, legends) stays in each caller — the differences are
// purely cosmetic and not worth a config blob. This component is the SVG only.

export interface HexRadarAxis {
  label: string;
  /** Home value, clamped to [0, 1]. */
  h: number;
  /** Away value, clamped to [0, 1]. */
  a: number;
}

interface HexRadarProps {
  axes: HexRadarAxis[];
  homeColor: string;
  awayColor: string;
  /** Tailwind classes for the <svg>. Defaults to "w-full h-44". */
  className?: string;
  /** Label font size in SVG units. Defaults to 9. */
  labelFontSize?: number;
  /** Dot radius at each axis endpoint. Defaults to 2. */
  dotRadius?: number;
  /** Home polygon fill alpha as a hex pair (e.g. "38"). Defaults to "38". */
  homeFillAlpha?: string;
  /** Away polygon fill alpha as a hex pair (e.g. "38"). Defaults to "38". */
  awayFillAlpha?: string;
}

export default function HexRadar({
  axes,
  homeColor,
  awayColor,
  className = "w-full h-44",
  labelFontSize = 9,
  dotRadius = 2,
  homeFillAlpha = "38",
  awayFillAlpha = "38",
}: HexRadarProps) {
  const cx = 110, cy = 100, R = 70;
  const N = axes.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
  const point = (i: number, r: number): [number, number] => [
    cx + r * Math.cos(angle(i)),
    cy + r * Math.sin(angle(i)),
  ];

  const rings = [0.25, 0.5, 0.75, 1].map(t =>
    Array.from({ length: N }, (_, i) => point(i, R * t).join(",")).join(" ")
  );
  const spokes = Array.from({ length: N }, (_, i) => point(i, R));
  const poly = (vals: number[]) => vals.map((v, i) => point(i, R * v).join(",")).join(" ");

  return (
    <svg viewBox="0 0 220 200" className={className}>
      {/* Grid rings */}
      {rings.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
      ))}
      {/* Spokes */}
      {spokes.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
      ))}
      {/* Away polygon (back) */}
      <polygon
        points={poly(axes.map(a => a.a))}
        fill={`${awayColor}${awayFillAlpha}`}
        stroke={awayColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Home polygon (front) */}
      <polygon
        points={poly(axes.map(a => a.h))}
        fill={`${homeColor}${homeFillAlpha}`}
        stroke={homeColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Axis dots */}
      {axes.map((a, i) => {
        const ph = point(i, R * a.h);
        const pa = point(i, R * a.a);
        return (
          <g key={i}>
            <circle cx={pa[0]} cy={pa[1]} r={dotRadius} fill={awayColor} />
            <circle cx={ph[0]} cy={ph[1]} r={dotRadius} fill={homeColor} />
          </g>
        );
      })}
      {/* Axis labels — anchored by angle so they sit outside the polygon */}
      {axes.map((a, i) => {
        const [lx, ly] = point(i, R + 14);
        const ang = angle(i);
        const anchor = Math.cos(ang) > 0.3 ? "start" : Math.cos(ang) < -0.3 ? "end" : "middle";
        return (
          <text key={i} x={lx} y={ly + 3} textAnchor={anchor}
            fontSize={labelFontSize} fill="#9aa7ba" fontWeight="600">
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}
