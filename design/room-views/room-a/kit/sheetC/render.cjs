// Renders sheet RA-A's SVGs to PNGs at each SVG's own size (the guides 1024 x 1536) in Chromium, at a device scale of 1: Room B's render8.cjs
// with the page's charset given (UTF-8), so the annotations' middle dots and times signs render. Usage: node render.cjs a.svg,b.svg,...
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1024, height: 1536 }, deviceScaleFactor: 1 });
  for (const f of process.argv[2].split(',')) {
    const html = path.join(__dirname, '_' + f.replace('.svg', '.html')); fs.writeFileSync(html, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000">${fs.readFileSync(path.join(__dirname, f), 'utf8')}</body>`);
    await p.goto('file://' + html); await p.waitForLoadState('load'); await p.waitForTimeout(250); const svg = fs.readFileSync(path.join(__dirname, f), 'utf8'), W = +(svg.match(/<svg[^>]*\swidth="(\d+)"/) || [0, 1024])[1], H = +(svg.match(/<svg[^>]*\sheight="(\d+)"/) || [0, 1536])[1];
    await p.screenshot({ path: path.join(__dirname, f.replace('.svg', '.png')), clip: { x: 0, y: 0, width: W, height: H } }); fs.unlinkSync(html); }
  await b.close(); console.log('rendered', process.argv[2].split(',').length); })();
