// Build-time only. Exact additive adoption of Claude's PR #116 neutral card back.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const SETUP_ART_CATALOG = 'design/releases/setup-art-candidate.json';
export const SETUP_ART_CATALOG_SHA256 = 'e611fd0f50bd4f032ecae39eecb63e982681ddb8f9365397708784dc72ef92ab';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (condition, message) => { if (!condition) throw new Error(`Setup art: ${message}`); };

/** One common asset for every role. No match, role, character or seat input. */
export function prepareSetupArt(root) {
  const bytes = readFileSync(resolve(root, SETUP_ART_CATALOG));
  check(sha(bytes) === SETUP_ART_CATALOG_SHA256, 'reviewed catalog changed');
  const catalog = JSON.parse(bytes);
  for (const source of catalog.sources) check(sha(readFileSync(resolve(root, source.path))) === source.sha256, `source changed: ${source.path}`);
  const source = readFileSync(resolve(root, catalog.asset.path), 'utf8');
  const start = source.indexOf('<svg');
  check(start >= 0, 'missing SVG document');
  const svg = source.slice(start);
  check(svg.includes(`viewBox="${catalog.asset.viewBox}"`), 'view box changed');
  check(!/<(?:script|foreignObject|image|style)\b/i.test(svg)
    && !/\bon[a-z]+\s*=/i.test(svg)
    && !/\b(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(svg)
    && !/url\(\s*["']?(?!#)[^)]/i.test(svg), 'non-static SVG');
  const stylesheet = `/* Mothership common setup art; exact Claude PR #116 card back. */\n:root {\n  ${catalog.asset.cssVariable}: url("data:image/svg+xml,${encodeURIComponent(svg)}");\n}\n`;
  const digest = sha(stylesheet);
  return Object.freeze({ catalogSha256: SETUP_ART_CATALOG_SHA256, stylesheet, sha256: digest,
    url: `/art/setup.art.${digest.slice(0, 10)}.css`, assetCount: 1, byteLength: Buffer.byteLength(stylesheet) });
}
