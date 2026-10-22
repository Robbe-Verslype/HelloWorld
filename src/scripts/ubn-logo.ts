// @ts-nocheck
// Render-engine van de UBN Logo Generator (zelfde code als /ubn-logo-generator/).
// Bouwt een logo volgens de brand guidelines: 1 van 6 vormen, 2 verschillende kleuren,
// UBN off-center binnen de binnenste ring, vaste tekstgrootte.
import DATA from './ubn-logo-data.json';

/* ---------- constants measured on the final logos ---------- */
const COLORS = [
  { id: 'p', name: 'Paars',  hex: '#680193' },
  { id: 'g', name: 'Groen',  hex: '#6AFE15' },
  { id: 'o', name: 'Oranje', hex: '#EF5927' },
  { id: 'b', name: 'Blauw',  hex: '#008FE8' },
];
// shapes are traced from the final logos, in font-size units (UBN font size = 1)
const INK = { cx: (DATA.ubn.bbox[0] + DATA.ubn.bbox[2]) / 2000, cy: (DATA.ubn.bbox[1] + DATA.ubn.bbox[3]) / 2000 };
const RING = 0.12;        // text keeps clear of the solid outer-colour band (×font size)
const OFFC = 0.40;        // text centre at least this far (×font size) from the shape centroid
const MARGIN = 0.38;      // canvas margin around the shape for the halo (×font size)
const SPECK = 1 / 123.5;  // grain cell size (×font size), = 1px at 300 ppi in the originals

const shapePaths = DATA.shapes.map(s => new Path2D(s.d));
const holePaths = DATA.shapes.map(s => new Path2D(s.holes));
const ubnPath = new Path2D(DATA.ubn.d);

/* ---------- colour paths per pair ---------- */
function hexToRgb(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
const LUTS = {};
function lutFor(outer, inner) {
  const key = outer + inner;
  if (LUTS[key]) return LUTS[key];
  const pk = [outer, inner].sort().join('');
  const stops = DATA.paths[pk];
  const rev = pk[0] !== outer;
  const lut = new Float32Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    let t = i / 255; if (rev) t = 1 - t;
    const f = t * (stops.length - 1), k = Math.min(stops.length - 2, Math.floor(f)), u = f - k;
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = stops[k][c] * (1 - u) + stops[k + 1][c] * u;
  }
  return (LUTS[key] = lut);
}
const TC = DATA.tcurve;
function tOf(dF) {
  if (dF <= 0) return TC.t[0];
  const d = TC.d, t = TC.t;
  for (let i = 1; i < d.length; i++) if (dF <= d[i]) { const u = (dF - d[i - 1]) / (d[i] - d[i - 1]); return t[i - 1] + (t[i] - t[i - 1]) * u; }
  return 1;
}

/* ---------- geometry ---------- */
function geom(cfg, F) {
  const s = DATA.shapes[cfg.shape];
  const odd = cfg.rot % 2 === 1;
  const sc = F;
  const sw = (odd ? s.h : s.w) * sc, sh = (odd ? s.w : s.h) * sc;
  const W = Math.ceil(sw + 2 * MARGIN * F), H = Math.ceil(sh + 2 * MARGIN * F);
  return { W, H, cx: W / 2, cy: H / 2, sc, s };
}
function drawShape(ctx, cfg, g, holes) {
  ctx.save();
  ctx.translate(g.cx, g.cy);
  ctx.rotate(cfg.rot * Math.PI / 2);
  if (cfg.mirror) ctx.scale(-1, 1);
  ctx.scale(g.sc, g.sc);
  ctx.translate(-g.s.w / 2, -g.s.h / 2);
  ctx.fill(holes ? holePaths[cfg.shape] : shapePaths[cfg.shape]);
  ctx.restore();
}
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/* ---------- exact euclidean distance transform (Felzenszwalb) ---------- */
function edt(grid, W, H) {
  const INF = 1e20, n = Math.max(W, H);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  function pass(len) {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
  }
  for (let x = 0; x < W; x++) { for (let y = 0; y < H; y++) f[y] = grid[y * W + x]; pass(H); for (let y = 0; y < H; y++) grid[y * W + x] = d[y]; }
  for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) f[x] = grid[y * W + x]; pass(W); for (let x = 0; x < W; x++) grid[y * W + x] = Math.sqrt(d[x]); }
  return grid;
}
function boxBlur(src, W, H, r) {
  if (r < 1) return src;
  const tmp = new Float32Array(W * H), out = new Float32Array(W * H), win = 2 * r + 1;
  for (let y = 0; y < H; y++) {
    let acc = 0; const o = y * W;
    for (let x = -r; x <= r; x++) acc += src[o + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) { tmp[o + x] = acc / win; acc += src[o + Math.min(W - 1, x + r + 1)] - src[o + Math.max(0, x - r)]; }
  }
  for (let x = 0; x < W; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) { out[y * W + x] = acc / win; acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x]; }
  }
  return out;
}

/* ---------- shape field: coverage + distances ---------- */
function field(cfg, F, forRules) {
  const g = geom(cfg, F);
  const c = makeCanvas(g.W, g.H), ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000'; drawShape(ctx, cfg, g);
  const px = ctx.getImageData(0, 0, g.W, g.H).data, N = g.W * g.H;
  ctx.clearRect(0, 0, g.W, g.H); drawShape(ctx, cfg, g, true);
  const hp = ctx.getImageData(0, 0, g.W, g.H).data;
  const M = new Float32Array(N), din = new Float32Array(N), dout = new Float32Array(N), dh = forRules ? null : new Float32Array(N);
  let sx = 0, sy = 0, sa = 0;
  for (let i = 0; i < N; i++) {
    const a = px[i * 4 + 3] / 255; M[i] = a;
    const inside = a >= 0.5;
    din[i] = inside ? 1e20 : 0; dout[i] = inside ? 0 : 1e20;
    if (dh) dh[i] = hp[i * 4 + 3] >= 128 ? 0 : 1e20;
    if (inside) { const x = i % g.W, y = (i / g.W) | 0; sx += x; sy += y; sa++; }
  }
  edt(din, g.W, g.H); edt(dout, g.W, g.H);
  if (dh) { if (DATA.shapes[cfg.shape].holes) edt(dh, g.W, g.H); else dh.fill(1e9); }
  g.M = M; g.din = din; g.dout = dout; g.dh = dh; g.F = F;
  g.centroid = [(sx / sa - g.cx) / F, (sy / sa - g.cy) / F]; // in font units relative to canvas centre
  return g;
}

/* ---------- hash noise for resolution-independent grain ---------- */
function hash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/* ---------- full appearance render (shape layer, no text) ---------- */
function renderBase(cfg, F) {
  const g = field(cfg, F);
  const { W, H, M, din, dout } = g, N = W * H;
  const lut = lutFor(cfg.outer, cfg.inner);
  // t-field from distance to edge, lightly smoothed for organic mixing
  let t = new Float32Array(N);
  const dh = g.dh;
  // spots: the small holes in the compound path let the outer colour through softly
  for (let i = 0; i < N; i++) t[i] = M[i] > 0 ? Math.min(tOf(din[i] / F), tOf(0.14 + 0.8 * dh[i] / F)) : 0.05;
  t = boxBlur(boxBlur(t, W, H, Math.round(0.02 * F)), W, H, Math.round(0.02 * F));
  const out = new ImageData(W, H), o = out.data;
  const halo = hexToRgb('#ffffff'), oc = DATA.colors[cfg.outer];
  const hc = [0, 1, 2].map(k => oc[k] * 0.6 + 255 * 0.4);
  // grain cells are 1/123.5 of the font size; below 1px they average out, so soften instead
  // grainPx: vaste korrelgrootte in pixels (voor beelden op het scherm), anders relatief aan de lettergrootte
  const cell = cfg.grainPx || SPECK * F;
  const cs = Math.max(1, cell), gk = Math.min(1, cell), seed = cfg.seed;
  for (let y = 0; y < H; y++) {
    const gy = Math.floor((y - g.cy) / cs);
    for (let x = 0; x < W; x++) {
      const i = y * W + x, a = M[i];
      const gx = Math.floor((x - g.cx) / cs);
      const h1 = hash(gx, gy, seed);
      let r, gg, b, alpha;
      // shape body
      let w = 0;
      if (h1 < 0.17 || (hash(gx - 1, gy, seed) < 0.17 && hash(gx, gy, seed + 7) < 0.33)) w = 0.76 + 0.22 * hash(gx, gy, seed + 3);
      else if (h1 < 0.34) w = 0.2 + 0.22 * hash(gx, gy, seed + 5);
      const ti = Math.max(0, Math.min(255, Math.round(t[i] * 255))) * 3;
      const br = lut[ti], bg = lut[ti + 1], bb = lut[ti + 2];
      w *= gk;
      const cr = br + (250 - br) * w, cg = bg + (248 - bg) * w, cb = bb + (252 - bb) * w;
      // halo outside the edge
      let ha = 0;
      if (a < 1) {
        const dO = dout[i] / F;
        ha = 0.10 * Math.exp(-dO / 0.07) * (0.3 + 1.4 * hash(gx, gy, seed + 11));
        ha = Math.min(0.35, ha);
      }
      alpha = a + (1 - a) * ha;
      if (alpha <= 0.002) { o[i * 4 + 3] = 0; continue; }
      const wa = a / alpha;
      r = cr * wa + hc[0] * (1 - wa); gg = cg * wa + hc[1] * (1 - wa); b = cb * wa + hc[2] * (1 - wa);
      o[i * 4] = r; o[i * 4 + 1] = gg; o[i * 4 + 2] = b; o[i * 4 + 3] = alpha * 255;
    }
  }
  const c = makeCanvas(W, H); c.getContext('2d').putImageData(out, 0, 0);
  g.canvas = c;
  return g;
}

/* ---------- text placement rules ---------- */
const FA = 36; // analysis resolution (px per font unit)
let TEXT_PTS = null;
function textPoints() {
  if (TEXT_PTS) return TEXT_PTS;
  const w = Math.ceil(3.4 * FA), h = Math.ceil(0.9 * FA);
  const c = makeCanvas(w, h), ctx = c.getContext('2d', { willReadFrequently: true });
  const s = FA / 1000;
  ctx.setTransform(s, 0, 0, s, w / 2 - INK.cx * FA, h / 2 - INK.cy * FA);
  ctx.fill(ubnPath);
  const d = ctx.getImageData(0, 0, w, h).data, pts = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 100 && ((x + y) % 2 === 0)) pts.push([(x + 0.5 - w / 2) / FA, (y + 0.5 - h / 2) / FA]);
  }
  return (TEXT_PTS = pts);
}
const ANALYSIS = new Map();
function analysis(cfg) {
  const key = cfg.shape + '-' + cfg.rot + '-' + (cfg.mirror ? 1 : 0);
  if (ANALYSIS.has(key)) return ANALYSIS.get(key);
  const g = field(cfg, FA, true);
  const pts = textPoints();
  const res = { g, valid: [] };
  const check = (tx, ty) => placementState(res, tx, ty);
  res.check = check;
  const hw = g.W / 2 / FA, hh = g.H / 2 / FA;
  for (let ty = -hh; ty <= hh; ty += 0.05) for (let tx = -hw; tx <= hw; tx += 0.05) {
    const st = check(tx, ty);
    if (st.ring && st.off) res.valid.push([tx, ty]);
  }
  ANALYSIS.set(key, res);
  return res;
}
function placementState(res, tx, ty) {
  const g = res.g, pts = textPoints();
  const off = Math.hypot(tx - g.centroid[0], ty - g.centroid[1]) >= OFFC;
  let ring = true, minD = Infinity;
  for (let k = 0; k < pts.length; k++) {
    const x = Math.round(g.cx + (tx + pts[k][0]) * FA), y = Math.round(g.cy + (ty + pts[k][1]) * FA);
    const d = (x < 0 || y < 0 || x >= g.W || y >= g.H) ? 0 : g.din[y * g.W + x] / FA;
    if (d < minD) minD = d;
    if (d < RING) { ring = false; break; }
  }
  return { ring, off, minD };
}
function randomPlacement(cfg, rnd = Math.random) {
  const a = analysis(cfg);
  if (!a.valid.length) return [a.g.centroid[0] + OFFC, a.g.centroid[1]];
  return a.valid[Math.floor(rnd() * a.valid.length)].slice();
}
function nearestValid(cfg, tx, ty) {
  const a = analysis(cfg); let best = null, bd = Infinity;
  for (const p of a.valid) { const d = (p[0] - tx) ** 2 + (p[1] - ty) ** 2; if (d < bd) { bd = d; best = p; } }
  return best ? best.slice() : [tx, ty];
}

/* ---------- compose shape layer + wordmark ---------- */
function drawText(ctx, g, tx, ty) {
  const F = g.F, s = F / 1000;
  ctx.save();
  ctx.setTransform(s, 0, 0, s, g.cx + (tx - INK.cx) * F, g.cy + (ty - INK.cy) * F);
  ctx.fillStyle = '#ffffff';
  ctx.fill(ubnPath);
  ctx.restore();
}
function compose(base, cfg, bg, target) {
  const c = target || makeCanvas(base.W, base.H);
  c.width = base.W; c.height = base.H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  if (bg === 'white' || bg === 'black') { ctx.fillStyle = bg === 'white' ? '#ffffff' : '#000000'; ctx.fillRect(0, 0, c.width, c.height); }
  ctx.drawImage(base.canvas, 0, 0);
  drawText(ctx, base, cfg.tx, cfg.ty);
  return c;
}


/** Willekeurig logo dat aan alle regels voldoet, gecentreerd op een canvas met achtergrond. */
/** Korrelgrootte (in canvaspixels) zoals in de generator op het scherm: 96 css-px per lettergrootte. */
export function screenGrainPx() {
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  return (96 / 123.5) * dpr;
}

/** Logo gecentreerd op een canvas. opts.cfg = bestaand logo hertekenen, opts.grainPx = korrelgrootte. */
export function randomLogoCanvas(width, height, background = '#000000', opts = {}) {
  let cfg = opts.cfg;
  if (!cfg) {
    const ids = COLORS.map((c) => c.id);
    const i = Math.floor(Math.random() * 4);
    let o = Math.floor(Math.random() * 3);
    if (o >= i) o++;
    cfg = { shape: Math.floor(Math.random() * 6), inner: ids[i], outer: ids[o], rot: 0, mirror: false, seed: 1 + Math.floor(Math.random() * 9999), tx: 0, ty: 0 };
    [cfg.tx, cfg.ty] = randomPlacement(cfg);
  }
  cfg = { ...cfg, grainPx: opts.grainPx };
  // logo vult ongeveer 78% van de breedte of 82% van de hoogte
  const g0 = geom(cfg, 100);
  const F = 100 * Math.min((width * 0.78) / g0.W, (height * 0.82) / g0.H);
  const base = renderBase(cfg, F);
  const c = makeCanvas(width, height);
  const ctx = c.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  const logo = compose(base, cfg, 'none');
  ctx.drawImage(logo, Math.round((width - logo.width) / 2), Math.round((height - logo.height) / 2));
  const { grainPx, ...plain } = cfg;
  c.cfg = plain;
  return c;
}

/** Tekent één logo (cfg) gecentreerd in een vak op een bestaande context. */
function drawLogoInBox(ctx, cfg, x, y, w, h, fill = 0.8) {
  [cfg.tx, cfg.ty] = randomPlacement(cfg);
  const g0 = geom(cfg, 100);
  const F = 100 * Math.min((w * fill) / g0.W, (h * fill) / g0.H);
  const logo = compose(renderBase(cfg, F), cfg, 'none');
  ctx.drawImage(logo, Math.round(x + (w - logo.width) / 2), Math.round(y + (h - logo.height) / 2));
}

/**
 * Blad met n willekeurige logo's (zoals de reeks in de guidelines):
 * alle 6 vormen komen voor en geen enkel kleurpaar wordt herhaald.
 */
export function randomLogoSheet(cols = 5, rows = 2, cellW = 400, cellH = 330, background = '#ffffff', grainPx = undefined) {
  const n = cols * rows;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const shapes = [0, 1, 2, 3, 4, 5];
  while (shapes.length < n) shapes.push(Math.floor(Math.random() * 6));
  shuffle(shapes);
  const pairs = [];
  for (const a of COLORS) for (const b of COLORS) if (a.id !== b.id) pairs.push([a.id, b.id]);
  shuffle(pairs);
  const c = makeCanvas(cols * cellW, rows * cellH);
  const ctx = c.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, c.width, c.height);
  for (let k = 0; k < n; k++) {
    const [inner, outer] = pairs[k % pairs.length];
    const cfg = { shape: shapes[k], inner, outer, rot: 0, mirror: false, seed: 1 + Math.floor(Math.random() * 9999), tx: 0, ty: 0, grainPx };
    drawLogoInBox(ctx, cfg, (k % cols) * cellW, Math.floor(k / cols) * cellH, cellW, cellH, 0.86);
  }
  return c;
}

export { DATA, COLORS, MARGIN, geom, renderBase, compose, analysis, randomPlacement, nearestValid };
