// The Designer's checks that need no browser: exports, manifest, palette, disclosure,
// stylesheets, contracts and documents.
//   node design/tools/check-assets.mjs
//   npm run check:assets --workspace @mothership/design-tokens
//
// Node built-ins only. Every check is a statement about files in this repository. None of
// them says anything about a phone, a display, or how the art looks, and none of them can
// tell whether a difference that a contract describes in words is real: that is what the
// review images are looked at for. docs/design/verification.md lists, check by check, what
// is asserted and what is not.

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compounds, parseStylesheet, withoutArguments } from './lib/css.mjs';
import { planDocs } from './lib/docs.mjs';
import { BUNDLE_SURFACES, DEV_ONLY_SENTINEL, dataUri, planExports, planStudies, reviewPageIndex } from './lib/exports.mjs';
import { reviewInputsSha256 } from './lib/inputs.mjs';
import { attr, colors, parseSvg, problemsIn, walk } from './lib/svg.mjs';
import { tokenPaletteModule, tokenStylesheet, tokenVariables } from './lib/token-css.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const designRoot = resolve(repoRoot, 'design');
const text = path => readFile(resolve(repoRoot, path), 'utf8');
const json = async path => JSON.parse(await text(path));
const sha256 = content => createHash('sha256').update(content).digest('hex');

const failures = [];
const passed = [];
function check(name, problems) {
  if (problems.length === 0) passed.push(name);
  else for (const problem of problems) failures.push(`${name}: ${problem}`);
}
async function filesUnder(path) {
  const entries = await readdir(resolve(repoRoot, path), { withFileTypes: true, recursive: true });
  return entries.filter(entry => entry.isFile()).map(entry => `${entry.parentPath ?? entry.path}/${entry.name}`.replace(`${repoRoot}/`, '')).sort();
}

const tokens = await json('packages/design-tokens/src/tokens-0.3.0.json');
const pinnedTokens = await json('packages/design-tokens/src/tokens.json');
const { files: planned, manifest, recipes } = await planExports({ designRoot });
const { files: plannedStudies, manifest: studyPlan } = await planStudies({ designRoot });
const onDisk = await json('design/exports/asset-manifest.json');
const studiesOnDisk = await json('design/studies/study-manifest.json');
const states = await json('design/contract/component-states.json');
const cues = await json('design/contract/motion-cues.json');
const studyContract = await json('design/contract/synthetic-studies.json');
const callouts = await json('design/contract/layout-callouts.json');
const plannedAssets = await json('design/contract/planned-assets.json');
const copy = await json('design/contract/copy.en.proposed.json');
const ruleManifestSha = sha256(await readFile(resolve(repoRoot, 'rules/source-manifest.json')));
const modes = await json('rules/overlays/player-modes-officer.json');
const kit = await import(pathToFileURL(resolve(designRoot, 'prototypes/js/kit.js')).href);

const ROLE_NAMES = [...modes.modes['9'].blue_roles, ...modes.modes['9'].red_roles, 'Alien'];
const variantsOf = asset => asset.variants.map(variant => ({ asset, variant, property: `--ms-asset-${asset.id}-${variant.variant}` }));
const allVariants = onDisk.assets.flatMap(variantsOf);
const isPublicSurface = surface => surface === 'table' || surface === 'phone-public';
const hasPublicSurface = variant => variant.surfaces.some(isPublicSurface);

// ---------- Exports are exactly what the sources produce ----------
{
  const problems = [];
  for (const [directory, plan] of [['design/exports', planned], ['design/studies', plannedStudies]]) {
    const present = await filesUnder(directory);
    for (const [path, content] of plan) {
      if (!present.includes(path)) problems.push(`${path} is missing: run build-exports.mjs`);
      else if ((await text(path)) !== content) problems.push(`${path} differs from what the sources produce: it was edited by hand, or build-exports.mjs was not run`);
    }
    for (const path of present) if (!plan.has(path)) problems.push(`${path} is not produced by any recipe`);
  }
  check('exports and studies match their sources', problems);
}

// ---------- The manifest tells the truth about every file ----------
{
  const problems = [];
  const listed = [...onDisk.assets.flatMap(asset => asset.variants.map(variant => [asset.id, variant])), ...onDisk.sprites.map(sprite => [sprite.id, sprite])];
  for (const [id, entry] of listed) {
    const content = await readFile(resolve(repoRoot, entry.path)).catch(() => null);
    if (content === null) {
      problems.push(`${entry.path} is listed and does not exist`);
      continue;
    }
    if (sha256(content) !== entry.sha256) problems.push(`${entry.path}: hash in the manifest is wrong`);
    if (content.length !== entry.bytes) problems.push(`${entry.path}: size in the manifest is wrong`);
    if (!entry.path.includes(`.${entry.sha256.slice(0, 10)}.`)) problems.push(`${entry.path}: file name does not carry its content hash`);
    if (!entry.path.split('/').at(-1).startsWith(`${id}.`)) problems.push(`${entry.path}: file name does not start with its asset id`);
  }
  for (const asset of onDisk.assets) {
    for (const source of asset.sources) {
      if (sha256(await readFile(resolve(repoRoot, source.path))) !== source.sha256) problems.push(`${asset.id}: source hash for ${source.path} is stale`);
    }
    for (const field of ['id', 'version', 'title', 'status', 'bundle', 'audience', 'dataSource']) if (!asset[field]) problems.push(`${asset.id}: no ${field}`);
    for (const variant of asset.variants) {
      for (const field of ['variant', 'path', 'sha256', 'bytes', 'width', 'height', 'viewBox', 'surfaces']) if (variant[field] === undefined) problems.push(`${asset.id}:${variant.variant}: no ${field}`);
    }
  }
  // A bundle's stylesheet is the bundle: it holds every variant of the bundle, each as the
  // very file the manifest lists, and nothing else.
  for (const [name, bundle] of Object.entries(onDisk.bundles)) {
    const sheet = await text(bundle.stylesheet.path).catch(() => null);
    if (sheet === null) {
      problems.push(`${name}: its stylesheet ${bundle.stylesheet.path} does not exist`);
      continue;
    }
    if (sha256(sheet) !== bundle.stylesheet.sha256 || Buffer.byteLength(sheet) !== bundle.stylesheet.bytes) problems.push(`${name}: the stylesheet's hash or size in the manifest is wrong`);
    const own = allVariants.filter(entry => entry.asset.bundle === name);
    const declared = [...sheet.replace(/url\("[^"]*"\)/g, 'url()').matchAll(/(?:^|[{;\s])(--[\w-]+)\s*:/g)].map(match => match[1]);
    if (declared.length !== bundle.stylesheet.properties) problems.push(`${name}: the manifest says ${bundle.stylesheet.properties} properties and the stylesheet has ${declared.length}`);
    for (const { variant, property } of own) {
      if (!sheet.includes(`${property}: ${dataUri(await text(variant.path))};`)) problems.push(`${name}: ${property} in the stylesheet is not the file ${variant.path}`);
    }
    for (const property of declared) if (!own.some(entry => entry.property === property)) problems.push(`${name}: the stylesheet holds ${property}, which is not a variant of this bundle`);
    // Inside a picture, url(%23id) is a reference to a pattern of its own. Anything else is an address.
    if (/url\((?!"data:image\/svg\+xml,|%23)/.test(sheet) || /@import/.test(sheet)) problems.push(`${name}: the stylesheet would make a request of its own`);
    const files = [...own.map(entry => entry.variant.path), ...onDisk.sprites.filter(sprite => sprite.bundle === name).map(sprite => sprite.path)].sort();
    if (JSON.stringify(files) !== JSON.stringify(bundle.files)) problems.push(`${name}: the bundle's file list is not its variants and sprites`);
  }
  for (const field of ['origin', 'author', 'created', 'license', 'reuse', 'humanArtReview']) if (!onDisk.rights?.[field]) problems.push(`rights.${field} is missing`);
  for (const study of studiesOnDisk.studies) {
    for (const variant of study.variants) {
      const content = await readFile(resolve(repoRoot, variant.path)).catch(() => null);
      if (content === null) problems.push(`${variant.path} is listed and does not exist`);
      else if (sha256(content) !== variant.sha256 || content.length !== variant.bytes) problems.push(`${variant.path}: hash or size in the study manifest is wrong`);
    }
  }
  check('manifests match the files', problems);
}

// ---------- Provenance pins ----------
{
  const problems = [];
  if (onDisk.ruleSourceManifestSha256 !== ruleManifestSha) problems.push('ruleSourceManifestSha256 is not the hash of rules/source-manifest.json');
  if (states.ruleSourceManifestSha256 !== ruleManifestSha || copy.ruleSourceManifestSha256 !== ruleManifestSha || studiesOnDisk.ruleSourceManifestSha256 !== ruleManifestSha) problems.push('a contract file or the study manifest pins a different rule-source manifest');
  if (onDisk.tokenVersion !== tokens.version || states.tokenVersion !== tokens.version || cues.tokenVersion !== tokens.version || studyContract.tokenVersion !== tokens.version) problems.push('token version differs between the manifest, a contract file and the token file');
  if (states.assetManifestVersion !== onDisk.manifestVersion) problems.push('component-states.json names a different asset manifest version');
  if (studyContract.studyManifestVersion !== studiesOnDisk.manifestVersion) problems.push('synthetic-studies.json names a different study manifest version');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(onDisk.manifestVersion)) problems.push('manifestVersion would not fit an assetManifestVersion field');
  if (onDisk.baseCommit !== states.baseCommit || onDisk.baseCommit !== studiesOnDisk.baseCommit) problems.push('base commit differs between the manifests and component-states.json');
  check('provenance pins agree', problems);
}

// ---------- Sources and exports: only the drawing vocabulary ----------
{
  const problems = [];
  // problemsIn() refuses every element and attribute that is not on its list, every paint
  // that is not `none`, a six-digit hex color or a local reference, and every shape that
  // would default to black. So no text, title, style, link, filter, image, named color,
  // rgb(), eight-digit hex or outside reference can be in a file that passes.
  for (const path of (await filesUnder('design/source')).filter(file => file.endsWith('.svg'))) {
    for (const problem of problemsIn(parseSvg(await text(path), path))) problems.push(`${path}: ${problem}`);
  }
  const exported = [...allVariants.map(entry => entry.variant.path), ...studiesOnDisk.studies.flatMap(study => study.variants.map(variant => variant.path))];
  for (const path of exported) {
    for (const problem of problemsIn(parseSvg(await text(path), path))) problems.push(`${path}: ${problem}`);
  }
  for (const sprite of onDisk.sprites) {
    const root = parseSvg(await text(sprite.path), sprite.path);
    for (const child of root.children.filter(node => node.type === 'element')) {
      if (child.name === 'defs') for (const problem of problemsIn(child)) problems.push(`${sprite.path}: ${problem}`);
      else if (child.name !== 'symbol') problems.push(`${sprite.path}: <${child.name}> at the top of a sprite`);
      else {
        for (const [name] of child.attrs) if (name !== 'id' && name !== 'viewBox') problems.push(`${sprite.path}: attribute ${name} on a symbol`);
        const tintable = sprite.symbols.find(symbol => symbol.symbol === attr(child, 'id'))?.tintable === true;
        for (const node of child.children) for (const problem of problemsIn(node, { allowCurrentColor: tintable })) problems.push(`${sprite.path}#${attr(child, 'id')}: ${problem}`);
      }
    }
  }
  check('sources, exports and sprites use only the drawing vocabulary', problems);
}

// ---------- Palette: public art uses the public palette and nothing else ----------
const palette = (() => {
  const upper = value => value.toUpperCase();
  const publicColors = [tokens.color.canvas, tokens.color.panel, tokens.color.paper, tokens.color.ink, tokens.color.publicToken, tokens.color.paperShade, tokens.color.paperDeep, ...Object.values(tokens.color.steel)].map(upper);
  const accent = [tokens.color.interactiveAccent, tokens.color.focusRing].map(upper);
  const faction = Object.fromEntries(Object.entries(tokens.color.factionPrivateOrRevealed).map(([name, value]) => [name, upper(value)]));
  return {
    public: new Set(publicColors),
    'public-with-accent': new Set([...publicColors, ...accent]),
    'private-blue': new Set([...publicColors, faction.blue]),
    faction: new Set(Object.values(faction)),
    accent: new Set(accent),
  };
})();
{
  const problems = [];
  for (const asset of onDisk.assets) {
    for (const variant of asset.variants) {
      const allowed = palette[variant.allowedPalette];
      if (!allowed) {
        problems.push(`${asset.id}:${variant.variant}: unknown palette "${variant.allowedPalette}"`);
        continue;
      }
      const used = [...colors(parseSvg(await text(variant.path), variant.path))];
      for (const color of used) if (!allowed.has(color)) problems.push(`${asset.id}:${variant.variant}: ${color} is not in the ${variant.allowedPalette} palette`);
      if (JSON.stringify(used.sort()) !== JSON.stringify(variant.colors)) problems.push(`${asset.id}:${variant.variant}: the colors listed in the manifest are not the colors in the file`);
      if (hasPublicSurface(variant) && used.some(color => palette.faction.has(color))) problems.push(`${asset.id}:${variant.variant}: a faction color on an asset that may be drawn publicly`);
      if (hasPublicSurface(variant) && asset.id !== 'marker-turn' && used.some(color => palette.accent.has(color))) problems.push(`${asset.id}:${variant.variant}: amber on a public asset other than the active-turn marker`);
    }
  }
  for (const sprite of onDisk.sprites) {
    const used = [...colors(parseSvg(await text(sprite.path), sprite.path))];
    for (const color of used) if (!palette[sprite.allowedPalette].has(color)) problems.push(`${sprite.id}: ${color} is not in the ${sprite.allowedPalette} palette`);
    if (sprite.bundle === 'public-board' && used.some(color => palette.faction.has(color))) problems.push(`${sprite.id}: a faction color in the public sprite`);
  }
  for (const study of studiesOnDisk.studies) for (const variant of study.variants) {
    for (const color of colors(parseSvg(await text(variant.path), variant.path))) if (!palette.public.has(color)) problems.push(`${study.id}: ${color} is not in the public palette`);
  }
  check('every color is in the palette its asset is allowed', problems);
}

// ---------- Disclosure: bundles, surfaces and names ----------
// A word that names a role, a faction or a private thing. Matched against whole name parts,
// so "shell" is not "shield" and "blue" inside another word is not a faction.
const PRIVATE_WORD = new RegExp(`^(${[...new Set(ROLE_NAMES.flatMap(role => role.toLowerCase().split(/\s+/)))].join('|')}|faction\\w*|protect\\w*|shield\\w*|immun\\w*|weapon\\w*|code\\w*)$`);
const nameParts = name => name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const privatePart = name => nameParts(name).find(part => PRIVATE_WORD.test(part)) ?? null;
{
  const problems = [];
  const bundleNames = Object.keys(onDisk.bundles).sort();
  if (JSON.stringify(bundleNames) !== JSON.stringify(Object.keys(BUNDLE_SURFACES).sort())) problems.push(`the bundles are ${bundleNames.join(', ')}; expected ${Object.keys(BUNDLE_SURFACES).join(', ')}`);
  for (const asset of onDisk.assets) {
    for (const variant of asset.variants) {
      for (const surface of variant.surfaces) if (!BUNDLE_SURFACES[asset.bundle]?.includes(surface)) problems.push(`${asset.id}:${variant.variant}: may be drawn on ${surface}, which its bundle ${asset.bundle} does not reach`);
      if (variant.surfaces.length === 0) problems.push(`${asset.id}:${variant.variant}: an asset that may be drawn nowhere`);
      // The table loads the public bundle. Nothing that is only ever private belongs in it.
      if (asset.bundle === 'public-board' && !hasPublicSurface(variant)) problems.push(`${asset.id}:${variant.variant}: private-only art in the public bundle`);
      if (asset.bundle === 'roles' && (variant.surfaces.length !== 1 || variant.surfaces[0] !== 'phone-private')) problems.push(`${asset.id}:${variant.variant}: role art may be drawn only inside the private sheet`);
    }
    if (asset.bundle === 'roles') continue;
    // Outside the role bundle nothing is named after a role, a faction or a private thing:
    // not the asset, a variant, a file, or a layer label inside a file.
    const names = [[asset.id, 'asset id'], ...asset.variants.flatMap(variant => [[variant.variant, `variant of ${asset.id}`], [variant.path.split('/').at(-1), 'file name']])];
    for (const variant of asset.variants) {
      for (const { node } of walk(parseSvg(await text(variant.path), variant.path))) {
        const layer = attr(node, 'data-layer');
        if (layer) names.push([layer, `layer label in ${variant.path}`]);
        const id = attr(node, 'id');
        if (id) names.push([id, `definition id in ${variant.path}`]);
      }
    }
    for (const [name, where] of names) if (privatePart(name)) problems.push(`"${name}" (${where}) carries the private word "${privatePart(name)}" outside the role bundle`);
  }
  for (const [name, bundle] of Object.entries(onDisk.bundles)) if (bundle.connectedUse !== true) problems.push(`${name}: every bundle in the manifest is for connected use; a study is not an asset`);
  for (const sprite of onDisk.sprites) {
    if (sprite.bundle !== 'roles' && privatePart(sprite.id)) problems.push(`${sprite.id}: a sprite named after a private thing`);
    for (const symbol of sprite.symbols) {
      const from = allVariants.find(entry => `${entry.asset.id}:${entry.variant.variant}` === symbol.from);
      if (!from) problems.push(`${sprite.id}#${symbol.symbol}: comes from ${symbol.from}, which is not in the manifest`);
      else if (from.asset.bundle !== sprite.bundle) problems.push(`${sprite.id}#${symbol.symbol}: comes from the ${from.asset.bundle} bundle`);
      else if (JSON.stringify(from.variant.surfaces) !== JSON.stringify(symbol.surfaces)) problems.push(`${sprite.id}#${symbol.symbol}: its surfaces are not those of ${symbol.from}`);
      if (sprite.bundle !== 'roles' && privatePart(symbol.symbol)) problems.push(`${sprite.id}#${symbol.symbol}: a symbol named after a private thing`);
    }
  }
  const expected = [...ROLE_NAMES].sort();
  if (JSON.stringify([...onDisk.bundles.roles.expectedRoles].sort()) !== JSON.stringify(expected)) problems.push('the role bundle\'s expected roles are not the nine roles of the nine-player mode in rules/overlays/player-modes-officer.json');
  for (const role of onDisk.bundles.roles.producedRoles) if (!onDisk.assets.some(asset => asset.bundle === 'roles' && asset.title.startsWith(role))) problems.push(`the role bundle says ${role} is produced and holds no such asset`);
  check('bundles, surfaces and names disclose nothing', problems);
}

// ---------- The synthetic studies are fenced ----------
const STUDY_FILES = ['design/prototypes/css/synthetic.css', 'design/prototypes/js/study-stages.js', 'design/prototypes/js/study-index.js', 'design/prototypes/studies.html'];
const STUDY_MARKS = ['study-index', 'study-stages', 'synthetic.css', '--ms-study-', '/studies/', 'synthetic-studies.json', 'STUDY_STYLESHEET', 'STUDY_STAGES'];
{
  const problems = [];
  if (studiesOnDisk.devOnly !== DEV_ONLY_SENTINEL || studyContract.devOnly !== DEV_ONLY_SENTINEL) problems.push('the study manifest and the study contract must carry the development-only mark');
  const manifestText = await text('design/exports/asset-manifest.json');
  if (/study/i.test(manifestText.replace(/a study is not an asset/gi, ''))) problems.push('the asset manifest mentions a study');
  for (const path of await filesUnder('design/exports')) {
    if (/stud(y|ies)/i.test(path)) problems.push(`${path}: a study file among the exports`);
    if ((await text(path)).includes(DEV_ONLY_SENTINEL)) problems.push(`${path}: an export carries the development-only mark`);
  }
  for (const path of await filesUnder('design/studies')) {
    if (!(await text(path)).includes(DEV_ONLY_SENTINEL)) problems.push(`${path}: a study file without the development-only mark`);
  }
  for (const study of studiesOnDisk.studies) {
    if (!study.id.startsWith('study-') || study.status !== 'synthetic-study' || study.connectedUse !== false || !study.gate) problems.push(`${study.id}: a study is named study-*, is never for connected use and names its gate`);
    if (study.variants.some(variant => variant.surfaces.length > 0)) problems.push(`${study.id}: a study lists a surface it may be drawn on`);
    if (onDisk.assets.some(asset => asset.id === study.id)) problems.push(`${study.id}: is also in the asset manifest`);
    for (const source of study.sources) if (!source.path.startsWith('design/source/studies/')) problems.push(`${study.id}: drawn from ${source.path}, outside source/studies/`);
  }
  for (const asset of onDisk.assets) for (const source of asset.sources) if (source.path.startsWith('design/source/studies/')) problems.push(`${asset.id}: an asset drawn from source/studies/`);
  const contractIds = studyContract.studies.map(study => study.id).sort();
  if (JSON.stringify(contractIds) !== JSON.stringify(studiesOnDisk.studies.map(study => study.id).sort())) problems.push('synthetic-studies.json and the study manifest list different studies');
  for (const study of studyContract.studies) {
    if (study.connectedUse !== false || !study.gate || !study.placement) problems.push(`${study.id}: a study is never for connected use, names its gate and says where it is drawn`);
    const { opening, accent, settle } = study.beatsMs;
    if (study.durationMs !== tokens.motionMs.publicImpact || opening + accent + settle !== study.durationMs) problems.push(`${study.id}: its duration is not motionMs.publicImpact, or its beats do not add up`);
    const [a, b, c] = study.storyboardFramesMs;
    if (!(a >= 0 && a <= b && b <= c && c === study.durationMs)) problems.push(`${study.id}: storyboard frames must rise to the full duration`);
  }
  if (cues.cues.some(cue => cue.status !== 'authorized' || /^study-/.test(cue.id))) problems.push('motion-cues.json holds something that is not an authorized cue');
  // Only the four study files may reach the studies. Every other page, module and stylesheet
  // of the review kit is free of them, so no shell page can load one by accident.
  for (const path of await filesUnder('design/prototypes')) {
    const content = await text(path);
    if (STUDY_FILES.includes(path)) {
      if (!content.includes(DEV_ONLY_SENTINEL)) problems.push(`${path}: a study file without the development-only mark`);
      continue;
    }
    for (const mark of STUDY_MARKS) if (content.includes(mark)) problems.push(`${path}: reaches the synthetic studies through "${mark}"`);
  }
  const synthetic = await text('design/prototypes/css/synthetic.css');
  const durations = [...synthetic.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/animation-duration:\s*([^;]+);/g)].map(match => match[1].trim());
  if (durations.length !== 1 || durations[0] !== `${tokens.motionMs.publicImpact}ms`) problems.push('synthetic.css: the study duration is not motionMs.publicImpact');
  if (/--ms-asset-/.test(synthetic)) problems.push('synthetic.css: a study stylesheet draws an asset');
  check('the synthetic studies are fenced off from assets, bundles and shell pages', problems);
}

// ---------- The reference stylesheets ----------
// What exists only inside an open private sheet. A selector that mentions any of these is
// about private state.
// The same test serves twice: anywhere in a selector it says the rule is about private state;
// on one of the selector's own parts (not inside :has() or :not()) it says that part is an
// element of the sheet, so what the rule styles is that element or something inside it.
const PRIVATE_HOOK = /\.ms-(?:cards|card|pip|role-card|targets|target|actions|notice|private__panel|private__subheading)(?:__[a-z-]+)?(?![\w-])|\[data-(?:status|step|selected|pip|action|target-seat)\b|#ms-shot-/;
const PRIVATE_ELEMENT = PRIVATE_HOOK;
const NAMED_COLOR = /\b(black|white|red|green|blue|yellow|orange|purple|violet|pink|brown|gray|grey|silver|gold|navy|teal|cyan|magenta|maroon|olive|lime|aqua|fuchsia|beige|ivory|khaki|coral|crimson|indigo|tan|salmon)\b/i;
const SYSTEM_COLOR = /\b(Canvas|CanvasText|Highlight|HighlightText|ButtonFace|ButtonText|LinkText|GrayText|Field|FieldText)\b/;
const CLIENT_SET = new Set(['--ms-phase-block-size', '--ms-role-art', '--ms-team-accent', '--cue-at', '--cue-play']);
{
  const problems = [];
  const sheets = {};
  for (const name of ['comic.css', 'cues.css']) sheets[name] = parseStylesheet(await text(`design/prototypes/css/${name}`), name);
  const tokenNames = new Set([...tokenVariables(tokens).existing, ...tokenVariables(tokens).proposed].map(([name]) => name));
  const assetProperties = new Map(allVariants.map(entry => [entry.property, entry]));
  const declaredLocally = new Set();
  const read = new Set();

  for (const [name, sheet] of Object.entries(sheets)) {
    const everyDeclaration = [...sheet.rules.flatMap(rule => rule.declarations.map(declaration => [rule, declaration])), ...sheet.keyframes.flatMap(frames => frames.steps.flatMap(step => step.declarations.map(declaration => [{ selectors: [`@keyframes ${frames.name}`], media: [], line: frames.line }, declaration])))];
    for (const [rule, [property, value]] of everyDeclaration) {
      const where = `${name}:${rule.line}`;
      if (property.startsWith('--')) declaredLocally.add(property);
      for (const used of value.matchAll(/var\(\s*(--[\w-]+)/g)) read.add(used[1]);

      // Colors come from tokens. System colors are for forced colors only.
      const plain = value.replace(/var\(\s*--[\w-]+/g, 'var(').replace(/url\("[^"]*"\)/g, 'url()');
      if (/#[0-9a-fA-F]{3,8}\b/.test(plain) || /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/.test(plain)) problems.push(`${where}: literal color in "${property}: ${value}"; colors come from tokens`);
      if (NAMED_COLOR.test(plain)) problems.push(`${where}: named color in "${property}: ${value}"; colors come from tokens`);
      if (SYSTEM_COLOR.test(plain) && !rule.media.includes('(forced-colors: active)')) problems.push(`${where}: a system color outside forced colors`);

      // Motion: once, never looping, and with the longhands a storyboard frame is frozen by.
      if (property === 'animation') problems.push(`${where}: the animation shorthand resets the delay and play state a storyboard frame is frozen with`);
      if (property === 'animation-iteration-count' || /\binfinite\b/.test(value)) problems.push(`${where}: an animation that repeats`);
      if (name === 'comic.css' && property.startsWith('animation')) problems.push(`${where}: comic.css holds no animation; cues are in cues.css`);
      if (property === 'animation-duration' && !/^var\(--ms-motion-[\w-]+\)$/.test(value)) problems.push(`${where}: duration ${value} is not a motion token`);

      // Art: only through a bundle's own properties, only once that bundle has arrived, and
      // only where the manifest lets that picture be drawn.
      for (const used of value.matchAll(/var\(\s*(--ms-asset-[\w-]+)/g)) {
        const entry = assetProperties.get(used[1]);
        if (!entry) {
          problems.push(`${where}: ${used[1]} is not an export`);
          continue;
        }
        const bundle = entry.asset.bundle;
        if (!rule.media.includes('(forced-colors: none)')) problems.push(`${where}: ${used[1]} is drawn outside @media (forced-colors: none)`);
        for (const selector of rule.selectors) {
          const parts = compounds(selector);
          if (parts[0] !== `[data-art~="${bundle}"]` && parts[0] !== `:where([data-art~="${bundle}"])`) problems.push(`${where}: ${used[1]} is drawn by "${selector}", which does not wait for the ${bundle} bundle`);
          if (selector.includes('.ms-shell--table') && !entry.variant.surfaces.includes('table')) problems.push(`${where}: ${used[1]} may not be drawn on the table display`);
          if (!hasPublicSurface(entry.variant) && !parts.slice(0, -1).includes('.ms-private__panel')) problems.push(`${where}: ${used[1]} is private and "${selector}" is not inside .ms-private__panel`);
        }
      }
      if (/url\(/.test(value)) problems.push(`${where}: a stylesheet address in "${property}"; pictures come from a bundle's properties, never from a file asked for later`);
    }

    for (const rule of sheet.rules) {
      const where = `${name}:${rule.line}`;
      for (const selector of rule.selectors) {
        const parts = compounds(selector);
        const gate = /^(?::where\()?\[data-art~="([\w-]+)"\]\)?$/.exec(parts[0]);
        if (/data-art/.test(selector) && !gate) problems.push(`${where}: "${selector}" uses data-art somewhere other than its first part`);
        if (gate && !onDisk.bundles[gate[1]]) problems.push(`${where}: "${selector}" waits for a bundle that does not exist`);
        if (gate && !rule.media.includes('(forced-colors: none)')) problems.push(`${where}: an art rule outside @media (forced-colors: none)`);
        // Nothing outside the private sheet may be styled by what is inside it, and no
        // selector may know a role.
        if (PRIVATE_HOOK.test(selector)) {
          if (!parts.some(part => PRIVATE_ELEMENT.test(withoutArguments(part)))) problems.push(`${where}: "${selector}" styles something outside the private sheet by what is inside it`);
          if (selector.includes('.ms-shell--table')) problems.push(`${where}: "${selector}" puts a private hook on the table display`);
        }
        if (/data-role|data-team|data-faction/.test(selector) || nameParts(selector.replace(/data-art~="roles"/g, '')).some(part => PRIVATE_WORD.test(part))) problems.push(`${where}: "${selector}" is keyed on a role, a team or a private thing`);
        if (/data-assets/.test(selector)) problems.push(`${where}: "${selector}" uses the retired data-assets hook`);
      }
    }
  }

  const cueRules = sheets['cues.css'].rules.flatMap(rule => rule.selectors);
  for (const kind of cues.directorVocabulary) if (!cueRules.some(selector => selector.includes(`[data-cue="${kind}"]`))) problems.push(`cues.css: no treatment for the director's "${kind}" cue`);
  // The review kit sets a few properties inline, by name.
  for (const used of (await text('design/prototypes/js/kit.js')).matchAll(/'(--ms-[\w-]+)'/g)) read.add(used[1]);
  for (const name of read) {
    if (name.startsWith('--ms-asset-')) continue;
    if (!tokenNames.has(name) && !declaredLocally.has(name) && !CLIENT_SET.has(name)) problems.push(`${name} is read by a reference stylesheet and defined nowhere`);
  }
  // A proposed variable nothing reads is a claim nothing tests. The names Frontend already
  // has are theirs and are listed whole.
  for (const [name] of tokenVariables(tokens).proposed) if (!read.has(name)) problems.push(`${name} is proposed in tokens.css and read by no reference stylesheet`);
  if ((await text('design/prototypes/css/tokens.css')) !== tokenStylesheet(tokens)) problems.push('prototypes/css/tokens.css is not what the token file produces: run build-exports.mjs');
  if ((await text('design/prototypes/js/token-index.js').catch(() => null)) !== tokenPaletteModule(tokens)) problems.push('prototypes/js/token-index.js is not what the token file produces: run build-exports.mjs');
  for (const [path, content] of reviewPageIndex(manifest, studyPlan)) if ((await text(path).catch(() => null)) !== content) problems.push(`${path} is not what the manifests produce: run build-exports.mjs`);
  check('reference stylesheets take colors from tokens and art from loaded bundles, and keep private state inside the sheet', problems);
}

// ---------- The motion contract ----------
{
  const problems = [];
  for (const cue of cues.cues) {
    const total = tokens.motionMs[cue.durationToken];
    if (total === undefined) problems.push(`${cue.id}: no motion token "${cue.durationToken}"`);
    if (cue.durationMs !== total) problems.push(`${cue.id}: ${cue.durationMs} ms is not the token value ${total}`);
    const { opening, accent, settle } = cue.beatsMs;
    if (opening + accent + settle !== cue.durationMs) problems.push(`${cue.id}: beats do not add up to its duration`);
    const beats = tokens.motionBeatsMs[cue.durationToken];
    if (!beats || JSON.stringify(beats) !== JSON.stringify(cue.beatsMs)) problems.push(`${cue.id}: beats differ from the token file`);
    if (cue.durationMs > tokens.motionMs.comicBeatMaximum) problems.push(`${cue.id}: longer than the longest beat the tokens allow`);
    const [a, b, c] = cue.storyboardFramesMs;
    if (!(a >= 0 && a <= b && b <= c && c === cue.durationMs)) problems.push(`${cue.id}: storyboard frames must rise to the full duration`);
    for (const name of Object.values(cue.easing)) if (!tokens.motionEasing[name]) problems.push(`${cue.id}: no easing token "${name}"`);
    for (const field of ['title', 'audience', 'authorizedBy', 'says', 'reducedMotion', 'reducedEffects', 'audio', 'fallback']) if (!cue[field]) problems.push(`${cue.id}: no ${field}`);
    if (cue.frontendCue !== null && !cues.directorVocabulary.includes(cue.frontendCue)) problems.push(`${cue.id}: "${cue.frontendCue}" is not a cue the director issues`);
    else if (cue.frontendCue === null && cue.audienceTag !== 'local') problems.push(`${cue.id}: a cue with no director kind must be local input`);
  }
  for (const kind of cues.directorVocabulary) if (cues.cues.filter(cue => cue.frontendCue === kind).length !== 1) problems.push(`the director's "${kind}" cue needs exactly one treatment`);
  if (tokens.motionPolicy.publicSecretActionCue !== false) problems.push('motionPolicy.publicSecretActionCue must stay false');
  if (cues.cues.find(cue => cue.frontendCue === 'registration')?.audienceTag !== 'private') problems.push('the registration cue must be private');
  if (Object.keys(tokens.motionBeatsMs).some(name => tokens.motionMs[name] === undefined)) problems.push('motionBeatsMs splits a duration that motionMs does not have');
  if (tokens.motionBeatsMs.publicImpact) problems.push('motionBeatsMs.publicImpact would give the synthetic studies a token of their own');
  check('motion contract matches the tokens and the director vocabulary', problems);
}

// ---------- The component and state contract ----------
{
  const problems = [];
  const componentIds = new Set(states.components.map(component => component.id));
  const assetIds = new Set(onDisk.assets.map(asset => asset.id));
  const cueIds = new Set(cues.cues.map(cue => cue.id));
  if (componentIds.size !== states.components.length) problems.push('two components share an id');
  for (const component of states.components) {
    for (const field of ['id', 'title', 'surfaces', 'audience', 'hook', 'states']) if (!component[field] || component[field].length === 0) problems.push(`${component.id}: no ${field}`);
    for (const surface of component.surfaces) if (!states.surfaces[surface]) problems.push(`${component.id}: unknown surface ${surface}`);
    for (const id of component.assets ?? []) {
      const asset = onDisk.assets.find(candidate => candidate.id === id);
      if (!asset) {
        problems.push(`${component.id}: asset ${id} is not in the manifest`);
        continue;
      }
      // An asset must be allowed wherever a state that could use it is drawn.
      const reach = new Set(asset.variants.flatMap(variant => variant.surfaces));
      const everyStateNarrowed = component.states.every(state => state.surfaces);
      const needed = everyStateNarrowed ? new Set(component.states.flatMap(state => state.surfaces)) : new Set(component.surfaces);
      for (const surface of needed) if (!reach.has(surface)) problems.push(`${component.id}: is drawn on ${surface}, where no variant of ${id} may be drawn`);
      // Art that is only ever private belongs to private components only.
      if (!asset.variants.some(hasPublicSurface) && component.audience !== 'private') problems.push(`${component.id}: a public component lists ${id}, which may be drawn only inside the private sheet`);
    }
    for (const id of component.cues ?? []) if (!cueIds.has(id)) problems.push(`${component.id}: cue ${id} is not in the motion contract`);
    if (component.audience === 'private' && component.surfaces.some(surface => surface !== 'phone-private')) problems.push(`${component.id}: a private component is listed on a public surface`);
    const names = new Set();
    for (const state of component.states) {
      if (names.has(state.state)) problems.push(`${component.id}: state ${state.state} is listed twice`);
      names.add(state.state);
      // Each state says what it is drawn from, how it looks and what words say it. Whether
      // the look it describes really differs from its neighbors is judged by eye, not here.
      for (const field of ['when', 'shape', 'words']) if (typeof state[field] !== 'string' || state[field].trim() === '') problems.push(`${component.id}:${state.state}: no ${field}`);
    }
  }
  for (const [name, list] of Object.entries(states.requiredStates)) {
    if (list.length === 0) problems.push(`required state ${name} is drawn nowhere`);
    for (const entry of list) {
      const [id, state] = entry.split(':');
      const component = states.components.find(candidate => candidate.id === id);
      const found = component?.states.find(candidate => candidate.state === state);
      if (!found) problems.push(`required state ${name}: ${entry} does not exist`);
      else if (/drawn by no|NOT DRAWN/i.test(`${found.when} ${found.note ?? ''}`)) problems.push(`required state ${name}: ${entry} is a state nothing draws`);
    }
  }
  for (const required of ['idle', 'selection', 'targeting', 'pending', 'registered', 'unavailable', 'spent', 'reconnect']) if (!states.requiredStates[required]) problems.push(`required state ${required} is missing`);
  for (const name of Object.keys(states.requiredStateNotes ?? {})) if (!states.requiredStates[name]) problems.push(`a note is given for "${name}", which is not a required state`);

  // The Shot card's states are the pictures the review kit draws, and their statuses are
  // the ten Frontend's model has (packages/presentation/src/model/types.ts, ShotCardStatus).
  const FRONTEND_STATUSES = ['available', 'unavailable', 'targeting', 'confirming', 'submitting', 'checking', 'unknown', 'registered', 'was-registered', 'not-registered'];
  const cardStates = states.components.find(component => component.id === 'action-card').states.map(state => state.state).sort();
  const specimens = Object.keys(kit.SHOT_SPECIMENS).sort();
  if (JSON.stringify(cardStates) !== JSON.stringify(specimens)) problems.push(`action-card lists ${cardStates.join(', ')} and the review kit draws ${specimens.join(', ')}`);
  const drawnStatuses = [...new Set(Object.values(kit.SHOT_SPECIMENS).map(specimen => specimen.status))].sort();
  if (JSON.stringify(drawnStatuses) !== JSON.stringify([...FRONTEND_STATUSES].sort())) problems.push('the review kit does not draw exactly the ten statuses of Frontend\'s Shot card');
  for (const id of Object.keys(kit.SHOT_SPECIMENS)) if (!kit.SHOT_SPECIMEN_NOTES[id]) problems.push(`no caption for the Shot card picture "${id}"`);
  for (const specimen of Object.values(kit.SHOT_SPECIMENS)) if (specimen.pip === 'spent') problems.push('a Shot card picture draws the spent pip, which no field authorizes');

  for (const [name, board] of Object.entries(callouts.boards)) {
    const numbers = new Set();
    for (const callout of board.callouts) {
      if (!componentIds.has(callout.component)) problems.push(`layout ${name}: callout ${callout.n} names unknown component ${callout.component}`);
      if (numbers.has(callout.n)) problems.push(`layout ${name}: callout number ${callout.n} is used twice`);
      numbers.add(callout.n);
    }
    for (const frame of board.frames) {
      const status = new URL(frame.src, 'http://x/').searchParams.get('status');
      if (status && !kit.SHOT_SPECIMENS[status]) problems.push(`layout ${name}: "${status}" is not a picture of the Shot card`);
      if (/assets=|[?&]role=open|[?&]text=/.test(frame.src)) problems.push(`layout ${name}: ${frame.src} uses a retired page option`);
    }
  }
  for (const item of plannedAssets.groups.flatMap(group => group.items)) {
    if (assetIds.has(item.id)) problems.push(`${item.id} is listed as not produced and is in the manifest`);
    for (const field of ['id', 'title', 'needs', 'until']) if (!item[field]) problems.push(`planned ${item.id}: no ${field}`);
  }
  check('component, state and layout contracts are complete and agree with the review kit', problems);
}

// ---------- Proposed copy cites real rule sources ----------
{
  const problems = [];
  const roleWords = new RegExp(ROLE_NAMES.join('|'), 'i');
  for (const [role, words] of Object.entries(copy.roleCard)) {
    if (!ROLE_NAMES.includes(role)) problems.push(`copy for an unknown role "${role}"`);
    if (!onDisk.bundles.roles.producedRoles.includes(role)) problems.push(`${role}: a proposed card for a role with no illustration`);
    for (const reference of words.sources) {
      const [path, pointer] = reference.split('#');
      let value = await json(path).catch(() => undefined);
      for (const part of pointer.split('/').filter(Boolean)) value = value?.[part];
      if (value === undefined) problems.push(`${role}: ${reference} does not resolve`);
    }
    if (/identif|guess/i.test(`${words.summary} ${words.limit}`)) problems.push(`${role}: the copy mentions the archived identification step`);
  }
  for (const [key, value] of Object.entries(copy.resourcePip)) if (key !== 'note' && roleWords.test(value)) problems.push(`resourcePip.${key} names a role`);
  for (const value of Object.values(copy.privateHandle)) if (roleWords.test(value)) problems.push('the private handle names a role');
  check('proposed copy cites rule sources that exist', problems);
}

// ---------- Tokens stay additive ----------
{
  const problems = [];
  (function compare(before, after, path) {
    if (Array.isArray(before)) {
      if (!Array.isArray(after) || before.some((item, index) => JSON.stringify(item) !== JSON.stringify(after[index]))) problems.push(`${path}: 0.2.0 entries changed`);
    } else if (before !== null && typeof before === 'object') {
      for (const [key, value] of Object.entries(before)) {
        if (after?.[key] === undefined) problems.push(`${path}.${key}: removed`);
        else compare(value, after[key], `${path}.${key}`);
      }
    } else if (path !== 'tokens.version' && before !== after) problems.push(`${path}: ${JSON.stringify(before)} became ${JSON.stringify(after)}`);
  })(pinnedTokens, tokens, 'tokens');
  if (sha256(await readFile(resolve(repoRoot, 'packages/design-tokens/src/tokens.json'))) !== sha256(await readFile(resolve(repoRoot, 'docs/design/design-tokens.json')))) problems.push('the pinned 0.2.0 token export no longer matches its source');
  // The lock update is requested by hash, so the hash written in the request must be the file's.
  const request = await text('docs/design/integration-requests.md').catch(() => '');
  for (const path of ['packages/design-tokens/src/tokens-0.3.0.json', 'docs/design/design-tokens.json']) {
    if (!request.includes(sha256(await readFile(resolve(repoRoot, path))))) problems.push(`docs/design/integration-requests.md does not quote the current SHA-256 of ${path}`);
  }
  check('tokens 0.3.0 only add to the pinned 0.2.0', problems);
}

// ---------- Generated documents, review images and browser reports ----------
{
  const problems = [];
  const inputs = await reviewInputsSha256(repoRoot);
  for (const [path, content] of await planDocs({ repoRoot, manifest, studyManifest: studyPlan })) {
    const current = await text(path).catch(() => null);
    if (current === null) problems.push(`${path} is missing: run write-docs.mjs`);
    else if (current !== content) problems.push(`${path} is out of date: run write-docs.mjs`);
    for (const image of content.matchAll(/\]\(\.\.\/\.\.\/(design\/review\/[\w.-]+\.png)\)/g)) {
      if (!(await readFile(resolve(repoRoot, image[1])).catch(() => null))) problems.push(`${path}: ${image[1]} does not exist: run render-review.mjs`);
    }
  }
  // A render or a measurement records the hash of everything the pages draw from. If that
  // has changed since, the record is of something else and has to be made again.
  const index = await json('design/review/index.json').catch(() => null);
  if (index === null) problems.push('design/review/index.json is missing: run render-review.mjs');
  else {
    if (index.inputsSha256 !== inputs) problems.push('the review images were rendered from different pages, exports or contracts: run render-review.mjs');
    for (const image of index.images) if (!(await readFile(resolve(repoRoot, image.file)).catch(() => null))) problems.push(`${image.file} is listed in the review index and does not exist`);
    const present = (await filesUnder('design/review')).filter(path => path.endsWith('.png'));
    for (const path of present) if (!index.images.some(image => image.file === path)) problems.push(`${path} is not in the review index: a stale image`);
  }
  for (const [file, tool] of [['design/review/layout-check.json', 'check-layout.mjs'], ['design/review/shell-check.json', 'check-shell.mjs']]) {
    const report = await json(file).catch(() => null);
    if (report === null) problems.push(`${file} is missing: run ${tool}`);
    else {
      if (report.inputsSha256 !== inputs) problems.push(`${file} was measured on different pages, exports or contracts: run ${tool}`);
      if (report.failures.length > 0) problems.push(`${file} records ${report.failures.length} failures`);
      if (report.partial) problems.push(`${file} is a partial run (${report.partial}): run ${tool} whole`);
    }
  }
  check('generated documents, review images and browser reports are current', problems);
}

for (const name of passed) console.log(`ok    ${name}`);
for (const failure of failures) console.error(`FAIL  ${failure}`);
const fileCount = allVariants.length + onDisk.sprites.length;
console.log(`Design checks: ${passed.length} passed, ${failures.length} failures; ${onDisk.assets.length} assets, ${fileCount} exported files, ${Object.keys(onDisk.bundles).length} bundle stylesheets, ${states.components.length} components, ${cues.cues.length} cues, ${studiesOnDisk.studies.length} fenced studies; recipes ${recipes.manifestVersion}`);
if (failures.length > 0) process.exitCode = 1;
