import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { prepareBoardV2FilmsArt } from '../apps/game/hosted/build/board-v2-films-art.mjs';
import { assertRuntimeArtBundle, readRuntimeArtRelease } from './runtime-art-release.mjs';

export const CREW_APPROVAL = 'docs/integration/crew-drawing-art-approval-2026-11-07.json';
export const CREW_APPROVAL_SHA256 = 'a2ef5f03666e046bb712b4c177adc30d35556aaa590f9f7aa0d45fd3cb55dbab';
const digest = value => createHash('sha256').update(value).digest('hex');

function pinned(root, path, expected) {
  const file = resolve(root, path);
  assert.ok(!path.includes('..') && !path.includes('\\') && !path.startsWith('/')
    && file.startsWith(resolve(root) + sep), `Unsafe crew input: ${path}`);
  const bytes = readFileSync(file);
  assert.equal(digest(bytes), expected, `Crew input differs: ${path}`);
  return bytes;
}

export function readCrewDrawingApproval(root) {
  const approval = JSON.parse(pinned(root, CREW_APPROVAL, CREW_APPROVAL_SHA256));
  assert.equal(approval.manifestVersion, 'design-0.7.0');
  assert.equal(approval.tokensVersion, '0.5.0');
  for (const [path, expected] of Object.entries({ ...approval.inputs, ...approval.sourcePins })) pinned(root, path, expected);
  return approval;
}

/** Exact copies only. No runtime import of the Designer's development directory. */
export function verifyCrewDrawingPorts(root) {
  const approval = readCrewDrawingApproval(root);
  assert.equal(approval.ports.length, 17);
  for (const entry of approval.ports) {
    const source = pinned(root, entry.source, entry.sourceSha256).toString('utf8');
    assert.ok(source.startsWith('// mothership:dev-only\n'));
    let port = source.slice(source.indexOf('\n') + 1);
    for (const [from, to] of Object.entries(entry.imports)) port = port.replaceAll(`'${from}'`, `'${to}'`);
    assert.equal(digest(port), entry.runtimeSha256, `Crew port recipe differs: ${entry.runtime}`);
    assert.equal(pinned(root, entry.runtime, entry.runtimeSha256).toString('utf8'), port);
  }
  for (const entry of approval.dependencies) {
    pinned(root, entry.path, entry.sha256);
    pinned(root, entry.runtime, entry.runtimeSha256);
  }
  return approval.ports.length;
}

function imageDeclaration(root, asset) {
  const bytes = pinned(root, asset.path, asset.sha256);
  assert.equal(bytes.length, asset.bytes);
  const svg = bytes.toString('utf8');
  assert.ok(svg.startsWith('<svg') && svg.includes(`viewBox="${asset.viewBox}"`));
  assert.ok(!/<(?:script|foreignObject|image|style)\b/i.test(svg) && !/\bon[a-z]+\s*=/i.test(svg)
    && !/\b(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(svg) && !/url\(\s*["']?(?!#)/i.test(svg), 'Non-static crew SVG');
  const property = asset.replaces?.cssVariable ?? asset.proposedCssVariable;
  assert.match(property, /^--ms-asset-[a-z0-9-]+$/);
  return `  ${property}: url("data:image/svg+xml,${encodeURIComponent(svg)}");`;
}

/** Whole uniform bundles; no seat, role, private state or audience-dependent selection. */
export function prepareCrewDrawingArt(root) {
  const approval = readCrewDrawingApproval(root);
  assert.equal(approval.assets.length, 36);
  const old = JSON.parse(readFileSync(resolve(root, 'design/exports/asset-manifest.json'), 'utf8'));
  const bundles = [];
  for (const name of ['public-board', 'roles']) {
    const path = old.bundles[name].stylesheet.path;
    assert.ok(Object.hasOwn(approval.inputs, path));
    let stylesheet = pinned(root, path, approval.inputs[path]).toString('utf8');
    const assets = approval.assets.filter(asset => (asset.replaces?.bundle ?? asset.proposedBundle) === name);
    assert.equal(assets.length, name === 'public-board' ? 27 : 9);
    for (const asset of assets) {
      const declaration = imageDeclaration(root, asset);
      if (asset.replaces) {
        pinned(root, asset.replaces.path, asset.replaces.sha256);
        const pattern = new RegExp(`^  ${asset.replaces.cssVariable}: [^\\n]+;$`, 'gm');
        assert.equal([...stylesheet.matchAll(pattern)].length, 1, `Expected one replacement: ${asset.replaces.cssVariable}`);
        stylesheet = stylesheet.replace(pattern, () => declaration);
      } else {
        assert.ok(!stylesheet.includes(`${asset.proposedCssVariable}:`));
        assert.ok(stylesheet.endsWith('}\n'));
        stylesheet = stylesheet.slice(0, -2) + declaration + '\n}\n';
      }
    }
    stylesheet = stylesheet.replace(/^\/\*[\s\S]*?\*\//, `/* Mothership ${name}; design-0.7.0, crew tokens 0.5.0. Complete uniform set; traced owner artwork, DSN-REQ-17. */`);
    bundles.push(bundle(name, stylesheet, name === 'public-board' ? 110 : 9));
  }
  const oldFilms = prepareBoardV2FilmsArt(root);
  assert.equal(approval.retiredFilmAssets.length, 27);
  let films = oldFilms.stylesheet;
  for (const asset of approval.retiredFilmAssets) {
    pinned(root, asset.path, asset.sha256);
    assert.match(asset.cssVariable, /^--board-v2-film-(?:captain-memorial|clone-(?:outline|halftone))-c[1-9]$/);
    const pattern = new RegExp(`^  ${asset.cssVariable}: [^\\n]+;\\n`, 'gm');
    assert.equal([...films.matchAll(pattern)].length, 1, `Expected one retirement: ${asset.cssVariable}`);
    films = films.replace(pattern, '');
  }
  films = films.replace(/^\/\*[\s\S]*?\*\//, '/* Mothership design-0.7.0 films: common environment art. Characters use live exact-release drawing. */');
  bundles.push(bundle('board-v2-films-art', films, 73));
  return bundles;
}

function bundle(name, stylesheet, assetCount) {
  const sha256 = digest(stylesheet);
  return Object.freeze({ name, stylesheet, sha256, assetCount,
    url: `/art/crew-${name}.${sha256.slice(0, 10)}.css`, byteLength: Buffer.byteLength(stylesheet) });
}

/** Emits alongside historical assets. Consumers must explicitly select the new release. */
export function crewDrawingAssetsPlugin(root) {
  const files = () => {
    const release = readRuntimeArtRelease(root, 'design-0.7.0');
    verifyCrewDrawingPorts(root);
    return prepareCrewDrawingArt(root).map(file => {
      assertRuntimeArtBundle(release, file.name, file.url, file.stylesheet);
      return file;
    });
  };
  return {
    name: 'reviewed-crew-drawing-release',
    buildStart() { for (const file of files()) this.emitFile({ type: 'asset', fileName: file.url.slice(1), source: file.stylesheet }); },
    configureServer(server) {
      const assets = files();
      server.middlewares.use((request, response, next) => {
        const file = assets.find(item => item.url === request.url?.split('?')[0]);
        if (!file) return next();
        response.setHeader('content-type', 'text/css');
        response.end(file.stylesheet);
      });
    },
  };
}
