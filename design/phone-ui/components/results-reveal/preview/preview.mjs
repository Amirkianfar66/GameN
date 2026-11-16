// mothership:dev-only
//
// The results reveal's preview: the runtime component itself (../results-reveal.mjs, unchanged) in the phone
// shell's cover (../../phone-shell/phone-shell.mjs, unchanged), with the room scene
// (../../room-scene/room-scene.mjs, unchanged) in the shell's stage and the vote's own result window
// (../../vote/vote.mjs mountVoteResult, unchanged) mounted in the reveal's host, on the phone pack's synthetic
// fixtures (the vote's preview states: invented names, seats and results), at the two development phone sizes.
//   index.html                                                   the arrival's strip, the pack's results at rest, the policies and a live phone
//   index.html?single=1&size=390x844&state=result-jailed&t=120   one phone held at a moment of the reveal, for the check's captures
//       &motion=reduced           the game's Reduce motion
//       &status=stale|concealed   a policy
//       &direct=1                 the window straight in the cover, with no reveal (what "unchanged at rest" is compared with)
//       &live=1                   on the page's own clock, from the phase's start (not held)
//   index.html?strip=1&size=390x844                              the arrival at 0, 40, 80, 120, 160, 240 and 320 ms, and the rest, side by side
//   index.html?single=1&probe=1                                  the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                                  at rest, the window in the reveal's host beside the window in the cover (agree.mjs)
// A held moment is the component suspended on a clock that stands at that moment: the rise holds where the clock is.

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { REVEAL_BEATS, mountResultsReveal, revealFrame } from '../results-reveal.mjs';
import { mountVoteResult, resultBar } from '../../vote/vote.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { ROOM_NAMES, mountRoomScene } from '../../room-scene/room-scene.mjs';
import { SKY_EPOCH } from '../../room-scene/ambient.mjs';
import { ROOM_ART, ROOM_ART_RELEASE } from '../../room-scene/room-art.mjs';
import { ROOM_EXTENSION } from '../../room-scene/room-extension.mjs';
import { FIXTURE_LABEL, ROOM_FIXTURES, SELF, board } from '../../../prototype/fixtures.mjs';
import { VOTE_STATES } from '../../vote/preview/states.mjs';

/** The development phone sizes, with the pack's review frames' safe areas. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
});
/** The pack's result states (sheets 37 and 38), from the vote's preview. */
export const RESULT_STATES = Object.freeze(Object.keys(VOTE_STATES).filter(key => VOTE_STATES[key].result && !VOTE_STATES[key].text && !VOTE_STATES[key].status));
/** The moments of the arrival's strip, in ms of reveal time; null is the rest. */
export const STRIP = Object.freeze([0, 40, 80, 120, 160, 240, 320, null]);
/** The published VOTE_RESULT phase the fixtures stand in for: 5 s from an invented server time. */
export const PHASE_MS = 5000;
export const STARTED = 1_763_000_000_000;
/** The moment a phone at rest is held at. */
const REST_AT = 1200;

// The release's pictures, the room scene's extension and the crew's portraits, on the CSS properties the
// game's bundles define (room-art.mjs, room-extension.mjs, crewPortraitVariable).
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

// A match pinned to the crew release, as the game's crew runtime requires to draw the approved crew.
const versions = Object.freeze({ assetManifestVersion: 'design-0.9.0', ...PLANET_FOOD_TASK_PINS });
const params = new URLSearchParams(location.search);
// The captures hold one moment of the voyage (2:10), as the shell's and the vote's do.
const at = params.has('at') ? Number(params.get('at')) : null;
const voyage = at !== null ? { now: () => SKY_EPOCH + at * 1000 } : { now: () => Date.now() };

// ── The room behind: Room A, seen by seat 4 (Dev), as the pack's vote sheets draw it ──
const fixture = ROOM_FIXTURES['room-a'];
const people = board({ place: fixture.place }).filter(p => p.location === ROOM_NAMES['room-a']).map(p => ({
  seat: p.seat, slot: p.slot, character: p.character, name: p.name, health: p.health,
  office: fixture.offices.captain === p.seat ? 'captain' : fixture.offices.officer === p.seat ? 'officer' : null,
}));
// No one's turn while a result is shown, and no room control under the result window.
export const ROOM = Object.freeze({ room: 'room-a', roster: 9, people, self: SELF, active: null, versions, clock: voyage, control: null, roomArt: ROOM_ART_RELEASE });

/**
 * One state's inputs (the shell, the room scene and the window), at a moment of the reveal. The bar's ring is
 * Frontend's, from its timer: here it stands at the moment shown.
 */
export function inputsFor(stateKey, size, { t = null, status = null, motion = null } = {}) {
  const state = VOTE_STATES[stateKey];
  if (!state?.result) throw new Error(`Unknown result state: ${stateKey}`);
  const mode = status ?? 'live', reducedMotion = motion === 'reduced';
  const component = { ...state.result, versions, status: mode, reducedMotion };
  const elapsed = Math.min(PHASE_MS, t ?? REST_AT);
  const bar = { ...state.shell.bar, ...resultBar(component), timer: { remainingMs: PHASE_MS - elapsed, ring: elapsed / PHASE_MS, urgentAtMs: -1 } };
  const shell = { ...state.shell, versions, insets: size.insets, status: mode, reducedMotion, sheet: null,
    bar: mode === 'stale' ? { kind: 'phase', icon: 'retry', title: 'Reconnecting…', sub: 'Showing Round 3 as last seen', round: bar.round, promises: { count: 0 }, menu: {} } : bar,
    banner: mode === 'stale' ? { kind: 'reconnecting' } : null };
  return { state, shell, scene: { ...ROOM, status: mode, reducedMotion }, component };
}

let phases = 0;
/**
 * A phone at a development size: the shell in it, the room scene in its stage, the reveal in its cover and the
 * result window in the reveal's host. `t`: the reveal's moment, held (null: at rest). `live`: on the page's own
 * clock from the phase's start. `direct`: no reveal, the window straight in the cover (the probe mounts its own
 * there, on a clock it sets).
 */
export function phone(sizeKey, stateKey, { t = null, status = null, motion = null, direct = false, live = false } = {}) {
  const size = PREVIEW_SIZES[sizeKey];
  if (!size) throw new Error(`Unknown size: ${sizeKey}`);
  const { shell: shellInput, scene: sceneInput, component } = inputsFor(stateKey, size, { t, status, motion });
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  return { frame, mount: () => {
    let scene = null;
    const shell = mountPhoneShell(frame, shellInput, { onLayout: layout => scene?.update({ size: layout.stage }) });
    scene = mountRoomScene(shell.stage, { ...sceneInput, size: shell.layout().stage }, {});
    // A fixed moment is a still picture: the voyage and the crew hold where they are.
    if (at !== null) scene.suspend();
    const cover = shell.slot('cover');
    let reveal = null, result = null;
    const arrive = () => {
      const startedAt = live ? Date.now() : STARTED;
      const clock = live ? { now: () => Date.now() } : { now: () => STARTED + (t ?? REST_AT) };
      reveal = mountResultsReveal(cover, { window: { id: `fixture-vote-result-${phases += 1}`, startedAt, endsAt: startedAt + PHASE_MS }, clock, status: component.status, reducedMotion: component.reducedMotion });
      result = mountVoteResult(reveal.host, component);
      // Held: the rise stands where the clock is.
      if (!live) reveal.suspend();
    };
    if (direct) result = mountVoteResult(cover, component); else arrive();
    const mounted = {
      shell, scene, cover, sizeKey, stateKey, direct,
      get reveal() { return reveal; }, get result() { return result; },
      /** The window leaves and arrives again, as a new phase would bring it (the live phone's Replay). */
      replay() { result?.dispose(); reveal?.dispose(); arrive(); },
      dispose() { result?.dispose(); reveal?.dispose(); scene.dispose(); shell.dispose(); frame.remove(); },
    };
    return mounted;
  } };
}

/** What a phone shows, for the check: the reveal's own snapshot, where its host and the window lie, what runs. */
export function seen(m) {
  const box = node => { const r = node.getBoundingClientRect(), c = m.cover.getBoundingClientRect(); return { left: r.left - c.left, top: r.top - c.top, width: r.width, height: r.height }; };
  const host = m.reveal?.host ?? null, win = m.cover.querySelector('.ms-vote-result');
  const shown = node => !!node && node.getClientRects().length > 0;
  const text = selector => { const node = m.cover.querySelector(selector); return shown(node) ? node.innerText.replace(/\s+/g, ' ').trim() : null; };
  const room = m.shell.stage.querySelector('.ms-room-scene');
  return {
    frame: m.reveal?.frame() ?? null,
    cover: { width: m.cover.getBoundingClientRect().width, height: m.cover.getBoundingClientRect().height },
    host: host ? { ...box(host), hidden: host.hidden, transform: getComputedStyle(host).transform, opacity: getComputedStyle(host).opacity, style: host.getAttribute('style'), animations: host.getAnimations().map(a => ({ state: a.playState, time: a.currentTime })) } : null,
    window: shown(win) ? box(win) : null,
    title: text('.ms-result-title'), line: text('.ms-result-line'),
    figures: room ? room.querySelectorAll('.ms-rs-fig svg').length : 0,
    status: m.shell.element?.dataset.status ?? document.querySelector('.ms-phone-shell')?.dataset.status ?? null,
  };
}

const figure = (caption, small, p) => {
  const cell = document.createElement('figure');
  cell.className = 'pv-cell';
  const words = document.createElement('figcaption');
  words.innerHTML = `${caption}<small>${small}</small>`;
  cell.append(words, p.frame);
  return cell;
};
const section = title => {
  const h2 = document.createElement('h2');
  h2.className = 'pv-section';
  h2.textContent = title;
  const grid = document.createElement('div');
  grid.className = 'pv-grid';
  document.body.append(h2, grid);
  return grid;
};
const momentName = t => (t === null ? 'At rest' : `${t} ms`);
const share = t => `${Math.round((1 - revealFrame(t ?? Infinity).offset) * 100)} % up`;

const mounted = [];
let probe = null, agree = null;
if (params.get('probe') || params.get('agree')) {
  document.body.classList.add('pv-single');
  const run = params.get('probe')
    ? import('./probe.mjs').then(m => m.runRevealProbe({ sizes: PREVIEW_SIZES, phone, inputsFor }))
    : import('./agree.mjs').then(m => m.runRevealAgreement({ sizes: PREVIEW_SIZES, states: RESULT_STATES, phone }));
  const outcome = document.fonts.ready.then(() => run).catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
  if (params.get('probe')) probe = outcome; else agree = outcome;
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const stateKey = params.get('state') ?? 'result-jailed', sizeKey = params.get('size') ?? '390x844';
  const p = phone(sizeKey, stateKey, {
    t: params.has('t') ? Number(params.get('t')) : null, status: params.get('status'), motion: params.get('motion'),
    direct: params.has('direct'), live: params.has('live'),
  });
  document.body.append(p.frame);
  mounted.push(p.mount());
} else if (params.get('strip')) {
  // The arrival, moment by moment, for one capture: each phone held at its time of the same phase.
  document.body.classList.add('pv-strip');
  const sizeKey = params.get('size') ?? '390x844', stateKey = params.get('state') ?? 'result-jailed';
  const grid = document.createElement('div');
  grid.className = 'pv-grid';
  document.body.append(grid);
  for (const t of STRIP) {
    const p = phone(sizeKey, stateKey, { t, motion: params.get('motion') });
    grid.append(figure(momentName(t), share(t), p));
    mounted.push(p.mount());
  }
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Results reveal · preview</h1><p>The vote’s result window arriving over the room: the runtime component in the phone shell’s cover, with the room scene in the stage (Room A, seen by Player 4) and the vote’s own window in the reveal’s host. ${FIXTURE_LABEL}. The window rises in ${REVEAL_BEATS.rise[1]} ms and rests; with Reduce motion it fades in once. Each held phone stands on a clock that stands at its moment.</p>`;
  document.body.append(head);
  // A live phone first: the rise as it runs, on the page's own clock.
  const liveGrid = section('Live: the arrival on this page’s clock');
  for (const [caption, options] of [['Full motion', {}], ['Reduce motion (the game’s)', { motion: 'reduced' }]]) {
    const p = phone('390x844', 'result-jailed', { ...options, live: true });
    const cell = figure(caption, '390 × 844 · the phase starts when the phone is made', p);
    const again = document.createElement('button');
    again.type = 'button';
    again.textContent = 'Replay';
    cell.insertBefore(again, p.frame);
    liveGrid.append(cell);
    const m = p.mount();
    again.addEventListener('click', () => m.replay());
    mounted.push(m);
  }
  for (const sizeKey of Object.keys(PREVIEW_SIZES)) {
    const grid = section(`The arrival, moment by moment · ${sizeKey.replace('x', ' × ')}`);
    for (const t of STRIP) {
      const p = phone(sizeKey, 'result-jailed', { t });
      grid.append(figure(momentName(t), `${share(t)} · t=${t ?? 'rest'}`, p));
      mounted.push(p.mount());
    }
  }
  const rest = section('At rest: the pack’s results (sheets 37 and 38), as the window lies in the cover');
  for (const stateKey of RESULT_STATES) for (const sizeKey of Object.keys(PREVIEW_SIZES)) {
    const p = phone(sizeKey, stateKey);
    rest.append(figure(VOTE_STATES[stateKey].caption, `${sizeKey.replace('x', ' × ')} · state=${stateKey}`, p));
    mounted.push(p.mount());
  }
  const policies = section('The policies: Reduce motion, reconnecting and concealed');
  for (const [caption, options] of [
    ['Reduce motion · at rest, after its one fade', { motion: 'reduced' }],
    ['Reconnecting · stands where it is (120 ms)', { t: 120, status: 'stale' }],
    ['Concealed · nothing drawn', { t: 120, status: 'concealed' }],
  ]) for (const sizeKey of Object.keys(PREVIEW_SIZES)) {
    const p = phone(sizeKey, 'result-jailed', options);
    policies.append(figure(caption, sizeKey.replace('x', ' × '), p));
    mounted.push(p.mount());
  }
}

// For the check: settled once fonts and two frames have passed.
window.__reveal = {
  mounted, probe, agree,
  seen: () => mounted.map(seen),
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};
