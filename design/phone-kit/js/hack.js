// mothership:dev-only
//
// The private Hack, declared side first (issue #120, owner-approved on 12 October 2026): after the ordinary
// turn closes with a Hack pending, the target has up to 15 seconds to declare a side (HACK_DECLARE), then the
// two see the claim for five seconds (HACK_RESULT), then they have their full 60-second conversation (HACK).
// Backend's proposal (docs/backend/playtest-feedback-contract.md on codex/backend-vote-results, bd4d77c)
// carries it in the two participants' own views only: hackFeedback { hackId, round, status:
// AWAITING_DECLARATION | DECLARED | NO_DECLARATION, declaredSide }, the existing private hackPartnerSeatId, and
// for the target alone the offer legalTargets.DECLARE_HACK_SIDE = [its own seat] and the command
// DECLARE_HACK_SIDE { declaredSide: Blue | Red | Alien }. The initiator is the public active seat throughout.
//
// What it shows is a CLAIM: what the target declared, never a side the app has checked. The Undercover and
// the Alien may bluff, so the three choices are offered alike to every target, in the same order, the same
// size and the same look; nothing says which one is true, allowed or expected, and nothing here reads a
// role. No answer: "No side declared" (the owner's words), never an invented side. This is not the Hacker's
// Scan: no lens, no printout, no Code.
//
// Private: drawn only for the two participants, inside their own view, while the page is visible and current.
// Removed at once when the page goes to the background, the view goes out of date, the audience changes (the
// view no longer carries hackFeedback) or the match ends: nothing of it is left in the page. Its pictures (the
// three side cards, the blank card, the balloon, the dots) are all in this module's art, built into every
// phone's page alike: no request, file name or asset depends on a claim, a side or a role. Public screens draw
// the phase only.

import { HACK_ART } from '../source/art.mjs';

export const HACK_WINDOWS = Object.freeze({ declareMaxMs: 15000, resultMs: 5000, talkMs: 60000 });
export const SIDES = Object.freeze(['Blue', 'Red', 'Alien']);
/** The claim's beats in its five seconds, ms from HACK_RESULT's startedAt; the exit ends at its endsAt. */
export const CLAIM_BEATS = Object.freeze({ enter: [0, 300], balloon: [160, 520], card: [380, 800], exit: [4720, 5000] });
export const CLAIM_SETTLED_AT = 800;
export const REDUCED_FADE_MS = 80;

/**
 * Proposed words: the release has none for the declared-side Hack yet. "No side declared" is the owner's;
 * consequence is the release's (en.action.consequence.move), and so is chooseAgain (en.action.chooseAgain).
 */
export const HACK_WORDS = Object.freeze({
  tag: 'Private · Hack',
  declareHeading: 'Declare your side',
  declareDetail: n => `Only Player ${n} sees your answer.`,
  sides: 'Declare a side',
  side: { Blue: 'Blue', Red: 'Red', Alien: 'Alien' },
  confirm: (side, n) => `Declare ${side} to Player ${n}?`,
  consequence: 'You cannot change or withdraw it here once the server accepts it.',
  declare: side => `Declare ${side}`,
  chooseAgain: 'Choose again',
  sending: 'Sending your declaration…',
  notAccepted: 'Not accepted. Choose again.',
  chooseAgainDetail: 'Choose again.',
  unknown: 'Sent. No answer yet.',
  unknownDetail: 'The next update shows whether it counted.',
  accepted: side => `You declared ${side}.`,
  stamp: { pending: 'Sending', registered: 'Declared', 'not-accepted': 'Not accepted', unknown: 'Unknown' },
  waitingHeading: n => `Waiting for Player ${n}`,
  waitingDetail: n => `Player ${n} is declaring a side.`,
  claims: n => `Player ${n} claims`,
  claimNote: 'A claim, not a verified side.',
  youDeclared: 'You declared',
  shownTo: n => `Shown to Player ${n} only.`,
  none: 'No side declared',
  noneDetailInitiator: n => `Player ${n} did not declare a side in time.`,
  noneDetailTarget: 'Time ran out.',
  talkHeading: n => `Talk with Player ${n}`,
  claimed: side => `Claimed: ${side}, not verified.`,
  youDeclaredSide: side => `You declared: ${side}.`,
  // What a screen reader hears once, as the claim arrives.
  said: {
    claim: (n, side) => `Player ${n} claims ${side}. A claim, not a verified side.`,
    own: (n, side) => `You declared ${side}. Shown to Player ${n} only.`,
    noneInitiator: n => `No side declared. Player ${n} did not declare a side in time.`,
    noneTarget: 'No side declared. Time ran out.',
  },
});

const STAGE = { HACK_DECLARE: 'declare', HACK_RESULT: 'result', HACK: 'talk' };

/**
 * The Hack as this viewer's own view shows it, or null: not a participant, no hackFeedback, not a Hack phase,
 * or a partner who is not in the view. phase: { kind }; initiator: the public active seat; viewer: this phone's
 * seat; feedback: hackFeedback; partner: hackPartnerSeatId (a seat number here); canDeclare: the view offers
 * DECLARE_HACK_SIDE with the viewer's own seat; seats: the public seats ({ n, name, character }).
 * It reads no role, no side but the declared one, and nothing about the truth of a claim.
 */
export function hackModel({ phase, initiator, viewer, feedback, partner, canDeclare = false, seats }) {
  const stage = STAGE[phase?.kind];
  if (!stage || !feedback || partner === null || partner === undefined || partner === viewer) return null;
  const other = seats.find(seat => seat.n === partner), me = seats.find(seat => seat.n === viewer);
  if (!other || !me) return null;
  const audience = initiator === viewer ? 'initiator' : 'target';
  // The initiator is the active seat throughout: a partner that is not, seen by a target, is a broken view.
  if (audience === 'target' && initiator !== partner) return null;
  const declared = feedback.status === 'DECLARED' && SIDES.includes(feedback.declaredSide) ? feedback.declaredSide : null;
  const status = ['AWAITING_DECLARATION', 'DECLARED', 'NO_DECLARATION'].includes(feedback.status) ? feedback.status : null;
  if (status === null || (stage !== 'declare' && status === 'AWAITING_DECLARATION')) return null;
  return {
    hackId: feedback.hackId, round: feedback.round, audience, stage, status, declared,
    partner: { n: other.n, name: other.name, character: other.character }, self: { n: me.n, character: me.character },
    canDeclare: audience === 'target' && stage === 'declare' && canDeclare && status === 'AWAITING_DECLARATION',
  };
}

/** The sentence a screen reader hears once when the claim arrives (HACK_RESULT), or null. */
export function claimSentence(model) {
  if (model?.stage !== 'result') return null;
  if (model.declared === null) return model.audience === 'initiator' ? HACK_WORDS.said.noneInitiator(model.partner.n) : HACK_WORDS.said.noneTarget;
  return model.audience === 'initiator' ? HACK_WORDS.said.claim(model.partner.n, model.declared) : HACK_WORDS.said.own(model.partner.n, model.declared);
}

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs ?? {})) if (value !== null && value !== undefined && value !== false) node.setAttribute(name, value === true ? '' : String(value));
  for (const child of children.flat()) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
};
const art = (name, cls) => { const node = el('span', { class: cls, 'aria-hidden': 'true', 'data-art': name }); node.innerHTML = HACK_ART[name](); return node; };
const sideArt = (side, cls = 'pk-hack__card') => art(`hack-side-${side ? side.toLowerCase() : 'none'}`, cls);
const unseen = text => el('span', { class: 'pk-vh' }, text);

/**
 * The panel for a model. flow: the target's own declaration, as this phone holds it: { step: 'idle' } or
 * { step: 'confirming' | 'sending' | 'unknown' | 'accepted', side } or { step: 'not-accepted' }. compact: one line, no
 * controls, while another command is open (the page's strip). Every word is the
 * page's own; the cards, the balloon and the dots are pictures (aria-hidden). Controls carry data-act:
 * declare:<Side> (choose), declare-confirm, declare-back.
 */
export function hackElement(model, { flow = { step: 'idle' }, compact = false } = {}) {
  const { audience, stage, declared, partner } = model;
  const step = audience === 'target' && stage === 'declare' ? flow?.step ?? 'idle' : null;
  const portrait = el('span', { class: 'pk-hack__who', 'data-character': partner.character, 'aria-hidden': 'true' });
  const ownPortrait = el('span', { class: 'pk-hack__who', 'data-character': model.self.character, 'data-self': 'true', 'aria-hidden': 'true' });
  const body = (heading, detail) => el('div', { class: 'pk-hack__body' },
    el('p', { class: 'pk-hack__tagline' }, el('span', { class: 'pk-hack__tag' }, HACK_WORDS.tag)),
    el('h2', { class: 'pk-hack__heading', id: 'pk-hack-heading', tabindex: '-1' }, heading),
    detail ? el('p', { class: 'pk-hack__detail' }, detail) : null);
  const button = (label, act, primary = false, extra = {}) => el('button', { type: 'button', class: `bm-btn${primary ? ' bm-btn--primary' : ''}`, 'data-act': act, ...extra }, label);
  const stamp = kind => el('span', { class: 'bm-stamp pk-hack__stamp', 'data-kind': kind }, HACK_WORDS.stamp[kind]);
  let parts;
  if (step === 'confirming') {
    parts = [sideArt(flow.side, 'pk-hack__card pk-hack__lead'), body(HACK_WORDS.confirm(flow.side, partner.n), HACK_WORDS.consequence),
      el('div', { class: 'pk-hack__controls' }, button(HACK_WORDS.declare(flow.side), 'declare-confirm', true, { id: 'pk-declare-confirm' }), button(HACK_WORDS.chooseAgain, 'declare-back'))];
  } else if (step === 'sending' || step === 'unknown' || step === 'accepted') {
    const words = step === 'sending' ? [HACK_WORDS.sending, null] : step === 'unknown' ? [HACK_WORDS.unknown, HACK_WORDS.unknownDetail] : [HACK_WORDS.accepted(flow.side), HACK_WORDS.shownTo(partner.n)];
    parts = [sideArt(flow.side, 'pk-hack__card pk-hack__lead'), body(...words), stamp(step === 'sending' ? 'pending' : step === 'unknown' ? 'unknown' : 'registered')];
  } else if (step !== null) {
    // Choosing (idle, or again after Not accepted): the three sides, alike for every target.
    parts = [el('span', { class: 'pk-hack__lead' }, portrait), body(HACK_WORDS.declareHeading, step === 'not-accepted' ? HACK_WORDS.chooseAgainDetail : HACK_WORDS.declareDetail(partner.n)),
      step === 'not-accepted' ? stamp('not-accepted') : null,
      el('div', { class: 'pk-hack__sides', role: 'group', 'aria-label': HACK_WORDS.sides },
        SIDES.map(side => el('button', { type: 'button', class: 'pk-hack__side', 'data-act': `declare:${side}`, id: `pk-declare-${side.toLowerCase()}`, 'aria-disabled': String(!model.canDeclare) },
          sideArt(side), el('span', { class: 'pk-hack__side-word' }, HACK_WORDS.side[side]))))];
  } else if (stage === 'declare') {
    parts = [el('span', { class: 'pk-hack__lead' }, portrait), body(HACK_WORDS.waitingHeading(partner.n), HACK_WORDS.waitingDetail(partner.n)), art('hack-waiting-dots', 'pk-hack__dots')];
  } else if (stage === 'result') {
    // The side is in the heading's words too (the balloon is a picture of them), so that it is read where it is shown.
    const heading = declared === null ? HACK_WORDS.none : [audience === 'initiator' ? HACK_WORDS.claims(partner.n) : HACK_WORDS.youDeclared, unseen(` ${HACK_WORDS.side[declared]}.`)];
    const detail = declared === null ? (audience === 'initiator' ? HACK_WORDS.noneDetailInitiator(partner.n) : HACK_WORDS.noneDetailTarget)
      : audience === 'initiator' ? HACK_WORDS.claimNote : HACK_WORDS.shownTo(partner.n);
    // The balloon comes from whoever declared: the partner's portrait for the initiator, this phone's own character for the target.
    parts = [el('span', { class: 'pk-hack__lead' }, audience === 'initiator' ? portrait : ownPortrait), body(heading, detail),
      el('span', { class: 'pk-hack__balloon', 'aria-hidden': 'true' }, art('hack-claim-tail', 'pk-hack__tail'),
        // No declaration: an empty balloon, the blank card only (the heading says it).
        el('span', { class: 'pk-hack__balloon-in' }, sideArt(declared), declared === null ? null : el('span', { class: 'pk-hack__claim-word' }, HACK_WORDS.side[declared])))];
  } else {
    parts = [el('span', { class: 'pk-hack__lead' }, portrait), body(HACK_WORDS.talkHeading(partner.n),
      declared === null ? HACK_WORDS.none : audience === 'initiator' ? HACK_WORDS.claimed(declared) : HACK_WORDS.youDeclaredSide(declared)), sideArt(declared, 'pk-hack__card pk-hack__chip')];
  }
  // compact: another command is open in the strip (one command at a time): the panel keeps one line, without its controls.
  return el('section', { class: 'pk-hack', id: 'pk-hack', 'data-private': 'true', 'data-audience': audience, 'data-stage': stage, 'data-step': step, 'data-compact': compact ? 'true' : null, 'data-hack-id': model.hackId, 'aria-labelledby': 'pk-hack-heading' }, parts);
}

/**
 * Plays the claim's five seconds on the shared clock, as the vote result does: a page watching when it arrives
 * plays the balloon and the card; one that arrives late draws it settled and plays only the exit. Reduced motion:
 * the 80 ms fade in and out. Returns cancel(): every animation stops at once, at rest.
 */
export function playClaim(panel, { now, startedAt, endsAt, live = true, reduced = false }) {
  const animations = [];
  const elapsed = Math.max(0, now - startedAt), left = Math.max(0, endsAt - now);
  // An entrance holds its first frame until it starts; an exit takes effect only once it starts (it never covers the entrance).
  const at = (node, keyframes, [from, to], easing, fill = 'both') => { if (node) animations.push(node.animate(keyframes, { duration: to - from, delay: from - elapsed, easing, fill })); };
  const entering = live && elapsed < CLAIM_SETTLED_AT;
  panel.dataset.beat = entering ? 'live' : 'settled';
  if (reduced) {
    if (entering) at(panel, [{ opacity: 0 }, { opacity: 1 }], [0, REDUCED_FADE_MS], 'linear');
    if (left > REDUCED_FADE_MS) at(panel, [{ opacity: 1 }, { opacity: 0 }], [HACK_WINDOWS.resultMs - REDUCED_FADE_MS, HACK_WINDOWS.resultMs], 'linear', 'forwards');
  } else {
    if (entering) {
      at(panel, [{ transform: 'translateY(20px)', opacity: 0 }, { transform: 'none', opacity: 1 }], CLAIM_BEATS.enter, 'cubic-bezier(0.16, 0.84, 0.3, 1)');
      at(panel.querySelector('.pk-hack__balloon'), [{ transform: 'scale(0.4)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.65 }, { transform: 'none', opacity: 1 }], CLAIM_BEATS.balloon, 'cubic-bezier(0.2, 0.9, 0.3, 1.2)');
      at(panel.querySelector('.pk-hack__balloon-in'), [{ transform: 'perspective(400px) rotateY(90deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], CLAIM_BEATS.card, 'cubic-bezier(0.16, 0.84, 0.3, 1)');
    }
    if (left > 0) at(panel, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(14px)', opacity: 0 }], CLAIM_BEATS.exit, 'cubic-bezier(0.55, 0, 1, 0.45)', 'forwards');
  }
  if (entering) {
    const settle = setTimeout(() => { panel.dataset.beat = 'settled'; }, Math.max(0, CLAIM_SETTLED_AT - elapsed));
    animations.push({ cancel: () => clearTimeout(settle), finish: () => clearTimeout(settle) });
  }
  return { animations, cancel() { for (const animation of animations) animation.cancel(); panel.dataset.beat = 'settled'; } };
}
