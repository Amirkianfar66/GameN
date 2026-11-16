// mothership:dev-only
//
// Host setup and the host lobby's preview: the runtime components themselves (../host-setup.mjs and
// ../host-lobby.mjs, unchanged) on the phone pack's synthetic fixtures (design/phone-ui/prototype/fixtures.mjs:
// invented names and the review room code), in each state Frontend checks, at the two development phone sizes.
// The team mix per count, the bot range and Start's reason stand in for what Frontend gives from the ruleset
// and the server: the pack's own words.
//   index.html                                      every state
//   index.html?single=1&size=390x844&state=lobby    one phone, for the check's captures
//   index.html?single=1&probe=1                     the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                     each screen beside the frozen pack (agree.mjs), for the check

import { mountHostSetup } from '../host-setup.mjs';
import { mountHostLobby, LOBBY_WORDS } from '../host-lobby.mjs';
import { FIXTURE_LABEL, ROOM_CODE, seatOf } from '../../../prototype/fixtures.mjs';

/** The development phone sizes, with the pack's review frames' safe areas. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
});
/** The counts and their team mix, as the pack writes them (Frontend's, from the ruleset). */
export const COUNTS = Object.freeze([
  { value: 7, mix: '4 Blue · 2 Red · 1 Alien' }, { value: 8, mix: '4 Blue · 3 Red · 1 Alien' }, { value: 9, mix: '5 Blue · 3 Red · 1 Alien' },
]);
const setup = (count, extra = {}) => ({ counts: COUNTS, count, ...extra });

/** The lobby as the pack draws it: the seats taken, the bots, the requests, and Start with its reason. */
export function lobbyOf({ humans = 5, bots = 0, requests = [], copied = false, toast = null, notice = null, total = 9 } = {}) {
  const people = Array.from({ length: humans }, (_, i) => seatOf(i + 1));
  const filled = humans + bots;
  const off = reason => ({ enabled: false, reason });
  const offline = notice === 'offline';
  return {
    roomCode: ROOM_CODE, copied, toast, notice, seats: { filled, total },
    members: [...people.map(p => ({ seat: p.seat, name: p.name, kind: p.seat === 1 ? 'host' : 'person' })),
      ...Array.from({ length: bots }, (_, i) => ({ seat: humans + i + 1, name: `Bot ${humans + i + 1}`, kind: 'bot' }))],
    requests: requests.map(r => ({ ...r, admit: offline ? off(LOBBY_WORDS.offline) : { enabled: true } })),
    bots: offline ? { count: bots, max: total - humans, ...off(LOBBY_WORDS.offline) } : { count: bots, max: total - humans, enabled: true },
    start: offline ? off(LOBBY_WORDS.offline) : filled < total ? off(`${total - filled} more ${total - filled === 1 ? 'seat' : 'seats'} to fill`) : { enabled: true },
  };
}
export const REQUESTS = Object.freeze([{ id: 'adm-gus', name: 'Gus', device: 'phone' }, { id: 'adm-table', name: 'Table', device: 'display' }]);
export const COPIED_TOAST = Object.freeze({ id: 'copied-1', text: 'Copied', icon: 'check' });

/** Each state of sheet 11 and the ones around it: which screen, and its input. */
export const PREVIEW_STATES = Object.freeze({
  setup: { caption: 'Setup · 9 · sheet 11', screen: 'setup', input: setup(9) },
  'setup-7': { caption: 'Setup · 7', screen: 'setup', input: setup(7) },
  opening: { caption: 'Opening…', screen: 'setup', input: setup(9, { open: { enabled: true, busy: true } }) },
  'setup-error': { caption: 'A failed opening', screen: 'setup', input: setup(9, { error: 'The room did not open. Try again.' }) },
  lobby: { caption: 'Lobby · 5 of 9 · sheet 11', screen: 'lobby', input: lobbyOf() },
  requests: { caption: 'Lobby · requests · sheet 11', screen: 'lobby', input: lobbyOf({ requests: REQUESTS }) },
  copied: { caption: 'Copied · sheet 11', screen: 'lobby', input: lobbyOf({ copied: true, toast: COPIED_TOAST }) },
  full: { caption: 'Full · Start · sheet 11', screen: 'lobby', input: lobbyOf({ humans: 6, bots: 3 }) },
  offline: { caption: 'Lobby offline', screen: 'lobby', input: lobbyOf({ requests: REQUESTS, notice: 'offline' }) },
  'setup-large': { caption: 'Largest text (200%) · setup', screen: 'setup', input: setup(9), text: 200 },
  'lobby-large': { caption: 'Largest text (200%) · requests', screen: 'lobby', input: lobbyOf({ requests: REQUESTS }), text: 200 },
});

const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const handlers = Object.fromEntries(['onBack', 'onCount', 'onOpen', 'onLeave', 'onCopy', 'onAdmit', 'onBots', 'onStart'].map(n => [n, record(n)]));
const params = new URLSearchParams(location.search);
const mounted = [];
export const mountScreen = (host, s, insets, h = handlers) => (s.screen === 'setup' ? mountHostSetup : mountHostLobby)(host, { ...s.input, insets }, h);

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
  agree = document.fonts.ready.then(() => import('./agree.mjs')).then(m => m.runHostRoomAgreement({ sizes: PREVIEW_SIZES, states: PREVIEW_STATES }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runHostRoomProbe({ sizes: PREVIEW_SIZES, states: PREVIEW_STATES, lobbyOf, REQUESTS, COUNTS }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const key = params.get('state') ?? 'setup', sizeKey = params.get('size') ?? '390x844';
  if (!PREVIEW_STATES[key] || !PREVIEW_SIZES[sizeKey]) throw new Error(`Unknown size or state: ${sizeKey} ${key}`);
  if (PREVIEW_STATES[key].text) document.documentElement.style.fontSize = `${PREVIEW_STATES[key].text}%`;
  const p = phone(sizeKey, key);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Host setup and lobby · preview</h1><p>The runtime components on the pack's sample room. ${FIXTURE_LABEL}. Desktop browser at each phone’s CSS size: not a phone.</p>`;
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

window.__hostRoom = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};
