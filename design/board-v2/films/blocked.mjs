// mothership:dev-only
//
// ATTACK BLOCKED as a film (storyboard S4; docs/design/attack-blocked.md): the beats as data, and
// what a blocked attack draws at any moment of its film, worked out from that moment alone.
//
// It is room-visible: only the occupants the server authorizes at the checkpoint receive the room
// fact that starts it, and nothing reaches the display, the host or anyone outside the room. Its
// inputs are the time since that fact's checkpoint and the device's reduced-motion setting. There
// is no input for the defense that blocked the attack (the Alien's Clone or the Undercover's
// Protection), the attacker, a grantor, a count or a direction: both defenses draw the same film.

import { SHIELD_SIZE } from '../fx/blocked.mjs';
import { BLACKOUT, lightsBackAt } from './blackout.mjs';

/** The incoming star's side, in press sides: the Blackout's impact's. */
export const STAR_SIZE = 1.6;

export const BLOCKED = Object.freeze({
  id: 'attack-blocked',
  storyboard: 'S4',
  // A source-free star at the chest, as a hit's: nothing yet says it was blocked.
  incoming: Object.freeze([0, 120]),
  // The shield flashes on, then holds as a bubble, growing from 0.8 to 1.05 of its size.
  shieldFlash: Object.freeze([120, 200]),
  shieldBubble: Object.freeze([200, 360]),
  shieldScale: Object.freeze([0.8, 1.05]),
  // The ring absorbs the attack and eight particles scatter; the shield is spent.
  absorb: Object.freeze([360, 620]),
  ringScale: Object.freeze([0.7, 1.5]),
  // The figure braces, a reduced jolt on its art only, and is back in its place by 900.
  brace: Object.freeze({ from: 120, to: 900, offset: Object.freeze([-2, 1]) }),
  // ATTACK BLOCKED: in at 620, held 1 600 ms, faded over 200.
  label: Object.freeze({ from: 620, popMs: 120, holdMs: 1600, fadeMs: 200 }),
  reduced: Object.freeze({ fadeMs: 80, holdMs: 1600 }),
});

/** When the film has drawn its last: every node it added is gone by then. */
export const blockedEnd = (reduced = false) => (reduced
  ? BLOCKED.reduced.fadeMs * 2 + BLOCKED.reduced.holdMs
  : BLOCKED.label.from + BLOCKED.label.holdMs + BLOCKED.label.fadeMs);

/**
 * In the Blackout (S1) a block's film waits for the lights: it starts once they are fully back
 * (R + 520; reduced, R + 80), or at the outcome if that is published after the cap has already
 * brought them back. Its t is then the time since that start. Null with no outcome.
 */
export function blockedStartInBlackout(outcomeAt, { reduced = false } = {}) {
  if (outcomeAt === null || outcomeAt === undefined) return null;
  const back = lightsBackAt(outcomeAt);
  return Math.max(outcomeAt, back + (reduced ? BLACKOUT.reduced.fadeMs : BLACKOUT.lightsReturn[1]));
}

const clamp01 = v => Math.max(0, Math.min(1, v));
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
const easeOut = v => 1 - (1 - v) ** 2;
const lerp = (a, b, v) => a + (b - a) * v;

/**
 * What a blocked attack draws at t (ms from its checkpoint), the same for both defenses:
 *
 *   star       the incoming star: on, and its scale
 *   shield     its frame (0 for none: 1 the flash, 2 the bubble, 3 spent), scale and opacity
 *   ring       the absorbing ring's scale and opacity (0 for none)
 *   particles  their frame (0 for none) and opacity
 *   brace      the offset of the target's figure in px, to a hundredth (its art only; never its press area)
 *   label      ATTACK BLOCKED: opacity and scale
 *   announce   whether the words are in the live region: while the label is up, so they are
 *              said once, as it appears, and gone with it
 *   done       nothing is drawn, and nothing the film added is on the page
 */
export function blockedFrame(t, { reduced = false } = {}) {
  const B = BLOCKED;
  const frame = {
    stage: 'before', star: { on: false, scale: 1 }, shield: { frame: 0, scale: 1, opacity: 0 },
    ring: { scale: 1, opacity: 0 }, particles: { frame: 0, opacity: 0 }, brace: [0, 0],
    label: { opacity: 0, scale: 1 }, announce: false, done: false,
  };
  if (t < 0) return frame;
  const end = blockedEnd(reduced);
  if (t >= end) return { ...frame, stage: 'done', done: true };
  if (reduced) {
    // A still ring and the label: in over 80 ms, held 1 600, out over 80.
    const opacity = Math.min(ramp(t, 0, B.reduced.fadeMs), 1 - ramp(t, B.reduced.fadeMs + B.reduced.holdMs, end));
    return { ...frame, stage: t < B.reduced.fadeMs ? 'in' : t < B.reduced.fadeMs + B.reduced.holdMs ? 'hold' : 'out', ring: { scale: 1, opacity }, label: { opacity, scale: 1 }, announce: opacity > 0 };
  }
  if (t < B.incoming[1]) {
    frame.stage = 'incoming';
    frame.star = { on: true, scale: lerp(0.6, 1, easeOut(ramp(t, ...B.incoming))) };
  }
  if (t >= B.shieldFlash[0] && t < B.absorb[1]) {
    frame.shield.frame = t < B.shieldFlash[1] ? 1 : t < B.shieldBubble[1] ? 2 : 3;
    frame.shield.scale = lerp(B.shieldScale[0], B.shieldScale[1], easeOut(ramp(t, B.shieldFlash[0], B.shieldBubble[1])));
    frame.shield.opacity = t < B.absorb[0] ? 1 : 1 - ramp(t, ...B.absorb);
    frame.stage = t < B.absorb[0] ? 'shield' : 'absorb';
  }
  if (t >= B.absorb[0] && t < B.absorb[1]) {
    const v = ramp(t, ...B.absorb);
    frame.ring = { scale: lerp(B.ringScale[0], B.ringScale[1], easeOut(v)), opacity: 1 - v };
    frame.particles = { frame: Math.min(3, 1 + Math.floor(v * 3)), opacity: 1 - v * 0.6 };
  }
  if (t >= B.brace.from && t < B.brace.to) {
    // Back fast, then home slowly: never more than the offset, and only the figure's art moves.
    const v = t < B.absorb[0] ? easeOut(ramp(t, B.brace.from, B.absorb[0])) : 1 - easeOut(ramp(t, B.absorb[0], B.brace.to));
    // To a hundredth of a pixel, as a page keeps it.
    frame.brace = B.brace.offset.map(px => Math.round(px * v * 100) / 100 || 0);
  }
  const label = B.label;
  if (t >= label.from) {
    frame.stage = t < B.brace.to ? 'return' : 'label';
    const fadeFrom = label.from + label.holdMs;
    frame.label = { opacity: t < fadeFrom ? 1 : 1 - ramp(t, fadeFrom, fadeFrom + label.fadeMs), scale: lerp(0.9, 1, easeOut(ramp(t, label.from, label.from + label.popMs))) };
    frame.announce = true;
  }
  return frame;
}

/** The film as data for anyone who cannot import the module (contract/films.json). */
export function blockedContract() {
  const B = BLOCKED;
  return {
    id: B.id,
    storyboard: B.storyboard,
    status: 'proposal',
    audience: {
      film: 'room-visible: only the occupants the server authorizes at the checkpoint, from the room fact it sends them. Never the display, the host or anyone outside the room: no banner, count or sound',
      announcement: 'the same recipients, while the label is up: "Attack blocked on <name>." in a polite live region that every screen has and only theirs fills. It names the affected character only',
    },
    clock: 'Milliseconds from the room fact\'s checkpoint. Played live only: never on a reconnect, never for a stale checkpoint.',
    inputs: ['t (from the checkpoint)', 'reduced (the device setting)', 'the target\'s slot (where to draw it)'],
    notInputs: ['the defense that blocked the attack, or its kind', 'the attacker or the kind of attack', 'a grantor', 'a count of blocks or of uses left', 'a direction'],
    sizes: { shield: `${SHIELD_SIZE} x the target's press side, centred on its press point`, star: `${STAR_SIZE} x the press side, as a hit's` },
    label: 'Centred on the press point, 2 px inside the panel and never over the room\'s caption: above the press area, else below the name tag; the two words stacked where one line is wider than the panel',
    beats: [
      { id: 'incoming', from: B.incoming[0], to: B.incoming[1], what: 'A source-free comic star at the chest (the press point), as a hit\'s: no direction or trail' },
      { id: 'shield', from: B.shieldFlash[0], to: B.shieldBubble[1], what: `The hexagonal shield flashes on and blooms from ${B.shieldScale[0]} to ${B.shieldScale[1]} of its size; the figure braces (${Math.abs(B.brace.offset[0])} px back), its art only` },
      { id: 'absorb', from: B.absorb[0], to: B.absorb[1], what: 'The ring expands and fades; eight symmetric particles scatter; the shield is spent' },
      { id: 'return', from: B.label.from, to: B.brace.to, what: 'The figure is back in its authoritative pose. An Injured character stays Injured: bandage kept, no healing glow' },
      { id: 'label', from: B.label.from, to: blockedEnd(false), what: `ATTACK BLOCKED, caption yellow on ink: held ${B.label.holdMs} ms, faded over ${B.label.fadeMs} ms` },
    ],
    reduced: { what: 'A still ring and the label: in over 80 ms, held 1 600 ms, out over 80 ms. No star, bloom, brace or particles', fadeMs: B.reduced.fadeMs, holdMs: B.reduced.holdMs },
    blackout: `In the Blackout a block is a miss on every screen but its room's occupants', whose film starts once the lights are fully back: R + ${BLACKOUT.lightsReturn[1]} (reduced, R + ${BLACKOUT.reduced.fadeMs})`,
    several: 'Several blocks at one checkpoint each play on their own target, together',
    residue: 'Every node the film adds is removed when it ends; nothing is left on the page',
    layers: { L4: 'the room-visible effects layer, clipped to the room\'s panel; mounted only for the authorized recipients', L1: 'the brace moves the target\'s figure art only', L6: 'press areas never move' },
  };
}
