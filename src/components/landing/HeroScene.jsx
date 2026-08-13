// Code-drawn hero backdrop: isometric city map, the business at the centre, and
// verified listing pins wired back to it. Replaces the old hero-bg raster so the
// scene stays crisp at any resolution and can animate.

const VW = 1024;
const VH = 533;
const CX = 742; // scene centre — keeps the left third clear for the headline
const CY = 250;

// Whole illustration is scaled about (CX, CY) and nudged down, so the map,
// arcs and pins stay in step with each other.
const SCENE_SCALE = 0.87;
const SCENE_DROP = 34;

const STEP = 52;

// 2:1 isometric projection. Ground plane is (x, y), z is height above it.
const PX = (x, y) => x - y;
const PY = (x, y, z = 0) => (x + y) * 0.5 - z;
const P = (x, y, z = 0) => `${PX(x, y)},${PY(x, y, z)}`;

// Quad on the y = k face (renders on the viewer's left).
const faceL = (k, a, b, z0, z1) => `${P(a, k, z0)} ${P(b, k, z0)} ${P(b, k, z1)} ${P(a, k, z1)}`;
// Quad on the x = k face (renders on the viewer's right).
const faceR = (k, a, b, z0, z1) => `${P(k, a, z0)} ${P(k, b, z0)} ${P(k, b, z1)} ${P(k, a, z1)}`;

const GRID = (() => {
  const lines = [];
  const n = 11;
  const len = n * STEP;
  for (let i = -n; i <= n; i++) {
    const major = i % 3 === 0;
    lines.push({ a: [-len, i * STEP, len, i * STEP], major });
    lines.push({ a: [i * STEP, -len, i * STEP, len], major });
  }
  return lines;
})();

const BLOCKS = (() => {
  const out = [];
  const n = 9;
  for (let i = -n; i < n; i++) {
    for (let j = -n; j < n; j++) {
      const h = (i * 7 + j * 13 + i * j + 100) % 11;
      if (h < 3) continue;
      const inset = 6 + (h % 3) * 3;
      out.push({
        x: i * STEP + inset,
        y: j * STEP + inset,
        s: STEP - inset * 2,
        park: h === 10,
        o: 0.05 + (h % 4) * 0.028,
      });
    }
  }
  return out;
})();

// Scattered city lights so the map reads as inhabited rather than as a wireframe.
const SPARKS = (() => {
  const out = [];
  for (let i = 0; i < 60; i++) {
    const a = (i * 2.399) % (Math.PI * 2);
    const r = 60 + ((i * 97) % 430);
    out.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r * 0.55,
      r: i % 7 === 0 ? 1.9 : 1.1,
      t: i % 3 === 0,
    });
  }
  return out;
})();

const ICONS = {
  store: "M-6-4h12v8h-12z M-7-4l2-3h10l2 3z",
  shop: "M-6-3.5h12v8h-12z M-6-3.5l1.6-3h8.8l1.6 3 M-2 4.5v-4h4v4",
  calendar: "M-5.5-5h11v10h-11z M-5.5-1.5h11 M-2.5-7.5v3 M2.5-7.5v3",
  chat: "M-6.5-5h13v8h-7.5l-3.5 3v-3h-2z",
  camera: "M-7-3h14v8h-14z M-2.5-3l1.2-2.2h2.6L4.5-3 M0 1.4a2.4 2.4 0 100-4.8 2.4 2.4 0 000 4.8z",
  mail: "M-6.5-4h13v8h-13z M-6.5-4l6.5 5 6.5-5",
  bag: "M-5-3.5h10v9h-10z M-2.6-3.5v-1.6a2.6 2.6 0 015.2 0v1.6",
  building: "M-5-6h10v11h-10z M-2.4-3h1.2 M1.4-3h1.2 M-2.4.4h1.2 M1.4.4h1.2",
};

// Pin tips, roughly mirroring the reference layout: a ring of listings orbiting
// the business, denser on the right where there is room.
const PINS = [
  { x: 556, y: 108, s: 0.74, icon: "building", hue: "v", d: 0.0 },
  { x: 700, y: 84, s: 0.7, icon: "calendar", hue: "t", d: 1.4 },
  { x: 906, y: 92, s: 0.72, icon: "bag", hue: "t", d: 0.6 },
  { x: 976, y: 152, s: 0.7, icon: "mail", hue: "v", d: 2.1 },
  { x: 996, y: 218, s: 0.76, icon: "chat", hue: "t", d: 1.1 },
  { x: 964, y: 336, s: 0.72, icon: "camera", hue: "v", d: 2.6 },
  { x: 856, y: 398, s: 0.76, icon: "calendar", hue: "t", d: 0.3 },
  { x: 576, y: 414, s: 0.72, icon: "bag", hue: "v", d: 1.8 },
  { x: 478, y: 344, s: 0.76, icon: "store", hue: "t", d: 0.9 },
  { x: 430, y: 248, s: 0.8, icon: "shop", hue: "v", d: 2.3 },
  { x: 488, y: 160, s: 0.72, icon: "store", hue: "t", d: 1.6 },
];

// Quadratic arc that bows away from the straight line, so links read as orbits
// rather than spokes.
function arcPath(x, y) {
  const sx = CX;
  const sy = CY + 56;
  const mx = (sx + x) / 2;
  const my = (sy + y) / 2;
  const dist = Math.hypot(x - sx, y - sy);
  const lift = Math.min(150, dist * 0.42);
  return `M${sx} ${sy} Q${mx} ${my - lift} ${x} ${y}`;
}

function Box({ x0, y0, x1, y1, z0 = 0, h, top, left, right, edge = "#7C87D8", edgeOpacity = 0.28 }) {
  return (
    <g stroke={edge} strokeOpacity={edgeOpacity} strokeWidth=".7" strokeLinejoin="round">
      <polygon points={faceL(y1, x0, x1, z0, z0 + h)} fill={left} />
      <polygon points={faceR(x1, y0, y1, z0, z0 + h)} fill={right} />
      <polygon points={`${P(x0, y0, z0 + h)} ${P(x1, y0, z0 + h)} ${P(x1, y1, z0 + h)} ${P(x0, y1, z0 + h)}`} fill={top} />
    </g>
  );
}

// Ground shadow: the footprint plus the same footprint pushed along the light
// direction, hulled into one hexagon — the standard isometric cast shadow.
function Shadow({ x0, y0, x1, y1, h, o = 0.45 }) {
  const dx = h * 0.4;
  const dy = h * 0.28;
  const pts = [
    P(x0, y0),
    P(x1, y0),
    P(x1 + dx, y0 + dy),
    P(x1 + dx, y1 + dy),
    P(x0 + dx, y1 + dy),
    P(x0, y1),
  ].join(" ");
  return <polygon points={pts} fill="#030514" opacity={o} filter="url(#hsSoft)" />;
}

function Lamp({ x, y }) {
  const bx = PX(x, y);
  const gy = PY(x, y, 0);
  return (
    <g>
      <ellipse cx={bx} cy={gy} rx="20" ry="10" fill="url(#hsWarm)" opacity=".5" />
      <polygon points={`${bx - 1.5},${PY(x, y, 24)} ${bx + 1.5},${PY(x, y, 24)} ${bx + 18},${gy} ${bx - 18},${gy}`} fill="url(#hsCone)" opacity=".45" />
      <line x1={bx} y1={gy} x2={bx} y2={PY(x, y, 23)} stroke="#A6AFE4" strokeWidth="1.2" strokeOpacity=".85" />
      <circle cx={bx} cy={PY(x, y, 25.5)} r="7" fill="#FFC46B" opacity=".5" filter="url(#hsSoft)" />
      <circle cx={bx} cy={PY(x, y, 25)} r="2.3" fill="#FFF0D2" />
    </g>
  );
}

function Tree({ x, y, s = 1 }) {
  const bx = PX(x, y);
  return (
    <g>
      <ellipse cx={bx + 8 * s} cy={PY(x, y, 0) + 3.5 * s} rx={9 * s} ry={4.4 * s} fill="#030514" opacity=".5" filter="url(#hsSoft)" />
      <line x1={bx} y1={PY(x, y, 0)} x2={bx} y2={PY(x, y, 8 * s)} stroke="#33306A" strokeWidth={1.7 * s} />
      <ellipse cx={bx} cy={PY(x, y, 14 * s)} rx={7 * s} ry={8.5 * s} fill="#1B6E54" />
      <ellipse cx={bx - 2 * s} cy={PY(x, y, 16 * s)} rx={3.6 * s} ry={4.6 * s} fill="#46E0A6" opacity=".28" />
    </g>
  );
}

// Sloped striped canopy wrapping the two visible sides of the storefront.
function Awning({ inner, outer, zi, zo, n = 9 }) {
  const strips = [];
  for (let k = 0; k < n; k++) {
    const t0 = -inner + (2 * inner * k) / n;
    const t1 = -inner + (2 * inner * (k + 1)) / n;
    const o0 = -outer + (2 * outer * k) / n;
    const o1 = -outer + (2 * outer * (k + 1)) / n;
    const pale = k % 2 === 0;
    strips.push(
      <polygon key={`al${k}`} points={`${P(t0, inner, zi)} ${P(t1, inner, zi)} ${P(o1, outer, zo)} ${P(o0, outer, zo)}`} fill={pale ? "#F2F4FF" : "#6E64E6"} />,
    );
    strips.push(
      <polygon key={`ar${k}`} points={`${P(inner, t0, zi)} ${P(inner, t1, zi)} ${P(outer, o1, zo)} ${P(outer, o0, zo)}`} fill={pale ? "#DDE2F7" : "#5C53CE"} />,
    );
  }
  return (
    <g>
      {strips}
      {/* fascia along the outer lip */}
      <polygon points={`${P(-outer, outer, zo)} ${P(outer, outer, zo)} ${P(outer, outer, zo - 2.6)} ${P(-outer, outer, zo - 2.6)}`} fill="#C9CFEE" />
      <polygon points={`${P(outer, -outer, zo)} ${P(outer, outer, zo)} ${P(outer, outer, zo - 2.6)} ${P(outer, -outer, zo - 2.6)}`} fill="#AEB6DE" />
    </g>
  );
}

function Pin({ x, y, s, icon, hue, d }) {
  const teal = hue === "t";
  const ring = teal ? "#2BE3A8" : "#8E7BFF";
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="2" rx="15" ry="5" fill={ring} opacity=".18" />
      <g className="hsFloat" style={{ animationDelay: `${d}s` }}>
        <path
          d="M0 0C-8.5-13.5-16-19.5-16-28A16 16 0 1 1 16-28C16-19.5 8.5-13.5 0 0Z"
          fill={`url(#hsPinFill${teal ? "T" : "V"})`}
          fillOpacity=".92"
          stroke={ring}
          strokeOpacity=".55"
          strokeWidth="1.1"
        />
        {/* glassy highlight across the head */}
        <ellipse cx="-4.5" cy="-34" rx="8" ry="5" fill="#FFFFFF" opacity=".2" />
        <circle cx="0" cy="-28" r="11.5" fill="#070A20" opacity=".45" />
        <g transform="translate(0 -28) scale(.9)" fill="none" stroke="#EAF7F2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d={ICONS[icon]} />
        </g>
        <circle cx="12" cy="-38" r="7.2" fill="#06132A" stroke="#2BE3A8" strokeWidth="1.5" />
        <path d="M8.9-38.2l2.1 2.1 4.1-4.3" fill="none" stroke="#3CF0B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  );
}

// Storefront: lit glass ground floor under a striped canopy, dark upper storey.
function Storefront() {
  const S = 30;
  const GZ0 = 4;
  const GZ1 = 25;
  const UZ0 = 27;
  const UZ1 = 50;

  return (
    <g>
      {/* plinth */}
      <Box x0={-34} y0={-34} x1={34} y1={34} h={4} top="#5A62A6" left="#222654" right="#2E3470" />

      {/* lit glass ground floor */}
      <polygon points={faceL(S, -S, S, GZ0, GZ1)} fill="url(#hsGlassL)" />
      <polygon points={faceR(S, -S, S, GZ0, GZ1)} fill="url(#hsGlassR)" />
      <polygon points={faceL(S, -S, S, GZ0, GZ1 - 8)} fill="#FFD79A" opacity=".4" filter="url(#hsSoft)" />
      <polygon points={faceR(S, -S, S, GZ0, GZ1 - 8)} fill="#FFC377" opacity=".3" filter="url(#hsSoft)" />
      <g stroke="#171B3E" strokeOpacity=".8" strokeWidth="1.5">
        {[-20, -10, 0, 10, 20].map((v) => (
          <line key={`ml${v}`} x1={PX(v, S)} y1={PY(v, S, GZ0)} x2={PX(v, S)} y2={PY(v, S, GZ1)} />
        ))}
        {[-20, -10, 0, 10, 20].map((v) => (
          <line key={`mr${v}`} x1={PX(S, v)} y1={PY(S, v, GZ0)} x2={PX(S, v)} y2={PY(S, v, GZ1)} />
        ))}
      </g>
      {/* doorway */}
      <polygon points={faceL(S, -5, 5, GZ0, GZ1 - 4)} fill="#2A1D12" opacity=".55" />

      <Awning inner={S} outer={41} zi={UZ0} zo={20} />

      {/* upper storey */}
      <Box x0={-S} y0={-S} x1={S} y1={S} z0={UZ0} h={UZ1 - UZ0} top="#3B4290" left="#191D4A" right="#252B63" />
      <g fill="#CBD9FF" opacity=".72">
        {[-24, -12, 0, 12].map((v) => (
          <polygon key={`wl${v}`} points={faceL(S, v, v + 8, UZ0 + 8, UZ0 + 15)} />
        ))}
        {[-24, -12, 0, 12].map((v) => (
          <polygon key={`wr${v}`} points={faceR(S, v, v + 8, UZ0 + 8, UZ0 + 15)} opacity=".6" />
        ))}
      </g>

      {/* roof cap + rim light */}
      <Box x0={-25} y0={-25} x1={25} y1={25} z0={UZ1} h={3} top="#4E56AC" left="#242A5E" right="#323878" />
      <polygon
        points={`${P(-S, -S, UZ1)} ${P(S, -S, UZ1)} ${P(S, S, UZ1)} ${P(-S, S, UZ1)}`}
        fill="none"
        stroke="#8E7BFF"
        strokeOpacity=".5"
        strokeWidth="1.1"
      />
    </g>
  );
}

export function HeroScene() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <style>{`
        @keyframes hsFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes hsFlow{to{stroke-dashoffset:-160}}
        @keyframes hsHalo{0%,100%{opacity:.45;transform:scale(1)}50%{opacity:.8;transform:scale(1.06)}}
        @keyframes hsRing{0%{opacity:.45;transform:scale(.32)}100%{opacity:0;transform:scale(1)}}
        @keyframes hsGlow{0%,100%{opacity:.4}50%{opacity:.62}}
        @keyframes hsTwinkle{0%,100%{opacity:.25}50%{opacity:.9}}
        .hsFloat{animation:hsFloat 6s ease-in-out infinite}
        .hsFlow{animation:hsFlow 3.4s linear infinite}
        .hsHalo{animation:hsHalo 4.5s ease-in-out infinite;transform-origin:${CX}px ${CY - 84}px}
        .hsRing{animation:hsRing 5s ease-out infinite;transform-origin:${CX}px ${CY - 9}px}
        .hsGlow{animation:hsGlow 5.5s ease-in-out infinite}
        .hsTwinkle{animation:hsTwinkle 4s ease-in-out infinite}
      `}</style>

      <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block" }}>
        <defs>
          <linearGradient id="hsSky" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#05071A" />
            <stop offset=".55" stopColor="#080B24" />
            <stop offset="1" stopColor="#0C1035" />
          </linearGradient>
          <radialGradient id="hsAmbient" cx="72%" cy="50%" r="52%">
            <stop offset="0" stopColor="#2A2278" stopOpacity=".34" />
            <stop offset=".5" stopColor="#141A4E" stopOpacity=".16" />
            <stop offset="1" stopColor="#05071A" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hsFade" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#fff" />
            <stop offset=".62" stopColor="#fff" stopOpacity=".72" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hsWarm" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#FFC97E" stopOpacity=".8" />
            <stop offset=".45" stopColor="#FFA94D" stopOpacity=".32" />
            <stop offset="1" stopColor="#FF9A3C" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hsCone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFD79A" stopOpacity=".5" />
            <stop offset="1" stopColor="#FFAE55" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hsThrowL" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFC378" stopOpacity=".45" />
            <stop offset="1" stopColor="#FF9F45" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hsGlassL" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFE9C4" />
            <stop offset=".5" stopColor="#FFB765" />
            <stop offset="1" stopColor="#B4632F" />
          </linearGradient>
          <linearGradient id="hsGlassR" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFDCA8" />
            <stop offset=".5" stopColor="#ED9C4C" />
            <stop offset="1" stopColor="#8E4B26" />
          </linearGradient>
          <linearGradient id="hsSlab" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#B7C0EA" />
            <stop offset=".5" stopColor="#7B85BE" />
            <stop offset="1" stopColor="#4E5695" />
          </linearGradient>
          <linearGradient id="hsPinFillV" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8878FF" />
            <stop offset="1" stopColor="#3A2D9C" />
          </linearGradient>
          <linearGradient id="hsPinFillT" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2FC7A8" />
            <stop offset="1" stopColor="#12455A" />
          </linearGradient>
          <linearGradient id="hsVignette" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#05071A" stopOpacity=".94" />
            <stop offset=".3" stopColor="#05071A" stopOpacity=".4" />
            <stop offset=".6" stopColor="#05071A" stopOpacity="0" />
          </linearGradient>
          <filter id="hsBlur" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <filter id="hsSoft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id="hsLine" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          <clipPath id="hsSlabTop">
            <polygon points={`${P(-62, -62)} ${P(62, -62)} ${P(62, 62)} ${P(-62, 62)}`} />
          </clipPath>
          <mask id="hsMapMask">
            <ellipse cx={CX - 20} cy={CY + 50} rx="530" ry="330" fill="url(#hsFade)" />
          </mask>
        </defs>

        <rect width={VW} height={VH} fill="url(#hsSky)" />
        <rect width={VW} height={VH} fill="url(#hsAmbient)" />

        <g transform={`translate(${CX} ${CY + SCENE_DROP}) scale(${SCENE_SCALE}) translate(${-CX} ${-CY})`}>
          {/* Isometric street grid */}
          <g mask="url(#hsMapMask)">
            <g transform={`translate(${CX - 20} ${CY + 50}) scale(1 .52) rotate(45)`}>
              {BLOCKS.map((b, i) => (
                <rect
                  key={i}
                  x={b.x}
                  y={b.y}
                  width={b.s}
                  height={b.s}
                  rx="3"
                  fill={b.park ? "#2FBF8E" : "#93AEFF"}
                  opacity={b.park ? 0.12 : b.o}
                />
              ))}
              {GRID.map((l, i) => (
                <line
                  key={i}
                  x1={l.a[0]}
                  y1={l.a[1]}
                  x2={l.a[2]}
                  y2={l.a[3]}
                  stroke={l.major ? "#7FE3D0" : "#8AA5FF"}
                  strokeOpacity={l.major ? 0.3 : 0.15}
                  strokeWidth={l.major ? 2.4 : 1}
                />
              ))}
            </g>
            <g transform={`translate(${CX - 20} ${CY + 50})`}>
              {SPARKS.map((s, i) => (
                <circle
                  key={i}
                  className="hsTwinkle"
                  cx={s.x}
                  cy={s.y}
                  r={s.r}
                  fill={s.t ? "#5CF3C6" : "#A99BFF"}
                  style={{ animationDelay: `${(i % 9) * 0.45}s` }}
                />
              ))}
            </g>
          </g>

          {/* Connection arcs */}
          <g fill="none" strokeLinecap="round">
            {PINS.map((p, i) => {
              const dPath = arcPath(p.x, p.y);
              const c = p.hue === "t" ? "#3FE9BE" : "#9C8BFF";
              return (
                <g key={i}>
                  <path d={dPath} stroke={c} strokeWidth="1" opacity=".22" />
                  <path
                    className="hsFlow"
                    d={dPath}
                    stroke={c}
                    strokeWidth="2.6"
                    strokeDasharray="1.5 13"
                    opacity=".95"
                    filter="url(#hsLine)"
                    style={{ animationDelay: `${p.d * 0.6}s`, animationDuration: `${3 + (i % 4) * 0.5}s` }}
                  />
                  <path
                    className="hsFlow"
                    d={dPath}
                    stroke={c}
                    strokeWidth="1.6"
                    strokeDasharray="1.5 13"
                    style={{ animationDelay: `${p.d * 0.6}s`, animationDuration: `${3 + (i % 4) * 0.5}s` }}
                  />
                </g>
              );
            })}
          </g>

          {/* ── The business ─────────────────────────────────────────────── */}
          <ellipse className="hsGlow" cx={CX} cy={CY + 16} rx="150" ry="72" fill="#5A46E0" opacity=".5" filter="url(#hsBlur)" />

          <g transform={`translate(${CX} ${CY})`}>
            {/* slab drop shadow onto the map */}
            <ellipse cx="0" cy="16" rx="130" ry="62" fill="#030514" opacity=".55" filter="url(#hsBlur)" />

            <Box x0={-62} y0={-62} x1={62} y1={62} h={9} top="url(#hsSlab)" left="#171B41" right="#212659" edge="#AAB3EC" edgeOpacity={0.45} />
            <g stroke="#DDE3FF" strokeOpacity=".14" strokeWidth="1">
              {[-31, 0, 31].map((v) => (
                <line key={`pl${v}`} x1={PX(v, -62)} y1={PY(v, -62, 9)} x2={PX(v, 62)} y2={PY(v, 62, 9)} />
              ))}
              {[-31, 0, 31].map((v) => (
                <line key={`pr${v}`} x1={PX(-62, v)} y1={PY(-62, v, 9)} x2={PX(62, v)} y2={PY(62, v, 9)} />
              ))}
            </g>

            <g className="hsRing">
              <polygon points={`${P(-62, -62, 9)} ${P(62, -62, 9)} ${P(62, 62, 9)} ${P(-62, 62, 9)}`} fill="none" stroke="#2BE3A8" strokeWidth="2" />
            </g>

            {/* everything on the slab, drawn back-to-front */}
            <g transform="translate(0 -9)">
              <g clipPath="url(#hsSlabTop)">
                <ellipse cx={PX(0, 0)} cy={PY(0, 0, 0)} rx="100" ry="50" fill="url(#hsWarm)" opacity=".55" filter="url(#hsSoft)" />
                <polygon points={`${P(-30, 30)} ${P(30, 30)} ${P(41, 60)} ${P(-41, 60)}`} fill="url(#hsThrowL)" opacity=".5" filter="url(#hsSoft)" />
                <polygon points={`${P(30, -30)} ${P(30, 30)} ${P(60, 41)} ${P(60, -41)}`} fill="url(#hsThrowL)" opacity=".4" filter="url(#hsSoft)" />
                <Shadow x0={-58} y0={-14} x1={-38} y1={40} h={58} o={0.55} />
                <Shadow x0={38} y0={-30} x1={58} y1={14} h={44} o={0.5} />
                <Shadow x0={-34} y0={-34} x1={34} y1={34} h={50} o={0.42} />
              </g>

              <Lamp x={-48} y={-48} />
              <Tree x={16} y={-52} s={0.9} />
              <Tree x={-48} y={-32} s={0.95} />

              <Box x0={-58} y0={-14} x1={-38} y1={40} h={58} top="#333A82" left="#12163A" right="#1D2257" />
              <polygon points={faceR(-38, -14, 40, 0, 58)} fill="#FFB169" opacity=".14" />
              <g fill="#CBD9FF" opacity=".6">
                {[0, 1, 2, 3].map((r) =>
                  [0, 1].map((c) => (
                    <polygon key={`bl${r}${c}`} points={faceL(40, -55 + c * 9, -49 + c * 9, 12 + r * 12, 19 + r * 12)} />
                  )),
                )}
              </g>

              <Storefront />

              <Box x0={38} y0={-30} x1={58} y1={14} h={44} top="#2E3576" left="#101439" right="#1B2052" />
              <polygon points={faceL(14, 38, 58, 0, 44)} fill="#FFB169" opacity=".12" />
              <g fill="#FFE1AE" opacity=".5">
                {[0, 1, 2].map((r) =>
                  [0, 1].map((c) => (
                    <polygon key={`br${r}${c}`} points={faceR(58, -26 + c * 16, -18 + c * 16, 10 + r * 12, 17 + r * 12)} />
                  )),
                )}
              </g>

              <Tree x={48} y={36} s={1} />
              <Lamp x={52} y={54} />
              <Tree x={-16} y={54} s={1.05} />
              <Lamp x={-50} y={52} />
            </g>
          </g>

          {/* Verified badge pin hovering over the business */}
          <g className="hsHalo">
            <circle cx={CX} cy={CY - 84} r="50" fill="#7C6BFF" opacity=".42" filter="url(#hsBlur)" />
          </g>
          <g transform={`translate(${CX} ${CY - 62}) scale(1.9)`}>
            <path
              d="M0 0C-8.5-13.5-16-19.5-16-28A16 16 0 1 1 16-28C16-19.5 8.5-13.5 0 0Z"
              fill="url(#hsPinFillV)"
              fillOpacity=".95"
              stroke="#B4A8FF"
              strokeOpacity=".75"
              strokeWidth="1.2"
            />
            <ellipse cx="-4.5" cy="-34" rx="8" ry="5" fill="#FFFFFF" opacity=".22" />
            <circle cx="0" cy="-28" r="11.5" fill="#0A0C24" opacity=".4" />
            <circle cx="0" cy="-28" r="11.5" fill="none" stroke="#3CF0B4" strokeWidth="1.4" strokeOpacity=".85" />
            <path d="M-5.4-28.4l3.6 3.7 7.3-7.6" fill="none" stroke="#3CF0B4" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {PINS.map((p, i) => (
            <Pin key={i} {...p} />
          ))}
        </g>

        {/* Vignette so the headline side stays dark */}
        <rect width={VW} height={VH} fill="url(#hsVignette)" />
      </svg>
    </div>
  );
}
