// Themed silhouettes: the gem IS the icon (crown, flame, rocket...), the plate is the gem grown
// outward and smoothed, the recess is the gem shrunk inward. Right halves only, mirrored.
import { registerShape, parseHalf } from './engine.js';

// polygon in fractions: x of the half width, y of the height, r = corner radius in px
const poly = (pts, extra = {}) => ({
  kind: 'theme', ...extra,
  gen: (w, h) => ({ pts: pts.map(([fx, fy, r = 0]) => [fx * (w / 2), fy * h, r]) }),
});
// polygon in px of a reference box [w, h] (x from the axis), r = corner radius in px
const pxpoly = (ref, pts, extra = {}) => ({
  kind: 'theme', ...extra,
  gen: (w, h) => { const sx = w / ref[0], sy = h / ref[1], sr = Math.min(sx, sy); return { pts: pts.map(([x, y, r = 0]) => [x * sx, y * sy, r * sr]) }; },
});
// bezier right half drawn in a reference box [w, h]
const bez = (ref, d, extra = {}) => ({ kind: 'theme', ref, half: parseHalf(d), ...extra });

export const THEME_SHAPES = {
  crown: poly([[0, 0, 2.5], [0.3, 0.44, 1.5], [0.6, 0.14, 2.5], [0.78, 0.5, 1.5], [1, 0.08, 2.5], [0.9, 0.8, 2], [0.96, 0.84, 1], [0.96, 1, 3], [0, 1]], { label: 'Crown' }),
  flame: bez([60, 80], 'M0 0 C3 12 10 22 11 33 C14 26 18 20 19 11 C25 24 30 38 30 52 C30 68 18 80 0 80', { label: 'Flame' }),
  trophy: poly([[0, 0], [0.64, 0, 2], [1, 0.02, 5], [1, 0.24, 8], [0.62, 0.46, 3], [0.4, 0.6, 5], [0.13, 0.66, 2], [0.13, 0.8], [0.52, 0.86, 2], [0.56, 1, 2], [0, 1]], { label: 'Trophy' }),
  rocket: poly([[0, 0, 1], [0.52, 0.3, 16], [0.52, 0.66, 2], [1, 0.86, 3], [1, 1, 2], [0.5, 0.92, 2], [0.32, 1, 1], [0, 1]], { label: 'Rocket' }),
  moneybag: poly([[0, 0], [0.34, 0, 3], [0.5, 0.08, 2], [0.22, 0.24, 3], [0.92, 0.56, 26], [0.8, 1, 12], [0, 1]], { label: 'Money bag' }),
  candle: poly([[0, 0], [0.1, 0, 1], [0.1, 0.16], [0.86, 0.16, 3], [0.86, 0.84, 3], [0.1, 0.84], [0.1, 1, 1], [0, 1]], { label: 'Candlestick' }),
  bull: poly([[0, 0.22], [0.36, 0.17, 4], [0.78, 0.05, 2], [1, 0, 1], [0.86, 0.17, 3], [0.6, 0.33, 2], [0.88, 0.42, 3], [0.56, 0.52, 2], [0.5, 0.9, 10], [0, 1]], { label: 'Bull' }),
  skull: poly([[0, 0], [0.96, 0.46, 34], [0.82, 0.74, 5], [0.62, 0.76, 2], [0.62, 1, 4], [0, 1]], { label: 'Skull' }),
  hourglass: poly([[0, 0], [0.96, 0, 3], [0.96, 0.1, 2], [0.16, 0.5, 7], [0.96, 0.9, 2], [0.96, 1, 3], [0, 1]], { label: 'Hourglass' }),
  spade: poly([[0, 0, 1], [0.96, 0.56, 22], [0.54, 0.76, 6], [0.16, 0.7, 2], [0.5, 1, 2], [0, 1]], { label: 'Spade' }),
  moon: bez([100, 90], 'M0 50 C20 50 38 34 40 0 C47 8 50 22 50 42 C50 68 28 90 0 90', { label: 'Moon' }),
  helmet: bez([80, 96], 'M0 0 C6 0 8 4 8 14 C24 16 40 28 40 50 V80 C40 88 34 92 26 96 C24 84 18 74 0 74', { label: 'Helmet' }),
  lotus: bez([90, 70], 'M0 0 C7 12 10 24 10 36 C15 24 26 16 36 14 C40 30 45 40 45 46 C45 62 28 70 0 70', { label: 'Lotus' }),
  planet: bez([120, 80], 'M0 0 C20 0 34 14 37 28 C50 30 60 34 60 38 C60 43 50 47 37 50 C34 66 20 80 0 80', { label: 'Planet' }),
  rook: poly([[0, 0], [0.2, 0, 1], [0.2, 0.12], [0.5, 0.12], [0.5, 0, 1], [0.94, 0, 1], [0.94, 0.28, 2], [0.7, 0.36, 2], [0.7, 0.8, 2], [0.96, 0.88, 2], [0.96, 1, 2], [0, 1]], { label: 'Rook' }),
  bell: poly([[0, 0], [0.14, 0, 3], [0.14, 0.08], [0.6, 0.18, 20], [0.74, 0.76, 10], [0.98, 0.86, 3], [0.98, 0.92, 1], [0.22, 0.92], [0.22, 1, 6], [0, 1]], { label: 'Bell' }),
  rosette: {
    kind: 'theme', label: 'Rosette',
    gen: (w, h) => {
      // scalloped disc (14 bumps) on top, two ribbon tails below
      const R = w / 2, cy = R, n = 14, pts = [];
      for (let k = 0; k <= n / 2; k++) {
        const a = -Math.PI / 2 + (k * 2 * Math.PI) / n;
        const rr = k % 2 ? R * 0.88 : R;
        if (Math.sin(a) > 0.55) break;
        pts.push([Math.max(0, Math.cos(a) * rr), cy + Math.sin(a) * rr, k % 2 ? 1 : 3]);
      }
      pts.push([0.62 * R, h, 1.5], [0.42 * R, h - 0.1 * h, 1], [0.24 * R, h, 1.5], [0, cy + R * 0.9]);
      pts[0][0] = 0;
      return { pts };
    },
  },
  seal: {
    kind: 'theme', label: 'Seal',
    gen: (w, h) => {
      const n = 12, pts = [];
      for (let k = 0; k <= n; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / n;
        const rr = k % 2 ? 0.86 : 1;
        pts.push([Math.max(0, Math.cos(a) * rr * (w / 2)), h / 2 + Math.sin(a) * rr * (h / 2), k % 2 ? 2 : 4]);
      }
      pts[0] = [0, pts[0][1], 4]; pts[n] = [0, pts[n][1]];
      return { pts };
    },
  },
};
// registered with a t- prefix so they never shadow the glyph shapes of the same name
for (const [k, v] of Object.entries(THEME_SHAPES)) registerShape('t-' + k, v);
const tname = (s) => (THEME_SHAPES[s] ? 't-' + s : s);

// a themed badge: gem = silhouette, plate = gem grown and smoothed, recess = gem shrunk
export function themed(id, name, shape, w, h, rarity, level, extra = [], o = {}) {
  const gy = o.y ?? Math.round(75 - h / 2 + (o.dy || 0));
  return {
    id, name, series: 'T. Themed shapes', rarity, level,
    gem: { shape: tname(shape), w, h, y: gy },
    plate: { of: 'gem', d: o.d ?? 11, smooth: o.smooth ?? 6 },
    ...(o.why ? { why: o.why } : {}), ...(o.cut ? { cut: true } : {}),
    glyphs: [
      ...(o.inset === false ? [] : [{ of: 'gem', d: o.inset ?? -8, style: 'recess', alpha: o.alpha ?? 0.21, light: 'high', ...(o.insetBlend ? { blend: o.insetBlend } : {}) }]),
      ...extra.map(({ ty, ...g }) => ({ light: 'high', ...g, ...(ty != null ? { y: gy + ty } : {}) })),
    ],
    ...(o.spec || {}),
  };
}
const glass = (shape, w, h, y, extra = {}) => ({ shape, w, h, y, style: 'glass', ...extra });

export const THEME_ROUND_1 = [
  themed('T_crown', 'Crown', 'crown', 64, 50, 'gold', 5, [glass('diamond', 8, 8, 84), glass('diamond', 6, 6, 85, { x: 16 })]),
  themed('T_flame', 'Hot streak', 'flame', 52, 70, 'ruby', 4, [glass('teardrop', 14, 22, 70)]),
  themed('T_trophy', 'Champion', 'trophy', 62, 66, 'gold', 6, [glass('diamond', 12, 12, 54)]),
  themed('T_rocket', 'To the moon', 'rocket', 50, 74, 'purple', 5, [glass('oval', 12, 12, 62)]),
  themed('T_bag', 'Big bag', 'moneybag', 58, 66, 'gold', 3, [glass('diamond', 14, 14, 76)]),
  themed('T_candle', 'Green candle', 'candle', 30, 70, 'silver', 2, [], { inset: -6 }),
  themed('T_bull', 'Bull run', 'bull', 76, 62, 'bronze', 4, [glass('oval', 6, 6, 70, { x: 9 })]),
  themed('T_skull', 'Liquidated', 'skull', 56, 62, 'silver', 3, [{ shape: 'oval', w: 12, h: 14, y: 66, x: 10, style: 'recess', alpha: 0.49 }, { shape: 'triangle', w: 6, h: 6, y: 82, style: 'recess', alpha: 0.49, params: { flip: true } }], { inset: false }),
  themed('T_hourglass', 'Diamond hands', 'hourglass', 48, 66, 'blue', 4, [glass('triangle', 20, 12, 82)]),
  themed('T_spade', 'All in', 'spade', 58, 66, 'purple', 4, [glass('diamond', 12, 12, 60)]),
  themed('T_moon', 'Moonshot', 'moon', 72, 62, 'purple', 6, [glass('sparkle', 12, 16, 58)]),
  themed('T_helmet', 'Gladiator', 'helmet', 60, 70, 'bronze', 5, [{ shape: 'cross', w: 26, h: 30, y: 72, style: 'recess', alpha: 0.49, params: { arm: 0.3 } }], { inset: false }),
  themed('T_lotus', 'Zen', 'lotus', 72, 56, 'ruby', 3, [glass('teardrop', 10, 16, 66)]),
  themed('T_planet', 'Explorer', 'planet', 84, 54, 'blue', 4, [glass('oval', 10, 10, 62, { x: 8 })], { inset: -7 }),
  themed('T_rook', 'Fortress', 'rook', 54, 66, 'silver', 4, [glass('arch', 12, 16, 78)]),
  themed('T_bell', 'First alert', 'bell', 60, 66, 'gold', 2, []),
  themed('T_rosette', 'Award', 'rosette', 62, 74, 'ruby', 5, [glass('diamond', 14, 14, 60)]),
  themed('T_seal', 'Verified', 'seal', 66, 66, 'blue', 3, [{ shape: 'chevron', w: 22, h: 14, y: 70, style: 'glass', params: { angle: 40, flip: true } }]),
];

// Round 1 review: what stays and what goes
const R1 = {
  T_crown: 'keep, refine: spikes too short, plate too blobby',
  T_flame: 'keep: reads instantly',
  T_trophy: 'keep, refine: reads as a cocktail glass without handles',
  T_rocket: 'keep',
  T_bag: 'cut: reads as a vase',
  T_candle: 'cut: too thin, no read at small size',
  T_bull: 'redo: reads as a fox mask',
  T_skull: 'keep',
  T_hourglass: 'keep: cleanest of the round',
  T_spade: 'keep',
  T_moon: 'cut: an upright crescent is a bowl',
  T_helmet: 'redo: cross glyph fights the silhouette',
  T_lotus: 'cut: reads as a crown',
  T_planet: 'cut: reads as a face',
  T_rook: 'keep',
  T_bell: 'keep',
  T_rosette: 'cut: reads as a ghost, see Medal',
  T_seal: 'keep',
};
for (const b of THEME_ROUND_1) { b.why = R1[b.id]; if (/^(cut|redo)/.test(R1[b.id])) b.cut = true; }

/* Round 2 */
const R2_SHAPES = {
  crown2: bez([72, 58], 'M0 0 C2.8 0 5 2.2 5 5 C5 6.8 4 8.4 2.6 9.3 L13 27 L26.4 12.6 C25.5 11.6 25 10.4 25 9 C25 6.2 27.2 4 30 4 C32.8 4 35 6.2 35 9 C35 10.7 34.2 12.2 33 13.1 L32 40 L34 40 C35.1 40 36 40.9 36 42 L36 54 C36 56.2 34.2 58 32 58 L0 58', { label: 'Crown' }),
  trophy2: bez([76, 70], 'M0 0 L22 0 C23.7 0 25 1.3 25 3 L25 5 C31 4 36 7.5 36 13.5 C36 18.5 33 22 29 24 C28 24.4 27.2 23.8 27.6 22.8 C29.6 20.8 31 18 31 14.5 C31 11 28.5 9 25 9.6 C24.6 19 20 28 12 33 L7.5 35.5 L7.5 48 C7.5 49.7 8.5 50.5 10 51 L18 53.5 C19.5 54 20 55 20 56.5 L20 60 L22 60 C23.1 60 24 60.9 24 62 L24 68 C24 69.1 23.1 70 22 70 L0 70', { label: 'Trophy' }),
  padlock: bez([56, 70], 'M0 0 C10 0 18 7.5 18 17.5 L18 30 L24 30 C26.2 30 28 31.8 28 34 L28 64 C28 67.3 25.3 70 22 70 L0 70', { label: 'Padlock' }),
  labrys: bez([80, 72], 'M0 0 C2.2 0 4 1.8 4 4 L4 16 C14 15 25 10 33 4 C38 13 40 21 40 28 C40 35 38 43 33 52 C25 46 14 41 4 40 L4 68 C4 70.2 2.2 72 0 72', { label: 'Double axe' }),
  trident: bez([70, 76], 'M0 0 L6 10.5 L3.5 12.5 L3.5 27 C9 27 15 26 19.5 22.5 L19.5 10 L24 1 L28.5 10 L28.5 23 C28.5 32 20 38 4 40 L4 72 C4 74.2 2.2 76 0 76', { label: 'Trident' }),
  crystals: pxpoly([76, 72], [[0, 0, 1], [9, 11, 1], [9, 28, 0.5], [18, 18, 1], [29, 9, 1], [37, 21, 1], [35, 50, 1.5], [21, 65, 2], [0, 72, 1]], { label: 'Crystals' }),
  fleur: bez([72, 76], 'M0 0 C5 6 9 13 9 21 C9 27 7 32 4.5 36 C6 28 10 20 18 17 C26 14 34 18 35 25 C35.8 30 33 33.5 29 33.5 C30.5 30 29 26.5 25.5 26.5 C21 26.5 18 31 17.5 38 L20 38 C21.7 38 23 39.3 23 41 L23 43 C23 44.7 21.7 46 20 46 L14 46 C18 50 24 52 27 56 C28.5 58 27 61 24.5 60.5 C20 59.5 14 56 9.5 53 C8 60 5 70 0 76', { label: 'Fleur-de-lis' }),
  scarab: bez([100, 58], 'M0 0 C3.5 0 6 2.5 6 5.5 L6 8 C9 8 12 9.5 13 12 C22 9 36 6 48 5 C49.5 5 50.5 6.2 49.5 7.5 C46 12 42 15 37 16.5 L41 17.5 C41.5 19 40.5 20.3 39 20.6 C35 22 30 23 25 23.5 L28 25.5 C28 27.5 26.5 28.5 24.5 28.5 C21 28.5 18 28.5 15.5 28 C15.5 40 12 52 0 58', { label: 'Scarab' }),
  pawn: bez([50, 72], 'M0 0 C6.6 0 12 5.4 12 12 C12 16.2 9.8 19.9 6.5 22 L13 23.5 C14 23.8 14.5 24.6 14.5 25.6 C14.5 26.6 14 27.3 13 27.6 L8.5 28.6 C9 39 12 47.5 17.5 53.5 L21 56.5 C22.5 57.8 23 59 23 60.5 L23 64 L24 64 C24.6 64 25 64.4 25 65 L25 70 C25 71.1 24.1 72 23 72 L0 72', { label: 'Pawn' }),
  ufo: bez([96, 48], 'M0 0 C9 0 16.5 6.5 17.5 15.5 C33 17 45 21.5 47.5 26.5 C48.5 28.5 47.5 30.5 45 31.5 C38 34.5 29 36.2 20 37 L23 44 C23.6 45.5 22.6 47 21 47 C19.8 47 18.9 46.3 18.6 45.2 L16.5 37.4 C13 37.7 10.5 37.8 8 37.9 C7 41.5 4 43.5 0 43.5', { label: 'UFO' }),
  owl: bez([64, 72], 'M0 9 C6 8.5 12 6 18 0.5 C19 4 20.5 7 23 9.5 C28.5 14.5 32 22.5 32 33 C32 50 27.5 62 19 68.5 L16 66.5 L13 70.5 L10 67.5 L7 71 L4.5 68 L0 70', { label: 'Owl' }),
  ghost: bez([56, 66], 'M0 0 C15.5 0 28 12.5 28 28 L28 59 C28 62.5 25 64 22.5 61.5 L19 58 L14.5 63.5 C13 65.3 10.5 65.3 9 63.5 L4.5 58 L0 63', { label: 'Ghost' }),
  peaks: pxpoly([88, 56], [[0, 0, 1.5], [11, 14, 1], [17, 9, 1.5], [30, 25, 1], [35, 21, 1.5], [44, 50, 2], [44, 56, 1.5], [0, 56]], { label: 'Peaks' }),
  gift: bez([64, 68], 'M0 14 C2.5 9.5 6.5 3.5 12 1 C17 0 21.5 2.5 19.5 7.5 C18.3 10.6 15 13 10.5 14.5 L28 14.5 C30.2 14.5 32 16.3 32 18.5 L32 25 C32 26.7 30.7 28 29 28 L29 64 C29 66.2 27.2 68 25 68 L0 68', { label: 'Gift' }),
  flask: bez([58, 72], 'M0 0 L9.5 0 C10.9 0 12 1.1 12 2.5 L12 3.5 C12 4.9 10.9 6 9.5 6 L8.5 6 L8.5 22 C20.5 26 29 36.5 29 48.5 C29 61.5 18 72 0 72', { label: 'Flask' }),
  lantern: bez([52, 76], 'M0 0 C3.3 0 6 2.7 6 6 C6 7.7 5.3 9.2 4.2 10.3 L15 14.5 C16.2 15 17 16.1 17 17.4 L17 18 L20 18 C21.1 18 22 18.9 22 20 L22 21 C22 21.6 21.6 22 21 22 L20 22 L20 57 L21 57 C21.6 57 22 57.4 22 58 L22 60 C22 61.1 21.1 62 20 62 L16 62 L17.5 70 L17.5 74 C17.5 75.1 16.6 76 15.5 76 L0 76', { label: 'Lantern' }),
  shell: {
    kind: 'theme', label: 'Shell',
    gen: (w, h) => {
      // fan of 9 ribs on an ellipse around the hinge, then the two hinge ears
      const rx = w / 2 - 1, ry = h * 0.8, cy = ry, n = 9, span = (75 * Math.PI) / 180, pts = [[0, 0, 3]];
      for (let k = 1; k <= 2 * ((n - 1) / 2); k++) {
        const a = (k / (n - 1)) * span, r = k % 2 ? 0.92 : 1;
        pts.push([Math.sin(a) * rx * r, cy - Math.cos(a) * ry * r, k % 2 ? 0.5 : 3]);
      }
      pts.push([w * 0.17, h * 0.8, 0.5], [w * 0.27, h * 0.82, 1], [w * 0.26, h * 0.97, 1], [0, h]);
      return { pts };
    },
  },
  temple: pxpoly([76, 64], [[0, 0, 1], [36, 14, 1.5], [36, 19, 1], [31, 19], [31, 52], [34, 52, 0.5], [34, 57, 0.5], [38, 57, 0.5], [38, 64, 1], [0, 64]], { label: 'Temple' }),
  brilliant: pxpoly([76, 62], [[0, 0], [22, 0, 1.5], [38, 17, 1.5], [0, 62, 1]], { label: 'Brilliant' }),
  wolf: bez([68, 70], 'M0 12 C4 11.5 8 10 11 8 L22 0 C23 6 23.5 12 23 18 C27 22 30 27 31 31 L34 34 C34 35.5 33.2 36.5 32 37 L28 38.5 L31 42 C31 43.4 30 44.3 28.7 44.5 L22 45 C19 53 14 61 8 66 C5.5 68 2.5 69.5 0 70', { label: 'Wolf' }),
  key: bez([40, 76], 'M0 0 C11 0 20 8 20 18 C20 26.5 14 33.5 6 35.5 L6 50 L13 50 C14.1 50 15 50.9 15 52 L15 55 C15 56.1 14.1 57 13 57 L6 57 L6 62 L11 62 C12.1 62 13 62.9 13 64 L13 67 C13 68.1 12.1 69 11 69 L6 69 L6 72 C6 74.2 4.2 76 2 76 L0 76', { label: 'Key' }),
  mushroom: bez([72, 62], 'M0 0 C19 0 33 11 35.5 26 C36 29 34.2 31 31.5 31 L11 31 C11.5 41 13 51 15 58 C15.5 60.2 14 62 11.8 62 L0 62', { label: 'Mushroom' }),
  bull2: bez([84, 64], 'M0 12 C5 12 10 11.5 14 10.5 C20 9 24 6 28 2 C32 0 36 0 40 2 C41.5 3 41.5 4.5 40 4.6 C34 5 30 9 28 13 C27 15 25.5 16.5 24 17.5 L31 19 C33 19.5 34 21 33 22.5 C31 25.5 27 27 23 27 C23 36 21 44 19 50 C18 56 13 62 6 63.5 L0 64', { label: 'Bull' }),
  medal: bez([56, 74], 'M0 14 L6 0 L18 0 C19.5 0 20.3 1.6 19.5 2.9 L12 24 C21.5 27 27 36 27 47 C27 61.9 15 74 0 74', { label: 'Medal' }),
  butterfly: bez([84, 60], 'M0 6 C1.5 6 2.5 8 3 11 C8 4 18 0 30 0 C38 0 42 4 42 10 C42 18 34 26 24 30 C32 33 36 39 36 45 C36 54 30 60 24 60 C16 60 9 54 4.5 46 L3.5 56 C3.2 58 1.8 59 0 59', { label: 'Butterfly' }),
  bar: poly([[0, 0], [1, 0, 1], [1, 1, 1], [0, 1]], { label: 'Bar' }),
};
Object.assign(THEME_SHAPES, R2_SHAPES);
for (const [k, v] of Object.entries(R2_SHAPES)) registerShape('t-' + k, v);

const rec = (shape, w, h, ty, extra = {}) => ({ shape, w, h, ty, style: 'recess', alpha: 0.49, ...extra });
const gl = (shape, w, h, ty, extra = {}) => ({ shape, w, h, ty, style: 'glass', ...extra });
const tight = { smooth: 3 };

export const THEME_ROUND_2 = [
  themed('T2_crown', 'Royalty', 'crown2', 72, 58, 'gold', 6, [gl('diamond', 10, 10, 45), gl('oval', 6, 6, 47, { x: 19 })], { inset: false, ...tight }),
  themed('T2_trophy', 'Champion', 'trophy2', 76, 70, 'gold', 5, [gl('diamond', 12, 12, 9)], { inset: -7, ...tight }),
  themed('T2_padlock', 'HODL', 'padlock', 56, 70, 'silver', 4, [rec('arch', 18, 18, 8), gl('oval', 10, 10, 42), gl('triangle', 7, 10, 48)], { inset: false, ...tight }),
  themed('T2_labrys', 'Axe', 'labrys', 80, 72, 'bronze', 4, [gl('rhombus', 10, 14, 21)], { inset: false, ...tight }),
  themed('T2_trident', 'Sea king', 'trident', 70, 76, 'blue', 5, [gl('rhombus', 8, 12, 28)], { inset: false, ...tight }),
  themed('T2_crystals', 'Crystal cave', 'crystals', 76, 72, 'purple', 5, [gl('rhombus', 7, 16, 8)], { inset: -6, ...tight }),
  themed('T2_fleur', 'Noble', 'fleur', 72, 76, 'purple', 6, [gl('diamond', 8, 12, 12)], { inset: false, ...tight }),
  themed('T2_scarab', 'Ascended', 'scarab', 100, 58, 'gold', 5, [gl('oval', 10, 10, 34)], { inset: false, ...tight }),
  themed('T2_pawn', 'Rookie', 'pawn', 50, 72, 'bronze', 1, [gl('oval', 10, 10, 7)], { inset: false, ...tight }),
  themed('T2_ufo', 'Abducted', 'ufo', 96, 48, 'blue', 4, [gl('oval', 5, 5, 27), gl('oval', 5, 5, 26.5, { x: 15 }), gl('oval', 4, 4, 25, { x: 30 })], { inset: false, ...tight }),
  themed('T2_owl', 'Night owl', 'owl', 64, 72, 'purple', 3, [gl('oval', 15, 15, 19, { x: 10 }), rec('triangle', 6, 7, 33, { params: { flip: true } })], { inset: false, ...tight }),
  themed('T2_ghost', 'Ghost mode', 'ghost', 56, 66, 'silver', 3, [rec('oval', 8, 12, 20, { x: 9 })], { inset: false, ...tight }),
  themed('T2_peaks', 'All time high', 'peaks', 88, 56, 'blue', 5, [gl('triangle', 10, 8, 2)], { inset: -6, ...tight }),
  themed('T2_gift', 'Airdrop', 'gift', 64, 68, 'ruby', 3, [rec('t-bar', 8, 53, 15, { alpha: 0.3 })], { inset: false, ...tight }),
  themed('T2_flask', 'Alchemist', 'flask', 58, 72, 'ruby', 4, [gl('oval', 9, 9, 50, { x: 6 }), gl('oval', 5, 5, 40), gl('oval', 4, 4, 58)], { inset: -7, ...tight }),
  themed('T2_lantern', 'Guiding light', 'lantern', 52, 76, 'gold', 4, [rec('oval', 5, 5, 3.5), gl('t-flame', 16, 22, 30)], { inset: false, ...tight }),
  themed('T2_shell', 'Treasure', 'shell', 80, 64, 'ruby', 3, [gl('oval', 9, 9, 34)], { inset: -7, ...tight }),
  themed('T2_temple', 'Pantheon', 'temple', 76, 64, 'silver', 5, [rec('t-bar', 5, 29, 23, { alpha: 0.35 }), rec('t-bar', 5, 29, 23, { x: 11.5, alpha: 0.35 }), rec('triangle', 34, 7, 7, { alpha: 0.3 })], { inset: false, ...tight }),
  themed('T2_brilliant', 'Diamond', 'brilliant', 76, 62, 'blue', 6, [gl('triangle', 30, 24, 21, { params: { flip: true } })], { inset: -7, ...tight }),
  themed('T2_wolf', 'Lone wolf', 'wolf', 68, 70, 'silver', 4, [gl('diamond', 7, 5, 30, { x: 11 }), rec('oval', 8, 5, 59)], { inset: false, ...tight }),
  themed('T2_key', 'Unlocked', 'key', 40, 76, 'gold', 2, [rec('oval', 14, 14, 11)], { inset: false, ...tight }),
  themed('T2_mushroom', 'Power up', 'mushroom', 72, 62, 'ruby', 2, [gl('oval', 10, 8, 6), gl('oval', 9, 8, 15, { x: 18 })], { inset: false, ...tight }),
  themed('T2_bull', 'Bull run', 'bull2', 84, 64, 'bronze', 5, [gl('diamond', 6, 6, 26, { x: 11 }), rec('oval', 4, 5, 52, { x: 6 })], { inset: false, ...tight }),
  themed('T2_medal', 'Medalist', 'medal', 56, 74, 'gold', 4, [rec('oval', 34, 34, 30, { alpha: 0.21 }), gl('diamond', 14, 14, 40)], { inset: false, ...tight }),
  themed('T2_butterfly', 'Social', 'butterfly', 84, 60, 'purple', 3, [gl('oval', 10, 10, 10, { x: 22 }), gl('oval', 7, 7, 42, { x: 19 })], { inset: false, ...tight }),
];

const R2 = {
  T2_crystals: 'redo: the shards merge into a crown, see round 3',
  T2_scarab: 'keep as a winged crest; it does not read as a scarab',
  T2_temple: 'fixed: column gaps and pediment',
};
for (const b of THEME_ROUND_2) { if (R2[b.id]) b.why = R2[b.id]; if (/^redo/.test(R2[b.id] || '')) b.cut = true; }

/* Round 3 */
const R3_SHAPES = {
  anchor: bez([64, 72], 'M0 0 C4 0 7 3 7 7 C7 9.6 5.8 11.6 4 12.6 L4 16 L13 16 C14.1 16 15 16.9 15 18 L15 19 C15 20.1 14.1 21 13 21 L4 21 L4 58 C10 57.5 15.5 55 19.5 51 L17 47 L30 38 L32 53 L27.5 51.5 C21 63 11 71 0 72', { label: 'Anchor' }),
  sword: bez([52, 78], 'M0 0 L7 9 L7 48 L22 48 C24.2 48 26 49.8 26 52 C26 54.2 24.2 56 22 56 L5 56 L5 66 C7.5 67 9 69.3 9 72 C9 75.3 5 78 0 78', { label: 'Sword' }),
  bat: bez([100, 48], 'M0 10 L5 1 L7.5 9 C10.5 9 13 10.5 14 13.5 C24 6 36 2 48 1 C47 7 48 13 50 19 C45 17 40 18.5 37 22.5 C33 20.5 28 21.5 26 25.5 C22 23.5 18 24.5 15.5 28 C14.5 36 8.5 42 0 46', { label: 'Bat' }),
  cat: bez([68, 58], 'M0 10 C6 10 11 10.5 15 12 L27 0 C29 6 30 13 30 20 C33 25.5 34 31 34 36 C34 49 20 58 0 58', { label: 'Cat' }),
  bulb: bez([52, 72], 'M0 0 C14.4 0 26 11 26 25 C26 33 22 39 17.5 44 C15.5 46.5 14 49 14 52 L14 54 C15.1 54 16 54.9 16 56 C16 57.1 15.1 58 14 58 C15.1 58 16 58.9 16 60 C16 61.1 15.1 62 14 62 L13 62 C13 66 10 70 6 71 L5 72 L0 72', { label: 'Light bulb' }),
  eye: bez([88, 48], 'M0 4 L3 0 L5 5 C8 5 11 5.3 14 6 L16.5 1 L18.5 7 C30 10 39 16 44 24 C36 36 20 44 0 44', { label: 'Eye' }),
  cake: bez([64, 70], 'M0 0 C2 3 3.5 5.5 3.5 7.5 C3.5 9.2 2.8 10.4 2 11 L3 11 L3 18 L20 18 C22.2 18 24 19.8 24 22 L24 36 L28 36 C30.2 36 32 37.8 32 40 L32 66 C32 68.2 30.2 70 28 70 L0 70', { label: 'Cake' }),
  crystals2: pxpoly([76, 72], [[0, 0, 0.5], [8, 10, 0.5], [8, 40, 0.5], [14, 22, 0.5], [24, 9, 0.5], [34, 22, 0.5], [34, 54, 1], [20, 66, 1.5], [0, 72, 1]], { label: 'Crystals' }),
};
Object.assign(THEME_SHAPES, R3_SHAPES);
for (const [k, v] of Object.entries(R3_SHAPES)) registerShape('t-' + k, v);

export const THEME_ROUND_3 = [
  themed('T3_anchor', 'Anchored', 'anchor', 64, 72, 'blue', 4, [rec('oval', 6, 6, 4)], { inset: false, ...tight }),
  themed('T3_sword', 'Slayer', 'sword', 52, 78, 'silver', 5, [rec('t-bar', 3, 34, 11, { alpha: 0.3 }), gl('oval', 6, 6, 69)], { inset: false, ...tight }),
  themed('T3_bat', 'Night shift', 'bat', 100, 48, 'purple', 3, [gl('diamond', 4, 4, 14, { x: 3 })], { inset: false, ...tight }),
  themed('T3_cat', 'Degen cat', 'cat', 68, 58, 'gold', 3, [gl('diamond', 8, 10, 25, { x: 11 }), rec('triangle', 6, 4, 39, { params: { flip: true } })], { inset: false, ...tight }),
  themed('T3_bulb', 'Big brain', 'bulb', 52, 72, 'gold', 4, [gl('t-flame', 14, 20, 14)], { inset: -7, ...tight }),
  themed('T3_eye', 'Watcher', 'eye', 88, 48, 'ruby', 4, [gl('oval', 22, 22, 13), rec('oval', 8, 8, 20)], { inset: false, ...tight }),
  themed('T3_cake', 'Anniversary', 'cake', 64, 70, 'ruby', 3, [gl('oval', 5, 5, 46), gl('oval', 5, 5, 46, { x: 13 }), gl('oval', 4, 4, 27, { x: 9 })], { inset: false, ...tight }),
  themed('T3_crystals', 'Crystal cave', 'crystals2', 76, 72, 'purple', 5, [gl('rhombus', 6, 18, 9), gl('rhombus', 6, 14, 22, { x: 24 })], { inset: false, ...tight }),
];
