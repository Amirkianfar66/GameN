// Renders _svg/*.svg at twice the size (a person will look at them) to PNG; shotsA.py makes the page's WebP from them.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(), dir = path.join(__dirname, '_svg');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.svg'))) { const [, , W] = f.match(/^([A-E])-(\d+)-/), H = { 390: 844, 430: 932, 402: 742 }[W];
    const p = await b.newPage({ viewport: { width: +W, height: H }, deviceScaleFactor: 2 }); await p.setContent(`<style>html,body{margin:0}</style>${fs.readFileSync(path.join(dir, f), 'utf8')}`);
    await p.waitForTimeout(150); await p.screenshot({ path: path.join(dir, f.replace('.svg', '.png')) }); await p.close(); }
  await b.close(); console.log('rendered'); })();
