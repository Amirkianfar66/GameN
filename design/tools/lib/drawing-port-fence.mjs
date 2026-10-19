// mothership:dev-only
// Exact reviewed drawing derivatives may retain their source version/prose.
// They never authorize prototype imports, unlisted files or self-issued provenance.
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

export const REVIEWED_DRAWING_PORTS = JSON.parse(readFileSync(new URL('./reviewed-drawing-ports.json', import.meta.url), 'utf8'));
export const contentSha256 = value => createHash('sha256').update(value).digest('hex');
export const CANDIDATE_DRAWING_POLICY = 'design/releases/board-v2-four-drawing-approval.json';
const CANDIDATE_DRAWING_POLICY_SHA256 = 'cd70ed03ae15bc83e55ab738dbdc1abe25340b99ecc8043ad91c591fc0e299d8';

// Absence means a historical-only checkout. A present supplement must match the
// independently reviewed bytes; neither malformed data nor changed hashes fall back.
export function readDrawingPolicy(root) {
  let bytes;
  try { bytes = readFileSync(resolve(root, CANDIDATE_DRAWING_POLICY)); }
  catch (error) { if (error.code === 'ENOENT') return REVIEWED_DRAWING_PORTS; throw error; }
  if (contentSha256(bytes) !== CANDIDATE_DRAWING_POLICY_SHA256) throw Error('Candidate drawing approval content hash differs');
  const supplement = JSON.parse(bytes);
  if (contentSha256(readFileSync(resolve(root, 'design/tools/lib/reviewed-drawing-ports.json'))) !== supplement.historicalPolicySha256) {
    throw Error('Historical drawing approval content hash differs');
  }
  const policy = { ...REVIEWED_DRAWING_PORTS, requiredFiles: supplement.requiredFiles, abilityProseFiles: supplement.abilityProseFiles };
  for (const key of ['ports', 'metadataFiles', 'buildFiles', 'sourceHashes']) policy[key] = { ...policy[key], ...supplement[key] };
  return policy;
}
const DRAWING_DIRECTORIES = ['apps/game/hosted/scene-drawing/', 'apps/game/hosted/board-v2-drawing/'];
const DIRECTORIES = ['apps/game/src', 'apps/game/hosted', 'packages/presentation/src'];

function normalize(value) {
  for (let i = 0; i < 2; i++) { try { value = decodeURIComponent(value); } catch { break; } }
  return value.replaceAll('\\', '/').replace(/\/+/g, '/').toLowerCase();
}
const prototypeLocation = value => /(?:^|\/)(?:board-motion|phone-feedback|phone-kit|board-v2)(?:\/|$)/.test(normalize(value));
function staticString(node) {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isParenthesizedExpression(node)) return staticString(node.expression);
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = staticString(node.left), right = staticString(node.right);
    return left !== null && right !== null ? left + right : null;
  }
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;
    for (const span of node.templateSpans) {
      const part = staticString(span.expression);
      if (part === null) return null;
      value += part + span.literal.text;
    }
    return value;
  }
  return null;
}

/** Includes imports, URLs, fetches and stored path references; never executes a module. */
function staticReferences(path, content, location, nonJsPattern) {
  const references = new Set();
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JS);
  const visit = node => {
    const value = staticString(node);
    if (value !== null && location(value)) references.add(value);
    ts.forEachChild(node, visit);
  };
  visit(source);
  // Non-JavaScript resources still cannot name the prototype. JS comments in an
  // exact port are historical prose, not imports; unknown prose remains refused below.
  if (!/\.[cm]?[jt]sx?$/.test(path)) {
    for (const match of content.matchAll(nonJsPattern)) references.add(match[0]);
  }
  return [...references];
}

export function prototypeReferences(path, content) {
  return staticReferences(path, content, prototypeLocation, /(?:design[\\/])?(?:board-motion|phone-feedback|phone-kit|board-v2)[\\/][\w./%\\-]*/gi);
}
export function abilityPrototypeReferences(path, content) {
  return staticReferences(path, content, value => /(?:^|\/)design\/abilities(?:\/|$)/.test(normalize(value)), /design[\\/]abilities[\\/][\w./%\\-]*/gi);
}
export function reviewedAbilityProse(policy, path, content) {
  const named = path === 'apps/game/hosted/board-v2-drawing/lighting.mjs' || policy.abilityProseFiles?.includes(path);
  return Boolean(named && policy.ports[path]?.sha256 === contentSha256(content) && abilityPrototypeReferences(path, content).length === 0);
}

export async function productionDrawingProblems(root) {
  root = resolve(root);
  const problems = [], files = [];
  let policy;
  try { policy = readDrawingPolicy(root); } catch (error) { return [error.message]; }
  const read = path => readFile(resolve(root, path));
  for (const [path, expected] of Object.entries(policy.requiredFiles ?? {})) {
    const bytes = await read(path).catch(() => null);
    if (bytes === null || contentSha256(bytes) !== expected) problems.push(`${path}: required candidate drawing input differs`);
  }
  for (const directory of DIRECTORIES) {
    const entries = await readdir(resolve(root, directory), { withFileTypes: true, recursive: true }).catch(() => []);
    for (const entry of entries) if (entry.isFile()) files.push(`${entry.parentPath ?? entry.path}/${entry.name}`.replace(`${root}/`, ''));
  }
  let usesDrawingPorts = false;
  for (const path of files.sort()) {
    const bytes = await read(path), content = bytes.toString('utf8'), hash = contentSha256(bytes);
    const port = policy.ports[path], style = policy.styles[path], build = policy.buildFiles[path], metadata = policy.metadataFiles?.[path];
    const reviewedPort = port?.sha256 === hash, reviewedStyle = style?.sha256 === hash, reviewedBuild = build?.sha256 === hash;
    const reviewedMetadata = metadata?.sha256 === hash;
    const drawingPath = DRAWING_DIRECTORIES.some(directory => path.startsWith(directory));
    if (drawingPath) {
      usesDrawingPorts = true;
      if (!port) problems.push(`${path}: unreviewed file in the adopted drawing ports`);
      else if (!reviewedPort) problems.push(`${path}: reviewed drawing port content hash differs`);
    }
    if (port && !drawingPath && !reviewedPort) problems.push(`${path}: reviewed drawing port content hash differs`);
    if (style && !reviewedStyle) problems.push(`${path}: reviewed drawing stylesheet content hash differs`);
    if (metadata && !reviewedMetadata) problems.push(`${path}: reviewed native metadata file content hash differs`);
    if (build && !reviewedBuild) problems.push(`${path}: reviewed build adapter content hash differs`);
    if (reviewedStyle) {
      const source = await read(style.source).catch(() => null);
      if (source === null || contentSha256(source) !== style.sourceSha256) problems.push(`${path}: corrected stylesheet source hash differs from ${style.sourceCommit}`);
    }
    if (reviewedBuild) {
      for (const [asset, expected] of Object.entries(build.assetHashes)) {
        const actual = await read(asset).catch(() => null);
        if (actual === null || contentSha256(actual) !== expected) problems.push(`${path}: reviewed build asset input differs: ${asset}`);
      }
    }
    // These are exact literal values at exact reviewed file hashes. Moving the
    // file or changing even one byte loses the exception. They permit native
    // data attributes and retained explanatory text, never arbitrary paths.
    const permitted = new Set([
      ...(reviewedBuild ? build.permittedLiterals : []),
      ...(reviewedPort ? port.permittedLiterals ?? [] : []),
      ...(reviewedMetadata ? metadata.permittedLiterals : []),
    ].map(normalize));
    const forbidden = prototypeReferences(path, content).filter(value => !permitted.has(normalize(value)));
    if (forbidden.length || (content.toLowerCase().includes('board-motion') && !reviewedPort && !reviewedStyle && !reviewedBuild)) {
      const family = forbidden.map(value => normalize(value).match(/(?:^|\/)(phone-feedback|phone-kit|board-v2|board-motion)(?:\/|$)/)?.[1]).find(Boolean) ?? 'board-motion';
      problems.push(`${path}: production code refers to the ${family} prototype`);
    }
    if ((content.includes('design/abilities') || abilityPrototypeReferences(path, content).length)
      && !reviewedAbilityProse(policy, path, content)) problems.push(`${path}: production code refers to the ability-art prototype`);
  }
  if (usesDrawingPorts) {
    for (const [source, expected] of Object.entries(policy.sourceHashes)) {
      const actual = await read(source).catch(() => null);
      if (actual === null || contentSha256(actual) !== expected) problems.push(`${source}: frozen drawing source hash differs from ${policy.sourceCommit}`);
    }
  }
  return problems;
}
