// View A owner page's captures and checks, on the preview the publish serves (Room B's publish wrapper, ../../roomb/pv6b/
// skeleton.html, around pub/owner-a.html): on each phone at both text sizes, every tag, chip and control lands where the plan's
// layout puts it (within 1 px, in stage px); every picture loads; the page never scrolls sideways at 390, 402 or 430 px. Captures
// (device scale 2, as a person sees them): the first screen on each phone, with the room set to that phone; and the phone frame on
// each phone at both text sizes. Writes _cap/*.png and _cap/checks.json; labelOwnerA.py labels them and writes shots.json.
// Usage: node captureOwnerA.cjs
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const D = __dirname, PUB = path.join(D, 'pub'), CAP = path.join(D, '_cap');
fs.mkdirSync(CAP, { recursive: true });
const sk = fs.readFileSync(path.join(D, '..', '..', 'roomb', 'pv6b', 'skeleton.html'));
fs.writeFileSync(path.join(PUB, 'index.html'), Buffer.concat([sk, fs.readFileSync(path.join(PUB, 'owner-a.html')), Buffer.from('\n</body></html>')]));
const PHONES = [['402x742', 402, 742], ['390x844', 390, 844], ['430x932', 430, 932]];
(async () => {
  const b = await chromium.launch(); const out = { boxes: {}, page: {}, roomOnly: {}, errors: [] };
  for (const [key, W, H] of PHONES) {
    const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    p.on('pageerror', e => out.errors.push(String(e))); p.on('console', m => { if (m.type() === 'error') out.errors.push(m.text()); });
    await p.goto('file://' + path.join(PUB, 'index.html')); await p.waitForTimeout(300);
    await p.evaluate(k => window.roomA.set({ phone: k, pct: 100, press: false, show: 'all' }), key); await p.waitForTimeout(700);
    out.page[W] = await p.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
      broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')), images: document.images.length }));
    await p.screenshot({ path: path.join(CAP, `first-${key}.png`) });
    // every box against the layout, on every phone and text size, measured on this viewport's page
    if (key === '402x742') for (const [k2] of PHONES) for (const pct of [100, 200]) {
      await p.evaluate(([k, c]) => window.roomA.set({ phone: k, pct: c, press: true, show: 'all' }), [k2, pct]); await p.waitForTimeout(250);
      out.boxes[`${k2}@${pct}`] = await p.evaluate(([k, c]) => {
        const st = document.getElementById('stage'), r0 = st.getBoundingClientRect(), s = st.offsetWidth / r0.width, L = window.roomA.data.phones[k].byPct[c];
        const rel = e => { const r = e.getBoundingClientRect(); return [(r.left - r0.left) * s, (r.top - r0.top) * s, (r.right - r0.left) * s, (r.bottom - r0.top) * s]; };
        const want = [...L.tags.map(t => ['tag ' + t.id, t]), ['ooc', L.ooc], ['you', L.chrome.you], ['board', L.chrome.boardChip], ['control', L.chrome.control]];
        const got = [...document.querySelectorAll('#stage .ov.tag.name')].map(e => ['tag ' + e.dataset.id, rel(e)]).concat([['ooc', rel(document.querySelector('#stage .ov.tag.ooc'))], ['you', rel(document.querySelector('#stage .ov.you'))], ['board', rel(document.querySelector('#stage .ov.board'))], ['control', rel(document.querySelector('#stage .ov.control'))]]);
        let worst = 0; const bad = [];
        for (const [n, w] of want) { const g = got.find(x => x[0] === n); if (!g) { bad.push(n + ' missing'); continue; } const d = Math.max(Math.abs(g[1][0] - w.x0), Math.abs(g[1][1] - w.y0), Math.abs(g[1][2] - w.x1), Math.abs(g[1][3] - w.y1)); worst = Math.max(worst, d); if (d > 1) bad.push(n + ' off by ' + d.toFixed(2)); }
        // the text inside each tag and chip fits its box
        const overflow = [...document.querySelectorAll('#stage .ov')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.className + ' ' + (e.dataset.id ?? ''));
        const people = [...document.querySelectorAll('#stage img[data-id]')].map(i => i.dataset.id);
        return { worstPx: +worst.toFixed(2), bad, overflow, people, issues: L.issues, presses: document.querySelectorAll('#stage .ov.press').length };
      }, [k2, pct]);
    }
    for (const pct of [100, 200]) { await p.evaluate(([k, c]) => window.roomA.set({ phone: k, pct: c, press: false }), [key, pct]); await p.waitForTimeout(250);
      await (await p.$('#phone-wrap')).screenshot({ path: path.join(CAP, `phone-${key}-${pct}.png`) }); }
    // Room only (the Lead, 14:59): the painting alone on the stage, nothing drawn over it
    await p.evaluate(k => window.roomA.set({ phone: k, pct: 100, press: false, show: 'room' }), key); await p.waitForTimeout(250);
    out.roomOnly[key] = await p.evaluate(() => ({ overlays: document.querySelectorAll('#stage .ov').length, people: document.querySelectorAll('#stage img[data-id]').length, images: document.querySelectorAll('#stage img').length,
      pressed: [...document.querySelectorAll('#show button')].map(b => b.textContent + ':' + b.getAttribute('aria-pressed') + ':' + Math.round(b.getBoundingClientRect().height)) }));
    await (await p.$('#phone-wrap')).screenshot({ path: path.join(CAP, `phone-${key}-room.png`) });
    await p.close();
  }
  fs.writeFileSync(path.join(CAP, 'checks.json'), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out)); await b.close();
})();
