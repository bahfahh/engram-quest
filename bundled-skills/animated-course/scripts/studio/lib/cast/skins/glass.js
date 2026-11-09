// 實驗 14 畫風 2（v3，2026-11-02 照使用者的設計圖重做）：玻璃・Iris（多維思考：沉穩、清楚、溫柔好奇）
//   講解者 Iris：冰藍色亮面玻璃機器人。頭身一體的豆形（上寬下窄），大片黑色亮面面罩上兩顆青色發光膠囊眼 + 小微笑，
//     兩側圓耳盤（金屬框 + 青色發光環），半透明身體裡一顆發光的藍色「原子核心」（球 + 軌道環 + 小粒子 + 透明氣泡），
//     胖胖的玻璃手臂（肩、腕有金屬環），兩隻圓玻璃腳（金屬邊）；頭頂一個小槽、左上一顆小按鈕。
//   學習者：圓滾滾的淡紫玻璃球（沒有分開的頭），同款面罩，桃紫色原子核心（兩道交叉軌道），短手、圓腳、香檳金屬環。
//   化身：漂浮的薄荷綠多面水晶球，同款小面罩，青綠核心，周圍小星光，地上一圈柔和綠光；指東西時核心的小衛星飛出去當「手指」。
// 簽名＝體內的原子核心（狀態燈）：idle 慢慢轉；think 轉藍、轉快、多出一道陀螺儀軌道（粒子繞著轉），一隻手托腮；aha 轉金、脈衝向外擴散光環 + 星芒；
//   doubt 變暗閃爍、軌道歪斜搖晃、粒子下沉 + 「?」。核心的光也染到玻璃身體（老師連耳環一起）。
// 假玻璃（不用 transmission）：透明殼 + fresnel 邊緣 + 視角固定的柔光箱反光與玻璃球弧形高光（在 tone mapping 之後疊上，才不會被洗灰）+ 核心光染色；
//   核心畫在殼之後（renderOrder 5+）保持鮮豔；軌道環是一條 neon 管（沿管截面算亮度，端看時也亮）；
//   手、腳、金屬環是不透明的亮面玻璃 → 不會有透明物件前後排序錯（v1 的問題）。
import * as THREE from 'three';

export const meta = {
  id: 'glass', no: '2', name: '玻璃・Iris', kind: '3d',
  note: 'the glowing orbital core inside the glass body is the state light: idle it slowly orbits; think it turns blue, spins fast and grows an extra gyroscope ring; aha it turns gold and pulses rings and sparkles outward; doubt it dims and flickers, the orbit tilts and wobbles, particles sink, a "?" appears. The glow tints the glass (and the teacher\'s ear rings).',
};

const TAU = Math.PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const spow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const DEF = { t: 0, blink: 0, lookX: 0, lookY: 0, talk: 0, armL: 0, armR: 0, point: 0, wave: 0, hop: 0, squash: 0, tilt: 0, turn: 0, state: 'idle', stateK: 0 };
const full = s => {
  s = { ...DEF, ...s };
  for (const k in DEF) if (k !== 'state' && !Number.isFinite(s[k])) s[k] = DEF[k];   // a NaN field must not make the character vanish
  return s;
};

// ───────────────────────── geometry ─────────────────────────
/** superellipsoid (|x/rx|^n+|y/ry|^n+|z/rz|^n=1, n=2/e) with analytic normals; taper > 0 widens the bottom, < 0 the top; optional patch + planar UV */
function superGeo(rx, ry, rz, e, o = {}) {
  const { ws = 48, hs = 32, phiStart = 0, phiLength = TAU, thetaStart = 0, thetaLength = Math.PI, offset = 0, planar = null, taper = 0 } = o;
  const g = new THREE.SphereGeometry(1, ws, hs, phiStart, phiLength, thetaStart, thetaLength);
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  const n = 2 / e;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let X = spow(x, e) * rx, Y = spow(y, e) * ry, Z = spow(z, e) * rz;
    let nx = Math.sign(X) * Math.pow(Math.abs(X / rx), n - 1) / rx;
    let ny = Math.sign(Y) * Math.pow(Math.abs(Y / ry), n - 1) / ry;
    let nz = Math.sign(Z) * Math.pow(Math.abs(Z / rz), n - 1) / rz;
    if (taper) { const s = 1 - taper * Y / ry; ny = ny + (taper / ry) / s * (nx * X + nz * Z); nx /= s; nz /= s; X *= s; Z *= s; }
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
const ZA = V3(0, 0, 1), YA = V3(0, 1, 0);
const faceTo = (m, n) => { m.quaternion.setFromUnitVectors(ZA, n.clone().normalize()); return m; };

// ───────────────────────── textures (all canvas) ─────────────────────────
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const TEX = {};
function texes() {
  if (TEX.halo) return TEX;
  TEX.halo = canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(255,255,255,.6)'); g.addColorStop(0.55, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  TEX.soft = canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(0.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  TEX.ring = canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 36, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  TEX.star = canvasTex(128, 128, (x, n) => {   // 4-point sparkle with a soft centre
    x.translate(n / 2, n / 2);
    for (let i = 0; i < 8; i++) {
      x.rotate(Math.PI / 4); const L = (i % 2 ? 0.2 : 0.5) * n, w = n * (i % 2 ? 0.02 : 0.04);
      const g = x.createLinearGradient(0, 0, 0, -L); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(-w, 0); x.lineTo(0, -L); x.lineTo(w, 0); x.closePath(); x.fill();
    }
    const g = x.createRadialGradient(0, 0, 0, 0, 0, n * 0.16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(-n / 2, -n / 2, n, n);
  });
  TEX.shadow = canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(48,58,84,.40)'); g.addColorStop(0.5, 'rgba(48,58,84,.18)'); g.addColorStop(1, 'rgba(48,58,84,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  TEX.qmark = canvasTex(128, 128, (x) => { x.font = '900 104px "Noto Sans TC", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 14; x.strokeStyle = '#ffffff'; x.lineJoin = 'round'; x.strokeText('?', 64, 70); x.fillStyle = '#ffffff'; x.fillText('?', 64, 70); });
  TEX.burst = canvasTex(128, 128, (x) => { x.lineCap = 'round'; x.strokeStyle = '#fff'; x.lineWidth = 13; [[-0.9, 26, 50], [-0.25, 30, 58], [0.4, 26, 50]].forEach(([a, r0, r1]) => { x.beginPath(); x.moveTo(30 + Math.cos(a) * r0, 64 + Math.sin(a) * r0); x.lineTo(30 + Math.cos(a) * r1, 64 + Math.sin(a) * r1); x.stroke(); }); });
  return TEX;
}

// ───────────────────────── materials ─────────────────────────
/** Candy glass (no transmission): physical clearcoat + fresnel edge tint + thin rim light + view-space softbox reflections
 *  (they stay put when the character turns, like a product shot) + a soft glow from the core. Transparent version: alpha from
 *  fresnel, bright reflections raise alpha, and a clearer "window" around the core (object-space sphere uWin). */
function glassMat(o = {}) {
  const transparent = !!o.transparent;
  const m = new THREE.MeshPhysicalMaterial({
    color: o.color ?? '#ffffff', roughness: o.rough ?? 0.14, metalness: o.metal ?? 0, clearcoat: 1, clearcoatRoughness: o.cr ?? 0.04,
    envMapIntensity: o.env ?? 1.2, specularIntensity: 1, transparent, opacity: 1, depthWrite: o.dw ?? !transparent, side: o.side ?? THREE.FrontSide,
    flatShading: !!o.flat, emissive: o.emissive ?? '#000000', emissiveIntensity: o.emi ?? 0,
    iridescence: o.irid ?? 0, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 480],
  });
  const u = {
    uEdge: { value: new THREE.Color(o.edge ?? o.color ?? '#ffffff') }, uEdgeAmt: { value: o.edgeAmt ?? 0.45 }, uEdgePow: { value: o.edgePow ?? 2.2 },
    uRim: { value: new THREE.Color(o.rim ?? '#ffffff') }, uRimAmt: { value: o.rimAmt ?? 0.6 },
    uInner: { value: new THREE.Color(o.inner ?? '#ffffff') }, uInnerAmt: { value: o.innerAmt ?? 0.06 },
    uHi: { value: o.hi ?? 1 }, uBox: { value: o.box ?? 1 }, uArc: { value: o.arc ?? 0 }, uSat: { value: o.sat ?? 1 }, uFacet: { value: o.facet ?? 0 }, uA0: { value: o.a0 ?? 1 }, uA1: { value: o.a1 ?? 1 },
    uWin: { value: new THREE.Vector4(0, 0, 0, 0) }, uWinA: { value: 1 },
    uGlowC: { value: new THREE.Color('#ffffff') }, uGlow: { value: 0 }, uGlowR: { value: 2.5 },
    uLineC: { value: new THREE.Color(o.lineC ?? '#ffffff') }, uLine: { value: o.line ?? 0 },
  };
  const bary = !!o.bary;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vObjP;${bary ? '\nattribute vec3 bary; varying vec3 vBary;' : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvObjP = position;${bary ? ' vBary = bary;' : ''}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vObjP;${bary ? '\nvarying vec3 vBary;' : ''}
uniform vec3 uEdge, uRim, uInner, uGlowC, uLineC; uniform float uEdgeAmt, uEdgePow, uRimAmt, uInnerAmt, uHi, uBox, uArc, uSat, uFacet, uA0, uA1, uWinA, uGlow, uGlowR, uLine; uniform vec4 uWin;
float gHi, gRim, gGl, gE;
float band(float a, float b, float c, float d, float x) { return smoothstep(a, b, x) * (1.0 - smoothstep(c, d, x)); }`)
      .replace('#include <opaque_fragment>', `{
  vec3 nV = normalize(normal), vV = normalize(vViewPosition);
  float ndv = clamp(dot(nV, vV), 0.0, 1.0), fr = 1.0 - ndv, fE = pow(fr, uEdgePow);
  float baseA = diffuseColor.a;
  if (uFacet > 0.0) {   // gem: each facet a slightly different shade (hash of its object-space normal)
    vec3 fn = normalize(cross(dFdx(vObjP), dFdy(vObjP)));
    float hf = fract(sin(dot(floor(fn * 40.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    outgoingLight *= 1.0 + uFacet * (hf - 0.5);
  }
  gE = clamp(fE * uEdgeAmt, 0.0, 1.0);   // edge tint is applied after tone mapping too (keeps its colour)
  outgoingLight += uInner * uInnerAmt * ndv * ndv;
  vec3 r = reflect(-vV, nV);
  float b1 = band(-0.85, -0.5, 0.05, 0.4, r.x) * smoothstep(0.8, 0.95, r.y);                                   // overhead softbox: the dome's top-left glare
  float b2 = smoothstep(0.72, 0.9, r.x) * band(-0.45, -0.15, 0.25, 0.5, r.y);                                   // strip, right
  float b3 = (1.0 - smoothstep(-0.9, -0.68, r.x)) * band(-0.55, -0.25, 0.35, 0.62, r.y);                         // tall strip, left
  float b4 = (1.0 - smoothstep(-0.99, -0.88, r.y)) * 0.14;                                                       // soft bounce from below
  float hot = pow(max(dot(r, normalize(vec3(-0.42, 0.52, 0.74))), 0.0), 140.0);
  vec2 nd = normalize(nV.xy + 1e-5);
  float arc = band(0.42, 0.56, 0.8, 0.9, fr) * smoothstep(0.35, 0.85, dot(nd, vec2(-0.62, 0.78)))                  // glass sphere crescent, upper left
            + 0.6 * band(0.55, 0.66, 0.84, 0.93, fr) * smoothstep(0.55, 0.9, dot(nd, vec2(0.7, -0.7)));          // smaller one, lower right
  float hi = ((b1 * 0.6 + b2 * 0.32 + b3 * 0.4 + b4) * uBox + hot * 1.3 + arc * uArc) * uHi;
  float rim = pow(fr, 3.2) * smoothstep(-0.25, 0.6, dot(nV, normalize(vec3(0.8, 0.35, -0.1)))) * uRimAmt;
  float dW = uWin.w > 0.0 ? length(vObjP - uWin.xyz) / uWin.w : 9.0;
  float gl = uGlow * exp(-dW * dW * uGlowR);
  gHi = clamp(hi, 0.0, 1.0); gRim = clamp(rim, 0.0, 1.0); gGl = clamp(gl, 0.0, 0.85);   // applied after tone mapping (stay crisp)
  float a = mix(uA0, uA1, fE);
  a = mix(a * uWinA, a, smoothstep(0.45, 1.0, dW));
  a = max(a, clamp(hi * 0.9 + rim * 0.8 + gl * 0.8, 0.0, 1.0));
${bary ? `  float eb = min(min(vBary.x, vBary.y), vBary.z);
  float ln = (1.0 - smoothstep(0.0, fwidth(eb) * 1.8, eb)) * uLine;
  outgoingLight = mix(outgoingLight, uLineC, ln); a = max(a, ln * 0.85);` : ''}
  diffuseColor.a = clamp(a, 0.0, 1.0) * baseA;
}
#include <opaque_fragment>`)
      .replace('#include <tonemapping_fragment>', `#include <tonemapping_fragment>
  gl_FragColor.rgb = mix(vec3(dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722))), gl_FragColor.rgb, uSat);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uEdge, gE);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uGlowC, gGl);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uRim, gRim);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), gHi);`);
  };
  m.customProgramCacheKey = () => 'x14glass3' + (bary ? 'b' : '');
  m.userData.u = u;
  return m;
}
const metalMat = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, metalness: o.m ?? 0.92, roughness: o.r ?? 0.24, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: o.env ?? 1.5 });
/** neon tube: a crisp white-hot centre line with a soft coloured glow fading to the tube's silhouette (one torus per orbit ring) */
function neonMat(color, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(color) }, uW: { value: new THREE.Color('#ffffff') }, uA: { value: o.a ?? 0.8 }, uCore: { value: o.core ?? 1 } },
    // the profile is measured across the tube (view direction with the ring tangent removed), so the ring stays bright where it is seen end-on
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vT;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz;
  vec2 c = normalize(position.xy + 1e-6); vT = normalMatrix * vec3(-c.y, c.x, 0.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uC, uW; uniform float uA, uCore; varying vec3 vN; varying vec3 vV; varying vec3 vT;
void main(){ vec3 T = normalize(vT), v = normalize(vV); vec3 vp = v - dot(v, T) * T;
  float f = abs(dot(normalize(vN), vp / max(length(vp), 1e-4)));
  float c = smoothstep(0.8, 0.96, f) * uCore, g = pow(f, 1.6);
  gl_FragColor = vec4(mix(uC, uW, clamp(c, 0.0, 1.0)), clamp(g * uA + c, 0.0, 1.0));
#include <colorspace_fragment>
}`,
    transparent: true, depthWrite: false,
  });
}
const basicMat = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, ...o });
function spriteOf(kind, color, o = {}) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texes()[kind], color, transparent: true, depthWrite: false, toneMapped: false, opacity: o.opacity ?? 0, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending }));
  s.renderOrder = o.order ?? 7; return s;
}
function makeShadow(w, d) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: texes().shadow, transparent: true, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.004; m.renderOrder = -1; return m;
}

// ───────────────────────── the LED face on the black glass visor (canvas redrawn every pose: a pure function of s) ─────────────────────────
// cfg: W,H, plate{x,y,w,h,r}, eyes[{x,y}], ew, eh (pill), mouth{x,y,w,lw}, led, ledCore
function makeFace(cfg) {
  const { W, H, plate, eyes, ew, eh, mouth, led: LED, ledCore: CORE } = cfg;
  const mat = glassMat({ color: '#2a2a2a', transparent: true, rough: 0.06, env: cfg.env ?? 0.22, edgeAmt: 0.0, rim: '#cfe6ff', rimAmt: 0.3, innerAmt: 0, hi: cfg.hi ?? 0.42, box: 0.12, arc: 0.35, a0: 1, a1: 1, emissive: '#ffffff', emi: 1.15 });
  mat.toneMapped = false;   // keep the LED colour saturated (ACES would bleach it)
  mat.specularIntensity = 0.2; mat.clearcoat = 0.35;   // deep black glass: the gloss comes from the painted sheen and the post highlights, not a grey wash of the studio env
  mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -2;
  const rr = (x, p, g = 0) => { x.beginPath(); x.roundRect(p.x - g, p.y - g, p.w + g * 2, p.h + g * 2, Math.min(p.r + g, p.h / 2 + g)); };
  mat.map = canvasTex(W, H, (x) => {
    x.clearRect(0, 0, W, H);
    rr(x, plate, 7); x.fillStyle = 'rgba(150,170,196,.55)'; x.fill();                       // soft light edge where the glass meets the body
    rr(x, plate, 3); x.fillStyle = '#10141d'; x.fill();
    rr(x, plate); const g = x.createLinearGradient(0, plate.y, 0, plate.y + plate.h); g.addColorStop(0, '#222a3a'); g.addColorStop(0.35, '#0e121b'); g.addColorStop(1, '#03050a'); x.fillStyle = g; x.fill();
    x.save(); rr(x, plate); x.clip();
    const s = x.createLinearGradient(plate.x, plate.y, plate.x + plate.w * 0.5, plate.y + plate.h * 0.8); s.addColorStop(0, 'rgba(255,255,255,.18)'); s.addColorStop(0.32, 'rgba(255,255,255,.05)'); s.addColorStop(0.33, 'rgba(255,255,255,0)'); x.fillStyle = s; x.fillRect(0, 0, W, H);
    x.restore();
  });
  const ec = document.createElement('canvas'); ec.width = W; ec.height = H; const x = ec.getContext('2d', { willReadFrequently: true });   // CPU canvas (the GPU canvas sometimes kept only a dirty rectangle)
  const emTex = new THREE.CanvasTexture(ec); emTex.colorSpace = THREE.SRGBColorSpace; mat.emissiveMap = emTex;
  const glow = (alpha, blur, paint, coreScale = 0.55) => {
    if (alpha <= 0.01) return;
    x.save(); x.globalAlpha = alpha; x.shadowColor = LED; x.shadowBlur = blur; x.fillStyle = x.strokeStyle = LED; paint(1); x.shadowBlur = 0;
    x.globalAlpha = alpha * 0.9; x.fillStyle = x.strokeStyle = CORE; paint(coreScale); x.restore();
  };
  const star = (cx, cy, r) => { x.beginPath(); for (let i = 0; i < 8; i++) { const r2 = i % 2 ? r * 0.28 : r, a = i * Math.PI / 4; x.lineTo(cx + Math.sin(a) * r2, cy - Math.cos(a) * r2); } x.closePath(); x.fill(); };
  const pill = (cx, cy, w, h) => { const hh = Math.max(h, w * 0.3); x.beginPath(); x.roundRect(cx - w / 2, cy - hh / 2, w, hh, Math.min(w / 2, hh / 2)); x.fill(); };
  function draw(s) {
    const k = sm(s.stateK), st = s.state;
    const kT = st === 'think' ? k : 0, kA = st === 'aha' ? k : 0, kD = st === 'doubt' ? k : 0;
    const bl = clamp(s.blink);
    x.globalAlpha = 1; x.shadowBlur = 0; x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.save(); rr(x, plate); x.clip();
    const amb = x.createRadialGradient(W / 2, plate.y + plate.h * 0.48, 0, W / 2, plate.y + plate.h * 0.48, plate.w * 0.55);
    amb.addColorStop(0, 'rgba(90,170,255,.10)'); amb.addColorStop(1, 'rgba(90,170,255,0)'); x.fillStyle = amb; x.fillRect(0, 0, W, H);
    const lx = clamp(s.lookX + kT * 0.45, -1, 1), ly = clamp(s.lookY + kT * 0.55 - kD * 0.2, -1, 1);
    const gx = lx * plate.w * 0.07, gy = -ly * plate.h * 0.085;
    eyes.forEach((e, i) => {
      const cx = e.x + gx, cy = e.y + gy, dir = i === 0 ? -1 : 1;   // dir -1 = viewer-left eye
      // pill eyes: think squints the viewer-left eye, doubt shortens both (droopy); aha swaps them for happy arcs
      let h = eh * (1 - 0.9 * bl);
      h *= lerp(1, i === 0 ? 0.6 : 1.04, kT) * lerp(1, 0.62, kD) * (1 + 0.06 * clamp(s.talk));
      const cyy = cy + (eh - h) * 0.32 * (kD + (i === 0 ? kT : 0));
      glow(1 - kA, 46, (c) => pill(cx, cyy, ew * (c < 1 ? 0.42 : 1), h - ew * (c < 1 ? 0.55 : 0)), 0.42);
      glow(kA, 26, (c) => { x.save(); x.translate(cx, cy + eh * 0.2); x.scale(1, 1 - 0.6 * bl); x.lineCap = 'round'; x.lineWidth = ew * 0.78 * c; x.beginPath(); x.arc(0, 0, ew * 1.15, Math.PI * 1.12, Math.PI * 1.88); x.stroke(); x.restore(); }, 0.42);
      // brows: think = one raised brow over the squinting eye; doubt = worried brows (inner ends up)
      const by = cy - eh * 0.78;
      if (i === 0) glow(kT, 16, (c) => { x.lineCap = 'round'; x.lineWidth = ew * 0.36 * c; x.beginPath(); x.moveTo(cx - ew * 1.0, by + eh * 0.06); x.quadraticCurveTo(cx - ew * 0.1, by - eh * 0.22, cx + ew * 0.95, by - eh * 0.08); x.stroke(); }, 0.4);
      glow(kD, 16, (c) => { x.lineCap = 'round'; x.lineWidth = ew * 0.34 * c; x.beginPath(); x.moveTo(cx + dir * ew * 1.0, by + eh * 0.16); x.lineTo(cx - dir * ew * 0.75, by - eh * 0.1); x.stroke(); }, 0.4);
    });
    if (kA > 0.02) { const tw = 0.6 + 0.4 * Math.sin(s.t * 9); glow(kA, 10, () => { star(plate.x + plate.w * 0.1, plate.y + plate.h * 0.24, plate.h * 0.1 * tw); star(plate.x + plate.w * 0.9, plate.y + plate.h * 0.2, plate.h * 0.08 * (1.6 - tw)); }, 0.5); }
    // mouth
    const mx = mouth.x + gx * 0.5, my = mouth.y + gy * 0.4, mw = mouth.w, lw = mouth.lw;
    const openAmt = Math.max(clamp(s.talk), kA * 0.9);
    const wO = clamp(openAmt * 3.5), closed = 1 - wO;
    const kI = 1 - Math.max(kT, kD);
    glow(closed * kI, 14, (c) => { x.lineCap = 'round'; x.lineWidth = lw * c; x.beginPath(); x.arc(mx, my - mw * 0.75, mw * 0.95, Math.PI * 0.28, Math.PI * 0.72); x.stroke(); }, 0.45);
    glow(closed * kT, 12, (c) => { x.lineCap = 'round'; x.lineWidth = lw * c; x.beginPath(); x.moveTo(mx - mw * 0.35, my + lw * 0.1); x.quadraticCurveTo(mx + mw * 0.05, my + lw * 0.6, mx + mw * 0.42, my - lw * 0.7); x.stroke(); }, 0.45);
    glow(closed * kD, 12, (c) => { x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = lw * 0.85 * c; x.beginPath(); for (let j = 0; j <= 16; j++) { const u = j / 16; x.lineTo(mx - mw * 0.36 + mw * 0.72 * u, my + Math.sin(u * Math.PI * 2.5) * lw * 0.5 + lw * 0.2); } x.stroke(); }, 0.45);
    if (wO > 0.01) {   // open mouth: a soft glowing "D"
      const hh = mouth.h * (0.35 + 0.65 * openAmt), w = mw * (0.62 + 0.18 * openAmt);
      const top = my - hh * 0.3, bot = my + hh * 0.7;
      const path = () => { x.beginPath(); x.moveTo(mx - w, top); x.lineTo(mx + w, top); x.bezierCurveTo(mx + w, bot, mx + w * 0.5, bot + hh * 0.1, mx, bot + hh * 0.1); x.bezierCurveTo(mx - w * 0.5, bot + hh * 0.1, mx - w, bot, mx - w, top); x.closePath(); };
      x.save(); x.globalAlpha = wO; x.shadowColor = LED; x.shadowBlur = 16; x.fillStyle = LED; path(); x.fill(); x.shadowBlur = 0;
      x.save(); path(); x.clip(); x.fillStyle = 'rgba(8,20,36,.82)'; x.fillRect(mx - w * 1.2, top + lw * 0.6, w * 2.4, hh * 1.4);
      x.fillStyle = cfg.tongue || '#ff8fb4'; x.beginPath(); x.ellipse(mx, bot + hh * 0.05, w * 0.6, hh * 0.38, 0, 0, TAU); x.fill(); x.restore(); x.restore();
    }
    x.restore();
    emTex.needsUpdate = true;
  }
  return { mat, draw };
}

// ───────────────────────── the orbital core: the signature state light ─────────────────────────
const STATE_COL = { think: new THREE.Color('#3f74ff'), aha: new THREE.Color('#ffc93a'), doubt: new THREE.Color('#d9894c') };
function coreState(s, idle, out) {
  const k = sm(s.stateK), st = s.state, t = s.t;
  const kT = st === 'think' ? k : 0, kA = st === 'aha' ? k : 0, kD = st === 'doubt' ? k : 0;
  out.copy(idle);
  if (kT) out.lerp(STATE_COL.think, kT);
  if (kA) out.lerp(STATE_COL.aha, kA);
  if (kD) out.lerp(STATE_COL.doubt, kD * 0.8);
  let lv = 1 + 0.08 * Math.sin(t * 2.2);
  if (kT) lv = lerp(lv, 0.95 + 0.35 * (0.5 + 0.5 * Math.sin(t * 7)), kT);
  if (kA) lv = lerp(lv, 1.6 + 0.3 * Math.sin(t * 12), kA);
  if (kD) { const fl = (Math.sin(t * 23) * Math.sin(t * 9.3) > 0.3) ? 0.28 : 0.62; lv = lerp(lv, fl, kD); }
  return { kT, kA, kD, lv };
}
/** o: { pos, r, col, deep, rings:[{x,z,R}], parts, spread, bubble, sparkles, seed }
 *  Drawn after the glass shell (renderOrder 5+) so it stays crisp and vivid; the shell's core glow + fresnel make it read as inside. */
function makeCore(parent, o) {
  const idle = new THREE.Color(o.col), col = new THREE.Color(), lineCol = new THREE.Color(), white = new THREE.Color('#ffffff');
  const g = new THREE.Group(); g.position.copy(o.pos); parent.add(g);
  const spin = new THREE.Group(); g.add(spin);
  // the core ball: glossy, glowing, white-hot in the middle
  const ballMat = glassMat({ color: o.col, emissive: o.col, emi: 0.85, edge: o.deep, edgeAmt: 0.3, edgePow: 2.4, inner: '#ffffff', innerAmt: 0.5, rimAmt: 0.5, hi: 1.3, rough: 0.08, transparent: true, dw: true, a0: 1, a1: 1 });
  ballMat.toneMapped = false;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(o.r, 22, 14), ballMat); ball.renderOrder = 5; g.add(ball);
  let bubble = null;
  if (o.bubble) {   // a clear glass bubble around the ball (teacher)
    bubble = new THREE.Mesh(new THREE.SphereGeometry(o.bubble, 22, 14), glassMat({ color: o.col, transparent: true, a0: 0.06, a1: 0.85, edge: o.col, edgeAmt: 0.9, edgePow: 2.2, rim: '#ffffff', rimAmt: 0.8, hi: 0.9, innerAmt: 0 }));
    bubble.renderOrder = 6; g.add(bubble);
  }
  // orbit rings: one neon tube each, a bead (electron) runs on it
  const mkRing = (R, tube, x, z, y = 0) => {
    const rg = new THREE.Group(); rg.rotation.set(x, y, z, 'ZYX'); spin.add(rg);
    const glowM = neonMat(o.col, { a: 0.7 });
    const tubeM = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 6, 72), glowM); tubeM.renderOrder = 6; rg.add(tubeM);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(tube * 0.7, 10, 8), basicMat('#ffffff', { transparent: true })); bead.renderOrder = 6; rg.add(bead);
    const bh = spriteOf('halo', o.col, { opacity: 0.8, order: 7 }); bh.scale.setScalar(tube * 3.5); bead.add(bh);
    return { rg, glowM, bead, bh, R, base: { x, z, y } };
  };
  const rings = o.rings.map(d => mkRing(d.R, d.tube ?? o.r * 0.26, d.x, d.z, d.y || 0));
  const gyro = [mkRing(o.rings[0].R * 0.84, o.r * 0.2, 0.2, 1.05)];   // a gyroscope ring that appears when thinking
  // particles (tiny glowing beads) and sparkles floating in the glass
  const partMat = glassMat({ color: o.col, emissive: o.col, emi: 0.6, edge: o.deep, edgeAmt: 0.3, inner: '#ffffff', innerAmt: 0.2, hi: 1.2, rimAmt: 0.3, transparent: true, dw: true });
  partMat.toneMapped = false;
  const PG = new THREE.SphereGeometry(1, 8, 6);
  const parts = [];
  for (let i = 0; i < (o.parts || 0); i++) {
    const a = hash(i * 3.1 + o.seed) * TAU, el = (hash(i * 5.7 + o.seed) - 0.5) * 1.6, d = lerp(o.r * 1.8, o.spread, hash(i * 9.3 + o.seed));
    const base = V3(Math.cos(a) * Math.cos(el) * d * 1.1, Math.sin(el) * d * 0.8, Math.sin(a) * Math.cos(el) * d * 0.5);
    const sz = o.r * lerp(0.09, 0.19, hash(i * 2.3 + o.seed));
    const m = new THREE.Mesh(PG, partMat); m.scale.setScalar(sz); m.renderOrder = 5; g.add(m);
    parts.push({ m, base, ph: hash(i * 7.7 + o.seed) * TAU });
  }
  const sparks = [];
  for (let i = 0; i < (o.sparkles || 0); i++) {
    const sp = spriteOf('star', '#ffffff', { add: true, order: 7 });
    const a = hash(i * 4.4 + 1 + o.seed) * TAU, d = lerp(o.r * 1.6, o.spread * 1.05, hash(i * 6.1 + 2 + o.seed));
    sp.position.set(Math.cos(a) * d, Math.sin(a) * d * 0.85, o.r * 0.8); g.add(sp); sparks.push({ sp, ph: hash(i * 8.8 + o.seed) * TAU, sz: o.r * lerp(0.35, 0.7, hash(i * 1.9 + o.seed)) });
  }
  const halo = spriteOf('halo', o.col, { opacity: 0.5, order: 4 }); g.add(halo);              // coloured glow around the ball
  const haloA = spriteOf('halo', o.col, { opacity: 0, order: 4, add: true }); g.add(haloA);   // additive light: a little always, a lot on aha (never muddy)
  const haze = spriteOf('soft', o.col, { opacity: 0.3, order: 4 }); g.add(haze);              // wide coloured haze in the glass
  const bursts = [0, 1].map(() => { const b = spriteOf('ring', '#ffd36a', { order: 8, add: true }); g.add(b); return b; });
  const stars = [0, 1, 2, 3].map(() => { const b = spriteOf('star', '#fff6d0', { order: 8, add: true }); g.add(b); return b; });
  return {
    group: g, color: col,
    set(s) {
      const st = coreState(s, idle, col), { kT, kA, kD, lv } = st;
      const t = s.t;
      ballMat.emissive.copy(col); ballMat.emissiveIntensity = 0.45 + 0.35 * lv; ballMat.color.copy(col).multiplyScalar(0.6);
      ballMat.userData.u.uEdge.value.copy(col).multiplyScalar(0.6); ballMat.userData.u.uInnerAmt.value = 0.15 + 0.25 * lv;
      ball.scale.setScalar(1 + 0.14 * kA * (0.5 + 0.5 * Math.sin(t * 12)) - 0.1 * kD);
      if (bubble) { bubble.material.userData.u.uEdge.value.copy(col); bubble.material.color.copy(col); }
      // spin (beads) + tilt; doubt wobbles the whole orbit
      const speed = 1.3 + 3.8 * kT + 1.6 * kA - 0.9 * kD;
      spin.rotation.set(0.32 * kD * Math.sin(t * 2.3), 0.5 * kT * Math.sin(t * 0.8), 0.38 * kD * Math.sin(t * 3.1 + 0.5) - 0.2 * kD);
      lineCol.copy(col).lerp(white, 0.5);
      rings.forEach((R, i) => {
        const a = t * speed * (i % 2 ? -1.15 : 1) + i * 2.1;
        R.bead.position.set(Math.cos(a) * R.R, Math.sin(a) * R.R, 0);
        R.glowM.uniforms.uC.value.copy(col); R.glowM.uniforms.uW.value.copy(lineCol); R.glowM.uniforms.uA.value = clamp(0.75 + 0.25 * lv); R.glowM.uniforms.uCore.value = clamp(0.6 + 0.4 * lv);
        R.bh.material.color.copy(col); R.bh.material.opacity = clamp(0.5 + 0.4 * lv);
        R.rg.rotation.x = R.base.x + 0.05 * Math.sin(t * 0.9 + i);
      });
      gyro.forEach((R, i) => {
        R.rg.visible = kT > 0.01; R.rg.scale.setScalar(0.5 + 0.5 * kT);
        R.rg.rotation.y = t * 1.7;
        const a = t * speed * 1.3 + 1.7; R.bead.position.set(Math.cos(a) * R.R, Math.sin(a) * R.R, 0);
        R.glowM.uniforms.uC.value.copy(col); R.glowM.uniforms.uW.value.copy(lineCol); R.glowM.uniforms.uA.value = 0.6 * kT; R.glowM.uniforms.uCore.value = kT;
        R.bh.material.color.copy(col); R.bh.material.opacity = 0.8 * kT;
      });
      // particles drift; think: they swirl, doubt: they sink
      partMat.color.copy(col).multiplyScalar(0.6); partMat.emissive.copy(col); partMat.emissiveIntensity = 0.3 + 0.3 * lv;
      parts.forEach((p, i) => {
        const a = t * (0.25 + 1.2 * kT) * (i % 2 ? 1 : -1);
        const ca = Math.cos(a), sa = Math.sin(a);
        p.m.position.set(p.base.x * ca - p.base.z * sa * 2.2 + 0.02 * Math.sin(t * 0.9 + p.ph * 2), p.base.y + 0.025 * Math.sin(t * 1.3 + p.ph) - kD * (0.06 + 0.04 * hash(i)), p.base.x * sa * 0.45 + p.base.z * ca);
      });
      sparks.forEach(q => { const tw = 0.5 + 0.5 * Math.sin(t * 3.1 + q.ph); q.sp.material.opacity = clamp((0.35 + 0.6 * tw) * (1 - 0.6 * kD) + 0.4 * kA); q.sp.scale.setScalar(q.sz * (0.5 + 0.6 * tw) * (1 + 0.6 * kA)); });
      halo.material.color.copy(col); halo.material.opacity = clamp(0.75 * Math.min(lv, 1.1) * (1 - 0.7 * kA)); halo.scale.setScalar(o.r * (4.0 + 1.0 * Math.min(lv, 1.2)));
      haloA.material.color.copy(col); haloA.material.opacity = clamp((o.addA ?? 0.2) * Math.min(lv, 1.1) + 0.45 * kA * lv); haloA.scale.setScalar(o.r * (4.5 + 2 * kA));
      haze.material.color.copy(col); haze.material.opacity = clamp((o.hazeA ?? 0.3) * Math.min(lv, 1.1) * (1 - 0.8 * kA)); haze.scale.setScalar(o.spread * 2.3);
      // aha: rings and sparkles pulse outward from the core
      bursts.forEach((b, j) => { const ph = (t * 1.5 + j * 0.5) % 1; b.material.opacity = kA * (1 - ph) * 0.85; b.scale.setScalar(kA > 0.01 ? o.r * (2.5 + 11 * ph) : 0.001); });
      stars.forEach((sp, j) => { const a = j * Math.PI / 2 + 0.6, ph = (t * 1.2 + j * 0.27) % 1; const d = o.r * (2.2 + 5 * ph); sp.position.set(Math.cos(a) * d, Math.sin(a) * d, o.r); sp.material.opacity = kA * Math.sin(ph * Math.PI); sp.scale.setScalar(kA > 0.01 ? o.r * (1.6 + 1.4 * Math.sin(ph * Math.PI)) : 0.001); });
      return st;
    },
  };
}
/** "?" (doubt) and "!" burst lines (aha) beside the head */
function makeMarks(parent, qPos, bPos, size) {
  const q = spriteOf('qmark', STATE_COL.doubt.clone().lerp(new THREE.Color('#ffffff'), 0.1), { order: 9 });
  const b = spriteOf('burst', STATE_COL.aha, { order: 9 });
  q.position.copy(qPos); b.position.copy(bPos); parent.add(q, b);
  return {
    set(s) {
      const k = sm(s.stateK), kD = s.state === 'doubt' ? k : 0, kA = s.state === 'aha' ? k : 0;
      q.material.opacity = kD; q.scale.setScalar(kD > 0.01 ? size * (0.7 + 0.3 * kD) : 0.001); q.material.rotation = 0.18 * Math.sin(s.t * 3);
      q.position.y = qPos.y + 0.03 * Math.sin(s.t * 4);
      b.material.opacity = kA * (0.75 + 0.25 * Math.sin(s.t * 11)); b.scale.setScalar(kA > 0.01 ? size * (0.8 + 0.25 * kA) : 0.001);
    },
  };
}

// ───────────────────────── arms: shoulder ring → chubby upper arm → elbow → forearm → wrist ring → mitten (IK, rebuilt every pose) ─────────────────────────
function ik2(T, L1, L2, pole) {
  const d = Math.min(L1 + L2 - 1e-4, Math.max(Math.abs(L1 - L2) + 1e-4, T.length())), dir = T.clone().normalize();
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const pp = pole.clone().addScaledVector(dir, -pole.dot(dir)); if (pp.lengthSq() < 1e-8) pp.set(0, 0, 1); pp.normalize();
  return dir.clone().multiplyScalar(a).addScaledVector(pp, h);
}
const AP = (W, P, H, T, f = 0, sh = [0, 0, 0]) => ({ W: V3(...W), P: V3(...P).normalize(), H: V3(...H).normalize(), T: V3(...T).normalize(), f, sh: V3(...sh) });   // sh: the shoulder slides on the body (side space)
function blendAP(A, B, k) {
  if (k <= 0) return A; if (k >= 1) return B;
  return { W: A.W.clone().lerp(B.W, k), P: A.P.clone().lerp(B.P, k).normalize(), H: A.H.clone().lerp(B.H, k).normalize(), T: A.T.clone().lerp(B.T, k).normalize(), f: lerp(A.f, B.f, k), sh: A.sh.clone().lerp(B.sh, k) };
}
const _m4 = new THREE.Matrix4();
function makeArm(parent, side, cfg) {
  const { L1, L2, r, hr, mat, metal } = cfg;
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(r * 1.08, L1, 4, 14), mat);
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(r * 1.04, 14, 8), mat);
  const fore = new THREE.Mesh(new THREE.CapsuleGeometry(r, L2, 4, 14), mat);
  const shRing = new THREE.Mesh(new THREE.TorusGeometry(r * 1.06, r * 0.15, 6, 26), metal);
  const wrRing = new THREE.Mesh(new THREE.TorusGeometry(r * 0.96, r * 0.13, 6, 22), metal);
  const hand = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), mat); palm.scale.set(hr * 1.0, hr * 1.1, hr * 0.88); palm.position.y = hr * 0.9; hand.add(palm);
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(hr * 0.34, hr * 0.42, 4, 10), mat); thumb.position.set(hr * 0.8, hr * 0.95, hr * 0.05); thumb.rotation.z = -0.5; hand.add(thumb);
  const finger = new THREE.Mesh(new THREE.CapsuleGeometry(hr * 0.3, hr * 0.75, 4, 10), mat); hand.add(finger);
  [upper, elbow, fore, shRing, wrRing, hand].forEach(m => parent.add(m));
  const tb = v => V3(v.x * side, v.y, v.z);
  return {
    hand,
    update(p) {
      const e = ik2(p.W, L1, L2, p.P);
      const S = cfg.S.clone().add(tb(p.sh));
      const E = tb(e).add(S), Wd = tb(e.clone().add(p.W.clone().sub(e).normalize().multiplyScalar(L2))).add(S);
      const d1 = E.clone().sub(S).normalize(), d2 = Wd.clone().sub(E).normalize();
      upper.position.copy(S).add(E).multiplyScalar(0.5); upper.quaternion.setFromUnitVectors(YA, d1);
      elbow.position.copy(E);
      fore.position.copy(E).add(Wd).multiplyScalar(0.5); fore.quaternion.setFromUnitVectors(YA, d2);
      const ax = V3(side * 0.75, -0.1, 0.2).normalize().multiplyScalar(0.6).addScaledVector(d1, 0.4).normalize();   // socket ring: mostly along the body's outward normal
      shRing.position.copy(S).addScaledVector(ax, cfg.ringOff ?? r * 0.6); shRing.quaternion.setFromUnitVectors(ZA, ax);
      wrRing.position.copy(Wd).addScaledVector(d2, r * 0.02); wrRing.quaternion.setFromUnitVectors(ZA, d2);
      // hand basis: Y along the hand, X towards the thumb
      const Hb = tb(p.H).normalize(), Tb = tb(p.T);
      const Xb = Tb.addScaledVector(Hb, -Tb.dot(Hb)); if (Xb.lengthSq() < 1e-6) Xb.set(0, 0, 1); Xb.normalize();
      const Zb = V3().crossVectors(Xb, Hb);
      hand.quaternion.setFromRotationMatrix(_m4.makeBasis(Xb, Hb, Zb));
      hand.position.copy(Wd).addScaledVector(d2, r * 0.1);
      finger.visible = p.f > 0.03; finger.scale.set(1, Math.max(0.05, p.f), 1); finger.position.set(-hr * 0.05, hr * (1.45 + 0.5 * p.f), hr * 0.05);
      palm.scale.y = hr * (1.1 - 0.12 * p.f);
    },
  };
}
/** arm pose from the CAST fields (side +1 = viewer's right: point / wave / think hand) */
function armPose(s, side, P) {
  let a = P.rest;
  a = blendAP(a, P.raise, sm(side > 0 ? s.armR : s.armL));
  if (side > 0) {
    const think = s.state === 'think' ? sm(s.stateK) : 0;
    a = blendAP(a, P.think, think * sm(clamp(s.armR / 0.45)));
    a = blendAP(a, P.point, sm(s.point));
    const w = sm(s.wave);
    if (w > 0) {
      const ph = Math.sin(s.t * 12);
      const wv = { ...P.wave, W: P.wave.W.clone().add(V3(0.035 * ph, 0, 0)), H: V3(Math.sin(0.15 + 0.38 * ph), Math.cos(0.15 + 0.38 * ph), 0.12).normalize() };
      a = blendAP(a, wv, w);
    }
  }
  return a;
}

// ───────────────────────── a glass body: (back shell) + front shell ─────────────────────────
function makeShell(parent, geo, o) {
  let back = null;
  if (o.back) { back = new THREE.Mesh(geo, glassMat({ ...o.back, transparent: true, side: THREE.BackSide, flat: o.flat, bary: o.bary })); back.renderOrder = 1; parent.add(back); }
  const front = new THREE.Mesh(geo, glassMat({ ...o.front, transparent: true, flat: o.flat, bary: o.bary }));
  front.renderOrder = 3; parent.add(front);
  const u = front.material.userData.u;
  if (o.win) { u.uWin.value.set(o.win.x, o.win.y, o.win.z, o.win.r); u.uWinA.value = o.win.a; u.uGlowR.value = o.win.gr ?? 2.5; }
  return { back, front, u };
}
/** round glass foot: a soft bun, a thin metal sole line and a metal ankle ring under the body */
function makeFoot(parent, x, z, o, M) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.sign(x) * 0.14; parent.add(g);
  const foot = new THREE.Mesh(superGeo(o.rx, o.ry, o.rz, 0.95, { ws: 24, hs: 14, taper: 0.1 }), M.limb); foot.position.y = o.ry; g.add(foot);
  const TG = new THREE.TorusGeometry(1, 0.05, 5, 32);
  const sole = new THREE.Mesh(TG, M.metal); sole.rotation.x = Math.PI / 2; sole.scale.set(o.rx * 0.8, o.rz * 0.8, o.rx * 0.8); sole.position.y = o.ry * 0.3; g.add(sole);
  const ank = new THREE.Mesh(TG, M.metal); ank.rotation.x = Math.PI / 2; ank.scale.set(o.rx * 0.86, o.rz * 0.86, o.rx * 0.7); ank.position.y = o.ry * 1.52; g.add(ank);
  return g;
}

// ───────────────────────── teacher Iris: ice-blue glass bean robot ─────────────────────────
function makeTeacher() {
  const C = { shell: '#86bbe4', edge: '#3f7bb6', limb: '#8cc0e8', limbEdge: '#4b86bf', metal: '#b4bcc8', led: '#2fd4ff', ledCore: '#c4f6ff', core: '#2ec6ff', deep: '#0567c8' };
  const M = {
    limb: glassMat({ color: C.limb, edge: C.limbEdge, edgeAmt: 0.5, edgePow: 2.0, inner: '#ffffff', innerAmt: 0.0, rimAmt: 0.8, hi: 1.0, arc: 0.5, rough: 0.1, env: 1.3, sat: 1.2 }),
    metal: metalMat(C.metal),
    dark: new THREE.MeshPhysicalMaterial({ color: '#2a3140', roughness: 0.2, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.05 }),
  };
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const shadow = makeShadow(1.9, 1.3); root.add(shadow);
  [-1, 1].forEach(sx => makeFoot(body, sx * 0.34, 0.12, { rx: 0.23, ry: 0.145, rz: 0.27 }, M));
  // the bean: head and body in one, a little wider at the top
  const BR = { rx: 0.84, ry: 0.89, rz: 0.68, e: 0.84, taper: -0.04 }, BC = 1.12;
  const shellG = new THREE.Group(); shellG.position.y = BC; body.add(shellG);
  const geo = superGeo(BR.rx, BR.ry, BR.rz, BR.e, { ws: 40, hs: 30, taper: BR.taper });
  const CP = V3(0, -0.4, 0.26);
  const shell = makeShell(shellG, geo, {
    front: { color: C.shell, a0: 0.94, a1: 0.99, edge: C.edge, edgeAmt: 0.5, edgePow: 2.0, rim: '#ffffff', rimAmt: 0.9, inner: '#ffffff', innerAmt: 0.0, hi: 1.05, arc: 0.6, rough: 0.1, env: 1.3, sat: 1.12 },
    win: { x: CP.x, y: CP.y, z: CP.z, r: 0.62, a: 0.85, gr: 2.0 },
  });
  // the visor: a patch of the same surface, a little proud of it; planar UVs over the canvas
  const VP = { cx: 0, cy: 0.26, w: 1.36, h: 0.85 };
  const face = makeFace({ W: 512, H: 320, plate: { x: 26, y: 22, w: 460, h: 270, r: 118 }, eyes: [{ x: 256 - 104, y: 140 }, { x: 256 + 104, y: 140 }], ew: 46, eh: 104, mouth: { x: 256, y: 222, w: 46, h: 46, lw: 13 }, led: C.led, ledCore: C.ledCore });
  const visor = new THREE.Mesh(superGeo(BR.rx, BR.ry, BR.rz, BR.e, { ...frontPatch(1.25, 0.95), ws: 28, hs: 18, offset: 0.01, taper: BR.taper, planar: VP }), face.mat);
  visor.renderOrder = 4; shellG.add(visor);
  // the orbital core
  const core = makeCore(shellG, { pos: CP, r: 0.14, col: C.core, deep: C.deep, bubble: 0.27, rings: [{ R: 0.46, x: 1.22, z: 0.38 }], parts: 9, spread: 0.42, sparkles: 4, seed: 1 });
  // ear discs: glass housing, metal rim, glowing ring (follows the core), light glass centre
  const earGlow = basicMat(C.led);
  const capMat = glassMat({ color: '#cdeefc', edge: '#5fb8e6', edgeAmt: 0.5, inner: '#ffffff', innerAmt: 0.15, rimAmt: 0.5, hi: 1.1, emissive: C.led, emi: 0.12 });
  const ears = [-1, 1].map(sx => {
    const g = new THREE.Group(); g.position.set(sx * 0.83, 0.17, 0.0); faceTo(g, V3(sx, 0, 0.32)); shellG.add(g);
    const house = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.15, 32), M.limb); house.rotation.x = Math.PI / 2; g.add(house);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.183, 0.034, 6, 30), M.metal); rim.position.z = 0.076; g.add(rim);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.032, 6, 30), earGlow); ring.position.z = 0.082; g.add(ring);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 8, 0, TAU, 0, Math.PI / 2), capMat); cap.rotation.x = Math.PI / 2; cap.scale.y = 0.35; cap.position.z = 0.072; g.add(cap);
    const halo = spriteOf('halo', C.led, { opacity: 0.2, order: 6 }); halo.position.z = 0.09; halo.scale.setScalar(0.36); g.add(halo);
    return { g, halo };
  });
  // top slot + a small button on the upper left of the dome
  const slot = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.09, 3, 8), M.dark); slot.rotation.z = Math.PI / 2; slot.position.set(0.02, BR.ry - 0.004, -0.04); slot.scale.z = 0.7; shellG.add(slot);
  const bp = onSurf(BR, -0.46, 0.6, -0.004);
  const btn = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), M.metal); btn.scale.set(0.045, 0.032, 0.022); btn.position.copy(bp.p); faceTo(btn, bp.n); btn.rotateZ(0.5); shellG.add(btn);
  const marks = makeMarks(shellG, V3(0.82, 0.62, 0.3), V3(-0.9, 0.5, 0.3), 0.36);
  // arms
  const armCfg = { L1: 0.18, L2: 0.16, r: 0.122, hr: 0.135, mat: M.limb, metal: M.metal };
  const arms = [-1, 1].map(sx => makeArm(body, sx, { ...armCfg, S: V3(sx * 0.76, 0.88, 0.05), ringOff: 0.08 }));
  const P = {
    rest: AP([0.17, -0.24, 0.17], [1, 0.25, -0.3], [0.2, -0.85, 0.5], [0, 0, 1]),
    raise: AP([0.14, 0.33, 0.06], [1, 0, -0.3], [0.15, 1, 0], [-1, 0, 0.3]),
    point: AP([0.36, 0.06, 0.14], [0, -1, -0.4], [1, 0.1, 0.12], [0, 1, 0.3], 1),
    wave: AP([0.31, 0.2, 0.12], [0.4, -1, 0.1], [0.12, 1, 0.12], [-1, 0, 0.25]),
    think: AP([-0.16, 0.06, 0.32], [0.6, -1, 0], [-0.6, 0.65, 0.45], [-0.2, 0, 1], 0, [-0.03, 0, 0.16]),
  };
  const height = BC + BR.ry + 0.016;   // + the top slot
  const ledC = new THREE.Color(C.led);
  return {
    // classroomScale (CAST.md): the glass teacher is wide for its height; at the clay height it filled the left quarter of the
    // classroom wide shot and was cut at the frame edge (experiment 21, lesson 4 stage 1) → 0.72
    root, height, classroomScale: 0.72,
    pose(s) {
      s = full(s);
      const t = s.t, hop = clamp(s.hop);
      root.rotation.y = s.turn * 0.5;
      body.position.y = hop * 0.5; body.rotation.z = s.tilt * 0.2;
      body.rotation.y = s.lookX * 0.16; body.rotation.x = -s.lookY * 0.06 + (s.state === 'doubt' ? 0.04 * sm(s.stateK) : 0);
      const breath = Math.sin(t * 2.1) * 0.008, sq = s.squash * 0.22;
      shellG.scale.set(1 + sq * 0.45 - breath * 0.3, 1 - sq + breath, 1 + sq * 0.45);
      shellG.position.y = BC - sq * 0.35 * BR.ry;
      shellG.rotation.z = s.state === 'doubt' ? 0.05 * sm(s.stateK) : 0;
      face.draw(s);
      const st = core.set(s);
      shell.u.uGlowC.value.copy(core.color); shell.u.uGlow.value = 1.05 * Math.min(st.lv, 1.1) - 0.3 * st.kA;
      earGlow.color.copy(core.color).lerp(ledC, 0.35 * (1 - Math.max(st.kT, st.kA, st.kD))).multiplyScalar(0.8 + 0.3 * st.lv);
      ears.forEach(e => { e.halo.material.color.copy(core.color); e.halo.material.opacity = clamp(0.12 + 0.12 * st.lv); });
      marks.set(s);
      arms.forEach((a, i) => { const side = i ? 1 : -1; a.update(armPose(s, side, P)); });
      shadow.scale.setScalar(1 - hop * 0.25); shadow.material.opacity = 1 - hop * 0.4;
    },
  };
}

// ───────────────────────── student: round lilac glass sphere ─────────────────────────
function makeStudent() {
  const C = { shell: '#9a74e6', edge: '#5a28c8', back: '#8a62dc', limb: '#ab92ea', limbEdge: '#6e48c8', metal: '#b39d78', led: '#b97cff', ledCore: '#eedcff', core: '#dd55ff', deep: '#8a12c0' };
  const M = {
    limb: glassMat({ color: C.limb, edge: C.limbEdge, edgeAmt: 0.5, edgePow: 2.0, inner: '#ffffff', innerAmt: 0.0, rimAmt: 0.85, hi: 1.0, arc: 0.5, rough: 0.1, env: 1.3, sat: 1.15 }),
    metal: metalMat(C.metal),
  };
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const shadow = makeShadow(1.9, 1.3); root.add(shadow);
  [-1, 1].forEach(sx => makeFoot(body, sx * 0.38, 0.14, { rx: 0.23, ry: 0.115, rz: 0.27 }, M));
  const BR = { rx: 0.84, ry: 0.735, rz: 0.76, e: 0.98, taper: 0.02 }, BC = 0.865;
  const shellG = new THREE.Group(); shellG.position.y = BC; body.add(shellG);
  const geo = superGeo(BR.rx, BR.ry, BR.rz, BR.e, { ws: 40, hs: 30, taper: BR.taper });
  const CP = V3(0, -0.29, 0.3);
  const shell = makeShell(shellG, geo, {
    front: { color: C.shell, a0: 0.4, a1: 0.96, edge: C.edge, edgeAmt: 0.6, edgePow: 1.7, rim: '#ffffff', rimAmt: 1.0, inner: '#f3e6ff', innerAmt: 0.0, hi: 1.2, arc: 1.2, rough: 0.08, env: 1.4, irid: 0.2, sat: 1.2 },
    back: { color: C.back, a0: 0.42, a1: 0.66, edge: C.edge, edgeAmt: 0.35, rimAmt: 0, hi: 0.25, innerAmt: 0 },
    win: { x: CP.x, y: CP.y, z: CP.z, r: 0.72, a: 0.85, gr: 2.0 },
  });
  const VP = { cx: 0, cy: 0.23, w: 0.94, h: 0.5875 };
  const face = makeFace({ W: 512, H: 320, plate: { x: 22, y: 20, w: 468, h: 282, r: 132 }, eyes: [{ x: 256 - 100, y: 136 }, { x: 256 + 100, y: 136 }], ew: 48, eh: 100, mouth: { x: 256, y: 224, w: 46, h: 48, lw: 13 }, led: C.led, ledCore: C.ledCore });
  const visor = new THREE.Mesh(superGeo(BR.rx, BR.ry, BR.rz, BR.e, { ...frontPatch(1.0, 0.85), ws: 26, hs: 18, offset: 0.01, taper: BR.taper, planar: VP }), face.mat);
  visor.renderOrder = 4; shellG.add(visor);
  const core = makeCore(shellG, { pos: CP, r: 0.125, col: C.core, deep: C.deep, rings: [{ R: 0.33, x: 1.22, z: 0.3 }, { R: 0.28, x: 1.0, z: -0.75, tube: 0.022 }], parts: 12, spread: 0.5, sparkles: 6, seed: 7, addA: 0.06, hazeA: 0.5 });
  const marks = makeMarks(shellG, V3(0.85, 0.6, 0.35), V3(-0.95, 0.45, 0.35), 0.36);
  const armCfg = { L1: 0.14, L2: 0.13, r: 0.105, hr: 0.118, mat: M.limb, metal: M.metal };
  const arms = [-1, 1].map(sx => makeArm(body, sx, { ...armCfg, S: V3(sx * 0.86, 0.74, 0.02), ringOff: 0.04 }));
  const P = {
    rest: AP([0.1, -0.25, 0.06], [1, 0.2, -0.3], [0.12, -1, 0.15], [0, 0, 1]),
    raise: AP([0.12, 0.28, 0.04], [1, 0, -0.3], [0.12, 1, 0], [-1, 0, 0.3]),
    point: AP([0.3, 0.06, 0.12], [0, -1, -0.4], [1, 0.1, 0.12], [0, 1, 0.3], 1),
    wave: AP([0.26, 0.18, 0.1], [0.4, -1, 0.1], [0.12, 1, 0.12], [-1, 0, 0.25]),
    think: AP([-0.15, 0.1, 0.27], [0.6, -1, 0], [-0.6, 0.65, 0.45], [-0.2, 0, 1], 0, [-0.08, 0.02, 0.24]),
  };
  const height = BC + BR.ry;
  return {
    root, height, classroomScale: 0.7,   // the sphere student is as wide as it is tall (same reason as the teacher)
    pose(s) {
      s = full(s);
      const t = s.t, hop = clamp(s.hop);
      root.rotation.y = s.turn * 0.5;
      body.position.y = hop * 0.55; body.rotation.z = s.tilt * 0.26;
      body.rotation.y = s.lookX * 0.18; body.rotation.x = -s.lookY * 0.07;
      const breath = Math.sin(t * 2.4 + 1) * 0.01, sq = s.squash * 0.28;
      shellG.scale.set(1 + sq * 0.45 - breath * 0.3, 1 - sq + breath, 1 + sq * 0.45);
      shellG.position.y = BC - sq * 0.3 * BR.ry;
      shellG.rotation.z = s.state === 'doubt' ? -0.07 * sm(s.stateK) : 0;
      face.draw(s);
      const st = core.set(s);
      shell.u.uGlowC.value.copy(core.color); shell.u.uGlow.value = 1.1 * Math.min(st.lv, 1.1) - 0.3 * st.kA;
      if (shell.back) { shell.back.material.color.copy(core.color).lerp(new THREE.Color(C.back), 0.7); }
      marks.set(s);
      arms.forEach((a, i) => { const side = i ? 1 : -1; a.update(armPose(s, side, P)); });
      shadow.scale.setScalar(1 - hop * 0.25); shadow.material.opacity = 1 - hop * 0.4;
    },
  };
}

// ───────────────────────── embodiment: floating faceted mint crystal ─────────────────────────
function gemGeo(R, detail, seed) {
  let g = new THREE.IcosahedronGeometry(R, detail); if (g.index) g = g.toNonIndexed();
  const p = g.attributes.position, key = (x, y, z) => Math.round(x * 1000) * 73856093 ^ Math.round(y * 1000) * 19349663 ^ Math.round(z * 1000) * 83492791;
  const jit = new Map();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = key(x, y, z);
    if (!jit.has(k)) jit.set(k, 1 + 0.065 * (hash((k % 9973) * 0.37 + seed) - 0.5) * 2);
    const f = jit.get(k); p.setXYZ(i, x * f, y * f * 1.02, z * f);
  }
  const b = []; for (let i = 0; i < p.count; i += 3) b.push(1, 0, 0, 0, 1, 0, 0, 0, 1);
  g.setAttribute('bary', new THREE.Float32BufferAttribute(b, 3));
  g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}
function makeEmbodiment() {
  const C = { shell: '#34d0a8', edge: '#078e70', back: '#22bf98', led: '#30efe0', ledCore: '#c8fff8', core: '#1fe6d2', deep: '#05867a' };
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const shadow = makeShadow(1.0, 0.7); root.add(shadow);
  // ground glow (follows the core colour)
  const gglow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), new THREE.MeshBasicMaterial({ map: texes().halo, color: C.core, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.55 }));
  gglow.rotation.x = -Math.PI / 2; gglow.position.y = 0.006; gglow.renderOrder = 0; root.add(gglow);
  const R = 0.5, CY = 0.64;
  const gem = new THREE.Group(); body.add(gem);
  const geo = gemGeo(R, 2, 3);
  const CP = V3(0, -0.15, 0.16);
  const shell = makeShell(gem, geo, {
    flat: true, bary: true,
    front: { color: C.shell, a0: 0.45, a1: 0.95, edge: C.edge, edgeAmt: 0.45, edgePow: 1.8, rim: '#ffffff', rimAmt: 0.9, inner: '#eafff9', innerAmt: 0.0, hi: 1.1, arc: 0.5, rough: 0.05, env: 1.1, irid: 0.3, line: 0.4, lineC: '#f2fffb', sat: 1.7, facet: 1.0 },
    back: { color: C.back, a0: 0.5, a1: 0.7, edge: C.edge, edgeAmt: 0.3, rimAmt: 0, hi: 0.35, innerAmt: 0, line: 0.3, lineC: '#d8fff4', sat: 1.4, facet: 0.4 },
    win: { x: CP.x, y: CP.y, z: CP.z, r: 0.48, a: 0.5, gr: 1.6 },
  });
  const VP = { cx: 0, cy: 0.15, w: 0.54, h: 0.3375 };
  const face = makeFace({ W: 512, H: 320, plate: { x: 30, y: 52, w: 452, h: 216, r: 108 }, eyes: [{ x: 256 - 94, y: 148 }, { x: 256 + 94, y: 148 }], ew: 44, eh: 92, mouth: { x: 256, y: 222, w: 42, h: 40, lw: 13 }, led: C.led, ledCore: C.ledCore });
  const visor = new THREE.Mesh(superGeo(R * 0.985, R * 0.985, R * 0.985, 1, { ...frontPatch(0.75, 0.6), ws: 22, hs: 14, planar: VP }), face.mat);
  visor.renderOrder = 4; gem.add(visor);
  const core = makeCore(gem, { pos: CP, r: 0.09, col: C.core, deep: C.deep, rings: [{ R: 0.32, x: 1.25, z: -0.42 }, { R: 0.17, x: 1.15, z: 1.15, tube: 0.017 }], parts: 6, spread: 0.3, sparkles: 4, seed: 13, addA: 0.08, hazeA: 0.45 });
  // sparkles around the gem
  const twinkles = [[-0.74, 0.34], [0.74, 0.3], [-0.68, -0.14], [0.7, -0.36], [0.56, 0.4], [-0.46, -0.5]].map(([x, y], i) => { const sp = spriteOf('star', '#ffffff', { add: true, order: 8 }); sp.position.set(x, y, 0.1); gem.add(sp); return { sp, ph: i * 1.7 }; });
  // the pointer: a small satellite that flies out to the right when pointing (the embodiment's "finger")
  const sat = new THREE.Group(); body.add(sat);
  const satMat = glassMat({ color: C.core, emissive: C.core, emi: 0.9, inner: '#ffffff', innerAmt: 0.4, hi: 1.2, transparent: true, dw: true });
  const satBall = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), satMat); satBall.renderOrder = 6; sat.add(satBall);
  const satHalo = spriteOf('halo', C.core, { opacity: 0.7, order: 8 }); satHalo.scale.setScalar(0.36); sat.add(satHalo);
  const satRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 5, 40), neonMat(C.core, { a: 0.8 })); satRing.renderOrder = 8; satRing.rotation.set(1.2, 0, 0.5, 'ZYX'); sat.add(satRing);
  const marks = makeMarks(gem, V3(0.6, 0.48, 0.3), V3(-0.66, 0.4, 0.3), 0.3);
  const trail = [0, 1, 2].map(() => { const m = spriteOf('halo', C.core, { order: 8 }); body.add(m); return m; });
  const height = CY + R * 1.02;
  return {
    root, height,
    pose(s) {
      s = full(s);
      const t = s.t, hop = clamp(s.hop), w = sm(s.wave), pt = sm(s.point), raise = Math.max(s.armL, s.armR);
      const bob = 0.035 * Math.sin(t * 2.4);
      root.rotation.y = s.turn * 0.5;
      body.position.y = CY + bob + hop * 0.35 + 0.06 * sm(raise);
      body.rotation.z = s.tilt * 0.3 + 0.04 * Math.sin(t * 1.7) + w * 0.22 * Math.sin(t * 9) - 0.18 * pt;
      gem.rotation.y = s.lookX * 0.35 + 0.15 * Math.sin(t * 0.6); gem.rotation.x = -s.lookY * 0.2;
      const sq = s.squash * 0.25; gem.scale.set(1 + sq * 0.4, 1 - sq, 1 + sq * 0.4);
      face.draw(s);
      const st = core.set(s);
      shell.u.uGlowC.value.copy(core.color); shell.u.uGlow.value = 0.7 * Math.min(st.lv, 1.1) - 0.2 * st.kA;
      twinkles.forEach(q => { const tw = 0.5 + 0.5 * Math.sin(t * 2.6 + q.ph); q.sp.material.opacity = clamp(0.25 + 0.6 * tw + 0.3 * st.kA + 0.3 * w); q.sp.scale.setScalar(0.07 + 0.08 * tw + 0.06 * (st.kA + w)); });
      // satellite: rests on the core, flies out to the viewer's right when pointing
      const target = V3(0.82, 0.03, 0.18), home = CP.clone();
      sat.position.copy(home).lerp(target, pt); sat.visible = pt > 0.02; satBall.scale.setScalar(0.4 + 0.6 * pt);
      satMat.emissive.copy(core.color); satMat.color.copy(core.color); satHalo.material.color.copy(core.color); satHalo.material.opacity = 0.8 * pt;
      satRing.material.uniforms.uC.value.copy(core.color); satRing.rotation.y = t * 2.5; satRing.scale.setScalar(Math.max(0.01, pt));
      marks.set(s);
      trail.forEach((m, i) => { const u = 1 - (i + 1) * 0.2; m.position.copy(home).lerp(target, pt * u); m.material.color.copy(core.color); m.material.opacity = 0.6 * pt * u; m.scale.setScalar(pt > 0.02 ? 0.2 * u : 0.001); });
      const h = body.position.y - CY;
      shadow.scale.setScalar(1 - h * 0.6); shadow.material.opacity = clamp(0.8 - h);
      gglow.material.color.copy(core.color); gglow.material.opacity = clamp(0.32 + 0.18 * st.lv - h * 0.5);
    },
  };
}

export async function create(env) {
  return { teacher: makeTeacher(), student: makeStudent(), embodiment: makeEmbodiment() };
}
