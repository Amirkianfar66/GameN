// mothership:dev-only
//
// Builds the bars and icons control (design/phone-ui/control) into one page for a private test page: the
// owner's review of every bar and icon on a phone. The page's script and styles are bundled by Vite from
// the runtime components themselves (ordinary bundling, no copy) and written into the page, with:
//   - the art the room scene draws Room B with: the release's pictures (design/room-drawing/assets), the
//     room's extension (the room scene's assets) and the crew's portraits, as data on the CSS properties
//     the game's bundles define;
//   - the facts the page shows: the source commit, the build time, and the icons page's table
//     (docs/design/components/icons.md: each icon's line and users).
// The page is content for a host that adds its own document skeleton: no doctype, head or body here.
//   node design/tools/bars-icons-control.mjs --out <file.html>
// It writes nothing in the repository, and nothing it writes is a release or a record.

import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { ROOM_ART } from '../phone-ui/components/room-scene/room-art.mjs';
import { ROOM_EXTENSION } from '../phone-ui/components/room-scene/room-extension.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const ROOT = join(REPO, 'design/phone-ui/control');
const git = (...args) => execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8' }).trim();
const outAt = process.argv.indexOf('--out');
if (outAt === -1 || !process.argv[outAt + 1]) throw new Error('Usage: node design/tools/bars-icons-control.mjs --out <file.html>');
const OUT = resolve(process.argv[outAt + 1]);

/** One picture as a CSS url() of its own bytes. */
async function dataUrl(path) {
  const bytes = await readFile(join(REPO, path));
  return `url("data:image/svg+xml;base64,${bytes.toString('base64')}")`;
}
/** Room B's pictures and the crew's portraits, on the properties the game's bundles define. */
async function artCss() {
  const art = ROOM_ART['room-b'], extension = ROOM_EXTENSION['room-b'], lines = [];
  for (const { property, file } of [art.back, ...art.layers, art.dark]) lines.push(`${property}: ${await dataUrl(`design/room-drawing/assets/${file}`)};`);
  for (const { property, file } of [extension.lit, extension.dark]) lines.push(`${property}: ${await dataUrl(`design/phone-ui/components/room-scene/assets/${file}`)};`);
  for (let n = 1; n <= 9; n += 1) lines.push(`--ms-asset-crew-portrait-c${n}: ${await dataUrl(`design/crew-drawing/assets/portraits/portrait-c${n}.svg`)};`);
  return `:root {\n  ${lines.join('\n  ')}\n}\n`;
}
/** The icons page's table: name → { line, usedBy, pack }. */
async function iconFacts() {
  const page = await readFile(join(REPO, 'docs/design/components/icons.md'), 'utf8').catch(() => '');
  return Object.fromEntries([...page.matchAll(/^\| `([A-Za-z]+)` \| [a-z]+ \| [^|]+ \| (\d+) \| [^|]* \| ([^|]*) \| ([^|]*) \|$/gm)]
    .map(m => [m[1], { line: Number(m[2]), usedBy: m[3].trim(), pack: m[4].trim() === 'yes' }]));
}

const dir = await mkdtemp(join(tmpdir(), 'bars-icons-control-'));
try {
  await build({
    root: ROOT, base: './', logLevel: 'warn', configFile: false, publicDir: false,
    build: { outDir: dir, emptyOutDir: true, target: 'es2022', assetsInlineLimit: 100_000_000, sourcemap: false, cssMinify: false, cssCodeSplit: false,
      chunkSizeWarningLimit: 4000, rollupOptions: { output: { codeSplitting: false } } },
  });
  const assets = await readdir(join(dir, 'assets'));
  const scripts = assets.filter(name => name.endsWith('.js')), styles = assets.filter(name => name.endsWith('.css'));
  const other = assets.filter(name => !name.endsWith('.js') && !name.endsWith('.css'));
  if (scripts.length !== 1 || styles.length !== 1 || other.length) throw new Error(`The page needs one script and one stylesheet, with every asset inside them; the bundle has ${assets.join(', ')}`);
  const script = await readFile(join(dir, 'assets', scripts[0]), 'utf8'), style = await readFile(join(dir, 'assets', styles[0]), 'utf8');
  if (/\bimport\s*\(|\bfrom\s*["']\.\.?\//.test(script.slice(0, 2000))) throw new Error('The script still imports another file');
  const facts = { commit: git('rev-parse', 'HEAD'), branch: git('rev-parse', '--abbrev-ref', 'HEAD'), clean: git('status', '--porcelain', '--', 'design', 'apps/game/hosted', 'docs/design/components/icons.md') === '',
    built: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), icons: await iconFacts() };
  const page = [
    '<title>Bars &amp; Icons Control</title>',
    '<meta name="claude:viewport-fit-sides" content="cover">',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&display=swap">',
    `<style>\n${style.replace(/<\/style/gi, '<\\/style')}\n</style>`,
    `<style>\n${await artCss()}</style>`,
    '<div id="bc-app"></div>',
    `<script type="application/json" id="bc-data">${JSON.stringify(facts).replace(/</g, '\\u003c')}</script>`,
    `<script type="module">\n${script.replace(/<\/script/gi, '<\\/script')}\n</script>`,
    '',
  ].join('\n');
  await writeFile(OUT, page);
  const kb = n => `${Math.round(n / 1024)} KB`;
  console.log(`wrote ${OUT}: ${kb(Buffer.byteLength(page))} (script ${kb(Buffer.byteLength(script))}, styles ${kb(Buffer.byteLength(style))}); ${Object.keys(facts.icons).length} icons' facts; source ${facts.commit.slice(0, 8)}${facts.clean ? '' : ', with uncommitted changes'}`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
