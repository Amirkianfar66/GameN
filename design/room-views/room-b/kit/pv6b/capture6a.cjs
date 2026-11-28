// Room B test page v5's checks and frames, in Chromium at a device scale of 2: the skylight's layer (the cream world's group,
// the code window's mullions, bands and light cones gone from its copy), frames at chosen moments of the ship's clock, the
// layout per phone and text size (the page's own checks and the layout test's), the layers' order, and who is in front of whom.
// Serves this folder on a local port. Writes checks.json and shots/*.jpg.
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path'); const cover = require('./cover6.cjs');
const DIR = __dirname, TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const T = JSON.parse(fs.readFileSync(path.join(DIR, 'timing.json'), 'utf8')), S = JSON.parse(fs.readFileSync(path.join(DIR, 'scene.json'), 'utf8'));
const mid = ([a, b]) => (a + b) / 2, passer = k => T.phones['390x844'].passers.find(p => p.kind === k);
(async () => {
  const server = http.createServer((req, res) => { const f = path.join(DIR, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!f.startsWith(DIR) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${server.address().port}/`;
  fs.mkdirSync(path.join(DIR, 'shots'), { recursive: true });
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1200, height: 2400 }, deviceScaleFactor: 2 });
  // errors: the page's own, and any file that fails to load, apart from the page's frames under shots/ and cover.json (the readout's
  // numbers), which this capture and rendered-cover.py write
  const errors = []; p.on('pageerror', e => errors.push(String(e))); p.on('console', m => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errors.push(m.text()); });
  p.on('response', r => { const u = r.url().replace(/^http:\/\/127\.0\.0\.1:\d+\//, ''); if (r.status() >= 400 && !u.startsWith('shots/') && u !== 'cover.json') errors.push(`${r.status()} ${u}`); });
  await p.goto(base + 'index.html'); await p.waitForFunction(() => window.roomB && document.querySelector('#world img.pic'));
  await p.evaluate(() => document.fonts.ready);
  const set = async v => { await p.evaluate(v => window.roomB.setView(v), v); await p.waitForFunction(() => [...document.querySelectorAll('#world img')].every(i => i.complete)); await p.waitForTimeout(150); };
  const stageBox = async () => p.evaluate(() => { window.scrollTo(0, 0); const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const layers = async () => p.evaluate(() => { const sky = document.querySelector('[data-opening="skylight"] svg');
    const mull = s => [...s.querySelectorAll('path')].filter(x => /^M[\d.]+ 128 V252 M[\d.]+ 128 V252$/.test(x.getAttribute('d') ?? '')).length;
    const cones = s => [...s.querySelectorAll('g[clip-path]')].filter(g => /-frame\d+\)$/.test(g.getAttribute('clip-path'))).length;
    return { skylightHome: sky.querySelectorAll('g[class$="-home"]').length, skylightMullions: mull(sky), skylightBands: sky.querySelectorAll('rect[fill="none"]').length, skylightCones: cones(sky),
      skylightAnimations: sky.getAnimations({ subtree: true }).length, openings: [...document.querySelectorAll('#world .opening')].map(o => o.dataset.opening) }; });
  const out = { layout: {}, frames: {}, errors };
  // the layout, per phone and text size (held at 0 s): the page's own checks and the layout test's; and a whole-phone frame of each
  // both tag placements: at the feet (the default) and at the pack's place (as v5 had them)
  out.tagLayout = {};
  for (const tags of ['pack', 'feet']) for (const [ix, key] of [[0, '390x844'], [1, '430x932']]) for (const pct of [100, 200]) {
    await set({ phone: ix, pct, squares: true, motion: 'reduced', at: 0, ahead: 12, depth: 'on', tags });
    const m = await p.evaluate(() => window.roomB.measure()), row = { per: m.per, issues: m.issues, edge: m.edge, tags: m.tags, squares: m.squares, tagTouch: m.tagTouch, plan: S.phones[key].byPct[pct].issues, planEdge: S.phones[key].byPct[pct].edge };
    out.tagLayout[`${key} · ${pct}% · ${tags}`] = row; if (tags === 'feet') out.layout[`${key} · ${pct}%`] = row;
    await p.locator('#phone').screenshot({ path: path.join(DIR, `shots/phone-${key.split('x')[0]}-${pct}${tags === 'pack' ? '-pack' : ''}.jpg`), type: 'jpeg', quality: 86 });
  }
  await set({ phone: 0, pct: 100, squares: true, motion: 'reduced', at: 0, ahead: 12, depth: 'on', tags: 'feet' });
  // the skylight on 390 x 844: its layer, and frames at 0 s, the comet and the belt
  await set({ phone: 0, pct: 100, squares: false, motion: 'reduced', at: 0, ahead: 12 }); Object.assign(out, await layers());
  const sb = await stageBox(), P = S.phones['390x844'], sk = P.openings.skylightVisible;
  const topClip = { x: sb.x + sk.x - 6, y: sb.y, width: sb.w - (sk.x - 6), height: sk.y + sk.h + 8 };
  const shotClip = async (file, clip) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: path.join(DIR, file), clip, type: 'jpeg', quality: 88 }); };
  const frames = { 'sky-0': 0, 'comet-sky': mid(passer('comet').skylight), 'sky-belt': mid(passer('belt').skylight) };
  for (const [name, t] of Object.entries(frames)) { await set({ phone: 0, pct: 100, squares: false, motion: 'reduced', at: +t.toFixed(2), ahead: 12 }); await shotClip(`shots/${name}.jpg`, topClip); out.frames[name] = { at: +t.toFixed(2), ahead: 12 }; }
  // the held moment on both phones
  for (const [ix, key] of [[0, '390'], [1, '430']]) { await set({ phone: ix, pct: 100, squares: false, motion: 'reduced', at: 0, ahead: 12 }); await p.locator('#phone').screenshot({ path: path.join(DIR, `shots/held-${key}.jpg`), type: 'jpeg', quality: 86 }); }
  // and live: the clock runs (the passers' animations are playing)
  await set({ phone: 0, pct: 100, squares: true, motion: 'on', at: null, ahead: 12 }); out.live = await p.evaluate(() => { const a = document.querySelector('[data-opening="skylight"] svg').getAnimations({ subtree: true }); return { running: a.filter(x => x.playState === 'running').length, of: a.length, clockSeconds: +(a[0].currentTime / 1000).toFixed(1) }; });
  // who is in front of whom: the layers' order on both phones, by depth and under the crew; each person in view on 390 x 844
  out.layers = {}; out.layersOff = {};
  for (const [ix, key] of [[0, '390x844'], [1, '430x932']]) {
    await set({ phone: ix, pct: 100, squares: false, motion: 'reduced', at: 0, ahead: 12, depth: 'on' }); let m = await p.evaluate(() => window.roomB.measure()); out.layers[key] = m.layers; out.occlusion = m.occlusion;
    await set({ phone: ix, pct: 100, squares: false, motion: 'reduced', at: 0, ahead: 12, depth: 'off' }); m = await p.evaluate(() => window.roomB.measure()); out.layersOff[key] = m.layers;
  }
  const figBox = id => p.evaluate(id => window.roomB.measure().per[id].figure, id);
  for (const [id, depths] of [['B2', ['on', 'off']], ['B3', ['on']], ['B5', ['on']]]) {
    for (const depth of depths) { await set({ phone: 0, pct: 100, squares: false, motion: 'reduced', at: 0, ahead: 12, depth }); const sb4 = await stageBox(), b = await figBox(id);
      const x0 = Math.max(0, b.x0 - 30), y0 = Math.max(0, b.y0 - 24), x1 = Math.min(P.W, b.x1 + 40), y1 = Math.min(P.SH, b.y1 + 24);
      await shotClip(`shots/occ-${id}-${depth}.jpg`, { x: sb4.x + x0, y: sb4.y + y0, width: x1 - x0, height: y1 - y0 }); } }
  // the people's own motion: each person at 0, 1.3, 2.6 and 3.9 s (the module's at(t)), by depth, on 390 x 844
  out.motion = {};
  for (const id of ['B5', 'B3', 'B2']) { await set({ phone: 0, pct: 100, squares: false, motion: 'reduced', at: 0, ahead: 12, depth: 'on' }); const b = await figBox(id), sb5 = await stageBox();
    const x0 = Math.max(0, b.x0 - 16), y0 = Math.max(0, b.y0 - 16), x1 = Math.min(P.W, b.x1 + 16), y1 = Math.min(P.SH, b.y1 + 16);
    for (const t of [0, 1300, 2600, 3900]) { const boxes = await p.evaluate(t => window.roomB.peopleAt(t), t); await p.waitForTimeout(80); await shotClip(`shots/motion-${id}-${String(t).padStart(4, '0')}.jpg`, { x: sb5.x + x0, y: sb5.y + y0, width: x1 - x0, height: y1 - y0 }); (out.motion[id] ??= {})[t] = boxes[id]; } }
  // what fills each slot: its parts, each in its own holder (body, shadow, front), and where the body's drawing sits
  await set({ phone: 0, pct: 100, squares: false, motion: 'reduced', at: 0, ahead: 12, depth: 'on' });
  out.slots = await p.evaluate(() => { const st = document.getElementById('stage').getBoundingClientRect(); return [...document.querySelectorAll('#world > .part')].map(h => { const e = h.firstElementChild; return { id: h.dataset.id, part: h.dataset.part, tag: e.tagName.toLowerCase(), layer: e.getAttribute('data-rb-layer'), person: e.getAttribute('data-rb-person'), left: parseFloat(e.style.left), top: parseFloat(e.style.top), width: parseFloat(e.style.width), height: parseFloat(e.style.height), transform: getComputedStyle(e).transform }; }); });
  // who is in front of whom, as rendered, on both phones (rendered-cover.py measures the frames)
  fs.mkdirSync(path.join(DIR, '_cover'), { recursive: true }); const coverFrames = {};
  for (const [ix, key] of [[0, '390x844'], [1, '430x932']]) coverFrames[key] = { W: S.phones[key].W, ...(await cover(p, S, ix, key, path.join(DIR, '_cover'), set)) };
  // and at three moments of the people's own motion, on 390 x 844 (the order holds for any pose: the shares stay in the limits)
  for (const t of [1300, 2600, 3900]) coverFrames[`390x844@${t}`] = { W: S.phones['390x844'].W, tag: `@${t}`, ...(await cover(p, S, 0, '390x844', path.join(DIR, '_cover'), set, { moment: t, tag: `@${t}` })) };
  fs.writeFileSync(path.join(DIR, '_cover', 'cover-frames.json'), JSON.stringify(coverFrames, null, 1));
  out.prunedOk = out.skylightMullions === 0 && out.skylightBands === 0 && out.skylightCones === 0;
  fs.writeFileSync(path.join(DIR, 'checks.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ skylightHome: out.skylightHome, prunedOk: out.prunedOk, openings: out.openings, live: out.live, frames: out.frames, layers: out.layers, layersOff: out.layersOff, slots: out.slots, errors }));
  for (const [kk, m] of Object.entries(out.layout)) console.log(kk, 'page', JSON.stringify(m.issues), 'edge', JSON.stringify(m.edge), '| layout test', JSON.stringify(m.plan), JSON.stringify(m.planEdge));
  await b.close(); server.close();
})();
