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
const SCENE_DIRECTORY = 'apps/game/hosted/scene-drawing/';
const DIRECTORIES = ['apps/game/src', 'apps/game/hosted', 'packages/presentation/src'];

function normalize(value) {
  for (let i = 0; i < 2; i++) { try { value = decodeURIComponent(value); } catch { break; } }
  return value.replaceAll('\\', '/').replace(/\/+/g, '/').toLowerCase();
}
const prototypeLocation = value => /(?:^|\/)(?:board-motion|phone-feedback)(?:\/|$)/.test(normalize(value));
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
export function prototypeReferences(path, content) {
  const references = new Set();
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JS);
  const visit = node => {
    const value = staticString(node);
    if (value !== null && prototypeLocation(value)) references.add(value);
    ts.forEachChild(node, visit);
  };
  visit(source);
  // Non-JavaScript resources still cannot name the prototype. JS comments in an
  // exact port are historical prose, not imports; unknown prose remains refused below.
  if (!/\.[cm]?[jt]sx?$/.test(path)) {
    for (const match of content.matchAll(/(?:design[\\/])?(?:board-motion|phone-feedback)[\\/][\w./%\\-]*/gi)) references.add(match[0]);
  }
  return [...references];
}

export async function productionDrawingProblems(root) {
  const problems = [], files = [];
  const policy = REVIEWED_DRAWING_PORTS;
  const read = path => readFile(resolve(root, path));
  for (const directory of DIRECTORIES) {
    const entries = await readdir(resolve(root, directory), { withFileTypes: true, recursive: true }).catch(() => []);
    for (const entry of entries) if (entry.isFile()) files.push(`${entry.parentPath ?? entry.path}/${entry.name}`.replace(`${root}/`, ''));
  }
  let usesDrawingPorts = false;
  for (const path of files.sort()) {
    const bytes = await read(path), content = bytes.toString('utf8'), hash = contentSha256(bytes);
    const port = policy.ports[path], style = policy.styles[path], build = policy.buildFiles[path];
    const reviewedPort = port?.sha256 === hash, reviewedStyle = style?.sha256 === hash, reviewedBuild = build?.sha256 === hash;
    if (path.startsWith(SCENE_DIRECTORY)) {
      usesDrawingPorts = true;
      if (!port) problems.push(`${path}: unreviewed file in the adopted drawing ports`);
      else if (!reviewedPort) problems.push(`${path}: reviewed drawing port content hash differs`);
    }
    if (port && !path.startsWith(SCENE_DIRECTORY) && !reviewedPort) problems.push(`${path}: reviewed drawing port content hash differs`);
    if (style && !reviewedStyle) problems.push(`${path}: reviewed drawing stylesheet content hash differs`);
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
    const permitted = new Set(reviewedBuild ? build.permittedLiterals.map(normalize) : []);
    const forbidden = prototypeReferences(path, content).filter(value => !permitted.has(normalize(value)));
    if (forbidden.length || (content.toLowerCase().includes('board-motion') && !reviewedPort && !reviewedStyle && !reviewedBuild)) {
      const family = forbidden.some(value => /(?:^|\/)phone-feedback(?:\/|$)/.test(normalize(value))) ? 'phone-feedback' : 'board-motion';
      problems.push(`${path}: production code refers to the ${family} prototype`);
    }
  }
  if (usesDrawingPorts) {
    for (const [source, expected] of Object.entries(policy.sourceHashes)) {
      const actual = await read(source).catch(() => null);
      if (actual === null || contentSha256(actual) !== expected) problems.push(`${source}: frozen drawing source hash differs from ${policy.sourceCommit}`);
    }
  }
  return problems;
}
