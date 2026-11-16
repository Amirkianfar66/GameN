// Host setup and the host lobby (design/phone-ui/components/host-room): runtime sources the game imports as
// they are, so their module graph, their styles' scope, their inputs and their words are checked here; their
// drawing, lifecycle and agreement with the pack in a browser under the production headers by
// design/tools/host-room-check.mjs, whose record is checked last. The entry parts they draw with are checked
// with the main menu (main-menu.test.mjs); their room code card's words here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST_SETUP_DEFAULTS, HOST_SETUP_VERSION, SETUP_WORDS, nextHostSetupInput } from '../../../design/phone-ui/components/host-room/host-setup.mjs';
import { HOST_LOBBY_DEFAULTS, HOST_LOBBY_VERSION, LOBBY_WORDS, nextHostLobbyInput } from '../../../design/phone-ui/components/host-room/host-lobby.mjs';
import { CODE_WORDS, ENTRY_TOAST_MS } from '../../../design/phone-ui/components/entry-parts/entry-parts.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const COMPONENT = 'design/phone-ui/components/host-room';
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

test('host setup and the lobby are runtime sources: the whole graph is runtime-safe', () => {
  const files = new Map(['host-setup.mjs', 'host-lobby.mjs', 'host-room.css'].flatMap(f => [...graph(join(REPO, COMPONENT, f))]));
  const local = [...files.keys()].map(f => relative(REPO, f));
  const packages = [...new Set([...files.values()].flat().filter(s => !s.startsWith('.')))];
  for (const path of local) {
    assert.ok(path.startsWith('design/phone-ui/components/') || path.startsWith('apps/game/hosted/'), `${path}: only the components' own files and the hosted game's`);
    assert.doesNotMatch(path, /(?:^|\/)(?:dev|test|tests|fixtures|reference|prototype|preview)(?:\/|\.)/, `${path}: nothing development-only`);
    if (path.startsWith('design/')) assert.doesNotMatch(read(path), /mothership:dev-only/, `${path}: no development marker`);
  }
  assert.deepEqual(packages, ['@mothership/contracts'], 'one package import, the game\'s own contracts (through the kit\'s crew-runtime.mjs)');
  for (const path of [`${COMPONENT}/host-setup.mjs`, `${COMPONENT}/host-lobby.mjs`, 'design/phone-ui/components/entry-parts/entry-parts.mjs', 'design/phone-ui/components/entry-parts/entry-parts.css', 'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css', 'design/phone-ui/components/icons.mjs']) {
    assert.ok(local.includes(path), `${path} is in the graph`);
  }
  assert.ok(!local.some(p => p.includes('phone-shell') || p.includes('main-menu')), 'no phone shell and no menu: the screens stand alone');
  for (const path of ['preview/index.html', 'preview/preview.css', 'preview/preview.mjs', 'preview/probe.mjs', 'preview/agree.mjs']) {
    assert.match(read(`${COMPONENT}/${path}`), /mothership:dev-only/, `${path} is marked development-only`);
  }
  assert.match(read('design/tools/host-room-check.mjs'), /^\/\/ mothership:dev-only/);
});

test('the code card keeps Copy inside it with larger text: its row wraps and the code fits the row', () => {
  const css = read('design/phone-ui/components/entry-parts/entry-parts.css');
  assert.match(css, /:where\(\.ms-ep-code-row\) \{ display: flex; flex-wrap: wrap; [^}]*container-type: inline-size; \}/);
  assert.match(css, /:where\(\.ms-ep-code\) \{ flex: 1 0 auto; font: 800 min\(2\.5rem, 21cqi\)\/1 /, 'the pack\'s 2.5rem, never wider than the row');
  assert.match(read(`${COMPONENT}/preview/agree.mjs`), /const IMPROVED = '\.ph \.code-card \.code-row \{ flex-wrap: wrap; container-type: inline-size; \} \.ph \.code-card \.code \{ flex: 1 0 auto; font-size: min\(2\.5rem, 21cqi\); \}'/, 'the agreement applies the same rules to the pack');
});

test('their styles reach nothing outside them: the two screen roots only, from the kit and the entry parts', () => {
  const path = `${COMPONENT}/host-room.css`;
  const raw = read(path);
  assert.match(raw, /^@import url\("\.\.\/kit\/kit\.css"\);\n@import url\("\.\.\/entry-parts\/entry-parts\.css"\);/, 'it starts from the shared kit and the entry parts');
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '');
  const selectors = [...css.matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap(m => m[1].split(',').map(s => s.trim()));
  assert.deepEqual(selectors, ['.ms-host-setup', '.ms-host-lobby', '.ms-host-setup:focus', '.ms-host-lobby:focus'], 'only the screens themselves: every part is the kit\'s or the entry parts\'');
  assert.doesNotMatch(css, /@keyframes|cursor|--[\w-]+\s*:/, 'no motion, cursor or custom property of their own');
});

test('their words are the pack\'s: host setup and the lobby of sheet 11', () => {
  const entry = read('design/phone-ui/prototype/screens-entry.mjs');
  const quoted = words => entry.includes(`'${words}'`) || entry.includes(`${words}'`) || entry.includes(`'${words}`);
  for (const [name, words] of Object.entries(SETUP_WORDS)) assert.ok(quoted(words), `setup ${name}: ${words}`);
  for (const [name, words] of Object.entries(LOBBY_WORDS)) {
    if (typeof words === 'function' || name === 'offline' || name === 'host' || name === 'seats') continue;
    assert.ok(quoted(words), `lobby ${name}: ${words}`);
  }
  // The pack writes these in its own templates; the same words from the same inputs.
  assert.ok(entry.includes('`Asking to join · ${requests.length}`') && LOBBY_WORDS.asking(2) === 'Asking to join · 2');
  assert.ok(entry.includes('`Up to ${9 - humans.length}`') && LOBBY_WORDS.upTo(4) === 'Up to 4');
  assert.ok(entry.includes('`${filled} of 9 seats`') && CODE_WORDS.seats(5, 9) === '5 of 9 seats');
  assert.ok(entry.includes("`Room code ${ROOM_CODE.split('').join(' ')}`") && CODE_WORDS.code('K7Q2XM') === 'Room code K 7 Q 2 X M');
  for (const words of [CODE_WORDS.label, CODE_WORDS.copy, CODE_WORDS.copied, CODE_WORDS.copyAria, 'Host', 'Seats']) assert.ok(entry.includes(words), `the lobby: ${words}`);
  // The one sentence the pack does not have: the lobby's offline note, in the words of sheet 10's (the
  // interface the Lead approved on #287).
  assert.equal(LOBBY_WORDS.offline, 'No connection. Admit, Bots and Start return when you are back online.');
  assert.match(entry, /'No connection\. Join, Host and Recover return when you are back online\.'/);
  assert.equal(ENTRY_TOAST_MS, 2400, 'the shell\'s toast time');
  assert.equal(HOST_SETUP_VERSION, 'host-setup-0.1.0');
  assert.equal(HOST_LOBBY_VERSION, 'host-lobby-0.1.0');
});

test('setup\'s inputs are checked, and refused with a reason', () => {
  const COUNTS = [{ value: 7, mix: '4 Blue · 2 Red · 1 Alien' }, { value: 9, mix: '5 Blue · 3 Red · 1 Alien' }];
  const refuses = (input, pattern) => assert.throws(() => nextHostSetupInput(HOST_SETUP_DEFAULTS, input), pattern);
  refuses({ counts: [{ value: 9 }] }, /counts are \[\{ value, mix \}\]/);
  refuses({ counts: COUNTS, count: 8 }, /The count is null or one of the counts/);
  refuses({ open: null }, /open is \{ enabled, busy, reason \}/);
  refuses({ error: 7 }, /The error is null or words/);
  refuses({ insets: { top: '47px' } }, /insets are null/);
  const d = nextHostSetupInput(HOST_SETUP_DEFAULTS, {});
  assert.deepEqual([d.counts, d.count, d.error], [[], null, null]);
  assert.deepEqual(d.open, { enabled: true, busy: false, reason: null });
  const s = nextHostSetupInput(d, { counts: COUNTS, count: 9, open: { enabled: false, reason: '' } });
  assert.equal(s.open.reason, null, 'an empty reason is no reason');
  assert.deepEqual(nextHostSetupInput(s, { count: 7 }).counts, s.counts, 'a key not given stays');
  assert.deepEqual(nextHostSetupInput(s, {}), s, 'the checked forms are stable');
});

test('the lobby\'s inputs are checked; a notice changes no control, so with every control enabled it refuses nothing', () => {
  const refuses = (input, pattern) => assert.throws(() => nextHostLobbyInput(HOST_LOBBY_DEFAULTS, input), pattern);
  refuses({ members: [{ seat: 1, name: 'Ava', kind: 'guest' }] }, /members are/);
  refuses({ members: [{ seat: 1, name: 'Ava', kind: 'host' }, { seat: 1, name: 'Ben', kind: 'person' }] }, /Each seat is listed once/);
  refuses({ requests: [{ id: 'a', name: 'A', device: 'tablet' }] }, /requests are/);
  refuses({ requests: [{ id: 'a', name: 'A', device: 'phone' }, { id: 'a', name: 'B', device: 'phone' }] }, /Each request is listed once/);
  refuses({ bots: { count: -1, max: 2 } }, /bots are/);
  refuses({ seats: { filled: 1, total: 0 } }, /seats are/);
  refuses({ toast: { id: 'a' } }, /A toast is/);
  refuses({ notice: 'down' }, /notice is null or "offline"/);
  refuses({ roomCode: '' }, /room code/);
  const lobby = nextHostLobbyInput(HOST_LOBBY_DEFAULTS, {
    roomCode: 'K7Q2XM', seats: { filled: 9, total: 9 }, requests: [{ id: 'adm-gus', name: 'Gus', device: 'phone' }],
    bots: { count: 3, max: 4 }, start: { enabled: true },
  });
  const offline = nextHostLobbyInput(lobby, { notice: 'offline' });
  assert.equal(offline.notice, 'offline');
  for (const key of ['requests', 'bots', 'start', 'seats', 'members']) assert.deepEqual(offline[key], lobby[key], `the notice leaves ${key} as Frontend gave them`);
  assert.deepEqual(offline.requests[0].admit, { enabled: true, busy: false, reason: null }, 'an Admit with no availability is enabled');
  assert.equal(nextHostLobbyInput(offline, { toast: { id: 't', text: 'Copied' } }).toast.icon, 'check', 'a toast\'s icon is the check unless given');
  assert.deepEqual(nextHostLobbyInput(offline, {}), offline, 'the checked forms are stable');
});

test('the check\'s record: every capture, probe check and agreement case passed under the production headers', () => {
  const record = JSON.parse(read(`${COMPONENT}/review/check.json`));
  assert.equal(record.tool, 'design/tools/host-room-check.mjs');
  assert.ok(record.sourceClean, 'recorded against a clean source');
  assert.match(record.headers.find(h => h.key === 'Content-Security-Policy')?.value ?? '', /default-src 'none'/);
  const captures = Object.entries(record.captures);
  assert.equal(captures.length, 22, 'eleven states at two sizes');
  for (const [key, c] of captures) {
    assert.ok(c.ok && c.drawn, `${key} passed and drew what its state asks`);
    assert.deepEqual(c.problems, [], `${key}: no page error or failed request`);
    assert.ok(c.violations.every(v => v.kind.startsWith('known:')), `${key}: no unexpected policy report`);
    assert.ok(existsSync(join(REPO, c.file)), `${key}: ${c.file}`);
    assert.equal(c.canvas, 'rgb(16, 20, 28)', `${key}: on the pack's canvas`);
  }
  for (const size of ['390x844', '430x932']) {
    const at = state => record.captures[`${size}/${state}`];
    assert.equal(at('lobby').startNote, '4 more seats to fill', `${size}: Start's reason under it`);
    assert.ok(at('full').moreRefused && at('full').moreLook === '1' && !at('full').startRefused, `${size}: at the most bots + is refused and keeps its look, as sheet 11 draws Full; Start is open`);
    assert.equal(at('offline').note, LOBBY_WORDS.offline, `${size}: the offline note`);
    assert.equal(at('copied').toastTop, 109, `${size}: the toast 10 px under the nav bar`);
    assert.ok(at('lobby-large').root === 32 && at('lobby-large').scrolls, `${size}: the Largest text scrolls`);
    for (const state of ['lobby', 'requests', 'copied', 'full', 'offline']) assert.ok(at(state).copyInside && !at(state).copyUnder, `${size}/${state}: Copy beside the code, inside the card`);
    assert.ok(at('lobby-large').copyInside && at('lobby-large').copyUnder, `${size}: with the Largest text, Copy under the code, inside the card`);
  }
  assert.deepEqual(Object.keys(record.probe).sort(), ['device-reduced', 'full']);
  for (const [mode, run] of Object.entries(record.probe)) {
    assert.ok(run.ok && run.checks.length > 0 && run.checks.every(c => c.ok), `probe ${mode}: every check passed`);
    assert.deepEqual(run.problems, [], `probe ${mode}: no page problem`);
  }
  const groups = record.probe.full.checks.map(c => c.id.split(':')[0]);
  for (const group of ['setup', 'lobby', 'stepper', 'keyed', 'offline', 'toast', 'not interactive', 'insets', 'text', 'input', 'dispose', 'motion']) assert.ok(groups.includes(group), `probe group ${group}`);
  assert.ok(record.probe.full.checks.some(c => c.ok && /with every control enabled it refuses nothing/.test(c.id)), 'a notice with every control enabled refuses nothing, in the browser');
  assert.ok(record.agree.ok && record.agree.checks.length === 11 && record.agree.checks.every(c => c.ok && c.detail.differences.length === 0), 'each screen agrees with the frozen pack\'s');
  // The one difference from the pack, recorded where it is drawn: + refused at the most bots (Full), keeping its
  // look as the sheet draws it, so only the refusal (aria-disabled) is recorded, not its look.
  for (const c of record.agree.checks) {
    assert.deepEqual(c.detail.recorded.map(r => `${r.part.replace(/ \d+$/, '')} ${r.what}`), c.id.includes('full') ? ['stepper + aria-disabled'] : [], `${c.id}: recorded`);
    // The one improvement, with the larger text only: the pack's Copy past the card, the screen's inside it.
    const larger = c.id.startsWith('agree: lobby') && /Large(st)? text/.test(c.id);
    if (larger) assert.ok(!c.detail.improvement.pack.inside && c.detail.improvement.screen.inside, `${c.id}: the improvement`);
    else assert.equal(c.detail.improvement ?? null, null, `${c.id}: none at the Standard text`);
  }
  assert.equal(record.agree.checks.filter(c => c.detail.improvement).length, 3, 'Large and Largest at 390 × 844, Largest at 430 × 932');
});
