// The private talk (design/phone-ui/components/private-talk): a runtime source the game imports as it is, so its
// module graph, its styles' scope, its inputs, its audiences and its words are checked here; its drawing, lifecycle,
// privacy and agreement with the pinned pack in a browser under the production headers by
// design/tools/private-talk-check.mjs, whose record is checked last. Its parts module has its own test
// (play-parts.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CAPSULE_DEFAULTS, CAPSULE_LAYERS, CLAIM_DEFAULTS, DECLARE_DEFAULTS, PRIVATE_TALK_VERSION, SIDES, TALK_WORDS, WAIT_DEFAULTS, checkCapsule, checkClaim, checkDeclare,
  checkWait, claimSheet, declareSheet, nextDeclareInput, talkBar, waitSheet,
} from '../../../design/phone-ui/components/private-talk/private-talk.mjs';
import { ICON_NAMES } from '../../../design/phone-ui/components/icons.mjs';
import { PACK_FRAMES, TALK_STATES } from '../../../design/phone-ui/components/private-talk/preview/states.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/private-talk';
const read = path => readFileSync(join(REPO, path), 'utf8');
const sha256 = path => createHash('sha256').update(readFileSync(join(REPO, path))).digest('hex');
const AVA = { seat: 'seat-1', name: 'Ava', character: 'c8' }, DEV = { seat: 'seat-4', name: 'Dev', character: 'c1' };

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
/** A selector list split at its top-level commas. */
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

test('the component is a runtime source: its whole graph is runtime-safe and in the hosted graph', () => {
  const files = new Map([...graph(join(REPO, COMPONENT, 'private-talk.mjs')), ...graph(join(REPO, COMPONENT, 'private-talk.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/private-talk.mjs`, `${COMPONENT}/private-talk.css`, 'design/phone-ui/components/play-parts/play-parts.mjs', 'design/phone-ui/components/play-parts/play-parts.css',
    'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css', 'apps/game/hosted/scene-drawing/phone-kit-art.mjs', 'apps/game/hosted/board-v2-drawing/capsule-scene.mjs',
    'apps/game/hosted/board-v2-drawing/capsule-figures.mjs', 'apps/game/hosted/crew-runtime.mjs', 'design/phone-ui/components/room-scene/ambient.mjs', 'design/phone-ui/components/room-scene/ambient.css']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  // Of the room scene, only its ambient (the capsule's lamps and dust); no other component: Frontend mounts each part.
  assert.deepEqual(local.filter(p => p.startsWith('design/phone-ui/components/room-scene/')).sort(), ['design/phone-ui/components/room-scene/ambient.css', 'design/phone-ui/components/room-scene/ambient.mjs']);
  assert.ok(!local.some(p => /\/(?:phone-shell|vote|card|role-stage|actions)\//.test(p)), 'no other component');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs', 'preview/states.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/private-talk-check.mjs'), /^\/\/ mothership:dev-only/);
  assert.equal(PRIVATE_TALK_VERSION, 'private-talk-0.1.0');
});

test('its styles reach nothing outside the component: every rule is under its root, weighs two classes, and its colours are the pack\'s', () => {
  const css = read(`${COMPONENT}/private-talk.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /^\s*@import url\("\.\.\/kit\/kit\.css"\);\s*@import url\("\.\.\/play-parts\/play-parts\.css"\);\s*@import url\("\.\.\/room-scene\/ambient\.css"\);/, 'it starts from the kit, the parts and the ambient');
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)], [], 'no motion of its own: the ambient is the room scene\'s');
  const selectors = [...css.matchAll(/([^{}]+)\{/g)].map(m => m[1].trim()).filter(s => s && !s.startsWith('@'));
  assert.ok(selectors.length >= 15, `found the rules (${selectors.length})`);
  for (const list of selectors) {
    for (const selector of split(list)) {
      assert.match(selector, /^\.ms-private-talk(?:\.ms-kit|\.ms-pt-capsule)?(?:\[[^\]]+\]|:focus)?(?:\s|$)/, `"${selector}" is under the component's root`);
      assert.ok((selector.match(/\.[\w-]+/g) ?? []).length >= 2, `"${selector}": two classes, so it outranks the kit and the parts in any order`);
      // The one universal selector: the ambient's own Reduce motion rule, as ambient.css writes it for the room scene.
      if (/\*/.test(selector)) assert.equal(selector, '.ms-private-talk.ms-pt-capsule[data-motion="reduced"] .amb *');
      for (const part of selector.split(/\s+|>|\+|~/).slice(1).filter(Boolean)) {
        assert.match(part, /^(?:\.ms-(?:pt|k|pp)-|\[hidden\]$|svg$|\.amb$|\*$)/, `"${selector}": "${part}" is a class (or the art's own svg)`);
      }
      if (/\.ms-(?:k|pp)-/.test(selector)) assert.match(selector, /\.ms-pt-[\w-]+[^,]*\.ms-(?:k|pp)-/, `"${selector}": a kit control or a part placed only inside the component's own parts`);
    }
  }
  assert.deepEqual([...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))], [], 'no kit token or other component\'s property is declared');
  // The colours the kit has no token for are the pack's own: the side cards' navy, the scene's black, the tags' glass.
  const pack = read('design/phone-ui/prototype/kit.css') + read('design/phone-ui/prototype/screens.css');
  for (const colour of css.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi) ?? []) assert.ok(pack.includes(colour), `${colour} is the pack's`);
  assert.match(css, /\.ms-private-talk\.ms-pt-capsule\[data-motion="reduced"\] \.amb \* \{ animation-play-state: paused; \}/, 'the game\'s Reduce motion stills the ambient');
});

test('the pack it is drawn from stays pinned: ui.mjs, kit.css, icons.mjs and art.mjs are unchanged for the frozen Food release', () => {
  const inventory = JSON.parse(read('docs/integration/food-consumer-source-2026-11-13.json'));
  const pins = new Map();
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, entry] of Object.entries(value)) {
      if (key.startsWith('design/phone-ui/prototype/') && entry?.sha256) pins.set(key, entry.sha256);
      walk(entry);
    }
  };
  walk(inventory);
  for (const path of ['design/phone-ui/prototype/ui.mjs', 'design/phone-ui/prototype/kit.css', 'design/phone-ui/prototype/icons.mjs', 'design/phone-ui/prototype/art.mjs']) {
    assert.ok(pins.has(path), `${path} is pinned`);
    assert.equal(sha256(path), pins.get(path), `${path} is as the Food release pinned it`);
  }
  // The frames compared are sheet 25's, as the sheets' catalog names them.
  const catalog = read('design/phone-ui/sheets/catalog.mjs');
  for (const { frame } of Object.values(PACK_FRAMES)) assert.ok(catalog.includes(frame), `${frame} is a frame of the catalog`);
});

test('its words are the pack\'s (screens-more.mjs talk()), and the few the Lead\'s D1–D3 add, each recorded in the interface', () => {
  const pack = ['design/phone-ui/prototype/screens-more.mjs', 'design/phone-ui/prototype/ui.mjs', 'design/phone-ui/sheets/catalog.mjs'].map(read).join('\n');
  const W = TALK_WORDS;
  for (const w of [W.declare, W.asked('Ava'), W.askedSub, W.sidesLabel, W.notForRole, W.any, W.seesClaim('Ava'), W.claims('Dev', 'Blue'), W.onlyPartner('Ava'),
    W.bar.declare, W.bar.claim, W.bar.talk, W.title]) assert.ok(pack.includes(w), `"${w}" is the pack's`);
  // The two lines the pack composes from the side's word, as it composes them.
  assert.ok(pack.includes('`Your role declares its own side: ${word(allowed[0])}. Only you see this.`'));
  assert.equal(W.own('Blue'), 'Your role declares its own side: Blue. Only you see this.');
  assert.ok(pack.includes('`Declare ${word(chosen)}`'));
  assert.equal(W.declareSide('Blue'), 'Declare Blue');
  assert.ok(ICON_NAMES.includes('declare') && ICON_NAMES.includes('lock'), 'the footer\'s and the lock\'s icons are the game\'s');
  // Added by the Lead's decisions, recorded in the interface: D1 (the wait), D2 (the initiator's claim), D3 (no
  // declaration); the shell's stale words, as Actions'.
  const doc = read('docs/design/components/private-talk.md');
  // Before a choice the footer reads the pack's own phrase, from its line under who asked.
  assert.ok(W.askedSub.startsWith(`${W.declareNone}.`) && doc.includes(`"${W.declareNone}"`), 'the footer before a choice is the pack\'s phrase, recorded');
  for (const w of [W.claimOf('Dev'), W.onlyYou, W.noSide, W.choosing('Dev'), W.noSidePartner('Ava')]) {
    assert.ok(!pack.includes(w), `"${w}" is not the pack's`);
    assert.ok(doc.includes(`"${w}"`), `"${w}" is recorded in the interface`);
  }
  assert.equal(W.stale, 'Controls return when the match is current', 'the same words as Actions\' while reconnecting');
  // With no side declared, only who sees it (the Lead, 16 November 2026): the pack's own "Only you see this".
  assert.ok(pack.includes(W.noSideYou) || read('design/phone-ui/prototype/screens-game.mjs').includes(`'${W.noSideYou}'`), `"${W.noSideYou}" is the pack's`);
  assert.equal(W.noSidePartner('Ava'), 'Only Ava sees this');
});

test('inputs: checked and normalized, an error for anything unknown; this viewer\'s dropped when concealed or for a new viewer', () => {
  const once = checkDeclare({ viewer: 'seat-4', partner: AVA, declarer: DEV, sides: ['Blue'], selected: 'Blue' });
  assert.equal(once.viewer, 4, 'the viewer\'s seat, as a number');
  assert.deepEqual([once.partner.seat, once.declarer.seat], [1, 4]);
  assert.deepEqual(checkDeclare(once), once, 'checking a checked input changes nothing');
  assert.deepEqual(Object.keys(DECLARE_DEFAULTS), ['viewer', 'status', 'interactive', 'reducedMotion', 'versions', 'partner', 'declarer', 'sides', 'selected']);
  assert.deepEqual(Object.keys(CLAIM_DEFAULTS), ['viewer', 'status', 'interactive', 'reducedMotion', 'versions', 'view', 'partner', 'declarer', 'claim']);
  assert.deepEqual(Object.keys(WAIT_DEFAULTS), ['viewer', 'status', 'interactive', 'reducedMotion', 'versions', 'partner', 'declarer']);
  assert.deepEqual(Object.keys(CAPSULE_DEFAULTS), ['viewer', 'status', 'interactive', 'reducedMotion', 'versions', 'pair', 'size', 'covered', 'clock']);
  for (const [what, fn] of [
    ['an unknown key', () => checkDeclare({ colour: 'red' })], ['a side that is not one', () => checkDeclare({ sides: ['Green'] })], ['no side, as a side', () => checkDeclare({ sides: [null] })],
    ['a side twice', () => checkDeclare({ sides: ['Red', 'Red'] })], ['a choice not offered', () => checkDeclare({ sides: ['Blue'], selected: 'Alien' })],
    ['one person as both', () => checkWait({ partner: DEV, declarer: DEV })], ['a view that is not one', () => checkClaim({ view: 'all' })],
    ['a claim that is not a side', () => checkClaim({ claim: 'blue' })], ['a pair of three', () => checkCapsule({ pair: [AVA, DEV, AVA] })],
    ['a pair of one person twice', () => checkCapsule({ pair: [AVA, AVA] })], ['a stage without a size', () => checkCapsule({ size: { width: 390, height: 0 } })],
    ['a clock without now', () => checkCapsule({ clock: {} })], ['a status that is not one', () => checkClaim({ status: 'away' })],
    ['a covered band below 0', () => checkCapsule({ covered: -1 })], ['a covered band that is not a number', () => checkCapsule({ covered: '128' })],
  ]) assert.throws(fn, TypeError, what);
  // Concealed, and for a new viewer, this viewer's inputs go; the phone's stay.
  const concealed = nextDeclareInput(once, { status: 'concealed' });
  assert.deepEqual([concealed.partner, concealed.declarer, concealed.sides, concealed.selected], [null, null, [], null]);
  const moved = nextDeclareInput(once, { viewer: 'seat-7' });
  assert.deepEqual([moved.viewer, moved.partner, moved.declarer, moved.sides, moved.selected], [7, null, null, [], null]);
  const handed = nextDeclareInput(once, { viewer: 4 });
  assert.deepEqual(handed, once, 'the same viewer, written another way, keeps everything');
  assert.deepEqual(checkCapsule({ viewer: 1, pair: [{ ...AVA, health: 'Injured', location: 'Hospital' }, DEV] }).pair[0], { seat: 1, name: 'Ava', character: 'c8', health: 'Injured', location: 'Hospital', jailed: false });
});

test('the shell\'s frames and words: the sheets, the pair bar, and the capsule\'s pictures', () => {
  assert.deepEqual(declareSheet({ selected: null }), { id: 'talk-declare', title: 'Declare your side', close: false, actions: [{ id: 'declare', label: 'Declare a side', icon: 'declare', kind: 'primary', busy: false, enabled: false }] });
  assert.deepEqual(declareSheet({ selected: 'Alien' }).actions[0], { id: 'declare', label: 'Declare Alien', icon: 'declare', kind: 'primary', busy: false, enabled: true });
  assert.deepEqual(declareSheet({ selected: 'Blue', phase: 'sending' }).actions[0], { id: 'declare', label: 'Declare Blue', icon: 'declare', kind: 'primary', busy: true, enabled: true });
  assert.equal(claimSheet({ view: 'declarer', partner: AVA, declarer: DEV }).title, 'Ava sees your claim');
  assert.equal(claimSheet({ view: 'initiator', partner: AVA, declarer: DEV }).title, 'Dev’s claim');
  assert.deepEqual(claimSheet({ view: 'initiator', partner: AVA, declarer: DEV }).actions, [], 'no footer');
  assert.deepEqual(waitSheet(), { id: 'talk-wait', title: 'Private talk', close: false, actions: [] });
  assert.deepEqual(talkBar({ phase: 'claim', pair: [AVA, DEV], remainingMs: 4200, round: 3 }), {
    kind: 'pair', pair: [{ seat: 1, name: 'Ava', character: 'c8' }, { seat: 4, name: 'Dev', character: 'c1' }], sub: 'Private talk · claim', round: 3, promises: { count: 0 }, menu: {}, timer: { remainingMs: 4200 } });
  assert.equal(talkBar({ phase: 'talk', pair: [AVA, DEV] }).timer, undefined, 'no time, no clock');
  assert.throws(() => talkBar({ phase: 'talk', pair: [AVA, AVA] }), TypeError);
  assert.deepEqual(SIDES, ['Blue', 'Red', 'Alien'], 'the contract\'s factions, in the cards\' order');
  // The capsule's pictures are the board-v2-art bundle's properties, as the room-drawing release names them.
  const manifest = JSON.parse(read('design/room-drawing/assets/manifest.json'));
  const properties = manifest.assets.map(a => a.replaces?.cssVariable).filter(Boolean);
  for (const { property } of CAPSULE_LAYERS) assert.ok(properties.includes(property), `${property} is a release picture's property`);
  assert.deepEqual(CAPSULE_LAYERS.map(l => [l.id, l.z]), [['back', 0], ['door', 100], ['busy', 3000]], 'the pack\'s stacking (art.mjs paintCapsule())');
});

test('the preview\'s states: every sheet 25 frame and the undrawn ones, on the pack\'s fixtures', () => {
  const keys = Object.keys(TALK_STATES);
  assert.equal(keys.length, 24);
  for (const key of Object.keys(PACK_FRAMES)) assert.ok(keys.includes(key), `${key} is a state`);
  for (const [key, s] of Object.entries(TALK_STATES)) {
    if (s.part?.kind === 'declare') assert.doesNotThrow(() => checkDeclare({ viewer: s.viewer, ...s.part.input }), key);
    if (s.part?.kind === 'claim') assert.doesNotThrow(() => checkClaim({ viewer: s.viewer, ...s.part.input }), key);
    if (s.part?.kind === 'capsule') assert.doesNotThrow(() => checkCapsule({ viewer: s.viewer, ...s.part.input }), key);
  }
  // The audiences in the fixtures: declare on the declarer's phone, the wait on the partner's, the claim on the phone its view names.
  for (const s of Object.values(TALK_STATES)) {
    if (s.part?.kind === 'declare') assert.equal(s.viewer, 4);
    if (s.part?.kind === 'wait') assert.equal(s.viewer, 1);
    if (s.part?.kind === 'claim') assert.equal(s.viewer, s.part.input.view === 'declarer' ? 4 : 1);
  }
});

test('the check\'s record: every capture, the probe and the agreement passed, on clean committed source, under the production headers', () => {
  const path = `${COMPONENT}/review/check.json`;
  assert.ok(existsSync(join(REPO, path)), 'the check has been recorded');
  const record = JSON.parse(read(path));
  assert.equal(record.tool, 'design/tools/private-talk-check.mjs');
  assert.equal(record.sourceClean, true, 'recorded on committed source');
  assert.match(record.sourceCommit, /^[0-9a-f]{40}$/);
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 42, 'every state at both phone sizes, the small phone\'s and the Largest text\'s at 320 × 568');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.mismatched, [], `${key}: nothing differs from what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.equal(sha256(c.file), c.sha256, `${key}: ${c.file} is the capture the record names`);
  }
  for (const size of ['390x844', '430x932']) assert.deepEqual(record.captures[`${size}/concealed`].leaked, [], `${size}: concealed, no private word in the page`);
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  assert.deepEqual(record.probe.full.checks.map(c => c.id), ['declare', 'refused', 'claim', 'wait', 'capsule', 'covered', 'audience', 'private', 'leaks', 'inputs', 'focus', 'text', 'dispose', 'motion']);
  assert.deepEqual(record.probe['device-reduced'].checks.map(c => c.id), ['motion'], 'with the device\'s Reduce motion, the motion check');
  // The Lead's five privacy points, as the probe saw them.
  const full = Object.fromEntries(record.probe.full.checks.map(c => [c.id, c.detail]));
  assert.deepEqual(full.leaks.hits, [], 'no side or claim in an attribute');
  assert.deepEqual(full.leaks.console, [], 'nor in the console');
  assert.deepEqual(full.leaks.onLayout, [], 'nor in onLayout');
  assert.deepEqual(full.private.lockWords, {}, '"Not for your role" only on the declarer\'s phone');
  // The capsule's tags clear the talk's buttons at the Largest text on 320 × 568, and stay put at the Standard text.
  assert.ok(full.covered.largest.clear && full.covered.largest.band > 0, 'at 200 % on 320 × 568 both tags clear the covered band');
  assert.ok(full.covered.unchangedAtStandard, 'at the Standard text the tags stay where the pack has them');
  const agree = record.agree;
  assert.ok(agree.ok, 'the agreement with the pack');
  assert.deepEqual(agree.problems, [], 'agreement: no page problem');
  assert.equal(agree.checks.length, 4, 'sheet 25\'s four frames');
  for (const c of agree.checks) assert.ok(c.ok && c.detail.differences.length === 0, `${c.id} agrees with the pack`);
});
