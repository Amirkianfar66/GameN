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
