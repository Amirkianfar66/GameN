// mothership:dev-only
//
// The private-talk capsule (design/board-v2/scenes/capsule.mjs, figures/capsule.mjs,
// films/capsule.mjs, fit.mjs { capsule: true }; docs/design/private-capsule.md): its place on the
// board, its film, its poses and its colors. These test the proposal's own modules: none of them is
// a rule, a server contract or a measurement of a phone, and none says who may talk to whom.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAPSULE, capsuleSplit, fitBoardV2, slotRects } from '../../../design/board-v2/js/fit.mjs';
import { BOARD_ROOMS, ROSTERS } from '../../../design/board-v2/scenes/slots.mjs';
import { CADENCE, CAPSULE_FILM, capsuleContract, capsuleEnd, capsuleFrame, capsulePerson, homePerson, seatedPose } from '../../../design/board-v2/films/capsule.mjs';
import { BESIDE, CAPSULE_ACCENTS, CAPSULE_KEEP, CAPSULE_SEATS, CAPSULE_VIEW, CAPTION_CLEAR, DOOR, DOOR_FRAMES, DOORWAY, PATHS, TABLE, TAG_STRIP, capsuleLayers, capsuleTargets, frameCapsule } from '../../../design/board-v2/scenes/capsule.mjs';
import { CAPSULE_POSES, LOOP, POSE_NAMES, capsuleLoop, sittingPose, statusOf, walkingPose } from '../../../design/board-v2/figures/capsule.mjs';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';

const PHONES = [[320, 568], [360, 640], [360, 740], [375, 667], [390, 844], [393, 852], [414, 896], [430, 932]];
const OPEN = DOOR_FRAMES - 1;
const both = { P1: 'live', P2: 'live' };

test('the capsule sits on the Command Room\'s right, as tall, half its width, and moves no other room', () => {
  for (const [width, height] of PHONES) {
    for (const roster of ROSTERS) {
      const plain = fitBoardV2({ width, height }, roster);
      const board = fitBoardV2({ width, height }, roster, { capsule: true });
      assert.equal(plain.capsule, undefined);
      assert.equal(plain.boxes[CAPSULE.id], undefined);
      assert.equal(board.capsule, true);
      const command = board.boxes['command-room'], capsule = board.boxes[CAPSULE.id];
      assert.ok(Math.abs(board.panels['command-room'].width - 2 * board.panels[CAPSULE.id].width) < 1e-9, `${width}x${height}: exactly 2:1`);
      assert.equal(capsule.top, command.top);
      assert.equal(capsule.height, command.height);
      assert.ok(Math.abs(capsule.left - (command.left + command.width + board.shell.gap)) < 1e-9);
      assert.ok(Math.abs(capsule.left + capsule.width - (plain.boxes['command-room'].left + plain.boxes['command-room'].width)) < 1e-9);
      for (const room of BOARD_ROOMS.filter(name => name !== 'command-room')) assert.deepEqual(board.boxes[room], plain.boxes[room], `${width}x${height} ${room}`);
      assert.deepEqual(board.bands, plain.bands);
      assert.equal(board.shell.tier, plain.shell.tier);
      const [c1] = slotRects('command-room', roster, board.panels['command-room']);
      assert.ok(c1.side >= 44);
    }
  }
  // The split: the band less a gap and four borders, exactly 2:1.
  const split = capsuleSplit(380);
  assert.ok(Math.abs(split.capsule - 367 / 3) < 1e-9 && Math.abs(split.command - 2 * split.capsule) < 1e-9);
});

test('the cabin covers its panel and keeps the pair first: the light and their heads, the floor cropped first', () => {
  for (const [width, height] of PHONES) {
    const panel = fitBoardV2({ width, height }, 9, { capsule: true }).panels[CAPSULE.id];
    const { k, tx, ty } = frameCapsule(panel);
    assert.ok(512 * k >= panel.width - 0.01 && 768 * k >= panel.height - 0.01);
    // The status light and the pair's chins: whole on every phone measured, the chins above the name tags; the doorway and both seats across.
    assert.ok(CAPSULE_KEEP.top * k + ty >= -0.01 && CAPSULE_KEEP.bottom * k + ty <= panel.height - TAG_STRIP + 0.01, `${width}x${height}`);
    assert.ok(DOOR.x0 * k + tx >= -0.01 && DOOR.x1 * k + tx <= panel.width + 0.01, `${width}x${height}`);
    assert.ok(-(CAPSULE_VIEW.left * k + tx) <= 2 && CAPSULE_VIEW.right * k + tx - panel.width <= 2, `${width}x${height}`);
    for (const [x] of [DOORWAY.at, ...CAPSULE_SEATS.map(seat => seat.at)]) assert.ok(x * k + tx >= 0 && x * k + tx <= panel.width, `${width}x${height}: ${x} across`);
  }
  // A panel too short for the light and the heads keeps the heads, just above the name tags.
  const short = { width: 136, height: 96 };
  const framed = frameCapsule(short);
  assert.ok(Math.abs(CAPSULE_KEEP.bottom * framed.k + framed.ty - (short.height - TAG_STRIP)) < 0.01);
});

test('each seated participant is its own 44 px target in the capsule, whole, below the caption and apart', () => {
  for (const [width, height] of PHONES) {
    for (const roster of ROSTERS) {
      const panel = fitBoardV2({ width, height }, roster, { capsule: true }).panels[CAPSULE.id];
      const [p1, p2] = capsuleTargets(panel);
      assert.deepEqual([p1.id, p2.id], ['P1', 'P2']);
      for (const target of [p1, p2]) {
        assert.ok(target.side >= 44);
        assert.ok(target.left >= 0 && target.left + target.side <= panel.width + 1e-9, `${width}x${height} ${target.id} across`);
        assert.ok(target.top >= CAPTION_CLEAR && target.top + target.side <= panel.height + 1e-9, `${width}x${height} ${target.id} down`);
      }
      assert.ok(p1.left + p1.side <= p2.left + 1e-9, `${width}x${height}: apart`);
    }
  }
});

test('the entrance plays inside the five-second result stage: out of their rooms, through the door, seated, the door shut', () => {
  const at = t => capsuleFrame('result', t, { known: both });
  assert.equal(at(0).highlight, 0);
  assert.equal(at(300).highlight, 1);
  assert.equal(at(760).people.P1.home.state, 'standing');
  assert.equal(at(1200).people.P1.home.state, 'stepping');
  assert.equal(at(1500).people.P1.home.state, 'away');
  // The door slides open in three steps, 1 250 to 1 550 ms, and shut in three, 3 300 to 3 600 ms.
  assert.deepEqual([1249, 1300, 1400, 1550].map(t => at(t).door), [0, 1, 2, OPEN]);
  assert.deepEqual([3299, 3300, 3400, 3500, 3600].map(t => at(t).door), [OPEN, 2, 1, 0, 0]);
  assert.equal(at(1600).door, OPEN);
  assert.equal(at(1600).people.P1.capsule.state, 'entering');
  assert.equal(at(1600).people.P2.capsule.state, 'empty');
  assert.equal(at(2100).people.P2.capsule.state, 'entering');
  assert.equal(at(2700).people.P1.capsule.state, 'sitting');
  const settled = at(CAPSULE_FILM.entrance.settledAt);
  assert.equal(settled.door, 0);
  assert.equal(settled.busy, true);
  assert.deepEqual(Object.values(settled.people).map(person => person.capsule.state), ['seated', 'seated']);
  assert.ok(capsuleEnd('result') <= CAPSULE_FILM.server.resultMs - 1000);
  assert.ok(capsuleEnd('result', { reduced: true }) <= CAPSULE_FILM.server.resultMs - 1000);
  // Nobody is in two places: out of the room before the capsule draws them.
  for (let t = 0; t < 5000; t += 5) for (const person of Object.values(at(t).people)) assert.ok(!(person.home.figure > 0 && person.capsule.opacity > 0), `${t}`);
});

test('the conversation is the server\'s minute: both seated behind the shut door, nothing counted from the film', () => {
  assert.equal(CAPSULE_FILM.server.talkMs, 60000);
  for (let t = 0; t <= 60000; t += 1000) {
    const frame = capsuleFrame('talk', t, { known: both });
    assert.equal(frame.door, 0);
    assert.equal(frame.busy, true);
    assert.deepEqual(Object.values(frame.people).map(person => person.capsule.state), ['seated', 'seated']);
    assert.deepEqual(capsuleFrame('talk', t, { known: { P1: 'settled', P2: 'settled' } }), frame);
  }
});

test('the exit blocks nothing: each back at its latest place as it leaves the capsule, the light out at once', () => {
  const at = t => capsuleFrame('exit', t, { known: both });
  assert.equal(at(0).busy, false);
  assert.equal(at(150).door > 0, true);
  assert.equal(at(360).people.P1.capsule.state, 'standing');
  assert.equal(at(800).people.P1.capsule.state, 'leaving');
  assert.equal(at(1200).people.P2.home.state, 'returning');
  assert.equal(at(1200).people.P1.home.state, 'away');
  assert.equal(at(1400).people.P1.home.state, 'returning');
  const end = at(CAPSULE_FILM.exit.endAt);
  assert.equal(end.door, 0);
  assert.deepEqual(Object.values(end.people).map(person => [person.home.state, person.capsule.state]), [['present', 'empty'], ['present', 'empty']]);
  assert.equal(capsuleEnd('exit'), CAPSULE_FILM.exit.endAt);
  for (let t = 0; t <= 3000; t += 5) for (const person of Object.values(at(t).people)) assert.ok(!(person.home.figure > 0 && person.capsule.opacity > 0), `${t}`);
  // The return goes to the place the board has now: homePerson draws whatever slot it is given.
  const slot = { at: [500, 600], scale: 1, mirror: false };
  assert.deepEqual(homePerson(slot, { state: 'present', progress: 1 }, { tilt: 0 }, {}).at, slot.at);
});

test('only public inputs: a side, a claim, who asked or who is speaking changes nothing', () => {
  for (const stage of ['declare', 'result', 'talk', 'exit']) {
    for (let t = 0; t <= 5000; t += 50) {
      for (const reduced of [false, true]) {
        const frame = capsuleFrame(stage, t, { known: both, reduced });
        assert.deepEqual(capsuleFrame(stage, t, { known: both, reduced, side: 'red', claim: 'blue', asked: 'P2', speaking: 'P1', microphone: true }), frame);
      }
    }
  }
  const contract = capsuleContract();
  assert.ok(contract.audience.film.startsWith('public'));
  assert.ok(contract.audience.claim.startsWith('participant-private'));
  for (const input of ['the declared side or the claim', 'which participant asked', 'who is speaking, a microphone or any sound', 'an animation\'s completion']) assert.ok(contract.notInputs.includes(input), input);
  for (const word of ['Officer', 'Insider', 'Cracker', 'Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien']) assert.ok(!JSON.stringify(contract).includes(word), word);
});

test('loading draws only the seats named; a seat named late and a reconnect are drawn settled, nothing replayed', () => {
  for (const stage of ['declare', 'result', 'talk', 'exit']) {
    for (const t of [0, 400, 1600, 2400, 3600, 4999]) {
      const none = capsuleFrame(stage, t, { known: {} });
      assert.deepEqual(none, { stage, door: 0, busy: false, highlight: 0, people: {} });
      assert.deepEqual(Object.keys(capsuleFrame(stage, t, { known: { P1: 'live' } }).people), ['P1']);
      const reconnect = capsuleFrame(stage, t, { known: { P1: 'settled', P2: 'settled' } });
      for (const person of Object.values(reconnect.people)) {
        assert.ok(['present', 'away'].includes(person.home.state));
        assert.ok(['empty', 'seated'].includes(person.capsule.state));
      }
      if (stage === 'result') assert.deepEqual([reconnect.door, reconnect.busy], [0, true]);
      if (stage === 'exit') assert.deepEqual([reconnect.door, reconnect.busy], [0, false]);
    }
  }
  // Late: the second named after its part began is seated while the first still walks.
  const late = capsuleFrame('result', 2400, { known: { P1: 'live', P2: 'settled' } });
  assert.equal(late.people.P1.capsule.state, 'entering');
  assert.equal(late.people.P2.capsule.state, 'seated');
});

test('reduced motion: no walking, no steps, no variations; one brief door and one 80 ms fade', () => {
  for (const stage of ['result', 'talk', 'exit']) {
    for (let t = 0; t <= 5000; t += 10) {
      const frame = capsuleFrame(stage, t, { known: both, reduced: true });
      for (const person of Object.values(frame.people)) {
        assert.ok(!['standing', 'stepping', 'returning', 'settling'].includes(person.home.state), `${stage} ${t}`);
        assert.ok(!['entering', 'sitting', 'standing', 'leaving'].includes(person.capsule.state), `${stage} ${t}`);
      }
    }
  }
  assert.equal(CAPSULE_FILM.reduced.fadeMs, 80);
  for (const t of [0, 5000, 30000]) assert.deepEqual(seatedPose('P1', t, {}, { exchangeId: 'x', reduced: true }), sittingPose('sit', {}));
});

test('the paths: from the doorway, P1 behind the table, P2 straight to its chair; neither crosses the table', () => {
  for (const seat of CAPSULE_SEATS) {
    const path = PATHS[seat.id];
    assert.deepEqual(path[0], DOORWAY.at);
    assert.deepEqual(path.at(-1), BESIDE[seat.id]);
    for (let i = 1; i < path.length; i += 1) {
      for (let u = 0; u <= 1; u += 0.01) {
        const x = path[i - 1][0] + (path[i][0] - path[i - 1][0]) * u, y = path[i - 1][1] + (path[i][1] - path[i - 1][1]) * u;
        assert.ok(!(Math.abs(x - TABLE.cx) < TABLE.rx + 10 && y > TABLE.top - TABLE.ry && y < TABLE.foot + 10), `${seat.id} at ${x},${y}`);
      }
    }
  }
  // Walking in, a participant grows from the doorway's scale to its seat's, and steps at the approved move's cadence.
  const start = capsulePerson('P1', { state: 'entering', progress: 0, opacity: 1 }, {});
  const end = capsulePerson('P1', { state: 'entering', progress: 1, opacity: 1 }, {});
  assert.equal(start.scale, DOORWAY.scale);
  assert.equal(end.scale, CAPSULE_SEATS[0].scale);
  assert.equal(CADENCE, 1.5 / 450);
  const seated = capsulePerson('P1', { state: 'seated', progress: 1, opacity: 1 }, {});
  assert.deepEqual(seated.at, CAPSULE_SEATS[0].at);
  assert.equal(seated.mirror, true);
  assert.equal(capsulePerson('P2', { state: 'seated', progress: 1, opacity: 1 }, {}).mirror, false);
});

test('poses keep what the board shows: a patient\'s bandage and stagger, a prisoner\'s hands together; nothing heals or frees', () => {
  assert.deepEqual(statusOf({ health: 'Injured', room: 'hospital', jailed: false }), { injured: true, jailed: false });
  assert.deepEqual(statusOf({ health: 'Healthy', room: 'jail', jailed: false }), { injured: false, jailed: true });
  assert.deepEqual(statusOf({ health: 'Injured', room: 'hospital', jailed: true }), { injured: true, jailed: true });
  for (const status of [{ injured: true }, { jailed: true }, { injured: true, jailed: true }]) {
    for (const sk of [...POSE_NAMES.map(name => sittingPose(name, status)), ...[0, 0.25, 0.5, 0.75].map(phase => walkingPose(phase, status))]) {
      if (status.injured) assert.equal(sk.bandage, true);
      if (status.jailed) assert.ok(Math.hypot(sk.wF[0] - sk.wN[0], sk.wF[1] - sk.wN[1]) <= 8);
    }
  }
  // A prisoner neither opens a hand nor holds its chin; the stagger is the approved one.
  assert.deepEqual(sittingPose('open', { jailed: true }), sittingPose('sit', { jailed: true }));
  assert.deepEqual(sittingPose('chin', { jailed: true }), sittingPose('sit', { jailed: true }));
  assert.notDeepEqual(walkingPose(0.1, { injured: true }).aF, walkingPose(0.1, {}).aF);
  assert.deepEqual(Object.keys(CAPSULE_POSES), POSE_NAMES);
});

test('the seated variations: a public schedule, the same on every screen, the two never in step', () => {
  for (const exchange of ['x-1', 'x-2', 'x-review']) {
    const one = capsuleLoop(exchange, 'P1');
    assert.deepEqual(capsuleLoop(exchange, 'P1'), one);
    assert.notDeepEqual(capsuleLoop(exchange, 'P2'), one);
    assert.deepEqual(one.keys[0], { at: 0, pose: 'sit' });
    for (const key of one.keys) assert.ok(POSE_NAMES.includes(key.pose));
    for (let i = 2; i < one.keys.length; i += 1) {
      const hold = one.keys[i].at - one.keys[i - 1].at;
      assert.ok(hold >= LOOP.hold[0] && hold <= LOOP.hold[1], `${hold}`);
    }
  }
});

test('the art: its layers, the door\'s four positions, and every color an exchange adds far from the faction accents', () => {
  const layers = capsuleLayers();
  assert.deepEqual(Object.keys(layers), ['back', 'door-0', 'door-1', 'door-2', 'door-3', 'busy']);
  for (const markup of Object.values(layers)) {
    assert.ok(markup.includes('viewBox="0 0 512 768"'));
    assert.ok(!/<text\b|<image\b|<script\b|<foreignObject\b/.test(markup));
  }
  for (const hex of [CAPSULE_ACCENTS.busy, CAPSULE_ACCENTS.busyGlow, CAPSULE_ACCENTS.lamp]) {
    for (const accent of Object.values(FACTION_ACCENTS)) assert.ok(cie76(hex, accent) >= MIN_ACCENT_DISTANCE, `${hex} ${accent}`);
  }
});
