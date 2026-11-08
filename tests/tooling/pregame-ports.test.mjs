import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import test from 'node:test';
import {PREGAME_APPROVAL, PREGAME_APPROVAL_SHA256, PREGAME_RUNTIME_CATALOG, PREGAME_RUNTIME_CATALOG_SHA256,
  readPregameSourceApproval, verifyPregameRuntimePorts} from '../../scripts/pregame-runtime-ports.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const readJson = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
const catalog = readJson(PREGAME_RUNTIME_CATALOG);
const approval = readJson(PREGAME_APPROVAL);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const castPath = 'apps/game/hosted/pregame-films/kit/cast.mjs';
const rosterPath = 'apps/game/hosted/pregame-films/boarding/roster.mjs';
function fixture(t) {
  const destination = mkdtempSync(join(tmpdir(), 'mothership-pregame-ports-'));
  t.after(() => rmSync(destination, {recursive: true, force: true}));
  for (const path of [PREGAME_APPROVAL, PREGAME_RUNTIME_CATALOG, approval.approvedRuntimeHook.evidence.path,
    ...Object.keys(approval.sourcePins), ...Object.keys(approval.runtimePins)]) {
    mkdirSync(dirname(join(destination, path)), {recursive: true});
    cpSync(join(root, path), join(destination, path));
  }
  return destination;
}
function change(root, path, transform = text => text + '\n// unreviewed change\n') {
  const file = join(root, path);
  writeFileSync(file, transform(readFileSync(file, 'utf8')));
}
const moduleAt = (root, path) => import(pathToFileURL(join(root, path)).href);

test('pregame registration binds 22 exact named derivatives and their full frozen dependency closure', () => {
  assert.equal(verifyPregameRuntimePorts(root), 22);
  assert.equal(catalog.entries.length, 22);
  assert.equal(catalog.dependencies.length, 22);
  assert.equal(Object.keys(approval.sourcePins).length, 44);
  assert.equal(Object.keys(approval.runtimePins).length, 44);
  assert.equal(sha(readFileSync(join(root, PREGAME_APPROVAL))), PREGAME_APPROVAL_SHA256);
  assert.equal(sha(readFileSync(join(root, PREGAME_RUNTIME_CATALOG))), PREGAME_RUNTIME_CATALOG_SHA256);
  assert.deepEqual(readPregameSourceApproval(root), approval);
  assert.equal(approval.manifestVersion, 'design-0.8.0');
  assert.equal(approval.baseManifestVersion, 'design-0.7.0');
  assert.equal(approval.sourceHead, 'e43d5e675cecf5a5a3c8afadea246f8c22cb8a7c');
  assert.equal(approval.sourceMerge, '32055776d09235be0e55d41ac24407d02c6fafa9');
  assert.equal(approval.sourceApprovalComment, 'https://github.com/Amirkianfar66/GameN/pull/198#issuecomment-6725832655');
});

test('every frozen dependency retains its earlier separately reviewed source and runtime hashes', () => {
  const rig = readJson('design/tools/lib/reviewed-drawing-ports.json');
  const crew = readJson('design/releases/crew-drawing-approval.json');
  for (const dependency of catalog.dependencies) {
    const old = crew.ports[dependency.runtime] ?? rig.ports[dependency.runtime];
    assert.equal(dependency.source, old.source);
    assert.equal(dependency.sourceSha256, old.sourceSha256 ?? rig.sourceHashes[old.source]);
    assert.equal(dependency.runtimeSha256, old.sha256);
    assert.equal(dependency.sourceCommit, old.sourceCommit ?? rig.sourceCommit);
  }
});

test('the reconstruction permits only the first marker, two import rewrites, roster tail and exact cast patch', () => {
  assert.deepEqual(catalog.transform, {removeFirstLine: '// mothership:dev-only\n', importPrefixes: {
    '../../crew-drawing/source/': '../../crew-drawing/', '../../board-motion/figures/': '../../scene-drawing/',
  }});
  for (const entry of catalog.entries) {
    let reconstructed = readFileSync(join(root, entry.source), 'utf8');
    assert.ok(reconstructed.startsWith(catalog.transform.removeFirstLine));
    reconstructed = reconstructed.slice(catalog.transform.removeFirstLine.length);
    for (const [from, to] of Object.entries(catalog.transform.importPrefixes)) reconstructed = reconstructed.replaceAll(from, to);
    if (entry.omitSyntheticTailAt) {
      assert.equal(entry.runtime, rosterPath);
      reconstructed = reconstructed.slice(0, reconstructed.indexOf(entry.omitSyntheticTailAt));
    }
    if (entry.approvedHookPatches) {
      assert.equal(entry.runtime, castPath);
      assert.equal(entry.approvedHookPatches.length, 2);
      for (const patch of entry.approvedHookPatches) {
        assert.equal(reconstructed.split(patch.before).length, 2);
        reconstructed = reconstructed.replace(patch.before, patch.after);
      }
    }
    assert.equal(reconstructed, readFileSync(join(root, entry.runtime), 'utf8'), entry.runtime);
  }
});

for (const [label, path, pattern] of [
  ['original drawing', catalog.entries[0].source, /original source drift/],
  ['ported drawing', catalog.entries[0].runtime, /derivative drift/],
  ['frozen dependency source', catalog.dependencies[0].source, /original source drift/],
  ['frozen dependency runtime', catalog.dependencies[0].runtime, /derivative drift/],
  ['hook evidence', approval.approvedRuntimeHook.evidence.path, /hook evidence drift/],
  ['source approval', PREGAME_APPROVAL, /source approval drift/],
  ['runtime catalog', PREGAME_RUNTIME_CATALOG, /runtime catalog drift/],
]) test(`pregame registration rejects changed ${label}`, t => {
  const destination = fixture(t);
  change(destination, path);
  assert.throws(() => verifyPregameRuntimePorts(destination), pattern);
});

test('changing an approval and catalog together cannot authorize another drawing or hook', t => {
  const destination = fixture(t);
  change(destination, castPath);
  const mutated = structuredClone(catalog);
  const entry = mutated.entries.find(entry => entry.runtime === castPath);
  entry.runtimeSha256 = sha(readFileSync(join(destination, castPath)));
  writeFileSync(join(destination, PREGAME_RUNTIME_CATALOG), JSON.stringify(mutated));
  const updatedApproval = structuredClone(approval);
  updatedApproval.runtimePins[castPath] = entry.runtimeSha256;
  updatedApproval.approvedRuntimeHook.sha256 = entry.runtimeSha256;
  updatedApproval.catalog.sha256 = sha(readFileSync(join(destination, PREGAME_RUNTIME_CATALOG)));
  writeFileSync(join(destination, PREGAME_APPROVAL), JSON.stringify(updatedApproval));
  assert.throws(() => verifyPregameRuntimePorts(destination), /source approval drift/);
});

for (const path of ['review/fixture.mjs', 'stage.mjs', 'films.mjs', 'renders.mjs', 'extra.mjs']) {
  test(`pregame registration rejects unlisted ${path}`, t => {
    const destination = fixture(t);
    const file = join(destination, 'apps/game/hosted/pregame-films', path);
    mkdirSync(dirname(file), {recursive: true});
    writeFileSync(file, 'export const fixture = true;\n');
    assert.throws(() => verifyPregameRuntimePorts(destination), /Unreviewed or missing pregame drawing port/);
  });
}

test('pregame registration rejects missing files and symlink substitutions', t => {
  const destination = fixture(t);
  const path = join(destination, catalog.entries[0].runtime);
  rmSync(path);
  assert.throws(() => verifyPregameRuntimePorts(destination), /Unreviewed or missing pregame drawing port/);
  symlinkSync(join(root, catalog.entries[0].runtime), path);
  assert.throws(() => verifyPregameRuntimePorts(destination), /Unreviewed pregame drawing link/);
});

test('the synthetic roster tail and arbitrary hook edits fail independently of inventory', t => {
  const destination = fixture(t);
  change(destination, rosterPath, text => text + '\nexport const REVIEW_ROSTERS = [];\n');
  assert.throws(() => verifyPregameRuntimePorts(destination), /derivative drift/);
  cpSync(join(root, rosterPath), join(destination, rosterPath));
  change(destination, castPath, text => text.replace('try { return draw(); } finally', 'try { return draw(collect); } finally'));
  assert.throws(() => verifyPregameRuntimePorts(destination), /derivative drift/);
});

test('the public-only roster extraction preserves 7, 8 and 9 member behavior and exports no fixtures', async () => {
  const roster = await moduleAt(root, rosterPath);
  assert.deepEqual(Object.keys(roster), ['publicRoster']);
  for (const count of [7, 8, 9]) {
    const input = Array.from({length: count}, (_, index) => ({seat: index + 1, character: `c${index + 1}`,
      role: 'private-role', team: 'private-team', code: 'private-code'})).reverse();
    const output = roster.publicRoster(input);
    assert.deepEqual(output, input.toSorted((a, b) => a.seat - b.seat).map(({seat, character}) => ({seat, character})));
    assert.ok(Object.isFrozen(output) && output.every(Object.isFrozen));
  }
  assert.throws(() => roster.publicRoster([]), /7, 8 or 9/);
  assert.throws(() => roster.publicRoster(Array.from({length: 7}, () => ({seat: 1, character: 'c1'}))), /taken once/);
});

test('the exact cast hook preserves 108 default drawings and restores nested and throwing scopes', async t => {
  const destination = fixture(t);
  const entry = catalog.entries.find(entry => entry.runtime === castPath);
  const runtime = await moduleAt(destination, castPath);
  // Compare to the approved source with only the ordinary marker/import transforms.
  let ordinary = readFileSync(join(root, entry.source), 'utf8').slice(catalog.transform.removeFirstLine.length);
  for (const [from, to] of Object.entries(catalog.transform.importPrefixes)) ordinary = ordinary.replaceAll(from, to);
  const referencePath = castPath.replace('cast.mjs', 'reference-cast.mjs');
  writeFileSync(join(destination, referencePath), ordinary);
  const reference = await moduleAt(destination, referencePath);
  const {skeletonOf} = await moduleAt(destination, 'apps/game/hosted/scene-drawing/gestures.mjs');
  const {defs} = await moduleAt(destination, 'apps/game/hosted/pregame-films/kit/fx.mjs');
  let comparisons = 0;
  const draw = (module, options, id = 'test') => {
    const D = defs();
    return module.litFigure(D, id, options) + D.markup();
  };
  for (let seat = 1; seat <= 9; seat++) for (const gesture of ['stand', 'consoleBack', 'bedLying']) {
    for (const t of [0, 1379]) for (const reduced of [false, true]) {
      const options = {c: `c${seat}`, sk: skeletonOf(gesture), at: [320, 700], scale: 1.5, t, reduced, seat,
        flip: seat % 2 === 0, ambient: {color: '#112233', strength: 0.65},
        key: {at: [280, 120], color: '#ffeecc'}, rim: {dx: 1, dy: -1, color: '#aabbcc'}, clip: 730};
      assert.equal(draw(runtime, options), draw(reference, options));
      comparisons++;
    }
  }
  assert.equal(comparisons, 108);
  assert.equal(sha(readFileSync(join(destination, castPath))), 'd47d7574c6748037687957ca4138f14e06679210679d4c979c758ee760b01024');
  const options = {c: 'c1', sk: skeletonOf('stand'), at: [320, 700], scale: 1};
  const plain = draw(reference, options);
  const outer = capture => `<svg data-collector="outer" data-character="${capture.member.id}"></svg>`;
  const inner = () => '<svg data-collector="inner"></svg>';
  runtime.withRetainedFigures(outer, () => {
    assert.match(draw(runtime, options), /data-collector="outer"/);
    runtime.withRetainedFigures(inner, () => assert.match(draw(runtime, options), /data-collector="inner"/));
    assert.match(draw(runtime, options), /data-collector="outer"/);
    assert.throws(() => runtime.withRetainedFigures(inner, () => { throw Error('draw failed'); }), /draw failed/);
    assert.match(draw(runtime, options), /data-collector="outer"/);
  });
  assert.equal(draw(runtime, options), plain);
  assert.throws(() => runtime.withRetainedFigures(() => { throw Error('collector failed'); }, () => draw(runtime, options)), /collector failed/);
  assert.equal(draw(runtime, options), plain);
});
