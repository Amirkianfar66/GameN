// mothership:dev-only
//
// The phone UI pack's router. One address names one state of one screen:
//   index.html?s=<screen>&<state params>      a bare phone screen filling the window
//   …&safe=47,34                               simulated safe areas (top,bottom) for review frames
//   …&text=1.5                                 the game's Large text setting (1, 1.5 or 2)
//   …&motion=reduced                           Reduce motion
//   …&live=1                                   clickable: controls move to the state they name; the rooms' ambient motion runs
//   …&amb=3.5                                  the rooms' ambient motion held still at 3.5 s (otherwise at 0)
//   index.html                                 the clickable prototype's stage (a phone and its flows)
// Synthetic fixtures only; nothing here talks to a server.

import { screenRegistry, FLOWS } from './screens.mjs';
import { h, ic } from './ui.mjs';
import { FIXTURE_LABEL } from './fixtures.mjs';
import { settleAmbient } from './ambient.mjs';

const app = document.getElementById('app');
const read = () => Object.fromEntries(new URLSearchParams(location.search));

function applyEnvironment(p) {
  const html = document.documentElement;
  html.style.fontSize = p.text ? `${Number(p.text) * 100}%` : '';
  html.dataset.motion = p.motion === 'reduced' ? 'reduced' : 'normal';
}

export function renderScreen(p) {
  applyEnvironment(p);
  const builder = screenRegistry()[p.s];
  const root = h('div.ph', { 'data-screen': p.s, 'data-motion': p.motion === 'reduced' ? 'reduced' : null, 'data-live': p.live ? '' : null });
  if (p.safe) {
    const [t, b] = p.safe.split(',').map(Number);
    root.style.setProperty('--safe-t', `${t}px`);
    root.style.setProperty('--safe-b', `${b}px`);
    root.dataset.safeB = String(b);
  }
  app.replaceChildren(root);
  if (!builder) { root.append(h('p', { style: { padding: '40px 20px' } }, `No screen "${p.s}".`)); return; }
  builder(root, p);
  settleAmbient(root, { live: Boolean(p.live), at: Number(p.amb ?? 0) });
  if (p.safe && p.chrome !== '0') {
    root.append(h('div.ph-status', { 'aria-hidden': 'true' }, h('span', '9:41'), h('i')));
    if (Number(p.safe.split(',')[1]) > 0) root.append(h('div.ph-home', { 'aria-hidden': 'true' }));
  }
  document.title = `Game N · ${p.s}`;
  window.__phoneReady = true;
}

// ── Clickable mode ───────────────────────────────────────────────────────
let timerHandle = null;
function navigate(query, { replace = false, tx = 'fade' } = {}) {
  const current = read();
  const next = Object.fromEntries(new URLSearchParams(query));
  for (const k of ['live', 'safe', 'text', 'motion', 'chrome']) if (current[k] !== undefined && next[k] === undefined) next[k] = current[k];
  const url = `?${new URLSearchParams(next)}`;
  if (replace) history.replaceState(null, '', url); else history.pushState(null, '', url);
  const draw = () => { renderScreen(next); arm(next); };
  document.documentElement.dataset.tx = tx;
  if (document.startViewTransition && next.motion !== 'reduced') document.startViewTransition(draw);
  else draw();
  window.parent?.postMessage({ phoneUi: url }, '*');
}

function arm(p) {
  clearTimeout(timerHandle);
  const auto = screenRegistry()[p.s]?.auto?.(p);
  if (p.live && auto) timerHandle = setTimeout(() => navigate(auto.go, { replace: true, tx: auto.tx ?? 'fade' }), auto.after);
}

app.addEventListener('click', event => {
  const p = read();
  if (!p.live) return;
  const target = event.target.closest('[data-go]');
  if (!target || target.getAttribute('aria-disabled') === 'true') return;
  event.preventDefault();
  navigate(target.dataset.go, { tx: target.dataset.tx ?? 'fade' });
});
addEventListener('popstate', () => { renderScreen(read()); arm(read()); });

// ── The prototype's stage (desktop): a phone, its flows and the fixture label ──
function stage() {
  document.body.classList.add('stage-page');
  const frame = h('iframe.stage-phone', { title: 'Game N phone prototype', src: `?${FLOWS[0].steps[0].go}&live=1&safe=47,34` });
  const flows = h('nav.stage-flows', { 'aria-label': 'Flows' }, h('h1', 'Game N · phone prototype'), h('p.stage-fixture', ic('info', { filled: true }), h('span', FIXTURE_LABEL)),
    FLOWS.map(flow => h('section', h('h2', flow.title), h('ol', flow.steps.map(step => h('li', h('button', { type: 'button', onclick: () => { frame.src = `?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(step.go)), live: '1', safe: '47,34' })}`; } }, step.label)))))));
  app.replaceChildren(h('div.stage', flows, h('div.stage-device', frame)));
}

const p = read();
if (p.s) { renderScreen(p); arm(p); }
else if (matchMedia('(max-width: 600px)').matches) navigate(`${FLOWS[0].steps[0].go}&live=1`, { replace: true });
else stage();
