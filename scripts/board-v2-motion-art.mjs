// Build-time only: the exact Claude S1/S4 SVGs, loaded uniformly by every audience.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const BOARD_V2_MOTION_CATALOG = 'design/releases/board-v2-motion-art.json';
export const BOARD_V2_MOTION_CATALOG_SHA256 = 'dc38bedc9ffba87ac6226213911bed1b093290146a26389a6e90ee40796f793c';
const sha = value => createHash('sha256').update(value).digest('hex');
const check = (ok, message) => { if (!ok) throw new Error(`Board V2 motion art: ${message}`); };

/** No role, seat, audience or game-state argument is accepted. */
export function prepareBoardV2MotionArt(root) {
  const bytes = readFileSync(resolve(root, BOARD_V2_MOTION_CATALOG));
  check(sha(bytes) === BOARD_V2_MOTION_CATALOG_SHA256, 'reviewed catalog changed');
  const catalog = JSON.parse(bytes), declarations = [];
  for (const asset of catalog.assets) {
    const bytes = readFileSync(resolve(root, asset.source));
    check(sha(bytes) === asset.sha256, `source changed: ${asset.id}`);
    const source = bytes.toString('utf8'), start = source.indexOf('<svg');
    check(start >= 0, `missing SVG: ${asset.id}`);
    const svg = source.slice(start);
    check(!/<(?:script|foreignObject|image|style)\b/i.test(svg)
      && !/\bon[a-z]+\s*=/i.test(svg)
      && !/\b(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(svg)
      && !/url\(\s*["']?(?!#)[^)]/i.test(svg), `non-static SVG: ${asset.id}`);
    check(svg.includes(`viewBox="${asset.viewBox}"`), `viewBox changed: ${asset.id}`);
    declarations.push(`  ${asset.cssVariable}: url("data:image/svg+xml,${encodeURIComponent(svg)}");`);
  }
  const stylesheet = `/* Mothership common S1/S4 art; authorized events select effects locally. */\n:root {\n${declarations.join('\n')}\n}\n`;
  const digest = sha(stylesheet);
  return Object.freeze({ catalogSha256: BOARD_V2_MOTION_CATALOG_SHA256, stylesheet, sha256: digest,
    url: `/art/board-v2-motion.art.${digest.slice(0, 10)}.css`, assetCount: catalog.assets.length, byteLength: Buffer.byteLength(stylesheet) });
}
