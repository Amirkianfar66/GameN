// mothership:dev-only
//
// The Food Supply Task on the participants' phones, and what the other phones show: a design
// proposal on synthetic fixtures, built from the phone pack's own components (its top bar, pills,
// banners, toasts, rows and room views; design/phone-ui/prototype/), so that it reads as part of
// the same interface. Nothing here talks to a server: each address draws one state, taken from a
// storyboard's run through the Task's own rules (./task.mjs, ./boards.mjs) at one moment.
//
//   phone.html?s=task&board=cooperation&t=9233&as=hoist     a participant's Task screen
//   phone.html?s=volunteer&step=task|partner|starting        the Volunteer starts a Task
//   phone.html?s=called                                      the Partner is chosen
//   phone.html?s=away                                        another player's phone meanwhile
//   phone.html?s=return&board=drop&as=hoist|boom|other       after the Task, back in Room B
//   phone.html?s=stock&n=1                                   the food warning (public, PROPOSED)
//   …&safe=47,34  …&text=2  …&motion=reduced                 as the pack's prototype
//   …&live=1                                                 the controls play the storyboard's next press

import { h, ic, topBar, tabs, pill, toast, banner, button, row, list, groupLabel, groupNote, sheet, caption } from '../phone-ui/prototype/ui.mjs';
import { paintRoom, ROOM_NAMES } from '../phone-ui/prototype/art.mjs';
import { board as fixtureBoard, seatOf, FIXTURE_LABEL } from '../phone-ui/prototype/fixtures.mjs';
import { view, roleOf, ROLES, TIMING, FOOD } from './task.mjs';
import { boardOf, CAST } from './boards.mjs';
import { hintFor, person, other } from './hints.mjs';
import { CUES, run, poseAt } from './stage.mjs';
import { sceneSvg } from './scene.mjs';
import { BOXES, TAGS, VIEW } from './layout.mjs';

const app = document.getElementById('app');
const read = () => Object.fromEntries(new URLSearchParams(location.search));

function applyEnvironment(p) {
  document.documentElement.style.fontSize = p.text ? `${Number(p.text) * 100}%` : '';
  document.documentElement.dataset.motion = p.motion === 'reduced' ? 'reduced' : 'normal';
}

const ARROWS = { up: 'M17 4 L30 22 H22 V30 H12 V22 H4 Z', down: 'M17 30 L30 12 H22 V4 H12 V12 H4 Z', left: 'M4 17 L22 4 V12 H30 V22 H22 V30 Z', right: 'M30 17 L12 4 V12 H4 V22 H12 V30 Z' };
const arrow = dir => { const t = document.createElement('template'); t.innerHTML = `<svg class="arrow" viewBox="0 0 34 34" aria-hidden="true"><path d="${ARROWS[dir]}" fill="currentColor" stroke="#0A0D14" stroke-width="2" stroke-linejoin="round"/></svg>`; return t.content.firstChild; };


/** One big control: an arrow and a label; the next press glows; a press that attacks is striped and says so. */
function control(b, v) {
  const partner = person(other(v.role)).name;
  const sub = b.hazard ? (v.role === 'hoist' ? `Drops it on ${partner}` : `Rams ${partner}'s cab`) : b.key ? (b.label === 'Key turned' ? 'Waiting for the other key' : 'Sends the crate up') : null;
  const aria = `${b.label}${b.hazard ? `. Warning: ${sub}.` : ''}`;
  const el = h('button.fs-ctl', {
    type: 'button', 'data-dir': b.dir, 'aria-label': aria, 'aria-disabled': b.enabled ? null : 'true',
    'data-next': b.next ? '' : null, 'data-hazard': b.hazard ? '' : null, 'data-key': b.key && b.label !== 'Key turned' ? '' : null, 'data-turned': b.label === 'Key turned' ? '' : null,
  }, h('span.fs-face', b.key ? ic(b.label === 'Key turned' ? 'check' : 'key', { filled: true }) : arrow(b.dir), h('span.fs-label', b.label, sub ? h('span.fs-sub', sub) : null)));
  return el;
}

/** The participant's Task screen at time t of a storyboard. */
function taskScreen(root, p) {
  const board = boardOf(p.board ?? 'cooperation');
  const frames = run(board);
  const t = Number(p.t ?? TIMING.briefing + 200);
  const now = [...frames].reverse().find(f => f.at <= t) ?? frames[0];
  const role = p.as === 'boom' ? 'boom' : 'hoist';
  const seat = CAST[role].seat;
  const v = view(now.state, seat, t);
  const recent = frames.filter(f => f.at <= t && t - f.at < 1500).flatMap(f => f.events);
  const reduced = p.motion === 'reduced';
  const you = person(role), them = person(other(role));
  const pose = poseAt(frames, t, { reduced });
  root.append(topBar({ kind: 'pair', pair: [you, them], sub: `Food Supply · you run the ${ROLES[role].name}`, seconds: v.phase === 'ended' ? null : v.secondsLeft, urgentAt: 10, menu: {} }));
  const top = root.querySelector('.tb').offsetHeight;
  // The view's own height at the phone's width; it gives way to the panel when the words need the room (phone.css).
  const viewH = Math.round(root.clientWidth * VIEW[3] / VIEW[2]);
  const art = h('div.fs-art', { html: sceneSvg(pose, { characters: { hoist: CAST.hoist.character, boom: CAST.boom.character }, prefix: 'ph', crop: VIEW }) });
  const viewEl = h('div.fs-view', { role: 'img', 'aria-label': describe(v, now.state), style: { flexBasis: `${viewH}px` }, 'data-dim': pose.dim > 0.5 ? '' : null }, art);
  // The operators' name tags, the pack's own (.tag), over the view: readable at any scale.
  for (const r of ['hoist', 'boom']) {
    const who = person(r);
    const [tx, ty] = TAGS[r];
    const down = !now.state.alive[r];
    // The Hoist's tag starts at the cab's left edge, so a longer tag ("· Out") grows into the room, not off the screen.
    const x = r === 'hoist' ? BOXES.cab[0] + 6 : tx;
    art.append(h('span.tag', { 'data-self': r === role ? '' : null, 'data-anchor': r === 'hoist' ? 'start' : null, style: { left: `${((x - VIEW[0]) / VIEW[2]) * 100}%`, top: `min(${((ty - 14 - VIEW[1]) / VIEW[3]) * 100}%, calc(100% - 30px))` } },
      h('b.num', String(who.seat)), h('span', r === role ? 'You' : who.name), down ? h('span.status', '· Out') : null));
  }
  const hint = hintFor(v, recent);
  const controls = h('div.fs-controls', { 'data-axis': ROLES[role].axis, role: 'group', 'aria-label': `${ROLES[role].name} controls` }, v.buttons.map(b => control(b, v)));
  const panel = h('section.fs-panel', { 'aria-label': 'Your controls' },
    h('div.fs-role', pill(`${ROLES[role].name} · ${ROLES[role].axis === 'vertical' ? 'up and down' : 'left and right'}`, { icon: 'move', tone: 'accent' }),
      h('span.fs-who', { 'data-state': v.partner }, h('b', `${them.seat} ${them.name}`), ` · ${ROLES[other(role)].name}${v.partner === 'down' ? ' · Out' : v.partner === 'offline' ? ' · Offline' : ''}`)),
    h('p.fs-hint', { 'data-tone': hint.tone, role: 'status', 'aria-live': 'polite' }, ic(hint.icon, { filled: true }), h('span', hint.text)),
    controls);
  root.append(h('div.fs-screen', { style: { top: `${top}px` } }, viewEl, panel));
  // Cards: the briefing, the victim's end, the outcome. After a kill, a card waits for the impact to play
  // (CUES.impact), so both participants see the cause before the card covers the view.
  const kill = frames.find(f => f.at <= t && f.events.some(e => e.type === 'KILLED'));
  const settled = !kill || t - kill.at >= CUES.impact.ms;
  if (v.phase === 'briefing') root.append(briefingCard(role, v, top));
  else if (v.you === 'down' && settled) root.append(outcomeCard({ title: 'You are out', stamp: 'Eliminated', body: [h('p', 'You were killed in the Supply Room. Not the Hospital: you are out of the match.'), h('p', `You return to ${ROOM_NAMES[CAST[role].from.room]} as you fell.`)] }, top + 24));
  else if (v.phase === 'ended' && settled) root.append(endCard(v, role, top));
  const stop = recent.find(e => e.type === 'STOPPED');
  if (stop) root.append(h('div.fs-banner', { style: { top: `${top + 12}px` } }, toast(stop.kind === 'ram' ? 'Stopped · the spring buffer held' : 'Stopped · the safety catch held', 'block')));
  if (now.state.online[role] === false) root.append(h('div.fs-banner', { style: { top: `${top + 12}px` } }, banner({ icon: 'offline', title: 'Reconnecting…', sub: 'The Task goes on without your presses.' })));
  wireControls(controls, p);
  window.__fsLayout = measure(root, { viewEl, panel, controls });
}

/** What the layout did at this size: the view's height, whether every control is whole on screen, whether a word is cut. */
function measure(root, { viewEl, panel, controls }) {
  const box = root.getBoundingClientRect();
  const problems = [];
  for (const b of controls.querySelectorAll('.fs-ctl')) {
    const r = b.getBoundingClientRect();
    if (r.top < panel.getBoundingClientRect().top - 0.5 || r.bottom > box.bottom + 0.5 || r.left < box.left - 0.5 || r.right > box.right + 0.5) problems.push(`control ${b.dataset.dir} is not whole on screen`);
    for (const t of b.querySelectorAll('.fs-label, .fs-sub')) if (t.scrollWidth > t.clientWidth + 1) problems.push(`control ${b.dataset.dir}: a word is cut`);
  }
  const hint = panel.querySelector('.fs-hint');
  const scrolls = hint.scrollHeight > hint.clientHeight + 1;
  for (const c of root.querySelectorAll('.fs-card')) {
    if (c.getBoundingClientRect().bottom > box.bottom + 0.5) problems.push('a card runs off the screen');
    if (c.scrollHeight > c.clientHeight + 1) c.dataset.scrolls = '';
  }
  for (const t of root.querySelectorAll('.fs-art .tag')) {
    const r = t.getBoundingClientRect(), v = viewEl.getBoundingClientRect();
    if (r.left < v.left - 0.5 || r.right > v.right + 0.5 || r.bottom > v.bottom + 0.5) problems.push(`the tag "${t.textContent}" leaves the view`);
  }
  return { view: Math.round(viewEl.getBoundingClientRect().height), hintScrolls: scrolls, problems };
}

/** A text equivalent of the Task view, for screen readers. */
function describe(v, s) {
  const where = s.docked ? 'The crate is docked in the cradle.' : `The crate is in column ${s.crate[0] + 1} of 7, at height ${s.crate[1]} of 3; the gantry is at column ${s.carriage + 1}.`;
  return `The Supply Room. ${where} ${v.warnings.length ? 'Warning shown.' : ''}`.trim();
}

function briefingCard(role, v, top) {
  const you = person(role), them = person(other(role));
  return h('section.fs-card', { role: 'dialog', 'aria-label': 'Food Supply Task', style: { top: `${top + 16}px`, maxHeight: `calc(100% - ${top + 28}px)` } },
    h('h2', 'Food Supply Task'),
    h('p', 'Bring the ration crate up to the galley: ', h('b', `+${FOOD.perDelivery} packages`), '.'),
    h('div.fs-roles',
      h('div', { 'data-you': role === 'hoist' ? '' : null }, h('b', role === 'hoist' ? 'You' : `${them.seat} ${them.name}`), 'Hoist · up and down, from the cab'),
      h('div', { 'data-you': role === 'boom' ? '' : null }, h('b', role === 'boom' ? 'You' : `${them.seat} ${them.name}`), 'Boom · left and right, from the pulpit')),
    h('ul',
      h('li', ic('move', { filled: true }), h('span', 'Lift it out, drive it across, lower it into the cradle, then both turn a key.')),
      h('li', ic('warning', { filled: true }), h('span', 'The crate passes over the Boom; the gantry can reach the Hoist\'s cab. Watch the stripes.')),
      h('li', ic('info', { filled: true }), h('span', 'Press, or hold to repeat. Arrow keys work too.'))),
    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px' } }, h('span.fs-count', String(v.briefingLeft)), h('p', 'Starting')));
}

function outcomeCard({ title, stamp, tone = null, body }, top) {
  return h('section.fs-card', { role: 'alertdialog', 'aria-label': title, style: { top: `${top}px`, maxHeight: `calc(100% - ${top + 12}px)` } },
    stamp ? h('span.stamp.fs-stamp', { 'data-tone': tone }, stamp) : null, h('h2', title), body);
}

function endCard(v, role, top) {
  const o = v.outcome;
  const back = h('p', `Returning to ${ROOM_NAMES[CAST[role].from.room]}…`);
  if (o.result === 'delivered') return outcomeCard({ title: 'Delivered', stamp: `+${o.packages} packages`, tone: 'accent', body: [h('p', 'The crate went up to the galley. The ship\'s food stock rises by five.'), back] }, top + 24);
  if (o.result === 'cancelled') return outcomeCard({ title: 'Task cancelled', stamp: 'Cancelled', body: [h('p', o.who === role ? 'You lost your connection. Nothing was delivered.' : `${person(other(role)).name} lost their connection. Nothing was delivered.`), back] }, top + 24);
  return outcomeCard({ title: 'Task lost', stamp: 'Lost', body: [h('p', o.why === 'time' ? 'The time ran out before the crate reached the galley.' : 'The crate never reached the cradle.'), back] }, top + 24);
}

/** Live mode: a press plays the storyboard on to its next frame (a fixture: nothing is sent). */
function wireControls(controls, p) {
  if (!p.live) return;
  const go = () => { const b = boardOf(p.board ?? 'cooperation'); const next = run(b).find(f => f.at > Number(p.t ?? 0) + 1); if (next) location.search = `?${new URLSearchParams({ ...p, t: String(next.at + TIMING.step + 20) })}`; };
  controls.addEventListener('click', go);
  addEventListener('keydown', e => { if (e.key.startsWith('Arrow')) go(); });
}

// ── Outside the Task space ──────────────────────────────────────────────

function roomView(root, { room = 'room-b', seats, self, top: bar, tabsCfg = { hero: 'pass-off' } }) {
  root.append(bar);
  root.append(tabs({ view: 'room', ...tabsCfg }));
  const top = root.querySelector('.tb').offsetHeight, bottom = root.querySelector('.tabs').offsetHeight;
  const host = h('div', { style: { position: 'absolute', left: '0', top: `${top}px`, overflow: 'hidden' } });
  root.prepend(h('div.scene', { 'aria-label': 'Your room' }, host));
  paintRoom(host, { room, roster: 9, seats, self, width: root.clientWidth, height: root.clientHeight - top - bottom, cap: 46, pad: 8, fit: 'phone', ambient: true });
  root.append(h('div.room-label', { style: { top: `${top + 10}px` } }, caption(ROOM_NAMES[room])));
  return { top, bottom };
}

const phaseBar = (title, sub, seconds = null) => topBar({ kind: 'phase', icon: 'supply', title, sub, seconds, round: 3, menu: {} });

function volunteer(root, p) {
  const step = p.step ?? 'task';
  const seats = fixtureBoard({ roster: 9 });
  roomView(root, { seats, self: CAST.hoist.seat, top: phaseBar('Tasks', 'Outside the turn order'), tabsCfg: { open: 'actions', hero: 'pass-off' } });
  if (step === 'task') {
    root.append(...sheet({ title: 'Start a Task', sub: 'With a Partner you choose. Outside the turn order.', detent: 'auto', body: [
      list(
        row({ icon: 'supply', title: 'Food Supply', sub: `Bring a ration crate up to the galley: +${FOOD.perDelivery} packages`, chevron: true, go: 's=volunteer&step=partner' }),
        row({ icon: 'panel', title: 'Engine', sub: 'Its own Task, designed separately', disabled: true })),
      groupNote('You can start one Task this match, Food or Engine. Joining someone else\'s Task as their Partner does not use yours.'),
    ] }));
  } else if (step === 'partner') {
    const choices = seats.filter(s => s.seat !== CAST.hoist.seat);
    root.append(...sheet({ title: 'Choose your Partner', sub: 'Food Supply Task', back: 's=volunteer&step=task', detent: 'large', body: [
      groupLabel('Players'),
      list(...choices.map(s => row({ lead: h('b.num', String(s.seat)), title: s.name, sub: s.location === 'Hospital' || s.location === 'Jail' ? 'Not available now' : s.location, disabled: s.location === 'Hospital' || s.location === 'Jail', trail: s.seat === CAST.boom.seat ? ic('check', { filled: true }) : null }))),
      groupNote('Who can be a Partner comes from the game (PROPOSED: a living player outside the Hospital and the Jail, not already on a Task). The game assigns the controls.'),
    ], foot: button(`Start with ${seatOf(CAST.boom.seat).name}`, { icon: 'supply', block: true, go: 's=volunteer&step=starting' }) }));
  } else {
    root.append(...sheet({ title: 'Starting the Food Supply Task', sub: `With ${seatOf(CAST.boom.seat).name}`, close: false, body: [h('p.group-note', 'Going to the Supply Room…')], foot: button('Starting…', { busy: true, block: true, disabled: true }) }));
  }
}

function called(root) {
  const seats = fixtureBoard({ roster: 9 });
  const { top } = roomView(root, { seats, self: CAST.boom.seat, top: phaseBar('Tasks', 'Outside the turn order') });
  root.append(h('section.fs-card', { role: 'alertdialog', 'aria-label': 'Chosen for a Task', style: { top: `${top + 60}px` } },
    h('span.stamp.fs-stamp', { 'data-tone': 'accent' }, 'Partner'),
    h('h2', `${seatOf(CAST.hoist.seat).name} chose you for the Food Supply Task`),
    h('p', 'You are going to the Supply Room. Your place in Room B is kept for your return.'),
    h('p', h('b', 'Briefing in a moment.'))));
}

function away(root) {
  const seats = fixtureBoard({ roster: 9 }).filter(s => s.seat !== CAST.hoist.seat && s.seat !== CAST.boom.seat);
  const self = 6;
  const { top } = roomView(root, { seats, self, top: phaseBar('Tasks', 'Outside the turn order') });
  root.append(h('div.fs-banner', { style: { top: `${top + 44}px` } }, banner({ icon: 'supply', title: `${seatOf(CAST.hoist.seat).name} and ${seatOf(CAST.boom.seat).name} are on the Food Supply Task`, sub: 'PROPOSED public: who is away. The Task itself shows on their phones only.' })));
}

function returned(root, p) {
  const board = boardOf(p.board ?? 'cooperation');
  const frames = run(board);
  const end = frames[frames.length - 1].state;
  const health = {};
  for (const role of ['hoist', 'boom']) if (!end.alive[role]) health[CAST[role].seat] = 'Eliminated';
  const seats = fixtureBoard({ roster: 9, health });
  const as = p.as ?? 'hoist';
  const self = as === 'other' ? 6 : CAST[as].seat;
  const { top } = roomView(root, { seats, self, top: topBar({ kind: 'phase', icon: 'hourglass', title: 'Round 3', sub: 'Back in Room B', round: 3, menu: {} }) });
  const o = end.outcome;
  const text = as === 'other'
    ? (o.result === 'delivered' ? `The Food Supply Task delivered: +${o.packages} packages.` : 'The Food Supply Task is over. Nothing was delivered.')
    : (!end.alive[as] ? 'You are out: you were killed on the Task.' : o.result === 'delivered' ? `Back in Room B. Delivered: +${o.packages} packages.` : o.result === 'cancelled' ? 'Back in Room B. The Task was cancelled.' : 'Back in Room B. The Task was lost.');
  root.append(h('div.fs-banner', { style: { top: `${top + 44}px` } }, toast(text, o.result === 'delivered' ? 'check' : 'info')));
}

function stock(root, p) {
  const n = Number(p.n ?? 1);
  const seats = fixtureBoard({ roster: 9 });
  const { top } = roomView(root, { seats, self: 4, room: 'room-a', top: topBar({ kind: 'turn', who: seatOf(7), round: 3, seconds: 42, menu: {} }) });
  root.append(h('div.fs-banner', { style: { top: `${top + 44}px` } }, banner({ icon: 'warning', title: n === 1 ? 'Food low: 1 package left' : `Food: ${n} packages`, sub: 'PROPOSED public warning. A Food Supply Task adds five.' })));
}

const SCREENS = { task: taskScreen, volunteer, called, away, return: returned, stock };

export function render(p) {
  applyEnvironment(p);
  const root = h('div.ph', { 'data-screen': `food-${p.s}`, 'data-motion': p.motion === 'reduced' ? 'reduced' : null });
  if (p.safe) {
    const [t, b] = p.safe.split(',').map(Number);
    root.style.setProperty('--safe-t', `${t}px`); root.style.setProperty('--safe-b', `${b}px`); root.dataset.safeB = String(b);
  }
  app.replaceChildren(root);
  (SCREENS[p.s] ?? taskScreen)(root, p);
  if (p.safe && p.chrome !== '0') {
    root.append(h('div.ph-status', { 'aria-hidden': 'true' }, h('span', '9:41'), h('i')));
    if (Number(p.safe.split(',')[1]) > 0) root.append(h('div.ph-home', { 'aria-hidden': 'true' }));
  }
  root.append(h('span.fs-label-fixture', FIXTURE_LABEL));
  document.title = `Food Supply · ${p.s ?? 'task'}`;
  window.__phoneReady = true;
}

render(read());
