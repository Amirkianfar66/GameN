// mothership:dev-only
//
// Inventories every Designer-owned file (design/, docs/design/, packages/design-tokens/) across the
// runtime baseline, the design baseline and every Designer PR head, for the cinematic library's
// gap map (docs/design/cinematic/inventory.md):
//   node design/tools/cinematic-inventory.mjs
//
// For each path it records each distinct version's SHA-256 and size and which heads hold it, the
// Designer's current version (the newest Designer chain that holds the path), whether the runtime
// baseline holds that version, an older one or none, which PR last changed it, its source family,
// and every runtime port or registered asset that Integration's registries on the baseline record
// for it, with whether the registered hash is the Designer's current one. It also lists current
// text sources that still carry a superseded name (Cracker, Soldier Blue, Showdown, Final Zone).
//
// Reads git objects only: no checkout is changed, nothing is fetched. Node built-ins only.
// Writes design/cinematic/inventory/inventory.json.

import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = resolve(repoRoot, 'design/cinematic/inventory/inventory.json');
const SCOPE = ['design', 'docs/design', 'packages/design-tokens'];
const git = (...args) => execFileSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });

// The heads, oldest chain first within each kind. A chain is stacked: its tip holds its PRs' work.
export const HEADS = [
  { id: 'main', ref: 'db65bb87f05983ff6861d27689ba1b7bab55d051', label: 'Runtime baseline: origin/main (#171, the reviewed V1 release)', kind: 'baseline' },
  { id: 'design-baseline', ref: '26947b1fbf001275b5f1979f5732824fe08af783', label: 'Design baseline: codex/design-studio-development (Engineer and Doctor names)', kind: 'baseline' },
  { id: 'pr45', pr: 45, chain: 'art-direction', ref: '6017c61ac4a297d8b1298e5e898a38f38742df45', author: 'Designer', merged: true },
  { id: 'pr57', pr: 57, chain: 'art-direction', ref: '4fa2ff3db5edff97feefa7bc12b7f2b627275c34', author: 'Designer' },
  { id: 'pr59', pr: 59, chain: 'art-direction', ref: 'ecbc0d703fa5e8b6b576e0b9eff6dc972761d3ea', author: 'Designer' },
  { id: 'pr78', pr: 78, chain: 'phone-first', ref: '87ac25440f9f1791c58a4e7da7c0cec5257af88c', author: 'Designer' },
  { id: 'pr77', pr: 77, chain: 'phone-first', ref: 'a9bc4a95df754dd00fe8f2b747814df82e1017d2', author: 'Designer' },
  { id: 'pr88', pr: 88, chain: 'board-motion', ref: '08409392d1040f20d559a9f36a2a1d9bb23468c4', author: 'Designer' },
  { id: 'pr102', pr: 102, chain: 'abilities', ref: '1453500a2c2313844903f037a948578052122d49', author: 'Designer' },
  { id: 'pr105', pr: 105, chain: 'abilities', ref: '022ae5be841b2df49d7d9ae2db5219c88bd20311', author: 'Designer' },
  { id: 'pr107', pr: 107, chain: 'abilities', ref: '3ec88ea893e22a6aaafcf3505a02bb067860bb02', author: 'Designer' },
  { id: 'pr108', pr: 108, chain: 'abilities', ref: '1a52f567ba29280b0e099b4e14b1f9538b39c8f2', author: 'Designer' },
  { id: 'pr109', pr: 109, chain: 'abilities', ref: 'a3379d1179b65233c604abb9b7353452b681b921', author: 'Designer' },
  { id: 'pr110', pr: 110, chain: 'abilities', ref: '1e2f4916ea341af98c19078bc218ba74d9602640', author: 'Designer' },
  { id: 'pr111', pr: 111, chain: 'abilities', ref: '8f1f356f2208ff49bcaef3f501f9778da19ccab0', author: 'Designer' },
  { id: 'pr116', pr: 116, chain: 'abilities', ref: '27be8749b51775fee3a0d81b62a3cdabedafe1be', author: 'Designer' },
  { id: 'pr127', pr: 127, chain: 'board-v2', ref: '5c9a1510d35d4b9762f9bc2a27dae3f5d53bd5d7', author: 'Designer' },
  { id: 'pr128', pr: 128, chain: 'board-v2', ref: 'a864f1f2d0547361e3197639dc1adf2ed4e9bd19', author: 'Designer' },
  { id: 'pr129', pr: 129, chain: 'board-v2', ref: 'e1d4e748036577e1a9fa76aa56c7e17401167e73', author: 'Designer' },
  { id: 'pr130', pr: 130, chain: 'board-v2', ref: '15e61f0bbd043930a578900862be9d5156b3b602', author: 'Designer' },
  { id: 'pr144', pr: 144, chain: 'board-v2', ref: '95d70f0c885f6b7d619c4ebff935093dfe891ea6', author: 'Designer' },
  { id: 'pr158', pr: 158, chain: 'board-v2', ref: '7cf140aff60374a99b3ac83e2c67b7cf6916348e', author: 'Designer' },
  { id: 'pr159', pr: 159, chain: 'board-v2', ref: '7f3344ede87e8291c34601e649ca4ec91432b4db', author: 'Designer' },
  { id: 'pr160', pr: 160, chain: 'board-v2', ref: '90dcd58aa83920783c927245fc1a2582c4ef05d7', author: 'Designer' },
  { id: 'pr161', pr: 161, chain: 'board-v2', ref: '98ccb984ee6213147eca16fe2748148eb4ddfd0d', author: 'Designer' },
  { id: 'pr93', pr: 93, chain: 'codex-design', ref: '74ce6ee386756b45096f65c520ad3936b217c321', author: 'Codex' },
  { id: 'pr113', pr: 113, chain: 'codex-design', ref: '859580c80514d7c8280a803b8933ccd164653c79', author: 'Codex' },
  { id: 'pr117', pr: 117, chain: 'codex-design', ref: '428c1c741c5ccdfdf42947570530adea1b3a0757', author: 'Codex' },
  { id: 'pr124', pr: 124, chain: 'codex-design', ref: '44c25268a04debaa00d6a7ec3f02d254775704c8', author: 'Codex' },
];
// Designer chains, newest work first: the first chain that holds a path gives its current version.
const CHAIN_PRECEDENCE = ['board-v2', 'abilities', 'board-motion', 'phone-first', 'art-direction'];

export const FAMILIES = [
  ['Character rig and crew', /^design\/board-motion\/figures\//],
  ['Patient and prisoner clothing', /wardrobe|outfit|gown/],
  ['Board motion: rooms, slots and director', /^design\/board-motion\//],
  ['Private Talk capsule', /capsule/],
  ['Hospital: four-berth ward and overflow', /hospital-ward-four|slots-four|fit-four|turns-four|overflow|medical-four|four\.test/],
  ['Hospital medical films', /medical|hospital-ward/],
  ['Captain RELEASE / EJECT', /captain/],
  ['Phantom Clone', /clone/],
  ['Blackout', /blackout|lighting/],
  ['ATTACK BLOCKED', /blocked/],
  ['Board v2 slots and phone layout', /^design\/board-v2\/(scenes\/slots|js\/(fit|turns|layout)|contract\/slots)/],
  ['Board v2 review page and tools', /^design\/board-v2\/|board-v2/],
  ['Ability dossier', /^design\/abilities\/|abilities/],
  ['Setup art: character choice and role card', /^design\/setup-art\//],
  ['Phone kit', /^design\/phone-kit\/|phone-kit/],
  ['Phone feedback (Codex adaptation)', /^design\/phone-feedback\//],
  ['V1 phone journey', /^design\/v1-phone\/|v1-phone/],
  ['Integration release registries', /^design\/releases\//],
  ['Comic board exports and sources', /^design\/(exports|source|review|contract)\//],
  ['Explorations and studies', /^design\/(explorations|studies|prototypes)\//],
  ['Cinematic library', /^design\/cinematic\/|cinematic/],
  ['Design tools', /^design\/tools\//],
  ['Design tokens and tests', /^packages\/design-tokens\//],
  ['Design documentation', /^docs\/design\/|^design\/README/],
];
export const familyOf = path => FAMILIES.find(([, pattern]) => pattern.test(path))?.[0] ?? 'Other design files';

const OBSOLETE = [
  ['Cracker', /\bCracker\b/],
  ['Soldier Blue', /\bSoldier Blue\b/],
  ['Showdown', /\bShowdown\b/],
  ['Final Zone', /\bFinal Zone\b/],
];
const TEXT = /\.(mjs|js|json|md|html|css|svg|txt)$/;

function listTree(ref) {
  const out = git('ls-tree', '-r', '-l', ref, '--', ...SCOPE);
  const map = new Map();
  for (const line of out.split('\n')) {
    const m = /^\d+ blob ([0-9a-f]{40})\s+(\d+)\t(.+)$/.exec(line);
    if (m) map.set(m[3], { blob: m[1], size: Number(m[2]) });
  }
  return map;
}

/** Streams blobs through one `git cat-file --batch` and returns blob -> Buffer. */
function readBlobs(blobs) {
  return new Promise((done, fail) => {
    const child = spawn('git', ['-C', repoRoot, 'cat-file', '--batch'], { stdio: ['pipe', 'pipe', 'inherit'] });
    const queue = [...blobs];
    const result = new Map();
    let buffer = Buffer.alloc(0);
    child.stdout.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        const eol = buffer.indexOf(10);
        if (eol < 0) return;
        const header = buffer.subarray(0, eol).toString();
        const [sha, , size] = header.split(' ');
        const total = eol + 1 + Number(size) + 1;
        if (buffer.length < total) return;
        result.set(sha, buffer.subarray(eol + 1, eol + 1 + Number(size)));
        buffer = buffer.subarray(total);
      }
    });
    child.on('close', code => (code === 0 ? done(result) : fail(new Error(`git cat-file exited ${code}`))));
    child.stdin.end(queue.join('\n') + '\n');
  });
}

const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const lastChange = (ref, path) => Number(git('log', '-1', '--format=%ct', ref, '--', path).trim() || 0);

/** Every source registration in Integration's registries on the runtime baseline. */
function runtimeRegistrations(mainTree, contents) {
  const found = [];
  const normalize = path => path.replace(/^design\/releases\/source-snapshots\/[0-9a-f]{40}\//, '');
  const visit = (node, registry, key) => {
    if (Array.isArray(node)) return node.forEach(item => visit(item, registry, key));
    if (!node || typeof node !== 'object') return;
    const source = typeof node.source === 'string' ? node.source : typeof node.sourcePath === 'string' ? node.sourcePath : null;
    if (source && /^design\//.test(source)) {
      found.push({
        source: normalize(source),
        sha256: node.sourceSha256 ?? (key && !key.startsWith('design/') ? node.sha256 ?? null : null),
        runtime: node.runtime ?? node.runtimePath ?? node.proposedRuntime ?? (key && key.startsWith('apps/') ? key : null),
        sourceCommit: node.sourceCommit ?? null,
        registry,
      });
    }
    for (const [childKey, value] of Object.entries(node)) {
      if (childKey === 'sourceHashes' || childKey === 'assetHashes') {
        for (const [path, hash] of Object.entries(value ?? {})) if (/^design\//.test(path)) found.push({ source: normalize(path), sha256: hash, runtime: key ?? null, sourceCommit: node.sourceCommit ?? null, registry });
        continue;
      }
      visit(value, registry, childKey);
    }
  };
  for (const [path, entry] of mainTree) {
    if (!/^design\/(releases|tools\/lib)\/.+\.json$/.test(path)) continue;
    try { visit(JSON.parse(contents.get(entry.blob).toString('utf8')), path, null); } catch { /* not a registry */ }
  }
  const extra = git('ls-tree', '-r', '-l', HEADS[0].ref, '--', 'docs/frontend');
  for (const line of extra.split('\n')) {
    const m = /^\d+ blob ([0-9a-f]{40})\s+\d+\tdocs\/frontend\/(.+provenance\.json)$/.exec(line);
    if (!m) continue;
    try { visit(JSON.parse(git('cat-file', '-p', m[1])), `docs/frontend/${m[2]}`, null); } catch { /* not a registry */ }
  }
  return found;
}

async function main() {
  const trees = new Map(HEADS.map(head => [head.id, listTree(head.ref)]));
  const blobs = new Set();
  for (const tree of trees.values()) for (const { blob } of tree.values()) blobs.add(blob);
  const contents = await readBlobs(blobs);
  const hash = new Map([...contents].map(([blob, buffer]) => [blob, sha256(buffer)]));
  const registrations = runtimeRegistrations(trees.get('main'), contents);
  const byPath = new Map();
  for (const [id, tree] of trees) for (const [path, entry] of tree) {
    if (!byPath.has(path)) byPath.set(path, new Map());
    const variants = byPath.get(path);
    if (!variants.has(entry.blob)) variants.set(entry.blob, { sha256: hash.get(entry.blob), size: entry.size, heads: [] });
    variants.get(entry.blob).heads.push(id);
  }
  const headById = new Map(HEADS.map(head => [head.id, head]));
  const headTime = new Map(HEADS.map(head => [head.id, Number(git('log', '-1', '--format=%ct', head.ref).trim())]));
  const tipOf = chain => [...HEADS].reverse().find(head => head.chain === chain);
  const files = [];
  for (const [path, variants] of [...byPath].sort(([a], [b]) => a.localeCompare(b))) {
    const holders = id => [...variants.entries()].find(([, v]) => v.heads.includes(id));
    // The Designer's current version: from the newest Designer chain tip that holds the path.
    let current = null;
    for (const chain of CHAIN_PRECEDENCE) {
      const tip = tipOf(chain);
      const held = holders(tip.id);
      if (held) { current = { blob: held[0], head: tip.id, ...held[1] }; break; }
    }
    const onMain = holders('main');
    let mainState = onMain ? 'absent from Designer heads' : 'absent from main';
    if (current && onMain) {
      if (onMain[0] === current.blob) mainState = 'identical';
      else {
        const designerTime = lastChange(headById.get(current.head).ref, path);
        const mainTime = lastChange(HEADS[0].ref, path);
        mainState = mainTime > designerTime ? 'main holds a newer version (changed after the Designer)' : 'main holds an older version';
      }
    }
    // The earliest Designer PR, in any chain, whose head holds exactly the current version.
    const pr = current ? HEADS.filter(head => head.author === 'Designer' && variants.get(current.blob).heads.includes(head.id))
      .sort((x, y) => headTime.get(x.id) - headTime.get(y.id))[0]?.pr ?? null : null;
    const runtime = registrations.filter(r => r.source === path).map(r => ({
      runtime: r.runtime, registry: r.registry, sourceCommit: r.sourceCommit, registeredSha256: r.sha256,
      matchesDesignerCurrent: current && r.sha256 ? r.sha256 === current.sha256 : null,
      matchesMain: onMain && r.sha256 ? r.sha256 === onMain[1].sha256 : null,
    }));
    const text = TEXT.test(path) && current ? contents.get(current.blob)?.toString('utf8') ?? '' : '';
    const obsolete = OBSOLETE.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
    files.push({
      path, family: familyOf(path),
      current: current ? { sha256: current.sha256, size: current.size, head: current.head, pr } : null,
      main: onMain ? { sha256: onMain[1].sha256, size: onMain[1].size } : null,
      mainState,
      runtime,
      obsoleteNames: obsolete,
      // Every version is listed only where the heads disagree; otherwise `current` says it all.
      variants: variants.size > 1 ? [...variants.values()].map(v => ({ sha256: v.sha256, size: v.size, heads: v.heads })) : undefined,
    });
  }
  const families = new Map();
  for (const file of files) {
    const f = families.get(file.family) ?? { family: file.family, files: 0, bytes: 0, identicalOnMain: 0, absentFromMain: 0, mainNewer: 0, mainOlder: 0, codexOnly: 0, runtimeRegistered: 0, runtimeCurrent: 0, runtimeOlder: 0, obsoleteNames: 0, prs: new Set() };
    f.files += 1; f.bytes += file.current?.size ?? file.main?.size ?? 0;
    if (file.mainState === 'identical') f.identicalOnMain += 1;
    else if (file.mainState === 'absent from main') f.absentFromMain += 1;
    else if (file.mainState.startsWith('main holds a newer')) f.mainNewer += 1;
    else if (file.mainState.startsWith('main holds an older')) f.mainOlder += 1;
    else f.codexOnly += 1;
    if (file.runtime.length) {
      f.runtimeRegistered += 1;
      if (file.runtime.some(r => r.matchesDesignerCurrent)) f.runtimeCurrent += 1;
      else if (file.runtime.some(r => r.matchesDesignerCurrent === false)) f.runtimeOlder += 1;
    }
    if (file.obsoleteNames.length) f.obsoleteNames += 1;
    if (file.current?.pr) f.prs.add(file.current.pr);
    families.set(file.family, f);
  }
  const heads = HEADS.map(head => ({ ...head, date: git('log', '-1', '--format=%cI', head.ref).trim(), subject: git('log', '-1', '--format=%s', head.ref).trim() }));
  const report = {
    generatedBy: 'design/tools/cinematic-inventory.mjs',
    scope: SCOPE,
    heads,
    summary: {
      paths: files.length,
      designerCurrent: files.filter(f => f.current).length,
      absentFromMain: files.filter(f => f.mainState === 'absent from main').length,
      identicalOnMain: files.filter(f => f.mainState === 'identical').length,
      mainNewer: files.filter(f => f.mainState.startsWith('main holds a newer')).length,
      mainOlder: files.filter(f => f.mainState.startsWith('main holds an older')).length,
      notDesigner: files.filter(f => f.mainState === 'absent from Designer heads').length,
      runtimeRegistered: files.filter(f => f.runtime.length).length,
      runtimeOlderThanDesigner: files.filter(f => f.runtime.length && !f.runtime.some(r => r.matchesDesignerCurrent) && f.runtime.some(r => r.matchesDesignerCurrent === false)).length,
      withObsoleteNames: files.filter(f => f.obsoleteNames.length).length,
    },
    families: [...families.values()].map(f => ({ ...f, prs: [...f.prs].sort((a, b) => a - b) })).sort((a, b) => a.family.localeCompare(b.family)),
    files,
  };
  await mkdir(dirname(OUT), { recursive: true });
  // One line per file keeps the record reviewable in a diff without a megabyte of indentation.
  const { files: list, ...head } = report;
  const body = JSON.stringify(head, null, 1).replace(/\n}$/, '');
  await writeFile(OUT, `${body},\n "files": [\n${list.map(file => `  ${JSON.stringify(file)}`).join(',\n')}\n ]\n}\n`);
  console.log(JSON.stringify(report.summary));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
