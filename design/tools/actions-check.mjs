// mothership:dev-only
//
// The Actions component's check (design/phone-ui/components/actions, with design/phone-ui/components/play-parts).
// It bundles the component's preview the way the game bundles the component (Vite: ordinary bundling, no copy),
// serves the bundle with the hosted game's production response headers (scripts/prepare-hosted-preview.mjs: the
// Content Security Policy of scripts/hosted-preview-policy.mjs and the six other headers), and captures every
// preview state at the two development phone sizes, 390 × 844 and 430 × 932, and the text-size states at their
// own (320 × 568 and 390 × 844), in desktop Chromium at 2× pixels. The component sits in the phone shell's sheet,
// with the room scene in the shell's stage, as in the game.
// A capture passes with no policy violation but the known Zod probe, no failed or refused request and no page
// error, with what the state asks drawn (below), and the room's crew behind.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion
//   emulated: tiles, refused, t3, list, check, after, words, unknown, inputs, private, focus, text, dispose, motion;
//   the agreement (preview/agree.mjs): the component beside the pinned pack's own drawing of each Actions frame,
//   the same words, boxes (to within half a pixel) and looks.
// It writes design/phone-ui/components/actions/review/: one JPEG per state and size, and check.json (the headers
// and their SHA-256, the source commit, what each capture drew and its SHA-256, and each probe and agreement
// check with what it saw). It exits non-zero when any check fails, and says which.
//   node design/tools/actions-check.mjs [--keep]
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone, not
// Safari, not a performance measure.
// The bundling, the headers and the policy reports are every component check's (lib/component-check.mjs).

import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/actions');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932], '320x568': [320, 568] };
// The moment of the voyage the captures hold, as the shell's do (2:10).
const AT = 130;

const DOCTOR = 'RESCUE:available,MOVE:available,REQUEST_HACK:available,REGISTER_SHOT:unavailable';
const tilesOf = (tiles, more = {}) => ({ part: 'tiles', sheet: 'Actions', tiles, ...more });
const checkOf = (who, footer, more = {}) => ({ part: 'check', sheet: 'Check and register', who, footer, ...more });
const afterOf = (sheet, stamp, headline, more = {}) => ({ part: 'after', sheet, stamp, headline, footer: 'Done', ...more });
/** What each state must draw, from its fixture (preview/states.mjs): the pack's words, written out here. */
const EXPECT = {
  'tiles-doctor': tilesOf(DOCTOR, { head: 'Your turn|Round 3', lines: '2 injections|Once a round|Once a match|From Round 4' }),
  'tiles-hacker': tilesOf('SCAN:available,SUBMIT_CODE:available,ACTIVATE_SHIP_HACK:unavailable,MOVE:available,REQUEST_HACK:available,REGISTER_SHOT:unavailable'),
  'tiles-undercover-other': tilesOf('PROTECT:unavailable,MOVE:available,REQUEST_HACK:unavailable,REGISTER_SHOT:unavailable',
    { head: 'Not your turn|Round 3', note: 'Move works on any turn, once a round. The rest wait for your turn.' }),
  'tiles-spent': tilesOf('RESCUE:registered,MOVE:available,REQUEST_HACK:unavailable,REGISTER_SHOT:unavailable', { lines: 'Eli · end of round|Once a round|Used|From Round 4', mark: 'REGISTERED' }),
  'tiles-doctor-other': tilesOf('RESCUE:unavailable,MOVE:available,REQUEST_HACK:unavailable,REGISTER_SHOT:unavailable', { head: 'Not your turn|Round 3' }),
  'tiles-t3': tilesOf('RESCUE:available,MOVE:available,REQUEST_HACK:unavailable,REGISTER_SHOT:unavailable', { lines: '2 injections|Once a round|Not available now|Not available now' }),
  'tiles-sending': tilesOf('RESCUE:sending,MOVE:available,REQUEST_HACK:available,REGISTER_SHOT:unavailable'),
  targeting: { part: null, sheet: null, target: 'Rescue|Choose a player', chip: 'Other rooms · 1', offered: 4 },
  'targeting-supply': { part: null, sheet: null, target: 'Supply|Choose the second player', chip: 'Other rooms · 1', offered: 4 },
  list: { part: 'list', sheet: 'Choose from a list', rows: 'Ava|Dev (you)|Gus|Ike|Eli', groups: 'Room A|Hospital' },
  'list-supply': { part: 'list', sheet: 'Choose from a list', rows: 'Ava|Dev (you)|Gus|Ike|Eli', picked: 'Ava' },
  check: checkOf('Rescue Eli|Player 5 · Hospital', 'Cancel|Register Rescue', { facts: 3 }),
  'check-ava': checkOf('Rescue Ava|Player 1 · Room A', 'Cancel|Register Rescue', { facts: 3 }),
  sending: checkOf('Rescue Eli|Player 5 · Hospital', 'Cancel|Registering…', { facts: 3 }),
  'check-blackout': checkOf('Request Blackout|Only you see this', 'Cancel|Request Blackout', { facts: 3 }),
  'check-clone': checkOf('Activate Clone|Only you see this', 'Cancel|Activate Clone', { facts: 3 }),
  'check-suppress': checkOf('Suppress navigation|Only you see this', 'Cancel|Suppress navigation', { facts: 3 }),
  'check-supply': checkOf('Supply Ava and Gus|Players 1 and 7', 'Cancel|Register Supply', { facts: 2, portraits: 2 }),
  'check-shiphack': checkOf('Hack Spaceship|Only you see this', 'Cancel|Hack Spaceship', { facts: 2 }),
  'check-error': checkOf('Rescue Eli|Player 5 · Hospital', 'Cancel|Register Rescue', { facts: 3, error: 'The server did not accept Rescue. Check the target, then register again.' }),
  'after-rescue': afterOf('Rescue', 'REGISTERED', 'Rescue of Eli registered.', { steps: 2 }),
  'after-rescue-ava': afterOf('Rescue', 'REGISTERED', 'Rescue of Ava registered.', { steps: 2 }),
  'after-protect': afterOf('Grant Protection', 'REGISTERED', 'Protection for Gus registered.', { steps: 3 }),
  'after-supply': afterOf('Supply', 'REGISTERED', 'Supply for Ava and Gus registered.', { steps: 2 }),
  'after-shot': afterOf('Shoot', 'REGISTERED', 'Shot at Gus registered.', { steps: 2 }),
  'after-blackout': afterOf('Blackout', 'REGISTERED', 'Blackout registered.', { steps: 3 }),
  'after-talk': afterOf('Private talk', 'ACCEPTED', 'Private talk with Ava accepted.', { steps: 3 }),
  'after-clone': afterOf('Clone', 'ACTIVE', 'Clone active.', { steps: 2 }),
  'after-suppress': afterOf('Suppress navigation', 'CAPTURED', 'Navigation suppressed.', { steps: 2, people: 3 }),
  'after-reload': afterOf('Rescue', 'REGISTERED', 'The server accepted your action.', { steps: 0 }),
  unknown: { part: 'unknown', sheet: 'Outcome unknown', notice: 'Rescue Eli was sent, but no answer came back.', footer: 'Retry the same|Check receipt' },
  'unknown-blackout': { part: 'unknown', sheet: 'Outcome unknown', notice: 'Request Blackout was sent, but no answer came back.', footer: 'Retry the same|Check receipt' },
  pass: { part: 'pass', sheet: 'Pass your turn?', sub: 'The turn goes to Eli · Player 5', note: 'Your move stays open on the other turns this round.', footer: 'Cancel|Pass' },
  stale: tilesOf(DOCTOR, { banner: 'Connection lost', refused: true }),
  concealed: { concealed: true },
  'small-tiles': tilesOf(DOCTOR, { perRow: 3 }),
  'large-tiles': tilesOf(DOCTOR, { perRow: 3 }),
  'largest-tiles': tilesOf('RESCUE:registered,MOVE:available,REQUEST_HACK:unavailable,REGISTER_SHOT:unavailable', { perRow: 1 }),
  'largest-check': checkOf('Rescue Eli|Player 5 · Hospital', 'Cancel|Register Rescue', { facts: 3 }),
  'largest-after': afterOf('Rescue', 'REGISTERED', 'Rescue of Eli registered.', { steps: 2 }),
};
/** The text-size states, each at its own size. */
const OWN_SIZE = { 'small-tiles': '320x568', 'large-tiles': '390x844', 'largest-tiles': '320x568', 'largest-check': '320x568', 'largest-after': '320x568' };
/** The private words that must never be in a concealed page. */
const PRIVATE = ['Rescue', 'Doctor', 'injections', 'Private talk', 'Your turn', 'Actions ·'];

/**
 * The preview bundled as the game bundles a component (lib/component-check.mjs). The agreement's pack finds the
 * rooms' pictures (design/board-v2/assets/) from its own place at run time, which no bundle carries; they are
 * copied to where it looks from the bundle, as the pack's own pages serve them (the library copies the crew's
 * portraits). In the game, the art bundles' CSS properties carry them.
 */
async function bundle() {
  const out = await bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'actions-check' });
  await cp(join(REPO, 'design/board-v2/assets'), join(out, 'board-v2/assets'), { recursive: true });
  return out;
}

// The source the captures show, read before anything is written: the components' files, the room pictures and
// the crew's, without the review folders checks write.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'design/room-drawing/assets', 'design/crew-drawing/assets', 'design/tools/actions-check.mjs']);
const out = await bundle();
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
const probes = {};
let agreement = null;
let failed = 0;
try {
  await mkdir(REVIEW, { recursive: true });
  // A clean review folder: captures of states that no longer exist do not linger.
  for (const name of await readdir(REVIEW)) if (/\.jpg$/.test(name)) await rm(join(REVIEW, name));
  for (const state of Object.keys(EXPECT)) {
    for (const sizeKey of OWN_SIZE[state] ? [OWN_SIZE[state]] : ['390x844', '430x932']) {
      const [width, height] = SIZES[sizeKey];
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&size=${sizeKey}&state=${state}&at=${AT}`, 'window.__actions !== undefined');
      await page.evaluate('window.__actions.ready');
      // The shell's sheet slides in (220 ms) and the stamp snaps in (120 ms): capture them where they rest.
      await sleep(700);
      const seen = await page.evaluate(`(() => {
        const q = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)], shown = n => !!n && n.getClientRects().length > 0;
        const t = n => (shown(n) ? n.textContent.replace(/\\s+/g, ' ').trim() : null);
        const root = q('.ms-actions'), room = q('.ms-room-scene');
        const tiles = all('.ms-actions .ms-k-tile');
        const top = n => Math.round(n.getBoundingClientRect().top);
        return { violations: window.__policy, part: root?.dataset.part ?? null, status: root?.dataset.status ?? null,
          sheet: t(q('.ms-ps-sheet-title h2')), sub: t(q('.ms-ps-sheet-title p')),
          footer: all('.ms-ps-sheet-foot .ms-k-btn').map(b => b.textContent.replace(/\\s+/g, ' ').trim()).join('|') || null,
          head: root?.querySelector('.ms-ac-head') ? [t(root.querySelector('.ms-ac-head h3')), t(root.querySelector('.ms-ac-head span'))].join('|') : null,
          tiles: tiles.map(n => n.dataset.value + ':' + n.dataset.state).join(',') || null,
          lines: tiles.map(n => t(n.querySelector('.ms-k-tile-note'))).join('|') || null,
          mark: t(q('.ms-actions .ms-k-tile-stamp:not([hidden])')),
          perRow: tiles.length ? tiles.filter(n => top(n) === top(tiles[0])).length : null,
          refused: tiles.length ? tiles.every(n => n.getAttribute('aria-disabled') === 'true') : null,
          note: t(q('.ms-actions .ms-k-group-note')),
          target: q('.ms-ps-target') ? [t(q('.ms-ps-target .ms-ps-text b')), t(q('.ms-ps-target .ms-ps-text span'))].join('|') : null,
          chip: t(q('.ms-ps-chip-btn')), offered: room ? room.querySelectorAll('.ms-rs-press[data-offered], .ms-rs-press:not([aria-disabled="true"])').length : 0,
          rows: all('.ms-ac-list .ms-k-row-title').map(n => n.textContent).join('|') || null,
          groups: all('.ms-ac-list .ms-k-group-label').map(n => n.textContent).join('|') || null,
          picked: all('.ms-ac-list .ms-k-row[data-picked] .ms-k-row-title').map(n => n.textContent).join('|') || null,
          who: q('.ms-k-who') ? [t(q('.ms-k-who-title')), t(q('.ms-k-who-sub'))].join('|') : null,
          portraits: all('.ms-k-who-lead .ms-k-pt').length, facts: all('.ms-k-facts li').length,
          error: t(q('.ms-actions .ms-k-error')),
          stamp: t(q('.ms-ac-after-head .ms-k-stamp')), headline: t(q('.ms-ac-after-head h3')),
          steps: all('.ms-pp-steps li').filter(shown).length, people: all('.ms-ac-after-people .ms-k-row').length,
          notice: t(q('.ms-pp-notice p')), banner: t(q('.ms-ps-banner b')),
          page: document.body.innerText, figures: room ? room.querySelectorAll('.ms-rs-fig svg').length : 0 };
      })()`);
      const art = page.requests().filter(url => /\.svg$/.test(url)).map(url => url.slice(origin.length + 1));
      // The browser asks for /favicon.ico by itself; the preview has none, as the live site has none.
      const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
      for (const v of seen.violations) v.kind = await classify(out, v);
      const file = join(REVIEW, `${sizeKey}-${state}.jpg`);
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 72, clip: { x: 0, y: 0, width, height, scale: 1 } });
      const bytes = Buffer.from(data, 'base64');
      await writeFile(file, bytes);
      const want = EXPECT[state];
      const leaked = PRIVATE.filter(w => seen.page.includes(w));
      const mismatched = want.concealed
        ? (seen.part !== null && seen.status !== 'concealed') || seen.sheet !== null || leaked.length || seen.figures !== 0 ? ['concealed'] : []
        : Object.entries(want).filter(([key, value]) => (key === 'offered' ? seen.offered < value : seen[key] !== value)).map(([key]) => key);
      const drawn = mismatched.length === 0 && (want.concealed || seen.figures > 0);
      const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && drawn;
      if (!ok) failed += 1;
      delete seen.page;
      results[`${sizeKey}/${state}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn, mismatched, ...seen, leaked, art, problems };
      await page.close();
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: part ${seen.part ?? '—'}, sheet ${seen.sheet ?? '—'}, crew ${seen.figures}${mismatched.length ? `, differs: ${mismatched.map(k => `${k} ${JSON.stringify(seen[k])} ≠ ${JSON.stringify(want[k])}`).join('; ')}` : ''}, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__actions !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__actions.agree' : 'window.__actions.probe');
    const violations = await page.evaluate('window.__policy');
    for (const v of violations) v.kind = await classify(out, v);
    const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
    const ok = outcome.ok && outcome.mode === mode && outcome.checks.length > 0 && problems.length === 0 && violations.every(v => v.kind !== 'unexpected');
    if (!ok) failed += 1;
    // The run's own verdict last, so the page's (outcome.ok) never stands in for it.
    const entry = { emulated: media ?? {}, ...outcome, ok, violations, problems };
    if (mode === 'agree') agreement = entry; else probes[mode] = entry;
    await page.close();
    for (const c of outcome.checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'} ${mode === 'agree' ? '' : `probe ${mode} · `}${c.id}${c.ok ? '' : ` ${JSON.stringify(c.detail).slice(0, 1500)}`}`);
    if (outcome.error) console.log(`FAIL ${mode}: ${outcome.error}`);
    if (problems.length) console.log(`FAIL ${mode}: problems ${JSON.stringify(problems).slice(0, 1500)}`);
  }
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}
const record = {
  tool: 'design/tools/actions-check.mjs',
  component: 'design/phone-ui/components/actions',
  parts: 'design/phone-ui/components/play-parts',
  sourceCommit, sourceClean,
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels; the preview bundled by Vite and served with the production headers below. Not a phone, not Safari, not a performance measure.',
  ...recordedHeaders(),
  voyageAt: AT,
  captures: results,
  probe: probes,
  agree: agreement,
};
await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
const passedCaptures = Object.values(results).filter(r => r.ok).length;
const probeChecks = Object.values(probes).flatMap(p => p.checks ?? []);
const agreeChecks = agreement?.checks ?? [];
console.log(`${passedCaptures} of ${Object.keys(results).length} captures passed; probe ${probeChecks.filter(c => c.ok).length} of ${probeChecks.length} checks; agreement ${agreeChecks.filter(c => c.ok).length} of ${agreeChecks.length}; wrote ${REVIEW.slice(REPO.length + 1)}/check.json`);
if (failed) process.exitCode = 1;
