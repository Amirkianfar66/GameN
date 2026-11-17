// The results reveal (design/phone-ui/components/results-reveal): a runtime source the game imports as it is, so
// its module graph, its styles' scope, its inputs, its time and its rise are checked here, and its lifecycle on a
// stand-in for the page; its drawing, lifecycle and agreement with the result window in a browser under the
// production headers by design/tools/results-reveal-check.mjs, whose record is checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REDUCED_FADE_MS, RESULTS_REVEAL_DEFAULTS, RESULTS_REVEAL_VERSION, REVEAL_BEATS, REVEAL_EASING,
  mountResultsReveal, nextResultsRevealInput, revealFrame, revealTime,
} from '../../../design/phone-ui/components/results-reveal/results-reveal.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/results-reveal';
const read = path => readFileSync(join(REPO, path), 'utf8');
const sha256 = path => createHash('sha256').update(readFileSync(join(REPO, path))).digest('hex');
const code = path => read(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PHASE = Object.freeze({ id: 'phase-1', startedAt: 1_000_000, endsAt: 1_005_000 });
const RISE = REVEAL_BEATS.rise[1];

/** The static imports of a module, resolved: relative ones to files, the rest as package names. */
function graph(entry) {
  const seen = new Map();
  const visit = file => {
    if (seen.has(file)) return;
    const source = readFileSync(file, 'utf8');
    const specifiers = [...source.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+'([^']+)'|^\s*import\s+'([^']+)'|@import url\("([^"]+)"\)/gm)].map(m => m[1] ?? m[2] ?? m[3]);
    seen.set(file, specifiers);
    for (const s of specifiers) if (s.startsWith('.')) visit(resolve(dirname(file), s));
  };
  visit(entry);
  return seen;
}

/**
 * A stand-in for the page, enough for the reveal: an element that records what is asked of it, and animations
 * that keep their time and state as the Web Animations interface does.
 */
function page({ reduced = false, animate = true } = {}) {
  const log = [], listeners = new Set();
  const media = { matches: reduced, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  const win = { matchMedia: () => media };
  const element = () => {
    const node = { className: '', dataset: {}, hidden: false, children: [], removed: false, animations: [],
      append(child) { node.children.push(child); },
      remove() { node.removed = true; },
    };
    if (animate) node.animate = (keyframes, timing) => {
      const a = { keyframes, timing, currentTime: 0, playState: 'running', onfinish: null, cancelled: false,
        ready: Promise.resolve(),
        pause() { a.playState = 'paused'; }, play() { a.playState = 'running'; },
        cancel() { a.cancelled = true; a.playState = 'idle'; node.animations = node.animations.filter(x => x !== a); },
        finish() { a.playState = 'finished'; node.animations = node.animations.filter(x => x !== a); a.onfinish?.(); },
      };
      node.animations.push(a);
      log.push(Object.keys(keyframes[0])[0]);
      return a;
    };
    return node;
  };
  const doc = { defaultView: win, createElement: () => element() };
  const cover = { ownerDocument: doc, children: [], append(child) { cover.children.push(child); } };
  return { cover, log, media, listeners, setReduced(value) { media.matches = value; for (const fn of listeners) fn(); } };
}
const clockAt = t => { const c = { t, now: () => PHASE.startedAt + c.t }; return c; };

test('the component is a runtime source: its whole graph is runtime-safe, and it imports neither the shell nor the vote', () => {
  const files = new Map([...graph(join(REPO, COMPONENT, 'results-reveal.mjs')), ...graph(join(REPO, COMPONENT, 'results-reveal.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, [], 'no package is imported');
  assert.deepEqual([...graph(join(REPO, COMPONENT, 'results-reveal.mjs')).values()].flat(), [], 'the module imports nothing at all');
  for (const path of [`${COMPONENT}/results-reveal.mjs`, `${COMPONENT}/results-reveal.css`, 'design/phone-ui/components/kit/kit.css']) assert.ok(local.includes(path), `${path} is in the graph`);
  assert.ok(!local.some(p => /\/(?:vote|phone-shell|room-scene)\//.test(p)), 'it depends on neither the vote, the shell nor the room scene: Frontend mounts it in the shell\'s cover and the window in its host');
  // The preview, its probes and the check are development-only, and say so.
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/results-reveal-check.mjs'), /^\/\/ mothership:dev-only/);
  assert.equal(RESULTS_REVEAL_VERSION, 'results-reveal-0.1.0');
});

test('what its source may do: no clock, frame loop or timer of its own, no network, no chance, no markup, nothing of the result', () => {
  const source = code(`${COMPONENT}/results-reveal.mjs`);
  for (const [what, pattern] of [
    ['a clock of its own', /Date\.now|performance\.now|new Date/], ['a frame loop', /requestAnimationFrame/], ['a timer', /setTimeout|setInterval/],
    ['the network', /fetch\(|XMLHttpRequest|WebSocket|sendBeacon|import\(/], ['chance', /Math\.random/], ['markup or evaluated code', /innerHTML|insertAdjacentHTML|eval\(|new Function/],
    ['a safe-area reading', /env\(/], ['storage', /localStorage|sessionStorage|indexedDB/], ['an inline style', /\.style\b/],
    ['a callback or an intent', /\bon[A-Z]\w*\s*[:(]|dispatchEvent|CustomEvent/],
    ['anything of the result', /\b(?:tally|outcome|counts?|roster|seats?|viewer|role|team|voters?|ballot|selected|needed|names?)\b/i],
  ]) assert.doesNotMatch(source, pattern, `the reveal has none of: ${what}`);
  assert.equal((source.match(/\.animate\(/g) ?? []).length, 1, 'one place starts an animation');
  assert.match(source, /fill: 'none'/, 'an animation leaves nothing set when it ends');
  assert.match(source, /\.ready\.then\(/, 'the rise is sought again as the browser starts it');
});

test('its styles reach nothing outside the component: every rule is under .ms-results-reveal, and nothing there moves', () => {
  const css = read(`${COMPONENT}/results-reveal.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /^\s*@import url\("\.\.\/kit\/kit\.css"\);/, 'it starts from the kit');
  const selectors = [...css.replace(/@import[^;]*;/, '').matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(s => s && !s.startsWith('@'));
  assert.deepEqual(selectors, ['.ms-results-reveal', '.ms-results-reveal[hidden]']);
  assert.doesNotMatch(css, /@keyframes|animation|transition|transform|opacity|will-change|env\(|url\((?!"\.\.\/kit\/kit\.css"\))/, 'the motion is the module\'s, started and let go: at rest the stylesheet sets none');
  assert.match(css, /\.ms-results-reveal\s*\{\s*position: absolute; inset: 0; pointer-events: none;\s*\}/, 'the host fills the cover and takes no taps');
  assert.match(css, /\.ms-results-reveal\[hidden\]\s*\{\s*display: none;\s*\}/);
});

test('the motion tokens give the rise its time and curve, and Reduce motion its fade', () => {
  const newest = readdirSync(join(REPO, 'packages/design-tokens/src')).filter(name => /^tokens-\d+\.\d+\.\d+\.json$/.test(name)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).at(-1);
  const tokens = JSON.parse(read(`packages/design-tokens/src/${newest}`));
  assert.deepEqual(REVEAL_BEATS, { rise: [0, tokens.motionMs.publicImpact] });
  assert.equal(RISE, 320);
  assert.equal(REVEAL_EASING.css, tokens.motionEasing.settle);
  assert.deepEqual(REVEAL_EASING.css.match(/-?\d*\.?\d+/g).map(Number), [...REVEAL_EASING.points]);
  assert.equal(REDUCED_FADE_MS, tokens.motionMs.reducedMotionFade);
  assert.equal(REDUCED_FADE_MS, 80);
  for (const frozen of [REVEAL_BEATS, REVEAL_BEATS.rise, REVEAL_EASING, REVEAL_EASING.points, RESULTS_REVEAL_DEFAULTS]) assert.ok(Object.isFrozen(frozen));
});

test('inputs: the phase and the clock, this phone\'s status and motion; anything else is refused, in window too', () => {
  assert.deepEqual(RESULTS_REVEAL_DEFAULTS, { window: null, clock: null, status: 'live', reducedMotion: false });
  const clock = clockAt(0);
  const next = nextResultsRevealInput(RESULTS_REVEAL_DEFAULTS, { window: PHASE, clock });
  assert.deepEqual(next.window, PHASE);
  assert.notEqual(next.window, PHASE, 'the phase is copied');
  assert.ok(Object.isFrozen(next) && Object.isFrozen(next.window));
  assert.equal(next.clock, clock);
  assert.deepEqual({ ...nextResultsRevealInput(next, { status: 'stale' }) }, { ...next, status: 'stale' }, 'a change replaces only its own key');
  assert.equal(nextResultsRevealInput(next, { window: { ...PHASE, id: 7 } }).window.id, 7, 'an id may be a number');
  assert.equal(nextResultsRevealInput(next, { window: null }).window, null);
  for (const [what, changes] of Object.entries({
    'the tally': { tally: { outcome: 'PLAYER_JAILED' } }, 'the result': { result: {} }, 'a viewer': { viewer: 4 }, 'a roster': { roster: [] }, 'a size': { size: { width: 390, height: 600 } },
    'a callback': { onDone: () => {} }, 'an outcome in the phase': { window: { ...PHASE, outcome: 'PLAYER_JAILED' } }, 'a seat in the phase': { window: { ...PHASE, selectedSeatId: 'seat-7' } },
    'a phase with no end': { window: { id: 'p', startedAt: 5 } }, 'a phase that ends as it starts': { window: { id: 'p', startedAt: 5, endsAt: 5 } },
    'a phase with no id': { window: { id: '', startedAt: 5, endsAt: 9 } }, 'a phase as a list': { window: [1, 2, 3] }, 'a start that is not a number': { window: { id: 'p', startedAt: '5', endsAt: 9 } },
    'a clock with no now()': { clock: {} }, 'a clock as a number': { clock: 5 }, 'an unknown status': { status: 'paused' }, 'motion as a word': { reducedMotion: 'reduced' },
  })) assert.throws(() => nextResultsRevealInput(next, changes), TypeError, `refuses ${what}`);
  for (const bad of [null, 'rest', 5, [{}]]) assert.throws(() => nextResultsRevealInput(next, bad), TypeError);
});

test('time: the trusted clock\'s moment inside the phase, never before its start nor past its end', () => {
  assert.equal(revealTime(PHASE, PHASE.startedAt), 0);
  assert.equal(revealTime(PHASE, PHASE.startedAt + 120), 120);
  assert.equal(revealTime(PHASE, PHASE.startedAt - 900), 0, 'a clock a little behind the phase\'s start is its start');
  assert.equal(revealTime(PHASE, PHASE.endsAt + 4000), 5000, 'past the phase is its end');
  assert.equal(revealTime(null, PHASE.startedAt), null);
  assert.equal(revealTime(PHASE, NaN), null);
});

test('the rise: from below the stage\'s foot to its place on the settle curve, then at rest', () => {
  assert.deepEqual(revealFrame(0), { t: 0, beat: 'rise', offset: 1, still: false });
  assert.deepEqual(revealFrame(RISE), { t: RISE, beat: 'rest', offset: 0, still: true });
  assert.deepEqual(revealFrame(5000), { t: 5000, beat: 'rest', offset: 0, still: true });
  for (const rest of [NaN, Infinity, undefined, null, 'soon']) assert.equal(revealFrame(rest).beat, 'rest', `${rest} is the rest`);
  assert.deepEqual(revealFrame(-40), revealFrame(0), 'before the start is the start');
  assert.ok(Object.isFrozen(revealFrame(100)));
  // The curve itself, worked out another way: its points walked finely and read off at each time.
  const [x1, y1, x2, y2] = REVEAL_EASING.points;
  const along = (a, b, u) => 3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3;
  const walked = Array.from({ length: 200001 }, (_, i) => { const u = i / 200000; return [along(x1, x2, u), along(y1, y2, u)]; });
  const settle = x => { let lo = 0, hi = walked.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (walked[mid][0] < x) lo = mid; else hi = mid; } return walked[hi][1]; };
  let last = 1;
  for (let t = 0; t <= RISE; t += 1) {
    const { offset, beat } = revealFrame(t);
    assert.ok(offset <= last + 1e-12, `it only rises (${t} ms)`);
    assert.ok(offset >= 0 && offset <= 1);
    assert.equal(beat, t < RISE ? 'rise' : 'rest');
    assert.ok(Math.abs(offset - (t >= RISE ? 0 : 1 - settle(t / RISE))) < 2e-5, `the settle curve at ${t} ms`);
    last = offset;
  }
  // The strip's moments, as the document gives them: half-way up by 40 ms, 97 % up at 200 ms.
  const up = t => Math.round((1 - revealFrame(t).offset) * 100);
  assert.deepEqual([0, 40, 80, 120, 160, 200, 240, 320].map(up), [0, 51, 76, 88, 94, 97, 99, 100]);
});

test('lifecycle on a stand-in page: the rise sought to the clock, a late phone at rest, standing still, concealed, Reduce motion, dispose', async () => {
  // The first 320 ms: one animation of the transform, at the clock's moment, running.
  let p = page(), clock = clockAt(120);
  let reveal = mountResultsReveal(p.cover, { window: PHASE, clock });
  const host = reveal.host;
  assert.equal(p.cover.children[0], host);
  assert.equal(reveal.element, host);
  assert.equal(host.className, 'ms-results-reveal');
  assert.deepEqual(p.log, ['transform']);
  let [rise] = host.animations;
  assert.deepEqual(rise.keyframes, [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }]);
  assert.deepEqual(rise.timing, { duration: 320, easing: 'cubic-bezier(0.16, 0.84, 0.3, 1)', fill: 'none' });
  assert.equal(rise.currentTime, 120);
  assert.equal(rise.playState, 'running');
  assert.deepEqual(reveal.frame(), { window: 'phase-1', t: 120, beat: 'rise', offset: Math.round(revealFrame(120).offset * 1000) / 1000, still: false, running: true, status: 'live', reduced: false, shown: true });
  // As the browser starts it the clock has moved on: it is sought again.
  clock.t = 150;
  await rise.ready; await null;
  assert.equal(rise.currentTime, 150);
  // An update seeks to the clock; nothing new is started.
  clock.t = 200;
  reveal.update({});
  assert.equal(rise.currentTime, 200);
  assert.deepEqual(p.log, ['transform']);
  // Suspended: held at the clock's moment. Resumed: at the clock again, running.
  clock.t = 210;
  reveal.suspend();
  assert.deepEqual([rise.playState, rise.currentTime], ['paused', 210]);
  clock.t = 260;
  reveal.resume();
  assert.deepEqual([rise.playState, rise.currentTime], ['running', 260]);
  // Reconnecting: it stands where it is and does not follow the clock. Live again: the clock's moment.
  rise.currentTime = 265;
  reveal.update({ status: 'stale' });
  clock.t = 300;
  reveal.update({});
  assert.deepEqual([rise.playState, rise.currentTime, host.dataset.status], ['paused', 265, 'stale']);
  reveal.update({ status: 'live' });
  assert.deepEqual([rise.playState, rise.currentTime], ['running', 300]);
  // The browser ends it: nothing is left, and the window is at rest.
  rise.finish();
  assert.deepEqual(reveal.frame(), { window: 'phase-1', t: 300, beat: 'rest', offset: 0, still: true, running: false, status: 'live', reduced: false, shown: true });
  // Past the rise an update starts nothing; a new phase is a new arrival.
  clock.t = 900;
  reveal.update({});
  assert.deepEqual(p.log, ['transform']);
  clock.t = 60;
  reveal.update({ window: { ...PHASE, id: 'phase-2' } });
  assert.deepEqual(p.log, ['transform', 'transform']);
  assert.equal(host.animations[0].currentTime, 60);
  // Concealed: hidden, nothing running. Shown again: the clock's moment.
  reveal.update({ status: 'concealed' });
  assert.deepEqual([host.hidden, host.animations.length, reveal.frame().shown, reveal.frame().running], [true, 0, false, false]);
  clock.t = 90;
  reveal.update({ status: 'live' });
  assert.deepEqual([host.hidden, host.animations.length, host.animations[0].currentTime], [false, 1, 90]);
  // dispose(): the host goes, nothing runs, and nothing answers after; twice is safe.
  reveal.dispose();
  assert.deepEqual([host.removed, host.animations.length, reveal.frame(), p.listeners.size], [true, 0, null, 0]);
  reveal.dispose(); reveal.update({ status: 'stale' }); reveal.suspend(); reveal.resume();
  assert.equal(reveal.frame(), null);

  // A late phone: at rest the moment it mounts, with nothing started.
  for (const t of [320, 321, 2000, 5000, 9000]) {
    p = page();
    reveal = mountResultsReveal(p.cover, { window: PHASE, clock: clockAt(t) });
    assert.deepEqual([p.log, reveal.host.animations.length, reveal.frame().beat, reveal.frame().t], [[], 0, 'rest', Math.min(t, 5000)], `at ${t} ms`);
  }
  // No phase, or no clock: at rest.
  for (const input of [{}, { window: PHASE }, { clock: clockAt(100) }]) {
    p = page();
    reveal = mountResultsReveal(p.cover, input);
    assert.deepEqual([p.log, reveal.frame().beat, reveal.frame().t], [[], 'rest', null]);
  }
  // A phone that is reconnecting, or suspended, when the window first shows: the clock's moment, held.
  p = page();
  reveal = mountResultsReveal(p.cover, { window: PHASE, clock: clockAt(120), status: 'stale' });
  assert.deepEqual([reveal.host.animations[0].playState, reveal.host.animations[0].currentTime], ['paused', 120]);

  // Reduce motion, the game's: at rest, one 80 ms fade when the window first shows for a phase.
  p = page(); clock = clockAt(0);
  reveal = mountResultsReveal(p.cover, { window: PHASE, clock, reducedMotion: true });
  assert.deepEqual(p.log, ['opacity']);
  assert.deepEqual(reveal.host.animations[0].keyframes, [{ opacity: 0 }, { opacity: 1 }]);
  assert.deepEqual(reveal.host.animations[0].timing, { duration: 80, easing: 'linear', fill: 'none' });
  assert.equal(reveal.host.dataset.motion, 'reduced');
  assert.deepEqual([reveal.frame().beat, reveal.frame().reduced, reveal.frame().offset], ['rest', true, 0]);
  reveal.update({}); clock.t = 100; reveal.update({});
  assert.deepEqual(p.log, ['opacity'], 'once for a phase');
  reveal.update({ window: { ...PHASE, id: 'phase-2' } });
  assert.deepEqual(p.log, ['opacity', 'opacity'], 'and once for the next');
  // Turned off inside the rise, the window is on the clock's rise; turned on again, it does not fade twice.
  reveal.update({ reducedMotion: false });
  assert.deepEqual([p.log.at(-1), reveal.host.animations.length, reveal.host.animations[0].currentTime, reveal.host.dataset.motion], ['transform', 1, 100, undefined]);
  reveal.update({ reducedMotion: true });
  assert.deepEqual([reveal.host.animations.length, p.log.filter(k => k === 'opacity').length], [0, 2]);
  // The device's: the same, with the game's setting off; and a phone standing still does not fade.
  p = page({ reduced: true });
  reveal = mountResultsReveal(p.cover, { window: PHASE, clock: clockAt(0) });
  assert.deepEqual([p.log, reveal.frame().reduced, reveal.host.dataset.motion], [['opacity'], true, undefined]);
  p = page({ reduced: true });
  reveal = mountResultsReveal(p.cover, { window: PHASE, clock: clockAt(0), status: 'stale' });
  assert.deepEqual(p.log, []);
  // The device's setting changing is followed: on, the rise is let go.
  p = page(); clock = clockAt(50);
  reveal = mountResultsReveal(p.cover, { window: PHASE, clock });
  p.setReduced(true);
  assert.deepEqual([reveal.host.animations.length, reveal.frame().reduced, reveal.frame().beat], [0, true, 'rest']);

  // A page with no Web Animations: the window is simply at rest.
  p = page({ animate: false });
  reveal = mountResultsReveal(p.cover, { window: PHASE, clock: clockAt(100) });
  assert.deepEqual([reveal.frame().beat, reveal.frame().running], ['rest', false]);
  assert.throws(() => mountResultsReveal(null, {}), TypeError);
  assert.throws(() => mountResultsReveal(page().cover, { tally: {} }), TypeError);
});

test('the check\'s record: every capture, strip, result at rest, probe check and box agreement passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/results-reveal-check.mjs');
  assert.equal(record.version, RESULTS_REVEAL_VERSION);
  assert.ok(record.sourceClean, 'recorded against a clean source');
  assert.match(record.environment, /Not a phone, not Safari, not a performance measure/);
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const clean = (key, entry) => {
    assert.ok(entry.ok, `${key} passed`);
    assert.deepEqual(entry.problems, [], `${key}: no page error or failed request`);
    assert.ok(entry.violations.every(v => v.kind !== 'unexpected'), `${key}: no unexpected policy report`);
    if (entry.file) { assert.ok(existsSync(join(REPO, entry.file)), entry.file); assert.equal(sha256(entry.file), entry.sha256, `${key}: the picture recorded`); }
  };
  // The captures: both sizes, the rise held at 120 ms, at rest, Reduce motion (the game's and the device's), reconnecting, concealed.
  const names = ['rise-120', 'rest', 'reduced', 'device-reduced', 'stale-120', 'concealed'];
  assert.deepEqual(Object.keys(record.captures).sort(), ['390x844', '430x932'].flatMap(size => names.map(name => `${size}/${name}`)).sort());
  for (const [key, c] of Object.entries(record.captures)) {
    clean(key, c);
    const name = key.split('/')[1];
    assert.equal(c.frame.beat, name === 'rise-120' || name === 'stale-120' ? 'rise' : 'rest', key);
    if (c.frame.beat === 'rise') {
      assert.equal(c.frame.t, 120);
      assert.ok(Math.abs(c.hostBelowPx - revealFrame(120).offset * c.cover.height) <= record.curveSlackPx, `${key}: the host is where the curve puts it at 120 ms`);
      assert.deepEqual(c.host.animations, [{ state: 'paused', time: 120 }]);
    } else assert.deepEqual(c.host.animations, [], `${key}: nothing runs`);
    assert.equal(c.host.style, null, `${key}: nothing is set on the host`);
    assert.equal(c.frame.reduced, name === 'reduced' || name === 'device-reduced', key);
    if (name === 'concealed') assert.deepEqual([c.host.hidden, c.window, c.title, c.figures], [true, null, null, 0]);
    else { assert.equal(c.title, 'GUS GOES TO JAIL'); assert.ok(c.figures > 0, `${key}: the room's crew is drawn behind`); }
  }
  assert.ok(record.curveSlackPx <= 0.05);
  // The strip: the arrival at eight moments, each where the curve puts it, only ever rising.
  assert.deepEqual(Object.keys(record.strips), ['390x844', '430x932']);
  for (const [key, strip] of Object.entries(record.strips)) {
    clean(`strip ${key}`, strip);
    assert.deepEqual(strip.moments.map(m => m.t), [0, 40, 80, 120, 160, 240, 320, null]);
    strip.moments.forEach((m, i) => { assert.ok(m.ok && Math.abs(m.hostBelowPx - m.wantBelowPx) <= record.curveSlackPx); assert.ok(i === 0 || m.hostBelowPx <= strip.moments[i - 1].hostBelowPx); });
    assert.ok(strip.moments[0].hostBelowPx > 600 && strip.moments.at(-1).hostBelowPx === 0 && strip.moments.at(-2).hostBelowPx === 0, `${key}: from below the stage's foot to its place`);
  }
  // At rest, unchanged: the pack's seven result states at both sizes, pixel for pixel the window in the cover.
  const states = ['result-elected', 'result-runoff', 'result-no-captain', 'result-jailed', 'result-jail-full', 'result-no-one', 'result-jailed-8'];
  assert.deepEqual(Object.keys(record.unchanged).sort(), ['390x844', '430x932'].flatMap(size => states.map(state => `${size}/${state}`)).sort());
  for (const [key, u] of Object.entries(record.unchanged)) {
    clean(`at rest ${key}`, u);
    assert.equal(u.differingPixels, 0, `${key}: no pixel differs`);
    assert.deepEqual(u.window.hosted, u.window.direct, `${key}: the window's box is the same`);
    assert.deepEqual([u.host.animations, u.host.transform, u.host.style], [[], 'none', null]);
  }
  // The probe, as the page comes and with the device's Reduce motion.
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  assert.deepEqual(record.probe.full.checks.map(c => c.id), ['seek', 'late', 'runs', 'behind', 'suspend', 'stale', 'concealed', 'phase', 'one', 'taps', 'quiet', 'refused', 'dispose', 'reduced']);
  assert.deepEqual(record.probe['device-reduced'].checks.map(c => c.id), ['reduced']);
  assert.deepEqual(record.probe['device-reduced'].emulated, { 'prefers-reduced-motion': 'reduce' });
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.equal(run.mode, mode);
    assert.ok(run.ok && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const probe = id => record.probe.full.checks.find(c => c.id === id).detail;
  assert.ok(probe('seek').seen.every(e => e.time === e.t && e.asked.frames === 0), 'the animation\'s time is the clock\'s, and the reveal asks for no frame');
  assert.ok(Math.abs(probe('behind').behindMs) <= 40, 'after a long frame the rise is at the clock');
  assert.ok(probe('one').most.every(e => e.animations <= 1), 'one animation at most');
  // The agreement: every part of the window, in the reveal's host and in the cover, box for box.
  assert.equal(record.agree.mode, 'agree');
  assert.equal(record.agree.checks.length, 14);
  assert.ok(record.agree.ok && record.agree.checks.every(c => c.ok && c.detail.sameParts && c.detail.apartPx <= 0.01 && c.detail.sameLook && c.detail.sameText && c.detail.drawn > 60), 'every part lies where it lies in the cover');
});
