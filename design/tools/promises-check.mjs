// mothership:dev-only
//
// Promises' check (design/phone-ui/components/promises). It bundles the component's preview the way the game bundles
// the components (Vite: ordinary bundling, no copy), serves the bundle with the hosted game's production response
// headers (design/tools/lib/component-check.mjs), and captures every state of sheets 33 and 33.1 (the list in a talk,
// an offer waiting, the six kinds, the terms, an incoming offer, the four results) and the ones around them (Jail
// Vote's player, an undrawn state the Lead approved; the offer in flight; reconnecting; the Largest text; a refused
// Offer and a refused Accept with Frontend's words, 0.1.1's R2), in the phone shell's sheet over Room A with Promises
// open in the top bar, at the two development phone sizes, 390 × 844 and 430 × 932, and the two refusals again at
// 320 × 568 with the Largest text, in desktop Chromium at 2× pixels.
// A capture passes with no policy violation, no failed or refused request and no page error, with the sheet drawn as
// the state asks.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion
//   emulated: reports, the footer's local actions and commands, the offer refused, the lists, Frontend's words as
//   given, Jail Vote's players, the pair's privacy, reconnecting, focus, the layout at both sizes and the Largest
//   text, dispose, motion;
//   the agreement (preview/agree.mjs): the sheet beside the frozen pack's promises screen in each of its states, the
//   same words, states, look and boxes to within half a pixel.
// Every check must pass. It writes design/phone-ui/components/promises/review/: one JPEG per state and size, and
// check.json (the headers and their SHA-256, the source commit, what each capture drew and its SHA-256, and each
// probe and agreement check with what it saw).
//   node design/tools/promises-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/promises');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932], '320x568': [320, 568] };
/** Each state at the two development sizes (preview.mjs PREVIEW_STATES); the refusals at the Largest text on the smallest phone. */
const STATES = ['list', 'offered', 'kinds', 'target', 'confirm', 'offering', 'incoming', 'pending', 'fulfilled', 'not-fulfilled', 'condition', 'stale', 'largest',
  'refused', 'answer-refused', 'refused-largest', 'answer-refused-largest'];
const sizesOf = state => (state.endsWith('-largest') ? ['320x568'] : ['390x844', '430x932']);
const REFUSED = 'That choice is no longer offered.', SERVER_REFUSED = 'The server did not allow that command.';
const KINDS = 'Captain Support|Officer Selection|Jail Vote|No Jail Vote|Meet in Room A|Meet in Room B';
const NOT_PROOF = '“Not fulfilled” is a fact about ballots or rooms. It is not proof of lying.';
const RECONNECTING = 'Controls return when the match is current';

/** The preview bundled as the game bundles the component (component-check.mjs). */
const bundle = () => bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'promises-check' });

// The source the captures show, read before anything is written: the components' files and the room pictures, without the review folders.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'design/room-drawing/assets']);
const out = await bundle();
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
const probes = {};
let agreement = null;
let failed = 0;
/** What every state shows, and what each one adds, from the sheet's own DOM. */
const common = s => s.cut.length === 0 && s.name === 'group:Promises' && s.detent === 'large' && s.promisesOpen;
const talkList = s => common(s) && s.title === 'Promises' && !s.back && s.foot === '' && s.pair === 'Ava + Dev';
const card = (s, title, name) => common(s) && s.title === title && s.cardName === name && s.paper;
/** A refused command (0.1.1): Frontend's words in the kit's alert, the last thing in the body, starting in view above the footer. */
const refusal = (s, words) => s.error === words && s.errorRole === 'alert' && s.errorLast && s.errorStarts;
const result = (s, status, sub, why, labels) => common(s) && s.title === 'Promises' && s.pair === null && s.badges === status && s.rows.includes(sub) && s.notes.includes(why) && s.labels === labels && s.notes.endsWith(NOT_PROOF);
const EXPECT = {
  // In a talk, Offer a Promise and the offer to answer are cells (the owner, 19 November 2026: the Actions grid); the
  // offer to answer carries the amber dot. The quota stays a line.
  list: s => talkList(s) && s.labels === 'With Ava · talking now' && s.rows === 'Your quota' && s.tiles === 'Offer a Promise|Ava offered you one'
    && s.tileNotes === 'Six kinds · exact terms|Captain Support' && s.waiting === 'Ava offered you one' && s.value === 'Given 0/1 · Received 0/1' && s.root === 16,
  offered: s => talkList(s) && s.labels === 'Waiting for Ava|With Ava · talking now' && s.badges === 'Offered' && s.rows.includes('Meet in Room A|Offered to Ava · not counted yet'),
  kinds: s => common(s) && s.title === 'Offer to Ava' && s.back && s.foot === 'Next' && s.tiles === KINDS && s.selected === 'Meet in Room A' && s.across === 3,
  // The chosen seat keeps its "·" on its line: the words carry a no-break space (0.1.1), compared here as a space.
  target: s => common(s) && s.title === 'Who will you vote to jail?' && s.back && s.foot === 'Next' && s.targets === 8 && s.chosen === '2 · Ben' && s.seatJoined,
  confirm: s => card(s, 'Check the terms', 'Meet in Room A') && s.back && s.foot === 'Back|Offer' && s.terms === 'Dev will be in Room A when Round 3’s voting begins.' && s.facts === 'info:Uses your one given Promise only if Ava accepts|lock:Only you and Ava see it' && !s.offerBusy,
  offering: s => card(s, 'Check the terms', 'Meet in Room A') && s.foot === 'Back|Offer' && s.offerBusy,
  incoming: s => card(s, 'Offer from Ava', 'Captain Support') && !s.back && s.foot === 'Decline|Accept' && s.portrait && s.facts.split('|').length === 3 && s.root === 16,
  pending: s => result(s, 'Pending', 'From Ava · next Captain election', 'Checked when that election is held.', 'Received|Given'),
  fulfilled: s => result(s, 'Fulfilled', 'To Ava · Round 3 voting', 'Dev was in Room A when Round 3’s voting began.', 'Received|Given'),
  'not-fulfilled': s => result(s, 'Not fulfilled', 'From Ava · Round 4 election', 'In the runoff, a ballot in which Dev was a candidate, Ava voted for Ben.', 'Received|Given'),
  condition: s => result(s, 'Condition not met', 'From Ava · Round 4 election', 'Dev was a candidate in no ballot of that election.', 'Received|Given'),
  // Reconnecting: the terms' Back still works; Offer waits with the banner's words.
  stale: s => card(s, 'Check the terms', 'Meet in Room A') && s.banner && s.foot === 'Back|Offer' && s.offerWaits === RECONNECTING && !s.backRefused,
  largest: s => card(s, 'Offer from Ava', 'Captain Support') && s.foot === 'Decline|Accept' && s.root === 32,
  // A refused Offer keeps the player's terms and Back; a refused Accept keeps the offer. Whole in view at both sizes.
  refused: s => card(s, 'Check the terms', 'Meet in Room A') && s.back && s.foot === 'Back|Offer' && refusal(s, REFUSED) && s.errorWhole && s.root === 16,
  'answer-refused': s => card(s, 'Offer from Ava', 'Captain Support') && !s.back && s.foot === 'Decline|Accept' && refusal(s, SERVER_REFUSED) && s.errorWhole && s.root === 16,
  // At the Largest text on the smallest phone the note starts in view; whether its end is too is recorded (errorWhole):
  // the owner accepted the note as drawn there (18 November), and the shell's 0.3.3 gives the sheet's middle more room.
  'refused-largest': s => card(s, 'Check the terms', 'Meet in Room A') && s.foot === 'Back|Offer' && refusal(s, REFUSED) && s.root === 32,
  'answer-refused-largest': s => card(s, 'Offer from Ava', 'Captain Support') && s.foot === 'Decline|Accept' && refusal(s, SERVER_REFUSED) && s.root === 32,
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const state of STATES) {
    for (const sizeKey of sizesOf(state)) {
      const [width, height] = SIZES[sizeKey];
      const query = `size=${sizeKey}&state=${state}`;
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__promises !== undefined');
      await page.evaluate('window.__promises.ready');
      await sleep(500);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-promises'), q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
        // Words compared with a no-break space as a space (0.1.1's joins); the join itself is checked on its own.
        const plain = t => (t ?? '').replace(/\u00a0/g, ' ');
        const shell = document.querySelector('.ms-phone-shell'), sheet = shell.querySelector('.ms-ps-sheet');
        const shown = n => !!n && !n.hidden && n.getClientRects().length > 0 && !n.closest('[hidden]');
        const describedBy = n => { const id = n?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
        const foot = [...sheet.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn')];
        const tiles = qa('.ms-k-tile').filter(shown);
        return { violations: window.__policy, root: parseFloat(getComputedStyle(document.documentElement).fontSize),
          name: [root.getAttribute('role'), root.getAttribute('aria-label')].join(':'), detent: sheet.dataset.detent, back: !!sheet.querySelector('[data-intent="sheet-back"]'),
          title: sheet.querySelector('.ms-ps-sheet-title h2').textContent, pair: shell.querySelector('.ms-ps-pair') ? shell.querySelector('.ms-ps-name').textContent : null,
          promisesOpen: shell.querySelector('[data-intent="promises"]')?.getAttribute('aria-expanded') === 'true',
          labels: plain(qa('.ms-k-group-label').filter(shown).map(n => n.textContent).join('|')),
          rows: plain(qa('.ms-k-row-title, .ms-k-row-sub').filter(shown).map(n => n.textContent).join('|')), value: plain(qa('.ms-k-row-value').filter(shown).map(n => n.textContent).join('|')),
          badges: qa('.ms-k-row .ms-k-pill').filter(shown).map(n => n.textContent).join('|'), notes: qa('.ms-k-group-note').filter(shown).map(n => n.textContent).join('|'),
          tiles: tiles.map(t => t.querySelector('.ms-k-tile-name').textContent).join('|'), selected: tiles.filter(t => t.dataset.state === 'selected').map(t => t.querySelector('.ms-k-tile-name').textContent).join('|'),
          tileNotes: tiles.map(t => { const n = t.querySelector('.ms-k-tile-note'); return shown(n) ? n.textContent : ''; }).join('|'),
          waiting: tiles.filter(t => t.querySelector('.ms-k-tile-icon')?.hasAttribute('data-waiting')).map(t => t.querySelector('.ms-k-tile-name').textContent).join('|'),
          across: new Set(tiles.map(t => Math.round(t.getBoundingClientRect().top))).size,
          targets: qa('[data-intent="target"]').length, chosen: plain(qa('[data-intent="target"][aria-pressed="true"]').map(n => n.querySelector('.ms-k-row-title').textContent).join('|')),
          seatJoined: qa('[data-intent="target"] .ms-k-row-title').length > 0 && qa('[data-intent="target"] .ms-k-row-title').every(n => /^[0-9]+\u00a0· /.test(n.textContent)),
          paper: shown(q('.ms-k-comic')), cardName: q('.ms-pr-card-name')?.textContent ?? null, terms: q('.ms-pr-card-terms')?.textContent ?? null, portrait: shown(q('.ms-k-comic .ms-k-pt')),
          facts: qa('.ms-k-fact').map(li => [li.dataset.icon, li.textContent].join(':')).join('|'),
          foot: foot.map(b => b.textContent.trim()).join('|'), offerBusy: foot[1]?.getAttribute('aria-busy') === 'true',
          offerWaits: foot[1]?.getAttribute('aria-disabled') === 'true' ? describedBy(foot[1]) : null, backRefused: foot[0]?.getAttribute('aria-disabled') === 'true',
          banner: shown(shell.querySelector('.ms-ps-banner')),
          ...(() => {
            const note = q('.ms-pr-error'), body = sheet.querySelector('.ms-ps-sheet-body').getBoundingClientRect(), footTop = sheet.querySelector('.ms-ps-sheet-foot')?.getBoundingClientRect().top ?? body.bottom;
            if (!note) return { error: null };
            const r = note.getBoundingClientRect(), w = note.querySelector('.ms-k-error-text').getBoundingClientRect(), bottom = Math.min(body.bottom, footTop);
            // The note's box, and its words alone: both whole when the box is; the words can be whole while the box's edge is not.
            return { error: plain(note.textContent), errorRole: note.getAttribute('role'), errorLast: note === root.lastElementChild,
              errorStarts: shown(note) && r.top >= body.top - 0.5 && r.top < bottom, errorWhole: shown(note) && r.top >= body.top - 0.5 && r.bottom <= bottom + 0.5,
              errorWordsWhole: shown(note) && w.top >= body.top - 0.5 && w.bottom <= bottom + 0.5,
              errorBox: { top: Math.round(r.top), bottom: Math.round(r.bottom), wordsBottom: Math.round(w.bottom), bodyTop: Math.round(body.top), bodyBottom: Math.round(bottom) } };
          })(),
          cut: qa('.ms-k-row-title, .ms-k-row-sub, .ms-k-row-value, .ms-k-pill, .ms-k-group-label, .ms-k-group-note, .ms-pr-card-name, .ms-pr-card-terms, .ms-k-fact-text, .ms-k-tile-name, .ms-k-tile-note, .ms-k-error-text').filter(shown).filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent) };
      })()`);
      const requests = page.requests().filter(url => /\.svg$/.test(url)).map(url => url.slice(origin.length + 1));
      // The browser asks for /favicon.ico by itself; the preview has none, as the live site has none.
      const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
      for (const v of seen.violations) v.kind = await classify(out, v);
      const file = join(REVIEW, `${sizeKey}-${state}.jpg`);
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height, scale: 1 } });
      const bytes = Buffer.from(data, 'base64');
      await writeFile(file, bytes);
      const asked = EXPECT[state](seen);
      const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && asked;
      if (!ok) failed += 1;
      results[`${sizeKey}/${state}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn: asked, ...seen, requests, problems };
      await page.close();
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: "${seen.title}" ${seen.foot || 'no footer'}, root ${seen.root}px, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${asked ? '' : `, NOT AS EXPECTED ${JSON.stringify(seen).slice(0, 900)}`}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__promises !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__promises.agree' : 'window.__promises.probe');
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
  }
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}
const record = {
  tool: 'design/tools/promises-check.mjs',
  component: 'design/phone-ui/components/promises',
  sourceCommit, sourceClean,
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels; the preview bundled by Vite and served with the production headers below. Not a phone, not Safari, not a performance measure.',
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
