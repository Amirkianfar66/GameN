// #231's layer order/compositor, using named baked operators and a still back.
// A pose is presentation data. This module runs no rules, clock, RNG or fixtures.
import {BLADE, BOX, CARRIAGE, CRATE, stopX} from './food-geometry.mjs';
import * as M from './food-machine.mjs';

export const foodRestPose = () => ({
 panel: {at: 0, blade: BLADE.locked, wheel: 0, drum: 0, lit: 0},
 crate: {x: stopX(0), y: 658, tilt: 0, hooked: true}, hookY: null, slack: 0,
 cab: {lamp: false, key: false, cut: false, buffer: 0},
 console: {lamp: false, key: false, locked: true, near: 0},
 platform: {drop: 0, clamp: false, lamp: false}, alive: {winch: true, panel: true},
 wrecks: [], effects: [], line: null, dim: 0,
});
const attribute = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const picture = url => url ? `<image href="${attribute(url)}" x="0" y="0" width="1024" height="768"/>` : '';

/** Every asset URL comes from the uniformly loaded, named Food catalogue. */
export function foodSceneSvg(pose, {assets = null, characters = {}, prefix = 'food-scene', crop = [16, 40, 992, 696]} = {}) {
 if (!/^[a-z][a-z0-9-]*$/.test(prefix)) throw TypeError('A scene needs a local drawing prefix');
 const cv = M.inkCanvas(prefix), px = stopX(pose.panel.at);
 M.festoon(cv, px);
 M.platform(cv, {drop: pose.platform.drop, clamp: pose.platform.clamp, lampLit: pose.platform.lamp, part: 'base'});
 M.cabBack(cv);
 cv.raw(picture(assets?.operator('winch', characters.winch, !pose.alive.winch)));
 M.cabFront(cv, {cut: pose.cab.cut, lampLit: pose.cab.lamp, key: pose.cab.key, buffer: pose.cab.buffer});
 cv.raw(picture(assets?.operator('panel', characters.panel, !pose.alive.panel)));
 M.consoleFront(cv, {lampLit: pose.console.lamp, key: pose.console.key, locked: pose.console.locked, near: pose.console.near});
 M.stopPlates(cv, {lit: pose.panel.lit});
 M.carriage(cv, px, {blade: pose.panel.blade, wheel: pose.panel.wheel, drum: pose.panel.drum});
 const pivot = [px, CARRIAGE.pivot], c = pose.crate;
 if (c?.hooked) {
  const eye = [c.x + Math.sin(c.tilt) * (CRATE / 2 + 6), c.y - Math.cos(c.tilt) * (CRATE / 2 + 6)];
  M.cable(cv, pivot, [eye[0] + Math.sin(c.tilt) * 34, eye[1] - Math.cos(c.tilt) * 34], {slack: pose.slack});
  M.hook(cv, eye[0], eye[1], {engaged: true, tilt: c.tilt});
 } else {
  const hy = pose.hookY ?? 300;
  M.cable(cv, pivot, [px, hy - 34]); M.hook(cv, px, hy, {engaged: false});
 }
 if (pose.line) M.dropLine(cv, pose.line.from, pose.line.to, {tone: pose.line.tone, t: pose.line.t ?? 1});
 for (const w of pose.wrecks ?? []) {
  if (w.whole) M.crate(cv, w.x, w.y, {tilt: w.tilt});
  else M.wreck(cv, w.x, w.y, {seed: w.seed, flip: w.flip, compact: w.on === 'console'});
 }
 if (c) M.crate(cv, c.x, c.y, {tilt: c.tilt});
 M.platform(cv, {drop: pose.platform.drop, clamp: pose.platform.clamp, part: 'jaws'});
 for (const e of pose.effects) {
  if (e.kind === 'letters') M.letters(cv, e.text, e.at, e);
  else if (e.kind === 'burst') M.burst(cv, e.at, e.r, e.t, e);
  else if (e.kind === 'speed') M.speed(cv, e.at, e.dir, e);
  else if (e.kind === 'clunk') M.clunk(cv, e.at, e.dir, e.t);
  else if (e.kind === 'brake') M.brake(cv, e.at);
  else if (e.kind === 'warn') M.warnMark(cv, e.at, e.t ?? 1);
 }
 if (pose.dim > 0) cv.raw(`<rect width="${BOX[0]}" height="${BOX[1]}" fill="#10141C" opacity="${(pose.dim * 0.55).toFixed(3)}"/>`);
 const [vx, vy, vw, vh] = crop;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" aria-hidden="true"><rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#10141C"/>${picture(assets?.back)}<defs>${cv.defs()}</defs>${cv.layer('body')}</svg>`;
}
