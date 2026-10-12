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
  for (const path of ['design/tools', 'design/board-motion/js', 'design/board-motion/css', 'design/board-motion/index.html', 'design/contract', 'docs/design/abilities-inventory.md',
    'packages/contracts/src', 'packages/presentation/src', 'apps/game/src', 'apps/game/hosted']) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    cpSync(join(repoRoot, path), join(root, path), { recursive: true });
  }
  // The review pictures are checked for being present and current: empty stand-ins keep the copy small.
  cpSync(join(repoRoot, 'design/abilities'), join(root, 'design/abilities'), { recursive: true, filter: source => !source.endsWith('.png') });
  for (const entry of readdirSync(join(repoRoot, 'design/abilities/review'), { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.png')) writeFileSync(join(root, 'design/abilities/review', entry.name), '');
  }
  // So are the board's pictures that the inventory cites (slice 7's movement, health and failure states).
  const inventory = JSON.parse(readFileSync(join(repoRoot, 'design/abilities/contract/abilities.json'), 'utf8'));
  for (const path of inventory.treatments.flatMap(entry => entry.review ?? []).filter(path => path.startsWith('design/board-motion/review/'))) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), '');
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
  assert.match(result.output, /Ability-art checks: 13 passed, 0 failing/);
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

// ---------- slice 3: the Rescue, the Disable and the Supply ----------

const TOOLS = 'design/abilities/js/tools.js';

test('Supply\'s tags filled in picking order are refused', async () => {
  const root = scratchCopy();
  edit(root, TOOLS, text => text.replace('const sorted = [...picks].sort((a, b) => a.n - b.n);', 'const sorted = [...picks];'));
  refuses(await check(root), /Supply's tags are not put in seat order/);
});

test('a Supplier\'s slip naming its players in the view\'s order is refused', async () => {
  const root = scratchCopy();
  edit(root, TOOLS, text => text.replace('const seats = [...result.recipients].sort((a, b) => a.n - b.n);', 'const seats = [...result.recipients];'));
  refuses(await check(root), /the Supplier's slip does not put its players in seat order/);
});

test('a recipient\'s slip that names its Supplier is refused', async () => {
  const root = scratchCopy();
  edit(root, TOOLS, text => text.replace('words: TOOLS_COPY.received(result.round) }', 'words: `${TOOLS_COPY.received(result.round)} From Player ${result.supplier}.` }'));
  refuses(await check(root), /a recipient's slip says more than the release/);
});

test('the Rescues said in other words than the release\'s are refused', async () => {
  const root = scratchCopy();
  edit(root, TOOLS, text => text.replace('rescues: count => `Rescues you have left: ${count}.`', 'rescues: count => `Rescues left: ${count}.`'));
  refuses(await check(root), /the Rescues are not said in the release's words/);
});

test('a kit that speaks of a recovery is refused', async () => {
  const root = scratchCopy();
  edit(root, TOOLS, text => text.replace("delivered: 'Delivered',", "delivered: 'Delivered',\n  healed: 'Healed',"));
  refuses(await check(root), /tools\.js speaks of a recovery or a hit/);
});

test('a Disable strip that depends on the role is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace(": kind === 'disable' ? cell({ spent: step === 'accepted' })", ": kind === 'disable' ? [cell({ spent: step === 'accepted' }), S.private.role]"));
  refuses(await check(root), /the Disable's strip depends on the role/);
});

test('a role\'s device drawn by the ability styles is refused', async () => {
  const root = scratchCopy();
  append(root, CSS, '.ab-cell[data-device="red-disabler"] { outline: 2px solid var(--ms-color-ink); }');
  refuses(await check(root), /abilities\.css draws a role's device/);
});

test('a vial emptied on the receipt rather than by the view\'s count is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace("now.kind === 'rescue' && now.rescues !== null && was.rescues !== null && now.rescues < was.rescues", "now.kind === 'rescue' && receipt"));
  refuses(await check(root), /a vial empties ahead of the view's count/);
});

// ---------- slice 4: the shot and Protection ----------

const GUARD = 'design/abilities/js/guard.js';

test('the weapons said in other words than the release\'s are refused', async () => {
  const root = scratchCopy();
  edit(root, GUARD, text => text.replace('weapons: count => `Ordinary weapons you hold: ${count}.`', 'weapons: count => `Weapons: ${count}.`'));
  refuses(await check(root), /the weapons are not said in the release's words/);
});

test('a Protection said in other words than the release\'s is refused', async () => {
  const root = scratchCopy();
  edit(root, GUARD, text => text.replace('protectionUsed: who => `Protection for ${who}: used up.`', 'protectionUsed: who => `${who} was saved by your Protection.`'));
  refuses(await check(root), /a Protection is not said in the release's words/);
});

test('Protection notes put in another order than the view\'s are refused', async () => {
  const root = scratchCopy();
  edit(root, GUARD, text => text.replace("return el('ul', { class: 'ab-guards' }, protections.map(", "return el('ul', { class: 'ab-guards' }, [...protections].sort((a, b) => a.seat.n - b.seat.n).map("));
  refuses(await check(root), /the Protection notes are reordered or filtered/);
});

test('a kit that works out whether a Protection is active is refused', async () => {
  const root = scratchCopy();
  edit(root, GUARD, text => text.replace('const used = protection.consumed === true;', 'const used = protection.consumed === true;\n    const active = protection.activeFromRound <= protection.round;'));
  refuses(await check(root), /guard\.js works out whether a Protection is active/);
});

test('a kit that speaks of an attack stopped is refused', async () => {
  const root = scratchCopy();
  edit(root, GUARD, text => text.replace('protectionUsed: who =>', "blocked: 'An attack was stopped.',\n  protectionUsed: who =>"));
  refuses(await check(root), /guard\.js speaks of an attack, a hit or a block/);
});

test('Protection notes drawn by role rather than from the view are refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace('    guardNotes(guards),', "    S.private.role === 'Undercover' ? guardNotes(guards) : null,"));
  refuses(await check(root), /the Protection notes depend on the role/);
});

test('a shot strip that depends on who shoots is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace(": kind === 'shot' && one ? target(one, 'reticle')", ": kind === 'shot' && one ? target(one, S.private.role === 'Officer' ? 'cross' : 'reticle')"));
  refuses(await check(root), /the shot's strip depends on who shoots/);
});

test('a round spent on the receipt rather than by the view\'s count is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace("now.kind === 'shot' && now.weapons !== null && was.weapons !== null && now.weapons < was.weapons", "now.kind === 'shot' && receipt"));
  refuses(await check(root), /a round is spent ahead of the view's count/);
});

test('a Protection that changes something public is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace('  S.private.intel = { ...(S.private.intel ?? {}), protections: list };', '  S.private.intel = { ...(S.private.intel ?? {}), protections: list };\n  S.public = { ...S.public, shielded: fact.seat };'));
  refuses(await check(root), /a Protection changes something public/);
});

// ---------- slice 5: the ballots, the release request, a Hack and Pass ----------

const BALLOT = 'design/abilities/js/ballot.js';

test('a Hack note in other words than the release\'s is refused', async () => {
  const root = scratchCopy();
  edit(root, BALLOT, text => text.replace('hackWith: seat => `Hack: you and Player ${seat}.`', 'hackWith: seat => `Hacking with Player ${seat}.`'));
  refuses(await check(root), /a Hack's note is not in the release's words/);
});

test('a Hack note that says who asked is refused', async () => {
  const root = scratchCopy();
  edit(root, BALLOT, text => text.replace("'data-partner': String(partner.n) }", "'data-partner': String(partner.n), 'data-asked': String(self.n) }"));
  refuses(await check(root), /a Hack's note says who asked/);
});

test('a kit that speaks of what may be said in a Hack is refused', async () => {
  const root = scratchCopy();
  edit(root, BALLOT, text => text.replace("hackWith: seat =>", "warning: 'Your partner may lie.',\n  hackWith: seat =>"));
  refuses(await check(root), /ballot\.js speaks of what may be said in a Hack/);
});

test('a kit that draws a count is refused', async () => {
  const root = scratchCopy();
  append(root, BALLOT, 'export const tallyMarks = counts => counts;');
  refuses(await check(root), /ballot\.js draws something of a count or of other ballots/);
});

test('a ballot drawn from the published count rather than the seat\'s own choice is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace("ballotSlip({ seat: one, vote: one ? 'for' : 'abstain' })", "ballotSlip({ seat: identity(S.public.tally?.selected) ?? one, vote: one ? 'for' : 'abstain' })"));
  refuses(await check(root), /a ballot is drawn from something other than the seat's own choice/);
});

test('a ballot posted before the server accepts it is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace("ballotBox({ posted: step === 'accepted' })", "ballotBox({ posted: step !== 'choosing' })"));
  refuses(await check(root), /a ballot is posted before the server accepts it/);
});

test('a microphone handed on before Pass is accepted is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace("speakingTurn({ passed: step === 'accepted' })", "speakingTurn({ passed: step !== 'confirming' })"));
  refuses(await check(root), /the microphone is handed on before Pass is accepted/);
});

test('a Hack note drawn by role rather than from the view\'s partner is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace('    partner ? hackLink(identity(VIEWER), partner) : null,', "    partner && S.private.role === 'Hacker' ? hackLink(identity(VIEWER), partner) : null,"));
  refuses(await check(root), /a Hack's note depends on something besides the view's partner/);
});

// ---------- slice 6: the showdown's special shot, and the end ----------

const FINALE = 'design/abilities/js/finale.js';

test('a showdown kit named for a role, or that speaks of the end, is refused', async () => {
  const root = scratchCopy();
  append(root, FINALE, "export const roundFor = { officer: 'gold' };\nexport const winnerRibbon = () => null;");
  refuses(await check(root), /finale\.js draws something by role or team: officer/, /finale\.js speaks of a hit or of the end/);
});

test('a special shot spent before its receipt is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace("specialShot({ spent: step === 'accepted' })", "specialShot({ spent: step !== 'choosing' })"));
  refuses(await check(root), /the special shot is drawn spent outside its receipt/);
});

test('a showdown strip that depends on who shoots is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace(": kind === 'showdown-shot' && one ? target(one, 'reticle')", ": kind === 'showdown-shot' && one ? target(one, S.private.role === 'Alien' ? 'shield' : 'reticle')"));
  refuses(await check(root), /the showdown's strip depends on who shoots/);
});

test('a result sheet that names the seat\'s own role from its view is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace("h('span', { class: 'bm-cast__label' }, label(entry.seat))", "h('span', { class: 'bm-cast__label' }, label(entry.seat), entry.seat === VIEWER ? S.private.role : null)"));
  refuses(await check(root), /the result sheet draws something private or from the ability kit/);
});

// ---------- slice 7: the marks in the tray, and the card kept out of date ----------

const DOSSIER_JS = 'design/abilities/js/dossier.js';

test('a tray action without its mark, or a mark drawn before its art, is refused', async () => {
  const root = scratchCopy();
  edit(root, CSS, text => text.replace(/\n\[data-art~="abilities"\] \.bm-chip__icon\[data-kind="rescue"\][^\n]*/, '')
    .replace('[data-art~="abilities"] .bm-chip__icon[data-kind="scan"]', '.bm-chip__icon[data-kind="scan"]'));
  refuses(await check(root), /the rescue chip has no mark/, /the scan chip's mark is drawn without waiting for its art/);
});

test('a card marked out of date when its time is merely up is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace('const stale = held && outOfDate();', 'const stale = held;'));
  refuses(await check(root), /the out-of-date mark is drawn for a view that is only timed out/);
});

test('a kept file that can still be inspected, or keeps its inspected snapshot, is refused', async () => {
  const root = scratchCopy();
  edit(root, DOSSIER_JS, text => text.replace("    if (photo && file.dataset.paused === 'true') return;\n", '').replace('    if (was) INSPECTORS.get(file)?.(null);\n', ''));
  refuses(await check(root), /a paused file can still be inspected/, /a paused file keeps an inspected snapshot or its motion/);
});

test('a card kept on an out-of-date view by default is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace("&& (!paused() || S.staleCard);", "&& true;"));
  refuses(await check(root), /the card is kept on an out-of-date view without S\.staleCard/);
});

// ---------- loading, hiding, and the production fence ----------

test('ability art loaded by role is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace("await new Promise(resolve => {\n    const link = h('link'", "if (S.private.role === 'Insider') await new Promise(resolve => {\n    const link = h('link'"));
  refuses(await check(root), /which art the prototype loads depends on something private/);
});

test('a hidden card that builds the private file is refused', async () => {
  const root = scratchCopy();
  edit(root, APP, text => text.replace('    fileNode = null;\n    if (keep(card,', '    fileNode = fileFor(S.private.intel?.insiderCandidates ?? []);\n    if (keep(card,'));
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

// ---------- slice 8: choosing a character, and the role card's reveal ----------

const SETUP_JS = 'design/abilities/js/setup.js';

test('a release word misquoted on the setup page is refused', async () => {
  const root = scratchCopy();
  edit(root, SETUP_JS, text => text.replace("taken: 'Taken. Choose another character.',", "taken: 'Taken! Pick another one.',"));
  refuses(await check(root), /SETUP_COPY\.taken is not the release's words/);
});

test('a role card built while the card is face down is refused', async () => {
  const root = scratchCopy();
  edit(root, SETUP_JS, text => text.replace('if (show && !card.firstChild) card.append(roleCard(S.role, S.character));', 'if (!card.firstChild) card.append(roleCard(S.role, S.character));'));
  refuses(await check(root), /the role card is built while it is face down/);
});

test('a card back drawn by role is refused', async () => {
  const root = scratchCopy();
  append(root, CSS, '[data-art~="abilities"] .phone-role-back[data-device="alien"] { background-color: var(--ms-color-caption); }');
  refuses(await check(root), /a card back is styled by role/);
});

test('a setup beat played on a load, or a turn off the reviewed cue, is refused', async () => {
  const root = scratchCopy();
  edit(root, SETUP_JS, text => text.replace("if (kind === 'update' && seen) {", 'if (seen) {').replace('export const TURN_BEATS = { opening: 220, accent: 520, settle: 160 };', 'export const TURN_BEATS = { opening: 220, accent: 600, settle: 160 };'));
  refuses(await check(root), /a setup beat plays on a load or a fresh view/, /the role card's turn is not the reviewed cue-role-card-turn's beats/);
});

test('an inventory page not made from the contract is refused', async () => {
  const root = scratchCopy();
  editJson(root, INVENTORY, inventory => { inventory.treatments.find(entry => entry.id === 'insider-file').title = 'Insider: the board'; });
  refuses(await check(root), /docs\/design\/abilities-inventory\.md is out of date/);
});
