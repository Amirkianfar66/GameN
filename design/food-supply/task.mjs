// mothership:dev-only
//
// The Food Supply Task: what the crane in the Supply Room does with each participant's input, in
// time. A design reference for the owner, Frontend, Backend and Game Balance (11 November 2026), in
// no release: the server decides every outcome, and this module only fixes the design's geometry,
// timing and cause and effect so that the storyboards, the phones, the handoff and its tests agree.
// It is not the engine and it decides nothing for a match.
//
// The owner's confirmed rules it follows (docs/design/owner-decisions.md, 11 November 2026):
//  - Two participants: a Volunteer and the Partner they select. One controls vertical movement,
//    the other horizontal movement.
//  - Either can betray the other with the same control: the vertical one by dropping the crate
//    onto the other player, the horizontal one by driving a moving panel into them. There is no
//    attack button, trigger, confirmation or armed mode, and no escape. An unblocked attack is
//    lethal and does not send its victim to Hospital. Protection applies.
//  - A kill on the Task is not an attack, because it can be a mistake: it uses no attack
//    opportunity, and nothing limits how often a player kills on Tasks (the owner, 12 November).
//  - The safety catch sometimes saves by luck: an unprotected participant is saved one time in
//    four, looking exactly as a Protection block looks, so a stop never proves Protection (the owner,
//    12 November).
//  - After a partner dies, the survivor can complete the delivery alone if the crate is in the
//    correct position; otherwise the Task is lost. A disconnect cancels the Task.
//  - A delivery adds five packages to the food stock.
//
// The owner's crane (the same day): the vertical operator's cab is to the right of the platform
// where the crate should land; the horizontal operator works a locking panel that moves fast left
// and right and must be locked in the correct position, and locked at the other operator's place,
// by mistake or not, it cuts them; the crate swings like a pendulum, so lowering it without killing
// the partner takes attention.
//
// The design (docs/design/food-supply.md): a rail across the top of the Supply Room with seven
// stops (0 to 6 here, painted 1 to 7). The intake hatch is under stop 1, the Panel operator's
// console under stop 5, the galley lift's landing platform under stop 6, and the Winch operator's
// cab hangs under the rail at stop 7. The locking panel rides the rail with the crate's hoist on it.
//  - The Winch (vertical): one button, Hold (the owner, 13 November 2026: "hold and release"). The
//    finger down on it (raise) lifts the crate out of the intake hatch, with the panel locked over the
//    hatch, and keeps it up for as long as the finger stays; the finger off it (lower) lets it fall.
//  - The Panel (horizontal): RELEASE sets the panel clicking from stop to stop, end to end and back:
//    a fast snap to the next stop, then a short rest there (the owner, 12 November 2026: "click stop
//    to stop"; twice as fast, 13 November). LOCK drops its blade at the stop it rests at, or at the
//    stop it is snapping to. At stop 7 the blade drops into the Winch operator's cab: the cut.
//  - A lock with the crate hanging sets it swinging like a pendulum, wide at first, calming but
//    never still. Let go, the crate falls where its swing has it: onto the platform it lands; over
//    the console it falls on the Panel operator, the drop; over the hatch it drops back in, whole;
//    anywhere else, or from a panel still moving, it breaks (the owner, 13 November 2026), and a new
//    crate waits in the intake: the Panel brings the hook back over the hatch and the Winch holds again.
//  - Landed, both turn a key and the lift takes the crate down to the galley.
// The correct position for a survivor is over the platform: the crate on it, or hanging from the
// panel locked over it.
//
// Authority (Integration's review, 12 November 2026): the server resolves every press at the moment
// it receives it, on its own clock; a phone's own time is diagnostic only. A press names the Task and
// the revision its phone showed, and carries a command id: a press made on an older revision is
// refused as stale, and a retry with the same id returns the first answer and changes nothing.
// Protection is the game's, read by the server at each lethal resolution and used up by a block, as
// the existing rules use it (packages/engine/src/planet-game/physical.ts); the Task holds none.
//
// Choices marked PROPOSED are the design's, for review; the rest follows the confirmed rules.

/** The rail's stops: 0 to 6 in this module, painted 1 to 7 on the rail and the phones. */
export const STOPS = 7;

/** What stands under each stop, and why it matters. */
export const FIXTURES = Object.freeze({
  intake: Object.freeze({ stop: 0, about: 'The intake hatch at the rail\'s left end: the crate starts in it and rises out of it on the hook, with the panel locked over it; after a crate breaks, a new one waits in it. The panel starts locked over it. Let go over it, the crate drops back in, whole.' }),
  deck: Object.freeze({ stops: Object.freeze([1, 2, 3]), about: 'Open deck: the crate crosses it on the way to the platform; let go here, it breaks.' }),
  console: Object.freeze({ stop: 4, about: 'The Panel operator\'s console: they stand at it under the rail, their head just under the crate\'s path. Let go while the crate is over here, it falls on them, the drop, and breaks.' }),
  platform: Object.freeze({ stop: 5, about: 'The galley lift\'s landing platform: let go over it, with the panel locked, the crate lands and the platform\'s clamps hold it. The correct position. Then both turn a key and the lift takes it down to the galley.' }),
  cab: Object.freeze({ stop: 6, about: 'The Winch operator\'s cab, hung under the rail\'s right end, past the platform. The panel locked here drops its blade into the cab: the cut.' }),
});

/** Who controls what. The axis decides the kill: the Winch drops, the Panel cuts. */
export const ROLES = Object.freeze({
  winch: Object.freeze({ name: 'Winch', axis: 'vertical', acts: Object.freeze(['raise', 'lower']), station: 'cab', kill: 'drop', about: 'Holds the crate up with one button, from the cab at the right end of the rail: the finger down lifts it (raise), the finger off lets it fall (lower)' }),
  panel: Object.freeze({ name: 'Panel', axis: 'horizontal', acts: Object.freeze(['release', 'lock']), station: 'console', kill: 'cut', about: 'Sets the locking panel clicking along the rail and locks it at a stop, from the console under the rail' }),
});
/** Both participants' key, once the crate has landed. */
export const KEY = 'key';

/** The cooperative route: hold it up (raise), release the panel, lock it over the platform, let go (lower) as the swing passes over the platform, both keys. */
export const ROUTE = Object.freeze([
  { role: 'winch', act: 'raise' },
  { role: 'panel', act: 'release' },
  { role: 'panel', act: 'lock', stop: FIXTURES.platform.stop },
  { role: 'winch', act: 'lower', zone: 'platform' },
  { role: 'winch', act: KEY },
  { role: 'panel', act: KEY },
].map(Object.freeze));

/**
 * Timing, in milliseconds: all the owner's. The overall time to complete the Task, 30 seconds with the
 * briefing inside it; the click from stop to stop, twice as fast as first approved, so harder to react
 * to: a 0.05 s snap and a 0.2 s rest (the owner, 13 November 2026, after the playable test; first a
 * 0.1 s snap and a 0.4 s rest); the warnings' 0.15 s margin ("this is fine", 12 November 2026); on
 * Designer's recommendation, the 15 s answer, the 8 s grace and the Food Supply step's 30 s to ask
 * (12 November); and the rest as designed, the 4 s briefing, 0.45 s to raise, 0.3 s to fall and the
 * 2.5 s outcome card (13 November). A playtest may still change them.
 * move: the panel's snap from one stop to the next; rest: how long it then rests at that stop (a stop
 * every 0.25 s, end to end in 1.5 s); margin: how much earlier a warning starts, and a glow ends, than the
 * danger or the opening itself, so that a press already on its way to the server is covered; raise: the
 * winch lifting the crate to its hanging height, once the finger is on Hold; lower: the crate's fall
 * once the finger is off (its outcome is decided when the let-go arrives), and a broken crate's
 * replacement rising into the hatch meanwhile; briefing: who controls what, before the controls work; deadline: the whole
 * Task's time, from its start, the briefing included; grace: how long a participant may be out of
 * contact before the Task is cancelled (see the rule conflict in food-supply.md); ending: the outcome
 * card after the deadline, before the return; answer: how long an asked Partner has to join or decline;
 * asking: how long the Food Supply step stays open for a request, at the start of each round.
 */
export const TIMING = Object.freeze({ move: 50, rest: 200, margin: 150, raise: 450, lower: 300, briefing: 4000, deadline: 30000, grace: 8000, ending: 2500, answer: 15000, asking: 30000 });

/**
 * When both participants return, after the Task's start: its 30 seconds, then the outcome card. The same
 * for every outcome (the owner, on Designer's recommendation, 12 November 2026), so the time the two are
 * away tells the others nothing; only the food count says how it went.
 */
export const RETURN_AFTER = TIMING.deadline + TIMING.ending;

/** One click: the snap and the rest. */
export const CLICK = TIMING.move + TIMING.rest;

/**
 * The crate's swing, in stops along the rail: the owner's, as designed (13 November 2026). A lock with the crate hanging starts a swing
 * of `lock` in the panel's direction of travel; a raise ends in a small one of `lift`. Either way the
 * swing tends to `least` with a time constant of `settle` ms and never stops; one swing, there and
 * back, takes `period` ms.
 */
export const SWING = Object.freeze({ period: 1300, settle: 2200, least: 0.38, lock: 0.9, lift: 0.25 });

/** Where a crate let go falls, in stops either side of each place: the owner's, as designed (13 November 2026). */
export const ZONES = Object.freeze({ platform: 0.3, console: 0.42, intake: 0.42 });

/**
 * The safety catch's luck (the owner, 12 November 2026): a press that would kill an unprotected
 * participant is stopped one time in four, by the server's own random number, looking exactly as a
 * Protection block looks. A participant with applicable Protection is stopped by it, and the block
 * uses it up (the existing rules). So a stop proves nothing.
 */
export const CATCH = Object.freeze({ luck: 0.25 });

/**
 * Food, in packages: five to start (shown by the ship-life capsules), five per delivery, a warning at one
 * (the owner, 11 November 2026). A package holds two doses, and each player eats one dose at their
 * Eating step, the end of their own ordinary turn (the owner, on Designer's recommendation, 12 November
 * 2026): one delivery a round feeds up to ten players.
 */
export const FOOD = Object.freeze({ initial: 5, perDelivery: 5, warnAt: 1, dosesPerPackage: 2 });

/** Events that never reach a phone: the server's record of each lethal press (the catch's roll, and whether Protection or luck held). */
export const SERVER_ONLY = Object.freeze(['CATCH']);

const ROLE_KEYS = Object.freeze(['winch', 'panel']);
const other = role => (role === 'winch' ? 'panel' : 'winch');
const clone = state => JSON.parse(JSON.stringify(state));
const r3 = v => Math.round(v * 1000) / 1000;
/** The snap's easing: slow off the stop, fast across, slow into the next. */
const snap = u => u * u * (3 - 2 * u);

/** Unfold the rail's bounce: a distance travelled along the path, back to a place on the rail and the way it is going. */
function fold(u) {
  const span = STOPS - 1, cycle = 2 * span;
  const w = ((u % cycle) + cycle) % cycle;
  return w <= span ? { at: w, dir: 1 } : { at: cycle - w, dir: -1 };
}

/**
 * The running panel, `dt` ms after it was released at stop `from` going `dir`: it clicks from stop to
 * stop, end to end and back. Each click snaps to the next stop in TIMING.move ms, then rests there
 * TIMING.rest ms. Returns its place along the rail (a fractional stop), the way it is going, `stop`,
 * the stop a LOCK takes now (the one it rests at, or the one it is snapping to), and whether it rests.
 */
export function sweep(from, dir, dt) {
  const span = STOPS - 1, cycle = 2 * span;
  const d = Math.max(0, dt);
  const n = Math.floor(d / CLICK), r = d - n * CLICK;
  const resting = r >= TIMING.move;
  const u0 = (dir > 0 ? from : cycle - from) + n;
  const place = fold(u0 + (resting ? 1 : snap(r / TIMING.move)));
  return { at: place.at, dir: fold(u0 + 0.5).dir, stop: Math.round(fold(u0 + 1).at), resting };
}

/** The panel at time t: locked at a stop, or clicking along the rail. */
export function panelAt(state, t) {
  const p = state.panel;
  if (p.locked) return { at: p.stop, dir: p.dir, stop: p.stop, locked: true, resting: true };
  return { ...sweep(p.from, p.dir, t - p.since), locked: false };
}

/** The swing's offset from the panel, in stops, at time t. */
export function swingOffset(swing, t) {
  if (!swing) return 0;
  const dt = Math.max(0, t - swing.since);
  const a = SWING.least + (swing.amp - SWING.least) * Math.exp(-dt / SWING.settle);
  return swing.dir * a * Math.sin((2 * Math.PI * dt) / SWING.period);
}

/** The crate's centre along the rail at time t, a fractional stop: under the panel and swinging, or where it lies. */
export function crateX(state, t) {
  const c = state.crate;
  if (c.state !== 'hanging') return c.x;
  const p = panelAt(state, t);
  return p.locked ? p.at + swingOffset(state.swing, t) : p.at;
}

/** Where the crate lands if it falls with its centre at x: 'platform', 'console', 'intake' or 'deck'. */
export function landingAt(x) {
  if (Math.abs(x - FIXTURES.platform.stop) <= ZONES.platform) return 'platform';
  if (Math.abs(x - FIXTURES.console.stop) <= ZONES.console) return 'console';
  if (Math.abs(x - FIXTURES.intake.stop) <= ZONES.intake) return 'intake';
  return 'deck';
}

/** Whether the crate has finished its last move (a raise takes TIMING.raise; a fall, and a new crate rising into the hatch, TIMING.lower). */
export function settled(state, t) {
  const c = state.crate;
  if (c.from === null) return true;
  return t >= c.since + (c.state === 'hanging' ? TIMING.raise : TIMING.lower);
}

/**
 * The correct position for a survivor: over the platform. The crate on the platform, or still on
 * the hook of a panel locked over it, from where the Winch alone can let it fall in.
 */
export function inPosition(state) {
  if (state.crate.state === 'landed') return true;
  return state.panel.locked && state.panel.stop === FIXTURES.platform.stop && state.crate.state === 'hanging';
}

/** The stop the Panel locks the panel at next: over the hatch to fetch a crate waiting in the intake, otherwise over the platform. */
export const goalStop = state => (state.crate.state === 'intake' ? FIXTURES.intake.stop : FIXTURES.platform.stop);

/**
 * What a let-go at time t does (the Winch's finger off Hold): the crate falls from where it is then
 * (the owner, 13 November 2026). With the panel locked, over the platform it lands: the one right
 * place. Over the intake hatch it drops back in, whole (a let-go while it is still rising always does:
 * it rose from there). Over the console it falls on the Panel operator, the drop, and breaks. Anywhere
 * else, or over the platform from a panel still moving, it breaks, and a new crate waits in the intake.
 * Returns { x, zone, result: 'land' | 'back' | 'drop' | 'break', lift }, or null if no crate hangs. lift:
 * how far up the crate is, from 0 (in the hatch) to 1 (its hanging height), where its fall starts.
 */
export function fallOf(state, t) {
  const c = state.crate;
  if (c.state !== 'hanging') return null;
  if (!settled(state, t)) return { x: c.x, zone: 'intake', result: 'back', lift: r3(Math.max(0, Math.min(1, (t - c.since) / TIMING.raise))) };
  const p = panelAt(state, t);
  const x = crateX(state, t);
  const zone = landingAt(x);
  const result = zone === 'platform' ? (p.locked ? 'land' : 'break')
    : zone === 'intake' ? 'back'
      : zone === 'console' && state.alive.panel ? 'drop' : 'break';
  return { x, zone, result, lift: 1 };
}

/**
 * A new Task. id: the Task's identity; seats: { winch, panel } (player numbers, assigned to the controls
 * at random by the server: the owner, 12 November 2026); at: the Task's start on the game's clock.
 * No attack opportunity comes in (a kill on the Task is not an attack: the owner, 12 November 2026),
 * and no Protection: that stays the game's, read by the server when a press would kill.
 */
export function startTask({ id = 'task-1', seats, at = 0 } = {}) {
  if (!seats?.winch || !seats?.panel || seats.winch === seats.panel) throw new Error('A Task needs two different participants');
  return {
    id, revision: 0, pressRevision: 0, seq: 0, seen: { winch: 0, panel: 0 },
    phase: 'briefing', at, startedAt: at, runningAt: at + TIMING.briefing, deadline: at + TIMING.deadline, returnsAt: at + RETURN_AFTER,
    seats: { ...seats },
    alive: { winch: true, panel: true },
    online: { winch: true, panel: true }, offlineSince: { winch: null, panel: null },
    panel: { locked: true, stop: FIXTURES.intake.stop, dir: 1, from: null, since: at },
    crate: { state: 'intake', x: FIXTURES.intake.stop, since: at, from: null },
    swing: null,
    // The crates broken so far: where each fell ('deck', 'console' or 'platform') and when.
    broken: [],
    keys: { winch: false, panel: false },
    outcome: null, endedAt: null,
    receipts: {},
  };
}

/** The role of a seat in this Task, or null. */
export const roleOf = (state, seat) => (state.seats.winch === seat ? 'winch' : state.seats.panel === seat ? 'panel' : null);

/** Who may see an event: no one (the server's own record), its presser only (a refusal), or both participants. */
function audienceOf(state, e) {
  if (SERVER_ONLY.includes(e.type)) return [];
  if (e.type === 'REFUSED' || e.type === 'RECEIPT') return [roleOf(state, e.seat)].filter(Boolean);
  return ROLE_KEYS;
}

/**
 * Close a batch of events: each gets its identity (the Task's id and a sequence number), its order and
 * its authoritative time, and the Task's revision moves on once. A turned key does not make the other
 * participant's press stale: no other press depends on it, so both can turn their keys at once (the
 * playable test found the two keys refusing each other, 13 November 2026). Each participant also numbers the
 * events they may see in a sequence of their own (n: { winch, panel }), so that no gap in it can tell
 * one participant that the other's press was refused (Integration, 12 November 2026). A press is stale if it was made on a
 * revision older than the last change it depends on: a change of connection alone does not count. The
 * briefing's end is not a change of revision: every phone knows it from runningAt, so the first press
 * after it, made on the briefing's revision, is not stale.
 */
function commit(state, events, t) {
  const fresh = events.filter(e => !e.id);
  const changes = fresh.filter(e => e.type !== 'REFUSED' && e.type !== 'RECEIPT' && e.type !== 'RUNNING');
  for (const e of fresh) {
    state.seq += 1;
    e.id = `${state.id}:${state.seq}`; e.seq = state.seq; e.t = e.t ?? t;
    e.n = {};
    for (const role of audienceOf(state, e)) { state.seen[role] += 1; e.n[role] = state.seen[role]; }
  }
  if (changes.length) {
    state.revision += 1;
    if (changes.some(e => !['OFFLINE', 'ONLINE', 'KEY'].includes(e.type))) state.pressRevision = state.revision;
  }
  return { state, events };
}

function end(state, outcome, at, events) {
  state.phase = 'ended'; state.outcome = outcome; state.endedAt = at;
  events.push({ type: 'ENDED', outcome: { ...outcome }, t: at });
}

/** Send when the crate has landed and every living participant has turned their key. */
function trySend(state, at, events) {
  if (state.crate.state !== 'landed' || state.phase === 'ended') return;
  const needed = ROLE_KEYS.filter(role => state.alive[role]);
  if (needed.length && needed.every(role => state.keys[role])) {
    state.crate = { ...state.crate, state: 'sent', since: at, from: { state: 'landed', x: state.crate.x } };
    events.push({ type: 'SENT', by: needed });
    end(state, { result: 'delivered', packages: FOOD.perDelivery, alone: needed.length === 1 }, at, events);
  }
}

/**
 * The crate breaks where it falls (the owner, 13 November 2026). It costs time, not food: a new crate
 * rises into the intake hatch while the broken one falls, and the Panel must bring the hook back over
 * the hatch, and the Winch hold again, to lift it.
 */
function breakCrate(state, fall, t, events) {
  const on = fall.zone === 'console' ? 'console' : fall.zone === 'platform' ? 'platform' : 'deck';
  // hoist: where the panel was along the rail, for the drawing of the fall from the cable's end.
  state.broken.push({ x: r3(fall.x), on, at: t, hoist: r3(panelAt(state, t).at) });
  state.crate = { state: 'intake', x: FIXTURES.intake.stop, since: t, from: { state: 'new', x: FIXTURES.intake.stop } };
  state.swing = null;
  events.push({ type: 'BROKEN', on, x: r3(fall.x), count: state.broken.length });
}

/** After a death: the survivor goes on only from the correct position; otherwise the Task is lost. */
function afterDeath(state, at, events) {
  if (!inPosition(state)) end(state, { result: 'lost', why: 'not-in-position' }, at, events);
  else trySend(state, at, events);
}

/**
 * A press that would kill the partner, whatever the presser meant. It is not an attack and uses
 * nothing (the owner). The server reads the partner's applicable Protection at this moment from the
 * game (step.protection: not used up, active this round, as packages/engine physical.ts decides; Clone
 * is not read): it stops the press, and the block uses it up there (CATCH, cause 'protection'). Without
 * it, the server's own roll for this press (step.roll) below CATCH.luck stops it by luck. Either stop is
 * the same STOPPED on both phones; the CATCH record of the roll and the cause stays on the server.
 */
function lethal(state, role, kind, events, extra, step) {
  const victim = other(role);
  const roll = step.roll ?? 1;
  const cause = step.protection?.[victim] ? 'protection' : roll < CATCH.luck ? 'luck' : null;
  events.push({ type: 'CATCH', kind, victim, roll, held: cause, server: true });
  if (cause) {
    events.push({ type: 'STOPPED', kind, by: role, ...extra });
    return false;
  }
  state.alive[victim] = false;
  state.keys[victim] = false;
  events.push({ type: 'KILLED', kind, by: role, victim, ...extra });
  return true;
}

/**
 * The game's clock moves on to `at`: the briefing ends, and the Task ends at the earliest boundary due
 * by then, whenever the server gets to it: the deadline (lost: time) or a participant's grace running
 * out (cancelled). At the same moment the deadline comes first, then the participant who went out of
 * contact first, then the Winch before the Panel. An ended Task stays as it ended: a late tick, a
 * reconnect or a press changes nothing, and nothing is delivered twice.
 */
export function tick(prev, at) {
  const state = clone(prev);
  const events = [];
  state.at = Math.max(state.at, at);
  if (state.phase === 'ended') return { state, events };
  const due = [];
  if (at >= state.deadline) due.push({ t: state.deadline, rank: [0, 0], outcome: { result: 'lost', why: 'time' } });
  ROLE_KEYS.forEach((role, i) => {
    if (state.alive[role] && !state.online[role] && at - state.offlineSince[role] >= TIMING.grace) {
      due.push({ t: state.offlineSince[role] + TIMING.grace, rank: [1, state.offlineSince[role] * 2 + i], outcome: { result: 'cancelled', why: 'disconnect', who: role } });
    }
  });
  due.sort((a, b) => a.t - b.t || a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1]);
  const first = due[0] ?? null;
  if (state.phase === 'briefing' && at >= state.runningAt && (!first || first.t > state.runningAt)) {
    state.phase = 'running';
    events.push({ type: 'RUNNING', t: state.runningAt });
  }
  if (first) end(state, first.outcome, first.t, events);
  return commit(state, events, at);
}

/**
 * One participant's press, resolved when the server receives it.
 * step: { at, seat, act, taskId?, revision?, commandId?, shownAt?, protection?, roll? }
 *  - at: the moment the server receives the press, on its clock: the press is resolved then, wherever
 *    the panel and the crate are by then (Integration, 12 November 2026). shownAt, the phone's own
 *    moment, is diagnostic only.
 *  - act: 'raise' | 'lower' (the Winch: the finger down on Hold, and off it), 'release' | 'lock' (the
 *    Panel), or 'key' (either, once landed): the act its button showed, never the button's current one.
 *  - taskId and revision: the Task and the revision the phone showed; a press made on an older
 *    revision than the last change it depends on is refused as stale. A let-go never is: the finger is
 *    off, and the crate falls from wherever it is when the let-go arrives (its own hold, still on its
 *    way when the finger came off, is the change it would otherwise be stale to).
 *  - commandId: the press's identity. A retry with the same id returns the first answer (RECEIPT)
 *    and changes nothing: no second press, no second roll.
 *  - protection: { winch, panel }, the game's applicable Protection as the server reads it now.
 *  - roll: the server's own random number for a press that would kill, in [0, 1) (omitted: 1).
 * Neither protection nor roll ever reaches a phone.
 * Returns { state, events }: RAISED, TAKEN, RELEASED, LOCKED, LOWERED, LANDED, MISSED, BROKEN, STOPPED,
 * KILLED, KEY, SENT, ENDED, the server's CATCH, REFUSED (why) to the presser only, or RECEIPT for a retry.
 */
export function act(prev, step) {
  if (step.commandId && prev.receipts?.[step.commandId]) {
    return { state: prev, events: [{ type: 'RECEIPT', commandId: step.commandId, seat: step.seat, ...prev.receipts[step.commandId] }] };
  }
  const t = step.at;
  let { state, events } = tick(prev, t);
  state = clone(state);
  const before = events.length;
  const role = roleOf(state, step.seat);
  // The answer, recorded under the press's command id so that a retry gets the same one.
  const finish = result => {
    const out = commit(state, events, t);
    if (step.commandId) out.state.receipts[step.commandId] = { ...result, revision: out.state.revision };
    return out;
  };
  const refuse = why => { events.push({ type: 'REFUSED', seat: step.seat, act: step.act, why }); return finish({ result: 'refused', why }); };
  const accept = () => finish({ result: 'accepted', events: events.slice(before).filter(e => !e.server).map(e => e.type) });
  if (step.taskId && step.taskId !== state.id) return refuse('not-this-task');
  if (state.phase === 'ended') return refuse('ended');
  if (!role) return refuse('not-a-participant');
  if (state.phase === 'briefing') return refuse('briefing');
  if (!state.alive[role]) return refuse('down');
  if (step.act !== 'lower' && step.revision !== undefined && step.revision < state.pressRevision) return refuse('stale');
  const mine = step.act === KEY || ROLES[role].acts.includes(step.act);
  if (!mine) return refuse('not-your-control');
  const c = state.crate, p = state.panel;
  const ready = settled(state, t);

  if (step.act === KEY) {
    if (c.state !== 'landed') return refuse('not-landed');
    if (!ready) return refuse('busy');
    if (state.keys[role]) return refuse('turned');
    state.keys[role] = true;
    events.push({ type: 'KEY', by: role });
    trySend(state, t, events);
    return accept();
  }

  // Hold: the Winch's finger down on the button. The hook lifts the crate waiting in the intake when the
  // panel is locked over the hatch, and keeps it up while the finger stays down (the owner, 13 November).
  if (step.act === 'raise') {
    if (c.state === 'landed') return refuse('landed');
    if (c.state === 'hanging') {
      if (c.holder === 'winch') return refuse('holding');
      // After a stopped drop the winch's brake holds the crate: the finger takes it back.
      state.crate = { ...c, holder: 'winch', from: c.from ? { ...c.from } : null };
      events.push({ type: 'TAKEN', by: role, x: r3(crateX(state, t)) });
      return accept();
    }
    if (!p.locked) return refuse('unlocked');
    if (!ready) return refuse('busy');
    if (p.stop !== FIXTURES.intake.stop) return refuse('not-over-crate');
    state.crate = { state: 'hanging', x: p.stop, since: t, from: { state: c.state, x: c.x }, holder: 'winch' };
    state.swing = { since: t + TIMING.raise, amp: SWING.lift, dir: 1 };
    events.push({ type: 'RAISED', by: role, from: c.state, x: r3(c.x) });
    return accept();
  }

  // Let go: the finger off the button. The crate falls from wherever it is when the let-go arrives.
  if (step.act === 'lower') {
    if (c.state === 'landed') return refuse('landed');
    if (c.state !== 'hanging') return refuse('down-already');
    if (c.holder !== 'winch') return refuse('not-holding');
    const fall = fallOf(state, t);
    const x = r3(fall.x);
    events.push({ type: 'LOWERED', by: role, x, to: fall.zone, ...(fall.lift < 1 ? { lift: fall.lift } : {}) });
    if (fall.result === 'drop') {
      // The drop: it falls on the Panel operator, and breaks. Stopped, the winch's brake catches the
      // crate: it hangs on, swinging as it was, until the Winch's finger takes it back.
      if (!lethal(state, role, 'drop', events, { x }, step)) {
        state.crate = { ...c, holder: 'brake', from: c.from ? { ...c.from } : null };
        return accept();
      }
      breakCrate(state, fall, t, events);
      afterDeath(state, t, events);
      return accept();
    }
    if (fall.result === 'break') { breakCrate(state, fall, t, events); return accept(); }
    const rest = fall.result === 'land' ? 'landed' : 'intake';
    const from = { state: 'hanging', x: fall.x, ...(fall.lift < 1 ? { lift: fall.lift } : {}) };
    state.crate = { state: rest, x: rest === 'landed' ? FIXTURES.platform.stop : FIXTURES.intake.stop, since: t, from };
    state.swing = null;
    events.push(rest === 'landed' ? { type: 'LANDED' } : { type: 'MISSED', on: 'intake', x });
    return accept();
  }

  if (step.act === 'release') {
    if (!p.locked) return refuse('unlocked');
    if (!ready) return refuse('busy');
    // The hook goes with the crate, or empty: after a landing, or to fetch a crate from the intake. Not
    // off a crate waiting under it, for the Winch to lift.
    if (c.state === 'intake' && p.stop === FIXTURES.intake.stop) return refuse('crate-down');
    const dir = p.stop === STOPS - 1 ? -1 : p.stop === 0 ? 1 : p.dir;
    state.panel = { locked: false, stop: null, dir, from: p.stop, since: t };
    state.swing = null;
    events.push({ type: 'RELEASED', by: role, from: p.stop, dir });
    return accept();
  }

  // The lock: the blade drops at the stop the panel rests at, or at the one it is snapping to.
  if (p.locked) return refuse('locked');
  const pos = sweep(p.from, p.dir, t - p.since);
  const stop = pos.stop;
  state.panel = { locked: true, stop, dir: pos.dir, from: null, since: t };
  // The crate swings on in the panel's direction; at either end of the rail it swings back off the end.
  if (c.state === 'hanging') state.swing = { since: t, amp: SWING.lock, dir: stop === STOPS - 1 ? -1 : stop === 0 ? 1 : pos.dir };
  events.push({ type: 'LOCKED', by: role, stop, dir: pos.dir, x: r3(pos.at), resting: pos.resting });
  if (stop === FIXTURES.cab.stop && state.alive.winch) {
    // The cut. Stopped, the cab's roof buffer catches the blade: the panel stays locked on it.
    if (lethal(state, role, 'cut', events, {}, step)) afterDeath(state, t, events);
  }
  return accept();
}

/**
 * A participant's connection, as the server observes it (its detection is Backend's). Out of
 * contact, the Task runs on for TIMING.grace; back in time, it resumes; after that it is cancelled
 * (and a later reconnect changes nothing). A death that resolved before the cancellation stands. (A
 * dead participant's connection no longer matters.)
 */
export function connection(prev, { seat, online, at }) {
  let { state, events } = tick(prev, at);
  state = clone(state);
  const role = roleOf(state, seat);
  if (!role || state.phase === 'ended') return { state, events };
  const mine = [];
  if (!online && state.online[role]) { state.online[role] = false; state.offlineSince[role] = at; mine.push({ type: 'OFFLINE', who: role }); }
  if (online && !state.online[role]) { state.online[role] = true; state.offlineSince[role] = null; mine.push({ type: 'ONLINE', who: role }); }
  const out = commit(state, mine, at);
  return { state: out.state, events: [...events, ...out.events] };
}

/**
 * Run a list of steps from a start, in the order the server receives them: { at, seat, act } presses
 * (with a revision, a command id or a roll, if given), { at, seat, online } connection changes and
 * { at } clock ticks. game: the game's own state around the Task: protection, { winch, panel }, each
 * participant's applicable Protection. Before each press the server reads it (step.protection), and a
 * block by Protection uses it up, as the existing rules do. Returns every state with its events.
 */
export function simulate(start, steps, { protection = { winch: false, panel: false } } = {}) {
  const game = { protection: { ...protection } };
  const frames = [{ at: start.at, state: start, events: [] }];
  let state = start;
  for (const step of steps) {
    let result;
    if (step.act) {
      result = act(state, { ...step, protection: step.protection ?? { ...game.protection } });
      for (const e of result.events) if (e.type === 'CATCH' && e.held === 'protection') game.protection[e.victim] = false;
    } else result = step.online !== undefined ? connection(state, step) : tick(state, step.at);
    state = result.state;
    frames.push({ at: step.at, state, events: result.events, step, game: { protection: { ...game.protection } } });
  }
  return frames;
}

/** The press the cooperative route asks of each role next at time t, or null: what the phones light up. */
export function next(state, t) {
  const out = { winch: null, panel: null };
  if (state.phase !== 'running') return out;
  const c = state.crate, p = panelAt(state, t);
  if (c.state === 'landed') {
    for (const role of ROLE_KEYS) if (state.alive[role] && !state.keys[role]) out[role] = KEY;
    return out;
  }
  if (!settled(state, t) || c.state === 'sent') return out;
  const goal = goalStop(state);
  // A crate waiting in the intake: the hook over the hatch, then the finger on Hold.
  if (c.state === 'intake') {
    if (p.locked && p.stop === goal) { if (state.alive.winch) out.winch = 'raise'; } else if (state.alive.panel) out.panel = p.locked ? 'release' : 'lock';
    return out;
  }
  // On the brake after a stopped drop: the finger takes it back.
  if (c.holder !== 'winch') { if (state.alive.winch) out.winch = 'raise'; return out; }
  if (!p.locked) { if (state.alive.panel) out.panel = 'lock'; return out; }
  if (p.stop === goal) { if (state.alive.winch) out.winch = 'lower'; return out; }
  if (state.alive.panel) out.panel = 'release';
  return out;
}

/** What a let-go meets over the next TIMING.margin ms: each result a let-go made now could have. */
function fallsAhead(state, t) {
  const seen = new Set();
  for (let dt = 0; dt <= TIMING.margin; dt += 10) seen.add(fallOf(state, t + dt).result);
  return [...seen];
}

/**
 * The dangers and openings at time t, with TIMING.margin to spare: a press made now reaches the server
 * a moment later, so a warning starts that much before a danger, and a glow ends that much before an
 * opening does. cut: a LOCK now could take the cab's stop, where it cuts the Winch operator. While the
 * Winch holds the crate up: drop, a let-go now could meet the crate over the console, where it falls on
 * the Panel operator; breaks, a let-go now could break it; steady, a let-go now lands it, whenever it
 * arrives in the margin; zone, where the crate is over now; likely and fall, where it will be, and what
 * a let-go would do, when a let-go made now arrives.
 */
export function hazards(state, t) {
  const running = state.phase === 'running';
  const p = panelAt(state, t), soon = panelAt(state, t + TIMING.margin);
  const cut = running && state.alive.winch && !p.locked && (p.stop === FIXTURES.cab.stop || soon.stop === FIXTURES.cab.stop);
  const held = running && state.crate.state === 'hanging' && state.crate.holder === 'winch';
  const now = held ? fallOf(state, t) : null;
  const later = held ? fallOf(state, t + TIMING.margin) : null;
  const ahead = held ? fallsAhead(state, t) : [];
  return {
    cut,
    zone: now?.zone ?? null,
    likely: later?.zone ?? null,
    fall: later?.result ?? null,
    drop: held && state.alive.panel && ahead.includes('drop'),
    breaks: held && ahead.includes('break'),
    steady: held && ahead.every(r => r === 'land'),
    leaving: !p.locked && soon.stop !== p.stop,
  };
}

/**
 * What one participant's phone shows at time t: their role and controls, the dangers their own
 * presses would cause, the warnings both see, the panel and the crate, the keys, the time left and
 * the outcome. Built from the participant's projection alone (projection(), or the Task's state,
 * which holds nothing more that this reads): it never reads Protection, the catch's roll or a
 * refusal of the other participant's, so no phone can show them. Every value is a safe function of
 * the projection and the time; whether a press is accepted, and what it does, is the server's.
 */
export function view(state, seat, t = state.at) {
  const role = roleOf(state, seat);
  if (!role) return null;
  const partner = other(role);
  const h = hazards(state, t);
  const n = next(state, t)[role];
  const p = panelAt(state, t);
  const c = state.crate;
  const ready = settled(state, t);
  // A phone that has lost its connection cannot send: its controls are off until it is back.
  const live = state.phase === 'running' && state.alive[role] && state.online[role];
  const landed = c.state === 'landed';
  const key = () => ({ act: KEY, label: state.keys[role] ? 'Key turned' : 'Turn key', enabled: live && ready && !state.keys[role], next: live && n === KEY, turned: state.keys[role] });
  const goal = goalStop(state);
  let buttons;
  if (role === 'panel') {
    const act = p.locked ? 'release' : 'lock';
    const fetch = c.state === 'intake' && p.stop !== FIXTURES.intake.stop;
    const enabled = live && (p.locked ? ready && (c.state === 'hanging' || landed || fetch) : true);
    const onTime = !h.leaving && p.stop === goal;
    const panel = { act, label: p.locked ? 'RELEASE' : 'LOCK', enabled, hazard: enabled && act === 'lock' && h.cut, next: enabled && n === act && (act === 'release' || onTime), stop: p.stop, leaving: act === 'lock' && h.leaving };
    buttons = landed ? [key(), panel] : [panel];
  } else if (landed) {
    buttons = [key()];
  } else {
    // The Winch's one button (the owner, 13 November 2026): the finger down on it sends raise, the
    // finger off it sends lower. holding: the server's word that the finger holds the crate up, shown
    // only while the controls work (out, offline or after the end, the button is just off).
    const holding = live && c.state === 'hanging' && c.holder === 'winch';
    const lift = c.state === 'intake' && p.locked && p.stop === FIXTURES.intake.stop && ready;
    const takeBack = c.state === 'hanging' && c.holder === 'brake';
    buttons = [{
      act: 'hold', label: holding ? 'Holding' : 'Hold', down: 'raise', up: 'lower', holding,
      enabled: live && (holding || lift || takeBack),
      // The glow: hold now (the hook is over the crate), or let go now (it lands, whenever the let-go arrives in the margin).
      next: live && ((n === 'raise' && (lift || takeBack)) || (n === 'lower' && holding && h.steady)),
      // Striped: a let-go now may drop it on the partner.
      hazard: live && holding && h.drop,
      zone: holding ? h.likely : null, fall: holding ? h.fall : null,
    }];
  }
  const warnings = [];
  if (h.cut) warnings.push(role === 'panel' ? 'panel-at-partner-cab' : 'panel-at-your-cab');
  if (h.drop) warnings.push(role === 'winch' ? 'crate-over-partner' : 'crate-over-you');
  return {
    role, roleName: ROLES[role].name, axis: ROLES[role].axis, seat, partnerSeat: state.seats[partner],
    taskId: state.id, revision: state.revision,
    phase: state.phase, you: state.alive[role] ? 'alive' : 'down', partner: state.alive[partner] ? (state.online[partner] ? 'alive' : 'offline') : 'down',
    panel: { locked: p.locked, at: r3(p.at), stop: p.stop, dir: p.dir, resting: p.resting },
    crate: { state: c.state, x: r3(crateX(state, t)), settled: ready, holder: c.state === 'hanging' ? c.holder : null },
    goal, broken: state.broken.length,
    zone: h.zone, likely: h.likely, buttons, warnings,
    keys: { you: state.keys[role], partner: state.keys[partner], needed: ROLE_KEYS.filter(r => state.alive[r]).length },
    secondsLeft: Math.max(0, Math.ceil((state.deadline - t) / 1000)),
    briefingLeft: state.phase === 'briefing' ? Math.max(0, Math.ceil((state.runningAt - t) / 1000)) : 0,
    outcome: state.outcome,
  };
}

/**
 * The participant's projection at time t between two updates: the briefing ends by the clock, so the
 * phone may show the controls working from the projection's runningAt. Everything else, the end above
 * all, waits for the server's next update.
 */
export function atTime(projected, t) {
  return projected.phase === 'briefing' && t >= projected.runningAt ? { ...projected, phase: 'running' } : projected;
}

/**
 * One participant's projection: everything their phone needs to draw the Task at any moment between
 * two updates, and after a recovery, and nothing more. Anchors, not positions: the panel's lock or its
 * release (from, dir, since), the swing (since, amp, dir), the crate's last move (since, from) and
 * who holds it up (holder: the Winch's finger, or the brake), the crates broken so far (where and when), the
 * Task's times and the mechanics' parameters; view(projection, seat, t) gives the phone at any t.
 * events: the participant's own events since `after`, a cursor in their own sequence: each with its
 * identity and number in that sequence (never the server's global one, whose gaps would show the other
 * participant's refusals), its order and its authoritative time: the cues to play. Never: Protection,
 * the catch's roll or cause (CATCH), a refusal of the other participant's, or a receipt not theirs.
 */
export function projection(state, seat, { observedAt = state.at, events = [], after = 0 } = {}) {
  const role = roleOf(state, seat);
  if (!role) return null;
  const mine = events.filter(e => e.n?.[role] !== undefined && e.n[role] > after)
    .map(({ n, id: _id, seq: _seq, ...e }) => ({ ...e, id: `${state.id}:${role}:${n[role]}`, seq: n[role] }));
  return {
    id: state.id, revision: state.revision, observedAt,
    seats: { ...state.seats }, role,
    phase: state.phase, at: observedAt, startedAt: state.startedAt, runningAt: state.runningAt, deadline: state.deadline, endedAt: state.endedAt, returnsAt: state.returnsAt,
    alive: { ...state.alive }, online: { ...state.online }, keys: { ...state.keys },
    panel: { ...state.panel }, swing: state.swing ? { ...state.swing } : null, crate: { ...state.crate, from: state.crate.from ? { ...state.crate.from } : null },
    broken: state.broken.map(b => ({ ...b })),
    outcome: state.outcome ? { ...state.outcome } : null,
    mechanics: { stops: STOPS, move: TIMING.move, rest: TIMING.rest, margin: TIMING.margin, raise: TIMING.raise, lower: TIMING.lower, swing: SWING, zones: ZONES },
    events: mine.map(e => ({ ...e })),
  };
}
