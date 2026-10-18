// mothership:dev-only
//
// The Alien's Phantom Clone, privately, as two films on its card (storyboard S3; docs/design/clone-s3.md):
// the activation and the expiry, as data, and what the card draws at any moment of either, worked
// out from that moment alone. The art is fx/clone.mjs's.
//
// Owner-private: the card and its films are drawn only on the Alien's own phone, in its sheet, and
// only from that phone's own view (self.cloneStatus, full-game-1.10.0, #153). Nothing is drawn on the
// board, on any phone; nothing reaches the display, another player or the host. Their inputs are the
// time since the film started, which film, and the device's reduced-motion setting: no actor, target,
// attacker, block, side or cause, and no clock of the client's own. The words on the card are the
// client's (today the hosted board's private status line); a film adds none.

export const CLONE_FILMS_VERSION = 'board-v2-clone-films-0.1.0';

export const CLONE_FILM = Object.freeze({
  id: 'clone',
  storyboard: 'S3',
  // The activation, 1.8 s: scan lines sweep up the character; a halftone duplicate forms beside it; the
  // duplicate resolves into the same character; the real one fades to a dotted outline as the lines
  // sweep back down it. CLONE ACTIVE is stamped as it settles.
  activate: Object.freeze({ scan: Object.freeze([0, 400]), duplicate: Object.freeze([400, 900]), resolve: Object.freeze([900, 1300]), vanish: Object.freeze([1300, 1800]), stamp: Object.freeze([1640, 1800]), end: 1800 }),
  // The expiry, 0.9 s, the activation reversed: the lines sweep down the duplicate, which breaks up
  // into its halftone and is gone; the dotted outline fills back into the character. CLONE ENDED.
  expire: Object.freeze({ scan: Object.freeze([0, 300]), dissolve: Object.freeze([300, 600]), restore: Object.freeze([600, 900]), stamp: Object.freeze([740, 900]), end: 900 }),
  // A stamp pops in from 1.06 times its size: a small pop, so that it stays in the words' column and in the card.
  stampScale: Object.freeze([1.06, 1]),
  // Reduced motion: the card before, held, then the card after, cross-faded over 80 ms. No scan, no halftone, no pop.
  reduced: Object.freeze({ holdMs: 400, fadeMs: 80 }),
});

export const CLONE_FILMS = Object.freeze(['activate', 'expire']);

/** When a film has drawn its last: from then on the card is settled (CLONE ACTIVE, or CLONE ENDED). */
export const cloneEnd = (kind, reduced = false) => {
  if (!CLONE_FILMS.includes(kind)) throw new Error(`No Clone film ${kind}`);
  return reduced ? CLONE_FILM.reduced.holdMs + CLONE_FILM.reduced.fadeMs : CLONE_FILM[kind].end;
};

const clamp01 = v => Math.max(0, Math.min(1, v));
const r3 = v => Math.round(v * 1000) / 1000;
const ease = v => (v < 0.5 ? 2 * v * v : 1 - ((-2 * v + 2) ** 2) / 2);
/** Where t is in [from, to), as a share 0 to 1 (0 before, 1 after). */
const share = (t, [from, to]) => clamp01((t - from) / (to - from));
const within = (t, [from, to]) => t >= from && t < to;

/** The card at rest: active (the outline and the duplicate, CLONE ACTIVE), or ended (the character alone, CLONE ENDED). */
function settled(kind) {
  const active = kind === 'active';
  return {
    card: true, stage: kind,
    real: { opacity: active ? 0 : 1 },
    outline: { opacity: active ? 1 : 0 },
    halftone: { opacity: 0, density: 0 },
    clone: { opacity: active ? 1 : 0 },
    pad: active ? 1 : 0,
    scan: null,
    stamps: { active: { opacity: active ? 1 : 0, scale: 1 }, ended: { opacity: active ? 0 : 1, scale: 1 } },
  };
}

/**
 * The card at t milliseconds of a film (kind 'activate' or 'expire'), with reduced motion or not:
 *   card       whether the card is drawn (an activation's card appears with its film)
 *   stage      the beat, or 'none', 'active', 'ended' outside the film
 *   real       the character, at its own place: { opacity }
 *   outline    its dotted outline there: { opacity }
 *   halftone   the duplicate's halftone, beside it: { opacity, density 0 to 1 }
 *   clone      the duplicate resolved, the same drawing: { opacity }
 *   pad        the duplicate's projector pad lit, 0 to 1
 *   scan       null, or the scan band { over: 'real' | 'clone', y: 0 (the feet) to 1 (the head), dir: 'up' | 'down', opacity }
 *   stamps     { active, ended }: each { opacity, scale }
 *   done       whether the film is over
 * Nothing else is an input.
 */
export function cloneFrame(kind, t, { reduced = false } = {}) {
  const end = cloneEnd(kind, reduced);
  const done = t >= end;
  if (kind === 'activate') {
    if (t < 0) return { ...settled('ended'), card: false, stage: 'none', real: { opacity: 0 }, stamps: { active: { opacity: 0, scale: 1 }, ended: { opacity: 0, scale: 1 } }, done: false };
    if (done) return { ...settled('active'), done: true };
    if (reduced) {
      const { holdMs, fadeMs } = CLONE_FILM.reduced;
      const v = r3(share(t, [holdMs, holdMs + fadeMs]));
      return {
        card: true, stage: v === 0 ? 'before' : 'fade',
        real: { opacity: r3(1 - v) }, outline: { opacity: v }, halftone: { opacity: 0, density: 0 }, clone: { opacity: v }, pad: v, scan: null,
        stamps: { active: { opacity: v, scale: 1 }, ended: { opacity: 0, scale: 1 } }, done: false,
      };
    }
    const A = CLONE_FILM.activate;
    const stage = ['scan', 'duplicate', 'resolve', 'vanish'].find(name => within(t, A[name]));
    const forming = ease(share(t, A.duplicate));
    const resolving = ease(share(t, A.resolve));
    const vanishing = ease(share(t, A.vanish));
    const stamp = share(t, A.stamp);
    const scan = within(t, A.scan) ? { over: 'real', y: r3(share(t, A.scan)), dir: 'up', opacity: 0.95 }
      : within(t, A.vanish) ? { over: 'real', y: r3(1 - share(t, A.vanish)), dir: 'down', opacity: 0.6 } : null;
    return {
      card: true, stage,
      real: { opacity: r3(1 - vanishing) },
      outline: { opacity: r3(vanishing) },
      halftone: { opacity: r3(t < A.resolve[0] ? forming : 1 - resolving), density: r3(0.15 + 0.85 * forming) },
      clone: { opacity: r3(resolving) },
      pad: r3(forming),
      scan,
      stamps: { active: { opacity: r3(stamp), scale: r3(stamp > 0 ? CLONE_FILM.stampScale[0] + (CLONE_FILM.stampScale[1] - CLONE_FILM.stampScale[0]) * ease(stamp) : 1) }, ended: { opacity: 0, scale: 1 } },
      done: false,
    };
  }
  // The expiry: before it, the active card; after it, the ended one.
  if (t < 0) return { ...settled('active'), done: false };
  if (done) return { ...settled('ended'), done: true };
  if (reduced) {
    const { holdMs, fadeMs } = CLONE_FILM.reduced;
    const v = r3(share(t, [holdMs, holdMs + fadeMs]));
    return {
      card: true, stage: v === 0 ? 'before' : 'fade',
      real: { opacity: v }, outline: { opacity: r3(1 - v) }, halftone: { opacity: 0, density: 0 }, clone: { opacity: r3(1 - v) }, pad: r3(1 - v), scan: null,
      // The stamps take turns: CLONE ACTIVE out in the fade's first half, CLONE ENDED in during its second, never both at once.
      stamps: { active: { opacity: r3(clamp01(1 - 2 * v)), scale: 1 }, ended: { opacity: r3(clamp01(2 * v - 1)), scale: 1 } }, done: false,
    };
  }
  const E = CLONE_FILM.expire;
  const stage = ['scan', 'dissolve', 'restore'].find(name => within(t, E[name]));
  const [d0, d1] = E.dissolve;
  const mid = (d0 + d1) / 2;
  const breaking = ease(share(t, [d0, mid]));
  const fading = ease(share(t, [mid, d1]));
  const restoring = ease(share(t, E.restore));
  const stamp = share(t, E.stamp);
  return {
    card: true, stage,
    real: { opacity: r3(restoring) },
    outline: { opacity: r3(1 - restoring) },
    halftone: { opacity: r3(t < mid ? breaking : 1 - fading), density: r3(1 - 0.85 * fading) },
    clone: { opacity: r3(1 - breaking) },
    pad: r3(1 - ease(share(t, E.dissolve))),
    scan: within(t, E.scan) ? { over: 'clone', y: r3(1 - share(t, E.scan)), dir: 'down', opacity: 0.95 } : null,
    stamps: {
      active: { opacity: r3(1 - share(t, E.scan)), scale: 1 },
      ended: { opacity: r3(stamp), scale: r3(stamp > 0 ? CLONE_FILM.stampScale[0] + (CLONE_FILM.stampScale[1] - CLONE_FILM.stampScale[0]) * ease(stamp) : 1) },
    },
    done: false,
  };
}

// ---------- the card's state and its trigger, from the own view alone ----------

/**
 * The private status line the client shows for the own view's cloneStatus: the hosted board's words
 * (Frontend, full-game-1.10.0 baseline 6ca4b51, packages/presentation/src/model/connected-player.ts,
 * line 361), quoted. null for a view with no Clone (every seat but the Alien's).
 */
export const cloneWords = status => (status == null ? null
  : status.active ? `Clone active through Round ${status.expiresAfterRound}.`
    : status.used ? 'Clone inactive; its once-only use is spent.' : 'Clone unused.');

/**
 * Which card the own view shows (null: none): 'active' while the Clone is active, 'ended' once its use
 * is spent and it is no longer active; none before it is used (the Actions tray offers it then), none
 * for a view with no Clone, and none once the Alien is Eliminated: elimination ends it with no art.
 */
export function cloneCard({ status, eliminated = false }) {
  if (status == null || eliminated || !status.used) return null;
  return status.active ? 'active' : 'ended';
}

/**
 * Which film a change of the own view starts (null: none, the card simply shows its state): the
 * activation when a live view first says the Clone is active where the one before said it was unused;
 * the expiry when a live view says it ended where the one before said it was active, the Alien not
 * Eliminated. live is false for a baseline, a reconnect or a resumed page: those never replay a film.
 * The client plays it the first time the card is in the foreground (the private area open, the page
 * visible); never twice.
 */
export function cloneFilmFor({ before, after, live, eliminated = false }) {
  if (!live || before == null || after == null || eliminated) return null;
  if (!before.used && after.used && after.active) return 'activate';
  if (before.active && !after.active && after.used) return 'expire';
  return null;
}

/** The films' contract, for contract/films.json. */
export function cloneContract() {
  const A = CLONE_FILM.activate, E = CLONE_FILM.expire, R = CLONE_FILM.reduced;
  return {
    id: CLONE_FILM.id, storyboard: CLONE_FILM.storyboard, status: 'proposal',
    audience: 'owner-private: its owner\'s own phone alone, in its sheet\'s private area, from its own view (self.cloneStatus, full-game-1.10.0: null for every other seat). Never on the board, on any phone; never on the display, another player\'s phone or the host. A block by the Clone is S4\'s, exactly as Protection\'s',
    clock: `Milliseconds from the film's start: the activation ${A.end} ms (reduced ${cloneEnd('activate', true)} ms), the expiry ${E.end} ms (reduced ${cloneEnd('expire', true)} ms). Nonblocking: the sheet's controls and the board stay usable. The film stops at once, the card showing its state, when the private area closes or conceals, the page is hidden, or a newer view changes the Clone`,
    inputs: ['t (from the film\'s start)', 'the film: activate or expire (cloneFilmFor(): a live change of the own view\'s cloneStatus)', 'reduced (the device setting)', 'the own seat\'s character and the clothes of its current place, for the portrait', 'the own view\'s cloneStatus, for the card\'s state and the client\'s status line'],
    notInputs: ['an actor, a target, an attacker or a block', 'a role word, a side, a faction or a cause on the card', 'another seat\'s view', 'a local countdown or the client\'s own observation of time', 'the activation round as a timer: expiresAfterRound is shown in the client\'s words only'],
    where: 'The sheet\'s body, as its private claim (js/turns.mjs turnsLayout(); fx/clone.mjs cloneCardLayout()): the portrait window at the card\'s start, the words after it; never under the raised Pass',
    words: 'None of the film\'s own. CLONE ACTIVE and CLONE ENDED are the page\'s stamps; the status line is the client\'s (today the hosted board\'s "Clone active through Round 3." and "Clone inactive; its once-only use is spent.")',
    beats: {
      activate: [
        { id: 'scan', from: A.scan[0], to: A.scan[1], what: 'Holographic scan lines sweep up the character, feet to head' },
        { id: 'duplicate', from: A.duplicate[0], to: A.duplicate[1], what: 'A halftone duplicate silhouette forms beside it, on a second projector pad' },
        { id: 'resolve', from: A.resolve[0], to: A.resolve[1], what: 'The duplicate resolves into the same character, the same drawing in the same clothes' },
        { id: 'vanish', from: A.vanish[0], to: A.vanish[1], what: 'The real character fades to a dotted outline as the lines sweep back down it; CLONE ACTIVE is stamped' },
      ],
      expire: [
        { id: 'scan', from: E.scan[0], to: E.scan[1], what: 'The scan lines sweep down the duplicate; CLONE ACTIVE fades' },
        { id: 'dissolve', from: E.dissolve[0], to: E.dissolve[1], what: 'The duplicate breaks up into its halftone and is gone; its pad goes dark' },
        { id: 'restore', from: E.restore[0], to: E.restore[1], what: 'The dotted outline fills back into the character; CLONE ENDED is stamped' },
      ],
    },
    reduced: { what: 'The card before, held, then the card after, cross-faded over 80 ms. No scan, halftone, travel or pop', holdMs: R.holdMs, fadeMs: R.fadeMs },
    never: 'Never on the board or for anyone but its owner. Never replayed: not on a reconnect, a baseline or a resumed page. No card and no film once its owner is Eliminated. A rejected, pending or unknown command plays nothing',
  };
}
