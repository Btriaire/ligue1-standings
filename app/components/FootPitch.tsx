// Shared football pitch SVG used by Mon Club and World Cup "Ma Compo"
// surfaces. Kept in its own component so the layout stays identical
// across the app.
export default function FootPitch({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 200 290" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0 }}>
      <rect width="200" height="290" fill="#1e4d1e"/>
      {[0,1,2,3,4].map(i => (
        <rect key={i} x={i*40} width="40" height="290" fill={i%2===0 ? "#1e4d1e" : "#1a461a"}/>
      ))}
      <rect x="8" y="10" width="184" height="270" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
      <line x1="8" y1="145" x2="192" y2="145" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
      <circle cx="100" cy="145" r="28" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
      <circle cx="100" cy="145" r="2" fill="rgba(255,255,255,0.6)"/>
      <rect x="44" y="10" width="112" height="46" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
      <rect x="64" y="10" width="72" height="22" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
      <line x1="80" y1="10" x2="120" y2="10" stroke="rgba(255,255,255,0.7)" strokeWidth="3"/>
      <rect x="44" y="234" width="112" height="46" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
      <rect x="64" y="258" width="72" height="22" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
      <line x1="80" y1="280" x2="120" y2="280" stroke="rgba(255,255,255,0.7)" strokeWidth="3"/>
      <defs>
        <linearGradient id={`po-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.12"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.06"/>
        </linearGradient>
      </defs>
      <rect width="200" height="290" fill={`url(#po-${color.replace("#", "")})`}/>
    </svg>
  );
}
