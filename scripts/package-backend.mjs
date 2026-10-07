import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, basename, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import '../scripts/check-toolchain.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
let output = join(root, 'dist/backend');
let verifyInstall = false;
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--verify-install') verifyInstall = true;
  else if (args[index] === '--out' && args[index + 1] !== undefined) output = resolve(args[++index]);
  else throw new Error('Use package-backend.mjs [--out DIRECTORY] [--verify-install]');
}
if (output === root || output.startsWith(root + '/') && !output.startsWith(join(root, 'dist') + '/')) throw new Error('Artifact output must be below root dist or outside the repository');
if (existsSync(output)) {
  const marker = join(output, 'backend-artifact.json');
  if (!existsSync(marker) || JSON.parse(readFileSync(marker, 'utf8')).kind !== 'mothership-backend-v1') throw new Error('Refusing to replace an unrelated output directory');
  rmSync(output, { recursive: true });
}
mkdirSync(join(output, 'vendor'), { recursive: true });
writeFileSync(join(output, 'backend-artifact.json'), JSON.stringify({ kind: 'mothership-backend-v1', verifiedStandaloneInstall: false }) + '\n');
const temporary = mkdtempSync(join(tmpdir(), 'mothership-backend-pack-'));
const forbidden = /(?:^|\/)(?:test|tests|test-emulator|reference|design-canvas|private|credentials)(?:\/|$)|(?:^|\/)fixtures(?:\.|\/|$)|(?:service[-_]?account|session[-_]?cookies?)|(?:^|\/)\.env(?:\.|$)|\.(?:pem|key|tsbuildinfo)$/i;
function walk(directory, prefix = '') {
  const files = [];
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name), rel = prefix ? `${prefix}/${name}` : name;
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`Artifact symlink is forbidden: ${rel}`);
    if (stat.isDirectory()) files.push(...walk(path, rel)); else files.push(rel);
  }
  return files;
}
function copyDist(source, target, include = () => true, entry = 'index.js') {
  if (!existsSync(join(source, entry))) throw new Error('Build every runtime workspace before packaging');
  mkdirSync(target, { recursive: true });
  for (const file of walk(source)) {
    if (forbidden.test(file) || !include(file)) continue;
    if (!/\.(?:js|mjs|d\.ts|json)$/.test(file)) throw new Error(`Unexpected compiled artifact: ${file}`);
    mkdirSync(dirname(join(target, file)), { recursive: true });
    cpSync(join(source, file), join(target, file));
  }
}
function scan(directory) {
  for (const file of walk(directory)) {
    if (forbidden.test(file)) throw new Error(`Forbidden artifact path: ${file}`);
    if (/\.(?:js|mjs|json|d\.ts)$/.test(file)) {
      const text = readFileSync(join(directory, file), 'utf8');
      if (/resolveFixtureAfterVote|FIXTURE_VOTE_COMPLETED_AND_ATTACK_STAGE|fixture-source-2026-09-26|0\.1\.0-officer-slice/.test(text)) throw new Error(`Legacy fixture harness in artifact: ${file}`);
      if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) throw new Error('Credential material in artifact');
      if (/['"]@mothership\/contracts\/fixtures['"]/.test(text) || /(?:from|import\s*\(|require\s*\()[\s(]*['"][^'"]*(?:test\/helpers|reference\/design-canvas|\/fixtures(?:\.|['"]))/i.test(text)) throw new Error(`Forbidden runtime import in ${file}`);
    }
  }
}
const packages = ['packages/contracts', 'packages/engine', 'services/game-api'];
const vendor = {}, packedMetadata = {}, fingerprints = [];
const indexes = {
  'packages/engine': {
    js: "export * from './full-game/model.js';\nexport * from './full-game/lifecycle.js';\nexport { projectOwnAcknowledgments } from './full-game/own-acknowledgments.js';\nexport { buildRoster } from './full-game/roster.js';\n",
    dts: "export * from './full-game/model.js';\nexport * from './full-game/lifecycle.js';\nexport { projectOwnAcknowledgments } from './full-game/own-acknowledgments.js';\nexport { buildRoster } from './full-game/roster.js';\n",
  },
  'services/game-api': {
    js: "export { createV1Service, encodeV1Setup, decodeV1Setup, encodeV1State, decodeV1State } from './full-game.js';\n",
    dts: "export { createV1Service, encodeV1Setup, decodeV1Setup, encodeV1State, decodeV1State } from './full-game.js';\nexport type { V1DeadlineIntent, EnqueueV1Deadline, StoredV1Setup, StoredV1State } from './full-game.js';\n",
  },
};
try {
  for (const location of packages) {
    const original = JSON.parse(readFileSync(join(root, location, 'package.json'), 'utf8'));
    const stage = join(temporary, original.name.split('/').at(-1));
    mkdirSync(stage, { recursive: true });
    const include = location === 'packages/contracts' ? () => true
      : location === 'packages/engine' ? file => file.startsWith('full-game/')
      : file => /^(?:full-game|practice-bot-policy)\.(?:js|d\.ts)$/.test(file);
    copyDist(join(root, location, 'dist'), join(stage, 'dist'), include);
    if (indexes[location] !== undefined) {
      writeFileSync(join(stage, 'dist/index.js'), indexes[location].js);
      writeFileSync(join(stage, 'dist/index.d.ts'), indexes[location].dts);
    }
    fingerprints.push(...walk(join(stage, 'dist')).map(file => [location + '/dist/' + file, createHash('sha256').update(readFileSync(join(stage, 'dist', file))).digest('hex')]));
    const manifest = { ...original, scripts: undefined, devDependencies: undefined, workspaces: undefined, files: ['dist'] };
    if (manifest.exports?.['./fixtures'] !== undefined) delete manifest.exports['./fixtures'];
    writeFileSync(join(stage, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
    scan(stage);
    const result = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', join(output, 'vendor')], { cwd: stage, encoding: 'utf8' }))[0];
    if (result.files.some(entry => forbidden.test(entry.path))) throw new Error('npm pack included a forbidden file');
    vendor[original.name] = `file:vendor/${basename(result.filename)}`;
    packedMetadata[original.name] = { version: original.version, resolved: vendor[original.name], integrity: result.integrity, ...(original.dependencies === undefined ? {} : { dependencies: original.dependencies }) };
  }
  const infrastructure = JSON.parse(readFileSync(join(root, 'infra/firebase/package.json'), 'utf8'));
  const manifest = { name: '@mothership/firebase-runtime', version: infrastructure.version, private: true, type: 'module', main: 'dist/production.js', engines: { node: '22' }, dependencies: { ...infrastructure.dependencies, ...vendor } };
  copyDist(join(root, 'infra/firebase/dist'), join(output, 'dist'), file => /^(?:production|runtime|v1)\.(?:js|d\.ts)$/.test(file), 'production.js');
  writeFileSync(join(output, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  cpSync(join(root, 'infra/firebase/firestore.rules'), join(output, 'firestore.rules'));
  if (existsSync(join(root, 'infra/firebase/firestore.indexes.json'))) cpSync(join(root, 'infra/firebase/firestore.indexes.json'), join(output, 'firestore.indexes.json'));
  writeFileSync(join(output, 'firebase.json'), JSON.stringify({ functions: { source: '.', runtime: 'nodejs22', codebase: 'mothership-v1' }, firestore: { rules: 'firestore.rules', ...(existsSync(join(output, 'firestore.indexes.json')) ? { indexes: 'firestore.indexes.json' } : {}) } }, null, 2) + '\n');
  // Reuse exact transitive resolutions/integrities, rather than resolving fresh registry versions.
  const rootLock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  const locked = { '': { name: manifest.name, version: manifest.version, dependencies: manifest.dependencies, engines: manifest.engines } };
  for (const [key, value] of Object.entries(rootLock.packages)) {
    if (key.startsWith('node_modules/') && !value.link && !key.startsWith('node_modules/@mothership/')) locked[key] = value;
  }
  for (const [name, metadata] of Object.entries(packedMetadata)) locked[`node_modules/${name}`] = metadata;
  writeFileSync(join(output, 'package-lock.json'), JSON.stringify({ name: manifest.name, version: manifest.version, lockfileVersion: 3, requires: true, packages: locked }, null, 2) + '\n');
  scan(output);
  fingerprints.push(...walk(join(output, 'dist')).map(file => ['infra/firebase/dist/' + file, createHash('sha256').update(readFileSync(join(output, 'dist', file))).digest('hex')]));
  const artifactFiles = walk(output).filter(file => file !== 'backend-artifact.json').map(file => [file, createHash('sha256').update(readFileSync(join(output, file))).digest('hex')]);
  writeFileSync(join(output, 'backend-artifact.json'), JSON.stringify({ kind: 'mothership-backend-v1', protocolVersion: 2, legacyFixtureHarnessScan: 'passed', artifactSha256: createHash('sha256').update(JSON.stringify(artifactFiles)).digest('hex'), sourceSha256: createHash('sha256').update(JSON.stringify(fingerprints)).digest('hex'), nodeVersion: process.version, packages: vendor, verifiedStandaloneInstall: false, forbiddenSourceScan: 'passed' }, null, 2) + '\n');
  if (verifyInstall) {
    const install = join(temporary, 'standalone');
    cpSync(output, install, { recursive: true });
    execFileSync('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: install, stdio: 'pipe' });
    for (const name of Object.keys(vendor)) scan(join(install, 'node_modules', name));
    const environment = { ...process.env, GCLOUD_PROJECT: 'mothership-package-validation', GCP_PROJECT: 'mothership-package-validation', MOTHERSHIP_ASSET_MANIFEST_VERSION: 'test-assets-v1' };
    delete environment.FIREBASE_CONFIG;
    for (const key of Object.keys(environment)) if (key.includes('EMULATOR')) delete environment[key];
    execFileSync(process.execPath, ['--input-type=module', '-e', `import assert from 'node:assert/strict';
      const contracts=await import('@mothership/contracts');assert.equal(typeof contracts.parseOwnAcknowledgments,'function');assert.ok(contracts.OwnAcknowledgmentsSchema);assert.ok(contracts.SeatSessionSchema);
      const engine=await import('@mothership/engine'),api=await import('@mothership/game-api');
      assert.equal(typeof engine.projectOwnAcknowledgments,'function');assert.equal(engine.resolveSlice,undefined);assert.equal(api.createGameService,undefined);assert.equal(api.resolveFixtureAfterVote,undefined);
      const functions=await import(${JSON.stringify('./' + manifest.main)});
      for(const name of ['command','receipt','advance','serverTime','deadlineTask']) assert.equal(functions[name],undefined);
      for(const name of ['v1CreateMatch','v1RequestAdmission','v1ApproveAdmission','v1AdmitDisplay','v1StartMatch','v1Command','v1Receipt','v1Advance','v1ServerTime','v1AbortMatch','v1IssueSeatRecovery','v1RedeemSeatRecovery','v1SetLobbyIdentity','v1SetPracticeBots','v1BeginSetup','v1ConfirmSetupChoice','v1ReadyForMatch','v1RunPracticeBots','v1DeadlineTask','v1DispatchDeadline','v1RepairDeadlines']) assert.ok(functions[name].__endpoint);
    `], { cwd: install, env: environment, stdio: 'pipe' });
    const evidence = JSON.parse(readFileSync(join(output, 'backend-artifact.json'), 'utf8'));
    evidence.verifiedStandaloneInstall = true;
    writeFileSync(join(output, 'backend-artifact.json'), JSON.stringify(evidence, null, 2) + '\n');
  }
  console.log(JSON.stringify({ output, forbiddenSourceScan: 'passed', verifiedStandaloneInstall: verifyInstall }));
} finally { rmSync(temporary, { recursive: true, force: true }); }
