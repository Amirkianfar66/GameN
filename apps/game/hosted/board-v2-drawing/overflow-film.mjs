// Runtime drawing port of Claude cb9386bd716dc346160509d5e49d7348fdaf4f84; source design/board-v2/films/overflow.mjs.
// Only development fence and relative imports adapted; canonical source preserved.
//
// The overflow victim's beat on the successor's four-berth board: the owner's four-bed decision of
// 18 October 2026 (HOSPITAL-4-2026-10-18, issue #155). An incoming player who finds all four beds
// occupied is permanently eliminated and off the board; it takes no bed and cannot be Rescued.
//
// A proposal on Backend's preferred event choice A (H4-CLINICAL-01 on draft #157, and the
// Designer's review on #155): a non-bed occurrence, illustratively HOSPITAL_OVERFLOW_REMOVED
// { phaseId, round, seatId }, still unallocated, with the existing health and placement facts and
// no MEDICAL_OUTCOME. So the beat is not clinical: no bed, berth, monitor, drone or flatline. It
// plays where the victim was, from the snapshot before the occurrence, and ends with the victim
// off the board, as the snapshot published with it has it:
//
//   full     the Hospital's FULL stamp appears beside its caption (the page's text)
//   grey     at its place, the figure becomes #159's grey cut-out
//   lift     the cut-out leaves the board on a short arc to the plaque, shrinking
//   counted  the plaque takes it; its count is the published snapshot's
//
// Inputs: the occurrence's seatId; the victim's room and slot in the snapshot before it (when the
// client held that snapshot; otherwise the beat draws nothing of the victim); the snapshot after
// it; t from the occurrence's presentation start, live only; the device's reduced-motion setting.
// Not an input: an attacker, a role, a side, a faction or any cause beyond the occurrence itself.
// The removal itself is the snapshot's: it holds when the occurrence is missed, expired or
// suppressed by a reconnect's baseline, and then nothing plays.

export const OVERFLOW_FILMS_VERSION = 'board-v2-overflow-films-0.1.0';

export const OVERFLOW_FILM = Object.freeze({
  id: 'hospital-overflow',
  storyboard: 'HOSPITAL-4 (proposal)',
  full: Object.freeze([0, 300]),
  grey: Object.freeze([300, 1100]),
  lift: Object.freeze([1100, 2200]),
  scale: Object.freeze([1, 0.32]),
  counted: Object.freeze([2200, 2500]),
  fullOut: Object.freeze([2500, 2800]),
  end: 2800,
  announce: 1100,
  reduced: Object.freeze({ fadeMs: 80, holdMs: 700, stages: Object.freeze(['grey', 'counted']) }),
});

const clamp01 = v => Math.max(0, Math.min(1, v));
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
const easeOut = v => 1 - (1 - v) ** 2;
const easeInOut = v => (v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2);
const lerp = (a, b, v) => a + (b - a) * v;
const hundredth = v => Math.round(v * 100) / 100 || 0;

/** When the beat has drawn its last: every node it added is gone by then. */
export const overflowEnd = (reduced = false) => {
  const R = OVERFLOW_FILM.reduced;
  return reduced ? R.stages.length * R.holdMs + 2 * R.fadeMs : OVERFLOW_FILM.end;
};

/**
 * What the beat draws at t (ms from the occurrence's presentation start):
 *   stage     'before' | 'full' | 'grey' | 'lift' | 'counted' | 'settle' | 'done' (reduced: 'grey' | 'counted')
 *   full      the FULL stamp: { opacity, scale }
 *   figure    the victim at its place: { opacity (its own figure), grey (its cut-out's opacity) }
 *   flyer     the cut-out leaving the board: { v (along overflowWay(), 0 to 1), scale, opacity } or null
 *   plaque    { scale, counted (whether the count includes the victim) }
 *   announce  whether the client's words are in the live region (from the beat on)
 *   done      nothing is drawn, and nothing the beat added is on the page
 */
export function overflowFrame(t, { reduced = false } = {}) {
  const F = OVERFLOW_FILM;
  const frame = { stage: 'before', full: { opacity: 0, scale: 1 }, figure: { opacity: 1, grey: 0 }, flyer: null, plaque: { scale: 1, counted: false }, announce: false, done: false };
  if (t < 0) return frame;
  const end = overflowEnd(reduced);
  if (t >= end) return { ...frame, stage: 'done', figure: { opacity: 0, grey: 0 }, plaque: { scale: 1, counted: true }, announce: true, done: true };
  if (reduced) {
    // Two still panels, each faded in over 80 ms: the cut-out at its place with FULL; then the place empty and the plaque counting it.
    const { fadeMs, holdMs } = F.reduced;
    const second = t >= fadeMs + holdMs;
    const opacity = second ? Math.min(ramp(t, fadeMs + holdMs, 2 * fadeMs + holdMs), 1 - ramp(t, end - fadeMs, end)) : ramp(t, 0, fadeMs);
    return {
      ...frame, stage: second ? 'counted' : 'grey',
      full: { opacity: second ? 0 : opacity, scale: 1 },
      figure: second ? { opacity: 0, grey: 0 } : { opacity: 0, grey: opacity },
      plaque: { scale: 1, counted: second }, announce: true,
    };
  }
  frame.stage = t < F.full[1] ? 'full' : t < F.grey[1] ? 'grey' : t < F.lift[1] ? 'lift' : t < F.counted[1] ? 'counted' : 'settle';
  frame.full = { opacity: t < F.fullOut[0] ? ramp(t, ...F.full) : 1 - ramp(t, ...F.fullOut), scale: hundredth(lerp(0.8, 1, easeOut(ramp(t, ...F.full)))) };
  const g = easeInOut(ramp(t, ...F.grey));
  frame.figure = t < F.lift[0] ? { opacity: hundredth(1 - g), grey: hundredth(g) } : { opacity: 0, grey: 0 };
  if (t >= F.lift[0] && t < F.lift[1]) {
    const v = easeInOut(ramp(t, ...F.lift));
    frame.flyer = { v: hundredth(v), scale: hundredth(lerp(F.scale[0], F.scale[1], v)), opacity: hundredth(1 - 0.3 * v) };
  }
  if (t >= F.counted[0]) {
    const v = ramp(t, ...F.counted);
    frame.plaque = { scale: hundredth(1 + 0.2 * Math.sin(Math.PI * v)), counted: true };
  }
  frame.announce = t >= F.announce;
  return frame;
}

/** The beat as data for contract/films.json: a proposal, on an unallocated occurrence. */
export function overflowContract() {
  const F = OVERFLOW_FILM;
  return {
    id: F.id, storyboard: F.storyboard, status: 'proposal: on the occurrence of Backend\'s preferred event choice A (H4-CLINICAL-01, draft #157), still unallocated',
    audience: 'public: every phone and the display, from the non-bed overflow occurrence; live only',
    clock: `Milliseconds from the occurrence's presentation start; ${F.end} ms (reduced ${overflowEnd(true)} ms). Nonblocking and cancelable: the board, the timers and the navigation stay usable; it stops at once, the board showing the latest snapshot, when a newer snapshot moves anyone, when the Blackout's window owns the board, or when the page is hidden. Never replayed: not on a reconnect, nor for an expired, duplicate or baseline-suppressed occurrence.`,
    inputs: ['t (from the occurrence\'s presentation start)', 'reduced (the device setting)', 'seatId: the occurrence\'s', 'the snapshot before: the victim\'s room and slot (when the client held it)', 'the snapshot published with it: the victim Eliminated, location null, slotId null'],
    notInputs: ['an attacker, a role, a side, a faction or any cause beyond the occurrence', 'a bed, a berth or a clinical anchor (the victim never had one)', 'a local countdown or the client\'s own observation of time'],
    where: {
      stamp: 'fullStampBox() (fx/overflow.mjs): right of the Hospital\'s caption, in its band',
      way: 'overflowWay() (fx/overflow.mjs): from the victim\'s press point to the plaque\'s centre, on an arc',
      plaque: 'spinePlaqueBox() (fx/overflow.mjs): in the spine between the Hospital and the Jail, at their caption band',
    },
    words: 'None of the beat\'s own: the client\'s announcement of the occurrence (Frontend\'s words, not yet written); announce marks the beat. FULL is the page\'s stamp, as USED is',
    beats: [
      { id: 'full', from: F.full[0], to: F.grey[0], what: 'The Hospital\'s FULL stamp appears beside its caption: the four beds are taken' },
      { id: 'grey', from: F.grey[0], to: F.grey[1], what: 'At the victim\'s place (the snapshot before), its figure becomes the grey cut-out of the off-board record (fx/captain.mjs memorialSvg()), the same whatever its side' },
      { id: 'lift', from: F.lift[0], to: F.lift[1], what: `The cut-out leaves the board on a short arc to the plaque, shrinking to ${F.scale[1]} of its size; its place is empty` },
      { id: 'counted', from: F.counted[0], to: F.end, what: 'The plaque takes it: a small pop, its count the published snapshot\'s; the FULL stamp fades' },
    ],
    reduced: { what: 'Two still panels, each faded in over 80 ms: the grey cut-out at its place with FULL; then the place empty and the plaque counting it. No travel, pop or fade beyond the panels', fadeMs: F.reduced.fadeMs, holdMs: F.reduced.holdMs, stages: F.reduced.stages },
    settled: 'The victim is drawn nowhere on the board; the plaque in the spine counts every character off the board, whatever took them off; Frontend lists them as grey cut-outs with seat and name, and a Code may still name them (#159\'s cards)',
    never: 'No bed, berth, monitor, drone, flatline or admission is drawn for the victim, and no fifth bed; no existing patient or body moves; nothing graphic. No occurrence, no beat',
  };
}
