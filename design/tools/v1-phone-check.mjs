// mothership:dev-only
//
// The checks of the phone-first V1 journey prototype that need no browser:
//   node design/tools/v1-phone-check.mjs
//   npm run check:v1-phone --workspace @mothership/design-tokens
//
// Each is a statement about files in this repository. None says anything about a phone,
// how the art looks, or whether people understand the screens. The browser measurements
// are design/tools/v1-phone-capture.mjs; this refuses captures made before an edit.

import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { planInventory, INVENTORY_PATH } from './v1-phone-docs.mjs';
import { v1PhoneInputsSha256 } from './lib/v1-phone-inputs.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const text = path => readFile(resolve(repoRoot, path), 'utf8');
const json = async path => JSON.parse(await text(path));
const failures = [];
const passed = [];
const check = (name, problems) => { if (problems.length === 0) passed.push(name); else for (const problem of problems) failures.push(`${name}: ${problem}`); };
async function filesUnder(path) {
  const entries = await readdir(resolve(repoRoot, path), { withFileTypes: true, recursive: true });
  return entries.filter(entry => entry.isFile()).map(entry => `${entry.parentPath ?? entry.path}/${entry.name}`.replace(`${repoRoot}/`, '')).sort();
}

const journey = await json('design/v1-phone/contract/journey.json');
const STATES = journey.screens.flatMap(screen => screen.states);
const fixtures = await import(pathToFileURL(resolve(repoRoot, 'design/v1-phone/js/fixtures.js')).href);
const ROLE_WORDS = ['Officer', 'Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Red Disabler', 'Alien'];
const END_STATES = new Set(['end.winner', 'end.draw', 'end.next', 'display.result']);

// ---------- The prototype is fenced as development material ----------
{
  const problems = [];
  const files = await filesUnder('design/v1-phone');
  for (const path of files) {
    if (path.endsWith('.png')) continue;
    const content = await text(path);
    if (!content.includes('mothership:dev-only')) problems.push(`${path}: no development-only mark`);
    if (content.includes('explorations/')) problems.push(`${path}: reaches into design/explorations/`);
    if (/\b(?:fetch|import)\s*\(?\s*['"`]https?:/.test(content)) problems.push(`${path}: loads something from the network`);
  }
  for (const path of ['design/tools/v1-phone-capture.mjs', 'design/tools/v1-phone-check.mjs', 'design/tools/v1-phone-docs.mjs', 'design/tools/v1-phone-flows.mjs', 'design/tools/lib/v1-phone-inputs.mjs']) {
    if (!(await text(path)).includes('mothership:dev-only')) problems.push(`${path}: no development-only mark`);
  }
  check('the prototype is development-only and reaches nowhere it should not', problems);
}

// ---------- The inventory is complete ----------
{
  const problems = [];
  const ids = STATES.map(state => state.id);
  if (new Set(ids).size !== ids.length) problems.push('a state id is used twice');
  const components = new Set(journey.components.map(component => component.id));
  if (components.size !== journey.components.length) problems.push('a component id is used twice');
  const priorities = journey.screens.map(screen => screen.priority).filter(Boolean).sort();
  if (JSON.stringify(priorities) !== '[1,2,3,4,5]') problems.push('the five priority screens are not all there, once each');
  for (const state of STATES) {
    for (const field of ['id', 'title', 'surface', 'audience', 'data', 'runtime', 'runtimeRef', 'components']) if (state[field] === undefined) problems.push(`${state.id}: no ${field}`);
    if (!Object.hasOwn(journey.runtimeLevels, state.runtime)) problems.push(`${state.id}: runtime ${state.runtime} is not a level`);
    if (state.runtime !== 'existing' && !state.gap) problems.push(`${state.id}: ${state.runtime} without a gap that says what is missing`);
    for (const source of state.data) if (!Object.hasOwn(journey.dataSources, source)) problems.push(`${state.id}: unknown data source ${source}`);
    for (const component of state.components) if (!components.has(component)) problems.push(`${state.id}: unknown component ${component}`);
    if (!['host', 'player', 'display', 'any'].includes(state.surface)) problems.push(`${state.id}: unknown surface`);
    if (!['public', 'host', 'private'].includes(state.audience)) problems.push(`${state.id}: unknown audience`);
    if (state.audience === 'private' && state.surface !== 'player') problems.push(`${state.id}: private content on a ${state.surface} surface`);
    if (state.audience === 'private' && !state.data.some(source => ['setupPreview', 'playerView', 'acknowledgments', 'local', 'receipt'].includes(source))) problems.push(`${state.id}: private state drawn from public data only`);
    if (['host', 'display'].includes(state.surface) && state.data.some(source => ['setupPreview', 'playerView', 'acknowledgments'].includes(source))) problems.push(`${state.id}: a host or display state drawn from a seat's private data`);
  }
  for (const component of journey.components) {
    if (component.audience === 'private' && component.surfaces.some(surface => surface !== 'player')) problems.push(`${component.id}: private component on a public surface`);
    if (!component.about || !component.hook) problems.push(`${component.id}: no hook or description`);
  }
  const used = new Set(STATES.flatMap(state => state.components));
  for (const component of components) if (!used.has(component)) problems.push(`${component}: in the registry and drawn by no state`);
  check('every state names its data, its runtime level, its gap and known components', problems);
}

// ---------- Every state has a fixture, and public fixtures carry nothing private ----------
{
  const problems = [];
  const fixtureIds = Object.keys(fixtures.FIXTURES).sort();
  const stateIds = STATES.map(state => state.id).sort();
  for (const id of stateIds) if (!fixtureIds.includes(id)) problems.push(`${id}: no fixture`);
  for (const id of fixtureIds) if (!stateIds.includes(id)) problems.push(`${id}: a fixture with no state in the inventory`);
  for (const state of STATES) {
    const fixture = fixtures.FIXTURES[state.id];
    if (!fixture) continue;
    if (fixture.surface !== state.surface) problems.push(`${state.id}: fixture surface ${fixture.surface} is not ${state.surface}`);
    if (state.audience !== 'private' && !END_STATES.has(state.id)) {
      const data = JSON.stringify(fixture.data);
      for (const word of ROLE_WORDS) if (new RegExp(`\\b${word}\\b`).test(data)) problems.push(`${state.id}: a public fixture holds the role word ${word}`);
      if (fixture.data.sheet) problems.push(`${state.id}: a public state opens the private card`);
    }
  }
  const code = fixtures.END_REVEAL.code;
  const role = n => fixtures.END_REVEAL.roles.find(seat => seat.n === n).role;
  if (!code.some(n => role(n) === 'Alien') || code.some(n => role(n) === 'Undercover')) problems.push('the synthetic Code must hold the Alien and not the Undercover, as the contract requires of a real one');
  check('every state has a fixture, and public fixtures carry nothing private', problems);
}

// ---------- Words quoted from the release are the release's words ----------
{
  const problems = [];
  if (JSON.stringify(journey.retiredReleaseKeys) !== JSON.stringify(fixtures.RETIRED_RELEASE_KEYS)) problems.push('the superseded quote registry differs between the inventory and fixtures');
  for (const key of journey.retiredReleaseKeys ?? []) if (Object.hasOwn(fixtures.RELEASE_COPY, key)) problems.push(`${key}: superseded release quote is still active`);
  for (const retired of journey.retiredStates ?? []) if (STATES.some(state => state.id === retired.id) || Object.hasOwn(fixtures.FIXTURES, retired.id)) problems.push(`${retired.id}: superseded state is still active`);
  for (const key of ['noRequests', 'chooseCharacter', 'selectionUnavailable', 'characterTaken', 'choiceUncertain', 'sameChoiceAgain', 'readyWaiting', 'tapToReveal', 'readyAgain']) if (!Object.hasOwn(fixtures.RELEASE_COPY, key)) problems.push(`${key}: required current release quote is missing`);
  const screens = await text('design/v1-phone/js/screens.js');
  const app = await text('design/v1-phone/js/app.js');
  for (const key of journey.retiredReleaseKeys ?? []) if (screens.includes(`say('${key}')`)) problems.push(`${key}: a screen renders a superseded quote`);
  if (/data-act['"]?: ?['"]confirm-crew|id: ['"]j-name|act: ['"]confirm-crew/.test(screens + app)) problems.push('the compact selection still has a name form or separate confirm control');
  if (/name: ['"]room['"]/.test(screens)) problems.push('the code-only join still asks the player to choose a starting room');
  for (const [key, [path, quote]] of Object.entries(fixtures.RELEASE_COPY)) {
    const source = await text(path).catch(() => null);
    if (source === null) problems.push(`${key}: ${path} does not exist`);
    else if (!source.includes(quote)) problems.push(`${key}: not found verbatim in ${path}: “${quote}”`);
  }
  const guide = await import(pathToFileURL(resolve(repoRoot, 'apps/game/hosted/role-guide.js')).href);
  if (JSON.stringify(guide.ROLE_GUIDE) !== JSON.stringify(Object.fromEntries(Object.keys(guide.ROLE_GUIDE).map(role => [role, fixtures.ROLE_GUIDE[role]])))) problems.push('ROLE_GUIDE differs from apps/game/hosted/role-guide.js');
  const catalog = await json('design/contract/crew-catalog.json');
  if (JSON.stringify(catalog.characters.map(entry => [entry.id, entry.callSign])) !== JSON.stringify(fixtures.CREW.map(entry => [entry.id, entry.sign]))) problems.push('CREW differs from design/contract/crew-catalog.json');
  const shell = await text('packages/presentation/src/markup/comic-shell.ts');
  for (const [role, look] of Object.entries(fixtures.ROLE_LOOK)) {
    if (!new RegExp(`'?${role}'?: \\{ device: '${look.device}', team: '${look.team}' \\}`).test(shell)) problems.push(`${role}: device or team differs from comic-shell.ts`);
  }
  check('quoted release words, role reminders, crew and role looks match the release', problems);
}

// ---------- The stylesheet keeps the design system's rules ----------
{
  const problems = [];
  const css = (await text('design/v1-phone/css/journey.css')).replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({ selector: match[1].trim(), body: match[2] }));
  for (const { selector, body } of rules) {
    if (selector.startsWith('@') || /^(from|to|\d+%)/.test(selector)) continue;
    const declarations = body.replace(/var\([^)]*\)/g, 'var()');
    if (/#[0-9a-f]{3,8}\b/i.test(declarations)) problems.push(`${selector}: a literal hex color`);
    if (/\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/.test(declarations)) problems.push(`${selector}: a functional color`);
    if (/(?:color|background|border|outline|fill|stroke|shadow)[^;]*:\s*[^;]*\b(?:black|white|red|green|blue|yellow|orange|purple|violet|pink|gray|grey|gold|teal)\b/i.test(declarations)) problems.push(`${selector}: a named color`);
    if (/--ms-asset-/.test(body) && !/\[data-art~="[\w-]+"\]/.test(selector)) problems.push(`${selector}: draws art without waiting for its bundle`);
    if (/--ms-asset-device-/.test(body) && !/\.j-private/.test(selector)) problems.push(`${selector}: a role's device outside .j-private`);
    if (/--ms-asset-device-/.test(body) && !/\[data-art~="roles"\]/.test(selector)) problems.push(`${selector}: a device drawn without the role bundle`);
    if (/\[data-(?:device|team)/.test(selector) && !selector.split(',').every(part => /\.j-private|\.j-swatch/.test(part))) problems.push(`${selector}: a role or team hook outside the private container`);
    if (/\binfinite\b|animation-iteration-count/.test(body)) problems.push(`${selector}: an animation that repeats`);
    if (/animation:[^;]*\bboth\b/.test(body) && !/!important/.test(body)) problems.push(`${selector}: an entrance that stays in effect (fill both) and can widen the page`);
  }
  if (!/\[data-motion="reduced"\][^{]*\*[^{]*\{[^}]*animation:\s*none\s*!important/.test(css)) problems.push('no reduced-motion rule that stops every animation');
  if (!/@media \(prefers-reduced-motion: reduce\)/.test(css)) problems.push('the device reduced-motion setting is not honored');
  check('the stylesheet takes colors from tokens, art from loaded bundles, keeps roles private and nothing repeats', problems);
}

// ---------- Captures are of these pages, and measured clean ----------
{
  const problems = [];
  const inputs = await v1PhoneInputsSha256(repoRoot);
  const index = await json('design/v1-phone/review/index.json').catch(() => null);
  const report = await json('design/v1-phone/review/report.json').catch(() => null);
  if (!index || !report) problems.push('no captures: run design/tools/v1-phone-capture.mjs');
  else {
    if (index.inputsSha256 !== inputs) problems.push('the captures were made from different pages or fixtures: run v1-phone-capture.mjs');
    if (report.inputsSha256 !== inputs) problems.push('the measurements were made on different pages or fixtures: run v1-phone-capture.mjs');
    if (report.failures.length) problems.push(`the capture report records ${report.failures.length} captures with problems`);
    for (const state of STATES) if (!index.images.some(image => image.state === state.id && image.file === `design/v1-phone/review/states/${state.id}.png`)) problems.push(`${state.id}: no screenshot`);
    for (const image of index.images) if (!(await readFile(resolve(repoRoot, image.file)).catch(() => null))) problems.push(`${image.file}: listed and missing`);
    const present = (await filesUnder('design/v1-phone/review')).filter(path => path.endsWith('.png'));
    for (const path of present) if (!index.images.some(image => image.file === path)) problems.push(`${path}: a stale picture not in the index`);
    for (const [label, test] of [['320', '320x'], ['360', '360x'], ['430', '430x'], ['short viewport', '390x600'], ['200% text', 'fontPx'], ['long names', 'names'], ['keyboard', '390x450'], ['desktop', '1280x']]) {
      if (!index.images.some(image => image.matrix && (test === 'fontPx' ? image.fontPx : test === 'names' ? image.names : image.viewport.startsWith(test)))) problems.push(`the viewport matrix has no ${label} capture`);
    }
  }
  check('screenshots, matrix and storyboards are current and measured clean', problems);
}

// ---------- Generated and hand-written documents cover the journey ----------
{
  const problems = [];
  const current = await text(INVENTORY_PATH).catch(() => null);
  if (current === null) problems.push(`${INVENTORY_PATH} is missing: run design/tools/v1-phone-docs.mjs`);
  else if (current !== await planInventory(repoRoot)) problems.push(`${INVENTORY_PATH} is out of date: run design/tools/v1-phone-docs.mjs`);
  const handoff = await text('docs/design/v1-phone-handoff.md').catch(() => '');
  for (const component of journey.components) if (!handoff.includes(`\`${component.id}\``)) problems.push(`v1-phone-handoff.md does not mention component ${component.id}`);
  const map = await text('docs/design/v1-phone-journey.md').catch(() => '');
  for (const state of STATES.filter(entry => entry.priority)) if (!map.includes(state.id)) problems.push(`v1-phone-journey.md does not mention priority state ${state.id}`);
  check('the inventory page is generated from the contract and the handoff names every component', problems);
}

for (const name of passed) console.log(`ok    ${name}`);
for (const failure of failures) console.error(`FAIL  ${failure}`);
console.log(`V1 phone checks: ${passed.length} passed, ${failures.length} failures; ${STATES.length} states, ${journey.components.length} components`);
if (failures.length) process.exitCode = 1;
