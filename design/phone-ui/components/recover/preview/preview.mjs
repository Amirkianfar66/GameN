// mothership:dev-only
//
// Recover's preview: the runtime component itself (../recover.mjs, unchanged) on the phone pack's synthetic
// fixtures, in each state Frontend checks, at the two development phone sizes. The recovery code is typed into
// its box as a player would (it is never an input), a synthetic one: 32 x's, as the pack draws its dots.
//   index.html                                      every state
//   index.html?single=1&size=390x844&state=entry    one phone, for the check's captures
//   index.html?single=1&probe=1                     the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                     the screen beside the frozen pack (agree.mjs), for the check

import { mountRecover, RECOVER_WORDS } from '../recover.mjs';
import { FIXTURE_LABEL, SELF } from '../../../prototype/fixtures.mjs';

/** The development phone sizes, with the pack's review frames' safe areas. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
});
/** The pack's synthetic Match ID, and a synthetic code of the issued length. */
export const MATCH_ID = 'mtch-8f2c4e';
export const CODE_LENGTH = 32;
export const SAMPLE_CODE = 'x'.repeat(CODE_LENGTH);
const OFF = Object.freeze({ enabled: false, reason: RECOVER_WORDS.offline });

/** Each state of sheet 14 and the ones around it: the input, the code typed, and where the focus is. */
export const PREVIEW_STATES = Object.freeze({
  entry: { caption: 'Entry · sheet 14', input: { matchId: '', codeLength: CODE_LENGTH, recover: { enabled: false } }, focus: 'matchId' },
  ready: { caption: 'Both typed', input: { matchId: MATCH_ID, codeLength: CODE_LENGTH }, typed: SAMPLE_CODE },
  refused: { caption: 'Refused · sheet 14', input: { matchId: MATCH_ID, codeLength: CODE_LENGTH, codeError: RECOVER_WORDS.refused }, typed: SAMPLE_CODE },
  checking: { caption: 'Checking', input: { matchId: MATCH_ID, codeLength: CODE_LENGTH, recover: { enabled: true, busy: true } }, typed: SAMPLE_CODE },
  recovered: { caption: 'Seat recovered · sheet 14', input: { view: 'recovered', seat: SELF, matchId: MATCH_ID, codeLength: CODE_LENGTH } },
  offline: { caption: 'Offline', input: { matchId: MATCH_ID, codeLength: CODE_LENGTH, error: RECOVER_WORDS.offline, recover: OFF }, typed: SAMPLE_CODE },
  'no-hint': { caption: 'No length given', input: { matchId: '', codeLength: null, recover: { enabled: false } } },
  'refused-large': { caption: 'Largest text (200%) · refused', input: { matchId: MATCH_ID, codeLength: CODE_LENGTH, codeError: RECOVER_WORDS.refused }, typed: SAMPLE_CODE, text: 200 },
  'recovered-large': { caption: 'Largest text (200%) · recovered', input: { view: 'recovered', seat: SELF, matchId: MATCH_ID, codeLength: CODE_LENGTH }, text: 200 },
});

const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const handlers = Object.fromEntries(['onBack', 'onMatchId', 'onCode', 'onRecover', 'onContinue'].map(n => [n, record(n)]));
const params = new URLSearchParams(location.search);
const mounted = [];
/** Types a code into the screen's code box, as a player would: the box's own input event, character by character. */
export function typeCode(screen, code) {
  const box = screen.element.querySelector('input[type="password"]');
  if (!box) return;
  box.value = '';
  for (const ch of code) { box.value += ch; box.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' })); }
}
/** Mounts a state in `host`: the screen, the code typed, and the focus where the state has it. */
export function mountScreen(host, s, insets, h = handlers) {
  const screen = mountRecover(host, { ...s.input, insets }, h);
  if (s.typed) typeCode(screen, s.typed);
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
  agree = document.fonts.ready.then(() => import('./agree.mjs')).then(m => m.runRecoverAgreement({ sizes: PREVIEW_SIZES, states: PREVIEW_STATES }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runRecoverProbe({ sizes: PREVIEW_SIZES, typeCode, MATCH_ID, CODE_LENGTH }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const key = params.get('state') ?? 'entry', sizeKey = params.get('size') ?? '390x844';
  if (!PREVIEW_STATES[key] || !PREVIEW_SIZES[sizeKey]) throw new Error(`Unknown size or state: ${sizeKey} ${key}`);
  if (PREVIEW_STATES[key].text) document.documentElement.style.fontSize = `${PREVIEW_STATES[key].text}%`;
  const p = phone(sizeKey, key);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Recover · preview</h1><p>The runtime component on the pack's sample match. ${FIXTURE_LABEL}. Desktop browser at each phone’s CSS size: not a phone.</p>`;
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

window.__recover = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};
