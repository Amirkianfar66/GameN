// Room A's owner page: its captures and checks (the check pages', ../checkV/captureCheckV.cjs, for all five views), on the preview the
// publish serves (Room B's publish wrapper, ../../roomb/pv6b/skeleton.html, around pub/owner-room-a.html): in every view, on each
// phone at both text sizes, every tag, chip and control lands where the plan's layout puts it (within 1 px, in stage px), the words
// fit, and the stage draws the plate, the live screens, then each person with the layer parts nearer than them right after them;
// Room only leaves the painting alone; every picture loads; the page never scrolls sideways at 390, 402 or 430 px. Captures (device
// scale 2): the first screen on each phone; each view on each phone with people at 100% text; and each view on 402 x 742 at 200% text
// and room only. Writes _cap/*.png and _cap/checks.json; labelOwnerRA.py labels them. Usage: node captureOwnerRA.cjs
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path'); const http = require('http');
// served over a local HTTP server, as the publish serves it (a module page cannot import its vendored modules from file://)
const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };
const D = __dirname, PUB = path.join(D, 'pub'), CAP = path.join(D, '_cap');
fs.mkdirSync(CAP, { recursive: true });
const sk = fs.readFileSync(path.join(D, '..', '..', 'roomb', 'pv6b', 'skeleton.html'));
fs.writeFileSync(path.join(PUB, 'index.html'), Buffer.concat([sk, fs.readFileSync(path.join(PUB, 'owner-room-a.html')), Buffer.from('\n</body></html>')]));
const PHONES = [['402x742', 402, 742], ['390x844', 390, 844], ['430x932', 430, 932]], VIEWS = ['A', 'B', 'C', 'D', 'E'];
(async () => {
  const server = http.createServer((req, res) => { const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html', f = path.join(PUB, rel);
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const URL0 = `http://127.0.0.1:${server.address().port}/index.html`;
  const b = await chromium.launch(); const out = { boxes: {}, page: {}, roomOnly: {}, errors: [] };
  for (const [key, W, H] of PHONES) {
    const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    p.on('pageerror', e => out.errors.push(String(e))); p.on('console', m => { if (m.type() === 'error') out.errors.push(m.text()); });
    await p.goto(URL0); await p.waitForFunction(() => window.roomA); await p.waitForTimeout(300);
    await p.evaluate(k => window.roomA.set({ view: 'A', phone: k, pct: 100, press: false, show: 'all', sky: 'still' }), key); await p.waitForTimeout(700);
    await p.screenshot({ path: path.join(CAP, `first-${key}.png`) });
    const broken = [];
    for (const V of VIEWS) {
      await p.evaluate(([v, k]) => window.roomA.set({ view: v, phone: k, pct: 100, press: false, show: 'all', sky: 'still' }), [V, key]); await p.waitForTimeout(600);
      broken.push(...await p.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src'))));
      await (await p.$('#phone-wrap')).screenshot({ path: path.join(CAP, `phone-${V}-${key}-100.png`) });
      if (key === '402x742') {
        await p.evaluate(([v, k]) => window.roomA.set({ view: v, phone: k, pct: 200, press: false, show: 'all', sky: 'still' }), [V, key]); await p.waitForTimeout(250);
        await (await p.$('#phone-wrap')).screenshot({ path: path.join(CAP, `phone-${V}-${key}-200.png`) });
        await p.evaluate(([v, k]) => window.roomA.set({ view: v, phone: k, pct: 100, press: false, show: 'room', sky: 'still' }), [V, key]); await p.waitForTimeout(400);
        out.roomOnly[V] = await p.evaluate(() => ({ sky: document.querySelectorAll('#stage .sky').length, overlays: document.querySelectorAll('#stage .ov').length, people: document.querySelectorAll('#stage img[data-id]').length, images: document.querySelectorAll('#stage img').length, screens: document.querySelectorAll('#stage .live-screen').length }));
        await (await p.$('#phone-wrap')).screenshot({ path: path.join(CAP, `phone-${V}-${key}-room.png`) });
        // every box against the layout, in this view, on every phone and text size, measured on this viewport's page
        for (const [k2] of PHONES) for (const pct of [100, 200]) {
          await p.evaluate(([v, k, c]) => window.roomA.set({ view: v, phone: k, pct: c, press: true, show: 'all', sky: 'still' }), [V, k2, pct]); await p.waitForTimeout(200);
          out.boxes[`${V} ${k2}@${pct}`] = await p.evaluate(([v, k, c]) => {
            const st = document.getElementById('stage'), r0 = st.getBoundingClientRect(), s = st.offsetWidth / r0.width, Dp = window.roomA.data.views[v].phones[k], L = Dp.byPct[c];
            const rel = e => { const r = e.getBoundingClientRect(); return [(r.left - r0.left) * s, (r.top - r0.top) * s, (r.right - r0.left) * s, (r.bottom - r0.top) * s]; };
            const want = [...L.tags.map(t => ['tag ' + t.id, t]), ['ooc', L.ooc], ['you', L.chrome.you], ['board', L.chrome.boardChip], ['control', L.chrome.control]];
            const got = [...document.querySelectorAll('#stage .ov.tag.name')].map(e => ['tag ' + e.dataset.id, rel(e)]).concat([['ooc', rel(document.querySelector('#stage .ov.tag.ooc'))], ['you', rel(document.querySelector('#stage .ov.you'))], ['board', rel(document.querySelector('#stage .ov.board'))], ['control', rel(document.querySelector('#stage .ov.control'))]]);
            let worst = 0; const bad = [];
            for (const [n, w] of want) { const g = got.find(x => x[0] === n); if (!g) { bad.push(n + ' missing'); continue; } const d = Math.max(Math.abs(g[1][0] - w.x0), Math.abs(g[1][1] - w.y0), Math.abs(g[1][2] - w.x1), Math.abs(g[1][3] - w.y1)); worst = Math.max(worst, d); if (d > 1) bad.push(n + ' off by ' + d.toFixed(2)); }
            const overflow = [...document.querySelectorAll('#stage .ov')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.className + ' ' + (e.dataset.id ?? ''));
            const stack = [...st.children].map(e => e.classList.contains('plate') ? 'plate' : e.classList.contains('sky') ? 'sky' : e.classList.contains('live-screen') ? 'screen' : e.dataset.front ? 'front:' + e.dataset.front : e.dataset.id && e.tagName === 'IMG' ? 'person:' + e.dataset.id : 'overlay').filter(x => x !== 'overlay');
            const VW = window.roomA.data.views[v], wantStack = ['plate', ...(VW.window ? ['sky'] : []), ...Dp.screens.map(() => 'screen'), ...Dp.people.flatMap(q => ['person:' + q.id, ...q.fronts.map(() => 'front:' + q.id)])];
            // the window's sky: Room A's window layer alone (defs, keyframes, glass), held at 0 s; none where the window is out of sight
            const sk = st.querySelector('.sky'), svg = sk && sk.querySelector('svg.amb'), an = svg ? svg.getAnimations({ subtree: true }) : [];
            const sky = sk ? { children: svg.children.length, glass: svg.querySelectorAll('g[clip-path*="-glass"]').length, animations: an.length, paused: an.every(x => x.playState === 'paused'), atZero: an.every(x => Math.abs(+x.currentTime) < 1), clip: (sk.style.clipPath || '').startsWith('polygon(') } : null;
            return { sky, skyOk: VW.window ? Boolean(sky && sky.children === 3 && sky.glass === 1 && sky.animations > 0 && sky.paused && sky.atZero && sky.clip) : !sk, worstPx: +worst.toFixed(2), bad, overflow, people: Dp.people.map(q => q.id), issues: L.issues, presses: document.querySelectorAll('#stage .ov.press').length, stackOk: JSON.stringify(stack) === JSON.stringify(wantStack), stack,
              caption: document.getElementById('view-caption').textContent, pressedView: [...document.querySelectorAll('#views button')].filter(x => x.getAttribute('aria-pressed') === 'true').map(x => x.dataset.v) };
          }, [V, k2, pct]);
        }
      }
    }
    out.page[W] = await p.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, images: document.images.length }));
    out.page[W].broken = [...new Set(broken)];
    out.page[W].viewButtons = await p.evaluate(() => [...document.querySelectorAll('#views button')].map(x => Math.round(x.getBoundingClientRect().height)));
    await p.close();
  }
  fs.writeFileSync(path.join(CAP, 'checks.json'), JSON.stringify(out, null, 1)); console.log(JSON.stringify({ worst: Math.max(...Object.values(out.boxes).map(v => v.worstPx)), bad: Object.entries(out.boxes).filter(([, v]) => v.bad.length || v.overflow.length || !v.stackOk || !v.skyOk).map(([k]) => k), page: out.page, roomOnly: out.roomOnly, errors: out.errors })); await b.close(); server.close();
})();
