// mothership:dev-only
//
// Library group 1's review page: every state of the Hacker's final Code, the ship hack and the
// Engineer's capture, each computed by states.mjs from a synthetic player view (protocol 3
// candidate shape) and drawn with the ability dossier's own parts (design/abilities/js/dossier.js,
// intel.js, abilities.css) plus this group's props (assets/library.art.css). Motion players run
// motion.mjs's frame functions. A review page: synthetic fixtures, no server, never a client.
//   ?w=390|320  the sheet width   &text=2  200% text   &motion=reduced   &only=<group>

import { loadBundles } from '../../prototypes/js/bundles.js';
import { el, fileShell } from '../../abilities/js/dossier.js';
import { chip, codeCard } from '../../abilities/js/intel.js';
import { LIBRARY_COPY as C } from './copy.mjs';
import { FRAMES, MOTION, motionEnd } from './motion.mjs';
import { engineerState, finalCodeState, shipHackState } from './states.mjs';

const params = new URLSearchParams(location.search);
const root = document.documentElement;
root.style.setProperty('--lib-width', `${Number(params.get('w') ?? 390)}px`);
if (params.get('text') === '2') root.dataset.text = '2';
let reduced = params.get('motion') === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches;
root.dataset.motion = reduced ? 'reduced' : 'full';

// ---------- the synthetic match (labelled as such on the page) ----------

const NAMES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo'];
const SEATS = NAMES.map((name, i) => Object.freeze({ n: i + 1, name, character: `c${i + 1}` }));
const seatOf = n => SEATS[n - 1];
const PLACES = { 1: 'Room A', 2: 'Room A', 3: 'Room A', 4: 'Room A', 5: 'Room B', 6: 'Room B', 7: 'Command Room', 8: 'Hospital', 9: 'Jail' };

/** A player view with only what the state map reads, every field named as the contract names it. */
function view({ role, seat, round = 3, phase = 'ORDINARY_TURN', active = seat, health = 'Healthy', location = PLACES[seat], jailed = false, roleActionSpent = false, abilities = {}, offers = [], lastMovedRound = round - 1, places = PLACES }) {
  const seats = SEATS.map(s => ({ seatId: s.n, health: s.n === seat ? health : s.n === 8 ? 'Injured' : 'Healthy', location: s.n === seat ? location : places[s.n], slotId: null, jailed: s.n === seat ? jailed : s.n === 9, captain: s.n === 7, officer: false, revealedFaction: null }));
  return {
    round, phase: { kind: phase }, activeSeatId: active, navigation: { lastMovedRound, arrivedAt: null },
    self: { seatId: seat, role, roleActionSpent },
    board: { kind: 'PLAYER_CURRENT', seats },
    abilities: { codeAttempted: false, shipHackUnlocked: false, shipHackSpent: false, engineerSpent: false, ...abilities },
    offers: offers.map(type => ({ type, targetSeatIds: [], slotIds: [], windowIds: [], promiseTargetSeatIds: [] })),
  };
}
const HACKER = 3, ENGINEER = 4;

// ---------- small parts ----------

const prop = (art, extra = {}) => el('span', { class: 'lib-prop', 'data-art': art, 'aria-hidden': 'true', ...extra });
const tape = text => el('span', { class: 'lib-tape' }, text);
const stamp = text => el('span', { class: 'ab-stamp', 'aria-hidden': 'true' }, text);
const words = (text, cls = 'lib-words') => el('p', { class: cls }, text);
const buttons = (...labels) => el('div', { class: 'lib-buttons' }, labels.map(label => el('button', { type: 'button', class: 'ab-button' }, label)));
function strip(tapeText, stampText, ...children) {
  return el('div', { class: 'ab-kit lib-strip' }, el('div', { class: 'lib-strip__top' }, tape(tapeText), stampText ? el('span', { class: 'lib-stamp-slot' }, stamp(stampText)) : null), ...children);
}
function file(kind, title, ...children) {
  const node = fileShell(kind, title);
  node.classList.add('lib-file');
  node.append(el('div', { class: 'lib-file__body' }, ...children));
  return node;
}
function card(state, fields, ...content) {
  return el('figure', { class: 'lib-card', 'data-state': state },
    el('div', { class: 'lib-card__sheet' }, ...content),
    el('figcaption', {}, el('div', { class: 'lib-card__state' }, 'state', el('b', {}, state)), el('p', { class: 'lib-card__fields' }, fields)));
}
const ROOM_ART = { 'Room A': '../../board-motion/assets/scenes/room-a.back.svg', 'Room B': '../../board-motion/assets/scenes/room-b.back.svg' };

// ---------- the Hacker: the final Code ----------

const PICKS = [2, 6, 7, 9].map(seatOf);
function codeWithPunch(picks, punched) {
  return el('span', { class: 'lib-code' }, codeCard(picks), punched ? prop('punch') : null);
}
export function finalCodeView(s, { picks = PICKS } = {}) {
  switch (s.state) {
    case 'round1': return strip(C.tapeFinalCode, null, words(C.finalCodeRound1));
    case 'closed': return strip(C.tapeFinalCode, null, words(C.finalCodeClosed));
    case 'available': return strip(C.tapeFinalCode, null, words(picks.length === 4 ? C.finalCodeAsk(picks) : C.finalCodeChoose(picks.length)), codeWithPunch(picks, false), words(C.finalCodeRule, 'lib-note'), picks.length === 4 ? buttons(C.submitFinalCode, C.chooseAgain) : null);
    case 'sending': return strip(C.tapeFinalCode, C.stampSending, words(C.finalCodeSending), codeWithPunch(picks, false));
    case 'correct': return strip(C.tapeFinalCode, C.stampUnlocked, words(C.finalCodeCorrect), codeWithPunch(picks, true), words(C.finalCodeCorrectNote, 'lib-note'));
    case 'wrong': return strip(C.tapeFinalCode, C.stampWrong, words(C.finalCodeWrong), codeWithPunch(picks, true));
    default: return words('Not the Hacker: nothing is drawn.', 'lib-note');
  }
}

// ---------- the Hacker: the ship hack ----------

const blockerWords = list => list.map(b => C.blockers[b]).join(' ');
export function shipFileView(s) {
  const art = { sealed: 'cartridge-sealed', armed: 'cartridge', eligible: 'cartridge', sending: 'cartridge', retained: 'jack-seated', used: 'cartridge-used' }[s.state];
  const lines = {
    sealed: [words(C.shipSealed)],
    armed: [words(C.shipArmed), words(C.shipRule, 'lib-note'), el('p', { class: 'lib-blocker' }, blockerWords(s.blockers ?? []))],
    eligible: [words(C.shipArmed), words(C.shipRule, 'lib-note')],
    sending: [words(C.shipSending)],
    retained: [words(C.shipRetained)],
    used: [words(C.shipUsed(s.round))],
  }[s.state];
  const stampText = { retained: C.stampRetained, used: C.stampUsed }[s.state];
  return file('ship', 'Hacker file', prop(art), el('div', { class: 'lib-file__words' }, ...lines, stampText ? el('span', { class: 'lib-stamp-slot' }, stamp(stampText)) : null));
}
function port({ seated = false, cartridge = true, spark = false } = {}) {
  return el('div', { class: 'lib-ship__port' }, prop(seated ? 'jack-seated' : 'jack'), !seated && cartridge ? prop('cartridge') : null, spark ? prop('spark') : null);
}
export function shipStripView(s) {
  if (s.state === 'eligible') return strip(C.tapeShipHack, null, el('div', { class: 'lib-ship' }, port()), words(C.shipAsk), buttons(C.hackShip, C.notNow));
  if (s.state === 'sending') return strip(C.tapeShipHack, C.stampSending, el('div', { class: 'lib-ship' }, port()), words(C.shipSending));
  if (s.state === 'retained') return strip(C.tapeShipHack, C.stampRetained, el('div', { class: 'lib-ship' }, port({ seated: true })), words(C.shipRetained));
  return null;
}

// ---------- the Engineer ----------

function roomView(room, seatIds, { shutter = false } = {}) {
  const seats = seatIds.map(seatOf);
  return el('div', { class: 'lib-view', role: 'img', 'aria-label': seats.length ? `${room} now: ${seats.map(x => `Player ${x.n}, ${x.name}`).join(', ')}` : `${room} now: empty` },
    el('div', { class: 'lib-view__picture' },
      el('img', { class: 'lib-view__room', src: ROOM_ART[room], alt: '' }),
      el('span', { class: 'lib-view__frame', 'aria-hidden': 'true' }),
      el('span', { class: 'lib-view__shutter', 'aria-hidden': 'true', style: shutter ? 'opacity:0.85' : null })),
    el('div', { class: 'lib-who', 'aria-hidden': 'true' }, seats.length ? seats.map(x => chip(x)) : el('span', { class: 'lib-empty' }, 'Empty')));
}
function print(room, seatIds) {
  const seats = (seatIds ?? []).map(seatOf);
  return el('div', { class: 'lib-print', role: 'img', 'aria-label': seats.length ? `Captured: ${seats.map(x => `Player ${x.n}, ${x.name}`).join(', ')}` : 'Captured no one' },
    el('span', { class: 'lib-pinned', 'aria-hidden': 'true' }),
    el('div', { class: 'lib-print__window' }, el('img', { class: 'lib-print__room', src: ROOM_ART[room], alt: '' }), seats.length ? el('div', { class: 'lib-chips' }, seats.map(x => chip(x))) : null, el('span', { class: 'lib-print__develop' })),
    el('span', { class: 'lib-print__paper', 'aria-hidden': 'true' }));
}
export function engineerView(s, { room = 'Room B' } = {}) {
  const seats = list => (list ?? []).map(seatOf);
  switch (s.state) {
    case 'available': return strip(C.tapeCapture(s.room), null, roomView(s.room, s.preview), words(C.captureAsk(s.room, seats(s.preview))), words(C.captureOnce, 'lib-note'), buttons(C.captureButton(s.room), C.notNow));
    case 'sending': return strip(C.tapeCapture(room), C.stampSending, roomView(room, [5, 6], { shutter: false }), words(C.captureSending));
    case 'captured': return strip(C.tapeCapture(room), C.stampCaptured, print(room, s.seatIds), words(C.captured(seats(s.seatIds), s.round)));
    case 'used': return file('engineer', C.tapeEngineer, s.seatIds ? print(room, s.seatIds) : prop('clamp-used'), el('div', { class: 'lib-file__words' }, words(C.captureUsed(s.seatIds ? seats(s.seatIds) : null, s.round)), el('span', { class: 'lib-stamp-slot' }, stamp(C.stampUsed))));
    case 'unavailable': return file('engineer', C.tapeEngineer, prop('clamp'), el('div', { class: 'lib-file__words' }, words(C.engineerRule, 'lib-note'), el('p', { class: 'lib-blocker' }, blockerWords(s.blockers ?? []))));
    default: return words('Not the Engineer: nothing is drawn.', 'lib-note');
  }
}

// ---------- the cases: a view each, its state from the map ----------

const fieldText = (v, extra = '') => `round ${v.round} · ${v.phase.kind} · active ${v.activeSeatId} · ${Object.entries(v.abilities).filter(([, x]) => x !== false).map(([k, x]) => `${k} ${JSON.stringify(x)}`).join(' · ') || 'no ability flags set'} · offers [${v.offers.map(o => o.type).join(', ')}]${extra}`;

function hackerCases() {
  const H = o => view({ role: 'Hacker', seat: HACKER, ...o });
  const out = [];
  const add = (label, v, opts, draw) => { const s = draw.state(v, opts); out.push(card(`${draw.name}: ${s.state}${label ? ` (${label})` : ''}`, fieldText(v, opts?.pending ? ` · pending ${opts.pending}` : ''), draw.view(s, opts?.drawOptions))); };
  const FC = { name: 'final Code', state: finalCodeState, view: finalCodeView };
  add('', H({ round: 1 }), {}, FC);
  add('choosing, 2 of 4', H({ offers: ['SUBMIT_CODE'] }), { drawOptions: { picks: [2, 6].map(seatOf) } }, FC);
  add('', H({ offers: ['SUBMIT_CODE'] }), {}, FC);
  add('', H({ offers: ['SUBMIT_CODE'] }), { pending: 'SUBMIT_CODE' }, FC);
  add('', H({ abilities: { codeAttempted: true, shipHackUnlocked: true } }), {}, FC);
  add('', H({ abilities: { codeAttempted: true } }), {}, FC);
  add('after navigation', H({ phase: 'JAIL_VOTE', active: null }), {}, FC);
  const SF = { name: 'ship hack', state: shipHackState, view: shipFileView };
  add('', H({}), {}, SF);
  add('not your turn', H({ abilities: { codeAttempted: true, shipHackUnlocked: true }, active: 5 }), {}, SF);
  add('Injured', H({ abilities: { codeAttempted: true, shipHackUnlocked: true }, health: 'Injured', location: 'Hospital' }), {}, SF);
  add('Role Action used', H({ abilities: { codeAttempted: true, shipHackUnlocked: true }, roleActionSpent: true }), {}, SF);
  add('', H({ abilities: { codeAttempted: true, shipHackUnlocked: true }, offers: ['ACTIVATE_SHIP_HACK'] }), {}, SF);
  add('', H({ abilities: { codeAttempted: true, shipHackUnlocked: true, shipHackSpent: true, shipHackRound: 3 } }), {}, SF);
  add('round known, later round', H({ round: 4, abilities: { codeAttempted: true, shipHackUnlocked: true, shipHackSpent: true, shipHackRound: 3 } }), {}, SF);
  add('round not in the view (R9)', H({ abilities: { codeAttempted: true, shipHackUnlocked: true, shipHackSpent: true } }), {}, SF);
  const SS = { name: 'ship hack strip', state: shipHackState, view: shipStripView };
  add('', H({ abilities: { codeAttempted: true, shipHackUnlocked: true }, offers: ['ACTIVATE_SHIP_HACK'] }), {}, SS);
  add('', H({ abilities: { codeAttempted: true, shipHackUnlocked: true }, offers: ['ACTIVATE_SHIP_HACK'] }), { pending: 'ACTIVATE_SHIP_HACK' }, SS);
  add('', H({ abilities: { codeAttempted: true, shipHackUnlocked: true, shipHackSpent: true, shipHackRound: 3 } }), {}, SS);
  return out;
}

function engineerCases() {
  const E = o => view({ role: 'Engineer', seat: ENGINEER, ...o });
  const out = [];
  const add = (label, v, opts = {}) => { const s = engineerState(v, opts); out.push(card(`capture: ${s.state}${label ? ` (${label})` : ''}`, fieldText(v, opts.pending ? ` · pending ${opts.pending}` : ''), engineerView(s))); };
  add('two in Room B', E({ offers: ['ENGINEER_SUPPRESS'] }));
  add('Room B empty', E({ offers: ['ENGINEER_SUPPRESS'], places: { ...PLACES, 5: 'Room A', 6: 'Command Room' } }));
  add('', E({ offers: ['ENGINEER_SUPPRESS'] }), { pending: 'ENGINEER_SUPPRESS' });
  add('', E({ abilities: { engineerSpent: true, engineerCapture: { round: 3, seatIds: [6, 5] } } }));
  add('later round', E({ round: 4, abilities: { engineerSpent: true, engineerCapture: { round: 3, seatIds: [5, 6] } } }));
  add('record not in the view (R8)', E({ abilities: { engineerSpent: true } }));
  add('not your turn', E({ active: 2 }));
  add('in the Command Room', E({ location: 'Command Room' }));
  add('in the Jail', E({ location: 'Jail', jailed: true }));
  return out;
}

function trayCards() {
  const tray = (art, title, sub) => el('div', { class: 'lib-tray' }, prop(art), el('div', {}, el('strong', {}, title), el('span', {}, sub)));
  return [
    card('tray: ship hack', 'offers [ACTIVATE_SHIP_HACK]: the tray shows the mark only where the view offers the action', tray('icon-ship-hack', 'Ship hack', 'Use it once')),
    card('tray: capture', 'offers [ENGINEER_SUPPRESS]', tray('icon-capture', 'Capture', 'Room B, once')),
  ];
}

// ---------- motion players ----------

const players = {};
function player(kind, title, build) {
  const stage = el('div', { class: 'lib-player__stage' });
  const range = el('input', { type: 'range', min: '0', max: String(motionEnd(kind)), value: '0', step: '10', 'aria-label': `${title} time` });
  const time = el('span', {}, '0 ms');
  const play = el('button', { type: 'button' }, 'Play');
  const node = card(`motion: ${kind}`, `${MOTION[kind].end} ms full · ${MOTION.reduced.end} ms reduced · plays once, on the accepted receipt`, el('div', { class: 'lib-player' }, stage, el('div', { class: 'lib-player__controls' }, play, range, time)));
  let parts = build(stage);
  const seek = t => {
    const end = motionEnd(kind, reduced);
    range.max = String(end);
    const f = FRAMES[kind](Math.min(t, end), { reduced });
    parts.apply(f);
    range.value = String(Math.round(t));
    time.textContent = `${Math.round(Math.min(t, end))} ms`;
  };
  range.addEventListener('input', () => seek(Number(range.value)));
  play.addEventListener('click', () => {
    const start = performance.now();
    const tick = now => { const t = now - start; seek(t); if (t < motionEnd(kind, reduced)) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  players[kind] = { seek, rebuild: () => { stage.replaceChildren(); parts = build(stage); seek(0); } };
  seek(0);
  return node;
}

/** Each motion's nodes and how a frame moves them; reduced frames cross-fade a 'before' and an 'after' layer. */
const STAGES = {
  insert: stage => {
    const before = el('div', { class: 'lib-ship' }, port());
    const after = el('div', { class: 'lib-ship' }, port({ seated: true }));
    const s = stamp(C.stampRetained);
    const box = strip(C.tapeShipHack, null, el('div', { style: 'display:grid' }, el('div', { style: 'grid-area:1/1' }, before), el('div', { style: 'grid-area:1/1' }, after)), el('span', { class: 'lib-stamp-slot' }, s));
    stage.append(box);
    const cart = before.querySelector('[data-art="cartridge"]');
    const sparkNode = prop('spark');
    after.querySelector('.lib-ship__port').append(sparkNode);
    return {
      apply(f) {
        if (f.reduced) { before.style.opacity = String(f.before); after.style.opacity = String(f.after); cart.style.transform = ''; sparkNode.style.opacity = '0'; }
        else {
          before.style.opacity = f.seated ? '0' : '1'; after.style.opacity = f.seated ? '1' : '0';
          cart.style.transform = `translate(${-81 * f.cartridge.travel}px, ${f.cartridge.arc}px)`;
          after.style.transform = `scale(${f.clunk})`;
          sparkNode.style.opacity = String(f.spark.opacity); sparkNode.style.transform = `scale(${f.spark.scale})`;
        }
        s.style.opacity = String(f.stamp.opacity); s.style.transform = `rotate(-8deg) scale(${f.stamp.scale})`;
      },
    };
  },
  unlock: stage => {
    const code = codeWithPunch(PICKS, true);
    const punch = code.querySelector('[data-art="punch"]');
    const sealed = prop('cartridge-sealed'), open = prop('cartridge');
    const s = stamp(C.stampUnlocked);
    stage.append(strip(C.tapeFinalCode, null, code, el('div', { style: 'display:grid;justify-items:start' }, el('div', { style: 'grid-area:1/1' }, sealed), el('div', { style: 'grid-area:1/1;padding:10px 4px' }, open)), el('span', { class: 'lib-stamp-slot' }, s)));
    return {
      apply(f) {
        if (f.reduced) { punch.style.opacity = String(f.after); sealed.style.opacity = String(f.before); open.style.opacity = String(f.after); open.style.transform = ''; }
        else { punch.style.opacity = String(f.punch); code.style.transform = `translateY(${f.cardNudge}px)`; sealed.style.opacity = String(f.bag); open.style.opacity = String(1 - f.bag); open.style.transform = `translateY(${f.lift}px)`; }
        s.style.opacity = String(f.stamp.opacity); s.style.transform = `rotate(-8deg) scale(${f.stamp.scale})`;
      },
    };
  },
  wrong: stage => {
    const code = codeWithPunch(PICKS, true);
    const punch = code.querySelector('[data-art="punch"]');
    const s = stamp(C.stampWrong);
    stage.append(strip(C.tapeFinalCode, null, code, el('span', { class: 'lib-stamp-slot' }, s)));
    return {
      apply(f) {
        punch.style.opacity = String(f.reduced ? f.after : f.punch);
        code.style.transform = f.reduced ? '' : `translateY(${f.cardNudge}px)`;
        s.style.opacity = String(f.stamp.opacity); s.style.transform = `rotate(-8deg) scale(${f.stamp.scale})`;
      },
    };
  },
  capture: stage => {
    const view = roomView('Room B', [5, 6]);
    const frame = view.querySelector('.lib-view__frame'), shutter = view.querySelector('.lib-view__shutter');
    const pic = print('Room B', [5, 6]);
    const develop = pic.querySelector('.lib-print__develop');
    const s = stamp(C.stampCaptured);
    stage.append(strip(C.tapeCapture('Room B'), null, el('div', { style: 'display:grid;justify-items:center' }, el('div', { style: 'grid-area:1/1;width:100%' }, view), el('div', { style: 'grid-area:1/1;padding-top:6px' }, pic)), el('span', { class: 'lib-stamp-slot' }, s)));
    return {
      apply(f) {
        if (f.reduced) { view.style.opacity = String(f.before); pic.style.opacity = String(f.after); develop.style.opacity = '0'; pic.style.transform = ''; frame.style.transform = ''; shutter.style.opacity = '0'; }
        else {
          frame.style.transform = `scale(${f.brackets})`; shutter.style.opacity = String(f.shutter); view.style.opacity = String(f.viewfinder);
          pic.style.opacity = String(f.print.opacity); pic.style.transform = `translateY(${f.print.y}px) rotate(${f.print.rotate}deg)`; develop.style.opacity = String(f.develop);
        }
        s.style.opacity = String(f.stamp.opacity); s.style.transform = `rotate(-8deg) scale(${f.stamp.scale})`;
      },
    };
  },
};

// ---------- the page ----------

async function loadArt() {
  await loadBundles(['public-board', 'player-ui', 'roles']);
  for (const [href, mark] of [['../../abilities/assets/abilities.art.css', 'abilities'], ['./assets/library.art.css', 'library']]) {
    await new Promise(resolve => {
      const link = el('link', { rel: 'stylesheet', href: new URL(href, import.meta.url).href });
      link.addEventListener('load', () => { root.dataset.art = `${root.dataset.art ?? ''} ${mark}`.trim(); resolve(); }, { once: true });
      link.addEventListener('error', resolve, { once: true });
      document.head.append(link);
    });
  }
}

function controls() {
  const sel = (id, label, options, value, on) => {
    const s = el('select', { id }, options.map(([v, t]) => el('option', { value: v, selected: v === value ? true : null }, t)));
    s.addEventListener('change', () => on(s.value));
    return el('label', { for: id }, label, s);
  };
  const go = (k, v) => { const url = new URL(location.href); url.searchParams.set(k, v); location.href = url.href; };
  const motion = sel('lib-motion', 'Motion', [['full', 'Full'], ['reduced', 'Reduced']], reduced ? 'reduced' : 'full', v => { reduced = v === 'reduced'; root.dataset.motion = v; for (const p of Object.values(players)) p.rebuild(); });
  return el('div', { class: 'lib-controls' },
    sel('lib-w', 'Sheet width', [['390', '390 px'], ['320', '320 px']], params.get('w') ?? '390', v => go('w', v)),
    sel('lib-text', 'Text', [['1', '100%'], ['2', '200%']], params.get('text') ?? '1', v => go('text', v)),
    motion);
}

async function main() {
  await loadArt();
  const app = document.getElementById('lib-app');
  const only = params.get('only');
  const group = (id, title, cards) => (only && only !== id ? null : el('section', { class: 'lib-group', id: `lib-${id}`, 'aria-label': title }, el('h2', {}, title), el('div', { class: 'lib-cards' }, cards)));
  app.replaceChildren(...[
    el('header', { class: 'lib-head' },
      el('h1', {}, 'Library group 1: Hack Spaceship and Engineer'),
      el('p', {}, 'Every state is computed by states.mjs from a synthetic player view (protocol 3 candidate fields) and drawn with the ability dossier’s parts and this group’s props. Private: the seat’s own open card only. Words are proposals for Frontend. Synthetic players: Ada, Ben, Cleo (the Hacker), Dev (the Engineer), Eli, Fay, Gus, Hana, Ivo.'),
      controls()),
    group('hacker', 'Hacker: final Code and ship hack', hackerCases()),
    group('engineer', 'Engineer: capture (nine players)', engineerCases()),
    group('tray', 'Actions tray marks', trayCards()),
    group('motion', 'Motion (on the accepted receipt)', [player('unlock', 'Unlock', STAGES.unlock), player('wrong', 'Wrong Code', STAGES.wrong), player('insert', 'Ship hack registered', STAGES.insert), player('capture', 'Capture registered', STAGES.capture)]),
  ].filter(Boolean));
  app.removeAttribute('aria-busy');
  window.__lib = { ready: true, seek: (kind, t) => players[kind]?.seek(t), setReduced: on => { reduced = on; root.dataset.motion = on ? 'reduced' : 'full'; for (const p of Object.values(players)) p.rebuild(); } };
}

main().catch(error => { document.getElementById('lib-app').textContent = `Review page failed: ${error.message}`; window.__lib = { ready: false, error: error.message }; throw error; });
