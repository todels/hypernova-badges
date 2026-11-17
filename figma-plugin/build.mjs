// node figma-plugin/build.mjs -> writes ui.html (the panel with convert.js inlined; Figma loads one file)
import { readFileSync, writeFileSync } from 'fs';
const dir = new URL('.', import.meta.url).pathname;
const src = readFileSync(dir + 'ui.src.html', 'utf8');
const conv = readFileSync(dir + 'convert.js', 'utf8');
writeFileSync(dir + 'ui.html', src.replace('<!-- convert.js -->', `<script>\n${conv}</script>`));
console.log('wrote ui.html');
