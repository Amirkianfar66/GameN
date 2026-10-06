// mothership:dev-only
//
// Watches what the reference shells ask the network for and what they draw, across every
// private state a seat can be in:
//   node design/tools/check-shell.mjs
//   npm run check:shell --workspace @mothership/design-tokens
//
// The question it answers is whether an observer who sees a device's requests, or its
// screen with the private sheet closed, can learn anything about the seat. The list of
// what is asserted is at the end of this file, in the words the report uses.
//
// It needs a Chromium-based browser (CHROME_PATH overrides the search), so it is not part
// of `npm run verify`. It watches desktop Chrome loading the Designer's hand-built copy of
// the shell markup with the Designer's reference stylesheets and loader. It says nothing
// about what Frontend's runtime requests: that has to be checked there, in the same way.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { reviewInputsSha256 } from './lib/inputs.mjs';
import { startStaticServer } from './lib/static-server.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const manifest = JSON.parse(await readFile(resolve(repoRoot, 'design/exports/asset-manifest.json'), 'utf8'));
const modes = JSON.parse(await readFile(resolve(repoRoot, 'rules/overlays/player-modes-officer.json'), 'utf8'));
const kit = await import(pathToFileURL(resolve(repoRoot, 'design/prototypes/js/kit.js')).href);

const ROLES = [...modes.modes['9'].blue_roles, ...modes.modes['9'].red_roles, 'Alien'];
const SPECIMENS = Object.entries(kit.SHOT_SPECIMENS);
const local = path => path.replace(/^design/, '');
const sheetOf = bundle => local(manifest.bundles[bundle].stylesheet.path);
const PHONE_BUNDLES = ['public-board', 'player-ui', 'roles'].map(sheetOf).sort();
const TABLE_BUNDLES = [sheetOf('public-board')];
// Every picture, by the property that holds it, with the surfaces the manifest allows it on.
const PICTURES = manifest.assets.flatMap(asset => asset.variants.map(variant => ({ property: `--ms-asset-${asset.id}-${variant.variant}`, surfaces: variant.surfaces })));

const failures = [];
const counts = { pageLoads: 0, redraws: 0, publicLayerComparisons: 0, picturesPlaced: 0, privateUpdatesUnderRunningCues: 0, publicCueAnimationsHeld: 0 };
const pathsOf = (requests, origin) => requests.map(url => url.replace(origin, '').replace(/\?.*$/, ''));

// Runs in the page. Which pictures are drawn where: each drawn picture is matched to the
// bundle property that holds it, and reported with the surface it was drawn on.
const drawnPictures = `(() => {
  const pictures = ${JSON.stringify(PICTURES)};
  const root = getComputedStyle(document.documentElement);
  const held = pictures.map(picture => ({ ...picture, value: root.getPropertyValue(picture.property).trim() })).filter(picture => picture.value !== '');
  const shell = document.querySelector('.ms-shell');
  const panel = shell.querySelector('.ms-private__panel');
  const table = shell.dataset.surface === 'table';
  const found = [];
  for (const node of shell.querySelectorAll('*')) {
    const surface = table ? 'table' : panel && panel.contains(node) ? 'phone-private' : 'phone-public';
    for (const pseudo of [null, '::before', '::after']) {
      const style = getComputedStyle(node, pseudo);
      if (style.display === 'none' || (pseudo && style.content === 'none')) continue;
      const drawn = ['background-image', 'mask-image', 'border-image-source', 'list-style-image', 'content', 'cursor'].map(name => style.getPropertyValue(name)).join(' ');
      if (!drawn.includes('url(')) continue;
      for (const picture of held) if (drawn.includes(picture.value)) found.push({ property: picture.property, surface, allowed: picture.surfaces.includes(surface), on: node.className + (pseudo ?? '') });
    }
  }
  return { held: held.length, found };
})()`;

// Runs in the page. Everything outside the private panel that paints: attributes, words and
// the painted properties of every element and its two pseudo-elements. Geometry is left
// out on purpose: the sheet's own height is not a fact about the public layer.
const publicLayer = `(() => {
  const PAINT = ['display', 'visibility', 'opacity', 'color', 'background-color', 'background-image', 'mask-image', 'box-shadow', 'filter',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'outline-color', 'outline-style', 'outline-width',
    'translate', 'rotate', 'scale', 'transform', 'font-weight', 'font-size', 'text-decoration-line', 'content', 'animation-name'];
  const shell = document.querySelector('.ms-shell');
  const panel = shell.querySelector('.ms-private__panel');
  const lines = ['html ' + [...document.documentElement.attributes].map(a => a.name + '=' + a.value).sort().join(' ')];
  (function walk(node, path) {
    const here = path + '/' + node.tagName.toLowerCase() + (node.id ? '#' + node.id : '') + (node.className ? '.' + String(node.className).replaceAll(' ', '.') : '');
    const attributes = [...node.attributes].map(a => a.name + '=' + a.value).sort().join(' ');
    const words = [...node.childNodes].filter(child => child.nodeType === 3).map(child => child.textContent.trim()).filter(Boolean).join('|');
    for (const pseudo of [null, '::before', '::after']) {
      const style = getComputedStyle(node, pseudo);
      lines.push(here + (pseudo ?? '') + ' {' + PAINT.map(name => style.getPropertyValue(name)).join(';') + '}' + (pseudo ? '' : ' [' + attributes + '] "' + words + '"'));
    }
    // The panel itself is part of the public layer; what it holds is not.
    if (node !== panel) for (const child of node.children) walk(child, here);
  })(shell, '');
  return lines;
})()`;

const withoutArt = `(() => {
  const shell = document.querySelector('.ms-shell');
  const problems = [];
  for (const node of shell.querySelectorAll('[data-seat] > .ms-token, [data-target-seat] > .ms-token')) {
    const style = getComputedStyle(node);
    if (style.backgroundImage.includes('url(')) problems.push('a token still draws a picture');
    if (style.color === 'rgba(0, 0, 0, 0)' || parseFloat(style.fontSize) < 12 || node.textContent.trim() === '') problems.push('a token shows no numeral');
  }
  for (const node of shell.querySelectorAll('.ms-seat__name, .ms-marker')) {
    const box = node.getBoundingClientRect();
    if (box.width <= 1 || box.height <= 1 || parseFloat(getComputedStyle(node).fontSize) < 12) problems.push('"' + node.textContent + '" is hidden');
  }
  return { art: document.documentElement.dataset.art ?? '', bundles: window.__bundles, problems: [...new Set(problems)].slice(0, 5) };
})()`;

const server = await startStaticServer();
const chrome = await launchBrowser();
try {
  const browser = await connect(chrome.endpoint);
  const open = async (query, { width = 390, height = 800, blocked = null, media = null } = {}) => {
    const page = await openPage(browser, { width, height });
    if (blocked) await page.block(blocked);
    if (media) await page.media(media);
    await page.goto(`${server.origin}/prototypes/shell.html?${query}`);
    counts.pageLoads += 1;
    return page;
  };
  const check = async (page, label, { allowFailedRequests = false } = {}) => {
    const problems = page.problems().filter(problem => !(allowFailedRequests && /request failed/.test(problem)));
    for (const problem of problems) failures.push(`${label}: page problem: ${problem}`);
  };
  const surfaces = async (page, label) => {
    const { held, found } = await page.evaluate(drawnPictures);
    counts.picturesPlaced += found.length;
    if (held === 0) failures.push(`${label}: no bundle picture is held by the page, so nothing was compared`);
    for (const picture of found.filter(item => !item.allowed)) failures.push(`${label}: ${picture.property} is drawn on ${picture.surface} (${picture.on}), where the manifest does not allow it`);
    return found;
  };

  // ---- 1. A fresh device, in each private state: what does it ask for? ----
  const phoneLoads = [
    ...SPECIMENS.map(([id]) => `surface=player&open=1&status=${id}`),
    ...SPECIMENS.map(([id]) => `surface=player&status=${id}`),
    ...ROLES.map(role => `surface=player&open=1&status=unavailable&viewer=5&role=${encodeURIComponent(role)}`),
    'surface=player&open=1&status=available&about=open',
    'surface=player&state=C&viewer=8&open=1&status=registered-idle&role=Alien',
  ];
  let reference = null;
  for (const query of phoneLoads) {
    const page = await open(query);
    const paths = pathsOf(page.requests(), server.origin);
    const art = paths.filter(path => path.startsWith('/exports/')).sort();
    if (JSON.stringify(art) !== JSON.stringify(PHONE_BUNDLES)) failures.push(`${query}: asked for ${art.join(', ') || 'no art'}; a phone asks for its three bundle stylesheets and nothing else`);
    const fenced = paths.filter(path => /stud(y|ies)|synthetic/.test(path));
    if (fenced.length > 0) failures.push(`${query}: a shell asked for ${fenced.join(', ')}`);
    const asked = paths.filter(path => path !== '/prototypes/shell.html').sort().join('\n');
    if (reference === null) reference = asked;
    else if (asked !== reference) failures.push(`${query}: its requests differ from those of the first phone, so what a phone asks for depends on its private state`);
    await surfaces(page, query);
    await check(page, query);
    await page.close();
  }
  for (const state of ['A', 'B', 'C', 'D']) {
    const query = `surface=table&state=${state}`;
    const page = await open(query, { width: 1280, height: 800 });
    const paths = pathsOf(page.requests(), server.origin);
    const art = paths.filter(path => path.startsWith('/exports/')).sort();
    if (JSON.stringify(art) !== JSON.stringify(TABLE_BUNDLES)) failures.push(`${query}: asked for ${art.join(', ') || 'no art'}; the table asks for the public bundle stylesheet and nothing else`);
    if (paths.some(path => /stud(y|ies)|synthetic/.test(path))) failures.push(`${query}: the table asked for a study`);
    const found = await surfaces(page, query);
    if (state !== 'A' && !found.some(picture => picture.property.includes('standee'))) failures.push(`${query}: no standee was found on the table, so the picture scan is not seeing what is drawn`);
    await check(page, query);
    await page.close();
  }

  // ---- 2. One device, stepping through every private state: does it ask for anything? ----
  {
    const page = await open('surface=player');
    const before = page.requests().length;
    for (const viewer of [1, 5]) {
      for (const role of ROLES) {
        for (const [specimen] of SPECIMENS) {
          for (const sheetOpen of [true, false]) {
            await page.evaluate(`window.__draw(${JSON.stringify({ viewer, role, specimen, open: sheetOpen, turn: 'auto', connection: 'auto', roleExpanded: sheetOpen && role === 'Officer' })})`);
            counts.redraws += 1;
          }
        }
      }
    }
    await page.evaluate('new Promise(done => setTimeout(done, 300))');
    const later = pathsOf(page.requests().slice(before), server.origin);
    if (later.length > 0) failures.push(`stepping through every private state made ${later.length} new requests: ${[...new Set(later)].slice(0, 5).join(', ')}`);
    await check(page, 'stepping through private states');
    await page.close();
  }

  // ---- 3. The public layer is the same picture whatever the sheet holds ----
  {
    const page = await open('surface=player');
    for (const viewer of [1, 5]) {
      for (const [turn, connection] of [['own', 'live'], ['other', 'live'], ['own', 'stale'], ['other', 'stale']]) {
        const fits = ([, spec]) => spec.needs === null || (spec.needs === 'stale' ? connection === 'stale' : connection === 'live' && spec.needs === `${turn}-turn`);
        for (const sheetOpen of [false, true]) {
          let first = null;
          let firstLabel = '';
          for (const [specimen] of SPECIMENS.filter(fits)) {
            for (const role of ROLES) {
              await page.evaluate(`window.__draw(${JSON.stringify({ viewer, role, specimen, open: sheetOpen, turn, connection })})`);
              const lines = await page.evaluate(publicLayer);
              const label = `seat ${viewer}, ${turn} turn, ${connection}, sheet ${sheetOpen ? 'open' : 'closed'}: ${role} with ${specimen}`;
              counts.publicLayerComparisons += 1;
              if (first === null) {
                first = lines;
                firstLabel = label;
                continue;
              }
              const different = lines.length !== first.length ? [`${lines.length} parts against ${first.length}`] : lines.filter((line, index) => line !== first[index]).slice(0, 2).map(line => line.slice(0, 160));
              if (different.length > 0) failures.push(`the public layer differs between (${firstLabel}) and (${label}): ${different.join(' | ')}`);
            }
          }
          if (first === null) failures.push(`no picture of the Shot card fits seat ${viewer}, ${turn} turn, ${connection}`);
        }
      }
    }
    await check(page, 'comparing the public layer');
    await page.close();
  }

  // ---- 3b. A private-only update leaves a running public cue alone ----
  // Three public cues are started and each of their animations is held halfway. Then only
  // the private section is redrawn, through every picture of the Shot card that can occur
  // in that public state, two roles, and the sheet closing. Not one held animation may be
  // cancelled, restarted, moved in time or joined by a new one outside the private section.
  {
    const page = await open('surface=player&state=B&viewer=1&open=1&status=available');
    const held = await page.evaluate(`(() => {
      const mark = (selector, kind) => { const found = [...document.querySelectorAll(selector)]; for (const node of found) node.setAttribute('data-cue', kind); return found.length; };
      const marked = mark('li[data-cue-at="seat-2/place"]', 'public-move') + mark('.ms-marker[data-cue-at="seat-8/health"]', 'status-change') + mark('[data-cue-at="phase"]', 'round-transition');
      const publicOnes = () => document.getAnimations().filter(animation => animation.effect?.target && !animation.effect.target.closest('.ms-private'));
      window.__publicAnimations = publicOnes;
      window.__held = publicOnes();
      for (const animation of window.__held) { animation.pause(); animation.currentTime = animation.effect.getComputedTiming().duration / 2; }
      window.__heldState = () => window.__held.map(animation => [animation.animationName ?? 'transition', animation.effect.pseudoElement ?? '', animation.playState, animation.currentTime === null ? null : Math.round(animation.currentTime), animation.effect.target.isConnected].join(' '));
      return { marked, names: [...new Set(window.__held.map(animation => animation.animationName))].sort(), state: window.__heldState() };
    })()`);
    counts.publicCueAnimationsHeld = held.state.length;
    const kinds = ['ms-cue-drop', 'ms-cue-ring', 'ms-cue-sweep'];
    if (held.marked < 3 || !kinds.every(name => held.names.includes(name))) failures.push(`the running-cue case did not start a move, a status change and a round transition (marked ${held.marked}; running ${held.names.join(', ') || 'nothing'}), so it tests nothing`);
    const paintBefore = await page.evaluate(publicLayer);
    const ownTurn = SPECIMENS.filter(([, spec]) => spec.needs === null || spec.needs === 'own-turn').map(([id]) => id);
    const updates = [
      ...ownTurn.flatMap(specimen => ['Officer', 'Hacker'].map(role => ({ specimen, role, open: true }))),
      { roleExpanded: true },
      { roleExpanded: false },
      { open: false },
      { open: true, specimen: 'registered' },
    ];
    for (const update of updates) {
      await page.evaluate(`window.__drawPrivate(${JSON.stringify(update)})`);
      // The registration stamp itself plays inside the sheet; it must not touch anything outside it.
      await page.evaluate(`document.querySelector('.ms-private [data-cue-at="registration"]')?.setAttribute('data-cue', 'registration')`);
      const after = await page.evaluate('({ state: window.__heldState(), running: window.__publicAnimations().length })');
      counts.privateUpdatesUnderRunningCues += 1;
      const label = `a private-only update (${JSON.stringify(update)})`;
      const changed = after.state.filter((line, index) => line !== held.state[index]);
      if (changed.length > 0) failures.push(`${label} disturbed a running public cue: ${changed.slice(0, 2).join(' | ')}`);
      if (after.running !== held.state.length) failures.push(`${label} left ${after.running} public animations where ${held.state.length} were running`);
    }
    // Back in the state it started in, with the cues still held where they were, the public
    // layer is painted exactly as before.
    await page.evaluate(`window.__drawPrivate(${JSON.stringify({ specimen: 'available', role: 'Officer', open: true, roleExpanded: false })})`);
    const paintAfter = await page.evaluate(publicLayer);
    const repainted = paintAfter.length !== paintBefore.length ? ['a different number of parts'] : paintAfter.filter((line, index) => line !== paintBefore[index]).slice(0, 2).map(line => line.slice(0, 160));
    if (repainted.length > 0) failures.push(`after a round of private-only updates the public layer with its held cues is painted differently: ${repainted.join(' | ')}`);
    await check(page, 'private-only updates under running public cues');
    await page.close();
  }

  // ---- 4. A device whose art never arrives ----
  for (const [query, size] of [['surface=player&open=1&status=targeting', {}], ['surface=table&state=C', { width: 1280, height: 800 }]]) {
    const page = await open(query, { ...size, blocked: ['*/exports/*'] });
    const result = await page.evaluate(withoutArt);
    const label = `${query} with every art request refused`;
    if (result.art !== '' || result.bundles.length > 0) failures.push(`${label}: data-art is "${result.art}" although nothing arrived`);
    for (const problem of result.problems) failures.push(`${label}: ${problem}`);
    await check(page, label, { allowFailedRequests: true });
    await page.close();
  }
  {
    const page = await open('surface=player&open=1&status=available', { blocked: ['*/exports/roles/*'] });
    const result = await page.evaluate(`(${withoutArt.slice(0, 0)}(() => ({ art: document.documentElement.dataset.art ?? '', thumbnail: getComputedStyle(document.querySelector('.ms-role-card__art')).display, token: getComputedStyle(document.querySelector('[data-seat] > .ms-token')).backgroundImage.includes('url(') }))())`);
    if (result.art !== 'public-board player-ui') failures.push(`with the role bundle refused, data-art is "${result.art}"`);
    if (result.thumbnail !== 'none') failures.push('with the role bundle refused, the role card still makes room for a picture');
    if (!result.token) failures.push('with only the role bundle refused, the public art is missing too');
    await check(page, 'role bundle refused', { allowFailedRequests: true });
    await page.close();
  }

  // ---- 5. Forced colors: the skin without pictures, although the art has arrived ----
  for (const [query, size] of [['surface=player&open=1&status=targeting', {}], ['surface=table&state=C', { width: 1280, height: 800 }]]) {
    const page = await open(query, { ...size, media: { 'forced-colors': 'active' } });
    const result = await page.evaluate(withoutArt);
    const label = `${query} with forced colors`;
    if (!result.art.includes('public-board')) failures.push(`${label}: the art did not arrive, so the case tests nothing`);
    for (const problem of result.problems) failures.push(`${label}: ${problem}`);
    await check(page, label);
    await page.close();
  }

  // ---- 6. The watcher can see what it is watching for ----
  {
    const page = await openPage(browser, { width: 1200, height: 900 });
    await page.goto(`${server.origin}/prototypes/assets.html?sheet=officer`);
    if (!pathsOf(page.requests(), server.origin).some(path => /^\/exports\/roles\/card-officer\.art\..+\.svg$/.test(path))) failures.push('a review page that fetches one role file did so unseen: the request watcher is not working');
    await page.close();
    const studies = await openPage(browser, { width: 1200, height: 900 });
    await studies.goto(`${server.origin}/prototypes/studies.html`);
    if (!pathsOf(studies.requests(), server.origin).some(path => path.startsWith('/studies/'))) failures.push('the studies page loaded its studies unseen: the request watcher is not working');
    await studies.close();
    counts.pageLoads += 2;
  }
  browser.close();
} finally {
  await chrome.close();
  await server.close();
}

const ASSERTIONS = [
  'a phone asks for its three bundle stylesheets and for no other art, in every picture of the Shot card, open or closed, and for every role',
  'every phone makes the same requests, whatever its private state',
  'the table asks for the public bundle stylesheet and for no other art',
  'no shell asks for a synthetic study, its stylesheet or its module',
  'one phone redrawn in place through every role, every picture of the Shot card and the open and closed sheet makes no request at all',
  'everything outside the private panel is painted identically for every role and every picture of the Shot card that can occur in the same public state, with the sheet open and with it closed',
  'with a public move, a status change and a round transition each held halfway, redrawing only the private section through every picture of the Shot card, two roles and the sheet closing cancels, restarts, shifts or adds no animation outside it, and the public layer is painted as before',
  'every picture that is drawn is drawn on a surface its manifest entry allows: nothing private outside the private panel, nothing phone-only on the table',
  'with every art request refused the page marks no bundle as arrived, every token shows its numeral and no name or marker is hidden',
  'with only the role bundle refused the public art is still drawn and the role card makes no room for a picture',
  'with forced colors the same holds although the art has arrived',
  'the request watcher sees a single role file and a study when a review page does fetch one',
  'no page error, and no failed or refused request except the ones refused on purpose',
];
const report = {
  note: 'Desktop Chrome on one machine loading the Designer\'s hand-built copy of the shell markup with the Designer\'s reference stylesheets and loader. It shows that this design can be drawn without a request or a public pixel depending on private state. It is not a statement about Frontend\'s runtime, which has to be watched the same way.',
  browser: chrome.version,
  inputsSha256: await reviewInputsSha256(repoRoot),
  roles: ROLES,
  shotCardPictures: SPECIMENS.map(([id]) => id),
  ...counts,
  assertions: ASSERTIONS,
  failures,
};
await writeFile(resolve(repoRoot, 'design/review/shell-check.json'), `${JSON.stringify(report, null, 2)}\n`);
for (const failure of failures.slice(0, 40)) console.error(`FAIL ${failure}`);
if (failures.length > 40) console.error(`… and ${failures.length - 40} more`);
console.log(`Shell check: ${counts.pageLoads} page loads, ${counts.redraws} redraws, ${counts.publicLayerComparisons} public-layer comparisons, ${counts.picturesPlaced} drawn pictures placed, ${counts.privateUpdatesUnderRunningCues} private-only updates under ${counts.publicCueAnimationsHeld} held public cue animations, in ${chrome.version}; ${failures.length} failures`);
if (failures.length > 0) process.exitCode = 1;
