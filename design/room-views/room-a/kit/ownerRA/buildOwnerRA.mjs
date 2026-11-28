// Room A's owner page: all five views (the Lead, 27 November, 23:51 and 28 November, 00:36), on Room B's owner page pattern as view
// A's owner page has it (../owner/buildOwnerA.mjs: the title and one line, the room straight away with its controls under it, three
// short notes, the team's details in a closed fold). One page (the owner's rule: one page per review). A test page.
// Each view's room is the stage its own reviewed page draws, its data taken from that page as built:
// - view A from view A's owner page (../owner/pub/owner-a.html, the version the owner answered): RA-A-4 with its cabinet's right frame
//   drawn in code, Mira, Echo and Lyra as stand-ins; no screen and no layer part in front of anyone in view A;
// - views B to E from their check pages (../checkV/<V>/pub/check-<v>.html, the versions the Lead accepted):
//   the plate, the live screens drawn by code in their fitted regions, the stand-ins far to near, each followed by the parts of the
//   lifted layers nearer than them, and the room's controls, tags and press areas where the plan's layout puts them.
// Each page's data is read from its own embedded JSON and its pictures copied byte for byte (checked by sha256) into pub/img/<v>/.
// The round window (the Lead, 28 November, 00:43), in the views where it is in sight (B and D): the room scene's own voyage, drawn
// by its ambient module (design/phone-ui/components/room-scene/ambient.mjs and ambient.css, with the two modules it imports, copied
// read-only into pub/vendor/ at their repository paths and checked by sha256): Room A's window layer alone (its defs, keyframes and
// glass; Room A's monitors, consoles, keys and lights left out), its glass circle mapped onto the painted opening's fitted ellipse,
// grown just enough to cover the whole opening, and clipped to the opening's traced outline (view D's window-D.json from sheet RA-D,
// view B's window-B.json from windowB.py, both fitted the same way). It runs on the ship's one clock; under Reduce motion, with Still
// chosen, and in the captures it stands at 0 s.
// Writes pub/owner-room-a.html (the page, its data and its script inline) and reads shots.json for the captures once
// captureOwnerRA.cjs and labelOwnerRA.py have made them. Generates nothing. Usage: node buildOwnerRA.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, statSync } from 'fs';
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
const DIR = new URL('./', import.meta.url).pathname, PUB = DIR + 'pub/', RA = DIR + '../';
const J = f => JSON.parse(readFileSync(f, 'utf8')), sha = f => createHash('sha256').update(readFileSync(f)).digest('hex'), shaB = b => createHash('sha256').update(b).digest('hex');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = n => Number(n).toLocaleString('en-GB');
const embedded = (f, id) => { const h = readFileSync(f, 'utf8'), m = h.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`)); if (!m) throw new Error(`no ${id} in ${f}`); return { data: JSON.parse(m[1]), html: h }; };
const ariaOf = h => h.match(/<div class="stage" id="stage" role="img" aria-label="([^"]*)"/)[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
// each view's own page, as published and reviewed (the page's sha256 as built)
const PAGES = { A: { page: RA + 'owner/pub/owner-a.html', id: 'room-a-data', pub: RA + 'owner/pub/', reviewed: "view A's owner page, the version the owner answered (1795100576-d45f)", pageSha: null },
  B: { page: RA + 'checkV/B/pub/check-b.html', id: 'room-data', pub: RA + 'checkV/B/pub/', reviewed: "view B's check page, accepted by the Lead (1795819897-b736)" },
  C: { page: RA + 'checkV/C/pub/check-c.html', id: 'room-data', pub: RA + 'checkV/C/pub/', reviewed: "view C's check page, accepted by the Lead (1795822912-6084)" },
  D: { page: RA + 'checkV/D/pub/check-d.html', id: 'room-data', pub: RA + 'checkV/D/pub/', reviewed: "view D's check page, accepted by the Lead (1795826435-303c)" },
  E: { page: RA + 'checkV/E/pub/check-e.html', id: 'room-data', pub: RA + 'checkV/E/pub/', reviewed: "view E's check page, accepted by the Lead (1795823204-ad13)" } };
const PAGE_SHA = { A: '08d44fa4599d18dd', B: '90f6eae41829cad6', C: '55a2ca19af4971cd', D: '80f6d86940c0a1a8', E: 'e65426368519029b' };   // each page's sha256, first 16 (checked against its read-back)
const SCENE = { A: RA + 'data/scene.json', B: RA + 'checkV/B/scene-B.json', C: RA + 'checkV/C/scene-C.json', D: RA + 'checkV/D/scene-D.json', E: RA + 'checkV/E/scene-E.json' };
const OCC = { A: RA + 'data/occlusion.json', B: RA + 'checkV/B/occlusion-B.json', C: RA + 'checkV/C/occlusion-C.json', D: RA + 'checkV/D/occlusion-D.json', E: RA + 'checkV/E/occlusion-E.json' };
const REPORT = V => J(RA + `camera-report-${V}.json`);
const PHONES = [['402x742', 'your phone in the app'], ['390x844', ''], ['430x932', '']];
// the room scene's ambient module and what it imports, read-only from the repository (the copies Room B's owner page used)
const VENDOR = [['design/phone-ui/components/room-scene/ambient.mjs', 'eeeb8e886dc2088c779f8dbfcf9833b39248b6d34c1d0815789585aa32e348a7'], ['design/phone-ui/components/room-scene/ambient.css', 'dc806a04b5ac2cbed19faa8160ac862033b5ab761831d86484ca9249fb7698bb'],
  ['apps/game/hosted/board-v2-drawing/lighting.mjs', '35134c4966b508f2a7b09931844f0f09eb07c4da8900c7fc9f35571ee5231e83'], ['apps/game/hosted/board-v2-drawing/scene-kit.mjs', '055640dad54bbc1b8b0be409e9a694acf8c02ead44feaaa2c0b07a10a1322e46']];
const REPO_DIR = '/home/user/GameN/';   // the repository's working tree, read only
for (const [f, h] of VENDOR) { const src = REPO_DIR + f; if (sha(src) !== h) throw new Error(`${f} is not the room scene's copy Room B's page used`); mkdirSync(PUB + 'vendor/' + f.split('/').slice(0, -1).join('/'), { recursive: true }); copyFileSync(src, PUB + 'vendor/' + f); }
// the round window's opening in each view where it is in sight: the traced outline (every second point) and the fitted ellipse, with
// the growth that makes the ellipse cover every point of the outline (1% over)
const WIN = { B: { file: DIR + 'window-B.json' }, D: { file: RA + 'sheetD/window-D.json', start: { name: 'RA-D-1', file: RA + 'sheetD/_rec1/img/RA-D-1.png' } } };
const windowOf = V => { const w = WIN[V]; if (!w) return null; const W = J(w.file), e = W.ellipse, th = e.rotationDeg * Math.PI / 180, [cx, cy] = e.centre, [a, b] = e.semiAxes;
  const rho = Math.max(...W.opening.outline.map(([x, y]) => { const u = (x - cx) * Math.cos(th) + (y - cy) * Math.sin(th), v = -(x - cx) * Math.sin(th) + (y - cy) * Math.cos(th); return Math.hypot(u / a, v / b); }));
  return { outline: W.opening.outline.filter((_, i) => i % 2 === 0), ellipse: { centre: e.centre, semiAxes: e.semiAxes, rotationDeg: e.rotationDeg }, grow: +(rho * 1.01).toFixed(4), file: w.file.split('/').pop(), sha256: sha(w.file), region: W.region, picture: W.picture.name }; };
const views = {}, facts = {};
mkdirSync(PUB + 'img', { recursive: true });
for (const [V, P] of Object.entries(PAGES)) {
  const v = V.toLowerCase(), { data: d, html } = embedded(P.page, P.id), SC = J(SCENE[V]), OC = J(OCC[V]), REP = REPORT(V);
  if (shaB(readFileSync(P.page)).slice(0, 16) !== PAGE_SHA[V]) throw new Error(`${P.page} is not the page as reviewed`);
  mkdirSync(PUB + `img/${v}`, { recursive: true });
  const moved = {}, move = src => { if (!moved[src]) { const to = `img/${v}/${src.replace(/^img\//, '')}`; copyFileSync(P.pub + src, PUB + to); if (sha(PUB + to) !== sha(P.pub + src)) throw new Error('copy differs'); moved[src] = to; } return moved[src]; };
  const phones = {};
  for (const [key] of PHONES) {
    const ph = d.phones[key];
    phones[key] = { ...ph, screens: ph.screens ?? [], people: ph.people.map(p => ({ ...p, img: move(p.img), fronts: (p.fronts ?? []).map(f => ({ ...f, img: move(f.img) })) })) };
  }
  const plate = move(d.plate), viewer = d.viewer ?? REP.viewer ?? 'Vega', fronts = OC.frontParts ?? [];
  const plateName = SC.plate.name, nScr = (SC.screens?.painting ?? []).length, out = REP.outOfView.name;
  const inView = phones['402x742'].people.map(p => p.name);
  const passes = PHONES.flatMap(([k]) => [100, 200].map(c => phones[k].byPct[c].issues.length === 0)).filter(Boolean).length;
  const win = windowOf(V);
  views[V] = { viewer, plate, phones, aria: ariaOf(html), screens: nScr, window: win,
    caption: `${viewer}’s view: the room is an AI-generated picture, ${plateName}${V === 'A' ? ', with its cabinet’s right frame drawn in code' : ', a code composite'}. ${nScr ? `The ${nScr === 1 ? 'screen is' : 'screens are'} drawn live by code.` : 'No screen is in this view.'} ${win ? ' The round window shows the ship’s voyage, drawn by code on the ship’s one clock, as in the game.' : ''} The people are stand-ins in the plan’s poses.` };
  facts[V] = { viewer, plateName, plateSha: SC.plate.sha256, platePixels: SC.plate.pixelsSha256, accepted: SC.plate.accepted, reviewed: P.reviewed, inView, out, nScr, passes,
    fronts: fronts.map(f => `${f.layer.split(' ').slice(1).join(' ')} over ${f.person} (${num(f.px)} px)`), camera: REP.camera, window: win };
}
const ORDER_V = ['A', 'B', 'C', 'D', 'E'];
{ const W = J(WIN.D.file), [x0, y0, x1, y1] = W.region.box, pyc = String.raw`
import json, sys, numpy as np
from PIL import Image
a, b = (np.array(Image.open(f).convert('RGB')) for f in sys.argv[1:3]); x0, y0, x1, y1 = map(int, sys.argv[3:7])
print(json.dumps({'equal': bool((a[y0 - 3:y1 + 3, x0 - 3:x1 + 3] == b[y0 - 3:y1 + 3, x0 - 3:x1 + 3]).all())}))`;
  const r = JSON.parse(execFileSync('python3', ['-I', '-c', pyc, WIN.D.start.file, PUB + views.D.plate, x0, y0, x1, y1].map(String)).toString());
  if (!r.equal) throw new Error("view D's plate does not hold RA-D-1's window, where window-D.json was fitted"); facts.D.windowSame = true; }
const DATA = { views, viewOrder: ORDER_V, order: PHONES.map(([k, w]) => ({ key: k, words: w })) };
const SHOTS = existsSync(DIR + 'shots.json') ? J(DIR + 'shots.json') : null;
const COST = { images: 20, usd: 1.1563, cap: 5, from: "the image session's records (RA-D-4, the last of Room A's pictures: its running total for Room A)" };
const viewRows = ORDER_V.map(V => { const f = facts[V];
  return `<tr><td>${V}</td><td>${esc(f.viewer)}</td><td>${esc(f.plateName)} <span class="dim">(${esc(f.accepted)})</span></td><td>${esc(f.inView.join(', '))}</td><td>${esc(f.out)}</td><td class="n">${f.nScr}</td><td>${f.fronts.length ? esc(f.fronts.join('; ')) : '<span class="dim">none</span>'}</td><td><span class="pill ${f.passes === 6 ? 'ok' : 'warn'}">${f.passes} of 6</span></td></tr>`; }).join('');
const srcRows = ORDER_V.map(V => `<tr><td>${V}</td><td>${esc(facts[V].reviewed)}</td><td class="h"><code>${facts[V].plateSha}</code></td><td class="h"><code>${facts[V].platePixels}</code></td></tr>`).join('');
const shotFigs = SHOTS ? ORDER_V.map(V => `<h3>${esc(facts[V].viewer)}’s view (${V})</h3><div class="shots">${SHOTS.shots.filter(s => s.view === V).map(s => `<figure><img src="${esc(s.file)}" alt="${esc(s.alt)}" width="${s.w}" height="${s.h}" loading="lazy"><figcaption><b>Capture, AI-generated room.</b> ${esc(s.caption)}</figcaption></figure>`).join('\n')}</div>`).join('\n') : '<p class="dim">The captures are added when the page is captured.</p>';
const files = [];
for (const V of ORDER_V) { const v = V.toLowerCase(), seen = new Set([views[V].plate, ...Object.values(views[V].phones).flatMap(p => p.people.flatMap(q => [q.img, ...q.fronts.map(f => f.img)]))]);
  for (const f of seen) files.push([f, f === views[V].plate ? `View ${V}’s room: ${facts[V].plateName}, AI-generated${V === 'A' ? ', its cabinet’s right frame drawn in code' : ', a code composite'}` : /front-/.test(f) ? `View ${V}: the part of a lifted layer drawn over a person (AI-generated pixels, cut by code)` : `View ${V}: a stand-in, the approved crew drawing in their place’s gesture (drawn by code)`]); }
if (SHOTS) for (const s of SHOTS.shots) files.push([s.file, `Capture: ${s.caption}`]);
const fileRows = files.map(([f, what]) => `<tr><td><code>${esc(f)}</code><div class="dim">${esc(what)}</div></td><td class="n">${num(statSync(PUB + f).size)}</td><td class="h"><code>${sha(PUB + f)}</code></td></tr>`).join('');
const allPass = ORDER_V.every(V => facts[V].passes === 6);
// the known cases, as each view's page lists them (view A's: the room scene's overlay rule, in the room scene's next version (0.6.0), fixes it)
const known = ORDER_V.flatMap(V => PHONES.flatMap(([k]) => [100, 200].flatMap(c => views[V].phones[k].byPct[c].issues.map(t => ({ V, k, c, t })))));
const knownWords = known.map(x => `${facts[x.V].viewer}’s view at ${x.k.replace('x', ' × ')} with ${x.c}% text: ${x.t}`).join('; ');
const A = readFileSync(RA + 'owner/buildOwnerA.mjs', 'utf8'), CSS = A.slice(A.indexOf('const CSS = `') + 13, A.indexOf('`;', A.indexOf('const CSS = `')))
  .replace("/* View A's owner page", "/* Room A's owner page, all five views, on view A's owner page") + `
.live-screen { position: absolute; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(150, 230, 255, .14) 0 1px, transparent 1px 3px), linear-gradient(160deg, #134A66 0%, #0C2C40 55%, #1A5A78 100%); }
.live-screen::after { content: ""; position: absolute; inset: 18% 14% auto 14%; height: 12%; background: rgba(170, 235, 255, .55); box-shadow: 0 2.2em 0 rgba(170, 235, 255, .35), 0 4.4em 0 rgba(170, 235, 255, .25); }
.team-body h3 { margin-top: 6px; }
.sky { position: absolute; left: 0; top: 0; pointer-events: none; overflow: hidden; }
`;
const APP = `
// The room, live, in the view chosen: the plate, the live screens, then the stand-ins far to near, each followed by the parts of the
// lifted layers that are nearer than them; and the room's own controls, tags and press areas at the boxes the plan's layout gives.
// Each view's data is its own reviewed page's. Nothing moves.
import { ambientLayer, settleAmbient } from './vendor/design/phone-ui/components/room-scene/ambient.mjs';
const D = JSON.parse(document.getElementById('room-data').textContent);
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = { view: D.viewOrder[0], phone: D.order[0].key, pct: 100, press: false, show: 'all', sky: still ? 'still' : 'moving' };   // show: 'all' (room and people) or 'room' (the painting alone)
const wrap = document.getElementById('phone-wrap'), phone = document.getElementById('phone'), stage = document.getElementById('stage');
const px = n => (+n).toFixed(2) + 'px';
const add = (cls, b, html = '') => { const e = document.createElement('div'); e.className = 'ov ' + cls; Object.assign(e.style, { left: px(b.x0), top: px(b.y0), width: px(b.x1 - b.x0), height: px(b.y1 - b.y0) }); e.innerHTML = html; stage.appendChild(e); return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const img = (src, r, cls, id) => { const im = new Image(); im.src = src; im.alt = ''; im.decoding = 'async'; if (cls) im.className = cls; if (id) im.dataset.id = id; Object.assign(im.style, { left: px(r.left), top: px(r.top), width: px(r.width), height: px(r.height) }); stage.appendChild(im); return im; };
function fit() { const P = D.views[state.view].phones[state.phone], avail = Math.max(200, wrap.parentElement.clientWidth), k = Math.min(1, avail / P.W);
  phone.style.transform = 'scale(' + k + ')'; wrap.style.width = px(P.W * k); wrap.style.height = px(P.H * k); }
function build() {
  const VW = D.views[state.view], P = VW.phones[state.phone], L = P.byPct[state.pct], k = state.pct / 100;
  phone.style.width = px(P.W); phone.style.height = px(P.H);
  document.getElementById('bar-top').style.height = px(P.TOP); document.getElementById('bar-bot').style.height = px(P.BOT);
  stage.style.width = px(P.W); stage.style.height = px(P.SH); stage.innerHTML = '';
  img(VW.plate, P.plate, 'plate');
  const all = state.show === 'all';
  // the round window: Room A's window layer of the room scene's voyage, its glass circle (512, 210, r 89.8) mapped onto the painted
  // opening's ellipse (grown to cover the opening) and clipped to the opening's outline
  if (all && VW.window) {
    const wv = VW.window, Q = P.plate, sx = Q.width / 1024, sy = Q.height / 1536, st = ([x, y]) => [Q.left + x * sx, Q.top + y * sy];
    const sky = document.createElement('div'); sky.className = 'sky'; Object.assign(sky.style, { width: px(P.W), height: px(P.SH) });
    sky.style.clipPath = 'polygon(' + wv.outline.map(q => { const s = st(q); return px(s[0]) + ' ' + px(s[1]); }).join(', ') + ')';
    const svg = ambientLayer('room-a', { tx: 0, ty: 0, k: 1 }), keep = [svg.querySelector('defs'), svg.querySelector('style'), svg.querySelector('g[clip-path*="-glass0"]')];
    for (const c of [...svg.children]) if (!keep.includes(c)) c.remove();
    const [cx, cy] = st(wv.ellipse.centre), a = wv.ellipse.semiAxes[0] * sx * wv.grow / 89.8, b = wv.ellipse.semiAxes[1] * sy * wv.grow / 89.8, th = wv.ellipse.rotationDeg * Math.PI / 180;
    // the stretch along the ellipse's axes alone (R diag(a, b) R^T), so the sky stays upright: its stars drift level and its world sits
    // where Room A's window draws it, whatever the fitted ellipse's tilt
    const c = Math.cos(th), s = Math.sin(th), m = [a * c * c + b * s * s, (a - b) * s * c, (a - b) * s * c, a * s * s + b * c * c];
    Object.assign(svg.style, { left: '0px', top: '0px', zIndex: 'auto', transformOrigin: '0 0', transform: 'matrix(' + [...m, cx - (m[0] * 512 + m[2] * 210), cy - (m[1] * 512 + m[3] * 210)].join(',') + ')' });
    sky.appendChild(svg); stage.appendChild(sky);
    settleAmbient(sky, state.sky === 'moving' ? { live: true } : { at: 0 });
  }
  stage.setAttribute('aria-label', all ? VW.aria : 'Room A from ' + VW.viewer + '\\u2019s place: the painted room only, with nothing drawn over it');
  if (all) {
  for (const s of P.screens) { const xs = s.corners.map(c => c[0]), ys = s.corners.map(c => c[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), e = document.createElement('div');
    e.className = 'live-screen'; e.dataset.screen = s.name; Object.assign(e.style, { left: px(x0), top: px(y0), width: px(Math.max(...xs) - x0), height: px(Math.max(...ys) - y0), fontSize: px((Math.max(...ys) - y0) / 9) });
    e.style.clipPath = 'polygon(' + s.corners.map(c => px(c[0] - x0) + ' ' + px(c[1] - y0)).join(', ') + ')'; stage.appendChild(e); }
  for (const p of P.people) { img(p.img, { left: p.rect.left, top: p.rect.top, width: p.rect.size, height: p.rect.size }, 'person', p.id);
    for (const f of p.fronts) { const im = img(f.img, P.plate, 'front'); im.dataset.front = p.id; im.dataset.layer = f.layer; } }
  const C = L.chrome;
  add('label', C.label, esc(C.labelText)).style.fontSize = px(15 * k);
  add('you', C.you, esc(C.youText)).style.cssText += ';font-size:' + px(11 * k) + ';border-radius:' + px(10 * k);
  add('board', C.boardChip, esc(C.boardText)).style.fontSize = px(13 * k);
  add('control', C.control, esc(C.controlText)).style.fontSize = px(15 * k);
  const pill = (b, n, text, cls) => { const e = add('tag ' + cls, b, '<span class="n">' + n + '</span><span class="t">' + esc(text) + '</span>');
    e.style.cssText += ';font-size:' + px(13 * k) + ';gap:' + px(5 * k) + ';padding:0 ' + px(10 * k) + ' 0 ' + px(3 * k);
    const d = e.querySelector('.n'); Object.assign(d.style, { width: px(20 * k), height: px(20 * k), fontSize: px(12 * k) }); return e; };
  pill(L.ooc, L.ooc.num, L.ooc.name + ' · out of view', 'ooc');
  for (const t of L.tags) { const p = P.people.find(q => q.id === t.id); pill(t, p.num, p.name, 'name').dataset.id = t.id; }
  if (state.press) for (const q of [...L.squares, L.ooc.press]) add('press', q);
  }
  document.getElementById('view-caption').textContent = VW.caption;
  document.getElementById('readout').textContent = !all ? 'Room only: the painting as this phone shows it, with the ' + (VW.window ? 'window’s sky, ' : '') + (P.screens.length ? 'screens, ' : '') + 'people, tags, chips and controls hidden.' : L.issues.length ? 'Known here: ' + L.issues.join('; ') + '.' : 'Every check passes here: everyone whole, every face and press area clear of the controls, every tag whole and apart.';
  for (const [id, v] of [['views', state.view], ['show', state.show], ['phones', state.phone], ['texts', String(state.pct)], ['press', String(state.press)], ['sky', state.sky]]) for (const b of document.querySelectorAll('#' + id + ' button')) b.setAttribute('aria-pressed', String(b.dataset.v === v));
  fit();
}
function seg(id, items, on) { const el = document.getElementById(id); for (const [v, t] of items) { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = t; b.onclick = () => { on(v); build(); }; el.appendChild(b); } }
seg('views', D.viewOrder.map(v => [v, D.views[v].viewer + '\\u2019s view']), v => { state.view = v; });
seg('show', [['all', 'Room and people'], ['room', 'Room only']], v => { state.show = v; });
seg('phones', D.order.map(o => [o.key, o.key.replace('x', ' × ') + (o.words ? ' · ' + o.words : '')]), v => { state.phone = v; });
seg('texts', [['100', '100%'], ['200', '200%']], v => { state.pct = +v; });
seg('press', [['false', 'Hidden'], ['true', 'Shown']], v => { state.press = v === 'true'; });
seg('sky', [['moving', 'Moving'], ['still', 'Still']], v => { state.sky = v; });
addEventListener('resize', fit);
window.roomA = { set(p) { Object.assign(state, p); build(); }, state: () => ({ ...state }), data: D };
build();
`;
const fr = V => facts[V].fronts.length;
// the parts drawn over a person, in plain words for the owner, checked against each view's occlusion data so they cannot drift from it
const FRONT_WORDS = { B: 'the crates in front of Atlas, and the hatch’s rim at Lyra’s feet', D: 'the hatch’s rim at Lyra’s feet', E: 'the crates’ corner in front of Atlas’s hip' };
const FRONT_DATA = { A: [], B: ['crates over Atlas', 'floor hatch over Lyra'], C: [], D: ['floor hatch over Lyra'], E: ['crates over Atlas'] };
for (const V of ORDER_V) if (JSON.stringify(facts[V].fronts.map(s => s.replace(/ \(.*\)$/, ''))) !== JSON.stringify(FRONT_DATA[V])) throw new Error(`view ${V}'s front parts are not the ones the owner's words describe: ${facts[V].fronts.join('; ')}`);
const html = `<title>Room A, five views</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="vendor/design/phone-ui/components/room-scene/ambient.css">
<style>${CSS}</style>
<div class="wrap">
  <header class="top">
    <span class="status">Approved by the owner · 28 November</span>
    <h1>Room A, from each place</h1>
    <p class="lede">The five views of Room A: each room is an AI-generated picture; the people, their name tags, the live screens and the room’s controls are drawn by code.</p>
  </header>

  <section id="live" class="live" aria-label="Room A, the view chosen">
    <div class="phone-wrap" id="phone-wrap"><div class="phone" id="phone">
      <div class="bar" id="bar-top">Top bar</div>
      <div class="stage" id="stage" role="img" aria-label="${esc(views.A.aria)}"></div>
      <div class="bar" id="bar-bot">Bottom bar</div>
    </div></div>
    <p class="caption" id="view-caption">${esc(views.A.caption)}</p>
    <div class="controls">
      <div class="group"><span>View</span><div class="seg" id="views"></div></div>
      <div class="group"><span>Show</span><div class="seg" id="show"></div></div>
      <div class="group"><span>Phone size</span><div class="seg" id="phones"></div></div>
      <div class="group"><span>Text size</span><div class="seg" id="texts"></div></div>
      <div class="group"><span>Press areas</span><div class="seg" id="press"></div></div>
      <div class="group"><span>The window’s sky, in Mira’s and Atlas’s views</span><div class="seg" id="sky"></div></div>
      <div class="readout" id="readout" aria-live="polite">Loading the room…</div>
    </div>
  </section>

  <section id="notes" class="owner-notes" aria-label="Notes">
    <p><b>The question for you.</b> If the five views look right, Room A’s pictures are done: say so, and Room A is saved together with Room B, as you asked. If something should change, say which view and what. Room A used ${COST.images} pictures, about $${COST.usd.toFixed(2)} of your $${COST.cap} cap.</p>
    <p><b>What is painted, and what is code.</b> Each view’s room is one painted picture, made by the image tool and recorded as AI-generated, with its furniture finished in code where the painting stopped short. The people, their name tags, the screens’ pictures, the sky in the round window and the room’s controls are drawn by code. Where a painted piece is nearer than a person, it is drawn over them: ${ORDER_V.filter(fr).map(V => `${FRONT_WORDS[V]} in ${esc(facts[V].viewer)}’s view`).join('; ')}.</p>
    <p><b>Still to come.</b> These are stand-ins in the plan’s poses. The people moving and lit by the room’s lamps, Lyra’s crouch with the wrench, Vega’s chair and visits to the food capsule come with the Motion builder’s work; the screens here are a code stand-in for the game’s own. ${known.length ? `One known case, as on view A’s page: in ${esc(facts[known[0].V].viewer)}’s view on your phone with 200% text, Lyra’s press area runs under the Board chip; the room scene’s rule for its overlays fixes it. ` : ''}To see a painting alone, choose Room only under Show.</p>
  </section>

  <details class="team" id="team"><summary>Details for the team</summary><div class="team-body">
  <section id="about">
    <span class="eyebrow">Mothership · Room A · five views · test page · version 1 · 28 November 2026</span>
    <p><b>The views:</b> each from its place, in the PV6 camera of its own camera report: straight lines, the phone’s 70° slice at 5° down. Each view’s stage is the one its own reviewed page draws, its data read from that page and its pictures copied byte for byte: the plate, the live screens in their fitted regions, the stand-ins at the camera report’s spots, scaled and placed as the plan’s stage places them, far to near, each followed by the parts of the lifted layers nearer than them; and the tags, the out-of-view chip and the room’s controls where the plan’s layout puts them. ${allPass ? 'Every view passes the layout’s six phone and text-size checks.' : `Every view passes the layout’s six phone and text-size checks but ${known.length === 1 ? 'one known case' : known.length + ' known cases'}: ${esc(knownWords)} (the room scene’s rule for its overlays fixes it, the room scene’s next version (0.6.0)).`}</p>
    <div class="scroll wide"><table><thead><tr><th>View</th><th>From</th><th>Room</th><th>In view</th><th>Out of view</th><th>Screens</th><th>Drawn over a person</th><th>Checks</th></tr></thead><tbody>${viewRows}</tbody></table></div>
    ${SHOTS ? `<p>On the page itself, as captured: ${esc(SHOTS.summary)}.</p>` : ''}
  </section>
  <section id="sources">
    <h2>Where each view comes from</h2>
    <div class="scroll wide"><table><thead><tr><th>View</th><th>Its page</th><th>Room file sha256</th><th>Room pixels sha256</th></tr></thead><tbody>${srcRows}</tbody></table></div>
  </section>
  <section id="window">
    <h2>The round window</h2>
    <p>In the two views where it is in sight, Mira’s (B) and Atlas’s (D), the page draws the ship’s voyage in the painted opening with the room scene’s own ambient module, read-only (${VENDOR.map(([f, h]) => `<code>${esc(f.split('/').pop())}</code> ${h.slice(0, 12)}…`).join(', ')}): Room A’s window layer alone, its defs, keyframes and glass, with Room A’s board monitors, consoles, keys and lights left out. Its glass circle is stretched along the painted opening’s fitted ellipse’s axes onto that ellipse (a stretch alone, so the sky stays upright), grown just enough to cover the whole opening (${['B', 'D'].map(V => `${facts[V].viewer}’s ×${views[V].window.grow}`).join(', ')}), and clipped to the opening’s traced outline. It runs on the ship’s one clock, with Room A’s window 6 s behind the Command Room’s; under Reduce motion, with Still chosen, and in the captures it stands at 0 s.</p>
    <div class="scroll wide"><table><thead><tr><th>View</th><th>Opening</th><th>Fitted on</th><th>Opening px</th><th>Its p95 lightness</th><th>Ellipse (painting px)</th></tr></thead><tbody>${['B', 'D'].map(V => { const w = views[V].window; return `<tr><td>${V} · ${esc(facts[V].viewer)}</td><td><code>${esc(w.file)}</code> <span class="dim">${w.sha256.slice(0, 12)}…</span></td><td>${esc(w.picture)}${V === 'D' ? ' <span class="dim">(RA-D-4c holds the same pixels there)</span>' : ''}</td><td class="n">${num(w.region.px)}</td><td class="n">${w.region.p95L}</td><td class="n">${w.ellipse.centre.join(', ')} · ${w.ellipse.semiAxes.join(' × ')} · ${w.ellipse.rotationDeg}°</td></tr>`; }).join('')}</tbody></table></div>
  </section>
  <section id="captures">
    <h2>Captures</h2>
    ${shotFigs}
  </section>
  <section id="files">
    <h2>The pictures on this page</h2>
    <div class="scroll wide"><table><thead><tr><th>File</th><th>Bytes</th><th>sha256</th></tr></thead><tbody>${fileRows}</tbody></table></div>
  </section>
  <section id="spend">
    <h2>Spend</h2>
    <p>From ${esc(COST.from)}: ${COST.images} pictures, $${COST.usd} in all, against the cap of $${COST.cap} for Room A.</p>
  </section>
  <section id="limits">
    <h2>What this test cannot show</h2>
    <ul><li>Motion and light: the stand-ins hold one pose and are not lit by the room’s lamps; the live screens are a code-drawn stand-in for the game’s own. The window’s sky is the game’s own voyage, but on this page it runs on this device’s clock, not the match’s.</li><li>Poses that differ by view: each stand-in is its place’s one drawing; Lyra’s crouch, Vega’s chair and the visits to the food capsule are the Motion builder’s.</li><li>Speed on a real phone, and how the rooms look inside the game’s own screens.</li></ul>
  </section>
  </div></details>
</div>
<script type="application/json" id="room-data">${JSON.stringify(DATA).replace(/</g, '\\u003c')}</script>
<script type="module">${APP}</script>`;
writeFileSync(PUB + 'owner-room-a.html', html);
console.log('owner-room-a.html', html.length, 'chars | views', ORDER_V.map(V => `${V} ${facts[V].plateName} ${facts[V].passes}/6 screens ${facts[V].nScr} fronts ${fr(V)}`).join(' | '), '|', SHOTS ? SHOTS.shots.length + ' captures' : 'no captures yet');
