// Hypernova badge SVG -> Figma layer list.
// Runs in a browser (the plugin panel, or the creator for tests). Input: the SVG the creator copies
// ("Copy for Figma"), or any exported badge SVG. Output: one entry per Figma layer, with all of that
// layer's fills on it and the 1 px bevel as a real inside or outside stroke, so Figma needs no masks.
// Gradients stay in frame pixels here; code.js turns them into Figma's gradientTransform once it
// knows each layer's real bounds.
(function (root) {
  const BLEND = {
    normal: 'NORMAL', multiply: 'MULTIPLY', screen: 'SCREEN', overlay: 'OVERLAY', darken: 'DARKEN', lighten: 'LIGHTEN',
    'color-dodge': 'COLOR_DODGE', 'color-burn': 'COLOR_BURN', 'hard-light': 'HARD_LIGHT', 'soft-light': 'SOFT_LIGHT',
    difference: 'DIFFERENCE', exclusion: 'EXCLUSION', hue: 'HUE', saturation: 'SATURATION', color: 'COLOR', luminosity: 'LUMINOSITY',
    'plus-darker': 'LINEAR_BURN', 'plus-lighter': 'LINEAR_DODGE',
  };
  const r3 = (v) => Math.round(v * 1000) / 1000;

  // any SVG path -> Figma's path syntax: absolute M L Q C Z, space separated
  function normPath(d) {
    const t = String(d).match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
    const out = [];
    let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0;
    const num = () => +t[i++];
    while (i < t.length) {
      if (/[a-zA-Z]/.test(t[i])) cmd = t[i++];
      const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
      const ox = rel ? x : 0, oy = rel ? y : 0;
      if (C === 'Z') { out.push('Z'); x = sx; y = sy; continue; }
      if (C === 'M') { x = num() + ox; y = num() + oy; sx = x; sy = y; out.push('M', r3(x), r3(y)); cmd = rel ? 'l' : 'L'; continue; }
      if (C === 'L') { x = num() + ox; y = num() + oy; out.push('L', r3(x), r3(y)); continue; }
      if (C === 'H') { x = num() + ox; out.push('L', r3(x), r3(y)); continue; }
      if (C === 'V') { y = num() + oy; out.push('L', r3(x), r3(y)); continue; }
      if (C === 'C') {
        const a = [num() + ox, num() + oy, num() + ox, num() + oy, num() + ox, num() + oy];
        out.push('C', ...a.map(r3)); x = a[4]; y = a[5]; continue;
      }
      if (C === 'Q') {
        const a = [num() + ox, num() + oy, num() + ox, num() + oy];
        out.push('Q', ...a.map(r3)); x = a[2]; y = a[3]; continue;
      }
      throw new Error('unsupported path command ' + cmd);
    }
    return out.join(' ');
  }
  const rectPath = (x, y, w, h) => normPath(`M${x} ${y}H${x + w}V${y + h}H${x}Z`);
  const num = (el, a, dflt = 0) => { const v = el.getAttribute(a); if (v == null || v === '') return dflt; return v.trim().endsWith('%') ? parseFloat(v) / 100 : +v; };

  function color(s) {
    s = String(s || '').trim().toLowerCase();
    const named = { white: '#ffffff', black: '#000000' };
    s = named[s] || s;
    let m = s.match(/^#([0-9a-f]{3})$/);
    if (m) s = '#' + m[1].split('').map((c) => c + c).join('');
    m = s.match(/^#([0-9a-f]{6})$/);
    if (!m) return null;
    return { r: parseInt(m[1].slice(0, 2), 16) / 255, g: parseInt(m[1].slice(2, 4), 16) / 255, b: parseInt(m[1].slice(4, 6), 16) / 255 };
  }
  function styleProp(el, name) {
    const m = (el.getAttribute('style') || '').match(new RegExp('(?:^|;)\\s*' + name + '\\s*:\\s*([^;]+)'));
    return m ? m[1].trim() : el.getAttribute(name);
  }
  // presentation attributes inherit (the root svg says fill="none")
  function inherited(el, a) {
    for (let e = el; e && e.getAttribute; e = e.parentNode) { const v = styleProp(e, a); if (v != null) return v; }
    return null;
  }
  function stopsOf(g) {
    return [...g.querySelectorAll('stop')].map((st) => {
      const c = color(styleProp(st, 'stop-color') || '#000000') || { r: 0, g: 0, b: 0 };
      const a = styleProp(st, 'stop-opacity');
      return { position: Math.max(0, Math.min(1, num(st, 'offset'))), color: { ...c, a: a == null ? 1 : +a } };
    });
  }
  function matrixOf(s) {
    const m = (s || '').match(/matrix\(([^)]+)\)/);
    return m ? m[1].trim().split(/[\s,]+/).map(Number) : [1, 0, 0, 1, 0, 0];
  }
  // a fill or stroke value -> paint in frame pixels
  function paint(val, opacity, blend, ids) {
    if (!val || val === 'none') return null;
    const base = { opacity: opacity == null ? 1 : +opacity, blend: BLEND[blend || 'normal'] || 'NORMAL' };
    const u = val.match(/url\(#([^)]+)\)/);
    if (!u) { const c = color(val); return c ? { type: 'SOLID', color: c, ...base } : null; }
    const g = ids[u[1]];
    if (!g) return null;
    if ((g.getAttribute('gradientUnits') || '') !== 'userSpaceOnUse') throw new Error('gradient ' + u[1] + ' is not in user space');
    const stops = stopsOf(g);
    if (g.nodeName === 'linearGradient') {
      const [a, b, c, d, e, f] = matrixOf(g.getAttribute('gradientTransform'));
      const P = (x, y) => [a * x + c * y + e, b * x + d * y + f];
      const p1 = P(num(g, 'x1'), num(g, 'y1')), p2 = P(num(g, 'x2', 1), num(g, 'y2'));
      return { type: 'LINEAR', p1, p2, stops, ...base };
    }
    if (g.nodeName === 'radialGradient') {
      return { type: 'RADIAL', cx: num(g, 'cx', 0.5), cy: num(g, 'cy', 0.5), r: num(g, 'r', 0.5), m: matrixOf(g.getAttribute('gradientTransform')), stops, ...base };
    }
    return null;
  }

  // one SVG (the creator's output) -> { name, w, h, bg, layers: [...] }
  function fromSvg(svgText) {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svg = doc.documentElement;
    if (!svg || svg.nodeName !== 'svg' || doc.querySelector('parsererror')) throw new Error('not an SVG');
    const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    const W = vb.length === 4 ? vb[2] : num(svg, 'width', 150), H = vb.length === 4 ? vb[3] : num(svg, 'height', 150);
    const ids = {};
    for (const el of svg.querySelectorAll('[id]')) ids[el.getAttribute('id')] = el;
    const out = { name: svg.getAttribute('data-name') || 'Badge', w: W, h: H, bg: null, layers: [] };
    const byKey = new Map();
    let auto = 0;

    for (const el of svg.querySelectorAll('path, rect')) {
      if (el.closest('defs, clipPath, mask, pattern')) continue;
      const tag = el.getAttribute('data-l');
      const isRect = el.nodeName === 'rect';
      const rx = isRect ? num(el, 'x') : 0, ry = isRect ? num(el, 'y') : 0, rw = isRect ? num(el, 'width') : 0, rh = isRect ? num(el, 'height') : 0;
      // background: a full-size rect becomes the frame fill
      if (tag === 'bg' || (isRect && !out.layers.length && rx === 0 && ry === 0 && rw >= W && rh >= H)) {
        out.bg = color(el.getAttribute('fill'));
        continue;
      }
      const d = isRect ? rectPath(rx, ry, rw, rh) : normPath(el.getAttribute('d'));
      const rule = el.getAttribute('fill-rule') === 'evenodd' ? 'EVENODD' : 'NONZERO';
      const blend = styleProp(el, 'mix-blend-mode');
      const fill = paint(inherited(el, 'fill') ?? '#000000', el.getAttribute('fill-opacity'), blend, ids);
      let stroke = paint(el.getAttribute('stroke'), el.getAttribute('stroke-opacity'), blend, ids);
      let align = 'CENTER', weight = +(el.getAttribute('stroke-width') || 1);

      if (stroke) {
        // an SVG stroke clipped to its own outline is Figma's inside stroke; clipped to the outside, an outside stroke
        const clip = (el.getAttribute('clip-path') || '').match(/url\(#([^)]+)\)/);
        const cp = clip && ids[clip[1]] && ids[clip[1]].querySelector('path');
        if (cp) {
          const cd = normPath(cp.getAttribute('d'));
          if (cd === d) { align = 'INSIDE'; weight /= 2; }
          else if (cd.endsWith(d) && /^M -\d/.test(cd)) { align = 'OUTSIDE'; weight /= 2; }
        }
        // a group clip made of full-height rects only shows parts of the stroke: an alpha gradient across the frame
        const g = el.parentNode && el.parentNode.nodeName === 'g' ? el.parentNode : null;
        const gc = g && (g.getAttribute('clip-path') || '').match(/url\(#([^)]+)\)/);
        const rects = gc && ids[gc[1]] ? [...ids[gc[1]].children] : [];
        if (rects.length && rects.every((r) => r.nodeName === 'rect') && stroke.type === 'SOLID') {
          const iv = rects.map((r) => [Math.max(0, num(r, 'x')) / W, Math.min(W, num(r, 'x') + num(r, 'width')) / W]).sort((a, b) => a[0] - b[0]);
          const c = stroke.color, stops = [];
          let at = 0;
          for (const [a, b] of iv) {
            stops.push({ position: at, color: { ...c, a: 0 } }, { position: Math.max(at, a - 1e-4), color: { ...c, a: 0 } });
            stops.push({ position: Math.max(at, a), color: { ...c, a: 1 } }, { position: b, color: { ...c, a: 1 } });
            at = Math.min(1, b + 1e-4);
          }
          stops.push({ position: at, color: { ...c, a: 0 } }, { position: 1, color: { ...c, a: 0 } });
          stroke = { type: 'LINEAR', p1: [0, H / 2], p2: [W, H / 2], stops, opacity: stroke.opacity, blend: stroke.blend };
        }
      }

      // which layer: the creator tags them (data-n); untagged SVGs are grouped by outline
      let key = el.getAttribute('data-n');
      if (key == null) {
        const prev = out.layers[out.layers.length - 1];
        if (!fill && stroke) { const own = [...out.layers].reverse().find((L) => L.d === d && !L.strokes.length); key = own ? own.key : 'a' + ++auto; }
        else if (isRect && rw === 2 && rh === 2) key = 'dots';
        else if (prev && prev.d === d && prev.rule === rule && !prev.strokes.length) key = prev.key;
        else key = 'a' + ++auto;
      }
      let L = byKey.get(key);
      if (!L) {
        L = { key, name: tag || (key === 'dots' ? 'Dots' : 'Layer'), d, rule, fills: [], strokes: [], strokeWeight: 0, strokeAlign: 'CENTER' };
        byKey.set(key, L); out.layers.push(L);
      } else if (fill && L.d !== d) {
        // more outlines on one layer (dots, edge bars): add the subpath, keep one fill
        L.d += ' ' + d;
        continue;
      }
      if (fill) L.fills.push(fill);
      if (stroke) { L.strokes.push(stroke); L.strokeWeight = weight; L.strokeAlign = align; }
    }
    for (const L of out.layers) delete L.key;
    return out;
  }

  // a paste can hold several SVGs
  function fromText(text) {
    const svgs = String(text).match(/<svg[\s\S]*?<\/svg>/g) || [];
    return svgs.map(fromSvg);
  }

  const api = { fromSvg, fromText, normPath };
  root.hbFigma = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
