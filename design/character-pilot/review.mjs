// mothership:dev-only
//
// The character pilot's review page (review.html): ?view=sheet, the pilot's still review sheet;
// ?view=motion, the pilot's three characters idling, walking and waving; ?view=crew and
// ?view=crew-motion, the same for the whole crew of nine. A design review page, not the game: the
// poses are the rig's, the characters are the restyle's, and nothing here reads a match.
// window.__pilot = { ready, end, seek(t) } lets design/tools/character-pilot-render.mjs capture exact
// frames; without it, the motion view plays in real time.

import { FRAME } from '../board-motion/figures/body.mjs';
import { CREW } from '../board-motion/figures/crew.mjs';
import { figureSvg } from '../board-motion/figures/body.mjs';
import { GESTURES, STAND } from '../board-motion/figures/gestures.mjs';
import { blend, EASE } from '../board-motion/figures/motion.mjs';
import { idle, walk, wave } from './anim.mjs';
import { FACTION_ACCENTS, cie76 } from '../board-v2/fx/blocked.mjs';
import { COLOUR_PROPOSALS, CREW_ORDER, CREW_VERSION, PILOT_CAST, PILOT_ORDER, PILOT_VERSION } from './cast.mjs';
import { pilotFigureSvg } from './figure.mjs';
import { pilotHead } from './head.mjs';
import { inkCanvas } from './ink.mjs';
import { portraitSvg } from './portrait.mjs';

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'sheet';
const root = document.getElementById('pilot');
const SEEDS = { c1: 13, c2: 17, c3: 19, c4: 11, c5: 23, c6: 7, c7: 29, c8: 3, c9: 31 };

/** Today's figure, drawn by the approved rig. */
const today = (id, sk, prefix) => figureSvg(CREW[id], sk, { prefix });
const pilot = (id, sk, prefix, motion = {}) => pilotFigureSvg(PILOT_CAST[id], sk, { prefix, motion });
/** A pilot head alone, large: the face traced from the owner's art, with the rig's lids. */
const headSvg = (id, view, motion, prefix) => {
  const cv = inkCanvas(prefix);
  pilotHead(cv, PILOT_CAST[id], view, motion);
  return cv.svg({ viewBox: '-28 -32 70 64' });
};

function sheet() {
  const title = `<header><h1>Character pilot: Mira, Nova and Atlas</h1><p>A proposal in the owner's direction of 7 November 2026: noir light, comic-book ink and a hand-drawn line, on the approved rig's skeletons. The faces are traced from the owner's own art. Nothing here is adopted. <span class="v">${PILOT_VERSION}</span></p></header>`;
  const portraits = `<section><h2>Portraits: iOS-style icons</h2><div class="row">${PILOT_ORDER.map(id => {
    const c = PILOT_CAST[id];
    return `<figure class="portrait">${portraitSvg(c, { prefix: `sp${id}` })}<figcaption>${c.sign}<span class="chips"><i style="background:${c.field}"></i><i style="background:${c.accent}"></i><i style="background:${c.skin}"></i><i style="background:${c.hair}"></i></span></figcaption></figure>`;
  }).join('')}</div></section>`;
  const faces = `<section><h2>Faces traced from the owner's art, rigged: open, blinking, looking down</h2><div class="row">${PILOT_ORDER.map(id => `<div class="faces">${[['front', {}], ['front', { blink: 0.5 }], ['down', {}]].map(([v, motion], i) => headSvg(id, v, motion, `sf${id}${i}`)).join('')}<p>${PILOT_CAST[id].sign}</p></div>`).join('')}</div></section>`;
  const compare = `<section><h2>Today, and the pilot (front and back)</h2><div class="row">${PILOT_ORDER.map(id => `
    <div class="trio"><div class="fig light"><span>today</span>${today(id, STAND, `st${id}`)}</div><div class="fig"><span>pilot</span>${pilot(id, STAND, `sn${id}`)}</div><div class="fig"><span>pilot, back</span>${pilot(id, GESTURES.doorBack, `sb${id}`)}</div><p>${PILOT_CAST[id].sign}</p></div>`).join('')}</div></section>`;
  const poses = ['think', 'tablet', 'standFolded', 'wallLean'];
  const gestures = `<section><h2>The rig's own gestures, in the new style</h2><div class="row">${PILOT_ORDER.map(id => `<div class="set">${poses.map((g, i) => `<div class="fig small"><span>${g}</span>${pilot(id, GESTURES[g], `sg${id}${i}`)}</div>`).join('')}<p>${PILOT_CAST[id].sign}</p></div>`).join('')}</div></section>`;
  const small = `<section class="noir"><h2>At the sizes they are seen: board figures (84 px) and list icons (64 and 44 px)</h2><div class="row sizes">${PILOT_ORDER.map(id => `
    <div class="pair"><div class="tiny">${today(id, STAND, `zt${id}`)}</div><div class="tiny">${pilot(id, STAND, `zn${id}`)}</div><div class="icons">${portraitSvg(PILOT_CAST[id], { prefix: `zp${id}`, size: 64 })}${portraitSvg(PILOT_CAST[id], { prefix: `zq${id}`, size: 44 })}</div></div>`).join('')}</div><p class="note">Left of each pair: today's figure. Right: the pilot.</p></section>`;
  const rows = COLOUR_PROPOSALS.map(p => `<tr><td>${p.sign}</td><td>${p.role}</td>${['current', 'sheet', 'proposed'].map(k => `<td><i class="sw" style="background:${p[k]}"></i>${p[k]}</td>`).join('')}</tr>`).join('');
  const colours = `<section><h2>Colours kept away from the team colours</h2><table><thead><tr><th>Character</th><th>Use</th><th>Today</th><th>The redesign sheet</th><th>Proposed</th></tr></thead><tbody>${rows}</tbody></table><p class="note">Every proposed colour is at least 41 (CIE76) from each team's colour; the minimum the game keeps is 30. The sheet's pink was 27.7 from red, its purple 29.4 from the Alien's.</p></section>`;
  root.innerHTML = title + portraits + faces + compare + gestures + small + colours;
}

/** Where each of the crew's colours comes from. */
const COLOUR_SOURCE = { c4: "the pilot's", c6: 'proposed, accepted', c8: "the pilot's", c9: 'proposed, accepted' };
const nearestTeam = hex => Math.min(...Object.values(FACTION_ACCENTS).map(accent => cie76(hex, accent)));

function crewSheet() {
  const sign = id => PILOT_CAST[id].sign;
  const title = `<header><h1>The crew: nine characters in the new style</h1><p>The pilot's look, approved by the owner on 7 November 2026, carried to the whole crew on the owner's go-ahead. Every face is traced from the owner's own art. Nothing here is adopted. <span class="v">${CREW_VERSION}</span></p></header>`;
  const portraits = `<section><h2>Portraits: iOS-style icons</h2><div class="row crew">${CREW_ORDER.map(id => `<figure class="portrait crew">${portraitSvg(PILOT_CAST[id], { prefix: `cp${id}` })}<figcaption>${sign(id)}</figcaption></figure>`).join('')}</div></section>`;
  const faces = `<section><h2>Faces traced from the owner's art, rigged: open, blinking, looking down</h2><div class="row">${CREW_ORDER.map(id => `<div class="faces">${[['front', {}], ['front', { blink: 0.5 }], ['down', {}]].map(([v, motion], i) => headSvg(id, v, motion, `cf${id}${i}`)).join('')}<p>${sign(id)}</p></div>`).join('')}</div></section>`;
  const figures = `<section><h2>Front and back</h2><div class="row">${CREW_ORDER.map(id => `<div class="duo"><div class="fig">${pilot(id, STAND, `cn${id}`)}</div><div class="fig">${pilot(id, GESTURES.doorBack, `cb${id}`)}</div><p>${sign(id)}</p></div>`).join('')}</div></section>`;
  const poses = ['tablet', 'wallLean', 'wheelchair'];
  const gestures = `<section><h2>The rig's own gestures, in the new style</h2><div class="row">${CREW_ORDER.map(id => `<div class="set crew">${poses.map((g, i) => `<div class="fig small"><span>${g}</span>${pilot(id, GESTURES[g], `cg${id}${i}`)}</div>`).join('')}<p>${sign(id)}</p></div>`).join('')}</div></section>`;
  const small = `<section class="noir"><h2>At the sizes they are seen: board figures (84 px) and list icons (64 and 44 px)</h2><div class="row sizes">${CREW_ORDER.map(id => `
    <div class="pair"><div class="tiny">${pilot(id, STAND, `cz${id}`)}</div><div class="icons">${portraitSvg(PILOT_CAST[id], { prefix: `cy${id}`, size: 64 })}${portraitSvg(PILOT_CAST[id], { prefix: `cx${id}`, size: 44 })}</div></div>`).join('')}</div></section>`;
  const rows = CREW_ORDER.map(id => {
    const c = PILOT_CAST[id];
    return `<tr><td>${c.sign}</td>${[c.field, c.accent].map(hex => `<td><i class="sw" style="background:${hex}"></i>${hex}</td>`).join('')}<td>${Math.min(nearestTeam(c.field), nearestTeam(c.accent)).toFixed(1)}</td><td>${COLOUR_SOURCE[id] ?? "today's crew colours"}</td></tr>`;
  }).join('');
  const colours = `<section><h2>The crew's colours, kept away from the team colours</h2><table><thead><tr><th>Character</th><th>Field</th><th>Accent</th><th>Nearest team colour (CIE76)</th><th>From</th></tr></thead><tbody>${rows}</tbody></table><p class="note">The game keeps every colour at least 30 from each team's colour; a test checks every colour each character draws.</p></section>`;
  root.innerHTML = title + portraits + faces + figures + gestures + small + colours;
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

function motionView(ids = PILOT_ORDER, { stage = 'stage', mark = `Character pilot · proposal · ${PILOT_VERSION}`, face = 92 } = {}) {
  root.innerHTML = `<div class="${stage}">${ids.map(id => `<div class="col" id="col-${id}"><div class="spot"></div><div class="figure"></div><div class="who"><div class="face"></div><b>${PILOT_CAST[id].sign}</b></div></div>`).join('')}<div class="action"></div><div class="mark">${mark}</div></div>`;
  const draw = t => {
    let label = '';
    for (const id of ids) {
      const f = frameAt(t, SEEDS[id]);
      label = f.name;
      const col = document.getElementById(`col-${id}`);
      col.querySelector('.figure').innerHTML = pilot(id, f.sk, `m${id}`, f.motion);
      col.querySelector('.face').innerHTML = portraitSvg(PILOT_CAST[id], { prefix: `mp${id}`, size: face, motion: { blink: f.motion.blink } });
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
if (view === 'motion') motionView();
else if (view === 'crew-motion') motionView(CREW_ORDER, { stage: 'stage crew', mark: `Character crew · proposal · ${CREW_VERSION}`, face: 54 });
else if (view === 'crew') crewSheet();
else sheet();
window.__designReady = true;
export { FRAME };
