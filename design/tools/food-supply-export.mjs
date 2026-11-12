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
import { CATCH, CLICK, FIXTURES, FOOD, ROLES, ROUTE, SERVER_ONLY, STOPS, SWING, TIMING, ZONES } from '../food-supply/task.mjs';
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
  owner: "docs/design/owner-decisions.md, 11 and 12 November 2026: the Food Supply Task's confirmed highlights, the owner's answers, the owner's crane and its click from stop to stop",
  note: 'At this commit no Task, Food or Supply Room rule exists under rules/: the owner\'s 11 and 12 November decisions are the only rule source for this Task. Backend versions any adoption.',
});

const SOURCES = ['task.mjs', 'layout.mjs', 'room.mjs', 'machine.mjs', 'scene.mjs', 'stage.mjs', 'boards.mjs', 'scenarios.mjs', 'hints.mjs', 'rules.mjs', 'phone.mjs', 'phone.css'].map(f => `design/food-supply/${f}`);
const KEYS = { raise: 'ArrowUp', lower: 'ArrowDown', release: 'Space', lock: 'Space', key: 'Enter' };
const LABELS = { raise: 'Raise', lower: 'Lower', release: 'RELEASE', lock: 'LOCK', key: 'Turn key' };

/** The Task's server-held state: each field and who may see it. */
const STATE = [
  ['id, revision', 'The Task\'s identity, and its revision: one more for every batch of changes (a press, the briefing\'s end, a connection change, the end)', 'participants'],
  ['phase', "'briefing' | 'running' | 'ended'", 'participants'],
  ['seats', '{ winch, panel }: the participants\' player numbers, assigned to the controls at random by the server (the owner, 12 November 2026)', 'participants'],
  ['startedAt, runningAt, deadline, endedAt', `The Task\'s times on the server\'s clock: the start, the briefing\'s end (${TIMING.briefing / 1000} s PROPOSED), the deadline (${TIMING.deadline / 1000} s from the start, the briefing inside it: the owner\'s), and the end`, 'participants'],
  ['panel', '{ locked: true, stop, dir } locked at a stop (0 to 6), or { locked: false, from, dir, since } released: its place at time t is sweep(from, dir, t − since), clicking from stop to stop', 'participants'],
  ['crate', "{ state: 'intake' | 'hanging' | 'deck' | 'fallen' | 'landed' | 'sent', x, since, from }: where it lies (x, a fractional stop), or hanging under the panel; since and from anchor its last move (a raise takes TIMING.raise, a fall TIMING.lower)", 'participants'],
  ['swing', '{ since, amp, dir } while the crate hangs under a locked panel: its offset at time t is swingOffset(swing, t)', 'participants'],
  ['keys', '{ winch, panel }: each key turned', 'participants'],
  ['alive', '{ winch, panel }', 'participants (a death becomes public as any death does, on the return)'],
  ['online, offlineSince', '{ winch, panel }: the connection as the server observes it, and since when it was lost', 'participants (online); the server only (offlineSince)'],
  ['outcome', "{ result: 'delivered' (packages, alone) | 'lost' (why: 'not-in-position' | 'time') | 'cancelled' (why: 'disconnect', who) }", 'participants only. Other players learn only the food count (the owner, 12 November 2026): never the outcome or an event of the Task'],
  ['pressRevision', 'The revision of the last change a press depends on (not a connection change alone): a press bound to an older revision is refused as stale', 'the server only'],
  ['receipts', '{ [commandId]: the first answer }: a retry with the same command id gets it again and changes nothing', 'the server only; each receipt to its presser'],
  ['seq', 'The last event\'s sequence number: every event has an id (task id and number), its order and its authoritative time t', 'participants (on the events)'],
  ['(not the Task\'s) Protection', 'The game\'s, read by the server at each press that would kill (not used up, active this round: packages/engine/src/planet-game/physical.ts) and used up by a block. The Task holds none; Clone is not read', 'the server only'],
].map(([field, holds, seenBy]) => ({ field, holds, seenBy }));

/** The events, in order, each with its id, sequence number and authoritative time (t). */
const EVENTS = [
  ['RUNNING', '', 'The briefing ended; the controls work.'],
  ['RAISED', 'by, from (intake | deck | fallen), x', 'The crate slides under the hook and rises; it hangs, settled, TIMING.raise later, with a small swing.'],
  ['RELEASED', 'by, from (stop), dir', 'The blade lifts and the panel clicks on from that stop: both phones draw sweep(from, dir, t − its time).'],
  ['LOCKED', 'by, stop, dir, x (where the panel was, a fractional stop), resting', 'The blade drops at the stop the panel rests at, or the one it is snapping to; with the crate hanging, it starts to swing: amp SWING.lock, in dir (back off the rail\'s end at stop 1 or 7).'],
  ['LOWERED', "by, x, to ('platform' | 'console' | 'intake' | 'deck')", 'The winch lets the crate fall from where its swing has it when the press arrives; the result follows at once.'],
  ['LANDED', '', 'Onto the platform: the jaws close and the hook is free. The correct position. The keys work.'],
  ['MISSED', "on ('deck' | 'intake' | 'fallen'), x", 'Anywhere else: CLUNK. The crate lies on its hook; the Winch raises it again.'],
  ['STOPPED', "kind ('cut' | 'drop'), by", 'A lethal press that did not kill: the partner\'s applicable Protection held (and is used up), or the catch held by luck (1 in 4). Identical either way, and whether or not it was meant.'],
  ['KILLED', "kind ('cut' | 'drop'), by, victim", 'A lethal press: the cut (a lock at stop 7) or the drop (a Lower over the console). Lethal, no escape, not the Hospital. Not an attack: it uses nothing (the owner).'],
  ['KEY', 'by', 'A key turned, once landed.'],
  ['SENT', 'by (the living participants)', 'Every living participant\'s key is turned: the lift takes the crate down to the galley. Once only.'],
  ['OFFLINE', 'who', 'The server lost a participant\'s connection; the Task goes on.'],
  ['ONLINE', 'who', 'Back within the grace: nothing paused.'],
  ['ENDED', 'outcome', 'Delivered, lost or cancelled, at the earliest boundary due: the deadline before a grace at the same moment. The outcome card shows, then the return. Never twice.'],
  ['REFUSED', 'seat, act, why (briefing | ended | down | not-a-participant | not-this-task | stale | not-your-control | busy | crate-down | unlocked | locked | up | down-already | landed | not-landed | turned)', 'The press did nothing; only the presser is told, and the phone shows the present state.'],
  ['RECEIPT', 'commandId, result, revision (and why, or events)', 'A retry of a command already answered: the first answer again, nothing changed.'],
  ['CATCH', 'kind, victim, roll, held (protection | luck | null)', 'The server\'s record of a lethal press, kept for replay. Never sent to a phone.'],
].map(([type, fields, about]) => ({ type, fields, about, seenBy: SERVER_ONLY.includes(type) ? 'the server only' : type === 'REFUSED' || type === 'RECEIPT' ? 'the presser only' : 'both participants' }));

/**
 * One participant's projection (task.mjs projection()): anchors, not positions, so that the phone can
 * draw the Task at any moment between two updates and after a recovery (view(projection, seat, t)).
 */
const PROJECTION = [
  ['id, revision, observedAt', 'The Task, its revision, and the server\'s time of this projection.'],
  ['seats, role', 'Who runs which control; this phone\'s own role.'],
  ['phase, startedAt, runningAt, deadline, endedAt', 'The Task\'s phase and times, on the server\'s clock (the phone keeps the server\'s clock to draw by; it decides nothing with it).'],
  ['alive, online, keys', 'Both participants\'.'],
  ['panel', '{ locked, stop, dir }, or { locked: false, from, dir, since }: the anchors of the click.'],
  ['swing', '{ since, amp, dir } or null: the anchors of the swing.'],
  ['crate', '{ state, x, since, from }: where it lies, or the anchors of its last move.'],
  ['outcome', 'Once ended.'],
  ['mechanics', '{ stops, move, rest, margin, raise, lower, swing, zones }: the approved parameters the phone draws with (task.mjs sweep(), swingOffset(), landingAt()).'],
  ['events[]', 'The participant\'s own events since the last one it had: each with its id, sequence number and authoritative time t, the cues to play in order. A refusal or a receipt only to its presser.'],
  ['(derived on the phone)', 'view(projection, seat, t): the scene, the strip, the meter, the warnings, each button\'s words, glow and stripes, the time left. Safe functions of the anchors and the time. Whether a press is accepted, and what it does, is the server\'s alone.'],
].map(([fields, about]) => ({ fields, about })).concat([{ fields: '(never)', about: 'Protection, the catch\'s roll or cause (CATCH), the role assignment\'s randomness, the press revisions\' bookkeeping, the receipts, the other participant\'s refusals, and whether a lethal press was meant: no phone can show them.' }]);

/**
 * Asking a Partner: the command families Integration accepted for contract design (12 November 2026),
 * not their wire format; around the owner's decisions that a Partner can decline and that a refusal
 * passes to the next volunteer. The actor of every command comes from authentication.
 */
const ASK = {
  commands: [
    { name: 'TASK_ASK { commandId, kind: "food", partnerSeatId }', from: 'the Volunteer', about: 'Ask one player, by seat id (not the number on the screen). Refused if the Volunteer or the player went for food last round (the owner, 12 November 2026), the Volunteer was refused this round (PROPOSED), or the player cannot be asked.' },
    { name: 'TASK_ANSWER { commandId, requestId, requestRevision, join }', from: 'the asked player', about: `Join or decline, within ${TIMING.answer / 1000} s (PROPOSED); no answer is a decline. A Join racing the Volunteer\'s withdrawal, the time running out or another request: the server revalidates both players and the request atomically, and the first to arrive wins. A Join that lost is refused to its sender (withdrawn | expired): "Too late to join".` },
    { name: 'TASK_ASK_WITHDRAW { commandId, requestId, requestRevision }', from: 'the Volunteer', about: 'Cancel while waiting. PROPOSED: the same as a refusal, so the next volunteer goes. A withdrawal that lost the race to a Join is refused to the Volunteer (joined): "Too late to cancel", and the Task starts.' },
  ],
  events: [
    { type: 'TASK_ASKED', to: 'the asked player', about: 'Who asks, the request id and revision, and the time to answer.' },
    { type: 'TASK_DECLINED', to: 'the Volunteer', about: 'Declined or no answer. The game goes to the next volunteer: anyone can now ask a Partner (the owner, 12 November 2026).' },
    { type: 'TASK_STARTED', to: 'both', about: 'Joined: the Task\'s id, the roles assigned at random by the server and recorded for replay (the owner, 12 November 2026), then the briefing. Every board now shows the two places empty. The server notes the two: neither can go for food the next round (the owner), once only, whatever a retry does.' },
  ],
  receipts: 'Every command has a stable command id and a durable receipt. An uncertain retry reuses the id: no second request, no second Task, no second cooldown.',
  defaults: `The ${TIMING.answer / 1000} s answer and the ${TIMING.grace / 1000} s grace remain PROPOSED gameplay defaults: accepting the command families does not adopt them.`,
  visibility: 'PROPOSED: private to the two. Other players learn nothing until the Task starts, and then only that two players are away (the board shows who).',
};

/** One press: the command family Integration accepted for contract design (12 November 2026), not its wire format. */
const COMMAND = {
  name: 'TASK_PRESS (a proposal for the shared contract; Backend owns packages/contracts/, with Integration\'s review)',
  fields: [
    { field: 'commandId', about: 'The press\'s stable identity. A retry after an uncertain answer reuses it: the server returns the first answer (RECEIPT) and changes nothing: no second press, no second roll, no second delivery.' },
    { field: 'taskId', about: 'The Task in progress (not the ordinary turn\'s changing phase id).' },
    { field: 'revision', about: 'The Task revision the phone showed. A press made on a revision older than the last change it depends on is refused as stale (a connection change alone does not count).' },
    { field: 'act', about: "'raise' | 'lower' (the Winch), 'release' | 'lock' (the Panel), 'key' (either, once landed): the act its button showed when it was pressed, never the button's current one. A double tap on LOCK never becomes RELEASE." },
    { field: 'shownAt (optional)', about: 'The phone\'s own moment of the press: diagnostic only. It decides nothing.' },
    { field: '(the actor)', about: 'From authentication, never from the command.' },
    { field: '(no roll, no Protection)', about: 'The catch\'s roll is the server\'s own random number for a press that would kill, recorded for replay; Protection is read by the server from the game. The phone never sends or sees either.' },
  ],
  resolution: 'Integration\'s direction (12 November 2026): the server resolves a press at the moment it receives it, on its own monotonic clock, wherever the panel and the crate are then. Any other lag policy needs its own review and real-network evidence.',
  answer: 'The new revision of the Task with its events, to both participants; REFUSED or RECEIPT to the presser only.',
};

/** The crane's motion, as functions of time that the server and both phones compute alike. */
const MECHANICS = {
  stops: { count: STOPS, x: `x = ${X0} + ${STEP} × stop in the picture (stop 0 to 6, painted 1 to 7)`, fixtures: FIXTURES },
  sweep: {
    rule: `sweep(from, dir, dt): the panel clicks from stop to stop, end to end and back: a snap of TIMING.move = ${TIMING.move} ms to the next stop, then a rest of TIMING.rest = ${TIMING.rest} ms there (CLICK = ${CLICK} ms a stop). n = floor(dt / CLICK), r = dt − n × CLICK, resting when r ≥ move. Unfold the bounce: u0 = (dir > 0 ? from : 12 − from) + n; fold(u) takes u modulo 12 to at = u ≤ 6 ? u : 12 − u, moving right while u ≤ 6. The place is fold(u0 + (resting ? 1 : snap(r / move))), with snap(u) = u²(3 − 2u); the way it goes is fold(u0 + 0.5).dir.`,
    lock: 'A LOCK takes the stop the panel rests at, or the one it is snapping to: stop = fold(u0 + 1). Each stop takes a LOCK for one whole click, the snap toward it and the rest at it. A release starts from the locked stop in the direction the panel last moved (right from stop 1, left from stop 7).',
    owner: 'The click is the owner\'s (12 November 2026), chosen when a press came to be resolved on its arrival; the snap and the rest are PROPOSED.',
    proposed: true,
  },
  margin: {
    ms: TIMING.margin,
    rule: 'A press made now reaches the server a moment later. So the warnings start TIMING.margin before a danger, and a glow ends TIMING.margin before its chance does: LOCK is striped while the stop it takes now, or the one it would take TIMING.margin later, is the cab\'s; it glows over the platform only while both are the platform. Lower is striped while the swing could meet the console within the margin, and glows only while the swing holds the crate over the platform for the whole margin. It says where the crate will be at the margin\'s end. Never a promise: the server decides on arrival.',
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
    'A reduced or skipped animation never shortens them: the server keeps every move\'s full time.',
  ],
  endings: 'The Task ends at the earliest boundary due, whenever the server gets to it: the deadline (lost: time) or a participant\'s grace running out (cancelled). At the same moment the deadline comes first, then the participant out of contact first, then the Winch before the Panel. An ended Task stays as it ended: a late tick, a reconnect or a press changes nothing, a death already accepted stands, and nothing is delivered twice.',
  kills: 'A kill on the Task is not an attack (the owner, 12 November 2026): the Task never reads or spends an attack opportunity, and nothing limits how often a player kills on Tasks. A lethal press is stopped by the partner\'s applicable Protection, read by the server from the game at that moment (not used up, active this round: packages/engine/src/planet-game/physical.ts) and used up by the block; Clone is not read. Without it, the catch\'s luck: the server rolls for each lethal press, and below CATCH.luck the catch holds (the owner: 25%). Otherwise it kills.',
  catch: { ...CATCH, confirmed: true, rule: 'roll < CATCH.luck: STOPPED, the same CLANK! as a Protection block. A participant with applicable Protection is stopped by it whatever the roll, and the block uses it up. The server records each lethal press (CATCH: the roll and what held) for replay; no phone sees it.' },
};

/** The presser's own press, and the request's races: what each phone shows, and to whom. */
const PHONE_STATES = [
  { state: 'press in flight', to: 'the presser', shows: 'The pressed control sinks and turns busy ("Sending…"); every control waits for the answer. Further taps and key repeats send nothing.', sheet: 'states' },
  { state: 'press refused', to: 'the presser', shows: '"Your LOCK was not done. The crane had moved on. Look again, then press." The phone draws the present state.', sheet: 'states' },
  { state: 'answer unknown', to: 'the presser', shows: '"Checking your Lower… The connection dropped while it was on its way." Controls off. On recovery the phone fetches the present state and the receipt of that command id, then says "went through" or "did not go through". It never replays queued taps or a missed animation.', sheet: 'states' },
  { state: 'Join on its way', to: 'the asked player', shows: 'Join turns busy ("Joining…"); Decline is off.', sheet: 'states' },
  { state: 'too late to join', to: 'the asked player', shows: 'The Volunteer had withdrawn, or the time had run out (a decline). "You stay in Room B."', sheet: 'states' },
  { state: 'request withdrawn / too late to cancel', to: 'the Volunteer', shows: 'Withdrawn: the next volunteer goes (PROPOSED: as a refusal). Too late: the Partner joined first, and the Task starts.', sheet: 'states' },
];

/** What a native build of the Task must show before it is accepted (Frontend's findings, 12 November 2026). */
const EVIDENCE = [
  'Every state of both participants\' phones and of the request flow, the press and request states included, at 390 × 844 and at 320 × 568 with 200% text, side by side with these sheets; Designer\'s explicit visual acceptance under #224.',
  'Long permitted names and real safe areas; both motion settings; a tab that returns from the background (it seeks the present, without replaying an impact or restarting the ending card).',
  'Focus stays on the control across state changes (RELEASE and LOCK are one button); a card takes focus when it opens and gives it back when it closes; disabled controls and key repeats send nothing; each key press is bound to the act shown at keydown.',
  'Screen reader and timing usability with real people: a polite live region is no channel for a half-second danger (see the open item timing-access). The recorded samples show only that the controls fit, not equal timed access or a physical phone\'s performance.',
]

export function build(artText) {
  const controls = Object.fromEntries(Object.entries(ROLES).map(([role, r]) => [role, {
    axis: r.axis, station: r.station, kill: r.kill, about: r.about,
    buttons: [...r.acts, 'key'].map(act => ({ act, label: LABELS[act], keyboard: KEYS[act] })),
    layout: role === 'winch' ? 'Raise above Lower, under the swing meter; once landed, the key in their place.' : 'One big button, RELEASE or LOCK, under the strip of stops; once landed, the key above it and RELEASE smaller.',
    hazard: role === 'winch' ? "While the swing could meet the console within the margin, Lower is striped and says 'May fall on <name>'." : "While a LOCK could take the cab's stop (resting at it, snapping to it, or the margin before the panel snaps on to it), LOCK is striped and says 'At 7: <name>'s cab' or 'Moving on to <name>'s cab'.",
    says: role === 'winch' ? "Lower says where the crate will be when a press made now arrives, never a promise: 'Over the platform' (glowing only while the swing holds it there for the whole margin), 'May fall on <name>' (striped), 'Over the deck: misses', 'Over the hatch'." : "LOCK says where the panel is: 'At 6: the platform' (glowing), 'Leaving 6', 'At 7: <name>'s cab' or 'Moving on to <name>'s cab' (striped), 'At 5: over you', 'At <n>'.",
  }]));
  return {
    schema: 'mothership.design.food-supply-handoff/3',
    status: 'A design proposal on synthetic fixtures (11 and 12 November 2026), in no release. PROPOSED marks the design\'s own choices for review; the rest follows the owner\'s confirmed rules and the owner\'s crane, and Integration\'s review of 12 November. Nothing here activates gameplay.',
    base: BASE,
    target: {
      protocol: 3, engineVersion: 'planet-game-1.4.0', rulesetVersion: 'in-person-planet-food-task-2026-11-12',
      predecessor: { engineVersion: 'planet-game-1.3.0', rulesetVersion: BASE.ruleset.rulesetVersion },
      note: 'Integration\'s planning allocation (12 November 2026): a new opt-in candidate inheriting the exact 1.3.0 predecessor. Not an authority hash, a registered tuple, a default change or a release. Historical schemas, matches and payloads stay unchanged; if the transport cannot keep them, the question goes back to Integration before implementation.',
    },
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
      press: 'One press, one act, one command id. No hold, drag, swipe or gesture. The phone sends the act its button showed, with the Task\'s id and the revision it showed. While a press is in flight its control shows it and every control waits; a double tap or a held key sends nothing more, and a disabled control sends nothing. A refusal shows to its presser only. After a lost connection the phone keeps the command id, and on recovery fetches the present state and that command\'s receipt; it never replays queued taps or a missed animation.',
      next: 'The press the cooperative route asks for now glows (amber), only while a press made now would still arrive in time: LOCK while the panel snaps to or rests at stop 6, until the margin before it snaps on; Lower while the swing holds the crate over the platform for the whole margin.',
      keyboard: 'Space for RELEASE and LOCK, the up and down arrows for Raise and Lower, Enter for the key. A key press is bound to the act its button showed at keydown; a held key repeats nothing; the other participant\'s keys do nothing.',
      accessibility: 'Each button\'s accessible name says what it would do now ("Lower. Warning: may fall on Cleo."). The view is an image with a text equivalent (where the panel and the crate are, and whether a warning shows). Focus stays on the control across state changes (RELEASE and LOCK are one button); a card takes focus when it opens and gives it back when it closes. The hint is a polite live region that changes only with what to do, which is no channel for a danger that lasts half a second: PROPOSED, a short vibration on the presser\'s phone while their press would kill. The partner\'s state (offline, out) stays in the top bar at every text size. Large text: the controls keep their places and grow; the view gives way; the briefing is a reminder that never scrolls, and the instructions are read before the Task (How it works). A Task of timing cannot be made equal without sight or quick hands: see the open item timing-access.',
      command: COMMAND,
      ask: ASK,
    },
    timing: { ...TIMING, click: CLICK, proposed: true, confirmed: { deadline: 'The owner, 12 November 2026: the overall time to complete the Task is 30 seconds, the briefing inside it; the deadline counts from the Task\'s start.', click: 'The owner, 12 November 2026: the panel clicks from stop to stop (its snap and rest are PROPOSED).' } },
    food: { ...FOOD, confirmed: true, eating: 'Each player consumes one dose at their Eating step; not eating sends them to the Hospital under the existing Hospital rules (confirmed). Whether a dose is one package is open (PROPOSED: yes); no conversion, Eating eligibility or default is taken from the artwork. The Eating step\'s place in the round and the order of eating are not designed here (see the open items).' },
    motion: { cues: CUES, proposed: true, rule: 'Presentation only: a cue never delays a press, and the next authoritative state replaces a cue still playing. The click and the swing are the Task itself: Reduce motion keeps them, the same stop and the same place at the same moment, and takes away the rest (no slide, lean, speed lines or flashing; effects still). A reduced pose never runs ahead of the state: the crate still takes its full time to rise and fall. A phone back from the background draws the present: it does not replay an impact or restart an outcome card.', cards: 'After a kill, the phones hold the outcome card until the impact cue has played, so both participants see the cause before the card covers the view.' },
    state: STATE,
    events: EVENTS,
    projection: PROJECTION,
    phoneStates: PHONE_STATES,
    evidence: EVIDENCE,
    visibility: VISIBILITY,
    flow: [
      'A Volunteer opens Tasks (outside the turn order) and chooses Food Supply. Anyone can volunteer, and there is no limit of one Task per match; the Volunteer and their Partner cannot go for food the next round (the owner, 12 November 2026).',
      'The Volunteer asks a Partner (PROPOSED eligibility: a living player outside the Hospital and the Jail, not already on a Task; the owner rules out the two who went for food last round).',
      `The Partner can join or decline (the owner, 11 November 2026). PROPOSED: ${TIMING.answer / 1000} s to answer, and no answer is a decline. After a refusal the game goes to the next volunteer: anyone who volunteers (the owner, 12 November 2026). PROPOSED: the refused Volunteer can volunteer again from the next round, and a withdrawn request counts as a refusal. The request and its answer are private to the two (PROPOSED).`,
      'The server assigns the controls at random (the owner, 12 November 2026) and starts the Task: both travel to the Supply Room, separate from normal movement. Every board shows their two places empty, so anyone can see who went (the owner, 11 November 2026).',
      `The whole Task has ${TIMING.deadline / 1000} s from its start, the briefing inside it (the owner). Briefing (${TIMING.briefing / 1000} s PROPOSED): who runs which control, the route, the dangers; the controls do nothing yet.`,
      `Running (the remaining ${(TIMING.deadline - TIMING.briefing) / 1000} s): raise, release, lock over the platform, lower as the swing passes over it, the keys.`,
      `Ended: the outcome card (${TIMING.ending / 1000} s PROPOSED), then the ordinary return flow restores each participant to their previous position, the dead as Eliminated where they were. The other players learn the result only through the food count (the owner, 12 November 2026).`,
    ],
    acceptance: SCENARIOS.map(s => ({
      id: s.id, about: s.about, kind: s.board ? 'storyboard' : 'edge',
      given: { seats: { winch: CAST.winch.seat, panel: CAST.panel.seat }, protection: s.protection ?? { winch: false, panel: false }, briefingEndsAt: TIMING.briefing, note: 'Each step is timed by the server\'s receipt of it. protection: the game\'s applicable Protection at the start, read at each lethal press and used up by a block.' },
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
