// Engram studio house style — design tokens (one studio, two lights).
// Single source of truth for colours, type, line widths, radii and glows. tokens.css is generated from this file:
//   node -e "import('./lib/house/tokens.js').then(m => process.stdout.write(m.toCSS()))" > lib/house/tokens.css
// Pages normally use the CSS variables (house.css) and the 3D modules read these objects directly.
//
//   import { look, lerpLook, FONT, SIZE } from '/lib/house/tokens.js';
//   const L = look('light');          // named colours for the light studio
//   const M = lerpLook(k);            // k = 1 lights on (light) … 0 lights off (dark); every colour interpolated
//
// Colour semantics (fixed across both modes; HOUSE.md §2):
//   cyan    = now / normal / the system itself (main accent)
//   amber   = the student's (their question, what their hand touches) — the only warm colour, small amounts
//   magenta = stress / warning / broken
//   grey    = not yet / unavailable / retired
//   everything else is blue-grey.

export const MODES = ['light', 'dark'];

/** Light studio (lights on) — from experiment 18 S1. */
export const LIGHT = {
  // room (3D cyc + flat background)
  wallTop: '#F7F9FB', wallLow: '#E8EDF2', wallEdge: '#D9E0E8', horizon: '#DCE3EA', floorNear: '#DCE2E9', floorFar: '#E9EDF1',
  pool: '#F6F8FA', grid: '#9EAEC0', bg: '#EEF2F6',
  shell: '#F7F9FC', shadow: '#46566C',
  // panels (holo: pale blue, cyan rim)
  panelTop: 'rgba(246,252,255,0.92)', panelBot: 'rgba(224,243,253,0.86)', sheen: 'rgba(255,255,255,0.55)',
  edge: 'rgba(22,166,222,0.85)', edgeTop: 'rgba(22,166,222,0.95)', hair: 'rgba(22,166,222,0.30)', bracket: '#16A6DE',
  glow: 'rgba(70,212,255,0.36)', glowRing: 'rgba(70,212,255,0.12)', drop: 'rgba(40,70,100,0.13)',
  tintA: 'rgba(70,212,255,0.00)', tintB: 'rgba(255,79,216,0.00)',
  veil: 'rgba(238,242,246,0.78)',
  // text
  ink: '#14304A', ink2: '#4A6680', ink3: '#7D93A8', inkOn: '#FFFFFF',
  // semantics
  cyan: '#46D4FF', line: '#16A6DE', cyanInk: '#0B79AE', nowA: '#2FC2F4', nowB: '#139FD8', nowEdge: '#0E8FC6',
  doneFill: '#DDF4FC', anchorFill: '#FFFFFF',
  amber: '#FF9F1C', amberInk: '#B25E00', amberFill: '#FFF3E0',
  magenta: '#E8389F', magentaInk: '#B8177A', magentaFill: '#FDE7F3',
  grey: '#BCCBD8', greyInk: '#7D93A8', greyFill: 'rgba(246,250,253,0.80)',
};

/** Dark studio (the same room with the lights off) — from experiment 18 S2, lifted so the top of frame is not a black hole. */
export const DARK = {
  wallTop: '#0C1630', wallLow: '#1B2F57', wallEdge: '#070D1C', horizon: '#2C4A7E', floorNear: '#0D172C', floorFar: '#14223E',
  pool: '#1A2B4C', grid: '#3E7FC0', bg: '#0A1222',
  shell: '#F7F9FC', shadow: '#01030A',
  // panels (frosted glass: navy fill, edge light, cyan / magenta corner tint)
  panelTop: 'rgba(46,70,118,0.74)', panelBot: 'rgba(14,24,48,0.70)', sheen: 'rgba(170,215,255,0.13)',
  edge: 'rgba(120,214,255,0.50)', edgeTop: 'rgba(221,246,255,0.85)', hair: 'rgba(190,225,255,0.20)', bracket: '#36E2FF',
  glow: 'rgba(54,226,255,0.24)', glowRing: 'rgba(54,226,255,0.08)', drop: 'rgba(0,2,8,0.50)',
  tintA: 'rgba(54,226,255,0.16)', tintB: 'rgba(255,79,216,0.13)',
  veil: 'rgba(6,11,22,0.70)',
  // text
  ink: '#EEF4FF', ink2: '#A9B8D0', ink3: '#7F8DA6', inkOn: '#FFFFFF',
  // semantics
  cyan: '#36E2FF', line: '#5BE0FF', cyanInk: '#6FEAFF', nowA: '#2FC2F4', nowB: '#139FD8', nowEdge: '#7FE9FF',
  doneFill: 'rgba(54,226,255,0.10)', anchorFill: '#05121C',
  amber: '#FFB547', amberInk: '#FFC266', amberFill: 'rgba(255,181,71,0.14)',
  magenta: '#FF4FD8', magentaInk: '#FF7BE2', magentaFill: 'rgba(255,79,216,0.14)',
  grey: '#4E5B72', greyInk: '#8A97AD', greyFill: 'rgba(16,24,44,0.70)',
};

export const look = mode => (mode === 'dark' ? DARK : LIGHT);

/** Type. Chinese Noto Sans TC 700/800/900; numbers and English Inter 700/800. No handwriting. */
export const FONT = {
  tc: '"Noto Sans TC", Inter, sans-serif',
  en: 'Inter, "Noto Sans TC", sans-serif',
  num: 'Inter, "Noto Sans TC", sans-serif',
  weights: { tc: ['700', '800', '900'], en: ['700', '800'] },
};

/** Sizes on a 1920×1080 frame (px). 04-skeleton §7: mid-lesson text ≥ 28, key numbers ≥ 36. */
export const SIZE = {
  label: 34, labelSub: 28, num: 36, bigNum: 52, hudNum: 76,
  title: 62, say: 54, mmCenter: 50, mmNode: 38, foot: 26, tab: 28,
  badge: 44, stepDot: 36, safeBottom: 140,
};
/** Line widths (px on screen). */
export const LINE = { panel: 2, hair: 1.5, bracket: 3, bracketLen: 18, leader: 3, anchorR: 7, anchorW: 3.5, select: 3, handle: 14, mmLink: 3.5 };
/** Radii (px on screen; 3D canvases scale them with the canvas). */
export const RADIUS = { chip: 16, card: 18, key: 24, pill: 999, board: 54 };

// ---------------------------------------------------------------------------------------------- colour maths
/** Parse '#rgb' | '#rrggbb' | 'rgba(r,g,b,a)' | 'rgb(r,g,b)' → [r, g, b, a] (0–255, a 0–1). */
export function parse(c) {
  if (Array.isArray(c)) return c;
  c = String(c).trim();
  if (c[0] === '#') {
    let h = c.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
  }
  const m = c.match(/rgba?\(([^)]+)\)/); if (!m) throw new Error('house tokens: cannot parse colour ' + c);
  const p = m[1].split(',').map(s => parseFloat(s));
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
}
export const css = ([r, g, b, a]) => (a >= 0.999 ? '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase()
  : `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${(+a.toFixed(3))})`);
/** Mix two colours (sRGB, k = 0 → a, 1 → b). */
export function mix(a, b, k) { const A = parse(a), B = parse(b); return css(A.map((v, i) => v + (B[i] - v) * k)); }
/** Float [r,g,b] 0–1 in sRGB (for THREE.Color.setRGB(..., SRGBColorSpace) or shaders that convert). */
export const rgb01 = c => parse(c).slice(0, 3).map(v => v / 255);
export const alphaOf = c => parse(c)[3];

/** All tokens at lights level k (1 = light studio, 0 = dark studio). Pure function of k. */
export function lerpLook(k) {
  k = Math.max(0, Math.min(1, k));
  if (k >= 1) return LIGHT; if (k <= 0) return DARK;
  // text colours switch faster around the middle (the panel behind them passes through a mid tone)
  const kt = k * k * (3 - 2 * k), ks = kt * kt * (3 - 2 * kt);
  const o = {}; for (const key of Object.keys(LIGHT)) o[key] = mix(DARK[key], LIGHT[key], /ink|Ink/.test(key) ? ks : k); return o;
}
/** Quantise k so cached canvases redraw only when the look visibly changes. */
export const quantK = (k, steps = 16) => Math.round(Math.max(0, Math.min(1, k)) * steps) / steps;

// ---------------------------------------------------------------------------------------------- CSS
const kebab = s => s.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
/** CSS custom properties for a look (object of tokens): { '--h-ink': '#14304A', … }. */
export function cssVars(L) { const o = {}; for (const [k, v] of Object.entries(L)) o['--h-' + kebab(k)] = v; return o; }
/** Write the variables of lights level k onto an element's inline style (DOM lights transition). */
export function applyVars(el, k) { for (const [n, v] of Object.entries(cssVars(lerpLook(k)))) el.style.setProperty(n, v); }
/** tokens.css text (generated; see top of file). */
export function toCSS() {
  const block = (sel, L) => `${sel} {\n${Object.entries(cssVars(L)).map(([n, v]) => `  ${n}: ${v};`).join('\n')}\n}\n`;
  const sizes = Object.entries(SIZE).map(([k, v]) => `  --h-size-${kebab(k)}: ${v}px;`).join('\n');
  const lines = Object.entries(LINE).map(([k, v]) => `  --h-line-${kebab(k)}: ${v}px;`).join('\n');
  const radii = Object.entries(RADIUS).map(([k, v]) => `  --h-r-${kebab(k)}: ${v}px;`).join('\n');
  return `/* GENERATED from tokens.js (toCSS) — edit tokens.js, then regenerate. Engram studio house style tokens. */\n` +
    `:root, [data-house] {\n  --h-font-tc: ${FONT.tc};\n  --h-font-en: ${FONT.en};\n${sizes}\n${lines}\n${radii}\n}\n` +
    block(':root, [data-house="light"]', LIGHT) + block('[data-house="dark"]', DARK);
}

/** Load the house fonts' glyphs for `text` (call before drawing on canvas; DOM text loads by itself). */
export async function loadFonts(text = '0123456789') {
  if (typeof document === 'undefined') return;
  await document.fonts.ready;
  const jobs = [];
  for (const w of FONT.weights.tc) jobs.push(document.fonts.load(`${w} 64px "Noto Sans TC"`, text));
  for (const w of FONT.weights.en) jobs.push(document.fonts.load(`${w} 64px Inter`, text));
  await Promise.all(jobs); await document.fonts.ready;
}

// ---------------------------------------------------------------------------------------------- lights over a lesson
const _io = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const _c01 = x => Math.max(0, Math.min(1, x));
/**
 * Lights level at time t (pure). mode 'dark' → always 0. In a light lesson, spans = [[offAt, onAt], …] are the
 * lights-off moments: the room dims over `dur` seconds from offAt and comes back over `dur` from onAt.
 *   const k = lightsAt(t, [[214, 226]]);  room.lights(k); ui.lights(k);
 */
export function lightsAt(t, spans = [], { mode = 'light', dur = 1.2 } = {}) {
  if (mode === 'dark') return 0;
  let k = 1;
  for (const [a, b] of spans) k = Math.min(k, 1 - _io(_c01((t - a) / dur)) + _io(_c01((t - b) / dur)));
  return _c01(k);
}
/**
 * Check the lights-off rules (HOUSE.md §1): at most two per lesson, each fully dark ≥ 8 s, transitions 1–1.5 s,
 * lights back on before every key card that follows. Returns a list of problems ([] = fine); pages console.warn them.
 */
export function lintLights(spans = [], { keycards = [], dur = 1.2 } = {}) {
  const out = [];
  if (spans.length > 2) out.push(`lights-off ${spans.length} times (max 2 per lesson)`);
  if (dur < 1 || dur > 1.5) out.push(`transition ${dur}s (use 1–1.5 s)`);
  for (const [a, b] of spans) {
    if (b - a - dur < 8) out.push(`lights-off at ${a}s is dark for ${(b - a - dur).toFixed(1)}s (needs ≥ 8 s)`);
    for (const kc of keycards) if (kc > a && kc < b + dur) out.push(`key card at ${kc}s while the lights are off (${a}–${b + dur}s): turn them on first`);
  }
  return out;
}
