// View A's owner page (Room A, from Vega's place), on Room B's owner page pattern (pv6b, version 5): the title and one line, the
// room straight away with its controls under it, three short notes, and the team's details in a closed fold. One page (the owner's
// rule of 19 November: one page per review). A test page.
// - The room is the plate the Lead accepted at 14:36: RA-A-4, an AI-generated picture, with its cabinet's right frame drawn in
//   code (the room data page's copy, ../data/ra-A-4-frame.png, checked against scene.json's plate entry).
// - Mira, Echo and Lyra are the Room A plan's stand-ins: the approved crew drawing in each place's gesture (../vis/B.svg, C.svg,
//   E.svg, rendered by standinsOwnerA.cjs), at the camera report's spots, scaled and placed as the plan's views place them.
// - The layout is the plan's own (../stageA.mjs stageView('A')): the tags at the feet, the press areas, the out-of-view chip and
//   the room's controls, for each phone and text size, with the checks it makes; each slot is checked against scene.json.
// Lyra's crouch, Vega's chair, visits to the food unit and the people's motion and light are the Motion builder's, not shown here.
// Writes pub/owner-a.html (the page, its data and its script inline) and copies its pictures into pub/img/. Generates nothing.
// Usage: node buildOwnerA.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { stageView, STAGING } from '../stageA.mjs';
const DIR = new URL('./', import.meta.url).pathname, PUB = DIR + 'pub/', DATA = DIR + '../data/';
const J = f => JSON.parse(readFileSync(f, 'utf8')), sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = n => +(+n).toFixed(1), r2 = n => +(+n).toFixed(2), num = n => Number(n).toLocaleString('en-GB');
const SC = J(DATA + 'scene.json'), GEO = J(DATA + 'geo-A.json'), REPORT = J(DIR + '../camera-report-A.json');
if (SC.version !== 2 || sha(DATA + 'ra-A-4-frame.png') !== SC.plate.sha256) throw new Error("the plate is not the one scene.json's plate entry names");
const PHONES = [['402x742', 'your phone in the app'], ['390x844', ''], ['430x932', '']];
const S = stageView('A');
// the stand-ins: place -> picture (the plan's sprites: a 300-unit box, the feet at 152, 273)
const IMG = { B: 'img/standin-mira.png', C: 'img/standin-echo.png', E: 'img/standin-lyra.png' };
const SRCIMG = { B: 'standin-B.png', C: 'standin-C.png', E: 'standin-E.png' };
// far to near, by depth along the camera's axis (occlusion.json: no piece is in front of anyone, so the plate is drawn first)
const ORDER = [...SC.phones['390x844'].people].sort((a, b) => b.Z - a.Z).map(p => p.id);
const near = (a, b, d = 0.06) => Math.abs(a - b) <= d;
const phones = {};
for (const [key] of PHONES) {
  const P = SC.phones[key], byPct = {};
  for (const pct of [100, 200]) {
    const v = S.views[`${key}@${pct}`], L = v.layout, C = L.chrome;
    for (const fg of L.figs) {   // each slot as scene.json gives it
      const sp = P.people.find(p => p.place === fg.place);
      if (!sp || !near(sp.feet[0], fg.anchor[0]) || !near(sp.feet[1], fg.anchor[1]) || !near(sp.u, fg.u, 0.0001) || sp.box.some((b, i) => !near(b, fg.box[i]))) throw new Error(`${key}@${pct}: ${fg.name}'s slot is not scene.json's`);
    }
    if (JSON.stringify(v.issues) !== JSON.stringify(P.byPct[pct].issues)) throw new Error(`${key}@${pct}: the checks differ from scene.json's`);
    const box = b => ({ x0: r2(b.x0), y0: r2(b.y0), x1: r2(b.x1), y1: r2(b.y1) });
    byPct[pct] = { issues: v.issues, tags: L.tags.map(t => ({ id: t.id, ...box(t), at: t.at })), squares: L.squares.map(q => ({ id: q.id, ...box(q) })),
      ooc: { ...box(L.chip), press: box(L.chip.press), name: L.chip.name, num: L.chip.num },
      chrome: { label: box(C.label), control: box(C.control), boardChip: box(C.boardChip), you: box(C.you), labelText: C.labelText, controlText: C.controlText, boardText: C.boardText, youText: C.youText } };
  }
  const people = ORDER.map(id => { const p = P.people.find(q => q.id === id), u = p.u;
    return { id, place: p.place, name: p.name, num: p.num, pose: p.pose, img: IMG[p.place], rect: { left: r2(p.feet[0] - 152 * u), top: r2(p.feet[1] - 273 * u), size: r2(300 * u) }, box: p.box, feet: p.feet }; });
  phones[key] = { W: P.W, H: P.H, TOP: P.TOP, BOT: P.BOT, SH: P.SH, plate: P.plate, people, byPct };
}
const DATA_A = { plate: 'img/ra-A-4-frame.png', phones, order: PHONES.map(([k, w]) => ({ key: k, words: w })) };
// the files the page shows
mkdirSync(PUB + 'img', { recursive: true });
copyFileSync(DATA + 'ra-A-4-frame.png', PUB + 'img/ra-A-4-frame.png');
for (const [pl, f] of Object.entries(IMG)) copyFileSync(DIR + SRCIMG[pl], PUB + f);
const COST = J(DIR + 'cost-A.json');   // costA.py: Room A's six pictures from the image session's records, and views B to E at their average
const SHOTS = existsSync(DIR + 'shots.json') ? J(DIR + 'shots.json') : null;   // the captures (captureOwnerA.cjs), once made
// the checks, as the plan's layout makes them: each phone at both text sizes
const checkRows = PHONES.flatMap(([k, w]) => [100, 200].map(pct => { const is = phones[k].byPct[pct].issues;
  return `<tr><td>${esc(k.replace('x', ' × '))}${w ? ` <span class="dim">(${esc(w)})</span>` : ''}</td><td class="n">${pct}%</td><td>${is.length ? `<span class="pill warn">known</span> ${esc(is.join('; '))}: the room scene’s rule that keeps offered places clear of the shell’s overlays fixes it, in the room scene’s next version (0.6.0)` : '<span class="pill ok">pass</span>'}</td></tr>`; })).join('');
// where each phone and text size puts the tags: at the feet, or at the pack's accepted place
const NAME = { A2: 'Mira', A3: 'Echo', A5: 'Lyra' };
const tagWords = PHONES.flatMap(([k]) => [100, 200].map(pct => { const acc = phones[k].byPct[pct].tags.filter(t => t.at !== 'the feet').map(t => NAME[t.id]);
  return `${k.replace('x', ' × ')} at ${pct}%: ${acc.length === 0 ? 'all at the feet' : acc.length === 3 ? 'all at the accepted place' : `${acc.join(' and ')} at the accepted place, the other at the feet`}`; })).join('; ');
const passCount = PHONES.flatMap(([k]) => [100, 200].map(p => phones[k].byPct[p].issues.length === 0)).filter(Boolean).length;
const R = REPORT.people, who = [['C', 'at the electrical panel', 'Seen from behind, as the plan has it: they trace the cables with a hand up to the cabinet.'], ['B', 'on the open deck', 'Standing, thinking, a checklist at the belt.'], ['E', 'at the floor hatch', 'Sitting on the deck by it for now: the crouch with the wrench into the opening comes with the Motion builder.']];
const slotRows = who.map(([pl, where]) => { const r = R[pl], p402 = phones['402x742'].people.find(q => q.place === pl);
  return `<tr><td>${esc(r.name)}</td><td>${esc(where)}</td><td class="n">${r.spot.join(', ')}</td><td class="n">${r.depthM} m</td><td>${esc(r.seenSide)}, ${Math.abs(Math.round(r.seenDeg))}°</td><td>${esc(r.head)}</td><td class="n">${p402.feet.join(', ')}</td></tr>`; }).join('');
const shotFigs = SHOTS ? SHOTS.shots.map(s => `<figure><img src="${esc(s.file)}" alt="${esc(s.alt)}" width="${s.w}" height="${s.h}" loading="lazy"><figcaption><b>Capture, AI-generated room.</b> ${esc(s.caption)}</figcaption></figure>`).join('\n') : '<p class="dim">The captures are added when the page is captured.</p>';
const fileRows = [['img/ra-A-4-frame.png', 'The room: RA-A-4, AI-generated, with its cabinet’s right frame drawn in code (the plate the Lead accepted at 14:36)'], ['img/standin-mira.png', 'Mira’s stand-in: the approved crew drawing, thinking (drawn by code)'], ['img/standin-echo.png', 'Echo’s stand-in: the approved crew drawing, at a wall panel, from behind (drawn by code)'], ['img/standin-lyra.png', 'Lyra’s stand-in: the approved crew drawing, sitting on the deck (drawn by code)'],
  ...(SHOTS ? SHOTS.shots.map(s => [s.file, `Capture: ${s.caption}`]) : [])].map(([f, what]) => `<tr><td><code>${esc(f)}</code><div class="dim">${esc(what)}</div></td><td class="n">${num(statSync(PUB + f).size)}</td><td class="h"><code>${sha(PUB + f)}</code></td></tr>`).join('');

const CSS = `
/* View A's owner page, in Room A's blue steel (tokens 0.5.0 color.room.roomA): the title and one line, the room with its controls
   under it, three notes, and the team's details in a closed fold. System fonts only. */
:root { --bg: #EEF2F7; --surface: #FFFFFF; --sunk: #E2E8F0; --ink: #14202E; --muted: #536173; --line: #D2DBE6; --accent: #2D609E; --accent-soft: #DFE8F4;
  --warn: #8A4B0F; --warn-soft: #FBEEDD; --ok: #1D6B45; --ok-soft: #E2F3EA; --f-body: system-ui, -apple-system, "Segoe UI", sans-serif; --f-mono: ui-monospace, Menlo, Consolas, monospace; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #0E1520; --surface: #16202E; --sunk: #1C2939; --ink: #E6EDF6; --muted: #9AA9BC; --line: #2A3A50; --accent: #8DB6E4; --accent-soft: #1E3250; --warn: #F0B072; --warn-soft: #3A2817; --ok: #6FD39E; --ok-soft: #173126; color-scheme: dark } }
:root[data-theme="dark"] { --bg: #0E1520; --surface: #16202E; --sunk: #1C2939; --ink: #E6EDF6; --muted: #9AA9BC; --line: #2A3A50; --accent: #8DB6E4; --accent-soft: #1E3250; --warn: #F0B072; --warn-soft: #3A2817; --ok: #6FD39E; --ok-soft: #173126; color-scheme: dark }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--ink); font: 15px/1.55 var(--f-body); margin: 0; }
.wrap { max-width: 1000px; margin: 0 auto; padding-block: 16px 56px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 22px; }
h1, h2, h3 { text-wrap: balance; margin: 0; line-height: 1.15; } h1 { font-size: clamp(1.45rem, 6vw, 2.1rem); font-weight: 650; } h2 { font-size: 1.3rem; font-weight: 650; } h3 { font-size: 1.05rem; font-weight: 650; }
p { margin: 0; max-width: 70ch; } section { display: grid; gap: 14px; min-width: 0; } ul { margin: 0; padding-left: 1.25em; display: grid; gap: 6px; } li { max-width: 76ch; }
header.top { display: grid; gap: 8px; width: 100%; max-width: 640px; justify-self: center; }
.status { display: inline-flex; gap: 8px; align-items: center; padding: 4px 10px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-size: 0.78rem; font-weight: 600; width: fit-content; }
.status::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex: none; }
.lede { font-size: 1rem; line-height: 1.45; }
.live { display: grid; gap: 14px; justify-items: center; min-width: 0; }
.phone-wrap { position: relative; max-width: 100%; }
.phone { position: absolute; left: 0; top: 0; transform-origin: top left; background: #0F1117; border-radius: 28px; overflow: hidden; box-shadow: 0 1px 0 rgba(0,0,0,.08), 0 10px 30px rgba(10,20,40,.18); }
.bar { display: grid; place-items: center; color: #5B6273; font: 12px/1 var(--f-body); letter-spacing: 0.5px; }
.stage { position: relative; overflow: hidden; background: #14243F; user-select: none; -webkit-user-select: none; }
.stage img { position: absolute; display: block; max-width: none; max-height: none; pointer-events: none; }
.ov { position: absolute; box-sizing: border-box; white-space: nowrap; pointer-events: none; }
.ov.label { background: #F1B84B; border: 2px solid #10141C; transform: skewX(-9deg) rotate(-1.4deg); display: grid; place-items: center; color: #10141C; font-family: "Arial Narrow", Arial, sans-serif; font-weight: 800; letter-spacing: 1px; }
.ov.you { background: rgba(12,15,22,.86); color: rgba(244,235,221,.85); font-weight: 600; display: grid; place-items: center; }
.ov.board { background: rgba(12,15,22,.86); border: 1px dashed rgba(244,235,221,.4); color: #F4EBDD; font-weight: 600; display: grid; place-items: center; border-radius: 16px; }
.ov.control { background: #F4EBDD; color: #10141C; font-weight: 600; display: grid; place-items: center; border-radius: 22px; }
.ov.tag { display: flex; align-items: center; background: rgba(12,15,22,.86); border: 1.5px solid rgba(244,235,221,.28); border-radius: 999px; color: #F4EBDD; font-weight: 600; }
.ov.tag .n { display: grid; place-items: center; border-radius: 50%; background: #F4EBDD; color: #10141C; font-weight: 800; flex: none; }
.ov.press { border: 1.5px dashed #00E5FF; opacity: 0.85; }
.controls { width: 100%; max-width: 640px; display: grid; gap: 12px; }
.group { display: grid; gap: 6px; } .group > span { font-size: 0.78rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
.seg { display: flex; flex-wrap: wrap; gap: 6px; }
.seg button { font: 500 0.88rem/1 var(--f-body); padding: 9px 12px; min-height: 44px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); cursor: pointer; }
.seg button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: var(--surface); }
.seg button:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.readout { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px; font-size: 0.88rem; }
.caption { font-size: 0.86rem; color: var(--muted); max-width: 640px; text-align: center; }
.owner-notes { display: grid; gap: 12px; width: 100%; max-width: 640px; justify-self: center; }
.owner-notes p { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 12px 16px; max-width: none; }
details.team { border-top: 1px solid var(--line); min-width: 0; }
details.team > summary { cursor: pointer; font-weight: 600; font-size: 1.1rem; min-height: 44px; display: flex; align-items: center; gap: 8px; list-style: none; }
details.team > summary::-webkit-details-marker { display: none; }
details.team > summary::before { content: "▸"; color: var(--muted); width: 1em; } details.team[open] > summary::before { content: "▾"; }
.team-body { display: grid; gap: 30px; padding-top: 14px; min-width: 0; }
.eyebrow { font: 500 0.72rem/1.3 var(--f-mono); letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.dim { color: var(--muted); font-size: 0.86rem; }
.pill { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 0.78rem; font-weight: 650; } .pill.ok { background: var(--ok-soft); color: var(--ok); } .pill.warn { background: var(--warn-soft); color: var(--warn); }
.scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
table { border-collapse: collapse; width: 100%; font-size: 0.86rem; font-variant-numeric: tabular-nums; }
th, td { text-align: left; padding: 8px 11px; border-bottom: 1px solid var(--line); vertical-align: top; } th { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); background: var(--sunk); }
tr:last-child td { border-bottom: 0; } td.n { white-space: nowrap; font-family: var(--f-mono); font-size: 0.8rem; } td.h code { font-size: 0.74rem; }
.wide table { min-width: 680px; }
code { font-family: var(--f-mono); font-size: 0.82em; overflow-wrap: anywhere; }
.shots { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; align-items: start; }
.shots figure { margin: 0; display: grid; gap: 6px; min-width: 0; } .shots img { width: 100%; height: auto; display: block; border-radius: 10px; border: 1px solid var(--line); }
figcaption { font-size: 0.8rem; color: var(--muted); }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
`;

const APP = `
// The room, live: the plate, the stand-ins far to near, and the room's own controls, tags and press areas, each at the box the
// plan's layout gives for the phone and text size chosen. Nothing moves.
const D = JSON.parse(document.getElementById('room-a-data').textContent);
const state = { phone: D.order[0].key, pct: 100, press: false, show: 'all' };   // show: 'all' (room and people) or 'room' (the painting alone)
const wrap = document.getElementById('phone-wrap'), phone = document.getElementById('phone'), stage = document.getElementById('stage');
const px = n => (+n).toFixed(2) + 'px';
const add = (cls, b, html = '') => { const e = document.createElement('div'); e.className = 'ov ' + cls; Object.assign(e.style, { left: px(b.x0), top: px(b.y0), width: px(b.x1 - b.x0), height: px(b.y1 - b.y0) }); e.innerHTML = html; stage.appendChild(e); return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function fit() { const P = D.phones[state.phone], avail = Math.max(200, wrap.parentElement.clientWidth), k = Math.min(1, avail / P.W);
  phone.style.transform = 'scale(' + k + ')'; wrap.style.width = px(P.W * k); wrap.style.height = px(P.H * k); }
function build() {
  const P = D.phones[state.phone], L = P.byPct[state.pct], k = state.pct / 100;
  phone.style.width = px(P.W); phone.style.height = px(P.H);
  document.getElementById('bar-top').style.height = px(P.TOP); document.getElementById('bar-bot').style.height = px(P.BOT);
  stage.style.width = px(P.W); stage.style.height = px(P.SH); stage.innerHTML = '';
  const plate = new Image(); plate.src = D.plate; plate.alt = ''; plate.decoding = 'async';
  Object.assign(plate.style, { left: px(P.plate.left), top: px(P.plate.top), width: px(P.plate.width), height: px(P.plate.height) }); stage.appendChild(plate);
  const all = state.show === 'all';
  stage.setAttribute('aria-label', all ? STAGE_ALL : 'Room A from Vega\u2019s place: the painted room only, with nothing drawn over it');
  if (all) {
  for (const p of P.people) { const im = new Image(); im.src = p.img; im.alt = ''; im.dataset.id = p.id; Object.assign(im.style, { left: px(p.rect.left), top: px(p.rect.top), width: px(p.rect.size), height: px(p.rect.size) }); stage.appendChild(im); }
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
  document.getElementById('readout').textContent = !all ? 'Room only: the painting as this phone shows it, with the people, name tags, chips and controls hidden.' : L.issues.length ? 'Known here: ' + L.issues.join('; ') + '. The room scene’s overlay rule fixes it.' : 'Every check passes here: everyone whole, every face and press area clear of the room’s controls, and the name tags whole and apart.';
  for (const [id, v] of [['show', state.show], ['phones', state.phone], ['texts', String(state.pct)], ['press', String(state.press)]]) for (const b of document.querySelectorAll('#' + id + ' button')) b.setAttribute('aria-pressed', String(b.dataset.v === v));
  fit();
}
function seg(id, items, on) { const el = document.getElementById(id); for (const [v, t] of items) { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.textContent = t; b.onclick = () => { on(v); build(); }; el.appendChild(b); } }
const STAGE_ALL = stage.getAttribute('aria-label');
seg('show', [['all', 'Room and people'], ['room', 'Room only']], v => { state.show = v; });
seg('phones', D.order.map(o => [o.key, o.key.replace('x', ' × ') + (o.words ? ' · ' + o.words : '')]), v => { state.phone = v; });
seg('texts', [['100', '100%'], ['200', '200%']], v => { state.pct = +v; });
seg('press', [['false', 'Hidden'], ['true', 'Shown']], v => { state.press = v === 'true'; });
addEventListener('resize', fit);
window.roomA = { set(p) { Object.assign(state, p); build(); }, state: () => ({ ...state }), data: D };
build();
`;

const html = `<title>Room A from Vega's place</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${CSS}</style>
<div class="wrap">
  <header class="top">
    <span class="status">For the owner · test page</span>
    <h1>Room A, from Vega's place</h1>
    <p class="lede">One view of Room A: the room is an AI-generated picture; Mira, Echo and Lyra, their name tags and the room’s controls are drawn by code.</p>
  </header>

  <section id="live" class="live" aria-label="Room A, from Vega's place">
    <div class="phone-wrap" id="phone-wrap"><div class="phone" id="phone">
      <div class="bar" id="bar-top">Top bar</div>
      <div class="stage" id="stage" role="img" aria-label="Room A from Vega's place: Echo at the electrical cabinet, seen from behind; Mira standing on the open deck at the right; Lyra sitting by the open floor hatch at the left; Atlas out of view"></div>
      <div class="bar" id="bar-bot">Bottom bar</div>
    </div></div>
    <p class="caption">The room: an AI-generated picture, RA-A-4, with its cabinet’s right frame drawn in code. The people are stand-ins in the plan’s poses.</p>
    <div class="controls">
      <div class="group"><span>Show</span><div class="seg" id="show"></div></div>
      <div class="group"><span>Phone size</span><div class="seg" id="phones"></div></div>
      <div class="group"><span>Text size</span><div class="seg" id="texts"></div></div>
      <div class="group"><span>Press areas</span><div class="seg" id="press"></div></div>
      <div class="readout" id="readout" aria-live="polite">Loading the room…</div>
    </div>
  </section>

  <section id="notes" class="owner-notes" aria-label="Notes">
    <p><b>The question for you.</b> If view A looks right, say go, and views B to E are painted the same way: ${COST.planned} pictures planned, about $${COST.plannedUsd}, and at most ${COST.most} with re-runs, about $${COST.mostUsd}. Room A has used ${COST.used} pictures so far, about $${COST.usedUsd} of your $5 cap. If something in the room should change, say what. Nothing more is painted until you answer.</p>
    <p><b>What is painted, and what is code.</b> The room and its furniture are one painted picture, made by the image tool and recorded as AI-generated. The cabinet’s right frame was then drawn into it in code. Mira, Echo and Lyra, the name tags and the room’s controls are drawn by code.</p>
    <p><b>Who you see.</b> You are Vega, at the PC. Echo works at the electrical cabinet, seen from behind; Mira stands on the open deck; Lyra is at the floor hatch. Atlas is out of view: the chip at the top right stands for Atlas.</p>
    <p><b>Still to come.</b> These are stand-ins in the plan’s poses. Lyra’s crouch with the wrench in the hatch, Vega’s chair, visits to the food unit, and the people moving and lit by the room’s lamps come with the Motion builder’s work. One known case: on your phone with 200% text, Lyra’s press area runs under the Board chip; the room scene’s rule for its overlays fixes it. To see all of the painting, choose Room only under Show.</p>
  </section>

  <details class="team" id="team"><summary>Details for the team</summary><div class="team-body">
  <section id="about">
    <span class="eyebrow">Mothership · Room A · view A · test page · version 2 · 19 November 2026</span>
    <p><b>The test:</b> view A, from Vega’s place, in the PV6 camera (camera report ${REPORT.version}): straight lines, the phone’s 70° slice at 5° down, at ${REPORT.camera.at.join(', ')} m facing ${REPORT.camera.yawCompass}°. The room is the plate the Lead accepted at 14:36 on 19 November: RA-A-4 with its cabinet’s right frame drawn in code (sheet RA-A version 7). No piece of the room is nearer than a person it overlaps (occlusion.json on the room data page), so the plate is drawn first and the people over it, far to near: ${ORDER.map(id => esc(phones['390x844'].people.find(p => p.id === id).name)).join(', ')}.</p>
    <p><b>The people</b> are the Room A plan’s stand-ins: the approved crew drawing of each, in their place’s gesture, at the camera report’s spots and scale, placed as the plan’s views place them. Press areas are the plan’s, at least 44 px.</p>
    <p><b>Name tags</b> follow Room B’s rule: each goes just under the person’s feet, nudged up to 6 px where something is in the way; where that is not enough, it goes to the pack’s accepted place, at the foot of the person’s press area. ${tagWords}.</p>
  </section>
  <section id="checks">
    <h2>Checks</h2>
    <p>The plan’s layout checks on each phone, at both text sizes: everyone whole on the stage, no face under the room’s controls, every press area clear of them and of each other, every tag whole and apart. ${passCount} of 6 pass, with the one known case.</p>
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
    <p class="dim">The room’s pixels (8-bit RGB, row by row) have sha256 <code>${SC.plate.pixelsSha256}</code>, as the frame’s record gives them. RA-A-4 itself has sha256 <code>${SC.plate.start.sha256}</code>.</p>
  </section>
  <section id="spend">
    <h2>Spend</h2>
    <p>From the image session’s records, each picture’s estimated cost: ${COST.pictures.map(p => `${esc(p.name)} $${p.usd}`).join(', ')}; ${COST.used} pictures, $${COST.usedExact} in all (the records’ running total), an average of $${COST.averageUsd} a picture. Views B to E at that average: ${COST.planned} planned (the empty room and the furniture in each, and the food unit in view D), $${COST.plannedExact}; at most ${COST.most} with re-runs, $${COST.mostExact}. The cap is under $5 for Room A.</p>
  </section>
  <section id="limits">
    <h2>What this test cannot show</h2>
    <ul><li>Motion and light: the stand-ins hold one pose and are not lit by the room’s lamps.</li><li>Lyra’s crouch at the hatch, Vega’s chair and visits to the food unit, which are the Motion builder’s.</li><li>Speed on a real phone, and how the room looks inside the game’s own screens.</li></ul>
  </section>
  </div></details>
</div>
<script type="application/json" id="room-a-data">${JSON.stringify(DATA_A).replace(/</g, '\\u003c')}</script>
<script type="module">${APP}</script>`;
writeFileSync(PUB + 'owner-a.html', html);
writeFileSync(DIR + 'layout.json', JSON.stringify(DATA_A, null, 1));
console.log('owner-a.html', html.length, 'chars | phones', Object.keys(phones).join(', '), '| checks pass', passCount, 'of 6 |', SHOTS ? SHOTS.shots.length + ' captures' : 'no captures yet');
