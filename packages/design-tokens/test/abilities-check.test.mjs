// mothership:dev-only
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

// The check of the ability art (design/abilities/) is only worth something if it can fail. Each
// test copies what the check reads to a scratch directory, makes one mistake the way a person
// would, and expects design/tools/abilities-check.mjs to refuse it by name. Nothing in the
// repository is touched. The browser measurements (abilities-capture.mjs) are not proven here:
// the check reads the report they write, and a recorded problem is refused below.

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const scratchRoots = [];
after(() => { for (const path of scratchRoots) rmSync(path, { recursive: true, force: true }); });

function scratchCopy() {
  const root = mkdtempSync(join(tmpdir(), 'mothership-abilities-check-'));
  scratchRoots.push(root);
  for (const path of ['design/tools', 'design/board-motion/js', 'design/board-motion/css', 'design/board-motion/index.html', 'docs/design/abilities-inventory.md',
    'packages/contracts/src', 'packages/presentation/src', 'apps/game/src', 'apps/game/hosted']) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    cpSync(join(repoRoot, path), join(root, path), { recursive: true });
  }
  // The review pictures are checked for being present and current: empty stand-ins keep the copy small.
  cpSync(join(repoRoot, 'design/abilities'), join(root, 'design/abilities'), { recursive: true, filter: source => !source.endsWith('.png') });
  for (const entry of readdirSync(join(repoRoot, 'design/abilities/review'), { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.png')) writeFileSync(join(root, 'design/abilities/review', entry.name), '');
  }
  return root;
}
const edit = (root, path, change) => {
  const before = readFileSync(join(root, path), 'utf8');
  const changed = change(before);
  assert.notEqual(changed, before, `the edit to ${path} changed nothing`);
  writeFileSync(join(root, path), changed);
};
const append = (root, path, text) => edit(root, path, before => `${before}\n${text}\n`);
const editJson = (root, path, change) => edit(root, path, text => {
  const value = JSON.parse(text);
  change(value);
  return `${JSON.stringify(value, null, 2)}\n`;
});
const write = (root, path, text) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };
const check = root => new Promise(done => {
  execFile(process.execPath, [join(root, 'design/tools/abilities-check.mjs')], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
    done({ status: error ? (error.code ?? 1) : 0, output: `${stdout}${stderr}` });
  });
});
const refuses = (result, ...patterns) => {
  assert.notEqual(result.status, 0, `the check passed:\n${result.output}`);
  for (const pattern of patterns) assert.match(result.output, pattern);
};
const DOSSIER = 'design/abilities/js/dossier.js';
const CSS = 'design/abilities/css/abilities.css';
const RECIPES = 'design/abilities/recipes.json';
const INVENTORY = 'design/abilities/contract/abilities.json';
const SOURCE = 'design/abilities/source/dossier.svg';
const APP = 'design/board-motion/js/app.js';

test('the ability art as committed passes its check', async () => {
  const result = await check(scratchCopy());
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Ability-art checks: 7 passed, 0 failing/);
});

// ---------- the kit ----------

test('a team color drawn into the kit is refused', async () => {
  const root = scratchCopy();
  edit(root, SOURCE, text => text.replace(/(<g id="dossier-query"[\s\S]*?fill=")#[0-9A-Fa-f]{6}/, '$1#70AFFF'));
  refuses(await check(root), /dossier-query: #70AFFF is not in the neutral palette/);
});

test('a kit asset named after a role is refused', async () => {
  const root = scratchCopy();
  editJson(root, RECIPES, recipes => { recipes.assets.find(asset => asset.id === 'dossier-pin').id = 'insider-pin'; });
  refuses(await check(root), /insider-pin: an asset of the shared kit is named after a role or a team/);
});

test('a hand edit to a built asset is refused', async () => {
  const root = scratchCopy();
  append(root, 'design/abilities/assets/dossier-pin.svg', '<!-- touched -->');
  refuses(await check(root), /dossier-pin\.svg: not what design\/tools\/abilities-assets\.mjs makes/);
});

// ---------- the inventory ----------

test('a role ability missing from the inventory is refused', async () => {
  const root = scratchCopy();
  editJson(root, INVENTORY, inventory => { inventory.treatments = inventory.treatments.filter(entry => entry.id !== 'hacker-scan'); });
  refuses(await check(root), /the inventory has no treatment hacker-scan/);
});

test('a treatment reading a field the contract does not carry is refused', async () => {
  const root = scratchCopy();
  editJson(root, INVENTORY, inventory => { inventory.treatments.find(entry => entry.id === 'insider-file').fields.push('knowledge.insiderRoles'); });
  refuses(await check(root), /insider-file: reads knowledge\.insiderRoles, which packages\/contracts\/src\/full-game\.ts does not carry/);
});

test('a treatment without a reduced-motion form is refused', async () => {
  const root = scratchCopy();
  editJson(root, INVENTORY, inventory => { delete inventory.treatments.find(entry => entry.id === 'cracker-rescue').motion.reduced; });
  refuses(await check(root), /cracker-rescue: no reduced motion/);
});

// ---------- the Insider's file: a set, never a mapping ----------

test('candidates drawn in the order the view lists them are refused', async () => {
  const root = scratchCopy();
  edit(root, DOSSIER, text => text.replace('const suspects = [...candidates].sort((a, b) => a.n - b.n);', 'const suspects = [...candidates];'));
  refuses(await check(root), /the candidates are not put in seat order before they are drawn/);
});

test('a candidate drawn with a role is refused', async () => {
  const root = scratchCopy();
  edit(root, DOSSIER, text => text.replace("'data-seat': seat.n, 'aria-pressed': 'false',", "'data-seat': seat.n, 'data-role': ROLE_NAMES[seat.n % 3], 'aria-pressed': 'false',"));
  refuses(await check(root), /a candidate is drawn with something of a role/);
});

test('the Insider\'s candidates drawn with a label tape are refused', async () => {
  const root = scratchCopy();
  edit(root, DOSSIER, text => text.replace("snapshot(seat, { label: FILE_COPY.inspect(seat.n, seat.name), query: true })", "snapshot(seat, { label: FILE_COPY.inspect(seat.n, seat.name), query: true, tape: ROLE_NAMES[0] })"));
  refuses(await check(root), /a candidate is drawn with something of a role/);
});

test('the role names drawn as a list are refused', async () => {
  const root = scratchCopy();
  edit(root, DOSSIER, text => text.replace("el('span', { class: 'ab-roles__slip' }", "el('ul', { class: 'ab-roles__slip' }"));
  refuses(await check(root), /the role names are a list/);
});

test('query tags that swing one after another are refused', async () => {
  const root = scratchCopy();
  edit(root, DOSSIER, text => text.replace(
    /for \(const query of file\.querySelectorAll\('\.ab-photo__query'\)\) \{\s*play\(query, (\[[^\n]*\]), \{ duration: M\.query, delay: M\.queriesFrom, easing: 'ease-out' \}\);\s*\}/,
    "file.querySelectorAll('.ab-photo__query').forEach((query, index) => play(query, $1, { duration: M.query, delay: M.queriesFrom + index * M.photoStagger, easing: 'ease-out' }));"));
  refuses(await check(root), /the query tags do not swing together/);
});

test('one candidate styled apart from the others is refused', async () => {
  const root = scratchCopy();
  append(root, CSS, '.ab-photo[data-seat="2"] .ab-photo__frame { outline: 3px solid var(--ms-color-focus); }');
  refuses(await check(root), /abilities\.css styles one candidate apart from the others/);
});

test('a color that is not a token is refused', async () => {
  const root = scratchCopy();
  append(root, CSS, '.ab-file__note { color: #FF8C8C; }');
  refuses(await check(root), /abilities\.css writes a color that is not a token/);
});

test('ability art drawn before its bundle has arrived is refused', async () => {
  const root = scratchCopy();
  append(root, CSS, '.ab-folder__art { background: var(--ab-asset-dossier-folder) center / contain no-repeat; }');
  refuses(await check(root), /draws var\(--ab-asset-dossier-folder\) without the abilities bundle having arrived/);
});

test('a board cue drawn outside the own board is refused', async () => {
  const root = scratchCopy();
  append(root, CSS, '.bm-piece[data-spot] .bm-piece__ring { display: block; }');
  refuses(await check(root), /abilities\.css draws a board cue outside the own board/);
});

// ---------- the Hacker's and the Alien's files, and the Code attempt ----------

const INTEL = 'design/abilities/js/intel.js';

test('a wrong Scan that shows the Code\'s mark is refused', async () => {
  const root = scratchCopy();
  edit(root, INTEL, text => text.replace("marks.push(el('span', { class: 'ab-stamp ab-printout__stamp', 'data-stamp': 'wrong' }, HACKER_COPY.stampWrong));", "marks.push(el('span', { class: 'ab-stamp ab-printout__stamp', 'data-stamp': 'wrong' }, HACKER_COPY.stampWrong), codeMark(true));"));
  refuses(await check(root), /a wrong Scan shows something of the Code/);
});

test('Scan results sorted by the file are refused', async () => {
  const root = scratchCopy();
  edit(root, INTEL, text => text.replace("el('ol', { class: 'ab-scans__list' }, scans.map(printout))", "el('ol', { class: 'ab-scans__list' }, [...scans].sort((a, b) => Number(b.matched) - Number(a.matched)).map(printout))"));
  refuses(await check(root), /the Hacker's file reorders or filters the Scan results/);
});

test('the Alien\'s Code drawn in the view\'s order is refused', async () => {
  const root = scratchCopy();
  edit(root, INTEL, text => text.replace('const members = [...code].sort((a, b) => a.n - b.n);', 'const members = [...code];'));
  refuses(await check(root), /the Alien's Code is not put in seat order before it is drawn/);
});

test('the Alien\'s Code drawn as an ordered list is refused', async () => {
  const root = scratchCopy();
  edit(root, INTEL, text => text.replace("const grid = el('ul', { class: 'ab-code-set'", "const grid = el('ol', { class: 'ab-code-set'"));
  refuses(await check(root), /the Alien's Code is drawn as an ordered list/);
});

test('a Code card filled in picking order is refused', async () => {
  const root = scratchCopy();
  edit(root, INTEL, text => text.replace('const sorted = [...picks].sort((a, b) => a.n - b.n);', 'const sorted = [...picks];'));
  refuses(await check(root), /the Code card is not filled in seat order/);
});

test('picks of a set numbered on the board are refused', async () => {
  const root = scratchCopy();
  edit(root, 'design/board-motion/js/board.js', text => text.replace("h('span', { class: 'bm-piece__pick', 'aria-hidden': 'true' }, '✓')", "h('span', { class: 'bm-piece__pick', 'aria-hidden': 'true' }, String(pick + 1))"));
  refuses(await check(root), /a set's picks are numbered on the board/);
});

test('a set\'s picks named in picking order are refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace('const listed = unordered ? [...seats].sort((a, b) => a - b) : seats;', 'const listed = seats;'));
  refuses(await check(root), /the strip does not name a set's picks in seat order/);
});

// ---------- loading, hiding, and the production fence ----------

test('ability art loaded by role is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace("await new Promise(resolve => {\n    const link = h('link'", "if (S.private.role === 'Insider') await new Promise(resolve => {\n    const link = h('link'"));
  refuses(await check(root), /which art the prototype loads depends on something private/);
});

test('a hidden card that builds the private file is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace('    fileNode = null;\n    put(card, head, closedFolder(', '    fileNode = fileFor(S.private.intel?.insiderCandidates ?? []);\n    put(card, head, closedFolder('));
  refuses(await check(root), /the hidden card builds the private file/);
});

test('production code that reaches into the prototype is refused', async () => {
  const root = scratchCopy();
  write(root, 'apps/game/src/insider-file.ts', "export const art = '../../design/abilities/assets/abilities.art.css';\n");
  refuses(await check(root), /apps\/game\/src\/insider-file\.ts: production code refers to the ability-art prototype/);
});

test('a prototype file without its development-only mark is refused', async () => {
  const root = scratchCopy();
  write(root, 'design/abilities/js/extra.js', 'export const extra = 1;\n');
  refuses(await check(root), /design\/abilities\/js\/extra\.js: no development-only mark/);
});

// ---------- review pictures and the generated page ----------

test('review pictures made before an edit are refused', async () => {
  const root = scratchCopy();
  append(root, DOSSIER, '// an edit after the pictures were taken');
  refuses(await check(root), /the review pictures were made from different art, pages or fixtures/);
});

test('a review picture measured with a problem is refused', async () => {
  const root = scratchCopy();
  editJson(root, 'design/abilities/review/report.json', report => { report.shots[0].problems.push('the snapshots are not in seat order'); });
  refuses(await check(root), /insider-w390-rest\.png: the snapshots are not in seat order/);
});

test('an inventory page not made from the contract is refused', async () => {
  const root = scratchCopy();
  editJson(root, INVENTORY, inventory => { inventory.treatments.find(entry => entry.id === 'insider-file').title = 'Insider: the board'; });
  refuses(await check(root), /docs\/design\/abilities-inventory\.md is out of date/);
});
