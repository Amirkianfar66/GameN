// mothership:dev-only
//
// The character pilot's review page (review.html): ?view=sheet, the still review sheet; ?view=motion,
// the three characters idling, walking and waving. A design review page, not the game: the poses
// are the rig's, the characters are the pilot's, and nothing here reads a match.
// window.__pilot = { ready, end, seek(t) } lets design/tools/character-pilot-render.mjs capture exact
// frames; without it, the motion view plays in real time.

import { FRAME } from '../board-motion/figures/body.mjs';
import { CREW } from '../board-motion/figures/crew.mjs';
import { figureSvg } from '../board-motion/figures/body.mjs';
import { GESTURES, STAND } from '../board-motion/figures/gestures.mjs';
import { blend, EASE } from '../board-motion/figures/motion.mjs';
import { idle, walk, wave } from './anim.mjs';
import { COLOUR_PROPOSALS, PILOT_CAST, PILOT_ORDER, PILOT_VERSION } from './cast.mjs';
import { pilotFigureSvg } from './figure.mjs';
import { portraitSvg } from './portrait.mjs';

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'sheet';
const root = document.getElementById('pilot');
const SEEDS = { c8: 3, c6: 7, c4: 11 };

/** Today's figure, drawn by the approved rig. */
const today = (id, sk, prefix) => figureSvg(CREW[id], sk, { prefix });
const pilot = (id, sk, prefix, motion = {}) => pilotFigureSvg(PILOT_CAST[id], sk, { prefix, motion });

function sheet() {
  const title = `<header><h1>Character pilot: Mira, Nova and Atlas</h1><p>A proposal in the owner's direction of 7 November 2026: noir light, comic-book ink and a hand-drawn line, on the approved rig's skeletons. Nothing here is adopted. <span class="v">${PILOT_VERSION}</span></p></header>`;
  const portraits = `<section><h2>Portraits: iOS-style icons</h2><div class="row">${PILOT_ORDER.map(id => {
    const c = PILOT_CAST[id];
    return `<figure class="portrait">${portraitSvg(c, { prefix: `sp${id}` })}<figcaption>${c.sign}<span class="chips"><i style="background:${c.field}"></i><i style="background:${c.accent}"></i><i style="background:${c.skin}"></i><i style="background:${c.hair}"></i></span></figcaption></figure>`;
  }).join('')}</div></section>`;
  const compare = `<section><h2>Today, and the pilot (front and back)</h2><div class="row">${PILOT_ORDER.map(id => `
    <div class="trio"><div class="fig light"><span>today</span>${today(id, STAND, `st${id}`)}</div><div class="fig"><span>pilot</span>${pilot(id, STAND, `sn${id}`)}</div><div class="fig"><span>pilot, back</span>${pilot(id, GESTURES.doorBack, `sb${id}`)}</div><p>${PILOT_CAST[id].sign}</p></div>`).join('')}</div></section>`;
  const poses = ['think', 'tablet', 'standFolded', 'wallLean'];
  const gestures = `<section><h2>The rig's own gestures, in the new style</h2><div class="row">${PILOT_ORDER.map(id => `<div class="set">${poses.map((g, i) => `<div class="fig small"><span>${g}</span>${pilot(id, GESTURES[g], `sg${id}${i}`)}</div>`).join('')}<p>${PILOT_CAST[id].sign}</p></div>`).join('')}</div></section>`;
  const small = `<section class="noir"><h2>At the sizes they are seen: board figures (84 px) and list icons (64 and 44 px)</h2><div class="row sizes">${PILOT_ORDER.map(id => `
    <div class="pair"><div class="tiny">${today(id, STAND, `zt${id}`)}</div><div class="tiny">${pilot(id, STAND, `zn${id}`)}</div><div class="icons">${portraitSvg(PILOT_CAST[id], { prefix: `zp${id}`, size: 64 })}${portraitSvg(PILOT_CAST[id], { prefix: `zq${id}`, size: 44 })}</div></div>`).join('')}</div><p class="note">Left of each pair: today's figure. Right: the pilot.</p></section>`;
  const rows = COLOUR_PROPOSALS.map(p => `<tr><td>${p.sign}</td><td>${p.role}</td>${['current', 'sheet', 'proposed'].map(k => `<td><i class="sw" style="background:${p[k]}"></i>${p[k]}</td>`).join('')}</tr>`).join('');
  const colours = `<section><h2>Colours kept away from the team colours</h2><table><thead><tr><th>Character</th><th>Use</th><th>Today</th><th>The redesign sheet</th><th>Proposed</th></tr></thead><tbody>${rows}</tbody></table><p class="note">Every proposed colour is at least 41 (CIE76) from each team's colour; the minimum the game keeps is 30. The sheet's pink was 27.7 from red, its purple 29.4 from the Alien's.</p></section>`;
  root.innerHTML = title + portraits + compare + gestures + small + colours;
}

/** The actions, one after another, each eased in from the last pose of the one before. */
const TIMELINE = [
  { name: 'Idle', from: 0, to: 3200, at: (t, s) => idle(t, { seed: s }) },
  { name: 'Walk', from: 3200, to: 6400, at: (t, s) => walk(t, { seed: s }) },
  { name: 'Wave', from: 6400, to: 9600, at: (t, s) => wave(t, { seed: s }) },
];
export const MOTION_END = 9600;
const BLEND_MS = 320;

function frameAt(t, seed) {
  const i = Math.max(0, TIMELINE.findIndex(a => t >= a.from && t < a.to));
  const action = TIMELINE[i === -1 ? TIMELINE.length - 1 : i];
  const local = t - action.from;
  const now = action.at(local, seed);
  if (i > 0 && local < BLEND_MS) {
    const prev = TIMELINE[i - 1];
    const last = prev.at(prev.to - prev.from, seed);
    return { name: action.name, sk: blend(last.sk, now.sk, EASE.standard(local / BLEND_MS)), motion: now.motion };
  }
  return { name: action.name, ...now };
}

function motionView() {
  root.innerHTML = `<div class="stage">${PILOT_ORDER.map(id => `<div class="col" id="col-${id}"><div class="spot"></div><div class="figure"></div><div class="who"><div class="face"></div><b>${PILOT_CAST[id].sign}</b></div></div>`).join('')}<div class="action"></div><div class="mark">Character pilot · proposal · ${PILOT_VERSION}</div></div>`;
  const draw = t => {
    let label = '';
    for (const id of PILOT_ORDER) {
      const f = frameAt(t, SEEDS[id]);
      label = f.name;
      const col = document.getElementById(`col-${id}`);
      col.querySelector('.figure').innerHTML = pilot(id, f.sk, `m${id}`, f.motion);
      col.querySelector('.face').innerHTML = portraitSvg(PILOT_CAST[id], { prefix: `mp${id}`, size: 92, motion: { blink: f.motion.blink } });
    }
    root.querySelector('.action').textContent = label;
  };
  window.__pilot = { ready: true, end: MOTION_END, seek: async t => { draw(t); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return t; } };
  if (params.has('t')) { draw(Number(params.get('t'))); return; }
  if (params.get('play') === '0') { draw(0); return; }
  const start = performance.now();
  const loop = now => { draw((now - start) % MOTION_END); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}

document.documentElement.dataset.view = view;
if (view === 'motion') motionView(); else sheet();
window.__designReady = true;
export { FRAME };
