// Join and waiting (design/phone-ui/components/join-room): runtime sources the game imports as they are, so their
// module graph, their styles' scope, their inputs and their words are checked here; their drawing, lifecycle and
// agreement with the pack in a browser under the production headers by design/tools/join-room-check.mjs, whose
// record is checked last. The entry parts they draw with are checked with the main menu (main-menu.test.mjs);
// the seat badge here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JOIN_FORM_DEFAULTS, JOIN_FORM_VERSION, JOIN_WORDS, nextJoinFormInput } from '../../../design/phone-ui/components/join-room/join-form.mjs';
import { JOIN_WAIT_DEFAULTS, JOIN_WAIT_VERSION, WAIT_WORDS, nextJoinWaitInput } from '../../../design/phone-ui/components/join-room/join-wait.mjs';
import { CREW_NAME_MAX_LENGTH } from '@mothership/contracts';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/join-room';
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

test('join and waiting are runtime sources: the whole graph is runtime-safe', () => {
  const files = new Map(['join-form.mjs', 'join-wait.mjs', 'join-room.css'].flatMap(f => [...graph(join(REPO, COMPONENT, f))]));
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/join-form.mjs`, `${COMPONENT}/join-wait.mjs`, 'design/phone-ui/components/entry-parts/entry-parts.mjs', 'design/phone-ui/components/entry-parts/entry-parts.css', 'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css', 'design/phone-ui/components/icons.mjs']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  assert.ok(!local.some(p => p.includes('phone-shell') || p.includes('main-menu') || p.includes('host-room')), 'no phone shell, menu or host room: the screens stand alone');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/join-room-check.mjs'), /^\/\/ mothership:dev-only/);
});

test('their styles reach nothing outside them: the two screen roots, and their own few parts under them', () => {
  const path = `${COMPONENT}/join-room.css`;
  const raw = read(path);
  assert.match(raw, /^@import url\("\.\.\/kit\/kit\.css"\);\n@import url\("\.\.\/entry-parts\/entry-parts\.css"\);/, 'it starts from the shared kit and the entry parts');
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => [m[1].split(',').map(s => s.trim()), m[2]]);
  const selectors = rules.flatMap(([s]) => s);
  for (const selector of selectors) {
    assert.match(selector, /^\.ms-join-(?:form|wait)(?::focus)?(?: \.ms-j[fw]-[\w-]+)?$/, `"${selector}": a root, or one of its own parts under it`);
  }
  assert.ok(selectors.includes('.ms-join-form .ms-jf-code-input') && selectors.includes('.ms-join-wait .ms-jw-note'));
  for (const [s, body] of rules) {
    if (/cursor:\s*pointer/.test(body)) assert.match(body, /-webkit-tap-highlight-color:\s*transparent/, `${s.join(', ')}: the kit's rule for a hand cursor`);
  }
  assert.doesNotMatch(css, /@keyframes|--[\w-]+\s*:/, 'no motion or custom property of their own');
  // The code's text box draws nothing itself, and its 16 px text keeps a phone from zooming in.
  assert.match(css, /\.ms-jf-code-input \{[^}]*opacity: 0;[^}]*\}/);
  assert.match(css, /\.ms-jf-code-input \{[^}]*font: 16px\/1 /);
});

test('the seat badge is the entry parts\', at 0.3.0', () => {
  const css = read('design/phone-ui/components/entry-parts/entry-parts.css');
  assert.match(css, /\.ms-entry-parts :where\(\.ms-ep-seat-badge\) \{ display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px 6px 6px; border-radius: 999px; background: var\(--ms-k-paper\); color: var\(--ms-k-ink\); font: 700 1rem\/1 var\(--ms-k-font\); \}/, 'the pack\'s .seat-badge');
  assert.match(css, /\.ms-entry-parts :where\(\.ms-ep-seat-badge \.ms-k-num\) \{ background: var\(--ms-k-ink\); color: var\(--ms-k-paper\); min-width: calc\(30em \/ 16\); height: calc\(30em \/ 16\); font-size: 1rem; \}/, 'the pack\'s .seat-badge .num');
});

test('their words are the pack\'s: join and waiting of sheets 12 and 13', () => {
  const entry = read('design/phone-ui/prototype/screens-entry.mjs');
  for (const words of [JOIN_WORDS.back, JOIN_WORDS.title, JOIN_WORDS.heading, JOIN_WORDS.code, JOIN_WORDS.name, JOIN_WORDS.device, JOIN_WORDS.player, JOIN_WORDS.display, JOIN_WORDS.ask, JOIN_WORDS.sending,
    JOIN_WORDS.noRoom, JOIN_WORDS.started, JOIN_WORDS.busy, JOIN_WORDS.placeholder(12), JOIN_WORDS.nameRule(12)]) {
    assert.ok(entry.includes(words), `screens-entry.mjs: ${words}`);
  }
  for (const words of [WAIT_WORDS.join, WAIT_WORDS.lobby, WAIT_WORDS.cancel, WAIT_WORDS.leave, WAIT_WORDS.waiting, WAIT_WORDS.check, WAIT_WORDS.starts, WAIT_WORDS.closed, WAIT_WORDS.back]) {
    assert.ok(entry.includes(words), `screens-entry.mjs: ${words}`);
  }
  // The pack writes these in its own templates; the same words from the same inputs.
  assert.ok(entry.includes('`Room ${ROOM_CODE} · as Dev`') && WAIT_WORDS.as('K7Q2XM', 'Dev') === 'Room K7Q2XM · as Dev');
  assert.ok(entry.includes('`Room ${ROOM_CODE} · waiting for the host`') && WAIT_WORDS.waitingHost('K7Q2XM') === 'Room K7Q2XM · waiting for the host');
  assert.ok(entry.includes('`Players · ${people.length} of 9`') && WAIT_WORDS.players(5, 9) === 'Players · 5 of 9');
  assert.ok(entry.includes("'You’re in · Seat 4'") && WAIT_WORDS.inSeat(4) === 'You’re in · Seat 4');
  assert.ok(entry.includes('`${m.name} (you)`') && WAIT_WORDS.you('Dev') === 'Dev (you)');
  assert.ok(entry.includes("'0/12'") && JOIN_WORDS.count(0, 12) === '0/12');
  // The words the sheets do not have: a declined request (decided by the Lead, 16 November) and a lost
  // connection (the Lead's review of #289, question 4), in the menu's offline sentence's form.
  assert.equal(WAIT_WORDS.declined, 'The host didn’t admit you');
  assert.equal(JOIN_WORDS.offline, 'No connection. Ask to join returns when you are back online.');
  assert.equal(WAIT_WORDS.offline, 'No connection. Check again returns when you are back online.');
  assert.equal(JOIN_FORM_DEFAULTS.nameMax, CREW_NAME_MAX_LENGTH, 'the default limit is the contract\'s');
  assert.equal(JOIN_FORM_VERSION, 'join-form-0.1.1');
  assert.equal(JOIN_WAIT_VERSION, 'join-wait-0.1.2');
});

test('the form\'s inputs are checked, and refused with a reason; the values are Frontend\'s', () => {
  const refuses = (input, pattern) => assert.throws(() => nextJoinFormInput(JOIN_FORM_DEFAULTS, input), pattern);
  refuses({ code: 'K7Q2XMZ' }, /up to six characters/);
  refuses({ name: null }, /The name is text/);
  refuses({ nameCount: -1 }, /nameCount is a whole number/);
  refuses({ nameMax: 0 }, /nameMax is the contract/);
  refuses({ device: 'tablet' }, /The device is "player" or "display"/);
  refuses({ codeError: 3 }, /codeError is null or words/);
  refuses({ ask: null }, /ask is \{ enabled, busy, reason \}/);
  refuses({ insets: { top: '47px' } }, /insets are null/);
  const d = nextJoinFormInput(JOIN_FORM_DEFAULTS, {});
  assert.deepEqual([d.code, d.name, d.nameCount, d.device, d.codeError, d.nameError, d.error], ['', '', 0, 'player', null, null, null]);
  assert.deepEqual(d.ask, { enabled: true, busy: false, reason: null });
  // The form never checks a code or a name: an odd value is shown as Frontend gives it.
  const odd = nextJoinFormInput(d, { code: 'k7', name: 'Devendra Kumar', nameCount: 14 });
  assert.deepEqual([odd.code, odd.name, odd.nameError], ['k7', 'Devendra Kumar', null]);
  assert.deepEqual(nextJoinFormInput(odd, {}), odd, 'the checked forms are stable');
});

test('waiting\'s inputs are checked; an error changes no control, so with every control enabled it refuses nothing', () => {
  const refuses = (input, pattern) => assert.throws(() => nextJoinWaitInput(JOIN_WAIT_DEFAULTS, input), pattern);
  refuses({ view: 'waiting' }, /The view is "pending", "admitted", "closed", "declined"/);
  refuses({ roomCode: '' }, /room code/);
  refuses({ seat: 0 }, /The seat is a seat number/);
  refuses({ members: [{ seat: 1 }] }, /members are/);
  refuses({ members: [{ seat: 1, name: 'A' }, { seat: 1, name: 'B' }] }, /Each seat is listed once/);
  refuses({ seats: { filled: 1, total: 0 } }, /seats are/);
  refuses({ check: null }, /check is/);
  refuses({ view: 'admitted' }, /needs the seat and the seats/);
  const pending = nextJoinWaitInput(JOIN_WAIT_DEFAULTS, { roomCode: 'K7Q2XM', name: 'Dev' });
  const offline = nextJoinWaitInput(pending, { error: WAIT_WORDS.offline });
  assert.deepEqual(offline.check, pending.check, 'the words leave Check again as Frontend gave it');
  assert.deepEqual(offline.check, { enabled: true, busy: false, reason: null });
  const admitted = nextJoinWaitInput(pending, { view: 'admitted', seat: 4, seats: { filled: 5, total: 9 }, members: [{ seat: 4, name: 'Dev' }] });
  assert.equal(admitted.view, 'admitted');
  assert.deepEqual(nextJoinWaitInput(admitted, {}), admitted, 'the checked forms are stable');
});

test('the check\'s record: every capture, probe check and agreement case passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/join-room-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  assert.match(record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '', /default-src 'none'/);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 32, 'sixteen states at two sizes');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.equal(c.canvas, 'rgb(16, 20, 28)', `${key}: on the pack's canvas`);
    if (c.screen === 'form') assert.equal(c.stacked, c.root === 32, `${key}: the device choice stacks at the Largest text only`);
  }
  for (const size of ['390x844', '430x932']) {
    const at = state => record.captures[`${size}/${state}`];
    assert.equal(at('empty').ring, 2, `${size}: the next box ringed while the code is typed`);
    assert.ok(at('empty').askRefused && !at('no-room').askRefused, `${size}: Ask as Frontend gives it`);
    assert.equal(at('declined').waitTitle, WAIT_WORDS.declined, `${size}: the declined request`);
    assert.deepEqual(at('offline').errors, [JOIN_WORDS.offline], `${size}: the form offline`);
    assert.deepEqual(at('wait-offline').errors, [WAIT_WORDS.offline], `${size}: waiting offline`);
  }
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = record.probe.full.checks.map(c => c.id.split(':')[0]);
  for (const group of ['form', 'typing', 'ring', 'errors', 'ask', 'views', 'offline', 'not interactive', 'insets', 'text', 'input', 'dispose', 'motion']) assert.ok(groups.includes(group), `probe group ${group}`);
  assert.ok(record.probe.full.checks.some(c => c.ok && /with every control enabled they refuse nothing/.test(c.id)), 'the offline words with every control enabled refuse nothing, in the browser');
  assert.ok(record.agree.ok && record.agree.checks.length === 11 && record.agree.checks.every(c => c.ok && c.detail.differences.length === 0), 'each screen agrees with the frozen pack\'s');
  // The one accepted difference, recorded where it is drawn: the device choice stacked, at the Largest text only.
  for (const c of record.agree.checks) {
    const largestForm = c.id.startsWith('agree: join') && c.id.includes('Largest');
    if (largestForm) assert.ok(c.detail.accepted?.stacked && c.detail.accepted.screen.h > c.detail.accepted.pack.h, `${c.id}: the stacked device choice`);
    else assert.equal(c.detail.accepted ?? null, null, `${c.id}: nothing accepted at the Standard text`);
  }
});

test('the game\u2019s gap: Cancel, Leave and Back to menu take Frontend\u2019s availability (G6)', () => {
  const defaults = nextJoinWaitInput(JOIN_WAIT_DEFAULTS, {});
  for (const name of ['cancel', 'leave', 'back']) assert.deepEqual(defaults[name], { enabled: true, busy: false, reason: null }, name);
  const off = nextJoinWaitInput(JOIN_WAIT_DEFAULTS, { leave: { enabled: false, reason: 'Not available in this test' } });
  assert.deepEqual(off.leave, { enabled: false, busy: false, reason: 'Not available in this test' });
  assert.throws(() => nextJoinWaitInput(JOIN_WAIT_DEFAULTS, { cancel: false }), /cancel/);
});
