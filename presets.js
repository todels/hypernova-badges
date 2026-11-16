// Glyph sets for the generator. Each set is drawn for a gem centred on y = 75;
// placeGlyphs() re-centres and scales a set onto any gem.

export const GLYPH_SETS = {
  diamond: { label: 'Diamond', glyphs: [{ shape: 'diamond', w: 26, h: 26, y: 62, style: 'glass' }] },
  twin: { label: 'Twin diamonds', glyphs: [
    { shape: 'diamond', w: 14, h: 14, y: 56, style: 'glass' }, { shape: 'diamond', w: 14, h: 14, y: 80, style: 'glass' }] },
  drop: { label: 'Drop', glyphs: [
    { shape: 'teardrop', w: 16, h: 25, y: 55, style: 'glass' }, { shape: 'diamond', w: 10, h: 10, y: 86, style: 'glass' }] },
  rise: { label: 'Rise', glyphs: [
    { shape: 'chevron', w: 26, h: 20, y: 57, style: 'glass', params: { angle: 45 } }, { shape: 'diamond', w: 26, h: 26, y: 69, style: 'glass' }] },
  hexcore: { label: 'Hex core', glyphs: [
    { shape: 'hex', w: 42, h: 50, y: 50, style: 'recess', alpha: 0.21, params: { shoulder: 12.5, r: 8 } },
    { shape: 'hex', w: 26, h: 30, y: 60, style: 'glass', params: { shoulder: 7.5, r: 4 } }] },
  slabs: { label: 'Slabs', glyphs: [
    { shape: 'hex', w: 26, h: 22, y: 63, style: 'glass', params: { shoulder: 7.5, r: 4 } },
    { shape: 'hex', w: 26, h: 22, y: 55, style: 'glass', params: { shoulder: 7.5, r: 4 } },
    { shape: 'hex', w: 26, h: 22, y: 71, style: 'glass', params: { shoulder: 7.5, r: 4 } }] },
  sparkle: { label: 'Sparkle', glyphs: [{ shape: 'sparkle', w: 28, h: 36, y: 57, style: 'glass' }] },
  ranks: { label: 'Ranks', glyphs: [
    { shape: 'chevron', w: 26, h: 14, y: 58, style: 'recess', alpha: 0.49 },
    { shape: 'chevron', w: 26, h: 14, y: 69, style: 'recess', alpha: 0.49 }] },
  crystal: { label: 'Crystal', glyphs: [
    { shape: 'hex', w: 36, h: 50, y: 50, style: 'recess', alpha: 0.49, params: { shoulder: 15.4, r: 3 } },
    { shape: 'hex', w: 18, h: 26, y: 62, style: 'glass', params: { shoulder: 8, r: 2 } }] },
  triangle: { label: 'Triangle', glyphs: [{ shape: 'triangle', w: 32, h: 33, y: 59, style: 'glass' }] },
  star4: { label: 'Star 4', glyphs: [
    { shape: 'sparkle', w: 40, h: 44, y: 53, style: 'recess', alpha: 0.21, blend: 'overlay' },
    { shape: 'sparkle', w: 20, h: 26, y: 62, style: 'glass' }] },
  star5: { label: 'Star 5', glyphs: [{ shape: 'star5', w: 30, h: 28, y: 61, style: 'glass', params: { inner: 0.46, r: 1 } }] },
  crown: { label: 'Crown', glyphs: [{ shape: 'crown', w: 30, h: 22, y: 64, style: 'glass' }] },
  heart: { label: 'Heart', glyphs: [{ shape: 'heart', w: 26, h: 23, y: 64, style: 'glass' }] },
  cross: { label: 'Cross', glyphs: [{ shape: 'cross', w: 26, h: 26, y: 62, style: 'recess', alpha: 0.49 }] },
  arrow: { label: 'Arrow', glyphs: [{ shape: 'arrow', w: 24, h: 28, y: 61, style: 'glass' }] },
  ring: { label: 'Ring', glyphs: [{ style: 'glass', evenodd: true, parts: [
    { shape: 'oval', w: 30, h: 30, y: 60 }, { shape: 'oval', w: 18, h: 18, y: 66 }] }] },
  none: { label: 'Empty', glyphs: [] },
};

// where a glyph group should sit inside a gem: the gem's visual centre
const CENTRE = { triangle: 0.57, pentagon: 0.55, star5: 0.56, banner: 0.44, arch: 0.55, gemcut: 0.4, shield: 0.46, crest: 0.55 };

// how much of the gem a glyph group may cover (narrow gems get less)
const FIT = { sparkle: 0.4, star5: 0.46, triangle: 0.52, rhombus: 0.55 };

const even = (v) => Math.max(2, Math.round(v / 2) * 2);

function groupBox(glyphs) {
  let y0 = Infinity, y1 = -Infinity, xr = 0;
  const each = (g, x = 0) => {
    y0 = Math.min(y0, g.y); y1 = Math.max(y1, g.y + g.h);
    xr = Math.max(xr, Math.abs(x) + g.w / 2);
  };
  for (const g of glyphs) {
    if (g.parts) g.parts.forEach((p) => each(p, p.x || 0));
    else each(g, g.x || 0);
  }
  return { y0, y1, w: xr * 2, h: y1 - y0 };
}

export function placeGlyphs(set, gem) {
  const glyphs = JSON.parse(JSON.stringify(set.glyphs));
  if (!glyphs.length || !gem) return glyphs;
  const b = groupBox(glyphs);
  const target = gem.y + (CENTRE[gem.shape] ?? 0.5) * gem.h;
  const k = FIT[gem.shape] ?? 0.62;
  const fit = Math.min(1, (k * gem.w) / b.w, (k * gem.h) / b.h);
  const c0 = (b.y0 + b.y1) / 2;
  const move = (g) => {
    const cy = g.y + g.h / 2;
    g.w = even(g.w * fit); g.h = even(g.h * fit);
    g.y = Math.round(target + (cy - c0) * fit - g.h / 2);
    if (g.x) g.x = Math.round(g.x * fit);
  };
  for (const g of glyphs) (g.parts ? g.parts.forEach(move) : move(g));
  return glyphs;
}
