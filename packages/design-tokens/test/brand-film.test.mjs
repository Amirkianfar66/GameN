// The brand intro, version 2 (design/phone-ui/components/brand-film, pregame-brand-2.0.0): a runtime source the game
// imports as it is, so its module graph, the files it imports and their hashes, its styles' scope, its clock (every
// time, place and fade of today's film), what a moment of it is and what its sources may and may not do are checked
// here; its drawing, lifecycle and frame rate in a browser under the production headers by
// design/tools/brand-film-check.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as today from '../../../apps/game/hosted/pregame-films/brand/brand.mjs';
import { envelope } from '../../../apps/game/hosted/pregame-films/kit/math.mjs';
import {
  BEATS, BLINK_MS, BRAND, BRAND_FILM_VERSION, BRAND_MS, BRAND_TEXT, COAST_MS, NIGHT, STILL, STRIKE, TYPING, TYPING_HOLD_MS, VARIANTS,
  brandFrame, createBrandScene, cursorBox, layout,
} from '../../../design/phone-ui/components/brand-film/brand-film.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/brand-film';
const RUNTIME = ['brand-film.mjs'];
const SIZES = [[390, 844], [430, 932], [320, 568], [1280, 720], [1920, 1080]];
const read = path => readFileSync(join(REPO, path), 'utf8');
const sha256 = path => createHash('sha256').update(readFileSync(join(REPO, path))).digest('hex');
/** A source without its comments: what it does, not what it says. */
const code = path => read(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
const plain = value => JSON.parse(JSON.stringify(value));

/** The static imports of a module, resolved: relative ones to files, the rest as package names. */
function graph(entry) {
  const seenFiles = new Map();
  const visit = file => {
    if (seenFiles.has(file)) return;
    const source = readFileSync(file, 'utf8');
    const specifiers = [...source.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+'([^']+)'|^\s*import\s+'([^']+)'|@import url\("([^"]+)"\)/gm)].map(m => m[1] ?? m[2] ?? m[3]);
    seenFiles.set(file, specifiers);
    for (const s of specifiers) if (s.startsWith('.')) visit(resolve(dirname(file), s));
  };
  visit(entry);
  return seenFiles;
}

test('the component is a runtime source: its whole graph is runtime-safe, and every file it imports is named with its hash', () => {
  const files = new Map([...graph(join(REPO, COMPONENT, 'brand-film.mjs')), ...graph(join(REPO, COMPONENT, 'brand-film.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  for (const path of local) {
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview|review)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual([...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))], [], 'no package import');
  assert.deepEqual(readdirSync(join(REPO, COMPONENT)).filter(name => /\.(?:mjs|css)$/.test(name)).sort(), [...RUNTIME, 'brand-film.css'].sort(), 'every source in the folder is one of the film\'s');
  // What it imports from outside its own folder: the boarding film's engine and ink, and the hosted game's film kit,
  // each as it is. imports.json names every one with its hash, and the handoff shows the same list.
  const record = JSON.parse(read(`${COMPONENT}/imports.json`));
  assert.equal(record.version, BRAND_FILM_VERSION);
  const foreign = local.filter(path => !path.startsWith(`${COMPONENT}/`)).sort();
  assert.deepEqual(record.imports.map(i => i.path).sort(), foreign, 'imports.json names exactly the files the graph holds');
  assert.deepEqual(foreign, [
    'apps/game/hosted/pregame-films/kit/fx.mjs', 'apps/game/hosted/pregame-films/kit/letters.mjs', 'apps/game/hosted/pregame-films/kit/math.mjs',
    'design/phone-ui/components/boarding-film/engine.mjs', 'design/phone-ui/components/boarding-film/mark.mjs',
  ]);
  const handoff = read('docs/design/components/brand-film.md');
  for (const { path, sha256: pinned, uses } of record.imports) {
    assert.equal(sha256(path), pinned, `${path} is the file that was imported: it has not changed`);
    assert.ok(typeof uses === 'string' && uses.length > 8, `${path}: what is used of it is said`);
    assert.ok(handoff.includes(`\`${path}\``) && handoff.includes(`\`${pinned.slice(0, 16)}\``), `${path} is named in the handoff with its hash`);
  }
  // It is beside today's film, never in it: version 1's film and the live player are not in its graph.
  assert.ok(!local.includes('apps/game/hosted/pregame-films/brand/brand.mjs') && !local.some(p => p.startsWith('apps/game/hosted/planet/')), 'today\'s film and the live player are not imported');
  assert.ok(!local.some(p => /\/(?:kit|phone-shell|room-scene)\//.test(p) && p.startsWith('design/')), 'it needs neither the kit, the shell nor the room scene');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs']) assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  // The preview draws the same files.
  assert.match(read(`${COMPONENT}/preview/preview.mjs`), /from '\.\.\/brand-film\.mjs'/);
  assert.match(read(`${COMPONENT}/preview/index.html`), /href="\.\.\/brand-film\.css"/);
});

test('what its source may do: no clock but the scene\'s own, no chance, no network, no evaluated code, no worker, no filter, no listener', () => {
  for (const file of RUNTIME) {
    const source = code(`${COMPONENT}/${file}`);
    assert.doesNotMatch(source, /Math\.random|Date\.now|new Date\b|setInterval\b|setTimeout\b/, `${file}: no chance, no wall clock and no timer`);
    assert.doesNotMatch(source, /\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|\bimport\(|\beval\(|new Function\b|Worker\(|OffscreenCanvas|createImageBitmap/, `${file}: no network, no evaluated code, no worker`);
    assert.doesNotMatch(source, /\.filter\s*=\s*['"`]|shadowBlur/, `${file}: no canvas filter or blurred shadow`);
    assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie/, `${file}: nothing is stored`);
    assert.doesNotMatch(source, /addEventListener|dispatchEvent|postMessage|onclick|\.click\(/, `${file}: it listens for nothing and tells no one`);
    assert.doesNotMatch(source, /https?:\/\//, `${file}: nothing external is named`);
    // No SVG is written or made into a picture: the letters are drawn straight onto a canvas from their strokes.
    assert.doesNotMatch(source, /<svg|createObjectURL|new win\.Image|\.innerHTML|DOMParser|sprite\(/, `${file}: no SVG, no image, no markup`);
    assert.doesNotMatch(source, /options\.(?!\.)\w/, `${file}: nothing is read from the options it is given`);
  }
  const scene = code(`${COMPONENT}/brand-film.mjs`);
  assert.equal((scene.match(/requestAnimationFrame/g) ?? []).length, 2, 'one loop: begun by a paint, kept going by its own frame');
  assert.ok((scene.match(/performance\.now\(\)/g) ?? []).length >= 3, 'the page\'s clock is read where the scene keeps time between paints and where drawing is timed');
  assert.match(scene, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/, 'the device\'s Reduce motion is read');
  assert.match(scene, /root\.setAttribute\('aria-hidden', 'true'\)/, 'the picture is hidden from a screen reader: the player says the film\'s words');
});

test('its styles reach nothing outside the film: every rule is scoped under .ms-brand-film', () => {
  const css = read(`${COMPONENT}/brand-film.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /@import|@keyframes|@font-face|url\(/, 'no import, no keyframes, no file');
  const selectors = [...css.matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(Boolean);
  assert.equal(selectors.length, 3, 'the film, its canvases, its light');
  for (const selector of selectors) {
    assert.match(selector, /^\.ms-brand-film(?:\s*>\s*(?:canvas|\.ms-brf-[\w-]+))?$/, `"${selector}" is scoped`);
    assert.doesNotMatch(selector, /\*/, `"${selector}": no universal selector`);
  }
  assert.doesNotMatch(css, /--[\w-]+\s*:/, 'no custom property is declared');
  assert.match(css, /\.ms-brand-film \{[^}]*pointer-events: none/, 'nothing in the film can be tapped');
  assert.match(css, /\.ms-brand-film \{[^}]*contain: strict/);
  assert.match(css, new RegExp(`\\.ms-brand-film \\{[^}]*background: ${NIGHT};`), 'the film is black: today\'s black');
  const scene = read(`${COMPONENT}/brand-film.mjs`);
  for (const name of ['ms-brand-film', 'ms-brf-light']) { assert.match(scene, new RegExp(`'${name}'`)); assert.match(css, new RegExp(`\\.${name}\\b`)); }
  assert.match(scene, /'ms-brf-ink'/);
});

test('the clock is today\'s: its length, its words, every key\'s time, the cursor\'s rule and the black it ends on', () => {
  assert.equal(BRAND_FILM_VERSION, 'pregame-brand-2.0.0');
  assert.equal(BRAND_MS, 2000);
  assert.equal(BRAND_MS, today.BRAND_MS);
  assert.equal(BRAND_TEXT, today.BRAND.text, 'the film\'s words for a screen reader are today\'s');
  assert.deepEqual([BRAND.name, BRAND.credit], [today.BRAND.name, today.BRAND.credit]);
  assert.equal(NIGHT, today.NIGHT);
  assert.deepEqual([...VARIANTS], ['full', 'reduced']);
  assert.deepEqual(plain(TYPING), plain(today.TYPING), 'every key is struck when today\'s is');
  assert.equal(TYPING.name.length, [...BRAND.name].length);
  assert.equal(TYPING.credit.length, [...BRAND.credit].length);
  assert.deepEqual([BEATS.cursorOn, BEATS.lineBreak, BEATS.night], [today.BEATS.cursorOn, today.BEATS.lineBreak, today.BEATS.night]);
  assert.deepEqual([...STILL.out], [...today.BEATS.fade], 'Reduce motion goes out on today\'s fade');
  assert.deepEqual([...STILL.in], [0, 200]);
  // The two new beats, as agreed: one sheen of 260 ms after the last key has settled, and the ink from today's fade to the night.
  assert.deepEqual([...BEATS.sheen], [1330, 1590]);
  assert.ok(BEATS.sheen[0] >= TYPING.credit.at(-1) + 50 && BEATS.sheen[1] - BEATS.sheen[0] <= 300 && BEATS.sheen[1] < BEATS.ink[0]);
  assert.equal(BEATS.ink[0], today.BEATS.fade[0], 'the ink begins where today\'s fade does');
  assert.ok(BEATS.ink[1] > BEATS.ink[0] && BEATS.ink[1] <= BEATS.night, 'and it is black by the night');
  // A strike is over before the next beat that follows the last key: nothing still lands when the sheen begins.
  assert.ok(STRIKE.fall < STRIKE.settle && STRIKE.settle <= STRIKE.shade[1] && STRIKE.shade[1] <= STRIKE.light);
  assert.ok(STRIKE.fall + STRIKE.fleck[1] <= BEATS.sheen[0] - TYPING.credit.at(-1) + 400 && TYPING.name.at(-1) + STRIKE.fall + STRIKE.fleck[1] < BEATS.ink[0]);
  assert.ok(COAST_MS >= 250 && COAST_MS <= 1000);
  assert.equal(BLINK_MS, 530);
  assert.equal(TYPING_HOLD_MS, 160);
});

test('the two lines stand where today\'s do, at every size: one block, left-aligned, centred', () => {
  for (const [W, H] of SIZES) {
    const mine = layout(W, H), theirs = today.layout(W, H);
    for (const key of ['k1', 'k2', 'x0', 'y1', 'y2', 'cap']) assert.equal(mine[key], theirs[key], `${W}x${H}: ${key}`);
    assert.deepEqual(plain(mine.name), plain(theirs.name), `${W}x${H}: the name's letters`);
    assert.deepEqual(plain(mine.credit), plain(theirs.credit), `${W}x${H}: the credit's letters`);
    // The block's own measures, which the film's box of the surface is made from.
    assert.ok(mine.w > 0 && Math.abs(mine.x0 + mine.w / 2 - W / 2) < 1e-9 && Math.abs(mine.y1 + mine.blockH / 2 - H / 2) < 1e-9, `${W}x${H}: centred`);
  }
  assert.ok(Math.abs(layout(390, 844).w - 390 * 0.62) < 1e-9, 'on a phone the name spans 62 % of the width');
});

/** Today's film at a moment, read from the picture it writes: the cursor's box, how many letters show, the picture's strength. */
function todayAt(t, [W, H], variant = 'full') {
  const svg = today.brandSvg(t, { width: W, height: H, variant });
  const cursor = svg.match(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)" fill="#F2C14E"\/>/);
  const strength = svg.match(/<g opacity="([\d.]+)"><g opacity="0\.35"/);
  // Each letter is written twice (under the glow, and plain); the night's cover is the picture's last rectangle.
  return { cursor: cursor ? cursor.slice(1, 5).map(Number) : null, letters: (svg.match(/<path /g) ?? []).length / 2, strength: strength ? Number(strength[1]) : null, night: /<rect width="\d+" height="\d+" fill="#000000"\/><\/svg>$/.test(svg) };
}

test('every moment agrees with today\'s film: what is typed, where the cursor stands and when it shows, and the night', () => {
  const size = [390, 844], L = layout(...size);
  const drawn = film => [...BRAND.name].slice(0, film.name).filter(ch => ch !== ' ').length + [...BRAND.credit].slice(0, film.credit).filter(ch => ch !== ' ').length;
  for (let t = 0; t <= BRAND_MS; t += 1) {
    const film = brandFrame(t), theirs = todayAt(t, size), box = cursorBox(film, L);
    assert.equal(film.night, theirs.night, `${t} ms: the night`);
    assert.equal(drawn(film), theirs.letters, `${t} ms: the letters typed`);
    assert.equal(!!(film.cursor?.visible), theirs.cursor !== null, `${t} ms: whether the cursor shows`);
    if (theirs.cursor) theirs.cursor.forEach((v, i) => assert.ok(Math.abs(v - box[i]) <= 0.0051, `${t} ms: the cursor's box, ${i}`));
  }
  // The same at the display's size, at each of its beats.
  for (const t of [0, 59, 60, 220, 500, 859, 860, 900, 1275, 1500, 1959, 1960, 2000]) {
    const wide = [1920, 1080], film = brandFrame(t), theirs = todayAt(t, wide), box = cursorBox(film, layout(...wide));
    assert.equal(!!(film.cursor?.visible), theirs.cursor !== null, `display, ${t} ms`);
    if (theirs.cursor) theirs.cursor.forEach((v, i) => assert.ok(Math.abs(v - box[i]) <= 0.0051, `display, ${t} ms: ${i}`));
  }
});

test('a moment is a function of the time it is given; Reduce motion is today\'s: both lines whole, in and out on today\'s fades', () => {
  assert.deepEqual(brandFrame(1000), { t: 1000, reduced: false, night: false, name: 6, credit: 3, cursor: { line: 'credit', after: 3, solid: true, visible: true }, sheen: 0, ink: 0, fade: 1 });
  assert.deepEqual(brandFrame(1000), brandFrame(1000), 'the same time, the same moment');
  assert.deepEqual(brandFrame(-50), brandFrame(0));
  assert.deepEqual(brandFrame(99999), brandFrame(BRAND_MS));
  assert.deepEqual(brandFrame(NaN), brandFrame(0));
  assert.equal(brandFrame(BEATS.night - 1).night, false);
  assert.equal(brandFrame(BEATS.night).night, true);
  assert.equal(brandFrame(BEATS.night).cursor, null, 'no cursor in the night');
  assert.equal(brandFrame(BEATS.cursorOn - 1).cursor, null);
  assert.deepEqual(brandFrame(BEATS.cursorOn).cursor, { line: 'name', after: 0, solid: true, visible: true }, 'it arrives solid, as today\'s');
  // After the last key it blinks: on for half a blink, off for the next.
  assert.deepEqual(brandFrame(TYPING.credit.at(-1) + BLINK_MS / 2 - 1).cursor, { line: 'credit', after: 9, solid: false, visible: true });
  assert.deepEqual(brandFrame(TYPING.credit.at(-1) + BLINK_MS / 2).cursor, { line: 'credit', after: 9, solid: false, visible: false });
  // The sheen and the ink go from 0 to 1 over their beats, and no further.
  assert.equal(brandFrame(BEATS.sheen[0]).sheen, 0); assert.equal(brandFrame(BEATS.sheen[1]).sheen, 1);
  assert.ok(brandFrame(1460).sheen > 0.45 && brandFrame(1460).sheen < 0.55);
  assert.equal(brandFrame(BEATS.ink[0]).ink, 0); assert.equal(brandFrame(BEATS.ink[1]).ink, 1);
  for (let t = 0, last = { sheen: 0, ink: 0 }; t <= BRAND_MS; t += 5) { const f = brandFrame(t); assert.ok(f.sheen >= last.sheen && f.ink >= last.ink, `${t} ms`); last = f; }
  // Reduce motion: no typing, no cursor, no sheen and no ink; the picture's strength is today's at every millisecond.
  for (let t = 0; t <= BRAND_MS; t += 1) {
    const film = brandFrame(t, { variant: 'reduced' }), theirs = todayAt(t, [390, 844], 'reduced');
    assert.deepEqual([film.reduced, film.name, film.credit, film.cursor, film.sheen, film.ink], [true, 6, 9, null, 0, 0], `${t} ms`);
    assert.equal(film.fade, envelope(t, 0, 200, 1700, 1960), `${t} ms: today's fade`);
    assert.equal(film.night, theirs.night, `${t} ms: the night`);
    assert.equal(theirs.cursor, null);
    if (!theirs.night) { assert.equal(theirs.letters, 12); assert.ok(Math.abs(theirs.strength - film.fade) <= 0.00051, `${t} ms: as strong as today's (${theirs.strength}, ${film.fade})`); }
  }
  assert.equal(brandFrame(1000, { variant: 'reduced' }).fade, 1);
  assert.equal(brandFrame(0, { variant: 'reduced' }).fade, 0);
});

test('the scene is the agreed one: it takes a holder and nothing else, and refuses a variant it does not know', () => {
  assert.equal(typeof createBrandScene, 'function');
  const scene = read(`${COMPONENT}/brand-film.mjs`);
  assert.match(scene, /export function createBrandScene\(holder, \{ options = \{\}, live = true \} = \{\}\)/);
  for (const member of ['stats,', 'canvas,', 'element: root,', 'ready: \\(\\) => Promise\\.resolve\\(\\)', 'paint\\(t, \\{ width, height, variant: next = \'full\' \\} = \\{\\}\\)', 'suspend\\(\\)', 'resume\\(\\)', 'dispose\\(\\)']) assert.match(scene, new RegExp(`\\n    ${member}`), member);
  assert.match(scene, /if \(!VARIANTS\.includes\(next\)\) throw new Error\(`No brand variant \$\{next\}`\)/);
  // Its numbers carry the pilot's names; the frame is always the screen's own pixels.
  assert.match(scene, /const stats = \{ version: BRAND_FILM_VERSION, paints: 0, frames: 0, ownFrames: 0, drawMs: 0, worstMs: 0, pictures: 0, bytes: 0, bakeMs: 0, scale: 1, quality: 1 \}/);
  // Nothing of the film can end or advance anything: it takes no callback and returns none.
  assert.doesNotMatch(code(`${COMPONENT}/brand-film.mjs`), /callback|handlers?\b|\bemit\b|\.then\(|resolve\(\w/, 'no callback, and nothing it could tell');
});
