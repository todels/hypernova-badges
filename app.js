import {
  renderBadge, PALETTES, SHAPES, CUSTOM_SHAPES, registerShape, LIGHTS, TIER_ORDER, paletteFromColor,
  shapePaths, SIZE,
} from './engine.js';
import { FAMILIES, FIGMA_BADGES, NEW_BADGES, ALL_BADGES, FAMILY_SHAPES, SPARE_SHAPES, CLIMB, RARITY_COLOUR, RARITY_DOTS, LEVEL_SHOWCASE, LEVEL_BANDS, levelBadge, bandOf, OPEN } from './catalog.js';
import { GLYPH_SETS, placeGlyphs } from './presets.js';

/* ------------------------------------------------------------------ */
/* helpers                                                              */
/* ------------------------------------------------------------------ */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const keys = (p) => p.split('.').map((k) => (/^\d+$/.test(k) ? +k : k));
const getPath = (o, p) => keys(p).reduce((a, k) => (a == null ? a : a[k]), o);
function setPath(o, p, v) {
  const ks = keys(p);
  let a = o;
  ks.slice(0, -1).forEach((k, i) => { if (a[k] == null) a[k] = typeof ks[i + 1] === 'number' ? [] : {}; a = a[k]; });
  a[ks[ks.length - 1]] = v;
}
function delPath(o, p) {
  const ks = keys(p);
  const a = getPath(o, ks.slice(0, -1).join('.')) ?? (ks.length === 1 ? o : null);
  if (a) delete a[ks[ks.length - 1]];
}
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1600);
}
function download(name, data, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function svgToPng(svg, px) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = c.height = px;
  c.getContext('2d').drawImage(img, 0, 0, px, px);
  URL.revokeObjectURL(url);
  return new Promise((r) => c.toBlob(r, 'image/png'));
}
// minimal ZIP writer (store, no compression)
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(files) {
  const enc = new TextEncoder(), chunks = [], central = [];
  let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name), data = f.data, crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(8, 0, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + data.length;
  }
  const size = central.reduce((a, b) => a + b.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, size, true); e.setUint32(16, off, true);
  return new Blob([...chunks, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
}

/* ------------------------------------------------------------------ */
/* data                                                                 */
/* ------------------------------------------------------------------ */
for (const [name, def] of Object.entries(store.get('hb.shapes', {}))) registerShape(name, def);
let MINE = store.get('hb.mine', []);
const REF = new Set(FIGMA_BADGES.map((b) => b.id));
const paletteOf = (spec) => (spec.customColor ? paletteFromColor(spec.customColor) : PALETTES[spec.rarity] || PALETTES.silver);
const swatch = (p) => p.gem.stops[0][1];
const allShapes = () => ({ ...SHAPES, ...CUSTOM_SHAPES });
const familyOf = (spec) => Object.keys(FAMILIES).find((k) => JSON.stringify(FAMILIES[k].plate) === JSON.stringify(spec.plate) && JSON.stringify(FAMILIES[k].gem) === JSON.stringify(spec.gem));

const KNOWN = (list) => list.filter((k) => PALETTES[k]);
const S = {
  tab: store.get('hb.tab', 'library'),
  compare: 'off',
  spec: clone(store.get('hb.draft', null) || FIGMA_BADGES[0]),
  bg: 'black',
  zoom: 2,
  showRef: true,
  gen: store.get('hb.gen', { families: ['oval', 'hex', 'shield'], sets: ['diamond', 'sparkle', 'star5'], mode: 'levels', lvFrom: 1, lvTo: 250, rarities: ['bronze', 'silver', 'gold', 'ruby', 'purple'], from: 1, to: 6 }),
};

/* ------------------------------------------------------------------ */
/* tabs                                                                 */
/* ------------------------------------------------------------------ */
function setTab(t) {
  S.tab = t; store.set('hb.tab', t);
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('on', v.id === t));
  ({ library: renderLibrary, editor: buildEditor, generator: buildGenerator, rules: renderRules })[t]();
}
$('#tabs').addEventListener('click', (e) => { const t = e.target.closest('button')?.dataset.tab; if (t) setTab(t); });

/* ------------------------------------------------------------------ */
/* library                                                              */
/* ------------------------------------------------------------------ */
function card(b, mine = false) {
  const pal = paletteOf(b);
  const cmpOn = REF.has(b.id) && !mine && S.compare !== 'off';
  const svg = renderBadge(b, cmpOn && b.refBg ? { background: b.refBg } : {});
  let art = svg;
  if (REF.has(b.id) && !mine && S.compare === 'side') {
    art = `<figure><img src="ref/${b.id}.png" width="150" height="150" alt=""><figcaption>Figma</figcaption></figure><figure>${svg}<figcaption>Rebuilt</figcaption></figure>`;
  } else if (REF.has(b.id) && !mine && S.compare === 'diff') {
    art = `<div class="stack">${svg}<img class="diff" src="ref/${b.id}.png" width="150" height="150" alt=""></div>`;
  }
  const open = !mine && OPEN[b.id];
  return `<button class="card${open ? ' is-open' : ''}" data-open="${esc(b.id)}" data-mine="${mine ? 1 : ''}"${open ? ` title="Open: ${esc(open)}"` : ''}>
    <div class="art">${art}</div>
    <div class="meta"><b>${esc(b.id)}</b><span class="name">${esc(b.name)}</span></div>
    <div class="meta"><span class="chip"><i style="background:${swatch(pal)}"></i>${esc(pal.label)}</span>${open ? '<span class="open-tag">Open</span>' : ''}<span class="spacer"></span><span class="lv">L${b.level | 0}</span></div>
    ${open ? `<div class="open-why">${esc(open)}</div>` : ''}
  </button>`;
}
let LIB_GROUPS = [];
function renderLibrary() {
  const el = $('#library');
  LIB_GROUPS = [];
  const groups = new Map();
  // families A to K in catalogue order, then levels
  for (const b of ALL_BADGES) {
    const key = b.series;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b);
  }
  const cmp = S.compare !== 'off';
  let html = `<div class="toolbar">
    <span class="muted">Compare with Figma</span>
    <div class="seg" id="cmp">${['off', 'side', 'diff'].map((m) => `<button data-m="${m}" class="${S.compare === m ? 'on' : ''}">${{ off: 'Off', side: 'Side by side', diff: 'Difference' }[m]}</button>`).join('')}</div>
    ${S.compare === 'diff' ? '<span class="note">Black means identical. Remaining lines are intentional fixes (centring, whole-pixel sizes, dot rule).</span>' : ''}
    <div class="spacer"></div>
    <button class="btn" id="lib-new">New badge</button>
  </div>`;
  if (MINE.length) {
    html += `<div class="series"><h2>My badges <span>${MINE.length}</span></h2><div class="grid">${MINE.map((b) => card(b, true)).join('')}</div></div>`;
  }
  for (const [series, list] of groups) {
    const isFigma = list.some((b) => REF.has(b.id));
    const b0 = list[0];
    const note = isFigma ? ' done, as drawn in Figma'
      : b0.kind === 'level' ? ` on the ${FAMILIES[FAMILY_SHAPES.L].label} base. ${LEVEL_BANDS.map((b) => `${PALETTES[b.rarity].label} ${b.from} to ${b.to}`).join(', ')}. Make any range in the Generator`
      : ` on the ${FAMILIES[b0.family].label} base, ${esc(b0.familyNote)}. ${{ D: 'Colour by catalogue rarity, dots go up one per step', E: 'Colour by catalogue rarity, dots go up one per step; Comeback is a side badge', J: 'All common: silver, 2 dots' }[b0.id[0]] || 'Lowest to rarest; colour and dots by catalogue rarity'}`;
    const nOpen = list.filter((b) => OPEN[b.id]).length;
    LIB_GROUPS.push(list);
    html += `<div class="series"><h2>${esc(series)} <span>${list.length}${note}</span>${nOpen ? `<em class="open-count">${nOpen} open</em>` : ''}<button class="btn small copyfam" data-copyfam="${LIB_GROUPS.length - 1}" title="Copies every badge in this family; press &#8984;V in the Hypernova badges plugin in Figma">Copy for Figma</button></h2>
      <div class="grid ${cmp && isFigma ? 'cmp' : ''}">${list.map((b) => card(b)).join('')}</div></div>`;
  }
  el.innerHTML = html;
}
$('#library').addEventListener('click', (e) => {
  const m = e.target.closest('#cmp button')?.dataset.m;
  if (m) { S.compare = m; renderLibrary(); return; }
  if (e.target.closest('#lib-new')) { openSpec(blankSpec()); return; }
  const fam = e.target.closest('[data-copyfam]');
  if (fam) {
    const list = LIB_GROUPS[+fam.dataset.copyfam] || [];
    const text = list.map((b) => renderBadge(b, { target: 'figma' })).join('\n');
    navigator.clipboard.writeText(text).then(() => toast(`Copied ${list.length} badges. Press \u2318V in the Hypernova badges plugin in Figma.`), () => toast('Could not copy'));
    return;
  }
  const c = e.target.closest('[data-open]');
  if (c) {
    const list = c.dataset.mine ? MINE : ALL_BADGES;
    openSpec(list.find((b) => b.id === c.dataset.open));
  }
});

function blankSpec() {
  const f = FAMILIES.hex;
  return { id: 'X_1', name: 'New badge', series: 'My badges', family: 'hex', rarity: 'blue', level: 3, plate: clone(f.plate), gem: clone(f.gem), glyphs: placeGlyphs(GLYPH_SETS.diamond, f.gem).map((g) => ({ light: f.light, ...g })) };
}
function openSpec(spec) {
  S.spec = clone(spec);
  saveDraft();
  setTab('editor');
}
const saveDraft = () => store.set('hb.draft', S.spec);

/* ------------------------------------------------------------------ */
/* editor                                                               */
/* ------------------------------------------------------------------ */
const STYLES = [['glass', 'Glass'], ['glass-tint', 'Glass, tinted'], ['recess', 'Recess'], ['inlay', 'Inlay (gem)'], ['solid', 'Solid']];
const BLENDS = [['normal', 'Normal'], ['overlay', 'Overlay'], ['multiply', 'Multiply'], ['screen', 'Screen'], ['soft-light', 'Soft light']];

function num(label, path, { step = 1, ph = '' } = {}) {
  const v = getPath(S.spec, path);
  return `<label class="f"><span>${label}</span><input type="number" data-path="${path}" step="${step}" value="${v ?? ''}" placeholder="${ph}"></label>`;
}
function txt(label, path) {
  return `<label class="f"><span>${label}</span><input type="text" data-path="${path}" value="${esc(getPath(S.spec, path))}"></label>`;
}
function sel(label, path, options, { act = '', rebuild = true, value } = {}) {
  const v = value ?? getPath(S.spec, path) ?? options[0]?.[0];
  return `<label class="f"><span>${label}</span><select data-path="${path}" ${act ? `data-act="${act}"` : ''} ${rebuild ? 'data-rebuild="1"' : ''}>
    ${options.map(([k, l]) => (k === '--' ? `<optgroup label="${esc(l)}">` : `<option value="${esc(k)}" ${k === v ? 'selected' : ''}>${esc(l)}</option>`)).join('')}
  </select></label>`;
}
function chk(label, path, { act = '', checked } = {}) {
  const c = checked ?? !!getPath(S.spec, path);
  return `<label class="c"><input type="checkbox" data-path="${path}" ${act ? `data-act="${act}"` : ''} ${c ? 'checked' : ''}>${label}</label>`;
}
function shapeOptions() {
  const sh = allShapes();
  const plates = Object.entries(sh).filter(([, d]) => d.kind === 'plate');
  const glyphs = Object.entries(sh).filter(([, d]) => d.kind !== 'plate');
  const custom = Object.entries(CUSTOM_SHAPES).filter(([k]) => k !== '__preview');
  return [
    ['--', 'Plates and gems'], ...plates.filter(([k]) => !CUSTOM_SHAPES[k]).map(([k, d]) => [k, d.label]),
    ['--', 'Glyphs'], ...glyphs.filter(([k]) => !CUSTOM_SHAPES[k]).map(([k, d]) => [k, d.label]),
    ...(custom.length ? [['--', 'Imported'], ...custom.map(([k, d]) => [k, d.label])] : []),
    ['--', ' '], ['__import', 'Import shape...'],
  ];
}
function paramFields(prefix, shape) {
  const def = allShapes()[shape];
  const ps = Object.entries(def?.params || {});
  const flip = prefix.startsWith('glyphs') ? chk('Flip vertically', `${prefix}.params.flip`) : '';
  if (!ps.length && !flip) return '';
  return `<div class="row r3">${ps.map(([k, d]) => num(k, `${prefix}.params.${k}`, { step: d != null && Math.abs(d) <= 1 ? 0.01 : 0.5, ph: d ?? 'auto' })).join('')}</div>${flip}`;
}
function partBlock(title, prefix, el, extra = '') {
  return `<div class="sec"><h3>${title}<span class="spacer"></span>${extra}</h3>
    ${sel('Shape', `${prefix}.shape`, shapeOptions(), { act: 'shape' })}
    <div class="row r3">${num('Width', `${prefix}.w`)}${num('Height', `${prefix}.h`)}${num('Top (y)', `${prefix}.y`, { ph: 'centred' })}</div>
    ${paramFields(prefix, el.shape)}
  </div>`;
}
// a glyph lit with its own Figma handles shows as Custom until a preset is picked
function lightSel(p, g, o = {}) {
  const opts = Object.entries(LIGHTS).map(([k, v]) => [k, v.label]);
  const custom = !!g.light && typeof g.light === 'object';
  return sel('Light', `${p}.light`, custom ? [['custom', 'Custom (Figma)'], ...opts] : opts, custom ? { ...o, value: 'custom' } : o);
}
function glyphCard(g, i) {
  const p = `glyphs.${i}`;
  const st = g.style || 'glass';
  if (g.parts) {
    return `<div class="glyph"><div class="gh">${i + 1}. Compound (${g.parts.length} parts)<span class="spacer"></span>${gButtons(i)}</div>
      <div class="row r2">${sel('Style', `${p}.style`, STYLES)}${lightSel(p, g)}</div>
      <div class="note">Compound glyphs share one glass gradient and one bevel. Edit their parts in the JSON panel.</div></div>`;
  }
  if (g.text != null) {
    return `<div class="glyph"><div class="gh">${i + 1}. Number<span class="spacer"></span>${gButtons(i)}</div>
      <div class="row r3"><label class="f"><span>Text (digits)</span><input type="text" data-path="${p}.text" value="${esc(g.text)}"></label>${sel('Font', `${p}.font`, [['wide', 'PolySans Bulky Wide'], ['bulky', 'PolySans Bulky']], { rebuild: false })}${sel('Style', `${p}.style`, STYLES.filter(([k]) => k !== 'inlay'))}</div>
      <div class="row">${num('Cap height', `${p}.h`)}${num('Top', `${p}.y`)}${num('Tracking', `${p}.track`, { ph: -24 })}${num('Opacity', `${p}.alpha`, { step: 0.01, ph: st === 'recess' ? 0.49 : 1 })}</div>
      <div class="row r2">${lightSel(p, g, { rebuild: false })}${chk('Bevel', `${p}.bevel`, { act: 'bevel', checked: g.bevel !== false })}</div></div>`;
  }
  let styleFields = '';
  if (st === 'recess') styleFields = `<div class="row r2">${num('Opacity', `${p}.alpha`, { step: 0.01, ph: 0.49 })}${sel('Blend', `${p}.blend`, BLENDS, { rebuild: false })}</div>`;
  if (st === 'glass' || st === 'glass-tint') styleFields = `<div class="row r2">${num('Solid', `${p}.fill`, { step: 0.05, ph: 0 })}${num('Right shade', `${p}.shade`, { step: 0.05, ph: 0 })}</div>`;
  if (st === 'solid') styleFields = `<div class="row r2"><label class="f"><span>Colour</span><input type="text" data-path="${p}.color" value="${esc(g.color || '#FFFFFF')}"></label>${num('Opacity', `${p}.alpha`, { step: 0.01, ph: 1 })}</div>`;
  if (st === 'inlay') styleFields = `<div class="row r2">${sel('Inlay colour', `${p}.rarity`, TIER_ORDER.map((k) => [k, PALETTES[k].label]), { rebuild: false })}${chk('Split facet', `${p}.split`, { act: 'split', checked: g.split !== false })}</div>`;
  return `<div class="glyph">
    <div class="gh">${i + 1}. ${esc(allShapes()[g.shape]?.label || g.shape)}<span class="spacer"></span>${gButtons(i)}</div>
    <div class="row r2">${sel('Shape', `${p}.shape`, shapeOptions(), { act: 'shape' })}${sel('Style', `${p}.style`, STYLES)}</div>
    <div class="row">${num('W', `${p}.w`)}${num('H', `${p}.h`)}${num('Top', `${p}.y`)}${num('Pair x', `${p}.x`, { ph: 'none' })}</div>
    ${st !== 'inlay' ? `<div class="row r2">${lightSel(p, g, { rebuild: false })}${chk('Bevel', `${p}.bevel`, { act: 'bevel', checked: g.bevel !== false })}</div>` : ''}
    ${styleFields}
    ${paramFields(p, g.shape)}
  </div>`;
}
const gButtons = (i) => `<button class="btn icon sm" data-act="g-up" data-i="${i}" title="Move up">&uarr;</button><button class="btn icon sm" data-act="g-down" data-i="${i}" title="Move down">&darr;</button><button class="btn icon sm" data-act="g-dup" data-i="${i}" title="Duplicate">+</button><button class="btn icon sm" data-act="g-del" data-i="${i}" title="Remove">&times;</button>`;

function buildControls() {
  const s = S.spec;
  const pal = paletteOf(s);
  const fam = familyOf(s);
  const orn = s.ornaments || {};
  $('#ed-controls').innerHTML = `
    <div class="sec"><h3>Badge</h3>
      <div class="row r3">${txt('ID', 'id')}${txt('Name', 'name')}${txt('Series', 'series')}</div>
    </div>
    <div class="sec"><h3>Rarity colour</h3>
      <div class="swatches">
        ${TIER_ORDER.map((k) => `<button class="sw ${!s.customColor && s.rarity === k ? 'on' : ''}" data-act="rarity" data-v="${k}" title="${PALETTES[k].label} (${PALETTES[k].tier})"><i style="background:linear-gradient(135deg,${PALETTES[k].gem.stops[1][1]},${swatch(PALETTES[k])})"></i></button>`).join('')}
        <label class="sw ${s.customColor ? 'on' : ''}" title="Custom colour"><i style="background:${s.customColor || 'conic-gradient(#f55,#fd4,#4d8,#4cf,#86f,#f5c,#f55)'}"></i><input type="color" data-act="color" value="${s.customColor || '#ff7a00'}"></label>
      </div>
      <div class="tierline">${s.customColor ? `Custom colour ${esc(s.customColor)}, derived with the palette rule` : `${esc(pal.label)}, ${esc(pal.tier)}${pal.source === 'figma' ? ', measured from Figma' : ', derived with the palette rule'}`}</div>
    </div>
    <div class="sec"><h3>Level <span class="spacer"></span><b id="lvval">${s.level | 0}</b></h3>
      <input type="range" min="0" max="12" step="1" data-path="level" value="${s.level | 0}">
      <div class="row r3">${sel('Dot phase', 'dotPhase', [['auto', 'Auto'], ['split', 'Split'], ['anchored', 'Anchored']], { rebuild: false })}${num('Inset', 'dotInset', { step: 0.5, ph: 5 })}${num('Gem gap', 'dotClear', { step: 0.5, ph: 3 })}</div>
    </div>
    <div class="sec"><h3>Family</h3>
      ${sel('Plate + gem preset', '_family', [...Object.entries(FAMILIES).map(([k, f]) => [k, f.label]), ['custom', 'Custom']], { act: 'family', value: fam || 'custom' })}
    </div>
    ${partBlock('Plate', 'plate', s.plate)}
    ${s.gem ? partBlock('Gem', 'gem', s.gem, `${chk('Split', 'gem.split', { act: 'split', checked: s.gem.split !== false })}<button class="btn sm" data-act="gem-off">Remove</button>`) : '<div class="sec"><h3>Gem<span class="spacer"></span><button class="btn sm" data-act="gem-on">Add gem</button></h3></div>'}
    <div class="sec"><h3>Glyphs<span class="spacer"></span>
        <select data-act="g-add-set" style="width:auto"><option value="">Add set...</option>${Object.entries(GLYPH_SETS).filter(([k]) => k !== 'none').map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('')}</select>
        <button class="btn sm" data-act="g-add">Add</button><button class="btn sm" data-act="g-add-num">Number</button></h3>
      ${(s.glyphs || []).map(glyphCard).join('') || '<div class="note">No glyphs. Add one, or add a whole set.</div>'}
    </div>
    <div class="sec"><h3>Ornaments</h3>
      ${chk('Top bar', 'ornaments.topBar', { act: 'orn', checked: !!orn.topBar })}
      ${chk('Bottom chevron line', 'ornaments.bottomChevron', { act: 'orn', checked: !!orn.bottomChevron })}
      ${chk('Side arrows', 'ornaments.sideArrows', { act: 'orn', checked: !!orn.sideArrows })}
    </div>`;
}

function stageHtml() {
  const s = S.spec;
  const big = renderBadge(s, { scale: S.zoom, background: S.bg === 'black' ? '#000000' : 'none' });
  const one = renderBadge(s, { background: S.bg === 'black' ? '#000000' : 'none' });
  const ref = REF.has(s.id) && S.showRef ? `<figure><div class="bgbox"><img src="ref/${s.id}.png" width="${150 * S.zoom}" height="${150 * S.zoom}" alt=""></div><figcaption>Figma original</figcaption></figure>` : '';
  return { big, one, ref };
}
function buildStage() {
  const s = S.spec;
  $('#ed-stage').innerHTML = `
    <div class="stage-top">
      <span class="title" id="st-title"></span><span class="spacer"></span>
      ${REF.has(s.id) ? `<label class="c"><input type="checkbox" data-st="ref" ${S.showRef ? 'checked' : ''}>Show Figma</label>` : ''}
      <div class="seg">${[['black', 'Black'], ['none', 'Transparent']].map(([k, l]) => `<button data-st="bg" data-v="${k}" class="${S.bg === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="seg">${[2, 3].map((z) => `<button data-st="zoom" data-v="${z}" class="${S.zoom === z ? 'on' : ''}">${z}x</button>`).join('')}</div>
    </div>
    <div class="canvas" id="st-canvas"></div>
    <div class="strips">
      <div class="strip"><h4>Every colour</h4><div class="items" id="st-rar"></div></div>
      <div class="strip"><h4>Every level</h4><div class="items" id="st-lv"></div></div>
    </div>`;
  refreshStage();
}
function refreshStage() {
  const s = S.spec;
  const { big, one, ref } = stageHtml();
  $('#st-title').textContent = `${s.id || ''}  ${s.name || ''}`;
  $('#st-canvas').innerHTML = `${ref}<figure><div class="bgbox ${S.bg === 'none' ? 'checker' : ''}">${big}</div><figcaption>${S.zoom}x</figcaption></figure>
    <figure><div class="bgbox ${S.bg === 'none' ? 'checker' : ''}">${one}</div><figcaption>1x, 150 px</figcaption></figure>`;
  $('#st-rar').innerHTML = TIER_ORDER.map((k) => `<button data-st="rar" data-v="${k}" class="${!s.customColor && s.rarity === k ? 'on' : ''}">${renderBadge({ ...s, rarity: k, customColor: undefined }, { scale: 0.62 })}<span>${PALETTES[k].label}</span></button>`).join('');
  $('#st-lv').innerHTML = Array.from({ length: 11 }, (_, l) => `<button data-st="lv" data-v="${l}" class="${(s.level | 0) === l ? 'on' : ''}">${renderBadge({ ...s, level: l }, { scale: 0.5 })}<span>${l}</span></button>`).join('');
}
function buildInspector() {
  $('#ed-inspector').innerHTML = `
    <div class="sec"><h3>Export</h3>
      <div class="actions">
        <button class="btn" data-x="svg">SVG</button>
        <button class="btn" data-x="png1">PNG 150</button>
        <button class="btn" data-x="png2">PNG 300</button>
        <button class="btn" data-x="png4">PNG 600</button>
        <button class="btn wide primary" data-x="copyNative">Copy for Figma</button>
        <button class="btn wide" data-x="copy">Copy SVG</button>
      </div>
      <div class="note">Copy for Figma, then press &#8984;V in the Hypernova badges plugin (figma-plugin/ in the repo): one layer per part with all its fills and blend modes, bevels as real 1 px inside or outside strokes, no masks. Copy SVG pastes straight onto the canvas, but Figma turns every bevel into a mask.</div>
    </div>
    <div class="sec"><h3>Library</h3>
      <div class="actions">
        <button class="btn primary" data-x="save">Save to My badges</button>
        <button class="btn" data-x="new">New</button>
        <button class="btn" data-x="dup">Duplicate</button>
        <button class="btn" data-x="del" ${MINE.some((b) => b.id === S.spec.id) ? '' : 'disabled'}>Delete</button>
        <button class="btn wide" data-x="exportMine">Export My badges (JSON)</button>
      </div>
      <div class="note">My badges live in this browser. Export the JSON to share or keep them.</div>
    </div>
    <div class="sec" style="flex:1;min-height:0"><h3>Spec (JSON)<span class="spacer"></span><button class="btn sm" data-x="apply">Apply</button></h3>
      <textarea class="json" id="json" spellcheck="false"></textarea>
      <div class="err" id="json-err"></div>
    </div>`;
  refreshJson();
}
const refreshJson = () => { const t = $('#json'); if (t && document.activeElement !== t) t.value = JSON.stringify(S.spec, null, 1); };

function buildEditor() { buildControls(); buildStage(); buildInspector(); }
function refresh() {
  saveDraft();
  refreshStage();
  refreshJson();
  const lv = $('#lvval'); if (lv) lv.textContent = S.spec.level | 0;
}

// control events
const ctrl = $('#ed-controls');
function applyInput(el) {
  const path = el.dataset.path;
  if (!path || el.dataset.act) return;
  let v;
  if (el.type === 'number' || el.type === 'range') v = el.value === '' ? undefined : +el.value;
  else v = el.value;
  if (v === undefined || v === '' || (path.endsWith('dotPhase') && v === 'auto') || (path.endsWith('.blend') && v === 'normal')) delPath(S.spec, path);
  else setPath(S.spec, path, v);
  refresh();
}
ctrl.addEventListener('input', (e) => { const el = e.target; if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color') return; applyInput(el); });
ctrl.addEventListener('change', (e) => {
  const el = e.target;
  const act = el.dataset.act;
  const s = S.spec;
  if (act === 'shape') {
    if (el.value === '__import') { el.value = getPath(s, el.dataset.path); openShapeDialog(); return; }
    const pre = el.dataset.path.replace(/\.shape$/, '');
    setPath(s, el.dataset.path, el.value); delPath(s, `${pre}.params`);
  } else if (act === 'family') {
    if (el.value !== 'custom') {
      const f = FAMILIES[el.value], prev = FAMILIES[s.family];
      for (const k of Object.keys((prev && prev.spec) || {})) delete s[k];
      s.plate = clone(f.plate); s.gem = clone(f.gem); s.family = el.value; Object.assign(s, clone(f.spec || {}));
    }
  } else if (act === 'color') {
    s.customColor = el.value.toUpperCase(); s.rarity = 'custom';
  } else if (act === 'split' || act === 'bevel') {
    const key = el.dataset.path;
    if (el.checked) delPath(s, key); else setPath(s, key, false);
  } else if (act === 'orn') {
    if (el.checked) setPath(s, el.dataset.path, true); else delPath(s, el.dataset.path);
  } else if (act === 'g-add-set') {
    if (!el.value) return;
    const fam = FAMILIES[s.family] || {};
    s.glyphs = [...(s.glyphs || []), ...placeGlyphs(GLYPH_SETS[el.value], s.gem).map((g) => ({ light: fam.light || 'center', ...g }))];
  } else if (el.type === 'checkbox') {
    if (el.checked) setPath(s, el.dataset.path, true); else delPath(s, el.dataset.path);
  } else if (el.tagName === 'SELECT') {
    applyInput(el);
    if (!el.dataset.rebuild) return;
  } else return;
  buildControls(); refresh();
});
ctrl.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const s = S.spec, i = +b.dataset.i, g = s.glyphs || [];
  const act = b.dataset.act;
  if (act === 'rarity') { s.rarity = b.dataset.v; delete s.customColor; }
  else if (act === 'g-del') g.splice(i, 1);
  else if (act === 'g-dup') g.splice(i + 1, 0, clone(g[i]));
  else if (act === 'g-up' && i > 0) [g[i - 1], g[i]] = [g[i], g[i - 1]];
  else if (act === 'g-down' && i < g.length - 1) [g[i + 1], g[i]] = [g[i], g[i + 1]];
  else if (act === 'g-add') s.glyphs = [...g, { shape: 'diamond', w: 16, h: 16, y: 67, style: 'glass', light: (FAMILIES[s.family] || {}).light || 'center' }];
  else if (act === 'g-add-num') s.glyphs = [...g, { text: '12', font: 'wide', h: 22, y: 64, style: 'recess', alpha: 0.49, light: (FAMILIES[s.family] || {}).light || 'high' }];
  else if (act === 'gem-off') delete s.gem;
  else if (act === 'gem-on') s.gem = clone((FAMILIES[s.family] || FAMILIES.hex).gem);
  else return;
  buildControls(); refresh();
});
$('#ed-stage').addEventListener('click', (e) => {
  const b = e.target.closest('[data-st]');
  if (!b || b.tagName === 'INPUT') return;
  const v = b.dataset.v;
  if (b.dataset.st === 'bg') { S.bg = v; buildStage(); }
  if (b.dataset.st === 'zoom') { S.zoom = +v; buildStage(); }
  if (b.dataset.st === 'rar') { S.spec.rarity = v; delete S.spec.customColor; buildControls(); refresh(); }
  if (b.dataset.st === 'lv') { S.spec.level = +v; buildControls(); refresh(); }
});
$('#ed-stage').addEventListener('change', (e) => { if (e.target.dataset.st === 'ref') { S.showRef = e.target.checked; refreshStage(); } });

// inspector events
const fileName = () => (S.spec.id || 'badge').replace(/[^\w-]+/g, '_');
$('#ed-inspector').addEventListener('click', async (e) => {
  const x = e.target.closest('[data-x]')?.dataset.x;
  if (!x) return;
  const s = S.spec;
  const bg = S.bg === 'black' ? '#000000' : 'none';
  if (x === 'svg') download(`${fileName()}.svg`, renderBadge(s, { background: bg }), 'image/svg+xml');
  if (x.startsWith('png')) {
    const k = +x.slice(3);
    download(`${fileName()}@${k}x.png`, await svgToPng(renderBadge(s, { scale: k, background: bg }), 150 * k));
  }
  if (x === 'copy' || x === 'copyNative') {
    const svg = renderBadge(s, { background: bg, target: x === 'copyNative' ? 'figma' : undefined });
    const msg = x === 'copyNative' ? 'Copied. Press \u2318V in the Hypernova badges plugin in Figma.' : 'SVG copied. Paste into Figma.';
    try { await navigator.clipboard.writeText(svg); toast(msg); } catch { download(`${fileName()}.svg`, svg, 'image/svg+xml'); }
  }
  if (x === 'save') {
    const i = MINE.findIndex((b) => b.id === s.id);
    const item = { ...clone(s), series: s.series || 'My badges' };
    if (i >= 0) MINE[i] = item; else MINE.push(item);
    store.set('hb.mine', MINE); toast(`Saved ${s.id}`); buildInspector();
  }
  if (x === 'new') { S.spec = blankSpec(); buildEditor(); saveDraft(); }
  if (x === 'dup') { S.spec = { ...clone(s), id: `${s.id}_copy` }; buildEditor(); saveDraft(); }
  if (x === 'del') { MINE = MINE.filter((b) => b.id !== s.id); store.set('hb.mine', MINE); toast('Deleted'); buildInspector(); }
  if (x === 'exportMine') download('hypernova-my-badges.json', JSON.stringify({ badges: MINE, shapes: CUSTOM_SHAPES }, null, 1), 'application/json');
  if (x === 'apply') {
    try { S.spec = JSON.parse($('#json').value); $('#json-err').textContent = ''; buildControls(); refresh(); }
    catch (err) { $('#json-err').textContent = err.message; }
  }
});

/* ------------------------------------------------------------------ */
/* shape import                                                         */
/* ------------------------------------------------------------------ */
const dlg = $('#dlg-shape');
let pendingShape = null;
function openShapeDialog() {
  $('#shape-src').value = ''; $('#shape-name').value = ''; $('#shape-err').textContent = ''; $('#shape-preview').innerHTML = '';
  pendingShape = null; dlg.showModal();
}
dlg.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) dlg.close(); });
function pathFromSource(src) {
  src = src.trim();
  if (!src.startsWith('<')) return src;
  const doc = new DOMParser().parseFromString(src, 'image/svg+xml');
  const els = [...doc.querySelectorAll('path,polygon,rect,circle,ellipse')];
  if (!els.length) throw new Error('No path, polygon, rect, circle or ellipse found.');
  const toD = (el) => {
    const a = (n) => parseFloat(el.getAttribute(n) || 0);
    if (el.tagName === 'path') return el.getAttribute('d');
    if (el.tagName === 'polygon') return 'M' + el.getAttribute('points').trim().replace(/\s+/g, ' ') + 'Z';
    if (el.tagName === 'rect') return `M${a('x')} ${a('y')}h${a('width')}v${a('height')}h${-a('width')}Z`;
    const rx = el.tagName === 'circle' ? a('r') : a('rx'), ry = el.tagName === 'circle' ? a('r') : a('ry');
    return `M${a('cx') - rx} ${a('cy')}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
  };
  // the largest outline wins
  return els.map(toD).sort((p, q) => q.length - p.length)[0];
}
function sampleOutline(d) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('style', 'position:absolute;left:-9999px;visibility:hidden');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d.trim().split(/(?=[Mm])/)[0]);
  svg.append(p); document.body.append(svg);
  const L = p.getTotalLength(), N = 900, pts = [];
  for (let i = 0; i < N; i++) { const q = p.getPointAtLength((L * i) / N); pts.push([q.x, q.y]); }
  svg.remove();
  return pts;
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  let idx = 0, max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L;
    if (d > max) { max = d; idx = i; }
  }
  if (max <= eps) return [a, b];
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
}
function halfFromSource(src) {
  const pts = sampleOutline(pathFromSource(src));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const cx = (x0 + x1) / 2;
  // insert the points where the outline crosses the centre line
  const ring = [];
  const cross = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    ring.push(a);
    const da = a[0] - cx, db = b[0] - cx;
    if (da !== 0 && da * db < 0) {
      const t = da / (da - db);
      cross.push(ring.length); ring.push([cx, a[1] + (b[1] - a[1]) * t]);
    } else if (da === 0) cross.push(ring.length - 1);
  }
  if (cross.length < 2) throw new Error('The outline has to cross its vertical centre line at the top and the bottom.');
  const top = cross.reduce((m, i) => (ring[i][1] < ring[m][1] ? i : m), cross[0]);
  const bot = cross.reduce((m, i) => (ring[i][1] > ring[m][1] ? i : m), cross[0]);
  const walk = (from, to) => { const out = []; let i = from; for (;;) { out.push(ring[i]); if (i === to) break; i = (i + 1) % ring.length; } return out; };
  const A = walk(top, bot), B = walk(bot, top).reverse();
  const mean = (c) => c.reduce((s, p) => s + p[0] - cx, 0) / c.length;
  const side = mean(A) >= mean(B) ? A : B;
  let half = side.map(([x, y]) => [Math.max(0, x - cx), y - y0]);
  half[0][0] = 0; half[half.length - 1][0] = 0;
  const w = 2 * Math.max(...half.map((p) => p[0])), h = y1 - y0;
  half = rdp(half, Math.max(w, h) * 0.0015);
  const r = (v) => +v.toFixed(3);
  return {
    ref: [r(w), r(h)],
    half: { start: half[0].map(r), segs: half.slice(1).map((p) => ({ t: 'L', p: p.map(r) })) },
  };
}
function previewShape() {
  $('#shape-err').textContent = '';
  try {
    const res = halfFromSource($('#shape-src').value);
    const name = ($('#shape-name').value || 'custom').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    pendingShape = { name, def: { label: $('#shape-name').value || 'Custom', kind: $('#shape-kind').value, ...res } };
    registerShape('__preview', pendingShape.def);
    const asGlyph = pendingShape.def.kind === 'glyph';
    const k = res.ref[0] / res.ref[1];
    const gh = 30, gw = Math.round((gh * k) / 2) * 2;
    const spec = asGlyph
      ? { ...clone(FIGMA_BADGES[6]), level: 4, glyphs: [{ shape: '__preview', w: gw, h: gh, y: 60, style: 'glass', light: 'high' }] }
      : { rarity: 'purple', level: 5, plate: { shape: '__preview', w: Math.round(84 * Math.min(1, k) / 2) * 2, h: Math.round(84 / Math.max(1, k)), y: null }, gem: { shape: '__preview', w: Math.round(60 * Math.min(1, k) / 2) * 2, h: Math.round(60 / Math.max(1, k)) }, glyphs: [] };
    const sp = shapePaths('__preview', { x: 5, y: 5, w: 70 * Math.min(1, k), h: 70 / Math.max(1, k) }, {});
    $('#shape-preview').innerHTML = `<figure><div><svg width="80" height="80" viewBox="0 0 80 80"><path d="${sp.full}" fill="none" stroke="#fff" stroke-width="1"/><line x1="${sp.ax}" x2="${sp.ax}" y1="0" y2="80" stroke="#8b5cff" stroke-dasharray="2 2"/></svg></div>Mirrored outline</figure>
      <figure><div>${renderBadge(spec)}</div>On a badge</figure>`;
  } catch (err) { pendingShape = null; $('#shape-preview').innerHTML = ''; $('#shape-err').textContent = err.message; }
}
['input', 'change'].forEach((ev) => dlg.addEventListener(ev, (e) => { if (e.target.id?.startsWith('shape-')) previewShape(); }));
$('#shape-save').addEventListener('click', () => {
  if (!pendingShape) { previewShape(); if (!pendingShape) return; }
  let { name, def } = pendingShape;
  while (SHAPES[name] || (CUSTOM_SHAPES[name] && name !== '__preview')) name += '-2';
  registerShape(name, def);
  delete CUSTOM_SHAPES.__preview;
  const saved = store.get('hb.shapes', {}); saved[name] = def; store.set('hb.shapes', saved);
  dlg.close(); toast(`Added shape "${def.label}"`);
  if (S.tab === 'editor') buildControls();
});

/* ------------------------------------------------------------------ */
/* generator                                                            */
/* ------------------------------------------------------------------ */
function genSpecs() {
  const g = S.gen, out = [];
  g.rarities = KNOWN(g.rarities || []);
  if (g.mode === 'levels') {
    const a = Math.max(1, g.lvFrom ?? 1), b = Math.min(999, g.lvTo ?? 250);
    for (let n = a; n <= b; n++) out.push(levelBadge(n, { numberStyle: g.numberStyle }));
    return out;
  }
  for (const f of g.families) {
    const F = FAMILIES[f]; if (!F) continue;
    for (const k of g.sets) {
      const set = GLYPH_SETS[k]; if (!set) continue;
      const glyphs = placeGlyphs(set, F.gem).map((x) => ({ light: F.light, ...x }));
      for (const r of g.rarities) {
        for (let lv = g.from; lv <= g.to; lv++) {
          out.push({
            id: `${f}-${k}-${r}-L${lv}`, name: `${F.label} ${set.label}`, series: 'Generated', family: f, rarity: r, level: lv,
            plate: clone(F.plate), gem: clone(F.gem), glyphs: clone(glyphs),
            ...(f === 'star' || f === 'lens' ? { dotPhase: 'split' } : {}), ...clone(F.spec || {}),
          });
        }
      }
    }
  }
  return out;
}
const LIMIT = 600;
function buildGenerator() {
  const g = S.gen;
  const tog = (group, k, label, dot) => `<button class="tog ${g[group].includes(k) ? 'on' : ''}" data-g="${group}" data-k="${k}">${dot ? `<i style="background:${dot}"></i>` : ''}${esc(label)}</button>`;
  const specs = genSpecs();
  const mode = g.mode || 'badges';
  const modeSeg = `<div class="seg">${[['badges', 'Achievement badges'], ['levels', 'Level badges']].map(([k, l]) => `<button data-gmode="${k}" class="${mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const batch = `<div class="sec"><h3>Batch</h3>${modeSeg}<div><span class="count">${specs.length}</span> <span class="muted">badges</span></div>
      <div class="note">${mode === 'levels' ? `Levels ${g.lvFrom ?? 1} to ${g.lvTo ?? 250}, one badge per level` : `${g.families.length} families x ${g.sets.length} glyph sets x ${g.rarities.length} colours x ${Math.max(0, g.to - g.from + 1)} levels`}</div>
      <div class="actions">
        <button class="btn primary wide" data-gx="zipsvg">Download ZIP (SVG)</button>
        <button class="btn" data-gx="zippng">ZIP PNG 300</button>
        <button class="btn" data-gx="json">JSON specs</button>
      </div><div class="note" id="gen-status"></div>
    </div>`;
  if (mode === 'levels') {
    $('#gen-controls').innerHTML = `${batch}
      <div class="sec"><h3>Range</h3><div class="row r2">
        <label class="f"><span>From level</span><input type="number" min="1" max="999" data-gl="lvFrom" value="${g.lvFrom ?? 1}"></label>
        <label class="f"><span>To level</span><input type="number" min="1" max="999" data-gl="lvTo" value="${g.lvTo ?? 250}"></label></div></div>
      <div class="sec"><h3>Number style</h3><div class="chips">${[['engraved', 'Engraved'], ['glass', 'Glass']].map(([k, l]) => `<button class="tog ${(g.numberStyle || 'engraved') === k ? 'on' : ''}" data-nstyle="${k}">${l}</button>`).join('')}</div></div>
      <div class="sec"><h3>Bands</h3>${LEVEL_BANDS.map((b) => `<div class="tierline"><span class="chip"><i style="background:${swatch(PALETTES[b.rarity])}"></i>${PALETTES[b.rarity].label}</span> levels ${b.from} to ${b.to}, ${esc(b.label)}</div>`).join('')}
        <div class="note">Dots show progress through the band: 1 at the start, 5 near the top. Gold, ruby and purple ranges are a placeholder until the client confirms them (catalog.js, LEVEL_BANDS).</div></div>`;
  } else {
    $('#gen-controls').innerHTML = `${batch}
    <div class="sec"><h3>Families<span class="spacer"></span><button class="btn sm" data-all="families">All</button></h3><div class="chips">${Object.entries(FAMILIES).map(([k, f]) => tog('families', k, f.label)).join('')}</div></div>
    <div class="sec"><h3>Glyph sets<span class="spacer"></span><button class="btn sm" data-all="sets">All</button></h3><div class="chips">${Object.entries(GLYPH_SETS).map(([k, s]) => tog('sets', k, s.label)).join('')}</div></div>
    <div class="sec"><h3>Colours<span class="spacer"></span><button class="btn sm" data-all="rarities">All</button></h3><div class="chips">${TIER_ORDER.map((k) => tog('rarities', k, `${PALETTES[k].label}`, swatch(PALETTES[k]))).join('')}</div></div>
    <div class="sec"><h3>Levels</h3><div class="row r2">
      <label class="f"><span>From</span><input type="number" min="0" max="12" data-gl="from" value="${g.from}"></label>
      <label class="f"><span>To</span><input type="number" min="0" max="12" data-gl="to" value="${g.to}"></label></div></div>`;
  }
  const shown = specs.slice(0, LIMIT);
  $('#gen-out').innerHTML = `${specs.length > LIMIT ? `<div class="note" style="margin-bottom:10px">Showing the first ${LIMIT}. Downloads include all ${specs.length}.</div>` : ''}
    <div class="gen-grid">${shown.map((s, i) => `<button data-gi="${i}" title="${esc(s.id)}">${renderBadge(s, { scale: 0.7466 })}</button>`).join('')}</div>`;
  S.genCache = specs;
}
$('#gen-controls').addEventListener('click', async (e) => {
  const t = e.target.closest('[data-g]');
  const g = S.gen;
  const gm = e.target.closest('[data-gmode]')?.dataset.gmode;
  if (gm) { g.mode = gm; store.set('hb.gen', g); buildGenerator(); return; }
  const ns = e.target.closest('[data-nstyle]')?.dataset.nstyle;
  if (ns) { g.numberStyle = ns; store.set('hb.gen', g); buildGenerator(); return; }
  if (t) {
    const list = g[t.dataset.g], k = t.dataset.k;
    g[t.dataset.g] = list.includes(k) ? list.filter((x) => x !== k) : [...list, k];
    store.set('hb.gen', g); buildGenerator(); return;
  }
  const all = e.target.closest('[data-all]')?.dataset.all;
  if (all) {
    const every = { families: Object.keys(FAMILIES), sets: Object.keys(GLYPH_SETS), rarities: [...TIER_ORDER] }[all];
    g[all] = g[all].length === every.length ? [] : every;
    store.set('hb.gen', g); buildGenerator(); return;
  }
  const x = e.target.closest('[data-gx]')?.dataset.gx;
  if (!x) return;
  const specs = genSpecs();
  const status = $('#gen-status');
  const enc = new TextEncoder();
  if (x === 'json') download('hypernova-badges.json', JSON.stringify(specs, null, 1), 'application/json');
  if (x === 'zipsvg') download('hypernova-badges-svg.zip', zip(specs.map((s) => ({ name: `${s.id}.svg`, data: enc.encode(renderBadge(s)) }))));
  if (x === 'zippng') {
    const files = [];
    for (let i = 0; i < specs.length; i++) {
      status.textContent = `Rendering ${i + 1} / ${specs.length}`;
      const blob = await svgToPng(renderBadge(specs[i], { scale: 2 }), 300);
      files.push({ name: `${specs[i].id}@2x.png`, data: new Uint8Array(await blob.arrayBuffer()) });
    }
    status.textContent = '';
    download('hypernova-badges-png.zip', zip(files));
  }
});
$('#gen-controls').addEventListener('change', (e) => {
  const k = e.target.dataset.gl;
  if (!k) return;
  S.gen[k] = k.startsWith('lv') ? Math.max(1, Math.min(999, +e.target.value | 0)) : Math.max(0, Math.min(12, +e.target.value | 0));
  store.set('hb.gen', S.gen); buildGenerator();
});
$('#gen-out').addEventListener('click', (e) => {
  const i = e.target.closest('[data-gi]')?.dataset.gi;
  if (i != null) openSpec(S.genCache[+i]);
});

/* ------------------------------------------------------------------ */
/* rules                                                                */
/* ------------------------------------------------------------------ */
function renderRules() {
  const base = clone(FIGMA_BADGES.find((b) => b.id === 'B_7'));
  const steps = [
    ['1. Plate', { ...base, gem: null, glyphs: [], level: 0 }],
    ['2. Gem', { ...base, gem: { ...base.gem, split: false }, glyphs: [], level: 0 }],
    ['3. Left facet', { ...base, glyphs: [], level: 0 }],
    ['4. Glyphs', { ...base, level: 0 }],
    ['5. Level dots', base],
  ];
  const pRow = (k) => {
    const p = PALETTES[k];
    const half = p.half.map((f) => (f.type === 'linear' ? 'gem gradient repainted on the half' : `${f.color === '#000000' ? 'black' : f.color} ${Math.round(f.alpha * 100)}% ${f.blend === 'plus-darker' ? 'linear burn' : f.blend || 'normal'}`)).join(' + ');
    return `<tr><td>${renderBadge({ ...base, rarity: k }, { scale: 0.32 })}</td><td><b>${p.label}</b><br><span class="muted">${p.tier}</span></td>
      <td><span class="sq" style="background:${p.gem.stops[0][1]}"></span>${p.gem.stops[0][1]}<br><span class="sq" style="background:${p.gem.stops[1][1]}"></span>${p.gem.stops[1][1]}</td>
      <td><span class="sq" style="background:${p.plate.color}"></span>${p.plate.color} at ${Math.round(p.plate.alpha * 100)}%</td>
      <td>${half}</td><td>${p.source === 'figma' ? 'Figma' : 'Derived'}</td></tr>`;
  };
  const shapeTile = ([k, d]) => {
    const kk = d.ref ? d.ref[0] / d.ref[1] : 1;
    const w = 56 * Math.min(1, kk), h = 56 / Math.max(1, kk);
    const sp = shapePaths(k, { x: 34 - w / 2, y: 34 - h / 2, w, h }, {});
    return `<figure><svg width="68" height="68" viewBox="0 0 68 68" style="margin:0 auto"><line x1="34" x2="34" y1="2" y2="66" stroke="#8b5cff" stroke-opacity=".5" stroke-dasharray="2 2"/><path d="${sp.full}" fill="rgba(255,255,255,.06)" stroke="#fff" stroke-width="1"/></svg>${esc(d.label)}</figure>`;
  };
  const dotDemo = [1, 2, 3, 4, 5, 6, 8].map((n) => `<figure><div>${renderBadge({ ...FIGMA_BADGES[0], glyphs: [], level: n }, { scale: 0.5 })}</div>${n} dots</figure>`).join('');
  $('#rules').innerHTML = `<div class="doc">
    <h1>How a Hypernova badge is built</h1>
    <p class="muted">Every badge is a 150 x 150 frame on black, centred on x = 75. A badge is a small JSON spec, and the engine draws it from scratch: nothing is traced from the Figma file. All 28 Figma badges are rebuilt this way and can be compared in the Library.</p>

    <h2>Anatomy, bottom to top</h2>
    <div class="anat">${steps.map(([l, s]) => `<figure><div>${renderBadge(s, { scale: 0.8 })}</div>${l}</figure>`).join('')}</div>
    <ol>
      <li><b>Plate</b>: rarity tint at 12 to 16%, a white radial highlight at 20%, and a 1 px inside bevel.</li>
      <li><b>Gem</b>: a 3 stop linear gradient (dark, light at 41%, dark) plus the same inside bevel.</li>
      <li><b>Left facet</b>: the left half of the gem gets the palette's shading recipe and its own bevel. That bevel is what draws the centre line.</li>
      <li><b>Glyphs</b>: glass (white gradient that goes clear in the middle) or recess (black at 21 or 49%). Glyphs get a 1 px bevel on the outside.</li>
      <li><b>Dots and ornaments</b>: 2 x 2 white level dots, optional top bar, bottom chevron line and side arrows.</li>
    </ol>
    <div class="callout"><b>The bevel</b> is one rule used everywhere: a 1 px line, black at the top to white at the bottom, in Overlay. It sits inside plates and gems and outside glyphs.</div>

    <h2>Symmetry</h2>
    <p>Every shape is defined by its right half only and mirrored, so the left and right sides are identical by construction. Corners are true circular fillets with a set radius per corner. Sizes are whole pixels with even widths so the axis always lands on x = 75. Imported shapes go through the same step: the tool keeps the right half of whatever you paste and mirrors it.</p>
    <div class="shapes">${Object.entries(allShapes()).filter(([k]) => k !== '__preview').map(shapeTile).join('')}</div>

    <h2>Families</h2>
    <p>The badge catalogue in Figma has families A to K. A, B, C, H, I and K are drawn in Figma and stay as they are. D, E, F, G and J each get one of the seven base shapes drawn in Figma, and levels get the brilliant. No two families share a shape; the ${SPARE_SHAPES.map((k) => FAMILIES[k].label.toLowerCase()).join(', ')} is spare.</p>
    <p>The glyphs inside are drawn from the family's own outline, never from another family: a flower with 3, 4, 5 then 6 petals; the wavy seal itself, smaller, and rings of it; smaller shields; clouds with 3 to 5 fluffs and the cushion itself as rings and slabs (G_2 and G_3 use your rounded rhombuses from Figma); the pennant's notched flag. The rarer the badge, the fuller it gets: the top of each family has two layers of its shape (a recessed one under a glass one, or a ring around a core) and an echo of the gem.</p>
    <div class="anat">${Object.entries(FAMILY_SHAPES).map(([k, shape]) => { const top = k === 'L' ? levelBadge(200) : NEW_BADGES.filter((b) => b.id[0] === k).sort((a, b) => RARITY_DOTS[b.catalogue] - RARITY_DOTS[a.catalogue] || b.level - a.level)[0]; return `<figure><div>${renderBadge(top, { scale: 0.62 })}</div>${k === 'L' ? 'L. Levels' : esc(top.series)}<br><span class="muted">${esc(FAMILIES[shape].label)}</span></figure>`; }).join('')}</div>

    <h2>Colours</h2>
    <p>Badge colours follow the Figma badges: a badge takes the colour its catalogue rarity has in A, B, C, H, I and K: ${Object.entries(RARITY_COLOUR).map(([r, c]) => `${r} ${PALETTES[c].label.toLowerCase()}`).join(', ')}. Colours repeat inside a family, as in Figma (A is silver four times, then blue). Every family runs from lowest to rarest, and the icon gets fuller as the badge gets rarer. Dots: on a ladder step + 1 (D is silver, silver, blue, purple, purple with 2 to 6 dots), on a set by rarity (${Object.entries(RARITY_DOTS).map(([r, n]) => `${r} ${n}`).join(', ')}). Bronze and ruby are level colours (the client's level order is ${['bronze', 'silver', 'gold', 'ruby', 'purple'].map((k) => PALETTES[k].label.toLowerCase()).join(', ')}), not badge rarities.</p>
    <p>Silver, gold, purple and blue are measured from Figma, including blend modes. Bronze and ruby are new and follow the same recipe: bronze is built like gold (a metal: lower saturation, 12% plate), ruby like purple (a jewel: 16% plate, black 64% Overlay facet).</p>
    <table><tr><th></th><th>Colour</th><th>Gem dark / light</th><th>Plate tint</th><th>Left facet</th><th>Source</th></tr>${TIER_ORDER.map(pRow).join('')}</table>
    <div class="callout"><b>Blend accuracy.</b> Figma's Linear Burn (used on blue) is premultiplied: black at 17% subtracts 17% from every channel, which is darker than plain 17% black. Browsers have no linear burn, so the engine computes the exact Overlay and Linear Burn result and bakes the facet into one gradient. On screen it matches Figma within 1 to 3 levels per channel. "Copy SVG with native blend layers" keeps the original Figma layer stack instead.</div>

    <h2>Level dots</h2>
    <p>Every dot sits on one line: the plate outline moved 5 px inwards (to the dot centre), so all dots are the same distance from the plate edge on every shape. Along that line the dots are spaced evenly by length. Odd counts put one dot at bottom centre, even counts start at the sides, so 4 dots are top, bottom and both sides ("split" turns everything by half a step, used by the star and C_5 badges). Parts of the line covered by the gem, or closer than 3 px to it, are skipped, so a dot is never drawn on the gem. Dots snap to whole pixels and are mirrored. Same plate, gem and level always gives the same dots.</p>
    <div class="anat">${dotDemo}</div>

    <h2>Level badges</h2>
    <p>Every family has a base shape of its own, so levels are one family on the brilliant (the diamond), which no badge family uses. Each colour band is a step of that ladder and adds a little: ${LEVEL_BANDS.map((b) => `${PALETTES[b.rarity].label.toLowerCase()} ${esc(b.label)}`).join(', ')}. The level number is set in PolySans (the Hypernova font), converted to vector outlines so it exports cleanly and never depends on an installed font. Numbers are engraved by default, like the recessed B and C glyphs, so they read on light metals too. Dots show progress through the band.</p>
    <div class="anat">${[1, 19, 20, 49, 50, 99, 100, 199, 200, 999].map((n) => `<figure><div>${renderBadge(levelBadge(n), { scale: 0.62 })}</div>Level ${n}</figure>`).join('')}</div>
    <div class="callout">${LEVEL_BANDS.map((b) => `<b>${PALETTES[b.rarity].label}</b> ${b.from} to ${b.to}`).join(', ')}. Only bronze 1 to 19 and silver 20 to 49 were specified; the rest is a placeholder.</div>

    <h2>Glyph lighting</h2>
    <p>The Figma file uses two lighting setups, so they are presets now. <b>Center</b> (A and I rows): the glass highlight runs through the middle and the bevel spans the glyph. <b>High</b> (B, C and H rows): the highlight sits high and the bevel is lifted by 27% of the glyph height, which makes the lower edge brighter. Each family has a default.</p>

    <h2>What was corrected from the Figma file</h2>
    <ul>
      <li>Decimal sizes rounded to whole pixels (79.674 hex plates, 80.5 shields, 25 x 19.77 chevrons, 97 px crest box centred on 74.5).</li>
      <li>Off-centre parts moved onto x = 75: A_1 diamond, A_4 and A_5 chevrons, B_5 rivets (were -16 and +15), B_5 small hex, B_7 sparkle, C_5 outline, the I row crest and gems (were on 74.5).</li>
      <li>Level dots placed by one rule instead of by hand: the same distance from the plate edge everywhere, never on the gem. The first rule spaced them by angle from the centre, which left them at uneven distances from the edge and put some on the gem (I row).</li>
      <li><b>K_5</b> was a flat gold gem in the first rebuild. Figma's 2x bitmap shows a faceted gold setting (five flat facets, each with its own gradient and bevel) around a purple stone with a narrow top, and a crystal that is half solid white. Rebuilt that way (<code>bezel</code> on the gem, <code>fill</code> on the crystal).</li>
      <li>Gradient handles unified per palette and per lighting preset. In Figma, purple and silver used different vectors in different rows, and several glyphs were resized without rescaling their bevel gradient.</li>
      <li>Leftover hidden fills under gems removed.</li>
      <li><b>Base shapes (node 586:8480)</b>: the cloud plate behind the cushion was 3.3 px lopsided, now its right half mirrored. Octagon, U shield and wavy seal were scaled-up groups (dots 2.35 px, bevels 2.35 px), rebuilt at that size with 2 px dots and 1 px bevels. Gem tops on 40.25 and 43.45 rounded. The flower reused the pennant's dot positions, which put its top dot outside the plate; the dot rule fixes that.</li>
      <li><b>Gradient angle per shape</b>: Figma keeps one gradient handle in each layer's own 0 to 1 space and turns it into pixel end points only on export, so the same gradient leans differently on a square cushion than on a tall hex. The engine now does the same conversion, which brought the new bases from about 2.2 to 0.6 to 0.9 mean difference and the A, C and I rows closer too.</li>
    </ul>
    <h2>Inconsistencies to decide on</h2>
    <ul>
      <li><b>I_2 Rainmaker</b> is purple but its plate uses the silver tint. Rebuilt with the purple tint.</li>
      <li><b>C_4 $15k</b>: the bottom chevron and centre hex were mirrored with their lighting, so they are lit from below. Rebuilt with normal top-down light.</li>
      <li><b>H row</b> gems have no left facet (no centre line), unlike every other row. Kept as in Figma via <code>split: false</code>.</li>
      <li><b>Dot counts per level</b> differ between ladders: A and B start at 2 dots, I starts at 3, every K badge has 4, K_5 has 3. The rebuilt families use dots = step + 1.</li>
      <li><b>C_1 and I_1</b> radial highlights are off-centre in Figma. Rebuilt centred.</li>
      <li><b>K row</b> is exported from Figma as bitmaps, so it is rebuilt from the renders: the star is the same curve as the B_7 sparkle, the side arrows are the last 5 px of a larger star outline. K_3 and K_4 use flipped lighting in Figma.</li>
    </ul>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* boot                                                                 */
/* ------------------------------------------------------------------ */
$('#logo').innerHTML = renderBadge(FIGMA_BADGES.find((b) => b.id === 'B_7'), { scale: 0.22, background: 'none' });
$('#stat').textContent = `Families A to K: ${FIGMA_BADGES.length + NEW_BADGES.length} badges (${NEW_BADGES.length} new on the base shapes), plus levels, ${TIER_ORDER.length} colours`;
setTab(S.tab);
