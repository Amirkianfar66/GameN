// mothership:dev-only
//
// The Roles list's check (design/phone-ui/components/end-roles, on the kit): sheet 44's Roles list and "Return to
// lobby" (#222 item 8), in the phone shell's cover over the end scene (#271). It bundles the component's preview the
// way the game bundles the component (Vite: ordinary bundling, no copy), serves the bundle with the hosted game's
// production response headers (lib/component-check.mjs: the Content Security Policy of scripts/hosted-preview-policy.mjs
// and the six other headers), and captures every preview state at the two development phone sizes, 390 × 844 and
// 430 × 932, in full motion and with the device's Reduce motion emulated, and the results with a list at the Large
// and Largest text (150 % and 200 %), in desktop Chromium at 2× pixels. A capture passes with no policy violation
// but the known one, no failed or refused request and no page error, with what the state asks drawn (below), where
// the pack lays it at the Standard text and 13 px under the end scene's title block at any size.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion
//   emulated: words, teams, time, reduced, lifecycle, button, layout, larger, refusal;
//   the agreement (preview/agree.mjs): the component beside the pinned pack's own end screen for each result it
//   draws, at both sizes: the same words, boxes (to within half a pixel) and looks.
// It writes design/phone-ui/components/end-roles/review/: one JPEG per state, size and motion (and text size), and
// check.json (the headers and their SHA-256, the source commit, what each capture drew and its SHA-256, and each
// probe and agreement check with what it saw). It exits non-zero when any check fails, and says which.
//   node design/tools/end-roles-check.mjs [--keep]
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone, not Safari,
// not a screen reader, not a performance measure.

import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/end-roles');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** The pack's review frames' safe areas (design/phone-ui/prototype/app.mjs `safe=47,34`), as the preview gives the shell. */
const SAFE = { top: 47, bottom: 34 };
const { END_ROLES_VERSION } = await import(pathToFileURL(join(COMPONENT, 'end-roles.mjs')).href);

// The pack's reveal (screens-more.mjs end(), on fixtures.mjs's roster), written out here: what each state must draw.
const ROWS = [['1 · Ava', 'Doctor', 'Blue'], ['2 · Ben', 'Insider', 'Blue'], ['3 · Cleo', 'Blue Disabler', 'Blue'], ['4 · Dev (you)', 'Supplier', 'Blue'], ['5 · Eli', 'Engineer', 'Blue'],
  ['6 · Fay', 'Undercover', 'Red'], ['7 · Gus', 'Hacker', 'Red'], ['8 · Hana', 'Red Disabler', 'Red'], ['9 · Ike', 'Alien', 'Alien']];
const rowsOf = ({ you = true, teams = true } = {}) => ROWS.map(([name, role, team]) => `${you ? name : name.replace(' (you)', '')}=${role}${teams ? `:${team}` : ''}`).join('|');
const LISTED = { label: 'Roles', rows: rowsOf(), note: 'Original Code: Players 2, 5, 6, 9', button: 'Return to lobby', squares: 9 };
const NOTHING = { label: null, rows: null, note: null, button: null };
/** What each state must draw. */
const EXPECT = {
  blue: { ...LISTED, stamp: 'BLUE WINS' },
  red: { ...LISTED, stamp: 'RED WINS' },
  alien: { ...LISTED, stamp: 'BLUE WINS · ALIEN TOO' },
  none: { ...LISTED, stamp: 'NO WINNER' },
  aborted: { ...NOTHING, button: 'Return to lobby', stamp: 'NO WINNER' },
  before: { ...NOTHING },
  reduced: { ...LISTED, motion: 'reduced' },
  stale: { ...LISTED, status: 'stale', banner: 'Connection lost' },
  staleEarly: { ...NOTHING, status: 'stale', banner: 'Connection lost' },
  concealed: { ...NOTHING, status: 'concealed', concealed: true },
  noclock: { ...LISTED },
  display: { ...LISTED, rows: rowsOf({ you: false }), button: null },
  noteams: { ...LISTED, rows: rowsOf({ teams: false }), squares: 0 },
};
/** With the device's Reduce motion, the list does not wait for the words' moment: it is there at once, as the scene's still. */
const EXPECT_REDUCED = { ...EXPECT, before: { ...LISTED }, staleEarly: { ...LISTED, status: 'stale', banner: 'Connection lost' } };
/** The results with a list, at the Large and Largest text: the list keeps 13 px under the title block (the Lead's Q3). */
const TEXT_STATES = ['blue', 'alien', 'none'];
const TEXT_SIZES = [150, 200];
/** Words of the reveal that must never be in a concealed page. */
const PRIVATE = ['Roles', 'Ava', 'Dev', 'Doctor', 'Undercover', 'Alien', 'Original Code', 'Return to lobby'];

const SEEN = `(() => {
  const q = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)];
  const shown = n => !!n && n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden';
  const t = n => (shown(n) ? n.textContent.replace(/\\s+/g, ' ').trim() : null);
  const root = q('.ms-end-roles'), list = q('.ms-er-list'), actions = q('.ms-er-actions'), scene = q('.ms-end-scene');
  const phone = q('.pv-phone').getBoundingClientRect();
  const r2 = v => Math.round(v * 100) / 100;
  const box = n => { if (!shown(n)) return null; const b = n.getBoundingClientRect(); return { y: r2(b.top - phone.top), bottom: r2(b.bottom - phone.top), h: r2(b.height) }; };
  const rows = all('.ms-er-row').filter(shown);
  return { violations: window.__policy, status: root?.dataset.status ?? null, motion: root?.dataset.motion ?? null,
    label: t(list?.querySelector('.ms-er-label')),
    rows: rows.map(r => t(r.querySelector('.ms-er-name')) + '=' + t(r.querySelector('.ms-er-role')) + (r.querySelector('.ms-er-chip').dataset.team ? ':' + r.querySelector('.ms-er-chip').dataset.team : '')).join('|') || null,
    note: t(list?.querySelector('.ms-er-note')),
    button: t(actions?.querySelector('.ms-k-btn-label')),
    squares: rows.filter(r => getComputedStyle(r.querySelector('.ms-er-square')).display !== 'none').length,
    stamp: t(scene?.querySelector('.ms-es-title .ms-k-stamp')),
    banner: t(q('.ms-ps-banner b')),
    boxes: { list: box(list), actions: box(actions), title: box(scene?.querySelector('.ms-es-title')) },
    visibleRows: list && shown(list) ? rows.filter(r => { const a = r.getBoundingClientRect(), b = list.getBoundingClientRect(); return a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5; }).length : 0,
    page: document.body.innerText };
})()`;

// The source the captures show, read before anything is written: the components' files (the list, the scene, the
// shell and the kit), the pinned pack it is compared with, the crew's portraits and this tool.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'design/phone-ui/prototype', 'design/crew-drawing/assets', 'design/tools/end-roles-check.mjs']);
const out = await bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'end-roles-check' });
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
const probes = {};
let agreement = null;
let failed = 0;
const near = (a, b) => Math.abs(a - b) <= 0.5;
try {
  await mkdir(REVIEW, { recursive: true });
  // A clean review folder: captures of states that no longer exist do not linger.
  for (const name of await readdir(REVIEW)) if (/\.jpg$/.test(name)) await rm(join(REVIEW, name));
  const runs = [
    ...['full', 'reduced'].flatMap(motion => Object.keys(EXPECT).flatMap(state => Object.keys(SIZES).map(sizeKey => ({ state, sizeKey, motion, text: null })))),
    ...TEXT_SIZES.flatMap(text => TEXT_STATES.flatMap(state => Object.keys(SIZES).map(sizeKey => ({ state, sizeKey, motion: 'full', text })))),
  ];
  for (const { state, sizeKey, motion, text } of runs) {
    const [width, height] = SIZES[sizeKey];
    const page = await openPage(browser, { width, height, scale: 2 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (motion === 'reduced') await page.media({ 'prefers-reduced-motion': 'reduce' });
    await page.goto(`${origin}/index.html?single=1&size=${sizeKey}&state=${state}${text ? `&text=${text}` : ''}`, 'window.__endRoles !== undefined');
    await page.evaluate('window.__endRoles.ready');
    // The fade (80 ms) and any settling: capture at rest.
    await sleep(500);
    const seen = await page.evaluate(SEEN);
    const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
    for (const v of seen.violations) v.kind = await classify(out, v);
    const name = `${sizeKey}-${state}${text ? `-text${text}` : ''}${motion === 'reduced' ? '-reduced' : ''}`;
    const file = join(REVIEW, `${name}.jpg`);
    const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 76, clip: { x: 0, y: 0, width, height, scale: 1 } });
    const bytes = Buffer.from(data, 'base64');
    await writeFile(file, bytes);
    const want = (motion === 'reduced' ? EXPECT_REDUCED : EXPECT)[state];
    const leaked = want.concealed ? PRIVATE.filter(w => seen.page.includes(w)) : [];
    const mismatched = Object.entries(want).filter(([key]) => key !== 'concealed').filter(([key, value]) => seen[key] !== value).map(([key]) => key);
    // Where the pack lays it at the Standard text; at any size, 13 px under the title block.
    const { list, actions, title } = seen.boxes;
    const standard = text === null && list ? near(list.y, 0.58 * height) && near(list.bottom, height - SAFE.bottom - 82) : true;
    const button = actions ? near(actions.bottom, height - SAFE.bottom - 18) : true;
    const clear = list && title ? list.y >= title.bottom + 13 - 0.5 : true;
    const placed = standard && button && clear;
    const drawn = mismatched.length === 0 && leaked.length === 0 && placed;
    const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && drawn;
    if (!ok) failed += 1;
    delete seen.page;
    results[`${sizeKey}/${state}${text ? `/text${text}` : ''}/${motion}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn, placed, mismatched, leaked, ...seen, problems };
    await page.close();
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${seen.rows ? `${seen.rows.split('|').length} rows` : 'no rows'}, button ${seen.button ?? '—'}, list ${list ? `${list.y}–${list.bottom}` : '—'}, title ends ${title?.bottom ?? '—'}, ${seen.visibleRows} rows in view${mismatched.length ? `, differs: ${mismatched.map(k => `${k} ${JSON.stringify(seen[k])} ≠ ${JSON.stringify(want[k])}`).join('; ')}` : ''}${placed ? '' : ', NOT WHERE IT BELONGS'}${leaked.length ? `, leaked ${leaked.join(', ')}` : ''}, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}`);
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__endRoles !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__endRoles.agree' : 'window.__endRoles.probe');
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
  tool: 'design/tools/end-roles-check.mjs',
  component: 'design/phone-ui/components/end-roles',
  version: END_ROLES_VERSION,
  sourceCommit, sourceClean,
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels; the preview bundled by Vite and served with the production headers below. Not a phone, not Safari, not a screen reader, not a performance measure.',
  ...recordedHeaders(),
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
