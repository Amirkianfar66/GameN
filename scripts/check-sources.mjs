import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const json = path => JSON.parse(read(path));
const hash = path => createHash('sha256').update(read(path)).digest('hex');
const lock = json('docs/bootstrap-source-lock.json');
for (const entry of lock.files) assert.equal(hash(entry.path), entry.sha256, `Changed source: ${entry.path}`);
const rules = json('rules/source-manifest.json');
for (const source of rules.sources) assert.equal(hash(source.path), source.sha256, `Rule source hash: ${source.path}`);

const manifest = json('reference/source-export-manifest.json');
const included = manifest.files.filter(file => file.included);
assert.equal(included.length, manifest.copied_unchanged_file_count);
for (const file of included) assert.equal(hash(file.package_path), file.source_sha256, `Canvas snapshot: ${file.package_path}`);
function filesIn(path) {
  return readdirSync(new URL(path, root), { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesIn(`${path}/${entry.name}`) : [`${path}/${entry.name}`]);
}
const expectedPaths = [...included.map(file => file.package_path), ...manifest.generated_files].sort();
assert.deepEqual(filesIn('reference/design-canvas').sort(), expectedPaths, 'Canvas snapshot inventory changed');
assert.equal(hash('packages/design-tokens/src/tokens.json'), hash('docs/design/design-tokens.json'), 'Proposed token export must match its source');
console.log(`Source integrity: ${included.length} original Canvas files + ${manifest.generated_files.length} unbound example; ${rules.sources.length} rule sources; ${lock.files.length} pinned source files; token proposal unchanged`);

const v1 = json('rules/in-person-v1-manifest.json');
assert.equal(hash(v1.owner_decision.path), v1.owner_decision.sha256, 'Owner decision hash');
assert.equal(v1.ruleset_hash, v1.owner_decision.sha256);
assert.equal(v1.baseline_source_manifest_sha256, hash('rules/source-manifest.json'));
const owner = json(v1.owner_decision.path);
assert.equal(owner.status, 'confirmed');
assert.equal(owner.decisions.length, 21);
assert.deepEqual(owner.decisions.map(d => d.id), Array.from({length:21}, (_,i)=>`V1-${String(i+1).padStart(2,'0')}`));
assert.equal(owner.optional_powers, false);
const model = read('packages/engine/src/full-game/model.ts').toString();
assert.ok(model.includes(v1.ruleset_hash) && model.includes(v1.ruleset_version), 'Engine ruleset pins');
console.log('Approved V1 source integrity: 21 immutable owner decisions; historical source pin preserved');

const capacityPath = 'rules/overlays/room-capacity-owner-decision-2026-10-11.json';
const capacity = json(capacityPath);
assert.equal(capacity.status, 'confirmed');
assert.equal(capacity.protocol_version, 2);
assert.equal(capacity.optional_powers, false);
assert.equal(capacity.decisions.length, 6);
assert.equal(capacity.ordering_decision.status, 'confirmed');
assert.equal(capacity.parent_ruleset.hash, hash('rules/overlays/ordinary-turn-pass-owner-decision-2026-10-08.json'));
assert.ok(model.includes(hash(capacityPath)) && model.includes(capacity.ruleset_version) && model.includes(capacity.engine_version), 'Capacity engine pins');
console.log('Capacity owner source integrity: six confirmed decisions; separate exact behavior tuple; historical bytes preserved');

const resolutionPath = 'rules/overlays/room-capacity-resolution-owner-decision-2026-10-12.json';
const resolution = json(resolutionPath);
assert.equal(resolution.status, 'confirmed');
assert.equal(resolution.protocol_version, 2);
assert.equal(resolution.optional_powers, false);
assert.deepEqual(resolution.decisions.map(row => row.id), Array.from({length: 6}, (_, i) => `BAL-OD-${i + 1}`));
assert.equal(resolution.parent_ruleset.hash, hash(capacityPath));
assert.ok(model.includes(hash(resolutionPath)) && model.includes(resolution.ruleset_version) && model.includes(resolution.engine_version), 'Resolution engine pins');
console.log('Capacity resolution integrity: six latest owner decisions; exact historical tuples preserved');

const voteResultPath = 'rules/overlays/vote-result-owner-decision-2026-10-12.json';
const voteResult = json(voteResultPath);
assert.equal(voteResult.status,'confirmed'); assert.equal(voteResult.protocol_version,2);
assert.equal(voteResult.parent_ruleset.hash,hash(resolutionPath));
assert.deepEqual(voteResult.decisions.map(d=>d.id),Array.from({length:5},(_,i)=>`VOTE-RESULT-${String(i+1).padStart(2,'0')}`));
assert.ok(model.includes(hash(voteResultPath)) && model.includes(voteResult.ruleset_version) && model.includes(voteResult.engine_version));
assert.ok(read('packages/contracts/src/full-game-versions.ts').toString().includes(hash(voteResultPath)));
console.log('Vote result integrity: approved five-second checkpoints and exact new tuple bound');

const declaredHackPath = 'rules/overlays/declared-hack-owner-decision-2026-10-12.json';
const declaredHack = json(declaredHackPath);
assert.equal(declaredHack.status,'confirmed'); assert.equal(declaredHack.protocol_version,2);
assert.equal(declaredHack.parent_ruleset.hash,hash(voteResultPath));
assert.deepEqual(declaredHack.decisions.map(d=>d.id),Array.from({length:7},(_,i)=>`HACK-DECLARE-${String(i+1).padStart(2,'0')}`));
assert.ok(model.includes(hash(declaredHackPath)) && model.includes(declaredHack.ruleset_version) && model.includes(declaredHack.engine_version));
assert.ok(read('packages/contracts/src/full-game-versions.ts').toString().includes(hash(declaredHackPath)));
console.log('Declared Hack integrity: approved claim, bounded flow and exact historical tuple preservation');

const publicHackPath = 'rules/overlays/public-hack-owner-decision-2026-10-14.json';
const publicHack = json(publicHackPath);
assert.equal(publicHack.status,'confirmed'); assert.equal(publicHack.protocol_version,2);
assert.equal(publicHack.parent_ruleset.hash,hash(declaredHackPath));
assert.deepEqual(publicHack.decisions.map(d=>d.id),Array.from({length:6},(_,i)=>`HACK-PUBLIC-${String(i+1).padStart(2,'0')}`));
assert.ok(model.includes(hash(publicHackPath)) && model.includes(publicHack.ruleset_version) && model.includes(publicHack.engine_version));
assert.ok(read('packages/contracts/src/full-game-versions.ts').toString().includes(hash(publicHackPath)));
console.log('Public Hack draft integrity: public pair and approved turn-stage movement isolated to exact new tuple; creation defaults unchanged');

const boardMedicalPath = 'rules/overlays/board-medical-owner-decision-2026-10-14.json';
const boardMedical = json(boardMedicalPath);
assert.equal(boardMedical.status,'confirmed'); assert.equal(boardMedical.protocol_version,2);
assert.equal(boardMedical.parent_ruleset.hash,hash(publicHackPath));
assert.equal(boardMedical.logical_layout,'board-v2-0.1.1');
assert.deepEqual(boardMedical.decisions.map(d=>d.id),Array.from({length:7},(_,i)=>`BOARD-MEDICAL-${String(i+1).padStart(2,'0')}`));
assert.ok(model.includes(hash(boardMedicalPath)) && model.includes(boardMedical.ruleset_version) && model.includes(boardMedical.engine_version));
assert.ok(read('packages/contracts/src/full-game-versions.ts').toString().includes(hash(boardMedicalPath)));
console.log('Board/medical draft integrity: final owner slots and episode rules bound to separate inactive tuple; historical pins preserved');

const captainPath='rules/overlays/captain-outcomes-owner-decision-2026-10-14.json';
const captain=json(captainPath);
assert.equal(captain.status,'confirmed');assert.equal(captain.parent_ruleset.hash,hash(boardMedicalPath));
assert.ok(model.includes(hash(captainPath)) && read('packages/contracts/src/full-game-versions.ts').toString().includes(hash(captainPath)));
console.log('Captain outcome candidate integrity: exact successor; historical source and activation pins retained');

const blackoutPath='rules/overlays/blackout-owner-decision-2026-10-14.json';
const blackout=json(blackoutPath);assert.equal(blackout.status,'confirmed');assert.equal(blackout.parent_ruleset.hash,hash(captainPath));
assert.ok(model.includes(hash(blackoutPath)) && read('packages/contracts/src/full-game-versions.ts').toString().includes(hash(blackoutPath)));
console.log('Blackout candidate integrity: exact fixed-window successor and private room outcome boundary');
