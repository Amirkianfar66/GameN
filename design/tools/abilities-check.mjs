// mothership:dev-only
//
// Checks the ability-art proposal (design/abilities/): its art, its inventory, the Insider's file,
// and that its review pictures and generated page are current. Node built-ins only; no browser
// (design/tools/abilities-capture.mjs measures the rendered file and writes the report read here).
//
//   node design/tools/abilities-check.mjs

import { readFile, readdir, stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { planAbilityAssets } from './abilities-assets.mjs';
import { abilitiesInputsSha256 } from './lib/abilities-inputs.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const ROOT = 'design/abilities';
const text = path => readFile(resolve(repoRoot, path), 'utf8');
const exists = path => stat(resolve(repoRoot, path)).then(() => true, () => false);
const results = [];
const check = (name, problems) => results.push({ name, problems });
async function filesUnder(dir) {
  const found = [];
  for (const entry of await readdir(resolve(repoRoot, dir), { withFileTypes: true, recursive: true }).catch(() => [])) {
    if (entry.isFile()) found.push(relative(repoRoot, resolve(entry.parentPath ?? entry.path, entry.name)).split('\\').join('/'));
  }
  return found.sort();
}
const ROLES = ['Officer', 'Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Red Disabler', 'Alien'];
const ROLE_OR_TEAM = /\b(?:officer|insider|cracker|disabler|supplier|undercover|hacker|alien|blue|red)\b/i;

// ---------- The art is built from its editable sources ----------
const recipes = JSON.parse(await text(`${ROOT}/recipes.json`));
const { files, problems: buildProblems, manifest } = await planAbilityAssets();
{
  const problems = [...buildProblems];
  for (const [path, content] of files) {
    const onDisk = await text(path).catch(() => null);
    if (onDisk === null) problems.push(`${path}: missing: run design/tools/abilities-assets.mjs`);
    else if (onDisk !== content) problems.push(`${path}: not what design/tools/abilities-assets.mjs makes`);
  }
  for (const path of await filesUnder(`${ROOT}/assets`)) if (!files.has(path)) problems.push(`${path}: not made by the recipes`);
  check('the ability art is built from its editable sources, in the drawing vocabulary and the neutral palette', problems);
}

// ---------- The kit is neutral, versioned and accounted for ----------
{
  const problems = [];
  for (const asset of recipes.assets) {
    if (ROLE_OR_TEAM.test(asset.id) || ROLE_OR_TEAM.test(asset.layer)) problems.push(`${asset.id}: an asset of the shared kit is named after a role or a team`);
    if (asset.palette !== 'neutral') problems.push(`${asset.id}: not in the neutral palette`);
    for (const key of ['version', 'status', 'title', 'source', 'layer', 'viewBox', 'use', 'anchors']) if (!asset[key]) problems.push(`${asset.id}: says nothing of its ${key}`);
  }
  const neutral = recipes.palettes.neutral.colors;
  const forbidden = ['#70AFFF', '#FF8C8C', '#C4A4FF'];
  for (const color of forbidden) if (neutral.includes(color)) problems.push(`the neutral palette holds the team color ${color}`);
  if (!manifest.rights || !/Original/.test(manifest.rights)) problems.push('the manifest says nothing of rights and provenance');
  for (const entry of manifest.assets) for (const key of ['width', 'height', 'anchors', 'sha256', 'bytes', 'cssProperty']) if (entry[key] === undefined) problems.push(`${entry.id}: the manifest lacks ${key}`);
  if (!/whatever the seat's role/.test(manifest.bundle.loadPolicy)) problems.push('the manifest does not say the kit loads whatever the role');
  check('the kit is neutral, versioned, anchored and accounted for, with its rights', problems);
}

// ---------- The inventory covers every role and every shared moment ----------
const inventory = JSON.parse(await text(`${ROOT}/contract/abilities.json`));
const contract = await text('packages/contracts/src/full-game.ts');
const acknowledgments = await text('packages/contracts/src/own-acknowledgments.ts');
{
  const problems = [];
  const REQUIRED = ['insider-file', 'card-hidden', 'hacker-file', 'hacker-scan', 'hacker-code', 'alien-code-file', 'cracker-rescue', 'disabler', 'supplier-supply',
    'undercover-protection', 'ordinary-shot', 'officer-shot', 'alien-weapon', 'shared-selection', 'shared-role-card', 'shared-move', 'shared-target', 'shared-hack',
    'shared-pass', 'shared-votes', 'shared-health', 'shared-showdown', 'shared-end', 'shared-failure'];
  const ids = inventory.treatments.map(entry => entry.id);
  for (const id of REQUIRED) if (!ids.includes(id)) problems.push(`the inventory has no treatment ${id}`);
  for (const role of ROLES) if (!inventory.treatments.some(entry => entry.roles.some(name => name === role || name.includes(role)))) problems.push(`no treatment for the ${role}`);
  for (const entry of inventory.treatments) {
    for (const key of ['title', 'slice', 'status', 'roles', 'audience', 'trigger', 'fields', 'disclosure', 'concept', 'art', 'motion', 'states', 'copy']) if (entry[key] === undefined) problems.push(`${entry.id}: says nothing of its ${key}`);
    for (const form of ['normal', 'reduced', 'static', 'cancel', 'replay']) if (!entry.motion?.[form]) problems.push(`${entry.id}: no ${form} motion`);
    if (!['delivered', 'planned'].includes(entry.status)) problems.push(`${entry.id}: status ${entry.status} is neither delivered nor planned`);
    if (entry.status === 'delivered') for (const path of entry.review) if (!(await exists(path.split('?')[0]))) problems.push(`${entry.id}: its review ${path} does not exist`);
    // Every view field it reads is one the approved contracts carry.
    for (const field of entry.fields) {
      for (const match of field.matchAll(/\b(?:knowledge|self|legalTargets)\.(\w+)/g)) if (!contract.includes(match[1])) problems.push(`${entry.id}: reads ${match[0]}, which packages/contracts/src/full-game.ts does not carry`);
      for (const match of field.matchAll(/\b(supplierResults|receivedSupply|successfulRecipientSeatIds)\b/g)) if (!acknowledgments.includes(match[1])) problems.push(`${entry.id}: reads ${match[1]}, which the own acknowledgments do not carry`);
    }
  }
  if (inventory.base?.originalPowers !== 'off') problems.push('the inventory does not keep Original Powers off');
  check('the inventory covers every V1 role and every shared moment, from approved view fields, in five motion forms', problems);
}

// ---------- The Insider's file shows a set and never a mapping ----------
const functionBody = (source, name) => {
  const at = source.indexOf(`export function ${name}(`);
  if (at < 0) return '';
  const end = source.indexOf('\n}\n', at);
  return source.slice(at, end < 0 ? undefined : end);
};
{
  const problems = [];
  const source = await text(`${ROOT}/js/dossier.js`);
  const { ROLE_NAMES, FILE_MOTION } = await import(pathToFileURL(resolve(repoRoot, `${ROOT}/js/dossier.js`)).href);
  if (JSON.stringify(ROLE_NAMES) !== JSON.stringify(['Undercover', 'Alien', 'Cracker'])) problems.push('the three role names are not the fixed set Undercover, Alien, Cracker');
  if (!/\[\.\.\.candidates\]\.sort\(\(a, b\) => a\.n - b\.n\)/.test(source)) problems.push('the candidates are not put in seat order before they are drawn');
  // The snapshot is drawn alike for everyone: nothing of a role in it; the Insider's file draws it with no label tape.
  const snapshotBody = functionBody(source, 'snapshot');
  if (!snapshotBody || /ROLE_NAMES|roleName|data-role|Undercover|Alien|Cracker/.test(snapshotBody)) problems.push('a candidate is drawn with something of a role');
  const loop = source.slice(source.indexOf('for (const seat of suspects)'), source.indexOf('\n', source.indexOf('for (const seat of suspects)')));
  if (!loop || /ROLE_NAMES|tape|own:|data-role|Undercover|Alien|Cracker/.test(loop)) problems.push('a candidate is drawn with something of a role');
  if (/aria-describedby|aria-labelledby=\{?['"`]ab-roles/.test(snapshotBody)) problems.push('a candidate points at the role names');
  // The names are one picture with one accessible name: never a list a screen reader pairs with the candidates.
  if (!/role: 'img', 'aria-label': FILE_COPY\.roles/.test(source)) problems.push('the role names are not one group with one accessible name');
  if (/<ul|el\('ul'|el\('ol', \{ class: 'ab-roles/.test(source.slice(source.indexOf('const roles ='), source.indexOf('const note =')))) problems.push('the role names are a list');
  if (!(FILE_MOTION.total >= FILE_MOTION.stampOneEach + FILE_MOTION.stamp)) problems.push('the assembly ends before its last beat');
  // Every query tag swings at once; only the snapshots drop in seat order (a public order).
  if (!/for \(const query of file\.querySelectorAll\('\.ab-photo__query'\)\) \{\s*play\(query, [^;]*delay: M\.queriesFrom/.test(source)) problems.push('the query tags do not swing together');
  // The stylesheet: tokens, art behind loaded bundles, a tilt by position only, the board cue on the own board only.
  const css = await text(`${ROOT}/css/abilities.css`);
  if (/#[0-9a-fA-F]{3,8}\b/.test(css.replace(/\/\*[\s\S]*?\*\//g, ''))) problems.push('abilities.css writes a color that is not a token');
  for (const match of css.matchAll(/var\(--ab-asset-[\w-]+\)/g)) {
    const at = css.lastIndexOf('}', match.index), rule = css.slice(at + 1, match.index);
    if (!rule.includes('[data-art~="abilities"]')) problems.push(`abilities.css draws ${match[0]} without the abilities bundle having arrived`);
  }
  if (/\.ab-suspect\[data-seat|\.ab-photo\[data-seat|\[data-character="c\d"\][^{]*\{[^}]*(?:border|outline|rotate)/.test(css)) problems.push('abilities.css styles one candidate apart from the others');
  for (const match of css.matchAll(/[^{}]*\.bm-piece[^{}]*\{/g)) if (!match[0].includes('[data-board="own"]')) problems.push('abilities.css draws a board cue outside the own board');
  check('the Insider\'s file shows three players and three roles as a set, never a mapping', problems);
}

// ---------- The Hacker's and the Alien's files, and the Code attempt, say what is authorized and no more ----------
{
  const problems = [];
  const source = await text(`${ROOT}/js/intel.js`);
  // A wrong Scan carries nothing of the Code; a right one at most one mark, from inCode.
  const print = functionBody(source, 'printout');
  const wrong = print.slice(print.indexOf('if (!scan.matched) {'), print.indexOf('} else {', print.indexOf('if (!scan.matched) {')));
  if (!wrong || /codeMark\(|inCode|Code/.test(wrong)) problems.push('a wrong Scan shows something of the Code');
  if (!/HACKER_COPY\.scan\(scan\.round, who, scan\.guess\)/.test(print)) problems.push('a Scan result is not said in the release words');
  // The Scans are shown in the view's order: never sorted, never filtered by result.
  const hacker = functionBody(source, 'hackerFile');
  if (/\.sort\(|\.filter\(/.test(hacker)) problems.push('the Hacker\'s file reorders or filters the Scan results');
  // The Alien's Code: one unordered set, in seat order, with no numbering but seat numbers.
  const alien = functionBody(source, 'alienFile');
  if (!/\[\.\.\.code\]\.sort\(\(a, b\) => a\.n - b\.n\)/.test(alien)) problems.push('the Alien\'s Code is not put in seat order before it is drawn');
  if (/el\('ol'/.test(alien) || /index \+ 1|\bfirst\b|position/i.test(alien)) problems.push('the Alien\'s Code is drawn as an ordered list');
  // A Code attempt's picks fill the card in seat order, whatever order they were picked in.
  if (!/\[\.\.\.picks\]\.sort\(\(a, b\) => a\.n - b\.n\)/.test(functionBody(source, 'codeCard'))) problems.push('the Code card is not filled in seat order');
  // On the board, a set's picks are marked alike; in the strip they are named in seat order.
  const board = await text('design/board-motion/js/board.js');
  if (/String\(pick \+ 1\)/.test(board)) problems.push('a set\'s picks are numbered on the board');
  const app = await text('design/board-motion/js/app.js');
  if (!/const unordered = kind === 'code' \|\| kind === 'supply';\s*const listed = unordered \? \[\.\.\.seats\]\.sort\(\(a, b\) => a - b\) : seats;/.test(app)) problems.push('the strip does not name a set\'s picks in seat order');
  check('the Hacker\'s and the Alien\'s files and the Code attempt say what is authorized, as sets in seat order', problems);
}

// ---------- The Rescue, the Disable and the Supply: the release's words, sets in seat order, and never a result on a receipt ----------
{
  const problems = [];
  const source = await text(`${ROOT}/js/tools.js`);
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const { TOOLS_COPY } = await import(pathToFileURL(resolve(repoRoot, `${ROOT}/js/tools.js`)).href);
  const en = await text('packages/presentation/src/copy/en.ts');
  const shell = await text('packages/presentation/src/markup/comic-shell.ts');
  // The words are the release's: its knowledge sentence for the Rescues, and the comic shell's acknowledgments.
  if (TOOLS_COPY.rescues(2) !== 'Rescues you have left: 2.' || !en.includes('`Rescues you have left: ${count}.`')) problems.push('the Rescues are not said in the release\'s words');
  for (const words of [TOOLS_COPY.supplyResults, TOOLS_COPY.suppliedNone, TOOLS_COPY.historyUnavailable]) if (!shell.includes(`'${words}'`)) problems.push(`not the release's words: ${words}`);
  if (TOOLS_COPY.supplied('Player 1 and Player 8') !== 'Your Round 3 Supply granted one weapon each to Player 1 and Player 8.' || !shell.includes('`Your Round 3 Supply granted one weapon each to ${')) problems.push('the Supplier\'s slip is not in the release\'s words');
  if (TOOLS_COPY.received(3) !== 'You received one ordinary weapon from Supply in Round 3.' || !shell.includes('`You received one ordinary weapon from Supply in Round ${result.round}.`')) problems.push('a recipient\'s slip is not in the release\'s words');
  // Sets in seat order: Supply's two picks, and the players a Supplier's slip names.
  if (!/const sorted = \[\.\.\.picks\]\.sort\(\(a, b\) => a\.n - b\.n\);/.test(functionBody(source, 'supplyTags'))) problems.push('Supply\'s tags are not put in seat order');
  const deliveriesBody = functionBody(source, 'deliveries');
  if (!/const seats = \[\.\.\.result\.recipients\]\.sort\(\(a, b\) => a\.n - b\.n\);/.test(deliveriesBody)) problems.push('the Supplier\'s slip does not put its players in seat order');
  // A recipient's slip says what the release says and names no Supplier: its words and its one tag, the recipient's own.
  const received = deliveriesBody.slice(deliveriesBody.indexOf('...received.map('), deliveriesBody.indexOf('\n', deliveriesBody.indexOf('...received.map(')));
  if (!received.includes('words: TOOLS_COPY.received(result.round) }') || !received.includes('seats: self ? [self] : []') || /supplier|recipients|seatId|\$\{/i.test(received.replace('`received:${result.round}`', ''))) problems.push('a recipient\'s slip says more than the release');
  // Nothing in the kit is a role's, and nothing in it speaks of a recovery or a hit.
  if (ROLE_OR_TEAM.test(code)) problems.push('tools.js draws something by role or team: ' + code.match(ROLE_OR_TEAM)[0]);
  if (/\b(heal|heals|healed|healthy|recover|recovers|recovered|injur|disabled|hit)\w*/i.test(code)) problems.push('tools.js speaks of a recovery or a hit');
  // In the prototype: the Disable's strip never depends on the role; a vial empties only when the view's count falls;
  // the Rescues are drawn only while one is left; the unavailable history only for the Supplier, as the release does.
  const app = await text('design/board-motion/js/app.js');
  const strip = app.slice(app.indexOf('function stripContent()'), app.indexOf('function confirmText()'));
  if (/S\.private\.role|ROLE_LOOK|device/.test(strip)) problems.push('the Disable\'s strip depends on the role');
  if (!/now\.kind === 'rescue' && now\.rescues !== null && was\.rescues !== null && now\.rescues < was\.rescues/.test(app)) problems.push('a vial empties ahead of the view\'s count');
  if (!/rescues > 0 \? rescueKit\(rescues\) : null/.test(app)) problems.push('the card draws the Rescues when none is left');
  if (!/unavailable: acks\.historyAvailable === false && S\.private\.role === 'Supplier'/.test(app)) problems.push('the unavailable history is not the Supplier\'s alone');
  const css = await text(`${ROOT}/css/abilities.css`);
  if (/data-device|--ms-asset-device-/.test(css)) problems.push('abilities.css draws a role\'s device');
  check('the Rescue, the Disable and the Supply say what is authorized, in the release\'s words, sets in seat order, never a result on a receipt', problems);
}

// ---------- The shot and Protection: the release's words, one strip for every seat that shoots, Protection the Undercover's alone ----------
{
  const problems = [];
  const source = await text(`${ROOT}/js/guard.js`);
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const { GUARD_COPY } = await import(pathToFileURL(resolve(repoRoot, `${ROOT}/js/guard.js`)).href);
  const en = await text('packages/presentation/src/copy/en.ts');
  // The words are the release's knowledge sentences, with its "yourself" for the seat's own.
  if (GUARD_COPY.weapons(1) !== 'Ordinary weapons you hold: 1.' || !en.includes('`Ordinary weapons you hold: ${count}.`')) problems.push('the weapons are not said in the release\'s words');
  if (GUARD_COPY.protectionFrom('Player 5', 3) !== 'Protection for Player 5: active from round 3.' || !en.includes('`Protection for ${who}: active from round ${round}.`')
    || GUARD_COPY.protectionUsed('yourself') !== 'Protection for yourself: used up.' || !en.includes('`Protection for ${who}: used up.`')) problems.push('a Protection is not said in the release\'s words');
  const notes = functionBody(source, 'guardNotes');
  if (!/protection\.self \? 'yourself' : `Player \$\{protection\.seat\.n\}`/.test(notes) || !en.includes("(isSelf ? 'yourself' : `Player ${seat}`)")) problems.push('a Protection\'s player is not named as the release names it');
  // Every Protection the view carries, in its order; whether its round has come is not worked out, as the release does not.
  if (/\.sort\(|\.filter\(/.test(notes)) problems.push('the Protection notes are reordered or filtered');
  if (/activeFromRound\s*[<>]|[<>]=?\s*[\w.]*activeFromRound|\bround\b\s*[<>]/.test(code)) problems.push('guard.js works out whether a Protection is active');
  // Nothing in the kit is a role's, and nothing in it speaks of an attack, a hit or a block.
  if (ROLE_OR_TEAM.test(code)) problems.push('guard.js draws something by role or team: ' + code.match(ROLE_OR_TEAM)[0]);
  if (/\b(shooter|attack|block|stopped|saved|hit|injur|eliminat|damage)\w*/i.test(code)) problems.push('guard.js speaks of an attack, a hit or a block');
  // In the prototype: the notes come from the seat's own view, never its role; every seat's shot strip is drawn from its target
  // and the view's count alone; a round is spent only when the view's count falls; a Protection's grant and use change nothing public.
  const app = await text('design/board-motion/js/app.js');
  const drawCard = app.slice(app.indexOf('function drawCard()'), app.indexOf('function drawMenu()'));
  const guardsLine = drawCard.slice(drawCard.indexOf('const guards ='), drawCard.indexOf('\n', drawCard.indexOf('const guards =')));
  if (!/^const guards = \(S\.private\.intel\?\.protections \?\? \[\]\)\.map\(/.test(guardsLine)) problems.push('the Protection notes are not drawn from the view');
  if (/S\.private\.role/.test(guardsLine) || !/\n\s+guardNotes\(guards\),/.test(drawCard)) problems.push('the Protection notes depend on the role');
  if (!/typeof weapons === 'number' \? weaponsNote\(weapons\) : null/.test(drawCard)) problems.push('the weapons note is not drawn for every count the view says');
  const strip = app.slice(app.indexOf('function stripContent()'), app.indexOf('function confirmText()'));
  if (strip.split('\n').some(line => line.includes("kind === 'shot'") && /S\.private\.role|ROLE_LOOK|device|officer|undercover|alien/i.test(line))) problems.push('the shot\'s strip depends on who shoots');
  if (!/kind === 'shot' && one \? target\(one, 'reticle'\)/.test(strip)) problems.push('the shot\'s strip does not draw its target in the reticle');
  if (!/rounds\(weapons, \{ spent: step === 'accepted' \? Math\.max\(0, \(S\.flow\.weaponsAtSend \?\? weapons\) - weapons\) : 0 \}\)/.test(strip)) problems.push('a round is drawn spent outside an accepted shot');
  if (!/now\.kind === 'shot' && now\.weapons !== null && was\.weapons !== null && now\.weapons < was\.weapons/.test(app)) problems.push('a round is spent ahead of the view\'s count');
  const privateFact = app.slice(app.indexOf('function deliverPrivate('), app.indexOf('function deliver(fact)'));
  if (!privateFact || /S\.public(?!\.round\b)|cue|director|deliver\(/.test(privateFact.replace(/\/\*[\s\S]*?\*\//g, ''))) problems.push('a Protection changes something public');
  check('the shot and Protection say what is authorized, in the release\'s words: one strip for every seat that shoots, Protection the Undercover\'s alone', problems);
}

// ---------- The ballots, the release request, a Hack and Pass: the seat's own choice, never a count, the same for every role ----------
{
  const problems = [];
  const source = await text(`${ROOT}/js/ballot.js`);
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const { BALLOT_COPY } = await import(pathToFileURL(resolve(repoRoot, `${ROOT}/js/ballot.js`)).href);
  const en = await text('packages/presentation/src/copy/en.ts');
  // The Hack's note in the release's words, the same for both partners: it says nothing of who asked.
  if (BALLOT_COPY.hackWith(5) !== 'Hack: you and Player 5.' || !en.includes('`Hack: you and Player ${seat}.`')) problems.push("a Hack's note is not in the release's words");
  if (/requester|actor|asked|active/i.test(functionBody(source, 'hackLink'))) problems.push("a Hack's note says who asked");
  // Nothing in the kit is a role's, nothing speaks of what may be said in a Hack (that depends on a role), and nothing draws a count.
  if (ROLE_OR_TEAM.test(code)) problems.push('ballot.js draws something by role or team: ' + code.match(ROLE_OR_TEAM)[0]);
  if (/\b(truth|truthful|lie|lies|lying|liar|honest|bluff)\w*/i.test(code)) problems.push('ballot.js speaks of what may be said in a Hack');
  if (/count|tally|\bvotes\b|ownBallot|eligible/i.test(code)) problems.push('ballot.js draws something of a count or of other ballots');
  // In the prototype: a ballot drawn from the seat's own choice and the vote's subject alone, posted only once accepted; the
  // microphone handed on only once Pass is accepted; a Hack's note from the view's partner alone, its cord run once a Hack.
  const app = await text('design/board-motion/js/app.js');
  const strip = app.slice(app.indexOf('function stripContent()'), app.indexOf('function confirmText()'));
  const ballotLines = strip.split('\n').filter(line => /ballotSlip\(|ballotBox\(|speakingTurn\(/.test(line));
  if (!/kind === 'vote' && \(one \|\| picked\[0\] === 'none'\) \? ballotSlip\(\{ seat: one, vote: one \? 'for' : 'abstain' \}\)/.test(strip)
    || !/kind === 'release-vote' && \['yes', 'no', 'none'\]\.includes\(picked\[0\]\) \? ballotSlip\(\{ seat: identity\(S\.public\.ballot\?\.release\), vote: picked\[0\] === 'none' \? 'abstain' : picked\[0\] \}\)/.test(strip)
    || ballotLines.some(line => /tally|ownBallot|S\.private\.role/.test(line))) problems.push("a ballot is drawn from something other than the seat's own choice");
  if (!/ballotBox\(\{ posted: step === 'accepted' \}\)/.test(strip)) problems.push('a ballot is posted before the server accepts it');
  if (!/speakingTurn\(\{ passed: step === 'accepted' \}\)/.test(strip)) problems.push('the microphone is handed on before Pass is accepted');
  if (!/if \(receipt && \(now\.kind === 'vote' \|\| now\.kind === 'release-vote'\)\) post\(/.test(app) || !/if \(receipt && now\.kind === 'pass'\) handOn\(/.test(app)) problems.push('a ballot is posted, or the microphone handed on, other than on its receipt');
  const drawCard = app.slice(app.indexOf('function drawCard()'), app.indexOf('function drawMenu()'));
  if (!/const partner = S\.private\.hackPartner \? identity\(S\.private\.hackPartner\) : null;/.test(drawCard) || !/\n\s+partner \? hackLink\(identity\(VIEWER\), partner\) : null,/.test(drawCard)) problems.push("a Hack's note depends on something besides the view's partner");
  if (!/if \(!linksShown\.has\(key\) && !reducedNow\(\)\) connect\(/.test(drawCard)) problems.push("a Hack's cord runs again for a Hack this page has shown");
  check("the ballots, the release request, a Hack and Pass draw the seat's own choice in the release's words, never a count, the same for every role", problems);
}

// ---------- Private art loads whole, whatever the role; nothing private reaches a public surface ----------
{
  const problems = [];
  const app = await text('design/board-motion/js/app.js');
  const loadArt = app.slice(app.indexOf('async function loadArt()'), app.indexOf('function fixturePanel()')).replace(/\/\/[^\n]*/g, '');
  if (!loadArt.includes('abilities.art.css')) problems.push('the prototype does not load the ability art with its other bundles');
  if (/\brole\b|S\.private/.test(loadArt)) problems.push('which art the prototype loads depends on something private');
  const drawCard = app.slice(app.indexOf('function drawCard()'), app.indexOf('function drawMenu()'));
  if (!/if \(!privateVisible\(\)\) \{[\s\S]*?closedFolder\(/.test(drawCard)) problems.push('a hidden card does not show the closed folder');
  if (/insiderFile|fileFor/.test(drawCard.slice(drawCard.indexOf('if (!privateVisible())'), drawCard.indexOf('// Built only while open')))) problems.push('the hidden card builds the private file');
  for (const dir of ['apps/game/src', 'apps/game/hosted', 'packages/presentation/src']) {
    for (const path of await filesUnder(dir)) if ((await text(path)).includes('design/abilities')) problems.push(`${path}: production code refers to the ability-art prototype`);
  }
  for (const path of await filesUnder(ROOT)) {
    if (!/\.(?:js|mjs|css|json|html|md)$/.test(path) || path.startsWith(`${ROOT}/assets/`) || path.startsWith(`${ROOT}/review/`)) continue;
    if (!(await text(path)).includes('mothership:dev-only')) problems.push(`${path}: no development-only mark`);
  }
  check('private art loads whole whatever the role, the hidden card holds nothing private, and nothing production reaches the prototype', problems);
}

// ---------- The review pictures and the generated page are current ----------
{
  const problems = [];
  const report = JSON.parse(await text(`${ROOT}/review/report.json`).catch(() => 'null'));
  if (!report) problems.push(`${ROOT}/review/report.json is missing: run design/tools/abilities-capture.mjs`);
  else {
    if (report.inputsSha256 !== await abilitiesInputsSha256()) problems.push('the review pictures were made from different art, pages or fixtures: run design/tools/abilities-capture.mjs');
    for (const shot of report.shots) {
      if (!(await exists(shot.file))) problems.push(`${shot.file}: missing`);
      for (const problem of shot.problems) problems.push(`${shot.file}: ${problem}`);
    }
  }
  const { planInventoryDoc } = await import(pathToFileURL(resolve(repoRoot, 'design/tools/abilities-docs.mjs')).href);
  const doc = await planInventoryDoc();
  if ((await text(doc.path).catch(() => null)) !== doc.content) problems.push(`${doc.path} is out of date: run design/tools/abilities-docs.mjs`);
  check('the review pictures are current and measured clean, and the inventory page is generated from the contract', problems);
}

let failures = 0;
for (const { name, problems } of results) {
  if (problems.length === 0) console.log(`ok    ${name}`);
  else for (const problem of problems) { failures += 1; console.log(`FAIL  ${name}: ${problem}`); }
}
console.log(`Ability-art checks: ${results.filter(result => result.problems.length === 0).length} passed, ${results.filter(result => result.problems.length).length} failing; ${recipes.assets.length} assets, ${inventory.treatments.length} treatments (${inventory.treatments.filter(entry => entry.status === 'delivered').length} delivered)`);
process.exitCode = failures ? 1 : 0;
