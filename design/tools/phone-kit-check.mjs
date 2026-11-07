// mothership:dev-only
//
// The checks of the phone kit (design/phone-kit/, issue #121) that need no browser:
//   node design/tools/phone-kit-check.mjs
//   npm run check:phone-kit --workspace @mothership/design-tokens
//
// Each is a statement about files in this repository: the exports are what their sources draw; the
// room clothes follow the public location only and leave the crew figure byte for byte as it was;
// the private Hack reads no role and treats the three sides alike; the vote result shows only the
// published aggregate; the words are the release's where they say so; nothing repeats; the frozen
// drawing ports are untouched; and the captures are current and measured clean. None of it says
// anything about a phone, how the art looks, or whether people understand it. The release's words
// are compared with the built @mothership/presentation (run `npm run build` first).

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { KIT_VERSION, planAssets } from './phone-kit-assets.mjs';
import { phoneKitInputsSha256 } from './lib/phone-kit-inputs.mjs';
import { REVIEWED_DRAWING_PORTS } from './lib/drawing-port-fence.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const text = path => readFile(resolve(repoRoot, path), 'utf8');
const json = async path => JSON.parse(await text(path));
const load = path => import(pathToFileURL(resolve(repoRoot, path)).href);
const sha = content => createHash('sha256').update(content).digest('hex');
const failures = [], passed = [];
const check = (name, problems) => { if (problems.length === 0) passed.push(name); else for (const problem of problems) failures.push(`${name}: ${problem}`); };
/** Source text without comments and string literals: what the code itself reads. */
const codeOnly = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1').replace(/`(?:\\.|[^`\\])*`/g, '``').replace(/'(?:\\.|[^'\\\n])*'/g, "''").replace(/"(?:\\.|[^"\\\n])*"/g, '""');
const ROLE_WORDS = ['Officer', 'Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Red Disabler'];
const FACTION_COLORS = ['#70AFFF', '#FF8C8C', '#C4A4FF'];

const { CREW } = await load('design/board-motion/figures/crew.mjs');
const { GESTURES, skeletonOf } = await load('design/board-motion/figures/gestures.mjs');
const { figureSvg } = await load('design/board-motion/figures/body.mjs');
const wardrobe = await load('design/board-motion/figures/wardrobe.mjs');
const { SCENES } = await load('design/board-motion/scenes/index.mjs');
const art = await load('design/phone-kit/source/art.mjs');
const contract = await json('design/phone-kit/contract/phone-kit.json');

// ---------- The exports are what their sources draw ----------
{
  const problems = [];
  const { files, manifest } = await planAssets(repoRoot);
  for (const [file, content] of files) {
    const disk = await text(`design/phone-kit/assets/${file}`).catch(() => null);
    if (disk === null) problems.push(`design/phone-kit/assets/${file} is missing: run design/tools/phone-kit-assets.mjs`);
    else if (disk !== content) problems.push(`design/phone-kit/assets/${file} differs from what its sources draw: run design/tools/phone-kit-assets.mjs`);
  }
  if (manifest.version !== KIT_VERSION || contract.version !== KIT_VERSION) problems.push('the manifest, the contract and the exporter name different versions');
  if (manifest.wardrobeVersion !== wardrobe.WARDROBE_VERSION || manifest.artVersion !== art.ART_VERSION) problems.push('the manifest names another wardrobe or art version');
  for (const entry of manifest.art) if (!/^[0-9a-f]{64}$/.test(entry.sha256) || !entry.audience) problems.push(`${entry.id}: no hash or audience`);
  for (const entry of manifest.art.filter(item => item.audience === 'public')) if (entry.colors.some(color => FACTION_COLORS.includes(color))) problems.push(`${entry.id}: a public picture in a faction's color`);
  check('the exports and the manifest are what the sources draw, each with its hash and audience', problems);
}

// ---------- The room clothes: the public location only; the crew figure unchanged ----------
{
  const problems = [];
  const gestures = [...Object.keys(GESTURES), ...Object.values(SCENES).flatMap(scene => scene.slots.flatMap(slot => [`${slot.gesture}+injured`, slot.down ?? 'down']))];
  let compared = 0;
  for (const id of Object.keys(CREW)) {
    for (const gesture of new Set(gestures)) {
      const sk = skeletonOf(gesture);
      for (const layer of ['body', 'front']) {
        compared += 1;
        if (wardrobe.dressedFigureSvg(CREW[id], sk, { outfit: 'crew', prefix: 'q', layer }) !== figureSvg(CREW[id], sk, { prefix: 'q', layer })) problems.push(`${id} ${gesture} ${layer}: the crew suit is not body.mjs's figure byte for byte`);
      }
      for (const outfit of ['gown', 'prison']) {
        const dressed = wardrobe.dressedFigureSvg(CREW[id], sk, { outfit, prefix: 'q' });
        if (dressed === figureSvg(CREW[id], sk, { prefix: 'q' })) problems.push(`${id} ${gesture}: the ${outfit} draws nothing different`);
        // The person is the same: the character's own skin and hair colors are in every outfit.
        const own = [...new Set([...figureSvg(CREW[id], sk, { prefix: 'q' }).matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map(match => match[1].toUpperCase()))];
        const skin = String(CREW[id].skin ?? '').toUpperCase();
        if (skin && own.includes(skin) && !dressed.toUpperCase().includes(skin)) problems.push(`${id} ${gesture} ${outfit}: the character's skin is gone`);
      }
    }
  }
  const expected = { Hospital: 'gown', Jail: 'prison', 'Room A': 'crew', 'Room B': 'crew', 'Command Room': 'crew', 'Final Zone': 'crew' };
  for (const [location, outfit] of Object.entries(expected)) if (wardrobe.outfitFor(location) !== outfit) problems.push(`outfitFor('${location}') is not '${outfit}'`);
  const rule = /export const outfitFor = ([^\n]+)/.exec(await text('design/board-motion/figures/wardrobe.mjs'))?.[1] ?? '';
  if (!/^location =>/.test(rule) || /\b(?:health|jailed|captain|role|team|faction|side|revealed|eliminated)\b/i.test(codeOnly(rule))) problems.push('outfitFor reads something other than the public location');
  for (const path of ['design/board-motion/js/dress.js', 'design/phone-kit/js/vote-result.js']) {
    const calls = [...codeOnly(await text(path)).matchAll(/outfitFor\(([^)]*)\)/g)].map(match => match[1]);
    // A seat's public location, or a room's (LOCATION_OF: a room id's public name).
    for (const call of calls) if (!/location\b|^LOCATION_OF\[/.test(call)) problems.push(`${path}: outfitFor(${call}) is not given a public location`);
  }
  const code = codeOnly(await text('design/board-motion/figures/wardrobe.mjs'));
  if (/\b(?:role|team|faction|device|jailed|captain|revealedFaction|health)\b/.test(code)) problems.push('wardrobe.mjs reads a game fact');
  if (compared < Object.keys(CREW).length * 40) problems.push(`only ${compared} crew figures were compared`);
  check(`the clothes follow the public location only, and the crew suit is body.mjs's figure byte for byte (${Object.keys(CREW).length} characters, every gesture, both layers)`, problems);
}

// ---------- The private Hack: no role read, the three sides alike, nothing kept ----------
{
  const problems = [];
  const source = await text('design/phone-kit/js/hack.js');
  // An element's ARIA role (role: 'group') is not a game role.
  const code = codeOnly(source).replace(/\brole: ''/g, '');
  if (/\b(?:role|team|faction|device|truth|verified|actualFaction|knowledge|intel)\b/.test(code)) problems.push('hack.js reads a role, a faction, a truth or other private knowledge');
  if (/\bfetch\(|import\(|new Image|\.src\s*=/.test(code)) problems.push('hack.js requests something: its pictures must be built in, alike for every phone');
  const { hackModel, HACK_WORDS, SIDES, HACK_WINDOWS, CLAIM_BEATS } = await load('design/phone-kit/js/hack.js');
  if (JSON.stringify(SIDES) !== JSON.stringify(['Blue', 'Red', 'Alien'])) problems.push('the sides are not Blue, Red, Alien in that order');
  if (HACK_WINDOWS.declareMaxMs !== 15000 || HACK_WINDOWS.resultMs !== 5000 || HACK_WINDOWS.talkMs !== 60000) problems.push('the windows are not 15 s, 5 s and 60 s (Backend\'s proposal)');
  if (CLAIM_BEATS.exit[1] !== HACK_WINDOWS.resultMs || Object.values(CLAIM_BEATS).some(([from, to]) => from < 0 || to > HACK_WINDOWS.resultMs || to <= from)) problems.push('a claim beat falls outside its five seconds');
  if (HACK_WORDS.none !== 'No side declared') problems.push('no declaration is not said in the owner\'s words, "No side declared"');
  const seats = [1, 2, 3, 4, 5].map(n => ({ n, name: `P${n}`, character: `c${n}` }));
  // Feedback bound to its phase: the phase's id as phaseId, the exchange's hackId (packages/design-tokens/test/phone-kit-hack.test.mjs has the whole table).
  const phase = kind => ({ kind, id: `phase-${kind}` });
  const feedback = (status, declaredSide = null, kind = status === 'AWAITING_DECLARATION' ? 'HACK_DECLARE' : 'HACK_RESULT') => ({ hackId: 'h', phaseId: `phase-${kind}`, status, declaredSide });
  const target = hackModel({ phase: phase('HACK_DECLARE'), initiator: 5, viewer: 3, feedback: feedback('AWAITING_DECLARATION'), partner: 5, canDeclare: true, seats });
  if (!target?.canDeclare || target.audience !== 'target') problems.push('the target is not offered the declaration');
  const lying = hackModel({ phase: phase('HACK_RESULT'), initiator: 3, viewer: 3, feedback: feedback('DECLARED', 'Red'), partner: 5, seats });
  if (lying?.declared !== 'Red' || lying.audience !== 'initiator') problems.push('the initiator does not see the declared side as declared');
  const none = hackModel({ phase: phase('HACK_RESULT'), initiator: 3, viewer: 3, feedback: feedback('NO_DECLARATION'), partner: 5, seats });
  if (!none || none.declared !== null) problems.push('no declaration is drawn as a side, or not drawn');
  for (const [what, given] of [['a side that is not one of the three', feedback('DECLARED', 'Purple')], ['DECLARED without a side', feedback('DECLARED', null)], ['a side without DECLARED', feedback('NO_DECLARATION', 'Blue')]]) {
    if (hackModel({ phase: phase('HACK_RESULT'), initiator: 3, viewer: 3, feedback: given, partner: 5, seats }) !== null) problems.push(`${what} is drawn (never as "No side declared" either)`);
  }
  if (hackModel({ phase: phase('HACK_RESULT'), initiator: 3, viewer: 3, feedback: { ...feedback('DECLARED', 'Red'), phaseId: 'phase-obsolete' }, partner: 5, seats }) !== null) problems.push('feedback from another phase is drawn');
  if (hackModel({ phase: phase('HACK'), initiator: 3, viewer: 3, feedback: feedback('DECLARED', 'Red'), partner: 5, seats }) !== null) problems.push('feedback from the exchange\'s earlier phase is drawn');
  if (hackModel({ phase: { kind: 'HACK_RESULT' }, initiator: 3, viewer: 3, feedback: { ...feedback('DECLARED', 'Red'), phaseId: undefined }, partner: 5, seats }) !== null) problems.push('feedback is drawn without phase ids');
  if (hackModel({ phase: phase('HACK_DECLARE'), initiator: 5, viewer: 3, feedback: null, partner: null, seats }) !== null) problems.push('a phone without hackFeedback gets a Hack panel');
  if (hackModel({ phase: phase('ORDINARY_TURN'), initiator: 3, viewer: 3, feedback: feedback('DECLARED', 'Red'), partner: 5, seats }) !== null) problems.push('the panel outlives the Hack\'s phases');
  if (hackModel({ phase: phase('HACK_DECLARE'), initiator: 5, viewer: 3, feedback: feedback('AWAITING_DECLARATION'), partner: 5, canDeclare: true, seats, role: 'Undercover' })?.canDeclare !== true) problems.push('the model takes a role');
  const words = JSON.stringify(Object.values(HACK_WORDS).map(value => (typeof value === 'function' ? value(5, 4) : value)));
  for (const word of ROLE_WORDS) if (new RegExp(`\\b${word}\\b`).test(words)) problems.push(`a Hack word names the role ${word}`);
  if (/\bscan\b|\bcode\b|\blens\b/i.test(words)) problems.push('a Hack word is the Hacker\'s Scan vocabulary');
  if (/verified/i.test(words.replace(/not a verified side|not verified/g, ''))) problems.push('a Hack word calls a claim verified');
  // The three side cards: one card, one size, three marks.
  const cards = ['Blue', 'Red', 'Alien'].map(side => art.sideCard(side));
  const box = card => /viewBox="([^"]+)"/.exec(card)?.[1];
  if (new Set(cards.map(box)).size !== 1 || box(art.sideCard(null)) !== box(cards[0])) problems.push('the side cards are not one size');
  const frame = card => card.replace(/<!--[\s\S]*?-->/g, '').replace(/<path[\s\S]*$/, '').replace(/fill="#[0-9A-F]{6}"/i, '');
  if (new Set(cards.map(frame)).size !== 1) problems.push('the side cards are not the same card');
  check('the private Hack reads no role, offers the three sides alike, draws only feedback bound to the current phase, says a claim is a claim, and requests nothing', problems);
}

// ---------- The vote result: the published aggregate, the release's words ----------
{
  const problems = [];
  const code = codeOnly(await text('design/phone-kit/js/vote-result.js'));
  if (/\b(?:ballots|voterSeatId|targetSeatId|role|team|faction|knowledge)\b/.test(code)) problems.push('vote-result.js reads a ballot, a voter or something private');
  const { RESULT_WORDS, RESULT_BEATS, VOTE_RESULT_MS, voteResultModel } = await load('design/phone-kit/js/vote-result.js');
  if (VOTE_RESULT_MS !== 5000 || RESULT_BEATS.exit[1] !== 5000 || Object.values(RESULT_BEATS).some(([from, to]) => from < 0 || to > 5000 || to <= from)) problems.push('a beat falls outside the five seconds');
  let en = null;
  try { ({ en } = await load('packages/presentation/dist/copy/en.js')); } catch { problems.push('packages/presentation/dist/copy/en.js is missing: run npm run build'); }
  if (en) {
    for (const key of ['votes', 'voters', 'votedForNobody', 'elected', 'nobodyElected', 'jailed', 'nobodyJailed', 'yes', 'released', 'notReleased']) {
      const mine = RESULT_WORDS[key], theirs = en.vote.tally[key];
      const sample = value => (typeof value === 'function' ? value(3, 8) : value);
      if (sample(mine) !== sample(theirs)) problems.push(`RESULT_WORDS.${key}: "${sample(mine)}", the release says "${sample(theirs)}"`);
    }
    for (const [kind, name] of Object.entries(RESULT_WORDS.kind)) if (en.phase.kind?.[kind] !== name) problems.push(`RESULT_WORDS.kind.${kind}: "${name}", the release says "${en.phase.kind?.[kind]}"`);
    const { HACK_WORDS } = await load('design/phone-kit/js/hack.js');
    if (HACK_WORDS.consequence !== en.action.consequence.move) problems.push('the declaration\'s consequence line is not the release\'s');
    if (HACK_WORDS.chooseAgain !== en.action.chooseAgain) problems.push('"Choose again" is not the release\'s');
  }
  const seats = Array.from({ length: 9 }, (_, i) => ({ n: i + 1, name: `P${i + 1}`, character: `c${i + 1}`, location: 'Room A' }));
  const release = voteResultModel({ id: 'r', round: 3, kind: 'RELEASE_VOTE', outcome: 'RELEASE_DENIED', tiedSeatIds: [], counts: {}, eligibleVoterCount: 8, yesCount: 3, selectedSeatId: 'seat-9', released: false }, seats);
  if (!release || /\bNo\b|abstain/i.test(release.sentence) || release.cells.filter(cell => cell === 'yes').length !== 3) problems.push('a release result fabricates a No or abstention total, or miscounts its yes');
  const tie = voteResultModel({ id: 't', round: 2, kind: 'CAPTAIN_ELECTION', outcome: 'RUNOFF_REQUIRED', tiedSeatIds: ['seat-2', 'seat-7'], counts: { 'seat-2': 3, 'seat-7': 3 }, eligibleVoterCount: 9, yesCount: null, selectedSeatId: null, released: null }, seats);
  if (!tie || tie.subjects.length !== 2 || tie.title !== 'Captain election · Round 2') problems.push('a tie does not name its tied seats and its own round');
  const outcomes = ['CAPTAIN_ELECTED', 'RUNOFF_REQUIRED', 'NO_CAPTAIN_ELECTED', 'PLAYER_JAILED', 'NO_JAIL_SELECTION', 'PLAYER_RELEASED', 'RELEASE_DENIED'];
  const source = await text('design/phone-kit/js/vote-result.js');
  for (const outcome of outcomes) if (!source.includes(outcome)) problems.push(`no presentation for ${outcome}`);
  check('the vote result shows the published aggregate in the release\'s words, inside its five seconds, for all seven outcomes', problems);
}

// ---------- The stylesheet and the motion: tokens, no side hooks, nothing repeats ----------
{
  const problems = [];
  const css = (await text('design/phone-kit/css/phone-kit.css')).replace(/\/\*[\s\S]*?\*\//g, '');
  if (/\[data-(?:side|declared|claim|role|team|device|faction|status)\b/.test(css)) problems.push('a selector keyed by a side, a claim, a role or a status');
  if (/hack-side-(?:blue|red|alien)/.test(css)) problems.push('a rule for one side\'s card');
  for (const color of FACTION_COLORS) if (css.toUpperCase().includes(color)) problems.push(`the stylesheet uses the faction color ${color}`);
  if (/\binfinite\b|animation-iteration-count/.test(css)) problems.push('an animation that repeats');
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (/(?:^|;)\s*(?:animation|transition)\s*:[^;]*\b\d+(?:\.\d+)?m?s\b/.test(body.replace(/var\([^)]*\)/g, ''))) problems.push(`${selector.trim()}: a duration that is not a token`);
  }
  if (!/\[data-motion="reduced"\] \.pk-hack/.test(css) || !/prefers-reduced-motion: reduce/.test(css)) problems.push('the Hack panel has no reduced-motion rule for the setting or the device');
  for (const path of ['design/phone-kit/js/hack.js', 'design/phone-kit/js/vote-result.js']) {
    const source = await text(path);
    if (/iterations:\s*Infinity/.test(source)) problems.push(`${path}: an animation that repeats`);
    if (!/if \(reduced\)/.test(source) || !/REDUCED_FADE_MS/.test(source)) problems.push(`${path}: no reduced-motion branch`);
  }
  for (const path of ['design/phone-kit/source/art.mjs', 'design/phone-kit/js/hack.js', 'design/phone-kit/js/vote-result.js', 'design/phone-kit/css/phone-kit.css', 'design/board-motion/figures/wardrobe.mjs', 'design/board-motion/js/dress.js', 'design/tools/phone-kit-assets.mjs', 'design/tools/phone-kit-check.mjs', 'design/tools/phone-kit-capture.mjs', 'design/tools/phone-kit-flows.mjs']) {
    const source = await text(path).catch(() => '');
    if (!source.includes('mothership:dev-only')) problems.push(`${path}: not marked mothership:dev-only`);
  }
  const sides = (await text('design/phone-kit/source/art.mjs')).match(/#70AFFF|#FF8C8C|#C4A4FF/gi) ?? [];
  if (sides.length !== 3) problems.push('the faction colors are used outside the side cards\' one table');
  check('the stylesheet takes durations from tokens, keys nothing by a side or a claim, keeps faction colors to the side cards, and nothing repeats', problems);
}

// ---------- The frozen drawing ports are untouched ----------
{
  const problems = [];
  for (const [path, pinned] of Object.entries(REVIEWED_DRAWING_PORTS.sourceHashes)) if (sha(await readFile(resolve(repoRoot, path))) !== pinned) problems.push(`${path} changed: it is a frozen drawing-port source`);
  for (const [, style] of Object.entries(REVIEWED_DRAWING_PORTS.styles)) if (sha(await readFile(resolve(repoRoot, style.source))) !== style.sourceSha256) problems.push(`${style.source} changed: it is a frozen stylesheet source`);
  for (const [, build] of Object.entries(REVIEWED_DRAWING_PORTS.buildFiles)) for (const [path, pinned] of Object.entries(build.assetHashes)) if (sha(await readFile(resolve(repoRoot, path))) !== pinned) problems.push(`${path} changed: it is a frozen build input`);
  check('the frozen drawing-port sources, stylesheet and build inputs are byte for byte as reviewed', problems);
}

// ---------- The contract names every control and the captures are current and clean ----------
{
  const problems = [];
  const hack = await text('design/phone-kit/js/hack.js');
  for (const component of contract.components) for (const control of component.controls ?? []) for (const act of String(control.act).split(/\s*\|\s*/)) if (!hack.includes(act.replace(/<Side>$/, '')) && !(await text('design/board-motion/js/app.js')).includes(act)) problems.push(`${component.id}: control ${act} is not in the code`);
  const report = await json('design/phone-kit/review/report.json').catch(() => null);
  if (!report) problems.push('design/phone-kit/review/report.json is missing: run design/tools/phone-kit-capture.mjs');
  else {
    const inputs = await phoneKitInputsSha256(repoRoot);
    if (report.inputsSha256 !== inputs) problems.push('the captures were made before the latest edit: run design/tools/phone-kit-capture.mjs');
    for (const shot of report.shots) {
      for (const problem of shot.problems ?? []) problems.push(`${shot.file}: ${problem}`);
      const png = await readFile(resolve(repoRoot, shot.file)).catch(() => null);
      if (!png) problems.push(`${shot.file} is missing`);
      else if (sha(png) !== shot.sha256) problems.push(`${shot.file} is not the captured picture`);
    }
    for (const size of ['320x568', '390x844']) if (!report.shots.some(shot => shot.size === size)) problems.push(`no capture at ${size}`);
  }
  check('the contract names only controls in the code, and the captures are current, measured and clean', problems);
}

for (const name of passed) console.log(`ok    ${name}`);
for (const failure of failures) console.error(`FAIL  ${failure}`);
console.log(`Phone-kit checks: ${passed.length} passed, ${failures.length} failures`);
if (failures.length) process.exitCode = 1;
