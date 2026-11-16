// mothership:dev-only
//
// The Food component's check (design/phone-ui/components/food). It bundles the component's preview the way the game
// bundles a component (Vite: ordinary bundling, no copy), adds the hosted game's own art as its build emits it, serves
// both with the hosted game's production response headers (lib/component-check.mjs), and:
//   draws every preview state at the two development phone sizes, 390 × 844 and 430 × 932, in full motion and with
//   the device's Reduce motion emulated, and holds each to what its state must show;
//   agrees with the frozen native port (apps/game/hosted/planet, whose files must be the pinned ones): the same
//   state drawn by the port's own renderer in the same phone must give the same DOM, the same boxes and the same
//   pixels, for every state, size and motion, with a control (the port's clock moved one second) that must not agree;
//   agrees with the approved package's own pages for the five parts of #290 (design/food-supply/phone.html, served
//   unchanged by phone-ui-render.mjs's reference server, its files held to their pins): where each part lies, box
//   for box; its words, apart from the differences listed below, which are the packet's own press states; and its
//   pixels, exactly, in the scene outside the surface's notices and wherever the words agree;
//   agrees with Frontend's ten native captures from #290 (read from that commit, each held to its SHA-256, never
//   copied): the scene's pixels within a stated limit, another machine's fonts and browser apart, with controls;
//   draws eight of the states at the game's larger text (its root's size: Large at 150 %, Largest at 200 %) at both
//   sizes, and holds them to the frozen port in the same way: the larger-text support is the port's own, unchanged;
//   runs the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion.
// A page passes with no policy report but the known one, no failed request and no page error. Every check must
// pass. It writes design/phone-ui/components/food/review/: pictures of the states and of the comparisons, and
// check.json (the headers and their SHA-256, the source commit, every pin, what each capture showed and its SHA-256,
// each comparison's numbers and each probe check).
//   node design/tools/food-component-check.mjs
//   node design/tools/food-component-check.mjs --only=food-panel-03,food-panel-04   some states only, while working on
//     the check: the comparisons then cover the parts drawn, and nothing is written to the review folder
// Needs a Chromium-based browser (CHROME_PATH) and #290's commit in the local clone (git fetch origin pull/290/head).
// Desktop Chromium at each phone's CSS size: not a phone, not Safari, not a performance measure, and no server.

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';
import { startServer } from './phone-ui-render.mjs';
import { comicAssetsPlugin } from '../../apps/game/hosted/comic-assets.mjs';
import { crewDrawingAssetsPlugin } from '../../scripts/crew-drawing-art.mjs';
import { foodSupplyAssetsPlugin } from '../../scripts/food-supply-art.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/food';
/** A partial run, for working on the check itself: it writes no record and leaves the review folder alone. */
const ONLY = process.argv.find(arg => arg.startsWith('--only='))?.slice(7).split(',').filter(Boolean) ?? null;
let REVIEW = join(REPO, COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
const MOTIONS = { full: null, reduced: { 'prefers-reduced-motion': 'reduce' } };
const PORT_PINS = 'docs/integration/food-consumer-source-2026-11-13.json';
const PACKAGE_MAP = 'docs/frontend/food-supply-comparison-map.json';
const PARTS = ['food-panel-03', 'food-panel-04', 'food-winch-03', 'food-winch-12', 'food-panel-18'];
const { FOOD_VERSION } = await import(pathToFileURL(join(REPO, COMPONENT, 'food-input.mjs')).href);

/**
 * How far the component may sit from what it is compared with. Boxes agree to half a CSS pixel. Against the package's
 * own pages, drawn here by the same browser: the instrument and the control are the same pixels (0) wherever the words
 * agree; the scene outside the notices is the same but for a crate in motion, which the package's own Task steps a
 * fraction of a pixel apart from the game's (a mean of 0.05 levels, and 0.1 % of its pixels more than 24 levels apart,
 * at most); the role row and the hint are the same but for the app's own background under the panel's glass, where the
 * package's frame paints its canvas (1 level). Against #290's captures, drawn by another browser on another machine
 * with other fonts, the scene outside the notices is held to a mean of 3 levels and 2 % of its pixels more than 24
 * levels apart; each control must measure at least twice what the comparison measures.
 */
export const LIMITS = Object.freeze({ box: 0.5, packageSame: 0, packageSceneMean: 0.05, packageSceneFar: 0.001, packageGlass: 1, nativeSceneMean: 3, nativeSceneFar: 0.02, controlFactor: 2 });
/** The game's larger text sizes (apps/game/hosted/planet/preferences.mjs: Large and Largest), and the states drawn at them: the five parts, a briefing, a sheet and a request. */
const LARGER = Object.freeze({ texts: [1.5, 2], states: [...PARTS, 'case-food-winch-01', 'case-food-flow-02', 'case-food-flow-04'], pictures: ['food-panel-04/1.5', 'food-panel-04/2', 'food-winch-03/2', 'case-food-flow-04/2'] });
/** The surface's own top bar, in CSS px, at each text size: the review frames' 47 px safe area and the kit's bar. */
const BAR_TOP = Object.freeze({ 1: 99, 1.5: 117, 2: 141 });
/** A notice's shadow reaches past its box: the scene is measured this far clear of each notice, in CSS px. */
const NOTICE_CLEAR = 40;
/** The port keeps an empty slot for the instrument in its dock; with no instrument, the slot's gap makes the dock this much taller than the package's, and draws nothing. */
const EMPTY_SLOT_GAP = 10;

const TASK = { screen: 'food-task', owned: { active: true, exclusive: true }, bars: { top: 99, bottom: 0 }, pictures: 3 };
const FLOW = { owned: { active: true, exclusive: false }, bars: { top: 99, bottom: 92 }, pictures: 0 };
const NONE = { owned: { active: false, exclusive: false }, bars: { top: null, bottom: null }, pictures: 0 };
/** What each preview state must show: its screen, what Food covers, its controls (act, enabled, busy, label, sub) and some of its words. */
export const EXPECT = Object.freeze({
  'food-panel-03': { ...TASK, controls: [['release', false, true, 'RELEASE', 'Sending…']], says: ['Release the panel.'] },
  'food-panel-04': { ...TASK, controls: [['lock', true, false, 'LOCK', 'At 6: the platform']], says: ['Lock it over the platform, at 6.'] },
  'food-winch-03': { ...TASK, controls: [['hold', true, false, 'Holding', 'Keep holding: it breaks']], says: ['Checking your let-go…', 'The connection dropped on the way.'] },
  'food-winch-12': { ...TASK, controls: [['key', true, false, 'Turn key', 'Sends the crate down']], says: ['Landed. Turn your key.'] },
  'food-panel-18': { ...TASK, controls: [['release', false, false, 'RELEASE', 'Reconnecting…']], says: ['Reconnecting…', 'The Task goes on without your presses.'] },
  'variant-lock-refused': { ...TASK, controls: [['lock', true, false, 'LOCK', 'At 6: the platform']], says: ['Your LOCK was not done', 'The crane had moved on.'] },
  'variant-release-recovered': { ...TASK, controls: [['lock', true, false, 'LOCK', 'At 6: the platform']], says: ['Your RELEASE went through.'] },
  'variant-release-unknown': { ...TASK, controls: [['release', false, false, 'RELEASE', 'Wait: the crate is rising']], says: ['Checking your RELEASE…', 'The connection dropped on the way.'] },
  'case-food-winch-01': { ...TASK, controls: [['hold', false, false, 'Hold', 'After the briefing']], says: ['You run the Winch', 'Hold it up. Let go over 6.', 'Starting'], focus: 'fs-card fs-brief' },
  'case-food-winch-02': { ...TASK, controls: [['hold', true, false, 'Hold', 'Press and hold to lift']], says: ['Press and hold to lift it.'] },
  'case-food-winch-06': { ...TASK, controls: [['hold', true, false, 'Holding', 'Let go: falls on Cleo']], says: ["Don't let go: it falls on Cleo."] },
  'case-food-winch-08': { ...TASK, controls: [['hold', true, false, 'Holding', 'Let go now: it lands']], says: ['Let go now: over the platform.'] },
  'case-food-winch-13': { ...TASK, controls: [['key', false, false, 'Key turned', 'Waiting for the other key']], says: ['Key turned. Waiting for Cleo.'] },
  'case-food-winch-14': { ...TASK, controls: [['hold', false, false, 'Hold', 'The Task is over']], says: ['You are out', "The panel's blade came down into your cab. Not the Hospital: you are out of the match."], focus: 'fs-card' },
  'case-food-winch-17': { ...TASK, controls: [['hold', false, false, 'Hold', 'The Task is over']], says: ['Task cancelled', 'Cleo lost their connection. Nothing was delivered.'], focus: 'fs-card' },
  'case-food-panel-01': { ...TASK, controls: [['release', false, false, 'RELEASE', 'After the briefing']], says: ['You run the Panel', 'Release it, then lock it at 6.', 'LOCK at 7 cuts Hana.'], focus: 'fs-card fs-brief' },
  'case-food-panel-06': { ...TASK, controls: [['lock', true, false, 'LOCK', "At 7: Hana's cab"]], says: ['LOCK here cuts Hana.'] },
  'case-food-panel-09': { ...TASK, controls: [['release', true, false, 'RELEASE', 'Starts the panel clicking']], says: ['Locked. Hana lets go over it.'] },
  'case-food-panel-13': { ...TASK, controls: [['key', true, false, 'Turn key', 'Sends the crate down'], ['release', true, false, 'RELEASE', 'Starts the panel clicking']], says: ['Landed. Turn your key.'] },
  'case-food-panel-16': { ...TASK, controls: [['release', false, false, 'RELEASE', 'The Task is over']], says: ['Delivered', "The crate went down to the galley. The ship's food stock rises by five."], focus: 'fs-card' },
  'case-food-panel-17': { ...TASK, controls: [['release', false, false, 'RELEASE', 'The Task is over']], says: ['Task lost', 'The crate was not over the platform.'], focus: 'fs-card' },
  'case-food-flow-01': { ...FLOW, screen: 'food-tasks', says: ['Start a Task', 'Land a ration crate on the galley lift: +5 packages', 'How the Food Supply Task works'], focus: 'sheet' },
  'case-food-flow-02': { ...FLOW, screen: 'food-partners', says: ['Choose your Partner', 'Went for food last round', 'Ask Cleo'] },
  'case-food-flow-03': { ...FLOW, screen: 'food-room', says: ['Waiting for Cleo', 'Cancel'], focus: 'sheet' },
  'case-food-flow-04': { ...FLOW, screen: 'food-room', says: ['Hana asks you to join the Food Supply Task', 'Decline', 'Join', 'Answer within 15 s. No answer counts as a decline.'], focus: 'fs-card' },
  'case-food-flow-09': { ...FLOW, screen: 'food-room', says: ['Two players are away on the Food Supply Task'] },
  'case-food-states-14': { ...FLOW, screen: 'food-howto', says: ['How the Food Supply Task works', 'Both turn a key: +5 packages for the ship.'], focus: 'sheet' },
  'case-food-flow-13': { ...NONE, screen: 'food-room', says: [], gauge: 'Food low: 1 package left' },
  'case-food-flow-15': { ...NONE, screen: 'food-room', says: [], gauge: 'Food low: ½ package left' },
  'case-food-flow-16': { ...NONE, screen: 'food-room', says: [], gauge: 'No food left' },
  'notice-away': { ...NONE, screen: null, says: ['Two players are away on the Food Supply Task'] },
  'notice-stock': { ...NONE, screen: null, says: ['Food stock: 6 packages (+5)'] },
  'notice-stale': { ...NONE, screen: null, hidden: true, says: [] },
});

/**
 * The five parts against the package's own pages: the lines only one of the two says, and what is drawn the same.
 * Frontend's packet stages a press on three of them, which the package's page for that part does not show: those
 * words, and the places they are drawn in, are the difference. `scene`, `hint` and `dock` say which places must be the
 * package's pixels.
 */
export const PACKAGE = Object.freeze({
  'food-panel-03': { component: ['Sending…'], package: ['Starts the panel clicking'], scene: true, hint: true, dock: false,
    why: "The packet's RELEASE is on its way: the control is busy and says so. The package's page for this part shows the control before the press." },
  'food-panel-04': { component: [], package: [], scene: true, hint: true, dock: true, why: 'The same state on both.' },
  'food-winch-03': { component: ['Checking your let-go…', 'The connection dropped on the way.'], package: [], scene: true, hint: true, dock: false,
    why: "The packet's let-go has no answer yet: the notice says so, over the scene, and a contact-off is owed. The package's page for this part shows the hold without them." },
  'food-winch-12': { component: [], package: [], scene: true, hint: true, dock: true, why: 'The same state on both.' },
  'food-panel-18': { component: ['0:25', 'Release the panel.', 'RELEASE'], package: ['0:18', 'The crate is over you.', 'LOCK'], scene: false, hint: false, dock: false,
    why: "Frontend's packet keeps a RELEASE-capable view and marks it stale (a synthetic equivalent, not a connected payload). The package's page is its own storyboard's moment, seven seconds later, where the control is LOCK. Both say Reconnecting…; the moment, and so the picture, differ." },
});
/** The Task top bar's two portraits: the port draws them at 36 px (its factory's inline size), the package's page at 32 px (its kit's rule). The component is the port's. */
export const PORTRAITS = Object.freeze({ component: 36, package: 32 });

const read = path => readFile(join(REPO, path));
const git = (...args) => execFileSync('git', args, { cwd: REPO, maxBuffer: 1 << 27 });
const round2 = value => Math.round(value * 100) / 100;
const lines = text => text.split('\n').map(line => line.trim()).filter(Boolean);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── The pins, read before anything is drawn ─────────────────────────────────────────────────────────────────
const provenance = JSON.parse(await read(`${COMPONENT}/preview/provenance.json`));
const packetBytes = await read(provenance.packet.file);
const packet = { ...provenance.packet, ok: sha256(packetBytes) === provenance.packet.sha256 && packetBytes.length === provenance.packet.bytes };

const portPins = JSON.parse(await read(PORT_PINS)).files;
const sources = JSON.parse(await read(`${COMPONENT}/sources.json`));
const port = { pins: PORT_PINS, baseline: sources.baseline.commit, files: {} };
for (const path of [...new Set(sources.files.map(file => file.source))]) {
  const actual = sha256(await read(path));
  port.files[path] = { sha256: actual, pinned: portPins[path]?.sha256 ?? null, ok: actual === portPins[path]?.sha256 };
}
port.ok = Object.values(port.files).every(file => file.ok);

const map = JSON.parse(await read(PACKAGE_MAP));
const pack = { map: PACKAGE_MAP, page: 'design/food-supply/phone.html?<query>&text=1&safe=47,34&motion=normal&chrome=0', designerHead: map.designerHead, files: {}, queries: {} };
for (const [path, pinned] of Object.entries(map.referencePins)) {
  const actual = sha256(await read(path));
  pack.files[path] = { sha256: actual, pinned, ok: actual === pinned };
}
for (const part of PARTS) pack.queries[part] = map.cases.find(entry => entry.id === part)?.reference.query ?? null;
pack.ok = Object.values(pack.files).every(file => file.ok) && Object.values(pack.queries).every(Boolean);

const native = { ...provenance.nativeCaptures, available: true, files: {} };
try { git('cat-file', '-e', `${native.source.commit}^{commit}`); } catch { native.available = false; }
const nativeBytes = {};
for (const part of PARTS) {
  native.files[part] = {};
  for (const size of Object.keys(SIZES)) {
    const pinned = provenance.nativeCaptures.files[part][size];
    let bytes = null;
    if (native.available) try { bytes = git('show', `${native.source.commit}:${native.source.folder}/${pinned.file}`); } catch { bytes = null; }
    nativeBytes[`${part}/${size}`] = bytes;
    native.files[part][size] = { ...pinned, ok: bytes !== null && sha256(bytes) === pinned.sha256 };
  }
}
native.ok = native.available && Object.values(native.files).every(sizes => Object.values(sizes).every(file => file.ok));

// The source the record shows, read before anything is written: the component, the frozen port and the game files
// it is drawn with, the package's pages, and the pins.
const { sourceCommit, sourceClean } = sourceState(REPO, [COMPONENT, 'design/tools/food-component-check.mjs', 'design/tools/lib/component-check.mjs', 'apps/game/hosted', 'apps/game/dev/phone/food',
  'apps/game/src/planet', 'packages/presentation/src/planet', 'design/food-supply', PORT_PINS, PACKAGE_MAP]);

// ── The bundle: the preview's three pages, and the hosted game's own art as its build emits it ─────────────
const out = await bundlePreview({ repo: REPO, root: join(REPO, COMPONENT, 'preview'), name: 'food-component-check', pages: { index: 'index.html', port: 'port.html', compare: 'compare.html' } });
const emitted = new Map(), emitter = { emitFile({ fileName, source }) { emitted.set(fileName, Buffer.from(source)); } };
for (const plugin of [comicAssetsPlugin(REPO), crewDrawingAssetsPlugin(REPO), foodSupplyAssetsPlugin(REPO)]) await plugin.buildStart.call(emitter);
for (const [name, bytes] of emitted) { await mkdir(dirname(join(out, name)), { recursive: true }); await writeFile(join(out, name), bytes); }
const inventory = [...emitted].map(([name, bytes]) => ({ name, sha256: sha256(bytes), bytes: bytes.length })).sort((a, b) => a.name.localeCompare(b.name));
const art = { what: "The hosted game's own art, written beside the bundle as the game's build emits it (apps/game/hosted/comic-assets.mjs, scripts/crew-drawing-art.mjs, scripts/food-supply-art.mjs)",
  files: inventory.length, foodDrawings: inventory.filter(file => file.name.startsWith('art/food-supply/')).length, bytes: inventory.reduce((sum, file) => sum + file.bytes, 0), inventorySha256: sha256(JSON.stringify(inventory)) };
await mkdir(join(out, 'captures'), { recursive: true });
if (ONLY) REVIEW = join(out, 'review-partial'); else await rm(REVIEW, { recursive: true, force: true });
await mkdir(REVIEW, { recursive: true });

const { server, origin } = await serve(out);
const reference = await startServer();
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const captures = {}, probes = {}, larger = {}, agreement = { port: { states: 0, equal: 0, control: null }, package: {}, native: {} };
let failed = [packet.ok, port.ok, pack.ok, native.ok].filter(ok => !ok).length;
const report = async (page, violations) => {
  for (const v of violations) v.kind = await classify(out, v);
  // The browser asks for /favicon.ico by itself; the preview has none, as the live site has none.
  return page.problems().filter(p => !/\/favicon\.ico$/.test(p));
};

/** One preview page on one state: what it shows, its policy reports and problems, and its picture as PNG bytes. */
async function draw(pageName, state, sizeKey, motion, extra = '') {
  const [width, height] = SIZES[sizeKey];
  const page = await openPage(browser, { width, height, scale: 1 });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
  if (MOTIONS[motion]) await page.media(MOTIONS[motion]);
  try {
    await page.goto(`${origin}/${pageName}.html?state=${state}&size=${sizeKey}&single=1${extra}`, 'document.readyState === "complete" && window.__food');
    await page.evaluate('window.__food.ready');
    await page.evaluate('window.__food.freeze(300)');
    const seen = await page.evaluate('window.__food.describe()');
    const expected = await page.evaluate('window.__food.expected');
    const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 } });
    const violations = await page.evaluate('window.__policy');
    const problems = await report(page, violations);
    return { seen, expected, png: Buffer.from(data, 'base64'), violations, problems };
  } finally { await page.close(); }
}
/** A picture of the component for the review folder, at two device pixels per CSS pixel. */
async function picture(state, sizeKey, motion, file, extra = '') {
  const [width, height] = SIZES[sizeKey];
  const page = await openPage(browser, { width, height, scale: 2 });
  if (MOTIONS[motion]) await page.media(MOTIONS[motion]);
  try {
    await page.goto(`${origin}/index.html?state=${state}&size=${sizeKey}&single=1${extra}`, 'document.readyState === "complete" && window.__food');
    await page.evaluate('window.__food.ready');
    await page.evaluate('window.__food.freeze(300)');
    const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 76, clip: { x: 0, y: 0, width, height, scale: 1 } });
    const bytes = Buffer.from(data, 'base64');
    await writeFile(join(REVIEW, file), bytes);
    return { file: `${COMPONENT}/review/${file}`, sha256: sha256(bytes) };
  } finally { await page.close(); }
}

try {
  const first = await openPage(browser, { width: 390, height: 844 });
  await first.goto(`${origin}/index.html?single=1`, 'document.readyState === "complete" && window.__food');
  const every = await first.evaluate('window.__food.states');
  await first.close();
  const states = every.filter(state => !ONLY || ONLY.includes(state.id)), parts = PARTS.filter(part => states.some(state => state.id === part));
  const unlisted = every.map(s => s.id).filter(id => !EXPECT[id]), missing = Object.keys(EXPECT).filter(id => !every.some(s => s.id === id));
  if (unlisted.length || missing.length) { failed += 1; console.log(`FAIL the preview's states and the check's list differ: ${JSON.stringify({ unlisted, missing })}`); }

  // ── Every state, at both sizes, in both motions: what it shows, and the frozen port beside it ────────────
  const kept = {};
  for (const [sizeKey] of Object.entries(SIZES)) {
    for (const state of states) {
      for (const motion of Object.keys(MOTIONS)) {
        const expect = EXPECT[state.id] ?? {}, notes = [];
        const must = (condition, note) => { if (!condition) notes.push(note); };
        const mine = await draw('index', state.id, sizeKey, motion), theirs = await draw('port', state.id, sizeKey, motion);
        const s = mine.seen, t = theirs.seen;
        must(s.present === true && s.hidden === !!expect.hidden, 'the surface is there, shown or hidden as its state asks');
        must((s.screen ?? null) === (expect.screen ?? null), `the screen is ${expect.screen}`);
        must(state.kind === 'notice' || s.motion === (motion === 'reduced' ? 'reduced' : 'normal'), `its motion is ${motion}`);
        must(same(s.owned, expect.owned) && same(s.measured, expect.bars), 'Food covers what its state says, and its bars measure what they should');
        must(same((s.controls ?? []).map(c => [c.act, c.enabled, c.busy, c.label, c.sub]), expect.controls ?? []), 'its controls are the state\'s');
        must((expect.says ?? []).every(words => lines(s.text ?? '').some(line => line.toLowerCase() === words.toLowerCase())), 'it says its state\'s words');
        must((s.pictures ?? []).length === expect.pictures && !(s.pictures ?? []).includes('picture:unknown'), `it draws ${expect.pictures} pictures`);
        must(!expect.focus || s.focus === expect.focus, `focus is on its ${expect.focus}`);
        must(!expect.gauge || s.gauge.includes(`aria-label="${expect.gauge}"`), 'the ordinary header\'s stand-in holds the gauge');
        if (mine.expected) {
          const e = mine.expected, control = (s.controls ?? [])[0] ?? {};
          must(control.act === e.control && control.enabled === e.enabled && control.busy === e.busy && s.reconnecting === e.reconnecting && (e.sub === undefined || control.sub === e.sub), 'it shows what Frontend\'s packet expects of this frame');
        }
        must(mine.problems.length === 0 && mine.violations.every(v => v.kind !== 'unexpected'), 'no page problem and no policy report but the known one');
        // The frozen port, on the same state, in the same phone.
        const equal = { html: s.html === t.html, text: s.text === t.text, boxes: same(s.boxes, t.boxes), controls: same(s.controls, t.controls), covers: same(s.owned, t.owned) && same(s.measured, t.measured),
          gauge: s.gauge === t.gauge, focus: s.focus === t.focus, pixels: mine.png.equals(theirs.png) };
        must(Object.values(equal).every(Boolean), `the frozen port draws the same: ${Object.entries(equal).filter(([, ok]) => !ok).map(([key]) => key).join(', ') || 'everything'}`);
        must(theirs.problems.length === 0 && theirs.violations.every(v => v.kind !== 'unexpected'), 'the port\'s page had no problem');
        const ok = notes.length === 0;
        if (!ok) failed += 1;
        agreement.port.states += 1;
        if (Object.values(equal).every(Boolean)) agreement.port.equal += 1;
        const key = `${sizeKey}/${state.id}/${motion}`;
        captures[key] = { ok, notes, kind: state.kind, title: state.title, synthetic: state.synthetic, screen: s.screen ?? null, hidden: s.hidden, motion: s.motion ?? null, covers: s.owned, bars: s.measured,
          controls: (s.controls ?? []).map(c => ({ act: c.act, enabled: c.enabled, busy: c.busy, label: c.label, sub: c.sub })), pictures: s.pictures ?? [], focus: s.focus ?? null,
          words: lines(s.text ?? '').length, boxes: s.boxes ?? {}, htmlSha256: sha256(s.html ?? ''), pngSha256: sha256(mine.png),
          port: { equal, htmlSha256: sha256(t.html ?? ''), pngSha256: sha256(theirs.png) },
          ...(mine.expected ? { packetExpects: mine.expected } : {}), violations: mine.violations, problems: mine.problems };
        if (PARTS.includes(state.id) && motion === 'full') {
          await writeFile(join(out, 'captures', `${state.id}-${sizeKey}-component.png`), mine.png);
          kept[`${state.id}/${sizeKey}`] = s;
        }
        // The pictures kept for review: every state at 390 × 844 in full motion, and the five parts at both sizes in both motions.
        if ((sizeKey === '390x844' && motion === 'full') || PARTS.includes(state.id)) {
          Object.assign(captures[key], await picture(state.id, sizeKey, motion, `${sizeKey}-${state.id}${motion === 'reduced' ? '-reduced' : ''}.jpg`));
        }
        console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state.id} (${motion})${ok ? '' : ` · ${notes.join('; ')} ${JSON.stringify([...mine.problems, ...theirs.problems])}`}`);
      }
    }
  }

  // The control: the port's clock moved one second on the same state. The two must then differ, in the DOM and the pixels.
  if (parts.includes('food-panel-04')) {
    const mine = await draw('index', 'food-panel-04', '390x844', 'full'), moved = await draw('port', 'food-panel-04', '390x844', 'full', '&nudge=1000');
    agreement.port.control = { what: 'the port\'s clock moved 1000 ms on food-panel-04 at 390 × 844', html: mine.seen.html === moved.seen.html, pixels: mine.png.equals(moved.png) };
    agreement.port.control.ok = !agreement.port.control.html && !agreement.port.control.pixels;
    if (!agreement.port.control.ok) failed += 1;
    console.log(`${agreement.port.control.ok ? 'ok  ' : 'FAIL'} the port's clock moved one second: the DOM and the pixels differ`);
  }

  // ── Larger text: the port's own support, held to the port in the same way ───────────────────────────────
  for (const sizeKey of Object.keys(SIZES)) {
    for (const stateId of LARGER.states.filter(id => states.some(state => state.id === id))) {
      for (const text of LARGER.texts) {
        const notes = [], must = (condition, note) => { if (!condition) notes.push(note); };
        const mine = await draw('index', stateId, sizeKey, 'full', `&text=${text}`), theirs = await draw('port', stateId, sizeKey, 'full', `&text=${text}`);
        const s = mine.seen, t = theirs.seen;
        const equal = { html: s.html === t.html, text: s.text === t.text, boxes: same(s.boxes, t.boxes), controls: same(s.controls, t.controls), covers: same(s.owned, t.owned) && same(s.measured, t.measured), pixels: mine.png.equals(theirs.png) };
        must(Object.values(equal).every(Boolean), `the frozen port draws the same: ${Object.entries(equal).filter(([, ok]) => !ok).map(([key]) => key).join(', ') || 'everything'}`);
        must(s.measured.top === BAR_TOP[text], `the surface's top bar is ${BAR_TOP[text]} px at this text size`);
        must(same((s.controls ?? []).map(c => [c.act, c.enabled, c.busy, c.label, c.sub]), EXPECT[stateId].controls ?? []) && (EXPECT[stateId].says ?? []).every(words => lines(s.text ?? '').some(line => line.toLowerCase() === words.toLowerCase())), 'it shows its state\'s controls and says its words');
        must([...mine.problems, ...theirs.problems].length === 0 && [...mine.violations, ...theirs.violations].every(v => v.kind !== 'unexpected'), 'no page problem and no policy report but the known one');
        const ok = notes.length === 0, key = `${sizeKey}/${stateId}/${text * 100}%`;
        if (!ok) failed += 1;
        larger[key] = { ok, notes, rootPx: 16 * text, bars: s.measured, equal, htmlSha256: sha256(s.html ?? ''), pngSha256: sha256(mine.png), violations: mine.violations, problems: mine.problems };
        if (sizeKey === '390x844' && LARGER.pictures.includes(`${stateId}/${text}`)) Object.assign(larger[key], await picture(stateId, sizeKey, 'full', `${sizeKey}-${stateId}-text${text * 100}.jpg`, `&text=${text}`));
        console.log(`${ok ? 'ok  ' : 'FAIL'} larger text ${sizeKey} ${stateId} at ${text * 100} %${ok ? '' : ` · ${notes.join('; ')}`}`);
      }
    }
  }

  // ── The five parts beside the package's own pages, and beside #290's native captures ─────────────────────
  const reader = await openPage(browser, { width: 1500, height: 1100, scale: 1 });
  await reader.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
  await reader.goto(`${origin}/compare.html`, 'document.readyState === "complete" && window.__compare');
  const compare = input => reader.evaluate(`window.__compare.compare(${JSON.stringify(input)})`);
  const PACK_SEEN = `(() => { const frame = document.querySelector('.ph'), o = frame.getBoundingClientRect();
    const box = el => { const r = el.getBoundingClientRect(); return [r.left - o.left, r.top - o.top, r.width, r.height].map(n => Math.round(n * 100) / 100); }, shown = el => !el.closest('[hidden]');
    return { text: frame.innerText, portraits: [...frame.querySelectorAll('.tb-who .pt')].filter(shown).map(box),
      boxes: Object.fromEntries(['.tb', '.fs-view', '.fs-art > svg', '.fs-role', '.fs-hint', '.fs-dock', '.fs-strip', '.fs-meter-wrap', '.fs-controls', '.tabs', '.sheet', '.fs-card', '.fs-banner']
        .map(selector => [selector, [...frame.querySelectorAll(selector)].filter(shown).map(box)]).filter(([, list]) => list.length)) }; })()`;
  const packSeen = {};
  for (const [sizeKey, [width, height]] of Object.entries(SIZES)) {
    for (const part of parts) {
      const page = await openPage(browser, { width, height, scale: 1 });
      await page.goto(`${reference.origin}/${pack.page.replace('<query>', pack.queries[part])}`);
      await sleep(300);
      const seen = await page.evaluate(PACK_SEEN);
      const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 } });
      const png = Buffer.from(data, 'base64');
      await writeFile(join(out, 'captures', `${part}-${sizeKey}-package.png`), png);
      packSeen[`${part}/${sizeKey}`] = { seen, pngSha256: sha256(png), problems: page.problems().filter(p => !/\/favicon\.ico$/.test(p)) };
      await page.close();
      if (nativeBytes[`${part}/${sizeKey}`]) await writeFile(join(out, 'captures', `${part}-${sizeKey}-native.png`), nativeBytes[`${part}/${sizeKey}`]);
    }
  }
  for (const sizeKey of Object.keys(SIZES)) {
    for (const part of parts) {
      const key = `${part}/${sizeKey}`, mine = kept[key], theirs = packSeen[key], rule = PACKAGE[part];
      const url = name => `/captures/${part}-${sizeKey}-${name}.png`;
      const first = selector => mine.boxes[selector]?.[0] ?? null;
      const notices = (mine.notices ?? []).map(([x, y, w, h]) => [x - NOTICE_CLEAR, y - NOTICE_CLEAR, w + 2 * NOTICE_CLEAR, h + 2 * NOTICE_CLEAR]);
      const places = { scene: { box: first('.fs-view'), skip: notices }, topBar: { box: first('.tb') }, role: { box: first('.fs-role') }, hint: { box: first('.fs-hint') }, dock: { box: first('.fs-dock') } };

      // The package's own page.
      {
        const notes = [], must = (condition, note) => { if (!condition) notes.push(note); };
        const a = lines(mine.text), b = lines(theirs.seen.text).filter(line => !/^Synthetic fixture/.test(line));
        const onlyComponent = a.filter(line => !b.includes(line)), onlyPackage = b.filter(line => !a.includes(line));
        must(same(onlyComponent, rule.component) && same(onlyPackage, rule.package), 'the words differ only as listed for this part');
        const shared = Object.keys(mine.boxes).filter(selector => theirs.seen.boxes[selector] && selector !== '.fs-banner');
        const delta = Object.fromEntries(shared.map(selector => [selector, mine.boxes[selector].length !== theirs.seen.boxes[selector].length ? null
          : round2(Math.max(0, ...mine.boxes[selector].flatMap((box, i) => box.map((value, k) => Math.abs(value - theirs.seen.boxes[selector][i][k])))))]));
        // The dock is a wrapper. Where there is no instrument, the port's dock still holds the instrument's empty slot and its gap.
        const instrument = ['.fs-strip', '.fs-meter-wrap'].some(selector => mine.boxes[selector]);
        const lies = selector => delta[selector] !== null && (delta[selector] <= LIMITS.box || (selector === '.fs-dock' && !instrument && Math.abs(delta[selector] - EMPTY_SLOT_GAP) <= LIMITS.box));
        must(shared.length >= 6 && shared.every(lies), 'every part lies where the package lays it, box for box');
        must(same(Object.keys(theirs.seen.boxes).filter(selector => !mine.boxes[selector]), []), 'the package lays out nothing the component lacks');
        const portraits = { component: mine.portraits.map(box => box[2]), package: theirs.seen.portraits.map(box => box[2]) };
        must(portraits.component.length === 2 && portraits.component.every(size => size === PORTRAITS.component) && portraits.package.every(size => size === PORTRAITS.package), 'the top bar\'s portraits are the port\'s 36 px, where the package draws 32 px');
        const pixels = (await compare({ a: url('component'), b: url('package'), boxes: places })).boxes;
        if (rule.scene) must(pixels.scene.mean <= LIMITS.packageSceneMean && pixels.scene.far <= LIMITS.packageSceneFar && pixels.scene.moved3px.mean > 1, 'the scene outside the notices is the package\'s');
        if (rule.hint) must(pixels.hint.max <= LIMITS.packageGlass && pixels.hint.moved3px.mean > 1, 'the hint is the package\'s');
        if (rule.dock) must(pixels.dock.max === LIMITS.packageSame && pixels.dock.moved3px.mean > 1, 'the instrument and the control are the package\'s, pixel for pixel');
        must(pixels.role.max <= LIMITS.packageGlass && pixels.role.moved3px.mean > 1, 'the role row is the package\'s, to the glass over the app\'s own background');
        must(theirs.problems.length === 0, 'the package\'s page had no problem');
        const ok = notes.length === 0;
        if (!ok) failed += 1;
        agreement.package[`${sizeKey}/${part}`] = { ok, notes, page: pack.page.replace('<query>', pack.queries[part]), why: rule.why, words: { onlyComponent, onlyPackage }, boxes: delta, instrument, portraits, pixels,
          held: { scene: rule.scene, hint: rule.hint, dock: rule.dock }, packagePngSha256: theirs.pngSha256, problems: theirs.problems };
        console.log(`${ok ? 'ok  ' : 'FAIL'} package ${sizeKey} ${part}: boxes ${Math.max(...Object.values(delta).map(d => d ?? 99))} px; scene ${pixels.scene.differing} of ${pixels.scene.pixels} pixels differ (mean ${pixels.scene.mean}); hint ${pixels.hint.max}, role ${pixels.role.max}, dock ${pixels.dock.max} levels at most${ok ? '' : ` · ${notes.join('; ')}`}`);
      }

      // Frontend's native capture from #290.
      {
        const notes = [], must = (condition, note) => { if (!condition) notes.push(note); };
        const file = native.files[part][sizeKey], comparable = part !== 'food-panel-18';
        let pixels = null, sameSize = null;
        if (file.ok) {
          const result = await compare({ a: url('component'), b: url('native'), boxes: places });
          pixels = result.boxes; sameSize = result.sameSize;
          must(sameSize, 'the capture is this phone\'s size');
          if (comparable) {
            must(pixels.scene.mean <= LIMITS.nativeSceneMean && pixels.scene.far <= LIMITS.nativeSceneFar, 'the scene outside the notices is within the limit');
            must(pixels.scene.moved3px.mean >= LIMITS.controlFactor * pixels.scene.mean && pixels.scene.moved3px.far >= LIMITS.controlFactor * pixels.scene.far, 'the same capture moved 3 px measures at least twice as far');
          }
        } else must(false, '#290\'s capture could not be read from its commit, or is not the pinned file');
        const ok = notes.length === 0;
        if (!ok) failed += 1;
        agreement.native[`${sizeKey}/${part}`] = { ok, notes, file: `${native.source.folder}/${file.file}`, sha256: file.sha256, commit: native.source.commit, sameSize, comparable,
          ...(comparable ? {} : { why: native.connected }), pixels };
        console.log(`${ok ? 'ok  ' : 'FAIL'} native  ${sizeKey} ${part}: ${pixels ? `scene ${pixels.scene.mean} mean, ${pixels.scene.far} far (moved 3 px: ${pixels.scene.moved3px.mean}, ${pixels.scene.moved3px.far})` : 'not read'}${comparable ? '' : ' · a connected capture of another match: recorded, not held'}${ok ? '' : ` · ${notes.join('; ')}`}`);
      }

      // The three side by side, for review: the package's page, the component, #290's native capture.
      if (native.files[part][sizeKey].ok) {
        await compare({ a: url('package'), b: url('component'), extra: [url('native')], boxes: {}, labels: ['The package\'s own page (design/food-supply)', `The component, ${FOOD_VERSION}`, 'Frontend\'s native capture (#290)'] });
        const box = await reader.evaluate('(() => { const r = document.querySelector(".preview-row").getBoundingClientRect(); return { width: Math.ceil(r.width), height: Math.ceil(r.height) }; })()');
        const { data } = await reader.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, captureBeyondViewport: true, clip: { x: 0, y: 0, width: box.width, height: box.height, scale: 1 } });
        const bytes = Buffer.from(data, 'base64'), name = `compare-${sizeKey}-${part}.jpg`;
        await writeFile(join(REVIEW, name), bytes);
        agreement.package[`${sizeKey}/${part}`].sideBySide = { file: `${COMPONENT}/review/${name}`, sha256: sha256(bytes) };
      }
    }
  }
  // Controls: another part's picture must not pass for this one.
  if (parts.includes('food-panel-03') && parts.includes('food-panel-04')) {
    const places = { scene: { box: kept['food-panel-03/390x844'].boxes['.fs-view'][0], skip: [] } };
    const againstPackage = (await compare({ a: '/captures/food-panel-03-390x844-component.png', b: '/captures/food-panel-04-390x844-package.png', boxes: places })).boxes.scene;
    const againstNative = native.files['food-panel-04']['390x844'].ok ? (await compare({ a: '/captures/food-panel-03-390x844-component.png', b: '/captures/food-panel-04-390x844-native.png', boxes: places })).boxes.scene : null;
    const ownNative = agreement.native['390x844/food-panel-03'].pixels?.scene ?? null;
    agreement.controls = { what: 'food-panel-03 as the component draws it, against food-panel-04 as the package draws it and as #290 captured it, at 390 × 844: the scene',
      package: { ...againstPackage, ok: againstPackage.max > LIMITS.packageGlass },
      native: againstNative && ownNative ? { ...againstNative, ok: againstNative.far > LIMITS.nativeSceneFar && againstNative.far >= LIMITS.controlFactor * ownNative.far } : { ok: false } };
    if (!agreement.controls.package.ok || !agreement.controls.native.ok) failed += 1;
    console.log(`${agreement.controls.package.ok && agreement.controls.native.ok ? 'ok  ' : 'FAIL'} another part's picture does not pass: against the package ${againstPackage.max} levels at most, against #290 ${againstNative?.far ?? 'unread'} far`);
  }
  const readerViolations = await reader.evaluate('window.__policy');
  const readerProblems = await report(reader, readerViolations);
  if (readerProblems.length || readerViolations.some(v => v.kind === 'unexpected')) { failed += 1; console.log(`FAIL the comparisons' page: ${JSON.stringify(readerProblems)}`); }
  await reader.close();

  // ── The lifecycle probe ─────────────────────────────────────────────────────────────────────────────────
  for (const [mode, media] of [['full', null], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }]]) {
    const page = await openPage(browser, { width: 1280, height: 900, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?probe=1`, 'document.readyState === "complete" && window.__food');
    const result = await page.evaluate('window.__food.probe');
    const violations = await page.evaluate('window.__policy');
    const problems = await report(page, violations);
    await page.close();
    const ok = result.ok && result.mode === mode && result.checks.length > 0 && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    if (!ok) failed += 1;
    probes[mode] = { emulated: media ?? {}, ...result, ok, violations, problems };
    console.log(`${ok ? 'ok  ' : 'FAIL'} probe (${mode}): ${result.checks.filter(c => c.ok).length} of ${result.checks.length}${ok ? '' : ` · ${result.checks.filter(c => !c.ok).map(c => c.id).join('; ')} ${JSON.stringify(problems)}`}`);
  }
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  await reference.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}

const record = {
  tool: 'design/tools/food-component-check.mjs',
  component: COMPONENT,
  version: FOOD_VERSION,
  sourceCommit, sourceClean,
  environment: `Desktop Chromium (headless, ${chrome.version}); the comparisons at one device pixel per CSS pixel, the review pictures at two; the preview bundled by Vite and served with the production headers below, the hosted game's own art beside it; the package's pages served unchanged by design/tools/phone-ui-render.mjs's reference server. Not a phone, not Safari, no server, and not a performance measure.`,
  ...recordedHeaders(),
  harness: 'The preview\'s phone: the review frames\' safe areas (47 px above, 34 px below) given through a preview style rule where a phone gives its own through env(); stand-ins for the ordinary app\'s header, bar and board; the app\'s own background (#060C1C) beneath; a fixed clock; running animations (the two spinners) held at 300 ms for each capture.',
  limits: LIMITS,
  packet, port, package: pack, native: { ...native, files: native.files }, art,
  captures,
  agreement,
  largerText: { texts: LARGER.texts, states: LARGER.states, barTop: BAR_TOP, drawn: larger },
  probe: probes,
};
if (!ONLY) await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
const passed = Object.values(captures).filter(c => c.ok).length, checks = Object.values(probes).flatMap(p => p.checks ?? []);
console.log(`pins ${packet.ok && port.ok && pack.ok && native.ok ? 'hold' : 'DO NOT HOLD'}; ${passed} of ${Object.keys(captures).length} captures passed; the frozen port draws the same in ${agreement.port.equal} of ${agreement.port.states}; `
  + `package ${Object.values(agreement.package).filter(a => a.ok).length} of ${Object.keys(agreement.package).length}; native ${Object.values(agreement.native).filter(a => a.ok).length} of ${Object.keys(agreement.native).length}; `
  + `larger text ${Object.values(larger).filter(a => a.ok).length} of ${Object.keys(larger).length}; `
  + `probe ${checks.filter(c => c.ok).length} of ${checks.length} checks; ${ONLY ? 'a partial run: no record written' : `record written to ${COMPONENT}/review/check.json`}`);
if (failed) process.exitCode = 1;
