// Promises (design/phone-ui/components/promises): a runtime source the game imports as it is, so its module graph, its
// styles' scope, its inputs, the sheet it gives the shell, the pair's privacy and its words are checked here; its
// drawing and lifecycle in a browser under the production headers by design/tools/promises-check.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PROMISES_DEFAULTS, PROMISES_SHEET_ID, PROMISES_VERSION, PROMISE_KINDS, PROMISE_STATUSES, PROMISE_WORDS, nextPromisesInput, promisesSheet,
} from '../../../design/phone-ui/components/promises/promises.mjs';
import { PlanetPromiseKindSchema, PlanetPromiseStatusSchema } from '../../contracts/dist/index.js';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/promises';
const read = path => readFileSync(join(REPO, path), 'utf8');

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
function split(list) {
  const out = [''];
  let depth = 0;
  for (const ch of list) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) out.push(''); else out[out.length - 1] += ch;
  }
  return out.map(s => s.trim());
}
function selectors(path) {
  const css = read(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '').replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  return [...css.matchAll(/(^|[{}])([^{}]*?)\{/g)].map(m => m[2].trim()).filter(s => s && !s.startsWith('@')).flatMap(split);
}

const AVA = { seat: 1, name: 'Ava', character: 'c8' }, DEV = { seat: 4, name: 'Dev', character: 'c1' }, BEN = { seat: 2, name: 'Ben', character: 'c4' };
const TERMS = 'Ava votes for Dev in every ballot of the specified next Captain election in which Dev is a candidate, including runoffs (agreed in Round 3).';
const incoming = (extra = {}) => ({ id: 'p1', kind: 'CAPTAIN_SUPPORT', giver: AVA, recipient: DEV, state: 'offered', terms: TERMS, ...extra });
const offered = (extra = {}) => ({ id: 'p2', kind: 'MEET_A', giver: DEV, recipient: AVA, state: 'offered', ...extra });
const live = (extra = {}) => nextPromisesInput(PROMISES_DEFAULTS, { viewer: 4, talk: AVA, offer: { enabled: true }, targets: [BEN], ...extra });

test('the component is a runtime source: its whole graph is runtime-safe, and it sends nothing', () => {
  const files = new Map(['promises.mjs', 'promises.css'].flatMap(f => [...graph(join(REPO, COMPONENT, f))]));
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview|pregame-films)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  const own = graph(join(REPO, COMPONENT, 'promises.mjs')).get(join(REPO, COMPONENT, 'promises.mjs'));
  assert.deepEqual(own, ['../kit/kit.mjs'], 'the kit only (0.6.0\'s tile, facts and paper card): no local copies, and the sheet\'s frame is the shell\'s');
  const source = read(`${COMPONENT}/promises.mjs`).replace(/^\s*\/\/.*$/gm, '').replace(/^\s*\*.*$/gm, '');
  assert.doesNotMatch(source, /fetch\(|navigator|localStorage|Date\.now|setInterval|setTimeout|console\./, 'it sends, stores, counts and logs nothing');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/promises-check.mjs'), /mothership:dev-only/);
});

test('its styles reach nothing outside its root, and restyle no kit part beyond what sheet 33 sets on this screen', () => {
  const file = `${COMPONENT}/promises.css`;
  const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  const list = selectors(file);
  assert.ok(list.length >= 9, `found the rules (${list.length})`);
  for (const selector of list) {
    assert.match(selector, /^\.ms-promises(?:[\s.:[]|$)/, `"${selector}" is scoped`);
    assert.doesNotMatch(selector, /\*(?!=)/, `"${selector}": no universal selector`);
    assert.doesNotMatch(selector, /\.ms-(?:phone-shell|ps-|role-stage|rst-|char-select|cs-|display-settings|settings-sheet|ds-|host-controls|hc-|panels|pn-|pp-|room-scene)/, `"${selector}" reaches no other component`);
    // A kit part is only hidden with the component's own, or laid out as sheet 33's inline styles set the kinds.
    if (/\.ms-k-/.test(selector)) assert.match(selector, /^\.ms-promises (?::is\(|\.ms-pr-kinds > \.ms-k-tile$)/, `"${selector}": a kit part only hidden, or the kinds' tiles`);
  }
  assert.deepEqual([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]), [], 'no motion of its own');
  assert.match(read(file), /^@import url\("\.\.\/kit\/kit\.css"\);/, 'it starts from the kit\'s stylesheet');
  assert.deepEqual([...new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]))].filter(p => p !== '--ic-knock'), [], 'no custom properties of its own');
  // The kit's parts, not copies: no tile, facts list or paper card of its own.
  assert.doesNotMatch(read(`${COMPONENT}/promises.mjs`), /class(?:Name)?\s*=|'ms-pr-tile|'ms-pr-fact|'ms-pr-comic/, 'no local tile, facts or paper card');
});

test('its words are the pack\'s (sheets 33 and 33.1); the six kinds are the contract\'s', () => {
  const more = read('design/phone-ui/prototype/screens-more.mjs');
  const W = PROMISE_WORDS;
  for (const words of [W.title, W.quota, W.quotaValue(false, false), W.talking('Ava'), W.offer, W.offerLine, W.offered('Ava'), W.waiting('Ava'), W.offeredTo('Ava'), W.offeredPill,
    W.kindsTitle('Ava'), W.kindsNote('Ava'), W.next, W.confirmTitle, W.back, W.offerAction, W.usesGiven('Ava'), W.onlyPair('Ava'), W.incomingTitle('Ava'), W.usesReceived, W.neverForced,
    W.decline, W.accept, W.received, W.given, W.noReceived, W.noGiven, W.notProof]) {
    assert.ok(more.includes(`'${words}'`), `screens-more.mjs: ${words}`);
  }
  for (const [kind, k] of Object.entries(PROMISE_KINDS)) assert.ok(more.includes(`['${k.icon}', '${k.name}', '${k.line}']`), `the pack's ${kind}: ${k.name}`);
  assert.equal(W.quotaValue(true, false), 'Given 1/1 · Received 0/1');
  // A name and its time keep ordinary spaces: joining them split long names and added a line (owner, 18 November).
  assert.equal(W.from('Ava', 'next Captain election'), 'From Ava · next Captain election');
  assert.equal(W.to('Ava', 'Round 3 voting'), 'To Ava · Round 3 voting');
  // A seat keeps its "·" on its line, a no-break space before it (the Lead's polish, approved by the owner on 18 November).
  assert.equal(W.seat(2, 'Ben'), '2\u00a0· Ben');
  assert.equal(W.seat(6, 'Player\u00a06'), '6\u00a0· Player\u00a06', 'a name is drawn as given, its own joins included');
  assert.deepEqual(Object.keys(PROMISE_KINDS), PlanetPromiseKindSchema.options, 'the contract\'s six kinds, in its order');
  assert.deepEqual(PROMISE_STATUSES, PlanetPromiseStatusSchema.options, 'the contract\'s four results');
  // The words that state a rule for one Promise are Frontend's (the Lead's answer 3): no terms, condition, when or why here.
  const source = read(`${COMPONENT}/promises.mjs`);
  for (const words of ['votes for', 'will be in Room', 'when Round', 'Condition not met`', 'including runoffs', 'after Sync', 'admission is not required']) assert.ok(!source.includes(words), `no rule words of its own: ${words}`);
  assert.equal(W.targetTitle, 'Who will you vote to jail?', 'Jail Vote\'s player: the Lead\'s words (answer 4)');
  assert.equal(PROMISES_VERSION, 'promises-0.1.1');
});

test('its inputs are checked, and refused with a reason', () => {
  const refuses = (input, pattern) => assert.throws(() => nextPromisesInput(PROMISES_DEFAULTS, { viewer: 4, ...input }), pattern);
  refuses({ view: 'results' }, /view is list, kinds, target, confirm, incoming/);
  refuses({ status: 'offline' }, /Status is live, stale, concealed/);
  refuses({ talk: { seat: 1 } }, /talk is \{ seat, name, character \}/);
  refuses({ offer: 'yes' }, /offer is \{ enabled, busy, reason \}/);
  refuses({ received: incoming({ kind: 'MEET_C' }) }, /kind is CAPTAIN_SUPPORT/);
  refuses({ received: incoming({ state: 'declined' }) }, /state is offered or accepted/);
  refuses({ received: incoming({ state: 'accepted', status: 'Kept' }) }, /status is Pending, Fulfilled/);
  refuses({ received: incoming({ terms: 5 }) }, /exact terms is words/);
  refuses({ received: incoming({ giver: DEV }) }, /between two players/);
  refuses({ draft: { kind: 'JAIL_VOTE', target: 7 }, targets: [BEN] }, /one of the given targets/);
  refuses({ targets: [BEN, BEN] }, /Seat 2 is given twice/);
  refuses({ error: { text: 'x' } }, /error is words, or null/);
  refuses({ error: '' }, /error is words, or null/);
  const d = nextPromisesInput(PROMISES_DEFAULTS, {});
  assert.deepEqual([d.view, d.talk, d.offer, d.given, d.received, d.targets, d.draft], ['list', null, null, null, null, [], { kind: null, target: null, terms: null }], 'nothing offered or given until Frontend gives it');
  assert.equal(live({ received: incoming({ state: 'accepted' }) }).received.status, 'Pending', 'an accepted Promise without a status is Pending');
  assert.equal(live({ received: incoming() }).received.terms, TERMS, 'the exact terms as given, to the letter');
  const once = live({ received: incoming(), draft: { kind: 'JAIL_VOTE', target: 2, terms: null } });
  assert.deepEqual(nextPromisesInput(once, {}), once, 'the checked form is stable');
  // A refused command (0.1.1, R2): Frontend's words, kept to the letter until Frontend clears them.
  const WORDS = 'The server did not allow that command.';
  assert.equal(d.error, null, 'no refusal until Frontend gives one');
  const refusedOnce = live({ view: 'confirm', draft: { kind: 'MEET_A', terms: 'x' }, error: WORDS });
  assert.equal(refusedOnce.error, WORDS, 'the words as given');
  assert.equal(nextPromisesInput(refusedOnce, { draft: { kind: 'MEET_B', terms: 'y' } }).error, WORDS, 'kept until Frontend clears them');
  assert.equal(nextPromisesInput(refusedOnce, { error: null }).error, null);
});

test('the pair\'s privacy (the Lead\'s answer 6): a Promise names the viewer, and leaves with the viewer or when concealed', () => {
  assert.throws(() => live({ given: offered({ giver: BEN }) }), /must name this phone's player as its giver/);
  assert.throws(() => live({ received: incoming({ recipient: BEN }) }), /must name this phone's player as its recipient/);
  assert.throws(() => live({ given: incoming() }), /as its giver/, 'a received Promise given as given is refused');
  assert.throws(() => nextPromisesInput(PROMISES_DEFAULTS, { received: incoming() }), /pair's only/, 'with no viewer, no Promise is taken');
  const shown = live({ given: offered(), received: incoming(), draft: { kind: 'JAIL_VOTE', target: 2, terms: null } });
  const moved = nextPromisesInput(shown, { viewer: 5 });
  assert.deepEqual([moved.given, moved.received, moved.talk, moved.targets, moved.draft.kind], [null, null, null, [], null], 'a new viewer: everything of the last viewer\'s is dropped');
  assert.equal(nextPromisesInput({ ...shown, error: 'Refused.' }, { viewer: 5 }).error, null, 'a new viewer: the last viewer\'s refusal is dropped');
  const eli = { seat: 5, name: 'Eli', character: 'c3' };
  assert.equal(nextPromisesInput(shown, { viewer: 5, received: incoming({ recipient: eli }) }).received.recipient.seat, 5, 'what the same update gives the new viewer is kept');
  assert.equal(nextPromisesInput(shown, { viewer: 4 }).received.id, 'p1', 'the same viewer again drops nothing');
  const hidden = nextPromisesInput(shown, { status: 'concealed' });
  assert.deepEqual([hidden.given, hidden.received, hidden.talk, hidden.draft.kind], [null, null, null, null], 'concealed: dropped');
  assert.equal(nextPromisesInput(hidden, { received: incoming() }).received, null, 'refused while concealed');
  assert.equal(nextPromisesInput(hidden, { status: 'live' }).received, null, 'nothing comes back by itself');
  const refusal = nextPromisesInput({ ...shown, error: 'Refused.' }, { status: 'concealed' });
  assert.equal(refusal.error, null, 'concealed: a refusal is dropped');
  assert.equal(nextPromisesInput(refusal, { error: 'Refused.' }).error, null, 'and refused while concealed');
});

test('the sheet it gives the shell: the pack\'s frame and footer for each view; local Next and Back, and the commands', () => {
  assert.deepEqual(promisesSheet(live()), { id: PROMISES_SHEET_ID, close: true, detent: 'large', title: 'Promises', back: false, actions: [] });
  assert.deepEqual(promisesSheet(live({ view: 'kinds' })), { id: PROMISES_SHEET_ID, close: true, detent: 'large', title: 'Offer to Ava', back: true, actions: [{ id: 'next', label: 'Next', kind: 'primary', local: true, enabled: false }] }, 'Next waits for a kind');
  assert.equal(promisesSheet(live({ view: 'kinds', draft: { kind: 'MEET_A' } })).actions[0].enabled, true);
  assert.deepEqual(promisesSheet(live({ view: 'target', draft: { kind: 'JAIL_VOTE', target: 2 } })), { id: PROMISES_SHEET_ID, close: true, detent: 'large', title: 'Who will you vote to jail?', back: true, actions: [{ id: 'next', label: 'Next', kind: 'primary', local: true, enabled: true }] });
  assert.deepEqual(promisesSheet(live({ view: 'confirm', draft: { kind: 'MEET_A', terms: 'x' }, offer: { enabled: true, busy: true } })).actions, [
    { id: 'back', label: 'Back', kind: 'secondary', local: true },
    { id: 'offer', label: 'Offer', kind: 'primary', enabled: true, busy: true, reason: null },
  ], 'Back is this phone\'s own; Offer is the command, with Frontend\'s state');
  const answer = promisesSheet(live({ view: 'incoming', received: incoming(), answer: { accept: { enabled: false, reason: 'Used' }, decline: {} } }));
  assert.deepEqual([answer.title, answer.back], ['Offer from Ava', false]);
  assert.deepEqual(answer.actions, [
    { id: 'decline', label: 'Decline', kind: 'secondary', enabled: true, busy: false, reason: null },
    { id: 'accept', label: 'Accept', kind: 'primary', enabled: false, busy: false, reason: 'Used' },
  ], 'Decline and Accept are the commands, with Frontend\'s state');
  assert.deepEqual(promisesSheet(live({ view: 'incoming' })).actions, [], 'no offer, no answer');
  assert.ok(!JSON.stringify(promisesSheet(live({ view: 'incoming', received: incoming() }))).includes(TERMS), 'the terms are never in the sheet\'s frame');
  // A refusal (0.1.1) is the body's, never the frame's: the sheet's title, Back and footer stay as they are.
  for (const view of ['confirm', 'incoming']) {
    const base = { view, draft: { kind: 'MEET_A', terms: 'x' }, received: incoming() };
    assert.deepEqual(promisesSheet(live({ ...base, error: 'Refused.' })), promisesSheet(live(base)), `${view}: the frame is the same with a refusal`);
  }
});

test('the check\'s record: every capture, probe check and agreement case passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/promises-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  const csp = record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.match(csp, /default-src 'none'/);
  assert.deepEqual(record.headers.map(h => h.key), ['Cache-Control', 'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'X-Robots-Tag', 'Permissions-Policy']);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 32, 'sheets 33 and 33.1\'s states, Jail Vote\'s player, the offer in flight, reconnecting, the Largest text and the two refusals at two sizes; the refusals again at 320 × 568 with the Largest text');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.deepEqual(c.cut, [], `${key}: every word whole`);
    assert.ok(c.promisesOpen, `${key}: Promises open in the top bar`);
  }
  for (const size of ['390x844', '430x932']) {
    assert.equal(record.captures[`${size}/target`].title, 'Who will you vote to jail?', `${size}: Jail Vote's player, the undrawn state (answer 4), captured`);
    assert.ok(record.captures[`${size}/target`].seatJoined, `${size}: every seat keeps its "·" with a no-break space`);
    for (const [state, words] of [['refused', 'That choice is no longer offered.'], ['answer-refused', 'The server did not allow that command.']]) {
      const c = record.captures[`${size}/${state}`];
      assert.ok(c.error === words && c.errorRole === 'alert' && c.errorLast && c.errorWhole, `${size}: ${state}, Frontend's words whole in view, last in the body`);
    }
    assert.equal(record.captures[`${size}/stale`].offerWaits, 'Controls return when the match is current', `${size}: reconnecting, Offer waits with the banner's words`);
  }
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const ids = record.probe.full.checks.map(c => c.id);
  for (const state of ['refused-largest', 'answer-refused-largest']) {
    const c = record.captures[`320x568/${state}`];
    assert.ok(c && c.root === 32 && c.errorStarts && c.errorLast, `320 × 568 at the Largest text: ${state}, the note starts in view above the footer`);
  }
  for (const group of ['report', 'footer', 'offer', 'lists', 'words', 'target', 'refused', 'privacy', 'reconnect', 'focus', 'layout', 'dispose', 'motion']) assert.ok(ids.some(id => id.startsWith(`${group}:`)), `probe group ${group}`);
  // The Lead's privacy answer (6), each its own check.
  for (const pattern of [/doesn't name the viewer as its giver or recipient is refused/, /leave the page when the viewer changes/, /while concealed/]) assert.ok(ids.some(id => pattern.test(id)), `probe: ${pattern}`);
  assert.ok(ids.some(id => /drawn exactly as given, never composed or trimmed/.test(id)), 'probe: Frontend\'s words as given (answer 3)');
  const agree = record.agree;
  assert.ok(agree.ok && agree.checks.length === 14 && agree.checks.every(c => c.ok && c.detail.differences.length === 0), 'the sheet agrees with the frozen pack\'s promises screen in each state');
  assert.deepEqual(agree.problems, [], 'agreement: no page problem');
});
