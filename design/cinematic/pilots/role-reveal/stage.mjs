// mothership:dev-only
//
// The role reveal films on the cinematic stage (../../stage.html): a phone's own screen, at its own
// size (w x h CSS px), the film composed at the phone's aspect (./compose.mjs) and its page text set
// over the caption boxes. A review page, not a client: the role and the player's number are review
// parameters (&role=Doctor, &seat=6), never a server fact.
//
// Every device, emblem and crew portrait any film draws is preloaded whatever the role and the
// character (./roles.mjs ROLE_REVEAL_ASSETS): a client ships them all, so nothing fetched tells a
// dealt role.

import { frames } from '../../lib/stage-kit.mjs';
import { deviceOnly } from './art.mjs';
import { CAPTION_PAD, PAGE_WIDTH, captionFont, pageHeight, revealSvg } from './compose.mjs';
import { REVEAL_END, ROLE_REVEAL_VERSION, VARIANTS } from './film.mjs';
import { DEVICE_FILES, ROLE_REVEAL_ASSETS } from './roles.mjs';

/** The page text over the composition: the memory panels' narration and an announcement of the role. */
function wordsLayer(root, w, h, k) {
  const node = document.createElement('div');
  Object.assign(node.style, { position: 'absolute', left: '0', top: '0', width: `${w}px`, height: `${h}px`, pointerEvents: 'none' });
  root.append(node);
  const line = () => {
    const el = document.createElement('p');
    // Comic lettering: captions in capitals, a little tracked, on the letterer's lines (compose.mjs
    // captionLines(); the words stay in sentence case for screen readers).
    Object.assign(el.style, { position: 'absolute', margin: '0', display: 'grid', placeItems: 'center', textAlign: 'center', boxSizing: 'border-box', color: '#151923', fontFamily: '"Arial Narrow", "Helvetica Neue", Arial, sans-serif', fontWeight: '800', fontSize: `${captionFont(k)}px`, lineHeight: '1.2', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'pre' });
    node.append(el);
    return el;
  };
  const story = [line(), line()];
  const live = document.createElement('p');
  live.setAttribute('aria-live', 'polite');
  Object.assign(live.style, { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' });
  node.append(live);
  const place = (el, { box, lines, opacity }) => {
    if (!(opacity > 0)) { el.style.display = 'none'; return; }
    const [x, y, bw, bh] = box.map(v => v * k);
    Object.assign(el.style, { display: 'grid', left: `${x}px`, top: `${y}px`, width: `${bw}px`, height: `${bh}px`, padding: `${Math.round(CAPTION_PAD[0] * k)}px ${Math.round(CAPTION_PAD[1] * k)}px`, opacity: String(opacity) });
    const text = lines.join('\n');
    if (el.textContent !== text) el.textContent = text;
  };
  return {
    draw(words) {
      story.forEach((el, i) => place(el, words.story[i]));
      const say = words.role.visible ? words.role.text : '';
      if (live.textContent !== say) live.textContent = say;
    },
  };
}

export async function mountPhone(root, { variant = 'full', w = 390, h = 844, role = 'Doctor', seat = 6, character = 'c4', case: caseRole = null } = {}) {
  const name = caseRole ?? role;
  // Every picture any film draws, read whatever the role and the character (nothing fetched tells a
  // dealt role), once: the films draw them inline from this text (compose.mjs revealSvg's pictures),
  // so no frame waits on a picture to load or decode. The opener's gadget is the device alone, the
  // same approved art the role card draws.
  const pictures = Object.fromEntries(await Promise.all(ROLE_REVEAL_ASSETS.map(async href => [href, await (await fetch(href)).text()])));
  const gadgets = Object.fromEntries(Object.entries(DEVICE_FILES).map(([r, href]) => [r, deviceOnly(pictures[href])]));
  root.style.width = `${w}px`; root.style.height = `${h}px`;
  root.style.position = 'relative'; root.style.overflow = 'hidden'; root.style.background = '#07090F';
  const host = document.createElement('div');
  Object.assign(host.style, { position: 'absolute', left: '0', top: '0', width: `${w}px`, height: `${h}px` });
  root.append(host);
  const k = w / PAGE_WIDTH;
  const height = pageHeight(w, h);
  const words = wordsLayer(root, w, h, k);
  const seek = async t => {
    const out = revealSvg(t, { role: name, variant, seat, character, gadget: gadgets[name], pictures, width: PAGE_WIDTH, height, cssPx: k });
    host.innerHTML = out.svg.replace(/width="900" height="[^"]+"/, `width="${w}" height="${h}"`);
    words.draw(out.words);
    await frames();
    return { t, stage: out.frame.still ?? null, done: t >= REVEAL_END };
  };
  return { seek, end: REVEAL_END, size: [w, h], selector: '#stage', fixture: { role: name, seat, character, synthetic: true } };
}

export const PILOT_STAGE = Object.freeze({
  id: 'role-reveal', version: ROLE_REVEAL_VERSION, variants: VARIANTS,
  surfaces: Object.freeze({ phone: mountPhone }),
});
