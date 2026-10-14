// Build-time only. This reviewed source bundle does not activate a renderer or ruleset.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const BOARD_V2_ART_CATALOG = 'design/releases/board-v2-art-candidate.json';
export const BOARD_V2_ART_CATALOG_SHA256 = '0412d616c0b6ab37d9f6f80fb34115aad4db6275b042697af1b58634289f577c';
const sha = value => createHash('sha256').update(value).digest('hex');
const requireArt = (condition, reason) => { if (!condition) throw new Error(`Board-v2 art: ${reason}`); };

/** A common bundle: no seat, role, claim, roster or participant argument is accepted. */
export function prepareBoardV2Art(root) {
  const catalogBytes = readFileSync(resolve(root, BOARD_V2_ART_CATALOG));
  requireArt(sha(catalogBytes) === BOARD_V2_ART_CATALOG_SHA256, 'reviewed catalog changed');
  const catalog = JSON.parse(catalogBytes);
  const declarations = [];
  for (const asset of catalog.assets) {
    const source = readFileSync(resolve(root, asset.source));
    requireArt(sha(source) === asset.sha256, `source changed: ${asset.id}`);
    const text = source.toString('utf8');
    const start = text.indexOf('<svg');
    requireArt(start >= 0, `missing SVG document: ${asset.id}`);
    const svg = text.slice(start);
    // Hash acceptance above is authoritative. These checks also guard the static-only
    // nature of the reviewed output if the recipe is adapted in a later review.
    requireArt(!/<(?:script|foreignObject|image|style)\b/i.test(svg)
      && !/\bon[a-z]+\s*=/i.test(svg)
      && !/\b(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(svg)
      && !/url\(\s*["']?(?!#)[^)]/i.test(svg), `non-static SVG: ${asset.id}`);
    requireArt(svg.includes(`viewBox="${asset.viewBox}"`), `viewBox changed: ${asset.id}`);
    declarations.push(`  ${asset.cssVariable}: url("data:image/svg+xml,${encodeURIComponent(svg)}");`);
  }
  const stylesheet = `/* Mothership reviewed common Board-v2 art; runtime adoption is separately gated. */\n:root {\n${declarations.join('\n')}\n}\n`;
  const digest = sha(stylesheet);
  return Object.freeze({
    catalogSha256: BOARD_V2_ART_CATALOG_SHA256,
    stylesheet,
    sha256: digest,
    url: `/art/board-v2.art.${digest.slice(0, 10)}.css`,
    assetCount: catalog.assets.length,
    byteLength: Buffer.byteLength(stylesheet),
  });
}
