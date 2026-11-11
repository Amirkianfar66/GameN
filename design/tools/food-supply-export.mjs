// mothership:dev-only
//
// The Food Supply Task's handoff for Frontend, Backend and Game Balance (docs/design/food-supply.md),
// written from the package's own modules so that it cannot drift from them:
//   design/food-supply/art/supply-room.back.svg   the Supply Room's still picture, inked in the crew's hand
//   design/food-supply/handoff.json               the plane, fixtures, regions, controls, timing, motion cues,
//                                                 state, events, projection, visibility, acceptance scenarios,
//                                                 rule conflicts and open items
// A design proposal on synthetic fixtures (11 November 2026), in no release: nothing here is in the game.
//
// Usage: node design/tools/food-supply-export.mjs [--check]
//   --check: builds both files and compares them with the files on disk; writes nothing; exits 1 on any difference.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIXTURES, FOOD, GRID, ROLES, ROUTE, TIMING } from '../food-supply/task.mjs';
import { BOX, BOXES, CELL, CRATE, DECK, OPERATORS, RAIL, REGIONS, TAGS, VIEW, X0 } from '../food-supply/layout.mjs';
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
  owner: "docs/design/owner-decisions.md, 11 November 2026: the Food Supply Task's confirmed highlights",
  note: 'At this commit no Task, Food or Supply Room rule exists under rules/: the owner\'s 11 November highlights are the only rule source for this Task. Backend versions any adoption.',
});

const SOURCES = ['task.mjs', 'layout.mjs', 'room.mjs', 'machine.mjs', 'scene.mjs', 'stage.mjs', 'boards.mjs', 'scenarios.mjs', 'rules.mjs', 'phone.mjs', 'phone.css'].map(f => `design/food-supply/${f}`);
const KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const LABELS = { up: 'Raise', down: 'Lower', left: 'Left', right: 'Right' };

/** The Task's server-held state: each field and who may see it. */
const STATE = [
  ['phase', "'briefing' | 'running' | 'ended'", 'participants'],
  ['seats', '{ hoist, boom }: the participants\' player numbers', 'participants'],
  ['carriage', 'the gantry\'s column, 0 to 6', 'participants'],
  ['crate', '[column, row]', 'participants'],
  ['docked', 'whether the crate is clamped in the cradle', 'participants'],
  ['keys', '{ hoist, boom }: each key turned', 'participants'],
  ['alive', '{ hoist, boom }', 'participants (deaths become public as any death does, on the return)'],
  ['online', '{ hoist, boom }: as the server observes the connection', 'participants'],
  ['deadline', 'the game-clock time the Task is lost', 'participants'],
  ['outcome', "{ result: 'delivered' (packages, alone) | 'lost' (why: 'not-in-cradle' | 'time') | 'cancelled' (why: 'disconnect', who) }", 'participants; PROPOSED public: delivered or not'],
  ['attack', '{ hoist, boom }: whether each still has their one attack opportunity of the match (a kill or a blocked attack uses it up; it never returns)', 'the server only'],
  ['protection', '{ hoist, boom }: whether each is Protected, as the existing rules decide', 'the server only'],
  ['lastMove', '{ hoist, boom }: the time of each participant\'s last accepted press', 'the server only'],
].map(([field, holds, seenBy]) => ({ field, holds, seenBy }));

/** The events the server sends the two participants, in order, with each press's result. */
const EVENTS = [
  ['RUNNING', '', 'The briefing ended; the controls work.'],
  ['MOVED', 'by, dir, from { crate, carriage }, to { crate, carriage }', 'One step: the crate on the hook, or the gantry with it.'],
  ['BUMPED', 'by, dir, why (rib | pulpit | lift | deck | rail | wall | stop | in-intake | cradle | key-turned)', 'Blocked: a clunk, nothing moves. The presser\'s hint says why.'],
  ['DOCKED', '', 'The crate entered the cradle: the jaws shut. The correct position.'],
  ['KEY', 'by', 'A key turned (the Hoist\'s Raise or the Boom\'s Right at the end stop, docked).'],
  ['KEY_RELEASED', 'by', 'The Boom drove away from the end stop: its key turned back.'],
  ['STOPPED', 'kind (drop | ram), by', 'An attack press that did not kill: Protection, or no attack opportunity left. Identical either way.'],
  ['KILLED', 'kind (drop | ram), by, victim, docked', 'An unblocked attack: lethal, no escape, not the Hospital.'],
  ['OFFLINE', 'who', 'The server lost a participant\'s connection; the Task goes on.'],
  ['ONLINE', 'who', 'Back within the grace: nothing paused.'],
  ['SENT', 'by (the living participants)', 'Every living participant\'s key is turned: the lift goes up.'],
  ['ENDED', 'outcome', 'Delivered, lost or cancelled. The outcome card shows, then the return.'],
  ['REFUSED', 'seat, dir, why (briefing | too-soon | down | ended | not-your-axis | stale | repeat | not-a-participant)', 'The press did nothing; only the presser is told, and the phone shows the current state.'],
].map(([type, fields, about]) => ({ type, fields, about, seenBy: type === 'REFUSED' ? 'the presser' : 'both participants' }));

/** One participant's projection (task.mjs view()): what their phone is built from. */
const PROJECTION = [
  ['role, roleName, axis', 'Their own control: the Hoist (vertical) or the Boom (horizontal).'],
  ['partnerSeat', 'The other participant.'],
  ['phase', "'briefing' | 'running' | 'ended'"],
  ['you, partner', "'alive' | 'down'; the partner also 'offline'."],
  ['buttons[]', '{ dir, label, key, hazard, enabled, next }: the two buttons. key: the button turns a key now. hazard: this press would attack. next: the cooperative route asks for it.'],
  ['warnings[]', "'crate-over-partner' | 'crate-over-you' | 'bumper-at-partner-cab' | 'bumper-at-your-cab': both participants see each position one press from an attack."],
  ['docked, keys { you, partner, needed }', 'The cradle and the keys; needed counts the living participants.'],
  ['secondsLeft, briefingLeft', 'The Task\'s time left; the briefing\'s countdown.'],
  ['outcome', 'Once ended.'],
].map(([fields, about]) => ({ fields, about, never: undefined })).concat([{ fields: '(never)', about: 'Attack opportunity, Protection, the other participant\'s refusals, and why a STOPPED happened: no phone can show them.' }]);

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
  name: 'TASK_MOVE (a proposal for the shared contract; Integration owns packages/contracts/)',
  fields: [
    { field: 'taskId', about: 'The Task in progress.' },
    { field: 'dir', about: "'up' | 'down' (the Hoist) or 'left' | 'right' (the Boom). The key presses are the same buttons: the Hoist's up, the Boom's right at the end stop, when docked." },
    { field: 'shown', about: "PROPOSED: whether the pressed button showed the attack warning when pressed. A press that would attack with shown = false is refused (stale)." },
    { field: 'repeat', about: 'PROPOSED: whether the press is a hold\'s repeat. A repeat never attacks (refused: repeat); a fresh press on the warning does.' },
  ],
  answer: 'The new revision of the Task state with the events, to both participants; REFUSED to the presser only.',
};

export function build(artText) {
  const controls = Object.fromEntries(Object.entries(ROLES).map(([role, r]) => [role, {
    axis: r.axis, station: r.station, attack: r.attack, about: r.about,
    buttons: r.dirs.map(dir => ({ dir, label: LABELS[dir], key: KEYS[dir], arrow: dir })),
    docked: role === 'hoist' ? "Raise becomes 'Turn key' (then 'Key turned'); Lower is disabled." : "At the end stop, Right becomes 'Turn key' (then 'Key turned'); Left drives away and releases the key.",
    hazard: role === 'hoist' ? "With the crate over the Boom operator, Lower is striped and says 'Drops it on <name>'." : "At the cab's door, Left is striped and says 'Rams <name>'s cab'.",
  }]));
  return {
    schema: 'mothership.design.food-supply-handoff/1',
    status: 'A design proposal on synthetic fixtures (11 November 2026), in no release. PROPOSED marks the design\'s own choices for review; the rest follows the owner\'s confirmed rules. Nothing here activates gameplay.',
    base: BASE,
    rules: RULES,
    sources: Object.fromEntries(SOURCES.map(p => [p, shaOf(p)])),
    fixtures: { roster: 'design/phone-ui/prototype/fixtures.mjs (invented names)', cast: CAST },
    art: {
      back: { file: ART, sha256: sha(artText), viewBox: [0, 0, ...BOX], family: FAMILY, accent: AMBER },
      parts: 'design/food-supply/machine.mjs: each moving part and its states, drawn per pose; design/food-supply/scene.mjs: the layer order.',
      layers: ['the room back (art)', 'cab back', 'Hoist operator', 'cab front (window, lamp, key, spring buffer)', 'festoon cable', 'gantry (drum, wheels, bumper plate)', "Boom's key at the end stop", 'cradle back', 'Boom operator', 'pulpit console', 'cable and hook', 'drop line (warning)', 'crate', 'cradle jaws', 'ram warning mark', 'route guide', 'effects (lettering, bursts, speed lines, clunks, the safety catch)', 'name tags (the phone: the pack\'s .tag)'],
      characters: 'The crew rig (design/board-motion/figures): the Boom stands at the console (leanBench; down: slumpBench), the Hoist sits in the cab (wheelchair; down: slumpDesk). Down, a figure slumps over its own controls, as the board draws an Eliminated figure: no wound, no mark.',
    },
    plane: {
      grid: GRID, cell: CELL, origin: { x: X0, deck: DECK }, rail: RAIL, crate: CRATE,
      cellBox: 'x = 64 + 128 × column, y = 640 − 128 × (row + 1), 128 × 128, in the 1024 × 768 picture',
      start: { carriage: FIXTURES.intake.col, crate: [FIXTURES.intake.col, FIXTURES.intake.row] },
      phoneView: { crop: VIEW, about: 'The same crop of the picture on both phones; the view gives way to the words at large text sizes, down to 112 px, letterboxed.' },
    },
    fixturesInRoom: FIXTURES,
    boxes: BOXES,
    regions: REGIONS,
    operators: OPERATORS,
    tags: TAGS,
    route: ROUTE,
    controls: {
      ...controls,
      press: `One press, one step. Holding repeats every ${TIMING.interval} ms (PROPOSED), the server's own interval: a press inside it is refused (too-soon). No drag, swipe or gesture; two big buttons for the participant's own axis only.`,
      deliberate: 'PROPOSED: a hold\'s repeat stops at a warning, and an attack needs a fresh press on a button that showed it (TASK_MOVE shown and repeat). Not a confirmation or an armed mode: one press of the same button acts.',
      next: 'The press the cooperative route asks for next glows (amber ring), on both phones for their own button.',
      keyboard: 'Arrow keys on the participant\'s own axis; the others do nothing.',
      accessibility: 'Each button\'s accessible name says its warning ("Lower. Warning: drops it on Cleo."). The view is an image with a text equivalent (where the crate and the gantry are, and whether a warning shows). The hint is a polite live region. Large text: the controls keep their places (Raise above Lower, Left beside Right) and grow; the view gives way; cards scroll.',
      command: COMMAND,
      ask: ASK,
    },
    timing: { ...TIMING, proposed: true },
    food: { ...FOOD, confirmed: true, eating: 'Each player eats one package at their Eating step; not eating sends them to the Hospital under the existing Hospital rules (confirmed). The Eating step\'s place in the round and the order of eating are not designed here (see the open items).' },
    motion: { cues: CUES, proposed: true, rule: 'Presentation only: a cue never delays a press, and the next authoritative state replaces a cue still playing. Reduce motion: each cue\'s reduced form; no flashing, no shake, no travel.', cards: 'After a kill, the phones hold the outcome card until the impact cue has played, so both participants see the cause before the card covers the view.' },
    state: STATE,
    events: EVENTS,
    projection: PROJECTION,
    visibility: VISIBILITY,
    flow: [
      'A Volunteer opens Tasks (outside the turn order) and chooses Food Supply: one Task initiation per match across Food and Engine.',
      'The Volunteer asks a Partner (PROPOSED eligibility: a living player outside the Hospital and the Jail, not already on a Task). Joining as a Partner never spends the Partner\'s own initiation.',
      `The Partner can join or decline (the owner, 11 November 2026). PROPOSED: ${TIMING.answer / 1000} s to answer, and no answer is a decline. After a decline the Volunteer asks someone else or closes; the Volunteer\'s initiation is used only when a Partner joins (PROPOSED). The request and its answer are private to the two (PROPOSED).`,
      'The server assigns the controls (PROPOSED: at random) and starts the Task: both travel to the Supply Room, separate from normal movement. Every board shows their two places empty, so anyone can see who went (the owner, 11 November 2026).',
      `Briefing (${TIMING.briefing / 1000} s PROPOSED): who runs which control, the route, the warning stripes. The controls do nothing yet.`,
      `Running (${TIMING.deadline / 1000} s PROPOSED): presses, the shared machine, the warnings, the keys.`,
      `Ended: the outcome card (${TIMING.ending / 1000} s PROPOSED), then the ordinary return flow restores each participant to their previous position, the dead as Eliminated where they were.`,
    ],
    acceptance: SCENARIOS.map(s => ({
      id: s.id, about: s.about, kind: s.board ? 'storyboard' : 'edge',
      given: { seats: { hoist: CAST.hoist.seat, boom: CAST.boom.seat }, attack: s.attack ?? { hoist: true, boom: true }, protection: s.protection ?? { hoist: false, boom: false }, briefingEndsAt: TIMING.briefing },
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
