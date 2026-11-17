// mothership:dev-only
//
// Character selection's preview: the runtime component itself (../character-select.mjs, unchanged) on the
// phone pack's synthetic fixtures (design/phone-ui/prototype/screens-entry.mjs ENTRY_SCREENS.choose: the
// nine in the pack's order, its call signs, who holds which, Player 4's choice), in each state Frontend
// checks, at the two development phone sizes. The names stand in for Frontend's crew data (CREW[id].sign).
//   index.html                                      every state
//   index.html?single=1&size=390x844&state=open     one phone, for the check's captures
//   index.html?single=1&probe=1                     the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                     the screen beside the frozen pack (agree.mjs), for the check

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { mountCharacterSelect, CHOOSE_WORDS } from '../character-select.mjs';
import { SIGN } from '../../../prototype/art.mjs';
import { FIXTURE_LABEL, SELF } from '../../../prototype/fixtures.mjs';

/** The development phone sizes, with the pack's review frames' safe areas. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
});

// The crew's portraits, on the CSS properties the game's crew bundle defines (crew-runtime.mjs crewPortraitVariable).
for (let n = 1; n <= 9; n += 1) {
  document.documentElement.style.setProperty(`--ms-asset-crew-portrait-c${n}`, `url("${new URL(`../../../../crew-drawing/assets/portraits/portrait-c${n}.svg`, import.meta.url).href}")`);
}
/** A match pinned to the crew release, as the game's crew runtime requires to draw the approved crew. */
export const versions = Object.freeze({ assetManifestVersion: 'design-0.9.0', ...PLANET_FOOD_TASK_PINS });

/** The nine, in the pack's order, with the names Frontend gives (the pack's call signs). */
export const CHARACTERS = Object.freeze(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9'].map(id => Object.freeze({ id, name: SIGN[id] })));
/** Who holds which, as the pack's screen has it: two at the open, five once the others have chosen. */
const EARLY = Object.freeze({ c4: 2, c8: 1 });
const LATER = Object.freeze({ c4: 2, c8: 1, c3: 5, c9: 6, c2: 8 });
const seconds = s => ({ remainingMs: s * 1000 });
const OFFER = Object.freeze({ enabled: true });
/** The screen's input, as Frontend gives it: the public grid and Player 4's own choice. */
export const choiceOf = ({ holders = LATER, mine = null, time = 21, closed = false, choose = OFFER, toast = null, ...extra } = {}) => ({
  viewer: SELF, versions, characters: CHARACTERS, holders, mine, timer: time === null ? null : seconds(time), closed, choose, toast, ...extra,
});
const juno = { id: 'assigned', text: CHOOSE_WORDS.assigned(SIGN.c7), icon: 'info' };

/** Each state of sheet 16 and the ones around it Frontend checks. */
export const PREVIEW_STATES = Object.freeze({
  open: { caption: 'Open · sheet 16', input: choiceOf({ holders: EARLY }) },
  selected: { caption: 'Selected · saving · sheet 16', input: choiceOf({ mine: { id: 'c6', state: 'saving' } }) },
  confirmed: { caption: 'Confirmed · taken · sheet 16', input: choiceOf({ mine: { id: 'c6', state: 'confirmed' } }) },
  closing: { caption: 'Last seconds · sheet 16', input: choiceOf({ mine: { id: 'c6', state: 'confirmed' }, time: 4 }) },
  auto: { caption: 'Assigned automatically · sheet 16', input: choiceOf({ mine: { id: 'c7', state: 'assigned' }, time: 0, closed: true, toast: juno }) },
  closed: { caption: 'Time is up · chosen before', input: choiceOf({ mine: { id: 'c6', state: 'confirmed' }, time: 0, closed: true }) },
  'not-offered': { caption: 'Choosing not offered · Frontend’s reason', input: choiceOf({ holders: EARLY, choose: { enabled: false, reason: 'Opens when every seat is filled' } }) },
  stale: { caption: 'Reconnecting', input: choiceOf({ mine: { id: 'c6', state: 'confirmed' }, status: 'stale' }) },
  large: { caption: 'Large text (150%) · confirmed', input: choiceOf({ mine: { id: 'c6', state: 'confirmed' } }), text: 150 },
  largest: { caption: 'Largest text (200%) · confirmed', input: choiceOf({ mine: { id: 'c6', state: 'confirmed' } }), text: 200 },
});

const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const handlers = Object.fromEntries(['onChoose', 'onRetry', 'onFocusReturn'].map(n => [n, record(n)]));
const params = new URLSearchParams(location.search);
const mounted = [];
/** Mounts a state's screen in `host`, at a size's safe areas. */
export const mountState = (host, key, insets, extra = {}) => mountCharacterSelect(host, { ...PREVIEW_STATES[key].input, insets }, { ...handlers, ...extra });

/** A phone at a development size, the screen in it. */
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
  agree = document.fonts.ready.then(() => import('./agree.mjs')).then(m => m.runCharacterSelectAgreement({ sizes: PREVIEW_SIZES, states: PREVIEW_STATES }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runCharacterSelectProbe({ sizes: PREVIEW_SIZES, choiceOf, characters: CHARACTERS }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const key = params.get('state') ?? 'open', sizeKey = params.get('size') ?? '390x844';
  if (!PREVIEW_STATES[key] || !PREVIEW_SIZES[sizeKey]) throw new Error(`Unknown size or state: ${sizeKey} ${key}`);
  if (PREVIEW_STATES[key].text) document.documentElement.style.fontSize = `${PREVIEW_STATES[key].text}%`;
  const p = phone(sizeKey, key);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Character selection · preview</h1><p>The runtime component on Player 4’s phone. ${FIXTURE_LABEL}. Desktop browser at each phone’s CSS size: not a phone.</p>`;
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

window.__charSelect = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};
