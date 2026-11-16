// The boarding film, version 2: runtime source, Designer's. The ten seconds every player sees before Round 1, in the
// approved place, crew and ink, restaged for the owner's word of 15 November 2026 ("more like AAA animation
// cinematic"): six shots with a camera that moves through depth, light that lands on the crew, a build before each
// event, and a way of playing a phone can hold. pregame-boarding-1.0.0 stays as released; this is a new version beside it.
//
//   dusk     0-2 s      a crane down from the ringed giant to the ship, the crew small on the ground, walking in
//   foot     2-3.6 s    low at the ramp's foot: the first four climb away into the doorway's light, shadows reaching back
//   faces    3.6-5.4 s  beside the next two as they climb: their faces warming as the entrance nears, the sunset behind
//   door     5.4-6.55 s the last aboard stops at the sill and looks back; steps in; the ramp draws up, the door comes
//                       down and seals amber
//   wake     6.55-6.9 s the whole ship under the giant: its ports light front to back, its engines wake
//   inside   6.9-10 s   the dark corridor, the doorway's light thin on the crew's heads and shoulders; the lights wake
//                       far to near and each head lifts;
//                       the consoles start; the Game N mark lands; ink to the night by 9,960 ms
//
// The clock is the server's. `paint(t)` draws the film at `t` ms after the boarding interval's `startsAt`; nothing here
// advances the game, and the film's end means nothing. Between two paints the scene keeps the picture moving from the
// last time it was given, at the screen's rate; it stops by itself when the paints stop. Its only input is the public
// roster (the hosted game's roster.mjs): seats and characters, in seat order. Nothing private reaches a picture.
//
// How it plays: every picture is drawn once into memory (engine.mjs), and a frame places pictures and light on one
// canvas. No SVG is written, parsed or filtered while the film runs. The crew moves on twos (twelve drawings a
// second, as drawn animation does); the camera, the light and the air move at the screen's rate.

import { publicRoster } from '../../../../apps/game/hosted/pregame-films/boarding/roster.mjs';
import { clamp, clamp01, ease, hash, lerp, noise, progress, shake, smooth, smoother } from '../../../../apps/game/hosted/pregame-films/kit/math.mjs';
import { CREW_HEAD_SCALE, HELD, LOOKS, backPose, bodyBox, bodySprite, climbPose, createCaster, headBox, headSprite, partBox, partSprite, stridePose } from './cast.mjs';
import { LAMPS, lampAt, lampOver, paintCone, paintHall, paintLamp } from './corridor.mjs';
import { SET, WALL_BOX, paintBeyond, paintGlare, paintHalo, paintInterior, paintLamp as paintDoorLamp, paintRails, paintRampFront, paintSlab, paintTrim, paintUnderside, rampY, wallArt } from './doorway.mjs';
import { NIGHT, createBakery, createLight, glow, grainAt, grainTile, lens, motes, place, plane, puff, rgba, seen, sprite, streak, wash, within } from './engine.mjs';
import { DEPTH, DOOR, GROUND, RAMP, SHIP_BOX, SPILL, dotTile, paintDoor, paintDoorway, paintForeground, paintGiant, paintGround, paintHaze, paintHullClose, paintHullLights, paintMesas, paintRamp, paintSky, paintSpill, shipArt } from './exterior.mjs';
import { createMark, markSprites, paintTide } from './mark.mjs';

export const BOARDING_FILM_VERSION = 'pregame-boarding-2.0.0';
export const BOARDING_MS = 10000;
/** The film's words for a screen reader, as version 1's. The player that hosts the film says them. */
export const BOARDING_TEXT = 'The crew boards the ship.';
export const VARIANTS = Object.freeze(['full', 'reduced']);

/** The shots, in ms. The cuts at 2,000 and 6,900 and the mark's beats are version 1's. */
export const SHOTS = Object.freeze({
  dusk: Object.freeze([0, 2000]),
  foot: Object.freeze([2000, 3600]),
  faces: Object.freeze([3600, 5400]),
  door: Object.freeze([5400, 6550]),
  wake: Object.freeze([6550, 6900]),
  inside: Object.freeze([6900, 10000]),
});
/** The door's beats: the last aboard looks back, steps in; a held breath; the ramp, the slab, the slam, the seal. */
export const DOOR_BEATS = Object.freeze({ look: Object.freeze([5860, 6060]), in: Object.freeze([6060, 6210]), ramp: Object.freeze([6230, 6400]), slab: Object.freeze([6320, 6420]), slam: 6420, seal: Object.freeze([6430, 6550]) });
export const HULL_WAKE = Object.freeze({ ports: Object.freeze([6570, 6830]), engines: Object.freeze([6620, 6880]) });
export const INSIDE = Object.freeze({ seal: Object.freeze([6900, 7400]), lights: Object.freeze([7050, 8150]), systems: Object.freeze([7600, 8700]) });
export const TITLE = Object.freeze({ stamp: Object.freeze([9000, 9280]), hit: 9280, sheen: Object.freeze([9320, 9620]), tide: Object.freeze([9600, 9950]), night: 9960 });
/** Reduce motion: five held pictures, each fading in from the night over 160 ms, then a fade to the night (version 1's times). */
export const STILLS = Object.freeze([
  Object.freeze({ at: 0, moment: 1900 }),
  Object.freeze({ at: 2400, moment: 3050 }),
  Object.freeze({ at: 5200, moment: 5980 }),
  Object.freeze({ at: 6900, moment: 8800 }),
  Object.freeze({ at: 8900, moment: 9580 }),
]);
export const STILL_FADE_MS = 160;
export const STILL_OUT = Object.freeze([9700, 9960]);
/** The scene stops moving by itself this long after the last paint it was given. */
export const COAST_MS = 500;
/** The most memory the film's pictures may hold, in bytes: past it, the crew's pictures are drawn less sharp. */
export const MEMORY_BUDGET = 112 * 1024 * 1024;

export const shotOf = t => Object.keys(SHOTS).find(id => t < SHOTS[id][1]) ?? 'inside';

/** The frame at `t`: the moment drawn, its shot, and (Reduce motion) the held picture and its fade. */
export function boardingFrame(t, { variant = 'full' } = {}) {
  if (!VARIANTS.includes(variant)) throw new Error(`No boarding variant ${variant}`);
  const time = clamp(Number.isFinite(t) ? t : 0, 0, BOARDING_MS);
  if (variant === 'reduced') {
    const index = Math.max(0, STILLS.findLastIndex(s => time >= s.at)), still = STILLS[index];
    const fade = clamp01((time - still.at) / STILL_FADE_MS) * (1 - clamp01((time - STILL_OUT[0]) / (STILL_OUT[1] - STILL_OUT[0])));
    return { t: time, at: still.moment, reduced: true, still: index, fade, shot: shotOf(still.moment), night: time >= TITLE.night };
  }
  return { t: time, at: time, reduced: false, still: null, fade: 1, shot: shotOf(time), night: time >= TITLE.night };
}

// ── The crew's clock ─────────────────────────────────────────────────

const STEP = 1000 / 12;
/** The crew's drawings change twelve times a second. */
const twos = t => Math.floor(t / STEP) * STEP;
const PHASES = 8;
const FIG = 0.53; // a figure's units in the exterior's: the approved boarding's near lane
const LANES = Object.freeze([{ dy: 10, scale: FIG }, { dy: -8, scale: 0.47 }]);
const STRIDE_MS = 900, CLIMB_MS = 800;
const phaseIndex = phase => ((Math.floor(phase * PHASES) % PHASES) + PHASES) % PHASES;

/** The picture of a cycle's pose nearest `phase` that is drawn already: [picture, its index], or null. */
function poseOf(assets, prefix, phase) {
  const j = phaseIndex(phase);
  for (let d = 0; d <= PHASES / 2; d += 1) for (const q of d ? [j + d, j - d] : [j]) {
    const index = ((q % PHASES) + PHASES) % PHASES, s = assets.get(`${prefix}:${index}`);
    if (s) return [s, index];
  }
  return null;
}

/** Who is where: the first four climb in the second shot, the next two are the faces, the rest board last. */
function castOf(roster) {
  return { first: roster.slice(0, 4), pair: roster.slice(4, 6), ahead: roster.slice(6, -1), last: roster.at(-1) };
}

// ── The exterior's shots ─────────────────────────────────────────────

const OUTSIDE_REF = Object.freeze([690, 470]);
/** The exterior's px a unit at its reference camera: the entrance and its ramp fill a tall phone's width. */
const outsideFit = view => Math.min(view.W / 470, view.H / 520);

function duskCamera(t) {
  // Still moving at the cut: the move would settle a little after 2,000 ms.
  const u = smoother((t + 120) / 2380);
  return { x: lerp(704, 664, u), y: lerp(40, 500, u), dolly: lerp(-0.62, 0, u), zoom: 1 };
}
function wakeCamera(t) {
  const u = progress(t, ...SHOTS.wake);
  return { x: lerp(650, 644, u), y: lerp(372, 362, u), dolly: lerp(-1.3, -1.12, u), zoom: 1 };
}

/** The first four on the ground at `t`, walking in toward the ramp: [member, index, x, y, scale]. */
function walkers(t, first) {
  return first.map((member, i) => {
    const lane = LANES[i % 2], pair = Math.floor(i / 2);
    const speed = 100 * lane.scale / STRIDE_MS; // a stride's reach, so no foot slides
    return { member, i, x: 880 + pair * 124 + (i % 2) * 26 + (SHOTS.dusk[1] - t) * speed, y: GROUND + lane.dy, scale: lane.scale, phase: twos(t) / STRIDE_MS + hash(i, 5) };
  }).sort((a, b) => a.scale - b.scale);
}

function drawOutside(ctx, view, cam, t, state, { assets, caster, cast, reduced, L }) {
  const sub = { W: view.W, H: view.H, k: outsideFit(view) };
  const P = p => plane(sub, OUTSIDE_REF, cam, p);
  const ship = P(DEPTH.ship);
  paintSky(ctx, view, P(DEPTH.sky), reduced ? 0 : t);
  paintGiant(ctx, P(DEPTH.giant), t);
  // The low sun, off to the right: its gold on the horizon.
  const far = P(DEPTH.far), near = P(DEPTH.near);
  glow(ctx, far.ox + 1480 * far.s, far.oy + 610 * far.s, 520 * far.s, '#FFD08A', 0.7, { sy: 0.42 });
  paintMesas(ctx, far, 'far');
  paintHaze(ctx, view, far);
  paintMesas(ctx, near, 'near');
  paintGround(ctx, view, near.oy + 646 * near.s, P, assets.get('dots'));
  // The ship's own shadow lying under it.
  glow(ctx, ship.ox + 660 * ship.s, ship.oy + (GROUND + 16) * ship.s, 560 * ship.s, '#050308', 0.6, { sy: 0.1, core: 0.5, mode: 'source-over' });
  place(ctx, assets.get('ship'), ship);
  paintDoorway(ctx, ship, state.light);
  paintRamp(ctx, ship, state.rampUp, state.light);
  paintDoor(ctx, ship, state.doorDown, state.seal);
  // The crew walking in: the doorway on their faces, the sunset on their backs, their shadows long behind them.
  if (state.crew) {
    for (const w of walkers(t, cast.first)) {
      const found = poseOf(assets, `walk:${w.i}`, w.phase), head = assets.get(`walkhead:${w.i}`);
      if (!found) continue;
      const sk = stridePose(found[1] / PHASES), figure = { body: found[0], head, sk };
      const at = [ship.ox + w.x * ship.s, ship.oy + w.y * ship.s], k = w.scale * ship.s;
      caster.shadow(ctx, figure, { at, k, skew: 1.5, length: -0.16, alpha: 0.42 });
      caster.figure(ctx, figure, { at, k });
    }
  }
  paintSpill(L, ship, state.light);
  paintHullLights(ctx, L, ship, { ports: state.ports, engines: state.engines, t: reduced ? 0 : t });
  if (state.light > 0.02) {
    const lit = (x, y) => {
      const wx = (x - ship.ox) / ship.s, wy = (y - ship.oy) / ship.s;
      const dx = SPILL.to[0] - SPILL.from[0], dy = SPILL.to[1] - SPILL.from[1], len2 = dx * dx + dy * dy;
      const s = ((wx - SPILL.from[0]) * dx + (wy - SPILL.from[1]) * dy) / len2;
      if (s < 0 || s > 1) return 0;
      const off = Math.hypot(wx - (SPILL.from[0] + dx * s), wy - (SPILL.from[1] + dy * s)) / (lerp(SPILL.w0, SPILL.w1, s) / 2);
      return off >= 1 ? 0 : (1 - off * off) * (1 - s * 0.7) * 2;
    };
    motes(ctx, { seed: 81, n: 110, t, box: [ship.ox + 300 * ship.s, ship.oy + 300 * ship.s, 900 * ship.s, 420 * ship.s], size: [0.7 * view.px, 2.1 * view.px], color: '#FFEBC8', alpha: 0.9 * state.light, light: lit });
  }
  if (state.front !== false) paintForeground(ctx, P, 1);
  return ship;
}

// ── The foot of the ramp, and the door: the entrance seen from the ramp ──

const doorView = view => ({ ...view, f: 640 * view.u });
function footCamera(t) {
  const v = progress(t, ...SHOTS.foot), e = 0.6 * v + 0.4 * smooth(v);
  return { x: lerp(-12, 0, e), y: lerp(62, 82, e), z: lerp(0, 96, e), tilt: lerp(0.066, 0.056, e) };
}
function doorCamera(t, reduced) {
  const v = progress(t, ...SHOTS.door), e = 0.5 * v + 0.5 * smooth(v);
  const cam = { x: lerp(8, 0, e), y: lerp(292, 300, e), z: lerp(318, 372, e), tilt: 0.03 };
  if (!reduced) cam.shake = shake(t, DOOR_BEATS.slam, { amp: 3.2, ms: 220, seed: 4 }).slice(0, 2);
  return cam;
}
/** The first four on the ramp at `t`, climbing away: the far pair near the top, the near pair below them. */
function climbers(t, first) {
  const since = t - SHOTS.foot[0];
  return first.map((member, i) => {
    const pair = Math.floor(i / 2), side = i % 2 ? 1 : -1;
    const z = (pair ? 432 : 668) + (i % 2) * 16 + since * 0.085;
    return { member, i, x: side * (pair ? 76 : 35), z, y: rampY(z), phase: twos(t) / CLIMB_MS + hash(i, 7) };
  }).sort((a, b) => b.z - a.z);
}
/** The last aboard at `t`: climbing the last steps, stopped at the sill and looking back, then in. */
function lastAboard(t) {
  const { look, in: step } = DOOR_BEATS, top = 764, stop = look[0] - 40;
  // The climb's drawings are its first four (a step and a half), so the last aboard asks for no more than those.
  if (t < stop) { const z = top - (stop - t) * 0.085; return { z, y: rampY(z), mode: 'climb', phase: clamp(0.5 - (stop - twos(t)) / CLIMB_MS, 0, 0.49) }; }
  if (t < step[0]) return { z: top, y: rampY(top), mode: 'still', turn: ease.outCubic(progress(t, stop, look[0] + 120)) };
  const z = top + (t - step[0]) * 0.34;
  return { z, y: rampY(Math.min(z, SET.door)), mode: 'in', phase: clamp((twos(t) - step[0]) / CLIMB_MS, 0, 0.49), gone: progress(t, ...step) };
}

function drawEntrance(ctx, view, cam, t, state, { assets, caster, cast, reduced, L }, shot) {
  const dv = doorView(view), at = lens(dv, cam), live = reduced ? 0 : t;
  paintBeyond(ctx, view, at);
  paintUnderside(ctx, view, at);
  // The wall and what is in its doorway.
  const [wx, wy, ws] = at(0, SET.sill, SET.door), wall = { ox: wx, oy: wy, s: ws };
  place(ctx, assets.get(shot === 'door' ? 'wall-near' : 'wall-far') ?? assets.get('wall-far') ?? assets.get('wall-near'), wall);
  paintInterior(ctx, view, at, state.light);
  // Those already in the doorway's glare, going in.
  if (shot === 'door') {
    cast.ahead.forEach((member, n) => {
      const gone = progress(t, SHOTS.door[0] - 120 + n * 90, SHOTS.door[0] + 220 + n * 90), z = SET.door + 10 + gone * 60;
      const body = assets.get(`ahead:${n}`), head = assets.get(`aheadhead:${n}`);
      if (!body || gone >= 1) return;
      const [X, Y, s] = at((n ? 26 : -22), SET.sill, z);
      caster.figure(ctx, { body, head, sk: backPose(n ? -0.5 : 0.5) }, { at: [X, Y], k: s, alpha: 1 - gone });
    });
  }
  paintHalo(ctx, view, at, state.light, live);
  paintSlab(ctx, view, at, state.doorDown, state.seal);
  paintTrim(ctx, wall, state.seal);
  paintDoorLamp(ctx, view, at, live, state.doorDown >= 1, L);
  paintRampFront(ctx, view, at, cam, state.rampUp, state.light, live, L);
  // The crew on the ramp, far to near, with the far rails behind them and the near ones in front.
  const people = [];
  if (shot === 'foot') for (const c of climbers(t, cast.first)) {
    const found = poseOf(assets, `climb:${c.i}`, c.phase), head = assets.get(`climbhead:${c.i}`);
    if (!found) continue;
    const into = progress(c.z, SET.door - 50, SET.door + 10);
    people.push({ z: c.z, x: c.x, y: c.y, figure: { body: found[0], head, sk: climbPose(found[1] / PHASES) }, into });
  }
  if (shot === 'door') {
    const who = lastAboard(t);
    if (who.mode === 'still') {
      const body = assets.get('last:back'), looking = who.turn > 0.5, blink = !reduced && t > DOOR_BEATS.look[0] + 90 && t < DOOR_BEATS.look[0] + 170;
      const head = assets.get(looking ? (blink ? 'lasthead:shut' : 'lasthead:front') : 'lasthead:back');
      // The head comes round over the shoulder: it leads, the shoulders follow a little.
      if (body) people.push({ z: who.z, x: -8, y: who.y, figure: { body, head, sk: backPose(0.7) }, act: { dx: -3 * who.turn, dy: 1.5 * who.turn, tilt: looking ? 4 : -2 }, alpha: 1 });
    } else {
      const found = poseOf(assets, 'last', who.phase), head = assets.get('lasthead:back');
      if (found) people.push({ z: who.z, x: -8, y: who.y, figure: { body: found[0], head, sk: climbPose(found[1] / PHASES) }, into: who.gone ?? 0 });
    }
  }
  people.sort((a, b) => b.z - a.z);
  const nearest = people.length ? Math.min(...people.map(p => p.z)) : Infinity;
  paintRails(ctx, view, at, cam, state.rampUp, state.light, { from: nearest + 30 });
  for (const p of people) {
    // Going in, a figure is taken by the doorway's light: it stays whole as the glare grows over it, then is gone.
    p.alpha = p.alpha ?? 1 - ease.inQuad(progress(p.into ?? 0, 0.3, 1));
    if (p.alpha <= 0) continue;
    const [X, Y, s] = at(p.x, p.y, p.z);
    if (p.into > 0) glow(L, X, Y - 125 * s, 130 * s, '#FFF1D0', 0.5 * ease.outCubic(p.into) * state.light, { core: 0.2, sy: 1.25 });
    // A shadow thrown back down the ramp at the lens, spreading from the middle.
    if (state.light > 0.05) caster.shadow(ctx, p.figure, { at: [X, Y], k: s, skew: (X - view.W / 2) / (view.W * 0.9), length: 1.05, alpha: 0.55 * state.light * p.alpha });
    caster.figure(ctx, p.figure, { at: [X, Y], k: s, head: p.act, alpha: p.alpha });
  }
  paintRails(ctx, view, at, cam, state.rampUp, state.light, { to: nearest + 30 });
  // Close on the door, less of its light lies between the crew and the lens: the one at the sill stays a dark shape.
  paintGlare(L, view, at, cam, state.light, live, shot === 'door' ? 0.45 : 0.7);
  if (state.light > 0.05) {
    const [gx, gy, gs] = at(0, SET.sill + 120, SET.door);
    const lit = (x, y) => { const dy = (y - gy) / (view.H * 0.9), spread = (0.16 + Math.max(0, dy) * 0.95) * view.W; return dy < -0.12 ? 0 : clamp01(1 - Math.abs(x - gx) / spread) * clamp01(1.15 - Math.max(0, dy)) * 1.6; };
    motes(ctx, { seed: 47, n: 130, t, box: [0, gy - 140 * gs, view.W, view.H], size: [0.8 * view.px, 2.4 * view.px], color: '#FFEBC8', alpha: 0.9 * state.light, light: lit, speed: 0.8 });
  }
  return at;
}

// ── Faces: beside two of the crew as they climb ──────────────────────

const RAMP_ALONG = (() => { const dx = RAMP.foot[0] - RAMP.sill[0], dy = RAMP.foot[1] - RAMP.sill[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; })();
const onRamp = d => [RAMP.sill[0] + RAMP_ALONG[0] * d, RAMP.sill[1] + RAMP_ALONG[1] * d];
const FACES_REF = Object.freeze([680, 510]);
const RAIL_HIGH = 54; // the near rail's top above the deck, in the exterior's units
const faceK = view => 2.6 * view.u; // px a unit of the nearer figure's frame
/** How far down the ramp from the sill the nearer of the two is at `t`. */
const pairAt = t => lerp(150, 51, progress(t, ...SHOTS.faces));
/** The pose their bodies are drawn in: mid-stride, leaning into the climb, the arms hanging to swing. */
const bustPose = () => stridePose(0.25, { slope: 0.5, swing: 0 });

function facesCamera(view, t, reduced) {
  const s = faceK(view) / FIG, [x, y] = onRamp(pairAt(t)), v = progress(t, ...SHOTS.faces);
  const hand = reduced ? [0, 0] : [noise(t * 0.0021, 3) * 1.6 * view.px, noise(t * 0.0026, 9) * 1.3 * view.px];
  return { x: x - lerp(0.07, 0.02, v) * view.W / s, y: y - 105 * FIG - 0.15 * view.H / s, dolly: 0, zoom: 1, shake: hand };
}

function drawFaces(ctx, view, t, { assets, caster, cast, reduced, L }) {
  const s = faceK(view) / FIG, sub = { W: view.W, H: view.H, k: s }, cam = facesCamera(view, t, reduced);
  const P = p => plane(sub, FACES_REF, cam, p), ship = P(1), v = progress(t, ...SHOTS.faces);
  const near = lerp(0.3, 1, ease.inQuad(v)); // the entrance's light, growing as they climb toward it
  // The dusk seen under the hull, behind them: its gold, low.
  const under = ship.oy + 500 * ship.s;
  if (under < view.H) { const g = ctx.createLinearGradient(0, under, 0, under + 200 * ship.s); g.addColorStop(0, '#C26B4C'); g.addColorStop(1, '#F2C27A'); ctx.fillStyle = g; ctx.fillRect(0, under, view.W, view.H - under); }
  paintHullClose(ctx, view, ship, near, L);
  // The entrance ahead, off to the left.
  const door = [ship.ox + (DOOR.x + DOOR.w * 0.7) * ship.s, ship.oy + (DOOR.y + DOOR.h * 0.5) * ship.s];
  glow(ctx, door[0], door[1], 300 * ship.s, '#FFDCA4', 0.8 * near, { core: 0.2 });
  // The two: the farther one ahead, the nearer behind and larger. Bodies on twos; where they are, every frame.
  const beatT = twos(t), d = pairAt(t);
  const people = cast.pair.map((member, n) => {
    const scale = n ? 0.9 : 1, [x, y] = onRamp(d - (n ? 27 : 0)), phase = beatT / 880 + (n ? 0.37 : 0);
    return { n, scale, at: [ship.ox + x * ship.s, ship.oy + y * ship.s], phase };
  }).reverse();
  for (const p of people) {
    const part = name => ({ s: assets.get(`bust:${p.n}:${name}:far`), to: assets.get(`bust:${p.n}:${name}:near`) });
    const trunk = part('trunk'), armF = part('armF'), armN = part('armN');
    if (!trunk.s && !trunk.to) continue;
    const sk = bustPose(), k = faceK(view) * p.scale;
    const beat = Math.cos(Math.PI * 2 * (p.phase - 0.045)), bob = -3.4 * (1 - Math.cos(Math.PI * 4 * p.phase)) / 2;
    // The head rides the body a drawing late, dips as a foot lands, and looks up to the light at the end.
    const late = p.phase - 0.09, nod = -2.6 * (1 - Math.cos(Math.PI * 4 * late)) / 2, lift = ease.outCubic(progress(t, 4750 + p.n * 140, 5150 + p.n * 140));
    const blinkAt = 4180 + p.n * 520, shut = !reduced && t >= blinkAt && t < blinkAt + 100, eyes = shut ? 'shut' : 'open';
    const head = { s: assets.get(`busthead:${p.n}:${eyes}:far`) ?? assets.get(`busthead:${p.n}:open:far`), to: assets.get(`busthead:${p.n}:${eyes}:near`) ?? assets.get(`busthead:${p.n}:open:near`) };
    const layers = [
      { ...armF, pivot: sk.sF, rotate: -19 * beat, dy: bob },
      { ...trunk, pivot: sk.pelvis, rotate: 0.9 * beat, dy: bob },
      { ...armN, pivot: sk.sN, rotate: 19 * beat, dy: bob },
      { ...head, origin: sk.head, pivot: sk.head, scale: CREW_HEAD_SCALE, rotate: -1.6 * beat - 5 * lift, dx: -1.2 * lift, dy: bob + (nod - bob) * 0.8 - 1.5 * lift },
    ];
    // The doorway's light finds the one ahead first.
    caster.figure(ctx, { layers }, { at: p.at, k, mix: ease.inOutCubic(clamp01(v * 1.25 - (p.n ? 0 : 0.18))) });
  }
  // The ramp's near rail between them and the lens: a dark wall, its top rail and posts catching the doorway's light.
  const rail = P(1.1), slope = RAMP_ALONG[1] / RAMP_ALONG[0];
  const top = d0 => { const [x, y] = onRamp(d0); return [rail.ox + x * rail.s, rail.oy + (y - RAIL_HIGH) * rail.s]; };
  const a = top(-260), b = top(560), drop = h => h * rail.s;
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(b[0], view.H + 40); ctx.lineTo(a[0], view.H + 40); ctx.closePath();
  ctx.fillStyle = '#080A11'; ctx.fill();
  // Its panels: a mid rail, a kick plate with its warning band, and the posts.
  const along = (h, w, color) => { ctx.strokeStyle = color; ctx.lineWidth = w * rail.s; ctx.beginPath(); ctx.moveTo(a[0], a[1] + drop(h)); ctx.lineTo(b[0], b[1] + drop(h)); ctx.stroke(); };
  along(20, 3.2, '#141927'); along(21.6, 0.8, rgba('#FFD49A', 0.3 * near));
  along(41, 9, '#10141F'); along(36.4, 0.8, rgba('#FFD49A', 0.22 * near));
  for (let post = -8; post <= 20; post += 1) {
    const [x, y] = top(post * 28);
    if (x < -60 || x > view.W + 60) continue;
    ctx.fillStyle = '#131827'; ctx.fillRect(x - 2.6 * rail.s, y, 5.2 * rail.s, view.H);
    ctx.fillStyle = rgba('#FFD49A', 0.4 * near); ctx.fillRect(x - 2.6 * rail.s, y - slope * 2.6 * rail.s, 0.9 * rail.s, view.H);
  }
  ctx.lineCap = 'butt';
  along(0, 8, '#05060B'); along(-3.4, 1.5, rgba('#FFDCA4', 0.85 * near));
  // The air: dust in the doorway's light, its streak across the lens, and the glare taking the frame at the end.
  motes(ctx, { seed: 23, n: 90, t, box: [0, 0, view.W, view.H * 0.8], size: [0.9 * view.px, 2.6 * view.px], color: '#FFEBC8', alpha: 0.85 * near, light: x => clamp01(1.25 - x / (view.W * 0.9)), speed: 1.4 });
  streak(L, door[0], door[1], view.W * 2.4, 9 * view.px, '#FFE9C8', 0.45 * near);
  glow(L, -view.W * 0.1, door[1], view.W * 1.3, '#FFE6D2', 0.5 * ease.inCubic(v));
}

// ── Inside ───────────────────────────────────────────────────────────

const ROWS = Object.freeze({ narrow: { 7: [2, 3, 2], 8: [3, 2, 3], 9: [3, 4, 2] }, wide: { 7: [4, 3], 8: [4, 4], 9: [5, 4] } });
const HELD_ORDER = Object.freeze(['stand', 'folded', 'ease']);
const hallView = view => ({ ...view, f: 560 * view.u });
/** The camera inside: above the crew, looking down the corridor at them, so each row's faces show over the row in front. */
function hallCamera(t) {
  const e = ease.outCubic(progress(t, SHOTS.inside[0], 9700));
  return { x: 0, y: lerp(382, 340, e), z: lerp(20, 252, e), tilt: lerp(-0.275, -0.22, e) };
}
/** Where each of the crew stands inside: rows back to front, each between the places in front. */
function standing(view, roster) {
  const wide = view.W > view.H, rows = ROWS[wide ? 'wide' : 'narrow'][roster.length];
  // A row of five on the display stands closer together: everyone inside the corridor's walls.
  const depths = rows.length === 3 ? [836, 700, 564] : [770, 600], gap = wide ? (rows.some(n => n > 4) ? 96 : 132) : rows.some(n => n > 3) ? 66 : 76;
  const out = [];
  let i = 0;
  rows.forEach((count, r) => {
    for (let c = 0; c < count; c += 1, i += 1) {
      const member = roster[i], x = (c - (count - 1) / 2) * gap + (r % 2 ? gap * 0.14 : 0);
      out.push({ member, i, x, z: depths[r] + (hash(i, 3) - 0.5) * 22, pose: HELD_ORDER[(member.seat + r) % HELD_ORDER.length] });
    }
  });
  return out;
}
/** When the light finds a place in the corridor: the lamp over it has caught, and a moment more. */
function foundAt(place) {
  const order = (LAMPS.length - 1 - lampOver(place.z)) / (LAMPS.length - 1);
  return lerp(...INSIDE.lights, order) + 150 + hash(place.i, 11) * 190;
}

function drawInside(ctx, view, t, { assets, caster, roster, reduced, L }) {
  const hv = hallView(view), cam = hallCamera(t), at = lens(hv, cam);
  const lit = LAMPS.map((_, i) => lampAt(i, t, INSIDE.lights, reduced));
  const seal = 1 - 0.5 * progress(t, ...INSIDE.seal);
  paintHall(ctx, view, at, cam, { lit, systems: progress(t, ...INSIDE.systems), seal, t: reduced ? 0 : t }, L);
  const acting = twos(t);
  // Each of the crew is lit by the lamp over them. The head: bowed in the dark, lifting to the light once it finds
  // them, past where it will rest and back; then a blink.
  const crew = standing(view, roster).map(place => {
    const light = lit[lampOver(place.z)];
    const found = foundAt(place), up = reduced ? (t >= found ? 1 : 0) : progress(acting, found, found + 340), lifted = ease.outBack(up, 2.2);
    const blink = !reduced && acting >= found + 620 && acting < found + 620 + 100;
    const sk = HELD[place.pose], [X, Y, s] = at(place.x, 0, place.z);
    const breath = reduced ? 0 : Math.sin(acting * 0.0021 + place.i) * 0.5;
    const figure = { body: assets.get(`in:${place.i}:dark`), bodyTo: assets.get(`in:${place.i}:lit`), sk };
    if (up < 0.4) { figure.head = assets.get(`inhead:${place.i}:down:dark`); figure.headTo = assets.get(`inhead:${place.i}:down:lit`); }
    else figure.head = (blink && assets.get(`inhead:${place.i}:shut:lit`)) || assets.get(`inhead:${place.i}:open:lit`);
    return { z: place.z, figure, where: { at: [X, Y], k: s, flip: place.x > 8, mix: light, head: { tilt: lerp(9, 0, lifted), dy: lerp(3.2, 0, lifted) + breath, dx: lerp(-1.5, 0, lifted) } } };
  }).filter(stand => stand.figure.body || stand.figure.bodyTo);
  // The walls' lamps and consoles are behind the crew. Their light lies on the layer over the picture, so it is cut
  // away where anyone stands: a lamp behind a head does not glow through it.
  L.save();
  L.globalCompositeOperation = 'destination-out';
  for (const stand of crew) caster.figure(L, stand.figure, { ...stand.where, mix: 0, frame: [L.canvas.width / view.W, L.canvas.height / view.H] });
  L.restore();
  // Far to near: each lamp and its cone, each of the crew.
  const things = [...LAMPS.map((z, i) => ({ z, lamp: i })), ...crew].sort((a, b) => b.z - a.z);
  for (const thing of things) {
    if (thing.lamp !== undefined) { paintLamp(ctx, at, thing.z, lit[thing.lamp], L); paintCone(L, at, thing.z, lit[thing.lamp]); continue; }
    caster.figure(ctx, thing.figure, thing.where);
  }
  const sum = lit.reduce((a, b) => a + b, 0) / lit.length;
  if (sum > 0.02) motes(ctx, { seed: 71, n: 80, t, box: [0, 0, view.W, view.H], size: [0.7 * view.px, 1.9 * view.px], color: '#EAF3FF', alpha: 0.7 * sum, light: x => clamp01(1.1 - Math.abs(x - view.W / 2) / (view.W * 0.42)) });
}

// ── What each moment needs drawn beforehand ──────────────────────────

/**
 * The film's pictures for a view and a roster: `{ key, at, until, bytes, make }` (engine.mjs createBakery). `at` orders
 * the drawing: what a shot cannot do without (its place, each figure in one pose) comes well before the shot, the rest
 * of its drawings just before it, so a slow phone still has every shot's figures, held, when their shot begins. `until`
 * is the last film time a picture is used, after which its memory is given back. `bytes` is what it will hold. `sharp`
 * 0..1 lowers how sharp the crew's pictures are drawn (the memory budget).
 */
function jobsFor(doc, view, roster, sharp = 1) {
  const cast = castOf(roster), jobs = [];
  const area = ([, , w, h], px) => Math.ceil(w * px) * Math.ceil(h * px) * 4;
  let spare = null; // set while adding drawings a shot can do without: the film time by which each must have begun
  const add = (key, at, until, bytes, make) => jobs.push({ key, at, until, bytes, make, spare });
  const first = start => start - 2200, rest = start => start - 260; // a shot's first need, and the rest of its drawings
  /** Drawings a late film goes without: the rest of a cycle (a figure then holds its first pose), a blink, a second light. */
  const sparing = (start, draw) => { spare = start - 150; draw(); spare = null; };
  const body = (key, at, until, character, sk, k, look) => add(key, at, until, area(bodyBox(sk), k), () => bodySprite(doc, character, sk, k, look));
  const head = (key, at, until, character, look, k, lit, blink = 0) => add(key, at, until, area(headBox(character, look), k * CREW_HEAD_SCALE), () => headSprite(doc, character, look, blink, k, lit));
  const part = (key, at, until, character, sk, name, k, look) => add(key, at, until, area(partBox(sk, name), k), () => partSprite(doc, character, sk, name, k, look));
  const picture = (key, at, until, rect, px, inner) => add(key, at, until, area(rect, px), () => sprite(doc, { rect, px, inner: inner() }));
  const crew = k => Math.max(0.6, k * sharp);
  // The exterior: the ship, once, for the dusk and for its waking.
  const sub = { W: view.W, H: view.H, k: outsideFit(view) };
  const dusk = [0, 400, 800, 1200, 1600, 2000].map(duskCamera), wake = SHOTS.wake.map(wakeCamera);
  const wide = seen(sub, OUTSIDE_REF, [...dusk, ...wake], DEPTH.ship, 40 * view.px), close = plane(sub, OUTSIDE_REF, duskCamera(2000), DEPTH.ship).s;
  let shipInner = null;
  const ship = () => (shipInner ??= shipArt());
  add('dots', -9000, SHOTS.wake[1], 28 * 28 * 4, async () => dotTile(doc));
  picture('ship', -8000, SHOTS.wake[1], within(wide.rect, SHIP_BOX) ?? SHIP_BOX, close * 0.85, ship);
  const kWalk = crew(FIG * close), [d0, d1] = SHOTS.dusk;
  cast.first.forEach((member, i) => {
    body(`walk:${i}:0`, first(d0), d1, member.character, stridePose(0), kWalk, LOOKS.dusk);
    sparing(d0 + 600, () => { for (let j = 1; j < PHASES; j += 1) body(`walk:${i}:${j}`, rest(d0) + j, d1, member.character, stridePose(j / PHASES), kWalk, LOOKS.dusk); });
    head(`walkhead:${i}`, first(d0), d1, member.character, 'front', kWalk, LOOKS.dusk);
  });
  // The entrance from the ramp: the wall once for each of its two shots, as sharp as each needs.
  const dv = doorView(view), [f0, f1] = SHOTS.foot, [g0, g1] = SHOTS.door;
  const wallFor = cams => {
    let r = null, px = 0;
    for (const cam of cams) {
      const [ox, oy, s] = lens(dv, cam)(0, SET.sill, SET.door), m = 30 * view.px, x0 = (-m - ox) / s, y0 = (-m - oy) / s, x1 = (view.W + m - ox) / s, y1 = (view.H + m - oy) / s;
      r = r ? [Math.min(r[0], x0), Math.min(r[1], y0), Math.max(r[2], x1), Math.max(r[3], y1)] : [x0, y0, x1, y1];
      px = Math.max(px, s);
    }
    return { rect: within([r[0], r[1], r[2] - r[0], r[3] - r[1]], WALL_BOX) ?? WALL_BOX, px: px * 0.8 };
  };
  let wallInner = null;
  const wall = () => (wallInner ??= wallArt());
  const far = wallFor([footCamera(f0), footCamera(f1)]), near = wallFor([doorCamera(g0, true), doorCamera(g1, true)]);
  picture('wall-far', first(f0), f1, far.rect, far.px, wall);
  picture('wall-near', first(g0), g1, near.rect, near.px, wall);
  cast.first.forEach((member, i) => {
    // The far pair is smaller in the frame, so its drawings are.
    const k = crew(Math.min(i < 2 ? 2 : 2.7, dv.f / (i < 2 ? 668 : 432)));
    body(`climb:${i}:0`, first(f0), f1, member.character, climbPose(0), k, LOOKS.backlit);
    sparing(f0, () => { for (let j = 1; j < PHASES; j += 1) body(`climb:${i}:${j}`, rest(f0) + j, f1, member.character, climbPose(j / PHASES), k, LOOKS.backlit); });
    head(`climbhead:${i}`, first(f0), f1, member.character, 'back', k, LOOKS.backlit);
  });
  // The faces: each of the two in parts, far from the entrance's light and in it.
  const [h0, h1] = SHOTS.faces;
  cast.pair.forEach((member, n) => {
    // Drawn at no more than two and a half pixels a point: the largest pictures of the film.
    const k = crew(faceK(view) * Math.min(1, 2.5 / view.px) * (n ? 0.9 : 1)), sk = bustPose();
    for (const p of ['trunk', 'armF', 'armN']) part(`bust:${n}:${p}:far`, first(h0), h1, member.character, sk, p, k, LOOKS.climbFar);
    head(`busthead:${n}:open:far`, first(h0), h1, member.character, 'front', k, LOOKS.climbFar);
    sparing(h0, () => {
      for (const p of ['trunk', 'armF', 'armN']) part(`bust:${n}:${p}:near`, rest(h0), h1, member.character, sk, p, k, LOOKS.climbNear);
      head(`busthead:${n}:open:near`, rest(h0), h1, member.character, 'front', k, LOOKS.climbNear);
      for (const [name, look] of [['far', LOOKS.climbFar], ['near', LOOKS.climbNear]]) head(`busthead:${n}:shut:${name}`, rest(h0) + 200, h1, member.character, 'front', k, look, 1);
    });
  });
  // The door: the last aboard's few drawings, and those going in ahead.
  const kLast = crew(dv.f / (764 - doorCamera(g1, true).z) * (view.px > 2.5 ? 0.85 : 1));
  body('last:0', first(g0), g1, cast.last.character, climbPose(0), kLast, LOOKS.backlit);
  sparing(g0, () => { for (let j = 1; j < PHASES / 2; j += 1) body(`last:${j}`, rest(g0) + j, g1, cast.last.character, climbPose(j / PHASES), kLast, LOOKS.backlit); });
  body('last:back', first(g0), g1, cast.last.character, backPose(0.7), kLast, LOOKS.backlit);
  head('lasthead:back', first(g0), g1, cast.last.character, 'back', kLast, LOOKS.backlit);
  head('lasthead:front', rest(g0), g1, cast.last.character, 'front', kLast, LOOKS.lookback);
  sparing(DOOR_BEATS.look[0], () => head('lasthead:shut', rest(g0), g1, cast.last.character, 'front', kLast, LOOKS.lookback, 1));
  cast.ahead.forEach((member, n) => {
    body(`ahead:${n}`, rest(g0), g0 + 500, member.character, backPose(n ? -0.5 : 0.5), kLast * 0.7, LOOKS.backlit);
    head(`aheadhead:${n}`, rest(g0), g0 + 500, member.character, 'back', kLast * 0.7, LOOKS.backlit);
  });
  // Inside: each of the crew in the dark (let go once every light is on, and drawn less sharp: a shape and the
  // doorway's light on its edge) and under the lights.
  const hv = hallView(view), [i0] = SHOTS.inside, lightsOn = INSIDE.lights[1] + 700;
  for (const place of standing(view, roster)) {
    // Three pixels a point is more than these need: the last and largest pictures of the film.
    const k = crew(hv.f / Math.max(260, place.z - hallCamera(BOARDING_MS).z) * (view.px > 2.5 ? 0.88 : 1)), dim = k * 0.62, c = place.member.character;
    body(`in:${place.i}:dark`, first(i0), lightsOn, c, HELD[place.pose], dim, LOOKS.dark);
    head(`inhead:${place.i}:down:dark`, first(i0), lightsOn, c, 'down', dim, LOOKS.dark);
    body(`in:${place.i}:lit`, rest(i0), BOARDING_MS, c, HELD[place.pose], k, LOOKS.lit);
    head(`inhead:${place.i}:down:lit`, rest(i0), lightsOn, c, 'down', k, LOOKS.lit);
    head(`inhead:${place.i}:open:lit`, rest(i0) + 100, BOARDING_MS, c, 'front', k, LOOKS.lit);
    sparing(INSIDE.lights[0] + 600, () => head(`inhead:${place.i}:shut:lit`, rest(i0) + 600, BOARDING_MS, c, 'front', k, LOOKS.lit, 1));
  }
  add('mark', rest(TITLE.stamp[0]) - 400, BOARDING_MS, view.W * view.H * 0.45, () => markSprites(doc, view));
  return jobs;
}

/** The film's pictures within the memory budget: at full sharpness if they fit, the crew's less sharp if not. */
function planFor(doc, view, roster) {
  let jobs = jobsFor(doc, view, roster), sharp = 1;
  const total = list => list.reduce((sum, job) => sum + job.bytes, 0);
  if (total(jobs) > MEMORY_BUDGET) { sharp = Math.max(0.5, Math.sqrt(MEMORY_BUDGET / total(jobs)) * 0.97); jobs = jobsFor(doc, view, roster, sharp); }
  return { jobs, sharp, bytes: total(jobs) };
}

// ── The scene ────────────────────────────────────────────────────────

/** How sharp the frame is drawn, as a share of the screen's own pixels: the steps a slow phone goes down. */
export const QUALITY = Object.freeze([1, 0.8, 0.64, 0.5]);
/** Frames slower than this, eight in a run (one twice as slow counts twice), and the frame is drawn a step less sharp. */
export const SLOW_FRAME_MS = 22;
export const SLOW_FRAMES = 8;
/**
 * While a film is still drawing its pictures (it was not prepared, or not in time), each gap between two frames holds
 * a picture's drawing as well, so a frame is not slow at SLOW_FRAME_MS. Past this the film as a whole is late: it then
 * goes down a step too, and draws the pictures it has not begun as sharp as its frame now is, so they come sooner.
 */
export const LATE_FRAME_MS = 50;
let remembered = 0; // the step the last film on this page settled at with its pictures drawn: the next one starts there

/** The frame for a holder `width` × `height` px: its pixels (`quality`: a share of the screen's), and the measures drawn in. */
function viewOf(win, width, height, quality = 1) {
  const px = Math.min(3, Math.max(1, win.devicePixelRatio || 1)) * quality;
  const W = Math.max(1, Math.round(width * px)), H = Math.max(1, Math.round(height * px));
  return { W, H, px, width, height, u: Math.min(W / 390, H / 700), Matrix: win.DOMMatrix, Path: win.Path2D };
}

/**
 * Draws the film's pictures ahead of the film, so its first frame is whole: call it while the player reads their role.
 * Returns what `createBoardingScene` takes as `options.prepared`; `ready` resolves when all is drawn, `dispose()`
 * gives the memory back if the film is never shown. Optional: without it the film draws its pictures as it opens.
 */
export function prepareBoardingScene(doc, { roster: given, width, height }) {
  const roster = publicRoster(given), view = viewOf(doc.defaultView, width, height), assets = createBakery(doc);
  const { jobs, sharp, bytes } = planFor(doc, view, roster);
  assets.add(jobs);
  return { roster, view, assets, jobs, sharp, bytes, ready: assets.settled(), dispose: () => assets.stop() };
}

/**
 * The boarding film in `holder`, as the pre-game player's scene: `paint(t, { width, height, variant })` draws the film
 * at the server's time `t`, and `dispose()` ends it. `options.roster` is the public roster; `options.prepared` what
 * prepareBoardingScene() returned for the same roster and size. `live: false` draws only when painted (a recording, a
 * test): the scene then never asks for a frame of its own.
 */
export function createBoardingScene(holder, { options = {}, live = true } = {}) {
  const doc = holder.ownerDocument, win = doc.defaultView;
  const roster = publicRoster(options.roster), cast = castOf(roster);
  // The film: its canvas, and over it the finish (a vignette and a grade; the grain), each its own layer.
  const root = doc.createElement('div'), canvas = doc.createElement('canvas'), shade = doc.createElement('div'), speck = doc.createElement('div');
  const caster = createCaster(doc), mark = createMark(doc), light = createLight(doc);
  root.className = 'ms-boarding-film'; root.setAttribute('aria-hidden', 'true');
  shade.className = 'ms-bf-shade'; speck.className = 'ms-bf-grain';
  light.canvas.className = 'ms-bf-light';
  root.append(canvas, light.canvas, shade, speck);
  holder.append(root);
  const ctx = canvas.getContext('2d', { alpha: false });
  const tile = grainTile(doc);
  speck.style.backgroundImage = `url(${tile.toDataURL('image/png')})`;
  tile.width = 0; tile.height = 0;
  const stats = { version: BOARDING_FILM_VERSION, paints: 0, frames: 0, ownFrames: 0, drawMs: 0, worstMs: 0, pictures: 0, bytes: 0, peakBytes: 0, bakeMs: 0, longestBakeMs: 0, scale: 1, quality: QUALITY[remembered], sharp: 1, planned: 0, lateSteps: 0 };
  let assets = null, jobs = [], view = null, baked = null, box = null, step = remembered, variant = 'full', disposed = false, suspended = false, raf = null;
  const media = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let anchor = null; // { t, at }: the last server time given, and when (the page's clock)
  let finish = { opacity: -1, grain: '', light: -1 }, lastTick = 0, slow = 0, bakedSoFar = 0, shown = { variant: null, box: [0, 0] };

  function adopt(prepared) {
    const same = prepared && !prepared.adopted && prepared.view.W === baked.W && prepared.view.H === baked.H && prepared.roster.length === roster.length && prepared.roster.every((m, i) => m.seat === roster[i].seat && m.character === roster[i].character);
    if (!same) return false;
    prepared.adopted = true; assets = prepared.assets; jobs = prepared.jobs; stats.sharp = prepared.sharp; stats.planned = prepared.bytes;
    return true;
  }

  /** The frame's own pixels: the holder's size at the screen's sharpness, less the steps a slow phone has gone down. */
  function frame() {
    view = viewOf(win, box[0], box[1], QUALITY[step]);
    canvas.width = view.W; canvas.height = view.H;
    stats.scale = view.px; stats.quality = QUALITY[step];
  }

  function size(width, height, t) {
    if (box && box[0] === width && box[1] === height) return;
    box = [width, height];
    root.style.width = `${width}px`; root.style.height = `${height}px`;
    frame();
    // Pictures drawn ahead are drawn for the screen's own sharpness, whatever the frame's comes to be. A film that
    // draws its own draws them for the frame it begins with: a page that could not hold a sharper frame has no use
    // for sharper pictures.
    const full = viewOf(win, width, height);
    if (assets && baked) assets.stop();
    baked = full;
    if (!adopt(options.prepared)) {
      assets = createBakery(doc);
      const plan = planFor(doc, step ? view : baked, roster);
      jobs = plan.jobs; stats.sharp = plan.sharp; stats.planned = plan.bytes;
    }
    need(t, true);
  }

  /**
   * Asks for what the film still needs from `t` on, and gives back what it is past. A film that is late (its pictures
   * are being drawn as it plays, on a slow phone) goes without what it can spare: a drawing not begun by the time its
   * shot needs it is let go, so the shots still to come get theirs.
   */
  function need(t, all = false) {
    const late = job => job.spare !== null && t >= job.spare && !assets.has(job.key);
    const wanted = jobs.filter(job => job.until >= t && !late(job) && !assets.has(job.key) && !assets.waiting(job.key));
    if (wanted.length) assets.add(wanted);
    if (!all) for (const job of jobs) if ((job.until < t - 400 && (assets.has(job.key) || assets.waiting(job.key))) || (late(job) && assets.waiting(job.key))) assets.release(job.key);
  }

  /**
   * A film late with its pictures draws those it has not begun as sharp as its frame now is, and no sharper: a
   * picture the frame cannot show in full is not worth the time it takes. Those drawn, or being drawn, stay.
   */
  function soften() {
    const plan = planFor(doc, view, roster);
    assets.swap(plan.jobs);
    jobs = plan.jobs; stats.planned = plan.bytes;
  }

  /** The finish over the canvas: how strong (it goes with the picture into the ink and the night), where the grain sits. */
  function dress(opacity, t, lit) {
    const o = Math.round(opacity * 100) / 100, l = Math.round(lit * 100) / 100;
    if (o !== finish.opacity) { finish.opacity = o; shade.style.opacity = String(o); speck.style.opacity = String(o * 0.075); }
    if (l !== finish.light) { finish.light = l; light.canvas.style.opacity = String(l); }
    const [gx, gy] = grainAt(t), where = `translate3d(${-Math.round(gx * 128)}px,${-Math.round(gy * 128)}px,0)`;
    if (where !== finish.grain) { finish.grain = where; speck.style.transform = where; }
  }

  function draw(t) {
    const started = win.performance.now();
    const film = boardingFrame(t, { variant });
    const at = film.at, reduced = film.reduced, L = light.ctx, stage = { assets, caster, cast, roster, reduced, L };
    // A frame leaves nothing behind it on either canvas (a line's cap, a blend): the next is drawn from a clean state.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = NIGHT;
    ctx.fillRect(0, 0, view.W, view.H);
    // `veil`: how far a wash over the whole frame (the night, a dip to the dark) hides the picture, and its light with it.
    let dressed = 0, veil = 1;
    light.begin(view);
    L.save();
    if (!film.night && film.fade > 0) {
      veil = 0;
      const dip = (color, alpha) => { if (alpha > 0) { wash(ctx, view.W, view.H, color, alpha); veil = 1 - (1 - veil) * (1 - alpha); } };
      if (film.shot === 'dusk') {
        drawOutside(ctx, view, duskCamera(at), at, { light: 1, rampUp: 0, doorDown: 0, seal: 0, ports: 0, engines: 0, crew: true }, stage);
        // The lens: the sun's light leaking in from the right.
        glow(L, view.W * 1.05, view.H * 0.56, view.H * 0.5, '#FFB36B', 0.22, { sy: 0.7 });
        streak(L, view.W * 0.8, view.H * 0.585, view.W * 1.6, 5 * view.px, '#FFD9A6', 0.3 * progress(at, 300, 1500));
        // The first frames come up from the night.
        if (!reduced) dip(NIGHT, 1 - ease.outCubic(progress(at, 0, 420)));
      } else if (film.shot === 'foot') {
        drawEntrance(ctx, view, footCamera(at), at, { light: 1, rampUp: 0, doorDown: 0, seal: 0 }, stage, 'foot');
      } else if (film.shot === 'faces') {
        drawFaces(ctx, view, at, stage);
        // The entrance's glare takes the frame as they reach it.
        if (!reduced) glow(L, view.W * 0.2, view.H * 0.4, view.H * 1.2, '#FFE9CF', 0.85 * ease.inExpo(progress(at, 5180, 5400)), { core: 0.5 });
      } else if (film.shot === 'door') {
        const down = ease.inCubic(progress(at, ...DOOR_BEATS.slab));
        const state = { light: 1 - down, rampUp: ease.inOutCubic(progress(at, ...DOOR_BEATS.ramp)), doorDown: down, seal: progress(at, ...DOOR_BEATS.seal) };
        const cam = doorCamera(at, reduced), lensAt = drawEntrance(ctx, view, cam, at, state, stage, 'door');
        if (!reduced) {
          // The ramp lets go of the ground: steam at its sides. The slab lands: dust along the sill.
          for (const side of [-1, 1]) { const [x, y, s] = lensAt(side * (SET.half + 20), SET.sill - 6, SET.door - 30); puff(ctx, { seed: 5 + side, n: 7, t: at, t0: DOOR_BEATS.ramp[0], at: [x, y], r: 120 * s, ms: 520, color: '#C9D2E8', alpha: 0.4, drift: [side * 0.05 * view.px, -0.03 * view.px] }); }
          const [sx, sy, ss] = lensAt(0, SET.sill, SET.door);
          puff(ctx, { seed: 19, n: 12, t: at, t0: DOOR_BEATS.slam, at: [sx, sy + 6 * ss], r: 130 * ss, ms: 520, color: '#8C8072', alpha: 0.42, spread: 2.6, flat: 0.34, drift: [0, -0.012 * view.px] });
          // The slam itself: for one drawing the frame is its light, then the dusk again.
          if (at >= DOOR_BEATS.slam) wash(L, view.W, view.H, '#FFE9C4', 0.3 * (1 - progress(at, DOOR_BEATS.slam, DOOR_BEATS.slam + 90)));
        }
      } else if (film.shot === 'wake') {
        const state = { light: 0, rampUp: 1, doorDown: 1, seal: 1, ports: progress(at, ...HULL_WAKE.ports), engines: progress(at, ...HULL_WAKE.engines), crew: false, front: false };
        drawOutside(ctx, view, wakeCamera(at), at, state, stage);
        // The cut inside is from the dark: the outside's last moments go down to it.
        if (!reduced) dip('#000000', 0.92 * ease.inCubic(progress(at, 6790, 6900)));
      } else {
        drawInside(ctx, view, at, stage);
        if (!reduced) dip('#000000', 1 - ease.outCubic(progress(at, 6900, 7160)));
        if (at >= TITLE.stamp[0] - 60) {
          // The corridor steps back as the mark comes down: its picture darker, its light thinner.
          const back = 0.34 * progress(at, TITLE.stamp[0] - 60, TITLE.hit);
          wash(ctx, view.W, view.H, '#05070C', back);
          light.cut(c => wash(c, view.W, view.H, '#000000', back));
          const jolt = reduced ? [0, 0] : shake(at, TITLE.hit, { amp: 2.6 * view.px, ms: 200, seed: 7 });
          // The mark stands in front of the corridor's light: the light is cut away under it, then its own is added.
          const pictures = assets.get('mark');
          for (const target of [ctx, L]) { target.save(); target.translate(jolt[0], jolt[1]); }
          if (pictures) light.cut(c => mark.shape(c, view, pictures, at, TITLE, reduced));
          mark.paint(ctx, view, pictures, at, TITLE, reduced, L);
          for (const target of [ctx, L]) target.restore();
        }
      }
      // The ink takes the frame to the night, and the light under it; a held picture fades.
      const tide = reduced ? 0 : ease.inCubic(progress(t, ...TITLE.tide));
      if (tide > 0) { paintTide(ctx, view, tide); light.cut(c => paintTide(c, view, tide)); }
      if (film.fade < 1) dip(NIGHT, 1 - film.fade);
      dressed = film.fade * (1 - tide);
    }
    L.restore();
    ctx.restore();
    dress(dressed, reduced ? 0 : t, 1 - veil);
    const took = win.performance.now() - started;
    stats.frames += 1; stats.drawMs = took; stats.worstMs = Math.max(stats.worstMs, took);
    stats.pictures = assets.stats.pictures; stats.bytes = assets.stats.bytes; stats.peakBytes = assets.stats.peakBytes; stats.bakeMs = assets.stats.bakeMs; stats.longestBakeMs = assets.stats.longestMs;
  }

  function tick() {
    raf = null;
    if (disposed || suspended || !anchor || !view) return;
    const now = win.performance.now(), since = now - anchor.at;
    if (since > COAST_MS || anchor.t + since > BOARDING_MS) return; // no paint for a while, or the film is over: the picture stops
    // A phone that cannot hold the frame draws it a step less sharp.
    // - With its pictures drawn, a frame slower than SLOW_FRAME_MS is slow: the frame is what took the time.
    // - While pictures are being drawn they share every gap, so only a frame slower than LATE_FRAME_MS counts: the
    //   film as a whole is late. Its step down also makes the pictures still to come smaller (soften), which is what
    //   brings them sooner. The page does not remember such a step: the next film may have its pictures drawn first.
    const drawing = assets.busy() || assets.stats.done !== bakedSoFar;
    bakedSoFar = assets.stats.done;
    if (lastTick) {
      const gap = now - lastTick, limit = drawing ? LATE_FRAME_MS : SLOW_FRAME_MS;
      slow = gap > limit ? slow + (gap > limit * 2 ? 2 : 1) : Math.max(0, slow - 1);
      if (slow >= SLOW_FRAMES && step < QUALITY.length - 1) {
        step += 1; slow = 0;
        if (drawing) stats.lateSteps += 1;
        remembered = Math.max(remembered, step - stats.lateSteps);
        frame();
        if (drawing) soften();
      }
    }
    lastTick = now;
    stats.ownFrames += 1;
    draw(anchor.t + since);
    raf = win.requestAnimationFrame(tick);
  }

  return {
    stats,
    canvas,
    element: root,
    roster,
    /** Resolves when every picture asked for so far is drawn (a recording waits for it; the film does not). */
    ready: () => (assets ? assets.settled() : Promise.resolve()),
    /** The names of the pictures held now, and the variant shown (for the film's check). */
    held: () => ({ variant, keys: jobs.filter(job => assets?.has(job.key)).map(job => job.key) }),
    paint(t, { width, height, variant: next = 'full' } = {}) {
      if (disposed) return;
      if (!VARIANTS.includes(next)) throw new Error(`No boarding variant ${next}`);
      const time = clamp(Number.isFinite(t) ? t : 0, 0, BOARDING_MS);
      size(width, height, time);
      // Reduce motion is the game's (the variant asked for) or the device's: either gives the held pictures.
      variant = next === 'reduced' || media?.matches ? 'reduced' : 'full';
      need(variant === 'reduced' ? Math.min(time, boardingFrame(time, { variant }).at) : time);
      const changed = variant !== shown.variant || box[0] !== shown.box[0] || box[1] !== shown.box[1];
      anchor = { t: time, at: win.performance.now() };
      stats.paints += 1;
      const moving = live && !suspended && variant === 'full' && time < BOARDING_MS;
      // One drawing a frame: when the scene's own frame is already due, this paint only gives it the time.
      if (!moving || raf === null || changed) draw(time);
      shown = { variant, box: [...box] };
      if (moving && raf === null) { lastTick = 0; raf = win.requestAnimationFrame(tick); }
      if (!moving && raf !== null) { win.cancelAnimationFrame(raf); raf = null; }
    },
    /** Stops the scene's own frames (the page is hidden, the stage is covered). After resume(), the next paint restarts them. */
    suspend() { suspended = true; if (raf !== null) win.cancelAnimationFrame(raf); raf = null; },
    resume() { suspended = false; },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (raf !== null) win.cancelAnimationFrame(raf);
      raf = null;
      assets?.stop();
      caster.dispose(); mark.dispose(); light.dispose();
      canvas.width = 0; canvas.height = 0;
      root.remove();
    },
  };
}
