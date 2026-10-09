import test from 'node:test';
import assert from 'node:assert/strict';
import { createComicMotion, movedPublicSeats } from '../hosted/comic-motion.mjs';
import { motionDom } from './support/comic-motion-dom.mjs';
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

const atRoom = (room, motion = 'full') => ({ ...drawn({ [room]: [seatFacts()], 'hospital': [{ ...seatFacts(), seatId: 'seat-2' }] }), motion });
for (const preference of ['in-app', 'system']) {
  test(`${preference} reduced motion during travel cancels owned effects before an unchanged-facts return`, t => {
    const dom = motionDom(t);
    const motion = createComicMotion(dom.root, { fx: dom.fx, now: () => 0 });
    t.after(() => motion.dispose());
    assert.deepEqual(motion.after(atRoom('room-a'), motion.before()), []);
    const before = motion.before();
    dom.redraw('room-b');
    assert.deepEqual(motion.after(atRoom('room-b'), before), [{ cue: 'public-move', seat: 'seat-1', variant: 'flight' }]);
    assert.equal(dom.fx.children.length, 3, 'flight, trail and puff are owned');
    assert.equal(dom.animations.length, 2, 'flight and co-occupant reflow both run');
    assert.equal(dom.animations[0].options.duration, 900);
    assert.equal(dom.piece('seat-1').dataset.moving, '');

    // The real host replaces pieces on each redraw. Same public facts keep that new piece
    // hidden while the flight runs, until either preference takes effect.
    dom.redraw('room-b');
    assert.deepEqual(motion.after(atRoom('room-b'), motion.before()), []);
    assert.equal(dom.piece('seat-1').dataset.moving, '');
    if (preference === 'system') dom.deviceReduced(true);
    dom.redraw('room-b');
    const reduced = atRoom('room-b', preference === 'in-app' ? 'reduced' : 'full');
    assert.deepEqual(motion.after(reduced, motion.before()), [], 'same facts replay no cue');
    assert.ok(dom.animations.every(animation => animation.cancellations === 1), 'both spatial animations are cancelled');
    assert.equal(dom.fx.children.length, 0);
    assert.equal(dom.piece('seat-1').dataset.moving, undefined, 'the authoritative piece is visible at its new location');
    t.mock.timers.tick(2_000);
    assert.equal(dom.fx.children.length, 0, 'old timers cannot reintroduce effects');
    dom.deviceReduced(false);
    assert.deepEqual(motion.after(atRoom('room-b'), motion.before()), [], 'turning motion back on does not replay the move');
    const nextBefore = motion.before();
    dom.redraw('room-a');
    motion.after(atRoom('room-a'), nextBefore);
    assert.equal(dom.fx.children.length, 3, 'a later authoritative move still works');
    motion.dispose();
    motion.dispose();
    assert.equal(dom.fx.children.length, 0);
    assert.equal(dom.piece('seat-1').dataset.moving, undefined);
    assert.ok(dom.animations.every(animation => animation.cancellations === 1), 'disposal is idempotent');
  });
}

test('a reduced-motion switch also clears the lingering trail after travel completes', async t => {
  const dom = motionDom(t);
  const motion = createComicMotion(dom.root, { fx: dom.fx, now: () => 0 });
  t.after(() => motion.dispose());
  motion.after(atRoom('room-a'), motion.before());
  const before = motion.before();
  dom.redraw('room-b');
  motion.after(atRoom('room-b'), before);
  dom.animations[0].finish();
  await Promise.resolve();
  assert.equal(dom.piece('seat-1').dataset.moving, undefined);
  assert.equal(dom.fx.children.length, 2, 'only trail and puff linger');
  motion.after(atRoom('room-b', 'reduced'), motion.before());
  assert.equal(dom.fx.children.length, 0);
  t.mock.timers.tick(2_000);
  assert.equal(dom.fx.children.length, 0);
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
