// Sheet 44's Roles list and "Return to lobby" (#222 item 8): runtime source, Designer's (the owner, 14 and 15
// November 2026: Designer builds each visual component once, in design/; the game and the previews use it as it
// is). The interface the Lead Designer approved on 16 November (docs/design/components/end-roles.md), drawn as the
// phone pack draws the end screen (design/phone-ui/prototype/screens-more.mjs end(); screens.css .end-list,
// .reveal-row, .team-chip and .menu-actions), in the phone shell's cover over the end scene (#271):
//   - "Roles", then a row per seat in seat order: the 34 px portrait, "4 · Dev (you)", and the role's chip with
//     its team's square; then "Original Code: Players 2, 5, 6, 9";
//   - "Return to lobby", which reports onReturnToLobby() and nothing else: no navigation, no lobby logic.
// The list and the button come with the end scene's words, on the same server clock (`showAt`, which Frontend takes
// from the scene's END_BEATS, so neither component imports the other), rising 8 px over 400 ms as the words do. A
// late phone, a phone with no clock and Reduce motion (the game's or the device's) show them at once, Reduce motion
// with one 80 ms fade, as the scene's still.
// Everything here is public at the end of a match: the projection's endReveal exists only once the match is
// FINISHED. The component works nothing out: the roles, the Code and each seat's team are the projection's, and a
// team is never mapped from a role (`teams` comes only from the projection's faction data).

import { createControlPolicy, createKit } from '../kit/kit.mjs';

export const END_ROLES_VERSION = 'end-roles-0.1.0';
/** The teams a seat's faction may take: the contract's PlanetFaction. */
export const TEAMS = Object.freeze(['Blue', 'Red', 'Alien']);
/** The pack's words (screens-more.mjs end()), and the team's words for assistive technology (the chip shows a colour). */
export const END_ROLES_WORDS = Object.freeze({
  roles: 'Roles',
  row: (n, name, you) => `${n} · ${name}${you ? ' (you)' : ''}`,
  team: team => `, ${team} team`,
  code: seats => `Original Code: Players ${seats.join(', ')}`,
  back: 'Return to lobby',
});
/** The rise of the list and the button: the end scene's words' (END_BEATS.rise), and the still's fade with Reduce motion. */
export const END_ROLES_MOTION = Object.freeze({ rise: 400, lift: 8, fade: 80 });

const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
const SEAT = /^seat-([1-9])$/;
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const isText = v => typeof v === 'string' && v.trim().length > 0;
/** A seat as the projection names it ('seat-1'…'seat-9'): the reveal's and the teams'. */
const seatNo = (id, what) => {
  const m = typeof id === 'string' ? SEAT.exec(id) : null;
  if (!m) throw new TypeError(`${what} is a seat id ('seat-1'…'seat-9'), not ${JSON.stringify(id)}`);
  return Number(m[1]);
};
/** A seat as Frontend's roster and viewer may give it: its number, or its id (as the Hacker takes them). */
const seatOf = (id, what) => (Number.isSafeInteger(id) && id >= 1 && id <= 9 ? id : seatNo(id, what));
const only = (value, keys, what) => {
  if (!plain(value)) throw new TypeError(`${what} is an object`);
  for (const k of Object.keys(value)) if (!keys.includes(k)) throw new TypeError(`${what} has no ${JSON.stringify(k)}`);
};

export const END_ROLES_DEFAULTS = Object.freeze({
  reveal: null, roster: Object.freeze([]), teams: null, window: null, clock: null, showAt: 0,
  viewer: null, safe: Object.freeze({ bottom: 0 }), clear: Object.freeze({ top: null }),
  status: 'live', interactive: true, reducedMotion: false, versions: null,
});
const KEYS = Object.freeze(Object.keys(END_ROLES_DEFAULTS));

/**
 * Checks a complete input and returns its normalised, frozen copy. Throws on anything it does not know, at every
 * level, and on a reveal that does not hold together: 7 to 9 distinct seats, each named in the roster; a Code of
 * four distinct seats among them; a team only for a revealed seat.
 */
export function checkEndRoles(input) {
  only(input, KEYS, 'The Roles list\'s input');
  const v = { ...END_ROLES_DEFAULTS, ...input };
  if (!STATUSES.includes(v.status)) throw new TypeError(`status is ${STATUSES.join(', ')}, not ${JSON.stringify(v.status)}`);
  for (const k of ['interactive', 'reducedMotion']) if (typeof v[k] !== 'boolean') throw new TypeError(`${k} is true or false`);
  if (v.versions !== null && !plain(v.versions)) throw new TypeError('versions is the match\'s versions object, or null');
  const viewer = v.viewer === null ? null : seatOf(v.viewer, 'viewer');
  only(v.safe, ['bottom'], 'safe');
  if (!finite(v.safe.bottom) || v.safe.bottom < 0) throw new TypeError('safe.bottom is the phone\'s bottom safe area in CSS px');
  only(v.clear, ['top'], 'clear');
  if (v.clear.top !== null && (!finite(v.clear.top) || v.clear.top < 0)) throw new TypeError('clear.top is where the end scene\'s title block ends, in CSS px, or null');
  if (!finite(v.showAt) || v.showAt < 0) throw new TypeError('showAt is the ms after the end phase starts when the list appears');
  if (v.window !== null) {
    only(v.window, ['id', 'startedAt'], 'window');
    // As the end scene takes it (nextEndSceneInput): the published FINISHED or ABORTED phase.
    if (!(isText(v.window.id) || finite(v.window.id))) throw new TypeError('window.id is the end phase\'s id');
    if (!finite(v.window.startedAt)) throw new TypeError('window.startedAt is the end phase\'s start, in server milliseconds');
  }
  if (v.clock !== null && typeof v.clock?.now !== 'function') throw new TypeError('clock is null, or { now() }: the match\'s trusted server time');
  if (!Array.isArray(v.roster)) throw new TypeError('roster is a list');
  const names = new Map();
  v.roster.forEach((p, i) => {
    only(p, ['seat', 'name', 'character'], `roster[${i}]`);
    const n = seatOf(p.seat, `roster[${i}].seat`);
    if (names.has(n)) throw new TypeError(`Seat ${n} is in the roster twice`);
    if (!isText(p.name)) throw new TypeError(`roster[${i}].name is the player's name`);
    const character = p.character ?? null;
    if (character !== null && !isText(character)) throw new TypeError(`roster[${i}].character is a character id, or null`);
    names.set(n, Object.freeze({ seat: p.seat, name: p.name, character }));
  });
  let reveal = null;
  if (v.reveal !== null) {
    only(v.reveal, ['roles', 'code'], 'reveal');
    const { roles, code } = v.reveal;
    if (!Array.isArray(roles) || roles.length < 7 || roles.length > 9) throw new TypeError('reveal.roles is the projection\'s 7 to 9 seats and roles');
    const seen = new Set();
    const rows = roles.map((r, i) => {
      only(r, ['seatId', 'role'], `reveal.roles[${i}]`);
      const n = seatNo(r.seatId, `reveal.roles[${i}].seatId`);
      if (seen.has(n)) throw new TypeError(`Seat ${n} is revealed twice`);
      seen.add(n);
      if (!isText(r.role)) throw new TypeError(`reveal.roles[${i}].role is the role as the projection gives it`);
      if (!names.has(n)) throw new TypeError(`Seat ${n} is revealed but not in the roster`);
      return { seat: n, seatId: r.seatId, role: r.role };
    }).sort((a, b) => a.seat - b.seat);
    if (!Array.isArray(code) || code.length !== 4) throw new TypeError('reveal.code is the four seats of the original Code');
    const codeSeats = code.map((s, i) => seatNo(s, `reveal.code[${i}]`));
    if (new Set(codeSeats).size !== 4 || !codeSeats.every(n => seen.has(n))) throw new TypeError('reveal.code is four distinct revealed seats');
    reveal = Object.freeze({ rows: Object.freeze(rows.map(Object.freeze)), code: Object.freeze([...codeSeats].sort((a, b) => a - b)) });
  }
  let teams = null;
  if (v.teams !== null) {
    if (!plain(v.teams)) throw new TypeError('teams is { [seatId]: \'Blue\' | \'Red\' | \'Alien\' }, from the projection\'s faction data, or null');
    teams = new Map();
    for (const [id, team] of Object.entries(v.teams)) {
      const n = seatNo(id, `teams key ${JSON.stringify(id)}`);
      if (!TEAMS.includes(team)) throw new TypeError(`teams[${id}] is ${TEAMS.join(', ')}, not ${JSON.stringify(team)}`);
      if (reveal && !reveal.rows.some(r => r.seat === n)) throw new TypeError(`teams names seat ${n}, which is not revealed`);
      teams.set(n, team);
    }
  }
  return Object.freeze({
    reveal, names, teams, viewer, window: v.window === null ? null : Object.freeze({ id: v.window.id, startedAt: v.window.startedAt }),
    clock: v.clock, showAt: v.showAt, safe: Object.freeze({ bottom: v.safe.bottom }), clear: Object.freeze({ top: v.clear.top }),
    status: v.status, interactive: v.interactive, reducedMotion: v.reducedMotion, versions: v.versions,
    // The input as given, for update(): each key given replaces that key.
    given: Object.freeze({ ...input }),
  });
}

/**
 * Mounts the Roles list and "Return to lobby" in `host`, the phone shell's cover (`shell.slot('cover')`), with the
 * shell edge to edge over the end scene. `input` as checkEndRoles(); handlers: onReturnToLobby(), onFocusReturn(detail).
 * Returns { element, update(partial), suspend(), resume(), dispose() }. The root fills the cover and takes no taps:
 * only the list (it scrolls) and the button do.
 */
export function mountEndRoles(host, input = {}, handlers = {}) {
  if (!host?.ownerDocument) throw new TypeError('The Roles list needs a host element: the shell\'s cover');
  const doc = host.ownerDocument;
  const kit = createKit(doc);
  let state = checkEndRoles(input);
  let disposed = false, suspended = false, timer = null;
  // What has appeared, for which end phase: a new phase is a new appearance.
  let shownFor = null;
  const root = kit.h('div', 'ms-end-roles ms-kit', { tabindex: '-1' });
  root.dataset.version = END_ROLES_VERSION;
  host.append(root);
  const accepts = () => !disposed && !suspended && state.interactive && state.status !== 'concealed';
  const policy = createControlPolicy({ root, accepts, defaultReason: () => null, onFocusReturn: detail => handlers.onFocusReturn?.(detail) });
  const uid = `ms-er-${(mountEndRoles.count = (mountEndRoles.count ?? 0) + 1)}`;
  let list = null, label = null, rows = null, note = null, actions = null, button = null;
  const rowNodes = new Map();

  const motionQuery = doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  const deviceReduced = () => !!motionQuery?.matches;
  const reduced = () => state.reducedMotion || deviceReduced();
  // An appearance is the end phase's: a new phase is a new appearance (a later showAt for the same phase is not).
  const key = () => (state.window ? `window:${state.window.id}` : 'none');
  /** Ms into the end phase on the trusted clock; null without a window or a usable clock. */
  const clockTime = () => {
    if (!state.window || !state.clock) return null;
    const now = Number(state.clock.now());
    return Number.isFinite(now) ? Math.max(0, now - state.window.startedAt) : null;
  };
  const onMotion = () => { if (!disposed) render(); };
  motionQuery?.addEventListener?.('change', onMotion);

  function onClick(event) {
    const target = event.target.closest?.('button[data-intent]');
    if (!target || !root.contains(target) || policy.refused(target) || !accepts()) return;
    if (target.dataset.intent === 'return-lobby') handlers.onReturnToLobby?.();
  }
  root.addEventListener('click', onClick);

  function empty() {
    clearTimeout(timer); timer = null;
    if (button) policy.remove(actions);
    for (const n of [list, actions]) n?.remove();
    list = label = rows = note = actions = button = null;
    rowNodes.clear();
  }

  function paintList() {
    if (!state.reveal) { if (list) { list.remove(); list = label = rows = note = null; rowNodes.clear(); } return; }
    if (!list) {
      list = kit.h('section', 'ms-er-list');
      label = kit.groupLabel(END_ROLES_WORDS.roles);
      label.classList.add('ms-er-label');
      label.id = `${uid}-label`;
      rows = kit.h('ul', 'ms-er-rows', { 'aria-labelledby': label.id });
      note = kit.groupNote('');
      note.classList.add('ms-er-note');
      list.append(label, rows, note);
      root.prepend(list);
    }
    const keep = new Set();
    for (const r of state.reveal.rows) {
      keep.add(r.seat);
      let entry = rowNodes.get(r.seat);
      if (!entry) {
        const li = kit.h('li', 'ms-er-row');
        const pt = kit.portrait(null, state.versions);
        const name = kit.h('b', 'ms-er-name');
        const chip = kit.h('span', 'ms-er-chip');
        const square = kit.h('i', 'ms-er-square', { 'aria-hidden': 'true' });
        const role = kit.h('span', 'ms-er-role');
        const team = kit.h('span', 'ms-k-vh');
        chip.append(square, role, team);
        li.append(pt, name, chip);
        entry = { li, pt, name, chip, role, team };
        rowNodes.set(r.seat, entry);
      }
      const person = state.names.get(r.seat);
      kit.setPortrait(entry.pt, person, state.versions);
      kit.text(entry.name, END_ROLES_WORDS.row(r.seat, person.name, state.viewer === r.seat));
      kit.text(entry.role, r.role);
      const team = state.teams?.get(r.seat) ?? null;
      kit.attr(entry.chip, 'data-team', team);
      kit.text(entry.team, team ? END_ROLES_WORDS.team(team) : '');
      rows.append(entry.li);
    }
    for (const [seat, entry] of rowNodes) if (!keep.has(seat)) { entry.li.remove(); rowNodes.delete(seat); }
    kit.text(note, END_ROLES_WORDS.code(state.reveal.code));
  }

  function paintActions() {
    // The shared display (no viewer) has no lobby to return to: no button there.
    if (state.viewer === null) { if (actions) { policy.remove(actions); actions.remove(); actions = button = null; } return; }
    if (!actions) {
      actions = kit.h('div', 'ms-er-actions');
      button = kit.button({ label: END_ROLES_WORDS.back, kind: 'secondary', icon: 'leave', block: true, intent: 'return-lobby' });
      actions.append(button);
      root.append(actions);
    }
    policy.control(button, { intent: 'return-lobby' });
  }

  /**
   * The appearance, once per end phase: with the scene's words at `showAt` on the trusted clock, rising; at once
   * when the phone is late or has no clock; at once with the 80 ms fade under Reduce motion. Stale or suspended
   * before then, it waits as the scene stands still, and the clock is read again when it is live.
   */
  function appear() {
    clearTimeout(timer); timer = null;
    const parts = [list, actions].filter(Boolean);
    const show = how => {
      shownFor = key();
      for (const p of parts) { p.hidden = false; kit.attr(p, 'data-appear', how); }
    };
    if (shownFor === key()) { for (const p of parts) p.hidden = false; return; }
    for (const p of parts) p.hidden = true;
    const t = clockTime();
    if (t === null) { show(null); return; }
    if (reduced()) { show('fade'); return; }
    if (t >= state.showAt) { show(null); return; }
    if (state.status !== 'live' || suspended) return;
    // The words' moment, on the trusted clock. A timer that fires early waits out the rest (to within a millisecond)
    // and still rises; one that fires late rises too: it is the words' moment, as the scene draws it.
    const wait = ms => {
      timer = setTimeout(() => {
        timer = null;
        if (disposed || suspended || state.status !== 'live' || shownFor === key()) return;
        const now = clockTime();
        if (now !== null && state.showAt - now > 1) { wait(state.showAt - now); return; }
        show('rise');
      }, ms);
    };
    wait(state.showAt - t);
  }

  function render() {
    if (disposed) return;
    root.dataset.status = state.status;
    kit.attr(root, 'data-motion', state.reducedMotion ? 'reduced' : null);
    kit.attr(root, 'aria-hidden', state.status === 'concealed' ? 'true' : null);
    root.style.setProperty('--ms-er-safe-b', `${state.safe.bottom}px`);
    if (state.clear.top === null) root.style.removeProperty('--ms-er-clear'); else root.style.setProperty('--ms-er-clear', `${state.clear.top}px`);
    if (suspended) root.dataset.suspended = ''; else delete root.dataset.suspended;
    // Concealed: nothing is drawn or named. The public inputs are kept, and drawn again when live.
    if (state.status === 'concealed') { empty(); return; }
    // A new end phase is a new appearance, from the top of the list.
    if (shownFor !== null && shownFor !== key()) { shownFor = null; if (list) list.scrollTop = 0; }
    paintList();
    paintActions();
    appear();
  }

  function update(next = {}) {
    if (disposed) return;
    state = checkEndRoles({ ...state.given, ...next });
    render();
  }
  function suspend() { if (disposed) return; suspended = true; clearTimeout(timer); timer = null; render(); }
  function resume() { if (disposed) return; suspended = false; render(); }
  function dispose() {
    if (disposed) return;
    clearTimeout(timer); timer = null;
    if (actions) policy.remove(actions);
    disposed = true;
    motionQuery?.removeEventListener?.('change', onMotion);
    root.removeEventListener('click', onClick);
    policy.dispose();
    root.remove();
  }
  render();
  return Object.freeze({ update, suspend, resume, dispose, element: root });
}
