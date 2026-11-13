// mothership:dev-only
//
// A practice run of the Food Supply Task (./play.html): the design's model (./task.mjs) plays the
// server, with one player and a bot partner (./bot.mjs). Each press reaches the server after the
// connection's delay and is resolved when it arrives, as the real server will; the bot decides on what
// its phone would show. Pure: the page drives it with its clock and draws it; the tests drive it with a
// second bot in the player's place. Not the game: there is no server and no other player.

import { RETURN_AFTER, simulate, startTask, tick, view } from './task.mjs';
import { CAST } from './boards.mjs';
import { decide } from './bot.mjs';

/** The connection between a phone and the server: each press's travel, one way. */
export const NETS = Object.freeze({
  fast: Object.freeze({ name: 'Fast', delay: 40 }),
  normal: Object.freeze({ name: 'Normal', delay: 120 }),
  slow: Object.freeze({ name: 'Slow', delay: 250 }),
});

/** The partner when the player asks to be surprised: mostly careful, sometimes clumsy, now and then a betrayer. */
export const surprise = random => { const r = random(); return r < 0.6 ? 'careful' : r < 0.85 ? 'clumsy' : 'betrayer'; };

/**
 * A practice run. role: the player's control ('winch' | 'panel'); persona: the bot's; net: a NETS key;
 * random: a [0, 1) source (the bot's hand and the catch's rolls). Times are milliseconds from the Task's
 * start. advance(t) moves the run to t; press(act, t) sends the player's press; finger(down, t) is the
 * Winch player's finger on Hold.
 */
export function createPractice({ role = 'winch', persona = 'careful', net = 'normal', random = Math.random } = {}) {
  const seats = { winch: CAST.winch.seat, panel: CAST.panel.seat };
  const botRole = role === 'winch' ? 'panel' : 'winch';
  const delay = NETS[net]?.delay ?? NETS.normal.delay;
  const start = startTask({ seats, at: 0 });
  const arrived = [];
  let pending = [];
  let frames = simulate(start, arrived);
  let made = 0;
  const bot = { scheduled: null, readyAt: 0, memory: {} };
  const you = { inFlight: null, answer: null, presses: 0, refused: 0, finger: false, refusedOn: null };

  const frameAt = t => { let f = frames[0]; for (const x of frames) if (x.at <= t) f = x; else break; return f; };
  const stateAt = t => tick(frameAt(t).state, t).state;

  /** A press leaves its phone at t, made on the revision that phone shows; it arrives after the delay. */
  function send(seat, act, t) {
    const p = { at: t + delay, madeAt: t, seat, act, revision: stateAt(t).revision, commandId: `${seat}-${(made += 1)}`, roll: random() };
    pending.push(p);
    pending.sort((a, b) => a.at - b.at);
    return p;
  }

  function advance(t) {
    const due = pending.filter(p => p.at <= t);
    if (due.length) {
      pending = pending.filter(p => p.at > t);
      arrived.push(...due);
      frames = simulate(start, arrived);
      for (const p of due) {
        if (p.seat !== seats[role]) continue;
        const events = frames.find(f => f.step === p)?.events ?? [];
        const refused = events.find(e => e.type === 'REFUSED');
        you.answer = { act: p.act, at: p.at, refused: refused?.why ?? null };
        if (refused) you.refused += 1;
        // A hold refused on this revision is not sent again until the crane changes.
        if (refused && p.act === 'raise') you.refusedOn = p.revision;
        if (you.inFlight === p) you.inFlight = null;
      }
    }
    // The finger still on Hold: it lifts the crate as soon as the hook is over it.
    if (you.finger) hold(t);
    const state = stateAt(t);
    if (state.phase === 'running' && state.alive[botRole]) {
      if (bot.scheduled && t >= bot.scheduled.at) {
        const sent = send(seats[botRole], bot.scheduled.act, bot.scheduled.at);
        bot.scheduled = null;
        bot.readyAt = sent.at + 120;
      } else if (!bot.scheduled && t >= bot.readyAt) {
        const d = decide({ state, seat: seats[botRole], t, persona, delay, memory: bot.memory, random });
        if (d) bot.scheduled = { act: d.act, at: t + d.reaction };
      }
    }
    return { state, frames };
  }

  /** The player's press at t. While one is on its way every control waits: nothing more is sent. */
  function press(act, t) {
    if (you.inFlight) return null;
    you.presses += 1;
    you.inFlight = send(seats[role], act, t);
    return you.inFlight;
  }

  /** A hold, while the finger is down and the phone shows Hold ready: sent once per revision the phone shows. */
  function hold(t) {
    if (!you.finger || you.inFlight) return null;
    const state = stateAt(t);
    const b = view(state, seats[role], t)?.buttons.find(x => x.act === 'hold');
    if (!b?.enabled || b.holding || you.refusedOn === state.revision) return null;
    you.presses += 1;
    you.inFlight = send(seats[role], 'raise', t);
    return you.inFlight;
  }

  /**
   * The Winch player's finger on Hold (the owner, 13 November 2026): down, it sends a hold (or sends it as
   * soon as the hook is over the crate); off, it sends the let-go at once, even while its hold is still on
   * its way, whenever the crate may be held for it. A let-go is never held back.
   */
  function finger(down, t) {
    if (role !== 'winch' || down === you.finger) return null;
    you.finger = down;
    if (down) { you.refusedOn = null; return hold(t); }
    const state = stateAt(t);
    const holdOnItsWay = pending.some(p => p.seat === seats[role] && p.act === 'raise');
    if (!holdOnItsWay && !(state.crate.state === 'hanging' && state.crate.holder === 'winch')) return null;
    you.presses += 1;
    you.inFlight = send(seats[role], 'lower', t);
    return you.inFlight;
  }

  /** What happened, for the result screen: from the server's own record of the run. */
  function summary() {
    const end = frames[frames.length - 1].state;
    const final = tick(end, RETURN_AFTER).state;
    const events = frames.flatMap(f => f.events);
    return {
      outcome: final.outcome,
      alive: { ...final.alive },
      kills: events.filter(e => e.type === 'KILLED').map(e => ({ kind: e.kind, by: e.by, victim: e.victim })),
      stops: events.filter(e => e.type === 'STOPPED').map(e => ({ kind: e.kind, by: e.by })),
      sentAt: events.find(e => e.type === 'SENT')?.t ?? null,
      broken: final.broken.length,
      presses: you.presses,
      refused: you.refused,
    };
  }

  return {
    role, botRole, persona, delay, seats, start, returnsAt: start.returnsAt,
    advance, press, finger, summary,
    get frames() { return frames; },
    get holding() { return you.finger; },
    get inFlight() { return you.inFlight; },
    get answer() { return you.answer; },
  };
}
