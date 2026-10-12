// Runtime geometry port; Designer 49f0db4d34d2a2a418f669a13bed660fc665b1b6; source SHA256 56a1cfcd9c838ab65c4c381a334acee083d5698f5d1099fba69102dfd3adbeb6.

import { FRAME } from './body.mjs';
import { skeletonOf } from './gestures.mjs';
import { PRESS, frameScene, pressPoint, toScene } from './frame.mjs';
import { SCENES } from './scenes.mjs';
const [BOX_X, BOX_Y, BOX] = FRAME.box;
const [ANCHOR_X, ANCHOR_Y] = FRAME.anchor;
const STAND_HEIGHT = ANCHOR_Y - 19;
const JOINTS = ['head', 'neck', 'pelvis', 'sN', 'eN', 'wN', 'sF', 'eF', 'wF', 'hipN', 'kN', 'aN', 'hipF', 'kF', 'aF'];
const pressSize = unit => Math.max(PRESS, Math.min(64, 0.26 * STAND_HEIGHT * unit));
export function geometry(place, { width, height, cap, pad }) {
  const sk = skeletonOf(place.gesture);
  if (place.kind === 'place') {
    const scene = SCENES[place.room];
    const { k, tx, ty } = frameScene(scene, { width, height, cap, pad });
    const slot = { at: place.at, scale: place.scale, mirror: place.mirror };
    const unit = place.scale * k;
    const [ax, ay] = [tx + place.at[0] * k, ty + place.at[1] * k];
    // The press area is the place's (its own gesture's), whatever the character there is drawn doing.
    const [px, py] = toScene(slot, pressPoint(skeletonOf(place.pressGesture ?? place.gesture))).map((v, i) => (i ? ty : tx) + v * k);
    const [hx, hy] = toScene(slot, sk.head).map((v, i) => (i ? ty : tx) + v * k);
    return { unit, anchor: [ax, ay], left: ax - (ANCHOR_X - BOX_X) * unit, top: ay - (ANCHOR_Y - BOX_Y) * unit, side: BOX * unit, press: [px, py], head: [hx, hy], frame: { k, tx, ty } };
  }
  /** The figure standing on (ax, ay) at unit pixels per figure unit. */
  const standing = (ax, ay, unit) => {
    const at = ([x, y]) => [ax + (place.mirror ? ANCHOR_X - x : x - ANCHOR_X) * unit, ay + (y - ANCHOR_Y) * unit];
    return { unit, anchor: [ax, ay], left: ax - (ANCHOR_X - BOX_X) * unit, top: ay - (ANCHOR_Y - BOX_Y) * unit, side: BOX * unit, press: at(pressPoint(sk)), head: at(sk.head), frame: null };
  };
  // One figure on the panel's floor, as large as the panel lets it be, centred: the vocabulary sheet.
  if (place.kind === 'solo') {
    const xs = JOINTS.map(joint => sk[joint][0]);
    const [lo, hi] = [Math.min(...xs) - 28, Math.max(...xs) + 28];
    const unit = Math.min(((height - cap - pad) * 0.92) / STAND_HEIGHT, (width * 0.94) / (hi - lo));
    return standing(width / 2 - ((lo + hi) / 2 - ANCHOR_X) * unit * (place.mirror ? -1 : 1), height - pad, unit);
  }
  // A crowd of six or more (layout stress) or the Final Zone: rows from the panel's floor up.
  const rows = place.kind === 'final' ? 2 : 3;
  const area = height - cap - pad;
  const pitch = Math.max(PRESS + 2, Math.min(78, (area - PRESS) / Math.max(1, rows - 1)));
  const press = [place.at[0] * width, height - pad - PRESS / 2 - place.at[1] * pitch];
  const unit = (Math.min(pitch * 1.9, area * 0.95) / STAND_HEIGHT) * place.depth;
  const p = pressPoint(sk);
  return standing(press[0] + (place.mirror ? p[0] - ANCHOR_X : ANCHOR_X - p[0]) * unit, press[1] + (ANCHOR_Y - p[1]) * unit, unit);
}

/** A press area in a panel: its side, on the figure, moved inward to stay whole on screen and clear of the caption. */
export function pressRect(g, { width, height, cap, pad }) {
  const side = pressSize(g.unit);
  const left = Math.min(width - side, Math.max(0, g.press[0] - side / 2));
  const top = Math.min(height - pad - side, Math.max(cap, g.press[1] - side / 2));
  return { left, top, side };
}

