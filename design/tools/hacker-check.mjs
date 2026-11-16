// mothership:dev-only
//
// The Hacker component's check (design/phone-ui/components/hacker, on the kit):
// Scan and the final Code, sheet 42. It bundles the component's preview the way the game bundles the component
// (Vite: ordinary bundling, no copy), serves the bundle with the hosted game's production response headers
// (scripts/prepare-hosted-preview.mjs: the Content Security Policy of scripts/hosted-preview-policy.mjs and the six
// other headers), and captures every preview state at the two development phone sizes, 390 × 844 and 430 × 932,
// and the text-size states at their own (320 × 568 and 390 × 844), in desktop Chromium at 2× pixels. The component
// sits in the phone shell's sheet, with the room scene in the shell's stage, as in the game.
// A capture passes with no policy violation but the known Zod probe, no failed or refused request and no page
// error, with what the state asks drawn (below), and the room's crew behind.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion
//   emulated: guess, picks, refused, results, words, footer, audience, leaks, inputs, private, focus, text,
//   dispose, motion;
//   the agreement (preview/agree.mjs): the component beside the pinned pack's own drawing of each of the eight
//   frames of scan() and code(), the same words, boxes (to within half a pixel) and looks.
// It writes design/phone-ui/components/hacker/review/: one JPEG per state and size, and check.json (the headers
// and their SHA-256, the source commit, what each capture drew and its SHA-256, and each probe and agreement
// check with what it saw). It exits non-zero when any check fails, and says which.
//   node design/tools/hacker-check.mjs [--keep]
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone, not
// Safari, not a performance measure.
// The bundling, the headers and the policy reports are every component check's (lib/component-check.mjs).

import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/hacker');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932], '320x568': [320, 568] };
// The moment of the voyage the captures hold, as the shell's do (2:10).
const AT = 130;

const GUESS = { part: 'scan-guess', sheet: 'Scan', sub: 'Only on this phone', who: 'Scan Gus|Guess a side. A wrong guess also blocks your next round.' };
const guessOf = (footer, guesses, more = {}) => ({ ...GUESS, footer, guesses, ...more });
const resultOf = (stamp, lines, row, more = {}) => ({ part: 'scan-result', sheet: 'Scan', sub: 'Only on this phone', footer: 'Done', stamp, lines, row, ...more });
const CODE = { part: 'final-code', sheet: 'Final Code', sub: 'Only on this phone', you: '4' };
const PICKED = '2:Pick 1,5:Pick 2,6:Pick 3,8:Pick 4';
const codeOf = (footer, picks, line, more = {}) => ({ ...CODE, footer, picks, line, ...more });
const PICK_LINE = 'Choose four players. Order doesn’t matter.', CONFIRM_LINE = 'One attempt for the whole match. It can’t be retried.';
const outcomeOf = (stamp, lines) => ({ part: 'code-result', sheet: 'Final Code', sub: 'Only on this phone', footer: 'Done', stamp, lines, row: null });
/** What each state must draw, from its fixture (preview/states.mjs): the pack's words, written out here. */
const EXPECT = {
  'scan-choose': { part: null, sheet: null, target: 'Scan|Choose a player in your room', offered: 4 },
  'scan-guess': guessOf('Cancel|Scan', 'Blue:true,Red:false,Alien:false'),
  'scan-matched': resultOf('MATCHED', 'Gus · Blue guess', 'In the Code|Yes'),
  'code-confirm': codeOf('Back|Submit Code', PICKED, CONFIRM_LINE),
  'code-correct': outcomeOf('CODE CORRECT', 'Hack Spaceship is unlocked|Using it is a separate action on your turn'),
  'scan-nomatch': resultOf('NO MATCH', 'Gus · Red guess', 'Scan|Blocked in Round 4'),
  'code-pick': codeOf('Next', PICKED, PICK_LINE),
  'code-wrong': outcomeOf('CODE WRONG', 'Your one attempt is used'),
  'scan-no-guess': guessOf('Cancel|Scan', 'Blue:false,Red:false,Alien:false', { off: 'Scan' }),
  'scan-sending': guessOf('Cancel|Scanning…', 'Blue:true,Red:false,Alien:false', { off: 'Cancel', refused: true }),
  'scan-error': guessOf('Cancel|Scan', 'Blue:true,Red:false,Alien:false', { error: 'The server did not accept the scan. Check the player, then scan again.' }),
  'scan-not-in-code': resultOf('MATCHED', 'Gus · Blue guess', 'In the Code|No'),
  'scan-nomatch-free': resultOf('NO MATCH', 'Gus · Alien guess', null),
  'code-two': codeOf('Next', '2:Pick 1,5:Pick 2', PICK_LINE, { off: 'Next' }),
  'code-sending': codeOf('Back|Submitting…', PICKED, CONFIRM_LINE, { off: 'Back' }),
  'code-error': codeOf('Back|Submit Code', PICKED, CONFIRM_LINE, { error: 'The server did not accept the Code. Check your four, then submit again.' }),
  'code-not-offered': codeOf('Next', '2:Pick 1,5:Pick 2', PICK_LINE, { off: 'Next', unoffered: '3,9' }),
  'code-eight': codeOf('Next', '2:Pick 1,5:Pick 2,6:Pick 3', PICK_LINE, { off: 'Next', empty: 1 }),
  stale: guessOf('Cancel|Scan', 'Blue:true,Red:false,Alien:false', { banner: 'Connection lost', refused: true }),
  concealed: { concealed: true },
  'small-code': codeOf('Next', PICKED, PICK_LINE, { perRow: 3 }),
  'large-guess': guessOf('Cancel|Scan', 'Blue:true,Red:false,Alien:false'),
  'largest-guess': guessOf('Cancel|Scan', 'Blue:true,Red:false,Alien:false'),
  'largest-result': resultOf('NO MATCH', 'Gus · Red guess', 'Scan|Blocked in Round 4'),
  'largest-code': codeOf('Next', PICKED, PICK_LINE, { perRow: 1 }),
  'largest-outcome': outcomeOf('CODE CORRECT', 'Hack Spaceship is unlocked|Using it is a separate action on your turn'),
};
/** The text-size states, each at its own size. */
const OWN_SIZE = { 'small-code': '320x568', 'large-guess': '390x844', 'largest-guess': '320x568', 'largest-result': '320x568', 'largest-code': '320x568', 'largest-outcome': '320x568' };
/** The Hacker's words that must never be in a concealed page. */
const PRIVATE = ['Scan', 'Gus', 'Guess', 'Blue', 'Final Code', 'Pick', 'MATCHED', 'Only on this phone'];

/**
 * The preview bundled as the game bundles a component (lib/component-check.mjs). The agreement's pack finds the
 * rooms' pictures (design/board-v2/assets/) from its own place at run time, which no bundle carries; they are
 * copied to where it looks from the bundle, as the pack's own pages serve them (the library copies the crew's
 * portraits). In the game, the art bundles' CSS properties carry them.
 */
async function bundle() {
  const out = await bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'hacker-check' });
  await cp(join(REPO, 'design/board-v2/assets'), join(out, 'board-v2/assets'), { recursive: true });
  return out;
}

// The source the captures show, read before anything is written: the components' files, the room pictures and
// the crew's, without the review folders checks write.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'design/room-drawing/assets', 'design/crew-drawing/assets', 'design/tools/hacker-check.mjs']);
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
      await page.goto(`${origin}/index.html?single=1&size=${sizeKey}&state=${state}&at=${AT}`, 'window.__hacker !== undefined');
      await page.evaluate('window.__hacker.ready');
      // The shell's sheet slides in (220 ms): capture it where it rests.
      await sleep(700);
      const seen = await page.evaluate(`(() => {
        const q = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)], shown = n => !!n && n.getClientRects().length > 0;
        const t = n => (shown(n) ? n.textContent.replace(/\\s+/g, ' ').trim() : null);
        const root = q('.ms-hacker'), room = q('.ms-room-scene');
        const foot = all('.ms-ps-sheet-foot .ms-k-btn');
        const cells = all('.ms-hacker .ms-k-cell:not([data-state="empty"])');
        const left = n => Math.round(n.getBoundingClientRect().left), top = n => Math.round(n.getBoundingClientRect().top);
        const guesses = all('.ms-hacker .ms-k-seg-btn');
        return { violations: window.__policy, part: root?.dataset.part ?? null, status: root?.dataset.status ?? null,
          sheet: t(q('.ms-ps-sheet-title h2')), sub: t(q('.ms-ps-sheet-title p')),
          footer: foot.map(b => b.textContent.replace(/\\s+/g, ' ').trim()).join('|') || null,
          off: foot.filter(b => b.getAttribute('aria-disabled') === 'true' && b.getAttribute('aria-busy') !== 'true').map(b => b.textContent.replace(/\\s+/g, ' ').trim()).join('|') || null,
          target: q('.ms-ps-target') ? [t(q('.ms-ps-target .ms-ps-text b')), t(q('.ms-ps-target .ms-ps-text span'))].join('|') : null,
          offered: room ? room.querySelectorAll('.ms-rs-press[data-offered], .ms-rs-press:not([aria-disabled="true"])').length : 0,
          who: q('.ms-hacker .ms-k-who') ? [t(q('.ms-k-who-title')), t(q('.ms-k-who-sub'))].join('|') : null,
          guesses: guesses.map(b => t(b) + ':' + b.getAttribute('aria-checked')).join(',') || null,
          refused: guesses.length || cells.length ? [...guesses, ...cells].every(n => n.getAttribute('aria-disabled') === 'true') : null,
          picks: cells.filter(c => c.dataset.state === 'selected').map(c => c.dataset.value + ':' + t(c.querySelector('.ms-k-cell-note'))).join(',') || null,
          you: all('.ms-hacker .ms-k-you').map(y => y.closest('.ms-k-cell').dataset.value).join(',') || null,
          unoffered: cells.filter(c => c.dataset.state === 'ineligible').map(c => c.dataset.value).join(',') || null,
          empty: all('.ms-hacker .ms-k-cell[data-state="empty"]').length || null,
          perRow: cells.length ? cells.filter(c => top(c) === top(cells[0])).length : null,
          line: t(q('.ms-hacker .ms-k-group-note')),
          error: t(q('.ms-hacker .ms-k-error')),
          stamp: t(q('.ms-hacker .ms-k-notice .ms-k-stamp')),
          lines: all('.ms-hacker .ms-k-notice > p').map(p => t(p)).join('|') || null,
          row: q('.ms-hacker .ms-k-notice .ms-k-row') ? [t(q('.ms-hacker .ms-k-row-title')), t(q('.ms-hacker .ms-k-row-value'))].join('|') : null,
          banner: t(q('.ms-ps-banner b')),
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
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__hacker !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__hacker.agree' : 'window.__hacker.probe');
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
  tool: 'design/tools/hacker-check.mjs',
  component: 'design/phone-ui/components/hacker',
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
