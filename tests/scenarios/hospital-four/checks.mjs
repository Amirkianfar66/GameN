// The checks of the four-bed Hospital (owner decision HOSPITAL-4-2026-10-18, ruleset
// in-person-v1-hospital-four-2026-10-19), separately for 7, 8 and 9 players. Every expected value
// below is written from the overlay, Backend's runtime contract or a rule they keep, named beside
// it; none is read from the engine. A native line uses only legal commands and deadlines. A
// constructed line places bodies or patients in Hospital by hand, because no legal play reaches
// that ward with that number of players, and says so.
import { openMatch, constructed, seatIds } from './driver.mjs';

export const MODES = [7, 8, 9];

export const SOURCES = Object.freeze({
  'H4-CAPACITY': 'rules/overlays/hospital-four-owner-decision-2026-10-19.json, decision H4-CAPACITY',
  'H4-CHECKPOINT': 'rules/overlays/hospital-four-owner-decision-2026-10-19.json, decision H4-CHECKPOINT',
  'H4-OVERFLOW': 'rules/overlays/hospital-four-owner-decision-2026-10-19.json, decision H4-OVERFLOW',
  'H4-CLINICAL': 'rules/overlays/hospital-four-owner-decision-2026-10-19.json, decision H4-CLINICAL',
  'H4-PAIRING': 'rules/overlays/hospital-four-owner-decision-2026-10-19.json, decision H4-PAIRING',
  'CONTRACT-CHECKPOINT': 'docs/backend/hospital-four-runtime-contract.md, "Atomic checkpoint"',
  'CONTRACT-ROWS': 'docs/backend/hospital-four-runtime-contract.md, the four constructed regression expectations',
  'CONTRACT-BOUNDARY': 'docs/backend/hospital-four-runtime-contract.md, "Consumer boundary"',
  'BOARD-MEDICAL-01': 'rules/overlays/board-medical-owner-decision-2026-10-14.json, decision BOARD-MEDICAL-01',
  'BOARD-MEDICAL-03': 'rules/overlays/board-medical-owner-decision-2026-10-14.json, decision BOARD-MEDICAL-03',
  'BOARD-MEDICAL-04': 'rules/overlays/board-medical-owner-decision-2026-10-14.json, decision BOARD-MEDICAL-04',
  'BOARD-MEDICAL-05': 'rules/overlays/board-medical-owner-decision-2026-10-14.json, decision BOARD-MEDICAL-05',
  'R-WIN-05': 'docs/balance/game-rules.md, R-WIN-05',
  'R-WIN-06': 'docs/balance/game-rules.md, R-WIN-06',
});

// What the owner's instruction of 19 October asks to be verified, in its order.
export const REQUIREMENTS = Object.freeze([
  { id: 'beds', text: 'Exactly four physical Hospital positions, H1 to H4' },
  { id: 'fourth', text: 'A fourth admission succeeds' },
  { id: 'overflow', text: 'A player denied admission is permanently Eliminated and off the board, and cannot later be Rescued' },
  { id: 'bodies', text: 'Existing bodies still occupy beds' },
  { id: 'healed-first', text: 'Healed beds are freed before admission by player number' },
  { id: 'order', text: 'Simultaneous arrivals and a Rescue in the same stage follow the published order' },
  { id: 'identity', text: 'Identity, Code and history remain after removal from the board' },
  { id: 'replay', text: 'Committed outcomes are the same on replay' },
  { id: 'anchors', text: 'Clinical anchors stay roster-sized: HV5 and above can be valid without a fifth bed' },
]);

const OFFBOARD = Object.freeze({ health: 'Eliminated', location: null, slotId: null, medical: null, jailed: false, captain: false });
const body = slot => ['Eliminated', 'Hospital', slot];
const patient = slot => ['Injured', 'Hospital', slot];
const others = (mode, first) => [...first, ...seatIds(mode).filter(id => !first.includes(id))];

function accept(receipt, what) {
  if (receipt.status !== 'accepted') throw new Error(`${what} was refused (${receipt.code})`);
}

// Health, room and position of each seat, as the public view shows them.
function places(match, ids) {
  const seats = match.views().public.seats;
  return Object.fromEntries(ids.map(id => { const seat = seats.find(item => item.seatId === id); return [id, [seat.health, seat.location, seat.slotId]]; }));
}
function offboard(match, id) {
  const seat = match.views().public.seats.find(item => item.seatId === id);
  return { health: seat.health, location: seat.location, slotId: seat.slotId, medical: seat.medical, jailed: seat.jailed, captain: seat.captain };
}
const since = (match, before) => match.state.outcomes.slice(before.outcomes.length);
const overflows = records => records.filter(record => record.fact.type === 'HOSPITAL_OVERFLOW_REMOVED')
  .map(record => ({ ...record.fact, public: record.recipientSeatIds === null }));
const medicalFacts = records => records.filter(record => record.fact.type === 'MEDICAL_OUTCOME').map(record => `${record.fact.seatId} ${record.fact.kind}`).sort();
const removal = (phaseId, round, seatId) => ({ phaseId, round, type: 'HOSPITAL_OVERFLOW_REMOVED', seatId, public: true });

// Expected outcomes and what the engine did, kept side by side.
function claims() {
  const list = [];
  return {
    list,
    add(id, text, sources, expected, actual) { list.push({ id, text, sources, expected, actual }); },
  };
}

// The anchors of the clinical facts of one resolution, as the game service assigns them, and
// whether each is valid for the starting roster under the contracts.
function anchors(api, before, after, mode) {
  const assigned = api.service.clinicalPresentationAnchors(before, after);
  const valid = Object.values(assigned).every(anchorId => api.contracts.validClinicalAnchorForPlayerCount(
    { kind: 'CLINICAL_VIGNETTE', batchId: 'balance-check', anchorId, slotCount: mode }, mode));
  return { assigned, valid };
}

/** Places bodies (round null) or patients admitted in a round in Hospital, by hand. */
function withWard(api, match, entries, how) {
  const state = JSON.parse(JSON.stringify(match.state));
  for (const [id, slotId, admittedRound] of entries) {
    const seat = state.seats.find(item => item.seatId === id);
    const episode = (seat.medicalEpisodeCount ?? 0) + 1;
    Object.assign(seat, {
      location: 'Hospital', slotId, captain: false, jailed: false, medicalEpisodeCount: episode,
      health: admittedRound === null ? 'Eliminated' : 'Injured',
      medicalEpisode: admittedRound === null ? null : { number: episode, admittedRound, deathDueAfterRound: admittedRound === 5 ? null : admittedRound + 1 },
    });
  }
  api.engine.projectFullGame(state); // The engine's own guards accept the constructed state, or this throws.
  return constructed(api, state, how);
}

// The first rounds the native lines of eight and nine players share: both Disablers strike in
// Round 1, so the Insider and the Alien are bodies in H1 and H2 from the end of Round 2.
function twoBodies(m) {
  m.toTurn(1, 'seat-3'); accept(m.send('seat-3', { type: 'REQUEST_BLACKOUT' }), 'the Blue Disabler\'s request');
  m.toTurn(1, 'seat-8'); accept(m.send('seat-8', { type: 'REQUEST_BLACKOUT' }), 'the Red Disabler\'s request');
  accept(m.select('seat-3', 'seat-1'), 'the Blue Disabler\'s selection');
  accept(m.select('seat-8', 'seat-7'), 'the Red Disabler\'s selection');
  m.resolve();
}

export const LINES = Object.freeze([
  {
    id: 'P0', modes: MODES, kind: 'contract',
    title: 'The tuple has four physical beds, the reserved art and roster-sized clinical anchors',
    covers: ['beds', 'anchors'],
    play(api, mode, c) {
      const { engine, contracts, pins } = api;
      const beds = ['H1', 'H2', 'H3', 'H4'];
      const roster = Array.from({ length: mode }, (_, index) => `H${index + 1}`);
      c.add('engine-beds', 'The engine gives the tuple four Hospital positions', ['H4-CAPACITY'], beds,
        engine.boardSlotIdsFor({ versions: pins, playerCount: mode }, 'Hospital'));
      c.add('engine-history', 'The Clone tuple keeps a Hospital of the roster', ['H4-PAIRING'], roster,
        engine.boardSlotIdsFor({ versions: { ...engine.CLONE_FULL_GAME_VERSION_PINS }, playerCount: mode }, 'Hospital'));
      c.add('contract-beds', 'The contracts give a Blackout map of the tuple four Hospital positions, and the old reader keeps its count',
        ['CONTRACT-BOUNDARY'], { successor: beds, twoArguments: roster },
        { successor: contracts.blackoutSlotIds('Hospital', mode, pins), twoArguments: contracts.blackoutSlotIds('Hospital', mode) });
      c.add('art', 'A match of the tuple is refused with any art but design-0.5.0', ['H4-PAIRING'], 'refused', (() => {
        try {
          engine.createFullGame({ matchId: 'balance-art-check', now: 1_800_000_000_000, phaseId: 'phase-0', deadlineToken: 'deadline-0',
            assetManifestVersion: 'design-0.4.0', versions: { ...pins, assetManifestVersion: 'design-0.4.0' },
            setup: { playerCount: mode, roleOrder: ['Insider', 'Cracker', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien', 'Red Disabler', 'Officer'].slice(0, mode),
              codeExtraSeatIds: ['seat-1', 'seat-2', 'seat-3'], initialRooms: Object.fromEntries(seatIds(mode).map((id, index) => [id, index < 4 ? 'Room A' : 'Room B'])),
              roundOrders: [1, 2, 3, 4, 5].map(() => seatIds(mode)) } });
          return 'created';
        } catch { return 'refused'; }
      })());
      // A real view of the tuple with one body in H1, then the same view with that body in H5.
      const m = openMatch(api, mode, { rooms: { A: ['seat-1', 'seat-2', 'seat-3', 'seat-4'] } });
      const ward = withWard(api, m, [['seat-3', 'H1', null]], 'one body placed in H1 to obtain a view of the tuple');
      const view = ward.views().public;
      const moved = JSON.parse(JSON.stringify(view));
      moved.seats.find(seat => seat.seatId === 'seat-3').slotId = 'H5';
      c.add('view-h5', 'The public view of the tuple is valid with a body in H1 and refused with it in H5', ['H4-CAPACITY', 'CONTRACT-BOUNDARY'],
        { H1: true, H5: false }, { H1: contracts.FullPublicViewSchema.safeParse(view).success, H5: contracts.FullPublicViewSchema.safeParse(moved).success });
      const anchor = anchorId => contracts.validClinicalAnchorForPlayerCount({ kind: 'CLINICAL_VIGNETTE', batchId: 'balance-check', anchorId, slotCount: mode }, mode);
      c.add('anchor-range', 'A clinical anchor is valid from HV1 up to the number of players, HV5 included, and not beyond it', ['H4-CLINICAL'],
        { HV5: true, [`HV${mode}`]: true, beyond: false }, { HV5: anchor('HV5'), [`HV${mode}`]: anchor(`HV${mode}`), beyond: mode === 9 ? false : anchor(`HV${mode + 1}`) });
      return { matches: [ward] };
    },
  },
  {
    id: 'N1', modes: [8, 9], kind: 'native',
    title: 'Round 4: three arrivals for two free beds; the highest number is refused although it was hit first; no later Rescue; the Code keeps the refused player',
    covers: ['fourth', 'overflow', 'bodies', 'order', 'identity', 'anchors'],
    play(api, mode, c) {
      const m = openMatch(api, mode, { rooms: { A: ['seat-1', 'seat-2', 'seat-3', 'seat-4', 'seat-5'] },
        orders: { 4: others(mode, ['seat-5', 'seat-3', 'seat-4']) }, codeExtra: ['seat-1', 'seat-2', 'seat-8'] });
      twoBodies(m);
      m.toRound(3);
      c.add('bodies-r2', 'The Insider and the Alien die at the end of Round 2 and keep H1 and H2', ['BOARD-MEDICAL-01', 'BOARD-MEDICAL-03'],
        { 'seat-1': body('H1'), 'seat-7': body('H2') }, places(m, ['seat-1', 'seat-7']));
      m.toTurn(3, 'seat-4'); accept(m.send('seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-3', 'seat-4'] }), 'the Supply');
      m.resolve();
      // Round 4, in this turn order: Undercover moves to Room B and shoots the Red Disabler; the
      // Blue Disabler shoots the Supplier; the Supplier shoots the Blue Disabler.
      m.toTurn(4, 'seat-5'); accept(m.send('seat-5', { type: 'MOVE', destination: 'Room B' }), 'Undercover\'s move');
      accept(m.send('seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-8' }), 'Undercover\'s shot');
      m.toTurn(4, 'seat-3'); accept(m.send('seat-3', { type: 'REGISTER_SHOT', targetSeatId: 'seat-4' }), 'the Blue Disabler\'s shot');
      m.toTurn(4, 'seat-4'); accept(m.send('seat-4', { type: 'REGISTER_SHOT', targetSeatId: 'seat-3' }), 'the Supplier\'s shot');
      const before = m.resolve();
      const batch = since(m, before);
      c.add('admitted', 'Players 3 and 4 take H3 and H4 in order of number: the fourth admission succeeds', ['H4-CHECKPOINT', 'BOARD-MEDICAL-01'],
        { 'seat-3': patient('H3'), 'seat-4': patient('H4') }, places(m, ['seat-3', 'seat-4']));
      c.add('refused', 'Player 8, hit first, finds no bed and is Eliminated off the board', ['H4-OVERFLOW', 'CONTRACT-BOUNDARY'], OFFBOARD, offboard(m, 'seat-8'));
      c.add('bodies-kept', 'The two bodies keep H1 and H2', ['H4-CHECKPOINT'], { 'seat-1': body('H1'), 'seat-7': body('H2') }, places(m, ['seat-1', 'seat-7']));
      c.add('removal-outcome', 'One public removal outcome names player 8, the round and the resolving phase', ['H4-OVERFLOW', 'CONTRACT-BOUNDARY'],
        [removal(before.phase.id, 4, 'seat-8')], overflows(batch));
      c.add('removal-shape', 'The removal fact is valid under the contracts', ['CONTRACT-BOUNDARY'], true,
        overflows(batch).every(({ public: _, ...fact }) => api.contracts.HospitalOverflowFactSchema.safeParse(fact).success));
      c.add('no-medical', 'The batch has clinical facts for players 3 and 4 and none for player 8', ['H4-OVERFLOW', 'CONTRACT-BOUNDARY'],
        ['seat-3 INJURY', 'seat-4 INJURY'], medicalFacts(batch));
      c.add('anchors', 'Players 3 and 4 get anchors HV3 and HV4 after the bodies\' HV1 and HV2; player 8 gets none', ['H4-CLINICAL', 'CONTRACT-BOUNDARY'],
        { assigned: { 'seat-3': 'HV3', 'seat-4': 'HV4' }, valid: true }, anchors(api, before, m.state, mode));
      const history = m.state.outcomes.length;
      // Round 5: the Cracker cannot Rescue player 8 and Rescues player 3; the Hacker enters the Code.
      m.toTurn(5, 'seat-2');
      c.add('no-rescue-offered', 'The Cracker is not offered player 8 as a Rescue target', ['H4-OVERFLOW'], false,
        (m.views().players['seat-2'].legalTargets.RESCUE ?? []).includes('seat-8'));
      const refused = m.send('seat-2', { type: 'RESCUE', targetSeatId: 'seat-8' });
      c.add('no-rescue', 'A Rescue of player 8 is refused', ['H4-OVERFLOW'], { status: 'rejected', code: 'NOT_ALLOWED' }, { status: refused.status, code: refused.code });
      accept(m.send('seat-2', { type: 'RESCUE', targetSeatId: 'seat-3' }), 'the Rescue of player 3');
      m.toTurn(5, 'seat-6'); accept(m.send('seat-6', { type: 'SUBMIT_CODE', seatIds: ['seat-1', 'seat-2', 'seat-7', 'seat-8'] }), 'the Code');
      m.resolve();
      const view = m.views().public;
      c.add('still-off', 'Player 8 is still off the board after Round 5', ['H4-OVERFLOW'], OFFBOARD, offboard(m, 'seat-8'));
      c.add('healed-return', 'Player 3, Rescued, returns to Room A at its lowest free position', ['BOARD-MEDICAL-04', 'BOARD-MEDICAL-01'],
        { 'seat-3': ['Healthy', 'Room A', 'A1'] }, places(m, ['seat-3']));
      c.add('identity', 'Player 8 is still listed with its faction, its role is revealed at the end, and the Code still holds it', ['H4-OVERFLOW'],
        { listed: mode, faction: 'Red', role: 'Red Disabler', code: ['seat-1', 'seat-2', 'seat-7', 'seat-8'] },
        { listed: view.seats.length, faction: view.seats.find(seat => seat.seatId === 'seat-8').revealedFaction,
          role: view.endReveal?.roles.find(item => item.seatId === 'seat-8')?.role ?? null, code: view.endReveal?.code ?? null });
      c.add('code-wins', 'The Code naming player 8 is correct, and Red wins on it at the end of Round 5', ['R-WIN-06', 'H4-OVERFLOW'],
        { correct: true, winner: 'Red' }, { correct: m.state.correctCode, winner: m.state.result?.winner ?? null });
      c.add('history', 'Every outcome recorded before Round 5 is still recorded after it', ['H4-OVERFLOW'], true,
        JSON.stringify(m.state.outcomes.slice(0, history)) === JSON.stringify(before.outcomes.concat(batch)));
      return { matches: [m] };
    },
  },
  {
    id: 'N2', modes: [8, 9], kind: 'native',
    title: 'Round 5: the ward is full; a Rescued patient leaves first, and the new patient takes the freed bed',
    covers: ['healed-first', 'bodies'],
    play(api, mode, c) {
      const m = fullWardBy4(api, mode);
      c.add('full', 'After Round 4 the ward is full: two bodies and two patients', ['H4-CAPACITY', 'BOARD-MEDICAL-01'],
        { 'seat-1': body('H1'), 'seat-7': body('H2'), 'seat-3': patient('H3'), 'seat-6': patient('H4') }, places(m, ['seat-1', 'seat-7', 'seat-3', 'seat-6']));
      m.toTurn(5, 'seat-2'); accept(m.send('seat-2', { type: 'RESCUE', targetSeatId: 'seat-3' }), 'the Rescue of player 3');
      m.toTurn(5, 'seat-5'); accept(m.send('seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-8' }), 'Undercover\'s shot');
      const before = m.resolve();
      c.add('admitted', 'Player 8 takes H3, the bed player 3 left; player 6 dies in H4', ['H4-CHECKPOINT', 'BOARD-MEDICAL-03', 'BOARD-MEDICAL-04'],
        { 'seat-8': patient('H3'), 'seat-6': body('H4'), 'seat-1': body('H1'), 'seat-7': body('H2') }, places(m, ['seat-8', 'seat-6', 'seat-1', 'seat-7']));
      c.add('healed-return', 'Player 3 returns to Room A at its lowest free position', ['BOARD-MEDICAL-04', 'BOARD-MEDICAL-01'],
        { 'seat-3': ['Healthy', 'Room A', 'A1'] }, places(m, ['seat-3']));
      c.add('no-deadline', 'A patient of Round 5 has no Rescue deadline', ['BOARD-MEDICAL-05'], { admittedRound: 5, rescueDueAfterRound: null },
        (({ admittedRound, rescueDueAfterRound }) => ({ admittedRound, rescueDueAfterRound }))(m.views().public.seats.find(seat => seat.seatId === 'seat-8').medical ?? {}));
      c.add('no-removal', 'Nobody is removed from the board', ['H4-CHECKPOINT'], [], overflows(m.state.outcomes));
      c.add('batch', 'The batch has an injury for player 8, a recovery for player 3 and a death for player 6', ['BOARD-MEDICAL-03'],
        ['seat-3 HEALED', 'seat-6 DEATH', 'seat-8 INJURY'], medicalFacts(since(m, before)));
      return { matches: [m] };
    },
  },
  {
    id: 'N3', modes: [8, 9], kind: 'native',
    title: 'Round 5: the ward is full; a new patient Rescued in the same stage needs no bed and gets an anchor beyond the fourth',
    covers: ['order', 'bodies', 'anchors'],
    play(api, mode, c) {
      const m = fullWardBy4(api, mode);
      m.toTurn(5, 'seat-2'); accept(m.send('seat-2', { type: 'RESCUE', targetSeatId: 'seat-4' }), 'the Rescue of player 4');
      m.toTurn(5, 'seat-5'); accept(m.send('seat-5', { type: 'MOVE', destination: 'Room A' }), 'Undercover\'s move');
      accept(m.send('seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-4' }), 'Undercover\'s shot');
      const before = m.resolve();
      c.add('healed', 'Player 4 is Healthy and returns to Room A at its lowest free position, without taking a bed', ['H4-CHECKPOINT', 'CONTRACT-CHECKPOINT', 'BOARD-MEDICAL-01'],
        { 'seat-4': ['Healthy', 'Room A', 'A3'] }, places(m, ['seat-4']));
      c.add('ward', 'The ward holds four bodies: the two of Round 2 and the two patients of Round 4, dead at the end of Round 5', ['BOARD-MEDICAL-03', 'H4-CHECKPOINT'],
        { 'seat-1': body('H1'), 'seat-7': body('H2'), 'seat-3': body('H3'), 'seat-6': body('H4') }, places(m, ['seat-1', 'seat-7', 'seat-3', 'seat-6']));
      c.add('no-removal', 'Nobody is removed from the board', ['H4-CHECKPOINT', 'CONTRACT-ROWS'], [], overflows(m.state.outcomes));
      c.add('anchors', 'Player 4, a fifth clinical subject, gets HV5 while the occupants keep HV1 to HV4; all are valid', ['H4-CLINICAL', 'CONTRACT-BOUNDARY'],
        { assigned: { 'seat-3': 'HV3', 'seat-4': 'HV5', 'seat-6': 'HV4' }, valid: true }, anchors(api, before, m.state, mode));
      return { matches: [m] };
    },
  },
  {
    id: 'N4', modes: [9], kind: 'native',
    title: 'Round 4: one bed left; a body of two hits with the lower number takes it, the Rescue on it heals nothing, and the higher number is refused',
    covers: ['fourth', 'overflow', 'bodies', 'order', 'anchors'],
    play(api, mode, c) {
      const m = openMatch(api, mode, { rooms: { A: ['seat-1', 'seat-2', 'seat-3', 'seat-4', 'seat-6'] },
        orders: { 4: others(mode, ['seat-4', 'seat-3', 'seat-5', 'seat-2']) } });
      twoBodies(m);
      m.toTurn(2, 'seat-9'); accept(m.send('seat-9', { type: 'REGISTER_SHOT', targetSeatId: 'seat-8' }), 'the Officer\'s shot');
      m.resolve();
      m.toTurn(3, 'seat-4'); accept(m.send('seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-3', 'seat-4'] }), 'the Supply');
      m.resolve();
      m.toRound(4);
      c.add('three', 'Before Round 4 three bodies hold H1 to H3', ['BOARD-MEDICAL-01', 'BOARD-MEDICAL-03'],
        { 'seat-1': body('H1'), 'seat-7': body('H2'), 'seat-8': body('H3') }, places(m, ['seat-1', 'seat-7', 'seat-8']));
      // Round 4, in this turn order: the Supplier shoots the Hacker; the Blue Disabler and then
      // Undercover shoot the Supplier; the Cracker registers a Rescue for the Supplier.
      m.toTurn(4, 'seat-4'); accept(m.send('seat-4', { type: 'REGISTER_SHOT', targetSeatId: 'seat-6' }), 'the Supplier\'s shot');
      m.toTurn(4, 'seat-3'); accept(m.send('seat-3', { type: 'REGISTER_SHOT', targetSeatId: 'seat-4' }), 'the Blue Disabler\'s shot');
      m.toTurn(4, 'seat-5'); accept(m.send('seat-5', { type: 'MOVE', destination: 'Room A' }), 'Undercover\'s move');
      accept(m.send('seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-4' }), 'Undercover\'s shot');
      m.toTurn(4, 'seat-2'); accept(m.send('seat-2', { type: 'RESCUE', targetSeatId: 'seat-4' }), 'the Rescue of player 4');
      const before = m.resolve();
      const batch = since(m, before);
      c.add('body-admitted', 'Player 4, Eliminated by the second hit, takes the last bed as a body', ['H4-CHECKPOINT', 'CONTRACT-CHECKPOINT'],
        { 'seat-4': body('H4') }, places(m, ['seat-4']));
      c.add('refused', 'Player 6, hit first, finds no bed and is Eliminated off the board', ['H4-OVERFLOW', 'CONTRACT-BOUNDARY'], OFFBOARD, offboard(m, 'seat-6'));
      c.add('removal-outcome', 'One public removal outcome names player 6', ['H4-OVERFLOW'], [removal(before.phase.id, 4, 'seat-6')], overflows(batch));
      c.add('no-heal', 'The Rescue is spent and heals nothing; the batch has player 4\'s injury and death and nothing of player 6', ['CONTRACT-CHECKPOINT', 'BOARD-MEDICAL-03', 'H4-OVERFLOW'],
        { rescuesRemaining: 1, facts: ['seat-4 DEATH', 'seat-4 INJURY'] }, { rescuesRemaining: m.views().players['seat-2'].self.rescuesRemaining, facts: medicalFacts(batch) });
      c.add('bodies-kept', 'The three bodies keep H1 to H3', ['H4-CHECKPOINT'], { 'seat-1': body('H1'), 'seat-7': body('H2'), 'seat-8': body('H3') },
        places(m, ['seat-1', 'seat-7', 'seat-8']));
      c.add('anchors', 'Player 4 gets HV4 after the bodies\' HV1 to HV3; player 6 gets none', ['H4-CLINICAL'],
        { assigned: { 'seat-4': 'HV4' }, valid: true }, anchors(api, before, m.state, mode));
      return { matches: [m] };
    },
  },
  {
    id: 'N5', modes: [7], kind: 'native',
    title: 'Round 4 fills the fourth bed; in the showdown a ward of four bodies refuses both arrivals, who keep their identity and Code',
    covers: ['fourth', 'overflow', 'bodies', 'identity'],
    play(api, mode, c) {
      const m = openMatch(api, mode, { rooms: { A: ['seat-1', 'seat-2', 'seat-3', 'seat-4', 'seat-7'] } });
      m.toTurn(1, 'seat-3'); accept(m.send('seat-3', { type: 'REQUEST_BLACKOUT' }), 'the Blue Disabler\'s request');
      accept(m.select('seat-3', 'seat-7'), 'the selection');
      m.resolve();
      m.toTurn(3, 'seat-4'); accept(m.send('seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-3', 'seat-4'] }), 'the Supply');
      m.resolve();
      m.toTurn(4, 'seat-3'); accept(m.send('seat-3', { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }), 'the Blue Disabler\'s shot');
      m.toTurn(4, 'seat-4'); accept(m.send('seat-4', { type: 'REGISTER_SHOT', targetSeatId: 'seat-2' }), 'the Supplier\'s shot');
      m.toTurn(4, 'seat-5'); accept(m.send('seat-5', { type: 'MOVE', destination: 'Room A' }), 'Undercover\'s move');
      accept(m.send('seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-4' }), 'Undercover\'s shot');
      m.resolve();
      c.add('fourth', 'Three patients join the Alien\'s body in order of number; the fourth admission succeeds', ['H4-CHECKPOINT', 'BOARD-MEDICAL-01'],
        { 'seat-7': body('H1'), 'seat-1': patient('H2'), 'seat-2': patient('H3'), 'seat-4': patient('H4') }, places(m, ['seat-7', 'seat-1', 'seat-2', 'seat-4']));
      m.resolve();
      c.add('showdown', 'Round 5 ends without a winner; the three patients die in their beds and the showdown opens', ['BOARD-MEDICAL-03', 'BOARD-MEDICAL-05'],
        { phase: 'SHOWDOWN', 'seat-1': body('H2'), 'seat-2': body('H3'), 'seat-4': body('H4') },
        { phase: m.state.phase.kind, ...places(m, ['seat-1', 'seat-2', 'seat-4']) });
      accept(m.send('seat-3', { type: 'SHOWDOWN_SHOT', targetSeatId: 'seat-6' }), 'the Blue Disabler\'s showdown shot');
      accept(m.send('seat-5', { type: 'SHOWDOWN_SHOT', targetSeatId: 'seat-3' }), 'Undercover\'s showdown shot');
      const before = m.resolve();
      const view = m.views().public;
      c.add('refused', 'Players 3 and 6 find no bed and are Eliminated off the board', ['H4-OVERFLOW', 'CONTRACT-BOUNDARY'],
        { 'seat-3': OFFBOARD, 'seat-6': OFFBOARD }, { 'seat-3': offboard(m, 'seat-3'), 'seat-6': offboard(m, 'seat-6') });
      c.add('removal-outcome', 'Two public removal outcomes, in order of number, and no clinical fact for either', ['H4-OVERFLOW', 'CONTRACT-BOUNDARY'],
        { removals: [removal(before.phase.id, 5, 'seat-3'), removal(before.phase.id, 5, 'seat-6')], facts: [] },
        { removals: overflows(since(m, before)), facts: medicalFacts(since(m, before)) });
      c.add('bodies-kept', 'The four bodies keep H1 to H4', ['H4-CHECKPOINT'],
        { 'seat-7': body('H1'), 'seat-1': body('H2'), 'seat-2': body('H3'), 'seat-4': body('H4') }, places(m, ['seat-7', 'seat-1', 'seat-2', 'seat-4']));
      c.add('identity', 'Both are still listed, their roles are revealed at the end, and the Code still holds player 3', ['H4-OVERFLOW'],
        { listed: mode, roles: ['Blue Disabler', 'Hacker'], code: ['seat-1', 'seat-2', 'seat-3', 'seat-7'] },
        { listed: view.seats.length, roles: ['seat-3', 'seat-6'].map(id => view.endReveal?.roles.find(item => item.seatId === id)?.role ?? null), code: view.endReveal?.code ?? null });
      c.add('winner', 'With every Blue player Eliminated and Undercover Healthy, Red wins', ['R-WIN-05'], 'Red', m.state.result?.winner ?? null);
      return { matches: [m] };
    },
  },
  {
    id: 'N6', modes: [7], kind: 'native',
    title: 'Showdown: one bed left for two arrivals; the lower number takes it although it was hit second',
    covers: ['fourth', 'overflow', 'bodies', 'order'],
    play(api, mode, c) {
      const m = openMatch(api, mode, { rooms: { A: ['seat-1', 'seat-2', 'seat-3', 'seat-4', 'seat-7'] },
        orders: { 5: others(mode, ['seat-5', 'seat-4']) } });
      m.toTurn(1, 'seat-3'); accept(m.send('seat-3', { type: 'REQUEST_BLACKOUT' }), 'the Blue Disabler\'s request');
      accept(m.select('seat-3', 'seat-7'), 'the selection');
      m.resolve();
      m.toTurn(3, 'seat-4'); accept(m.send('seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-3', 'seat-4'] }), 'the Supply');
      m.resolve();
      m.toTurn(4, 'seat-3'); accept(m.send('seat-3', { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }), 'the Blue Disabler\'s shot');
      m.toTurn(4, 'seat-4'); accept(m.send('seat-4', { type: 'REGISTER_SHOT', targetSeatId: 'seat-2' }), 'the Supplier\'s shot');
      m.resolve();
      m.resolve();
      c.add('showdown', 'The showdown opens with three bodies in H1 to H3', ['BOARD-MEDICAL-03', 'BOARD-MEDICAL-05'],
        { phase: 'SHOWDOWN', 'seat-7': body('H1'), 'seat-1': body('H2'), 'seat-2': body('H3') }, { phase: m.state.phase.kind, ...places(m, ['seat-7', 'seat-1', 'seat-2']) });
      // In the stored order of Round 5, Undercover's shot at player 6 resolves before the Supplier's at player 3.
      accept(m.send('seat-5', { type: 'SHOWDOWN_SHOT', targetSeatId: 'seat-6' }), 'Undercover\'s showdown shot');
      accept(m.send('seat-4', { type: 'SHOWDOWN_SHOT', targetSeatId: 'seat-3' }), 'the Supplier\'s showdown shot');
      const before = m.resolve();
      c.add('admitted', 'Player 3 takes H4', ['H4-CHECKPOINT', 'BOARD-MEDICAL-01'], { 'seat-3': patient('H4') }, places(m, ['seat-3']));
      c.add('refused', 'Player 6, hit first, finds no bed and is Eliminated off the board', ['H4-OVERFLOW', 'CONTRACT-BOUNDARY'], OFFBOARD, offboard(m, 'seat-6'));
      c.add('removal-outcome', 'One public removal outcome names player 6; the only clinical fact of the stage is player 3\'s injury', ['H4-OVERFLOW', 'CONTRACT-BOUNDARY'],
        { removals: [removal(before.phase.id, 5, 'seat-6')], facts: ['seat-3 INJURY'] }, { removals: overflows(since(m, before)), facts: medicalFacts(since(m, before)) });
      c.add('bodies-kept', 'The three bodies keep H1 to H3', ['H4-CHECKPOINT'], { 'seat-7': body('H1'), 'seat-1': body('H2'), 'seat-2': body('H3') },
        places(m, ['seat-7', 'seat-1', 'seat-2']));
      return { matches: [m] };
    },
  },
  {
    id: 'C1', modes: MODES, kind: 'constructed',
    title: 'Contract row 1: three occupants; player 6 is hit before player 1; player 1 takes the fourth bed, player 6 leaves the board, and no later Rescue reaches it',
    covers: ['fourth', 'overflow', 'bodies', 'order', 'identity'],
    play(api, mode, c) {
      const native = openMatch(api, mode, { rooms: { A: ['seat-1', 'seat-2', 'seat-3', 'seat-4'] }, orders: { 4: others(mode, ['seat-5', 'seat-2', 'seat-1']) } });
      native.toTurn(1, 'seat-6'); accept(native.send('seat-6', { type: 'SCAN', targetSeatId: 'seat-5', guess: 'Red' }), 'the Hacker\'s Scan');
      native.toTurn(3, 'seat-4'); accept(native.send('seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-2', 'seat-4'] }), 'the Supply');
      native.toTurn(4, 'seat-5');
      const m = withWard(api, native, [['seat-3', 'H1', null], ['seat-4', 'H2', null], ['seat-7', 'H3', null]],
        'at the first turn of Round 4, the bodies of the Blue Disabler, the Supplier and the Alien placed in H1 to H3');
      accept(m.send('seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-6' }), 'Undercover\'s shot');
      m.toTurn(4, 'seat-2'); accept(m.send('seat-2', { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }), 'the Cracker\'s shot');
      const before = m.resolve();
      const batch = since(m, before);
      c.add('admitted', 'Player 1 takes H4', ['CONTRACT-ROWS', 'H4-CHECKPOINT'], { 'seat-1': patient('H4') }, places(m, ['seat-1']));
      c.add('refused', 'Player 6 is Eliminated off the board', ['CONTRACT-ROWS', 'H4-OVERFLOW', 'CONTRACT-BOUNDARY'], OFFBOARD, offboard(m, 'seat-6'));
      c.add('removal-outcome', 'One public removal outcome names player 6, and the batch has no clinical fact for it', ['H4-OVERFLOW', 'CONTRACT-BOUNDARY'],
        { removals: [removal(before.phase.id, 4, 'seat-6')], facts: ['seat-1 INJURY'] }, { removals: overflows(batch), facts: medicalFacts(batch) });
      c.add('bodies-kept', 'The three bodies keep H1 to H3', ['H4-CHECKPOINT'], { 'seat-3': body('H1'), 'seat-4': body('H2'), 'seat-7': body('H3') },
        places(m, ['seat-3', 'seat-4', 'seat-7']));
      m.toTurn(5, 'seat-2');
      c.add('no-rescue-offered', 'In Round 5 the Cracker is not offered player 6 as a Rescue target', ['H4-OVERFLOW'], false,
        (m.views().players['seat-2'].legalTargets.RESCUE ?? []).includes('seat-6'));
      const refused = m.send('seat-2', { type: 'RESCUE', targetSeatId: 'seat-6' });
      c.add('no-rescue', 'A Rescue of player 6 is refused', ['H4-OVERFLOW'], { status: 'rejected', code: 'NOT_ALLOWED' }, { status: refused.status, code: refused.code });
      m.resolve();
      const view = m.views();
      c.add('identity', 'Player 6 is still listed with its faction and still reads the Scan it made in Round 1', ['H4-OVERFLOW'],
        { listed: mode, off: OFFBOARD, faction: 'Red', scans: [{ round: 1, targetSeatId: 'seat-5', guess: 'Red', matched: true }] },
        { listed: view.public.seats.length, off: offboard(m, 'seat-6'), faction: view.public.seats.find(seat => seat.seatId === 'seat-6').revealedFaction,
          scans: view.players['seat-6'].knowledge.scanResults.map(({ round, targetSeatId, guess, matched }) => ({ round, targetSeatId, guess, matched })) });
      return { matches: [m], prefix: native };
    },
  },
  {
    id: 'C2', modes: MODES, kind: 'constructed',
    title: 'Contract row 2: four occupants, one of them a patient; player 1 is hit and the patient, player 7, is Rescued; player 7 leaves and player 1 takes its bed',
    covers: ['healed-first', 'fourth', 'bodies'],
    play(api, mode, c) {
      const native = openMatch(api, mode, { rooms: { A: ['seat-1', 'seat-2', 'seat-3', 'seat-4'] }, orders: { 4: others(mode, ['seat-5', 'seat-2', 'seat-1']) } });
      native.toTurn(4, 'seat-5');
      const m = withWard(api, native, [['seat-3', 'H1', null], ['seat-4', 'H2', null], ['seat-6', 'H3', null], ['seat-7', 'H4', 3]],
        'at the first turn of Round 4, three bodies placed in H1 to H3 and the Alien, a patient of Round 3, in H4');
      accept(m.send('seat-5', { type: 'MOVE', destination: 'Room A' }), 'Undercover\'s move');
      accept(m.send('seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }), 'Undercover\'s shot');
      m.toTurn(4, 'seat-2'); accept(m.send('seat-2', { type: 'RESCUE', targetSeatId: 'seat-7' }), 'the Rescue of player 7');
      m.resolve();
      c.add('freed', 'Player 7 returns to Room B and player 1 takes H4', ['CONTRACT-ROWS', 'H4-CHECKPOINT', 'BOARD-MEDICAL-04'],
        { 'seat-7': ['Healthy', 'Room B', 'B1'], 'seat-1': patient('H4') }, places(m, ['seat-7', 'seat-1']));
      c.add('bodies-kept', 'The three bodies keep H1 to H3', ['H4-CHECKPOINT'], { 'seat-3': body('H1'), 'seat-4': body('H2'), 'seat-6': body('H3') },
        places(m, ['seat-3', 'seat-4', 'seat-6']));
      c.add('no-removal', 'Nobody is removed from the board', ['CONTRACT-ROWS'], [], overflows(m.state.outcomes));
      return { matches: [m], prefix: native };
    },
  },
  {
    id: 'C3', modes: MODES, kind: 'constructed',
    title: 'Contract row 3: four bodies; player 1 is hit and Rescued in the same stage, needs no bed, and gets a clinical anchor beyond the fourth',
    covers: ['order', 'bodies', 'anchors'],
    play(api, mode, c) {
      const native = openMatch(api, mode, { rooms: { A: ['seat-1', 'seat-2', 'seat-3', 'seat-4'] }, orders: { 4: others(mode, ['seat-5', 'seat-2', 'seat-1']) } });
      native.toTurn(4, 'seat-5');
      const m = withWard(api, native, [['seat-3', 'H1', null], ['seat-4', 'H2', null], ['seat-6', 'H3', null], ['seat-7', 'H4', null]],
        'at the first turn of Round 4, four bodies placed in H1 to H4');
      accept(m.send('seat-5', { type: 'MOVE', destination: 'Room A' }), 'Undercover\'s move');
      accept(m.send('seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }), 'Undercover\'s shot');
      m.toTurn(4, 'seat-2'); accept(m.send('seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }), 'the Rescue of player 1');
      const before = m.resolve();
      c.add('healed', 'Player 1 is Healthy in Room A, at its own position', ['CONTRACT-ROWS', 'H4-CHECKPOINT', 'BOARD-MEDICAL-01'],
        { 'seat-1': ['Healthy', 'Room A', 'A1'] }, places(m, ['seat-1']));
      c.add('ward', 'The four bodies keep H1 to H4 and nobody is removed', ['H4-CHECKPOINT', 'CONTRACT-ROWS'],
        { places: { 'seat-3': body('H1'), 'seat-4': body('H2'), 'seat-6': body('H3'), 'seat-7': body('H4') }, removals: [] },
        { places: places(m, ['seat-3', 'seat-4', 'seat-6', 'seat-7']), removals: overflows(m.state.outcomes) });
      c.add('anchors', 'Player 1 gets HV5, after HV1 to HV4 of the four occupants, and it is valid', ['H4-CLINICAL', 'CONTRACT-BOUNDARY'],
        { facts: ['seat-1 HEALED', 'seat-1 INJURY'], anchors: { assigned: { 'seat-1': 'HV5' }, valid: true } },
        { facts: medicalFacts(since(m, before)), anchors: anchors(api, before, m.state, mode) });
      return { matches: [m], prefix: native };
    },
  },
  {
    id: 'C4', modes: MODES, kind: 'constructed',
    title: 'Contract row 4: four bodies; player 1 is hit twice and then Rescued; player 1 is Eliminated, cannot heal, and leaves the board',
    covers: ['overflow', 'bodies', 'order', 'anchors'],
    play(api, mode, c) {
      const native = openMatch(api, mode, { rooms: { A: ['seat-1', 'seat-2', 'seat-3', 'seat-4'] }, orders: { 4: others(mode, ['seat-5', 'seat-2', 'seat-1']) } });
      native.toTurn(3, 'seat-4'); accept(native.send('seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-2', 'seat-4'] }), 'the Supply');
      native.toTurn(4, 'seat-5');
      const m = withWard(api, native, [['seat-3', 'H1', null], ['seat-4', 'H2', null], ['seat-6', 'H3', null], ['seat-7', 'H4', null]],
        'at the first turn of Round 4, four bodies placed in H1 to H4');
      accept(m.send('seat-5', { type: 'MOVE', destination: 'Room A' }), 'Undercover\'s move');
      accept(m.send('seat-5', { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }), 'Undercover\'s shot');
      m.toTurn(4, 'seat-2'); accept(m.send('seat-2', { type: 'REGISTER_SHOT', targetSeatId: 'seat-1' }), 'the Cracker\'s shot');
      accept(m.send('seat-2', { type: 'RESCUE', targetSeatId: 'seat-1' }), 'the Rescue of player 1');
      const before = m.resolve();
      const batch = since(m, before);
      c.add('refused', 'Player 1 is Eliminated off the board: no fifth body, no fifth bed', ['CONTRACT-ROWS', 'H4-OVERFLOW', 'CONTRACT-BOUNDARY'], OFFBOARD, offboard(m, 'seat-1'));
      c.add('removal-outcome', 'One public removal outcome names player 1, and the batch has no clinical fact for it', ['H4-OVERFLOW', 'CONTRACT-BOUNDARY'],
        { removals: [removal(before.phase.id, 4, 'seat-1')], facts: [] }, { removals: overflows(batch), facts: medicalFacts(batch) });
      c.add('bodies-kept', 'The four bodies keep H1 to H4', ['H4-CHECKPOINT'], { 'seat-3': body('H1'), 'seat-4': body('H2'), 'seat-6': body('H3'), 'seat-7': body('H4') },
        places(m, ['seat-3', 'seat-4', 'seat-6', 'seat-7']));
      c.add('no-heal', 'The Rescue is spent and heals nothing; no anchor is assigned', ['CONTRACT-ROWS', 'H4-CLINICAL'],
        { rescuesRemaining: 1, anchors: { assigned: {}, valid: true } }, { rescuesRemaining: m.views().players['seat-2'].self.rescuesRemaining, anchors: anchors(api, before, m.state, mode) });
      return { matches: [m], prefix: native };
    },
  },
]);

// The rounds N2 and N3 share: after Round 4 the ward is full, with two bodies of Round 2 and two
// patients of Round 4, due at the end of Round 5.
function fullWardBy4(api, mode) {
  const m = openMatch(api, mode, { rooms: { A: ['seat-1', 'seat-2', 'seat-3', 'seat-4', 'seat-6'] } });
  twoBodies(m);
  m.toTurn(3, 'seat-4'); accept(m.send('seat-4', { type: 'SUPPLY', targetSeatIds: ['seat-3', 'seat-4'] }), 'the Supply');
  m.resolve();
  m.toTurn(4, 'seat-3'); accept(m.send('seat-3', { type: 'REGISTER_SHOT', targetSeatId: 'seat-6' }), 'the Blue Disabler\'s shot');
  m.toTurn(4, 'seat-4'); accept(m.send('seat-4', { type: 'REGISTER_SHOT', targetSeatId: 'seat-3' }), 'the Supplier\'s shot');
  m.resolve();
  return m;
}

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

/** Runs one line with one number of players. A refused command or a thrown error is an error, not a pass. */
export function runLine(api, line, mode) {
  const collected = claims();
  const judged = () => collected.list.map(item => ({ ...item, passed: same(item.expected, item.actual) }));
  try {
    const { matches, prefix } = line.play(api, mode, collected);
    const results = judged();
    if (line.kind !== 'contract') {
      // Every step of every match: only H1 to H4 in Hospital, never more than four, and every seat listed.
      const steps = matches.flatMap(match => match.steps);
      const beds = steps.every(step => step.board.hospital.length <= 4 && step.board.hospital.every(([, slot]) => /^H[1-4]$/.test(slot)));
      const listed = steps.every(step => step.board.listed.length === mode);
      results.push({ id: 'beds-every-step', text: 'After every command and deadline Hospital holds at most four players, all in H1 to H4', sources: ['H4-CAPACITY'],
        expected: true, actual: beds, passed: beds, steps: steps.length });
      results.push({ id: 'listed-every-step', text: 'After every command and deadline the public view lists every seat of the match', sources: ['H4-OVERFLOW'],
        expected: true, actual: listed, passed: listed, steps: steps.length });
      const replays = [...(prefix ? [prefix] : []), ...matches].map(match => ({ origin: match.origin.kind, ...match.replay() }));
      const replayed = replays.every(item => item.differences.length === 0 && item.views && item.outcomes && item.deterministic && item.repeatedDeadlines);
      results.push({ id: 'replay', text: 'Replaying every recorded command and deadline gives the same receipts, states, views and outcomes; every step is deterministic, and a deadline given twice advances once',
        sources: ['H4-CHECKPOINT'], expected: true, actual: replayed, passed: replayed, replays });
    }
    return { line: line.id, mode, kind: line.kind, status: results.every(item => item.passed) ? 'passed' : 'failed', claims: results,
      constructed: matches.filter(match => match.origin.kind === 'constructed').map(match => match.origin.how) };
  } catch (error) {
    // The claims made before the line stopped are kept: they show where it went wrong.
    return { line: line.id, mode, kind: line.kind, status: 'error', error: String(error?.message ?? error), claims: judged() };
  }
}

export const linesFor = mode => LINES.filter(line => line.modes.includes(mode));
