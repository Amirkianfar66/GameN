// mothership:dev-only
//
// Exports the Food Supply practice (design/food-supply/play.html) as one self-contained page: its
// modules bundled into one script by rolldown (the bundler Vite 8 installs for apps/game; nothing is
// added to any manifest) and its stylesheets inlined, so the owner can open a private review copy on
// a phone. The page needs no server: the design's own model plays it. Review output only: written
// outside the repository.
//
//   node design/tools/food-supply-play-export.mjs <output.html>

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';

const ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
/** play.html's stylesheets, in its order. */
export const STYLES = Object.freeze([
  'apps/game/candidates/planet-library/successor.css',
  'design/phone-ui/prototype/kit.css',
  'design/phone-ui/prototype/screens.css',
  'design/food-supply/phone.css',
  'design/food-supply/play.css',
]);

/** The page: a title, the styles and the bundled script, for a host that adds its own document skeleton. */
export async function buildPlay() {
  const bundle = await rolldown({ input: resolve(ROOT, 'design/food-supply/play.mjs'), logLevel: 'silent' });
  const { output } = await bundle.generate({ format: 'esm', minify: true });
  await bundle.close?.();
  const code = output.find(o => o.type === 'chunk' && o.isEntry).code.replace(/<\/script/gi, '<\\/script');
  const css = (await Promise.all(STYLES.map(async p => `/* ${p} */\n${await readFile(resolve(ROOT, p), 'utf8')}`))).join('\n').replace(/<\/style/gi, '<\\/style');
  return [
    '<title>Food Supply Practice</title>',
    '<meta name="color-scheme" content="dark">',
    '<!-- mothership:dev-only · Food Supply Task: a practice run on one phone against a bot partner. The design\'s own model plays the server. Not the game. -->',
    `<style>\n:root { color-scheme: dark; }\n${css}\n</style>`,
    '<main id="play"></main>',
    `<script type="module">\n${code}\n</script>`,
    '',
  ].join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  if (!out) throw new Error('Give an output file outside the repository');
  if (resolve(out).startsWith(`${ROOT}/`)) throw new Error('Review output goes outside the repository');
  const html = await buildPlay();
  await writeFile(out, html);
  console.log(`wrote ${out} ${html.length} bytes`);
}
