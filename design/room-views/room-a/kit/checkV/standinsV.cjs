// Room A, views B and C: the people's stand-ins, as view A's owner page has them (../owner/standinsOwnerA.cjs): the Room A plan's
// stand-in drawings (../vis/<place>.svg: the approved crew drawing in each place's Room A gesture, drawn by code), rendered to
// 1200 x 1200 PNG with a clear background. Writes <V>/standin-<place>.png for the places in view. Usage: node standinsV.cjs B|C
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const V = process.argv[2], scene = JSON.parse(fs.readFileSync(path.join(__dirname, V, `scene-${V}.json`), 'utf8'));
const places = [...new Set(Object.values(scene.phones).flatMap(p => p.people.map(q => q.place)))];
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
  for (const pl of places) { const svg = fs.readFileSync(path.join(__dirname, '..', 'vis', pl + '.svg'), 'utf8').replace('width="900" height="900"', 'width="1200" height="1200"');
    await p.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`); await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(__dirname, V, `standin-${pl}.png`), omitBackground: true, clip: { x: 0, y: 0, width: 1200, height: 1200 } }); console.log(pl, 'rendered'); }
  await b.close(); })();
