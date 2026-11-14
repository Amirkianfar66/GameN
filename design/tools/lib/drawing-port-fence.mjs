// mothership:dev-only
// Exact reviewed drawing derivatives may retain their source version/prose.
// They never authorize prototype imports, unlisted files or self-issued provenance.
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { readFileSync, lstatSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

export const REVIEWED_DRAWING_PORTS = JSON.parse(readFileSync(new URL('./reviewed-drawing-ports.json', import.meta.url), 'utf8'));
export const contentSha256 = value => createHash('sha256').update(value).digest('hex');
export const CANDIDATE_DRAWING_POLICY = 'design/releases/board-v2-four-drawing-approval.json';
export const PLANET_DRAWING_POLICY = 'design/releases/planet-drawing-approval.json';
export const CREW_DRAWING_POLICY = 'design/releases/crew-drawing-approval.json';
export const CREW_CONSUMER_DRAWING_POLICY = 'design/releases/crew-consumer-drawing-approval.json';
export const PREGAME_DRAWING_POLICY = 'design/releases/pregame-drawing-approval.json';
export const PREGAME_PRODUCTION_DRAWING_POLICY = 'design/releases/pregame-production-drawing-approval.json';
export const PHONE_UI_PRODUCTION_DRAWING_POLICY = 'design/releases/phone-ui-production-drawing-approval.json';
export const HOST_ABORT_DRAWING_POLICY = 'design/releases/host-abort-production-drawing-approval.json';
export const FOOD_SOURCE_DRAWING_POLICY = 'design/releases/food-source-drawing-policy.json';
const FOOD_SOURCE_DRAWING_POLICY_SHA256 = '623b4db1cd14fcd85aebf90c790d50a6d65329f83f3449775923f687f55e0499';
const HOST_ABORT_DRAWING_POLICY_SHA256 = '375018d9eb9bdb7fb745bde516e712f3c5b7160cc07e9b60f2b311c702eb84c4';
const PHONE_UI_PRODUCTION_DRAWING_POLICY_SHA256 = '1ee59db128b1216e8f39e7b4af5893bcb0d01aff3411ae12504859fc0af21039';
const PREGAME_PRODUCTION_DRAWING_POLICY_SHA256 = '1dafdb0d823f8e561cea94660a02f0cb9a049a92527c92d3f51a2f42e662003b';
const PREGAME_DRAWING_POLICY_SHA256 = 'd93469af3e96ddcd35fa41b650ebc6161b34a396dc68a29610c58ce4697fc60e';
const CREW_CONSUMER_DRAWING_POLICY_SHA256 = 'c7ebfa715d1b197c160156c199c8d90c14276f516b96fd99210cc5bb4a3ef9dc';
const CREW_DRAWING_POLICY_SHA256 = 'f2be8f9c702443effefcbb63fff36aab97f4f4d1bff3c9e13246077c95800f25';
const PLANET_DRAWING_POLICY_SHA256 = '0fc219ac5f1f8598a715c1a35140ff18f04cc6593785329b9219cb3d2478d497';
const CANDIDATE_DRAWING_POLICY_SHA256 = '5ef70aa1da1f78b81ca945485b08083aa70856bb9b482df9b3b4e131c23869a0';

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
  let planetBytes;
  try { planetBytes = readFileSync(resolve(root, PLANET_DRAWING_POLICY)); }
  catch (error) { if (error.code === 'ENOENT') return policy; throw error; }
  if (contentSha256(planetBytes) !== PLANET_DRAWING_POLICY_SHA256) throw Error('Planet drawing approval content hash differs');
  const planet = JSON.parse(planetBytes);
  if (planet.parentApprovalSha256 !== CANDIDATE_DRAWING_POLICY_SHA256) throw Error('Planet drawing parent approval differs');
  for (const key of ['metadataFiles', 'buildFiles']) policy[key] = { ...policy[key], ...planet[key] };
  let crewBytes;
  try { crewBytes = readFileSync(resolve(root, CREW_DRAWING_POLICY)); }
  catch (error) { if (error.code === 'ENOENT') return policy; throw error; }
  if (contentSha256(crewBytes) !== CREW_DRAWING_POLICY_SHA256) throw Error('Crew drawing approval content hash differs');
  const crew = JSON.parse(crewBytes);
  if (crew.parentApprovalSha256 !== PLANET_DRAWING_POLICY_SHA256) throw Error('Crew drawing parent approval differs');
  for (const key of ['ports', 'sourceHashes', 'requiredFiles', 'metadataFiles', 'buildFiles']) policy[key] = { ...policy[key], ...crew[key] };
  let consumerBytes;
  try { consumerBytes = readFileSync(resolve(root, CREW_CONSUMER_DRAWING_POLICY)); }
  catch (error) { if (error.code === 'ENOENT') return policy; throw error; }
  if (contentSha256(consumerBytes) !== CREW_CONSUMER_DRAWING_POLICY_SHA256) throw Error('Crew consumer drawing approval content hash differs');
  const consumer = JSON.parse(consumerBytes);
  if (consumer.parentApprovalSha256 !== CREW_DRAWING_POLICY_SHA256) throw Error('Crew consumer drawing parent approval differs');
  for (const key of ['buildFiles', 'metadataFiles', 'requiredFiles']) policy[key] = { ...policy[key], ...consumer[key] };
  let pregameBytes;
  try { pregameBytes = readFileSync(resolve(root, PREGAME_DRAWING_POLICY)); }
  catch (error) { if (error.code === 'ENOENT') return policy; throw error; }
  if (contentSha256(pregameBytes) !== PREGAME_DRAWING_POLICY_SHA256) throw Error('Pregame drawing approval content hash differs');
  const pregame = JSON.parse(pregameBytes);
  if (pregame.parentApprovalSha256 !== CREW_CONSUMER_DRAWING_POLICY_SHA256) throw Error('Pregame drawing parent approval differs');
  for (const key of ['ports', 'sourceHashes', 'requiredFiles', 'metadataFiles', 'buildFiles']) policy[key] = { ...policy[key], ...pregame[key] };
  let productionStat;
  try { productionStat = lstatSync(resolve(root, PREGAME_PRODUCTION_DRAWING_POLICY)); }
  catch (error) { if (error.code === 'ENOENT') return policy; throw error; }
  if (productionStat.isSymbolicLink() || !productionStat.isFile()) throw Error('Pregame production drawing approval must be a regular file');
  const productionBytes = readFileSync(resolve(root, PREGAME_PRODUCTION_DRAWING_POLICY));
  if (contentSha256(productionBytes) !== PREGAME_PRODUCTION_DRAWING_POLICY_SHA256) throw Error('Pregame production drawing approval content hash differs');
  const production = JSON.parse(productionBytes);
  if (production.parentApprovalSha256 !== PREGAME_DRAWING_POLICY_SHA256) throw Error('Pregame production drawing parent differs');
  for (const key of ['requiredFiles', 'metadataFiles', 'buildFiles']) policy[key] = { ...policy[key], ...production[key] };
  policy.productionConsumerApproval = true;
  let phoneStat;
  try { phoneStat = lstatSync(resolve(root, PHONE_UI_PRODUCTION_DRAWING_POLICY)); }
  catch (error) { if (error.code === 'ENOENT') return policy; throw error; }
  if (phoneStat.isSymbolicLink() || !phoneStat.isFile()) throw Error('Phone UI drawing approval must be a regular file');
  const phoneBytes = readFileSync(resolve(root, PHONE_UI_PRODUCTION_DRAWING_POLICY));
  if (contentSha256(phoneBytes) !== PHONE_UI_PRODUCTION_DRAWING_POLICY_SHA256) throw Error('Phone UI drawing approval content hash differs');
  const phone = JSON.parse(phoneBytes);
  if (phone.schema !== 'mothership.phone-ui-production-drawing-approval/1' ||
    phone.parentApprovalSha256 !== PREGAME_PRODUCTION_DRAWING_POLICY_SHA256) throw Error('Phone UI drawing parent differs');
  // This native consumer supplement cannot add a drawing port or change source pins.
  for (const key of ['requiredFiles', 'metadataFiles', 'buildFiles']) policy[key] = { ...policy[key], ...phone[key] };
  let abortStat;
  try { abortStat = lstatSync(resolve(root, HOST_ABORT_DRAWING_POLICY)); }
  catch (error) { if (error.code === 'ENOENT') return policy; throw error; }
  if (abortStat.isSymbolicLink() || !abortStat.isFile()) throw Error('Host confirmation drawing approval must be a regular file');
  const abortBytes = readFileSync(resolve(root, HOST_ABORT_DRAWING_POLICY));
  if (contentSha256(abortBytes) !== HOST_ABORT_DRAWING_POLICY_SHA256) throw Error('Host confirmation drawing approval content hash differs');
  const abort = JSON.parse(abortBytes);
  if (abort.schema !== 'mothership.host-abort-production-drawing-approval/1' ||
    abort.parentApprovalSha256 !== PHONE_UI_PRODUCTION_DRAWING_POLICY_SHA256)
    throw Error('Host confirmation drawing parent differs');
  // Only exact input hashes are extended. Artwork, ports, styles and metadata stay frozen.
  policy.requiredFiles = { ...policy.requiredFiles, ...abort.requiredFiles };
  let foodStat;
  try { foodStat = lstatSync(resolve(root, FOOD_SOURCE_DRAWING_POLICY)); }
  catch (error) { if (error.code === 'ENOENT') return policy; throw error; }
  if (foodStat.isSymbolicLink() || !foodStat.isFile()) throw Error('Food drawing policy must be a regular file');
  const foodBytes = readFileSync(resolve(root, FOOD_SOURCE_DRAWING_POLICY));
  if (contentSha256(foodBytes) !== FOOD_SOURCE_DRAWING_POLICY_SHA256) throw Error('Food drawing policy content hash differs');
  const food = JSON.parse(foodBytes);
  if (food.schema !== 'mothership.food-source-drawing-policy/1' || food.status !== 'technical-source-registration' ||
    food.parentApprovalSha256 !== HOST_ABORT_DRAWING_POLICY_SHA256) throw Error('Food drawing policy parent differs');
  for (const key of ['ports', 'requiredFiles', 'sourceHashes', 'buildFiles']) policy[key] = { ...policy[key], ...food[key] };
  return policy;
}
const DRAWING_DIRECTORIES = ['apps/game/hosted/scene-drawing/', 'apps/game/hosted/board-v2-drawing/', 'apps/game/hosted/crew-drawing/', 'apps/game/hosted/pregame-films/'];
const isFoodDrawingPath = path => /^apps\/game\/hosted\/planet\/food(?:-|\.)/.test(path);
const DIRECTORIES = ['apps/game/src', 'apps/game/hosted', 'packages/presentation/src'];

function normalize(value) {
  for (let i = 0; i < 2; i++) { try { value = decodeURIComponent(value); } catch { break; } }
  return value.replaceAll('\\', '/').replace(/\/+/g, '/').toLowerCase();
}
const prototypeLocation = value => /(?:^|\/)(?:board-motion|phone-feedback|phone-kit|board-v2)(?:\/|$)/.test(normalize(value))
  || /(?:^|\/)design\/(?:pregame-films|food-supply|phone-ui)(?:\/|$)/.test(normalize(value));
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
  return staticReferences(path, content, prototypeLocation, /(?:(?:design[\\/])?(?:board-motion|phone-feedback|phone-kit|board-v2)|design[\\/](?:pregame-films|food-supply|phone-ui))[\\/][\w./%\\-]*/gi);
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
  let policy, acceptsCandidate = () => false, acceptsProduction = () => false;
  try {
    policy = readDrawingPolicy(root);
    if (policy.productionConsumerApproval) {
      const { readPregameProductionConsumerApproval, acceptsPregameProductionFile } = await import('../../../scripts/pregame-consumer-approval.mjs');
      const production = readPregameProductionConsumerApproval(root);
      if (!production) throw Error('Required production consumer approval is missing');
      acceptsProduction = (path, expected, actual) => acceptsPregameProductionFile(production, path, expected, actual);
    }
    if (process.env.MOTHERSHIP_PREGAME_CONSUMER_REVIEW === '1') {
      const { readPregameConsumerCandidate, acceptsPregameCandidateFile } = await import('../../../scripts/pregame-consumer-candidate.mjs');
      const candidate = readPregameConsumerCandidate(root);
      acceptsCandidate = (path, expected, actual) => acceptsPregameCandidateFile(candidate, path, expected, actual);
    }
  } catch (error) { return [error.message]; }
  const acceptedHash = (path, expected, actual) => expected === actual || acceptsProduction(path, expected, actual) || acceptsCandidate(path, expected, actual);
  const read = path => readFile(resolve(root, path));
  for (const [path, expected] of Object.entries(policy.requiredFiles ?? {})) {
    const bytes = await read(path).catch(() => null);
    if (bytes === null || !acceptedHash(path, expected, contentSha256(bytes))) problems.push(`${path}: required candidate drawing input differs`);
  }
  for (const directory of DIRECTORIES) {
    const entries = await readdir(resolve(root, directory), { withFileTypes: true, recursive: true }).catch(() => []);
    for (const entry of entries) {
      const path = `${entry.parentPath ?? entry.path}/${entry.name}`.replace(`${root}/`, '');
      if (entry.isSymbolicLink() && (isFoodDrawingPath(path) || DRAWING_DIRECTORIES.some(directory => path === directory.slice(0, -1) || path.startsWith(directory))))
        problems.push(`${path}: symlink in the adopted drawing ports`);
      if (entry.isFile()) files.push(path);
    }
  }
  let usesDrawingPorts = false;
  for (const path of files.sort()) {
    const bytes = await read(path), content = bytes.toString('utf8'), hash = contentSha256(bytes);
    const port = policy.ports[path], style = policy.styles[path], build = policy.buildFiles[path], metadata = policy.metadataFiles?.[path];
    const reviewedPort = port?.sha256 === hash, reviewedStyle = style?.sha256 === hash, reviewedBuild = build?.sha256 === hash;
    const reviewedMetadata = metadata && acceptedHash(path, metadata.sha256, hash);
    const drawingPath = isFoodDrawingPath(path) || DRAWING_DIRECTORIES.some(directory => path.startsWith(directory));
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
      const family = forbidden.map(value => normalize(value).match(/(?:^|\/)(phone-feedback|phone-kit|board-v2|board-motion|pregame-films)(?:\/|$)/)?.[1]).find(Boolean) ?? 'board-motion';
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
