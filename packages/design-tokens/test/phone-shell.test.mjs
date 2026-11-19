// The phone shell component (design/phone-ui/components/phone-shell): a runtime source the game imports as
// it is, so its module graph, its styles' scope, its inputs, its privacy rules and its words are checked
// here; its drawing, lifecycle and agreement with the pinned pack in a browser under the production
// headers by design/tools/phone-shell-check.mjs, whose record is checked last.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PHONE_SHELL_DEFAULTS, PHONE_SHELL_VERSION, HERO_WORDS, RECONNECTING, OUT, BANNER_KINDS, TOAST_MS, GAME_TABS, TALK_BUTTONS,
  checkBar, checkTabs, clockText, nextPhoneShellInput, seatNumber,
} from '../../../design/phone-ui/components/phone-shell/phone-shell.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/phone-shell';
const read = path => readFileSync(join(REPO, path), 'utf8');
const sha256 = path => createHash('sha256').update(readFileSync(join(REPO, path))).digest('hex');

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

const SELF = 4;
const turn = (extra = {}) => ({ kind: 'turn', who: { seat: SELF, name: 'Dev', character: 'c1' }, self: true, round: 3, timer: { remainingMs: 42000 }, promises: { count: 1 }, menu: {}, ...extra });
const live = (extra = {}) => nextPhoneShellInput(PHONE_SHELL_DEFAULTS, {
  viewer: SELF, bar: turn(), tabs: { variant: 'game', me: { seat: SELF, name: 'Dev', character: 'c1' }, hero: { mode: 'pass' } }, target: { title: 'Rescue' }, chip: { id: 'other', label: 'Other rooms · 1' },
  sheet: { id: 'pass', title: 'Pass your turn?', actions: [{ id: 'pass', label: 'Pass', kind: 'primary' }] }, toast: { id: 't', text: 'Turn passed' }, ...extra,
});

test('the component is a runtime source: its whole graph is runtime-safe and in the hosted graph', () => {
  const files = new Map([...graph(join(REPO, COMPONENT, 'phone-shell.mjs')), ...graph(join(REPO, COMPONENT, 'phone-shell.css'))]);
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/phone-shell.mjs`, `${COMPONENT}/phone-shell.css`, 'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css',
    'design/phone-ui/components/icons.mjs', 'apps/game/hosted/crew-runtime.mjs']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  assert.ok(!local.some(p => p.includes('/room-scene/')), 'the shell does not depend on the room scene: Frontend mounts that in the stage');
  // The preview and its probes are development-only, and say so.
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs', 'preview/phase-cases.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/phone-shell-check.mjs'), /^\/\/ mothership:dev-only/);
});

test('its styles reach nothing outside the shell: every rule is scoped under .ms-phone-shell', () => {
  const css = read(`${COMPONENT}/phone-shell.css`).replace(/\/\*[\s\S]*?\*\//g, '');
  const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]);
  assert.ok(keyframes.every(name => name.startsWith('ms-ps-')), `keyframes are the shell's own: ${keyframes}`);
  // Every selector list before a block, outside @keyframes bodies and at-rule preludes.
  const body = css.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const selectors = [...body.matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(s => s && !s.startsWith('@'));
  assert.ok(selectors.length > 100, `found the rules (${selectors.length})`);
  /** A selector list's selectors: its commas outside any parentheses (:is(), :not(), :has()). */
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
      assert.match(selector, /^\.ms-phone-shell(?:[\s.:\[]|$)/, `"${selector}" is scoped`);
    }
  }
  // Nor does anything reach into the stage (the room scene's) or a sheet's body (its content's): no
  // universal selector, no bare element outside the shell's own parts, nothing under those two.
  for (const list of selectors) {
    for (const selector of split(list)) {
      assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
      assert.doesNotMatch(selector, /\.ms-ps-(?:stage|cover|sheet-body)[\s>+~]/, `"${selector}": nothing inside the stage, its cover or a sheet's body`);
      assert.doesNotMatch(selector, /^\.ms-phone-shell(?:\[[^\]]*\])?\s+(?::is\()?(?:button|div|span|b|p|h2|svg|nav|header|section)\b/, `"${selector}": no bare element straight under the shell`);
      // The kit's controls are styled only inside the shell's own parts, never another component's.
      if (/\.ms-k-/.test(selector)) assert.match(selector, /\.ms-ps-[\w-]+[^,]*\.ms-k-/, `"${selector}": a kit control styled only inside the shell's own parts`);
    }
  }
  // Custom properties are the shell's own, besides --ic-knock, which the shared icons read, and the kit toast's top
  // (kit 0.8.0), which the shell sets to its overlays' place.
  const declared = [...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))];
  assert.deepEqual(declared.filter(p => !p.startsWith('--ms-ps-') && p !== '--ic-knock' && p !== '--p' && p !== '--ms-k-toast-top'), []);
  // The cover's reach is public (0.2.3): the shell places its cover by the two lengths a part in the cover reads.
  assert.match(css, /\.ms-phone-shell \.ms-ps-cover \{[^}]*top: var\(--ms-ps-cover-top\);[^}]*bottom: var\(--ms-ps-cover-bottom\);/);
  assert.match(css, /\.ms-phone-shell\[data-edge\] \{ --ms-ps-cover-top: 0px; --ms-ps-cover-bottom: 0px; \}/);
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
});

test('its words are the pack\'s: the hero, the tabs, the bar and the two banners', () => {
  const ui = read('design/phone-ui/prototype/ui.mjs');
  for (const words of Object.values(HERO_WORDS)) {
    assert.ok(ui.includes(`'${words.aria}'`), `the hero's "${words.aria}" is ui.mjs's`);
    assert.ok(ui.includes(`'${words.label}'`), `the hero's "${words.label}" is ui.mjs's`);
  }
  for (const words of ['Show the whole board', 'Show my room', 'Your turn', 'Private talk', 'Match status', 'Settings', "'Promises'"]) assert.ok(ui.includes(words), words);
  const game = read('design/phone-ui/prototype/screens-game.mjs');
  for (const words of [RECONNECTING.title, RECONNECTING.sub, `'${RECONNECTING.action}'`]) assert.ok(game.includes(words), `sheet 45: ${words}`);
  // An eliminated player's banner (0.2.8): sheet 44's Eliminated frame, with the pack's eliminated icon and no action.
  assert.ok(read('design/phone-ui/prototype/screens-more.mjs').includes(`banner({ icon: 'eliminated', title: '${OUT.title}', sub: '${OUT.sub}' })`), 'sheet 44: the eliminated player\'s banner');
  assert.deepEqual(BANNER_KINDS, ['reconnecting', 'out']);
  assert.ok(read('design/phone-ui/prototype/screens-more.mjs').includes("'My card'"), 'sheet 25: My card');
  // 0.3.0, the owner's 18 November 2026 decision: Card is the last tab, after Panels. The pack's sheet 08 draws it
  // before Panels, and the pinned pack stays as it is.
  assert.deepEqual(GAME_TABS, ['switch', 'actions', 'hero', 'panels', 'card'], 'the owner\'s tab order: Card last');
  assert.match(read('design/phone-ui/prototype/ui.mjs'), /tab\('card', 'card', 'Card'\),\s*tab\('panels', 'panels', 'Panels'\)/, 'the pack draws Card before Panels');
  assert.deepEqual(TALK_BUTTONS, ['promises', 'my-card']);
  assert.equal(PHONE_SHELL_VERSION, 'phone-shell-0.3.4');
  assert.ok(TOAST_MS > 0);
});

test('the clock shows what it is given: m:ss of the whole seconds left, rounded up', () => {
  assert.equal(clockText(42000), '0:42');
  assert.equal(clockText(41001), '0:42');
  assert.equal(clockText(999), '0:01');
  assert.equal(clockText(0), '0:00');
  assert.equal(clockText(125000), '2:05');
  assert.equal(seatNumber({ seat: 'seat-4' }), 4);
  assert.equal(seatNumber({ seat: 7 }), 7);
  assert.equal(seatNumber({ seat: 'seat-4', number: 9 }), 9);
});

test('inputs are checked, and refused with a reason', () => {
  const refuses = (input, pattern) => assert.throws(() => nextPhoneShellInput(PHONE_SHELL_DEFAULTS, input), pattern);
  refuses({ status: 'offline' }, /Status is live, stale, concealed/);
  // 0.2.12: a target bar's Cancel is there unless the choice is final (`cancel: false`), and the flag is a boolean.
  refuses({ target: { title: 'Position A3 fixed', cancel: 'no' } }, /target.cancel is true or false/);
  assert.equal(nextPhoneShellInput(PHONE_SHELL_DEFAULTS, { target: { title: 'Rescue' } }).target.cancel, true);
  assert.equal(nextPhoneShellInput(PHONE_SHELL_DEFAULTS, { target: { title: 'Position A3 fixed', cancel: false } }).target.cancel, false);
  refuses({ bar: { kind: 'hero' } }, /A bar's kind is turn, phase, pair/);
  refuses({ bar: { kind: 'turn' } }, /who is \{ seat, name, character \}/);
  refuses({ bar: { kind: 'turn', who: { seat: 4 } } }, /needs a name/);
  refuses({ bar: { kind: 'pair', pair: [{ seat: 1, name: 'Ava' }] } }, /names the two people talking/);
  refuses({ bar: { kind: 'phase', title: 'Jail vote', timer: { remainingMs: -1 } } }, /time left in milliseconds/);
  refuses({ bar: { kind: 'phase', title: 'Jail vote', timer: { remainingMs: 3000, ring: 2 } } }, /ring is 0…1/);
  refuses({ bar: { kind: 'phase', title: 'x', round: 2.5 } }, /round is a whole number/);
  refuses({ tabs: { variant: 'menu' } }, /variant is game or talk/);
  refuses({ tabs: { variant: 'game', open: 'promises' } }, /An open tab is one of switch, actions, panels, card/);
  // 0.3.0: the viewer's own person, as the bar's who.
  refuses({ tabs: { variant: 'game', me: { seat: 4 } } }, /tabs\.me needs a name/);
  refuses({ tabs: { variant: 'game', me: { name: 'Dev' } } }, /tabs\.me needs a seat/);
  refuses({ tabs: { variant: 'talk', open: 'panels' } }, /An open tab is one of promises, my-card/);
  refuses({ tabs: { hero: { mode: 'cancel' } } }, /hero's mode is pass, vote, voted/);
  refuses({ banner: { kind: 'error' } }, /kind: 'reconnecting'/);
  assert.deepEqual(nextPhoneShellInput(PHONE_SHELL_DEFAULTS, { banner: { kind: 'out', busy: true } }).banner, { kind: 'out' }, 'an eliminated player\'s banner has no Retry to be busy');
  refuses({ toast: { id: 'x' } }, /A toast needs its text/);
  refuses({ chip: { id: 'x' } }, /A chip needs a label/);
  refuses({ sheet: { title: 'Pass' } }, /A sheet is \{ id, title/);
  refuses({ insets: { top: '47px' } }, /insets are null/);
  refuses({ edge: 'yes' }, /edge is true or false/);
  refuses({ backdrop: 'paper' }, /backdrop is scene or canvas/);
  refuses({ sheet: { id: 'card', title: 'Your role', head: [{ id: 'hide' }] } }, /sheet\.head\[0\] is \{ id, icon, label \}/);
  refuses({ sheet: { id: 'card', title: 'x', head: [{ id: 'a', icon: 'hide', label: 'A' }], actions: [{ id: 'a', label: 'A' }] } }, /each need their own id/);
  // Defaults: a live, interactive phase bar, no tab bar, nothing over the stage.
  const d = nextPhoneShellInput(PHONE_SHELL_DEFAULTS, {});
  assert.equal(d.status, 'live');
  assert.equal(d.interactive, true);
  assert.equal(d.bar.kind, 'phase');
  assert.equal(d.tabs, null);
  assert.equal(d.shape, 'none');
  assert.equal(d.edge, false, 'the stage between the bars unless edge is asked for');
  assert.equal(d.backdrop, 'scene', 'the room view\'s space behind the bars unless the canvas is asked for');
  // 0.3.0: the viewer's own person for the Card tab, checked as the bar's who. None is the card icon; the private
  // talk's two buttons take none.
  assert.deepEqual(checkTabs({ variant: 'game', me: { seat: 4, name: 'Dev', character: 'c1' } }).me, { seat: 4, number: null, name: 'Dev', character: 'c1' });
  assert.equal(checkTabs({ variant: 'game' }).me, null, 'no person: the card icon');
  assert.equal(checkTabs({ variant: 'game', me: { seat: 4, name: 'Player 4' } }).me.character, null, 'a person with no character: the card icon');
  assert.equal(checkTabs({ variant: 'talk', me: { seat: 4, name: 'Dev', character: 'c1' } }).me, null, 'the private talk\'s My card keeps its icon');
  // The checked forms are stable: checking them again changes nothing.
  const once = live();
  assert.deepEqual(nextPhoneShellInput(once, {}), once);
  assert.deepEqual(checkBar(once.bar), once.bar);
  assert.deepEqual(checkTabs(once.tabs), once.tabs);
  // An unavailable hero by default, as the pack's 'pass-off'.
  assert.deepEqual(checkTabs({ variant: 'game' }).hero, { mode: 'pass', enabled: false, busy: false, reason: null });
});

test('this viewer\'s inputs are dropped while concealed, and when the viewer changes unless the update gives the new viewer\'s', () => {
  const shown = live();
  assert.ok(shown.tabs && shown.target && shown.chip && shown.sheet && shown.toast && shown.bar.promises);
  const hidden = nextPhoneShellInput(shown, { status: 'concealed' });
  for (const key of ['tabs', 'target', 'chip', 'sheet', 'toast']) assert.equal(hidden[key], null, `${key} dropped while concealed`);
  assert.equal(hidden.bar.promises, null, 'the Promises count dropped while concealed');
  assert.equal(hidden.bar.who.name, 'Dev', 'the public bar is kept (and not drawn)');
  assert.equal(hidden.shape, 'game', 'the tab bar keeps its shape, so nothing moves');
  // Shown again, nothing of this viewer's comes back by itself.
  const again = nextPhoneShellInput(hidden, { status: 'live' });
  for (const key of ['tabs', 'target', 'chip', 'sheet', 'toast']) assert.equal(again[key], null, `${key} not restored`);
  // Offers given while concealed are refused too.
  assert.equal(nextPhoneShellInput(hidden, { tabs: { variant: 'game' }, sheet: { id: 's', title: 'x' } }).tabs, null);
  // A new viewer.
  const other = nextPhoneShellInput(shown, { viewer: 5 });
  for (const key of ['tabs', 'target', 'chip', 'sheet', 'toast']) assert.equal(other[key], null, `${key} dropped for a new viewer`);
  assert.equal(other.bar.promises, null);
  const given = nextPhoneShellInput(shown, { viewer: 5, tabs: { variant: 'game', hero: { mode: 'vote' } }, bar: turn({ promises: { count: 2 } }) });
  assert.equal(given.tabs.hero.mode, 'vote');
  assert.equal(given.bar.promises.count, 2);
  assert.equal(given.sheet, null);
  // The same viewer again drops nothing.
  assert.ok(nextPhoneShellInput(shown, { viewer: SELF }).tabs);
  // An eliminated player's banner is this viewer's own (0.2.8); the reconnecting banner is the phone's.
  const out = live({ banner: { kind: 'out' } });
  assert.equal(nextPhoneShellInput(out, { status: 'concealed' }).banner, null, 'out dropped while concealed');
  assert.equal(nextPhoneShellInput(nextPhoneShellInput(out, { status: 'concealed' }), { status: 'live' }).banner, null, 'and not restored');
  assert.equal(nextPhoneShellInput(out, { viewer: 5 }).banner, null, 'out dropped for a new viewer');
  assert.deepEqual(nextPhoneShellInput(out, { viewer: 5, banner: { kind: 'out' } }).banner, { kind: 'out' }, 'unless the update gives the new viewer\'s');
  assert.deepEqual(nextPhoneShellInput(out, { viewer: SELF }).banner, { kind: 'out' }, 'the same viewer keeps it');
  const stale = live({ status: 'stale', banner: { kind: 'reconnecting', busy: true } });
  assert.deepEqual(nextPhoneShellInput(stale, { viewer: 5 }).banner, { kind: 'reconnecting', busy: true }, 'a new viewer keeps the phone\'s reconnecting banner');
});

test('the check\'s record: every capture, probe check and agreement case passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/phone-shell-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /img-src 'self' data:/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 73, 'thirty-four states at two sizes, the target bar at the Largest text on both, and the Largest text at 320 × 568 for a turn, for a phase and for a long-titled sheet');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
  }
  // 0.3.0, the owner's 18 November 2026 decision: Card is the last tab and draws this viewer's own crew portrait; with
  // no character, the pack's card icon. The tab keeps its word and takes no other name. 0.3.1, the owner the same
  // day: the portrait as the top bar draws it, at its 32 px, with a ring only while its sheet is open, in amber.
  for (const [key, c] of captures) {
    if (!c.order?.length) continue;
    assert.deepEqual(c.order, ['switch', 'actions', 'hero', 'panels', 'card'], `${key}: Card is the last tab`);
    assert.ok(c.card.words === 'Card' && c.card.name === null && c.card.icon === 'card' && c.card.level, `${key}: the Card tab's word, and its label level with the others`);
    if (c.card.picture) assert.ok(c.card.drawn && c.card.box[0] === 32 && c.card.box[1] === 32, `${key}: the portrait drawn at the top bar's 32 px`);
    assert.equal(c.card.picture ? c.card.amber : false, c.open === 'card' && c.card.picture, `${key}: an amber ring only while Card is open`);
    if (c.card.picture) assert.equal(c.card.ring, c.card.amber, `${key}: no ring of another colour, and none at rest`);
  }
  for (const size of ['390x844', '430x932']) {
    assert.ok(record.captures[`${size}/own`].card.picture && record.captures[`${size}/card`].card.amber, `${size}: the portrait, and its amber ring with Card open`);
    assert.ok(!record.captures[`${size}/card-icon`].card.picture, `${size}: no character, no portrait`);
    assert.equal(record.captures[`${size}/card-icon`].tiles.find(t => t.tab === 'card').form, 'card:tile', `${size}: no character, the card's tile`);
    assert.equal(record.captures[`${size}/concealed`].order.length, 0, `${size}: concealed, no tab and no portrait`);
  }
  assert.ok(record.captures['320x568/large'].card.picture, 'the portrait at the Largest text on the small phone');
  // 0.3.2, the owner's 18 November 2026 decision: every game tab's icon is a painted tile in the portrait's 32 px box,
  // and the round button's icon is painted. Wherever the game's tabs are drawn, each tab draws a tile or the portrait.
  for (const [key, c] of captures) {
    if (!c.order.length) { assert.deepEqual(c.tiles, [], `${key}: no tabs, no tile`); continue; }
    assert.deepEqual(c.tiles.map(t => t.tab), ['switch', 'actions', 'panels', 'card'], `${key}: the four tabs`);
    for (const t of c.tiles) {
      assert.deepEqual(t.box, [32, 32], `${key} ${t.tab}: a picture in the portrait's box`);
      if (t.tab !== 'card') assert.ok(t.tile && t.drawn && /^(board|room|actions|panels):tile$/.test(t.form), `${key} ${t.tab}: a painted tile`);
      else assert.equal(t.tile, !c.card.picture, `${key}: the Card tab draws the portrait or the card's tile, never both and never neither`);
      if (t.tile) assert.equal(t.ring, c.open === t.tab, `${key} ${t.tab}: the ring lies over the open tab's tile and no other`);
    }
    assert.match(c.heroIcon, /^(pass|vote):painted$/, `${key}: the round button's icon is painted`);
    assert.equal(c.heroGrey, c.heroOff, `${key}: grey only while the round button is unavailable`);
  }
  for (const size of ['390x844', '430x932']) {
    const dark = record.captures[`${size}/dark`], out = record.captures[`${size}/out`];
    assert.ok(!dark.card.picture && dark.tiles.every(t => t.tile), `${size}: in the dark no portrait, four tiles`);
    assert.ok(out.tiles.find(t => t.tab === 'actions').faded && !out.tiles.find(t => t.tab === 'panels').faded, `${size}: eliminated, the Actions tile faded with its tab`);
  }
  // 0.2.9: while reconnecting, the target bar 8 px under the banner with its Cancel in reach; at 200 %, Cancel under
  // the bar's words, the bar inside the phone and the chip's label whole.
  for (const size of ['390x844', '430x932']) {
    const stale = record.captures[`${size}/target-stale`].over, large = record.captures[`${size}/target-large`];
    assert.ok(stale.targetTop >= stale.bannerBottom + 8 && stale.cancelReach, `${size}: the target bar under the banner, Cancel in reach`);
    assert.ok(large.over.cancelTop >= large.over.wordsBottom && large.over.targetRight <= large.layout.size.width && large.over.chipWhole, `${size}: at 200 %, Cancel under the words and the chip whole`);
  }
  // 0.2.10, the phase bars (phase-bars.mjs): the pack's words for each row of the words table; the clock amber only
  // where someone may act; Promises and ⋮ where the pack's bar has them; and the bar's height the same under every one.
  const WORDS = {
    before: ['Before turns', 'Officer block · Blackhole', '0:12', false], 'before-start': ['Before turns', 'Turns start at 0:00', '0:09', true],
    block: ['Block a move', 'Before turns · Officer', '0:11', false], appointment: ['New Officer', 'Ben chooses', '0:09', false],
    appoint: ['Appoint Officer', 'Random if time runs out', '0:22', false], lit: ['Blackout', 'Lights out in 0:03', '0:13', false],
    'lit-next': ['Blackout', 'Lights out in 0:02', '0:12', false], dark: ['Blackout', 'Dark · positions fixed', '0:08', true],
    synchronized: ['Ship synchronized', null, '0:04', false], poster: ['Setting course', 'The offices are setting it', '0:11', false],
    'course-own': ['Setting course', 'Captain · private', '0:09', true], moved: ['The ship moved', 'Round 3 complete', null, false],
    loading: ['Loading the ship', 'Room 3 of 5', null, false], stale: ['Reconnecting…', 'Showing Round 3 as last seen', null, false],
  };
  for (const size of ['390x844', '430x932']) {
    for (const [state, [name, sub, timer, urgent]] of Object.entries(WORDS)) {
      const c = record.captures[`${size}/${state}`];
      assert.deepEqual([c.kind, c.name, c.sub, c.timer, c.urgent], ['phase', name, sub, timer, urgent], `${size} ${state}: the pack's words, and amber only where someone may act`);
      assert.equal(c.bar.box[3], record.captures[`${size}/own`].bar.box[3], `${size} ${state}: the bar as tall as a turn's`);
    }
    const sync = record.captures[`${size}/synchronized`], loading = record.captures[`${size}/loading`];
    assert.ok(sync.ring && sync.promises === null && sync.menu, `${size}: Ship synchronized, a ring, ⋮ and no Promises`);
    assert.ok(loading.round === null && loading.promises === null && !loading.menu, `${size}: Loading the ship, no round, Promises or ⋮`);
    assert.equal(record.captures[`${size}/dark`].tone, 'dark', `${size}: the dark bar`);
    assert.equal(record.captures[`${size}/closed`].toast, 'That phase closed · choices cleared', `${size}: the toast of a closed phase`);
    // The lit Blackout a second apart: the left part is built again for the new line, and nothing else moves.
    assert.ok(record.steady[size].ok, `${size}: the bar and its right side keep their boxes from 0:03 to 0:02`);
    for (const part of ['box', 'promises', 'round', 'timer', 'menu']) assert.deepEqual(record.steady[size].lit[part], record.steady[size].next[part], `${size}: ${part}`);
  }
  const largePhase = record.captures['320x568/phase-large'];
  assert.ok(largePhase.name === 'Appoint Officer' && largePhase.bar.nameLines === 2 && largePhase.bar.nameWhole && largePhase.bar.right <= 320, 'at the Largest text a phase\'s title is whole, on two lines, inside the phone');
  for (const size of ['390x844', '430x932']) {
    assert.deepEqual(record.captures[`${size}/own`].layout.bars, size === '390x844' ? { top: 99, bottom: 92 } : { top: 99, bottom: 92 }, `${size}: the pack's bars`);
    assert.equal(record.captures[`${size}/concealed`].buttons, 0, `${size}: concealed, no control`);
    assert.equal(record.captures[`${size}/concealed`].name, null, `${size}: concealed, no name`);
    assert.equal(record.captures[`${size}/concealed`].layout.stage.height, record.captures[`${size}/own`].layout.stage.height, `${size}: concealed, the stage keeps its size`);
    for (const state of ['film', 'poster']) {
      const { layout } = record.captures[`${size}/${state}`];
      assert.deepEqual(layout.bars, { top: 0, bottom: 0 }, `${size} ${state}: edge to edge`);
      assert.equal(layout.stage.height, layout.size.height, `${size} ${state}: the stage the shell's whole height`);
      assert.deepEqual(layout.safe, { top: 47, bottom: 34 }, `${size} ${state}: the safe areas reported`);
    }
    assert.equal(record.captures[`${size}/film`].bannerTop, 47 + 52 + 8, `${size}: no bar, the banner at the bar's place`);
    assert.equal(record.captures[`${size}/poster`].kind, 'phase', `${size}: the poster under a bar`);
    assert.equal(record.captures[`${size}/card`].head, 'Hide card', `${size}: the Card sheet's head action`);
    assert.equal(record.captures[`${size}/result`].cover, 1, `${size}: the result's window in the cover`);
    assert.equal(record.captures[`${size}/out`].bannerKind, 'out', `${size}: an eliminated player's banner`);
    assert.equal(record.captures[`${size}/out`].bannerButtons, 0, `${size}: an eliminated player's banner has no Retry`);
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; the agreement with the pack.
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = record.probe.full.checks.map(c => c.id.split(':')[0]);
  for (const group of ['focus', 'refused', 'stale', 'out', 'private', 'time', 'layout', 'layers', 'large', 'textsize', 'nobar', 'edge', 'reach', 'backdrop', 'head', 'footer', 'talk', 'toast', 'words', 'hud', 'card', 'tiles', 'place', 'squeeze', 'stack', 'observers', 'title', 'dispose', 'motion']) assert.ok(groups.includes(group), `probe group ${group}`);
  // 0.3.0: the Card tab's own check, with what it saw: the portrait is the top bar's, and at every size keeps its box.
  const cardTab = record.probe.full.checks.find(c => c.id.startsWith('card:')).detail;
  assert.equal(cardTab.rest.image, cardTab.rest.barImage, 'the Card tab\'s portrait is the plain one the top bar draws');
  // 0.3.1: the top bar's shape and size too: the same box, fitted the same way, with no ring at rest.
  assert.deepEqual([cardTab.rest.box, cardTab.rest.fit, cardTab.rest.ring], [cardTab.rest.barBox, cardTab.rest.barFit, null], 'the top bar\'s box and fit, and no ring at rest');
  assert.equal(cardTab.open.ring, cardTab.open.accent, 'open, the ring is the accent');
  assert.deepEqual(Object.keys(cardTab.sized), ['390 standard', '390 largest', '430 standard', '430 largest', '320 standard', '320 largest']);
  for (const [key, f] of Object.entries(cardTab.sized)) {
    assert.deepEqual(f.box, [32, 32], `${key}: the portrait's box`);
    assert.equal(f.barHeight, f.barHeightWithIcon, `${key}: the bar as tall as with the card icon`);
  }
  // 0.3.2: the tiles' own check, with what it saw.
  const tiles = record.probe.full.checks.find(c => c.id.startsWith('tiles:')).detail;
  for (const key of ['switch', 'actions', 'panels']) {
    assert.ok(tiles.rest[key].tile && tiles.rest[key].frame, `${key}: a tile in the portrait's own frame`);
    assert.deepEqual([tiles.rest[key].box, tiles.rest[key].top], [tiles.restPortrait.box, tiles.restPortrait.top], `${key}: the portrait's box and level`);
    assert.equal(tiles.rest[key].ground, '#F19E5A,#EE8B3A,#82522F', `${key}: the one ground`);
    assert.equal(tiles.rest[key].ring, null, `${key}: no ring at rest`);
  }
  assert.deepEqual([tiles.openActions.actions.ring, tiles.openActions.panels.ring, tiles.openPanels.panels.ring, tiles.openPanels.actions.ring], [tiles.accent, null, tiles.accent, null], 'the ring follows the open tab');
  assert.ok(tiles.sameForAnotherViewer && tiles.sameWithNoPerson, 'a tile is the same drawing for another viewer and with no person given');
  assert.deepEqual([tiles.dark.portraits, tiles.dark.card.form], [0, 'card:tile'], 'with no person (the Blackout\'s dark): no portrait, the card\'s tile');
  assert.equal(tiles.off.opacity, '0.38', 'an unavailable tab at the pack\'s 38 %');
  assert.deepEqual([tiles.heroReady.form, tiles.heroOff.filter, tiles.heroVote.form], ['pass:painted', 'grayscale(1)', 'vote:painted'], 'the round button\'s icon painted, grey when unavailable');
  assert.deepEqual([tiles.concealed, tiles.talk.tiles, tiles.talk.line], [0, 0, 2], 'concealed, nothing; the private talk keeps its line icons');
  // 0.3.3, the Lead Designer's three proposals, approved by the owner on 18 November 2026.
  // The toast's place: never on the bar, a banner or an open sheet's head.
  for (const size of ['390x844', '430x932']) {
    const overSheet = record.captures[`${size}/toast-sheet`].toastPlace, underBanner = record.captures[`${size}/toast-banner`].toastPlace, alone = record.captures[`${size}/closed`].toastPlace;
    assert.ok(overSheet.under && Math.abs(overSheet.toast - (overSheet.headBottom + 8)) < 1, `${size}: the toast 8 px under a tall sheet's head`);
    assert.ok(underBanner.under && Math.abs(underBanner.toast - (underBanner.bannerBottom + 8)) < 1, `${size}: the toast 8 px under the banner`);
    assert.ok(!alone.under && alone.toast < overSheet.toast, `${size}: with nothing in its way the toast keeps its place`);
    const offer = record.captures[`${size}/offer`].sheetFit;
    assert.deepEqual([offer.follows, offer.stacked, offer.cut], [false, false, 0], `${size}: a sheet with room for its body is as before`);
  }
  const squeezedSheet = record.captures['320x568/offer-large'].sheetFit;
  assert.ok(squeezedSheet.follows && squeezedSheet.stacked && squeezedSheet.cut === 0 && squeezedSheet.room >= squeezedSheet.height - squeezedSheet.head - 14, 'the small phone at the Largest text: the head stacked, the footer following, nothing cut');
  const place = record.probe.full.checks.find(c => c.id.startsWith('place:')).detail;
  for (const key of ['390', '430', '320']) {
    const o = place[key];
    assert.ok(Math.abs(o.overTall.toast.top - (o.overTall.head.bottom + 8)) < 0.75 && o.overTall.head.top < o.alone.toast.bottom, `${key}: under a tall sheet's head, where its own place would have cut the head`);
    assert.ok(Math.abs(o.underBanner.toast.top - (o.underBanner.banner.bottom + 8)) < 0.75 && Math.abs(o.both.toast.top - (o.both.head.bottom + 8)) < 0.75, `${key}: under the banner; with both, under the head`);
    assert.ok(!o.overLow.under && !o.back.under && o.gone.toast === null, `${key}: a low sheet leaves it; gone, nothing is left set`);
  }
  // A squeezed sheet: the wrapper scrolls, the footer follows the body, and a part inside the body scrolls into view.
  const squeeze = record.probe.full.checks.find(c => c.id.startsWith('squeeze:')).detail;
  assert.deepEqual([squeeze.squeezed.follows, squeeze.squeezed.wrapDisplay, squeeze.squeezed.wrapOverflow, squeeze.squeezed.footInWrap, squeeze.squeezed.sameBody], [true, 'flex', 'auto', true, true]);
  assert.deepEqual([squeeze.intoView.wrapScrolled, squeeze.intoView.bodyScrolled, squeeze.intoView.seen, squeeze.end.inside, squeeze.tapped], [true, 0, true, true, ['accept']], 'scrollIntoView reaches the wrapper; the last button is reached; a tap is reported');
  for (const f of [squeeze.relaxed, squeeze.roomy['390'], squeeze.roomy['430']]) assert.deepEqual([f.follows, f.wrapDisplay, f.bodyOverflow, f.footAtFoot], [false, 'contents', 'auto', true], 'with room, the body scrolls and the footer is at the sheet\'s foot');
  // A stacked head: decided from hidden copies, measured only on a change, the focus kept.
  const stack = record.probe.full.checks.find(c => c.id.startsWith('stack:')).detail;
  assert.ok(stack.stacked.stacked && stack.stacked.lines === 2 && stack.stacked.sameRow && stack.stacked.titleUnder && stack.stacked.titleFull, 'stacked: the buttons on a row, the title under them on the full width');
  assert.deepEqual([stack.stacked.copies, stack.stacked.stands, stack.stacked.headings, stack.stacked.order], [0, 0, 1, ['sheet-back', 'title', 'sheet-close']], 'no copy is left, and the reading order is unchanged');
  assert.deepEqual([stack.quiet.measures, stack.quiet.flips, stack.quiet.focused], [0, 0, true], 'six clock ticks: nothing measured, nothing moved, the focus kept');
  assert.deepEqual([stack.short.measures, stack.short.flips, stack.short.stacked, stack.again.measures, stack.again.stacked, stack.again.focused], [1, 1, false, 1, true, true], 'a new title is measured once');
  assert.ok(!stack.wide.stacked && stack.wide.lines >= 3 && stack.wide.height < stack.stacked.height + 4, 'at 390 px at the Largest text the title takes three lines, and the head stays a row: stacked it would be no shorter');
  assert.ok(!stack.standard390.stacked && !stack.standard430.stacked && !stack.standard320.stacked && !stack.bare.stacked, 'at the Standard text, and with no button, nothing stacks');
  const observers = record.probe.full.checks.find(c => c.id.startsWith('observers:')).detail;
  assert.deepEqual([observers.closed.sheet, observers.closed.head, observers.closed.toast, observers.closed.stray, observers.replaced.old, observers.after], [false, false, false, 0, false, 0], 'a sheet, its head and a toast that go are no longer watched; after dispose nothing is');
  // 0.2.10: the lit Blackout counting down in one mounted shell, then dark: its words and clock change and nothing moves.
  const words = record.probe.full.checks.find(c => c.id.startsWith('words:')).detail;
  assert.deepEqual(words.subs, ['Lights out in 0:03', 'Lights out in 0:02', 'Lights out in 0:01', 'Dark · positions fixed']);
  assert.ok(words.steady && words.rebuilt && words.reported === 0, 'the bar keeps its height and its right side; no layout is reported');
  // 0.3.4: a sheet's title takes the focus by script only, draws no ring and moves nothing; a sheet that goes with the
  // focus on its title hands it back once, with no control named.
  const title = record.probe.full.checks.find(c => c.id.startsWith('title:')).detail;
  assert.deepEqual([title.focused.active, title.focused.tabindex, title.focused.tabIndex, title.focused.outline, title.focused.shadow, title.inOrder], [true, '-1', -1, 'none', 'none', false]);
  assert.deepEqual(title.before, title.after, 'the focus moves nothing');
  assert.deepEqual([title.kept, title.replaced.onRoot, title.replaced.reported, title.replaced.report, title.replaced.nextTabindex, title.onNext], [true, true, 1, null, '-1', true]);
  assert.match(read('design/phone-ui/components/phone-shell/phone-shell.css'), /\.ms-ps-sheet-title h2:focus \{ outline: none; \}/);
  assert.ok(record.agree.ok && record.agree.checks.length >= 29 && record.agree.checks.every(c => c.ok && c.detail.differences.length === 0), 'the shell agrees with the pinned pack');
  // The phase bars too (0.2.10): the pack's own bar for each game step beside what phase-bars.mjs returns for it, and
  // the Blackout's dark on the pack's own specimen.
  for (const id of ['words-before', 'words-before-start', 'words-block', 'words-appointment', 'words-appoint', 'large-words-appoint', 'words-lit', 'dark', 'words-synchronized', 'large-words-synchronized',
    'words-synchronized-44', 'words-course', 'words-course-captain', 'words-course-officer', 'words-moved', 'words-loading', 'words-reconnecting']) {
    assert.ok(record.agree.checks.some(c => (c.id === `agree: ${id}` || c.id.startsWith(`agree: ${id} at`)) && c.ok), `agreement case ${id}`);
  }
  assert.equal(record.agree.checks.find(c => c.id === 'agree: dark').detail.parts.sub.words, 'Dark · positions fixed', 'the dark case compares the pack\'s words');
  // Both banners too (0.2.8): the reconnecting one with Retry, and an eliminated player's, also at the Largest text.
  for (const id of ['banner-stale', 'banner-out', 'large-banner-out']) assert.ok(record.agree.checks.some(c => c.id.startsWith(`agree: ${id}`) && c.ok), `agreement case ${id}`);
  // Its docked sheet too (0.2.5): the head with Back, the title and its line, Close, and the footer's buttons and kinds.
  for (const id of ['sheet-code', 'sheet-abort', 'large-sheet-code']) assert.ok(record.agree.checks.some(c => c.id.startsWith(`agree: ${id}`) && c.ok), `agreement case ${id}`);
  assert.deepEqual(record.agree.problems, [], 'agreement: no page problem');
});
