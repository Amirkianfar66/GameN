// mothership:dev-only
//
// The Food Supply Task in time: a scripted run of presses (a storyboard), its states from the
// Task's own rules (./task.mjs), and the pose of the Supply Room at any moment of it (./scene.mjs
// draws a pose). The motion here is the design's specification: what moves when an event arrives,
// for how long and with what easing, and what Reduce motion shows instead. Presentation only: no
// animation decides anything, and a new state always wins over a cue still playing.

import { FIXTURES, TIMING, hazards, simulate, startTask } from './task.mjs';
import { BOXES, OPERATORS, RAIL, carriageX, crateY } from './layout.mjs';
import { restPose, routePath } from './scene.mjs';

/**
 * Each cue's timing, in milliseconds, and its Reduce motion form. PROPOSED. A cue never delays a
 * press: the next authoritative state replaces it.
 */
export const CUES = Object.freeze({
  move: { ms: TIMING.step, ease: 'in-out', reduced: 'The part is at its new place at once' },
  sway: { ms: 700, reduced: 'None' },
  bump: { ms: 180, reduced: 'A clunk mark at the contact for 400 ms; nothing moves' },
  drop: { ms: 160, ease: 'in', reduced: 'The crate is on the pulpit at once; THUD! shown still' },
  ram: { ms: 140, ease: 'in', reduced: 'The gantry is at the cab at once; SLAM! shown still' },
  stopped: { ms: 320, reduced: 'The catch shown thrown out, still, with CLANK! for 600 ms' },
  impact: { ms: 900, ease: 'out', reduced: 'The burst and the lettering shown still for 900 ms' },
  dock: { ms: 140, reduced: 'The jaws shut at once' },
  hookUp: { ms: 300, reduced: 'The empty hook at the gantry at once' },
  key: { ms: 140, reduced: 'The key turned and its lamp lit at once' },
  send: { ms: 1100, ease: 'in-out', reduced: 'The cradle gone at once; the +5 stamp shown still' },
  warning: { ms: 660, flash: 330, reduced: 'The lamp lit steadily, no flashing; the warning mark shown' }, // a 660 ms cycle: 330 ms lit, 330 ms dark
  dim: { ms: 600, reduced: 'Dimmed at once' },
  swing: { ms: 380, ease: 'in-out', reduced: 'The crate shown against the Boom operator at once; WHAM! still' },
  lurch: { ms: 160, ease: 'in', reduced: 'The gantry at the cab at once; CRASH! still' },
  closeCall: { ms: 700, ease: 'in-out', reduced: 'WHOA! shown still for 700 ms; nothing swings' },
});

const ease = {
  'in-out': u => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2),
  in: u => u * u * u,
  out: u => 1 - (1 - u) ** 3,
};
const clamp01 = v => Math.max(0, Math.min(1, v));
const lerp = (a, b, u) => a + (b - a) * u;

/**
 * A storyboard's run: its start (who has an attack opportunity, who is Protected) and its presses.
 * Returns the states with their events in time order, from the Task's own rules.
 */
export function run(board) {
  const start = startTask({ seats: board.seats, attack: board.attack, protection: board.protection, at: 0 });
  return simulate(start, board.steps);
}

/** The settled state at time t (the last state reached by then). */
const stateAt = (frames, t) => { let s = frames[0]; for (const f of frames) if (f.at <= t) s = f; else break; return s; };

/**
 * The pose of the room at time t of a run. reduced: Reduce motion (no travel, no sway, no flash,
 * no burst growth: each change at once, each effect still). Returns a pose for ./scene.mjs.
 */
export function poseAt(frames, t, { reduced = false, tags = null, guide = true } = {}) {
  const now = stateAt(frames, t);
  const s = now.state;
  const pose = restPose();
  pose.tags = tags;
  pose.gantry = s.carriage;
  pose.crate = { col: s.crate[0], row: s.crate[1] };
  pose.docked = s.docked;
  pose.hookRow = s.docked ? 3.4 : s.crate[1];
  pose.keys = { ...s.keys };
  pose.alive = { ...s.alive };
  pose.cradle = { rise: 0, closed: s.docked, lamp: s.docked };
  const hz = s.phase === 'ended' ? { drop: false, ram: false } : hazards(s);
  pose.lamps = { cab: hz.ram, pulpit: hz.drop };
  pose.warnings = { drop: hz.drop ? 1 : 0, ram: hz.ram ? 1 : 0 };
  if (s.phase === 'ended' && s.outcome?.result === 'delivered') { pose.cradle.rise = 1; pose.crate = null; }
  if (!s.alive.hoist) pose.cab.crushed = true, pose.plate.dented = true;

  // Each event's cue, from the moment it arrived.
  let travel = 0;
  for (const f of frames) {
    if (f.at > t) break;
    const dt = t - f.at;
    for (const e of f.events) {
      if (e.type === 'MOVED') {
        const span = Math.abs(e.to.carriage - e.from.carriage) + Math.abs(e.to.crate[1] - e.from.crate[1]);
        travel += span;
        if (dt < CUES.move.ms && !reduced) {
          const u = ease['in-out'](clamp01(dt / CUES.move.ms));
          pose.gantry = lerp(e.from.carriage, e.to.carriage, u);
          if (!s.docked || e.by === 'boom') pose.crate = s.docked ? pose.crate : { col: lerp(e.from.crate[0], e.to.crate[0], u), row: lerp(e.from.crate[1], e.to.crate[1], u) };
          if (!s.docked) pose.hookRow = pose.crate.row;
          travel -= span * (1 - u);
        }
        if (e.by === 'boom' && !s.docked && !reduced && dt < CUES.move.ms + CUES.sway.ms) {
          const v = (dt - CUES.move.ms * 0.5) / CUES.sway.ms;
          if (v > 0) pose.tilt = (e.dir === 'right' ? -1 : 1) * 0.07 * Math.exp(-4 * v) * Math.cos(v * Math.PI * 4);
        }
      }
      if (e.type === 'BUMPED') {
        const dir = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[e.dir];
        const contact = e.by === 'hoist'
          ? [carriageX(e.at[0]), crateY(e.at[1]) + dir[1] * 58]
          : [carriageX(e.carriage) + dir[0] * 60, e.at[1] === 0 ? 590 : crateY(e.at[1])];
        if (dt < 400 || (reduced && dt < 400)) pose.effects.push({ kind: 'clunk', at: contact, dir, t: reduced ? 1 : clamp01(dt / CUES.bump.ms) });
        if (!reduced && dt < CUES.bump.ms) {
          const k = Math.sin(clamp01(dt / CUES.bump.ms) * Math.PI) * 0.06;
          if (e.by === 'boom') pose.gantry += dir[0] * k, pose.crate.col += s.docked ? 0 : dir[0] * k;
          else if (!s.docked) pose.crate.row -= dir[1] * k, pose.hookRow = pose.crate.row;
        }
      }
      if (e.type === 'KILLED') {
        if (e.kind === 'drop') {
          if (dt < CUES.drop.ms && !reduced) {
            const u = ease.in(clamp01(dt / CUES.drop.ms));
            pose.crate = { col: e.at[0], row: lerp(FIXTURES.pulpit.head + 1, e.at[1], u) };
            pose.hookRow = pose.crate.row; pose.slack = 1 - u; pose.alive.boom = true;
            pose.effects.push({ kind: 'speed', at: [carriageX(e.at[0]), crateY(pose.crate.row) - 64], dir: [0, 1], len: 46, spread: 70 });
          }
          if (dt < CUES.impact.ms) {
            const g = reduced ? 1 : ease.out(clamp01((dt - CUES.drop.ms) / 220));
            if (dt >= CUES.drop.ms || reduced) {
              pose.effects.push({ kind: 'burst', at: [640, BOXES.console[1] - 20], r: 92, t: g });
              pose.effects.push({ kind: 'letters', text: 'THUD!', at: [640, BOXES.console[1] - 150], size: 66, angle: -8, opacity: 1 });
            }
          }
        } else if (e.kind === 'swing') {
          // An accident: the jolt swings the crate on its cable into the Boom operator's head, and it hangs back.
          const { v, reach } = towardHead(e.at);
          const out = reduced ? (dt < CUES.impact.ms ? 1 : 0) : dt < CUES.swing.ms ? ease['in-out'](clamp01(dt / CUES.swing.ms)) : Math.max(0, 1 - (dt - CUES.swing.ms) / 520);
          if (out > 0) pose.swing = { dx: v[0] * reach * out, dy: v[1] * reach * out };
          if (!reduced) pose.tilt = -Math.sign(v[0] || 1) * 0.18 * out;
          if (dt < CUES.swing.ms && !reduced) pose.alive.boom = true;
          if (dt < CUES.impact.ms && (dt >= CUES.swing.ms || reduced)) {
            const g = reduced ? 1 : ease.out(clamp01((dt - CUES.swing.ms) / 220));
            pose.effects.push({ kind: 'burst', at: [HEAD_AT[0], HEAD_AT[1] - 10], r: 80, t: g, seed: 175 });
            pose.effects.push({ kind: 'letters', text: 'WHAM!', at: [HEAD_AT[0] + 150, HEAD_AT[1] - 120], size: 62, angle: -9 });
          }
        } else {
          // The ram, or the lurch (an accident at the cab's door): the gantry into the cab.
          const ms = e.accident ? CUES.lurch.ms : CUES.ram.ms;
          if (dt < ms && !reduced) {
            const u = ease.in(clamp01(dt / ms));
            pose.gantry = lerp(FIXTURES.buffer.col, FIXTURES.cab.col, u);
            if (!e.docked) pose.crate = { col: pose.gantry, row: e.at[1] };
            pose.alive.hoist = true; pose.cab.crushed = false; pose.plate.dented = false;
            pose.effects.push({ kind: 'speed', at: [carriageX(pose.gantry) + 70, RAIL.bottom + 30], dir: [-1, 0], len: 54, spread: 50 });
          }
          if (dt < CUES.impact.ms && (dt >= ms || reduced)) {
            const g = reduced ? 1 : ease.out(clamp01((dt - ms) / 220));
            pose.effects.push({ kind: 'burst', at: [BOXES.cab[0] + BOXES.cab[2], RAIL.bottom + 40], r: 84, t: g });
            pose.effects.push({ kind: 'letters', text: e.accident ? 'CRASH!' : 'SLAM!', at: [320, 230], size: 62, angle: -10 });
          }
        }
      }
      if (e.type === 'NEAR_MISS') {
        // A close call: the crate swings toward the Boom operator, or the gantry jolts toward the cab, and back.
        const k = reduced ? 0 : dt < CUES.closeCall.ms ? Math.sin(clamp01(dt / CUES.closeCall.ms) * Math.PI) : 0;
        if (e.zone === 'boom') {
          const { v, reach } = towardHead(e.at);
          if (k > 0) { pose.swing = { dx: v[0] * reach * 0.6 * k, dy: v[1] * reach * 0.6 * k }; pose.tilt = -Math.sign(v[0] || 1) * 0.12 * k; }
        } else if (k > 0) {
          pose.gantry = e.carriage - 0.3 * k;
          if (!s.docked && pose.crate) pose.crate = { ...pose.crate, col: pose.gantry };
        }
        if (dt < CUES.closeCall.ms) pose.effects.push({ kind: 'letters', text: 'WHOA!', at: e.zone === 'boom' ? [HEAD_AT[0] + 170, HEAD_AT[1] - 150] : [340, 300], size: 54, angle: -7 });
      }
      if (e.type === 'STOPPED') {
        const u = reduced ? 1 : clamp01(dt / CUES.stopped.ms);
        const show = reduced ? dt < 600 : dt < CUES.stopped.ms + 500;
        if (e.kind === 'drop') {
          if (!reduced && dt < CUES.stopped.ms) {
            const k = Math.sin(u * Math.PI) * 0.22;
            pose.crate = { col: e.at[0], row: e.at[1] - k }; pose.hookRow = pose.crate.row;
          }
          if (show) {
            pose.effects.push({ kind: 'clamp', at: [carriageX(e.at[0]), RAIL.bottom + 58] });
            pose.effects.push({ kind: 'letters', text: 'CLANK!', at: [carriageX(e.at[0]) + 150, 180], size: 50, angle: -6 });
          }
        } else {
          if (!reduced && dt < CUES.stopped.ms) pose.gantry = FIXTURES.buffer.col - Math.sin(u * Math.PI) * 0.16;
          if (show) {
            pose.cab.caught = reduced ? 1 : Math.min(1, dt / 120);
            pose.effects.push({ kind: 'letters', text: 'CLANK!', at: [356, 304], size: 50, angle: -6 });
          }
        }
      }
      if (e.type === 'DOCKED' && !reduced) {
        if (dt < CUES.dock.ms) pose.cradle.closed = false;
        if (dt < CUES.hookUp.ms) pose.hookRow = lerp(FIXTURES.cradle.row, 3.4, ease.out(clamp01(dt / CUES.hookUp.ms)));
      }
      if (e.type === 'SENT') {
        const u = reduced ? 1 : ease['in-out'](clamp01(dt / CUES.send.ms));
        pose.cradle.rise = u; pose.cradle.closed = true; pose.cradle.lamp = true; pose.docked = true;
        pose.crate = u < 1 ? { col: FIXTURES.cradle.col, row: FIXTURES.cradle.row } : null;
        if (dt > (reduced ? 0 : CUES.send.ms * 0.4)) pose.effects.push({ kind: 'letters', text: '+5', at: [896, 150], size: 72, angle: -6, fill: '#F1B84B' });
      }
      // Lost or cancelled: the room dims once any impact has been seen.
      if (e.type === 'ENDED' && e.outcome.result !== 'delivered') {
        const after = f.events.some(x => x.type === 'KILLED') ? CUES.impact.ms : 0;
        pose.dim = reduced ? (dt >= after ? 1 : 0) : clamp01((dt - after) / CUES.dim.ms);
      }
    }
  }
  pose.wheel = travel * 0.9;
  pose.drum = travel * 1.3;
  if (!pose.alive.hoist) pose.cab.crushed = true;

  // The warning lamps flash; Reduce motion keeps them lit steadily.
  if (!reduced) {
    const on = Math.floor(t / CUES.warning.flash) % 2 === 0;
    pose.lamps.cab = pose.lamps.cab && on;
    pose.lamps.pulpit = pose.lamps.pulpit && on;
  }
  // The route the cooperative presses take from here, while the Task runs.
  if (guide && s.phase !== 'ended' && !s.docked && pose.crate) pose.guide = { path: routePath(pose.crate), next: 1 };
  return pose;
}

/** Where a swinging crate meets the Boom operator's head, and how far it travels to get there from its cell. */
const HEAD_AT = Object.freeze([OPERATORS.boom.feet[0], OPERATORS.boom.head + 22]);
function towardHead(at) {
  const from = [carriageX(at[0]), crateY(at[1])];
  const v = [HEAD_AT[0] - from[0], HEAD_AT[1] - from[1]];
  const len = Math.hypot(v[0], v[1]) || 1;
  return { v, reach: Math.max(0, len - 72) / len };
}

/** The time at which the run's last event ends, with its cues played out. */
export function durationOf(frames, { tail = 2600 } = {}) {
  return frames[frames.length - 1].at + tail;
}

/** Where the drop's warning line ends: the Boom operator's head. */
export const HEAD = OPERATORS.boom.head;
