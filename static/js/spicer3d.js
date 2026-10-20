/* Spitzer Castle, Beočin: a hypothetical reconstruction of its original look (rakovac.rs).
   A simplified model built from photographs of October 2026 (Konstantin Stein): proportions, the plan and the
   roof shapes are approximate; facade details are painted on. Loaded only when the viewer scrolls to it.
   Markup: <div class="m3d" data-model="spicer"><canvas></canvas> buttons [data-view] [data-rotate]</div> */
import * as THREE from '../vendor/three/three.module.min.js';
import { OrbitControls } from '../vendor/three/OrbitControls.js';

const STONE = '#efe6d2', STONE_D = '#d9ccb0', TRIM = '#f6f0e2', FRAME = '#6a2e25', GLASS1 = '#1d252c', GLASS2 = '#3c4a56';
const PL = 1.2, FL1 = 5.8;                       // plinth top (ground floor level), first floor level

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
function flemishGable(x0, x1, z, y, depth, dir) { // curved baroque gable over the rear bay
  const w = x1 - x0, s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, .5);
  s.bezierCurveTo(w - .2, 1.6, w - 1.6, 1.4, w - 1.5, 2.4); s.lineTo(w - 1.5, 2.9);
  s.bezierCurveTo(w - 2.0, 3.2, w / 2 + .5, 3.5, w / 2 + .45, 3.9); s.lineTo(w / 2 - .45, 3.9);
  s.bezierCurveTo(w / 2 - .5, 3.5, 2.0, 3.2, 1.5, 2.9); s.lineTo(1.5, 2.4);
  s.bezierCurveTo(1.6, 1.4, .2, 1.6, 0, .5); s.lineTo(0, 0);
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 2 }), M.wallX);
  m.position.set(x0, y, dir > 0 ? z - depth : z); add(m);
  box(x0 + w / 2 - .6, x0 + w / 2 + .6, y + 3.9, y + 4.15, z - depth - .1, z + .1, M.trim);
  for (const ux of [x0 + 1.55, x1 - 1.55]) {                  // small urns on the shoulders
    const urn = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.22, 0], [.12, .15], [.26, .4], [.12, .6], [0, .62]].map(p => new THREE.Vector2(p[0], p[1])), 12), M.trim);
    urn.position.set(ux, y + 2.9, z - depth / 2); add(urn);
  }
  return y + 4.15;
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
  };
  M.roof.map.repeat.set(1, 1);

  /* ground, forecourt, fountain, park trees */
  const ground = add(new THREE.Mesh(new THREE.CircleGeometry(420, 64), new THREE.MeshStandardMaterial({ color: '#7d9550', roughness: 1 })));
  ground.rotation.x = -Math.PI / 2;
  const court = add(new THREE.Mesh(new THREE.PlaneGeometry(44, 16), new THREE.MeshStandardMaterial({ color: '#cdbf9c', roughness: 1 })));
  court.rotation.x = -Math.PI / 2; court.position.set(-5, .02, 8);
  const basin = add(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.3, .6, 40), M.plinth)); basin.position.set(-.5, .3, 11);
  const water = add(new THREE.Mesh(new THREE.CylinderGeometry(2.95, 2.95, .1, 40), new THREE.MeshStandardMaterial({ color: '#5c8590', roughness: .15, metalness: .3 }))); water.position.set(-.5, .58, 11);
  add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.35, 0], [.18, .9], [.9, 1.2], [.95, 1.3], [0, 1.35]].map(p => new THREE.Vector2(p[0], p[1])), 20), M.trim)).position.set(-.5, .5, 11);
  for (const [x, z, s] of [[-38, 10, 1.15], [-42, -28, 1], [27, 10, 1.1], [28, -8, 1.2], [30, -30, 1], [-22, -36, 1.15], [-50, 18, .9], [42, -22, 1]]) tree(x, z, s);
  for (const [x, z] of [[-26, 15], [-14, 17], [10, 17], [18, 15]]) tree(x, z, .45, '#4f6b33');

  /* H: great hall (left), double-height, with the tracery window */
  box(-15, -5, 0, PL, -11, 0, M.plinth); box(-15, -5, PL, 11.6, -11, 0);
  cornice(-15, -5, -11, 0, 11.6); hipRoof(-15.4, -4.6, -11.4, .4, 11.6, 2.4);
  box(-15.2, -4.8, FL1 - .25, FL1, -11.2, .2, M.trim);                          // string course
  decal(traceryDraw, 'tracery', 1024, 5.8, 5.5, 'n', 0, -10, 5.95);
  decal(WA, 'wa18', 256, 1.9, 3.3, 'n', 0, -6.9, PL + .1);                       // side door to the hall
  decal(WA, 'wa', 256, 1.5, 2.6, 'n', 0, -12.4, PL + .7);
  decal(ironDraw, 'iron', 256, 1.7, 2.0, 'n', 0, -14.1, 7.6);
  decal(gothicPairDraw, 'goth', 512, 2.8, 5.0, 's', -11, -10, 5.9);              // staircase window at the back
  decal(W1, 'w1', 256, 1.2, 2.4, 's', -11, -13.5, 2.0); decal(W1, 'w1', 256, 1.2, 2.4, 's', -11, -6.6, 2.0);

  /* C: centre with the arcaded loggia and the terrace above it */
  box(-5, 4, 0, PL, -12, -3.2, M.plinth); box(-5, 4, PL, 10.4, -12, -3.2);
  cornice(-5, 4, -12, -3.2, 10.4); hipRoof(-5.4, 4.4, -12.4, -2.8, 10.4, 2.6);
  box(-5, 4, 0, PL, -3.2, 0, M.plinth);                                         // loggia floor
  const arcs = [-3.3, -.5, 2.3].map(x => ({ x: x + 5, w: 2.2, y0: PL, spring: 4.1 }));
  const arc = arcadeWall(9, FL1, arcs, .55); arc.position.set(-5, 0, -.55); add(arc);
  box(-5, 4, FL1, FL1 + .3, -3.2, .25, M.trim);                                  // terrace slab
  for (const x of [-4.7, -1.9, .9, 3.7]) column(x, .3, PL, 4.6, .19);
  balustrade(-4.9, .1, 3.9, .1, FL1 + .3);
  balustrade(-4.9, -3.1, -4.9, .1, FL1 + .3);
  for (const x of [-3.3, -.5, 2.3]) decal(WA, 'wa', 256, 1.7, 3.0, 'n', -3.2, x, PL + .1);
  for (const x of [-3.3, -.5, 2.3]) decal(WH, 'wh', 256, 1.3, 2.6, 'n', -3.2, x, FL1 + .8);
  /* front steps: a platform under the middle arch and flights to both sides */
  box(-1.7, .7, 0, PL, 0, 2.4, M.plinth); decal(doorDarkArch, 'dark', 128, 1.1, .9, 'n', 2.4, -.5, 0);
  stairs(-1.7, -1, .2, 2.2, 6, .2, .4); stairs(.7, 1, .2, 2.2, 6, .2, .4);
  balustrade(-1.7, 2.35, .7, 2.35, PL, .8);

  /* rear of the centre: upper loggia with two columns, oculus */
  box(-3.4, 2.6, FL1 + .2, 10.0, -12.05, -12.02, M.dark);
  for (const x of [-1.4, .6]) column(x, -12.35, FL1 + .3, 9.9, .2);
  for (const x of [-2.4, -.4, 1.6]) decal(WH, 'wh', 256, 1.1, 2.6, 's', -12.06, x, FL1 + .5);
  box(-3.6, 2.8, FL1, FL1 + .3, -12.8, -12, M.trim); balustrade(-3.4, -12.6, 2.6, -12.6, FL1 + .3, .9);
  for (const x of [-3.3, -.5, 2.3]) decal(WA, 'wa', 256, 1.5, 2.6, 's', -12, x, PL + .6);
  const ocul = add(new THREE.Mesh(new THREE.TorusGeometry(.55, .12, 10, 28), M.trim)); ocul.position.set(3.4, 8.2, -12.05);
  add(new THREE.Mesh(new THREE.CircleGeometry(.55, 28), M.dark)).position.set(3.4, 8.2, -12.03); scene.children.at(-1).rotation.y = Math.PI;

  /* R: right wing with the lion frieze and the corner oriel */
  box(4, 14, 0, PL, -12, .8, M.plinth); box(4, 14, PL, 11.0, -12, .8);
  cornice(4, 14, -12, .8, 11.0); hipRoof(3.6, 14.4, -12.4, 1.2, 11.0, 3.0);
  box(3.8, 14.2, FL1 - .25, FL1, -12.2, 1.0, M.trim);
  decal(WP, 'wp', 512, 2.6, 2.7, 'n', .8, 8.4, PL + .7);
  decal(WP, 'wp', 512, 2.6, 2.9, 'n', .8, 8.4, FL1 + .7);
  decal(friezeDraw, 'frieze', 1024, 5.4, .75, 'n', .8, 8.4, FL1 - 1.1);
  for (const x of [6.9, 9.9]) decal(medallionDraw, 'med', 128, .65, .65, 'n', .8, x, FL1 + .05);
  decal(ironDraw, 'iron', 256, 1.7, 2.0, 'n', .8, 5.2, 7.4);
  for (const x of [6.4, 10.4]) decal(W1, 'w1', 256, .7, .45, 'n', .8, x, .35);    // cellar windows
  for (const z of [-2.5, -8]) { decal(W1, 'w1', 256, 1.3, 2.5, 'e', 14, z, PL + .8); decal(W1, 'w1', 256, 1.3, 2.5, 'e', 14, z, FL1 + .8); }
  // corner oriel on a corbel
  const ori = new THREE.Group(); scene.add(ori); ori.position.set(13.6, 0, .4); ori.rotation.y = Math.PI / 4;
  const ob = new THREE.Mesh(new THREE.BoxGeometry(2.3, 4.2, 2.3), M.wall); ob.position.y = FL1 + 2.1; ori.add(ob); ob.castShadow = true;
  const oc = new THREE.Mesh(new THREE.BoxGeometry(2.6, .4, 2.6), M.trim); oc.position.y = FL1 + 4.3; ori.add(oc);
  const oco = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.8, 4, 1, true), M.trim); oco.rotation.set(Math.PI, Math.PI / 4, 0); oco.position.y = FL1 - .9; ori.add(oco);
  const orf = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.6, 4), M.roof); orf.rotation.y = Math.PI / 4; orf.position.y = FL1 + 5.3; ori.add(orf);
  for (const r of [0, Math.PI / 2]) {
    const t = texCache.get('w1') || canvasTex(256, 512, W1); texCache.set('w1', t);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.5), new THREE.MeshStandardMaterial({ map: t, transparent: true }));
    p.rotation.y = r; p.position.set(Math.sin(r) * 1.17, FL1 + 2.2, Math.cos(r) * 1.17); ori.add(p);
  }

  /* rear bay of the right wing with the curved gable and the turul */
  box(6, 12, 0, PL, -13.3, -12, M.plinth); box(6, 12, PL, 10.4, -13.3, -12);
  box(5.7, 12.3, 10.0, 10.4, -13.6, -12, M.trim);
  const top = flemishGable(6, 12, -13.3, 10.4, .8, 1);
  turul(9, top, -13.0, Math.PI);
  decal(slitDraw, 'slit', 64, .5, 1.4, 's', -13.3, 9, 11.7);
  decal(WH, 'wh', 256, 1.3, 2.6, 's', -13.3, 9, FL1 + .7); decal(WA, 'wa', 256, 1.5, 2.6, 's', -13.3, 9, PL + .6);
  chimney(1.0, -8.5, 10.4, 14.4); chimney(2.6, -8.5, 10.4, 14.4); chimney(8.5, -4, 11, 15.2);

  /* W: winter garden (glass house) on the west side of the hall */
  const wgH = 6.6, wgA = (n, len) => Array.from({ length: n }, (_, i) => ({ x: len * (i + .5) / n, w: 2.3, y0: .6, spring: 4.0 }));
  box(-25, -15, 0, .6, -10, -1, M.plinth);
  const wn = arcadeWall(10, wgH, wgA(3, 10), .5); wn.position.set(-25, 0, -1.5); add(wn);
  const wsw = arcadeWall(10, wgH, wgA(3, 10), .5); wsw.position.set(-25, 0, -10); add(wsw);
  const ww = arcadeWall(9, wgH, wgA(3, 9), .5); ww.rotation.y = Math.PI / 2; ww.position.set(-25, 0, -1); add(ww);
  box(-25.3, -15, wgH, wgH + .35, -10.3, -.7, M.trim);
  for (const a of wgA(3, 10)) { decal(ironGlazeDraw, 'glaze', 256, 2.3, 3.4 + 1.15, 'n', -1, a.x - 25, .6); decal(ironGlazeDraw, 'glaze', 256, 2.3, 4.55, 's', -10, a.x - 25, .6); }
  for (const a of wgA(3, 9)) decal(ironGlazeDraw, 'glaze', 256, 2.3, 4.55, 'w', -25, -1 - a.x, .6);
  // glass roof with iron ribs
  const rg = new THREE.PlaneGeometry(10.2, 5.4);
  for (const s of [1, -1]) {
    const p = new THREE.Mesh(rg, M.glassRoof); p.position.set(-20, wgH + .35 + 1.45, -5.5 + s * 2.3); p.rotation.x = -Math.PI / 2 + s * .56; scene.add(p);
  }
  for (let i = 0; i <= 10; i++) for (const s of [1, -1]) {
    const r = add(new THREE.Mesh(new THREE.BoxGeometry(.07, .07, 5.4), M.iron)); r.position.set(-25 + i, wgH + .35 + 1.45, -5.5 + s * 2.3); r.rotation.x = s * .56;
  }
  add(new THREE.Mesh(new THREE.BoxGeometry(10.3, .12, .12), M.iron)).position.set(-20, wgH + .35 + 2.95, -5.5);
}

/* ---------------------------------------------------------------- viewer */
const VIEWS = {
  front: [[2, 9, 46], [-4, 6, -4]],
  back: [[14, 10, -50], [-3, 7, -6]],
  air: [[-38, 38, 34], [-5, 4, -5]],
  west: [[-58, 11, -8], [-10, 5, -5]],
  turul: [[16, 15, -26], [9, 13, -13]],
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
