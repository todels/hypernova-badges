// Hypernova badges: builds badges as native Figma layers.
// The panel (ui.html) turns pasted or dropped badge SVGs into a layer list (convert.js); this side
// creates one frame per badge with one vector per layer: all of that layer's fills on it, each with
// its own blend mode, and the bevel as a 1 px inside or outside stroke. No masks, no clip groups.

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

function buildBadge(b) {
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
  return frame;
}

figma.ui.onmessage = (msg) => {
  if (!msg || msg.type !== 'insert') return;
  try {
    const frames = msg.badges.map(buildBadge);
    // a row in the middle of the view, 24 px apart
    const gap = 24, total = frames.reduce((s, f) => s + f.width, 0) + gap * (frames.length - 1);
    const c = figma.viewport.center;
    let x = Math.round(c.x - total / 2);
    for (const f of frames) { f.x = x; f.y = Math.round(c.y - f.height / 2); x += f.width + gap; }
    figma.currentPage.selection = frames;
    figma.ui.postMessage({ type: 'done', names: frames.map((f) => f.name) });
  } catch (e) {
    figma.notify('Could not build the badge (' + e.message + ')', { error: true });
    figma.ui.postMessage({ type: 'error', message: e.message });
  }
};
