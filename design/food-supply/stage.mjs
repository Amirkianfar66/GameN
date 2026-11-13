// mothership:dev-only
//
// The Food Supply Task in time: a scripted run of presses (a storyboard), its states from the
// Task's own rules (./task.mjs), and the pose of the Supply Room at any moment of it (./scene.mjs
// draws a pose). The panel's click from stop to stop and the crate's swing are the Task's own (task.mjs
// sweep() and swingOffset()): the pose only draws them. The rest here is the design's motion specification:
// what moves when an event arrives, for how long and with what easing, and what Reduce motion shows
// instead. Presentation only: no animation decides anything, and a new state always wins over a cue
// still playing.

import { FIXTURES, SWING, TIMING, hazards, panelAt, settled, simulate, startTask, swingOffset, tick } from './task.mjs';
import { BLADE, BOXES, CARRIAGE, CRATE, DECK, HANG, OPERATORS, PENDULUM, REST, STEP, stopX } from './layout.mjs';
import { restPose } from './scene.mjs';

/**
 * Each cue's timing, in milliseconds, and its Reduce motion form. PROPOSED. A cue never delays a
 * press: the next authoritative state replaces it. The click and the swing are not decoration: they
 * are what the participants time their presses by, so Reduce motion keeps them (the stop and the place
 * along the rail are the game, at the same moments) and takes away everything else that moves. A
 * reduced pose never shows anything earlier than the state allows: the crate still rises and falls for
 * its full time (the interlocks), only drawn at once at its end. A phone that comes back from the
 * background draws the present: it does not replay an impact or restart an outcome card.
 */
export const CUES = Object.freeze({
  click: { ms: TIMING.move, rest: TIMING.rest, ease: 'in-out', reduced: 'The panel is drawn at the stop it is snapping to from the start of each snap, and rests there: the same stop at the same moment as without Reduce motion (the stop a LOCK takes), with no slide, no speed lines and no lean of the crate' },
  swing: { ms: SWING.period, reduced: 'The crate keeps its place along the rail (the game) but stays upright and level: no tilt, no rise' },
  release: { ms: 90, ease: 'out', reduced: 'The blade up at once' },
  lock: { ms: 90, ease: 'in', reduced: 'The panel at its stop and the blade down at once; a clunk mark for 400 ms' },
  raise: { ms: TIMING.raise, ease: 'in-out', reduced: 'The crate at its hanging height at once' },
  lower: { ms: TIMING.lower, ease: 'in', reduced: 'The crate where it falls, at once' },
  land: { ms: 140, reduced: 'The jaws shut and the lamp lit at once' },
  hookUp: { ms: 300, ease: 'out', reduced: 'The empty hook under the panel at once' },
  miss: { ms: 220, reduced: 'CLUNK! shown still for 600 ms' },
  break: { ms: TIMING.lower, after: 700, ease: 'in', reduced: 'The broken crate where it fell, at once; CRASH! still for 700 ms; the new crate in the hatch at once' },
  cut: { ms: 120, ease: 'in', reduced: 'The blade in the cab at once; CHOP! still' },
  drop: { ms: 180, ease: 'in', reduced: 'The crate on the console at once; THUD! still' },
  stopped: { ms: 320, reduced: 'The catch shown thrown, still, with CLANK! for 600 ms' },
  impact: { ms: 900, ease: 'out', reduced: 'The burst and the lettering shown still for 900 ms' },
  key: { ms: 140, reduced: 'The key turned and its lamp lit at once' },
  send: { ms: 1100, ease: 'in-out', reduced: 'The platform gone at once; the +5 stamp shown still' },
  warning: { ms: 660, flash: 330, reduced: 'The lamp lit steadily, no flashing; the warning mark shown' }, // a 660 ms cycle: 330 ms lit, 330 ms dark
  dim: { ms: 600, reduced: 'Dimmed at once' },
});

const ease = {
  'in-out': u => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2),
  in: u => u * u * u,
  out: u => 1 - (1 - u) ** 3,
};
const clamp01 = v => Math.max(0, Math.min(1, v));
const lerp = (a, b, u) => a + (b - a) * u;
const REST_Y = { intake: REST.intake, deck: REST.deck, landed: REST.platform };
/** The floor under a broken crate, by where it fell; and its place along the rail (a fixture's centre, or where it fell on the deck). */
const FLOOR = { deck: DECK, console: REST.console + CRATE / 2, platform: REST.platform + CRATE / 2 };
const wreckX = b => stopX(b.on === 'console' ? FIXTURES.console.stop : b.on === 'platform' ? FIXTURES.platform.stop : b.x);

/**
 * A storyboard's run: its start (who is Protected) and its presses.
 * Returns the states with their events in time order, from the Task's own rules.
 */
export function run(board) {
  const start = startTask({ seats: board.seats, at: 0 });
  return simulate(start, board.steps, { protection: board.protection });
}

/** The settled state at time t (the last state reached by then). */
const stateAt = (frames, t) => { let s = frames[0]; for (const f of frames) if (f.at <= t) s = f; else break; return s; };

/** The crate on its cable at an offset of dx pixels from under the panel at px: the pendulum. */
function onCable(px, dx, reduced) {
  if (reduced) return { x: px + dx, y: HANG, tilt: 0 };
  const th = Math.asin(Math.max(-0.95, Math.min(0.95, dx / PENDULUM)));
  return { x: px + PENDULUM * Math.sin(th), y: CARRIAGE.pivot + PENDULUM * Math.cos(th), tilt: -th };
}

/**
 * The pose of the room at time t of a run. reduced: Reduce motion (each cue's reduced form). guide:
 * the drop line while the crate hangs held from a locked panel. Returns a pose for ./scene.mjs.
 */
export function poseAt(frames, t, { reduced = false, tags = null, guide = true } = {}) {
  const now = stateAt(frames, t);
  // The state at t: the clock moves on from the last press (the briefing ends, the deadline passes).
  const s = tick(now.state, t).state;
  const pose = restPose();
  pose.tags = tags;
  pose.alive = { ...s.alive };
  const p = panelAt(s, t);
  // Reduce motion: no slide between stops; the panel is at the stop it is snapping to, as a LOCK would take it.
  const at = reduced ? p.stop : p.at;
  const moving = !p.locked && !p.resting && !reduced;
  const px = stopX(at);
  pose.panel.at = at;
  pose.panel.blade = p.locked ? BLADE.locked : BLADE.up;
  pose.panel.lit = p.stop;
  pose.panel.wheel = px / 13;
  pose.console = { ...pose.console, near: p.stop, locked: p.locked, key: s.keys.panel };
  pose.cab.key = s.keys.winch;
  if (!s.alive.winch) pose.cab.cut = true;

  // The crate: rising, trailing the running panel, swinging, falling, lying, or gone down.
  const c = s.crate;
  const done = settled(s, t);
  if (c.state === 'hanging') {
    if (!done && !reduced) {
      const u = clamp01((t - c.since) / TIMING.raise);
      const slide = ease['in-out'](clamp01(u / 0.35));
      pose.crate = { x: lerp(stopX(c.from.x), px, slide), y: lerp(REST_Y[c.from.state] ?? REST.deck, HANG, ease['in-out'](u)), tilt: 0, hooked: true };
    } else if (!p.locked) {
      pose.crate = { x: px - (moving ? p.dir * 10 : 0), y: HANG, tilt: moving ? p.dir * 0.07 : 0, hooked: true };
    } else {
      pose.crate = { ...onCable(px, swingOffset(s.swing, t) * STEP, reduced), hooked: true };
    }
  } else if (c.state === 'sent') {
    pose.crate = { x: stopX(FIXTURES.platform.stop), y: REST.platform, tilt: 0, hooked: false };
  } else {
    const rest = { x: stopX(c.x), y: REST_Y[c.state] };
    // In the intake, the crate is on the hook only while the panel is locked over the hatch.
    const hooked = c.state === 'intake' ? p.locked && p.stop === FIXTURES.intake.stop : c.state !== 'landed';
    pose.crate = { ...rest, tilt: 0, hooked };
    const dt = t - c.since;
    if (c.from?.state === 'hanging' && !reduced && dt < TIMING.lower) {
      // Falling: from where its swing had it (or from part way up, let go while still rising), straight
      // down; the platform's guides centre a landing.
      const lockStop = s.panel.locked ? s.panel.stop : p.at;
      const start = c.from.lift !== undefined
        ? { x: stopX(c.from.x), y: lerp(REST_Y.intake, HANG, ease['in-out'](c.from.lift)), tilt: 0 }
        : onCable(stopX(lockStop), (c.from.x - lockStop) * STEP, false);
      const u = ease.in(clamp01(dt / TIMING.lower));
      pose.crate = { x: lerp(start.x, rest.x, u), y: lerp(start.y, rest.y, u), tilt: lerp(start.tilt, 0, u), hooked: true };
      pose.slack = 1 - u;
    } else if (c.from?.state === 'new' && !reduced && dt < CUES.break.ms) {
      // A new crate, after one broke: it rises into the hatch while the broken one falls.
      pose.crate.y += (1 - ease.out(clamp01(dt / CUES.break.ms))) * 46;
    }
    if (c.state !== 'landed') pose.slack = Math.max(pose.slack, 0.35);
  }
  if (!pose.crate.hooked) pose.hookY = 300;

  // The crates broken so far: each falls whole from where the let-go found it, then lies broken where it
  // fell, for the rest of the Task. On the console, the drop: it falls faster, onto the Panel operator.
  pose.wrecks = [];
  for (const [k, b] of (s.broken ?? []).entries()) {
    const dt = t - b.at;
    const ms = b.on === 'console' ? CUES.drop.ms : CUES.break.ms;
    const to = { x: wreckX(b), y: FLOOR[b.on] };
    if (dt < ms && !reduced) {
      const start = b.hoist !== undefined ? onCable(stopX(b.hoist), (b.x - b.hoist) * STEP, false) : { x: stopX(b.x), y: HANG, tilt: 0 };
      const u = ease.in(clamp01(dt / ms));
      pose.wrecks.push({ whole: true, x: lerp(start.x, to.x, u), y: lerp(start.y, to.y - CRATE / 2, u), tilt: lerp(start.tilt, 0, u) });
      if (b.on === 'console') pose.alive.panel = true;
    } else pose.wrecks.push({ whole: false, ...to, on: b.on, seed: 300 + k * 17, flip: k % 2 === 1 });
  }

  // Each event's cue, from the moment it arrived.
  for (const f of frames) {
    if (f.at > t) break;
    const dt = t - f.at;
    for (const e of f.events) {
      if (e.type === 'RELEASED' && !reduced && dt < CUES.release.ms) pose.panel.blade = lerp(BLADE.locked, BLADE.up, ease.out(dt / CUES.release.ms));
      if (e.type === 'LOCKED') {
        if (!reduced && dt < CUES.lock.ms && s.panel.locked) {
          const u = ease.in(dt / CUES.lock.ms);
          pose.panel.at = lerp(e.x, e.stop, u);
          pose.panel.blade = lerp(BLADE.up, BLADE.locked, u);
        }
        if (dt < 400) pose.effects.push({ kind: 'clunk', at: [stopX(e.stop), BLADE.locked + 4], dir: [0, 1], t: reduced ? 1 : clamp01(dt / 180) });
      }
      if (e.type === 'KILLED' && e.kind === 'cut') {
        const u = reduced ? 1 : ease.in(clamp01(dt / CUES.cut.ms));
        pose.panel.blade = lerp(BLADE.locked, BLADE.cut, u);
        if (u < 1) { pose.alive.winch = true; pose.cab.cut = false; }
        if (dt < CUES.impact.ms && (u >= 1)) {
          const g = reduced ? 1 : ease.out(clamp01((dt - CUES.cut.ms) / 220));
          pose.effects.push({ kind: 'burst', at: [stopX(FIXTURES.cab.stop), 214], r: 80, t: g });
          pose.effects.push({ kind: 'letters', text: 'CHOP!', at: [stopX(FIXTURES.cab.stop) - 150, 250], size: 64, angle: -10 });
        }
      }
      if (e.type === 'KILLED' && e.kind === 'drop' && dt < CUES.impact.ms && (dt >= CUES.drop.ms || reduced)) {
        const g = reduced ? 1 : ease.out(clamp01((dt - CUES.drop.ms) / 220));
        pose.effects.push({ kind: 'burst', at: [OPERATORS.panel.feet[0], OPERATORS.panel.head + 10], r: 90, t: g });
        pose.effects.push({ kind: 'letters', text: 'THUD!', at: [OPERATORS.panel.feet[0] - 170, OPERATORS.panel.head - 40], size: 66, angle: -8 });
      }
      if (e.type === 'STOPPED') {
        const show = reduced ? dt < 600 : dt < CUES.stopped.ms + 500;
        if (e.kind === 'cut') {
          const u = reduced ? 1 : clamp01(dt / 110);
          if (s.panel.locked && s.panel.stop === FIXTURES.cab.stop) { pose.cab.buffer = u; pose.panel.blade = lerp(BLADE.locked, BLADE.caught, u); }
          if (show) pose.effects.push({ kind: 'letters', text: 'CLANK!', at: [stopX(FIXTURES.cab.stop) - 160, 240], size: 50, angle: -6 });
        } else {
          if (!reduced && dt < CUES.stopped.ms && pose.crate?.hooked) pose.crate.y += Math.sin(clamp01(dt / CUES.stopped.ms) * Math.PI) * 26;
          if (show) {
            pose.effects.push({ kind: 'brake', at: [px, CARRIAGE.pivot + 60] });
            pose.effects.push({ kind: 'letters', text: 'CLANK!', at: [px - 170, 250], size: 50, angle: -6 });
          }
        }
      }
      if (e.type === 'MISSED' && c.state !== 'hanging') {
        const from = reduced ? 0 : TIMING.lower;
        if (dt >= from && dt < from + 600) {
          pose.effects.push({ kind: 'letters', text: 'CLUNK', at: [stopX(e.x) + 10, DECK - 130], size: 40, angle: -6 });
          pose.effects.push({ kind: 'clunk', at: [stopX(e.x) - 60, DECK - 10], dir: [-1, 0], t: 1 }, { kind: 'clunk', at: [stopX(e.x) + 60, DECK - 10], dir: [1, 0], t: 1 });
        }
      }
      if (e.type === 'BROKEN' && !f.events.some(x => x.type === 'KILLED')) {
        const from = reduced ? 0 : CUES.break.ms;
        if (dt >= from && dt < from + CUES.break.after) {
          const bx = wreckX(e), fy = FLOOR[e.on];
          pose.effects.push({ kind: 'letters', text: 'CRASH!', at: [Math.min(BOXES.cab[0] + 60, Math.max(170, bx)), fy - 118], size: 50, angle: -8 });
          const u = reduced ? 1 : clamp01((dt - from) / 220);
          pose.effects.push({ kind: 'clunk', at: [bx - 70, fy - 14], dir: [-1, 0], t: u }, { kind: 'clunk', at: [bx + 70, fy - 14], dir: [1, 0], t: u }, { kind: 'clunk', at: [bx, fy - 62], dir: [0, -1], t: u });
        }
      }
      if (e.type === 'LANDED' && c.state === 'landed') {
        const at = dt - TIMING.lower;
        pose.platform.clamp = reduced || at >= CUES.land.ms;
        pose.platform.lamp = reduced || at >= CUES.land.ms;
        if (!reduced && at < CUES.hookUp.ms) pose.hookY = lerp(REST.platform - CRATE / 2 - 6, 300, ease.out(clamp01(at / CUES.hookUp.ms)));
        if (reduced || at >= 0) pose.crate.hooked = false;
        if (!reduced && at < 0) pose.crate.hooked = true;
      }
      if (e.type === 'SENT') {
        const u = reduced ? 1 : ease['in-out'](clamp01(dt / CUES.send.ms));
        pose.platform = { drop: u, clamp: true, lamp: true };
        pose.crate = u < 1 ? { x: stopX(FIXTURES.platform.stop), y: REST.platform + u * 120, tilt: 0, hooked: false } : null;
        if (dt > (reduced ? 0 : CUES.send.ms * 0.4)) pose.effects.push({ kind: 'letters', text: '+5', at: [stopX(FIXTURES.platform.stop), 470], size: 72, angle: -6, fill: '#F1B84B' });
      }
      // Lost or cancelled: the room dims once any impact has been seen.
      if (e.type === 'ENDED' && e.outcome.result !== 'delivered') {
        const after = f.events.some(x => x.type === 'KILLED') ? CUES.impact.ms : 0;
        pose.dim = reduced ? (dt >= after ? 1 : 0) : clamp01((dt - after) / CUES.dim.ms);
      }
    }
  }

  // The warnings both phones show: the cab's lamp while the panel passes the cab, the console's lamp
  // while the crate's swing is over the console. They flash; Reduce motion keeps them lit steadily.
  const h = hazards(s, t);
  const on = reduced || Math.floor(t / CUES.warning.flash) % 2 === 0;
  pose.cab.lamp = h.cut && on;
  pose.console.lamp = h.drop && on;
  if (h.cut) pose.effects.push({ kind: 'warn', at: [stopX(FIXTURES.cab.stop) - 96, 196], t: 1 });
  // The drop line, while the crate hangs held from a locked panel: where a let-go would drop it now.
  if (guide && h.zone && p.locked && done && pose.crate) {
    const to = { platform: BOXES.platform[1] - 8, console: OPERATORS.panel.head, intake: DECK - 10, deck: DECK }[h.zone];
    pose.line = { from: [pose.crate.x, pose.crate.y + CRATE / 2 + 6], to, tone: h.zone };
  }
  // The speed lines behind the panel while it snaps to the next stop.
  if (moving && s.phase === 'running') pose.effects.push({ kind: 'speed', at: [px - p.dir * 66, CARRIAGE.top + 18], dir: [p.dir, 0], len: 34, spread: 24, n: 3 });
  return pose;
}

/** The time at which the run's last event ends, with its cues played out. */
export function durationOf(frames, { tail = 2600 } = {}) {
  return frames[frames.length - 1].at + tail;
}
