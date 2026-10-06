// Plans every export from the editable sources. Pure: it reads the sources and the recipes
// and returns the files that must exist, without writing anything. build-exports.mjs writes
// that plan; check-assets.mjs compares it with what is on disk.
//
// Two plans are kept apart on purpose:
//   planExports  the real assets, into design/exports/, in bundles a client may load;
//   planStudies  the synthetic disclosure studies, into design/studies/, in no bundle.
// A recipe of one may not read a source of the other.
//
// A plan is deterministic. It contains no clock, no machine name and no random value, so
// the same sources always give the same bytes and the same content hashes.

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { attr, colors, findById, parseSvg, problemsIn, recolor, references, serialize, withoutAttr } from './svg.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';
const sha256 = content => createHash('sha256').update(content).digest('hex');

/** Frontend's production-exclusion check looks for this string. Every study file carries it. */
export const DEV_ONLY_SENTINEL = 'mothership:dev-only';

/** Where an asset may be drawn, when its recipe does not narrow it. */
export const BUNDLE_SURFACES = {
  'public-board': ['table', 'phone-public', 'phone-private'],
  'player-ui': ['phone-public', 'phone-private'],
  roles: ['phone-private'],
};

// A layer must be liftable on its own: whatever is above it in the source may place it on
// the sheet and nothing more.
const WRAPPER_ATTRIBUTES = new Set(['id', 'transform', 'xmlns', 'viewBox', 'width', 'height']);

function expand(entry) {
  if (!entry.each) return [entry];
  const [[name, values], ...rest] = Object.entries(entry.each);
  if (rest.length > 0) throw new Error('A recipe expands over one name only');
  const fill = value => JSON.parse(JSON.stringify({ ...entry, each: undefined }).replaceAll(`{${name}}`, value));
  return values.map(fill);
}

/**
 * An SVG file as a CSS url() that needs no request of its own. A stylesheet built from
 * these is one file: what a device draws later can never show in what it fetches later.
 */
export function dataUri(svg) {
  if (svg.includes("'")) throw new Error('An export contains a single quote and cannot be embedded');
  const body = svg.trim().replace(/%/g, '%25').replace(/#/g, '%23').replace(/"/g, "'").replace(/</g, '%3C').replace(/>/g, '%3E').replace(/\s+/g, ' ');
  return `url("data:image/svg+xml,${body}")`;
}

function composer(designRoot, { sourceRule }) {
  const read = path => readFile(resolve(designRoot, path), 'utf8');
  const sources = new Map();
  async function source(path) {
    sourceRule(path);
    if (!sources.has(path)) {
      const text = await read(`source/${path}`);
      sources.set(path, { path: `design/source/${path}`, sha256: sha256(text), root: parseSvg(text, `design/source/${path}`) });
    }
    return sources.get(path);
  }

  /** One layer lifted out of its source, plus the definitions it needs. */
  async function lift(layer, defaultSource) {
    const { ref, transform = null } = typeof layer === 'string' ? { ref: layer } : layer;
    const [file, id] = ref.startsWith('#') ? [defaultSource, ref.slice(1)] : ref.split('#');
    const from = await source(file);
    const found = findById(from.root, id);
    if (!found) throw new Error(`${from.path}: no element with id "${id}"`);
    for (const ancestor of found.ancestors) {
      const extra = ancestor.attrs.map(([name]) => name).filter(name => !WRAPPER_ATTRIBUTES.has(name) && !name.startsWith('data-'));
      if (extra.length > 0) throw new Error(`${from.path}: "${id}" would inherit ${extra.join(', ')} from <${ancestor.name}>. A layer carries its own paint.`);
    }
    // The id becomes a label: exports may be inlined side by side, and ids must stay unique there.
    let node = withoutAttr(withoutAttr(found.node, 'display'), 'id');
    node = { ...node, attrs: [['data-layer', id], ...node.attrs] };
    if (transform !== null) node = { type: 'element', name: 'g', attrs: [['transform', transform]], children: [node] };
    const definitions = new Map();
    const pending = [...references(found.node)];
    const defs = from.root.children.find(child => child.type === 'element' && child.name === 'defs');
    while (pending.length > 0) {
      const wanted = pending.pop();
      if (definitions.has(wanted)) continue;
      const definition = defs?.children.find(child => child.type === 'element' && attr(child, 'id') === wanted);
      if (!definition) throw new Error(`${from.path}: "${id}" refers to #${wanted}, which is not in <defs>`);
      definitions.set(wanted, definition);
      pending.push(...references(definition));
    }
    return { node, definitions, source: from };
  }

  async function compose(variant, owner) {
    const lifted = [];
    for (const layer of variant.layers) lifted.push(await lift(layer, owner.source));
    const definitions = new Map();
    for (const piece of lifted) {
      for (const [id, definition] of piece.definitions) {
        const known = definitions.get(id);
        if (known && serialize(known) !== serialize(definition)) throw new Error(`${owner.id}:${variant.variant}: two different definitions share the id "${id}"`);
        definitions.set(id, definition);
      }
    }
    let nodes = lifted.map(piece => piece.node);
    let defs = [...definitions.values()];
    for (const [from, to] of Object.entries(variant.recolor ?? {})) {
      nodes = nodes.map(node => recolor(node, from, to));
      defs = defs.map(node => recolor(node, from, to));
    }
    // Only the drawing vocabulary the sources use, with literal token colors: no text, no
    // title, no style, no link, no outside reference, no shape left to default to black.
    const problems = [...nodes, ...defs].flatMap(node => problemsIn(node));
    if (problems.length > 0) throw new Error(`${owner.id}:${variant.variant}: ${problems.join('; ')}`);
    return { nodes, defs, sources: [...new Set(lifted.map(piece => piece.source))] };
  }

  function paint(nodes, defs) {
    const found = new Set();
    for (const node of [...nodes, ...defs]) for (const color of colors(node)) found.add(color);
    return [...found].sort();
  }

  return { read, compose, paint };
}

function svgFile({ viewBox, nodes, defs, rootAttributes = '' }) {
  const [, , width, height] = viewBox.split(/\s+/).map(Number);
  const body = (defs.length > 0 ? `<defs>${defs.map(serialize).join('')}</defs>` : '') + nodes.map(serialize).join('');
  return { width, height, content: `<svg xmlns="${SVG_NS}" viewBox="${viewBox}" width="${width}" height="${height}"${rootAttributes}>${body}</svg>\n` };
}

const CONVENTIONS = {
  units: 'SVG user units. One unit is one CSS pixel at the size given by width and height; every export scales freely.',
  coordinates: 'Anchors are in the export\'s own viewBox: x to the right, y down, origin at the top left.',
  filenames: '<asset id>.<variant>.<first ten hex digits of the SHA-256 of the file>.svg. A changed file is a new name, so a file may be cached forever.',
  text: 'No export contains text. Every word on screen is live English text supplied by the client.',
  loading: 'What a device fetches must tell an observer nothing. A DOM client loads each bundle through its one stylesheet (bundles.<name>.stylesheet), before the first match view and whatever the seat\'s state: every variant is in it as a custom property named --ms-asset-<id>-<variant>, so nothing is fetched later. A client that fetches individual files (a scene loading textures) fetches all of a bundle or none of it, never a file because of something a view says.',
  scene: 'Proposed for the Three.js evaluation, not measured: +Y up, floor on X/Z, one authored unit is one grid unit, a token\'s origin is its floor contact. Stack order and depth on the Room A layers are a starting point to tune.',
  surfaces: 'table is the shared display. phone-public is a phone with its private sheet closed. phone-private is inside an open private sheet. An export may be drawn only on the surfaces it lists.',
  layers: 'A data-layer attribute names the source layer a group came from. Ids are kept only on definitions.',
};

export async function planExports({ designRoot }) {
  const { read, compose, paint } = composer(designRoot, {
    sourceRule: path => {
      if (path.startsWith('studies/')) throw new Error(`An export recipe may not read from source/studies/: ${path}. A study becomes an asset only by moving the drawing, in a reviewed change.`);
    },
  });
  const recipesText = await read('source/export-recipes.json');
  const recipes = JSON.parse(recipesText);
  const files = new Map();
  const composed = new Map();
  const assets = [];
  const bundles = Object.fromEntries(Object.entries(recipes.bundles).map(([name, bundle]) => [name, { ...bundle, files: [], bytes: 0 }]));
  const properties = Object.fromEntries(Object.keys(bundles).map(name => [name, []]));
  for (const name of Object.keys(bundles)) if (!BUNDLE_SURFACES[name]) throw new Error(`Unknown bundle "${name}"`);

  function publish(bundle, name, content) {
    const digest = sha256(content);
    const path = `design/exports/${bundle}/${name}.${digest.slice(0, 10)}.svg`;
    files.set(path, content);
    bundles[bundle].files.push(path);
    bundles[bundle].bytes += Buffer.byteLength(content);
    return { path, sha256: digest, bytes: Buffer.byteLength(content) };
  }

  for (const asset of recipes.assets) {
    if (!bundles[asset.bundle]) throw new Error(`${asset.id}: unknown bundle "${asset.bundle}"`);
    const usedSources = new Set();
    const variants = [];
    for (const recipe of asset.variants.flatMap(expand)) {
      const variant = { ...asset.common, ...recipe, anchors: { ...asset.common?.anchors, ...recipe.anchors } };
      if (!variant.viewBox) throw new Error(`${asset.id}:${variant.variant}: no viewBox`);
      const { nodes, defs, sources: from } = await compose(variant, asset);
      for (const used of from) usedSources.add(used);
      const { width, height, content } = svgFile({ viewBox: variant.viewBox, nodes, defs });
      const surfaces = variant.surfaces ?? asset.surfaces ?? BUNDLE_SURFACES[asset.bundle];
      composed.set(`${asset.id}:${variant.variant}`, { nodes, defs, viewBox: variant.viewBox, bundle: asset.bundle, surfaces });
      const published = publish(asset.bundle, `${asset.id}.${variant.variant}`, content);
      properties[asset.bundle].push(`  --ms-asset-${asset.id}-${variant.variant}: ${dataUri(content)};`);
      variants.push({
        variant: variant.variant,
        ...published,
        format: 'svg',
        width,
        height,
        viewBox: variant.viewBox,
        surfaces,
        allowedPalette: variant.allowedPalette ?? asset.allowedPalette,
        colors: paint(nodes, defs),
        ...(Object.keys(variant.anchors).length > 0 ? { anchors: variant.anchors } : {}),
        ...(variant.stack ? { stack: variant.stack } : {}),
      });
    }
    assets.push({
      id: asset.id,
      version: asset.version,
      title: asset.title,
      status: asset.status,
      bundle: asset.bundle,
      audience: bundles[asset.bundle].audience,
      dataSource: asset.dataSource,
      containsText: false,
      sources: [...usedSources].map(used => ({ path: used.path, sha256: used.sha256 })).sort((a, b) => a.path.localeCompare(b.path)),
      variants,
    });
  }

  const sprites = [];
  for (const sprite of recipes.sprites) {
    const definitions = new Map();
    const symbols = [];
    const listed = [];
    for (const entry of sprite.symbols.flatMap(expand)) {
      const from = composed.get(entry.from);
      if (!from) throw new Error(`${sprite.id}: nothing exported as "${entry.from}"`);
      // A sprite is part of its bundle: a symbol taken from another bundle would carry that
      // bundle's art to a device that never loads it.
      if (from.bundle !== sprite.bundle) throw new Error(`${sprite.id}: "${entry.from}" belongs to the ${from.bundle} bundle, not to ${sprite.bundle}`);
      for (const definition of from.defs) {
        const id = attr(definition, 'id');
        const known = definitions.get(id);
        if (known && serialize(known) !== serialize(definition)) throw new Error(`${sprite.id}: two different definitions share the id "${id}"`);
        definitions.set(id, definition);
      }
      const nodes = entry.tint ? from.nodes.map(node => recolor(node, entry.tint, 'currentColor')) : from.nodes;
      symbols.push(`<symbol id="${entry.symbol}" viewBox="${from.viewBox}">${nodes.map(serialize).join('')}</symbol>`);
      const [, , width, height] = from.viewBox.split(/\s+/).map(Number);
      listed.push({ symbol: entry.symbol, from: entry.from, viewBox: from.viewBox, width, height, tintable: Boolean(entry.tint), surfaces: from.surfaces });
    }
    const defs = definitions.size > 0 ? `<defs>${[...definitions.values()].map(serialize).join('')}</defs>` : '';
    const content = `<svg xmlns="${SVG_NS}">${defs}${symbols.join('')}</svg>\n`;
    const published = publish(sprite.bundle, sprite.id, content);
    sprites.push({
      id: sprite.id,
      version: sprite.version,
      title: sprite.title,
      status: sprite.status,
      bundle: sprite.bundle,
      audience: bundles[sprite.bundle].audience,
      dataSource: sprite.dataSource,
      allowedPalette: sprite.allowedPalette,
      ...published,
      format: 'svg-sprite',
      use: 'Inline the file into the document once, then reference a symbol with <svg><use href="#<symbol>"/></svg>. Tintable symbols take the CSS color of the element that uses them.',
      symbols: listed,
    });
  }

  // One stylesheet per bundle carries every variant in it. It is the bundle, for a DOM client.
  for (const [name, bundle] of Object.entries(bundles)) {
    const content = [
      `/* Mothership asset bundle "${name}" · asset manifest ${recipes.manifestVersion} · generated by design/tools/build-exports.mjs; do not edit.`,
      `   ${bundle.loadPolicy} */`,
      ':root {',
      ...properties[name],
      '}',
      '',
    ].join('\n');
    const digest = sha256(content);
    const path = `design/exports/${name}/${name}.art.${digest.slice(0, 10)}.css`;
    files.set(path, content);
    bundle.stylesheet = { path, sha256: digest, bytes: Buffer.byteLength(content), properties: properties[name].length };
    bundle.files.sort();
  }

  const manifest = {
    manifestVersion: recipes.manifestVersion,
    status: 'First production-direction slice for issue #4. Not a complete V1 asset set: see docs/design/asset-inventory.md for what is not produced.',
    generatedBy: 'design/tools/build-exports.mjs from design/source/export-recipes.json. Do not edit by hand.',
    tokenVersion: recipes.tokenVersion,
    baseCommit: recipes.baseCommit,
    ruleSourceManifestSha256: recipes.ruleSourceManifestSha256,
    protocolVersion: recipes.protocolVersion,
    recipesSha256: sha256(recipesText),
    conventions: CONVENTIONS,
    rights: recipes.rights,
    bundles,
    assets,
    sprites,
  };
  files.set('design/exports/asset-manifest.json', `${formatJson(manifest)}\n`);
  return { files, manifest, recipes };
}

/** The synthetic disclosure studies: their own sources, their own directory, no bundle. */
export async function planStudies({ designRoot }) {
  const { read, compose, paint } = composer(designRoot, {
    sourceRule: path => {
      if (!path.startsWith('studies/')) throw new Error(`A study recipe may read only from source/studies/: ${path}`);
    },
  });
  const recipesText = await read('source/study-recipes.json');
  const recipes = JSON.parse(recipesText);
  const files = new Map();
  const studies = [];
  const properties = [];
  for (const study of recipes.studies) {
    if (!study.id.startsWith('study-')) throw new Error(`${study.id}: a study id starts with "study-"`);
    const variants = [];
    const usedSources = new Set();
    for (const variant of study.variants) {
      const { nodes, defs, sources: from } = await compose(variant, study);
      for (const used of from) usedSources.add(used);
      const { width, height, content } = svgFile({ viewBox: variant.viewBox, nodes, defs, rootAttributes: ` data-dev-only="${DEV_ONLY_SENTINEL}"` });
      const digest = sha256(content);
      const path = `design/studies/${study.id}.${variant.variant}.${digest.slice(0, 10)}.svg`;
      files.set(path, content);
      properties.push(`  --ms-study-${study.id.replace(/^study-/, '')}: ${dataUri(content)};`);
      variants.push({ variant: variant.variant, path, sha256: digest, bytes: Buffer.byteLength(content), format: 'svg', width, height, viewBox: variant.viewBox, surfaces: [], colors: paint(nodes, defs), ...(variant.anchors ? { anchors: variant.anchors } : {}) });
    }
    studies.push({
      id: study.id,
      version: study.version,
      title: study.title,
      status: 'synthetic-study',
      connectedUse: false,
      dataSource: study.dataSource,
      gate: study.gate,
      containsText: false,
      sources: [...usedSources].map(used => ({ path: used.path, sha256: used.sha256 })),
      variants,
    });
  }
  const sheet = [
    `/* ${DEV_ONLY_SENTINEL}`,
    `   Mothership SYNTHETIC STUDIES · ${recipes.manifestVersion} · generated by design/tools/build-exports.mjs; do not edit.`,
    '   Not assets. No approved fact exists for what these draw. Never load this in a shell or a match. */',
    ':root {',
    ...properties,
    '}',
    '',
  ].join('\n');
  const sheetDigest = sha256(sheet);
  const sheetPath = `design/studies/studies.art.${sheetDigest.slice(0, 10)}.css`;
  files.set(sheetPath, sheet);
  const manifest = {
    manifestVersion: recipes.manifestVersion,
    status: 'SYNTHETIC STUDIES. Not assets, in no bundle, never connected to a match. No approved fact exists for what they draw.',
    devOnly: DEV_ONLY_SENTINEL,
    generatedBy: 'design/tools/build-exports.mjs from design/source/study-recipes.json. Do not edit by hand.',
    gate: recipes.gate,
    tokenVersion: recipes.tokenVersion,
    baseCommit: recipes.baseCommit,
    ruleSourceManifestSha256: recipes.ruleSourceManifestSha256,
    recipesSha256: sha256(recipesText),
    rights: recipes.rights,
    stylesheet: { path: sheetPath, sha256: sheetDigest, bytes: Buffer.byteLength(sheet) },
    studies,
  };
  files.set('design/studies/study-manifest.json', `${formatJson(manifest)}\n`);
  return { files, manifest, recipes };
}

/**
 * The generated modules that let a review page name a bundle or an export without naming a
 * hashed file. The studies get a module of their own, which only the pages that review
 * them may import.
 */
export function reviewPageIndex(manifest, studyManifest) {
  const local = path => path.replace(/^design/, '');
  const index = {};
  for (const asset of manifest.assets) for (const variant of asset.variants) index[`${asset.id}:${variant.variant}`] = local(variant.path);
  for (const sprite of manifest.sprites) index[sprite.id] = local(sprite.path);
  const stylesheets = Object.fromEntries(Object.entries(manifest.bundles).map(([name, bundle]) => [name, local(bundle.stylesheet.path)]));
  const studies = {};
  for (const study of studyManifest.studies) for (const variant of study.variants) studies[`${study.id}:${variant.variant}`] = local(variant.path);
  const header = '// Generated by design/tools/build-exports.mjs. Do not edit by hand.';
  return new Map([
    ['design/prototypes/js/asset-index.js', `// ${DEV_ONLY_SENTINEL}\n${header}\n// For the review pages, which may name single files. A shell never does: see bundles.js.\nexport const ASSET_MANIFEST_VERSION = ${JSON.stringify(manifest.manifestVersion)};\nexport const BUNDLE_STYLESHEETS = ${JSON.stringify(stylesheets, null, 2)};\nexport const ASSETS = ${JSON.stringify(index, null, 2)};\n`],
    ['design/prototypes/js/study-index.js', `// ${DEV_ONLY_SENTINEL}\n${header}\n// SYNTHETIC STUDIES. Only the pages that review them may import this module.\nexport const STUDY_MANIFEST_VERSION = ${JSON.stringify(studyManifest.manifestVersion)};\nexport const STUDY_STYLESHEET = ${JSON.stringify(local(studyManifest.stylesheet.path))};\nexport const STUDIES = ${JSON.stringify(studies, null, 2)};\n`],
  ]);
}

const isScalar = value => value === null || typeof value !== 'object';
const isFlat = value => Array.isArray(value) && value.every(item => isScalar(item) || (Array.isArray(item) && item.every(isScalar)));

/** JSON a person can review: one line per fact, with coordinate lists kept on their line. */
export function formatJson(value, indent = '') {
  if (isScalar(value)) return JSON.stringify(value);
  const inner = `${indent}  `;
  if (isFlat(value)) {
    const line = `[${value.map(item => (Array.isArray(item) ? `[${item.map(part => JSON.stringify(part)).join(', ')}]` : JSON.stringify(item))).join(', ')}]`;
    if (line.length <= 120) return line;
  }
  if (Array.isArray(value)) return `[\n${value.map(item => inner + formatJson(item, inner)).join(',\n')}\n${indent}]`;
  const entries = Object.entries(value).filter(([, item]) => item !== undefined);
  if (entries.length === 0) return '{}';
  return `{\n${entries.map(([key, item]) => `${inner}${JSON.stringify(key)}: ${formatJson(item, inner)}`).join(',\n')}\n${indent}}`;
}
