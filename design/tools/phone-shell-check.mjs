// mothership:dev-only
//
// The phone shell's check (design/phone-ui/components/phone-shell). It bundles the component's preview
// the way the game bundles the component (Vite: ordinary bundling, no copy), serves the bundle with the
// hosted game's production response headers (scripts/prepare-hosted-preview.mjs: the Content Security
// Policy of scripts/hosted-preview-policy.mjs and the six other headers), and captures every preview
// state at the two development phone sizes, 390 × 844 and 430 × 932, and the Largest text (200%) at
// 320 × 568, in desktop Chromium at 2× pixels. The room scene draws the stage, as in the game.
// The phase bars' states (0.2.10) draw what ../phone-ui/components/phone-shell/phase-bars.mjs returns.
// The fit's states (0.3.5) are captured at 320 × 568, the two development sizes and 402 × 742, the game as
// the owner reads it on their phone inside the Claude app.
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
const SIZES = { '390x844': [390, 844], '430x932': [430, 932], '320x568': [320, 568], '402x742': [402, 742] };
/** 0.3.5: the fit's states at the small phone, the two development phones and the owner's own view (their phone inside the Claude app). */
const FIT = ['320x568', '390x844', '402x742', '430x932'];
/** Each state at the two development sizes; the Largest text at 320 × 568 (preview.mjs PREVIEW_STATES). */
const STATES = { turn: 2, own: 2, urgent: 2, vote: 2, voted: 2, result: 2, dark: 2, target: 2, pass: 2, actions: 2, card: 2, 'card-icon': 2, talk: 2, stale: 2, out: 2, concealed: 2, film: 2, poster: 2, large: ['320x568'], 'target-stale': 2, 'target-large': ['390x844', '430x932'],
  // 0.2.10, the phase bars: each row of the words table (phase-bars.mjs), and one at the Largest text.
  before: 2, 'before-start': 2, block: 2, appointment: 2, appoint: 2, lit: 2, 'lit-next': 2, synchronized: 2, 'course-own': 2, moved: 2, loading: 2, closed: 2, 'phase-large': ['320x568'],
  // 0.3.3: the toast under a tall sheet's head and under the banner; a sheet with a long title, and the same at the Largest text on the small phone.
  'toast-sheet': 2, 'toast-banner': 2, offer: 2, 'offer-large': ['320x568'],
  // 0.3.5: the bar's words with the game's own longer names and its longest line, never cut; one at the Large text and one at the Largest.
  'fit-pair-crew': FIT, 'fit-pair-player': FIT, 'fit-own-crew': FIT, 'fit-own-player': FIT, 'fit-turn': FIT, 'fit-phase': FIT, 'fit-own-large': ['320x568'], 'fit-phase-large': ['430x932'] };
/** The states whose stage holds no room (a film, a poster, the talk's capsule) or whose room shows no one. */
const NO_CREW = ['dark', 'talk', 'concealed', 'film', 'poster', 'synchronized', 'moved', 'loading', 'fit-pair-crew', 'fit-pair-player'];
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
/** 0.3.2: `count` of the game's tabs draw a painted tile, each drawn, in the portrait's 32 px box. */
const tiled = (s, count) => s.tiles.filter(t => t.tile).length === count && s.tiles.every(t => t.box && t.box.join() === '32,32' && (!t.tile || t.drawn));
const tileOf = (s, tab) => s.tiles.find(t => t.tab === tab) ?? {};
/** 0.3.5: no drawn word of the bar cut, Promises a 36 px pill with no word, the clock's icon only in a bar wider than 25 rem, the bar inside the phone. */
const whole = s => !!s.fit && s.fit.cut.length === 0 && (!s.fit.pill || (s.fit.pill.width === 36 && s.fit.pill.words === '')) && (s.fit.clockIcon === null || s.ring || s.fit.clockIcon === (s.fit.rem > 25)) && s.bar.right <= s.layout.size.width
  && (!s.fit.row || (s.fit.row.level && (s.fit.row.gap === null || (s.fit.row.gap >= 0 && s.fit.row.gap <= 12))));
/** What a state must show, from the shell's own DOM (and the room scene's crew where a room is drawn). */
const EXPECT = {
  // 0.3.0: Card is the last tab and draws this viewer's own portrait, its ring the tab's colour, not amber.
  // 0.3.2: Board, Actions and Panels are painted tiles; the round button's icon is painted, and grey while unavailable.
  turn: s => s.kind === 'turn' && s.name === 'Fay' && s.tabs === 4 && s.hero === 'pass' && s.heroOff && s.order.join() === 'switch,actions,hero,panels,card' && s.card.picture && s.card.drawn && !s.card.amber
    && tiled(s, 3) && tileOf(s, 'switch').form === 'board:tile' && s.tiles.every(t => !t.ring && !t.faded) && s.heroIcon === 'pass:painted' && s.heroGrey,
  own: s => s.name === 'Your turn' && s.hero === 'pass' && !s.heroOff && s.promises === 'Promises, 1 new' && s.timer === '0:42' && tiled(s, 3) && s.heroIcon === 'pass:painted' && !s.heroGrey,
  urgent: s => s.urgent && s.timer === '0:08',
  vote: s => s.kind === 'phase' && s.hero === 'vote' && !s.heroOff && s.heroIcon === 'vote:painted' && tiled(s, 3),
  voted: s => s.hero === 'voted',
  result: s => s.ring && s.promises === null && s.menu && s.heroOff && s.cover === 1,
  // 0.2.10: the pack's words and time for the dark (sheets 07 and 30), amber in its last 10 s as everyone's bar is.
  // 0.3.2: in the dark the game gives no person, so no portrait: the Card tab draws the card's tile, as the other three do theirs.
  dark: s => s.tone === 'dark' && s.figures === 0 && s.name === 'Blackout' && s.sub === 'Dark · positions fixed' && s.timer === '0:08' && s.urgent && !s.card.picture && s.card.icon === 'card' && tiled(s, 4),
  target: s => s.target === 'Rescue' && s.chip === 'Other rooms · 1',
  pass: s => s.sheet === 'Pass your turn?' && s.sheetActions === 2,
  // 0.3.2: the open tab's amber ring lies over its tile, and over no other.
  actions: s => s.sheet === 'Actions' && s.open === 'actions' && tiled(s, 3) && tileOf(s, 'actions').ring && !tileOf(s, 'switch').ring && !tileOf(s, 'panels').ring,
  // 0.3.0: open, the portrait's ring is amber, and the tab is still named by its word.
  card: s => s.sheet === 'Your role' && s.open === 'card' && s.head === 'Hide card' && s.card.picture && s.card.drawn && s.card.amber && s.card.words === 'Card' && s.card.name === null,
  // 0.3.0: with no character, the card's own icon in the last place; 0.3.2: as its painted tile.
  'card-icon': s => s.order.join() === 'switch,actions,hero,panels,card' && !s.card.picture && s.card.icon === 'card' && s.card.words === 'Card' && tiled(s, 4) && tileOf(s, 'card').form === 'card:tile',
  talk: s => s.kind === 'pair' && s.talk === 2 && s.tabs === 0,
  stale: s => s.banner === 'Connection lost' && s.status === 'stale' && s.name === 'Reconnecting…' && s.sub === 'Showing Round 3 as last seen' && s.timer === null,
  // An eliminated player's phone (0.2.8): the banner's words without Retry, the phone live, Actions not offered.
  out: s => s.banner === 'You’re out' && s.bannerKind === 'out' && s.bannerButtons === 0 && s.status === 'live' && s.tabs === 4 && s.heroOff && tiled(s, 3) && tileOf(s, 'actions').faded && !tileOf(s, 'panels').faded,
  concealed: s => s.buttons === 0 && s.name === null && s.figures === 0,
  // Edge to edge, and the banner at the bar's place: the top safe area, the bar's 52 px at the 16 px root (kit.css
  // .ph --bar-h), and 8 px, as the pack's banner on its bar-less film.
  film: s => s.kind === 'none' && s.layout.bars.top === 0 && s.layout.bars.bottom === 0 && s.layout.stage.height === s.layout.size.height && s.tabs === 0
    && s.banner === 'Connection lost' && s.bannerTop === s.layout.safe.top + 52 + 8,
  poster: s => s.kind === 'phase' && s.name === 'Setting course' && s.sub === 'The offices are setting it' && s.layout.bars.top === 0 && s.layout.bars.bottom === 0 && s.layout.stage.height === s.layout.size.height && s.tabs === 0,
  // 0.3.0: at 200 % on the small phone the portrait keeps its box (the top bar's 32 px, 0.3.1), and the Card label the other labels' level.
  large: s => s.name === 'Your turn' && s.tabs === 4 && s.card.picture && s.card.box.join() === '32,32' && s.card.level && tiled(s, 3),
  // 0.2.9: the target bar 8 px under the banner while reconnecting, so its Cancel is in reach; the banner keeps its place.
  'target-stale': s => s.banner === 'Connection lost' && s.target === 'Rescue' && s.over.targetTop >= s.over.bannerBottom + 8 && s.over.cancelReach,
  // 0.2.9: at 200 % on the two phones, Cancel under the words, the bar inside the phone, and the chip's label whole.
  'target-large': s => s.target === 'Move within Room A' && s.over.cancelTop >= s.over.wordsBottom && s.over.targetRight <= s.layout.size.width && s.over.chipWhole && s.over.cancelReach,
  // 0.2.10, the phase bars: the pack's words for each row of the table, the clock amber only where someone may act,
  // Promises and ⋮ where the pack's bar has them.
  // 0.3.3: the toast 8 px under a tall sheet's head, and 8 px under the banner; never on either.
  'toast-sheet': s => s.sheet === 'Your role' && /^Registered/.test(s.toast ?? '') && s.toastPlace.under && Math.abs(s.toastPlace.toast - (s.toastPlace.headBottom + 8)) < 1,
  'toast-banner': s => s.banner === 'Connection lost' && s.toast === 'Copied' && s.toastPlace.under && Math.abs(s.toastPlace.toast - (s.toastPlace.bannerBottom + 8)) < 1,
  // 0.3.3: with room for its body a sheet is as before: the footer at its foot, the head a row, nothing cut.
  offer: s => s.sheet === 'Offer from Fay · Player 6' && s.sheetActions === 2 && !s.sheetFit.follows && !s.sheetFit.stacked && s.sheetFit.cut <= 1,
  // 0.3.3: on the small phone at 200 %, the head stacked and the footer following the body: the content has the room under the head, and nothing is cut.
  'offer-large': s => s.sheet === 'Offer from Fay · Player 6' && s.sheetFit.follows && s.sheetFit.stacked && s.sheetFit.cut <= 1 && s.sheetFit.room >= s.sheetFit.height - s.sheetFit.head - 14,
  // 0.3.5, the fit: every word whole and all of it in the page, Promises the handshake alone (a 36 px pill with no word), the
  // clock's icon only in a bar wider than 25 rem. Where the bar is fitted, how: the name on two lines, the line under it
  // on two, or the controls on a row of their own.
  'fit-pair-crew': s => whole(s) && s.kind === 'pair' && s.fit.read.join('|') === 'Crew 6 + Crew 1|Private talk' && s.talk === 2,
  'fit-pair-player': s => whole(s) && s.kind === 'pair' && s.fit.read.join('|') === 'Player\u00a06 + Player\u00a010|Private talk',
  'fit-own-crew': s => whole(s) && s.fit.read.join('|') === 'Your turn|Player 6 · Crew 6',
  'fit-own-player': s => whole(s) && s.fit.read.join('|') === 'Your turn|Player 10 · Crew 10',
  'fit-turn': s => whole(s) && s.fit.read.join('|') === 'Crew 10|Player 10 · Turn',
  'fit-phase': s => whole(s) && s.kind === 'phase' && s.fit.read.join('|') === 'Captain vote|Current board · shared: After Food Supply · Round 12' && s.fit.how !== '',
  'fit-own-large': s => whole(s) && s.fit.how === 'name2' && s.fit.read.join('|') === 'Your turn|Player 6 · Crew 6',
  'fit-phase-large': s => whole(s) && s.fit.how === 'stack sub2' && s.fit.read[1] === 'Current board · shared: After Blackout · Round 3',
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
          card: (() => { const tab = q('.ms-ps-tab[data-value="card"]'); if (!tab) return null; const pt = tab.querySelector('.ms-ps-tab-pt:not([data-tile])'), label = tab.querySelector('.ms-ps-tab-label'), other = q('.ms-ps-tab[data-value="panels"] .ms-ps-tab-label');
            const probe = document.createElement('i'); probe.style.color = 'var(--ms-ps-accent)'; root.append(probe); const accent = getComputedStyle(probe).color; probe.remove();
            return { picture: !!pt, drawn: pt ? getComputedStyle(pt).backgroundImage !== 'none' : null, box: pt ? [pt.getBoundingClientRect().width, pt.getBoundingClientRect().height] : null,
              // 0.3.1: no ring at rest; open, a ring in the accent (an inset shadow). amber: whether that ring is drawn.
              amber: pt ? getComputedStyle(pt).boxShadow.includes(accent) : null, ring: pt ? getComputedStyle(pt).boxShadow !== 'none' : null,
              icon: tab.querySelector('.ms-ps-tab-icon').dataset.icon.split(':')[0], words: label.textContent, name: tab.getAttribute('aria-label'), level: other ? Math.abs(label.getBoundingClientRect().top - other.getBoundingClientRect().top) < 0.5 : null }; })(),
          // 0.3.2: each game tab's picture, a painted tile or the portrait: which, its box, whether the open tab's ring lies
          // over a tile, and whether the tab is faded; and the round button's icon and whether it is greyed.
          tiles: [...root.querySelectorAll('.ms-ps-tabs .ms-ps-tab[data-intent]')].map(tab => { const pt = tab.querySelector('.ms-ps-tab-pt'), r = pt ? pt.getBoundingClientRect() : null, isTile = !!pt && pt.hasAttribute('data-tile');
            return { tab: tab.dataset.value, form: tab.querySelector('.ms-ps-tab-icon').dataset.icon.split(':').slice(0, 2).join(':'), tile: isTile, drawn: isTile ? !!pt.querySelector('svg') : null, box: r ? [r.width, r.height] : null,
              ring: isTile ? getComputedStyle(pt, '::after').boxShadow !== 'none' : null, faded: getComputedStyle(tab).opacity !== '1' }; }),
          heroIcon: q('.ms-ps-hero .ms-ps-hero-icon')?.dataset.icon ?? null, heroGrey: q('.ms-ps-hero .ms-ps-hero-icon svg') ? getComputedStyle(q('.ms-ps-hero .ms-ps-hero-icon svg')).filter !== 'none' : null,
          // 0.3.3: where the toast comes to rest (its place in layout, from the shell's top) against a banner's and a sheet's head's foot;
          // and how a sheet is fitted: its footer following its body or not, its head stacked or not, the room its content gets, and what is cut.
          toastPlace: (() => { const top = n => { let t = 0; for (let node = n; node && node !== root; node = node.offsetParent) t += node.offsetTop; return t; };
            const toast = q('.ms-ps-toast'), head = q('.ms-ps-sheet-head'), banner = q('.ms-ps-banner');
            return { under: root.hasAttribute('data-toast-under'), toast: toast ? top(toast) : null, headBottom: head ? top(head) + head.offsetHeight : null, bannerBottom: banner ? top(banner) + banner.offsetHeight : null }; })(),
          sheetFit: (() => { const sheet = q('.ms-ps-sheet'); if (!sheet) return null; const head = q('.ms-ps-sheet-head'), body = q('.ms-ps-sheet-body'), wrap = q('.ms-ps-sheet-scroll'), follows = sheet.hasAttribute('data-foot-scrolls');
            return { follows, stacked: head.hasAttribute('data-stacked'), height: sheet.clientHeight, head: head.offsetHeight, room: Math.round((follows ? wrap : body).clientHeight), cut: Math.max(0, sheet.scrollHeight - sheet.clientHeight) }; })(),
          hero: q('.ms-ps-hero')?.dataset.mode ?? null, heroOff: !!q('.ms-ps-hero[data-off]'), talk: root.querySelectorAll('.ms-ps-talk button').length,
          target: t('.ms-ps-target b'), chip: t('.ms-ps-chip .ms-k-btn-label'), banner: t('.ms-ps-banner b'), bannerKind: q('.ms-ps-banner')?.dataset.kind ?? null, toast: t('.ms-ps-toast'),
          // 0.2.10: where the bar and each part of its right side lie, and how the title sits: its lines, and whether all of it shows.
          bar: (() => { const base = root.getBoundingClientRect(), box = s => { const n = q(s); if (!n || n.getClientRects().length === 0) return null; const r = n.getBoundingClientRect(); return [r.left - base.left, r.top - base.top, r.width, r.height].map(v => Math.round(v * 100) / 100); };
            const name = q('.ms-ps-name'), lineHeight = name ? parseFloat(getComputedStyle(name).lineHeight) : NaN;
            return { box: box('.ms-ps-tb'), promises: box('.ms-ps-promises'), round: box('.ms-ps-round'), timer: box('.ms-ps-timer'), menu: box('.ms-ps-menu'), right: q('.ms-ps-tb') ? Math.round(q('.ms-ps-tb').getBoundingClientRect().right - base.left) : null,
              nameLines: name && lineHeight ? Math.round(name.getBoundingClientRect().height / lineHeight) : null, nameWhole: name ? name.scrollWidth <= name.clientWidth + 1 && name.scrollHeight <= name.clientHeight + 1 : null }; })(),
          // 0.3.5: how the bar is fitted, whether a drawn word is cut, Promises' drawing (its pill's width and words) and whether the clock's icon is drawn.
          fit: (() => { const tb = q('.ms-ps-tb'); if (!tb || !q('.ms-ps-name')) return null;
            const cut = n => { if (!n || n.offsetWidth <= 1) return false; const line = parseFloat(getComputedStyle(n).lineHeight) || n.clientHeight; return n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + line / 2; };
            const pill = q('.ms-ps-pill'), mark = q('.ms-ps-timer-mark'), style = getComputedStyle(tb), rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
            return { how: tb.getAttribute('data-fit') ?? '', cut: ['.ms-ps-name', '.ms-ps-sub'].filter(s => cut(q(s))), read: [t('.ms-ps-name'), t('.ms-ps-sub')], height: Math.round(tb.getBoundingClientRect().height * 100) / 100,
              pill: pill ? { width: Math.round(pill.getBoundingClientRect().width * 100) / 100, words: pill.textContent } : null, clockIcon: mark ? mark.getClientRects().length > 0 && !mark.classList.contains('ms-ps-ring') : null,
              rem: Math.round((tb.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)) / rem * 100) / 100,
              // On a row of their own: the gap from Promises to the round, the clock and the menu beside it, and whether the two are level. The dots that gave way to a break.
              row: (() => { if (!(tb.getAttribute('data-fit') ?? '').includes('stack')) return null; const p = q('.ms-ps-promises')?.getBoundingClientRect() ?? null, r = q('.ms-ps-right').getBoundingClientRect();
                return { gap: p ? Math.round((r.left - p.right) * 100) / 100 : null, level: p ? Math.abs((p.top + p.bottom) / 2 - (r.top + r.bottom) / 2) <= 1 : true, right: Math.round((tb.getBoundingClientRect().right - r.right) * 100) / 100 }; })(),
              breaks: [...tb.querySelectorAll('.ms-ps-sub .ms-ps-dot')].map(n => n.hasAttribute('data-break')) }; })(),
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
