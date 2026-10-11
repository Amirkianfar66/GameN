// Static checks of the room-capacity suite (issue #96): the fixtures, the rows they cite, the
// tooling that holds an engine to the rule, and the audit document's tables. No engine is run
// here. What an engine did is in docs/balance/evidence/ and is held to its reports further down.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  ROLES_BY_MODE, ROOM_CAPACITY, buildReport, capacityReach, checkState, checkTransition, deriveSetup, parseRulebook, roomsWithinCapacity, runScenario, startLedger,
  startingRoomFacts, validateScenario, walk,
} from '@mothership/balance';
import { load } from './adapters/full-game-v1.mjs';
import { buildCapacityCatalog, setupFromLabel } from './capacity/catalog.mjs';
import { CAPACITY_DECISION, CAPACITY_RULES_PATH, CAPACITY_RULESET_VERSION, GROUPS, capacityFileUrl, loadAll, loadGroup, renderCapacityFile } from './capacity/files.mjs';
import {
  BEFORE_THE_RULE, EARLIER_RULESETS, EVIDENCE_REPORT, EXPECTED_FAILURES, HOLDS_WITHOUT_THE_RULE, IMPLEMENTATION, PASS_RULESET, caseOf, compatibilityTable, controlsTable, failureTable, loadEvidence,
  modeTable, playoutTable, probeTable, resultsTable,
} from './support/capacity-evidence.mjs';
import { fixtureTable, reachTable, startingRoomTable } from './support/capacity-tables.mjs';
import { openingObservation, stubAdapter } from './support/stub.mjs';
import { loadAll as loadVersionOne } from './v1/files.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const text = path => readFileSync(join(root, path), 'utf8');
const audit = text(CAPACITY_RULES_PATH);
const rulebook = new Map(parseRulebook(text('docs/balance/game-rules.md')).entries.map(entry => [entry.id, entry]));

// The capacity rows and the open questions, read from the audit document's two tables.
const ROW_STATUSES = ['OWNER', 'DERIVED', 'OPEN', 'ACCEPTANCE'];
const rows = new Map();
const questions = new Map();
for (const line of audit.split('\n')) {
  const cells = line.trim().startsWith('|') ? line.trim().slice(1, -1).split('|').map(cell => cell.trim()) : [];
  if (/^R-CAP-\d{2}$/.test(cells[0] ?? '')) {
    assert.equal(cells.length, 4, `${cells[0]}: a capacity row has four cells`);
    assert.ok(!rows.has(cells[0]), `${cells[0]} is written twice`);
    rows.set(cells[0], { text: cells[1], status: cells[2], sources: cells[3] });
  }
  if (/^CAP-D\d$/.test(cells[0] ?? '')) {
    assert.equal(cells.length, 4, `${cells[0]}: a question row has four cells`);
    assert.ok(!questions.has(cells[0]), `${cells[0]} is written twice`);
    questions.set(cells[0], { topic: cells[1], status: cells[2], answer: cells[3] });
  }
}

test('the committed capacity files are exactly what the catalogue produces', () => {
  const catalog = buildCapacityCatalog();
  for (const group of GROUPS) assert.equal(readFileSync(capacityFileUrl(group), 'utf8'), renderCapacityFile(group, catalog[group]), `mode ${group} is stale`);
});

test('every capacity fixture is well formed, and no identifier is used twice or by the Version 1 catalogue', () => {
  const all = loadAll();
  for (const scenario of all) assert.deepEqual(validateScenario(scenario), [], scenario.id);
  const ids = all.map(scenario => scenario.id);
  assert.equal(new Set(ids).size, ids.length);
  const versionOne = new Set(loadVersionOne().map(scenario => scenario.id));
  for (const id of ids) assert.ok(!versionOne.has(id), `${id} is also a Version 1 identifier`);
  for (const scenario of all) assert.match(scenario.id, /^V1-M[789]-CAP-\d{2}$/);
});

test('the three modes are separate files; every setup is reproduced by its label and is a legal start unless the case is that it is refused', () => {
  for (const group of GROUPS) {
    const mode = Number(group);
    const { header, setups, scenarios } = loadGroup(group);
    assert.equal(header.mode, mode);
    assert.equal(header.pins.rulesetVersion, CAPACITY_RULESET_VERSION);
    assert.equal(header.pins.roomCapacity, ROOM_CAPACITY);
    assert.deepEqual(header.pins.ownerDecision, CAPACITY_DECISION);
    assert.deepEqual(header.counts, {
      total: scenarios.length, ready: scenarios.filter(item => item.status === 'ready').length,
      blocked: scenarios.filter(item => item.status === 'blocked').length, manual: scenarios.filter(item => item.status === 'manual').length,
    });
    for (const scenario of scenarios) assert.equal(scenario.mode, mode, scenario.id);
    for (const [seed, setup] of Object.entries(setups)) {
      assert.deepEqual(setup, setupFromLabel(mode, seed), `${group}: ${seed}`);
      assert.deepEqual([...setup.roleOrder].sort(), [...ROLES_BY_MODE[mode]].sort());
    }
    for (const scenario of scenarios) {
      if (scenario.setup === null) continue;
      const refused = scenario.steps.some(step => step.op === 'createRejected');
      assert.equal(roomsWithinCapacity(scenario.setup.initialRooms), !refused, `${scenario.id}: a start is legal exactly when the case is not that it is refused`);
    }
  }
  // The cases that need a sixth Injured player exist only where a match has six damage to give.
  const only = id => GROUPS.filter(group => loadGroup(group).scenarios.some(scenario => scenario.id.endsWith(id)));
  for (const id of ['CAP-22', 'CAP-23', 'CAP-24', 'CAP-26']) assert.deepEqual(only(id), ['9'], id);
  assert.equal(capacityReach(7).mostWaiting + capacityReach(8).mostWaiting, 0);
  assert.equal(capacityReach(9).mostWaiting, 1);
});

// The decisions the owner gave in the Game Balance session on 11 October 2026, from the table of section 7.
const ownerDecisions = new Map([...audit.matchAll(/^\| (BAL-OD-\d) \| (.+?) \| (.+?) \|$/gm)].map(match => [match[1], { question: match[2], decided: match[3] }]));

test('the owner\'s decisions of 11 October are recorded once each, with the owner\'s words, and every one is carried by a row', () => {
  assert.deepEqual([...ownerDecisions.keys()], ['BAL-OD-1', 'BAL-OD-2', 'BAL-OD-3', 'BAL-OD-4', 'BAL-OD-5']);
  assert.ok(audit.includes('"yes go with your recommendations for all five"'));
  assert.ok(audit.includes('"Their last room (Recommended)"'));
  for (const [id, decision] of ownerDecisions) {
    const carriers = [...rows].filter(([, row]) => row.sources.includes(`\`${id}\``));
    assert.ok(carriers.length > 0, `${id} is carried by no row`);
    for (const [rowId, row] of carriers) {
      assert.equal(row.status, 'OWNER', `${rowId} carries ${id}`);
      assert.ok(decision.decided.includes(rowId), `the record of ${id} names ${rowId}`);
    }
  }
});

test('the capacity rows are complete: each has a status and a source of its kind, and every open one names an open question', () => {
  assert.deepEqual([...rows.keys()], [...rows.keys()].sort());
  assert.deepEqual([...rows.keys()], Array.from({ length: rows.size }, (_, index) => `R-CAP-${String(index + 1).padStart(2, '0')}`));
  for (const [id, row] of rows) {
    assert.ok(ROW_STATUSES.includes(row.status), `${id}: status ${row.status}`);
    assert.ok(row.text.length > 0 && row.sources.length > 0, id);
    const cited = [...row.sources.matchAll(/`([^`]+)`/g)].map(match => match[1]);
    for (const ref of cited.filter(item => /^R-/.test(item))) assert.ok(rows.has(ref) || rulebook.has(ref), `${id} cites unknown rule ${ref}`);
    for (const ref of cited.filter(item => /^CAP-D/.test(item))) assert.ok(questions.has(ref), `${id} cites unknown question ${ref}`);
    const question = cited.filter(item => /^CAP-D\d$/.test(item));
    if (row.status === 'OPEN') {
      assert.equal(question.length, 1, `${id}: an open row names its one question`);
      assert.equal(questions.get(question[0]).status, 'OPEN', `${id}: its question is open`);
    } else assert.equal(question.length, 0, `${id}: only an open row names a question`);
    // The owner's decision is cited by where it is recorded: the issue, or Backend's record of what was said to Backend.
    // or the decisions the owner gave in the Game Balance session, which section 7 of the audit records.
    if (row.status === 'OWNER') assert.ok(cited.some(item => item === '#96' || /^(CAPACITY-0\d|CAP-ORDER-01|BAL-OD-\d)$/.test(item)), `${id}: an owner row cites issue #96, Backend's record or a decision of section 7`);
    for (const ref of cited.filter(item => /^BAL-OD-/.test(item))) assert.ok(ownerDecisions.has(ref), `${id} cites unknown decision ${ref}`);
    if (row.status === 'DERIVED') assert.ok(cited.some(item => /^R-/.test(item)), `${id}: a derived row names what it follows from`);
  }
  for (const [id, question] of questions) {
    assert.ok(['OPEN', 'RESOLVED'].includes(question.status), `${id}: status ${question.status}`);
    const used = [...rows.values()].some(row => row.sources.includes(`\`${id}\``));
    assert.equal(used, question.status === 'OPEN', `${id}: an open question has its open row, and an answered one has none`);
  }
});

test('every rule a capacity fixture names exists; ready cases rest on decided rows, and blocked cases on an open question', () => {
  const status = id => rows.get(id)?.status ?? rulebook.get(id)?.status;
  for (const scenario of loadAll()) {
    for (const id of [...scenario.ruleRefs, ...scenario.dependsOn]) assert.ok(status(id) !== undefined, `${scenario.id} names unknown rule ${id}`);
    assert.ok(scenario.ruleRefs.some(id => rows.has(id)), `${scenario.id} names no capacity row`);
    if (scenario.status === 'ready') {
      for (const id of [...scenario.ruleRefs, ...scenario.dependsOn]) assert.notEqual(status(id), 'OPEN', `${scenario.id} is ready and rests on the open rule ${id}`);
    }
    if (scenario.status === 'blocked') {
      assert.equal(scenario.decisionIds.length, 1, scenario.id);
      assert.equal(questions.get(scenario.decisionIds[0])?.status, 'OPEN', `${scenario.id}: ${scenario.decisionIds[0]} is an open question`);
      assert.ok(scenario.ruleRefs.some(id => rows.get(id)?.status === 'OPEN' && rows.get(id).sources.includes(`\`${scenario.decisionIds[0]}\``)), `${scenario.id} names the open row of its question`);
      assert.ok(scenario.steps.some(step => step.op === 'note' || step.op === 'probe'), `${scenario.id} records what an engine does`);
    }
  }
  // Every open question is probed in every mode in which the situation can arise, and every decided row is used.
  for (const [id, question] of questions) {
    if (question.status !== 'OPEN') continue;
    for (const group of GROUPS) assert.ok(loadGroup(group).scenarios.some(scenario => scenario.decisionIds.includes(id)), `${id} has no blocked case with ${group} players`);
  }
  const used = new Set(loadAll().flatMap(scenario => scenario.ruleRefs));
  for (const id of rows.keys()) assert.ok(used.has(id), `${id} is cited by no fixture`);
});

test('the arithmetic tables and the fixture counts in the audit are the computed ones', () => {
  for (const [name, table] of [['where the limits can be reached', reachTable()], ['starting rooms', startingRoomTable()], ['fixtures', fixtureTable()]]) {
    assert.ok(audit.includes(table), `the table of ${name} in ${CAPACITY_RULES_PATH} differs from the computed one`);
  }
  // The counts the other documents give are the files' own.
  const all = loadAll();
  const has = status => all.filter(scenario => scenario.status === status).length;
  for (const path of ['docs/balance/README.md', 'docs/balance/integration-requests.md']) assert.ok(text(path).includes(`${all.length} fixtures`), `${path} does not say "${all.length} fixtures"`);
  assert.ok(text('docs/balance/integration-requests.md').includes(`${has('ready')} passed, 0 failed, ${has('blocked')} blocked and ${has('manual')} not run`));
  // The same arithmetic by another road, with exact fractions.
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} is not ${expected}`);
  close(startingRoomFacts(7).independentDrawOverCapacity, 16 / 128);
  close(startingRoomFacts(8).independentDrawOverCapacity, 74 / 256);
  close(startingRoomFacts(9).independentDrawOverCapacity, 260 / 512);
  close(startingRoomFacts(7).uniform.aRoomStartsFull, 42 / 112);
  close(startingRoomFacts(8).uniform.aRoomStartsFull, 112 / 182);
  close(startingRoomFacts(9).uniform.togetherLowest, 4 / 9);
  close(startingRoomFacts(9).sequential.settledBeforeJoining.at(-1), 372 / 512);
  // The first two of the order always have a draw each; the last two are together more often than any two under an order-free draw only with eight and nine players.
  for (const mode of [7, 8, 9]) close(startingRoomFacts(mode).sequential.togetherFirstTwo, 0.5);
  assert.ok(startingRoomFacts(7).sequential.togetherLastTwo < startingRoomFacts(7).uniform.togetherLowest);
  assert.ok(startingRoomFacts(8).sequential.togetherLastTwo > startingRoomFacts(8).uniform.togetherLowest);
  close(startingRoomFacts(9).sequential.togetherLastTwo, 302 / 512);
  for (const mode of [7, 8, 9]) {
    const facts = startingRoomFacts(mode);
    for (const scheme of [facts.uniform, facts.sequential, facts.balanced]) {
      close(scheme.splits.reduce((sum, share) => sum + share.probability, 0), 1);
      close(scheme.inRoomA, 0.5);
      assert.ok(scheme.splits.every(share => share.split[0] <= ROOM_CAPACITY && share.split[0] + share.split[1] === mode));
    }
    assert.equal(facts.freePlacesAtTheStart, 2 * ROOM_CAPACITY - mode);
    assert.deepEqual(facts.sequential.settledBeforeJoining.slice(0, ROOM_CAPACITY), [0, 0, 0, 0, 0], 'nobody is without a draw before a room can be full');
  }
  assert.deepEqual([7, 8, 9].map(mode => capacityReach(mode).mostInjuredAtOnce), [4, 5, 6]);
  assert.deepEqual([7, 8, 9].map(mode => capacityReach(mode).firstRoundASixthCanBeInjured), [null, null, 4]);
});

test('the number of Version 1 fixtures that the capacity ruleset cannot start is the one the documents give', () => {
  const withSetup = loadVersionOne().filter(scenario => scenario.mode !== null && scenario.setup !== null);
  const over = withSetup.filter(scenario => !roomsWithinCapacity(scenario.setup.initialRooms));
  const said = `${over.length} of its ${withSetup.length} fixtures with a setup`;
  for (const path of [CAPACITY_RULES_PATH, 'docs/balance/integration-requests.md']) assert.ok(text(path).includes(said), `${path} does not say "${said}"`);
  assert.ok(over.length > 0 && over.length < withSetup.length);
});

test('a capped draw of starting rooms is always legal, is the plain draw wherever that is legal, and reaches every legal split', () => {
  for (const mode of [7, 8, 9]) {
    const splits = new Set();
    let redrawn = 0;
    for (let index = 1; index <= 400; index += 1) {
      const plain = deriveSetup(mode, `walk-${index}`, { roles: 'seeded', rooms: 'seeded', orders: 'seeded' });
      const capped = deriveSetup(mode, `walk-${index}`, { roles: 'seeded', rooms: 'capped', orders: 'seeded' });
      assert.ok(roomsWithinCapacity(capped.initialRooms));
      assert.deepEqual({ ...capped, initialRooms: null }, { ...plain, initialRooms: null }, 'only the rooms may differ');
      if (roomsWithinCapacity(plain.initialRooms)) assert.deepEqual(capped.initialRooms, plain.initialRooms);
      else redrawn += 1;
      const inA = Object.values(capped.initialRooms).filter(room => room === 'Room A').length;
      splits.add(`${Math.max(inA, mode - inA)}/${Math.min(inA, mode - inA)}`);
    }
    assert.deepEqual([...splits].sort(), startingRoomFacts(mode).uniform.splits.map(share => share.split.join('/')).sort());
    assert.ok(redrawn > 0, 'some plain draws are over capacity, so the redraw has been exercised');
  }
  assert.equal(roomsWithinCapacity({ a: 'Room A', b: 'Room A', c: 'Room A', d: 'Room A', e: 'Room A', f: 'Room A', g: 'Room B' }), false);
  assert.equal(roomsWithinCapacity({ a: 'Room A', b: 'Room A', c: 'Room A', d: 'Room A', e: 'Room A', f: 'Room B', g: 'Room B' }), true);
});

// ---------------------------------------------------------------------------------------------
// The invariants, on observations bent by hand. The stand-in has no rules.
const base = setupFromLabel(7, 'cap-b5');
const seatOf = role => `seat-${base.roleOrder.indexOf(role) + 1}`;
const place = (observation, seat, changes) => {
  const next = structuredClone(observation);
  Object.assign(next.truth.seats.find(item => item.seat === seat), changes);
  const shown = Object.fromEntries(Object.entries(changes).filter(([key]) => ['health', 'location', 'jailed', 'captain'].includes(key)));
  for (const facts of [next.publicView, next.raw.public, ...Object.values(next.playerViews).map(view => view.publicFacts), ...Object.values(next.raw.players).map(view => view.public)]) {
    Object.assign(facts.seats.find(item => item.seat === seat), shown);
  }
  return next;
};
const found = (observation, capacity) => {
  const ledger = startLedger(observation);
  ledger.roomCapacity = capacity;
  return checkState(base, observation, ledger).map(violation => violation.invariant);
};

test('INV-CAP-01 and INV-CAP-02 see a sixth player in a room and an offer of a full room, and only where the run has the rule', () => {
  const opening = openingObservation(base);
  assert.deepEqual(found(opening, 5), []);
  const six = place(opening, seatOf('Alien'), { location: 'Room B' });
  assert.deepEqual(found(six, 5), ['INV-CAP-01']);
  assert.deepEqual(found(six, null), [], 'a ruleset without the rule is not held to it');
  // An Eliminated player counts: five living players and one Eliminated in a room are six.
  const withBody = place(six, seatOf('Insider'), { health: 'Eliminated' });
  for (const facts of [withBody.publicView, withBody.raw.public, ...Object.values(withBody.playerViews).map(view => view.publicFacts), ...Object.values(withBody.raw.players).map(view => view.public)]) {
    facts.seats.find(item => item.seat === seatOf('Insider')).revealedFaction = 'Blue';
  }
  assert.ok(found(withBody, 5).includes('INV-CAP-01'));
  const offered = structuredClone(opening);
  offered.playerViews[seatOf('Alien')].moveDestinations = ['Room B'];
  assert.deepEqual(found(offered, 5), ['INV-CAP-02']);
  assert.deepEqual(found(offered, null), []);
  const fine = structuredClone(opening);
  fine.playerViews[seatOf('Hacker')].moveDestinations = ['Room A'];
  assert.deepEqual(found(fine, 5), [], 'a room with a place may be offered');
});

test('an Injured player outside Hospital is a fault unless the run has the rule and Hospital is full', () => {
  const opening = openingObservation(base);
  const hurt = place(opening, seatOf('Alien'), { health: 'Injured' });
  assert.deepEqual(found(hurt, null), ['INV-LOC-02']);
  assert.deepEqual(found(hurt, 5), ['INV-LOC-02'], 'Hospital has places, so nobody waits');
  // Five players in Hospital: the sixth Injured player waits in their room.
  let full = hurt;
  for (const role of ['Blue Disabler', 'Insider', 'Supplier', 'Undercover', 'Hacker']) full = place(full, seatOf(role), { health: 'Injured', location: 'Hospital' });
  assert.deepEqual(found(full, 5), []);
  assert.deepEqual(found(full, null), ['INV-LOC-02']);
});

test('INV-CAP-03 sees a player sent to the other room although their last room has a place once the phase has closed', () => {
  const opening = openingObservation(base);
  const insider = seatOf('Insider');
  const inHospital = place(opening, insider, { health: 'Injured', location: 'Hospital' });
  const run = (before, after) => {
    const ledger = startLedger(before);
    ledger.roomCapacity = 5;
    return checkTransition(base, before, { ...after, phaseId: 'phase-2' }, { kind: 'advance', atMs: before.phaseEndsAt, advanced: true }, ledger)
      .filter(violation => violation.invariant === 'INV-CAP-03').length;
  };
  // Room B, the last room, holds four others: the other room is the wrong place.
  assert.equal(run(inHospital, place(inHospital, insider, { health: 'Healthy', location: 'Room A' })), 1);
  assert.equal(run(inHospital, place(inHospital, insider, { health: 'Healthy', location: 'Room B' })), 0);
  // Room B was filled meanwhile and stays full: the other room is right.
  const filled = place(inHospital, seatOf('Alien'), { location: 'Room B' });
  assert.equal(run(filled, place(filled, insider, { health: 'Healthy', location: 'Room A' })), 0);
  // A room-mate leaves Room B for Hospital in the same resolution: the place is free, and the other room is wrong.
  const emptied = place(place(filled, insider, { health: 'Healthy', location: 'Room A' }), seatOf('Hacker'), { location: 'Hospital', health: 'Injured' });
  assert.equal(run(filled, emptied), 1, 'a place that is being left in the same resolution is free');
  assert.equal(run(filled, place(place(filled, insider, { health: 'Healthy', location: 'Room B' }), seatOf('Hacker'), { location: 'Hospital', health: 'Injured' })), 0);
});

test('the last room is the room a player was last seen in, whatever the engine records', () => {
  // Alien starts in Room A. The engine of this stand-in then says their last room is Room B.
  const opening = openingObservation(base);
  const alien = seatOf('Alien');
  const ledger = startLedger(opening);
  ledger.roomCapacity = 5;
  const hurt = place(opening, alien, { health: 'Injured', location: 'Hospital', lastRoom: 'Room B' });
  const step = (before, after, phase) => checkTransition(base, before, { ...after, phaseId: phase }, { kind: 'advance', atMs: before.phaseEndsAt, advanced: true }, ledger)
    .filter(violation => violation.invariant === 'INV-CAP-03').map(violation => violation.message);
  assert.deepEqual(step(opening, hurt, 'phase-2'), []);
  // Room B has a place for them (Insider has left it), and so has Room A, where they last were.
  const room = place({ ...hurt, phaseId: 'phase-2' }, seatOf('Insider'), { health: 'Injured', location: 'Hospital' });
  assert.deepEqual(step({ ...hurt, phaseId: 'phase-2' }, place(room, alien, { health: 'Healthy', location: 'Room B' }), 'phase-3'),
    [`${alien} was sent to Room B although Room A, the room they were last in, has a place`]);
  // Standing somewhere else changes it: the ledger follows the player, not a record. Alien and
  // Hacker change rooms, Alien is hurt, and the engine's record still says Room A.
  const broken = returnsTo => {
    const fresh = startLedger(opening);
    fresh.roomCapacity = 5;
    const closes = (before, after, phase) => checkTransition(base, before, { ...after, phaseId: phase }, { kind: 'advance', atMs: before.phaseEndsAt, advanced: true }, fresh)
      .filter(violation => violation.invariant === 'INV-CAP-03').length;
    const walked = { ...place(place(opening, seatOf('Hacker'), { location: 'Room A' }), alien, { location: 'Room B' }), phaseId: 'phase-2' };
    const away = { ...place(walked, alien, { health: 'Injured', location: 'Hospital', lastRoom: 'Room A' }), phaseId: 'phase-3' };
    return [closes(opening, walked, 'phase-2'), closes(walked, away, 'phase-3'), closes(away, place(away, alien, { health: 'Healthy', location: returnsTo }), 'phase-4')];
  };
  assert.deepEqual(broken('Room A'), [0, 0, 1], 'they were last in Room B, which has a place');
  assert.deepEqual(broken('Room B'), [0, 0, 0]);
});

// What the capacity invariants say about one phase closing, from `before` to `after`.
const closing = (before, after, capacity = 5) => {
  const ledger = startLedger(before);
  ledger.roomCapacity = capacity;
  return [...new Set(checkTransition(base, before, { ...after, phaseId: 'phase-2' }, { kind: 'advance', atMs: before.phaseEndsAt, advanced: true }, ledger)
    .map(violation => violation.invariant).filter(invariant => invariant.startsWith('INV-CAP-')))].sort();
};

test('INV-CAP-01 counts Hospital and Jail as it counts the rooms, and a waiting player may be in no other place than a room or Jail', () => {
  const opening = openingObservation(base);
  const six = ['Blue Disabler', 'Insider', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
  let hospital = opening;
  for (const role of six) hospital = place(hospital, seatOf(role), { health: 'Injured', location: 'Hospital' });
  assert.ok(found(hospital, 5).includes('INV-CAP-01'), 'six players in Hospital');
  assert.ok(!found(hospital, null).includes('INV-CAP-01'));
  let jail = opening;
  for (const role of six) jail = place(jail, seatOf(role), { jailed: true, location: 'Jail' });
  assert.ok(found(jail, 5).includes('INV-CAP-01'), 'six players in Jail');
  // Five in Hospital and a sixth Injured player: in a room or in Jail they wait; anywhere else is a fault.
  let full = opening;
  for (const role of six.slice(0, 5)) full = place(full, seatOf(role), { health: 'Injured', location: 'Hospital' });
  for (const [location, fault] of [['Room A', false], ['Room B', false], ['Jail', false], ['Command Room', true]]) {
    assert.equal(found(place(full, seatOf('Alien'), { health: 'Injured', location }), 5).includes('INV-LOC-02'), fault, location);
  }
});

test('INV-CAP-03 covers a release and a Captain who lost the title; INV-CAP-04 to 06 see a player moved who should have stayed', () => {
  const opening = openingObservation(base);
  const supplier = seatOf('Supplier');
  // Released: Room B, the last room, holds four others.
  const jailed = place(opening, supplier, { jailed: true, location: 'Jail' });
  assert.deepEqual(closing(jailed, place(jailed, supplier, { jailed: false, location: 'Room A' })), ['INV-CAP-03']);
  assert.deepEqual(closing(jailed, place(jailed, supplier, { jailed: false, location: 'Room B' })), []);
  assert.deepEqual(closing(jailed, place(jailed, supplier, { jailed: false, location: 'Room A' }), null), [], 'a ruleset without the rule is not held to it');
  // A Captain inside Command Room who is Captain no more and Healthy when the phase has closed.
  const captain = place(opening, supplier, { captain: true, location: 'Command Room' });
  assert.deepEqual(closing(captain, place(captain, supplier, { captain: false, location: 'Room A' })), ['INV-CAP-03']);
  assert.deepEqual(closing(captain, place(captain, supplier, { captain: false, location: 'Room B' })), []);
  const filled = place(captain, seatOf('Alien'), { location: 'Room B' });
  assert.deepEqual(closing(filled, place(filled, supplier, { captain: false, location: 'Room A' })), [], 'the last room is full: the other room is right');
  // The Captain's own move out of Command Room is theirs to choose, and no phase closes with it.
  const ledger = startLedger(captain);
  ledger.roomCapacity = 5;
  const moved = checkTransition(base, captain, place(captain, supplier, { location: 'Room A' }), { kind: 'command', actor: supplier, command: { type: 'MOVE', destination: 'Room A' }, outcome: 'REGISTERED' }, ledger);
  assert.deepEqual(moved.filter(violation => violation.invariant.startsWith('INV-CAP-')), []);

  // INV-CAP-04: an Eliminated player keeps their place.
  const dead = place(opening, seatOf('Insider'), { health: 'Eliminated' });
  assert.deepEqual(closing(dead, place(dead, seatOf('Insider'), { location: 'Room A' })), ['INV-CAP-04']);
  assert.deepEqual(closing(dead, dead), []);
  // INV-CAP-05: nobody Healthy and free changes rooms when a phase closes.
  assert.deepEqual(closing(opening, place(opening, seatOf('Hacker'), { location: 'Room A' })), ['INV-CAP-05']);
  assert.deepEqual(closing(opening, place(opening, seatOf('Hacker'), { location: 'Room A' }), null), []);
  assert.deepEqual(closing(opening, place(opening, seatOf('Hacker'), { captain: true, location: 'Command Room' })), [], 'an elected Captain is placed in Command Room');
  // A move of the player's own from room to room is theirs, and no phase closes with it.
  const ownMove = startLedger(opening);
  ownMove.roomCapacity = 5;
  const hacker = seatOf('Hacker');
  assert.deepEqual(checkTransition(base, opening, place(opening, hacker, { location: 'Room A', movedThisRound: true }), { kind: 'command', actor: hacker, command: { type: 'MOVE', destination: 'Room A' }, outcome: 'REGISTERED' }, ownMove)
    .filter(violation => violation.invariant.startsWith('INV-CAP-')), []);
  // INV-CAP-06: a player who waits for Hospital stays where they are.
  let full = opening;
  for (const role of ['Blue Disabler', 'Insider', 'Undercover', 'Hacker']) full = place(full, seatOf(role), { health: 'Injured', location: 'Hospital' });
  full = place(full, seatOf('Cracker'), { health: 'Injured', location: 'Hospital' });
  const hurt = { health: 'Injured' };
  assert.deepEqual(closing(full, place(full, supplier, hurt)), [], 'hurt in Room B and waiting in Room B');
  assert.deepEqual(closing(full, place(full, supplier, { ...hurt, location: 'Room A' })), ['INV-CAP-06'], 'hurt in Room B and waiting in Room A');
  assert.deepEqual(closing(full, place(full, supplier, { ...hurt, location: 'Jail' })), ['INV-CAP-06'], 'a waiting player who was never a prisoner is put in Jail');
  const prisoner = place(full, supplier, { ...hurt, jailed: true, location: 'Jail' });
  assert.deepEqual(closing(prisoner, place(prisoner, supplier, { jailed: false })), [], 'a prisoner released while Injured stays in Jail');
  // A Captain hurt inside Command Room cannot stay there. They are seated like a returning player: their last room, here Room B.
  const hurtCaptain = place(full, supplier, { captain: true, location: 'Command Room' });
  assert.deepEqual(closing(hurtCaptain, place(hurtCaptain, supplier, { ...hurt, captain: false, location: 'Room B' })), []);
  assert.deepEqual(closing(hurtCaptain, place(hurtCaptain, supplier, { ...hurt, captain: false, location: 'Room A' })), ['INV-CAP-03']);
  // The same for one who is Eliminated there.
  assert.deepEqual(closing(captain, place(captain, supplier, { health: 'Eliminated', captain: false, location: 'Room B' })), []);
  assert.deepEqual(closing(captain, place(captain, supplier, { health: 'Eliminated', captain: false, location: 'Room A' })), ['INV-CAP-03']);
  // A patient put out of Hospital is a player moved who should have stayed.
  assert.deepEqual(closing(full, place(full, seatOf('Hacker'), { location: 'Room B' })), ['INV-CAP-06']);
});

test('the runner counts who is where and who waits, and records a player\'s place for a blocked case', () => {
  const scenario = (steps, status = 'ready', extra = {}) => ({
    id: 'V1-M7-CAP-99', group: 'mode-7', mode: 7, title: 'stand-in', status, kind: 'rules_correctness', areas: ['movement'], ruleRefs: ['R-CAP-01'], dependsOn: [], lineage: [],
    decisionIds: [], optionalPowers: false, setup: base, steps, note: '', ...extra,
  });
  const counts = [{ count: 'occupants:Room B', equals: 5 }, { count: 'occupants:Room A', equals: 2 }, { count: 'occupants:Hospital', equals: 0 }, { count: 'waiting', equals: 0 }, { match: 'waiting', equals: [] }];
  assert.equal(runScenario(scenario([{ op: 'assert', checks: counts }]), stubAdapter(), '').status, 'passed');
  const wrong = runScenario(scenario([{ op: 'assert', checks: [{ count: 'occupants:Room B', equals: 4 }] }]), stubAdapter(), '');
  assert.equal(wrong.status, 'failed');
  assert.match(wrong.failure.message, /count occupants:Room B: expected 4, observed 5/);
  assert.equal(runScenario(scenario([{ op: 'assert', checks: [{ count: 'occupants:Cellar', equals: 0 }] }]), stubAdapter(), '').status, 'failed', 'a place that does not exist is not counted as empty');
  const probes = runScenario(scenario([{ op: 'note', label: 'where', truth: '@Alien', field: 'location' }, { op: 'note', label: 'who waits', match: 'waiting' }], 'blocked', { decisionIds: ['CAP-D2'] }), stubAdapter(), '').probes;
  assert.deepEqual(probes, [{ label: 'where', outcome: 'Room A' }, { label: 'who waits', outcome: 'nobody' }]);
  // A run under the rule fails a case on the invariant even when its own checks hold.
  const overfull = { ...stubAdapter({ outcomes: ['REGISTERED'], mutate: observation => place(observation, seatOf('Alien'), { location: 'Room B' }) }), roomCapacity: 5 };
  const moved = runScenario(scenario([{ op: 'command', actor: '@Alien', command: { type: 'MOVE', destination: 'Room B' }, expect: 'REGISTERED' }]), overfull, '');
  assert.equal(moved.status, 'failed');
  assert.ok(moved.invariantViolations.some(violation => violation.invariant === 'INV-CAP-01'));
  // REFUSED is any refusal by the rules or the request's shape; a closed window is not one.
  const refused = code => runScenario(scenario([{ op: 'command', actor: '@Alien', command: { type: 'MOVE', destination: 'Room B' }, expect: 'REFUSED' }]), stubAdapter({ outcomes: [code] }), '').status;
  assert.deepEqual(['NOT_ALLOWED', 'INVALID', 'ROOM_FULL', 'PHASE_CLOSED', 'REGISTERED'].map(refused), ['passed', 'passed', 'passed', 'failed', 'failed']);
});

test('a report lists a violation once for a run, with how many times it was found', () => {
  const run = violations => ({ scenarioId: 'V1-M7-CAP-99', group: 'mode-7', mode: 7, status: 'failed', decisionIds: [], seed: 'cap-b5', reason: null,
    failure: { stepIndex: -1, op: 'invariant', message: 'stand-in' }, invariantViolations: violations, probes: [], transitions: 3, commands: 0, finalDigest: 'x' });
  const again = { invariant: 'INV-CAP-02', message: 'seat-3 is offered a move to Room B, which is full' };
  const once = { invariant: 'INV-CAP-01', message: 'Room B holds 6 players, more than 5' };
  const report = buildReport([run([again, once, { ...again }, { ...again }]), run([])], { engine: null });
  assert.deepEqual(report.runs[0].invariantViolations, [{ ...again, times: 3 }, once]);
  assert.deepEqual(report.runs[1].invariantViolations, []);
  assert.equal(report.totals.failed, 2);
});

test('a playout reports how full the places got, and a plain playout is the one it always was', () => {
  const plain = walk(stubAdapter(), 7, 'walk-1');
  assert.equal(plain.occupancy.phasesOpened, 1);
  assert.deepEqual(Object.keys(plain.occupancy.most).sort(), ['Command Room', 'Hospital', 'Jail', 'Room A', 'Room B']);
  const capped = walk(stubAdapter(), 9, 'walk-3', { activity: 0.6, noise: 0.25, coordination: 0.5, maxPhases: 400, rooms: 'capped', pressFullRooms: 1 });
  assert.ok(roomsWithinCapacity(capped.setup.initialRooms));
  assert.equal(Math.max(capped.occupancy.most['Room A'], capped.occupancy.most['Room B']), 5, 'nine players start five and four');
  assert.ok(capped.occupancy.movesTowardsAFullRoom > 0, 'with nine players a room is full, and the policy pressed on it');
  assert.equal(capped.occupancy.movesIntoAFullRoom, 0, 'the stand-in refuses everything');
});

// ---------------------------------------------------------------------------------------------
// The engine binding asks an engine for one of the rulesets it plays.
const work = mkdtempSync(join(tmpdir(), 'mothership-balance-capacity-'));
test.after(() => { rmSync(work, { recursive: true, force: true }); });
const standIn = (name, source) => {
  const directory = join(work, name);
  mkdirSync(join(directory, 'packages/engine/dist'), { recursive: true });
  writeFileSync(join(directory, 'packages/engine/package.json'), '{ "type": "module" }\n');
  writeFileSync(join(directory, 'packages/engine/dist/index.js'), source);
  return directory;
};
const API = ['executeFullGame', 'advanceFullGame', 'abortFullGame', 'projectFullGame', 'projectOwnAcknowledgments'].map(name => `export function ${name}() { throw new Error('unreachable'); }`).join('\n');
const twoRulesets = recorded => standIn(`two-${recorded}`, [
  "export const FULL_ENGINE_VERSION = 'stand-in-2';", "export const FULL_RULESET_VERSION = 'new-rules';", "export const FULL_RULESET_HASH = 'hash-new';",
  "export const FULL_GAME_VERSION_PINS = Object.freeze({ protocolVersion: 2, engineVersion: 'stand-in-2', rulesetVersion: 'new-rules', rulesetHash: 'hash-new' });",
  "export const EARLIER_PINS = Object.freeze({ protocolVersion: 2, engineVersion: 'stand-in-1', rulesetVersion: 'old-rules', rulesetHash: 'hash-old' });",
  // It records what it was asked for, or always its own default.
  `export function createFullGame({ versions }) { const made = ${recorded === 'asked' ? 'versions ?? { ...FULL_GAME_VERSION_PINS }' : '{ ...FULL_GAME_VERSION_PINS }'}; globalThis.standInAskedFor = versions ?? null; return { versions: made, phase: { id: 'phase-start' } }; }`,
  API, '',
].join('\n'));

test('the engine binding creates matches under the ruleset it is asked for, names both builds, and runs nothing under another', async () => {
  const engine = twoRulesets('asked');
  const plain = await load(engine);
  assert.equal(plain.available, true);
  assert.deepEqual(plain.adapter.pins, { adapter: 'full-game-v1', engineVersion: 'stand-in-2', rulesetVersion: 'new-rules', rulesetHash: 'hash-new', protocolVersion: 2 });
  assert.equal('roomCapacity' in plain.adapter, false);
  plain.adapter.createMatch(base, 'match-1');
  assert.equal(globalThis.standInAskedFor, null, 'without a ruleset the engine is asked for nothing, as before');

  const earlier = await load(engine, { ruleset: 'old-rules', roomCapacity: 5 });
  assert.deepEqual(earlier.adapter.pins, {
    adapter: 'full-game-v1', engineVersion: 'stand-in-1', rulesetVersion: 'old-rules', rulesetHash: 'hash-old', protocolVersion: 2,
    binaryEngineVersion: 'stand-in-2', binaryRulesetVersion: 'new-rules', binaryRulesetHash: 'hash-new',
  });
  assert.equal(earlier.adapter.roomCapacity, 5);
  earlier.adapter.createMatch(base, 'match-2');
  assert.deepEqual(globalThis.standInAskedFor, { protocolVersion: 2, engineVersion: 'stand-in-1', rulesetVersion: 'old-rules', rulesetHash: 'hash-old', assetManifestVersion: 'balance-fixture-no-assets' });

  const unknown = await load(engine, { ruleset: 'no-such-rules' });
  assert.equal(unknown.available, false);
  assert.match(unknown.reason, /does not name ruleset no-such-rules among the tuples it plays \(new-rules, old-rules\)/);

  // An engine that takes the request and plays its own default is found out at the first match.
  const deaf = await load(twoRulesets('default'), { ruleset: 'old-rules' });
  assert.throws(() => deaf.adapter.createMatch(base, 'match-3'), /created a match under new-rules, not under old-rules/);
});

const script = (name, ...args) => spawnSync(process.execPath, [join(root, 'tools/balance/scripts', name), ...args], { cwd: root, encoding: 'utf8' });

test('the scenario command runs the capacity suite under its own ruleset, and executes nothing where the engine does not name it', () => {
  const engine = twoRulesets('asked');
  const out = join(work, 'capacity-report.json');
  const run = script('run-scenarios.mjs', '--suite', 'capacity', '--engine-root', engine, '--require-engine', '--out', out);
  assert.equal(run.status, 2, run.stdout + run.stderr);
  assert.match(run.stdout, new RegExp(`does not name ruleset ${CAPACITY_RULESET_VERSION} among the tuples it plays`));
  const report = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(report.totals.passed + report.totals.failed, 0);
  assert.equal(report.totals.total, loadAll().length);
  assert.equal(report.pins.suite, 'capacity');
  assert.equal(report.pins.rulesetAskedFor, CAPACITY_RULESET_VERSION);
  assert.equal(report.pins.roomCapacity, 5);
  assert.deepEqual(Object.keys(report.pins.capacityFileHashes).sort(), ['mode-7.scenarios.json', 'mode-8.scenarios.json', 'mode-9.scenarios.json']);
  assert.equal(script('run-scenarios.mjs', '--suite', 'elsewhere').status, 2);
  // A plain Version 1 run records no suite and no asked-for ruleset: its report is the report it always was.
  const plainOut = join(work, 'plain-report.json');
  script('run-scenarios.mjs', '--engine-root', join(work, 'absent'), '--out', plainOut);
  const plain = JSON.parse(readFileSync(plainOut, 'utf8'));
  for (const key of ['suite', 'rulesetAskedFor', 'roomCapacity', 'capacityFileHashes']) assert.equal(key in plain.pins, false, key);
});

test('the playout command refuses a way of drawing rooms or a capacity it does not know, and a plain run records neither', () => {
  assert.equal(script('walk.mjs', '--rooms', 'anywhere', '--seeds', '1').status, 2);
  assert.equal(script('walk.mjs', '--room-capacity', 'five', '--seeds', '1').status, 2);
  const out = join(work, 'walk.json');
  script('walk.mjs', '--engine-root', join(work, 'absent'), '--seeds', '1', '--out', out);
  const plain = JSON.parse(readFileSync(out, 'utf8'));
  for (const key of ['rulesetAskedFor', 'rooms', 'roomCapacity', 'pressFullRooms']) assert.equal(key in plain.pins, false, key);
  script('walk.mjs', '--engine-root', join(work, 'absent'), '--seeds', '1', '--rooms', 'capped', '--room-capacity', '5', '--ruleset', CAPACITY_RULESET_VERSION, '--out', out);
  const capped = JSON.parse(readFileSync(out, 'utf8'));
  assert.deepEqual([capped.pins.rulesetAskedFor, capped.pins.rooms, capped.pins.roomCapacity, capped.pins.pressFullRooms], [CAPACITY_RULESET_VERSION, 'capped', 5, 0.25]);
});

// ---------------------------------------------------------------------------------------------
// The evidence of 11 October 2026. The reports are held to the fixtures and to each other, and
// the two documents to the reports.
const evidence = loadEvidence();
const fileHash = url => createHash('sha256').update(readFileSync(url)).digest('hex');
const readyIds = () => loadAll().filter(scenario => scenario.status === 'ready').map(scenario => scenario.id);

// The ready fixtures that are expected to fail against the implementation, by identifier.
const expectedToFail = () => loadAll().filter(scenario => scenario.status === 'ready' && caseOf(scenario.id) in EXPECTED_FAILURES).map(scenario => scenario.id);

test('the capacity fixtures against the implementation: every ready case passed but the defect and the rules decided after it was written', () => {
  const report = evidence.scenarios;
  assert.equal(report.schema, 'mothership.balance.scenario-run/1');
  assert.equal(report.pins.engineCommit, IMPLEMENTATION);
  assert.equal(report.pins.engineTreeClean, true);
  assert.match(report.pins.workingTreeCommit, /^[0-9a-f]{40}$/, 'the fixtures were run from a clean commit');
  assert.equal(report.pins.suite, 'capacity');
  assert.equal(report.pins.rulesetAskedFor, CAPACITY_RULESET_VERSION);
  assert.equal(report.pins.engine.rulesetVersion, CAPACITY_RULESET_VERSION);
  assert.equal(report.pins.engine.binaryRulesetVersion, CAPACITY_RULESET_VERSION);
  assert.equal(report.pins.roomCapacity, ROOM_CAPACITY);
  assert.deepEqual(report.pins.ownerDecision, CAPACITY_DECISION);
  // The fixtures of the report are the committed ones, all of them, once each.
  for (const group of GROUPS) assert.equal(report.pins.capacityFileHashes[`mode-${group}.scenarios.json`], fileHash(capacityFileUrl(group)), `mode ${group}`);
  const fixtures = loadAll();
  assert.deepEqual(report.runs.map(run => run.scenarioId), fixtures.map(scenario => scenario.id));
  const wanted = { ready: 'passed', blocked: 'blocked', manual: 'not-run' };
  const failed = [];
  for (const run of report.runs) {
    const fixture = fixtures.find(scenario => scenario.id === run.scenarioId);
    const expected = EXPECTED_FAILURES[caseOf(run.scenarioId)];
    if (fixture.status === 'ready' && expected !== undefined) {
      // A returning player is in the wrong room, and the run breaks the invariant on returns and no other.
      failed.push(run.scenarioId);
      assert.equal(run.status, 'failed', run.scenarioId);
      assert.equal(run.failure.op, 'assert', run.scenarioId);
      assert.match(run.failure.message, expected.message, run.scenarioId);
      assert.deepEqual([...new Set(run.invariantViolations.map(violation => violation.invariant))], ['INV-CAP-03'], run.scenarioId);
      continue;
    }
    assert.equal(run.status, wanted[fixture.status], run.scenarioId);
    assert.equal(run.failure, null, run.scenarioId);
    assert.deepEqual(run.invariantViolations, [], run.scenarioId);
    if (fixture.status === 'ready') assert.ok(run.transitions + run.commands > 0 || fixture.steps.some(step => step.op === 'createRejected' || step.op === 'assert'), `${run.scenarioId} was executed`);
    if (fixture.status === 'blocked') assert.deepEqual(run.probes.map(probe => probe.label), fixture.steps.filter(step => step.op === 'note' || step.op === 'probe').map(step => step.label), run.scenarioId);
  }
  // Each of the four shows with every number of players, and nothing else fails.
  assert.deepEqual(failed, GROUPS.flatMap(group => Object.keys(EXPECTED_FAILURES).map(id => `V1-M${group}-${id}`)).sort());
  assert.deepEqual(failed, expectedToFail());
  assert.equal(report.totals.failed, failed.length);
  assert.equal(report.totals.passed, readyIds().length - failed.length);
  // One of the four is a defect against the cases the implementation was written for; the rest were decided after it.
  assert.deepEqual(Object.entries(EXPECTED_FAILURES).filter(([, item]) => item.kind === 'defect').map(([id]) => id), ['CAP-28']);
});

test('the negative controls on the capacity fixtures: every control on a passing case was detected', () => {
  const report = evidence.controls;
  assert.equal(report.schema, 'mothership.balance.controls/1');
  assert.equal(report.pins.engineCommit, IMPLEMENTATION);
  assert.equal(report.pins.engineTreeClean, true);
  assert.deepEqual([report.pins.suite, report.pins.rulesetAskedFor, report.pins.roomCapacity], ['capacity', CAPACITY_RULESET_VERSION, ROOM_CAPACITY]);
  assert.equal(report.pins.workingTreeCommit, evidence.scenarios.pins.workingTreeCommit);
  assert.equal(report.pins.engineBuildSha256, evidence.scenarios.pins.engineBuildSha256);
  for (const mode of GROUPS) {
    const stats = report.modes[mode];
    assert.equal(stats.scenarios, loadGroup(mode).scenarios.filter(scenario => scenario.status === 'ready').length);
    assert.ok(stats.controls > 0);
    assert.deepEqual([stats.detected, stats.undetected], [stats.controls, 0], `mode ${mode}`);
    assert.equal(stats.baselineNotPassing, Object.keys(EXPECTED_FAILURES).length, 'the cases that fail have no controls');
  }
  assert.deepEqual(report.undetected, []);
  assert.deepEqual(report.baselineFailures.map(item => item.split(':')[0]).sort(), expectedToFail());
  // The command ends as failed while a ready case does not pass. That is those cases, not a control missed.
  assert.equal(report.verdict, 'failed');
});

test('the control: against the engine before the rule every ready capacity case fails, but the few that hold without the rule', () => {
  const report = evidence.control;
  assert.equal(report.pins.engineCommit, BEFORE_THE_RULE);
  assert.equal(report.pins.engineTreeClean, true);
  assert.equal(report.pins.suite, 'capacity');
  assert.equal(report.pins.rulesetAskedFor, PASS_RULESET);
  assert.equal(report.pins.engine.rulesetVersion, PASS_RULESET);
  assert.deepEqual(report.pins.capacityFileHashes, evidence.scenarios.pins.capacityFileHashes, 'the same fixtures as the run against the implementation');
  assert.equal(report.pins.workingTreeCommit, evidence.scenarios.pins.workingTreeCommit);
  assert.deepEqual(report.runs.filter(run => run.status === 'passed').map(run => run.scenarioId), HOLDS_WITHOUT_THE_RULE);
  assert.deepEqual(report.runs.filter(run => run.status === 'failed').map(run => run.scenarioId), readyIds().filter(id => !HOLDS_WITHOUT_THE_RULE.includes(id)));
  // Those two start with no room of five and never make one, so the engine without the rule is offered no chance to break it.
  for (const id of HOLDS_WITHOUT_THE_RULE) {
    const fixture = loadAll().find(scenario => scenario.id === id);
    const rooms = Object.values(fixture.setup.initialRooms);
    assert.ok(Math.max(rooms.filter(room => room === 'Room A').length, rooms.filter(room => room === 'Room B').length) < ROOM_CAPACITY, id);
  }
  // Some fail on what they assert, and the rest only because the engine offers a full room from the first moment.
  const onlyByInvariant = report.runs.filter(run => run.status === 'failed' && run.failure.op === 'invariant');
  assert.ok(onlyByInvariant.length > 0 && onlyByInvariant.length < readyIds().length);
  for (const run of onlyByInvariant) assert.ok(run.invariantViolations.some(violation => violation.invariant.startsWith('INV-CAP-')), run.scenarioId);
  // The case of the defect is among those: on the engine before the rule its own checks hold.
  for (const group of GROUPS) assert.ok(onlyByInvariant.some(run => run.scenarioId === `V1-M${group}-CAP-28`), `CAP-28, ${group} players`);
});

test('the playouts under the capacity ruleset: all finished, nothing over five anywhere, no full room entered or offered, and only the invariant on returns broken', () => {
  const report = evidence.playouts;
  assert.equal(report.pins.engineCommit, IMPLEMENTATION);
  assert.equal(report.pins.engineTreeClean, true);
  assert.equal(report.pins.workingTreeCommit, evidence.scenarios.pins.workingTreeCommit);
  assert.equal(report.pins.engineBuildSha256, evidence.scenarios.pins.engineBuildSha256, 'the same build as the scenario run');
  assert.deepEqual([report.pins.rulesetAskedFor, report.pins.rooms, report.pins.roomCapacity], [CAPACITY_RULESET_VERSION, 'capped', ROOM_CAPACITY]);
  assert.ok(report.pins.pressFullRooms > 0);
  assert.equal(report.engine.rulesetVersion, CAPACITY_RULESET_VERSION);
  assert.equal(report.seedsPerMode, 200);
  for (const mode of GROUPS) {
    const stats = report.modes[mode];
    assert.equal(stats.playouts, report.seedsPerMode);
    assert.equal(stats.completed, stats.playouts);
    assert.equal(stats.hintMismatches + stats.replayMismatches, 0, `mode ${mode}`);
    // The implementation predates the owner's decisions on returns. Where random play reaches such
    // a return, the invariant that holds those decisions is broken, and no other invariant is.
    for (const invariant of Object.keys(stats.violationsByInvariant)) assert.equal(invariant, 'INV-CAP-03', `mode ${mode}`);
    assert.equal(stats.invariantViolations, Object.values(stats.violationsByInvariant).reduce((sum, times) => sum + times, 0));
    assert.equal(stats.invariantViolations, stats.occupancy.returnsToTheOtherRoomThoughTheLastHadAPlace, 'each is a return to another room than the last, which had a place');
    assert.equal(stats.occupancy.phasesOverCapacity + stats.occupancy.playoutsOverCapacity, 0);
    assert.ok(stats.occupancy.movesTowardsAFullRoom > 0, 'full rooms were tried');
    assert.equal(stats.occupancy.movesIntoAFullRoom, 0);
    for (const place of ['Room A', 'Room B', 'Hospital', 'Jail']) assert.ok(stats.occupancy.most[place] <= ROOM_CAPACITY, `${mode}: ${place}`);
    assert.ok(stats.occupancy.most['Command Room'] <= 1);
    assert.match(stats.endStatesSha256, /^[0-9a-f]{64}$/);
  }
  assert.equal(report.modes['9'].occupancy.startsWithAFullRoom, report.modes['9'].playouts, 'nine players always start five and four');
});

test('the earlier rulesets play on the implementation as on the engine before it, and the Version 1 catalogue cannot start under the new one', () => {
  const summary = evidence.compatibility;
  assert.equal(summary.schema, 'mothership.balance.capacity-compat/1');
  assert.deepEqual([summary.before, summary.after, summary.verdict], [BEFORE_THE_RULE, IMPLEMENTATION, 'the-same']);
  assert.deepEqual(Object.keys(summary.rulesets), EARLIER_RULESETS);
  const versionOne = loadVersionOne();
  for (const ruleset of EARLIER_RULESETS) {
    const item = summary.rulesets[ruleset];
    assert.deepEqual([item.sameResults, item.sameEndStates, item.clean], [true, true, true], ruleset);
    assert.equal(item.before.scenarios.resultsSha256, item.after.scenarios.resultsSha256);
    for (const side of [item.before, item.after]) {
      assert.equal(side.scenarios.engine.rulesetVersion, ruleset);
      assert.equal(side.scenarios.totals.total, versionOne.length);
      assert.equal(side.scenarios.totals.failed, 0);
      assert.equal(side.scenarios.totals.passed, versionOne.filter(scenario => scenario.status === 'ready').length);
      // The catalogue that was run is the committed one.
      for (const [name, digest] of Object.entries(side.scenarios.scenarioFileHashes)) assert.equal(digest, fileHash(new URL(`./v1/${name}`, import.meta.url)), name);
      for (const stats of Object.values(side.playouts.modes)) assert.deepEqual([stats.playouts, stats.completed, stats.invariantViolations + stats.hintMismatches + stats.replayMismatches], [200, 200, 0]);
    }
    // On the implementation the earlier ruleset is played by the later build, and the report says so.
    assert.equal(item.after.scenarios.engine.binaryRulesetVersion, CAPACITY_RULESET_VERSION);
    assert.notEqual(item.before.scenarios.engineBuildSha256, item.after.scenarios.engineBuildSha256, 'two different builds were compared');
    assert.equal(item.after.scenarios.engineBuildSha256, evidence.scenarios.pins.engineBuildSha256, 'the build that passed the capacity fixtures');
  }
  // Under the new default the engine refuses every start with more than five players in a room, and nothing else fails.
  const underDefault = summary.catalogueUnderTheDefaultOfTheLaterBuild;
  const overCapacity = versionOne.filter(scenario => scenario.mode !== null && scenario.setup !== null && scenario.status === 'ready' && !roomsWithinCapacity(scenario.setup.initialRooms)).length;
  assert.equal(underDefault.engine.rulesetVersion, CAPACITY_RULESET_VERSION);
  assert.deepEqual([underDefault.totals.failed, underDefault.refusedAtCreation], [overCapacity, overCapacity]);
  assert.equal(underDefault.totals.passed, versionOne.filter(scenario => scenario.status === 'ready').length - overCapacity);
});

test('the audit and the evidence report print the tables of the reports, and name the commits that were run', () => {
  const report = text(EVIDENCE_REPORT);
  assert.ok(audit.includes(resultsTable(evidence)), 'the results table of the audit differs from the reports');
  for (const [name, table] of [['results', resultsTable(evidence)], ['modes', modeTable(evidence)], ['failures', failureTable(evidence)], ['controls', controlsTable(evidence)], ['probes', probeTable(evidence)],
    ['playouts', playoutTable(evidence)], ['compatibility', compatibilityTable(evidence)]]) {
    assert.ok(report.includes(table), `the ${name} table of ${EVIDENCE_REPORT} differs from the reports`);
  }
  for (const body of [audit, report]) {
    for (const commit of [IMPLEMENTATION, BEFORE_THE_RULE]) assert.ok(body.includes(commit), commit);
    assert.ok(body.includes(evidence.scenarios.pins.engine.rulesetHash));
  }
  assert.ok(report.includes(evidence.scenarios.pins.workingTreeCommit), 'the report names the commit the fixtures were run from');
  for (const digest of Object.values(evidence.scenarios.pins.capacityFileHashes)) assert.ok(report.includes(digest), 'the report lists the hashes of the fixture files');
  // What the implementation does in the blocked cases is what the audit says it does.
  const probes = Object.fromEntries(evidence.scenarios.runs.filter(run => run.status === 'blocked').map(run => [run.scenarioId, run.probes[0].outcome]));
  // CAP-D6: the implementation seats the Captain who was Eliminated inside Command Room first, in Room B, and the healed player goes to Room A.
  for (const mode of GROUPS) {
    const run = evidence.scenarios.runs.find(item => item.scenarioId === `V1-M${mode}-CAP-44`);
    assert.deepEqual(run.probes.map(probe => probe.outcome), ['Room B', 'Room A']);
  }
  assert.deepEqual(Object.keys(probes).sort(), GROUPS.map(mode => `V1-M${mode}-CAP-44`));
});
