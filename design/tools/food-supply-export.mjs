// mothership:dev-only
//
// The Food Supply Task's handoff for Frontend, Backend and Game Balance (docs/design/food-supply.md),
// written from the package's own modules so that it cannot drift from them:
//   design/food-supply/art/supply-room.back.svg   the Supply Room's still picture, inked in the crew's hand
//   design/food-supply/handoff.json               the plane, stops, regions, the crane's mechanics, controls,
//                                                 timing, motion cues, state, events, projection, visibility,
//                                                 acceptance scenarios, rule conflicts and open items
// A design proposal on synthetic fixtures (11 November 2026), in no release: nothing here is in the game.
//
// Usage: node design/tools/food-supply-export.mjs [--check]
//   --check: builds both files and compares them with the files on disk; writes nothing; exits 1 on any difference.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATCH, FIXTURES, FOOD, ROLES, ROUTE, STOPS, SWING, TIMING, ZONES } from '../food-supply/task.mjs';
import { BLADE, BOX, BOXES, CARRIAGE, CRATE, DECK, HANG, OPERATORS, PENDULUM, RAIL, REGIONS, REST, STEP, TAGS, VIEW, X0 } from '../food-supply/layout.mjs';
import { FAMILY, supplyRoomSvg } from '../food-supply/room.mjs';
import { AMBER } from '../food-supply/machine.mjs';
import { CUES } from '../food-supply/stage.mjs';
import { BOARDS, CAST } from '../food-supply/boards.mjs';
import { SCENARIOS } from '../food-supply/scenarios.mjs';
import { CONFLICTS, OPEN_ITEMS, RULES, VISIBILITY } from '../food-supply/rules.mjs';

const ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const ART = 'design/food-supply/art/supply-room.back.svg';
const OUT = 'design/food-supply/handoff.json';
const sha = text => createHash('sha256').update(text).digest('hex');
const shaOf = path => sha(readFileSync(resolve(ROOT, path)));

/** The base this proposal was designed on, and the ruleset in force there. */
export const BASE = Object.freeze({
  commit: '8cbe5e896e2fa84f8d7c9df8da0b21cc9d55359d',
  ruleset: Object.freeze({
    authority: 'rules/planet-successor-blackout-before-vote-authority-2026-11-10.json',
    rulesetVersion: 'in-person-planet-blackout-before-vote-2026-11-10',
    engineVersion: 'planet-game-1.3.0',
    overlay: 'rules/overlays/planet-blackout-before-vote-owner-decision-2026-11-10.json',
    successor: 'rules/planet-successor-authority-2026-11-05.json (in-person-planet-2026-11-05)',
  }),
  owner: "docs/design/owner-decisions.md, 11 November 2026: the Food Supply Task's confirmed highlights, the owner's answers, and the owner's crane",
  note: 'At this commit no Task, Food or Supply Room rule exists under rules/: the owner\'s 11 November decisions are the only rule source for this Task. Backend versions any adoption.',
});

const SOURCES = ['task.mjs', 'layout.mjs', 'room.mjs', 'machine.mjs', 'scene.mjs', 'stage.mjs', 'boards.mjs', 'scenarios.mjs', 'hints.mjs', 'rules.mjs', 'phone.mjs', 'phone.css'].map(f => `design/food-supply/${f}`);
const KEYS = { raise: 'ArrowUp', lower: 'ArrowDown', release: 'Space', lock: 'Space', key: 'Enter' };
const LABELS = { raise: 'Raise', lower: 'Lower', release: 'RELEASE', lock: 'LOCK', key: 'Turn key' };

/** The Task's server-held state: each field and who may see it. */
const STATE = [
  ['phase', "'briefing' | 'running' | 'ended'", 'participants'],
  ['seats', '{ winch, panel }: the participants\' player numbers', 'participants'],
  ['panel', '{ locked, stop } locked at a stop (0 to 6), or { locked: false, from, dir, since } running: its place at time t is sweep(from, dir, t − since)', 'participants'],
  ['crate', "{ state: 'intake' | 'hanging' | 'deck' | 'fallen' | 'landed' | 'sent', x, since, from }: where it lies (x, a fractional stop), or hanging under the panel; since and from time its last move", 'participants'],
  ['swing', '{ since, amp, dir } while the crate hangs under a locked panel: its offset at time t is swingOffset(swing, t)', 'participants'],
  ['keys', '{ winch, panel }: each key turned', 'participants'],
  ['alive', '{ winch, panel }', 'participants (deaths become public as any death does, on the return)'],
  ['online', '{ winch, panel }: as the server observes the connection', 'participants'],
  ['deadline', 'the game-clock time the Task is lost: TIMING.deadline (30 s, the owner\'s) after it starts, the briefing included', 'participants'],
  ['outcome', "{ result: 'delivered' (packages, alone) | 'lost' (why: 'not-in-position' | 'time') | 'cancelled' (why: 'disconnect', who) }", 'participants; PROPOSED public: delivered or not'],
  ['changedAt', 'the time of the last change to the crane (a raise, a release, a lock, a lower): a press made on an older picture is stale', 'the server only'],
  ['protection', '{ winch, panel }: whether each is Protected, as the existing rules decide', 'the server only'],
].map(([field, holds, seenBy]) => ({ field, holds, seenBy }));

/** The events the server sends the two participants, in order, with each press's result. */
const EVENTS = [
  ['RUNNING', '', 'The briefing ended; the controls work.'],
  ['RAISED', 'by, from (intake | deck | fallen), x', 'The crate slides under the hook and rises; it hangs, settled, TIMING.raise later, with a small swing.'],
  ['RELEASED', 'by, from (stop), dir', 'The blade lifts and the panel runs from that stop: both phones animate sweep(from, dir, t − at).'],
  ['LOCKED', 'by, stop, dir, at (where the panel was, a fractional stop)', 'The blade drops at the nearest stop; with the crate hanging, it starts to swing: amp SWING.lock, in dir (back off the rail\'s end at stop 1 or 7).'],
  ['LOWERED', "by, x, to ('platform' | 'console' | 'intake' | 'deck')", 'The winch lets the crate fall from where its swing has it; the result follows at once.'],
  ['LANDED', '', 'Onto the platform: the jaws close and the hook is free. The correct position. The keys work.'],
  ['MISSED', "on ('deck' | 'intake' | 'fallen'), x", 'Anywhere else: CLUNK. The crate lies on its hook; the Winch raises it again.'],
  ['STOPPED', "kind ('cut' | 'drop'), by", 'A lethal press that did not kill: the partner is Protected, or the catch held by luck (1 in 4). Identical either way, and whether or not it was meant.'],
  ['KILLED', "kind ('cut' | 'drop'), by, victim", 'A lethal press: the cut (a lock at stop 7) or the drop (a Lower over the console). Lethal, no escape, not the Hospital. Not an attack: it uses nothing (the owner).'],
  ['KEY', 'by', 'A key turned, once landed.'],
  ['SENT', 'by (the living participants)', 'Every living participant\'s key is turned: the lift takes the crate down to the galley.'],
  ['OFFLINE', 'who', 'The server lost a participant\'s connection; the Task goes on.'],
  ['ONLINE', 'who', 'Back within the grace: nothing paused.'],
  ['ENDED', 'outcome', 'Delivered, lost or cancelled. The outcome card shows, then the return.'],
  ['REFUSED', 'seat, act, why (briefing | ended | down | not-a-participant | not-your-control | late | stale | busy | crate-down | unlocked | locked | up | down-already | landed | not-landed | turned)', 'The press did nothing; only the presser is told, and the phone shows the current state.'],
].map(([type, fields, about]) => ({ type, fields, about, seenBy: type === 'REFUSED' ? 'the presser' : 'both participants' }));

/** One participant's projection (task.mjs view()): what their phone is built from. */
const PROJECTION = [
  ['role, roleName, axis', 'Their own control: the Winch (vertical) or the Panel (horizontal).'],
  ['partnerSeat', 'The other participant.'],
  ['phase', "'briefing' | 'running' | 'ended'"],
  ['you, partner', "'alive' | 'down'; the partner also 'offline'."],
  ['panel { locked, at, stop, dir }', 'Where the panel is now (a fractional stop), its nearest stop, and its direction.'],
  ['crate { state, x, settled }', 'Where the crate is now along the rail (a fractional stop), and whether its last move has finished.'],
  ['zone', "Where a Lower would put the crate now: 'platform' | 'console' | 'intake' | 'deck', or null when it cannot be lowered."],
  ['buttons[]', '{ act, label, enabled, next, hazard, zone, stop, turned }: the participant\'s own buttons. hazard: this press would kill the partner now. next: the cooperative route asks for it now.'],
  ['warnings[]', "'panel-at-partner-cab' | 'panel-at-your-cab' | 'crate-over-partner' | 'crate-over-you': both participants see each danger while it lasts."],
  ['keys { you, partner, needed }', 'The keys; needed counts the living participants.'],
  ['secondsLeft, briefingLeft', 'The Task\'s time left; the briefing\'s countdown.'],
  ['outcome', 'Once ended.'],
].map(([fields, about]) => ({ fields, about })).concat([{ fields: '(never)', about: 'Protection, the catch\'s roll, the other participant\'s refusals, why a STOPPED happened, and whether a lethal press was meant: no phone can show them.' }]);

/** Asking a Partner: proposals for the shared contract, around the owner's decision that a Partner can decline. */
const ASK = {
  commands: [
    { name: 'TASK_ASK { kind: "food", partner }', from: 'the Volunteer', about: 'Ask one player. Refused if the Volunteer has used their initiation, or the player cannot be asked.' },
    { name: 'TASK_ANSWER { askId, join }', from: 'the asked player', about: `Join or decline, within ${TIMING.answer / 1000} s (PROPOSED); no answer is a decline.` },
    { name: 'TASK_ASK_WITHDRAW { askId }', from: 'the Volunteer', about: 'Cancel while waiting; nothing is used.' },
  ],
  events: [
    { type: 'TASK_ASKED', to: 'the asked player', about: 'Who asks, and the time to answer.' },
    { type: 'TASK_DECLINED', to: 'the Volunteer', about: 'Declined or no answer. The Volunteer asks someone else or closes.' },
    { type: 'TASK_STARTED', to: 'both', about: 'Joined: the roles, then the briefing. Every board now shows the two places empty.' },
  ],
  visibility: 'PROPOSED: private to the two. Other players learn nothing until the Task starts, and then only that two players are away (the board shows who).',
};

const COMMAND = {
  name: 'TASK_PRESS (a proposal for the shared contract; Integration owns packages/contracts/)',
  fields: [
    { field: 'taskId', about: 'The Task in progress.' },
    { field: 'act', about: "'raise' | 'lower' (the Winch), 'release' | 'lock' (the Panel), 'key' (either, once landed). The phone sends the act its button showed, so a double tap on LOCK never releases the panel." },
    { field: 'at', about: 'PROPOSED: the moment of the press on the server\'s clock, as the phone showed it (the phone keeps the server\'s clock, as serverTimeMs already lets it). The server resolves the press at `at` if it arrives within TIMING.lag of it and nothing has changed since (changedAt); otherwise REFUSED late or stale.' },
    { field: '(no roll)', about: 'The catch\'s roll is the server\'s own random number for a press that would kill; the phone never sends or sees it.' },
  ],
  answer: 'The new revision of the Task state with the events, to both participants; REFUSED to the presser only.',
};

/** The crane's motion, as functions of time that the server and both phones compute alike. */
const MECHANICS = {
  stops: { count: STOPS, x: `x = ${X0} + ${STEP} × stop in the picture (stop 0 to 6, painted 1 to 7)`, fixtures: FIXTURES },
  sweep: {
    rule: `sweep(from, dir, dt): the panel runs end to end and back at TIMING.stop = ${TIMING.stop} ms a stop. Unfold the bounce: u = (dir > 0 ? from : 12 − from) + dt / ${TIMING.stop}, taken modulo 12; at = u ≤ 6 ? u : 12 − u, moving right while u ≤ 6.`,
    lock: 'A lock takes the nearest stop, Math.round(at): stop 7 (the cut) from half way between 6 and 7. A release starts from the locked stop in the direction the panel last moved (right from stop 1, left from stop 7).',
    proposed: true,
  },
  swing: {
    ...SWING,
    rule: 'swingOffset(t) = dir × a × sin(2π (t − since) / period), with a = least + (amp − least) × e^(−(t − since) / settle), in stops along the rail. A lock with the crate hanging starts amp = SWING.lock in the panel\'s direction (back off the rail\'s end at stop 1 or 7); a raise ends in amp = SWING.lift, starting when it settles.',
    drawing: `The crate on its cable from the sheave at y ${CARRIAGE.pivot}: a pendulum ${PENDULUM} px long, angle asin(offset × ${STEP} / ${PENDULUM}), the crate tilted with its cable. Reduce motion: the same offset along the rail, upright and level.`,
    proposed: true,
  },
  landing: { zones: ZONES, rule: "landingAt(x): within ZONES.platform of stop 6 'platform' (lands), within ZONES.console of stop 5 'console' (the drop), within ZONES.intake of stop 1 'intake', otherwise 'deck' (a miss).", proposed: true },
  correctPosition: 'Over the platform: the crate landed, or still on the hook of the panel locked at stop 6. A death anywhere else loses the Task at once.',
  interlocks: [
    'Raise and Lower work only with the panel locked; Lower only with the crate up and settled.',
    'RELEASE works only with the crate up and settled, or once it has landed (the empty hook).',
    'The keys work only once the crate has landed; a turned key stays turned (PROPOSED).',
  ],
  kills: 'A kill on the Task is not an attack (the owner, 12 November 2026): the Task never reads or spends an attack opportunity, and nothing limits how often a player kills on Tasks. A lethal press is stopped if the partner is Protected, or by the catch\'s luck: the server rolls for each lethal press, and below CATCH.luck the catch holds (the owner: 25%). Otherwise it kills.',
  catch: { ...CATCH, confirmed: true, rule: 'roll < CATCH.luck: STOPPED, the same CLANK! as Protection; a Protected participant is always stopped, whatever the roll.' },
};

export function build(artText) {
  const controls = Object.fromEntries(Object.entries(ROLES).map(([role, r]) => [role, {
    axis: r.axis, station: r.station, kill: r.kill, about: r.about,
    buttons: [...r.acts, 'key'].map(act => ({ act, label: LABELS[act], keyboard: KEYS[act] })),
    layout: role === 'winch' ? 'Raise above Lower, under the swing meter; once landed, the key in their place.' : 'One big button, RELEASE or LOCK, under the sweep strip; once landed, the key above it and RELEASE smaller.',
    hazard: role === 'winch' ? "While the swing has the crate over the Panel operator, Lower is striped and says 'Falls on <name>'." : "While the panel passes the cab's stop, LOCK is striped and says 'Here it cuts <name>'.",
    says: role === 'winch' ? "Lower says what it would do now: 'Onto the platform' (glowing), 'Falls on <name>' (striped), 'Misses: wait', 'Back into the hatch'." : "LOCK says where it would stop: 'Stops it at 6: the platform' (glowing), 'Here it cuts <name>' (striped), 'Stops it over you', 'Stops it at <n>'.",
  }]));
  return {
    schema: 'mothership.design.food-supply-handoff/2',
    status: 'A design proposal on synthetic fixtures (11 November 2026), in no release. PROPOSED marks the design\'s own choices for review; the rest follows the owner\'s confirmed rules and the owner\'s crane. Nothing here activates gameplay.',
    base: BASE,
    rules: RULES,
    sources: Object.fromEntries(SOURCES.map(p => [p, shaOf(p)])),
    fixtures: { roster: 'design/phone-ui/prototype/fixtures.mjs (invented names)', cast: CAST },
    art: {
      back: { file: ART, sha256: sha(artText), viewBox: [0, 0, ...BOX], family: FAMILY, accent: AMBER },
      parts: 'design/food-supply/machine.mjs: each moving part and its states, drawn per pose; design/food-supply/scene.mjs: the layer order.',
      layers: ['the room back (art)', 'festoon cable', 'platform', 'cab back', 'Winch operator (kept inside the cab)', 'cab front (roof slot, window, lamp, key, roof buffer)', 'Panel operator', 'console (stop lights, lock lever, key, warning lamp)', 'stop plates on the rail', 'the locking panel (shutter blade, wheels, drum, sheave)', 'cable and hook', 'drop line (where a Lower would put it)', 'crate', 'platform jaws', 'effects (lettering, bursts, speed lines, clunks, the winch brake, warning marks)', 'name tags (the phone: the pack\'s .tag)'],
      characters: 'The crew rig (design/board-motion/figures): the Panel operator stands at the console (leanBench; down: slumpBench), the Winch operator sits in the cab (wheelchair; down: slumpDesk). Down, a figure slumps over its own controls, as the board draws an Eliminated figure: no wound, no mark.',
    },
    plane: {
      stops: STOPS, step: STEP, x0: X0, deck: DECK, rail: RAIL, carriage: CARRIAGE, blade: BLADE, crate: CRATE, hang: HANG, rest: REST, pendulum: PENDULUM,
      start: { panel: FIXTURES.intake.stop, crate: 'intake' },
      phoneView: { crop: VIEW, about: 'The same crop of the picture on both phones; the view gives way to the words at large text sizes, down to 112 px (84 px on the narrowest screens at the largest text), letterboxed.' },
    },
    boxes: BOXES,
    regions: REGIONS,
    operators: OPERATORS,
    tags: TAGS,
    route: ROUTE,
    mechanics: MECHANICS,
    controls: {
      ...controls,
      press: 'One press, one act. No hold, drag, swipe or gesture. The phone sends the act its button showed.',
      next: 'The press the cooperative route asks for now glows (amber); LOCK glows only while the panel is passing stop 6, Lower only while the swing has the crate over the platform.',
      keyboard: 'Space for RELEASE and LOCK, the up and down arrows for Raise and Lower, Enter for the key; the other participant\'s keys do nothing.',
      accessibility: 'Each button\'s accessible name says what it would do now ("Lower. Warning: falls on Cleo."). The view is an image with a text equivalent (where the panel and the crate are, and whether a warning shows). The hint is a polite live region that changes only with what to do; the strip and the meter are pictures of what the view and the buttons say. Large text: the controls keep their places and grow; the view gives way; cards scroll. A Task of timing cannot be made equal without sight or quick hands: see the open item timing-access.',
      command: COMMAND,
      ask: ASK,
    },
    timing: { ...TIMING, proposed: true, confirmed: { deadline: 'The owner, 12 November 2026: the overall time to complete the Task is 30 seconds, the briefing inside it; the deadline counts from the Task\'s start. The rest is PROPOSED.' } },
    food: { ...FOOD, confirmed: true, eating: 'Each player eats one package at their Eating step; not eating sends them to the Hospital under the existing Hospital rules (confirmed). The Eating step\'s place in the round and the order of eating are not designed here (see the open items).' },
    motion: { cues: CUES, proposed: true, rule: 'Presentation only: a cue never delays a press, and the next authoritative state replaces a cue still playing. The sweep and the swing are the Task itself: Reduce motion keeps them and takes away the rest (each cue\'s reduced form: no lean, no speed lines, no flashing, effects still).', cards: 'After a kill, the phones hold the outcome card until the impact cue has played, so both participants see the cause before the card covers the view.' },
    state: STATE,
    events: EVENTS,
    projection: PROJECTION,
    visibility: VISIBILITY,
    flow: [
      'A Volunteer opens Tasks (outside the turn order) and chooses Food Supply: one Task initiation per match across Food and Engine.',
      'The Volunteer asks a Partner (PROPOSED eligibility: a living player outside the Hospital and the Jail, not already on a Task). Joining as a Partner never spends the Partner\'s own initiation.',
      `The Partner can join or decline (the owner, 11 November 2026). PROPOSED: ${TIMING.answer / 1000} s to answer, and no answer is a decline. After a decline the Volunteer asks someone else or closes; the Volunteer\'s initiation is used only when a Partner joins (PROPOSED). The request and its answer are private to the two (PROPOSED).`,
      'The server assigns the controls (PROPOSED: at random) and starts the Task: both travel to the Supply Room, separate from normal movement. Every board shows their two places empty, so anyone can see who went (the owner, 11 November 2026).',
      `The whole Task has ${TIMING.deadline / 1000} s from its start, the briefing inside it (the owner). Briefing (${TIMING.briefing / 1000} s PROPOSED): who runs which control, the route, the dangers; the controls do nothing yet.`,
      `Running (the remaining ${(TIMING.deadline - TIMING.briefing) / 1000} s): raise, release, lock over the platform, lower as the swing passes over it, the keys.`,
      `Ended: the outcome card (${TIMING.ending / 1000} s PROPOSED), then the ordinary return flow restores each participant to their previous position, the dead as Eliminated where they were.`,
    ],
    acceptance: SCENARIOS.map(s => ({
      id: s.id, about: s.about, kind: s.board ? 'storyboard' : 'edge',
      given: { seats: { winch: CAST.winch.seat, panel: CAST.panel.seat }, protection: s.protection ?? { winch: false, panel: false }, briefingEndsAt: TIMING.briefing },
      when: s.steps,
      then: s.expect,
      ...(s.proposed?.length ? { proposed: s.proposed } : {}),
    })),
    conflicts: CONFLICTS,
    openItems: OPEN_ITEMS,
    review: {
      sheets: 'design/food-supply/review/*.png (design/tools/food-supply-render.mjs --sheets)',
      films: 'design/food-supply/review/film-*.mp4, silent (design/tools/food-supply-render.mjs --films)',
      pages: ['design/food-supply/review.html', 'design/food-supply/phone.html', 'design/food-supply/film.html'],
      storyboards: BOARDS.map(b => ({ id: b.id, title: b.title })),
    },
  };
}

/** The room art's file: the room module's inked drawing with its header. */
export const roomArt = () => supplyRoomSvg({ header: 'mothership:design-proposal · The Supply Room (Food Supply Task), inked in the crew\'s hand. design/tools/food-supply-export.mjs writes this file from design/food-supply/room.mjs. A proposal, in no release.' });

async function main() {
  const check = process.argv.includes('--check');
  const artText = roomArt();
  const json = `${JSON.stringify(build(artText), null, 2)}\n`;
  const outputs = [[ART, artText], [OUT, json]];
  let differs = 0;
  for (const [path, text] of outputs) {
    const file = resolve(ROOT, path);
    if (check) {
      const disk = await readFile(file, 'utf8').catch(() => null);
      if (disk !== text) { differs += 1; console.error(`differs: ${path}`); }
    } else {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, text);
      console.log('wrote', path, `${Buffer.byteLength(text)} bytes`);
    }
  }
  if (check) { if (differs) process.exit(1); console.log('food-supply export: up to date'); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
