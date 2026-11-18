// mothership:dev-only
//
// The phone shell's check (design/phone-ui/components/phone-shell). It bundles the component's preview
// the way the game bundles the component (Vite: ordinary bundling, no copy), serves the bundle with the
// hosted game's production response headers (scripts/prepare-hosted-preview.mjs: the Content Security
// Policy of scripts/hosted-preview-policy.mjs and the six other headers), and captures every preview
// state at the two development phone sizes, 390 × 844 and 430 × 932, and the Largest text (200%) at
// 320 × 568, in desktop Chromium at 2× pixels. The room scene draws the stage, as in the game.
// The phase bars' states (0.2.10) draw what ../phone-ui/components/phone-shell/phase-bars.mjs returns.
// A capture passes with no policy violation, no failed or refused request and no page error, with the
// shell's bars drawn as the state asks and, where the stage shows a room, the room's crew drawn.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce
//   motion emulated: focus, refused taps, reconnecting, privacy, the clock, layout, the toast, motion,
//   the large-content view and dispose;
//   the agreement (preview/agree.mjs): the shell beside the pinned pack's topBar() and tabs(), the same
//   words, states and boxes to within half a pixel.
// The bundling, the headers and the policy reports are every component check's (lib/component-check.mjs).
// Every check must pass. It writes design/phone-ui/components/phone-shell/review/: one JPEG per state
// and size, and check.json (the headers and their SHA-256, the source commit, what each capture drew and
// its SHA-256, and each probe and agreement check with what it saw).
//   node design/tools/phone-shell-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/phone-shell');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932], '320x568': [320, 568] };
/** Each state at the two development sizes; the Largest text at 320 × 568 (preview.mjs PREVIEW_STATES). */
const STATES = { turn: 2, own: 2, urgent: 2, vote: 2, voted: 2, result: 2, dark: 2, target: 2, pass: 2, actions: 2, card: 2, 'card-icon': 2, talk: 2, stale: 2, out: 2, concealed: 2, film: 2, poster: 2, large: ['320x568'], 'target-stale': 2, 'target-large': ['390x844', '430x932'],
  // 0.2.10, the phase bars: each row of the words table (phase-bars.mjs), and one at the Largest text.
  before: 2, 'before-start': 2, block: 2, appointment: 2, appoint: 2, lit: 2, 'lit-next': 2, synchronized: 2, 'course-own': 2, moved: 2, loading: 2, closed: 2, 'phase-large': ['320x568'] };
/** The states whose stage holds no room (a film, a poster, the talk's capsule) or whose room shows no one. */
const NO_CREW = ['dark', 'talk', 'concealed', 'film', 'poster', 'synchronized', 'moved', 'loading'];
// The moment of the voyage the captures hold, as the pack's sheet 55 does (2:10).
const AT = 130;

// The source the captures show, read before anything is written: the components' files and the room
// pictures, without the components' review folders, which checks write.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'design/room-drawing/assets']);
// The agreement draws the pinned pack beside the shell; the bundle carries the crew's portraits where the
// pack's art.mjs looks for them. The shell's own portraits come through the crew bundle's CSS properties.
const out = await bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'phone-shell-check' });
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
const probes = {};
/** The lit Blackout a second apart (0.2.10): whether the bar and its right side kept their boxes, per size. */
const steady = {};
let agreement = null;
let failed = 0;
/** What a state must show, from the shell's own DOM (and the room scene's crew where a room is drawn). */
const EXPECT = {
  // 0.3.0: Card is the last tab and draws this viewer's own portrait, its ring the tab's colour, not amber.
  turn: s => s.kind === 'turn' && s.name === 'Fay' && s.tabs === 4 && s.hero === 'pass' && s.heroOff && s.order.join() === 'switch,actions,hero,panels,card' && s.card.picture && s.card.drawn && !s.card.amber,
  own: s => s.name === 'Your turn' && s.hero === 'pass' && !s.heroOff && s.promises === 'Promises, 1 new' && s.timer === '0:42',
  urgent: s => s.urgent && s.timer === '0:08',
  vote: s => s.kind === 'phase' && s.hero === 'vote' && !s.heroOff,
  voted: s => s.hero === 'voted',
  result: s => s.ring && s.promises === null && s.menu && s.heroOff && s.cover === 1,
  // 0.2.10: the pack's words and time for the dark (sheets 07 and 30), amber in its last 10 s as everyone's bar is.
  dark: s => s.tone === 'dark' && s.figures === 0 && s.name === 'Blackout' && s.sub === 'Dark · positions fixed' && s.timer === '0:08' && s.urgent,
  target: s => s.target === 'Rescue' && s.chip === 'Other rooms · 1',
  pass: s => s.sheet === 'Pass your turn?' && s.sheetActions === 2,
  actions: s => s.sheet === 'Actions' && s.open === 'actions',
  // 0.3.0: open, the portrait's ring is amber, and the tab is still named by its word.
  card: s => s.sheet === 'Your role' && s.open === 'card' && s.head === 'Hide card' && s.card.picture && s.card.drawn && s.card.amber && s.card.words === 'Card' && s.card.name === null,
  // 0.3.0: with no character, the pack's card icon, in the last place.
  'card-icon': s => s.order.join() === 'switch,actions,hero,panels,card' && !s.card.picture && s.card.icon === 'card' && s.card.words === 'Card',
  talk: s => s.kind === 'pair' && s.talk === 2 && s.tabs === 0,
  stale: s => s.banner === 'Connection lost' && s.status === 'stale' && s.name === 'Reconnecting…' && s.sub === 'Showing Round 3 as last seen' && s.timer === null,
  // An eliminated player's phone (0.2.8): the banner's words without Retry, the phone live, Actions not offered.
  out: s => s.banner === 'You’re out' && s.bannerKind === 'out' && s.bannerButtons === 0 && s.status === 'live' && s.tabs === 4 && s.heroOff,
  concealed: s => s.buttons === 0 && s.name === null && s.figures === 0,
  // Edge to edge, and the banner at the bar's place: the top safe area, the bar's 52 px at the 16 px root (kit.css
  // .ph --bar-h), and 8 px, as the pack's banner on its bar-less film.
  film: s => s.kind === 'none' && s.layout.bars.top === 0 && s.layout.bars.bottom === 0 && s.layout.stage.height === s.layout.size.height && s.tabs === 0
    && s.banner === 'Connection lost' && s.bannerTop === s.layout.safe.top + 52 + 8,
  poster: s => s.kind === 'phase' && s.name === 'Setting course' && s.sub === 'The offices are setting it' && s.layout.bars.top === 0 && s.layout.bars.bottom === 0 && s.layout.stage.height === s.layout.size.height && s.tabs === 0,
  // 0.3.0: at 200 % on the small phone the portrait keeps its 26 px box, and the Card label the other labels' level.
  large: s => s.name === 'Your turn' && s.tabs === 4 && s.card.picture && s.card.box.join() === '26,26' && s.card.level,
  // 0.2.9: the target bar 8 px under the banner while reconnecting, so its Cancel is in reach; the banner keeps its place.
  'target-stale': s => s.banner === 'Connection lost' && s.target === 'Rescue' && s.over.targetTop >= s.over.bannerBottom + 8 && s.over.cancelReach,
  // 0.2.9: at 200 % on the two phones, Cancel under the words, the bar inside the phone, and the chip's label whole.
  'target-large': s => s.target === 'Move within Room A' && s.over.cancelTop >= s.over.wordsBottom && s.over.targetRight <= s.layout.size.width && s.over.chipWhole && s.over.cancelReach,
  // 0.2.10, the phase bars: the pack's words for each row of the table, the clock amber only where someone may act,
  // Promises and ⋮ where the pack's bar has them.
  before: s => s.kind === 'phase' && s.name === 'Before turns' && s.sub === 'Officer block · Blackhole' && s.timer === '0:12' && !s.urgent && s.round === 'R3' && s.promises === 'Promises' && s.menu,
  'before-start': s => s.name === 'Before turns' && s.sub === 'Turns start at 0:00' && s.timer === '0:09' && s.urgent,
  block: s => s.name === 'Block a move' && s.sub === 'Before turns · Officer' && s.sheet === 'Block movement' && s.sheetActions === 2,
  appointment: s => s.name === 'New Officer' && s.sub === 'Ben chooses' && s.timer === '0:09' && !s.urgent && s.round === 'R2',
  appoint: s => s.name === 'Appoint Officer' && s.sub === 'Random if time runs out' && s.sheet === 'Choose your Officer',
  lit: s => s.name === 'Blackout' && s.sub === 'Lights out in 0:03' && s.tone === null && s.timer === '0:13' && !s.urgent,
  'lit-next': s => s.name === 'Blackout' && s.sub === 'Lights out in 0:02' && s.tone === null && s.timer === '0:12' && !s.urgent,
  synchronized: s => s.name === 'Ship synchronized' && s.sub === null && s.ring && !s.urgent && s.promises === null && s.menu && s.round === 'R4' && s.tabs === 0,
  'course-own': s => s.name === 'Setting course' && s.sub === 'Captain · private' && s.timer === '0:09' && s.urgent && s.sheet === 'Navigation',
  moved: s => s.name === 'The ship moved' && s.sub === 'Round 3 complete' && s.timer === null && s.round === 'R3' && s.tabs === 0,
  loading: s => s.name === 'Loading the ship' && s.sub === 'Room 3 of 5' && s.timer === null && s.round === null && s.promises === null && !s.menu && s.tabs === 0,
  closed: s => s.toast === 'That phase closed · choices cleared' && s.name === 'Your turn' && s.timer === '0:00',
  // At 200 % on the small phone: the title whole on two lines, the line under it for screen readers only, the bar inside the phone.
  'phase-large': s => s.name === 'Appoint Officer' && s.bar.nameLines === 2 && s.bar.nameWhole && s.bar.right <= s.layout.size.width && s.menu,
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const [state, where] of Object.entries(STATES)) {
    for (const sizeKey of where === 2 ? ['390x844', '430x932'] : where) {
      const [width, height] = SIZES[sizeKey];
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&size=${sizeKey}&state=${state}&at=${AT}`, 'window.__phoneShell !== undefined');
      await page.evaluate('window.__phoneShell.ready');
      await sleep(500);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-phone-shell'), q = s => root.querySelector(s), t = s => q(s)?.textContent ?? null;
        const room = document.querySelector('.ms-room-scene');
        return { violations: window.__policy, status: root.dataset.status, kind: q('.ms-ps-tb')?.dataset.kind ?? null, tone: q('.ms-ps-tb')?.dataset.tone ?? null,
          name: t('.ms-ps-name'), sub: t('.ms-ps-sub'), round: t('.ms-ps-round'), timer: q('.ms-ps-timer')?.lastChild?.textContent ?? null,
          urgent: !!q('.ms-ps-timer[data-urgent]'), ring: !!q('.ms-ps-ring'), promises: q('.ms-ps-promises')?.getAttribute('aria-label') ?? null, menu: !!q('.ms-ps-menu'),
          tabs: root.querySelectorAll('.ms-ps-tab[data-intent]').length, open: q('.ms-ps-tab[aria-expanded="true"]')?.dataset.value ?? null,
          // 0.3.0: the tabs' order, and the Card tab: its portrait (drawn, its box, amber or not) or its icon, its word and its name.
          order: [...root.querySelectorAll('.ms-ps-tabs > *')].map(n => n.dataset.value ?? 'hero'),
          card: (() => { const tab = q('.ms-ps-tab[data-value="card"]'); if (!tab) return null; const pt = tab.querySelector('.ms-ps-tab-pt'), label = tab.querySelector('.ms-ps-tab-label'), other = q('.ms-ps-tab[data-value="panels"] .ms-ps-tab-label');
            const probe = document.createElement('i'); probe.style.color = 'var(--ms-ps-accent)'; root.append(probe); const accent = getComputedStyle(probe).color; probe.remove();
            return { picture: !!pt, drawn: pt ? getComputedStyle(pt).backgroundImage !== 'none' : null, box: pt ? [pt.getBoundingClientRect().width, pt.getBoundingClientRect().height] : null, amber: pt ? getComputedStyle(pt).color === accent : null,
              icon: tab.querySelector('.ms-ps-tab-icon').dataset.icon.split(':')[0], words: label.textContent, name: tab.getAttribute('aria-label'), level: other ? Math.abs(label.getBoundingClientRect().top - other.getBoundingClientRect().top) < 0.5 : null }; })(),
          hero: q('.ms-ps-hero')?.dataset.mode ?? null, heroOff: !!q('.ms-ps-hero[data-off]'), talk: root.querySelectorAll('.ms-ps-talk button').length,
          target: t('.ms-ps-target b'), chip: t('.ms-ps-chip .ms-k-btn-label'), banner: t('.ms-ps-banner b'), bannerKind: q('.ms-ps-banner')?.dataset.kind ?? null, toast: t('.ms-ps-toast'),
          // 0.2.10: where the bar and each part of its right side lie, and how the title sits: its lines, and whether all of it shows.
          bar: (() => { const base = root.getBoundingClientRect(), box = s => { const n = q(s); if (!n || n.getClientRects().length === 0) return null; const r = n.getBoundingClientRect(); return [r.left - base.left, r.top - base.top, r.width, r.height].map(v => Math.round(v * 100) / 100); };
            const name = q('.ms-ps-name'), lineHeight = name ? parseFloat(getComputedStyle(name).lineHeight) : NaN;
            return { box: box('.ms-ps-tb'), promises: box('.ms-ps-promises'), round: box('.ms-ps-round'), timer: box('.ms-ps-timer'), menu: box('.ms-ps-menu'), right: q('.ms-ps-tb') ? Math.round(q('.ms-ps-tb').getBoundingClientRect().right - base.left) : null,
              nameLines: name && lineHeight ? Math.round(name.getBoundingClientRect().height / lineHeight) : null, nameWhole: name ? name.scrollWidth <= name.clientWidth + 1 && name.scrollHeight <= name.clientHeight + 1 : null }; })(),
          bannerButtons: q('.ms-ps-banner') ? q('.ms-ps-banner').querySelectorAll('button').length : null, sheet: t('.ms-ps-sheet h2'),
          sheetActions: root.querySelectorAll('.ms-ps-sheet-foot button').length, head: q('.ms-ps-sheet-head [data-intent="sheet-head"]')?.getAttribute('aria-label') ?? null, buttons: root.querySelectorAll('.ms-ps-tb button, .ms-ps-tabs button, .ms-ps-talk button, .ms-ps-over button, .ms-ps-sheet button').length,
          figures: room ? room.querySelectorAll('.ms-rs-fig svg').length : 0, cover: q('.ms-ps-cover')?.children.length ?? 0,
          bannerTop: q('.ms-ps-banner') ? Math.round(q('.ms-ps-banner').getBoundingClientRect().top - root.getBoundingClientRect().top) : null, layout: window.__phoneShell.mounted[0].shell.layout(),
          // 0.2.9: where the target bar, its words and Cancel, the banner and the chip lie, and whether Cancel is the topmost thing at its centre.
          over: (() => { const box = s => { const n = q(s); return n ? n.getBoundingClientRect() : null; }, top = root.getBoundingClientRect().top, tb = box('.ms-ps-target'), bn = box('.ms-ps-banner'), w = box('.ms-ps-target .ms-ps-text'), c = q('.ms-ps-target > .ms-k-btn'), cb = c ? c.getBoundingClientRect() : null, label = q('.ms-ps-chip .ms-k-btn-label');
            const hit = cb ? document.elementFromPoint(cb.left + cb.width / 2, cb.top + cb.height / 2) : null;
            return { targetTop: tb ? Math.round(tb.top - top) : null, targetRight: tb ? Math.round(tb.right) : null, bannerBottom: bn ? Math.round(bn.bottom - top) : null, wordsBottom: w ? Math.round(w.bottom) : null, cancelTop: cb ? Math.round(cb.top) : null,
              cancelReach: !!(hit && c && (hit === c || c.contains(hit))), chipWhole: label ? label.scrollWidth <= label.clientWidth + 1 : null }; })() };
      })()`);
      const art = page.requests().filter(url => /\.svg$/.test(url)).map(url => url.slice(origin.length + 1));
      // The browser asks for /favicon.ico by itself; the preview has none, as the live site has none.
      const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
      for (const v of seen.violations) v.kind = await classify(out, v);
      const file = join(REVIEW, `${sizeKey}-${state}.jpg`);
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height, scale: 1 } });
      const bytes = Buffer.from(data, 'base64');
      await writeFile(file, bytes);
      const crew = !NO_CREW.includes(state);
      const drawn = EXPECT[state](seen);
      const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && drawn && (!crew || seen.figures > 0);
      if (!ok) failed += 1;
      results[`${sizeKey}/${state}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn, ...seen, art, problems };
      await page.close();
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: ${seen.kind} bar "${seen.name}", ${seen.tabs} tabs, hero ${seen.hero}, crew ${seen.figures}, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${drawn ? '' : ', NOT AS EXPECTED'}`);
    }
  }
  // 0.2.10: the lit Blackout's line counts down, and the shell builds the bar's left part again for the new words. The
  // two captures a second apart must hold the bar and every part of its right side at the same place and size.
  for (const sizeKey of ['390x844', '430x932']) {
    const a = results[`${sizeKey}/lit`], b = results[`${sizeKey}/lit-next`];
    const same = !!a && !!b && ['box', 'promises', 'round', 'timer', 'menu'].every(part => a.bar[part] !== null && JSON.stringify(a.bar[part]) === JSON.stringify(b.bar[part]));
    steady[sizeKey] = { ok: same, lit: a?.bar ?? null, next: b?.bar ?? null };
    if (!same) failed += 1;
    console.log(`${same ? 'ok  ' : 'FAIL'} ${sizeKey} lit and lit-next: the bar and its right side keep their boxes`);
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__phoneShell !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__phoneShell.agree' : 'window.__phoneShell.probe');
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
const { headers, headersSha256 } = recordedHeaders();
const record = {
  tool: 'design/tools/phone-shell-check.mjs',
  component: 'design/phone-ui/components/phone-shell',
  sourceCommit, sourceClean,
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels; the preview bundled by Vite and served with the production headers below. Not a phone, not Safari, not a performance measure.',
  headers, headersSha256,
  voyageAt: AT,
  captures: results,
  steady,
  probe: probes,
  agree: agreement,
};
await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
const passedCaptures = Object.values(results).filter(r => r.ok).length;
const probeChecks = Object.values(probes).flatMap(p => p.checks ?? []);
const agreeChecks = agreement?.checks ?? [];
console.log(`${passedCaptures} of ${Object.keys(results).length} captures passed; probe ${probeChecks.filter(c => c.ok).length} of ${probeChecks.length} checks; agreement ${agreeChecks.filter(c => c.ok).length} of ${agreeChecks.length}; wrote ${REVIEW.slice(REPO.length + 1)}/check.json`);
if (failed) process.exitCode = 1;
