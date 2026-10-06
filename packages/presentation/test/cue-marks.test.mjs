import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPlayerShellModel, buildTableShellModel, CUE_AT, cueMark, cuesAlreadyIn, planCues, renderPlayerShell, renderTableShell,
} from '@mothership/presentation';
import { fixture, openInput, playerInput, tableInput } from './support/inputs.mjs';
import { byClass, byRegion, find, findAll } from './support/markup-audit.mjs';

const { before, afterRegistration } = fixture();
const table = view => renderTableShell(buildTableShellModel(tableInput(view)));
const closedPhone = view => renderPlayerShell(buildPlayerShellModel(playerInput(view)));
const openPhone = (view, shot) => renderPlayerShell(buildPlayerShellModel(openInput(view, shot)));

const at = name => element => element.attrs['data-cue-at'] === name;
const names = root => findAll(root, element => element.attrs['data-cue-at'] !== undefined).map(element => element.attrs['data-cue-at']);
const SEATS = before.public.seats.map(seat => seat.seatId);
const NAME = /^(phase|registration|seat-[1-9]\/(place|health))$/;

test('each kind of cue has one fixed place name, and an unknown kind or seat has none', () => {
  assert.deepEqual(cueMark({ kind: 'phase-change' }), { at: 'phase', name: 'phase-change' });
  assert.deepEqual(cueMark({ kind: 'round-transition', round: 3 }), { at: 'phase', name: 'round-transition' });
  assert.deepEqual(cueMark({ kind: 'public-move', seatId: 'seat-8', from: 'Room B', to: 'Room A' }), { at: 'seat-8/place', name: 'public-move' });
  assert.deepEqual(cueMark({ kind: 'status-change', seatId: 'seat-9', health: 'Injured' }), { at: 'seat-9/health', name: 'status-change' });
  assert.deepEqual(cueMark({ kind: 'registration' }), { at: 'registration', name: 'registration' });
  // Nothing is guessed, and nothing that is not a seat identifier becomes part of a name.
  assert.equal(cueMark({ kind: 'impact', seatId: 'seat-2' }), null);
  assert.equal(cueMark({ kind: 'public-move', seatId: 'seat-10', from: 'Room A', to: 'Room B' }), null);
  assert.equal(cueMark({ kind: 'status-change', seatId: '"] *, [x="', health: 'Injured' }), null);
  assert.equal(cueMark({ kind: 'public-move', seatId: 'constructor', from: 'Room A', to: 'Room B' }), null);
  assert.deepEqual([CUE_AT.place('seat-3'), CUE_AT.health('seat-3')], ['seat-3/place', 'seat-3/health']);
});

test('the table marks the phase labels once, and every seat’s place and health in the board and in the roster', () => {
  const root = table(before.public);
  for (const name of names(root)) assert.match(name, NAME);
  const phase = findAll(root, at('phase'));
  assert.equal(phase.length, 1);
  assert.equal(phase[0].attrs['data-region'], 'phase', 'The labels, not the countdown beside them');
  assert.equal(findAll(find(root, byRegion('timer')), element => element.attrs['data-cue-at'] !== undefined).length, 0);
  for (const seatId of SEATS) {
    const places = findAll(root, at(`${seatId}/place`));
    assert.deepEqual(places.map(element => element.tag).sort(), ['li', 'td'], seatId);
    assert.equal(places.find(element => element.tag === 'li').attrs['data-seat'], seatId);
    const health = findAll(root, at(`${seatId}/health`));
    assert.deepEqual(health.map(element => element.tag).sort(), ['span', 'td'], seatId);
  }
  assert.equal(findAll(root, at('registration')).length, 0, 'The table has no place for a registration');
});

test('a phone marks the same public places, wherever a seat is listed', () => {
  const root = closedPhone(before.officer);
  for (const name of names(root)) assert.match(name, NAME);
  assert.equal(findAll(root, at('phase')).length, 1);
  const own = before.officer.seats.find(seat => seat.seatId === 'seat-1').location;
  for (const seat of before.officer.seats) {
    // Once in the list of all players; once more under "Also here" for those sharing the room.
    const listedTwice = seat.location === own && seat.seatId !== 'seat-1';
    assert.equal(findAll(root, at(`${seat.seatId}/place`)).length, listedTwice ? 2 : 1, seat.seatId);
    // The viewer's own health is also in its status line, which is not a token list.
    assert.equal(findAll(root, at(`${seat.seatId}/health`)).length, seat.location === own ? 2 : 1, seat.seatId);
  }
});

test('the place for a registration exists only inside an open private panel, and is the card’s status line', () => {
  assert.equal(findAll(closedPhone(before.officer), at('registration')).length, 0);
  assert.equal(findAll(closedPhone(afterRegistration.officer), at('registration')).length, 0);
  for (const view of [before.officer, afterRegistration.officer, before.target]) {
    const root = openPhone(view);
    const places = findAll(root, at('registration'));
    assert.equal(places.length, 1);
    assert.match(String(places[0].attrs.class), /\bms-card__status\b/);
    const panel = find(root, byRegion('private'));
    assert.equal(findAll(panel, at('registration')).length, 1, 'Inside the private region');
    // Nothing else in the private panel is a place for a cue: no public cue lands there.
    assert.deepEqual(names(find(panel, byClass('ms-private__panel'))), ['registration']);
  }
});

test('place names are the same for every seat’s phone and say nothing about a role or about what happened', () => {
  const publicNames = root => names(root).filter(name => name !== 'registration').sort();
  // Seats 1 and 2 share a room in the fixture, so their phones list the same places.
  assert.deepEqual(new Set(publicNames(closedPhone(before.officer))), new Set(publicNames(closedPhone(before.target))));
  assert.deepEqual(names(openPhone(before.officer)).sort(), names(openPhone(afterRegistration.officer)).sort(), 'A registration adds or removes no place');
  assert.deepEqual(names(table(before.public)), names(table(afterRegistration.public)));
});

const numbered = (seq, cue) => ({ seq, cue });
const PHASE = { kind: 'phase-change' };
const MOVE = { kind: 'public-move', seatId: 'seat-8', from: 'Room B', to: 'Room A' };
const STAMP = { kind: 'registration' };

const NONE = { public: 0, private: 0 };

test('a renderer plays each numbered cue once: only numbers above the last one it showed from that list, in order', () => {
  assert.deepEqual(planCues(NONE, [], []), { marks: [], shown: NONE });
  const first = planCues(NONE, [numbered(1, PHASE), numbered(2, MOVE)], []);
  assert.deepEqual(first, { marks: [{ at: 'phase', name: 'phase-change' }, { at: 'seat-8/place', name: 'public-move' }], shown: { public: 2, private: 0 } });
  // The same frame again, as after a countdown tick: nothing.
  assert.deepEqual(planCues(first.shown, [numbered(1, PHASE), numbered(2, MOVE)], []), { marks: [], shown: first.shown });
  // A list that grew while the frame was up: only what was added.
  const grown = planCues({ public: 1, private: 0 }, [numbered(1, PHASE), numbered(2, MOVE)], []);
  assert.deepEqual(grown.marks.map(mark => mark.name), ['public-move']);
});

test('the two lists are numbered apart: a private cue is played whatever the public numbers are, and the other way round', () => {
  // A private cue numbered 1 while the public list is already at 2. One mark for both lists would skip it.
  const stamp = planCues({ public: 2, private: 0 }, [numbered(1, PHASE), numbered(2, MOVE)], [numbered(1, STAMP)]);
  assert.deepEqual(stamp, { marks: [{ at: 'registration', name: 'registration' }], shown: { public: 2, private: 1 } });
  // And a public cue numbered 1 after two private ones.
  const move = planCues({ public: 0, private: 2 }, [numbered(1, MOVE)], [numbered(2, STAMP)]);
  assert.deepEqual(move, { marks: [{ at: 'seat-8/place', name: 'public-move' }], shown: { public: 1, private: 2 } });
  // Both new in one frame: each list in its own order, the public one first.
  assert.deepEqual(planCues(NONE, [numbered(1, PHASE), numbered(2, MOVE)], [numbered(1, STAMP)]).marks.map(mark => mark.name), ['phase-change', 'public-move', 'registration']);
});

test('a cue that has left the frame is not played again when it is gone, and its number is not reused', () => {
  const first = planCues(NONE, [numbered(1, PHASE)], []);
  // Its time was up: the list is empty. Nothing to play, and the mark stays where it was.
  assert.deepEqual(planCues(first.shown, [], []), { marks: [], shown: first.shown });
  // The next cue of that list has a higher number and is played.
  assert.deepEqual(planCues(first.shown, [numbered(2, MOVE)], []).marks.map(mark => mark.name), ['public-move']);
});

test('a renderer that starts on a frame which already carries cues plays none of them', () => {
  const lists = [[numbered(7, PHASE)], [numbered(3, STAMP)]];
  const startedAt = cuesAlreadyIn(...lists);
  assert.deepEqual(startedAt, { public: 7, private: 3 });
  assert.deepEqual(planCues(startedAt, ...lists), { marks: [], shown: startedAt });
  assert.deepEqual(cuesAlreadyIn([], []), NONE);
});

test('a cue this build cannot place is skipped, and its number is still counted as shown', () => {
  const plan = planCues(NONE, [numbered(1, { kind: 'something-new' }), numbered(2, PHASE)], []);
  assert.deepEqual(plan, { marks: [{ at: 'phase', name: 'phase-change' }], shown: { public: 2, private: 0 } });
  assert.deepEqual(planCues(plan.shown, [numbered(1, { kind: 'something-new' }), numbered(2, PHASE)], []).marks, []);
});
