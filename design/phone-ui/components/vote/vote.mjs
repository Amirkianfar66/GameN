// The ballot and its result window: the phone during a Jail vote or a Captain election, and the five-second
// result after it, as the phone pack draws them (sheets 35 and 36 the ballot, 37 and 38 the results, 56 both
// at the largest text; #222 item 4). Runtime source, Designer's (the owner, 14 and 15 November 2026:
// Designer builds each visual component once, in design/; the game and the preview use it as it is).
//
// How Frontend uses it:
//   - the ballot's frame is the phone shell's docked sheet: ballotSheet() gives the shell its title and
//     footer (Abstain, "Vote for Ava", "Ballot registered", …), and mountBallot() draws the roster in the
//     shell's sheetBody. ballotBar() gives the shell's top bar its words;
//   - the result window is mounted over the stage for the 5 s result: mountVoteResult(), with
//     resultBar() for the top bar and resultWords() for an announcement.
//
// What it never does: decide who may vote or be chosen, send a ballot, count, work out a threshold or an
// outcome. Candidates come from the public ballot (`ballot.eligibleTargets`), the tally is the projection's
// `lastTally` as it is, and a tap only reports intent. Ballots are private and totals are public: the
// result window receives only the public tally and never shows who voted for whom. This viewer's own
// inputs (the pick, the ballot sent, whether they may vote) are dropped when the phone is concealed or
// its viewer changes.

import { createControlPolicy, createKit, seatNumber } from '../kit/kit.mjs';
import { RESULT_ART } from '../../../../apps/game/hosted/scene-drawing/phone-kit-art.mjs';

export const VOTE_VERSION = 'vote-0.1.0';
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
const KINDS = Object.freeze(['jail', 'captain']);
const MODES = Object.freeze(['open', 'closed', 'cannot']);
const BUSY = Object.freeze([null, 'vote', 'abstain']);
const TALLY_KINDS = Object.freeze({ JAIL_VOTE: 'jail', CAPTAIN_ELECTION: 'captain' });
const OUTCOMES = Object.freeze({
  CAPTAIN_ELECTED: 'captain', RUNOFF_REQUIRED: 'captain', NO_CAPTAIN_ELECTED: 'captain',
  PLAYER_JAILED: 'jail', JAIL_FULL: 'jail', NO_JAIL_SELECTION: 'jail',
});
/** The outcomes that name a chosen person (`selectedSeatId`). */
const CHOSEN = Object.freeze(['CAPTAIN_ELECTED', 'PLAYER_JAILED', 'JAIL_FULL']);

/** The pack's words (screens-vote.mjs, sheets 35–38). */
export const VOTE_WORDS = Object.freeze({
  title: Object.freeze({ jail: 'Jail vote', captain: 'Captain election', runoff: 'Captain runoff' }),
  private: 'Your ballot is private',
  candidates: Object.freeze({ jail: 'Jail vote candidates', captain: 'Captain candidates' }),
  selected: 'Selected', yourVote: 'Your vote', notInRunoff: 'Not in runoff', notAvailable: 'Not available now',
  abstained: 'You abstained', closed: 'Closed · result next', watch: 'You can still watch.', cannot: 'You can’t vote in this ballot.',
  abstain: 'Abstain', vote: 'Vote', voteFor: name => `Vote for ${name}`, chooseFirst: 'Choose a player first',
  registered: 'Ballot registered', abstainedFoot: 'Abstained', votingClosed: 'Voting closed', cannotFoot: 'You can’t vote',
  result: Object.freeze({ jail: 'Jail vote · result', captain: 'Election · result', short: 'Vote result' }),
  resultName: Object.freeze({ jail: 'Jail vote result', captain: 'Captain election result' }), resultRoster: 'Result',
  ballotsPrivate: 'Ballots stay private', round: n => `Round ${n}`,
  stale: 'Controls return when the match is current',
});

/** Each outcome's head: its tone, its picture (RESULT_ART), its stamp and its stamp's tone. */
const HEADS = Object.freeze({
  CAPTAIN_ELECTED: Object.freeze({ tone: 'gold', art: 'vote-captain-star', stamp: 'Captain', stampTone: 'amber' }),
  RUNOFF_REQUIRED: Object.freeze({ tone: 'paper', art: 'vote-tie-burst', stamp: 'Runoff', stampTone: null }),
  NO_CAPTAIN_ELECTED: Object.freeze({ tone: 'paper', art: 'vote-empty-chair', stamp: 'No Captain', stampTone: null }),
  PLAYER_JAILED: Object.freeze({ tone: 'steel', art: 'vote-cell-bars', stamp: 'Jailed', stampTone: null }),
  JAIL_FULL: Object.freeze({ tone: 'steel', art: 'vote-cell-bars', stamp: 'No room', stampTone: null }),
  NO_JAIL_SELECTION: Object.freeze({ tone: 'paper', art: 'vote-empty-cell', stamp: 'No one', stampTone: null }),
});

const isText = value => typeof value === 'string' && value.length > 0;
const optionalText = (value, what) => {
  if (value !== null && value !== undefined && typeof value !== 'string') throw new TypeError(`${what} is text, or null`);
  return value ?? null;
};
/** A seat's number from a number or a `'seat-n'` id; NaN for anything else. */
const seatOf = seat => seatNumber({ seat });
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
/** "Ava", "Ava and Ben", "Ava, Ben and Cleo". */
const names = list => (list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);

function checkRoster(roster, what) {
  if (!Array.isArray(roster) || roster.length < 1 || roster.length > 9) throw new TypeError(`${what} lists the match's seats, 1 to 9 of them`);
  const seen = new Set();
  return roster.map((p, i) => {
    if (!p || typeof p !== 'object' || !isText(p.name)) throw new TypeError(`${what}[${i}] is { seat, name, character, … }`);
    const n = seatOf(p.seat);
    if (!Number.isSafeInteger(n) || n < 1 || n > 9) throw new TypeError(`${what}[${i}]'s seat is 1–9, or 'seat-1' … 'seat-9'`);
    if (seen.has(n)) throw new TypeError(`${what} has seat ${n} twice`);
    seen.add(n);
    return Object.freeze({ seat: n, name: p.name, character: p.character ?? null,
      candidate: !!p.candidate, reason: optionalText(p.reason, `${what}[${i}].reason`) });
  }).sort((a, b) => a.seat - b.seat);
}
function checkCommon(next) {
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  next.interactive = next.interactive !== false;
  next.reducedMotion = !!next.reducedMotion;
}

// ── The ballot ──────────────────────────────────────────────────────────

/** Every ballot input, with its default. */
export const BALLOT_DEFAULTS = Object.freeze({
  status: 'live', interactive: true, reducedMotion: false, viewer: null, versions: null,
  kind: 'jail', runoff: null, roster: null,
  // This viewer's: the seat picked and not yet sent, the ballot sent, whether this viewer may vote now,
  // the request being sent, and why this viewer can't vote. Dropped while concealed or for a new viewer.
  selected: null, own: null, mode: 'closed', busy: null, reason: null,
});
const BALLOT_VIEWER_KEYS = Object.freeze(['selected', 'own', 'mode', 'busy', 'reason']);

/** The ballot's input, checked: `{ …input, roster, runoff, own }` with seats as numbers. */
export function checkBallot(input) {
  const next = { ...BALLOT_DEFAULTS, ...input };
  checkCommon(next);
  if (!KINDS.includes(next.kind)) throw new TypeError(`A ballot's kind is ${KINDS.join(' or ')}, not ${JSON.stringify(next.kind)}`);
  next.roster = checkRoster(next.roster, 'roster');
  const bySeat = new Map(next.roster.map(p => [p.seat, p]));
  if (next.runoff !== null && next.runoff !== undefined) {
    if (next.kind !== 'captain') throw new TypeError('Only a Captain election has a runoff');
    const tied = (next.runoff.tied ?? []).map(seatOf);
    if (tied.length < 2 || tied.some(n => !bySeat.has(n))) throw new TypeError('runoff.tied names two or more seats of the roster');
    next.runoff = Object.freeze({ tied: Object.freeze(tied) });
  } else next.runoff = null;
  if (!MODES.includes(next.mode)) throw new TypeError(`mode is ${MODES.join(', ')}, not ${JSON.stringify(next.mode)}`);
  if (next.selected !== null && next.selected !== undefined) {
    const n = seatOf(next.selected);
    if (!bySeat.get(n)?.candidate) throw new TypeError('selected is a candidate\'s seat, or null');
    next.selected = n;
  } else next.selected = null;
  if (next.own !== null && next.own !== undefined) {
    if (next.own.abstained === true) next.own = Object.freeze({ abstained: true, seat: null });
    else {
      const n = seatOf(next.own.seat);
      if (!bySeat.has(n)) throw new TypeError('own is { seat } of the roster, { abstained: true }, or null');
      next.own = Object.freeze({ abstained: false, seat: n });
    }
  } else next.own = null;
  if (!BUSY.includes(next.busy ?? null)) throw new TypeError('busy is \'vote\', \'abstain\' or null');
  next.busy = next.busy ?? null;
  next.reason = optionalText(next.reason, 'reason');
  return next;
}

/**
 * The next ballot input from the previous one and an update. Each key an update gives replaces that
 * key's value; the rest stay. This viewer's inputs are dropped while concealed, never kept for when the
 * phone shows again, and when the viewer changes, unless the same update gives the new viewer's own:
 * dropped, the ballot takes no choice (`mode: 'closed'`) until they are given again.
 */
export function nextBallotInput(previous, input) {
  const merged = { ...previous, ...input };
  const viewerChanged = 'viewer' in input && previous.viewer !== input.viewer;
  if ((merged.status ?? 'live') === 'concealed') for (const key of BALLOT_VIEWER_KEYS) merged[key] = BALLOT_DEFAULTS[key];
  else if (viewerChanged) for (const key of BALLOT_VIEWER_KEYS) if (!(key in input)) merged[key] = BALLOT_DEFAULTS[key];
  return checkBallot(merged);
}

/** A cell's look and words, from the inputs alone. */
function ballotCell(state, p) {
  const { mode, own, selected, runoff } = state;
  if (!p.candidate) {
    // Not available (the owner's T3): the server's reason; else, in a runoff, "Not in runoff" (the server's own
    // tied pair, true by definition); else "Not available now". Never a reason worked out on the phone, and
    // not the person's public status either, which under exactly these cells would read as one.
    const note = p.reason ?? (runoff ? VOTE_WORDS.notInRunoff : null) ?? VOTE_WORDS.notAvailable;
    return { state: 'ineligible', note, mark: null, off: true };
  }
  if (own && own.seat === p.seat) return { state: 'confirmed', note: VOTE_WORDS.yourVote, mark: 'check', off: true };
  if (own || mode !== 'open') return { state: 'faded', note: null, mark: null, off: true };
  if (selected === p.seat) return { state: 'selected', note: VOTE_WORDS.selected, mark: 'check', off: false };
  return { state: 'available', note: null, mark: null, off: false };
}

/**
 * Each seat's cell on the ballot, from the inputs alone: [{ seat, state, note, mark, off }] in seat order, 1
 * to 9, with `empty` for a seat the match does not have. The ballot draws exactly these.
 */
export function ballotCells(input) {
  const s = checkBallot(input);
  const bySeat = new Map(s.roster.map(p => [p.seat, p]));
  return Array.from({ length: 9 }, (_, i) => {
    const p = bySeat.get(i + 1);
    return p ? { seat: i + 1, ...ballotCell(s, p) } : { seat: i + 1, state: 'empty', note: null, mark: null, off: true };
  });
}

/** The shell's top bar for the ballot: its icon and words (Frontend adds the round and the clock). */
export function ballotBar(input) {
  const s = checkBallot(input);
  const byName = new Map(s.roster.map(p => [p.seat, p.name]));
  return {
    kind: 'phase', icon: s.kind === 'captain' ? 'captain' : 'vote',
    title: s.runoff ? VOTE_WORDS.title.runoff : VOTE_WORDS.title[s.kind],
    sub: s.runoff ? `${names(s.runoff.tied.map(n => byName.get(n)))} tied` : VOTE_WORDS.private,
  };
}

/**
 * The shell's docked sheet for the ballot (`shell.update({ sheet: ballotSheet(input) })`): its title, a
 * count under nine players, Close, and the footer. Its taps come back through the shell's
 * onSheetAction('abstain' | 'vote', 'ballot'); Frontend sends `VOTE` with `selected`, or with none.
 */
export function ballotSheet(input) {
  const s = checkBallot(input);
  const pick = s.selected !== null ? s.roster.find(p => p.seat === s.selected) : null;
  const done = (id, label, icon) => [{ id, label, kind: 'secondary', icon, enabled: false }];
  let actions;
  if (s.status === 'concealed') actions = [];
  else if (s.own) actions = s.own.abstained ? done('abstained', VOTE_WORDS.abstainedFoot, 'check') : done('registered', VOTE_WORDS.registered, 'check');
  else if (s.mode === 'closed') actions = done('closed', VOTE_WORDS.votingClosed, 'check');
  else if (s.mode === 'cannot') actions = done('cannot', VOTE_WORDS.cannotFoot, 'eliminated');
  else actions = [
    { id: 'abstain', label: VOTE_WORDS.abstain, kind: 'secondary', enabled: s.busy === null, busy: s.busy === 'abstain' },
    { id: 'vote', label: pick ? VOTE_WORDS.voteFor(pick.name) : VOTE_WORDS.vote, kind: 'primary', enabled: !!pick && s.busy === null,
      busy: s.busy === 'vote', reason: pick ? null : VOTE_WORDS.chooseFirst },
  ];
  return {
    id: 'ballot', title: s.runoff ? VOTE_WORDS.title.runoff : VOTE_WORDS.title[s.kind],
    sub: s.roster.length < 9 ? `${s.roster.length} players` : null, back: false, close: true, detent: 'large', actions,
  };
}

/**
 * Mounts the ballot's roster in `host` (the shell's sheetBody). Returns { update, suspend, resume,
 * dispose, element }. Handlers: onSelect(seat) when an available cell is tapped, and
 * onFocusReturn(detail) when the focused cell ended.
 */
export function mountBallot(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('A ballot needs a host element');
  const doc = host.ownerDocument;
  const kit = createKit(doc);
  const on = { onSelect: handlers.onSelect ?? null, onFocusReturn: handlers.onFocusReturn ?? null };
  let state = nextBallotInput(BALLOT_DEFAULTS, input);
  let disposed = false, suspended = false, notesKey = null;

  const root = kit.h('div', 'ms-vote ms-vote-ballot ms-kit', { tabindex: '-1' });
  const notes = kit.h('div', 'ms-ballot-notes');
  const { wrap, grid } = kit.grid9();
  wrap.classList.add('ms-ballot-roster');
  grid.classList.add('ms-vote-grid');
  grid.setAttribute('role', 'group');
  root.append(notes, wrap);
  host.append(root);
  const cells = new Map();

  const accepts = () => !disposed && !suspended && state.interactive && state.status === 'live' && state.busy === null;
  const policy = createControlPolicy({ root, accepts,
    defaultReason: () => (state.status === 'stale' ? VOTE_WORDS.stale : null),
    onFocusReturn: detail => on.onFocusReturn?.(detail) });
  const onClick = event => {
    const target = event.target.closest?.('button[data-intent="select"]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts()) return;
    on.onSelect?.(Number(target.dataset.value));
  };
  root.addEventListener('click', onClick);

  function paintNotes() {
    const s = state;
    const want = s.status === 'concealed' ? null
      : s.own?.abstained ? ['pill', VOTE_WORDS.abstained, 'check']
        : s.mode === 'closed' && !s.own ? ['pill', VOTE_WORDS.closed, 'lock']
          : s.mode === 'cannot' && !s.own ? ['note', `${s.reason ?? VOTE_WORDS.cannot} ${VOTE_WORDS.watch}`]
            : null;
    const key = JSON.stringify(want);
    if (key === notesKey) return;
    notesKey = key;
    notes.replaceChildren(...(!want ? [] : want[0] === 'pill' ? [kit.pill({ text: want[1], icon: want[2], tone: 'paper' })] : [kit.groupNote(want[1])]));
    notes.hidden = !want;
    attr(notes, 'data-note', want ? want[0] : null);
  }

  function paintCells() {
    const s = state;
    const concealed = s.status === 'concealed';
    attr(grid, 'aria-label', concealed ? null : VOTE_WORDS.candidates[s.kind]);
    const bySeat = new Map(s.roster.map(p => [p.seat, p]));
    for (let n = 1; n <= 9; n += 1) {
      const p = concealed ? null : bySeat.get(n) ?? null;
      // Seat n is always cell n. Concealed, no cell is drawn at all: no name, pick or ballot.
      const wanted = concealed ? null : p ? 'button' : 'div';
      let node = cells.get(n);
      if (node && (!wanted || node.tagName.toLowerCase() !== wanted)) { policy.remove(node); cells.delete(n); node = null; }
      if (!wanted) continue;
      if (!p) {
        if (!node) { node = kit.cell({ tag: 'div', state: 'empty' }); cells.set(n, node); }
        kit.setCell(node, { state: 'empty' });
      } else {
        const look = ballotCell(s, p);
        const props = { person: p, state: look.state, note: look.note, mark: look.mark, you: s.viewer !== null && seatOf(s.viewer) === p.seat,
          intent: 'select', versions: s.versions };
        if (!node) { node = kit.cell(props); cells.set(n, node); } else kit.setCell(node, props);
        policy.control(node, { intent: 'select', off: look.off });
      }
      if (grid.children[n - 1] !== node) grid.insertBefore(node, grid.children[n - 1] ?? null);
    }
  }

  function attr(node, name, value) {
    if (value === null || value === undefined) { if (node.hasAttribute(name)) node.removeAttribute(name); }
    else if (node.getAttribute(name) !== String(value)) node.setAttribute(name, String(value));
  }

  function render() {
    if (disposed) return;
    root.dataset.status = state.status;
    root.dataset.kind = state.kind;
    attr(root, 'data-motion', state.reducedMotion ? 'reduced' : null);
    attr(root, 'aria-hidden', state.status === 'concealed' ? 'true' : null);
    if (suspended) root.dataset.suspended = ''; else delete root.dataset.suspended;
    paintNotes();
    paintCells();
  }
  function update(next = {}) {
    if (disposed) return;
    state = nextBallotInput(state, next);
    render();
  }
  /** Nothing of the ballot's runs by itself; suspended, it takes no taps until resumed. */
  function suspend() { if (disposed) return; suspended = true; render(); }
  function resume() { if (disposed) return; suspended = false; render(); }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeEventListener('click', onClick);
    policy.dispose();
    cells.clear();
    root.remove();
  }
  render();
  return Object.freeze({ update, suspend, resume, dispose, element: root });
}

// ── The result window ───────────────────────────────────────────────────

/** Every result input, with its default. */
export const RESULT_DEFAULTS = Object.freeze({
  status: 'live', reducedMotion: false, viewer: null, versions: null,
  tally: null, roster: null, needed: null, round: null,
});

/** The result's input, checked: the tally's seats as numbers, the counts by seat. */
export function checkResult(input) {
  const next = { ...RESULT_DEFAULTS, ...input };
  checkCommon(next);
  const t = next.tally;
  if (!t || typeof t !== 'object') throw new TypeError('tally is the projection\'s lastTally');
  const kind = TALLY_KINDS[t.kind];
  if (!kind) throw new TypeError(`A tally's kind is ${Object.keys(TALLY_KINDS).join(' or ')}, not ${JSON.stringify(t.kind)}`);
  if (OUTCOMES[t.outcome] !== kind) throw new TypeError(`${JSON.stringify(t.outcome)} is not an outcome of a ${t.kind}`);
  next.roster = checkRoster(next.roster, 'roster');
  const bySeat = new Map(next.roster.map(p => [p.seat, p]));
  const counts = new Map();
  for (const [id, n] of Object.entries(t.counts ?? {})) {
    const seat = seatOf(id);
    if (!bySeat.has(seat)) throw new TypeError(`tally.counts names ${JSON.stringify(id)}, which is not in the roster`);
    if (!Number.isSafeInteger(n) || n < 0) throw new TypeError('A count is a whole number of votes');
    counts.set(seat, n);
  }
  if (!Number.isSafeInteger(t.eligibleVoterCount) || t.eligibleVoterCount < 0) throw new TypeError('tally.eligibleVoterCount is a whole number');
  const selected = t.selectedSeatId === null || t.selectedSeatId === undefined ? null : seatOf(t.selectedSeatId);
  if (selected !== null && !bySeat.has(selected)) throw new TypeError('tally.selectedSeatId is not in the roster');
  if (CHOSEN.includes(t.outcome) && selected === null) throw new TypeError(`${t.outcome} names the chosen seat (selectedSeatId)`);
  const tied = (t.tiedSeatIds ?? []).map(seatOf);
  if (tied.some(n => !bySeat.has(n))) throw new TypeError('tally.tiedSeatIds names a seat that is not in the roster');
  if (next.needed !== null && next.needed !== undefined && !(Number.isSafeInteger(next.needed) && next.needed > 0)) throw new TypeError('needed is a whole number of votes, or null');
  if (next.round !== null && next.round !== undefined && !(Number.isSafeInteger(next.round) && next.round >= 0)) throw new TypeError('round is a whole number, or null');
  next.needed = next.needed ?? null;
  next.round = next.round ?? null;
  next.result = Object.freeze({ kind, outcome: t.outcome, counts, voters: t.eligibleVoterCount, selected, tied: Object.freeze(tied) });
  return next;
}

/** The next result input: each key given replaces that key. The result holds nothing of this viewer's but "You". */
export function nextResultInput(previous, input) { return checkResult({ ...previous, ...input }); }

/**
 * The result's words, the same for the window, the preview, the test and Frontend's announcement:
 * { stamp, title, line, announce }. The title is drawn in capitals by the window's type.
 */
export function resultWords(input) {
  const s = input?.result ? input : checkResult(input);
  const r = s.result;
  const name = seat => s.roster.find(p => p.seat === seat)?.name ?? '';
  const total = [...r.counts.values()].reduce((a, b) => a + b, 0);
  const votes = plural(total, 'vote', 'votes');
  const could = `${r.voters} could vote`;
  // The threshold is the projection's to give; without it, the line says what the tally holds and no more.
  const jailLine = s.needed !== null ? `${votes} · ${s.needed} needed of ${r.voters}` : `${votes} · ${could}`;
  const chosen = r.selected !== null ? name(r.selected) : '';
  const lines = {
    CAPTAIN_ELECTED: [`${chosen} is Captain`, `${votes} · ${could}`],
    RUNOFF_REQUIRED: ['Tie · runoff', `${votes} · ${could}`],
    NO_CAPTAIN_ELECTED: ['No Captain', `${votes} · ${could}`],
    PLAYER_JAILED: [`${chosen} goes to Jail`, jailLine],
    JAIL_FULL: [`${chosen} chosen · Jail full`, `Chosen, but every Jail place is taken. ${chosen} stays.`],
    // "No one reached 4 votes" only when it is so; a tie at the threshold is not that.
    NO_JAIL_SELECTION: ['No one goes to Jail', s.needed !== null && [...r.counts.values()].every(n => n < s.needed)
      ? `No one reached ${plural(s.needed, 'vote', 'votes')}.` : 'No one was chosen.'],
  };
  const [title, line] = lines[r.outcome];
  const spoken = words => words.replace(/ · /g, ', ');
  return { stamp: HEADS[r.outcome].stamp, title, line, announce: `${spoken(title)}. ${spoken(line)}${/[.!?]$/.test(line) ? '' : '.'}` };
}

/** The shell's top bar for the result: its icon and words, with the pack's short form (Frontend adds the round and the ring). */
export function resultBar(input) {
  const s = input?.result ? input : checkResult(input);
  return { kind: 'phase', icon: s.result.kind === 'captain' ? 'captain' : 'jail', title: VOTE_WORDS.result[s.result.kind], short: VOTE_WORDS.result.short };
}

/**
 * Mounts the result window in `host` (the shell's stage, over the room scene), where it fills the stage
 * less the pack's margins. Returns { update, suspend, resume, dispose, element }. It has no controls.
 */
export function mountVoteResult(host, input = {}) {
  if (!host?.ownerDocument) throw new TypeError('A result window needs a host element');
  const doc = host.ownerDocument;
  const kit = createKit(doc);
  let state = nextResultInput(RESULT_DEFAULTS, input);
  let disposed = false, artKey = null;

  const root = kit.h('section', 'ms-vote ms-vote-result ms-kit');
  const inner = kit.h('div', 'ms-result-inner');
  const scroll = kit.h('div', 'ms-result-scroll');
  const head = kit.h('div', 'ms-result-head');
  const art = kit.h('span', 'ms-result-art', { 'aria-hidden': 'true' });
  const words = kit.h('div', 'ms-result-words');
  const stampHolder = kit.h('span', 'ms-result-stamp');
  const stamp = kit.stamp({ text: '' });
  stampHolder.append(stamp);
  const title = kit.h('h2', 'ms-result-title');
  const line = kit.h('p', 'ms-result-line');
  words.append(stampHolder, title, line);
  head.append(art, words);
  const body = kit.h('div', 'ms-result-body', { 'data-ms-surface': 'paper' });
  const { wrap, grid } = kit.grid9();
  grid.setAttribute('role', 'group');
  body.append(wrap);
  scroll.append(head, body);
  const foot = kit.h('div', 'ms-result-foot');
  const lock = kit.h('span', 'ms-result-lock', { 'aria-hidden': 'true' });
  kit.setIcon(lock, 'lock', true);
  const privateWords = kit.h('span', 'ms-result-private');
  const round = kit.h('span', 'ms-result-round');
  foot.append(lock, privateWords, round);
  inner.append(scroll, foot);
  root.append(inner);
  host.append(root);
  const cells = new Map();

  function render() {
    if (disposed) return;
    const s = state, r = s.result, head0 = HEADS[r.outcome], w = resultWords(s);
    root.dataset.status = s.status;
    // Concealed, as the shell and the room scene: nothing drawn, nothing for a screen reader and no words
    // left in the page, though the totals are public. Shown again, the window is drawn afresh.
    root.hidden = s.status === 'concealed';
    if (root.hidden) {
      for (const node of cells.values()) node.remove();
      cells.clear();
      for (const node of [title, line, round, privateWords]) kit.text(node, '');
      kit.setStamp(stamp, { text: '', tone: null });
      art.replaceChildren();
      artKey = null;
      root.removeAttribute('aria-label');
      grid.removeAttribute('aria-label');
      delete root.dataset.outcome;
      return;
    }
    root.dataset.outcome = r.outcome;
    root.setAttribute('aria-label', VOTE_WORDS.resultName[r.kind]);
    if (s.reducedMotion) root.dataset.motion = 'reduced'; else delete root.dataset.motion;
    head.dataset.tone = head0.tone;
    if (artKey !== head0.art) {
      const t = doc.createElement('template');
      t.innerHTML = RESULT_ART[head0.art]().trim();
      t.content.firstElementChild?.classList.add('ms-result-art-svg');
      art.replaceChildren(...t.content.childNodes);
      artKey = head0.art;
    }
    kit.setStamp(stamp, { text: w.stamp, tone: head0.stampTone });
    kit.text(title, w.title);
    kit.text(line, w.line);
    grid.setAttribute('aria-label', VOTE_WORDS.resultRoster);
    kit.text(privateWords, VOTE_WORDS.ballotsPrivate);
    kit.text(round, s.round !== null ? VOTE_WORDS.round(s.round) : '');
    round.hidden = s.round === null;
    // "You" is the phone's: never drawn while concealed.
    const you = s.status !== 'concealed' && s.viewer !== null ? seatOf(s.viewer) : null;
    const bySeat = new Map(s.roster.map(p => [p.seat, p]));
    for (let n = 1; n <= 9; n += 1) {
      const p = bySeat.get(n) ?? null;
      let props;
      if (!p) props = { tag: 'div', state: 'empty' };
      // Not a candidate: faded with no count, and the server's reason if it gives one (T3); nothing else.
      else if (!p.candidate) props = { tag: 'div', person: p, state: 'ineligible', note: p.reason, versions: s.versions };
      else {
        // Each count once, as the cell's badge, and 0 as 0 (the owner, 10 November; #222 item 4).
        const count = r.counts.get(n) ?? 0;
        const lead = r.selected === n && CHOSEN.includes(r.outcome) || r.outcome === 'RUNOFF_REQUIRED' && r.tied.includes(n);
        props = { tag: 'div', person: p, state: lead ? 'winner' : 'available', count, you: you === n, versions: s.versions };
      }
      let node = cells.get(n);
      if (!node) { node = kit.cell(props); cells.set(n, node); } else kit.setCell(node, props);
      if (grid.children[n - 1] !== node) grid.insertBefore(node, grid.children[n - 1] ?? null);
    }
  }
  function update(next = {}) {
    if (disposed) return;
    state = nextResultInput(state, next);
    render();
  }
  function suspend() { if (!disposed) root.dataset.suspended = ''; }
  function resume() { if (!disposed) delete root.dataset.suspended; }
  function dispose() {
    if (disposed) return;
    disposed = true;
    cells.clear();
    root.remove();
  }
  render();
  return Object.freeze({ update, suspend, resume, dispose, element: root });
}
