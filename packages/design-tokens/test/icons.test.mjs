// The icons' one source (docs/design/components/icons.md): design/phone-ui/components/icons.mjs, the family
// phone-ui-icons-1.x. The owner, 18 November 2026: "Icons means all Icons".
//
// Two checks, each run on the real tree and on a planted one, so the test shows it can fail:
// - copies: every copy of the family under design/ and apps/game/, found by search (an icons module, a sprite,
//   a manifest), draws each icon it holds exactly as the source does. The source may add icons (a minor
//   version), so a frozen copy never blocks growth; redrawing an icon a frozen copy holds fails until
//   Integration refreshes that copy's pin.
// - inline icons: no Designer runtime component (design/phone-ui/components/, previews and reviews aside)
//   draws an icon of its own. An icon is an icon-sized drawing: a 24 × 24 viewBox, or one of the family's
//   path strings, outside the source. Art is not flagged. Every exception is listed below with its reason.
// And the page lists every icon of the family with its line in the source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const SOURCE = 'design/phone-ui/components/icons.mjs';
const PAGE = 'docs/design/components/icons.md';
const COPY_ROOTS = ['design', 'apps/game'];
const COMPONENTS = 'design/phone-ui/components';
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);
/** Where a copy is not a copy to keep equal, and why. */
const NOT_COPIES = Object.freeze([
  { path: 'design/releases/', reason: 'frozen release bytes: historical evidence of a pinned release, never refreshed' },
]);
/** Icon-sized drawings in the Designer components that are not the family's, each with its reason. */
const INLINE_EXCEPTIONS = Object.freeze([
  {
    id: 'voted-badge',
    signature: 'M6 12.6 10 16.6 18.4 8',
    reason: 'the round button\'s Voted badge: the pinned pack\'s own kit.css rule (sheet 38), drawn pixel for pixel; drawing it from the family\'s check would change its stroke',
  },
]);

const sha = text => createHash('sha256').update(text).digest('hex');
const posix = path => path.split(sep).join('/');

function walk(root, rel, files = []) {
  const abs = join(root, rel);
  if (!existsSync(abs)) return files;
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const path = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) { if (!SKIP_DIRS.has(entry.name)) walk(root, path, files); }
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

async function loadSource(root) {
  return import(`${pathToFileURL(join(root, SOURCE)).href}?at=${statSync(join(root, SOURCE)).mtimeMs}`);
}

/** Every copy of the family under design/ and apps/game/, by what it holds, not by a list of paths. */
export function findCopies(root) {
  const found = { modules: [], sprites: [], manifests: [] };
  for (const top of COPY_ROOTS) {
    for (const path of walk(root, top)) {
      if (path === SOURCE || NOT_COPIES.some(n => path.startsWith(n.path))) continue;
      if (!/\.(mjs|js|svg|json)$/.test(path)) continue;
      const text = readFileSync(join(root, path), 'utf8');
      if (/\.m?js$/.test(path) && /export const ICON_FAMILY_VERSION\b/.test(text) && /export const ICONS\b/.test(text)) found.modules.push(path);
      else if (path.endsWith('.svg') && /<symbol id="ic-[A-Za-z]+(-filled)?"/.test(text)) found.sprites.push(path);
      else if (path.endsWith('.json') && text.includes('"mothership.phone-ui-icons/1"')) found.manifests.push(path);
    }
  }
  return found;
}

const major = version => /^phone-ui-icons-(\d+)\./.exec(version)?.[1] ?? null;
const symbols = sprite => new Map([...sprite.matchAll(/<symbol id="(ic-[A-Za-z]+(?:-filled)?)" viewBox="0 0 24 24">([\s\S]*?)<\/symbol>/g)].map(m => [m[1], m[2]]));

/** What every copy holds that the source draws differently, or does not draw. Empty when every copy agrees. */
export async function checkCopies(root, copies = findCopies(root)) {
  const source = await loadSource(root), findings = [];
  for (const path of copies.modules) {
    const copy = await import(`${pathToFileURL(join(root, path)).href}?at=${statSync(join(root, path)).mtimeMs}`);
    if (major(copy.ICON_FAMILY_VERSION) !== major(source.ICON_FAMILY_VERSION)) findings.push(`${path}: version ${copy.ICON_FAMILY_VERSION} is not ${source.ICON_FAMILY_VERSION}'s major version`);
    for (const [name, icon] of Object.entries(copy.ICONS ?? {})) {
      if (!source.ICONS[name]) { findings.push(`${path}: ${name}: not in the source`); continue; }
      try { assert.deepStrictEqual(icon, source.ICONS[name]); } catch { findings.push(`${path}: ${name}: drawn differently from the source`); continue; }
      if (typeof copy.iconSvg === 'function') for (const filled of [false, true]) {
        if (copy.iconSvg(name, { filled }) !== source.iconSvg(name, { filled })) findings.push(`${path}: ${name}${filled ? ' (filled)' : ''}: iconSvg draws it differently from the source`);
      }
    }
  }
  const sourceSymbols = symbols(source.iconSprite());
  for (const path of copies.sprites) {
    for (const [id, inner] of symbols(readFileSync(join(root, path), 'utf8'))) {
      if (!sourceSymbols.has(id)) findings.push(`${path}: ${id}: not in the source`);
      else if (sourceSymbols.get(id) !== inner) findings.push(`${path}: ${id}: drawn differently from the source`);
    }
  }
  for (const path of copies.manifests) {
    const manifest = JSON.parse(readFileSync(join(root, path), 'utf8'));
    for (const entry of manifest.icons ?? []) {
      const icon = source.ICONS[entry.name];
      if (!icon) { findings.push(`${path}: ${entry.name}: not in the source`); continue; }
      if (entry.label !== icon.label || entry.group !== icon.group) findings.push(`${path}: ${entry.name}: named differently from the source`);
      if (entry.outline !== sha(source.iconSvg(entry.name)) || entry.filled !== sha(source.iconSvg(entry.name, { filled: true }))) findings.push(`${path}: ${entry.name}: drawn differently from the source`);
    }
  }
  return findings;
}

/** The family's path strings long enough to name one icon's drawing. */
function familyPaths(source) {
  return [...new Set(Object.values(source.ICONS).flatMap(icon => icon.parts.filter(part => part.d && part.d.length >= 12).map(part => part.d)))];
}
const VIEWBOX_24 = /viewBox(?:%3D|=|['"]\s*,)\s*(?:\\?["']|%22|%27)?\s*0[ ,]+0[ ,]+24[ ,]+24\b/i;

/** Icon-sized drawings in the Designer components outside the source, and the exceptions none of them needed. */
export async function checkInline(root) {
  const source = await loadSource(root), paths = familyPaths(source), copies = new Set(findCopies(root).modules), findings = [], used = new Set();
  const files = walk(root, COMPONENTS).filter(path => /\.(mjs|js|css)$/.test(path) && !/\/(preview|review|assets)\//.test(path) && path !== SOURCE && !copies.has(path));
  for (const path of files) {
    readFileSync(join(root, path), 'utf8').split('\n').forEach((line, i) => {
      const hit = VIEWBOX_24.test(line) ? 'a 24 × 24 viewBox' : paths.find(d => line.includes(d)) ? 'a family path string' : null;
      if (!hit) return;
      const exception = INLINE_EXCEPTIONS.find(e => line.includes(e.signature));
      if (exception) used.add(exception.id);
      else findings.push(`${path}:${i + 1}: ${hit}: an icon drawn outside ${SOURCE}`);
    });
  }
  return { findings, unused: INLINE_EXCEPTIONS.filter(e => !used.has(e.id)).map(e => e.id), files };
}

/** A planted tree: the source as it is, plus the given files. */
function plant(files) {
  const root = mkdtempSync(join(tmpdir(), 'icons-test-'));
  const write = (path, text) => { mkdirSync(join(root, path, '..'), { recursive: true }); writeFileSync(join(root, path), text); };
  write(SOURCE, readFileSync(join(REPO, SOURCE), 'utf8'));
  for (const [path, text] of Object.entries(files)) write(path, text);
  return root;
}

test('the source is the family, phone-ui-icons-1.x: every icon named, drawn on the 24 grid, with an accessible name', async () => {
  const source = await loadSource(REPO);
  assert.match(source.ICON_FAMILY_VERSION, /^phone-ui-icons-1\.\d+\.\d+$/);
  assert.ok(source.ICON_NAMES.length >= 79, `${source.ICON_NAMES.length} icons`);
  for (const name of source.ICON_NAMES) {
    const icon = source.ICONS[name];
    assert.ok(icon.label && icon.group && icon.parts.length, name);
    for (const filled of [false, true]) assert.match(source.iconSvg(name, { filled }), /^<svg class="ic" aria-hidden="true" focusable="false" xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 24 24" width="24" height="24">/);
  }
});

test('every copy of the family under design/ and apps/game/, found by search, draws each icon it holds as the source does', async () => {
  const copies = findCopies(REPO);
  // Today's copies, so a lost search shows: the pack's (Food-pinned), Food's (Food-pinned), and the pack's generated sprite and manifest.
  for (const path of ['design/phone-ui/prototype/icons.mjs', 'apps/game/hosted/planet/food-icons.mjs']) assert.ok(copies.modules.includes(path), `${path} found`);
  assert.ok(copies.sprites.includes('design/phone-ui/assets/icons.svg'));
  assert.ok(copies.manifests.includes('design/phone-ui/assets/icons.json'));
  assert.deepEqual(await checkCopies(REPO, copies), []);
});

test('a planted copy fails when it redraws, adds or renames an icon, and passes when it only holds fewer icons than the source', async () => {
  const text = readFileSync(join(REPO, SOURCE), 'utf8');
  const actions = "actions: { label: 'Actions', group: 'navigation', parts: [p('M13.4 2.8 5.6 13.2h5.6l-1 8 7.8-10.4h-5.6z', { fill: true })] },";
  assert.ok(text.includes(actions));
  const root = plant({
    'apps/game/hosted/planet/changed-icons.mjs': text.replace(actions, actions.replace('M13.4 2.8', 'M13.6 2.8')),
    'design/elsewhere/extra-icons.mjs': text.replace(actions, `${actions}\n  spare: { label: 'Spare', group: 'utility', parts: [p('M4 4h16v16H4z')] },`),
    'design/elsewhere/renamed-icons.mjs': text.replace("label: 'Actions'", "label: 'Act'"),
    'design/elsewhere/fewer-icons.mjs': text.replace(actions, ''),
    'design/releases/frozen/icons.mjs': text.replace(actions, actions.replace('M13.4 2.8', 'M1 1')),
  });
  try {
    const copies = findCopies(root);
    assert.deepEqual(copies.modules.sort(), ['apps/game/hosted/planet/changed-icons.mjs', 'design/elsewhere/extra-icons.mjs', 'design/elsewhere/fewer-icons.mjs', 'design/elsewhere/renamed-icons.mjs']);
    const findings = await checkCopies(root, copies);
    assert.deepEqual(findings.sort(), [
      'apps/game/hosted/planet/changed-icons.mjs: actions: drawn differently from the source',
      'design/elsewhere/extra-icons.mjs: spare: not in the source',
      'design/elsewhere/renamed-icons.mjs: actions: drawn differently from the source',
    ]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('no Designer component draws an icon of its own; the one listed exception is still needed', async () => {
  const { findings, unused, files } = await checkInline(REPO);
  assert.ok(files.includes('design/phone-ui/components/phone-shell/phone-shell.css') && files.includes('design/phone-ui/components/kit/kit.mjs'), 'the components are scanned');
  assert.deepEqual(findings, []);
  assert.deepEqual(unused, [], 'an exception no component needs any more is removed from the list');
  for (const e of INLINE_EXCEPTIONS) assert.ok(e.reason.length > 20, e.id);
});

test('a planted inline icon fails: a 24 × 24 viewBox, a data-URI one, or a family path string; art and the listed exception pass', async () => {
  const root = plant({
    'design/phone-ui/components/planted/planted.mjs': [
      "export const a = '<svg viewBox=\"0 0 24 24\"><path d=\"M4 4h16\"/></svg>';",
      "svg.setAttribute('viewBox', '0 0 24 24');",
      "export const b = 'M13.4 2.8 5.6 13.2h5.6l-1 8 7.8-10.4h-5.6z';",
      "export const art = '<svg viewBox=\"0 0 1024 768\"><path d=\"M0 0h1024\"/></svg>';",
    ].join('\n'),
    'design/phone-ui/components/planted/planted.css': [
      ".x { background: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3C/svg%3E\"); }",
      ".voted { background: url(\"data:image/svg+xml,%3Csvg viewBox='0 0 24 24'%3E%3Cpath d='M6 12.6 10 16.6 18.4 8'/%3E%3C/svg%3E\"); }",
    ].join('\n'),
    'design/phone-ui/components/planted/preview/preview.mjs': "export const dev = '<svg viewBox=\"0 0 24 24\"></svg>';",
  });
  try {
    const { findings, unused } = await checkInline(root);
    assert.deepEqual(findings.sort(), [
      `design/phone-ui/components/planted/planted.css:1: a 24 × 24 viewBox: an icon drawn outside ${SOURCE}`,
      `design/phone-ui/components/planted/planted.mjs:1: a 24 × 24 viewBox: an icon drawn outside ${SOURCE}`,
      `design/phone-ui/components/planted/planted.mjs:2: a 24 × 24 viewBox: an icon drawn outside ${SOURCE}`,
      `design/phone-ui/components/planted/planted.mjs:3: a family path string: an icon drawn outside ${SOURCE}`,
    ]);
    assert.deepEqual(unused, []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('the page lists every icon of the family, with its group, accessible name and line in the source', async () => {
  const source = await loadSource(REPO);
  const lines = readFileSync(join(REPO, SOURCE), 'utf8').split('\n');
  const page = readFileSync(join(REPO, PAGE), 'utf8');
  assert.ok(page.includes('Icons means all Icons'), 'the owner\'s words');
  const rows = [...page.matchAll(/^\| `([A-Za-z]+)` \| ([a-z]+) \| ([^|]+?) \| (\d+) \|/gm)].map(m => ({ name: m[1], group: m[2], label: m[3], line: Number(m[4]) }));
  assert.deepEqual(rows.map(r => r.name), [...source.ICON_NAMES], 'one row per icon, in the family\'s order');
  for (const row of rows) {
    const icon = source.ICONS[row.name];
    assert.equal(row.group, icon.group, row.name);
    assert.equal(row.label, icon.label, row.name);
    assert.match(lines[row.line - 1], new RegExp(`^\\s+${row.name}: \\{ label: `), `${row.name} is drawn at line ${row.line}`);
  }
  assert.equal(posix(relative(REPO, join(REPO, SOURCE))), SOURCE);
});
