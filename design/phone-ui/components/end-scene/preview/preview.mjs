// mothership:dev-only
//
// The end scene's preview: the runtime component itself (../end-scene.mjs, unchanged) in the phone shell's stage
// (../../phone-shell/phone-shell.mjs, unchanged), as sheet 44 draws the end of a match: no top bar, no tabs, and the
// stage edge to edge (`edge: true`), the scene covering the whole phone. Sheet 44's Roles list and "Return to lobby"
// are the screen's: a labelled stand-in marks their place in the shell's cover. On a labelled synthetic clock and end
// phase, at the two development phone sizes, with the pack's review frames' safe areas.
//   index.html                                        every state at 390 × 844 and 430 × 932, and a live phone
//   index.html?single=1&size=390x844&state=red        one phone at the state's moment, for the check's captures
//   …&text=1.5                                        the game's larger text (1, 1.5 or 2), set on the root as the game sets it
//   index.html?probe=1                                the lifecycle probe (probe.mjs), for the check
//   index.html?compare=full&side=Red                  the still's hero at the poster's 1920 × 1080, for the comparison
//   index.html?compare=agree                          the comparisons' page: reads the check's captures (compare.mjs),
//                                                     for the agreement with the pack and for where the title's ink ends
//   index.html?strip=arrival&size=390x844             the scene at ten moments, side by side (the beats); strip=none

import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { END_SCENE_VERSION, mountEndScene } from '../end-scene.mjs';

/** The approved posters, as the pack's end screen uses them (design/phone-ui/prototype/screens-more.mjs, `end`). */
export const POSTERS = Object.freeze({
  Red: new URL('../../../../../apps/game/candidates/planet-library/arrival-red.poster.webp', import.meta.url).href,
  Blue: new URL('../../../../../apps/game/candidates/planet-library/arrival-blue.poster.webp', import.meta.url).href,
});
export const FIXTURE_LABEL = 'Synthetic fixture · an invented end phase and clock';

/** The development phone sizes, with the pack's review frames' safe areas. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
});

// A synthetic end phase, as the server publishes it, and Round 6, as sheet 44 draws it.
const EPOCH = Date.UTC(2026, 10, 15, 12, 0, 0);
export const WINDOW = Object.freeze({ id: 'synthetic-end-r6', startedAt: EPOCH });
export const ROUND = 6;
const fixed = ms => Object.freeze({ now: () => EPOCH + ms });

/** Sheet 44's Roles list starts at the pack's 58 %, or this far under the title block where the block ends lower. */
export const LIST_TOP = 0.58;
export const LIST_GAP = 13;

/** The public results the preview shows, as the contract has them (PlanetResultSchema). */
export const RESULTS = Object.freeze({
  Blue: Object.freeze({ winner: 'Blue', reason: 'ARRIVAL', alienCoWinner: false }),
  Red: Object.freeze({ winner: 'Red', reason: 'ARRIVAL', alienCoWinner: false }),
  alien: Object.freeze({ winner: 'Blue', reason: 'ARRIVAL', alienCoWinner: true }),
  redAlien: Object.freeze({ winner: 'Red', reason: 'ARRIVAL', alienCoWinner: true }),
  none: Object.freeze({ winner: null, reason: 'NO_SURVIVORS', alienCoWinner: false }),
  aborted: Object.freeze({ winner: null, reason: 'ABORTED', alienCoWinner: false }),
});

/**
 * Each state: its caption, the moment on the clock, the shell's input and the scene's. `pack` names the pack's own
 * `end` screen it is drawn after (?s=end&winner=…), for the agreement; Red with the Alien is composed, not drawn there.
 */
export const PREVIEW_STATES = Object.freeze({
  blue: { caption: 'Blue wins (sheet 44)', at: 6000, pack: 'Blue', scene: { result: RESULTS.Blue } },
  red: { caption: 'Red wins (sheet 44)', at: 6000, pack: 'Red', scene: { result: RESULTS.Red } },
  alien: { caption: 'Blue wins, the Alien too (the pack’s)', at: 6000, pack: 'alien', scene: { result: RESULTS.alien } },
  redAlien: { caption: 'Red wins, the Alien too · composed', at: 6000, pack: null, scene: { result: RESULTS.redAlien } },
  none: { caption: 'No survivors (sheet 44)', at: 6000, pack: 'none', scene: { result: RESULTS.none } },
  aborted: { caption: 'Match aborted (the pack’s)', at: 6000, pack: 'aborted', scene: { result: RESULTS.aborted } },
  film: { caption: 'The arrival · 1.5 s', at: 1500, pack: null, scene: { result: RESULTS.Red } },
  settle: { caption: 'The stamp has landed · 4.0 s', at: 4000, pack: null, scene: { result: RESULTS.Red } },
  reduced: { caption: 'The game’s Reduce motion · the still', at: 1500, pack: null, shell: { reducedMotion: true }, scene: { result: RESULTS.Red, reducedMotion: true } },
  stale: { caption: 'Reconnecting · stands still at 2.6 s', at: 2600, pack: null, shell: { status: 'stale', banner: { kind: 'reconnecting' } }, scene: { result: RESULTS.Red, status: 'stale' } },
  concealed: { caption: 'Concealed', at: 6000, pack: null, shell: { status: 'concealed' }, scene: { result: RESULTS.Red, status: 'concealed' } },
  noclock: { caption: 'No trusted clock · the still', at: 1500, pack: null, scene: { result: RESULTS.Red, clock: null } },
  noresult: { caption: 'No result yet · the dark field', at: 6000, pack: null, scene: { result: null } },
});

/** The moments of the beats strips, in ms into the end phase. */
export const STRIPS = Object.freeze({
  arrival: Object.freeze([0, 300, 1200, 2400, 3000, 3500, 3700, 3760, 4100, 4500]),
  none: Object.freeze([0, 300, 380, 460, 540, 600, 700, 800, 900, 1000]),
});

/** A phone at a development size: the shell (no bar, no tabs, edge to edge), the scene in its stage, the stand-in in its cover. */
function phone(sizeKey, stateKey, { clock = null, hold = true } = {}) {
  const size = PREVIEW_SIZES[sizeKey], state = PREVIEW_STATES[stateKey];
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  return { frame, mount: () => {
    let scene = null, place = () => {};
    // Edge to edge, the stage is the whole phone; the title block sits at the shell's top safe area + 34 %.
    const fit = layout => ({ size: layout.stage, safe: { top: layout.safe.top } });
    const shell = mountPhoneShell(frame, { viewer: null, bar: null, tabs: null, edge: true, insets: size.insets, ...state.shell }, { onLayout: layout => { scene?.update(fit(layout)); place(); } });
    scene = mountEndScene(shell.stage, { window: WINDOW, clock: clock ?? fixed(state.at), round: ROUND, ...fit(shell.layout()), ...state.scene });
    const standin = document.createElement('div');
    standin.className = 'pv-standin';
    standin.style.setProperty('--pv-safe-b', `${shell.layout().safe.bottom}px`);
    standin.textContent = 'Stand-in · sheet 44’s Roles list and “Return to lobby” are the screen’s (the Gameplay UI builder’s), in the shell’s cover';
    shell.slot('cover').append(standin);
    // The list's place, as the screen works it out from the scene's layout(): the pack's 58 %, or 13 px under the title
    // block where larger text makes the block end lower. With no title block (concealed, no result), the pack's place.
    place = () => {
      const foot = scene.layout()?.titleBottom ?? null;
      standin.style.top = foot === null ? '' : `max(${LIST_TOP * 100}%, ${foot + LIST_GAP}px)`;
    };
    place();
    // A fixed moment is a still picture: the scene holds it.
    if (hold && !clock) scene.suspend();
    return { shell, scene, standin, place };
  } };
}

/** A phone on a running clock: a new end phase every 7 s, through the results, as the server would publish them. */
function livePhone(sizeKey) {
  const start = performance.now();
  const now = () => EPOCH + (performance.now() - start);
  const order = ['Red', 'alien', 'none', 'Blue', 'redAlien', 'aborted'];
  let n = 0;
  const p = phone(sizeKey, 'red', { clock: { now }, hold: false });
  return { frame: p.frame, mount: () => {
    const m = p.mount();
    const next = () => { const key = order[n % order.length]; n += 1; m.scene.update({ window: { id: `synthetic-end-live-${n}`, startedAt: now() }, result: RESULTS[key] }); };
    next();
    const timer = setInterval(next, 7000);
    return { ...m, replay: next, stop: () => clearInterval(timer) };
  } };
}

const params = new URLSearchParams(location.search);
// The game's text size: Standard (1), Large (1.5) and 2. The game sets its root's size, and so does the preview.
export const TEXT = [1, 1.5, 2].includes(Number(params.get('text'))) ? Number(params.get('text')) : 1;
if (TEXT !== 1) document.documentElement.style.fontSize = `${TEXT * 100}%`;
const mounted = [];
let probe = null, compare = null;
if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runEndSceneProbe())
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('compare') === 'full') {
  // The still's hero alone at the poster's own size and frame (a 1920 × 2160 phone, its top half 1920 × 1080), without
  // the fade or the words, for the pixel comparison with the approved poster.
  document.body.classList.add('pv-single', 'pv-bare');
  const side = params.get('side') === 'Blue' ? 'Blue' : 'Red';
  const host = document.createElement('div');
  host.className = 'pv-full';
  document.body.append(host);
  const scene = mountEndScene(host, { window: WINDOW, clock: fixed(6000), result: RESULTS[side], round: ROUND, size: { width: 1920, height: 2160 } });
  mounted.push({ scene });
  compare = import('./compare.mjs').then(m => ({ full: options => m.compareFull({ poster: POSTERS[side], ...options }) }));
} else if (params.get('compare') === 'agree') {
  // The comparisons with the pack's own end screen read two captures the check saves next to the bundle.
  document.body.classList.add('pv-single');
  compare = import('./compare.mjs').then(m => ({ agree: options => m.compareAgree(options), painted: options => m.comparePainted(options) }));
} else if (params.get('strip')) {
  // The beats, side by side: the arrival (Red), or no winner.
  document.body.classList.add('pv-single');
  const kind = params.get('strip') === 'none' ? 'none' : 'arrival';
  const sizeKey = params.get('size') ?? '390x844';
  const row = document.createElement('div');
  row.className = 'pv-row';
  document.body.append(row);
  for (const at of STRIPS[kind]) {
    const p = phone(sizeKey, kind === 'none' ? 'none' : 'red', { clock: fixed(at) });
    row.append(p.frame);
    const m = p.mount();
    m.scene.suspend();
    mounted.push(m);
  }
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const stateKey = params.get('state') ?? 'red', sizeKey = params.get('size') ?? '390x844';
  if (!PREVIEW_SIZES[sizeKey] || !PREVIEW_STATES[stateKey]) throw new Error(`Unknown size or state: ${sizeKey} ${stateKey}`);
  const p = phone(sizeKey, stateKey);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>End scene · preview</h1><p>The runtime component (${END_SCENE_VERSION}) in the phone shell's stage, no bar and no tabs: the top of sheet 44. ${FIXTURE_LABEL}. The first phone runs on a clock, a new end phase every 7 s through the results; the others hold one moment. The Roles list's place is a labelled stand-in, which starts 13 px under the title block where larger text makes the block end lower (add <code>?text=1.5</code> or <code>?text=2</code> for the game's larger text). Desktop browser at each phone's CSS size: not a phone.</p>`;
  const grid = document.createElement('div');
  grid.className = 'pv-grid';
  document.body.append(head, grid);
  const cell = (title, sub, p) => {
    const figure = document.createElement('figure');
    figure.className = 'pv-cell';
    const caption = document.createElement('figcaption');
    caption.innerHTML = `${title}<small>${sub}</small>`;
    figure.append(caption, p.frame);
    grid.append(figure);
    return caption;
  };
  const live = livePhone('390x844');
  const caption = cell('Live · on the clock', '390 × 844 · a new end phase every 7 s', live);
  const m = live.mount();
  const replay = document.createElement('button');
  replay.type = 'button';
  replay.textContent = 'Next end phase';
  replay.addEventListener('click', () => m.replay());
  caption.append(replay);
  mounted.push(m);
  for (const [stateKey, state] of Object.entries(PREVIEW_STATES)) {
    for (const sizeKey of Object.keys(PREVIEW_SIZES)) {
      const p = phone(sizeKey, stateKey);
      cell(state.caption, `${sizeKey.replace('x', ' × ')} · state=${stateKey}`, p);
      mounted.push(p.mount());
    }
  }
}

// For the check: settled once fonts and two frames have passed.
window.__endScene = {
  mounted, probe, compare, text: TEXT, list: { top: LIST_TOP, gap: LIST_GAP },
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};
