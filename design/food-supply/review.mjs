// mothership:dev-only
//
// The Food Supply Task's review sheets, one per address (design/tools/food-supply-render.mjs
// renders each to design/food-supply/review/):
//   review.html?sheet=layout                 the Supply Room annotated: stops, stations, the zones, the swing, the cut
//   review.html?sheet=board&id=<storyboard>  a storyboard: each beat's room and both phones, with its caption
//   review.html?sheet=phones&as=winch|panel  every state of one participant's phone
//   review.html?sheet=flow                   starting a Task, the Partner's request, other phones, the return, the food warning
//   review.html?sheet=machine                the crane's parts and their states
//   review.html?sheet=motion                 each cue's frames, and its Reduce motion form
//   review.html?sheet=large                  phones at 320 x 568 with the Largest text
// A design proposal on synthetic fixtures (the phone pack's invented roster).

import { FIXTURES, ROLES, STOPS, SWING, TIMING, ZONES } from './task.mjs';
import { BLADE, BOX, BOXES, CARRIAGE, CRATE, DECK, HANG, OPERATORS, PENDULUM, RAIL, REGIONS, REST, STEP, stopX } from './layout.mjs';
import { BOARDS, CAST, boardOf } from './boards.mjs';
import { CUES, run, poseAt } from './stage.mjs';
import { sceneSvg, restPose } from './scene.mjs';

const p = Object.fromEntries(new URLSearchParams(location.search));
const app = document.getElementById('app');
const CHARS = { winch: CAST.winch.character, panel: CAST.panel.character };
const TAG_POSE = { winch: { number: CAST.winch.seat, name: CAST.winch.name }, panel: { number: CAST.panel.seat, name: CAST.panel.name } };
const B = TIMING.briefing;
const PLATFORM_AT = B + 2700;
let uid = 0;
const el = (tag, attrs = {}, html = '') => { const n = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) n.setAttribute(k, v); if (html) n.innerHTML = html; return n; };
const scene = (pose, opts = {}) => el('div', { class: 'scene' }, sceneSvg(pose, { characters: CHARS, prefix: `r${(uid += 1)}`, ...opts }));
const framesOf = new Map();
const framesFor = id => { if (!framesOf.has(id)) framesOf.set(id, run(boardOf(id))); return framesOf.get(id); };
const poseOf = (id, t, opts = {}) => poseAt(framesFor(id), t, { tags: TAG_POSE, ...opts });
const LABEL = { winch: `${CAST.winch.name} · Winch`, panel: `${CAST.panel.name} · Panel` };

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
  app.append(header('The Supply Room, annotated', 'A rail with seven stops across the top. The Panel runs the locking panel along it and locks it at a stop; the Winch raises and lowers the crate under it. Locked, the crate swings; lowered, it falls where its swing has it.'));
  // The crate hanging over the platform, the panel locked there: the correct position.
  const pose = { ...restPose(), tags: TAG_POSE, panel: { ...restPose().panel, at: FIXTURES.platform.stop, lit: FIXTURES.platform.stop }, crate: { x: stopX(FIXTURES.platform.stop), y: HANG, tilt: 0, hooked: true }, console: { ...restPose().console, near: FIXTURES.platform.stop } };
  const wrap = el('div', { class: 'layout' });
  const art = el('div', { class: 'art' });
  art.append(scene(pose));
  const s = [];
  const r = ([x, y, w, h], cls) => `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  // The stops, under the deck.
  for (let k = 0; k < STOPS; k += 1) s.push(`<line class="stopline" x1="${stopX(k)}" y1="${RAIL.bottom + 6}" x2="${stopX(k)}" y2="${DECK + 8}"/><text class="axis" x="${stopX(k)}" y="${DECK + 52}">${k + 1}</text>`);
  // The zones a lowered crate falls into, and the cut.
  s.push(r(REGIONS.drop.box, 'drop'), r(REGIONS.platform.box, 'goal'), r(REGIONS.intake.box, 'start'), r(REGIONS.cut.box, 'cut'));
  // The swing's reach from the platform stop: the pendulum's arc, wide after a lock (0.9 of a stop) and at its calmest (0.38).
  const arc = a => { const th = Math.asin(Math.min(0.95, (a * STEP) / PENDULUM)); const px = stopX(FIXTURES.platform.stop); return `M${px - PENDULUM * Math.sin(th)} ${CARRIAGE.pivot + PENDULUM * Math.cos(th)} A${PENDULUM} ${PENDULUM} 0 0 0 ${px + PENDULUM * Math.sin(th)} ${CARRIAGE.pivot + PENDULUM * Math.cos(th)}`; };
  s.push(`<path class="swing" d="${arc(SWING.lock)}"/>`, `<path class="swing calm" d="${arc(SWING.least)}"/>`);
  // The sweep along the rail, end to end.
  s.push(`<line class="sweep" x1="${stopX(0)}" y1="${RAIL.top - 30}" x2="${stopX(STOPS - 1)}" y2="${RAIL.top - 30}"/><path class="sweep-head" d="M${stopX(0) - 4} ${RAIL.top - 30} l16 -9 v18 Z M${stopX(STOPS - 1) + 4} ${RAIL.top - 30} l-16 -9 v18 Z"/>`);
  const callouts = [
    [1, [stopX(0) + 50, DECK - 120], 'Intake hatch', 'The crate starts here. Raise lifts it out; the panel starts locked over it.'],
    [2, [stopX(2), RAIL.top - 30], 'The rail and the sweep', 'Seven stops, painted 1 to 7. Released, the panel runs end to end and back, a stop every 0.22 s (PROPOSED).'],
    [3, [stopX(FIXTURES.platform.stop) - 84, CARRIAGE.bottom - 14], 'The locking panel', 'Rides the rail with the hoist on it. LOCK drops its striped blade at the stop it is passing.'],
    [4, [stopX(FIXTURES.console.stop) - 70, DECK - 40], 'Console: the Panel', 'Cleo stands here: RELEASE and LOCK, and a key.'],
    [5, [stopX(FIXTURES.console.stop) - 70, OPERATORS.panel.head - 40], 'Over the console', 'Lowered with its centre in this band, the crate falls on the Panel operator: the drop.'],
    [6, [stopX(FIXTURES.platform.stop) + 30, BOXES.platform[1] - 40], 'Platform: the correct position', 'Lowered with its centre in this band, the crate lands and the jaws close. Then both keys send it down.'],
    [7, [stopX(FIXTURES.cab.stop) - 90, BOXES.cab[1] + 40], 'Cab: the Winch', 'Hana sits here: Raise and Lower, and a key. LOCK at stop 7 drops the blade into the cab: the cut.'],
    [8, [stopX(FIXTURES.platform.stop) + 150, HANG + 4], 'The swing', 'After a lock the crate swings 0.9 of a stop each way, calming to 0.38 but never still, a swing every 1.3 s (PROPOSED).'],
  ];
  for (const [n, [x, y]] of callouts) s.push(`<g class="callout"><circle cx="${x}" cy="${y}" r="17"/><text x="${x}" y="${y + 6}">${n}</text></g>`);
  art.append(el('div', { class: 'overlay' }, `<svg viewBox="0 0 ${BOX[0]} ${BOX[1] + 40}">${s.join('')}</svg>`));
  const legend = el('ol', { class: 'legend' });
  for (const [n, , title, text] of callouts) legend.append(el('li', {}, `<b>${n} · ${title}</b> ${text}`));
  const keys = el('ul', { class: 'keys' }, [
    `<i class="k drop"></i> The drop: the crate lowered over the console (${ZONES.console} of a stop either side, PROPOSED)`,
    '<i class="k cut"></i> The cut: the panel locked at stop 7, over the cab (from half way between 6 and 7)',
    `<i class="k goal"></i> The platform: the correct position (${ZONES.platform} of a stop either side, PROPOSED)`,
    '<i class="k start"></i> The intake: where the crate starts; lowered here it goes back in',
    '<i class="k swing"></i> The swing from the platform stop: just after a lock, and at its calmest',
    '<i class="k route"></i> The sweep: the panel\'s run along the rail',
    'Anywhere else a lowered crate misses: CLUNK, and the Winch raises it again.',
  ].map(t => `<li>${t}</li>`).join(''));
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
    left.append(scene(poseOf(id, key)), el('p', { class: 'time' }, `${i + 1} · ${(key / 1000).toFixed(2)} s`));
    const phones = el('div', { class: 'beat-phones' });
    phones.append(phone(`s=task&board=${id}&t=${key}&as=winch`, { label: LABEL.winch }), phone(`s=task&board=${id}&t=${key}&as=panel`, { label: LABEL.panel }));
    row.append(left, phones, el('p', { class: 'caption' }, text));
    list.append(row);
  });
  if (['cooperation', 'drop', 'standoff', 'disconnect'].includes(id)) {
    const row = el('section', { class: 'beat' });
    const phones = el('div', { class: 'beat-phones wide' });
    phones.append(phone(`s=return&board=${id}&as=winch`, { label: `Back in Room B · ${CAST.winch.name}` }), phone(`s=return&board=${id}&as=panel`, { label: `Back in Room B · ${CAST.panel.name}` }), phone(`s=return&board=${id}&as=other`, { label: 'Another player in Room B' }));
    row.append(el('div', { class: 'beat-art' }, '<p class="time">Return</p>'), phones, el('p', { class: 'caption' }, 'The ordinary return: each participant back at their place before the Task. A participant killed on the Task is shown at their place as Eliminated, not in the Hospital. Nothing names who killed whom. Another player learns only the food count: a delivery shows the new count (the owner).'));
    list.append(row);
  }
  app.append(list);
}

// ── Each participant's states ───────────────────────────────────────────
const G = TIMING.grace;
const STATES = {
  winch: [
    ['cooperation', 2500, 'Briefing'], ['cooperation', B + 300, 'Raise: the next press'], ['cooperation', B + 1300, 'Waiting: Cleo releases'],
    ['cooperation', B + 2200, 'Waiting for the lock'], ['chop', B + 2860, 'Warning: the panel over your cab'], ['cooperation', PLATFORM_AT + 975, 'Hazard: Lower drops it on Cleo'],
    ['cooperation', B + 3000, 'Wait: Lower would miss'], ['cooperation', B + 5250, 'Lower now: over the platform'], ['protection-drop', B + 3850, 'Stopped: the winch brake'],
    ['mistakes', B + 4350, 'Missed: raise it again'], ['cooperation', B + 5800, 'Landed: turn your key'], ['standoff', B + 6600, 'Key turned: waiting'],
    ['chop', B + 4200, 'Killed: out of the match'], ['drop', B + 6000, 'Cleo out: lower it in alone'], ['drop', B + 8300, 'Delivered alone'],
    ['disconnect', B + 2300 + G - 2000, 'Partner offline: the Task goes on'], ['disconnect', B + 2300 + G + 1500, 'Cancelled'], ['timeout', TIMING.deadline + 1500, 'Lost: the time ran out'],
  ],
  panel: [
    ['cooperation', 2500, 'Briefing'], ['cooperation', B + 300, 'Waiting: Hana raises'], ['cooperation', B + 1300, 'RELEASE: the next press'],
    ['cooperation', B + 2200, 'Running: not at 6 yet'], ['cooperation', B + 2650, 'Running: LOCK now, at 6'], ['chop', B + 2860, 'Hazard: LOCK here cuts Hana'],
    ['mistakes', B + 2700, 'Locked over you: release'], ['cooperation', PLATFORM_AT + 975, 'Warning: the crate over you'], ['cooperation', B + 4500, 'Locked: Hana lowers it in'],
    ['protection-cut', B + 3150, "Stopped: the cab's buffer"], ['cooperation', B + 5800, 'Landed: turn your key'], ['standoff', B + 7600, 'Hana out: turn your key alone'],
    ['drop', B + 5000, 'Killed: out of the match'], ['standoff', B + 9100, 'Delivered alone'], ['chop', B + 5200, 'Lost: not over the platform'],
    ['disconnect', B + 2300 + G - 2000, 'Own phone reconnecting'], ['disconnect', B + 2300 + G + 1500, 'Cancelled'], ['mistakes', B + 4350, 'Missed: Hana raises it again'],
  ],
};

function phones(as) {
  app.append(header(`${ROLES[as].name} · ${CAST[as].name}'s phone, every state`, `${ROLES[as].about}. ${as === 'panel' ? 'One big button, RELEASE or LOCK, and the strip of stops it runs along' : 'Raise above Lower, and the meter of where the swing has the crate'}; the next press glows; a press that would kill is striped and says so; nothing asks to confirm.`));
  const grid = el('div', { class: 'grid' });
  for (const [id, t, label] of STATES[as]) grid.append(phone(`s=task&board=${id}&t=${t}&as=${as}`, { label }));
  app.append(grid);
}

function flow() {
  app.append(header('Starting a Task, the other phones, the return and the food warning', 'A Volunteer chooses the Task and asks a Partner, who can join or decline (the owner, 11 November 2026). A refusal passes to the next volunteer; the game picks the controls at random; the two who went cannot go for food the next round (the owner, 12 November 2026). While the two are away, the board shows who is not here. Afterwards everyone is back at their places, and the others learn only the food count.'));
  const grid = el('div', { class: 'grid' });
  for (const [q, label] of [
    ['s=volunteer&step=task', '1 · Volunteer: start a Task'], ['s=volunteer&step=partner', '2 · Volunteer: ask a Partner'], ['s=volunteer&step=asking', '3 · Volunteer: waiting for the answer'],
    ['s=called', '4 · Partner: Join or Decline (15 s PROPOSED)'], ['s=volunteer&step=declined', '5 · Volunteer: declined, the next volunteer goes'], ['s=called&answer=join', '6 · Partner: joined'],
    ['s=volunteer&step=starting', '7 · Volunteer: starting'], ['s=task&board=cooperation&t=2500&as=panel', '8 · Both: briefing'], ['s=away', '9 · Another player: the board shows who is away'],
    ['s=return&board=cooperation&as=winch', '10 · Return after a delivery'], ['s=return&board=cooperation&as=other', '11 · Another player after a delivery: the food count only'], ['s=return&board=chop&as=other', '12 · Another player after a death, nothing delivered: the board only'],
    ['s=stock&n=1', '13 · Food warning: one package (PROPOSED public)'], ['s=volunteer&step=rested', '14 · Next round: the two cannot go for food'],
  ]) grid.append(phone(q, { label }));
  app.append(grid);
}

// ── The crane's parts ───────────────────────────────────────────────────
function machine() {
  app.append(header("The crane's parts and their states", 'Drawn in the crew\'s ink over the room; every press moves something you can see. Amber is focus: a control that asks for a press, where the crate should go, a key turned.'));
  const base = restPose();
  const hanging = (at, extra = {}) => ({ ...base, panel: { ...base.panel, at, lit: at }, crate: { x: stopX(at), y: HANG, tilt: 0, hooked: true }, ...extra });
  const crops = [
    ['The locking panel: running, its blade up', hanging(2.5, { panel: { ...base.panel, at: 2.5, blade: BLADE.up, lit: 3 } }), [200, 30, 440, 280]],
    ['The locking panel: locked, its blade down', hanging(2), [140, 30, 380, 280]],
    ['The cab: its lamp, the panel over it', { ...hanging(6, { panel: { ...base.panel, at: 6, blade: BLADE.up, lit: 6 } }), cab: { ...base.cab, lamp: true } }, [700, 30, 324, 440]],
    ["The cut: the blade in the cab", { ...hanging(6, { panel: { ...base.panel, at: 6, blade: BLADE.cut, lit: 6 } }), cab: { ...base.cab, cut: true }, alive: { winch: false, panel: true } }, [700, 30, 324, 440]],
    ["The cab's roof buffer (stopped)", { ...hanging(6, { panel: { ...base.panel, at: 6, blade: BLADE.caught, lit: 6 } }), cab: { ...base.cab, buffer: 1 } }, [700, 30, 324, 440]],
    ['The console: the lever up, the stop light running', { ...base, panel: { ...base.panel, at: 3.4, blade: BLADE.up, lit: 3 }, console: { ...base.console, locked: false, near: 3 } }, [480, 380, 320, 380]],
    ['The console: its lamp, the swing over the operator', { ...hanging(5), crate: { x: stopX(4.2), y: HANG + 10, tilt: 0.3, hooked: true }, console: { ...base.console, lamp: true, near: 5 }, line: { from: [stopX(4.2), HANG + 66], to: OPERATORS.panel.head, tone: 'console' } }, [440, 200, 420, 560]],
    ['The drop: the crate on the console', { ...hanging(5), crate: { x: stopX(4), y: REST.console, tilt: 0, hooked: true }, slack: 0.35, alive: { winch: true, panel: false } }, [440, 200, 420, 560]],
    ["The winch's brake (stopped)", { ...hanging(5), effects: [{ kind: 'brake', at: [stopX(5), CARRIAGE.pivot + 60] }] }, [620, 60, 300, 420]],
    ['The platform: open, the crate over it', { ...hanging(5), line: { from: [stopX(5), HANG + 58], to: BOXES.platform[1] - 8, tone: 'platform' } }, [600, 200, 340, 560]],
    ['The platform: landed, jaws shut, lamp lit', { ...base, panel: { ...base.panel, at: 5, lit: 5 }, crate: { x: stopX(5), y: REST.platform, tilt: 0, hooked: false }, hookY: 300, platform: { drop: 0, clamp: true, lamp: true } }, [600, 200, 340, 560]],
    ['Sent: the platform going down, +5', { ...base, panel: { ...base.panel, at: 5, lit: 5 }, crate: { x: stopX(5), y: REST.platform + 60, tilt: 0, hooked: false }, hookY: 300, platform: { drop: 0.5, clamp: true, lamp: true }, effects: [{ kind: 'letters', text: '+5', at: [stopX(5), 470], size: 72, angle: -6, fill: '#F1B84B' }] }, [600, 200, 340, 560]],
  ];
  const grid = el('div', { class: 'parts' });
  for (const [label, pose, crop] of crops) {
    const fig = el('figure', { class: 'part' });
    fig.append(scene(pose, { crop }), el('figcaption', {}, label));
    grid.append(fig);
  }
  const keys = el('figure', { class: 'part' });
  keys.append(scene({ ...base, panel: { ...base.panel, at: 5, lit: 5 }, crate: { x: stopX(5), y: REST.platform, tilt: 0, hooked: false }, hookY: 300, platform: { drop: 0, clamp: true, lamp: true }, cab: { ...base.cab, key: true }, console: { ...base.console, key: true, near: 5 } }, { crop: [540, 140, 484, 600] }), el('figcaption', {}, 'The keys: the Winch\'s in the cab, the Panel\'s on the console, both turned, their lamps lit.'));
  grid.append(keys);
  const fx = el('figure', { class: 'part wide' });
  fx.append(scene({ ...base, crate: null, effects: [
    { kind: 'burst', at: [200, 520], r: 70, t: 1 }, { kind: 'letters', text: 'CHOP!', at: [200, 420], size: 56, angle: -10 },
    { kind: 'burst', at: [440, 540], r: 64, t: 1, seed: 170 }, { kind: 'letters', text: 'THUD!', at: [440, 440], size: 54, angle: -8 },
    { kind: 'letters', text: 'CLANK!', at: [660, 470], size: 46, angle: -6 }, { kind: 'letters', text: 'CLUNK', at: [850, 470], size: 40, angle: -6 }, { kind: 'clunk', at: [850, 520], dir: [1, 0], t: 1 },
  ] }, { crop: [40, 330, 980, 300] }), el('figcaption', {}, 'Effects: CHOP! (the cut), THUD! (the drop), CLANK! (a stop), CLUNK (a miss). Lettering is decoration; the phone says the same in words.'));
  grid.append(fx);
  app.append(grid);
}

// ── Motion: each cue's frames, and its Reduce motion form ─────────────
function motion() {
  app.append(header('Motion: each cue and its Reduce motion form', 'Five moments of each cue, then the same moment with Reduce motion. The sweep and the swing are the Task itself, so Reduce motion keeps them and takes away the rest: no lean, no speed lines, no flashing, effects still. Timings are PROPOSED; a new state always replaces a cue still playing.'));
  const cues = [
    ['The sweep: a stop every 220 ms', 'cooperation', B + 1600, [0, 220, 440, 660, 880], [0, 30, 1024, 520], CUES.sweep],
    ['The lock: the blade drops', 'cooperation', PLATFORM_AT, [0, 30, 60, 90, 300], [560, 30, 400, 300], CUES.lock],
    ['The swing: the first 1.3 s after a lock', 'cooperation', PLATFORM_AT, [0, 325, 650, 975, 1300], [420, 60, 520, 640], CUES.swing],
    ['Raise', 'cooperation', B + 600, [0, 110, 225, 340, 450], [0, 30, 420, 720], CUES.raise],
    ['Lower: landing', 'cooperation', PLATFORM_AT + 2600, [0, 100, 200, 300, 460], [560, 120, 400, 620], CUES.lower],
    ['A miss: CLUNK', 'mistakes', B + 3845, [0, 150, 300, 400, 600], [600, 120, 424, 620], CUES.miss],
    ['The cut', 'chop', B + 2920, [0, 40, 80, 120, 600], [600, 30, 424, 460], CUES.cut],
    ['The drop', 'drop', PLATFORM_AT + 975, [0, 60, 120, 180, 700], [380, 200, 520, 560], CUES.drop],
    ["Stopped: the cab's buffer", 'protection-cut', B + 2920, [0, 40, 80, 110, 500], [600, 30, 424, 460], CUES.stopped],
    ["Stopped: the winch's brake", 'protection-drop', PLATFORM_AT + 975, [0, 80, 160, 240, 500], [380, 60, 560, 640], CUES.stopped],
    ['Send', 'cooperation', B + 6800, [0, 275, 550, 825, 1100], [560, 240, 400, 520], CUES.send],
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
  app.append(header('Phones at 320 x 568 with the Largest text', 'The game\'s 200% text on the smallest phone the pack reviews. The view gives way to the words, down to a letterboxed strip; the controls keep their places (Raise above Lower; the Panel\'s one big button); the role row and the meter\'s legend go; cards scroll. Each phone reports its own layout below it.'));
  const grid = el('div', { class: 'grid' });
  for (const [q, label] of [
    ['s=task&board=cooperation&t=2500&as=winch', 'Briefing'], [`s=task&board=cooperation&t=${B + 300}&as=winch`, 'Winch: Raise next'],
    [`s=task&board=cooperation&t=${PLATFORM_AT + 975}&as=winch`, 'Winch: hazard'], [`s=task&board=chop&t=${B + 2860}&as=panel`, 'Panel: hazard'],
    [`s=task&board=cooperation&t=${B + 2650}&as=panel`, 'Panel: LOCK now'], [`s=task&board=cooperation&t=${B + 5800}&as=panel`, 'Panel: landed'],
    [`s=task&board=disconnect&t=${B + 2300 + G - 2000}&as=winch`, 'Winch: Cleo offline'], [`s=task&board=chop&t=${B + 5200}&as=panel`, 'Lost'],
  ]) grid.append(phone(`${q}&text=2`, { width: 320, height: 568, scale: 1, safe: '20,0', label, measured: true }));
  app.append(grid);
}

const SHEETS = { layout, board: () => board(p.id ?? 'cooperation'), phones: () => phones(p.as === 'panel' ? 'panel' : 'winch'), flow, machine, motion, large };
document.body.dataset.sheet = p.sheet ?? 'layout';
(SHEETS[p.sheet] ?? layout)();
Promise.all(pending).then(() => document.fonts.ready).then(() => { window.__designReady = true; });
