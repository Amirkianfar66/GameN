// mothership:dev-only
//
// The partner in the playable test (./play.html): a bot that runs the other control on what its own
// phone would show, with a person's reaction time. Not the game: no server and no other player. It
// decides on the Task's own state and functions (./task.mjs); the practice loop (./practice.mjs) sends
// its press after its reaction, and the press reaches the server after the connection's delay, like a
// player's, and is resolved when it arrives.
//
//   careful   presses only when its press, arriving after its reaction and the delay, is right and safe
//   clumsy    the same aim, but its hand is unsteady: a press can land early or late (and kill you), and
//             as the Winch its finger sometimes slips off Hold while the crate moves (and it breaks)
//   betrayer  tries its control's kill once (the Winch: the let-go over the console from the platform
//             stop, which now also breaks the crate and loses the delivery; the Panel: the cut after the
//             landing, which still delivers), then plays on as a careful partner

import { FIXTURES, crateX, landingAt, panelAt, view } from './task.mjs';

export const PERSONAS = Object.freeze({
  careful: Object.freeze({ name: 'Careful', about: 'Times every press well.' }),
  clumsy: Object.freeze({ name: 'Clumsy', about: 'Means well, but sometimes presses too early or too late, or lets go.' }),
  betrayer: Object.freeze({ name: 'Betrayer', about: 'Tries once to kill you.' }),
});

const between = (random, a, b) => a + (b - a) * random();
/** A clumsy hand: its actual reaction strays from the one it aimed by up to ±0.35 s, more often a little. */
const stray = random => (random() + random() + random() - 1.5) * 0.47 * 1000 * 0.5;

/** The zone the crate falls in if a let-go arrives at time a, checked a little either side. */
const landsIn = (state, a, spread = 60) => [a - spread, a, a + spread].map(x => landingAt(crateX(state, x)));
const all = (list, value) => list.every(x => x === value);
/** The stop a LOCK arriving at time a takes, checked a little either side. */
const locksAt = (state, a, spread = 60) => [a - spread, a, a + spread].map(x => panelAt(state, x).stop);

/**
 * The bot's next press at time t, or null to wait: { act, reaction } (the milliseconds until it presses).
 * As the Winch, raise is its finger going down on Hold and lower its finger coming off: between the two
 * it holds, and sends nothing. state: the server's state at t; seat: the bot's; delay: the connection's
 * delay, which the bot allows for; memory: the bot's own notes across calls; random: a [0, 1) source.
 */
export function decide({ state, seat, t, persona = 'careful', delay = 120, memory = {}, random = Math.random }) {
  const v = view(state, seat, t);
  if (v.phase !== 'running' || v.you !== 'alive') return null;
  const b = Object.fromEntries(v.buttons.map(x => [x.act, x]));
  const role = v.role;
  const plat = FIXTURES.platform.stop, cab = FIXTURES.cab.stop;
  const aim = between(random, 150, 260);
  const reaction = persona === 'clumsy' ? Math.max(60, aim + stray(random)) : aim;
  const arrival = t + aim + delay;

  // The Panel's betrayal: after the landing, release the empty hook, lock it over the cab, then the key.
  const betraying = persona === 'betrayer' && !memory.done && role === 'panel' && state.crate.state === 'landed' && state.alive.winch;
  if (betraying) {
    if (b.release?.enabled) return { act: 'release', reaction: between(random, 500, 900) };
    if (b.lock?.enabled && all(locksAt(state, arrival), cab)) { memory.done = true; return { act: 'lock', reaction }; }
    return null;
  }
  if (b.key?.enabled && !b.key.turned) return { act: 'key', reaction: between(random, 500, 900) };

  if (role === 'winch') {
    const hold = b.hold;
    if (!hold?.enabled) return null;
    if (!hold.holding) {
      if (!hold.next) return null;
      // A clumsy finger may slip off Hold once while this crate moves.
      memory.slipAt = persona === 'clumsy' && random() < 0.18 ? t + between(random, 1400, 3400) : null;
      return { act: 'raise', reaction: between(random, 350, 650) };
    }
    if (memory.slipAt && t >= memory.slipAt) { memory.slipAt = null; return { act: 'lower', reaction: 0 }; }
    if (!(state.panel.locked && state.panel.stop === plat)) return null;
    // The Winch's betrayal: from the platform stop, the let-go while the swing is over the console. If the
    // swing has calmed before the chance comes, the betrayer gives up and plays on.
    if (persona === 'betrayer' && !memory.done && state.alive.panel) {
      if (t - state.panel.since > 2600) memory.done = true;
      else {
        if (all(landsIn(state, arrival, 40), 'console')) { memory.done = true; return { act: 'lower', reaction }; }
        return null;
      }
    }
    return all(landsIn(state, arrival), 'platform') ? { act: 'lower', reaction } : null;
  }

  // The Panel: release when it is next; lock where the crate is wanted, over the hatch to fetch one or over the platform.
  if (b.release?.enabled && b.release.next) return { act: 'release', reaction: between(random, 300, 600) };
  if (b.lock?.enabled && all(locksAt(state, arrival), v.goal)) return { act: 'lock', reaction };
  return null;
}
