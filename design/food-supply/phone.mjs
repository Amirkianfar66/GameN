// mothership:dev-only
//
// The Food Supply Task on the participants' phones, and what the other phones show: a design
// proposal on synthetic fixtures, built from the phone pack's own components (its top bar, pills,
// banners, toasts, rows and room views; design/phone-ui/prototype/), so that it reads as part of
// the same interface. Nothing here talks to a server: each address draws one state, taken from a
// storyboard's run through the Task's own rules (./task.mjs, ./boards.mjs) at one moment.
//
//   phone.html?s=task&board=cooperation&t=9233&as=winch     a participant's Task screen (winch or panel)
//   phone.html?s=volunteer&step=task|partner|asking|declined|starting   the Volunteer starts a Task
//   phone.html?s=volunteer&step=rested                      the next round: the two cannot go for food
//   phone.html?s=called                                      the Partner is chosen
//   phone.html?s=away                                        another player's phone meanwhile
//   phone.html?s=return&board=drop&as=winch|panel|other      after the Task, back in Room B
//   phone.html?s=stock&n=1                                   the food warning (public, PROPOSED)
//   …&safe=47,34  …&text=2  …&motion=reduced                 as the pack's prototype
//   …&live=1                                                 the controls play the storyboard's next press

import { h, ic, topBar, tabs, pill, toast, banner, button, row, list, groupLabel, groupNote, sheet, caption } from '../phone-ui/prototype/ui.mjs';
import { paintRoom, ROOM_NAMES } from '../phone-ui/prototype/art.mjs';
import { board as fixtureBoard, seatOf, FIXTURE_LABEL } from '../phone-ui/prototype/fixtures.mjs';
import { view, tick, ROLES, TIMING, FOOD, FIXTURES, STOPS, ZONES } from './task.mjs';
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

const ARROWS = { raise: 'M17 4 L30 22 H22 V30 H12 V22 H4 Z', lower: 'M17 30 L30 12 H22 V4 H12 V12 H4 Z' };
const arrow = act => { const t = document.createElement('template'); t.innerHTML = `<svg class="arrow" viewBox="0 0 34 34" aria-hidden="true"><path d="${ARROWS[act]}" fill="currentColor" stroke="#0A0D14" stroke-width="2" stroke-linejoin="round"/></svg>`; return t.content.firstChild; };

/** What a button would do now, in words: under its label, and in its accessible name. */
function subOf(b, v) {
  const partner = person(other(v.role)).name;
  if (v.phase === 'briefing') return 'After the briefing';
  if (v.phase === 'ended') return 'The Task is over';
  if (v.you === 'down') return 'You are out';
  if (!b.enabled && v.offline) return 'Reconnecting…';
  if (b.act === 'key') return b.turned ? 'Waiting for the other key' : 'Sends the crate down';
  if (b.act === 'release') return b.enabled ? 'Starts the panel running' : (v.crate.state === 'hanging' ? 'Wait: the crate is rising' : `${partner} raises it first`);
  if (b.act === 'lock') return b.hazard ? `Here it cuts ${partner}` : b.stop === FIXTURES.platform.stop ? 'Stops it at 6: the platform' : b.stop === FIXTURES.console.stop ? 'Stops it over you' : `Stops it at ${b.stop + 1}`;
  if (b.act === 'raise') return b.enabled ? 'Lifts the crate' : v.crate.state === 'hanging' ? 'It is up' : 'Wait for the lock';
  if (!b.enabled) return v.crate.state === 'hanging' ? (v.panel.locked ? 'Wait: it is rising' : 'Wait for the lock') : 'Raise it first';
  return { platform: 'Onto the platform', console: `Falls on ${partner}`, deck: 'Misses: wait', intake: 'Back into the hatch' }[b.zone];
}

/** One big control: its icon, its label and what it would do now; the next press glows; a press that would kill is striped and says so. */
function control(b, v) {
  const sub = subOf(b, v);
  const label = b.label;
  const aria = `${label}. ${b.hazard ? `Warning: ${sub}` : sub}.`;
  const icon = b.act === 'key' ? ic(b.turned ? 'check' : 'key', { filled: true }) : b.act === 'lock' || b.act === 'release' ? ic(b.act === 'lock' ? 'lock' : 'release', { filled: true }) : arrow(b.act);
  return h('button.fs-ctl', {
    type: 'button', 'data-act': b.act, 'aria-label': aria, 'aria-disabled': b.enabled ? null : 'true',
    'data-next': b.next ? '' : null, 'data-hazard': b.hazard ? '' : null, 'data-key': b.act === 'key' && !b.turned ? '' : null, 'data-turned': b.turned ? '' : null,
    'data-zone': b.act === 'lower' && b.enabled ? b.zone : null,
  }, h('span.fs-face', icon, h('span.fs-label', label, h('span.fs-sub', sub))));
}

/** The Panel's strip: the seven stops, the platform's in amber, the cab's striped, yours marked, and where the panel is now. */
function sweepStrip(v) {
  const cells = Array.from({ length: STOPS }, (_, s) => h('span', {
    'data-goal': s === FIXTURES.platform.stop ? '' : null, 'data-cut': s === FIXTURES.cab.stop ? '' : null,
    'data-you': s === FIXTURES.console.stop ? '' : null, 'data-at': v.panel.locked && v.panel.stop === s ? '' : null,
  }, s === FIXTURES.console.stop ? ic('self', { filled: true }) : h('b', String(s + 1))));
  return h('div.fs-strip', { 'aria-hidden': 'true', 'data-locked': v.panel.locked ? '' : null },
    ...cells, h('i.fs-marker', { style: { left: `${((v.panel.at + 0.5) / STOPS) * 100}%` } }));
}

/** The Winch's meter: the crate's place along the rail from stop 4 to stop 7, the console's danger striped, the platform's band in amber. */
function swingMeter(v) {
  const lo = 3.2, hi = 6.2, f = x => Math.max(0, Math.min(1, (x - lo) / (hi - lo))) * 100;
  const band = (centre, half) => ({ left: `${f(centre - half)}%`, width: `${f(centre + half) - f(centre - half)}%` });
  const x = v.crate.x;
  return h('div.fs-meter-wrap', { 'aria-hidden': 'true' },
    h('div.fs-meter', { 'data-live': v.crate.state === 'hanging' && v.panel.locked ? '' : null },
      h('span.fs-zone', { 'data-zone': 'console', style: band(FIXTURES.console.stop, ZONES.console) }),
      h('span.fs-zone', { 'data-zone': 'platform', style: band(FIXTURES.platform.stop, ZONES.platform) }),
      h('i.fs-crate', { style: { left: `${f(x)}%` }, 'data-out': x < lo || x > hi ? '' : null })),
    h('p.fs-legend', h('span', { 'data-zone': 'console' }), `Over ${person('panel').name}`, h('span', { 'data-zone': 'platform' }), 'Over the platform'));
}

/** The participant's Task screen at time t of a storyboard. */
function taskScreen(root, p) {
  const board = boardOf(p.board ?? 'cooperation');
  const frames = run(board);
  const t = Number(p.t ?? TIMING.briefing + 200);
  const now = [...frames].reverse().find(f => f.at <= t) ?? frames[0];
  const role = p.as === 'panel' ? 'panel' : 'winch';
  const seat = CAST[role].seat;
  // The state at t: the clock moves on from the last press (the briefing ends, the time runs down).
  const state = tick(now.state, t).state;
  const v = { ...view(state, seat, t), offline: state.online[role] === false };
  const recent = frames.filter(f => f.at <= t && t - f.at < 1500).flatMap(f => f.events);
  const reduced = p.motion === 'reduced';
  const you = person(role), them = person(other(role));
  const pose = poseAt(frames, t, { reduced });
  root.append(topBar({ kind: 'pair', pair: [you, them], sub: `Food Supply · you run the ${ROLES[role].name}`, seconds: v.phase === 'ended' ? null : v.secondsLeft, urgentAt: 10, menu: {} }));
  const top = root.querySelector('.tb').offsetHeight;
  // The view's own height at the phone's width; it gives way to the panel when the words need the room (phone.css).
  const viewH = Math.round(root.clientWidth * VIEW[3] / VIEW[2]);
  const art = h('div.fs-art', { html: sceneSvg(pose, { characters: { winch: CAST.winch.character, panel: CAST.panel.character }, prefix: 'ph', crop: VIEW }) });
  const viewEl = h('div.fs-view', { role: 'img', 'aria-label': describe(v), style: { flexBasis: `${viewH}px` }, 'data-dim': pose.dim > 0.5 ? '' : null }, art);
  // The operators' name tags, the pack's own (.tag), over the view: readable at any scale.
  for (const r of ['winch', 'panel']) {
    const who = person(r);
    const [tx, ty] = TAGS[r];
    const down = !state.alive[r];
    // The Winch's tag ends at the cab's right edge, so a longer tag ("· Out") grows into the room, not off the screen.
    const x = r === 'winch' ? BOXES.cab[0] + BOXES.cab[2] - 6 : tx;
    art.append(h('span.tag', { 'data-self': r === role ? '' : null, 'data-anchor': r === 'winch' ? 'end' : null, style: { left: `${((x - VIEW[0]) / VIEW[2]) * 100}%`, top: `min(${((ty - 14 - VIEW[1]) / VIEW[3]) * 100}%, calc(100% - 30px))` } },
      h('b.num', String(who.seat)), h('span', r === role ? 'You' : who.name), down ? h('span.status', '· Out') : null));
  }
  const hint = hintFor(v, recent);
  const controls = h('div.fs-controls', { 'data-role': role, 'data-landed': v.crate.state === 'landed' ? '' : null, role: 'group', 'aria-label': `${ROLES[role].name} controls` }, v.buttons.map(b => control(b, v)));
  const panel = h('section.fs-panel', { 'aria-label': 'Your controls' },
    h('div.fs-role', pill(`${ROLES[role].name} · ${ROLES[role].axis === 'vertical' ? 'up and down' : 'left and right'}`, { icon: role === 'panel' ? 'lock' : 'move', tone: 'accent' }),
      h('span.fs-who', { 'data-state': v.partner }, h('b', `${them.seat} ${them.name}`), ` · ${ROLES[other(role)].name}${v.partner === 'down' ? ' · Out' : v.partner === 'offline' ? ' · Offline' : ''}`)),
    h('p.fs-hint', { 'data-tone': hint.tone, role: 'status', 'aria-live': 'polite' }, ic(hint.icon, { filled: true }), h('span', hint.text)),
    h('div.fs-dock', v.crate.state === 'landed' || v.phase === 'ended' ? null : role === 'panel' ? sweepStrip(v) : swingMeter(v), controls));
  root.append(h('div.fs-screen', { style: { top: `${top}px` } }, viewEl, panel));
  // Cards: the briefing, the victim's end, the outcome. After a kill, a card waits for the impact to play
  // (CUES.impact), so both participants see the cause before the card covers the view.
  const kill = frames.find(f => f.at <= t && f.events.some(e => e.type === 'KILLED'));
  const settled = !kill || t - kill.at >= CUES.impact.ms;
  if (v.phase === 'briefing') root.append(briefingCard(role, v, top));
  const killed = kill?.events.find(e => e.type === 'KILLED');
  const how = killed?.kind === 'cut' ? "The panel's blade came down into your cab." : 'The crate fell on you.';
  if (v.you === 'down' && settled) root.append(outcomeCard({ title: 'You are out', stamp: 'Eliminated', body: [h('p', `${how} Not the Hospital: you are out of the match.`), h('p', `You return to ${ROOM_NAMES[CAST[role].from.room]} as you fell.`)] }, top + 24));
  else if (v.phase === 'ended' && settled) root.append(endCard(v, role, top));
  const stop = recent.find(e => e.type === 'STOPPED');
  if (stop && v.phase === 'running') root.append(h('div.fs-banner', { style: { top: `${top + 12}px` } }, toast(stop.kind === 'cut' ? "Stopped · the cab's buffer held" : 'Stopped · the winch brake held', 'block')));
  if (state.online[role] === false) root.append(h('div.fs-banner', { style: { top: `${top + 12}px` } }, banner({ icon: 'offline', title: 'Reconnecting…', sub: 'The Task goes on without your presses.' })));
  wireControls(controls, p);
  window.__fsLayout = measure(root, { viewEl, panel, controls });
}

/** What the layout did at this size: the view's height, whether every control is whole on screen, whether a word is cut. */
function measure(root, { viewEl, panel, controls }) {
  const box = root.getBoundingClientRect();
  const problems = [];
  for (const b of controls.querySelectorAll('.fs-ctl')) {
    const r = b.getBoundingClientRect();
    if (r.top < panel.getBoundingClientRect().top - 0.5 || r.bottom > box.bottom + 0.5 || r.left < box.left - 0.5 || r.right > box.right + 0.5) problems.push(`control ${b.dataset.act} is not whole on screen`);
    for (const t of b.querySelectorAll('.fs-label, .fs-sub')) if (t.scrollWidth > t.clientWidth + 1) problems.push(`control ${b.dataset.act}: a word is cut`);
  }
  for (const s of panel.querySelectorAll('.fs-strip span, .fs-legend')) if (s.scrollWidth > s.clientWidth + 1) problems.push('the strip or the legend: a word is cut');
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
function describe(v) {
  const panel = v.panel.locked ? `The panel is locked at stop ${v.panel.stop + 1}.` : `The panel is running, now at stop ${v.panel.stop + 1}.`;
  const at = Math.round(v.crate.x) + 1;
  const crate = { intake: 'The crate is in the intake.', deck: `The crate is on the deck by stop ${at}.`, fallen: 'The crate is on the console.', landed: 'The crate is on the platform.', sent: 'The crate has gone down.' }[v.crate.state]
    ?? (v.panel.locked ? `The crate hangs swinging, now over stop ${at}.` : 'The crate hangs under the panel.');
  return `The Supply Room. ${panel} ${crate}${v.warnings.length ? ' Warning shown.' : ''}`;
}

function briefingCard(role, v, top) {
  const them = person(other(role));
  return h('section.fs-card', { role: 'dialog', 'aria-label': 'Food Supply Task', style: { top: `${top + 16}px`, maxHeight: `calc(100% - ${top + 28}px)` } },
    h('h2', 'Food Supply Task'),
    h('p', 'Lower the ration crate onto the galley lift: ', h('b', `+${FOOD.perDelivery} packages`), '.'),
    h('div.fs-roles',
      h('div', { 'data-you': role === 'winch' ? '' : null }, h('b', role === 'winch' ? 'You' : `${them.seat} ${them.name}`), 'Winch · up and down, from the cab at 7'),
      h('div', { 'data-you': role === 'panel' ? '' : null }, h('b', role === 'panel' ? 'You' : `${them.seat} ${them.name}`), 'Panel · left and right, from the console at 5')),
    h('ul',
      h('li', ic('move', { filled: true }), h('span', 'Raise it, release the panel, lock it over 6, lower it as it swings over 6, then both turn a key.')),
      h('li', ic('warning', { filled: true }), h('span', 'LOCK at 7 cuts the Winch\'s cab. Lowered while it swings over the console, it falls on the Panel. Watch the stripes.')),
      h('li', ic('info', { filled: true }), h('span', 'A mistake can kill: nothing tells it from a betrayal.'))),
    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px' } }, h('span.fs-count', String(v.briefingLeft)), h('p', 'Starting')));
}

function outcomeCard({ title, stamp, tone = null, body }, top) {
  return h('section.fs-card', { role: 'alertdialog', 'aria-label': title, style: { top: `${top}px`, maxHeight: `calc(100% - ${top + 12}px)` } },
    stamp ? h('span.stamp.fs-stamp', { 'data-tone': tone }, stamp) : null, h('h2', title), body);
}

function endCard(v, role, top) {
  const o = v.outcome;
  const back = h('p', `Returning to ${ROOM_NAMES[CAST[role].from.room]}…`);
  if (o.result === 'delivered') return outcomeCard({ title: 'Delivered', stamp: `+${o.packages} packages`, tone: 'accent', body: [h('p', 'The crate went down to the galley. The ship\'s food stock rises by five.'), back] }, top + 24);
  if (o.result === 'cancelled') return outcomeCard({ title: 'Task cancelled', stamp: 'Cancelled', body: [h('p', o.who === role ? 'You lost your connection. Nothing was delivered.' : `${person(other(role)).name} lost their connection. Nothing was delivered.`), back] }, top + 24);
  const lost = o.why === 'time' ? 'The time ran out before the crate went down.' : 'The crate was not over the platform.';
  return outcomeCard({ title: 'Task lost', stamp: 'Lost', body: [h('p', lost), back] }, top + 24);
}

/** Live mode: a press plays the storyboard on to its next frame (a fixture: nothing is sent). */
function wireControls(controls, p) {
  if (!p.live) return;
  const go = () => { const b = boardOf(p.board ?? 'cooperation'); const next = run(b).find(f => f.at > Number(p.t ?? 0) + 1); if (next) location.search = `?${new URLSearchParams({ ...p, t: String(next.at + 120) })}`; };
  controls.addEventListener('click', go);
  addEventListener('keydown', e => { if (e.key.startsWith('Arrow') || e.key === ' ') go(); });
}

// ── Outside the Task space ──────────────────────────────────────────────

function roomView(root, { room = 'room-b', seats, self, top: bar, tabsCfg = { hero: 'pass-off' }, label = true }) {
  root.append(bar);
  root.append(tabs({ view: 'room', ...tabsCfg }));
  const top = root.querySelector('.tb').offsetHeight, bottom = root.querySelector('.tabs').offsetHeight;
  const host = h('div', { style: { position: 'absolute', left: '0', top: `${top}px`, overflow: 'hidden' } });
  root.prepend(h('div.scene', { 'aria-label': 'Your room' }, host));
  paintRoom(host, { room, roster: 9, seats, self, width: root.clientWidth, height: root.clientHeight - top - bottom, cap: 46, pad: 8, fit: 'phone', ambient: true });
  // The room's label is left out under a tall sheet, which would otherwise sit beneath it.
  if (label) root.append(h('div.room-label', { style: { top: `${top + 10}px` } }, caption(ROOM_NAMES[room])));
  return { top, bottom };
}

const phaseBar = (title, sub, seconds = null, round = 3) => topBar({ kind: 'phase', icon: 'supply', title, sub, seconds, round, menu: {} });

// Fixtures for the flow: the two who went for food last round (round 2), and the food stock before this Task.
const WENT_LAST_ROUND = Object.freeze([1, 7]);
const STOCK_BEFORE = 1;

function volunteer(root, p) {
  const step = p.step ?? 'task';
  const seats = fixtureBoard({ roster: 9 });
  const rested = step === 'rested';
  roomView(root, { seats, self: CAST.winch.seat, top: phaseBar('Tasks', 'Outside the turn order', null, rested ? 4 : 3), tabsCfg: { open: 'actions', hero: 'pass-off' }, label: step !== 'partner' });
  const asked = seatOf(CAST.panel.seat).name;
  if (step === 'task' || rested) {
    // The owner, 12 November 2026: no limit of one Task per match; the Volunteer and their Partner cannot go for food the next round.
    root.append(...sheet({ title: 'Start a Task', sub: 'With a Partner you choose. Outside the turn order.', detent: 'auto', body: [
      list(
        rested
          ? row({ icon: 'supply', title: 'Food Supply', sub: 'You went for food last round', disabled: true })
          : row({ icon: 'supply', title: 'Food Supply', sub: `Lower a ration crate onto the galley lift: +${FOOD.perDelivery} packages`, chevron: true, go: 's=volunteer&step=partner' }),
        row({ icon: 'panel', title: 'Engine', sub: 'Its own Task, designed separately', disabled: true })),
      groupNote(rested ? 'The two who go for food cannot go again the next round. You can go again in round 5.' : 'Anyone can volunteer. You and your Partner cannot go for food again next round.'),
    ] }));
  } else if (step === 'partner') {
    const choices = seats.filter(s => s.seat !== CAST.winch.seat);
    root.append(...sheet({ title: 'Choose your Partner', sub: 'Food Supply Task', back: 's=volunteer&step=task', detent: 'large', body: [
      groupLabel('Players'),
      list(...choices.map(s => {
        const away = s.location === 'Hospital' || s.location === 'Jail';
        const went = WENT_LAST_ROUND.includes(s.seat);
        return row({ lead: h('b.num', String(s.seat)), title: s.name, sub: went ? 'Went for food last round' : away ? 'Not available now' : s.location, disabled: away || went, trail: s.seat === CAST.panel.seat ? ic('check', { filled: true }) : null });
      })),
      groupNote('If the player you ask declines, the next volunteer goes. Last round\'s two cannot go for food (PROPOSED: nor anyone in the Hospital or the Jail). The game picks the controls at random.'),
    ], foot: button(`Ask ${asked}`, { icon: 'supply', block: true, go: 's=volunteer&step=asking' }) }));
  } else if (step === 'asking') {
    root.append(...sheet({ title: `Waiting for ${asked}`, sub: 'Food Supply Task', close: false, body: [h('p.group-note', `${asked} can join or decline. If not, the next volunteer goes.`)],
      foot: [button('Waiting…', { busy: true, block: true, disabled: true }), button('Cancel', { kind: 'plain', block: true })] }));
  } else if (step === 'declined') {
    // The owner, 12 November 2026: after a refusal the game goes to the next volunteer, anyone who volunteers.
    root.append(...sheet({ title: `${asked} declined`, sub: 'Food Supply Task', detent: 'auto', body: [
      groupNote('The next volunteer goes: anyone else can start the Task now.'),
      groupNote('You can volunteer again next round (PROPOSED).'),
    ], foot: button('OK', { block: true }) }));
  } else {
    root.append(...sheet({ title: 'Starting the Food Supply Task', sub: `${asked} joined`, close: false, body: [h('p.group-note', 'Going to the Supply Room…')], foot: button('Starting…', { busy: true, block: true, disabled: true }) }));
  }
}

/** The Partner is asked: Join or Decline (the owner, 11 November 2026), with a time to answer (PROPOSED). */
function called(root, p) {
  const seats = fixtureBoard({ roster: 9 });
  const { top } = roomView(root, { seats, self: CAST.panel.seat, top: phaseBar('Tasks', 'Outside the turn order') });
  const volunteerName = seatOf(CAST.winch.seat).name;
  const style = { top: `${top + 60}px`, maxHeight: `calc(100% - ${top + 72}px)` };
  if (p.answer === 'join') {
    root.append(h('section.fs-card', { role: 'alertdialog', 'aria-label': 'Joined a Task', style },
      h('span.stamp.fs-stamp', { 'data-tone': 'accent' }, 'Partner'),
      h('h2', `You joined ${volunteerName}'s Food Supply Task`),
      h('p', 'You are going to the Supply Room. Your place in Room B is kept for your return.'),
      h('p', h('b', 'Briefing in a moment.'))));
    return;
  }
  root.append(h('section.fs-card', { role: 'alertdialog', 'aria-label': 'Asked to join a Task', style },
    h('span.stamp.fs-stamp', { 'data-tone': 'accent' }, 'Partner request'),
    h('h2', `${volunteerName} asks you to join the Food Supply Task`),
    h('p', 'You would go to the Supply Room together, one of you on each control. Your place in Room B is kept for your return.'),
    h('p', 'If you join, neither of you can go for food next round.'),
    h('div.fs-answer', button('Decline', { kind: 'secondary', block: true }), button('Join', { icon: 'check', block: true, go: 's=called&answer=join' })),
    h('p.fs-timer', `Answer within ${Math.round(TIMING.answer / 1000)} s. No answer counts as a decline.`)));
}

function away(root) {
  const seats = fixtureBoard({ roster: 9 }).filter(s => s.seat !== CAST.winch.seat && s.seat !== CAST.panel.seat);
  const self = 6;
  const { top } = roomView(root, { seats, self, top: phaseBar('Tasks', 'Outside the turn order') });
  // The owner, 11 November 2026: other players can check on the board who is not here. The banner names no one.
  root.append(h('div.fs-banner', { style: { top: `${top + 44}px` } }, banner({ icon: 'supply', title: 'Two players are away on the Food Supply Task', sub: 'The board shows who is not here. The Task itself shows on their phones only.' })));
}

function returned(root, p) {
  const board = boardOf(p.board ?? 'cooperation');
  const frames = run(board);
  const end = frames[frames.length - 1].state;
  const health = {};
  for (const role of ['winch', 'panel']) if (!end.alive[role]) health[CAST[role].seat] = 'Eliminated';
  const seats = fixtureBoard({ roster: 9, health });
  const as = p.as ?? 'winch';
  const self = as === 'other' ? 6 : CAST[as].seat;
  const { top } = roomView(root, { seats, self, top: topBar({ kind: 'phase', icon: 'hourglass', title: 'Round 3', sub: 'Back in Room B', round: 3, menu: {} }) });
  const o = end.outcome;
  // The owner, 12 November 2026: the other players learn the result only through the food count. A delivery shows
  // as the new count on every phone, naming no Task; otherwise they see only the board.
  if (as === 'other') {
    if (o.result === 'delivered') root.append(h('div.fs-banner', { style: { top: `${top + 44}px` } }, toast(`Food stock: ${STOCK_BEFORE + o.packages} packages (+${o.packages})`, 'supply')));
    return;
  }
  const text = !end.alive[as] ? 'You are out: you were killed on the Task.' : o.result === 'delivered' ? `Back in Room B. Delivered: +${o.packages} packages.` : o.result === 'cancelled' ? 'Back in Room B. The Task was cancelled.' : 'Back in Room B. The Task was lost.';
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
