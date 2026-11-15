// The end scene component (design/phone-ui/components/end-scene): a runtime source the game imports as it is, so its
// module graph, its styles' scope, the port of the approved arrival's drawing, its layers, its time, its words, its
// inputs and its privacy are checked here; its drawing, lifecycle and agreement with the approved posters and the
// pinned pack's end screen in a browser under the production headers by design/tools/end-scene-check.mjs, whose
// record is checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as art from '../../../design/phone-ui/components/end-scene/arrival-art.mjs';
import * as shipArt from '../../../design/phone-ui/components/ship-travel/ship-art.mjs';
import {
  END_BEATS, END_SCENE_DEFAULTS, END_SCENE_VERSION, END_WORDS, REDUCED_FADE_MS,
  arrivalLayers, arrivalPrefix, arrivalTime, endSceneFraming, endSceneFrame, endSceneKind, endWords, nextEndSceneInput,
} from '../../../design/phone-ui/components/end-scene/end-scene.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/end-scene';
const read = path => readFileSync(join(REPO, path), 'utf8');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const DRAW = { surface: 'display', width: 1920, height: 1080, variant: 'full' };
const RESULTS = {
  Blue: { winner: 'Blue', reason: 'ARRIVAL', alienCoWinner: false },
  Red: { winner: 'Red', reason: 'ARRIVAL', alienCoWinner: false },
  alien: { winner: 'Blue', reason: 'ARRIVAL', alienCoWinner: true },
  redAlien: { winner: 'Red', reason: 'ARRIVAL', alienCoWinner: true },
  none: { winner: null, reason: 'NO_SURVIVORS', alienCoWinner: false },
  aborted: { winner: null, reason: 'ABORTED', alienCoWinner: false },
};

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
 * The SHA-256 of each ported function's text, as it is in its source on claude/designer-library-navigation at
 * 6b63560d (the same blobs as PR #184's approved head 0fb17a35): Function.prototype.toString() of the source's own
 * function. The port must be that text, character for character.
 */
const SOURCE_TEXT = Object.freeze({
  planetSvg: 'c8d955f13b702e4c8176079ce6e0ba129437e230cbd61959b5500e489777c111',
  arrivalFrame: 'ae0fccb4a5824e5ad85872b7c114856282dfaee6df29ac112c29f427a52323c5',
  arrivalSvg: '11215030eee5ddd93e260cea2056341a53e3835c92d355c77c30a4ca2fec860a',
  lightCone: '8941b4964e0e53289c16e8211ecd820834a611d622ff03f99389ec565ece71fb',
  easeInOutCubic: 'a8b413e5ee046bd09b95f598a1559d84080668388c8f99de86287a52f6b28407',
});
/** The SHA-256 of the source's arrivalSvg(4100, side, display, 1920 × 1080, full).svg: the approved posters' frames. */
const POSTER_FRAMES = Object.freeze({
  Red: 'a1250b9f114d1dba672c2b43b2db0def4897008e1f5a688292cb617a88159977',
  Blue: 'dfb6446d4e947f8a2cf7706d2b5a590a13baf524d7d7dd9e1a91a7d960b44097',
});
const POSTER_FILES = Object.freeze({ Red: 'apps/game/candidates/planet-library/arrival-red.poster.webp', Blue: 'apps/game/candidates/planet-library/arrival-blue.poster.webp' });

test('the component is a runtime source: its whole graph is runtime-safe and in the hosted graph', () => {
  const files = new Map([...graph(join(REPO, COMPONENT, 'end-scene.mjs')), ...graph(join(REPO, COMPONENT, 'end-scene.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/end-scene.mjs`, `${COMPONENT}/end-scene.css`, `${COMPONENT}/arrival-art.mjs`, 'design/phone-ui/components/ship-travel/ship-art.mjs',
    'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css', 'design/phone-ui/components/icons.mjs']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  assert.ok(!local.some(p => /\/(?:room-scene|phone-shell)\//.test(p)), 'the scene depends on neither the room scene nor the shell: Frontend mounts it in the shell\'s stage');
  assert.ok(!local.includes('design/phone-ui/components/ship-travel/ship-travel.mjs'), 'from the ship travel, only its drawing (ship-art.mjs), not the film');
  assert.deepEqual(graph(join(REPO, COMPONENT, 'arrival-art.mjs')).get(join(REPO, COMPONENT, 'arrival-art.mjs')), ['../ship-travel/ship-art.mjs'], 'the arrival\'s drawing uses only the ported ship, stars and effects');
  // It loads no picture or video: everything it draws is drawn from code.
  for (const path of [`${COMPONENT}/end-scene.mjs`, `${COMPONENT}/arrival-art.mjs`, `${COMPONENT}/end-scene.css`]) {
    const code = read(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/^\s*\*.*$/gm, '').replace(/@import url\("\.\.\/kit\/kit\.css"\);/, '');
    const loads = code.replace(/file: 'arrival-(?:red|blue)\.poster\.webp'/g, '');
    assert.doesNotMatch(loads, /\.(?:webp|png|jpe?g|gif|mp4|webm)\b|url\((?!#|\$\{)/, `${path}: no picture or video is loaded`);
  }
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/compare.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  // The preview draws at the game's root size (the browser's 16 px): only its own words are smaller.
  const page = read(`${COMPONENT}/preview/preview.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(page, /(?:^|[}\s,])html\b[^{]*\{[^}]*font/, 'the page sets no root font size');
  assert.match(read('design/tools/end-scene-check.mjs'), /^\/\/ mothership:dev-only/);
});

test('its styles reach nothing outside the scene: every rule is scoped under .ms-end-scene, the kit imported first', () => {
  const raw = read(`${COMPONENT}/end-scene.css`);
  assert.match(raw, /^@import url\("\.\.\/kit\/kit\.css"\);/, 'the kit\'s styles first');
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]+;/g, '');
  const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]);
  assert.deepEqual(keyframes, ['ms-es-fade'], 'one keyframes, its own');
  const body = css.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const selectors = [...body.matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(s => s && !s.startsWith('@'));
  assert.ok(selectors.length >= 12, `found the rules (${selectors.length})`);
  const split = list => {
    const out = [''];
    let depth = 0;
    for (const ch of list) {
      if (ch === '(') depth += 1;
      if (ch === ')') depth -= 1;
      if (ch === ',' && depth === 0) out.push(''); else out[out.length - 1] += ch;
    }
    return out.map(s => s.trim());
  };
  for (const list of selectors) {
    for (const selector of split(list)) {
      assert.match(selector, /^\.ms-end-scene(?:[\s.:\[]|$)/, `"${selector}" is scoped`);
      assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
      assert.doesNotMatch(selector, /^\.ms-end-scene(?:\[[^\]]*\])?\s+(?::is\()?(?:button|div|span|b|p|h1|svg|g|path|circle)\b/, `"${selector}": no bare element`);
      if (/\.ms-k-/.test(selector)) assert.match(selector, /\.ms-es-[\w-]+[^,]*\.ms-k-/, `"${selector}": a kit part styled only inside the scene's own parts`);
    }
  }
  const declared = [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))];
  assert.deepEqual(declared.filter(p => !p.startsWith('--ms-es-')), [], 'custom properties are the scene\'s own; no --ms-k- is redeclared');
  // The pack's end screen, value for value (design/phone-ui/prototype/screens.css .end-hero, .end-title).
  const rule = selector => css.match(new RegExp(`${selector.replace(/[.[\]()"]/g, m => `\\${m}`)}\\s*\\{([^}]*)\\}`))?.[1].trim();
  assert.match(rule('.ms-end-scene .ms-es-hero'), /top: 0; width: 100%; height: 50%/);
  assert.equal(rule('.ms-end-scene .ms-es-hero[data-field="none"]'), 'background: radial-gradient(circle at 50% 40%, #1B2333, #0A0D14);');
  assert.match(rule('.ms-end-scene .ms-es-hero::after'), /bottom: 0; height: 50%; background: linear-gradient\(to bottom, rgba\(16, 20, 28, 0\), var\(--ms-k-canvas\)\);/);
  assert.equal(rule('.ms-end-scene .ms-es-title'), 'position: absolute; left: 16px; right: 16px; top: calc(var(--ms-es-safe-t, 0px) + 34%); z-index: 2; text-align: center;');
  assert.equal(rule('.ms-end-scene .ms-es-stamp .ms-k-stamp'), 'font-size: 1.375rem;');
  assert.equal(rule('.ms-end-scene .ms-es-heading'), 'margin: 12px 0 0; font: 800 2rem/1.05 var(--ms-k-letter); letter-spacing: 0.04em; text-transform: uppercase; text-shadow: 0 2px 0 #05070B;');
  assert.equal(rule('.ms-end-scene .ms-es-line'), 'margin: 6px 0 0; color: var(--ms-k-text-2); font: 500 0.9375rem/1.3 var(--ms-k-font);');
  // The stamp's punch is on the wrapper: the kit's stamp keeps its own tilt.
  assert.equal(rule('.ms-end-scene .ms-es-stamp'), 'display: inline-block;');
  // Reduce motion is the one fade.
  assert.match(css, /\[data-fade\]\s*\{\s*animation:\s*ms-es-fade 80ms linear both;\s*\}/);
  assert.equal(REDUCED_FADE_MS, 80);
});

test('the port is the approved arrival\'s drawing, character for character, and draws the approved posters\' frames byte for byte', () => {
  for (const [name, digest] of Object.entries(SOURCE_TEXT)) {
    assert.equal(typeof art[name], 'function', `${name} is ported`);
    assert.equal(sha256(art[name].toString()), digest, `${name}: its source's text`);
  }
  assert.deepEqual(art.PLANETS, {
    Blue: { lit: '#8FD0FF', mid: '#2F6FD6', dark: '#0B1F4A', rim: '#A8E4FF', cloud: '#F4FAFF', ring: '#D6ECFF', land: '#2C9C8A' },
    Red: { lit: '#FFB07A', mid: '#C8452B', dark: '#3A0E0A', rim: '#FFC08A', cloud: '#FFE2C4', ring: null, land: '#8E2A1A' },
  });
  assert.deepEqual(shipArt.FILM.arrival, { display: 4200, phone: 3400, insert: 4200, reduced: 1200, fade: 160 });
  const approval = JSON.parse(read('docs/integration/planet-library-art-approval-2026-11-06.json'));
  for (const side of ['Red', 'Blue']) {
    const poster = art.ARRIVAL_POSTERS[side];
    assert.deepEqual({ ...poster, file: undefined, sha256: undefined }, { t: 4100, surface: 'display', width: 1920, height: 1080, variant: 'full', file: undefined, sha256: undefined });
    assert.equal(sha256(art.arrivalSvg(poster.t, side, poster).svg), POSTER_FRAMES[side], `${side}: the approved poster's frame`);
    // The approved poster is the file Integration approved.
    const entry = approval.approvedFiles.find(e => e.consumerCandidate === POSTER_FILES[side]);
    assert.equal(entry?.sha256, poster.sha256, `${side}: approved`);
    assert.equal(sha256(readFileSync(join(REPO, POSTER_FILES[side]))), poster.sha256, `${side}: the file`);
    assert.ok(POSTER_FILES[side].endsWith(poster.file));
  }
  // Its header names the sources, the commit and the approval; the ship travel's drawing stays planet-free.
  const header = read(`${COMPONENT}/arrival-art.mjs`).split('\n// ── ')[0];
  for (const words of ['design/library/navigation/films.mjs', 'design/cinematic/lib/comic.mjs', 'design/cinematic/lib/ease.mjs', '6b63560d990c50dd1d16e44e6f40f5b7b77b6b68',
    '0fb17a35c4b2fdd3418c9ffb575dbd4a7d0d9878', 'docs/integration/planet-library-art-approval-2026-11-06.json', 'Integration reviews it', 'terminal arrival']) {
    assert.ok(header.includes(words), `the header names ${words}`);
  }
  assert.ok(!('PLANETS' in shipArt) && !('planetSvg' in shipArt) && !('arrivalSvg' in shipArt), 'ship-art.mjs has no planet and no arrival');
});

test('the layers are arrivalSvg()\'s own frame at every moment: the moving body and the front that never changes', () => {
  for (const side of ['Red', 'Blue']) {
    const own = arrivalPrefix(side);
    assert.equal(own, side === 'Red' ? 'nard' : 'nabd');
    const front = arrivalLayers(side, 0).front;
    for (const t of [0, 150, 300, 1200, 2400, 3000, 3500, 3700, 3900, 4100]) {
      const { svg } = art.arrivalSvg(t, side, DRAW);
      const { body, front: f } = arrivalLayers(side, t);
      const open = svg.slice(0, svg.indexOf('>') + 1), fx = shipArt.fxDefs(own);
      assert.equal(`${open}${fx}${body}${f.slice(fx.length)}</svg>`, svg, `${side} ${t}: joined in arrivalSvg()'s order, its frame`);
      assert.equal(f, front, `${side} ${t}: the front never changes`);
      assert.match(body, /^<rect width="1920" height="1080" fill="#05060C"\/><g opacity="[\d.]+">[\s\S]*<\/g>$/, `${side} ${t}: the body is the space and the fading group`);
      // Every use of the source's ids is an id or a reference, so a mount's own prefix replaces only those.
      assert.equal(svg.split(own).length - 1, (svg.match(new RegExp(`(?:id="|#)${own}`, 'g')) ?? []).length, `${side} ${t}: the ids alone carry ${own}`);
      const mine = arrivalLayers(side, t, 'mses7');
      assert.ok(!`${mine.body}${mine.front}`.includes(own) && mine.body === body.replaceAll(own, 'mses7'), `${side} ${t}: a mount's own ids`);
    }
    assert.ok(front.startsWith(shipArt.fxDefs(own)) && front.endsWith(shipArt.letterbox({ width: 1920, height: 1080, h: 0.085 * 1080 })), `${side}: the front is the filters, vignette, grain and letterbox`);
  }
  assert.equal(arrivalLayers('Red', 2000, 'p').front, arrivalLayers('Blue', 2000, 'p').front, 'the front is the same for both sides');
  assert.equal(sha256(art.arrivalSvg(4100, 'Red', DRAW).svg), POSTER_FRAMES.Red);
});

test('time: the arrival at its own pace onto the poster\'s frame, the stamp and the words on their beats, no winner\'s beats', () => {
  assert.deepEqual(END_BEATS, { arrival: { slow: 3700, stamp: 3600, words: 3900, still: 4500 }, none: { stamp: 300, words: 600, still: 1000 }, punch: 240, rise: 400 });
  // The film's clock: its own time to 3.7 s, then slowing evenly to a stop on the poster's 4.1 s at 4.5 s.
  const { slow, still } = END_BEATS.arrival;
  assert.equal(slow + (still - slow) / 2, art.ARRIVAL_POSTERS.Red.t, 'the slowing ends on the poster\'s moment');
  for (const t of [0, 1, 1500, 3699, 3700]) assert.equal(arrivalTime(t), t, `${t}: 1:1`);
  assert.equal(arrivalTime(-50), 0);
  assert.equal(arrivalTime(4500), 4100);
  assert.equal(arrivalTime(99999), 4100);
  let last = arrivalTime(slow), speed = 1;
  for (let t = slow + 10; t <= still; t += 10) {
    const next = arrivalTime(t), v = (next - last) / 10;
    assert.ok(v <= speed + 1e-9 && v >= 0, `${t}: slowing, never back`);
    speed = v; last = next;
  }
  assert.ok(speed < 0.02, 'it comes to a stop');
  const beats = [[0, 'film'], [3699, 'film'], [3700, 'settle'], [4499, 'settle'], [4500, 'still'], [Infinity, 'still']];
  for (const [t, beat] of beats) assert.equal(endSceneFrame(t, RESULTS.Red).beat, beat, `arrival ${t}: ${beat}`);
  for (const [t, beat] of [[0, 'field'], [999, 'field'], [1000, 'still']]) assert.equal(endSceneFrame(t, RESULTS.none).beat, beat, `no winner ${t}: ${beat}`);
  assert.equal(endSceneFrame(-300, RESULTS.Red).t, 0, 'clamped to the scene');
  assert.equal(endSceneFrame(99999, RESULTS.Red).t, 4500, 'clamped to the scene');
  // The stamp: hidden until its beat, punched in over 240 ms, at rest after; the words rise 8 px over 400 ms.
  for (const [result, beats] of [[RESULTS.Red, END_BEATS.arrival], [RESULTS.aborted, END_BEATS.none]]) {
    assert.deepEqual(endSceneFrame(beats.stamp, result).stamp, { opacity: 0, scale: 1.8 });
    assert.deepEqual(endSceneFrame(beats.stamp + 160, result).stamp, { opacity: 1, scale: 0.94 }, 'it hits');
    assert.deepEqual(endSceneFrame(beats.stamp + 240, result).stamp, { opacity: 1, scale: 1 }, 'and rests');
    assert.deepEqual(endSceneFrame(beats.words, result).words, { opacity: 0, rise: 8 });
    assert.deepEqual(endSceneFrame(beats.words + 400, result).words, { opacity: 1, rise: 0 });
    assert.deepEqual(endSceneFrame(Infinity, result).stamp, { opacity: 1, scale: 1 });
    assert.deepEqual(endSceneFrame(Infinity, result).words, { opacity: 1, rise: 0 });
  }
  // The still is the poster's frame; no result is a still with no words.
  assert.deepEqual([endSceneFrame(Infinity, RESULTS.Blue).tau, endSceneFrame(Infinity, RESULTS.Blue).side], [4100, 'Blue']);
  assert.deepEqual(endSceneFrame(1234, null), { t: 0, kind: 'empty', side: null, beat: 'still', tau: null, still: true, stamp: { opacity: 0, scale: 1 }, words: { opacity: 0, rise: 0 } });
  assert.equal(endSceneFrame(500, RESULTS.none).tau, null, 'no winner draws no arrival');
  // Pure: the same moment is the same frame, on every phone.
  assert.deepEqual(endSceneFrame(3123, RESULTS.Red), endSceneFrame(3123, RESULTS.Red));
  assert.deepEqual(['arrival', 'arrival', 'none', 'none', 'empty'], [RESULTS.Red, RESULTS.alien, RESULTS.none, RESULTS.aborted, null].map(endSceneKind));
});

test('framing: the poster covers the hero, the top half of the phone, as the pack\'s .end-hero draws it (cover, centre)', () => {
  const phone = endSceneFraming({ width: 390, height: 844 });
  const k = Math.max(390 / 1920, 422 / 1080);
  assert.equal(phone.k, k);
  assert.deepEqual(phone.hero, { width: 390, height: 422 });
  assert.ok(Math.abs(phone.viewBox[0] - (1920 * k - 390) / 2 / k) < 1e-9 && Math.abs(phone.viewBox[1]) < 1e-9, 'centred: cropped at both sides, not at the top or bottom');
  assert.ok(Math.abs(phone.viewBox[2] - 390 / k) < 1e-9 && Math.abs(phone.viewBox[3] - 1080) < 1e-9);
  assert.equal(endSceneFraming({ width: 430, height: 932 }).k, 466 / 1080);
  assert.deepEqual(endSceneFraming({ width: 1920, height: 2160 }).viewBox.map(v => v + 0), [0, 0, 1920, 1080], 'a hero of the poster\'s size shows it as it is');
});

test('words: sheet 44\'s, as the pack\'s end screen writes them; Red with the Alien composed from them', () => {
  const words = Object.fromEntries(Object.entries(RESULTS).map(([key, result]) => [key, endWords(result, 6)]));
  // The pack's end() (design/phone-ui/prototype/screens-more.mjs): its tag, title and line for each case it draws.
  assert.deepEqual(words.Blue, { stamp: 'BLUE WINS', tone: 'gold', title: 'Blue reached Blue Planet', line: 'Round 6', label: 'Blue wins. Blue reached Blue Planet. Round 6.' });
  assert.deepEqual(words.Red, { stamp: 'RED WINS', tone: 'gold', title: 'Red reached Red Planet', line: 'Round 6', label: 'Red wins. Red reached Red Planet. Round 6.' });
  assert.deepEqual(words.alien, { stamp: 'BLUE WINS · ALIEN TOO', tone: 'gold', title: 'Blue reached Blue Planet', line: 'The Alien survived and used Blackhole', label: 'Blue wins, and the Alien too. Blue reached Blue Planet. The Alien survived and used Blackhole.' });
  assert.deepEqual(words.redAlien, { stamp: 'RED WINS · ALIEN TOO', tone: 'gold', title: 'Red reached Red Planet', line: 'The Alien survived and used Blackhole', label: 'Red wins, and the Alien too. Red reached Red Planet. The Alien survived and used Blackhole.' });
  assert.deepEqual(words.none, { stamp: 'NO WINNER', tone: null, title: 'No survivors', line: 'Round 6', label: 'No winner. No survivors. Round 6.' });
  assert.deepEqual(words.aborted, { stamp: 'NO WINNER', tone: null, title: 'Match aborted', line: 'The host ended the match', label: 'No winner. Match aborted. The host ended the match.' });
  assert.deepEqual(endWords(null, 6), { stamp: null, tone: null, title: null, line: null, label: 'Match over.' });
  assert.equal(endWords(RESULTS.Red, null).line, null, 'no round, no line');
  const pack = read('design/phone-ui/prototype/screens-more.mjs');
  for (const text of ['BLUE WINS', 'RED WINS', 'BLUE WINS · ALIEN TOO', 'NO WINNER', 'Blue reached Blue Planet', 'Red reached Red Planet', 'No survivors', 'Match aborted', 'The Alien survived and used Blackhole', 'The host ended the match']) {
    assert.ok(pack.includes(`'${text}'`), `"${text}" is the pack's`);
  }
  assert.equal(END_WORDS.label.concealed, 'Hidden');
});

test('inputs: public only, checked as the contract checks the result, and anything unknown refused', () => {
  assert.deepEqual(Object.keys(END_SCENE_DEFAULTS), ['window', 'clock', 'result', 'round', 'size', 'safe', 'status', 'reducedMotion']);
  assert.deepEqual(END_SCENE_DEFAULTS.safe, { top: 0 });
  for (const result of Object.values(RESULTS)) assert.deepEqual(nextEndSceneInput(END_SCENE_DEFAULTS, { result }).result, result, `${JSON.stringify(result)} is the contract's`);
  const given = { window: { id: 'end-1', startedAt: 1000 }, clock: { now: () => 0 }, result: { ...RESULTS.Red }, round: 6, size: { width: 390, height: 844 }, safe: { top: 47 } };
  const ok = nextEndSceneInput(END_SCENE_DEFAULTS, given);
  assert.ok(Object.isFrozen(ok) && Object.isFrozen(ok.window) && Object.isFrozen(ok.result) && Object.isFrozen(ok.size) && Object.isFrozen(ok.safe));
  given.result.winner = 'Blue';
  assert.equal(ok.result.winner, 'Red', 'a copy: the caller\'s object changing later changes nothing');
  for (const key of ['seat', 'seatId', 'name', 'names', 'role', 'roles', 'team', 'code', 'endReveal', 'viewer', 'players', 'arrivedAt', 'state', 'caption', 'insets', 'skip', 'onEnded']) {
    assert.throws(() => nextEndSceneInput(END_SCENE_DEFAULTS, { [key]: 'x' }), TypeError, `"${key}" is refused`);
  }
  const refused = [
    { window: { id: 'p', startedAt: 1, endsAt: 2 } }, { window: { id: 'p', startedAt: 1, kind: 'FINISHED' } }, { window: { startedAt: 1 } }, { window: { id: 'p' } }, { window: 'p' },
    { clock: Date.now }, { result: 'Red' }, { result: { ...RESULTS.Red, roles: [] } }, { result: { winner: 'Red', reason: 'ARRIVAL' } }, { result: { winner: 'Alien', reason: 'ARRIVAL', alienCoWinner: false } },
    { result: { winner: 'Red', reason: 'NO_SURVIVORS', alienCoWinner: false } }, { result: { winner: null, reason: 'ARRIVAL', alienCoWinner: false } },
    { result: { winner: null, reason: 'ABORTED', alienCoWinner: true } }, { result: { winner: 'Blue', reason: 'BLACKHOLE', alienCoWinner: false } },
    { round: 0 }, { round: 2.5 }, { round: '6' }, { size: { width: 0, height: 10 } }, { size: { width: 1, height: 1, depth: 1 } },
    { safe: null }, { safe: { bottom: 34 } }, { safe: { top: -2 } }, { safe: { top: 47, bottom: 34 } }, { status: 'hidden' }, { reducedMotion: 1 },
  ];
  for (const changes of refused) assert.throws(() => nextEndSceneInput(END_SCENE_DEFAULTS, changes), TypeError, JSON.stringify(changes));
  assert.throws(() => nextEndSceneInput(END_SCENE_DEFAULTS, null), TypeError);
  assert.equal(END_SCENE_VERSION, 'end-scene-0.1.0');
});

test('privacy: it draws a planet only for an arrival, and says nothing of a seat, a name, a role or a code', () => {
  const source = read(`${COMPONENT}/end-scene.mjs`);
  assert.doesNotMatch(source.replace(/^\s*\/\/.*$/gm, ''), /endReveal|seatId|\.roles\b|Original Code/, 'it reads no reveal');
  for (const result of [RESULTS.none, RESULTS.aborted, null]) {
    assert.equal(endSceneFrame(Infinity, result).kind === 'arrival', false);
    assert.equal(endSceneFrame(Infinity, result).side, null, 'no side without an arrival');
  }
  const said = Object.values(RESULTS).map(r => Object.values(endWords(r, 6)).join(' ')).join(' ');
  assert.doesNotMatch(said, /seat|Player|Doctor|Insider|Disabler|Supplier|Engineer|Undercover|Hacker|\(you\)/i);
});

test('the check\'s record: every capture, probe check and comparison passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/end-scene-check.mjs');
  assert.equal(record.version, END_SCENE_VERSION);
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /img-src 'self' data: blob:/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  for (const side of ['Red', 'Blue']) assert.ok(record.posters[side].ok && record.posters[side].sha256 === record.posters[side].approvedSha256, `${side}: compared with the approved poster`);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 52, 'thirteen states at two sizes, in full motion and with the device\'s Reduce motion');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn && c.placed, `${key} passed, drew what its state asks, where sheet 44 lays it`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
  }
  for (const size of ['390x844', '430x932']) {
    const [width, height] = size.split('x').map(Number);
    const red = record.captures[`${size}/red/full`];
    assert.ok(red.edge && red.boxes.scene.x === 0 && red.boxes.scene.y === 0 && red.boxes.scene.w === width && red.boxes.scene.h === height, `${size}: the scene covers the whole phone, the shell's stage edge to edge`);
    assert.equal(red.boxes.hero.h, height / 2, `${size}: the hero is the top half`);
    assert.ok(Math.abs(red.boxes.title.y - (red.safe.top + 0.34 * height)) < 0.5, `${size}: the title block at the top safe area + 34 %`);
    assert.ok(record.captures[`${size}/film/reduced`].frame.still, `${size}: Reduce motion, the still`);
    assert.equal(record.captures[`${size}/concealed/full`].heroShown, false, `${size}: concealed, nothing drawn`);
    assert.ok(record.captures[`${size}/redAlien/full`].composed, `${size}: Red with the Alien is recorded as composed`);
  }
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = new Set(record.probe.full.checks.map(c => c.id.split(':')[0]));
  for (const group of ['time', 'still', 'words', 'reduced', 'lifecycle', 'layout', 'privacy']) assert.ok(groups.has(group), `probe group ${group}`);
  // The still against both approved posters, and the controls a redrawn ship would fail.
  for (const side of ['Red', 'Blue']) {
    const full = record.compare.full[side];
    assert.ok(full.ok && full.ship.mean <= full.limits.ship && full.frame.mean <= full.limits.frame, `${side}: the still is the poster`);
    for (const control of Object.values(full.controls)) assert.ok(control.mean > full.limits.ship && control.mean >= full.ship.mean * full.limits.controlFactor, `${side}: a control is told apart`);
  }
  // Beside the pinned pack's own end screen: every case it draws, at both sizes.
  const agree = Object.entries(record.compare.agree);
  assert.deepEqual(agree.map(([key]) => key).sort(), ['blue', 'red', 'alien', 'none', 'aborted'].flatMap(s => ['390x844', '430x932'].map(z => `${z}/${s}`)).sort());
  for (const [key, a] of agree) {
    assert.ok(a.ok && a.words.ok && Object.values(a.boxes).every(b => b.ok && b.delta <= 0.5), `${key}: the pack's words, where the pack lays them`);
    assert.ok(a.pixels.hero.mean <= 3 && a.pixels.title.mean <= 3, `${key}: the pack's pixels`);
    assert.ok(existsSync(join(REPO, a.file)), `${key}: ${a.file}`);
  }
  for (const kind of ['arrival', 'none']) assert.ok(record.beats[kind].ok && existsSync(join(REPO, record.beats[kind].file)), `the ${kind} beats strip`);
});
