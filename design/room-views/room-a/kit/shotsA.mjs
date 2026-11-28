// Writes each view's phone pictures as SVG, for shotsA.cjs to render: five views, both phones, 100% and 200% text, with the
// stand-ins inlined (for rendering only). Also writes views.json: what each picture shows, for the page. Generates nothing.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { stageView, IDS, FULL, CAST, STAGING } from './stageA.mjs';
const DIR = new URL('./', import.meta.url).pathname, OUT = DIR + '_svg/'; mkdirSync(OUT, { recursive: true });
const DATA = Object.fromEntries(IDS.map(pl => [pl, 'data:image/png;base64,' + readFileSync(DIR + `vis/${pl}.png`).toString('base64')]));
const views = {};
for (const v of IDS) { const s = stageView(v, { labels: false, squares: false }), sq = stageView(v, { labels: false, squares: true });
  for (const [key, vw] of Object.entries(s.views)) { const [ph, pct] = key.split('@'), name = `${v}-${ph.split('x')[0]}-${pct}`;
    writeFileSync(OUT + name + '.svg', vw.svg.replace(/href="([A-E])\.png"/g, (m, pl) => `href="${DATA[pl]}"`));
    writeFileSync(OUT + name + '-sq.svg', sq.views[key].svg.replace(/href="([A-E])\.png"/g, (m, pl) => `href="${DATA[pl]}"`));
    views[name] = { view: v, phone: ph, pct: +pct, issues: vw.issues, seen: Object.values(vw.per).map(c => ({ name: c.name, seenDeg: c.seenDeg, head: c.head, depthM: c.distM, heightPx: c.heightPx, tagAt: c.tagAt, margins: [c.marginL, c.marginR, c.marginTop, c.marginFoot] })),
      out: vw.chip?.name ?? null, window: vw.features.window.inPicture, capsule: vw.features.capsule.inPicture, minEdgePx: Math.min(...Object.values(vw.per).map(c => Math.min(c.marginL, c.marginR))) }; } }
writeFileSync(DIR + 'views.json', JSON.stringify(views, null, 1)); console.log(Object.keys(views).length, 'pictures');
