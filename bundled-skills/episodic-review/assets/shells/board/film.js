// film.js — renderAt(t) is a pure function of t.
// Room + cork board (shell: board, round 2) with round-1 room light: an August afternoon through venetian blinds.
import * as THREE from 'three';
import * as S from './stage.js';
import * as D from './content.js';
import { NOTEXT } from './paper.js';
import { buildWorld, introFolder, ROOM, WIN, DESK, MON } from './world.js';
import { buildBoard, OBJ, THREADS, LINKOBJ, B, CORKZ, toWorld, cardXY } from './cards.js';
import { makeScreen, drawScreen, sketch } from './screen.js';

const QP = new URLSearchParams(location.search);
const GLW = +(QP.get('w') || 1600), GLH = Math.round(GLW * 9 / 16);
const USE_DOF = QP.get('dof') !== '0';
const DBGCAM = QP.get('cam') ? QP.get('cam').split(',').map(Number) : null;
const { clamp, lerp, prog } = S;
const sm = k => k * k * (3 - 2 * k);
const ease = S.ease.inOut;
if (NOTEXT) document.body.classList.add('notext');

/* ------------------------------------------------------------------ renderer */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(GLW, GLH, false);
canvas.style.width = '1920px'; canvas.style.height = '1080px';
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = QP.get('soft') === '0' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0907);
const FOV = 32;
const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.05, 40);
const TANH = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

/* ------------------------------------------------------------------ lights */
const SUNDIR = new THREE.Vector3(0.66, -0.5, -0.12).normalize();
// the sun: a narrow, almost parallel spot that only enters through the window (slat shadows = stripes)
const sun = new THREE.SpotLight(0xffe2b4, 3.2, 0, 0.17, 0.35, 0);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.01; sun.shadow.radius = 2;
sun.shadow.camera.near = 3; sun.shadow.camera.far = 14;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xeef1fa, 0x5a4632, 0.95); scene.add(hemi);
const bounce = new THREE.DirectionalLight(0xffe9d0, 0.8); bounce.position.set(-2, 2.2, 3.5); bounce.target.position.set(0.3, 1.5, 0); scene.add(bounce, bounce.target);
// the work light on the ceiling track: aims at whatever case is being read
const work = new THREE.SpotLight(0xffdcae, 0, 0, 0.42, 0.85, 1.4);
work.castShadow = true; work.shadow.mapSize.set(1536, 1536); work.shadow.bias = -0.0005; work.shadow.normalBias = 0.01; work.shadow.camera.near = 0.4; work.shadow.camera.far = 6;
scene.add(work, work.target);
// desk lamp (warm pool on the desk), monitor glow (cool)
const deskLight = new THREE.SpotLight(0xffd29a, 0, 2.6, 0.75, 0.7, 1.8); scene.add(deskLight, deskLight.target);
const monLight = new THREE.PointLight(0x9cc4ff, 0, 1.6, 2); monLight.position.set(MON.x, MON.cy, MON.z + 0.25); scene.add(monLight);
// golden-hour sweep for the ring
const sweep = new THREE.SpotLight(0xffb066, 0, 0, 0.45, 0.8, 1.2); scene.add(sweep, sweep.target);

/* ------------------------------------------------------------------ world */
let world, folder, screenTex;
const glows = [];
function glowSprite(color, size, hard = false) {
  const tex = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    if (hard) { r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(255,255,255,.25)'); r.addColorStop(1, 'rgba(255,255,255,0)'); }
    else { r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); }
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); return c; })());
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  m.scale.setScalar(size); scene.add(m); glows.push(m); return m;
}
let gWin, gWork, gLamp, gMon;
// sun shafts: one thin sheet per gap between slats, along the sun direction
const shafts = [];
function buildShafts() {
  const N = 14, L = 3.4;
  const mat = new THREE.ShaderMaterial({
    uniforms: { op: { value: 0 }, col: { value: new THREE.Color(0xffe2b0) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform float op; uniform vec3 col; varying vec2 vUv; void main(){ float a = pow(1.-vUv.x, 1.6) * smoothstep(0.,.08,vUv.x) * smoothstep(0.,.25,vUv.y) * smoothstep(1.,.75,vUv.y); gl_FragColor = vec4(col * a * op, a * op); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  for (let i = 0; i < N; i++) {
    const y = WIN.y1 - 0.08 - i * (WIN.y1 - WIN.y0 - 0.16) / (N - 1);
    const p0 = new THREE.Vector3(WIN.x + 0.14, y, WIN.z0 + 0.03), p1 = new THREE.Vector3(WIN.x + 0.14, y, WIN.z1 - 0.03);
    const q0 = p0.clone().addScaledVector(SUNDIR, L), q1 = p1.clone().addScaledVector(SUNDIR, L);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...p0.toArray(), ...p1.toArray(), ...q1.toArray(), ...q0.toArray()], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 1, 0], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const m = new THREE.Mesh(g, mat); scene.add(m); shafts.push(m);
  }
  return mat;
}
let shaftMat;
// dust in the sunbeams and in the work light
const DUST_N = 420;
const dustGeo = new THREE.BufferGeometry(); const dustBase = new Float32Array(DUST_N * 4);
{ const r = S.rng(77); for (let i = 0; i < DUST_N * 4; i++) dustBase[i] = r(); }
dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST_N * 3), 3));
const dustMat = new THREE.PointsMaterial({ color: 0xffe9c4, size: 0.0045, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
const dust = new THREE.Points(dustGeo, dustMat); scene.add(dust);
function poseDust(t, amount) {
  const pos = dustGeo.attributes.position.array;
  for (let i = 0; i < DUST_N; i++) {
    const a = dustBase[i * 4], b = dustBase[i * 4 + 1], c = dustBase[i * 4 + 2], d = dustBase[i * 4 + 3];
    // drift through the volume between the window and the desk
    const s = ((a + t * 0.01 * (d - 0.3)) % 1 + 1) % 1 * 3.0;
    const y0 = lerp(WIN.y0 + 0.05, WIN.y1 - 0.05, b), z0 = lerp(WIN.z0 + 0.05, WIN.z1 - 0.05, c);
    const x = WIN.x + 0.15 + SUNDIR.x * s + Math.sin(t * 0.13 + i) * 0.04;
    const y = y0 + SUNDIR.y * s + Math.sin(t * 0.21 + i * 1.7) * 0.03;
    const z = z0 + SUNDIR.z * s + Math.cos(t * 0.11 + i * 0.7) * 0.04;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
  }
  dustGeo.attributes.position.needsUpdate = true; dustMat.opacity = amount;
}

/* ------------------------------------------------------------------ depth of field + grade */
let rt, rtB, post, blurMat, postScene, blurScene, postCam;
// depth of field in two passes: the blur is gathered at half resolution (a quarter of the pixels), then mixed into the
// sharp image by each pixel's circle of confusion — about a fifth of the cost of a full-resolution gather.
const COC = `
      float lin(float d){ float z = d * 2. - 1.; return 2. * near * far / (far + near - z * (far - near)); }
      float coc(vec2 uv){ float z = lin(texture2D(tDepth, uv).r); return clamp(abs(z - focus) / z * aperture, 0., maxBlur); }`;
function buildPost() {
  rt = new THREE.WebGLRenderTarget(GLW, GLH, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(GLW, GLH) });
  rtB = new THREE.WebGLRenderTarget(GLW / 2, GLH / 2, { type: THREE.HalfFloatType, depthBuffer: false });
  const U = { tColor: { value: rt.texture }, tDepth: { value: rt.depthTexture }, tBlur: { value: rtB.texture }, focus: { value: 2 }, aperture: { value: 0 }, maxBlur: { value: 9 }, near: { value: camera.near }, far: { value: camera.far }, res: { value: new THREE.Vector2(GLW, GLH) }, seed: { value: 0 }, warm: { value: 0 }, fade: { value: 1 } };
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  blurMat = new THREE.ShaderMaterial({
    uniforms: U, vertexShader: VS,
    fragmentShader: `
      uniform sampler2D tColor; uniform sampler2D tDepth; uniform float focus, aperture, maxBlur, near, far; uniform vec2 res; varying vec2 vUv;${COC}
      void main(){
        float c0 = coc(vUv);
        vec3 acc = texture2D(tColor, vUv).rgb; float wsum = 1.;
        if (c0 > 0.6) {
          for (int i = 0; i < 12; i++) {
            float a = float(i) * 2.39996; float r = sqrt((float(i) + .5) / 12.);
            vec2 o = vec2(cos(a), sin(a)) * r * c0 / res;
            float cs = coc(vUv + o);
            float w = clamp(cs / max(c0, .001), .25, 1.);
            vec3 s = texture2D(tColor, vUv + o).rgb;
            w *= 1. + dot(s, vec3(.3)) * .6;          // bright out-of-focus points bloom a little
            acc += s * w; wsum += w;
          }
        }
        gl_FragColor = vec4(acc / wsum, 1.);
      }`,
    depthTest: false, depthWrite: false,
  });
  post = new THREE.ShaderMaterial({
    uniforms: U, vertexShader: VS,
    fragmentShader: `
      uniform sampler2D tColor; uniform sampler2D tDepth; uniform sampler2D tBlur; uniform float focus, aperture, maxBlur, near, far, seed, warm, fade; uniform vec2 res; varying vec2 vUv;${COC}
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
      void main(){
        float c0 = coc(vUv);
        vec4 col = texture2D(tColor, vUv);
        if (c0 > 0.6) col.rgb = mix(col.rgb, texture2D(tBlur, vUv).rgb, smoothstep(0.6, 2.6, c0));
        // grade (one look for the whole film): warm highlights, slightly teal shadows
        float l = dot(col.rgb, vec3(.2126, .7152, .0722));
        col.rgb *= mix(vec3(.96, 1.0, 1.05), vec3(1.05, 1.0, .93) + vec3(.04, .01, -.03) * warm, smoothstep(.02, .6, l));
        vec2 q = (vUv - .5) * vec2(1.3, 1.); float vig = 1. - smoothstep(.38, .98, length(q)) * .5;
        gl_FragColor = vec4(col.rgb * vig * fade, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb += (hash(floor(vUv * res)) - .5) * .028;
      }`,
    depthTest: false, depthWrite: false, toneMapped: true,
  });
  postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene = new THREE.Scene(); postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
  blurScene = new THREE.Scene(); blurScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat));
}

/* ------------------------------------------------------------------ shots */
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const Z = D.ZONES;
const zx = z => Z[z].cx, zy = z => Z[z].cy;
function rectOf(ids, pad = 0.05) {   // board-local bounding rect of some cards
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const id of ids) { const o = OBJ[id]; const c = o.c; const [x, y] = o.base; x0 = Math.min(x0, x - c.w / 2); x1 = Math.max(x1, x + c.w / 2); y0 = Math.min(y0, y - c.h / 2); y1 = Math.max(y1, y + c.h / 2); }
  return [x0 - pad, x1 + pad, y0 - pad, y1 + pad];
}
// a shot of a board rectangle: keeps it between y 60..940 px (bottom 140 px stay free)
function Bs(rect, yaw = 0, pitch = 0.05, mul = 1) {
  const [x0, x1, y0, y1] = rect;
  const w = x1 - x0, h = y1 - y0;
  const V = Math.max(h / (880 / 1080), w / (16 / 9)) * mul;
  const d = V / 2 / TANH;
  const look = toWorld((x0 + x1) / 2, (y0 + y1) / 2 - (40 / 1080) * V, 0);
  const pos = look.clone().add(V3(Math.sin(yaw) * d, Math.sin(pitch) * d, Math.cos(yaw) * Math.cos(pitch) * d));
  return { pos, look, focus: d };
}
function Ms(zoom = 1, dx = 0, dy = 0) {   // the monitor
  const look = V3(MON.x, MON.cy, MON.z + 0.012);
  const d = 0.76 / zoom;
  const pos = look.clone().add(V3(dx, dy + 0.02, d));
  return { pos, look, focus: pos.distanceTo(look) };
}
const Wd = { pos: V3(1.55, 1.6, 4.75), look: V3(-0.75, 1.5, 0.05), focus: 4.6 };
const FOLDER = { pos: V3(-1.36, 1.22, 0.98), look: V3(-1.42, 0.77, 0.6), focus: 0.6 };
const QUIZCARD = { pos: V3(0.0, 1.5, 3.0 + 0.209), look: V3(0.0, 1.5, 3.0), focus: 0.21 };

// per-beat camera plan: [offset (s; negative = from end), shot, transition]
// A beat with a replay reads the board first, goes to the monitor at `boardEnd` (the program starts at `scrAt`),
// and comes back to the board at `postAt` when some cards go up after the replay.
let PLAN = [];
const caseShot = id => { const [x, y] = OBJ[id].base; return Bs([x - 0.62, x + 0.62, y - 0.46, y + 0.17], 0, 0.05); };
const TOPBAND = () => Bs([-2.2, 2.2, 0.22, 0.97], 0, 0.035);
const FULL = (yaw = 0, pitch = 0.04, mul = 1.02) => Bs([-2.22, 2.22, -0.95, 0.95], yaw, pitch, mul);
function planShots() {
  const R = (...ids) => rectOf(ids);
  const RK = (id, half = 0.56, up = 0) => { const [x, y] = OBJ[id].base; return [x - half, x + half, y - 0.33 + up, y + 0.47 + up]; };
  const T = D.T.beats;
  const p = (id, list) => list.forEach(([o, sh, tr]) => PLAN.push({ t: T[id].t0 + (o < 0 ? T[id].dur + o : o), sh, tr: tr ?? 1.8 }));
  const sc = (id, board, mon = Ms(1, 0, 0), post = null, more = []) => {
    const b = T[id], L = [[0, board]];
    if (b.scr) L.push([b.boardEnd - 0.2, mon, 1.6]);
    if (post) L.push([b.postAt, post, 1.8]);
    p(id, [...L, ...more]);
  };
  const rn = id => D.readNeed(D.cardText(D.byId(id)));
  p('intro', [[0, FOLDER, 0]]);
  const pn = T.pano;
  p('pano', [[0, Wd, 2.6], ...pn.stops.map(st => [st.at, caseShot(st.id), 2.0]), [pn.wideAt, FULL(0, 0.04, 1.02), 2.8]]);
  p('c1_in', [[0, Bs(R('c1.H', 'c1.ctx'), -0.12), 2.2]]);
  p('c1_grid', [[0, Bs(R('c1.H', 'c1.grid'), -0.1)]]);
  p('c1_grid2', [[0, Bs(R('c1.grid', 'c1.four'), -0.06)]]);
  p('c1_fork', [[0, Bs(R('c1.fork', 'c1.self', 'c1.ext', 'c1.four'), 0.06)]]);
  sc('c1_tree', Bs(R('c1.tree', 'c1.four'), 0.08), Ms(1, 0.03, 0));
  p('c1_which', [[0, Bs(R('c1.which', 'c1.p1', 'c1.p2', 'c1.tree'), -0.08), 2.2]]);
  p('c1_open', [[0, Bs(R('c1.open', 'c1.p2'), -0.1)]]);
  p('c1_recall', [[0, Bs(RK('c1.K'), -0.04, 0.03)]]);
  sc('c1_reveal', Bs(RK('c1.K'), -0.04, 0.03), Ms(1, -0.02, 0), null, [[-3.6, Bs(R('c1.grid', 'c1.four'), 0.02, 0.05), 2.0]]);
  p('c1_close', [[0, Bs(R('c1.pano', 'c1.verdict', 'c1.K'), 0.05)], [0.6 + rn('c1.verdict'), Bs(R('c1.pano'), 0.03, 0.02, 0.62), 2.4]]);
  p('c1_exit', [[0, Bs([-1.55, -0.4, 0.3, 0.92], 0.0, 0.05), 2.2]]);
  p('c2_in', [[0, Bs(R('c2.H', 'c2.ctx'), -0.05), 2.2]]);
  sc('c2_terms', Bs(R('c2.dTx', 'c2.dPool', 'c2.ctx'), 0.08), Ms(1, 0.02, 0));
  sc('c2_inc1', Bs(R('c2.inc1'), -0.08), Ms(1, -0.02, 0));
  sc('c2_culprit', Bs(R('c2.217', 'c2.inc1'), -0.06));
  sc('c2_pool', Bs(R('c2.formula', 'c2.two'), 0.08), Ms(1, 0.02, 0), Bs(R('c2.formula', 'c2.two'), 0.04, 0.05));
  sc('c2_inc2', Bs(R('c2.inc2', 'c2.mvccP'), 0.0));
  p('c2_recall', [[0, Bs(RK('c2.K', 0.62, 0.06), 0, 0.12), 2.2]]);
  sc('c2_reveal', Bs(RK('c2.K', 0.62, 0.06), 0, 0.12), Ms(1, 0, 0), Bs(R('c2.photo4'), 0.06, 0.02, 0.86));
  sc('c2_rule', Bs(R('c2.rule', 'c2.sql', 'c2.K'), -0.06));
  p('c2_close', [[0, Bs(R('c2.verdict', 'c2.K', 'c2.photo4'), 0.02)]]);
  p('c2_exit', [[0, Bs([0.35, 1.55, 0.3, 0.92], 0.0, 0.05), 2.2]]);
  p('c3_in', [[0, Bs(R('c3.H', 'c3.ctx', 'c3.open'), 0.06), 2.2]]);
  p('c3_case', [[0, Bs(R('c3.case', 'c3.H'), -0.06)]]);
  sc('c3_g1', Bs(R('c3.g1', 'c3.case', 'c3.g2'), -0.08), Ms(1, 0.03, 0), Bs(R('c3.rule', 'c3.open'), 0.05, 0.05, 1.15));
  sc('c3_g2', Bs(R('c3.g2', 'c3.e2', 'c3.g1'), -0.04), Ms(1, 0, 0), Bs(R('c3.e2b', 'c3.case'), -0.06), [[T.c3_g2.postAt + 3.8, Bs(R('c3.e2b', 'c3.e2', 'c3.g2'), -0.03, 0.04), 2.0]]);
  sc('c3_g3', Bs(R('c3.g3', 'c3.e3', 'c3.g2'), 0.06), Ms(1, 0.02, 0));
  sc('c3_g4', Bs(R('c3.g4', 'c3.e4', 'c3.g3'), 0.08), Ms(1, 0, 0), Bs(R('c3.e4', 'c3.g4', 'c3.g3'), 0.06));
  sc('c3_three', Bs(R('c3.three'), -0.06), Ms(1, -0.02, 0));
  p('c3_recall', [[0, Bs(RK('c3.K'), 0.02, 0.03), 2.2]]);
  p('c3_reveal', [[0, Bs(RK('c3.K'), 0.02, 0.03)]]);
  p('c3_close', [[0, Bs(R('c3.photo', 'c3.verdict'), 0.06)], [0.6 + rn('c3.verdict'), Bs(R('c3.photo'), 0.04, 0.02, 0.62), 2.4]]);
  p('c3_exit', [[0, Bs([1.0, 2.22, 0.3, 0.95], 0.05, 0.05), 2.4]]);
  const rg = T.ring;
  p('ring', [[0, FULL(0, 0.03, 1.0), 3.0], [2.0, Bs([-2.2, -1.0, 0.33, 0.97], -0.05, 0.04), 1.8], [rg.loopAt, FULL(0, 0.03, 1.0), 2.0], [rg.kbShot, Bs(R('kb'), 0, 0.04, 1.7), 1.8]]);
  p('quiz2', [[0, QUIZCARD, 1.6]]);
  p('end', [[0, FULL(0.06, 0.05, 1.08), 2.8], [3.2, Wd, 4.2]]);
  PLAN.sort((a, b) => a.t - b.t);
}
function mixShot(a, b, k) {
  return { pos: a.pos.clone().lerp(b.pos, k), look: a.look.clone().lerp(b.look, k), focus: lerp(a.focus, b.focus, k) };
}
function camAt(t) {
  let i = 0; while (i + 1 < PLAN.length && PLAN[i + 1].t <= t) i++;
  const cur = PLAN[i], prev = PLAN[Math.max(0, i - 1)];
  const k = cur.tr > 0 ? ease(clamp((t - cur.t) / cur.tr)) : 1;
  let s = i === 0 ? cur.sh : mixShot(prev.sh, cur.sh, k);
  // breathe: a slow push while holding
  const hold = Math.max(0, t - cur.t - cur.tr);
  const push = 1 - Math.min(0.035, hold * 0.004);
  const dir = s.pos.clone().sub(s.look);
  const pos = s.look.clone().add(dir.multiplyScalar(push));
  return { pos, look: s.look, focus: pos.distanceTo(s.look) };
}

/* ------------------------------------------------------------------ state over time */
const BT = D.T.beats;
const segOf = t => D.beatAt(t).seg;
function appearAt(o) {
  if (!o || !o.at) return -1;
  const b = BT[o.at]; if (!b) return -1;
  if (b.appear && o.c.id in b.appear) return b.t0 + b.appear[o.c.id];   // read one after another (content.js)
  if (o.late) return b.t0 + o.late * b.dur;
  const same = (b.cards || []).indexOf(o.c.id);
  return b.t0 + 0.5 + Math.max(0, same) * 0.55;
}
const appearOf = ref => appearAt(OBJ[ref.split('@')[0]]);
let SHKEY = '';
function poseCards(t) {
  let key = '';
  for (const id in OBJ) {
    const o = OBJ[id], c = o.c;
    const ta = appearAt(o);
    const [x, y] = o.base;
    const p = toWorld(x, y, o.dz);
    if (o.backFace) {   // face-down until its beat, then it turns over
      const f = ta < 0 ? 1 : sm(prog(t, ta, ta + 0.7));
      o.g.visible = true;
      o.g.position.set(p.x, p.y, p.z + Math.sin(f * Math.PI) * 0.05);
      o.g.rotation.set(0, (1 - f) * Math.PI, o.tilt * (f > 0.5 ? 1 : -1));
      for (const pin of o.pins) pin.visible = pin.userData.back ? f < 0.02 : f > 0.98;
      if (f > 0 && f < 1) key += id + f.toFixed(2);
      continue;
    }
    // the swap strips follow the monitor: ①②③ handed to Entra, then to Supabase Auth (④ is never covered)
    if (c.kind === 'strip') {
      const rv = BT.c1_reveal, s0 = rv.t0 + rv.scrAt;
      let s;
      if (c.id === 'c1.swapA') { s = sm(prog(t, s0 + 0.4, s0 + 1.8)); const out = s0 + 4.6; if (t > out) s = 1 + sm(prog(t, out, out + 0.9)) * 1.2; }
      else s = sm(prog(t, s0 + 5.0, s0 + 6.2));
      o.g.position.set(p.x + (1 - Math.min(1, s)) * 0.26 + Math.max(0, s - 1) * 0.3, p.y, p.z + Math.max(0, s - 1) * 0.08);
      o.g.rotation.set(0, 0, o.tilt);
      o.g.visible = s > 0.01 && s < 2.15;
      for (const pin of o.pins) pin.visible = s > 0.97 && s < 1.03;
      if (s > 0 && s < 2.2) key += id + s.toFixed(2);
      continue;
    }
    const k = ta < 0 ? 1 : sm(prog(t, ta, ta + 0.5));
    o.g.visible = k > 0.001;
    if (!o.g.visible) continue;
    o.g.position.set(p.x, p.y + (1 - k) * 0.03, p.z + (1 - k) * 0.07);
    o.g.rotation.z = o.tilt + (1 - k) * 0.08;
    o.g.rotation.y = 0;
    for (const pin of o.pins) { pin.visible = k > 0.85; pin.position.z = 0.0005 + (1 - sm(prog(t, ta + 0.4, ta + 0.6))) * 0.03; }
    if (k < 1) key += id + k.toFixed(2);
    // recall cards flip at the reveal
    if (c.kind === 'q') {
      const rv = BT[c.id.split('.')[0] + '_reveal'];
      const f = rv ? sm(prog(t, rv.t0 + 0.2, rv.t0 + 1.0)) : 0;
      o.g.rotation.y = f * Math.PI;
      o.g.position.z = p.z + Math.sin(f * Math.PI) * 0.06;
      if (f > 0 && f < 1) key += id + f.toFixed(2);
    }
  }
  return key;
}
function poseThreads(t) {
  let key = '';
  const draw = (T, t0, dur = 1.0) => { const k = sm(prog(t, t0, t0 + dur)); T.mesh.visible = k > 0.002; T.mesh.geometry.setDrawRange(0, Math.floor(T.count * k / 6) * 6); T.pa.visible = k > 0; T.pb.visible = k > 0.98; if (k > 0 && k < 1) key += k.toFixed(2); return k; };
  THREADS.forEach((T, i) => { const b = BT[T.at], [ra, rb, , rc] = D.THREADS[i]; draw(T, Math.max(b.t0 + (b.kind === 'recall' ? 0.6 : 1.2), appearOf(ra) + 0.8, appearOf(rb) + 0.8, rc ? appearOf(rc) + 0.8 + i % 3 * 0.25 : 0), 1.0); });
  for (const id in LINKOBJ) {
    const Lk = LINKOBJ[id], b = BT[Lk.L.at];
    const segs = Lk.th.segs || [Lk.th]; segs.forEach((sg, i) => draw(sg, b.t0 + 0.4 + i * (2.2 / segs.length), 2.2 / segs.length));
    const tk = sm(prog(t, b.t0 + 1.6, b.t0 + 2.2));
    Lk.tag.visible = tk > 0.01; Lk.tag.position.z = Lk.mid.z + 0.012 + (1 - tk) * 0.05; Lk.tag.material.opacity = 1;
    if (tk > 0 && tk < 1) key += id + tk.toFixed(2);
  }
  return key;
}
// where the work light points: the centre of the current case / card being read
function focusTarget(t) {
  const b = D.beatAt(t), seg = b.seg, r = t - b.t0;
  if (seg === 'pano') {   // the work light walks the three case cards, then goes back to case one
    let id = null; for (const st of b.stops) if (r >= st.at + 0.3) id = st.id;
    if (r >= b.wideAt + 0.6) id = 'c1.H';
    if (!id) return toWorld(0, 0.15);
    const [x, y] = OBJ[id].base; return toWorld(x, y - 0.1);
  }
  if (seg === 'c1' || seg === 'c2' || seg === 'c3') {
    if (b.kind === 'recall' || b.kind === 'reveal') { const o = OBJ[b.card]; return toWorld(o.base[0], o.base[1]); }
    return toWorld(zx(seg), zy(seg) + 0.05);
  }
  if (seg === 'ring') return toWorld(0, r >= b.kbShot ? 0.66 : 0.6);
  return toWorld(0, 0.2);
}
function lightsAt(t) {
  const b = D.beatAt(t), seg = b.seg;
  // recall: blinds close, room dims, only the light on the question remains
  let rc = 0;
  for (const id of ['c1_recall', 'c2_recall', 'c3_recall']) { const r = BT[id], rv = BT[id.replace('recall', 'reveal')]; rc = Math.max(rc, sm(prog(t, r.t0 + 0.1, r.t0 + 1.3)) * (1 - sm(prog(t, rv.t0 + 0.6, rv.t0 + 2.2)))); }
  const quiz = Math.max(sm(prog(t, BT.quiz2.t0 - 0.2, BT.quiz2.t0 + 1.4)) * (1 - sm(prog(t, BT.end.t0, BT.end.t0 + 1.6))), 0);
  const intro = 1 - sm(prog(t, 2.0, 7.5));
  const ring = sm(prog(t, BT.ring.t0, BT.ring.t0 + 4)) * (1 - sm(prog(t, BT.quiz2.t0 - 0.5, BT.quiz2.t0 + 0.5)));
  const endk = sm(prog(t, BT.end.t0, BT.end.t0 + 2.5));
  const panoK = sm(prog(t, BT.pano.t0 + BT.pano.stops[0].at, BT.pano.t0 + BT.pano.stops[0].at + 1.5)) * (1 - sm(prog(t, BT.c1_in.t0, BT.c1_in.t0 + 2)));
  // afternoon -> golden: the sun lowers and warms over the film
  const day = clamp(t / D.DURATION);
  const golden = Math.max(ring, endk) * 0.9 + day * 0.25;
  const wideK = Math.max(sm(prog(t, BT.pano.t0 - 1, BT.pano.t0 + 1)) * (1 - sm(prog(t, BT.c1_in.t0 - 1, BT.c1_in.t0 + 1))), endk, ring);
  const blinds = 0.78 + 0.2 * wideK - 0.74 * rc - 0.25 * intro;   // 1 = slats along the sun (open), 0 = shut
  world.slats.forEach((s, i) => { s.rotation.z = lerp(-0.62, 1.35, clamp(1 - blinds)); });
  const sunI = (1 - rc * 0.9) * (1 - intro * 0.85) * (1 - quiz) * lerp(4.2, 3.4, golden);
  sun.intensity = sunI; sun.color.setHSL(lerp(0.105, 0.075, golden), lerp(0.85, 0.95, golden), lerp(0.84, 0.72, golden));
  const sd = SUNDIR.clone(); sd.y -= golden * 0.12; sd.normalize();
  const wc = V3(WIN.x, (WIN.y0 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2);
  sun.target.position.copy(wc).addScaledVector(sd, 2); sun.position.copy(wc).addScaledVector(sd, -7);
  hemi.intensity = lerp(0.95, 0.16, Math.max(rc, intro * 0.9)) * (1 - 0.3 * panoK) * (1 - quiz * 0.6) * lerp(1, 0.85, golden) * (1 + endk * 0.35);
  bounce.intensity = 0.8 * (1 - rc * 0.85) * (1 - intro * 0.8) * (1 - quiz);
  // work light on the board
  const ft = focusTarget(t);
  const spotPos = V3(lerp(-0.6, 0.6, clamp((ft.x + 1.4) / 2.8)) * 0.5 + ft.x * 0.35, ROOM.H - 0.24, 1.05);
  work.position.copy(spotPos);
  // smooth the aim: follow a lagged target (pure function: average of targets over the last 1.6 s)
  const aim = V3(0, 0, 0); const NS = 8; for (let i = 0; i < NS; i++) aim.add(focusTarget(t - (i / NS) * 1.6)); aim.multiplyScalar(1 / NS);
  work.target.position.copy(aim);
  const onBoard = seg === 'c1' || seg === 'c2' || seg === 'c3' || seg === 'pano' || seg === 'ring' || seg === 'end';
  work.angle = lerp(0.46, 0.14, rc) * (1 - 0.38 * panoK);
  work.penumbra = lerp(0.9, 0.45, rc);
  work.intensity = (onBoard ? 1 : 0.3) * lerp(9, 22, rc) * (1 - quiz) * (1 - intro * 0.9) * (1 + 0.5 * panoK) * (1 - ring * 0.5 + endk * 0.3);
  world.spot.position.x = spotPos.x; world.spotCan.lookAt(aim);
  // desk lamp: warm pool on the desk (the intro is lit by it)
  deskLight.position.set(-1.6, 0.95, 0.5); deskLight.target.position.set(-1.38, 0.76, 0.62);
  deskLight.intensity = lerp(4, 4.2, intro) * (1 - quiz * 0.7) * (1 - rc * 0.5);
  monLight.intensity = lerp(0.35, 0.08, rc) * (1 - intro) * (1 - quiz);
  // golden sweep for the ring
  sweep.position.set(-3.0, 2.3, 2.6); sweep.target.position.set(lerp(-2.2, 2.0, sm(prog(t, BT.ring.t0, BT.ring.t0 + BT.ring.dur * 0.8))), B.cy, 0);
  sweep.intensity = ring * 40 + endk * 34;
  // glows, shafts, dust
  shaftMat.uniforms.op.value = 0.2 * (sunI / 3.4) * clamp(1 - rc * 1.2) * lerp(1, 1.3, golden);
  shaftMat.uniforms.col.value.copy(sun.color);
  gWin.material.opacity = 0.55 * (1 - rc * 0.7) * (1 - intro * 0.8) * (1 - quiz);
  gWork.material.opacity = 0.5 * clamp(work.intensity / 12);
  gLamp.material.opacity = 0.6 * (deskLight.intensity / 4);
  gMon.material.opacity = 0.1 * (1 - rc) * (1 - intro) * (1 - quiz);
  poseDust(t, 0.55 * (1 - rc * 0.8) * (1 - quiz) * (1 - intro * 0.7));
  world.blades.rotation.z = t * 11;
  world.sky.opacity = 1;
  return { rc, quiz, intro, ring, golden, endk, panoK, key: blinds.toFixed(3) + '|' + sd.y.toFixed(3) + '|' + aim.x.toFixed(2) + aim.y.toFixed(2) + work.angle.toFixed(3) };
}

/* ------------------------------------------------------------------ the monitor */
let lastScr = '';
const MONPOS = new THREE.Vector3(MON.x, MON.cy, MON.z);
function poseScreen(t, camPos) {
  const b = D.beatAt(t);
  const prog_ = b.scr || 'idle';
  const τ = t - b.t0 - (b.scrAt || 0);
  const near = camPos.distanceTo(MONPOS) < 1.4;      // far away it is small and out of focus: 4 updates a second are enough
  const k = `${b.id}|${prog_ === 'idle' ? 0 : Math.round(τ * (near ? 30 : 4))}`;
  if (k !== lastScr && !QP.has('noscr')) {
    // close up the screen fills the frame (no mipmaps needed, and building them every frame is slow); far away it needs them
    const mip = !near; if (screenTex.generateMipmaps !== mip) { screenTex.generateMipmaps = mip; screenTex.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; screenTex.anisotropy = mip ? 4 : 1; screenTex.dispose(); }
    drawScreen(prog_, τ, b.t1 - b.t0 - (b.scrAt || 0), b); lastScr = k;
  }
  const lvl = lightsAt._last || { rc: 0, quiz: 0, intro: 0 };
  world.scrMat.color.setScalar(lerp(1.0, 0.35, lvl.rc) * (1 - lvl.intro * 0.8));
}

/* ------------------------------------------------------------------ the loop (ring): four yarn legs light up behind a running dot */
let ringSegs = [], ringPts = [], ringLen = [], dotCore, dotHalo, dotTrail = [], dotLight, dimList = [], yarnMat, yarnBase, lastDim = -1;
function buildRing() {
  for (const id of D.RING) for (const sg of LINKOBJ[id].th.segs) {
    sg.mesh.material = new THREE.MeshStandardMaterial({ color: 0xa3180f, roughness: 0.7, emissive: 0xff5a28, emissiveIntensity: 0 });
    sg.glow = new THREE.Mesh(new THREE.TubeGeometry(sg.curve, 48, 0.0065, 6, false), new THREE.MeshBasicMaterial({ color: 0xff7a3a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    sg.glow.visible = false; scene.add(sg.glow);
    const pts = sg.curve.getPoints(48); sg.i0 = ringPts.length; ringPts.push(...pts); sg.i1 = ringPts.length - 1; ringSegs.push(sg);
  }
  ringLen = [0]; for (let i = 1; i < ringPts.length; i++) ringLen.push(ringLen[i - 1] + ringPts[i].distanceTo(ringPts[i - 1]));
  for (const sg of ringSegs) { sg.l0 = ringLen[sg.i0]; sg.l1 = ringLen[sg.i1]; }
  dotHalo = glowSprite(0xffa060, 0.16); dotCore = glowSprite(0xfff4dc, 0.034, true);
  for (let i = 0; i < 7; i++) dotTrail.push(glowSprite(0xff8a50, 0.06 - i * 0.005));
  dotLight = new THREE.PointLight(0xffb070, 0, 0.5, 2); scene.add(dotLight);
  yarnMat = THREADS[0].mesh.material; yarnBase = yarnMat.color.clone();
  for (const id in OBJ) { const c = OBJ[id].c; if ((c.zone || c.kind === 'cell' || c.kind === 'strip') && c.kind !== 'case') dimList.push(OBJ[id]); }
}
function ringPoint(l) {
  let lo = 0, hi = ringLen.length - 1; l = clamp(l, 0, ringLen[hi]);
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ringLen[m] < l) lo = m; else hi = m; }
  const k = (l - ringLen[lo]) / Math.max(1e-6, ringLen[hi] - ringLen[lo]);
  return ringPts[lo].clone().lerp(ringPts[hi], k);
}
function poseRing(t, L) {
  const rg = BT.ring, total = ringLen[ringLen.length - 1];
  const a = rg.t0 + rg.dotFrom, b = rg.t0 + rg.dotTo;
  const u = sm(clamp((t - a) / (b - a))), l = u * total;
  const pulse = 0.85 + 0.15 * Math.sin(t * 2.2);
  for (const sg of ringSegs) { const lit = sm(prog(l, sg.l0, sg.l1)) * pulse * (1 - L.quiz); sg.mesh.material.emissiveIntensity = lit * 1.2; sg.glow.material.opacity = lit * 0.5; sg.glow.visible = lit > 0.003; }
  const on = sm(prog(t, a - 0.4, a)) * (1 - sm(prog(t, b, b + 0.6)));
  const lift = V3(0, 0, 0.012);
  const pc = ringPoint(l).add(lift);
  dotCore.position.copy(pc); dotHalo.position.copy(pc); dotLight.position.copy(pc).add(V3(0, 0, 0.05));
  dotCore.material.opacity = on; dotHalo.material.opacity = 0.75 * on; dotLight.intensity = 0.25 * on;
  dotTrail.forEach((s, i) => { s.position.copy(ringPoint(l - (i + 1) * 0.035)).add(lift); s.material.opacity = on * 0.5 * (1 - i / dotTrail.length) * clamp(u * 12); });
  // everything that is not part of the loop steps back while it runs
  const dim = sm(prog(t, rg.t0 + 1.0, rg.t0 + 3.5)) * (1 - sm(prog(t, BT.end.t0, BT.end.t0 + 2.0)));
  const f = Math.round((1 - 0.5 * dim) * 100) / 100;
  if (f !== lastDim) { for (const o of dimList) { o.mesh.material.color.setScalar(f); if (o.back) o.back.material.color.setScalar(f); } yarnMat.color.copy(yarnBase).multiplyScalar(f); lastDim = f; }
}

/* ------------------------------------------------------------------ DOM */
const HINTS = { pool: { prog: 'c2-pool', beat: 'c2_pool', τ: 11.5 }, mut: { prog: 'c3-mut', beat: 'c3_g2', τ: 7.6 } };
let lastHint = '';
const $ = id => document.getElementById(id);
function poseDOM(t, L) {
  $('black').style.opacity = (1 - sm(prog(t, 0.0, 1.6))) .toFixed(3);
  // recall countdown
  const b = D.beatAt(t);
  const cnt = $('count');
  if (b.kind === 'recall') {
    const r = t - b.t0, c0 = b.countFrom, k = clamp((r - c0) / 6);
    cnt.style.opacity = (sm(prog(r, c0 - 0.3, c0)) * (1 - sm(prog(r, c0 + 6, c0 + 6.4)))).toFixed(3);
    $('ring').style.strokeDashoffset = (276.46 * k).toFixed(2); $('cnum').textContent = String(Math.max(1, Math.ceil((1 - k) * 6)));
  } else cnt.style.opacity = 0;
  // quiz on the index card
  const q = $('quiz');
  if (b.kind === 'quiz') {
    const r = t - b.t0, idx = D.BEAT_LIST.filter(x => x.kind === 'quiz').indexOf(b);
    q.style.opacity = '1';
    const inner = sm(prog(r, 0.15, 0.6)) * (1 - sm(prog(r, b.dur - 0.5, b.dur)));
    $('qn').textContent = D.UI.quizLabel.replace('{n}', idx + 1).replace('{of}', D.BEAT_LIST.filter(x => x.kind === 'quiz').length); $('qq').textContent = b.q; $('qa').textContent = b.a;
    $('qq').style.opacity = inner.toFixed(3); $('qn').style.opacity = inner.toFixed(3);
    const c0 = b.countFrom, k = clamp((r - c0) / 6);
    $('qring').style.strokeDashoffset = (276.46 * k).toFixed(2); $('qnum').textContent = String(Math.max(1, Math.ceil((1 - k) * 6)));
    $('qcount').style.opacity = (sm(prog(r, c0 - 0.3, c0)) * (1 - sm(prog(r, c0 + 5.7, c0 + 6.0)))).toFixed(3);
    $('qa').style.opacity = (sm(prog(r, b.ansAt, b.ansAt + 0.4)) * (1 - sm(prog(r, b.dur - 0.5, b.dur)))).toFixed(3);
    // the hint: a still of the replay this question comes from
    if (lastHint !== b.id) {
      const H = HINTS[b.hint]; const cv = $('qhint'), g = cv.getContext('2d');
      g.clearRect(0, 0, cv.width, cv.height); sketch(H.prog, H.τ, BT[H.beat], g, 0, 0, cv.width, cv.height); lastScr = '';
      $('qhcap').textContent = b.hintCap || ''; lastHint = b.id;
    }
    $('qhint').style.opacity = $('qhcap').style.opacity = inner.toFixed(3);
  } else q.style.opacity = 0;
}

/* ------------------------------------------------------------------ the quiz card on the desk */
let quizCard;
function buildQuizCard() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 600; const g = c.getContext('2d');
  g.fillStyle = '#f3ede0'; g.fillRect(0, 0, 1024, 600);
  const r = S.rng(4); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${r() < .5 ? '90,70,40' : '255,255,245'},${0.03 + r() * 0.04})`; g.fillRect(r() * 1024, r() * 600, 1 + r() * 2, 1); }
  g.strokeStyle = 'rgba(200,70,60,.45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 70); g.lineTo(1024, 70); g.stroke();
  g.strokeStyle = 'rgba(90,130,190,.18)'; g.lineWidth = 2; for (let y = 110; y < 600; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  quizCard = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.135), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: 0xf2ece0 }));
  quizCard.position.set(0, 1.5, 3.0); quizCard.visible = false; scene.add(quizCard);
}

/* ------------------------------------------------------------------ render */
let lastShadow = '';
function renderAt(t) {
  t = clamp(t, 0, D.DURATION);
  const s = camAt(t);
  if (DBGCAM) { s.pos = V3(DBGCAM[0], DBGCAM[1], DBGCAM[2]); s.look = V3(DBGCAM[3], DBGCAM[4], DBGCAM[5]); s.focus = s.pos.distanceTo(s.look); }
  camera.position.copy(s.pos); camera.lookAt(s.look); camera.updateMatrixWorld();
  const L = lightsAt(t); lightsAt._last = L;
  const k1 = poseCards(t), k2 = poseThreads(t);
  poseRing(t, L);
  // lights that are off leave the shaders (fewer lights per pixel; each combination compiles once)
  for (const l of [sweep, dotLight, monLight, deskLight]) l.visible = l.intensity > 0.002;
  poseScreen(t, s.pos);
  { const seg = D.beatAt(t).seg; const hide = s.pos.z > 3.3 && (seg === 'ring' || seg === 'pano'); world.spot.visible = world.spotCan.visible = !hide; gWork.visible = !hide; }
  poseDOM(t, L);
  // the quiz: the room is gone, only a lit index card
  const qk = L.quiz; quizCard.visible = D.beatAt(t).seg === 'quiz' || (t > BT.quiz2.t0 - 2 && t < BT.end.t0 + 1.6);
  const sk = k1 + '|' + k2 + '|' + L.key;
  if (sk !== lastShadow) { renderer.shadowMap.needsUpdate = true; lastShadow = sk; }
  if (USE_DOF) {
    renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null);
    post.uniforms.focus.value = s.focus;
    post.uniforms.seed.value = Math.floor(t * 24) % 97;
    const closeShot = s.focus < 1.0 ? 1 : 0;
    post.uniforms.aperture.value = (s.focus < 0.4 ? 9 : s.focus < 1.0 ? 22 : s.focus < 2.5 ? 26 : 14) * (GLW / 1920);
    post.uniforms.maxBlur.value = 12 * (GLW / 1920);
    post.uniforms.warm.value = L.golden;
    post.uniforms.fade.value = 1;
    renderer.setRenderTarget(rtB); renderer.render(blurScene, postCam); renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
  } else renderer.render(scene, camera);
}

window.DURATION = D.DURATION;
window.studioReady = (async () => {
  await document.fonts.ready;
  const all = D.CARDS.map(c => [c.label, c.text, c.sub, c.q, c.a, c.src, c.title, c.caption, c.dir, ...(c.lines || []), ...(c.rows || []).flat(), ...(c.rowsTxt || []).flat(), ...(c.layers || []).flat(), c.head, c.colA?.head, c.colB?.head, ...(c.colA?.cells || []), ...(c.colB?.cells || [])].filter(Boolean).join('')).join('')
    + Object.values(D.UI).join('') + D.LINKS.map(l => l.dir + l.text).join('') + JSON.stringify(D.SCREEN_TXT) + D.BEAT_LIST.map(b => (b.q || '') + (b.a || '') + (b.hintCap || '')).join('') + '0123456789。・一下你停入八判則口問喻回圖境多字定快情想懸按揭整斷是時暫曉月案比沒清理畫的筆給自裡規記論還都隨面！（），／：；？';
  for (const [fam, ws] of [['Noto Sans TC', ['400', '500', '700']], ['LXGW WenKai TC', ['400', '700']], ['Inter', ['500', '700']], ['JB Mono', ['400', '700']]])
    for (const w of ws) await document.fonts.load(`${w} 40px "${fam}"`, all);
  await document.fonts.ready;
  world = buildWorld(scene);
  folder = introFolder(world.W);
  screenTex = makeScreen(); world.scrMat.map = screenTex; world.scrMat.needsUpdate = true;
  await buildBoard(scene);
  buildQuizCard();
  buildRing();
  shaftMat = buildShafts();
  gWin = glowSprite(0xfff1d6, 2.6); gWin.position.set(WIN.x + 0.05, (WIN.y0 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2);
  gWork = glowSprite(0xffe2b0, 0.35);
  gLamp = glowSprite(0xffe0b0, 0.22); gLamp.position.set(-1.98 + 0.35 + 0.03, DESK.y + 0.17, 0.47);
  gMon = glowSprite(0x8fb8ff, 0.9); gMon.position.set(MON.x, MON.cy + 0.05, MON.z - 0.06);
  planShots();
  if (USE_DOF) buildPost();
  // keep the work light's glow on its lens
  const upd = () => { const p = new THREE.Vector3(); world.spotCan.getWorldPosition(p); gWork.position.copy(p).add(V3(0, -0.03, 0.05)); };
  const _ra = renderAt;
  window.__render = (t) => { _ra(t); };
  window.renderAt = (t) => { lightsAt(t); upd(); _ra(t); };
  window.renderAt(0);
})();
window.renderAt = () => {};
