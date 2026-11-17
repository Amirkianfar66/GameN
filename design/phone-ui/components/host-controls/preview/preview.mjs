// mothership:dev-only
//
// Host controls' preview: the runtime component itself (../host-controls.mjs, unchanged) on the phone pack's
// synthetic fixtures, in each state Frontend checks, at the two development phone sizes: the body in the phone
// shell's sheet (../../phone-shell, unchanged; its frame and footer from hostControlsSheet()) over Room A
// (../../room-scene, unchanged), as sheet 15 draws it. The commands' states, their reasons and the issued code stand
// in for what Frontend gives from the session and the server: the pack's sample code and Match ID.
//   index.html                                      every state
//   index.html?single=1&size=390x844&state=list     one phone, for the check's captures
//   index.html?single=1&probe=1                     the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                     the sheet beside the frozen pack (agree.mjs), for the check

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { mountHostControls, hostControlsSheet, HOST_WORDS } from '../host-controls.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { ROOM_NAMES, mountRoomScene } from '../../room-scene/room-scene.mjs';
import { SKY_EPOCH } from '../../room-scene/ambient.mjs';
import { ROOM_ART, ROOM_ART_RELEASE } from '../../room-scene/room-art.mjs';
import { ROOM_EXTENSION } from '../../room-scene/room-extension.mjs';
import { FIXTURE_LABEL, ROOM_FIXTURES, ROSTER, SELF, board, seatOf } from '../../../prototype/fixtures.mjs';

/** The development phone sizes, with the pack's review frames' safe areas. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
});

// The release's pictures, the room scene's extension and the crew's portraits, on the CSS properties the game's
// bundles define (room-art.mjs, room-extension.mjs, crewPortraitVariable), as the shell's preview sets them.
for (const art of Object.values(ROOM_ART)) {
  for (const { property, file } of [art.back, ...art.layers, art.dark]) {
    document.documentElement.style.setProperty(property, `url("${new URL(`../../../../room-drawing/assets/${file}`, import.meta.url).href}")`);
  }
}
for (const ext of Object.values(ROOM_EXTENSION)) {
  for (const { property, file } of [ext.lit, ext.dark]) {
    document.documentElement.style.setProperty(property, `url("${new URL(`../../room-scene/assets/${file}`, import.meta.url).href}")`);
  }
}
for (let n = 1; n <= 9; n += 1) {
  document.documentElement.style.setProperty(`--ms-asset-crew-portrait-c${n}`, `url("${new URL(`../../../../crew-drawing/assets/portraits/portrait-c${n}.svg`, import.meta.url).href}")`);
}
/** A match pinned to the crew release, as the game's crew runtime requires to draw the approved crew. */
export const versions = Object.freeze({ assetManifestVersion: 'design-0.9.0', ...PLANET_FOOD_TASK_PINS });

// ── Room A in a match, as sheet 15 draws it behind Host controls: Gus's turn, Round 3, 0:42, ⋮ open ──
const fixture = ROOM_FIXTURES['room-a'];
const person = n => { const p = seatOf(n); return { seat: p.seat, name: p.name, character: p.character }; };
const people = board({ place: fixture.place }).filter(p => p.location === ROOM_NAMES['room-a']).map(p => ({
  seat: p.seat, slot: p.slot, character: p.character, name: p.name, health: p.health,
  office: fixture.offices.captain === p.seat ? 'captain' : fixture.offices.officer === p.seat ? 'officer' : null,
}));
const clock = { now: () => SKY_EPOCH + 130 * 1000 };
export const room = Object.freeze({ room: 'room-a', roster: 9, people, self: SELF, active: fixture.active, versions, clock, control: null, roomArt: ROOM_ART_RELEASE });
/** The shell around the sheet: the pack's turnBar({ open: 'menu' }) and plain tabs; the sheet from hostControlsSheet(). */
export const shellOf = (input, extra = {}) => ({
  viewer: SELF, versions,
  bar: { kind: 'turn', who: person(fixture.active), self: false, round: 3, timer: { remainingMs: 42000 }, promises: { count: 0 }, menu: { open: true } },
  tabs: { variant: 'game', view: 'room', hero: { mode: 'pass', enabled: false } },
  sheet: hostControlsSheet(input),
  ...extra,
});

// ── What Frontend gives, standing in: the pack's sample seats, Match ID and code ──
const ON = Object.freeze({ enabled: true });
/** The seats the pack lists for a code (ROSTER.slice(0, 5)), as Frontend would give them. */
export const SEATS = Object.freeze(ROSTER.slice(0, 5).map(p => Object.freeze({ seat: p.seat, name: p.name, character: p.character, enabled: true })));
export const MATCH_ID = 'mtch-8f2c4e';
export const SAMPLE_CODE = 'q7Hc2-Lm9xT-4ZpWd-8rVnK-2bYs6-Jt';
/**
 * Standing in for the server's own (0.1.2): a code as `issueRecovery` makes it (randomBytes(24) in base64url: 32
 * characters, a hyphen or underscore among them) and a Match ID as `create` makes it (a UUID). Synthetic, not a code.
 */
export const REAL_CODE = 'Zq3x_9Lk-T2vWm8RbYc4N7hJ-pQs0FdE';
export const REAL_MATCH_ID = '3f2a1b4c-9d8e-4f7a-b6c5-1234567890ab';
const dev = seatOf(SELF);
export const codeOf = (revealed, minutes = 15, { matchId = MATCH_ID, value = SAMPLE_CODE } = {}) => ({ seat: dev.seat, name: dev.name, matchId, revealed, value: revealed ? value : null, minutes });
const realOf = revealed => codeOf(revealed, 15, { matchId: REAL_MATCH_ID, value: REAL_CODE });
export const inputOf = (extra = {}) => ({ view: 'list', viewer: SELF, versions, deadline: ON, bots: ON, abort: ON, seats: SEATS, code: null, ...extra });
/** Frontend's words for a refusal, standing in. */
export const REFUSED = Object.freeze({ deadline: 'The deadline has not passed yet' });
/** The session's words while its own request's outcome is unknown (0.1.1, Retry), standing in. */
export const UNSURE = 'Session request outcome unknown. Retry the original request.';
const waits = Object.freeze({ enabled: false, reason: UNSURE });
const copied = { id: 'copied', text: HOST_WORDS.copied, icon: 'check' };

/** Each state Frontend checks: the component's input, the shell's extra input, and the text size. */
export const PREVIEW_STATES = Object.freeze({
  list: { caption: 'Host controls · sheet 15', input: inputOf() },
  busy: { caption: 'Run bots in flight', input: inputOf({ bots: { enabled: true, busy: true } }) },
  refused: { caption: 'Check the deadline refused · Frontend’s reason', input: inputOf({ deadline: { enabled: false, reason: REFUSED.deadline } }) },
  code: { caption: 'Code · hidden · sheet 15', input: inputOf({ view: 'code', code: codeOf(false) }) },
  revealed: { caption: 'Code · revealed · sheet 15', input: inputOf({ view: 'code', code: codeOf(true) }) },
  copied: { caption: 'Code · copied (the shell’s toast)', input: inputOf({ view: 'code', code: codeOf(false) }), shell: { toast: copied } },
  abort: { caption: 'Abort · confirm · sheet 15', input: inputOf({ view: 'abort' }) },
  aborting: { caption: 'Abort in flight', input: inputOf({ view: 'abort', abort: { enabled: true, busy: true } }) },
  retry: { caption: 'Retry · the session’s request waits to be sent again (0.1.1)', input: inputOf({ deadline: waits, bots: waits, abort: waits, seats: SEATS.map(s => ({ ...s, ...waits })), retry: { enabled: true } }) },
  stale: { caption: 'Reconnecting · commands wait', input: inputOf({ status: 'stale' }), shell: { status: 'stale', banner: { kind: 'reconnecting' } } },
  largest: { caption: 'Code · revealed · Largest text (200 %)', input: inputOf({ view: 'code', code: codeOf(true) }), text: 200 },
  // 0.1.2: the server's own formats, revealed: the code wraps only between its groups of six, the Match ID after a hyphen.
  real: { caption: 'Code · revealed · the server’s format (0.1.2)', input: inputOf({ view: 'code', code: realOf(true) }) },
  'real-largest': { caption: 'Code · revealed · the server’s format · Largest text (0.1.2)', input: inputOf({ view: 'code', code: realOf(true) }), text: 200 },
});

const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const handlers = Object.fromEntries(['onDeadline', 'onBots', 'onIssueRecovery', 'onAbortAsk', 'onFocusReturn'].map(n => [n, record(n)]));
const shellHandlers = Object.fromEntries(['onSheetAction', 'onSheetBack', 'onSheetClose', 'onRetry'].map(n => [n, record(n)]));
const params = new URLSearchParams(location.search);
const mounted = [];

/**
 * Mounts a state in `frame` (a phone-sized host): the shell with Room A in its stage, its sheet from
 * hostControlsSheet(), and the body in the sheet's body. Returns { host, shell, scene, input }.
 */
export function mountState(frame, key, insets, extra = {}, { input: given = null, still = true } = {}) {
  const s = PREVIEW_STATES[key];
  const input = given ?? s.input;
  let scene = null;
  const shell = mountPhoneShell(frame, { ...shellOf(input, s.shell), insets }, { ...shellHandlers, ...extra, onLayout: layout => scene?.update({ size: layout.stage }) });
  scene = mountRoomScene(shell.stage, { ...room, size: shell.layout().stage }, {});
  if (still) scene.suspend();
  const host = mountHostControls(shell.sheetBody, input, { ...handlers, ...extra });
  return { host, shell, scene, input };
}
export const disposeState = m => { m.host.dispose(); m.scene?.dispose(); m.shell?.dispose(); };

function phone(sizeKey, key) {
  const size = PREVIEW_SIZES[sizeKey];
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  return { frame, mount: () => mountState(frame, key, size.insets) };
}

let probe = null, agree = null;
if (params.get('agree')) {
  document.body.classList.add('pv-single');
  agree = document.fonts.ready.then(() => import('./agree.mjs')).then(m => m.runHostControlsAgreement({ sizes: PREVIEW_SIZES, states: PREVIEW_STATES, mountState, disposeState }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runHostControlsProbe({ sizes: PREVIEW_SIZES, mountState, disposeState, inputOf, codeOf, SAMPLE_CODE, REAL_CODE, REAL_MATCH_ID, SEATS, REFUSED }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const key = params.get('state') ?? 'list', sizeKey = params.get('size') ?? '390x844';
  if (!PREVIEW_STATES[key] || !PREVIEW_SIZES[sizeKey]) throw new Error(`Unknown size or state: ${sizeKey} ${key}`);
  if (PREVIEW_STATES[key].text) document.documentElement.style.fontSize = `${PREVIEW_STATES[key].text}%`;
  const p = phone(sizeKey, key);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Host controls · preview</h1><p>The runtime component on the host’s phone (Player 4), in the shell’s sheet over Room A. ${FIXTURE_LABEL}. Desktop browser at each phone’s CSS size: not a phone.</p>`;
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

window.__hostControls = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};
