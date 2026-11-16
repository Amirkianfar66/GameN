// mothership:dev-only
//
// The Food component's check (design/phone-ui/components/food). It bundles the component's preview the way the game
// bundles a component (Vite: ordinary bundling, no copy), adds the hosted game's own art as its build emits it, serves
// both with the hosted game's production response headers (lib/component-check.mjs), and:
//   draws every preview state at the two development phone sizes, 390 × 844 and 430 × 932, in full motion and with
//   the device's Reduce motion emulated, and holds each to what its state must show;
//   agrees with the frozen native port (apps/game/hosted/planet, whose files must be the pinned ones): the same
//   state drawn by the port's own renderer in the same phone must give the same DOM, the same boxes and the same
//   pixels, for every state, size and motion, with a control (the port's clock moved one second) that must not agree.
//   Seven corrections to the port are recorded in sources.json (CORRECTIONS below). Where one applies, the port's DOM
//   is read as corrected, the boxes it moves are named, and the pixels are the port's everywhere outside the place it
//   touches; there, the component is held to what the correction is for, and the two are pictured before and after.
//   The component's root carries its mark (data-food-component), which the port's has not: that is read as corrected too;
//   agrees with the approved package's own pages for the five parts of #290 (design/food-supply/phone.html, served
//   unchanged by phone-ui-render.mjs's reference server, its files held to their pins): where each part lies, box
//   for box; its words, apart from the differences listed below, which are the packet's own press states; and its
//   pixels, exactly, in the scene outside the surface's notices and wherever the words agree;
//   agrees with Frontend's ten native captures from #290 (read from that commit, each held to its SHA-256, never
//   copied): the scene's pixels within a stated limit, another machine's fonts and browser apart, with controls;
//   draws thirteen of the states at the game's larger text (its root's size: Large at 150 %, Largest at 200 %) at both
//   sizes, and holds them to the frozen port in the same way: the larger-text support is the port's own, with the
//   corrections to the role row, the outcome card and the request cards;
//   draws the frozen port and the component in one page (preview/both.html) with the port's stylesheets and the
//   component's both loaded, in each order, and holds each surface there to what it draws alone: the port's to the
//   pixels of its own page, the component's to its corrected ones, with a control (the component's root without its
//   mark) that must not pass;
//   puts a loud backdrop directly under every card, at the three text sizes, and holds every pixel inside the card
//   to what it was: a card is opaque to its edge, and nothing behind it shows through, with a control (a card faded
//   as a whole, as the port fades one that scrolls) that must not pass;
//   presses real keys on a card: Tab goes from the card to its words where they scroll, and the arrows scroll them;
//   changes the text size under a mounted surface and holds relayout() to what a new mount draws and, the focus
//   aside, to what the port draws on the app's preferences event, with a control (not told) that must differ;
//   runs the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion.
// A page passes with no policy report but the known one, no failed request and no page error. Every check must
// pass. It writes design/phone-ui/components/food/review/: pictures of the states, of the comparisons and of each
// correction before and after, and check.json (the headers and their SHA-256, the source commit, every pin, what
// each capture showed and its SHA-256, each comparison's numbers and each probe check).
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
 * package's frame paints its canvas (1 level); so are the top bar's portraits and title, under the bar's own glass
 * (3 levels: with the port's 36 px portraits they measured over 200). Against #290's captures, drawn by another browser on another machine
 * with other fonts, the scene outside the notices is held to a mean of 3 levels and 2 % of its pixels more than 24
 * levels apart; each control must measure at least twice what the comparison measures. Against the frozen port, a
 * request card's tilted stamp outside what the port cut of it: no pixel more than 24 levels apart (the browser draws a
 * tilted thing a little differently along its slanted edges when the scroller it stands in is another box: 17 levels
 * at most at the Standard text, and 22 at the Large; the record holds each capture's own number).
 */
export const LIMITS = Object.freeze({ box: 0.5, packageSame: 0, packageSceneMean: 0.05, packageSceneFar: 0.001, packageGlass: 1, packageBar: 3, nativeSceneMean: 3, nativeSceneFar: 0.02, controlFactor: 2, stampEdge: 24 });
/**
 * The game's larger text sizes (apps/game/hosted/planet/preferences.mjs: Large and Largest), and the states drawn at
 * them: the five parts, a briefing, a sheet, a request, the four outcomes and Too late to join. `pictures` are those kept for review, at
 * the Largest text: two Task screens, the briefing at both sizes (it is left as the port has it) and the outcomes not
 * pictured before and after with the corrections (BEFORE_AFTER).
 */
const LARGER = Object.freeze({ texts: [1.5, 2], states: [...PARTS, 'case-food-winch-01', 'case-food-flow-02', 'case-food-flow-04', 'case-food-panel-16', 'case-food-winch-14', 'case-food-winch-17', 'case-food-panel-17', 'case-food-states-08'],
  pictures: Object.freeze({ 'food-panel-04/2': ['390x844'], 'food-winch-03/2': ['390x844'], 'case-food-winch-01/2': ['390x844', '430x932'],
    'case-food-winch-14/2': ['390x844'], 'case-food-winch-17/2': ['390x844'], 'case-food-panel-17/2': ['390x844'] }) });
/**
 * The frozen port and the component in one page (preview/both.html): the port's stylesheets and the component's are
 * both loaded, in each order, and each surface is held to what it draws alone on the same state, phone and text
 * size. The component's corrected style rules are written under its mark, so the port's surface takes none of them
 * and they outweigh the port's rules whichever sheets come last. `control` is the component's root without its mark,
 * on a state where the role row's correction shows: it must not pass. One document has one focus, so the focus is
 * not compared here.
 */
const TOGETHER = Object.freeze({ orders: ['port', 'component'], texts: [1, ...LARGER.texts], states: LARGER.states, control: ['food-panel-04', 1.5, '390x844'], pictures: [['food-panel-04', 1.5, '390x844']] });
/**
 * Every card over what lies behind it. A backdrop of one loud colour is put directly under the card (its sibling,
 * one step below it in the stacking order) and the page is pictured again: every pixel inside the card, `inset` px
 * in from its edge and outside its round corners, must be what it was, and the pixels `around` it must not be (the
 * backdrop is there and shows). Its foot is counted by itself: the lowest `foot` px inside its edge, where words
 * that scroll fade. And where the words fit, the card's `rim`, its lowest px inside the edge and under its words,
 * must be the card's own colour and no other. `control` is a card faded as a whole, as the port fades a card that
 * scrolls: it must not pass.
 */
const OPAQUE = Object.freeze({ texts: [1, 1.5, 2], backdrop: 'rgb(255, 0, 255)', inset: 1, around: 6, foot: 28, rim: 10, control: ['case-food-panel-16', 1.5, '390x844'] });
/**
 * A card's words within reach of the keys, with real key presses: from the card, which holds the focus, Tab goes to
 * the words where they scroll, the arrow keys scroll them, and End brings them to their last line. Where the words
 * fit, Tab does not stop on them.
 */
const KEYS = Object.freeze({ states: ['case-food-panel-16', 'case-food-flow-04', 'case-food-states-08'], texts: [1, 1.5, 2], codes: Object.freeze({ Tab: 9, ArrowDown: 40, End: 35 }) });
/**
 * A text-size change on a mounted surface. The port lays itself out again on the app's preferences event; the
 * component on relayout(). Three states where it shows:
 *   banner  the "away" banner's place under the top bar is measured when the banner is built, so only a new layout
 *           moves it under the taller bar;
 *   card    an open request card is built again. The port's is not focused again, and the focus goes to the page;
 *           the component's takes the focus back (correction 6);
 *   sheet   the same for an open sheet, Start a Task.
 */
const RELAYOUT = Object.freeze({ text: 1.5, portEvent: 'mothership:preferences-change', states: Object.freeze({ 'case-food-flow-09': 'banner', 'case-food-flow-04': 'card', 'case-food-flow-01': 'sheet' }) });
/**
 * The corrections to the port (sources.json, kind "correction"), by their numbers in the handoff: what each one
 * does, and the captures it applies to, as read from the port's own page.
 */
export const CORRECTIONS = Object.freeze({
  1: { what: "The top bar's portraits are the kit's 32 px, as the approved package's: the title sits 8 px further back (4 px beside a single portrait)", where: 'every capture whose top bar holds a portrait' },
  2: { what: "With no instrument the dock has no slot and no gap for one, as the approved package's: the dock is 10 px shorter, and nothing drawn moves", where: 'every Task capture with no instrument' },
  3: { what: "The Partner's label in the role row is two whole pieces: no word is broken, and the seat number stays with its name", where: 'every capture where the port breaks a piece of the label' },
  4: { what: "An outcome card ends 12 px above the view's lower edge. Its words are in a scroller inside it and fade there, with the port's fade for a card's words: the card stays opaque to its edge, and no card is faded as a whole. Words that scroll take a place in the Tab order", where: "every capture with an outcome card: its limit and its scroller are always there, and they show where the port's card is taller than the limit" },
  5: { what: 'A request card ends 8 px above the Pass button, clear of the tab bar, and its words scroll above its answers. Words that scroll take a place in the Tab order', where: "every capture with a request card: its limit is always given, and it shows where the port's card is taller than the limit" },
  6: { what: 'A sheet or card that is built again gives the focus back', where: "every capture where the port's page shows a sheet or card with the focus outside the surface: the port built it again and left the focus to the page" },
  7: { what: "A request card's stamp, and Too late to join's, is whole, as the approved Food flow draws it: the scroller its words are in takes the card's inside at its top and its sides, where the port's began at the stamp's own line and cut the tilted stamp. Its lower edge stays, so the answers do not move", where: "every capture with a request card or Too late to join: the scroller is always so, and it shows wherever the card shows its stamp (a tight card, at the Largest text, shows none)" },
});
/** The top bar's portraits, in CSS px: the kit's size, on the package's pages and here. The port's are 36 px. */
export const PORTRAIT = Object.freeze({ kit: 32, port: 36 });
/** With no instrument the port's dock keeps the instrument's empty slot, and its gap. */
const SLOT_GAP = 10;
/** A card's shadow (0 18px 40px) fades out this far past its box, in CSS px: where a card's edge moves, the picture differs this far around it. */
const CARD_SHADOW = 80;
/** A sheet's glass blurs what lies under it: where the top bar is under a sheet, a change in the bar shows this far around it. */
const GLASS = 48;
/** The corrections pictured before (the frozen port's page) and after (the component's): [correction, state, text size, phone sizes]. */
const BEFORE_AFTER = Object.freeze([
  [1, 'food-panel-04', 1, ['390x844', '430x932']],
  [2, 'food-winch-12', 1, ['390x844']],
  [3, 'food-panel-04', 1.5, ['390x844']], [3, 'food-winch-03', 1.5, ['390x844']],
  [4, 'case-food-panel-16', 1.5, ['390x844', '430x932']], [4, 'case-food-panel-16', 2, ['390x844', '430x932']],
  [5, 'case-food-flow-04', 1.5, ['390x844']], [5, 'case-food-flow-04', 2, ['390x844', '430x932']],
  [7, 'case-food-flow-04', 1, ['390x844', '430x932']], [7, 'case-food-flow-04', 1.5, ['390x844', '430x932']], [7, 'case-food-flow-04', 2, ['390x844', '430x932']],
  [7, 'case-food-states-08', 1, ['390x844', '430x932']],
]);
/** The surface's own top bar, in CSS px, at each text size: the review frames' 47 px safe area and the kit's bar. */
const BAR_TOP = Object.freeze({ 1: 99, 1.5: 117, 2: 141 });
/** A notice's shadow reaches past its box: the scene is measured this far clear of each notice, in CSS px. */
const NOTICE_CLEAR = 40;

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
  'case-food-flow-02': { ...FLOW, screen: 'food-partners', says: ['Choose your Partner', 'Went for food last round', 'Ask Cleo'], focus: 'sheet' },
  'case-food-flow-03': { ...FLOW, screen: 'food-room', says: ['Waiting for Cleo', 'Cancel'], focus: 'sheet' },
  'case-food-flow-04': { ...FLOW, screen: 'food-room', says: ['Hana asks you to join the Food Supply Task', 'Decline', 'Join', 'Answer within 15 s. No answer counts as a decline.'], focus: 'fs-card' },
  'case-food-flow-09': { ...FLOW, screen: 'food-room', says: ['Two players are away on the Food Supply Task'] },
  'case-food-states-14': { ...FLOW, screen: 'food-howto', says: ['How the Food Supply Task works', 'Both turn a key: +5 packages for the ship.'], focus: 'sheet' },
  'case-food-states-08': { ...FLOW, screen: 'food-room', says: ['Too late to join', 'Hana had withdrawn the request before your answer arrived.', 'You stay in Room B.', 'OK'], focus: 'fs-card' },
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

// ── The bundle: the preview's four pages, and the hosted game's own art as its build emits it ──────────────
const out = await bundlePreview({ repo: REPO, root: join(REPO, COMPONENT, 'preview'), name: 'food-component-check', pages: { index: 'index.html', port: 'port.html', both: 'both.html', compare: 'compare.html' } });
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
let togetherControl = null, togetherPictures = null, opaqueControl = null, cardStates = [];
const captures = {}, probes = {}, larger = {}, relayouts = {}, beforeAfter = {}, together = {}, opaque = {}, keys = {}, agreement = { port: { states: 0, equal: 0, identical: 0, corrected: {}, control: null }, package: {}, native: {} };
const largerPort = { states: 0, equal: 0, identical: 0, corrected: {} };
let failed = [packet.ok, port.ok, pack.ok, native.ok].filter(ok => !ok).length;
const report = async (page, violations) => {
  for (const v of violations) v.kind = await classify(out, v);
  // The browser asks for /favicon.ico by itself; the preview has none, as the live site has none.
  return page.problems().filter(p => !/\/favicon\.ico$/.test(p));
};

/**
 * A picture of a page at rest: taken again and again, REST ms apart, until two in a row are the same. For a moment
 * after a page is first drawn the browser may draw an edge that lies on a fraction of a pixel a little differently
 * (twelve pixels of one row, in one load in ten, on the port's page as on the component's; never after 150 ms). A
 * picture taken in that moment is not the page's, and no animation says so.
 */
const REST = 150;
const rest = { ms: REST, pictures: 0, retaken: 0 };
async function atRest(page, options) {
  const take = async () => Buffer.from((await page.send('Page.captureScreenshot', options)).data, 'base64');
  let last = await take();
  for (let turn = 0; turn < 12; turn += 1) {
    await sleep(REST);
    const next = await take();
    if (next.equals(last)) { rest.pictures += 1; if (turn > 0) rest.retaken += 1; return next; }
    last = next;
  }
  throw new Error('a page\'s picture never came to rest');
}
/** What is not held on a page: each animation or transition that is running, by its name or property. */
const MOVING = 'document.getAnimations().filter(a => a.playState === "running").map(a => a.transitionProperty ?? a.animationName ?? "animation")';
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
    const png = await atRest(page, { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 } });
    // A picture taken while something still moves is not one picture: it is named here, not left to the comparison.
    const moving = await page.evaluate(MOVING);
    const violations = await page.evaluate('window.__policy');
    const problems = await report(page, violations);
    if (moving.length) problems.push(`still moving when the picture was taken: ${moving.join(', ')}`);
    return { seen, expected, png, violations, problems };
  } finally { await page.close(); }
}
/** A page mounted at the Standard text whose text size then changes, told to lay out again or not: what it shows, and its picture. */
async function relaid(pageName, state, sizeKey, tell) {
  const [width, height] = SIZES[sizeKey];
  const page = await openPage(browser, { width, height, scale: 1 });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
  try {
    await page.goto(`${origin}/${pageName}.html?state=${state}&size=${sizeKey}&single=1`, 'document.readyState === "complete" && window.__food');
    await page.evaluate('window.__food.ready');
    const told = !tell ? '' : pageName === 'port' ? `document.dispatchEvent(new Event(${JSON.stringify(RELAYOUT.portEvent)}));` : 'window.__food.handle().relayout();';
    await page.evaluate(`(() => { document.documentElement.style.fontSize = '${RELAYOUT.text * 100}%'; ${told} })()`);
    await page.evaluate('new Promise(done => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done)))))');
    await page.evaluate('window.__food.freeze(300)');
    const seen = await page.evaluate('window.__food.describe()');
    const banner = await page.evaluate(`document.querySelector('.planet-food .fs-banner')?.style.top ?? null`);
    const png = await atRest(page, { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 } });
    const moving = await page.evaluate(MOVING);
    const violations = await page.evaluate('window.__policy');
    const problems = await report(page, violations);
    if (moving.length) problems.push(`still moving when the picture was taken: ${moving.join(', ')}`);
    return { seen, banner, png, violations, problems };
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
    const bytes = await atRest(page, { format: 'jpeg', quality: 76, clip: { x: 0, y: 0, width, height, scale: 1 } });
    await writeFile(join(REVIEW, file), bytes);
    return { file: `${COMPONENT}/review/${file}`, sha256: sha256(bytes) };
  } finally { await page.close(); }
}
/** One preview page on one state at two device pixels per CSS pixel, for a picture before and after: what it shows, and its PNG bytes. */
async function shot(pageName, state, sizeKey, extra = '') {
  const [width, height] = SIZES[sizeKey];
  const page = await openPage(browser, { width, height, scale: 2 });
  try {
    await page.goto(`${origin}/${pageName}.html?state=${state}&size=${sizeKey}&single=1${extra}`, 'document.readyState === "complete" && window.__food');
    await page.evaluate('window.__food.ready');
    await page.evaluate('window.__food.freeze(300)');
    const seen = await page.evaluate('window.__food.describe()');
    return { seen, png: await atRest(page, { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 } }) };
  } finally { await page.close(); }
}
/** The frozen port and the component in one page (preview/both.html), `first`'s files and stylesheets loaded first: what each shows, its picture, and the page's Food stylesheets in their order. */
async function pair(state, sizeKey, text, first, extra = '', scale = 1) {
  const [width, height] = SIZES[sizeKey], clip = { x: 0, y: 0, width, height, scale: 1 };
  const page = await openPage(browser, { width, height, scale });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
  try {
    // The two phones stand one on the other at the page's corner, each where a phone alone stands: a drawing is
    // rasterized a little differently at another place in the page. Each is brought forward for its picture.
    await page.goto(`${origin}/both.html?state=${state}&size=${sizeKey}&text=${text}&first=${first}&stack=1${extra}`, 'document.readyState === "complete" && window.__food');
    await page.evaluate('window.__food.ready');
    await page.evaluate('window.__food.freeze(300)');
    const seen = await page.evaluate('window.__food.describe()'), sheets = await page.evaluate('window.__food.sheets()'), png = {};
    for (const who of ['port', 'component']) { await page.evaluate(`window.__food.front(${JSON.stringify(who)})`); png[who] = await atRest(page, { format: 'png', clip }); }
    const moving = await page.evaluate(MOVING);
    const violations = await page.evaluate('window.__policy');
    const problems = await report(page, violations);
    if (moving.length) problems.push(`still moving when the picture was taken: ${moving.join(', ')}`);
    return { seen, sheets, png, violations, problems };
  } finally { await page.close(); }
}
/** Puts a backdrop of one loud colour directly under the page's card: its sibling, one step below it in the stacking order. It says what it put there. */
const BACKDROP = `(() => {
  const card = document.querySelector('.planet-food.ph .fs-card');
  if (!card) return null;
  const under = document.createElement('div'), z = Number(getComputedStyle(card).zIndex);
  Object.assign(under.style, { position: 'absolute', inset: '0', zIndex: String(z - 1), background: ${JSON.stringify(OPAQUE.backdrop)}, pointerEvents: 'none' });
  card.before(under);
  return { colour: getComputedStyle(under).backgroundColor, cardZ: z, z: Number(getComputedStyle(under).zIndex), sameParent: under.parentElement === card.parentElement };
})()`;
/** For the control only: fades the page's card as a whole, as the port fades a card that scrolls. */
const FADE_WHOLE = `(() => { const card = document.querySelector('.planet-food.ph .fs-card'), fade = 'linear-gradient(#000 calc(100% - 36px), transparent)'; card.style.webkitMaskImage = fade; card.style.maskImage = fade; })()`;
/** The component's page on a state with a card: its picture as it is, and again with the backdrop under the card. */
async function through(state, sizeKey, text, spoil = false) {
  const [width, height] = SIZES[sizeKey], clip = { x: 0, y: 0, width, height, scale: 1 };
  const page = await openPage(browser, { width, height, scale: 1 });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
  try {
    await page.goto(`${origin}/index.html?state=${state}&size=${sizeKey}&single=1&text=${text}`, 'document.readyState === "complete" && window.__food');
    await page.evaluate('window.__food.ready');
    await page.evaluate('window.__food.freeze(300)');
    if (spoil) await page.evaluate(FADE_WHOLE);
    const seen = await page.evaluate('window.__food.describe()');
    const plain = await atRest(page, { format: 'png', clip });
    const under = await page.evaluate(BACKDROP);
    await page.evaluate('window.__food.freeze(300)');
    const loud = await atRest(page, { format: 'png', clip });
    const still = await page.evaluate('window.__food.describe()');
    const violations = await page.evaluate('window.__policy');
    const problems = await report(page, violations);
    return { seen, plain, loud, under, unmoved: same(seen.boxes, still.boxes) && seen.html.length > 0, violations, problems };
  } finally { await page.close(); }
}
/** What the backdrop under a card shows: the pixels inside the card that changed (none, for an opaque card), those around it (the backdrop is there), and the colours of the card's foot. */
async function seenThrough(name, run) {
  const card = run.seen.layout.card, [x, y, w, h] = card.box, r = Math.ceil(card.radius), i = OPAQUE.inset;
  const files = [`${name}-plain.png`, `${name}-loud.png`];
  await writeFile(join(out, 'captures', files[0]), run.plain);
  await writeFile(join(out, 'captures', files[1]), run.loud);
  const corners = [[x, y, r, r], [x + w - r, y, r, r], [x, y + h - r, r, r], [x + w - r, y + h - r, r, r]];
  const { boxes } = await compare({ a: `/captures/${files[0]}`, b: `/captures/${files[1]}`, boxes: { inside: { box: [x + i, y + i, w - 2 * i, h - 2 * i], skip: corners },
    foot: { box: [x + i, y + h - i - OPAQUE.foot, w - 2 * i, OPAQUE.foot], skip: corners }, around: { box: grow(card.box, OPAQUE.around), skip: [grow(card.box, 2)] } } });
  const rim = await colours({ a: `/captures/${files[0]}`, box: [x + r, y + h - i - OPAQUE.rim, w - 2 * r, OPAQUE.rim] });
  for (const file of files) await rm(join(out, 'captures', file));
  return { inside: { pixels: boxes.inside.pixels, changed: boxes.inside.differing }, foot: { pixels: boxes.foot.pixels, changed: boxes.foot.differing }, around: { pixels: boxes.around.pixels, changed: boxes.around.differing },
    rim: { pixels: rim.pixels, colours: rim.colours, colour: rim.first } };
}

/** The comparisons' page (preview/compare.html), opened before the first capture: it measures two pictures box by box. */
let compare = null, colours = null;
const bottom = box => box[1] + box[3];
const grow = ([x, y, w, h], by) => [x - by, y - by, w + 2 * by, h + 2 * by];
const around = (a, b) => { const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]); return [x, y, Math.max(a[0] + a[2], b[0] + b[2]) - x, Math.max(bottom(a), bottom(b)) - y]; };

/** The scroller an outcome card's words are in, as the DOM writes it: it takes the card's whole inside, the 16 px of padding with it. */
const OUTCOME_WORDS = '<div class="fs-card-body" style="margin: -16px; padding: 16px; outline-offset: -5px;">';
/** The scroller a request card's words are in (and Too late to join's): it takes the card's inside at its top and its sides, and ends where the port's does, above the answers. */
const REQUEST_WORDS = '<div class="fs-card-body" style="margin: -16px -16px 0px; padding: 16px 16px 0px; outline-offset: -5px;">';
/** A stamp's hard shadow reaches 4 px past it to the right and below. */
const STAMP_SHADOW = 4;
/** How the root of either surface begins, as the DOM writes it. */
const ROOT = '<div class="planet-food ph"';
/**
 * One capture read against the frozen port's, with the corrections: which apply (told from the port's own page), the
 * port's DOM and boxes as the corrections leave them, where the two pictures may differ, and what each correction
 * must show on the component's page (`notes` holds what it does not). Whatever is not named here must be the port's.
 */
function corrected(s, t) {
  const applied = [], touched = [], faint = [], notes = [], must = (condition, note) => { if (!condition) notes.push(note); };
  const mine = s.layout ?? {}, port = t.layout ?? {}, boxes = structuredClone(t.boxes ?? {}), near = (a, b) => Math.abs(a - b) <= LIMITS.box;
  const scrolls = part => part.holds[0] > part.holds[1] + 1;
  let html = t.html ?? '';

  // The component's mark on the root it draws, which its corrected style rules are written under. The port's root has none.
  must(s.marked === true && t.marked === false && (s.html ?? '').startsWith(`${ROOT} data-food-component=""`), 'the component\'s root carries its mark (data-food-component), and the port\'s has none');
  html = html.replace(ROOT, `${ROOT} data-food-component=""`);

  // 1. The top bar's portraits.
  if (port.bar?.portraits.length) {
    applied.push(1);
    html = html.replace(/(<span class="pt food-portrait"[^>]* style=")width: 36px; height: 36px; /g, '$1');
    const back = (PORTRAIT.port - PORTRAIT.kit) * port.bar.portraits.length, sheet = t.boxes['.sheet']?.[0];
    must(mine.bar?.portraits.length === port.bar.portraits.length && mine.bar.portraits.every(p => p[2] === PORTRAIT.kit && p[3] === PORTRAIT.kit) && port.bar.portraits.every(p => p[2] === PORTRAIT.port && p[3] === PORTRAIT.port),
      `correction 1: the bar's portraits are ${PORTRAIT.kit} px, where the port's are ${PORTRAIT.port} px`);
    must(!!mine.bar && near(port.bar.name[0] - mine.bar.name[0], back) && mine.bar.name[1] === port.bar.name[1], `correction 1: the title sits ${back} px further back, on its line`);
    // Under a sheet's glass the change shows blurred, further around.
    touched.push(grow(port.bar.who, sheet && sheet[1] < bottom(t.boxes['.tb'][0]) ? GLASS : 1));
  } else must(!mine.bar?.portraits.length, 'a bar with no portrait in the port has none here');

  // 2. The dock with no instrument.
  if (port.slot?.empty) {
    applied.push(2);
    html = html.replace('<div class="food-instrument"></div>', '<div class="food-instrument" hidden=""></div>');
    boxes['.fs-dock'] = boxes['.fs-dock'].map(([x, y, w, h]) => [x, round2(y + SLOT_GAP), w, round2(h - SLOT_GAP)]);
    must(mine.slot?.hidden === true && same(s.boxes['.fs-dock'], s.boxes['.fs-controls']), 'correction 2: with no instrument the dock is its controls, with no slot and no gap');
  } else must(!mine.slot || !mine.slot.hidden, 'the instrument\'s slot is shown while it holds an instrument');

  // 3. The role row.
  must(!!mine.role?.shown === !!port.role?.shown, 'the role row is shown, or dropped, where the port shows or drops it');
  if (mine.role?.shown) must(mine.role.pieces.length === 2 && mine.role.pieces.every(piece => piece.lines === 1 && piece.box[0] >= mine.role.row[0] - LIMITS.box && piece.box[0] + piece.box[2] <= mine.role.row[0] + mine.role.row[2] + LIMITS.box) && /^\d+ \S/.test(mine.role.pieces[0].text),
    'correction 3: each piece of the Partner\'s label is whole, on one line and inside the row, the seat number with its name');
  if (port.role?.shown && port.role.pieces.some(piece => piece.lines > 1)) {
    applied.push(3);
    const [row] = s.boxes['.fs-role'], [was] = t.boxes['.fs-role'], [hint] = s.boxes['.fs-hint'], [hintWas] = t.boxes['.fs-hint'];
    must(same(row.slice(0, 3), was.slice(0, 3)), 'correction 3: the row is in its place');
    must(near(hint[1] - hintWas[1], row[3] - was[3]) && hint[0] === hintWas[0] && hint[2] === hintWas[2] && near(hint[3], hintWas[3]), 'correction 3: the hint follows the row, unchanged');
    boxes['.fs-role'] = s.boxes['.fs-role']; boxes['.fs-hint'] = s.boxes['.fs-hint'];
    touched.push(grow(around(around(row, was), around(hint, hintWas)), 2));
  }

  // No card is faded as a whole, which would fade its background and its edge with its words: the scene behind it
  // would show through. Only a card's words fade, inside it.
  must(!mine.card || (mine.card.fades !== 'card' && mine.card.opacity === 1 && /^rgb\(/.test(mine.card.colour)), 'no card is faded as a whole: its background and its edge stay opaque');
  // 4 and 5. A card's limit. The briefing has none: by the package's rule it never scrolls.
  if (port.card && port.card.kind !== 'briefing') {
    const fix = port.card.kind === 'outcome' ? 4 : 5, card = mine.card, was = port.card, view = s.boxes['.fs-view']?.[0];
    applied.push(fix);
    if (!card || card.kind !== was.kind) must(false, `correction ${fix}: the port's card is here too`);
    else {
      if (fix === 4) {
        // The limit as the renderer works it out: from the view's lower edge, 12 px, and the card's place 24 px under the bar.
        html = html.replace('max-height: calc(100% - var(--top) - 36px);', `max-height: max(${Math.round(bottom(view)) - Math.round(s.boxes['.tb'][0][3]) - 36}px, min(calc(100% - var(--top) - 36px), 6rem));`);
        // Its words are in a scroller inside it, which takes the card's whole inside: the port's card holds them itself.
        html = html.replace(/(<section class="fs-card" role="alertdialog"[^>]*>)([\s\S]*?)(<\/section>)/, `$1${OUTCOME_WORDS}$2</div>$3`);
        must(bottom(card.box) <= bottom(view) - 12 + LIMITS.box, 'correction 4: the outcome card ends 12 px above the view\'s lower edge, over nothing that lies under the view');
        must(!!card.words && !scrolls(card) && !was.words && same(card.words.box, card.box), 'correction 4: the outcome card\'s words are in a scroller that takes its whole inside, and the card itself does not scroll');
        // The tilted stamp is drawn past its own line box, and its shadow 4 px further: the scroller must not cut it.
        must(!!card.stamp && same(card.stamp, was.stamp) && card.stamp[0] >= card.words.box[0] && card.stamp[1] >= card.words.box[1] && card.stamp[0] + card.stamp[2] + STAMP_SHADOW <= card.words.box[0] + card.words.box[2] && bottom(card.stamp) + STAMP_SHADOW <= bottom(card.words.box),
          'correction 4: the card\'s stamp is whole, where the port draws it: its scroller does not cut it');
      } else {
        html = html.replace(/max-height: calc\(100% - var\(--top\) - (20|72)px\);/, (_, n) => `max-height: max(calc(100% - var(--top) - var(--bottom) - ${Number(n) + 16}px), min(calc(100% - var(--top) - ${n}px), 13rem));`);
        must(!!mine.pass && bottom(card.box) <= mine.pass[1] - 8 + LIMITS.box, 'correction 5: the request card ends 8 px above the Pass button, clear of the tab bar');
        must([...card.answers, ...(card.timer ? [card.timer] : [])].every(part => part[1] >= card.box[1] + 16 - LIMITS.box && bottom(part) <= bottom(card.box) - 16 + LIMITS.box), 'correction 5: the answers and the time to answer are whole, inside the card');
      }
      must(same(card.box.slice(0, 3), was.box.slice(0, 3)) && card.box[3] <= was.box[3] + LIMITS.box, `correction ${fix}: the card starts where the port's does, and is no taller`);
      // Words that scroll fade inside the card and can be reached with Tab, so that the keys scroll them; words that fit do neither.
      if (card.words) must(scrolls(card.words) ? card.fades === 'words' && card.words.tab === '0' : card.fades === null && card.words.tab === null,
        `correction ${fix}: words that scroll fade inside the card and take a place in the Tab order; words that fit do neither`);
      if (card.box[3] < was.box[3] - LIMITS.box) {
        // The limit holds the card: it is shorter than the port's, and its words scroll.
        must(scrolls(card.words ?? card), `correction ${fix}: its words scroll where they need more room than the card has`);
        boxes['.fs-card'] = s.boxes['.fs-card'];
        if (!card.words) must(false, `correction ${fix}: a card that is held by its limit has its words in a scroller`);
        // The card keeps its shadow above and its upper edge. Its words are masked for their fade, and the browser draws
        // masked words a little differently from their top down (an outcome card's scroller is its whole inside); and
        // its lower edge is higher than the port's.
        else touched.push([card.box[0] - CARD_SHADOW, card.words.box[1] - 2, card.box[2] + 2 * CARD_SHADOW, bottom(was.box) + CARD_SHADOW - card.words.box[1] + 2]);
      }
    }
  } else must(!mine.card === !port.card && mine.card?.kind === port.card?.kind, 'a card is shown where the port shows one, of its kind');
  // 7. A request card's stamp, and Too late to join's. The port's scroller for the words begins at the stamp's own line,
  // and the tilted stamp is drawn above that line and a little to its left: the scroller cuts it. Here the scroller
  // takes the card's inside at its top and its sides, and ends where the port's does.
  const requestWords = port.card?.kind === 'request' && !!port.card.words;
  if (requestWords) {
    applied.push(7);
    const card = mine.card, was = port.card;
    if (!card?.words) must(false, 'correction 7: the card\'s words are in a scroller, as the port\'s are');
    else {
      const [cx, cy, cw] = card.box, w = card.words.box, pw = was.words.box;
      must(near(w[0], cx) && near(w[1], cy) && near(w[2], cw), 'correction 7: the words\' scroller takes the card\'s inside at its top and its sides');
      // Where the card is the port's size, the scroller ends where the port's does and nothing under it moves.
      if (same(card.box, was.box)) must(near(bottom(w), bottom(pw)) && same(card.answers, was.answers) && same(card.timer, was.timer), 'correction 7: the scroller ends where the port\'s does, and the answers and the time to answer are where the port has them');
      if (was.stamp) {
        must(was.stamp[1] < pw[1] - LIMITS.box, 'correction 7: the port\'s scroller cuts the stamp, which is drawn above it');
        must(!!card.stamp && same(card.stamp, was.stamp) && card.stamp[0] >= w[0] && card.stamp[1] >= w[1] && card.stamp[0] + card.stamp[2] + STAMP_SHADOW <= w[0] + w[2] && bottom(card.stamp) + STAMP_SHADOW <= bottom(w),
          'correction 7: the stamp is whole, where the port draws it: its scroller does not cut it');
        // What differs in the picture is what the port's scroller cut: the stamp above the scroller's upper edge, and
        // the sliver of it left of the scroller's left edge. The rest of the stamp is the port's to a few levels: the
        // browser draws a tilted thing a little differently along its slanted edges when its scroller is another box.
        const [sx, sy, sw, sh] = was.stamp, cut = [[sx - 5, sy - 5, sw + 10, pw[1] + 1 - (sy - 5)], [sx - 5, sy - 5, pw[0] + 1 - (sx - 5), sh + 10]];
        touched.push(...cut);
        faint.push({ box: [sx - 5, sy - 5, sw + 10 + STAMP_SHADOW, sh + 10 + STAMP_SHADOW], skip: cut });
      } else must(!card.stamp, 'correction 7: a tight card shows no stamp, as in the port');
    }
  }
  // 6. A sheet or card that was built again. The port's is left without the focus, which goes to the page: a sheet or
  // card on the port's page with the focus outside the surface is one. Here it takes the focus back, as a new one does.
  const dialog = /<section class="(fs-card[^"]*|sheet)"/.exec(t.html ?? '')?.[1] ?? null;
  let focus = t.focus ?? null;
  if (dialog && focus === null) {
    applied.push(6);
    html = html.replace(/(<section class="(?:fs-card[^"]*|sheet)"(?:(?! tabindex=)[^>])*?)( style="|>)/, '$1 tabindex="-1"$2');
    focus = dialog;
    must(s.focus === dialog, `correction 6: the ${dialog === 'sheet' ? 'sheet' : 'card'} that was built again has the focus, where the port's left it to the page`);
  }
  // Whether a card's words scroll is each page's own matter, held above: its mark, and the place in the Tab order
  // that comes with it, are left out of the DOM's comparison.
  const unmarked = text => (text ?? '').replaceAll(' data-scrolls=""', '').replace(/(<div class="fs-card-body"[^>]*?) tabindex="0"/g, '$1');
  return { applied: applied.sort((a, b) => a - b), touched, near: faint, notes, html: requestWords ? unmarked(html).replace('<div class="fs-card-body">', REQUEST_WORDS) : unmarked(html), mine: unmarked(s.html), boxes, focus };
}
/** How many pixels of two pictures differ outside the boxes in `skip`. */
async function outside(name, a, b, size, skip) {
  const files = [`${name}-a.png`, `${name}-b.png`];
  await writeFile(join(out, 'captures', files[0]), a);
  await writeFile(join(out, 'captures', files[1]), b);
  const { boxes } = await compare({ a: `/captures/${files[0]}`, b: `/captures/${files[1]}`, boxes: { rest: { box: [0, 0, ...size], skip } } });
  for (const file of files) await rm(join(out, 'captures', file));
  return boxes.rest.differing;
}
/** How far two pictures are apart in some places, each a box with the boxes inside it to leave out: the pixels there, how many differ, and by how many levels at most. */
async function within(name, a, b, places) {
  const files = [`${name}-a.png`, `${name}-b.png`];
  await writeFile(join(out, 'captures', files[0]), a);
  await writeFile(join(out, 'captures', files[1]), b);
  const { boxes } = await compare({ a: `/captures/${files[0]}`, b: `/captures/${files[1]}`, boxes: Object.fromEntries(places.map((place, index) => [`place${index}`, place])) });
  for (const file of files) await rm(join(out, 'captures', file));
  const measured = Object.values(boxes);
  return { pixels: measured.reduce((sum, m) => sum + m.pixels, 0), differing: measured.reduce((sum, m) => sum + (m.differing ?? 0), 0), max: Math.max(0, ...measured.map(m => m.max ?? 0)) };
}
/** A capture held to the frozen port's: everything the same, read with the corrections that apply. */
async function held(name, mine, theirs, sizeKey) {
  const s = mine.seen, t = theirs.seen, c = corrected(s, t), samePicture = mine.png.equals(theirs.png);
  // Outside the places a correction touches, and the places it leaves within a few levels, no pixel may differ.
  const skip = [...c.touched, ...c.near.map(place => place.box)];
  const differing = samePicture ? 0 : skip.length ? await outside(name, mine.png, theirs.png, SIZES[sizeKey], skip) : null;
  const near = samePicture || !c.near.length ? null : await within(`${name}-near`, mine.png, theirs.png, c.near);
  // How many pixels differ at all: where the picture is held, every one of them lies in a place a correction touches.
  const changed = samePicture ? 0 : await outside(`${name}-all`, mine.png, theirs.png, SIZES[sizeKey], []);
  return { changed, near, equal: { html: c.mine === c.html, text: s.text === t.text, boxes: same(s.boxes, c.boxes), controls: same(s.controls, t.controls), covers: same(s.owned, t.owned) && same(s.measured, t.measured), gauge: s.gauge === t.gauge, focus: (s.focus ?? null) === c.focus,
      pixels: differing === 0 && (!near || near.max <= LIMITS.stampEdge) },
    // Identical: no correction applies, the picture is the port's, and so is the DOM, the root's mark aside.
    corrections: c.applied, touched: c.touched.map(box => box.map(round2)), notes: c.notes, identical: samePicture && c.applied.length === 0 && c.mine === c.html };
}
/** Counts one held capture. */
function tally(total, port) {
  total.states += 1;
  if (Object.values(port.equal).every(Boolean) && port.notes.length === 0) total.equal += 1;
  if (port.identical) total.identical += 1;
  for (const number of port.corrections) total.corrected[number] = (total.corrected[number] ?? 0) + 1;
}
/** What a correction changes, as numbers read from one page: the port's before, the component's after. */
function facts(fix, seen) {
  const l = seen.layout, first = selector => seen.boxes[selector]?.[0] ?? null;
  if (fix === 1) return { portraits: l.bar.portraits.map(p => `${p[2]} × ${p[3]}`), titleStartsAt: l.bar.name[0] };
  if (fix === 2) return { dock: first('.fs-dock'), controls: first('.fs-controls'), slot: l.slot.hidden ? 'none' : 'empty, with its gap' };
  if (fix === 3) return { rowHeight: l.role.row[3], pieces: l.role.pieces.map(piece => ({ text: piece.text, lines: piece.lines })) };
  const scrolls = part => part.holds[0] > part.holds[1] + 1;
  if (fix === 7) { const stamp = l.card.stamp, scroller = l.card.words.box; return { stamp, scrollerStartsAt: scroller[1], stampCut: stamp ? stamp[1] < scroller[1] - 0.5 || stamp[0] < scroller[0] - 0.5 : null, card: l.card.box, answers: l.card.answers, timer: l.card.timer }; }
  if (fix === 4) return { cardEndsAt: round2(bottom(l.card.box)), viewEndsAt: round2(bottom(first('.fs-view'))), nextRowStartsAt: (l.role?.shown ? l.role.row : first('.fs-hint'))[1], wordsScroll: scrolls(l.card.words ?? l.card), fades: l.card.fades };
  return { cardEndsAt: round2(bottom(l.card.box)), passStartsAt: l.pass[1], tabBarStartsAt: first('.tabs')[1], answersEndAt: round2(Math.max(...[...l.card.answers, l.card.timer].map(bottom))), wordsShown: l.card.words.holds[1], wordsNeed: l.card.words.holds[0] };
}

try {
  const first = await openPage(browser, { width: 390, height: 844 });
  await first.goto(`${origin}/index.html?single=1`, 'document.readyState === "complete" && window.__food');
  const every = await first.evaluate('window.__food.states');
  await first.close();
  const states = every.filter(state => !ONLY || ONLY.includes(state.id)), parts = PARTS.filter(part => states.some(state => state.id === part));
  const unlisted = every.map(s => s.id).filter(id => !EXPECT[id]), missing = Object.keys(EXPECT).filter(id => !every.some(s => s.id === id));
  if (unlisted.length || missing.length) { failed += 1; console.log(`FAIL the preview's states and the check's list differ: ${JSON.stringify({ unlisted, missing })}`); }
  const reader = await openPage(browser, { width: 1500, height: 1100, scale: 1 });
  await reader.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
  await reader.goto(`${origin}/compare.html`, 'document.readyState === "complete" && window.__compare');
  compare = input => reader.evaluate(`window.__compare.compare(${JSON.stringify(input)})`);
  colours = input => reader.evaluate(`window.__compare.colours(${JSON.stringify(input)})`);

  // ── Every state, at both sizes, in both motions: what it shows, and the frozen port beside it ────────────
  const kept = {}, alone = {};
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
        // The frozen port, on the same state, in the same phone, read with the corrections that apply.
        const port = await held(`${sizeKey}-${state.id}-${motion}`, mine, theirs, sizeKey), equal = port.equal;
        must(Object.values(equal).every(Boolean), `the frozen port draws the same${port.corrections.length ? `, corrections ${port.corrections.join(', ')} aside` : ''}: ${Object.entries(equal).filter(([, ok]) => !ok).map(([key]) => key).join(', ') || 'everything'}`);
        notes.push(...port.notes);
        must(theirs.problems.length === 0 && theirs.violations.every(v => v.kind !== 'unexpected'), 'the port\'s page had no problem');
        const ok = notes.length === 0;
        if (!ok) failed += 1;
        tally(agreement.port, port);
        const key = `${sizeKey}/${state.id}/${motion}`;
        captures[key] = { ok, notes, kind: state.kind, title: state.title, synthetic: state.synthetic, screen: s.screen ?? null, hidden: s.hidden, motion: s.motion ?? null, covers: s.owned, bars: s.measured,
          controls: (s.controls ?? []).map(c => ({ act: c.act, enabled: c.enabled, busy: c.busy, label: c.label, sub: c.sub })), pictures: s.pictures ?? [], focus: s.focus ?? null,
          words: lines(s.text ?? '').length, boxes: s.boxes ?? {}, htmlSha256: sha256(s.html ?? ''), pngSha256: sha256(mine.png),
          port: { equal, corrections: port.corrections, touched: port.touched, changed: port.changed, ...(port.near ? { near: port.near } : {}), htmlSha256: sha256(t.html ?? ''), pngSha256: sha256(theirs.png) },
          ...(mine.expected ? { packetExpects: mine.expected } : {}), violations: mine.violations, problems: mine.problems };
        if (PARTS.includes(state.id) && motion === 'full') {
          await writeFile(join(out, 'captures', `${state.id}-${sizeKey}-component.png`), mine.png);
          kept[`${state.id}/${sizeKey}`] = s;
        }
        // What each page draws alone, for the page that holds both.
        if (TOGETHER.states.includes(state.id) && motion === 'full') alone[`${sizeKey}/${state.id}/1`] = { component: { seen: s, png: mine.png }, port: { seen: t, png: theirs.png } };
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

  // ── Larger text: the port's own support, held to the port in the same way, with the corrections ─────────
  for (const sizeKey of Object.keys(SIZES)) {
    for (const stateId of LARGER.states.filter(id => states.some(state => state.id === id))) {
      for (const text of LARGER.texts) {
        const notes = [], must = (condition, note) => { if (!condition) notes.push(note); };
        const mine = await draw('index', stateId, sizeKey, 'full', `&text=${text}`), theirs = await draw('port', stateId, sizeKey, 'full', `&text=${text}`);
        const s = mine.seen, t = theirs.seen;
        const port = await held(`${sizeKey}-${stateId}-text${text * 100}`, mine, theirs, sizeKey), equal = port.equal;
        alone[`${sizeKey}/${stateId}/${text}`] = { component: { seen: s, png: mine.png }, port: { seen: t, png: theirs.png } };
        must(Object.values(equal).every(Boolean), `the frozen port draws the same${port.corrections.length ? `, corrections ${port.corrections.join(', ')} aside` : ''}: ${Object.entries(equal).filter(([, ok]) => !ok).map(([key]) => key).join(', ') || 'everything'}`);
        notes.push(...port.notes);
        tally(largerPort, port);
        must(s.measured.top === BAR_TOP[text], `the surface's top bar is ${BAR_TOP[text]} px at this text size`);
        must(same((s.controls ?? []).map(c => [c.act, c.enabled, c.busy, c.label, c.sub]), EXPECT[stateId].controls ?? []) && (EXPECT[stateId].says ?? []).every(words => lines(s.text ?? '').some(line => line.toLowerCase() === words.toLowerCase())), 'it shows its state\'s controls and says its words');
        must([...mine.problems, ...theirs.problems].length === 0 && [...mine.violations, ...theirs.violations].every(v => v.kind !== 'unexpected'), 'no page problem and no policy report but the known one');
        const ok = notes.length === 0, key = `${sizeKey}/${stateId}/${text * 100}%`;
        if (!ok) failed += 1;
        larger[key] = { ok, notes, rootPx: 16 * text, bars: s.measured, equal, corrections: port.corrections, touched: port.touched, changed: port.changed, ...(port.near ? { near: port.near } : {}), htmlSha256: sha256(s.html ?? ''), pngSha256: sha256(mine.png), violations: mine.violations, problems: mine.problems };
        if (LARGER.pictures[`${stateId}/${text}`]?.includes(sizeKey)) Object.assign(larger[key], await picture(stateId, sizeKey, 'full', `${sizeKey}-${stateId}-text${text * 100}.jpg`, `&text=${text}`));
        console.log(`${ok ? 'ok  ' : 'FAIL'} larger text ${sizeKey} ${stateId} at ${text * 100} %${ok ? '' : ` · ${notes.join('; ')}`}`);
      }
    }
  }

  // ── Laid out again after a text-size change: relayout() here, the app's preferences event in the port ────
  for (const sizeKey of Object.keys(SIZES)) {
    for (const [stateId, kind] of Object.entries(RELAYOUT.states).filter(([id]) => states.some(state => state.id === id))) {
      const notes = [], must = (condition, note) => { if (!condition) notes.push(note); };
      const mine = await relaid('index', stateId, sizeKey, true), theirs = await relaid('port', stateId, sizeKey, true), untold = await relaid('index', stateId, sizeKey, false);
      const fresh = await draw('index', stateId, sizeKey, 'full', `&text=${RELAYOUT.text}`);
      const s = mine.seen, t = theirs.seen, dialog = { card: 'fs-card', sheet: 'sheet' }[kind] ?? null;
      // Correction 6 applies with a card or sheet open: the port leaves its focus to the page, and is read with the
      // focus given back, so that everything else is still held to it. The focus itself is held below.
      const port = await held(`relaid-${sizeKey}-${stateId}`, mine, theirs, sizeKey), equal = port.equal;
      must(Object.values(equal).every(Boolean), `the port, on its preferences event, draws the same${dialog ? ', the focus aside' : ''}: ${Object.entries(equal).filter(([, ok]) => !ok).map(([key]) => key).join(', ') || 'everything'}`);
      notes.push(...port.notes);
      must(s.measured.top === BAR_TOP[RELAYOUT.text], `the surface's top bar is ${BAR_TOP[RELAYOUT.text]} px at this text size`);
      must([...mine.problems, ...theirs.problems, ...untold.problems, ...fresh.problems].length === 0 && [...mine.violations, ...theirs.violations, ...untold.violations].every(v => v.kind !== 'unexpected'), 'no page problem and no policy report but the known one');
      const entry = { kind, equal, corrections: port.corrections, touched: port.touched, bars: s.measured, pngSha256: sha256(mine.png), violations: mine.violations, problems: mine.problems };
      entry.asNew = { html: s.html === fresh.seen.html, pixels: mine.png.equals(fresh.png) };
      must(Object.values(entry.asNew).every(Boolean), 'it is what a new mount draws at that text size');
      if (kind === 'banner') {
        entry.banner = { told: mine.banner, port: theirs.banner, untold: untold.banner };
        must(mine.banner === `${BAR_TOP[RELAYOUT.text] + 44}px`, `the banner sits 44 px under the ${BAR_TOP[RELAYOUT.text]} px bar`);
        // The control: not told, the bar has grown and the banner is left where it was built, so the two differ.
        must(untold.seen.measured.top === BAR_TOP[RELAYOUT.text] && untold.banner === `${BAR_TOP[1] + 44}px` && untold.seen.html !== s.html && !untold.png.equals(mine.png), 'not told, the banner stays where it was built: the check can tell');
      } else {
        // The card or sheet is built again and takes the focus back, as a new one does. The port's leaves it to the page: the control.
        entry.focus = { newMount: fresh.seen.focus, notTold: untold.seen.focus, told: s.focus, port: t.focus };
        must(port.corrections.includes(6) && same(entry.focus, { newMount: dialog, notTold: dialog, told: dialog, port: null }), `correction 6: the ${kind} that is built again takes the focus back, where the port's leaves it to the page`);
      }
      const ok = notes.length === 0;
      if (!ok) failed += 1;
      relayouts[`${sizeKey}/${stateId}`] = { ok, notes, ...entry };
      console.log(`${ok ? 'ok  ' : 'FAIL'} laid out again ${sizeKey} ${stateId} at ${RELAYOUT.text * 100} %${ok ? '' : ` · ${notes.join('; ')}`}`);
    }
  }

  // ── The frozen port and the component in one page, with both their stylesheets, loaded in each order ────
  const breaks = seen => !!seen.layout.role?.shown && seen.layout.role.pieces.some(piece => piece.lines > 1);
  /** One surface in the page that holds both, against the same surface alone: everything but the focus. */
  const asAlone = async (name, sizeKey, two, who, own) => {
    const a = two.seen[who], b = own.seen, samePicture = two.png[who].equals(own.png);
    const differing = samePicture ? 0 : await outside(`${name}-${who}`, two.png[who], own.png, SIZES[sizeKey], []);
    return { html: a.html === b.html, text: a.text === b.text, boxes: same(a.boxes, b.boxes) && same(a.layout, b.layout), controls: same(a.controls, b.controls), covers: same(a.owned, b.owned) && same(a.measured, b.measured), gauge: a.gauge === b.gauge, pixels: differing === 0 };
  };
  for (const sizeKey of Object.keys(SIZES)) {
    for (const stateId of TOGETHER.states.filter(id => states.some(state => state.id === id))) {
      for (const text of TOGETHER.texts) {
        const own = alone[`${sizeKey}/${stateId}/${text}`];
        for (const first of TOGETHER.orders) {
          const notes = [], must = (condition, note) => { if (!condition) notes.push(note); };
          const two = await pair(stateId, sizeKey, text, first), name = `both-${sizeKey}-${stateId}-text${text * 100}-${first}`;
          const entry = { first, sheets: two.sheets, rootPx: 16 * text };
          must(same(two.sheets, first === 'port' ? ['port', 'component'] : ['component', 'port']), `the page holds the port's stylesheets and the component's, the ${first}'s first`);
          must(two.seen.port.marked === false && two.seen.component.marked === true, 'only the component\'s root carries the mark');
          for (const who of ['port', 'component']) {
            entry[who] = await asAlone(name, sizeKey, two, who, own[who]);
            must(Object.values(entry[who]).every(Boolean), `${who === 'port' ? 'the frozen port\'s surface' : 'the component\'s surface'} is what it is alone: ${Object.entries(entry[who]).filter(([, ok]) => !ok).map(([key]) => key).join(', ') || 'everything'}`);
          }
          // Where the role row's correction shows, it shows on the component's surface only, whichever sheets come last.
          entry.roleRow = !own.port.seen.layout.role?.shown ? 'not shown' : breaks(own.port.seen) ? 'the port breaks its label; the component does not' : 'whole on both';
          if (breaks(own.port.seen)) must(breaks(two.seen.port) && !breaks(two.seen.component) && same(two.seen.port.layout.role, own.port.seen.layout.role) && same(two.seen.component.layout.role, own.component.seen.layout.role),
            'the port\'s label is broken as it is alone, and the component\'s whole as it is alone');
          must(two.problems.length === 0 && two.violations.every(v => v.kind !== 'unexpected'), 'no page problem and no policy report but the known one');
          const ok = notes.length === 0;
          if (!ok) failed += 1;
          together[`${sizeKey}/${stateId}/${text * 100}%/${first}-first`] = { ok, notes, ...entry, pngSha256: { port: sha256(two.png.port), component: sha256(two.png.component) }, violations: two.violations, problems: two.problems };
          console.log(`${ok ? 'ok  ' : 'FAIL'} in one page, the ${first}'s sheets first: ${sizeKey} ${stateId} at ${text * 100} % · ${entry.roleRow}${ok ? '' : ` · ${notes.join('; ')}`}`);
        }
      }
    }
  }
  // The control: the component's root without its mark. Its corrected rules no longer reach it, so its role row is the port's again.
  togetherControl = { what: `the component's root without its mark, in one page with the port: ${TOGETHER.control[0]} at ${TOGETHER.control[1] * 100} % on ${TOGETHER.control[2].replace('x', ' × ')}` };
  if (states.some(state => state.id === TOGETHER.control[0])) {
    const [stateId, text, sizeKey] = TOGETHER.control, own = alone[`${sizeKey}/${stateId}/${text}`], two = await pair(stateId, sizeKey, text, 'port', '&unmark=1');
    Object.assign(togetherControl, { labelBreaks: breaks(two.seen.component), sameAsAlone: await asAlone(`both-${sizeKey}-control`, sizeKey, two, 'component', own.component), portSameAsAlone: await asAlone(`both-${sizeKey}-control`, sizeKey, two, 'port', own.port) });
    togetherControl.ok = togetherControl.labelBreaks && !togetherControl.sameAsAlone.html && !togetherControl.sameAsAlone.boxes && !togetherControl.sameAsAlone.pixels && Object.values(togetherControl.portSameAsAlone).every(Boolean);
    if (!togetherControl.ok) failed += 1;
    console.log(`${togetherControl.ok ? 'ok  ' : 'FAIL'} in one page, the component's root without its mark: its label breaks as the port's, and the check can tell`);
  }
  // Pictures for review: the two surfaces of one page side by side, the port's on the left, in each order of the sheets.
  togetherPictures = {};
  const album = await openPage(browser, { width: 1500, height: 1100, scale: 2 });
  await album.goto(`${origin}/compare.html`, 'document.readyState === "complete" && window.__compare');
  const side = async (name, a, b, labels) => {
    await writeFile(join(out, 'captures', `${name}-a.png`), a);
    await writeFile(join(out, 'captures', `${name}-b.png`), b);
    await album.evaluate(`window.__compare.compare(${JSON.stringify({ a: `/captures/${name}-a.png`, b: `/captures/${name}-b.png`, boxes: {}, scale: 2, labels })})`);
    const box = await album.evaluate('(() => { const r = document.querySelector(".preview-row").getBoundingClientRect(); return { width: Math.ceil(r.width), height: Math.ceil(r.height) }; })()');
    const { data } = await album.send('Page.captureScreenshot', { format: 'jpeg', quality: 76, captureBeyondViewport: true, clip: { x: 0, y: 0, width: box.width, height: box.height, scale: 1 } });
    const bytes = Buffer.from(data, 'base64');
    await writeFile(join(REVIEW, `${name}.jpg`), bytes);
    return { file: `${COMPONENT}/review/${name}.jpg`, sha256: sha256(bytes) };
  };
  for (const [stateId, text, sizeKey] of TOGETHER.pictures.filter(([id]) => states.some(state => state.id === id))) {
    for (const first of TOGETHER.orders) {
      const two = await pair(stateId, sizeKey, text, first, '', 2), other = first === 'port' ? 'component' : 'port';
      togetherPictures[`${sizeKey}/${stateId}/${text * 100}%/${first}-first`] = await side(`both-${sizeKey}-${stateId}-text${text * 100}-${first}-first`, two.png.port, two.png.component,
        [`One page, the ${first}'s stylesheets loaded first and the ${other}'s last: the frozen port's surface`, `The same page: the component's surface, ${FOOD_VERSION}`]);
    }
  }

  // ── Every card over what lies behind it: opaque to its edge, nothing showing through ───────────────────
  cardStates = Object.keys(EXPECT).filter(id => /^fs-card/.test(EXPECT[id].focus ?? '') && states.some(state => state.id === id));
  const wordsScroll = card => !!card.words && card.words.holds[0] > card.words.holds[1] + 1;
  const opaqueOk = (run, found) => run.under?.colour === OPAQUE.backdrop && run.under.sameParent && run.under.z === run.under.cardZ - 1 && run.unmoved
    && found.inside.pixels > 0 && found.inside.changed === 0 && found.foot.pixels > 0 && found.foot.changed === 0 && found.around.changed >= found.around.pixels / 2;
  for (const sizeKey of Object.keys(SIZES)) {
    for (const stateId of cardStates) {
      for (const text of OPAQUE.texts) {
        const notes = [], must = (condition, note) => { if (!condition) notes.push(note); };
        const run = await through(stateId, sizeKey, text), card = run.seen.layout?.card ?? null;
        let found = null;
        if (!card) must(false, 'the state shows a card');
        else {
          found = await seenThrough(`through-${sizeKey}-${stateId}-${text * 100}`, run);
          must(run.under?.colour === OPAQUE.backdrop && run.under.sameParent && run.under.z === run.under.cardZ - 1 && run.unmoved, 'the backdrop is directly under the card, and nothing moved for it');
          must(found.around.changed >= found.around.pixels / 2, 'the backdrop shows around the card: it is there');
          must(found.inside.pixels > 0 && found.inside.changed === 0, `no pixel inside the card changed with what lies behind it (${found.inside.changed} of ${found.inside.pixels} did)`);
          must(found.foot.pixels > 0 && found.foot.changed === 0, `no pixel of the card's foot, the ${OPAQUE.foot} px inside its lower edge, changed with what lies behind it (${found.foot.changed} of ${found.foot.pixels} did)`);
          // Where the words fit, nothing is drawn in the card's rim but the card: it is the card's own colour and no other.
          if (!wordsScroll(card)) must(found.rim.pixels > 0 && found.rim.colours === 1 && found.rim.colour === card.colour, `under its words the card's rim is its own colour and no other (${found.rim.colours} colours, the first ${found.rim.colour}; the card is ${card.colour})`);
          must(card.fades !== 'card' && card.opacity === 1, 'the card is not faded as a whole');
        }
        must(run.problems.length === 0 && run.violations.every(v => v.kind !== 'unexpected'), 'no page problem and no policy report but the known one');
        const ok = notes.length === 0;
        if (!ok) failed += 1;
        opaque[`${sizeKey}/${stateId}/${text * 100}%`] = { ok, notes, kind: card?.kind ?? null, rootPx: 16 * text, card: card?.box ?? null, colour: card?.colour ?? null, fades: card?.fades ?? null, wordsScroll: card ? wordsScroll(card) : false, ...(found ?? {}) };
        console.log(`${ok ? 'ok  ' : 'FAIL'} a card over what lies behind it: ${sizeKey} ${stateId} at ${text * 100} % · ${found ? `${found.inside.changed} of ${found.inside.pixels} pixels inside changed (its foot: ${found.foot.changed} of ${found.foot.pixels}), ${found.around.changed} of ${found.around.pixels} around` : 'no card'}${ok ? '' : ` · ${notes.join('; ')}`}`);
      }
    }
  }
  // The control: a card faded as a whole, as the port fades a card that scrolls. What lies behind it then shows through its foot.
  opaqueControl = { what: `a card faded as a whole, as the port fades a card that scrolls: ${OPAQUE.control[0]} at ${OPAQUE.control[1] * 100} % on ${OPAQUE.control[2].replace('x', ' × ')}` };
  if (states.some(state => state.id === OPAQUE.control[0])) {
    const [stateId, text, sizeKey] = OPAQUE.control, run = await through(stateId, sizeKey, text, true), found = await seenThrough(`through-${sizeKey}-control`, run);
    Object.assign(opaqueControl, { fades: run.seen.layout.card.fades, ...found, passes: opaqueOk(run, found) });
    opaqueControl.ok = opaqueControl.fades === 'card' && found.inside.changed > 0 && found.foot.changed > 0 && !opaqueControl.passes;
    if (!opaqueControl.ok) failed += 1;
    console.log(`${opaqueControl.ok ? 'ok  ' : 'FAIL'} a card faded as a whole does not pass: ${found.inside.changed} of ${found.inside.pixels} pixels inside changed, ${found.foot.changed} of ${found.foot.pixels} in its foot`);
  }

  // ── A card's words within reach of the keys: real key presses ──────────────────────────────────────────
  const WHERE = `(() => { const active = document.activeElement, frame = document.querySelector('.planet-food.ph'), words = frame.querySelector('.fs-card-body'), style = active ? getComputedStyle(active) : null;
    return { focus: active && frame.contains(active) ? (active.id || String(active.className) || active.tagName) : null, onWords: !!words && active === words, scrolled: words ? words.scrollTop : null, most: words ? words.scrollHeight - words.clientHeight : null,
      ring: style && active.matches(':focus-visible') ? [style.outlineStyle, style.outlineWidth, style.outlineOffset].join(' ') : null }; })()`;
  for (const sizeKey of Object.keys(SIZES)) {
    for (const stateId of KEYS.states.filter(id => states.some(state => state.id === id))) {
      for (const text of KEYS.texts) {
        const notes = [], must = (condition, note) => { if (!condition) notes.push(note); };
        const [width, height] = SIZES[sizeKey], page = await openPage(browser, { width, height, scale: 1 });
        await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
        const steps = {};
        try {
          await page.goto(`${origin}/index.html?state=${stateId}&size=${sizeKey}&single=1&text=${text}`, 'document.readyState === "complete" && window.__food');
          await page.evaluate('window.__food.ready');
          await page.send('Page.bringToFront');
          const press = async key => {
            for (const type of ['rawKeyDown', 'keyUp']) await page.send('Input.dispatchKeyEvent', { type, key, code: key, windowsVirtualKeyCode: KEYS.codes[key], nativeVirtualKeyCode: KEYS.codes[key] });
            await sleep(250);
            return page.evaluate(WHERE);
          };
          steps.start = await page.evaluate(WHERE);
          steps.tab = await press('Tab');
          steps.arrow = await press('ArrowDown');
          steps.end = await press('End');
          const violations = await page.evaluate('window.__policy'), problems = await report(page, violations);
          must(problems.length === 0 && violations.every(v => v.kind !== 'unexpected'), 'no page problem and no policy report but the known one');
        } finally { await page.close(); }
        const scrolls = (steps.start?.most ?? 0) > 1;
        must(/^fs-card( |$)/.test(steps.start?.focus ?? '') && steps.start.scrolled === 0, 'the card holds the focus, with its words at their start');
        if (scrolls) {
          must(steps.tab.onWords && /^solid 3px -5px$/.test(steps.tab.ring ?? ''), 'Tab goes from the card to its words, which show the focus ring, drawn inside them');
          must(steps.arrow.onWords && steps.arrow.scrolled > 0, 'the down arrow scrolls the words');
          must(steps.end.onWords && Math.abs(steps.end.scrolled - steps.end.most) <= 1, 'End brings the words to their last line');
        } else must(steps.tab && !steps.tab.onWords && steps.arrow.scrolled === 0, 'the words fit: Tab does not stop on them, and nothing scrolls');
        const ok = notes.length === 0;
        if (!ok) failed += 1;
        keys[`${sizeKey}/${stateId}/${text * 100}%`] = { ok, notes, rootPx: 16 * text, wordsScroll: scrolls, ...steps };
        console.log(`${ok ? 'ok  ' : 'FAIL'} a card's words and the keys: ${sizeKey} ${stateId} at ${text * 100} % · ${scrolls ? `Tab to the words, the arrow scrolls ${steps.arrow?.scrolled} px, End ${steps.end?.scrolled} of ${steps.end?.most} px` : `the words fit; Tab goes to ${steps.tab?.focus ?? 'outside the surface'}`}${ok ? '' : ` · ${notes.join('; ')}`}`);
      }
    }
  }

  // ── The corrections, before and after: the frozen port's page beside the component's ───────────────────
  for (const [fix, stateId, text, sizes] of BEFORE_AFTER.filter(([, id]) => states.some(state => state.id === id))) {
    for (const sizeKey of sizes) {
      const extra = text === 1 ? '' : `&text=${text}`, name = `fix-${fix}-${sizeKey}-${stateId}${text === 1 ? '' : `-text${text * 100}`}`;
      const before = await shot('port', stateId, sizeKey, extra), after = await shot('index', stateId, sizeKey, extra);
      const entry = { correction: fix, state: stateId, size: sizeKey, rootPx: 16 * text, ...await side(name, before.png, after.png, ['Before: the frozen port', `After: the component, ${FOOD_VERSION} (correction ${fix})`]), before: facts(fix, before.seen), after: facts(fix, after.seen) };
      // The numbers must show the correction: a picture alone is not held to anything.
      const b = entry.before, a = entry.after;
      entry.ok = { 1: () => a.portraits.every(p => p === '32 × 32') && b.portraits.every(p => p === '36 × 36') && b.titleStartsAt - a.titleStartsAt === 8,
        2: () => same(a.dock, a.controls) && b.dock[3] - a.dock[3] === SLOT_GAP && same(a.controls, b.controls),
        3: () => a.pieces.every(piece => piece.lines === 1) && b.pieces.some(piece => piece.lines > 1),
        4: () => a.cardEndsAt <= a.viewEndsAt - 12 + LIMITS.box && b.cardEndsAt > b.nextRowStartsAt && a.wordsScroll && a.fades === 'words',
        5: () => a.cardEndsAt <= a.passStartsAt - 8 + LIMITS.box && b.cardEndsAt > b.tabBarStartsAt && a.answersEndAt < a.cardEndsAt && a.wordsNeed > a.wordsShown,
        // The stamp is cut before and whole after, in the same place; a tight card shows none in either. Where the card keeps the port's size, nothing under its words moves.
        7: () => (b.stamp ? b.stampCut === true && a.stampCut === false && same(a.stamp, b.stamp) : a.stamp === null) && a.scrollerStartsAt === a.card[1] && b.scrollerStartsAt === b.card[1] + 16
          && (!same(a.card, b.card) || (same(a.answers, b.answers) && same(a.timer, b.timer))) }[fix]();
      if (!entry.ok) failed += 1;
      beforeAfter[`${fix}/${sizeKey}/${stateId}/${text * 100}%`] = entry;
      console.log(`${entry.ok ? 'ok  ' : 'FAIL'} correction ${fix}, before and after: ${sizeKey} ${stateId} at ${text * 100} % · ${JSON.stringify(b)} → ${JSON.stringify(a)}`);
    }
  }
  await album.close();

  // ── The five parts beside the package's own pages, and beside #290's native captures ─────────────────────
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
      const places = { scene: { box: first('.fs-view'), skip: notices }, topBar: { box: first('.tb') }, who: { box: mine.layout.bar.who }, role: { box: first('.fs-role') }, hint: { box: first('.fs-hint') }, dock: { box: first('.fs-dock') } };

      // The package's own page.
      {
        const notes = [], must = (condition, note) => { if (!condition) notes.push(note); };
        const a = lines(mine.text), b = lines(theirs.seen.text).filter(line => !/^Synthetic fixture/.test(line));
        const onlyComponent = a.filter(line => !b.includes(line)), onlyPackage = b.filter(line => !a.includes(line));
        must(same(onlyComponent, rule.component) && same(onlyPackage, rule.package), 'the words differ only as listed for this part');
        const shared = Object.keys(mine.boxes).filter(selector => theirs.seen.boxes[selector] && selector !== '.fs-banner');
        const delta = Object.fromEntries(shared.map(selector => [selector, mine.boxes[selector].length !== theirs.seen.boxes[selector].length ? null
          : round2(Math.max(0, ...mine.boxes[selector].flatMap((box, i) => box.map((value, k) => Math.abs(value - theirs.seen.boxes[selector][i][k])))))]));
        // The dock is a wrapper: with no instrument it is its controls, here as on the package's page (correction 2).
        const instrument = ['.fs-strip', '.fs-meter-wrap'].some(selector => mine.boxes[selector]);
        const lies = selector => delta[selector] !== null && delta[selector] <= LIMITS.box;
        must(shared.length >= 6 && shared.every(lies), 'every part lies where the package lays it, box for box, the dock too');
        must(same(Object.keys(theirs.seen.boxes).filter(selector => !mine.boxes[selector]), []), 'the package lays out nothing the component lacks');
        const portraits = { component: mine.portraits.map(box => box[2]), package: theirs.seen.portraits.map(box => box[2]) };
        must(portraits.component.length === 2 && same(portraits.component, portraits.package) && portraits.component.every(size => size === PORTRAIT.kit) && same(mine.portraits, theirs.seen.portraits), 'the top bar\'s portraits are the package\'s: 32 px, in the same places (correction 1)');
        const pixels = (await compare({ a: url('component'), b: url('package'), boxes: places })).boxes;
        if (rule.scene) must(pixels.scene.mean <= LIMITS.packageSceneMean && pixels.scene.far <= LIMITS.packageSceneFar && pixels.scene.moved3px.mean > 1, 'the scene outside the notices is the package\'s');
        if (rule.hint) must(pixels.hint.max <= LIMITS.packageGlass && pixels.hint.moved3px.mean > 1, 'the hint is the package\'s');
        if (rule.dock) must(pixels.dock.max === LIMITS.packageSame && pixels.dock.moved3px.mean > 1, 'the instrument and the control are the package\'s, pixel for pixel');
        must(pixels.role.max <= LIMITS.packageGlass && pixels.role.moved3px.mean > 1, 'the role row is the package\'s, to the glass over the app\'s own background');
        must(pixels.who.max <= LIMITS.packageBar && pixels.who.moved3px.max > 10 * LIMITS.packageBar, 'the bar\'s portraits and title are the package\'s, to the bar\'s glass over the app\'s own background (correction 1)');
        must(theirs.problems.length === 0, 'the package\'s page had no problem');
        const ok = notes.length === 0;
        if (!ok) failed += 1;
        agreement.package[`${sizeKey}/${part}`] = { ok, notes, page: pack.page.replace('<query>', pack.queries[part]), why: rule.why, words: { onlyComponent, onlyPackage }, boxes: delta, instrument, portraits, pixels,
          held: { scene: rule.scene, hint: rule.hint, dock: rule.dock }, packagePngSha256: theirs.pngSha256, problems: theirs.problems };
        console.log(`${ok ? 'ok  ' : 'FAIL'} package ${sizeKey} ${part}: boxes ${Math.max(...Object.values(delta).map(d => d ?? 99))} px; scene ${pixels.scene.differing} of ${pixels.scene.pixels} pixels differ (mean ${pixels.scene.mean}); hint ${pixels.hint.max}, role ${pixels.role.max}, dock ${pixels.dock.max}, the bar's portraits and title ${pixels.who.max} levels at most (${pixels.who.differing} of ${pixels.who.pixels} pixels; moved 3 px: ${pixels.who.moved3px.max})${ok ? '' : ` · ${notes.join('; ')}`}`);
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
  harness: 'The preview\'s phone: the review frames\' safe areas (47 px above, 34 px below) given through a preview style rule where a phone gives its own through env(); stand-ins for the ordinary app\'s header, bar and board; the app\'s own background (#060C1C) beneath; a fixed clock; each page brought to rest for its picture: every animation and transition held at 300 ms, those that start afterwards too; a picture taken while anything still runs fails; and a picture is kept only when two takes 150 ms apart are the same.',
  rest,
  limits: LIMITS,
  packet, port, package: pack, native: { ...native, files: native.files }, art,
  captures,
  agreement,
  corrections: { what: 'The corrections to the port recorded in sources.json. A capture is held to the frozen port everywhere outside the places its corrections touch (each capture\'s port.corrections and port.touched); there it is held to what the correction is for. Each is pictured before (the frozen port\'s page) and after (the component\'s), with its numbers.',
    list: CORRECTIONS, portrait: PORTRAIT, slotGap: SLOT_GAP, beforeAfter },
  largerText: { texts: LARGER.texts, states: LARGER.states, barTop: BAR_TOP, port: largerPort, drawn: larger },
  together: { what: 'The frozen port and the component in one page (preview/both.html), each in its own phone on the same state, with the port\'s stylesheets and the component\'s both loaded, in each order. Each surface is held to what it draws alone: its DOM, its text, its boxes, its controls, what it covers, and its pixels. The focus is not compared: one document has one.',
    ...TOGETHER, drawn: together, control: togetherControl, pictures: togetherPictures },
  opaque: { what: 'Every state with a card, at the three text sizes: the component\'s page pictured as it is, and again with a backdrop of one loud colour put directly under the card. Inside the card (in from its edge by `inset` px, its round corners left out) no pixel may change, and its foot (the lowest `foot` px inside its edge, where words that scroll fade) is counted by itself; around the card the backdrop must show; and where the words fit, the card\'s rim (its lowest `rim` px inside the edge, between the corners) must be the card\'s own colour and no other.',
    ...OPAQUE, states: cardStates, drawn: opaque, control: opaqueControl },
  keys: { what: 'A card\'s words and the keys, with real key presses on the component\'s page: from the card, which holds the focus, Tab goes to the words where they scroll (they show the focus ring, drawn inside them: 3 px, 5 px in), the down arrow scrolls them and End brings them to their last line. Where the words fit, Tab does not stop on them.',
    ...KEYS, drawn: keys },
  relayout: { what: 'A mount at the Standard text whose text size then changes: the component told by relayout(), the port by the app\'s preferences event, the component not told, and a new mount at that text size', ...RELAYOUT, drawn: relayouts },
  probe: probes,
};
if (!ONLY) await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
const passed = Object.values(captures).filter(c => c.ok).length, checks = Object.values(probes).flatMap(p => p.checks ?? []);
const applied = total => Object.entries(total.corrected).map(([number, count]) => `correction ${number} in ${count}`).join(', ') || 'no correction';
console.log(`pins ${packet.ok && port.ok && pack.ok && native.ok ? 'hold' : 'DO NOT HOLD'}; ${passed} of ${Object.keys(captures).length} captures passed; the frozen port draws the same, corrections aside, in ${agreement.port.equal} of ${agreement.port.states} (${agreement.port.identical} with none applying and nothing differing; ${applied(agreement.port)}); `
  + `package ${Object.values(agreement.package).filter(a => a.ok).length} of ${Object.keys(agreement.package).length}; native ${Object.values(agreement.native).filter(a => a.ok).length} of ${Object.keys(agreement.native).length}; `
  + `larger text ${Object.values(larger).filter(a => a.ok).length} of ${Object.keys(larger).length} (${applied(largerPort)}); laid out again ${Object.values(relayouts).filter(a => a.ok).length} of ${Object.keys(relayouts).length}; `
  + `in one page ${Object.values(together).filter(a => a.ok).length} of ${Object.keys(together).length}; cards opaque ${Object.values(opaque).filter(a => a.ok).length} of ${Object.keys(opaque).length}; keys ${Object.values(keys).filter(a => a.ok).length} of ${Object.keys(keys).length}; `
  + `before and after ${Object.values(beforeAfter).filter(a => a.ok).length} of ${Object.keys(beforeAfter).length}; `
  + `probe ${checks.filter(c => c.ok).length} of ${checks.length} checks; ${ONLY ? 'a partial run: no record written' : `record written to ${COMPONENT}/review/check.json`}`);
if (failed) process.exitCode = 1;
