// mothership:dev-only
//
// The boarding stage's preview: the runtime component itself (../boarding-stage.mjs, unchanged) in each state
// Frontend checks, at the two development phone sizes. The film's place shows a still of the approved
// boarding film (Motion & Cinematics', dev-only here) on a review roster, where the game mounts its player.
//   index.html                                   every state
//   index.html?single=1&size=390x844&state=film  one phone, for the check's captures
//   index.html?single=1&probe=1                  the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                  the stage beside the frozen pack (agree.mjs), for the check

import { mountBoardingStage } from '../boarding-stage.mjs';
import { FIXTURE_LABEL } from '../../../prototype/fixtures.mjs';
// The film's stand-in: the approved boarding film's own frame function, drawn as a still at the state's moment.
import { boardingSvg } from '../../../../pregame-films/boarding/boarding.mjs';
import { REVIEW_ROSTERS } from '../../../../pregame-films/boarding/roster.mjs';

/** The development phone sizes, with the pack's review frames' safe areas. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
});
const ENDS_AT = 10000;
const clock = t => ({ elapsedMs: t, endsAtMs: ENDS_AT });

/** Each state of sheet 19, and the ones around it, as the stage's input and the film's moment where it plays. */
export const PREVIEW_STATES = Object.freeze({
  film15: { caption: '0:01.5 · the film · sheet 19', stage: { clock: clock(1500), view: 'film', skip: { enabled: true } }, film: 1500 },
  film6: { caption: '0:06 · the film · sheet 19', stage: { clock: clock(6000), view: 'film', skip: { enabled: true } }, film: 6000 },
  holding: { caption: 'Skipped locally · sheet 19', stage: { clock: clock(6000), view: 'holding', skip: null } },
  waiting: { caption: 'Waiting for the server · sheet 19', stage: { clock: clock(10000), view: 'waiting', skip: null } },
  display: { caption: 'The shared display · no Skip', stage: { clock: clock(4000), view: 'film', skip: null }, film: 4000 },
  reduced: { caption: 'Reduce motion · the film’s still', stage: { clock: clock(6000), view: 'film', skip: { enabled: true }, reducedMotion: true }, film: 6000, variant: 'reduced' },
  noclock: { caption: 'Holding · the clock not trusted', stage: { clock: null, view: 'holding', skip: null } },
  stale: { caption: 'Reconnecting · over the holding screen', stage: { clock: clock(7000), view: 'holding', skip: null, status: 'stale' } },
  concealed: { caption: 'Concealed · a plain cover', stage: { clock: clock(6000), view: 'film', skip: { enabled: true }, status: 'concealed' }, film: 6000 },
  large: { caption: 'Largest text (200%) · waiting', stage: { clock: clock(10000), view: 'waiting', skip: null }, text: 200 },
});

/** The film's still in the stage's film element (the player's place). */
export function drawFilm(holder, t, variant = 'full') {
  const { width, height } = holder.getBoundingClientRect();
  holder.innerHTML = boardingSvg(t, { width, height, variant, roster: REVIEW_ROSTERS['9'] });
  holder.firstElementChild?.classList.add('pv-film-svg');
}

const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const handlers = Object.fromEntries(['onSkip', 'onRetry', 'onFocusReturn'].map(n => [n, record(n)]));
const params = new URLSearchParams(location.search);
const mounted = [];

/** A phone at a development size, the stage in it, and the film's still where the film plays. */
function phone(sizeKey, key) {
  const size = PREVIEW_SIZES[sizeKey], s = PREVIEW_STATES[key];
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  return { frame, mount: () => {
    const stage = mountBoardingStage(frame, { ...s.stage, insets: size.insets }, handlers);
    if (s.film !== undefined) drawFilm(stage.film, s.film, s.variant ?? 'full');
    return stage;
  } };
}

let probe = null, agree = null;
if (params.get('agree')) {
  document.body.classList.add('pv-single');
  agree = document.fonts.ready.then(() => import('./agree.mjs')).then(m => m.runBoardingStageAgreement({ sizes: PREVIEW_SIZES }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runBoardingStageProbe({ sizes: PREVIEW_SIZES, drawFilm }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const key = params.get('state') ?? 'film15', sizeKey = params.get('size') ?? '390x844';
  if (!PREVIEW_STATES[key] || !PREVIEW_SIZES[sizeKey]) throw new Error(`Unknown size or state: ${sizeKey} ${key}`);
  if (PREVIEW_STATES[key].text) document.documentElement.style.fontSize = `${PREVIEW_STATES[key].text}%`;
  const p = phone(sizeKey, key);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Boarding stage · preview</h1><p>The runtime component, with a still of the approved boarding film where the game mounts its player. ${FIXTURE_LABEL}. Desktop browser at each phone’s CSS size: not a phone.</p>`;
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

window.__boardingStage = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};
