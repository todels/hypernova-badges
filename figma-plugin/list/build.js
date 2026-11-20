const ONLY = [0, 1, 2, 3, 4, 5];
const SECTION_ID = '';
const page = await figma.getNodeByIdAsync('917:116837');
await figma.setCurrentPageAsync(page);

function famData(n) {
  const key = String(n).padStart(2, '0');
  for (const car of page.children.filter((c) => c.name === 'hb-data-' + key)) {
    const parts = car.findAllWithCriteria({ types: ['TEXT'] }).map((t) => t.characters).filter((c) => c.startsWith('HB' + key + '.'));
    parts.sort((a, b) => +a.split('.')[1] - +b.split('.')[1]);
    if (!parts.length || parts.length !== +parts[0].split('.')[2].split(':')[0]) continue;
    try { return JSON.parse(parts.map((p) => p.slice(p.indexOf(':') + 1)).join('')); } catch (e) { /* next */ }
  }
  throw new Error('no data ' + key);
}

// ---- from figma-plugin/code.js
function inv(m) {
  const [[a, b, c], [d, e, f]] = m, det = a * e - b * d;
  if (Math.abs(det) < 1e-12) throw new Error('flat gradient');
  return [[e / det, -b / det, (b * f - c * e) / det], [-d / det, a / det, (c * d - a * f) / det]];
}
function toPaint(p, B) {
  const extra = { opacity: p.opacity == null ? 1 : p.opacity, blendMode: p.blend || 'NORMAL', visible: true };
  if (p.type === 'SOLID') return Object.assign({ type: 'SOLID', color: p.color }, extra);
  const stops = p.stops.map((s) => ({ position: s.position, color: s.color }));
  const nx = (x) => (x - B.x) / B.w, ny = (y) => (y - B.y) / B.h;
  let M;
  if (p.type === 'LINEAR') {
    const [x1, y1] = p.p1, [x2, y2] = p.p2;
    const px = -(y2 - y1) / B.w, py = (x2 - x1) / B.h;
    const sx = nx(x1), sy = ny(y1);
    M = [[nx(x2) - sx, px, sx - 0.5 * px], [ny(y2) - sy, py, sy - 0.5 * py]];
    return Object.assign({ type: 'GRADIENT_LINEAR', gradientTransform: inv(M), gradientStops: stops }, extra);
  }
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
  if (b.ox || b.oy) for (const n of frame.children) { n.x -= b.ox; n.y -= b.oy; }
  return frame;
}
async function placeFrame(c) {
  const f = await buildBadge(c.frame);
  f.rescale(c.w / c.vb[2]);
  f.x = c.x; f.y = c.y;
  f.name = c.name || f.name;
  return f;
}
const FONTS = [{ family: 'PolySans Trial', style: 'Median' }, { family: 'PolySans', style: 'Median' }, { family: 'Inter', style: 'Semi Bold' }];
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
  try { t.leadingTrim = 'CAP_HEIGHT'; } catch (e) { /* older */ }
  if (c.shadow) t.effects = [{ type: 'DROP_SHADOW', color: Object.assign({}, c.shadow.color, { a: c.shadow.a }), offset: { x: c.shadow.dx, y: c.shadow.dy }, radius: c.shadow.blur, spread: 0, visible: true, blendMode: 'NORMAL' }];
  return t;
}
function placeText(t, c) {
  t.x = c.x;
  t.y = t.leadingTrim === 'CAP_HEIGHT' ? c.y - t.height : c.y - c.size * 0.8 - (t.height - c.size * 1.008) / 2;
  if (c.fill) t.fills = [toPaint(c.fill, { x: t.x, y: t.y, w: Math.max(t.width, 0.01), h: Math.max(t.height, 0.01) })];
}
async function buildTag(b) {
  const pillL = b.layers.find((L) => L.name === 'Pill');
  const border = b.layers.find((L) => L.name === 'Border');
  const icon = (b.children || []).find((c) => c.type === 'frame');
  const label = (b.children || []).find((c) => c.type === 'text');
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
    if (label.fill) {
      const top = label.y - (t.leadingTrim === 'CAP_HEIGHT' ? t.height : label.size * 0.704);
      t.fills = [toPaint(label.fill, { x: label.x, y: top, w: Math.max(t.width, 0.01), h: Math.max(t.height, 0.01) })];
    }
  }
  return tag;
}

// ---- list layout, as in Badges update 2
await Promise.all([figma.loadFontAsync({ family: 'Inter', style: 'Regular' }), figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' })]);
const C = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const T1 = C('#EBEDF2'), T2 = C('#8A8F98');
function txt(s, size, lh, style, color, name) {
  const t = figma.createText();
  t.fontName = { family: 'Inter', style };
  t.fontSize = size;
  t.lineHeight = { unit: 'PIXELS', value: lh };
  t.characters = s;
  t.fills = [{ type: 'SOLID', color }];
  t.name = name || s;
  return t;
}
function al(dir, name) {
  const f = figma.createFrame();
  f.name = name;
  f.layoutMode = dir;
  f.primaryAxisSizingMode = 'AUTO';
  f.counterAxisSizingMode = 'AUTO';
  f.fills = [];
  f.clipsContent = false;
  return f;
}
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

let sec = SECTION_ID ? await figma.getNodeByIdAsync(SECTION_ID) : null;
if (!sec) {
  let maxY = 0;
  for (const c of page.children) maxY = Math.max(maxY, c.y + c.height);
  sec = figma.createSection();
  sec.name = 'Badges update 3';
  sec.fills = [{ type: 'SOLID', color: { r: 0.0433, g: 0.0433, b: 0.0433 } }];
  sec.x = 0; sec.y = Math.round(maxY + 400);
  sec.resizeWithoutConstraints(1520, 400);
}
let y = 80;
for (const c of sec.children) y = Math.max(y, c.y + c.height + 40);

const done = [], errors = [];
for (const n of ONLY) {
  let fam;
  try {
    const d = famData(n);
    fam = al('VERTICAL', d.title);
    sec.appendChild(fam);
    fam.fills = [{ type: 'SOLID', color: C('#191919') }];
    fam.paddingTop = 18; fam.paddingLeft = fam.paddingRight = 24; fam.paddingBottom = 24; fam.itemSpacing = 18;
    fam.resize(1360, 100);
    fam.primaryAxisSizingMode = 'AUTO';
    fam.counterAxisSizingMode = 'FIXED';
    fam.x = 80; fam.y = y;

    const head = al('HORIZONTAL', 'Header');
    fam.appendChild(head);
    head.itemSpacing = 12;
    head.counterAxisAlignItems = 'BASELINE';
    head.appendChild(txt(d.title, 18, 26, 'Semi Bold', T1));
    const levels = /^L\./.test(d.title);
    head.appendChild(txt(`${d.shape} · ${d.items.length} ${levels ? 'levels shown' : 'badges'} · lowest to rarest`, 14, 22, 'Regular', T2, 'Meta'));

    const row = al('HORIZONTAL', 'Badges');
    fam.appendChild(row);
    row.layoutSizingHorizontal = 'FILL';
    row.layoutWrap = 'WRAP';
    row.itemSpacing = 16;
    row.counterAxisSpacing = 24;
    for (const it of d.items) {
      const card = al('VERTICAL', it.name + ' badge');
      row.appendChild(card);
      card.resize(168, 100);
      card.primaryAxisSizingMode = 'AUTO';
      card.counterAxisSizingMode = 'FIXED';
      card.counterAxisAlignItems = 'CENTER';
      card.itemSpacing = 12;
      const bf = await buildBadge(it.badge);
      bf.name = it.id;
      card.appendChild(bf);
      const words = al('VERTICAL', 'Text');
      card.appendChild(words);
      words.layoutSizingHorizontal = 'FILL';
      words.itemSpacing = 2;
      for (const t of [txt(it.name, 14, 22, 'Regular', T1, 'Name'), txt(`${it.id} · ${it.rarity ? cap(it.rarity) + ' · ' : ''}${it.colour}`, 12, 16, 'Regular', T2, 'Id')]) {
        words.appendChild(t);
        t.layoutSizingHorizontal = 'FILL';
        t.textAlignHorizontal = 'CENTER';
        t.textAutoResize = 'HEIGHT';
      }
    }

    const line = figma.createFrame();
    fam.appendChild(line);
    line.name = 'Divider';
    line.resize(100, 1);
    line.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.06 }];
    line.layoutSizingHorizontal = 'FILL';

    const tb = al('VERTICAL', 'Tags');
    fam.appendChild(tb);
    tb.layoutSizingHorizontal = 'FILL';
    tb.itemSpacing = 10;
    tb.appendChild(txt('Tags', 12, 16, 'Regular', T2, 'Tags label'));
    const tr = al('HORIZONTAL', 'Tag list');
    tb.appendChild(tr);
    tr.layoutSizingHorizontal = 'FILL';
    tr.layoutWrap = 'WRAP';
    tr.itemSpacing = 14;
    tr.counterAxisSpacing = 16;
    tr.paddingTop = tr.paddingBottom = 4; tr.paddingLeft = 4;
    for (const it of d.items) {
      const tf = await buildBadge(it.tag);
      tf.name = 'Tag ' + it.id;
      tr.appendChild(tf);
    }
    y = fam.y + fam.height + 40;
    done.push({ n, id: fam.id, title: d.title, items: d.items.length, h: Math.round(fam.height) });
  } catch (e) {
    if (fam) fam.remove();
    errors.push({ n, msg: String(e && e.message || e) });
  }
}
sec.resizeWithoutConstraints(1520, Math.max(400, y + 40));
return { sectionId: sec.id, sec: { x: sec.x, y: sec.y, w: sec.width, h: sec.height }, labelFont: FONT, done, errors };
