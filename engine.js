// Hypernova badge engine.
// A badge is a plain JSON spec; renderBadge(spec) returns an SVG string.
// Every shape is defined by its RIGHT half only and mirrored, so symmetry is guaranteed.

import { DIGIT_FONTS } from './digits.js';

export const SIZE = 150;
export const CX = 75;
const T30 = Math.tan(Math.PI / 6);

/* ------------------------------------------------------------------ */
/* Rarity palettes                                                      */
/* ------------------------------------------------------------------ */
// gem.from / gem.to: linear gradient handles in fractions of the gem box (Figma model).
// half: fills of the left facet, painted over the gem. 'space: half' maps the gradient to the
// left half's own box (that is how the silver facet is built in Figma).
const gemStops = (dark, light) => [[0, dark, 1], [0.41226, light, 1], [1, dark, 1]];
const V_STD = { from: [0.95515, 0], to: [0.06038, 1.01062] };

export const PALETTES = {
  silver: {
    label: 'Silver', tier: 'Common', source: 'figma',
    plate: { color: '#949494', alpha: 0.12 },
    gem: { stops: gemStops('#909090', '#E4E4E4'), ...V_STD },
    half: [
      { type: 'linear', stops: 'gem', from: [0.95515, 0], to: [-0.72417, 0.47419], space: 'half' },
      { type: 'solid', color: '#000000', alpha: 1, blend: 'overlay' },
    ],
    glassTint: ['#E4E4E4', '#909090'],
  },
  blue: {
    label: 'Blue', tier: 'Rare', source: 'figma',
    plate: { color: '#69A4FF', alpha: 0.16 },
    gem: { stops: gemStops('#116FFE', '#B8D4FF'), ...V_STD },
    half: [
      { type: 'solid', color: '#000000', alpha: 0.18, blend: 'overlay' },
      // Figma: Linear burn 17%. Figma's linear burn is premultiplied, so black at 17% SUBTRACTS
      // 0.17 from every channel (not the same as 17% black). Browsers have no plus-darker, so
      // the screen renderer bakes the whole facet into one gradient (see bakeStops).
      { type: 'solid', color: '#000000', alpha: 0.17, blend: 'plus-darker' },
    ],
    glassTint: ['#9CC3FF', '#5E9DFE'],
  },
  purple: {
    label: 'Purple', tier: 'Epic', source: 'figma',
    plate: { color: '#A269FF', alpha: 0.16 },
    gem: { stops: gemStops('#6F31D4', '#D5BBFF'), from: [0.81035, 0.26775], to: [0.2767, 1.36828] },
    half: [{ type: 'solid', color: '#000000', alpha: 0.64, blend: 'overlay' }],
    glassTint: ['#D5BBFF', '#8B55F0'],
  },
  gold: {
    label: 'Gold', tier: 'Legendary', source: 'figma',
    plate: { color: '#FFE396', alpha: 0.12 },
    gem: { stops: gemStops('#D4B331', '#FFEDA6'), from: [0.9552, 0], to: [0.28136, 1.16163] },
    half: [{ type: 'solid', color: '#000000', alpha: 0.64, blend: 'overlay' }],
    glassTint: ['#FFEDA6', '#D4B331'],
  },
};

// New tiers are derived with the rule the four Figma palettes follow (HSL):
//   gem dark   = hue, sat ~65-100%, light ~50%   (purple 263/63/51, blue 216/99/53, gold 48/65/51)
//   gem light  = hue, sat 100%, light ~85%       (purple 87, blue 86, gold 83)
//   plate tint = hue, sat 100%, light ~72-79% at 12-16%
//   left facet = black 64% overlay (purple, gold); glass tint = light / mid.
const hsl = (h, s, l) => {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const c = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return hex([c(0), c(8), c(4)]);
};
export function hexToHsl(hx) {
  const [r, g, b] = rgb(hx), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l * 100];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}
export function derivePalette({ hue, sat = 72, light = 50, liteL = 85, plateL = 72, label, tier, plateAlpha = 0.16, facet = 0.64 }) {
  const dark = hsl(hue, sat, light), lite = hsl(hue, 100, liteL), mid = hsl(hue, 100, 72);
  return {
    label, tier, source: 'derived', hue,
    plate: { color: hsl(hue, 100, plateL), alpha: plateAlpha },
    gem: { stops: gemStops(dark, lite), ...V_STD },
    half: [{ type: 'solid', color: '#000000', alpha: facet, blend: 'overlay' }],
    glassTint: [lite, mid],
  };
}
// a palette from any picked colour (used for custom colours in the creator)
export function paletteFromColor(hx, extra = {}) {
  const [h, s, l] = hexToHsl(hx);
  return derivePalette({ hue: h, sat: Math.max(55, Math.min(100, s)), light: Math.max(38, Math.min(56, l)), label: 'Custom', tier: 'Custom', ...extra });
}

// Client ladder (feedback 2026-11-13): bronze -> silver -> gold -> ruby -> purple.
// Bronze is a metal like gold (lower saturation, 12% plate); ruby is a jewel like purple (16% plate).
Object.assign(PALETTES, {
  bronze: derivePalette({ hue: 24, sat: 60, light: 44, liteL: 82, plateL: 75, plateAlpha: 0.12, label: 'Bronze', tier: 'Levels 1 to 19' }),
  ruby: derivePalette({ hue: 345, sat: 80, light: 45, liteL: 86, label: 'Ruby', tier: 'Levels 100 to 199' }),
});
PALETTES.silver.tier = 'Levels 20 to 49';
PALETTES.gold.tier = 'Levels 50 to 99';
PALETTES.purple.tier = 'Levels 200 and up';
PALETTES.blue.tier = 'Achievements only';
export const TIER_ORDER = ['bronze', 'silver', 'gold', 'ruby', 'purple', 'blue'];

/* ------------------------------------------------------------------ */
/* Shape library                                                        */
/* ------------------------------------------------------------------ */
// gen(w, h, params) returns { pts: [[x, y, r], ...] } or { path: [...segments] }.
// pts: right half, x measured from the axis (>= 0), y from the top of the box.
// First and last point sit on the axis (x = 0). r = corner radius at that vertex.
// fit: true pushes rounded vertices outwards so the VISIBLE shape fills the w x h box.

const P = (s) => parseHalf(s);

export const SHAPES = {
  oval: {
    label: 'Oval', kind: 'plate',
    gen: (w, h) => ({ pts: [[0, 0], [w / 2, 0, w / 2], [w / 2, h, w / 2], [0, h]] }),
  },
  hex: {
    label: 'Hexagon', kind: 'plate',
    params: { shoulder: null, r: 0, tip: 0 },
    gen: (w, h, { shoulder, r = 0, tip = 0 }) => {
      const s = shoulder ?? (w / 2) * T30;
      return { pts: [[0, 0, tip], [w / 2, s, r], [w / 2, h - s, r], [0, h, tip]], fit: tip > 0 };
    },
  },
  shield: {
    label: 'Shield', kind: 'plate',
    params: { corner: 0, knee: 0.71, r: 0, tip: 0 },
    gen: (w, h, { corner = 0, knee = 0.71, r = 0, tip = 0 }) => ({
      pts: [[0, 0], [w / 2, 0, corner], [w / 2, knee * h, r], [0, h, tip]], fit: tip > 0,
    }),
  },
  rhombus: {
    label: 'Rhombus', kind: 'plate',
    params: { r: 0, tip: 0, mid: 0.5, btip: null },
    gen: (w, h, { r = 0, tip = 0, mid = 0.5, btip = null }) => ({ pts: [[0, 0, tip], [w / 2, mid * h, r], [0, h, btip ?? tip]], fit: true }),
  },
  crest: {
    label: 'Crest', kind: 'plate',
    params: { top: 0.411, mid: 0.4985, r: 0 },
    gen: (w, h, { top = 0.411, mid = 0.4985, r = 0 }) => ({
      pts: [[0, 0], [top * w / 2, 0, r], [w / 2, mid * h, r], [0, h, r]], fit: true,
    }),
  },
  triangle: {
    label: 'Triangle', kind: 'plate',
    params: { r: 0 },
    gen: (w, h, { r = 0 }) => ({ pts: [[0, 0, r], [w / 2, h, r], [0, h]], fit: r > 0 }),
  },
  diamond: {
    label: 'Diamond', kind: 'glyph',
    params: { r: 0 },
    gen: (w, h, { r = 0 }) => ({ pts: [[0, 0, r], [w / 2, h / 2, r], [0, h, r]], fit: r > 0 }),
  },
  chevron: {
    label: 'Chevron', kind: 'glyph',
    params: { angle: 30 },
    gen: (w, h, { angle = 30 }) => {
      const a = (w / 2) * Math.tan((angle * Math.PI) / 180);
      return { pts: [[0, 0], [w / 2, a], [w / 2, h], [0, h - a]] };
    },
  },
  gemcut: {
    label: 'Gem cut', kind: 'plate',
    params: { top: 0.5, shoulder: 0.42, r: 0, tip: 0 },
    gen: (w, h, { top = 0.5, shoulder = 0.42, r = 0, tip = 0 }) => ({
      pts: [[0, 0], [top * w / 2, 0, r], [w / 2, shoulder * h, r], [0, h, tip]], fit: r > 0 || tip > 0,
    }),
  },
  octagon: {
    label: 'Octagon', kind: 'plate',
    params: { cut: 0.2929, r: 0 },
    gen: (w, h, { cut = 0.2929, r = 0 }) => {
      const cw = cut * w, ch = cut * h;
      return { pts: [[0, 0], [w / 2 - cw, 0, r], [w / 2, ch, r], [w / 2, h - ch, r], [w / 2 - cw, h, r], [0, h]] };
    },
  },
  // flat-topped hexagon (the level badges): side = horizontal run of each slanted side
  hexFlat: {
    label: 'Hexagon, flat top', kind: 'plate',
    params: { side: null, r: 0 },
    gen: (w, h, { side, r = 0 }) => {
      const s = side ?? (h / 2) * T30;
      return { pts: [[0, 0], [w / 2 - s, 0, r], [w / 2, h / 2, r], [w / 2 - s, h, r], [0, h]] };
    },
  },
  pentagon: {
    label: 'Pentagon', kind: 'plate',
    params: { shoulder: 0.38, base: 0.62, r: 0, tip: 0 },
    gen: (w, h, { shoulder = 0.38, base = 0.62, r = 0, tip = 0 }) => ({
      pts: [[0, 0, tip], [w / 2, shoulder * h, r], [(base * w) / 2, h, r], [0, h]], fit: r > 0 || tip > 0,
    }),
  },
  arch: {
    label: 'Arch', kind: 'plate',
    params: { r: 6 },
    gen: (w, h, { r = 6 }) => ({ pts: [[0, 0], [w / 2, 0, w / 2], [w / 2, h, r], [0, h]] }),
  },
  banner: {
    label: 'Banner', kind: 'plate',
    params: { notch: 0.16, r: 8 },
    gen: (w, h, { notch = 0.16, r = 8 }) => ({ pts: [[0, 0], [w / 2, 0, r], [w / 2, h, 2], [0, h - notch * h, 2]] }),
  },
  wing: {
    label: 'Wing crest', kind: 'plate',
    params: { r: 6 },
    gen: (w, h, { r = 6 }) => ({
      pts: [[0, 0.1 * h, 3], [0.2 * w, 0, r], [0.5 * w, 0.1 * h, r], [0.37 * w, 0.4 * h, r], [0.41 * w, 0.62 * h, r], [0, h, r]], fit: true,
    }),
  },
  star5: {
    label: 'Star (5)', kind: 'glyph',
    params: { inner: 0.45, r: 0 },
    gen: (w, h, { inner = 0.45, r = 0 }) => {
      const P5 = [];
      for (let k = 0; k <= 5; k++) {
        const a = (-90 + k * 36) * Math.PI / 180, R = k % 2 ? inner : 1;
        P5.push([Math.cos(a) * R, Math.sin(a) * R]);
      }
      const yb = Math.sin((54 * Math.PI) / 180); // lowest outer points
      const sx = w / 2 / Math.cos((18 * Math.PI) / 180), sy = h / (1 + yb);
      return { pts: P5.map(([x, y], i) => [Math.max(0, x * sx), (y + 1) * sy, i === 0 || i % 2 === 0 ? r : r / 2]).map((p, i) => (i === 5 ? [0, p[1]] : p)), fit: r > 0 };
    },
  },
  cross: {
    label: 'Cross', kind: 'glyph',
    params: { arm: 0.36, r: 1 },
    gen: (w, h, { arm = 0.36, r = 1 }) => {
      const t = (arm * w) / 2, v = (h - arm * h) / 2;
      return { pts: [[0, 0], [t, 0, r], [t, v], [w / 2, v, r], [w / 2, h - v, r], [t, h - v], [t, h, r], [0, h]] };
    },
  },
  crown: {
    label: 'Crown', kind: 'glyph',
    params: { valley: 0.42, r: 1 },
    gen: (w, h, { valley = 0.42, r = 1 }) => ({
      pts: [[0, 0, r], [0.17 * w, valley * h], [0.5 * w, 0.1 * h, r], [0.42 * w, h, r], [0, h]],
    }),
  },
  arrow: {
    label: 'Arrow', kind: 'glyph',
    params: { head: 0.5, shaft: 0.34, r: 1 },
    gen: (w, h, { head = 0.5, shaft = 0.34, r = 1 }) => ({
      pts: [[0, 0, r], [w / 2, head * h, r], [(shaft * w) / 2, head * h], [(shaft * w) / 2, h, r], [0, h]],
    }),
  },
  heart: {
    label: 'Heart', kind: 'glyph', ref: [26, 23],
    half: P('M0 5.2 C1.6 1.9 4.4 0 7.4 0 C10.9 0 13 2.8 13 6.6 C13 12.6 6.6 17.8 0 23'),
  },
  teardrop: {
    label: 'Teardrop', kind: 'glyph', ref: [16, 25],
    half: P('M0 0 C0 0 8 8.83 8 14.59 C8 20.34 4.41 25 0 25'),
  },
  sparkle: {
    label: 'Sparkle', kind: 'glyph', ref: [27, 36],
    half: P('M0 0 C1.46 8.92 6.73 15.97 13.5 18 C6.73 20.02 1.46 27.07 0 36'),
  },

  // Base shapes from Figma (Hypernova Internal, node 586:8480). Right halves taken from the
  // vector outlines and mirrored; the plate and the gem of a pair share one outline unless noted.
  pennant: {
    label: 'Pennant', kind: 'plate', ref: [90, 92],
    half: P('M0 0 C12.686 0 25.372 0.251 33.511 0.754 C38.298 0.754 41.17 3.77 42.128 9.803 C45.957 32.929 45.957 63.093 42.128 85.213 C41.17 91.246 39.255 93.257 34.468 91.246 L0 80.186'),
  },
  flower: {
    label: 'Flower', kind: 'plate', ref: [90, 83.499],
    half: P('M0 5.719 C12.724 -6.325 35.534 1.183 31.034 23.238 C49.655 27.618 49.655 55.929 31.034 60.309 C35.534 82.364 12.724 89.872 0 77.671'),
  },
  cushion: {
    label: 'Cushion', kind: 'plate', ref: [76, 76],
    half: P('M0 4 C10 4 13 0 21 0 C31 0 38 8 38 19 C38 27 34 31 34 38 C34 45 38 49 38 57 C38 68 31 76 21 76 C13 76 10 72 0 72'),
  },
  // the Figma cloud plate was 3.3 px lopsided; this is its right half mirrored
  cloud: {
    label: 'Cloud', kind: 'plate', ref: [90, 92],
    half: P('M0 0 C11.526 0.186 17.32 9.12 20.232 16.084 C28.079 14.073 36.907 22.117 36.907 30.161 C47.698 39.21 47.698 53.287 36.907 62.336 C36.907 74.401 29.06 82.445 19.251 81.44 C14.908 88.364 7.479 91.883 0 92'),
  },
  brilliant: {
    label: 'Brilliant', kind: 'plate', ref: [105.927, 88],
    half: P('M0 0 L27.56 0 C29.115 0 30.705 0.675 32.33 2.024 L50.35 19.536 C53.389 22.293 53.778 25.432 51.516 28.952 C39.22 48.4 18.338 72.248 4.452 86.064 C2.968 87.355 1.484 88 0 88'),
  },
  wavy: {
    label: 'Wavy seal', kind: 'plate', ref: [93.792, 104.668],
    half: P('M0 0 C2.383 0 4.767 0.724 6.803 2.172 L8.817 3.604 C11.114 5.238 13.923 5.991 16.729 5.724 L19.189 5.491 C24.165 5.019 28.894 7.749 30.973 12.294 L32.001 14.541 C33.173 17.105 35.229 19.161 37.793 20.333 L40.04 21.361 C44.585 23.44 47.315 28.17 46.843 33.145 L46.197 39.956 L46.197 64.712 L46.843 71.523 C47.315 76.499 44.585 81.228 40.04 83.307 L37.793 84.335 C35.229 85.508 33.173 87.563 32.001 90.127 L30.973 92.374 C28.894 96.919 24.165 99.649 19.189 99.177 L16.729 98.944 C13.923 98.678 11.114 99.43 8.817 101.064 L6.803 102.496 C4.767 103.944 2.383 104.668 0 104.668'),
  },
  // Glyphs drawn from the base shapes: the same kind of outline with fewer lobes.
  // petals: n round petals around a core (flower base); with many small petals and a big core it is
  // a scalloped rosette (wavy seal base). top: 'petal' puts a petal on the axis, 'gap' a notch.
  petals: {
    label: 'Petals', kind: 'glyph',
    params: { n: 6, ring: 0.55, size: 0.45, core: 0.6, top: 'gap', k: 0.06 },
    gen: (w, h, p) => ({ pts: blobHalf(w, h, petalParts(p), p.k) }),
  },
  // puff: a cloud of n fluffs on a flat base (cushion / cloud base)
  puff: {
    label: 'Puff', kind: 'glyph',
    params: { n: 3, k: 0.1 },
    gen: (w, h, p) => ({ pts: blobHalf(w, h, puffParts(p.n), p.k) }),
  },
  // burst: an n-point star with soft tips, the spiky cousin of the seal
  burst: {
    label: 'Burst', kind: 'glyph',
    params: { n: 8, inner: 0.62, r: 1 },
    gen: (w, h, { n = 8, inner = 0.62, r = 1 }) => {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const a = (i * Math.PI) / n, R = i % 2 ? inner : 1;
        pts.push([Math.max(0, Math.sin(a) * R * (w / 2)), (1 - Math.cos(a) * R) * (h / 2), i % 2 ? r / 2 : r]);
      }
      pts[0][0] = 0; pts[n][0] = 0;
      return { pts, fit: true };
    },
  },
  // the wavy gem has deeper waves than the plate, so it is its own outline
  wavyGem: {
    label: 'Wavy seal (gem)', kind: 'plate', ref: [66.607, 75.094],
    half: P('M0 0 C1.192 0 2.383 0.362 3.402 1.086 L6.97 3.624 C8.118 4.441 9.523 4.817 10.926 4.684 L15.284 4.27 C17.772 4.034 20.137 5.399 21.176 7.672 L22.998 11.653 C23.584 12.935 24.612 13.963 25.894 14.549 L29.875 16.371 C32.148 17.41 33.513 19.775 33.277 22.263 L32.657 28.797 L32.657 46.297 L33.277 52.832 C33.513 55.319 32.148 57.684 29.875 58.724 L25.894 60.545 C24.612 61.131 23.584 62.159 22.998 63.441 L21.176 67.423 C20.137 69.695 17.772 71.06 15.284 70.824 L10.926 70.411 C9.523 70.277 8.118 70.654 6.97 71.471 L3.402 74.008 C2.383 74.732 1.192 75.094 0 75.094'),
  },
};

/* ------------------------------------------------------------------ */
/* Geometry                                                             */
/* ------------------------------------------------------------------ */
// Segment format: { t: 'L', p: [x, y] } | { t: 'C', c1, c2, p }

function parseHalf(d) {
  const tok = d.match(/[MLCHVZ]|-?\d*\.?\d+(?:e-?\d+)?/gi);
  let i = 0, cur = [0, 0], start = null;
  const segs = [];
  const num = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    const c = tok[i++];
    if (c === 'M') { cur = [num(), num()]; start = cur; }
    else if (c === 'L') { cur = [num(), num()]; segs.push({ t: 'L', p: cur }); }
    else if (c === 'H') { cur = [num(), cur[1]]; segs.push({ t: 'L', p: cur }); }
    else if (c === 'V') { cur = [cur[0], num()]; segs.push({ t: 'L', p: cur }); }
    else if (c === 'C') { const c1 = [num(), num()], c2 = [num(), num()]; cur = [num(), num()]; segs.push({ t: 'C', c1, c2, p: cur }); }
  }
  return { start, segs };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const mir = (p) => [-p[0], p[1]];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function splitCubic(p0, c1, c2, p3, t) {
  const a = lerp(p0, c1, t), b = lerp(c1, c2, t), c = lerp(c2, p3, t);
  const d = lerp(a, b, t), e = lerp(b, c, t), m = lerp(d, e, t);
  return [[p0, a, d, m], [m, e, c, p3]];
}

// Right-half polygon with fillets -> right-half segment list (top axis point to bottom axis point)
// Union of circles and rounded boxes in a free unit space, valleys softened with a smooth min (k),
// traced by rays from the part centroid (last exit, so the outline is always one simple loop),
// right half only, scaled to the w x h box. Cached: the same glyph is traced once.
const BLOBS = new Map();
function blobHalf(w, h, parts, k = 0, samples = 120) {
  const key = JSON.stringify([w, h, parts, k]);
  if (BLOBS.has(key)) return BLOBS.get(key);
  const sd = (x, y) => {
    let d = Infinity;
    for (const q of parts) {
      let di;
      if (q.b) {
        const qx = Math.abs(x - q.c[0]) - q.b[0] + q.r, qy = Math.abs(y - q.c[1]) - q.b[1] + q.r;
        di = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - q.r;
      } else di = Math.hypot(x - q.c[0], y - q.c[1]) - q.r;
      if (d === Infinity || k <= 0) d = Math.min(d, di);
      else { const hh = Math.max(k - Math.abs(d - di), 0) / k; d = Math.min(d, di) - (hh * hh * k) / 4; }
    }
    return d;
  };
  const oy = parts.reduce((s, q) => s + q.c[1], 0) / parts.length;
  const R = 4;
  const raw = [];
  for (let i = 0; i <= samples; i++) {
    const a = (i * Math.PI) / samples, dx = Math.sin(a), dy = -Math.cos(a);
    let t = R;
    while (t > 0 && sd(dx * t, oy + dy * t) > 0) t -= 0.01;
    let lo = t, hi = t + 0.01;
    for (let it = 0; it < 20; it++) { const m = (lo + hi) / 2; if (sd(dx * m, oy + dy * m) > 0) hi = m; else lo = m; }
    raw.push([Math.max(0, dx * lo), oy + dy * lo]);
  }
  raw[0][0] = 0; raw[samples][0] = 0;
  const xmax = Math.max(...raw.map((p) => p[0])), y0 = Math.min(...raw.map((p) => p[1])), y1 = Math.max(...raw.map((p) => p[1]));
  const out = raw.map(([x, y]) => [(x / xmax) * (w / 2), ((y - y0) / (y1 - y0)) * h]);
  BLOBS.set(key, out);
  return out;
}
function petalParts({ n = 6, ring = 0.55, size = 0.45, core = 0.6, top = 'gap' }) {
  const parts = core > 0 ? [{ c: [0, 0], r: core }] : [];
  for (let i = 0; i < n; i++) {
    const a = (top === 'gap' ? Math.PI / n : 0) + (2 * Math.PI * i) / n;
    parts.push({ c: [Math.sin(a) * ring, -Math.cos(a) * ring], r: size });
  }
  return parts;
}
// fluffs on a flat base: a big centre fluff (odd n) and pairs stepping down to the sides
function puffParts(n = 3) {
  const L = {
    1: [[0, -0.1, 0.5]],
    2: [[0.3, -0.05, 0.4]],
    3: [[0, -0.16, 0.44], [0.48, 0.08, 0.3]],
    4: [[0.26, -0.14, 0.38], [0.66, 0.1, 0.27]],
    5: [[0, -0.22, 0.4], [0.42, -0.06, 0.32], [0.78, 0.14, 0.22]],
  }[n] || [[0, -0.16, 0.44], [0.48, 0.08, 0.3]];
  const parts = [];
  for (const [x, y, r] of L) { parts.push({ c: [x, y], r }); if (x) parts.push({ c: [-x, y], r }); }
  const span = Math.max(...L.map(([x, , r]) => x + r * 0.55));
  parts.push({ c: [0, 0.24], b: [span, 0.16], r: 0.16 });
  return parts;
}

function filletHalf(pts) {
  const k = pts.length - 1;
  // full closed polygon: right half then mirrored interior points in reverse
  const full = [...pts, ...pts.slice(1, -1).reverse().map(([x, y, r]) => [-x, y, r])];
  const n = full.length;
  const info = full.map(([x, y, r = 0], i) => {
    const V = [x, y], Pp = full[(i - 1 + n) % n], Nn = full[(i + 1) % n];
    const u1 = norm(sub([Pp[0], Pp[1]], V)), u2 = norm(sub([Nn[0], Nn[1]], V));
    const cos = Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]));
    const th = Math.acos(cos);
    const ok = r > 0 && th > 1e-3 && th < Math.PI - 1e-3;
    return { V, u1, u2, th, r: ok ? r : 0, t: ok ? r / Math.tan(th / 2) : 0 };
  });
  // clamp tangent lengths so neighbouring fillets never overlap
  for (let i = 0; i < n; i++) {
    const a = info[i], b = info[(i + 1) % n];
    const L = len(sub(b.V, a.V));
    if (a.t + b.t > L && a.t + b.t > 0) { const s = L / (a.t + b.t); a.cap = Math.min(a.cap ?? 1, s); b.cap = Math.min(b.cap ?? 1, s); }
  }
  for (const v of info) {
    if (!v.t) continue;
    if (v.cap) v.t *= v.cap;
    const r = v.t * Math.tan(v.th / 2);
    const kk = (4 / 3) * Math.tan((Math.PI - v.th) / 4) * r;
    v.T1 = add(v.V, mul(v.u1, v.t)); v.T2 = add(v.V, mul(v.u2, v.t));
    v.C1 = sub(v.T1, mul(v.u1, kk)); v.C2 = sub(v.T2, mul(v.u2, kk));
  }
  const segs = [];
  let start;
  const v0 = info[0];
  if (v0.t) {
    const [, second] = splitCubic(v0.T1, v0.C1, v0.C2, v0.T2, 0.5);
    start = [0, second[0][1]];
    segs.push({ t: 'C', c1: second[1], c2: second[2], p: second[3] });
  } else start = v0.V;
  for (let i = 1; i <= k; i++) {
    const v = info[i];
    if (!v.t) { segs.push({ t: 'L', p: v.V }); continue; }
    segs.push({ t: 'L', p: v.T1 });
    if (i === k) {
      const [first] = splitCubic(v.T1, v.C1, v.C2, v.T2, 0.5);
      segs.push({ t: 'C', c1: first[1], c2: first[2], p: [0, first[3][1]] });
    } else segs.push({ t: 'C', c1: v.C1, c2: v.C2, p: v.T2 });
  }
  return { start, segs };
}

function scaleHalf(h, sx, sy) {
  const s = (p) => [p[0] * sx, p[1] * sy];
  return { start: s(h.start), segs: h.segs.map((g) => (g.t === 'L' ? { t: 'L', p: s(g.p) } : { t: 'C', c1: s(g.c1), c2: s(g.c2), p: s(g.p) })) };
}

function halfBounds(h) {
  let xmax = 0, ymin = Infinity, ymax = -Infinity;
  const pt = (p) => { xmax = Math.max(xmax, p[0]); ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); };
  pt(h.start);
  let prev = h.start;
  for (const g of h.segs) {
    if (g.t === 'L') pt(g.p);
    else for (let i = 1; i <= 24; i++) {
      const t = i / 24, u = 1 - t;
      pt([u * u * u * prev[0] + 3 * u * u * t * g.c1[0] + 3 * u * t * t * g.c2[0] + t * t * t * g.p[0],
          u * u * u * prev[1] + 3 * u * u * t * g.c1[1] + 3 * u * t * t * g.c2[1] + t * t * t * g.p[1]]);
    }
    prev = g.p;
  }
  return { xmax, ymin, ymax };
}

// Build the right half of a shape so its visible bounds are exactly w x h (when fit) in local coords.
export function shapeHalf(name, w, h, params = {}) {
  const hh = shapeHalfRaw(name, w, h, params);
  return params.flip ? flipHalf(hh, h) : hh;
}
function flipHalf(hh, h) {
  const fy = (p) => [p[0], h - p[1]];
  const pts = [hh.start, ...hh.segs.map((g) => g.p)];
  const segs = [];
  for (let i = hh.segs.length - 1; i >= 0; i--) {
    const g = hh.segs[i];
    segs.push(g.t === 'L' ? { t: 'L', p: fy(pts[i]) } : { t: 'C', c1: fy(g.c2), c2: fy(g.c1), p: fy(pts[i]) });
  }
  return { start: fy(pts[pts.length - 1]), segs };
}
function shapeHalfRaw(name, w, h, params = {}) {
  const def = SHAPES[name] || CUSTOM_SHAPES[name];
  if (!def) throw new Error('Unknown shape ' + name);
  if (def.half) {
    const [w0, h0] = def.ref;
    return scaleHalf(def.half, w / w0, h / h0);
  }
  const p = { ...(def.params || {}), ...params };
  let gw = w, gh = h, out, oy = 0;
  for (let it = 0; it < 8; it++) {
    const g = def.gen(gw, gh, p);
    out = filletHalf(g.pts);
    if (!g.fit) break;
    const b = halfBounds(out);
    const bw = b.xmax * 2, bh = b.ymax - b.ymin;
    oy = b.ymin;
    if (Math.abs(bw - w) < 1e-3 && Math.abs(bh - h) < 1e-3) break;
    gw *= w / bw; gh *= h / bh;
  }
  if (oy) out = { start: [out.start[0], out.start[1] - oy], segs: out.segs.map((g) => shiftSeg(g, -oy)) };
  return out;
}
const shiftSeg = (g, dy) => (g.t === 'L' ? { t: 'L', p: [g.p[0], g.p[1] + dy] } : { t: 'C', c1: [g.c1[0], g.c1[1] + dy], c2: [g.c2[0], g.c2[1] + dy], p: [g.p[0], g.p[1] + dy] });

// mirrored reverse of the right half: bottom axis point -> top axis point along the left side
function leftOf(h) {
  const pts = [h.start, ...h.segs.map((g) => g.p)];
  const out = [];
  for (let i = h.segs.length - 1; i >= 0; i--) {
    const g = h.segs[i], to = mir(pts[i]);
    out.push(g.t === 'L' ? { t: 'L', p: to } : { t: 'C', c1: mir(g.c2), c2: mir(g.c1), p: to });
  }
  return { start: mir(pts[pts.length - 1]), segs: out };
}

const f = (v) => +v.toFixed(3);
function segD(segs, ox, oy) {
  return segs.map((g) => g.t === 'L'
    ? `L${f(g.p[0] + ox)} ${f(g.p[1] + oy)}`
    : `C${f(g.c1[0] + ox)} ${f(g.c1[1] + oy)} ${f(g.c2[0] + ox)} ${f(g.c2[1] + oy)} ${f(g.p[0] + ox)} ${f(g.p[1] + oy)}`).join('');
}

// Full outline and left-half path in canvas coords. box = {x, y, w, h}; axis at x + w/2.
export function shapePaths(name, box, params) {
  const h = shapeHalf(name, box.w, box.h, params);
  const ax = box.x + box.w / 2, top = box.y;
  const l = leftOf(h);
  const full = `M${f(h.start[0] + ax)} ${f(h.start[1] + top)}${segD(h.segs, ax, top)}${segD(l.segs, ax, top)}Z`;
  const left = `M${f(l.start[0] + ax)} ${f(l.start[1] + top)}${segD(l.segs, ax, top)}Z`;
  return { full, left, half: h, ax, top };
}

// Polyline of the full outline (canvas coords) for hit testing.
export function flatten(name, box, params, steps = 16) {
  const h = shapeHalf(name, box.w, box.h, params);
  const ax = box.x + box.w / 2, top = box.y;
  const right = [h.start];
  let prev = h.start;
  for (const g of h.segs) {
    if (g.t === 'L') right.push(g.p);
    else for (let i = 1; i <= steps; i++) {
      const t = i / steps, u = 1 - t;
      right.push([u * u * u * prev[0] + 3 * u * u * t * g.c1[0] + 3 * u * t * t * g.c2[0] + t * t * t * g.p[0],
                  u * u * u * prev[1] + 3 * u * u * t * g.c1[1] + 3 * u * t * t * g.c2[1] + t * t * t * g.p[1]]);
    }
    prev = g.p;
  }
  const left = right.slice(1, -1).reverse().map(mir);
  return [...right, ...left].map(([x, y]) => [x + ax, y + top]);
}

function inside(poly, [x, y]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function edgeDist(poly, p) {
  let m = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j], b = poly[i], ab = sub(b, a), ap = sub(p, a);
    const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1]) / (ab[0] * ab[0] + ab[1] * ab[1] || 1)));
    m = Math.min(m, len(sub(p, add(a, mul(ab, t)))));
  }
  return m;
}

/* ------------------------------------------------------------------ */
/* Level dots                                                           */
/* ------------------------------------------------------------------ */
// Rule: every dot sits on the same line, the plate outline moved `inset` px inwards (default 5,
// measured to the dot centre), so all dots are the same distance from the plate edge.
// Along that line the dots are spaced evenly by length, not by angle:
//   odd N  -> one dot at bottom centre, the rest mirrored pairs
//   even N -> starts a quarter of the way round (the sides), so 4 dots = top, bottom, sides
//   'split' shifts everything half a step (odd: the single dot goes to the top)
//   'anchored' always starts at bottom centre
// Stretches of the line that are covered by the gem (or within 3 px of it) are skipped, so a dot
// is never drawn on top of the gem. Dots snap to whole pixels and are mirrored, so every badge
// with the same plate and gem gets identical dots.
export const DOT_INSET = 5, DOT_CLEAR = 3;
const DOT_TRACKS = new Map();
function dotTrack(plate, gem, inset, clear) {
  const key = JSON.stringify([plate.shape, plate.w, plate.h, plate.y, plate.x, plate.params, gem && [gem.shape, gem.w, gem.h, gem.y, gem.x, gem.params], inset, clear]);
  if (DOT_TRACKS.has(key)) return DOT_TRACKS.get(key);
  const ppoly = flatten(plate.shape, boxOf(plate), plate.params, 32);
  const gpoly = gem ? flatten(gem.shape, boxOf(gem), gem.params, 32) : null;
  const hr = halfFromRing(sdfRing(ppoly, -inset, 0.25), CX, 0.01);
  let track = null;
  if (hr) {
    // right half of the inset line, bottom centre -> top centre, resampled every 0.25 px
    const raw = [hr.half.start, ...hr.half.segs.map((g) => g.p)].map(([x, y]) => [CX + x, hr.top + y]).reverse();
    const pts = [raw[0]];
    for (let i = 1; i < raw.length; i++) {
      const a = raw[i - 1], b = raw[i], n = Math.max(1, Math.ceil(len(sub(b, a)) / 0.25));
      for (let k = 1; k <= n; k++) pts.push(lerp(a, b, k / n));
    }
    const free = pts.map((p) => !gpoly || (!inside(gpoly, p) && edgeDist(gpoly, p) >= clear));
    const cum = [0]; // free length up to each sample
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + (free[i] && free[i - 1] ? len(sub(pts[i], pts[i - 1])) : 0));
    track = { pts, free, cum, half: cum[cum.length - 1], ppoly, gpoly };
  }
  DOT_TRACKS.set(key, track);
  return track;
}
// whole-pixel dot centre next to p that keeps the edge distance closest to the inset
function snapDot(T, p, inset, clear, onAxis) {
  const near = (v) => [Math.floor(v) - 1, Math.floor(v), Math.ceil(v), Math.ceil(v) + 1];
  const xs = onAxis ? [CX] : near(p[0]);
  let best = null, bestErr = Infinity;
  for (const x of xs) for (const y of near(p[1])) {
    const c = [x, y];
    if (!inside(T.ppoly, c)) continue;
    if (T.gpoly && (inside(T.gpoly, c) || edgeDist(T.gpoly, c) < clear - 0.5)) continue;
    const err = Math.abs(edgeDist(T.ppoly, c) - inset) + 0.12 * len(sub(c, p));
    if (err < bestErr) { bestErr = err; best = c; }
  }
  return best || [onAxis ? CX : Math.round(p[0]), Math.round(p[1])];
}
export function dotPositions(spec) {
  spec = resolveDerived(spec);
  const n = spec.level | 0;
  if (!n || !spec.plate) return [];
  const inset = spec.dotInset ?? DOT_INSET, clear = spec.dotClear ?? DOT_CLEAR;
  const T = dotTrack(spec.plate, spec.gem, inset, clear);
  if (!T || T.half <= 0) return [];
  const Lf = 2 * T.half, step = Lf / n;
  const phase = spec.dotPhase || 'auto';
  let s0 = phase === 'anchored' || n % 2 ? 0 : Lf / 4;
  if (phase === 'split') s0 += step / 2;
  // free length -> point on the right half (the left half is its mirror)
  const at = (u) => {
    let i = 1;
    while (i < T.pts.length - 1 && T.cum[i] < u) i++;
    const a = T.pts[i - 1], b = T.pts[i], seg = T.cum[i] - T.cum[i - 1];
    return seg > 0 ? lerp(a, b, Math.max(0, Math.min(1, (u - T.cum[i - 1]) / seg))) : b;
  };
  const eps = 1e-6;
  // a dot meant for the centre line must land there; if the gem covers that spot, shift half a step
  const axisBlocked = (s) => {
    const u = ((s % Lf) + Lf) % Lf;
    if (u > eps && Math.abs(u - T.half) > eps && Math.abs(u - Lf) > eps) return false;
    return Math.abs(at(Math.abs(u - T.half) < eps ? T.half : 0)[0] - CX) > 0.5;
  };
  if (Array.from({ length: n }, (_, k) => s0 + k * step).some(axisBlocked)) s0 += step / 2;
  const out = [];
  for (let k = 0; k < n; k++) {
    let u = (((s0 + k * step) % Lf) + Lf) % Lf;
    if (Math.abs(u - Lf) < eps) u = 0;
    if (u > T.half + eps) continue; // left side comes from mirroring
    const onAxis = u < eps || Math.abs(u - T.half) < eps;
    const [x, y] = snapDot(T, at(u), inset, clear, onAxis);
    out.push([x - 1, y - 1]);
    if (!onAxis) out.push([SIZE - x - 1, y - 1]);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* SVG rendering                                                        */
/* ------------------------------------------------------------------ */
let UID = 0;
export function boxOf(el) {
  const w = el.w, h = el.h;
  const x = CX - w / 2 + (el.x || 0);
  const y = el.y ?? CX - h / 2;
  return { x, y, w, h };
}

const hexA = (hex, a = 1) => (a >= 1 ? hex : hex);
function stopsXml(stops) {
  return stops.map(([o, c, a = 1]) => `<stop offset="${f(o)}" stop-color="${c}"${a < 1 ? ` stop-opacity="${f(a)}"` : ''}/>`).join('');
}
// Figma keeps a gradient as handles in the layer's own 0..1 space and only turns them into
// pixel end points on export, keeping the stripes perpendicular in that 0..1 space. The palette
// end points were measured from exports of one box (the 58 x 66 hex gem, 29 x 66 for its half),
// so with ref set they are turned back into handles and re-exported for this box. Same box = same
// numbers; other proportions (a 76 x 76 cushion, an 84 x 70 brilliant) now match Figma too.
const GEM_REF = [58, 66], HALF_REF = [29, 66];
function linGrad(id, box, from, to, stops, ref) {
  const x1 = box.x + from[0] * box.w, y1 = box.y + from[1] * box.h;
  let x2 = box.x + to[0] * box.w, y2 = box.y + to[1] * box.h;
  if (ref) {
    const [rw, rh] = ref, vx = (to[0] - from[0]) * rw, vy = (to[1] - from[1]) * rh, L = Math.hypot(vx, vy);
    if (L > 1e-9) {
      const ux = vx / L, uy = vy / L, k = L / ((ux * ux * rw) / rh + (uy * uy * rh) / rw);
      const dx = (k * ux) / rh, dy = (k * uy) / rw; // handle delta in 0..1 space
      let gx = dx * box.h, gy = dy * box.w; const gl = Math.hypot(gx, gy); gx /= gl; gy /= gl;
      const Lp = dx * box.w * gx + dy * box.h * gy;
      x2 = x1 + Lp * gx; y2 = y1 + Lp * gy;
    }
  }
  return `<linearGradient id="${id}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" gradientUnits="userSpaceOnUse">${stopsXml(stops)}</linearGradient>`;
}
const bevelStops = [[0, '#000000', 1], [1, '#FFFFFF', 1]];
const GLASS = [[0, '#FFFFFF', 1], [0.395, '#FFFFFF', 0.01], [0.465, '#FFFFFF', 0.01], [1, '#FFFFFF', 1]];
// Two glyph lighting presets found in the Figma file:
//   center (A, I rows): glass highlight across the middle, bevel gradient spans the glyph box.
//   high   (B, C, H rows): highlight sits high, bevel gradient lifted 27% so the lower edge reads brighter.
export const LIGHTS = {
  center: { label: 'Center', from: [0.719, 0.276], to: [0.253, 0.83], lift: 0 },
  high: { label: 'High', from: [0.755, 0.01], to: [0.215, 0.557], lift: 0.27 },
};

// Bezel facet shading measured from the Figma K_5 gold setting, as [saturation, lightness] at the
// two ends of each facet's gradient. The hue comes from the palette and saturation scales with it,
// so a silver or purple bezel gets the same light. ur/ul = upper facets, lr/ll = lower facets.
const BEZEL = {
  top: { from: [0, 0.5], to: [1, 0.5], c: [[80, 78], [68, 57]] },
  ul: { from: [1, 0], to: [0, 1], c: [[92, 69], [100, 41]] },
  ur: { from: [1, 0], to: [0, 1], c: [[82, 79], [76, 92]] },
  ll: { from: [1, 0], to: [0, 1], c: [[72, 67], [67, 50]] },
  lr: { from: [0, 0], to: [0.3, 1], c: [[51, 66], [81, 37]] },
};

/* exact blend maths (sRGB, as Figma composites) used to bake the facet for browsers */
function rgb(h) { return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); }
function hex(c) { return '#' + c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase(); }
const BLEND = {
  normal: (d, s) => s,
  multiply: (d, s) => d * s,
  screen: (d, s) => 1 - (1 - d) * (1 - s),
  overlay: (d, s) => (d <= 0.5 ? 2 * d * s : 1 - 2 * (1 - d) * (1 - s)),
  darken: (d, s) => Math.min(d, s),
  lighten: (d, s) => Math.max(d, s),
};
export function applyFill(D, fl) {
  const S = rgb(fl.color), a = fl.alpha ?? 1;
  // Figma's linear burn / linear dodge are premultiplied: black at a subtracts a.
  if (fl.blend === 'plus-darker') return D.map((d, i) => Math.max(0, d - a * (1 - S[i])));
  if (fl.blend === 'plus-lighter') return D.map((d, i) => Math.min(1, d + a * S[i]));
  const B = BLEND[fl.blend || 'normal'] || BLEND.normal;
  return D.map((d, i) => d * (1 - a) + a * B(d, S[i]));
}
function sampleStops(stops, t) {
  if (t <= stops[0][0]) return rgb(stops[0][1]);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [o0, c0] = stops[i - 1], [o1, c1] = stops[i];
      const k = (t - o0) / (o1 - o0 || 1), A = rgb(c0), Bc = rgb(c1);
      return A.map((v, j) => v + (Bc[j] - v) * k);
    }
  }
  return rgb(stops[stops.length - 1][1]);
}
export function bakeStops(stops, fills, n = 48) {
  const ts = new Set(stops.map((s) => s[0]));
  for (let i = 0; i <= n; i++) ts.add(i / n);
  return [...ts].sort((a, b) => a - b).map((t) => {
    let c = sampleStops(stops, t);
    for (const fl of fills) c = applyFill(c, fl);
    return [t, hex(c), 1];
  });
}
const blendStyle = (b) => (b && b !== 'normal' ? ` style="mix-blend-mode:${b}"` : '');

// right half of a shape as its own closed path (mirror image of the left facet)
function moveRight(sp) {
  const h = sp.half;
  return `M${f(h.start[0] + sp.ax)} ${f(h.start[1] + sp.top)}${segD(h.segs, sp.ax, sp.top)}Z`;
}
export function renderBadge(spec, opts = {}) {
  spec = resolveDerived(spec);
  const id = 'hb' + (++UID).toString(36);
  const pal = spec.customColor ? paletteFromColor(spec.customColor) : (PALETTES[spec.rarity] || PALETTES.silver);
  const defs = [];
  const body = [];
  let gid = 0;
  const nid = (s) => `${id}${s}${++gid}`;
  const bg = opts.background ?? spec.background ?? '#000000';
  if (bg && bg !== 'none') body.push(`<rect width="${SIZE}" height="${SIZE}" fill="${bg}"/>`);

  // bevel stroke: 1px, black (top) to white (bottom), overlay. inside or outside the shape.
  const bevel = (d, box, where = 'inside', lift = 0) => {
    const cid = nid('c'), gidd = nid('g');
    defs.push(linGrad(gidd, box, [0.5, -lift], [0.5, 1 - lift], bevelStops));
    if (where === 'inside') defs.push(`<clipPath id="${cid}"><path d="${d}"/></clipPath>`);
    else defs.push(`<clipPath id="${cid}"><path d="M-10 -10H${SIZE + 10}V${SIZE + 10}H-10Z${d}" clip-rule="evenodd" fill-rule="evenodd"/></clipPath>`);
    body.push(`<path d="${d}" fill="none" stroke="url(#${gidd})" stroke-width="2" clip-path="url(#${cid})" style="mix-blend-mode:overlay"/>`);
  };

  // ---- plate
  const pl = spec.plate;
  const pbox = boxOf(pl);
  const pp = shapePaths(pl.shape, pbox, pl.params);
  {
    const rg = nid('r');
    const m = [-0.24603 * pbox.w, 0.25 * pbox.h, -0.73406 * pbox.w, -0.40635 * pbox.h, pbox.x + pbox.w / 2, pbox.y + pbox.h / 2].map(f);
    defs.push(`<radialGradient id="${rg}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(${m.join(' ')})"><stop stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>`);
    const tint = pl.tint || pal.plate;
    body.push(`<path d="${pp.full}" fill="${tint.color}" fill-opacity="${tint.alpha}"/>`);
    body.push(`<path d="${pp.full}" fill="url(#${rg})" fill-opacity="0.2"/>`);
    bevel(pp.full, pbox, 'inside');
  }

  // gem: palette gradient, inside bevel, then the left facet (split) with its own bevel
  // faceted bezel (Figma K_5): the gem as a frame of flat facets between its outline and an inner one
  const drawBezel = (el, P, dx = 0) => {
    const gbox = boxOf({ ...el, x: (el.x || 0) + dx });
    const ib = el.bezel, ibox = boxOf({ ...ib, x: (ib.x || 0) + dx });
    const def = SHAPES[el.shape];
    const O = def.gen(gbox.w, gbox.h, { ...(def.params || {}), ...(el.params || {}) }).pts.map(([x, y]) => [gbox.x + gbox.w / 2 + x, gbox.y + y]);
    const I = def.gen(ibox.w, ibox.h, { ...(def.params || {}), ...(ib.params || {}) }).pts.map(([x, y]) => [ibox.x + ibox.w / 2 + x, ibox.y + y]);
    const m = (p) => [2 * (gbox.x + gbox.w / 2) - p[0], p[1]];
    const [hue, sat, lit] = hexToHsl(P.gem.stops[0][1]);
    const col = ([S, L]) => hsl(hue, Math.min(100, (S * sat) / 65), Math.max(0, Math.min(100, L + lit - 51)));
    const facets = [];
    for (let i = 0; i < O.length - 1; i++) {
      const d = sub(O[i + 1], O[i]), n = norm([d[1], -d[0]]);
      const role = Math.abs(n[0]) < 0.2 && n[1] < 0 ? 'top' : n[1] < 0 ? 'u' : 'l';
      if (Math.abs(O[i][0] - (gbox.x + gbox.w / 2)) < 1e-6 && role === 'top') {
        facets.push(['top', [m(O[i + 1]), O[i + 1], I[i + 1], m(I[i + 1])]]);
      } else {
        const q = [O[i], O[i + 1], I[i + 1], I[i]];
        facets.push([role + 'r', q], [role + 'l', q.map(m)]);
      }
    }
    for (const [role, q] of facets) {
      const sh = BEZEL[role];
      const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
      const fb = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      const d = `M${q.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}Z`;
      const lg = nid('z');
      defs.push(linGrad(lg, fb, sh.from, sh.to, [[0, col(sh.c[0]), 1], [1, col(sh.c[1]), 1]]));
      body.push(`<path d="${d}" fill="url(#${lg})"/>`);
      bevel(d, fb, 'inside');
    }
    // the stone: a normal gem in the inner outline, in the badge colour unless bezel.stone names one
    const { stone, ...inner } = ib;
    drawGem({ shape: el.shape, split: el.split, ...inner, x: (ib.x || 0) + dx }, PALETTES[stone] || P);
  };
  const drawGem = (el, P, dx = 0) => {
    if (el.bezel) return drawBezel(el, P, dx);
    const gbox = boxOf({ ...el, x: (el.x || 0) + dx });
    const gp = shapePaths(el.shape, gbox, el.params);
    const gg = nid('l');
    defs.push(linGrad(gg, gbox, P.gem.from, P.gem.to, P.gem.stops, GEM_REF));
    body.push(`<path d="${gp.full}" fill="url(#${gg})"/>`);
    bevel(gp.full, gbox, 'inside');
    if (el.split !== false) {
      const hbox = { x: gbox.x, y: gbox.y, w: gbox.w / 2, h: gbox.h };
      if (opts.target === 'figma') {
        // native layer stack, exactly as built in Figma
        for (const fl of P.half) {
          if (fl.type === 'linear') {
            const hg = nid('h');
            const stops = fl.stops === 'gem' ? P.gem.stops : fl.stops;
            defs.push(linGrad(hg, fl.space === 'half' ? hbox : gbox, fl.from, fl.to, stops, fl.space === 'half' ? HALF_REF : GEM_REF));
            body.push(`<path d="${gp.left}" fill="url(#${hg})"${blendStyle(fl.blend)}/>`);
          } else {
            body.push(`<path d="${gp.left}" fill="${fl.color}" fill-opacity="${fl.alpha}"${blendStyle(fl.blend)}/>`);
          }
        }
      } else {
        // bake: base gradient (a normal linear repaint, or the gem itself) + every solid blend on top
        let fills = P.half, base = { stops: P.gem.stops, box: gbox, from: P.gem.from, to: P.gem.to, ref: GEM_REF };
        const f0 = fills[0];
        if (f0 && f0.type === 'linear' && (!f0.blend || f0.blend === 'normal')) {
          base = { stops: f0.stops === 'gem' ? P.gem.stops : f0.stops, box: f0.space === 'half' ? hbox : gbox, from: f0.from, to: f0.to, ref: f0.space === 'half' ? HALF_REF : GEM_REF };
          fills = fills.slice(1);
        }
        const hg = nid('h');
        defs.push(linGrad(hg, base.box, base.from, base.to, bakeStops(base.stops, fills), base.ref));
        body.push(`<path d="${gp.left}" fill="url(#${hg})"/>`);
      }
      bevel(gp.left, gbox, 'inside');
    }
  };
  if (spec.gem) drawGem(spec.gem, PALETTES[spec.gem.rarity] || pal);

  // ---- glyphs (centred, or mirrored pairs with x offset).
  // A glyph with parts[] is a compound: one outline, one glass gradient and one bevel across all parts.
  for (const g of spec.glyphs || []) {
    const xs = g.x ? [g.x, -g.x] : [0];
    for (const x of xs) {
      if (g.style === 'inlay') { drawGem(g, PALETTES[g.rarity] || pal, x); continue; }
      const { d, box } = glyphGeometry(g, x);
      const style = g.style || 'glass';
      const light = LIGHTS[g.light] || LIGHTS.center;
      if (style === 'glass' || style === 'glass-tint') {
        const lg = nid('q');
        let stops = GLASS;
        if (style === 'glass-tint') {
          const [mid, deep] = pal.glassTint;
          stops = [[0, '#FFFFFF', 1], [0.144, mid, 1], [0.395, deep, 0], [0.465, deep, 0.01], [0.854, mid, 1], [1, '#FFFFFF', 1]];
        }
        defs.push(linGrad(lg, box, light.from, light.to, stops));
        // fill: a white base under the glass, so the glyph reads as a solid crystal (Figma K_5)
        if (g.fill) body.push(`<path d="${d}" fill="#FFFFFF" fill-opacity="${g.fill}"${g.evenodd ? ' fill-rule="evenodd"' : ''}/>`);
        body.push(`<path d="${d}" fill="url(#${lg})"${g.evenodd ? ' fill-rule="evenodd"' : ''}/>`);
        // shade: the right half darkened a little, the crystal's own facet split
        if (g.shade) { const hp = shapePaths(g.shape, box, g.params); body.push(`<path d="${moveRight(hp)}" fill="#000000" fill-opacity="${g.shade}" style="mix-blend-mode:overlay"/>`); }
      } else if (style === 'recess') {
        body.push(`<path d="${d}" fill="#000000" fill-opacity="${g.alpha ?? 0.49}"${g.evenodd ? ' fill-rule="evenodd"' : ''}${blendStyle(g.blend)}/>`);
      } else if (style === 'solid') {
        body.push(`<path d="${d}" fill="${g.color || '#FFFFFF'}" fill-opacity="${g.alpha ?? 1}"${blendStyle(g.blend)}/>`);
      }
      if (g.bevel !== false) bevel(d, box, 'outside', light.lift);
    }
  }

  // ---- ornaments
  const orn = spec.ornaments || {};
  if (orn.bottomChevron) {
    // the plate outline, inset, only its bottom 10% visible (Figma C_5)
    const ob = { x: pbox.x + 2, y: pbox.y, w: pbox.w - 4, h: pbox.h - 4 };
    const op = shapePaths(pl.shape, ob, pl.params);
    const cid = nid('c'), lg = nid('v');
    defs.push(`<clipPath id="${cid}"><path d="${op.full}"/></clipPath>`);
    defs.push(linGrad(lg, ob, [0.5, 0], [0.5, 1], [[0.9, '#FFFFFF', 0], [0.9008, '#FFFFFF', 1]]));
    body.push(`<path d="${op.full}" fill="none" stroke="url(#${lg})" stroke-width="2" clip-path="url(#${cid})"/>`);
  }
  if (orn.topBar) {
    const tb = orn.topBar === true ? {} : orn.topBar;
    const w = tb.w ?? 6, y = tb.y ?? pbox.y + 4;
    body.push(`<rect x="${CX - w / 2}" y="${y}" width="${w}" height="1" fill="#FFFFFF"${tb.alpha ? ` fill-opacity="${tb.alpha}"` : ''}/>`);
  }
  if (orn.edgeBars) {
    // four short lines, top, bottom, left and right, `inset` px inside the plate's box (G_12)
    const eb = orn.edgeBars === true ? {} : orn.edgeBars;
    const w = eb.w ?? 6, i = eb.inset ?? 4, a = eb.alpha ? ` fill-opacity="${eb.alpha}"` : '';
    const top = pbox.y + i, bot = pbox.y + pbox.h - i - 1, lft = pbox.x + i, rgt = pbox.x + pbox.w - i - 1;
    body.push(`<rect x="${f(CX - w / 2)}" y="${f(top)}" width="${w}" height="1" fill="#FFFFFF"${a}/>`);
    body.push(`<rect x="${f(CX - w / 2)}" y="${f(bot)}" width="${w}" height="1" fill="#FFFFFF"${a}/>`);
    body.push(`<rect x="${f(lft)}" y="${f(CX - w / 2)}" width="1" height="${w}" fill="#FFFFFF"${a}/>`);
    body.push(`<rect x="${f(rgt)}" y="${f(CX - w / 2)}" width="1" height="${w}" fill="#FFFFFF"${a}/>`);
  }
  if (orn.sideArrows) {
    // the outer tips of a large star outline: only the last `show` px on each side are visible (Figma K_3/K_4)
    const sa = orn.sideArrows === true ? {} : orn.sideArrows;
    const w = sa.w ?? 80, h = sa.h ?? 110, show = sa.show ?? (5.36 * w) / 80;
    const ob = boxOf({ w, h });
    const op = shapePaths(sa.shape || 'sparkle', ob, sa.params);
    const ci = nid('c'), cs = nid('c');
    defs.push(`<clipPath id="${ci}"><path d="${op.full}"/></clipPath>`);
    defs.push(`<clipPath id="${cs}"><rect x="0" y="0" width="${f(ob.x + show)}" height="${SIZE}"/><rect x="${f(ob.x + w - show)}" y="0" width="${f(SIZE - ob.x - w + show)}" height="${SIZE}"/></clipPath>`);
    body.push(`<g clip-path="url(#${cs})"><path d="${op.full}" fill="none" stroke="#FFFFFF" stroke-width="2" clip-path="url(#${ci})"/></g>`);
  }

  // ---- level dots
  for (const [x, y] of dotPositions(spec)) body.push(`<rect x="${x}" y="${y}" width="2" height="2" fill="#FFFFFF"/>`);

  const scale = opts.scale || 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE * scale}" height="${SIZE * scale}" viewBox="0 0 ${SIZE} ${SIZE}" fill="none"><defs>${defs.join('')}</defs>${body.join('')}</svg>`;
}

// Level numbers: PolySans digits as paths. g.text, g.h = cap height in px, g.y = top of the caps,
// g.font = 'wide' | 'bulky', g.track = extra spacing in font units.
function moveD(d, sx, ox, oy) {
  const t = d.match(/[MLHVCQZ]|-?\d*\.?\d+/g);
  let out = '', i = 0, cmd = '';
  const X = (v) => f(+v * sx + ox), Y = (v) => f(+v * sx + oy);
  while (i < t.length) {
    if (/[A-Z]/.test(t[i])) { cmd = t[i++]; out += cmd; if (cmd === 'Z') continue; }
    if (cmd === 'H') out += X(t[i++]) + ' ';
    else if (cmd === 'V') out += Y(t[i++]) + ' ';
    else { out += X(t[i++]) + ' ' + Y(t[i++]) + ' '; }
  }
  return out.replace(/ ([A-Z])/g, '$1').trim();
}
export function textGeometry(g, x = 0) {
  const F = DIGIT_FONTS[g.font || 'wide'];
  const chars = String(g.text ?? '').split('').filter((c) => F.glyphs[c]);
  if (!chars.length) return { d: '', box: { x: CX, y: g.y ?? 60, w: 0, h: 0 } };
  const s = g.h / F.cap, track = g.track ?? -24;
  let pen = 0;
  const pos = chars.map((c, i) => { const p = pen; pen += F.glyphs[c].adv + (i < chars.length - 1 ? track : 0); return p; });
  const x0 = pos[0] + F.glyphs[chars[0]].x0, x1 = pos[pos.length - 1] + F.glyphs[chars[chars.length - 1]].x1;
  const left = CX + x - ((x1 - x0) * s) / 2 - x0 * s;
  const top = g.y ?? CX - g.h / 2;
  const d = chars.map((c, i) => moveD(F.glyphs[c].d, s, left + pos[i] * s, top)).join('');
  return { d, box: { x: left + x0 * s, y: top, w: (x1 - x0) * s, h: g.h } };
}

export function glyphGeometry(g, x = 0) {
  if (g.text != null) return textGeometry(g, x);
  const parts = g.parts || [{ ...g, x: 0 }];
  const ds = [], boxes = [];
  for (const p of parts) {
    const box = boxOf({ ...p, x: (p.x || 0) + x });
    const d = shapePaths(p.shape, box, p.params).full;
    // rot: degrees around the part's centre; the mirrored copy (x < 0) turns the other way
    const rot = p.rot ?? g.rot;
    if (rot) {
      const a = ((x < 0 ? -rot : rot) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
      const ox = box.x + box.w / 2, oy = box.y + box.h / 2;
      const R = (px, py) => [ox + (px - ox) * c - (py - oy) * s, oy + (px - ox) * s + (py - oy) * c];
      ds.push(d.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (m, px, py) => R(+px, +py).map((v) => +v.toFixed(3)).join(' ')));
      const cs = [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]].map(([px, py]) => R(px, py));
      const bx0 = Math.min(...cs.map((q) => q[0])), by0 = Math.min(...cs.map((q) => q[1]));
      boxes.push({ x: bx0, y: by0, w: Math.max(...cs.map((q) => q[0])) - bx0, h: Math.max(...cs.map((q) => q[1])) - by0 });
      continue;
    }
    ds.push(d);
    boxes.push(box);
  }
  const x0 = Math.min(...boxes.map((b) => b.x)), y0 = Math.min(...boxes.map((b) => b.y));
  const x1 = Math.max(...boxes.map((b) => b.x + b.w)), y1 = Math.max(...boxes.map((b) => b.y + b.h));
  return { d: ds.join(''), box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } };
}

/* ------------------------------------------------------------------ */
/* Derived outlines: plate grown around the gem, recess shrunk inside it */
/* ------------------------------------------------------------------ */
// { of: 'gem', d: 12, smooth: 6 } on the plate = the gem outline grown by d px; smooth > 0 also fills
// notches narrower than about 2 x smooth (a morphological closing), so a crown gets a calm plate.
// On a glyph, { of: 'gem', d: -9 } = the gem shrunk by 9 px (an inset recess like the Figma B row).
// Computed with a signed distance field + marching squares, then the right half is kept and mirrored.

function ringOf(el) {
  if (el.ring) return el.ring;
  return flatten(el.shape, boxOf(el), el.params, 32);
}
function sdfRing(poly, d, res = 0.5) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const m = Math.max(0, d) + 2;
  x0 -= m; y0 -= m; x1 += m; y1 += m;
  const nx = Math.ceil((x1 - x0) / res) + 1, ny = Math.ceil((y1 - y0) / res) + 1;
  const F = new Float32Array(nx * ny);
  const n = poly.length;
  for (let j = 0; j < ny; j++) {
    const y = y0 + j * res;
    // scanline crossings for the inside test
    const xs = [];
    for (let a = 0, b = n - 1; a < n; b = a++) {
      const [xa, ya] = poly[a], [xb, yb] = poly[b];
      if ((ya > y) !== (yb > y)) xs.push(xa + ((y - ya) * (xb - xa)) / (yb - ya));
    }
    xs.sort((p, q) => p - q);
    let k = 0, ins = false;
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * res;
      while (k < xs.length && xs[k] < x) { ins = !ins; k++; }
      let best = Infinity;
      for (let a = 0, b = n - 1; a < n; b = a++) {
        const ax = poly[b][0], ay = poly[b][1], bx = poly[a][0] - ax, by = poly[a][1] - ay;
        const t = Math.max(0, Math.min(1, ((x - ax) * bx + (y - ay) * by) / (bx * bx + by * by || 1)));
        const dx = x - ax - bx * t, dy = y - ay - by * t, dd = dx * dx + dy * dy;
        if (dd < best) best = dd;
      }
      F[j * nx + i] = (ins ? -Math.sqrt(best) : Math.sqrt(best)) - d;
    }
  }
  // marching squares on F = 0, chained into loops
  const pt = new Map(), adj = new Map();
  const P = (i, j) => [x0 + i * res, y0 + j * res];
  const edgePt = (key, a, b, va, vb) => {
    if (!pt.has(key)) { const t = va / (va - vb); pt.set(key, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    return key;
  };
  const link = (u, v) => { (adj.get(u) || adj.set(u, []).get(u)).push(v); (adj.get(v) || adj.set(v, []).get(v)).push(u); };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const v0 = F[j * nx + i], v1 = F[j * nx + i + 1], v2 = F[(j + 1) * nx + i + 1], v3 = F[(j + 1) * nx + i];
    const c = (v0 < 0 ? 1 : 0) | (v1 < 0 ? 2 : 0) | (v2 < 0 ? 4 : 0) | (v3 < 0 ? 8 : 0);
    if (c === 0 || c === 15) continue;
    const T = () => edgePt(`h${i},${j}`, P(i, j), P(i + 1, j), v0, v1);
    const R = () => edgePt(`v${i + 1},${j}`, P(i + 1, j), P(i + 1, j + 1), v1, v2);
    const B = () => edgePt(`h${i},${j + 1}`, P(i, j + 1), P(i + 1, j + 1), v3, v2);
    const L = () => edgePt(`v${i},${j}`, P(i, j), P(i, j + 1), v0, v3);
    const centre = (v0 + v1 + v2 + v3) / 4 < 0;
    switch (c) {
      case 1: case 14: link(L(), T()); break;
      case 2: case 13: link(T(), R()); break;
      case 3: case 12: link(L(), R()); break;
      case 4: case 11: link(R(), B()); break;
      case 6: case 9: link(T(), B()); break;
      case 7: case 8: link(L(), B()); break;
      case 5: if (centre) { link(L(), T()); link(R(), B()); } else { link(L(), B()); link(T(), R()); } break;
      case 10: if (centre) { link(T(), R()); link(L(), B()); } else { link(L(), T()); link(R(), B()); } break;
    }
  }
  const seen = new Set(), loops = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let prev = null, cur = start;
    while (cur && !seen.has(cur)) {
      seen.add(cur); loop.push(pt.get(cur));
      const nb = adj.get(cur).find((q) => q !== prev && !seen.has(q));
      prev = cur; cur = nb;
    }
    loops.push(loop);
  }
  const area = (l) => Math.abs(l.reduce((a, p, i) => { const q = l[(i + 1) % l.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
  return loops.sort((a, b) => area(b) - area(a))[0] || [];
}
function rdpPts(pts, eps) {
  if (pts.length < 3) return pts;
  const a = pts[0], b = pts[pts.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  let idx = 0, max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const dd = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L;
    if (dd > max) { max = dd; idx = i; }
  }
  if (max <= eps) return [a, b];
  return [...rdpPts(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdpPts(pts.slice(idx), eps)];
}
// right half of a closed ring around the vertical line x = cx, mirrored into a shape definition
export function halfFromRing(pts, cx, eps = 0.04) {
  const ys = pts.map((p) => p[1]);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const ring = [], cross = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    ring.push(a);
    const da = a[0] - cx, db = b[0] - cx;
    if (da !== 0 && da * db < 0) { const t = da / (da - db); cross.push(ring.length); ring.push([cx, a[1] + (b[1] - a[1]) * t]); }
    else if (da === 0) cross.push(ring.length - 1);
  }
  if (cross.length < 2) return null;
  const top = cross.reduce((m, i) => (ring[i][1] < ring[m][1] ? i : m), cross[0]);
  const bot = cross.reduce((m, i) => (ring[i][1] > ring[m][1] ? i : m), cross[0]);
  const walk = (from, to) => { const out = []; let i = from; for (;;) { out.push(ring[i]); if (i === to) break; i = (i + 1) % ring.length; } return out; };
  const A = walk(top, bot), B = walk(bot, top).reverse();
  const mean = (c) => c.reduce((sum, p) => sum + p[0] - cx, 0) / c.length;
  let half = (mean(A) >= mean(B) ? A : B).map(([x, y]) => [Math.max(0, x - cx), y - y0]);
  half[0][0] = 0; half[half.length - 1][0] = 0;
  half = rdpPts(half, eps);
  const w = 2 * Math.max(...half.map((p) => p[0]));
  return { ref: [w, y1 - y0], top: y0, half: { start: half[0], segs: half.slice(1).map((p) => ({ t: 'L', p })) } };
}
const DERIVED = new Map();
function derive(base, d, smooth = 0) {
  const key = JSON.stringify([base.shape, base.w, base.h, base.y, base.x, base.params, base.of && base.d, d, smooth]);
  if (DERIVED.has(key)) return DERIVED.get(key);
  let ring = ringOf(base);
  if (smooth > 0) { ring = sdfRing(ring, d + smooth); ring = sdfRing(ring, -smooth); } else ring = sdfRing(ring, d);
  const h = halfFromRing(ring, CX);
  if (!h) return null;
  const name = `~d${DERIVED.size}`;
  CUSTOM_SHAPES[name] = { label: 'Derived', kind: 'derived', ref: h.ref, half: h.half };
  const el = { shape: name, w: h.ref[0], h: h.ref[1], y: h.top };
  DERIVED.set(key, el);
  return el;
}
// replace { of: 'gem' | 'plate', d, smooth } elements with concrete derived shapes
export function resolveDerived(spec) {
  const needs = (e) => e && e.of;
  if (!needs(spec.plate) && !(spec.glyphs || []).some(needs) && !needs(spec.gem)) return spec;
  const out = { ...spec };
  if (needs(out.gem) && out.gem.of === 'plate') out.gem = { ...out.gem, ...derive(out.plate, out.gem.d ?? -12, out.gem.smooth) };
  if (needs(out.plate)) out.plate = { ...out.plate, ...derive(out.gem, out.plate.d ?? 12, out.plate.smooth ?? 0) };
  out.glyphs = (out.glyphs || []).map((g) => (needs(g) ? { ...g, ...derive(g.of === 'plate' ? out.plate : out.gem, g.d ?? -9, g.smooth) } : g));
  return out;
}

// user-imported shapes (right half paths), registered at runtime
export const CUSTOM_SHAPES = {};
export function registerShape(name, def) { CUSTOM_SHAPES[name] = def; }
export { parseHalf };
