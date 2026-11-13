// Build-time static artwork verification. This does not admit a native consumer
// or select a creation profile; those require the separate release review.
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {posix, resolve} from 'node:path';

export const FOOD_ART_VERSION = 'design-0.9.0';
export const FOOD_STATIC_ART = 'docs/integration/food-supply-static-art-2026-11-13.json';
export const FOOD_STATIC_ART_SHA256 = '38343bf33b20211451b5f74c9a46d9939d3bdbe858436dd654b44472b59a383c';
const sha = value => createHash('sha256').update(value).digest('hex');
const check = (ok, message) => {if (!ok) throw Error(`Food static art: ${message}`);};
const names = Object.freeze(['supply-room.back.svg', ...Array.from({length:9}, (_,i) => `c${i+1}`)
  .flatMap(id => ['panel','winch'].flatMap(station => ['alive','out'].map(state => `operators/${id}-${station}-${state}.svg`)))]);

function regularFile(root, path) {
  check(typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.includes('\\')
    && posix.normalize(path) === path && path !== '.' && !path.startsWith('../'), 'unsafe input path');
  let current = resolve(root);
  const parts = path.split('/');
  for (const [index, part] of parts.entries()) {
    current = resolve(current, part);
    const stat = lstatSync(current);
    check(!stat.isSymbolicLink() && (index === parts.length-1 ? stat.isFile() : stat.isDirectory()), `regular input required: ${path}`);
  }
  return readFileSync(current);
}

function pinned(root, path, pin) {
  check(pin && /^[a-f0-9]{64}$/.test(pin.sha256) && Number.isSafeInteger(pin.bytes) && pin.bytes > 0, 'invalid input identity');
  const bytes = regularFile(root, path);
  check(bytes.length === pin.bytes && sha(bytes) === pin.sha256, `input differs: ${path}`);
  return bytes;
}

/** No developer generator, simulator or prototype module is imported here. */
export function prepareFoodSupplyArt(root) {
  const source = regularFile(root, FOOD_STATIC_ART);
  check(sha(source) === FOOD_STATIC_ART_SHA256, 'independent static inventory differs');
  const record = JSON.parse(source);
  check(record.schema === 'mothership.food-supply-static-art/1' && record.status === 'reviewed-static-source-candidate'
    && record.artVersion === FOOD_ART_VERSION && record.tokensVersion === '0.5.0', 'invalid source registration');
  for (const [path, pin] of Object.entries(record.inputs)) pinned(root, path, pin);
  check(record.assets.length === names.length, 'complete uniform static set required');
  return record.assets.map((entry, index) => {
    const name = names[index];
    check(entry.source === `apps/game/candidates/food-supply/assets/${name}`
      && entry.url === `/art/food-supply/${name}`, 'unexpected static asset or publication path');
    const bytes = pinned(root, entry.source, entry), svg = bytes.toString('utf8');
    check(/^(?:\s|<\?xml[^?]*\?>|<!--[\s\S]*?-->)*<svg(?:\s|>)/.test(svg)
      && !/<(?:script|foreignObject|image|style|animate\w*|set)\b/i.test(svg)
      && !/<!DOCTYPE|<!ENTITY|\bon[a-z]+\s*=/i.test(svg)
      && !/\b(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(svg)
      && !/url\(\s*["']?(?!#)/i.test(svg), `non-static SVG: ${name}`);
    return Object.freeze({url:entry.url, sha256:entry.sha256, bytes});
  });
}

/** A release build calls this only after its separate consumer admission. */
export function foodSupplyAssetsPlugin(root) {
  return {
    name:'reviewed-food-supply-static-assets',
    buildStart() {
      for (const asset of prepareFoodSupplyArt(root))
        this.emitFile({type:'asset', fileName:asset.url.slice(1), source:asset.bytes});
    },
    configureServer(server) {
      const assets = new Map(prepareFoodSupplyArt(root).map(asset => [asset.url, asset]));
      server.middlewares.use((request, response, next) => {
        const asset = assets.get(request.url?.split('?')[0]);
        if (!asset) return next();
        response.setHeader('content-type','image/svg+xml');
        response.setHeader('x-content-type-options','nosniff');
        response.end(asset.bytes);
      });
    },
  };
}
