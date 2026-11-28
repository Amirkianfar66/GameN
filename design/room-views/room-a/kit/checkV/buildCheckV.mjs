// Room A, views B and C: the people layers and the three-phone checks (the Lead, 27 November, 18:56: "the lift for the people layers,
// from RA-B-3c; view B's checks at 390, 402 x 742 and 430, with the stand-ins at their places and the screens live"; 20:40: view C's
// follow B's, the same way). One test page for the Lead, on view A's owner page (../owner/buildOwnerA.mjs, its look read from that
// file): the room live on each phone and text size, with
// - the plate: the view's accepted step-2 picture (B: RA-B-3c), AI-generated, a code composite (the sheet's copy, checked against
//   scene-<V>.json);
// - the live screens: the view's fitted screen regions (screens-<V>.json) drawn over the plate by code, as the game draws its own;
// - the people in view, as the plan's stand-ins (standinsV.cjs) at the camera report's spots, scaled and placed as the plan's stage
//   places them, far to near; after each person, each part of a lifted layer that is nearer the camera than they are, over them
//   (occludeV.py's front parts, from the sheet's lift of the plate);
// - the tags, the out-of-view chip and the room's controls where the plan's layout puts them (stageView), with its checks.
// Writes <V>/pub/check-<v>.html and copies its pictures into <V>/pub/img/; reads <V>/shots.json for the captures once
// captureCheckV.cjs and labelCheckV.py have made them. Generates nothing. Usage: node buildCheckV.mjs B|C
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
import { stageView } from '../stageA.mjs';
const V = process.argv[2], v = (V || '').toLowerCase();
if (!['B', 'C', 'E', 'D'].includes(V)) throw new Error('usage: node buildCheckV.mjs B|C|E|D');
const DIR = new URL('./', import.meta.url).pathname, OUT = DIR + `${V}/`, PUB = OUT + 'pub/', SHEET = DIR + `../sheet${V}/`;
const J = f => JSON.parse(readFileSync(f, 'utf8')), sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r2 = n => +(+n).toFixed(2), num = n => Number(n).toLocaleString('en-GB');
const SC = J(OUT + `scene-${V}.json`), GEO = J(OUT + `geo-${V}.json`), OC = J(OUT + `occlusion-${V}.json`), REPORT = J(DIR + `../camera-report-${V}.json`);
const R = REPORT.people;
const PLATE = SC.plate, PLATE_SRC = SHEET + PLATE.file.replace(/^img\//, ''), LIFT = J(SHEET + PLATE.layers.file);
if (sha(PLATE_SRC) !== PLATE.sha256) throw new Error("the plate is not the one scene's plate entry names");
const VIEWER = REPORT.viewer, PHONES = [['402x742', 'your phone in the app'], ['390x844', ''], ['430x932', '']], S = stageView(V);
const near = (a, b, d = 0.06) => Math.abs(a - b) <= d;
const anyPhone = SC.phones['390x844'], ORDER = [...anyPhone.people].sort((a, b) => b.Z - a.Z).map(p => p.id);
const placeOf = id => anyPhone.people.find(p => p.id === id).place, nameOf = id => anyPhone.people.find(p => p.id === id).name;
const FRONTS = OC.frontParts.map(f => ({ ...f, img: `img/${f.file}` }));
const phones = {};
for (const [key] of PHONES) {
  const P = SC.phones[key], byPct = {};
  for (const pct of [100, 200]) {
    const vw = S.views[`${key}@${pct}`], L = vw.layout, C = L.chrome;
    for (const fg of L.figs) {   // each slot as scene-<V>.json gives it
      const sp = P.people.find(p => p.place === fg.place);
      if (!sp || !near(sp.feet[0], fg.anchor[0]) || !near(sp.feet[1], fg.anchor[1]) || !near(sp.u, fg.u, 0.0001) || sp.box.some((b, i) => !near(b, fg.box[i]))) throw new Error(`${key}@${pct}: ${fg.name}'s slot is not scene-${V}.json's`);
    }
    if (JSON.stringify(vw.issues) !== JSON.stringify(P.byPct[pct].issues)) throw new Error(`${key}@${pct}: the checks differ from scene-${V}.json's`);
    const box = b => ({ x0: r2(b.x0), y0: r2(b.y0), x1: r2(b.x1), y1: r2(b.y1) });
    byPct[pct] = { issues: vw.issues, tags: L.tags.map(t => ({ id: t.id, ...box(t), at: t.at })), squares: L.squares.map(q => ({ id: q.id, ...box(q) })),
      ooc: { ...box(L.chip), press: box(L.chip.press), name: L.chip.name, num: L.chip.num },
      chrome: { label: box(C.label), control: box(C.control), boardChip: box(C.boardChip), you: box(C.you), labelText: C.labelText, controlText: C.controlText, boardText: C.boardText, youText: C.youText } };
  }
  const people = ORDER.map(id => { const p = P.people.find(q => q.id === id), u = p.u;
    return { id, place: p.place, name: p.name, num: p.num, img: `img/standin-${p.place}.png`, rect: { left: r2(p.feet[0] - 152 * u), top: r2(p.feet[1] - 273 * u), size: r2(300 * u) }, box: p.box, feet: p.feet,
      fronts: FRONTS.filter(f => f.person === p.name).map(f => ({ img: f.img, layer: f.layer })) }; });
  phones[key] = { W: P.W, H: P.H, TOP: P.TOP, BOT: P.BOT, SH: P.SH, plate: P.plate, people, screens: P.screens, byPct };
}
const DATA = { view: V, viewer: VIEWER, plate: PLATE.file, phones, order: PHONES.map(([k, w]) => ({ key: k, words: w })) };
// the files the page shows
mkdirSync(PUB + 'img', { recursive: true });
copyFileSync(PLATE_SRC, PUB + PLATE.file);
for (const pl of new Set(anyPhone.people.map(p => p.place))) copyFileSync(OUT + `standin-${pl}.png`, PUB + `img/standin-${pl}.png`);
for (const f of FRONTS) copyFileSync(OUT + f.file, PUB + f.img);
// a copy whose compressed bytes spell a word on the Designer team's scan list by chance is re-encoded losslessly (the sheet's scanfixA.py:
// the same pixels, checked)
execFileSync('python3', ['-I', DIR + '../sheetB/scanfixA.py', DIR + '../../roomb/pv8/_scan-words.txt', PUB + PLATE.file, ...[...new Set(anyPhone.people.map(p => p.place))].map(pl => PUB + `img/standin-${pl}.png`), ...FRONTS.map(f => PUB + f.img)], { stdio: 'inherit' });
// the data and the layers, for the Motion builder: the lift's record and its layers (the sheet's), the geometry, the scene and who covers whom
mkdirSync(PUB + 'data', { recursive: true }); mkdirSync(PUB + 'layers', { recursive: true });
const DATAF = [[PLATE.layers.file, SHEET + PLATE.layers.file, `the lift: each layer's pixels, box, share of its area, the completions in it, and the rebuild against ${PLATE.name}`],
  [`geo-${V}.json`, OUT + `geo-${V}.json`, 'the camera, the stations in view as solids keyed as the layers are, with their depth, and the people at their spots'],
  [`scene-${V}.json`, OUT + `scene-${V}.json`, 'the plate, the three phones (slice, plate on the stage, the people’s slots, the chip, the layout’s checks) and the live screens on each stage'],
  [`occlusion-${V}.json`, OUT + `occlusion-${V}.json`, 'who covers whom, by depth: the order far to near, the layer parts drawn over a person, every overlap measured']].map(([f, src, what]) => { copyFileSync(src, PUB + 'data/' + f); return ['data/' + f, what]; });
const LAYERS = Object.entries(LIFT.pieces).map(([k, q]) => { const f = 'layers/' + q.file.split('/').pop(); copyFileSync(SHEET + q.file, PUB + f); return [f, `${k.split(' ').slice(1).join(' ')}’s layer: ${num(q.px)} px of ${PLATE.name}’s own pixels, alpha the lift’s matte (AI-generated pixels, cut by code)`]; });
execFileSync('python3', ['-I', DIR + '../sheetB/scanfixA.py', DIR + '../../roomb/pv8/_scan-words.txt', ...LAYERS.map(([f]) => PUB + f)], { stdio: 'inherit' });
const SHOTS = existsSync(OUT + 'shots.json') ? J(OUT + 'shots.json') : null;
const A = readFileSync(DIR + '../owner/buildOwnerA.mjs', 'utf8'), CSS = A.slice(A.indexOf('const CSS = `') + 13, A.indexOf('`;', A.indexOf('const CSS = `')))
  .replace("/* View A's owner page", `/* View ${V}'s check page, on view A's owner page`) + `
.live-screen { position: absolute; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(150, 230, 255, .14) 0 1px, transparent 1px 3px), linear-gradient(160deg, #134A66 0%, #0C2C40 55%, #1A5A78 100%); }
.live-screen::after { content: ""; position: absolute; inset: 18% 14% auto 14%; height: 12%; background: rgba(170, 235, 255, .55); box-shadow: 0 2.2em 0 rgba(170, 235, 255, .35), 0 4.4em 0 rgba(170, 235, 255, .25); }
.layer-tag { font: 600 0.72rem/1 var(--f-mono); color: var(--muted); }
`;
// the checks, as the plan's layout makes them: each phone at both text sizes
const checkRows = PHONES.flatMap(([k, w]) => [100, 200].map(pct => { const is = phones[k].byPct[pct].issues;
  return `<tr><td>${esc(k.replace('x', ' × '))}${w ? ` <span class="dim">(${esc(w)})</span>` : ''}</td><td class="n">${pct}%</td><td>${is.length ? `<span class="pill warn">known</span> ${esc(is.join('; '))}` : '<span class="pill ok">pass</span>'}</td></tr>`; })).join('');
const passCount = PHONES.flatMap(([k]) => [100, 200].map(p => phones[k].byPct[p].issues.length === 0)).filter(Boolean).length;
const liftRows = Object.entries(LIFT.pieces).map(([k, q]) => `<tr><td>${esc(k.split(' ').slice(1).join(' '))}</td><td class="n">${num(q.px)}</td><td class="n">${(100 * q.shareOfItsArea).toFixed(1)}%</td><td class="n">${num(Object.values(q.completionPxPastTheMask || q.completionPxPastTheMasks || {}).reduce((a, b) => a + b, 0))}</td><td class="n">${GEO.stations[k] ? `${Math.min(...GEO.stations[k].solids.map(o => o.depthM[0]))}–${Math.max(...GEO.stations[k].solids.map(o => o.depthM[1]))} m` : '–'}</td><td class="n">x ${q.box[0]}–${q.box[2]}, y ${q.box[1]}–${q.box[3]}</td></tr>`).join('');
const ovRows = OC.overlaps['402x742'].map(r => `<tr><td>${esc(r.person)} <span class="dim">(${r.personZ} m)</span></td><td>${esc(r.layer.split(' ').slice(1).join(' '))}</td><td class="n">${num(r.aboveFeetPx)}</td><td class="n">${r.layerDepthHereM ? r.layerDepthHereM.join('–') + ' m' : '–'}</td><td class="n">${num(r.nearerPx)}</td><td>${r.nearerPx ? '<span class="pill warn">over them, where nearer</span>' : 'behind them'}</td></tr>`).join('');
const slotRows = ORDER.map(id => { const pl = placeOf(id), r = R[pl], p402 = phones['402x742'].people.find(q => q.place === pl);
  return `<tr><td>${esc(r.name)}</td><td>${esc(r.work ?? '')}</td><td class="n">${r.spot.join(', ')}</td><td class="n">${r.depthM} m</td><td>${esc(r.seenSide)}</td><td>${esc(r.head)}</td><td class="n">${p402.feet.join(', ')}</td></tr>`; }).join('');
const shotFigs = SHOTS ? SHOTS.shots.map(s => `<figure><img src="${esc(s.file)}" alt="${esc(s.alt)}" width="${s.w}" height="${s.h}" loading="lazy"><figcaption><b>Capture, AI-generated room.</b> ${esc(s.caption)}</figcaption></figure>`).join('\n') : '<p class="dim">The captures are added when the page is captured.</p>';
const FILES = [[PLATE.file, `The room: ${PLATE.name}, AI-generated, a code composite (${PLATE.accepted.startsWith('the Lead, ') ? 'the plate the Lead accepted' : 'the plate for the Lead’s review'})`], ...[...new Set(anyPhone.people.map(p => p.place))].map(pl => [`img/standin-${pl}.png`, `${R[pl].name}’s stand-in: the approved crew drawing in their place’s gesture (drawn by code)`]),
  ...FRONTS.map(f => [f.img, `${f.layer.split(' ').slice(1).join(' ')}: the part of its lifted layer drawn over ${f.person}, ${num(f.px)} px (AI-generated pixels, cut by code)`]), ...(SHOTS ? SHOTS.shots.map(s => [s.file, `Capture: ${s.caption}`]) : [])];
const dataRows = [...DATAF, ...LAYERS].map(([f, what]) => `<tr><td><code>${esc(f)}</code><div class="dim">${esc(what)}</div></td><td class="n">${num(statSync(PUB + f).size)}</td><td class="h"><code>${sha(PUB + f)}</code></td></tr>`).join('');
const fileRows = FILES.map(([f, what]) => `<tr><td><code>${esc(f)}</code><div class="dim">${esc(what)}</div></td><td class="n">${num(statSync(PUB + f).size)}</td><td class="h"><code>${sha(PUB + f)}</code></td></tr>`).join('');
// how much of each live screen each phone shows: the share of its quad inside the stage (sampled on a 200 x 200 grid)
const shown = (P, s) => { const xs = s.corners.map(c => c[0]), ys = s.corners.map(c => c[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const inQ = (x, y) => { let c = false; for (let i = 0, j = 3; i < 4; j = i++) { const [xi, yi] = s.corners[i], [xj, yj] = s.corners[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  let n = 0, k = 0; for (let i = 0; i < 200; i++) for (let j = 0; j < 200; j++) { const x = x0 + (i + 0.5) * (x1 - x0) / 200, y = y0 + (j + 0.5) * (y1 - y0) / 200; if (!inQ(x, y)) continue; n++; if (x >= 0 && x <= P.W && y >= 0 && y <= P.SH) k++; }
  return n ? k / n : 0; };
const NS = !SC.screens.painting.length;   // view E: no screen in view
const SCREENS_SHOWN = PHONES.map(([k]) => [k, SC.phones[k].screens.map(s => ({ name: s.name, share: shown(SC.phones[k], s) }))]);
const screenWords = NS ? `none is in view ${V}` : SCREENS_SHOWN.every(([, ss]) => ss.every(x => x.share > 0.999)) ? `${SC.phones['402x742'].screens.map(s => `the ${esc(s.name)}`).join(' and ')} lie inside every phone’s slice`
  : SCREENS_SHOWN.map(([k, ss]) => `${k.replace('x', ' × ')}: ${ss.map(x => `the ${esc(x.name)} ${Math.round(100 * x.share)}% in view`).join(', ')}`).join('; ') + ' (the rest lies past the slice’s edge, so the game draws only what the phone shows)';
const OOV = REPORT.outOfView, who = ORDER.map(id => `${nameOf(id)} (${R[placeOf(id)].work ?? ''})`).join(', ');
const frontWords = FRONTS.length ? FRONTS.map(f => `${f.layer.split(' ').slice(1).join(' ')} over ${f.person} (${num(f.px)} px${f.px < 50 ? ', a sliver at the feet line' : ''})`).join('; ') : 'none';
const APP = `
// The room, live: the plate, the live screens, then the stand-ins far to near, each followed by the parts of the lifted layers that are
// nearer than them; and the room's own controls, tags and press areas at the boxes the plan's layout gives. Nothing moves.
const D = JSON.parse(document.getElementById('room-data').textContent);
const state = { phone: D.order[0].key, pct: 100, press: false, show: 'all' };   // show: 'all' (room and people) or 'room' (the painting alone)
const wrap = document.getElementById('phone-wrap'), phone = document.getElementById('phone'), stage = document.getElementById('stage');
const px = n => (+n).toFixed(2) + 'px';
const add = (cls, b, html = '') => { const e = document.createElement('div'); e.className = 'ov ' + cls; Object.assign(e.style, { left: px(b.x0), top: px(b.y0), width: px(b.x1 - b.x0), height: px(b.y1 - b.y0) }); e.innerHTML = html; stage.appendChild(e); return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const img = (src, r, cls, id) => { const im = new Image(); im.src = src; im.alt = ''; im.decoding = 'async'; if (cls) im.className = cls; if (id) im.dataset.id = id; Object.assign(im.style, { left: px(r.left), top: px(r.top), width: px(r.width), height: px(r.height) }); stage.appendChild(im); return im; };
function fit() { const P = D.phones[state.phone], avail = Math.max(200, wrap.parentElement.clientWidth), k = Math.min(1, avail / P.W);
  phone.style.transform = 'scale(' + k + ')'; wrap.style.width = px(P.W * k); wrap.style.height = px(P.H * k); }
function build() {
  const P = D.phones[state.phone], L = P.byPct[state.pct], k = state.pct / 100;
  phone.style.width = px(P.W); phone.style.height = px(P.H);
  document.getElementById('bar-top').style.height = px(P.TOP); document.getElementById('bar-bot').style.height = px(P.BOT);
  stage.style.width = px(P.W); stage.style.height = px(P.SH); stage.innerHTML = '';
  img(D.plate, P.plate, 'plate');
  const all = state.show === 'all';
  stage.setAttribute('aria-label', all ? STAGE_ALL : STAGE_ROOM);
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
  document.getElementById('readout').textContent = !all ? 'Room only: the painting as this phone shows it, with the ${NS ? '' : 'screens, '}people, tags, chips and controls hidden.' : L.issues.length ? 'Known here: ' + L.issues.join('; ') + '.' : 'Every check passes here: everyone whole, every face and press area clear of the controls, every tag whole and apart.';
  for (const [id, v] of [['show', state.show], ['phones', state.phone], ['texts', String(state.pct)], ['press', String(state.press)]]) for (const b of document.querySelectorAll('#' + id + ' button')) b.setAttribute('aria-pressed', String(b.dataset.v === v));
  fit();
}
function seg(id, items, on) { const el = document.getElementById(id); for (const [v, t] of items) { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = t; b.onclick = () => { on(v); build(); }; el.appendChild(b); } }
const STAGE_ALL = stage.getAttribute('aria-label'), STAGE_ROOM = 'Room A from ' + D.viewer + '\\u2019s place: the painted room only, with nothing drawn over it';
seg('show', [['all', 'Room and people'], ['room', 'Room only']], v => { state.show = v; });
seg('phones', D.order.map(o => [o.key, o.key.replace('x', ' × ') + (o.words ? ' · ' + o.words : '')]), v => { state.phone = v; });
seg('texts', [['100', '100%'], ['200', '200%']], v => { state.pct = +v; });
seg('press', [['false', 'Hidden'], ['true', 'Shown']], v => { state.press = v === 'true'; });
addEventListener('resize', fit);
window.roomA = { set(p) { Object.assign(state, p); build(); }, state: () => ({ ...state }), data: D };
build();
`;
const ARIA = `Room A from ${VIEWER}’s place: ${ORDER.map(id => `${nameOf(id)} ${({ A: 'at the PC desk', D: 'by the crates', E: 'sitting by the open floor hatch', C: 'at the electrical cabinet', B: 'on the open deck' })[placeOf(id)]}, seen ${R[placeOf(id)].seenSide}`).join('; ')}; ${OOV.name} out of view`;
const html = `<title>Room A, view ${V} checks</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${CSS}</style>
<div class="wrap">
  <header class="top">
    <span class="status">For the Lead’s review · test page</span>
    <h1>Room A, from ${esc(VIEWER)}’s place: the people layers and the phones</h1>
    <p class="lede">View ${V} with its people: the room is an AI-generated picture, ${esc(PLATE.name)}; ${NS ? '' : 'the live screens, '}${esc(who.replace(/ \([^)]*\)/g, ''))} (stand-ins), the layers drawn over them where nearer, their name tags and the room’s controls are drawn by code.</p>
  </header>

  <section id="live" class="live" aria-label="Room A, from ${esc(VIEWER)}'s place">
    <div class="phone-wrap" id="phone-wrap"><div class="phone" id="phone">
      <div class="bar" id="bar-top">Top bar</div>
      <div class="stage" id="stage" role="img" aria-label="${esc(ARIA)}"></div>
      <div class="bar" id="bar-bot">Bottom bar</div>
    </div></div>
    <p class="caption">The room: an AI-generated picture, ${esc(PLATE.name)}, a code composite. ${NS ? `No screen is in view ${V}.` : 'The screens are drawn live by code in their fitted regions.'} The people are stand-ins in the plan’s poses.</p>
    <div class="controls">
      <div class="group"><span>Show</span><div class="seg" id="show"></div></div>
      <div class="group"><span>Phone size</span><div class="seg" id="phones"></div></div>
      <div class="group"><span>Text size</span><div class="seg" id="texts"></div></div>
      <div class="group"><span>Press areas</span><div class="seg" id="press"></div></div>
      <div class="readout" id="readout" aria-live="polite">Loading the room…</div>
    </div>
  </section>

  <section id="notes" class="owner-notes" aria-label="Notes">
    <p><b>What this checks.</b> The plate, ${esc(PLATE.name)}, with its people at their places on the three phones: each person whole on the stage, the tags and press areas clear of the room’s controls and of each other, the painted pieces in front of a person drawn over them, and ${NS ? 'no screen to draw, none being in this view' : SC.screens.painting.length === 1 ? 'the screen live in its fitted region' : `the ${SC.screens.painting.length === 2 ? 'two' : SC.screens.painting.length} screens live in their fitted regions`}. ${passCount} of 6 phone and text-size checks pass${passCount === 6 ? '' : ', the rest known'}.</p>
    <p><b>The people layers.</b> ${esc(PLATE.name)}’s ${Object.keys(LIFT.pieces).length} pieces, lifted off ${esc(LIFT.start.name)} by the Lead’s recipe, with the parts the code completed past step 2’s mask included. By depth at each pixel, ${FRONTS.length ? `only ${esc(frontWords)} is drawn in front of anyone; every other piece is behind the people it overlaps` : 'no piece is nearer than anyone it overlaps, so the plate is drawn first and the people over it, far to near'}.</p>
    <p><b>Who you see.</b> You are ${esc(VIEWER)}. ${esc(who)}. ${esc(OOV.name)} is out of view: the chip at the top stands for them.</p>
  </section>

  <details class="team" id="team"><summary>Details for the team</summary><div class="team-body">
  <section id="about">
    <span class="eyebrow">Mothership · Room A · view ${V} · checks · version 1 · 27 November 2026</span>
    <p><b>The view:</b> from ${esc(VIEWER)}’s place, in the PV6 camera (camera report ${REPORT.version}): straight lines, the phone’s 70° slice at 5° down, at ${REPORT.camera.at.join(', ')} m facing ${REPORT.camera.yawCompass}°. The plate is ${esc(PLATE.name)} (${esc(PLATE.accepted)}), pixels sha256 <code>${PLATE.pixelsSha256}</code>.</p>
    <p><b>The people</b> are the Room A plan’s stand-ins: the approved crew drawing of each, in their place’s gesture, at the camera report’s spots and scale, placed as the plan’s stage places them; their slots are checked against the camera report on every phone. Press areas are the plan’s, at least 44 px.</p>
  </section>
  <section id="layers">
    <h2>The people layers</h2>
    ${LIFT.leftInThePlate ? `<p>Lifted from ${esc(PLATE.name)} off ${esc(LIFT.start.name)}: ${esc(LIFT.recipe)}. The lift’s area is ${esc(LIFT.area)}: ${num(LIFT.liftAreaPx)} px. Left in the plate, where ${esc(PLATE.name)} differs from ${esc(LIFT.start.name)} outside the lift: the toolbox’s cast shadow on the deck (${num(LIFT.leftInThePlate.shadowPx)} px; a floor shadow is not drawn over a person) and the keeps’ own blends (${num(LIFT.leftInThePlate.keepBlendPx)} px, up to 7 px past their masks), as the sheet’s tool leaves them. ${LIFT.missing.length ? 'Missing: ' + esc(LIFT.missing.join(', ')) : 'No piece is missing.'} Inside the lift’s area, ${esc(LIFT.start.name)} with every layer over it differs from ${esc(PLATE.name)} by ${LIFT.rebuild.meanAbsDiff} levels on average, by more than 16 levels at ${num(LIFT.rebuild.pxOver16)} px: the layers’ feathered edges.</p>`
    : `<p>Lifted from ${esc(PLATE.name)} off ${esc(LIFT.start.name)}: ${esc(LIFT.recipe)}. The lift’s area is ${esc(LIFT.area)}: ${num(LIFT.liftAreaPx)} px, of which ${num(LIFT.completionPxOutsideTheMask)} past the mask. Every other pixel where ${esc(PLATE.name)} differs from ${esc(LIFT.start.name)} is the keep’s own blend (${num(LIFT.changedOutsideTheArea.px)} px, up to 6 px past the mask), which stays in the plate, as the sheet’s tool leaves it. ${LIFT.missing.length ? 'Missing: ' + esc(LIFT.missing.join(', ')) : 'No piece is missing.'} ${esc(LIFT.start.name)} with every layer over it differs from ${esc(PLATE.name)} by ${LIFT.rebuild.meanAbsDiff} levels on average, by more than 16 levels at ${num(LIFT.rebuild.pxOver16)} px: the keep’s blend band.</p>`}
    <div class="scroll wide"><table><thead><tr><th>Layer</th><th>Px</th><th>Of its area</th><th>Completed past the mask</th><th>Depth</th><th>Where</th></tr></thead><tbody>${liftRows}</tbody></table></div>
    <h3>Who covers whom</h3>
    <p>${esc(OC.rule)}. A painted pixel whose ray meets none of the stage’s solids takes the depth of the nearest one that does (${Object.entries(OC.depthFilledPx).map(([k, n]) => `${esc(k.split(' ').slice(1).join(' '))} ${num(n)} px`).join(', ')}). The order: ${esc(OC.order.join('; '))}. On 402 × 742 (the same on every phone but where the boxes differ):</p>
    <div class="scroll wide"><table><thead><tr><th>Person</th><th>Layer</th><th>Overlap above the feet</th><th>Layer’s depth there</th><th>Nearer px</th><th>Drawn</th></tr></thead><tbody>${ovRows}</tbody></table></div>
  </section>
  <section id="checks">
    <h2>Checks</h2>
    <p>The plan’s layout checks on each phone, at both text sizes: everyone whole on the stage, no face under the room’s controls, every press area clear of them and of each other, every tag whole and apart. ${passCount} of 6 pass. The screens: ${screenWords}.</p>
    <div class="scroll"><table><thead><tr><th>Phone</th><th>Text</th><th>Result</th></tr></thead><tbody>${checkRows}</tbody></table></div>
    ${SHOTS ? `<p>On the page itself, as captured: ${esc(SHOTS.summary)}.</p>` : ''}
  </section>
  <section id="who">
    <h2>Who is where</h2>
    <div class="scroll wide"><table><thead><tr><th>Person</th><th>Work</th><th>Spot (x, z m)</th><th>Depth</th><th>Seen</th><th>Head</th><th>Feet on 402 × 742</th></tr></thead><tbody>${slotRows}</tbody></table></div>
  </section>
  <section id="captures">
    <h2>Captures</h2>
    <div class="shots">${shotFigs}</div>
  </section>
  <section id="files">
    <h2>The pictures on this page</h2>
    <div class="scroll wide"><table><thead><tr><th>File</th><th>Bytes</th><th>sha256</th></tr></thead><tbody>${fileRows}</tbody></table></div>
  </section>
  <section id="data">
    <h2>The layers and the data</h2>
    <p>For the Motion builder, as view A’s room data has them: the ${LAYERS.length} people layers (RGBA, the size of the painting: ${esc(PLATE.name)}’s own pixels where the layer is, its alpha the lift’s matte) and the view’s data. Painting pixels are of the 1024 × 1536 painting; a phone’s stage pixel is (painting − the slice’s origin) ÷ its scale.</p>
    <div class="scroll wide"><table><thead><tr><th>File</th><th>Bytes</th><th>sha256</th></tr></thead><tbody>${dataRows}</tbody></table></div>
  </section>
  <section id="limits">
    <h2>What this test cannot show</h2>
    <ul><li>Motion and light: the stand-ins hold one pose and are not lit by the room’s lamps${NS ? '' : '; the live screens are a code-drawn stand-in for the game’s own'}.</li><li>Poses that differ by view: each stand-in is its place’s one drawing.</li><li>Speed on a real phone.</li></ul>
  </section>
  </div></details>
</div>
<script type="application/json" id="room-data">${JSON.stringify(DATA).replace(/</g, '\\u003c')}</script>
<script type="module">${APP}</script>`;
writeFileSync(PUB + `check-${v}.html`, html);
console.log(`check-${v}.html`, html.length, 'chars | phones', Object.keys(phones).join(', '), '| checks pass', passCount, 'of 6 | fronts', FRONTS.map(f => f.file).join(', '), '|', SHOTS ? SHOTS.shots.length + ' captures' : 'no captures yet');
