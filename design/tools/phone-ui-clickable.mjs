// mothership:dev-only
//
// Exports the phone UI pack's clickable prototype as rendered screens: every state reachable from
// the prototype's flows and the review sheets is drawn at 390 × 844 (1.5× pixels), with the
// rectangles of its own controls (each [data-go] and where it leads) and its timed advance. The
// result is a folder of JPEG screens and states.json, for a static clickable review page that needs
// none of the game's modules. Review output only: it is written outside the repository.
//
//   node design/tools/phone-ui-clickable.mjs <output folder> [--max 260]
//
// Needs a Chromium-based browser (CHROME_PATH). Pictures of desktop Chromium, not of a phone.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, launchBrowser, openPage } from './lib/chrome.mjs';
import { startServer } from './phone-ui-render.mjs';
import { SHEETS } from '../phone-ui/sheets/catalog.mjs';
import { FLOWS, screenRegistry } from '../phone-ui/prototype/screens.mjs';

const VIEW = Object.freeze({ width: 390, height: 844, scale: 1.5, safe: '47,34' });
const DROP = new Set(['safe', 'chrome', 'text', 'live', 'amb']);

/** One state's canonical address: its parameters without viewing options, in a fixed order. */
export function stateKey(query) {
  const p = new URLSearchParams(query);
  return [...p.entries()].filter(([k]) => !DROP.has(k)).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&');
}

async function main() {
  const out = resolve(process.argv[2] ?? '');
  if (!process.argv[2]) throw new Error('Give an output folder');
  const max = Number(process.argv[process.argv.indexOf('--max') + 1]) || 260;
  mkdirSync(join(out, 'screens'), { recursive: true });
  const starts = [...FLOWS.flatMap(f => f.steps.map(s => s.go)), ...SHEETS.flatMap(s => (s.frames ?? []).filter(f => (f.size ?? '390x844') === '390x844' && !f.text).map(f => f.q))];
  const queue = [...new Set(starts.map(stateKey))];
  const states = {};
  const server = await startServer();
  const chrome = await launchBrowser();
  const browser = await connect(chrome.endpoint);
  const page = await openPage(browser, VIEW);
  const screens = screenRegistry();
  try {
    while (queue.length && Object.keys(states).length < max) {
      const key = queue.shift();
      if (states[key]) continue;
      const params = Object.fromEntries(new URLSearchParams(key));
      if (!screens[params.s]) continue;
      await page.goto(`${server.origin}/design/phone-ui/prototype/index.html?${key}&safe=${VIEW.safe}`, 'window.__phoneReady === true');
      await page.evaluate('new Promise(done => setTimeout(done, 450))');
      const spots = await page.evaluate(`[...document.querySelectorAll('[data-go]')].filter(el => el.getAttribute('aria-disabled') !== 'true').map(el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), go: el.dataset.go, tx: el.dataset.tx || null, label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40) }; }).filter(s => s.w > 0 && s.h > 0 && s.x < ${VIEW.width} && s.y < ${VIEW.height} && s.x + s.w > 0 && s.y + s.h > 0)`);
      const file = `screens/${String(Object.keys(states).length).padStart(3, '0')}.jpg`;
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: VIEW.width, height: VIEW.height, scale: 1 } });
      writeFileSync(join(out, file), Buffer.from(data, 'base64'));
      const auto = screens[params.s].auto?.(params) ?? null;
      states[key] = { img: file, title: document_title(params), spots: spots.map(s => ({ ...s, go: stateKey(s.go) })), auto: auto ? { after: auto.after, go: stateKey(auto.go), tx: auto.tx ?? 'fade' } : null };
      for (const s of states[key].spots) if (!states[s.go]) queue.push(s.go);
      if (auto && !states[stateKey(auto.go)]) queue.push(stateKey(auto.go));
    }
  } finally {
    browser.close();
    await chrome.close();
    await server.close();
  }
  const flows = FLOWS.map(f => ({ title: f.title, steps: f.steps.map(s => ({ label: s.label, key: stateKey(s.go) })) }));
  writeFileSync(join(out, 'states.json'), `${JSON.stringify({ view: VIEW, flows, states })}\n`);
  console.log(`${Object.keys(states).length} states, ${queue.length} not drawn`);
}

const document_title = p => [p.s, p.state, p.role, p.room, p.kind, p.outcome, p.stage, p.t].filter(Boolean).join(' · ');

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
