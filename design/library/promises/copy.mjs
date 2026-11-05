// mothership:dev-only
//
// Proposed words for library group 4 (Promises). Frontend owns the game's copy
// (packages/presentation/src/copy/); these are proposals in the dossier's voice: short, plain,
// second person, never a claim the view does not make. Players are named by number and name, and
// the reader is "you". The words never call a result a lie, a betrayal or a broken word ("Failure is
// not proof of lying", P24); a Jail or Captain Promise counts the ballot, never the vote's outcome
// or the admission (P16, P23); and nothing says a Promise will be shown to anyone else (P25).
//
// Three terms wait on request R13 and are marked so: what No Jail Vote rules out (the contract
// gives it no target; read here as "not against the recipient"), whose place decides a meeting
// (read here as the giver's), and which election an electionId names (here "the next Captain
// election", true when it is offered; the record cannot yet name its round).

/** "Player 8, Hana", or "you" for the reader. */
export const label = (seat, reader, name) => (seat === reader ? 'you' : `Player ${seat}, ${name(seat)}`);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const poss = who => (who === 'you' ? 'your' : `${who}'s`);
const is = who => (who === 'you' ? 'you are' : `${who} is`);
const was = who => (who === 'you' ? 'you were' : `${who} was`);
const pron = who => (who === 'you' ? 'you' : 'they');

export const TITLES = Object.freeze({
  CAPTAIN_SUPPORT: 'Captain Support', OFFICER_SELECTION: 'Officer Selection', JAIL_VOTE: 'Jail Vote',
  NO_JAIL_VOTE: 'No Jail Vote', MEET_A: 'Meet in A', MEET_B: 'Meet in B',
});
/** One line on the chooser tile: what the card asks of its giver. */
export const BLURBS = Object.freeze({
  CAPTAIN_SUPPORT: 'Vote for them in the next Captain election.',
  OFFICER_SELECTION: 'Appoint them Officer if you are elected Captain.',
  JAIL_VOTE: 'Vote to jail a player you name, this round.',
  NO_JAIL_VOTE: 'Do not vote to jail them, this round.',
  MEET_A: 'Be in Room A when this round\'s voting begins.',
  MEET_B: 'Be in Room B when this round\'s voting begins.',
});
/** Kinds whose words wait on R13, and why. */
export const PENDING_R13 = Object.freeze({
  NO_JAIL_VOTE: 'the contract gives No Jail Vote no target: "not against the recipient" or "no Jail ballot at all"',
  MEET_A: 'whose place decides a meeting: the giver\'s, or both players\'',
  MEET_B: 'whose place decides a meeting: the giver\'s, or both players\'',
  CAPTAIN_SUPPORT: 'an electionId cannot be named; the words say "the next Captain election"',
  OFFICER_SELECTION: 'an electionId cannot be named; the words say "the next Captain election"',
});

/** The exact term, as a sentence. t: { giver, recipient, target, round } as labels (target only for Jail Vote). */
export function term(kind, t) {
  const G = t.giver, R = t.recipient;
  switch (kind) {
    case 'CAPTAIN_SUPPORT': return `${cap(G)} will vote for ${R} in every ballot of the next Captain election in which ${is(R)} a candidate.`;
    case 'OFFICER_SELECTION': return `${cap(G)} will appoint ${R} as Officer if ${pron(G)} win the next Captain election.`;
    case 'JAIL_VOTE': return `${cap(G)} will vote to jail ${t.target} in Round ${t.round}'s Jail vote.`;
    case 'NO_JAIL_VOTE': return `${cap(G)} will not vote to jail ${R} in Round ${t.round}'s Jail vote.`;
    case 'MEET_A': return `${cap(G)} will be in Room A when Round ${t.round}'s voting begins.`;
    case 'MEET_B': return `${cap(G)} will be in Room B when Round ${t.round}'s voting begins.`;
    default: throw new Error(`No Promise kind ${kind}`);
  }
}

/** When it is decided (the opportunity), never a countdown. */
export function decided(kind, t) {
  if (kind === 'CAPTAIN_SUPPORT') return 'Decided by the next Captain election, runoffs included.';
  if (kind === 'OFFICER_SELECTION') return 'Decided by the next Captain election and its Officer appointment.';
  if (kind === 'JAIL_VOTE' || kind === 'NO_JAIL_VOTE') return `Decided when Round ${t.round}'s Jail vote closes.`;
  return `Decided when Round ${t.round}'s voting begins, after Sync.`;
}

/** The result in words: what the record says, never why, never the vote's outcome. */
export function result(kind, status, t) {
  const G = t.giver, R = t.recipient;
  if (status === 'Pending') return 'Pending: not decided yet.';
  if (status === 'Not fulfilled') return 'Not fulfilled. This records what happened, not why, and it is not proof of a lie.';
  if (status === 'Condition not met') {
    if (kind === 'CAPTAIN_SUPPORT') return `Condition not met: ${R === 'you' ? 'you were' : `${R} was`} not a candidate in that election.`;
    if (kind === 'OFFICER_SELECTION') return `Condition not met: ${G === 'you' ? 'you were' : `${G} was`} not elected Captain in that election.`;
    return 'Condition not met: the opportunity it named did not happen.';
  }
  if (status === 'Fulfilled') {
    if (kind === 'CAPTAIN_SUPPORT') return `Fulfilled: ${G} voted for ${R} in every ballot where ${R === 'you' ? 'you were' : `${R} was`} a candidate. Who won does not count.`;
    if (kind === 'OFFICER_SELECTION') return `Fulfilled: ${G} ${G === 'you' ? 'were' : 'was'} elected Captain and appointed ${R} as Officer.`;
    if (kind === 'JAIL_VOTE') return `Fulfilled: ${poss(G)} Jail ballot named ${t.target}. Whether ${t.target === 'you' ? 'you were' : `${t.target} was`} jailed does not count.`;
    if (kind === 'NO_JAIL_VOTE') return `Fulfilled: ${poss(G)} Jail ballot did not name ${R}.`;
    return `Fulfilled: ${was(G)} in Room ${kind === 'MEET_A' ? 'A' : 'B'} when voting began.`;
  }
  throw new Error(`No Promise status ${status}`);
}

export const PROMISE_COPY = Object.freeze({
  tape: 'Promise',
  tapeLedger: 'Promises',
  // Stamps (the dossier's stamp frame; the words beside them carry the meaning too).
  stampSending: 'Sending',
  stampOffered: 'Offered',
  stampPending: 'Pending',
  stampFulfilled: 'Fulfilled',
  stampNotFulfilled: 'Not fulfilled',
  stampConditionNotMet: 'Condition not met',
  stampDeclined: 'Declined',
  stampExpired: 'Not answered',
  // Card fields.
  from: 'From', to: 'To', target: 'Jail vote for', when: 'Decided',
  // The giver's composer.
  choose: R => `Pick a Promise to offer ${R}. It is made only if ${R} accepts it.`,
  chooseWho: 'Pick who to offer it to.',
  chooseTarget: 'Pick the player you will vote to jail.',
  review: R => `Offer this Promise to ${R}?`,
  offer: 'Offer Promise',
  back: 'Back',
  quotaGive: 'You can give one accepted Promise in the match. An offer that is declined or not answered uses nothing.',
  sending: 'Sending your offer…',
  waiting: R => `Offered to ${R}. Waiting for their answer.`,
  refused: 'The server did not accept the offer. Nothing was used.',
  closed: 'Promises are offered and answered during private talk.',
  given: 'You have given your one Promise in this match.',
  noteDeclinedGiven: R => `${cap(R)} declined your offer. Nothing was used.`,
  noteExpiredGiven: R => `Your offer to ${R} was not answered in time. Nothing was used.`,
  // The recipient's inbox.
  incoming: G => `${cap(G)} offers you a Promise.`,
  incomingRule: 'Accepting uses your one received Promise in the match. Declining uses nothing.',
  accept: 'Accept',
  decline: 'Decline',
  declineOnly: 'You have already accepted your one received Promise in this match. You can decline this offer.',
  answering: 'Sending your answer…',
  locked: 'This offer can no longer be answered.',
  noteDeclinedReceived: G => `You declined ${G}'s offer. Nothing was used.`,
  noteExpiredReceived: G => `${cap(G)}'s offer was not answered in time. Nothing was used.`,
  // The ledger.
  givenTitle: R => `Your Promise to ${R}`,
  receivedTitle: G => `${cap(G)}'s Promise to you`,
  givenEmpty: 'Promise given: not used yet.',
  receivedEmpty: 'Promise received: not used yet.',
  privacy: 'Only the two of you see this Promise.',
});
