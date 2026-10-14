// mothership:dev-only — prepare an unapplied drawing replacement for Integration review.
globalThis[Symbol.for('mothership:dev-only')] = true;
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const sourceCommit = '5c9a1510d35d4b9762f9bc2a27dae3f5d53bd5d7';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const pins = [
  { source: 'design/board-motion/figures/wardrobe.mjs', destination: 'apps/game/hosted/scene-drawing/wardrobe.mjs', sourceSha256: '1c30862d77ce7fa94275934467c5b596e68dbe0d41f3d102bd0c040bc5feca6f', derivativeSha256: '312c4cda048585f9270b3de095e2dcf44dc0dadd4c73392b1206da303ae8ddc3' },
  { source: 'design/phone-kit/source/art.mjs', destination: 'apps/game/hosted/scene-drawing/phone-kit-art.mjs', sourceSha256: 'c86770765e06f487b5fa0f3b2be57c824d114a796a5930f96ff35c7358f95761', derivativeSha256: '713b860ffaaa91ba6610457d39b6c818bad9aad28fb4967f830d21c0dcf61e86' },
];
const changes = new Map();
for (const pin of pins) {
  const source = git(['show', `${sourceCommit}:${pin.source}`]);
  if (sha(source) !== pin.sourceSha256 || !source.startsWith('// mothership:dev-only\n')) throw new Error(`Source drift: ${pin.source}`);
  const derivative = source.slice('// mothership:dev-only\n'.length);
  if (sha(derivative) !== pin.derivativeSha256 || derivative.includes('mothership:dev-only')) throw new Error(`Derivative drift: ${pin.source}`);
  changes.set(pin.destination, derivative);
}
const replace = (text, from, to) => {
  if (!text.includes(from)) throw new Error(`Consumer changed; review required: ${from}`);
  return text.replace(from, to);
};
let scene = await readFile(resolve(root, 'apps/game/hosted/scene-board.mjs'), 'utf8');
scene = scene.replaceAll('wardrobeSvg', 'dressedFigureSvg');
scene = replace(scene, "import { compactBands, compactSlots } from './scene-drawing/compact-layout.mjs';\n", '');
scene = replace(scene, 'function fitSceneBands(board, placed, seats, compact) {', 'function fitSceneBands(board, placed) {');
const compactFrom = scene.indexOf('  if (compact) {');
const compactTo = scene.indexOf('  const needs =', compactFrom);
if (compactFrom < 0 || compactTo < 0) throw new Error('Compact-layout block changed');
scene = scene.slice(0, compactFrom) + scene.slice(compactTo);
scene = replace(scene, "    const compact = board.dataset.board === 'own' && fullRoomCapacityForVersions(model.match.versions, 'Hospital') === 5\n      && !seats.some(seat => seat.location === 'Final Zone');\n    board.dataset.compact = String(compact);", "    board.dataset.compact = 'false';");
scene = replace(scene, 'fitSceneBands(board, placed, seats, compact)', 'fitSceneBands(board, placed)');
scene = scene.replace(/^      const (?:roomSeats|headingWidth|slots) = .*\n/gm, '');
scene = scene.replace(/^        const slot = .*\n/gm, '');
scene = replace(scene, 'const press = slot ? { ...slot, left: slot.left + headingWidth } : pressRect(g, size);', 'const press = pressRect(g, size);');
const leaderFrom = scene.indexOf('        let leader =');
const leaderTo = scene.indexOf('      }\n      // A private tentative move', leaderFrom);
if (leaderFrom < 0 || leaderTo < 0) throw new Error('Detached target leader block changed');
scene = scene.slice(0, leaderFrom) + scene.slice(leaderTo);
changes.set('apps/game/hosted/scene-board.mjs', scene);
let motion = await readFile(resolve(root, 'apps/game/hosted/comic-motion.mjs'), 'utf8');
motion = motion.replaceAll('wardrobeSvg', 'dressedFigureSvg');
motion = replace(motion, "      const outfit = piece.dataset.outfit ?? 'crew';", "      const departureOutfit = fromFigure.outfit ?? 'crew';\n      const arrivalOutfit = piece.dataset.outfit ?? 'crew';");
motion = replace(motion, '        const mirror = elapsed < 120', '        const outfit = elapsed < 570 ? departureOutfit : arrivalOutfit;\n        const mirror = elapsed < 120');
motion = replace(motion, "{ gesture: piece.dataset.gesture, mirror: piece.dataset.mirror === 'true' }", "{ gesture: piece.dataset.gesture, mirror: piece.dataset.mirror === 'true', outfit: piece.dataset.outfit ?? 'crew' }");
changes.set('apps/game/hosted/comic-motion.mjs', motion);
let host = await readFile(resolve(root, 'apps/game/hosted/browser-host.js'), 'utf8');
host = replace(host, "import { applyPhoneFrame } from './phone-feedback.mjs';\n", '');
host = host.replace(/^.*applyPhoneFrame\(.*\n/gm, '');
changes.set('apps/game/hosted/browser-host.js', host);
let main = await readFile(resolve(root, 'apps/game/hosted/main.js'), 'utf8');
main = replace(main, "import './phone-feedback.css';\n", '');
changes.set('apps/game/hosted/main.js', main);
for (const path of ['apps/game/hosted/phone-feedback.mjs', 'apps/game/hosted/phone-feedback.css', 'apps/game/hosted/phone-feedback-tokens.json', 'apps/game/hosted/scene-drawing/compact-layout.mjs', 'apps/game/hosted/scene-drawing/icons.mjs']) changes.set(path, null);

const scratch = await mkdtemp(join(tmpdir(), 'gamen-claude-proposal-'));
let patch = '';
try {
  for (const [path, after] of changes) {
    const before = await readFile(resolve(root, path), 'utf8').catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
    await writeFile(join(scratch, 'before'), before ?? '');
    await writeFile(join(scratch, 'after'), after ?? '');
    const result = spawnSync('diff', ['-u', '-L', before === null ? '/dev/null' : `a/${path}`, '-L', after === null ? '/dev/null' : `b/${path}`, join(scratch, 'before'), join(scratch, 'after')], { encoding: 'utf8' });
    if (result.status !== 0 && result.status !== 1) throw new Error(result.stderr || 'diff failed');
    if (result.stdout) patch += `diff --git a/${path} b/${path}\n${before === null ? 'new file mode 100644\n' : after === null ? 'deleted file mode 100644\n' : ''}${result.stdout}`;
  }
} finally { await rm(scratch, { recursive: true }); }
const output = process.argv.find(arg => arg.startsWith('--output='))?.slice('--output='.length);
const proposal = {
  status: 'Unapplied Frontend drawing replacement; no runtime/asset/source-fence adoption',
  baseCommit: git(['rev-parse', 'HEAD']).trim(), sourceCommit, sourcePr: 'https://github.com/Amirkianfar66/GameN/pull/127',
  transformation: 'Remove only the leading dev-only line from each exact drawing source; imports and drawing bytes otherwise unchanged',
  ports: pins, patchSha256: sha(patch), changedPaths: [...changes.keys()],
  versionNeeds: ['Integration-reviewed Claude source/derivative fence', 'Immutable art manifest acknowledging the complete uniform phone-kit bundle', 'Backend published declared-Hack tuple and exact prepared-version Ready review'],
  excluded: ['board-v2 mechanics and artwork', 'prototype controllers', 'shared contracts/rules/manifests/guards'],
  remainingConsumerWork: ['Map reviewed Claude shell tokens/styles with exact provenance', 'Render static vote and participant-private Hack art against approved identity/deadlines', 'Update owned source-provenance tests after approved replacement', 'Measure the complete production phone and verify source exclusion'],
};
if (output) {
  const destination = resolve(output);
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, 'claude-phone-kit-replacement.patch'), patch);
  await writeFile(join(destination, 'claude-phone-kit-replacement.json'), JSON.stringify(proposal, null, 2) + '\n');
}
console.log(JSON.stringify({ sourceCommit, ports: pins.length, patchSha256: proposal.patchSha256, changedPaths: changes.size, applied: false, output: output ? resolve(output) : null }));
