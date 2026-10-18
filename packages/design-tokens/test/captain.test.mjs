// mothership:dev-only
//
// The Captain's films (design/board-v2/films/captain.mjs, fx/captain.mjs, figures/captain.mjs,
// js/captain-fixtures.mjs; docs/design/captain-films.md): S8's plate states from the Captain's own
// view, the RELEASE and EJECT films' beats and reduced variants, where the console inset and the
// command pulse go, the Jail's door at rest, the hatch, the memorial greys, and the review page's
// synthetic outcomes. These test the proposal's own modules: none of them is a rule, a server
// contract or a measurement of a phone.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { CAPTAIN_BUTTONS, DOOR_STEP, EJECT_FILM, RELEASE_FILM, captainButtonStates, captainContracts, captainWords, ejectEnd, ejectFrame, ejectPerson, plateFor, pullToHatch, releaseEnd, releaseFrame, releasePerson, walkToDoor } from '../../../design/board-v2/films/captain.mjs';
import { AIRLOCK, CAPTAIN, CARD, COMMANDS, CONSOLE, COVER, JAIL_DOOR, JAIL_DOOR_ELEMENTS, MIN_ACCENT_DISTANCE, PLATE_STATES, airlockSvg, captainColorDistances, conduitAt, conduitPoints, conduitSegment, consoleBox, coverSvg, jailDoorSvg, memorialSvg, offBoardCards, plateSvg, plaqueBox } from '../../../design/board-v2/fx/captain.mjs';
import { turnsLayout } from '../../../design/board-v2/js/turns.mjs';
import { BRACE, CAPTAIN_POSES, PRESS_DIP, TUMBLE, ejectPose, startle } from '../../../design/board-v2/figures/captain.mjs';
import { CAPTAIN_OUTCOMES, captainOutcome } from '../../../design/board-v2/js/captain-fixtures.mjs';
import { CAPSULE, fitBoardV2, slotRects } from '../../../design/board-v2/js/fit.mjs';
import { frameScene } from '../../../design/board-motion/scenes/frame.mjs';
import { skeletonOf } from '../../../design/board-motion/figures/gestures.mjs';
import { sceneOf } from '../../../design/board-v2/scenes/slots.mjs';

const ROLE_WORDS = ['Officer', 'Insider', 'Cracker', 'Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
const meets = (a, b) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
const view = (uses, offered = []) => ({ self: { seatId: 'seat-7', captainCommandUses: uses }, legalTargets: Object.fromEntries(offered.map(name => [name, ['seat-7']])) });

/** The top band, the Captain's place and name tag, and the console inset, as the review page lays them out. */
function band(viewport, roster, capsule) {
  const board = fitBoardV2(viewport, roster, { capsule });
  const border = board.shell.border;
  const panel = board.panels['command-room'];
  const c1 = slotRects('command-room', roster, panel)[0];
  const command = board.boxes['command-room'];
  const right = capsule ? board.boxes[CAPSULE.id].left + board.boxes[CAPSULE.id].width - border : command.left + command.width - border;
  const area = { left: command.left + border, top: command.top + border, width: right - command.left - border, height: panel.height };
  const captain = { left: area.left + c1.left, top: area.top + c1.top, width: c1.side, height: c1.side };
  const tag = { left: area.left + c1.press[0] - 30, top: area.top + Math.min(panel.height - 16, c1.top + c1.side - 14), width: 60, height: 17 };
  return { board, panel, c1, band: area, captain, tag, inset: consoleBox({ band: area, cap: panel.cap, captain, tag }) };
}

test('S8: the Captain\'s own view alone says each plate\'s state; a new Captain sees an allowance used', () => {
  assert.equal(captainButtonStates(view(null, ['CAPTAIN_RELEASE'])), null);
  assert.deepEqual(captainButtonStates(view({ releaseUsed: false, ejectUsed: false }, ['CAPTAIN_RELEASE', 'CAPTAIN_EJECT'])), { release: 'available', eject: 'available' });
  assert.deepEqual(captainButtonStates(view({ releaseUsed: true, ejectUsed: false }, ['CAPTAIN_RELEASE', 'CAPTAIN_EJECT'])), { release: 'used', eject: 'available' });
  assert.deepEqual(captainButtonStates(view({ releaseUsed: false, ejectUsed: false })), { release: 'unavailable', eject: 'unavailable' });
  assert.deepEqual(captainButtonStates(view({ releaseUsed: false, ejectUsed: false }, ['CAPTAIN_EJECT']), 'eject'), { release: 'unavailable', eject: 'sending' });
  assert.deepEqual(captainButtonStates({ self: { seatId: 'seat-7', captainCommandUses: { releaseUsed: false, ejectUsed: false } }, legalTargets: { CAPTAIN_RELEASE: ['seat-2'] } }), { release: 'unavailable', eject: 'unavailable' });
  assert.equal(plateFor('sending'), 'pressed');
  assert.equal(CAPTAIN_BUTTONS.press.px, 3);
  assert.ok(CAPTAIN_BUTTONS.glow.maxLuminanceChange <= 0.15);
});

test('the plates differ without color: a solid rim, a dashed one, a pressed button, none; the cover in three frames', () => {
  for (const kind of COMMANDS) {
    const svgs = Object.fromEntries(PLATE_STATES.map(state => [state, plateSvg(kind, state)]));
    assert.match(svgs.unavailable, /stroke-dasharray/);
    for (const state of ['available', 'pressed', 'used']) assert.doesNotMatch(svgs[state], /stroke-dasharray/);
    assert.match(svgs.pressed, /cy="35"/);
    assert.equal(new Set(Object.values(svgs)).size, 4);
    for (const svg of Object.values(svgs)) assert.doesNotMatch(svg, /<text\b/);
  }
  assert.equal(new Set(COVER.frames.map(coverSvg)).size, 3);
  assert.throws(() => plateSvg('vote', 'available'));
  assert.throws(() => plateSvg('release', 'sending'));
});

test('RELEASE: console, press, pulse, locks, door, the walk and the door shut, in 4.2 s; words once, at the door', () => {
  const at = t => releaseFrame(t, { count: 2 });
  assert.equal(releaseEnd(false), 4200);
  assert.deepEqual([250, 650, 1050, 1500, 1950, 2500, 3500, 4000].map(t => at(t).stage), ['console', 'press', 'pulse', 'locks', 'door', 'walk', 'close', 'settle']);
  assert.equal(at(650).inset.plate, 'pressed');
  assert.ok(at(650).inset.ring);
  assert.equal(at(4000).inset.plate, 'used');
  assert.ok(at(1050).pulse && at(1050).pulse.v > 0 && at(1050).pulse.v < 1);
  assert.equal(at(1600).door.lamp, 'green');
  assert.equal(at(2200).door.open, 1);
  assert.equal(at(3900).door.open, 0);
  assert.equal(at(1699).announce, false);
  assert.equal(at(1700).announce, true);
  assert.deepEqual(at(-1).people, [{ state: 'jail', v: 0 }, { state: 'jail', v: 0 }]);
  assert.equal(at(4200).done, true);
  // One prisoner's way: up, to the door, through it, across, landing, settled.
  assert.deepEqual([2250, 2500, 2900, 3100, 3500, 3800].map(t => releasePerson(t, 0).state), ['up', 'door', 'through', 'across', 'land', 'settled']);
  // A full Jail: the fifth through the door before it shuts, landed before the film ends.
  const W = RELEASE_FILM.walk;
  assert.ok(W.start + 4 * W.stagger + W.up + W.toDoor + W.through <= RELEASE_FILM.close[0]);
  assert.ok(W.start + 4 * W.stagger + W.up + W.toDoor + W.through + W.across + W.land <= RELEASE_FILM.end);
});

test('EJECT: command, alert, lockdown, airlock, ejection, exterior, closure in 7.2 s; the light under 2 Hz and low; bodies leave as cut-outs', () => {
  const subjects = [{ body: false }, { body: false }, { body: true }];
  const at = t => ejectFrame(t, { subjects });
  assert.equal(ejectEnd(false), 7200);
  assert.deepEqual([300, 1200, 2000, 2800, 3500, 5000, 6500].map(t => at(t).stage), ['command', 'alert', 'lockdown', 'airlock', 'ejection', 'exterior', 'closure']);
  assert.equal(at(500).inset.cover, 'open');
  assert.ok(at(650).inset.click);
  assert.ok(at(300).push > 1 && at(300).push <= EJECT_FILM.push.scale);
  let high = 0;
  for (let t = 0; t < 7200; t += 5) high = Math.max(high, at(t).emergency);
  assert.ok(high <= EJECT_FILM.emergency.high + 1e-9);
  assert.ok(1000 / EJECT_FILM.emergency.periodMs < 2);
  assert.equal(at(3000).airlock.reveal, 1);
  assert.ok(at(3000).airlock.open > 0 && at(3000).airlock.open < 1);
  assert.deepEqual(at(3500).people.map(person => person.state), ['pulled', 'brace', 'dissolve']);
  assert.deepEqual(at(4500).people.map(person => person.state), ['gone', 'gone', 'gone']);
  assert.equal(ejectPerson(3000, 0, { body: true }).state, 'jail');
  assert.equal(at(5000).exterior.opacity, 1);
  assert.equal(at(6500).inset.plate, 'used');
  assert.equal(at(6500).inset.cover, 'closed');
  assert.equal(at(6900).plaque, 1);
  assert.equal(at(3299).announce, false);
  assert.equal(at(3300).announce, true);
  assert.equal(at(7200).done, true);
  const X = EJECT_FILM.eject;
  assert.ok(X.start + 4 * X.stagger + X.lean + X.pull + X.last <= EJECT_FILM.exterior.in[0]);
});

test('the reduced variants are still panels, each faded in over 80 ms: nobody travels, nothing pulses or flashes', () => {
  for (const [frameOf, end, stages] of [[t => releaseFrame(t, { reduced: true, count: 3 }), releaseEnd(true), RELEASE_FILM.reduced.stages], [t => ejectFrame(t, { reduced: true, subjects: [{ body: false }, { body: true }] }), ejectEnd(true), EJECT_FILM.reduced.stages]]) {
    const seen = new Set();
    for (let t = 0; t < end; t += 10) {
      const frame = frameOf(t);
      seen.add(frame.stage);
      assert.ok(frame.people.every(person => ['jail', 'settled', 'gone'].includes(person.state)));
      assert.equal(frame.pulse, null);
      assert.ok(!frame.inset.ring && !frame.inset.click && !frame.inset.glove);
      assert.ok([0, 1].includes(frame.door.open));
      assert.ok((frame.push ?? 1) === 1 && !(frame.suction?.opacity) && !(frame.debris?.opacity));
    }
    assert.deepEqual([...seen], stages);
    assert.ok(frameOf(40).opacity < 1 && frameOf(40).fade < 1);
    assert.equal(frameOf(end).done, true);
  }
  assert.equal(releaseEnd(true), 2240);
  assert.equal(ejectEnd(true), 2560);
});

test('the console inset sits right of the Captain, below every caption, whole in the top band, at every phone', () => {
  let placed = 0;
  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 740 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    for (const capsule of [true, false]) {
      for (const roster of [7, 8, 9]) {
        const { band: area, panel, captain, tag, inset } = band(viewport, roster, capsule);
        assert.ok(inset, `${viewport.width}x${viewport.height}`);
        placed += 1;
        assert.ok(inset.top >= area.top + panel.cap - 0.01);
        assert.ok(inset.left >= captain.left + captain.width && !meets(inset, tag));
        assert.ok(inset.left + inset.width <= area.left + area.width + 0.01 && inset.top + inset.height <= area.top + area.height + 0.01);
        assert.ok(inset.scale <= 1 && inset.width >= CONSOLE.minWidth);
      }
    }
  }
  assert.equal(placed, 24);
  // Too little room: no inset, never a squeezed one.
  assert.equal(consoleBox({ band: { left: 0, top: 0, width: 150, height: 90 }, cap: 44, captain: { left: 50, top: 44, width: 44, height: 44 }, tag: null }), null);
});

test('the pulse\'s way runs from the inset down the gutters and the spine to the Jail\'s lamp', () => {
  const { board, inset } = band({ width: 390, height: 844 }, 9, true);
  const jail = frameScene(sceneOf('jail', 9), board.panels.jail);
  const start = [inset.left + inset.width / 2, inset.top + inset.height];
  const way = conduitPoints({ boxes: board.boxes, border: board.shell.border, jail, start });
  assert.equal(way.length, 6);
  assert.deepEqual(way[0], start.map(v => Number(v.toFixed(2))));
  const [a, b] = [board.boxes['room-a'], board.boxes['room-b']];
  assert.ok(way[2][0] > a.left + a.width && way[2][0] < b.left);
  assert.ok(way[1][1] > board.boxes['command-room'].top + board.boxes['command-room'].height && way[1][1] < a.top);
  const lamp = board.boxes.jail.top + board.shell.border + jail.ty + JAIL_DOOR.lamp[1] * jail.k;
  assert.ok(Math.abs(way[5][1] - lamp) < 0.01);
  const { total, head } = conduitAt(way, 1);
  assert.deepEqual(head, way[5]);
  assert.ok(total > 0);
  const tail = conduitSegment(way, 0.4, 0.6);
  assert.deepEqual(tail[0], conduitAt(way, 0.4).head);
  assert.deepEqual(tail.at(-1), conduitAt(way, 0.6).head);
  assert.deepEqual(conduitSegment(way, 0, 0.0001).length >= 2, true);
});

test('the Jail\'s door at rest is the room\'s own; it opens into the wall; the hatch is drawn whole below the caption', async () => {
  const scene = await readFile(new URL('../../../design/board-motion/assets/scenes/jail.back.svg', import.meta.url), 'utf8');
  for (const element of Object.values(JAIL_DOOR_ELEMENTS).flat()) assert.ok(scene.includes(element), element.slice(0, 50));
  const rest = jailDoorSvg({});
  assert.ok(rest.includes(JAIL_DOOR_ELEMENTS.surface) && rest.includes(JAIL_DOOR_ELEMENTS.outline));
  assert.doesNotMatch(rest, /translate\(/);
  assert.match(jailDoorSvg({ open: 1 }), /translate\(-114 0\)[\s\S]*translate\(114 0\)/);
  assert.match(jailDoorSvg({ wheel: 90 }), /rotate\(90 512 252\)/);
  assert.notEqual(jailDoorSvg({ lamp: 'green', keypad: 'green' }), rest);
  assert.throws(() => jailDoorSvg({ lamp: 'blue' }));
  for (const viewport of [{ width: 320, height: 568 }, { width: 430, height: 932 }]) {
    const board = fitBoardV2(viewport, 9, { capsule: true });
    const panel = board.panels.jail;
    const jail = frameScene(sceneOf('jail', 9), panel);
    const rim = AIRLOCK.r + 6 + 2.5;
    assert.ok(jail.tx + (AIRLOCK.c[0] - rim) * jail.k >= 0);
    assert.ok(jail.ty + (AIRLOCK.c[1] - rim) * jail.k >= panel.cap);
  }
  assert.notEqual(airlockSvg({ open: 1 }), airlockSvg({}));
});

test('the people: walking to the door, pulled into the hatch shrinking and turning, the Captain dipping at the press', () => {
  const slot = { at: [246, 404], scale: 0.98 };
  assert.deepEqual(walkToDoor(slot, 0).at, slot.at);
  assert.deepEqual(walkToDoor(slot, 1).at, DOOR_STEP.at);
  assert.equal(walkToDoor(slot, 0.5).mirror, true);
  const pulled = pullToHatch(slot, 1, 0);
  assert.ok(pulled.scale < slot.scale * 0.3 && pulled.opacity === 0 && Math.abs(pulled.turn) === 300);
  assert.equal(pullToHatch(slot, 0).opacity, 1);
  assert.equal(CAPTAIN_POSES.press.neck[1] - CAPTAIN_POSES.table.neck[1], PRESS_DIP);
  assert.deepEqual(CAPTAIN_POSES.press.front, ['armF', 'armN']);
  assert.ok(startle(skeletonOf('wallLean')).neck[1] < skeletonOf('wallLean').neck[1]);
  assert.deepEqual(ejectPose(skeletonOf('wallLean'), { tumbling: 1 }), TUMBLE);
  assert.deepEqual(ejectPose(skeletonOf('wallLean'), { braced: 1 }), BRACE);
});

test('the art: colors apart from every faction accent; the memorial greys say no side, role or outfit', () => {
  for (const [name, { distance }] of Object.entries(captainColorDistances())) assert.ok(distance >= MIN_ACCENT_DISTANCE, name);
  const grey = memorialSvg('<rect fill="#36C46E"/><rect fill="#151923"/><rect fill="#FF8C8C"/>');
  assert.match(grey, /fill="#151923"/);
  assert.doesNotMatch(grey, /#36C46E|#FF8C8C/);
  for (const hex of grey.match(/#[0-9A-F]{6}/g).filter(value => value !== '#151923')) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    assert.ok(Math.abs(r - g) <= 16 && Math.abs(g - b) <= 22, hex);
  }
  assert.ok(CAPTAIN.red !== '#FF8C8C' && CAPTAIN.green !== '#70AFFF');
  const at = plaqueBox({ caption: { left: 3, top: 3, width: 50, height: 22 }, size: [30, 18], panel: { width: 176, height: 186, cap: 32 } });
  assert.ok(at.left >= 53 && at.top >= 2 && at.top + 18 <= 30);
});

test('the review page\'s outcomes: Backend\'s listed seats; the released in Rooms A and B; the ejected off the board; detainees and bodies kept', () => {
  for (const name of Object.keys(CAPTAIN_OUTCOMES)) {
    for (const roster of [7, 8, 9]) {
      const outcome = captainOutcome(name, roster);
      const jail = outcome.before.filter(seat => seat.room === 'jail' && (outcome.kind === 'EJECT' || seat.health !== 'Eliminated')).map(seat => seat.seat);
      assert.deepEqual(outcome.seatIds, jail.sort((x, y) => x - y));
      for (const seat of outcome.after.filter(entry => outcome.seatIds.includes(entry.seat))) {
        if (outcome.kind === 'RELEASE') assert.ok(['room-a', 'room-b'].includes(seat.room) && !seat.jailed);
        else assert.ok(seat.room === null && seat.slot === null && seat.health === 'Eliminated');
      }
      const slots = outcome.after.filter(seat => seat.slot).map(seat => seat.slot);
      assert.equal(new Set(slots).size, slots.length);
      assert.deepEqual(outcome.subjects.map(subject => subject.from), [...outcome.subjects.map(subject => subject.from)].sort());
    }
  }
  assert.equal(captainOutcome('release', 9).after.find(seat => seat.seat === 9).slot, 'J5');
  assert.equal(captainOutcome('eject', 9).after.find(seat => seat.seat === 8).slot, 'H2');
  assert.deepEqual(captainOutcome('eject', 9).seatIds, [3, 4, 9]);
  assert.equal(captainWords('RELEASE', [3, 4]), 'Player 3, Player 4: released from detention.');
  assert.equal(captainWords('EJECT', [3, 4, 9]), 'Player 3, Player 4, Player 9: ejected.');
});

test('the characters off the board: a 44 px card each in the sheet, in a row, or two, or none where they cannot fit', () => {
  const { sheet } = turnsLayout({ width: 320, height: 568 }, 9, {});
  const five = offBoardCards(sheet.body, 5);
  assert.equal(five.length, 5);
  assert.ok(five.every(card => card.width >= CARD.min && card.top === five[0].top));
  for (let i = 1; i < 5; i += 1) assert.ok(five[i].left >= five[i - 1].left + five[i - 1].width + CARD.gap - 0.01);
  assert.deepEqual(offBoardCards(sheet.body, 0), []);
  const narrow = offBoardCards({ left: 0, top: 0, width: 200, height: 190 }, 5);
  assert.equal(new Set(narrow.map(card => card.top)).size, 2);
  assert.equal(offBoardCards({ left: 0, top: 0, width: 200, height: 60 }, 9), null);
});

test('the contracts: two public films and the Captain\'s plates, the storyboards\' ids, no actor or role named', () => {
  const contracts = captainContracts();
  assert.deepEqual(contracts.map(film => [film.id, film.storyboard]), [['captain-release', 'S6'], ['captain-eject', 'S7'], ['captain-buttons', 'S8']]);
  assert.ok(contracts.slice(0, 2).every(film => film.audience.startsWith('public')));
  const text = JSON.stringify(contracts);
  for (const word of ROLE_WORDS) assert.ok(!text.includes(word), word);
  assert.ok(contracts[0].notInputs.some(entry => entry.startsWith('an actor field')));
});
