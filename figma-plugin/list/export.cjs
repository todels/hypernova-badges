// exports every family (as on list.html) as plugin layer data: badges (no background) + tags
const { chromium } = require('/Users/ludde/Repos/foci-dots/node_modules/playwright-core');
const fs = require('fs');
const OUT = process.argv[2];
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.goto('http://127.0.0.1:5230/test.html?' + Date.now());
  await page.waitForFunction(() => window.ready);
  await page.addScriptTag({ path: '/Users/ludde/Repos/hypernova-badges/figma-plugin/convert.js' });
  const fams = await page.evaluate(async () => {
    const E = await import('/engine.js?' + Date.now()), C = await import('/catalog.js?' + Date.now());
    const R = (x) => (typeof x === 'number' ? Math.round(x * 1000) / 1000 : Array.isArray(x) ? x.map(R) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, R(v)])) : typeof x === 'string' ? x.replace(/-?\d+\.\d{4,}/g, (n) => String(Math.round(+n * 1000) / 1000)) : x);
    const fams = [];
    for (const b of C.ALL_BADGES.filter((x) => x.kind !== 'level' && !String(x.id).startsWith('LV_'))) {
      let f = fams.find((x) => x.series === b.series);
      if (!f) fams.push((f = { series: b.series, shape: C.FAMILIES[b.family]?.label || '', list: [] }));
      f.list.push(b);
    }
    fams.push({ series: 'L. Levels', shape: 'Brilliant', list: C.LEVEL_SHOWCASE });
    const RAR = (b) => b.catalogue || b.figmaCatalogue || '';
    return fams.map((f) => ({
      title: f.series, shape: f.shape,
      items: f.list.map((b) => ({
        id: b.id, name: b.name, colour: E.PALETTES[b.rarity]?.label || b.rarity, rarity: RAR(b),
        badge: R(hbFigma.fromText(E.renderBadge(b, { target: 'figma', background: 'none' }))[0]),
        tag: R(hbFigma.fromText(E.renderTag(b, { target: 'figma' }))[0]),
      })),
    }));
  });
  fams.forEach((f, i) => fs.writeFileSync(`${OUT}/fam${String(i).padStart(2, '0')}.json`, JSON.stringify(f)));
  console.log(fams.map((f, i) => `${i} ${f.title} ${f.items.length} items ${JSON.stringify(f).length} bytes`).join('\n'));
  console.log('sample keys', Object.keys(fams[0].items[0]), fams[0].items[0].rarity);
  await browser.close();
})();
