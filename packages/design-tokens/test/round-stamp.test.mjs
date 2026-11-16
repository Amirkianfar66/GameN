// The round stamp (design/phone-ui/components/round-stamp): a runtime source the game imports as it is, so its
// module graph, its styles' scope, its inputs, its time and its beats are checked here, and its lifecycle on a
// stand-in for the page; its drawing, lifecycle and agreement with the pack's own frame in a browser under the
// production headers by design/tools/round-stamp-check.mjs, whose record is checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROUND_STAMP_BEATS, ROUND_STAMP_DEFAULTS, ROUND_STAMP_EASING, ROUND_STAMP_FROM, ROUND_STAMP_REDUCED, ROUND_STAMP_VERSION, ROUND_STAMP_WORDS,
  mountRoundStamp, nextRoundStampInput, roundStampFrame, roundStampTime,
} from '../../../design/phone-ui/components/round-stamp/round-stamp.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/round-stamp';
const read = path => readFileSync(join(REPO, path), 'utf8');
const sha256 = path => createHash('sha256').update(readFileSync(join(REPO, path))).digest('hex');
const code = path => read(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
const PHASE = Object.freeze({ id: 'phase-1', startedAt: 1_000_000 });
const LENGTH = ROUND_STAMP_BEATS.gone;
const round3 = v => Math.round(v * 1000) / 1000;

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
 * A stand-in for the page, enough for the stamp and the kit's stamp in it: elements that keep what is set on them,
 * and animations that keep their time and state as the Web Animations interface does.
 */
function page({ reduced = false, animate = true } = {}) {
  const log = [], listeners = new Set();
  const media = { matches: reduced, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  const win = { matchMedia: () => media };
  const element = tag => {
    const attributes = new Map();
    const node = { tag, className: '', dataset: {}, hidden: false, children: [], removed: false, animations: [], textContent: '',
      append(...kids) { node.children.push(...kids); },
      remove() { node.removed = true; },
      setAttribute(name, value) { attributes.set(name, String(value)); }, getAttribute: name => attributes.get(name) ?? null,
      hasAttribute: name => attributes.has(name), removeAttribute(name) { attributes.delete(name); },
    };
    if (animate) node.animate = (keyframes, timing) => {
      const a = { keyframes, timing, currentTime: 0, playState: 'running', onfinish: null, cancelled: false,
        ready: Promise.resolve(),
        pause() { a.playState = 'paused'; }, play() { a.playState = 'running'; },
        cancel() { a.cancelled = true; a.playState = 'idle'; node.animations = node.animations.filter(x => x !== a); },
        finish() { a.playState = 'finished'; node.animations = node.animations.filter(x => x !== a); a.onfinish?.(); },
      };
      node.animations.push(a);
      log.push(Object.keys(keyframes[0]).filter(key => key !== 'offset' && key !== 'easing').join('+'));
      return a;
    };
    return node;
  };
  const doc = { defaultView: win, createElement: tag => element(tag) };
  const cover = { ownerDocument: doc, children: [], append(child) { cover.children.push(child); } };
  return { cover, log, media, listeners, setReduced(value) { media.matches = value; for (const fn of listeners) fn(); } };
}
const clockAt = t => { const c = { t, now: () => PHASE.startedAt + c.t }; return c; };
/** A stamp on a stand-in page: its parts, and the page. */
function stand(input, options) {
  const p = page(options);
  const stamp = mountRoundStamp(p.cover, input);
  const root = stamp.element, mark = root.children[0], label = mark.children[0];
  return { p, stamp, root, mark, label };
}

test('the component is a runtime source: its whole graph is runtime-safe, and it imports the kit and nothing else', () => {
  const files = new Map([...graph(join(REPO, COMPONENT, 'round-stamp.mjs')), ...graph(join(REPO, COMPONENT, 'round-stamp.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  assert.deepEqual(graph(join(REPO, COMPONENT, 'round-stamp.mjs')).get(join(REPO, COMPONENT, 'round-stamp.mjs')), ['../kit/kit.mjs'], 'the module imports the kit, for its stamp, and nothing else');
  for (const path of [`${COMPONENT}/round-stamp.mjs`, `${COMPONENT}/round-stamp.css`, 'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css']) assert.ok(local.includes(path), `${path} is in the graph`);
  assert.ok(!local.some(p => /\/(?:phone-shell|room-scene|results-reveal|vote)\//.test(p)), 'it imports neither the shell nor the room scene: Frontend mounts it in the shell\'s cover');
  // The preview, its probe, its comparison and the check are development-only, and say so.
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/round-stamp-check.mjs'), /^\/\/ mothership:dev-only/);
  assert.equal(ROUND_STAMP_VERSION, 'round-stamp-0.1.0');
});

test('what its source may do: no clock, frame loop or timer of its own, no network, no chance, no markup, no callback, nothing of a player', () => {
  const source = code(`${COMPONENT}/round-stamp.mjs`);
  for (const [what, pattern] of [
    ['a clock of its own', /Date\.now|performance\.now|new Date/], ['a frame loop', /requestAnimationFrame/], ['a timer', /setTimeout|setInterval/],
    ['the network', /fetch\(|XMLHttpRequest|WebSocket|sendBeacon|import\(/], ['chance', /Math\.random/], ['markup or evaluated code', /innerHTML|insertAdjacentHTML|eval\(|new Function/],
    ['a safe-area reading', /env\(/], ['storage', /localStorage|sessionStorage|indexedDB/], ['an inline style', /\.style\b/], ['a measurement of the page', /getBoundingClientRect|offsetWidth|offsetHeight|getComputedStyle|ResizeObserver/],
    ['a callback, an intent or a listener for a tap', /\bon[A-Z]\w*\s*[:(]|dispatchEvent|CustomEvent|'click'|'pointer|'touch|'key/],
    ['anything of a player or the turn', /\b(?:seats?|roles?|teams?|viewer|turn|active|roster|health|offices?|portraits?|names?)\b/i],
  ]) assert.doesNotMatch(source, pattern, `the stamp has none of: ${what}`);
  assert.equal((source.match(/\.animate\(/g) ?? []).length, 1, 'one place starts an animation');
  assert.match(source, /fill: 'none'/, 'the animation leaves nothing set when it ends');
  assert.match(source, /\.ready\.then\(/, 'the stamp is sought again as the browser starts it');
  assert.match(source, /setAttribute\('aria-hidden', 'true'\)/, 'to assistive technology it is nothing');
});

test('its styles: every rule is under .ms-round-stamp, the pack\'s size, no taps, and the phone\'s centre by the shell\'s public cover reach', () => {
  const css = read(`${COMPONENT}/round-stamp.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /^\s*@import url\("\.\.\/kit\/kit\.css"\);/, 'it starts from the kit');
  const selectors = [...css.replace(/@import[^;]*;/, '').matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(s => s && !s.startsWith('@'));
  assert.deepEqual(selectors, ['.ms-round-stamp', '.ms-round-stamp[hidden]', '.ms-round-stamp .ms-rs-mark', '.ms-round-stamp .ms-rs-mark .ms-k-stamp']);
  assert.doesNotMatch(css, /@keyframes|animation|transition|transform|will-change|env\(|url\((?!"\.\.\/kit\/kit\.css"\))/, 'the motion is the module\'s, started and let go: the stylesheet sets none');
  assert.match(css, /\.ms-round-stamp\s*\{[^}]*pointer-events: none;/, 'it takes no taps');
  assert.match(css, /\.ms-round-stamp\[hidden\]\s*\{\s*display: none;\s*\}/);
  assert.match(css, /\.ms-round-stamp \.ms-rs-mark\s*\{\s*display: inline-block; opacity: 0;\s*\}/, 'outside its animation the stamp is not drawn');
  // The pack's own size for this stamp (its room screen's stamp=round1 state), which stops where the phone's width
  // would no longer hold the words on one line (large text, or a small phone); the words never break.
  // The plain size comes first, for a browser with no container units: there the cap's line is dropped and the pack's size stands.
  assert.match(css, /\.ms-round-stamp \.ms-rs-mark \.ms-k-stamp\s*\{\s*font-size: 2\.25rem; font-size: min\(2\.25rem, calc\(\(100cqw - 76px\) \/ 5\.4\)\); padding: 10px 20px 8px; white-space: nowrap;\s*\}/);
  // At ordinary text (16 px to the rem) the pack's 36 px stands on every phone from 271 px wide; at 200 % it gives way.
  const sizeAt = (phone, rem) => Math.min(2.25 * rem, (phone - 76) / 5.4);
  assert.deepEqual([271, 320, 390, 430].map(width => sizeAt(width, 16)), [36, 36, 36, 36]);
  assert.deepEqual([320, 390, 430].map(width => Math.round(sizeAt(width, 32) * 10) / 10), [45.2, 58.1, 65.6]);
  assert.match(read('design/phone-ui/components/kit/kit.css'), /\.ms-kit:where\(\.ms-k-phone\), \.ms-kit :where\(\.ms-k-phone\) \{ container: ms-k-phone \/ inline-size; \}/, 'the shell\'s root is the kit\'s phone container, so 100cqw is the phone\'s width');
  assert.match(read('design/phone-ui/prototype/screens-game.mjs'), /h\('span\.stamp', \{ 'data-tone': 'gold', style: \{ fontSize: '2\.25rem', padding: '10px 20px 8px'/, 'as the pack writes it');
  // The pack lays its stamp over the whole phone (inset 0 of the phone); the shell's cover lies over the stage only.
  // The stamp's box reaches the phone's edges by the shell's public cover reach (shell 0.2.3), and reads nothing
  // else of the shell: none of its own properties, its classes or its attributes (the Lead Designer, #288).
  assert.match(read('design/phone-ui/prototype/screens-game.mjs'), /p\.stamp \? h\('div', \{ style: \{ position: 'absolute', inset: '0', display: 'grid', placeItems: 'center'/);
  assert.match(css, /\.ms-round-stamp\s*\{\s*position: absolute; left: 0; right: 0; top: calc\(0px - var\(--ms-ps-cover-top, 0px\)\); bottom: calc\(0px - var\(--ms-ps-cover-bottom, 0px\)\); display: grid; place-items: center;/);
  assert.deepEqual([...new Set(css.match(/--ms-ps-[\w-]+/g))].sort(), ['--ms-ps-cover-bottom', '--ms-ps-cover-top'], 'of the shell\'s properties, only its two public ones');
  assert.doesNotMatch(css, /ms-phone-shell|ms-ps-(?!cover-)|data-edge|data-tabs|data-bar/, 'no rule names the shell, a part of it or one of its states');
  // The shell's side of that contract: it sets the two on its root, places its cover by them, and sets both to 0 edge to edge.
  const shell = read('design/phone-ui/components/phone-shell/phone-shell.css');
  assert.match(shell, /\n  --ms-ps-cover-top: [^;]+;\n  --ms-ps-cover-bottom: [^;]+;/, 'the shell sets its cover\'s reach');
  assert.match(shell, /\.ms-phone-shell \.ms-ps-cover \{ position: absolute; left: 0; right: 0; top: var\(--ms-ps-cover-top\); bottom: var\(--ms-ps-cover-bottom\);/, 'the shell places its cover by its reach');
  assert.match(shell, /\.ms-phone-shell\[data-edge\] \{ --ms-ps-cover-top: 0px; --ms-ps-cover-bottom: 0px; \}/, 'edge to edge, the reach is 0');
  assert.match(read('docs/design/components/phone-shell.md'), /`--ms-ps-cover-top` and `--ms-ps-cover-bottom`[^\n]*\n[\s\S]*?These two are the shell's only public custom properties/, 'and its document calls them public');
});

test('the motion tokens give the stamp its landing, its fade and Reduce motion\'s; its length is the component\'s own', () => {
  const newest = readdirSync(join(REPO, 'packages/design-tokens/src')).filter(name => /^tokens-\d+\.\d+\.\d+\.json$/.test(name)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).at(-1);
  const tokens = JSON.parse(read(`packages/design-tokens/src/${newest}`));
  assert.deepEqual(ROUND_STAMP_BEATS, { snap: [0, 120], hold: [120, 1180], leave: [1180, 1400], gone: 1400 });
  assert.equal(ROUND_STAMP_BEATS.snap[1], tokens.motionMs.registrationStamp, 'the pack\'s "Stamp snap, 120 ms"');
  assert.equal(ROUND_STAMP_BEATS.leave[1] - ROUND_STAMP_BEATS.leave[0], tokens.motionMs.cardTransition);
  assert.equal(ROUND_STAMP_EASING.snap.css, tokens.motionEasing.snap);
  assert.equal(ROUND_STAMP_EASING.leave.css, tokens.motionEasing.standard);
  for (const curve of Object.values(ROUND_STAMP_EASING)) assert.deepEqual(curve.css.match(/-?\d*\.?\d+/g).map(Number), [...curve.points]);
  assert.deepEqual(ROUND_STAMP_REDUCED, { in: [0, 80], hold: [80, 1320], leave: [1320, 1400], gone: 1400 });
  assert.equal(ROUND_STAMP_REDUCED.in[1], tokens.motionMs.reducedMotionFade);
  assert.equal(ROUND_STAMP_REDUCED.gone - ROUND_STAMP_REDUCED.leave[0], tokens.motionMs.reducedMotionFade);
  assert.equal(ROUND_STAMP_REDUCED.gone, ROUND_STAMP_BEATS.gone, 'with Reduce motion it is gone at the same moment');
  // 1,400 ms is not a token: a constant of this component, agreed with the Lead on #288.
  assert.ok(!Object.values(tokens.motionMs).includes(LENGTH));
  assert.equal(ROUND_STAMP_FROM, 1.6);
  assert.equal(ROUND_STAMP_WORDS.round(1), 'Round 1');
  assert.equal(ROUND_STAMP_WORDS.round(4), 'Round 4');
  for (const frozen of [ROUND_STAMP_BEATS, ROUND_STAMP_BEATS.snap, ROUND_STAMP_BEATS.hold, ROUND_STAMP_BEATS.leave, ROUND_STAMP_REDUCED, ROUND_STAMP_REDUCED.in, ROUND_STAMP_EASING, ROUND_STAMP_EASING.snap, ROUND_STAMP_EASING.snap.points, ROUND_STAMP_WORDS, ROUND_STAMP_DEFAULTS]) assert.ok(Object.isFrozen(frozen));
});

test('inputs: the round, its phase and the clock, this phone\'s status and motion; anything else is refused, in window too', () => {
  assert.deepEqual(ROUND_STAMP_DEFAULTS, { round: null, window: null, clock: null, status: 'live', reducedMotion: false });
  const clock = clockAt(0);
  const next = nextRoundStampInput(ROUND_STAMP_DEFAULTS, { round: 1, window: PHASE, clock });
  assert.deepEqual(next.window, PHASE);
  assert.notEqual(next.window, PHASE, 'the phase is copied');
  assert.ok(Object.isFrozen(next) && Object.isFrozen(next.window));
  assert.equal(next.clock, clock);
  assert.deepEqual({ ...nextRoundStampInput(next, { status: 'stale' }) }, { ...next, status: 'stale' }, 'a change replaces only its own key');
  assert.equal(nextRoundStampInput(next, { window: { ...PHASE, id: 7 } }).window.id, 7, 'an id may be a number');
  assert.equal(nextRoundStampInput(next, { window: null }).window, null);
  assert.equal(nextRoundStampInput(next, { round: 12 }).round, 12);
  assert.equal(nextRoundStampInput(next, { round: null }).round, null);
  for (const [what, changes] of Object.entries({
    'a seat': { seat: 4 }, 'a viewer': { viewer: 4 }, 'a role': { role: 'Doctor' }, 'whose turn it is': { active: 7 }, 'a roster': { roster: [] }, 'a size': { size: { width: 390, height: 600 } },
    'a callback': { onDone: () => {} }, 'a skip': { skip: true }, 'the phase\'s end': { window: { ...PHASE, endsAt: PHASE.startedAt + 60000 } }, 'a kind in the phase': { window: { ...PHASE, kind: 'turn' } },
    'a phase with no id': { window: { startedAt: 5 } }, 'a phase with an empty id': { window: { id: '', startedAt: 5 } }, 'a phase with no start': { window: { id: 'p' } }, 'a phase as a list': { window: [1, 2] },
    'a start that is not a number': { window: { id: 'p', startedAt: '5' } }, 'round 0': { round: 0 }, 'round 1.5': { round: 1.5 }, 'a round as text': { round: '1' },
    'a clock with no now()': { clock: {} }, 'a clock as a number': { clock: 5 }, 'an unknown status': { status: 'paused' }, 'motion as a word': { reducedMotion: 'reduced' },
  })) assert.throws(() => nextRoundStampInput(next, changes), TypeError, `refuses ${what}`);
  for (const bad of [null, 'gone', 5, [{}]]) assert.throws(() => nextRoundStampInput(next, bad), TypeError);
});

test('time: the trusted clock\'s moment since the phase began, never before its start', () => {
  assert.equal(roundStampTime(PHASE, PHASE.startedAt), 0);
  assert.equal(roundStampTime(PHASE, PHASE.startedAt + 120), 120);
  assert.equal(roundStampTime(PHASE, PHASE.startedAt - 900), 0, 'a clock a little behind the phase\'s start is its start');
  assert.equal(roundStampTime(PHASE, PHASE.startedAt + 3_600_000), 3_600_000, 'an hour on is an hour on: the stamp is long gone');
  assert.equal(roundStampTime(null, PHASE.startedAt), null);
  assert.equal(roundStampTime(PHASE, NaN), null);
});

test('the beats: it lands a little past its size and settles, stands, and fades without moving; then nothing', () => {
  assert.deepEqual(roundStampFrame(0), { t: 0, beat: 'snap', scale: ROUND_STAMP_FROM, opacity: 0 });
  assert.deepEqual(roundStampFrame(120), { t: 120, beat: 'hold', scale: 1, opacity: 1 });
  assert.deepEqual(roundStampFrame(600), { t: 600, beat: 'hold', scale: 1, opacity: 1 });
  assert.deepEqual(roundStampFrame(1180), { t: 1180, beat: 'leave', scale: 1, opacity: 1 });
  assert.deepEqual(roundStampFrame(LENGTH), { t: LENGTH, beat: 'gone', scale: 1, opacity: 0 });
  assert.deepEqual(roundStampFrame(60000), { t: 60000, beat: 'gone', scale: 1, opacity: 0 });
  for (const gone of [NaN, Infinity, undefined, null, 'soon']) assert.equal(roundStampFrame(gone).beat, 'gone', `${gone} is gone`);
  assert.deepEqual(roundStampFrame(-40), roundStampFrame(0), 'before the start is the start');
  assert.ok(Object.isFrozen(roundStampFrame(100)));
  // Each curve worked out another way: its points walked finely and read off at each time.
  const walk = ([x1, y1, x2, y2]) => {
    const along = (a, b, u) => 3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3;
    const walked = Array.from({ length: 200001 }, (_, i) => { const u = i / 200000; return [along(x1, x2, u), along(y1, y2, u)]; });
    return x => { let lo = 0, hi = walked.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (walked[mid][0] < x) lo = mid; else hi = mid; } return walked[hi][1]; };
  };
  const snap = walk(ROUND_STAMP_EASING.snap.points), leave = walk(ROUND_STAMP_EASING.leave.points);
  let smallest = Infinity, strength = 0;
  for (let t = 0; t < 120; t += 1) {
    const f = roundStampFrame(t), e = t === 0 ? 0 : snap(t / 120);
    assert.equal(f.beat, 'snap');
    assert.ok(Math.abs(f.scale - (ROUND_STAMP_FROM + (1 - ROUND_STAMP_FROM) * e)) < 3e-5, `the snap curve at ${t} ms`);
    assert.ok(Math.abs(f.opacity - Math.min(1, Math.max(0, e))) < 3e-5);
    assert.ok(f.opacity >= strength - 1e-12 && f.opacity <= 1, `it only grows more solid (${t} ms)`);
    strength = f.opacity; smallest = Math.min(smallest, f.scale);
  }
  assert.ok(smallest < 1 && smallest > 0.97, `it goes a little past its size and no further (${smallest})`);
  for (let t = 120; t < 1180; t += 20) assert.deepEqual([roundStampFrame(t).beat, roundStampFrame(t).scale, roundStampFrame(t).opacity], ['hold', 1, 1]);
  let last = 1;
  for (let t = 1180; t < LENGTH; t += 1) {
    const f = roundStampFrame(t);
    assert.deepEqual([f.beat, f.scale], ['leave', 1], 'it does not move as it fades');
    assert.ok(Math.abs(f.opacity - (t === 1180 ? 1 : 1 - leave((t - 1180) / 220))) < 3e-5, `the fade's curve at ${t} ms`);
    assert.ok(f.opacity <= last + 1e-12 && f.opacity >= 0);
    last = f.opacity;
  }
  // The strip's moments, as the document gives them: size and strength in per cent.
  const at = (t, options) => { const f = roundStampFrame(t, options); return [Math.round(f.scale * 100), Math.round(f.opacity * 100)]; };
  assert.deepEqual([0, 30, 80, 120, 600, 1250, 1330].map(t => at(t)), [[160, 0], [106, 89], [99, 100], [100, 100], [100, 100], [100, 29], [100, 4]]);
  // Reduce motion: an 80 ms fade in, standing, an 80 ms fade out, with no change of size.
  assert.deepEqual([0, 30, 80, 120, 600, 1250, 1330].map(t => at(t, { reduced: true })), [[100, 0], [100, 38], [100, 100], [100, 100], [100, 100], [100, 100], [100, 88]]);
  assert.deepEqual([0, 40, 80, 1319, 1320, 1360, 1399].map(t => roundStampFrame(t, { reduced: true }).beat), ['in', 'in', 'hold', 'hold', 'leave', 'leave', 'leave']);
  assert.deepEqual(roundStampFrame(40, { reduced: true }), { t: 40, beat: 'in', scale: 1, opacity: 0.5 });
  assert.deepEqual(roundStampFrame(1360, { reduced: true }), { t: 1360, beat: 'leave', scale: 1, opacity: 0.5 });
  assert.equal(roundStampFrame(LENGTH, { reduced: true }).beat, 'gone');
});

test('lifecycle on a stand-in page: sought to the clock, a late phone with nothing, standing still, concealed, Reduce motion, dispose', async () => {
  // Inside its length: one animation of its size and strength, at the clock's moment, running.
  let clock = clockAt(40);
  let { p, stamp, root, mark, label } = stand({ round: 1, window: PHASE, clock });
  assert.equal(p.cover.children[0], root);
  assert.deepEqual([root.tag, root.className, root.getAttribute('aria-hidden'), root.children.length], ['div', 'ms-round-stamp ms-kit', 'true', 1]);
  assert.deepEqual([mark.tag, mark.className, mark.children.length], ['span', 'ms-rs-mark', 1]);
  assert.deepEqual([label.className, label.getAttribute('data-tone'), label.textContent], ['ms-k-stamp', 'gold', 'Round 1'], 'the kit\'s gold stamp');
  assert.deepEqual(p.log, ['transform+opacity']);
  let [a] = mark.animations;
  assert.deepEqual(a.keyframes, [
    { offset: 0, transform: 'scale(1.6)', opacity: 0, easing: 'cubic-bezier(0.2, 1.3, 0.4, 1)' },
    { offset: 120 / 1400, transform: 'scale(1)', opacity: 1, easing: 'linear' },
    { offset: 1180 / 1400, transform: 'scale(1)', opacity: 1, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    { offset: 1, transform: 'scale(1)', opacity: 0 },
  ]);
  assert.deepEqual(a.timing, { duration: 1400, fill: 'none' });
  assert.deepEqual([a.currentTime, a.playState], [40, 'running']);
  assert.deepEqual(stamp.frame(), { window: 'phase-1', round: 1, t: 40, beat: 'snap', scale: round3(roundStampFrame(40).scale), opacity: round3(roundStampFrame(40).opacity), running: true, status: 'live', reduced: false, shown: true });
  // As the browser starts it the clock has moved on: it is sought again.
  clock.t = 70;
  await a.ready; await null;
  assert.equal(a.currentTime, 70);
  // An update seeks to the clock; nothing new is started.
  clock.t = 200;
  stamp.update({});
  assert.equal(a.currentTime, 200);
  assert.deepEqual(p.log, ['transform+opacity']);
  // Suspended: held at the clock's moment. Resumed: at the clock again, running.
  clock.t = 210;
  stamp.suspend();
  assert.deepEqual([a.playState, a.currentTime, stamp.frame().running], ['paused', 210, false]);
  clock.t = 400;
  stamp.resume();
  assert.deepEqual([a.playState, a.currentTime], ['running', 400]);
  // Reconnecting: it stands where it is and does not follow the clock. Live again: the clock's moment.
  a.currentTime = 415;
  stamp.update({ status: 'stale' });
  clock.t = 600;
  stamp.update({});
  assert.deepEqual([a.playState, a.currentTime, root.dataset.status], ['paused', 415, 'stale']);
  stamp.update({ status: 'live' });
  assert.deepEqual([a.playState, a.currentTime, root.dataset.status], ['running', 600, 'live']);
  // The browser ends it: nothing is left and nothing runs.
  clock.t = LENGTH;
  a.finish();
  assert.deepEqual(stamp.frame(), { window: 'phase-1', round: 1, t: LENGTH, beat: 'gone', scale: 1, opacity: 0, running: false, status: 'live', reduced: false, shown: true });
  // Past its length an update starts nothing; a new phase is a new stamp, and a new round names itself.
  clock.t = 9000;
  stamp.update({});
  assert.deepEqual([p.log, mark.animations.length], [['transform+opacity'], 0]);
  clock.t = 60;
  stamp.update({ window: { ...PHASE, id: 'phase-2' }, round: 2 });
  assert.deepEqual(p.log, ['transform+opacity', 'transform+opacity']);
  assert.deepEqual([mark.animations[0].currentTime, label.textContent, stamp.frame().window, stamp.frame().round], [60, 'Round 2', 'phase-2', 2]);
  stamp.update({ window: { ...PHASE, id: 'phase-2' } });
  assert.equal(p.log.length, 2, 'the same phase again is the same stamp');
  // Concealed: hidden, nothing running. Shown again: the clock's moment.
  stamp.update({ status: 'concealed' });
  assert.deepEqual([root.hidden, mark.animations.length, stamp.frame().shown, stamp.frame().running, stamp.frame().beat], [true, 0, false, false, 'gone']);
  clock.t = 90;
  stamp.update({ status: 'live' });
  assert.deepEqual([root.hidden, mark.animations.length, mark.animations[0].currentTime], [false, 1, 90]);
  // No round: nothing is drawn.
  stamp.update({ round: null });
  assert.deepEqual([mark.animations.length, stamp.frame().beat, stamp.frame().round, label.textContent], [0, 'gone', null, '']);
  stamp.update({ round: 2 });
  // dispose(): the stamp goes, nothing runs, and nothing answers after; twice is safe.
  stamp.dispose();
  assert.deepEqual([root.removed, mark.animations.length, stamp.frame(), p.listeners.size], [true, 0, null, 0]);
  stamp.dispose(); stamp.update({ status: 'stale' }); stamp.suspend(); stamp.resume();
  assert.equal(stamp.frame(), null);

  // The browser starts it after the clock has passed its length: it is let go, not shown.
  clock = clockAt(1390);
  ({ p, stamp, mark } = stand({ round: 1, window: PHASE, clock }));
  [a] = mark.animations;
  clock.t = 1500;
  await a.ready; await null;
  assert.deepEqual([a.cancelled, mark.animations.length, stamp.frame().beat], [true, 0, 'gone']);

  // A late phone: nothing drawn the moment it mounts, and nothing started.
  for (const t of [LENGTH, LENGTH + 1, 5000, 60000, 3_600_000]) {
    ({ p, stamp, mark } = stand({ round: 1, window: PHASE, clock: clockAt(t) }));
    assert.deepEqual([p.log, mark.animations.length, stamp.frame().beat, stamp.frame().t, stamp.frame().opacity], [[], 0, 'gone', t, 0], `at ${t} ms`);
  }
  // No round, no phase, or no clock: nothing.
  for (const input of [{}, { round: 1 }, { round: 1, window: PHASE }, { window: PHASE, clock: clockAt(100) }, { round: 1, clock: clockAt(100) }]) {
    ({ p, stamp, mark, label } = stand(input));
    assert.deepEqual([p.log, mark.animations.length, stamp.frame().beat], [[], 0, 'gone']);
  }
  // A phone that is reconnecting when the round begins: the stamp does not begin. Live inside its length, it shows the clock's moment.
  clock = clockAt(60);
  ({ p, stamp, mark } = stand({ round: 1, window: PHASE, clock, status: 'stale' }));
  assert.deepEqual([p.log, mark.animations.length, stamp.frame().beat], [[], 0, 'gone']);
  clock.t = 200;
  stamp.update({ status: 'live' });
  assert.deepEqual([p.log, mark.animations[0].currentTime, mark.animations[0].playState], [['transform+opacity'], 200, 'running']);
  // Suspended as it mounts: held at the clock's moment.
  ({ p, stamp, mark } = stand({ round: 1, window: PHASE, clock: clockAt(120) }));
  stamp.suspend();
  assert.deepEqual([mark.animations[0].playState, mark.animations[0].currentTime], ['paused', 120]);

  // Reduce motion, the game's: one animation of its strength alone, on the same clock.
  clock = clockAt(40);
  ({ p, stamp, root, mark } = stand({ round: 1, window: PHASE, clock, reducedMotion: true }));
  assert.deepEqual(p.log, ['opacity']);
  assert.deepEqual(mark.animations[0].keyframes, [{ offset: 0, opacity: 0, easing: 'linear' }, { offset: 80 / 1400, opacity: 1, easing: 'linear' }, { offset: 1320 / 1400, opacity: 1, easing: 'linear' }, { offset: 1, opacity: 0 }]);
  assert.deepEqual(mark.animations[0].timing, { duration: 1400, fill: 'none' });
  assert.deepEqual([mark.animations[0].currentTime, root.dataset.motion], [40, 'reduced']);
  assert.deepEqual([stamp.frame().beat, stamp.frame().scale, stamp.frame().opacity, stamp.frame().reduced], ['in', 1, 0.5, true]);
  // Turned off part-way, the stamp goes on from the clock's moment in full motion; and back.
  clock.t = 60;
  stamp.update({ reducedMotion: false });
  assert.deepEqual([p.log, mark.animations.length, mark.animations[0].currentTime, root.dataset.motion], [['opacity', 'transform+opacity'], 1, 60, undefined]);
  stamp.update({ reducedMotion: true });
  assert.deepEqual([p.log.at(-1), mark.animations.length, mark.animations[0].currentTime], ['opacity', 1, 60]);
  // The device's: the same, with the game's setting off.
  ({ p, stamp, root, mark } = stand({ round: 1, window: PHASE, clock: clockAt(40) }, { reduced: true }));
  assert.deepEqual([p.log, stamp.frame().reduced, stamp.frame().beat, root.dataset.motion], [['opacity'], true, 'in', undefined]);
  // The device's setting changing is followed, from the clock's moment.
  clock = clockAt(50);
  ({ p, stamp, mark } = stand({ round: 1, window: PHASE, clock }));
  clock.t = 90;
  p.setReduced(true);
  assert.deepEqual([p.log, mark.animations.length, mark.animations[0].currentTime, stamp.frame().reduced, stamp.frame().beat], [['transform+opacity', 'opacity'], 1, 90, true, 'hold']);

  // A page with no Web Animations: nothing is drawn.
  ({ p, stamp, mark } = stand({ round: 1, window: PHASE, clock: clockAt(100) }, { animate: false }));
  assert.deepEqual([stamp.frame().beat, stamp.frame().running, stamp.frame().opacity], ['gone', false, 0]);
  assert.throws(() => mountRoundStamp(null, {}), TypeError);
  assert.throws(() => mountRoundStamp({}, {}), TypeError);
  assert.throws(() => mountRoundStamp(page().cover, { seat: 4 }), TypeError);
});

test('the document says what was agreed: the length, Round 1 only as drawn, the window it is given, no taps, no sound', () => {
  const doc = read('docs/design/components/round-stamp.md');
  assert.match(doc, /\*\*Version:\*\* `round-stamp-0\.1\.0`/);
  assert.match(doc, /agreed by the Lead Designer on 16 November 2026/);
  assert.match(doc, /The component only reads the `window` it is given/);
  assert.match(doc, /1,400 ms/);
  assert.doesNotMatch(doc, /Nothing is built|## Questions for the Lead/, 'it is no longer a proposal');
});

test('the check\'s record: every capture, strip, comparison with the pack and probe check passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/round-stamp-check.mjs');
  assert.equal(record.version, ROUND_STAMP_VERSION);
  assert.ok(record.sourceClean, 'recorded against a clean source');
  assert.match(record.sourceCommit, /^[0-9a-f]{40}$/);
  assert.match(record.environment, /Not a phone, not Safari, not a performance measure/);
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  assert.deepEqual(record.limits, { curve: 0.003, centrePx: 0.5, boxPx: 0.5, face: 3, controlFactor: 2 });
  const clean = (key, entry) => {
    assert.ok(entry.ok, `${key} passed`);
    assert.deepEqual(entry.problems, [], `${key}: no page error or failed request`);
    assert.ok(entry.violations.every(v => v.kind !== 'unexpected'), `${key}: no unexpected policy report`);
    if (entry.file) { assert.ok(existsSync(join(REPO, entry.file)), entry.file); assert.equal(sha256(entry.file), entry.sha256, `${key}: the picture recorded`); }
  };
  const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
  // The captures: both sizes; the landing, standing, leaving and gone; Reduce motion (the game's and the device's); reconnecting; concealed.
  const moments = { 'snap-30': [30, false], 'snap-80': [80, false], hold: [600, false], 'leave-1250': [1250, false], gone: [null, false], 'reduced-in-40': [40, true], reduced: [600, true], 'device-reduced-40': [40, true], 'stale-60': [60, false], concealed: [null, false] };
  assert.deepEqual(Object.keys(record.captures).sort(), Object.keys(SIZES).flatMap(size => Object.keys(moments).map(name => `${size}/${name}`)).sort());
  for (const [key, c] of Object.entries(record.captures)) {
    clean(key, c);
    const [size, name] = key.split('/'), [t, reduced] = moments[name], [width, height] = SIZES[size];
    const want = roundStampFrame(name === 'concealed' ? Infinity : t ?? Infinity, { reduced });
    assert.equal(c.frame.beat, want.beat, key);
    assert.equal(c.frame.reduced, reduced, key);
    assert.equal(c.frame.status, name === 'stale-60' ? 'stale' : name === 'concealed' ? 'concealed' : 'live');
    assert.deepEqual([c.root.ariaHidden, c.root.focusable, c.tone], ['true', 0, 'gold'], `${key}: nothing to assistive technology, the gold stamp`);
    if (want.beat === 'gone') { assert.deepEqual(c.animations, [], `${key}: nothing runs`); assert.ok(name === 'concealed' ? c.root.hidden && c.stamp === null : c.opacity === 0, `${key}: nothing is drawn`); continue; }
    assert.deepEqual(c.animations, [{ state: 'paused', time: t }], `${key}: held at its moment`);
    assert.ok(Math.abs(c.drawn.scale - want.scale) <= record.limits.curve && Math.abs(c.drawn.opacity - want.opacity) <= record.limits.curve, `${key}: the size and strength its moment gives it`);
    assert.ok(Math.abs(c.drawn.centre.x - width / 2) <= record.limits.centrePx && Math.abs(c.drawn.centre.y - height / 2) <= record.limits.centrePx, `${key}: its centre is the phone's`);
    assert.equal(c.words, 'ROUND 1');
    assert.equal(c.root.pointer, 'none', `${key}: it takes no taps`);
    assert.ok(c.figures > 0, `${key}: the room's crew is drawn under it`);
  }
  assert.equal(record.captures['390x844/device-reduced-40'].emulated['prefers-reduced-motion'], 'reduce');
  assert.equal(record.captures['390x844/device-reduced-40'].root.motion, null, 'the device\'s setting, with the game\'s off');
  assert.equal(record.captures['390x844/reduced'].root.motion, 'reduced');
  // The strips: the stamp at eight moments, in full motion and with Reduce motion, at both sizes.
  assert.deepEqual(Object.keys(record.strips).sort(), ['390x844/full', '390x844/reduced', '430x932/full', '430x932/reduced']);
  for (const [key, strip] of Object.entries(record.strips)) {
    clean(`strip ${key}`, strip);
    const reduced = key.endsWith('/reduced');
    assert.deepEqual(strip.moments.map(m => m.t), [0, 30, 80, 120, 600, 1250, 1330, null]);
    for (const m of strip.moments) {
      const want = roundStampFrame(m.t ?? Infinity, { reduced });
      assert.ok(m.ok, `${key} at ${m.t}`);
      assert.equal(m.want.beat, want.beat);
      if (want.beat !== 'gone') assert.ok(Math.abs(m.drawn.scale - want.scale) <= record.limits.curve && Math.abs(m.drawn.opacity - want.opacity) <= record.limits.curve, `${key} at ${m.t} ms`);
    }
  }
  // Beside the pinned pack's own frame: the same words, the same look, the same box, the same face.
  assert.deepEqual(Object.keys(record.agree), ['390x844', '430x932']);
  assert.match(record.pack.page, /^design\/phone-ui\/prototype\/index\.html\?s=room&room=room-a&stamp=round1&safe=47,34&chrome=0$/);
  for (const [file, hash] of Object.entries(record.pack.files)) assert.equal(sha256(file), hash, `${file}: the pack as compared`);
  for (const [key, a] of Object.entries(record.agree)) {
    clean(`beside the pack ${key}`, a);
    assert.deepEqual(a.packProblems, []);
    assert.deepEqual([a.words.pack, a.words.stamp, a.words.tone.pack, a.words.tone.stamp], ['ROUND 1', 'ROUND 1', 'gold', 'gold']);
    assert.deepEqual(Object.keys(a.look), ['fontSize', 'fontWeight', 'fontFamily', 'letterSpacing', 'lineHeight', 'padding', 'border', 'radius', 'background', 'color', 'shadow', 'tilt', 'textTransform']);
    for (const [property, l] of Object.entries(a.look)) assert.ok(l.ok && l.pack === l.stamp, `${key}: the same ${property}`);
    assert.deepEqual([a.look.fontSize.stamp, a.look.padding.stamp], ['36px', '10px 20px 8px']);
    assert.ok(a.box.ok && a.box.delta <= record.limits.boxPx, `${key}: the same box, to half a pixel (${a.box.delta})`);
    assert.deepEqual(a.box.size.pack, a.box.size.stamp);
    assert.ok(a.pixels.ok && a.pixels.face.mean <= record.limits.face && a.pixels.face.pixels > 10000, `${key}: the same face (${a.pixels.face.mean} levels over ${a.pixels.face.pixels} pixels)`);
    for (const [name, control] of Object.entries(a.pixels.controls)) assert.ok(control.ok && control.mean > record.limits.face && control.mean >= a.pixels.face.mean * record.limits.controlFactor, `${key}: a stamp ${name} would not pass (${control.mean})`);
    // The pack lays the stamp over the whole phone and gives it its own taps; the component takes none, as agreed.
    assert.deepEqual([a.layer.pack.in, a.layer.pack.position, a.layer.pack.stampPointer, a.layer.stamp.pointer], ['the phone', 'absolute', 'auto', 'none']);
  }
  // The probe, as the page comes and with the device's Reduce motion.
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  assert.deepEqual(record.probe.full.checks.map(c => c.id), ['seek', 'late', 'runs', 'behind', 'suspend', 'stale', 'concealed', 'phase', 'one', 'taps', 'quiet', 'refused', 'dispose', 'large', 'reduced']);
  assert.deepEqual(record.probe['device-reduced'].checks.map(c => c.id), ['reduced']);
  assert.deepEqual(record.probe['device-reduced'].emulated, { 'prefers-reduced-motion': 'reduce' });
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.equal(run.mode, mode);
    assert.ok(run.ok && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const probe = id => record.probe.full.checks.find(c => c.id === id).detail;
  assert.ok(probe('seek').seen.every(e => e.time === e.t && e.asked.frames === 0 && e.asked.timers === 0), 'the animation\'s time is the clock\'s, and the stamp asks for no frame and sets no timer');
  assert.ok(probe('late').seen.every(e => e.gone && e.asked.animations === 0), 'a late phone sees no stamp, and nothing is started');
  assert.ok(Math.abs(probe('behind').behindMs) <= 12, 'after a long frame the stamp is at the clock');
  assert.ok(Math.max(...probe('one').most) === 1, 'one animation at most');
  assert.ok(probe('taps').inRoom && !probe('taps').inStamp && probe('taps').control.intents.length === 1, 'a tap on the stamp reaches the room under it');
  // Larger text, measured by the probe (the Lead Designer, #288): at 200 % on 390 × 844 and on 320 × 568 the stamp is
  // on one line, at least 12 px inside each edge; at 100 % it is the pack's 36 px. Its box reaches the phone's edges
  // by the shell's public cover reach in all four, and its centre is the phone's.
  const large = probe('large');
  assert.equal(large.edgeClear, 12);
  assert.deepEqual(large.seen.map(e => [e.text, e.phone]), [[100, '390 × 844'], [100, '320 × 568'], [200, '390 × 844'], [200, '320 × 568']]);
  for (const e of large.seen) {
    const at = `${e.phone} at ${e.text} %`;
    assert.deepEqual([e.words, e.lines, e.drawn], ['ROUND 1', 1, true], `${at}: one line`);
    assert.ok(Math.abs(e.own.h - e.oneLineHeight) <= 1, `${at}: one line's height`);
    assert.ok(e.clear.left >= 12 && e.clear.right >= 12, `${at}: at least 12 px inside each edge (${e.clear.left}, ${e.clear.right})`);
    assert.ok(Math.abs(e.font - e.cap) <= 0.01, `${at}: the size its cap gives (${e.font})`);
    assert.ok(Math.abs(e.offCentre.x) <= 0.5 && Math.abs(e.offCentre.y) <= 0.5, `${at}: centred on the phone`);
    assert.ok([e.box.top, e.box.bottom, e.box.left, e.box.right].every(v => Math.abs(v) <= 0.01) && e.cover.top > 0, `${at}: its box reaches the phone's edges past the cover`);
  }
  assert.deepEqual(large.seen.filter(e => e.text === 100).map(e => e.font), [36, 36], 'at ordinary text, the pack\'s 36 px on both phones');
  assert.deepEqual(large.seen.filter(e => e.text === 200).map(e => e.font), [58.15, 45.19], 'at 200 %, the cap on both phones');
  // At 200 % the shell's bars are taller on each phone, so its cover lies lower; the stamp is still centred on the phone.
  assert.ok(large.seen.filter(e => e.text === 200).every(e => e.pack === 72 && e.cover.top > large.seen.find(o => o.text === 100 && o.phone === e.phone).cover.top));
});
