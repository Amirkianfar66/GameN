// mothership:dev-only
//
// Join and waiting's preview: the runtime components themselves (../join-form.mjs and ../join-wait.mjs,
// unchanged) on the phone pack's synthetic fixtures (design/phone-ui/prototype/fixtures.mjs: invented names and
// the review room code), in each state Frontend checks, at the two development phone sizes. The name's count,
// its limit and the errors stand in for what Frontend gives from the contracts and the server: the pack's words.
//   index.html                                      every state
//   index.html?single=1&size=390x844&state=empty    one phone, for the check's captures
//   index.html?single=1&probe=1                     the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                     each screen beside the frozen pack (agree.mjs), for the check

import { mountJoinForm, JOIN_WORDS } from '../join-form.mjs';
import { mountJoinWait, WAIT_WORDS } from '../join-wait.mjs';
import { FIXTURE_LABEL, ROOM_CODE, ROSTER, SELF } from '../../../prototype/fixtures.mjs';

/** The development phone sizes, with the pack's review frames' safe areas. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
});
const MAX = 12;
const SELF_NAME = ROSTER.find(p => p.seat === SELF).name;
/** The form as Frontend would give it: the code and the name kept, the count as the contract counts it, Ask's availability. */
export function formOf({ code = ROOM_CODE, name = SELF_NAME, device = 'player', codeError = null, nameError = null, error = null, ask = null } = {}) {
  const ready = [...code].length === 6 && name.length > 0 && !nameError;
  return { code, name, nameCount: [...name].length, nameMax: MAX, device, codeError, nameError, error, ask: ask ?? (ready ? { enabled: true } : { enabled: false }) };
}
/** Waiting as Frontend would give it: the room, this phone's name, and once admitted its seat and the seats taken. */
export function waitOf({ view = 'pending', filled = 5, error = null, check = null } = {}) {
  return { view, roomCode: ROOM_CODE, name: SELF_NAME, seat: view === 'admitted' ? SELF : null, error, check: check ?? { enabled: true },
    members: view === 'admitted' ? ROSTER.filter(p => p.seat <= filled).map(p => ({ seat: p.seat, name: p.name })) : [], seats: view === 'admitted' ? { filled, total: 9 } : null };
}
const OFF_ASK = Object.freeze({ enabled: false, reason: JOIN_WORDS.offline });
const OFF_CHECK = Object.freeze({ enabled: false, reason: WAIT_WORDS.offline });

/** Each state of sheets 12 and 13 and the ones around them: which screen, its input, and where the focus is. */
export const PREVIEW_STATES = Object.freeze({
  empty: { caption: 'Empty · sheet 12', screen: 'form', input: formOf({ code: 'K7', name: '' }), focus: 'code' },
  'no-room': { caption: 'No such room · sheet 12', screen: 'form', input: formOf({ codeError: JOIN_WORDS.noRoom }) },
  started: { caption: 'Already started', screen: 'form', input: formOf({ codeError: JOIN_WORDS.started }) },
  name: { caption: 'Name too long · sheet 12', screen: 'form', input: formOf({ name: 'Devendra Kumar', nameError: JOIN_WORDS.nameRule(MAX) }), focus: 'name' },
  sending: { caption: 'Sending · sheet 12', screen: 'form', input: formOf({ ask: { enabled: true, busy: true } }) },
  busy: { caption: 'Busy · sheet 13', screen: 'form', input: formOf({ error: JOIN_WORDS.busy }) },
  display: { caption: 'Shared display chosen', screen: 'form', input: formOf({ device: 'display' }) },
  offline: { caption: 'Form offline', screen: 'form', input: formOf({ error: JOIN_WORDS.offline, ask: OFF_ASK }) },
  pending: { caption: 'Waiting for the host · sheet 13', screen: 'wait', input: waitOf() },
  admitted: { caption: 'Admitted · lobby · sheet 13', screen: 'wait', input: waitOf({ view: 'admitted' }) },
  closed: { caption: 'Room started without you · sheet 13', screen: 'wait', input: waitOf({ view: 'closed' }) },
  declined: { caption: 'Not admitted', screen: 'wait', input: waitOf({ view: 'declined' }) },
  'wait-offline': { caption: 'Waiting offline', screen: 'wait', input: waitOf({ error: WAIT_WORDS.offline, check: OFF_CHECK }) },
  'form-large': { caption: 'Largest text (200%) · no such room', screen: 'form', input: formOf({ codeError: JOIN_WORDS.noRoom }), text: 200 },
  'wait-large': { caption: 'Largest text (200%) · the lobby', screen: 'wait', input: waitOf({ view: 'admitted' }), text: 200 },
});

const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const handlers = Object.fromEntries(['onBack', 'onCode', 'onName', 'onDevice', 'onAsk', 'onCancel', 'onCheck', 'onLeave'].map(n => [n, record(n)]));
const params = new URLSearchParams(location.search);
const mounted = [];
/** Mounts a state's screen in `host`, and puts the focus where the state has it. */
export function mountScreen(host, s, insets, h = handlers) {
  const screen = (s.screen === 'form' ? mountJoinForm : mountJoinWait)(host, { ...s.input, insets }, h);
  if (s.focus) screen.focus(s.focus);
  return screen;
}

function phone(sizeKey, key) {
  const size = PREVIEW_SIZES[sizeKey], s = PREVIEW_STATES[key];
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  return { frame, mount: () => mountScreen(frame, s, size.insets) };
}

let probe = null, agree = null;
if (params.get('agree')) {
  document.body.classList.add('pv-single');
  agree = document.fonts.ready.then(() => import('./agree.mjs')).then(m => m.runJoinRoomAgreement({ sizes: PREVIEW_SIZES, states: PREVIEW_STATES }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runJoinRoomProbe({ sizes: PREVIEW_SIZES, formOf, waitOf }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const key = params.get('state') ?? 'empty', sizeKey = params.get('size') ?? '390x844';
  if (!PREVIEW_STATES[key] || !PREVIEW_SIZES[sizeKey]) throw new Error(`Unknown size or state: ${sizeKey} ${key}`);
  if (PREVIEW_STATES[key].text) document.documentElement.style.fontSize = `${PREVIEW_STATES[key].text}%`;
  const p = phone(sizeKey, key);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Join and waiting · preview</h1><p>The runtime components on the pack's sample room. ${FIXTURE_LABEL}. Desktop browser at each phone’s CSS size: not a phone.</p>`;
  const grid = document.createElement('div');
  grid.className = 'pv-grid';
  document.body.append(head, grid);
  for (const [key, s] of Object.entries(PREVIEW_STATES)) {
    if (s.text) continue;
    for (const sizeKey of Object.keys(PREVIEW_SIZES)) {
      const cell = document.createElement('figure');
      cell.className = 'pv-cell';
      const caption = document.createElement('figcaption');
      caption.innerHTML = `${s.caption}<small>${sizeKey.replace('x', ' × ')} · state=${key}</small>`;
      const p = phone(sizeKey, key);
      cell.append(caption, p.frame);
      grid.append(cell);
      mounted.push(p.mount());
    }
  }
}

window.__joinRoom = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};
