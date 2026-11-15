// The Card sheet: the Card tab's content during a match, as the phone pack draws it (sheet 31; #222 item 7).
// Runtime source, Designer's (the owner, 14 and 15 November 2026: Designer builds each visual component
// once, in design/; the game and the preview use it as it is).
//
// How Frontend uses it: the frame is the phone shell's docked sheet; cardSheet() gives the shell its words
// ("Your role", "Only on this phone", Close, and "Hide card" in the head), and mountCardSheet() draws the
// content in the shell's sheetBody:
//   - the card, fitted (the role stage's role card, role-stage/role-card.mjs, mounted as it is);
//   - Card, Knowledge and Resources (the kit's segmented control);
//   - the Knowledge rows, with the Hacker's Scans, and the Resources rows;
//   - hidden: the card's back, "Hidden" and Show, and nothing else.
//
// What it never does: work out a role's knowledge, resources, counts or availability. The card's words are
// Frontend's (as the role stage takes them), the knowledge is the projection's `knowledge` as it is, and each
// resource's value is Frontend's words. The open part and Hide are Frontend's state; a tap only reports
// intent. Everything here is this viewer's own private view: concealed or for a new viewer it is dropped, and
// hidden, no private word stays in the page.

import { checkRoleCard, mountRoleCard } from '../role-stage/role-card.mjs';
import { createControlPolicy, createKit, seatNumber } from '../kit/kit.mjs';

export const CARD_SHEET_VERSION = 'card-sheet-0.1.0';
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
const VIEWS = Object.freeze(['card', 'knowledge', 'resources']);
const FACTIONS = Object.freeze(['Blue', 'Red', 'Alien']);

/**
 * The pack's words (screens-game.mjs card(), sheet 31). The empty Knowledge line is the one departure: the
 * pack's "Your role starts with no knowledge of other players." states a rule the phone can't know; under
 * T3's principle (the phone never works out anything from the rules itself) it says only what is so. The
 * Lead's decision on #270, confirmed by the owner on 15 November 2026 (docs/design/owner-decisions.md, #280).
 */
export const CARD_SHEET_WORDS = Object.freeze({
  title: 'Your role', sub: 'Only on this phone', hide: 'Hide card',
  views: Object.freeze({ card: 'Card', knowledge: 'Knowledge', resources: 'Resources' }),
  viewsLabel: 'Your role',
  undercover: 'Undercover', trio: 'Unmapped trio', scans: 'Scans',
  noKnowledge: 'You have no knowledge of other players.',
  player: n => `Player ${n}`, players: ns => `Players ${ns.join(', ')}`,
  scanTitle: (round, n) => `Round ${round} · Player ${n}`,
  matched: 'matched', notMatched: 'not matched', inCode: 'in the Code', notInCode: 'not in the Code',
});

/** The resources the pack draws, in its order: each kind's icon, tint and title. Each value is Frontend's words. */
export const RESOURCE_KINDS = Object.freeze({
  weapons: Object.freeze({ icon: 'shoot', tint: 'steel', title: 'Weapons' }),
  'role-action': Object.freeze({ icon: 'actions', tint: 'steel', title: 'Role Action' }),
  move: Object.freeze({ icon: 'move', tint: 'steel', title: 'Move' }),
  injections: Object.freeze({ icon: 'rescue', tint: 'teal', title: 'Shared injections' }),
  promises: Object.freeze({ icon: 'promise', tint: 'steel', title: 'Promises' }),
});

/** Every input, with its default: nothing of this viewer's until Frontend gives it. */
export const CARD_SHEET_DEFAULTS = Object.freeze({
  status: 'live', interactive: true, reducedMotion: false, viewer: null, versions: null,
  view: 'card', hidden: false, card: null, knowledge: null, resources: null,
});
/** This viewer's own inputs: dropped while concealed, and for a new viewer unless the update gives theirs. */
const VIEWER_KEYS = Object.freeze(['view', 'hidden', 'card', 'knowledge', 'resources']);

const isText = value => typeof value === 'string' && value.length > 0;
const seatOf = id => seatNumber({ seat: id });
/** A seat as the projection names it ('seat-1' … 'seat-9'), or its number: nothing else reads as one. */
const isSeat = id => (Number.isSafeInteger(id) && id >= 1 && id <= 9) || (typeof id === 'string' && /^seat-[1-9]$/.test(id));

function checkKnowledge(k) {
  if (k === null || k === undefined) return null;
  if (typeof k !== 'object') throw new TypeError('knowledge is the projection\'s knowledge, or null');
  const trio = k.insiderSeatIds ?? [];
  if (!Array.isArray(trio) || !trio.every(isSeat)) throw new TypeError('knowledge.insiderSeatIds are seats');
  const undercover = k.knownUndercoverSeatId ?? null;
  if (undercover !== null && !isSeat(undercover)) throw new TypeError('knowledge.knownUndercoverSeatId is a seat, or null');
  const scans = k.scanResults ?? [];
  if (!Array.isArray(scans)) throw new TypeError('knowledge.scanResults is a list');
  return Object.freeze({
    insiderSeatIds: Object.freeze(trio.map(seatOf)),
    knownUndercoverSeatId: undercover === null ? null : seatOf(undercover),
    scanResults: Object.freeze(scans.map((s, i) => {
      if (!s || !Number.isSafeInteger(s.round) || s.round < 0 || !isSeat(s.targetSeatId) || !FACTIONS.includes(s.guess) || typeof s.matched !== 'boolean'
        || ![true, false, null, undefined].includes(s.inCode)) throw new TypeError(`knowledge.scanResults[${i}] is { round, targetSeatId, guess, matched, inCode }`);
      // The projection's own names, with the seat as its number: checking a checked form changes nothing.
      return Object.freeze({ round: s.round, targetSeatId: seatOf(s.targetSeatId), guess: s.guess, matched: s.matched, inCode: s.inCode ?? null });
    })),
  });
}

function checkResources(list) {
  if (list === null || list === undefined) return null;
  if (!Array.isArray(list)) throw new TypeError('resources is [{ kind, value }], or null');
  const seen = new Set();
  return Object.freeze(list.map((r, i) => {
    if (!r || !Object.hasOwn(RESOURCE_KINDS, r.kind)) throw new TypeError(`resources[${i}].kind is one of ${Object.keys(RESOURCE_KINDS).join(', ')}`);
    if (seen.has(r.kind)) throw new TypeError(`resources lists ${r.kind} twice`);
    seen.add(r.kind);
    if (!isText(r.value)) throw new TypeError(`resources[${i}].value is Frontend's words`);
    return Object.freeze({ kind: r.kind, value: r.value });
  }));
}

/** The Card sheet's input, checked. */
export function checkCardSheet(input = {}) {
  const next = { ...CARD_SHEET_DEFAULTS, ...input };
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  next.interactive = next.interactive !== false;
  next.reducedMotion = !!next.reducedMotion;
  if (!VIEWS.includes(next.view)) throw new TypeError(`view is ${VIEWS.join(', ')}, not ${JSON.stringify(next.view)}`);
  next.hidden = !!next.hidden;
  if (next.card !== null && next.card !== undefined) {
    // The role card's own check: face up in the Card sheet, its back with the sheet's words.
    const { role, team, facts, character, device, art } = checkRoleCard({ ...next.card, face: 'up', back: 'sheet' });
    next.card = Object.freeze({ role, team, facts: Object.freeze([...facts]), character, device, art });
  } else next.card = null;
  next.knowledge = checkKnowledge(next.knowledge);
  next.resources = checkResources(next.resources);
  return next;
}

/**
 * The next input from the previous one and an update: each key given replaces that key's value; the rest
 * stay. This viewer's inputs are dropped while concealed, never kept for when the phone shows again, and when
 * the viewer changes, unless the same update gives the new viewer's own.
 */
export function nextCardSheetInput(previous, input) {
  const merged = { ...previous, ...input };
  const viewerChanged = 'viewer' in input && previous.viewer !== input.viewer;
  if ((merged.status ?? 'live') === 'concealed') for (const key of VIEWER_KEYS) merged[key] = CARD_SHEET_DEFAULTS[key];
  else if (viewerChanged) for (const key of VIEWER_KEYS) if (!(key in input)) merged[key] = CARD_SHEET_DEFAULTS[key];
  return checkCardSheet(merged);
}

/**
 * The Knowledge rows, from the projection's knowledge as it is: { facts: [{ id, title, value }], scans:
 * [{ id, title, sub }], empty }. Only what it holds: nothing is inferred about a role or a round.
 */
export function knowledgeRows(knowledge) {
  const k = checkKnowledge(knowledge);
  if (!k) return { facts: [], scans: [], empty: false, given: false };
  const W = CARD_SHEET_WORDS;
  const facts = [];
  if (k.knownUndercoverSeatId !== null) facts.push({ id: 'undercover', title: W.undercover, value: W.player(k.knownUndercoverSeatId) });
  if (k.insiderSeatIds.length) facts.push({ id: 'trio', title: W.trio, value: W.players(k.insiderSeatIds) });
  const scans = k.scanResults.map((s, i) => ({
    id: `scan-${i}`, title: W.scanTitle(s.round, s.targetSeatId),
    sub: [`Guess ${s.guess}`, s.matched ? W.matched : W.notMatched, s.inCode === true ? W.inCode : s.inCode === false ? W.notInCode : null].filter(Boolean).join(' · '),
  }));
  return { facts, scans, empty: facts.length === 0 && scans.length === 0, given: true };
}

/**
 * The shell's docked sheet for the Card (`shell.update({ sheet: cardSheet(input) })`): "Your role", "Only on
 * this phone", Close, no footer, and "Hide card" in the head while the card shows (a local action, as Back
 * and Close: the shell's `sheet.head`, reported by onSheetAction('hide', 'card')).
 */
export function cardSheet(input = {}) {
  const s = checkCardSheet(input);
  const showing = s.status !== 'concealed' && !s.hidden;
  return {
    id: 'card', title: CARD_SHEET_WORDS.title, sub: CARD_SHEET_WORDS.sub, back: false, close: true, detent: 'large',
    head: showing ? [{ id: 'hide', icon: 'hide', label: CARD_SHEET_WORDS.hide, enabled: true, reason: null }] : [],
    actions: [],
  };
}

/**
 * Mounts the Card sheet's content in `host` (the shell's sheetBody), which it fills. Returns { update,
 * suspend, resume, dispose, element }. Handlers: onView(view) when a part of the segmented control is tapped,
 * onShow() when the card back's Show is tapped, onFocusReturn(detail) when the focused control ended.
 */
export function mountCardSheet(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('A Card sheet needs a host element');
  const doc = host.ownerDocument;
  const kit = createKit(doc);
  const on = { onView: handlers.onView ?? null, onShow: handlers.onShow ?? null, onFocusReturn: handlers.onFocusReturn ?? null };
  let state = nextCardSheetInput(CARD_SHEET_DEFAULTS, input);
  let disposed = false, suspended = false, panelKey = null, cardKey = null;

  const root = kit.h('div', 'ms-card-sheet ms-kit', { tabindex: '-1' });
  // The card's place (the pack's .card-fit) and its host, which the role card fills.
  const fit = kit.h('div', 'ms-card-fit');
  const cardHost = kit.h('div', 'ms-card-host');
  fit.append(cardHost);
  const seg = kit.seg({ options: VIEWS.map(id => ({ id, label: CARD_SHEET_WORDS.views[id] })), value: 'card', label: CARD_SHEET_WORDS.viewsLabel, intent: 'view' });
  seg.classList.add('ms-card-views');
  const panel = kit.h('div', 'ms-card-panel');
  // The DOM's order is the pack's in every view (the card's place, the segmented control, the rows) and never
  // changes, so a focused part keeps its element as the view changes.
  root.append(fit, seg, panel);
  host.append(root);

  const accepts = () => !disposed && !suspended && state.interactive && state.status !== 'concealed';
  const policy = createControlPolicy({ root, accepts, onFocusReturn: detail => on.onFocusReturn?.(detail) });
  const onClick = event => {
    const target = event.target.closest?.('button[data-intent="view"]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts()) return;
    on.onView?.(target.dataset.value);
  };
  root.addEventListener('click', onClick);

  // The role card, mounted once and updated in place: face up with the card's words, or its back.
  const card = mountRoleCard(cardHost, { face: 'down', back: 'sheet' }, {
    onShow: () => { if (accepts()) on.onShow?.(); },
    onFocusReturn: detail => on.onFocusReturn?.(detail),
  });

  const attr = (node, name, value) => {
    if (value === null || value === undefined) { if (node.hasAttribute(name)) node.removeAttribute(name); }
    else if (node.getAttribute(name) !== String(value)) node.setAttribute(name, String(value));
  };

  function paintCard() {
    const s = state;
    const face = s.status !== 'concealed' && !s.hidden && s.card ? 'up' : 'down';
    const key = JSON.stringify([face, face === 'up' ? s.card : null, s.versions]);
    if (key !== cardKey) {
      cardKey = key;
      card.update(face === 'up' ? { ...s.card, face: 'up', back: 'sheet', versions: s.versions } : { face: 'down', back: 'sheet' });
    }
    // Show takes taps as this sheet does: the role card applies it when it draws, so it draws again here.
    card.refuseWhen(() => !accepts());
    // Without the card's words there is nothing to show face up, and no back to show either: the place stays empty.
    fit.hidden = s.status === 'concealed' || (!s.hidden && !s.card) || (!s.hidden && s.view !== 'card');
  }

  function paintSeg() {
    const s = state;
    seg.hidden = s.status === 'concealed' || s.hidden;
    kit.setSeg(seg, { options: VIEWS.map(id => ({ id, label: CARD_SHEET_WORDS.views[id] })), value: s.view, label: CARD_SHEET_WORDS.viewsLabel, intent: 'view' });
    seg.classList.add('ms-card-views');
    for (const b of seg.querySelectorAll('[data-intent="view"]')) policy.control(b, { intent: 'view' });
  }

  // The rows are information, not controls (the pack's row({ tag: 'div' })).
  const row = props => kit.row({ tag: 'div', ...props });
  function paintPanel() {
    const s = state;
    const view = s.status === 'concealed' || s.hidden ? null : s.view === 'card' ? null : s.view;
    const key = JSON.stringify([view, view === 'knowledge' ? s.knowledge : view === 'resources' ? s.resources : null]);
    if (key === panelKey) return;
    panelKey = key;
    // Removed, never only hidden: hidden or concealed, no private word stays in the page.
    const nodes = [];
    if (view === 'knowledge' && s.knowledge) {
      const k = knowledgeRows(s.knowledge);
      if (k.facts.length) nodes.push(kit.list(...k.facts.map(f => row({ icon: 'info', tint: 'paper', title: f.title, value: f.value }))));
      if (k.scans.length) nodes.push(kit.groupLabel(CARD_SHEET_WORDS.scans), kit.list(...k.scans.map(x => row({ icon: 'scan', tint: 'paper', title: x.title, sub: x.sub }))));
      if (k.empty) nodes.push(kit.groupNote(CARD_SHEET_WORDS.noKnowledge));
    } else if (view === 'resources' && s.resources?.length) {
      nodes.push(kit.list(...s.resources.map(r => row({ icon: RESOURCE_KINDS[r.kind].icon, tint: RESOURCE_KINDS[r.kind].tint, title: RESOURCE_KINDS[r.kind].title, value: r.value }))));
    }
    panel.replaceChildren(...nodes);
    panel.hidden = nodes.length === 0;
    attr(panel, 'data-panel', view);
  }

  function render() {
    if (disposed) return;
    const s = state;
    root.dataset.status = s.status;
    root.dataset.view = s.status === 'concealed' ? 'none' : s.hidden ? 'hidden' : s.view;
    attr(root, 'data-motion', s.reducedMotion ? 'reduced' : null);
    attr(root, 'aria-hidden', s.status === 'concealed' ? 'true' : null);
    if (suspended) root.dataset.suspended = ''; else delete root.dataset.suspended;
    paintCard();
    paintSeg();
    paintPanel();
  }
  function update(next = {}) {
    if (disposed) return;
    state = nextCardSheetInput(state, next);
    render();
  }
  /** Nothing of the sheet's runs by itself; suspended, it takes no taps until resumed. */
  function suspend() { if (disposed) return; suspended = true; render(); }
  function resume() { if (disposed) return; suspended = false; render(); }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeEventListener('click', onClick);
    card.dispose();
    policy.dispose();
    root.remove();
  }
  render();
  return Object.freeze({ update, suspend, resume, dispose, element: root });
}
