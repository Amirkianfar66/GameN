// mothership:dev-only
//
// The round stamp's preview: the runtime component itself (../round-stamp.mjs, unchanged) in the phone shell's
// cover (../../phone-shell/phone-shell.mjs, unchanged), over the room scene (../../room-scene/room-scene.mjs,
// unchanged) in the shell's stage, on the phone pack's synthetic fixtures (design/phone-ui/prototype/fixtures.mjs:
// invented names, seats and places), as the pack draws "Round 1 begins" (sheet 19's last frame: Room A, the first
// turn, R1 and 1:00 in the bar), at the two development phone sizes.
//   index.html                                          live phones, the stamp's strip and the policies
//   index.html?single=1&size=390x844&t=600              one phone held at a moment of the stamp, for the check's captures
//       &motion=reduced           the game's Reduce motion
//       &status=stale|concealed   a policy
//       &live=1                   on the page's own clock, from the phase's start (not held)
//       &bare=1                   no stamp (what the room under it is compared with)
//   index.html?strip=1&size=390x844                     the stamp at 0, 30, 80, 120, 600, 1,250 and 1,330 ms, and gone
//   index.html?single=1&probe=1                         the lifecycle probe (probe.mjs), for the check
//   index.html?agree=1                                  the stamp beside the pack's own frame (agree.mjs), for the check
// A held moment is the component suspended on a clock that stands at that moment.

import { PLANET_FOOD_TASK_PINS } from '@mothership/contracts';
import { ROUND_STAMP_BEATS, mountRoundStamp, roundStampFrame } from '../round-stamp.mjs';
import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { ROOM_NAMES, mountRoomScene } from '../../room-scene/room-scene.mjs';
import { SKY_EPOCH } from '../../room-scene/ambient.mjs';
import { ROOM_ART, ROOM_ART_RELEASE } from '../../room-scene/room-art.mjs';
import { ROOM_EXTENSION } from '../../room-scene/room-extension.mjs';
import { FIXTURE_LABEL, ROOM_FIXTURES, SELF, board, seatOf } from '../../../prototype/fixtures.mjs';

/** The development phone sizes, with the pack's review frames' safe areas. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
});
/** A small phone, for the probe's larger-text check: the pack's small frame, 320 × 568 with its safe areas. */
export const SMALL_PHONE = Object.freeze({ width: 320, height: 568, insets: Object.freeze({ top: 20, bottom: 0 }) });
/** The moments of the stamp's strip, in ms of stamp time; null is gone. */
export const STRIP = Object.freeze([0, 30, 80, 120, 600, 1250, 1330, null]);
/** The phase the fixtures stand in for begins at an invented server time. */
export const STARTED = 1_763_000_000_000;
/** The moment a phone showing the stamp standing is held at. */
export const HOLD_AT = 600;
/** The round the pack draws. */
export const ROUND = 1;

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
// The captures hold one moment of the voyage (2:10), as the shell's do.
const at = params.has('at') ? Number(params.get('at')) : null;
const voyage = at !== null ? { now: () => SKY_EPOCH + at * 1000 } : { now: () => Date.now() };

// ── The room under it: Room A, seen by seat 4 (Dev), the first turn (seat 7), as the pack's frame draws it ──
const fixture = ROOM_FIXTURES['room-a'];
const people = board({ place: fixture.place }).filter(p => p.location === ROOM_NAMES['room-a']).map(p => ({
  seat: p.seat, slot: p.slot, character: p.character, name: p.name, health: p.health,
  office: fixture.offices.captain === p.seat ? 'captain' : fixture.offices.officer === p.seat ? 'officer' : null,
}));
const person = n => { const p = seatOf(n); return { seat: p.seat, name: p.name, character: p.character }; };
// The room keeps its own control under the stamp: the stamp takes no tap (the probe taps it).
export const ROOM = Object.freeze({ room: 'room-a', roster: 9, people, self: SELF, active: fixture.active, versions, clock: voyage,
  control: Object.freeze({ id: 'windows', label: 'Windows · 2', icon: 'window' }), roomArt: ROOM_ART_RELEASE });

/** The shell's input and the room scene's for a phone, in a policy. The bar's clock is Frontend's: here it stands at 1:00. */
export function inputsFor(size, { status = null, motion = null } = {}) {
  const mode = status ?? 'live', reducedMotion = motion === 'reduced';
  const bar = mode === 'stale'
    ? { kind: 'phase', icon: 'retry', title: 'Reconnecting…', sub: `Showing Round ${ROUND} as last seen`, round: ROUND, promises: { count: 0 }, menu: {} }
    : { kind: 'turn', who: person(fixture.active), self: fixture.active === SELF, round: ROUND, timer: { remainingMs: 60000 }, promises: { count: 0 }, menu: {} };
  const shell = { viewer: SELF, versions, insets: size.insets, status: mode, reducedMotion, bar,
    tabs: { variant: 'game', view: 'room', hero: { mode: 'pass', enabled: false } }, banner: mode === 'stale' ? { kind: 'reconnecting' } : null };
  return { shell, scene: { ...ROOM, status: mode, reducedMotion } };
}

const intents = [];
let phases = 0;
/**
 * A phone at a development size (its key), or at a size given as { width, height, insets }: the shell in it, the
 * room scene in its stage and the stamp in its cover. `t`: the stamp's moment, held (null: gone, 4 s in). `live`: on
 * the page's own clock from the phase's start. `bare`: no stamp (the probe mounts its own there, on a clock it sets).
 */
export function phone(sizeKey, { t = HOLD_AT, status = null, motion = null, live = false, bare = false } = {}) {
  const size = typeof sizeKey === 'string' ? PREVIEW_SIZES[sizeKey] : sizeKey;
  if (!(size?.width > 0 && size?.height > 0 && size.insets)) throw new Error(`Unknown size: ${JSON.stringify(sizeKey)}`);
  const { shell: shellInput, scene: sceneInput } = inputsFor(size, { status, motion });
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  return { frame, mount: () => {
    let scene = null;
    const shell = mountPhoneShell(frame, shellInput, { onLayout: layout => scene?.update({ size: layout.stage }), onHero: (...args) => intents.push(['onHero', ...args]) });
    scene = mountRoomScene(shell.stage, { ...sceneInput, size: shell.layout().stage }, { onControl: (...args) => intents.push(['onControl', ...args]) });
    // A fixed moment is a still picture: the voyage and the crew hold where they are.
    if (at !== null) scene.suspend();
    const cover = shell.slot('cover');
    let stamp = null;
    const arrive = () => {
      const startedAt = live ? Date.now() : STARTED;
      const clock = live ? { now: () => Date.now() } : { now: () => STARTED + (t ?? 4000) };
      const stale = shellInput.status === 'stale';
      stamp = mountRoundStamp(cover, { round: ROUND, window: { id: `fixture-round-${ROUND}-${phases += 1}`, startedAt }, clock, status: stale ? 'live' : shellInput.status, reducedMotion: shellInput.reducedMotion });
      // Reconnecting: the stamp had begun, and stands where it was. Held: it stands where the clock is.
      if (stale) stamp.update({ status: 'stale' }); else if (!live) stamp.suspend();
    };
    if (!bare) arrive();
    return {
      shell, scene, cover, sizeKey, frame,
      get stamp() { return stamp; },
      /** The stamp leaves and lands again, as a new round's first phase would bring it (the live phone's Replay). */
      replay() { stamp?.dispose(); arrive(); },
      dispose() { stamp?.dispose(); scene.dispose(); shell.dispose(); frame.remove(); },
    };
  } };
}

/** What a phone shows, for the check: the stamp's own snapshot, where it lies in the phone, how it is drawn, what runs. */
export function seen(m) {
  const r2 = v => Math.round(v * 100) / 100;
  const phoneBox = m.frame.getBoundingClientRect(), coverBox = m.cover.getBoundingClientRect();
  const within = (node, of) => { const r = node.getBoundingClientRect(); return { x: r2(r.left - of.left), y: r2(r.top - of.top), w: r2(r.width), h: r2(r.height) }; };
  const root = m.cover.querySelector('.ms-round-stamp'), mark = root?.querySelector('.ms-rs-mark') ?? null, stamp = root?.querySelector('.ms-k-stamp') ?? null;
  const shown = node => !!node && node.getClientRects().length > 0;
  const room = m.shell.stage.querySelector('.ms-room-scene');
  const style = stamp && shown(stamp) ? getComputedStyle(stamp) : null;
  return {
    frame: m.stamp?.frame() ?? null,
    cover: within(m.cover, phoneBox),
    root: root ? { hidden: root.hidden, ariaHidden: root.getAttribute('aria-hidden'), pointer: getComputedStyle(root).pointerEvents, status: root.dataset.status ?? null, motion: root.dataset.motion ?? null, focusable: root.querySelectorAll('a, button, input, [tabindex]').length } : null,
    // Where the stamp lies in the phone and in the cover, as drawn (its tilt and its size at this moment included).
    stamp: shown(stamp) ? within(stamp, phoneBox) : null,
    inCover: shown(stamp) ? within(stamp, coverBox) : null,
    size: shown(stamp) ? { w: stamp.offsetWidth, h: stamp.offsetHeight } : null,
    words: shown(stamp) ? stamp.innerText : null,
    tone: stamp?.dataset.tone ?? null,
    opacity: mark && shown(mark) ? Number(getComputedStyle(mark).opacity) : null,
    transform: mark && shown(mark) ? getComputedStyle(mark).transform : null,
    look: style ? { fontSize: style.fontSize, fontWeight: style.fontWeight, fontFamily: style.fontFamily, letterSpacing: style.letterSpacing, lineHeight: style.lineHeight, padding: style.padding, border: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`, radius: style.borderTopLeftRadius, background: style.backgroundColor, color: style.color, shadow: style.boxShadow, tilt: style.transform, textTransform: style.textTransform } : null,
    animations: mark ? mark.getAnimations().map(a => ({ state: a.playState, time: a.currentTime })) : [],
    figures: room ? room.querySelectorAll('.ms-rs-fig svg').length : 0,
    bar: m.shell.element?.querySelector('.ms-ps-tb')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
    status: m.shell.element?.dataset.status ?? null,
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
const momentName = t => (t === null ? 'Gone' : `${t.toLocaleString('en-GB')} ms`);
const what = (t, reduced = false) => { const f = roundStampFrame(t ?? Infinity, { reduced }); return f.beat === 'gone' ? 'nothing drawn' : `${f.beat} · ${Math.round(f.scale * 100)} % of its size, ${Math.round(f.opacity * 100)} % solid`; };

const mounted = [];
let probe = null, agree = null;
if (params.get('agree')) {
  // The check hands this page its two captures (agree.mjs draws them and measures).
  document.body.classList.add('pv-agreement');
  agree = import('./agree.mjs');
} else if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runRoundStampProbe({ sizes: PREVIEW_SIZES, phone, intents }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const p = phone(params.get('size') ?? '390x844', {
    t: params.has('t') ? (params.get('t') === 'gone' ? null : Number(params.get('t'))) : HOLD_AT, status: params.get('status'), motion: params.get('motion'),
    live: params.has('live'), bare: params.has('bare'),
  });
  document.body.append(p.frame);
  mounted.push(p.mount());
} else if (params.get('strip')) {
  // The stamp, moment by moment, for one capture: each phone held at its time of the same phase.
  document.body.classList.add('pv-strip');
  const sizeKey = params.get('size') ?? '390x844', motion = params.get('motion');
  const grid = document.createElement('div');
  grid.className = 'pv-grid';
  document.body.append(grid);
  for (const t of STRIP) {
    const p = phone(sizeKey, { t, motion });
    grid.append(figure(momentName(t), what(t, motion === 'reduced'), p));
    mounted.push(p.mount());
  }
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Round stamp · preview</h1><p>The “ROUND 1” stamp landing over the room as Round 1 begins: the runtime component in the phone shell’s cover, over the room scene in the stage (Room A, seen by Player 4). ${FIXTURE_LABEL}. It lands in ${ROUND_STAMP_BEATS.snap[1]} ms, stands until ${ROUND_STAMP_BEATS.leave[0].toLocaleString('en-GB')} ms and is gone at ${ROUND_STAMP_BEATS.gone.toLocaleString('en-GB')} ms, on the server’s clock.</p>`;
  document.body.append(head);
  // Live phones first: the stamp as it runs, on the page's own clock.
  const liveGrid = section('Live: the stamp on this page’s clock');
  for (const [caption, options] of [['Full motion', {}], ['Reduce motion (the game’s)', { motion: 'reduced' }]]) {
    const p = phone('390x844', { ...options, live: true });
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
    const grid = section(`The stamp, moment by moment · ${sizeKey.replace('x', ' × ')}`);
    for (const t of STRIP) {
      const p = phone(sizeKey, { t });
      grid.append(figure(momentName(t), `${what(t)} · t=${t ?? 'gone'}`, p));
      mounted.push(p.mount());
    }
  }
  const policies = section('The policies: Reduce motion, reconnecting and concealed');
  for (const [caption, options] of [
    ['Reduce motion · fading in (40 ms)', { t: 40, motion: 'reduced' }],
    ['Reduce motion · standing', { t: HOLD_AT, motion: 'reduced' }],
    ['Reconnecting · stands still where it was (60 ms)', { t: 60, status: 'stale' }],
    ['Concealed · nothing drawn', { t: HOLD_AT, status: 'concealed' }],
  ]) for (const sizeKey of Object.keys(PREVIEW_SIZES)) {
    const p = phone(sizeKey, options);
    policies.append(figure(caption, sizeKey.replace('x', ' × '), p));
    mounted.push(p.mount());
  }
}

// For the check: settled once fonts and two frames have passed.
window.__stamp = {
  mounted, probe, agree, intents,
  seen: () => mounted.map(seen),
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};
