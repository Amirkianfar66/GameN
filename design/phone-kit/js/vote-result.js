// mothership:dev-only
//
// The vote's result, for its five seconds (issues #119 and #121). Backend publishes it as its own
// phase, VOTE_RESULT, exactly five seconds long, with the public field voteResult (docs/backend/
// playtest-feedback-contract.md, PR #125): the vote's kind and round, an explicit outcome
// (CAPTAIN_ELECTED, RUNOFF_REQUIRED, NO_CAPTAIN_ELECTED, PLAYER_JAILED, NO_JAIL_SELECTION,
// PLAYER_RELEASED, RELEASE_DENIED), the tied seats, and the published aggregate count (counts per
// seat, eligibleVoterCount, yesCount, selectedSeatId, released). This draws only that, and the
// public names and characters of the seats it names: never a ballot, a voter, a side, a role, the
// Code or a winner of the match. The next phase gets its own full clock: nothing here waits.
//
// One comic panel over the lower board, the same on every screen: the vote's name, its outcome
// in lettering on a navy ribbon (the end's result language without a side's colour), its subject
// drawn as a full-body figure in the clothes of the room it is now in (figures/wardrobe.mjs) with
// the outcome's piece (the Captain's star, the cell's bars, bars bent open, a tie's burst, an
// empty chair or cell), and the count as one cell per player who could vote. Its words for a
// screen reader are the release's (en.vote.tally); the lettering is a picture of them.
//
// Motion lives inside the five seconds, timed from the result's own startedAt on the server's
// clock: the panel comes up (0-320 ms), its subject pops in (200-760), the outcome's piece lands
// (360-620), the count fills (760-1260), it holds, and it goes (4720-5000), ending at endsAt. A
// screen that arrives late (a reconnect, a reload, a late delivery) draws it settled for the time
// that is left and plays nothing but the exit. Reduced motion: the 80 ms fade in and out only.

import { CREW } from '../../board-motion/figures/crew.mjs';
import { skeletonOf } from '../../board-motion/figures/gestures.mjs';
import { dressedFigureSvg, outfitFor } from '../../board-motion/figures/wardrobe.mjs';
import { RESULT_ART } from '../source/art.mjs';

export const VOTE_RESULT_MS = 5000;
/** Each beat's start and end, in ms from the result's startedAt. The exit ends at endsAt. */
export const RESULT_BEATS = Object.freeze({ enter: [0, 320], subject: [200, 760], piece: [360, 620], count: [760, 1260], exit: [4720, 5000] });
/** Past this, a result is drawn settled: nothing is left of its entrance. */
export const SETTLED_AT = 1260;
export const REDUCED_FADE_MS = 80;

/** The release's words for a count (packages/presentation/src/copy/en.ts, en.vote.tally), and the kit's proposed few. */
export const RESULT_WORDS = Object.freeze({
  kind: { CAPTAIN_ELECTION: 'Captain election', JAIL_VOTE: 'Jail vote', RELEASE_VOTE: 'Release vote' },
  round: n => `Round ${n}`,
  tag: 'Vote result',
  votes: n => (n === 1 ? '1 vote' : `${n} votes`),
  voters: n => (n === 1 ? '1 player could vote.' : `${n} players could vote.`),
  votedForNobody: n => `Abstained or did not vote: ${n}.`,
  elected: n => `Elected Captain: Player ${n}.`,
  nobodyElected: 'Nobody was elected.',
  jailed: n => `Sent to Jail: Player ${n}.`,
  nobodyJailed: 'Nobody was sent to Jail.',
  yes: (yes, voters) => `Yes: ${yes} of ${voters}.`,
  released: n => `Player ${n} was released.`,
  notReleased: n => `Player ${n} was not released.`,
  // Proposed (no release words exist for these yet): a tie, and what follows it.
  tied: seats => `Tied: ${seats.map(n => `Player ${n}`).join(' and ')}.`,
  runoff: 'Runoff vote next.',
  // The lettering on the ribbon: a picture of the outcome (aria-hidden), and a tie's second line.
  lettering: { captain: 'Captain!', runoff: 'Tie!', 'no-captain': 'No Captain', jailed: 'Jailed!', 'no-jail-tie': 'Tie!', 'no-jail': 'No one jailed', released: 'Released!', denied: 'Denied' },
  then: { runoff: 'Runoff vote next', 'no-jail-tie': 'No one jailed' },
  abstainedShort: n => `${n} abstained`,
});

const seatNumber = id => (typeof id === 'number' ? id : Number(String(id).replace(/^seat-/, '')));
const VARIANT = {
  CAPTAIN_ELECTED: 'captain', RUNOFF_REQUIRED: 'runoff', NO_CAPTAIN_ELECTED: 'no-captain',
  PLAYER_JAILED: 'jailed', PLAYER_RELEASED: 'released', RELEASE_DENIED: 'denied',
};
const TONE = { captain: 'gold', released: 'gold', jailed: 'steel', denied: 'steel', runoff: 'paper', 'no-captain': 'paper', 'no-jail': 'paper', 'no-jail-tie': 'paper' };
/** The gesture a subject is drawn in: standing tall for a Captain or a release, arms folded behind bars, facing off in a tie. */
const GESTURE = { captain: 'stand', released: 'stand', jailed: 'standFolded', denied: 'standBack', runoff: 'standFolded', 'no-jail-tie': 'standFolded' };

/**
 * What a published result shows, from voteResult and the public seats ({ n, name, character, location }) only.
 * Null when the result names a seat that is not in the view.
 */
export function voteResultModel(result, seats) {
  if (!result || !VARIANT[result.outcome] && result.outcome !== 'NO_JAIL_SELECTION') return null;
  const byN = new Map(seats.map(seat => [seat.n, seat]));
  const subject = n => { const seat = byN.get(n); return seat ? { n, name: seat.name, character: seat.character, location: seat.location } : null; };
  const counts = Object.entries(result.counts ?? {}).map(([id, votes]) => ({ n: seatNumber(id), votes, name: byN.get(seatNumber(id))?.name ?? `Player ${seatNumber(id)}` }))
    .filter(entry => byN.has(entry.n) && Number.isInteger(entry.votes) && entry.votes > 0)
    .sort((a, b) => b.votes - a.votes || a.n - b.n);
  const eligible = result.eligibleVoterCount;
  const selected = result.selectedSeatId === null ? null : seatNumber(result.selectedSeatId);
  const tied = (result.tiedSeatIds ?? []).map(seatNumber);
  const variant = result.outcome === 'NO_JAIL_SELECTION' ? (tied.length ? 'no-jail-tie' : 'no-jail') : VARIANT[result.outcome];
  const subjects = (['runoff', 'no-jail-tie'].includes(variant) ? tied : selected === null ? [] : [selected]).map(subject);
  if (subjects.some(entry => entry === null)) return null;
  const release = result.kind === 'RELEASE_VOTE';
  const counted = counts.reduce((sum, entry) => sum + entry.votes, 0);
  const sentence = [];
  if (release) {
    sentence.push(RESULT_WORDS.yes(result.yesCount, eligible));
    sentence.push(variant === 'released' ? RESULT_WORDS.released(selected) : RESULT_WORDS.notReleased(selected));
  } else {
    sentence.push(RESULT_WORDS.voters(eligible));
    if (variant === 'runoff' || variant === 'no-jail-tie') sentence.push(RESULT_WORDS.tied(tied));
    if (variant === 'captain') sentence.push(RESULT_WORDS.elected(selected));
    if (variant === 'runoff') sentence.push(RESULT_WORDS.runoff);
    if (variant === 'no-captain') sentence.push(RESULT_WORDS.nobodyElected);
    if (variant === 'jailed') sentence.push(RESULT_WORDS.jailed(selected));
    if (variant === 'no-jail' || variant === 'no-jail-tie') sentence.push(RESULT_WORDS.nobodyJailed);
    for (const entry of counts) sentence.push(`Player ${entry.n}: ${RESULT_WORDS.votes(entry.votes)}.`);
    if (counted <= eligible) sentence.push(RESULT_WORDS.votedForNobody(eligible - counted));
  }
  // One cell per player who could vote: the subjects' votes first (gold), the others' (navy), then the rest (empty).
  const subjectNumbers = subjects.map(entry => entry.n);
  const cells = release
    ? Array.from({ length: eligible }, (_, i) => (i < result.yesCount ? 'yes' : 'empty'))
    : [...counts.filter(entry => subjectNumbers.includes(entry.n)), ...counts.filter(entry => !subjectNumbers.includes(entry.n))]
      .flatMap(entry => Array(entry.votes).fill(subjectNumbers.includes(entry.n) ? 'subject' : 'other')).concat(Array(Math.max(0, eligible - counted)).fill('empty'));
  return {
    id: result.id, outcome: result.outcome, kind: result.kind, round: result.round, variant, tone: TONE[variant], gesture: GESTURE[variant] ?? 'stand',
    subjects, counts, eligible, yes: release ? result.yesCount : null, abstained: release ? null : Math.max(0, eligible - counted),
    lettering: RESULT_WORDS.lettering[variant], then: RESULT_WORDS.then[variant] ?? null,
    title: `${RESULT_WORDS.kind[result.kind]} · ${RESULT_WORDS.round(result.round)}`, sentence: sentence.join(' '), cells,
    score: release ? [result.yesCount, eligible] : subjects.length === 1 ? [counts.find(entry => entry.n === subjects[0].n)?.votes ?? 0, eligible] : null,
  };
}

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs ?? {})) if (value !== null && value !== undefined && value !== false) node.setAttribute(name, value === true ? '' : String(value));
  for (const child of children.flat()) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
};
const art = (name, cls) => { const node = el('span', { class: cls, 'aria-hidden': 'true', 'data-art': name }); node.innerHTML = RESULT_ART[name](); return node; };

/** A subject: the full-body figure, in the clothes of the room it is in now. */
function figure(entry, index, count, prefix, gesture) {
  const node = el('span', { class: 'pk-vr__fig', 'data-character': entry.character, 'data-outfit': outfitFor(entry.location), 'data-mirror': String(count > 1 && index === count - 1) });
  node.innerHTML = dressedFigureSvg(CREW[entry.character], skeletonOf(gesture), { outfit: outfitFor(entry.location), prefix: `${prefix}${index}` });
  return node;
}

/**
 * The panel for a model, drawn at rest. data-beat is 'live' while its entrance may play, 'settled' after.
 * The words are the page's: the lettering (a picture of them, aria-hidden) and the release's sentence.
 */
export function voteResultElement(model, { prefix = 'pkvr' } = {}) {
  const { variant, subjects } = model;
  const ground = `vote-ground-${model.tone}`;
  const piece = variant === 'captain' ? art('vote-captain-star', 'pk-vr__art')
    : ['jailed', 'denied'].includes(variant) ? art('vote-cell-bars', 'pk-vr__bars')
      : variant === 'released' ? art('vote-cell-bars-open', 'pk-vr__bars')
        : ['runoff', 'no-jail-tie'].includes(variant) ? art('vote-tie-burst', 'pk-vr__art')
          : variant === 'no-captain' ? art('vote-empty-chair', 'pk-vr__empty')
            : art('vote-empty-cell', 'pk-vr__empty');
  const cast = el('span', { class: 'pk-vr__cast', 'data-count': String(subjects.length) }, subjects.map((entry, i) => figure(entry, i, subjects.length, prefix, model.gesture)));
  return el('section', { class: 'pk-vr', id: 'pk-vote-result', 'data-variant': variant, 'data-tone': model.tone, 'data-outcome': model.outcome, 'data-result-id': model.id, 'aria-labelledby': 'pk-vr-heading' },
    el('div', { class: 'pk-vr__head' }, el('span', { class: 'pk-vr__tag' }, RESULT_WORDS.tag), el('span', { class: 'pk-vr__vote' }, model.title)),
    el('h2', { class: 'pk-vr__heading', id: 'pk-vr-heading', tabindex: '-1' }, el('span', { class: 'pk-vr__ribbon', 'aria-hidden': 'true' }, el('span', { class: 'pk-vr__lettering' }, model.lettering)),
      model.then ? el('span', { class: 'pk-vr__then', 'aria-hidden': 'true' }, model.then) : null, el('span', { class: 'pk-vr__said' }, model.sentence)),
    el('div', { class: 'pk-vr__stage', 'aria-hidden': 'true' }, art(ground, 'pk-vr__ground'), cast, piece),
    subjects.length ? el('div', { class: 'pk-vr__plates', 'aria-hidden': 'true', 'data-count': String(subjects.length) }, subjects.map(entry => el('span', { class: 'pk-vr__plate' },
      el('span', { class: 'pk-vr__num' }, String(entry.n)), el('span', { class: 'pk-vr__name' }, entry.name),
      subjects.length > 1 ? el('span', { class: 'pk-vr__each' }, String(model.counts.find(c => c.n === entry.n)?.votes ?? 0)) : null))) : null,
    el('div', { class: 'pk-vr__count', 'aria-hidden': 'true' },
      el('span', { class: 'pk-vr__cells', 'data-cells': String(model.cells.length) }, model.cells.map(kind => el('span', { class: 'pk-vr__cell', 'data-cell': kind }))),
      model.score ? el('span', { class: 'pk-vr__score' }, String(model.score[0]), el('small', null, `/${model.score[1]}`)) : null),
    el('p', { class: 'pk-vr__legend', 'aria-hidden': 'true' }, legend(model)));
}

/** The count's line under its cells: the subject's votes, the others', who abstained; or a release's yes. Short words. */
function legend(model) {
  if (model.yes !== null) return RESULT_WORDS.yes(model.yes, model.eligible);
  const parts = model.counts.slice(0, 3).map(entry => `${entry.name} ${entry.votes}`);
  if (model.counts.length > 3) parts.push(`+${model.counts.length - 3}`);
  if (model.abstained) parts.push(RESULT_WORDS.abstainedShort(model.abstained));
  return parts.join(' · ') || RESULT_WORDS.abstainedShort(model.eligible);
}

/**
 * Plays a panel's beats on the shared clock. now, startedAt and endsAt are on one clock (the server's,
 * as the client estimates it). live: the result arrived while this page was watching (not a reconnect,
 * a reload or a late delivery). Returns cancel(): every animation of the panel stops at once, at rest.
 */
export function playVoteResult(panel, { now, startedAt, endsAt, live = true, reduced = false }) {
  const animations = [];
  const elapsed = Math.max(0, now - startedAt), left = Math.max(0, endsAt - now);
  // An entrance holds its first frame until it starts ('both'); an exit takes effect only once it starts ('forwards'),
  // so that, on the same panel, the exit never covers the entrance.
  const at = (node, keyframes, [from, to], easing, fill = 'both') => {
    if (!node) return;
    const animation = node.animate(keyframes, { duration: to - from, delay: from - elapsed, easing, fill });
    animations.push(animation);
  };
  const entering = live && elapsed < SETTLED_AT;
  panel.dataset.beat = entering ? 'live' : 'settled';
  if (reduced) {
    if (entering) at(panel, [{ opacity: 0 }, { opacity: 1 }], [0, REDUCED_FADE_MS], 'linear');
    if (left > REDUCED_FADE_MS) at(panel, [{ opacity: 1 }, { opacity: 0 }], [VOTE_RESULT_MS - REDUCED_FADE_MS, VOTE_RESULT_MS], 'linear', 'forwards');
  } else {
    if (entering) {
      at(panel, [{ transform: 'translateY(26px) scale(0.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], RESULT_BEATS.enter, 'cubic-bezier(0.16, 0.84, 0.3, 1)');
      at(panel.querySelector('.pk-vr__ribbon'), [{ transform: 'scale(1.35) rotate(-3deg)', opacity: 0 }, { transform: 'scale(0.96) rotate(0.6deg)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], [80, 440], 'cubic-bezier(0.2, 0.9, 0.3, 1.2)');
      for (const [i, node] of [...panel.querySelectorAll('.pk-vr__fig, .pk-vr__empty')].entries()) {
        at(node, [{ transform: 'translateY(14px) scale(0.82)', opacity: 0 }, { transform: 'translateY(-4px) scale(1.04)', opacity: 1, offset: 0.65 }, { transform: 'none', opacity: 1 }], [RESULT_BEATS.subject[0] + i * 60, RESULT_BEATS.subject[1] + i * 60], 'cubic-bezier(0.16, 0.84, 0.3, 1)');
      }
      // The outcome's piece lands: the bars drop, the star or the tie's burst slams in.
      const piece = panel.querySelector('.pk-vr__bars, .pk-vr__art');
      if (piece?.classList.contains('pk-vr__bars')) at(piece, [{ transform: 'translateY(-110%)', opacity: 0 }, { transform: 'translateY(4%)', opacity: 1, offset: 0.75 }, { transform: 'none', opacity: 1 }], RESULT_BEATS.piece, 'cubic-bezier(0.55, 0, 1, 0.45)');
      else at(piece, [{ transform: 'scale(1.8) rotate(-12deg)', opacity: 0 }, { transform: 'scale(0.92) rotate(2deg)', opacity: 1, offset: 0.65 }, { transform: 'none', opacity: 1 }], RESULT_BEATS.piece, 'cubic-bezier(0.2, 0.9, 0.3, 1.2)');
      for (const [i, cell] of [...panel.querySelectorAll('.pk-vr__cell')].entries()) {
        const step = (RESULT_BEATS.count[1] - RESULT_BEATS.count[0] - 120) / Math.max(1, panel.querySelectorAll('.pk-vr__cell').length);
        at(cell, [{ transform: 'scaleY(0.2)', opacity: 0.25 }, { transform: 'none', opacity: 1 }], [RESULT_BEATS.count[0] + i * step, RESULT_BEATS.count[0] + i * step + 120], 'cubic-bezier(0.16, 0.84, 0.3, 1)');
      }
    }
    // The exit, wherever this page joined: it ends as endsAt is reached.
    if (left > 0) at(panel, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(18px)', opacity: 0 }], RESULT_BEATS.exit, 'cubic-bezier(0.55, 0, 1, 0.45)', 'forwards');
  }
  if (entering) {
    const settle = setTimeout(() => { panel.dataset.beat = 'settled'; }, Math.max(0, SETTLED_AT - elapsed));
    animations.push({ cancel: () => clearTimeout(settle), finish: () => clearTimeout(settle) });
  }
  return {
    animations,
    /** Everything at rest at once (reduced motion switched on, a newer phase, a stale view): the panel as it stands, then the exit only. */
    cancel() { for (const animation of animations) animation.cancel(); panel.dataset.beat = 'settled'; },
  };
}
