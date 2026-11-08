//
// The boarding's one input: the admitted public roster, each member's seat (1-9) and lobby character
// (c1-c9), 7, 8 or 9 of them. publicRoster() keeps those two fields only, orders by seat and refuses
// anything else, so nothing private (a role, a team, a Code) can reach the film. The review rosters
// are synthetic fixtures, never runtime input.

const CHARACTERS = new Set(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']);

export function publicRoster(members) {
  if (!Array.isArray(members) || members.length < 7 || members.length > 9) throw new Error('The boarding needs a public roster of 7, 8 or 9 members');
  const out = members.map(m => {
    if (!Number.isInteger(m.seat) || m.seat < 1 || m.seat > 9 || !CHARACTERS.has(m.character)) throw new Error('A roster member is a seat 1-9 and a character c1-c9');
    return Object.freeze({ seat: m.seat, character: m.character });
  }).sort((a, b) => a.seat - b.seat);
  if (new Set(out.map(m => m.seat)).size !== out.length || new Set(out.map(m => m.character)).size !== out.length) throw new Error('Seats and characters are each taken once');
  return Object.freeze(out);
}

