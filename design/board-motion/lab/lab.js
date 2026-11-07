// mothership:dev-only
//
// The figure lab: draws gestures and scenes from the figure and scene modules, to author and
// review them. Development only; nothing here is part of the prototype's board.
//   ?g=stand,think        gestures, one row each, for every character (or ?c=c1,c2)
//   ?scene=room-a         a room scene at its full 1024 x 768, its places taken by ?c=
//   ?scene=room-a&panel=180x330   the same scene framed as a phone panel of that size
//   ?strip=hitDown&g=consoleBack&c=c1   an animation as a row of frames (exit, arrive, hitStay, hitHurt, hitDown, walk)
// The scenes are drawn from their generated layers (design/tools/board-motion-assets.mjs writes them).

import { CREW } from '../figures/crew.mjs';
import { FRAME, figureSvg } from '../figures/body.mjs';
import { GESTURES, skeletonOf } from '../figures/gestures.mjs';
import { SCENES } from '../scenes/index.mjs';
import { PRESS, frameScene, slotGeometry } from '../scenes/frame.mjs';
import { DOWN, TIMELINES, falling, hurt, jolt, sample, walkPose } from '../figures/motion.mjs';

const params = new URLSearchParams(location.search);
const list = (name, all) => (params.get(name) ? params.get(name).split(',') : all);
const lab = document.getElementById('lab');
const [boxX, boxY, boxW, boxH] = FRAME.box;
const [anchorX, anchorY] = FRAME.anchor;

function figure(id, gesture, prefix) {
  const sk = GESTURES[gesture.split('+')[0]] ? skeletonOf(gesture) : { down: DOWN, hurt: hurt(), falling: falling() }[gesture];
  if (!sk) return `<b>no gesture ${gesture}</b>`;
  return figureSvg(CREW[id], sk, { prefix: `${prefix}-b` }) + figureSvg(CREW[id], sk, { prefix: `${prefix}-f`, layer: 'front' });
}

if (params.get('strip')) {
  // ?strip=exit|arrive|hitStay|hitHurt|hitDown|walk&g=gesture&c=c1&frames=8: an animation as a row of frames;
  // ?to= the gesture a hit ends in (a place's fall, or the gesture marked +injured), as the director plays it.
  const kind = params.get('strip');
  const g = skeletonOf(params.get('g') ?? 'stand');
  const to = params.get('to') ? skeletonOf(params.get('to')) : undefined;
  const ids = list('c', ['c1']);
  const frames = Number(params.get('frames') ?? 8);
  const beats = { opening: 240, accent: 260, settle: 400 };
  const keys = kind === 'walk' ? null : kind === 'hitDown' ? TIMELINES.hitDown(g, beats, to, 80) : kind === 'hitStay' ? TIMELINES.hitStay(g, to ?? g, 320, 400)
    : TIMELINES[kind](g, kind === 'exit' ? 120 : kind === 'arrive' ? 330 : 320);
  const total = keys ? keys[keys.length - 1].at : 1;
  lab.style.setProperty('--cell', `${params.get('cell') ?? 150}px`);
  for (const id of ids) {
    const row = document.createElement('div');
    row.className = 'lab-row';
    row.innerHTML = `<div class="lab-label">${kind}<br>${params.get('g') ?? ''}</div>`;
    for (let i = 0; i < frames; i += 1) {
      const t = i / (frames - 1);
      const sk = keys ? sample(keys, t * total) : walkPose(t * (frames - 1) / frames, { limp: Number(params.get('limp') ?? 0) });
      const cell = document.createElement('div');
      cell.className = 'lab-cell';
      cell.innerHTML = figureSvg(CREW[id], sk, { prefix: `s${i}-${id}-b` }) + figureSvg(CREW[id], sk, { prefix: `s${i}-${id}-f`, layer: 'front' }) + `<span class="lab-cap">${keys ? Math.round(t * total) + ' ms' : (t * (frames - 1) / frames).toFixed(2)}</span>`;
      row.append(cell);
    }
    lab.append(row);
  }
} else if (params.get('scene')) {
  const scene = SCENES[params.get('scene')];
  const characters = list('c', Object.keys(CREW));
  const [pw, ph] = (params.get('panel') ?? '').split('x').map(Number);
  // Scene units to pixels: the whole picture, or a phone panel's framing of its focus.
  let k = 1, tx = 0, ty = 0, width = 1024, height = 768;
  if (pw) ({ k, tx, ty } = frameScene(scene, { width: pw, height: ph, cap: Number(params.get('cap') ?? 44) })), width = pw, height = ph;
  const stage = document.createElement('div');
  stage.className = 'lab-stage';
  Object.assign(stage.style, { width: `${width}px`, height: `${height}px` });
  const layerFile = id => id.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  const picture = (file, z) => `<img src="../assets/scenes/${scene.room}.${layerFile(file)}.svg" alt="" style="position:absolute;left:${tx}px;top:${ty}px;width:${1024 * k}px;height:${768 * k}px;z-index:${z}">`;
  stage.innerHTML = picture('back', 0) + Object.entries(scene.layers ?? {}).map(([id, layer]) => picture(id, Math.round(layer.depth) * 2 + 1)).join('');
  scene.slots.forEach((slot, index) => {
    const id = characters[index % characters.length];
    const s = slot.scale * k;
    const el = document.createElement('div');
    el.className = 'lab-figure';
    Object.assign(el.style, {
      left: `${tx + slot.at[0] * k - (anchorX - boxX) * s}px`, top: `${ty + slot.at[1] * k - (anchorY - boxY) * s}px`,
      width: `${boxW * s}px`, height: `${boxH * s}px`, zIndex: String(Math.round(slot.depth ?? slot.at[1]) * 2),
      transform: slot.mirror ? 'scaleX(-1)' : '', transformOrigin: `${((anchorX - boxX) / boxW) * 100}% 0`,
    });
    const sk = GESTURES[slot.gesture];
    el.innerHTML = figureSvg(CREW[id], sk, { prefix: `${slot.id}-${id}-b` });
    stage.append(el);
    if ((sk.front ?? []).length) {
      // What lies over the place's prop: above every layer of the scene up to the next figure.
      const front = el.cloneNode(false);
      front.innerHTML = figureSvg(CREW[id], sk, { prefix: `${slot.id}-${id}-f`, layer: 'front' });
      front.style.zIndex = String(Math.round(slot.depth ?? slot.at[1]) * 2 + 140);
      stage.append(front);
    }
    if (params.get('press') === 'on') {
      const g = slotGeometry(slot);
      const box = document.createElement('span');
      box.className = 'lab-press';
      Object.assign(box.style, { left: `${tx + g.press[0] * k - PRESS / 2}px`, top: `${ty + g.press[1] * k - PRESS / 2}px`, width: `${PRESS}px`, height: `${PRESS}px` });
      stage.append(box);
    }
    if (params.get('labels') !== 'off') {
      const tag = document.createElement('span');
      tag.className = 'lab-slot';
      tag.textContent = `${slot.id} ${id}`;
      Object.assign(tag.style, { left: `${tx + slot.at[0] * k}px`, top: `${ty + slot.at[1] * k}px` });
      stage.append(tag);
    }
  });
  lab.append(stage);
} else {
  const gestures = list('g', Object.keys(GESTURES));
  const characters = list('c', Object.keys(CREW));
  lab.style.setProperty('--cell', `${params.get('cell') ?? 150}px`);
  for (const g of gestures) {
    const row = document.createElement('div');
    row.className = 'lab-row';
    row.innerHTML = `<div class="lab-label">${g}</div>`;
    for (const id of characters) {
      const cell = document.createElement('div');
      cell.className = 'lab-cell';
      cell.innerHTML = figure(id, g, `${g}-${id}`) + `<span class="lab-cap">${id}</span>`;
      row.append(cell);
    }
    lab.append(row);
  }
}
window.__designReady = true;
