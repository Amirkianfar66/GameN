// mothership:dev-only
//
// The Food Supply Task on the participants' phones, and what the other phones show: a design
// proposal on synthetic fixtures, built from the phone pack's own components (its top bar, pills,
// banners, toasts, rows and room views; design/phone-ui/prototype/), so that it reads as part of
// the same interface. Nothing here talks to a server: each address draws one state, taken from a
// storyboard's run through the Task's own rules (./task.mjs, ./boards.mjs) at one moment.
//
//   phone.html?s=task&board=cooperation&t=9233&as=winch     a participant's Task screen (winch or panel)
//   …&press=sending|refused|unknown|through|lost&act=lock     the presser's own press: in flight, refused, its answer unknown, recovered
//   phone.html?s=howto                                       how the Task works: read any time before it, outside its 30 s
//   phone.html?s=volunteer&step=task|partner|asking|declined|starting   the Volunteer starts a Task, in the Food Supply step
//   phone.html?s=volunteer&step=rested                      the next round: the two cannot go for food
//   phone.html?s=volunteer&step=closed|busy                 the Tasks sheet in an ordinary turn; another request waiting
//   phone.html?s=volunteer&step=withdrawn|withdraw-late      the Volunteer cancels, or is too late to
//   phone.html?s=called[&answer=join|joining|late-withdrawn|late-expired]   the Partner is asked, and the races
//   phone.html?s=away                                        another player's phone meanwhile
//   phone.html?s=return&board=drop&as=winch|panel|other      after the Task, back in Room B
//   phone.html?s=stock&n=1                                   the food gauge under the clock, on every phone
//   …&safe=47,34  …&text=2  …&motion=reduced                 as the pack's prototype
//   …&before=1                                               the moment of a press at t, before the server's answer
//   …&live=1                                                 the controls play the storyboard's next press
// The prototype is layout evidence only: live mode steps the storyboard; it does not send a press, hold
// a command id, enforce a disabled control or recover a receipt. The native phone does all of that.

import { h, ic, topBar, tabs, pill, toast, banner, button, row, list, groupLabel, groupNote, sheet, caption } from '../phone-ui/prototype/ui.mjs';
import { paintRoom, ROOM_NAMES } from '../phone-ui/prototype/art.mjs';
import { board as fixtureBoard, seatOf, FIXTURE_LABEL } from '../phone-ui/prototype/fixtures.mjs';
import { view, tick, ROLES, TIMING, FOOD, FIXTURES, STOPS, ZONES } from './task.mjs';
import { boardOf, CAST } from './boards.mjs';
import { hintFor, person, other, nameOperators, packagesText, packagesFigure, foodLevel, foodLabel } from './hints.mjs';
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

/**
 * What a button would do now, in words: under its label, and in its accessible name. Never a promise:
 * the server decides a press when it arrives, a moment later, so the words say where the panel or the
 * crate is, and a warning starts a little before a danger does (task.mjs hazards()).
 */
function subOf(b, v, p = {}) {
  const partner = person(other(v.role)).name;
  if (p.press === 'sending' && pressOf(b, p)) return 'Sending…';
  if (v.phase === 'briefing') return 'After the briefing';
  if (v.phase === 'ended') return 'The Task is over';
  if (v.you === 'down') return 'You are out';
  if (!b.enabled && v.offline) return 'Reconnecting…';
  if (b.act === 'key') return b.turned ? 'Waiting for the other key' : 'Sends the crate down';
  if (b.act === 'release') {
    if (b.enabled) return 'Starts the panel clicking';
    if (v.crate.state === 'hanging') return 'Wait: the crate is rising';
    return v.crate.settled ? `${partner} lifts it first` : 'Wait: a new crate';
  }
  if (b.act === 'lock') {
    if (b.hazard) return b.stop === FIXTURES.cab.stop ? `At 7: ${partner}'s cab` : `Moving on to ${partner}'s cab`;
    const goal = v.goal ?? FIXTURES.platform.stop;
    if (b.stop === goal) return b.leaving ? `Leaving ${goal + 1}` : goal === FIXTURES.intake.stop ? 'At 1: the hatch' : 'At 6: the platform';
    return b.stop === FIXTURES.console.stop ? 'At 5: over you' : `At ${b.stop + 1}`;
  }
  // The Winch's one button: what the finger on it does now, and what letting go would do.
  if (!b.enabled) return v.crate.state === 'intake' && v.crate.settled ? 'Wait for the hook at 1' : 'Wait: a new crate';
  if (!b.holding) return v.crate.state === 'hanging' ? 'Hold to take it back' : 'Press and hold to lift';
  if (!v.crate.settled) return 'Lifting: keep holding';
  if (b.hazard) return `Let go: falls on ${partner}`;
  if (b.next) return 'Let go now: it lands';
  return { land: 'Let go: it lands', back: 'Let go: back in the hatch', drop: `Let go: falls on ${partner}`, break: 'Keep holding: it breaks' }[b.fall] ?? 'Keep holding';
}

/** Whether the press in p is this button's: Hold sends raise (the finger down) and lower (the finger off). */
const pressOf = (b, p) => p.act === b.act || (b.act === 'hold' && (p.act === 'raise' || p.act === 'lower'));

/** One big control: its icon, its label and what it would do now; the next press glows; a press that would kill is striped and says so. */
function control(b, v, p = {}) {
  const sub = subOf(b, v, p);
  const label = b.label;
  // A press in flight: its own control shows it and every control waits for the answer. The press stays
  // the act it was made as (a double tap on LOCK never becomes RELEASE); a disabled control sends nothing.
  const sending = p.press === 'sending';
  const enabled = b.enabled && !sending && p.press !== 'unknown';
  const aria = `${label}. ${b.hazard ? `Warning: ${sub}` : sub}.`;
  const icon = b.act === 'key' ? ic(b.turned ? 'check' : 'key', { filled: true }) : b.act === 'lock' || b.act === 'release' ? ic(b.act === 'lock' ? 'lock' : 'release', { filled: true }) : arrow('raise');
  // Hold: the finger keeps it down; while the server holds the crate for it, it shows pressed (data-holding).
  const hold = b.act === 'hold';
  return h('button.fs-ctl', {
    type: 'button', 'data-act': b.act, 'aria-label': aria, 'aria-disabled': (hold ? b.enabled : enabled) ? null : 'true', 'aria-busy': sending && pressOf(b, p) ? 'true' : null,
    'aria-pressed': hold ? String(Boolean(b.holding)) : null,
    'data-next': b.next && (hold ? b.enabled : enabled) ? '' : null, 'data-hazard': b.hazard && (hold ? b.enabled : enabled) ? '' : null, 'data-key': b.act === 'key' && !b.turned ? '' : null, 'data-turned': b.turned ? '' : null,
    'data-zone': hold && b.holding ? b.zone : null, 'data-holding': hold && b.holding ? '' : null, 'data-sending': sending && pressOf(b, p) ? '' : null,
  }, h('span.fs-face', icon, h('span.fs-label', label, h('span.fs-sub', sub))));
}

/** The Panel's strip: the seven stops, the platform's in amber, the cab's striped, yours marked, and where the panel is now. */
function sweepStrip(v) {
  const cells = Array.from({ length: STOPS }, (_, s) => h('span', {
    'data-goal': s === (v.goal ?? FIXTURES.platform.stop) ? '' : null, 'data-cut': s === FIXTURES.cab.stop ? '' : null,
    'data-you': s === FIXTURES.console.stop ? '' : null, 'data-at': v.panel.locked && v.panel.stop === s ? '' : null, 'data-now': !v.panel.locked && v.panel.stop === s ? '' : null,
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
    h('div.fs-meter', { 'data-live': v.crate.state === 'hanging' && v.crate.holder === 'winch' && v.panel.locked ? '' : null },
      h('span.fs-zone', { 'data-zone': 'console', style: band(FIXTURES.console.stop, ZONES.console) }),
      h('span.fs-zone', { 'data-zone': 'platform', style: band(FIXTURES.platform.stop, ZONES.platform) }),
      h('i.fs-crate', { style: { left: `${f(x)}%` }, 'data-out': x < lo || x > hi ? '' : null })),
    h('p.fs-legend', h('span', { 'data-zone': 'console' }), `Over ${person('panel').name}`, h('span', { 'data-zone': 'platform' }), 'Over the platform'));
}

/** The participant's Task screen at time t of a storyboard. */
function taskScreen(root, p) {
  const board = boardOf(p.board ?? 'cooperation');
  const t = Number(p.t ?? TIMING.briefing + 200);
  // before=1: the phone at the very moment of a press, before the server's answer to it.
  const frames = run(board).filter((f, i) => !p.before || i === 0 || f.at < t);
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
  // The partner's state, offline or out, stays on screen at every text size, even while the hint shows a danger:
  // here in the top bar, and at the largest text, where the bar keeps only the names and the role row goes, on
  // the partner's name tag in the view (#222, 13 November 2026).
  const sub = v.partner === 'offline' ? `${them.name} is offline` : v.partner === 'down' ? `${them.name} is out` : `Food Supply · you run the ${ROLES[role].name}`;
  root.append(withFood(topBar({ kind: 'pair', pair: [you, them], sub, seconds: v.phase === 'ended' ? null : v.secondsLeft, urgentAt: 10, menu: {} }), STOCK_DOSES));
  if (v.partner !== 'alive') root.querySelector('.tb').dataset.partner = v.partner;
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
      h('b.num', String(who.seat)), h('span', r === role ? 'You' : who.name), down ? h('span.status', '· Out') : r !== role && state.online[r] === false ? h('span.status', '· Offline') : null));
  }
  const hint = hintFor(v, recent);
  const controls = h('div.fs-controls', { 'data-role': role, 'data-landed': v.crate.state === 'landed' ? '' : null, role: 'group', 'aria-label': `${ROLES[role].name} controls` }, v.buttons.map(b => control(b, v, p)));
  const panel = h('section.fs-panel', { 'aria-label': 'Your controls' },
    h('div.fs-role', pill(`${ROLES[role].name} · ${ROLES[role].axis === 'vertical' ? 'up and down' : 'left and right'}`, { icon: role === 'panel' ? 'lock' : 'move', tone: 'accent' }),
      h('span.fs-who', { 'data-state': v.partner }, h('b', `${them.seat} ${them.name}`), ` · ${ROLES[other(role)].name}${v.partner === 'down' ? ' · Out' : v.partner === 'offline' ? ' · Offline' : ''}`)),
    h('p.fs-hint', { 'data-tone': hint.tone, role: 'status', 'aria-live': 'polite' }, ic(hint.icon, { filled: true }), h('span', hint.text)),
    h('div.fs-dock', v.crate.state === 'landed' || v.phase === 'ended' ? null : role === 'panel' ? sweepStrip(v) : swingMeter(v), controls));
  root.append(h('div.fs-screen', { style: { top: `${top}px` } }, viewEl, panel));
  // The tags are fitted again once the fonts have loaded and whenever the view changes size.
  fitTags(art, viewEl);
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => fitTags(art, viewEl)).observe(viewEl);
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
  pressState(root, p, top);
  wireControls(controls, p);
  window.__fsLayout = measure(root, { viewEl, panel, controls });
  document.fonts?.ready.then(() => { fitTags(art, viewEl); window.__fsLayout = measure(root, { viewEl, panel, controls }); });
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
    // The briefing runs inside the Task's 30 seconds: it is a reminder that must never need scrolling.
    if (c.classList.contains('fs-brief') && c.scrollHeight > c.clientHeight + 1) problems.push('the briefing scrolls');
  }
  for (const t of root.querySelectorAll('.fs-art .tag')) {
    const r = t.getBoundingClientRect(), v = viewEl.getBoundingClientRect();
    if (r.left < v.left - 0.5 || r.right > v.right + 0.5 || r.bottom > v.bottom + 0.5) problems.push(`the tag "${t.textContent}" leaves the view`);
  }
  return { view: Math.round(viewEl.getBoundingClientRect().height), hintScrolls: scrolls, problems };
}

/**
 * Every name tag stays whole inside the view, at every text size and with the longest permitted name (twelve
 * characters, such as WWWWWWWWWWWW; #222, 13 November 2026). Hana's tag ends at the cab's right edge and grows to
 * the left, at most to 4 px from the view's edge; Cleo's is centred on the console, at most 8 px narrower than
 * twice the room on its nearer side. A tag wider than that puts its state ("· Offline", "· Out") on a second line,
 * and a name wider than a whole line breaks; a tag that grows taller moves up to stay inside the view. If the two
 * tags still meet (the smallest view, long names), the player's own "You" tag gives way: the partner's, which
 * carries their state, stays whole.
 */
function fitTags(art, viewEl) {
  const tags = [...art.querySelectorAll('.tag')];
  for (const tag of tags) {
    tag.dataset.top ??= tag.style.top;
    Object.assign(tag.style, { top: tag.dataset.top, maxWidth: '', display: '' });
  }
  const v = viewEl.getBoundingClientRect(), a = art.getBoundingClientRect();
  for (const tag of tags) {
    const x = a.left + (parseFloat(tag.style.left) / 100) * a.width;
    const room = tag.dataset.anchor === 'end' ? x - v.left - 4 : 2 * Math.min(x - v.left, v.right - x) - 8;
    tag.style.maxWidth = `${Math.max(0, Math.floor(room))}px`;
    const r = tag.getBoundingClientRect();
    if (r.bottom > v.bottom - 2) tag.style.top = `${Math.max(0, Math.floor(r.top - a.top - (r.bottom - v.bottom + 2)))}px`;
  }
  const [p, q] = tags.map(t => t.getBoundingClientRect());
  if (p && q && p.left < q.right && q.left < p.right && p.top < q.bottom && q.top < p.bottom) for (const t of tags) if (t.dataset.self !== undefined) t.style.display = 'none';
}

/**
 * The presser's own press, shown to the presser only (the other phone never sees it): in flight, refused
 * (the crane had moved on since the picture it was made on), its answer unknown (the connection dropped
 * while it was on its way), and after the recovery, the answer the server kept for its command id. On
 * recovery the phone asks for the present state and that answer; it never replays queued taps.
 */
function pressState(root, p, top) {
  const name = { lock: 'LOCK', release: 'RELEASE', raise: 'Hold', lower: 'let-go', hold: 'Hold', key: 'key' }[p.act] ?? 'press';
  const at = { style: { top: `${top + 12}px` } };
  if (p.press === 'refused') root.append(h('div.fs-banner', at, banner({ icon: 'info', title: `Your ${name} was not done`, sub: 'The crane had moved on.' })));
  if (p.press === 'unknown') root.append(h('div.fs-banner', at, banner({ icon: 'offline', title: `Checking your ${name}…`, sub: 'The connection dropped on the way.' })));
  if (p.press === 'through') root.append(h('div.fs-banner', at, toast(`Your ${name} went through.`, 'check')));
  if (p.press === 'lost') root.append(h('div.fs-banner', at, toast(`Your ${name} did not go through.`, 'info')));
}

/** A text equivalent of the Task view, for screen readers. */
function describe(v) {
  const panel = v.panel.locked ? `The panel is locked at stop ${v.panel.stop + 1}.` : `The panel is clicking along the rail, now at stop ${v.panel.stop + 1}.`;
  const at = Math.round(v.crate.x) + 1;
  const crate = { intake: 'A crate waits in the intake.', landed: 'The crate is on the platform.', sent: 'The crate has gone down.' }[v.crate.state]
    ?? `${v.crate.holder === 'winch' ? 'The Winch holds the crate up' : 'The brake holds the crate up'}, ${v.panel.locked ? `swinging, now over stop ${at}` : 'under the panel'}.`;
  const broken = v.broken ? ` ${v.broken === 1 ? 'One crate has' : `${v.broken} crates have`} broken.` : '';
  return `The Supply Room. ${panel} ${crate}${broken}${v.warnings.length ? ' Warning shown.' : ''}`;
}

/**
 * The briefing: a reminder, not the instructions. It fits without scrolling at the largest text, since
 * the Task's time runs during it: your control, the one thing to do, the one danger. The instructions
 * are read before the Task, outside its time (the How it works page, s=howto).
 */
function briefingCard(role, v, top) {
  const them = person(other(role));
  const lines = role === 'winch'
    ? ['Hold it up. Let go over 6.', `Over ${them.name}, it falls on ${them.name}.`]
    : ['Release it, then lock it at 6.', `LOCK at 7 cuts ${them.name}.`];
  return h('section.fs-card.fs-brief', { role: 'dialog', 'aria-label': `You run the ${ROLES[role].name}`, style: { top: `${top + 16}px`, maxHeight: `calc(100% - ${top + 28}px)` } },
    h('h2', `You run the ${ROLES[role].name}`),
    h('ul',
      h('li', ic(role === 'winch' ? 'move' : 'lock', { filled: true }), h('span', lines[0])),
      h('li', ic('warning', { filled: true }), h('span', lines[1]))),
    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px' } }, h('span.fs-count', String(v.briefingLeft)), h('p', 'Starting')));
}

function outcomeCard({ title, stamp, tone = null, body }, top) {
  return h('section.fs-card', { role: 'alertdialog', 'aria-label': title, style: { top: `${top}px`, maxHeight: `calc(100% - ${top + 12}px)` } },
    stamp ? h('span.stamp.fs-stamp', { 'data-tone': tone }, stamp) : null, h('h2', title), body);
}

function endCard(v, role, top) {
  const o = v.outcome;
  // The owner, on Designer's recommendation (12 November 2026): both go back at the same moment, whatever happened.
  const back = h('p', `You go back to ${ROOM_NAMES[CAST[role].from.room]} at the end of the Task's time.`);
  if (o.result === 'delivered') return outcomeCard({ title: 'Delivered', stamp: `+${o.packages} packages`, tone: 'accent', body: [h('p', 'The crate went down to the galley. The ship\'s food stock rises by five.'), back] }, top + 24);
  if (o.result === 'cancelled') return outcomeCard({ title: 'Task cancelled', stamp: 'Cancelled', body: [h('p', o.who === role ? 'You lost your connection. Nothing was delivered.' : `${person(other(role)).name} lost their connection. Nothing was delivered.`), back] }, top + 24);
  // A death with the crate broken and a new one waiting in the intake: no one was left to fetch it (the owner's hold, 13 November 2026).
  const lost = o.why === 'time' ? 'The time ran out before the crate went down.' : v.crate.state === 'intake' ? 'The crate broke, and no one was left to fetch another.' : 'The crate was not over the platform.';
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

const phaseBar = (title, sub, seconds = null, round = 3, doses = STOCK_DOSES) => withFood(topBar({ kind: 'phase', icon: 'supply', title, sub, seconds, round, menu: {} }), doses);
// The Food Supply step, at the start of each round before the pre-turn window (the owner, on Designer's
// recommendation, 12 November 2026): 30 s to ask a Partner, then the Task's 30 s.
const stepBar = (seconds, round = 3) => phaseBar('Food Supply', 'Who goes for food?', seconds, round);
const turnBar = (doses = STOCK_DOSES) => withFood(topBar({ kind: 'turn', who: seatOf(7), round: 3, seconds: 42, menu: {} }), doses);

// Fixtures for the flow: the two who went for food last round (round 2), and the food stock before this Task.
const WENT_LAST_ROUND = Object.freeze([1, 7]);
const STOCK_BEFORE = 1;
const STOCK_DOSES = STOCK_BEFORE * FOOD.dosesPerPackage;

function volunteer(root, p) {
  const step = p.step ?? 'task';
  const seats = fixtureBoard({ roster: 9 });
  const rested = step === 'rested';
  const closed = step === 'closed';
  roomView(root, { seats, self: CAST.winch.seat, top: closed ? turnBar() : stepBar(24, rested ? 4 : 3), tabsCfg: { open: 'actions', hero: 'pass-off' }, label: step !== 'partner' });
  const asked = person('panel').name;
  if (closed || step === 'busy') {
    // Outside the step, the sheet still opens: How it works is read here, outside any timed window. In the
    // step, one request at a time: while another waits, the row names no one.
    root.append(...sheet({ title: 'Start a Task', sub: 'With a Partner you choose. Once a round, before the turns.', detent: 'auto', body: [
      list(
        row({ icon: 'supply', title: 'Food Supply', sub: closed ? 'Opens at the start of each round' : 'Someone is asking a Partner', disabled: true }),
        row({ icon: 'panel', title: 'Engine', sub: 'Its own Task, designed separately', disabled: true }),
        row({ icon: 'info', title: 'How the Food Supply Task works', sub: 'Read it now: the Task itself lasts 30 seconds', chevron: true, go: 's=howto' })),
      groupNote(closed ? 'The Food Supply Task runs only at the start of a round, before the turns.' : 'One request at a time. If it is refused, anyone else can ask while the step lasts.'),
    ] }));
  } else if (step === 'task' || rested) {
    // The owner, 12 November 2026: no limit of one Task per match; the Volunteer and their Partner cannot go for food the next round.
    root.append(...sheet({ title: 'Start a Task', sub: 'With a Partner you choose. Once a round, before the turns.', detent: 'auto', body: [
      list(
        rested
          ? row({ icon: 'supply', title: 'Food Supply', sub: 'You went for food last round', disabled: true })
          : row({ icon: 'supply', title: 'Food Supply', sub: `Land a ration crate on the galley lift: +${FOOD.perDelivery} packages`, chevron: true, go: 's=volunteer&step=partner' }),
        row({ icon: 'panel', title: 'Engine', sub: 'Its own Task, designed separately', disabled: true }),
        row({ icon: 'info', title: 'How the Food Supply Task works', sub: 'Read it now: the Task itself lasts 30 seconds', chevron: true, go: 's=howto' })),
      groupNote(rested ? 'The two who go for food cannot go again the next round. You can go again in round 5.' : 'Anyone can volunteer. You and your Partner cannot go for food again next round.'),
    ] }));
  } else if (step === 'partner') {
    const choices = seats.filter(s => s.seat !== CAST.winch.seat);
    root.append(...sheet({ title: 'Choose your Partner', sub: 'Food Supply Task', back: 's=volunteer&step=task', detent: 'large', body: [
      groupLabel('Players'),
      list(...choices.map(s => {
        const away = s.location === 'Hospital' || s.location === 'Jail';
        const went = WENT_LAST_ROUND.includes(s.seat);
        return row({ lead: h('b.num', String(s.seat)), title: s.seat === CAST.panel.seat ? asked : s.name, sub: went ? 'Went for food last round' : away ? 'Not available now' : s.location, disabled: away || went, trail: s.seat === CAST.panel.seat ? ic('check', { filled: true }) : null });
      })),
      groupNote('If the player you ask declines, the next volunteer goes. Last round\'s two, and anyone in the Hospital or the Jail, cannot go. The game picks the controls at random.'),
    ], foot: button(`Ask ${asked}`, { icon: 'supply', block: true, go: 's=volunteer&step=asking' }) }));
  } else if (step === 'asking') {
    root.append(...sheet({ title: `Waiting for ${asked}`, sub: 'Food Supply Task', close: false, body: [h('p.group-note', `${asked} can join or decline. If not, the next volunteer goes.`)],
      foot: [button('Waiting…', { busy: true, block: true, disabled: true }), button('Cancel', { kind: 'plain', block: true, go: 's=volunteer&step=withdrawn' })] }));
  } else if (step === 'withdrawn') {
    // Withdrawing counts as a refusal, so the next volunteer goes (the owner, on Designer's recommendation).
    root.append(...sheet({ title: 'Request withdrawn', sub: 'Food Supply Task', detent: 'auto', body: [
      groupNote('The next volunteer goes: anyone else can ask while the step lasts.'),
      groupNote('You can volunteer again next round.'),
    ], foot: button('OK', { block: true }) }));
  } else if (step === 'withdraw-late') {
    // The race: Cancel reached the server after the Partner's Join. The first to arrive wins; the Task starts.
    root.append(...sheet({ title: 'Too late to cancel', sub: `${asked} joined first`, close: false, body: [h('p.group-note', 'The Task is starting. Going to the Supply Room…')], foot: button('Starting…', { busy: true, block: true, disabled: true }) }));
  } else if (step === 'declined') {
    // The owner, 12 November 2026: after a refusal the game goes to the next volunteer, anyone who volunteers.
    root.append(...sheet({ title: `${asked} declined`, sub: 'Food Supply Task', detent: 'auto', body: [
      groupNote('The next volunteer goes: anyone else can ask while the step lasts.'),
      groupNote('You can volunteer again next round.'),
    ], foot: button('OK', { block: true }) }));
  } else {
    root.append(...sheet({ title: 'Starting the Food Supply Task', sub: `${asked} joined`, close: false, body: [h('p.group-note', 'Going to the Supply Room…')], foot: button('Starting…', { busy: true, block: true, disabled: true }) }));
  }
}

/**
 * The Partner is asked: Join or Decline (the owner, 11 November 2026), with 15 s to answer (the owner, on
 * Designer's recommendation, 12 November 2026).
 * The answer races the Volunteer's Cancel and the time running out: the server takes whichever arrives
 * first, and the phone shows what it decided. answer: join (joined), joining (the answer on its way),
 * late-withdrawn (the Volunteer had cancelled), late-expired (the time had run out).
 */
function called(root, p) {
  const seats = fixtureBoard({ roster: 9 });
  const { top } = roomView(root, { seats, self: CAST.panel.seat, top: stepBar(21) });
  const volunteerName = person('winch').name;
  // At the largest text on a small phone (the screen under 14 rem wide), a card starts right under the top bar and
  // leaves its stamp out (its title says the same), so the request's words and both answers fit (#222).
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const tight = root.clientWidth / rem < 14;
  const style = tight ? { top: `${top + 8}px`, maxHeight: `calc(100% - ${top + 20}px)` } : { top: `${top + 60}px`, maxHeight: `calc(100% - ${top + 72}px)` };
  const tightAttr = tight ? '' : null;
  if (p.answer === 'join') {
    root.append(h('section.fs-card', { role: 'alertdialog', 'aria-label': 'Joined a Task', 'data-tight': tightAttr, style },
      h('span.stamp.fs-stamp', { 'data-tone': 'accent' }, 'Partner'),
      h('h2', `You joined ${volunteerName}'s Food Supply Task`),
      h('p', 'You are going to the Supply Room. Your place in Room B is kept for your return.'),
      h('p', h('b', 'Briefing in a moment.'))));
    return;
  }
  if (p.answer === 'late-withdrawn' || p.answer === 'late-expired') {
    root.append(h('section.fs-card', { role: 'alertdialog', 'aria-label': 'Too late to join', 'data-tight': tightAttr, style },
      h('div.fs-card-body',
        h('span.stamp.fs-stamp', 'Too late'),
        h('h2', 'Too late to join'),
        h('p', p.answer === 'late-withdrawn' ? `${volunteerName} had withdrawn the request before your answer arrived.` : `The ${Math.round(TIMING.answer / 1000)} seconds ran out before your answer arrived. It counts as a decline.`),
        h('p', 'You stay in Room B.')),
      h('div.fs-card-foot', h('div.fs-answer', button('OK', { block: true })))));
    return;
  }
  const joining = p.answer === 'joining';
  // The answers stay in sight at every text size: when the words need more room than the card has, they scroll
  // above Decline and Join, and the time to answer stays under them (#222, 13 November 2026).
  root.append(h('section.fs-card', { role: 'alertdialog', 'aria-label': 'Asked to join a Task', 'data-tight': tightAttr, style },
    h('div.fs-card-body',
      h('span.stamp.fs-stamp', { 'data-tone': 'accent' }, 'Partner request'),
      h('h2', `${volunteerName} asks you to join the Food Supply Task`),
      h('p', 'You would go to the Supply Room together, one of you on each control. Your place in Room B is kept for your return.'),
      h('p', 'If you join, neither of you can go for food next round.')),
    h('div.fs-card-foot', h('div.fs-answer', button('Decline', { kind: 'secondary', block: true, disabled: joining }), button(joining ? 'Joining…' : 'Join', { icon: joining ? null : 'check', block: true, busy: joining, disabled: joining, go: 's=called&answer=join' })),
    h('p.fs-timer', `Answer within ${Math.round(TIMING.answer / 1000)} s. No answer counts as a decline.`))));
}

/**
 * How the Task works: the instructions, read any time before the Task, outside its time (from the Tasks
 * sheet). The briefing inside the Task's 30 seconds is then only a reminder. It scrolls at large text;
 * nothing is timed here.
 */
function howto(root) {
  const seats = fixtureBoard({ roster: 9 });
  roomView(root, { seats, self: CAST.winch.seat, top: turnBar(), tabsCfg: { open: 'actions', hero: 'pass-off' }, label: false });
  const section = (title, text) => [groupLabel(title), groupNote(text)];
  root.append(...sheet({ title: 'How the Food Supply Task works', sub: 'Read it now: the Task itself lasts 30 seconds', back: 's=volunteer&step=closed', detent: 'large', body: [
    ...section('When', 'Once a round, at its start, before the turns. The two who go cannot go again the next round.'),
    ...section('Two of you, one control each', 'The game picks who runs which control. The Panel moves the crane left and right; the Winch moves the crate up and down.'),
    ...section('The Panel', 'RELEASE sets the locking panel clicking from stop to stop along the rail, fast. LOCK stops it at the stop it rests at. Lock it at 6, over the platform. At 7 it cuts the Winch\'s cab.'),
    ...section('The Winch', 'One button: Hold. Press and hold to lift the crate, and keep holding while it moves. Locked, the crate swings. Let go when it swings over the platform: it lands. Over the Panel it falls on them. Anywhere else it breaks, and the hook must fetch a new one from the hatch at 1.'),
    ...section('Then', `Both turn a key: +${FOOD.perDelivery} packages for the ship.`),
    ...section('The time', '30 seconds for the whole Task, the short briefing included.'),
    ...section('Mistakes', 'A late LOCK or a let-go at the wrong moment can kill. Nothing tells a mistake from a betrayal. Your press counts when it reaches the ship, a moment after you press: the stripes warn you early for that.'),
    ...section('Leaving', 'If you lose your connection for 8 seconds, the Task is cancelled. It costs you nothing more. Whatever happens, you both go back at the end of the Task\'s time.'),
  ] }));
}

function away(root) {
  const seats = fixtureBoard({ roster: 9 }).filter(s => s.seat !== CAST.winch.seat && s.seat !== CAST.panel.seat);
  const self = 6;
  const { top } = roomView(root, { seats, self, top: phaseBar('Food Supply', 'The turns start after it', 21) });
  // The owner, 11 November 2026: other players can check on the board who is not here. The banner names no one.
  root.append(h('div.fs-banner', { style: { top: `${top + 44}px` } }, banner({ icon: 'supply', title: 'Two players are away on the Food Supply Task', sub: 'The board shows who. They come back when its time is up; the Task shows on their phones only.' })));
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
  const o = end.outcome;
  const after = STOCK_DOSES + (o.result === 'delivered' ? o.packages * FOOD.dosesPerPackage : 0);
  // Back at the end of the Task's time, whatever happened; the round goes on to the pre-turn window.
  const { top } = roomView(root, { seats, self, top: withFood(topBar({ kind: 'phase', icon: 'hourglass', title: 'Round 3', sub: 'Pre-turn', seconds: 14, round: 3, menu: {} }), after) });
  // The owner, 12 November 2026: the other players learn the result only through the food count. A delivery shows
  // as the new count on every phone, naming no Task; otherwise they see only the board.
  if (as === 'other') {
    if (o.result === 'delivered') root.append(h('div.fs-banner', { style: { top: `${top + 44}px` } }, toast(`Food stock: ${packagesText(after)} (+${o.packages})`, 'supply')));
    return;
  }
  const text = !end.alive[as] ? 'You are out: you were killed on the Task.' : o.result === 'delivered' ? `Back in Room B. Delivered: +${o.packages} packages.` : o.result === 'cancelled' ? 'Back in Room B. The Task was cancelled.' : 'Back in Room B. The Task was lost.';
  root.append(h('div.fs-banner', { style: { top: `${top + 44}px` } }, toast(text, o.result === 'delivered' ? 'check' : 'info')));
}


// The food count on every phone (the owner, 13 November 2026): a gauge beside the clock, always, never a banner.
function stock(root, p) {
  const doses = Math.round(Number(p.n ?? 1) * FOOD.dosesPerPackage);
  const seats = fixtureBoard({ roster: 9 });
  roomView(root, { seats, self: 4, room: 'room-a', top: turnBar(doses) });
}

/**
 * The food gauge (the owner, 13 November 2026; #222): the ship's food count, beside the clock in the top bar of
 * every phone, always. One line a package and a short line for a half (ten lines at most), and the count as a
 * figure ("4½"); amber while one package or less remains and red at none. It says nothing about any Task: the
 * count is public. Its words are for screen readers only (hints.mjs foodLabel); at large text the lines go and
 * the figure stays (phone.css).
 */
const GAUGE_LINES = 10;
function foodGauge(doses) {
  const whole = Math.floor(doses / FOOD.dosesPerPackage), half = doses % FOOD.dosesPerPackage !== 0;
  const lines = Array.from({ length: Math.min(whole, GAUGE_LINES) }, () => h('i'));
  if (half && whole < GAUGE_LINES) lines.push(h('i', { 'data-half': '' }));
  return h('span.fs-food', { role: 'img', 'aria-label': foodLabel(doses), 'data-level': foodLevel(doses) },
    ic('supply', { filled: true }), lines.length ? h('span.fs-food-lines', { 'aria-hidden': 'true' }, ...lines) : null, h('b', { 'aria-hidden': 'true' }, packagesFigure(doses)));
}
/**
 * A top bar with the food gauge under its clock, the two in one column, so the bar keeps its width for the names
 * and titles. Without a clock (an ended Task), the gauge takes the clock's place.
 */
function withFood(bar, doses) {
  const right = bar.querySelector('.tb-right');
  const clock = right.querySelector('.timer');
  const stack = h('span.fs-clock', foodGauge(doses));
  if (clock) { right.insertBefore(stack, clock); stack.prepend(clock); } else right.insertBefore(stack, right.querySelector('.tb-menu'));
  return bar;
}

const SCREENS = { task: taskScreen, volunteer, called, away, return: returned, stock, howto };

// The screen's parts, for the playable test (./play.mjs), which draws the same screen live.
export { subOf, control, sweepStrip, swingMeter, briefingCard, outcomeCard, endCard, describe };

// The widest permitted name: twelve characters (#222).
const LONG_NAME = 'WWWWWWWWWWWW';

export function render(p) {
  applyEnvironment(p);
  nameOperators(p.names === 'long' ? { winch: LONG_NAME, panel: LONG_NAME } : null);
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
  // A card, or a card's words, longer than the room they have scroll, and their last lines fade to say so.
  for (const c of root.querySelectorAll('.fs-card, .fs-card-body')) if (c.scrollHeight > c.clientHeight + 1) c.dataset.scrolls = '';
  document.title = `Food Supply · ${p.s ?? 'task'}`;
  window.__phoneReady = true;
}

// A page without the #app element (the playable test) draws its own screens.
if (app) render(read());
