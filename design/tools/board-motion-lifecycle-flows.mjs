// mothership:dev-only
// Real-browser regressions for latest-state restoration, comfort-setting changes
// without a public update, listener disposal, and 320 x 568 selection-strip fit.
// node design/tools/board-motion-lifecycle-flows.mjs [--evidence]
// Synthetic prototype only. No server receipts, player secrets or game adjudication.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage, sleep } from './lib/chrome.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { boardMotionInputsSha256 } from './lib/board-motion-inputs.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const evidence = process.argv.includes('--evidence');
const output = evidence ? resolve(repoRoot, 'docs/design/evidence/board-motion-lifecycle-2026-10-12') : '/private/tmp/gamen-designer-lifecycle';
await mkdir(output, { recursive: true });
const inputsSha256 = await boardMotionInputsSha256(repoRoot);
const server = await startStaticServer({ port: 0 });
const launched = await launchBrowser({});
const browser = await connect(launched.endpoint);
const results = [];
const ok = (name, passed, actual) => {
  results.push({ name, passed, actual });
  console.log(`${passed ? 'ok  ' : 'FAIL'} ${name}${passed ? '' : ' ' + JSON.stringify(actual)}`);
};
const snapshot = page => page.evaluate(`(() => ({
  boards: [...document.querySelectorAll('.bm-board')].map(board => ({
    surface: board.dataset.board,
    moving: board.querySelectorAll('[data-moving]').length,
    effects: board.querySelectorAll('.bm-flyer, .bm-echo, .bm-clock, .bm-trail, .bm-puff, .bm-hit').length,
    poses: [...board.querySelectorAll('.bm-piece[data-seat]')].map(piece => ({
      seat: Number(piece.dataset.seat), health: piece.dataset.health, gesture: piece.dataset.gesture,
      expected: piece.dataset.character + '|' + piece.dataset.gesture,
      drawn: piece.querySelector('.bm-piece__body').dataset.drawn,
    })),
  })), motion: document.getElementById('bm-app').dataset.motion,
  system: matchMedia('(prefers-reduced-motion: reduce)').matches,
  revision: window.__bmState.revision, cues: window.__bmCues.length,
  requests: window.__bmState.requests, listeners: window.__motionListeners,
}))()`);
const settled = state => state.boards.every(board => board.moving === 0 && board.effects === 0 && board.poses.every(pose => pose.drawn === pose.expected));
const event = id => `document.querySelector('[data-event="${id}"]').click();`;
const panelReduce = `[...document.querySelectorAll('.bm-panel label')].find(label => label.textContent.includes('Reduced motion')).querySelector('input').click();`;
const frames = page => page.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
async function open({ system = false } = {}) {
  const page = await openPage(browser, { width: 1440, height: 1000 });
  // Observe native listener ownership without replacing events or motion preferences.
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    const native = window.matchMedia.bind(window);
    window.__motionListeners = { added: 0, removed: 0, active: 0 };
    window.matchMedia = query => {
      const media = native(query);
      if (query !== '(prefers-reduced-motion: reduce)') return media;
      const add = media.addEventListener.bind(media), remove = media.removeEventListener.bind(media), listeners = new Set();
      media.addEventListener = (type, fn, options) => {
        if (type === 'change' && !listeners.has(fn)) { listeners.add(fn); window.__motionListeners.added++; window.__motionListeners.active++; }
        return add(type, fn, options);
      };
      media.removeEventListener = (type, fn, options) => {
        if (type === 'change' && listeners.delete(fn)) { window.__motionListeners.removed++; window.__motionListeners.active--; }
        return remove(type, fn, options);
      };
      return media;
    };
  })();` });
  if (system) await page.media({ 'prefers-reduced-motion': 'reduce' });
  // The frame's 10 px border is excluded: its actual content is 320 x 568.
  await page.goto(`${server.origin}/board-motion/?scenario=board.idle&w=340&h=588&freeze=1&motion=full`, 'window.__designReady === true');
  await frames(page);
  return page;
}
async function picture(page, name) {
  if (evidence) await page.screenshot(resolve(output, name + '.png'), { selector: '#bm-app', margin: 0 });
}

try {
  let page = await open();
  await page.evaluate(event('leave-hospital'));
  let state = await snapshot(page);
  ok('precondition: public move is walking on both boards', state.boards.every(board => board.moving > 0 && board.effects > 0), state);
  await page.evaluate(event('recover'));
  state = await snapshot(page);
  ok('heal interrupts walk: the drawn figure matches the latest Healthy gesture on both boards', settled(state) && state.boards.every(board => board.poses.find(pose => pose.seat === 6).health === 'Healthy'), state);
  await picture(page, '320x568-healed-during-walk');
  await sleep(1100);
  state = await snapshot(page);
  ok('no cancelled frame later restores the Injured pose', settled(state) && state.boards.every(board => board.poses.find(pose => pose.seat === 6).drawn === 'c6|tablet'), state);
  await page.close();

  page = await open();
  await page.evaluate(event('leave-hospital') + panelReduce);
  state = await snapshot(page);
  ok('fixture-panel reduced motion settles both walks in the same call', state.motion === 'reduced' && settled(state), state);
  const panelState = state;
  await picture(page, '320x568-panel-reduced');
  await sleep(1100);
  state = await snapshot(page);
  ok('panel cancellation has no late frame, public revision, cue or request', settled(state) && state.revision === panelState.revision && state.cues === panelState.cues && JSON.stringify(state.requests) === JSON.stringify(panelState.requests), state);
  await page.close();

  page = await open();
  await page.evaluate(`document.getElementById('bm-nav-menu').click();` + event('leave-hospital') + `document.querySelector('#bm-menu [data-act="motion"]').click();`);
  state = await snapshot(page);
  ok('in-app Menu reduced motion also cancels both walks immediately', state.motion === 'reduced' && settled(state), state);
  await page.close();

  page = await open();
  await page.evaluate(event('leave-hospital'));
  const fullState = await snapshot(page);
  await page.media({ 'prefers-reduced-motion': 'reduce' });
  await frames(page);
  state = await snapshot(page);
  ok('native OS reduction overrides explicit full and cancels both directors without a public update', state.system && state.motion === 'full' && settled(state) && state.revision === fullState.revision && state.cues === fullState.cues, state);
  await picture(page, '320x568-system-reduced');
  await sleep(1100);
  state = await snapshot(page);
  ok('OS cancellation leaves no delayed JavaScript walk or lost state', settled(state) && state.revision === fullState.revision && JSON.stringify(state.requests) === JSON.stringify(fullState.requests), state);
  await page.media({ 'prefers-reduced-motion': 'no-preference' });
  await frames(page);
  state = await snapshot(page);
  ok('returning to full does not replay the cancelled walk', settled(state) && state.cues === fullState.cues, state);
  await page.evaluate(event('move'));
  state = await snapshot(page);
  ok('a subsequent fresh public move still walks on both boards', state.boards.every(board => board.moving > 0 && board.effects > 0), state);
  await page.close();

  page = await open({ system: true });
  await page.evaluate(event('leave-hospital'));
  state = await snapshot(page);
  ok('initial OS reduced preference starts no JavaScript walk on either board', state.system && settled(state), state);
  await page.close();

  page = await open();
  await page.evaluate(event('leave-hospital') + event('recover') + panelReduce);
  state = await snapshot(page);
  ok('heal plus immediate reduction preserves the latest pose through both cancellations', settled(state) && state.boards.every(board => board.poses.find(pose => pose.seat === 6).drawn === 'c6|tablet'), state);
  await page.close();

  page = await open();
  state = await snapshot(page);
  ok('the app and both directors own native motion listeners', state.listeners.active >= 3, state.listeners);
  await page.evaluate(event('leave-hospital') + `window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new Event('pagehide'));`);
  state = await snapshot(page);
  ok('idempotent page disposal cancels all work and removes every motion listener', settled(state) && state.listeners.active === 0 && state.listeners.added === state.listeners.removed, state);
  await page.media({ 'prefers-reduced-motion': 'reduce' });
  await frames(page);
  const disposedState = await snapshot(page);
  ok('an OS change after disposal cannot redraw or restart a director', settled(disposedState) && disposedState.revision === state.revision && disposedState.cues === state.cues && disposedState.listeners.active === 0, disposedState);
  await page.close();

  const scenarios = ['shot.choose', 'shot.confirm', 'shot.registered', 'shot.unknown', 'code.two', 'code.four', 'supply.second', 'scan.faction', 'move.confirm', 'pass.confirm', 'vote.election', 'rescue.choose', 'release.choice', 'release.vote', 'showdown.choose', 'showdown.registered'];
  for (const scenario of scenarios) {
    page = await openPage(browser, { width: 320, height: 568, mobile: true });
    await page.goto(`${server.origin}/board-motion/?scenario=${scenario}&chrome=0&freeze=1`, 'window.__designReady === true');
    await frames(page);
    const fit = await page.evaluate(`(() => {
      const app = document.getElementById('bm-app'), board = app.querySelector('.bm-board'), strip = app.querySelector('.bm-strip');
      const rect = node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      const sr = rect(strip), br = rect(board), status = rect(app.querySelector('.bm-status')), nav = rect(app.querySelector('.bm-nav'));
      const controls = [...app.querySelectorAll('button')].filter(node => !node.closest('[hidden]') && node.getBoundingClientRect().width > 0).map(rect);
      const targets = [...board.querySelectorAll('.bm-piece__target')].map(node => { const r = rect(node), hit = document.elementFromPoint((r.left+r.right)/2, (r.top+r.bottom)/2); return { ...r, hit: hit === node || node.contains(hit) }; });
      const overlap = (a,b) => Math.max(0, Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
      return { viewport: [innerWidth,innerHeight], app: rect(app), board: br, strip: sr, nav, status,
        overflow: board.scrollHeight-board.clientHeight, pageOverflow: [document.documentElement.scrollWidth-innerWidth,document.documentElement.scrollHeight-innerHeight],
        stripVisible: !strip.hidden, smallControls: controls.filter(r => r.width < 43.5 || r.height < 43.5).length,
        badTargets: targets.filter(r => !r.hit || r.top < br.top-0.5 || r.bottom > br.bottom+0.5 || r.width < 43.5 || r.height < 43.5).length,
        overlaps: targets.reduce((n,r,i) => n+targets.slice(i+1).filter(s => overlap(r,s)>1).length,0),
      };
    })()`);
    ok(`320x568 ${scenario}: selection strip, full board and navigation fit without scrolling`, fit.stripVisible && fit.app.width === 320 && fit.app.height === 568 && fit.overflow <= 1 && fit.pageOverflow.every(n => n <= 1) && fit.status.top >= -0.5 && fit.status.bottom <= fit.board.top+0.5 && fit.board.bottom <= fit.strip.top+0.5 && fit.strip.bottom <= fit.nav.top+0.5 && fit.nav.bottom <= 568.5, fit);
    ok(`320x568 ${scenario}: controls are 44 px and target centers are unobstructed without overlap`, fit.smallControls === 0 && fit.badTargets === 0 && fit.overlaps === 0, fit);
    if (['shot.confirm', 'code.two', 'code.four', 'supply.second', 'release.choice'].includes(scenario)) await picture(page, '320x568-' + scenario.replace('.', '-'));
    await page.close();
  }
} finally {
  const failed = results.filter(result => !result.passed).length;
  await writeFile(resolve(output, 'facts.json'), JSON.stringify({ synthetic: true, tool: 'design/tools/board-motion-lifecycle-flows.mjs', inputsSha256, browser: launched.version, assertions: results.length, failed, results }, null, 2) + '\n');
  console.log(`Board motion lifecycle: ${results.length-failed} passed, ${failed} failed`);
  if (failed || results.length === 0) process.exitCode = 1;
  browser.close(); await launched.close(); await server.close();
}
