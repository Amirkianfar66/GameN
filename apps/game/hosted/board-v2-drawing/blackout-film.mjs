//
// The Blackout's lighting window as a film (storyboard S1; docs/design/blackout-window.md): the
// beats as data, and what the board shows at any moment of the window, worked out from that
// moment alone. Every phone and the display run it for every normal round, whether or not anyone
// asked for a strike, so its only inputs are public: the time since the window opened, when the
// round's outcome was published, the positions that outcome hit, the device's reduced-motion
// setting and the window's id. There is no input for a request, a side, a selection or a viewer:
// a Blue strike, a Red strike, a miss and a round with no strike draw the same window.
//
// Times are milliseconds from the window's opening, which is the server's previewEndsAt minus
// the five-second preview; the window's end is its endsAt. A client draws from those trusted
// deadlines, never from a clock of its own, so a phone that comes back mid-window draws the
// true moment, and a film is never replayed.
//
// The two stages are the specification's exactly (Q-B03a; rules-contracts, Blackout validation
// and resolution): the lit preview is [0, previewEndsAt) and the dark is [previewEndsAt, endsAt),
// the half-open interval in which a selection is accepted. At previewEndsAt, in both motion
// modes, the lights cut out and every figure, name tag and name leaves the page in the same
// instant: no fade keeps an occupant on the page once a selection can be made.

import { sparkPlan } from './lighting.mjs';

/** 0.2.0: the lights cut out exactly at previewEndsAt in both modes, and the window's line is in the top bar (the Integration review of 13 October 2026). */
export const FILMS_VERSION = 'board-v2-films-0.2.0';

export const BLACKOUT = Object.freeze({
  id: 'blackout-window',
  storyboard: 'S1',
  // The server's window: five seconds lit, ten dark, always the full fifteen.
  previewMs: 5000,
  windowMs: 15000,
  // Darkness holds for the round's outcome, but no longer than this after the window's end.
  holdCapMs: 1500,
  markersIn: [0, 300],
  flicker: [4200, 5000],
  // Two dips of every room's light to about 60%, the same in every room.
  dips: Object.freeze([Object.freeze([4300, 4420]), Object.freeze([4650, 4770])]),
  dipDarkness: 0.43,
  dipRampMs: 30,
  // Each room's own light sparks once, three frames.
  sparkFrames: Object.freeze([Object.freeze([4700, 4740]), Object.freeze([4740, 4790]), Object.freeze([4790, 4860])]),
  // From the outcome's publication (R).
  impactFrames: Object.freeze([Object.freeze([0, 80]), Object.freeze([80, 200]), Object.freeze([200, 320])]),
  shake: Object.freeze({ to: 160, amplitude: 3, steps: Object.freeze([[3, -2], [-3, 1], [2, 2], [-2, -1]]) }),
  lightsReturn: [120, 520],
  markersOut: [520, 900],
  darkCaptions: 0.7,
  // Reduced motion: no flicker, sparks or shake; the same cut at previewEndsAt; 80 ms fades elsewhere.
  reduced: Object.freeze({ fadeMs: 80, burstMs: 600 }),
  flashLimit: Object.freeze({ perSecond: 3, panelShare: 0.25 }),
});

const clamp01 = v => Math.max(0, Math.min(1, v));
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
const easeOut = v => 1 - (1 - v) ** 2;

/** When the lights come back: with the outcome, or at the cap if the outcome is late. */
export function lightsBackAt(outcomeAt) {
  const cap = BLACKOUT.windowMs + BLACKOUT.holdCapMs;
  return outcomeAt === null || outcomeAt === undefined ? cap : Math.min(Math.max(outcomeAt, BLACKOUT.windowMs), cap);
}

/** How dark the flicker makes every room at t (0 lit; dipDarkness at the bottom of a dip). */
function flickerDarkness(t) {
  for (const [from, to] of BLACKOUT.dips) {
    if (t >= from && t < to) {
      const down = ramp(t, from, from + BLACKOUT.dipRampMs);
      const up = 1 - ramp(t, to - BLACKOUT.dipRampMs, to);
      return BLACKOUT.dipDarkness * Math.min(down, up);
    }
  }
  return 0;
}

const frameIn = (t, frames, offset = 0) => {
  const index = frames.findIndex(([from, to]) => t >= offset + from && t < offset + to);
  return index < 0 ? 0 : index + 1;
};

/**
 * What the board shows at t: the same for every phone and the display.
 *
 *   darkness   0..1, the opacity of the rooms' dark drawing over the lit board (every room alike)
 *   people     'shown', 'fading' or 'gone': the figures and their name tags (gone: not on the page at
 *              all). Shown through the whole lit preview; gone from previewEndsAt in both modes
 *   markers    the position markers' opacity and style (preview or dark)
 *   captions   the room captions' opacity
 *   sparks     the spark frame (0 for none) and, per room, which light throws it
 *   impact     the impact frame (0 for none) at each hit position, the static burst for reduced motion
 *   shake      the offset of a hit room's art (never its markers, captions or press areas)
 *   line       whether the top bar carries the window's line (a second row, the same box on every
 *              phone and the display): from the window's opening until the lights start back
 *   clock      what the top bar's timer counts down to, and how long is left
 *   selection  whether an eligible Disabler's selection is open: exactly [previewEndsAt, endsAt)
 */
export function blackoutFrame(t, { outcomeAt = null, hits = [], reduced = false, windowId } = {}) {
  const B = BLACKOUT;
  const back = lightsBackAt(outcomeAt);
  const plan = sparkPlan(windowId);
  const fade = B.reduced.fadeMs;
  const frame = {
    stage: 'before', darkness: 0, people: 'shown', peopleOpacity: 1,
    markers: { opacity: 0, style: 'preview' }, captions: 1,
    sparks: { frame: 0, plan }, impact: { frame: 0, burst: false, slots: [...hits] }, shake: [0, 0],
    line: false, clock: null, selection: false, darkIcon: false,
  };
  if (t < 0) return frame;

  // The markers: in at the start, out once the lights are back.
  const markersIn = reduced ? ramp(t, 0, fade) : easeOut(ramp(t, ...B.markersIn));
  const outFrom = back + B.markersOut[0];
  const markersOut = reduced ? 1 - ramp(t, outFrom, outFrom + fade) : 1 - ramp(t, outFrom, back + B.markersOut[1]);
  frame.markers.opacity = Math.min(markersIn, markersOut);

  // The dark: the flicker in the lit preview's last 800 ms (full motion only), then, at
  // previewEndsAt exactly, the lights cut out in every room; back with the outcome.
  const dark = t >= B.previewMs;
  const returnStart = reduced ? back : back + B.lightsReturn[0];
  const returnEnd = reduced ? back + fade : back + B.lightsReturn[1];
  const comingBack = 1 - easeOut(ramp(t, returnStart, returnEnd));
  frame.darkness = dark ? comingBack : (reduced ? 0 : flickerDarkness(t));

  // The people: on the page through the whole lit preview, off it from previewEndsAt (the same
  // instant the selection opens), back with the lights.
  if (dark && t < returnEnd) {
    const shown = t >= returnStart ? ramp(t, returnStart, returnEnd) : 0;
    frame.people = shown > 0 ? 'fading' : 'gone';
    frame.peopleOpacity = shown;
  }
  frame.markers.style = dark && t < (returnStart + returnEnd) / 2 ? 'dark' : 'preview';
  frame.captions = 1 - (1 - B.darkCaptions) * frame.darkness;
  // The window's line in the top bar: from the window's opening, and gone, with the clock, as the lights start back.
  frame.line = t < returnStart;
  frame.darkIcon = reduced && frame.darkness > 0;

  // The flicker's sparks, full motion only.
  if (!reduced) frame.sparks.frame = frameIn(t, B.sparkFrames);

  // The outcome: an impact at each hit position as it is published, and a short shake of its room's art.
  if (outcomeAt !== null && outcomeAt !== undefined && hits.length) {
    if (reduced) frame.impact.burst = t >= outcomeAt && t < outcomeAt + B.reduced.burstMs;
    else {
      frame.impact.frame = frameIn(t, B.impactFrames, outcomeAt);
      if (t >= outcomeAt && t < outcomeAt + B.shake.to) frame.shake = B.shake.steps[Math.floor((t - outcomeAt) / (B.shake.to / B.shake.steps.length))];
    }
  }

  frame.selection = t >= B.previewMs && t < B.windowMs;
  frame.clock = t < B.previewMs ? { label: 'Lights out in', remainingMs: B.previewMs - t }
    : t < returnStart ? { label: 'Lights out', remainingMs: Math.max(0, B.windowMs - t) } : null;
  frame.stage = t < B.markersIn[1] ? 'markers-in'
    : t < (reduced ? B.previewMs : B.flicker[0]) ? 'preview'
      : t < B.previewMs ? 'flicker'
        : t < B.windowMs ? 'dark'
          : t < returnStart ? 'hold'
            : t < returnEnd ? 'return'
              : t < back + B.markersOut[1] ? 'settle' : 'after';
  return frame;
}

/**
 * The film's flashes for an outcome: every quick change of light the window makes, with what it
 * covers. The check counts them in every second and measures their size.
 */
export function blackoutFlashes({ outcomeAt = null, hits = [] } = {}) {
  const flashes = BLACKOUT.dips.map(([from]) => ({ at: from, covers: 'board' }));
  flashes.push({ at: BLACKOUT.sparkFrames[0][0], covers: 'light' });
  if (outcomeAt !== null && hits.length) flashes.push({ at: outcomeAt, covers: 'positions', count: hits.length });
  return flashes.sort((a, b) => a.at - b.at);
}

/** The film as data for anyone who cannot import the module (contract/films.json). */
export function blackoutContract() {
  const B = BLACKOUT;
  return {
    id: B.id,
    storyboard: B.storyboard,
    status: 'proposal',
    audience: {
      lighting: 'public: every phone and the display, every normal round, whether or not anyone asked for a strike',
      markers: 'public',
      line: 'public box: the window\'s line, a second row of the top bar from the window\'s opening until the lights start back, the same box on every phone and the display. It says "Remember who is where." in the lit preview and "Wait for the lights." in the dark on every screen but the eligible Disabler\'s, whose line is their own selection (owner-private). The top bar is above the board, so the line covers no position',
      selection: 'owner-private: the eligible Disabler\'s own phone, in their bound room only',
      outcome: 'public: the round\'s published batch (authorized hits only; a miss shows nothing anywhere)',
      blocks: 'room-visible: a blocked strike is a miss in public; ATTACK BLOCKED (S4, films/blocked.mjs) plays only for its room\'s occupants, once the lights are back',
    },
    clock: 'Milliseconds from the window\'s opening: previewEndsAt - 5000. Drawn from the trusted previewEndsAt and endsAt, never from a local start time.',
    inputs: ['t (from the trusted deadlines)', 'outcomeAt (the round\'s publication, R)', 'hits (slot ids of authorized hits)', 'reduced (the device setting)', 'windowId (public)'],
    notInputs: ['a request or its absence', 'a side (Blue or Red)', 'a selection', 'a viewer or audience', 'a role, a cause or a defense'],
    server: { previewMs: B.previewMs, windowMs: B.windowMs, holdCapMs: B.holdCapMs },
    beats: [
      { id: 'markers-in', from: B.markersIn[0], to: B.markersIn[1], what: 'Numbered position markers fade in at every fixed slot of every room, empty ones included. The top bar shows the window\'s clock and, in a second row, its line' },
      { id: 'preview', from: B.markersIn[1], to: B.flicker[0], what: 'Lights on: figures, name tags and markers' },
      { id: 'flicker', from: B.flicker[0], to: B.flicker[1], what: `Inside the lit preview: two dips of every room's light (${B.dips.map(([a, b]) => `${a}-${b}`).join(', ')}) and each room's own light sparking at ${B.sparkFrames[0][0]}, which light seeded by the window id. People stay on the page throughout` },
      { id: 'lights-out', at: B.previewMs, what: 'At previewEndsAt exactly, in both motion modes: every room cuts to its dark drawing; every figure, name tag and name leaves the page and the accessibility tree; markers turn dark; captions to 70%; the top bar\'s line says the dark\'s words. The selection opens in the same instant' },
      { id: 'dark', from: B.previewMs, to: B.windowMs, what: 'Static dark, the half-open interval [previewEndsAt, endsAt). The eligible Disabler selects in their bound room' },
      { id: 'hold', from: B.windowMs, to: `R, at most ${B.windowMs + B.holdCapMs}`, what: 'Dark until the outcome is published' },
      { id: 'impact', from: 'R', to: `R+${B.impactFrames.at(-1)[1]}`, what: 'At each authorized hit: the flash, the star, its rays; the hit room\'s art shakes 3 px for 160 ms. Nothing at a miss' },
      { id: 'lights-return', from: `R+${B.lightsReturn[0]}`, to: `R+${B.lightsReturn[1]}`, what: 'Every room comes back together; people in their published state and place: a hit patient in the Hospital, at the slot the authoritative state gives, in the gown. The top bar\'s clock and line go as the lights start back' },
      { id: 'settle', from: `R+${B.markersOut[0]}`, to: `R+${B.markersOut[1]}`, what: 'Markers fade out; the board is normal' },
    ],
    reduced: {
      what: 'No flicker, sparks, shake or travel. The same cut to the static dark at previewEndsAt, with a still bolt in each caption; 80 ms fades elsewhere: markers in at 0, one fade back at R; a still burst on each hit position for 600 ms',
      fadeMs: B.reduced.fadeMs, burstMs: B.reduced.burstMs,
    },
    flashLimit: { perSecond: B.flashLimit.perSecond, panelShare: B.flashLimit.panelShare, note: 'Counted over every second of the film; a flash\'s area is its bright part (a dip covers the board, which is why there are only two)' },
    layers: {
      L1: 'figures (hidden in the dark, not on the page)',
      L3: 'each room\'s dark drawing over its art, clipped to the panel; sparks; impacts; markers',
      L5: 'the eligible Disabler\'s chosen marker (private)',
      L6: 'press areas: never moved, never shaken',
      L7: 'room captions (70% in the dark)',
      L10: 'top bar and navigation: never dimmed; the top bar carries the window\'s clock and line (public box; the eligible Disabler\'s line private)',
    },
  };
}
