/* Spitzer Castle, Beočin: a hypothetical reconstruction of its original look (rakovac.rs).
   A simplified model built from photographs of October 2026 (Konstantin Stein): proportions, the plan and the
   roof shapes are approximate; facade details are painted on. Loaded only when the viewer scrolls to it.
   Markup: <div class="m3d" data-model="spicer"><canvas></canvas> buttons [data-view] [data-rotate]</div> */
import * as THREE from '../vendor/three/three.module.min.js';
import { OrbitControls } from '../vendor/three/OrbitControls.js';

const STONE = '#efe6d2', STONE_D = '#d9ccb0', TRIM = '#f6f0e2', FRAME = '#6a2e25', GLASS1 = '#1d252c', GLASS2 = '#3c4a56';
const PL = 1.25, FL1 = 4.25;                     // floor levels from the measured elevation (ground floor, upper floor)                       // plinth top (ground floor level), first floor level

/* ---------------------------------------------------------------- textures */
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
function noise(ctx, w, h, a) {
  for (let i = 0; i < w * h / 40; i++) {
    ctx.fillStyle = `rgba(${Math.random() < .5 ? '90,80,60' : '255,255,255'},${Math.random() * a})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}
const ashlar = (base, line) => canvasTex(512, 512, (c, w, h) => {      // 512 px = 2.4 m: rows 0.6 m, blocks 1.2 m
  c.fillStyle = base; c.fillRect(0, 0, w, h); noise(c, w, h, .06);
  c.strokeStyle = line; c.lineWidth = 3;
  for (let r = 0; r < 4; r++) {
    const y = r * 128; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
    for (let x = (r % 2) * 128; x < w + 1; x += 256) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 128); c.stroke(); }
  }
}, true);
const tiles = () => canvasTex(256, 256, (c, w, h) => {
  c.fillStyle = '#7d3524'; c.fillRect(0, 0, w, h);
  for (let r = 0; r < 8; r++) for (let k = -1; k < 9; k++) {
    const x = k * 32 + (r % 2) * 16, y = r * 32;
    const g = c.createLinearGradient(0, y, 0, y + 32); g.addColorStop(0, '#a5503a'); g.addColorStop(1, '#6f2c1e');
    c.fillStyle = g; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 22); c.arc(x + 16, y + 22, 16, Math.PI, 0, true); c.lineTo(x + 32, y); c.fill();
  }
}, true);

/* windows and ornaments painted on canvas, placed as thin decals in front of the walls */
function glass(c, x, y, w, h) {
  const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, GLASS2); g.addColorStop(.6, GLASS1); g.addColorStop(1, '#4c5b66');
  c.fillStyle = g; c.fillRect(x, y, w, h);
}
function archPath(c, x, y, w, h) { const r = w / 2; c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + r); c.arc(x + r, y + r, r, Math.PI, 0); c.lineTo(x + w, y + h); c.closePath(); }
function winDraw(opt) {
  return (c, W, H) => {
    const t = Math.round(W * (opt.pair ? .06 : .1));
    c.fillStyle = TRIM; opt.arch ? (archPath(c, 0, 0, W, H), c.fill()) : c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(120,100,70,.5)'; c.lineWidth = 3; opt.arch ? (archPath(c, 2, 2, W - 4, H - 4), c.stroke()) : c.strokeRect(2, 2, W - 4, H - 4);
    const n = opt.pair ? 2 : 1, gap = opt.pair ? t * 1.2 : 0, iw = (W - 2 * t - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const x = t + i * (iw + gap), y = t, ih = H - 2 * t;
      c.save(); if (opt.arch) { archPath(c, x, y, iw, ih); c.clip(); } glass(c, x, y, iw, ih);
      c.strokeStyle = opt.frame || '#e8e2d4'; c.lineWidth = Math.max(5, iw * .07);
      if (opt.arch) { archPath(c, x, y, iw, ih); c.stroke(); } else c.strokeRect(x, y, iw, ih);
      c.beginPath(); c.moveTo(x + iw / 2, y + (opt.arch ? iw / 2 : 0)); c.lineTo(x + iw / 2, y + ih);
      const ty = y + (opt.arch ? iw / 2 : ih * .3); c.moveTo(x, ty); c.lineTo(x + iw, ty); c.stroke();
      c.lineWidth /= 2; for (const f of [.55, .78]) { c.beginPath(); c.moveTo(x, y + ih * f); c.lineTo(x + iw, y + ih * f); c.stroke(); }
      c.restore();
    }
    if (opt.head) { c.fillStyle = TRIM; c.fillRect(-4, 0, W + 8, t * .9); }
  };
}
function traceryDraw(c, W, H) {           // the great hall window: three arched lights, a rose and two small oculi
  c.fillStyle = TRIM; archPath(c, 0, 0, W, H); c.fill();
  c.strokeStyle = 'rgba(120,100,70,.55)'; c.lineWidth = 6; archPath(c, 18, 18, W - 36, H - 36); c.stroke();
  const ix = W * .07, iw = W * .86, iy = W * .07;
  c.save(); archPath(c, ix, iy, iw, H - iy - 10); c.clip(); glass(c, ix, iy, iw, H); c.restore();
  // stone tracery
  c.fillStyle = TRIM; c.strokeStyle = TRIM;
  const ly = H * .5, lh = H - ly - 12, lw = iw / 3;
  c.fillRect(ix, ly - 26, iw, 26);                                   // transom
  for (let i = 1; i < 3; i++) c.fillRect(ix + i * lw - 11, ly, 22, lh);  // mullions
  for (let i = 0; i < 3; i++) {                                      // lancet heads + iron X bars
    const x = ix + i * lw + 14, w = lw - 28;
    c.lineWidth = 14; archPath(c, x, ly + 6, w, lh); c.stroke();
    c.strokeStyle = 'rgba(30,30,30,.9)'; c.lineWidth = 5; c.beginPath();
    c.moveTo(x + 8, ly + w * .5); c.lineTo(x + w - 8, ly + lh - 10); c.moveTo(x + w - 8, ly + w * .5); c.lineTo(x + 8, ly + lh - 10); c.stroke();
    c.strokeStyle = TRIM;
  }
  const cx = W / 2, cy = H * .28, R = W * .17;
  const rose = (x, y, r, cols) => {
    c.fillStyle = TRIM; c.beginPath(); c.arc(x, y, r + 16, 0, 7); c.fill();
    for (let k = 0; k < cols.length; k++) { c.fillStyle = cols[k]; c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, k / cols.length * 6.283, (k + 1) / cols.length * 6.283); c.fill(); }
    c.strokeStyle = 'rgba(25,25,25,.9)'; c.lineWidth = 5; c.beginPath(); c.arc(x, y, r * .55, 0, 7);
    c.moveTo(x - r, y); c.lineTo(x + r, y); c.moveTo(x, y - r); c.lineTo(x, y + r); c.stroke();
  };
  rose(cx, cy, R, ['#2f5f6e', '#7a2f2a', '#c49a3a', '#2f5f6e', '#7a2f2a', '#c49a3a', '#3d6b4a', '#7a2f2a']);
  rose(W * .2, H * .2, W * .06, ['#c49a3a', '#2f5f6e', '#c49a3a', '#2f5f6e']);
  rose(W * .8, H * .2, W * .06, ['#c49a3a', '#2f5f6e', '#c49a3a', '#2f5f6e']);
  c.fillStyle = TRIM; c.beginPath(); c.arc(cx, cy + R + 10, 30, 0, 7); c.fill();       // cherub head
  c.beginPath(); c.moveTo(cx - 70, ly - 26); c.quadraticCurveTo(cx, cy + R - 10, cx + 70, ly - 26); c.fill(); // shell
  c.fillStyle = '#d8ccb2'; for (let k = -2; k <= 2; k++) { c.beginPath(); c.arc(cx + k * 22, ly - 40, 9, 0, 7); c.fill(); }
}
function gothicPairDraw(c, W, H) {          // the tall staircase window: two lights under a pointed arch with a trefoil
  const pointed = (x, y, w, h) => { c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + w * .6); c.quadraticCurveTo(x, y, x + w / 2, y); c.quadraticCurveTo(x + w, y, x + w, y + w * .6); c.lineTo(x + w, y + h); c.closePath(); };
  c.fillStyle = TRIM; pointed(0, 0, W, H); c.fill();
  c.save(); pointed(W * .08, W * .08, W * .84, H); c.clip(); glass(c, 0, 0, W, H); c.restore();
  c.fillStyle = TRIM; c.strokeStyle = TRIM; c.fillRect(W / 2 - 10, H * .3, 20, H * .7); c.fillRect(W * .08, H * .55, W * .84, 18);
  c.lineWidth = 12; pointed(W * .12, H * .3, W * .36, H * .7); c.stroke(); pointed(W * .52, H * .3, W * .36, H * .7); c.stroke();
  for (const [x, y] of [[W / 2, H * .17], [W * .4, H * .23], [W * .6, H * .23]]) { c.lineWidth = 10; c.beginPath(); c.arc(x, y, W * .08, 0, 7); c.stroke(); }
}
function friezeDraw(c, W, H) {               // garland frieze with lion masks between the floors of the right wing
  c.fillStyle = TRIM; c.fillRect(0, 0, W, H); noise(c, W, H, .08);
  c.strokeStyle = '#b9a988'; c.lineWidth = 6; c.strokeRect(3, 3, W - 6, H - 6);
  const step = W / 4;
  c.lineWidth = 12; c.strokeStyle = '#cbbd9d';
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(i * step + 30, H * .3); c.quadraticCurveTo(i * step + step / 2, H * 1.05, (i + 1) * step - 30, H * .3); c.stroke(); }
  for (let i = 1; i < 4; i++) {
    const x = i * step, y = H * .5;
    c.fillStyle = '#ddd1b5'; c.beginPath(); c.arc(x, y, H * .36, 0, 7); c.fill();
    c.fillStyle = '#8f7f62'; c.beginPath(); c.arc(x - 18, y - 8, 7, 0, 7); c.arc(x + 18, y - 8, 7, 0, 7); c.fill();
    c.beginPath(); c.arc(x, y + 30, 14, 0, 7); c.fill();
  }
}
function medallionDraw(c, W, H) {
  c.fillStyle = '#e4d9c0'; c.beginPath(); c.arc(W / 2, H / 2, W / 2 - 2, 0, 7); c.fill();
  c.strokeStyle = '#a99876'; c.lineWidth = 8; c.stroke();
  c.strokeStyle = '#9a8a6a'; c.lineWidth = 10; c.beginPath(); c.arc(W / 2, H / 2, W * .25, .4, 5.2); c.stroke();
  c.beginPath(); c.moveTo(W * .35, H * .4); c.quadraticCurveTo(W * .7, H * .2, W * .72, H * .55); c.stroke();
}
function ironDraw(c, W, H) {                 // wrought-iron winged dragon on the walls
  c.fillStyle = '#1f1b18'; c.strokeStyle = '#1f1b18'; c.lineCap = 'round';
  c.lineWidth = 16; c.beginPath(); c.moveTo(W * .5, H * .95); c.bezierCurveTo(W * .45, H * .7, W * .62, H * .55, W * .5, H * .35); c.stroke();
  for (let k = 0; k < 6; k++) {               // feathered wing
    c.lineWidth = 12 - k; c.beginPath(); c.moveTo(W * .5, H * .45);
    c.quadraticCurveTo(W * (.2 - k * .02), H * (.3 + k * .06), W * (.08 + k * .05), H * (.25 + k * .1)); c.stroke();
  }
  c.beginPath(); c.arc(W * .52, H * .3, 18, 0, 7); c.fill();
  c.lineWidth = 8; c.beginPath(); c.moveTo(W * .55, H * .3); c.lineTo(W * .78, H * .26); c.moveTo(W * .6, H * .45); c.lineTo(W * .92, H * .4); c.stroke();
  c.beginPath(); c.arc(W * .66, H * .14, 26, 2, 6); c.stroke();
}
function doorDarkArch(c, W, H) { c.fillStyle = '#2a2622'; archPath(c, 0, 0, W, H); c.fill(); }
function slitDraw(c, W, H) { c.fillStyle = TRIM; c.fillRect(0, 0, W, H); c.fillStyle = GLASS1; c.fillRect(W * .35, H * .12, W * .3, H * .76); }
function ironGlazeDraw(c, W, H) {             // winter garden glazing in the arches
  c.fillStyle = 'rgba(170,200,205,.38)'; archPath(c, 0, 0, W, H); c.fill();
  c.strokeStyle = 'rgba(30,30,30,.95)'; c.lineWidth = 5;
  archPath(c, 3, 3, W - 6, H - 6); c.stroke();
  for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(W * i / 4, W / 2 * (1 - Math.sqrt(1 - Math.pow(2 * i / 4 - 1, 2)))); c.lineTo(W * i / 4, H); c.stroke(); }
  for (let j = 1; j < 5; j++) { const y = W / 2 + (H - W / 2) * j / 5; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.beginPath(); c.arc(W / 2, W / 2, W * .22, Math.PI, 0); c.stroke();
}

/* ---------------------------------------------------------------- geometry helpers */
let scene, M;
const add = (m, parent) => { m.castShadow = m.receiveShadow = true; (parent || scene).add(m); return m; };
function box(x0, x1, y0, y1, z0, z1, mat) {      // box by extents; wall textures keep their real size (2.4 m tile)
  const w = x1 - x0, h = y1 - y0, d = z1 - z0, g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / 2.4, uv.getY(i) * dims[f][1] / 2.4); }
  const m = new THREE.Mesh(g, mat || M.wall); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return add(m);
}
/* decal on a face: face = 'n' (+z), 's' (-z), 'e' (+x), 'w' (-x); u = coordinate along the face, y = bottom */
const texCache = new Map();
function decal(draw, key, px, w, h, face, plane, u, y, mat) {
  key = `${key}|${w}|${h}`;
  let t = texCache.get(key);
  if (!t) { t = canvasTex(px, Math.round(px * h / w), draw); texCache.set(key, t); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: .8, ...(mat || {}) }));
  const o = .03;
  if (face === 'n') { m.position.set(u, y + h / 2, plane + o); }
  if (face === 's') { m.position.set(u, y + h / 2, plane - o); m.rotation.y = Math.PI; }
  if (face === 'e') { m.position.set(plane + o, y + h / 2, u); m.rotation.y = Math.PI / 2; }
  if (face === 'w') { m.position.set(plane - o, y + h / 2, u); m.rotation.y = -Math.PI / 2; }
  m.receiveShadow = true; scene.add(m); return m;
}
const W1 = winDraw({}), WA = winDraw({ arch: true, frame: FRAME }), WP = winDraw({ pair: true }), WH = winDraw({ head: true });
function hipRoof(x0, x1, z0, z1, y, h) {
  const w = x1 - x0, d = z1 - z0, r = Math.min(w, d) / 2, along = w >= d;
  const p = along ? [[x0 + r, z0 + d / 2], [x1 - r, z0 + d / 2]] : [[x0 + w / 2, z0 + r], [x0 + w / 2, z1 - r]];
  const A = [x0, y, z0], B = [x1, y, z0], C = [x1, y, z1], D = [x0, y, z1], P = [p[0][0], y + h, p[0][1]], Q = [p[1][0], y + h, p[1][1]];
  const tris = along ? [[A, B, Q], [A, Q, P], [C, D, P], [C, P, Q], [B, C, Q], [D, A, P]]
                     : [[A, B, P], [B, C, Q], [B, Q, P], [C, D, Q], [D, A, P], [D, P, Q]];
  const pos = [], uv = [];
  for (const t of tris) for (const v of t) { pos.push(...v); uv.push((v[0] + v[2]) / 1.6, v[1] / 0.8); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  const m = add(new THREE.Mesh(g, M.roof)); m.material.side = THREE.DoubleSide; return m;
}
function cornice(x0, x1, z0, z1, y, out = .35, h = .45) {
  box(x0 - out, x1 + out, y - h, y, z0 - out, z1 + out, M.trim);
  box(x0 - out * .5, x1 + out * .5, y - h - .25, y - h, z0 - out * .5, z1 + out * .5, M.trim);
}
function arcadeWall(len, h, arches, depth) {    // a wall with round-arched openings (in its own XY plane)
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(len, 0); s.lineTo(len, h); s.lineTo(0, h); s.lineTo(0, 0);
  for (const a of arches) {
    const p = new THREE.Path(), r = a.w / 2; p.moveTo(a.x - r, a.y0); p.lineTo(a.x + r, a.y0); p.lineTo(a.x + r, a.spring);
    p.absarc(a.x, a.spring, r, 0, Math.PI, false); p.lineTo(a.x - r, a.y0); s.holes.push(p);
  }
  return new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }), M.wallX);
}
function balustrade(x0, z0, x1, z1, y, h = 1) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.floor(len / .32)), ang = Math.atan2(z1 - z0, x1 - x0);
  const g = new THREE.LatheGeometry([[.0, 0], [.11, 0], [.11, .08], [.06, .15], [.13, .35], [.06, .62], [.09, .7], [.0, .7]].map(p => new THREE.Vector2(p[0], p[1] * (h - .22) / .7)), 10);
  const im = new THREE.InstancedMesh(g, M.trim, n), o = new THREE.Object3D();
  for (let i = 0; i < n; i++) { const f = (i + .5) / n; o.position.set(x0 + (x1 - x0) * f, y + .1, z0 + (z1 - z0) * f); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
  add(im);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(len + .2, .14, .32), M.trim); rail.position.set((x0 + x1) / 2, y + h - .07, (z0 + z1) / 2); rail.rotation.y = -ang; add(rail);
  const base = rail.clone(); base.position.y = y + .05; add(base);
}
function column(x, z, y0, y1, r = .2) {
  add(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, y1 - y0 - .6, 16), M.trim)).position.set(x, (y0 + y1 - .3) / 2 + .15, z);
  add(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.9, r * 1.1, .45, 16), M.trim)).position.set(x, y1 - .22, z);    // capital
  add(new THREE.Mesh(new THREE.BoxGeometry(r * 3.6, .12, r * 3.6), M.trim)).position.set(x, y1 - .02, z);
  add(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.5, r * 1.7, .3, 16), M.trim)).position.set(x, y0 + .15, z);
}
function stairs(xStart, xDir, z0, z1, n, rise, run) {
  for (let i = 0; i < n; i++) { const top = PL - i * rise, x = xStart + xDir * i * run; box(Math.min(x, x + xDir * run), Math.max(x, x + xDir * run), 0, top - rise + .02, z0, z1, M.plinth); }
}

/* ---------------------------------------------------------------- the castle */
function turul(x, y, z, rotY) {                 // bronze turul with raised wings, on top of the rear gable
  const g = new THREE.Group(), mat = M.bronze;
  const body = new THREE.Mesh(new THREE.SphereGeometry(.42, 20, 14), mat); body.scale.set(.75, 1.25, .8); body.position.y = .5; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.2, 14, 10), mat); head.position.set(0, 1.05, .22); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.08, .28, 8), mat); beak.rotation.x = Math.PI / 2.3; beak.position.set(0, 1.0, .45); g.add(beak);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(.28, .7, 6), mat); tail.position.set(0, .05, -.35); tail.rotation.x = -2.5; g.add(tail);
  const ws = new THREE.Shape(); ws.moveTo(0, .1); ws.quadraticCurveTo(.7, .7, 1.45, 1.75);       // leading edge up to the tip
  const tr = [[1.62, 1.35], [1.62, .95], [1.45, .6], [1.15, .3], [.75, .08], [.3, -.12]];    // broad feathered trailing edge
  let px = 1.45, py = 1.75;
  for (const [x, y] of tr) { ws.lineTo((px + x) / 2 + .14, (py + y) / 2 + .04); ws.lineTo(x, y); px = x; py = y; }
  ws.lineTo(0, -.1); ws.lineTo(0, .1);
  for (const s of [1, -1]) {
    const w = new THREE.Mesh(new THREE.ExtrudeGeometry(ws, { depth: .06, bevelEnabled: false }), mat);
    w.position.set(s * .18, .62, -.05); w.scale.set(s * 1.1, 1.1, 1); w.rotation.y = s * .3; g.add(w);
  }
  g.position.set(x, y, z); g.rotation.y = rotY; g.traverse(o => { o.castShadow = true; }); scene.add(g);
}
function flemishGable(x0, x1, z, y, depth, dir, k = 1) { // curved baroque gable over the rear bay (k: vertical scale)
  const w = x1 - x0, s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, .5);
  s.bezierCurveTo(w - .2, 1.6, w - 1.6, 1.4, w - 1.5, 2.4); s.lineTo(w - 1.5, 2.9);
  s.bezierCurveTo(w - 2.0, 3.2, w / 2 + .5, 3.5, w / 2 + .45, 3.9); s.lineTo(w / 2 - .45, 3.9);
  s.bezierCurveTo(w / 2 - .5, 3.5, 2.0, 3.2, 1.5, 2.9); s.lineTo(1.5, 2.4);
  s.bezierCurveTo(1.6, 1.4, .2, 1.6, 0, .5); s.lineTo(0, 0);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 2 }), M.wallX);
  m.scale.y = k; m.position.set(x0, y, dir > 0 ? z - depth : z); add(m);
  box(x0 + w / 2 - .6, x0 + w / 2 + .6, y + 3.9 * k, y + 3.9 * k + .25, z - depth - .1, z + .1, M.trim);
  for (const ux of [x0 + 1.55, x1 - 1.55]) {                  // small urns on the shoulders
    const urn = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.22, 0], [.12, .15], [.26, .4], [.12, .6], [0, .62]].map(p => new THREE.Vector2(p[0], p[1])), 12), M.trim);
    urn.position.set(ux, y + 2.9 * k, z - depth / 2); add(urn);
  }
  return y + 3.9 * k + .25;
}
function chimney(x, z, y0, y1) {
  box(x - .45, x + .45, y0, y1, z - .45, z + .45, M.wall);
  box(x - .6, x + .6, y1, y1 + .25, z - .6, z + .6, M.trim);
  add(new THREE.Mesh(new THREE.ConeGeometry(.5, 1.0, 4), M.trim)).position.set(x, y1 + .75, z);
  for (const [dx, dz] of [[-.45, -.45], [.45, -.45], [-.45, .45], [.45, .45]]) add(new THREE.Mesh(new THREE.ConeGeometry(.1, .55, 6), M.trim)).position.set(x + dx, y1 + .5, z + dz);
}
function tree(x, z, s = 1, col = '#5f7d3a') {
  add(new THREE.Mesh(new THREE.CylinderGeometry(.35 * s, .5 * s, 6 * s, 8), M.bark)).position.set(x, 3 * s, z);
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 1 });
  for (const [dx, dy, dz, r] of [[0, 8, 0, 3.6], [2.2, 7, 1, 2.8], [-2.1, 7.3, -.8, 2.9], [.5, 9.6, -.5, 2.6], [-.8, 6.6, 2, 2.4]])
    add(new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), mat)).position.set(x + dx * s, dy * s, z + dz * s);
}


/* ---------------------------------------------------------------- shapes added from the measured north elevation */
function truncRoof(x0, x1, z0, z1, y, h, i) {     // steep hip roof with a flat top, inset i on every side
  const A = [x0, y, z0], B = [x1, y, z0], C = [x1, y, z1], D = [x0, y, z1];
  const a = [x0 + i, y + h, z0 + i], b = [x1 - i, y + h, z0 + i], c = [x1 - i, y + h, z1 - i], d = [x0 + i, y + h, z1 - i];
  const tris = [[A, B, b], [A, b, a], [B, C, c], [B, c, b], [C, D, d], [C, d, c], [D, A, a], [D, a, d], [a, b, c], [a, c, d]];
  const pos = [], uv = [];
  for (const t of tris) for (const v of t) { pos.push(...v); uv.push((v[0] + v[2]) / 1.6, v[1] / 0.8); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  const m = add(new THREE.Mesh(g, M.roof)); m.material.side = THREE.DoubleSide; return m;
}
function crest(x0, x1, y, z) {                     // iron cresting along a ridge
  add(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, .05, .05), M.iron)).position.set((x0 + x1) / 2, y + .12, z);
  for (let x = x0; x <= x1 + .01; x += .32) add(new THREE.Mesh(new THREE.ConeGeometry(.035, .38, 4), M.iron)).position.set(x, y + .19, z);
}
function finial(x, y, z, h) {
  add(new THREE.Mesh(new THREE.CylinderGeometry(.04, .07, h, 6), M.iron)).position.set(x, y + h / 2, z);
  add(new THREE.Mesh(new THREE.SphereGeometry(.1, 10, 8), M.iron)).position.set(x, y + h * .55, z);
}
function onion(x, y, z) {                          // onion dome on the corner turret of the hall, with a spire
  const prof = [[0, 0], [.5, 0], [.55, .12], [.82, .42], [.88, .62], [.78, .86], [.48, 1.12], [.2, 1.32], [.09, 1.5], [0, 1.55]];
  add(new THREE.Mesh(new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), 24), M.zinc)).position.set(x, y, z);
  finial(x, y + 1.5, z, 2.4);
}
function chimney2(x, z, y0, y1) {                 // tall ornate chimney with a pedimented cap
  box(x - .36, x + .36, y0, y1, z - .36, z + .36, M.wall);
  box(x - .45, x + .45, y1 - 1.0, y1 - .85, z - .45, z + .45, M.trim);
  box(x - .5, x + .5, y1, y1 + .18, z - .5, z + .5, M.trim);
  const sh = new THREE.Shape(); sh.moveTo(-.5, 0); sh.lineTo(.5, 0); sh.lineTo(0, .42); sh.lineTo(-.5, 0);
  for (const r of [0, Math.PI / 2]) {
    const m = add(new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .2, bevelEnabled: false }), M.trim));
    m.rotation.y = r; m.position.set(x + (r ? -.1 : 0), y1 + .18, z + (r ? 0 : -.1));
  }
  for (const [dx, dz] of [[-.4, -.4], [.4, -.4], [-.4, .4], [.4, .4]]) add(new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), M.trim)).position.set(x + dx, y1 + .27, z + dz);
  add(new THREE.Mesh(new THREE.ConeGeometry(.1, .35, 6), M.trim)).position.set(x, y1 + .75, z);
}
function dormer(x, zf, y0, w, h, pointed) {        // small dormer on a north roof slope, front face at z = zf
  box(x - w / 2, x + w / 2, y0, y0 + h, zf - 1.4, zf, M.wall);
  decal(W1, 'w1', 256, w * .62, h * .62, 'n', zf, x, y0 + h * .18);
  if (pointed) { const c = add(new THREE.Mesh(new THREE.ConeGeometry(w * .74, h * 1.1, 4), M.roof)); c.position.set(x, y0 + h + h * .55, zf - .7); c.rotation.y = Math.PI / 4; }
  else box(x - w / 2 - .12, x + w / 2 + .12, y0 + h, y0 + h + .16, zf - 1.5, zf + .12, M.trim);
}
function pointedPath(c, x, y, w, h) { c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + w * .62); c.quadraticCurveTo(x, y, x + w / 2, y); c.quadraticCurveTo(x + w, y, x + w, y + w * .62); c.lineTo(x + w, y + h); c.closePath(); }
function portalDraw(c, W, H) {                     // gothic entrance portal of the porch: pointed arch, double door
  c.fillStyle = TRIM; pointedPath(c, 0, 0, W, H); c.fill();
  c.strokeStyle = 'rgba(120,100,70,.6)'; c.lineWidth = 6; pointedPath(c, 10, 10, W - 20, H - 10); c.stroke();
  const dx = W * .14, dw = W * .72; c.fillStyle = '#6b5a45'; pointedPath(c, dx, W * .12, dw, H); c.fill();
  c.strokeStyle = '#3d3226'; c.lineWidth = 5; c.beginPath(); c.moveTo(W / 2, W * .3); c.lineTo(W / 2, H); c.stroke();
  for (const f of [.45, .62, .8]) { c.beginPath(); c.moveTo(dx, H * f); c.lineTo(dx + dw, H * f); c.stroke(); }
  c.fillStyle = '#cdbf9e'; for (const ox of [W * .33, W * .67]) { c.beginPath(); c.arc(ox, H * .53, W * .06, 0, 7); c.fill(); }
}
function wgFrontDraw(c, W, H) {                    // the great arch of the winter garden: lunette, door between two windows
  glass(c, 0, 0, W, H); const r = W / 2;
  c.strokeStyle = TRIM; c.lineWidth = 12; archPath(c, 4, 4, W - 8, H - 4); c.stroke();
  c.beginPath(); c.moveTo(0, r); c.lineTo(W, r); c.stroke();
  for (const f of [.34, .66]) { c.beginPath(); c.moveTo(W * f, r * (1 - Math.sqrt(1 - Math.pow(2 * f - 1, 2)))); c.lineTo(W * f, H); c.stroke(); }
  c.strokeStyle = 'rgba(25,30,35,.9)'; c.lineWidth = 3;                      // diamond leading in the glazing
  for (let k = -H; k < W + H; k += 26) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + H, H); c.stroke(); c.beginPath(); c.moveTo(k, H); c.lineTo(k + H, 0); c.stroke(); }
  c.fillStyle = '#d8cfbd'; c.fillRect(W * .37, H * .52, W * .26, H * .48);    // the door
  c.strokeStyle = '#8f8270'; c.lineWidth = 4; c.strokeRect(W * .39, H * .55, W * .22, H * .43);
  c.beginPath(); c.moveTo(W / 2, H * .55); c.lineTo(W / 2, H); c.stroke();
  c.fillStyle = TRIM; c.fillRect(0, H * .5, W, 10);
}

function build() {
  const wallT = ashlar(STONE, 'rgba(150,130,100,.45)');
  const wallTX = wallT.clone(); wallTX.repeat.set(1 / 2.4, 1 / 2.4); wallTX.needsUpdate = true;
  const plinthT = ashlar(STONE_D, 'rgba(110,95,70,.5)');
  M = {
    wall: new THREE.MeshStandardMaterial({ map: wallT, roughness: .9 }),
    wallX: new THREE.MeshStandardMaterial({ map: wallTX, roughness: .9 }),
    plinth: new THREE.MeshStandardMaterial({ map: plinthT, roughness: .95 }),
    trim: new THREE.MeshStandardMaterial({ color: TRIM, roughness: .75 }),
    roof: new THREE.MeshStandardMaterial({ map: tiles(), roughness: .85 }),
    bronze: new THREE.MeshStandardMaterial({ color: '#5d5544', metalness: .25, roughness: .55 }),
    iron: new THREE.MeshStandardMaterial({ color: '#1d1c1a', metalness: .6, roughness: .5 }),
    glassRoof: new THREE.MeshStandardMaterial({ color: '#b9d3d6', transparent: true, opacity: .35, roughness: .1, metalness: .2, side: THREE.DoubleSide, depthWrite: false }),
    bark: new THREE.MeshStandardMaterial({ color: '#8a8270', roughness: 1 }),
    dark: new THREE.MeshStandardMaterial({ color: '#5a5045', roughness: 1 }),
    zinc: new THREE.MeshStandardMaterial({ color: '#7f8d96', metalness: .5, roughness: .4 }),
  };
  M.roof.map.repeat.set(1, 1);

  /* Footprint from the ground- and first-floor plans in Radosavljević (FTN Novi Sad, 2019), read at about
     40 px = 1 m. The plans are drawn with north at the bottom, so here z = 0 is the north (entrance) front, the service
     rooms lie to the south, -x is east (winter garden) and +x is west (the turul end). */

  /* ground, forecourt, fountain, park trees */
  const ground = add(new THREE.Mesh(new THREE.CircleGeometry(420, 64), new THREE.MeshStandardMaterial({ color: '#7d9550', roughness: 1 })));
  ground.rotation.x = -Math.PI / 2;
  const court = add(new THREE.Mesh(new THREE.PlaneGeometry(40, 14), new THREE.MeshStandardMaterial({ color: '#cdbf9c', roughness: 1 })));
  court.rotation.x = -Math.PI / 2; court.position.set(-2, .02, 9);
  const basin = add(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.7, .6, 40), M.plinth)); basin.position.set(-.5, .3, 11.5);
  const water = add(new THREE.Mesh(new THREE.CylinderGeometry(2.38, 2.38, .1, 40), new THREE.MeshStandardMaterial({ color: '#5c8590', roughness: .15, metalness: .3 }))); water.position.set(-.5, .58, 11.5);
  add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.32, 0], [.16, .85], [.8, 1.12], [.85, 1.22], [0, 1.27]].map(p => new THREE.Vector2(p[0], p[1])), 20), M.trim)).position.set(-.5, .5, 11.5);
  for (const [x, z, s] of [[-30, 18, 1.15], [22, 20, 1.1], [-32, -30, 1], [26, -32, 1.2], [40, -20, 1], [-45, -15, .9], [-12, -42, 1.15]]) tree(x, z, s);
  for (const [x, z] of [[-20, 15], [-11, 17], [9, 17], [17, 15]]) tree(x, z, .45, '#4f6b33');

  /* Heights from the measured north elevation published by dvorcisrbije.rs (source not named), read at about
     36 px = 1 m (the widths of the plan and the elevation agree at that scale): centre cornice 7.35 m, hall 8.9 m,
     right wing attic 8.5 m, ridges about 13 m. */
  const ZS = -15.4, EC = 7.35, EH = 8.9, ER = 8.5;
  const WIN = 2.1, WUP = 1.9;                                       // ground- and upper-floor window heights

  /* the great hall, double-height, with the tracery window, a corner turret with an onion dome and a steep roof */
  box(-9.5, -3.75, 0, PL, ZS, 0, M.plinth); box(-9.5, -3.75, PL, EH, ZS, 0);
  cornice(-9.5, -3.75, ZS, 0, EH);
  box(-9.7, -3.55, FL1 - .25, FL1, ZS - .2, .2, M.trim);
  hipRoof(-9.9, -3.35, -6.15, .4, EH, 3.9); finial(-6.62, EH + 3.9, -2.88, 1.1);
  hipRoof(-9.9, -3.35, ZS - .4, -5.6, EH, 3.6);
  decal(traceryDraw, 'tracery', 1024, 3.3, 4.2, 'n', 0, -6.5, 4.3);
  dormer(-6.6, -.15, 9.6, .8, .9, true);
  for (const z of [-6.2]) decal(W1, 'w1', 256, 1.1, WUP, 'w', -9.5, z, FL1 + .6);
  for (const z of [-11.8, -14]) { decal(W1, 'w1', 256, 1.1, WIN, 'w', -9.5, z, PL + .1); decal(W1, 'w1', 256, 1.1, WUP, 'w', -9.5, z, FL1 + .6); }
  decal(gothicPairDraw, 'goth', 512, 2.0, 3.6, 's', ZS, -4.8, FL1 + .3);             // staircase window
  for (const x of [-8.2, -6.6]) decal(W1, 'w1', 256, .9, 1.7, 's', ZS, x, PL + .3);
  // corner turret (north-east corner of the hall)
  box(-9.95, -8.6, 0, PL, -1.2, .2, M.plinth); box(-9.95, -8.6, PL, 10.15, -1.2, .2);
  box(-10.1, -8.45, 10.0, 10.3, -1.35, .35, M.trim); box(-10.05, -8.5, EH - .3, EH, -1.3, .3, M.trim);
  onion(-9.27, 10.3, -.5);
  decal(ironDraw, 'iron', 256, 1.3, 1.5, 'n', .2, -9.27, 7.3);
  chimney2(-8.6, -3.4, EH, 13.4);

  /* in front of the hall: a low vestibule under a lean-to roof and the gabled gothic entrance porch */
  box(-9.0, -6.2, 0, 2.9, 0, 2.4);
  box(-9.1, -6.1, 2.75, 2.95, -.05, 2.5, M.trim);
  { const L = Math.hypot(2.7, 1.25), r = add(new THREE.Mesh(new THREE.BoxGeometry(3.05, .14, L), M.roof));
    r.rotation.x = Math.atan2(1.25, 2.7); r.position.set(-7.6, 3.55, 1.3); }
  for (const x of [-7.95, -7.25]) decal(WA, 'wa', 256, .5, 1.1, 'n', 2.4, x, 1.0);
  box(-6.2, -3.9, 0, 2.9, 0, 2.6);
  { const sh = new THREE.Shape(); sh.moveTo(-1.3, 0); sh.lineTo(1.3, 0); sh.lineTo(0, 1.55); sh.lineTo(-1.3, 0);
    const g = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 2.75, bevelEnabled: false }), [M.wallX, M.roof]);
    g.position.set(-5.05, 2.9, -.1); add(g);
    const tr = new THREE.Shape(); tr.moveTo(-1.42, -.05); tr.lineTo(0, 1.7); tr.lineTo(1.42, -.05); tr.lineTo(1.2, -.05); tr.lineTo(0, 1.42); tr.lineTo(-1.2, -.05);
    add(new THREE.Mesh(new THREE.ExtrudeGeometry(tr, { depth: .2, bevelEnabled: false }), M.trim)).position.set(-5.05, 2.9, 2.62); }
  decal(portalDraw, 'portal', 256, 1.55, 2.2, 'n', 2.6, -5.05, .55);
  decal(medallionDraw, 'med', 128, .45, .45, 'n', 2.62, -5.05, 3.35);
  for (const x of [-6.2, -3.9]) { box(x - .17, x + .17, 0, 3.25, 2.45, 2.79, M.trim); add(new THREE.Mesh(new THREE.ConeGeometry(.2, .6, 4), M.trim)).position.set(x, 3.55, 2.62); }
  for (let i = 0; i < 3; i++) box(-5.75 - i * .15, -4.35 + i * .15, 0, .55 - i * .18, 2.6 + i * .3, 2.9 + i * .3, M.plinth);

  /* centre: arcaded loggia on the ground floor, a terrace above it, the upper floor set back, a tall roof with dormers */
  box(-3.75, 3.4, 0, PL, ZS, 0, M.plinth); box(-3.75, 3.4, PL, EC, ZS, -2.6);
  cornice(-3.75, 3.4, ZS, -2.6, EC);
  const arcs = [-2.55, -.17, 2.2].map(x => ({ x: x + 3.75, w: 1.75, y0: PL, spring: 2.95 }));
  const arc = arcadeWall(7.15, FL1, arcs, .5); arc.position.set(-3.75, 0, -.5); add(arc);
  box(-3.75, 3.4, FL1, FL1 + .3, -2.6, .25, M.trim);
  for (const x of [-3.45, -1.36, 1.02, 3.1]) column(x, .3, PL, 3.0, .16);
  balustrade(-3.7, .1, 3.35, .1, FL1 + .3, .8);
  for (const x of [-1.3, 1.0]) add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.2, 0], [.1, .12], [.24, .35], [.1, .55], [0, .58]].map(p => new THREE.Vector2(p[0], p[1])), 12), M.trim)).position.set(x, FL1 + 1.1, .1);
  for (const x of [-2.55, -.17, 2.2]) decal(WA, 'wa', 256, 1.35, 2.0, 'n', -2.6, x, PL + .05);
  for (const x of [-2.4, -.17, 2.05]) decal(WH, 'wh', 256, 1.25, WUP, 'n', -2.6, x, FL1 + .6);
  for (const x of [-2.2, 1.6]) decal(W1, 'w1', 256, .9, 1.7, 's', ZS, x, PL + .3);
  for (const x of [-2.2, -.2, 1.6]) decal(W1, 'w1', 256, 1.1, WUP, 's', ZS, x, FL1 + .6);
  // one tall roof with a flat top runs over the centre and the right wing (as in the elevation), with cresting
  truncRoof(-4.15, 10.4, ZS - .4, -2.2, EC, 5.65, 3.2);
  crest(-.95, 7.2, EC + 5.65, -5.4);
  for (const x of [-2.55, -.2, 2.3]) dormer(x, -3.25, 9.05, .95, .75, false);

  /* the curved double stair in front of the loggia: two flights rising round a solid core */
  const sc = { x: -.17, r0: 1.25, r1: 2.6 }, nst = 7;
  add(new THREE.Mesh(new THREE.CylinderGeometry(sc.r0, sc.r0, PL, 32, 1, false, -Math.PI / 2, Math.PI), M.plinth)).position.set(sc.x, PL / 2, 0);
  for (const side of [1, -1]) for (let i = 0; i < nst; i++) {      // lowest step at the front, highest at the facade
    const len = Math.PI / 2 / nst, t0 = side > 0 ? -Math.PI / 2 + i * len : -Math.PI / 2 - (i + 1) * len, sh = new THREE.Shape();
    sh.moveTo(sc.r0 * Math.cos(t0), sc.r0 * Math.sin(t0));
    for (let k = 0; k <= 6; k++) { const t = t0 + len * k / 6; sh.lineTo(sc.r1 * Math.cos(t), sc.r1 * Math.sin(t)); }
    for (let k = 6; k >= 0; k--) { const t = t0 + len * k / 6; sh.lineTo(sc.r0 * Math.cos(t), sc.r0 * Math.sin(t)); }
    const m = add(new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: PL * (i + 1) / nst, bevelEnabled: false }), M.plinth));
    m.rotation.x = -Math.PI / 2; m.position.set(sc.x, 0, 0);
  }
  decal(doorDarkArch, 'dark', 128, .9, .8, 'n', sc.r0, sc.x, 0);
  balustrade(sc.x - 1.2, 1.3, sc.x + 1.0, 1.3, PL, .8);

  /* the west wing, a little forward, with a steep pavilion roof over its front part. Its end wall (opposite the
     winter garden) carries the curved gable with the turul and, upstairs, an open loggia with two columns. */
  const XE = 10, XR = 9.25, ZG = -8.6, ZL = ZS + 3.0;
  box(3.4, XE, 0, PL, ZG, 1.5, M.plinth); box(3.4, XR, 0, PL, ZS, ZG, M.plinth);
  box(3.4, XE, PL, FL1, ZG, 1.5); box(3.4, XR, PL, FL1, ZS, ZG);
  box(3.4, XE, FL1, EC, ZG, 1.5); box(3.4, XR, FL1, EC, ZL, ZG);
  box(3.4, 7.6, FL1, EC, ZS, ZL);
  cornice(3.4, XE, ZG, 1.5, EC, .3, .35); cornice(3.4, XR, ZS, ZG, EC, .3, .35);
  box(3.4, XE, EC, ER, -4.4, 1.5);                                       // attic storey under the pavilion roof
  cornice(3.4, XE, -4.4, 1.5, ER, .3, .3);
  hipRoof(3.0, 10.4, -4.8, 1.9, ER, 4.2); finial(6.7, ER + 4.2, -1.45, .9);
  dormer(6.7, 1.15, 9.4, .85, .95, true);
  for (const x of [4.4, 5.6, 7.8, 9.0]) decal(medallionDraw, 'med', 128, .42, .42, 'n', 1.5, x, EC + .4);
  box(3.2, 10.2, FL1 - .25, FL1, ZG, 1.7, M.trim); box(3.2, XR + .2, FL1 - .25, FL1, ZS - .2, ZG, M.trim);
  decal(WP, 'wp', 512, 1.8, WIN, 'n', 1.5, 5.8, PL + .1);
  decal(friezeDraw, 'frieze', 1024, 2.4, .45, 'n', 1.5, 5.8, PL + WIN + .25);
  decal(W1, 'w1', 256, 1.0, WIN - .2, 'n', 1.5, 8.6, PL + .1);
  decal(WP, 'wp', 512, 1.8, WUP, 'n', 1.5, 5.8, FL1 + .6);
  decal(WP, 'wp', 512, 1.3, WUP, 'n', 1.5, 7.75, FL1 + .6);
  decal(ironDraw, 'iron', 256, 1.4, 1.6, 'n', 1.5, 4.05, 5.0);
  for (const x of [5.2, 8.0]) decal(W1, 'w1', 256, .7, .45, 'n', 1.5, x, .35);
  // south-west loggia
  box(7.6, 7.65, FL1 + .3, EC - .4, ZS, ZL, M.dark);
  box(7.6, XR + .1, FL1, FL1 + .3, ZS - .1, ZL, M.trim); box(7.6, XR + .1, EC - .45, EC, ZS - .1, ZL, M.trim);
  for (const z of [ZS + 1.5, ZS + .25]) column(XR - .3, z, FL1 + .3, EC - .45, .19);
  decal(WH, 'wh', 256, 1, WUP, 'e', 7.65, ZS + 1.6, FL1 + .4);
  // west wall: windows and the oculus beside the gable bay
  for (const z of [-4.1, -2.0]) { decal(W1, 'w1', 256, 1.1, WUP, 'e', XE, z, FL1 + .6); decal(W1, 'w1', 256, 1.1, WIN, 'e', XE, z, PL + .1); }
  { const oc = add(new THREE.Mesh(new THREE.TorusGeometry(.42, .1, 10, 28), M.trim)); oc.position.set(XR + .05, 5.9, -11.2); oc.rotation.y = Math.PI / 2;
    const od = add(new THREE.Mesh(new THREE.CircleGeometry(.42, 28), M.dark)); od.position.set(XR + .03, 5.9, -11.2); od.rotation.y = Math.PI / 2; }
  decal(W1, 'w1', 256, 1.1, WUP, 'e', XR, -9.7, FL1 + .6); decal(WA, 'wa', 256, 1.1, WIN, 'e', XR, -9.9, PL + .1);
  decal(W1, 'w1', 256, 1.1, WIN, 'e', XR, ZS + 1.4, PL + .1);
  // the gable bay with the turul, built facing -z in a local frame and turned to face west
  { const g = new THREE.Group(), main = scene; scene = g;
    box(-1.6, 1.6, 0, PL, -1.0, 0, M.plinth); box(-1.6, 1.6, PL, EC - .2, -1.0, 0);
    box(-1.85, 1.85, EC - .55, EC - .2, -1.25, 0, M.trim); box(-1.75, 1.75, FL1 - .25, FL1, -1.15, 0, M.trim);
    const top = flemishGable(-1.6, 1.6, -1.0, EC - .2, .7, 1, .62);
    turul(0, top, -.75, Math.PI);
    decal(WH, 'wh', 256, 1.1, WUP, 's', -1.0, 0, FL1 + .6); decal(WA, 'wa', 256, 1.2, WIN, 's', -1.0, 0, PL + .1);
    decal(slitDraw, 'slit', 64, .35, .9, 's', -1.0, 0, EC + .45);
    scene = main; g.rotation.y = -Math.PI / 2; g.position.set(XE, 0, -7.0); scene.add(g); }
  // corner oriel on a corbel with a conical roof (north-west corner)
  const ori = new THREE.Group(); scene.add(ori); ori.position.set(9.55, 0, 1.05); ori.rotation.y = Math.PI / 4;
  const ob = new THREE.Mesh(new THREE.BoxGeometry(1.7, ER - FL1, 1.7), M.wall); ob.position.y = (FL1 + ER) / 2; ob.castShadow = true; ori.add(ob);
  const oc = new THREE.Mesh(new THREE.BoxGeometry(1.95, .3, 1.95), M.trim); oc.position.y = ER; ori.add(oc);
  const oco = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.0, 4, 1, true), M.trim); oco.rotation.set(Math.PI, Math.PI / 4, 0); oco.position.y = FL1 - .5; ori.add(oco);
  const orf = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.0, 16), M.zinc); orf.position.y = ER + 1.15; ori.add(orf);
  const ofi = new THREE.Mesh(new THREE.CylinderGeometry(.03, .05, .9, 6), M.iron); ofi.position.y = ER + 2.55; ori.add(ofi);
  { const t = canvasTex(256, Math.round(256 * WUP / .9), W1);
    for (const r of [0, Math.PI / 2]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(.9, WUP), new THREE.MeshStandardMaterial({ map: t, transparent: true })); p.rotation.y = r; p.position.set(Math.sin(r) * .87, FL1 + .6 + WUP / 2, Math.cos(r) * .87); ori.add(p); } }

  /* south front (service side) */
  for (const x of [5.0, 7.0, 8.7]) decal(W1, 'w1', 256, 1, WIN, 's', ZS, x, PL + .1);
  for (const x of [4.6, 6.4]) decal(W1, 'w1', 256, 1.1, WUP, 's', ZS, x, FL1 + .6);    // the corner loggia is open above
  chimney2(-1.4, -6.5, EC, 13.5); chimney2(3.4, -6.0, EC, 13.9); chimney2(5.0, -7.0, EC, 13.9); chimney2(8.0, -5.6, ER, 13.3);

  /* kitchen wing: single-storey, south-east */
  box(-13.4, -9.5, 0, .6, -14.9, -10.6, M.plinth); box(-13.4, -9.5, .6, 4.2, -14.9, -10.6);
  cornice(-13.4, -9.5, -14.9, -10.6, 4.2, .25, .35); hipRoof(-13.7, -9.5, -15.2, -10.3, 4.2, 1.4);
  for (const z of [-11.8, -13.7]) decal(W1, 'w1', 256, .9, 1.6, 'w', -13.4, z, 1.6);

  /* winter garden: single-storey, east of the hall, narrower than the house, with a bay at its far end; glazed
     arches in the walls and a tiled roof with iron cresting (elevation) */
  const wgH = 4.7;
  const gA = (n, len, w) => Array.from({ length: n }, (_, i) => ({ x: len * (i + .5) / n, w, y0: .55, spring: 3.4 }));
  box(-16.6, -9.5, 0, .55, -9.6, 0, M.plinth);
  const wn = arcadeWall(4.6, wgH, [{ x: 2.3, w: 3.7, y0: .55, spring: 2.45 }], .45); wn.position.set(-14.1, 0, -.45); add(wn);
  decal(wgFrontDraw, 'wgfront', 512, 3.7, 3.75, 'n', 0, -11.8, .55);
  const wsn = arcadeWall(4.6, wgH, gA(2, 4.6, 1.6), .45); wsn.position.set(-14.1, 0, -9.6); add(wsn);
  for (const [z0, z1] of [[0, -2.1], [-7.4, -9.6]]) { const w = arcadeWall(Math.abs(z1 - z0), wgH, [], .45); w.rotation.y = Math.PI / 2; w.position.set(-14.1, 0, z0); add(w); }
  const bay = arcadeWall(5.3, wgH, gA(2, 5.3, 1.6), .45); bay.rotation.y = Math.PI / 2; bay.position.set(-16.6, 0, -2.1); add(bay);
  const bn = arcadeWall(2.5, wgH, [{ x: 1.25, w: 1.6, y0: .55, spring: 3.4 }], .45); bn.position.set(-16.6, 0, -2.55); add(bn);
  const bs = arcadeWall(2.5, wgH, [], .45); bs.position.set(-16.6, 0, -7.4); add(bs);
  box(-14.35, -9.5, wgH, wgH + .3, -9.85, .25, M.trim); box(-16.85, -14.1, wgH, wgH + .3, -7.65, -1.85, M.trim);
  decal(ironGlazeDraw, 'glaze', 256, 1.6, 3.65, 'n', -2.1, -15.35, .55);
  for (const a of gA(2, 4.6, 1.6)) decal(ironGlazeDraw, 'glaze', 256, 1.6, 3.65, 's', -9.6, a.x - 14.1, .55);
  for (const a of gA(2, 5.3, 1.6)) decal(ironGlazeDraw, 'glaze', 256, 1.6, 3.65, 'w', -16.6, -2.1 - a.x, .55);
  hipRoof(-14.35, -9.5, -9.85, .25, wgH + .3, 2.5);
  crest(-11.95, -11.85, wgH + 2.8, -4.8);
  { const r = add(new THREE.Mesh(new THREE.BoxGeometry(.05, .05, 5.1), M.iron)); r.position.set(-11.92, wgH + 2.92, -4.8);
    for (let z = -7.3; z <= -2.3; z += .32) add(new THREE.Mesh(new THREE.ConeGeometry(.035, .38, 4), M.iron)).position.set(-11.92, wgH + 2.99, z); }
  hipRoof(-16.85, -14.1, -7.65, -1.85, wgH + .3, 1.6);
}

/* ---------------------------------------------------------------- viewer */
const VIEWS = {
  front: [[-3, 7, 34], [-3, 6, -6]],
  back: [[42, 10, -12], [8, 6, -6]],
  air: [[-34, 40, 30], [-2, 4, -7]],
  west: [[-50, 10, 6], [-10, 5, -6]],
  east: [[44, 11, 0], [8, 6, -7]],
  turul: [[24, 11, -9], [10.5, 9.5, -7.0]],
  loggia: [[20, 9, -26], [8, 7, -14]],
  stairwin: [[-8, 8, -30], [-4.8, 7, -15]],
};
export function init(el) {
  const canvas = el.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: !!el.dataset.capture });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  scene = new THREE.Scene();
  scene.background = canvasTex(4, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6f9ccc'); g.addColorStop(.75, '#cfe0ec'); g.addColorStop(1, '#e9eef0'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  scene.fog = new THREE.Fog('#d9e5ec', 85, 230);
  scene.add(new THREE.HemisphereLight('#dfeaf5', '#6d6a55', 1.1));
  const sun = new THREE.DirectionalLight('#fff3dc', 2.3); sun.position.set(-30, 45, 40); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 140 }); sun.shadow.bias = -.0004;
  scene.add(sun);
  build();
  const camera = new THREE.PerspectiveCamera(38, 1, .5, 400);
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: true, maxPolarAngle: 1.5, minDistance: 14, maxDistance: 110, autoRotateSpeed: .6, enablePan: true });
  const go = (v) => { camera.position.set(...VIEWS[v][0]); controls.target.set(...VIEWS[v][1]); controls.update(); };
  go(el.dataset.view || 'front');
  const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(canvas); resize();
  el.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { controls.autoRotate = false; go(b.dataset.view); }));
  el.querySelectorAll('[data-rotate]').forEach(b => b.addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; b.setAttribute('aria-pressed', controls.autoRotate); }));
  controls.addEventListener('start', () => { controls.autoRotate = false; });
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(el);
  renderer.setAnimationLoop(() => { if (!visible && !el.dataset.capture) return; controls.update(); renderer.render(scene, camera); });
  el.classList.add('m3d-ready');
  el.m3d = { go, renderer, scene, camera, controls };
  return el.m3d;
}
