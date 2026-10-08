// mothership:dev-only
//
// The checks of the board-motion prototype (design/board-motion/, issue #87) that need no browser:
//   node design/tools/board-motion-check.mjs
//   npm run check:board-motion --workspace @mothership/design-tokens
//
// Each is a statement about files in this repository. None says anything about a phone, how
// the art looks, or whether people understand the board. The browser measurements are
// design/tools/board-motion-capture.mjs and the clicked flows design/tools/board-motion-flows.mjs;
// this refuses captures made before an edit. The release's words are compared with the built
// @mothership/presentation (run `npm run build` first).

import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { planAssets } from './board-motion-assets.mjs';
import { planCoverage, COVERAGE_PATH } from './board-motion-docs.mjs';
import { boardMotionInputsSha256 } from './lib/board-motion-inputs.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const text = path => readFile(resolve(repoRoot, path), 'utf8');
const json = async path => JSON.parse(await text(path));
const failures = [];
const passed = [];
const check = (name, problems) => { if (problems.length === 0) passed.push(name); else for (const problem of problems) failures.push(`${name}: ${problem}`); };
async function filesUnder(path) {
  const entries = await readdir(resolve(repoRoot, path), { withFileTypes: true, recursive: true }).catch(() => []);
  return entries.filter(entry => entry.isFile()).map(entry => `${entry.parentPath ?? entry.path}/${entry.name}`.replace(`${repoRoot}/`, '')).sort();
}
const load = path => import(pathToFileURL(resolve(repoRoot, path)).href);

const ROLE_WORDS = ['Officer', 'Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Red Disabler', 'Alien'];
const TOOLS = ['design/tools/board-motion-assets.mjs', 'design/tools/board-motion-capture.mjs', 'design/tools/board-motion-check.mjs', 'design/tools/board-motion-docs.mjs',
  'design/tools/board-motion-flows.mjs', 'design/tools/lib/board-motion-inputs.mjs'];
const coverage = await json('design/board-motion/contract/coverage.json');
const cues = await json('design/board-motion/contract/cues.json');
const stations = await json('design/board-motion/contract/stations.json');
// The prototype's own modules run here in Node. One that does not load is refused by name below,
// after the fence check, which reads files as text and so still says why.
let fixtures = null, layout = null, loadError = null;
try {
  fixtures = await load('design/board-motion/js/fixtures.js');
  layout = await load('design/board-motion/js/layout.js');
} catch (error) {
  loadError = error;
}
const cueIds = new Set(cues.cues.map(cue => cue.id));
const scenarioIds = new Set(fixtures?.SCENARIOS.map(entry => entry.id) ?? []);

// ---------- The prototype is fenced as development material ----------
{
  const problems = [];
  for (const path of await filesUnder('design/board-motion')) {
    if (path.endsWith('.png')) {
      if (!path.startsWith('design/board-motion/review/')) problems.push(`${path}: a picture outside review/`);
      continue;
    }
    const content = await text(path);
    // The prop layers are art for a later export revision: generated, checked below, not development code.
    if (!/^design\/board-motion\/assets\/[\w.-]+\.svg$/.test(path) && !content.includes('mothership:dev-only')) problems.push(`${path}: no development-only mark`);
    if (content.includes('explorations/')) problems.push(`${path}: reaches into design/explorations/`);
    if (/\b(?:fetch|import)\s*\(?\s*['"`]https?:|url\(\s*['"]?https?:|(?:src|href)=["']https?:/.test(content)) problems.push(`${path}: loads something from the network`);
    if (/(?:from|import\()\s*['"][^'"]*\/(?:apps|packages)\//.test(content)) problems.push(`${path}: imports production code`);
  }
  for (const path of TOOLS) if (!(await text(path).catch(() => '')).includes('mothership:dev-only')) problems.push(`${path}: no development-only mark`);
  // Nothing in the production frontend reaches the prototype, its fixtures or its controls.
  for (const dir of ['apps/game/src', 'apps/game/hosted', 'packages/presentation/src']) {
    for (const path of await filesUnder(dir)) if ((await text(path)).includes('board-motion')) problems.push(`${path}: production code refers to the board-motion prototype`);
  }
  check('the prototype is development-only and reaches nowhere it should not', problems);
}

// ---------- The prototype's modules load ----------
check('the prototype\'s modules load', loadError ? [`design/board-motion/js/ does not load in Node: ${String(loadError.message).split('\n')[0]}`] : []);
if (loadError) {
  for (const name of passed) console.log(`ok    ${name}`);
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  console.log(`Board-motion checks: ${passed.length} passed, ${failures.length} failures; the rest need the prototype's modules`);
  process.exit(1);
}

// ---------- The prop layers are lifted from the approved sources; the reviewed kit is untouched ----------
{
  const problems = [];
  for (const [path, content] of await planAssets(repoRoot)) {
    if ((await text(path).catch(() => null)) !== content) problems.push(`${path}: not what design/tools/board-motion-assets.mjs makes from the approved sources: run it`);
  }
  const manifest = await json('design/board-motion/assets/manifest.json');
  const reviewed = await json('design/exports/asset-manifest.json');
  const runtime = await text('apps/game/hosted/comic-assets.mjs');
  if (manifest.baseManifest !== reviewed.manifestVersion) problems.push(`the prop layers are proposed against ${manifest.baseManifest}, the reviewed manifest is ${reviewed.manifestVersion}`);
  if (!runtime.includes(`'${reviewed.manifestVersion}'`)) problems.push(`the runtime does not load the reviewed manifest ${reviewed.manifestVersion}: the kit it reads has changed`);
  if (manifest.status !== 'proposal') problems.push('the prop layers are not marked as a proposal');
  for (const asset of manifest.assets) {
    if (asset.audience !== 'public') problems.push(`${asset.id}: a prop layer that is not public art`);
    if (reviewed.assets?.some(entry => entry.id === asset.proposedExportVariant || entry.file === asset.file)) problems.push(`${asset.id}: already in the reviewed manifest`);
  }
  check('the prop layers are made from the approved sources, and the reviewed kit is the one the runtime loads', problems);
}

// ---------- Every action and every command of the release is covered ----------
{
  const problems = [];
  const actions = await text('packages/presentation/src/model/actions.ts');
  const kinds = actions.match(/ACTION_KINDS[^=]*=\s*\[([^\]]*)\]/)?.[1].match(/'([^']+)'/g)?.map(quoted => quoted.slice(1, -1)) ?? [];
  const contract = await text('packages/contracts/src/full-game.ts');
  const block = contract.slice(contract.indexOf('FullCommandSchema'), contract.indexOf('FullCommandRequestSchema'));
  const commands = [...block.matchAll(/type: z\.literal\('([A-Z_]+)'\)/g)].map(match => match[1]);
  if (kinds.length === 0 || commands.length === 0) problems.push('could not read ACTION_KINDS or FullCommandSchema');
  const covered = coverage.actions.map(action => action.kind);
  for (const kind of kinds) if (!covered.includes(kind)) problems.push(`action ${kind} of the release is not covered`);
  for (const kind of covered) if (!kinds.includes(kind)) problems.push(`action ${kind} is not an action of the release`);
  for (const command of commands) if (!coverage.actions.some(action => action.command === command)) problems.push(`command ${command} is not covered`);
  const factions = contract.match(/FactionSchema = z\.enum\(\[([^\]]*)\]/)?.[1].match(/'([^']+)'/g)?.map(quoted => quoted.slice(1, -1)) ?? [];
  for (const action of coverage.actions) {
    for (const field of ['offers', 'board', 'self', 'hospitalJail', 'public']) if (!action[field]) problems.push(`${action.kind}: no ${field}`);
    for (const cue of action.cues) if (!cueIds.has(cue)) problems.push(`${action.kind}: unknown cue ${cue}`);
    if (action.scenarios.length === 0) problems.push(`${action.kind}: no scenario`);
    for (const id of action.scenarios) if (!scenarioIds.has(id)) problems.push(`${action.kind}: no scenario ${id}`);
    if (!['move', 'pass', 'release-vote'].includes(action.kind) && !action.cues.includes('cue-target-eligible')) problems.push(`${action.kind}: names players and has no eligible cue`);
  }
  const scan = coverage.actions.find(action => action.kind === 'scan');
  if (JSON.stringify(scan?.inline) !== JSON.stringify(factions)) problems.push(`the Scan's answers are not the contract's factions (${factions.join(', ')})`);
  if (coverage.actions.find(action => action.kind === 'move')?.cues.includes('cue-tray-open')) problems.push('Move is in the tray: it is a room tag only');
  check('every action and command of the release is covered, with cues and scenarios', problems);
}

// ---------- Every cue states its trigger, audience, facts, anchor, timing, end and reduced form ----------
{
  const problems = [];
  const reviewed = await json('design/contract/motion-cues.json');
  const tokens = await json('packages/design-tokens/src/tokens-0.4.0.json');
  if (cueIds.size !== cues.cues.length) problems.push('a cue id is used twice');
  for (const cue of cues.cues) {
    for (const field of ['id', 'status', 'level', 'audience', 'trigger', 'facts', 'anchor', 'durationMs', 'cancellation', 'settled', 'reduced', 'asset']) if (cue[field] === undefined || cue[field] === '') problems.push(`${cue.id}: no ${field}`);
    if (!['local', 'private', 'public'].includes(cue.audience)) problems.push(`${cue.id}: unknown audience ${cue.audience}`);
    if (!['interaction', 'game_event', 'phase_or_finale', 'layout'].includes(cue.level)) problems.push(`${cue.id}: unknown level ${cue.level}`);
    if (cue.audience !== 'public' && cue.level !== 'interaction') problems.push(`${cue.id}: a ${cue.audience} cue that is not an interaction`);
    if (cue.durationMs > tokens.motionMs.comicBeatMaximum) problems.push(`${cue.id}: longer than the comic beat maximum`);
    if (cue.durationMs > 0 && !cue.token) problems.push(`${cue.id}: a duration that is no token`);
    if (cue.token) {
      const [group, name] = cue.token.split('.');
      if (tokens[group]?.[name] !== cue.durationMs) problems.push(`${cue.id}: ${cue.token} is ${tokens[group]?.[name]} ms in tokens 0.4.0, not ${cue.durationMs}`);
    }
    if (cue.status === 'authorized') {
      const source = reviewed.cues.find(entry => entry.id === cue.reviewed?.split('#')[1]);
      if (!source) problems.push(`${cue.id}: authorized without a reviewed cue`);
      else if (source.durationMs !== cue.durationMs || source.level !== cue.level) problems.push(`${cue.id}: differs from the reviewed ${source.id}`);
    } else if (cue.status !== 'proposal') problems.push(`${cue.id}: status ${cue.status}`);
    if (cue.audience === 'public' && /legalTargets|receipt|knowledge|ownBallot|hackPartner|own view|own tap|own choice/i.test(cue.facts)) problems.push(`${cue.id}: a public cue rests on a private fact`);
    if (/\b(?:sound|audio|vibrat|haptic)/i.test(`${cue.asset} ${cue.settled}`)) problems.push(`${cue.id}: a sound or vibration`);
  }
  const used = new Set([...coverage.actions.flatMap(action => action.cues), ...coverage.vocabulary.states.map(state => state.cue).filter(Boolean), ...coverage.facts.list.flatMap(fact => fact.cues)]);
  for (const id of cueIds) if (!used.has(id)) problems.push(`${id}: drawn for no action, state or fact`);
  for (const fact of coverage.facts.list) {
    for (const id of fact.cues) if (!cueIds.has(id)) problems.push(`fact ${fact.id}: unknown cue ${id}`);
    for (const id of fact.cues) if (fact.audience === 'public' && cues.cues.find(cue => cue.id === id)?.audience !== 'public') problems.push(`fact ${fact.id}: a public fact drawn by the ${id} cue, which is not public`);
  }
  if (!cues.notProduced.some(item => /BANG|projectile/i.test(item.what))) problems.push('the list of cues not produced does not exclude a cause drawn on a health change');
  check('every cue states its trigger, audience, facts, anchor, timing, end and reduced form', problems);
}

// ---------- Nine characters, eleven states, the same rules for all ----------
{
  const problems = [];
  const catalog = await json('design/contract/crew-catalog.json');
  if (JSON.stringify(catalog.characters.map(entry => [entry.id, entry.callSign])) !== JSON.stringify(fixtures.CREW.map(entry => [entry.id, entry.sign]))) problems.push('CREW differs from design/contract/crew-catalog.json');
  for (const entry of fixtures.CREW) {
    if (!(entry.hop >= 2 && entry.hop <= 12)) problems.push(`${entry.id}: a lift outside 2 to 12 px`);
    if (!(Math.abs(entry.settle) <= 4)) problems.push(`${entry.id}: a settle beyond 4 degrees`);
  }
  const states = coverage.vocabulary.states.map(state => state.id);
  const required = ['idle', 'pressed-focused', 'eligible', 'selected', 'multi-selected', 'pending', 'accepted-registration', 'rejected-unavailable', 'authoritative-movement', 'public-status-change', 'active-turn'];
  for (const id of required) if (!states.includes(id)) problems.push(`no vocabulary state ${id}`);
  for (const state of coverage.vocabulary.states) if (state.cue && !cueIds.has(state.cue)) problems.push(`${state.id}: unknown cue ${state.cue}`);
  const shell = await text('packages/presentation/src/markup/comic-shell.ts');
  const app = await text('design/board-motion/js/app.js');
  for (const role of ROLE_WORDS) {
    const look = app.match(new RegExp(`'?${role}'?: \\['([\\w-]+)', '(\\w+)'\\]`));
    if (!look || !new RegExp(`'?${role}'?: \\{ device: '${look[1]}', team: '${look[2]}' \\}`).test(shell)) problems.push(`${role}: device or team differs from comic-shell.ts`);
  }
  check('nine characters in eleven states, the release\'s crew and role looks', problems);
}

// ---------- Every room seats nine without a capacity, every target its own place ----------
{
  const problems = [];
  // The content width of a panel on a 320 px phone: the Command Room spans the board, the others half of it.
  const PANEL_PX = { 'command-room': 306, other: 141 };
  if (stations.crowd.slots.length !== 9) problems.push('the crowd formation does not have nine places');
  const key = place => `${place.at?.[0]}:${place.at?.[1]}`;
  for (const room of layout.ROOMS) {
    const spec = stations.rooms[room];
    const ids = Object.keys(spec.stations);
    const used = new Set();
    for (let count = 1; count <= 5; count += 1) {
      const formation = spec.formations[String(count)];
      if (!formation || formation.length !== count || new Set(formation).size !== count || formation.some(id => !ids.includes(id))) problems.push(`${room}: no formation of ${count} distinct stations`);
      for (const id of formation ?? []) used.add(id);
    }
    for (const id of ids) if (!used.has(id)) problems.push(`${room}: station ${id} is in no formation`);
    const width = PANEL_PX[room] ?? PANEL_PX.other;
    for (let count = 1; count <= 9; count += 1) {
      const seats = Array.from({ length: count }, (_, index) => ({ n: index + 1, location: layout.LOCATION_OF[room] }));
      const placed = [...layout.placements(stations, seats).values()];
      if (placed.length !== count) { problems.push(`${room}: ${count} characters, ${placed.length} placed`); continue; }
      const standing = placed.filter(place => place.kind === 'stand');
      if (new Set(standing.map(key)).size !== standing.length) problems.push(`${room}: two of ${count} characters share a place`);
      for (const place of standing) if (!(place.at[0] * width >= 22 && (1 - place.at[0]) * width >= 22)) problems.push(`${room}: a place whose 44 px target leaves the panel, for ${count}`);
      // Within a row, neighbours at least one 44 px target apart on the smallest phone. Rows are a row unit (at least 44 px) apart.
      const rows = new Map();
      for (const place of standing) rows.set(place.at[1], [...(rows.get(place.at[1]) ?? []), place.at[0]].sort((a, b) => a - b));
      for (const [rowIndex, xs] of rows) for (let i = 1; i < xs.length; i += 1) if ((xs[i] - xs[i - 1]) * width < 44) problems.push(`${room}: two places in row ${rowIndex} ${Math.round((xs[i] - xs[i - 1]) * width)} px apart at 320 px, for ${count}`);
      if (layout.rowsFor(stations, room, count) > 3) problems.push(`${room}: more than three rows for ${count}`);
    }
  }
  check('every room seats one to nine with no capacity, each at its own place', problems);
}

// ---------- The release's words are the release's words ----------
{
  const problems = [];
  const { COPY, RELEASE_TEXT, PROPOSED } = await load('design/board-motion/js/copy.js');
  let en = null;
  try { ({ en } = await load('packages/presentation/dist/copy/en.js')); } catch { problems.push('packages/presentation/dist/copy/en.js is missing: run npm run build'); }
  if (en) {
    const SECTIONS = { phase: en.phase, timer: en.timer, marker: en.marker, actions: en.actions, privateArea: en.privateArea, banner: en.banner, tally: en.vote.tally, announce: en.announce, roster: en.roster };
    const SAMPLES = [[3, false], [4, true], ['Player 4', 'Blue'], [null, null], [1], [2, 9]];
    const same = (mine, theirs, path) => {
      if (typeof mine === 'function') {
        if (typeof theirs !== 'function') { problems.push(`${path}: the release has no such function`); return; }
        for (const args of SAMPLES) {
          const a = (() => { try { return mine(...args); } catch { return 'throws'; } })();
          const b = (() => { try { return theirs(...args); } catch { return 'throws'; } })();
          if (a !== b) { problems.push(`${path}(${args.join(', ')}): “${a}”, the release says “${b}”`); return; }
        }
      } else if (mine && typeof mine === 'object') {
        if (!theirs || typeof theirs !== 'object') { problems.push(`${path}: the release has no such words`); return; }
        for (const [key, value] of Object.entries(mine)) same(value, theirs[key], `${path}.${key}`);
      } else if (mine !== theirs) problems.push(`${path}: “${mine}”, the release says “${theirs}”`);
    };
    for (const [key, value] of Object.entries(COPY)) same(value, SECTIONS[key] ?? en.action[key], key);
  }
  for (const [key, [path, quote]] of Object.entries(RELEASE_TEXT)) {
    const source = await text(path).catch(() => null);
    if (source === null) problems.push(`${key}: ${path} does not exist`);
    else if (!source.includes(quote)) problems.push(`${key}: not found verbatim in ${path}: “${quote}”`);
  }
  const proposed = JSON.stringify(Object.fromEntries(Object.entries(PROPOSED).map(([key, value]) => [key, typeof value === 'function' ? value(3, 4) : value])));
  for (const word of ROLE_WORDS) if (new RegExp(`\\b${word}\\b`).test(proposed)) problems.push(`a proposed word names the role ${word}`);
  check('the release\'s words are quoted exactly, and new words are listed as proposals', problems);
}

// ---------- Public fixtures carry nothing private, events nothing but public facts ----------
{
  const problems = [];
  for (const entry of fixtures.SCENARIOS) {
    const state = entry.s();
    const publicPart = JSON.stringify(state.public);
    for (const word of ROLE_WORDS.filter(role => role !== 'Alien')) if (new RegExp(`\\b${word}\\b`).test(publicPart)) problems.push(`${entry.id}: the public state names the role ${word}`);
    for (const key of ['role', 'offers', 'legalTargets', 'knowledge', 'hackPartner', 'ownBallot', 'protections']) if (new RegExp(`"${key}"`).test(publicPart)) problems.push(`${entry.id}: the public state holds ${key}`);
    for (const seat of state.public.seats) if (seat.revealedFaction && seat.health !== 'Eliminated') problems.push(`${entry.id}: Player ${seat.n} has a revealed faction and is not Eliminated`);
    if (state.public.seats.length !== state.public.playerCount || ![7, 8, 9].includes(state.public.playerCount)) problems.push(`${entry.id}: not a 7, 8 or 9 player roster`);
    const offers = state.private.offers;
    const seats = new Set(state.public.seats.map(seat => seat.n));
    for (const [kind, offer] of Object.entries(offers)) {
      const list = Array.isArray(offer) ? offer : offer?.targets;
      if (Array.isArray(list) && kind !== 'move' && list.some(n => !seats.has(n))) problems.push(`${entry.id}: ${kind} offers a seat that is not in the match`);
    }
    for (const kind of ['shot', 'disable', 'hack']) if (Array.isArray(offers[kind]) && offers[kind].includes(fixtures.VIEWER)) problems.push(`${entry.id}: ${kind} offers the player's own seat`);
    for (const kind of ['shot', 'disable', 'protect', 'hack', 'scan', 'supply']) {
      if (!Array.isArray(offers[kind])) continue;
      const own = state.public.seats.find(seat => seat.n === fixtures.VIEWER).location;
      for (const n of offers[kind]) {
        const where = state.public.seats.find(seat => seat.n === n).location;
        if (where !== own || where === 'Command Room') problems.push(`${entry.id}: ${kind} offers Player ${n} in ${where}, which the engine never offers from ${own}`);
      }
    }
  }
  const allowed = new Set(['PUBLIC_MOVE', 'PUBLIC_HEALTH_CHANGED', 'PHASE_CHANGED', 'VIEW_CAPTAIN', 'REPLAY', 'RECONNECT']);
  for (const event of fixtures.EVENTS) {
    if (!allowed.has(event.fact.type)) problems.push(`event ${event.id}: ${event.fact.type} is not a public fact`);
    for (const key of Object.keys(event.fact)) if (/attacker|shooter|source|cause|weapon|giver|by|from|actor|protect/i.test(key)) problems.push(`event ${event.id}: carries ${key}`);
  }
  if (!fixtures.SYNTHETIC_LABEL || !/synthetic/i.test(fixtures.SYNTHETIC_LABEL)) problems.push('the fixtures are not labeled synthetic');
  check('public fixtures carry nothing private, offers are what the engine could offer, events are public facts', problems);
}

// ---------- The stylesheet keeps the design system's rules and the secrets ----------
{
  const problems = [];
  const css = (await text('design/board-motion/css/board.css')).replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({ selector: match[1].trim(), body: match[2] }));
  const PRIVATE = /\[data-target|\.bm-piece__target|\.bm-piece__pick|\.bm-ghost/;
  for (const { selector, body } of rules) {
    if (selector.startsWith('@') || /^(from|to|\d+%)/.test(selector)) continue;
    const declarations = body.replace(/var\([^)]*\)/g, 'var()');
    if (/#[0-9a-f]{3,8}\b/i.test(declarations)) problems.push(`${selector}: a literal hex color`);
    if (/\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/.test(declarations)) problems.push(`${selector}: a functional color`);
    if (/(?:color|background|border|outline|fill|stroke|shadow)[^;]*:\s*[^;]*\b(?:black|white|red|green|blue|yellow|orange|purple|violet|pink|gray|grey|gold|teal)\b/i.test(declarations)) problems.push(`${selector}: a named color`);
    if (/--ms-asset-/.test(body) && !/\[data-art~="[\w-]+"\]/.test(selector)) problems.push(`${selector}: draws art without waiting for its bundle`);
    if (/--bm-asset-/.test(body) && !/\[data-art~="board-motion"\]/.test(selector)) problems.push(`${selector}: draws a prop layer without waiting for it`);
    if (/--ms-asset-device-/.test(body) && !(/\.bm-private/.test(selector) && /\[data-art~="roles"\]/.test(selector))) problems.push(`${selector}: a role's device outside the private card`);
    if (/\[data-(?:device|team)/.test(selector) && !selector.split(',').every(part => /\.bm-private/.test(part))) problems.push(`${selector}: a role or team hook outside the private card`);
    if (/\binfinite\b|animation-iteration-count/.test(body)) problems.push(`${selector}: an animation that repeats`);
    if (/\b\d+(?:\.\d+)?m?s\b/.test(body.replace(/var\([^)]*\)/g, '')) && /animation|transition/.test(body)) problems.push(`${selector}: a duration that is not a token`);
    // A private cue is drawn only on the viewer's own board, whatever else the page holds.
    const drawsSomething = body.split(';').map(part => part.split(':')[0].trim()).filter(Boolean).some(property => !['animation', 'transition', 'translate'].includes(property));
    if (drawsSomething) for (const part of selector.split(',')) if (PRIVATE.test(part) && !/\[data-board="own"\]/.test(part)) problems.push(`${part.trim()}: a private cue drawn outside the viewer's own board`);
    // A rule keyed by a character sets only its picture: no character gets a rule of its own.
    if (/\[data-character=/.test(selector) && body.split(';').map(part => part.split(':')[0].trim()).filter(Boolean).some(property => property !== 'background-image')) problems.push(`${selector}: a character with a rule of its own`);
  }
  if (!/\[data-motion="reduced"\][^{]*\*[^{]*\{[^}]*animation:\s*none\s*!important/.test(css)) problems.push('no reduced-motion rule that stops every animation');
  if (!/@media \(prefers-reduced-motion: reduce\)/.test(css)) problems.push('the device reduced-motion setting is not honored');
  if (!/\.bm-fx\s*\{[^}]*pointer-events:\s*none/.test(css)) problems.push('the cue layer can take a tap');
  check('the stylesheet takes colors from tokens and art from loaded bundles, keeps private cues on the own board, and nothing repeats', problems);
}

// ---------- Captures are of these pages, and measured clean ----------
{
  const problems = [];
  const inputs = await boardMotionInputsSha256(repoRoot);
  const index = await json('design/board-motion/review/index.json').catch(() => null);
  const report = await json('design/board-motion/review/report.json').catch(() => null);
  if (!index || !report) problems.push('no captures: run design/tools/board-motion-capture.mjs');
  else {
    if (index.inputsSha256 !== inputs) problems.push('the captures were made from different pages or fixtures: run board-motion-capture.mjs');
    if (report.inputsSha256 !== inputs) problems.push('the measurements were made on different pages or fixtures: run board-motion-capture.mjs');
    if (report.failures.length) problems.push(`the capture report records ${report.failures.length} captures with problems`);
    for (const id of scenarioIds) if (!index.images.some(image => image.state === id && image.file === `design/board-motion/review/states/${id}.png`)) problems.push(`${id}: no screenshot`);
    for (const image of index.images) if (!(await readFile(resolve(repoRoot, image.file)).catch(() => null))) problems.push(`${image.file}: listed and missing`);
    for (const path of (await filesUnder('design/board-motion/review')).filter(file => file.endsWith('.png'))) if (!index.images.some(image => image.file === path)) problems.push(`${path}: a stale picture not in the index`);
    const matrix = index.images.filter(image => image.matrix);
    for (const [label, test] of [['320 x 568', image => image.viewport === '320x568'], ['360 wide', image => image.viewport.startsWith('360x')], ['430 wide', image => image.viewport.startsWith('430x')],
      ['200% text', image => image.fontPx === 32], ['150% text', image => image.fontPx === 24], ['long names', image => image.names === 'long' || /long-names/.test(image.state ?? '')],
      ['reduced motion', image => image.motion === 'reduced'], ['desktop', image => image.viewport.startsWith('1280x')], ['all nine reachable in one room at 320 x 568', image => image.viewport === '320x568' && image.state === 'crowd.vote'],
      ['all nine reachable in one room at 390 x 844', () => index.images.some(image => image.state === 'crowd.vote' && image.viewport === '390x844')], ['seven players', image => image.state === 'board.seven'], ['eight players', image => image.state === 'board.eight']]) {
      if (!matrix.some(test)) problems.push(`the viewport matrix has no ${label} capture`);
    }
    const motion = new Set(index.storyboard.flatMap(board => [board.cue, ...(board.also ?? [])]));
    for (const cue of cues.cues) if (cue.durationMs > 0 && cue.id !== 'layout-reflow' && !motion.has(cue.id)) problems.push(`${cue.id}: a motion with no storyboard`);
    if (!index.images.some(image => image.file === 'design/board-motion/review/vocabulary.png')) problems.push('no vocabulary sheet');
    if (index.images.filter(image => image.secrecy).length < 6) problems.push('fewer than six secrecy pairs');
  }
  check('screenshots, the viewport matrix, storyboards and secrecy pairs are current and measured clean', problems);
}

// ---------- The generated page is current, and the handoff names every cue and component ----------
{
  const problems = [];
  const current = await text(COVERAGE_PATH).catch(() => null);
  if (current === null) problems.push(`${COVERAGE_PATH} is missing: run design/tools/board-motion-docs.mjs`);
  else if (current !== await planCoverage(repoRoot)) problems.push(`${COVERAGE_PATH} is out of date: run design/tools/board-motion-docs.mjs`);
  const handoff = await text('docs/design/board-motion-handoff.md').catch(() => '');
  if (!handoff) problems.push('docs/design/board-motion-handoff.md is missing');
  for (const component of coverage.components.list) if (!handoff.includes(`\`${component.id}\``)) problems.push(`the handoff does not name component ${component.id}`);
  for (const cue of cues.cues) if (!handoff.includes(cue.id) && !current?.includes(cue.id)) problems.push(`neither page names ${cue.id}`);
  for (const gap of coverage.gaps.list) if (!handoff.includes(gap.id)) problems.push(`the handoff does not name ${gap.id}`);
  const verification = await text('docs/design/board-motion-verification.md').catch(() => '');
  if (!verification) problems.push('docs/design/board-motion-verification.md is missing');
  check('the coverage page is generated from the contracts, and the handoff names every component and gap', problems);
}

for (const name of passed) console.log(`ok    ${name}`);
for (const failure of failures) console.error(`FAIL  ${failure}`);
console.log(`Board-motion checks: ${passed.length} passed, ${failures.length} failures; ${coverage.actions.length} actions, ${cues.cues.length} cues, ${fixtures.SCENARIOS.length} scenarios`);
if (failures.length) process.exitCode = 1;
