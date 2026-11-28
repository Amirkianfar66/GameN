// Renders a copy of Room B test page v5 (its index.html read back from the artifact; the other files served from this folder,
// whose hashes match the published listing) and checks what a viewer would see: the plate's rendered size against scene.json,
// the skylight's holder and the layers on the plate, the order the page draws the layers and the slots in, and the slots where
// scene.json puts them (Vega's mirrored). On both phones held at 0 s it saves two stage frames for verify-fit6a.py (the skylight
// filled flat magenta where its mask puts the voyage, and the picture alone), and two for the rebuild (the room with its layers
// and no people, and PV6-A-3 drawn as the plate). Also re-renders the held and skylight frames to compare with the page's own,
// and the who-is-in-front frames (cover6.cjs).
// Usage: node verify6a.cjs <folder with the read-back index.html> <out folder>
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path'); const cover = require('./cover6.cjs');
const DIR = __dirname, [COPY, OUT] = process.argv.slice(2).map(p => path.resolve(p));
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const S = JSON.parse(fs.readFileSync(path.join(DIR, 'scene.json'), 'utf8')), CK = JSON.parse(fs.readFileSync(path.join(DIR, 'checks.json'), 'utf8'));
(async () => {
  const server = http.createServer((req, res) => { const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const f = [path.join(COPY, rel), ...(process.env.ONLY_COPY ? [] : [path.join(DIR, rel)])].find(x => fs.existsSync(x) && !fs.statSync(x).isDirectory());   // ONLY_COPY: the read-back files alone
    if (!f) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const url = `http://127.0.0.1:${server.address().port}/index.html`;
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(), out = { copy: COPY, phones: {}, errors: [] };
  for (const [dsf, part] of [[1, 'fit'], [2, 'frames']]) {
    const p = await b.newPage({ viewport: { width: 1200, height: 2400 }, deviceScaleFactor: dsf }); p.on('pageerror', e => out.errors.push(String(e))); p.on('console', m => { if (m.type() === 'error') out.errors.push(m.text()); });
    p.on('response', r => { if (r.status() >= 400) out.errors.push(`${r.status()} ${r.url().replace(/^http:\/\/127\.0\.0\.1:\d+\//, '')}`); });
    await p.goto(url); await p.waitForFunction(() => window.roomB && document.querySelector('#world img.pic')); await p.evaluate(() => document.fonts.ready);
    const set = async v => { await p.evaluate(v => window.roomB.setView(v), v); await p.waitForFunction(() => [...document.querySelectorAll('#world img')].every(i => i.complete)); await p.waitForTimeout(200); };
    const stage = async () => p.evaluate(() => { window.scrollTo(0, 0); const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    const reload = async () => { await p.reload(); await p.waitForFunction(() => window.roomB && document.querySelector('#world img.pic')); await p.evaluate(() => document.fonts.ready); };
    for (const [ix, key] of [[0, '390x844'], [1, '430x932']]) {
      await set({ phone: ix, pct: 100, squares: false, motion: 'reduced', at: 0, ahead: 12 });
      if (part === 'fit') {
        const m = await p.evaluate(() => { const st = document.getElementById('stage').getBoundingClientRect(), rel = e => { const r = e.getBoundingClientRect(); return { left: +(r.left - st.left).toFixed(1), top: +(r.top - st.top).toFixed(1), width: +r.width.toFixed(1), height: +r.height.toFixed(1) }; };
          const pic = document.querySelector('#world img.pic');
          return { pic: rel(pic), offsetWidth: pic.offsetWidth, maxWidth: getComputedStyle(pic).maxWidth, holders: [...document.querySelectorAll('#world .opening')].map(e => ({ name: e.dataset.opening, ...rel(e) })),
            bands: [...document.querySelectorAll('#world img.band')].map(rel), layers: window.roomB.measure().layers, order: window.roomB.order,
            slots: [...document.querySelectorAll('#world > .part')].map(h => { const e = h.firstElementChild; return { id: h.dataset.id, part: h.dataset.part, layer: e.getAttribute('data-rb-layer'), person: e.getAttribute('data-rb-person'), left: parseFloat(e.style.left), top: parseFloat(e.style.top), width: parseFloat(e.style.width), transform: getComputedStyle(e).transform, maxWidth: getComputedStyle(e).maxWidth }; }) }; });
        const P = S.phones[key], want = P.plate; m.plateWanted = want;
        m.plateOk = Math.abs(m.pic.width - want.width) < 0.6 && Math.abs(m.pic.height - want.height) < 0.6 && Math.abs(m.pic.left - want.left) < 0.6 && Math.abs(m.pic.top - want.top) < 0.6;
        m.holdersOnPlate = m.holders.length === 1 && m.holders[0].name === 'skylight' && m.holders.every(h => Math.abs(h.width - m.pic.width) < 0.6 && Math.abs(h.left - m.pic.left) < 0.6 && Math.abs(h.top - m.pic.top) < 0.6);
        m.bandsOnPlate = m.bands.length > 0 && m.bands.every(h => Math.abs(h.width - m.pic.width) < 0.6 && Math.abs(h.height - m.pic.height) < 0.6 && Math.abs(h.left - m.pic.left) < 0.6 && Math.abs(h.top - m.pic.top) < 0.6);
        m.orderOk = JSON.stringify(m.layers) === JSON.stringify(m.order);
        // the slots: the placeholder shapes where scene.json puts them (a mirrored square keeps its box)
        // each slot filled by the people module: a figure (and a shadow) for each person, Juno's front, each placed by the feet's point and
        // the scale (the module's box: 300 units across, the feet 150 units from its left and 273 from its top), none mirrored
        const at = (q, e) => Math.abs(e.left - (q.feet[0] - 150 * q.u)) < 0.6 && Math.abs(e.top - (q.feet[1] - 273 * q.u)) < 0.6 && Math.abs(e.width - 300 * q.u) < 0.6 && e.transform === 'none';
        m.slotsOk = P.people.every(q => { const mine = m.slots.filter(x => x.id === q.id), body = mine.filter(x => x.part === 'body'), shadow = mine.filter(x => x.part === 'shadow');
          return body.length === 1 && body[0].layer === 'figure' && body[0].person === q.crew && at(q, body[0]) && shadow.length === 1 && shadow[0].layer === 'shadow' && at(q, shadow[0]); })
          && m.slots.filter(x => x.part === 'front').every(x => x.layer === 'front' && x.person === 'c7');
        out.phones[key] = m;
        const sb = await stage(), clip = { x: sb.x, y: sb.y, width: sb.w, height: sb.h };
        await p.addStyleTag({ content: '#world .opening > svg { visibility: hidden !important; } #world .opening { background: #FF00FF !important; } #world > .part, #world img.band, #overlay { display: none !important; }' });
        await p.screenshot({ path: path.join(OUT, `${key}-masks.png`), clip });
        await p.addStyleTag({ content: '#world .opening { display: none !important; }' });
        await p.screenshot({ path: path.join(OUT, `${key}-picture.png`), clip });
        await reload();
        // the room with every layer over it and no people, against PV6-A-3 itself drawn as the plate (verify-gate6a.py)
        await set({ phone: ix, pct: 100, squares: false, motion: 'reduced', at: 0, ahead: 12, crew: false });
        await p.addStyleTag({ content: '#world .opening, #overlay { display: none !important; }' });
        { const sb2 = await stage(), clip2 = { x: sb2.x, y: sb2.y, width: sb2.w, height: sb2.h };
          await p.screenshot({ path: path.join(OUT, `${key}-rebuild.png`), clip: clip2 });
          await set({ phone: ix, pct: 100, squares: false, motion: 'reduced', at: 0, ahead: 12, crew: false, bands: false, plate: S.placed });
          await p.screenshot({ path: path.join(OUT, `${key}-placed.png`), clip: clip2 }); }
        await reload();
      } else {
        // the page's own frames, re-rendered from this copy: the held phone, and the skylight frames on 390 x 844
        await p.locator('#phone').screenshot({ path: path.join(OUT, `held-${key.split('x')[0]}.png`) });
        if (ix === 0) { const sb = await stage(), sk = S.phones[key].openings.skylightVisible;
          const clip = { x: sb.x + sk.x - 6, y: sb.y, width: sb.w - (sk.x - 6), height: sk.y + sk.h + 8 };
          for (const [name, f] of Object.entries(CK.frames)) { await set({ phone: 0, pct: 100, squares: false, motion: 'reduced', at: f.at, ahead: f.ahead }); await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: path.join(OUT, `${name}.png`), clip }); }
          await set({ phone: ix, pct: 100, squares: false, motion: 'reduced', at: 0, ahead: 12 }); }
        // who is in front of whom, as rendered from this copy (rendered-cover.py; verify-gate6a.py compares it with the page's)
        out.cover = out.cover ?? {}; out.cover[key] = { W: S.phones[key].W, ...(await cover(p, S, ix, key, OUT, set)) };
        if (ix === 0) for (const t of [1300, 2600, 3900]) out.cover[`${key}@${t}`] = { W: S.phones[key].W, tag: `@${t}`, ...(await cover(p, S, ix, key, OUT, set, { moment: t, tag: `@${t}` })) };   // the people's own motion
      }
    }
    await p.close();
  }
  fs.writeFileSync(path.join(OUT, 'cover-frames.json'), JSON.stringify(out.cover, null, 1));
  fs.writeFileSync(path.join(OUT, 'verify.json'), JSON.stringify(out, null, 1));
  for (const [k, m] of Object.entries(out.phones)) console.log(k, 'plate', JSON.stringify(m.pic), '| wanted', JSON.stringify(m.plateWanted), '| plate ok', m.plateOk, '| skylight on plate', m.holdersOnPlate, '| bands on plate', m.bandsOnPlate, '| order ok', m.orderOk, '| slots ok', m.slotsOk, '| max-width', m.maxWidth, [...new Set(m.slots.map(c => c.maxWidth))].join(','));
  console.log('errors', JSON.stringify(out.errors));
  await b.close(); server.close();
})();
