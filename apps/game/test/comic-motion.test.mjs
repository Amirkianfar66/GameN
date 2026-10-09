import test from 'node:test';
import assert from 'node:assert/strict';
import { movedPublicSeats } from '../hosted/comic-motion.mjs';
import { ART_BUNDLES, bundlesFor } from '../hosted/art.mjs';
test('first/reconnected snapshots never cue a move; unchanged public facts stay unchanged across private redraws',()=>{
  const publicFacts=new Map([['seat-1','room-a'],['seat-2','room-b']]);
  assert.deepEqual(movedPublicSeats(null,publicFacts),[]);
  for(let i=0;i<26;i++) assert.deepEqual(movedPublicSeats(publicFacts,new Map(publicFacts)),[]);
  assert.deepEqual(movedPublicSeats(publicFacts,new Map([['seat-1','room-b'],['seat-2','room-b']])),['seat-1']);
});
test('more than four moved public seats skip the treatment as a batch',()=>{
  const a=new Map(Array.from({length:9},(_,i)=>[`seat-${i+1}`,'room-a']));
  assert.deepEqual(movedPublicSeats(a,new Map([...a].map(([seat])=>[seat,'hospital']))),[]);
});
test('all phones preload identical complete art bundles; a table requests only public artwork',()=>{
  assert.deepEqual(bundlesFor('player'),['public-board','player-ui','roles']);
  assert.deepEqual(bundlesFor('display'),['public-board']);
  assert.deepEqual(Object.keys(ART_BUNDLES).sort(),['player-ui','public-board','roles']);
});

// ---------- the board's public cues (issue #87) ----------
import { publicChanges, publicFacts } from '../hosted/comic-motion.mjs';
import { stripChanges } from '../hosted/strip-cues.mjs';

const seatFacts = (room, extra = {}) => ({ seatId: 'seat-1', health: 'Healthy', jailed: false, captain: false, isActive: false, markers: [], ...extra });
const drawn = (zones, { round = 'Round 2', phase = 'Your turn', screen = 'match', connection = 'live' } = {}) => ({
  screen, connection, match: { phase: { roundLabel: round, phaseLabel: phase }, roster: { zones: Object.entries(zones).map(([id, seats]) => ({ id, seats })) } },
});

test('public facts are read from the drawn public board only: places, health, Jail, Captain, a revealed faction and the turn', () => {
  const facts = publicFacts(drawn({ 'room-a': [seatFacts('room-a', { isActive: true, markers: [{ kind: 'faction', variant: 'red' }], role: 'Hacker' })] }));
  assert.deepEqual([...facts.seats], [['seat-1', { room: 'room-a', status: 'Healthy/false/false/red', active: true }]]);
  assert.deepEqual([facts.round, facts.phase], ['Round 2', 'Your turn']);
  assert.equal(JSON.stringify(facts).includes('Hacker'), false, 'a role never reaches a cue');
  assert.equal(publicFacts(drawn({}, { connection: 'stale' })), null);
  assert.equal(publicFacts(drawn({}, { screen: 'connecting' })), null);
});

test('cues start only from a difference between two drawn public states', () => {
  const seat = (id, extra = {}) => ({ ...seatFacts(), seatId: id, ...extra });
  const before = publicFacts(drawn({ 'room-a': [seat('seat-1', { isActive: true }), seat('seat-2')], 'room-b': [seat('seat-3')] }));
  assert.deepEqual(publicChanges(null, before), { moved: [], flights: false, status: [], active: null, phase: null }, 'a first or reconnected state plays nothing');
  assert.deepEqual(publicChanges(before, publicFacts(drawn({ 'room-a': [seat('seat-1', { isActive: true }), seat('seat-2')], 'room-b': [seat('seat-3')] }))),
    { moved: [], flights: false, status: [], active: null, phase: null }, 'the same state again plays nothing');
  const after = publicFacts(drawn({ 'room-a': [seat('seat-1')], 'room-b': [seat('seat-2', { isActive: true }), seat('seat-3', { health: 'Injured' })] }, { phase: 'Player 2’s turn' }));
  assert.deepEqual(publicChanges(before, after), { moved: ['seat-2'], flights: true, status: ['seat-3'], active: 'seat-2', phase: 'phase' });
  assert.equal(publicChanges(before, publicFacts(drawn({ 'room-a': [seat('seat-1', { isActive: true }), seat('seat-2')], 'room-b': [seat('seat-3')] }, { round: 'Round 3' }))).phase, 'round');
  // Five moves at once are a reshuffle: each lands where the view has it, and nothing flies.
  const nine = room => Object.fromEntries([[room, Array.from({ length: 9 }, (_, index) => seat(`seat-${index + 1}`))]]);
  const reshuffle = publicChanges(publicFacts(drawn(nine('room-a'))), publicFacts(drawn(nine('hospital'))));
  assert.equal(reshuffle.moved.length, 9);
  assert.equal(reshuffle.flights, false);
});

test('the strip\'s own cues come from its drawn step: arriving, a pick, the registration stamp, a command not accepted', () => {
  const closedStrip = { open: false, status: null, picked: [] };
  assert.deepEqual(stripChanges(closedStrip, { open: true, status: 'choosing', picked: [] }), { enter: true, registration: false, notAccepted: false, picked: [] });
  assert.deepEqual(stripChanges({ open: true, status: 'choosing', picked: [] }, { open: true, status: 'choosing', picked: ['seat-2'] }).picked, ['seat-2']);
  assert.equal(stripChanges({ open: true, status: 'choosing', picked: ['seat-2'] }, { open: true, status: 'choosing', picked: ['seat-2'] }).picked.length, 0, 'a redraw replays nothing');
  for (const sent of ['submitting', 'checking', 'unknown']) assert.equal(stripChanges({ open: true, status: sent, picked: [] }, { open: true, status: 'accepted', picked: [] }).registration, true, sent);
  assert.equal(stripChanges({ open: true, status: 'accepted', picked: [] }, { open: true, status: 'accepted', picked: [] }).registration, false, 'the stamp lands once');
  assert.equal(stripChanges(closedStrip, { open: true, status: 'accepted', picked: [] }).registration, false, 'a strip that arrives already accepted stamps nothing');
  assert.equal(stripChanges({ open: true, status: 'submitting', picked: [] }, { open: true, status: 'not-accepted', picked: [] }).notAccepted, true);
  assert.deepEqual(stripChanges({ open: true, status: 'choosing', picked: [] }, closedStrip), { enter: false, registration: false, notAccepted: false, picked: [] });
});
