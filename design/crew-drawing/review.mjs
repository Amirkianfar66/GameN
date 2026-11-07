// mothership:dev-only
//
// The crew drawing release's review page (review.html), rendered by
// design/tools/crew-drawing-render.mjs into design/crew-drawing/review/. Two views:
// - ?view=motion (&reduced=1): the nine on a noir stage for 12 s, drawn the way the release asks a
//   client to draw them (mount.mjs): the traced heads placed once (crewArtDefs), each pose drawn
//   once per mounted figure and kept (poseKey), and every frame only the live attributes set
//   (crewFrame, applyCrewFrame): blinks, the idle drift, Mira's hair and Echo's locs. Idle, then a
//   move with the rig's exit, walk and arrive at the game's timings, then places, views and health.
//   With reduced=1, the same clock with reduced motion: no drift, no swing, and a move is placed
//   with the game's short fade instead of walked.
// - ?view=compare: today's drawing and the release's, surface by surface: the board, the Hospital
//   and the Jail, health, the walk at the capsule's size, the phone kit's vote stage, the cards in
//   every crop the game uses, the standees, the role card with its device, the films' effects (put
//   in by the render tool) and the app icons.
// window.__crew: { ready, seek(t), measure(), films(markup) }. A review page in desktop Chrome:
// it proves nothing about phones.

import { FRAME, hasFront } from '../board-motion/figures/body.mjs';
import { CREW as OLD_CREW } from '../board-motion/figures/crew.mjs';
import { skeletonOf } from '../board-motion/figures/gestures.mjs';
import { TIMELINES, sample, walkPose } from '../board-motion/figures/motion.mjs';
import { dressedFigureSvg as oldFigureSvg } from '../board-motion/figures/wardrobe.mjs';
import { CREW, CREW_DRAWING_VERSION, CREW_ORDER } from './source/crew.mjs';
import { applyCrewFrame, crewArtDefs, crewFrame, poseKey } from './source/mount.mjs';
import { crewMotion, hairFollow, isStill } from './source/motion.mjs';
import { crewPortraitSvg } from './source/portrait.mjs';
import { dressedFigureSvg } from './source/wardrobe.mjs';

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'motion';
const reduced = params.get('reduced') === '1';
document.documentElement.dataset.view = view;
const app = document.getElementById('app');
const ART = Object.freeze({ ref: 'crew-art' });
const el = (tag, cls, html = '') => { const n = document.createElement(tag); if (cls) n.className = cls; n.innerHTML = html; return n; };

// ---------- the game's move (apps/game/hosted/comic-motion.mjs): 900 ms, exit 120, walk 450, arrive 330 ----------
const MOVE_MS = 900, EXIT_MS = 120, WALK_END = 570, REDUCED_MS = 80;
const STEP = 48; // px a move travels on this stage: everyone the same way, and Echo stays on it
/** The rig's move at elapsed ms (as the game samples it), the walk's phase kept to sixteenths and the blends to 30 ms, so poses repeat and are drawn once. */
function movePose(from, to, elapsed) {
  const walk = phase => walkPose(Math.round(phase * 16) / 16);
  if (elapsed < EXIT_MS) return sample(TIMELINES.exit(from, EXIT_MS, walk(0)), Math.round(elapsed / 30) * 30);
  if (elapsed < WALK_END) return walk((elapsed - EXIT_MS) / 225);
  return sample(TIMELINES.arrive(to, MOVE_MS - WALK_END, walk(2)), Math.min(MOVE_MS - WALK_END, Math.round((elapsed - WALK_END) / 30) * 30));
}
const easeInOut = u => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);

// ---------- what each column shows in the third part ----------
const PLACES = Object.freeze({
  c1: ['think', 'crew', 'thinking (Room A)'],
  c2: ['doorBack', 'prison', 'Jail: turned away'],
  c3: ['stand+injured', 'crew', 'Injured: the bandage'],
  c4: ['down', 'crew', 'Eliminated on the deck'],
  c5: ['ivPole', 'gown', 'Hospital: the gown'],
  c6: ['benchSling+injured', 'gown', 'Injured: the sling'],
  c7: ['benchHunched', 'prison', 'Jail: looking down'],
  c8: ['wallLean', 'prison', 'Jail: the banded suit'],
  c9: ['benchSling+still', 'gown', 'Eliminated on the bench'],
});
/** Plain props behind a figure, in its frame (review props: the board draws its own rooms). */
const PROPS = Object.freeze({ benchSling: 'bench', benchHunched: 'bench', doorBack: 'door', ivPole: 'pole' });
const propOf = gesture => PROPS[String(gesture).split('+')[0]] ?? null;
function propSvg(kind, sk) {
  const [x, y] = sk.pelvis, floor = sk.floorY ?? 233;
  const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${FRAME.box.join(' ')}">${body}</svg>`;
  if (kind === 'pole') {
    const hand = [sk.wN, sk.wF].filter(Boolean).sort((a, b) => a[1] - b[1])[0] ?? [x + 30, 90];
    const px = hand[0];
    return svg(`<rect x="${px - 2}" y="18" width="4" height="${floor - 18}" fill="#8696AE" stroke="#151923" stroke-width="1.6"/><rect x="${px - 9}" y="16" width="18" height="24" rx="5" fill="#B9C4D3" stroke="#151923" stroke-width="2" opacity="0.9"/><path d="M${px - 16} ${floor} H${px + 16}" stroke="#151923" stroke-width="4" stroke-linecap="round"/>`);
  }
  if (kind === 'door') return svg(`<rect x="${x - 44}" y="22" width="88" height="${floor - 22}" rx="3" fill="#34415A" stroke="#151923" stroke-width="2.6"/><rect x="${x - 30}" y="40" width="60" height="26" rx="2" fill="#222B3A" stroke="#151923" stroke-width="2"/>`);
  const top = y + 9;
  return svg(`<rect x="${x - 40}" y="${top}" width="80" height="9" rx="2" fill="#34415A" stroke="#151923" stroke-width="2.4"/><rect x="${x - 34}" y="${top + 9}" width="6" height="${floor - top - 9}" fill="#222B3A" stroke="#151923" stroke-width="2"/><rect x="${x + 28}" y="${top + 9}" width="6" height="${floor - top - 9}" fill="#222B3A" stroke="#151923" stroke-width="2"/>`);
}

// ---------- a mounted figure: poses drawn once and kept, the live attributes set every frame ----------
function mountFigure(host, c, prefix) {
  const layers = { body: el('span', 'layer'), front: el('span', 'layer') };
  const prop = el('span', 'layer');
  host.append(prop, layers.body, layers.front);
  const cache = new Map();
  const state = { key: null, prop: null };
  const markup = (sk, outfit, layer) => {
    const key = poseKey(c, sk, { outfit, layer, art: ART, live: true });
    if (!cache.has(key)) cache.set(key, dressedFigureSvg(c, sk, { outfit, layer, prefix: `${prefix}-${layer}`, art: ART, live: true }));
    return [key, cache.get(key)];
  };
  return {
    cache,
    show(sk, outfit, gesture) {
      const [bodyKey, body] = markup(sk, outfit, 'body');
      const front = hasFront(sk) ? markup(sk, outfit, 'front') : [null, ''];
      const key = `${bodyKey}/${front[0]}`;
      if (state.key !== key) {
        layers.body.innerHTML = body;
        layers.front.innerHTML = front[1];
        state.key = key;
      }
      const kind = propOf(gesture), propKey = kind ? gesture : null;
      if (state.prop !== propKey) { prop.innerHTML = kind ? propSvg(kind, sk) : ''; state.prop = propKey; }
    },
    frame(sk, motion) {
      const frame = crewFrame(c, sk, motion);
      let set = 0;
      for (const layer of Object.values(layers)) { const svg = layer.firstElementChild; if (svg) set += applyCrewFrame(svg, frame); }
      return set;
    },
  };
}

// ---------- the motion view ----------
function motionView() {
  document.body.insertAdjacentHTML('afterbegin', crewArtDefs());
  const stage = el('div', 'stage');
  stage.append(el('div', 'floor'));
  const caption = el('div', 'caption'), sub = el('div', 'sub');
  stage.append(caption, sub, el('div', 'mark', `${CREW_DRAWING_VERSION} · ${reduced ? 'reduced motion' : 'full motion'} · review render, desktop Chrome`), el('div', 'clock'));
  const cols = CREW_ORDER.map((id, i) => {
    const col = el('div', 'col');
    col.style.left = `${28 + i * 136}px`;
    col.append(el('div', 'spot'));
    const actor = el('div', 'actor');
    col.append(actor, el('div', 'who', CREW[id].sign), el('div', 'what'));
    stage.append(col);
    return { id, c: CREW[id], col, actor, what: col.querySelector('.what'), fig: mountFigure(actor, CREW[id], `rv-${id}`), follow: hairFollow(id), acc: null };
  });
  app.append(stage);
  const stand = skeletonOf('stand');
  const unitsPerPx = FRAME.box[2] / 260;
  let last = null;

  function columnAt(col, i, t) {
    const delay = i * 60;
    let gesture = 'stand', outfit = 'crew', sk = stand, x = 0, mirror = false, opacity = 1, what = '';
    if (t >= 8000) {
      [gesture, outfit, what] = PLACES[col.id];
      sk = skeletonOf(gesture);
    } else if (t >= 4000) {
      const moves = [[4300 + delay, 0, STEP], [6200 + delay, STEP, 0]];
      x = 0;
      for (const [start, from, to] of moves) {
        if (t < start) break;
        const elapsed = t - start;
        if (reduced) {
          // The game's reduced motion: no flight; the piece is placed, with a short fade.
          x = elapsed < REDUCED_MS / 2 ? from : to;
          opacity = Math.min(1, Math.abs(elapsed - REDUCED_MS / 2) / (REDUCED_MS / 2));
          continue;
        }
        if (elapsed >= MOVE_MS) { x = to; continue; }
        x = from + (to - from) * easeInOut(elapsed / MOVE_MS);
        sk = movePose(stand, stand, elapsed);
        mirror = elapsed >= EXIT_MS && elapsed < WALK_END ? to < from : false;
      }
      what = reduced ? 'placed, not walked' : 'the rig\'s walk';
    } else {
      what = col.id === 'c8' ? (reduced ? 'hair at rest' : 'hair follows the head') : col.id === 'c9' ? (reduced ? 'locs at rest; the visor has no lids' : 'locs follow; the visor has no lids') : 'blinks on its own';
    }
    return { gesture, outfit, sk, x, mirror, opacity, what };
  }

  function seek(t) {
    const restart = last === null || t < last;
    const dt = restart ? 0 : t - last;
    last = t;
    const part = t >= 8000 ? 2 : t >= 4000 ? 1 : 0;
    caption.textContent = [reduced ? 'Idle, with reduced motion' : 'Idle', reduced ? 'A move, with reduced motion' : 'A move: the rig\'s walk, unchanged', 'Places, views and health'][part];
    sub.textContent = [
      reduced ? 'The blinks stay; the drift and the hair\'s swing stop.' : 'Each blinks on its own schedule and the head drifts; Mira\'s hair and Echo\'s locs follow. Echo\'s visor has no lids.',
      reduced ? 'No walk: each figure is placed with the game\'s 80 ms fade. Blinks stay; no drift, no swing.' : 'Exit 120 ms, walk 450 ms (stride 17), arrive 330 ms: the game\'s move. The hanging hair trails it and settles.',
      'The rig\'s gestures: the Hospital gown, the Jail\'s suit, Injured, Eliminated, looking down, turned away.',
    ][part];
    stage.querySelector('.clock').textContent = `${(t / 1000).toFixed(2)} s`;
    const dip = Math.min(1, Math.abs(t - 8000) / 120);
    cols.forEach((col, i) => {
      const s = columnAt(col, i, t);
      col.fig.show(s.sk, s.outfit, s.gesture);
      col.actor.dataset.mirror = String(s.mirror);
      col.actor.style.transform = `translateX(${s.x.toFixed(2)}px)`;
      col.actor.style.opacity = String(s.opacity * dip);
      col.what.textContent = s.what;
      // The hanging hair follows the head: its position in the head's own frame, the figure's travel included.
      const world = [s.x * unitsPerPx, 0], head = s.sk.head;
      if (restart || !col.acc) { col.follow.reset(); col.acc = { world, head, local: [head[0], head[1]] }; }
      const sign = s.mirror ? -1 : 1;
      col.acc.local = [col.acc.local[0] + sign * (world[0] - col.acc.world[0]) + (head[0] - col.acc.head[0]), col.acc.local[1] + (head[1] - col.acc.head[1])];
      col.acc.world = world; col.acc.head = head;
      const follow = reduced ? null : col.follow.step(dt, col.acc.local[0], col.acc.local[1]);
      const moving = t >= 4000 && t < 8000 && !reduced;
      const motion = crewMotion(t, col.id, { reduced, still: isStill(s.gesture), follow: moving ? follow : null });
      col.fig.frame(s.sk, motion);
    });
  }

  /** Desktop timings of the three ways to draw a frame (JS and DOM, not paint). Not a phone. */
  function measure() {
    const host = el('div', 'actor');
    host.style.cssText = 'position:absolute;left:-9999px;top:0;width:260px;height:260px';
    document.body.append(host);
    const slots = CREW_ORDER.map((id, i) => { const n = el('div', 'actor'); host.append(n); return { id, c: CREW[id], n, f: mountFigure(n, CREW[id], `ms-${i}`) }; });
    const time = (frames, draw) => { const t0 = performance.now(); for (let f = 0; f < frames; f += 1) { draw(f); host.getBoundingClientRect(); } return (performance.now() - t0) / frames; };
    const rebuild = time(32, f => slots.forEach(s => { s.n.innerHTML = dressedFigureSvg(s.c, walkPose(f / 13.5), { outfit: 'crew', prefix: `rb-${s.id}`, art: ART, live: true }); }));
    const rebuildInline = time(32, f => slots.forEach(s => { s.n.innerHTML = dressedFigureSvg(s.c, walkPose(f / 13.5), { outfit: 'crew', prefix: `ri-${s.id}` }); }));
    const old = time(32, f => slots.forEach(s => { s.n.innerHTML = oldFigureSvg(OLD_CREW[s.id] ?? Object.values(OLD_CREW).find(o => o.sign === s.c.sign), walkPose(f / 13.5), { outfit: 'crew', prefix: `ro-${s.id}` }); }));
    slots.forEach(s => { s.n.innerHTML = ''; });
    for (let p = 0; p < 16; p += 1) slots.forEach(s => s.f.show(walkPose(p / 16), 'crew', 'stand'));
    const cached = time(32, f => slots.forEach(s => { const sk = walkPose(Math.round((f / 13.5) * 16) / 16); s.f.show(sk, 'crew', 'stand'); s.f.frame(sk, crewMotion(f * 33, s.id)); }));
    slots.forEach(s => s.f.show(stand, 'crew', 'stand'));
    const live = time(64, f => slots.forEach(s => s.f.frame(stand, crewMotion(f * 33, s.id))));
    host.remove();
    const r = v => Math.round(v * 100) / 100;
    return { figures: 9, msPerFrame: { oldRigRebuild: r(old), rebuildInlineArt: r(rebuildInline), rebuildSharedArt: r(rebuild), cachedPosesWithLiveFrame: r(cached), liveFrameOnly: r(live) }, note: 'Desktop Chrome on the render machine: JavaScript and DOM time per frame for nine figures, layout forced, paint not included. Not a phone measurement.' };
  }
  window.__crew = { ready: true, seek, measure };
  seek(0);
}

// ---------- the compare view ----------
async function compareView() {
  const json = async url => (await fetch(url)).json();
  const [shipped, release] = await Promise.all([json('../exports/asset-manifest.json'), json('./assets/manifest.json')]);
  const piece = shipped.assets.find(a => a.id === 'piece-crew');
  const oldUrl = variant => `../${piece.variants.find(v => v.variant === variant).path.replace(/^design\//, '')}`;
  const newUrl = (kind, id) => `./${release.assets.find(a => a.kind === kind && a.character === id).path.replace(/^design\/crew-drawing\//, '')}`;
  const oldDevice = name => `../${shipped.assets.find(a => a.id === `device-${name}`).variants.find(v => v.variant === 'held').path.replace(/^design\//, '')}`;
  const newDevice = name => `./assets/roles/device-${name}.held.svg`;
  const oldOf = id => OLD_CREW[id];
  const figure = (draw, c, gesture, outfit, size, prefix, dark = false) => {
    const sk = skeletonOf(gesture);
    const prop = propOf(gesture) ? `<span>${propSvg(propOf(gesture), sk)}</span>` : '';
    const front = hasFront(sk) ? `<span>${draw(c, sk, { outfit, prefix: `${prefix}-f`, layer: 'front' })}</span>` : '';
    return `<div class="fig${dark ? ' dark' : ''}" style="width:${size}px;height:${size}px">${prop}<span>${draw(c, sk, { outfit, prefix: `${prefix}-b` })}</span>${front}</div>`;
  };
  const rows = (title, note, build) => {
    const s = el('section', '', `<h2>${title}</h2><div class="pair"><b>today</b><div class="strip">${build('old')}</div><b>release</b><div class="strip">${build('new')}</div></div>${note ? `<p class="note">${note}</p>` : ''}`);
    app.append(s);
  };
  const draw = side => (side === 'old' ? oldFigureSvg : dressedFigureSvg);
  const who = (side, id) => (side === 'old' ? oldOf(id) : CREW[id]);
  const cell = (inner, label) => `<div class="cell">${inner}<small>${label}</small></div>`;
  app.append(el('header', '', `<h1>The crew drawing release: today and the release</h1><p>${CREW_DRAWING_VERSION}. Every surface that shows a character, drawn by today's modules and assets and by the release's, at the sizes the game uses. Same skeletons, same gestures, same places: only the drawing changes.</p>`));
  rows('On the board: standing', 'The rig\'s stand, in the crew suit, at a board room\'s size.', side => CREW_ORDER.map((id, i) => cell(figure(draw(side), who(side, id), 'stand', 'crew', 118, `b${side}${i}`), CREW[id].sign)).join(''));
  rows('At work and turned away', 'Room A and B gestures with their props; a back view.', side => [['c1', 'think'], ['c2', 'tablet'], ['c3', 'crouchHatch'], ['c4', 'leanCrates'], ['c6', 'laptopStool'], ['c7', 'microscope'], ['c5', 'standBack'], ['c9', 'tankBack']]
    .map(([id, g], i) => cell(figure(draw(side), who(side, id), g, 'crew', 128, `w${side}${i}`), `${CREW[id].sign}: ${g}`)).join(''));
  rows('The Hospital and the Jail', 'What is worn follows the public location (outfitFor): the gown in the Hospital, the banded suit in the Jail.', side => [['c5', 'ivPole', 'gown'], ['c8', 'wheelchair', 'gown'], ['c2', 'bedSitting', 'gown'], ['c7', 'benchHunched', 'prison'], ['c8', 'wallLean', 'prison'], ['c1', 'doorBack', 'prison'], ['c3', 'floorSit', 'prison']]
    .map(([id, g, o], i) => cell(figure(draw(side), who(side, id), g, o, 128, `h${side}${i}`), `${CREW[id].sign}: ${g}, ${o}`)).join(''));
  rows('Health', 'Injured: the bandage, and the sling where the gesture has one. Eliminated: down on the deck, slumped, or still where it sits (+still), the eyes shut.', side => [['c3', 'stand+injured', 'crew'], ['c6', 'benchSling+injured', 'gown'], ['c4', 'down', 'crew'], ['c2', 'slumpBench', 'crew'], ['c9', 'benchSling+still', 'gown'], ['c8', 'bedLying', 'gown']]
    .map(([id, g, o], i) => cell(figure(draw(side), who(side, id), g, o, 128, `d${side}${i}`), `${CREW[id].sign}: ${g}`)).join(''));
  rows('The walk, at the capsule\'s size', 'The rig\'s walk (stride 17) at four phases, small, as the capsule and a move show it.', side => CREW_ORDER.slice(0, 6).map((id, i) => cell(`<div class="fig dark" style="width:64px;height:64px"><span>${draw(side)(who(side, id), walkPose(i / 6), { outfit: 'crew', prefix: `k${side}${i}` })}</span></div>`, CREW[id].sign)).join(''));
  rows('The phone kit\'s vote stage', 'Standing figures at the vote result\'s size.', side => ['c8', 'c6', 'c4', 'c9'].map((id, i) => cell(figure(draw(side), who(side, id), 'stand', 'crew', 76, `v${side}${i}`, true), CREW[id].sign)).join(''));
  rows('Cards in every crop the game uses', 'Left to right: the picker (5 rem), a lobby slot, the phone kit\'s avatar (30 px circle, 50% 22% / 175%), an ability chip (the same crop), the trial cast (30 x 34), the dossier photo (80 x 92 window, center bottom / cover), the role card with a held device.', side => CREW_ORDER.map(id => {
    const card = side === 'old' ? oldUrl(`card-${id}`) : newUrl('card', id);
    const device = ['officer', 'insider', 'cracker', 'blue-disabler', 'supplier', 'undercover', 'hacker', 'red-disabler', 'alien'][CREW_ORDER.indexOf(id)];
    const dev = side === 'old' ? oldDevice(device) : newDevice(device);
    return cell(`<div style="display:flex;gap:5px;align-items:flex-end"><div class="crop-option" style="background-image:url('${card}')"></div><div class="crop-slot" style="background-image:url('${card}')"></div><div class="crop-who" style="background-image:url('${card}')"></div><div class="crop-chip"><i style="background-image:url('${card}')"></i></div><div class="crop-cast" style="background-image:url('${card}')"></div><div class="crop-photo"><i style="background-image:url('${card}')"></i></div><div class="crop-role" style="--person:url('${card}');--device:url('${dev}')"></div></div>`, `${CREW[id].sign}`);
  }).slice(0, side === 'old' ? 9 : 9).join(''));
  rows('Standees', 'The board\'s piece: the card in the stand. The stand, the clamp and every anchor are today\'s.', side => CREW_ORDER.map(id => cell(`<div class="crop-standee" style="background-image:url('${side === 'old' ? oldUrl(`standee-${id}`) : newUrl('standee', id)}')"></div>`, CREW[id].sign)).join(''));
  const films = el('section', '', '<h2>The films\' effects</h2><div id="films"><p class="note">Put in by the render tool (the runtime\'s memorialSvg, outlineSvg and halftoneSvg).</p></div>');
  app.append(films);
  const icons = el('section', '', `<h2>The app icons (new)</h2><div class="strip">${CREW_ORDER.map(id => cell(`<div class="icon">${crewPortraitSvg(CREW[id], { prefix: `ic-${id}` })}</div>`, CREW[id].sign)).join('')}</div>`);
  app.append(icons);
  await Promise.all([...document.images].map(img => img.decode?.().catch(() => null)));
  window.__crew = {
    ready: true,
    films({ old, release: next }) {
      const strip = list => list.map(([label, svg]) => cell(`<div class="fig" style="width:120px;height:120px"><span>${svg}</span></div>`, label)).join('');
      document.getElementById('films').innerHTML = `<div class="pair"><b>today</b><div class="strip">${strip(old)}</div><b>release</b><div class="strip">${strip(next)}</div></div><p class="note">The history's memorial (a grey cut-out) and the Clone's dotted outline and halftone duplicate, made by the runtime's own effects from the figure, standing. The live films make these from the drop-in; the release does not bake them.</p>`;
    },
  };
}

if (view === 'compare') compareView(); else motionView();
