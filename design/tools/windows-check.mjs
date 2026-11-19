// mothership:dev-only
//
// Windows' check (design/phone-ui/components/windows). It bundles the component's preview the way the game bundles
// the components (Vite: ordinary bundling, no copy), serves the bundle with the hosted game's production response
// headers (design/tools/lib/component-check.mjs), and captures every state of sheet 34 (the room's windows, drawing at
// a station, a drawing just shown, no window here) and the ones around them (nothing drawn yet, Show in flight, the
// keyboard's pen, reconnecting, the Largest text), in the phone shell's sheet over Room A with the Panels tab open, at
// the two development phone sizes, 390 × 844 and 430 × 932, in desktop Chromium at 2× pixels.
// A capture passes with no policy violation, no failed or refused request and no page error, with the sheet drawn as
// the state asks.
// It then runs, in the same bundle under the same headers:
//   the lifecycle probe (preview/probe.mjs), once as the page comes and once with the device's Reduce motion
//   emulated: drawing by finger and by keyboard, the inks, Undo and Clear, the contract's limits, the footer's
//   command and local action, the views, privacy, a stroke through updates, reconnecting, focus, the layout at both
//   sizes and the Largest text, dispose, motion;
//   the agreement (preview/agree.mjs): the sheet beside the frozen pack's windows screen in each of its states, the
//   same words, states, look and boxes to within half a pixel;
//   the drawing box's focus ring with Chrome's own input (touch, mouse and keys, not the page's events): none while a
//   finger or a mouse draws, even after the keyboard was used; the keyboard's own focus shows it, the very next key
//   after a finger's stroke shows it again, Tab back in after a blur shows it, and a keyboard-only player who never
//   touches the box always sees it (the Lead, 18 November).
// Every check must pass. It writes design/phone-ui/components/windows/review/: one JPEG per state and size, and
// check.json (the headers and their SHA-256, the source commit, what each capture drew and its SHA-256, and each
// probe and agreement check with what it saw).
//   node design/tools/windows-check.mjs
// Needs a Chromium-based browser (CHROME_PATH). Desktop Chromium at each phone's CSS size: not a phone,
// not Safari, not a performance measure.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { POLICY_LISTENER, bundlePreview, classify, recordedHeaders, serve, sha256, sourceState } from './lib/component-check.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const COMPONENT = join(REPO, 'design/phone-ui/components/windows');
const REVIEW = join(COMPONENT, 'review');
const SIZES = { '390x844': [390, 844], '430x932': [430, 932] };
/** Each state at the two development sizes (preview.mjs PREVIEW_STATES). */
const STATES = ['view', 'draw', 'shown', 'none', 'blank', 'showing', 'keyboard', 'stale', 'largest'];
const RECONNECTING = 'Controls return when the match is current';
const STATION = 'Room A ↔ Hospital|Your station · A2';
const ELI = '1 · Eli · Round 3|Unverified';

/** The preview bundled as the game bundles the component (component-check.mjs). */
const bundle = () => bundlePreview({ repo: REPO, root: join(COMPONENT, 'preview'), name: 'windows-check' });

// The source the captures show, read before anything is written: the components' files and the room pictures, without the review folders.
const { sourceCommit, sourceClean } = sourceState(REPO, ['design/phone-ui/components', 'design/room-drawing/assets']);
const out = await bundle();
const { server, origin } = await serve(out);
const chrome = await launchBrowser();
const browser = await connect(chrome.endpoint);
const results = {};
const probes = {};
let agreement = null;
let ring = null;
let failed = 0;
/** What every state shows, and what each one adds, from the sheet's own DOM. */
const common = s => s.cut.length === 0 && s.name === 'group:Windows' && s.title === 'Windows' && s.back && s.detent === 'large' && s.openTab === 'panels';
const station = (s, foot) => common(s) && s.heads === STATION && s.foot === foot && s.labels === 'Shown this round' && s.metas === ELI && s.inks === 'Gold:true|Paper:false|Teal:false|Pink:false' && s.pad === 'application:Drawing for Room A ↔ Hospital';
const EXPECT = {
  view: s => common(s) && s.heads === 'Room A ↔ Room B|Ends with the round|Room A ↔ Hospital|Ends with the round' && s.metas === '1 · Hana · Round 3|Unverified|1 · Eli · Round 3|Unverified' && s.strokes === 6 && s.foot === '' && s.labels === '' && s.root === 16,
  draw: s => station(s, 'Show') && s.strokes === 4 && s.showOn && !s.showBusy && !s.pen && s.root === 16,
  shown: s => common(s) && s.heads === STATION && s.foot === 'Done' && s.stamp === 'SHOWN' && s.metas === `2 · Dev · Round 3|Can’t be changed|${ELI}` && s.labels === 'Shown this round' && s.strokes === 5 && s.pad === null,
  none: s => common(s) && s.wait === 'No window here|The Command Room has no window' && s.foot === '' && s.heads === '',
  // Nothing drawn yet: Show off, Undo and Clear dimmed.
  blank: s => station(s, 'Show') && s.strokes === 2 && !s.showOn && s.undoOff,
  showing: s => station(s, 'Show') && s.showBusy,
  keyboard: s => station(s, 'Show') && s.pen && s.strokes === 5,
  // Reconnecting: drawing still works; Show waits with the banner's words.
  stale: s => station(s, 'Show') && s.banner && s.showWaits === RECONNECTING && !s.undoOff,
  largest: s => station(s, 'Show') && s.root === 32,
};
try {
  await mkdir(REVIEW, { recursive: true });
  for (const state of STATES) {
    for (const sizeKey of ['390x844', '430x932']) {
      const [width, height] = SIZES[sizeKey];
      const query = `size=${sizeKey}&state=${state}`;
      const page = await openPage(browser, { width, height, scale: 2 });
      await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
      await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__windows !== undefined');
      await page.evaluate('window.__windows.ready');
      await sleep(500);
      const seen = await page.evaluate(`(() => {
        const root = document.querySelector('.ms-windows'), q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
        const shell = document.querySelector('.ms-phone-shell'), sheet = shell.querySelector('.ms-ps-sheet');
        const shown = n => !!n && !n.hidden && n.getClientRects().length > 0 && !n.closest('[hidden]');
        const describedBy = n => { const id = n?.getAttribute('aria-describedby'); return id ? document.getElementById(id)?.textContent ?? null : null; };
        const foot = [...sheet.querySelectorAll('.ms-ps-sheet-foot .ms-k-btn')];
        const pad = q('.ms-wn-pad'), wait = q('.ms-k-wait');
        return { violations: window.__policy, root: parseFloat(getComputedStyle(document.documentElement).fontSize),
          name: [root.getAttribute('role'), root.getAttribute('aria-label')].join(':'), detent: sheet.dataset.detent, back: !!sheet.querySelector('[data-intent="sheet-back"]'),
          title: sheet.querySelector('.ms-ps-sheet-title h2').textContent, openTab: shell.querySelector('[data-intent="tab"][aria-expanded="true"]')?.dataset.value ?? null,
          heads: qa('.ms-k-section-head').filter(shown).map(h => [...h.children].map(c => c.textContent).join('|')).join('|'),
          metas: qa('.ms-wn-meta').filter(shown).map(m => [...m.children].map(c => c.textContent).join('|')).join('|'),
          labels: qa('.ms-k-group-label').filter(shown).map(n => n.textContent).join('|'),
          strokes: qa('.ms-wn-stroke').filter(shown).length, stamp: q('.ms-wn-stamp .ms-k-stamp')?.textContent ?? null,
          inks: qa('.ms-wn-swatch').map(b => [b.getAttribute('aria-label'), b.getAttribute('aria-checked')].join(':')).join('|'),
          // Each ink's round and its press area (0.1.2, the Lead, 19 November): how far from its centre a press still lands on it,
          // along each axis, and whether every point of a 43 px square around the centre does. elementFromPoint names the top
          // element over the CSS pixel from (x, y) to (x + 1, y + 1), so each point is read through the pixel centred on it: an
          // edge reads within half a pixel of where it is drawn. Each hit ring meets its neighbour's halfway (the rounds are
          // 44 px apart), and the later ink takes the pixel across that edge.
          presses: qa('.ms-wn-swatch').filter(shown).map(sw => {
            const r = sw.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, round = v => Math.round(v * 100) / 100;
            const hits = (x, y) => { const h = document.elementFromPoint(x - 0.5, y - 0.5); return !!h && (h === sw || sw.contains(h)); };
            const reach = (dx, dy) => { let d = 0; while (d < 40 && hits(cx + dx * (d + 0.25), cy + dy * (d + 0.25))) d += 0.25; return d + 0.125; };
            const inner = [-21.5, 0, 21.5].every(x => [-21.5, 0, 21.5].every(y => hits(cx + x, cy + y)));
            return { ink: sw.dataset.ink, round: round(r.width), width: round(reach(-1, 0) + reach(1, 0)), height: round(reach(0, -1) + reach(0, 1)), inner };
          }),
          pad: pad ? [pad.getAttribute('role'), pad.getAttribute('aria-label')].join(':') : null, pen: !!pad && getComputedStyle(pad.querySelector('.ms-wn-pen')).display !== 'none',
          undoOff: q('[data-intent="undo"]')?.hasAttribute('data-off') ?? null,
          wait: wait ? [wait.querySelector('.ms-k-wait-title').textContent, wait.querySelector('.ms-k-wait-line').textContent].join('|') : null,
          foot: foot.map(b => b.textContent.trim()).join('|'), showOn: !!foot[0] && foot[0].getAttribute('aria-disabled') !== 'true', showBusy: foot[0]?.getAttribute('aria-busy') === 'true',
          showWaits: foot[0]?.getAttribute('aria-disabled') === 'true' ? describedBy(foot[0]) : null,
          banner: shown(shell.querySelector('.ms-ps-banner')),
          cut: qa('.ms-k-section-title, .ms-k-section-aside, .ms-wn-meta > span, .ms-k-group-label, .ms-k-stamp, .ms-k-wait-title, .ms-k-wait-line').filter(shown).filter(n => n.scrollWidth > n.clientWidth + 0.5).map(n => n.textContent) };
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
      // Every ink drawn presses across the kit's 44 x 44 (0.1.2).
      const pressed = seen.presses.every(p => p.inner && p.width >= 43.5 && p.height >= 43.5);
      const ok = seen.violations.every(v => v.kind !== 'unexpected') && problems.length === 0 && asked && pressed;
      if (!ok) failed += 1;
      results[`${sizeKey}/${state}`] = { file: file.slice(REPO.length + 1), sha256: sha256(bytes), ok, drawn: asked, pressed, ...seen, requests, problems };
      await page.close();
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${sizeKey} ${state}: "${seen.title}" ${seen.foot || 'no footer'}, root ${seen.root}px, unexpected violations ${seen.violations.filter(v => v.kind === 'unexpected').length}, problems ${problems.length}${asked ? '' : `, NOT AS EXPECTED ${JSON.stringify(seen).slice(0, 900)}`}`);
    }
  }
  // The lifecycle probe, as the page comes and with the device's Reduce motion; then the agreement with the pack.
  for (const [mode, media, query] of [['full', null, 'probe=1'], ['device-reduced', { 'prefers-reduced-motion': 'reduce' }, 'probe=1'], ['agree', null, 'agree=1']]) {
    const page = await openPage(browser, { width: 900, height: 1000, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (media) await page.media(media);
    await page.goto(`${origin}/index.html?single=1&${query}`, 'window.__windows !== undefined');
    const outcome = await page.evaluate(mode === 'agree' ? 'window.__windows.agree' : 'window.__windows.probe');
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
  // The drawing box's focus ring, with Chrome's own input rather than the page's events, as a finger and a keyboard
  // give it (the Lead, 18 November): never while a finger or a mouse draws, even after Tab; the keyboard's own focus
  // shows it; the very next key after a finger's stroke shows it again; a blur takes the pointer's mark away, so Tab
  // back in shows it; and a keyboard-only player, who never touches the box with a pointer, always sees it. Each case
  // runs its steps on a fresh page and looks at the box where it says.
  const PAD = '.ms-windows .ms-wn-pad';
  /** A plain line of the sheet away from the box, not a control: the station's heading. */
  const AWAY = '.ms-windows .ms-wn-station > :first-child';
  const look = (label, want) => ['look', label, want];
  const stroke = (input, ring) => [['down', input], look(`while the ${input === 'touch' ? 'finger' : 'mouse'} draws`, { ring }), ['up', input]];
  const ringCases = [
    { id: 'ring: a finger draws, no ring while drawing or after', steps: [...stroke('touch', false), look('after the stroke', { ring: false, reports: 1 })] },
    { id: 'ring: a mouse draws, no ring while drawing or after', steps: [...stroke('mouse', false), look('after the stroke', { ring: false, reports: 1 })] },
    { id: 'ring: Tab reaches the box, the ring', steps: [['tab-to-box'], look('Tab reaches the box', { ring: true })] },
    { id: 'ring: Tab, then a finger draws, no ring while drawing; the very next key, the ring', steps: [['tab'], ...stroke('touch', false), look('after the stroke', { ring: false, reports: 1 }), ['key', 'ArrowRight'], look('the very next key', { ring: true, reports: 1 })] },
    { id: 'ring: Tab, then a mouse draws, no ring while drawing or after', steps: [['tab'], ...stroke('mouse', false), look('after the stroke', { ring: false, reports: 1 })] },
    { id: 'ring: a finger draws, then an arrow key, the ring', steps: [...stroke('touch', false), ['key', 'ArrowRight'], look('the next key', { ring: true, reports: 1 })] },
    { id: 'ring: a finger draws, a tap away blurs the box, then Tab back in, the ring', steps: [...stroke('touch', false), look('after the stroke', { ring: false, reports: 1 }), ['tap-away'], look('a tap away', { focused: false, mark: false }), ['tab-to-box'], look('Tab back in', { ring: true })] },
    { id: 'ring: a keyboard-only player always sees it', steps: [
      ['tab-to-box'], look('Tab reaches the box', { ring: true }),
      ['key', 'ArrowRight'], look('an arrow moves the pen', { ring: true, reports: 0 }),
      ['shift', 'down'], ['key', 'ArrowDown', true], ['key', 'ArrowDown', true], look('while Shift and the arrows draw', { ring: true, reports: 0 }),
      ['key', 'ArrowRight', true], ['shift', 'up'], look('the line drawn', { ring: true, reports: 1 }),
      ['key', ' '], look('Space draws a dot', { ring: true, reports: 2 }),
      ['shift-tab'], look('Shift+Tab leaves the box', { focused: false }),
      ['tab-to-box'], look('Tab comes back', { ring: true }),
    ] },
  ];
  const KEYS = { Tab: ['Tab', 9], ArrowRight: ['ArrowRight', 39], ArrowDown: ['ArrowDown', 40], ' ': ['Space', 32], Shift: ['ShiftLeft', 16] };
  const SEEN = `(p => { const st = getComputedStyle(p); return { focused: document.activeElement === p, ring: st.outlineStyle !== 'none' && parseFloat(st.outlineWidth) > 0, mark: p.hasAttribute('data-pointer'), reports: window.__windows.intents.filter(i => i[0] === 'onDraft').length }; })(document.querySelector(${JSON.stringify(PAD)}))`;
  const ringChecks = [];
  for (const c of ringCases) {
    const touch = c.steps.some(([kind, input]) => kind === 'tap-away' || ((kind === 'down' || kind === 'up') && input === 'touch'));
    const page = await openPage(browser, { width: 390, height: 844, scale: 1 });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: POLICY_LISTENER });
    if (touch) await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await page.goto(`${origin}/index.html?single=1&size=390x844&state=draw`, 'window.__windows !== undefined');
    await page.evaluate('window.__windows.ready');
    await sleep(400);
    let shift = false;
    const key = async (k, { up = true, down = true } = {}) => {
      const [code, vk] = KEYS[k];
      const modifiers = shift ? 8 : 0;
      if (down) await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers, ...(k === ' ' ? { text: ' ' } : {}) });
      if (up) await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers });
    };
    const onPad = `document.activeElement === document.querySelector(${JSON.stringify(PAD)})`;
    const rectOf = async selector => {
      await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: 'center' })`);
      await sleep(150);
      return page.evaluate(`(r => ({ x: r.x, y: r.y, w: r.width, h: r.height }))(document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect())`);
    };
    let box = null, tabs = 0;
    const at = (u, v) => ({ x: box.x + u * box.w, y: box.y + v * box.h });
    const along = i => at(0.2 + 0.05 * i, 0.3 + 0.04 * i);
    const looks = [];
    for (const [kind, arg, extra] of c.steps) {
      if (kind === 'tab') await key('Tab');
      else if (kind === 'tab-to-box') { let n = 0; do { await key('Tab'); n += 1; } while (n < 40 && !(await page.evaluate(onPad))); tabs += n; }
      else if (kind === 'shift-tab') { shift = true; await key('Shift', { up: false }); await key('Tab'); shift = false; await key('Shift', { down: false }); }
      else if (kind === 'shift') { if (arg === 'down') { shift = true; await key('Shift', { up: false }); } else { shift = false; await key('Shift', { down: false }); } }
      else if (kind === 'key') { const held = shift; shift = held || extra === true; await key(arg); shift = held; }
      else if (kind === 'down') {
        box = await rectOf(PAD);
        if (arg === 'touch') {
          await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [along(0)] });
          for (let i = 1; i <= 4; i++) await page.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [along(i)] });
        } else {
          const a = along(0);
          await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: a.x, y: a.y, button: 'left', buttons: 1, clickCount: 1 });
          for (let i = 1; i <= 4; i++) { const q = along(i); await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: q.x, y: q.y, button: 'left', buttons: 1 }); }
        }
      } else if (kind === 'up') {
        if (arg === 'touch') {
          for (let i = 5; i <= 8; i++) await page.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [along(i)] });
          await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else {
          for (let i = 5; i <= 8; i++) { const q = along(i); await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: q.x, y: q.y, button: 'left', buttons: 1 }); }
          const z = along(8);
          await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: z.x, y: z.y, button: 'left', buttons: 0, clickCount: 1 });
        }
      } else if (kind === 'tap-away') {
        const r = await rectOf(AWAY);
        const point = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
        await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
        await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await sleep(500);
      } else if (kind === 'look') {
        await sleep(200);
        const seen = await page.evaluate(SEEN);
        const want = { focused: true, ...extra };
        const ok = Object.entries(want).every(([k, v]) => seen[k] === v);
        looks.push({ label: arg, ...seen, want, ok });
      }
    }
    const problems = page.problems().filter(p => !/\/favicon\.ico$/.test(p));
    const ok = looks.length > 0 && looks.every(l => l.ok) && problems.length === 0;
    if (!ok) failed += 1;
    ringChecks.push({ id: c.id, ok, detail: { looks, tabs, problems } });
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.id}${ok ? '' : ` ${JSON.stringify({ looks: looks.filter(l => !l.ok), problems })}`}`);
    await page.close();
  }
  ring = { input: 'Chrome\'s own (Input.dispatchTouchEvent, Input.dispatchMouseEvent, Input.dispatchKeyEvent) at 390 x 844', checks: ringChecks, ok: ringChecks.every(c => c.ok) };
} finally {
  browser.close();
  chrome.close?.();
  server.close();
  if (process.argv.includes('--keep')) console.log(`kept the bundle in ${out}`); else await rm(out, { recursive: true, force: true });
}
const record = {
  tool: 'design/tools/windows-check.mjs',
  component: 'design/phone-ui/components/windows',
  sourceCommit, sourceClean,
  environment: 'Desktop Chromium (headless), each phone size at 2x pixels; the preview bundled by Vite and served with the production headers below. Not a phone, not Safari, not a performance measure.',
  ...recordedHeaders(),
  captures: results,
  probe: probes,
  agree: agreement,
  ring,
};
await writeFile(join(REVIEW, 'check.json'), `${JSON.stringify(record, null, 2)}\n`);
const passedCaptures = Object.values(results).filter(r => r.ok).length;
const probeChecks = Object.values(probes).flatMap(p => p.checks ?? []);
const agreeChecks = agreement?.checks ?? [];
console.log(`${passedCaptures} of ${Object.keys(results).length} captures passed; probe ${probeChecks.filter(c => c.ok).length} of ${probeChecks.length} checks; agreement ${agreeChecks.filter(c => c.ok).length} of ${agreeChecks.length}; ring ${(ring?.checks ?? []).filter(c => c.ok).length} of ${(ring?.checks ?? []).length}; wrote ${REVIEW.slice(REPO.length + 1)}/check.json`);
if (failed) process.exitCode = 1;
