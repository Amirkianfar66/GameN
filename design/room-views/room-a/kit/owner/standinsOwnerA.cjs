// View A owner page's stand-ins: the Room A plan's stand-in drawings (../vis/B.svg Mira, C.svg Echo, E.svg Lyra: the approved crew
// drawing in each place's Room A gesture, drawn by code), rendered to 1200 x 1200 PNG with a clear background, so the page needs
// no SVG of its own. Usage: node standinsOwnerA.cjs
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
  for (const pl of ['B', 'C', 'E']) { const svg = fs.readFileSync(path.join(__dirname, '..', 'vis', pl + '.svg'), 'utf8').replace('width="900" height="900"', 'width="1200" height="1200"');
    await p.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`); await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(__dirname, `standin-${pl}.png`), omitBackground: true, clip: { x: 0, y: 0, width: 1200, height: 1200 } }); console.log(pl, 'rendered'); }
  await b.close(); })();
