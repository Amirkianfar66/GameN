// mothership:dev-only
//
// SYNTHETIC FIXTURES for the phone UI pack. Every name, seat, character choice, role, position and
// count here is invented for review. None is a real player, match, role deal, ballot or recovery
// code. The label below is shown beside each frame in the review sheets, never inside the proposed
// interface.

export const FIXTURE_LABEL = 'Synthetic fixture · invented names, seats, roles and results';

/** Nine invented players. Seat numbers are public; names are what a player typed (1–12 characters). */
export const ROSTER = Object.freeze([
  { seat: 1, name: 'Ava', character: 'c8' },
  { seat: 2, name: 'Ben', character: 'c4' },
  { seat: 3, name: 'Cleo', character: 'c6' },
  { seat: 4, name: 'Dev', character: 'c1' },
  { seat: 5, name: 'Eli', character: 'c3' },
  { seat: 6, name: 'Fay', character: 'c9' },
  { seat: 7, name: 'Gus', character: 'c5' },
  { seat: 8, name: 'Hana', character: 'c2' },
  { seat: 9, name: 'Ike', character: 'c7' },
].map(Object.freeze));

/** The phone the sheets look through: seat 4, "Dev". */
export const SELF = 4;
export const ROOM_CODE = 'K7Q2XM';

const base = Object.freeze({
  1: ['Room A', 'A1'], 2: ['Command Room', 'C1'], 3: ['Room B', 'B1'], 4: ['Room A', 'A2'], 5: ['Hospital', 'H1'],
  6: ['Room B', 'B2'], 7: ['Room A', 'A3'], 8: ['Room B', 'B3'], 9: ['Room A', 'A4'],
});

/** A board: the roster placed as `place` says (seat → [location, slot, health?]), the rest from the default. */
export function board({ roster = 9, place = {}, health = {} } = {}) {
  return ROSTER.filter(p => p.seat <= roster).map(p => {
    const [location, slot, h] = place[p.seat] ?? base[p.seat];
    return { ...p, location, slot, health: health[p.seat] ?? h ?? (location === 'Hospital' ? 'Injured' : 'Healthy'), jailed: location === 'Jail' };
  });
}

/** Board fixtures for each room view: the phone's own seat in that room. */
export const ROOM_FIXTURES = Object.freeze({
  'room-a': { place: {}, active: 7, offices: { captain: 2, officer: 3 } },
  'room-b': { place: { 4: ['Room B', 'B4'] }, active: 6, offices: { captain: 2, officer: 3 } },
  'command-room': { place: { 2: ['Room A', 'A5'], 4: ['Command Room', 'C1'] }, active: 4, offices: { captain: 4, officer: 3 } },
  hospital: { place: { 4: ['Hospital', 'H2', 'Injured'], 8: ['Hospital', 'H3', 'Injured'] }, active: 7, offices: { captain: 2, officer: 3 } },
  jail: { place: { 4: ['Jail', 'J2'], 6: ['Jail', 'J1'], 9: ['Jail', 'J4'] }, active: 1, offices: { captain: 2, officer: 3 } },
});

/** The role a sheet shows on the private card (invented deal). */
export const ROLE_FIXTURES = Object.freeze({
  Doctor: { team: 'Blue', facts: ['Two shared injections', 'Rescue a player in your room or, from Room A or B, in Hospital'], knows: [], resources: { weapons: 0, injections: 2 } },
  Insider: { team: 'Blue', facts: ['Your trio and your own number make the Code'], knows: [{ label: 'Unmapped trio', value: 'Players 2, 6, 8' }], resources: { weapons: 0 } },
  'Blue Disabler': { team: 'Blue', facts: ['One Blackout per match', 'Choose a fixed position while it is dark'], knows: [], resources: { weapons: 0 } },
  'Red Disabler': { team: 'Red', facts: ['One Blackout per match', 'Choose a fixed position while it is dark'], knows: [{ label: 'Undercover', value: 'Player 6' }], resources: { weapons: 0 } },
  Supplier: { team: 'Blue', facts: ['Round 3: supply two players in your room'], knows: [], resources: { weapons: 0 } },
  Engineer: { team: 'Blue', facts: ['Once: suppress the opposite room’s navigation this round'], knows: [], resources: { weapons: 0 } },
  Undercover: { team: 'Red', facts: ['Starts with one weapon', 'Grant Protection to a player in your room'], knows: [], resources: { weapons: 1 } },
  Hacker: { team: 'Red', facts: ['Scan a player in your room', 'One final Code attempt from Round 2'], knows: [{ label: 'Undercover', value: 'Player 6' }], resources: { weapons: 0 } },
  Alien: { team: 'Alien', facts: ['Clone once', 'Blackhole once while you hold an office'], knows: [], resources: { weapons: 0 } },
});

export const seatOf = n => ROSTER.find(p => p.seat === n);
