// Hypernova badges: builds badges as native Figma layers.
// The panel (ui.html) turns pasted or dropped badge SVGs into a layer list (convert.js); this side
// creates one frame per badge with one vector per layer: all of that layer's fills on it, each with
// its own blend mode, and the bevel as a 1 px inside or outside stroke. No masks, no clip groups.
// Tags become auto layout frames with the badge inside and the label as live text.

figma.showUI(__html__, { width: 280, height: 212, themeColors: true, title: 'Hypernova badges' });

// 2x3 affine inverse
function inv(m) {
  const [[a, b, c], [d, e, f]] = m, det = a * e - b * d;
  if (Math.abs(det) < 1e-12) throw new Error('flat gradient');
  return [[e / det, -b / det, (b * f - c * e) / det], [-d / det, a / det, (c * d - a * f) / det]];
}

// Figma's gradientTransform maps the layer's 0..1 box into gradient space, where a linear gradient
// runs from (0, 0.5) to (1, 0.5) and a radial one is the circle at (0.5, 0.5), radius 0.5.
// Our gradients are in frame pixels (SVG userSpaceOnUse), so build gradient -> box and invert it.
function toPaint(p, B) {
  const extra = { opacity: p.opacity == null ? 1 : p.opacity, blendMode: p.blend || 'NORMAL', visible: true };
  if (p.type === 'SOLID') return Object.assign({ type: 'SOLID', color: p.color }, extra);
  const stops = p.stops.map((s) => ({ position: s.position, color: s.color }));
  const nx = (x) => (x - B.x) / B.w, ny = (y) => (y - B.y) / B.h;
  let M;
  if (p.type === 'LINEAR') {
    const [x1, y1] = p.p1, [x2, y2] = p.p2;
    // stripes stay perpendicular in pixels, as in SVG
    const px = -(y2 - y1) / B.w, py = (x2 - x1) / B.h;
    const sx = nx(x1), sy = ny(y1);
    M = [[nx(x2) - sx, px, sx - 0.5 * px], [ny(y2) - sy, py, sy - 0.5 * py]];
    return Object.assign({ type: 'GRADIENT_LINEAR', gradientTransform: inv(M), gradientStops: stops }, extra);
  }
  // radial: unit circle (X, Y) -> svg (cx + r X, cy + r Y) -> matrix -> pixels; X = 2u - 1
  const [a, b, c, d, e, f] = p.m, r = p.r;
  const ox = a * (p.cx - r) + c * (p.cy - r) + e, oy = b * (p.cx - r) + d * (p.cy - r) + f;
  M = [[(2 * a * r) / B.w, (2 * c * r) / B.w, (ox - B.x) / B.w], [(2 * b * r) / B.h, (2 * d * r) / B.h, (oy - B.y) / B.h]];
  return Object.assign({ type: 'GRADIENT_RADIAL', gradientTransform: inv(M), gradientStops: stops }, extra);
}

async function buildBadge(b) {
  if (b.kind === 'tag') return buildTag(b);
  const frame = figma.createFrame();
  frame.name = b.name || 'Badge';
  frame.resize(b.w || 150, b.h || 150);
  frame.fills = b.bg ? [{ type: 'SOLID', color: b.bg }] : [];
  frame.clipsContent = false;
  for (const L of b.layers) {
    const v = figma.createVector();
    frame.appendChild(v);
    v.name = L.name;
    // geometry first, in frame coordinates: Figma moves the layer so its box starts at the shape
    v.x = 0; v.y = 0;
    v.vectorPaths = [{ windingRule: L.rule, data: L.d }];
    const B = { x: v.x, y: v.y, w: Math.max(v.width, 0.01), h: Math.max(v.height, 0.01) };
    v.fills = L.fills.map((p) => toPaint(p, B));
    v.strokes = L.strokes.map((p) => toPaint(p, B));
    if (L.strokes.length) { v.strokeWeight = L.strokeWeight; v.strokeAlign = L.strokeAlign; }
  }
  for (const c of b.children || []) {
    if (c.type === 'frame') frame.appendChild(await placeFrame(c));
    if (c.type === 'text') { const t = await buildText(c); frame.appendChild(t); placeText(t, c); }
  }
  // an SVG whose viewBox does not start at 0 0 (exports with room around them)
  if (b.ox || b.oy) for (const n of frame.children) { n.x -= b.ox; n.y -= b.oy; }
  return frame;
}

// a nested badge: its frame is already cropped to its viewBox (buildBadge shifts by the viewBox origin),
// then it is scaled to its size in the parent
async function placeFrame(c) {
  const f = await buildBadge(c.frame);
  f.rescale(c.w / c.vb[2]);
  f.x = c.x; f.y = c.y;
  f.name = c.name || f.name;
  return f;
}

// PolySans Median (the label font), or the closest font this Figma has
const FONTS = [{ family: 'PolySans Trial', style: 'Median' }, { family: 'PolySans', style: 'Median' }, { family: 'Inter', style: 'Semi Bold' }, { family: 'Inter', style: 'Regular' }];
let FONT = null;
async function labelFont() {
  if (FONT) return FONT;
  for (const fn of FONTS) { try { await figma.loadFontAsync(fn); FONT = fn; return fn; } catch (e) { /* next */ } }
  throw new Error('no font');
}
async function buildText(c) {
  const t = figma.createText();
  t.fontName = await labelFont();
  t.fontSize = c.size;
  t.characters = c.text;
  t.name = c.name || 'Label';
  t.textAutoResize = 'WIDTH_AND_HEIGHT';
  // trim the box to the cap height, as in the Figma tags (the box then ends on the baseline)
  try { t.leadingTrim = 'CAP_HEIGHT'; } catch (e) { /* older Figma */ }
  if (c.shadow) t.effects = [{ type: 'DROP_SHADOW', color: Object.assign({}, c.shadow.color, { a: c.shadow.a }), offset: { x: c.shadow.dx, y: c.shadow.dy }, radius: c.shadow.blur, spread: 0, visible: true, blendMode: 'NORMAL' }];
  return t;
}
// place a text by its SVG baseline, then paint it (gradients need its final box)
function placeText(t, c) {
  t.x = c.x;
  t.y = t.leadingTrim === 'CAP_HEIGHT' ? c.y - t.height : c.y - c.size * 0.8 - (t.height - c.size * 1.008) / 2;
  if (c.fill) t.fills = [toPaint(c.fill, { x: t.x, y: t.y, w: Math.max(t.width, 0.01), h: Math.max(t.height, 0.01) })];
}

// a tag, rebuilt the way it is built in Figma (HyperNova 1010:75704): auto layout, so editing the
// label resizes the pill. Frame (1 px border, black 48%, radius 3) > Pill (20 px tall, radius 2,
// gap 2, 2 px right padding) > Icon (20 x 20, the badge spills over it) + Label (4 px padding, text)
async function buildTag(b) {
  const pillL = b.layers.find((L) => L.name === 'Pill');
  const border = b.layers.find((L) => L.name === 'Border');
  const icon = (b.children || []).find((c) => c.type === 'frame');
  const label = (b.children || []).find((c) => c.type === 'text');
  // frame minus its 1 px border (and any room an export left around it: viewBox starts at -room)
  const room = -(b.ox || 0), W = b.w - 2 * room - 2, H = b.h - 2 * room - 2;

  const tag = figma.createFrame();
  tag.name = b.name || 'Tag';
  tag.fills = [];
  tag.clipsContent = false;
  tag.layoutMode = 'VERTICAL';
  tag.primaryAxisSizingMode = 'AUTO';
  tag.counterAxisSizingMode = 'AUTO';
  tag.paddingLeft = tag.paddingRight = tag.paddingTop = tag.paddingBottom = 1;
  tag.cornerRadius = 3;
  const rim = border && border.fills[0];
  tag.strokes = [{ type: 'SOLID', color: rim && rim.color ? rim.color : { r: 0, g: 0, b: 0 }, opacity: rim ? rim.opacity : 0.48 }];
  tag.strokeWeight = 1;
  tag.strokeAlign = 'INSIDE';

  const pill = figma.createFrame();
  tag.appendChild(pill);
  pill.name = 'Pill';
  pill.clipsContent = false;
  pill.layoutMode = 'HORIZONTAL';
  pill.primaryAxisSizingMode = 'AUTO';
  pill.counterAxisSizingMode = 'FIXED';
  pill.resize(Math.max(W, 1), H);
  pill.primaryAxisSizingMode = 'AUTO';
  pill.counterAxisAlignItems = 'CENTER';
  pill.itemSpacing = 2;
  pill.paddingLeft = 0; pill.paddingRight = 2; pill.paddingTop = 0; pill.paddingBottom = 0;
  pill.cornerRadius = 2;
  const PB = { x: 1, y: 1, w: W, h: H };
  pill.fills = pillL ? pillL.fills.map((p) => toPaint(p, PB)) : [];
  pill.strokes = pillL ? pillL.strokes.map((p) => toPaint(p, PB)) : [];
  if (pillL && pillL.strokes.length) { pill.strokeWeight = pillL.strokeWeight; pill.strokeAlign = 'INSIDE'; }

  const slot = figma.createFrame();
  pill.appendChild(slot);
  slot.name = 'Icon';
  slot.resize(H, H);
  slot.fills = [];
  slot.clipsContent = false;
  if (icon) {
    const f = await placeFrame(icon);
    slot.appendChild(f);
    f.x = icon.x - 1; f.y = icon.y - 1;
  }

  if (label) {
    const box = figma.createFrame();
    pill.appendChild(box);
    box.name = 'Label';
    box.fills = [];
    box.clipsContent = false;
    box.layoutMode = 'HORIZONTAL';
    box.primaryAxisSizingMode = 'AUTO';
    box.counterAxisSizingMode = 'AUTO';
    box.paddingLeft = box.paddingRight = 4;
    box.paddingTop = box.paddingBottom = 0;
    box.counterAxisAlignItems = 'CENTER';
    const t = await buildText(label);
    box.appendChild(t);
    // the label gradient runs top to bottom of the caps: paint it in the text's own box
    if (label.fill) {
      const top = label.y - (t.leadingTrim === 'CAP_HEIGHT' ? t.height : label.size * 0.704);
      t.fills = [toPaint(label.fill, { x: label.x, y: top, w: Math.max(t.width, 0.01), h: Math.max(t.height, 0.01) })];
    }
  }
  return tag;
}

figma.ui.onmessage = async (msg) => {
  if (!msg || msg.type !== 'insert') return;
  try {
    const frames = [];
    for (const b of msg.badges) frames.push(await buildBadge(b));
    // a row in the middle of the view, 24 px apart
    const gap = 24, total = frames.reduce((s, f) => s + f.width, 0) + gap * (frames.length - 1);
    const c = figma.viewport.center;
    let x = Math.round(c.x - total / 2);
    for (const f of frames) { f.x = x; f.y = Math.round(c.y - f.height / 2); x += f.width + gap; }
    figma.currentPage.selection = frames;
    figma.ui.postMessage({ type: 'done', names: frames.map((f) => f.name) });
  } catch (e) {
    figma.notify('Could not build it (' + e.message + ')', { error: true });
    figma.ui.postMessage({ type: 'error', message: e.message });
  }
};
