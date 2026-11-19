// Promises: this player's Promises, as the phone pack draws them (sheets 33 and 33.1; the pack's promises screen with
// its list, kinds, confirm, incoming and results states; #222 items 19 and 32). Runtime source, Designer's (the owner,
// 14, 15 and 16 November 2026: Designer builds each visual component once, in design/; the game and the preview use
// it as it is). Global UI: it opens from the top bar's Promises and from the private talk's own "Promises".
//
// The split (the Lead's review of #297, answer 2, as Host controls):
//   mountPromises   the body of the phone shell's sheet, for its five views: the list (the quota; in a talk, Offer a
//                   Promise and an incoming offer; an offer waiting; Received and Given with their results), the six
//                   kinds, Jail Vote's player (an undrawn state the Lead approved, answer 4), the terms, and an
//                   incoming offer
//   promisesSheet   the shell's sheet for the view: its title, Back, the large detent, and the footer: Next and Back
//                   this phone's own (`local`); Offer, Decline and Accept the commands, with Frontend's states
// The view and the offer being made (the draft) are Frontend's, from the taps, Back and the projection.
//
// What the list offers in a talk follows the Actions grid (the owner, 19 November 2026: "i want all follow a shared
// system"; on draft 4, "As you recommended"; the Lead's option A, in code): Offer a Promise and an offer to answer are
// the kit's tiles, cells in one grid under the talk's label; the one to answer carries the amber dot (`waiting`). The
// quota, an offer waiting for the other's answer, and Received and Given stay lines.
//
// What it never does: send a command, or state a rule. Offering, accepting and declining are Frontend's to send and
// the server's to answer. The words that state a rule for one Promise are Frontend's, drawn as given and never
// composed, trimmed or reordered: the exact terms, the condition line, when and why (answer 3); the component holds
// the fixed words. Jail Vote's players are exactly the projection's promiseTargetSeatIds (answer 4).
//
// Pair-private (answer 6): a Promise is its giver's and its recipient's only. A given Promise must name the viewer as
// its giver, a received one as its recipient, or it is refused; with no viewer, none is taken. The Promises, the
// draft, the talk and Jail Vote's players leave the page when the viewer changes (unless the same update gives the new
// viewer's) and when concealed, and are never kept for when the sheet shows again.

import { createControlPolicy, createKit } from '../kit/kit.mjs';

export const PROMISES_VERSION = 'promises-0.2.0';
const VIEWS = Object.freeze(['list', 'kinds', 'target', 'confirm', 'incoming']);
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
/** The sheet's id, the same for every view, so the shell keeps its body (and this content) through them. */
export const PROMISES_SHEET_ID = 'promises';
/** The contract's result states (PlanetPromiseStatusSchema). */
export const PROMISE_STATUSES = Object.freeze(['Pending', 'Fulfilled', 'Not fulfilled', 'Condition not met']);

/** The six kinds, by the contract's names (PlanetPromiseKindSchema): the pack's icon, name and line (screens-more.mjs PROMISES). */
export const PROMISE_KINDS = Object.freeze({
  CAPTAIN_SUPPORT: Object.freeze({ icon: 'captain', name: 'Captain Support', line: 'Next election: every ballot in which they are a candidate' }),
  OFFICER_SELECTION: Object.freeze({ icon: 'officer', name: 'Officer Selection', line: 'If you win the next election, appoint them' }),
  JAIL_VOTE: Object.freeze({ icon: 'jail', name: 'Jail Vote', line: 'Vote to jail a player you name at the next Jail vote' }),
  NO_JAIL_VOTE: Object.freeze({ icon: 'block', name: 'No Jail Vote', line: 'Don’t vote to jail them at the next Jail vote' }),
  MEET_A: Object.freeze({ icon: 'room', name: 'Meet in Room A', line: 'Be in Room A when voting starts' }),
  MEET_B: Object.freeze({ icon: 'room', name: 'Meet in Room B', line: 'Be in Room B when voting starts' }),
});
const KINDS = Object.freeze(Object.keys(PROMISE_KINDS));

/** The pack's fixed words (screens-more.mjs promises; sheets 33 and 33.1). What states a rule is Frontend's. */
export const PROMISE_WORDS = Object.freeze({
  title: 'Promises',
  quota: 'Your quota', quotaValue: (given, received) => `Given ${given ? 1 : 0}/1 · Received ${received ? 1 : 0}/1`,
  talking: name => `With ${name} · talking now`,
  offer: 'Offer a Promise', offerLine: 'Six kinds · exact terms',
  offered: name => `${name} offered you one`,
  waiting: name => `Waiting for ${name}`, offeredTo: name => `Offered to ${name} · not counted yet`, offeredPill: 'Offered',
  kindsTitle: name => `Offer to ${name}`, kindsNote: name => `Only during your private talk. It counts once ${name} accepts.`, next: 'Next',
  // A seat keeps its separator on its line (a no-break space), so no line starts with "·" (the Lead, 18 November).
  targetTitle: 'Who will you vote to jail?', seat: (seat, name) => `${seat}\u00a0· ${name}`,
  confirmTitle: 'Check the terms', back: 'Back', offerAction: 'Offer',
  usesGiven: name => `Uses your one given Promise only if ${name} accepts`, onlyPair: name => `Only you and ${name} see it`,
  incomingTitle: name => `Offer from ${name}`,
  usesReceived: 'Accepting uses your one received Promise', neverForced: 'A Promise is never forced: it is checked against real ballots',
  decline: 'Decline', accept: 'Accept',
  received: 'Received', given: 'Given', noReceived: 'No Promise received.', noGiven: 'No Promise given.',
  from: (name, when) => (when ? `From ${name} · ${when}` : `From ${name}`), to: (name, when) => (when ? `To ${name} · ${when}` : `To ${name}`),
  notProof: '“Not fulfilled” is a fact about ballots or rooms. It is not proof of lying.',
});

const OFF = Object.freeze({ enabled: false, busy: false, reason: null });
/** Every input, with its default: the list, nothing offered or answered until Frontend gives it, no Promise. */
export const PROMISES_DEFAULTS = Object.freeze({
  view: 'list', status: 'live', interactive: true, reducedMotion: false, viewer: null, versions: null,
  quota: Object.freeze({ given: false, received: false }), talk: null, offer: null,
  draft: Object.freeze({ kind: null, target: null, terms: null }), targets: Object.freeze([]),
  given: null, received: null, answer: Object.freeze({ accept: OFF, decline: OFF }), error: null,
});
/** What belongs to this viewer, dropped when the viewer changes or the sheet is concealed (answer 6). */
const VIEWERS_OWN = Object.freeze(['talk', 'draft', 'targets', 'given', 'received', 'error']);

const isText = value => typeof value === 'string' && value.length > 0;
const isSeat = value => Number.isSafeInteger(value) && value >= 1;
const optionalText = (value, what) => {
  if (value === null || value === undefined) return null;
  if (!isText(value)) throw new TypeError(`${what} is words, or null`);
  return value;
};
function checkPerson(value, what) {
  if (!value || typeof value !== 'object' || !isSeat(value.seat) || !isText(value.name)) throw new TypeError(`${what} is { seat, name, character }`);
  return Object.freeze({ seat: value.seat, name: value.name, character: isText(value.character) ? value.character : null });
}
function checkCommand(name, value) {
  if (value === null || value === undefined) return OFF;
  if (typeof value !== 'object' || (value.reason !== null && value.reason !== undefined && typeof value.reason !== 'string')) throw new TypeError(`${name} is { enabled, busy, reason }`);
  return Object.freeze({ enabled: value.enabled !== false, busy: value.busy === true, reason: isText(value.reason) ? value.reason : null });
}
/** A Promise, checked against the pair rule: a given one names the viewer as its giver; a received one, as its recipient. */
function checkPromise(side, value, viewer) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') throw new TypeError(`${side} is null, or { id, kind, giver, recipient, state, status, terms, when, why, condition }`);
  if (!isText(value.id)) throw new TypeError(`The ${side} Promise needs its id`);
  if (!KINDS.includes(value.kind)) throw new TypeError(`A Promise's kind is ${KINDS.join(', ')}, not ${JSON.stringify(value.kind)}`);
  const giver = checkPerson(value.giver, `The ${side} Promise's giver`), recipient = checkPerson(value.recipient, `The ${side} Promise's recipient`);
  if (giver.seat === recipient.seat) throw new TypeError('A Promise is between two players');
  const own = side === 'given' ? giver : recipient;
  if (viewer === null || own.seat !== viewer) throw new TypeError(`A ${side} Promise must name this phone's player as its ${side === 'given' ? 'giver' : 'recipient'}: it is the pair's only`);
  if (!['offered', 'accepted'].includes(value.state)) throw new TypeError('A Promise\'s state is offered or accepted');
  const status = value.state === 'accepted' ? (value.status ?? 'Pending') : null;
  if (status !== null && !PROMISE_STATUSES.includes(status)) throw new TypeError(`A Promise's status is ${PROMISE_STATUSES.join(', ')}, not ${JSON.stringify(value.status)}`);
  return Object.freeze({
    id: value.id, kind: value.kind, giver, recipient, other: side === 'given' ? recipient : giver, state: value.state, status,
    terms: optionalText(value.terms, 'Its exact terms'), when: optionalText(value.when, 'Its when'), why: optionalText(value.why, 'Its why'), condition: optionalText(value.condition, 'Its condition'),
  });
}
function checkTargets(targets) {
  if (!Array.isArray(targets)) throw new TypeError('targets are Jail Vote\'s players, [{ seat, name, character }]');
  const seen = new Set();
  return Object.freeze(targets.map(t => {
    const p = checkPerson(t, 'Each of Jail Vote\'s players');
    if (seen.has(p.seat)) throw new TypeError(`Seat ${p.seat} is given twice`);
    seen.add(p.seat);
    return p;
  }));
}
function checkDraft(draft, targets) {
  if (draft === null || draft === undefined) return PROMISES_DEFAULTS.draft;
  if (typeof draft !== 'object') throw new TypeError('draft is { kind, target, terms }');
  const kind = draft.kind ?? null;
  if (kind !== null && !KINDS.includes(kind)) throw new TypeError(`The draft's kind is ${KINDS.join(', ')}, or null`);
  const target = draft.target ?? null;
  // Jail Vote's player is one of the projection's promiseTargetSeatIds, never worked out (answer 4).
  if (target !== null && !targets.some(t => t.seat === target)) throw new TypeError('The draft\'s player is one of the given targets');
  return Object.freeze({ kind, target, terms: optionalText(draft.terms, 'The draft\'s exact terms') });
}

/**
 * The next input from the previous one and an update. Each key an update gives replaces that key's value; the rest
 * stay. What is this viewer's (the Promises, the draft, the talk, Jail Vote's players) is dropped while concealed and
 * when the viewer changes, unless the same update gives the new viewer's.
 */
export function nextPromisesInput(previous, input = {}) {
  const next = { ...previous, ...input };
  if (!VIEWS.includes(next.view)) throw new TypeError(`The view is ${VIEWS.join(', ')}, not ${JSON.stringify(next.view)}`);
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  if (next.viewer !== null && next.viewer !== undefined && !isSeat(next.viewer)) throw new TypeError('viewer is this phone\'s seat number, or null');
  next.viewer = next.viewer ?? null;
  next.interactive = next.interactive !== false;
  next.reducedMotion = next.reducedMotion === true;
  const viewerChanged = 'viewer' in input && previous.viewer !== next.viewer;
  if (next.status === 'concealed' || viewerChanged) for (const key of VIEWERS_OWN) if (next.status === 'concealed' || !(key in input)) next[key] = PROMISES_DEFAULTS[key];
  const q = next.quota ?? PROMISES_DEFAULTS.quota;
  if (typeof q !== 'object') throw new TypeError('quota is { given, received }');
  next.quota = Object.freeze({ given: q.given === true, received: q.received === true });
  next.talk = next.talk === null || next.talk === undefined ? null : checkPerson(next.talk, 'talk');
  next.offer = next.offer === null || next.offer === undefined ? null : checkCommand('offer', next.offer);
  next.targets = checkTargets(next.targets ?? []);
  next.draft = checkDraft(next.draft, next.targets);
  next.given = checkPromise('given', next.given, next.viewer);
  next.received = checkPromise('received', next.received, next.viewer);
  const a = next.answer ?? PROMISES_DEFAULTS.answer;
  if (typeof a !== 'object') throw new TypeError('answer is { accept, decline }');
  next.answer = Object.freeze({ accept: checkCommand('answer.accept', a.accept), decline: checkCommand('answer.decline', a.decline) });
  // A refusal in Frontend's words, drawn in confirm and incoming (0.1.1): given verbatim, never composed here.
  next.error = optionalText(next.error, 'error');
  return next;
}

/** The other player's name for a view's words: the talk's partner, or, for an incoming offer, its giver. */
const partnerOf = s => s.talk?.name ?? s.given?.other.name ?? s.received?.other.name ?? '';

/**
 * The phone shell's sheet for the view (the shell's `sheet` input): the pack's titles, Back, the large detent, and the
 * footer. Next and the terms' Back are this phone's own (`local`: they work while reconnecting and stand for no
 * command); Offer, Decline and Accept are the commands, with Frontend's state (the Lead's review of #297, answer 2).
 * Their taps come back through the shell's onSheetAction(id): next, back, offer, decline, accept.
 */
export function promisesSheet(input) {
  const s = nextPromisesInput(PROMISES_DEFAULTS, input);
  const W = PROMISE_WORDS;
  const frame = { id: PROMISES_SHEET_ID, close: true, detent: 'large' };
  const command = (id, label, kind, c) => ({ id, label, kind, enabled: c.enabled, busy: c.busy, reason: c.reason });
  if (s.view === 'kinds') return { ...frame, title: W.kindsTitle(partnerOf(s)), back: true, actions: [{ id: 'next', label: W.next, kind: 'primary', local: true, enabled: s.draft.kind !== null }] };
  if (s.view === 'target') return { ...frame, title: W.targetTitle, back: true, actions: [{ id: 'next', label: W.next, kind: 'primary', local: true, enabled: s.draft.target !== null }] };
  if (s.view === 'confirm') {
    return { ...frame, title: W.confirmTitle, back: true, actions: [{ id: 'back', label: W.back, kind: 'secondary', local: true }, command('offer', W.offerAction, 'primary', s.offer ?? OFF)] };
  }
  if (s.view === 'incoming') {
    return { ...frame, title: W.incomingTitle(s.received?.other.name ?? partnerOf(s)), back: false,
      actions: s.received?.state === 'offered' ? [command('decline', W.decline, 'secondary', s.answer.decline), command('accept', W.accept, 'primary', s.answer.accept)] : [] };
  }
  return { ...frame, title: W.title, back: false, actions: [] };
}

/**
 * Mounts the body in the shell's open sheet (`shell.sheetBody`), on its glass. Returns { update, dispose, element }.
 */
export function mountPromises(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('Promises need a host element: the shell\'s sheetBody');
  const doc = host.ownerDocument;
  const kit = createKit(doc);
  const W = PROMISE_WORDS;
  let state = nextPromisesInput(PROMISES_DEFAULTS, input);
  let disposed = false, shown = null;
  const on = Object.fromEntries(['onOffer', 'onIncoming', 'onKind', 'onTarget', 'onFocusReturn'].map(k => [k, handlers[k] ?? null]));

  const root = kit.h('div', 'ms-promises ms-kit', { tabindex: '-1', role: 'group', 'aria-label': W.title });
  host.append(root);
  // Viewing and choosing are this phone's own, so they work while reconnecting (answer 8); the three commands are the
  // shell's footer, which makes them wait with the banner's words.
  const accepts = () => !disposed && state.interactive && state.status !== 'concealed';
  const policy = createControlPolicy({
    root, accepts,
    defaultReason: () => null,
    onFocusReturn: detail => { if (!disposed) on.onFocusReturn?.(detail); },
  });

  const onClick = event => {
    const target = event.target.closest?.('[data-intent]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts()) return;
    const intent = target.dataset.intent;
    if (intent === 'offer') on.onOffer?.();
    else if (intent === 'incoming') on.onIncoming?.();
    else if (intent === 'kind') on.onKind?.(target.dataset.value);
    else if (intent === 'target') on.onTarget?.(Number(target.dataset.value));
  };
  root.addEventListener('click', onClick);

  // ── The views' parts, made as a view is shown ───────────────────────
  let parts = {};
  /** A Promise's row (33.1): the other player's portrait, the kind, from or to whom and when, and its status or "Offered". */
  function promiseRow(item, p, side, s) {
    if (!item.portrait) item.portrait = kit.portrait({ character: p.other.character }, s.versions);
    kit.setPortrait(item.portrait, { character: p.other.character }, s.versions);
    const offered = p.state === 'offered';
    const pill = { text: offered ? W.offeredPill : p.status, icon: p.status === 'Fulfilled' ? 'check' : null, tone: p.status === 'Fulfilled' ? 'amber' : null };
    if (!item.pill) item.pill = kit.pill(pill); else kit.setPill(item.pill, pill);
    const sub = offered ? W.offeredTo(p.other.name) : side === 'given' ? W.to(p.other.name, p.when) : W.from(p.other.name, p.when);
    if (!item.row) { item.row = kit.row({ tag: 'div', title: '' }); item.append(item.row); }
    // The badge in the row's value, as the pack's promiseRow (kit 0.6.1): at the Larger text it goes under the title.
    kit.setRow(item.row, { tag: 'div', lead: item.portrait, title: PROMISE_KINDS[p.kind].name, sub, value: item.pill });
  }
  function buildList() {
    const quota = kit.row({ tag: 'div', icon: 'promise', tint: 'amber', title: W.quota, value: '' });
    const waitLabel = kit.groupLabel(''), waitList = kit.h('ul', 'ms-k-list ms-pr-waiting'), waitItem = kit.h('li', 'ms-k-list-item');
    waitList.append(waitItem);
    // In a talk, the cells (the Actions grid): Offer a Promise, and the partner's offer to answer, made when one comes.
    const talkLabel = kit.groupLabel(''), talkGrid = kit.tiles();
    talkGrid.classList.add('ms-pr-talk');
    const offerCell = kit.tile({ icon: 'plus', name: W.offer, note: W.offerLine, intent: 'offer' });
    const results = ['received', 'given'].map(side => {
      const label = kit.groupLabel(side === 'received' ? W.received : W.given);
      const list = kit.h('ul', 'ms-k-list'), item = kit.h('li', 'ms-k-list-item');
      list.append(item);
      return { side, label, list, item, why: kit.groupNote(''), none: kit.groupNote(side === 'received' ? W.noReceived : W.noGiven) };
    });
    const proof = kit.groupNote(W.notProof);
    root.append(kit.list(quota), waitLabel, waitList, talkLabel, talkGrid, ...results.flatMap(r => [r.label, r.list, r.why, r.none]), proof);
    parts = { quota, waitLabel, waitList, waitItem, talkLabel, talkGrid, offerCell, incomingCell: null, results, proof };
  }
  function paintList() {
    const p = parts, s = state;
    kit.setRow(p.quota, { tag: 'div', icon: 'promise', tint: 'amber', title: W.quota, value: W.quotaValue(s.quota.given, s.quota.received) });
    // An offer of this player's that the other hasn't answered: "Waiting for Ava" (sheet 33, the offered list).
    const waiting = s.given?.state === 'offered' ? s.given : null;
    p.waitLabel.hidden = p.waitList.hidden = !waiting;
    if (waiting) { kit.text(p.waitLabel, W.waiting(waiting.other.name)); promiseRow(p.waitItem, waiting, 'given', s); }
    // In a talk: Offer a Promise and, when the partner has offered one, the offer to answer.
    const incoming = s.talk && s.received?.state === 'offered' ? s.received : null;
    if (incoming) {
      // It waits for this player's answer: the amber dot at its icon's corner.
      const props = { icon: 'inbox', name: W.offered(incoming.other.name), note: PROMISE_KINDS[incoming.kind].name, waiting: true, intent: 'incoming' };
      if (!p.incomingCell) p.incomingCell = kit.tile(props); else kit.setTile(p.incomingCell, props);
      policy.control(p.incomingCell, {});
    }
    const cells = [s.talk && s.offer ? p.offerCell : null, incoming ? p.incomingCell : null].filter(Boolean);
    for (const cell of [p.offerCell, p.incomingCell]) if (cell && !cells.includes(cell) && cell.isConnected) policy.remove(cell);
    cells.forEach((cell, i) => { if (p.talkGrid.children[i] !== cell) p.talkGrid.insertBefore(cell, p.talkGrid.children[i] ?? null); });
    p.talkLabel.hidden = p.talkGrid.hidden = cells.length === 0;
    if (s.talk) kit.text(p.talkLabel, W.talking(s.talk.name));
    if (s.talk && s.offer) {
      // Only Frontend's `enabled` dims and refuses it; its line stays, and Frontend's reason is its description.
      kit.setTile(p.offerCell, { icon: 'plus', name: W.offer, note: W.offerLine, state: s.offer.enabled ? 'available' : 'unavailable', intent: 'offer' });
      policy.control(p.offerCell, { off: !s.offer.enabled, reason: s.offer.enabled ? null : s.offer.reason });
    }
    // Received and Given (33.1): outside a talk always, with "No Promise …"; in a talk, only an accepted one (answer 5).
    let any = false;
    for (const r of p.results) {
      const promise = s[r.side]?.state === 'accepted' ? s[r.side] : null;
      const show = !s.talk || !!promise;
      r.label.hidden = !show;
      r.list.hidden = !show || !promise;
      r.none.hidden = !show || !!promise;
      r.why.hidden = !show || !promise?.why;
      if (promise) promiseRow(r.item, promise, r.side, s);
      kit.text(r.why, promise?.why ?? '');
      any = any || show;
    }
    p.proof.hidden = !any;
  }
  function buildKinds() {
    const note = kit.groupNote('');
    const gap = kit.h('div', 'ms-pr-gap', { 'aria-hidden': 'true' });
    const tiles = KINDS.map(kind => kit.tile({ icon: PROMISE_KINDS[kind].icon, name: PROMISE_KINDS[kind].name, note: PROMISE_KINDS[kind].line, intent: 'kind', value: kind }));
    const grid = kit.tiles(...tiles);
    grid.classList.add('ms-pr-kinds');
    root.append(note, gap, grid);
    parts = { note, tiles };
  }
  function paintKinds() {
    const p = parts, s = state;
    kit.text(p.note, W.kindsNote(partnerOf(s)));
    KINDS.forEach((kind, i) => {
      const k = PROMISE_KINDS[kind], chosen = s.draft.kind === kind;
      kit.setTile(p.tiles[i], { icon: k.icon, name: k.name, note: k.line, state: chosen ? 'selected' : 'available', intent: 'kind', value: kind });
      p.tiles[i].setAttribute('aria-pressed', String(chosen));
      policy.control(p.tiles[i], {});
    });
  }
  function buildTarget() {
    const list = kit.h('ul', 'ms-k-list ms-pr-targets');
    root.append(list);
    parts = { list, items: new Map() };
  }
  function paintTarget() {
    const p = parts, s = state;
    // Exactly the projection's promiseTargetSeatIds: never more, never worked out (answer 4).
    const wanted = new Set(s.targets.map(t => t.seat));
    for (const [seat, item] of p.items) if (!wanted.has(seat)) { policy.remove(item); p.items.delete(seat); }
    s.targets.forEach((t, i) => {
      let item = p.items.get(t.seat);
      if (!item) {
        item = kit.h('li', 'ms-k-list-item');
        item.portrait = kit.portrait({ character: t.character }, s.versions);
        item.mark = kit.h('span', 'ms-pr-chosen', { 'aria-hidden': 'true' });
        item.mark.append(kit.icon('check', true));
        item.append(kit.row({ title: '', intent: 'target', data: t.seat }));
        p.items.set(t.seat, item);
      }
      kit.setPortrait(item.portrait, { character: t.character }, s.versions);
      const chosen = s.draft.target === t.seat;
      kit.setRow(item.firstChild, { lead: item.portrait, title: W.seat(t.seat, t.name), trail: item.mark, intent: 'target', data: t.seat });
      item.firstChild.setAttribute('aria-pressed', String(chosen));
      item.mark.hidden = !chosen;
      policy.control(item.firstChild, {});
      if (p.list.children[i] !== item) p.list.insertBefore(item, p.list.children[i] ?? null);
    });
    p.list.hidden = s.targets.length === 0;
  }
  /** The paper card (sheet 33): the kind's icon on ink, or the giver's portrait (44 px, as drawn), the kind in capitals, and the exact terms. */
  function buildCard(withPortrait) {
    const lead = withPortrait ? kit.portrait({ character: null }, state.versions) : kit.h('span', 'ms-pr-card-icon');
    const name = kit.h('b', 'ms-pr-card-name');
    const head = kit.h('div', 'ms-pr-card-head');
    head.append(lead, name);
    const terms = kit.h('p', 'ms-pr-card-terms');
    const card = kit.comic(head, terms);
    card.classList.add('ms-pr-card');
    const facts = kit.facts([]);
    root.append(card, facts);
    parts = { card, lead, name, terms, facts };
  }
  function paintCard(promise, kind, terms, lines) {
    const p = parts, s = state;
    p.card.hidden = !kind;
    if (!kind) { kit.text(p.terms, ''); kit.setFacts(p.facts, []); return; }
    if (promise) kit.setPortrait(p.lead, { character: promise.other.character }, s.versions);
    else kit.setIcon(p.lead, PROMISE_KINDS[kind].icon, true);
    kit.text(p.name, PROMISE_KINDS[kind].name);
    // Frontend's exact terms, as given: never composed, trimmed or reordered here (answer 3).
    kit.text(p.terms, terms ?? '');
    p.terms.hidden = !terms;
    kit.setFacts(p.facts, lines);
  }
  function paintConfirm() {
    const s = state, name = partnerOf(s);
    paintCard(null, s.draft.kind, s.draft.terms, [W.usesGiven(name), { icon: 'lock', text: W.onlyPair(name) }]);
    paintError();
  }
  function paintIncoming() {
    const r = state.received?.state === 'offered' ? state.received : null;
    paintCard(r, r?.kind ?? null, r?.terms ?? null, r ? [r.condition, W.usesReceived, W.neverForced].filter(Boolean) : []);
    paintError();
  }
  /**
   * A refused command (0.1.1): Frontend's words in the kit's inline error, the last thing in the body, so it sits
   * above the footer's Back and Offer, or Decline and Accept. Brought into view as it appears, so it is whole at the
   * Largest text on the smallest phone. Its role, alert, says it once.
   */
  function paintError() {
    const p = parts, words = state.error;
    if (p.errorWords === words) return;
    p.errorNote?.remove();
    p.errorNote = null;
    p.errorWords = words;
    if (!words) return;
    p.errorNote = kit.errorNote(words);
    p.errorNote.classList.add('ms-pr-error');
    root.append(p.errorNote);
    p.errorNote.scrollIntoView?.({ block: 'nearest' });
  }
  function build(view) {
    // The view's parts leave with it; a focus in them returns to the content, reported once.
    if (parts.terms) kit.text(parts.terms, '');
    for (const node of [...root.children]) if (!node.classList.contains('ms-k-vh')) policy.remove(node);
    if (view === 'list') buildList();
    else if (view === 'kinds') buildKinds();
    else if (view === 'target') buildTarget();
    else buildCard(view === 'incoming');
    shown = view;
  }

  function render() {
    if (disposed) return;
    root.dataset.motion = state.reducedMotion ? 'reduced' : 'full';
    root.dataset.view = state.view;
    if (shown !== state.view) build(state.view);
    if (state.view === 'list') paintList();
    else if (state.view === 'kinds') paintKinds();
    else if (state.view === 'target') paintTarget();
    else if (state.view === 'confirm') paintConfirm();
    else paintIncoming();
  }
  function update(next = {}) {
    if (disposed) return;
    state = nextPromisesInput(state, next);
    render();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    // The terms and the Promises leave the page with the content.
    for (const node of [...root.children]) node.remove();
    root.removeEventListener('click', onClick);
    policy.dispose();
    root.remove();
  }
  render();
  return Object.freeze({ update, dispose, element: root });
}
