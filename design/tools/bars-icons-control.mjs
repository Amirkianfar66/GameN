// mothership:dev-only
//
// Builds the bars and icons control (design/phone-ui/control) into one page for a private test page: the
// owner's review of every bar and icon on a phone. The page's script and styles are bundled by Vite from
// the runtime components themselves (ordinary bundling, no copy) and written into the page, with:
//   - the art the room scene draws Room B with: the release's pictures (design/room-drawing/assets), the
//     room's extension (the room scene's assets) and the crew's portraits, as data on the CSS properties
//     the game's bundles define;
//   - the facts the page shows: the source commit, the build time, and the icons page's table
//     (docs/design/components/icons.md: each icon's line and users);
//   - the shell as it was before the Card tab's change (the owner, 18 November 2026): phone-shell.mjs at BEFORE,
//     read from git and bundled beside today's for the page's before and after. It is the component's own file
//     at that commit, not a copy kept in the repository. Today's stylesheet draws both, so the build first checks
//     that every line of the stylesheet at BEFORE is still in it.
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

/** The shell before the Card tab's change: #265's head, shell 0.2.12. */
const BEFORE = '5616928e891babfe35b78dc0a19e1fa552f6d7a3';
/** The shell before the toast's draft: #321's head, shell 0.3.1, as the Lead accepted it. */
const BEFORE_TOAST = 'bf95c1a0';
const SHELL = 'design/phone-ui/components/phone-shell/phone-shell.mjs', SHELL_STYLES = 'design/phone-ui/components/phone-shell/phone-shell.css';
const QUERY = '?before', QUERY_TOAST = '?before-toast';
/**
 * The two sheet drafts, each alone and both together, for the view that shows them side by side: the footer that
 * scrolls (#323 before the head's draft), the head that stacks (its own branch), and their merge on #323.
 */
const SHEET_DRAFTS = Object.freeze({
  '?draft-foot': ['346618f708ccff5bfb2909e5aa1e0eb2dd2dd681', 'claude/designer-toast-under-sheet-head'],
  '?draft-head': ['a9e70accecfad05a91301593bf888de88ff50b11', 'claude/designer-sheet-head-stacks'],
  '?draft-sheet': ['9bc36fd51c5ab3248d8fd31c6c1ca67b5fa4bc84', 'claude/designer-toast-under-sheet-head'],
});
/** The shell's source at a commit, and whether today's stylesheet still draws it: every line of the old one is in the new. */
async function shellBefore(BEFORE = '5616928e891babfe35b78dc0a19e1fa552f6d7a3', branch = 'claude/designer-phone-shell') {
  let source, styles;
  try { source = git('show', `${BEFORE}:${SHELL}`); styles = git('show', `${BEFORE}:${SHELL_STYLES}`); }
  catch { throw new Error(`The page's "before" needs commit ${BEFORE.slice(0, 8)} in this clone: git fetch origin ${branch}`); }
  const now = new Set((await readFile(join(REPO, SHELL_STYLES), 'utf8')).split('\n'));
  const gone = styles.split('\n').filter(line => !now.has(line));
  if (gone.length) throw new Error(`Today's phone-shell.css no longer has ${gone.length} line(s) of the stylesheet at ${BEFORE.slice(0, 8)}, so it can't draw the bar as it was: ${gone[0].trim().slice(0, 80)}`);
  const version = /PHONE_SHELL_VERSION = '([^']+)'/.exec(source)?.[1] ?? null;
  return { source, version };
}

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

const before = await shellBefore();
const beforeToast = await shellBefore(BEFORE_TOAST, 'claude/designer-card-tab');
const befores = new Map([[QUERY, before], [QUERY_TOAST, beforeToast]]);
for (const [query, [commit, branch]] of Object.entries(SHEET_DRAFTS)) befores.set(query, await shellBefore(commit, branch));
const dir = await mkdtemp(join(tmpdir(), 'bars-icons-control-'));
try {
  await build({
    root: ROOT, base: './', logLevel: 'warn', configFile: false, publicDir: false,
    // "…/phone-shell.mjs?before" is the shell's file at BEFORE: its own place, so its imports resolve as they did.
    plugins: [{ name: 'bars-icons-control-shell-before', enforce: 'pre',
      async resolveId(source, importer) {
        const query = [...befores.keys()].find(q => source.endsWith(q));
        if (!query) return null;
        const found = await this.resolve(source.slice(0, -query.length), importer, { skipSelf: true });
        if (!found || found.id !== join(REPO, SHELL)) throw new Error(`Only the shell has a "before": ${source}`);
        return `${found.id}${query}`;
      },
      load(id) { const query = [...befores.keys()].find(q => id === `${join(REPO, SHELL)}${q}`); return query ? befores.get(query).source : null; } }],
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
    built: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), icons: await iconFacts(), before: { commit: BEFORE, version: before.version },
    toastBefore: { commit: git('rev-parse', BEFORE_TOAST), version: beforeToast.version },
    sheetDrafts: { foot: SHEET_DRAFTS['?draft-foot'][0], head: SHEET_DRAFTS['?draft-head'][0], both: SHEET_DRAFTS['?draft-sheet'][0] } };
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
  console.log(`wrote ${OUT}: ${kb(Buffer.byteLength(page))} (script ${kb(Buffer.byteLength(script))}, styles ${kb(Buffer.byteLength(style))}); ${Object.keys(facts.icons).length} icons' facts; before ${before.version} at ${BEFORE.slice(0, 8)}; source ${facts.commit.slice(0, 8)}${facts.clean ? '' : ', with uncommitted changes'}`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
