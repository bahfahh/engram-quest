// 1a 亮面公仔・白色機器人 v2（2026-11-02 照使用者的設計圖重做）
// 老師 Nico：大頭、深藍背心配金邊、藍色發光耳環與關節燈、胸口藍環；左手平板、右手教鞭。
// 學生芋圓：矮胖、頭更大、橘色耳罩與天線燈、橘色書包與背帶、橘色鞋底；左手平板。
// 兩人共用：黑色亮面面罩上的發光表情（平常是彎彎的笑眼 ^^）、天線燈 = 狀態燈。
import * as THREE from 'three';

export const meta = {
  id: 'glossy-bot', no: '1a', name: '亮面公仔・白色機器人', kind: '3d',
  note: '天線燈（老師連耳環一起）是狀態燈：待機老師藍／學生暖黃、思考藍色脈動、頓悟綠色爆光加光環、懷疑橘紅閃爍加「?」；面罩上的笑眼 ^^ 隨狀態換成思考眼、> < 興奮眼、擔心眉',
};

const COL = {
  shell: '#f4f6f9', navy: '#1d2844', navyHi: '#34446a', gold: '#c9a35e', dark: '#2b3240', metal: '#8d95a3',
  cyan: '#46d4ff', core: '#ecfdff', orange: '#ec7f10', orangeDeep: '#d0680a', amber: '#ffcf6a', tongue: '#ff7f98', screen: '#0b111c',
};

// Colour sets (CAST.md "Colour sets"): same shapes, the teacher's vest + trim and the student's accent change together.
// First = default. Never use the state colours (blue think / green aha / orange-red doubt) for a big area.
export const variants = [
  { id: 'classic', name: { 'zh-tw': '經典藍金', en: 'Navy & gold' }, swatch: ['#1d2844', '#c9a35e', '#ec7f10'], col: {} },
  { id: 'wine', name: { 'zh-tw': '酒紅', en: 'Wine' }, swatch: ['#7a1838', '#d8b26a', '#e39a00'],
    col: { navy: '#7a1838', navyHi: '#98284d', gold: '#d8b26a', orange: '#e39a00', orangeDeep: '#b97800', amber: '#ffd66b' } },
  { id: 'grape', name: { 'zh-tw': '葡萄紫', en: 'Grape' }, swatch: ['#4b2a6e', '#d6b46c', '#e8628f'],
    col: { navy: '#4b2a6e', navyHi: '#64408b', gold: '#d6b46c', orange: '#e8628f', orangeDeep: '#c64777', amber: '#ffc0d4' } },
];
const STATE = { think: '#2a84ff', aha: '#25dc72', doubt: '#ff5a2a' };

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const spow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
const DEF = { t: 0, blink: 0, lookX: 0, lookY: 0, talk: 0, armL: 0, armR: 0, point: 0, wave: 0, hop: 0, squash: 0, tilt: 0, turn: 0, state: 'idle', stateK: 0 };
const full = s => ({ ...DEF, ...s });   // pose() tolerates missing fields (a partial pose used to make the character vanish: NaN transforms)

// ---------- geometry ----------
/** superellipsoid (|x/rx|^n+|y/ry|^n+|z/rz|^n=1, n=2/e) with analytic normals.
 *  taper > 0 widens the bottom (pear), < 0 widens the top. Optional front patch + planar UV. */
function superGeo(rx, ry, rz, e, o = {}) {
  const { ws = 48, hs = 32, phiStart = 0, phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI, offset = 0, planar = null, taper = 0 } = o;
  const g = new THREE.SphereGeometry(1, ws, hs, phiStart, phiLength, thetaStart, thetaLength);
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  const n = 2 / e;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let X = spow(x, e) * rx, Y = spow(y, e) * ry, Z = spow(z, e) * rz;
    let nx = Math.sign(X) * Math.pow(Math.abs(X / rx), n - 1) / rx;
    let ny = Math.sign(Y) * Math.pow(Math.abs(Y / ry), n - 1) / ry;
    let nz = Math.sign(Z) * Math.pow(Math.abs(Z / rz), n - 1) / rz;
    if (taper) {
      const s = 1 - taper * Y / ry;
      ny = ny + (taper / ry) / s * (nx * X + nz * Z); nx /= s; nz /= s;
      X *= s; Z *= s;
    }
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    X += nx * offset; Y += ny * offset; Z += nz * offset;
    pos.setXYZ(i, X, Y, Z); nor.setXYZ(i, nx, ny, nz);
    if (planar) uv.setXY(i, (X - planar.cx) / planar.w + 0.5, (Y - planar.cy) / planar.h + 0.5);
  }
  g.computeBoundingSphere();
  return g;
}
const frontPatch = (spanX, spanY) => ({ phiStart: Math.PI / 2 - spanX, phiLength: spanX * 2, thetaStart: Math.PI / 2 - spanY, thetaLength: spanY * 2 });
/** point + normal on a (tapered) superellipsoid's front surface at local (x, y) */
function onSurf(R, x, y, off = 0) {
  const n = 2 / R.e, t = R.taper || 0, s = 1 - t * y / R.ry, xb = x / s;
  const a = 1 - Math.pow(Math.abs(xb / R.rx), n) - Math.pow(Math.abs(y / R.ry), n);
  const zb = R.rz * Math.pow(Math.max(a, 1e-4), 1 / n);
  let nx = Math.sign(xb) * Math.pow(Math.abs(xb / R.rx), n - 1) / R.rx, ny = Math.sign(y) * Math.pow(Math.abs(y / R.ry), n - 1) / R.ry, nz = Math.pow(zb / R.rz, n - 1) / R.rz;
  if (t) { ny = ny + (t / R.ry) / s * (nx * xb + nz * zb); nx /= s; nz /= s; }
  const N = new THREE.Vector3(nx, ny, nz).normalize();
  return { p: new THREE.Vector3(x, y, zb * s).addScaledVector(N, off), n: N };
}
const faceTo = (m, n) => { m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); return m; };

// ---------- textures ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const TEX = {};
function texes() {
  if (TEX.halo) return TEX;
  TEX.halo = canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(0.6, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  TEX.ring = canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 34, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  TEX.star = canvasTex(64, 64, (x) => { x.translate(32, 32); x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 6 : 30, a = i * Math.PI / 4; x.lineTo(Math.sin(a) * r, -Math.cos(a) * r); } x.closePath(); x.shadowColor = '#fff'; x.shadowBlur = 6; x.fill(); });
  TEX.shadow = canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(40,52,74,.42)'); g.addColorStop(0.5, 'rgba(40,52,74,.2)'); g.addColorStop(1, 'rgba(40,52,74,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  TEX.qmark = canvasTex(128, 128, (x) => { x.font = '900 104px "Noto Sans TC", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 14; x.strokeStyle = '#ffffff'; x.lineJoin = 'round'; x.strokeText('?', 64, 70); x.fillStyle = '#ffffff'; x.fillText('?', 64, 70); });
  TEX.burst = canvasTex(128, 128, (x) => { x.lineCap = 'round'; x.strokeStyle = '#fff'; x.lineWidth = 13; [[-0.9, 26, 50], [-0.25, 30, 58], [0.4, 26, 50]].forEach(([a, r0, r1]) => { x.beginPath(); x.moveTo(30 + Math.cos(a) * r0, 64 + Math.sin(a) * r0); x.lineTo(30 + Math.cos(a) * r1, 64 + Math.sin(a) * r1); x.stroke(); }); });
  return TEX;
}

// ---------- materials ----------
function mats() {
  const shiny = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: o.r ?? 0.26, metalness: o.m ?? 0, clearcoat: o.cc ?? 1, clearcoatRoughness: o.cr ?? 0.05, envMapIntensity: o.env ?? 1.1, ...(o.extra || {}) });
  return {
    shiny,
    shell: shiny(COL.shell, { r: 0.28, env: 1.15 }),
    navy: shiny(COL.navy, { r: 0.3, cr: 0.08, env: 1.3 }),
    gold: shiny(COL.gold, { r: 0.22, m: 0.75, cr: 0.1, env: 1.4 }),
    dark: shiny(COL.dark, { r: 0.24, m: 0.4, cr: 0.08, env: 1.3 }),
    metal: shiny(COL.metal, { r: 0.22, m: 0.6, env: 1.3 }),
    orange: shiny(COL.orange, { r: 0.34, cr: 0.12, env: 0.65 }),
    glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.cyan).multiplyScalar(1.15), toneMapped: false }),
  };
}

// ---------- LED face on the black visor (canvas, redrawn every pose: pure function of s) ----------
// cfg: W,H, plate{x,y,w,h,r}, eyes[{x,y}], er (eye size), mouth{x,y,w,h,lw}, idleOpen (0..1), ahaEyes 'arc'|'chevron', eyeLw
function makeFace(cfg) {
  const { W, H, plate, eyes, er, mouth, idleOpen = 0, ahaEyes = 'arc', eyeLw = 0.36 } = cfg;
  const LED = COL.cyan, CORE = COL.core;
  const plateMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, emissive: '#ffffff', emissiveIntensity: 1.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 1.5 });
  const rr = (x, p, grow = 0) => { x.beginPath(); x.roundRect(p.x - grow, p.y - grow, p.w + grow * 2, p.h + grow * 2, p.r + grow); };
  plateMat.map = canvasTex(W, H, (x) => {
    x.clearRect(0, 0, W, H);
    rr(x, plate, 6); x.fillStyle = '#c3ccd8'; x.fill();                   // soft bezel
    rr(x, plate, 2.5); x.fillStyle = '#1a2130'; x.fill();
    rr(x, plate); const g = x.createLinearGradient(0, plate.y, 0, plate.y + plate.h); g.addColorStop(0, '#1d2638'); g.addColorStop(0.45, '#0a0f19'); g.addColorStop(1, '#04070d'); x.fillStyle = g; x.fill();
    x.save(); rr(x, plate); x.clip();                                     // glass sheen: one broad soft reflection top-left
    const s = x.createLinearGradient(plate.x, plate.y, plate.x + plate.w * 0.55, plate.y + plate.h * 0.9); s.addColorStop(0, 'rgba(255,255,255,.16)'); s.addColorStop(0.3, 'rgba(255,255,255,.05)'); s.addColorStop(0.31, 'rgba(255,255,255,0)'); x.fillStyle = s; x.fillRect(0, 0, W, H);
    x.restore();
  });
  const ec = document.createElement('canvas'); ec.width = W; ec.height = H; const x = ec.getContext('2d', { willReadFrequently: true });   // CPU canvas: the GPU canvas sometimes kept only a dirty rectangle of the redraw
  const emTex = new THREE.CanvasTexture(ec); emTex.colorSpace = THREE.SRGBColorSpace; plateMat.emissiveMap = emTex;

  // glowing stroke/fill: blurred halo in LED colour, then a brighter core
  const glow = (alpha, blur, paint, coreScale = 0.55) => {
    if (alpha <= 0.01) return;
    x.save(); x.globalAlpha = alpha; x.shadowColor = LED; x.shadowBlur = blur; x.fillStyle = x.strokeStyle = LED; paint(1); x.shadowBlur = 0;
    x.globalAlpha = alpha * 0.85; x.fillStyle = x.strokeStyle = CORE; paint(coreScale); x.restore();
  };
  const star = (cx, cy, r) => { x.beginPath(); for (let i = 0; i < 8; i++) { const r2 = i % 2 ? r * 0.28 : r, a = i * Math.PI / 4; x.lineTo(cx + Math.sin(a) * r2, cy - Math.cos(a) * r2); } x.closePath(); x.fill(); };

  function draw(s) {
    const k = sm(s.stateK || 0), st = s.state;
    const kT = st === 'think' ? k : 0, kA = st === 'aha' ? k : 0, kD = st === 'doubt' ? k : 0;
    const kI = 1 - Math.max(kT, kA, kD);
    const bl = clamp(s.blink);
    x.globalAlpha = 1; x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.save(); rr(x, plate); x.clip();
    const amb = x.createRadialGradient(W / 2, plate.y + plate.h * 0.45, 0, W / 2, plate.y + plate.h * 0.45, plate.w * 0.6);
    amb.addColorStop(0, 'rgba(60,170,255,.14)'); amb.addColorStop(1, 'rgba(60,170,255,0)'); x.fillStyle = amb; x.fillRect(0, 0, W, H);
    const lx = clamp(s.lookX + kT * 0.4, -1, 1), ly = clamp(s.lookY + kT * 0.55, -1, 1);
    const gx = lx * plate.w * 0.075, gy = -ly * plate.h * 0.1;
    const lw = er * eyeLw;
    eyes.forEach((e, i) => {
      const cx = e.x + gx, cy = e.y + gy, dir = i === 0 ? -1 : 1;   // dir: -1 viewer-left eye
      // weights of the eye shapes
      const thinkOpen = i === 0 ? kT : 0;                            // think: one eye opens and looks up, the other stays a smile
      const wArc = kI + (i === 1 ? kT : 0) + (ahaEyes === 'arc' ? kA : 0);
      const wOpen = thinkOpen + kD;
      const wChev = ahaEyes === 'chevron' ? kA : 0;
      // happy arc ∩ (blink flattens it)
      const big = 1 + 0.12 * (ahaEyes === 'arc' ? kA : 0);
      glow(clamp(wArc), 26, (c) => { x.save(); x.translate(cx, cy + er * 0.32); x.scale(1, 1 - 0.55 * bl); x.lineCap = 'round'; x.lineWidth = lw * c * big; x.beginPath(); x.arc(0, 0, er * big, Math.PI * 1.13, Math.PI * 1.87); x.stroke(); x.restore(); }, 0.42);
      // open eye: rounded oval with a catch-light
      const ry = er * (0.62 + 0.08 * kD) * (1 - 0.9 * bl), rx = er * 0.44;
      glow(clamp(wOpen), 24, (c) => { x.beginPath(); x.ellipse(cx, cy - er * 0.05, rx * (c < 1 ? 0.62 : 1), ry * (c < 1 ? 0.7 : 1), 0, 0, Math.PI * 2); x.fill(); }, 0.6);
      if (wOpen > 0.05 && bl < 0.5) { x.save(); x.globalAlpha = clamp(wOpen); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx + rx * 0.35, cy - ry * 0.45, er * 0.12, 0, Math.PI * 2); x.fill(); x.restore(); }
      // excited chevrons > <
      glow(clamp(wChev), 24, (c) => { x.save(); x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = lw * c; const a = er * 0.62, b = er * 0.6; x.beginPath(); x.moveTo(cx + dir * a * 0.8, cy - b); x.lineTo(cx - dir * a * 0.75, cy); x.lineTo(cx + dir * a * 0.8, cy + b); x.stroke(); x.restore(); }, 0.42);
      // brows: think = one sceptical brow over the open eye; doubt = worried brows (inner ends up)
      const browY = cy - er * 1.08;
      if (i === 0) glow(kT, 16, (c) => { x.lineCap = 'round'; x.lineWidth = lw * 0.62 * c; x.beginPath(); x.moveTo(cx - er * 0.75, browY - er * 0.05); x.quadraticCurveTo(cx - er * 0.1, browY - er * 0.38, cx + er * 0.7, browY - er * 0.2); x.stroke(); }, 0.4);
      glow(kD, 16, (c) => { x.lineCap = 'round'; x.lineWidth = lw * 0.62 * c; x.beginPath(); x.moveTo(cx + dir * er * 0.75, browY + er * 0.08); x.lineTo(cx - dir * er * 0.55, browY - er * 0.3); x.stroke(); }, 0.4);
    });
    // aha sparkles
    if (kA > 0.02) {
      const tw = 0.6 + 0.4 * Math.sin(s.t * 9);
      glow(kA, 10, () => { star(plate.x + plate.w * 0.1, plate.y + plate.h * 0.24, plate.h * 0.09 * tw); star(plate.x + plate.w * 0.9, plate.y + plate.h * 0.2, plate.h * 0.07 * (1.6 - tw)); }, 0.5);
    }
    // ---- mouth ----
    const mx = mouth.x + gx * 0.5, my = mouth.y + gy * 0.4, mw = mouth.w;
    const talk = clamp(s.talk);
    const openAmt = Math.max(talk, kA * 0.95, idleOpen * kI * (1 - kT) * (1 - kD));
    const wD = clamp(openAmt * 3.5);                      // open "D" mouth weight
    const closed = 1 - wD;
    // smile ∪
    glow(closed * clamp(kI + kA), 14, (c) => { x.lineCap = 'round'; x.lineWidth = mouth.lw * c; x.beginPath(); x.arc(mx, my - mw * 0.62, mw * 0.78, Math.PI * 0.27, Math.PI * 0.73); x.stroke(); }, 0.45);
    // think: sideways smirk
    glow(closed * kT, 12, (c) => { x.lineCap = 'round'; x.lineWidth = mouth.lw * c; x.beginPath(); x.moveTo(mx - mw * 0.42, my + mouth.lw * 0.2); x.quadraticCurveTo(mx + mw * 0.05, my + mouth.lw * 1.1, mx + mw * 0.45, my - mouth.lw * 0.9); x.stroke(); }, 0.45);
    // doubt: small wobbly line
    glow(closed * kD, 12, (c) => { x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = mouth.lw * 0.85 * c; x.beginPath(); for (let j = 0; j <= 16; j++) { const u = j / 16; x.lineTo(mx - mw * 0.4 + mw * 0.8 * u, my + Math.sin(u * Math.PI * 2.5) * mouth.lw * 0.55 + mouth.lw * 0.3); } x.stroke(); }, 0.45);
    // open D mouth with a pink tongue
    if (wD > 0.01) {
      const h = mouth.h * (0.42 + 0.58 * openAmt), w = mw * (0.62 + 0.14 * openAmt);
      const top = my - h * 0.32, bot = my + h * 0.72;
      const path = () => { x.beginPath(); x.moveTo(mx - w, top); x.lineTo(mx + w, top); x.bezierCurveTo(mx + w, bot, mx + w * 0.55, bot + h * 0.08, mx, bot + h * 0.08); x.bezierCurveTo(mx - w * 0.55, bot + h * 0.08, mx - w, bot, mx - w, top); x.closePath(); };
      x.save(); x.globalAlpha = wD; x.shadowColor = LED; x.shadowBlur = 16; x.fillStyle = LED; path(); x.fill(); x.shadowBlur = 0;
      x.save(); path(); x.clip();
      x.fillStyle = '#0e2a3c'; x.fillRect(mx - w * 1.2, top + mouth.lw * 0.55, w * 2.4, h * 1.4);
      x.fillStyle = COL.tongue; x.beginPath(); x.ellipse(mx, bot + h * 0.02, w * 0.62, h * 0.42, 0, 0, Math.PI * 2); x.fill();
      x.restore(); x.restore();
    }
    x.restore();
    emTex.needsUpdate = true;
  }
  return { mat: plateMat, draw };
}

// ---------- state lamp (antenna ball, with halo / burst / sparkles) ----------
function lampColor(s, out, idle) {
  const k = sm(s.stateK || 0);
  return out.set(idle).lerp(new THREE.Color(STATE[s.state] || idle), s.state === 'idle' ? 0 : k);
}
function lampLevel(s) {
  const k = sm(s.stateK || 0), t = s.t;
  const idle = 0.8 + 0.12 * Math.sin(t * 2.1);
  let v = idle;
  if (s.state === 'think') v = lerp(idle, 0.55 + 0.6 * (0.5 + 0.5 * Math.sin(t * 8)), k);
  if (s.state === 'aha') v = lerp(idle, 1.35 + 0.25 * Math.sin(t * 13), k);
  if (s.state === 'doubt') { const fl = (Math.sin(t * 23) * Math.sin(t * 9.3) > 0.35) ? 0.45 : 1.05; v = lerp(idle, fl, k); }
  return v;
}
function makeLamp(r, idle) {
  const T = texes();
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(r * 0.62, 14, 10), new THREE.MeshBasicMaterial({ color: idle, toneMapped: false }));
  const shell = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.55, emissive: idle, emissiveIntensity: 0.6, depthWrite: false }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.halo, color: idle, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.5 }));
  const burst = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.ring, color: STATE.aha, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }));
  const burst2 = new THREE.Sprite(burst.material.clone());
  halo.renderOrder = 5; burst.renderOrder = 6; burst2.renderOrder = 6;
  g.add(halo, core, shell, burst, burst2);
  const stars = [];
  for (let i = 0; i < 4; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.star, color: '#ffffff', transparent: true, depthWrite: false, toneMapped: false, opacity: 0 })); sp.renderOrder = 7; g.add(sp); stars.push(sp); }
  const c = new THREE.Color();
  return {
    group: g, color: c,
    set(s, gain = 1) {
      lampColor(s, c, idle); const v = lampLevel(s) * gain, k = sm(s.stateK || 0);
      core.material.color.copy(c).multiplyScalar(0.6 + 0.6 * v);
      shell.material.emissive.copy(c); shell.material.emissiveIntensity = 0.4 + 0.55 * v;
      halo.material.color.copy(c); halo.material.opacity = clamp(0.25 + 0.4 * v * (s.state === 'idle' ? 0.65 : 1));
      halo.scale.setScalar(r * (4.4 + 2.2 * v));
      const kA = s.state === 'aha' ? k : 0;
      [burst, burst2].forEach((b, j) => { const ph = ((s.t * 1.6 + j * 0.5) % 1); b.material.color.copy(c); b.material.opacity = kA * (1 - ph) * 0.9; b.scale.setScalar(r * (3 + 10 * ph)); });
      stars.forEach((sp, j) => { const a = j * Math.PI / 2 + 0.6, ph = ((s.t * 1.3 + j * 0.27) % 1); const d = r * (2 + 4 * ph); sp.position.set(Math.cos(a) * d, Math.sin(a) * d, 0.02); sp.material.opacity = kA * Math.sin(ph * Math.PI); sp.scale.setScalar(r * (1.6 + 1.2 * Math.sin(ph * Math.PI))); });
    },
  };
}
/** "?" (doubt) and "!" burst lines (aha) floating beside the head */
function makeMarks(color) {
  const T = texes();
  const q = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.qmark, color, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }));
  const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.burst, color, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }));
  q.renderOrder = 8; b.renderOrder = 8;
  return {
    q, b,
    set(s, size) {
      const k = sm(s.stateK || 0), kD = s.state === 'doubt' ? k : 0, kA = s.state === 'aha' ? k : 0;
      q.material.opacity = kD; q.scale.setScalar(size * (0.7 + 0.3 * kD)); q.material.rotation = 0.18 * Math.sin(s.t * 3);
      q.position.y = q.userData.y + 0.03 * Math.sin(s.t * 4);
      b.material.opacity = kA * (0.75 + 0.25 * Math.sin(s.t * 11)); b.scale.setScalar(size * (0.8 + 0.25 * kA));
    },
  };
}

function makeShadow(w, d) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: texes().shadow, transparent: true, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.004; m.renderOrder = -1; return m;
}

// ---------- hands and props ----------
/** a rounded fist with a thumb and finger grooves; local -y = continues the forearm, +z = knuckles face forward at rest */
function makeHand(M, r, mat, side) {
  const g = new THREE.Group();
  const palm = new THREE.Mesh(superGeo(r * 0.9, r, r * 0.82, 0.72, { ws: 24, hs: 16 }), mat); palm.position.y = -r * 0.85; g.add(palm);
  for (let j = 0; j < 3; j++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.24, r * 0.55, 4, 10), mat); f.rotation.z = Math.PI / 2; f.position.set(0, -r * (0.42 + j * 0.46), r * 0.72); g.add(f); }
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.27, r * 0.5, 4, 10), mat); th.position.set(-side * r * 0.72, -r * 0.55, r * 0.35); th.rotation.set(0.5, 0, -side * 0.5); g.add(th);
  return g;
}
function makeTablet(M, w, h) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(superGeo(w / 2, h / 2, 0.016, 0.22, { ws: 32, hs: 20 }), M.shiny('#737b8a', { r: 0.28, m: 0.5, env: 1.4 })); g.add(body);
  const scr = new THREE.Mesh(superGeo(w / 2 - 0.018, h / 2 - 0.018, 0.004, 0.2, { ws: 24, hs: 16 }), new THREE.MeshPhysicalMaterial({ color: '#0e1622', roughness: 0.05, clearcoat: 1, emissive: '#16507a', emissiveIntensity: 0.55 })); scr.position.z = 0.015; g.add(scr);
  const cam = new THREE.Mesh(new THREE.CircleGeometry(w * 0.07, 24), M.shiny('#aab1bd', { r: 0.2, m: 0.5 })); cam.position.z = -0.0175; cam.rotation.y = Math.PI; g.add(cam);
  return g;
}
function makePointer(M, len) {
  const g = new THREE.Group();   // built along +y from the grip
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.16, 16), M.dark); grip.position.y = 0.0; g.add(grip);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.012, len, 12), M.metal); rod.position.y = 0.08 + len / 2; g.add(rod);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 12), new THREE.MeshBasicMaterial({ color: '#dff8ff', toneMapped: false })); tip.position.y = 0.08 + len; g.add(tip);
  const tipHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texes().halo, color: COL.cyan, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.6 })); tipHalo.scale.setScalar(0.13); tipHalo.position.copy(tip.position); g.add(tipHalo);
  return g;
}

/** keep a held prop at a fixed orientation relative to the body (readable whatever the arm does); pure: recomputed from the current matrices */
const _m1 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function holdProp(body, hand, prop, euler, offset) {
  body.updateMatrixWorld(true);
  _m1.copy(body.matrixWorld).invert().multiply(hand.matrixWorld);             // hand in body space
  const handPos = new THREE.Vector3().setFromMatrixPosition(_m1);
  _m2.compose(handPos.add(offset), _q.setFromEuler(euler), _s.set(1, 1, 1));  // wanted prop pose in body space
  _m1.invert().multiply(_m2);                                                   // → hand space
  _m1.decompose(prop.position, prop.quaternion, _v);
}

// ---------- two-segment arm: shoulder → upper arm → elbow (bends forward / sideways) → forearm → hand ----------
function makeArm(M, side, cfg) {
  const { L1, L2, r, hand, shoulderMat, elbowMat, upperMat = M.shell, foreMat = M.shell, cuffMat = M.dark, elbowGlow = null } = cfg;
  const pivot = new THREE.Group();
  const sh = new THREE.Mesh(new THREE.SphereGeometry(r * (cfg.shoulderR || 1.32), 20, 14), shoulderMat); pivot.add(sh);
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(r * 1.04, L1, 6, 18), upperMat); upper.position.y = -L1 / 2 - r * 0.25; pivot.add(upper);
  const elbow = new THREE.Group(); elbow.position.y = -L1 - r * 0.55; pivot.add(elbow);
  const ej = new THREE.Mesh(new THREE.SphereGeometry(r * 0.92, 18, 12), elbowMat); elbow.add(ej);
  if (elbowGlow) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.93, r * 0.16, 8, 28), elbowGlow); ring.rotation.x = Math.PI / 2; elbow.add(ring); }
  const fore = new THREE.Mesh(new THREE.CapsuleGeometry(r, L2, 6, 18), foreMat); fore.position.y = -L2 / 2 - r * 0.45; elbow.add(fore);
  const wrist = new THREE.Group(); wrist.position.y = -L2 - r * 1.05; elbow.add(wrist);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.86, r * 0.86, r * 0.42, 22), cuffMat); wrist.add(cuff);
  const handG = new THREE.Group(); handG.position.y = -r * 0.05; wrist.add(handG);
  handG.add(makeHand(M, hand, M.shell, side));
  return {
    pivot, hand: handG,
    set(a) {
      pivot.rotation.set(a.aX, 0, side * a.aZ);
      elbow.rotation.set(-a.bx, 0, side * a.bz);
      handG.rotation.set(a.hx || 0, side * (a.hy || 0), side * (a.hz || 0));
    },
  };
}
const ARM_KEYS = ['aZ', 'aX', 'bx', 'bz', 'hx', 'hy', 'hz'];
const mix = (A, B, k) => { if (k <= 0) return A; const o = {}; for (const key of ARM_KEYS) o[key] = lerp(A[key] || 0, B[key] || 0, k); return o; };
/** arm pose from the CAST fields. side +1 = viewer's right (point / wave / think hand). */
function armPose(s, side, P) {
  let a = { ...P.rest };
  a = mix(a, P.raise, sm(side > 0 ? s.armR : s.armL));
  if (side > 0) {
    const think = s.state === 'think' ? sm(s.stateK) : 0;
    a = mix(a, P.think, think * sm(clamp(s.armR / 0.45)));
    a = mix(a, P.point, sm(s.point));
    const w = sm(s.wave);
    if (w > 0) a = mix(a, { ...P.wave, bz: P.wave.bz + 0.38 * Math.sin(s.t * 13), hz: (P.wave.hz || 0) + 0.25 * Math.sin(s.t * 13 + 0.7) }, w);
  }
  return a;
}

// ---------- teacher Nico: big head, navy vest with gold trim, glowing blue ear rings and joints, tablet + pointer ----------
function vestTex(R) {
  // painted in the torso's sphere UV: u = phi / 2π (front +z at u = .25), canvas y = theta / π (top = 0)
  return canvasTex(1024, 512, (x, W, H) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
    const bottom = d => {                       // vest lower edge (theta/π) by angular distance d from the front
      const open = 0.3, side = 0.52;
      if (d < 0.26) return 0.2;                // collar band only, in the front opening
      return lerp(open, side, sm((d - 0.26) / 0.7));
    };
    x.fillStyle = COL.navy; x.beginPath(); x.moveTo(0, 0);
    for (let i = 0; i <= 256; i++) { const u = i / 256, phi = u * Math.PI * 2; let d = Math.abs(((phi - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI); x.lineTo(u * W, bottom(d) * H); }
    x.lineTo(W, 0); x.closePath(); x.fill();
    // gold trim along the front opening and the collar
    x.strokeStyle = COL.gold; x.lineWidth = 7; x.lineJoin = 'round'; x.beginPath();
    for (let i = 0; i <= 256; i++) { const u = 0.25 - 0.17 + 0.34 * i / 256, phi = u * Math.PI * 2; const d = Math.abs(phi - Math.PI / 2); const y = bottom(d) * H - 3; i ? x.lineTo(u * W, y) : x.moveTo(u * W, y); }
    x.stroke();
    // waist seam
    x.fillStyle = '#d3d9e2'; x.fillRect(0, H * 0.705, W, 4);
  });
}
function makeTeacher() {
  const M = mats();
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  root.add(makeShadow(1.7, 1.25));
  // legs: dark knee joints with a blue light, big white boots on grey soles with a gold line
  const legs = [-1, 1].map(sx => {
    const g = new THREE.Group(); g.position.set(sx * 0.235, 0, 0.02); g.rotation.y = sx * 0.12; body.add(g);
    const boot = new THREE.Mesh(superGeo(0.175, 0.12, 0.23, 0.78, { ws: 28, hs: 18, taper: 0.12 }), M.shell); boot.position.set(0, 0.125, 0.05); g.add(boot);
    const trim = new THREE.Mesh(superGeo(0.18, 0.016, 0.235, 0.4, { ws: 28, hs: 8 }), M.gold); trim.position.set(0, 0.052, 0.05); g.add(trim);
    const sole = new THREE.Mesh(superGeo(0.178, 0.034, 0.234, 0.45, { ws: 28, hs: 8 }), M.metal); sole.position.set(0, 0.032, 0.05); g.add(sole);
    const knee = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.11, 0.13, 26), M.dark); knee.position.y = 0.27; g.add(knee);
    const kl = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.014, 6, 24, 1.3), M.glow); kl.rotation.set(Math.PI / 2, 0, Math.PI / 2 - 0.65); kl.position.y = 0.27; g.add(kl);
    return g;
  });
  // torso (pear) with the painted vest
  const TR = { rx: 0.55, ry: 0.56, rz: 0.49, e: 0.9, taper: 0.17 };
  const torso = new THREE.Group(); torso.position.y = 0.82; body.add(torso);
  const torsoMat = M.shell.clone(); torsoMat.map = vestTex(TR);
  const torsoM = new THREE.Mesh(superGeo(TR.rx, TR.ry, TR.rz, TR.e, { ws: 56, hs: 40, taper: TR.taper }), torsoMat); torso.add(torsoM);
  // chest light: navy base, glowing ring, light core (pulses with talking)
  const cp = onSurf(TR, 0.1, 0.16);
  const chest = new THREE.Group(); chest.position.copy(cp.p); faceTo(chest, cp.n); torso.add(chest);
  const cBase = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.02, 32), M.navy); cBase.rotation.x = Math.PI / 2; chest.add(cBase);
  const cRing = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.012, 8, 32), M.glow); cRing.position.z = 0.012; chest.add(cRing);
  const coreMat = new THREE.MeshPhysicalMaterial({ color: '#dff3ff', emissive: COL.cyan, emissiveIntensity: 0.3, roughness: 0.1, clearcoat: 1 });
  const cCore = new THREE.Mesh(new THREE.CircleGeometry(0.04, 28), coreMat); cCore.position.z = 0.012; chest.add(cCore);
  // gold collar badge
  const bp = onSurf(TR, 0, 0.42, 0.004);
  const badge = new THREE.Mesh(superGeo(0.05, 0.026, 0.012, 0.35, { ws: 16, hs: 10 }), M.gold); badge.position.copy(bp.p); faceTo(badge, bp.n); torso.add(badge);
  // neck + head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.14, 28), M.dark); neck.position.y = 1.3; body.add(neck);
  const head = new THREE.Group(); head.position.y = 1.27; body.add(head);
  const HR = { rx: 0.7, ry: 0.5, rz: 0.6, e: 0.8, taper: -0.05 }, HC = 0.46;
  const headM = new THREE.Mesh(superGeo(HR.rx, HR.ry, HR.rz, HR.e, { ws: 56, hs: 40, taper: HR.taper }), M.shell); headM.position.y = HC; head.add(headM);
  const face = makeFace({ W: 512, H: 320, plate: { x: 22, y: 28, w: 468, h: 262, r: 126 },
    eyes: [{ x: 256 - 98, y: 150 }, { x: 256 + 98, y: 150 }], er: 52, eyeLw: 0.36, mouth: { x: 256, y: 228, w: 44, h: 50, lw: 11 }, idleOpen: 0, ahaEyes: 'arc' });
  const visor = new THREE.Mesh(superGeo(HR.rx, HR.ry, HR.rz, HR.e, { ...frontPatch(1.35, 0.98), ws: 36, hs: 26, offset: 0.006, taper: HR.taper, planar: { cx: 0, cy: -0.045, w: 1.16, h: 0.725 } }), face.mat);
  visor.position.y = HC; visor.renderOrder = 2; head.add(visor);
  // ear discs: white housing, navy rim, glowing ring (follows the state light), glossy navy centre — angled a little towards the camera
  const earGlow = new THREE.MeshBasicMaterial({ color: COL.cyan, toneMapped: false });
  [-1, 1].forEach(sx => {
    const g = new THREE.Group(); g.position.set(sx * 0.63, HC - 0.02, -0.02); g.rotation.y = sx * -0.42; head.add(g);
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.25, 0.16, 40), M.shell); outer.rotation.z = Math.PI / 2; g.add(outer);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.018, 10, 40), M.navy); rim.rotation.y = Math.PI / 2; rim.position.x = sx * 0.082; g.add(rim);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 10, 40), earGlow); ring.rotation.y = Math.PI / 2; ring.position.x = sx * 0.086; g.add(ring);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.navy); cap.rotation.z = -sx * Math.PI / 2; cap.scale.y = 0.3; cap.position.x = sx * 0.075; g.add(cap);
  });
  // antenna: navy base, thin dark stalk, blue lamp
  const topY = HC + HR.ry * (1 + HR.taper * 0) - 0.01;
  const ant = new THREE.Group(); ant.position.set(0, topY, 0); head.add(ant);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.045, 28), M.navy); base.position.y = 0.012; ant.add(base);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.18, 12), M.dark); stalk.position.y = 0.12; ant.add(stalk);
  const lamp = makeLamp(0.078, COL.cyan); lamp.group.position.y = 0.26; ant.add(lamp.group);
  const marks = makeMarks(COL.cyan); marks.q.position.set(0.86, HC + 0.42, 0.1); marks.q.userData.y = HC + 0.42; marks.b.position.set(-0.92, HC + 0.3, 0.1); head.add(marks.q, marks.b);
  // arms (shoulders hide under the vest), tablet in the viewer-left hand, pointer in the viewer-right hand
  const armCfg = { L1: 0.17, L2: 0.13, r: 0.085, hand: 0.088, shoulderR: 1.15, shoulderMat: M.navy, elbowMat: M.dark, cuffMat: M.dark, elbowGlow: M.glow };
  const arms = [-1, 1].map(sx => { const a = makeArm(M, sx, armCfg); a.pivot.position.set(sx * 0.49, 1.11, 0.0); body.add(a.pivot); return a; });
  const tablet = makeTablet(M, 0.4, 0.29); arms[0].hand.add(tablet);
  const TAB = { e: new THREE.Euler(-0.5, Math.PI + 0.75, -0.12, 'YXZ'), o: new THREE.Vector3(0.11, 0.05, 0.1) };
  const pointer = makePointer(M, 0.5); pointer.position.set(0, -0.08, 0.02); pointer.rotation.x = Math.PI; arms[1].hand.add(pointer);
  const ARMS = {
    [-1]: { rest: { aZ: 0.32, aX: 0.05, bx: 1.25, bz: -0.55, hx: 0.2 }, raise: { aZ: 2.7, aX: 0, bx: 0.25, bz: 0.15 } },
    [1]: {
      rest: { aZ: 0.42, aX: 0.0, bx: 1.15, bz: 0.35, hx: -1.35, hz: 0.6 },
      raise: { aZ: 2.65, aX: 0, bx: 0.25, bz: 0.15, hx: -0.4 },
      point: { aZ: 1.42, aX: -0.18, bx: 0.15, bz: 0.12, hx: 0, hz: 0 },
      wave: { aZ: 1.55, aX: -0.12, bx: 0.2, bz: 1.25, hx: -0.5, hz: 0 },
      think: { aZ: 0.25, aX: -0.55, bx: 2.25, bz: -0.65, hx: 0.6, hz: 0.6 },
    },
  };
  const height = 1.27 + topY + 0.26 + 0.078;
  return {
    root, height,
    pose(s) {
      s = full(s);
      const t = s.t, hop = clamp(s.hop);
      root.rotation.y = s.turn * 0.5;
      body.position.y = hop * 0.55; body.rotation.z = s.tilt * 0.2;
      const breath = Math.sin(t * 2.1) * 0.01, sq = s.squash * 0.3;
      torso.scale.set(1 + sq * 0.5, 1 - sq + breath, 1 + sq * 0.5);
      head.position.y = 1.27 - sq * 0.5 + breath * 0.6;
      head.rotation.set(-s.lookY * 0.14 + (s.state === 'think' ? -0.07 * sm(s.stateK) : 0), s.lookX * 0.26, -s.tilt * 0.06 + (s.state === 'doubt' ? 0.08 * sm(s.stateK) : 0));
      ant.rotation.z = 0.06 * Math.sin(t * 1.7) - s.tilt * 0.22 - s.lookX * 0.05; ant.rotation.x = -hop * 0.25;
      face.draw(s); lamp.set(s); marks.set(s, 0.36);
      earGlow.color.copy(lamp.color).multiplyScalar(0.75 + 0.35 * lampLevel(s));
      coreMat.emissiveIntensity = 0.3 + 1.5 * clamp(s.talk);
      arms.forEach((a, i) => { const side = i ? 1 : -1; a.set(armPose(s, side, ARMS[side])); });
      holdProp(body, arms[0].hand, tablet, TAB.e, TAB.o);
      legs.forEach(g => { g.children[0].rotation.x = hop * 0.3; });
    },
  };
}

// ---------- student 芋圓: short and round, even bigger head, orange ear cups + antenna lamp, orange backpack, tablet ----------
/** flat strap (rectangular cross-section) along a curve; width w, thickness th, the flat side faces away from the torso */
function ribbonGeo(curve, TR, w, th) {
  const N = 48, P = [], idx = [];
  const pts = curve.getSpacedPoints(N);
  for (let i = 0; i <= N; i++) {
    const p = pts[i], t = curve.getTangentAt(i / N);
    const out = new THREE.Vector3(p.x / TR.rx, p.y / TR.ry, p.z / TR.rz).normalize();   // roughly the surface normal
    const b = new THREE.Vector3().crossVectors(t, out).normalize(); const n = new THREE.Vector3().crossVectors(b, t).normalize();
    for (const [u, v] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) P.push(p.x + b.x * u * w / 2 + n.x * v * th, p.y + b.y * u * w / 2 + n.y * v * th, p.z + b.z * u * w / 2 + n.z * v * th);
  }
  for (let i = 0; i < N; i++) for (let k = 0; k < 4; k++) { const a = i * 4 + k, b2 = i * 4 + (k + 1) % 4, c = a + 4, d = b2 + 4; idx.push(a, b2, d, a, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function strapTube(TR, x0, mat, off) {
  // a backpack strap that runs from the back, over the shoulder, down the chest (sampled on the torso surface)
  const pts = [];
  // over the shoulder, down the chest, then out to the side under the arm and round to the bag
  for (let i = 0; i <= 14; i++) {
    const u = i / 14;
    const y = lerp(0.3, -0.04, u);
    const xx = x0 * lerp(0.82, 1.45, u * u);
    const p = onSurf(TR, xx, Math.min(y, TR.ry * 0.97), off).p;
    pts.push(p);
  }
  const back = pts[0].clone(); back.z = -back.z * 0.6; back.y += 0.08;
  pts.unshift(back);
  const end = pts[pts.length - 1], side = new THREE.Vector3(Math.sign(x0) * TR.rx * 1.02, end.y - 0.02, -0.12);
  pts.push(side);
  return new THREE.Mesh(ribbonGeo(new THREE.CatmullRomCurve3(pts), TR, 0.1, 0.02), mat);
}
function makeStudent() {
  const M = mats();
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  root.add(makeShadow(1.5, 1.1));
  const feet = [-1, 1].map(sx => {
    const g = new THREE.Group(); g.position.set(sx * 0.18, 0, 0.04); g.rotation.y = sx * 0.15; body.add(g);
    const f = new THREE.Mesh(superGeo(0.145, 0.095, 0.18, 0.8, { ws: 24, hs: 16, taper: 0.1 }), M.shell); f.position.y = 0.1; g.add(f);
    const sole = new THREE.Mesh(superGeo(0.15, 0.032, 0.185, 0.45, { ws: 24, hs: 8 }), M.orange); sole.position.y = 0.03; g.add(sole);
    const heel = new THREE.Mesh(superGeo(0.08, 0.045, 0.05, 0.6, { ws: 16, hs: 10 }), M.orange); heel.position.set(0, 0.09, -0.15); g.add(heel);
    return g;
  });
  const TR = { rx: 0.5, ry: 0.41, rz: 0.44, e: 0.95, taper: 0.16 };
  const torso = new THREE.Group(); torso.position.y = 0.5; body.add(torso);
  const torsoM = new THREE.Mesh(superGeo(TR.rx, TR.ry, TR.rz, TR.e, { ws: 48, hs: 34, taper: TR.taper }), M.shell); torso.add(torsoM);
  // orange belly dot (ring + centre)
  const dp = onSurf(TR, -0.08, -0.2);
  const dot = new THREE.Group(); dot.position.copy(dp.p); faceTo(dot, dp.n); torso.add(dot);
  const dRing = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.017, 8, 28), M.orange); dot.add(dRing);
  const dCore = new THREE.Mesh(new THREE.CircleGeometry(0.03, 24), M.orange); dCore.position.z = 0.004; dot.add(dCore);
  // backpack + straps
  const bag = new THREE.Group(); bag.position.set(0, 0.56, -0.4); body.add(bag);
  const bagM = new THREE.Mesh(superGeo(0.53, 0.36, 0.18, 0.42, { ws: 32, hs: 22 }), M.orange); bag.add(bagM);
  const flap = new THREE.Mesh(superGeo(0.36, 0.13, 0.05, 0.4, { ws: 24, hs: 12 }), M.shiny(COL.orangeDeep, { r: 0.32 })); flap.position.set(0, 0.2, -0.15); bag.add(flap);
  const buckle = new THREE.Mesh(superGeo(0.04, 0.035, 0.015, 0.35, { ws: 12, hs: 8 }), M.metal); buckle.position.set(0, 0.1, -0.2); bag.add(buckle);
  const straps = [-1, 1].map(sx => { const m = strapTube(TR, sx * 0.3, M.orange, 0.004); torso.add(m); return m; });
  // head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.12, 24), M.dark); neck.position.y = 0.9; body.add(neck);
  const head = new THREE.Group(); head.position.y = 0.72; body.add(head);
  const HR = { rx: 0.67, ry: 0.5, rz: 0.56, e: 0.78, taper: -0.04 }, HC = 0.47;
  const headM = new THREE.Mesh(superGeo(HR.rx, HR.ry, HR.rz, HR.e, { ws: 56, hs: 40, taper: HR.taper }), M.shell); headM.position.y = HC; head.add(headM);
  const face = makeFace({ W: 512, H: 320, plate: { x: 20, y: 32, w: 472, h: 258, r: 124 },
    eyes: [{ x: 256 - 104, y: 140 }, { x: 256 + 104, y: 140 }], er: 58, eyeLw: 0.38, mouth: { x: 256, y: 214, w: 46, h: 64, lw: 11 }, idleOpen: 0.6, ahaEyes: 'chevron' });
  const visor = new THREE.Mesh(superGeo(HR.rx, HR.ry, HR.rz, HR.e, { ...frontPatch(1.35, 0.98), ws: 36, hs: 26, offset: 0.006, taper: HR.taper, planar: { cx: 0, cy: -0.05, w: 1.16, h: 0.725 } }), face.mat);
  visor.position.y = HC; visor.renderOrder = 2; head.add(visor);
  // ear cups: white housing, thick orange outer ring, orange centre
  [-1, 1].forEach(sx => {
    const g = new THREE.Group(); g.position.set(sx * 0.62, HC - 0.03, -0.03); g.rotation.y = sx * -0.45; head.add(g);
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.24, 0.15, 40), M.orange); outer.rotation.z = Math.PI / 2; g.add(outer);
    const face2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 40), M.shell); face2.rotation.z = Math.PI / 2; face2.position.x = sx * 0.078; g.add(face2);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.orange); cap.rotation.z = -sx * Math.PI / 2; cap.scale.y = 0.35; cap.position.x = sx * 0.085; g.add(cap);
  });
  // short tilted antenna with a warm lamp, orange base
  const ant = new THREE.Group(); ant.position.set(0.26, HC + HR.ry * 0.93, 0); ant.rotation.z = -0.38; head.add(ant);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.085, 0.05, 24), M.orange); base.position.y = 0.01; ant.add(base);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.15, 12), M.dark); stalk.position.y = 0.1; ant.add(stalk);
  const lamp = makeLamp(0.085, COL.amber); lamp.group.position.y = 0.22; ant.add(lamp.group);
  const marks = makeMarks(COL.orange); marks.q.position.set(0.85, HC + 0.45, 0.1); marks.q.userData.y = HC + 0.45; marks.b.position.set(-0.9, HC + 0.32, 0.1); head.add(marks.q, marks.b);
  const armCfg = { L1: 0.1, L2: 0.08, r: 0.078, hand: 0.082, shoulderMat: M.shell, elbowMat: M.shell, cuffMat: M.gold };
  const arms = [-1, 1].map(sx => { const a = makeArm(M, sx, armCfg); a.pivot.position.set(sx * 0.46, 0.73, 0.03); body.add(a.pivot); return a; });
  const tablet = makeTablet(M, 0.34, 0.25); arms[0].hand.add(tablet);
  const TAB = { e: new THREE.Euler(-0.5, Math.PI + 0.75, -0.12, 'YXZ'), o: new THREE.Vector3(0.1, 0.05, 0.09) };
  const ARMS = {
    [-1]: { rest: { aZ: 0.35, aX: 0.0, bx: 1.3, bz: -0.5, hx: 0.2 }, raise: { aZ: 2.65, aX: 0, bx: 0.3, bz: 0.2 } },
    [1]: {
      rest: { aZ: 0.38, aX: 0.05, bx: 0.35, bz: 0.1 },
      raise: { aZ: 2.65, aX: 0, bx: 0.3, bz: 0.2 },
      point: { aZ: 1.45, aX: -0.2, bx: 0.15, bz: 0.15 },
      wave: { aZ: 1.6, aX: -0.12, bx: 0.2, bz: 1.25 },
      think: { aZ: 0.3, aX: -0.5, bx: 2.3, bz: -0.7, hx: 0.5 },
    },
  };
  const height = 0.72 + HC + HR.ry * 0.93 + 0.22 * Math.cos(0.38) + 0.085;
  return {
    root, height,
    pose(s) {
      s = full(s);
      const t = s.t, hop = clamp(s.hop);
      root.rotation.y = s.turn * 0.5;
      body.position.y = hop * 0.6; body.rotation.z = s.tilt * 0.28;
      const breath = Math.sin(t * 2.4 + 1) * 0.014, sq = s.squash * 0.38;
      torso.scale.set(1 + sq * 0.5 - breath * 0.3, 1 - sq + breath, 1 + sq * 0.5);
      head.position.y = 0.72 - sq * 0.4 + breath * 0.5;
      head.rotation.set(-s.lookY * 0.18, s.lookX * 0.28, -s.tilt * 0.12 + (s.state === 'doubt' ? -0.14 * sm(s.stateK) : 0));
      ant.rotation.z = -0.38 + 0.1 * Math.sin(t * 2.3) - s.tilt * 0.3; ant.rotation.x = -hop * 0.4;
      face.draw(s); lamp.set(s); marks.set(s, 0.34);
      arms.forEach((a, i) => { const side = i ? 1 : -1; a.set(armPose(s, side, ARMS[side])); });
      holdProp(body, arms[0].hand, tablet, TAB.e, TAB.o);
      feet.forEach(f => { f.rotation.x = hop * 0.4; });
    },
  };
}

// ---------- embodiment: tiny hovering orb drone, one LED eye, glowing ring, fins (unchanged from v1) ----------
function makeEmbodiment() {
  const M = mats(); const accent = M.shiny('#d3deeb', { r: 0.32, cr: 0.1 }); const joint = M.shiny('#aebfd3', { r: 0.25, m: 0.35, cr: 0.12 });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const shadow = makeShadow(0.9, 0.7); root.add(shadow);
  const R = { rx: 0.36, ry: 0.34, rz: 0.36, e: 0.95 };
  const orb = new THREE.Mesh(superGeo(R.rx, R.ry, R.rz, R.e, { ws: 36, hs: 24 }), M.shell); body.add(orb);
  const face = makeFace({ W: 384, H: 256, plate: { x: 46, y: 56, w: 292, h: 140, r: 70 },
    eyes: [{ x: 150, y: 116 }, { x: 234, y: 116 }], er: 30, eyeLw: 0.4, mouth: { x: 192, y: 164, w: 22, h: 24, lw: 7 }, idleOpen: 0, ahaEyes: 'arc' });
  const visor = new THREE.Mesh(superGeo(R.rx, R.ry, R.rz, R.e, { ...frontPatch(1.3, 1.0), ws: 28, hs: 20, offset: 0.005, planar: { cx: 0, cy: 0.03, w: 0.62, h: 0.413 } }), face.mat);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.08, 32), accent); cap.position.y = -R.ry + 0.015; body.add(cap);
  const capRing = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 8, 32), joint); capRing.rotation.x = Math.PI / 2; capRing.position.y = -R.ry - 0.025; body.add(capRing);
  visor.renderOrder = 2; body.add(visor);
  const ringG = new THREE.Group(); ringG.rotation.x = -Math.PI / 2 + 0.3; ringG.position.y = -0.06; body.add(ringG);
  const ringMat = new THREE.MeshPhysicalMaterial({ color: '#e6eef7', emissive: '#9fd8ff', emissiveIntensity: 0.8, roughness: 0.15, clearcoat: 1 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.024, 8, 64), ringMat); ringG.add(ring);
  const stripeMat = new THREE.MeshBasicMaterial({ color: '#9fd8ff', toneMapped: false });
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.012, 5, 64), stripeMat); stripe.position.z = 0.018; ringG.add(stripe);
  const beads = [0, 1, 2].map(() => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), M.shell); ringG.add(b); return b; });
  const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.06, 18), joint); nub.position.y = R.ry + 0.02; body.add(nub);
  const lamp = makeLamp(0.045, '#9fd8ff'); lamp.group.position.y = R.ry + 0.09; body.add(lamp.group);
  const fins = [-1, 1].map(sx => {
    const p = new THREE.Group(); p.position.set(sx * 0.355, 0.0, 0.02); body.add(p);
    const f = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), accent); f.scale.set(0.05, 0.14, 0.11); f.position.set(0, -0.12, 0); p.add(f);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), joint); tip.position.set(0, -0.005, 0); p.add(tip);
    return p;
  });
  const glowSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texes().halo, color: '#7fd6ff', transparent: true, depthWrite: false, toneMapped: false, opacity: 0.55 }));
  glowSp.position.y = -R.ry - 0.04; glowSp.scale.set(0.38, 0.22, 1); body.add(glowSp);
  const CY = 0.6;
  const height = CY + R.ry + 0.09 + 0.045;
  return {
    root, height,
    pose(s) {
      s = full(s);
      const t = s.t, hop = clamp(s.hop);
      const bob = 0.035 * Math.sin(t * 2.6);
      root.rotation.y = s.turn * 0.5;
      body.position.y = CY + bob + hop * 0.4;
      body.rotation.z = s.tilt * 0.3 + 0.05 * Math.sin(t * 1.9);
      body.rotation.y = s.lookX * 0.35; body.rotation.x = -s.lookY * 0.2;
      const sq = s.squash * 0.3; body.scale.set(1 + sq * 0.4, 1 - sq, 1 + sq * 0.4);
      face.draw(s); lamp.set(s);
      ringMat.emissive.copy(lamp.color); ringMat.emissiveIntensity = 0.25 + 0.35 * lampLevel(s);
      stripeMat.color.copy(lamp.color).multiplyScalar(0.55 + 0.5 * lampLevel(s));
      beads.forEach((b, j) => { const a = t * 1.4 + j * Math.PI * 2 / 3; b.position.set(Math.cos(a) * 0.53, Math.sin(a) * 0.53, 0); });
      fins.forEach((p, i) => {
        const side = i ? 1 : -1, raise = side > 0 ? s.armR : s.armL;
        let a = lerp(1.25, 2.6, clamp(raise)) + 0.08 * Math.sin(t * 5 + i);
        if (side > 0) { a = lerp(a, 1.75, sm(s.point)); const w = sm(s.wave); a = lerp(a, 2.3 + 0.45 * Math.sin(t * 14), w); }
        p.rotation.z = side * a;
      });
      const h = body.position.y; shadow.scale.setScalar(1.1 - h * 0.5); shadow.material.opacity = clamp(1.25 - h);
      glowSp.material.opacity = 0.4 + 0.15 * Math.sin(t * 9);
    },
  };
}

export async function create(env, opts = {}) {
  // a colour set is applied only while building (every colour is read at build time), then COL is restored
  const v = variants.find(x => x.id === opts.variant) || variants[0];
  const saved = { ...COL };
  Object.assign(COL, v.col);
  try {
    return { teacher: makeTeacher(), student: makeStudent(), embodiment: makeEmbodiment(), variant: v.id };
  } finally { Object.assign(COL, saved); }
}
