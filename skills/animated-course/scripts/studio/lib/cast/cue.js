// Point and look at the thing being named, on the word that names it.
//
// Why: a character on screen does not by itself help people learn; a character whose hands and eyes go to the
// thing being explained, at the moment it is named, does (Mayer's image vs embodiment principles; Mayer & DaPra
// 2012). The student looking at the same thing makes the viewer look there too (joint attention). Rule:
// reference/01-principles.md §2 "Hands and eyes go where the words go"; usage: lib/cast/CAST.md "Cues".
//
//   import { cueTrack, headOf } from '/lib/cast/cue.js';
//   const cues = cueTrack(T, [
//     { line: 'A05', word: '預算', target: () => budgetRow },        // an element, a {x0,y0,x1,y1} box, {x,y} or [x,y]
//     { line: 'A07', word: '學習期', target: [1320, 420], point: false },   // look only (no hand)
//     { at: 12.4, who: 'student', target: { x: 1500, y: 300 }, hold: 1.2 }, // a time in seconds works too
//   ]);
//   // per frame, after the scene filled its own pose objects (skin fields, CAST.md):
//   cues.apply('teacher', tp, t, { x: 150, y: 930, px: 390, skin: 'glossy-bot' });   // flat stage: the same x, y, px as st.place(); skin for the arm height (ARM)
//   cues.apply('student', sp, t, { x: 1745, y: 940, px: 330 });
//   // 3D classroom: cues.apply('teacher', tp, t, headOf(cast.teacher, cam, { skin: 'glossy-bot' })); then cast.teacher.poseNative(tp)
//   window.CUES = cues.report;                                       // optional: the cue list, for checking
//
// A cue lifts the hand ~0.2 s before the word, so it arrives on the word, holds to the end of that line
// (at least 1.2 s; `hold` overrides) and eases back. Only the teacher points by default; the student
// follows the teacher's cues with the eyes (option `follow`). Skins point to the viewer's right only
// (CAST.md `point`): a pointing character must stand to the left of its target, otherwise the cue turns
// into a look and a warning is recorded (cues.warnings; printed once to the console).
// Pure function of t (renders out of order): targets that are functions are read at the cue's mid-point
// and at t, never stored between frames.

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** Height of each skin's horizontal pointing arm above the feet, as a share of the on-screen height (px).
 *  Measured 2026-11-06 from cue-lab.html stills (±0.03). Pass `skin` (cast.json → skin.id) or `arm` in `at`. */
export const ARM = { 'glossy-bot': 0.43, 'glossy-owl': 0.42, porcelain: 0.57, glass: 0.48, 'glossy-nova': 0.53, 'clay-snackshop': 0.26 };
const armOf = at => at.arm ?? ARM[at.skin] ?? 0.45;
/** How far right of the feet x the pointing tip (hand or stick) ends, as a share of the on-screen height (px), on flat stages.
 *  Measured in experiment 21 (glossy-bot at x 200, px 430: stick tip at x ≈ 452–482; glass hand ≈ 0.70). Skins not listed
 *  are not reach-checked. A pointer whose tip stops short of the target, or passes over it, reads as pointing at blank space
 *  (silent reviews of experiment 21, lessons 2, 3, 6, 7) — so the tip must land INSIDE the target's box. */
export const REACH = { 'glossy-bot': 0.63, glass: 0.70 };
const reachOf = at => at.reach ?? REACH[at.skin];
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = k => k * k * (3 - 2 * k);

/** Normalise a target to a screen point {x, y} (page pixels, 1920×1080). */
export function pointOf(target, t) {
  let v = typeof target === 'function' ? target(t) : target;
  if (!v) return null;
  if (Array.isArray(v)) return { x: v[0], y: v[1] };
  if (typeof v.getBoundingClientRect === 'function') v = v.getBoundingClientRect();
  if ('x0' in v) return { x: (v.x0 + v.x1) / 2, y: (v.y0 + v.y1) / 2, h: Math.abs(v.y1 - v.y0), w: Math.abs(v.x1 - v.x0) };
  if ('left' in v && 'width' in v) return { x: v.left + v.width / 2, y: v.top + v.height / 2, h: v.height, w: v.width };
  if ('x' in v && 'y' in v) return { x: v.x, y: v.y };
  return null;
}

/** Screen position of a 3D character's head and pointing arm (classroom scenes): pass the result to cues.apply as `at`.
 *  ch = a makeCast() character ({root, height}); cam = the scene's camera; skin = cast.json → skin.id (for the arm height). */
export function headOf(ch, cam, { up = 0.85, skin = null, arm = null } = {}) {
  const a = arm ?? ARM[skin] ?? 0.45;
  return () => {
    const V = ch.root.position.constructor;
    ch.root.updateWorldMatrix(true, false);
    const s = ch.root.parent ? ch.root.parent.getWorldScale(new V()).y : 1;
    const at = k => { const p = ch.root.getWorldPosition(new V()); p.y += (ch.height || 1) * k * s; p.project(cam); return { x: (p.x + 1) * 960, y: (1 - p.y) * 540 }; };
    const h = at(up);
    return { x: h.x, y: h.y, armY: at(a).y };
  };
}

/**
 * @param T  the timeline from S.loadTimeline() (may be null when every cue has `at`)
 * @param list  [{ line, word | at, target, who = 'teacher', point = true, hold, lead = 0.2, follow }]
 * @param opts  { follow: ['student'] }  roles that look where the teacher's cues point
 */
export function cueTrack(T, list, { follow = ['student'] } = {}) {
  const warnings = [];
  const warned = new Set();
  const cues = list.map((c, i) => {
    const who = c.who || 'teacher';
    let w;
    if (typeof c.at === 'number') w = c.at;
    else if (T && c.line) w = c.word ? T.word(c.line, c.word) : T.line(c.line).start;
    else throw new Error(`cue ${i}: needs {line, word} (with a timeline) or {at}`);
    const lineEnd = T && c.line ? T.line(c.line).end : w + 1.2;
    const hold = c.hold ?? Math.max(1.2, lineEnd - w);
    const lead = c.lead ?? 0.2;
    return {
      i, who, word: w, start: w - lead, end: w + hold, rise: 0.3, fall: 0.4,
      point: c.point !== false && who === 'teacher',
      follow: c.follow ?? (who === 'teacher' ? follow : []),
      target: c.target, label: c.word || c.label || `cue ${i}`,
    };
  });
  const strength = (c, t) => {
    if (t <= c.start || t >= c.end + c.fall) return 0;
    const up = smooth(clamp((t - c.start) / c.rise, 0, 1));
    const down = 1 - smooth(clamp((t - c.end) / c.fall, 0, 1));
    return Math.min(up, down);
  };
  /** the cue that drives `role` at t (the latest one that has started) and how strongly */
  const active = (role, t) => {
    let best = null, k = 0;
    for (const c of cues) {
      const mine = c.who === role, follower = c.follow.includes(role);
      if (!mine && !follower) continue;
      const s = strength(c, t);
      if (s > 0 && (!best || c.start > best.start)) { best = c; k = s * (mine ? 1 : 0.9); }
    }
    return best ? { cue: best, k, follower: best.who !== role } : null;
  };
  /**
   * Blend the active cue into `pose` (skin fields: lookX, lookY, turn, tilt, point). Mutates and returns pose.
   * at = {x, y, px} (feet + on-screen height, as in st.place) or a function returning the head {x, y}.
   */
  function apply(role, pose, t, at) {
    const a = active(role, t);
    if (!a) return pose;
    const tgt = pointOf(a.cue.target, t);
    if (!tgt) return pose;
    const fromFn = typeof at === 'function' ? at() : null;
    const head = fromFn ? { x: fromFn.x, y: fromFn.y } : { x: at.x, y: at.y - 0.82 * (at.px || 300) };
    const dx = tgt.x - head.x, dy = tgt.y - head.y, k = a.k;
    pose.lookX = lerp(pose.lookX || 0, clamp(dx / 420, -1, 1), k);
    pose.lookY = lerp(pose.lookY || 0, clamp(-dy / 360, -1, 1), k);
    pose.turn = lerp(pose.turn || 0, clamp(dx / 1000, -0.6, 0.6), k);   // strong enough to read as "looking at the screen" in a still
    pose.tilt = lerp(pose.tilt || 0, -Math.sign(dx) * 0.08, k);
    if (a.cue.point && !a.follower) {
      // the pointing arm is horizontal at shoulder height (every skin): aim only where that reads as aiming
      const shoulderY = fromFn ? (fromFn.armY ?? head.y + 60) : at.y - armOf(at) * (at.px || 300);
      // a horizontal pointer reads as aiming at the target only when its line crosses the target's own box
      // (12 px margin; a bare point gets ±40 px). Rows of a list are ~40-80 px apart, so anything looser
      // makes the pointer land on the neighbouring row (silent review of experiment 17).
      const off = tgt.y - shoulderY, tol = tgt.h ? Math.max(24, tgt.h / 2 + 12) : 40;
      // the tip must land inside the target's box (at least 24 px in; a bare point: within ±60 px); flat stages only
      const r = fromFn ? null : reachOf(at), tipX = r ? at.x + r * (at.px || 300) : null;
      const x0 = tgt.w ? tgt.x - tgt.w / 2 : tgt.x - 60, x1 = tgt.w ? tgt.x + tgt.w / 2 : tgt.x + 60, inset = tgt.w ? Math.min(24, tgt.w / 3) : 0;
      const miss = tipX == null ? 0 : tipX < x0 + inset ? tipX - (x0 + inset) : tipX > x1 ? tipX - x1 : 0;
      const why = dx <= 60 ? `is not left of the target (x≈${Math.round(head.x)} vs ${Math.round(tgt.x)}); skins point to the viewer's right only. Stand the ${role} on the left of what it points at`
        : Math.abs(off) > tol ? `would point ${Math.round(Math.abs(off))} px ${off < 0 ? 'below' : 'above'} the target (the arm is horizontal at y≈${Math.round(shoulderY)}; allowed ±${Math.round(tol)} px). Move the ${role} or the target so the target sits at arm height, or use point: false`
        : miss ? `would point at blank space: the tip ends at x≈${Math.round(tipX)}, ${Math.round(Math.abs(miss))} px ${miss < 0 ? 'short of' : 'past'} the target (x ${Math.round(x0)}–${Math.round(x1)}). Start what the ${role} points at just left of the tip (left edge ≈ ${Math.round(tipX - 40)}), or use point: false` : null;
      if (!why) pose.point = lerp(pose.point || 0, 1, k);
      else {
        pose.point = lerp(pose.point || 0, 0, k);
        const key = `${role}:${a.cue.i}`;
        if (!warned.has(key)) {
          warned.add(key);
          const msg = `cue "${a.cue.label}" (${a.cue.word.toFixed(2)} s): ${role} ${why}; this cue became a look.`;
          warnings.push(msg); console.error(msg);   // render.cjs prints console.error only
        }
      }
    } else if (!a.follower) pose.point = lerp(pose.point || 0, 0, k);
    return pose;
  }
  /** Run every pointing cue of `role` once at its word and return the warnings (call after the page is built).
   *  prepare(t), optional: bring the page to time t first (e.g. a function that lays out the DOM for t). */
  function check(role, at, prepare) {
    for (const c of cues) if (c.who === role && c.point) { if (prepare) prepare(c.word + 0.3); apply(role, {}, c.word + 0.3, at); }
    return warnings.slice();
  }
  const report = () => cues.map(c => ({ who: c.who, label: c.label, word: +c.word.toFixed(2), start: +c.start.toFixed(2), end: +c.end.toFixed(2), point: c.point, at: pointOf(c.target, c.word) }));
  return { apply, active, check, report, warnings, cues };
}
