// mothership:dev-only
//
// The Roles list's preview: the runtime component itself (../end-roles.mjs, on the kit, unchanged) in the phone
// shell's cover (../../phone-shell/phone-shell.mjs, unchanged), over the end scene (../../end-scene/end-scene.mjs,
// unchanged) in the shell's stage, as sheet 44 draws the end of a match: no top bar, no tabs, and the stage edge to
// edge (`edge: true`). On the phone pack's synthetic fixtures (design/phone-ui/prototype/fixtures.mjs: invented
// names, seats and roles, as the review sheets use; the reveal as the pack's end screen draws it) and a labelled
// synthetic clock and end phase, at the two development phone sizes, with the pack's review frames' safe areas.
//   index.html                                          every state at 390 × 844 and 430 × 932, and a live phone
//   index.html?single=1&size=390x844&state=blue         one phone at the state's moment, for the check's captures
//   index.html?single=1&size=390x844&state=blue&text=200  the same at the Largest text (150: Large)
//   index.html?probe=1                                  the lifecycle probe (probe.mjs), for the check
//   index.html?agree=1                                  the component beside the pinned pack (agree.mjs), for the check
// What Frontend gives the list here is what the game gives it: the reveal and the roster as projected, each seat's
// team from the projection's faction data (here the pack's), the end phase and its clock, `showAt` from the scene's
// END_BEATS, the shell's bottom safe area, and where the scene's title block ends (its layout().titleBottom, asked
// again whenever the title block's size changes: a result, the text size, the phone).

import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { mountEndScene } from '../../end-scene/end-scene.mjs';
import { END_ROLES_VERSION, mountEndRoles } from '../end-roles.mjs';
import { EPOCH, FIXTURE_LABEL, PREVIEW_SIZES, PREVIEW_STATES, REVEAL, RESULTS, TEAMS, inputsFor, showAtFor } from './states.mjs';

export * from './states.mjs';
export const intents = [];

// The crew's portraits, on the CSS properties the game's crew bundle defines (crewPortraitVariable).
for (let n = 1; n <= 9; n += 1) {
  document.documentElement.style.setProperty(`--ms-asset-crew-portrait-c${n}`, `url("${new URL(`../../../../crew-drawing/assets/portraits/portrait-c${n}.svg`, import.meta.url).href}")`);
}

/** Where the scene's title block ends, as the scene reports it (end-scene 0.1.1): in its CSS px, the cover's. */
export const titleBottom = scene => scene.layout()?.titleBottom ?? null;

/**
 * Mounts a phone: the shell (no bar, no tabs, edge to edge), the scene in its stage, the list in its cover. The list
 * keeps the shell's bottom safe area and the title block's bottom as they change (larger text, a new result).
 */
export function mountPhone(frame, inputs, { log = null } = {}) {
  let scene = null, roles = null;
  const fit = layout => ({ size: layout.stage, safe: { top: layout.safe.top } });
  const place = () => (scene && roles ? roles.update({ clear: { top: titleBottom(scene) } }) : null);
  const shell = mountPhoneShell(frame, inputs.shell, { onLayout: layout => { scene?.update(fit(layout)); roles?.update({ safe: { bottom: layout.safe.bottom } }); place(); } });
  scene = mountEndScene(shell.stage, { ...inputs.scene, ...fit(shell.layout()) });
  const say = (name, detail) => { intents.push([name, detail ?? null]); if (log) log.textContent = `${name}${detail ? ` ${JSON.stringify(detail)}` : ''} · ${intents.length}`; };
  roles = mountEndRoles(shell.slot('cover'), { ...inputs.roles, safe: { bottom: shell.layout().safe.bottom }, clear: { top: titleBottom(scene) } },
    { onReturnToLobby: () => say('onReturnToLobby'), onFocusReturn: detail => say('onFocusReturn', detail) });
  const watch = new ResizeObserver(place);
  watch.observe(scene.element.querySelector('.ms-es-title'));
  return {
    shell, scene, roles,
    /** A change to the scene's and the list's shared inputs (a new end phase, a new result), as Frontend makes it. */
    update(changes) {
      const { result, ...both } = changes;
      scene.update({ ...both, ...(result !== undefined ? { result } : {}) });
      roles.update({ ...both, ...(result !== undefined ? { showAt: showAtFor(result) } : {}) });
      place();
    },
    dispose() { watch.disconnect(); roles.dispose(); scene.dispose(); shell.dispose(); },
  };
}

function phone(sizeKey, stateKey, { clock = null, hold = true } = {}) {
  const size = PREVIEW_SIZES[sizeKey];
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  const log = document.createElement('p');
  log.className = 'pv-log';
  return { frame, log, mount: () => {
    const m = mountPhone(frame, inputsFor(stateKey, size, { clock }), { log });
    // A fixed moment is a still picture: the scene holds it.
    if (hold && !clock) m.scene.suspend();
    return m;
  } };
}

/** A phone on a running clock: a new end phase every 7 s, through the results, as the server would publish them. */
function livePhone(sizeKey) {
  const start = performance.now();
  const now = () => EPOCH + (performance.now() - start);
  const order = ['Red', 'alien', 'none', 'Blue', 'aborted'];
  let n = 0;
  const p = phone(sizeKey, 'red', { clock: { now }, hold: false });
  return { frame: p.frame, log: p.log, mount: () => {
    const m = p.mount();
    const next = () => {
      const key = order[n % order.length];
      n += 1;
      m.update({ window: { id: `synthetic-end-live-${n}`, startedAt: now() }, result: RESULTS[key] });
      m.roles.update(key === 'aborted' ? { reveal: null, teams: null } : { reveal: REVEAL, teams: TEAMS });
    };
    next();
    const timer = setInterval(next, 7000);
    return { ...m, replay: next, stop: () => clearInterval(timer) };
  } };
}

const params = new URLSearchParams(location.search);
if (params.get('text')) document.documentElement.style.fontSize = `${Number(params.get('text'))}%`;
const mounted = [];
let probe = null, agree = null;
if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runEndRolesProbe())
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('agree')) {
  document.body.classList.add('pv-single');
  agree = document.fonts.ready.then(() => import('./agree.mjs')).then(m => m.runEndRolesAgreement())
    .catch(error => ({ ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const stateKey = params.get('state') ?? 'blue', sizeKey = params.get('size') ?? '390x844';
  if (!PREVIEW_SIZES[sizeKey] || !PREVIEW_STATES[stateKey]) throw new Error(`Unknown size or state: ${sizeKey} ${stateKey}`);
  const p = phone(sizeKey, stateKey);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Roles list · preview</h1><p>The runtime component (${END_ROLES_VERSION}) in the phone shell's cover, over the end scene in its stage, no bar and no tabs: sheet 44. ${FIXTURE_LABEL}; an invented end phase and clock. The first phone runs on a clock, a new end phase every 7 s through the results; the others hold one moment. Each phone's taps are listed under it. Desktop browser at each phone's CSS size: not a phone.</p>`;
  const grid = document.createElement('div');
  grid.className = 'pv-grid';
  document.body.append(head, grid);
  const cell = (title, sub, p) => {
    const figure = document.createElement('figure');
    figure.className = 'pv-cell';
    const caption = document.createElement('figcaption');
    caption.innerHTML = `${title}<small>${sub}</small>`;
    figure.append(caption, p.frame, p.log);
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
window.__endRoles = {
  mounted, probe, agree, intents,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};
