// Renders Room A's stand-ins (A.svg to E.svg) to PNG, and measures the tags and the out-of-view chips for Room A's names at 100%
// and 200% text, with the room page's tag style (a disc with the number, then the words), so the layout keeps them clear.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
  for (const pl of ['A', 'B', 'C', 'D', 'E']) { const svg = fs.readFileSync(path.join(__dirname, pl + '.svg'), 'utf8');
    await p.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`); await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(__dirname, pl + '.png'), omitBackground: true, clip: { x: 0, y: 0, width: 900, height: 900 } }); }
  const NAMES = { A1: [1, 'Vega'], A2: [2, 'Mira'], A3: [3, 'Echo'], A4: [4, 'Atlas'], A5: [5, 'Lyra'] }, out = {};   // as cast.mjs
  for (const k of [1, 2]) {
    const css = `<style>body{margin:0;font-family:-apple-system,system-ui,sans-serif} .tag{position:absolute;display:inline-flex;align-items:center;gap:${5 * k}px;height:${26 * k}px;box-sizing:border-box;padding:0 ${10 * k}px 0 ${3 * k}px;border-radius:999px;border:1.5px solid #888;font:600 ${13 * k}px/1 -apple-system,system-ui,sans-serif;white-space:nowrap} .n{width:${20 * k}px;height:${20 * k}px;border-radius:50%;display:grid;place-items:center;font:800 ${12 * k}px/1 -apple-system,system-ui,sans-serif;background:#ddd}</style>`;
    await p.setContent(css + Object.entries(NAMES).map(([id, [n, nm]], i) => `<div class="tag" id="t${id}" style="top:${i * 70}px"><span class="n">${n}</span><span>${nm}</span></div><div class="tag" id="c${id}" style="top:${i * 70 + 400}px"><span class="n">${n}</span><span>${nm} · out of view</span></div>`).join(''));
    for (const id of Object.keys(NAMES)) { const t = await p.locator('#t' + id).boundingBox(), c = await p.locator('#c' + id).boundingBox(); const o = (out[k * 100] ??= {}); o['t' + id] = [Math.ceil(t.width), Math.ceil(t.height)]; o['chip' + id] = [Math.ceil(c.width), Math.ceil(c.height)]; } }
  fs.writeFileSync(path.join(__dirname, 'tags.json'), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out)); await b.close(); })();
