// The private talk: the game's Standard Hack (REQUEST_HACK, DECLARE_HACK_SIDE) on the two talking phones, as the
// phone pack draws it on sheet 25 (design/phone-ui/prototype/screens-more.mjs talk()), with the Lead Designer's
// decisions D1–D8 of 16 November 2026 (#293, posted on #4). Runtime source, Designer's (the owner, 14 and 15
// November 2026: Designer builds each visual component once, in design/; and 16 November: Designer builds each
// part once the Lead approves its interface). The interface is docs/design/components/private-talk.md.
//
// The three steps (the confirmed overlay rules/overlays/declared-hack-owner-decision-2026-10-12.json):
//   - declare (HACK_DECLARE, up to 15 s): mountDeclare() in the shell's sheet body on the target's phone, with
//     declareSheet(); on the initiator's, mountTalkWait() with waitSheet(), only while its view says it waits (D1);
//   - the claim (HACK_RESULT, 5 s): mountClaim() on either phone of the pair, with claimSheet() (D2, D3);
//   - talk (HACK, 60 s): mountCapsule() in the shell's stage, the two seated (D5).
// talkBar() gives the shell's pair bar its words in every step.
//
// Privacy (HACK-DECLARE-02 and 04; the Lead's review of 16 November): each part is told who the two people are
// (`partner`, who asked, and `declarer`, who declares, from the public hackSession) and draws only for its own
// viewer among them: declare for the declarer, the wait for the partner, the claim for the one its `view` names,
// the capsule for either. For anyone else, a concealed phone, or a new viewer until it is given its inputs again,
// every part is empty and holds none of this viewer's inputs, so only the shell's pair bar is left. The locked
// cards and "Not for your role" are drawn on the declarer's phone only. No side and no claim is written to an
// attribute, the console or a callback other than onSide: a card is told apart by its place, and a side's art is
// drawn hidden from assistive technology, its word being the card's own text.

import { createControlPolicy, createKit, seatNumber } from '../kit/kit.mjs';
import { createPlayParts } from '../play-parts/play-parts.mjs';
import { HACK_ART } from '../../../../apps/game/hosted/scene-drawing/phone-kit-art.mjs';
import { CAPSULE_SEATS, CAPSULE_SIZE, capsuleTargets, frameCapsule } from '../../../../apps/game/hosted/board-v2-drawing/capsule-scene.mjs';
import { sittingPose, statusOf } from '../../../../apps/game/hosted/board-v2-drawing/capsule-figures.mjs';
import { FRAME } from '../../../../apps/game/hosted/scene-drawing/body.mjs';
import { crewFigureSvg, disposeCrewMounts, outfitFor, paintCrewFigure, releaseCrewFigure, setCrewMountActivity, setCrewMountMotion }
  from '../../../../apps/game/hosted/crew-runtime.mjs';
import { SKY_EPOCH, ambientLayer } from '../room-scene/ambient.mjs';

export const PRIVATE_TALK_VERSION = 'private-talk-0.1.0';
/** The sides, in the order the three cards are drawn (the contract's PlanetFaction). */
export const SIDES = Object.freeze(['Blue', 'Red', 'Alien']);
const SIDE_ART = Object.freeze({ Blue: 'hack-side-blue', Red: 'hack-side-red', Alien: 'hack-side-alien' });
const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
const PHASES = Object.freeze(['declare', 'claim', 'talk']);
const VIEWS = Object.freeze(['declarer', 'initiator']);
/** The capsule's pictures (the board's board-v2-art bundle, as room-drawing-1.0.0 redraws them) and their stacking. */
export const CAPSULE_LAYERS = Object.freeze([
  Object.freeze({ id: 'back', z: 0, property: '--board-v2-art-capsule-back' }),
  Object.freeze({ id: 'door', z: 100, property: '--board-v2-art-capsule-door-0' }),
  Object.freeze({ id: 'busy', z: 3000, property: '--board-v2-art-capsule-busy' }),
]);

/** The pack's words (screens-more.mjs talk()), and the Lead's for the states the pack does not draw (D1–D3). */
export const TALK_WORDS = Object.freeze({
  title: 'Private talk',
  declare: 'Declare your side',
  asked: name => `${name} asked to talk`,
  askedSub: 'Declare a side. It is a claim, not a check.',
  sidesLabel: 'Side to declare',
  notForRole: 'Not for your role',
  own: s => `Your role declares its own side: ${s}. Only you see this.`,
  any: 'Your role may claim any side. Only you see this.',
  declareSide: s => `Declare ${s}`,
  declareNone: 'Declare a side',
  seesClaim: name => `${name} sees your claim`,
  claimOf: name => `${name}’s claim`,
  claims: (name, s) => `${name} claims ${s}`,
  noSide: 'No side declared',
  onlyPartner: name => `Unverified · only ${name} sees this`,
  onlyYou: 'Unverified · only you see this',
  choosing: name => `${name} is choosing a side`,
  you: 'You',
  stale: 'Controls return when the match is current',
  bar: Object.freeze({ declare: 'Private talk · declare', claim: 'Private talk · claim', talk: 'Private talk' }),
});

const isText = value => typeof value === 'string' && value.length > 0;
const isSeat = id => (Number.isSafeInteger(id) && id >= 1 && id <= 9) || (typeof id === 'string' && /^seat-[1-9]$/.test(id));
const seatOf = id => seatNumber({ seat: id });
const optionalText = (value, what) => {
  if (value !== null && value !== undefined && typeof value !== 'string') throw new TypeError(`${what} is text, or null`);
  return value === '' ? null : value ?? null;
};
/** A person as the parts take one: the seat as the projection names it (4 or 'seat-4'), the name, the character. */
function person(p, what, { board = false } = {}) {
  if (p === null || p === undefined) return null;
  if (typeof p !== 'object' || !isSeat(p.seat) || !isText(p.name)) {
    throw new TypeError(`${what} is { seat, name, character${board ? ', health, location, jailed' : ''} }, or null`);
  }
  return Object.freeze({ seat: seatOf(p.seat), name: p.name, character: p.character ?? null,
    ...(board ? { health: optionalText(p.health, `${what}.health`), location: optionalText(p.location, `${what}.location`), jailed: !!p.jailed } : {}) });
}
const side = (value, what) => {
  if (value === null || value === undefined) return null;
  if (!SIDES.includes(value)) throw new TypeError(`${what} is ${SIDES.join(', ')}, or null`);
  return value;
};
/** The two people, when both are given: never one person twice. */
function checkTwo(next) {
  next.partner = person(next.partner, 'partner');
  next.declarer = person(next.declarer, 'declarer');
  if (next.partner && next.declarer && next.partner.seat === next.declarer.seat) throw new TypeError('partner and declarer are two people');
  return next;
}

// ── Inputs ──────────────────────────────────────────────────────────────
const COMMON = Object.freeze({ viewer: null, status: 'live', interactive: true, reducedMotion: false, versions: null });
function checkCommon(next) {
  if (!STATUSES.includes(next.status)) throw new TypeError(`Status is ${STATUSES.join(', ')}, not ${JSON.stringify(next.status)}`);
  next.interactive = next.interactive !== false;
  next.reducedMotion = !!next.reducedMotion;
  if (next.viewer !== null && next.viewer !== undefined && !isSeat(next.viewer)) throw new TypeError('viewer is a seat, or null');
  // The seat's number, so a viewer given as 'seat-4' or 4 is the same viewer.
  next.viewer = next.viewer === null || next.viewer === undefined ? null : seatOf(next.viewer);
}
/** A part's inputs: its defaults, which of them are this viewer's own, and its check (as Actions' parts). */
function part(defaults, viewerKeys, check) {
  const known = new Set(Object.keys(defaults));
  const normalize = input => {
    for (const key of Object.keys(input)) if (!known.has(key)) throw new TypeError(`Unknown input ${JSON.stringify(key)}`);
    const next = { ...defaults, ...input };
    checkCommon(next);
    return Object.freeze(check(next));
  };
  /** Each key an update gives replaces that key; this viewer's own are dropped while concealed, and for a new viewer unless given. */
  const merge = (previous, input) => {
    for (const key of Object.keys(input)) if (!known.has(key)) throw new TypeError(`Unknown input ${JSON.stringify(key)}`);
    const merged = { ...previous, ...input };
    const viewerChanged = 'viewer' in input && previous.viewer !== (input.viewer === null || input.viewer === undefined ? null : seatOf(input.viewer));
    if ((merged.status ?? 'live') === 'concealed') for (const key of viewerKeys) merged[key] = defaults[key];
    else if (viewerChanged) for (const key of viewerKeys) if (!(key in input)) merged[key] = defaults[key];
    return normalize(merged);
  };
  return { normalize, merge };
}

/** Declare's inputs (HACK_DECLARE; frames 1 and 2): the two people, the offer's `declaredSides`, the choice so far. */
export const DECLARE_DEFAULTS = Object.freeze({ ...COMMON, partner: null, declarer: null, sides: Object.freeze([]), selected: null });
const DECLARE = part(DECLARE_DEFAULTS, ['partner', 'declarer', 'sides', 'selected'], next => {
  if (!Array.isArray(next.sides) || !next.sides.every(x => SIDES.includes(x)) || new Set(next.sides).size !== next.sides.length) {
    throw new TypeError(`sides is the offer's declaredSides: distinct sides, each ${SIDES.join(', ')}`);
  }
  const sides = Object.freeze([...next.sides]);
  const selected = side(next.selected, 'selected');
  if (selected !== null && !sides.includes(selected)) throw new TypeError('selected is one of the offered sides, or null');
  return { ...checkTwo(next), sides, selected };
});
export const checkDeclare = input => DECLARE.normalize(input);
export const nextDeclareInput = (current, partial) => DECLARE.merge(current, partial);

/** The claim's inputs (HACK_RESULT; frame 3, D2, D3): whose phone this is, the two people, the side or null. */
export const CLAIM_DEFAULTS = Object.freeze({ ...COMMON, view: null, partner: null, declarer: null, claim: null });
const CLAIM = part(CLAIM_DEFAULTS, ['view', 'partner', 'declarer', 'claim'], next => {
  if (next.view !== null && !VIEWS.includes(next.view)) throw new TypeError(`view is ${VIEWS.join(' or ')}, or null`);
  return { ...checkTwo(next), claim: side(next.claim, 'claim') };
});
export const checkClaim = input => CLAIM.normalize(input);

/** The initiator's wait (HACK_DECLARE; D1): the two people. Frontend mounts it only while the view says it waits (Q1). */
export const WAIT_DEFAULTS = Object.freeze({ ...COMMON, partner: null, declarer: null });
const WAIT = part(WAIT_DEFAULTS, ['partner', 'declarer'], next => checkTwo(next));
export const checkWait = input => WAIT.normalize(input);

/** The capsule's inputs (HACK; frame 4, D5): the pair from the public board, the stage's size, the game's clock. */
export const CAPSULE_DEFAULTS = Object.freeze({ ...COMMON, pair: null, size: Object.freeze({ width: 390, height: 640 }), clock: null });
const CAPSULE = part(CAPSULE_DEFAULTS, ['pair'], next => {
  let pair = null;
  if (next.pair !== null && next.pair !== undefined) {
    if (!Array.isArray(next.pair) || next.pair.length !== 2) throw new TypeError('pair is [initiator, target], from hackSession, or null');
    pair = Object.freeze(next.pair.map((p, i) => person(p, `pair[${i}]`, { board: true })));
    if (pair.some(p => p === null) || pair[0].seat === pair[1].seat) throw new TypeError('pair is two people');
  }
  const size = next.size;
  if (!size || !(size.width > 0) || !(size.height > 0)) throw new TypeError('size is the stage\'s { width, height }, both above 0');
  if (next.clock !== null && typeof next.clock?.now !== 'function') throw new TypeError('clock is { now() }, or null');
  return { ...next, pair, size: Object.freeze({ width: size.width, height: size.height }) };
});
export const checkCapsule = input => CAPSULE.normalize(input);

/** This viewer among the two: the declarer, or the partner (who asked). Neither, for anyone else or with one of them missing. */
const isDeclarer = s => s.viewer !== null && s.declarer !== null && s.partner !== null && s.viewer === s.declarer.seat;
const isPartner = s => s.viewer !== null && s.declarer !== null && s.partner !== null && s.viewer === s.partner.seat;

// ── The shell's frames and words ────────────────────────────────────────
/** Declare's sheet: "Declare your side", no close; "Declare Blue", busy while it sends, off until a side is chosen. */
export function declareSheet({ selected = null, phase = 'ready' } = {}) {
  side(selected, 'selected');
  if (!['ready', 'sending'].includes(phase)) throw new TypeError('phase is ready or sending');
  const sending = phase === 'sending';
  return { id: 'talk-declare', title: TALK_WORDS.declare, close: false, actions: [
    { id: 'declare', label: selected ? TALK_WORDS.declareSide(selected) : TALK_WORDS.declareNone, icon: 'declare', kind: 'primary', busy: sending, enabled: sending || selected !== null },
  ] };
}
/** The claim's sheet: "Ava sees your claim" on the declarer's phone, "Dev’s claim" on the initiator's (D2); no footer, no close. */
export function claimSheet({ view, partner, declarer }) {
  if (!VIEWS.includes(view)) throw new TypeError(`view is ${VIEWS.join(' or ')}`);
  const p = person(partner, 'partner'), d = person(declarer, 'declarer');
  if (!p || !d) throw new TypeError('The claim\'s sheet names the two people');
  return { id: 'talk-claim', title: view === 'declarer' ? TALK_WORDS.seesClaim(p.name) : TALK_WORDS.claimOf(d.name), close: false, actions: [] };
}
/** The initiator's wait (D1): "Private talk", no footer, no close. */
export function waitSheet() {
  return { id: 'talk-wait', title: TALK_WORDS.title, close: false, actions: [] };
}
/**
 * The shell's pair bar: the two people (initiator first), "Private talk · declare", "Private talk · claim" or
 * "Private talk", and the time left, which Frontend works out from the phase's deadline as for every bar.
 */
export function talkBar({ phase, pair, remainingMs = null, round = null, promises = { count: 0 }, menu = {} }) {
  if (!PHASES.includes(phase)) throw new TypeError(`phase is ${PHASES.join(', ')}`);
  if (!Array.isArray(pair) || pair.length !== 2) throw new TypeError('A pair bar names the two people talking: [initiator, target]');
  const people = pair.map((p, i) => person(p, `pair[${i}]`));
  if (people.some(p => p === null) || people[0].seat === people[1].seat) throw new TypeError('A pair bar names two people');
  const bar = { kind: 'pair', pair: people.map(({ seat, name, character }) => ({ seat, name, character })), sub: TALK_WORDS.bar[phase], round, promises, menu };
  if (remainingMs !== null) bar.timer = { remainingMs: Math.max(0, remainingMs) };
  return bar;
}

// ── Mounting ────────────────────────────────────────────────────────────
/** What every part shares: its root, the kit, the parts, the control policy, and its lifecycle (as Actions'). */
function mountPart(host, name, model, input, handlers, paint, className = 'ms-private-talk ms-kit') {
  if (!host?.ownerDocument) throw new TypeError(`${name} needs a host element`);
  const doc = host.ownerDocument;
  const kit = createKit(doc), parts = createPlayParts(doc);
  let state = model.merge(model.normalize({}), input);
  let disposed = false, suspended = false;
  const root = kit.h('div', className, { tabindex: '-1', 'data-part': name });
  host.append(root);
  const accepts = () => !disposed && !suspended && state.interactive && state.status === 'live';
  const policy = createControlPolicy({ root, accepts,
    defaultReason: () => (state.status === 'stale' ? TALK_WORDS.stale : null),
    onFocusReturn: detail => handlers.onFocusReturn?.(detail) });
  const painter = paint({ doc, kit, parts, root, policy, isSuspended: () => suspended });
  const onClick = event => {
    const target = event.target.closest?.('button[data-intent]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts()) return;
    painter.tap?.(target);
  };
  root.addEventListener('click', onClick);
  function render(standing = NaN) {
    if (disposed) return;
    root.dataset.status = state.status;
    kit.attr(root, 'data-motion', state.reducedMotion ? 'reduced' : null);
    kit.attr(root, 'aria-hidden', state.status === 'concealed' || painter.decorative ? 'true' : null);
    if (suspended) root.dataset.suspended = ''; else delete root.dataset.suspended;
    painter.paint(state, standing);
  }
  function update(next = {}) {
    if (disposed) return;
    const standing = painter.standing?.() ?? NaN;
    state = model.merge(state, next);
    render(standing);
  }
  /** Suspended, a part takes no taps and the capsule stands still, until resumed. */
  function suspend() { if (disposed) return; const standing = painter.standing?.() ?? NaN; suspended = true; render(standing); }
  function resume() { if (disposed) return; suspended = false; render(); }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeEventListener('click', onClick);
    painter.dispose?.();
    policy.dispose();
    root.remove();
  }
  render();
  return Object.freeze({ update, suspend, resume, dispose, element: root });
}

/** A side card's art, or the blank card for no declaration (HACK_ART, the game's own). */
const artFor = s => HACK_ART[s ? SIDE_ART[s] : 'hack-side-none']();

/**
 * Declare (HACK_DECLARE; frames 1 and 2), on the declarer's phone only: who asked, "Ava asked to talk"
 * and "Declare a side. It is a claim, not a check."; the three side cards as one radio group, the sides the offer
 * leaves out locked with "Not for your role"; and the line under them. Handlers: onSide(side), for an offered
 * card; onFocusReturn(detail). While "Declare Blue" sends, Frontend passes `interactive: false`.
 */
export function mountDeclare(host, input = {}, handlers = {}) {
  return mountPart(host, 'declare', DECLARE, input, handlers, ({ kit, parts, root, policy }) => {
    let who = null, group = null, note = null;
    const cards = [];
    const clear = () => {
      // Emptied, not hidden: no card, name, lock or line stays in the page.
      for (const card of cards) policy.remove(card);
      cards.length = 0;
      for (const n of [who, group, note]) n?.remove();
      who = group = note = null;
    };
    return {
      // A card is told apart by its place (1 to 3), never by its side.
      tap: target => { if (target.dataset.intent === 'side') handlers.onSide?.(SIDES[Number(target.dataset.value) - 1]); },
      paint: s => {
        if (s.status === 'concealed' || !isDeclarer(s) || !s.sides.length) { clear(); return; }
        const props = { people: [s.partner], title: TALK_WORDS.asked(s.partner.name), sub: TALK_WORDS.askedSub, versions: s.versions };
        if (!who) { who = parts.who(props); root.prepend(who); } else parts.setWho(who, props);
        if (!group) {
          group = kit.h('div', 'ms-pt-sides', { role: 'radiogroup', 'aria-label': TALK_WORDS.sidesLabel });
          SIDES.forEach((x, i) => {
            const card = parts.tile({ art: artFor(x), name: x, intent: 'side', value: i + 1, label: false });
            card.setAttribute('role', 'radio');
            cards.push(card);
            group.append(card);
          });
          who.after(group);
        }
        SIDES.forEach((x, i) => {
          const card = cards[i], offered = s.sides.includes(x), chosen = offered && s.selected === x;
          parts.setTile(card, { art: artFor(x), name: x, note: offered ? null : TALK_WORDS.notForRole, noteIcon: offered ? null : 'lock',
            state: !offered ? 'unavailable' : chosen ? 'selected' : 'available', intent: 'side', value: i + 1, label: false });
          kit.attr(card, 'aria-checked', String(chosen));
          policy.control(card, { intent: 'side', off: !offered });
        });
        // One side offered: the role's own; all three: any. Two would be neither, so no line is drawn then.
        const line = s.sides.length === 1 ? TALK_WORDS.own(s.sides[0]) : s.sides.length === SIDES.length ? TALK_WORDS.any : null;
        if (line && !note) { note = kit.groupNote(line); note.classList.add('ms-pt-note'); group.after(note); }
        else if (line) kit.text(note, line);
        else { note?.remove(); note = null; }
      },
      dispose: clear,
    };
  });
}

/**
 * The claim (HACK_RESULT; frame 3, D2, D3), on the phone its view names: the declarer's portrait, "Dev claims
 * Blue" or "No side declared", "Unverified · only Ava sees this" (the declarer's phone) or "Unverified ·
 * only you see this" (the initiator's), and the side card, or the blank card. A status, read when it opens.
 */
export function mountClaim(host, input = {}, handlers = {}) {
  return mountPart(host, 'claim', CLAIM, input, handlers, ({ kit, parts, root }) => {
    let box = null, who = null, card = null, cardArt = null;
    const clear = () => { box?.remove(); box = who = card = null; cardArt = null; };
    return {
      paint: s => {
        const mine = s.view === 'declarer' ? isDeclarer(s) : s.view === 'initiator' ? isPartner(s) : false;
        if (s.status === 'concealed' || !mine) { clear(); return; }
        const d = s.declarer;
        const props = { people: [d], title: s.claim ? TALK_WORDS.claims(d.name, s.claim) : TALK_WORDS.noSide,
          sub: s.view === 'declarer' ? TALK_WORDS.onlyPartner(s.partner.name) : TALK_WORDS.onlyYou, versions: s.versions };
        if (!box) {
          box = kit.h('div', 'ms-pt-claim', { role: 'status' });
          who = parts.who(props);
          card = kit.h('span', 'ms-pt-card', { 'aria-hidden': 'true' });
          box.append(who, card);
          root.prepend(box);
        } else parts.setWho(who, props);
        const art = artFor(s.claim);
        if (art !== cardArt) { card.innerHTML = art; cardArt = art; }
      },
      dispose: clear,
    };
  });
}

/** The initiator's wait (HACK_DECLARE; D1), on the partner's phone only: the declarer's portrait and "Dev is choosing a side". */
export function mountTalkWait(host, input = {}, handlers = {}) {
  return mountPart(host, 'wait', WAIT, input, handlers, ({ kit, root }) => {
    let block = null, face = null;
    const clear = () => { block?.remove(); block = face = null; };
    return {
      paint: s => {
        if (s.status === 'concealed' || !isPartner(s)) { clear(); return; }
        if (!face) face = kit.portrait(s.declarer, s.versions); else kit.setPortrait(face, s.declarer, s.versions);
        const props = { lead: face, title: TALK_WORDS.choosing(s.declarer.name) };
        if (!block) { block = kit.wait(props); root.prepend(block); } else kit.setWait(block, props);
        // The kit's setter names the block; this one is also the wait's own, for its place in the sheet.
        block.classList.add('ms-pt-wait');
      },
      dispose: clear,
    };
  });
}

const [bx, by, box] = FRAME.box;
const [ax, ay] = FRAME.anchor;

/**
 * The capsule (HACK; frame 4, D5), on the pair's two phones only, mounted in the shell's stage and sized as it:
 * the cabin with its door shut and its light lit, the two seated at the table (the lower seat on the left, as the
 * board seats them), the lamps, keys and dust (the room scene's ambient, on the game's clock), and each one's
 * name tag, "You" on this phone's. Nothing in it is a control, so assistive technology skips it: the shell's pair
 * bar names the two.
 */
export function mountCapsule(host, input = {}, handlers = {}) {
  return mountPart(host, 'capsule', CAPSULE, input, handlers, ({ doc, kit, root, isSuspended }) => {
    const layers = new Map(), people = new Map();
    let amb = null, frameKey = null, ambientLive = false, heldMs = null, seq = 0;
    const animations = () => (amb?.getAnimations?.({ subtree: true }) ?? []);
    const release = () => {
      for (const entry of people.values()) { releaseCrewFigure(root, entry.figure); entry.group.remove(); }
      people.clear();
      for (const layer of layers.values()) layer.remove();
      layers.clear();
      amb?.remove(); amb = null; frameKey = null; ambientLive = false; heldMs = null;
    };
    /**
     * The ambient runs on the game's clock while the capsule is current, in motion and has a clock, as the room
     * scene's does; otherwise it stands at one moment: where it stood, or the clock's, or 0 s.
     */
    function settle(s, rebuilt, standing) {
      const deviceReduced = !!doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const live = !isSuspended() && s.status === 'live' && !s.reducedMotion && !deviceReduced && s.clock !== null;
      const list = animations();
      if (live) {
        if (!ambientLive || rebuilt) { const ms = s.clock.now() - SKY_EPOCH; for (const a of list) { a.currentTime = ms; a.play(); } }
        heldMs = null;
      } else {
        const stopping = ambientLive || heldMs === null;
        if (heldMs === null) heldMs = Number.isFinite(standing) ? standing : s.clock ? s.clock.now() - SKY_EPOCH : 0;
        if (stopping || rebuilt || list.some(a => a.currentTime !== heldMs || a.playState !== 'paused')) for (const a of list) { a.currentTime = heldMs; a.pause(); }
      }
      ambientLive = live;
      setCrewMountMotion(root, s.reducedMotion);
      setCrewMountActivity(root, !isSuspended() && s.status === 'live');
    }
    return {
      decorative: true,
      // Where the running ambient stands, read before an update can rebuild it.
      standing: () => (ambientLive ? Number(animations()[0]?.currentTime) : NaN),
      paint: (s, standing) => {
        const mine = s.viewer !== null && s.pair !== null && s.pair.some(p => p.seat === s.viewer);
        if (s.status === 'concealed' || !mine) { release(); Object.assign(root.style, { width: '0px', height: '0px' }); return; }
        const panel = s.size, frame = frameCapsule(panel);
        Object.assign(root.style, { width: `${panel.width}px`, height: `${panel.height}px` });
        // The cabin's pictures, on the properties the game's bundles define.
        const place = { left: `${frame.tx}px`, top: `${frame.ty}px`, width: `${CAPSULE_SIZE[0] * frame.k}px`, height: `${CAPSULE_SIZE[1] * frame.k}px` };
        for (const { id, z, property } of CAPSULE_LAYERS) {
          let layer = layers.get(id);
          if (!layer) {
            layer = kit.h('span', 'ms-pt-layer');
            layer.dataset.layer = id;
            layer.style.setProperty('--ms-pt-art', `var(${property})`);
            layers.set(id, layer);
            root.append(layer);
          }
          Object.assign(layer.style, place, { zIndex: String(z) });
        }
        // The lamps, the keys and the dust, rebuilt when the frame changes.
        const key = JSON.stringify([frame.k, frame.tx, frame.ty]);
        const rebuilt = key !== frameKey;
        if (rebuilt) { amb?.remove(); amb = ambientLayer('capsule', frame); frameKey = key; if (amb) root.append(amb); }
        // The two seated, the lower seat number at P1 (the left), as the board's capsule seats them.
        const seated = [...s.pair].sort((a, b) => a.seat - b.seat);
        const targets = capsuleTargets(panel);
        seated.forEach((p, i) => {
          const anchor = CAPSULE_SEATS[i];
          let entry = people.get(p.seat);
          if (!entry) {
            const group = kit.h('span', 'ms-pt-person');
            const figure = kit.h('span', 'ms-pt-fig', { 'aria-hidden': 'true' });
            figure.dataset.part = 'body';
            const tag = kit.h('span', 'ms-pt-tag');
            tag.append(kit.h('b', 'ms-pt-tag-num'), kit.h('span', 'ms-pt-tag-name'));
            group.append(figure, tag);
            root.append(group);
            entry = { group, figure, tag, key: null };
            people.set(p.seat, entry);
          }
          const sk = sittingPose('sit', statusOf({ health: p.health, jailed: p.jailed, room: p.location === 'Jail' ? 'jail' : '' }));
          const unit = anchor.scale * frame.k;
          Object.assign(entry.figure.style, { left: `${frame.tx + anchor.at[0] * frame.k - (ax - bx) * unit}px`, top: `${frame.ty + anchor.at[1] * frame.k - (ay - by) * unit}px`,
            width: `${box * unit}px`, height: `${box * unit}px`, zIndex: '500', transform: anchor.mirror ? 'scaleX(-1)' : '', transformOrigin: `${((ax - bx) / box) * 100}% 0` });
          const outfit = outfitFor(p.location);
          const figureKey = JSON.stringify([p.character, outfit, p.health, p.jailed, s.versions]);
          if (entry.key !== figureKey) {
            const drawn = paintCrewFigure(root, entry.figure, s.versions, p.character, sk, { outfit, layer: 'body', gesture: 'capsule-sit', still: false, seat: p.seat,
              point: [sk.head[0] + anchor.at[0] / anchor.scale, sk.head[1] + anchor.at[1] / anchor.scale], mirror: anchor.mirror, cacheTemplate: true });
            // A match pinned before the crew release: the crew it was drawn with, still.
            if (!drawn) entry.figure.innerHTML = crewFigureSvg(p.character, sk, { versions: s.versions, outfit, layer: 'body', prefix: `pt${++seq}` }) ?? '';
            entry.key = figureKey;
          }
          // The tag under the chest (the pack's paintCapsule()), "You" on this phone's own.
          const t = targets[i], self = p.seat === s.viewer;
          kit.text(entry.tag.firstChild, String(p.seat));
          kit.text(entry.tag.lastChild, self ? TALK_WORDS.you : p.name);
          kit.attr(entry.tag, 'data-self', self ? '' : null);
          Object.assign(entry.tag.style, { left: `${t.left + t.side / 2}px`, top: `${Math.min(panel.height - 30, t.top + t.side + 2)}px` });
        });
        settle(s, rebuilt, standing);
      },
      dispose: () => { release(); disposeCrewMounts(root); },
    };
  }, 'ms-private-talk ms-pt-capsule ms-kit');
}
