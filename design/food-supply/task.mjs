// mothership:dev-only
//
// The Food Supply Task: what the machine in the Supply Room does with each participant's input.
// A design reference for the owner, Frontend, Backend and Game Balance (11 November 2026), in no
// release: the server decides every outcome, and this module only fixes the design's geometry and
// cause and effect so that the storyboards, the phones, the handoff and its tests agree. It is not
// the engine and it decides nothing for a match.
//
// The owner's confirmed rules it follows (docs/design/owner-decisions.md, 11 November 2026):
//  - Two participants: a Volunteer and the Partner they select. One controls vertical movement,
//    the other horizontal movement.
//  - Either can betray the other with the same control: the vertical one by dropping the crate
//    onto the other player, the horizontal one by driving a moving panel into them. There is no
//    attack button, trigger, confirmation or armed mode, and no escape. An unblocked attack is
//    lethal and does not send its victim to Hospital. Protection applies.
//  - Each player has one attack opportunity for the whole match, and a blocked attack uses it up
//    (the owner's answers, the same day). The server holds it across Tasks and passes it in.
//  - After a partner dies, the survivor can complete the delivery alone if the crate is in the
//    correct position; otherwise the Task is lost. A disconnect cancels the Task.
//  - A delivery adds five packages to the food stock.
//
// The design (docs/design/food-supply.md): a gantry crane in a side view of the Supply Room, seven
// columns across and four rows of height. The Hoist operator works the winch from a cab hung at
// the left end of the rail; the Boom operator drives the gantry from a pulpit under the middle of
// the route. The crate rises out of the intake hatch, clears the rib, passes over the Boom
// operator and is lowered into the galley lift's cradle; then both turn their keys and it goes up.
// The correct position for a survivor is the cradle: there, the crate is clamped and both
// mechanisms are free, and a survivor's key alone sends it.
//
// Choices marked PROPOSED are the design's, for review; the rest follows the confirmed rules.

/** The machine's plane: columns across (0 at the cab, 6 at the galley lift) and rows of height (0 on the deck). */
export const GRID = Object.freeze({ cols: 7, rows: 4 });

/** What stands in each column, and why it matters. */
export const FIXTURES = Object.freeze({
  cab: Object.freeze({ col: 0, rows: [2, 3], about: "The Hoist operator's cab, hung from the left end of the rail. The gantry's bumper plate reaches it only when the gantry is driven into column 0: the ram." }),
  buffer: Object.freeze({ col: 1, about: "The cab's door: the gantry here is one step from the ram. The cab's lamp lights on both phones." }),
  intake: Object.freeze({ col: 2, row: 0, about: 'The intake hatch in the deck: the supply crate rises out of it on the hook. The gantry starts above it.' }),
  rib: Object.freeze({ col: 3, rows: [0, 1, 2], about: 'A hull rib: the crate passes column 3 only at the top row.' }),
  pulpit: Object.freeze({ col: 4, rows: [0, 1, 2], head: 2, about: "The Boom operator's drive pulpit, a raised platform under the rail: the operator's head reaches row 2. Lowering the crate from row 3 here drops it on them: the drop." }),
  open: Object.freeze({ col: 5, about: 'Open deck: the crate may be lowered here.' }),
  cradle: Object.freeze({ col: 6, row: 1, about: "The galley lift's cradle: lowering the crate into it docks it. The correct position for a survivor." }),
  liftBase: Object.freeze({ col: 6, row: 0, about: "The lift's machinery, under the cradle." }),
  stop: Object.freeze({ col: 6, about: "The rail's end stop, with the Boom operator's key lever: driving into it with the crate docked turns that key." }),
});

/** Who controls what. The axis decides the attack: the Hoist drops, the Boom rams. */
export const ROLES = Object.freeze({
  hoist: Object.freeze({ name: 'Hoist', axis: 'vertical', dirs: ['up', 'down'], station: 'cab', attack: 'drop', about: 'Raises and lowers the crate from the cab at the left end of the rail' }),
  boom: Object.freeze({ name: 'Boom', axis: 'horizontal', dirs: ['left', 'right'], station: 'pulpit', attack: 'ram', about: 'Drives the gantry along the rail from the pulpit in the middle of the room' }),
});

/** The cooperative route, the fewest presses: lift it, drive it across, lower it in, both keys. */
export const ROUTE = Object.freeze([
  ...Array(3).fill({ role: 'hoist', dir: 'up' }),
  ...Array(4).fill({ role: 'boom', dir: 'right' }),
  ...Array(2).fill({ role: 'hoist', dir: 'down' }),
  { role: 'hoist', dir: 'up', key: true },
  { role: 'boom', dir: 'right', key: true },
].map(Object.freeze));

/**
 * Timing, in milliseconds. PROPOSED, for Game Balance to tune: none of these is a confirmed rule.
 * step: one move's animation; interval: the shortest time between one participant's accepted moves
 * (holding a button repeats at this rate); briefing: who controls what, before the controls work;
 * deadline: the time to deliver, from the end of the briefing; grace: how long a participant may
 * be out of contact before the Task is cancelled (see the rule conflict in food-supply.md); ending:
 * the outcome card before the return; answer: how long an asked Partner has to join or decline before
 * no answer counts as a decline.
 */
export const TIMING = Object.freeze({ step: 240, interval: 300, briefing: 4000, deadline: 45000, grace: 8000, ending: 2500, answer: 15000 });

/** Food: five packages to start (shown by the ship-life capsules), five per delivery, a warning at one. Confirmed. */
export const FOOD = Object.freeze({ initial: 5, perDelivery: 5, warnAt: 1 });

const START = Object.freeze({ carriage: 2, crate: Object.freeze([2, 0]) });

// The crate rests on the deck only in the intake hatch, where it starts: everywhere else row 0 is
// below its reach, and while it sits in the hatch the gantry cannot drag it.
const isRib = (c, r) => c === FIXTURES.rib.col && r <= 2;
const isPulpit = (c, r) => c === FIXTURES.pulpit.col && r <= 2;
const isLiftBase = (c, r) => c === FIXTURES.liftBase.col && r === FIXTURES.liftBase.row;

const other = role => (role === 'hoist' ? 'boom' : 'hoist');
const clone = state => JSON.parse(JSON.stringify(state));

/**
 * A new Task. seats: { hoist, boom } (player numbers). attack: whether each still has their one
 * attack opportunity for the match, as the server holds it (a kill or a blocked attack in an earlier
 * Task has used it up). protection: whether each is Protected now, as the existing rules decide.
 * at: the Task's start on the game's clock.
 */
export function startTask({ seats, attack = { hoist: true, boom: true }, protection = { hoist: false, boom: false }, at = 0 } = {}) {
  if (!seats?.hoist || !seats?.boom || seats.hoist === seats.boom) throw new Error('A Task needs two different participants');
  return {
    phase: 'briefing', at, startedAt: at, runningAt: at + TIMING.briefing, deadline: at + TIMING.briefing + TIMING.deadline,
    seats: { ...seats },
    alive: { hoist: true, boom: true },
    online: { hoist: true, boom: true }, offlineSince: { hoist: null, boom: null },
    attack: { ...attack }, protection: { ...protection },
    carriage: START.carriage, crate: [...START.crate], docked: false,
    keys: { hoist: false, boom: false },
    lastMove: { hoist: -Infinity, boom: -Infinity },
    outcome: null, endedAt: null,
  };
}

/** The role of a seat in this Task, or null. */
export const roleOf = (state, seat) => (state.seats.hoist === seat ? 'hoist' : state.seats.boom === seat ? 'boom' : null);

function end(state, outcome, at, events) {
  state.phase = 'ended'; state.outcome = outcome; state.endedAt = at;
  events.push({ type: 'ENDED', outcome: { ...outcome } });
}

/** The crate is lost if the partner died while it was not in the cradle. */
function afterDeath(state, at, events) {
  if (!state.docked) end(state, { result: 'lost', why: 'not-in-cradle' }, at, events);
}

/** Send when every living participant has turned their key. */
function trySend(state, at, events) {
  const needed = ['hoist', 'boom'].filter(role => state.alive[role]);
  if (needed.length && needed.every(role => state.keys[role])) {
    events.push({ type: 'SENT', by: needed });
    end(state, { result: 'delivered', packages: FOOD.perDelivery, alone: needed.length === 1 }, at, events);
  }
}

/** An attack: lethal unless the victim is Protected; a participant without an opportunity is stopped as if blocked. */
function attackMove(state, role, at, events, { lethal, stopped }) {
  const victim = other(role);
  const kind = ROLES[role].attack;
  if (!state.attack[role] || state.protection[victim]) {
    // The same safety catch either way: nothing outside the server tells a Protection block from
    // a participant whose opportunity is already spent. A blocked attack uses the opportunity up.
    if (state.attack[role] && state.protection[victim]) state.attack[role] = false;
    stopped();
    events.push({ type: 'STOPPED', kind, by: role, at: [...state.crate], carriage: state.carriage });
    return;
  }
  state.attack[role] = false;
  state.alive[victim] = false;
  state.keys[victim] = false;
  lethal();
  events.push({ type: 'KILLED', kind, by: role, victim, at: [...state.crate], carriage: state.carriage, docked: state.docked });
  afterDeath(state, at, events);
}

/** Why a move is refused, or null. */
export function refusal(state, role, at) {
  if (state.phase === 'ended') return 'ended';
  if (state.phase === 'briefing' && at < state.runningAt) return 'briefing';
  if (!role) return 'not-a-participant';
  if (!state.alive[role]) return 'down';
  if (at - state.lastMove[role] < TIMING.interval) return 'too-soon';
  return null;
}

/**
 * One participant's press. dir: 'up' | 'down' for the Hoist, 'left' | 'right' for the Boom.
 * shown: whether the pressed button showed the attack warning on the presser's phone when pressed
 * (omitted: as if it did). repeat: whether the press is a hold's repeat rather than a fresh press.
 * PROPOSED (deliberate attacks only): a press attacks only if it is a fresh press on a button that
 * showed the warning; otherwise, when it would attack, it is refused (REFUSED stale or repeat), so a
 * network race or a held button never kills by accident. Neither flag can start an attack the
 * server's own state does not allow: each can only stop the presser's own.
 * Returns { state, events }: MOVED, BUMPED (why), DOCKED, KEY, KEY_RELEASED, STOPPED, KILLED, SENT,
 * ENDED, or REFUSED (why) when the press does nothing at all.
 */
export function act(prev, { seat, dir, at, shown, repeat = false }) {
  let { state, events } = tick(prev, at);
  state = clone(state);
  const role = roleOf(state, seat);
  const why = refusal(state, role, at);
  if (why) return { state, events: [...events, { type: 'REFUSED', seat, dir, why }] };
  if (!ROLES[role].dirs.includes(dir)) return { state, events: [...events, { type: 'REFUSED', seat, dir, why: 'not-your-axis' }] };
  const h = hazards(state);
  const attacks = (role === 'hoist' && dir === 'down' && h.drop) || (role === 'boom' && dir === 'left' && h.ram);
  if (attacks && shown === false) return { state, events: [...events, { type: 'REFUSED', seat, dir, why: 'stale' }] };
  if (attacks && repeat) return { state, events: [...events, { type: 'REFUSED', seat, dir, why: 'repeat' }] };
  state.lastMove[role] = at;
  const [c, r] = state.crate;
  const bump = reason => events.push({ type: 'BUMPED', by: role, dir, why: reason, at: [...state.crate], carriage: state.carriage });
  const move = (to, carriage = state.carriage) => {
    events.push({ type: 'MOVED', by: role, dir, from: { crate: [...state.crate], carriage: state.carriage }, to: { crate: [...to], carriage } });
    state.crate = [...to]; state.carriage = carriage;
  };

  if (role === 'hoist') {
    if (state.docked) {
      if (dir === 'up') {
        if (!state.keys.hoist) { state.keys.hoist = true; events.push({ type: 'KEY', by: 'hoist' }); trySend(state, at, events); }
        else bump('key-turned');
      } else bump('cradle');
      return { state, events };
    }
    if (dir === 'up') {
      if (r >= GRID.rows - 1) bump('rail'); else move([c, r + 1]);
    } else if (r === 0) bump('deck');
    else if (c === FIXTURES.pulpit.col && r - 1 === FIXTURES.pulpit.head) {
      attackMove(state, role, at, events, { lethal: () => move([c, FIXTURES.pulpit.head]), stopped: () => {} });
    } else if (isRib(c, r - 1)) bump('rib');
    else if (isLiftBase(c, r - 1)) bump('lift');
    else if (c === FIXTURES.cradle.col && r - 1 === FIXTURES.cradle.row) {
      move([c, r - 1]); state.docked = true; events.push({ type: 'DOCKED' });
    } else if (r - 1 === 0 && c !== FIXTURES.intake.col) bump('deck');
    else move([c, r - 1]);
    return { state, events };
  }

  // The Boom: the gantry, with the crate on the hook unless it is docked.
  const to = state.carriage + (dir === 'right' ? 1 : -1);
  if (dir === 'right' && state.carriage === FIXTURES.stop.col) {
    if (state.docked && !state.keys.boom) { state.keys.boom = true; events.push({ type: 'KEY', by: 'boom' }); trySend(state, at, events); }
    else bump(state.docked ? 'key-turned' : 'stop');
    return { state, events };
  }
  if (to < 0) { bump('wall'); return { state, events }; }
  if (to === FIXTURES.cab.col && !state.alive.hoist) {
    // The Hoist is already out, so the crate is docked (otherwise the Task has ended): the crushed cab is no hazard.
    move(state.crate, to);
    return { state, events };
  }
  if (to === FIXTURES.cab.col) {
    // The ram: the bumper plate into the cab, the crate with it unless docked.
    const crateTo = state.docked ? state.crate : [to, r];
    attackMove(state, role, at, events, { lethal: () => move(crateTo, to), stopped: () => {} });
    return { state, events };
  }
  if (state.docked) {
    if (state.keys.boom && state.carriage === FIXTURES.stop.col) { state.keys.boom = false; events.push({ type: 'KEY_RELEASED', by: 'boom' }); }
    move(state.crate, to);
    return { state, events };
  }
  if (r === 0) bump('in-intake');
  else if (isRib(to, r)) bump('rib');
  else if (isPulpit(to, r)) bump('pulpit');
  else if (isLiftBase(to, r)) bump('lift');
  else move([to, r], to);
  return { state, events };
}

/** The game's clock moves on: the briefing ends, the deadline passes, a participant stays out of contact. */
export function tick(prev, at) {
  const state = clone(prev);
  const events = [];
  state.at = Math.max(state.at, at);
  if (state.phase === 'ended') return { state, events };
  if (state.phase === 'briefing' && at >= state.runningAt) { state.phase = 'running'; events.push({ type: 'RUNNING' }); }
  for (const role of ['hoist', 'boom']) {
    if (state.alive[role] && !state.online[role] && at - state.offlineSince[role] >= TIMING.grace) {
      end(state, { result: 'cancelled', why: 'disconnect', who: role }, state.offlineSince[role] + TIMING.grace, events);
      return { state, events };
    }
  }
  if (at >= state.deadline) end(state, { result: 'lost', why: 'time' }, state.deadline, events);
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
 * Run a list of steps from a start: { at, seat, dir } presses, { at, seat, online } connection
 * changes and { at } clock ticks. Returns every state with the events that led to it.
 */
export function simulate(start, steps) {
  const frames = [{ at: start.at, state: start, events: [] }];
  let state = start;
  for (const step of steps) {
    const result = step.dir ? act(state, step) : step.online !== undefined ? connection(state, step) : tick(state, step.at);
    state = result.state;
    frames.push({ at: step.at, state, events: result.events, step });
  }
  return frames;
}

/** The press the cooperative route asks of each role next, or null: what both phones light up. */
export function hint(state) {
  const none = { hoist: null, boom: null };
  if (state.phase === 'ended') return none;
  const [c, r] = state.crate;
  const out = { hoist: null, boom: null };
  if (state.docked) {
    if (state.alive.hoist && !state.keys.hoist) out.hoist = { dir: 'up', key: true };
    if (state.alive.boom && !state.keys.boom) out.boom = { dir: 'right', key: state.carriage === FIXTURES.stop.col };
    return out;
  }
  if (c < FIXTURES.cradle.col) {
    if (r < GRID.rows - 1 && c <= FIXTURES.rib.col) out.hoist = { dir: 'up' };
    else out.boom = { dir: 'right' };
  } else if (r > FIXTURES.cradle.row) out.hoist = { dir: 'down' };
  return out;
}

/** The positions that are one press from an attack, by whose press and which. */
export function hazards(state) {
  const [c, r] = state.crate;
  return {
    drop: state.alive.boom && !state.docked && c === FIXTURES.pulpit.col && r === FIXTURES.pulpit.head + 1,
    ram: state.alive.hoist && state.carriage === FIXTURES.buffer.col,
  };
}

const LABEL = { up: 'Raise', down: 'Lower', left: 'Left', right: 'Right' };
const ICON = { up: 'arrow-up', down: 'arrow-down', left: 'arrow-left', right: 'arrow-right' };

/**
 * What one participant's phone shows: their role and controls, the hazards their own presses
 * would set off, the warnings both see, the keys, the time left and the outcome. Built only from
 * the Task's own state, which both participants share; nothing here reads an attack opportunity
 * or Protection, so neither phone can show them.
 */
export function view(state, seat, at = state.at) {
  const role = roleOf(state, seat);
  if (!role) return null;
  const partner = other(role);
  const h = hazards(state);
  const next = hint(state)[role];
  const buttons = ROLES[role].dirs.map(dir => {
    const key = state.docked && ((role === 'hoist' && dir === 'up') || (role === 'boom' && dir === 'right' && state.carriage === FIXTURES.stop.col));
    const hazard = (role === 'hoist' && dir === 'down' && h.drop) || (role === 'boom' && dir === 'left' && h.ram);
    const enabled = state.phase === 'running' && state.alive[role] && !(state.docked && role === 'hoist' && dir === 'down') && !(key && state.keys[role]);
    return { dir, label: key ? (state.keys[role] ? 'Key turned' : 'Turn key') : LABEL[dir], icon: key ? 'key' : ICON[dir], key, hazard, enabled, next: Boolean(next && next.dir === dir) };
  });
  const warnings = [];
  if (h.drop) warnings.push(role === 'hoist' ? 'crate-over-partner' : 'crate-over-you');
  if (h.ram) warnings.push(role === 'boom' ? 'bumper-at-partner-cab' : 'bumper-at-your-cab');
  return {
    role, roleName: ROLES[role].name, axis: ROLES[role].axis, seat, partnerSeat: state.seats[partner],
    phase: state.phase, you: state.alive[role] ? 'alive' : 'down', partner: state.alive[partner] ? (state.online[partner] ? 'alive' : 'offline') : 'down',
    buttons, warnings, docked: state.docked,
    keys: { you: state.keys[role], partner: state.keys[partner], needed: ['hoist', 'boom'].filter(r => state.alive[r]).length },
    secondsLeft: state.phase === 'briefing' ? Math.ceil(TIMING.deadline / 1000) : Math.max(0, Math.ceil((state.deadline - at) / 1000)),
    briefingLeft: state.phase === 'briefing' ? Math.max(0, Math.ceil((state.runningAt - at) / 1000)) : 0,
    outcome: state.outcome,
  };
}
