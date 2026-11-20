// SVG -> PNG in the browser. Tags draw their label on the canvas, not inside the SVG image: an SVG drawn
// as an image only sees installed fonts, the canvas also sees the page's web fonts (Inter on the list
// page), which is the font the pill was measured for.
import { renderTag, tagSize, tagText } from './engine.js';

const decode = async (svg) => {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const img = new Image();
  img.src = url;
  await img.decode();
  URL.revokeObjectURL(url);
  return img;
};
const toBlob = (c) => new Promise((r) => c.toBlob(r, 'image/png'));

export async function svgToPng(svg, px, py = px) {
  const c = document.createElement('canvas');
  c.width = px; c.height = py;
  c.getContext('2d').drawImage(await decode(svg), 0, 0, px, py);
  return toBlob(c);
}

// tag PNG at scale k with `bleed` px of room around the frame (the badge spills over it)
export async function tagPng(spec, k = 2, opts = {}, bleed = 4) {
  const { w, h } = tagSize(spec, opts), L = tagText(spec, opts);
  const c = document.createElement('canvas');
  c.width = Math.round((w + 2 * bleed) * k); c.height = Math.round((h + 2 * bleed) * k);
  const g = c.getContext('2d');
  g.drawImage(await decode(renderTag(spec, { ...opts, noText: true, bleed, scale: k })), 0, 0, c.width, c.height);
  // the label: #D6D6D6 to white over the cap height, shadow 0 0.5 0.5 black 16%
  g.scale(k, k);
  g.translate(bleed, bleed);
  g.font = `600 ${L.size}px ${L.font}`;
  g.textBaseline = 'alphabetic';
  const grad = g.createLinearGradient(0, L.top, 0, L.base);
  grad.addColorStop(0, '#D6D6D6'); grad.addColorStop(1, '#FFFFFF');
  g.fillStyle = grad;
  g.shadowColor = 'rgba(0, 0, 0, 0.16)'; g.shadowOffsetY = 0.5 * k; g.shadowBlur = 0.5 * k;
  g.fillText(L.text, L.x, L.base);
  return toBlob(c);
}
