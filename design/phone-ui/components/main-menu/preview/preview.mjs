// mothership:dev-only
//
// The main menu's preview: the runtime component itself (../main-menu.mjs, unchanged) in each state Frontend
// checks, at the two development phone sizes. The hero's place shows a still of the approved brand film at
// 1.65 s (Motion & Cinematics', dev-only here), where the game's player draws its held frame.
//   index.html                                     every state
//   index.html?single=1&size=390x844&state=menu    one phone, for the check's captures
//   index.html?single=1&probe=1                    the lifecycle probe (probe.mjs), for the check
//   index.html?single=1&agree=1                    the menu beside the frozen pack (agree.mjs), for the check

import { mountMainMenu, MENU_WORDS } from '../main-menu.mjs';
// The hero's stand-in: the approved brand film's own frame function, drawn as a still at 1.65 s.
import { brandSvg } from '../../../../pregame-films/brand/brand.mjs';

/** The development phone sizes, with the pack's review frames' safe areas. */
export const PREVIEW_SIZES = Object.freeze({
  '390x844': Object.freeze({ width: 390, height: 844, insets: Object.freeze({ top: 47, bottom: 34 }) }),
  '430x932': Object.freeze({ width: 430, height: 932, insets: Object.freeze({ top: 47, bottom: 34 }) }),
});
/** The hero's moment: the brand film's frame at 1.65 s, as the pack's menu draws it (screens-entry.mjs brandHero). */
export const HERO_MS = 1650;
/** Offline, as Frontend gives it: the notice, and the three choices unavailable with the notice as their reason. */
const OFF = Object.freeze({ enabled: false, reason: MENU_WORDS.offline });
export const OFFLINE = Object.freeze({ notice: 'offline', join: OFF, host: OFF, recover: OFF });

/** Each state of sheet 10 and the ones around it, as the menu's input. */
export const PREVIEW_STATES = Object.freeze({
  menu: { caption: 'Main menu · sheet 10', menu: {} },
  offline: { caption: 'Offline · sheet 10', menu: OFFLINE },
  large: { caption: 'Largest text (200%) · the menu', menu: {}, text: 200 },
  'large-offline': { caption: 'Largest text (200%) · offline', menu: OFFLINE, text: 200 },
});

/** The hero's still, in the menu's hero element (the player's place). */
export function drawHero(holder, t = HERO_MS) {
  const { width, height } = holder.getBoundingClientRect();
  holder.innerHTML = brandSvg(t, { width, height });
  holder.firstElementChild?.classList.add('pv-film-svg');
}

const intents = [];
const record = name => (...args) => intents.push([name, ...args]);
const handlers = Object.fromEntries(['onJoin', 'onHost', 'onRecover', 'onSettings'].map(n => [n, record(n)]));
const params = new URLSearchParams(location.search);
const mounted = [];

/** A phone at a development size, the menu in it, and the hero's still. */
function phone(sizeKey, key) {
  const size = PREVIEW_SIZES[sizeKey], s = PREVIEW_STATES[key];
  const frame = document.createElement('div');
  frame.className = 'pv-phone';
  Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px` });
  return { frame, mount: () => {
    const menu = mountMainMenu(frame, { ...s.menu, insets: size.insets }, handlers);
    drawHero(menu.hero);
    return menu;
  } };
}

let probe = null, agree = null;
if (params.get('agree')) {
  document.body.classList.add('pv-single');
  agree = document.fonts.ready.then(() => import('./agree.mjs')).then(m => m.runMainMenuAgreement({ sizes: PREVIEW_SIZES, offline: OFFLINE }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('probe')) {
  document.body.classList.add('pv-single');
  probe = document.fonts.ready.then(() => import('./probe.mjs')).then(m => m.runMainMenuProbe({ sizes: PREVIEW_SIZES, offline: OFFLINE, drawHero }))
    .catch(error => ({ mode: 'error', ok: false, checks: [], error: String(error?.stack ?? error) }));
} else if (params.get('single')) {
  document.body.classList.add('pv-single');
  const key = params.get('state') ?? 'menu', sizeKey = params.get('size') ?? '390x844';
  if (!PREVIEW_STATES[key] || !PREVIEW_SIZES[sizeKey]) throw new Error(`Unknown size or state: ${sizeKey} ${key}`);
  if (PREVIEW_STATES[key].text) document.documentElement.style.fontSize = `${PREVIEW_STATES[key].text}%`;
  const p = phone(sizeKey, key);
  document.body.append(p.frame);
  mounted.push(p.mount());
} else {
  const head = document.createElement('header');
  head.className = 'pv-head';
  head.innerHTML = '<h1>Main menu · preview</h1><p>The runtime component, with a still of the approved brand film where the game draws its held frame. Desktop browser at each phone’s CSS size: not a phone.</p>';
  const grid = document.createElement('div');
  grid.className = 'pv-grid';
  document.body.append(head, grid);
  for (const [key, s] of Object.entries(PREVIEW_STATES)) {
    if (s.text) continue;
    for (const sizeKey of Object.keys(PREVIEW_SIZES)) {
      const cell = document.createElement('figure');
      cell.className = 'pv-cell';
      const caption = document.createElement('figcaption');
      caption.innerHTML = `${s.caption}<small>${sizeKey.replace('x', ' × ')} · state=${key}</small>`;
      const p = phone(sizeKey, key);
      cell.append(caption, p.frame);
      grid.append(cell);
      mounted.push(p.mount());
    }
  }
}

window.__mainMenu = {
  intents, mounted, probe, agree,
  ready: document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))),
};
