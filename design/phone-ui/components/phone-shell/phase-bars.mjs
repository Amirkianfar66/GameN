// The phase bars: the top bar's words for each game step with no active player, as the phone pack draws
// them (sheet 07's specimens, with the screens of sheets 21, 30, 40, 41, 44 and 45). Runtime source,
// Designer's, part of the phone shell (0.2.10) and under its version: Frontend gives the facts it reads
// from the projection, and each function returns the shell's `bar` (or its toast), so every phone says
// the same words and they exist once.
//
// What it never does: read an offer, a role or a rule, or work out who may act. `own` and `office` say
// which sheet this phone shows, `hasOfficer` only that the office is held, and the rest is public. A
// fact that is missing draws the title alone, with no line under it; a phase that is another
// component's is refused by name, and one this file does not know throws.
//
// Amber. The shell's clock turns amber in the last 10 s, and amber means "act now".
//   A bar under which someone acts keeps it: the deciding player's own bar (Appoint Officer, Block a
//   move, an office's Setting course), and the two public bars under which a hidden player may act,
//   Before turns (the Alien's Blackhole) and the Blackout (a Disabler's position). Their bar must be
//   everyone's bar, so everyone keeps the amber.
//   A public bar under which no one acts is never amber (urgentAtMs: -1): everyone else's New Officer,
//   everyone else's Setting course, and Ship synchronized, whose clock is a ring.
//
// Promises and ⋮ pass through as given, and are dropped only where the pack's bar has none (ui.mjs
// topBar()): no Promises on Ship synchronized, a brief fixed presentation; neither on Loading the ship,
// which is before the match.

import { clockText } from './phone-shell.mjs';

/** The pack's words, once. A function takes what the fixture's frame names: a player, a time, a round, a count. */
export const PHASE_WORDS = Object.freeze({
  // Before turns: sheet 07's specimen; sheet 21, "Officer's block shown"; sheet 40, the Officer's own.
  before: Object.freeze({ title: 'Before turns', open: 'Officer block · Blackhole', start: 'Turns start at 0:00' }),
  block: Object.freeze({ title: 'Block a move', sub: 'Before turns · Officer' }),
  // The Officer's appointment: sheets 07 and 40, "Others wait"; sheet 40, the Captain's own.
  appointment: Object.freeze({ title: 'New Officer', chooses: name => `${name} chooses` }),
  appoint: Object.freeze({ title: 'Appoint Officer', sub: 'Random if time runs out' }),
  // The Blackout: sheets 07 and 30, lit and dark.
  blackout: Object.freeze({ title: 'Blackout', lit: time => `Lights out in ${time}`, dark: 'Dark · positions fixed' }),
  // The six seconds after a Sync: sheets 07 and 44.
  synchronized: Object.freeze({ title: 'Ship synchronized' }),
  // Navigation: sheet 41. Everyone's line is sheet 41's own; sheet 07's specimen puts "Round 3 complete" under
  // this title, which sheet 41 draws under "The ship moved" (the Lead's decision, 16 November 2026).
  course: Object.freeze({ title: 'Setting course', everyone: 'The offices are setting it', captain: 'Captain · private', officer: 'Officer · private' }),
  moved: Object.freeze({ title: 'The ship moved', complete: round => `Round ${round} complete` }),
  // Sheet 45: loading, before the match; reconnecting (sheet 07 too); and the toast of a phase that closed.
  loading: Object.freeze({ title: 'Loading the ship', room: (index, total) => `Room ${index} of ${total}` }),
  reconnecting: Object.freeze({ title: 'Reconnecting…', lastSeen: round => `Showing Round ${round} as last seen` }),
  closed: 'That phase closed · choices cleared',
});

/** The projection's phases phaseBar() draws (packages/contracts, PlanetPhaseKind). */
export const PHASE_BAR_PHASES = Object.freeze(['PRE_TURN', 'OFFICER_APPOINTMENT', 'BLACKOUT', 'BLACKHOLE_PRESENTATION',
  'NAV_SETTING', 'NAV_TIE', 'NAV_CAPTAIN_CONFIRM', 'NAV_OFFICER_CONFIRM']);
/** The projection's phases whose bar is another's: phaseBar() refuses each with these words. */
export const PHASE_BAR_REFUSED = Object.freeze({
  ORDINARY_TURN: 'A turn is the shell\'s turn bar: { kind: \'turn\', who, self }',
  CAPTAIN_ELECTION: 'A ballot\'s bar is the vote component\'s ballotBar() (design/phone-ui/components/vote)',
  JAIL_VOTE: 'A ballot\'s bar is the vote component\'s ballotBar() (design/phone-ui/components/vote)',
  VOTE_RESULT: 'A result\'s bar is the vote component\'s resultBar() (design/phone-ui/components/vote)',
  HACK_DECLARE: 'A private talk\'s bar is the private talk component\'s talkBar() (design/phone-ui/components/private-talk)',
  HACK_RESULT: 'A private talk\'s bar is the private talk component\'s talkBar() (design/phone-ui/components/private-talk)',
  HACK: 'A private talk\'s bar is the private talk component\'s talkBar() (design/phone-ui/components/private-talk)',
  FOOD_SUPPLY: 'Food Supply draws its own bar (the Food surface, design/phone-ui/components/food)',
  FINISHED: 'The end of a match has no top bar (sheet 44): give the shell bar: null',
  ABORTED: 'The end of a match has no top bar (sheet 44): give the shell bar: null',
});

const isText = value => typeof value === 'string' && value.length > 0;
const isRound = value => Number.isSafeInteger(value) && value >= 1;
const given = value => value !== null && value !== undefined;

/**
 * The shell's phase bar from its parts: the line only when there is one, the round and the clock only
 * when given, and Promises and ⋮ as given. `never`: the clock is never amber. `ring`: the clock is a
 * ring of the share of the phase gone, for which it needs the phase's whole length.
 */
function bar({ icon, title, sub = null, tone = null }, { round, remainingMs, durationMs, promises, menu } = {}, { never = false, ring = false } = {}) {
  const out = { kind: 'phase', icon, title };
  if (isText(sub)) out.sub = sub;
  if (tone) out.tone = tone;
  if (Number.isSafeInteger(round) && round >= 0) out.round = round;
  if (Number.isFinite(remainingMs)) {
    const left = Math.max(0, remainingMs);
    out.timer = { remainingMs: left };
    if (never) out.timer.urgentAtMs = -1;
    if (ring && Number.isFinite(durationMs) && durationMs > 0) out.timer.ring = Math.min(1, Math.max(0, (durationMs - left) / durationMs));
  }
  if (given(promises)) out.promises = promises;
  if (given(menu)) out.menu = menu;
  return out;
}

/**
 * The top bar for a phase of the projection (`phase` is its `phase.kind`, as it is).
 *   round, remainingMs   the round, and the phase's time left by the trusted clock; without it, no clock
 *   durationMs           the phase's whole length (endsAt − startedAt): Ship synchronized's ring
 *   own                  true: this phone shows the deciding player's own sheet, the Captain's "Choose your
 *                        Officer" or the Officer's "Block movement" (choosing, or done). The bar follows the sheet
 *   chooser              { name }: the Captain, who chooses the Officer, for everyone else's bar
 *   hasOfficer, blocked  true: the Officer's office is held (whether or not its holder can act); a block is shown
 *   dark, lightsOutMs    the Blackout: true once the lights are out; before that, the time until they go
 *   office               'captain' or 'officer': this phone shows that office's private Navigation sheet
 *   promises, menu       the shell's, passed through
 * Only `true` counts for own, hasOfficer, blocked and dark: left out, each reads as false.
 */
export function phaseBar({ phase, round = null, remainingMs = null, durationMs = null, own = false, chooser = null, hasOfficer = false,
  blocked = false, dark = false, lightsOutMs = null, office = null, promises = null, menu = null } = {}) {
  if (Object.hasOwn(PHASE_BAR_REFUSED, phase)) throw new TypeError(`${PHASE_BAR_REFUSED[phase]}, not phaseBar()`);
  if (!PHASE_BAR_PHASES.includes(phase)) throw new TypeError(`phaseBar() draws ${PHASE_BAR_PHASES.join(', ')}, not ${JSON.stringify(phase)}`);
  const W = PHASE_WORDS, facts = { round, remainingMs, durationMs, promises, menu };
  switch (phase) {
    case 'PRE_TURN':
      // The Officer's own first, then a block shown, then whether there is an Officer at all: with none (Round 1),
      // there is no block to wait for, and the line that is always true stands.
      if (own === true) return bar({ icon: 'officer', title: W.block.title, sub: W.block.sub }, facts);
      return bar({ icon: 'hourglass', title: W.before.title, sub: blocked !== true && hasOfficer === true ? W.before.open : W.before.start }, facts);
    case 'OFFICER_APPOINTMENT':
      if (own === true) return bar({ icon: 'officer', title: W.appoint.title, sub: W.appoint.sub }, facts);
      return bar({ icon: 'officer', title: W.appointment.title, sub: isText(chooser?.name) ? W.appointment.chooses(chooser.name) : null }, facts, { never: true });
    case 'BLACKOUT':
      if (dark === true) return bar({ icon: 'dark', title: W.blackout.title, sub: W.blackout.dark, tone: 'dark' }, facts);
      return bar({ icon: 'lit', title: W.blackout.title, sub: Number.isFinite(lightsOutMs) ? W.blackout.lit(clockText(lightsOutMs)) : null }, facts);
    case 'BLACKHOLE_PRESENTATION':
      return bar({ icon: 'blackhole', title: W.synchronized.title }, { ...facts, promises: null }, { never: true, ring: true });
    default: {
      // The four navigation phases: one neutral window for everyone, and the offices' own private view.
      const mine = office === 'captain' || office === 'officer';
      return bar({ icon: 'course', title: W.course.title, sub: mine ? W.course[office] : W.course.everyone }, facts, { never: !mine });
    }
  }
}

/**
 * "The ship moved · Round 3 complete" (sheet 41), with no clock: the projection gives the move as
 * navigation.lastMovedRound under the next round's first phase, so when and how long it shows is Frontend's.
 * `round` is the round that completed.
 */
export function movedBar({ round = null, promises = null, menu = null } = {}) {
  return bar({ icon: 'course', title: PHASE_WORDS.moved.title, sub: isRound(round) ? PHASE_WORDS.moved.complete(round) : null }, { round, promises, menu });
}

/**
 * "Loading the ship · Room 3 of 5" (sheet 45), before the match: no round, clock, Promises or ⋮. The count is
 * the app's own, of the room pictures it loads. `index` counts from 1: { index: 3, total: 5 } is "Room 3 of 5".
 */
export function loadingBar({ index = null, total = null } = {}) {
  const counted = Number.isSafeInteger(index) && Number.isSafeInteger(total) && index >= 1 && index <= total;
  return bar({ icon: 'hourglass', title: PHASE_WORDS.loading.title, sub: counted ? PHASE_WORDS.loading.room(index, total) : null });
}

/** "Reconnecting… · Showing Round 3 as last seen" (sheets 07 and 45), with no clock. `round` is the last round this phone saw. */
export function reconnectingBar({ round = null, promises = null, menu = null } = {}) {
  return bar({ icon: 'retry', title: PHASE_WORDS.reconnecting.title, sub: isRound(round) ? PHASE_WORDS.reconnecting.lastSeen(round) : null }, { round, promises, menu });
}

/**
 * The shell's toast when a phase closed under an open choice (sheet 45, "Phase closed"), on this phone only.
 * `id` is the closed phase's, so the toast shows once for it.
 */
export function phaseClosedToast({ id } = {}) {
  if (!isText(String(id ?? ''))) throw new TypeError('A toast needs the closed phase\'s id, so it shows once');
  return { id: String(id), text: PHASE_WORDS.closed, icon: 'info' };
}
