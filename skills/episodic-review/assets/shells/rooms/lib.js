// lib.js — small pure helpers (no dependency outside the project / node_modules).
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a));
export const sm = k => k * k * (3 - 2 * k);
export const ease = {
  inOut: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  out: x => 1 - Math.pow(1 - x, 3),
  in: x => x * x * x,
  outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
// fade in at a, out at b (d = fade length)
export const fio = (t, a, b, d = 0.5) => Math.min(prog(t, a, a + d), 1 - prog(t, b - d, b));
export function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// smooth deterministic wobble
export const wobble = (t, f, seed) => Math.sin(t * f * 6.283 + seed * 1.7) * 0.6 + Math.sin(t * f * 2.71 * 6.283 + seed * 3.1) * 0.4;

export const QS = new URLSearchParams(location.search);
export const NOTEXT = QS.get('notext') === '1';

export async function loadFonts(families, text, weights) {
  for (const f of families) for (const w of weights) { try { await document.fonts.load(`${w} 40px "${f}"`, text); } catch (e) { /* ignore */ } }
}
// the GL canvas is drawn slightly larger than the frame (so a depth-of-field blur has no dark edges)
export const VIEW = { x0: -12, y0: -7, w: 1944, h: 1094 };
export const ndcToPx = (x, y) => [VIEW.x0 + (x + 1) / 2 * VIEW.w, VIEW.y0 + (1 - y) / 2 * VIEW.h];
