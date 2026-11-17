// mothership:dev-only
//
// The ship travel's preview: the runtime component itself (../ship-travel.mjs, unchanged) in the phone shell's
// stage (../../phone-shell/phone-shell.mjs, unchanged), as sheet 41 draws the public screen: a phase bar, no tabs,
// and the stage edge to edge (`edge: true`), so the film covers the whole phone under the bar's glass, as the pack
// draws the poster. On a labelled synthetic clock and window, at the two development phone sizes; the top bar's
// words are sheet 41's.
//   index.html                                        every state at 390 × 844 and 430 × 932, and a live phone
//   index.html?single=1&size=390x844&state=setting    one phone at the state's moment, for the check's captures
//   index.html?probe=1                                the lifecycle probe (probe.mjs), for the check
//   index.html?compare=full                           the still at the poster's 1920 × 1080, for the comparison
//   index.html?compare=phone&size=390x844             the approved poster as the pack draws it, beside the film
//   index.html?strip=1&size=390x844                   the film at ten moments of its window, side by side (the beats)

import { mountPhoneShell } from '../../phone-shell/phone-shell.mjs';
import { SHIP_TRAVEL_VERSION, mountShipTravel } from '../ship-travel.mjs';

/** The approved poster, as the pack's nav screen uses it (design/phone-ui/prototype/screens-more.mjs, `nav`). */
export const POSTER = new URL('../../../../../apps/game/candidates/planet-library/transit.poster.webp', import.meta.url).href;
export const FIXTURE_LABEL = 'Synthetic fixture · an invented window and clock';

/** The development phone sizes, with the pack's review frames' safe areas. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
});

// A synthetic window: Round 3's navigation, 15 s, as the server publishes the phase (P28).
const EPOCH = Date.UTC(2026, 10, 15, 12, 0, 0);
export const WINDOW = Object.freeze({ id: 'synthetic-nav-r3', startedAt: EPOCH, endsAt: EPOCH + 15000 });
const fixed = ms => Object.freeze({ now: () => EPOCH + ms });

// The public clock only counts the film down; no one watching acts, so it is never amber (urgentAtMs: -1), as the pack
// passes urgentAt: -1 for the 5 s result and the role stage. The offices' private view keeps the default.
const bar = {
  setting: ms => ({ kind: 'phase', icon: 'course', title: 'Setting course', sub: 'The offices are setting it', round: 3, timer: { remainingMs: Math.max(0, 15000 - ms), urgentAtMs: -1 }, promises: { count: 0 }, menu: {} }),
  moved: () => ({ kind: 'phase', icon: 'course', title: 'The ship moved', sub: 'Round 3 complete', round: 3, promises: { count: 0 }, menu: {} }),
  stale: () => ({ kind: 'phase', icon: 'retry', title: 'Reconnecting…', sub: 'Showing Round 3 as last seen', round: 3, promises: { count: 0 }, menu: {} }),
};

/** Each state: its caption, the moment on the clock, the shell's input and the film's. */
export const PREVIEW_STATES = Object.freeze({
  setting: { caption: 'Everyone · setting course (sheet 41) · 4 s in', at: 4000, shell: { bar: bar.setting(4000) }, film: {} },
  enter: { caption: 'The ship comes in · 0.6 s', at: 600, shell: { bar: bar.setting(600) }, film: {} },
  settle: { caption: 'The ship settles · 14.4 s', at: 14400, shell: { bar: bar.setting(14400) }, film: {} },
  moved: { caption: 'Everyone · moved (sheet 41)', at: 15600, shell: { bar: bar.moved() }, film: { state: 'moved' } },
  reduced: { caption: 'The game’s Reduce motion · the still', at: 4000, shell: { bar: bar.setting(4000), reducedMotion: true }, film: { reducedMotion: true } },
  stale: { caption: 'Reconnecting · stands still at 9 s', at: 9000, shell: { status: 'stale', bar: bar.stale(), banner: { kind: 'reconnecting' } }, film: { status: 'stale' } },
  concealed: { caption: 'Concealed', at: 4000, shell: { status: 'concealed', bar: bar.setting(4000) }, film: { status: 'concealed' } },
  noclock: { caption: 'No trusted clock · the still', at: 4000, shell: { bar: bar.setting(4000) }, film: { clock: null } },
});

/** The moments of the beats strip, in ms into the window. */
export const STRIP = Object.freeze([0, 150, 400, 700, 1200, 7500, 13800, 14300, 14800, 15000]);

/** A phone at a development size: the shell (a bar, no tabs, edge to edge) and the film in its stage. */
function phone(sizeKey, stateKey, { clock = null, hold = true } = {}) {
  const size = PREVIEW_SIZES[sizeKey], state = PREVIEW_STATES[stateKey];
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  return { frame, mount: () => {
    let film = null;
    // Edge to edge, the stage is the whole phone; the caption keeps 24 px above the shell's bottom safe area.
    const fit = layout => ({ size: layout.stage, safe: { bottom: layout.safe.bottom } });
    const shell = mountPhoneShell(frame, { viewer: null, tabs: null, edge: true, insets: size.insets, ...state.shell }, { onLayout: layout => film?.update(fit(layout)) });
    film = mountShipTravel(shell.stage, { window: WINDOW, clock: clock ?? fixed(state.at), ...fit(shell.layout()), ...state.film });
    // A fixed moment is a still picture: the film holds it.
    if (hold && !clock) film.suspend();
    return { shell, film };
  } };
}

/** A phone on a running clock: a window every 19 s, "moved" when it ends, as the server would publish them. */
function livePhone(sizeKey) {
  let start = performance.now(), round = 0;
  const now = () => EPOCH + (performance.now() - start);
  const clock = { now };
  const p = phone(sizeKey, 'setting', { clock, hold: false });
  return { frame: p.frame, mount: () => {
    const m = p.mount();
    const windowAt = base => ({ id: `synthetic-nav-live-${(round += 1)}`, startedAt: base, endsAt: base + 15000 });
    let current = windowAt(now());
    m.film.update({ window: current, state: 'setting' });
    const timer = setInterval(() => {
      const t = now() - current.startedAt;
      if (t >= 19000) { current = windowAt(now()); m.film.update({ window: current, state: 'setting' }); m.shell.update({ bar: bar.setting(0) }); }
      else if (t >= 15300) { m.film.update({ state: 'moved' }); m.shell.update({ bar: bar.moved() }); }
      else m.shell.update({ bar: bar.setting(t) });
    }, 250);
    const replay = () => { current = windowAt(now()); m.film.update({ window: current, state: 'setting' }); };
    return { ...m, replay, stop: () => clearInterval(timer) };
  } };
}

const params = new URLSearchParams(location.search);
const mounted = [];
let probe = null, compare = null;
if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runShipTravelProbe())
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('compare') === 'full') {
  // The still alone at the poster's own size and frame, for the pixel comparison with the approved poster.
  document.body.classList.add('pv-single');
  const host = document.createElement('div');
  host.className = 'pv-full';
  document.body.append(host);
  const film = mountShipTravel(host, { window: WINDOW, clock: fixed(15600), state: 'moved', caption: false, size: { width: 1920, height: 1080 } });
  mounted.push({ film });
  compare = import('./compare.mjs').then(m => ({ full: options => m.compareFull({ poster: POSTER, ...options }) }));
} else if (params.get('compare') === 'phone') {
  // Left: the approved poster as the pack's nav screen draws it, over the whole phone. Right: the shell and the film.
  document.body.classList.add('pv-single');
  const sizeKey = params.get('size') ?? '390x844', size = PREVIEW_SIZES[sizeKey];
  const pair = document.createElement('div');
  pair.className = 'pv-pair';
  const pack = document.createElement('div');
  pack.className = 'pv-phone';
  Object.assign(pack.style, { width: `${size.width}px`, height: `${size.height}px` });
  const poster = document.createElement('div');
  poster.className = 'pv-poster';
  poster.style.backgroundImage = `url("${POSTER}")`;
  pack.append(poster);
  const p = phone(sizeKey, 'moved');
  pair.append(pack, p.frame);
  document.body.append(pair);
  const m = p.mount();
  m.film.update({ caption: false });
  mounted.push(m);
  // Compared below the bar, whose glass lies over the film as over the pack's poster.
  const top = m.shell.element.querySelector('.ms-ps-tb').getBoundingClientRect().bottom - p.frame.getBoundingClientRect().top;
  compare = import('./compare.mjs').then(cmp => ({ phone: options => cmp.comparePhone({ size, top, ...options }) }));
} else if (params.get('strip')) {
  // The beats, side by side: the space opens and the ship comes in, it cruises, it settles into the still.
  document.body.classList.add('pv-single');
  const sizeKey = params.get('size') ?? '390x844';
  const row = document.createElement('div');
  row.className = 'pv-pair';
  document.body.append(row);
  for (const at of STRIP) {
    const p = phone(sizeKey, 'setting', { clock: fixed(at) });
    row.append(p.frame);
    const m = p.mount();
    m.shell.update({ bar: at >= 15000 ? bar.moved() : bar.setting(at) });
    m.film.update(at >= 15000 ? { state: 'moved' } : {});
    m.film.suspend();
    mounted.push(m);
  }
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const stateKey = params.get('state') ?? 'setting', sizeKey = params.get('size') ?? '390x844';
  if (!PREVIEW_SIZES[sizeKey] || !PREVIEW_STATES[stateKey]) throw new Error(`Unknown size or state: ${sizeKey} ${stateKey}`);
  const p = phone(sizeKey, stateKey);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = `<h1>Ship travel · preview</h1><p>The runtime component (${SHIP_TRAVEL_VERSION}) in the phone shell's stage, tabs hidden: sheet 41's public navigation. ${FIXTURE_LABEL}. The first phone runs on a clock, a window every 19 s; the others hold one moment. Desktop browser at each phone's CSS size: not a phone.</p>`;
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
  const caption = cell('Live · on the clock', '390 × 844 · a window every 19 s', live);
  const m = live.mount();
  const replay = document.createElement('button');
  replay.type = 'button';
  replay.textContent = 'Start a new window';
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
window.__shipTravel = {
  mounted, probe, compare,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};
