// surfaces.js — an in-world display (monitor / whiteboard / paper) driven by a Canvas2D draw(t).
// The same canvas is (a) the WebGL texture of the plane and (b) when the camera is close, a crisp DOM
// overlay mapped onto the plane's 4 projected corners with a CSS matrix3d (so on-screen text stays sharp).
import * as THREE from 'three';
import { ndcToPx } from './lib.js';

const _v = new THREE.Vector3();

// homography that maps the unit rectangle (0,0)-(w,h) onto quad q = [[x,y]*4] (tl, tr, br, bl)
function homography(w, h, q) {
  const src = [[0, 0], [w, 0], [w, h], [0, h]];
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = q[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  // gaussian elimination
  const n = 8; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c]; if (Math.abs(d) < 1e-12) return null;
    for (let k = c; k <= n; k++) M[c][k] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const h8 = M.map(r => r[n]);
  const [a, b2, c2, d, e, f, g, hh] = h8;
  return `matrix3d(${a},${d},0,${g},${b2},${e},0,${hh},0,0,1,0,${c2},${f},0,1)`;
}

export class Surface {
  // mesh: a PlaneGeometry mesh (its geometry width/height define the quad); w,h: canvas pixels
  constructor({ w, h, draw, mesh = null, overlay = false, layer = null, name = '' }) {
    this.name = name; this.w = w; this.h = h; this.draw = draw; this.mesh = mesh;
    this.c = document.createElement('canvas'); this.c.width = w; this.c.height = h;
    this.ctx = this.c.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.key = null; this.overlay = overlay;
    if (overlay && layer) {
      this.el = this.c; // the same canvas is shown in the DOM when close
      Object.assign(this.el.style, { position: 'absolute', left: '0px', top: '0px', transformOrigin: '0 0', width: w + 'px', height: h + 'px', display: 'none' });
      this.dim = document.createElement('div');
      Object.assign(this.dim.style, { position: 'absolute', inset: '0', background: '#000', opacity: '0', pointerEvents: 'none' });
      this.wrap = document.createElement('div');
      Object.assign(this.wrap.style, { position: 'absolute', left: '0px', top: '0px', width: w + 'px', height: h + 'px', transformOrigin: '0 0', display: 'none' });
      this.el.style.display = 'block'; this.el.style.position = 'static';
      this.wrap.appendChild(this.el); this.wrap.appendChild(this.dim); layer.appendChild(this.wrap);
    }
  }
  // redraw when key changes (key = string or number; null forces redraw every call)
  update(t, key) {
    const k = key === undefined ? null : key;
    if (k !== null && k === this.key) return;
    this.key = k;
    this.ctx.save(); this.ctx.clearRect(0, 0, this.w, this.h); this.draw(this.ctx, this.w, this.h, t); this.ctx.restore();
    this.tex.needsUpdate = true;
  }
  // place the DOM overlay over the mesh; minFrac = minimum projected width fraction of 1920 to bother
  place(camera, { minFrac = 0.33, dim = 0, show = true } = {}) {
    if (!this.wrap) return false;
    if (!show || !this.mesh) { this.wrap.style.display = 'none'; return false; }
    const g = this.mesh.geometry.parameters; const hw = g.width / 2, hh = g.height / 2;
    const pts = [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]].map(([x, y]) => {
      _v.set(x, y, 0); this.mesh.localToWorld(_v); const view = _v.clone().applyMatrix4(camera.matrixWorldInverse);
      if (view.z > -0.02) return null;
      _v.project(camera); return ndcToPx(_v.x, _v.y);
    });
    if (pts.some(p => !p)) { this.wrap.style.display = 'none'; return false; }
    // the screen must actually be in the frame (a monitor far to the side still projects, with huge coordinates)
    const cx = (pts[0][0] + pts[2][0]) / 2, cy = (pts[0][1] + pts[2][1]) / 2;
    if (cx < -100 || cx > 2020 || cy < -100 || cy > 1180) { this.wrap.style.display = 'none'; return false; }
    const wpx = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
    if (wpx < minFrac * 1920) { this.wrap.style.display = 'none'; return false; }
    const m = homography(this.w, this.h, pts);
    if (!m) { this.wrap.style.display = 'none'; return false; }
    this.wrap.style.display = 'block'; this.wrap.style.transform = m;
    this.dim.style.opacity = dim.toFixed(3);
    return true;
  }
}
