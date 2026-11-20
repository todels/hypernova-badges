// figlist/famNN.json -> figlist/carNN.svg: the JSON as ASCII text chunks (no spaces), one <text> per chunk
const fs = require('fs');
const CH = 8000;
for (const f of fs.readdirSync('figlist').filter((x) => /^fam\d+\.json$/.test(x))) {
  const n = f.slice(3, 5);
  const s = fs.readFileSync('figlist/' + f, 'utf8').replace(/[\u007f-￿ ]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  const parts = [];
  for (let i = 0; i < s.length; i += CH) parts.push(s.slice(i, i + CH));
  let sum = 0; for (let i = 0; i < s.length; i++) sum = (sum * 31 + s.charCodeAt(i)) >>> 0;
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="${12 * parts.length + 12}" viewBox="0 0 200 ${12 * parts.length + 12}">` +
    parts.map((p, i) => `<text x="0" y="${12 * (i + 1)}" font-family="Inter" font-size="10" fill="#000000">HB${n}.${i}.${parts.length}:${esc(p)}</text>`).join('') + '</svg>';
  fs.writeFileSync(`figlist/car${n}.svg`, svg);
  console.log(n, s.length, parts.length, 'sum', sum);
}
