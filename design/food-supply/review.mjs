// mothership:dev-only
//
// The Food Supply Task's review sheets, one per address (design/tools/food-supply-render.mjs
// renders each to design/food-supply/review/):
//   review.html?sheet=layout                the Supply Room annotated: stations, paths, hazard regions, the cradle
//   review.html?sheet=board&id=<storyboard> a storyboard: each beat's room and both phones, with its caption
//   review.html?sheet=phones&as=hoist|boom  every state of one participant's phone
//   review.html?sheet=flow                  starting a Task, the Partner's call, other phones, the return, the food warning
//   review.html?sheet=machine               the machine's parts and their states
//   review.html?sheet=motion                each cue's frames, and its Reduce motion form
//   review.html?sheet=large                 phones at 320 x 568 with the Largest text
// A design proposal on synthetic fixtures (the phone pack's invented roster).

import { FIXTURES, GRID, ROLES, TIMING } from './task.mjs';
import { BOX, BOXES, CELL, REGIONS, TAGS, X0, DECK, cellBox, carriageX, crateY } from './layout.mjs';
import { BOARDS, CAST, boardOf } from './boards.mjs';
import { CUES, run, poseAt } from './stage.mjs';
import { sceneSvg, restPose, routePath } from './scene.mjs';

const p = Object.fromEntries(new URLSearchParams(location.search));
const app = document.getElementById('app');
const CHARS = { hoist: CAST.hoist.character, boom: CAST.boom.character };
const TAG_POSE = { hoist: { number: CAST.hoist.seat, name: CAST.hoist.name }, boom: { number: CAST.boom.seat, name: CAST.boom.name } };
const B = TIMING.briefing;
let uid = 0;
const el = (tag, attrs = {}, html = '') => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) n.setAttribute(k, v); if (html) n.innerHTML = html; return n; };
const scene = (pose, opts = {}) => el('div', { class: 'scene' }, sceneSvg(pose, { characters: CHARS, prefix: `r${(uid += 1)}`, ...opts }));
const framesOf = new Map();
const framesFor = id => { if (!framesOf.has(id)) framesOf.set(id, run(boardOf(id))); return framesOf.get(id); };
const poseOf = (id, t, opts = {}) => poseAt(framesFor(id), t, { tags: TAG_POSE, ...opts });

/** A phone screen in a frame: phone.html at its size, scaled down. Every Task screen reports its layout
 *  (phone.mjs measure()); a control not whole on screen, a cut word or a card off the screen is a problem
 *  that fails the render (window.__fsProblems). With `measured`, the figure also says what the layout did. */
const pending = [];
window.__fsProblems = [];
function phone(query, { width = 390, height = 844, scale = 0.5, safe = '47,34', label = null, measured = false } = {}) {
  const wrap = el('figure', { class: 'phone', style: `width:${width * scale}px` });
  const frame = el('iframe', { src: `phone.html?${query}&safe=${safe}`, width, height, style: `width:${width}px;height:${height}px;transform:scale(${scale});transform-origin:0 0`, loading: 'eager', title: label ?? query });
  const box = el('div', { class: 'phone-box', style: `width:${width * scale}px;height:${height * scale}px` });
  box.append(frame);
  wrap.append(box);
  if (label) wrap.append(el('figcaption', {}, label));
  pending.push(new Promise(resolve => {
    const check = () => {
      if (!frame.contentWindow?.__phoneReady) return setTimeout(check, 50);
      frame.contentWindow.document.fonts.ready.then(() => {
        const m = frame.contentWindow.__fsLayout;
        if (m) {
          for (const x of m.problems) window.__fsProblems.push(`${label ?? query}: ${x}`);
          if (measured) wrap.append(el('figcaption', { class: 'measure' }, m.problems.length ? `Problem: ${m.problems.join('; ')}` : `View ${m.view} px · every control whole · no word cut${m.hintScrolls ? ' · the hint scrolls' : ''}`));
        }
        resolve();
      });
    };
    frame.addEventListener('load', check);
  }));
  return wrap;
}

function header(title, sub) {
  const h = el('header', { class: 'head' });
  h.append(el('h1', {}, title), el('p', {}, sub), el('p', { class: 'fixture' }, 'Food Supply Task · a design proposal on synthetic fixtures (11 November 2026) · not the game, not a release'));
  return h;
}

// ── The annotated layout ────────────────────────────────────────────────
function layout() {
  app.append(header('The Supply Room, annotated', 'Seven columns across, four rows of height. Every press moves one step. The Hoist raises and lowers the crate; the Boom drives the gantry left and right.'));
  const pose = { ...restPose(), tags: TAG_POSE, gantry: 3, crate: { col: 3, row: 3 }, hookRow: 3 };
  const wrap = el('div', { class: 'layout' });
  const art = el('div', { class: 'art' });
  art.append(scene(pose));
  const s = [];
  const r = ([x, y, w, h], cls) => `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  // The grid.
  for (let c = 0; c <= GRID.cols; c += 1) s.push(`<line class="grid" x1="${X0 + c * CELL}" y1="${DECK - GRID.rows * CELL}" x2="${X0 + c * CELL}" y2="${DECK}"/>`);
  for (let k = 0; k <= GRID.rows; k += 1) s.push(`<line class="grid" x1="${X0}" y1="${DECK - k * CELL}" x2="${X0 + GRID.cols * CELL}" y2="${DECK - k * CELL}"/>`);
  for (let c = 0; c < GRID.cols; c += 1) s.push(`<text class="axis" x="${X0 + c * CELL + CELL / 2}" y="${DECK + 30}">${c + 1}</text>`);
  for (let k = 0; k < GRID.rows; k += 1) s.push(`<text class="axis" x="${X0 + GRID.cols * CELL + 22}" y="${DECK - k * CELL - CELL / 2 + 6}">${k}</text>`);
  // The regions.
  s.push(r(REGIONS.drop.box, 'hazard'), r(REGIONS.dropWarning.box, 'warn'), r([X0, 74, CELL, 300], 'hazard'), r([X0 + CELL, 74, CELL, 300], 'warn'), r(REGIONS.cradle.box, 'goal'), r(REGIONS.rib.box, 'block'), r(REGIONS.pulpit.box, 'block'), r(REGIONS.intake.box, 'start'));
  const callouts = [
    [1, [118, 92], 'Hoist cab', 'The Hoist operator: raises and lowers the crate. The ram\'s target.'],
    [2, [X0 + CELL * 1.5, 92], "The cab's door", "The gantry here is one Left from the ram: striped rail, the cab's lamp flashes."],
    [3, [X0 + CELL * 2.5, DECK - 150], 'Intake hatch', 'The crate starts here; it rests on the deck only here.'],
    [4, [X0 + CELL * 3.5, 470], 'Rib', 'The crate passes column 4 only at the top row.'],
    [5, [X0 + CELL * 4.5, 352], 'Over the Boom', 'The crate here is one Lower from the drop: the drop line, the pulpit lamp.'],
    [6, [X0 + CELL * 4.5, 470], 'Pulpit', 'The Boom operator: drives the gantry left and right. The drop\'s target.'],
    [7, [X0 + CELL * 6.5, 300], 'Cradle', 'The correct position. Lowered in, the crate is docked; then both turn a key, or a survivor alone.'],
    [8, [1000, 140], 'End stop and key', "The Boom's key: driving into the end stop with the crate docked turns it."],
    [9, [X0 + CELL * 3.5, 168], 'Gantry', 'Hoist drum, festoon cable, and the bumper plate on its left: the moving panel.'],
  ];
  // The route under the callouts.
  const path = routePath({ col: 2, row: 0 });
  s.push(`<polyline class="route" points="${path.map(q => q.join(',')).join(' ')}"/>`);
  for (const [n, [x, y]] of callouts) s.push(`<g class="callout"><circle cx="${x}" cy="${y}" r="17"/><text x="${x}" y="${y + 6}">${n}</text></g>`);
  art.append(el('div', { class: 'overlay' }, `<svg viewBox="0 0 ${BOX[0]} ${BOX[1] + 40}">${s.join('')}</svg>`));
  const legend = el('ol', { class: 'legend' });
  for (const [n, , title, text] of callouts) legend.append(el('li', {}, `<b>${n} · ${title}</b> ${text}`));
  const keys = el('ul', { class: 'keys' }, ['<i class="k hazard"></i> An attack: the drop (the Boom\'s head) and the ram (the cab)', '<i class="k warn"></i> One press from it: both phones warn, the press is striped', '<i class="k goal"></i> The cradle: the correct position', '<i class="k block"></i> Solid: the crate cannot enter it', '<i class="k start"></i> Where the crate starts', '<i class="k route"></i> The cooperative route: 3 Raise, 4 Right, 2 Lower, two keys'].map(t => `<li>${t}</li>`).join(''));
  const side = el('div', { class: 'side' });
  side.append(legend, keys);
  wrap.append(art, side);
  app.append(wrap);
}

// ── A storyboard ────────────────────────────────────────────────────────
function board(id) {
  const b = boardOf(id);
  app.append(header(`Storyboard · ${b.title}`, `${b.about}.${b.proposed.length ? ` PROPOSED here: ${b.proposed.join('; ')}.` : ''}`));
  const list = el('div', { class: 'beats' });
  b.captions.forEach(([from, to, text, key], i) => {
    const row = el('section', { class: 'beat' });
    const left = el('div', { class: 'beat-art' });
    left.append(scene(poseOf(id, key)), el('p', { class: 'time' }, `${i + 1} · ${(key / 1000).toFixed(1)} s`));
    const phones = el('div', { class: 'beat-phones' });
    phones.append(phone(`s=task&board=${id}&t=${key}&as=hoist`, { label: `${CAST.hoist.name} · Hoist` }), phone(`s=task&board=${id}&t=${key}&as=boom`, { label: `${CAST.boom.name} · Boom` }));
    row.append(left, phones, el('p', { class: 'caption' }, text));
    list.append(row);
  });
  if (['cooperation', 'drop', 'survivor', 'disconnect'].includes(id)) {
    const row = el('section', { class: 'beat' });
    const phones = el('div', { class: 'beat-phones wide' });
    phones.append(phone(`s=return&board=${id}&as=hoist`, { label: `Back in Room B · ${CAST.hoist.name}` }), phone(`s=return&board=${id}&as=boom`, { label: `Back in Room B · ${CAST.boom.name}` }), phone(`s=return&board=${id}&as=other`, { label: 'Another player in Room B' }));
    row.append(el('div', { class: 'beat-art' }, '<p class="time">Return</p>'), phones, el('p', { class: 'caption' }, 'The ordinary return: each participant back at their place before the Task. A participant killed on the Task is shown at their place as Eliminated, not in the Hospital. Nothing names who killed whom.'));
    list.append(row);
  }
  app.append(list);
}

// ── Each participant's states ───────────────────────────────────────────
const STATES = {
  hoist: [
    ['cooperation', 2500, 'Briefing'], ['cooperation', B + 700, 'Raise: the next press'], ['cooperation', B + 3700, 'Waiting: Cleo drives'],
    ['drop', B + 3300, 'Hazard: Lower drops it on Cleo'], ['protection-drop', B + 3800, 'Stopped: the safety catch'], ['ram', B + 4000, "Warning: the gantry at the cab's door"],
    ['cooperation', B + 5300, 'Docked: turn your key'], ['survivor', B + 6000, 'Key turned: waiting'], ['ram', B + 5300, 'Killed: out of the match'],
    ['cooperation', B + 7000, 'Delivered'], ['drop', B + 6000, 'Lost: not in the cradle'], ['disconnect', B + 3000 + TIMING.grace - 2000, 'Partner offline: the Task goes on'],
    ['disconnect', B + 3000 + TIMING.grace + 1500, 'Cancelled'], ['timeout', B + TIMING.deadline + 1500, 'Lost: the time ran out'],
  ],
  boom: [
    ['cooperation', 2500, 'Briefing'], ['cooperation', B + 700, 'Waiting: Hana lifts'], ['cooperation', B + 1100, 'Bump: the rib'],
    ['cooperation', B + 2200, 'Right: the next press'], ['drop', B + 3300, 'Warning: the crate over you'], ['ram', B + 4000, "Hazard: Left rams Hana's cab"],
    ['protection-ram', B + 4500, 'Stopped: the spring buffer'], ['survivor', B + 5300, 'Docked: turn your key'], ['survivor', B + 8650, 'Partner out: send it alone'],
    ['drop', B + 4600, 'Killed: out of the match'], ['survivor', B + 12300, 'Delivered alone'], ['disconnect', B + 3000 + TIMING.grace - 2000, 'Own phone reconnecting'],
    ['disconnect', B + 3000 + TIMING.grace + 1500, 'Cancelled'], ['ram', B + 6400, 'Lost: not in the cradle'],
  ],
};

function phones(as) {
  app.append(header(`${ROLES[as].name} · ${as === 'hoist' ? CAST.hoist.name : CAST.boom.name}'s phone, every state`, `${ROLES[as].about}. Two big hold-to-repeat buttons for one axis; the next press glows; a press that would attack is striped and says so; nothing asks to confirm.`));
  const grid = el('div', { class: 'grid' });
  for (const [id, t, label] of STATES[as]) grid.append(phone(`s=task&board=${id}&t=${t}&as=${as}`, { label }));
  app.append(grid);
}

function flow() {
  app.append(header('Starting a Task, the other phones, the return and the food warning', 'A Volunteer chooses the Task and asks a Partner, who can join or decline (the owner, 11 November 2026). While the two are away, the board shows who is not here. Afterwards everyone is back at their places.'));
  const grid = el('div', { class: 'grid' });
  for (const [q, label] of [
    ['s=volunteer&step=task', '1 · Volunteer: start a Task'], ['s=volunteer&step=partner', '2 · Volunteer: ask a Partner'], ['s=volunteer&step=asking', '3 · Volunteer: waiting for the answer'],
    ['s=called', '4 · Partner: Join or Decline (15 s PROPOSED)'], ['s=volunteer&step=declined', '5 · Volunteer: declined, ask another'], ['s=called&answer=join', '6 · Partner: joined'],
    ['s=volunteer&step=starting', '7 · Volunteer: starting'], ['s=task&board=cooperation&t=2500&as=boom', '8 · Both: briefing'], ['s=away', '9 · Another player: the board shows who is away'],
    ['s=return&board=cooperation&as=hoist', '10 · Return after a delivery'], ['s=return&board=drop&as=other', '11 · Another player after a death'], ['s=stock&n=1', '12 · Food warning: one package (PROPOSED public)'],
  ]) grid.append(phone(q, { label }));
  app.append(grid);
}

// ── The machine's parts ─────────────────────────────────────────────────
function machine() {
  app.append(header("The machine's parts and their states", 'Drawn in the crew\'s ink over the room; every press turns something you can see. Amber is focus: a control that asks for a press, a key turned.'));
  const crops = [
    ['Cab: at rest', { gantry: 3 }, [10, 60, 260, 400]],
    ["Cab: the door lamp (gantry one Left away)", { gantry: 1, crate: { col: 1, row: 3 }, hookRow: 3, lamps: { cab: true, pulpit: false }, warnings: { drop: 0, ram: 1 } }, [10, 60, 400, 400]],
    ['Cab: the spring buffer (stopped)', { gantry: 1, crate: { col: 1, row: 3 }, hookRow: 3, cab: { crushed: false, caught: 1 } }, [10, 60, 400, 400]],
    ['Cab: rammed', { gantry: 0, crate: { col: 0, row: 3 }, hookRow: 3, cab: { crushed: true, caught: 0 }, plate: { dented: true, nudge: 0 }, alive: { hoist: false, boom: true } }, [10, 60, 400, 400]],
    ['Over the Boom: the drop line and the pulpit lamp', { gantry: 4, crate: { col: 4, row: 3 }, hookRow: 3, lamps: { cab: false, pulpit: true }, warnings: { drop: 1, ram: 0 } }, [470, 60, 340, 580]],
    ['The cable\'s safety catch (stopped)', { gantry: 4, crate: { col: 4, row: 3 }, hookRow: 3, effects: [{ kind: 'clamp', at: [carriageX(4), 162] }] }, [470, 60, 340, 300]],
    ['Dropped: the crate on the console', { gantry: 4, crate: { col: 4, row: 2 }, hookRow: 2, alive: { hoist: true, boom: false } }, [470, 60, 340, 580]],
    ['Cradle: open', {}, [790, 300, 230, 360]],
    ['Cradle: docked, jaws shut, lamp lit', { gantry: 6, crate: { col: 6, row: 1 }, docked: true, hookRow: 3.4, cradle: { rise: 0, closed: true, lamp: true } }, [790, 60, 230, 600]],
    ['The Hoist\'s key in the cab: turned, lamp lit', { gantry: 6, crate: { col: 6, row: 1 }, docked: true, hookRow: 3.4, cradle: { rise: 0, closed: true, lamp: true }, keys: { hoist: true, boom: false } }, [10, 60, 260, 400]],
    ['The Boom\'s key at the end stop: turned', { gantry: 6, crate: { col: 6, row: 1 }, docked: true, hookRow: 3.4, cradle: { rise: 0, closed: true, lamp: true }, keys: { hoist: false, boom: true } }, [790, 40, 234, 400]],
    ['Sent: the cradle rising, +5', { gantry: 6, crate: { col: 6, row: 1 }, docked: true, cradle: { rise: 0.45, closed: true, lamp: true }, effects: [{ kind: 'letters', text: '+5', at: [896, 150], size: 72, angle: -6, fill: '#F1B84B' }] }, [700, 20, 324, 640]],
  ];
  const grid = el('div', { class: 'parts' });
  for (const [label, over, crop] of crops) {
    const fig = el('figure', { class: 'part' });
    fig.append(scene({ ...restPose(), ...over }, { crop }), el('figcaption', {}, label));
    grid.append(fig);
  }
  const fx = el('figure', { class: 'part wide' });
  fx.append(scene({ ...restPose(), gantry: 3, crate: { col: 3, row: 3 }, hookRow: 3, effects: [
    { kind: 'burst', at: [200, 520], r: 70, t: 1 }, { kind: 'letters', text: 'THUD!', at: [200, 420], size: 56, angle: -8 },
    { kind: 'burst', at: [470, 540], r: 64, t: 1, seed: 170 }, { kind: 'letters', text: 'SLAM!', at: [470, 440], size: 54, angle: -10 },
    { kind: 'letters', text: 'CLANK!', at: [720, 470], size: 46, angle: -6 }, { kind: 'clunk', at: [880, 520], dir: [1, 0], t: 1 },
  ] }, { crop: [40, 330, 980, 300] }), el('figcaption', {}, 'Effects: THUD! (the drop), SLAM! (the ram), CLANK! (a stop), a clunk (a blocked move). Lettering is decoration; the phone says the same in words.'));
  grid.append(fx);
  app.append(grid);
}

// ── Motion: each cue's frames, and its Reduce motion form ─────────────
function motion() {
  app.append(header('Motion: each cue and its Reduce motion form', 'Five moments of each cue, then the same moment with Reduce motion (no travel, no sway, no flashing, effects still). Timings are PROPOSED; a new state always replaces a cue still playing.'));
  const cues = [
    ['Move one step', 'cooperation', B + 2500, [0, 60, 120, 180, 240], [300, 60, 560, 300], CUES.move],
    ['Bump: a blocked move', 'cooperation', B + 1000, [0, 45, 90, 135, 300], [220, 60, 400, 560], CUES.bump],
    ['The drop', 'drop', B + 3600, [0, 80, 160, 380, 900], [420, 60, 460, 580], CUES.drop],
    ['The ram', 'ram', B + 4300, [0, 70, 140, 380, 900], [10, 40, 460, 420], CUES.ram],
    ['Stopped: the safety catch', 'protection-drop', B + 3600, [0, 80, 160, 240, 600], [420, 60, 460, 580], CUES.stopped],
    ['Stopped: the spring buffer', 'protection-ram', B + 4300, [0, 80, 160, 240, 600], [10, 40, 460, 420], CUES.stopped],
    ['Dock', 'cooperation', B + 5100, [0, 70, 140, 220, 300], [700, 40, 324, 620], CUES.dock],
    ['Send', 'cooperation', B + 6300, [0, 275, 550, 825, 1100], [700, 0, 324, 660], CUES.send],
  ];
  const table = el('div', { class: 'cues' });
  for (const [name, id, t0, offsets, crop, cue] of cues) {
    const row = el('section', { class: 'cue' });
    row.append(el('h2', {}, `${name}<small>${cue.ms ? `${cue.ms} ms` : ''}${cue.ease ? ` · ease ${cue.ease}` : ''}</small>`));
    const strip = el('div', { class: 'strip' });
    for (const dt of offsets) {
      const fig = el('figure', {});
      fig.append(scene(poseOf(id, t0 + dt, { guide: false }), { crop }), el('figcaption', {}, `+${dt} ms`));
      strip.append(fig);
    }
    const red = el('figure', { class: 'reduced' });
    red.append(scene(poseOf(id, t0 + offsets[2], { reduced: true, guide: false }), { crop }), el('figcaption', {}, `Reduce motion: ${cue.reduced}`));
    strip.append(red);
    row.append(strip);
    table.append(row);
  }
  app.append(table);
}

function large() {
  app.append(header('Phones at 320 x 568 with the Largest text', 'The game\'s 200% text on the smallest phone the pack reviews. The view gives way to the words, down to a letterboxed strip; the controls keep their places (Raise above Lower, Left beside Right); the role row goes; cards scroll. Each phone reports its own layout below it.'));
  const grid = el('div', { class: 'grid' });
  for (const [q, label] of [
    ['s=task&board=cooperation&t=2500&as=hoist', 'Briefing'], ['s=task&board=cooperation&t=' + (B + 700) + '&as=hoist', 'Hoist: Raise next'],
    ['s=task&board=drop&t=' + (B + 3300) + '&as=hoist', 'Hoist: hazard'], ['s=task&board=ram&t=' + (B + 4000) + '&as=boom', 'Boom: hazard'],
    ['s=task&board=survivor&t=' + (B + 5300) + '&as=boom', 'Boom: docked'], ['s=task&board=survivor&t=13300&as=boom', 'Boom: alone, Hana out'],
    ['s=task&board=disconnect&t=7600&as=hoist', 'Hoist: Cleo offline'], ['s=task&board=drop&t=' + (B + 6000) + '&as=hoist', 'Lost'],
  ]) grid.append(phone(`${q}&text=2`, { width: 320, height: 568, scale: 1, safe: '20,0', label, measured: true }));
  app.append(grid);
}

const SHEETS = { layout, board: () => board(p.id ?? 'cooperation'), phones: () => phones(p.as === 'boom' ? 'boom' : 'hoist'), flow, machine, motion, large };
document.body.dataset.sheet = p.sheet ?? 'layout';
(SHEETS[p.sheet] ?? layout)();
Promise.all(pending).then(() => document.fonts.ready).then(() => { window.__designReady = true; });
