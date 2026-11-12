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
//    four, exactly as Protection saves, so a stop never proves Protection (the owner, 12 November).
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
//  - The Winch (vertical): Raise lifts the crate to its hanging height; Lower lets it fall.
//  - The Panel (horizontal): RELEASE sets the panel sweeping end to end, fast; LOCK drops its blade
//    at the stop it is passing. At stop 7 the blade drops into the Winch operator's cab: the cut.
//  - A lock with the crate hanging sets it swinging like a pendulum, wide at first, calming but
//    never still. Lowered, the crate falls where its swing has it: onto the platform it lands; over
//    the console it falls on the Panel operator, the drop; anywhere else it misses, and the Winch
//    raises it again.
//  - Landed, both turn a key and the lift takes the crate down to the galley.
// The correct position for a survivor is over the platform: the crate on it, or hanging from the
// panel locked over it.
//
// Choices marked PROPOSED are the design's, for review; the rest follows the confirmed rules.

/** The rail's stops: 0 to 6 in this module, painted 1 to 7 on the rail and the phones. */
export const STOPS = 7;

/** What stands under each stop, and why it matters. */
export const FIXTURES = Object.freeze({
  intake: Object.freeze({ stop: 0, about: 'The intake hatch at the rail\'s left end: the crate starts in it, and rises out of it on the hook. The panel starts locked over it.' }),
  deck: Object.freeze({ stops: Object.freeze([1, 2, 3]), about: 'Open deck: the crate crosses it on the way to the platform; lowered here, it misses.' }),
  console: Object.freeze({ stop: 4, about: 'The Panel operator\'s console: they stand at it under the rail, their head just under the crate\'s path. Lowered while its swing has it over here, the crate falls on them: the drop.' }),
  platform: Object.freeze({ stop: 5, about: 'The galley lift\'s landing platform: lowered over it, the crate lands and the platform\'s clamps hold it. The correct position. Then both turn a key and the lift takes it down to the galley.' }),
  cab: Object.freeze({ stop: 6, about: 'The Winch operator\'s cab, hung under the rail\'s right end, past the platform. The panel locked here drops its blade into the cab: the cut.' }),
});

/** Who controls what. The axis decides the kill: the Winch drops, the Panel cuts. */
export const ROLES = Object.freeze({
  winch: Object.freeze({ name: 'Winch', axis: 'vertical', acts: Object.freeze(['raise', 'lower']), station: 'cab', kill: 'drop', about: 'Raises and lowers the crate, from the cab at the right end of the rail' }),
  panel: Object.freeze({ name: 'Panel', axis: 'horizontal', acts: Object.freeze(['release', 'lock']), station: 'console', kill: 'cut', about: 'Sets the locking panel sweeping along the rail and locks it at a stop, from the console under the rail' }),
});
/** Both participants' key, once the crate has landed. */
export const KEY = 'key';

/** The cooperative route: raise it, release the panel, lock it over the platform, lower it as the swing passes over the platform, both keys. */
export const ROUTE = Object.freeze([
  { role: 'winch', act: 'raise' },
  { role: 'panel', act: 'release' },
  { role: 'panel', act: 'lock', stop: FIXTURES.platform.stop },
  { role: 'winch', act: 'lower', zone: 'platform' },
  { role: 'winch', act: KEY },
  { role: 'panel', act: KEY },
].map(Object.freeze));

/**
 * Timing, in milliseconds. PROPOSED, for Game Balance to tune, except the deadline: the owner set the
 * overall time to complete the Task at 30 seconds, the briefing inside it (12 November 2026).
 * stop: the panel's sweep, per stop (end to end in 1.32 s); raise: the winch lifting the crate to its
 * hanging height; lower: the crate's fall (its outcome is decided on the press); briefing: who
 * controls what, before the controls work; deadline: the whole Task's time, from its start, the
 * briefing included (the controls work for the rest of it); grace: how long a participant may be out of contact before the Task is cancelled (see
 * the rule conflict in food-supply.md); ending: the outcome card before the return; answer: how long
 * an asked Partner has to join or decline; lag: how old a press may be on arrival and still count at
 * the moment its phone showed (see press timing in food-supply.md).
 */
export const TIMING = Object.freeze({ stop: 220, raise: 450, lower: 300, briefing: 4000, deadline: 30000, grace: 8000, ending: 2500, answer: 15000, lag: 300 });

/**
 * The crate's swing, in stops along the rail. PROPOSED. A lock with the crate hanging starts a swing
 * of `lock` in the panel's direction of travel; a raise ends in a small one of `lift`. Either way the
 * swing tends to `least` with a time constant of `settle` ms and never stops; one swing, there and
 * back, takes `period` ms.
 */
export const SWING = Object.freeze({ period: 1300, settle: 2200, least: 0.38, lock: 0.9, lift: 0.25 });

/** Where a lowered crate falls, in stops either side of each place. PROPOSED. */
export const ZONES = Object.freeze({ platform: 0.3, console: 0.42, intake: 0.42 });

/**
 * The safety catch's luck (the owner, 12 November 2026): a press that would kill an unprotected
 * participant is stopped one time in four, by the server's own random number, exactly as Protection
 * stops it. A Protected participant is always stopped. So a stop proves nothing.
 */
export const CATCH = Object.freeze({ luck: 0.25 });

/** Food: five packages to start (shown by the ship-life capsules), five per delivery, a warning at one. Confirmed. */
export const FOOD = Object.freeze({ initial: 5, perDelivery: 5, warnAt: 1 });

const ROLE_KEYS = Object.freeze(['winch', 'panel']);
const other = role => (role === 'winch' ? 'panel' : 'winch');
const clone = state => JSON.parse(JSON.stringify(state));
const r3 = v => Math.round(v * 1000) / 1000;

/**
 * The panel's place along the rail, a fractional stop, and the direction it is moving, `dt` ms after
 * it was released at stop `from` going `dir`: it sweeps end to end and back, TIMING.stop ms a stop.
 */
export function sweep(from, dir, dt) {
  const span = STOPS - 1, cycle = 2 * span;
  let u = (dir > 0 ? from : cycle - from) + Math.max(0, dt) / TIMING.stop;
  u = ((u % cycle) + cycle) % cycle;
  return u <= span ? { at: u, dir: 1 } : { at: cycle - u, dir: -1 };
}

/** The panel at time t: locked at a stop, or sweeping. */
export function panelAt(state, t) {
  const p = state.panel;
  if (p.locked) return { at: p.stop, dir: p.dir, locked: true };
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

/** Whether the crate has finished its last move (a raise takes TIMING.raise, a fall TIMING.lower). */
export function settled(state, t) {
  const c = state.crate;
  if (c.from === null) return true;
  return t >= c.since + (c.state === 'hanging' ? TIMING.raise : TIMING.lower);
}

/**
 * The correct position for a survivor: over the platform. The crate on the platform, or still on
 * the hook of a panel locked over it, from where the Winch alone can lower it in.
 */
export function inPosition(state) {
  if (state.crate.state === 'landed') return true;
  return state.panel.locked && state.panel.stop === FIXTURES.platform.stop && state.crate.state !== 'sent';
}

/**
 * A new Task. seats: { winch, panel } (player numbers). protection: whether each is Protected now,
 * as the existing rules decide. at: the Task's start on the game's clock. No attack opportunity comes
 * in: a kill on the Task is not an attack (the owner, 12 November 2026).
 */
export function startTask({ seats, protection = { winch: false, panel: false }, at = 0 } = {}) {
  if (!seats?.winch || !seats?.panel || seats.winch === seats.panel) throw new Error('A Task needs two different participants');
  return {
    phase: 'briefing', at, startedAt: at, runningAt: at + TIMING.briefing, deadline: at + TIMING.deadline,
    changedAt: at,
    seats: { ...seats },
    alive: { winch: true, panel: true },
    online: { winch: true, panel: true }, offlineSince: { winch: null, panel: null },
    protection: { ...protection },
    panel: { locked: true, stop: FIXTURES.intake.stop, dir: 1, from: null, since: at },
    crate: { state: 'intake', x: FIXTURES.intake.stop, since: at, from: null },
    swing: null,
    keys: { winch: false, panel: false },
    outcome: null, endedAt: null,
  };
}

/** The role of a seat in this Task, or null. */
export const roleOf = (state, seat) => (state.seats.winch === seat ? 'winch' : state.seats.panel === seat ? 'panel' : null);

function end(state, outcome, at, events) {
  state.phase = 'ended'; state.outcome = outcome; state.endedAt = at;
  events.push({ type: 'ENDED', outcome: { ...outcome } });
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

/** After a death: the survivor goes on only from the correct position; otherwise the Task is lost. */
function afterDeath(state, at, events) {
  if (!inPosition(state)) end(state, { result: 'lost', why: 'not-in-position' }, at, events);
  else trySend(state, at, events);
}

/**
 * A press that would kill the partner, whatever the presser meant. It is not an attack and uses
 * nothing (the owner). The safety catch stops it if the partner is Protected, or by luck (CATCH,
 * the server's roll for this press); the stop looks the same either way. Otherwise it kills.
 */
function lethal(state, role, kind, events, extra = {}, roll = 1) {
  const victim = other(role);
  if (state.protection[victim] || roll < CATCH.luck) {
    events.push({ type: 'STOPPED', kind, by: role, ...extra });
    return false;
  }
  state.alive[victim] = false;
  state.keys[victim] = false;
  events.push({ type: 'KILLED', kind, by: role, victim, ...extra });
  return true;
}

/** The game's clock moves on: the briefing ends, the deadline passes, a participant stays out of contact. */
export function tick(prev, at) {
  const state = clone(prev);
  const events = [];
  state.at = Math.max(state.at, at);
  if (state.phase === 'ended') return { state, events };
  if (state.phase === 'briefing' && at >= state.runningAt) { state.phase = 'running'; events.push({ type: 'RUNNING' }); }
  for (const role of ROLE_KEYS) {
    if (state.alive[role] && !state.online[role] && at - state.offlineSince[role] >= TIMING.grace) {
      end(state, { result: 'cancelled', why: 'disconnect', who: role }, state.offlineSince[role] + TIMING.grace, events);
      return { state, events };
    }
  }
  if (at >= state.deadline) end(state, { result: 'lost', why: 'time' }, state.deadline, events);
  return { state, events };
}

/**
 * One participant's press. act: 'raise' | 'lower' (the Winch), 'release' | 'lock' (the Panel), or
 * 'key' (either, once the crate has landed). at: the moment the press was made on the phone, on the
 * server's clock (what the phone showed then). arrival: when the server receives it (omitted: at).
 * PROPOSED press timing: a press counts at `at` if it arrives within TIMING.lag of it and nothing has
 * changed since; otherwise it is refused (late, or stale), and the phone shows the current state.
 * roll: the server's own random number for the press, in [0, 1), read only if the press would kill:
 * below CATCH.luck the catch holds (omitted: 1, no luck). It never reaches a phone.
 * Returns { state, events }: RAISED, RELEASED, LOCKED, LOWERED, LANDED, MISSED, STOPPED, KILLED,
 * KEY, SENT, ENDED, or REFUSED (why) when the press does nothing at all.
 */
export function act(prev, step) {
  const arrival = step.arrival ?? step.at;
  let { state, events } = tick(prev, arrival);
  state = clone(state);
  const role = roleOf(state, step.seat);
  const refuse = why => ({ state, events: [...events, { type: 'REFUSED', seat: step.seat, act: step.act, why }] });
  if (state.phase === 'ended') return refuse('ended');
  if (!role) return refuse('not-a-participant');
  if (state.phase === 'briefing') return refuse('briefing');
  if (!state.alive[role]) return refuse('down');
  if (arrival - step.at > TIMING.lag) return refuse('late');
  if (step.at < state.changedAt) return refuse('stale');
  const t = step.at;
  const c = state.crate, p = state.panel;
  const done = settled(state, t);
  const mine = step.act === KEY || ROLES[role].acts.includes(step.act);
  if (!mine) return refuse('not-your-control');

  if (step.act === KEY) {
    if (c.state !== 'landed') return refuse('not-landed');
    if (!done) return refuse('busy');
    if (state.keys[role]) return refuse('turned');
    state.keys[role] = true;
    events.push({ type: 'KEY', by: role });
    trySend(state, t, events);
    return { state, events };
  }

  if (step.act === 'raise') {
    if (c.state === 'landed') return refuse('landed');
    if (!p.locked) return refuse('unlocked');
    if (!done) return refuse('busy');
    if (c.state === 'hanging') return refuse('up');
    // From the intake, the deck or the console, the crate slides under the hook and rises.
    state.crate = { state: 'hanging', x: p.stop, since: t, from: { state: c.state, x: c.x } };
    state.swing = { since: t + TIMING.raise, amp: SWING.lift, dir: 1 };
    state.changedAt = t;
    events.push({ type: 'RAISED', by: role, from: c.state, x: r3(c.x) });
    return { state, events };
  }

  if (step.act === 'lower') {
    if (c.state === 'landed') return refuse('landed');
    if (c.state !== 'hanging') return refuse('down-already');
    if (!p.locked) return refuse('unlocked');
    if (!done) return refuse('busy');
    const x = crateX(state, t);
    const where = landingAt(x);
    state.changedAt = t;
    events.push({ type: 'LOWERED', by: role, x: r3(x), to: where });
    if (where === 'console' && state.alive.panel) {
      // The drop. Stopped, the winch's brake catches the crate and it hangs on, swinging as it was.
      if (!lethal(state, role, 'drop', events, { x: r3(x) }, step.roll)) return { state, events };
      state.crate = { state: 'fallen', x: FIXTURES.console.stop, since: t, from: { state: 'hanging', x } };
      state.swing = null;
      afterDeath(state, t, events);
      return { state, events };
    }
    const rest = { platform: 'landed', console: 'fallen', intake: 'intake', deck: 'deck' }[where];
    const at = { landed: FIXTURES.platform.stop, intake: FIXTURES.intake.stop, fallen: FIXTURES.console.stop }[rest] ?? x;
    state.crate = { state: rest, x: at, since: t, from: { state: 'hanging', x } };
    state.swing = null;
    events.push(rest === 'landed' ? { type: 'LANDED' } : { type: 'MISSED', on: rest, x: r3(x) });
    return { state, events };
  }

  if (step.act === 'release') {
    if (!p.locked) return refuse('unlocked');
    if (!done) return refuse('busy');
    if (c.state !== 'hanging' && c.state !== 'landed') return refuse('crate-down');
    const dir = p.stop === STOPS - 1 ? -1 : p.stop === 0 ? 1 : p.dir;
    state.panel = { locked: false, stop: null, dir, from: p.stop, since: t };
    state.swing = null;
    state.changedAt = t;
    events.push({ type: 'RELEASED', by: role, from: p.stop, dir });
    return { state, events };
  }

  // The lock: the blade drops at the stop the panel is passing.
  if (p.locked) return refuse('locked');
  const pos = sweep(p.from, p.dir, t - p.since);
  const stop = Math.round(pos.at);
  state.panel = { locked: true, stop, dir: pos.dir, from: null, since: t };
  state.changedAt = t;
  // The crate swings on in the panel's direction; at either end of the rail it swings back off the end.
  if (c.state === 'hanging') state.swing = { since: t, amp: SWING.lock, dir: stop === STOPS - 1 ? -1 : stop === 0 ? 1 : pos.dir };
  events.push({ type: 'LOCKED', by: role, stop, dir: pos.dir, at: r3(pos.at) });
  if (stop === FIXTURES.cab.stop && state.alive.winch) {
    // The cut. Stopped, the cab's roof buffer catches the blade: the panel stays locked on it.
    if (lethal(state, role, 'cut', events, {}, step.roll)) afterDeath(state, t, events);
  }
  return { state, events };
}

/**
 * A participant's connection, as the server observes it (its detection is Backend's). Out of
 * contact, the Task runs on for TIMING.grace; back in time, it resumes; after that it is cancelled.
 * A death that resolved before the cancellation stands. (A dead participant's connection no longer
 * matters.)
 */
export function connection(prev, { seat, online, at }) {
  let { state, events } = tick(prev, at);
  state = clone(state);
  const role = roleOf(state, seat);
  if (!role || state.phase === 'ended') return { state, events };
  if (!online && state.online[role]) { state.online[role] = false; state.offlineSince[role] = at; events.push({ type: 'OFFLINE', who: role }); }
  if (online && !state.online[role]) { state.online[role] = true; state.offlineSince[role] = null; events.push({ type: 'ONLINE', who: role }); }
  return { state, events };
}

/**
 * Run a list of steps from a start: { at, seat, act } presses (with an arrival, if it differs),
 * { at, seat, online } connection changes and { at } clock ticks, in the order the server receives
 * them. Returns every state with the events that led to it.
 */
export function simulate(start, steps) {
  const frames = [{ at: start.at, state: start, events: [] }];
  let state = start;
  for (const step of steps) {
    const result = step.act ? act(state, step) : step.online !== undefined ? connection(state, step) : tick(state, step.at);
    state = result.state;
    frames.push({ at: step.at, state, events: result.events, step });
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
  if (c.state !== 'hanging') { if (state.alive.winch) out.winch = 'raise'; return out; }
  if (!p.locked) { if (state.alive.panel) out.panel = 'lock'; return out; }
  if (p.at === FIXTURES.platform.stop) { if (state.alive.winch) out.winch = 'lower'; return out; }
  if (state.alive.panel) out.panel = 'release';
  return out;
}

/**
 * The dangers at time t. cut: the panel sweeping past the cab, where a lock cuts the Winch operator.
 * drop: the crate's swing over the console, where a Lower drops it on the Panel operator. zone: where
 * a Lower would put the crate now, when it can be lowered.
 */
export function hazards(state, t) {
  const running = state.phase === 'running';
  const p = panelAt(state, t);
  const cut = running && state.alive.winch && !p.locked && Math.round(p.at) === FIXTURES.cab.stop;
  const lowerable = running && state.crate.state === 'hanging' && p.locked && settled(state, t);
  const zone = lowerable ? landingAt(crateX(state, t)) : null;
  return { cut, drop: zone === 'console' && state.alive.panel, zone };
}

/**
 * What one participant's phone shows at time t: their role and controls, the dangers their own
 * presses would cause, the warnings both see, the panel and the crate, the keys, the time left and
 * the outcome. Built only from the Task's own state, which both participants share; nothing here
 * reads Protection or the catch's roll, so neither phone can show them.
 */
export function view(state, seat, t = state.at) {
  const role = roleOf(state, seat);
  if (!role) return null;
  const partner = other(role);
  const h = hazards(state, t);
  const n = next(state, t)[role];
  const p = panelAt(state, t);
  const c = state.crate;
  const done = settled(state, t);
  // A phone that has lost its connection cannot send: its controls are off until it is back.
  const live = state.phase === 'running' && state.alive[role] && state.online[role];
  const landed = c.state === 'landed';
  const key = () => ({ act: KEY, label: state.keys[role] ? 'Key turned' : 'Turn key', enabled: live && done && !state.keys[role], next: live && n === KEY, turned: state.keys[role] });
  let buttons;
  if (role === 'panel') {
    const act = p.locked ? 'release' : 'lock';
    const near = Math.round(p.at);
    const enabled = live && (p.locked ? done && (c.state === 'hanging' || landed) : true);
    const panel = { act, label: p.locked ? 'RELEASE' : 'LOCK', enabled, hazard: enabled && act === 'lock' && h.cut, next: enabled && n === act && (act === 'release' || near === FIXTURES.platform.stop), stop: near };
    buttons = landed ? [key(), panel] : [panel];
  } else if (landed) {
    buttons = [key()];
  } else {
    buttons = [
      { act: 'raise', label: 'Raise', enabled: live && p.locked && done && c.state !== 'hanging', next: live && n === 'raise' },
      { act: 'lower', label: 'Lower', enabled: live && Boolean(h.zone), hazard: live && h.drop, zone: h.zone, next: live && n === 'lower' && h.zone === 'platform' },
    ];
  }
  const warnings = [];
  if (h.cut) warnings.push(role === 'panel' ? 'panel-at-partner-cab' : 'panel-at-your-cab');
  if (h.drop) warnings.push(role === 'winch' ? 'crate-over-partner' : 'crate-over-you');
  return {
    role, roleName: ROLES[role].name, axis: ROLES[role].axis, seat, partnerSeat: state.seats[partner],
    phase: state.phase, you: state.alive[role] ? 'alive' : 'down', partner: state.alive[partner] ? (state.online[partner] ? 'alive' : 'offline') : 'down',
    panel: { locked: p.locked, at: r3(p.at), stop: Math.round(p.at), dir: p.dir },
    crate: { state: c.state, x: r3(crateX(state, t)), settled: done },
    zone: h.zone, buttons, warnings,
    keys: { you: state.keys[role], partner: state.keys[partner], needed: ROLE_KEYS.filter(r => state.alive[r]).length },
    secondsLeft: Math.max(0, Math.ceil((state.deadline - t) / 1000)),
    briefingLeft: state.phase === 'briefing' ? Math.max(0, Math.ceil((state.runningAt - t) / 1000)) : 0,
    outcome: state.outcome,
  };
}
